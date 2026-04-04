# Requirements: StrategyTracker

**Defined**: March 25, 2026
**Core Value**: Helping casual investors make more informed decisions by clearly visualizing the long-term performance of various investment strategies.

## v1 Requirements

### Data Ingestion & Storage

- [x] **DATA-01**: Automated sync with FRED API for S&P 500, Gold, and US Bonds (10-year Treasury).
- [x] **DATA-02**: Fetch and store CPI (Consumer Price Index) for "Real Return" calculations.
- [x] **DATA-03**: Local persistent storage (SQL) for all fetched historical data to improve performance and respect API limits.
- [x] **DATA-04**: Data alignment logic to merge monthly FRED series with daily price data (Forward-Fill).

### Strategy Logic & Backtesting

- [x] **STRAT-01**: Vectorized simulation engine for Weekly and Monthly Dollar Cost Averaging (DCA).
- [x] **STRAT-02**: Simulator for Lump Sum (all-in at the beginning) strategy.
- [x] **STRAT-03**: Simulator for "Buy the Dip" strategy (triggered by a 5% price drop).
- [x] **STRAT-04**: Transaction cost simulator to account for fees/commissions.

### Visualization & Dashboard

- [x] **VIS-01**: Dashboard with line charts showing cumulative P&L over the selected period.
- [x] **VIS-02**: Visualization for "Max Drawdown" (peak-to-trough decline) per strategy.
- [x] **VIS-03**: Tabular breakdown of monthly and annual returns for each strategy.

### Benchmarking & Analytics

- [x] **BENCH-01**: Automatic performance overlay against the "S&P 500 Buy and Hold" benchmark.
- [x] **BENCH-02**: Comparison against a simple 60/40 (Equity/Bond) portfolio benchmark.
- [x] **BENCH-03**: Calculation and display of risk metrics: Sharpe Ratio, Sortino Ratio, and Max Drawdown.

## v2 Requirements

### Advanced Features

- **SIM-01**: Interactive "What If" sliders for custom monthly amounts and dip percentages.
- **PORT-01**: Simulated portfolios allowing users to combine different asset classes and strategies.
- **USER-01**: User accounts and saved simulations.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time feeds | Not required for historical analysis; adds significant cost/complexity. |
| Options Greeks | Too advanced for the "casual investor" target audience. |
| Social Leaderboards | Contradicts the goal of informed, independent decision-making; encourages gambling. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| STRAT-01 | Phase 2 | Complete |
| STRAT-02 | Phase 2 | Complete |
| STRAT-03 | Phase 2 | Complete |
| STRAT-04 | Phase 2 | Complete |
| VIS-01 | Phase 3 | Complete |
| VIS-02 | Phase 3 | Complete |
| VIS-03 | Phase 3 | Complete |
| BENCH-01 | Phase 4 | Complete |
| BENCH-02 | Phase 4 | Complete |
| BENCH-03 | Phase 4 | Complete |

**Coverage:**
- v1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: March 25, 2026*
*Last updated: March 25, 2026 after initial definition*
