# Phase 3: Analytics & Performance Visuals - Context

**Gathered:** March 29, 2026
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the React-based frontend dashboard for StrategyTracker. It focuses on visualizing the simulation results from Phase 2, providing users with an interactive equity curve, drawdown analysis, and a detailed monthly returns matrix. The dashboard will integrate directly with the existing SQLite/FastAPI backend.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Layout & Navigation
- **Navigation**: Left Sidebar for Asset selection (S&P 500, Gold, US Bonds).
- **Strategy Selection**: Two dropdowns (Asset/Strategy) for granular control.
- **Routing**: Stateful URLs (`/dashboard/:asset/:strategy`) to support bookmarking.
- **Initial View**: S&P 500 vs. Lump Sum (the default benchmark).

### Chart Interaction & Drawdown
- **Library**: Use `Lightweight Charts` (TradingView) for high-performance financial plotting.
- **P&L Chart**: Clean Line Chart showing the cumulative equity curve.
- **Drawdown Chart**: Secondary lower chart specifically for Max Drawdown (Standard terminal style).
- **Crosshair**: Dual-value tooltip showing "Current Value ($)" and "Cumulative Return (%)".
- **Interactions**: Standard Zoom/Pan, Range Selectors (1Y, 3Y, 5Y), and a Benchmark Overlay toggle.

### Tabular Returns Presentation
- **Structure**: Calendar Grid (Years as rows, Months as columns) for monthly performance.
- **Metrics**: Combined "Return (%)" and P&L focus (Starting/Ending Balances, Net Change).
- **Styling**: Heatmap shading (Red to Green) based on return magnitude.
- **Export**: No export required for this version (View-only).

### UI Density & Aesthetics
- **Theme**: Clean Light (Financial report style with generous whitespace).
- **Density**: Hybrid layout (Main chart at top, detailed metrics and tables below).
- **Empty State**: Clear "Run Sync" CTA if no data is found in the database.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/db/results_models.py`: `SimulationResult` and `DailyPerformance` models for API endpoints.
- `src/engine/analytics.py`: Backend logic for calculating metrics shown in the UI.

### Established Patterns
- Tech Stack: Vite + React + TypeScript + Tailwind (for layout) + Lightweight Charts.
- API: FastAPI endpoints (to be created) returning JSON for the frontend.

### Integration Points
- Frontend will consume the `SimulationResult` and `DailyPerformance` tables.
- Navigation will drive specific API queries based on URL parameters.

</code_context>

<specifics>
## Specific Ideas
- The "Hedge Fund" style returns matrix is a high-priority visual for credibility.
- Ensure the secondary drawdown chart is vertically synchronized with the main equity curve.

</specifics>

<deferred>
## Deferred Ideas
- CSV/Excel Export: Deferred to v2.
- Dark Mode: Deferred (Defaulting to Clean Light).
- Custom Sliders: Deferred to Phase 4/v2.

</deferred>

---
*Phase: 03-analytics-performance-visuals*
*Context gathered: March 29, 2026*
