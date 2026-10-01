import { describe, expect, it } from 'vitest';
import { syntheticMarket } from './testMarket';
import { resolveWindow, simulate, SimulationError, type Plan, type Strategy } from './simulate';

const flat = syntheticMarket('2020-01-01', 600, { us_stocks: () => 50, us_bonds: () => 20 });
// Grows 0.04% per trading day, smoothly.
const rising = syntheticMarket('2020-01-01', 600, { us_stocks: (i) => 100 * Math.pow(1.0004, i), us_bonds: () => 10 });

const plan: Plan = { start: '2020-01-01', end: '2021-12-31', amount: 100, frequency: 'weekly', initial: 0 };
const stocks = (timing: Strategy['timing']): Strategy => ({ allocation: { us_stocks: 100 }, timing, rebalance: 'never' });

describe('simulate', () => {
  it('invests the same total for every timing, so only timing differs', () => {
    const totals = (['lump', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'] as const).map(
      (t) => simulate(flat, plan, stocks(t)).summary.totalContributed,
    );
    for (const t of totals) expect(t).toBeCloseTo(totals[0]!, 6);
  });

  it("uses the plan's own schedule to set that total", () => {
    const sim = simulate(flat, plan, stocks('weekly'));
    expect(sim.perContribution).toBe(100);
    expect(sim.summary.totalContributed).toBe(100 * sim.contributionCount);
    const monthly = simulate(flat, plan, stocks('monthly'));
    expect(monthly.perContribution).toBeCloseTo(sim.summary.totalContributed / monthly.contributionCount);
  });

  it('is worth exactly what went in when prices never move', () => {
    const sim = simulate(flat, plan, { allocation: { us_stocks: 80, us_bonds: 20 }, timing: 'monthly', rebalance: 'quarterly' });
    for (let i = 0; i < sim.value.length; i++) expect(sim.value[i]).toBeCloseTo(sim.contributed[i]!, 8);
    expect(sim.summary.moneyWeightedReturn).toBeCloseTo(0, 8);
    expect(sim.summary.maxDrawdown.depth).toBe(0);
  });

  it('gives a lump sum the asset’s own return', () => {
    const sim = simulate(rising, plan, stocks('lump'));
    const { startIndex, endIndex } = sim;
    const p = rising.assets.us_stocks.prices;
    expect(sim.summary.finalValue / sim.summary.totalContributed).toBeCloseTo(p[endIndex]! / p[startIndex]!, 10);
    // For one deposit, money-weighted and time-weighted agree (up to 365 vs 365.25-day years).
    expect(sim.summary.moneyWeightedReturn).toBeCloseTo(sim.summary.timeWeightedReturn, 3);
  });

  it('keeps the growth index independent of contributions', () => {
    const lump = simulate(rising, plan, stocks('lump'));
    const weekly = simulate(rising, plan, stocks('weekly'));
    for (let i = 0; i < lump.growthIndex.length; i++) expect(weekly.growthIndex[i]).toBeCloseTo(lump.growthIndex[i]!, 10);
  });

  it('beats spreading out in a market that only goes up', () => {
    const lump = simulate(rising, plan, stocks('lump')).summary.finalValue;
    const weekly = simulate(rising, plan, stocks('weekly')).summary.finalValue;
    const annually = simulate(rising, plan, stocks('annually')).summary.finalValue;
    expect(lump).toBeGreaterThan(weekly);
    expect(annually).toBeLessThan(lump);
  });

  it('restores target weights on rebalance dates and lets them drift otherwise', () => {
    const p: Plan = { ...plan, frequency: 'annually', amount: 1000 };
    const sim = (rebalance: Strategy['rebalance']) =>
      simulate(rising, p, { allocation: { us_stocks: 50, us_bonds: 50 }, timing: 'lump', rebalance });
    const never = sim('never');
    const yearly = sim('annually');
    // Stocks rise, bonds don't: without rebalancing the stock share keeps growing, so it ends higher.
    expect(never.summary.finalValue).toBeGreaterThan(yearly.summary.finalValue);
    // Both are worth the same until the first rebalance.
    expect(yearly.value[100]).toBeCloseTo(never.value[100]!, 8);
  });

  it('tracks how long the average dollar was invested', () => {
    const lump = simulate(flat, plan, stocks('lump'));
    expect(lump.summary.averageYearsInvested).toBeCloseTo(lump.summary.years, 6);
    // Spread evenly, the average dollar is in for about half the window.
    const weekly = simulate(flat, plan, stocks('weekly'));
    expect(weekly.summary.averageYearsInvested / weekly.summary.years).toBeCloseTo(0.5, 1);
    // Buying each quarter's budget up front puts money in earlier than buying weekly.
    expect(simulate(flat, plan, stocks('quarterly')).summary.averageYearsInvested).toBeGreaterThan(weekly.summary.averageYearsInvested);
  });

  it('counts the starting balance once and invests it on day one', () => {
    const sim = simulate(flat, { ...plan, initial: 5000 }, stocks('monthly'));
    expect(sim.contributed[0]).toBeCloseTo(5000 + sim.perContribution);
  });

  it('measures the worst shortfall below money put in', () => {
    const crash = syntheticMarket('2020-01-01', 300, { us_stocks: (i) => (i < 100 ? 100 : i < 200 ? 60 : 100) });
    const sim = simulate(crash, { ...plan, end: '2021-02-01' }, stocks('lump'));
    expect(sim.summary.worstShortfall.pct).toBeCloseTo(-0.4);
    expect(sim.summary.maxDrawdown.depth).toBeCloseTo(-0.4);
  });

  it('applies inflation to the real return', () => {
    // CPI rises 1% a month.
    const m = syntheticMarket('2020-01-01', 600, { us_stocks: (i) => 100 * Math.pow(1.0004, i) }, {}, (i) => 100 * Math.pow(1.01, i));
    const s = simulate(m, plan, stocks('lump')).summary;
    expect(s.realMoneyWeightedReturn).toBeLessThan(s.moneyWeightedReturn - 0.1);
    expect(s.contributedInEndDollars).toBeGreaterThan(s.totalContributed);
  });
});

describe('resolveWindow', () => {
  const late = syntheticMarket('2020-01-01', 400, { us_stocks: () => 1, gold: () => 1 }, { gold: 200 });
  it('starts when every asset in play has a price', () => {
    const w = resolveWindow(late, plan, [stocks('lump'), { allocation: { gold: 100 }, timing: 'lump', rebalance: 'never' }]);
    expect(w.startIndex).toBe(200);
    expect(resolveWindow(late, plan, [stocks('lump')]).startIndex).toBe(0);
  });
  it('rejects empty windows and empty allocations', () => {
    expect(() => resolveWindow(late, { ...plan, start: '2030-01-01' }, [stocks('lump')])).toThrow(SimulationError);
    expect(() => resolveWindow(late, plan, [{ allocation: {}, timing: 'lump', rebalance: 'never' }])).toThrow(SimulationError);
  });
});
