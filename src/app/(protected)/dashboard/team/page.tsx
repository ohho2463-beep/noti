import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TeamWorkspacePanel } from "@/components/workspace/team-workspace-panel";
import { WorkspaceTimezoneForm } from "@/components/workspace/workspace-timezone-form";
import { WorkspaceStatusPanel } from "@/components/workspace/workspace-status-panel";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBootstrap } from "@/lib/workspace/server-context";

export const metadata: Metadata = {
  title: "워크스페이스 팀",
};

export default async function TeamWorkspacePage() {
  const wb = await getWorkspaceBootstrap();
  const supabase = await createClient();

  if (!wb.workspaceId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">워크스페이스 팀</h1>
        <WorkspaceStatusPanel wb={wb} />
      </div>
    );
  }

  const wid = wb.workspaceId;

  let workspaceName = wb.workspace?.name ?? null;
  let ownerId: string | null = wb.workspace?.owner_id ?? null;
  let displayTz = wb.workspace?.display_timezone ?? null;
  if (!workspaceName || !ownerId || displayTz == null || displayTz === "") {
    const { data: wsRow } = await supabase
      .from("workspaces")
      .select("name, owner_id, display_timezone")
      .eq("id", wid)
      .maybeSingle();
    const row = wsRow as {
      name: string;
      owner_id: string;
      display_timezone: string | null;
    } | null;
    workspaceName = workspaceName ?? row?.name ?? "워크스페이스";
    ownerId = ownerId ?? row?.owner_id ?? null;
    displayTz = displayTz || row?.display_timezone || "Asia/Seoul";
  }
  if (!displayTz) {
    displayTz = "Asia/Seoul";
  }

  const { data: mems } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", wid);

  let invites: { id: string; email: string; role: string; expires_at: string }[] = [];
  const invRes = await supabase
    .from("workspace_invitations")
    .select("id, email, role, expires_at")
    .eq("workspace_id", wid)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (!invRes.error && invRes.data) {
    invites = invRes.data as typeof invites;
  }

  const memberIds = [...new Set([ownerId, ...(mems ?? []).map((m) => m.user_id as string)].filter(Boolean))] as string[];

  const { data: profiles } =
    memberIds.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", memberIds)
      : { data: [] as { id: string; display_name: string | null }[] };

  const nameById = new Map(
    (profiles ?? []).map((r) => [
      r.id as string,
      ((r as { display_name: string | null }).display_name ?? "").trim() || "이름 없음",
    ])
  );

  const members = [];
  if (ownerId) {
    members.push({
      userId: ownerId,
      role: "owner",
      label: nameById.get(ownerId) ?? "소유자",
      isOwner: true,
    });
  }
  for (const m of mems ?? []) {
    const uid = m.user_id as string;
    if (uid === ownerId) {
      continue;
    }
    members.push({
      userId: uid,
      role: m.role as string,
      label: nameById.get(uid) ?? uid.slice(0, 8) + "…",
      isOwner: false,
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">워크스페이스 팀</h1>
        <p className="text-muted-foreground">
          «{workspaceName}» 멤버와 초대를 관리합니다. 조직·프로젝트 멤버와는 별도입니다.
        </p>
        {!ownerId ? (
          <p className="mt-2 text-sm text-destructive">
            워크스페이스 소유자 정보를 불러오지 못했습니다. 새로고침하거나 상단 워크스페이스 전환 후 다시 시도해
            주세요.
          </p>
        ) : null}
        {!wb.workspace ? <WorkspaceStatusPanel wb={wb} /> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">워크스페이스 표시 타임존</CardTitle>
          <CardDescription>일정 안내·UI에 쓰이는 기본 시간대입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceTimezoneForm
            workspaceId={wid}
            initialTimezone={displayTz}
            canManage={wb.canManageWorkspace}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">이번 주 팀 가용성 요약</CardTitle>
            <CardDescription>
              멤버 {members.length}명 · 주간 히트맵에서 겹치는 시간을 빠르게 확인하세요. 워크스페이스 채팅은 가용성
              화면 오른쪽에서도 열 수 있습니다.
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href="/dashboard/team/availability">가용성 보드 열기</Link>
          </Button>
        </CardHeader>
      </Card>

      <TeamWorkspacePanel
        workspaceId={wid}
        canManage={wb.canManageWorkspace}
        members={members}
        invites={invites}
      />
    </div>
  );
}
