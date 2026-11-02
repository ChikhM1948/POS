import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { normalizeIdentifier, parseIdentifier } from '../identifier';
import type { AuthResult, JwtClaims, SignupInput } from '@pos-dz/shared';
import { Ctx, HttpError, handler, newId, nowIso } from '../util';
import { PERMISSION_VIEW_PURCHASE_PRICE } from '../constants';

function slugify(input: string): string {
  return (
    input.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) ||
    'commerce'
  );
}

export function authRouter({ db, jwtSecret, license }: Ctx) {
  const router = Router();
  // Poste installé : la session n'expire jamais (révocation = désactivation du compte, vérifiée à chaque requête).
  const sign = (claims: JwtClaims) => jwt.sign(claims, jwtSecret);
  const canView = (permissions: string) => (JSON.parse(permissions) as string[]).includes(PERMISSION_VIEW_PURCHASE_PRICE);

  function session(user: any) {
    const canViewPurchasePrice = canView(user.permissions);
    const claims: JwtClaims = {
      sub: user.id,
      tenantId: user.tenant_id,
      storeId: user.store_id ?? undefined,
      role: user.role,
      canViewPurchasePrice,
    };
    return { token: sign(claims), tenantId: user.tenant_id, license: license.status(), user: { id: user.id, name: user.name, role: user.role, canViewPurchasePrice } };
  }

  /** Poste local : un seul commerce par installation — permet à l'UI de se pré-configurer sans saisie d'identifiants techniques. */
  router.get('/local-info', handler((_req, res) => {
    const tenant = db.prepare('SELECT id, name FROM tenants LIMIT 1').get() as { id: string; name: string } | undefined;
    if (!tenant) return res.json({ configured: false });
    const store = db.prepare('SELECT id FROM stores WHERE tenant_id = ? AND is_main_store = 1 AND active = 1').get(tenant.id) as { id: string } | undefined;
    res.json({ configured: true, tenantId: tenant.id, storeId: store?.id, businessName: tenant.name });
  }));

  router.post('/setup', handler(async (req, res) => {
    const { businessName, adminName, email, password, phone, activationKey } = (req.body ?? {}) as Partial<SignupInput>;
    if (!email || !password) throw new HttpError(400, 'email (ou téléphone) et password sont requis.');
    const identifier = parseIdentifier(email);
    if (!identifier) throw new HttpError(400, 'Saisissez une adresse email ou un numéro de téléphone valide.');
    if (String(password).length < 6) throw new HttpError(400, 'Le mot de passe doit contenir au moins 6 caractères.');
    if (db.prepare('SELECT 1 FROM tenants LIMIT 1').get()) {
      throw new HttpError(409, 'Un commerce est déjà enregistré sur ce poste. Connectez-vous.');
    }

    // Première activation : échange de la clé contre la licence signée (Internet requis, une seule fois).
    const licenseStatus = await license.activate(activationKey ?? '');
    const passwordHash = await bcrypt.hash(password, 10);
    const now = nowIso();
    const tenantId = newId();
    const storeId = newId();
    const userId = newId();
    // `email` désigne l'identifiant de connexion : email OU téléphone (normalisé).
    const loginId = identifier.value;
    const phoneValue = phone?.trim() || (identifier.kind === 'phone' ? loginId : undefined);
    const localPart = (identifier.kind === 'email' ? loginId.split('@')[0] : '') || 'commerce';
    const bizName = businessName?.trim() || localPart;
    const name = adminName?.trim() || localPart;
    db.transaction(() => {
      db.prepare('INSERT INTO tenants (id, name, slug, legal, sync_enabled, created_at, updated_at) VALUES (?,?,?,?,0,?,?)').run(
        tenantId, bizName, slugify(bizName), JSON.stringify(phoneValue ? { phone: phoneValue } : {}), now, now,
      );
      db.prepare('INSERT INTO stores (id, tenant_id, name, code, is_main_store, created_at, updated_at) VALUES (?,?,?,?,1,?,?)').run(
        storeId, tenantId, 'Boutique principale', 'MAIN', now, now,
      );
      db.prepare('INSERT INTO users (id, tenant_id, store_id, name, email, password_hash, role, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run(
        userId, tenantId, storeId, name, loginId, passwordHash, 'store_admin', now, now,
      );
    })();

    const result: AuthResult = {
      token: sign({ sub: userId, tenantId, storeId, role: 'store_admin' }),
      tenantId,
      storeId,
      user: { id: userId, name, role: 'store_admin' },
      license: licenseStatus,
    };
    res.status(201).json(result);
  }));

  async function passwordLogin(req: any, res: any, cashierOnly: boolean) {
    const { tenantId, email, password } = req.body ?? {};
    if (!email || !password) throw new HttpError(400, 'email et password sont requis.');
    // Poste local : un seul commerce, donc tenantId facultatif.
    const tid = tenantId ?? (db.prepare('SELECT id FROM tenants LIMIT 1').get() as { id: string } | undefined)?.id;
    if (!tid) throw new HttpError(401, 'Identifiants invalides.');
    const user: any = db
      .prepare(`SELECT * FROM users WHERE tenant_id = ? AND email = ? AND active = 1 ${cashierOnly ? "AND role = 'cashier'" : ''}`)
      .get(tid, normalizeIdentifier(email));
    if (!user || !(await bcrypt.compare(password, user.password_hash))) throw new HttpError(401, 'Identifiants invalides.');
    res.json(session(user));
  }
  router.post('/login', handler((req, res) => passwordLogin(req, res, false)));
  router.post('/login-cashier', handler((req, res) => passwordLogin(req, res, true)));

  router.post('/login-pin', handler(async (req, res) => {
    const { tenantId, storeId, pinCode } = req.body ?? {};
    if (!tenantId || !storeId || !pinCode) throw new HttpError(400, 'tenantId, storeId et pinCode sont requis.');
    const candidates = db
      .prepare("SELECT * FROM users WHERE tenant_id = ? AND store_id = ? AND role = 'cashier' AND active = 1 AND pin_code_hash IS NOT NULL")
      .all(tenantId, storeId) as any[];
    for (const user of candidates) {
      if (await bcrypt.compare(String(pinCode), user.pin_code_hash)) return res.json(session(user));
    }
    throw new HttpError(401, 'PIN invalide.');
  }));

  return router;
}
