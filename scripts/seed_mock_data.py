import datetime
from sqlmodel import Session
from src.db.session import engine
from src.db.results_models import SimulationResult, DailyPerformance

def seed_mock_data():
    with Session(engine) as session:
        # Check if we already have data
        from sqlmodel import select
        if session.exec(select(SimulationResult)).first():
            print("Database already has data. Skipping seed.")
            return

        mock_sim = SimulationResult(
            strategy_name="lump-sum",
            asset_id="sp500",
            run_date=datetime.datetime.now(),
            start_date=datetime.date(2020, 1, 1),
            end_date=datetime.date(2025, 1, 1),
            initial_cash=10000.0,
            total_return=0.5,
            cagr=0.08,
            sharpe_ratio=1.2,
            sortino_ratio=1.5,
            max_drawdown=0.15,
            is_benchmark=False
        )
        session.add(mock_sim)
        session.commit()
        session.refresh(mock_sim)

        # Add some performance data
        for i in range(100):
            date = datetime.date(2020, 1, 1) + datetime.timedelta(days=i)
            perf = DailyPerformance(
                simulation_id=mock_sim.id,
                date=date,
                cash_balance=10000.0,
                asset_units=1.0,
                asset_price=10000.0 + (i * 10),
                portfolio_value=10000.0 + (i * 10),
                daily_return=0.001,
                cumulative_return=(i * 0.001)
            )
            session.add(perf)
        
        # Add a benchmark
        mock_bench = SimulationResult(
            strategy_name="S&P 500 Index",
            asset_id="sp500",
            run_date=datetime.datetime.now(),
            start_date=datetime.date(2020, 1, 1),
            end_date=datetime.date(2025, 1, 1),
            initial_cash=10000.0,
            total_return=0.45,
            cagr=0.075,
            sharpe_ratio=1.1,
            sortino_ratio=1.4,
            max_drawdown=0.18,
            is_benchmark=True
        )
        session.add(mock_bench)
        session.commit()
        session.refresh(mock_bench)

        print("Seeded mock data successfully.")

if __name__ == "__main__":
    seed_mock_data()
