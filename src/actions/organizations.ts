"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type OrgActionState = { error?: string; success?: boolean };

export async function createOrganization(
  _prev: OrgActionState | null,
  formData: FormData
): Promise<OrgActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "조직 이름을 입력하세요." };
  }
  const description = (formData.get("description") as string)?.trim() || null;

  const { error } = await supabase.from("organizations").insert({
    name,
    description,
    created_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/organizations");
  revalidatePath("/dashboard/members");
  return { success: true };
}

export async function addOrganizationMember(
  _prev: OrgActionState | null,
  formData: FormData
): Promise<OrgActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const organizationId = formData.get("organization_id") as string;
  const email = (formData.get("email") as string)?.trim();
  const role = (formData.get("role") as string) || "member";
  if (!organizationId || !email) {
    return { error: "조직과 이메일을 입력하세요." };
  }
  if (!["admin", "member"].includes(role)) {
    return { error: "역할이 올바르지 않습니다." };
  }

  const { data: targetId, error: rpcError } = await supabase.rpc(
    "lookup_user_id_by_email_for_org",
    { p_organization_id: organizationId, p_email: email }
  );

  if (rpcError) {
    return { error: rpcError.message };
  }
  if (!targetId) {
    return { error: "해당 이메일로 가입한 사용자를 찾을 수 없습니다." };
  }

  const { error } = await supabase.from("organization_members").insert({
    organization_id: organizationId,
    user_id: targetId,
    role: role as "admin" | "member",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "이미 조직에 속한 사용자입니다." };
    }
    return { error: error.message };
  }

  revalidatePath(`/dashboard/organizations/${organizationId}`);
  revalidatePath("/dashboard/members");
  return { success: true };
}

export async function removeOrganizationMember(
  _prev: OrgActionState | null,
  formData: FormData
): Promise<OrgActionState> {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const organizationId = formData.get("organization_id") as string;
  if (!id || !organizationId) {
    return { error: "잘못된 요청입니다." };
  }

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/organizations/${organizationId}`);
  revalidatePath("/dashboard/members");
  return { success: true };
}

export async function updateOrganization(
  _prev: OrgActionState | null,
  formData: FormData
): Promise<OrgActionState> {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  if (!id) {
    return { error: "잘못된 요청입니다." };
  }
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "조직 이름을 입력하세요." };
  }
  const description = (formData.get("description") as string)?.trim() || null;

  const { error } = await supabase
    .from("organizations")
    .update({ name, description })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/organizations/${id}`);
  revalidatePath("/dashboard/organizations");
  revalidatePath("/dashboard/members");
  return { success: true };
}

export async function updateOrganizationMemberRole(
  _prev: OrgActionState | null,
  formData: FormData
): Promise<OrgActionState> {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const organizationId = formData.get("organization_id") as string;
  const role = (formData.get("role") as string) || "member";
  if (!id || !organizationId) {
    return { error: "잘못된 요청입니다." };
  }
  if (!["admin", "member"].includes(role)) {
    return { error: "역할은 admin 또는 member 만 설정할 수 있습니다." };
  }

  const { error } = await supabase.from("organization_members").update({ role }).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/organizations/${organizationId}`);
  revalidatePath("/dashboard/members");
  return { success: true };
}

export async function deleteOrganization(
  _prev: OrgActionState | null,
  formData: FormData
): Promise<OrgActionState> {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  if (!id) {
    return { error: "잘못된 요청입니다." };
  }

  const { error } = await supabase.from("organizations").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/organizations");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/members");
  return { success: true };
}
