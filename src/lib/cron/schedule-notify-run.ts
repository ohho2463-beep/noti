import type { SupabaseClient } from "@supabase/supabase-js";

/** D-day·리마인더 알림은 Asia/Seoul 달력 기준(마이그레이션·운영 문서와 동일). */
const CRON_TIMEZONE = "Asia/Seoul";

function seoulDateString(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CRON_TIMEZONE }).format(new Date(iso));
}

function todaySeoul() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CRON_TIMEZONE }).format(new Date());
}

function addCalendarDaysSeoul(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  const epoch = Date.parse(
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00+09:00`
  );
  const next = new Date(epoch + delta * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: CRON_TIMEZONE }).format(next);
}

async function sendWithResend(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: false, skipped: true as const };
  }
  const from = process.env.RESEND_FROM ?? "Noti <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    const t = await res.text();
    return { ok: false, error: t };
  }
  return { ok: true as const };
}

async function claimNotification(
  admin: SupabaseClient,
  scheduleId: string,
  kind: "dday" | "remind_day" | "remind_minute",
  bucket: string
): Promise<boolean> {
  const { error } = await admin.from("schedule_notification_log").insert({
    schedule_id: scheduleId,
    kind,
    bucket,
  });
  if (error?.code === "23505") {
    return false;
  }
  if (error) {
    throw new Error(error.message);
  }
  return true;
}

type ScheduleRow = {
  id: string;
  project_id: string;
  title: string;
  start_time: string;
  notify_on_dday: boolean | null;
  dday_email_sent_on: string | null;
  remind_days_before: number | null;
  remind_minutes_before: number | null;
};

export async function runScheduleNotifications(admin: SupabaseClient): Promise<{
  day: string;
  checked: number;
  dday: number;
  remindDay: number;
  remindMinute: number;
  emailsSent: number;
  inAppInserted: number;
  resendConfigured: boolean;
  errors: string[];
}> {
  const day = todaySeoul();
  const errors: string[] = [];
  let emailsSent = 0;
  let inAppInserted = 0;
  let ddayCount = 0;
  let remindDayCount = 0;
  let remindMinuteCount = 0;

  const { data: rows, error: loadErr } = await admin.from("schedules").select(
    "id, project_id, title, start_time, notify_on_dday, dday_email_sent_on, remind_days_before, remind_minutes_before"
  );

  if (loadErr) {
    throw new Error(loadErr.message);
  }

  const schedules = (rows ?? []) as ScheduleRow[];
  const nowMs = Date.now();

  async function projectName(projectId: string): Promise<string> {
    const { data: proj } = await admin.from("projects").select("name").eq("id", projectId).maybeSingle();
    return (proj as { name: string } | null)?.name ?? "프로젝트";
  }

  async function notifyProjectMembers(
    schedule: ScheduleRow,
    subject: string,
    html: string,
    inTitle: string,
    inBody: string,
    hrefPath: string
  ) {
    const { data: members } = await admin
      .from("project_members")
      .select("user_id")
      .eq("project_id", schedule.project_id);
    const ids = [...new Set((members ?? []).map((m) => m.user_id as string))];
    if (!ids.length) {
      return;
    }
    const { data: profs } = await admin.from("profiles").select("id, email").in("id", ids);

    const rowsInApp = ids.map((user_id) => ({
      user_id,
      title: inTitle,
      body: inBody,
      href: hrefPath,
      kind: "schedule",
    }));

    const { error: nErr } = await admin.from("user_notifications").insert(rowsInApp);
    if (nErr) {
      errors.push(`in_app: ${nErr.message}`);
    } else {
      inAppInserted += rowsInApp.length;
    }

    const emails = [
      ...new Set(
        (profs ?? [])
          .map((p) => (p as { email: string | null }).email)
          .filter((e): e is string => Boolean(e?.includes("@")))
      ),
    ];

    for (const to of emails) {
      const r = await sendWithResend(to, subject, html);
      if (r.skipped) {
        errors.push("RESEND_API_KEY 없음 — 메일 생략");
        break;
      }
      if (!r.ok && "error" in r) {
        errors.push(r.error ?? "send failed");
      } else {
        emailsSent++;
      }
    }
  }

  for (const s of schedules) {
    const startDay = seoulDateString(s.start_time);
    const startMs = new Date(s.start_time).getTime();

    // --- D-day (시작일 당일) ---
    if (s.notify_on_dday !== false && startDay === day) {
      const legacySkip = s.dday_email_sent_on === day;
      if (!legacySkip) {
        const bucket = day;
        const claimed = await claimNotification(admin, s.id, "dday", bucket);
        if (claimed) {
          ddayCount++;
          const pname = await projectName(s.project_id);
          const subject = `[Noti] D-day: ${s.title}`;
          const html = `<p>프로젝트 <strong>${pname}</strong> 일정이 오늘입니다.</p><p><strong>${s.title}</strong></p>`;
          await notifyProjectMembers(
            s,
            subject,
            html,
            `일정 D-day: ${s.title}`,
            `${pname} · 오늘이 시작일입니다.`,
            `/dashboard/projects/${s.project_id}`
          );
          await admin.from("schedules").update({ dday_email_sent_on: day }).eq("id", s.id);
        }
      }
    }

    // --- N일 전 (Seoul 달력) ---
    const nd = s.remind_days_before;
    if (nd != null && nd > 0) {
      const remindTargetDay = addCalendarDaysSeoul(startDay, -nd);
      if (remindTargetDay === day) {
        const bucket = `${s.id}:${startDay}:nd${nd}`;
        const claimed = await claimNotification(admin, s.id, "remind_day", bucket);
        if (claimed) {
          remindDayCount++;
          const pname = await projectName(s.project_id);
          const subject = `[Noti] ${nd}일 전: ${s.title}`;
          const html = `<p>프로젝트 <strong>${pname}</strong></p><p><strong>${s.title}</strong> 일정이 ${nd}일 후(시작일 ${startDay})입니다.</p>`;
          await notifyProjectMembers(
            s,
            subject,
            html,
            `일정 ${nd}일 전: ${s.title}`,
            `${pname} · 시작일 ${startDay}`,
            `/dashboard/projects/${s.project_id}`
          );
        }
      }
    }

    // --- N분 전 ---
    const nm = s.remind_minutes_before;
    if (nm != null && startMs > nowMs) {
      const msBeforeStart = startMs - nowMs;
      const targetMs = nm * 60_000;
      const windowMs = 8 * 60_000;
      if (Math.abs(msBeforeStart - targetMs) <= windowMs) {
        const bucket = `${s.id}:${startMs}:m${nm}`;
        const claimed = await claimNotification(admin, s.id, "remind_minute", bucket);
        if (claimed) {
          remindMinuteCount++;
          const pname = await projectName(s.project_id);
          const subject = `[Noti] ${nm}분 후 시작: ${s.title}`;
          const html = `<p>프로젝트 <strong>${pname}</strong></p><p><strong>${s.title}</strong>이(가) 약 ${nm}분 후 시작합니다.</p>`;
          await notifyProjectMembers(
            s,
            subject,
            html,
            `곧 시작: ${s.title}`,
            `${pname} · 약 ${nm}분 후`,
            `/dashboard/projects/${s.project_id}`
          );
        }
      }
    }
  }

  return {
    day,
    checked: schedules.length,
    dday: ddayCount,
    remindDay: remindDayCount,
    remindMinute: remindMinuteCount,
    emailsSent,
    inAppInserted,
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    errors: errors.slice(0, 12),
  };
}
