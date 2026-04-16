"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import { createSchedule, deleteSchedule, updateSchedule } from "@/actions/schedules";
import {
  Field,
  FormMessage,
} from "@/app/(protected)/dashboard/_components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ScheduleRow = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  type: string;
  location: string | null;
  created_by: string;
  notify_on_dday?: boolean | null;
  dday_email_sent_on?: string | null;
  remind_days_before?: number | null;
  remind_minutes_before?: number | null;
};

const TYPES = [
  { value: "normal", label: "일반" },
  { value: "auction", label: "경매" },
  { value: "meeting", label: "회의" },
  { value: "deadline", label: "마감" },
] as const;

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseRemindDays(raw: FormDataEntryValue | null): number | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) {
    return null;
  }
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function parseRemindMinutes(raw: FormDataEntryValue | null): number | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) {
    return null;
  }
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export function NewScheduleForm({
  projectId,
  memberOptions = [],
  timezoneNote = "Asia/Seoul",
}: {
  projectId: string;
  memberOptions?: { userId: string; label: string }[];
  /** 워크스페이스 표시 타임존 (안내 문구). D-day 크론은 Asia/Seoul 달력 고정. */
  timezoneNote?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: boolean }>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = (fd.get("title") as string)?.trim();
    const startLocal = fd.get("start_time") as string;
    const endLocal = fd.get("end_time") as string;
    const type = fd.get("type") as string;
    if (!title || !startLocal || !endLocal) {
      setMsg({ error: "제목과 시작·종료 시각을 입력하세요." });
      return;
    }
    startTransition(async () => {
      const participantUserIds = memberOptions
        .filter((m) => fd.get(`participant_${m.userId}`) === "on")
        .map((m) => m.userId);
      const res = await createSchedule({
        projectId,
        title,
        description: ((fd.get("description") as string) || "").trim() || null,
        startTimeIso: new Date(startLocal).toISOString(),
        endTimeIso: new Date(endLocal).toISOString(),
        type,
        location: ((fd.get("location") as string) || "").trim() || null,
        notifyOnDday: fd.get("notify_on_dday") === "on",
        remindDaysBefore: parseRemindDays(fd.get("remind_days_before")),
        remindMinutesBefore: parseRemindMinutes(fd.get("remind_minutes_before")),
        participantUserIds,
      });
      if (res.error) {
        setMsg({ error: res.error });
        return;
      }
      setMsg({ ok: true });
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border p-4">
      {msg.error ? (
        <p className="text-sm text-destructive" role="alert">
          {msg.error}
        </p>
      ) : null}
      {msg.ok ? <p className="text-sm text-muted-foreground">추가되었습니다.</p> : null}
      <Field label="제목">
        <Input name="title" required placeholder="일정 제목" />
      </Field>
      <Field label="유형">
        <select
          name="type"
          defaultValue="normal"
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          )}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <p className="text-xs text-muted-foreground">
        시작·종료는 브라우저 로컬 시각으로 저장됩니다. D-day·N일 전 알림은 서버 크론이{" "}
        <strong>Asia/Seoul</strong> 달력으로 처리합니다. (표시 기준: {timezoneNote})
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="시작">
          <Input name="start_time" type="datetime-local" required />
        </Field>
        <Field label="종료">
          <Input name="end_time" type="datetime-local" required />
        </Field>
      </div>
      <Field label="장소 (선택)">
        <Input name="location" placeholder="회의실, 링크 등" />
      </Field>
      <Field label="설명 (선택)">
        <textarea
          name="description"
          rows={2}
          className={cn(
            "flex min-h-[52px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          )}
        />
      </Field>
      {memberOptions.length ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">참여자 (가용성·충돌 감지에 사용)</p>
          <p className="text-xs text-muted-foreground">작성자는 자동 포함됩니다.</p>
          <div className="flex flex-wrap gap-2">
            {memberOptions.map((m) => (
              <label
                key={m.userId}
                className="flex items-center gap-1 rounded border px-2 py-1 text-sm"
              >
                <input type="checkbox" name={`participant_${m.userId}`} className="rounded border" />
                {m.label}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="notify_on_dday" defaultChecked className="rounded border" />
        D-day 당일 팀원에게 메일·인앱 알림 (메일은 Resend·크론 설정 시)
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="N일 전 알림 (선택)">
          <select
            name="remind_days_before"
            defaultValue=""
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            )}
          >
            <option value="">없음</option>
            <option value="1">1일 전</option>
            <option value="2">2일 전</option>
            <option value="3">3일 전</option>
            <option value="7">7일 전</option>
          </select>
        </Field>
        <Field label="N분 전 알림 (선택)">
          <select
            name="remind_minutes_before"
            defaultValue=""
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            )}
          >
            <option value="">없음</option>
            <option value="5">5분 전</option>
            <option value="10">10분 전</option>
            <option value="15">15분 전</option>
            <option value="30">30분 전</option>
            <option value="60">60분 전</option>
            <option value="120">120분 전</option>
          </select>
        </Field>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "추가 중…" : "일정 추가"}
      </Button>
    </form>
  );
}

