"use client";

import * as React from "react";

import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users } from "lucide-react";

type TrackPayload = { name: string; online_at: number };

export function DocPresenceBar({
  pageId,
  viewerId,
  viewerName,
}: {
  pageId: string;
  viewerId: string;
  viewerName: string;
}) {
  const [others, setOthers] = React.useState<{ key: string; name: string }[]>([]);
  const [status, setStatus] = React.useState<"idle" | "live" | "unavailable">("idle");

  React.useEffect(() => {
    if (!viewerId || !pageId) {
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    const channel = supabase.channel(`page:${pageId}`, {
      config: { presence: { key: viewerId } },
    });

    channel.on("presence", { event: "sync" }, () => {
      if (cancelled) {
        return;
      }
      const state = channel.presenceState() as Record<string, TrackPayload[]>;
      const list: { key: string; name: string }[] = [];
      for (const key of Object.keys(state)) {
        if (key === viewerId) {
          continue;
        }
        const metas = state[key];
        const name = metas?.[0]?.name ?? "멤버";
        list.push({ key, name });
      }
      setOthers(list);
    });

    void channel.subscribe(async (s) => {
      if (cancelled) {
        return;
      }
      if (s === "SUBSCRIBED") {
        setStatus("live");
        const trackPayload: TrackPayload = { name: viewerName, online_at: Date.now() };
        await channel.track(trackPayload);
      } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
        setStatus("unavailable");
      }
    });

    return () => {
      cancelled = true;
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [pageId, viewerId, viewerName]);

  if (status === "unavailable") {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
      <Users className="size-3.5 shrink-0" aria-hidden />
      {status === "idle" ? (
        <span>실시간 접속 표시 연결 중…</span>
      ) : others.length === 0 ? (
        <span>이 문서를 같이 보고 있는 사람이 없습니다.</span>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-foreground">같이 보는 중</span>
          {others.map((o) => (
            <span key={o.key} className="flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5">
              <Avatar className="size-5">
                <AvatarFallback className="text-[9px]">{o.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="max-w-[120px] truncate font-medium text-foreground">{o.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
