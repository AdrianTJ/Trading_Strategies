#!/usr/bin/env node
// Builds public/data/market.json: daily total-return price series for every asset,
// aligned to one trading calendar, plus monthly CPI.
//
// Sources (no API keys needed):
//   - Yahoo Finance chart API, `adjclose` = price adjusted for dividends and splits,
//     i.e. a total-return index. Verified against published fund returns (see README).
//   - FRED CSV downloads: DTB3 (3-month T-bill yield) for cash, CPIAUCSL for inflation.
//
// Usage: node scripts/fetch-data.mjs

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/data/market.json');

// Calendar starts here. VFINX (our S&P 500 proxy) has adjusted data from 1980.
const CALENDAR_START = '1980-01-02';

// Order matters only for display. `id` is the stable key the app uses.
const YAHOO_ASSETS = [
  { id: 'us_stocks', ticker: 'VFINX' }, // Vanguard 500 Index — S&P 500, since 1976
  { id: 'intl_stocks', ticker: 'VGTSX' }, // Vanguard Total International Stock, since 1996
  { id: 'nasdaq100', ticker: 'QQQ' }, // Invesco QQQ — Nasdaq-100, since 1999
  { id: 'us_bonds', ticker: 'VBMFX' }, // Vanguard Total Bond Market, since 1986
  { id: 'long_treasuries', ticker: 'VUSTX' }, // Vanguard Long-Term Treasury, since 1986
  { id: 'gold', ticker: 'GLD' }, // SPDR Gold Shares, since 2004
];

const UA = { 'User-Agent': 'Mozilla/5.0 (hindsight data fetch)' };

async function fetchWithRetry(url, attempts = 4) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res;
    } catch (err) {
      if (i >= attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
    }
  }
}

/** Today's date in New York, so we never ingest a still-trading intraday bar. */
function todayInNewYork() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
}

function isoInZone(epochSeconds, timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(epochSeconds * 1000));
}

async function fetchYahoo(ticker) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?period1=0&period2=9999999999&interval=1d&events=div,split`;
  const json = await (await fetchWithRetry(url)).json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(`No chart result for ${ticker}: ${JSON.stringify(json.chart?.error)}`);
  const tz = result.meta.exchangeTimezoneName;
  const adj = result.indicators.adjclose?.[0]?.adjclose;
  if (!adj) throw new Error(`No adjclose for ${ticker}`);
  const out = new Map();
  result.timestamp.forEach((t, i) => {
    const v = adj[i];
    if (v != null && Number.isFinite(v) && v > 0) out.set(isoInZone(t, tz), v);
  });
  return out;
}

async function fetchFred(id) {
  const text = await (await fetchWithRetry(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`)).text();
  const out = new Map();
  for (const line of text.trim().split('\n').slice(1)) {
    const [date, raw] = line.split(',');
    const v = Number(raw);
    if (raw !== '.' && raw !== '' && Number.isFinite(v)) out.set(date, v);
  }
  return out;
}

const round = (v) => Number(v.toPrecision(7));

async function main() {
  const today = todayInNewYork();
  const series = {};
  for (const a of YAHOO_ASSETS) {
    process.stdout.write(`Fetching ${a.ticker}… `);
    const raw = await fetchYahoo(a.ticker);
    // Drop today's bar: it may be intraday.
    for (const d of raw.keys()) if (d >= today) raw.delete(d);
    series[a.id] = raw;
    const keys = [...raw.keys()];
    console.log(`${raw.size} days, ${keys[0]} → ${keys.at(-1)}`);
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Trading calendar: every date any Yahoo asset traded, from CALENDAR_START up to the
  // last date *every* asset has, so the newest day is never half-filled.
  const lastCommon = Object.values(series)
    .map((m) => [...m.keys()].at(-1))
    .sort()[0];
  const dateSet = new Set();
  for (const m of Object.values(series)) for (const d of m.keys()) if (d >= CALENDAR_START && d <= lastCommon) dateSet.add(d);
  const dates = [...dateSet].sort();
  for (const d of dates) {
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
    if (dow === 0 || dow === 6) throw new Error(`Weekend date in calendar: ${d}`);
  }

  const assets = [];
  for (const a of YAHOO_ASSETS) {
    const m = series[a.id];
    const start = dates.findIndex((d) => m.has(d));
    if (start < 0) throw new Error(`${a.ticker} has no data inside the calendar`);
    // Forward-fill the rare day a fund didn't report (holiday mismatches). A missing day
    // means "no new price", so carrying the last close forward is the honest value.
    const prices = [];
    let last = null;
    let filled = 0;
    for (let i = start; i < dates.length; i++) {
      const v = m.get(dates[i]);
      if (v != null) last = v;
      else filled++;
      prices.push(round(last));
    }
    console.log(`${a.ticker}: starts ${dates[start]}, forward-filled ${filled} of ${prices.length} days`);
    assets.push({ id: a.id, ticker: a.ticker, start, prices });
  }

  // Cash: compound the 3-month T-bill yield (DTB3, percent, discount basis) day by day.
  // The yield is known at the prior close, so day t's growth uses yesterday's rate.
  process.stdout.write('Fetching DTB3… ');
  const tbill = await fetchFred('DTB3');
  console.log(`${tbill.size} observations`);
  const cash = [1];
  let rate = null;
  for (const [d, v] of tbill) if (d <= dates[0]) rate = v;
  if (rate == null) throw new Error('No T-bill rate on or before calendar start');
  for (let i = 1; i < dates.length; i++) {
    const days = (Date.parse(dates[i]) - Date.parse(dates[i - 1])) / 86_400_000;
    cash.push(cash[i - 1] * (1 + (rate / 100) * (days / 365)));
    if (tbill.has(dates[i])) rate = tbill.get(dates[i]);
  }
  assets.push({ id: 'cash', ticker: 'DTB3', start: 0, prices: cash.map(round) });

  process.stdout.write('Fetching CPIAUCSL… ');
  const cpiRaw = await fetchFred('CPIAUCSL');
  console.log(`${cpiRaw.size} months`);
  const cpi = { months: [], values: [] };
  for (const [d, v] of cpiRaw) {
    if (d >= CALENDAR_START.slice(0, 7)) {
      cpi.months.push(d.slice(0, 7));
      cpi.values.push(v);
    }
  }

  const out = { generatedAt: today, dates, assets, cpi };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out));
  console.log(`Wrote ${OUT}: ${dates.length} trading days, ${dates[0]} → ${dates.at(-1)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
