import { ASSET_BY_ID, ASSETS, type AssetId } from '../engine/assets';
import type { Allocation } from '../engine/simulate';
import { DEFAULT_DIP_PCT } from '../engine/simulate';
import { allocationTotal, DIP_OPTIONS, holdings, REBALANCE_LABEL, REBALANCES, TIMING_LABEL, TIMINGS, type Scenario } from '../state/scenarios';
import { NumberField, Select } from './fields';
import { pct } from './format';

interface Props {
  scenario: Scenario;
  label: string;
  color: string;
  canRemove: boolean;
  onChange: (s: Scenario) => void;
  onRemove: () => void;
}

export function ScenarioEditor({ scenario, label, color, canRemove, onChange, onRemove }: Props) {
  const rows = holdings(scenario.allocation);
  const total = allocationTotal(scenario.allocation);
  const used = new Set(rows.map(([id]) => id));
  const unused = ASSETS.filter((a) => !used.has(a.id));

  const setAllocation = (allocation: Allocation) => onChange({ ...scenario, allocation });

  const replaceAsset = (from: AssetId, to: AssetId) => {
    const next: Allocation = {};
    for (const [id, w] of rows) next[id === from ? to : id] = w;
    setAllocation(next);
  };

  const setWeight = (id: AssetId, w: number) => setAllocation({ ...scenario.allocation, [id]: w });

  const remove = (id: AssetId) => {
    const next = { ...scenario.allocation };
    delete next[id];
    setAllocation(next);
  };

  const add = () => {
    const first = unused[0];
    if (!first) return;
    // New row takes whatever's left so the total stays at 100 when possible.
    setAllocation({ ...scenario.allocation, [first.id]: Math.max(0, 100 - total) || 10 });
  };

  return (
    <article className="scenario" style={{ '--scenario-color': color } as React.CSSProperties}>
      <header className="scenario-head">
        <span className="line-key" style={{ background: color }} />
        <h3>{label}</h3>
        {canRemove && (
          <button type="button" className="icon-button" onClick={onRemove} aria-label={`Remove ${label}`}>
            ×
          </button>
        )}
      </header>

      <div className="scenario-section">
        <div className="scenario-label">What to buy</div>
        {rows.map(([id, w]) => (
          <div className="alloc-row" key={id}>
            <Select
              label="Asset"
              className="alloc-asset"
              value={id}
              options={[ASSETS.find((a) => a.id === id)!, ...unused].map((a) => ({ value: a.id, label: a.name }))}
              onChange={(to) => replaceAsset(id, to)}
            />
            <NumberField label={`Percent in ${ASSET_BY_ID[id].name}`} value={w} onChange={(v) => setWeight(id, v)} max={100} suffix="%" width="3.5ch" />
            {rows.length > 1 && (
              <button type="button" className="icon-button" onClick={() => remove(id)} aria-label="Remove asset">
                ×
              </button>
            )}
          </div>
        ))}
        <div className="alloc-foot">
          {unused.length > 0 && (
            <button type="button" className="link-button" onClick={add}>
              + Add an asset
            </button>
          )}
          {Math.abs(total - 100) > 1e-6 && (
            <span className="warn" role="alert">
              Adds up to {pct(total / 100, { digits: 0 })}, needs 100%
            </span>
          )}
        </div>
      </div>

      <div className="scenario-section">
        <span className="scenario-label">When to buy</span>
        <Select
          label="When to buy"
          value={scenario.timing}
          options={TIMINGS.map((t) => ({ value: t, label: TIMING_LABEL[t] }))}
          onChange={(timing) => onChange({ ...scenario, timing, ...(timing === 'dip' ? { dipPct: scenario.dipPct ?? DEFAULT_DIP_PCT } : {}) })}
        />
        {scenario.timing === 'dip' && (
          <Select
            label="How far below its high"
            value={String(scenario.dipPct ?? DEFAULT_DIP_PCT)}
            options={DIP_OPTIONS.map((p) => ({ value: String(p), label: `${p}% or more below its high` }))}
            onChange={(v) => onChange({ ...scenario, dipPct: Number(v) })}
          />
        )}
      </div>

      {rows.length > 1 && (
        <div className="scenario-section">
          <span className="scenario-label">Keep the mix</span>
          <Select
            label="Rebalancing"
            value={scenario.rebalance}
            options={REBALANCES.map((r) => ({ value: r, label: REBALANCE_LABEL[r] }))}
            onChange={(rebalance) => onChange({ ...scenario, rebalance })}
          />
        </div>
      )}
    </article>
  );
}
