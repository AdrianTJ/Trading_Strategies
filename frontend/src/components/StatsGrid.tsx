import React from 'react';
import { SimulationResult } from '../hooks/useSimulationData';
import { TrendingUp, Target, AlertTriangle, Clock } from 'lucide-react';

interface StatsGridProps {
  simulation: SimulationResult | null;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ simulation }) => {
  if (!simulation) return null;

  const stats = [
    {
      label: 'CAGR',
      value: `${(simulation.cagr * 100).toFixed(2)}%`,
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
      color: 'text-emerald-400',
    },
    {
      label: 'Sharpe Ratio',
      value: simulation.sharpe_ratio?.toFixed(2) || 'N/A',
      icon: <Target className="w-5 h-5 text-blue-400" />,
      color: 'text-blue-400',
    },
    {
      label: 'Max Drawdown',
      value: `${(simulation.max_drawdown * 100).toFixed(2)}%`,
      icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
      color: 'text-red-400',
    },
    {
      label: 'Total Return',
      value: `${(simulation.total_return * 100).toFixed(2)}%`,
      icon: <Clock className="w-5 h-5 text-purple-400" />,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 flex items-center gap-4"
        >
          <div className="bg-slate-800 p-3 rounded-lg">{stat.icon}</div>
          <div>
            <p className="text-sm text-slate-400 font-medium">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
