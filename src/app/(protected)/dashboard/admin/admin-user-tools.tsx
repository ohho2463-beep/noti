"use client";

import { useActionState } from "react";

import { adminCreateUserWithPassword, adminDeleteAuthUser } from "@/actions/site-admin";
import {
  Field,
  FormMessage,
} from "@/app/(protected)/dashboard/_components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ListedAuthUser } from "@/lib/site-admin/users";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AdminCreateUserForm() {
  const [state, action, pending] = useActionState(adminCreateUserWithPassword, null);
  return (
    <form action={action} className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <FormMessage state={state} />
      <p className="text-xs text-muted-foreground">
        초대 메일을 보내지 않습니다. Supabase Auth에 사용자가 바로 생성되며, 표시 이름은 선택 입력입니다.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Field label="이메일 (로그인 ID)">
          <Input
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="user@company.com"
            className="min-w-[220px]"
          />
        </Field>
        <Field label="비밀번호">
          <Input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="6자 이상"
            className="min-w-[160px]"
          />
        </Field>
        <Field label="표시 이름 (선택)">
          <Input name="display_name" type="text" placeholder="홍길동" className="min-w-[140px]" />
        </Field>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "생성 중…" : "계정 생성"}
        </Button>
      </div>
    </form>
  );
}

function DeleteUserButton({ userId, email }: { userId: string; email?: string }) {
  const [state, action, pending] = useActionState(adminDeleteAuthUser, null);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="user_id" value={userId} />
      <FormMessage state={state} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-destructive"
        disabled={pending}
        onClick={(e) => {
          if (!window.confirm(`Auth 사용자를 삭제할까요? ${email ?? userId}`)) {
            e.preventDefault();
          }
        }}
      >
        삭제
      </Button>
    </form>
  );
}

export function AdminUserTable({
  users,
  currentUserId,
  listError,
  fromProfilesOnly,
  canAuthAdmin,
}: {
  users: ListedAuthUser[];
  currentUserId: string | null;
  listError?: string;
  fromProfilesOnly?: boolean;
  /** 서비스 롤이 있어 삭제·정확한 Auth 목록이 가능한지 */
  canAuthAdmin?: boolean;
}) {
  if (listError) {
    return (
      <div className="space-y-2 text-sm text-destructive">
        <p>{listError}</p>
      </div>
    );
  }
  if (!users.length) {
    return <p className="text-sm text-muted-foreground">사용자가 없거나 목록을 불러오지 못했습니다.</p>;
  }
  return (
    <div className="space-y-2">
      {fromProfilesOnly ? (
        <p className="text-xs text-amber-600 dark:text-amber-500">
          profiles 테이블 기준 목록입니다. 삭제·정확한 Auth 동기화는{" "}
          <code className="rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY</code> 설정 후 가능합니다.
        </p>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이메일</TableHead>
            <TableHead className="hidden sm:table-cell">가입</TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-mono text-xs">{u.email ?? u.id.slice(0, 8)}</TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {new Date(u.created_at).toLocaleString("ko")}
              </TableCell>
              <TableCell className="text-right">
                {u.id === currentUserId ? (
                  <span className="text-xs text-muted-foreground">본인</span>
                ) : canAuthAdmin === false ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : (
                  <DeleteUserButton userId={u.id} email={u.email} />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
