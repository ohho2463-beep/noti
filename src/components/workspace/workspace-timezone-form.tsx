"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { updateWorkspaceDisplayTimezone } from "@/actions/workspace-hub";
import { Button } from "@/components/ui/button";

const ZONES = [
  "Asia/Seoul",
  "Asia/Tokyo",
  "Asia/Singapore",
  "UTC",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
] as const;

export function WorkspaceTimezoneForm({
  workspaceId,
  initialTimezone,
  canManage,
}: {
  workspaceId: string;
  initialTimezone: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [tz, setTz] = React.useState(initialTimezone || "Asia/Seoul");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        표시 타임존: <strong>{initialTimezone || "Asia/Seoul"}</strong> (일정·알림 UI 기준. D-day
        크론은 현재 Asia/Seoul 달력 고정 — <code className="text-xs">docs/DEPLOYMENT.md</code> 참고)
      </p>
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await updateWorkspaceDisplayTimezone(workspaceId, tz);
      if (res.error) {
        setMsg(res.error);
        return;
      }
      setMsg("저장했습니다.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <label htmlFor="ws-tz" className="text-sm font-medium">
          워크스페이스 표시 타임존
        </label>
        <select
          id="ws-tz"
          value={tz}
          onChange={(e) => setTz(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm"
        >
          {ZONES.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          일정 입력·표시 안내에 사용합니다. 서버 D-day 크론은 Asia/Seoul 기준입니다.
        </p>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "저장 중…" : "타임존 저장"}
      </Button>
      {msg ? <p className="w-full text-sm text-muted-foreground">{msg}</p> : null}
    </form>
  );
}
