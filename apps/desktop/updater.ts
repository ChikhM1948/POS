import { app, dialog, type BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { autoUpdater } from 'electron-updater';
import { DEFAULT_API_URL, DEFAULT_UPDATE_URL } from './server/license';

/**
 * Mises à jour poussées depuis le serveur : le poste interroge `<serveur>/updates/latest.yml` (publié par
 * `npm run publish:update`), télécharge l'installeur en arrière-plan, puis propose de redémarrer.
 * Jamais de redémarrage forcé : une vente en cours ne doit pas être interrompue. Sinon l'installation
 * se fait à la fermeture normale de l'application.
 * Limite d'electron-updater : seule la version INSTALLÉE (NSIS) se met à jour ; la version portable non.
 */

const CHECK_INTERVAL_MS = 4 * 60 * 60_000;

export interface Updater {
  /** Vérification manuelle (menu) : retourne un message à afficher à l'utilisateur. */
  checkNow(): Promise<string>;
}

export function setupAutoUpdate(opts: {
  dataDir: string;
  getWindow: () => BrowserWindow | null;
  /** Adresse du serveur configurée par l'utilisateur (synchronisation cloud), prioritaire sur celle figée au build. */
  getServerUrl: () => string | undefined;
}): Updater | null {
  const log = (msg: string) => {
    try {
      fs.appendFileSync(path.join(opts.dataDir, 'updater.log'), `[${new Date().toISOString()}] ${msg}\n`);
    } catch {
      /* journal indisponible */
    }
  };

  const base = opts.getServerUrl() || DEFAULT_API_URL;
  // POS_UPDATE_URL (figé au build) prime : les mises à jour peuvent vivre sur un autre serveur que l'API.
  const feedUrl = DEFAULT_UPDATE_URL || (base ? `${base}/updates` : '');
  if (!app.isPackaged || process.env.PORTABLE_EXECUTABLE_FILE || !feedUrl) return null;

  autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl });
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = { info: (m: unknown) => log(String(m)), warn: (m: unknown) => log(`WARN ${m}`), error: (m: unknown) => log(`ERROR ${m}`), debug: () => undefined };

  autoUpdater.on('update-downloaded', async (info) => {
    const win = opts.getWindow();
    const options: Electron.MessageBoxOptions = {
      type: 'info',
      buttons: ['Redémarrer maintenant', 'Plus tard'],
      defaultId: 1,
      cancelId: 1,
      title: 'Mise à jour disponible',
      message: `La version ${info.version} de POS Algérie est prête.`,
      detail: "Redémarrez pour l'installer. Sinon elle sera installée à la prochaine fermeture de l'application.",
    };
    const { response } = win ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options);
    if (response === 0) autoUpdater.quitAndInstall();
  });
  autoUpdater.on('error', (err) => log(`ERROR ${err?.message ?? err}`));

  const check = () => autoUpdater.checkForUpdates().catch((err) => log(`check failed: ${err?.message ?? err}`));
  setTimeout(check, 15_000);
  setInterval(check, CHECK_INTERVAL_MS);

  return {
    async checkNow() {
      try {
        const res = await autoUpdater.checkForUpdates();
        if (res?.updateInfo && res.updateInfo.version !== app.getVersion()) return `Version ${res.updateInfo.version} en cours de téléchargement.`;
        return 'Vous utilisez déjà la dernière version.';
      } catch (err) {
        return `Vérification impossible : ${err instanceof Error ? err.message : err}`;
      }
    },
  };
}
