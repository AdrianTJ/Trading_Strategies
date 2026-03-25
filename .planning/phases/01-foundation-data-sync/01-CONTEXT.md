# Phase 1: Foundation & Data Sync - Context

**Gathered:** March 25, 2026
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers a robust data ingestion pipeline that syncs historical data for S&P 500, Gold, US Bonds, and CPI from the FRED API. It establishes a local SQLite database for caching and provides pre-aligned, daily time-series data ready for strategy simulation in Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Data Persistence Choice
- **Database**: Use a local SQLite database (for simplicity and ease of setup).
- **ORM**: Use `SQLModel` (SQLAlchemy-based) for schema management and type safety.
- **Storage Strategy**: Store both raw JSON responses (for auditability) and structured, cleaned observations.
- **Table Structure**: Use a unified 'observations' table for all FRED series IDs.

### FRED API Interaction
- **Library**: Use the `fredapi` Python library for all API communications.
- **Key Management**: Manage the FRED API key via a local `.env` file.
- **Ingestion Strategy**: Perform a full 5-year period sync for each series.
- **Caching**: Utilize the built-in caching features of the `fredapi` library.

### Data Frequency & Alignment
- **Upsampling**: Monthly FRED data will be upsampled to daily using forward-fill (FFill).
- **Point-in-Time**: Implementation will use point-in-time logic to preserve historical data integrity (no look-ahead bias).
- **Gaps**: Missing data points within a series will be handled using 'forward-fill' (FFill).
- **Alignment Storage**: Store aligned data in pre-aligned database tables for fast reads during simulation.

### Error & Rate Limit Handling
- **Failure Strategy**: Fail fast and log the error for immediate visibility.
- **Missing Series**: If a series ID is missing, skip and flag it in the database but continue the sync.
- **Rate-limiting**: Monitor the FRED API rate limit using response headers.
- **Data Gaps**: Log and skip gaps detected in the historical series.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- None (New project initialization).

### Established Patterns
- Tech stack: Python (FastAPI/Pandas) for backend and data processing.
- Repository uses `learnship` for project management and planning.

### Integration Points
- This phase provides the data foundation that the Phase 2 'Core Simulation Engine' will consume.

</code_context>

<specifics>
## Specific Ideas

- Focus assets: US Bonds, Gold, and S&P 500 as the primary investment vehicles.
- Real Return: CPI data is a core requirement for inflation-adjusted analysis.

</specifics>

<deferred>
## Deferred Ideas

- PostgreSQL/TimescaleDB migration: Deferred to later if scaling issues arise.
- Incremental sync: Deferred to v2 for initial simplicity.
- Dynamic alignment: Deferred in favor of pre-aligned tables for performance.

</deferred>

---
*Phase: 01-foundation-data-sync*
*Context gathered: March 25, 2026*
