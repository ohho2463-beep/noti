"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import {
  cancelWorkspaceInvite,
  inviteWorkspaceMember,
  removeWorkspaceMember,
} from "@/actions/workspace-hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteQrButton } from "@/components/workspace/invite-qr";
import { Copy, UserMinus } from "lucide-react";

export type TeamMemberRow = {
  userId: string;
  role: string;
  label: string;
  isOwner: boolean;
};

export type TeamInviteRow = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
};

export function TeamWorkspacePanel({
  workspaceId,
  canManage,
  members,
  invites,
}: {
  workspaceId: string;
  canManage: boolean;
  members: TeamMemberRow[];
  invites: TeamInviteRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("editor");
  const [message, setMessage] = React.useState<string | null>(null);
  const [link, setLink] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLink(null);
    startTransition(async () => {
      const res = await inviteWorkspaceMember({
        workspaceId,
        email: email.trim(),
        role,
      });
      if (res.error) {
        setMessage(res.error);
        return;
      }
      setEmail("");
      if ("inviteLink" in res && res.inviteLink) {
        setLink(res.inviteLink);
      }
      router.refresh();
    });
  }

  function copyLink() {
    if (link) {
      void navigator.clipboard.writeText(link);
      setMessage("초대 링크를 복사했습니다.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">멤버</CardTitle>
          <CardDescription>워크스페이스 소유자와 초대된 멤버입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {members.length === 0 ? (
              <p className="col-span-full text-sm text-muted-foreground">
                멤버 목록이 비어 있습니다. 소유자 정보를 불러오지 못했을 수 있으니 새로고침하거나, 워크스페이스
                전환 후 다시 열어 보세요.
              </p>
            ) : null}
            {members.map((m) => (
              <div
                key={m.userId}
                className="flex flex-col justify-between gap-3 rounded-xl border border-border/80 bg-muted/10 p-4"
              >
                <div className="space-y-2">
                  <p className="text-base font-semibold leading-tight">{m.label}</p>
                  <Badge variant={m.isOwner ? "default" : "secondary"} className="w-fit text-xs capitalize">
                    {m.isOwner ? "소유자" : m.role}
                  </Badge>
                </div>
                {canManage && !m.isOwner ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await removeWorkspaceMember(workspaceId, m.userId);
                        router.refresh();
                      })
                    }
                  >
                    <UserMinus className="me-1 size-4" />
                    멤버 제거
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">초대</CardTitle>
          <CardDescription>
            {canManage
              ? "소유자 또는 워크스페이스 관리자만 이메일 초대를 보낼 수 있습니다."
              : "초대하려면 워크스페이스 관리 권한이 필요합니다."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage ? (
            <form onSubmit={onInvite} className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={pending}
                />
                <select
                  className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={pending}
                >
                  <option value="viewer">viewer</option>
                  <option value="editor">editor</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <Button type="submit" disabled={pending}>
                초대 보내기
              </Button>
            </form>
          ) : null}
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          {link ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-xs break-all">
              <span className="min-w-0 flex-1">{link}</span>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={copyLink}>
                  <Copy className="me-1 size-3" />
                  복사
                </Button>
                <InviteQrButton inviteUrl={link} />
              </div>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">대기 중인 초대</p>
            {invites.length === 0 ? (
              <p className="text-sm text-muted-foreground">없음</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {invites.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.role} · 만료 {new Date(inv.expires_at).toLocaleDateString("ko")}
                      </p>
                    </div>
                    {canManage ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await cancelWorkspaceInvite(inv.id, workspaceId);
                            router.refresh();
                          })
                        }
                      >
                        취소
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
