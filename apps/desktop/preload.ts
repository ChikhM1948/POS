import { contextBridge, ipcRenderer } from 'electron';

/**
 * Surface exposée au renderer Next.js sous `window.posBridge` — voir la déclaration de type
 * dans apps/web/components/pos/SaleCheckout.tsx. contextIsolation reste actif : le renderer
 * n'a jamais d'accès direct à Node/Electron, seulement à ces méthodes explicitement whitelistées.
 */
contextBridge.exposeInMainWorld('posBridge', {
  printThermal: (job: Uint8Array) => ipcRenderer.invoke('print:thermal', job),
  openCashDrawer: () => ipcRenderer.invoke('cashdrawer:open'),
});
