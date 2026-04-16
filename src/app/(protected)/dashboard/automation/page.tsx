import type { Metadata } from "next";

import { AutomationRuleBuilder } from "@/components/dashboard/automation-rule-builder";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBootstrap } from "@/lib/workspace/server-context";

export const metadata: Metadata = {
  title: "자동화 룰",
};

export default async function AutomationPage() {
  const wb = await getWorkspaceBootstrap();
  const supabase = await createClient();
  if (!wb.workspaceId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>자동화 룰</CardTitle>
          <CardDescription>워크스페이스가 연결되어야 룰을 확인할 수 있습니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const [{ data: rules }, { data: runs }] = await Promise.all([
    supabase
      .from("workspace_automation_rules")
      .select(
        "id, name, enabled, trigger_type, trigger_config, action_type, action_config, cooldown_minutes, updated_at"
      )
      .eq("workspace_id", wb.workspaceId)
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("workspace_automation_runs")
      .select("id, rule_id, status, reason, executed_at")
      .eq("workspace_id", wb.workspaceId)
      .order("executed_at", { ascending: false })
      .limit(40),
  ]);

  const runMap = new Map<string, { status: string; reason: string | null; executed_at: string }>();
  for (const run of runs ?? []) {
    const ruleId = run.rule_id as string;
    if (!runMap.has(ruleId)) {
      runMap.set(ruleId, {
        status: run.status as string,
        reason: (run.reason as string | null) ?? null,
        executed_at: run.executed_at as string,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">자동화 룰 빌더</h1>
        <p className="text-sm text-muted-foreground">
          트리거-액션 구조로 현재 룰을 점검하고, 실행 품질(성공/실패)을 함께 확인합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rule Builder 가이드</CardTitle>
          <CardDescription>원클릭 추천 룰과 프리셋 버튼으로 빠르게 자동화를 구성하세요.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="font-medium">1) 원클릭 템플릿</p>
            <p className="text-xs text-muted-foreground">D-0 긴급 알림, D-1 태스크 생성 등을 즉시 적용</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-medium">2) 프리셋 조정</p>
            <p className="text-xs text-muted-foreground">D-day, 쿨다운, 상태 값을 버튼으로 빠르게 선택</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-medium">3) 고급 액션</p>
            <p className="text-xs text-muted-foreground">알림/태스크/상태 변경 자동화를 조합해 운영 효율 극대화</p>
          </div>
        </CardContent>
      </Card>

      <AutomationRuleBuilder
        workspaceId={wb.workspaceId}
        initialRules={(rules ?? []).map((r) => ({
          id: r.id as string,
          name: r.name as string,
          enabled: Boolean(r.enabled),
          trigger_type: (r.trigger_type as string) ?? "schedule_dday",
          trigger_config: ((r.trigger_config as Record<string, unknown> | null) ?? {}) as Record<
            string,
            unknown
          >,
          action_type: (r.action_type as string) ?? "notify_user",
          action_config: ((r.action_config as Record<string, unknown> | null) ?? {}) as Record<
            string,
            unknown
          >,
          cooldown_minutes: Number(r.cooldown_minutes ?? 0),
          updated_at: r.updated_at as string,
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">현재 룰</CardTitle>
          <CardDescription>최근 실행 상태를 함께 표시합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {!(rules ?? []).length ? (
            <p className="text-sm text-muted-foreground">등록된 룰이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {(rules ?? []).map((rule) => {
                const recent = runMap.get(rule.id as string);
                return (
                  <li key={rule.id as string} className="rounded-lg border px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{rule.name as string}</p>
                      <Badge variant={(rule.enabled as boolean) ? "secondary" : "outline"}>
                        {(rule.enabled as boolean) ? "활성" : "비활성"}
                      </Badge>
                      <Badge variant="outline">{rule.trigger_type as string}</Badge>
                      <Badge variant="outline">{rule.action_type as string}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      재실행 대기 {(rule.cooldown_minutes as number) ?? 0}분
                      {recent
                        ? ` · 최근 실행 ${recent.status} (${new Date(recent.executed_at).toLocaleString("ko")})`
                        : " · 실행 이력이 없습니다."}
                    </p>
                    {recent?.reason ? <p className="mt-1 text-xs text-muted-foreground">사유: {recent.reason}</p> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
