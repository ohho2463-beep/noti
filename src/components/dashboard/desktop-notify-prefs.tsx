"use client";

import * as React from "react";

import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const STORAGE_KEY = "noti_desktop_notifications_v1";

export function DesktopNotifySection({ initialUnread }: { initialUnread: number }) {
  const [enabled, setEnabled] = React.useState(false);
  const [permission, setPermission] = React.useState<NotificationPermission | "unsupported">("default");
  const unreadRef = React.useRef(initialUnread);

  React.useEffect(() => {
    unreadRef.current = initialUnread;
  }, [initialUnread]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    setEnabled(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!enabled || permission !== "granted") {
      return;
    }
    const t = window.setInterval(async () => {
      try {
        const r = await fetch("/api/notifications/summary", { cache: "no-store" });
        if (!r.ok) {
          return;
        }
        const j = (await r.json()) as {
          unread: number;
          latest: { id: string; title: string; body: string | null; read_at: string | null } | null;
        };
        if (j.unread > unreadRef.current && j.latest && !j.latest.read_at) {
          new Notification(j.latest.title, {
            body: j.latest.body ?? undefined,
            tag: j.latest.id,
          });
        }
        unreadRef.current = j.unread;
      } catch {
        /* 네트워크 */
      }
    }, 120_000);
    return () => window.clearInterval(t);
  }, [enabled, permission]);

  async function toggle() {
    if (permission === "unsupported") {
      return;
    }
    if (!enabled) {
      const p = await Notification.requestPermission();
      setPermission(p);
      if (p !== "granted") {
        return;
      }
      localStorage.setItem(STORAGE_KEY, "1");
      setEnabled(true);
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    setEnabled(false);
  }

  if (permission === "unsupported") {
    return null;
  }

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="cursor-pointer flex-col items-start gap-0"
        onClick={(e) => {
          e.preventDefault();
          void toggle();
        }}
      >
        <span>{enabled ? "데스크톱 알림 끄기" : "데스크톱 알림 켜기"}</span>
        {permission === "denied" ? (
          <span className="text-[10px] font-normal text-muted-foreground">브라우저 설정에서 알림을 허용해 주세요.</span>
        ) : null}
      </DropdownMenuItem>
    </>
  );
}
