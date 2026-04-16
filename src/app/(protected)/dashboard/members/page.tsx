import type { Metadata } from "next";

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
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBootstrap } from "@/lib/workspace/server-context";

import { MembersOrgActionCell } from "./_components/members-org-action-cell";
import { MembersProjectActionCell } from "./_components/members-project-action-cell";

export const metadata: Metadata = {
  title: "멤버",
};

export default async function MembersPage() {
  const wb = await getWorkspaceBootstrap();
  const user = wb.sessionUser;
  const supabase = await createClient();

  const { data: myOrgMemberships } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user?.id ?? "");

  const orgIds = [...new Set((myOrgMemberships ?? []).map((r) => r.organization_id))];
  const orgManageIds = new Set(
    (myOrgMemberships ?? [])
      .filter((r) => r.role === "owner" || r.role === "admin")
      .map((r) => r.organization_id as string)
  );

  const { data: orgMemberRows } =
    orgIds.length > 0
      ? await supabase
          .from("organization_members")
          .select("id, organization_id, user_id, role")
          .in("organization_id", orgIds)
      : { data: [] as { id: string; organization_id: string; user_id: string; role: string }[] };

  const { data: orgs } =
    orgIds.length > 0
      ? await supabase.from("organizations").select("id, name").in("id", orgIds)
      : { data: [] as { id: string; name: string }[] };

  const orgName = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  const { data: projectList } = await supabase.from("projects").select("id, name").order("name", {
    ascending: true,
  });

  const projectIds = (projectList ?? []).map((p) => p.id);

  const { data: myPm } =
    projectIds.length > 0
      ? await supabase
          .from("project_members")
          .select("project_id, role")
          .eq("user_id", user?.id ?? "")
          .in("project_id", projectIds)
      : { data: [] as { project_id: string; role: string }[] };

  const projectManageIds = new Set(
    (myPm ?? [])
      .filter((r) => r.role === "Admin" || r.role === "Manager")
      .map((r) => r.project_id as string)
  );

  const { data: projectMemberRows } =
    projectIds.length > 0
      ? await supabase
          .from("project_members")
          .select("id, project_id, user_id, role")
          .in("project_id", projectIds)
      : { data: [] as { id: string; project_id: string; user_id: string; role: string }[] };

  const projectName = new Map((projectList ?? []).map((p) => [p.id, p.name]));

  const allUserIds = [
    ...new Set([
      ...(orgMemberRows ?? []).map((r) => r.user_id),
      ...(projectMemberRows ?? []).map((r) => r.user_id),
    ]),
  ];

  const { data: profiles } =
    allUserIds.length > 0
      ? await supabase.from("profiles").select("id, display_name, email").in("id", allUserIds)
      : { data: [] as { id: string; display_name: string | null; email: string | null }[] };

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        label: p.display_name?.trim() || p.id.slice(0, 8),
        email: p.email?.trim() || "—",
      },
    ])
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">멤버</h1>
        <p className="text-muted-foreground">
          내가 속한 조직·프로젝트 멤버와 이메일을 봅니다. 관리 권한이 있으면 역할 변경·제거가 가능합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>조직 멤버</CardTitle>
          <CardDescription>조직 소유자·관리자는 이 목록에서 역할을 바꾸거나 멤버를 제거할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {!orgMemberRows?.length ? (
            <p className="text-sm text-muted-foreground">조직 멤버가 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>조직</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgMemberRows.map((r) => {
                  const info = profileMap.get(r.user_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {orgName.get(r.organization_id) ?? r.organization_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>{info?.label ?? r.user_id.slice(0, 8)}</TableCell>
                      <TableCell className="text-muted-foreground">{info?.email ?? "—"}</TableCell>
                      <TableCell>{r.role}</TableCell>
                      <TableCell className="text-right">
                        <MembersOrgActionCell
                          memberRowId={r.id}
                          organizationId={r.organization_id}
                          role={r.role}
                          canManage={orgManageIds.has(r.organization_id)}
                          isSelf={r.user_id === user?.id}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>프로젝트 멤버</CardTitle>
          <CardDescription>프로젝트 Admin/Manager는 역할 변경과 제거가 가능합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {!projectMemberRows?.length ? (
            <p className="text-sm text-muted-foreground">프로젝트 멤버가 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>프로젝트</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectMemberRows.map((r) => {
                  const info = profileMap.get(r.user_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {projectName.get(r.project_id) ?? r.project_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>{info?.label ?? r.user_id.slice(0, 8)}</TableCell>
                      <TableCell className="text-muted-foreground">{info?.email ?? "—"}</TableCell>
                      <TableCell>{r.role}</TableCell>
                      <TableCell className="text-right">
                        <MembersProjectActionCell
                          memberRowId={r.id}
                          projectId={r.project_id}
                          role={r.role}
                          canManage={projectManageIds.has(r.project_id)}
                          isSelf={r.user_id === user?.id}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
