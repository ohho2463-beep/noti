import type { Metadata } from "next";

import { InviteAcceptPanel } from "@/components/workspace/invite-accept-panel";

type Props = { params: Promise<{ token: string }> };

export const metadata: Metadata = {
  title: "초대 수락",
};

export default async function InviteTokenPage({ params }: Props) {
  const { token } = await params;
  if (!token) {
    return (
      <div className="p-6 text-sm text-muted-foreground">유효하지 않은 링크입니다.</div>
    );
  }
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <InviteAcceptPanel token={token} />
    </div>
  );
}
