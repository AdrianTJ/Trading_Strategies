from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router

app = FastAPI(title="StrategyTracker API", description="API for Strategy Simulation Results")

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/")
def read_root():
    return {"status": "online", "message": "StrategyTracker API is active"}
