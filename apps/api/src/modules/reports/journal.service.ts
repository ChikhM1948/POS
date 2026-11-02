import { Types } from 'mongoose';
import { Sale } from '../../models/Sale';
import { BusinessDocument } from '../../models/BusinessDocument';
import { journalEntryFromInvoice, journalEntryFromSale } from '@pos-dz/shared';
import type { JournalEntryDTO, SaleLine, SalePayment } from '@pos-dz/shared';

const MAX_ENTRIES = 50_000;

/**
 * Journal des ventes de la période, base commune du récapitulatif TVA et des exports comptables.
 * Sources : tickets de caisse (retours en négatif) + factures libres émises hors caisse. Les factures
 * tirées d'un ticket sont rattachées à leur ticket (documentNumber) et non recomptées.
 */
export async function getAccountingJournal(
  tenantId: string,
  filters: { from: Date; to: Date; storeId?: string },
): Promise<JournalEntryDTO[]> {
  const tid = new Types.ObjectId(tenantId);
  const range = { $gte: filters.from, $lte: filters.to };
  const storeMatch = filters.storeId ? { storeId: new Types.ObjectId(filters.storeId) } : {};

  const [sales, invoices] = await Promise.all([
    Sale.find({ tenantId: tid, status: 'completed', createdAtLocal: range, ...storeMatch }).sort({ createdAtLocal: 1 }).limit(MAX_ENTRIES).lean(),
    BusinessDocument.find({ tenantId: tid, kind: 'invoice', status: 'issued', issueDate: range, ...storeMatch }).sort({ issueDate: 1 }).limit(MAX_ENTRIES).lean(),
  ]);

  const linkedInvoices = new Map<string, string>(); // saleId -> numéro de facture
  const standalone: typeof invoices = [];
  for (const inv of invoices) {
    if (inv.saleId) linkedInvoices.set(String(inv.saleId), inv.number);
    else standalone.push(inv);
  }
  // Une facture émise dans la période pour un ticket d'une autre période ne change rien au journal de cette période.
  const saleIds = sales.map((s) => s._id);
  if (saleIds.length) {
    const docs = await BusinessDocument.find({ tenantId: tid, kind: 'invoice', status: 'issued', saleId: { $in: saleIds } }).select('saleId number').lean();
    for (const d of docs) linkedInvoices.set(String(d.saleId), d.number);
  }

  const entries: JournalEntryDTO[] = [];

  for (const s of sales) {
    entries.push(journalEntryFromSale({
      date: s.createdAtLocal.toISOString(),
      type: s.type === 'refund' ? 'refund' : 'sale',
      number: s.number,
      storeId: String(s.storeId),
      lines: s.lines as unknown as SaleLine[],
      payments: s.payments as unknown as SalePayment[],
      stampDutyCents: s.totals.stampDutyCents,
      documentNumber: linkedInvoices.get(String(s._id)),
    }));
  }

  for (const inv of standalone) {
    entries.push(journalEntryFromInvoice({
      issueDate: inv.issueDate.toISOString(),
      number: inv.number,
      storeId: inv.storeId ? String(inv.storeId) : undefined,
      buyer: inv.buyer,
      totals: inv.totals as any,
      paymentMethod: inv.paymentMethod,
    }));
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}
