import { describe, expect, it } from 'vitest';
import { annualize, maxDrawdown, xirr } from './metrics';

describe('xirr', () => {
  it('matches the reference example from the spreadsheet XIRR docs', () => {
    const r = xirr([
      { date: '2008-01-01', amount: -10000 },
      { date: '2008-03-01', amount: 2750 },
      { date: '2008-10-30', amount: 4250 },
      { date: '2009-02-15', amount: 3250 },
      { date: '2009-04-01', amount: 2750 },
    ]);
    expect(r).toBeCloseTo(0.373362535, 6);
  });
  it('equals the plain compound rate for a single deposit', () => {
    const r = xirr([
      { date: '2010-01-01', amount: -1000 },
      { date: '2015-01-01', amount: 2000 }, // 1826 days
    ]);
    expect(r).toBeCloseTo(Math.pow(2, 365 / 1826) - 1, 9);
  });
  it('handles losses', () => {
    const r = xirr([
      { date: '2020-01-01', amount: -1000 },
      { date: '2020-07-01', amount: -1000 },
      { date: '2021-01-01', amount: 1500 },
    ]);
    expect(r).toBeLessThan(-0.3);
    expect(r).toBeGreaterThan(-0.5);
  });
  it('returns NaN when there is nothing to solve', () => {
    expect(xirr([{ date: '2020-01-01', amount: -1 }])).toBeNaN();
    expect(xirr([{ date: '2020-01-01', amount: -1 }, { date: '2021-01-01', amount: -1 }])).toBeNaN();
  });
});

describe('maxDrawdown', () => {
  it('finds the deepest peak-to-trough fall, not the first one', () => {
    const dd = maxDrawdown([100, 120, 90, 110, 130, 65, 140]);
    expect(dd.depth).toBeCloseTo(-0.5);
    expect(dd.peakIndex).toBe(4);
    expect(dd.troughIndex).toBe(5);
  });
  it('is zero for a series that only rises', () => {
    expect(maxDrawdown([1, 2, 3]).depth).toBe(0);
  });
});

describe('annualize', () => {
  it('turns a multiple over a span into a yearly rate', () => {
    expect(annualize(1.21, 365.25 * 2)).toBeCloseTo(0.1);
    expect(annualize(0, 100)).toBeNaN();
  });
});
