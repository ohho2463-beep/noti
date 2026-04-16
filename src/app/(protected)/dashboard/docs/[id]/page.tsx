import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContextChatPanel } from "@/components/chat/context-chat-panel";
import { BlockEditor, type EditorBlock } from "@/components/workspace/block-editor";
import { DocDeleteButton } from "@/components/workspace/doc-delete-button";
import { DocPresenceBar } from "@/components/workspace/doc-presence-bar";
import { DocStarButton } from "@/components/workspace/doc-star-button";
import { DocTagsEditor } from "@/components/workspace/doc-tags-editor";
import { DocTitleForm } from "@/components/workspace/doc-title-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loadContextChatMessages } from "@/lib/chat/load-context-messages";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBootstrap } from "@/lib/workspace/server-context";
import { ChevronLeft } from "lucide-react";

type Props = { params: Promise<{ id: string }> };

function parseBlocks(raw: string): EditorBlock[] {
  try {
    const arr = JSON.parse(raw) as unknown[];
    if (!Array.isArray(arr)) {
      return [];
    }
    return arr.map((b, i) => {
      const o = (b ?? {}) as Record<string, unknown>;
      return {
        id: typeof o.id === "string" ? o.id : `b${i}`,
        type: typeof o.type === "string" ? o.type : "paragraph",
        content: typeof o.content === "string" ? o.content : "",
        checked: Boolean(o.checked),
      };
    });
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const wb = await getWorkspaceBootstrap();
  if (!wb.workspaceId) {
    return { title: "문서" };
  }
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("workspace_pages")
    .select("title")
    .eq("id", id)
    .eq("workspace_id", wb.workspaceId)
    .is("deleted_at", null)
    .maybeSingle();
  const title = (row as { title: string } | null)?.title;
  return { title: title ? `${title} · 문서` : "문서" };
}

export default async function DocDetailPage({ params }: Props) {
  const { id } = await params;
  const wb = await getWorkspaceBootstrap();
  if (!wb.workspaceId) {
    notFound();
  }
  const supabase = await createClient();
  const user = wb.sessionUser;

  const { data: page } = await supabase
    .from("workspace_pages")
    .select("id, title, content_json, workspace_id")
    .eq("id", id)
    .eq("workspace_id", wb.workspaceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!page) {
    notFound();
  }

  let starred = false;
  if (user?.id) {
    const { data: st } = await supabase
      .from("workspace_page_stars")
      .select("page_id")
      .eq("user_id", user.id)
      .eq("page_id", id)
      .maybeSingle();
    starred = Boolean(st);
  }

  const p = page as {
    id: string;
    title: string;
    content_json: string;
    workspace_id: string;
  };
  const blocks = parseBlocks(p.content_json);

  const pageChatMessages = await loadContextChatMessages(supabase, {
    workspaceId: p.workspace_id,
    contextType: "page",
    contextId: p.id,
    limit: 80,
  });

  const { data: revRows, error: revErr } = await supabase
    .from("workspace_page_revisions")
    .select("id, title, created_at")
    .eq("page_id", p.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const revisions = revErr
    ? []
    : ((revRows ?? []) as { id: string; title: string; created_at: string }[]);

  const { data: tagRows } = await supabase
    .from("workspace_page_tag_links")
    .select("tag")
    .eq("page_id", id)
    .order("tag");
  const docTags = ((tagRows ?? []) as { tag: string }[]).map((r) => r.tag);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Button variant="ghost" size="sm" className="-ms-2 h-8" asChild>
          <Link href="/dashboard/docs">
            <ChevronLeft className="me-1 size-4" />
            문서 목록
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <DocStarButton pageId={p.id} initialStarred={starred} />
          <DocDeleteButton pageId={p.id} workspaceId={p.workspace_id} />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
        <div className="min-w-0 space-y-6">
          {user?.id ? (
            <DocPresenceBar pageId={p.id} viewerId={user.id} viewerName={user.name} />
          ) : null}
          <DocTagsEditor pageId={p.id} workspaceId={p.workspace_id} initialTags={docTags} />
          <DocTitleForm pageId={p.id} workspaceId={p.workspace_id} initialTitle={p.title} />
          <BlockEditor pageId={p.id} workspaceId={p.workspace_id} initialBlocks={blocks} />
          {revisions.length ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">최근 저장 이력</CardTitle>
                <CardDescription>
                  저장할 때마다 직전 내용이 스냅샷으로 쌓입니다. (복원 UI는 추후 확장 가능)
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                <ul className="space-y-1">
                  {revisions.map((r) => (
                    <li key={r.id}>
                      {new Date(r.created_at).toLocaleString("ko")} — {r.title}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
        <aside>
          <ContextChatPanel
            workspaceId={p.workspace_id}
            contextType="page"
            contextId={p.id}
            title="문서 채팅"
            initialMessages={pageChatMessages}
            viewerId={user?.id ?? ""}
            className="lg:sticky lg:top-4"
          />
        </aside>
      </div>
    </div>
  );
}
