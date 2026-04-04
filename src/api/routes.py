import subprocess
import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from src.db.session import get_db
from src.db.results_models import SimulationResult, DailyPerformance

router = APIRouter()

@router.post("/sync-and-run")
def sync_and_run_all(db: Session = Depends(get_db)):
    """Trigger data sync, alignment, and simulation run sequentially."""
    try:
        # Run sync_data.py
        subprocess.run(["python", "scripts/sync_data.py"], check=True)
        
        # Run align_data.py
        subprocess.run(["python", "scripts/align_data.py"], check=True)
        
        # Run run_simulations.py
        # Clear previous results first for simplicity? 
        # For now, let's just let it add more. 
        # But maybe we should clear to avoid duplicates.
        db.exec(select(DailyPerformance)).all() # This doesn't delete
        # Delete old ones
        # Actually, for a production app we should handle this carefully.
        # For the prototype, we'll just run it.
        subprocess.run(["python", "scripts/run_simulations.py"], check=True)
        
        return {"status": "success", "message": "Sync and simulations completed successfully"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Script failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

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
