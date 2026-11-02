import { Router } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import {
  DEFAULT_DOCUMENT_VALIDITY_DAYS,
  DOCUMENT_CONVERSIONS,
  DOCUMENT_KINDS,
  DocumentError,
  SALE_DERIVED_KINDS,
  assertDocumentKind,
  assertPaymentMethod,
  canonicalDocumentContent,
  cleanDocumentParty,
  cleanDocumentText,
  computeDocumentTotals,
  documentLineFromSaleLine,
  documentStampDuty,
  documentYear,
  formatDocumentNumber,
  parseDocumentDate,
  validateDocumentLines,
} from '@pos-dz/shared';
import type {
  BusinessDocumentDTO,
  CancelDocumentInput,
  ConvertDocumentInput,
  CreateDocumentFromSaleInput,
  CreateDocumentInput,
  DocumentKind,
  DocumentLine,
  DocumentListItemDTO,
  DocumentParty,
  PaymentMethod,
  SaleLine,
  SalePayment,
} from '@pos-dz/shared';
import { Ctx, HttpError, handler, newId, nowIso } from '../util';
import type { Db } from '../db';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Les erreurs métier partagées avec l'API cloud deviennent des HttpError, que `handler` sait déjà relayer. */
const wrap = (fn: Parameters<typeof handler>[0]) =>
  handler(async (req, res) => {
    try {
      return await fn(req, res);
    } catch (err) {
      if (err instanceof DocumentError) throw new HttpError(err.status, err.message);
      throw err;
    }
  });

function toDTO(r: any): BusinessDocumentDTO {
  return {
    id: r.id,
    kind: r.kind,
    number: r.number,
    year: r.year,
    sequence: r.sequence,
    status: r.status,
    issueDate: r.issue_date,
    validUntil: r.valid_until ?? undefined,
    currency: 'DZD',
    seller: JSON.parse(r.seller),
    buyer: JSON.parse(r.buyer),
    storeId: r.store_id ?? undefined,
    lines: JSON.parse(r.lines),
    totals: JSON.parse(r.totals),
    paymentMethod: r.payment_method ?? undefined,
    payments: r.payments ? JSON.parse(r.payments) : undefined,
    notes: r.notes ?? undefined,
    saleId: r.sale_id ?? undefined,
    saleNumber: r.sale_number ?? undefined,
    sourceDocumentId: r.source_document_id ?? undefined,
    sourceDocumentNumber: r.source_document_number ?? undefined,
    cancelledAt: r.cancelled_at ?? undefined,
    cancelReason: r.cancel_reason ?? undefined,
    createdBy: r.created_by ?? undefined,
    integrity: { hash: r.hash, previousHash: r.previous_hash ?? undefined },
    einvoice: JSON.parse(r.einvoice),
  };
}

function sellerSnapshot(db: Db, tenantId: string): DocumentParty {
  const t: any = db.prepare('SELECT name, legal FROM tenants WHERE id = ?').get(tenantId);
  if (!t) throw new DocumentError(404, 'Commerce introuvable.');
  const legal = JSON.parse(t.legal);
  return {
    name: t.name,
    address: cleanDocumentText(legal.address),
    nif: cleanDocumentText(legal.nif),
    rc: cleanDocumentText(legal.rc),
    nis: cleanDocumentText(legal.nis),
    ai: cleanDocumentText(legal.ai),
  };
}

interface IssueInput {
  kind: DocumentKind;
  seller: DocumentParty;
  buyer: DocumentParty;
  lines: DocumentLine[];
  stampDutyCents: number;
  storeId?: string;
  paymentMethod?: PaymentMethod;
  payments?: SalePayment[];
  validUntil?: Date;
  notes?: string;
  saleId?: string;
  saleNumber?: string;
  sourceDocumentId?: string;
  sourceDocumentNumber?: string;
  createdBy: string;
}

/**
 * Point d'émission unique. Le numéro est attribué et le document inséré dans la MÊME transaction
 * SQLite : si l'insertion échoue, l'incrément du compteur est annulé avec elle — aucun trou possible.
 */
