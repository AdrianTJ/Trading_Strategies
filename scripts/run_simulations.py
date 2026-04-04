import os
import sys
import pandas as pd
from datetime import datetime
from sqlmodel import select, Session

# Ensure src is in the path
sys.path.append(os.getcwd())

from src.db.session import init_db, get_session
from src.db.aligned_models import AlignedObservation
from src.db.results_models import SimulationResult, DailyPerformance
from src.engine.strategies import (
    generate_lump_sum_signals,
    generate_monthly_dca_signals,
    generate_weekly_dca_signals,
    generate_dip_buy_signals
)
from src.engine.simulator import Simulator
from src.engine.analytics import (
    calculate_cagr,
    calculate_max_drawdown,
    calculate_sharpe_ratio,
    calculate_sortino_ratio,
    calculate_real_returns
)

STRATEGIES = {
    "lump-sum": generate_lump_sum_signals,
    "monthly-dca": generate_monthly_dca_signals,
    "weekly-dca": generate_weekly_dca_signals,
    "dip-buy": lambda df: generate_dip_buy_signals(df, -0.05)
}

ASSETS = ["sp500", "gold", "treasury_10y"]

def run_simulations(initial_cash: float = 10000.0):
    init_db()
    session = get_session()
    
    print("Loading aligned data...")
    statement = select(AlignedObservation).order_by(AlignedObservation.date)
    results = session.exec(statement).all()
    
    if not results:
        print("No aligned data found. Run align_data.py first.")
        session.close()
        return

    df = pd.DataFrame([r.model_dump() for r in results])
    df.set_index('date', inplace=True)
    
    # Risk free rate proxy (average 10Y treasury yield over the period)
    # Convert from percentage (e.g. 3.5) to decimal (0.035)
    rf_rate = df['treasury_10y'].mean() / 100.0 if 'treasury_10y' in df else 0.03
    
    for asset in ASSETS:
        if asset not in df.columns or df[asset].isnull().all():
            print(f"Skipping asset {asset} (no data)")
            continue
            
        asset_df = df[[asset, 'cpi']].rename(columns={asset: 'close'})
        
        for strat_name, signal_func in STRATEGIES.items():
            print(f"Running {strat_name} on {asset}...")
            
            signals = signal_func(asset_df)
            simulator = Simulator(initial_cash=initial_cash)
            
            # For DCA, we invest $1000 per signal
            invest_amount = 1000.0 if "dca" in strat_name else None
            
            sim_df = simulator.run(asset_df, signals, invest_amount=invest_amount)
            
            # Calculate metrics
            total_ret = sim_df.iloc[-1]['cumulative_return']
            total_invested = sim_df.iloc[-1]['total_invested']
            final_value = sim_df.iloc[-1]['portfolio_value']
            days = (sim_df.index[-1] - sim_df.index[0]).days
            cagr = calculate_cagr(total_invested, final_value, days)
            mdd = calculate_max_drawdown(sim_df['portfolio_value'])
            sharpe = calculate_sharpe_ratio(sim_df['daily_return'], rf_rate)
            sortino = calculate_sortino_ratio(sim_df['daily_return'], rf_rate)
            
            # Real returns
            start_cpi = sim_df.iloc[0]['cpi']
            end_cpi = sim_df.iloc[-1]['cpi']
            real_total_ret = calculate_real_returns(total_ret, start_cpi, end_cpi)
            # CAGR adjustment for real returns
            real_final_val = total_invested * (1 + real_total_ret)
            real_cagr = calculate_cagr(total_invested, real_final_val, days)

            # Store result
            res = SimulationResult(
                strategy_name=strat_name,
                asset_id=asset,
                start_date=sim_df.index[0],
                end_date=sim_df.index[-1],
                initial_cash=initial_cash,
                total_return=total_ret,
                cagr=cagr,
                sharpe_ratio=sharpe,
                sortino_ratio=sortino,
                max_drawdown=mdd,
                real_total_return=real_total_ret,
                real_cagr=real_cagr
            )
            session.add(res)
            session.commit()
            session.refresh(res)
            
            # Store daily performance
            print(f"Saving daily performance for {strat_name}...")
            daily_perfs = []
            for date, row in sim_df.iterrows():
                daily_perfs.append(DailyPerformance(
                    simulation_id=res.id,
                    date=date,
                    cash_balance=row['cash_balance'],
                    asset_units=row['asset_units'],
                    asset_price=row['close'],
                    portfolio_value=row['portfolio_value'],
                    daily_return=row['daily_return'],
                    cumulative_return=row['cumulative_return']
                ))
            
            # Bulk insert for speed
            session.add_all(daily_perfs)
            session.commit()
            print(f"Finished {strat_name} on {asset}.")

    session.close()
    print("All simulations complete.")

if __name__ == "__main__":
    run_simulations()
