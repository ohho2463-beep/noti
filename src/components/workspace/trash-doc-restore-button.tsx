"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { restoreWorkspacePage } from "@/actions/workspace-hub";
import { Button } from "@/components/ui/button";

export function TrashDocRestoreButton({
  pageId,
  workspaceId,
}: {
  pageId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const res = await restoreWorkspacePage(pageId, workspaceId);
          if (!res.error) {
            router.push(`/dashboard/docs/${pageId}`);
            router.refresh();
          }
        });
      }}
    >
      {pending ? "복원 중…" : "문서 복원"}
    </Button>
  );
}
