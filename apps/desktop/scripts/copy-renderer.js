// Copie l'export statique Next.js (apps/web/out, généré par `npm run build:web:export`
// à la racine) dans apps/desktop/renderer, d'où le processus principal Electron le sert
// (voir serveRenderer() dans main.ts).
const fs = require('node:fs');
const path = require('node:path');

const src = path.join(__dirname, '../../web/out');
const dest = path.join(__dirname, '../renderer');

if (!fs.existsSync(src)) {
  console.error(
    `[copy-renderer] ${src} introuvable. Lancez d'abord "npm run build:web:export" à la racine du monorepo.`,
  );
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`[copy-renderer] ${src} -> ${dest}`);
