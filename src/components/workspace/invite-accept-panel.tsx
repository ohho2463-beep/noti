"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { acceptWorkspaceInviteToken } from "@/actions/workspace-hub";
import { Button } from "@/components/ui/button";

const ERRORS: Record<string, string> = {
  not_authenticated: "로그인이 필요합니다.",
  invalid_token: "유효하지 않거나 이미 처리된 초대입니다.",
  expired: "초대가 만료되었습니다.",
  email_mismatch: "초대된 이메일과 로그인 계정이 일치하지 않습니다.",
};

export function InviteAcceptPanel({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<string | null>(null);

  function accept() {
    setMessage(null);
    startTransition(async () => {
      const res = await acceptWorkspaceInviteToken(token);
      if (res.error) {
        setMessage(ERRORS[res.error] ?? res.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <h1 className="text-lg font-semibold">워크스페이스 초대</h1>
      <p className="text-sm text-muted-foreground">
        이 초대는 <strong>워크스페이스(팀 허브)</strong> 멤버십입니다. 조직·프로젝트 권한과는 별도이며,
        수락 후 상단 워크스페이스 스위처에서 언제든 다른 워크스페이스로 바꿀 수 있습니다.
      </p>
      <p className="text-sm text-muted-foreground">
        아래 버튼을 누르면 초대를 수락하고 해당 워크스페이스로 전환합니다. 로그인한 이메일이 초대에
        적힌 주소와 같아야 합니다.
      </p>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Button className="w-full" onClick={accept} disabled={pending}>
        {pending ? "처리 중…" : "초대 수락"}
      </Button>
    </div>
  );
}
