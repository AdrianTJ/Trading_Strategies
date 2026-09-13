# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Simulator:** `invest_amount=0.0` was silently treated as "not provided", so an explicit zero fell through to the lump-sum branch and invested the entire cash balance instead of nothing. Root cause: the guard used a truthiness test (`if invest_amount:`), which cannot distinguish `0.0` from `None`; the docstring promises that only `None` means "invest all cash". Now guarded with `is not None`.
- **Analytics:** `calculate_max_drawdown` returned `NaN` for an empty or all-flat-zero portfolio, while every sibling guard in the module (`calculate_cagr`, `calculate_sharpe_ratio`, `calculate_sortino_ratio`, `calculate_real_returns`) returns `0.0`. Root cause: `cummax()` of an all-zero series divides by zero. Now returns `0.0`.

### Changed
- **Strategies:** extracted `_first_trading_days`, deduplicating the monthly and weekly signal generators. The per-period index scan is replaced with `searchsorted`, which is O(n log m) rather than O(n·m).
- **Simulator:** the buy logic now has a single purchase point instead of duplicating the execution-price and unit maths across both branches, and the daily-returns loop uses pairwise `zip` rather than index arithmetic.
- **Analytics:** extracted `_annual_to_daily_rate`, shared by `calculate_sharpe_ratio` and `calculate_sortino_ratio`.
- Removed a no-op `__init__` from `AlignmentEngine` and an unused import from `fred_client`.

### Added
- Regression tests for both defects: `test_zero_invest_amount_invests_nothing` and `test_calculate_max_drawdown_guards_empty_and_zero`. Both fail against the previous implementation.

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
