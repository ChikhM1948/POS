import { Types } from 'mongoose';
import { createHash, randomUUID } from 'node:crypto';
import { BusinessDocument } from '../../models/BusinessDocument';
import { DocumentCounter } from '../../models/DocumentCounter';
import { Sale } from '../../models/Sale';
import { Tenant } from '../../models/Tenant';
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
  parseDocumentDate,
  validateDocumentLines,
  documentYear,
  formatDocumentNumber,
} from '@pos-dz/shared';

export { DocumentError };
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
  SalePayment,
} from '@pos-dz/shared';

const oid = (id: string) => new Types.ObjectId(id);
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function toDTO(d: any): BusinessDocumentDTO {
  return {
    id: String(d._id),
    kind: d.kind,
    number: d.number,
    year: d.year,
    sequence: d.sequence,
    status: d.status,
    issueDate: d.issueDate.toISOString(),
    validUntil: d.validUntil?.toISOString(),
    currency: 'DZD',
    seller: d.seller,
    buyer: d.buyer,
    storeId: d.storeId ? String(d.storeId) : undefined,
    lines: d.lines,
    totals: d.totals,
    paymentMethod: d.paymentMethod,
    payments: d.payments?.length ? d.payments : undefined,
    notes: d.notes,
    saleId: d.saleId ? String(d.saleId) : undefined,
    saleNumber: d.saleNumber,
    sourceDocumentId: d.sourceDocumentId ? String(d.sourceDocumentId) : undefined,
    sourceDocumentNumber: d.sourceDocumentNumber,
    cancelledAt: d.cancelledAt?.toISOString(),
    cancelReason: d.cancelReason,
    createdBy: d.createdBy ? String(d.createdBy) : undefined,
    integrity: { hash: d.integrity.hash, previousHash: d.integrity.previousHash },
    einvoice: {
      status: d.einvoice.status,
      uuid: d.einvoice.uuid,
      externalReference: d.einvoice.externalReference,
      submittedAt: d.einvoice.submittedAt?.toISOString(),
      errorMessage: d.einvoice.errorMessage,
      qrPayload: d.einvoice.qrPayload,
    },
  };
}

async function sellerSnapshot(tenantId: string): Promise<DocumentParty> {
  const t = await Tenant.findById(tenantId).lean();
  if (!t) throw new DocumentError(404, 'Commerce introuvable.');
  return {
    name: t.name,
    address: cleanDocumentText(t.legal?.address),
    nif: cleanDocumentText(t.legal?.nif),
    rc: cleanDocumentText(t.legal?.rc),
    nis: cleanDocumentText(t.legal?.nis),
    ai: cleanDocumentText(t.legal?.ai),
  };
}

async function allocateSequence(tenantId: string, kind: DocumentKind, year: number): Promise<number> {
  const filter = { tenantId: oid(tenantId), kind, year };
  // Un upsert concurrent sur un compteur encore inexistant peut perdre la course sur l'index unique : on rejoue une fois.
  for (let attempt = 0; ; attempt++) {
    try {
      const c = await DocumentCounter.findOneAndUpdate(filter, { $inc: { lastSequence: 1 } }, { upsert: true, new: true });
      return c!.lastSequence;
    } catch (err: any) {
      if (err?.code !== 11000 || attempt > 0) throw err;
    }
  }
}

/** Rend le numéro si l'émission échoue après l'attribution — uniquement s'il est toujours le dernier, sinon on créerait un doublon. */
async function releaseSequence(tenantId: string, kind: DocumentKind, year: number, sequence: number) {
  await DocumentCounter.updateOne({ tenantId: oid(tenantId), kind, year, lastSequence: sequence }, { $inc: { lastSequence: -1 } }).catch(() => undefined);
}

