import type { User } from "@supabase/supabase-js";
import { cache } from "react";

import { sessionUserFromAuth } from "@/lib/auth/server-user";
import { fetchUserNotifications, type UserNotificationRow } from "@/lib/notifications/server";
import { createClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/types/session";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export type WorkspaceRow = {
  id: string;
  name: string;
  owner_id: string;
  /** IANA 타임존. 일정·알림 UI 기준 (크론 D-day 는 기본 Asia/Seoul). */
  display_timezone?: string | null;
};

/** public.workspaces 테이블 자체가 없을 때 (PostgREST 캐시 포함) */
function isWorkspacesTableMissing(message: string | undefined, code: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  if (code === "PGRST205") {
    return true;
  }
  if (m.includes("schema cache") && (m.includes("workspaces") || m.includes("public.workspaces"))) {
    return true;
  }
  if (m.includes("could not find the table") && m.includes("workspaces")) {
    return true;
  }
  if (code === "42P01" && m.includes("workspaces")) {
    return true;
  }
  return false;
}

/** profiles 에 워크스페이스용 컬럼이 아직 없을 때 (060 일부 미적용) */
function isProfilesWorkspaceColumnMissing(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return (
    (m.includes("current_workspace_id") && m.includes("does not exist")) ||
    (m.includes("is_admin") && m.includes("does not exist") && m.includes("profiles")) ||
    (m.includes("is_suspended") && m.includes("does not exist") && m.includes("profiles"))
  );
}

/** workspaces.display_timezone 미적용(예: 101 마이그레이션 전) 시 전체 SELECT 가 실패하는 경우 */
function isDisplayTimezoneColumnMissing(message: string | undefined, code: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return (
    (m.includes("display_timezone") &&
      (m.includes("does not exist") || m.includes("column") || m.includes("unknown"))) ||
    (code === "PGRST204" && m.includes("display_timezone"))
  );
}

type DbWorkspaceRow = {
  id: string;
  name: string;
  owner_id: string;
  display_timezone?: string | null;
};

function normalizeWorkspaceRow(r: DbWorkspaceRow): WorkspaceRow {
  return {
    id: r.id,
    name: r.name,
    owner_id: r.owner_id,
    display_timezone: r.display_timezone ?? "Asia/Seoul",
  };
}

const MIGRATE_HINT =
  "Supabase 대시보드 → SQL Editor에서 아래 파일을 순서대로 실행하세요: (1) 20260406000000_noti_v2_workspace.sql (2) 20260406100000_profiles_workspace_peers_select.sql (3) 20260407120000_profiles_email_schedules_notify.sql (4) 20260408100000_create_personal_workspace_rpc.sql — RLS로 INSERT 가 막힐 때 (4)가 필요합니다. 로컬: npx supabase db push";

function isEnsureRpcMissing(message: string | undefined, code: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return (
    code === "PGRST202" ||
    (m.includes("function") && m.includes("ensure_personal_workspace")) ||
    m.includes("could not find the function")
  );
}

