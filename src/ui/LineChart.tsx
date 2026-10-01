import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { toUTC, type ISODate } from '../engine/dates';
import { formatDay } from './format';
import { useWidth } from './useWidth';

export interface ChartSeries {
  key: string;
  label: string;
  /** CSS color, normally a var(--series-n) token. */
  color: string;
  values: ArrayLike<number>;
}

interface Props {
  dates: readonly ISODate[];
  series: readonly ChartSeries[];
  /** A neutral reference line (e.g. money put in), drawn under the series. */
  reference?: { label: string; values: ArrayLike<number> };
  formatValue: (v: number) => string;
  formatAxis: (v: number) => string;
  formatDate?: (d: ISODate) => string;
  height?: number;
  ariaLabel: string;
}

const M = { top: 12, right: 16, bottom: 28, left: 56 };

function niceStep(range: number, count: number) {
  const raw = range / Math.max(1, count);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
}

function yTicks(min: number, max: number, count: number) {
  if (max === min) max = min + 1;
  const step = niceStep(max - min, count);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.abs(v) < step / 1e6 ? 0 : v);
  return ticks;
}

function yearTicks(startMs: number, endMs: number, maxCount: number) {
  // A year label belongs at Jan 1; let a window starting in the first week of January
  // keep its first year (markets are closed on Jan 1, so data starts a day or two later).
  const firstYear = new Date(startMs - 7 * 86_400_000).getUTCFullYear() + 1;
  const lastYear = new Date(endMs).getUTCFullYear();
  const span = Math.max(1, lastYear - firstYear + 1);
  const step = [1, 2, 5, 10, 20].find((s) => span / s <= maxCount) ?? 25;
  const out: { ms: number; label: string }[] = [];
  for (let y = Math.ceil(firstYear / step) * step; y <= lastYear; y += step) {
    out.push({ ms: Math.max(startMs, Date.UTC(y, 0, 1)), label: String(y) });
  }
  return out.filter((t) => t.ms <= endMs);
}

