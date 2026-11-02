'use client';

import { useTranslation } from '../../lib/i18n/LanguageContext';
import type { DocumentParty } from '@pos-dz/shared';

const FIELDS = [
  ['name', 'docs.clientName'],
  ['address', 'docs.clientAddress'],
  ['nif', 'docs.nif'],
  ['rc', 'docs.rc'],
  ['nis', 'docs.nis'],
  ['ai', 'docs.ai'],
] as const;

/** Saisie de l'identité de l'acheteur (nom + identifiants fiscaux), partagée par tous les formulaires de documents. */
export function PartyFields({ value, onChange }: { value: DocumentParty; onChange: (v: DocumentParty) => void }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-2">
      {FIELDS.map(([k, label]) => (
        <label key={k} className="flex flex-col gap-0.5 text-xs font-medium text-neutral-600">
          {t(label)}
          <input
            value={value[k] ?? ''}
            onChange={(e) => onChange({ ...value, [k]: e.target.value })}
            className="rounded-lg border border-neutral-300 px-2 py-1 text-sm text-neutral-900 focus:border-brand-500"
          />
        </label>
      ))}
    </div>
  );
}
