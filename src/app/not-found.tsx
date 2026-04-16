import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">페이지를 찾을 수 없습니다</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          주소가 잘못되었거나 삭제된 페이지일 수 있습니다. 홈으로 돌아가 계속 이용해 주세요.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/">홈으로</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/login">로그인</Link>
        </Button>
      </div>
    </div>
  );
}
