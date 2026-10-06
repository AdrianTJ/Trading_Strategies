#!/usr/bin/env node
// Checks that a deployed copy of the site is the built app, not raw source, and
// that its assets and data load. Retries while the CDN catches up.
//
// Usage: node scripts/smoke-test.mjs <site-url> [timeout-seconds]

const [base, timeoutArg = '180'] = process.argv.slice(2);
if (!base) {
  console.error('Usage: node scripts/smoke-test.mjs <site-url> [timeout-seconds]');
  process.exit(2);
}
const root = base.endsWith('/') ? base : `${base}/`;
const deadline = Date.now() + Number(timeoutArg) * 1000;

async function get(url) {
  // Cache-bust so we see what was just deployed, not a CDN copy.
  const u = new URL(url);
  u.searchParams.set('smoke', String(Date.now()));
  const res = await fetch(u, { headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res;
}

async function check() {
  const html = await (await get(root)).text();
  // The failure we've actually seen: Pages serving unbuilt source.
  if (html.includes('/src/main.tsx')) throw new Error('index.html is unbuilt source (references /src/main.tsx)');
  const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => new URL(m[1], root).href);
  if (!assets.some((a) => a.endsWith('.js'))) throw new Error('index.html references no built JS bundle');
  for (const a of assets) await get(a);

  const data = await (await get(new URL('data/market.json', root).href)).json();
  if (!Array.isArray(data.dates) || data.dates.length < 1000) throw new Error('market.json is missing or too short');
  return { assets: assets.length, days: data.dates.length, through: data.dates.at(-1) };
}

for (let attempt = 1; ; attempt++) {
  try {
    const r = await check();
    console.log(`OK: ${root} serves the built app (${r.assets} assets), data has ${r.days} days through ${r.through}`);
    break;
  } catch (err) {
    if (Date.now() > deadline) {
      console.error(`FAILED after ${attempt} attempts: ${err.message}`);
      process.exit(1);
    }
    console.log(`Attempt ${attempt}: ${err.message}; retrying in 10s`);
    await new Promise((r) => setTimeout(r, 10_000));
  }
}