/** 워크스페이스가 없으면 생성하고 profiles.current_workspace_id 설정 */
export async function ensureDefaultWorkspace(ctx?: {
  supabase: ServerSupabase;
  user: User;
  /** 부트스트랩에서 이미 display_name 을 읽었을 때 profiles 재조회 생략 */
  prefetchedDisplayName?: string | null;
}): Promise<{
  workspaceId: string | null;
  error?: string;
  schemaMissing?: boolean;
  migrateHint?: string;
}> {
  const supabase = ctx?.supabase ?? (await createClient());
  const user =
    ctx?.user ??
    (
      await supabase.auth.getUser()
    ).data.user;
  if (!user?.email) {
    return { workspaceId: null, error: "로그인이 필요합니다." };
  }

  const probe = await supabase.from("workspaces").select("id").limit(1);
  if (probe.error && isWorkspacesTableMissing(probe.error.message, probe.error.code)) {
    return {
      workspaceId: null,
      schemaMissing: true,
      migrateHint: MIGRATE_HINT,
      error: "public.workspaces 테이블이 없습니다. (마이그레이션 060 미적용 가능)",
    };
  }
  if (probe.error) {
    return {
      workspaceId: null,
      error: probe.error.message,
      migrateHint: "workspaces 조회 실패: URL·Anon 키·네트워크를 확인하세요.",
    };
  }

  await supabase.auth.getSession();

  const skipDisplayNameQuery = Boolean(ctx && "prefetchedDisplayName" in ctx);
  const label = skipDisplayNameQuery
    ? (ctx!.prefetchedDisplayName as string | null | undefined)?.trim() ||
      user.email.split("@")[0] ||
      "사용자"
    : ((
        await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle()
      ).data?.display_name as string | undefined)?.trim() ||
      user.email.split("@")[0] ||
      "사용자";

  const wsName = `${label}의 NOTI`;

  const { data: rpcId, error: rpcErr } = await supabase.rpc("ensure_personal_workspace", {
    p_name: wsName,
  });

  if (!rpcErr && rpcId) {
    const id = rpcId as string;
    const { data: readable } = await supabase.from("workspaces").select("id").eq("id", id).maybeSingle();
    if (readable?.id) {
      return { workspaceId: id };
    }
    /* RPC 는 성공했으나 세션 클라이언트로는 행을 읽지 못함(RLS/불일치) — 아래 경로에서 복구 */
  }

  if (rpcErr && !isEnsureRpcMissing(rpcErr.message, rpcErr.code)) {
    const msg = rpcErr.message ?? "";
    if (isProfilesWorkspaceColumnMissing(msg)) {
      return {
        workspaceId: null,
        schemaMissing: true,
        migrateHint: MIGRATE_HINT,
        error: "profiles에 current_workspace_id 등이 없습니다. 060 마이그레이션을 적용하세요.",
      };
    }
    if (msg.includes("row-level security") || msg.toLowerCase().includes("rls")) {
      return {
        workspaceId: null,
        error: `${msg} — SQL Editor에서 20260408100000_create_personal_workspace_rpc.sql 을 실행한 뒤 새로고침하세요.`,
        migrateHint: MIGRATE_HINT,
      };
    }
    return { workspaceId: null, error: msg };
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("current_workspace_id, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    if (isProfilesWorkspaceColumnMissing(profileErr.message)) {
      return {
        workspaceId: null,
        schemaMissing: true,
        migrateHint: MIGRATE_HINT,
        error: "profiles에 current_workspace_id(또는 is_admin 등) 컬럼이 없습니다. 060 SQL 상단 ALTER 구문을 실행하세요.",
      };
    }
    return { workspaceId: null, error: profileErr.message };
  }

  const cur = profile?.current_workspace_id as string | null | undefined;
  if (cur) {
    const { data: ok, error: wErr } = await supabase
      .from("workspaces")
      .select("id, owner_id")
      .eq("id", cur)
      .maybeSingle();
    if (wErr && isWorkspacesTableMissing(wErr.message, wErr.code)) {
      return {
        workspaceId: null,
        schemaMissing: true,
        migrateHint: MIGRATE_HINT,
        error: "workspaces 테이블을 찾을 수 없습니다.",
      };
    }
    const row = ok as { id: string; owner_id: string } | null;
    if (row?.id) {
      if (row.owner_id === user.id) {
        return { workspaceId: cur };
      }
      const { data: mem } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", cur)
        .eq("user_id", user.id)
        .maybeSingle();
      if (mem) {
        return { workspaceId: cur };
      }
    }
  }

  const { data: owned, error: ownErr } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);

  if (ownErr && isWorkspacesTableMissing(ownErr.message, ownErr.code)) {
    return {
      workspaceId: null,
      schemaMissing: true,
      migrateHint: MIGRATE_HINT,
      error: "workspaces 테이블을 찾을 수 없습니다.",
    };
  }
  if (ownErr) {
    return { workspaceId: null, error: ownErr.message };
  }

  const firstOwned = owned?.[0]?.id as string | undefined;
  if (firstOwned) {
    const { error: upErr } = await supabase
      .from("profiles")
      .update({ current_workspace_id: firstOwned })
      .eq("id", user.id);
    if (upErr) {
      if (isProfilesWorkspaceColumnMissing(upErr.message)) {
        return {
          workspaceId: null,
          schemaMissing: true,
          migrateHint: MIGRATE_HINT,
          error: "profiles.current_workspace_id 컬럼이 없어 연결할 수 없습니다.",
        };
      }
      return { workspaceId: null, error: upErr.message };
    }
    return { workspaceId: firstOwned };
  }

  const { data: inserted, error } = await supabase
    .from("workspaces")
    .insert({ name: wsName, owner_id: user.id })
    .select("id")
    .single();

  if (error) {
    if (isWorkspacesTableMissing(error.message, error.code)) {
      return {
        workspaceId: null,
        schemaMissing: true,
        migrateHint: MIGRATE_HINT,
        error: "workspaces에 INSERT 할 수 없습니다. 테이블/마이그레이션을 확인하세요.",
      };
    }
    const em = error.message ?? "";
    if (em.includes("row-level security") || em.toLowerCase().includes("rls")) {
      return {
        workspaceId: null,
        error:
          "workspaces 직접 INSERT 가 RLS 에 막혔습니다. SQL Editor에서 20260408100000_create_personal_workspace_rpc.sql 을 실행한 뒤 새로고침하세요.",
        migrateHint: MIGRATE_HINT,
      };
    }
    return { workspaceId: null, error: em };
  }
  if (!inserted?.id) {
    return { workspaceId: null, error: "워크스페이스를 만들 수 없습니다." };
  }

  const { error: upErr } = await supabase
    .from("profiles")
    .update({ current_workspace_id: inserted.id })
    .eq("id", user.id);

  if (upErr) {
    if (isProfilesWorkspaceColumnMissing(upErr.message)) {
      return {
        workspaceId: null,
        schemaMissing: true,
        migrateHint: MIGRATE_HINT,
        error: "워크스페이스는 만들어졌지만 profiles.current_workspace_id가 없어 연결하지 못했습니다.",
      };
    }
    return { workspaceId: null, error: upErr.message };
  }

  return { workspaceId: inserted.id as string };
}

