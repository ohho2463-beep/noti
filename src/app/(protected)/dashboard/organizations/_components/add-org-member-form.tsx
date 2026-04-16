"use client";

import { useActionState } from "react";

import { addOrganizationMember } from "@/actions/organizations";
import {
  Field,
  FormMessage,
} from "@/app/(protected)/dashboard/_components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AddOrgMemberForm({ organizationId }: { organizationId: string }) {
  const [state, action, pending] = useActionState(addOrganizationMember, null);

  return (
    <form action={action} className="grid gap-3 rounded-lg border p-4">
      <input type="hidden" name="organization_id" value={organizationId} />
      <p className="text-sm font-medium">멤버 초대</p>
      <FormMessage state={state} />
      <Field label="이메일 (가입한 주소)">
        <Input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="colleague@example.com"
        />
      </Field>
      <Field label="역할">
        <select
          name="role"
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          )}
        >
          <option value="member">member</option>
          <option value="admin">admin</option>
        </select>
      </Field>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "추가 중…" : "조직 멤버 추가"}
      </Button>
    </form>
  );
}
