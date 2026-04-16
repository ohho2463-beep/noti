import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyStateCta } from "@/components/dashboard/empty-state-cta";
import { createClient } from "@/lib/supabase/server";

import { NewProjectForm } from "./_components/new-project-form";

export const metadata: Metadata = {
  title: "내 프로젝트",
};

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, is_active, organization_id, created_at")
    .order("updated_at", { ascending: false });

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name")
    .order("name", { ascending: true });

  const orgName = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">내 프로젝트</h1>
        <p className="text-muted-foreground">
          접근 권한이 있는 프로젝트만 표시됩니다.
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>새 프로젝트</CardTitle>
            <CardDescription>만든 사람이 Admin 멤버로 등록됩니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <NewProjectForm organizations={orgs ?? []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>목록</CardTitle>
            <CardDescription>조직에 속한 프로젝트는 멤버에게 공유됩니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {!projects?.length ? (
              <EmptyStateCta
                title="프로젝트가 없습니다"
                description="조직에 연결하거나 독립 프로젝트를 만들고 일정·멤버를 추가해 보세요."
                primaryHref="/dashboard/calendar?view=week"
                primaryLabel="일정 캘린더 열기"
                secondaryHref="/dashboard/members"
                secondaryLabel="멤버 보기"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead className="hidden sm:table-cell">조직</TableHead>
                    <TableHead className="text-right">상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/projects/${p.id}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {p.organization_id
                          ? (orgName.get(p.organization_id) ?? "—")
                          : "개인"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {p.is_active ? (
                          <span className="text-emerald-600 dark:text-emerald-400">활성</span>
                        ) : (
                          <span className="text-muted-foreground">비활성</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
