/**
 * `fetch` des appels vers le cloud / serveur de licences. Dans Electron on utilise `net.fetch` (pile réseau Chromium) :
 * il fait confiance aux certificats racine de Windows et suit le proxy système, contrairement au `fetch` de Node
 * qui n'a que sa propre liste — d'où des erreurs de certificat derrière un antivirus / proxy qui inspecte HTTPS.
 * Repli sur le `fetch` global hors Electron (tests, dev).
 */
export const netFetch: typeof fetch = (input, init) => {
  try {
    const { net, app } = require('electron') as typeof import('electron');
    if (net?.fetch && app?.isReady()) return net.fetch(input as string, init as any) as unknown as Promise<Response>;
  } catch {
    /* pas dans Electron */
  }
  return fetch(input, init);
};
