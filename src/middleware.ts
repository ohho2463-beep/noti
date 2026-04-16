import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/** Supabase 세션 갱신 + `/dashboard` 보호 (공식 App Router 패턴) */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
