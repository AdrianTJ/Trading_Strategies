from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from src.db.session import get_db
from src.db.results_models import SimulationResult, DailyPerformance

router = APIRouter()

@router.get("/simulations", response_model=List[SimulationResult])
def list_simulations(db: Session = Depends(get_db)):
    """List all available simulation results."""
    statement = select(SimulationResult).order_by(SimulationResult.run_date.desc())
    results = db.exec(statement).all()
    return results

@router.get("/simulations/{simulation_id}", response_model=SimulationResult)
def get_simulation_details(simulation_id: int, db: Session = Depends(get_db)):
    """Get aggregate metrics for a specific simulation."""
    result = db.get(SimulationResult, simulation_id)
    if not result:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return result

@router.get("/simulations/{simulation_id}/performance", response_model=List[DailyPerformance])
def get_simulation_performance(simulation_id: int, db: Session = Depends(get_db)):
    """Get the time-series daily performance data for a specific simulation."""
    # First verify simulation exists
    result = db.get(SimulationResult, simulation_id)
    if not result:
        raise HTTPException(status_code=404, detail="Simulation not found")
        
    statement = select(DailyPerformance).where(DailyPerformance.simulation_id == simulation_id).order_by(DailyPerformance.date)
    performance = db.exec(statement).all()
    return performance
