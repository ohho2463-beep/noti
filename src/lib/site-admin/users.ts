import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export type ListedAuthUser = {
  id: string;
  email: string | undefined;
  created_at: string;
};

const MISSING_SERVICE_ROLE_MSG =
  "SUPABASE_SERVICE_ROLE_KEY 가 없어 Auth 기준 전체 목록을 불러올 수 없습니다. Supabase 대시보드 → Project Settings → API → service_role 키를 서버 환경 변수(.env.local 등)에 넣은 뒤 개발 서버를 재시작하세요. 로컬 CLI는 `npx supabase status`의 service_role 값을 사용할 수 있습니다.";

export async function fetchAuthUsersForAdmin(): Promise<{
  users: ListedAuthUser[];
  error?: string;
  /** Auth Admin API 대신 profiles 테이블(사이트 관리자 RLS)로만 조회한 경우 */
  fromProfilesOnly?: boolean;
}> {
  const admin = createServiceRoleClient();
  if (admin) {
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
    if (error) {
      return { users: [], error: error.message };
    }
    const users = (data.users ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
    }));
    return { users };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { users: [], error: MISSING_SERVICE_ROLE_MSG };
  }
  const { data: prof } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!prof?.is_admin) {
    return {
      users: [],
      error: `${MISSING_SERVICE_ROLE_MSG} (또는 DB에서 profiles.is_admin = true 인 계정으로 로그인하면 profiles 기준 목록을 볼 수 있습니다.)`,
    };
  }
  const { data: rows, error } = await supabase
    .from("profiles")
    .select("id,email,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    return { users: [], error: error.message };
  }
  const users = (rows ?? []).map((r) => ({
    id: r.id,
    email: r.email ?? undefined,
    created_at: r.created_at ?? new Date().toISOString(),
  }));
  return { users, fromProfilesOnly: true };
}
