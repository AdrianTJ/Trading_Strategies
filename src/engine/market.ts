import type { AssetId } from './assets';
import { toDay, type ISODate } from './dates';

/** Shape of public/data/market.json, as written by scripts/fetch-data.mjs. */
export interface RawMarket {
  generatedAt: ISODate;
  dates: ISODate[];
  assets: { id: string; ticker: string; start: number; prices: number[] }[];
  cpi: { months: string[]; values: number[] };
}

export interface AssetSeries {
  id: AssetId;
  ticker: string;
  /** Index into `dates` of the first day with a price. */
  start: number;
  /** Total-return price per trading day, full calendar length; NaN before `start`. */
  prices: Float64Array;
}

export interface Market {
  generatedAt: ISODate;
  dates: ISODate[];
  /** `dates` as day numbers (see toDay), for the engine's hot loops. */
  days: Int32Array;
  assets: Record<AssetId, AssetSeries>;
  cpi: { months: string[]; values: number[] };
  /** CPI level in effect on each trading day. */
  cpiByDay: Float64Array;
}

export function parseMarket(raw: RawMarket): Market {
  const n = raw.dates.length;
  const assets = {} as Record<AssetId, AssetSeries>;
  for (const a of raw.assets) {
    const prices = new Float64Array(n).fill(Number.NaN);
    prices.set(a.prices, a.start);
    assets[a.id as AssetId] = { id: a.id as AssetId, ticker: a.ticker, start: a.start, prices };
  }
  return buildMarket(raw.generatedAt, raw.dates, assets, raw.cpi);
}

/** Assemble a Market and its derived lookup arrays. */
export function buildMarket(generatedAt: ISODate, dates: ISODate[], assets: Record<AssetId, AssetSeries>, cpi: Market['cpi']): Market {
  const days = Int32Array.from(dates, toDay);
  const cpiByDay = Float64Array.from(dates, (d) => cpiFor(cpi, d));
  return { generatedAt, dates, days, assets, cpi, cpiByDay };
}

/** First index with days[i] >= day, searching from `from` (days.length if none). */
export function dayIndexOnOrAfter(days: Int32Array, day: number, from = 0): number {
  let lo = from;
  let hi = days.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (days[mid]! < day) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** First index with dates[i] >= d (dates.length if none). */
export function indexOnOrAfter(dates: readonly ISODate[], d: ISODate): number {
  let lo = 0;
  let hi = dates.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (dates[mid]! < d) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Last index with dates[i] <= d (-1 if none). */
export function indexOnOrBefore(dates: readonly ISODate[], d: ISODate): number {
  let lo = 0;
  let hi = dates.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (dates[mid]! <= d) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
}

/**
 * CPI level for the month containing `d`. CPI is published with a lag of a few weeks,
 * so dates past the last published month use the latest value we have.
 */
export const cpiAt = (market: Market, d: ISODate): number => cpiFor(market.cpi, d);

function cpiFor({ months, values }: Market['cpi'], d: ISODate): number {
  const m = d.slice(0, 7);
  const i = indexOnOrBefore(months, m);
  return values[Math.max(0, Math.min(i, values.length - 1))]!;
}

/** First calendar index where every asset in `ids` has a price. */
export function firstCommonIndex(market: Market, ids: Iterable<AssetId>): number {
  let start = 0;
  for (const id of ids) start = Math.max(start, market.assets[id].start);
  return start;
}
