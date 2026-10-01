import type { AssetId } from './assets';
import { addDays, type ISODate } from './dates';
import { buildMarket, type Market } from './market';

/**
 * A synthetic market for tests: weekday trading days from `start`, each asset's
 * price given by a function of the day number. CPI is flat unless `cpiFn` says otherwise.
 */
export function syntheticMarket(
  start: ISODate,
  days: number,
  priceFns: Partial<Record<AssetId, (i: number) => number>>,
  starts: Partial<Record<AssetId, number>> = {},
  cpiFn: (monthIndex: number) => number = () => 100,
): Market {
  const dates: ISODate[] = [];
  for (let d = start; dates.length < days; d = addDays(d, 1)) {
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
    if (dow !== 0 && dow !== 6) dates.push(d);
  }
  const assets = {} as Market['assets'];
  for (const [id, fn] of Object.entries(priceFns) as [AssetId, (i: number) => number][]) {
    const s = starts[id] ?? 0;
    const prices = new Float64Array(days).fill(Number.NaN);
    for (let i = s; i < days; i++) prices[i] = fn(i);
    assets[id] = { id, ticker: id, start: s, prices };
  }
  const months = [...new Set(dates.map((d) => d.slice(0, 7)))];
  return buildMarket(dates.at(-1)!, dates, assets, { months, values: months.map((_, i) => cpiFn(i)) });
}
