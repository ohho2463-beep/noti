"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState, useTransition } from "react";

import { switchWorkspace, createWorkspace } from "@/actions/workspace-hub";
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
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Plus } from "lucide-react";

export function WorkspaceSwitcher({
  current,
  workspaces,
}: {
  current: WorkspaceRow | null;
  workspaces: WorkspaceRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createState, createAction, createPending] = useActionState(createWorkspace, null);

  React.useEffect(() => {
    if (createState && "success" in createState && createState.success) {
      router.refresh();
    }
  }, [createState, router]);

  function selectWorkspace(id: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("workspace_id", id);
      const res = await switchWorkspace(null, fd);
      if (res && "error" in res && res.error) {
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="hidden text-[10px] text-muted-foreground lg:block">
        링크 공유 시 <code className="rounded bg-muted px-0.5">?ws=워크스페이스UUID</code> 를 붙이면
        열 때 해당 스페이스로 전환됩니다.
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 max-w-[220px] justify-between gap-1 px-2 font-normal touch-manipulation"
            aria-busy={pending}
          >
            <span className="truncate">{current?.name ?? "워크스페이스"}</span>
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            스페이스 전환
          </DropdownMenuLabel>
          {workspaces.map((w) => (
            <DropdownMenuItem
              key={w.id}
              className={cn("cursor-pointer", w.id === current?.id && "bg-accent")}
              disabled={pending}
              onSelect={() => {
                if (!pending) {
                  selectWorkspace(w.id);
                }
              }}
            >
              {w.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center gap-1 text-xs">
            <Plus className="size-3" /> 새 워크스페이스
          </DropdownMenuLabel>
          <form action={createAction} className="flex gap-1 px-2 pb-2">
            <Input name="name" placeholder="이름" className="h-8 text-xs" required />
            <Button type="submit" size="sm" className="h-8 shrink-0" disabled={createPending}>
              생성
            </Button>
          </form>
          {createState?.error ? (
            <p className="px-2 pb-1 text-xs text-destructive">{createState.error}</p>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
