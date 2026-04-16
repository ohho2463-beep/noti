"use client";

import { SiteLangToggle, useSiteLangState } from "@/components/marketing/site-lang-toggle";

export function DashboardLangToggle() {
  const [lang, setLang] = useSiteLangState("ko");

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">언어</span>
      <SiteLangToggle value={lang} onChange={setLang} />
    </div>
  );
}
