import React from 'react';
import { DailyPerformance } from '../hooks/useSimulationData';

interface ReturnsMatrixProps {
  data: DailyPerformance[];
}

export const ReturnsMatrix: React.FC<ReturnsMatrixProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  // Group data by year and month
  const matrix: Record<number, Record<number, number>> = {};
  const years: number[] = [];

  data.forEach((d) => {
    const date = new Date(d.date);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed

    if (!matrix[year]) {
      matrix[year] = {};
      years.push(year);
    }

    // We take the last daily return of the month to approximate monthly return?
    // Actually, it's better to calculate monthly return: (last_val / first_val_of_month) - 1
    // But since we have daily_return, we could use that if we were careful.
    // Let's just track the first and last portfolio value of each month.
  });

  // Re-calculate monthly returns properly
  const monthlyValues: Record<number, Record<number, { first: number; last: number }>> = {};
  data.forEach((d) => {
    const date = new Date(d.date);
    const year = date.getFullYear();
    const month = date.getMonth();

    if (!monthlyValues[year]) monthlyValues[year] = {};
    if (!monthlyValues[year][month]) {
      monthlyValues[year][month] = { first: d.portfolio_value, last: d.portfolio_value };
    }
    monthlyValues[year][month].last = d.portfolio_value;
  });

  const sortedYears = [...years].sort((a, b) => b - a);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const getBackgroundColor = (value: number) => {
    if (value > 0) {
      const opacity = Math.min(value * 5, 0.8); // 10% return -> 0.5 opacity
      return `rgba(34, 197, 94, ${opacity})`;
    } else if (value < 0) {
      const opacity = Math.min(Math.abs(value) * 5, 0.8);
      return `rgba(239, 68, 68, ${opacity})`;
    }
    return 'transparent';
  };

  return (
    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 overflow-x-auto">
      <h3 className="text-lg font-semibold text-slate-100 mb-6">Monthly Returns (%)</h3>
      <div className="min-w-[800px]">
        <div className="grid grid-cols-[100px_repeat(12,1fr)_100px] gap-1 mb-2">
          <div className="text-slate-500 font-medium text-sm">Year</div>
          {months.map((m) => (
            <div key={m} className="text-slate-500 font-medium text-sm text-center">
              {m}
            </div>
          ))}
          <div className="text-slate-500 font-medium text-sm text-center">Total</div>
        </div>

        {sortedYears.map((year) => {
          let yearReturn = 1;
          const yearData = monthlyValues[year];
          
          return (
            <div key={year} className="grid grid-cols-[100px_repeat(12,1fr)_100px] gap-1 mb-1">
              <div className="bg-slate-800/50 p-2 rounded text-slate-300 font-medium text-sm flex items-center justify-center">
                {year}
              </div>
              {Array.from({ length: 12 }).map((_, monthIdx) => {
                const monthData = yearData[monthIdx];
                const returnValue = monthData 
                  ? (monthData.last / monthData.first) - 1 
                  : null;
                
                if (returnValue !== null) yearReturn *= (1 + returnValue);

                return (
                  <div
                    key={monthIdx}
                    className="p-2 rounded text-xs flex items-center justify-center font-medium"
                    style={{
                      backgroundColor: returnValue !== null ? getBackgroundColor(returnValue) : 'transparent',
                      color: returnValue !== null ? '#fff' : 'transparent',
                    }}
                  >
                    {returnValue !== null ? (returnValue * 100).toFixed(1) : '-'}
                  </div>
                );
              })}
              <div className="bg-slate-800/50 p-2 rounded text-slate-100 font-bold text-sm flex items-center justify-center">
                {((yearReturn - 1) * 100).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
