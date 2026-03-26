import os
import pytest
from datetime import datetime
from sqlmodel import create_engine, Session, SQLModel, select
from src.db.models import Series, Observation

TEST_DATABASE_URL = "sqlite:///./test.db"

@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(TEST_DATABASE_URL)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)
    if os.path.exists("test.db"):
        os.remove("test.db")

def test_create_series_and_observation(session: Session):
    series = Series(series_id="SP500", title="S&P 500 Index")
    session.add(series)
    session.commit()

    observation = Observation(
        series_id="SP500",
        date=datetime(2023, 1, 1),
        value=3800.5
    )
    session.add(observation)
    session.commit()

    statement = select(Series).where(Series.series_id == "SP500")
    results = session.exec(statement)
    db_series = results.one()
    assert db_series.title == "S&P 500 Index"

    statement = select(Observation).where(Observation.series_id == "SP500")
    results = session.exec(statement)
    db_observation = results.one()
    assert db_observation.value == 3800.5
