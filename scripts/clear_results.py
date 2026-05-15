import os
import sys
from sqlmodel import Session, select, delete

# Ensure src is in the path
sys.path.append(os.getcwd())

from src.db.session import init_db, get_session
from src.db.results_models import SimulationResult, DailyPerformance

def clear_results():
    init_db()
    session = get_session()
    
    print("Clearing simulation results and performance data...")
    
    # Delete all daily performance records
    statement_perf = delete(DailyPerformance)
    session.exec(statement_perf)
    
    # Delete all simulation results
    statement_sim = delete(SimulationResult)
    session.exec(statement_sim)
    
    session.commit()
    session.close()
    print("Cleanup complete.")

if __name__ == "__main__":
    clear_results()
