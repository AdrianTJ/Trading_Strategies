import os
from sqlmodel import create_engine, SQLModel, Session

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./trading_strategies.db")

engine = create_engine(DATABASE_URL, echo=False)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    return Session(engine)
