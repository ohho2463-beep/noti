"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  postContextChatMessage,
  uploadContextChatAttachment,
  type ContextChatType,
} from "@/actions/context-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { MessageCircle, Paperclip } from "lucide-react";

export type ChatMessageRow = {
  id: string;
  body: string;
  user_id: string;
  created_at: string;
  author_label: string;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_size?: number | null;
};

type Props = {
  workspaceId: string;
  contextType: ContextChatType;
  contextId: string;
  title: string;
  initialMessages: ChatMessageRow[];
  viewerId?: string;
  className?: string;
};

function ChatAttachmentInline({
  path,
  name,
  mime,
}: {
  path: string;
  name: string | null;
  mime: string | null;
}) {
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    if (!mime?.startsWith("image/")) {
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.storage.from("context-chat").createSignedUrl(path, 900);
      if (!cancelled && data?.signedUrl) {
        setThumb(data.signedUrl);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path, mime]);

  async function openFile() {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("context-chat").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mt-1 space-y-1">
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className="max-h-40 max-w-full rounded border object-contain" />
      ) : null}
      <button
        type="button"
        className="text-xs text-primary underline-offset-2 hover:underline"
        onClick={() => void openFile()}
      >
        {name?.trim() || "첨부파일"} 열기 / 다운로드
      </button>
    </div>
  );
}

async function fetchChatMessages(
  workspaceId: string,
  contextType: ContextChatType,
  contextId: string
): Promise<ChatMessageRow[]> {
  const supabase = createClient();
  const { data: rows, error } = await supabase
    .from("context_chat_messages")
    .select(
      "id, body, user_id, created_at, attachment_path, attachment_name, attachment_mime, attachment_size"
    )
    .eq("workspace_id", workspaceId)
    .eq("context_type", contextType)
    .eq("context_id", contextId)
    .order("created_at", { ascending: true })
    .limit(120);

  if (error || !rows?.length) {
    return [];
  }

  const uids = [...new Set(rows.map((r) => r.user_id as string))];
  const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", uids);
  const nameBy = new Map(
    (profs ?? []).map((p) => [
      p.id as string,
      ((p as { display_name: string | null }).display_name ?? "").trim() || "이름 없음",
    ])
  );

  return (
    rows as {
      id: string;
      body: string;
      user_id: string;
      created_at: string;
      attachment_path: string | null;
      attachment_name: string | null;
      attachment_mime: string | null;
      attachment_size: number | null;
    }[]
  ).map((r) => ({
    id: r.id,
    body: r.body,
    user_id: r.user_id,
    created_at: r.created_at,
    author_label: nameBy.get(r.user_id) ?? r.user_id.slice(0, 8) + "…",
    attachment_path: r.attachment_path,
    attachment_name: r.attachment_name,
    attachment_mime: r.attachment_mime,
    attachment_size: r.attachment_size,
  }));
}

