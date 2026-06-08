/** Tournament round calendar — canonical copy of tour.html logic */

export const TOTAL_ROUNDS = 53;

export interface RoundDates {
  roundNumber: number;
  startDate: string;
  endDate: string;
  label: string;
}

const MONTHS = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];

export function getRoundForDate(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00');
  if (d < new Date('2026-01-01T00:00:00')) return 0;
  if (d <= new Date('2026-01-02T23:59:59')) return 1;
  const r2 = new Date('2026-01-03T00:00:00');
  const diff = Math.floor((d.getTime() - r2.getTime()) / (24 * 3600 * 1000));
  const rn = Math.floor(diff / 7) + 2;
  return Math.max(1, Math.min(rn, TOTAL_ROUNDS));
}

export function getCurrentRound(now = new Date()): number {
  const iso = now.toISOString().split('T')[0];
  return getRoundForDate(iso);
}

/** Last fully completed round (Saturday cron target). */
export function getCompletedRound(now = new Date()): number {
  return Math.max(0, getCurrentRound(now) - 1);
}

export function getRoundDates(roundNumber: number): RoundDates {
  if (roundNumber === 1) {
    return {
      roundNumber: 1,
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      label: '1–2 ЯНВ',
    };
  }
  const start = new Date('2026-01-03T12:00:00');
  start.setDate(start.getDate() + (roundNumber - 2) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fin = new Date('2026-12-31T12:00:00');
  if (end > fin) end.setTime(fin.getTime());

  const sm = MONTHS[start.getMonth()];
  const em = MONTHS[end.getMonth()];
  const label =
    sm === em
      ? `${start.getDate()}–${end.getDate()} ${sm}`
      : `${start.getDate()} ${sm}–${end.getDate()} ${em}`;

  return {
    roundNumber,
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    label,
  };
}

export function dayBefore(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return toIsoDate(d);
}

export function listRoundDates(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const cur = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  while (cur <= end) {
    out.push(toIsoDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function toIsoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}
