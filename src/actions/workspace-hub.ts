"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function logWorkspaceAudit(input: {
  action: string;
  message: string;
  workspaceId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return;
  }
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    workspace_id: input.workspaceId ?? null,
    action: input.action,
    message: input.message.slice(0, 255),
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    metadata_json: JSON.stringify(input.metadata ?? {}),
  });
}

export async function switchWorkspace(_prev: unknown, formData: FormData) {
  const id = formData.get("workspace_id") as string;
  if (!id) {
    return { error: "잘못된 요청" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!ws) {
    return { error: "워크스페이스를 찾을 수 없습니다." };
  }
  if ((ws as { owner_id: string }).owner_id !== user.id) {
    const { data: mem } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!mem) {
      return { error: "접근 권한이 없습니다." };
    }
  }
  const { error } = await supabase
    .from("profiles")
    .update({ current_workspace_id: id })
    .eq("id", user.id);
  if (error) {
    return { error: error.message };
  }
  await logWorkspaceAudit({
    action: "workspace.switch",
    message: `워크스페이스 전환`,
    workspaceId: id,
  });
  revalidatePath("/", "layout");
  return { success: true };
}

/** 프로그램matic 전환(URL `?ws=` 동기화 등). */
export async function switchWorkspaceById(
  workspaceId: string
): Promise<{ success?: true; error?: string }> {
  const fd = new FormData();
  fd.set("workspace_id", workspaceId);
  const res = await switchWorkspace(null, fd);
  if (res && "error" in res && res.error) {
    return { error: res.error };
  }
  return { success: true };
}

export async function createWorkspace(_prev: unknown, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "이름을 입력하세요." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }
  const { data: rpcWid, error: rpcErr } = await supabase.rpc("create_additional_workspace", {
    p_name: name,
  });

  let newId: string | null = (rpcWid as string | null) ?? null;

  if (rpcErr || !newId) {
    const msg = rpcErr?.message ?? "";
    const rpcMissing =
      msg.toLowerCase().includes("could not find the function") ||
      msg.includes("create_additional_workspace") ||
      rpcErr?.code === "PGRST202";
    if (!rpcMissing) {
      return { error: msg || "생성 실패" };
    }
    const { data: inserted, error } = await supabase
      .from("workspaces")
      .insert({ name, owner_id: user.id })
      .select("id")
      .single();
    if (error || !inserted?.id) {
      const em = error?.message ?? "생성 실패";
      if (em.includes("row-level security") || em.toLowerCase().includes("rls")) {
        return {
          error:
            "RLS 로 생성이 막혔습니다. Supabase에서 20260408100000_create_personal_workspace_rpc.sql 을 실행하세요.",
        };
      }
      return { error: em };
    }
    newId = inserted.id as string;
    await supabase.from("profiles").update({ current_workspace_id: newId }).eq("id", user.id);
  }
  await logWorkspaceAudit({
    action: "workspace.create",
    message: `워크스페이스 '${name}' 생성`,
    workspaceId: newId,
    targetType: "workspace",
    targetId: newId,
  });
  revalidatePath("/", "layout");
  return { success: true };
}

