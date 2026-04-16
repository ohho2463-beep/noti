"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { createAnnouncement } from "@/actions/workspace-hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AnnouncementForm() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const title = (fd.get("title") as string)?.trim();
    const body = (fd.get("body") as string)?.trim();
    const isPublished = fd.get("published") === "on";
    const isPinned = fd.get("pinned") === "on";
    if (!title || !body) {
      setMessage("제목과 본문을 입력하세요.");
      return;
    }
    startTransition(async () => {
      const res = await createAnnouncement({
        title,
        body,
        isPublished,
        isPinned,
      });
      if (res.error) {
        setMessage(res.error);
        return;
      }
      e.currentTarget.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border bg-card p-4">
      <p className="text-sm font-medium">새 공지</p>
      <div className="space-y-1">
        <Label htmlFor="ann-title">제목</Label>
        <Input id="ann-title" name="title" required disabled={pending} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ann-body">본문</Label>
        <textarea
          id="ann-body"
          name="body"
          required
          disabled={pending}
          className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="published" defaultChecked className="rounded border" />
          게시
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="pinned" className="rounded border" />
          상단 고정
        </label>
      </div>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        등록
      </Button>
    </form>
  );
}
