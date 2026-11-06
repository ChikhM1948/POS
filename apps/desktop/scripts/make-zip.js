// Crée release/POS-Algerie-Setup.zip (nom fixe → lien de téléchargement permanent pour la landing page)
// contenant l'installeur Windows. Usage : npm run make:zip --workspace @pos-dz/desktop
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { path7za } = require('7zip-bin');

const release = path.join(__dirname, '../release');
const exe = `POS-Algerie-Setup-${require('../package.json').version}.exe`;
if (!fs.existsSync(path.join(release, exe))) {
  console.error(`${exe} introuvable — lancez d'abord \`npm run build:desktop:win\` à la racine.`);
  process.exit(1);
}
const zip = path.join(release, 'POS-Algerie-Setup.zip');
fs.rmSync(zip, { force: true });
execFileSync(path7za, ['a', '-tzip', '-mx=1', zip, exe], { cwd: release, stdio: 'inherit' });
console.log(`\n${zip} (${(fs.statSync(zip).size / 1048576).toFixed(1)} Mo)`);
