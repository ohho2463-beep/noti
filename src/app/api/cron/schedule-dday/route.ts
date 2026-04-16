import { NextResponse } from "next/server";

import { runScheduleNotifications } from "@/lib/cron/schedule-notify-run";
import { verifyCronBearer } from "@/lib/cron/verify-request";
import { createServiceRoleClient } from "@/lib/supabase/admin";

/**
 * 일정 알림 크론: D-day(Seoul)·N일 전·N분 전.
 * Vercel Cron 등에서 15분마다 호출 권장. Authorization: Bearer CRON_SECRET
 * (GET 또는 POST)
 */
async function handleCron(request: Request) {
  const denied = verifyCronBearer(request);
  if (denied) {
    return denied;
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { error: "missing_service_role", hint: "SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  try {
    const stats = await runScheduleNotifications(admin);
    return NextResponse.json(stats);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
