"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const suspended = searchParams.get("suspended");
  const config = searchParams.get("config");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setMessage(error.message);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "로그인에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border bg-card p-6 shadow-sm"
    >
      {config === "1" ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          <code className="rounded bg-background/60 px-1 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> ·{" "}
          <code className="rounded bg-background/60 px-1 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 가 없거나 예시
          값 그대로입니다. 로컬이면 <code className="rounded bg-background/60 px-1 text-xs">.env.local</code> 에
          Supabase 대시보드(Settings → API)의 실제 값을 넣고 개발 서버를 다시 띄우세요. 배포 환경이면 호스팅의
          환경 변수를 확인하세요.
        </p>
      ) : null}
      {suspended === "1" ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          계정이 일시 중지되었습니다. 관리자에게 문의하세요.
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {message && (
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "로그인 중…" : "로그인"}
      </Button>
    </form>
  );
}
