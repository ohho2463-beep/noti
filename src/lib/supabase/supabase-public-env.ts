/** .env.example 의 자리 표시자 — 실제 Supabase API 값으로 바꿔야 함 */
const PLACEHOLDER_URL_SNIPPET = "your-project-ref";
const PLACEHOLDER_ANON_KEY = "your-anon-key";

export type SupabasePublicEnvStatus =
  | { ok: true; url: string; key: string }
  | { ok: false; reason: "missing" | "placeholder" };

export function getSupabasePublicEnvStatus(): SupabasePublicEnvStatus {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return { ok: false, reason: "missing" };
  }
  if (url.includes(PLACEHOLDER_URL_SNIPPET) || key === PLACEHOLDER_ANON_KEY) {
    return { ok: false, reason: "placeholder" };
  }
  return { ok: true, url, key };
}

export function assertSupabasePublicEnv(): { url: string; key: string } {
  const s = getSupabasePublicEnvStatus();
  if (!s.ok) {
    if (s.reason === "missing") {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 설정되지 않았습니다."
      );
    }
    throw new Error(
      ".env.local 의 NEXT_PUBLIC_SUPABASE_URL·NEXT_PUBLIC_SUPABASE_ANON_KEY 를 Supabase 대시보드(Settings → API)의 실제 Project URL과 anon public 키로 바꿔 주세요."
    );
  }
  return { url: s.url, key: s.key };
}
