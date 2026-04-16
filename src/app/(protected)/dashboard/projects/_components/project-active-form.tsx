"use client";

import { useActionState } from "react";

import { setProjectActive } from "@/actions/projects";
import { FormMessage } from "@/app/(protected)/dashboard/_components/form-message";
import { Button } from "@/components/ui/button";

export function ProjectActiveForm({
  projectId,
  isActive,
}: {
  projectId: string;
  isActive: boolean;
}) {
  const [state, action, pending] = useActionState(setProjectActive, null);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={projectId} />
      <input type="hidden" name="is_active" value={isActive ? "false" : "true"} />
      <FormMessage state={state} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending
          ? "…"
          : isActive
            ? "비활성화"
            : "다시 활성화"}
      </Button>
    </form>
  );
}
