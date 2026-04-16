import type { SupabaseClient } from "@supabase/supabase-js";

import type { ChatMessageRow } from "@/components/chat/context-chat-panel";

export async function loadScheduleChatMessagesByScheduleIds(
  supabase: SupabaseClient,
  input: { workspaceId: string; scheduleIds: string[] }
): Promise<Map<string, ChatMessageRow[]>> {
  const map = new Map<string, ChatMessageRow[]>();
  for (const id of input.scheduleIds) {
    map.set(id, []);
  }
  if (!input.scheduleIds.length) {
    return map;
  }

  const { data: rows, error } = await supabase
    .from("context_chat_messages")
    .select(
      "id, body, user_id, created_at, context_id, attachment_path, attachment_name, attachment_mime, attachment_size"
    )
    .eq("workspace_id", input.workspaceId)
    .eq("context_type", "schedule")
    .in("context_id", input.scheduleIds)
    .order("created_at", { ascending: true })
    .limit(600);

  if (error || !rows?.length) {
    return map;
  }

  const uids = [...new Set(rows.map((r) => r.user_id as string))];
  const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", uids);
  const nameBy = new Map(
    (profs ?? []).map((p) => [
      p.id as string,
      ((p as { display_name: string | null }).display_name ?? "").trim() || "이름 없음",
    ])
  );

  for (const r of rows as {
    id: string;
    body: string;
    user_id: string;
    created_at: string;
    context_id: string;
    attachment_path: string | null;
    attachment_name: string | null;
    attachment_mime: string | null;
    attachment_size: number | null;
  }[]) {
    const list = map.get(r.context_id) ?? [];
    list.push({
      id: r.id,
      body: r.body,
      user_id: r.user_id,
      created_at: r.created_at,
      author_label: nameBy.get(r.user_id) ?? r.user_id.slice(0, 8) + "…",
      attachment_path: r.attachment_path,
      attachment_name: r.attachment_name,
      attachment_mime: r.attachment_mime,
      attachment_size: r.attachment_size,
    });
    map.set(r.context_id, list);
  }
  return map;
}
