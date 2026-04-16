import type { Metadata } from "next";
import Link from "next/link";

import { TrashDocRestoreButton } from "@/components/workspace/trash-doc-restore-button";
import { WorkspaceStatusPanel } from "@/components/workspace/workspace-status-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBootstrap } from "@/lib/workspace/server-context";

export const metadata: Metadata = {
  title: "문서 휴지통",
};

export default async function DocsTrashPage() {
  const wb = await getWorkspaceBootstrap();
  const supabase = await createClient();

  if (!wb.workspaceId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">휴지통</h1>
        <WorkspaceStatusPanel wb={wb} />
      </div>
    );
  }

  const { data: rows, error } = await supabase
    .from("workspace_pages")
    .select("id, title, deleted_at")
    .eq("workspace_id", wb.workspaceId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (
    error &&
    (error.message?.toLowerCase().includes("deleted_at") || error.code === "42703")
  ) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">문서 휴지통</h1>
        <p className="text-sm text-muted-foreground">
          <code className="text-xs">workspace_pages.deleted_at</code> 컬럼이 없습니다. Supabase에{" "}
          <code className="text-xs">20260410120000_noti_ops_enhancements.sql</code> 마이그레이션을
          적용하세요.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">문서 휴지통</h1>
        <p className="text-sm text-destructive">{error.message}</p>
      </div>
    );
  }

  const pages = (rows ?? []) as { id: string; title: string; deleted_at: string }[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">문서 휴지통</h1>
          <p className="text-muted-foreground">
            삭제 후 30일이 지나면 크론이 영구 삭제합니다. 복원하면 트리에 다시 나타납니다.
          </p>
        </div>
        <ButtonLink />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">삭제된 페이지</CardTitle>
          <CardDescription>워크스페이스 «{wb.workspace?.name ?? ""}»</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!pages.length ? (
            <p className="text-sm text-muted-foreground">휴지통이 비어 있습니다.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {pages.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      삭제: {new Date(p.deleted_at).toLocaleString("ko")}
                    </p>
                  </div>
                  <TrashDocRestoreButton pageId={p.id} workspaceId={wb.workspaceId!} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ButtonLink() {
  return (
    <Link
      href="/dashboard/docs"
      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      문서 목록
    </Link>
  );
}
