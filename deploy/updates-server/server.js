// Serveur de mises à jour autonome (sans MongoDB) pour un hébergement perso (CasaOS + tunnel Cloudflare).
// Sert /updates/latest.yml + installeurs ; PUT /updates/files/:name (en-tête x-admin-key) pour publier.
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const { timingSafeEqual } = require('node:crypto');

const dir = path.resolve(process.env.UPDATES_DIR || '/data');
const adminKey = Buffer.from(process.env.LICENSE_ADMIN_KEY || '');
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._ -]*$/;
fs.mkdirSync(dir, { recursive: true });

const app = express();
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.put('/updates/files/:name', async (req, res) => {
  const given = Buffer.from(String(req.headers['x-admin-key'] || ''));
  if (!adminKey.length || given.length !== adminKey.length || !timingSafeEqual(given, adminKey)) return res.status(403).json({ error: 'Accès refusé.' });
  const name = req.params.name;
  if (!SAFE_NAME.test(name) || name.includes('..')) return res.status(400).json({ error: 'Nom de fichier invalide.' });
  const tmp = path.join(dir, `.${name}.part`); // jamais d'installeur à moitié reçu côté poste
  try {
    await pipeline(req, fs.createWriteStream(tmp));
    fs.renameSync(tmp, path.join(dir, name));
    res.status(201).json({ published: name });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.use('/updates', express.static(dir, {
  index: false,
  dotfiles: 'deny',
  setHeaders: (res, file) => { if (file.endsWith('.yml')) res.setHeader('Cache-Control', 'no-store'); },
}));

app.listen(Number(process.env.PORT || 4100), () => console.log(`[updates] ${dir} sur :${process.env.PORT || 4100}`));
