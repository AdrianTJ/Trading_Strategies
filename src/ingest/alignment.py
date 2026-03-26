import pandas as pd
from typing import Dict

class AlignmentEngine:
    def __init__(self):
        pass

    def upsample_series(self, series: pd.Series, freq: str = 'D') -> pd.Series:
        """Upsample a series to the target frequency and forward-fill gaps."""
        return series.resample(freq).ffill()

    def align_all(self, series_dict: Dict[str, pd.Series]) -> pd.DataFrame:
        """Align all series into a single daily DataFrame."""
        # 1. Upsample all series to Daily
        daily_series = {
            sid: self.upsample_series(s) for sid, s in series_dict.items()
        }
        
        # 2. Merge all series on the date index
        df = pd.concat(daily_series.values(), axis=1, keys=daily_series.keys())
        
        # 3. Final forward-fill for any missing rows at the end/beginning
        df = df.ffill()
        
        return df
