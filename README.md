# StrategyTracker

A comprehensive tool for casual investors to backtest and compare investment strategies across multiple asset classes (S&P 500, Gold, US Bonds).

## Features

- **Backtest Strategies**: Compare Lump Sum, Weekly/Monthly DCA, and "Buy the Dip" strategies.
- **Interactive Visuals**: View equity curves and drawdown charts over a 5-year historical window.
- **Benchmarking**: Overlay performance against S&P 500, Bonds, or other strategies.
- **Advanced Metrics**: Track CAGR, Sharpe Ratio, Sortino Ratio, and Max Drawdown.
- **Data Sync**: Automated synchronization with the FRED (Federal Reserve Economic Data) API.

## Tech Stack

- **Backend**: Python 3.9+, FastAPI, SQLModel (SQLite), Pandas, FredAPI.
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide-React, TanStack Query, Lightweight-Charts.

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- A [FRED API Key](https://fred.stlouisfed.org/docs/api/api_key.html) (Optional, but required for data sync)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-repo/Trading_Strategies.git
   cd Trading_Strategies
   ```

2. **Set up the backend**:
   ```bash
   pip install -r requirements.txt
   # Set your FRED API KEY
   export FRED_API_KEY=your_api_key_here
   ```

3. **Set up the frontend**:
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

1. **Start the backend server**:
   ```bash
   # From the root directory
   uvicorn src.api.main:app --reload
   ```

2. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Initial Data Sync**:
   On the dashboard, click the "Sync Data" button to fetch historical series and run the initial simulations.

## Project Structure

```
.
├── src/                # Backend source code
│   ├── api/            # FastAPI routes and models
│   ├── db/             # Database models and session
│   ├── engine/         # Simulation logic and strategies
│   └── ingest/         # Data ingestion and alignment
├── scripts/            # Automation scripts for sync/simulation
├── frontend/           # React frontend
├── tests/              # Backend test suite
└── .planning/          # Project documentation and roadmap
```

## License

MIT
