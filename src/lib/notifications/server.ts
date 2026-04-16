import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type UserNotificationRow =
  Database["public"]["Tables"]["user_notifications"]["Row"];

export async function fetchUserNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 30
): Promise<{ rows: UserNotificationRow[]; unread: number }> {
  const { data, error } = await supabase
    .from("user_notifications")
    .select("id, user_id, title, body, href, kind, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { rows: [], unread: 0 };
  }

  const rows = (data ?? []) as UserNotificationRow[];
  const unread = rows.filter((r) => !r.read_at).length;
  return { rows, unread };
}

export async function fetchNotificationCenter(
  supabase: SupabaseClient,
  userId: string,
  input: {
    onlyUnread?: boolean;
    kind?: string;
    limit?: number;
  } = {}
): Promise<{ rows: UserNotificationRow[]; unread: number }> {
  const limit = input.limit ?? 80;
  let query = supabase
    .from("user_notifications")
    .select("id, user_id, title, body, href, kind, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (input.onlyUnread) {
    query = query.is("read_at", null);
  }
  if (input.kind) {
    query = query.eq("kind", input.kind);
  }

  const { data, error } = await query;
  if (error) {
    return { rows: [], unread: 0 };
  }
  const rows = (data ?? []) as UserNotificationRow[];
  const unread = rows.filter((r) => !r.read_at).length;
  return { rows, unread };
}
