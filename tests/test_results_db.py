import os
import pytest
from datetime import datetime
from sqlmodel import create_engine, Session, SQLModel, select
from src.db.results_models import SimulationResult, DailyPerformance

TEST_DATABASE_URL = "sqlite:///./test_results.db"

@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(TEST_DATABASE_URL)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)
    if os.path.exists("test_results.db"):
        os.remove("test_results.db")

def test_create_simulation_result_and_performance(session: Session):
    result = SimulationResult(
        strategy_name="DCA_Monthly",
        asset_id="SP500",
        start_date=datetime(2020, 1, 1),
        end_date=datetime(2025, 1, 1),
        initial_cash=10000.0,
        total_return=0.5,
        cagr=0.08,
        max_drawdown=-0.15
    )
    session.add(result)
    session.commit()
    session.refresh(result)

    perf = DailyPerformance(
        simulation_id=result.id,
        date=datetime(2020, 1, 2),
        cash_balance=9000.0,
        asset_units=0.25,
        asset_price=4000.0,
        portfolio_value=10000.0,
        daily_return=0.0,
        cumulative_return=0.0
    )
    session.add(perf)
    session.commit()

    statement = select(SimulationResult).where(SimulationResult.strategy_name == "DCA_Monthly")
    db_result = session.exec(statement).one()
    assert db_result.asset_id == "SP500"

    statement = select(DailyPerformance).where(DailyPerformance.simulation_id == result.id)
    db_perf = session.exec(statement).one()
    assert db_perf.portfolio_value == 10000.0
