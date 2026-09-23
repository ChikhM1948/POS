export type DateRangePreset = 'today' | '7d' | '30d' | 'month' | 'custom';

export const DATE_RANGE_PRESETS: DateRangePreset[] = ['today', '7d', '30d', 'month', 'custom'];

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Bornes [from, to] en dates locales (à minuit / 23:59:59) pour un préréglage donné. */
export function resolvePreset(preset: DateRangePreset): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let from: Date;

  switch (preset) {
    case 'today':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case '7d':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      break;
    case '30d':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      break;
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  }

  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}
