import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBootstrap } from "@/lib/workspace/server-context";

export const metadata: Metadata = {
  title: "Executive View",
};

type WeekAgg = {
  week: string;
  avgScore: number;
  riskCount: number;
  runTotal: number;
  runFail: number;
  runSuccessRate: number;
  conflictHigh: number;
};

function weekKey(iso: string) {
  const d = new Date(iso);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default async function ExecutivePage() {
  const wb = await getWorkspaceBootstrap();
  const supabase = await createClient();
  if (!wb.workspaceId) {
    return null;
  }

  const sinceIso = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1_000).toISOString();
  const [{ data: healthRows }, { data: runRows }, { data: conflictRows }] = await Promise.all([
    supabase
      .from("project_health_snapshots")
      .select("score, grade, computed_at")
      .eq("workspace_id", wb.workspaceId)
      .gte("computed_at", sinceIso)
      .order("computed_at", { ascending: true }),
    supabase
      .from("workspace_automation_runs")
      .select("status, executed_at")
      .eq("workspace_id", wb.workspaceId)
      .gte("executed_at", sinceIso)
      .order("executed_at", { ascending: true }),
    supabase
      .from("schedule_conflicts")
      .select("severity, detected_at")
      .eq("workspace_id", wb.workspaceId)
      .gte("detected_at", sinceIso)
      .order("detected_at", { ascending: true }),
  ]);

  const byWeek = new Map<string, WeekAgg>();
  const getOrInit = (k: string) => {
    if (!byWeek.has(k)) {
      byWeek.set(k, {
        week: k,
        avgScore: 0,
        riskCount: 0,
        runTotal: 0,
        runFail: 0,
        runSuccessRate: 100,
        conflictHigh: 0,
      });
    }
    return byWeek.get(k)!;
  };

  const scoreSum = new Map<string, { sum: number; count: number }>();
  for (const row of healthRows ?? []) {
    const key = weekKey(row.computed_at as string);
    const agg = getOrInit(key);
    if ((row.grade as string) === "risk") {
      agg.riskCount += 1;
    }
    const cur = scoreSum.get(key) ?? { sum: 0, count: 0 };
    cur.sum += Number(row.score ?? 0);
    cur.count += 1;
    scoreSum.set(key, cur);
  }
  for (const [k, v] of scoreSum.entries()) {
    const agg = getOrInit(k);
    agg.avgScore = v.count ? Math.round((v.sum / v.count) * 10) / 10 : 0;
  }

  for (const row of runRows ?? []) {
    const key = weekKey(row.executed_at as string);
    const agg = getOrInit(key);
    agg.runTotal += 1;
    if ((row.status as string) === "failed") {
      agg.runFail += 1;
    }
  }
  for (const agg of byWeek.values()) {
    const success = agg.runTotal - agg.runFail;
    agg.runSuccessRate = agg.runTotal > 0 ? Math.round((success / agg.runTotal) * 100) : 100;
  }

  for (const row of conflictRows ?? []) {
    const key = weekKey(row.detected_at as string);
    const agg = getOrInit(key);
    if ((row.severity as string) === "high") {
      agg.conflictHigh += 1;
    }
  }

  const trend = [...byWeek.values()].sort((a, b) => a.week.localeCompare(b.week)).slice(-8);
  const latest = trend.at(-1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Executive View</h1>
        <p className="text-sm text-muted-foreground">최근 8주 트렌드로 운영 건강도를 주간 단위로 추적합니다.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">최근 주 평균 위험점수</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{latest?.avgScore ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">최근 주 Risk 스냅샷</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{latest?.riskCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">자동화 성공률</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{latest?.runSuccessRate ?? 100}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">High 충돌</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{latest?.conflictHigh ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">주간 트렌드</CardTitle>
          <CardDescription>리스크/자동화/충돌을 동일 타임라인에서 봅니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {!trend.length ? (
            <p className="text-sm text-muted-foreground">집계 데이터가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {trend.map((w) => (
                <li key={w.week} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <div className="text-sm font-medium">{w.week}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">avg score {w.avgScore}</Badge>
                    <Badge variant={w.riskCount > 0 ? "destructive" : "secondary"}>risk {w.riskCount}</Badge>
                    <Badge variant="outline">automation {w.runSuccessRate}%</Badge>
                    <Badge variant={w.conflictHigh > 0 ? "destructive" : "secondary"}>
                      high conflict {w.conflictHigh}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
