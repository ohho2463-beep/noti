"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { markAllNotificationsRead, markNotificationRead } from "@/actions/notifications";
import { DesktopNotifySection } from "@/components/dashboard/desktop-notify-prefs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserNotificationRow } from "@/lib/notifications/server";
import { Bell } from "lucide-react";

export function NotificationBell({ initial }: { initial: UserNotificationRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, markOptimistic] = useOptimistic(
    initial,
    (state, patch: { id: string; all?: boolean }) => {
      if (patch.all) {
        const now = new Date().toISOString();
        return state.map((n) => ({ ...n, read_at: n.read_at ?? now }));
      }
      return state.map((n) =>
        n.id === patch.id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n
      );
    }
  );

  const unread = optimistic.filter((n) => !n.read_at).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative shrink-0" aria-label="알림">
          <Bell className="size-4" />
          {unread > 0 ? (
            <Badge
              variant="destructive"
              className="pointer-events-none absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background px-1 text-[10px] font-semibold leading-none"
            >
              {unread > 99 ? "99+" : unread}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>알림</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-64 space-y-1 overflow-y-auto p-1">
          {!optimistic.length ? (
            <p className="rounded-md px-2 py-2 text-sm text-muted-foreground">새 알림이 없습니다.</p>
          ) : (
            optimistic.map((n) => (
              <div key={n.id} className="rounded-md border border-transparent hover:bg-muted/60">
                <NotificationRowContent
                  n={n}
                  onRead={() => {
                    markOptimistic({ id: n.id });
                    startTransition(async () => {
                      await markNotificationRead(n.id);
                      router.refresh();
                    });
                  }}
                />
              </div>
            ))
          )}
        </div>
        <DesktopNotifySection initialUnread={unread} />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending || unread === 0}
          onClick={() => {
            startTransition(async () => {
              markOptimistic({ id: "", all: true });
              await markAllNotificationsRead();
              router.refresh();
            });
          }}
        >
          모두 읽음
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/notifications">알림 센터 열기</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationRowContent({
  n,
  onRead,
}: {
  n: UserNotificationRow;
  onRead: () => void;
}) {
  const body = (
    <>
      <p className={n.read_at ? "font-medium text-muted-foreground" : "font-medium"}>{n.title}</p>
      {n.body ? <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p> : null}
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        {new Date(n.created_at).toLocaleString("ko")}
      </p>
    </>
  );

  if (n.href) {
    return (
      <Link
        href={n.href}
        className="block px-2 py-1.5 text-sm"
        onClick={() => {
          if (!n.read_at) {
            onRead();
          }
        }}
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="w-full px-2 py-1.5 text-left text-sm"
      onClick={() => {
        if (!n.read_at) {
          onRead();
        }
      }}
    >
      {body}
    </button>
  );
}
