"use client";

import {
  removeProjectMember,
  updateProjectMemberRole,
} from "@/actions/project-members";
import { FormMessage } from "@/app/(protected)/dashboard/_components/form-message";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useActionState } from "react";

const ROLES = ["Admin", "Manager", "Member", "Viewer"] as const;

export function MembersProjectActionCell({
  memberRowId,
  projectId,
  role,
  canManage,
  isSelf,
}: {
  memberRowId: string;
  projectId: string;
  role: string;
  canManage: boolean;
  isSelf: boolean;
}) {
  const [roleState, roleAction, rolePending] = useActionState(updateProjectMemberRole, null);
  const [removeState, removeAction, removePending] = useActionState(removeProjectMember, null);

  const removeForm = (
    <form action={removeAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={memberRowId} />
      <input type="hidden" name="project_id" value={projectId} />
      <FormMessage state={removeState} />
      <Button type="submit" variant="ghost" size="sm" className="text-destructive" disabled={removePending}>
        {isSelf ? "나가기" : "제거"}
      </Button>
    </form>
  );

  if (!canManage && !isSelf) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (!canManage && isSelf) {
    return removeForm;
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={roleAction} className="flex flex-wrap items-end justify-end gap-1">
        <input type="hidden" name="id" value={memberRowId} />
        <input type="hidden" name="project_id" value={projectId} />
        <select
          name="role"
          defaultValue={role}
          className={cn(
            "h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm"
          )}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="secondary" disabled={rolePending}>
          역할
        </Button>
        <FormMessage state={roleState} />
      </form>
      {removeForm}
    </div>
  );
}
