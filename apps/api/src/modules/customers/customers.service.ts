import { Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Customer } from '../../models/Customer';
import { CustomerLedgerEntry } from '../../models/CustomerLedgerEntry';
import type { CustomerDTO, CreateCustomerInput, UpdateCustomerInput, LedgerEntryDTO, CreateLedgerPaymentInput } from '@pos-dz/shared';

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

async function getBalances(tenantId: string, customerIds: Types.ObjectId[]): Promise<Map<string, number>> {
  if (customerIds.length === 0) return new Map();
  const rows = await CustomerLedgerEntry.aggregate([
    { $match: { tenantId: new Types.ObjectId(tenantId), customerId: { $in: customerIds } } },
    { $group: { _id: '$customerId', balanceCents: { $sum: '$amountCents' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.balanceCents as number]));
}

export async function listCustomers(tenantId: string, search?: string): Promise<CustomerDTO[]> {
  const filter: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId), active: true };
  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: regex }, { phone: regex }];
  }
  const docs = await Customer.find(filter).sort({ name: 1 }).lean();
  const balances = await getBalances(tenantId, docs.map((d) => d._id));
  return docs.map((d) => ({
    id: String(d._id),
    name: d.name,
    phone: d.phone,
    active: d.active,
    balanceCents: balances.get(String(d._id)) ?? 0,
  }));
}

export async function createCustomer(tenantId: string, input: CreateCustomerInput): Promise<CustomerDTO> {
  const doc = await Customer.create({
    tenantId: new Types.ObjectId(tenantId),
    name: input.name.trim(),
    phone: input.phone?.trim() || undefined,
  });
  return { id: String(doc._id), name: doc.name, phone: doc.phone, active: doc.active, balanceCents: 0 };
}

export async function updateCustomer(tenantId: string, id: string, input: UpdateCustomerInput): Promise<CustomerDTO | null> {
  const doc = await Customer.findOneAndUpdate(
    { tenantId: new Types.ObjectId(tenantId), _id: id },
    { $set: input },
    { new: true },
  );
  if (!doc) return null;
  const balances = await getBalances(tenantId, [doc._id]);
  return { id: String(doc._id), name: doc.name, phone: doc.phone, active: doc.active, balanceCents: balances.get(String(doc._id)) ?? 0 };
}

export async function getCustomerLedger(tenantId: string, customerId: string): Promise<LedgerEntryDTO[]> {
  const docs = await CustomerLedgerEntry.find({ tenantId: new Types.ObjectId(tenantId), customerId })
    .sort({ createdAtLocal: -1 })
    .limit(200)
    .lean();
  return docs.map(toLedgerDTO);
}

/** Encaisse un paiement d'un client — réduit sa dette (amountCents négatif dans le ledger). */
export async function recordCustomerPayment(tenantId: string, customerId: string, input: CreateLedgerPaymentInput): Promise<LedgerEntryDTO> {
  const doc = await CustomerLedgerEntry.create({
    tenantId: new Types.ObjectId(tenantId),
    customerId: new Types.ObjectId(customerId),
    type: 'payment' as const,
    amountCents: -Math.abs(input.amountCents),
    note: input.note,
    clientGeneratedId: randomUUID(),
    createdAtLocal: new Date(),
  });
  return toLedgerDTO(doc);
}
