"use client";

import { useActionState } from "react";

import { deleteOrganization } from "@/actions/organizations";
import { FormMessage } from "@/app/(protected)/dashboard/_components/form-message";
import { Button } from "@/components/ui/button";

export function DeleteOrgForm({ organizationId }: { organizationId: string }) {
  const [state, action, pending] = useActionState(deleteOrganization, null);

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="id" value={organizationId} />
      <FormMessage state={state} />
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending ? "삭제 중…" : "조직 삭제 (소유자만)"}
      </Button>
    </form>
  );
}