export function ContextChatPanel({
  workspaceId,
  contextType,
  contextId,
  title,
  initialMessages,
  viewerId = "",
  className,
}: Props) {
  const [items, setItems] = useState<ChatMessageRow[]>(initialMessages);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [realtimeHint, setRealtimeHint] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [pickedName, setPickedName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const subscribedOk = useRef(false);

  useEffect(() => {
    setItems(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, [items.length]);

  useEffect(() => {
    const supabase = createClient();
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    subscribedOk.current = false;

    async function pull() {
      const next = await fetchChatMessages(workspaceId, contextType, contextId);
      if (next.length) {
        setItems(next);
      }
    }

    const channel = supabase
      .channel(`ctx-chat:${contextType}:${contextId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "context_chat_messages",
          filter: `context_id=eq.${contextId}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: string;
            body?: string;
            user_id?: string;
            created_at?: string;
            context_type?: string;
            workspace_id?: string;
            attachment_path?: string | null;
            attachment_name?: string | null;
            attachment_mime?: string | null;
            attachment_size?: number | null;
          };
          if (!row.id || !row.user_id || !row.created_at) {
            return;
          }
          if (row.context_type !== contextType || row.workspace_id !== workspaceId) {
            return;
          }
          const hasBody = row.body != null && String(row.body).trim().length > 0;
          const hasAtt = Boolean(row.attachment_path?.trim());
          if (!hasBody && !hasAtt) {
            return;
          }
          setItems((prev) => {
            if (prev.some((p) => p.id === row.id)) {
              return prev;
            }
            const author_label =
              prev.find((p) => p.user_id === row.user_id)?.author_label ??
              row.user_id!.slice(0, 8) + "…";
            return [
              ...prev,
              {
                id: row.id!,
                body: row.body ?? "",
                user_id: row.user_id!,
                created_at: row.created_at!,
                author_label,
                attachment_path: row.attachment_path,
                attachment_name: row.attachment_name,
                attachment_mime: row.attachment_mime,
                attachment_size: row.attachment_size,
              },
            ];
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          subscribedOk.current = true;
          setRealtimeHint(null);
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setRealtimeHint("실시간 연결이 불안정합니다. 주기적으로 새로 불러옵니다.");
          if (!pollTimer) {
            void pull();
            pollTimer = setInterval(() => void pull(), 12_000);
          }
        }
      });

    fallbackTimer = setTimeout(() => {
      if (!subscribedOk.current && !pollTimer) {
        setRealtimeHint("실시간 구독 지연 — 폴링으로 대체합니다.");
        void pull();
        pollTimer = setInterval(() => void pull(), 12_000);
      }
    }, 6000);

    return () => {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      void supabase.removeChannel(channel);
    };
  }, [contextId, contextType, workspaceId]);

  function clearFile() {
    setPickedName(null);
    setUploadErr(null);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  function send() {
    const body = text.trim();
    const file = fileRef.current?.files?.[0];
    if ((!body && !file) || pending) {
      return;
    }
    setUploadErr(null);
    const prevText = text;
    setText("");
    startTransition(async () => {
      let attachmentPath: string | undefined;
      let attachmentName: string | undefined;
      let attachmentMime: string | undefined;
      let attachmentSize: number | undefined;

      if (file) {
        const fd = new FormData();
        fd.set("workspace_id", workspaceId);
        fd.set("context_type", contextType);
        fd.set("context_id", contextId);
        fd.set("file", file);
        const up = await uploadContextChatAttachment(fd);
        if (up.error) {
          setUploadErr(up.error);
          setText(prevText);
          return;
        }
        attachmentPath = up.path;
        attachmentName = up.fileName;
        attachmentMime = up.mime;
        attachmentSize = up.size;
        clearFile();
      }

      const res = await postContextChatMessage({
        workspaceId,
        contextType,
        contextId,
        body,
        attachmentPath,
        attachmentName,
        attachmentMime,
        attachmentSize,
      });
      if (res.error) {
        setText(prevText);
        setUploadErr(res.error);
        return;
      }
      void fetchChatMessages(workspaceId, contextType, contextId).then(setItems);
    });
  }

  const canSend = (Boolean(text.trim()) || Boolean(pickedName)) && !pending;

  return (
    <div
      className={cn(
        "flex max-h-[min(70vh,520px)] flex-col rounded-lg border bg-card shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <MessageCircle className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      {realtimeHint ? (
        <p className="border-b bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground">{realtimeHint}</p>
      ) : null}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-3 text-sm overscroll-contain"
      >
        {items.length === 0 ? (
          <p className="text-muted-foreground">아직 메시지가 없습니다.</p>
        ) : (
          items.map((m, i) => {
            const prev = i > 0 ? items[i - 1] : null;
            const dayKey = new Date(m.created_at).toLocaleDateString("ko", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
            const prevDay = prev
              ? new Date(prev.created_at).toLocaleDateString("ko", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : null;
            const showDay = dayKey !== prevDay;
            const authorHref =
              viewerId && m.user_id === viewerId ? "/dashboard/settings" : "/dashboard/members";
            const attPath = m.attachment_path?.trim();

            return (
              <div key={m.id} className="space-y-1">
                {showDay ? (
                  <div className="flex items-center gap-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    {dayKey}
                    <span className="h-px flex-1 bg-border" />
                  </div>
                ) : null}
                <div className="rounded-md bg-muted/40 px-2 py-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-1 text-xs text-muted-foreground">
                    {viewerId ? (
                      <Link
                        href={authorHref}
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {m.author_label}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{m.author_label}</span>
                    )}
                    <time dateTime={m.created_at}>
                      {new Date(m.created_at).toLocaleString("ko", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  {m.body.trim() ? (
                    <p className="mt-0.5 whitespace-pre-wrap break-words">{m.body}</p>
                  ) : null}
                  {attPath ? (
                    <ChatAttachmentInline
                      path={attPath}
                      name={m.attachment_name ?? null}
                      mime={m.attachment_mime ?? null}
                    />
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
      {uploadErr ? (
        <p className="border-t px-3 py-1 text-xs text-destructive" role="alert">
          {uploadErr}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 border-t p-2">
        {pickedName ? (
          <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2 py-1 text-xs">
            <span className="truncate">{pickedName}</span>
            <Button type="button" size="sm" variant="ghost" className="h-7 shrink-0" onClick={clearFile}>
              제거
            </Button>
          </div>
        ) : null}
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setUploadErr(null);
              setPickedName(f ? f.name : null);
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="shrink-0"
            aria-label="파일 첨부"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="size-4" />
          </Button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="메시지를 입력하세요. 파일만 보내도 됩니다."
            maxLength={4000}
            disabled={pending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="text-sm"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => void fetchChatMessages(workspaceId, contextType, contextId).then(setItems)}
          >
            새로고침
          </Button>
          <Button type="button" size="sm" className="shrink-0" disabled={!canSend} onClick={send}>
            전송
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          이미지·PDF·텍스트, 최대 5MB. 비공개 버킷이며 스레드 멤버만 열람 가능합니다.
        </p>
      </div>
    </div>
  );
}
