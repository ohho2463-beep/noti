"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SITE_COPY } from "@/lib/i18n/site-copy";
import { cn } from "@/lib/utils";

import { SiteLangToggle, useSiteLangState } from "@/components/marketing/site-lang-toggle";

type Mode = "login" | "signup";

export function AuthMarketingShell({
  mode,
  children,
}: {
  mode: Mode;
  children: ReactNode;
}) {
  const [lang, setLang] = useSiteLangState("ko");
  const t = SITE_COPY[lang];
  const login = t.authLogin;
  const signup = t.authSignup;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,440px)]">
      <aside
        className={cn(
          "relative hidden flex-col justify-between border-b md:flex md:border-b-0 md:border-r",
          "bg-gradient-to-br from-muted/80 via-muted/40 to-background dark:from-muted/30 dark:via-background dark:to-background"
        )}
      >
        <div className="space-y-8 p-8 lg:p-10">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="text-sm font-semibold tracking-tight hover:underline">
              NOTI
            </Link>
            <SiteLangToggle value={lang} onChange={setLang} />
          </div>
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {mode === "login" ? login.kicker : signup.kicker}
            </p>
            <h1 className="text-balance text-2xl font-semibold tracking-tight lg:text-3xl">
              {mode === "login" ? login.title : signup.title}
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground lg:text-base">
              {mode === "login" ? login.lead : signup.lead}
            </p>
          </div>
          <ul className="max-w-md space-y-3">
            {(mode === "login" ? login.bullets : signup.bullets).map((line) => (
              <li key={line} className="flex gap-2 text-sm text-muted-foreground">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2 p-8 text-xs text-muted-foreground lg:p-10">
          <p>{SITE_COPY[lang].footer}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/legal/privacy" className="hover:underline">
              {SITE_COPY[lang].legal.privacy}
            </Link>
            <span aria-hidden>·</span>
            <Link href="/legal/terms" className="hover:underline">
              {SITE_COPY[lang].legal.terms}
            </Link>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:hidden md:px-6">
          <Link href="/" className="text-sm font-medium text-muted-foreground">
            ← NOTI
          </Link>
          <SiteLangToggle value={lang} onChange={setLang} />
        </header>
        <div className="flex flex-1 flex-col justify-center p-4 md:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-sm space-y-6 md:max-w-md">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground md:hidden">
                {mode === "login" ? login.kicker : signup.kicker}
              </p>
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                {mode === "login" ? login.formTitle : signup.formTitle}
              </h2>
              <p className="text-sm text-muted-foreground">
                {mode === "login" ? login.formHint : signup.formHint}
              </p>
            </div>
            {children}
            <p className="text-center text-xs text-muted-foreground md:hidden">
              <Link href="/legal/privacy" className="hover:underline">
                {SITE_COPY[lang].legal.privacy}
              </Link>
              <span className="mx-2" aria-hidden>
                ·
              </span>
              <Link href="/legal/terms" className="hover:underline">
                {SITE_COPY[lang].legal.terms}
              </Link>
            </p>
            <p className="text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  {login.noAccount}{" "}
                  <Button variant="link" className="h-auto p-0" asChild>
                    <Link href="/signup">{login.register}</Link>
                  </Button>
                </>
              ) : (
                <>
                  {signup.hasAccount}{" "}
                  <Button variant="link" className="h-auto p-0" asChild>
                    <Link href="/login">{signup.signIn}</Link>
                  </Button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
