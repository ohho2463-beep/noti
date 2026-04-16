import type { Metadata } from "next";

import { Providers } from "@/components/providers";

import "./globals.css";

function metadataBase(): URL | undefined {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  if (!raw) {
    return undefined;
  }
  try {
    return new URL(raw.endsWith("/") ? raw.slice(0, -1) : raw);
  } catch {
    return undefined;
  }
}

const base = metadataBase();

export const metadata: Metadata = {
  ...(base ? { metadataBase: base } : {}),
  title: {
    default: "Noti",
    template: "%s · Noti",
  },
  description:
    "NOTI — 문서·프로젝트·일정·협업 워크스페이스. Next.js와 Supabase 기반.",
  openGraph: {
    type: "website",
    siteName: "Noti",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-[100dvh] font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
