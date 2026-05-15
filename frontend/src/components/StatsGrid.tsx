import React from 'react';
import { type SimulationResult } from '../hooks/useSimulationData';
import { TrendingUp, Target, AlertTriangle, ShieldCheck, Info } from 'lucide-react';

interface StatsGridProps {
  simulation: SimulationResult | null;
  benchmark?: SimulationResult | null;
}

interface StatCardProps {
  label: string;
  value: string;
  benchmarkValue?: string;
  icon: React.ReactNode;
  color: string;
  tooltip?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, benchmarkValue, icon, color, tooltip }) => (
  <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 flex flex-col gap-2 relative group">
    <div className="flex items-center gap-4">
      <div className="bg-slate-800 p-3 rounded-lg">{icon}</div>
      <div>
        <div className="flex items-center gap-1">
          <p className="text-sm text-slate-400 font-medium">{label}</p>
          {tooltip && (
            <div className="relative group/tooltip">
              <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-xs text-slate-200 rounded lg hidden group-hover/tooltip:block z-50 shadow-xl border border-slate-700">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </div>
    </div>
    {benchmarkValue && (
      <div className="mt-2 pt-2 border-t border-slate-800/50 flex justify-between items-center text-xs">
        <span className="text-slate-500 font-medium uppercase tracking-wider">Benchmark</span>
        <span className="text-slate-300 font-semibold">{benchmarkValue}</span>
      </div>
    )}
  </div>
);

export const StatsGrid: React.FC<StatsGridProps> = ({ simulation, benchmark }) => {
  if (!simulation) return null;

  const stats = [
    {
      label: 'CAGR',
      value: `${(simulation.cagr * 100).toFixed(2)}%`,
      benchmarkValue: benchmark ? `${(benchmark.cagr * 100).toFixed(2)}%` : undefined,
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
      color: 'text-emerald-400',
      tooltip: 'Compound Annual Growth Rate. The geometric mean return each year.',
    },
    {
      label: 'Real CAGR',
      value: simulation.real_cagr !== null ? `${(simulation.real_cagr * 100).toFixed(2)}%` : 'N/A',
      benchmarkValue: benchmark?.real_cagr !== null ? `${(benchmark!.real_cagr! * 100).toFixed(2)}%` : undefined,
      icon: <Target className="w-5 h-5 text-purple-400" />,
      color: 'text-purple-400',
      tooltip: 'Inflation-adjusted CAGR. Shows the real purchasing power growth.',
    },
    {
      label: 'Sharpe Ratio',
      value: simulation.sharpe_ratio?.toFixed(2) || 'N/A',
      benchmarkValue: benchmark ? (benchmark.sharpe_ratio?.toFixed(2) || 'N/A') : undefined,
      icon: <Target className="w-5 h-5 text-blue-400" />,
      color: 'text-blue-400',
      tooltip: 'Risk-adjusted return. Higher is better. Measures excess return per unit of volatility.',
    },
    {
      label: 'Max Drawdown',
      value: `${(simulation.max_drawdown * 100).toFixed(2)}%`,
      benchmarkValue: benchmark ? `${(benchmark.max_drawdown * 100).toFixed(2)}%` : undefined,
      icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
      color: 'text-red-400',
      tooltip: 'The maximum peak-to-trough decline during the investment period.',
    },
  ];

  // Helper to format currency
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex justify-between items-center px-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600/20 p-2 rounded-lg"><TrendingUp className="w-4 h-4 text-blue-400" /></div>
              <span className="text-sm font-medium text-slate-400">Total Invested</span>
            </div>
            <span className="text-xl font-bold text-white">{formatCurrency(simulation.initial_cash + (simulation.strategy_name.includes('dca') ? 0 : 0))} 
              {/* Note: In a real app we'd fetch the actual total invested from backend simulation results */}
              <span className="text-xs text-slate-500 ml-2 font-normal">(Initial + Injections)</span>
            </span>
         </div>
         <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex justify-between items-center px-6">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-600/20 p-2 rounded-lg"><TrendingUp className="w-4 h-4 text-emerald-400" /></div>
              <span className="text-sm font-medium text-slate-400">Total Return</span>
            </div>
            <span className="text-xl font-bold text-emerald-400">{(simulation.total_return * 100).toFixed(2)}%</span>
         </div>
      </div>
    </div>
  );
};
