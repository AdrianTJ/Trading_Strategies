// Checks the committed data file against independently published numbers, so a bad
// data refresh fails CI instead of quietly shipping wrong history.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSETS, type AssetId } from './assets';
import { cpiAt, indexOnOrBefore, parseMarket, type RawMarket } from './market';

const raw = JSON.parse(readFileSync(new URL('../../public/data/market.json', import.meta.url), 'utf8')) as RawMarket;
const market = parseMarket(raw);

function calendarYearReturn(id: AssetId, year: number) {
  const p = market.assets[id].prices;
  const a = indexOnOrBefore(market.dates, `${year - 1}-12-31`);
  const b = indexOnOrBefore(market.dates, `${year}-12-31`);
  return p[b]! / p[a]! - 1;
}

describe('market data', () => {
  it('has exactly the assets the app knows about', () => {
    expect(raw.assets.map((a) => a.id).sort()).toEqual(ASSETS.map((a) => a.id).sort());
  });

  it('has a clean, strictly increasing weekday calendar and positive prices', () => {
    for (let i = 1; i < market.dates.length; i++) expect(market.dates[i]! > market.dates[i - 1]!).toBe(true);
    for (const a of raw.assets) {
      expect(a.prices.length).toBe(market.dates.length - a.start);
      expect(a.prices.every((v) => v > 0)).toBe(true);
    }
  });

  // Published calendar-year total returns (fund factsheets). Tolerance covers
  // year-end NAV timing differences, not methodology differences.
  it.each([
    ['us_stocks', 2008, -0.3702],
    ['us_stocks', 2020, 0.1825],
    ['us_stocks', 2022, -0.1815],
    ['us_bonds', 2022, -0.1316],
    ['long_treasuries', 2022, -0.2949],
    ['gold', 2020, 0.2481],
    ['nasdaq100', 2022, -0.3258],
  ] as const)('%s %i total return ≈ %f', (id, year, expected) => {
    expect(calendarYearReturn(id, year)).toBeCloseTo(expected, 2);
  });

  it('compounds cash at the T-bill rate', () => {
    // 3-month T-bills yielded roughly 5% through 2023 and ~0% through 2021.
    expect(calendarYearReturn('cash', 2023)).toBeGreaterThan(0.045);
    expect(calendarYearReturn('cash', 2023)).toBeLessThan(0.056);
    expect(Math.abs(calendarYearReturn('cash', 2021))).toBeLessThan(0.002);
  });

  it('has CPI that matches the published 2022 inflation rate', () => {
    // BLS CPI-U, Dec 2021 → Dec 2022: +6.5% (seasonally adjusted series ≈ 6.4–6.5%).
    const infl = cpiAt(market, '2022-12-15') / cpiAt(market, '2021-12-15') - 1;
    expect(infl).toBeGreaterThan(0.06);
    expect(infl).toBeLessThan(0.07);
  });
});
