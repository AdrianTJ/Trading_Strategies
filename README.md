# Hindsight

**What would different ways of investing actually have done?** Pick an amount and a schedule
("$100 every week since January 2020"), then compare strategies side by side on real market history:

- **What you buy:** S&P 500 vs bonds vs an 80/20 mix, with or without gold, and so on
- **When you buy:** weekly vs monthly vs quarterly, or everything on day one
- **Was it the strategy or the dates?** The same plan re-run from every start month in history, so
  one lucky (or unlucky) window doesn't pass for a rule

It's a static site. All simulation runs in the browser, so there's no backend, no database, and no API key.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine + data checks
npm run build      # static site in dist/
```

## How the numbers work

- **Fair comparisons by construction.** Every strategy invests exactly the same total over the same
  dates. Your amount × your schedule sets the total; other schedules split it evenly across their own
  buy dates, and "all at once" puts it all in on day one. Without this, "weekly vs monthly" just
  measures who put in more money.
- **Buys happen at the start of each period.** "Every quarter" invests the quarter's budget on its first
  day. That means less frequent schedules invest slightly earlier on average, which usually explains
  the small gaps between them. The app says so instead of implying one schedule is smarter.
- **Total return.** Prices are real funds' dividend- and interest-adjusted closing prices, so income
  is reinvested.
- **Annual return is money-weighted (XIRR).** Each dollar only earns credit for the time it was
  invested. "After inflation" restates every contribution in end-date dollars using CPI.
- **Drawdown** is measured on the portfolio's own growth (time-weighted), so new contributions can't hide a crash.
- **Not modeled:** taxes, trading costs, and fees beyond what's already in each fund's price. Fractional shares are assumed.

## Data

`public/data/market.json` is built by `npm run data` (`scripts/fetch-data.mjs`) and committed.
A GitHub Action refreshes it monthly.

| Asset | Series | From |
|---|---|---|
| S&P 500 | Vanguard 500 Index (VFINX) | 1980 |
| International stocks | Vanguard Total International Stock (VGTSX) | 1996 |
| Nasdaq-100 | Invesco QQQ | 1999 |
| US bonds | Vanguard Total Bond Market (VBMFX) | 1986 |
| Long-term Treasuries | Vanguard Long-Term Treasury (VUSTX) | 1986 |
| Gold | SPDR Gold Shares (GLD) | 2004 |
| Cash | 3-month T-bill yield (FRED DTB3), compounded daily | 1980 |
| Inflation | CPI-U (FRED CPIAUCSL), monthly | 1980 |

Prices come from Yahoo Finance's adjusted close; T-bills and CPI come from FRED's public CSV downloads.
`src/engine/market.test.ts` checks the data against published calendar-year fund returns
(e.g. the S&P 500 fund: −37.0% in 2008, +18.2% in 2020), so a bad refresh fails CI instead of shipping.

A comparison only starts once every asset in it has data, and the page tells you when that moved your start date.

## Deploy

`.github/workflows/deploy.yml` publishes `dist/` to GitHub Pages on every push to `main`.
One-time setup: **Settings → Pages → Source: GitHub Actions**. The build uses relative paths, so any static host works.

## Layout

```
scripts/fetch-data.mjs   data build (Node built-ins only)
public/data/market.json  committed market history
src/engine/              pure TypeScript: dates, market data, simulation, metrics, rolling windows
src/state/               scenarios, presets, labels, URL (shareable links)
src/ui/                  React components: plan form, strategy cards, chart, results, rolling view
```

The previous FastAPI/FRED prototype is preserved on the `archive/prototype` branch.
