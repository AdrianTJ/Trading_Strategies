import pandas as pd
import numpy as np

def generate_lump_sum_signals(df: pd.DataFrame) -> pd.Series:
    """Signal to buy everything on the first available day."""
    signals = pd.Series(0, index=df.index)
    if len(signals) > 0:
        signals.iloc[0] = 1
    return signals

def generate_monthly_dca_signals(df: pd.DataFrame) -> pd.Series:
    """Signal to buy on the first trading day of each month."""
    # Find the first trading day of each month
    signals = pd.Series(0, index=df.index)
    monthly_first_days = df.resample('MS').first().index
    # Map back to the actual trading days in the DataFrame
    # (resample 'MS' might produce dates that aren't in the index if the 1st is a holiday)
    actual_trading_days = []
    for day in monthly_first_days:
        # Find the first date in the index >= this month start
        matches = df.index[df.index >= day]
        if not matches.empty:
            actual_trading_days.append(matches[0])
    
    signals.loc[actual_trading_days] = 1
    return signals

def generate_weekly_dca_signals(df: pd.DataFrame) -> pd.Series:
    """Signal to buy on the first trading day of each week."""
    signals = pd.Series(0, index=df.index)
    weekly_first_days = df.resample('W-MON').first().index
    actual_trading_days = []
    for day in weekly_first_days:
        matches = df.index[df.index >= day]
        if not matches.empty:
            actual_trading_days.append(matches[0])
    
    signals.loc[actual_trading_days] = 1
    return signals

def generate_dip_buy_signals(df: pd.DataFrame, dip_threshold: float = -0.05) -> pd.Series:
    """Signal to buy when price drops by X% vs previous close."""
    # Calculate daily returns
    daily_returns = df['close'].pct_change()
    signals = (daily_returns <= dip_threshold).astype(int)
    return signals
