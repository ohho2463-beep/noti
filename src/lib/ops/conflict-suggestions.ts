import type { SupabaseClient } from "@supabase/supabase-js";

type BusyRange = { start: number; end: number };

function intersects(a: BusyRange, b: BusyRange) {
  return a.start < b.end && a.end > b.start;
}

function toRanges(
  rows: Array<{ start_time: string; end_time: string }>,
  fromMs: number,
  toMs: number
): BusyRange[] {
  return rows
    .map((r) => ({
      start: new Date(r.start_time).getTime(),
      end: new Date(r.end_time).getTime(),
    }))
    .filter((r) => Number.isFinite(r.start) && Number.isFinite(r.end) && r.end > r.start)
    .map((r) => ({
      start: Math.max(r.start, fromMs),
      end: Math.min(r.end, toMs),
    }))
    .filter((r) => r.end > r.start);
}

export async function suggestConflictResolutionSlots(
  supabase: SupabaseClient,
  input: {
    scheduleAId: string;
    scheduleBId: string;
    overlapMinutes: number;
  }
) {
  const [{ data: participantsA }, { data: participantsB }] = await Promise.all([
    supabase.from("schedule_participants").select("user_id").eq("schedule_id", input.scheduleAId),
    supabase.from("schedule_participants").select("user_id").eq("schedule_id", input.scheduleBId),
  ]);

  const userIds = [
    ...new Set([...(participantsA ?? []), ...(participantsB ?? [])].map((r) => r.user_id as string)),
  ];
  if (userIds.length === 0) {
    return [];
  }

  const horizonStart = Date.now();
  const horizonEnd = horizonStart + 7 * 24 * 60 * 60 * 1000;

  const { data: busyRows } = await supabase
    .from("schedule_participants")
    .select("user_id, schedules!inner(start_time, end_time)")
    .in("user_id", userIds);

  const busy = toRanges(
    (busyRows ?? []).flatMap((row) => {
      const raw = row.schedules as
        | { start_time: string; end_time: string }
        | { start_time: string; end_time: string }[]
        | null;
      if (!raw) {
        return [];
      }
      return Array.isArray(raw) ? raw : [raw];
    }),
    horizonStart,
    horizonEnd
  );

  const slotMinutes = Math.max(30, Math.ceil(input.overlapMinutes / 30) * 30);
  const slotMs = slotMinutes * 60 * 1000;
  const stepMs = 30 * 60 * 1000;

  const result: Array<{ startIso: string; endIso: string; label: string }> = [];
  for (let t = horizonStart; t + slotMs <= horizonEnd; t += stepMs) {
    const start = new Date(t);
    const hour = start.getHours();
    if (hour < 9 || hour >= 19) {
      continue;
    }
    const candidate = { start: t, end: t + slotMs };
    const blocked = busy.some((b) => intersects(candidate, b));
    if (!blocked) {
      const end = new Date(candidate.end);
      result.push({
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        label: `${start.toLocaleString("ko")} ~ ${end.toLocaleTimeString("ko", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      });
      if (result.length >= 3) {
        break;
      }
    }
  }

  return result;
}
