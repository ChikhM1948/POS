'use client';

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'pos-device-id';

/**
 * Un deviceId stable par poste de caisse — persisté en localStorage (jamais régénéré), car il
 * nomme la base Dexie (voir offline-db.ts) et sert de traçabilité côté SyncQueue serveur.
 */
export function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    try {
      let existing = localStorage.getItem(STORAGE_KEY);
      if (!existing) {
        existing = uuidv4();
        localStorage.setItem(STORAGE_KEY, existing);
      }
      setDeviceId(existing);
    } catch {
      setDeviceId(uuidv4()); // stockage indisponible (navigation privée) — dégrade sans bloquer
    }
  }, []);

  return deviceId;
}
