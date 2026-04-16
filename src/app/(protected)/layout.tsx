import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getWorkspaceBootstrap } from "@/lib/workspace/server-context";

/**
 * Protected app shell: all routes under `app/(protected)/` use this layout.
 * Session gates live in `src/middleware.ts` (redirect to `/login` when needed).
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const wb = await getWorkspaceBootstrap();
  if (wb.isSuspended) {
    redirect("/login?suspended=1");
  }

  /** 로컬(NODE_ENV=development)에서는 배너 생략. 프로덕션·프리뷰 배포에서만 누락 시 안내 */
  const showOpsEnvHints = process.env.NODE_ENV === "production";

  return (
    <AppShell
      user={wb.sessionUser}
      workspace={wb.workspace}
      workspaces={wb.workspaces}
      initialNotifications={wb.initialNotifications}
      showSiteAdminNav={wb.isSiteAdmin}
      showBillingNav={wb.canManageWorkspace}
      showResendMissing={showOpsEnvHints && !process.env.RESEND_API_KEY}
      showCronSecretMissing={showOpsEnvHints && !process.env.CRON_SECRET}
      workspaceIds={wb.workspaces.map((w) => w.id)}
    >
      {children}
    </AppShell>
  );
}