async function previousHashOf(tenantId: string, kind: DocumentKind, year: number, sequence: number): Promise<string | undefined> {
  if (sequence <= 1) return undefined;
  // Le précédent peut être en cours d'insertion par une requête concurrente : on lui laisse un court délai.
  for (let i = 0; i < 5; i++) {
    const prev = await BusinessDocument.findOne({ tenantId: oid(tenantId), kind, year, sequence: sequence - 1 }).select('integrity.hash').lean();
    if (prev) return prev.integrity.hash;
    await new Promise((r) => setTimeout(r, 40));
  }
  return undefined;
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

/** Point d'émission unique : attribue le numéro, fige le contenu (hash chaîné) et persiste. */
async function issue(tenantId: string, input: IssueInput): Promise<BusinessDocumentDTO> {
  const issueDate = new Date();
  const year = documentYear(issueDate);
  const sequence = await allocateSequence(tenantId, input.kind, year);
  try {
    const number = formatDocumentNumber(input.kind, year, sequence);
    const totals = computeDocumentTotals(input.lines, input.stampDutyCents);
    const einvoice = { status: 'not_submitted' as const, uuid: randomUUID() };
    const validUntil =
      input.validUntil ?? (input.kind === 'quote' || input.kind === 'proforma' ? new Date(issueDate.getTime() + DEFAULT_DOCUMENT_VALIDITY_DAYS * 24 * 60 * 60 * 1000) : undefined);

    const content = {
      kind: input.kind,
      number,
      issueDate: issueDate.toISOString(),
      seller: input.seller,
      buyer: input.buyer,
      lines: input.lines,
      totals,
      saleNumber: input.saleNumber,
      sourceDocumentNumber: input.sourceDocumentNumber,
      einvoice,
    };
    const previousHash = await previousHashOf(tenantId, input.kind, year, sequence);
    const hash = createHash('sha256').update(previousHash ?? '').update(canonicalDocumentContent(content)).digest('hex');

    const doc = await BusinessDocument.create({
      tenantId: oid(tenantId),
      kind: input.kind,
      number,
      year,
      sequence,
      issueDate,
      validUntil,
      seller: input.seller,
      buyer: input.buyer,
      storeId: input.storeId ? oid(input.storeId) : undefined,
      lines: input.lines,
      totals,
      paymentMethod: input.paymentMethod,
      payments: input.payments,
      notes: input.notes,
      saleId: input.saleId ? oid(input.saleId) : undefined,
      saleNumber: input.saleNumber,
      sourceDocumentId: input.sourceDocumentId ? oid(input.sourceDocumentId) : undefined,
      sourceDocumentNumber: input.sourceDocumentNumber,
      createdBy: oid(input.createdBy),
      integrity: { hash, previousHash },
      einvoice,
    });
    return toDTO(doc.toObject());
  } catch (err) {
    await releaseSequence(tenantId, input.kind, year, sequence);
    throw err;
  }
}

export async function createDocument(tenantId: string, userId: string, input: CreateDocumentInput): Promise<BusinessDocumentDTO> {
  assertDocumentKind(input?.kind);
  const lines = validateDocumentLines(input.lines);
  assertPaymentMethod(input.paymentMethod);
  const ttc = lines.reduce((s, l) => s + l.totalTtcCents, 0);
  return issue(tenantId, {
    kind: input.kind,
    seller: await sellerSnapshot(tenantId),
    buyer: cleanDocumentParty(input.buyer),
    lines,
    stampDutyCents: documentStampDuty(input.kind, ttc, input.paymentMethod),
    storeId: input.storeId,
    paymentMethod: input.paymentMethod,
    validUntil: parseDocumentDate(input.validUntil, 'Date de validité'),
    notes: cleanDocumentText(input.notes),
    createdBy: userId,
  });
}

/**
 * Document tiré d'un ticket de caisse. Idempotent : redemander le même type pour la même vente
 * renvoie le document déjà émis (un ticket = une seule facture), au lieu de consommer un numéro.
 */
export async function createDocumentFromSale(
  tenantId: string,
  userId: string,
  input: CreateDocumentFromSaleInput,
): Promise<{ document: BusinessDocumentDTO; created: boolean }> {
  assertDocumentKind(input?.kind);
  if (!SALE_DERIVED_KINDS.includes(input.kind)) throw new DocumentError(400, 'Ce type de document ne peut pas être tiré d’une vente.');
  if (!Types.ObjectId.isValid(input.saleId)) throw new DocumentError(400, 'Vente invalide.');

  const sale = await Sale.findOne({ tenantId: oid(tenantId), _id: input.saleId }).lean();
  if (!sale) throw new DocumentError(404, 'Vente introuvable.');
  if (sale.type !== 'sale') throw new DocumentError(400, 'Un retour ne peut pas donner lieu à ce document : utilisez la vente d’origine.');
  if (sale.status !== 'completed') throw new DocumentError(400, 'Cette vente a été annulée.');

  const existing = await BusinessDocument.findOne({ tenantId: oid(tenantId), saleId: sale._id, kind: input.kind, status: 'issued' }).lean();
  if (existing) return { document: toDTO(existing), created: false };

  const lines = sale.lines.map((l) => documentLineFromSaleLine(l as any));
  const ttc = lines.reduce((s, l) => s + l.totalTtcCents, 0);
  const payments = sale.payments.map((p: any) => ({ method: p.method, amountCents: p.amountCents, customerId: p.customerId ? String(p.customerId) : undefined, reference: p.reference }));
  const stampDutyCents = input.kind === 'invoice' ? sale.totals.stampDutyCents || documentStampDuty('invoice', ttc, undefined, payments) : 0;

  const document = await issue(tenantId, {
    kind: input.kind,
    seller: await sellerSnapshot(tenantId),
    buyer: cleanDocumentParty(input.buyer),
    lines,
    stampDutyCents,
    storeId: String(sale.storeId),
    payments,
    saleId: String(sale._id),
    saleNumber: sale.number,
    createdBy: userId,
  });
  return { document, created: true };
}

export async function convertDocument(tenantId: string, userId: string, id: string, input: ConvertDocumentInput): Promise<BusinessDocumentDTO> {
  assertDocumentKind(input?.kind);
  if (!Types.ObjectId.isValid(id)) throw new DocumentError(404, 'Document introuvable.');
  const source = await BusinessDocument.findOne({ tenantId: oid(tenantId), _id: id }).lean();
  if (!source) throw new DocumentError(404, 'Document introuvable.');
  if (source.status !== 'issued') throw new DocumentError(409, `Le document ${source.number} est annulé.`);
  if (!DOCUMENT_CONVERSIONS[source.kind].includes(input.kind)) {
    throw new DocumentError(400, `Un document de ce type ne peut pas être transformé en ${input.kind}.`);
  }
  assertPaymentMethod(input.paymentMethod);

  const already = await BusinessDocument.findOne({ tenantId: oid(tenantId), sourceDocumentId: source._id, kind: input.kind, status: 'issued' }).select('number').lean();
  if (already) throw new DocumentError(409, `${source.number} a déjà donné lieu à ${already.number}.`);

  const lines = source.lines as unknown as DocumentLine[];
  const ttc = lines.reduce((s, l) => s + l.totalTtcCents, 0);
  const paymentMethod = input.paymentMethod ?? source.paymentMethod;
  const payments = source.payments?.length ? (source.payments as unknown as SalePayment[]) : undefined;

  return issue(tenantId, {
    kind: input.kind,
    seller: await sellerSnapshot(tenantId),
    buyer: source.buyer as DocumentParty,
    lines,
    stampDutyCents: documentStampDuty(input.kind, ttc, paymentMethod, payments),
    storeId: source.storeId ? String(source.storeId) : undefined,
    paymentMethod,
    payments,
    validUntil: parseDocumentDate(input.validUntil, 'Date de validité'),
    notes: source.notes,
    saleId: source.saleId ? String(source.saleId) : undefined,
    saleNumber: source.saleNumber,
    sourceDocumentId: String(source._id),
    sourceDocumentNumber: source.number,
    createdBy: userId,
  });
}

/** Annule sans supprimer : le numéro reste dans la séquence, visible comme « annulé ». */
export async function cancelDocument(tenantId: string, id: string, input: CancelDocumentInput): Promise<BusinessDocumentDTO> {
  const reason = cleanDocumentText(input?.reason);
  if (!reason) throw new DocumentError(400, 'Un motif d’annulation est requis.');
  if (!Types.ObjectId.isValid(id)) throw new DocumentError(404, 'Document introuvable.');

  const doc = await BusinessDocument.findOne({ tenantId: oid(tenantId), _id: id }).lean();
  if (!doc) throw new DocumentError(404, 'Document introuvable.');
  if (doc.status === 'cancelled') throw new DocumentError(409, 'Document déjà annulé.');
  if (doc.einvoice.status === 'submitted' || doc.einvoice.status === 'accepted') {
    throw new DocumentError(409, 'Cette facture a été transmise à l’administration : elle ne peut plus être annulée.');
  }

  const updated = await BusinessDocument.findOneAndUpdate(
    { tenantId: oid(tenantId), _id: doc._id, status: 'issued' },
    { $set: { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason } },
    { new: true },
  ).lean();
  if (!updated) throw new DocumentError(409, 'Document déjà annulé.');
  return toDTO(updated);
}

export async function getDocument(tenantId: string, id: string): Promise<BusinessDocumentDTO | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  const doc = await BusinessDocument.findOne({ tenantId: oid(tenantId), _id: id }).lean();
  return doc ? toDTO(doc) : null;
}

