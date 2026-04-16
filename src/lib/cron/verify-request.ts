import { NextResponse } from "next/server";

/** 크론/스케줄러가 GET 또는 POST로 호출할 수 있도록 공통 검증 */
export function verifyCronBearer(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
