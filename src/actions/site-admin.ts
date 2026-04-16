"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export type SiteAdminState = { error?: string; success?: boolean };

async function assertSiteConsoleAccess(): Promise<{ error?: string }> {
  const pass = process.env.ADMIN_CONSOLE_PASSWORD;
  const jar = await cookies();
  if (pass) {
    if (jar.get("noti_admin_unlocked")?.value !== "1") {
      return { error: "운영 콘솔 암호로 먼저 입장하세요." };
    }
    return {};
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }
  const { data: p } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!p?.is_admin) {
    return { error: "사이트 관리자만 사용할 수 있습니다." };
  }
  return {};
}

export async function unlockSiteAdminConsole(
  _prev: SiteAdminState | null,
  formData: FormData
): Promise<SiteAdminState> {
  const expected = process.env.ADMIN_CONSOLE_PASSWORD;
  if (!expected) {
    return { error: "서버에 ADMIN_CONSOLE_PASSWORD 가 설정되지 않았습니다." };
  }
  const password = (formData.get("password") as string) ?? "";
  if (password !== expected) {
    return { error: "암호가 올바르지 않습니다." };
  }
  const jar = await cookies();
  jar.set("noti_admin_unlocked", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function lockSiteAdminConsole() {
  const jar = await cookies();
  jar.delete("noti_admin_unlocked");
  revalidatePath("/dashboard/admin");
}

/** 초대 메일 없이 Auth 사용자를 바로 만듭니다(이메일은 로그인 ID로 사용). */
export async function adminCreateUserWithPassword(
  _prev: SiteAdminState | null,
  formData: FormData
): Promise<SiteAdminState> {
  const gate = await assertSiteConsoleAccess();
  if (gate.error) {
    return { error: gate.error };
  }
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string) ?? "";
  const displayName = (formData.get("display_name") as string)?.trim() || undefined;
  if (!email) {
    return { error: "이메일(로그인 ID)을 입력하세요." };
  }
  if (password.length < 6) {
    return { error: "비밀번호는 6자 이상이어야 합니다." };
  }
  const admin = createServiceRoleClient();
  if (!admin) {
    return { error: "계정 생성에는 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다." };
  }
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: displayName ? { display_name: displayName, full_name: displayName } : undefined,
  });
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function adminDeleteAuthUser(
  _prev: SiteAdminState | null,
  formData: FormData
): Promise<SiteAdminState> {
  const gate = await assertSiteConsoleAccess();
  if (gate.error) {
    return { error: gate.error };
  }
  const userId = formData.get("user_id") as string;
  if (!userId) {
    return { error: "잘못된 요청입니다." };
  }
  const supabase = await createClient();
  const {
    data: { user: me },
  } = await supabase.auth.getUser();
  if (me?.id === userId) {
    return { error: "본인 계정은 여기서 삭제할 수 없습니다." };
  }
  const admin = createServiceRoleClient();
  if (!admin) {
    return { error: "서비스 롤 키가 없습니다." };
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/members");
  return { success: true };
}
