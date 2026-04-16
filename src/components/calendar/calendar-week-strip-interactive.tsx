"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { updateScheduleWindow } from "@/actions/schedules";
import type { CalendarEventItem } from "@/components/calendar/calendar-grid";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

type DayCol = { key: string; label: string; weekday: string; events: CalendarEventItem[] };

function eventColors(e: CalendarEventItem) {
  if (e.kind === "task") {
    return "bg-violet-500/15 text-violet-800 dark:text-violet-200";
  }
  switch (e.scheduleType) {
    case "auction":
      return "bg-amber-500/20 text-amber-900 dark:text-amber-100";
    case "deadline":
      return "bg-rose-500/15 text-rose-900 dark:text-rose-100";
    case "meeting":
      return "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100";
    default:
      return "bg-sky-500/15 text-sky-900 dark:text-sky-100";
  }
}

function shiftStartToDayKeyFixed(startIso: string, endIso: string, dayKey: string) {
  const oldStart = new Date(startIso);
  const oldEnd = new Date(endIso);
  const dur = oldEnd.getTime() - oldStart.getTime();
  const [y, m, d] = dayKey.split("-").map(Number);
  const nextStart = new Date(
    y,
    (m ?? 1) - 1,
    d ?? 1,
    oldStart.getHours(),
    oldStart.getMinutes(),
    oldStart.getSeconds(),
    oldStart.getMilliseconds()
  );
  const nextEnd = new Date(nextStart.getTime() + dur);
  return { nextStart, nextEnd };
}

type DragPayload = {
  scheduleId: string;
  startIso: string;
  endIso: string;
};

