import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BellRing, Building2, FileText, LayoutGrid, Search, Shield, Workflow } from "lucide-react";

import { WorkspaceStatusPanel } from "@/components/workspace/workspace-status-panel";
import { Button } from "@/components/ui/button";
import {
  ActivityTimelineSection,
  ActivityTimelineSkeleton,
  DashboardCardsSection,
  DashboardCardsSkeleton,
} from "@/app/(protected)/dashboard/_components/dashboard-sections";
import { loadActivityFeed } from "@/lib/dashboard/activity-feed";
import { loadDashboardSnapshot } from "@/lib/dashboard/snapshot";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBootstrap } from "@/lib/workspace/server-context";

export const metadata: Metadata = {
  title: "대시보드",
};

export default async function DashboardPage() {
  const wb = await getWorkspaceBootstrap();
  const supabase = await createClient();
  const userId = wb.sessionUser?.id ?? "";

  const snapshotPromise = loadDashboardSnapshot(supabase, {
    workspaceId: wb.workspaceId,
    displayTimezone: wb.workspace?.display_timezone,
    notifications: wb.initialNotifications,
    userId,
  });
  const feedPromise = loadActivityFeed(supabase, wb.workspaceId);

  const email = wb.sessionUser?.email;
  const hasWorkspace = Boolean(wb.workspaceId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
          <p className="text-muted-foreground">
            {email ? `${email} · 한눈에 보기` : "로그인 정보를 불러오지 못했습니다."}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">홈</Link>
        </Button>
      </div>

      {!hasWorkspace ? (
        <div className="space-y-4">
          <WorkspaceStatusPanel wb={wb} />
        </div>
      ) : null}

      <Suspense fallback={<DashboardCardsSkeleton />}>
        <DashboardCardsSection snapshotPromise={snapshotPromise} hasWorkspace={hasWorkspace} />
      </Suspense>

      <Suspense fallback={<ActivityTimelineSkeleton />}>
        <ActivityTimelineSection feedPromise={feedPromise} hasWorkspace={hasWorkspace} />
      </Suspense>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">바로가기</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/dashboard/docs", label: "문서 · 위키", sub: "즐겨찾기 · 최근 문서", icon: FileText },
            { href: "/dashboard/tasks", label: "태스크", sub: "칸반 보드", icon: LayoutGrid },
            { href: "/dashboard/automation", label: "자동화 룰", sub: "트리거 · 액션", icon: Workflow },
            { href: "/dashboard/notifications", label: "알림 센터", sub: "필터 · 일괄 처리", icon: BellRing },
            { href: "/dashboard/search", label: "검색", sub: "탭·하이라이트", icon: Search },
            { href: "/dashboard/admin", label: "관리자", sub: "감사 · 공지", icon: Shield },
            { href: "/dashboard/organizations", label: "조직", sub: "팀 단위", icon: Building2 },
            { href: "/dashboard/team", label: "워크스페이스 팀", sub: "초대 · QR", icon: Building2 },
          ].map(({ href, label, sub, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex gap-3 rounded-xl border border-border/80 bg-card p-4 transition-colors hover:border-primary/25 hover:bg-muted/40"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-5 text-muted-foreground" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{sub}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
