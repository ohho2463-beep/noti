/** Supabase Auth + `profiles` 기반 세션 표시용 */
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};
