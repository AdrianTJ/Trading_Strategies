export type AssetId = 'us_stocks' | 'intl_stocks' | 'nasdaq100' | 'us_bonds' | 'long_treasuries' | 'gold' | 'cash';

export interface AssetInfo {
  id: AssetId;
  name: string;
  /** What the series actually is, so nobody has to guess. */
  source: string;
}

/** Display order. Must match the ids in public/data/market.json (enforced by a test). */
export const ASSETS: readonly AssetInfo[] = [
  { id: 'us_stocks', name: 'S&P 500', source: 'Vanguard 500 Index fund (VFINX), dividends reinvested' },
  { id: 'intl_stocks', name: 'International stocks', source: 'Vanguard Total International Stock (VGTSX), dividends reinvested' },
  { id: 'nasdaq100', name: 'Nasdaq-100', source: 'Invesco QQQ ETF, dividends reinvested' },
  { id: 'us_bonds', name: 'US bonds', source: 'Vanguard Total Bond Market (VBMFX), interest reinvested' },
  { id: 'long_treasuries', name: 'Long-term Treasuries', source: 'Vanguard Long-Term Treasury (VUSTX), interest reinvested' },
  { id: 'gold', name: 'Gold', source: 'SPDR Gold Shares ETF (GLD)' },
  { id: 'cash', name: 'Cash (T-bills)', source: '3-month Treasury bill yield (FRED DTB3), compounded daily' },
];

export const ASSET_BY_ID = Object.fromEntries(ASSETS.map((a) => [a.id, a])) as Record<AssetId, AssetInfo>;
