import os
import sys
import pandas as pd
from datetime import datetime, timedelta
from sqlmodel import select, Session

# Ensure src is in the path
sys.path.append(os.getcwd())

from src.db.session import init_db, get_session
from src.db.models import Observation
from src.db.aligned_models import AlignedObservation
from src.ingest.alignment import AlignmentEngine

SERIES_MAP = {
    "SP500": "sp500",
    "GOLDAMGBD228NLBM": "gold",
    "DGS10": "treasury_10y",
    "CPIAUCSL": "cpi"
}

def align_data():
    init_db()
    session = get_session()
    engine = AlignmentEngine()

    print("Fetching raw observations for alignment...")
    series_dict = {}
    for series_id in SERIES_MAP.keys():
        statement = select(Observation).where(Observation.series_id == series_id).order_by(Observation.date)
        results = session.exec(statement).all()
        
        if results:
            dates = [r.date for r in results]
            values = [r.value for r in results]
            series_dict[series_id] = pd.Series(values, index=dates)
            print(f"Loaded {len(results)} observations for {series_id}")

    if not series_dict:
        print("No data found to align.")
        session.close()
        return

    print("Aligning time-series...")
    aligned_df = engine.align_all(series_dict)
    
    # Map back to column names
    aligned_df = aligned_df.rename(columns=SERIES_MAP)

    print(f"Storing {len(aligned_df)} aligned observations...")
    for date, row in aligned_df.iterrows():
        # Insert or update
        aligned_obs = session.get(AlignedObservation, date)
        if not aligned_obs:
            aligned_obs = AlignedObservation(
                date=date,
                sp500=row.get('sp500'),
                gold=row.get('gold'),
                treasury_10y=row.get('treasury_10y'),
                cpi=row.get('cpi')
            )
            session.add(aligned_obs)
        else:
            aligned_obs.sp500 = row.get('sp500')
            aligned_obs.gold = row.get('gold')
            aligned_obs.treasury_10y = row.get('treasury_10y')
            aligned_obs.cpi = row.get('cpi')
            session.add(aligned_obs)

    session.commit()
    print("Alignment complete.")
    session.close()

if __name__ == "__main__":
    align_data()
