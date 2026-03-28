# Roadmap: StrategyTracker

## Overview

**4 phases** | **14 requirements mapped** | All v1 requirements covered ✓

## Phases

### Phase 1: Foundation & Data Sync (✓ Complete 2026-03-25)
**Goal**: Establish the data ingestion pipeline and local caching system.
- [x] DATA-01: Automated sync with FRED API for S&P 500, Gold, and US Bonds.
- [x] DATA-02: Fetch and store CPI for "Real Return" calculations.
- [x] DATA-03: Local persistent storage (SQL) for all fetched historical data.
- [x] DATA-04: Data alignment logic to merge monthly FRED series with daily price data.

**Success Criteria**:
- System can successfully pull historical series from FRED API.
- Data is stored in a local database and accessible for querying.
- Monthly and daily data are correctly aligned in a single time-series view.

### Phase 2: Core Simulation Engine (✓ Complete 2026-03-25)
**Goal**: Build the logic to calculate strategy performance.
- [x] STRAT-01: Vectorized simulation engine for Weekly/Monthly DCA.
- [x] STRAT-02: Simulator for Lump Sum strategy.
- [x] STRAT-03: Simulator for "Buy the Dip" (5%) strategy.
- [x] STRAT-04: Transaction cost simulator (fees/commissions).

**Success Criteria**:
- Engine can calculate P&L for all three strategies over a 5-year period.
- Simulations account for transaction costs.
- Results are consistent with manually verified benchmarks.

### Phase 3: Analytics & Performance Visuals
**Goal**: Create the user interface for visualizing strategy outcomes.
- [ ] VIS-01: Line charts showing cumulative P&L.
- [ ] VIS-02: Visualization for "Max Drawdown".
- [ ] VIS-03: Tabular breakdown of monthly and annual returns.

**Success Criteria**:
- Users can see a clear equity curve for their selected strategy.
- "Max pain" (drawdown) is visually represented.
- Detailed return tables are available for inspection.

### Phase 4: Benchmarking & Comparative Dashboard
**Goal**: Compare strategies against industry standard benchmarks.
- [ ] BENCH-01: S&P 500 Buy and Hold benchmark overlay.
- [ ] BENCH-02: 60/40 Portfolio benchmark comparison.
- [ ] BENCH-03: Advanced risk metrics: Sharpe Ratio, Sortino Ratio, and Max Drawdown.

**Success Criteria**:
- Users can compare their strategy directly against the S&P 500.
- Risk-adjusted returns (Sharpe/Sortino) are calculated and displayed.
- The dashboard provides a comprehensive view of strategy performance vs benchmarks.

## Traceability Matrix

| Requirement | Phase |
|-------------|-------|
| DATA-01 | Phase 1 |
| DATA-02 | Phase 1 |
| DATA-03 | Phase 1 |
| DATA-04 | Phase 1 |
| STRAT-01 | Phase 2 |
| STRAT-02 | Phase 2 |
| STRAT-03 | Phase 2 |
| STRAT-04 | Phase 2 |
| VIS-01 | Phase 3 |
| VIS-02 | Phase 3 |
| VIS-03 | Phase 3 |
| BENCH-01 | Phase 4 |
| BENCH-02 | Phase 4 |
| BENCH-03 | Phase 4 |
