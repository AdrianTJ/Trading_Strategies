import pandas as pd
import pytest
from datetime import datetime
from src.ingest.alignment import AlignmentEngine

def test_upsample_series():
    engine = AlignmentEngine()
    
    # Monthly data: 2 months
    dates = pd.to_datetime(['2023-01-01', '2023-02-01'])
    series = pd.Series([100.0, 110.0], index=dates)
    
    upsampled = engine.upsample_series(series)
    
    # Check if we have 32 days (Jan 1st to Feb 1st)
    assert len(upsampled) == 32
    assert upsampled['2023-01-15'] == 100.0
    assert upsampled['2023-02-01'] == 110.0

def test_align_all():
    engine = AlignmentEngine()
    
    # Daily series: 3 days
    daily_dates = pd.to_datetime(['2023-01-01', '2023-01-02', '2023-01-03'])
    daily_series = pd.Series([1.0, 2.0, 3.0], index=daily_dates)
    
    # Monthly series
    monthly_dates = pd.to_datetime(['2023-01-01'])
    monthly_series = pd.Series([10.0], index=monthly_dates)
    
    series_dict = {
        'daily': daily_series,
        'monthly': monthly_series
    }
    
    aligned_df = engine.align_all(series_dict)
    
    assert len(aligned_df) == 3
    assert aligned_df.loc['2023-01-01', 'daily'] == 1.0
    assert aligned_df.loc['2023-01-01', 'monthly'] == 10.0
    assert aligned_df.loc['2023-01-03', 'monthly'] == 10.0 # FFilled
