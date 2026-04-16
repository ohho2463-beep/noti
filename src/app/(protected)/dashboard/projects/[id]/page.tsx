import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ContextChatPanel,
  type ChatMessageRow,
} from "@/components/chat/context-chat-panel";
import { loadContextChatMessages } from "@/lib/chat/load-context-messages";
import { loadScheduleChatMessagesByScheduleIds } from "@/lib/chat/load-schedule-chats";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBootstrap } from "@/lib/workspace/server-context";

import { AddProjectMemberForm } from "../_components/add-project-member-form";
import { DeleteProjectForm } from "../_components/delete-project-form";
import { EditProjectForm } from "../_components/edit-project-form";
import { ProjectActiveForm } from "../_components/project-active-form";
import { ProjectMemberRowActions } from "../_components/project-member-row-actions";
import { NewScheduleForm } from "../_components/schedule-forms";
import { ScheduleList } from "../_components/schedule-list";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  return { title: project?.name ? `${project.name} · 프로젝트` : "프로젝트" };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const [wb, supabase] = await Promise.all([getWorkspaceBootstrap(), createClient()]);
  const user = wb.sessionUser;

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description, organization_id, is_active, created_by")
    .eq("id", id)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const [{ data: orgs }, { data: members }, { data: schedules }] = await Promise.all([
    supabase.from("organizations").select("id, name").order("name", { ascending: true }),
    supabase
      .from("project_members")
      .select("id, user_id, role, joined_at")
      .eq("project_id", id)
      .order("joined_at", { ascending: true }),
    supabase
      .from("schedules")
      .select(
        "id, title, description, start_time, end_time, type, location, created_by, notify_on_dday, dday_email_sent_on, remind_days_before, remind_minutes_before"
      )
      .eq("project_id", id)
      .order("start_time", { ascending: true }),
  ]);

  const userIds = [...new Set((members ?? []).map((m) => m.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
    : { data: [] as { id: string; display_name: string | null }[] };

  const nameByUser = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name?.trim() || p.id.slice(0, 8)])
  );

  const scheduleIds = (schedules ?? []).map((s) => s.id as string);
  const participantBySchedule: Record<string, string[]> = {};
  if (scheduleIds.length) {
    const { data: parts } = await supabase
      .from("schedule_participants")
      .select("schedule_id, user_id")
      .in("schedule_id", scheduleIds);
    for (const row of parts ?? []) {
      const sid = row.schedule_id as string;
      const uid = row.user_id as string;
      if (!participantBySchedule[sid]) {
        participantBySchedule[sid] = [];
      }
      participantBySchedule[sid].push(uid);
    }
  }

  const [projectChatMessages, scheduleChatMap] = await Promise.all([
    wb.workspaceId
      ? loadContextChatMessages(supabase, {
          workspaceId: wb.workspaceId,
          contextType: "project",
          contextId: id,
          limit: 80,
        })
      : Promise.resolve([] as ChatMessageRow[]),
    wb.workspaceId && scheduleIds.length
      ? loadScheduleChatMessagesByScheduleIds(supabase, {
          workspaceId: wb.workspaceId,
          scheduleIds,
        })
      : Promise.resolve(new Map<string, ChatMessageRow[]>()),
  ]);
  const scheduleChatInitial: Record<string, ChatMessageRow[]> = {};
  for (const sid of scheduleIds) {
    scheduleChatInitial[sid] = scheduleChatMap.get(sid) ?? [];
  }

  const memberOptions = (members ?? []).map((m) => ({
    userId: m.user_id as string,
    label: nameByUser.get(m.user_id as string) ?? (m.user_id as string).slice(0, 8),
  }));

  const myMembership = (members ?? []).find((m) => m.user_id === user?.id);
  const isCreator = project.created_by === user?.id;
  const isManager =
    myMembership?.role === "Admin" || myMembership?.role === "Manager";
  const canManageProject = isCreator || isManager;

  return (
    <div className="space-y-8 xl:grid xl:grid-cols-[1fr_300px] xl:items-start xl:gap-8">
      <div className="min-w-0 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/dashboard/projects" className="hover:underline">
              프로젝트
            </Link>
            <span className="mx-1">/</span>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground">{project.description ?? "설명 없음"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            상태:{" "}
            {project.is_active ? (
              <span className="text-emerald-600 dark:text-emerald-400">활성</span>
            ) : (
              "비활성"
            )}
          </p>
        </div>
        {canManageProject ? <ProjectActiveForm projectId={id} isActive={project.is_active} /> : null}
      </div>

      {canManageProject ? (
        <DeleteProjectForm projectId={id} projectName={project.name} />
      ) : null}

      {canManageProject ? (
        <Card>
          <CardHeader>
            <CardTitle>프로젝트 설정</CardTitle>
            <CardDescription>이름, 설명, 소속 조직을 변경할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent className="max-w-lg">
            <EditProjectForm
              projectId={id}
              defaultName={project.name}
              defaultDescription={project.description}
              defaultOrganizationId={project.organization_id}
              organizations={orgs ?? []}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>멤버</CardTitle>
            <CardDescription>프로젝트 단위 역할입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(members ?? []).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {nameByUser.get(m.user_id) ?? m.user_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{m.role}</TableCell>
                    <TableCell className="text-right">
                      <ProjectMemberRowActions
                        memberRowId={m.id}
                        projectId={id}
                        currentRole={m.role}
                        canManage={canManageProject}
                        isSelf={m.user_id === user?.id}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {canManageProject ? (
          <AddProjectMemberForm projectId={id} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>멤버 초대</CardTitle>
              <CardDescription>Admin 또는 Manager만 초대할 수 있습니다.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>일정</CardTitle>
          <CardDescription>
            참여자를 지정하면 팀 가용성 보드에서 겹침을 볼 수 있습니다. 일정별 채팅은 오른쪽 워크스페이스가
            있을 때만 표시됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <NewScheduleForm
            projectId={id}
            memberOptions={memberOptions}
            timezoneNote={wb.workspace?.display_timezone ?? "Asia/Seoul"}
          />
          <ScheduleList
            projectId={id}
            schedules={schedules ?? []}
            workspaceId={wb.workspaceId}
            participantBySchedule={participantBySchedule}
            scheduleChatInitial={scheduleChatInitial}
            memberOptions={memberOptions}
            canManageProject={canManageProject}
            currentUserId={user?.id ?? ""}
          />
        </CardContent>
      </Card>
      </div>

      {wb.workspaceId ? (
        <aside className="space-y-4">
          <ContextChatPanel
            workspaceId={wb.workspaceId}
            contextType="project"
            contextId={id}
            title="프로젝트 채팅"
            initialMessages={projectChatMessages}
            viewerId={user?.id ?? ""}
            className="xl:sticky xl:top-4"
          />
        </aside>
      ) : null}
    </div>
  );
}
