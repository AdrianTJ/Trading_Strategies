# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-03

### Added
- **Phase 4: Benchmarking & Comparative Dashboard**
  - Integrated benchmark selection (S&P 500, Bonds, Gold) for side-by-side comparison.
  - Added "Comparison Table" for detailed metric comparison (CAGR, Sharpe, Sortino, etc.).
  - Enhanced charts with interactive legends and cross-series tooltips.
  - Added descriptive tooltips for financial metrics to aid casual investors.
- **Phase 3: Analytics & Performance Visuals**
  - Interactive equity curve charts using `lightweight-charts`.
  - Drawdown charts for "max pain" visualization.
  - Monthly returns matrix for historical performance analysis.
- **Phase 2: Core Simulation Engine**
  - Vectorized backtesting engine for DCA (Weekly/Monthly), Lump Sum, and Dip Buy strategies.
  - Transaction cost modeling.
- **Phase 1: Foundation & Data Sync**
  - Automated FRED API integration for S&P 500, Bonds, and Gold.
  - SQLite/SQLModel persistence layer.
  - Time-series data alignment and upsampling.

### Fixed
- Improved chart responsiveness and layout on different screen sizes.
- Fixed data alignment issues between monthly and daily series.

### Changed
- Refactored frontend to use Tailwind CSS for a modern, dark-themed UI.
- Switched to `lightweight-charts` for better performance and interactivity.
