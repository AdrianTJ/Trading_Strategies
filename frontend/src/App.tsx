import { BrowserRouter as Router, Routes, Route, Navigate, useParams, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayoutDashboard, TrendingUp, DollarSign, Waves, RefreshCw, BarChart3, CalendarDays } from 'lucide-react';
import axios from 'axios';
import { useState } from 'react';

import { useSimulationData, useBenchmarks, type DailyPerformance, type SimulationResult } from './hooks/useSimulationData';
import { StrategyChart } from './components/StrategyChart';
import { ReturnsMatrix } from './components/ReturnsMatrix';
import { StatsGrid } from './components/StatsGrid';
import { ComparisonTable } from './components/ComparisonTable';
import { useEffect } from 'react';

const queryClient = new QueryClient();

const ASSETS = [
  { id: 'sp500', name: 'S&P 500', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'gold', name: 'Gold', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'treasury_10y', name: 'US Bonds', icon: <Waves className="w-4 h-4" /> },
];

const STRATEGIES = [
  { id: 'lump-sum', name: 'Lump Sum' },
  { id: 'monthly-dca', name: 'Monthly DCA' },
  { id: 'weekly-dca', name: 'Weekly DCA' },
  { id: 'dip-buy', name: 'Dip Buy (-5%)' },
];

const Sidebar = () => {
  const { asset, strategy } = useParams();
  
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 h-screen flex flex-col text-slate-300">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-blue-500" />
          StrategyTracker
        </h1>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Assets</h2>
          <ul className="space-y-1">
            {ASSETS.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/dashboard/${a.id}/${strategy || 'lump-sum'}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    asset === a.id 
                      ? 'bg-blue-600/10 text-blue-400' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {a.icon}
                  {a.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Strategies</h2>
          <ul className="space-y-1">
            {STRATEGIES.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/dashboard/${asset || 'sp500'}/${s.id}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    strategy === s.id 
                      ? 'bg-blue-600/10 text-blue-400' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="text-xs text-slate-500 text-center font-medium">v1.0.0 — Phase 4</div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { asset = 'sp500', strategy = 'lump-sum' } = useParams();
  const { simulation, performance, isLoading, isError, refetch } = useSimulationData(strategy, asset);
  const { benchmarks, fetchBenchmarkPerformance } = useBenchmarks();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<number | null>(null);
  const [benchmarkPerformance, setBenchmarkPerformance] = useState<DailyPerformance[]>([]);
  const [benchmarkSimulation, setBenchmarkSimulation] = useState<SimulationResult | null>(null);

  useEffect(() => {
    if (selectedBenchmarkId) {
      const benchmark = benchmarks.find(b => b.id === selectedBenchmarkId);
      if (benchmark) {
        setBenchmarkSimulation(benchmark);
        fetchBenchmarkPerformance(selectedBenchmarkId).then(setBenchmarkPerformance);
      }
    } else {
      setBenchmarkSimulation(null);
      setBenchmarkPerformance([]);
    }
  }, [selectedBenchmarkId, benchmarks]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // In a real app, this would be a POST call to trigger sync & simulation
      // For now, let's assume we trigger the run_simulations script via a backend endpoint
      // Mocking the behavior
      await axios.post('http://localhost:8000/api/sync-and-run');
      await refetch();
    } catch (err) {
      console.error('Failed to sync data', err);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-slate-400 font-medium">Loading simulation data...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-400 font-medium">Error loading simulation data. Please try syncing again.</p>
          <button onClick={refetch} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-white capitalize flex items-center gap-2">
              {asset.replace('_', ' ')}
              <span className="text-slate-600 font-light mx-1">/</span>
              <span className="text-blue-400">{strategy.replace('-', ' ')}</span>
            </h2>
            <p className="text-slate-400 mt-1">
              {simulation 
                ? `Historical backtest from ${new Date(simulation.start_date).toLocaleDateString()} to ${new Date(simulation.end_date).toLocaleDateString()}`
                : 'No simulation data found for this combination.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Benchmark Overlay</label>
              <select 
                value={selectedBenchmarkId || ''} 
                onChange={(e) => setSelectedBenchmarkId(e.target.value ? Number(e.target.value) : null)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
              >
                <option value="">None</option>
                {benchmarks.map(b => (
                  <option key={b.id} value={b.id}>{b.strategy_name}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium transition-colors mt-5"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Data'}
            </button>
          </div>
        </header>
        
        {!simulation ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
            <div className="bg-slate-800 p-6 rounded-full mb-6">
              <CalendarDays className="w-12 h-12 text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Simulation Data</h3>
            <p className="text-slate-400 max-w-md mb-8">
              We don't have backtest results for this asset/strategy combination yet. 
              Click the sync button to fetch the latest data and run the simulation.
            </p>
            <button 
              onClick={handleSync}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold text-lg transition-transform active:scale-95"
            >
              Run Initial Sync
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700">
            <StatsGrid simulation={simulation} benchmark={benchmarkSimulation} />
            
            <div className="grid grid-cols-1 gap-8">
              <StrategyChart 
                data={performance} 
                benchmarkData={benchmarkPerformance} 
                benchmarkName={benchmarkSimulation?.strategy_name}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ComparisonTable 
                  strategy={simulation} 
                  benchmark={benchmarkSimulation} 
                />
                <ReturnsMatrix data={performance} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard/sp500/lump-sum" replace />} />
          <Route path="/dashboard/:asset/:strategy" element={<Dashboard />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
