'use client';

import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { IconWifiOff } from '../icons';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="flex w-full items-center justify-center gap-2 bg-amber-400 py-2 text-center text-sm font-medium text-amber-950">
      <IconWifiOff className="h-4 w-4 shrink-0" />
      Mode hors-ligne — les ventes sont enregistrées localement et seront synchronisées
      automatiquement au retour de la connexion.
    </div>
  );
}
