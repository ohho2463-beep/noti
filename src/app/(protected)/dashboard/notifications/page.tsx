import type { Metadata } from "next";
import Link from "next/link";

import { NotificationCenterList } from "@/components/dashboard/notification-center-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchNotificationCenter } from "@/lib/notifications/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "알림 센터",
};

const KIND_OPTIONS = [
  { value: "", label: "전체" },
  { value: "automation_run_failed", label: "자동화 실패" },
  { value: "automation_run_success", label: "자동화 성공" },
  { value: "project_health_risk", label: "프로젝트 리스크" },
  { value: "schedule_conflict_detected", label: "일정 충돌" },
  { value: "info", label: "일반" },
] as const;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ unread?: string; kind?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const onlyUnread = params.unread === "1";
  const kind = params.kind ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>알림 센터</CardTitle>
          <CardDescription>로그인이 필요합니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { rows, unread } = await fetchNotificationCenter(supabase, user.id, {
    onlyUnread,
    kind: kind || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">알림 센터</h1>
          <p className="text-sm text-muted-foreground">
            팀 자동화/리스크/충돌 이벤트를 모아 확인하고 상태를 정리합니다.
          </p>
        </div>
        <Badge variant="secondary">읽지 않음 {unread}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">필터</CardTitle>
          <CardDescription>필터를 조합해 필요한 운영 이벤트만 빠르게 볼 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-center gap-2" action="/dashboard/notifications" method="get">
            <select
              name="kind"
              defaultValue={kind}
              className="h-9 rounded-md border bg-background px-3 text-sm"
              aria-label="알림 유형"
            >
              {KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="unread" value="1" defaultChecked={onlyUnread} />
              읽지 않음만
            </label>
            <Button type="submit" size="sm">
              적용
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/notifications">초기화</Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      <NotificationCenterList rows={rows} />
    </div>
  );
}
