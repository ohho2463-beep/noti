import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityFeedItem = {
  id: string;
  at: string;
  label: string;
  detail: string;
  href: string | null;
  kind: "audit" | "doc" | "schedule" | "project" | "task";
};

type RawItem = Omit<ActivityFeedItem, "label"> & { actorId: string | null };

function actorLabel(map: Map<string, string>, actorId: string | null): string {
  if (!actorId) {
    return "시스템";
  }
  return map.get(actorId) ?? "멤버";
}

const empty = Promise.resolve({ data: [] as Record<string, unknown>[] });

export async function loadActivityFeed(
  supabase: SupabaseClient,
  workspaceId: string | null,
  limit = 24
): Promise<ActivityFeedItem[]> {
  const raw: RawItem[] = [];
  const actorIds = new Set<string>();

  const [logsRes, pagesRes, schedulesRes, projectsRes, tasksRes] = await Promise.all([
    workspaceId
      ? supabase
          .from("audit_logs")
          .select("id, user_id, message, created_at, action")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(15)
      : empty,
    workspaceId
      ? supabase
          .from("workspace_pages")
          .select("id, title, updated_at, created_by")
          .eq("workspace_id", workspaceId)
          .is("deleted_at", null)
          .order("updated_at", { ascending: false })
          .limit(8)
      : empty,
    supabase
      .from("schedules")
      .select("id, title, created_at, created_by, project_id")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("projects")
      .select("id, name, updated_at, created_by")
      .order("updated_at", { ascending: false })
      .limit(8),
    workspaceId
      ? supabase
          .from("workspace_tasks")
          .select("id, title, created_at, created_by")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(6)
      : empty,
  ]);

  for (const row of logsRes.data ?? []) {
    const uid = (row.user_id as string | null) ?? null;
    if (uid) {
      actorIds.add(uid);
    }
    raw.push({
      id: `a-${row.id}`,
      at: row.created_at as string,
      actorId: uid,
      detail: (row.message as string) || (row.action as string) || "활동",
      href: null,
      kind: "audit",
    });
  }

  for (const p of pagesRes.data ?? []) {
    const uid = (p.created_by as string | null) ?? null;
    if (uid) {
      actorIds.add(uid);
    }
    raw.push({
      id: `p-${p.id}`,
      at: p.updated_at as string,
      actorId: uid,
      detail: `문서 «${p.title as string}» 수정`,
      href: `/dashboard/docs/${p.id}`,
      kind: "doc",
    });
  }

  const schedules = schedulesRes.data ?? [];
  const schProj = [...new Set(schedules.map((s) => s.project_id as string))];
  const { data: schProjects } =
    schProj.length > 0
      ? await supabase.from("projects").select("id, name").in("id", schProj)
      : { data: [] as { id: string; name: string }[] };
  const schProjName = new Map((schProjects ?? []).map((x) => [x.id, x.name]));

  for (const s of schedules) {
    const uid = (s.created_by as string | null) ?? null;
    if (uid) {
      actorIds.add(uid);
    }
    const pname = schProjName.get(s.project_id as string);
    raw.push({
      id: `s-${s.id}`,
      at: s.created_at as string,
      actorId: uid,
      detail: `일정 «${s.title as string}»${pname ? ` · ${pname}` : ""}`,
      href: `/dashboard/projects/${s.project_id as string}`,
      kind: "schedule",
    });
  }

  for (const pr of projectsRes.data ?? []) {
    const uid = (pr.created_by as string | null) ?? null;
    if (uid) {
      actorIds.add(uid);
    }
    raw.push({
      id: `j-${pr.id}-${pr.updated_at}`,
      at: pr.updated_at as string,
      actorId: uid,
      detail: `프로젝트 «${pr.name as string}» 갱신`,
      href: `/dashboard/projects/${pr.id as string}`,
      kind: "project",
    });
  }

  for (const t of tasksRes.data ?? []) {
    const uid = (t.created_by as string | null) ?? null;
    if (uid) {
      actorIds.add(uid);
    }
    raw.push({
      id: `t-${t.id}`,
      at: t.created_at as string,
      actorId: uid,
      detail: `태스크 «${(t.title as string) || "제목 없음"}» 추가`,
      href: "/dashboard/tasks",
      kind: "task",
    });
  }

  const { data: profiles } =
    actorIds.size > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", [...actorIds])
      : { data: [] as { id: string; display_name: string | null }[] };

  const nameById = new Map(
    (profiles ?? []).map((r) => [
      r.id as string,
      ((r.display_name as string | null) ?? "").trim() || "이름 없음",
    ])
  );

  const items: ActivityFeedItem[] = raw.map((it) => ({
    id: it.id,
    at: it.at,
    label: actorLabel(nameById, it.actorId),
    detail: it.detail,
    href: it.href,
    kind: it.kind,
  }));

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const seen = new Set<string>();
  const deduped: ActivityFeedItem[] = [];
  for (const it of items) {
    const key = `${it.kind}-${it.detail.slice(0, 96)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(it);
    if (deduped.length >= limit) {
      break;
    }
  }

  return deduped;
}
