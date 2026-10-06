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
    expect(labelScenarios([s({ us_stocks: 100 }, 'lump'), s({ us_stocks: 100 }, 'monthly')])).toEqual(['Right away', 'Every month']);
  });
  it('names dip strategies by their threshold', () => {
    const dip = (dipPct: number): Scenario => ({ ...s({ us_stocks: 100 }, 'dip'), dipPct });
    expect(labelScenarios([s({ us_stocks: 100 }, 'lump'), dip(10), dip(20)])).toEqual([
      'Right away',
      'Only after a 10% drop',
      'Only after a 20% drop',
    ]);
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
    plan: { start: '2020-01-01', end: '2026-09-30', amount: 100, frequency: 'weekly', funding: 'upfront', initial: 2500 },
    scenarios: [s({ us_stocks: 80, us_bonds: 20 }, 'weekly'), s({ gold: 100 }, 'lump', 'never')],
  };

  it('round-trips', () => {
    const back = decodeState(`#${encodeState(state)}`)!;
    expect(back.plan).toEqual(state.plan);
    expect(back.scenarios.map(({ id: _, ...rest }) => rest)).toEqual(state.scenarios.map(({ id: _, ...rest }) => rest));
  });

  it('omits the default funding mode and keeps old links working', () => {
    const earned = { ...state, plan: { ...state.plan, funding: 'as-earned' as const } };
    expect(encodeState(earned)).not.toContain('fund=');
    expect(decodeState('#from=2020-01-01&to=2026-01-01&amt=100&every=weekly&s=us_stocks:100~weekly~never')!.plan.funding).toBe('as-earned');
  });

  it('round-trips a dip threshold', () => {
    const dipState: AppState = { ...state, scenarios: [{ ...s({ us_stocks: 100 }, 'dip'), dipPct: 20 }] };
    const hash = encodeState(dipState);
    expect(hash).toContain('s=us_stocks:100~dip~annually~20');
    expect(decodeState(`#${hash}`)!.scenarios[0]!.dipPct).toBe(20);
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
    '#from=2020-01-01&to=2026-01-01&amt=100&every=weekly&fund=lottery&s=us_stocks:100~weekly~never',
  ])('rejects malformed input %s', (hash) => {
    expect(decodeState(hash)).toBeNull();
  });
});

describe('presets', () => {
  it('every preset builds valid, 100% allocations', () => {
    const plan = { start: '2020-01-01', end: '2026-01-01', amount: 100, frequency: 'monthly' as const, funding: 'as-earned' as const, initial: 0 };
    for (const p of PRESETS) {
      for (const sc of p.build(plan)) expect(Object.values(sc.allocation).reduce((a, b) => a + b!, 0)).toBe(100);
    }
  });
});
