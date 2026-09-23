import { Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Supplier } from '../../models/Supplier';
import { SupplierLedgerEntry } from '../../models/SupplierLedgerEntry';
import type { SupplierDTO, SupplierInput, LedgerEntryDTO, CreateLedgerPaymentInput } from '@pos-dz/shared';

function toLedgerDTO(e: any): LedgerEntryDTO {
  return {
    id: String(e._id),
    type: e.type,
    amountCents: e.amountCents,
    note: e.note,
    reference: e.reference?.id ? { type: e.reference.type, id: String(e.reference.id) } : undefined,
    createdAtLocal: e.createdAtLocal.toISOString(),
  };
}

async function getBalances(tenantId: string, supplierIds: Types.ObjectId[]): Promise<Map<string, number>> {
  if (supplierIds.length === 0) return new Map();
  const rows = await SupplierLedgerEntry.aggregate([
    { $match: { tenantId: new Types.ObjectId(tenantId), supplierId: { $in: supplierIds } } },
    { $group: { _id: '$supplierId', balanceCents: { $sum: '$amountCents' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.balanceCents as number]));
}

export async function listSuppliers(tenantId: string): Promise<SupplierDTO[]> {
  const docs = await Supplier.find({ tenantId: new Types.ObjectId(tenantId) }).sort({ name: 1 }).lean();
  const balances = await getBalances(tenantId, docs.map((d) => d._id));
  return docs.map((d) => ({
    id: String(d._id),
    name: d.name,
    phone: d.phone,
    address: d.address,
    active: d.active,
    balanceCents: balances.get(String(d._id)) ?? 0,
  }));
}

export async function createSupplier(tenantId: string, input: SupplierInput): Promise<SupplierDTO> {
  const doc = await Supplier.create({
    tenantId: new Types.ObjectId(tenantId),
    name: input.name.trim(),
    phone: input.phone?.trim() || undefined,
    address: input.address?.trim() || undefined,
  });
  return { id: String(doc._id), name: doc.name, phone: doc.phone, address: doc.address, active: doc.active, balanceCents: 0 };
}

export async function updateSupplier(tenantId: string, id: string, input: Partial<SupplierInput>): Promise<SupplierDTO | null> {
  const doc = await Supplier.findOneAndUpdate(
    { tenantId: new Types.ObjectId(tenantId), _id: id },
    { $set: input },
    { new: true },
  );
  if (!doc) return null;
  const balances = await getBalances(tenantId, [doc._id]);
  return { id: String(doc._id), name: doc.name, phone: doc.phone, address: doc.address, active: doc.active, balanceCents: balances.get(String(doc._id)) ?? 0 };
}

export async function getSupplierLedger(tenantId: string, supplierId: string): Promise<LedgerEntryDTO[]> {
  const docs = await SupplierLedgerEntry.find({ tenantId: new Types.ObjectId(tenantId), supplierId })
    .sort({ createdAtLocal: -1 })
    .limit(200)
    .lean();
  return docs.map(toLedgerDTO);
}

/** Encaisse un paiement fait à un fournisseur — réduit sa dette (amountCents négatif dans le ledger). */
export async function recordSupplierPayment(tenantId: string, supplierId: string, input: CreateLedgerPaymentInput): Promise<LedgerEntryDTO> {
  const doc = await SupplierLedgerEntry.create({
    tenantId: new Types.ObjectId(tenantId),
    supplierId: new Types.ObjectId(supplierId),
    type: 'payment' as const,
    amountCents: -Math.abs(input.amountCents),
    note: input.note,
    clientGeneratedId: randomUUID(),
    createdAtLocal: new Date(),
  });
  return toLedgerDTO(doc);
}
