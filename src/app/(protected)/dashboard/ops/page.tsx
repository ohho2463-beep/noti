import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { suggestConflictResolutionSlots } from "@/lib/ops/conflict-suggestions";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBootstrap } from "@/lib/workspace/server-context";

export const metadata: Metadata = {
  title: "운영 센터",
};

export default async function OpsPage() {
  const wb = await getWorkspaceBootstrap();
  const supabase = await createClient();
  if (!wb.workspaceId) {
    return null;
  }

  const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000).toISOString();
  const [{ data: runs }, { data: notifications }, { data: conflicts }, { data: auctions }] =
    await Promise.all([
      supabase
        .from("workspace_automation_runs")
        .select("id, status, executed_at")
        .eq("workspace_id", wb.workspaceId)
        .gte("executed_at", sinceIso),
      supabase
        .from("user_notifications")
        .select("id, kind, read_at, created_at, href, title")
        .eq("user_id", wb.sessionUser?.id ?? "")
        .gte("created_at", sinceIso),
      supabase
        .from("schedule_conflicts")
        .select("id, schedule_a_id, schedule_b_id, overlap_minutes, severity, resolved_at, detected_at")
        .eq("workspace_id", wb.workspaceId)
        .is("resolved_at", null)
        .order("detected_at", { ascending: false })
        .limit(12),
      supabase
        .from("schedules")
        .select("id, title, type, start_time, end_time, project_id")
        .eq("type", "auction")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(8),
    ]);

  const runRows = runs ?? [];
  const success = runRows.filter((r) => (r.status as string) === "success").length;
  const fail = runRows.filter((r) => (r.status as string) === "failed").length;
  const runTotal = runRows.length;
  const successRate = runTotal ? Math.round((success / runTotal) * 100) : 100;

  const notifRows = notifications ?? [];
  const unread = notifRows.filter((n) => !n.read_at).length;
  const conflictRows = conflicts ?? [];
  const mttrHours = conflictRows.length
    ? Math.round(
        (conflictRows.reduce((sum, c) => sum + Number(c.overlap_minutes ?? 0), 0) / conflictRows.length / 60) * 10
      ) / 10
    : 0;

  const auctionRows = auctions ?? [];

  const suggestions = await Promise.all(
    conflictRows.map(async (c) => ({
      id: c.id as string,
      slots: await suggestConflictResolutionSlots(supabase, {
        scheduleAId: c.schedule_a_id as string,
        scheduleBId: c.schedule_b_id as string,
        overlapMinutes: Number(c.overlap_minutes ?? 30),
      }),
    }))
  );
  const suggestionMap = new Map(suggestions.map((s) => [s.id, s.slots]));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
        <h1 className="text-2xl font-semibold tracking-tight">운영 센터</h1>
        <p className="text-sm text-muted-foreground">SLA/Executive 지표와 경매 일정 타임라인을 통합 제공합니다.</p>
        </div>
        <Link href="/dashboard/executive" className="text-sm text-primary hover:underline">
          Executive View
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">자동화 성공률 (7일)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{successRate}%</p>
            <p className="text-xs text-muted-foreground">실패 {fail}건 / 전체 {runTotal}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">알림 SLA</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{unread}</p>
            <p className="text-xs text-muted-foreground">7일 내 읽지 않은 알림 수</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">충돌 처리 지표</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{conflictRows.length}</p>
            <p className="text-xs text-muted-foreground">미해결 충돌 · 평균 겹침 {mttrHours}시간</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">충돌 해결 어시스트</CardTitle>
          <CardDescription>겹침 시간을 기준으로 우선순위를 잡고, 다음 가능한 시간대를 추천합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {!conflictRows.length ? (
            <p className="text-sm text-muted-foreground">현재 미해결 충돌이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {conflictRows.map((c) => {
                return (
                  <li key={c.id as string} className="rounded-lg border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={(c.severity as string) === "high" ? "destructive" : "secondary"}>
                        {c.severity as string}
                      </Badge>
                      <span className="text-sm font-medium">겹침 {c.overlap_minutes as number}분</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      추천 슬롯:{" "}
                      {(suggestionMap.get(c.id as string) ?? [])
                        .map((slot) => slot.label)
                        .join(" / ") || "가용 슬롯을 찾지 못했습니다."}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">경매 특화 타임라인</CardTitle>
          <CardDescription>다가오는 경매 일정과 프로젝트 맥락을 빠르게 확인합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {!auctionRows.length ? (
            <p className="text-sm text-muted-foreground">예정된 경매 일정이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {auctionRows.map((a) => (
                <li key={a.id as string} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.title as string}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.start_time as string).toLocaleString("ko")} ~{" "}
                      {new Date(a.end_time as string).toLocaleTimeString("ko", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Link href={`/dashboard/projects/${a.project_id as string}`} className="text-xs text-primary hover:underline">
                    프로젝트
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