export async function listAccessibleWorkspaces(ctx?: {
  supabase: ServerSupabase;
  user: User;
}): Promise<WorkspaceRow[]> {
  const supabase = ctx?.supabase ?? (await createClient());
  const user =
    ctx?.user ??
    (
      await supabase.auth.getUser()
    ).data.user;
  if (!user) {
    return [];
  }

  const ownedFirst = await supabase
    .from("workspaces")
    .select("id, name, owner_id, display_timezone")
    .eq("owner_id", user.id);

  let ownedRows: DbWorkspaceRow[] | null = ownedFirst.data as DbWorkspaceRow[] | null;
  let ownErr = ownedFirst.error;

  if (
    ownErr &&
    isDisplayTimezoneColumnMissing(ownErr.message, ownErr.code) &&
    !isWorkspacesTableMissing(ownErr.message, ownErr.code)
  ) {
    const retry = await supabase.from("workspaces").select("id, name, owner_id").eq("owner_id", user.id);
    ownedRows = retry.data as DbWorkspaceRow[] | null;
    ownErr = retry.error;
  }

  if (ownErr && isWorkspacesTableMissing(ownErr.message, ownErr.code)) {
    return [];
  }

  const { data: memberships, error: memErr } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id);

  const memberRows = memErr ? [] : (memberships ?? []);
  const memberIds = [...new Set(memberRows.map((m) => m.workspace_id as string))];
  let memberWs: WorkspaceRow[] = [];
  if (memberIds.length > 0) {
    const mFirst = await supabase
      .from("workspaces")
      .select("id, name, owner_id, display_timezone")
      .in("id", memberIds);
    let mRows: DbWorkspaceRow[] | null = mFirst.data as DbWorkspaceRow[] | null;
    let mErr = mFirst.error;
    if (
      mErr &&
      isDisplayTimezoneColumnMissing(mErr.message, mErr.code) &&
      !isWorkspacesTableMissing(mErr.message, mErr.code)
    ) {
      const mRetry = await supabase.from("workspaces").select("id, name, owner_id").in("id", memberIds);
      mRows = mRetry.data as DbWorkspaceRow[] | null;
      mErr = mRetry.error;
    }
    if (!mErr && mRows) {
      memberWs = mRows.map((w) => normalizeWorkspaceRow(w));
    }
  }

  const map = new Map<string, WorkspaceRow>();
  for (const w of ownedRows ?? []) {
    map.set(w.id, normalizeWorkspaceRow(w));
  }
  for (const w of memberWs) {
    map.set(w.id, w);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

async function fetchWorkspaceRowById(
  supabase: ServerSupabase,
  id: string
): Promise<WorkspaceRow | null> {
  const first = await supabase
    .from("workspaces")
    .select("id, name, owner_id, display_timezone")
    .eq("id", id)
    .maybeSingle();

  let row: DbWorkspaceRow | null = first.data as DbWorkspaceRow | null;
  let error = first.error;

  if (
    error &&
    isDisplayTimezoneColumnMissing(error.message, error.code) &&
    !isWorkspacesTableMissing(error.message, error.code)
  ) {
    const r2 = await supabase.from("workspaces").select("id, name, owner_id").eq("id", id).maybeSingle();
    row = r2.data as DbWorkspaceRow | null;
    error = r2.error;
  }

  if (error || !row) {
    return null;
  }
  return normalizeWorkspaceRow(row);
}

function mergeWorkspaceIntoList(list: WorkspaceRow[], row: WorkspaceRow | null): WorkspaceRow[] {
  if (!row || list.some((w) => w.id === row.id)) {
    return list;
  }
  return [...list, row].sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

type BootstrapProfile = {
  display_name?: string | null;
  avatar_url?: string | null;
  is_admin?: boolean | null;
  is_suspended?: boolean | null;
} | null;

export const getWorkspaceBootstrap = cache(async function getWorkspaceBootstrap(): Promise<{
  sessionUser: SessionUser | null;
  initialNotifications: UserNotificationRow[];
  workspaceId: string | null;
  workspace: WorkspaceRow | null;
  workspaces: WorkspaceRow[];
  isSiteAdmin: boolean;
  isSuspended: boolean;
  canManageWorkspace: boolean;
  workspaceError?: string;
  workspaceSchemaMissing?: boolean;
  workspaceMigrateHint?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      sessionUser: null,
      initialNotifications: [],
      workspaceId: null,
      workspace: null,
      workspaces: [],
      isSiteAdmin: false,
      isSuspended: false,
      canManageWorkspace: false,
    };
  }

  const { data: profileRaw, error: profileErr } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, is_admin, is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  const profile: BootstrapProfile = profileErr ? null : (profileRaw as BootstrapProfile);
  const sessionUser = sessionUserFromAuth(
    user,
    profile
      ? {
          display_name: profile.display_name ?? null,
          avatar_url: profile.avatar_url ?? null,
        }
      : null
  );
  const isSiteAdmin = Boolean(profile?.is_admin);
  const isSuspended = Boolean(profile?.is_suspended);

  const ensured = await ensureDefaultWorkspace({
    supabase,
    user,
    prefetchedDisplayName: profile?.display_name ?? null,
  });
  if (ensured.schemaMissing) {
    return {
      sessionUser,
      initialNotifications: [],
      workspaceId: null,
      workspace: null,
      workspaces: [],
      isSiteAdmin,
      isSuspended,
      canManageWorkspace: false,
      workspaceSchemaMissing: true,
      workspaceError: ensured.error,
      workspaceMigrateHint: ensured.migrateHint,
    };
  }

  let wid = ensured.workspaceId;
  const [workspacesFirst, notifPack] = await Promise.all([
    listAccessibleWorkspaces({ supabase, user }),
    fetchUserNotifications(supabase, user.id),
  ]);
  let workspaces = workspacesFirst;

  /** wid 가 있으면 반드시 그 id 행만 쓴다(다른 스페이스로 끼워 넣지 않음). */
  let workspace: WorkspaceRow | null = wid ? workspaces.find((w) => w.id === wid) ?? null : null;

  if (!wid && workspaces.length > 0) {
    workspace = workspaces[0] ?? null;
    wid = workspace?.id ?? null;
    if (wid) {
      await supabase.from("profiles").update({ current_workspace_id: wid }).eq("id", user.id);
    }
  }

  if (wid && !workspace) {
    const row = await fetchWorkspaceRowById(supabase, wid);
    if (row) {
      workspace = row;
      workspaces = mergeWorkspaceIntoList(workspaces, row);
    }
  }

  /**
   * current_workspace_id 가 깨졌거나 RLS/목록 불일치 시: RPC로 포인터를 바로잡고, 안 되면 프로필 초기화 후 ensure 재실행.
   */
  if (wid && !workspace) {
    const label =
      (profile?.display_name ?? "").trim() || user.email?.split("@")[0] || "사용자";
    const wsName = `${label}의 NOTI`;
    const { data: rpcFix, error: rpcFixErr } = await supabase.rpc("ensure_personal_workspace", {
      p_name: wsName,
    });
    if (!rpcFixErr && rpcFix) {
      wid = rpcFix as string;
      workspaces = await listAccessibleWorkspaces({ supabase, user });
      workspace = workspaces.find((w) => w.id === wid) ?? null;
      if (!workspace) {
        const rowRpc = await fetchWorkspaceRowById(supabase, wid);
        if (rowRpc) {
          workspace = rowRpc;
          workspaces = mergeWorkspaceIntoList(workspaces, rowRpc);
        }
      }
    }

    if (wid && !workspace) {
      await supabase.from("profiles").update({ current_workspace_id: null }).eq("id", user.id);
      const reEnsured = await ensureDefaultWorkspace({
        supabase,
        user,
        prefetchedDisplayName: profile?.display_name ?? null,
      });
      if (!reEnsured.schemaMissing && reEnsured.workspaceId) {
        wid = reEnsured.workspaceId;
        workspaces = await listAccessibleWorkspaces({ supabase, user });
        workspace = workspaces.find((w) => w.id === wid) ?? null;
        if (!workspace) {
          const row2 = await fetchWorkspaceRowById(supabase, wid);
          if (row2) {
            workspace = row2;
            workspaces = mergeWorkspaceIntoList(workspaces, row2);
          }
        }
      } else {
        wid = null;
        workspaces = await listAccessibleWorkspaces({ supabase, user });
        workspace = workspaces[0] ?? null;
        if (workspace) {
          wid = workspace.id;
          await supabase.from("profiles").update({ current_workspace_id: wid }).eq("id", user.id);
        }
      }
    }
  }

  /**
   * 위에서 행을 못 잡았지만 접근 가능 목록이 있으면 첫 스페이스로 프로필을 맞춤(목록 조회는 되고 단건/포인터만 깨진 경우).
   */
  if (!workspace && workspaces.length > 0) {
    workspace = workspaces[0] ?? null;
    if (workspace) {
      await supabase.from("profiles").update({ current_workspace_id: workspace.id }).eq("id", user.id);
    }
  }

  let workspaceErrorOut = ensured.error;
  /** 상세 행이 없으면 id 만 노출하지 않음(헤더·패널 불일치 방지). */
  if (!workspace) {
    wid = null;
    if (!workspaceErrorOut) {
      workspaceErrorOut = ensured.workspaceId
        ? "프로필의 워크스페이스 ID는 있으나 DB에서 해당 행을 읽지 못했습니다. Supabase에서 마이그레이션(060·061·081)·RLS를 확인하거나, SQL Editor에서 profiles.current_workspace_id 를 NULL 로 비운 뒤 새로고침해 보세요."
        : "접근 가능한 워크스페이스가 없습니다. noti/supabase/migrations 의 060·081 을 적용했는지, .env.local 의 Supabase URL·Anon 키가 해당 프로젝트와 일치하는지 확인하세요.";
    }
  }

  let canManageWorkspace = false;
  if (workspace) {
    if (workspace.owner_id === user.id) {
      canManageWorkspace = true;
    } else {
      const { data: wm } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspace.id)
        .eq("user_id", user.id)
        .maybeSingle();
      canManageWorkspace = (wm as { role: string } | null)?.role === "admin";
    }
  }

  return {
    sessionUser,
    initialNotifications: notifPack.rows,
    workspaceId: workspace?.id ?? null,
    workspace,
    workspaces,
    isSiteAdmin,
    isSuspended,
    canManageWorkspace,
    workspaceError: workspaceErrorOut,
    workspaceMigrateHint: ensured.migrateHint,
  };
});
