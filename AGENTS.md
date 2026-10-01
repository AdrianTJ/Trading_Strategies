# AGENTS.md

Guidance for AI agents and contributors working in this repo.

## What this is

Hindsight: a static site that compares investing strategies on real market history. Everything runs in
the browser. There is deliberately **no backend**; don't add one without a reason the browser can't meet.

## Commands

- `npm run dev`: local dev server
- `npm test`: Vitest (engine, state, and data checks). Run before every commit.
- `npm run typecheck`, `npm run build`
- `npm run data`: re-fetch `public/data/market.json` (network required)

## Invariants: don't break these

1. **Same money, same dates.** Every strategy in a comparison invests the same total over the same
   window (`simulate.ts`). A difference in outcome must come from the strategy, never from different
   amounts of money.
2. **Real data only.** Never fabricate, smooth, or splice price history to make a chart look complete.
   If an asset starts later, the comparison starts later and the UI says so.
3. **Honest explanations.** Takeaway text in `Results.tsx` is derived from the numbers on screen, and
   it names the actual cause (usually *when* money went in), not a flattering one.
4. **Data is checked against ground truth.** `market.test.ts` compares the data to published fund returns.
   If a refresh breaks it, fix the data, not the test.
5. **Colors follow the scenario slot**, not its rank. Palette and chart rules come from the dataviz guidance
   (validated categorical palette, legend + table for every chart, light and dark tokens in `styles.css`).

## Conventions

- Engine code (`src/engine`) is pure and framework-free, works in day numbers in hot loops, and has tests next to it.
- Keep dependencies minimal: React, Vite, TypeScript, Vitest. The chart is hand-rolled SVG (`LineChart.tsx`).
- Branches: `feat/…`, `fix/…`, `chore/…`.
