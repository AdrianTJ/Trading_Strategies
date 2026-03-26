import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Ensure src is in the path
sys.path.append(os.getcwd())

from src.db.session import init_db, get_session
from src.db.models import Series, Observation
from src.ingest.fred_client import FredClient

load_dotenv()

SERIES_IDS = [
    "SP500",                  # S&P 500
    "GOLDAMGBD228NLBM",       # Gold
    "DGS10",                  # 10-Year Treasury
    "CPIAUCSL"                # CPI
]

def sync_data():
    init_db()
    
    api_key = os.getenv("FRED_API_KEY")
    if not api_key:
        print("Error: FRED_API_KEY not found in .env")
        return

    client = FredClient(api_key=api_key)
    session = get_session()

    start_date = datetime.now() - timedelta(days=5*365)
    print(f"Syncing data from {start_date.date()}...")

    for series_id in SERIES_IDS:
        print(f"Fetching {series_id}...")
        try:
            # Metadata
            info = client.fetch_series_info(series_id)
            series = session.get(Series, series_id)
            if not series:
                series = Series(
                    series_id=series_id,
                    title=info.get('title'),
                    units=info.get('units'),
                    frequency=info.get('frequency'),
                    last_updated=datetime.now()
                )
                session.add(series)
            
            # Observations
            obs_series = client.fetch_observations(series_id, start_date=start_date)
            
            # Efficient bulk insertion/update (simplified for v1)
            for date, value in obs_series.items():
                if pd.isna(value) or value == ".":
                    continue
                
                # Check if observation already exists to avoid duplicates
                # In a real production system, this should be optimized.
                # For Phase 1, we just insert.
                obs = Observation(
                    series_id=series_id,
                    date=date,
                    value=float(value),
                    realtime_start=datetime.now()
                )
                session.add(obs)
            
            session.commit()
            print(f"Successfully synced {len(obs_series)} observations for {series_id}")

        except Exception as e:
            session.rollback()
            print(f"Error syncing {series_id}: {str(e)}")

    session.close()

if __name__ == "__main__":
    import pandas as pd # Ensure pandas is imported locally for isna check
    sync_data()
