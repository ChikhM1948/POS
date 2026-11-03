import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
// `escpos` + `escpos-usb` gèrent la découverte/écriture sur le port USB de l'imprimante.
// Alternative Windows/partagée réseau : passer par le spouleur (node-thermal-printer, driver "raw").
import { startLocalServer } from './server';
import { setupAutoUpdate, type Updater } from './updater';

/**
 * Chargés à la demande : si le module USB natif est indisponible, l'application démarre quand
 * même (seule l'impression thermique échoue, avec un message clair).
 */
function loadPrinterLibs(): { escpos: any; EscposUSB: any } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return { escpos: require('escpos'), EscposUSB: require('escpos-usb') };
  } catch (err) {
    throw new Error(`Imprimante USB indisponible : ${err instanceof Error ? err.message : err}`);
  }
}

let mainWindow: BrowserWindow | null = null;
let baseUrl = '';
let localServer: { close: () => Promise<void>; db: import('./server/db').Db } | null = null;
let updater: Updater | null = null;

/**
 * Port fixe : l'origine `http://127.0.0.1:RENDERER_PORT` doit rester identique d'un lancement à
 * l'autre, car le localStorage / IndexedDB du renderer (session, cache hors-ligne Dexie) y sont
 * rattachés. Le même serveur local expose aussi l'API (`/api`) — aucun accès Internet requis.
 */
const RENDERER_PORT = 47623;

/**
 * Dossier de données. Version portable : à côté de l'exécutable (`PORTABLE_EXECUTABLE_DIR`, défini
 * par electron-builder) pour que la base SQLite suive l'application (clé USB, copie de dossier) ;
 * repli sur le dossier utilisateur si l'emplacement n'est pas inscriptible.
 */
function resolveDataDir(): string {
  const candidates = [
    process.env.PORTABLE_EXECUTABLE_DIR && path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'POS-Data'),
    path.join(app.getPath('appData'), 'POS Algerie'),
  ].filter((p): p is string => Boolean(p));
  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      return dir;
    } catch {
      /* essaie l'emplacement suivant */
    }
  }
  throw new Error("Aucun dossier de données inscriptible.");
}

// Doit être fixé avant `ready` : le profil Chromium (localStorage, IndexedDB) rejoint les données.
const dataDir = resolveDataDir();
app.setPath('userData', path.join(dataDir, 'electron'));

/**
 * Menu "Navigation" — la caisse (route `/`) et le back-office admin (route `/admin`) sont deux
 * écrans distincts de la même app Next.js (voir components/admin/AdminLoginForm.tsx) ; la fenêtre
 * Electron n'ayant pas de barre d'adresse, ce menu (+ raccourcis) est le seul moyen d'y naviguer.
 */
