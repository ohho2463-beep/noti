import type { Metadata } from "next";
import Link from "next/link";

import { CalendarGrid, type CalendarEventItem } from "@/components/calendar/calendar-grid";
import { CalendarWeekStripInteractive } from "@/components/calendar/calendar-week-strip-interactive";
import { addDaysIso, dayBoundsIso } from "@/lib/dashboard/time-bounds";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBootstrap } from "@/lib/workspace/server-context";

export const metadata: Metadata = {
  title: "캘린더",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dayKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayKeyFromIsoLocal(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return dayKeyFromDate(d);
}

type SearchParams = Promise<{ y?: string; m?: string; view?: string }>;

export default async function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const weekView = sp.view === "week";
  const now = new Date();
  const year = Math.min(2100, Math.max(1970, parseInt(sp.y ?? String(now.getFullYear()), 10) || now.getFullYear()));
  const month1 = Math.min(12, Math.max(1, parseInt(sp.m ?? String(now.getMonth() + 1), 10) || now.getMonth() + 1));
  const monthIndex = month1 - 1;

  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

  const supabase = await createClient();
  const wb = await getWorkspaceBootstrap();

  if (weekView) {
    const { start: day0Iso } = dayBoundsIso(wb.workspace?.display_timezone);
    const weekEndIso = addDaysIso(day0Iso, 7);
    const dayKeys = Array.from({ length: 7 }, (_, i) => addDaysIso(day0Iso, i).slice(0, 10));

    const { data: wSchedules } = await supabase
      .from("schedules")
      .select("id, title, type, start_time, end_time, project_id")
      .gte("start_time", day0Iso)
      .lt("start_time", weekEndIso)
      .order("start_time", { ascending: true });

    const wProjIds = [...new Set((wSchedules ?? []).map((s) => s.project_id))];
    const { data: wProjects } =
      wProjIds.length > 0
        ? await supabase.from("projects").select("id, name").in("id", wProjIds)
        : { data: [] as { id: string; name: string }[] };
    const wProjectName = new Map((wProjects ?? []).map((p) => [p.id, p.name]));

    const eventsByDay: Record<string, CalendarEventItem[]> = {};
    for (const k of dayKeys) {
      eventsByDay[k] = [];
    }
    function wPush(day: string, ev: CalendarEventItem) {
      if (!eventsByDay[day]) {
        eventsByDay[day] = [];
      }
      eventsByDay[day].push(ev);
    }
    for (const s of wSchedules ?? []) {
      const day = dayKeyFromIsoLocal(s.start_time as string);
      if (!day) {
        continue;
      }
      wPush(day, {
        id: `s-${s.id}`,
        title: s.title as string,
        href: `/dashboard/projects/${s.project_id}`,
        kind: "schedule",
        sub: wProjectName.get(s.project_id as string) ?? undefined,
        scheduleType: s.type as CalendarEventItem["scheduleType"],
        scheduleId: s.id as string,
        projectId: s.project_id as string,
        startIso: s.start_time as string,
        endIso: s.end_time as string,
      });
    }

    if (wb.workspaceId) {
      const startStr = dayKeys[0]!;
      const endStr = dayKeys[6]!;
      const { data: wTasks } = await supabase
        .from("workspace_tasks")
        .select("id, title, due_date, status")
        .eq("workspace_id", wb.workspaceId)
        .not("due_date", "is", null)
        .gte("due_date", startStr)
        .lte("due_date", endStr);
      for (const t of wTasks ?? []) {
        const due = t.due_date as string;
        if (!due) {
          continue;
        }
        wPush(due, {
          id: `t-${t.id}`,
          title: (t.title as string) || "태스크",
          href: "/dashboard/tasks",
          kind: "task",
          sub: t.status as string,
        });
      }
    }

    const weekdayLabels = ["월", "화", "수", "목", "금", "토", "일"];
    const days = dayKeys.map((k) => {
      const [yy, mm, dd] = k.split("-").map(Number);
      const d = new Date(yy, (mm ?? 1) - 1, dd ?? 1);
      const wd = weekdayLabels[(d.getDay() + 6) % 7];
      return {
        key: k,
        label: `${mm}/${dd}`,
        weekday: wd,
        events: eventsByDay[k] ?? [],
      };
    });

    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">캘린더</h1>
            <p className="text-muted-foreground">
              오늘부터 7일간 · 프로젝트 일정은 드래그로 날짜 이동, 아래 끝을 드래그해 종료 시각 조정
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href={`/dashboard/calendar?view=week`}
              className="rounded-md border bg-primary px-3 py-1.5 text-primary-foreground"
            >
              주간
            </Link>
            <Link href="/dashboard/calendar" className="rounded-md border px-3 py-1.5 hover:bg-muted">
              월간
            </Link>
          </div>
        </div>
        <CalendarWeekStripInteractive days={days} />
      </div>
    );
  }

  const { data: schedules } = await supabase
    .from("schedules")
    .select("id, title, type, start_time, end_time, project_id")
    .gte("start_time", monthStart.toISOString())
    .lte("start_time", monthEnd.toISOString())
    .order("start_time", { ascending: true });

  const projectIds = [...new Set((schedules ?? []).map((s) => s.project_id))];
  const { data: projects } =
    projectIds.length > 0
      ? await supabase.from("projects").select("id, name").in("id", projectIds)
      : { data: [] as { id: string; name: string }[] };

  const projectName = new Map((projects ?? []).map((p) => [p.id, p.name]));

  const eventsByDay: Record<string, CalendarEventItem[]> = {};

  function pushEvent(day: string, ev: CalendarEventItem) {
    if (!eventsByDay[day]) {
      eventsByDay[day] = [];
    }
    eventsByDay[day].push(ev);
  }

  for (const s of schedules ?? []) {
    const day = dayKeyFromIsoLocal(s.start_time as string);
    if (!day) {
      continue;
    }
    pushEvent(day, {
      id: `s-${s.id}`,
      title: s.title as string,
      href: `/dashboard/projects/${s.project_id}`,
      kind: "schedule",
      sub: projectName.get(s.project_id as string) ?? undefined,
      scheduleType: s.type as CalendarEventItem["scheduleType"],
    });
  }

  if (wb.workspaceId) {
    const startStr = `${year}-${pad(monthIndex + 1)}-01`;
    const lastD = new Date(year, monthIndex + 1, 0).getDate();
    const endStr = `${year}-${pad(monthIndex + 1)}-${pad(lastD)}`;
    const { data: tasks } = await supabase
      .from("workspace_tasks")
      .select("id, title, due_date, status")
      .eq("workspace_id", wb.workspaceId)
      .not("due_date", "is", null)
      .gte("due_date", startStr)
      .lte("due_date", endStr);

    for (const t of tasks ?? []) {
      const due = t.due_date as string;
      if (!due) {
        continue;
      }
      pushEvent(due, {
        id: `t-${t.id}`,
        title: (t.title as string) || "태스크",
        href: "/dashboard/tasks",
        kind: "task",
        sub: t.status as string,
      });
    }
  }

  const prev = new Date(year, monthIndex - 1, 1);
  const next = new Date(year, monthIndex + 1, 1);

  function fmt(iso: string) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  const listSchedules = (schedules ?? []).slice(0, 50);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">캘린더</h1>
          <p className="text-muted-foreground">
            월별 격자에서 날짜를 누르면 해당 날의 프로젝트 일정과 워크스페이스 태스크(마감일)가 보입니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/dashboard/calendar?view=week" className="rounded-md border px-3 py-1.5 hover:bg-muted">
            주간
          </Link>
          <Link
            href={`/dashboard/calendar?y=${prev.getFullYear()}&m=${prev.getMonth() + 1}`}
            className="rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            이전 달
          </Link>
          <span className="font-medium">
            {year}년 {month1}월
          </span>
          <Link
            href={`/dashboard/calendar?y=${next.getFullYear()}&m=${next.getMonth() + 1}`}
            className="rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            다음 달
          </Link>
          <Link href="/dashboard/calendar" className="text-primary underline-offset-4 hover:underline">
            오늘 달
          </Link>
        </div>
      </div>

      <CalendarGrid year={year} month={monthIndex} eventsByDay={eventsByDay} />

      <Card>
        <CardHeader>
          <CardTitle>이번 달 일정 목록</CardTitle>
          <CardDescription>프로젝트 상세에서 수정·삭제할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {!listSchedules.length ? (
            <p className="text-sm text-muted-foreground">이 달에 시작하는 일정이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>시작</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead className="hidden sm:table-cell">유형</TableHead>
                  <TableHead className="hidden md:table-cell">프로젝트</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listSchedules.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {fmt(s.start_time as string)}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/projects/${s.project_id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {s.title as string}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{s.type as string}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {projectName.get(s.project_id as string) ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
