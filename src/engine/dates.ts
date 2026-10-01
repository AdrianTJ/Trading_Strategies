/** Calendar dates as ISO strings (YYYY-MM-DD). They sort and compare lexicographically. */
export type ISODate = string;

const DAY_MS = 86_400_000;

export const toUTC = (d: ISODate): number => Date.parse(`${d}T00:00:00Z`);
export const fromUTC = (ms: number): ISODate => new Date(ms).toISOString().slice(0, 10);

export const addDays = (d: ISODate, n: number): ISODate => fromUTC(toUTC(d) + n * DAY_MS);

export const daysBetween = (a: ISODate, b: ISODate): number => Math.round((toUTC(b) - toUTC(a)) / DAY_MS);

/** Whole days since 1970-01-01. The engine's hot loops work in these, not strings. */
export const toDay = (d: ISODate): number => Math.round(toUTC(d) / DAY_MS);
export const fromDay = (n: number): ISODate => fromUTC(n * DAY_MS);

/** Add calendar months, clamping to the month's last day (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(d: ISODate, n: number): ISODate {
  const [y, m, day] = d.split('-').map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12; // 0-based
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return fromUTC(Date.UTC(ny, nm, Math.min(day, lastDay)));
}

export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';

const STEP: Record<Frequency, { days: number } | { months: number }> = {
  weekly: { days: 7 },
  biweekly: { days: 14 },
  monthly: { months: 1 },
  quarterly: { months: 3 },
  annually: { months: 12 },
};

export const PER_YEAR: Record<Frequency, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  annually: 1,
};

/**
 * Day numbers from `startDay` stepping by `freq`, up to and including `endDay`. Each
 * date is computed from the anchor (start + k steps), never from the previous date, so
 * month-end clamping can't drift (Jan 31 → Feb 28 → Mar 31, not Mar 28).
 */
export function scheduleDays(startDay: number, endDay: number, freq: Frequency): number[] {
  const step = STEP[freq];
  const out: number[] = [];
  if ('days' in step) {
    for (let d = startDay; d <= endDay; d += step.days) out.push(d);
    return out;
  }
  const anchor = new Date(startDay * DAY_MS);
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();
  const day = anchor.getUTCDate();
  for (let k = 0; ; k += step.months) {
    const lastDay = new Date(Date.UTC(y, m + k + 1, 0)).getUTCDate();
    const d = Date.UTC(y, m + k, Math.min(day, lastDay)) / DAY_MS;
    if (d > endDay) return out;
    out.push(d);
  }
}

/** `scheduleDays` for ISO dates. */
export const scheduleDates = (start: ISODate, end: ISODate, freq: Frequency): ISODate[] =>
  scheduleDays(toDay(start), toDay(end), freq).map(fromDay);
