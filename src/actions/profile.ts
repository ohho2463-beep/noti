"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; success?: boolean };

export async function updateProfile(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const displayName = (formData.get("display_name") as string)?.trim() || null;
  const avatarUrl = (formData.get("avatar_url") as string)?.trim() || null;
  const profileEmail = (formData.get("profile_email") as string)?.trim() || null;

  const patch: Record<string, string | null> = {
    display_name: displayName,
    avatar_url: avatarUrl,
  };
  if (profileEmail) {
    patch.email = profileEmail;
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/members");
  return { success: true };
}

/** Auth 세션의 이메일을 profiles.email 에 맞춤 (이메일 변경 확인 후 호출) */
export async function syncProfileEmailFromAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: "로그인이 필요합니다." };
  }
  const { error } = await supabase.from("profiles").update({ email: user.email }).eq("id", user.id);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/members");
  return { success: true };
}
