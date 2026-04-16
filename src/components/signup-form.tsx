"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSiteLangState } from "@/components/marketing/site-lang-toggle";
import { createClient } from "@/lib/supabase/client";
import { SITE_COPY } from "@/lib/i18n/site-copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function SignupForm() {
  const router = useRouter();
  const [lang] = useSiteLangState("ko");
  const t = SITE_COPY[lang];
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [agreeLegal, setAgreeLegal] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!agreeLegal) {
      setMessage(t.signupAgreeRequired);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
          data: { full_name: name.trim() || undefined },
        },
      });
      if (error) {
        setMessage(error.message);
        return;
      }
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      setSuccess(true);
      setMessage(
        "확인 메일을 보냈습니다. 메일의 링크를 눌러 가입을 완료한 뒤 로그인하세요."
      );
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "회원가입에 실패했습니다."
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
      <div className="space-y-2">
        <Label htmlFor="name">이름</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
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
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          8자 이상 (Supabase Auth 정책과 맞추어 조정하세요)
        </p>
      </div>
      <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
        <div className="flex gap-3">
          <input
            id="signup-agree-legal"
            type="checkbox"
            checked={agreeLegal}
            onChange={(e) => setAgreeLegal(e.target.checked)}
            className={cn(
              "mt-1 size-4 shrink-0 rounded border border-input accent-primary",
              "touch-manipulation"
            )}
            aria-describedby="signup-legal-links"
          />
          <Label htmlFor="signup-agree-legal" className="cursor-pointer text-sm font-normal leading-snug">
            {t.signupAgree}
          </Label>
        </div>
        <p id="signup-legal-links" className="ps-7 text-xs text-muted-foreground">
          <Link href="/legal/terms" className="underline-offset-4 hover:underline">
            {t.legal.terms}
          </Link>
          <span className="mx-1">·</span>
          <Link href="/legal/privacy" className="underline-offset-4 hover:underline">
            {t.legal.privacy}
          </Link>
        </p>
      </div>
      {message && (
        <p
          className={
            success ? "text-sm text-muted-foreground" : "text-sm text-destructive"
          }
          role="status"
        >
          {message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={loading || success || !agreeLegal}>
        {loading ? "가입 중…" : "회원가입"}
      </Button>
    </form>
  );
}
