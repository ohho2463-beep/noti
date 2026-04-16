import Link from "next/link";

import { HighlightMatch } from "@/components/ui/highlight-match";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SearchHitDoc = { id: string; title: string };
export type SearchHitTask = { id: string; title: string; status: string };
export type SearchHitProject = { id: string; name: string; description: string | null };
export type SearchHitOrg = { id: string; name: string; description: string | null };
export type SearchHitSchedule = { id: string; title: string; project_id: string; project_name: string | null };
export type SearchHitMember = { id: string; display_name: string | null; email: string | null };

const TABS = [
  { id: "all", label: "전체" },
  { id: "docs", label: "문서" },
  { id: "tasks", label: "태스크" },
  { id: "schedules", label: "일정" },
  { id: "projects", label: "프로젝트" },
  { id: "orgs", label: "조직" },
  { id: "members", label: "멤버" },
] as const;

export type SearchTabId = (typeof TABS)[number]["id"];

function tabHref(q: string, tab: SearchTabId) {
  const p = new URLSearchParams();
  p.set("q", q);
  if (tab !== "all") {
    p.set("tab", tab);
  }
  return `/dashboard/search?${p.toString()}`;
}

export function SearchPanel({
  q,
  tab,
  docs,
  tasks,
  projects,
  organizations,
  schedules,
  members,
}: {
  q: string;
  tab: SearchTabId;
  docs: SearchHitDoc[];
  tasks: SearchHitTask[];
  projects: SearchHitProject[];
  organizations: SearchHitOrg[];
  schedules: SearchHitSchedule[];
  members: SearchHitMember[];
}) {
  const counts = {
    docs: docs.length,
    tasks: tasks.length,
    projects: projects.length,
    orgs: organizations.length,
    schedules: schedules.length,
    members: members.length,
  };
  const total =
    counts.docs +
    counts.tasks +
    counts.projects +
    counts.orgs +
    counts.schedules +
    counts.members;

  function show(kind: SearchTabId): boolean {
    if (tab === "all") {
      return true;
    }
    return tab === kind;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const n =
            t.id === "all"
              ? total
              : t.id === "orgs"
                ? counts.orgs
                : counts[t.id as keyof typeof counts] ?? 0;
          const active = tab === t.id;
          return (
            <Link
              key={t.id}
              href={tabHref(q, t.id)}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted/60"
              )}
            >
              {t.label}
              <span className="ms-1.5 tabular-nums text-[11px] opacity-80">({n})</span>
            </Link>
          );
        })}
      </div>

      {tab === "all" && total === 0 ? (
        <p className="text-sm text-muted-foreground">«{q}»에 맞는 결과가 없습니다.</p>
      ) : null}

      {show("docs") ? (
        <Card>
          <CardHeader>
            <CardTitle>워크스페이스 문서</CardTitle>
            <CardDescription>제목 일치</CardDescription>
          </CardHeader>
          <CardContent>
            {!docs.length ? (
              <p className="text-sm text-muted-foreground">{tab === "all" ? "—" : "결과 없음"}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {docs.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/docs/${p.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <HighlightMatch text={p.title} query={q} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {show("tasks") ? (
        <Card>
          <CardHeader>
            <CardTitle>워크스페이스 태스크</CardTitle>
            <CardDescription>제목 일치</CardDescription>
          </CardHeader>
          <CardContent>
            {!tasks.length ? (
              <p className="text-sm text-muted-foreground">{tab === "all" ? "—" : "결과 없음"}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {tasks.map((tk) => (
                  <li key={tk.id}>
                    <Link href="/dashboard/tasks" className="font-medium text-primary underline-offset-4 hover:underline">
                      <HighlightMatch text={tk.title} query={q} />
                    </Link>
                    <span className="ms-2 text-xs text-muted-foreground">{tk.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {show("schedules") ? (
        <Card>
          <CardHeader>
            <CardTitle>일정</CardTitle>
            <CardDescription>프로젝트 일정 제목</CardDescription>
          </CardHeader>
          <CardContent>
            {!schedules.length ? (
              <p className="text-sm text-muted-foreground">{tab === "all" ? "—" : "결과 없음"}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {schedules.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/dashboard/projects/${s.project_id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <HighlightMatch text={s.title} query={q} />
                    </Link>
                    {s.project_name ? (
                      <span className="ms-2 text-xs text-muted-foreground">{s.project_name}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {show("projects") ? (
        <Card>
          <CardHeader>
            <CardTitle>프로젝트</CardTitle>
            <CardDescription>이름·설명</CardDescription>
          </CardHeader>
          <CardContent>
            {!projects.length ? (
              <p className="text-sm text-muted-foreground">{tab === "all" ? "—" : "결과 없음"}</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/projects/${p.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <HighlightMatch text={p.name} query={q} />
                    </Link>
                    {p.description ? (
                      <p className="mt-0.5 text-muted-foreground line-clamp-2">
                        <HighlightMatch text={p.description} query={q} />
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {show("orgs") ? (
        <Card>
          <CardHeader>
            <CardTitle>조직</CardTitle>
            <CardDescription>이름·설명</CardDescription>
          </CardHeader>
          <CardContent>
            {!organizations.length ? (
              <p className="text-sm text-muted-foreground">{tab === "all" ? "—" : "결과 없음"}</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {organizations.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/dashboard/organizations/${o.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <HighlightMatch text={o.name} query={q} />
                    </Link>
                    {o.description ? (
                      <p className="mt-0.5 text-muted-foreground line-clamp-2">
                        <HighlightMatch text={o.description} query={q} />
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {show("members") ? (
        <Card>
          <CardHeader>
            <CardTitle>멤버</CardTitle>
            <CardDescription>같은 조직·프로젝트에 속한 사람 (표시 이름·이메일)</CardDescription>
          </CardHeader>
          <CardContent>
            {!members.length ? (
              <p className="text-sm text-muted-foreground">{tab === "all" ? "—" : "결과 없음"}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {members.map((m) => (
                  <li key={m.id} className="flex flex-col gap-0.5">
                    <span className="font-medium">
                      <HighlightMatch text={m.display_name?.trim() || m.email || m.id} query={q} />
                    </span>
                    {m.email ? (
                      <span className="text-xs text-muted-foreground">
                        <HighlightMatch text={m.email} query={q} />
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
