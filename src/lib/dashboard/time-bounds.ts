/** 워크스페이스 타임존이 Asia/Seoul 일 때 KST 자정 기준 UTC 구간 (그 외는 UTC 자정). */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function dayBoundsIso(displayTimezone: string | null | undefined): { start: string; end: string } {
  if (displayTimezone && displayTimezone !== "Asia/Seoul") {
    const s = new Date();
    s.setUTCHours(0, 0, 0, 0);
    const e = new Date(s);
    e.setUTCDate(e.getUTCDate() + 1);
    return { start: s.toISOString(), end: e.toISOString() };
  }
  const now = Date.now();
  const kstMs = now + KST_OFFSET_MS;
  const kstMidnight = Math.floor(kstMs / 86400000) * 86400000 - KST_OFFSET_MS;
  const next = kstMidnight + 86400000;
  return { start: new Date(kstMidnight).toISOString(), end: new Date(next).toISOString() };
}

export function addDaysIso(isoStart: string, days: number): string {
  const d = new Date(isoStart);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}
