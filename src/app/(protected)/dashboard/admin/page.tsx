import type { Metadata } from "next";

import { AnnouncementForm } from "@/components/workspace/announcement-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBootstrap } from "@/lib/workspace/server-context";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { fetchAuthUsersForAdmin } from "@/lib/site-admin/users";
import { BarChart3, Megaphone, ScrollText } from "lucide-react";

import { AdminCreateUserForm, AdminUserTable } from "./admin-user-tools";
import { LockAdminSessionButton } from "./lock-admin-session-button";

export const metadata: Metadata = {
  title: "사이트 운영",
};

export default async function AdminPage() {
  const wb = await getWorkspaceBootstrap();
  const supabase = await createClient();
  const user = wb.sessionUser;

  const { users: authUsers, error: listErr, fromProfilesOnly } = await fetchAuthUsersForAdmin();
  const hasServiceRole = Boolean(createServiceRoleClient());

  const [{ count: auditTotal }, { count: visitTotal }, { data: recentAudits }, { data: announcements }] =
    await Promise.all([
      supabase.from("audit_logs").select("*", { count: "exact", head: true }),
      supabase.from("visit_events").select("*", { count: "exact", head: true }),
      supabase
        .from("audit_logs")
        .select("id, action, message, created_at, workspace_id")
        .order("created_at", { ascending: false })
        .limit(25),
      supabase
        .from("announcements")
        .select("id, title, is_published, is_pinned, created_at")
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

  const passMode = Boolean(process.env.ADMIN_CONSOLE_PASSWORD);

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">사이트 운영 콘솔</h1>
          <p className="text-muted-foreground">
            앱 전체 감사·방문·(선택) 회원 초대/삭제입니다. <strong className="font-medium text-foreground">프로젝트</strong>{" "}
            권한(Admin/Manager)과는 별개입니다.
          </p>
        </div>
        {passMode ? <LockAdminSessionButton /> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">회원 (Auth)</CardTitle>
          <CardDescription>
            계정 생성은 이메일·비밀번호로 바로 진행됩니다(초대 메일 없음). 목록·삭제·생성 모두 서버에{" "}
            <code className="rounded bg-muted px-1 text-xs">SUPABASE_SERVICE_ROLE_KEY</code> 가 있으면 Auth와
            동일합니다. 없으면 사이트 관리자(<code className="rounded bg-muted px-1 text-xs">is_admin</code>)는
            profiles 기준으로만 목록을 볼 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasServiceRole ? <AdminCreateUserForm /> : (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
              계정 직접 추가·Auth 전체 목록·삭제를 쓰려면{" "}
              <code className="rounded bg-background/60 px-1 text-xs">SUPABASE_SERVICE_ROLE_KEY</code> 를
              .env.local에 넣고 서버를 재시작하세요.
            </p>
          )}
          <AdminUserTable
            users={authUsers}
            currentUserId={user?.id ?? null}
            listError={listErr}
            fromProfilesOnly={fromProfilesOnly}
            canAuthAdmin={hasServiceRole}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <ScrollText className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">감사 로그</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{auditTotal ?? "—"}</p>
            <CardDescription className="mt-1">누적 이벤트 수</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <BarChart3 className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">방문 이벤트</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{visitTotal ?? "—"}</p>
            <CardDescription className="mt-1">수집된 방문 기록 수</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <Megaphone className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">공지</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{announcements?.length ?? 0}</p>
            <CardDescription className="mt-1">최근 목록 참고</CardDescription>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">최근 감사 로그</CardTitle>
            <CardDescription>권한에 따라 일부만 보일 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
              {(recentAudits ?? []).length === 0 ? (
                <li className="text-muted-foreground">기록 없음</li>
              ) : (
                (recentAudits ?? []).map((row) => {
                  const r = row as {
                    id: string;
                    action: string;
                    message: string;
                    created_at: string;
                    workspace_id: string | null;
                  };
                  return (
                    <li key={r.id} className="rounded-md border px-2 py-1.5">
                      <span className="font-mono text-xs text-muted-foreground">{r.action}</span>
                      <p className="text-xs">{r.message}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("ko")}
                      </p>
                    </li>
                  );
                })
              )}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {wb.isSiteAdmin ? (
            <AnnouncementForm />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">공지 등록</CardTitle>
                <CardDescription>
                  공지 작성은 DB에서 <code className="rounded bg-muted px-1 text-xs">profiles.is_admin = true</code> 인
                  계정만 가능합니다.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">최근 공지</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {(announcements ?? []).map((a) => {
                  const row = a as {
                    id: string;
                    title: string;
                    is_published: boolean;
                    is_pinned: boolean;
                    created_at: string;
                  };
                  return (
                    <li key={row.id} className="rounded-md border px-2 py-1.5">
                      <p className="font-medium">{row.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.is_published ? "게시" : "비공개"}
                        {row.is_pinned ? " · 고정" : ""} ·{" "}
                        {new Date(row.created_at).toLocaleDateString("ko")}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
