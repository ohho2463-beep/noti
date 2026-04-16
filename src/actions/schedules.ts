"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

const TYPES = ["normal", "auction", "meeting", "deadline"] as const;
type ScheduleType = (typeof TYPES)[number];

function isScheduleType(s: string): s is ScheduleType {
  return (TYPES as readonly string[]).includes(s);
}

export type ScheduleActionState = { error?: string; success?: boolean };

export async function createSchedule(input: {
  projectId: string;
  title: string;
  description: string | null;
  startTimeIso: string;
  endTimeIso: string;
  type: string;
  location: string | null;
  notifyOnDday?: boolean;
  remindDaysBefore?: number | null;
  remindMinutesBefore?: number | null;
  /** 프로젝트 멤버 user_id (작성자는 트리거로 자동 포함, 여기서 중복 가능) */
  participantUserIds?: string[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  if (!input.title?.trim()) {
    return { error: "제목을 입력하세요." };
  }
  if (!isScheduleType(input.type)) {
    return { error: "일정 유형이 올바르지 않습니다." };
  }

  const row: Record<string, unknown> = {
    project_id: input.projectId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    start_time: input.startTimeIso,
    end_time: input.endTimeIso,
    type: input.type,
    location: input.location?.trim() || null,
    created_by: user.id,
  };
  if (input.notifyOnDday !== undefined) {
    row.notify_on_dday = input.notifyOnDday;
  }
  if (input.remindDaysBefore != null) {
    row.remind_days_before = input.remindDaysBefore;
  }
  if (input.remindMinutesBefore != null) {
    row.remind_minutes_before = input.remindMinutesBefore;
  }
  const { data: inserted, error } = await supabase.from("schedules").insert(row).select("id").single();

  if (error) {
    return { error: error.message };
  }

  const scheduleId = (inserted as { id: string }).id;
  const extra = [...new Set((input.participantUserIds ?? []).filter((id) => id && id !== user.id))];
  if (extra.length) {
    const { data: mems } = await supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", input.projectId)
      .in("user_id", extra);
    const allowed = new Set((mems ?? []).map((m) => m.user_id as string));
    const rows = extra
      .filter((uid) => allowed.has(uid))
      .map((user_id) => ({ schedule_id: scheduleId, user_id }));
    if (rows.length) {
      const { error: pErr } = await supabase.from("schedule_participants").insert(rows);
      if (pErr) {
        return { error: pErr.message };
      }
    }
  }

  revalidatePath(`/dashboard/projects/${input.projectId}`);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/team/availability");
  return { success: true };
}

export async function updateSchedule(input: {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  startTimeIso: string;
  endTimeIso: string;
  type: string;
  location: string | null;
  notifyOnDday?: boolean;
  remindDaysBefore?: number | null;
  remindMinutesBefore?: number | null;
}) {
  const supabase = await createClient();
  if (!input.title?.trim()) {
    return { error: "제목을 입력하세요." };
  }
  if (!isScheduleType(input.type)) {
    return { error: "일정 유형이 올바르지 않습니다." };
  }

  const patch: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    start_time: input.startTimeIso,
    end_time: input.endTimeIso,
    type: input.type,
    location: input.location?.trim() || null,
  };
  if (input.notifyOnDday !== undefined) {
    patch.notify_on_dday = input.notifyOnDday;
  }
  if (input.remindDaysBefore !== undefined) {
    patch.remind_days_before = input.remindDaysBefore;
  }
  if (input.remindMinutesBefore !== undefined) {
    patch.remind_minutes_before = input.remindMinutesBefore;
  }
  const { error } = await supabase.from("schedules").update(patch).eq("id", input.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/projects/${input.projectId}`);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/team/availability");
  return { success: true };
}

/** 주간 캘린더 드래그·리사이즈용: 시작·종료만 갱신 (RLS로 권한 검증) */
export async function updateScheduleWindow(input: {
  scheduleId: string;
  startTimeIso: string;
  endTimeIso: string;
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const start = new Date(input.startTimeIso);
  const end = new Date(input.endTimeIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "시간 형식이 올바르지 않습니다." };
  }
  if (end.getTime() <= start.getTime()) {
    return { error: "종료는 시작보다 늦어야 합니다." };
  }
  const maxSpanMs = 14 * 24 * 60 * 60 * 1000;
  if (end.getTime() - start.getTime() > maxSpanMs) {
    return { error: "일정 길이는 최대 14일까지입니다." };
  }

  const { data: row, error: fetchErr } = await supabase
    .from("schedules")
    .select("id, project_id")
    .eq("id", input.scheduleId)
    .maybeSingle();

  if (fetchErr || !row) {
    return { error: fetchErr?.message ?? "일정을 찾을 수 없습니다." };
  }

  const projectId = (row as { project_id: string }).project_id;

  const { error } = await supabase
    .from("schedules")
    .update({
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    })
    .eq("id", input.scheduleId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/team/availability");
  return { success: true };
}

export async function deleteSchedule(
  _prev: ScheduleActionState | null,
  formData: FormData
): Promise<ScheduleActionState> {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const projectId = formData.get("project_id") as string;
  if (!id || !projectId) {
    return { error: "잘못된 요청입니다." };
  }

  const { error } = await supabase.from("schedules").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/team/availability");
  return { success: true };
}
