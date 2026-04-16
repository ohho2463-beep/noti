import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBootstrap } from "@/lib/workspace/server-context";

import { ProfileForm } from "./profile-form";
import { ChangeEmailForm } from "./change-email-form";

export const metadata: Metadata = {
  title: "설정",
};

export default async function SettingsPage() {
  const wb = await getWorkspaceBootstrap();
  const user = wb.sessionUser;
  const supabase = await createClient();

  const { data: profile } = user?.id
    ? await supabase
        .from("profiles")
        .select("display_name, avatar_url, email")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">설정</h1>
        <p className="text-muted-foreground">프로필·이메일·표시 정보를 관리합니다.</p>
      </div>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>프로필</CardTitle>
          <CardDescription>
            {user?.email ? `로그인 이메일: ${user.email}` : "로그인이 필요합니다."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaultDisplayName={profile?.display_name ?? ""}
            defaultAvatarUrl={profile?.avatar_url ?? ""}
            defaultProfileEmail={profile?.email ?? user?.email ?? ""}
          />
        </CardContent>
      </Card>
      {user?.email ? (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>이메일 변경</CardTitle>
            <CardDescription>
              Supabase가 새 주소로 확인 메일을 보냅니다. 완료 후 프로필의 표시용 이메일도 동기화됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangeEmailForm currentEmail={user.email} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
