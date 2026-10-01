import { describe, expect, it } from 'vitest';
import { decodeState, encodeState, labelScenarios, PRESETS, type AppState, type Scenario } from './scenarios';

const s = (allocation: Scenario['allocation'], timing: Scenario['timing'], rebalance: Scenario['rebalance'] = 'annually'): Scenario => ({
  id: Math.random().toString(),
  allocation,
  timing,
  rebalance,
});

describe('labelScenarios', () => {
  it('names by holdings when only holdings differ', () => {
    expect(labelScenarios([s({ us_stocks: 100 }, 'weekly'), s({ us_stocks: 80, us_bonds: 20 }, 'weekly')])).toEqual([
      'S&P 500',
      '80% S&P 500 · 20% US bonds',
    ]);
  });
  it('names by timing when only timing differs', () => {
    expect(labelScenarios([s({ us_stocks: 100 }, 'lump'), s({ us_stocks: 100 }, 'monthly')])).toEqual(['All at once', 'Every month']);
  });
  it('mentions rebalancing only when it distinguishes two mixes', () => {
    const mix = { us_stocks: 60, us_bonds: 40 };
    expect(labelScenarios([s(mix, 'weekly', 'never'), s(mix, 'weekly', 'annually')])).toEqual(['Never rebalance', 'Rebalance yearly']);
  });
  it('gives identical scenarios the same honest label', () => {
    expect(labelScenarios([s({ gold: 100 }, 'weekly'), s({ gold: 100 }, 'weekly')])).toEqual(['Gold', 'Gold']);
  });
});

describe('URL state', () => {
  const state: AppState = {
    plan: { start: '2020-01-01', end: '2026-09-30', amount: 100, frequency: 'weekly', initial: 2500 },
    scenarios: [s({ us_stocks: 80, us_bonds: 20 }, 'weekly'), s({ gold: 100 }, 'lump', 'never')],
  };

  it('round-trips', () => {
    const back = decodeState(`#${encodeState(state)}`)!;
    expect(back.plan).toEqual(state.plan);
    expect(back.scenarios.map(({ id: _, ...rest }) => rest)).toEqual(state.scenarios.map(({ id: _, ...rest }) => rest));
  });

  it('stays readable', () => {
    expect(encodeState(state)).toContain('s=us_stocks:80,us_bonds:20~weekly~annually');
  });

  it.each([
    '',
    '#from=garbage&to=2026-01-01&amt=100&every=weekly&s=us_stocks:100~weekly~never',
    '#from=2020-01-01&to=2026-01-01&amt=-5&every=weekly&s=us_stocks:100~weekly~never',
    '#from=2020-01-01&to=2026-01-01&amt=100&every=daily&s=us_stocks:100~weekly~never',
    '#from=2020-01-01&to=2026-01-01&amt=100&every=weekly&s=bitcoin:100~weekly~never',
    '#from=2020-01-01&to=2026-01-01&amt=100&every=weekly',
  ])('rejects malformed input %s', (hash) => {
    expect(decodeState(hash)).toBeNull();
  });
});

describe('presets', () => {
  it('every preset builds valid, 100% allocations', () => {
    const plan = { start: '2020-01-01', end: '2026-01-01', amount: 100, frequency: 'monthly' as const, initial: 0 };
    for (const p of PRESETS) {
      for (const sc of p.build(plan)) expect(Object.values(sc.allocation).reduce((a, b) => a + b!, 0)).toBe(100);
    }
  });
});
