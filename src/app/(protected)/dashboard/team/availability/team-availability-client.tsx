"use client";

import Link from "next/link";

import type { ScheduleBlock } from "@/lib/team-availability";
import { buildLoadMatrix, findScheduleConflicts } from "@/lib/team-availability";
import { cn } from "@/lib/utils";

type Member = { userId: string; label: string };

export function TeamAvailabilityClient({
  members,
  blocks,
  dayKeys,
  weekOffset,
  dayLabels,
}: {
  members: Member[];
  blocks: ScheduleBlock[];
  dayKeys: string[];
  weekOffset: number;
  dayLabels: string[];
}) {
  const matrix = buildLoadMatrix(
    members.map((m) => m.userId),
    dayKeys,
    blocks
  );
  const conflicts = findScheduleConflicts(blocks);

  function cellClass(count: number) {
    if (count <= 0) {
      return "bg-muted/40 text-muted-foreground";
    }
    if (count === 1) {
      return "bg-sky-200/80 text-sky-950 dark:bg-sky-900/50 dark:text-sky-50";
    }
    if (count === 2) {
      return "bg-amber-300/90 text-amber-950 dark:bg-amber-800/70 dark:text-amber-50";
    }
    return "bg-rose-500/90 text-white dark:bg-rose-700";
  }

  return (
    <div className="space-y-8">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="sticky left-0 z-10 bg-muted/30 px-2 py-2 text-left font-medium">멤버</th>
              {dayLabels.map((lb, i) => (
                <th key={dayKeys[i]} className="px-1 py-2 text-center font-medium">
                  {lb}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} className="border-b last:border-0">
                <td className="sticky left-0 z-10 bg-background px-2 py-1.5 font-medium">{m.label}</td>
                {dayKeys.map((dk) => {
                  const c = matrix[m.userId]?.[dk] ?? 0;
                  return (
                    <td key={dk} className="p-0.5 text-center">
                      <div
                        className={cn(
                          "rounded px-1 py-2 text-xs font-medium tabular-nums",
                          cellClass(c)
                        )}
                        title={`${m.label} · ${dk}: 교차 일정 ${c}건`}
                      >
                        {c}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-3 rounded bg-muted/40" /> 여유
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-3 rounded bg-sky-200/80 dark:bg-sky-900/50" /> 1건
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-3 rounded bg-amber-300/90 dark:bg-amber-800/70" /> 2건
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-3 rounded bg-rose-500/90 dark:bg-rose-700" /> 3건+
        </span>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">시간 충돌 (참여자 기준)</h2>
        <p className="text-sm text-muted-foreground">
          같은 사람이 겹치는 구간에 참여하는 일정 쌍입니다. 프로젝트 일정에 참여자를 지정하면 더 정확해집니다.
        </p>
        {conflicts.length === 0 ? (
          <p className="text-sm text-muted-foreground">이번 주 감지된 충돌이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {conflicts.map((c, idx) => (
              <li
                key={`${c.userId}-${c.a.id}-${c.b.id}-${idx}`}
                className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm"
              >
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  {members.find((x) => x.userId === c.userId)?.label ?? c.userId.slice(0, 8)}
                </p>
                <p className="mt-1 text-muted-foreground">
                  「{c.a.title}」({fmtRange(c.a.start_time, c.a.end_time)}
                  {c.a.project_name ? ` · ${c.a.project_name}` : ""}) ↔ 「{c.b.title}」(
                  {fmtRange(c.b.start_time, c.b.end_time)}
                  {c.b.project_name ? ` · ${c.b.project_name}` : ""})
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/projects/${c.a.project_id}`}
                    className="text-xs text-primary underline-offset-4 hover:underline"
                  >
                    프로젝트 A
                  </Link>
                  <Link
                    href={`/dashboard/projects/${c.b.project_id}`}
                    className="text-xs text-primary underline-offset-4 hover:underline"
                  >
                    프로젝트 B
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex gap-2 text-sm">
        <Link
          href={`/dashboard/team/availability?w=${weekOffset - 1}`}
          className="rounded-md border px-3 py-1.5 hover:bg-muted"
        >
          ← 이전 주
        </Link>
        <Link href="/dashboard/team/availability" className="rounded-md border px-3 py-1.5 hover:bg-muted">
          이번 주
        </Link>
        <Link
          href={`/dashboard/team/availability?w=${weekOffset + 1}`}
          className="rounded-md border px-3 py-1.5 hover:bg-muted"
        >
          다음 주 →
        </Link>
      </div>
    </div>
  );
}

function fmtRange(a: string, b: string) {
  try {
    return `${new Date(a).toLocaleString("ko")} – ${new Date(b).toLocaleString("ko")}`;
  } catch {
    return `${a} – ${b}`;
  }
}
