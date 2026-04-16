"use client";

import { useActionState } from "react";

import { updateProfile } from "@/actions/profile";
import {
  Field,
  FormMessage,
} from "@/app/(protected)/dashboard/_components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfileForm({
  defaultDisplayName,
  defaultAvatarUrl,
  defaultProfileEmail,
}: {
  defaultDisplayName: string;
  defaultAvatarUrl: string;
  defaultProfileEmail: string;
}) {
  const [state, action, pending] = useActionState(updateProfile, null);

  return (
    <form action={action} className="grid gap-4">
      <FormMessage state={state} />
      <Field label="표시 이름">
        <Input
          name="display_name"
          defaultValue={defaultDisplayName}
          placeholder="이름"
          autoComplete="name"
        />
      </Field>
      <Field label="멤버 목록에 보일 이메일 (선택)">
        <Input
          name="profile_email"
          type="email"
          defaultValue={defaultProfileEmail}
          placeholder="동일하게 두려면 로그인 이메일과 같게 입력"
          autoComplete="email"
        />
      </Field>
      <Field label="아바타 URL (선택)">
        <Input
          name="avatar_url"
          type="url"
          defaultValue={defaultAvatarUrl}
          placeholder="https://…"
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "저장 중…" : "프로필 저장"}
      </Button>
    </form>
  );
}