export interface ListDocumentsFilters {
  kind?: string;
  status?: string;
  from?: Date;
  to?: Date;
  search?: string;
  saleId?: string;
  page?: number;
  limit?: number;
}

export async function listDocuments(tenantId: string, f: ListDocumentsFilters): Promise<{ documents: DocumentListItemDTO[]; total: number }> {
  const match: Record<string, unknown> = { tenantId: oid(tenantId) };
  if (f.kind && DOCUMENT_KINDS.includes(f.kind as DocumentKind)) match.kind = f.kind;
  if (f.status === 'issued' || f.status === 'cancelled') match.status = f.status;
  if (f.saleId && Types.ObjectId.isValid(f.saleId)) match.saleId = oid(f.saleId);
  if (f.from || f.to) match.issueDate = { ...(f.from ? { $gte: f.from } : {}), ...(f.to ? { $lte: f.to } : {}) };
  if (f.search?.trim()) {
    const rx = new RegExp(escapeRegex(f.search.trim()), 'i');
    match.$or = [{ number: rx }, { 'buyer.name': rx }, { saleNumber: rx }];
  }
  const page = Math.max(1, f.page ?? 1);
  const limit = Math.min(200, Math.max(1, f.limit ?? 50));

  const [docs, total] = await Promise.all([
    BusinessDocument.find(match).sort({ issueDate: -1, sequence: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    BusinessDocument.countDocuments(match),
  ]);
  return {
    total,
    documents: docs.map((d) => ({
      id: String(d._id),
      kind: d.kind,
      number: d.number,
      status: d.status,
      issueDate: d.issueDate.toISOString(),
      buyerName: d.buyer.name,
      totalTtcCents: d.totals.totalTtcCents,
      saleNumber: d.saleNumber,
      sourceDocumentNumber: d.sourceDocumentNumber,
    })),
  };
}
