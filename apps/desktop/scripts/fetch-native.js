// Télécharge le binaire natif de better-sqlite3 compilé pour l'ABI d'Electron (et non celui de
// Node) : un binaire pour le mauvais runtime fait planter l'application dès l'ouverture de la base.
// Usage : node scripts/fetch-native.js [win32-x64] [linux-x64]   (défaut : win32-x64)
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ELECTRON_ABI = '125'; // Electron 31 — voir "electronVersion" dans package.json
const version = require('better-sqlite3/package.json').version;
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['win32-x64'];

/**
 * Le binding USB Windows est une dépendance optionnelle propre à la plateforme : npm ne l'installe
 * pas depuis Linux/macOS. Sans lui, `require('escpos-usb')` échoue dans l'exe Windows.
 */
function ensureWindowsUsbBinding() {
  const root = path.join(path.dirname(require.resolve('usb/package.json')), '..', '@node-usb');
  const dir = path.join(root, 'usb-win32-x64-msvc');
  if (fs.existsSync(path.join(dir, 'usb.win32-x64-msvc.node'))) return;
  const usbVersion = require('usb/package.json').version;
  const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'usbpack-'));
  const out = execFileSync('npm', ['pack', `@node-usb/usb-win32-x64-msvc@${usbVersion}`, '--silent'], { cwd: tmp }).toString().trim();
  fs.mkdirSync(dir, { recursive: true });
  execFileSync('tar', ['-xzf', path.join(tmp, out), '-C', dir, '--strip-components=1']);
  fs.rmSync(tmp, { recursive: true, force: true });
}

(async () => {
  ensureWindowsUsbBinding();
  for (const target of targets) {
    const out = path.join(__dirname, '../native', target);
    const dest = path.join(out, 'better_sqlite3.node');
    if (fs.existsSync(dest)) continue;
    const url = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${version}/better-sqlite3-v${version}-electron-v${ELECTRON_ABI}-${target}.tar.gz`;
    console.log(`[fetch-native] ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Téléchargement impossible (${res.status}) : ${url}`);
    fs.mkdirSync(out, { recursive: true });
    const tgz = path.join(out, 'prebuild.tar.gz');
    fs.writeFileSync(tgz, Buffer.from(await res.arrayBuffer()));
    execFileSync('tar', ['-xzf', tgz, '-C', out, '--strip-components=2', 'build/Release/better_sqlite3.node']);
    fs.rmSync(tgz);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
