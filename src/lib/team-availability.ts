export type ScheduleBlock = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  project_id: string;
  project_name?: string;
  participant_ids: string[];
};

function intervalsOverlap(a0: number, a1: number, b0: number, b1: number) {
  return a0 < b1 && b0 < a1;
}

/** 동일 참여자가 겹치는 일정 쌍 */
export function findScheduleConflicts(blocks: ScheduleBlock[]): {
  userId: string;
  a: ScheduleBlock;
  b: ScheduleBlock;
}[] {
  const out: { userId: string; a: ScheduleBlock; b: ScheduleBlock }[] = [];
  for (const u of new Set(blocks.flatMap((b) => b.participant_ids))) {
    const mine = blocks.filter((b) => b.participant_ids.includes(u));
    for (let i = 0; i < mine.length; i++) {
      for (let j = i + 1; j < mine.length; j++) {
        const a = mine[i];
        const b = mine[j];
        const a0 = new Date(a.start_time).getTime();
        const a1 = new Date(a.end_time).getTime();
        const b0 = new Date(b.start_time).getTime();
        const b1 = new Date(b.end_time).getTime();
        if (Number.isNaN(a0) || Number.isNaN(a1) || Number.isNaN(b0) || Number.isNaN(b1)) {
          continue;
        }
        if (intervalsOverlap(a0, a1, b0, b1)) {
          out.push({ userId: u, a, b });
        }
      }
    }
  }
  return out;
}

function dayKeyLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 멤버 × 날짜(YYYY-MM-DD) → 해당 일에 겹치는 일정 블록 수(부하 지표) */
export function buildLoadMatrix(
  memberIds: string[],
  dayKeys: string[],
  blocks: ScheduleBlock[]
): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {};
  for (const uid of memberIds) {
    matrix[uid] = {};
    for (const dk of dayKeys) {
      matrix[uid][dk] = 0;
    }
  }
  for (const uid of memberIds) {
    for (const b of blocks) {
      if (!b.participant_ids.includes(uid)) {
        continue;
      }
      const s = new Date(b.start_time);
      const e = new Date(b.end_time);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
        continue;
      }
      for (const dk of dayKeys) {
        const [yy, mm, dd] = dk.split("-").map(Number);
        const dayStart = new Date(yy, mm - 1, dd, 0, 0, 0, 0);
        const dayEnd = new Date(yy, mm - 1, dd, 23, 59, 59, 999);
        if (intervalsOverlap(s.getTime(), e.getTime(), dayStart.getTime(), dayEnd.getTime())) {
          matrix[uid][dk] += 1;
        }
      }
    }
  }
  return matrix;
}

export function mondayWeekDays(anchor: Date): string[] {
  const d = new Date(anchor);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    keys.push(dayKeyLocal(x));
  }
  return keys;
}

export function parseWeekOffset(anchor: Date, offset: number): Date {
  const d = new Date(anchor);
  d.setDate(d.getDate() + offset * 7);
  return d;
}
