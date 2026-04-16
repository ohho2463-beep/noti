/** 배포 시 `NEXT_PUBLIC_SUPPORT_EMAIL` 로 고객 문의 메일을 노출합니다. */
export function SupportContact() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  if (email) {
    return (
      <p className="text-sm text-muted-foreground">
        문의:{" "}
        <a href={`mailto:${email}`} className="font-medium text-primary underline-offset-4 hover:underline">
          {email}
        </a>
      </p>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">
      문의는 서비스 내 안내 또는 배포 시 설정한 고객 지원 채널을 이용해 주세요. (
      <code className="rounded bg-muted px-1 text-xs">NEXT_PUBLIC_SUPPORT_EMAIL</code>)
    </p>
  );
}
