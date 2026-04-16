"use client";

import { useActionState } from "react";

import { createOrganization } from "@/actions/organizations";
import {
  Field,
  FormMessage,
} from "@/app/(protected)/dashboard/_components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function NewOrgForm() {
  const [state, action, pending] = useActionState(createOrganization, null);

  return (
    <form action={action} className="grid gap-4">
      <FormMessage state={state} />
      <Field label="이름">
        <Input name="name" required placeholder="조직 이름" autoComplete="organization" />
      </Field>
      <Field label="설명 (선택)">
        <textarea
          name="description"
          rows={3}
          className={cn(
            "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          )}
          placeholder="간단한 설명"
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "생성 중…" : "조직 생성"}
      </Button>
    </form>
  );
}
