import type { AssetId } from './assets';
import { scheduleDays, type Frequency, type ISODate } from './dates';
import { dayIndexOnOrAfter, firstCommonIndex, indexOnOrAfter, indexOnOrBefore, type Market } from './market';
import { annualize, maxDrawdown, xirrDays, type Drawdown } from './metrics';

/**
 * How much money goes in, shared by every strategy being compared.
 *
 * The user states a budget the way they think about it ("$100 every week"). Every
 * strategy then invests exactly the same total over the same window, only spread
 * differently, so differences in outcome come from the strategy and not from one
 * of them simply having more money in.
 */
export interface Plan {
  start: ISODate;
  end: ISODate;
  /** Contribution per `frequency` period. */
  amount: number;
  frequency: Frequency;
  /** Optional starting balance, invested on day one by every strategy. */
  initial: number;
}

/** 'lump' = put the whole window's budget in on day one. */
export type Timing = 'lump' | Frequency;
export type Rebalance = 'never' | 'quarterly' | 'annually';

/** Percent per asset; should sum to 100. */
export type Allocation = Partial<Record<AssetId, number>>;

export interface Strategy {
  allocation: Allocation;
  timing: Timing;
  rebalance: Rebalance;
}

export interface Simulation {
  /** Calendar index range [startIndex, endIndex] in market.dates. */
  startIndex: number;
  endIndex: number;
  /** Per trading day in the window. */
  value: Float64Array;
  contributed: Float64Array;
  /** Growth of $1 held through the window, unaffected by contributions (time-weighted). */
  growthIndex: Float64Array;
  /** Amount invested per contribution under this strategy's timing. */
  perContribution: number;
  contributionCount: number;
  summary: Summary;
}

export interface Summary {
  finalValue: number;
  totalContributed: number;
  gain: number;
  /** finalValue / totalContributed - 1 */
  gainPct: number;
  /** XIRR: annual return on the money actually invested, when it was invested. */
  moneyWeightedReturn: number;
  /** Annualized growth of the portfolio itself, ignoring when money arrived. */
  timeWeightedReturn: number;
  /** XIRR after converting every flow to end-date dollars with CPI. */
  realMoneyWeightedReturn: number;
  /** All contributions restated in end-date dollars. */
  contributedInEndDollars: number;
  /** Amount-weighted average time each contributed dollar spent invested, in years. */
  averageYearsInvested: number;
  /** Worst fall of the portfolio from a high (time-weighted, so new money can't hide it). */
  maxDrawdown: Drawdown;
  /** Most the portfolio was ever worth less than what had been put in (<= 0). */
  worstShortfall: { amount: number; pct: number; index: number };
  years: number;
}

export class SimulationError extends Error {}

function weightsOf(allocation: Allocation): [AssetId, number][] {
  const entries = (Object.entries(allocation) as [AssetId, number][]).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) throw new SimulationError('Allocation is empty');
  return entries.map(([id, w]) => [id, w / total]);
}

/**
 * The trading-day window a plan covers for a set of strategies: the start snaps
 * forward to the first trading day on which every asset involved has a price, the end
 * snaps back to the last trading day on or before the requested end.
 */
export function resolveWindow(market: Market, plan: Plan, strategies: readonly Strategy[]) {
  const ids = new Set<AssetId>();
  for (const s of strategies) for (const [id] of weightsOf(s.allocation)) ids.add(id);
  const earliest = firstCommonIndex(market, ids);
  const startIndex = Math.max(earliest, indexOnOrAfter(market.dates, plan.start));
  const endIndex = indexOnOrBefore(market.dates, plan.end);
  if (startIndex >= market.dates.length || endIndex <= startIndex) {
    throw new SimulationError('The date range has no trading days for the chosen assets');
  }
  return { startIndex, endIndex, earliestIndex: earliest };
}

