import pandas as pd
import pytest
from src.engine.strategies import (
    generate_lump_sum_signals, 
    generate_monthly_dca_signals,
    generate_weekly_dca_signals,
    generate_dip_buy_signals
)
from src.engine.simulator import Simulator

@pytest.fixture
def sample_data():
    dates = pd.date_range(start='2023-01-01', periods=100, freq='D')
    # Simple linear price growth from 100 to 200
    prices = [100 + i for i in range(100)]
    return pd.DataFrame({'close': prices}, index=dates)

def test_lump_sum_simulation(sample_data):
    signals = generate_lump_sum_signals(sample_data)
    simulator = Simulator(initial_cash=10000.0, commission=0, slippage=0)
    results = simulator.run(sample_data, signals)
    
    # Buy at day 2 price (101) because of next-day open
    # Units = 10000 / 101 = 99.0099
    # Final Value = 99.0099 * 199 (day 100 price) = 19702.97
    assert results.iloc[1]['execute_buy'] == 1
    assert round(results.iloc[-1]['portfolio_value'], 2) == 19702.97

def test_monthly_dca_simulation(sample_data):
    signals = generate_monthly_dca_signals(sample_data)
    # Jan 1st signal -> Jan 2nd buy
    # Feb 1st signal -> Feb 2nd buy
    # March 1st signal -> March 2nd buy
    simulator = Simulator(initial_cash=10000.0, commission=0, slippage=0)
    results = simulator.run(sample_data, signals, invest_amount=1000.0)
    
    # Jan 1st is sample_data.index[0]
    # Jan 2nd execution
    assert results.iloc[1]['execute_buy'] == 1
    # Initial 10k is still cash, and 1k was added and invested
    assert results.iloc[1]['cash_balance'] == 10000.0
    assert results.iloc[1]['total_invested'] == 11000.0
    
    # 4 months total in 100 days
    assert signals.sum() >= 3

def test_weekly_dca_signals(sample_data):
    signals = generate_weekly_dca_signals(sample_data)
    # 100 daily days = ~15 calendar weeks, one signal per week
    assert signals.sum() == 15
    buy_days = sample_data.index[signals == 1]
    # All buys are the first trading day of their week (Mondays)
    assert set(buy_days.weekday) == {0}
    # First buy is the first Monday on/after the data start (2023-01-01) is a Sunday
    assert buy_days[0] == pd.Timestamp('2023-01-02')


def test_empty_dataframe_generators_return_empty(sample_data):
    empty = sample_data.iloc[:0]
    assert generate_lump_sum_signals(empty).empty
    assert generate_monthly_dca_signals(empty).empty
    assert generate_weekly_dca_signals(empty).empty
    assert generate_dip_buy_signals(empty).empty


def test_dip_buy_signals(sample_data):
    # No dips in linear growth
    signals = generate_dip_buy_signals(sample_data, dip_threshold=-0.01)
    assert signals.sum() == 0
    
    # Create a dip
    sample_data.iloc[10] = 50.0 # 50% drop
    signals = generate_dip_buy_signals(sample_data, dip_threshold=-0.05)
    assert signals.iloc[10] == 1
