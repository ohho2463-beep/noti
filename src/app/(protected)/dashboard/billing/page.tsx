import type { Metadata } from "next";

import { BillingPlans } from "@/components/workspace/billing-plans";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBootstrap } from "@/lib/workspace/server-context";

export const metadata: Metadata = {
  title: "결제",
};

export default async function BillingPage() {
  const wb = await getWorkspaceBootstrap();
  const supabase = await createClient();

  if (!wb.workspaceId) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">결제</h1>
        <p className="text-muted-foreground">워크스페이스를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const { data: sub } = await supabase
    .from("workspace_subscriptions")
    .select("plan_code, renews_at, seats")
    .eq("workspace_id", wb.workspaceId)
    .maybeSingle();

  const row = sub as { plan_code: string; renews_at: string | null; seats: number } | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">결제 · 플랜</h1>
        <p className="text-muted-foreground">
          워크스페이스 구독 플랜을 선택할 수 있습니다. 결제 연동 전에는 프리뷰 모드로 운영됩니다.
        </p>
      </div>
      <BillingPlans
        workspaceId={wb.workspaceId}
        canManage={wb.canManageWorkspace}
        currentPlan={row?.plan_code ?? "free"}
        renewsAt={row?.renews_at ?? null}
        seats={row?.seats ?? 3}
      />
    </div>
  );
}
