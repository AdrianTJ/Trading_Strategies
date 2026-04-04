import pytest
import pandas as pd
import numpy as np
from src.engine.analytics import (
    calculate_cagr,
    calculate_max_drawdown,
    calculate_sharpe_ratio,
    calculate_sortino_ratio
)

def test_calculate_cagr():
    # Double in 1 year
    assert pytest.approx(calculate_cagr(100, 200, 365.25)) == 1.0
    # No growth
    assert calculate_cagr(100, 100, 365.25) == 0.0
    # Negative growth
    assert pytest.approx(calculate_cagr(200, 100, 365.25)) == -0.5

def test_calculate_max_drawdown():
    # Simple drawdown
    portfolio = pd.Series([100, 110, 105, 120, 110, 100, 130])
    # Peak at 120, low at 100. Drawdown = (100 - 120) / 120 = -0.1666...
    assert pytest.approx(calculate_max_drawdown(portfolio)) == -20/120

def test_calculate_sharpe_ratio():
    # Constant 0.1% daily return, 0 risk free
    returns = pd.Series([0.001] * 252)
    # Mean = 0.001, Std = 0 (in theory, but small due to float)
    # If std is 0, we return 0. Let's add some noise.
    returns = pd.Series([0.01, -0.01] * 126) # mean 0, std 0.01
    assert calculate_sharpe_ratio(returns, 0.0) == 0.0
    
    # 0.1% daily return with 0.1% std
    # mean 0.001, std 0.001
    # Sharpe = (0.001/0.001) * sqrt(252) = sqrt(252)
    # We need a series with exactly those props
    returns = pd.Series([0.002, 0.000] * 126)
    mean = returns.mean() # 0.001
    std = returns.std(ddof=1) # 0.001414... (np.sqrt(0.001**2 + 0.001**2) / 1) - no, pandas std uses ddof=1
    
    # Let's use a simpler approach for the test
    # If mean = 0.001, std = 0.001, sharpe should be sqrt(252)
    # To get std 0.001, mean 0.001: [0.002, 0.000] has mean 0.001. 
    # Variance = [(0.002-0.001)^2 + (0.000-0.001)^2] / (n-1) = [0.000001 + 0.000001] / 1 = 0.000002
    # std = sqrt(0.000002)
    
    expected_sharpe = (returns.mean() / returns.std()) * np.sqrt(252)
    assert pytest.approx(calculate_sharpe_ratio(returns, 0.0)) == expected_sharpe

def test_calculate_sortino_ratio():
    # Only positive returns -> Sortino should be high/inf (limited by code to avoid div by zero)
    returns = pd.Series([0.01] * 252)
    assert calculate_sortino_ratio(returns, 0.0) == 0.0 # because downside_deviation is 0
    
    # 0.1% daily return with 0.1% downside deviation
    # returns: [0.002, -0.001, 0.002, -0.001]
    # excess: [0.002, -0.001, 0.002, -0.001]
    # mean: 0.0005
    # downside diffs: [0, -0.001, 0, -0.001]
    # mean(downside_diffs^2) = (0 + 0.000001 + 0 + 0.000001) / 4 = 0.0000005
    # downside_deviation = sqrt(0.0000005) = 0.000707
    # sortino = (0.0005 / 0.000707) * sqrt(252)
    
    returns = pd.Series([0.002, -0.001] * 126)
    excess_mean = returns.mean() # 0.0005
    downside_deviation = np.sqrt(np.mean(np.minimum(0, returns)**2))
    expected_sortino = (excess_mean / downside_deviation) * np.sqrt(252)
    
    assert pytest.approx(calculate_sortino_ratio(returns, 0.0)) == expected_sortino
