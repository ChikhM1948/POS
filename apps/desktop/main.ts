import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
// `escpos` + `escpos-usb` gèrent la découverte/écriture sur le port USB de l'imprimante.
// Alternative Windows/partagée réseau : passer par le spouleur (node-thermal-printer, driver "raw").
import escpos from 'escpos';
import EscposUSB from 'escpos-usb';

let mainWindow: BrowserWindow | null = null;
let baseUrl = '';

/**
 * Port fixe (plutôt que 0/aléatoire) : l'origine `http://127.0.0.1:RENDERER_PORT` doit être stable
 * d'un lancement à l'autre pour figurer telle quelle dans `CORS_ORIGIN` côté API (voir
 * apps/api/src/config/env.ts). Un port aléatoire casserait CORS à chaque redémarrage de l'app.
 */
const RENDERER_PORT = 47623;

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * Le export statique Next.js émet des chemins d'assets absolus (`/_next/...`) qui ne résolvent
 * pas sous le protocole `file://`. On sert donc le dossier exporté via un petit serveur HTTP
 * local plutôt que de charger `index.html` directement.
 */
function serveRenderer(rootDir: string): Promise<number> {
  const server = http.createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let filePath = path.join(rootDir, requestPath);
    if (filePath.endsWith(path.sep)) filePath = path.join(filePath, 'index.html');

    fs.readFile(filePath, (err, data) => {
      if (!err) {
        res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream' });
        res.end(data);
        return;
      }
      // Next export : les routes sans extension correspondent à `<route>.html`.
      fs.readFile(`${filePath}.html`, (err2, data2) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
        res.end(data2);
      });
    });
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(RENDERER_PORT, '127.0.0.1', () => {
      const address = server.address();
      resolve(typeof address === 'object' && address ? address.port : 0);
    });
  });
}

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
        { role: 'quit' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // En prod, on sert l'app Next.js exportée statiquement (packagée dans dist/../renderer) ;
  // en dev on pointe vers le serveur `next dev`.
  baseUrl = process.env.NEXT_DEV_URL ?? '';
  if (!baseUrl) {
    const rendererDir = path.join(__dirname, '../renderer');
    const port = await serveRenderer(rendererDir);
    baseUrl = `http://127.0.0.1:${port}`;
  }
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
    void createWindow();
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
  const device = new EscposUSB();
  const printer = new escpos.Printer(device);
  return new Promise<void>((resolve, reject) => {
    device.open((err: Error | null) => {
      if (err) return reject(err);
      printer.cashdraw(2).close(() => resolve());
    });
  });
});
