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
    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 overflow-hidden">
      <h3 className="text-lg font-semibold text-white mb-6">Performance Comparison</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="py-3 px-4 text-slate-500 font-medium text-sm">Metric</th>
              <th className="py-3 px-4 text-slate-500 font-medium text-sm">Active Strategy</th>
              <th className="py-3 px-4 text-slate-500 font-medium text-sm">Benchmark</th>
              <th className="py-3 px-4 text-slate-500 font-medium text-sm">Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {metrics.map((m) => (
              <tr key={m.name} className="hover:bg-white/5 transition-colors">
                <td className="py-4 px-4 flex items-center gap-3">
                  {m.icon}
                  <span className="text-slate-300 font-medium">{m.name}</span>
                </td>
                <td className="py-4 px-4 text-slate-100 font-bold">{m.strategyValue}</td>
                <td className="py-4 px-4 text-slate-400">{m.benchmarkValue}</td>
                <td className="py-4 px-4 font-medium">
                  {compare(m.strategyValue, m.benchmarkValue, m.higherIsBetter)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
