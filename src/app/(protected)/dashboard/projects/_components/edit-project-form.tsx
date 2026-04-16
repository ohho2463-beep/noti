"use client";

import { useActionState } from "react";

import { updateProject } from "@/actions/projects";
import {
  Field,
  FormMessage,
} from "@/app/(protected)/dashboard/_components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type OrgOption = { id: string; name: string };

export function EditProjectForm({
  projectId,
  defaultName,
  defaultDescription,
  defaultOrganizationId,
  organizations,
}: {
  projectId: string;
  defaultName: string;
  defaultDescription: string | null;
  defaultOrganizationId: string | null;
  organizations: OrgOption[];
}) {
  const [state, action, pending] = useActionState(updateProject, null);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={projectId} />
      <FormMessage state={state} />
      <Field label="이름">
        <Input name="name" required defaultValue={defaultName} />
      </Field>
      <Field label="설명">
        <textarea
          name="description"
          rows={2}
          defaultValue={defaultDescription ?? ""}
          className={cn(
            "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          )}
        />
      </Field>
      <Field label="조직">
        <select
          name="organization_id"
          defaultValue={defaultOrganizationId ?? ""}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          )}
        >
          <option value="">없음 (개인)</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "저장 중…" : "프로젝트 저장"}
      </Button>
    </form>
  );
}
