"use client";

import * as React from "react";

import { syncProfileEmailFromAuth } from "@/actions/profile";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = React.useState(currentEmail);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    setEmail(currentEmail);
  }, [currentEmail]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const next = email.trim().toLowerCase();
    if (!next || next === currentEmail) {
      setMsg("새 이메일을 입력하세요.");
      return;
    }
    setPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ email: next });
      if (error) {
        setMsg(error.message);
        return;
      }
      await syncProfileEmailFromAuth();
      setMsg("확인 메일을 발송했습니다. 메일함에서 링크를 눌러 변경을 완료하세요.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="new-email">새 이메일</Label>
        <Input
          id="new-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "요청 중…" : "이메일 변경 요청"}
      </Button>
    </form>
  );
}
