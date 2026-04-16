"use client";

import * as React from "react";

import { saveWorkspacePageContent } from "@/actions/workspace-hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type EditorBlock = {
  id: string;
  type: string;
  content: string;
  checked?: boolean;
};

function uid() {
  return `b${Math.random().toString(36).slice(2, 9)}`;
}

function defaultBlock(type: string): EditorBlock {
  if (type === "todo") {
    return { id: uid(), type, content: "", checked: false };
  }
  return { id: uid(), type, content: "" };
}

export function BlockEditor({
  pageId,
  workspaceId,
  initialBlocks,
}: {
  pageId: string;
  workspaceId: string;
  initialBlocks: EditorBlock[];
}) {
  const [blocks, setBlocks] = React.useState<EditorBlock[]>(
    initialBlocks.length ? initialBlocks : [defaultBlock("paragraph")]
  );
  const [status, setStatus] = React.useState("");
  const [lastFailedPayload, setLastFailedPayload] = React.useState<EditorBlock[] | null>(null);
  const [online, setOnline] = React.useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    function onOff() {
      setOnline(false);
      setStatus((s) => (s.includes("저장") ? s : "오프라인 — 연결 후 다시 저장하세요."));
    }
    function onOn() {
      setOnline(true);
    }
    window.addEventListener("offline", onOff);
    window.addEventListener("online", onOn);
    return () => {
      window.removeEventListener("offline", onOff);
      window.removeEventListener("online", onOn);
    };
  }, []);

  const persist = React.useCallback(
    async (next: EditorBlock[]) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setLastFailedPayload(next);
        setStatus("오프라인 — 네트워크 연결 후 '다시 저장'을 눌러 주세요.");
        return;
      }
      setStatus("저장 중…");
      const res = await saveWorkspacePageContent(pageId, workspaceId, next);
      if (res.error) {
        setLastFailedPayload(next);
        setStatus(`실패: ${res.error} — '다시 저장'으로 재시도할 수 있습니다.`);
        return;
      }
      setLastFailedPayload(null);
      setStatus("저장됨");
    },
    [pageId, workspaceId]
  );

  const scheduleSave = React.useCallback(
    (next: EditorBlock[]) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(() => {
        void persist(next);
      }, 600);
    },
    [persist]
  );

  function updateBlock(id: string, patch: Partial<EditorBlock>) {
    setBlocks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, ...patch } : b));
      scheduleSave(next);
      return next;
    });
  }

  function addBlock(type: string) {
    setBlocks((prev) => {
      const next = [...prev, defaultBlock(type)];
      scheduleSave(next);
      return next;
    });
  }

  function removeBlock(id: string) {
    setBlocks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      scheduleSave(next);
      return next;
    });
  }

  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      if (i < 0) {
        return prev;
      }
      const j = i + dir;
      if (j < 0 || j >= prev.length) {
        return prev;
      }
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      scheduleSave(next);
      return next;
    });
  }

  function insertWikiLink() {
    const title = window.prompt("링크할 페이지 제목");
    if (!title) {
      return;
    }
    setBlocks((prev) => {
      const next = [...prev, { id: uid(), type: "paragraph", content: `[[${title}]]` }];
      scheduleSave(next);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        동시에 여러 사람이 편집하면 <strong>마지막으로 저장된 내용</strong>이 남습니다.
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <Button type="button" size="sm" variant="secondary" onClick={() => addBlock("heading")}>
          제목
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => addBlock("paragraph")}>
          문단
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => addBlock("todo")}>
          할 일
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => addBlock("divider")}>
          구분선
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={insertWikiLink}>
          [[위키링크]]
        </Button>
        {lastFailedPayload ? (
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={() => void persist(lastFailedPayload)}
          >
            다시 저장
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {!online ? "오프라인 · " : null}
        {status || "변경 시 자동 저장됩니다."}
      </p>
      <div className="space-y-3 rounded-xl border bg-card p-4">
        {blocks.map((block) => (
          <div key={block.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-medium uppercase text-muted-foreground">
                {block.type}
              </span>
              <div className="flex gap-1">
                <Button type="button" size="icon" variant="ghost" className="size-7" onClick={() => moveBlock(block.id, -1)}>
                  ↑
                </Button>
                <Button type="button" size="icon" variant="ghost" className="size-7" onClick={() => moveBlock(block.id, 1)}>
                  ↓
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-destructive"
                  onClick={() => removeBlock(block.id)}
                >
                  삭제
                </Button>
              </div>
            </div>
            {block.type === "heading" ? (
              <Input
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                placeholder="제목"
              />
            ) : null}
            {block.type === "paragraph" ? (
              <textarea
                className={cn(
                  "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                )}
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                placeholder="내용"
              />
            ) : null}
            {block.type === "todo" ? (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(block.checked)}
                  onChange={(e) => updateBlock(block.id, { checked: e.target.checked })}
                />
                <Input
                  value={block.content}
                  onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                  placeholder="할 일"
                />
              </div>
            ) : null}
            {block.type === "divider" ? <div className="border-t border-border pt-2" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
