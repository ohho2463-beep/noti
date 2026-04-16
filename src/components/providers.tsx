"use client";

import { ThemeProvider } from "@/components/theme-provider";

/**
 * Root client providers. Wired from `app/layout.tsx` for dark mode (next-themes).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      enableColorScheme
      disableTransitionOnChange
      storageKey="noti-theme"
    >
      {children}
    </ThemeProvider>
  );
}