function issue(db: Db, tenantId: string, input: IssueInput): BusinessDocumentDTO {
  const run = db.transaction((): string => {
    const issueDate = new Date();
    const year = documentYear(issueDate);
    db.prepare('INSERT OR IGNORE INTO document_counters (tenant_id, kind, year, last_sequence) VALUES (?, ?, ?, 0)').run(tenantId, input.kind, year);
    db.prepare('UPDATE document_counters SET last_sequence = last_sequence + 1 WHERE tenant_id = ? AND kind = ? AND year = ?').run(tenantId, input.kind, year);
    const sequence = (db.prepare('SELECT last_sequence n FROM document_counters WHERE tenant_id = ? AND kind = ? AND year = ?').get(tenantId, input.kind, year) as { n: number }).n;

    const number = formatDocumentNumber(input.kind, year, sequence);
    const totals = computeDocumentTotals(input.lines, input.stampDutyCents);
    const einvoice = { status: 'not_submitted' as const, uuid: randomUUID() };
    const validUntil =
      input.validUntil ?? (input.kind === 'quote' || input.kind === 'proforma' ? new Date(issueDate.getTime() + DEFAULT_DOCUMENT_VALIDITY_DAYS * DAY_MS) : undefined);

    const prev = sequence > 1
      ? (db.prepare('SELECT hash FROM business_documents WHERE tenant_id = ? AND kind = ? AND year = ? AND sequence = ?').get(tenantId, input.kind, year, sequence - 1) as { hash: string } | undefined)
      : undefined;
    const content = {
      kind: input.kind, number, issueDate: issueDate.toISOString(), seller: input.seller, buyer: input.buyer, lines: input.lines, totals,
      saleNumber: input.saleNumber, sourceDocumentNumber: input.sourceDocumentNumber, einvoice,
    };
    const hash = createHash('sha256').update(prev?.hash ?? '').update(canonicalDocumentContent(content)).digest('hex');

    const id = newId();
    db.prepare(`INSERT INTO business_documents (id, tenant_id, kind, number, year, sequence, status, issue_date, valid_until, seller, buyer, buyer_name,
      store_id, lines, totals, total_ttc_cents, payment_method, payments, notes, sale_id, sale_number, source_document_id, source_document_number,
      created_by, hash, previous_hash, einvoice, created_at) VALUES (?, ?, ?, ?, ?, ?, 'issued', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, tenantId, input.kind, number, year, sequence, issueDate.toISOString(), validUntil?.toISOString() ?? null,
      JSON.stringify(input.seller), JSON.stringify(input.buyer), input.buyer.name,
      input.storeId ?? null, JSON.stringify(input.lines), JSON.stringify(totals), totals.totalTtcCents,
      input.paymentMethod ?? null, input.payments ? JSON.stringify(input.payments) : null, input.notes ?? null,
      input.saleId ?? null, input.saleNumber ?? null, input.sourceDocumentId ?? null, input.sourceDocumentNumber ?? null,
      input.createdBy, hash, prev?.hash ?? null, JSON.stringify(einvoice), nowIso(),
    );
    return id;
  });
  const id = run();
  return toDTO(db.prepare('SELECT * FROM business_documents WHERE id = ?').get(id));
}

export function documentsRouter({ db }: Ctx) {
  const router = Router();

  router.get('/', wrap((req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const where = ['tenant_id = ?'];
    const args: unknown[] = [req.auth!.tenantId];
    if (q.kind && DOCUMENT_KINDS.includes(q.kind as DocumentKind)) { where.push('kind = ?'); args.push(q.kind); }
    if (q.status === 'issued' || q.status === 'cancelled') { where.push('status = ?'); args.push(q.status); }
    if (q.saleId) { where.push('sale_id = ?'); args.push(q.saleId); }
    if (q.from) { where.push('issue_date >= ?'); args.push(new Date(q.from).toISOString()); }
    if (q.to) { where.push('issue_date <= ?'); args.push(new Date(q.to).toISOString()); }
    if (q.search?.trim()) {
      const like = `%${q.search.trim().replace(/[\\%_]/g, '\\$&')}%`;
      where.push("(number LIKE ? ESCAPE '\\' OR buyer_name LIKE ? ESCAPE '\\' OR sale_number LIKE ? ESCAPE '\\')");
      args.push(like, like, like);
    }
    const page = Math.max(1, parseInt(q.page ?? '1', 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(q.limit ?? '50', 10) || 50));
    const w = where.join(' AND ');
    const total = (db.prepare(`SELECT COUNT(*) n FROM business_documents WHERE ${w}`).get(...args) as { n: number }).n;
    const rows = db.prepare(`SELECT * FROM business_documents WHERE ${w} ORDER BY issue_date DESC, sequence DESC LIMIT ? OFFSET ?`).all(...args, limit, (page - 1) * limit) as any[];
    const documents: DocumentListItemDTO[] = rows.map((r) => ({
      id: r.id, kind: r.kind, number: r.number, status: r.status, issueDate: r.issue_date, buyerName: r.buyer_name,
      totalTtcCents: r.total_ttc_cents, saleNumber: r.sale_number ?? undefined, sourceDocumentNumber: r.source_document_number ?? undefined,
    }));
    res.json({ documents, total });
  }));

  router.get('/:id', wrap((req, res) => {
    const r = db.prepare('SELECT * FROM business_documents WHERE tenant_id = ? AND id = ?').get(req.auth!.tenantId, req.params.id);
    if (!r) throw new HttpError(404, 'Document introuvable.');
    res.json({ document: toDTO(r) });
  }));

  router.post('/', wrap((req, res) => {
    const input = (req.body ?? {}) as CreateDocumentInput;
    const tenantId = req.auth!.tenantId;
    assertDocumentKind(input.kind);
    const lines = validateDocumentLines(input.lines);
    assertPaymentMethod(input.paymentMethod);
    const ttc = lines.reduce((s, l) => s + l.totalTtcCents, 0);
    const document = issue(db, tenantId, {
      kind: input.kind,
      seller: sellerSnapshot(db, tenantId),
      buyer: cleanDocumentParty(input.buyer),
      lines,
      stampDutyCents: documentStampDuty(input.kind, ttc, input.paymentMethod),
      storeId: input.storeId,
      paymentMethod: input.paymentMethod,
      validUntil: parseDocumentDate(input.validUntil, 'Date de validité'),
      notes: cleanDocumentText(input.notes),
      createdBy: req.auth!.sub,
    });
    res.status(201).json({ document });
  }));

  router.post('/from-sale', wrap((req, res) => {
    const input = (req.body ?? {}) as CreateDocumentFromSaleInput;
    const tenantId = req.auth!.tenantId;
    assertDocumentKind(input.kind);
    if (!SALE_DERIVED_KINDS.includes(input.kind)) throw new DocumentError(400, 'Ce type de document ne peut pas être tiré d’une vente.');

    const sale: any = db.prepare('SELECT * FROM sales WHERE tenant_id = ? AND id = ?').get(tenantId, input.saleId);
    if (!sale) throw new DocumentError(404, 'Vente introuvable.');
    if (sale.type !== 'sale') throw new DocumentError(400, 'Un retour ne peut pas donner lieu à ce document : utilisez la vente d’origine.');
    if (sale.status !== 'completed') throw new DocumentError(400, 'Cette vente a été annulée.');

    // Idempotent : un ticket = une seule facture (resp. BL, proforma) ; on renvoie l'existante sans consommer de numéro.
    const existing = db.prepare("SELECT * FROM business_documents WHERE tenant_id = ? AND sale_id = ? AND kind = ? AND status = 'issued'").get(tenantId, sale.id, input.kind);
    if (existing) return res.json({ document: toDTO(existing), created: false });

    const lines = (JSON.parse(sale.lines) as SaleLine[]).map((l) => documentLineFromSaleLine(l));
    const ttc = lines.reduce((s, l) => s + l.totalTtcCents, 0);
    const payments = JSON.parse(sale.payments) as SalePayment[];
    const saleStamp = (JSON.parse(sale.totals) as { stampDutyCents?: number }).stampDutyCents ?? 0;
    const document = issue(db, tenantId, {
      kind: input.kind,
      seller: sellerSnapshot(db, tenantId),
      buyer: cleanDocumentParty(input.buyer),
      lines,
      stampDutyCents: input.kind === 'invoice' ? saleStamp || documentStampDuty('invoice', ttc, undefined, payments) : 0,
      storeId: sale.store_id,
      payments,
      saleId: sale.id,
      saleNumber: sale.number,
      createdBy: req.auth!.sub,
    });
    res.status(201).json({ document, created: true });
  }));

  router.post('/:id/convert', wrap((req, res) => {
    const input = (req.body ?? {}) as ConvertDocumentInput;
    const tenantId = req.auth!.tenantId;
    assertDocumentKind(input.kind);
    assertPaymentMethod(input.paymentMethod);
    const src: any = db.prepare('SELECT * FROM business_documents WHERE tenant_id = ? AND id = ?').get(tenantId, req.params.id);
    if (!src) throw new DocumentError(404, 'Document introuvable.');
    if (src.status !== 'issued') throw new DocumentError(409, `Le document ${src.number} est annulé.`);
    if (!DOCUMENT_CONVERSIONS[src.kind as DocumentKind].includes(input.kind)) {
      throw new DocumentError(400, `Un document de ce type ne peut pas être transformé en ${input.kind}.`);
    }
    const already: any = db.prepare("SELECT number FROM business_documents WHERE tenant_id = ? AND source_document_id = ? AND kind = ? AND status = 'issued'").get(tenantId, src.id, input.kind);
    if (already) throw new DocumentError(409, `${src.number} a déjà donné lieu à ${already.number}.`);

    const lines = JSON.parse(src.lines) as DocumentLine[];
    const ttc = lines.reduce((s, l) => s + l.totalTtcCents, 0);
    const paymentMethod = (input.paymentMethod ?? src.payment_method ?? undefined) as PaymentMethod | undefined;
    const payments = src.payments ? (JSON.parse(src.payments) as SalePayment[]) : undefined;
    const document = issue(db, tenantId, {
      kind: input.kind,
      seller: sellerSnapshot(db, tenantId),
      buyer: JSON.parse(src.buyer),
      lines,
      stampDutyCents: documentStampDuty(input.kind, ttc, paymentMethod, payments),
      storeId: src.store_id ?? undefined,
      paymentMethod,
      payments,
      validUntil: parseDocumentDate(input.validUntil, 'Date de validité'),
      notes: src.notes ?? undefined,
      saleId: src.sale_id ?? undefined,
      saleNumber: src.sale_number ?? undefined,
      sourceDocumentId: src.id,
      sourceDocumentNumber: src.number,
      createdBy: req.auth!.sub,
    });
    res.status(201).json({ document });
  }));

  router.post('/:id/cancel', wrap((req, res) => {
    const reason = cleanDocumentText(((req.body ?? {}) as CancelDocumentInput).reason);
    if (!reason) throw new DocumentError(400, 'Un motif d’annulation est requis.');
    const tenantId = req.auth!.tenantId;
    const doc: any = db.prepare('SELECT * FROM business_documents WHERE tenant_id = ? AND id = ?').get(tenantId, req.params.id);
    if (!doc) throw new DocumentError(404, 'Document introuvable.');
    if (doc.status === 'cancelled') throw new DocumentError(409, 'Document déjà annulé.');
    const einvoiceStatus = JSON.parse(doc.einvoice).status;
    if (einvoiceStatus === 'submitted' || einvoiceStatus === 'accepted') {
      throw new DocumentError(409, 'Cette facture a été transmise à l’administration : elle ne peut plus être annulée.');
    }
    db.prepare("UPDATE business_documents SET status = 'cancelled', cancelled_at = ?, cancel_reason = ? WHERE tenant_id = ? AND id = ? AND status = 'issued'").run(nowIso(), reason, tenantId, doc.id);
    res.json({ document: toDTO(db.prepare('SELECT * FROM business_documents WHERE id = ?').get(doc.id)) });
  }));

  return router;
}
