import type { Metadata } from "next";
import Link from "next/link";

import { ContextChatPanel } from "@/components/chat/context-chat-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loadContextChatMessages } from "@/lib/chat/load-context-messages";
import type { ScheduleBlock } from "@/lib/team-availability";
import { mondayWeekDays, parseWeekOffset } from "@/lib/team-availability";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBootstrap } from "@/lib/workspace/server-context";
import { WorkspaceStatusPanel } from "@/components/workspace/workspace-status-panel";

import { TeamAvailabilityClient } from "./team-availability-client";

export const metadata: Metadata = {
  title: "팀 스케줄 · 가용성",
};

type SearchParams = Promise<{ w?: string }>;

export default async function TeamAvailabilityPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const weekOffset = Math.min(52, Math.max(-52, parseInt(sp.w ?? "0", 10) || 0));
  const wb = await getWorkspaceBootstrap();
  const supabase = await createClient();
  const user = wb.sessionUser;

  if (!wb.workspaceId) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">팀 스케줄</h1>
        <WorkspaceStatusPanel wb={wb} />
        <Link href="/dashboard/team" className="text-primary underline-offset-4 hover:underline">
          워크스페이스 팀
        </Link>
      </div>
    );
  }

  const wid = wb.workspaceId;

  let workspaceName = wb.workspace?.name ?? null;
  let ownerId: string | null = wb.workspace?.owner_id ?? null;
  if (!workspaceName || !ownerId) {
    const { data: wsRow } = await supabase
      .from("workspaces")
      .select("name, owner_id")
      .eq("id", wid)
      .maybeSingle();
    const row = wsRow as { name: string; owner_id: string } | null;
    workspaceName = workspaceName ?? row?.name ?? "워크스페이스";
    ownerId = ownerId ?? row?.owner_id ?? null;
  }

  const { data: mems } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", wid);

  const memberIds = [
    ...new Set([ownerId, ...(mems ?? []).map((m) => m.user_id as string)].filter(Boolean)),
  ] as string[];

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

  const members: { userId: string; label: string }[] = [];
  if (ownerId) {
    members.push({ userId: ownerId, label: nameById.get(ownerId) ?? "소유자" });
  }
  for (const m of mems ?? []) {
    const uid = m.user_id as string;
    if (uid === ownerId) {
      continue;
    }
    members.push({ userId: uid, label: nameById.get(uid) ?? uid.slice(0, 8) + "…" });
  }

  const anchor = parseWeekOffset(new Date(), weekOffset);
  const dayKeys = mondayWeekDays(anchor);
  const [y0, m0, d0] = dayKeys[0].split("-").map(Number);
  const [y1, m1, d1] = dayKeys[6].split("-").map(Number);
  const weekStart = new Date(y0, m0 - 1, d0, 0, 0, 0, 0);
  const weekEnd = new Date(y1, m1 - 1, d1, 23, 59, 59, 999);
  const weekStartIso = weekStart.toISOString();
  const weekEndIso = weekEnd.toISOString();

  const { data: rawSchedules } = await supabase
    .from("schedules")
    .select("id, title, start_time, end_time, project_id, schedule_participants(user_id)")
    .gt("end_time", weekStartIso)
    .lt("start_time", weekEndIso);

  const wsSet = new Set(memberIds);
  const projectIds = [...new Set((rawSchedules ?? []).map((r) => r.project_id as string))];
  const { data: projs } =
    projectIds.length > 0
      ? await supabase.from("projects").select("id, name").in("id", projectIds)
      : { data: [] as { id: string; name: string }[] };
  const projectName = new Map((projs ?? []).map((p) => [p.id, p.name]));

  const blocks: ScheduleBlock[] = [];
  for (const r of rawSchedules ?? []) {
    const row = r as {
      id: string;
      title: string;
      start_time: string;
      end_time: string;
      project_id: string;
      schedule_participants: { user_id: string }[] | null;
    };
    const pids = (row.schedule_participants ?? []).map((p) => p.user_id);
    if (!pids.some((uid) => wsSet.has(uid))) {
      continue;
    }
    blocks.push({
      id: row.id,
      title: row.title,
      start_time: row.start_time,
      end_time: row.end_time,
      project_id: row.project_id,
      project_name: projectName.get(row.project_id),
      participant_ids: pids,
    });
  }

  const dayLabels = dayKeys.map((dk) => {
    const [y, m, d] = dk.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const w = ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()];
    return `${m}/${d} (${w})`;
  });

  const chatMessages = await loadContextChatMessages(supabase, {
    workspaceId: wid,
    contextType: "workspace",
    contextId: wid,
    limit: 60,
  });

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-2">
          <p className="text-sm text-muted-foreground">
            <Link href="/dashboard/team" className="hover:underline">
              워크스페이스 팀
            </Link>
            <span className="mx-1">/</span>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">팀 리소스 스케줄링</h1>
          <p className="text-muted-foreground">
            워크스페이스 멤버가 참여로 지정된 프로젝트 일정을 주 단위로 모읍니다. 셀 숫자는 해당 날짜와 겹치는
            일정 개수이며, 붉은색은 하루 3건 이상입니다. 아래에서 같은 사람의 시간이 겹치는 쌍을 확인할 수
            있습니다.
          </p>
          {!ownerId ? (
            <p className="text-sm text-destructive">
              워크스페이스 멤버 정보를 완전히 불러오지 못했습니다. 새로고침하거나 워크스페이스 전환 후 다시 시도해
              주세요.
            </p>
          ) : null}
          {!wb.workspace ? <WorkspaceStatusPanel wb={wb} /> : null}
        </div>
        <div className="w-full shrink-0 lg:w-80">
          <ContextChatPanel
            workspaceId={wid}
            contextType="workspace"
            contextId={wid}
            title="워크스페이스 채팅"
            initialMessages={chatMessages}
            viewerId={user?.id ?? ""}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>가용성 히트맵</CardTitle>
          <CardDescription>
            «{workspaceName}» 멤버 × 이번 주(월 시작). 접근 가능한 프로젝트 일정만 반영됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamAvailabilityClient
            members={members}
            blocks={blocks}
            dayKeys={dayKeys}
            weekOffset={weekOffset}
            dayLabels={dayLabels}
          />
        </CardContent>
      </Card>
    </div>
  );
}
