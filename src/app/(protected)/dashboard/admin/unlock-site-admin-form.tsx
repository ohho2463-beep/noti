"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { unlockSiteAdminConsole } from "@/actions/site-admin";
import { FormMessage } from "@/app/(protected)/dashboard/_components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UnlockSiteAdminForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(unlockSiteAdminConsole, null);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <FormMessage state={state} />
      <div className="space-y-2">
        <Label htmlFor="admin-pw">운영 콘솔 암호</Label>
        <Input id="admin-pw" name="password" type="password" autoComplete="off" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "확인 중…" : "콘솔 입장"}
      </Button>
    </form>
  );
}
