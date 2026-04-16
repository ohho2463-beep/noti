"use client";

import { RemoveOrgMemberForm } from "../../organizations/_components/remove-org-member-form";
import { OrgMemberRoleForm } from "../../organizations/_components/org-member-role-form";

export function MembersOrgActionCell({
  memberRowId,
  organizationId,
  role,
  canManage,
  isSelf,
}: {
  memberRowId: string;
  organizationId: string;
  role: string;
  canManage: boolean;
  isSelf: boolean;
}) {
  const canRemoveOther = canManage && !isSelf && role !== "owner";

  return (
    <div className="flex flex-col items-end gap-2">
      {canManage && role !== "owner" ? (
        <OrgMemberRoleForm
          memberRowId={memberRowId}
          organizationId={organizationId}
          currentRole={role}
        />
      ) : null}
      {isSelf ? (
        <RemoveOrgMemberForm memberId={memberRowId} organizationId={organizationId} label="나가기" />
      ) : null}
      {canRemoveOther ? (
        <RemoveOrgMemberForm memberId={memberRowId} organizationId={organizationId} label="제거" />
      ) : null}
      {!canManage && !isSelf ? <span className="text-xs text-muted-foreground">—</span> : null}
      {canManage && !isSelf && role === "owner" ? (
        <span className="text-xs text-muted-foreground">—</span>
      ) : null}
    </div>
  );
}
