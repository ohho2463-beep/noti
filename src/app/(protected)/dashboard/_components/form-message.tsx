"use client";

import type { ReactNode } from "react";

export function FormMessage({
  state,
}: {
  state: { error?: string; success?: boolean } | null;
}) {
  if (!state?.error && !state?.success) {
    return null;
  }
  return (
    <p
      className={
        state.error ? "text-sm text-destructive" : "text-sm text-muted-foreground"
      }
      role={state.error ? "alert" : undefined}
    >
      {state.error ?? "정상적으로 처리되었습니다."}
    </p>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium leading-none">{label}</span>
      {children}
    </div>
  );
}
