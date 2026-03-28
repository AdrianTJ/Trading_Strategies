import pandas as pd
import numpy as np
import pytest
from src.engine.analytics import (
    calculate_cagr,
    calculate_max_drawdown,
    calculate_sharpe_ratio,
    calculate_sortino_ratio,
    calculate_real_returns
)

def test_calculate_cagr():
    # 100% growth over 1 year (365.25 days)
    assert round(calculate_cagr(100, 200, 365), 2) == 1.00
    # No growth
    assert calculate_cagr(100, 100, 365) == 0.0

def test_calculate_max_drawdown():
    vals = pd.Series([100, 110, 90, 120, 80, 130])
    # Peak was 120, dropped to 80. (80-120)/120 = -0.3333333333333333
    assert calculate_max_drawdown(vals) == pytest.approx(-0.3333, abs=1e-4)

def test_calculate_sharpe_ratio():
    # Steady 1% daily return, 0 volatility
    rets = pd.Series([0.01] * 100)
    # std < 1e-9 returns 0.0
    assert calculate_sharpe_ratio(rets, 0.0) == 0.0
    
    # Random returns
    np.random.seed(42)
    rets = pd.Series(np.random.normal(0.0005, 0.01, 1000))
    sharpe = calculate_sharpe_ratio(rets, 0.03)
    assert isinstance(sharpe, float)

def test_calculate_real_returns():
    # 50% nominal return, 10% inflation
    # (1 + 0.5) / 1.1 - 1 = 1.5/1.1 - 1 = 0.3636
    assert round(calculate_real_returns(0.5, 100, 110), 4) == 0.3636
