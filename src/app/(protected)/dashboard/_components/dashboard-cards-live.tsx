"use client";

import Link from "next/link";
import * as React from "react";
import { AlertTriangle, Bell, CalendarDays, FileText, ListTodo, Workflow } from "lucide-react";

import { EmptyStateCta } from "@/components/dashboard/empty-state-cta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSnapshot } from "@/lib/dashboard/snapshot";
import { cn } from "@/lib/utils";

export function DashboardCardsLive({
  initialSnapshot,
}: {
  initialSnapshot: DashboardSnapshot;
}) {
  const [snapshot, setSnapshot] = React.useState(initialSnapshot);
  const [refreshing, setRefreshing] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/snapshot", { method: "GET", cache: "no-store" });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as { snapshot: DashboardSnapshot | null };
      if (data.snapshot) {
        setSnapshot(data.snapshot);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      void refresh();
    }, 45_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const isEmptyCore =
    snapshot.todaySchedules.length === 0 &&
    snapshot.weekSchedules.length === 0 &&
    snapshot.imminentTasks.length === 0 &&
    snapshot.recentDocs.length === 0 &&
    snapshot.unreadNotificationCount === 0;

  return (
    <>
      {isEmptyCore ? (
        <EmptyStateCta
          title="워크스페이스 활동이 없습니다"
          description="첫 일정·문서·태스크를 만들거나 팀을 초대해 협업을 시작해 보세요."
          primaryHref="/dashboard/calendar?view=week"
          primaryLabel="주간 캘린더 보기"
          secondaryHref="/dashboard/team"
          secondaryLabel="팀 초대"
        />
      ) : null}

      <div className="mb-1 flex items-center justify-end">
        <span className="text-[11px] text-muted-foreground">{refreshing ? "대시보드 갱신 중…" : "자동 갱신: 45초"}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 일정</CardTitle>
            <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent className="space-y-2">
            {!snapshot.todaySchedules.length ? (
              <p className="text-sm text-muted-foreground">오늘 시작하는 일정이 없습니다.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {snapshot.todaySchedules.map((s) => (
                  <li key={s.id} className="flex flex-col gap-0.5 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                    <Link href={`/dashboard/projects/${s.project_id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                      {s.title}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.start_time).toLocaleString("ko")}
                      {s.project_name ? ` · ${s.project_name}` : null}
                      <Badge variant="secondary" className="ms-2 align-middle text-[10px]">
                        {s.type}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="link" className="h-auto px-0 text-xs" asChild>
              <Link href="/dashboard/calendar">캘린더로 이동</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 주 일정</CardTitle>
            <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent>
            {!snapshot.weekSchedules.length ? (
              <p className="text-sm text-muted-foreground">7일 안에 시작하는 일정이 없습니다.</p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                {snapshot.weekSchedules.slice(0, 12).map((s) => (
                  <li key={s.id} className="flex justify-between gap-2 border-b border-border/40 py-1.5 last:border-0">
                    <Link href={`/dashboard/projects/${s.project_id}`} className="min-w-0 truncate font-medium text-primary underline-offset-4 hover:underline">
                      {s.title}
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(s.start_time).toLocaleString("ko", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">마감 임박 태스크</CardTitle>
            <ListTodo className="size-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent>
            {!snapshot.imminentTasks.length ? (
              <p className="text-sm text-muted-foreground">7일 안에 마감인 미완료 태스크가 없습니다.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {snapshot.imminentTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
                    <Link href="/dashboard/tasks" className="font-medium text-primary underline-offset-4 hover:underline">
                      {t.title}
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {t.due_date} · {t.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">알림</CardTitle>
            <Bell className="size-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-semibold tabular-nums">
              읽지 않음 <span className="text-primary">{snapshot.unreadNotificationCount}</span>
            </p>
            {!snapshot.notificationPreview.length ? (
              <p className="text-sm text-muted-foreground">최근 알림이 없습니다.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {snapshot.notificationPreview.map((n) => (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        className={cn(
                          "block rounded-md border border-transparent px-2 py-1 hover:bg-muted/50",
                          !n.read_at && "border-primary/20 bg-primary/5"
                        )}
                      >
                        <span className="font-medium">{n.title}</span>
                        {n.body ? <p className="text-xs text-muted-foreground line-clamp-1">{n.body}</p> : null}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{n.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">최근 문서</CardTitle>
              <CardDescription>워크스페이스 위키 · 최근 수정 순</CardDescription>
            </div>
            <FileText className="size-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent>
            {!snapshot.recentDocs.length ? (
              <p className="text-sm text-muted-foreground">
                문서가 없습니다. <Link href="/dashboard/docs" className="text-primary underline-offset-4 hover:underline">문서 생성</Link>
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {snapshot.recentDocs.map((d) => (
                  <li key={d.id}>
                    <Link href={`/dashboard/docs/${d.id}`} className="block rounded-lg border bg-muted/15 px-3 py-2 text-sm font-medium hover:bg-muted/40">
                      {d.title}
                    </Link>
                    <p className="px-1 pt-0.5 text-[10px] text-muted-foreground">{new Date(d.updated_at).toLocaleString("ko")}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">자동화 운영 (24시간)</CardTitle>
            <Workflow className="size-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-semibold tabular-nums">
              성공률 <span className="text-primary">{snapshot.automationSummary.successRate24h}%</span>
            </p>
            <p className="text-xs text-muted-foreground">
              실행 {snapshot.automationSummary.total24h}건 · 실패 {snapshot.automationSummary.failed24h}건 · 스킵{" "}
              {snapshot.automationSummary.skipped24h}건
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">일정 충돌</CardTitle>
            <AlertTriangle className="size-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-semibold tabular-nums">
              미해결 <span className="text-primary">{snapshot.openConflicts.total}</span>
            </p>
            <p className="text-xs text-muted-foreground">high 충돌 {snapshot.openConflicts.high}건</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">프로젝트 리스크 Explain</CardTitle>
              <CardDescription>최신 스냅샷 기준 위험 프로젝트와 원인을 보여줍니다.</CardDescription>
            </div>
            <AlertTriangle className="size-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent>
            {!snapshot.riskProjects.length ? (
              <p className="text-sm text-muted-foreground">현재 위험/관심 프로젝트가 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {snapshot.riskProjects.map((r) => (
                  <li key={r.project_id} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/dashboard/projects/${r.project_id}`}
                        className="min-w-0 truncate text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {r.project_name}
                      </Link>
                      <Badge variant={r.grade === "risk" ? "destructive" : "secondary"}>
                        {r.grade} · {r.score}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{r.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {snapshot.starredDocs.length ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">즐겨찾기 문서</CardTitle>
              <CardDescription>별 표시한 페이지</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-wrap gap-2">
                {snapshot.starredDocs.map((d) => (
                  <li key={d.id}>
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/dashboard/docs/${d.id}`}>{d.title}</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
