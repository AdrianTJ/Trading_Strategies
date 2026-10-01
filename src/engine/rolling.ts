import { addDays, addMonths, type ISODate } from './dates';
import type { Market } from './market';
import { resolveWindow, simulate, type Plan, type Strategy } from './simulate';

/**
 * The same plan, started in every month of history: one result is one draw, this is
 * the distribution. It answers "was that the strategy, or just the dates I picked?"
 */
export interface RollingResult {
  horizonYears: number;
  /** First trading day of each window. */
  starts: ISODate[];
  /** Per strategy, per window: money-weighted annual return. */
  returns: Float64Array[];
  /** Per strategy, per window: final value ÷ money put in. */
  multiples: Float64Array[];
  stats: RollingStats[];
}

export interface RollingStats {
  median: number;
  worst: { value: number; start: ISODate };
  best: { value: number; start: ISODate };
  /** Share of windows that ended below the money put in. */
  lostMoney: number;
  /** Share of windows where this strategy ended with the most money (ties count for each). */
  cameOutOnTop: number;
}

export function rollingWindows(market: Market, plan: Plan, strategies: readonly Strategy[], horizonYears: number): RollingResult {
  const { dates } = market;
  const lastDate = dates.at(-1)!;
  // Earliest day every asset in play has a price; the first window starts the month after.
  const { earliestIndex } = resolveWindow(market, { ...plan, start: dates[0]!, end: lastDate }, strategies);
  let month = addMonths(dates[earliestIndex]!.slice(0, 7) + '-01', earliestIndex === 0 ? 0 : 1);

  const starts: ISODate[] = [];
  const returns: number[][] = strategies.map(() => []);
  const multiples: number[][] = strategies.map(() => []);
  for (;;) {
    const end = addDays(addMonths(month, 12 * horizonYears), -1);
    if (end > lastDate) break;
    const windowPlan = { ...plan, start: month, end };
    const window = resolveWindow(market, windowPlan, strategies);
    starts.push(dates[window.startIndex]!);
    strategies.forEach((s, k) => {
      const { summary } = simulate(market, windowPlan, s, window);
      returns[k]!.push(summary.moneyWeightedReturn);
      multiples[k]!.push(summary.finalValue / summary.totalContributed);
    });
    month = addMonths(month, 1);
  }

  const stats = strategies.map((_, k) => {
    const r = returns[k]!;
    const m = multiples[k]!;
    let worst = 0;
    let best = 0;
    let lost = 0;
    let top = 0;
    for (let i = 0; i < r.length; i++) {
      if (r[i]! < r[worst]!) worst = i;
      if (r[i]! > r[best]!) best = i;
      if (m[i]! < 1) lost++;
      if (multiples.every((other) => other[i]! <= m[i]! + 1e-12)) top++;
    }
    return {
      median: median(r),
      worst: { value: r[worst] ?? Number.NaN, start: starts[worst]! },
      best: { value: r[best] ?? Number.NaN, start: starts[best]! },
      lostMoney: r.length ? lost / r.length : Number.NaN,
      cameOutOnTop: r.length ? top / r.length : Number.NaN,
    };
  });

  return {
    horizonYears,
    starts,
    returns: returns.map((r) => Float64Array.from(r)),
    multiples: multiples.map((m) => Float64Array.from(m)),
    stats,
  };
}

/** Longest whole-year horizon that fits at least one window for these strategies. */
export function maxHorizonYears(market: Market, plan: Plan, strategies: readonly Strategy[]): number {
  const { dates } = market;
  const { earliestIndex } = resolveWindow(market, { ...plan, start: dates[0]!, end: dates.at(-1)! }, strategies);
  const first = addMonths(dates[earliestIndex]!.slice(0, 7) + '-01', earliestIndex === 0 ? 0 : 1);
  let years = 0;
  while (addDays(addMonths(first, 12 * (years + 1)), -1) <= dates.at(-1)!) years++;
  return years;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

