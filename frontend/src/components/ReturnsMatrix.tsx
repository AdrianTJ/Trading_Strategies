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
      const opacity = Math.min(value * 10, 0.9); // More vibrant
      return `rgba(16, 185, 129, ${opacity})`;
    } else if (value < 0) {
      const opacity = Math.min(Math.abs(value) * 10, 0.9);
      return `rgba(244, 63, 94, ${opacity})`;
    }
    return 'rgba(255, 255, 255, 0.03)';
  };

  return (
    <div className="glass-card p-8 rounded-3xl overflow-x-auto animate-in fade-in slide-in-from-right duration-1000 delay-150">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-black text-white tracking-tight">Monthly Performance</h3>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Periodic Returns Heatmap (%)</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-emerald-500/80" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gains</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-rose-500/80" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Losses</span>
          </div>
        </div>
      </div>

      <div className="min-w-[800px]">
        <div className="grid grid-cols-[80px_repeat(12,1fr)_80px] gap-2 mb-4">
          <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest pl-2">Year</div>
          {months.map((m) => (
            <div key={m} className="text-[10px] text-slate-600 font-black uppercase tracking-widest text-center">
              {m}
            </div>
          ))}
          <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest text-center">Total</div>
        </div>

        {sortedYears.map((year) => {
          let yearReturnCompounded = 1.0;
          const yearData = monthlyReturns[year];
          
          return (
            <div key={year} className="grid grid-cols-[80px_repeat(12,1fr)_80px] gap-2 mb-2 group">
              <div className="bg-white/5 p-2 rounded-lg text-slate-400 font-black text-xs flex items-center justify-center group-hover:bg-white/10 transition-colors border border-white/5">
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
                    className="p-2.5 rounded-lg text-[11px] flex items-center justify-center font-black transition-all duration-300 hover:scale-110 hover:z-10 cursor-default shadow-sm hover:shadow-lg"
                    style={{
                      backgroundColor: getBackgroundColor(returnValue || 0),
                      color: returnValue !== null ? '#fff' : 'rgba(255,255,255,0.05)',
                      border: returnValue !== null ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent'
                    }}
                  >
                    {returnValue !== null ? (returnValue * 100).toFixed(1) : ''}
                  </div>
                );
              })}
              <div className="bg-white/5 p-2 rounded-lg text-white font-black text-xs flex items-center justify-center border border-white/10 group-hover:bg-blue-600/20 group-hover:border-blue-500/30 transition-all">
                {((yearReturnCompounded - 1) * 100).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
