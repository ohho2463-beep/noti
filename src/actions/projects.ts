"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ProjectActionState = { error?: string; success?: boolean };

export async function createProject(
  _prev: ProjectActionState | null,
  formData: FormData
): Promise<ProjectActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "프로젝트 이름을 입력하세요." };
  }
  const description = (formData.get("description") as string)?.trim() || null;
  const orgRaw = (formData.get("organization_id") as string)?.trim();
  const organizationId = orgRaw && orgRaw.length > 0 ? orgRaw : null;

  const { error } = await supabase.from("projects").insert({
    name,
    description,
    organization_id: organizationId,
    created_by: user.id,
    is_active: true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/members");
  return { success: true };
}

export async function updateProject(
  _prev: ProjectActionState | null,
  formData: FormData
): Promise<ProjectActionState> {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  if (!id) {
    return { error: "잘못된 요청입니다." };
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "프로젝트 이름을 입력하세요." };
  }
  const description = (formData.get("description") as string)?.trim() || null;
  const orgRaw = (formData.get("organization_id") as string)?.trim();
  const organizationId = orgRaw && orgRaw.length > 0 ? orgRaw : null;

  const { error } = await supabase
    .from("projects")
    .update({
      name,
      description,
      organization_id: organizationId,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${id}`);
  return { success: true };
}

export async function deleteProject(
  _prev: ProjectActionState | null,
  formData: FormData
): Promise<ProjectActionState> {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  if (!id) {
    return { error: "잘못된 요청입니다." };
  }

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/calendar");
  return { success: true };
}

export async function setProjectActive(
  _prev: ProjectActionState | null,
  formData: FormData
): Promise<ProjectActionState> {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const active = formData.get("is_active") === "true";
  if (!id) {
    return { error: "잘못된 요청입니다." };
  }

  const { error } = await supabase
    .from("projects")
    .update({ is_active: active })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}
