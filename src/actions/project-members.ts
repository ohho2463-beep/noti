"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

const ROLES = ["Admin", "Manager", "Member", "Viewer"] as const;
type PMRole = (typeof ROLES)[number];

function isPmRole(s: string): s is PMRole {
  return (ROLES as readonly string[]).includes(s);
}

export type PmActionState = { error?: string; success?: boolean };

export async function addProjectMember(
  _prev: PmActionState | null,
  formData: FormData
): Promise<PmActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const projectId = formData.get("project_id") as string;
  const email = (formData.get("email") as string)?.trim();
  const roleRaw = (formData.get("role") as string) || "Member";
  if (!projectId || !email) {
    return { error: "프로젝트와 이메일을 입력하세요." };
  }
  if (!isPmRole(roleRaw)) {
    return { error: "역할이 올바르지 않습니다." };
  }

  const { data: targetId, error: rpcError } = await supabase.rpc(
    "lookup_user_id_by_email_for_project",
    { p_project_id: projectId, p_email: email }
  );

  if (rpcError) {
    return { error: rpcError.message };
  }
  if (!targetId) {
    return { error: "해당 이메일로 가입한 사용자를 찾을 수 없습니다." };
  }

  const { error } = await supabase.from("project_members").insert({
    project_id: projectId,
    user_id: targetId,
    role: roleRaw,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "이미 프로젝트 멤버입니다." };
    }
    return { error: error.message };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/members");
  return { success: true };
}

export async function addProjectMemberByUserId(
  _prev: PmActionState | null,
  formData: FormData
): Promise<PmActionState> {
  const supabase = await createClient();
  const projectId = formData.get("project_id") as string;
  const userId = (formData.get("user_id") as string)?.trim();
  const roleRaw = (formData.get("role") as string) || "Member";
  if (!projectId || !userId) {
    return { error: "프로젝트와 사용자를 선택하세요." };
  }
  if (!isPmRole(roleRaw)) {
    return { error: "역할이 올바르지 않습니다." };
  }

  const { error } = await supabase.from("project_members").insert({
    project_id: projectId,
    user_id: userId,
    role: roleRaw,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "이미 프로젝트 멤버입니다." };
    }
    return { error: error.message };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/members");
  return { success: true };
}

export async function removeProjectMember(
  _prev: PmActionState | null,
  formData: FormData
): Promise<PmActionState> {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const projectId = formData.get("project_id") as string;
  if (!id || !projectId) {
    return { error: "잘못된 요청입니다." };
  }

  const { error } = await supabase.from("project_members").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/members");
  return { success: true };
}

export async function updateProjectMemberRole(
  _prev: PmActionState | null,
  formData: FormData
): Promise<PmActionState> {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const projectId = formData.get("project_id") as string;
  const roleRaw = formData.get("role") as string;
  if (!id || !projectId || !roleRaw || !isPmRole(roleRaw)) {
    return { error: "잘못된 요청입니다." };
  }

  const { error } = await supabase
    .from("project_members")
    .update({ role: roleRaw })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard/members");
  return { success: true };
}
