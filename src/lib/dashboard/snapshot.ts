import type { SupabaseClient } from "@supabase/supabase-js";

import type { UserNotificationRow } from "@/lib/notifications/server";

import { addDaysIso, dayBoundsIso } from "./time-bounds";

export type ScheduleSnippet = {
  id: string;
  title: string;
  start_time: string;
  project_id: string;
  project_name: string | null;
  type: string;
};

export type TaskSnippet = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
};

export type DocSnippet = {
  id: string;
  title: string;
  updated_at: string;
};

export type DashboardSnapshot = {
  todaySchedules: ScheduleSnippet[];
  weekSchedules: ScheduleSnippet[];
  imminentTasks: TaskSnippet[];
  recentDocs: DocSnippet[];
  starredDocs: DocSnippet[];
  unreadNotificationCount: number;
  notificationPreview: UserNotificationRow[];
  automationSummary: {
    total24h: number;
    failed24h: number;
    skipped24h: number;
    successRate24h: number;
  };
  riskProjects: Array<{
    project_id: string;
    project_name: string;
    score: number;
    grade: "stable" | "watch" | "risk";
    summary: string;
    computed_at: string;
  }>;
  openConflicts: {
    total: number;
    high: number;
  };
};

export async function loadDashboardSnapshot(
  supabase: SupabaseClient,
  input: {
    workspaceId: string | null;
    displayTimezone: string | null | undefined;
    notifications: UserNotificationRow[];
    userId: string;
  }
): Promise<DashboardSnapshot> {
  const { start: dayStart, end: dayEnd } = dayBoundsIso(input.displayTimezone);
  const weekEnd = addDaysIso(dayStart, 7);

  const unreadNotificationCount = input.notifications.filter((n) => !n.read_at).length;
  const notificationPreview = [...input.notifications]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const { data: todayRows } = await supabase
    .from("schedules")
    .select("id, title, start_time, project_id, type")
    .gte("start_time", dayStart)
    .lt("start_time", dayEnd)
    .order("start_time", { ascending: true })
    .limit(20);

  const { data: weekRows } = await supabase
    .from("schedules")
    .select("id, title, start_time, project_id, type")
    .gte("start_time", dayStart)
    .lt("start_time", weekEnd)
    .order("start_time", { ascending: true })
    .limit(40);

  const projectIds = [
    ...new Set([...(todayRows ?? []), ...(weekRows ?? [])].map((r) => r.project_id as string)),
  ];
  const { data: projects } =
    projectIds.length > 0
      ? await supabase.from("projects").select("id, name").in("id", projectIds)
      : { data: [] as { id: string; name: string }[] };

  const projectName = new Map((projects ?? []).map((p) => [p.id, p.name]));

  const mapSched = (rows: typeof todayRows): ScheduleSnippet[] =>
    (rows ?? []).map((r) => ({
      id: r.id as string,
      title: r.title as string,
      start_time: r.start_time as string,
      project_id: r.project_id as string,
      project_name: projectName.get(r.project_id as string) ?? null,
      type: (r.type as string) ?? "normal",
    }));

  let imminentTasks: TaskSnippet[] = [];
  let recentDocs: DocSnippet[] = [];
  let starredDocs: DocSnippet[] = [];
  let automationSummary = {
    total24h: 0,
    failed24h: 0,
    skipped24h: 0,
    successRate24h: 0,
  };
  let riskProjects: DashboardSnapshot["riskProjects"] = [];
  let openConflicts: DashboardSnapshot["openConflicts"] = { total: 0, high: 0 };

  if (input.workspaceId) {
    const todayStr = dayStart.slice(0, 10);
    const weekLaterStr = weekEnd.slice(0, 10);

    const { data: tasks } = await supabase
      .from("workspace_tasks")
      .select("id, title, due_date, status")
      .eq("workspace_id", input.workspaceId)
      .neq("status", "done")
      .not("due_date", "is", null)
      .gte("due_date", todayStr)
      .lte("due_date", weekLaterStr)
      .order("due_date", { ascending: true })
      .limit(12);

    imminentTasks = (tasks ?? []).map((t) => ({
      id: t.id as string,
      title: (t.title as string) || "태스크",
      due_date: (t.due_date as string) ?? null,
      status: t.status as string,
    }));

    const { data: docs } = await supabase
      .from("workspace_pages")
      .select("id, title, updated_at")
      .eq("workspace_id", input.workspaceId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(8);

    recentDocs = (docs ?? []).map((d) => ({
      id: d.id as string,
      title: d.title as string,
      updated_at: d.updated_at as string,
    }));

    const { data: starRows } = await supabase
      .from("workspace_page_stars")
      .select("page_id, created_at")
      .eq("user_id", input.userId)
      .order("created_at", { ascending: false })
      .limit(12);

    const starIds = (starRows ?? []).map((s) => s.page_id as string);
    if (starIds.length > 0) {
      const { data: starredPages } = await supabase
        .from("workspace_pages")
        .select("id, title, updated_at")
        .in("id", starIds)
        .is("deleted_at", null);

      const order = new Map(starIds.map((id, i) => [id, i]));
      starredDocs = (starredPages ?? [])
        .map((d) => ({
          id: d.id as string,
          title: d.title as string,
          updated_at: d.updated_at as string,
        }))
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }

    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1_000).toISOString();
    const [{ data: runRows }, { data: riskRows }, { data: conflictRows }] = await Promise.all([
      supabase
        .from("workspace_automation_runs")
        .select("status")
        .eq("workspace_id", input.workspaceId)
        .gte("executed_at", sinceIso)
        .limit(300),
      supabase
        .from("project_health_snapshots")
        .select("project_id, score, grade, factors, computed_at")
        .eq("workspace_id", input.workspaceId)
        .order("computed_at", { ascending: false })
        .limit(200),
      supabase
        .from("schedule_conflicts")
        .select("severity")
        .eq("workspace_id", input.workspaceId)
        .is("resolved_at", null)
        .limit(200),
    ]);

    const runs = runRows ?? [];
    const total24h = runs.length;
    const failed24h = runs.filter((r) => (r.status as string) === "failed").length;
    const skipped24h = runs.filter((r) => (r.status as string) === "skipped").length;
    const success24h = runs.filter((r) => (r.status as string) === "success").length;
    automationSummary = {
      total24h,
      failed24h,
      skipped24h,
      successRate24h: total24h > 0 ? Math.round((success24h / total24h) * 100) : 100,
    };

    const latestByProject = new Map<
      string,
      { score: number; grade: "stable" | "watch" | "risk"; factors: Record<string, unknown>; computed_at: string }
    >();
    for (const row of riskRows ?? []) {
      const pid = row.project_id as string;
      if (!latestByProject.has(pid)) {
        latestByProject.set(pid, {
          score: Number(row.score ?? 0),
          grade: ((row.grade as string) ?? "stable") as "stable" | "watch" | "risk",
          factors: ((row.factors as Record<string, unknown> | null) ?? {}) as Record<string, unknown>,
          computed_at: row.computed_at as string,
        });
      }
    }

    const riskProjectIds = [...latestByProject.keys()];
    const { data: riskProjectsRaw } =
      riskProjectIds.length > 0
        ? await supabase.from("projects").select("id, name").in("id", riskProjectIds)
        : { data: [] as { id: string; name: string }[] };
    const projectNames = new Map((riskProjectsRaw ?? []).map((p) => [p.id, p.name]));

    function explainRiskFactors(factors: Record<string, unknown>) {
      const overdue = Number(factors.overdue_tasks ?? 0);
      const delayed = Number(factors.delayed_schedules ?? 0);
      if (overdue === 0 && delayed === 0) {
        return "리스크 요인이 감지되지 않았습니다.";
      }
      const segments = [];
      if (delayed > 0) {
        segments.push(`지연 일정 ${delayed}건`);
      }
      if (overdue > 0) {
        segments.push(`마감 초과 태스크 ${overdue}건`);
      }
      return segments.join(" + ");
    }

    riskProjects = riskProjectIds
      .map((pid) => {
        const latest = latestByProject.get(pid);
        if (!latest) {
          return null;
        }
        return {
          project_id: pid,
          project_name: projectNames.get(pid) ?? "프로젝트",
          score: latest.score,
          grade: latest.grade,
          summary: explainRiskFactors(latest.factors),
          computed_at: latest.computed_at,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const conflicts = conflictRows ?? [];
    openConflicts = {
      total: conflicts.length,
      high: conflicts.filter((r) => (r.severity as string) === "high").length,
    };
  }

  return {
    todaySchedules: mapSched(todayRows),
    weekSchedules: mapSched(weekRows),
    imminentTasks,
    recentDocs,
    starredDocs,
    unreadNotificationCount,
    notificationPreview,
    automationSummary,
    riskProjects,
    openConflicts,
  };
}
