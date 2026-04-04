# Phase 4: Benchmarking & Comparative Dashboard — Research

**Researched:** 2026-03-31
**Phase goal:** Compare strategies against industry standard benchmarks (S&P 500, 60/40 Portfolio) and calculate advanced risk metrics.

## Don't Hand-Roll

| Problem | Recommended solution | Why |
|---------|---------------------|-----|
| Calculating Sharpe/Sortino | Refine existing `analytics.py` with standard `np.sqrt(252)` and "Downside Deviation" | Correctly account for the "risk" in risk-adjusted returns using standard financial formulas. |
| Multi-series charts | Use `addLineSeries` for benchmarks in `Lightweight Charts` | Simple, lightweight, and supports multiple series on the same X-axis. |
| 60/40 Construction | Pre-calculate a "synthetic" daily return series for a 60/40 portfolio | This allows treating the benchmark as just another "asset" for the existing simulation engine. |

## Common Pitfalls

### Sharpe vs Sortino nuances
**What goes wrong:** Incorrectly calculating the Sortino denominator.
**Why:** Many people use the standard deviation of negative returns, but the Sortino ratio specifically requires "Downside Deviation" (the root mean square of negative *excess* returns, where positive returns are counted as zero).
**How to avoid:** Use `np.sqrt(np.mean(np.minimum(0, excess_returns)**2)) * np.sqrt(252)` as the denominator.

### Normalizing for Comparison
**What goes wrong:** Plotting a strategy starting with $10,000 and a benchmark starting with $1.0.
**Why:** The chart will have different scales, making comparison impossible.
**How to avoid:** Always normalize the benchmark to the same initial value as the strategy (e.g. `Portfolio_Value = Initial_Cash * Cumulative_Return_Index`).

### Benchmark "Buy and Hold" vs DCA
**What goes wrong:** Comparing a DCA strategy's total return directly to a Buy and Hold benchmark's total return.
**Why:** DCA strategies invest capital over time, so their "Total Invested" increases. Buy and Hold (Lump Sum) invests all at once.
**How to avoid:** 
1. **Overlay**: Plot the S&P 500 Price (normalized to $1.0) against the strategy's Cumulative Return (ROI).
2. **Comparable**: Run a "Lump Sum" simulation on S&P 500 using the same initial cash and time period as the benchmark.

### Yield vs. Price for Bonds (DGS10)
**What goes wrong:** Using the yield directly as the bond return.
**Why:** `DGS10` from FRED is a yield (e.g. 4.2%). Bond *returns* include both the yield and the price change caused by yield movements.
**How to avoid:** Use a standard approximation: `Bond_Return = (Yield_yesterday / 252) - Duration * (Yield_today - Yield_yesterday)`. For 10Y Treasuries, use a Duration of ~8.8.

## Existing Patterns in This Codebase

- **`src/engine/analytics.py`**: Already contains Sharpe and Sortino stubs. These should be reused but refined for accuracy.
- **`src/engine/simulator.py`**: The `Simulator` handles single assets. To support a 60/40 benchmark, create a synthetic "60/40 asset" before passing it to the simulator.
- **`scripts/run_simulations.py`**: Already calculates metrics for every asset. Benchmarks can be added as "system-level" simulations that always run.
- **`frontend/src/components/StrategyChart.tsx`**: Uses `lightweight-charts`. Adding a second series is a known pattern (e.g. the drawdown chart is a separate chart instance, but they can be combined or overlaid).

## Recommended Approach

1. **Synthetic Assets**: In `run_simulations.py`, calculate daily returns for a 60/40 benchmark (60% SP500, 40% 10Y Treasuries using the duration approximation).
2. **Metric Refinement**: Update `analytics.py` to use the standard "Downside Deviation" for Sortino and ensure consistent annualization.
3. **API Expansion**: Ensure the API can return a "benchmark" time-series along with the simulation performance.
4. **Frontend Overlay**: Update `StrategyChart.tsx` to take an optional `benchmarkData` prop and overlay it using `addLineSeries`. Highlight the benchmark in a distinct color (e.g. Amber/Gold) and style (e.g. Dashed line).
5. **Stats Grid**: Display Sharpe, Sortino, and MDD prominently in the existing `StatsGrid`.

