import { ASSET_BY_ID, ASSETS, type AssetId } from '../engine/assets';
import type { Frequency, ISODate } from '../engine/dates';
import { DEFAULT_DIP_PCT, type Allocation, type Funding, type Plan, type Rebalance, type Strategy, type Timing } from '../engine/simulate';

export interface Scenario extends Strategy {
  /** Stable key for React and for color assignment. */
  id: string;
}

export interface AppState {
  plan: Plan;
  scenarios: Scenario[];
}

export const MAX_SCENARIOS = 4;

export const FREQUENCIES: readonly Frequency[] = ['weekly', 'biweekly', 'monthly', 'quarterly', 'annually'];
export const TIMINGS: readonly Timing[] = ['lump', ...FREQUENCIES, 'dip'];
export const DIP_OPTIONS: readonly number[] = [5, 10, 20, 30];
export const REBALANCES: readonly Rebalance[] = ['never', 'quarterly', 'annually'];
export const FUNDINGS: readonly Funding[] = ['as-earned', 'upfront'];

/** "every ___" in the plan sentence. */
export const FREQUENCY_NOUN: Record<Frequency, string> = {
  weekly: 'week',
  biweekly: 'two weeks',
  monthly: 'month',
  quarterly: 'quarter',
  annually: 'year',
};

export const TIMING_LABEL: Record<Timing, string> = {
  // Invest money the day it's available: everything at once for a windfall, each
  // paycheck as it lands otherwise. One label reads right for both.
  lump: 'Right away',
  weekly: 'Every week',
  biweekly: 'Every two weeks',
  monthly: 'Every month',
  quarterly: 'Every quarter',
  annually: 'Once a year',
  dip: 'Only after a drop',
};

/** How a strategy times its buys, in words ("Every month", "Only after a 10% drop"). */
export function describeTiming(s: Strategy): string {
  return s.timing === 'dip' ? `Only after a ${s.dipPct ?? DEFAULT_DIP_PCT}% drop` : TIMING_LABEL[s.timing];
}

export const REBALANCE_LABEL: Record<Rebalance, string> = {
  never: 'Never rebalance',
  quarterly: 'Rebalance quarterly',
  annually: 'Rebalance yearly',
};

let counter = 0;
export const newId = () => `s${Date.now().toString(36)}${(counter++).toString(36)}`;

const make = (allocation: Allocation, timing: Timing, rebalance: Rebalance = 'annually', dipPct?: number): Scenario => ({
  id: newId(),
  allocation,
  timing,
  rebalance,
  ...(timing === 'dip' ? { dipPct: dipPct ?? DEFAULT_DIP_PCT } : {}),
});

export interface Preset {
  id: string;
  label: string;
  /** The question this comparison answers. */
  question: string;
  build: (plan: Plan) => Scenario[];
  /** Plan settings the question depends on (e.g. a windfall for lump sum vs. spreading out). */
  plan?: Partial<Plan>;
}

export const PRESETS: readonly Preset[] = [
  {
    id: 'mix',
    label: 'Stocks, bonds, or a mix?',
    question: 'Same money, same schedule. Only what you buy changes.',
    build: (p) => [
      make({ us_stocks: 100 }, p.frequency),
      make({ us_bonds: 100 }, p.frequency),
      make({ us_stocks: 80, us_bonds: 20 }, p.frequency),
    ],
  },
  {
    id: 'cadence',
    label: 'Weekly or monthly?',
    question: 'Paid on the same schedule, buying the same S&P 500 fund. Only how often you buy changes; pay waiting to be invested earns T-bill interest.',
    plan: { funding: 'as-earned' },
    build: () => [make({ us_stocks: 100 }, 'weekly'), make({ us_stocks: 100 }, 'monthly'), make({ us_stocks: 100 }, 'quarterly')],
  },
  {
    id: 'lump',
    label: 'All at once or over time?',
    question: 'You have the whole amount today. Invest it right away, or keep it in T-bills and feed it in month by month?',
    plan: { funding: 'upfront' },
    build: () => [make({ us_stocks: 100 }, 'lump'), make({ us_stocks: 100 }, 'monthly')],
  },
  {
    id: 'dip',
    label: 'Wait for a dip?',
    question: 'Same paychecks. Invest each one right away, or hold it in T-bills until the S&P 500 is 10% or 20% below its high?',
    plan: { funding: 'as-earned' },
    build: () => [make({ us_stocks: 100 }, 'lump'), make({ us_stocks: 100 }, 'dip', 'annually', 10), make({ us_stocks: 100 }, 'dip', 'annually', 20)],
  },
  {
    id: 'gold',
    label: 'Does adding gold help?',
    question: 'A classic stock/bond mix with and without a slice of gold.',
    build: (p) => [make({ us_stocks: 60, us_bonds: 40 }, p.frequency), make({ us_stocks: 50, us_bonds: 35, gold: 15 }, p.frequency)],
  },
];

export const allocationTotal = (a: Allocation) => Object.values(a).reduce((s, w) => s + (w ?? 0), 0);

export const isValidAllocation = (a: Allocation) => Math.abs(allocationTotal(a) - 100) < 1e-6;

