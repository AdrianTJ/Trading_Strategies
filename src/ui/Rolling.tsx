import { useEffect, useMemo, useRef, useState } from 'react';
import type { Market } from '../engine/market';
import { maxHorizonYears, type RollingResult } from '../engine/rolling';
import type { RollingRequest, RollingResponse } from '../engine/rolling.worker';
import type { Plan } from '../engine/simulate';
import { formatMonth, pct } from './format';
import { LineChart, type ChartSeries } from './LineChart';
import type { ScenarioResult } from './Results';

const HORIZONS = [3, 5, 10, 20, 30] as const;

interface Props {
  market: Market;
  dataUrl: string;
  plan: Plan;
  results: readonly ScenarioResult[];
}

/** Compute in a worker; keep showing the last result (dimmed) while a new one runs. */
function useRolling(dataUrl: string, plan: Plan, results: readonly ScenarioResult[], horizonYears: number) {
  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);
  const [state, setState] = useState<{ result: RollingResult | null; pending: boolean; error: string | null }>({
    result: null,
    pending: true,
    error: null,
  });

  useEffect(() => {
    const w = new Worker(new URL('../engine/rolling.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<RollingResponse>) => {
      if (e.data.id !== latest.current) return; // a newer request superseded this one
      if ('error' in e.data) setState((s) => ({ ...s, pending: false, error: (e.data as { error: string }).error }));
      else setState({ result: e.data.result, pending: false, error: null });
    };
    worker.current = w;
    return () => w.terminate();
  }, []);

  // Strip the UI-only id; everything else is the strategy.
  const strategies = results.map(({ scenario: { id: _id, ...strategy } }) => strategy);
  const key = JSON.stringify([plan.amount, plan.frequency, plan.funding, plan.initial, plan.raise ?? 0, strategies, horizonYears]);

  useEffect(() => {
    setState((s) => ({ ...s, pending: true }));
    // Debounce: typing an amount shouldn't queue a run per keystroke.
    const t = setTimeout(() => {
      const id = ++latest.current;
      const msg: RollingRequest = { id, dataUrl, plan, strategies, horizonYears };
      worker.current?.postMessage(msg);
    }, 250);
    return () => clearTimeout(t);
    // `key` captures everything the run depends on (the chosen dates don't).
  }, [key, dataUrl]);

  return state;
}

export function Rolling({ market, dataUrl, plan, results }: Props) {
  const maxH = useMemo(() => maxHorizonYears(market, plan, results.map((r) => r.scenario)), [market, plan, results]);
  const options = HORIZONS.filter((h) => h <= maxH);
  const windowYears = Math.round(results[0]!.sim.summary.years);
  const preferred = options.includes(10 as never) ? 10 : (options.at(-1) ?? 0);
  const [chosen, setChosen] = useState<number | null>(null);
  const horizon = chosen != null && options.includes(chosen as never) ? chosen : preferred;

  const { result, pending, error } = useRolling(dataUrl, plan, results, horizon);
  // A stale result for different strategies would mislabel lines; only show matching ones.
  const usable = result && result.returns.length === results.length && result.horizonYears === horizon ? result : null;

  const series: ChartSeries[] = useMemo(
    () => (usable ? results.map((r, k) => ({ key: r.scenario.id, label: r.label, color: r.color, values: usable.returns[k]! })) : []),
    [usable, results],
  );

  if (options.length === 0) return null;

  return (
    <section className="card rolling" aria-labelledby="rolling-title">
      <h2 id="rolling-title" className="card-title">
        Was it the strategy, or the dates?
      </h2>
      <p className="card-sub">
        {windowYears > 0 ? `Your ${windowYears}-year window` : 'Your window'} is one draw from history. Here is the same plan started in every month
        {usable && usable.starts.length > 0 ? ` from ${formatMonth(usable.starts[0]!)} to ${formatMonth(usable.starts.at(-1)!)}` : ''}, each
        held for exactly {horizon} years.
      </p>
      <div className="quick-range" role="group" aria-label="Holding period">
        {options.map((h) => (
          <button key={h} type="button" className="chip chip--small" aria-pressed={h === horizon} onClick={() => setChosen(h)}>
            {h} years
          </button>
        ))}
      </div>

      {error && <p className="status">Couldn’t run this analysis ({error}).</p>}

      <div className={`rolling-body ${pending ? 'is-pending' : ''}`} aria-busy={pending}>
        {usable ? (
          <>
            <LineChart
              dates={usable.starts}
              series={series}
              formatValue={(v) => `${pct(v)} a year`}
              formatAxis={(v) => pct(v, { digits: 0 })}
              formatDate={(d) => `Started ${formatMonth(d)}`}
              height={260}
              ariaLabel={`Annual return by start month for ${horizon}-year windows. Summary figures follow in the table.`}
            />
            <div className="table-scroll">
              <table className="compare compare--rows">
                <thead>
                  <tr>
                    <th scope="col">Strategy</th>
                    <th scope="col">Typical annual return</th>
                    <th scope="col">Worst start</th>
                    <th scope="col">Best start</th>
                    <th scope="col">Windows ending below money put in</th>
                    <th scope="col">Windows where it finished first</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, k) => {
                    const s = usable.stats[k]!;
                    return (
                      <tr key={r.scenario.id}>
                        <th scope="row">
                          <span className="line-key" style={{ background: r.color }} />
                          {r.label}
                        </th>
                        <td>{pct(s.median)}</td>
                        <td>
                          {pct(s.worst.value)} <span className="muted">({formatMonth(s.worst.start)})</span>
                        </td>
                        <td>
                          {pct(s.best.value)} <span className="muted">({formatMonth(s.best.start)})</span>
                        </td>
                        <td>{pct(s.lostMoney, { digits: 0 })}</td>
                        <td>{pct(s.cameOutOnTop, { digits: 0 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="note">
              {usable.starts.length} overlapping {horizon}-year windows. Overlapping windows share most of their history, so treat this as a picture
              of the range, not independent odds.
            </p>
          </>
        ) : (
          <p className="status">Running every start date…</p>
        )}
      </div>
    </section>
  );
}
