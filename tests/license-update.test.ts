import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { resolveDataDir } from '../apps/desktop/data-dir';
import { openDatabase } from '../apps/desktop/server/db';

const { licenseBuildConfig } = require('../apps/desktop/scripts/license-build-config');

function fixture(t: TestContext) {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'pos-license-update-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, appData: path.join(root, 'AppData') };
}

test('portable déplacé, Setup et nouvelles versions réutilisent le même dossier', (t) => {
  const { root, appData } = fixture(t);
  const first = resolveDataDir(appData, path.join(root, 'Downloads', 'v1'));
  assert.equal(first, path.join(appData, 'POS Algerie'));
  assert.equal(resolveDataDir(appData, path.join(root, 'Downloads', 'v2')), first);
  assert.equal(resolveDataDir(appData), first);
});

test('une ancienne base portable reste activée après passage à Setup', async (t) => {
  const { root, appData } = fixture(t);
  const portable = path.join(root, 'old-portable');
  const legacyDir = path.join(portable, 'POS-Data');
  const file = path.join(legacyDir, 'db', 'pos-data.sqlite');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const keys = generateKeyPairSync('ed25519');
  const previousKey = process.env.POS_LICENSE_PUBLIC_KEY;
  process.env.POS_LICENSE_PUBLIC_KEY = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  t.after(() => {
    if (previousKey === undefined) delete process.env.POS_LICENSE_PUBLIC_KEY;
    else process.env.POS_LICENSE_PUBLIC_KEY = previousKey;
  });
  const { LicenseManager } = await import('../apps/desktop/server/license');
  const id = randomUUID();
  const payload = { key: 'POS-TEST-UPDATE', kind: 'lifetime', activatedAt: new Date().toISOString(), expiresAt: '2099-01-01T00:00:00.000Z' };
  const license = { ...payload, signature: sign(null, Buffer.from(JSON.stringify(payload)), keys.privateKey).toString('base64') };
  const old = openDatabase(file);
  const set = old.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?)');
  set.run('device_id', id);
  set.run('license', JSON.stringify(license));
  set.run('jwt_secret', 'existing-session-secret');
  old.close();
  fs.mkdirSync(path.join(legacyDir, 'electron'), { recursive: true });
  fs.writeFileSync(path.join(legacyDir, 'electron', 'profile-marker'), 'existing-profile');

  assert.equal(resolveDataDir(appData, portable), legacyDir);
  const installedDir = resolveDataDir(appData);
  assert.equal(installedDir, legacyDir);
  assert.equal(resolveDataDir(appData, path.join(root, 'new-version')), legacyDir);
  const reopened = openDatabase(path.join(installedDir, 'db', 'pos-data.sqlite'));
  t.after(() => reopened.close());
  const manager = new LicenseManager(reopened, () => undefined);
  assert.equal(manager.deviceId(), id);
  assert.equal(manager.status().activated, true);
  assert.equal(manager.status().expired, false);
  assert.deepEqual(manager.current(), license);
  assert.deepEqual(reopened.prepare("SELECT value FROM app_meta WHERE key = 'jwt_secret'").get(), { value: 'existing-session-secret' });
  assert.equal(fs.readFileSync(path.join(installedDir, 'electron', 'profile-marker'), 'utf8'), 'existing-profile');
});

test('un ancien portable absent ne provoque pas la création silencieuse d’un nouveau poste', (t) => {
  const { root, appData } = fixture(t);
  const portable = path.join(root, 'portable');
  const dbDir = path.join(portable, 'POS-Data', 'db');
  fs.mkdirSync(dbDir, { recursive: true });
  fs.writeFileSync(path.join(dbDir, 'pos-data.sqlite'), 'existing-data');
  resolveDataDir(appData, portable);
  fs.renameSync(portable, `${portable}-disconnected`);
  assert.throws(() => resolveDataDir(appData), /données du poste sont introuvables/);
  assert.equal(fs.existsSync(path.join(appData, 'POS Algerie', 'db')), false);
});

test('une base installée existante reste prioritaire pour un nouveau portable', (t) => {
  const { root, appData } = fixture(t);
  const stable = resolveDataDir(appData);
  const dbDir = path.join(stable, 'db');
  fs.mkdirSync(dbDir);
  fs.writeFileSync(path.join(dbDir, 'pos-data.sqlite'), 'existing-data');
  assert.equal(resolveDataDir(appData, path.join(root, 'portable')), stable);
});

test('un emplacement mémorisé invalide ne réinitialise pas le poste', (t) => {
  const { appData } = fixture(t);
  const stable = resolveDataDir(appData);
  fs.writeFileSync(path.join(stable, 'data-location.json'), JSON.stringify('../relative'));
  assert.throws(() => resolveDataDir(appData), /Emplacement des données invalide/);
});

test('le build reprend la clé publique enregistrée sans embarquer les secrets', (t) => {
  const { root } = fixture(t);
  const file = path.join(root, 'licensing.env');
  const { publicKey } = generateKeyPairSync('ed25519');
  const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  fs.writeFileSync(file, `POS_LICENSE_PUBLIC_KEY=${pem.replace(/\n/g, '\\n')}\nLICENSE_PRIVATE_KEY=private-test-secret\nLICENSE_ADMIN_KEY=admin-test-secret\nPOS_API_URL=https://example.test`);
  const config = licenseBuildConfig(file, {}, true);
  assert.equal(JSON.parse(config['process.env.POS_LICENSE_PUBLIC_KEY']).replace(/\\n/g, '\n'), pem);
  assert.equal(JSON.parse(config['process.env.POS_API_URL']), 'https://example.test');
  assert.equal(JSON.stringify(config).includes('test-secret'), false);
  assert.equal(Object.keys(config).length, 3);
  assert.equal(JSON.parse(licenseBuildConfig(file, { POS_API_URL: 'https://override.test' }, true)['process.env.POS_API_URL']), 'https://override.test');
});

test('une production sans clé publique valide est refusée', (t) => {
  const { root } = fixture(t);
  const missing = path.join(root, 'missing.env');
  assert.throws(() => licenseBuildConfig(missing, {}, true), /Ed25519 requise/);
  assert.throws(() => licenseBuildConfig(missing, { POS_LICENSE_PUBLIC_KEY: 'invalid' }, true), /Ed25519 requise/);
  assert.deepEqual(licenseBuildConfig(missing, {}, false), {});
});
