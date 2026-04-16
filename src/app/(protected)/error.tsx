"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ProtectedSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="max-w-md space-y-2">
        <h2 className="text-lg font-semibold">문제가 발생했습니다</h2>
        <p className="text-sm text-muted-foreground">
          일시적인 오류일 수 있습니다. 다시 시도하거나 아래 버튼으로 복구를 시도해 주세요.
        </p>
        {process.env.NODE_ENV === "development" ? (
          <pre className="mt-2 max-h-36 overflow-auto rounded-md border bg-muted p-2 text-left text-xs">
            {error.message}
          </pre>
        ) : null}
      </div>
      <Button type="button" onClick={() => reset()}>
        다시 시도
      </Button>
    </div>
  );
}
