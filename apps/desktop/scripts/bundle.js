// Empaquette le processus principal Electron (main + serveur local Express/SQLite) en un seul
// fichier par entrée avec esbuild. Seuls les modules natifs / chargés dynamiquement restent
// externes et sont embarqués tels quels par electron-builder.
const esbuild = require('esbuild');
const path = require('node:path');
const fs = require('node:fs');

const dist = path.join(__dirname, '../dist');
fs.rmSync(dist, { recursive: true, force: true });

esbuild
  .build({
    entryPoints: [path.join(__dirname, '../main.ts'), path.join(__dirname, '../preload.ts')],
    outdir: dist,
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    external: ['electron', 'better-sqlite3', 'escpos', 'escpos-usb'],
    // Clé publique de licence + URL du serveur figées dans l'exécutable (voir scripts/license-keygen.js).
    define: Object.fromEntries(
      ['POS_LICENSE_PUBLIC_KEY', 'POS_API_URL', 'POS_UPDATE_URL'].filter((k) => process.env[k]).map((k) => [`process.env.${k}`, JSON.stringify(process.env[k])]),
    ),
    logLevel: 'info',
  })
  .catch(() => process.exit(1));
