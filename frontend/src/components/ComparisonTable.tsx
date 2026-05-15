import React from 'react';
import { type SimulationResult } from '../hooks/useSimulationData';
import { TrendingUp, Target, ShieldCheck, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ComparisonTableProps {
  strategy: SimulationResult;
  benchmark?: SimulationResult | null;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ strategy, benchmark }) => {
  const metrics = [
    {
      name: 'Total Return',
      strategyValue: (strategy.total_return * 100).toFixed(2) + '%',
      benchmarkValue: benchmark ? (benchmark.total_return * 100).toFixed(2) + '%' : 'N/A',
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
      higherIsBetter: true,
    },
    {
      name: 'CAGR',
      strategyValue: (strategy.cagr * 100).toFixed(2) + '%',
      benchmarkValue: benchmark ? (benchmark.cagr * 100).toFixed(2) + '%' : 'N/A',
      icon: <TrendingUp className="w-4 h-4 text-blue-400" />,
      higherIsBetter: true,
    },
    {
      name: 'Real CAGR',
      strategyValue: strategy.real_cagr !== null ? (strategy.real_cagr * 100).toFixed(2) + '%' : 'N/A',
      benchmarkValue: (benchmark && benchmark.real_cagr !== null) ? (benchmark.real_cagr! * 100).toFixed(2) + '%' : 'N/A',
      icon: <Target className="w-4 h-4 text-purple-400" />,
      higherIsBetter: true,
    },
    {
      name: 'Sharpe Ratio',
      strategyValue: strategy.sharpe_ratio?.toFixed(2) || 'N/A',
      benchmarkValue: benchmark ? (benchmark.sharpe_ratio?.toFixed(2) || 'N/A') : 'N/A',
      icon: <Target className="w-4 h-4 text-purple-400" />,
      higherIsBetter: true,
    },
    {
      name: 'Sortino Ratio',
      strategyValue: strategy.sortino_ratio?.toFixed(2) || 'N/A',
      benchmarkValue: benchmark ? (benchmark.sortino_ratio?.toFixed(2) || 'N/A') : 'N/A',
      icon: <ShieldCheck className="w-4 h-4 text-indigo-400" />,
      higherIsBetter: true,
    },
    {
      name: 'Max Drawdown',
      strategyValue: (strategy.max_drawdown * 100).toFixed(2) + '%',
      benchmarkValue: benchmark ? (benchmark.max_drawdown * 100).toFixed(2) + '%' : 'N/A',
      icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
      higherIsBetter: false,
    },
  ];

  const compare = (s: string, b: string, higherIsBetter: boolean) => {
    if (b === 'N/A') return null;
    const sVal = parseFloat(s);
    const bVal = parseFloat(b);
    if (isNaN(sVal) || isNaN(bVal)) return null;

    const diff = sVal - bVal;
    const isPositive = higherIsBetter ? diff > 0 : diff < 0;

    return (
      <span className={`flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {diff > 0 ? '+' : ''}{diff.toFixed(2)}%
        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      </span>
    );
  };

  return (
    <div className="glass-card p-8 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-left duration-1000 delay-150">
      <div className="mb-8">
        <h3 className="text-xl font-black text-white tracking-tight">Performance Comparison</h3>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Relative to benchmark (%)</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5">
              <th className="py-4 px-4 text-[10px] text-slate-600 font-black uppercase tracking-widest">Metric</th>
              <th className="py-4 px-4 text-[10px] text-slate-600 font-black uppercase tracking-widest">Active</th>
              <th className="py-4 px-4 text-[10px] text-slate-600 font-black uppercase tracking-widest">Benchmark</th>
              <th className="py-4 px-4 text-[10px] text-slate-600 font-black uppercase tracking-widest">Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {metrics.map((m) => (
              <tr key={m.name} className="group hover:bg-white/[0.03] transition-colors">
                <td className="py-5 px-4 flex items-center gap-4">
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-white/5 group-hover:scale-110 transition-transform">
                    {m.icon}
                  </div>
                  <span className="text-slate-400 font-bold text-sm tracking-tight">{m.name}</span>
                </td>
                <td className="py-5 px-4 text-white font-black text-sm">{m.strategyValue}</td>
                <td className="py-5 px-4 text-slate-500 font-bold text-sm">{m.benchmarkValue}</td>
                <td className="py-5 px-4">
                  <div className="flex items-center">
                    {compare(m.strategyValue, m.benchmarkValue, m.higherIsBetter)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
