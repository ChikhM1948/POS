import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env';

// Mêmes endpoints que la webapp Lingolab (lib/sofizpay.js).
const CREATE_URL = 'https://www.sofizpay.com/make-cib-transaction/';
const CHECK_URL = 'https://www.sofizpay.com/cib-transaction-check/';

export type SofizResult<T> = ({ ok: true } & T) | { ok: false; code: 'not_configured' | 'gateway_error' | 'no_payment_url' | 'internal'; status: number };

export async function createSofizpayOrder(p: { amount: number; orderId: string; label: string; name?: string; email?: string; phone?: string }): Promise<SofizResult<{ paymentUrl: string; cibOrderId?: string }>> {
  if (!env.sofizpayApiKey) return { ok: false, code: 'not_configured', status: 503 };
  try {
    const params = new URLSearchParams({
      account: env.sofizpayApiKey,
      amount: String(p.amount),
      full_name: p.name ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      return_url: `${env.webBaseUrl}/?license_order=${encodeURIComponent(p.orderId)}`,
      memo: `${p.orderId} - ${p.label}`,
      redirect: 'no',
    });
    const res = await fetch(`${CREATE_URL}?${params}`, { headers: { Accept: 'application/json' } });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[SofizPay] ${res.status}:`, text.slice(0, 500));
      return { ok: false, code: 'gateway_error', status: 502 };
    }
    let data: any = {};
    try { data = JSON.parse(text); } catch { /* réponse non JSON */ }
    const paymentUrl = data.payment_url || data.cib_response?.formUrl;
    if (!paymentUrl) {
      console.error('[SofizPay] pas d\'URL de paiement:', data);
      return { ok: false, code: 'no_payment_url', status: 502 };
    }
    return { ok: true, paymentUrl, cibOrderId: data.cib_transaction_id ? String(data.cib_transaction_id) : undefined };
  } catch (err) {
    console.error('[SofizPay] exception:', err);
    return { ok: false, code: 'internal', status: 500 };
  }
}

/** Interroge SofizPay : payé = orderStatus 2 et errorCode 0. */
export async function checkSofizpayPayment(cibOrderId: string): Promise<{ paid: boolean; amount?: number } | null> {
  try {
    const res = await fetch(`${CHECK_URL}?order_number=${encodeURIComponent(cibOrderId)}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data: any = await res.json().catch(() => ({}));
    const amount = data.amount !== undefined ? Number(data.amount) : undefined;
    return { paid: data.orderStatus === 2 && data.errorCode === 0, amount: Number.isFinite(amount) ? amount : undefined };
  } catch {
    return null;
  }
}

/** HMAC-SHA256 hex de `order_id + transaction_id + amount + status` (le statut est couvert pour empêcher le rejeu d'un « failed » signé en « success »). */
export function verifyWebhookSignature(body: any, signature: string | undefined): boolean {
  if (!env.sofizpayWebhookSecret) return false;
  const payload = `${body.order_id}${body.transaction_id}${body.amount}${body.status}`;
  const expected = createHmac('sha256', env.sofizpayWebhookSecret).update(payload).digest('hex');
  const given = Buffer.from(signature ?? '', 'utf8');
  const exp = Buffer.from(expected, 'utf8');
  return given.length === exp.length && timingSafeEqual(given, exp);
}

export const PAID_STATUSES = new Set(['success', 'PAID', 'completed']);
