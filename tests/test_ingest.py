import os
import sys
import pytest
from datetime import datetime
from unittest.mock import MagicMock, patch
import pandas as pd
from sqlmodel import Session, select

# Ensure src is in the path
sys.path.append(os.getcwd())

from src.db.models import Series, Observation
from src.ingest.fred_client import FredClient
from scripts.sync_data import sync_data

@pytest.fixture(name="mock_fred")
def mock_fred_fixture():
    with patch('src.ingest.fred_client.Fred') as mock:
        yield mock

@pytest.fixture(name="mock_db_session")
def mock_db_session_fixture():
    with patch('scripts.sync_data.get_session') as mock_session, \
         patch('scripts.sync_data.init_db') as mock_init:
        yield mock_session

def test_sync_data_logic(mock_fred, mock_db_session):
    # Mocking Fred Client response
    mock_fred_instance = mock_fred.return_value
    mock_fred_instance.get_series_info.return_value = MagicMock(to_dict=lambda: {'title': 'Test Series', 'units': 'USD', 'frequency': 'D'})
    
    dates = pd.date_range(start='2023-01-01', periods=5)
    mock_fred_instance.get_series.return_value = pd.Series([100, 101, 102, 103, 104], index=dates)

    # Mocking Database Session
    mock_session_instance = mock_db_session.return_value
    mock_session_instance.get.return_value = None # No existing series

    # Calling the sync_data function
    with patch('scripts.sync_data.os.getenv', return_value='test_key'):
        sync_data()

    # Verifying Fred Client calls
    assert mock_fred_instance.get_series_info.call_count == 4
    assert mock_fred_instance.get_series.call_count == 4

    # Verifying Session add and commit calls
    # 4 series + (5 observations * 4 series) = 24 adds
    assert mock_session_instance.add.call_count == 24
    assert mock_session_instance.commit.call_count == 4
