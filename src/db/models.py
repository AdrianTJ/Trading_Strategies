from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field

class Series(SQLModel, table=True):
    series_id: str = Field(primary_key=True)
    title: Optional[str] = None
    units: Optional[str] = None
    frequency: Optional[str] = None
    last_updated: Optional[datetime] = None

class Observation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    series_id: str = Field(index=True)
    date: datetime = Field(index=True)
    value: float
    realtime_start: Optional[datetime] = None
    realtime_end: Optional[datetime] = None
