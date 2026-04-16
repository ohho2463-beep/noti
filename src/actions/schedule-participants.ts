"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ParticipantActionState = { error?: string; success?: boolean };

export async function setScheduleParticipants(input: {
  scheduleId: string;
  projectId: string;
  userIds: string[];
}): Promise<ParticipantActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const { data: sch, error: schErr } = await supabase
    .from("schedules")
    .select("id, created_by")
    .eq("id", input.scheduleId)
    .eq("project_id", input.projectId)
    .maybeSingle();

  if (schErr || !sch) {
    return { error: "일정을 찾을 수 없습니다." };
  }

  const row = sch as { id: string; created_by: string };
  const unique = [...new Set(input.userIds)];
  if (!unique.includes(row.created_by)) {
    unique.push(row.created_by);
  }

  const { data: mems, error: memErr } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", input.projectId)
    .in("user_id", unique);

  if (memErr) {
    return { error: memErr.message };
  }
  const allowed = new Set((mems ?? []).map((m) => m.user_id as string));
  const finalIds = unique.filter((id) => allowed.has(id));
  if (!finalIds.length) {
    return { error: "참여자를 한 명 이상(프로젝트 멤버) 지정하세요." };
  }

  const { error: delErr } = await supabase
    .from("schedule_participants")
    .delete()
    .eq("schedule_id", input.scheduleId);

  if (delErr) {
    return { error: delErr.message };
  }

  const { error: insErr } = await supabase.from("schedule_participants").insert(
    finalIds.map((user_id) => ({
      schedule_id: input.scheduleId,
      user_id,
    }))
  );

  if (insErr) {
    return { error: insErr.message };
  }

  revalidatePath(`/dashboard/projects/${input.projectId}`);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/team/availability");
  return { success: true };
}
