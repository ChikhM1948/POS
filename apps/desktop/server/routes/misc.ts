import { Router } from 'express';
import bcrypt from 'bcryptjs';
import type { CreateUserInput, StoreDTO, TenantSettingsDTO, UpdateTenantSettingsInput, UpdateUserInput, UserDTO } from '@pos-dz/shared';
import { Ctx, HttpError, bool, handler, newId, nowIso, requireRole } from '../util';
import { PERMISSION_VIEW_PURCHASE_PRICE } from '../constants';

export function storesRouter({ db }: Ctx) {
  const router = Router();
  router.get('/', handler((req, res) => {
    const rows = db.prepare('SELECT * FROM stores WHERE tenant_id = ? AND active = 1 ORDER BY name').all(req.auth!.tenantId) as any[];
    const stores: StoreDTO[] = rows.map((s) => ({
      id: s.id, name: s.name, code: s.code, address: s.address ?? undefined, isMainStore: Boolean(s.is_main_store), active: Boolean(s.active),
    }));
    res.json({ stores });
  }));
  return router;
}

function tenantDTO(t: any): TenantSettingsDTO {
  const branding = JSON.parse(t.branding);
  const legal = JSON.parse(t.legal);
  return {
    name: t.name,
    slug: t.slug,
    branding: {
      logoUrl: branding.logoUrl,
      primaryColor: branding.primaryColor ?? '#0f172a',
      secondaryColor: branding.secondaryColor ?? '#38bdf8',
    },
    phone: legal.phone,
    syncEnabled: Boolean(t.sync_enabled),
  };
}

export function tenantRouter({ db }: Ctx) {
  const router = Router();
  router.get('/', handler((req, res) => {
    const t = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.auth!.tenantId);
    if (!t) throw new HttpError(404, 'Commerce introuvable.');
    res.json({ tenant: tenantDTO(t) });
  }));
  router.patch('/', requireRole('store_admin', 'super_admin'), handler((req, res) => {
    const input = (req.body ?? {}) as UpdateTenantSettingsInput;
    const t: any = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.auth!.tenantId);
    if (!t) throw new HttpError(404, 'Commerce introuvable.');
    const branding = JSON.parse(t.branding);
    const legal = JSON.parse(t.legal);
    if (input.phone !== undefined) legal.phone = input.phone.trim();
    for (const k of ['logoUrl', 'primaryColor', 'secondaryColor'] as const) {
      if (input.branding?.[k] !== undefined) branding[k] = input.branding[k];
    }
    db.prepare('UPDATE tenants SET name = ?, branding = ?, legal = ?, sync_enabled = ?, updated_at = ? WHERE id = ?').run(
      input.name !== undefined ? input.name.trim() : t.name, JSON.stringify(branding), JSON.stringify(legal),
      input.syncEnabled !== undefined ? bool(input.syncEnabled) : t.sync_enabled, nowIso(), t.id,
    );
    res.json({ tenant: tenantDTO(db.prepare('SELECT * FROM tenants WHERE id = ?').get(t.id)) });
  }));
  return router;
}

function userDTO(u: any): UserDTO {
  return {
    id: u.id, name: u.name, email: u.email, role: u.role, storeId: u.store_id ?? undefined, active: Boolean(u.active),
    hasPinCode: Boolean(u.pin_code_hash),
    canViewPurchasePrice: (JSON.parse(u.permissions) as string[]).includes(PERMISSION_VIEW_PURCHASE_PRICE),
  };
}

export function usersRouter({ db }: Ctx) {
  const router = Router();
  router.use(requireRole('store_admin', 'super_admin'));
  const get = (id: string) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);

  router.get('/', handler((req, res) => {
    const rows = db.prepare("SELECT * FROM users WHERE tenant_id = ? AND role IN ('cashier','stock_manager') ORDER BY created_at DESC").all(req.auth!.tenantId);
    res.json({ users: rows.map(userDTO) });
  }));

  router.post('/', handler(async (req, res) => {
    const { name, email, password, role, storeId, pinCode, canViewPurchasePrice } = (req.body ?? {}) as Partial<CreateUserInput>;
    if (!name || !email || !password || !role) throw new HttpError(400, 'name, email, password et role sont requis.');
    if (!['cashier', 'stock_manager'].includes(role)) {
      throw new HttpError(400, 'Rôle invalide — seuls caissier et gestionnaire de stock peuvent être créés ici.');
    }
    if (String(password).length < 6) throw new HttpError(400, 'Le mot de passe doit contenir au moins 6 caractères.');
    if (role === 'cashier' && !pinCode) {
      throw new HttpError(400, 'Un code PIN est requis pour un compte caissier (utilisé pour se connecter à la caisse).');
    }
    const tenantId = req.auth!.tenantId;
    const normalizedEmail = String(email).trim().toLowerCase();
    if (db.prepare('SELECT 1 FROM users WHERE tenant_id = ? AND email = ?').get(tenantId, normalizedEmail)) {
      throw new HttpError(409, 'Un utilisateur avec cet email existe déjà.');
    }
    const main = db.prepare('SELECT id FROM stores WHERE tenant_id = ? AND is_main_store = 1').get(tenantId) as any;
    const id = newId();
    const now = nowIso();
    db.prepare(`INSERT INTO users (id, tenant_id, store_id, name, email, password_hash, pin_code_hash, role, permissions, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, tenantId, storeId ?? main?.id ?? null, name.trim(), normalizedEmail,
      await bcrypt.hash(password, 10), pinCode ? await bcrypt.hash(pinCode, 10) : null, role,
      JSON.stringify(canViewPurchasePrice ? [PERMISSION_VIEW_PURCHASE_PRICE] : []), now, now);
    res.status(201).json({ user: userDTO(get(id)) });
  }));

  router.patch('/:id', handler(async (req, res) => {
    const input = (req.body ?? {}) as UpdateUserInput;
    const u: any = db.prepare('SELECT * FROM users WHERE tenant_id = ? AND id = ?').get(req.auth!.tenantId, req.params.id);
    if (!u) throw new HttpError(404, 'Utilisateur introuvable.');
    db.prepare('UPDATE users SET name=?, store_id=?, active=?, password_hash=?, pin_code_hash=?, permissions=?, updated_at=? WHERE id=?').run(
      input.name !== undefined ? input.name.trim() : u.name,
      input.storeId !== undefined ? input.storeId : u.store_id,
      input.active !== undefined ? bool(input.active) : u.active,
      input.password ? await bcrypt.hash(input.password, 10) : u.password_hash,
      input.pinCode ? await bcrypt.hash(input.pinCode, 10) : u.pin_code_hash,
      input.canViewPurchasePrice !== undefined ? JSON.stringify(input.canViewPurchasePrice ? [PERMISSION_VIEW_PURCHASE_PRICE] : []) : u.permissions,
      nowIso(), u.id,
    );
    res.json({ user: userDTO(get(u.id)) });
  }));

  router.delete('/:id', handler((req, res) => {
    if (req.params.id === req.auth!.sub) throw new HttpError(400, 'Impossible de désactiver son propre compte.');
    const r = db.prepare('UPDATE users SET active = 0, updated_at = ? WHERE tenant_id = ? AND id = ?').run(nowIso(), req.auth!.tenantId, req.params.id);
    if (!r.changes) throw new HttpError(404, 'Utilisateur introuvable.');
    res.status(204).send();
  }));
  return router;
}
