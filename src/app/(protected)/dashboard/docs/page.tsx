import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { DocsTree } from "@/components/workspace/docs-tree";
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
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "문서 · 위키",
};

type PageProps = { searchParams: Promise<{ tag?: string }> };

export default async function DocsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tagFilter = (sp.tag ?? "").trim().toLowerCase().slice(0, 64);
  const wb = await getWorkspaceBootstrap();
  const supabase = await createClient();

  if (!wb.workspaceId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">문서 · 위키</h1>
        <WorkspaceStatusPanel wb={wb} />
      </div>
    );
  }

  const { data: rows } = await supabase
    .from("workspace_pages")
    .select("id, parent_id, title, icon, position")
    .eq("workspace_id", wb.workspaceId)
    .is("deleted_at", null)
    .order("position");

  const uid = wb.sessionUser?.id ?? "";

  const { data: recentRows } = await supabase
    .from("workspace_pages")
    .select("id, title, updated_at")
    .eq("workspace_id", wb.workspaceId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(6);

  let starredLinks: { id: string; title: string }[] = [];
  if (uid) {
    const { data: starRows } = await supabase
      .from("workspace_page_stars")
      .select("page_id")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(8);
    const sids = (starRows ?? []).map((s) => s.page_id as string);
    if (sids.length > 0) {
      const { data: sp } = await supabase
        .from("workspace_pages")
        .select("id, title")
        .in("id", sids)
        .is("deleted_at", null);
      const order = new Map(sids.map((id, i) => [id, i]));
      starredLinks = (sp ?? [])
        .map((r) => ({ id: r.id as string, title: r.title as string }))
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }
  }

  const pages = (rows ?? []) as {
    id: string;
    parent_id: string | null;
    title: string;
    icon: string | null;
    position: number;
  }[];

  const pageIds = pages.map((p) => p.id);
  const { data: allLinks } =
    pageIds.length > 0
      ? await supabase.from("workspace_page_tag_links").select("tag, page_id").in("page_id", pageIds)
      : { data: [] as { tag: string; page_id: string }[] };

  const allTags = [...new Set((allLinks ?? []).map((l) => l.tag as string))].sort();

  let displayPages = pages;
  if (tagFilter) {
    const matched = new Set(
      (allLinks ?? []).filter((l) => (l.tag as string) === tagFilter).map((l) => l.page_id as string)
    );
    if (matched.size === 0) {
      displayPages = [];
    } else {
      const idToParent = new Map<string, string | null>(pages.map((p) => [p.id, p.parent_id]));
      const keep = new Set<string>(matched);
      for (const id of matched) {
        let cur: string | null = id;
        while (cur) {
          const par: string | null = idToParent.get(cur) ?? null;
          if (!par) {
            break;
          }
          keep.add(par);
          cur = par;
        }
      }
      displayPages = pages.filter((p) => keep.has(p.id));
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">문서 · 위키</h1>
          <p className="text-muted-foreground">
            중첩 페이지와 블록 에디터가 현재 워크스페이스에 연결되어 있습니다.
          </p>
        </div>
        <Link
          href="/dashboard/docs/trash"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          휴지통 (30일 후 영구 삭제)
        </Link>
      </div>

      {allTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/10 px-3 py-2 text-sm">
          <span className="text-xs font-medium text-muted-foreground">태그</span>
          <Link
            href="/dashboard/docs"
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
              !tagFilter ? "border-primary bg-primary/15 text-foreground" : "border-transparent hover:bg-muted"
            )}
          >
            전체
          </Link>
          {allTags.map((t) => (
            <Link
              key={t}
              href={`/dashboard/docs?tag=${encodeURIComponent(t)}`}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                tagFilter === t ? "border-primary bg-primary/15 text-foreground" : "border-transparent hover:bg-muted"
              )}
            >
              {t}
            </Link>
          ))}
        </div>
      ) : null}

      {tagFilter && displayPages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          «{tagFilter}» 태그가 붙은 문서가 없습니다.{" "}
          <Link href="/dashboard/docs" className="text-primary underline-offset-4 hover:underline">
            필터 해제
          </Link>
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">문서 트리</CardTitle>
            <CardDescription>페이지를 열거나 하위 페이지를 추가할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <DocsTree workspaceId={wb.workspaceId} rows={displayPages} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">최근 수정</CardTitle>
              <CardDescription>빠르게 다시 열기</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!(recentRows ?? []).length ? (
                <p className="text-muted-foreground">아직 문서가 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {(recentRows ?? []).map((r) => (
                    <li key={r.id as string}>
                      <Link
                        href={`/dashboard/docs/${r.id as string}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {r.title as string}
                      </Link>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(r.updated_at as string).toLocaleString("ko")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">즐겨찾기</CardTitle>
              <CardDescription>문서 상단의 별로 추가합니다.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              {!starredLinks.length ? (
                <p className="text-muted-foreground">즐겨찾기한 페이지가 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {starredLinks.map((r) => (
                    <li key={r.id}>
                      <Link href={`/dashboard/docs/${r.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                        {r.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search className="size-5 text-muted-foreground" aria-hidden />
                <CardTitle className="text-base">검색</CardTitle>
              </div>
              <CardDescription>문서 제목·태스크는 통합 검색에서 찾을 수 있습니다.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              상단 검색창에 키워드를 입력한 뒤 통합 검색 결과에서 문서로 이동하세요.
              <Link
                href="/dashboard/search"
                className="mt-2 inline-block font-medium text-primary underline-offset-4 hover:underline"
              >
                통합 검색으로 이동
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
