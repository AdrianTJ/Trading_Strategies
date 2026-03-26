import os
from datetime import datetime, timedelta
from typing import List, Dict, Any
from fredapi import Fred
from dotenv import load_dotenv
import pandas as pd

load_dotenv()

class FredClient:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("FRED_API_KEY")
        if not self.api_key:
            raise ValueError("FRED_API_KEY must be set in .env or passed to the client.")
        self.fred = Fred(api_key=self.api_key)

    def fetch_series_info(self, series_id: str) -> Dict[str, Any]:
        """Fetch metadata for a given series."""
        info = self.fred.get_series_info(series_id)
        return info.to_dict()

    def fetch_observations(self, series_id: str, start_date: datetime = None) -> pd.Series:
        """Fetch historical observations for a series."""
        if not start_date:
            start_date = datetime.now() - timedelta(days=5*365)
        
        return self.fred.get_series(series_id, observation_start=start_date)

class SyncManager:
    def __init__(self, client: FredClient, session):
        self.client = client
        self.session = session

    def sync_series(self, series_id: str):
        """Sync metadata and observations for a series."""
        # This will be implemented in scripts/sync_data.py for Task 3
        # but the SyncManager will provide the core logic.
        pass
