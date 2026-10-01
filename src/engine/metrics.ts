import { daysBetween, type ISODate } from './dates';

export interface CashFlow {
  date: ISODate;
  /** Negative = money in (a contribution), positive = money out (the final value). */
  amount: number;
}

/**
 * Money-weighted annual return (XIRR): the single yearly rate that makes the
 * cash flows' present value zero. It is the right "annual return" for someone who
 * adds money over time, because each dollar is only credited for the time it was invested.
 * Returns NaN if no rate solves it.
 */
export function xirr(flows: readonly CashFlow[]): number {
  if (flows.length === 0) return Number.NaN;
  const t0 = flows[0]!.date;
  return xirrDays(
    flows.map((f) => f.amount),
    flows.map((f) => daysBetween(t0, f.date)),
  );
}

/** XIRR over parallel arrays: amounts and their dates as day numbers (any origin). */
export function xirrDays(amounts: ArrayLike<number>, days: ArrayLike<number>): number {
  const n = amounts.length;
  if (n < 2) return Number.NaN;
  const ts = new Float64Array(n);
  for (let i = 0; i < n; i++) ts[i] = (days[i]! - days[0]!) / 365;
  const npv = (r: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += amounts[i]! * Math.pow(1 + r, -ts[i]!);
    return s;
  };

  // Newton's method. Start from the simple rate implied by total in vs total out over
  // the money's average time invested, which is usually within a step or two of the answer.
  let paidIn = 0;
  let paidOut = 0;
  let weightedT = 0;
  for (let i = 0; i < n; i++) {
    const a = amounts[i]!;
    if (a < 0) {
      paidIn -= a;
      weightedT -= a * ts[i]!;
    } else paidOut += a;
  }
  const avgHold = ts[n - 1]! - weightedT / (paidIn || 1);
  let r = paidIn > 0 && paidOut > 0 && avgHold > 0 ? Math.pow(paidOut / paidIn, 1 / avgHold) - 1 : 0.08;
  if (!Number.isFinite(r) || r <= -1) r = 0.08;
  for (let iter = 0; iter < 50; iter++) {
    // NPV and its derivative in one pass, sharing the expensive pow.
    let f = 0;
    let d = 0;
    for (let i = 0; i < n; i++) {
      const pv = amounts[i]! * Math.pow(1 + r, -ts[i]!);
      f += pv;
      d -= (ts[i]! * pv) / (1 + r);
    }
    if (!Number.isFinite(f) || !Number.isFinite(d) || d === 0) break;
    const next = r - f / d;
    if (!(next > -1)) break;
    if (Math.abs(next - r) < 1e-10) return next;
    r = next;
  }

  // Fallback: bisection. NPV is decreasing in r for "pay in, then receive" flows.
  let lo = -0.9999;
  let hi = 100;
  let flo = npv(lo);
  if (Math.sign(flo) === Math.sign(npv(hi))) return Number.NaN;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = npv(mid);
    if (Math.abs(fm) < 1e-9 || hi - lo < 1e-12) return mid;
    if (Math.sign(fm) === Math.sign(flo)) {
      lo = mid;
      flo = fm;
    } else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Annualize a growth multiple earned over `days` calendar days. */
export function annualize(multiple: number, days: number): number {
  if (!(multiple > 0) || days <= 0) return Number.NaN;
  return Math.pow(multiple, 365.25 / days) - 1;
}

export interface Drawdown {
  /** Fractional fall from the peak, e.g. -0.34. Zero if it never fell. */
  depth: number;
  peakIndex: number;
  troughIndex: number;
}

/** Largest peak-to-trough fall in a series. */
export function maxDrawdown(series: ArrayLike<number>): Drawdown {
  let peak = series[0] ?? 0;
  let peakIdx = 0;
  let worst: Drawdown = { depth: 0, peakIndex: 0, troughIndex: 0 };
  for (let i = 1; i < series.length; i++) {
    const v = series[i]!;
    if (v > peak) {
      peak = v;
      peakIdx = i;
    } else if (peak > 0) {
      const dd = v / peak - 1;
      if (dd < worst.depth) worst = { depth: dd, peakIndex: peakIdx, troughIndex: i };
    }
  }
  return worst;
}
