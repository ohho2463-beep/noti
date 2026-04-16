import { AuthMarketingShell } from "@/components/auth/auth-marketing-shell";
import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <AuthMarketingShell mode="signup">
      <SignupForm />
    </AuthMarketingShell>
  );
}