export function EditScheduleInline({
  projectId,
  schedule,
  onDone,
}: {
  projectId: string;
  schedule: ScheduleRow;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = (fd.get("title") as string)?.trim();
    const startLocal = fd.get("start_time") as string;
    const endLocal = fd.get("end_time") as string;
    const type = fd.get("type") as string;
    if (!title || !startLocal || !endLocal) {
      setError("제목과 시작·종료 시각을 입력하세요.");
      return;
    }
    startTransition(async () => {
      const res = await updateSchedule({
        id: schedule.id,
        projectId,
        title,
        description: ((fd.get("description") as string) || "").trim() || null,
        startTimeIso: new Date(startLocal).toISOString(),
        endTimeIso: new Date(endLocal).toISOString(),
        type,
        location: ((fd.get("location") as string) || "").trim() || null,
        notifyOnDday: fd.get("notify_on_dday") === "on",
        remindDaysBefore: parseRemindDays(fd.get("remind_days_before")),
        remindMinutesBefore: parseRemindMinutes(fd.get("remind_minutes_before")),
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setError(null);
      onDone();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 grid gap-2 rounded-md border bg-muted/30 p-3">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Input name="title" required defaultValue={schedule.title} />
      <select
        name="type"
        defaultValue={schedule.type}
        className={cn("h-9 rounded-md border border-input bg-transparent px-2 text-sm")}
      >
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          name="start_time"
          type="datetime-local"
          required
          defaultValue={toLocalInputValue(schedule.start_time)}
        />
        <Input
          name="end_time"
          type="datetime-local"
          required
          defaultValue={toLocalInputValue(schedule.end_time)}
        />
      </div>
      <Input name="location" defaultValue={schedule.location ?? ""} />
      <textarea
        name="description"
        rows={2}
        defaultValue={schedule.description ?? ""}
        className={cn(
          "min-h-[48px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        )}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="notify_on_dday"
          defaultChecked={schedule.notify_on_dday !== false}
          className="rounded border"
        />
        D-day 당일 알림
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          N일 전
          <select
            name="remind_days_before"
            defaultValue={
              schedule.remind_days_before != null && schedule.remind_days_before > 0
                ? String(schedule.remind_days_before)
                : ""
            }
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">없음</option>
            <option value="1">1일 전</option>
            <option value="2">2일 전</option>
            <option value="3">3일 전</option>
            <option value="7">7일 전</option>
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          N분 전
          <select
            name="remind_minutes_before"
            defaultValue={
              schedule.remind_minutes_before != null && schedule.remind_minutes_before > 0
                ? String(schedule.remind_minutes_before)
                : ""
            }
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">없음</option>
            <option value="5">5분 전</option>
            <option value="10">10분 전</option>
            <option value="15">15분 전</option>
            <option value="30">30분 전</option>
            <option value="60">60분 전</option>
            <option value="120">120분 전</option>
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          저장
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          취소
        </Button>
      </div>
    </form>
  );
}

export function DeleteScheduleButton({
  scheduleId,
  projectId,
}: {
  scheduleId: string;
  projectId: string;
}) {
  const [state, action, pending] = useActionState(deleteSchedule, null);

  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={scheduleId} />
      <input type="hidden" name="project_id" value={projectId} />
      <FormMessage state={state} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-destructive"
        disabled={pending}
      >
        삭제
      </Button>
    </form>
  );
}
