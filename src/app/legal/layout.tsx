import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Button variant="ghost" size="sm" className="-ms-2" asChild>
            <Link href="/">← NOTI</Link>
          </Button>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">{children}</div>
    </div>
  );
}
