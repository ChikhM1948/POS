// Publie la version construite (apps/desktop/release) sur le serveur : les postes installés la
// téléchargent d'eux-mêmes. Usage :
//   POS_API_URL=https://api.exemple.dz LICENSE_ADMIN_KEY=... npm run publish:update --workspace @pos-dz/desktop
// L'installeur est envoyé AVANT latest.yml : un poste ne voit jamais un manifeste sans son fichier.
const fs = require('node:fs');
const path = require('node:path');

// Flux de mises à jour : POS_UPDATE_URL (ex. https://updates.exemple.dz/updates) sinon <POS_API_URL>/updates.
const feed = (process.env.POS_UPDATE_URL || (process.env.POS_API_URL ? `${process.env.POS_API_URL}/updates` : '')).replace(/\/+$/, '');
const adminKey = process.env.LICENSE_ADMIN_KEY;
// POS_UPDATE_DIR : copie directe dans un dossier (partage SMB du CasaOS, volume monté…) — recommandé pour
// l'installeur, car Cloudflare limite les envois (PUT) à 100 Mo sur l'offre gratuite.
const localDir = process.env.POS_UPDATE_DIR;
if (!localDir && (!feed || !adminKey)) {
  console.error('Définissez POS_UPDATE_DIR (copie locale) ou POS_UPDATE_URL/POS_API_URL + LICENSE_ADMIN_KEY (envoi HTTP).');
  process.exit(1);
}

const release = path.join(__dirname, '../release');
const manifest = path.join(release, 'latest.yml');
if (!fs.existsSync(manifest)) {
  console.error('release/latest.yml introuvable — lancez d\'abord `npm run build` avec POS_API_URL défini.');
  process.exit(1);
}
// Seuls les fichiers référencés par le manifeste (installeur NSIS + blockmap) : pas la version portable.
const files = fs.readFileSync(manifest, 'utf8').match(/^\s*(?:-\s*)?(?:url|path):\s*(\S+)/gm)
  .map((l) => l.replace(/^\s*(?:-\s*)?(?:url|path):\s*/, '').trim());
const names = [...new Set(files)].flatMap((f) => [f, `${f}.blockmap`]).filter((f) => fs.existsSync(path.join(release, f)));

async function put(name) {
  const file = path.join(release, name);
  if (localDir) {
    fs.mkdirSync(localDir, { recursive: true });
    const tmp = path.join(localDir, `.${name}.part`);
    fs.copyFileSync(file, tmp);
    fs.renameSync(tmp, path.join(localDir, name));
    console.log(`-> ${name} copié`);
    return;
  }
  const size = fs.statSync(file).size;
  process.stdout.write(`-> ${name} (${(size / 1048576).toFixed(1)} Mo) … `);
  const res = await fetch(`${feed}/files/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/octet-stream', 'Content-Length': String(size) },
    body: fs.createReadStream(file),
    duplex: 'half',
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  console.log('ok');
}

(async () => {
  for (const name of [...names, 'latest.yml']) await put(name);
  console.log('Version publiée.');
})().catch((err) => {
  console.error(`\nÉchec : ${err.message}`);
  process.exit(1);
});
