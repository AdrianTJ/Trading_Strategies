from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field

class AlignedObservation(SQLModel, table=True):
    date: datetime = Field(primary_key=True)
    sp500: Optional[float] = None
    gold: Optional[float] = None
    treasury_10y: Optional[float] = None
    cpi: Optional[float] = None
