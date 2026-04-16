"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function starWorkspacePage(pageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }
  const { error } = await supabase.from("workspace_page_stars").insert({
    user_id: user.id,
    page_id: pageId,
  });
  if (error) {
    if (error.code === "23505") {
      return { success: true };
    }
    return { error: error.message };
  }
  revalidatePath("/dashboard/docs");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/docs/${pageId}`);
  return { success: true };
}

export async function unstarWorkspacePage(pageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }
  const { error } = await supabase
    .from("workspace_page_stars")
    .delete()
    .eq("user_id", user.id)
    .eq("page_id", pageId);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard/docs");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/docs/${pageId}`);
  return { success: true };
}
