"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  LayoutDashboard,
  Layers,
  Shield,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SITE_COPY } from "@/lib/i18n/site-copy";
import { cn } from "@/lib/utils";

import { SiteLangToggle, useSiteLangState } from "./site-lang-toggle";

const pillarIcons = [LayoutDashboard, Activity, CalendarDays] as const;
const teaserIcons = [LayoutDashboard, Activity, CalendarDays] as const;

export function MarketingHome() {
  const [lang, setLang] = useSiteLangState("ko");
  const t = SITE_COPY[lang];

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Layers className="size-4" aria-hidden />
            </span>
            <span>NOTI</span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <SiteLangToggle value={lang} onChange={setLang} className="hidden sm:flex" />
            <SiteLangToggle value={lang} onChange={setLang} className="sm:hidden" />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">{t.nav.signIn}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">{t.nav.startFree}</Link>
            </Button>
            <Button variant="secondary" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/dashboard">
                {t.nav.openApp}
                <ArrowRight className="ms-1 size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-16 px-4 py-14 md:space-y-20 md:px-6 md:py-20">
        <section className="space-y-6 md:space-y-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t.hero.eyebrow}
          </p>
          <h1 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight md:text-5xl md:leading-tight">
            {t.hero.title}
          </h1>
          <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            {t.hero.subtitle}
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button size="lg" asChild>
              <Link href="/signup">{t.hero.ctaPrimary}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">{t.hero.ctaSecondary}</Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {t.pills.map((pill) => (
              <span
                key={pill}
                className="inline-flex items-center rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {pill}
              </span>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {t.pillars.map((p, i) => {
            const Icon = pillarIcons[i] ?? LayoutDashboard;
            return (
              <Card
                key={p.title}
                className="border-border/80 shadow-none transition-shadow hover:shadow-md"
              >
                <CardHeader>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {p.kicker}
                  </p>
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="text-lg">{p.title}</CardTitle>
                      <CardDescription className="text-sm leading-relaxed">
                        {p.body}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </section>

        <section>
          <Card className="border-dashed border-border/80 bg-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="size-4 text-muted-foreground" aria-hidden />
                {t.stack.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 sm:grid-cols-2">
                {t.stack.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 border-t pt-12 md:grid-cols-3 md:pt-16">
          {t.teasers.map((item, i) => {
            const Icon = teaserIcons[i] ?? LayoutDashboard;
            return (
              <MiniTeaser key={item.href} icon={Icon} title={item.title} body={item.body} href={item.href} />
            );
          })}
        </section>
      </main>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        <p>{t.footer}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link href="/legal/privacy" className="hover:underline">
            {t.legal.privacy}
          </Link>
          <Link href="/legal/terms" className="hover:underline">
            {t.legal.terms}
          </Link>
        </div>
      </footer>
    </div>
  );
}

function MiniTeaser({
  icon: Icon,
  title,
  body,
  href,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex gap-3 rounded-xl border border-transparent p-4 transition-colors",
        "hover:border-border hover:bg-muted/40"
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-background">
        <Icon className="size-5 text-muted-foreground group-hover:text-foreground" />
      </span>
      <div className="min-w-0 text-left">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </Link>
  );
}
