'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { HeldCart, OfflineDB } from '../../lib/db/offline-db';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { formatCurrency } from '../../lib/format';
import { IconCart, IconTrash, IconX } from '../icons';

interface Props {
  db: OfflineDB;
  onResume: (cart: HeldCart) => void;
  onClose: () => void;
}

/** Liste des paniers en attente. Clavier : ↑/↓ choisir, Entrée reprendre, Suppr supprimer, Échap fermer. */
export function HeldCartsModal({ db, onResume, onClose }: Props) {
  const { t, locale } = useTranslation();
  const carts = useLiveQuery(() => db.heldCarts.orderBy('heldAt').reverse().toArray(), [db]) ?? [];
  const [index, setIndex] = useState(0);
  const selected = carts[Math.min(index, carts.length - 1)];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowDown') setIndex((i) => Math.min(i + 1, carts.length - 1));
      else if (e.key === 'ArrowUp') setIndex((i) => Math.max(i - 1, 0));
      else if (e.key === 'Enter' && selected) onResume(selected);
      else if (e.key === 'Delete' && selected) db.heldCarts.delete(selected.id!);
      else return;
      e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-popover">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 text-neutral-900">
          <div className="flex items-center gap-2">
            <IconCart className="h-5 w-5" />
            <p className="text-sm font-semibold">{t('hold.title')}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700">
            <IconX className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-3">
          {carts.length === 0 && <p className="px-2 py-8 text-center text-sm text-neutral-500">{t('hold.empty')}</p>}
          <ul className="flex flex-col gap-2">
            {carts.map((c, i) => {
              const total = c.lines.reduce((s, l) => s + l.lineTotalCents, 0);
              const count = c.lines.reduce((s, l) => s + l.quantity, 0);
              const time = new Date(c.heldAt).toLocaleTimeString(locale === 'ar' ? 'ar-DZ' : 'fr-DZ', { hour: '2-digit', minute: '2-digit' });
              return (
                <li
                  key={c.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${i === Math.min(index, carts.length - 1) ? 'border-brand-500 bg-brand-50/40' : 'border-neutral-200'}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">{c.lines.map((l) => l.name.fr).join(', ')}</p>
                    <p className="text-xs text-neutral-500">
                      {t('hold.items', { n: count })} · {t('hold.heldAt', { time })}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900">{formatCurrency(total, locale)}</span>
                  <button
                    onClick={() => onResume(c)}
                    className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
                  >
                    {t('hold.resume')}
                  </button>
                  <button
                    onClick={() => db.heldCarts.delete(c.id!)}
                    className="shrink-0 rounded-md p-1 text-neutral-300 transition hover:bg-red-50 hover:text-red-600"
                    aria-label={t('hold.discard')}
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
