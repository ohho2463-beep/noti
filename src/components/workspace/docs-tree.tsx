"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { createWorkspacePage } from "@/actions/workspace-hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BookOpen, ChevronRight, Plus } from "lucide-react";

export type PageRow = {
  id: string;
  parent_id: string | null;
  title: string;
  icon: string | null;
  position: number;
};

type PageNode = PageRow & { children: PageNode[] };

function buildTree(rows: PageRow[]): PageNode[] {
  const byParent = new Map<string | null, PageRow[]>();
  for (const r of rows) {
    const k = r.parent_id ?? null;
    if (!byParent.has(k)) {
      byParent.set(k, []);
    }
    byParent.get(k)!.push(r);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => a.position - b.position || a.title.localeCompare(b.title, "ko"));
  }
  function walk(parent: string | null): PageNode[] {
    return (byParent.get(parent) ?? []).map((r) => ({
      ...r,
      children: walk(r.id),
    }));
  }
  return walk(null);
}

function NewChildForm({
  workspaceId,
  parentId,
  onDone,
}: {
  workspaceId: string;
  parentId: string | null;
  onDone: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim() || "새 페이지";
    startTransition(async () => {
      const res = await createWorkspacePage({
        workspaceId,
        title: t,
        parentId,
      });
      if (res && "id" in res && res.id) {
        setTitle("");
        onDone();
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex gap-1 py-1">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={parentId ? "하위 페이지 제목" : "페이지 제목"}
        className="h-8 text-xs"
        disabled={pending}
      />
      <Button type="submit" size="sm" className="h-8 shrink-0" disabled={pending}>
        추가
      </Button>
    </form>
  );
}

function TreeItem({
  node,
  workspaceId,
  depth,
}: {
  node: PageNode;
  workspaceId: string;
  depth: number;
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);

  return (
    <li className="list-none">
      <div
        className={cn(
          "flex flex-wrap items-center gap-1 rounded-md border border-transparent px-2 py-1.5 hover:bg-muted/50"
        )}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <BookOpen className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <Link
          href={`/dashboard/docs/${node.id}`}
          className="flex min-w-0 flex-1 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <span className="shrink-0">{node.icon ?? "📄"}</span>
          <span className="truncate">{node.title}</span>
          <ChevronRight className="ms-auto size-3.5 shrink-0 opacity-40" aria-hidden />
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setAdding((v) => !v)}
        >
          <Plus className="size-3.5" />
          하위
        </Button>
      </div>
      {adding ? (
        <div style={{ paddingLeft: 8 + (depth + 1) * 14 }}>
          <NewChildForm
            workspaceId={workspaceId}
            parentId={node.id}
            onDone={() => {
              setAdding(false);
              router.refresh();
            }}
          />
        </div>
      ) : null}
      {node.children.length > 0 ? (
        <ul className="mt-0.5 space-y-0.5 border-l border-border/60">
          {node.children.map((c) => (
            <TreeItem key={c.id} node={c} workspaceId={workspaceId} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function DocsTree({ workspaceId, rows }: { workspaceId: string; rows: PageRow[] }) {
  const router = useRouter();
  const tree = React.useMemo(() => buildTree(rows), [rows]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">최상위 페이지</p>
        <NewChildForm
          workspaceId={workspaceId}
          parentId={null}
          onDone={() => router.refresh()}
        />
      </div>
      {tree.length === 0 ? (
        <p className="text-sm text-muted-foreground">아직 페이지가 없습니다. 위에서 추가하세요.</p>
      ) : (
        <ul className="space-y-1">
          {tree.map((n) => (
            <TreeItem key={n.id} node={n} workspaceId={workspaceId} depth={0} />
          ))}
        </ul>
      )}
    </div>
  );
}
