const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdCompact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
const monthYear = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const dayMonthYear = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** Whole dollars, or cents when the amount is small enough that cents matter. */
export const money = (v: number) => (Math.abs(v) < 1000 && !Number.isInteger(Math.round(v * 100) / 100) ? usd2 : usd0).format(v);
export const moneyWhole = (v: number) => usd0.format(v);
export const moneyCompact = (v: number) => usdCompact.format(v);

export const signedMoney = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '') + usd0.format(Math.abs(v));

/** "12.3%", with a true minus sign; `signed` adds "+" for gains. */
export function pct(v: number, { signed = false, digits = 1 } = {}): string {
  if (!Number.isFinite(v)) return '—';
  // Avoid "-0.0%".
  const rounded = Number((v * 100).toFixed(digits));
  const body = `${Math.abs(rounded).toFixed(digits)}%`;
  if (rounded < 0) return `−${body}`;
  return signed && rounded > 0 ? `+${body}` : body;
}

export const formatMonth = (d: string) => monthYear.format(new Date(`${d}T00:00:00Z`));
export const formatDay = (d: string) => dayMonthYear.format(new Date(`${d}T00:00:00Z`));
