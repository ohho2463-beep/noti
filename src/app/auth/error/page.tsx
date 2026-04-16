import Link from "next/link";

import { Button } from "@/components/ui/button";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const detail =
    reason === "config"
      ? "Supabase 환경 변수가 없습니다. .env.local 을 확인하세요."
      : "로그인 처리 중 오류가 발생했습니다. 다시 시도해 주세요.";

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 p-6">
      <div className="max-w-md space-y-2 text-center">
        <h1 className="text-2xl font-semibold">인증 오류</h1>
        <p className="text-muted-foreground">{detail}</p>
      </div>
      <Button asChild>
        <Link href="/login">로그인으로 돌아가기</Link>
      </Button>
    </div>
  );
}
