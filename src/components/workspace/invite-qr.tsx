"use client";

import * as React from "react";
import QRCode from "qrcode";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { QrCode } from "lucide-react";

export function InviteQrButton({ inviteUrl }: { inviteUrl: string }) {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open || !inviteUrl) {
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(inviteUrl, { width: 200, margin: 2, color: { dark: "#0a0a0a", light: "#ffffff" } })
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDataUrl(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, inviteUrl]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <QrCode className="size-4" />
          QR
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle>초대 링크 QR</SheetTitle>
          <SheetDescription>스캔하면 초대 페이지로 이동합니다.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col items-center gap-3 py-4">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="" width={200} height={200} className="rounded-lg border bg-white p-2" />
          ) : (
            <p className="text-sm text-muted-foreground">QR 생성 중…</p>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void navigator.clipboard.writeText(inviteUrl)}
          >
            링크 복사
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
