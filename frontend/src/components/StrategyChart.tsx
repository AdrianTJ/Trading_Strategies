import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ColorType, LineStyle, CrosshairMode, ISeriesApi } from 'lightweight-charts';
import { DailyPerformance } from '../hooks/useSimulationData';

interface StrategyChartProps {
  data: DailyPerformance[];
  benchmarkData?: DailyPerformance[];
  benchmarkName?: string;
}

export const StrategyChart: React.FC<StrategyChartProps> = ({ data, benchmarkData, benchmarkName }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const drawdownContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [hoverData, setHoverData] = useState<{
    date: string;
    strategyValue: number | null;
    benchmarkValue: number | null;
  } | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !drawdownContainerRef.current || data.length === 0) return;

    const commonOptions = {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(75, 85, 99, 0.2)' },
        horzLines: { color: 'rgba(75, 85, 99, 0.2)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        borderColor: 'rgba(75, 85, 99, 0.2)',
      },
    };

    // Equity Curve Chart
    const equityChart = createChart(chartContainerRef.current, {
      ...commonOptions,
      height: 400,
    });
    chartRef.current = equityChart;

    const areaSeries = equityChart.addAreaSeries({
      lineColor: '#3b82f6',
      topColor: 'rgba(59, 130, 246, 0.5)',
      bottomColor: 'rgba(59, 130, 246, 0.1)',
      lineWidth: 2,
    });

    const equityData = data.map((d) => ({
      time: d.date.split('T')[0],
      value: d.portfolio_value,
    }));

    areaSeries.setData(equityData);

    // Benchmark Series
    let benchmarkSeries: any = null;
    if (benchmarkData && benchmarkData.length > 0) {
      benchmarkSeries = equityChart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        title: benchmarkName || 'Benchmark',
      });

      const initialStrategyValue = data[0].portfolio_value;
      const initialBenchmarkValue = benchmarkData[0].portfolio_value;
      const normalizationFactor = initialStrategyValue / initialBenchmarkValue;

      const benchmarkPoints = benchmarkData.map((d) => ({
        time: d.date.split('T')[0],
        value: d.portfolio_value * normalizationFactor,
      }));

      benchmarkSeries.setData(benchmarkPoints);
    }

    equityChart.timeScale().fitContent();

    // Drawdown Chart
    const drawdownChart = createChart(drawdownContainerRef.current, {
      ...commonOptions,
      height: 150,
    });
    drawdownChartRef.current = drawdownChart;

    const drawdownSeries = drawdownChart.addAreaSeries({
      lineColor: '#ef4444',
      topColor: 'rgba(239, 68, 68, 0.5)',
      bottomColor: 'rgba(239, 68, 68, 0.1)',
      lineWidth: 2,
    });

    // Calculate drawdown
    let maxVal = -Infinity;
    const drawdownData = data.map((d) => {
      if (d.portfolio_value > maxVal) maxVal = d.portfolio_value;
      const dd = (d.portfolio_value - maxVal) / maxVal;
      return {
        time: d.date.split('T')[0],
        value: dd * 100, // as percentage
      };
    });

    drawdownSeries.setData(drawdownData);
    drawdownChart.timeScale().fitContent();

    // Synchronize crosshair and time scale
    equityChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      drawdownChart.timeScale().setVisibleTimeRange(range);
    });
    drawdownChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      equityChart.timeScale().setVisibleTimeRange(range);
    });

    // Crosshair sync
    equityChart.subscribeCrosshairMove((param) => {
        if (param.point === undefined || !param.time) {
            drawdownChart.clearCrosshairPosition();
            setHoverData(null);
        } else {
            drawdownChart.setCrosshairPosition(param.point, param.time, drawdownSeries);
            
            const strategyValue = param.seriesData.get(areaSeries);
            const benchValue = benchmarkSeries ? param.seriesData.get(benchmarkSeries) : null;
            
            setHoverData({
              date: param.time as string,
              strategyValue: strategyValue ? (strategyValue as any).value : null,
              benchmarkValue: benchValue ? (benchValue as any).value : null,
            });
        }
    });
    drawdownChart.subscribeCrosshairMove((param) => {
        if (param.point === undefined || !param.time) {
            equityChart.clearCrosshairPosition();
        } else {
            equityChart.setCrosshairPosition(param.point, param.time, areaSeries);
        }
    });

    const handleResize = () => {
      if (chartContainerRef.current) {
        equityChart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
      if (drawdownContainerRef.current) {
        drawdownChart.applyOptions({ width: drawdownContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      equityChart.remove();
      drawdownChart.remove();
    };
  }, [data, benchmarkData, benchmarkName]);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 relative">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-sm font-medium text-slate-400">Equity Curve (Indexed)</h3>
          {hoverData && (
            <div className="text-right">
              <div className="text-xs text-slate-500 font-mono mb-1">{hoverData.date}</div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-semibold text-white">
                    Strategy: {hoverData.strategyValue?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                {benchmarkName && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-semibold text-white">
                      {benchmarkName}: {hoverData.benchmarkValue?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          {!hoverData && (
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-slate-400">Strategy</span>
              </div>
              {benchmarkName && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-medium text-slate-400">{benchmarkName}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div ref={chartContainerRef} className="w-full" />
      </div>
      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <h3 className="text-sm font-medium text-slate-400 mb-2">Drawdown (%)</h3>
        <div ref={drawdownContainerRef} className="w-full" />
      </div>
    </div>
  );
};
