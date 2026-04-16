"use client";

import { useActionState } from "react";

import { addProjectMember } from "@/actions/project-members";
import {
  Field,
  FormMessage,
} from "@/app/(protected)/dashboard/_components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ROLES = ["Admin", "Manager", "Member", "Viewer"] as const;

export function AddProjectMemberForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(addProjectMember, null);

  return (
    <form action={action} className="grid gap-3 rounded-lg border p-4">
      <input type="hidden" name="project_id" value={projectId} />
      <p className="text-sm font-medium">멤버 초대</p>
      <FormMessage state={state} />
      <Field label="이메일">
        <Input name="email" type="email" required placeholder="teammate@example.com" />
      </Field>
      <Field label="역할">
        <select
          name="role"
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          )}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Field>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "추가 중…" : "프로젝트 멤버 추가"}
      </Button>
    </form>
  );
}
