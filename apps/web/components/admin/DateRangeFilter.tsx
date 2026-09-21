'use client';

import { useState } from 'react';
import { PRESET_LABELS, resolvePreset, type DateRangePreset } from '../../lib/dateRangePresets';

export interface DateRangeValue {
  from: string;
  to: string;
}

interface Props {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

/** Liste de préréglages + bornes personnalisées — voir dataviz skill: "Filter controls". */
export function DateRangeFilter({ value, onChange }: Props) {
  const [preset, setPreset] = useState<DateRangePreset>('7d');

  function handlePreset(next: DateRangePreset) {
    setPreset(next);
    if (next !== 'custom') onChange(resolvePreset(next));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={preset}
        onChange={(e) => handlePreset(e.target.value as DateRangePreset)}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
      >
        {(Object.keys(PRESET_LABELS) as DateRangePreset[]).map((p) => (
          <option key={p} value={p}>
            {PRESET_LABELS[p]}
          </option>
        ))}
      </select>
      {preset === 'custom' && (
        <>
          <input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
          />
          <span className="text-sm text-neutral-500">→</span>
          <input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
          />
        </>
      )}
    </div>
  );
}
