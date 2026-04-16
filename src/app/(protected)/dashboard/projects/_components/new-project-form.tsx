"use client";

import { useActionState } from "react";

import { createProject } from "@/actions/projects";
import {
  Field,
  FormMessage,
} from "@/app/(protected)/dashboard/_components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type OrgOption = { id: string; name: string };

export function NewProjectForm({ organizations }: { organizations: OrgOption[] }) {
  const [state, action, pending] = useActionState(createProject, null);

  return (
    <form action={action} className="grid gap-4">
      <FormMessage state={state} />
      <Field label="이름">
        <Input name="name" required placeholder="프로젝트 이름" />
      </Field>
      <Field label="설명 (선택)">
        <textarea
          name="description"
          rows={3}
          className={cn(
            "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          )}
        />
      </Field>
      <Field label="조직 (선택)">
        <select
          name="organization_id"
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
      <Button type="submit" disabled={pending}>
        {pending ? "생성 중…" : "프로젝트 생성"}
      </Button>
    </form>
  );
}
