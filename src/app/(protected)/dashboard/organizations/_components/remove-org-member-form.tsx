"use client";

import { useActionState } from "react";

import { removeOrganizationMember } from "@/actions/organizations";
import { FormMessage } from "@/app/(protected)/dashboard/_components/form-message";
import { Button } from "@/components/ui/button";

export function RemoveOrgMemberForm({
  memberId,
  organizationId,
  label,
}: {
  memberId: string;
  organizationId: string;
  label: string;
}) {
  const [state, action, pending] = useActionState(removeOrganizationMember, null);

  return (
    <form action={action} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={memberId} />
      <input type="hidden" name="organization_id" value={organizationId} />
      <FormMessage state={state} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending} className="text-destructive">
        {label}
      </Button>
    </form>
  );
}
