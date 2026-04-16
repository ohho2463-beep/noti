"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 64);
}

export async function addWorkspacePageTag(pageId: string, workspaceId: string, rawTag: string) {
  const tag = normalizeTag(rawTag);
  if (!tag) {
    return { error: "태그를 입력하세요." };
  }
  const supabase = await createClient();
  const { data: page } = await supabase
    .from("workspace_pages")
    .select("id")
    .eq("id", pageId)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!page) {
    return { error: "문서를 찾을 수 없습니다." };
  }

  const { error } = await supabase.from("workspace_page_tag_links").insert({ page_id: pageId, tag });
  if (error) {
    if (error.code === "23505") {
      return { success: true };
    }
    return { error: error.message };
  }
  revalidatePath("/dashboard/docs");
  revalidatePath(`/dashboard/docs/${pageId}`);
  return { success: true };
}

export async function removeWorkspacePageTag(pageId: string, workspaceId: string, tag: string) {
  const t = normalizeTag(tag);
  if (!t) {
    return { error: "잘못된 태그입니다." };
  }
  const supabase = await createClient();
  const { data: page } = await supabase
    .from("workspace_pages")
    .select("id")
    .eq("id", pageId)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!page) {
    return { error: "문서를 찾을 수 없습니다." };
  }

  const { error } = await supabase.from("workspace_page_tag_links").delete().eq("page_id", pageId).eq("tag", t);

  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard/docs");
  revalidatePath(`/dashboard/docs/${pageId}`);
  return { success: true };
}
