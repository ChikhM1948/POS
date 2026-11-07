'use client';

import { useEffect } from 'react';
import { LOCAL_MODE } from '../lib/localMode';

/** Enregistre le service worker (web uniquement — l'app bureau charge déjà ses fichiers en local). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (LOCAL_MODE || process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((e) => console.error('Service worker :', e));
  }, []);
  return null;
}
