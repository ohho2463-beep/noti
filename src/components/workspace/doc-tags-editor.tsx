"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { addWorkspacePageTag, removeWorkspacePageTag } from "@/actions/workspace-page-tags";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

export function DocTagsEditor({
  pageId,
  workspaceId,
  initialTags,
}: {
  pageId: string;
  workspaceId: string;
  initialTags: string[];
}) {
  const router = useRouter();
  const [tags, setTags] = React.useState(initialTags);
  const [draft, setDraft] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  function add() {
    const t = draft.trim().toLowerCase();
    if (!t) {
      return;
    }
    setMsg(null);
    setDraft("");
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t].sort()));
    startTransition(async () => {
      const res = await addWorkspacePageTag(pageId, workspaceId, t);
      if (res.error) {
        setMsg(res.error);
        setTags(initialTags);
        return;
      }
      router.refresh();
    });
  }

  function remove(tag: string) {
    setMsg(null);
    setTags((prev) => prev.filter((x) => x !== tag));
    startTransition(async () => {
      const res = await removeWorkspacePageTag(pageId, workspaceId, tag);
      if (res.error) {
        setMsg(res.error);
        setTags(initialTags);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border bg-muted/10 px-3 py-2 text-sm">
      <p className="mb-2 text-xs font-medium text-muted-foreground">태그</p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {tags.length === 0 ? (
          <span className="text-xs text-muted-foreground">태그 없음</span>
        ) : (
          tags.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1 pr-1 font-normal">
              {t}
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-background/80"
                aria-label={`${t} 제거`}
                disabled={pending}
                onClick={() => remove(t)}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="새 태그 (소문자 저장)"
          className="h-8 max-w-[200px] text-xs"
          disabled={pending}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" size="sm" variant="outline" className="h-8" disabled={pending} onClick={add}>
          추가
        </Button>
      </div>
      {msg ? <p className="mt-2 text-xs text-destructive">{msg}</p> : null}
    </div>
  );
}
