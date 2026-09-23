'use client';

import { useState } from 'react';
import type { RevenueByDayPoint } from '@pos-dz/shared';
import { useTranslation } from '../../../lib/i18n/LanguageContext';
import { formatCurrency, formatDayLabel as formatDayLabelIntl } from '../../../lib/format';

// Hue "sequential" du skill dataviz — une seule teinte pour une série de magnitude (voir palette.md).
const SEQUENTIAL_BLUE = '#2a78d6';

interface Props {
  data: RevenueByDayPoint[];
}

/** Barres verticales, une seule teinte : pas de légende requise (une seule série — voir marks-and-anatomy.md). */
export function RevenueBarChart({ data }: Props) {
  const { t, locale } = useTranslation();
  const formatDZD = (cents: number) => formatCurrency(cents, locale, { maximumFractionDigits: 0 });
  const formatDayLabel = (iso: string) => formatDayLabelIntl(iso, locale);
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="text-sm text-neutral-500">{t('revenueChart.empty')}</p>;
  }

  const max = Math.max(1, ...data.map((d) => d.revenueCents));
  const maxIndex = data.reduce((best, d, i) => (d.revenueCents > data[best].revenueCents ? i : best), 0);
  const showDayLabels = data.length <= 14;

  return (
    <div>
      <div className="relative flex h-48 items-end gap-[3px] border-b border-neutral-200 ps-12">
        <div className="pointer-events-none absolute inset-y-0 start-12 end-0">
          {[0, 0.5, 1].map((f) => (
            <div key={f} className="absolute start-0 end-0 border-t border-neutral-100" style={{ bottom: `${f * 100}%` }} />
          ))}
        </div>
        <div className="absolute start-0 top-0 w-11 pe-1 text-end text-[10px] text-neutral-400">{formatDZD(max)}</div>
        <div className="absolute bottom-0 start-0 w-11 pe-1 text-end text-[10px] text-neutral-400">0</div>

        {data.map((d, i) => (
          <div
            key={d.date}
            className="relative h-full flex-1"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
          >
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-[4px]"
              style={{
                height: `${(d.revenueCents / max) * 100}%`,
                width: 'min(24px, 100%)',
                backgroundColor: SEQUENTIAL_BLUE,
                opacity: hovered === null || hovered === i ? 1 : 0.55,
              }}
            />
            {i === maxIndex && (
              <span
                className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-neutral-700"
                style={{ bottom: `calc(${(d.revenueCents / max) * 100}% + 4px)` }}
              >
                {formatDZD(d.revenueCents)}
              </span>
            )}
            {hovered === i && (
              <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs text-white shadow">
                {formatDayLabel(d.date)} · {formatDZD(d.revenueCents)} ·{' '}
                {d.salesCount} {d.salesCount > 1 ? t('revenueChart.salesCountPlural') : t('revenueChart.salesCountSingular')}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[3px] ps-12 text-[10px] text-neutral-400">
        {data.map((d) => (
          <span key={d.date} className="flex-1 text-center">
            {showDayLabels ? formatDayLabel(d.date) : ''}
          </span>
        ))}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-brand-600 hover:text-brand-700">{t('revenueChart.viewTable')}</summary>
        <table className="mt-2 w-full text-sm">
          <thead className="border-b text-start text-neutral-500">
            <tr>
              <th className="py-1">{t('revenueChart.tableDate')}</th>
              <th className="py-1">{t('revenueChart.tableSales')}</th>
              <th className="py-1 text-end">{t('revenueChart.tableRevenue')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date} className="border-b border-neutral-100 last:border-0">
                <td className="py-1">{formatDayLabel(d.date)}</td>
                <td className="py-1">{d.salesCount}</td>
                <td className="py-1 text-end">{formatDZD(d.revenueCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
