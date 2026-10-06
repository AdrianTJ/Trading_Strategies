import type { AssetId } from './assets';
import { scheduleDays, type Frequency, type ISODate } from './dates';
import { dayIndexOnOrAfter, firstCommonIndex, indexOnOrAfter, indexOnOrBefore, type Market } from './market';
import { annualize, maxDrawdown, xirrDays, type Drawdown } from './metrics';

/**
 * When money becomes available to invest:
 * - 'as-earned': `amount` arrives every `frequency` period, like a paycheck.
 * - 'upfront': the whole window's budget is available on day one, like a windfall.
 */
export type Funding = 'as-earned' | 'upfront';

/**
 * How much money goes in and when it becomes available, shared by every strategy
 * being compared.
 *
 * Every strategy receives exactly the same money on the same dates. Strategies differ
 * only in when they move that money from cash into the market, so differences in
 * outcome come from the strategy, never from one of them simply having more money.
 */
export interface Plan {
  start: ISODate;
  end: ISODate;
  /** Money available per `frequency` period. */
  amount: number;
  frequency: Frequency;
  funding: Funding;
  /** Optional starting balance, available on day one. */
  initial: number;
}

/** 'lump' = invest money the day it becomes available. */
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
  /** Per trading day in the window: total worth, invested holdings plus waiting cash. */
  value: Float64Array;
  /** Per trading day: cash waiting to be invested (earning the T-bill rate). */
  cash: Float64Array;
  /** Per trading day: cumulative money that has arrived (out of pocket). */
  contributed: Float64Array;
  /** Per trading day: money that arrived that day. */
  arrivals: Float64Array;
  /** Per trading day: money moved from cash into the market that day. */
  buys: Float64Array;
  /** Growth of $1 held through the window, unaffected by new money (time-weighted). */
  growthIndex: Float64Array;
  /** Number of days with a purchase. */
  buyCount: number;
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
  /** Amount-weighted average time each dollar spent in the market (not waiting in cash), in years. */
  averageYearsInvested: number;
  /** Cash still waiting to be invested at the end. */
  finalCash: number;
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

  // Window offset of the trading day each scheduled date executes on. A date that isn't
  // a trading day executes on the next one. Schedules are anchored to a real trading
  // day and capped at another, so every date lands inside the window.
  const executionOffsets = (sched: number[]) => {
    let from = startIndex;
    return sched.map((d) => (from = dayIndexOnOrAfter(days, d, from)) - startIndex);
  };

  // 1. When money arrives. Identical for every strategy compared under this plan.
  const arrivals = new Float64Array(n);
  const paydays = executionOffsets(scheduleDays(startDay, endDay, plan.frequency));
  if (!(plan.amount >= 0 && plan.initial >= 0 && plan.amount * paydays.length + plan.initial > 0)) {
    throw new SimulationError('Nothing to invest: set an amount above zero');
  }
  arrivals[0] = plan.initial;
  if (plan.funding === 'upfront') arrivals[0] += plan.amount * paydays.length;
  else for (const i of paydays) arrivals[i]! += plan.amount;

  // 2. When the strategy invests. Each arrival is spread evenly over the strategy's buy
  // dates before the next arrival: paid weekly and buying monthly invests everything
  // waiting; paid monthly and buying weekly feeds the paycheck in over ~4 buys; a
  // windfall bought monthly is classic dollar-cost averaging. buyShare[i] is the
  // fraction of waiting cash to invest on day i.
  const buyShare = new Float64Array(n);
  const buyDays = strategy.timing === 'lump' ? arrivalOffsets(arrivals) : executionOffsets(scheduleDays(startDay, endDay, strategy.timing));
  const arrivalDays = arrivalOffsets(arrivals);
  let a = 0;
  for (let k = 0; k < buyDays.length; k++) {
    const b = buyDays[k]!;
    while (a < arrivalDays.length && arrivalDays[a]! <= b) a++;
    const nextArrival = a < arrivalDays.length ? arrivalDays[a]! : n;
    let remaining = 0;
    for (let m = k; m < buyDays.length && buyDays[m]! < nextArrival; m++) remaining++;
    buyShare[b] = 1 / remaining;
  }

  const rebalanceOn = new Uint8Array(n);
  if (strategy.rebalance !== 'never') {
    for (const i of executionOffsets(scheduleDays(startDay, endDay, strategy.rebalance).slice(1))) rebalanceOn[i] = 1;
  }

  const weights = weightsOf(strategy.allocation);
  const prices = weights.map(([id]) => market.assets[id].prices);
  const w = weights.map(([, x]) => x);
  const units = new Float64Array(weights.length);
  // Waiting cash earns the T-bill rate (flat in synthetic test markets without cash).
  const cashIndex = market.assets.cash?.prices;

  const value = new Float64Array(n);
  const cashOut = new Float64Array(n);
  const contributed = new Float64Array(n);
  const buys = new Float64Array(n);
  const growthIndex = new Float64Array(n);
  let prevValue = 0;
  let growth = 1;
  let cumulative = 0;
  let cash = 0;
  let buyCount = 0;

  for (let i = 0; i < n; i++) {
    const t = startIndex + i;
    if (i > 0 && cashIndex) cash *= cashIndex[t]! / cashIndex[t - 1]!;
    // Yesterday's holdings at today's prices: the day's market move, before new money.
    let invested = 0;
    for (let j = 0; j < units.length; j++) invested += units[j]! * prices[j]![t]!;
    const pre = invested + cash;
    if (prevValue > 0) growth *= pre / prevValue;

    cash += arrivals[i]!;
    cumulative += arrivals[i]!;

    const buy = cash * buyShare[i]!;
    if (buy > 0) {
      for (let j = 0; j < units.length; j++) units[j]! += (buy * w[j]!) / prices[j]![t]!;
      cash -= buy;
      invested += buy;
      buys[i] = buy;
      buyCount++;
    }
    if (rebalanceOn[i] && invested > 0) {
      for (let j = 0; j < units.length; j++) units[j] = (invested * w[j]!) / prices[j]![t]!;
    }

    const v = invested + cash;
    value[i] = v;
    cashOut[i] = cash;
    contributed[i] = cumulative;
    growthIndex[i] = growth;
    prevValue = v;
  }

  return {
    startIndex,
    endIndex,
    value,
    cash: cashOut,
    contributed,
    arrivals,
    buys,
    growthIndex,
    buyCount,
    summary: summarize(market, startIndex, arrivals, buys, value, cashOut, contributed, growthIndex),
  };
}

