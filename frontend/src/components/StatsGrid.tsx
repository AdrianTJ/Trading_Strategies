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
  <div className="glass-card p-6 rounded-2xl flex flex-col gap-4 relative group hover:bg-white/[0.08] hover:border-white/20 transition-all duration-500 hover:shadow-blue-500/5 hover:-translate-y-1 overflow-hidden">
    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-8 -mt-8 transition-transform duration-700 group-hover:scale-110" />
    <div className="flex items-start justify-between relative z-10">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{label}</p>
          {tooltip && (
            <div className="relative group/tooltip">
              <Info className="w-3 h-3 text-slate-600 cursor-help transition-colors group-hover/tooltip:text-slate-400" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 p-3 bg-slate-900 text-[11px] leading-relaxed text-slate-300 rounded-xl hidden group-hover/tooltip:block z-50 shadow-2xl border border-white/10 backdrop-blur-xl">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        <p className={`text-2xl font-black tracking-tight ${color}`}>{value}</p>
      </div>
      <div className={`bg-slate-950/50 p-2.5 rounded-xl border border-white/5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
        {icon}
      </div>
    </div>
    {benchmarkValue && (
      <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] relative z-10">
        <span className="text-slate-500 font-bold uppercase tracking-widest">Benchmark</span>
        <span className="text-slate-300 font-bold px-2 py-0.5 bg-white/5 rounded-md border border-white/5">{benchmarkValue}</span>
      </div>
    )}
  </div>
);

export const StatsGrid: React.FC<StatsGridProps> = ({ simulation, benchmark }) => {
  if (!simulation) return null;

  const stats = [
    {
      label: 'Nominal CAGR',
      value: `${(simulation.cagr * 100).toFixed(2)}%`,
      benchmarkValue: benchmark ? `${(benchmark.cagr * 100).toFixed(2)}%` : undefined,
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
      color: 'text-emerald-400 text-glow-emerald',
      tooltip: 'Compound Annual Growth Rate. The geometric mean return each year.',
    },
    {
      label: 'Real CAGR',
      value: simulation.real_cagr !== null ? `${(simulation.real_cagr * 100).toFixed(2)}%` : 'N/A',
      benchmarkValue: (benchmark && benchmark.real_cagr !== null) ? `${(benchmark.real_cagr! * 100).toFixed(2)}%` : undefined,
      icon: <Target className="w-5 h-5 text-purple-400" />,
      color: 'text-purple-400',
      tooltip: 'Inflation-adjusted CAGR. Shows the real purchasing power growth.',
    },
    {
      label: 'Sharpe Ratio',
      value: simulation.sharpe_ratio?.toFixed(2) || 'N/A',
      benchmarkValue: benchmark ? (benchmark.sharpe_ratio?.toFixed(2) || 'N/A') : undefined,
      icon: <Target className="w-5 h-5 text-blue-400" />,
      color: 'text-blue-400 text-glow-blue',
      tooltip: 'Risk-adjusted return. Higher is better. Measures excess return per unit of volatility.',
    },
    {
      label: 'Max Drawdown',
      value: `${(simulation.max_drawdown * 100).toFixed(2)}%`,
      benchmarkValue: benchmark ? `${(benchmark.max_drawdown * 100).toFixed(2)}%` : undefined,
      icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
      color: 'text-rose-500',
      tooltip: 'The maximum peak-to-trough decline during the investment period.',
    },
  ];

  // Helper to format currency
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-1000">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
         <div className="glass-card p-6 rounded-2xl flex justify-between items-center group transition-all duration-500 hover:bg-white/[0.08]">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600/10 p-3 rounded-xl border border-blue-500/20"><TrendingUp className="w-5 h-5 text-blue-400" /></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Capital Base</span>
                <span className="text-sm font-semibold text-slate-300">Initial + Injections</span>
              </div>
            </div>
            <span className="text-3xl font-black text-white tracking-tight">{formatCurrency(simulation.initial_cash)}</span>
         </div>
         <div className="glass-card p-6 rounded-2xl flex justify-between items-center group transition-all duration-500 hover:bg-white/[0.08]">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-600/10 p-3 rounded-xl border border-emerald-500/20"><TrendingUp className="w-5 h-5 text-emerald-400" /></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Performance</span>
                <span className="text-sm font-semibold text-slate-300">Total Return</span>
              </div>
            </div>
            <span className="text-3xl font-black text-emerald-400 text-glow-emerald tracking-tight">{(simulation.total_return * 100).toFixed(2)}%</span>
         </div>
      </div>
    </div>
  );
};
