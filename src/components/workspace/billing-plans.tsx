"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { updateWorkspacePlan } from "@/actions/workspace-hub";
import {
  WORKSPACE_PLAN_CATALOG,
  type WorkspacePlanCode,
} from "@/lib/workspace/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function BillingPlans({
  workspaceId,
  canManage,
  currentPlan,
  renewsAt,
  seats,
}: {
  workspaceId: string;
  canManage: boolean;
  currentPlan: string;
  renewsAt: string | null;
  seats: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<string | null>(null);

  function selectPlan(code: WorkspacePlanCode) {
    setMessage(null);
    startTransition(async () => {
      const res = await updateWorkspacePlan(workspaceId, code);
      if (res.error) {
        setMessage(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        현재 플랜: <strong>{currentPlan}</strong>
        {renewsAt ? (
          <>
            {" "}
            · 갱신 예정 {new Date(renewsAt).toLocaleDateString("ko")} · 좌석 {seats}
          </>
        ) : null}
      </p>
      {!canManage ? (
        <p className="text-sm text-amber-600 dark:text-amber-500">
          플랜 변경은 워크스페이스 소유자 또는 관리자(admin)만 할 수 있습니다.
        </p>
      ) : null}
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(WORKSPACE_PLAN_CATALOG) as WorkspacePlanCode[]).map((code) => {
          const p = WORKSPACE_PLAN_CATALOG[code];
          const active = code === currentPlan;
          return (
            <Card
              key={code}
              className={cn(
                "flex flex-col",
                active && "border-primary ring-1 ring-primary/30"
              )}
            >
              <CardHeader>
                <CardTitle className="text-lg">{p.name}</CardTitle>
                <CardDescription>{p.tag}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground">
                <p className="text-2xl font-semibold text-foreground">{p.price}</p>
                <ul className="list-inside list-disc space-y-1 text-xs">
                  <li>사용자 최대 {p.users}명</li>
                  <li>스토리지 {p.storage_gb}GB</li>
                  <li>히스토리 {p.history_days}일</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={active ? "secondary" : "default"}
                  disabled={pending || !canManage || active}
                  onClick={() => selectPlan(code)}
                >
                  {active ? "현재 플랜" : "플랜 변경"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        실제 결제·청구는 PG 연동 후 적용됩니다. 현재는 프리뷰 모드에서 플랜 전환만 반영됩니다.
      </p>
    </div>
  );
}
