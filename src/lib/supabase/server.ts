import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

import { assertSupabasePublicEnv } from "./supabase-public-env";

export const createClient = cache(async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = assertSupabasePublicEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* Server Component — 루트 middleware 가 세션 쿠키 갱신 */
        }
      },
    },
  });
});
