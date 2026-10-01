import { describe, expect, it } from 'vitest';
import { addMonths, daysBetween, scheduleDates } from './dates';

describe('addMonths', () => {
  it('clamps to the end of shorter months', () => {
    expect(addMonths('2020-01-31', 1)).toBe('2020-02-29');
    expect(addMonths('2021-01-31', 1)).toBe('2021-02-28');
    expect(addMonths('2020-03-31', -1)).toBe('2020-02-29');
  });
  it('crosses year boundaries', () => {
    expect(addMonths('2020-11-15', 3)).toBe('2021-02-15');
    expect(addMonths('2020-01-15', -1)).toBe('2019-12-15');
  });
});

describe('scheduleDates', () => {
  it('anchors every step to the start, so month-end clamping never drifts', () => {
    expect(scheduleDates('2021-01-31', '2021-04-30', 'monthly')).toEqual(['2021-01-31', '2021-02-28', '2021-03-31', '2021-04-30']);
  });
  it('includes the start and stops at the end', () => {
    const weeks = scheduleDates('2024-01-01', '2024-12-31', 'weekly');
    expect(weeks[0]).toBe('2024-01-01');
    expect(weeks).toHaveLength(53);
    expect(weeks.at(-1)! <= '2024-12-31').toBe(true);
    expect(scheduleDates('2024-01-01', '2024-12-31', 'quarterly')).toEqual(['2024-01-01', '2024-04-01', '2024-07-01', '2024-10-01']);
  });
  it('counts days across DST and leap years', () => {
    expect(daysBetween('2024-01-01', '2025-01-01')).toBe(366);
    expect(daysBetween('2024-03-09', '2024-03-11')).toBe(2);
  });
});
