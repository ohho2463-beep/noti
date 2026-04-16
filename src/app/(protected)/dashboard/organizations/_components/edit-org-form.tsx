"use client";

import { useActionState } from "react";

import { updateOrganization } from "@/actions/organizations";
import {
  Field,
  FormMessage,
} from "@/app/(protected)/dashboard/_components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function EditOrgForm({
  organizationId,
  defaultName,
  defaultDescription,
}: {
  organizationId: string;
  defaultName: string;
  defaultDescription: string | null;
}) {
  const [state, action, pending] = useActionState(updateOrganization, null);

  return (
    <form action={action} className="grid max-w-lg gap-3">
      <input type="hidden" name="id" value={organizationId} />
      <FormMessage state={state} />
      <Field label="조직 이름">
        <Input name="name" required defaultValue={defaultName} />
      </Field>
      <Field label="설명">
        <textarea
          name="description"
          rows={3}
          defaultValue={defaultDescription ?? ""}
          className={cn(
            "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
          )}
        />
      </Field>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "저장 중…" : "조직 정보 저장"}
      </Button>
    </form>
  );
}