export async function createWorkspacePage(input: {
  workspaceId: string;
  title: string;
  parentId: string | null;
  icon?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }
  const { count } = await supabase
    .from("workspace_pages")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", input.workspaceId)
    .eq("parent_id", input.parentId ?? null);

  const position = count ?? 0;
  const { data, error } = await supabase
    .from("workspace_pages")
    .insert({
      workspace_id: input.workspaceId,
      parent_id: input.parentId,
      title: input.title.trim() || "새 페이지",
      icon: input.icon?.trim() || "📄",
      position,
      created_by: user.id,
      content_json: "[]",
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return { error: error?.message ?? "실패" };
  }
  await logWorkspaceAudit({
    action: "page.create",
    message: `페이지 생성`,
    workspaceId: input.workspaceId,
    targetType: "workspace_page",
    targetId: data.id as string,
  });
  revalidatePath("/dashboard/docs");
  return { success: true, id: data.id as string };
}

export async function saveWorkspacePageContent(pageId: string, workspaceId: string, blocks: unknown[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: prev } = await supabase
    .from("workspace_pages")
    .select("content_json, title")
    .eq("id", pageId)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (prev && user) {
    await supabase.from("workspace_page_revisions").insert({
      page_id: pageId,
      title: (prev as { title: string }).title,
      content_json: (prev as { content_json: string }).content_json,
      created_by: user.id,
    });
  }

  const sanitized = (Array.isArray(blocks) ? blocks : []).map((b: unknown, i: number) => {
    const block = b as Record<string, unknown>;
    return {
      id: typeof block.id === "string" ? block.id : `b${i}`,
      type: typeof block.type === "string" ? block.type : "paragraph",
      content: typeof block.content === "string" ? block.content : "",
      checked: Boolean(block.checked),
    };
  });
  const { error } = await supabase
    .from("workspace_pages")
    .update({
      content_json: JSON.stringify(sanitized),
      updated_at: new Date().toISOString(),
    })
    .eq("id", pageId)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { error: error.message };
  }
  await logWorkspaceAudit({
    action: "page.save",
    message: "페이지 저장",
    workspaceId,
    targetType: "workspace_page",
    targetId: pageId,
    metadata: { blocks: sanitized.length },
  });
  revalidatePath(`/dashboard/docs/${pageId}`);
  return { success: true };
}

export async function updateWorkspacePageTitle(pageId: string, workspaceId: string, title: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_pages")
    .update({ title: title.trim() || "Untitled" })
    .eq("id", pageId)
    .eq("workspace_id", workspaceId);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard/docs");
  revalidatePath(`/dashboard/docs/${pageId}`);
  return { success: true };
}

export async function deleteWorkspacePage(pageId: string, workspaceId: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  async function descendantIds(parentId: string): Promise<string[]> {
    const { data: kids } = await supabase
      .from("workspace_pages")
      .select("id")
      .eq("parent_id", parentId)
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null);
    const out: string[] = [];
    for (const k of kids ?? []) {
      const id = (k as { id: string }).id;
      out.push(id, ...(await descendantIds(id)));
    }
    return out;
  }

  const allIds = [pageId, ...(await descendantIds(pageId))];
  const { error } = await supabase
    .from("workspace_pages")
    .update({ deleted_at: now })
    .in("id", allIds)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard/docs");
  revalidatePath("/dashboard/docs/trash");
  return { success: true };
}

export async function restoreWorkspacePage(pageId: string, workspaceId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_pages")
    .update({ deleted_at: null })
    .eq("id", pageId)
    .eq("workspace_id", workspaceId);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard/docs");
  revalidatePath("/dashboard/docs/trash");
  return { success: true };
}

export async function updateWorkspaceDisplayTimezone(workspaceId: string, timezone: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }
  const { data: ws } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!ws) {
    return { error: "워크스페이스를 찾을 수 없습니다." };
  }
  let can = (ws as { owner_id: string }).owner_id === user.id;
  if (!can) {
    const { data: wm } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    can = (wm as { role: string } | null)?.role === "admin";
  }
  if (!can) {
    return { error: "권한이 없습니다." };
  }
  const tz = timezone.trim() || "Asia/Seoul";
  const { error } = await supabase.from("workspaces").update({ display_timezone: tz }).eq("id", workspaceId);
  if (error) {
    return { error: error.message };
  }
  await logWorkspaceAudit({
    action: "workspace.timezone",
    message: `표시 타임존: ${tz}`,
    workspaceId,
  });
  revalidatePath("/", "layout");
  return { success: true };
}