export function CalendarWeekStripInteractive({ days }: { days: DayCol[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [dragOverKey, setDragOverKey] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const resizeRef = React.useRef<{
    scheduleId: string;
    startIso: string;
    endIso: string;
    startY: number;
    initialEndMs: number;
    startMs: number;
  } | null>(null);
  const startTransitionRef = React.useRef(startTransition);
  startTransitionRef.current = startTransition;
  const routerRef = React.useRef(router);
  routerRef.current = router;

  function parseDragPayload(dt: DataTransfer): DragPayload | null {
    try {
      const raw = dt.getData("application/noti-schedule");
      if (!raw) {
        return null;
      }
      const o = JSON.parse(raw) as DragPayload;
      if (!o.scheduleId || !o.startIso || !o.endIso) {
        return null;
      }
      return o;
    } catch {
      return null;
    }
  }

  function onDropDay(dayKey: string, dt: DataTransfer) {
    const p = parseDragPayload(dt);
    if (!p) {
      return;
    }
    const { nextStart, nextEnd } = shiftStartToDayKeyFixed(p.startIso, p.endIso, dayKey);
    setMessage(null);
    startTransition(async () => {
      const res = await updateScheduleWindow({
        scheduleId: p.scheduleId,
        startTimeIso: nextStart.toISOString(),
        endTimeIso: nextEnd.toISOString(),
      });
      if (res.error) {
        setMessage(res.error);
        return;
      }
      router.refresh();
    });
  }

  React.useEffect(() => {
    function onPointerUp(ev: PointerEvent) {
      const r = resizeRef.current;
      if (!r) {
        return;
      }
      resizeRef.current = null;
      const dy = ev.clientY - r.startY;
      const minutes = Math.round(dy / 8) * 5;
      const newEndMs = Math.max(r.startMs + 5 * 60 * 1000, r.initialEndMs + minutes * 60 * 1000);
      const newEnd = new Date(newEndMs);
      const newStart = new Date(r.startIso);
      startTransitionRef.current(async () => {
        const res = await updateScheduleWindow({
          scheduleId: r.scheduleId,
          startTimeIso: newStart.toISOString(),
          endTimeIso: newEnd.toISOString(),
        });
        if (res.error) {
          setMessage(res.error);
          return;
        }
        routerRef.current.refresh();
      });
    }
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  return (
    <div className="space-y-3">
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <p className="text-xs text-muted-foreground">
        프로젝트 일정을 다른 날짜로 <strong className="text-foreground">드래그</strong>하거나, 아래 가장자리를 드래그해{" "}
        <strong className="text-foreground">종료 시각</strong>을 늘릴 수 있습니다 (5분 단위). 태스크 마감일은 여기서
        옮기지 않습니다.
      </p>
      <div
        className={cn(
          "overflow-x-auto rounded-xl border bg-card p-3 shadow-sm transition-opacity",
          pending && "opacity-60"
        )}
      >
        <div className="flex min-w-[720px] gap-2">
          {days.map((d) => (
            <div
              key={d.key}
              className={cn(
                "min-w-0 flex-1 rounded-lg border bg-muted/15 p-2 transition-colors",
                dragOverKey === d.key && "ring-1 ring-primary bg-primary/5"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverKey(d.key);
              }}
              onDragLeave={() => setDragOverKey((k) => (k === d.key ? null : k))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverKey(null);
                onDropDay(d.key, e.dataTransfer);
              }}
            >
              <p className="text-[11px] font-medium text-muted-foreground">{d.weekday}</p>
              <p className="text-sm font-semibold tabular-nums">{d.label}</p>
              <ul className="mt-2 space-y-1.5">
                {d.events.length === 0 ? (
                  <li className="text-[11px] text-muted-foreground">—</li>
                ) : (
                  d.events.map((e) => {
                    if (e.kind === "schedule" && e.scheduleId && e.startIso && e.endIso) {
                      return (
                        <li key={e.id} id={`sched-wrap-${e.scheduleId}`} className="group relative">
                          <div
                            className={cn("overflow-hidden rounded border border-black/10 dark:border-white/10", eventColors(e))}
                          >
                            <div
                              draggable={!pending}
                              onDragStart={(ev) => {
                                ev.dataTransfer.setData(
                                  "application/noti-schedule",
                                  JSON.stringify({
                                    scheduleId: e.scheduleId!,
                                    startIso: e.startIso!,
                                    endIso: e.endIso!,
                                  } satisfies DragPayload)
                                );
                                ev.dataTransfer.effectAllowed = "move";
                              }}
                              className="cursor-grab px-1 py-0.5 active:cursor-grabbing"
                            >
                              <div className="flex items-start gap-0.5">
                                <GripVertical className="mt-0.5 size-3 shrink-0 opacity-40" aria-hidden />
                                <Link
                                  href={e.href}
                                  className="min-w-0 flex-1 text-[11px] font-medium leading-tight hover:underline"
                                  onClick={(ev) => ev.stopPropagation()}
                                >
                                  {e.title}
                                </Link>
                              </div>
                              {e.sub ? <p className="truncate text-[10px] opacity-80">{e.sub}</p> : null}
                            </div>
                            <button
                              type="button"
                              id={`sched-resize-${e.scheduleId}`}
                              aria-label="일정 종료 시간 늘리기"
                              className="h-2 w-full cursor-ns-resize border-t border-black/10 bg-black/10 hover:bg-black/20 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20"
                              onPointerDown={(ev) => {
                                ev.preventDefault();
                                ev.stopPropagation();
                                resizeRef.current = {
                                  scheduleId: e.scheduleId!,
                                  startIso: e.startIso!,
                                  endIso: e.endIso!,
                                  startY: ev.clientY,
                                  initialEndMs: new Date(e.endIso!).getTime(),
                                  startMs: new Date(e.startIso!).getTime(),
                                };
                              }}
                            />
                          </div>
                          <p className="mt-0.5 text-[9px] text-muted-foreground tabular-nums">
                            {new Date(e.startIso).toLocaleTimeString("ko", { hour: "2-digit", minute: "2-digit" })} –{" "}
                            {new Date(e.endIso).toLocaleTimeString("ko", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </li>
                      );
                    }
                    return (
                      <li key={e.id}>
                        <Link
                          href={e.href}
                          className={cn(
                            "block truncate rounded px-1 py-0.5 text-[11px] leading-tight hover:underline",
                            eventColors(e)
                          )}
                        >
                          {e.title}
                        </Link>
                        {e.sub ? <p className="truncate text-[10px] text-muted-foreground">{e.sub}</p> : null}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
