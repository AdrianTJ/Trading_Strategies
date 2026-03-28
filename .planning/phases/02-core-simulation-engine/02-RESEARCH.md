# Phase 2: Core Simulation Engine - Research

## Vectorized Strategy Logic (Pandas)
Vectorization allows us to avoid slow Python loops. By using Pandas, we can calculate entries and positions across 5 years of daily data in milliseconds.

### DCA (Weekly/Monthly)
- **Logic**: Identify the first trading day of each period (week/month).
- **Pandas Technique**: Use `.resample('W')` or `.resample('MS')` on the aligned price DataFrame to find signal dates.
- **Cash Flow**: Track cumulative cash invested and cumulative units bought.

### 5% Dip Buying
- **Logic**: Signal triggered when `(current_price / previous_close) <= 0.95`.
- **Pandas Technique**: `df['price'].pct_change() <= -0.05`.
- **Execution**: Apply "Next Day Open" logic by shifting the signal vector by one day (`.shift(1)`).

## Risk Metrics Calculation

### Sharpe Ratio
- **Formula**: `(Strategy Return - Risk-Free Rate) / Strategy Standard Deviation`.
- **Implementation**: Use the 10-Year Treasury rate (`DGS10` from FRED) as the risk-free proxy. Calculate on daily excess returns and annualize by multiplying by `sqrt(252)`.

### Sortino Ratio
- **Formula**: Similar to Sharpe, but only considers "downside" deviation (standard deviation of negative returns).
- **Implementation**: Filter the daily excess returns for values `< 0` before calculating the standard deviation.

### Max Drawdown
- **Implementation**:
    1. Calculate cumulative returns: `cum_rets = (1 + daily_rets).cumprod()`.
    2. Calculate the rolling peak: `peak = cum_rets.cummax()`.
    3. Calculate drawdown: `drawdown = (cum_rets - peak) / peak`.
    4. Max drawdown is `drawdown.min()`.

## Don't Hand-Roll
- **Vectorized Backtesting**: While we aren't using a full library like `VectorBT` to keep complexity low, we should use Pandas' built-in vectorized methods (`shift`, `cumprod`, `pct_change`) rather than iterating through rows.
- **Risk Metrics**: Use standard financial formulas. Avoid custom "magic" weighting unless requested.

## Common Pitfalls
- **Look-Ahead Bias**: In vectorized logic, it's easy to accidentally use `df['price']` for both the signal and the execution. Always ensure the signal at `t` is used to execute at `t+1` price.
- **Slippage on Large Trades**: Even for casual investors, assuming "mid-market" fills is unrealistic. A fixed percentage slippage (0.05%) applied to the execution price is a good safety margin.
- **Holiday Gaps**: FRED data `SP500` is missing on market holidays. Our Phase 1 FFill handled this, but ensure simulation logic doesn't "trade" on days where the market was actually closed (unless it's a scheduled DCA).
- **Inflation Adjustment**: To calculate "Real Returns", we must divide the nominal cumulative returns by the CPI ratio: `real_cum_ret = nominal_cum_ret / (current_cpi / start_cpi)`.
