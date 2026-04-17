import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnvStatus } from "./supabase-public-env";

const DASHBOARD_PREFIX = "/dashboard";

function isProtectedPath(path: string): boolean {
  return (
    path === DASHBOARD_PREFIX ||
    path.startsWith(`${DASHBOARD_PREFIX}/`) ||
    path.startsWith("/invite/")
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const env = getSupabasePublicEnvStatus();
  const path = request.nextUrl.pathname;

  if (!env.ok) {
    if (isProtectedPath(path)) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/login";
      redirect.searchParams.set("config", "1");
      redirect.searchParams.set("next", `${path}${request.nextUrl.search}`);
      return NextResponse.redirect(redirect);
    }
    return response;
  }

  const { url, key } = env;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = isProtectedPath(path);

  if (isProtected && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(redirect);
  }

  if ((path === "/login" || path === "/signup") && user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/dashboard";
    redirect.searchParams.delete("next");
    return NextResponse.redirect(redirect);
  }

  return response;
}
