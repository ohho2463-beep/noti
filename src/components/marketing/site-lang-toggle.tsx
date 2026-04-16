"use client";

import * as React from "react";

import {
  type SiteLang,
  readStoredLang,
  writeStoredLang,
} from "@/lib/i18n/site-copy";
import { cn } from "@/lib/utils";

const LANGS: { id: SiteLang; label: string }[] = [
  { id: "ko", label: "한국어" },
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
];

type SiteLangToggleProps = {
  value: SiteLang;
  onChange: (lang: SiteLang) => void;
  className?: string;
};

export function SiteLangToggle({ value, onChange, className }: SiteLangToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-border/80 bg-muted/40 p-0.5 text-xs font-medium",
        className
      )}
      role="group"
      aria-label="Language"
    >
      {LANGS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => {
            writeStoredLang(id);
            onChange(id);
          }}
          className={cn(
            "rounded-md px-2.5 py-1 transition-colors",
            value === id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function useSiteLangState(defaultLang: SiteLang = "ko") {
  const [lang, setLang] = React.useState<SiteLang>(defaultLang);

  React.useEffect(() => {
    const stored = readStoredLang();
    if (stored) {
      setLang(stored);
    }
  }, []);

  return [lang, setLang] as const;
}
