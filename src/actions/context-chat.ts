"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ContextChatState = { error?: string; success?: boolean };

const CONTEXT_TYPES = ["workspace", "project", "schedule", "page"] as const;
export type ContextChatType = (typeof CONTEXT_TYPES)[number];

function isContextType(s: string): s is ContextChatType {
  return (CONTEXT_TYPES as readonly string[]).includes(s);
}

const CHAT_ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
]);

const MAX_CHAT_BYTES = 5 * 1024 * 1024;

function safeChatBasename(name: string): string {
  const t = name
    .replace(/[/\\]/g, "_")
    .replace(/[^\w.\s\-가-힣]/g, "_")
    .trim();
  return (t || "file").slice(0, 120);
}

function matchesStoredPath(
  path: string,
  workspaceId: string,
  contextType: ContextChatType,
  contextId: string
): boolean {
  const p = path.trim();
  const parts = p.split("/").filter(Boolean);
  if (parts.length < 4) {
    return false;
  }
  if (parts[0] !== workspaceId || parts[1] !== contextType || parts[2] !== contextId) {
    return false;
  }
  return !parts.some((s) => s.includes(".."));
}

export async function uploadContextChatAttachment(formData: FormData): Promise<{
  error?: string;
  path?: string;
  fileName?: string;
  mime?: string;
  size?: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const workspaceId = (formData.get("workspace_id") as string)?.trim();
  const contextType = formData.get("context_type") as string;
  const contextId = (formData.get("context_id") as string)?.trim();
  const file = formData.get("file");

  if (!workspaceId || !contextId || !isContextType(contextType)) {
    return { error: "잘못된 요청입니다." };
  }

  if (!(file instanceof File) || file.size < 1) {
    return { error: "파일을 선택하세요." };
  }

  if (file.size > MAX_CHAT_BYTES) {
    return { error: "파일은 5MB 이하여야 합니다." };
  }

  const mime = file.type || "application/octet-stream";
  if (!CHAT_ALLOWED_MIMES.has(mime)) {
    return { error: "허용되지 않는 파일 형식입니다. (이미지, PDF, 텍스트)" };
  }

  const path = `${workspaceId}/${contextType}/${contextId}/${randomUUID()}_${safeChatBasename(file.name)}`;

  const { error } = await supabase.storage.from("context-chat").upload(path, file, {
    contentType: mime,
    upsert: false,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    path,
    fileName: file.name.slice(0, 255),
    mime,
    size: file.size,
  };
}

export async function postContextChatMessage(input: {
  workspaceId: string;
  contextType: ContextChatType;
  contextId: string;
  body: string;
  attachmentPath?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  attachmentSize?: number | null;
}): Promise<ContextChatState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const bodyTrimmed = input.body.trim();
  const attPath = input.attachmentPath?.trim() ?? "";
  const hasAtt = Boolean(attPath);

  if (!hasAtt && !bodyTrimmed) {
    return { error: "메시지 또는 파일을 입력하세요." };
  }
  if (bodyTrimmed.length > 4000) {
    return { error: "메시지가 너무 깁니다." };
  }
  if (!isContextType(input.contextType)) {
    return { error: "잘못된 컨텍스트입니다." };
  }

  if (hasAtt) {
    if (!input.attachmentName?.trim()) {
      return { error: "첨부 메타데이터가 올바르지 않습니다." };
    }
    if (
      input.attachmentSize == null ||
      input.attachmentSize < 1 ||
      input.attachmentSize > MAX_CHAT_BYTES
    ) {
      return { error: "첨부 크기가 올바르지 않습니다." };
    }
    if (!input.attachmentMime || !CHAT_ALLOWED_MIMES.has(input.attachmentMime)) {
      return { error: "첨부 형식이 올바르지 않습니다." };
    }
    if (!matchesStoredPath(attPath, input.workspaceId, input.contextType, input.contextId)) {
      return { error: "첨부 경로가 이 스레드와 일치하지 않습니다." };
    }
  }

  const { data: lastRow } = await supabase
    .from("context_chat_messages")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastAt = lastRow
    ? new Date((lastRow as { created_at: string }).created_at).getTime()
    : 0;
  if (lastAt && Date.now() - lastAt < 2000) {
    return { error: "메시지를 너무 자주 보냈습니다. 잠시 후 다시 시도하세요." };
  }

  const row: Record<string, unknown> = {
    workspace_id: input.workspaceId,
    context_type: input.contextType,
    context_id: input.contextId,
    user_id: user.id,
    body: bodyTrimmed,
  };

  if (hasAtt) {
    row.attachment_path = attPath;
    row.attachment_name = input.attachmentName!.trim().slice(0, 500);
    row.attachment_mime = input.attachmentMime!;
    row.attachment_size = input.attachmentSize!;
  }

  const { error } = await supabase.from("context_chat_messages").insert(row);

  if (error) {
    return { error: error.message };
  }

  if (input.contextType === "project") {
    revalidatePath(`/dashboard/projects/${input.contextId}`);
  } else if (input.contextType === "page") {
    revalidatePath(`/dashboard/docs/${input.contextId}`);
  } else if (input.contextType === "workspace") {
    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard/team/availability");
  } else if (input.contextType === "schedule") {
    revalidatePath("/dashboard/team/availability");
    const { data: sch } = await supabase
      .from("schedules")
      .select("project_id")
      .eq("id", input.contextId)
      .maybeSingle();
    const pid = (sch as { project_id: string } | null)?.project_id;
    if (pid) {
      revalidatePath(`/dashboard/projects/${pid}`);
    }
  }

  return { success: true };
}
