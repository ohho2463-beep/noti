import { NextResponse } from "next/server";

import { fetchUserNotifications } from "@/lib/notifications/server";
import { createClient } from "@/lib/supabase/server";
import { loadDashboardSnapshot } from "@/lib/dashboard/snapshot";
import { getWorkspaceBootstrap } from "@/lib/workspace/server-context";

export async function GET() {
  try {
    const wb = await getWorkspaceBootstrap();
    if (!wb.sessionUser?.id || !wb.workspaceId) {
      return NextResponse.json({ snapshot: null }, { status: 200 });
    }

    const supabase = await createClient();
    const notifications = await fetchUserNotifications(supabase, wb.sessionUser.id, 30);
    const snapshot = await loadDashboardSnapshot(supabase, {
      workspaceId: wb.workspaceId,
      displayTimezone: wb.workspace?.display_timezone,
      notifications: notifications.rows,
      userId: wb.sessionUser.id,
    });

    return NextResponse.json(
      { snapshot, refreshedAt: new Date().toISOString() },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ snapshot: null }, { status: 500 });
  }
}
