import os
from sqlmodel import create_engine, SQLModel, Session

# Import models to register them
from src.db.models import Series, Observation
from src.db.aligned_models import AlignedObservation
from src.db.results_models import SimulationResult, DailyPerformance

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./trading_strategies.db")

engine = create_engine(DATABASE_URL, echo=False)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    return Session(engine)

def get_db():
    with Session(engine) as session:
        yield session