export async function createWorkspaceTask(input: {
  workspaceId: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }
  const { count } = await supabase
    .from("workspace_tasks")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", input.workspaceId)
    .eq("status", input.status);

  const { error } = await supabase.from("workspace_tasks").insert({
    workspace_id: input.workspaceId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    status: input.status,
    priority: input.priority,
    due_date: input.dueDate || null,
    position: count ?? 0,
    created_by: user.id,
  });
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function moveWorkspaceTask(
  taskId: string,
  workspaceId: string,
  status: string,
  position: number
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_tasks")
    .update({ status, position })
    .eq("id", taskId)
    .eq("workspace_id", workspaceId);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard/tasks");
  return { success: true };
}

export async function deleteWorkspaceTask(taskId: string, workspaceId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_tasks")
    .delete()
    .eq("id", taskId)
    .eq("workspace_id", workspaceId);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard/tasks");
  return { success: true };
}

export async function inviteWorkspaceMember(input: {
  workspaceId: string;
  email: string;
  role: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }
  const email = input.email.trim().toLowerCase();
  if (!email) {
    return { error: "이메일을 입력하세요." };
  }
  let role = input.role;
  if (!["viewer", "editor", "admin"].includes(role)) {
    role = "editor";
  }
  const token = randomBytes(24).toString("base64url");
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);

  const { data: existing } = await supabase
    .from("workspace_invitations")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("workspace_invitations")
      .update({ expires_at: expires.toISOString(), role, token })
      .eq("id", existing.id as string);
    if (error) {
      return { error: error.message };
    }
  } else {
    const { error } = await supabase.from("workspace_invitations").insert({
      workspace_id: input.workspaceId,
      email,
      role,
      token,
      status: "pending",
      invited_by: user.id,
      expires_at: expires.toISOString(),
    });
    if (error) {
      return { error: error.message };
    }
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const link = `${origin.replace(/\/$/, "")}/invite/${token}`;

  await logWorkspaceAudit({
    action: "team.invite",
    message: `${email} 초대`,
    workspaceId: input.workspaceId,
    metadata: { link },
  });

  revalidatePath("/dashboard/team");
  return { success: true, inviteLink: link };
}

export async function cancelWorkspaceInvite(inviteId: string, workspaceId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_invitations")
    .update({ status: "cancelled" })
    .eq("id", inviteId)
    .eq("workspace_id", workspaceId);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard/team");
  return { success: true };
}

export async function removeWorkspaceMember(workspaceId: string, userId: string) {
  const supabase = await createClient();
  const { data: ws } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .maybeSingle();
  if ((ws as { owner_id: string } | null)?.owner_id === userId) {
    return { error: "소유자는 제거할 수 없습니다." };
  }
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard/team");
  return { success: true };
}

export async function updateWorkspacePlan(workspaceId: string, planCode: string) {
  const supabase = await createClient();
  if (!["free", "pro", "team"].includes(planCode)) {
    return { error: "잘못된 플랜" };
  }
  const seats =
    planCode === "free" ? 3 : planCode === "pro" ? 15 : 50;
  const renews = new Date();
  renews.setDate(renews.getDate() + 30);
  const { error } = await supabase
    .from("workspace_subscriptions")
    .update({
      plan_code: planCode,
      status: "active",
      seats,
      renews_at: renews.toISOString(),
    })
    .eq("workspace_id", workspaceId);
  if (error) {
    return { error: error.message };
  }
  await logWorkspaceAudit({
    action: "billing.plan_changed",
    message: `플랜 ${planCode}`,
    workspaceId,
  });
  revalidatePath("/dashboard/billing");
  return { success: true };
}

export async function acceptWorkspaceInviteToken(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_workspace_invitation", {
    p_token: token,
  });
  if (error) {
    return { error: error.message };
  }
  const row = data as { ok?: boolean; error?: string; workspace_id?: string };
  if (!row?.ok) {
    return { error: row?.error ?? "실패" };
  }
  revalidatePath("/", "layout");
  return { success: true, workspaceId: row.workspace_id };
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  isPublished: boolean;
  isPinned: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return { error: "권한 없음" };
  }
  const { error } = await supabase.from("announcements").insert({
    title: input.title.trim(),
    body: input.body.trim(),
    is_published: input.isPublished,
    is_pinned: input.isPinned,
  });
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard");
  return { success: true };
}
