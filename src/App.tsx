import { useEffect, useMemo, useState } from 'react';
import { ASSET_BY_ID, ASSETS } from './engine/assets';
import { formatMonth } from './ui/format';
import { indexOnOrAfter, parseMarket, type Market, type RawMarket } from './engine/market';
import { resolveWindow, simulate, SimulationError } from './engine/simulate';
import {
  decodeState,
  encodeState,
  isValidAllocation,
  labelScenarios,
  MAX_SCENARIOS,
  newId,
  PRESETS,
  type AppState,
} from './state/scenarios';
import { PlanForm } from './ui/PlanForm';
import { Results, type ScenarioResult } from './ui/Results';
import { Rolling } from './ui/Rolling';
import { ScenarioEditor } from './ui/ScenarioEditor';

/** Colors follow the scenario's slot, never its rank, so a removal doesn't repaint the others. */
const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)'];

const DATA_URL = new URL(`${import.meta.env.BASE_URL}data/market.json`, window.location.href).href;

function useMarket() {
  const [market, setMarket] = useState<Market | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch(DATA_URL)
      .then((r) => (r.ok ? (r.json() as Promise<RawMarket>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((raw) => setMarket(parseMarket(raw)))
      .catch((e: Error) => setError(e.message));
  }, []);
  return { market, error };
}

function defaultState(market: Market): AppState {
  const plan = { start: '2020-01-01', end: market.dates.at(-1)!, amount: 100, frequency: 'weekly' as const, funding: 'as-earned' as const, initial: 0 };
  return { plan, scenarios: PRESETS[0]!.build(plan) };
}

export default function App() {
  const { market, error } = useMarket();
  if (error) return <Shell>Couldn’t load market data ({error}). Try reloading.</Shell>;
  if (!market) return <Shell>Loading market history…</Shell>;
  return <Simulator market={market} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="page">
      <Header />
      <p className="status">{children}</p>
    </main>
  );
}

function Header() {
  return (
    <header className="masthead">
      <h1>Hindsight</h1>
      <p className="lede">See what different ways of investing would actually have done, using real market history.</p>
    </header>
  );
}

