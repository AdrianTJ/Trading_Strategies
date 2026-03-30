import { BrowserRouter as Router, Routes, Route, Navigate, useParams, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayoutDashboard, TrendingUp, DollarSign, Waves } from 'lucide-react';

const queryClient = new QueryClient();

const ASSETS = [
  { id: 'sp500', name: 'S&P 500', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'gold', name: 'Gold', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'treasury_10y', name: 'US Bonds', icon: <Waves className="w-4 h-4" /> },
];

const Sidebar = () => {
  const { asset } = useParams();
  
  return (
    <div className="w-64 bg-slate-50 border-r border-slate-200 h-screen flex flex-col">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-blue-600" />
          StrategyTracker
        </h1>
      </div>
      <nav className="flex-1 p-4">
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Assets</h2>
          <ul className="space-y-1">
            {ASSETS.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/dashboard/${a.id}/lump-sum`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    asset === a.id 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {a.icon}
                  {a.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <div className="p-4 border-t border-slate-200">
        <div className="text-xs text-slate-400 text-center">v1.0.0</div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { asset, strategy } = useParams();
  
  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 capitalize">
            {asset?.replace('_', ' ')} Performance
          </h2>
          <p className="text-slate-500">Analyze strategy: {strategy?.replace('-', ' ')}</p>
        </header>
        
        <div className="grid grid-cols-1 gap-8">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 flex items-center justify-center min-h-[400px]">
            <p className="text-slate-400 italic">Charts and analytics visualization coming in Wave 3...</p>
          </div>
        </div>
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