function arrivalOffsets(arrivals: Float64Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < arrivals.length; i++) if (arrivals[i]! > 0) out.push(i);
  return out;
}

function summarize(
  market: Market,
  startIndex: number,
  flows: Float64Array,
  buys: Float64Array,
  value: Float64Array,
  cash: Float64Array,
  contributed: Float64Array,
  growthIndex: Float64Array,
): Summary {
  const { days, cpiByDay } = market;
  const n = value.length;
  const endIndex = startIndex + n - 1;
  const span = days[endIndex]! - days[startIndex]!;
  const finalValue = value[n - 1]!;
  const totalContributed = contributed[n - 1]!;

  // Cash flows for XIRR: money arriving (negative), final value back (positive). Using
  // arrivals rather than purchases means time spent waiting in cash counts against the
  // strategy, as it should. The real version restates each arrival in end-date dollars.
  const cpiEnd = cpiByDay[endIndex]!;
  const nominal: number[] = [];
  const real: number[] = [];
  const when: number[] = [];
  let contributedInEndDollars = 0;
  let dollarDays = 0;
  let bought = 0;
  for (let i = 0; i < n; i++) {
    if (buys[i]! > 0) {
      dollarDays += buys[i]! * (days[endIndex]! - days[startIndex + i]!);
      bought += buys[i]!;
    }
    const f = flows[i]!;
    if (f <= 0) continue;
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
    // Over all money that arrived; a dollar that never left cash counts as zero time invested.
    averageYearsInvested: bought > 0 ? dollarDays / totalContributed / 365.25 : 0,
    finalCash: cash[n - 1]!,
    maxDrawdown: maxDrawdown(growthIndex),
    worstShortfall,
    years: span / 365.25,
  };
}
