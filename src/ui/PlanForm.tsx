import { addDays, addMonths, type ISODate } from '../engine/dates';
import type { Plan } from '../engine/simulate';
import { FREQUENCIES, FREQUENCY_NOUN } from '../state/scenarios';
import { MonthField, NumberField, Select } from './fields';

interface Props {
  plan: Plan;
  onChange: (plan: Plan) => void;
  /** First and last trading days in the data. */
  dataStart: ISODate;
  dataEnd: ISODate;
}

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
      <div className="plan-extras">
        <span className="quick-range" role="group" aria-label="Quick date ranges">
          {([5, 10, 20, 'max'] as const).map((y) => (
            <button key={y} type="button" className="chip chip--small" onClick={() => setRange(y)}>
              {y === 'max' ? 'All history' : `Last ${y} years`}
            </button>
          ))}
        </span>
        <label className="starting-balance">
          <span>Plus a starting balance of</span>
          <NumberField label="Starting balance" prefix="$" value={plan.initial} onChange={(initial) => set({ initial })} max={1e10} width="8ch" />
        </label>
      </div>
    </div>
  );
}
