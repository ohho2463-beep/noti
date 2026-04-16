"use client";

import Link from "next/link";
import * as React from "react";
import { Activity, Building2, CalendarDays, FileText, ListTodo } from "lucide-react";

import type { ActivityFeedItem } from "@/lib/dashboard/activity-feed";

const ESTIMATED_ROW_HEIGHT = 96;
const OVERSCAN = 5;

function kindIcon(kind: ActivityFeedItem["kind"]) {
  switch (kind) {
    case "doc":
      return FileText;
    case "schedule":
      return CalendarDays;
    case "project":
      return Building2;
    case "task":
      return ListTodo;
    default:
      return Activity;
  }
}

export function ActivityTimelineVirtualList({
  items,
  height = 460,
}: {
  items: ActivityFeedItem[];
  height?: number;
}) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const [measured, setMeasured] = React.useState<Record<number, number>>({});
  const roRef = React.useRef<ResizeObserver | null>(null);
  const nodesRef = React.useRef<Map<number, HTMLLIElement>>(new Map());

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof ResizeObserver === "undefined") {
      return;
    }
    const ro = new ResizeObserver((entries) => {
      setMeasured((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          const idxRaw = target.dataset["vindex"];
          if (!idxRaw) {
            continue;
          }
          const index = Number(idxRaw);
          if (!Number.isFinite(index)) {
            continue;
          }
          const h = Math.ceil(entry.contentRect.height);
          if ((next[index] ?? ESTIMATED_ROW_HEIGHT) !== h) {
            next[index] = h;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    });
    roRef.current = ro;
    for (const node of nodesRef.current.values()) {
      ro.observe(node);
    }
    return () => {
      ro.disconnect();
      roRef.current = null;
    };
  }, []);

  const offsets = React.useMemo(() => {
    const arr = new Array<number>(items.length + 1);
    arr[0] = 0;
    for (let i = 0; i < items.length; i += 1) {
      arr[i + 1] = arr[i] + (measured[i] ?? ESTIMATED_ROW_HEIGHT);
    }
    return arr;
  }, [items.length, measured]);

  const totalHeight = offsets[items.length] ?? 0;

  const findIndexAtOffset = React.useCallback(
    (target: number) => {
      let lo = 0;
      let hi = items.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if ((offsets[mid] ?? 0) <= target) {
          lo = mid + 1;
        } else {
          hi = mid;
        }
      }
      return Math.max(0, lo - 1);
    },
    [items.length, offsets]
  );

  const start = Math.max(0, findIndexAtOffset(scrollTop) - OVERSCAN);
  const end = Math.min(items.length, findIndexAtOffset(scrollTop + height) + OVERSCAN);
  const visible = items.slice(start, end + 1);

  const attachMeasure = React.useCallback((index: number, node: HTMLLIElement | null) => {
    const existing = nodesRef.current.get(index);
    if (existing && existing !== node) {
      roRef.current?.unobserve(existing);
      nodesRef.current.delete(index);
    }
    if (!node) {
      return;
    }
    node.dataset.vindex = String(index);
    nodesRef.current.set(index, node);
    roRef.current?.observe(node);
    const next = node.offsetHeight;
    setMeasured((prev) => (prev[index] === next ? prev : { ...prev, [index]: next }));
  }, []);

  return (
    <div
      className="relative overflow-y-auto rounded-lg border border-border/50"
      style={{ height }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <ul className="relative" style={{ height: totalHeight }}>
        {visible.map((item, idx) => {
          const absoluteIndex = start + idx;
          const top = offsets[absoluteIndex] ?? 0;
          const rowHeight = measured[absoluteIndex] ?? ESTIMATED_ROW_HEIGHT;
          const Icon = kindIcon(item.kind);
          return (
            <li
              key={item.id}
              ref={(node) => attachMeasure(absoluteIndex, node)}
              className="absolute left-0 right-0 px-2 py-1.5"
              style={{ top, minHeight: rowHeight }}
            >
              {item.href ? (
                <Link href={item.href} className="block transition-all duration-200 hover:opacity-95 hover:translate-y-[-1px]">
                  <div className="flex gap-3 rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-sm">
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 font-medium text-foreground">{item.label}</p>
                      <p className="line-clamp-1 text-muted-foreground">{item.detail}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{new Date(item.at).toLocaleString("ko")}</p>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="flex gap-3 rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-sm">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium text-foreground">{item.label}</p>
                    <p className="line-clamp-1 text-muted-foreground">{item.detail}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{new Date(item.at).toLocaleString("ko")}</p>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
