import type { Metadata } from "next";

import {
  SearchPanel,
  type SearchHitDoc,
  type SearchHitMember,
  type SearchHitOrg,
  type SearchHitProject,
  type SearchHitSchedule,
  type SearchHitTask,
  type SearchTabId,
} from "@/app/(protected)/dashboard/search/search-panel";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBootstrap } from "@/lib/workspace/server-context";

export const metadata: Metadata = {
  title: "검색",
};

function sanitize(q: string | undefined) {
  if (!q) {
    return "";
  }
  return q
    .trim()
    .slice(0, 64)
    .replace(/%/g, "")
    .replace(/_/g, "")
    .replace(/,/g, " ");
}

const TAB_IDS: SearchTabId[] = ["all", "docs", "tasks", "schedules", "projects", "orgs", "members"];

type Props = {
  searchParams: Promise<{ q?: string; tab?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const { q: raw, tab: rawTab } = await searchParams;
  const q = sanitize(raw);
  const tabParam = rawTab as SearchTabId | undefined;
  const tab: SearchTabId = tabParam && TAB_IDS.includes(tabParam) ? tabParam : "all";

  const supabase = await createClient();
  const wb = await getWorkspaceBootstrap();
  const userId = wb.sessionUser?.id ?? "";

  const pattern = q.length > 0 ? `%${q}%` : null;

  let wikiPages: SearchHitDoc[] = [];
  let wikiTasks: SearchHitTask[] = [];
  let projects: SearchHitProject[] = [];
  let organizations: SearchHitOrg[] = [];
  let schedules: SearchHitSchedule[] = [];
  let members: SearchHitMember[] = [];

  if (pattern) {
    const [{ data: pRows }, { data: oRows }] = await Promise.all([
      supabase
        .from("projects")
        .select("id, name, description")
        .or(`name.ilike.${pattern},description.ilike.${pattern}`)
        .limit(20),
      supabase
        .from("organizations")
        .select("id, name, description")
        .or(`name.ilike.${pattern},description.ilike.${pattern}`)
        .limit(20),
    ]);
    projects = (pRows ?? []) as SearchHitProject[];
    organizations = (oRows ?? []) as SearchHitOrg[];

    const { data: sch } = await supabase
      .from("schedules")
      .select("id, title, project_id")
      .ilike("title", pattern)
      .limit(20);
    const schList = sch ?? [];
    const schProjIds = [...new Set(schList.map((s) => s.project_id as string))];
    const { data: schProjects } =
      schProjIds.length > 0
        ? await supabase.from("projects").select("id, name").in("id", schProjIds)
        : { data: [] as { id: string; name: string }[] };
    const pn = new Map((schProjects ?? []).map((x) => [x.id, x.name]));
    schedules = schList.map((s) => ({
      id: s.id as string,
      title: s.title as string,
      project_id: s.project_id as string,
      project_name: pn.get(s.project_id as string) ?? null,
    }));

    if (wb.workspaceId) {
      const [{ data: pages }, { data: tasks }] = await Promise.all([
        supabase
          .from("workspace_pages")
          .select("id, title")
          .eq("workspace_id", wb.workspaceId)
          .is("deleted_at", null)
          .ilike("title", pattern)
          .limit(20),
        supabase
          .from("workspace_tasks")
          .select("id, title, status")
          .eq("workspace_id", wb.workspaceId)
          .ilike("title", pattern)
          .limit(20),
      ]);
      wikiPages = (pages ?? []) as SearchHitDoc[];
      wikiTasks = (tasks ?? []) as SearchHitTask[];
    }

    if (userId) {
      const { data: om } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId);
      const orgIds = [...new Set((om ?? []).map((r) => r.organization_id as string))];
      const { data: om2 } =
        orgIds.length > 0
          ? await supabase.from("organization_members").select("user_id").in("organization_id", orgIds)
          : { data: [] as { user_id: string }[] };

      const { data: pm } = await supabase.from("project_members").select("project_id").eq("user_id", userId);
      const projIds = [...new Set((pm ?? []).map((r) => r.project_id as string))];
      const { data: pm2 } =
        projIds.length > 0
          ? await supabase.from("project_members").select("user_id").in("project_id", projIds)
          : { data: [] as { user_id: string }[] };

      const peerIds = [
        ...new Set([...(om2 ?? []).map((r) => r.user_id), ...(pm2 ?? []).map((r) => r.user_id)]),
      ];
      if (peerIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", peerIds)
          .or(`display_name.ilike.${pattern},email.ilike.${pattern}`)
          .limit(20);
        members = (profs ?? []) as SearchHitMember[];
      }
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">검색</h1>
        <p className="text-muted-foreground">
          탭으로 결과 유형을 나눠 보세요. 상단 검색창 키워드와 동일합니다.
        </p>
      </div>

      {!pattern ? (
        <p className="text-sm text-muted-foreground">검색어를 입력해 주세요.</p>
      ) : (
        <SearchPanel
          q={q}
          tab={tab}
          docs={wikiPages}
          tasks={wikiTasks}
          projects={projects}
          organizations={organizations}
          schedules={schedules}
          members={members}
        />
      )}
    </div>
  );
}
