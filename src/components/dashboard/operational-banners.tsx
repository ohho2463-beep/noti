/**
 * 서버에서 env 유무를 넘겨 대시보드 상단에만 표시합니다.
 */
export function OperationalBanners({
  showResendMissing,
  showCronSecretMissing,
}: {
  showResendMissing: boolean;
  showCronSecretMissing: boolean;
}) {
  if (!showResendMissing && !showCronSecretMissing) {
    return null;
  }

  return (
    <div className="mb-4 space-y-2">
      {showResendMissing ? (
        <div
          role="status"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
        >
          <strong className="font-medium">메일 알림</strong> —{" "}
          <code className="rounded bg-background/60 px-1 py-0.5 text-xs">RESEND_API_KEY</code>가
          설정되지 않았습니다. D-day·리마인더 <strong>메일</strong>은 전송되지 않으며,{" "}
          <strong>인앱 알림</strong>(알림 벨)은 크론이 동작할 때 계속 생성됩니다. 자세한 환경 변수는{" "}
          <code className="text-xs">docs/DEPLOYMENT.md</code>를 참고하세요.
        </div>
      ) : null}
      {showCronSecretMissing ? (
        <div
          role="status"
          className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-950 dark:text-sky-100"
        >
          <strong className="font-medium">크론 보안</strong> —{" "}
          <code className="rounded bg-background/60 px-1 py-0.5 text-xs">CRON_SECRET</code>가 비어
          있으면 일정 알림 API가 401을 반환합니다. Vercel Cron 또는 외부 스케줄러에서 호출하려면
          설정이 필요합니다.
        </div>
      ) : null}
    </div>
  );
}
