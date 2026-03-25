# Phase 1: Foundation & Data Sync - Research

## Target FRED Series IDs
- **S&P 500**: `SP500` (Daily)
- **Gold (London PM Fix)**: `GOLDAMGBD228NLBM` (Daily, USD per Troy Ounce)
- **10-Year Treasury Constant Maturity Rate**: `DGS10` (Daily, Percent)
- **Consumer Price Index (CPI)**: `CPIAUCSL` (Monthly, Index 1982-1984=100)

## Don't Hand-Roll
- **API Client**: Use the `fredapi` library. It handles the API requests, parsing, and converts results directly to Pandas Series.
- **ORM**: Use `SQLModel`. It combines the best of SQLAlchemy and Pydantic, providing both DB session management and data validation in one model.
- **Time-Series Alignment**: Use `pandas` `.resample('D').ffill()`. Don't manually iterate through dates to fill gaps; pandas is optimized for this.

## Implementation Details

### SQLModel Schema Strategy
A unified `Observation` table is more flexible than a table-per-series approach.
```python
class Observation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    series_id: str = Field(index=True)
    date: datetime = Field(index=True)
    value: float
    realtime_start: datetime
    realtime_end: datetime
```

### Data Alignment Logic
1. Fetch all series for the 5-year window.
2. For each series:
    - If daily: forward-fill weekends/holidays.
    - If monthly (CPI): upsample to daily and forward-fill.
3. Merge all series on the `date` index.
4. Store the resulting "Pre-aligned" table for Phase 2.

## Common Pitfalls
- **API Rate Limits**: FRED has a limit of 120 requests per minute. While our initial sync is small (4-5 series), repeated test runs could trigger limits. Use `fredapi`'s built-in caching or our local SQLite cache.
- **Look-Ahead Bias**: Ensure that when using CPI (monthly) alongside S&P 500 (daily), the monthly value is only applied *after* it would have been released (usually mid-month). For v1, a simple FFill is acceptable, but note the release lag.
- **FRED Data Gaps**: `SP500` may have `.` or `NaN` for holidays. Ensure these are handled BEFORE calculating returns in Phase 2.
- **Units**: S&P 500 and Gold are prices; DGS10 is a rate (percentage). Ensure simulation logic in Phase 2 accounts for this difference.
