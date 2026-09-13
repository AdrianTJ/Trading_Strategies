import pandas as pd
import numpy as np

def calculate_cagr(start_value: float, end_value: float, days: int) -> float:
    """Calculate Compound Annual Growth Rate."""
    if start_value <= 0 or end_value <= 0 or days <= 0:
        return 0.0
    years = days / 365.25
    return (end_value / start_value) ** (1 / years) - 1

def calculate_max_drawdown(portfolio_values: pd.Series) -> float:
    """Calculate the maximum drawdown percentage."""
    if portfolio_values.empty or (portfolio_values == 0).all():
        return 0.0
    rolling_max = portfolio_values.cummax()
    drawdowns = (portfolio_values - rolling_max) / rolling_max
    return drawdowns.min()

def _annual_to_daily_rate(annual_rate: float) -> float:
    """Convert an annual rate to an equivalent daily rate (252 trading days)."""
    return (1 + annual_rate) ** (1 / 252) - 1

def calculate_sharpe_ratio(daily_returns: pd.Series, risk_free_rate: float = 0.0) -> float:
    """Calculate the annualized Sharpe Ratio."""
    daily_rf = _annual_to_daily_rate(risk_free_rate)
    excess_returns = daily_returns - daily_rf
    std = excess_returns.std()
    if std < 1e-9:
        return 0.0
    return (excess_returns.mean() / std) * np.sqrt(252)

def calculate_sortino_ratio(daily_returns: pd.Series, risk_free_rate: float = 0.0) -> float:
    """Calculate the annualized Sortino Ratio using Downside Deviation."""
    daily_rf = _annual_to_daily_rate(risk_free_rate)
    excess_returns = daily_returns - daily_rf
    # Downside Deviation (RMS of negative excess returns)
    downside_diffs = np.minimum(0, excess_returns)
    downside_deviation = np.sqrt(np.mean(downside_diffs**2))
    
    if downside_deviation < 1e-9:
        return 0.0
        
    return (excess_returns.mean() / downside_deviation) * np.sqrt(252)

def calculate_real_returns(nominal_cum_return: float, start_cpi: float, end_cpi: float) -> float:
    """Adjust nominal returns for inflation using CPI."""
    if start_cpi <= 0 or end_cpi <= 0:
        return nominal_cum_return
    # Real Value = Nominal Value / CPI Ratio
    # (1 + real_ret) = (1 + nom_ret) / (end_cpi / start_cpi)
    cpi_ratio = end_cpi / start_cpi
    return ((1 + nominal_cum_return) / cpi_ratio) - 1
