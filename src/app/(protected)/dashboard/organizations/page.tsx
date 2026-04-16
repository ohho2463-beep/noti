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
import { createClient } from "@/lib/supabase/server";

import { NewOrgForm } from "./_components/new-org-form";

export const metadata: Metadata = {
  title: "조직",
};

export default async function OrganizationsPage() {
  const supabase = await createClient();
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, description, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">조직</h1>
        <p className="text-muted-foreground">
          팀 단위로 프로젝트와 멤버를 묶을 수 있습니다.
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>새 조직</CardTitle>
            <CardDescription>만든 사람이 자동으로 소유자(owner)가 됩니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <NewOrgForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>내 조직</CardTitle>
            <CardDescription>멤버로 속한 조직이 표시됩니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {!orgs?.length ? (
              <p className="text-sm text-muted-foreground">아직 조직이 없습니다.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead className="hidden sm:table-cell">설명</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/organizations/${o.id}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {o.name}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden max-w-[200px] truncate text-muted-foreground sm:table-cell">
                        {o.description ?? "—"}
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