export function simulate(market: Market, plan: Plan, strategy: Strategy, window = resolveWindow(market, plan, [strategy])): Simulation {
  const { days } = market;
  const { startIndex, endIndex } = window;
  const n = endIndex - startIndex + 1;
  const startDay = days[startIndex]!;
  const endDay = days[endIndex]!;

  // Same total budget for every timing: the plan's own schedule decides the total.
  const recurringTotal = plan.amount * scheduleDays(startDay, endDay, plan.frequency).length;
  if (!(plan.amount >= 0 && plan.initial >= 0 && recurringTotal + plan.initial > 0)) {
    throw new SimulationError('Nothing to invest: set an amount above zero');
  }

  // Window offset of the trading day each scheduled date executes on. A date that isn't
  // a trading day executes on the next one. Schedules are anchored to a real trading
  // day and capped at another, so every date lands inside the window.
  const executionOffsets = (sched: number[]) => {
    let from = startIndex;
    return sched.map((d) => (from = dayIndexOnOrAfter(days, d, from)) - startIndex);
  };

  const flows = new Float64Array(n);
  flows[0] = plan.initial;
  let perContribution: number;
  let contributionCount: number;
  if (strategy.timing === 'lump') {
    flows[0] += recurringTotal;
    perContribution = recurringTotal;
    contributionCount = 1;
  } else {
    const when = executionOffsets(scheduleDays(startDay, endDay, strategy.timing));
    perContribution = recurringTotal / when.length;
    contributionCount = when.length;
    for (const i of when) flows[i]! += perContribution;
  }

  const rebalanceOn = new Uint8Array(n);
  if (strategy.rebalance !== 'never') {
    for (const i of executionOffsets(scheduleDays(startDay, endDay, strategy.rebalance).slice(1))) rebalanceOn[i] = 1;
  }

  const weights = weightsOf(strategy.allocation);
  const prices = weights.map(([id]) => market.assets[id].prices);
  const w = weights.map(([, x]) => x);
  const units = new Float64Array(weights.length);

  const value = new Float64Array(n);
  const contributed = new Float64Array(n);
  const growthIndex = new Float64Array(n);
  let prevValue = 0;
  let growth = 1;
  let cumulative = 0;

  for (let i = 0; i < n; i++) {
    const t = startIndex + i;
    // Yesterday's holdings at today's prices: the day's market move, before new money.
    let pre = 0;
    for (let j = 0; j < units.length; j++) pre += units[j]! * prices[j]![t]!;
    if (prevValue > 0) growth *= pre / prevValue;

    const flow = flows[i]!;
    if (flow > 0) {
      for (let j = 0; j < units.length; j++) units[j]! += (flow * w[j]!) / prices[j]![t]!;
    }
    const v = pre + flow;
    if (rebalanceOn[i] && v > 0) {
      for (let j = 0; j < units.length; j++) units[j] = (v * w[j]!) / prices[j]![t]!;
    }

    cumulative += flow;
    value[i] = v;
    contributed[i] = cumulative;
    growthIndex[i] = growth;
    prevValue = v;
  }

  return {
    startIndex,
    endIndex,
    value,
    contributed,
    growthIndex,
    perContribution,
    contributionCount,
    summary: summarize(market, startIndex, flows, value, contributed, growthIndex),
  };
}

function summarize(
  market: Market,
  startIndex: number,
  flows: Float64Array,
  value: Float64Array,
  contributed: Float64Array,
  growthIndex: Float64Array,
): Summary {
  const { days, cpiByDay } = market;
  const n = value.length;
  const endIndex = startIndex + n - 1;
  const span = days[endIndex]! - days[startIndex]!;
  const finalValue = value[n - 1]!;
  const totalContributed = contributed[n - 1]!;

  // Cash flows for XIRR: contributions out (negative), final value back (positive).
  // The real version restates each contribution in end-date dollars.
  const cpiEnd = cpiByDay[endIndex]!;
  const nominal: number[] = [];
  const real: number[] = [];
  const when: number[] = [];
  let contributedInEndDollars = 0;
  let dollarDays = 0;
  for (let i = 0; i < n; i++) {
    const f = flows[i]!;
    if (f <= 0) continue;
    dollarDays += f * (days[endIndex]! - days[startIndex + i]!);
    const inEndDollars = (f * cpiEnd) / cpiByDay[startIndex + i]!;
    nominal.push(-f);
    real.push(-inEndDollars);
    when.push(days[startIndex + i]!);
    contributedInEndDollars += inEndDollars;
  }
  nominal.push(finalValue);
  real.push(finalValue);
  when.push(days[endIndex]!);

  let worstShortfall = { amount: 0, pct: 0, index: 0 };
  for (let i = 0; i < n; i++) {
    const gap = value[i]! - contributed[i]!;
    if (gap < worstShortfall.amount) worstShortfall = { amount: gap, pct: gap / contributed[i]!, index: i };
  }

  return {
    finalValue,
    totalContributed,
    gain: finalValue - totalContributed,
    gainPct: finalValue / totalContributed - 1,
    moneyWeightedReturn: xirrDays(nominal, when),
    timeWeightedReturn: annualize(growthIndex[n - 1]!, span),
    realMoneyWeightedReturn: xirrDays(real, when),
    contributedInEndDollars,
    averageYearsInvested: dollarDays / totalContributed / 365.25,
    maxDrawdown: maxDrawdown(growthIndex),
    worstShortfall,
    years: span / 365.25,
  };
}
