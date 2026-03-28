from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field

class SimulationResult(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    strategy_name: str = Field(index=True)
    asset_id: str = Field(index=True)
    run_date: datetime = Field(default_factory=datetime.now)
    
    # Parameters
    start_date: datetime
    end_date: datetime
    initial_cash: float
    
    # Aggregate Metrics
    total_return: float
    cagr: float
    sharpe_ratio: Optional[float] = None
    sortino_ratio: Optional[float] = None
    max_drawdown: float
    
    # Inflation Adjusted Metrics
    real_total_return: Optional[float] = None
    real_cagr: Optional[float] = None

class DailyPerformance(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    simulation_id: int = Field(foreign_key="simulationresult.id", index=True)
    date: datetime = Field(index=True)
    
    # Daily state
    cash_balance: float
    asset_units: float
    asset_price: float
    portfolio_value: float
    daily_return: float
    cumulative_return: float
