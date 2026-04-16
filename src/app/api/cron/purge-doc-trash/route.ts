import { NextResponse } from "next/server";

import { verifyCronBearer } from "@/lib/cron/verify-request";
import { createServiceRoleClient } from "@/lib/supabase/admin";

/**
 * 휴지통(소프트 삭제) 30일 경과 문서 영구 삭제. Authorization: Bearer CRON_SECRET
 * (GET 또는 POST)
 */
async function handlePurge(request: Request) {
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

  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const { data: stale, error: selErr } = await admin
    .from("workspace_pages")
    .select("id")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff);

  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }

  const ids = (stale ?? []).map((r) => (r as { id: string }).id);
  if (!ids.length) {
    return NextResponse.json({ deleted: 0, cutoff });
  }

  const { error: delErr } = await admin.from("workspace_pages").delete().in("id", ids);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: ids.length, cutoff });
}

export async function GET(request: Request) {
  return handlePurge(request);
}

export async function POST(request: Request) {
  return handlePurge(request);
}
