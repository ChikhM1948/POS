'use client';

import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useTranslation } from '../../lib/i18n/LanguageContext';
import { IconWifiOff } from '../icons';

interface Props {
  /** Tenant.syncEnabled === false : mode local voulu, à distinguer d'une vraie coupure réseau (voir ci-dessous). */
  localMode?: boolean;
}

export function OfflineBanner({ localMode = false }: Props) {
  const isOnline = useOnlineStatus();
  const { t } = useTranslation();

  // Mode local : bandeau neutre permanent (voulu, pas un problème) — prime sur le statut réseau
  // réel puisque le SyncEngine ne tourne de toute façon jamais dans ce mode (voir app/page.tsx).
  if (localMode) {
    return (
      <div className="flex w-full items-center justify-center gap-2 bg-neutral-200 py-2 text-center text-sm font-medium text-neutral-700">
        {t('offlineBanner.localModeText')}
      </div>
    );
  }

  if (isOnline) return null;

  return (
    <div className="flex w-full items-center justify-center gap-2 bg-amber-400 py-2 text-center text-sm font-medium text-amber-950">
      <IconWifiOff className="h-4 w-4 shrink-0" />
      {t('offlineBanner.text')}
    </div>
  );
}
