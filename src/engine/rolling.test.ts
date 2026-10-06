import { describe, expect, it } from 'vitest';
import { maxHorizonYears, rollingWindows } from './rolling';
import type { Plan, Strategy } from './simulate';
import { syntheticMarket } from './testMarket';

// ~8 years of weekdays. Stocks rise steadily; "gold" is flat and only starts after a year.
const market = syntheticMarket('2010-01-01', 2100, { us_stocks: (i) => 100 * Math.pow(1.0003, i), gold: () => 50 }, { gold: 260 });
const plan: Plan = { start: '2010-01-01', end: '2018-01-01', amount: 100, frequency: 'monthly', funding: 'as-earned', initial: 0 };
const stocks: Strategy = { allocation: { us_stocks: 100 }, timing: 'monthly', rebalance: 'never' };
const gold: Strategy = { allocation: { gold: 100 }, timing: 'monthly', rebalance: 'never' };

describe('rollingWindows', () => {
  it('starts one window per month while a full horizon still fits', () => {
    const r = rollingWindows(market, plan, [stocks], 5);
    const last = market.dates.at(-1)!;
    expect(r.starts[0]).toBe('2010-01-01');
    // The last window must end on or before the last date we have.
    const lastStart = r.starts.at(-1)!;
    expect(lastStart.slice(0, 7) <= `${Number(last.slice(0, 4)) - 5}-${last.slice(5, 7)}`).toBe(true);
    expect(r.returns[0]!.length).toBe(r.starts.length);
  });

  it('only starts once every asset in play has data', () => {
    const r = rollingWindows(market, plan, [stocks, gold], 3);
    expect(r.starts[0]! > market.dates[260]!).toBe(true);
  });

  it('summarizes each strategy', () => {
    const [s, g] = rollingWindows(market, plan, [stocks, gold], 3).stats;
    expect(s!.cameOutOnTop).toBe(1);
    expect(g!.cameOutOnTop).toBe(0);
    expect(s!.lostMoney).toBe(0);
    expect(g!.median).toBeCloseTo(0, 6);
    expect(s!.worst.value).toBeLessThanOrEqual(s!.median);
    expect(s!.best.value).toBeGreaterThanOrEqual(s!.median);
  });
});

describe('maxHorizonYears', () => {
  it('is the longest horizon with at least one window', () => {
    const h = maxHorizonYears(market, plan, [stocks]);
    expect(rollingWindows(market, plan, [stocks], h).starts.length).toBeGreaterThan(0);
    expect(rollingWindows(market, plan, [stocks], h + 1).starts.length).toBe(0);
  });
});
