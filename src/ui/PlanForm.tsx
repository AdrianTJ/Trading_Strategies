import { addDays, addMonths, type ISODate } from '../engine/dates';
import type { Funding, Plan } from '../engine/simulate';
import { FREQUENCIES, FREQUENCY_NOUN } from '../state/scenarios';
import { MonthField, NumberField, Select } from './fields';

interface Props {
  plan: Plan;
  onChange: (plan: Plan) => void;
  /** First and last trading days in the data. */
  dataStart: ISODate;
  dataEnd: ISODate;
}

const FUNDING_OPTIONS: readonly { value: Funding; label: string; help: string }[] = [
  { value: 'as-earned', label: 'as I earn it', help: 'Like a paycheck: each amount arrives on schedule and waits in T-bills until the strategy buys.' },
  {
    value: 'upfront',
    label: 'all at the start',
    help: 'Like a windfall: the whole amount is there on day one and waits in T-bills until the strategy buys.',
  },
];

const lastDayOfMonth = (ym: string) => addDays(addMonths(`${ym}-01`, 1), -1);

export function PlanForm({ plan, onChange, dataStart, dataEnd }: Props) {
  const set = (patch: Partial<Plan>) => onChange({ ...plan, ...patch });
  const minYM = dataStart.slice(0, 7);
  const maxYM = dataEnd.slice(0, 7);

  // End is stored as the last calendar day of the chosen month, capped at the data's end.
  const setEnd = (ym: string) => {
    const last = lastDayOfMonth(ym);
    set({ end: last > dataEnd ? dataEnd : last });
  };

  const setRange = (years: number | 'max') => {
    const start = years === 'max' ? dataStart : addMonths(dataEnd, -12 * years).slice(0, 7) + '-01';
    onChange({ ...plan, start: start < dataStart ? dataStart : start, end: dataEnd });
  };

  return (
    <div className="plan">
      <p className="plan-sentence">
        <span>Invest</span>
        <NumberField label="Amount per contribution" prefix="$" value={plan.amount} onChange={(amount) => set({ amount })} max={1e9} width="7ch" />
        <span>every</span>
        <Select
          label="How often"
          value={plan.frequency}
          options={FREQUENCIES.map((f) => ({ value: f, label: FREQUENCY_NOUN[f] }))}
          onChange={(frequency) => set({ frequency })}
        />
        <span>from</span>
        <MonthField label="Start" value={plan.start.slice(0, 7)} min={minYM} max={maxYM} onChange={(ym) => set({ start: `${ym}-01` })} />
        <span>to</span>
        <MonthField label="End" value={plan.end.slice(0, 7)} min={minYM} max={maxYM} onChange={setEnd} />
      </p>
      <div className="funding" role="radiogroup" aria-label="When the money is available">
        <span className="funding-label">The money is available</span>
        {FUNDING_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={plan.funding === o.value}
            className="chip chip--small"
            aria-pressed={plan.funding === o.value}
            onClick={() => set({ funding: o.value })}
            title={o.help}
          >
            {o.label}
          </button>
        ))}
        <span className="funding-help">{FUNDING_OPTIONS.find((o) => o.value === plan.funding)!.help}</span>
      </div>
      <div className="plan-extras">
        <span className="quick-range" role="group" aria-label="Quick date ranges">
          {([5, 10, 20, 'max'] as const).map((y) => (
            <button key={y} type="button" className="chip chip--small" onClick={() => setRange(y)}>
              {y === 'max' ? 'All history' : `Last ${y} years`}
            </button>
          ))}
        </span>
        <span className="plan-amount-extras">
          <label className="starting-balance">
            <span>Raise it by</span>
            <NumberField label="Yearly raise in percent" value={plan.raise ?? 0} onChange={(raise) => set({ raise })} min={0} max={50} suffix="% a year" width="3ch" />
          </label>
          <label className="starting-balance">
            <span>Plus a starting balance of</span>
            <NumberField label="Starting balance" prefix="$" value={plan.initial} onChange={(initial) => set({ initial })} max={1e10} width="8ch" />
          </label>
        </span>
      </div>
    </div>
  );
}
