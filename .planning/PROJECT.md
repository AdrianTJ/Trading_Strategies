# StrategyTracker

## What This Is

A platform for tracking and comparing common trading strategies (Dollar Cost Averaging, lump sum, dip buying) across commodities, high-level indexes like the S&P 500, bonds, and ETFs. It is designed for casual investors and their advisors to visualize how different approaches perform over time.

## Core Value

Helping casual investors make more informed decisions by clearly visualizing the long-term performance of various investment strategies.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Connect to FRED API or similar open sources for historical data (last 5 years).
- [ ] Static dashboard for displaying and comparing strategy performance.
- [ ] Implement predefined strategy logic: Weekly/Monthly DCA, Lump Sum at start, and "Buy after 5% dip".
- [ ] Focus on the three main investment vehicles: US Bonds, Gold, and the S&P 500.

### Out of Scope

- [ ] Custom parameters (e.g., specific dip percentages, custom monthly amounts) — Deferred to v2 for simplicity.
- [ ] Simulated portfolios and user accounts — Deferred to v2.
- [ ] Real-time trading or data — Focus is on historical analysis.

## Context

- Targeting casual investors who need clear visualizations to understand investment options.
- Starting with a simple static dashboard connected to a database.
- Initial focus is on high-impact assets: US Bonds, Gold, and S&P 500.
- Historical data will focus on the last 5 years initially.

## Constraints

- **Data Source**: FRED API is preferred for open historical data.
- **Tech Stack**: To be determined (pending research).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 5-Year Scope | Sufficient for casual analysis while keeping initial data processing manageable. | — Pending |
| Static Dashboard First | Focus on core visualization value before adding complexity of user inputs. | — Pending |
| FRED API | Reliable and free source for high-level economic and index data. | — Pending |

---
*Last updated: March 25, 2026 after project initialization*