/** Assets held, in display order, with their weights. */
export function holdings(a: Allocation): [AssetId, number][] {
  return ASSETS.filter((x) => (a[x.id] ?? 0) > 0).map((x) => [x.id, a[x.id]!]);
}

export function describeAllocation(a: Allocation): string {
  const h = holdings(a);
  if (h.length === 1) return `${ASSET_BY_ID[h[0]![0]].name}`;
  return h.map(([id, w]) => `${w}% ${ASSET_BY_ID[id].name}`).join(' · ');
}

/**
 * Names for a set of scenarios that show what actually differs between them:
 * if they all hold the same thing, name them by timing; if they all buy on the same
 * schedule, name them by holdings; otherwise both. Rebalancing only appears when it's
 * the distinguishing choice.
 */
export function labelScenarios(scenarios: readonly Scenario[]): string[] {
  const allocKey = (s: Scenario) => JSON.stringify(holdings(s.allocation));
  const differs = <T,>(f: (s: Scenario) => T) => new Set(scenarios.map(f)).size > 1;
  const byAlloc = differs(allocKey);
  const byTiming = differs((s) => describeTiming(s));
  // Rebalancing only means something for mixes, so only compare it among them.
  const mixes = scenarios.filter((s) => holdings(s.allocation).length > 1);
  const byRebalance = new Set(mixes.map((s) => s.rebalance)).size > 1;
  return scenarios.map((s) => {
    const parts: string[] = [];
    if (byAlloc || (!byTiming && !byRebalance)) parts.push(describeAllocation(s.allocation));
    if (byTiming) parts.push(describeTiming(s).toLowerCase());
    if (byRebalance && holdings(s.allocation).length > 1) parts.push(REBALANCE_LABEL[s.rebalance].toLowerCase());
    const label = parts.join(', ');
    return label.charAt(0).toUpperCase() + label.slice(1);
  });
}

// --- URL state ---------------------------------------------------------------
// The whole comparison lives in the URL hash, so any result can be bookmarked or shared.
// Format (compact, human-readable):
//   #from=2020-01-01&to=2026-09-30&amt=100&every=weekly&fund=upfront&init=0&raise=3&s=us_stocks:80,us_bonds:20~weekly~annually&s=...

const ASSET_IDS = new Set<string>(ASSETS.map((a) => a.id));
const isDate = (d: string | null): d is ISODate => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

export function encodeState({ plan, scenarios }: AppState): string {
  const q = new URLSearchParams();
  q.set('from', plan.start);
  q.set('to', plan.end);
  q.set('amt', String(plan.amount));
  q.set('every', plan.frequency);
  if (plan.funding !== 'as-earned') q.set('fund', plan.funding);
  if (plan.initial) q.set('init', String(plan.initial));
  if (plan.raise) q.set('raise', String(plan.raise));
  for (const s of scenarios) {
    const alloc = holdings(s.allocation)
      .map(([id, w]) => `${id}:${w}`)
      .join(',');
    q.append('s', `${alloc}~${s.timing}~${s.rebalance}${s.timing === 'dip' ? `~${s.dipPct ?? DEFAULT_DIP_PCT}` : ''}`);
  }
  // Commas and colons are safe in a hash; keep them readable.
  return q.toString().replace(/%2C/g, ',').replace(/%3A/g, ':').replace(/%7E/gi, '~');
}

/** Parse a hash; anything malformed returns null and the caller falls back to defaults. */
export function decodeState(hash: string): AppState | null {
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  const start = q.get('from');
  const end = q.get('to');
  const amount = Number(q.get('amt'));
  const frequency = q.get('every') as Frequency;
  const initial = Number(q.get('init') ?? 0);
  const funding = (q.get('fund') ?? 'as-earned') as Funding;
  const raise = Number(q.get('raise') ?? 0);
  if (!(raise >= 0 && raise <= 50)) return null;
  if (!isDate(start) || !isDate(end) || !(amount >= 0) || !(initial >= 0) || !FREQUENCIES.includes(frequency)) return null;
  if (!FUNDINGS.includes(funding)) return null;

  const scenarios: Scenario[] = [];
  for (const raw of q.getAll('s').slice(0, MAX_SCENARIOS)) {
    const [allocPart, timing, rebalance, dipRaw] = raw.split('~');
    if (!allocPart || !TIMINGS.includes(timing as Timing) || !REBALANCES.includes(rebalance as Rebalance)) return null;
    const dipPct = timing === 'dip' ? Number(dipRaw ?? DEFAULT_DIP_PCT) : undefined;
    if (dipPct !== undefined && !(dipPct > 0 && dipPct < 100)) return null;
    const allocation: Allocation = {};
    for (const pair of allocPart.split(',')) {
      const [id, w] = pair.split(':');
      const weight = Number(w);
      if (!id || !ASSET_IDS.has(id) || !(weight > 0 && weight <= 100)) return null;
      allocation[id as AssetId] = weight;
    }
    scenarios.push({ id: newId(), allocation, timing: timing as Timing, rebalance: rebalance as Rebalance, ...(dipPct !== undefined ? { dipPct } : {}) });
  }
  if (scenarios.length === 0) return null;
  return { plan: { start, end, amount, frequency, funding, initial, ...(raise ? { raise } : {}) }, scenarios };
}
