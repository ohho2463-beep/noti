"use client";

import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/utils";

export type CalendarEventItem = {
  id: string;
  title: string;
  href: string;
  kind: "schedule" | "task";
  sub?: string;
  /** 프로젝트 일정 유형 (태스크에는 없음) */
  scheduleType?: "normal" | "auction" | "meeting" | "deadline";
  /** 주간 뷰 드래그·리사이즈용 (kind === "schedule" 일 때) */
  scheduleId?: string;
  projectId?: string;
  startIso?: string;
  endIso?: string;
};

type Props = {
  year: number;
  month: number; // 0-11
  eventsByDay: Record<string, CalendarEventItem[]>;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function keyFor(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export function CalendarGrid({ year, month, eventsByDay }: Props) {
  const [sel, setSel] = React.useState<string | null>(null);

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = (first.getDay() + 6) % 7; // Monday=0
  const daysInMonth = last.getDate();

  const cells: { d: number | null; key: string | null }[] = [];
  for (let i = 0; i < startPad; i++) {
    cells.push({ d: null, key: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ d, key: keyFor(year, month, d) });
  }

  const todayKey = keyFor(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate()
  );

  const selectedEvents = sel ? eventsByDay[sel] ?? [] : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
      <div className="rounded-xl border bg-card p-3 shadow-sm">
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
          {["월", "화", "수", "목", "금", "토", "일"].map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (c.d === null || !c.key) {
              return <div key={`e-${i}`} className="min-h-[72px] rounded-md bg-muted/20" />;
            }
            const evs = eventsByDay[c.key] ?? [];
            const isToday = c.key === todayKey;
            const isSel = sel === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setSel(c.key)}
                className={cn(
                  "flex min-h-[72px] flex-col rounded-md border p-1 text-left text-sm transition-colors hover:bg-muted/50",
                  isToday && "border-primary/60 bg-primary/5",
                  isSel && "ring-1 ring-primary"
                )}
              >
                <span className={cn("font-medium", isToday && "text-primary")}>{c.d}</span>
                <ul className="mt-0.5 space-y-0.5">
                  {evs.slice(0, 3).map((e) => (
                    <li
                      key={e.id}
                      className={cn(
                        "truncate rounded px-0.5 text-[10px] leading-tight",
                        e.kind === "task"
                          ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                          : e.scheduleType === "auction"
                            ? "bg-amber-500/20 text-amber-800 dark:text-amber-200"
                            : e.scheduleType === "deadline"
                              ? "bg-rose-500/15 text-rose-800 dark:text-rose-200"
                              : e.scheduleType === "meeting"
                                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                                : "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                      )}
                    >
                      {e.title}
                    </li>
                  ))}
                  {evs.length > 3 ? (
                    <li className="text-[10px] text-muted-foreground">+{evs.length - 3}</li>
                  ) : null}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">
          {sel ? `${sel} 일정` : "날짜를 선택하세요"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          일정: 하늘(일반)·주황(경매)·빨강(마감)·초록(회의) · 보라: 워크스페이스 태스크
        </p>
        <ul className="mt-4 space-y-3">
          {selectedEvents.length === 0 ? (
            <li className="text-sm text-muted-foreground">선택한 날에 일정이 없습니다.</li>
          ) : (
            selectedEvents.map((e) => (
              <li key={e.id} className="rounded-lg border bg-muted/20 p-3 text-sm">
                <Link href={e.href} className="font-medium text-primary underline-offset-4 hover:underline">
                  {e.title}
                </Link>
                {e.sub ? <p className="mt-1 text-xs text-muted-foreground">{e.sub}</p> : null}
                <span className="mt-1 inline-block text-[10px] text-muted-foreground">
                  {e.kind === "task" ? "태스크" : "일정"}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
