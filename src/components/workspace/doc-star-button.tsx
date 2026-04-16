"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { starWorkspacePage, unstarWorkspacePage } from "@/actions/workspace-docs";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

export function DocStarButton({
  pageId,
  initialStarred,
}: {
  pageId: string;
  initialStarred: boolean;
}) {
  const router = useRouter();
  const [starred, setStarred] = React.useState(initialStarred);
  const [pending, startTransition] = React.useTransition();

  function toggle() {
    const next = !starred;
    setStarred(next);
    startTransition(async () => {
      const res = next ? await starWorkspacePage(pageId) : await unstarWorkspacePage(pageId);
      if ("error" in res && res.error) {
        setStarred(!next);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      className="gap-1.5"
      onClick={toggle}
      aria-pressed={starred}
      aria-label={starred ? "즐겨찾기 해제" : "즐겨찾기"}
    >
      <Star className={`size-4 ${starred ? "fill-amber-400 text-amber-500" : "text-muted-foreground"}`} />
      {starred ? "즐겨찾기됨" : "즐겨찾기"}
    </Button>
  );
}
