import type { Locale } from '../../lib/i18n/translations';

/** Keep the complete label readable, including long references without spaces. */
export function ProductName({ nameFr, nameAr, locale }: { nameFr: string; nameAr?: string; locale: Locale }) {
  const primary = locale === 'ar' && nameAr ? nameAr : nameFr;
  const secondary = nameAr ? (locale === 'ar' ? nameFr : nameAr) : undefined;

  return (
    <div className="min-w-0 w-full space-y-1 [overflow-wrap:anywhere]">
      <p dir="auto" className="whitespace-normal text-base font-semibold leading-snug text-neutral-900">{primary}</p>
      {secondary && <p dir="auto" className="whitespace-normal text-sm leading-snug text-neutral-600">{secondary}</p>}
    </div>
  );
}
