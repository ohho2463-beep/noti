import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

import { UnlockSiteAdminForm } from "./unlock-site-admin-form";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const passRequired = Boolean(process.env.ADMIN_CONSOLE_PASSWORD);
  const jar = await cookies();
  const unlocked = jar.get("noti_admin_unlocked")?.value === "1";

  if (passRequired && !unlocked) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">사이트 운영 콘솔</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            이 영역은 <strong className="text-foreground">앱 전체(사이트) 운영</strong>용입니다. 프로젝트
            관리자(Admin/Manager)와는 다릅니다. 환경 변수로 설정한 암호로만 입장합니다.
          </p>
        </div>
        <UnlockSiteAdminForm />
      </div>
    );
  }

  if (!passRequired) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: prof } = user
      ? await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle()
      : { data: null };
    if (!prof?.is_admin) {
      return (
        <div className="space-y-4 p-6">
          <h1 className="text-2xl font-semibold tracking-tight">사이트 운영 콘솔</h1>
          <p className="text-sm text-muted-foreground">
            기본 설정에서는 <code className="rounded bg-muted px-1 text-xs">profiles.is_admin = true</code> 인
            계정만 볼 수 있습니다. 팀 운영자에게 사이트 관리자 지정을 요청하거나, 서버에{" "}
            <code className="rounded bg-muted px-1 text-xs">ADMIN_CONSOLE_PASSWORD</code> 를 두면 암호로 입장할
            수 있습니다.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
