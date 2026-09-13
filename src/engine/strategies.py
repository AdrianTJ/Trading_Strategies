import pandas as pd

def generate_lump_sum_signals(df: pd.DataFrame) -> pd.Series:
    """Signal to buy everything on the first available day."""
    signals = pd.Series(0, index=df.index)
    if len(signals) > 0:
        signals.iloc[0] = 1
    return signals

def _first_trading_days(df: pd.DataFrame, freq: str) -> pd.Index:
    """First trading day on or after each period start in `freq`."""
    # Resample period starts might not be in the index (e.g. the 1st falls on a
    # holiday), so map each start to the first trading day at or after it.
    period_starts = df.resample(freq).first().index
    positions = df.index.searchsorted(period_starts)
    positions = positions[positions < len(df.index)]
    return df.index[positions]

def generate_monthly_dca_signals(df: pd.DataFrame) -> pd.Series:
    """Signal to buy on the first trading day of each month."""
    signals = pd.Series(0, index=df.index)
    signals.loc[_first_trading_days(df, 'MS')] = 1
    return signals

def generate_weekly_dca_signals(df: pd.DataFrame) -> pd.Series:
    """Signal to buy on the first trading day of each week."""
    signals = pd.Series(0, index=df.index)
    signals.loc[_first_trading_days(df, 'W-MON')] = 1
    return signals

def generate_dip_buy_signals(df: pd.DataFrame, dip_threshold: float = -0.05) -> pd.Series:
    """Signal to buy when price drops by X% vs previous close."""
    daily_returns = df['close'].pct_change()
    signals = (daily_returns <= dip_threshold).astype(int)
    return signals
