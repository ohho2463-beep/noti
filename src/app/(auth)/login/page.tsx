import { Suspense } from "react";

import { AuthMarketingShell } from "@/components/auth/auth-marketing-shell";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <AuthMarketingShell mode="login">
      <Suspense
        fallback={
          <div className="h-64 animate-pulse rounded-xl border bg-muted/40" />
        }
      >
        <LoginForm />
      </Suspense>
    </AuthMarketingShell>
  );
}
