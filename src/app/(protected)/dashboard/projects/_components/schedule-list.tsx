"use client";

import { useState } from "react";

import type { ChatMessageRow } from "@/components/chat/context-chat-panel";
import { ContextChatPanel } from "@/components/chat/context-chat-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  DeleteScheduleButton,
  EditScheduleInline,
  type ScheduleRow,
} from "./schedule-forms";
import { ScheduleParticipantsEditor } from "./schedule-participants-editor";

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ScheduleList({
  projectId,
  schedules,
  workspaceId,
  participantBySchedule,
  scheduleChatInitial,
  memberOptions,
  canManageProject,
  currentUserId,
}: {
  projectId: string;
  schedules: ScheduleRow[];
  workspaceId: string | null;
  participantBySchedule: Record<string, string[]>;
  scheduleChatInitial: Record<string, ChatMessageRow[]>;
  memberOptions: { userId: string; label: string }[];
  canManageProject: boolean;
  currentUserId: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openChatId, setOpenChatId] = useState<string | null>(null);

  const nameByUser = new Map(memberOptions.map((m) => [m.userId, m.label]));

  function canEditSchedule(s: ScheduleRow) {
    return canManageProject || (currentUserId && s.created_by === currentUserId);
  }

  if (!schedules.length) {
    return <p className="text-sm text-muted-foreground">등록된 일정이 없습니다.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>제목</TableHead>
          <TableHead className="hidden md:table-cell">유형</TableHead>
          <TableHead className="hidden sm:table-cell">시작</TableHead>
          <TableHead className="hidden lg:table-cell">알림</TableHead>
          <TableHead className="text-right">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedules.map((s) => {
          const pids = participantBySchedule[s.id] ?? [];
          const chatOpen = openChatId === s.id;
          return (
            <TableRow key={s.id}>
              <TableCell className="align-top font-medium">
                <div>{s.title}</div>
                {pids.length ? (
                  <p className="mt-1 text-xs font-normal text-muted-foreground">
                    참여:{" "}
                    {pids.map((id) => nameByUser.get(id) ?? id.slice(0, 6)).join(", ")}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    참여자 없음(작성자만). 팀 가용성에 안 잡힐 수 있습니다.
                  </p>
                )}
                <ScheduleParticipantsEditor
                  scheduleId={s.id}
                  projectId={projectId}
                  memberOptions={memberOptions}
                  selectedIds={pids}
                />
                {editingId === s.id ? (
                  <EditScheduleInline
                    projectId={projectId}
                    schedule={s}
                    onDone={() => setEditingId(null)}
                  />
                ) : null}
                {workspaceId ? (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="text-xs text-primary underline-offset-4 hover:underline"
                      onClick={() => setOpenChatId((x) => (x === s.id ? null : s.id))}
                    >
                      {chatOpen ? "일정 채팅 닫기" : "일정 채팅"}
                    </button>
                    {chatOpen ? (
                      <div className="mt-2 max-w-md">
                        <ContextChatPanel
                          workspaceId={workspaceId}
                          contextType="schedule"
                          contextId={s.id}
                          title="이 일정 스레드"
                          initialMessages={scheduleChatInitial[s.id] ?? []}
                          viewerId={currentUserId}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="hidden align-top md:table-cell">{s.type}</TableCell>
              <TableCell className="hidden align-top text-muted-foreground sm:table-cell">
                {fmt(s.start_time)}
              </TableCell>
              <TableCell className="hidden align-top text-xs text-muted-foreground lg:table-cell">
                <span>{s.notify_on_dday === false ? "D-day 끔" : "D-day"}</span>
                {s.remind_days_before != null && s.remind_days_before > 0 ? (
                  <span className="ms-1">· {s.remind_days_before}일 전</span>
                ) : null}
                {s.remind_minutes_before != null && s.remind_minutes_before > 0 ? (
                  <span className="ms-1">· {s.remind_minutes_before}분 전</span>
                ) : null}
                {s.dday_email_sent_on ? (
                  <span className="mt-0.5 block text-[10px]">메일 {s.dday_email_sent_on}</span>
                ) : null}
              </TableCell>
              <TableCell className="space-y-1 text-right align-top">
                {editingId === s.id ? null : canEditSchedule(s) ? (
                  <>
                    <button
                      type="button"
                      className="text-sm text-primary underline-offset-4 hover:underline"
                      onClick={() => setEditingId(s.id)}
                    >
                      수정
                    </button>
                    <div>
                      <DeleteScheduleButton scheduleId={s.id} projectId={projectId} />
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">조회만</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
