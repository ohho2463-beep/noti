"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Search, UserRound } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { DashboardLangToggle } from "@/components/dashboard/dashboard-lang-toggle";
import { ModeToggle } from "@/components/mode-toggle";
import type { UserNotificationRow } from "@/lib/notifications/server";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { WorkspaceRow } from "@/lib/workspace/server-context";
import type { SessionUser } from "@/types/session";

const NotificationBell = dynamic(
  () => import("@/components/dashboard/notification-bell").then((m) => m.NotificationBell),
  {
    ssr: false,
    loading: () => <Button variant="ghost" size="icon" className="h-9 w-9" aria-hidden />,
  }
);

const WorkspaceSwitcher = dynamic(
  () => import("@/components/workspace/workspace-switcher").then((m) => m.WorkspaceSwitcher),
  {
    ssr: false,
    loading: () => <div className="h-8 w-[160px] rounded-md border bg-muted/30" aria-hidden />,
  }
);

type AppHeaderProps = {
  user: SessionUser | null;
  workspace: WorkspaceRow | null;
  workspaces: WorkspaceRow[];
  initialNotifications: UserNotificationRow[];
};

export const AppHeader = React.memo(function AppHeader({
  user,
  workspace,
  workspaces,
  initialNotifications,
}: AppHeaderProps) {
  const router = useRouter();
  const searchRef = React.useRef<HTMLInputElement>(null);
  const label = user?.name ?? user?.email ?? "게스트";
  const initial = label.charAt(0).toUpperCase();

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") {
        return;
      }
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* 환경 변수 누락 등 */
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur transition-colors duration-300 supports-[backdrop-filter]:bg-background/80">
      {workspace ? (
        <WorkspaceSwitcher current={workspace} workspaces={workspaces} />
      ) : null}
      <form
        action="/dashboard/search"
        method="get"
        className="relative flex flex-1 items-center"
        role="search"
      >
        <Search
          className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
          aria-hidden
        />
        <Input
          ref={searchRef}
          id="global-dashboard-search"
          name="q"
          className="h-9 max-w-md bg-muted/40 pl-9 transition-all duration-200 focus-visible:bg-background focus-visible:shadow-sm"
          placeholder="검색… (⌘K)"
          type="search"
          aria-label="검색"
          title="⌘K 또는 Ctrl+K로 포커스"
        />
      </form>
      <div className="flex items-center gap-1 sm:gap-2">
        {user ? <NotificationBell initial={initialNotifications} /> : null}
        <DashboardLangToggle />
        <ModeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 gap-2 px-2 transition-all duration-200 hover:bg-muted/70">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[140px] truncate text-sm font-medium sm:inline">
                {label}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">계정</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email ?? "로그인되지 않음"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <UserRound className="mr-2 size-4" />
                설정 · 프로필
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 size-4" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
});
