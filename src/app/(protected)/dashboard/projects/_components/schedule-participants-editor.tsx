"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setScheduleParticipants } from "@/actions/schedule-participants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ScheduleParticipantsEditor({
  scheduleId,
  projectId,
  memberOptions,
  selectedIds,
}: {
  scheduleId: string;
  projectId: string;
  memberOptions: { userId: string; label: string }[];
  selectedIds: string[];
}) {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>(() => [...new Set(selectedIds)]);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ error?: string; ok?: boolean }>({});
  const [pending, startTransition] = useTransition();

  function toggle(uid: string) {
    setIds((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));
  }

  function save() {
    startTransition(async () => {
      const res = await setScheduleParticipants({
        scheduleId,
        projectId,
        userIds: ids,
      });
      if (res.error) {
        setMsg({ error: res.error, ok: false });
        return;
      }
      setMsg({ ok: true });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-2 text-xs">
      <button
        type="button"
        className="text-primary underline-offset-4 hover:underline"
        onClick={() => setOpen((o) => !o)}
      >
        참여자 수정
      </button>
      {open ? (
        <div className="mt-2 space-y-2 rounded-md border bg-muted/20 p-2">
          {msg.error ? <p className="text-destructive">{msg.error}</p> : null}
          {msg.ok ? <p className="text-muted-foreground">저장했습니다.</p> : null}
          <div className="flex flex-wrap gap-2">
            {memberOptions.map((m) => (
              <label
                key={m.userId}
                className={cn(
                  "flex cursor-pointer items-center gap-1 rounded border px-2 py-1",
                  ids.includes(m.userId) ? "border-primary bg-primary/10" : "border-transparent bg-background"
                )}
              >
                <input
                  type="checkbox"
                  checked={ids.includes(m.userId)}
                  onChange={() => toggle(m.userId)}
                  className="rounded border"
                />
                {m.label}
              </label>
            ))}
          </div>
          <Button type="button" size="sm" disabled={pending} onClick={save}>
            {pending ? "저장 중…" : "참여자 저장"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
