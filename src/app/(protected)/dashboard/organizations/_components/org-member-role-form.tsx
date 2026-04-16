"use client";

import { useActionState } from "react";

import { updateOrganizationMemberRole } from "@/actions/organizations";
import { FormMessage } from "@/app/(protected)/dashboard/_components/form-message";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OrgMemberRoleForm({
  memberRowId,
  organizationId,
  currentRole,
}: {
  memberRowId: string;
  organizationId: string;
  currentRole: string;
}) {
  const [state, action, pending] = useActionState(updateOrganizationMemberRole, null);

  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-1">
      <input type="hidden" name="id" value={memberRowId} />
      <input type="hidden" name="organization_id" value={organizationId} />
      <select
        name="role"
        defaultValue={currentRole === "owner" ? "admin" : currentRole}
        disabled={currentRole === "owner"}
        className={cn(
          "h-8 rounded-md border border-input bg-transparent px-2 text-xs",
          currentRole === "owner" && "opacity-50"
        )}
      >
        <option value="admin">admin</option>
        <option value="member">member</option>
      </select>
      <Button type="submit" size="sm" variant="secondary" disabled={pending || currentRole === "owner"}>
        역할 저장
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
