"use client";

import * as React from "react";

import { updateWorkspacePageTitle } from "@/actions/workspace-hub";
import { Input } from "@/components/ui/input";

export function DocTitleForm({
  pageId,
  workspaceId,
  initialTitle,
}: {
  pageId: string;
  workspaceId: string;
  initialTitle: string;
}) {
  const [title, setTitle] = React.useState(initialTitle);
  const [status, setStatus] = React.useState("");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  function scheduleSave(next: string) {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(async () => {
      setStatus("저장 중…");
      const res = await updateWorkspacePageTitle(pageId, workspaceId, next);
      setStatus(res.error ? `실패: ${res.error}` : "제목 저장됨");
    }, 500);
  }

  return (
    <div className="space-y-1">
      <Input
        value={title}
        onChange={(e) => {
          const v = e.target.value;
          setTitle(v);
          scheduleSave(v);
        }}
        className="max-w-xl text-xl font-semibold"
        aria-label="페이지 제목"
      />
      {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
    </div>
  );
}