function Simulator({ market }: { market: Market }) {
  const [state, setState] = useState<AppState>(() => decodeState(window.location.hash) ?? defaultState(market));
  const { plan, scenarios } = state;
  const [activePreset, setActivePreset] = useState<string | null>(() => (window.location.hash ? null : PRESETS[0]!.id));

  useEffect(() => {
    history.replaceState(null, '', `#${encodeState(state)}`);
  }, [state]);

  const labels = useMemo(() => labelScenarios(scenarios), [scenarios]);
  const colorOf = (i: number) => COLORS[i % COLORS.length]!;

  const outcome = useMemo(() => {
    const valid = scenarios.map((s, i) => ({ s, i })).filter(({ s }) => isValidAllocation(s.allocation));
    if (valid.length === 0) return { error: 'Every strategy needs its mix to add up to 100%.' };
    try {
      // All strategies share one window so they're compared over identical dates.
      const window = resolveWindow(market, plan, valid.map(({ s }) => s));
      const results: ScenarioResult[] = valid.map(({ s, i }) => ({
        scenario: s,
        label: labels[i]!,
        color: colorOf(i),
        sim: simulate(market, plan, s, window),
      }));
      return { results, window };
    } catch (e) {
      if (e instanceof SimulationError) return { error: e.message };
      throw e;
    }
  }, [market, plan, scenarios, labels]);

  const update = (patch: Partial<AppState>) => setState((s) => ({ ...s, ...patch }));

  // Did an asset's inception date push the start later than the user asked?
  const w = 'window' in outcome ? outcome.window : undefined;
  const lateStart = !!w && w.earliestIndex > indexOnOrAfter(market.dates, plan.start);
  const limitingAssets = lateStart
    ? ASSETS.filter((a) => scenarios.some((s) => (s.allocation[a.id] ?? 0) > 0) && market.assets[a.id].start === w.earliestIndex).map((a) => a.name)
    : [];

  return (
    <main className="page">
      <Header />

      <section className="card plan-card" aria-label="Your plan">
        <PlanForm plan={plan} onChange={(p) => update({ plan: p })} dataStart={market.dates[0]!} dataEnd={market.dates.at(-1)!} />
      </section>

      <section aria-labelledby="compare-title">
        <div className="section-head">
          <h2 id="compare-title">Compare</h2>
          <div className="presets" role="group" aria-label="Ready-made comparisons">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip"
                aria-pressed={activePreset === p.id}
                onClick={() => {
                  setActivePreset(p.id);
                  const nextPlan = { ...plan, ...p.plan };
                  update({ plan: nextPlan, scenarios: p.build(nextPlan) });
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {activePreset && <p className="preset-question">{PRESETS.find((p) => p.id === activePreset)!.question}</p>}

        <div className="scenarios">
          {scenarios.map((s, i) => (
            <ScenarioEditor
              key={s.id}
              scenario={s}
              label={labels[i]!}
              color={colorOf(i)}
              canRemove={scenarios.length > 1}
              onChange={(next) => {
                setActivePreset(null);
                update({ scenarios: scenarios.map((x) => (x.id === s.id ? next : x)) });
              }}
              onRemove={() => {
                setActivePreset(null);
                update({ scenarios: scenarios.filter((x) => x.id !== s.id) });
              }}
            />
          ))}
          {scenarios.length < MAX_SCENARIOS && (
            <button
              type="button"
              className="add-scenario"
              onClick={() => {
                setActivePreset(null);
                update({ scenarios: [...scenarios, { ...scenarios.at(-1)!, id: newId() }] });
              }}
            >
              + Add a strategy to compare
            </button>
          )}
        </div>
      </section>

      {lateStart && (
        <p className="note">
          {limitingAssets.join(' and ')} data starts in {formatMonth(market.dates[w.earliestIndex]!)}, so this comparison starts there.
        </p>
      )}

      {'error' in outcome ? (
        <p className="status">{outcome.error}</p>
      ) : (
        <>
          <Results market={market} plan={plan} results={outcome.results!} />
          <Rolling market={market} dataUrl={DATA_URL} plan={plan} results={outcome.results!} />
        </>
      )}

      <Methodology market={market} />
    </main>
  );
}

function Methodology({ market }: { market: Market }) {
  return (
    <details className="methodology">
      <summary>How this works</summary>
      <ul>
        <li>
          <strong>Fair comparisons.</strong> Every strategy receives exactly the same money on the same dates. They differ only in when they
          move it from cash into the market. Money waiting to be invested sits in T-bills, earns their interest, and counts toward the balance.
        </li>
        <li>
          <strong>When money arrives.</strong> “As I earn it” pays your amount on your schedule, like a paycheck. “All at the start” makes the
          whole amount available on day one, like a windfall. Each strategy spreads every arrival evenly over its buy dates before the next
          one: paid weekly and buying monthly means saving up four weeks of pay; a windfall bought monthly is fed in month by month; “right
          away” invests money the day it arrives. An optional yearly raise steps the amount up on each anniversary of the start.
        </li>
        <li>
          <strong>Real prices, dividends included.</strong> Each asset is a real fund’s daily price with dividends and interest reinvested.
          Purchases happen at that day’s closing price; a date that falls on a weekend or holiday buys on the next trading day.
        </li>
        <li>
          <strong>Annual return</strong> is money-weighted (XIRR): each dollar only counts for the time it was actually invested, which is the
          honest measure when money goes in over time. <strong>After inflation</strong> restates every contribution in end-date dollars using CPI.
        </li>
        <li>
          <strong>Not included:</strong> fund fees beyond what’s already in the fund price, trading costs, and taxes. Fractional shares are assumed.
          Past performance doesn’t predict future results.
        </li>
      </ul>
      <table className="sources">
        <tbody>
          {ASSETS.map((a) => (
            <tr key={a.id}>
              <th scope="row">{a.name}</th>
              <td>{ASSET_BY_ID[a.id].source}</td>
              <td>from {formatMonth(market.dates[market.assets[a.id].start]!)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">
        Prices via Yahoo Finance, T-bill yields and CPI via FRED (Federal Reserve Bank of St. Louis). Data through {formatMonth(market.dates.at(-1)!)}.
      </p>
    </details>
  );
}
