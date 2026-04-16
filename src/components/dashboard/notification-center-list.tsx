"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { markAllNotificationsRead, markNotificationRead } from "@/actions/notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserNotificationRow } from "@/lib/notifications/server";
import { cn } from "@/lib/utils";

export function NotificationCenterList({ rows }: { rows: UserNotificationRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unread = rows.filter((r) => !r.read_at).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">알림 목록</CardTitle>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || unread === 0}
          onClick={() =>
            startTransition(async () => {
              await markAllNotificationsRead();
              router.refresh();
            })
          }
        >
          모두 읽음
        </Button>
      </CardHeader>
      <CardContent>
        {!rows.length ? (
          <p className="text-sm text-muted-foreground">표시할 알림이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "rounded-lg border border-border/60 px-3 py-2",
                  !n.read_at && "border-primary/40 bg-primary/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Badge variant="secondary" className="h-5 rounded px-1.5 text-[10px]">
                        {n.kind}
                      </Badge>
                      <span>{new Date(n.created_at).toLocaleString("ko")}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {n.href ? (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={n.href}>열기</Link>
                      </Button>
                    ) : null}
                    {!n.read_at ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await markNotificationRead(n.id);
                            router.refresh();
                          })
                        }
                      >
                        읽음
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
