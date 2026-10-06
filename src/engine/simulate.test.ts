import { describe, expect, it } from 'vitest';
import { syntheticMarket } from './testMarket';
import { resolveWindow, simulate, SimulationError, type Plan, type Strategy } from './simulate';

const flat = syntheticMarket('2020-01-01', 600, { us_stocks: () => 50, us_bonds: () => 20 });
// Grows 0.04% per trading day, smoothly.
const rising = syntheticMarket('2020-01-01', 600, { us_stocks: (i) => 100 * Math.pow(1.0004, i), us_bonds: () => 10 });
// Same, plus T-bills paying 0.01% per trading day.
const withCash = syntheticMarket('2020-01-01', 600, {
  us_stocks: (i) => 100 * Math.pow(1.0004, i),
  cash: (i) => Math.pow(1.0001, i),
});

const earned: Plan = { start: '2020-01-01', end: '2021-12-31', amount: 100, frequency: 'weekly', funding: 'as-earned', initial: 0 };
const windfall: Plan = { ...earned, funding: 'upfront' };
const stocks = (timing: Strategy['timing']): Strategy => ({ allocation: { us_stocks: 100 }, timing, rebalance: 'never' });
const TIMINGS = ['lump', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'] as const;

describe('simulate: money in', () => {
  it.each([earned, windfall])('gives every timing the same money on the same days (%o)', (plan) => {
    const runs = TIMINGS.map((t) => simulate(flat, plan, stocks(t)));
    for (const r of runs) {
      expect(r.summary.totalContributed).toBeCloseTo(runs[0]!.summary.totalContributed, 8);
      expect(Array.from(r.arrivals)).toEqual(Array.from(runs[0]!.arrivals));
    }
  });

  it('pays the amount on every scheduled day when money is earned over time', () => {
    const sim = simulate(flat, earned, stocks('weekly'));
    const paydays = Array.from(sim.arrivals).filter((x) => x > 0);
    expect(paydays.every((x) => x === 100)).toBe(true);
    expect(sim.summary.totalContributed).toBe(100 * paydays.length);
  });

  it('makes the whole budget available on day one for a windfall', () => {
    const a = simulate(flat, earned, stocks('weekly'));
    const b = simulate(flat, windfall, stocks('weekly'));
    expect(b.arrivals[0]).toBe(a.summary.totalContributed);
    expect(Array.from(b.arrivals).slice(1).every((x) => x === 0)).toBe(true);
  });

  it('adds the starting balance on day one', () => {
    const sim = simulate(flat, { ...earned, initial: 5000 }, stocks('monthly'));
    expect(sim.arrivals[0]).toBe(5100);
  });
});

describe('simulate: when it goes in', () => {
  it('invests everything that has arrived when buying less often than paid', () => {
    // Paid weekly, buying monthly: each buy sweeps up the weeks of waiting pay.
    const sim = simulate(flat, earned, stocks('monthly'));
    for (let i = 0; i < sim.buys.length; i++) {
      if (sim.buys[i]! > 0) expect(sim.cash[i]).toBeCloseTo(0, 8);
    }
    expect(sim.summary.finalCash).toBeGreaterThan(0); // pay after the last monthly buy waits
  });

  it('feeds a paycheck in over the buys before the next one when buying more often than paid', () => {
    const plan: Plan = { ...earned, frequency: 'monthly', amount: 400 };
    const sim = simulate(flat, plan, stocks('weekly'));
    const secondPayday = Array.from(sim.arrivals).findIndex((x, i) => i > 0 && x > 0);
    const firstMonth = Array.from(sim.buys.slice(0, secondPayday)).filter((x) => x > 0);
    expect(firstMonth.length).toBeGreaterThanOrEqual(4);
    for (const b of firstMonth) expect(b).toBeCloseTo(400 / firstMonth.length, 6);
  });

  it('spreads a windfall evenly over every buy date (classic dollar-cost averaging)', () => {
    const sim = simulate(flat, windfall, stocks('monthly'));
    const buys = Array.from(sim.buys).filter((x) => x > 0);
    for (const b of buys) expect(b).toBeCloseTo(sim.summary.totalContributed / buys.length, 6);
    expect(sim.summary.finalCash).toBeCloseTo(0, 6);
  });

  it('invests on arrival with "lump" timing', () => {
    for (const plan of [earned, windfall]) {
      const sim = simulate(flat, plan, stocks('lump'));
      for (let i = 0; i < sim.buys.length; i++) expect(sim.buys[i]).toBeCloseTo(sim.arrivals[i]!, 8);
    }
  });

  it('lets waiting cash earn the T-bill rate', () => {
    const sim = simulate(withCash, windfall, stocks('annually'));
    // Before the second yearly buy, the waiting half has grown with T-bills.
    expect(sim.cash[100]!).toBeGreaterThan(sim.cash[1]!);
    const lastCashDay = sim.cash.length - 1;
    expect(sim.value[lastCashDay]).toBeGreaterThan(0);
  });
});

describe('simulate: buy the dip', () => {
  // Climbs to 120 by day 100, falls ~29% to 85 by day 150, recovers to 130 by day 263.
  // (The fall is steep enough that no day sits exactly on a threshold.)
  const vShape = syntheticMarket('2020-01-01', 300, {
    us_stocks: (i) => (i <= 100 ? 100 + 0.2 * i : i <= 150 ? 120 - 0.7 * (i - 100) : Math.min(130, 85 + 0.4 * (i - 150))),
  });
  const plan: Plan = { ...earned, end: '2021-02-01' };
  const dip = (dipPct: number): Strategy => ({ allocation: { us_stocks: 100 }, timing: 'dip', rebalance: 'never', dipPct });

  it('holds cash until the mix is far enough below its high, then invests everything waiting', () => {
    const sim = simulate(vShape, plan, dip(10));
    // 10% below 120 is 108: day 117 is 108.1, day 118 is 107.4.
    const firstBuy = Array.from(sim.buys).findIndex((x) => x > 0);
    expect(firstBuy).toBe(118);
    expect(sim.buys[firstBuy]).toBeCloseTo(sim.contributed[firstBuy]!, 6);
    for (let i = 0; i < firstBuy; i++) expect(sim.cash[i]).toBeCloseTo(sim.contributed[i]!, 6);
  });

  it('keeps investing new money while the dip lasts, and waits again after it ends', () => {
    const sim = simulate(vShape, plan, dip(10));
    const buyDays = Array.from(sim.buys).flatMap((x, i) => (x > 0 ? [i] : []));
    expect(sim.dipDays).toBeGreaterThan(30);
    expect(buyDays.length).toBeGreaterThan(1);
    // Back above 108 from day 208 (85 + 0.4 × 58): pay after that waits in cash.
    expect(buyDays.at(-1)!).toBeLessThan(208);
    expect(sim.summary.finalCash).toBeGreaterThan(0);
  });

  it('never buys if the drop never comes', () => {
    const sim = simulate(rising, earned, dip(10));
    expect(sim.buyCount).toBe(0);
    expect(sim.summary.finalCash).toBeCloseTo(sim.summary.totalContributed, 6);
    expect(sim.summary.averageYearsInvested).toBe(0);
  });

  it('measures the high from all available history, not from the window start', () => {
    // Already 20% below an earlier high when the window opens.
    const fallen = syntheticMarket('2019-01-01', 500, { us_stocks: (i) => (i < 100 ? 100 : 80) });
    const sim = simulate(fallen, { ...earned, start: '2019-09-01', end: '2020-06-01' }, dip(10));
    expect(sim.buys[0]).toBeGreaterThan(0);
  });

  it('needs a deeper drop for a bigger threshold', () => {
    expect(simulate(vShape, plan, dip(20)).dipDays).toBeLessThan(simulate(vShape, plan, dip(10)).dipDays);
    expect(simulate(vShape, plan, dip(30)).buyCount).toBe(0); // bottoms at -29%
  });
});

describe('simulate: results', () => {
  it('is worth exactly what went in when prices never move and cash pays nothing', () => {
    const sim = simulate(flat, earned, { allocation: { us_stocks: 80, us_bonds: 20 }, timing: 'monthly', rebalance: 'quarterly' });
    for (let i = 0; i < sim.value.length; i++) expect(sim.value[i]).toBeCloseTo(sim.contributed[i]!, 8);
    expect(sim.summary.moneyWeightedReturn).toBeCloseTo(0, 8);
    expect(sim.summary.maxDrawdown.depth).toBeCloseTo(0, 12);
  });

  it('gives a windfall invested at once the asset’s own return', () => {
    const sim = simulate(rising, windfall, stocks('lump'));
    const p = rising.assets.us_stocks.prices;
    expect(sim.summary.finalValue / sim.summary.totalContributed).toBeCloseTo(p[sim.endIndex]! / p[sim.startIndex]!, 10);
    // For one deposit, money-weighted and time-weighted agree (up to 365 vs 365.25-day years).
    expect(sim.summary.moneyWeightedReturn).toBeCloseTo(sim.summary.timeWeightedReturn, 3);
  });

  it('keeps the growth index independent of new money for a fully invested portfolio', () => {
    const lump = simulate(rising, windfall, stocks('lump'));
    const onArrival = simulate(rising, earned, stocks('lump'));
    for (let i = 0; i < lump.growthIndex.length; i++) expect(onArrival.growthIndex[i]).toBeCloseTo(lump.growthIndex[i]!, 10);
  });

  it('rewards getting money in sooner in a market that only rises', () => {
    const v = (plan: Plan, t: Strategy['timing']) => simulate(rising, plan, stocks(t)).summary.finalValue;
    // Windfall: all at once beats dripping it in. (Two yearly buys put half in on day
    // one, which is earlier on average than monthly drips, so annual beats monthly here.)
    expect(v(windfall, 'lump')).toBeGreaterThan(v(windfall, 'annually'));
    expect(v(windfall, 'annually')).toBeGreaterThan(v(windfall, 'monthly'));
    // Paid weekly: buying weekly beats saving up for monthly or quarterly buys.
    expect(v(earned, 'weekly')).toBeGreaterThan(v(earned, 'monthly'));
    expect(v(earned, 'monthly')).toBeGreaterThan(v(earned, 'quarterly'));
  });

  it('tracks how long the average dollar was in the market', () => {
    const lump = simulate(flat, windfall, stocks('lump'));
    expect(lump.summary.averageYearsInvested).toBeCloseTo(lump.summary.years, 6);
    const weekly = simulate(flat, earned, stocks('weekly'));
    expect(weekly.summary.averageYearsInvested / weekly.summary.years).toBeCloseTo(0.5, 1);
    // Saving up pay for quarterly buys keeps it out of the market longer.
    expect(simulate(flat, earned, stocks('quarterly')).summary.averageYearsInvested).toBeLessThan(weekly.summary.averageYearsInvested);
  });

  it('restores target weights on rebalance dates and lets them drift otherwise', () => {
    const sim = (rebalance: Strategy['rebalance']) =>
      simulate(rising, windfall, { allocation: { us_stocks: 50, us_bonds: 50 }, timing: 'lump', rebalance });
    const never = sim('never');
    const yearly = sim('annually');
    // Stocks rise, bonds don't: without rebalancing the stock share keeps growing, so it ends higher.
    expect(never.summary.finalValue).toBeGreaterThan(yearly.summary.finalValue);
    expect(yearly.value[100]).toBeCloseTo(never.value[100]!, 8);
  });

  it('measures the worst shortfall below money put in', () => {
    const crash = syntheticMarket('2020-01-01', 300, { us_stocks: (i) => (i < 100 ? 100 : i < 200 ? 60 : 100) });
    const sim = simulate(crash, { ...windfall, end: '2021-02-01' }, stocks('lump'));
    expect(sim.summary.worstShortfall.pct).toBeCloseTo(-0.4);
    expect(sim.summary.maxDrawdown.depth).toBeCloseTo(-0.4);
  });

  it('applies inflation to the real return', () => {
    // CPI rises 1% a month.
    const m = syntheticMarket('2020-01-01', 600, { us_stocks: (i) => 100 * Math.pow(1.0004, i) }, {}, (i) => 100 * Math.pow(1.01, i));
    const s = simulate(m, windfall, stocks('lump')).summary;
    expect(s.realMoneyWeightedReturn).toBeLessThan(s.moneyWeightedReturn - 0.1);
    expect(s.contributedInEndDollars).toBeGreaterThan(s.totalContributed);
  });

  it('rejects a plan with nothing to invest', () => {
    expect(() => simulate(flat, { ...earned, amount: 0 }, stocks('weekly'))).toThrow(SimulationError);
  });
});

describe('resolveWindow', () => {
  const late = syntheticMarket('2020-01-01', 400, { us_stocks: () => 1, gold: () => 1 }, { gold: 200 });
  it('starts when every asset in play has a price', () => {
    const w = resolveWindow(late, earned, [stocks('lump'), { allocation: { gold: 100 }, timing: 'lump', rebalance: 'never' }]);
    expect(w.startIndex).toBe(200);
    expect(resolveWindow(late, earned, [stocks('lump')]).startIndex).toBe(0);
  });
  it('rejects empty windows and empty allocations', () => {
    expect(() => resolveWindow(late, { ...earned, start: '2030-01-01' }, [stocks('lump')])).toThrow(SimulationError);
    expect(() => resolveWindow(late, earned, [{ allocation: {}, timing: 'lump', rebalance: 'never' }])).toThrow(SimulationError);
  });
});
