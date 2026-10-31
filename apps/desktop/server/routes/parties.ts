import { Router } from 'express';
import type { CreateCustomerInput, CreateLedgerPaymentInput, CustomerDTO, LedgerEntryDTO, SupplierDTO, SupplierInput, UpdateCustomerInput } from '@pos-dz/shared';
import { Ctx, HttpError, bool, handler, newId, nowIso, requireRole } from '../util';

function ledgerDTO(e: any): LedgerEntryDTO {
  return {
    id: e.id,
    type: e.type,
    amountCents: e.amount_cents,
    note: e.note ?? undefined,
    reference: e.ref_id ? { type: e.ref_type, id: e.ref_id } : undefined,
    createdAtLocal: e.created_at_local,
  };
}

const balanceSql = `(SELECT COALESCE(SUM(amount_cents),0) FROM ledger_entries l WHERE l.tenant_id = t.tenant_id AND l.party_kind = ? AND l.party_id = t.id)`;

export function customersRouter({ db }: Ctx) {
  const router = Router();
  const admins = requireRole('store_admin', 'super_admin');
  const dto = (r: any): CustomerDTO => ({ id: r.id, name: r.name, phone: r.phone ?? undefined, active: Boolean(r.active), balanceCents: r.balance });
  const one = (id: string) => db.prepare(`SELECT t.*, ${balanceSql} AS balance FROM customers t WHERE t.id = ?`).get('customer', id);

  router.get('/', handler((req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    let rows = db.prepare(`SELECT t.*, ${balanceSql} AS balance FROM customers t WHERE t.tenant_id = ? AND t.active = 1 ORDER BY t.name COLLATE NOCASE`)
      .all('customer', req.auth!.tenantId) as any[];
    if (search) rows = rows.filter((r) => r.name.toLowerCase().includes(search) || (r.phone ?? '').toLowerCase().includes(search));
    res.json({ customers: rows.map(dto) });
  }));

  router.post('/', admins, handler((req, res) => {
    const input = req.body as CreateCustomerInput;
    if (!input?.name?.trim()) throw new HttpError(400, 'Le nom du client est requis.');
    const id = newId();
    const now = nowIso();
    db.prepare('INSERT INTO customers (id, tenant_id, name, phone, created_at, updated_at) VALUES (?,?,?,?,?,?)')
      .run(id, req.auth!.tenantId, input.name.trim(), input.phone?.trim() || null, now, now);
    res.status(201).json({ customer: dto(one(id)) });
  }));

  router.patch('/:id', admins, handler((req, res) => {
    const input = (req.body ?? {}) as UpdateCustomerInput;
    const c: any = db.prepare('SELECT * FROM customers WHERE tenant_id = ? AND id = ?').get(req.auth!.tenantId, req.params.id);
    if (!c) throw new HttpError(404, 'Client introuvable.');
    db.prepare('UPDATE customers SET name=?, phone=?, active=?, updated_at=? WHERE id=?').run(
      input.name ?? c.name, input.phone !== undefined ? input.phone || null : c.phone, input.active !== undefined ? bool(input.active) : c.active, nowIso(), c.id);
    res.json({ customer: dto(one(c.id)) });
  }));

  router.get('/:id/ledger', admins, handler((req, res) => {
    const rows = db.prepare(`SELECT * FROM ledger_entries WHERE tenant_id = ? AND party_kind = 'customer' AND party_id = ? ORDER BY created_at_local DESC LIMIT 200`)
      .all(req.auth!.tenantId, req.params.id);
    res.json({ entries: rows.map(ledgerDTO) });
  }));

  router.post('/:id/payments', admins, handler((req, res) => {
    res.status(201).json({ entry: recordPayment(db, req.auth!.tenantId, 'customer', req.params.id, req.body) });
  }));
  return router;
}

function recordPayment(db: Ctx['db'], tenantId: string, kind: 'customer' | 'supplier', partyId: string, input: CreateLedgerPaymentInput) {
  if (typeof input?.amountCents !== 'number' || input.amountCents <= 0) throw new HttpError(400, 'amountCents doit être un montant positif.');
  const id = newId();
  const now = nowIso();
  db.prepare(`INSERT INTO ledger_entries (id, tenant_id, party_kind, party_id, type, amount_cents, note, client_generated_id, created_at_local, created_at)
    VALUES (?,?,?,?,'payment',?,?,?,?,?)`).run(id, tenantId, kind, partyId, -Math.abs(input.amountCents), input.note ?? null, newId(), now, now);
  return ledgerDTO(db.prepare('SELECT * FROM ledger_entries WHERE id = ?').get(id));
}

export function suppliersRouter({ db }: Ctx) {
  const router = Router();
  router.use(requireRole('store_admin', 'stock_manager', 'super_admin'));
  const dto = (r: any): SupplierDTO => ({
    id: r.id, name: r.name, phone: r.phone ?? undefined, address: r.address ?? undefined, active: Boolean(r.active), balanceCents: r.balance,
  });
  const one = (id: string) => db.prepare(`SELECT t.*, ${balanceSql} AS balance FROM suppliers t WHERE t.id = ?`).get('supplier', id);

  router.get('/', handler((req, res) => {
    const rows = db.prepare(`SELECT t.*, ${balanceSql} AS balance FROM suppliers t WHERE t.tenant_id = ? ORDER BY t.name COLLATE NOCASE`)
      .all('supplier', req.auth!.tenantId);
    res.json({ suppliers: rows.map(dto) });
  }));

  router.post('/', handler((req, res) => {
    const input = req.body as SupplierInput;
    if (!input?.name?.trim()) throw new HttpError(400, 'Le nom du fournisseur est requis.');
    const id = newId();
    const now = nowIso();
    db.prepare('INSERT INTO suppliers (id, tenant_id, name, phone, address, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
      .run(id, req.auth!.tenantId, input.name.trim(), input.phone?.trim() || null, input.address?.trim() || null, now, now);
    res.status(201).json({ supplier: dto(one(id)) });
  }));

  router.patch('/:id', handler((req, res) => {
    const input = (req.body ?? {}) as Partial<SupplierInput>;
    const s: any = db.prepare('SELECT * FROM suppliers WHERE tenant_id = ? AND id = ?').get(req.auth!.tenantId, req.params.id);
    if (!s) throw new HttpError(404, 'Fournisseur introuvable.');
    db.prepare('UPDATE suppliers SET name=?, phone=?, address=?, active=?, updated_at=? WHERE id=?').run(
      input.name ?? s.name, input.phone !== undefined ? input.phone || null : s.phone, input.address !== undefined ? input.address || null : s.address,
      input.active !== undefined ? bool(input.active) : s.active, nowIso(), s.id);
    res.json({ supplier: dto(one(s.id)) });
  }));

  router.get('/:id/ledger', handler((req, res) => {
    const rows = db.prepare(`SELECT * FROM ledger_entries WHERE tenant_id = ? AND party_kind = 'supplier' AND party_id = ? ORDER BY created_at_local DESC LIMIT 200`)
      .all(req.auth!.tenantId, req.params.id);
    res.json({ entries: rows.map(ledgerDTO) });
  }));

  router.post('/:id/payments', handler((req, res) => {
    res.status(201).json({ entry: recordPayment(db, req.auth!.tenantId, 'supplier', req.params.id, req.body) });
  }));
  return router;
}
