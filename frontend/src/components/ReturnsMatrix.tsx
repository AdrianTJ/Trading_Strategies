import React from 'react';
import { type DailyPerformance } from '../hooks/useSimulationData';

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

    if (!matrix[year]) {
      matrix[year] = {};
      years.push(year);
    }

    // We take the last daily return of the month to approximate monthly return?
    // Actually, it's better to calculate monthly return: (last_val / first_val_of_month) - 1
    // But since we have daily_return, we could use that if we were careful.
    // Let's just track the first and last portfolio value of each month.
  });

  // Re-calculate monthly returns properly using daily returns
  const monthlyReturns: Record<number, Record<number, number>> = {};
  const yearsSet = new Set<number>();

  data.forEach((d) => {
    const date = new Date(d.date);
    const year = date.getFullYear();
    const month = date.getMonth();
    yearsSet.add(year);

    if (!monthlyReturns[year]) monthlyReturns[year] = {};
    if (monthlyReturns[year][month] === undefined) {
      monthlyReturns[year][month] = 1.0;
    }
    
    // Compound the daily return
    monthlyReturns[year][month] *= (1 + d.daily_return);
  });

  // Convert compounded values back to returns (subtract 1)
  Object.keys(monthlyReturns).forEach(y => {
    const year = parseInt(y);
    Object.keys(monthlyReturns[year]).forEach(m => {
        const month = parseInt(m);
        monthlyReturns[year][month] -= 1;
    });
  });

  const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
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
          let yearReturnCompounded = 1.0;
          const yearData = monthlyReturns[year];
          
          return (
            <div key={year} className="grid grid-cols-[100px_repeat(12,1fr)_100px] gap-1 mb-1">
              <div className="bg-slate-800/50 p-2 rounded text-slate-300 font-medium text-sm flex items-center justify-center">
                {year}
              </div>
              {Array.from({ length: 12 }).map((_, monthIdx) => {
                const returnValue = yearData[monthIdx] !== undefined 
                  ? yearData[monthIdx] 
                  : null;
                
                if (returnValue !== null) yearReturnCompounded *= (1 + returnValue);

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
                {((yearReturnCompounded - 1) * 100).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
