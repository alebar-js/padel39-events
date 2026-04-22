import type { ITournamentDay } from "./models/TournamentDay";

export interface HHMM {
  h: number;
  m: number;
}

export function parseHHmm(s: string): HHMM {
  const [h, m] = s.split(":").map(Number);
  return { h, m };
}

export function formatHHmm({ h, m }: HHMM): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addMinutes(hhmm: string, minutes: number): string {
  const { h, m } = parseHHmm(hhmm);
  const total = h * 60 + m + minutes;
  return formatHHmm({ h: Math.floor(total / 60), m: total % 60 });
}

function toMinutes(hhmm: string): number {
  const { h, m } = parseHHmm(hhmm);
  return h * 60 + m;
}

export function slotsForDay(
  day: Pick<ITournamentDay, "startTime" | "endTime" | "slotMinutes">
): string[] {
  const end = toMinutes(day.endTime);
  const slots: string[] = [];
  let cursor = toMinutes(day.startTime);
  while (cursor + day.slotMinutes <= end) {
    slots.push(formatHHmm({ h: Math.floor(cursor / 60), m: cursor % 60 }));
    cursor += day.slotMinutes;
  }
  return slots;
}

export function slotDateTime(
  day: Pick<ITournamentDay, "date">,
  slot: string
): Date {
  const { h, m } = parseHHmm(slot);
  const d = new Date(day.date);
  d.setUTCHours(h, m, 0, 0);
  return d;
}

export function findMatchAtSlot<M extends { courtId?: unknown; scheduledTime?: Date | null }>(
  matches: M[],
  courtId: string,
  when: Date
): M | undefined {
  const t = when.getTime();
  return matches.find(
    (m) =>
      m.courtId != null &&
      String(m.courtId) === courtId &&
      m.scheduledTime instanceof Date &&
      m.scheduledTime.getTime() === t
  );
}
