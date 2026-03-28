# Phase 2: Core Simulation Engine - Context

**Gathered:** March 25, 2026
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the core logic for simulating investment strategies. It consumes pre-aligned, daily historical data from Phase 1 and outputs detailed performance results, including a daily trade log and aggregate risk metrics (Sharpe, Sortino, Max Drawdown). These results are stored in a persistent database table for the Phase 3 dashboard.

</domain>

<decisions>
## Implementation Decisions

### Simulation Engine Design
- **Architecture**: Vectorized (Pandas/NumPy) for high performance.
- **Structure**: Stateless functions that take a DataFrame and return a result object.
- **Strategy Logic**: Predefined functions for Weekly/Monthly DCA, Lump Sum, and 5% Dip buying.
- **Persistence**: Results are cached in a persistent database table.

### Transaction Cost Logic
- **Commission**: Fixed fee commission model (e.g., $1.00 per trade).
- **Slippage**: Fixed 0.05% slippage on entry and exit.
- **Cash Management**: Transaction costs are deducted directly from the remaining cash balance.
- **Presentation**: Final metrics show both gross and net (after-fee) returns.

### Point-in-Time Enforcement
- **Date Handling**: Enforce strict date boundaries (data <= current_sim_date) to prevent look-ahead bias.
- **Execution Price**: Use "Next Day Open" execution price for trade signals.
- **Recurring Trades**: DCA occurs on the 1st of each month (if holiday, use next available trading day).
- **Gaps**: Missing data points are forward-filled (FFill) for continuous simulation.

### Output Granularity
- **Detail Level**: Provide a full daily trade log (Date, Asset, Price, Amount, Cost).
- **Frequency**: Store daily performance data points (Cumulative ROI over time).
- **Risk Metrics**: Calculate and include Sharpe Ratio, Sortino Ratio, and Max Drawdown in results.
- **Storage**: Results are stored in a `SimulationResults` table for scalability.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/db/models.py`: Use `Observation` and `Series` for metadata.
- `src/db/aligned_models.py`: Use `AlignedObservation` as the primary input for simulations.
- `src/db/session.py`: Use `get_session` for persistent results storage.

### Established Patterns
- Python (FastAPI/Pandas) for data processing and backend logic.
- Repository uses `learnship` for project management and planning.

### Integration Points
- This phase consumes the output of Phase 1 (`AlignedObservation` table).
- This phase provides the data used by Phase 3 'Analytics & Performance Visuals'.

</code_context>

<specifics>
## Specific Ideas

- Ensure "Buy the Dip" (5% price drop) logic is strictly defined as a price change relative to the previous day's close.
- Focus assets: US Bonds, Gold, and S&P 500 for the simulation runs.

</specifics>

<deferred>
## Deferred Ideas

- Event-driven (iterative) engine: Deferred unless complex trade triggers are required in v2.
- Generic 'Trigger-Action' system: Deferred for simplicity in v1.
- Custom user-defined DCA days: Deferred to v2.

</deferred>

---
*Phase: 02-core-simulation-engine*
*Context gathered: March 25, 2026*
