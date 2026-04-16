import type { User } from "@supabase/supabase-js";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { SessionUser } from "@/types/session";

type ProfilePreview = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "display_name" | "avatar_url"
> | null;

/** Auth user + profiles 행으로 SessionUser 구성 (서버 부트스트랩·페이지 공용) */
export function sessionUserFromAuth(user: User, profile: ProfilePreview): SessionUser | null {
  if (!user.email) {
    return null;
  }
  const metaName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined);

  return {
    id: user.id,
    email: user.email,
    name:
      profile?.display_name?.trim() || metaName || user.email.split("@")[0] || "사용자",
    avatarUrl: profile?.avatar_url ?? null,
  };
}

/** 서버에서 현재 사용자 + 프로필 조회 (RLS 적용) */
export const getServerUser = cache(async function getServerUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    const { data: profileRaw } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    return sessionUserFromAuth(user, profileRaw as ProfilePreview);
  } catch {
    return null;
  }
});