function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Navigation',
      submenu: [
        {
          label: 'Caisse',
          accelerator: 'CmdOrCtrl+1',
          click: () => mainWindow?.loadURL(baseUrl),
        },
        {
          label: 'Back-office (Admin)',
          accelerator: 'CmdOrCtrl+2',
          click: () => mainWindow?.loadURL(`${baseUrl}/admin`),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: 'Rechercher une mise à jour',
          click: async () => {
            const message = updater ? await updater.checkNow() : "Les mises à jour automatiques ne sont disponibles que dans la version installée (pas la version portable).";
            const opts: Electron.MessageBoxOptions = { type: 'info', message, buttons: ['OK'] };
            if (mainWindow) await dialog.showMessageBox(mainWindow, opts); else await dialog.showMessageBox(opts);
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/** Relance l'application (après une restauration). En version portable, relance l'exécutable d'origine. */
async function restartApp() {
  await localServer?.close().catch(() => undefined);
  localServer = null;
  const portableExe = process.env.PORTABLE_EXECUTABLE_FILE;
  app.relaunch(portableExe ? { execPath: portableExe } : undefined);
  app.exit(0);
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../pos.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Le renderer ne doit jamais naviguer hors de l'app ni ouvrir de fenêtre : liens externes -> navigateur système.
  const isInternal = (url: string) => url.startsWith(`http://127.0.0.1:${RENDERER_PORT}`) || url.startsWith(`http://localhost:${RENDERER_PORT}`) || (!!process.env.NEXT_DEV_URL && url.startsWith(process.env.NEXT_DEV_URL));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!isInternal(url)) {
      e.preventDefault();
      if (/^https:\/\//.test(url)) void shell.openExternal(url);
    }
  });

  // En prod, on sert l'app Next.js exportée statiquement (packagée dans dist/../renderer) ;
  // en dev on pointe vers le serveur `next dev`.
  const devUrl = process.env.NEXT_DEV_URL ?? '';
  // Binaire natif SQLite : hors de l'asar en production (voir extraResources dans package.json).
  const nativeBinding = app.isPackaged ? path.join(process.resourcesPath, 'native', 'better_sqlite3.node') : process.env.POS_NATIVE_BINDING;
  localServer = await startLocalServer({
    dataDir: path.join(dataDir, 'db'),
    rendererDir: devUrl ? undefined : path.join(__dirname, '../renderer'),
    port: RENDERER_PORT,
    nativeBinding: nativeBinding && fs.existsSync(nativeBinding) ? nativeBinding : undefined,
    devOrigin: devUrl || undefined,
    onRestartRequired: restartApp,
  });
  baseUrl = devUrl || `http://127.0.0.1:${RENDERER_PORT}`;
  updater = setupAutoUpdate({
    dataDir,
    getWindow: () => mainWindow,
    getServerUrl: () => (localServer?.db.prepare("SELECT value FROM app_meta WHERE key = 'cloud_url'").get() as { value: string } | undefined)?.value,
  });
  buildMenu();
  mainWindow.loadURL(baseUrl);
}

// Un seul poste de caisse par machine : une deuxième instance se disputerait le port fixe du
// serveur local et l'imprimante USB avec la première plutôt que d'ouvrir une fenêtre utile.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow().catch((err) => {
      try {
        fs.appendFileSync(path.join(dataDir, 'startup-error.log'), `[${new Date().toISOString()}] ${err instanceof Error ? err.stack : err}\n`);
      } catch {
        /* journal indisponible */
      }
      dialog.showErrorBox('POS Algérie', `Démarrage impossible : ${err instanceof Error ? err.message : err}`);
      app.quit();
    });
  });

  app.on('will-quit', () => {
    void localServer?.close();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

/**
 * Reçoit un job ESC/POS déjà construit (voir apps/web/lib/print/escpos-raster.ts) et l'envoie
 * tel quel au périphérique USB — aucune interprétation côté Electron, le rendu est déjà figé
 * côté renderer pour garantir que ce qui est prévisualisé == ce qui est imprimé.
 */
ipcMain.handle('print:thermal', async (_event, jobBytes: Uint8Array) => {
  const { escpos, EscposUSB } = loadPrinterLibs();
  const device = new EscposUSB(); // sélectionne la première imprimante USB détectée
  const printer = new escpos.Printer(device);

  return new Promise<void>((resolve, reject) => {
    device.open((err: Error | null) => {
      if (err) return reject(err);
      printer.raw(Buffer.from(jobBytes)).close(() => resolve());
    });
  });
});

/** Ouverture du tiroir-caisse — commande ESC/POS standard "pulse" (ESC p 0 25 250). */
ipcMain.handle('cashdrawer:open', async () => {
  const { escpos, EscposUSB } = loadPrinterLibs();
  const device = new EscposUSB();
  const printer = new escpos.Printer(device);
  return new Promise<void>((resolve, reject) => {
    device.open((err: Error | null) => {
      if (err) return reject(err);
      printer.cashdraw(2).close(() => resolve());
    });
  });
});

/** Sélecteurs natifs pour les sauvegardes (dossier de destination / fichier à restaurer). */
ipcMain.handle('backup:pickFolder', async () => {
  const opts: Electron.OpenDialogOptions = { properties: ['openDirectory', 'createDirectory'] };
  const res = mainWindow ? await dialog.showOpenDialog(mainWindow, opts) : await dialog.showOpenDialog(opts);
  return res.canceled ? null : res.filePaths[0];
});

ipcMain.handle('backup:pickFile', async () => {
  const opts: Electron.OpenDialogOptions = { properties: ['openFile'], filters: [{ name: 'Sauvegarde POS', extensions: ['sqlite'] }] };
  const res = mainWindow ? await dialog.showOpenDialog(mainWindow, opts) : await dialog.showOpenDialog(opts);
  return res.canceled ? null : res.filePaths[0];
});
