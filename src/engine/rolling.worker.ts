// Runs the rolling-window analysis off the main thread so editing stays smooth.
import { parseMarket, type Market, type RawMarket } from './market';
import { rollingWindows, type RollingResult } from './rolling';
import type { Plan, Strategy } from './simulate';

export interface RollingRequest {
  id: number;
  dataUrl: string;
  plan: Plan;
  strategies: Strategy[];
  horizonYears: number;
}

export type RollingResponse = { id: number; result: RollingResult } | { id: number; error: string };

let market: Promise<Market> | null = null;

self.onmessage = async (e: MessageEvent<RollingRequest>) => {
  const { id, dataUrl, plan, strategies, horizonYears } = e.data;
  try {
    // Same URL as the page's fetch, so this is normally served from the HTTP cache.
    market ??= fetch(dataUrl)
      .then((r) => r.json() as Promise<RawMarket>)
      .then(parseMarket);
    const result = rollingWindows(await market, plan, strategies, horizonYears);
    self.postMessage({ id, result } satisfies RollingResponse);
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) } satisfies RollingResponse);
  }
};
