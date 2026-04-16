"use client";

import * as React from "react";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { OperationalBanners } from "@/components/dashboard/operational-banners";
import { WorkspaceQuerySync } from "@/components/dashboard/workspace-query-sync";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { UserNotificationRow } from "@/lib/notifications/server";
import type { WorkspaceRow } from "@/lib/workspace/server-context";
import type { SessionUser } from "@/types/session";
import { Menu } from "lucide-react";

export function AppShell({
  user,
  workspace,
  workspaces,
  children,
  initialNotifications,
  showSiteAdminNav,
  showBillingNav,
  showResendMissing,
  showCronSecretMissing,
  workspaceIds,
}: {
  user: SessionUser | null;
  workspace: WorkspaceRow | null;
  workspaces: WorkspaceRow[];
  children: React.ReactNode;
  initialNotifications: UserNotificationRow[];
  showSiteAdminNav: boolean;
  showBillingNav: boolean;
  showResendMissing: boolean;
  showCronSecretMissing: boolean;
  workspaceIds: string[];
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-[100dvh] w-full max-w-full items-stretch bg-background">
      <div className="hidden md:flex md:h-[100dvh] md:shrink-0">
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          showSiteAdminNav={showSiteAdminNav}
          showBillingNav={showBillingNav}
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:h-[100dvh] md:overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 border-b px-2 py-2 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="메뉴 열기" className="touch-manipulation">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-full flex-col">
                <AppSidebar
                  collapsed={false}
                  onToggle={() => setMobileOpen(false)}
                  onNavigate={() => setMobileOpen(false)}
                  showSiteAdminNav={showSiteAdminNav}
                  showBillingNav={showBillingNav}
                />
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-semibold">Noti</span>
        </div>
        <AppHeader
          user={user}
          workspace={workspace}
          workspaces={workspaces}
          initialNotifications={initialNotifications}
        />
        <main className="relative isolate min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-4 md:p-6">
          <React.Suspense fallback={null}>
            <WorkspaceQuerySync workspaceIds={workspaceIds} />
          </React.Suspense>
          <OperationalBanners
            showResendMissing={showResendMissing}
            showCronSecretMissing={showCronSecretMissing}
          />
          {children}
        </main>
      </div>
    </div>
  );
}
