"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Gauge,
  LineChart,
  CalendarDays,
  CreditCard,
  FileText,
  FolderKanban,
  Bot,
  LayoutDashboard,
  Layers,
  LayoutGrid,
  BellRing,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { label: string; items: readonly NavItem[] };

const BASE_GROUPS: readonly NavGroup[] = [
  {
    label: "업무",
    items: [
      { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
      { href: "/dashboard/projects", label: "프로젝트", icon: FolderKanban },
      { href: "/dashboard/tasks", label: "태스크 · 칸반", icon: LayoutGrid },
      { href: "/dashboard/calendar", label: "캘린더", icon: CalendarDays },
      { href: "/dashboard/automation", label: "자동화 룰", icon: Bot },
      { href: "/dashboard/notifications", label: "알림 센터", icon: BellRing },
      { href: "/dashboard/ops", label: "운영 센터", icon: Gauge },
      { href: "/dashboard/executive", label: "Executive View", icon: LineChart },
    ],
  },
  {
    label: "문서 · 팀",
    items: [
      { href: "/dashboard/docs", label: "문서 · 위키", icon: FileText },
      { href: "/dashboard/team/availability", label: "팀 스케줄", icon: Layers },
      { href: "/dashboard/team", label: "워크스페이스 팀", icon: UserPlus },
      { href: "/dashboard/organizations", label: "조직", icon: Building2 },
      { href: "/dashboard/members", label: "멤버", icon: Users },
    ],
  },
] as const;

type AppSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  showSiteAdminNav?: boolean;
  showBillingNav?: boolean;
};

export const AppSidebar = React.memo(function AppSidebar({
  collapsed,
  onToggle,
  onNavigate,
  showSiteAdminNav = false,
  showBillingNav = false,
}: AppSidebarProps) {
  const pathname = usePathname();
  const navGroups = React.useMemo(() => {
    const ops: NavItem[] = [];
    if (showSiteAdminNav) {
      ops.push({ href: "/dashboard/admin", label: "사이트 운영", icon: Shield });
    }
    if (showBillingNav) {
      ops.push({ href: "/dashboard/billing", label: "결제", icon: CreditCard });
    }
    ops.push({ href: "/dashboard/settings", label: "설정", icon: Settings });
    return [...BASE_GROUPS, { label: "운영 · 계정", items: ops }] as const;
  }, [showSiteAdminNav, showBillingNav]);

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,background-color] duration-300 ease-out",
        collapsed ? "w-[4.25rem]" : "w-60"
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-1 border-b border-sidebar-border px-2",
          collapsed
            ? "min-h-[3.5rem] flex-col justify-center gap-2 py-2"
            : "h-14 justify-between"
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex min-h-10 min-w-0 items-center gap-2 rounded-md font-semibold tracking-tight transition-colors hover:bg-sidebar-accent/50 touch-manipulation",
            collapsed ? "justify-center p-1" : "flex-1 px-2 py-1.5"
          )}
          title="NOTI"
          onClick={() => onNavigate?.()}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Layers className="size-4" aria-hidden />
          </span>
          {!collapsed && <span className="truncate">NOTI</span>}
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 touch-manipulation"
          onClick={onToggle}
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        >
          {collapsed ? (
            <PanelLeft className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      </div>
      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto p-2">
        {navGroups.map((group, gi) => (
          <div
            key={group.label}
            className={cn("space-y-0.5", gi > 0 && collapsed && "mt-1 border-t border-sidebar-border pt-2")}
          >
            {!collapsed && (
              <p
                className={cn(
                  "px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90",
                  gi > 0 && "pt-2"
                )}
              >
                {group.label}
              </p>
            )}
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  onClick={() => onNavigate?.()}
                  className={cn(
                    "flex min-h-10 w-full items-center gap-3 rounded-md px-2 py-2 text-sm transition-all duration-200 touch-manipulation",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground/80 hover:translate-x-0.5 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
                  {!collapsed && <span className="min-w-0 truncate">{label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <Separator className="bg-sidebar-border" />
      <div className="p-2 text-center text-[10px] text-muted-foreground">
        {!collapsed && <span>NOTI · workspace</span>}
      </div>
    </aside>
  );
});
