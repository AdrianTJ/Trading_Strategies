import { useMemo, useState } from 'react';
import type { Market } from '../engine/market';
import { inEndDollars, type Plan, type Simulation } from '../engine/simulate';
import { describeAllocation, describeTiming, FREQUENCY_NOUN, holdings, type Scenario } from '../state/scenarios';
import { formatMonth, money, moneyCompact, moneyWhole, pct, signedMoney } from './format';
import { LineChart, type ChartSeries } from './LineChart';

export interface ScenarioResult {
  scenario: Scenario;
  label: string;
  color: string;
  sim: Simulation;
}

interface Props {
  market: Market;
  plan: Plan;
  results: readonly ScenarioResult[];
}

export function Results({ market, plan, results }: Props) {
  const first = results[0]!.sim;
  const dates = useMemo(() => market.dates.slice(first.startIndex, first.endIndex + 1), [market, first.startIndex, first.endIndex]);
  const startDate = dates[0]!;
  const endDate = dates.at(-1)!;
  const years = first.summary.years;
  const annualOk = years >= 1;

  // Nominal dollars, or every point restated in end-date dollars with CPI.
  const [inTodaysMoney, setInTodaysMoney] = useState(false);
  const real = useMemo(() => (inTodaysMoney ? results.map((r) => inEndDollars(market, r.sim)) : null), [inTodaysMoney, market, results]);
  const series: ChartSeries[] = useMemo(
    () => results.map((r, k) => ({ key: r.scenario.id, label: r.label, color: r.color, values: real ? real[k]!.value : r.sim.value })),
    [results, real],
  );
  // Every strategy receives the same money on the same days, so one "money put in" line serves all.
  const reference = useMemo(
    () => ({ label: real ? 'Put in (today’s money)' : 'Money put in', values: real ? real[0]!.contributed : first.contributed }),
    [real, first],
  );

  const sorted = [...results].sort((a, b) => b.sim.summary.finalValue - a.sim.summary.finalValue);
  const best = sorted[0]!;
  const worst = sorted.at(-1)!;
  const total = first.summary.totalContributed;

  return (
    <section className="results" aria-labelledby="results-title">
      <h2 id="results-title" className="visually-hidden">
        Results
      </h2>
      <p className="headline">
        From {formatMonth(startDate)} to {formatMonth(endDate)}, {moneyWhole(total)} put in
        {results.length > 1 ? (
          <>
            {' '}
            ended up worth between <strong>{moneyWhole(worst.sim.summary.finalValue)}</strong> and{' '}
            <strong>{moneyWhole(best.sim.summary.finalValue)}</strong>.
          </>
        ) : (
          <>
            {' '}
            grew to <strong>{moneyWhole(best.sim.summary.finalValue)}</strong>.
          </>
        )}
      </p>

      <div className="tiles">
        {results.map((r) => {
          const s = r.sim.summary;
          return (
            <div className="tile" key={r.scenario.id}>
              <div className="tile-label">
                <span className="line-key" style={{ background: r.color }} />
                {r.label}
              </div>
              <div className="tile-value">{moneyWhole(s.finalValue)}</div>
              <div className={`tile-delta ${s.gain >= 0 ? 'up' : 'down'}`}>
                {signedMoney(s.gain)} ({pct(s.gainPct, { signed: true, digits: 0 })})
              </div>
              {annualOk && <div className="tile-sub">{pct(s.moneyWeightedReturn)} a year</div>}
            </div>
          );
        })}
      </div>

      <figure className="card">
        <div className="figure-head">
          <figcaption className="card-title">
            What it was worth along the way{real && <span className="card-title-sub"> in {formatMonth(endDate)} dollars</span>}
          </figcaption>
          <div className="quick-range" role="group" aria-label="Dollars shown">
            <button type="button" className="chip chip--small" aria-pressed={!inTodaysMoney} onClick={() => setInTodaysMoney(false)}>
              Dollars of the day
            </button>
            <button type="button" className="chip chip--small" aria-pressed={inTodaysMoney} onClick={() => setInTodaysMoney(true)}>
              In today’s money
            </button>
          </div>
        </div>
        {real && (
          <p className="note chart-note">
            Every point is restated in {formatMonth(endDate)} dollars using CPI, so the gap between the lines and money put in is real growth in
            what the money could buy.
          </p>
        )}
        <LineChart
          dates={dates}
          series={series}
          reference={reference}
          formatValue={moneyWhole}
          formatAxis={moneyCompact}
          ariaLabel={`Portfolio value from ${formatMonth(startDate)} to ${formatMonth(endDate)}. Exact figures are in the table below.`}
        />
      </figure>

      <Takeaways results={results} plan={plan} />

      <div className="card table-card">
        <table className="compare">
          <thead>
            <tr>
              <th scope="col" />
              {results.map((r) => (
                <th scope="col" key={r.scenario.id}>
                  <span className="line-key" style={{ background: r.color }} />
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="Ended with" help={`On ${formatMonth(endDate)}`} results={results} cell={(r) => moneyWhole(r.sim.summary.finalValue)} />
            <Row label="Put in" help="Money that arrived" results={results} cell={(r) => moneyWhole(r.sim.summary.totalContributed)} />
            <Row
              label="Put in, in today’s money"
              help={`Each amount restated in ${formatMonth(endDate)} dollars`}
              results={results}
              cell={(r) => moneyWhole(r.sim.summary.contributedInEndDollars)}
            />
            <Row label="When it was invested" results={results} cell={(r) => contributionText(r)} />
            {results.some((r) => r.sim.summary.finalCash >= 0.5) && (
              <Row
                label="Still waiting in cash"
                help="Arrived after the strategy’s last buy, so it’s held in T-bills"
                results={results}
                cell={(r) => (r.sim.summary.finalCash >= 0.5 ? moneyWhole(r.sim.summary.finalCash) : '—')}
              />
            )}
            <Row
              label="Average dollar invested for"
              help="Money that goes in earlier has longer to grow (or fall)"
              results={results}
              cell={(r) => yearsText(r.sim.summary.averageYearsInvested)}
            />
            <Row label="Gain" results={results} cell={(r) => `${signedMoney(r.sim.summary.gain)} (${pct(r.sim.summary.gainPct, { signed: true })})`} />
            <Row
              label="Annual return"
              help="Yearly rate earned on each dollar from the day it went in"
              results={results}
              cell={(r) => (annualOk ? pct(r.sim.summary.moneyWeightedReturn) : '—')}
            />
            <Row
              label="After inflation"
              help="The same, after subtracting inflation (CPI)"
              results={results}
              cell={(r) => (annualOk ? pct(r.sim.summary.realMoneyWeightedReturn) : '—')}
            />
            <Row
              label="Worst fall from a high"
              help="Biggest peak-to-bottom drop of the investments themselves"
              results={results}
              cell={(r) => {
                const dd = r.sim.summary.maxDrawdown;
                if (dd.depth > -0.0005) return 'None';
                return `${pct(dd.depth)} (${formatMonth(market.dates[r.sim.startIndex + dd.troughIndex]!)})`;
              }}
            />
            <Row
              label="Furthest below money put in"
              help="The worst moment to look at your balance"
              results={results}
              cell={(r) => {
                const w = r.sim.summary.worstShortfall;
                if (w.amount > -0.5) return 'Never';
                return `${signedMoney(w.amount)} (${formatMonth(market.dates[r.sim.startIndex + w.index]!)})`;
              }}
            />
          </tbody>
        </table>
      </div>
      {!annualOk && <p className="note">Annual rates are hidden for windows shorter than a year, where they exaggerate.</p>}
      {(plan.raise ?? 0) > 0 && (
        <p className="note">
          Contributions rise {plan.raise}% on each anniversary of the start, from {money(plan.amount)} to{' '}
          {money(plan.amount * Math.pow(1 + plan.raise! / 100, Math.floor(years)))} per {FREQUENCY_NOUN[plan.frequency]} by the end.
        </p>
      )}
      {plan.initial > 0 && <p className="note">Includes a {moneyWhole(plan.initial)} starting balance, available on day one to every strategy.</p>}
    </section>
  );
}

function yearsText(years: number) {
  if (years * 52 < 8) return weeksText(years * 52);
  if (years < 1) return `${Math.round(years * 12)} months`;
  return `${years.toFixed(1)} years`;
}

function weeksText(weeks: number) {
  if (weeks >= 52) return `${(weeks / 52).toFixed(1)} years`;
  const w = Math.round(weeks);
  return w === 1 ? 'a week' : `${w} weeks`;
}

function contributionText(r: ScenarioResult) {
  const { buyCount } = r.sim;
  const when = r.scenario.timing === 'lump' ? 'As soon as it arrived' : describeTiming(r.scenario);
  return `${when} (${buyCount} ${buyCount === 1 ? 'buy' : 'buys'})`;
}

function Row({ label, help, results, cell }: { label: string; help?: string; results: readonly ScenarioResult[]; cell: (r: ScenarioResult) => string }) {
  return (
    <tr>
      <th scope="row">
        {label}
        {help && <span className="row-help">{help}</span>}
      </th>
      {results.map((r) => (
        <td key={r.scenario.id}>{cell(r)}</td>
      ))}
    </tr>
  );
}

/**
 * Plain-language observations that are true of *this* run. Each one is derived from
 * the numbers on screen; nothing here is general advice.
 */
function Takeaways({ results, plan }: { results: readonly ScenarioResult[]; plan: Plan }) {
  const notes: string[] = [];
  const key = (r: ScenarioResult) => JSON.stringify([holdings(r.scenario.allocation), holdings(r.scenario.allocation).length > 1 ? r.scenario.rebalance : '']);

  // Same holdings, different timing (including all-at-once): explain the gap honestly.
  // The dominant driver is almost always *when* the money went in on average, so say that
  // rather than implying one schedule is cleverer.
  const groups = new Map<string, ScenarioResult[]>();
  for (const r of results) groups.set(key(r), [...(groups.get(key(r)) ?? []), r]);
  for (const group of groups.values()) {
    // Identical strategies say nothing about timing; compare distinct timings only.
    const seen = new Set<string>();
    const g = group.filter((r) => !seen.has(describeTiming(r.scenario)) && seen.add(describeTiming(r.scenario)));
    if (g.length < 2) continue;
    const byValue = [...g].sort((a, b) => b.sim.summary.finalValue - a.sim.summary.finalValue);
    const top = byValue[0]!;
    const bottom = byValue.at(-1)!;
    const name = (r: ScenarioResult) => describeTiming(r.scenario).toLowerCase();
    const gap = top.sim.summary.finalValue / bottom.sim.summary.finalValue - 1;
    const earlierWeeks = ((top.sim.summary.averageYearsInvested - bottom.sim.summary.averageYearsInvested) * 365.25) / 7;
    if (gap < 0.01) {
      notes.push(
        `Investing ${g.map(name).join(' vs ')} changed the ending balance by only ${pct(gap)}. ` +
          (g.every((r) => r.scenario.timing !== 'lump' && r.scenario.timing !== 'dip')
            ? 'How often you buy barely matters; what you buy and how long you stay in does.'
            : 'When you bought barely mattered here; what you buy and how long you stay in does.'),
      );
    } else if (earlierWeeks >= 1) {
      notes.push(
        `Investing ${name(top)} ended ${pct(gap)} ahead of investing ${name(bottom)}. The main reason: its average dollar went in ${weeksText(earlierWeeks)} earlier, so it spent longer in a market that mostly rose. That’s why investing sooner usually wins.`,
      );
    } else if (earlierWeeks <= -1) {
      notes.push(
        `Investing ${name(top)} ended ${pct(gap)} ahead of investing ${name(bottom)} even though its average dollar went in ${weeksText(-earlierWeeks)} later: prices dipped while the earlier money was going in. That’s the luck of these dates; try the start-date view below.`,
      );
    } else {
      notes.push(`Investing ${name(top)} ended ${pct(gap)} ahead of investing ${name(bottom)}, from the luck of which days each one bought on.`);
    }
    // Investing everything at once also means the full amount rides every drop.
    // With a windfall, investing right away means the whole amount rides every drop;
    // spreading it out on a schedule limits that. (For paychecks, "right away" is just
    // buying on payday, so there's no trade-off to point out.)
    const lump = g.find((r) => r.scenario.timing === 'lump');
    const spread = g.find((r) => r.scenario.timing !== 'lump' && r.scenario.timing !== 'dip');
    if (plan.funding === 'upfront' && lump && spread) {
      const lumpLow = lump.sim.summary.worstShortfall.amount;
      const spreadLow = spread.sim.summary.worstShortfall.amount;
      if (lumpLow < spreadLow - 1) {
        notes.push(
          `The cost of investing right away: at its worst it sat ${moneyWhole(-lumpLow)} below what was put in, versus ${moneyWhole(-spreadLow)} when spread out ${name(spread)}.`,
        );
      }
    }
  }

  // Buy-the-dip: say how often the trigger fired and what waiting cost in time.
  for (const r of results) {
    if (r.scenario.timing !== 'dip') continue;
    const s = r.sim.summary;
    const days = r.sim.value.length;
    const pctDays = r.sim.dipDays / days;
    const what = holdings(r.scenario.allocation).length === 1 ? `the ${describeAllocation(r.scenario.allocation)}` : 'the mix';
    const howOften = pctDays >= 0.01 ? `${pct(pctDays, { digits: 0 })} of trading days` : `only ${r.sim.dipDays} trading ${r.sim.dipDays === 1 ? 'day' : 'days'}`;
    let note =
      r.sim.dipDays === 0
        ? `${describeTiming(r.scenario)}: the drop never came in this window, so nothing was ever invested.`
        : `${describeTiming(r.scenario)}: ${what} was that far below its high on ${howOften}, so the average dollar waited ${yearsText(s.averageYearsWaiting)} in T-bills before going in.`;
    if (s.finalCash >= 0.5 && pctDays > 0) note += ` ${moneyWhole(s.finalCash)} was still waiting for the next drop at the end.`;
    notes.push(note);
  }

  // Inflation: flag anything that lost purchasing power.
  const lost = results.filter((r) => r.sim.summary.years >= 1 && r.sim.summary.realMoneyWeightedReturn < 0);
  for (const r of lost) {
    notes.push(
      `${r.label} grew ${pct(r.sim.summary.moneyWeightedReturn)} a year on paper but ${pct(r.sim.summary.realMoneyWeightedReturn)} a year after inflation: it bought less at the end than the money put in would have.`,
    );
  }

  if (notes.length === 0) return null;
  return (
    <ul className="takeaways">
      {notes.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  );
}
