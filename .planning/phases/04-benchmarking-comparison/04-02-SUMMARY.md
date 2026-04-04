# Plan 04-02 Summary

**Completed:** 2024-03-22
**Phase:** 4 — Benchmarking & Comparison

## What was built
Implemented frontend support for benchmark overlays and enhanced risk metrics. Users can now select from available benchmarks (e.g., S&P 500, 60/40 Portfolio) to compare against their selected strategy. The comparison is shown both visually on the equity curve chart and numerically in the statistics grid.

## Key files
- `frontend/src/hooks/useSimulationData.ts`: Added `useBenchmarks` hook to fetch benchmark simulations and their daily performance.
- `frontend/src/components/StrategyChart.tsx`: Updated to support an optional benchmark data series, rendered as a dashed amber line and normalized to the primary strategy's starting value.
- `frontend/src/components/StatsGrid.tsx`: Added Sortino Ratio and support for side-by-side benchmark comparison for all key metrics (CAGR, Sharpe, Sortino, Max Drawdown).
- `frontend/src/App.tsx`: Added a benchmark selection dropdown to the dashboard header.

## Decisions made
- **Normalization Strategy**: Benchmarks are normalized to start at the same portfolio value as the primary strategy. This allows for direct visual comparison of relative growth regardless of initial cash differences (though they usually match).
- **Stat Comparison**: Instead of separate cards for benchmarks, I integrated benchmark values into the existing cards to save space and make direct comparison easier.
- **Visual Distinction**: Used a dashed line with an amber color (#f59e0b) for benchmarks to clearly distinguish them from the primary strategy (solid blue).

## Deviations from plan
- Integrated benchmark stats into existing cards in `StatsGrid` rather than adding completely new cards, as it provides a better comparison experience.

## Notes for downstream
- The next plan (04-03) will focus on Portfolio-level aggregation, which might use similar patterns for comparing multiple assets or strategies combined.