export function LineChart({ dates, series, reference, formatValue, formatAxis, formatDate = formatDay, height = 320, ariaLabel }: Props) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const n = dates.length;
  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = height - M.top - M.bottom;

  const geom = useMemo(() => {
    if (n === 0 || innerW <= 0) return null;
    // About one point per pixel is all the screen can show; always keep the last day.
    const stride = Math.max(1, Math.ceil(n / innerW));
    const idx: number[] = [];
    for (let i = 0; i < n; i += stride) idx.push(i);
    if (idx.at(-1) !== n - 1) idx.push(n - 1);

    const ms = idx.map((i) => toUTC(dates[i]!));
    const all = [...series.map((s) => s.values), ...(reference ? [reference.values] : [])];
    let lo = Infinity;
    let hi = -Infinity;
    for (const vals of all) for (const i of idx) {
      const v = vals[i]!;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    lo = Math.min(0, lo);
    const ticks = yTicks(lo, hi, Math.max(3, Math.floor(innerH / 56)));
    const yMin = ticks[0]!;
    const yMax = ticks.at(-1)!;
    const t0 = ms[0]!;
    const t1 = ms.at(-1)!;
    const x = (t: number) => (t1 === t0 ? innerW / 2 : ((t - t0) / (t1 - t0)) * innerW);
    const y = (v: number) => innerH - ((v - yMin) / (yMax - yMin)) * innerH;
    const path = (vals: ArrayLike<number>) => idx.map((i, k) => `${k ? 'L' : 'M'}${x(ms[k]!).toFixed(1)},${y(vals[i]!).toFixed(1)}`).join('');
    return {
      idx,
      ms,
      x,
      y,
      ticks,
      years: yearTicks(t0, t1, Math.max(2, Math.floor(innerW / 64))),
      paths: series.map((s) => path(s.values)),
      refPath: reference ? path(reference.values) : null,
    };
  }, [dates, series, reference, n, innerW, innerH]);

  const nearest = (px: number) => {
    if (!geom) return null;
    // Binary search the sampled x positions.
    let lo = 0;
    let hi = geom.idx.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (geom.x(geom.ms[mid]!) < px) lo = mid;
      else hi = mid;
    }
    return px - geom.x(geom.ms[lo]!) < geom.x(geom.ms[hi]!) - px ? lo : hi;
  };

  const onPointer = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHover(nearest(e.clientX - rect.left));
  };

  const onKey = (e: KeyboardEvent) => {
    if (!geom) return;
    const last = geom.idx.length - 1;
    const step = e.shiftKey ? Math.ceil(last / 20) : 1;
    const cur = hover ?? last;
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = Math.max(0, cur - step);
    else if (e.key === 'ArrowRight') next = Math.min(last, cur + step);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else if (e.key === 'Escape') return setHover(null);
    if (next != null) {
      e.preventDefault();
      setHover(next);
    }
  };

  const hi = hover != null && geom ? geom.idx[hover]! : null;
  const hx = hover != null && geom ? geom.x(geom.ms[hover]!) : 0;
  const tooltipLeft = hx + M.left > width / 2;

  return (
    <div className="chart" ref={wrapRef}>
      <div className="legend" aria-hidden="true">
        {series.map((s) => (
          <span key={s.key} className="legend-item">
            <span className="line-key" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        {reference && (
          <span className="legend-item">
            <span className="line-key line-key--ref" />
            {reference.label}
          </span>
        )}
      </div>
      <div className="chart-plot" style={{ height }}>
        {geom && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={ariaLabel}
            tabIndex={0}
            onKeyDown={onKey}
            onBlur={() => setHover(null)}
          >
            <g transform={`translate(${M.left},${M.top})`}>
              {geom.ticks.map((t) => (
                <g key={t} transform={`translate(0,${geom.y(t)})`}>
                  <line className={t === 0 ? 'axis-base' : 'grid'} x1={0} x2={innerW} />
                  <text className="tick" x={-8} dy="0.32em" textAnchor="end">
                    {formatAxis(t)}
                  </text>
                </g>
              ))}
              {geom.years.map((t) => (
                <text key={t.ms} className="tick" x={geom.x(t.ms)} y={innerH + 20} textAnchor="middle">
                  {t.label}
                </text>
              ))}
              {geom.refPath && <path className="ref-line" d={geom.refPath} />}
              {geom.paths.map((d, k) => (
                <path key={series[k]!.key} className="series-line" d={d} style={{ stroke: series[k]!.color }} />
              ))}
              {series.map((s) => {
                const last = geom.idx.at(-1)!;
                return (
                  <circle
                    key={s.key}
                    className="end-dot"
                    cx={geom.x(geom.ms.at(-1)!)}
                    cy={geom.y(s.values[last]!)}
                    r={4}
                    style={{ fill: s.color }}
                  />
                );
              })}
              {hi != null && (
                <g>
                  <line className="crosshair" x1={hx} x2={hx} y1={0} y2={innerH} />
                  {series.map((s) => (
                    <circle key={s.key} className="end-dot" cx={hx} cy={geom.y(s.values[hi]!)} r={4} style={{ fill: s.color }} />
                  ))}
                </g>
              )}
              <rect
                className="hit"
                width={innerW}
                height={innerH}
                onPointerMove={onPointer}
                onPointerDown={onPointer}
                onPointerLeave={() => setHover(null)}
              />
            </g>
          </svg>
        )}
        {hi != null && geom && (
          <div
            className="tooltip"
            role="status"
            style={{
              top: M.top,
              ...(tooltipLeft ? { right: width - (hx + M.left) + 12 } : { left: hx + M.left + 12 }),
            }}
          >
            <div className="tooltip-date">{formatDate(dates[hi]!)}</div>
            {series.map((s) => (
              <div key={s.key} className="tooltip-row">
                <span className="line-key" style={{ background: s.color }} />
                <strong>{formatValue(s.values[hi]!)}</strong>
                <span className="tooltip-label">{s.label}</span>
              </div>
            ))}
            {reference && (
              <div className="tooltip-row">
                <span className="line-key line-key--ref" />
                <strong>{formatValue(reference.values[hi]!)}</strong>
                <span className="tooltip-label">{reference.label}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
