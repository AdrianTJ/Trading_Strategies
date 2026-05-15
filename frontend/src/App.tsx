import { Component, type ReactNode, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayoutDashboard, TrendingUp, DollarSign, Waves, RefreshCw, BarChart3, CalendarDays, AlertCircle } from 'lucide-react';
import axios from 'axios';

import { useSimulationData, useBenchmarks, type DailyPerformance, type SimulationResult } from './hooks/useSimulationData';
import { StrategyChart } from './components/StrategyChart';
import { ReturnsMatrix } from './components/ReturnsMatrix';
import { StatsGrid } from './components/StatsGrid';
import { ComparisonTable } from './components/ComparisonTable';

import { ASSETS, STRATEGIES } from './config';

class SimpleErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-slate-950 flex items-center justify-center p-8 text-center">
          <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl max-w-md">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-slate-400 mb-6 font-mono text-sm break-words text-left bg-black/30 p-4 rounded border border-white/5">
              {this.state.error?.toString()}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-bold"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

const Sidebar = () => {
  const { asset, strategy } = useParams();
  
  return (
    <div className="w-72 glass-sidebar h-screen flex flex-col text-slate-300 z-20">
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          Strategy<span className="text-blue-500">Tracker</span>
        </h1>
      </div>
      <nav className="flex-1 px-4 py-2 overflow-y-auto space-y-8">
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 px-4">Assets</h2>
          <ul className="space-y-2">
            {ASSETS.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/dashboard/${a.id}/${strategy || 'lump-sum'}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    asset === a.id 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 translate-x-1' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <span className={`${asset === a.id ? 'text-white' : 'text-slate-500'}`}>{a.icon}</span>
                  {a.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 px-4">Strategies</h2>
          <ul className="space-y-2">
            {STRATEGIES.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/dashboard/${asset || 'sp500'}/${s.id}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    strategy === s.id 
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 translate-x-1' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <BarChart3 className={`w-4 h-4 ${strategy === s.id ? 'text-blue-400' : 'text-slate-500'}`} />
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <div className="p-6 border-t border-white/5">
        <div className="text-[10px] text-slate-600 text-center font-bold uppercase tracking-widest">v1.1.0 — High Fidelity</div>
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
        <div className="flex flex-col items-center gap-4 text-center max-w-md p-8">
          <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
          <h2 className="text-xl font-bold text-white mb-2">Error loading simulation data</h2>
          <p className="text-slate-400 mb-6">
            We couldn't fetch the simulation results. Make sure the backend is running and you have synced the data.
          </p>
          <button onClick={() => refetch()} className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold transition-transform active:scale-95">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto w-full relative">
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto">
          <header className="mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="animate-in fade-in slide-in-from-left duration-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest rounded border border-blue-500/20">Live Analysis</span>
                {simulation && simulation.total_return > 0 && (
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded border border-emerald-500/20">Outperforming Cash</span>
                )}
              </div>
              <h2 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <span className="capitalize">{asset.replace('_', ' ')}</span>
                <span className="text-slate-700 font-light">/</span>
                <span className="text-blue-500">{strategy.replace('-', ' ')}</span>
              </h2>
              <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                {simulation 
                  ? `${new Date(simulation.start_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })} — ${new Date(simulation.end_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`
                  : 'No simulation data found'}
              </p>
            </div>
            
            <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right duration-700">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Benchmark Overlay</label>
                <select 
                  value={selectedBenchmarkId || ''} 
                  onChange={(e) => setSelectedBenchmarkId(e.target.value ? Number(e.target.value) : null)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[200px] backdrop-blur-md transition-all hover:bg-white/10 cursor-pointer"
                >
                  <option value="" className="bg-slate-900">None</option>
                  {benchmarks.map(b => (
                    <option key={b.id} value={b.id} className="bg-slate-900">{b.strategy_name}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={handleSync}
                disabled={isSyncing}
                className="group relative flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 mt-5"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                {isSyncing ? 'Syncing...' : 'Sync Data'}
              </button>
            </div>
          </header>
          
          {!simulation ? (
            <div className="glass-card rounded-3xl p-20 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-700">
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
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <SimpleErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard/sp500/lump-sum" replace />} />
            <Route path="/dashboard/:asset/:strategy" element={<Dashboard />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    </SimpleErrorBoundary>
  );
}

export default App;
