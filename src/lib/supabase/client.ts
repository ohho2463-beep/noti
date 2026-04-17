import { createBrowserClient } from "@supabase/ssr";

import { assertSupabasePublicEnv } from "./supabase-public-env";

export function createClient() {
  const { url, key } = assertSupabasePublicEnv();
  return createBrowserClient(url, key);
}
