import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { resolve } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { createApp } from '../apps/api/src/app';
import { User } from '../apps/api/src/models/User';
import { Tenant } from '../apps/api/src/models/Tenant';
import { Store } from '../apps/api/src/models/Store';
import { openDatabase } from '../apps/desktop/server/db';
import { createApi } from '../apps/desktop/server';
import { CloudSync } from '../apps/desktop/server/cloud';
import type { Ctx } from '../apps/desktop/server/util';

async function listen(app: express.Express, t: TestContext) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  t.after(() => new Promise<void>((resolve, reject) => {
    server.closeAllConnections();
    server.close((error) => error ? reject(error) : resolve());
  }));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return `http://127.0.0.1:${address.port}`;
}

async function accountContract(base: string, tenantId: string, userId: string) {
  const call = async (path: string, method = 'GET', body?: unknown, token?: string) => {
    const response = await fetch(`${base}${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  const login = (email: string, password = 'initial-password', cashier = false) => call(cashier ? '/auth/login-cashier' : '/auth/login', 'POST', { tenantId, email, password });
  assert.equal((await call('/auth/account')).status, 401);
  const initial = await login('cashier@example.test');
  assert.equal(initial.status, 200);
  let token = initial.body.token;
  const account = await call('/auth/account', 'GET', undefined, token);
  assert.equal(account.body.account.id, userId);
  assert.equal(account.body.account.passwordHash, undefined);
  const patch = (body: unknown) => call('/auth/account', 'PATCH', body, token);
  assert.equal((await patch({ currentPassword: 'wrong', phone: '0555 12 34 56' })).status, 400);
  assert.equal((await patch({ currentPassword: 'initial-password', phone: 'not-a-phone' })).status, 400);
  assert.equal((await patch({ currentPassword: 'initial-password', newPassword: 'short' })).status, 400);
  assert.equal((await patch({ currentPassword: 'initial-password', newPassword: 'é'.repeat(40) })).status, 400);
  const added = await patch({ currentPassword: 'initial-password', phone: '0555 12 34 56', id: 'someone-else', role: 'super_admin' });
  assert.equal(added.status, 200);
  assert.equal(added.body.account.phone, '0555123456');
  assert.equal(added.body.account.id, userId);
  assert.equal((await call('/auth/account', 'GET', undefined, token)).status, 401);
  token = added.body.token;
  assert.equal((await call('/auth/account', 'GET', undefined, token)).status, 200);
  for (const cashier of [false, true]) {
    const loggedIn = await login('0555-12-34-56', 'initial-password', cashier);
    assert.equal(loggedIn.status, 200);
    assert.equal(loggedIn.body.user.id, userId);
    assert.equal(loggedIn.body.user.role, 'cashier');
  }
  // Conflits avec un numéro secondaire et avec un ancien compte créé directement par numéro.
  assert.equal((await patch({ currentPassword: 'initial-password', phone: '0777123456' })).status, 409);
  assert.equal((await patch({ currentPassword: 'initial-password', phone: '0666123456' })).status, 409);
  const changed = await patch({ currentPassword: 'initial-password', newPassword: 'new-password' });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.account.phone, '0555123456');
  assert.equal((await call('/auth/account', 'GET', undefined, token)).status, 401);
  token = changed.body.token;
  assert.equal((await call('/auth/account', 'GET', undefined, token)).status, 200);
  assert.equal((await login('cashier@example.test')).status, 401);
  assert.equal((await login('0555123456', 'initial-password', true)).status, 401);
  assert.equal((await login('cashier@example.test', 'new-password')).status, 200);
  assert.equal((await login('0555123456', 'new-password', true)).status, 200);
  const removed = await patch({ currentPassword: 'new-password', phone: '' });
  assert.equal(removed.status, 200);
  assert.equal(removed.body.account.phone, undefined);
  assert.equal((await login('0555123456', 'new-password')).status, 401);
  assert.equal((await login('cashier@example.test', 'new-password')).status, 200);
}

test('API cloud : paramètres personnels, téléphone, mot de passe et révocation', { timeout: 30000 }, async (t) => {
  const mongod = await MongoMemoryServer.create({ binary: { systemBinary: resolve('node_modules/.cache/mongodb-memory-server/mongod-x64-debian-8.2.6') } });
  t.after(async () => { await mongoose.disconnect(); await mongod.stop(); });
  await mongoose.connect(mongod.getUri('account-settings-tests'));
  await User.init();
  const tenant = await Tenant.create({ name: 'Test', slug: 'account-test' });
  const otherTenant = await Tenant.create({ name: 'Other', slug: 'other-test' });
  const store = await Store.create({ tenantId: tenant._id, name: 'Main', code: 'MAIN' });
  const passwordHash = await bcrypt.hash('initial-password', 4);
  const user = await User.create({ tenantId: tenant._id, storeId: store._id, name: 'Cashier', email: 'cashier@example.test', passwordHash, role: 'cashier' });
  await User.create({ tenantId: otherTenant._id, name: 'Other', email: 'other@example.test', phone: '0777123456', passwordHash, role: 'cashier' });
  await User.create({ tenantId: tenant._id, name: 'Legacy', email: '0666123456', passwordHash, role: 'cashier' });
  const base = await listen(createApp({ updates: false }), t);
  await accountContract(base, String(tenant._id), String(user._id));

  await t.test('un changement sur le poste se réplique même sans jeton cloud valide', async (t) => {
    const admin = await User.create({ tenantId: tenant._id, storeId: store._id, name: 'Admin', email: 'admin@example.test', passwordHash, role: 'store_admin' });
    const db = openDatabase(':memory:');
    t.after(() => db.close());
    const now = new Date().toISOString();
    db.prepare('INSERT INTO tenants (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(String(tenant._id), 'Test', 'account-test', now, now);
    db.prepare('INSERT INTO stores (id, tenant_id, name, code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(String(store._id), String(tenant._id), 'Main', 'MAIN', now, now);
    db.prepare("INSERT INTO users (id, tenant_id, name, email, password_hash, role, created_at, updated_at) VALUES (?, ?, 'Admin', 'admin@example.test', ?, 'store_admin', ?, ?)").run(String(admin._id), String(tenant._id), passwordHash, now, now);
    for (const [key, value] of Object.entries({ cloud_url: base, cloud_email: 'admin@example.test', cloud_password: 'initial-password' })) {
      db.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?)').run(key, value);
    }
    const local = express();
    local.use(createApi({ db, jwtSecret: 'test-secret', license: { status: () => ({ expired: false }) } } as unknown as Ctx));
    const localBase = await listen(local, t);
    const credentials = { tenantId: String(tenant._id), email: 'admin@example.test', password: 'initial-password' };
    const oldCloudSession = await (await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) })).json();
    const localSession = await (await fetch(`${localBase}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) })).json();
    const changed = await fetch(`${localBase}/auth/account`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localSession.token}` },
      body: JSON.stringify({ currentPassword: 'initial-password', newPassword: 'updated-local-password', phone: '0555000000' }),
    });
    assert.equal(changed.status, 200);
    assert.ok(db.prepare("SELECT 1 FROM app_meta WHERE key = 'cloud_previous_password'").get());
    const cloud = new CloudSync(db);
    const status = await cloud.syncNow();
    assert.equal(status.lastError, undefined);
    assert.equal(db.prepare("SELECT 1 FROM app_meta WHERE key = 'cloud_previous_password'").get(), undefined);
    assert.equal((await fetch(`${base}/auth/account`, { headers: { Authorization: `Bearer ${oldCloudSession.token}` } })).status, 401);
    const loginPhone = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: '0555 00 00 00', password: 'updated-local-password' }) });
    assert.equal(loginPhone.status, 200);
    assert.equal((await loginPhone.json()).user.id, String(admin._id));
  });
});

test('Poste bureau : migration additive et mêmes règles de compte que le cloud', { timeout: 30000 }, async (t) => {
  const directory = mkdtempSync(`${tmpdir()}/pos-account-test-`);
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const filename = `${directory}/test.sqlite`;
  const Database = createRequire(resolve('apps/desktop/package.json'))('better-sqlite3');
  const legacy = new Database(filename);
  legacy.exec("CREATE TABLE users (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, store_id TEXT, name TEXT NOT NULL, email TEXT NOT NULL, password_hash TEXT NOT NULL, pin_code_hash TEXT, role TEXT NOT NULL, permissions TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(tenant_id, email))");
  legacy.prepare("INSERT INTO users (id, tenant_id, name, email, password_hash, role, created_at, updated_at) VALUES ('pre-migration', 'tenant', 'Old', 'old@example.test', 'preserved-hash', 'cashier', 'now', 'now')").run();
  legacy.close();
  const db = openDatabase(filename);
  t.after(() => db.close());
  const hash = await bcrypt.hash('initial-password', 4);
  db.prepare("INSERT INTO tenants (id, name, slug, created_at, updated_at) VALUES ('tenant', 'Test', 'test', 'now', 'now')").run();
  db.prepare("INSERT INTO stores (id, tenant_id, name, code, is_main_store, created_at, updated_at) VALUES ('store', 'tenant', 'Main', 'MAIN', 1, 'now', 'now')").run();
  const insert = db.prepare("INSERT INTO users (id, tenant_id, name, email, phone, password_hash, role, created_at, updated_at) VALUES (?, 'tenant', 'Test', ?, ?, ?, 'cashier', 'now', 'now')");
  insert.run('cashier', 'cashier@example.test', null, hash);
  insert.run('other', 'other@example.test', '0777123456', hash);
  insert.run('legacy', '0666123456', null, hash);
  // Rejouer la migration préserve les comptes existants et leurs identifiants.
  const reopened = openDatabase(filename);
  assert.equal((reopened.prepare('SELECT count(*) n FROM users').get() as { n: number }).n, 4);
  assert.deepEqual(reopened.prepare("SELECT password_hash, phone, token_version FROM users WHERE id = 'pre-migration'").get(), { password_hash: 'preserved-hash', phone: null, token_version: 0 });
  reopened.close();
  const ctx = { db, jwtSecret: 'account-test-secret', license: { status: () => ({ expired: false }) } } as unknown as Ctx;
  const app = express();
  app.use(createApi(ctx));
  const base = await listen(app, t);
  await accountContract(base, 'tenant', 'cashier');
});
