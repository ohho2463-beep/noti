import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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

import { AddOrgMemberForm } from "../_components/add-org-member-form";
import { DeleteOrgForm } from "../_components/delete-org-form";
import { EditOrgForm } from "../_components/edit-org-form";
import { OrgMemberRoleForm } from "../_components/org-member-role-form";
import { RemoveOrgMemberForm } from "../_components/remove-org-member-form";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  return { title: org?.name ? `${org.name} · 조직` : "조직" };
}

export default async function OrganizationDetailPage({ params }: Props) {
  const { id } = await params;
  const wb = await getWorkspaceBootstrap();
  const user = wb.sessionUser;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, description, created_by")
    .eq("id", id)
    .maybeSingle();

  if (!org) {
    notFound();
  }

  const { data: members } = await supabase
    .from("organization_members")
    .select("id, user_id, role, created_at")
    .eq("organization_id", id)
    .order("created_at", { ascending: true });

  const userIds = [...new Set((members ?? []).map((m) => m.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
    : { data: [] as { id: string; display_name: string | null }[] };

  const nameByUser = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name?.trim() || p.id.slice(0, 8)])
  );

  const myRow = (members ?? []).find((m) => m.user_id === user?.id);
  const canManage = myRow?.role === "owner" || myRow?.role === "admin";
  const isOwner = myRow?.role === "owner";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/dashboard/organizations" className="hover:underline">
              조직
            </Link>
            <span className="mx-1">/</span>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{org.name}</h1>
          <p className="text-muted-foreground">{org.description ?? "설명 없음"}</p>
        </div>
        {isOwner ? (
          <DeleteOrgForm organizationId={org.id} />
        ) : null}
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>조직 수정</CardTitle>
            <CardDescription>이름과 설명을 변경합니다. (소유자·관리자)</CardDescription>
          </CardHeader>
          <CardContent>
            <EditOrgForm
              organizationId={org.id}
              defaultName={org.name}
              defaultDescription={org.description}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>멤버</CardTitle>
            <CardDescription>같은 조직 소속의 프로필 이름이 표시됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(members ?? []).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {nameByUser.get(m.user_id) ?? m.user_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{m.role}</TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const isSelf = m.user_id === user?.id;
                        const canRemoveOther =
                          canManage && !isSelf && m.role !== "owner";
                        return (
                          <div className="flex flex-col items-end gap-2">
                            {canManage && m.role !== "owner" ? (
                              <OrgMemberRoleForm
                                memberRowId={m.id}
                                organizationId={id}
                                currentRole={m.role}
                              />
                            ) : null}
                            {isSelf ? (
                              <RemoveOrgMemberForm
                                memberId={m.id}
                                organizationId={id}
                                label="나가기"
                              />
                            ) : null}
                            {canRemoveOther ? (
                              <RemoveOrgMemberForm
                                memberId={m.id}
                                organizationId={id}
                                label="제거"
                              />
                            ) : null}
                            {!isSelf && !canRemoveOther && !canManage ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : null}
                          </div>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {canManage ? (
          <AddOrgMemberForm organizationId={id} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>멤버 초대</CardTitle>
              <CardDescription>조직 관리자만 이메일로 멤버를 추가할 수 있습니다.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
