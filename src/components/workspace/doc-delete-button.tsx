"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { deleteWorkspacePage } from "@/actions/workspace-hub";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DocDeleteButton({
  pageId,
  workspaceId,
}: {
  pageId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    if (
      !window.confirm(
        "이 페이지를 휴지통으로 보낼까요? 하위 페이지도 함께 이동합니다. 30일 후 크론이 영구 삭제합니다."
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteWorkspacePage(pageId, workspaceId);
      if (!res.error) {
        router.push("/dashboard/docs");
        router.refresh();
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="text-destructive hover:bg-destructive/10"
      disabled={pending}
      onClick={onClick}
    >
      <Trash2 className="me-1 size-4" />
      삭제
    </Button>
  );
}
