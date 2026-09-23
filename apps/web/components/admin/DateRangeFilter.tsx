'use client';

import { useState } from 'react';
import { DATE_RANGE_PRESETS, resolvePreset, type DateRangePreset } from '../../lib/dateRangePresets';
import { useTranslation } from '../../lib/i18n/LanguageContext';

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
  const { t, dir } = useTranslation();
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
        {DATE_RANGE_PRESETS.map((p) => (
          <option key={p} value={p}>
            {t(`dateRangePresets.${p}`)}
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
          <span className="text-sm text-neutral-500">{dir === 'rtl' ? '←' : '→'}</span>
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
