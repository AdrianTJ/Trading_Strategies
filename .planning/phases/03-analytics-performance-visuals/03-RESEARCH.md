# Phase 3: Analytics & Performance Visuals - Research

## Overview
Phase 3 transitions the project from a CLI/script-based simulation engine to a web-based visualization dashboard. This involves creating a FastAPI backend to serve simulation data and a React frontend to visualize it.

## Don't Hand-Roll

### 1. Financial Charting
**Don't**: Attempt to build complex financial charts (equity curves, drawdowns, crosshairs) using raw SVG or generic charting libraries like Chart.js.
**Use**: `Lightweight Charts` by TradingView. It is purpose-built for financial time-series data, handles thousands of points with high performance, and has built-in support for crosshairs and synchronized charts.

### 2. Layout & Styling
**Don't**: Write thousands of lines of custom CSS for the dashboard layout.
**Use**: `Tailwind CSS`. It allows for rapid prototyping of "Clean Light" professional interfaces and handles responsive sidebars and grids with minimal effort.

### 3. Data Fetching
**Don't**: Use `useEffect` with raw `fetch` for all data requirements.
**Use**: `TanStack Query` (React Query). It handles caching, loading states, and error handling out of the box, which is critical for a data-heavy dashboard.

### 4. Project Scaffolding
**Don't**: Manually configure Webpack or Babel.
**Use**: `Vite`. It provides the fastest development experience for React + TypeScript and is the modern standard for frontend tooling.

## Common Pitfalls

### 1. Large Data Payloads
**Problem**: Sending 5 years of daily performance data for multiple strategies can result in multi-megabyte JSON payloads, slowing down the UI.
**Solution**: 
- Implement an endpoint that returns a summary of simulations first.
- Only fetch the full `DailyPerformance` series when a specific simulation is selected.
- Consider downsampling or returning only the fields needed for the chart (Date and Portfolio Value).

### 2. Vertically Synchronized Charts
**Problem**: When the user hovers over the Equity Curve, the Drawdown chart below it should move its crosshair to the same date.
**Solution**: `Lightweight Charts` supports logical crosshair synchronization. We need to ensure both charts share the same time-scale and subscribe to each other's mouse move events.

### 3. Date Handling (JS vs Python)
**Problem**: Python's `datetime` and JavaScript's `Date` object often conflict on formats, especially with ISO strings and timezones.
**Solution**: Return ISO 8601 strings from FastAPI and use a library like `date-fns` or native `Intl.DateTimeFormat` in the frontend to ensure consistent display.

### 4. Database Session Leaks
**Problem**: Improper handling of `get_session()` in FastAPI dependencies can lead to SQLite "Database is locked" errors.
**Solution**: Use FastAPI's dependency injection system with `yield` to ensure sessions are closed after every request.

## Existing Code Analysis

### Models
- `SimulationResult`: Contains the aggregate metrics (CAGR, Sharpe, etc.).
- `DailyPerformance`: Contains the time-series data for the charts.
- **Integration**: The backend needs two primary endpoints:
  1. `GET /simulations`: List all available results.
  2. `GET /simulations/{id}/performance`: Get the daily data for one result.

### Engine
- `src/engine/analytics.py` already contains the logic for MDD and CAGR. We can leverage these for any on-the-fly calculations if needed.

## Tech Stack Confirmation
- **Backend**: FastAPI + SQLModel.
- **Frontend**: React (Vite) + TypeScript + Tailwind CSS.
- **Charts**: Lightweight Charts.
- **State**: TanStack Query + React Router (for stateful URLs).
