import { useEffect, useId, useState } from 'react';

/**
 * A numeric text field that lets people type freely (empty, "1,000", "12.") and
 * only commits a parsed number. Native number inputs fight the user on all of those.
 */
export function NumberField({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  prefix,
  suffix,
  label,
  className = '',
  width = '6ch',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
  label: string;
  className?: string;
  width?: string;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    // Sync when the value changes from outside (e.g. a preset), without clobbering typing.
    setText((t) => (parse(t) === value ? t : String(value)));
  }, [value]);

  const commit = (t: string) => {
    const v = parse(t);
    if (v != null) onChange(Math.min(max, Math.max(min, v)));
  };

  return (
    <span className={`field ${className}`}>
      {prefix && <span className="field-affix">{prefix}</span>}
      <input
        aria-label={label}
        inputMode="decimal"
        value={text}
        style={{ width }}
        onChange={(e) => {
          setText(e.target.value);
          commit(e.target.value);
        }}
        onBlur={() => setText(String(value))}
      />
      {suffix && <span className="field-affix">{suffix}</span>}
    </span>
  );
}

function parse(t: string): number | null {
  const cleaned = t.replace(/[,\s$%]/g, '');
  if (cleaned === '' || cleaned === '.') return null;
  const v = Number(cleaned);
  return Number.isFinite(v) ? v : null;
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  className = '',
}: {
  value: T;
  options: readonly { value: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <span className={`field field--select ${className}`}>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Month + year picker over a bounded range, value as "YYYY-MM". */
export function MonthField({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: string;
  min: string;
  max: string;
  onChange: (ym: string) => void;
  label: string;
}) {
  const id = useId();
  const [y, m] = value.split('-') as [string, string];
  const minY = Number(min.slice(0, 4));
  const maxY = Number(max.slice(0, 4));
  const clamp = (ym: string) => (ym < min ? min : ym > max ? max : ym);
  const years: string[] = [];
  for (let yr = maxY; yr >= minY; yr--) years.push(String(yr));
  return (
    <span className="month-field" role="group" aria-labelledby={id}>
      <span id={id} className="visually-hidden">
        {label}
      </span>
      <Select
        label={`${label} month`}
        value={m}
        options={MONTHS.map((name, i) => {
          const mm = String(i + 1).padStart(2, '0');
          const ym = `${y}-${mm}`;
          return { value: mm, label: name, disabled: ym < min || ym > max };
        })}
        onChange={(mm) => onChange(clamp(`${y}-${mm}`))}
      />
      <Select label={`${label} year`} value={y} options={years.map((v) => ({ value: v, label: v }))} onChange={(yy) => onChange(clamp(`${yy}-${m}`))} />
    </span>
  );
}
