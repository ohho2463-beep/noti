import { NextResponse } from "next/server";

import { fetchUserNotifications } from "@/lib/notifications/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ ok: false, unread: 0, latest: null }, { status: 401 });
  }
  const { rows, unread } = await fetchUserNotifications(supabase, user.id, 8);
  const latest = rows[0] ?? null;
  return NextResponse.json(
    {
      ok: true,
      unread,
      latest: latest
        ? {
            id: latest.id,
            title: latest.title,
            body: latest.body,
            href: latest.href,
            read_at: latest.read_at,
          }
        : null,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    }
  );
}
