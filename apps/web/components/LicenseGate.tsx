'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '../lib/i18n/LanguageContext';
import { LICENSE_EXPIRED_EVENT, activateLicense, fetchLicensePrice, fetchLicenseStatus, startLicenseCheckout, verifyLicenseCheckout, type LicensePrice } from '../lib/license';
import type { LicenseStatusDTO } from '@pos-dz/shared';

const TEXT = {
  fr: {
    trialLeft: (n: number) => `Période d'essai : ${n} jour${n > 1 ? 's' : ''} restant${n > 1 ? 's' : ''}`,
    paidLeft: (n: number) => `Licence : ${n} jour${n > 1 ? 's' : ''} restant${n > 1 ? 's' : ''}`,
    enterKey: "Saisir une clé d'activation",
    expiredTitle: 'Licence expirée',
    expiredTrial: "Votre période d'essai de 14 jours est terminée.",
    expiredPaid: 'Votre licence a expiré.',
    expiredBody: "Saisissez une clé d'activation pour reprendre la caisse. Vos données sont conservées.",
    cashierBody: "Demandez à l'administrateur du commerce de saisir une clé d'activation.",
    keyLabel: "Clé d'activation",
    activate: 'Activer',
    activating: 'Activation…',
    close: 'Fermer',
    ok: 'Licence activée.',
    payOnline: (p: string) => `Payer ${p} en ligne (CIB / Dahabia)`,
    redirecting: 'Redirection…',
    paidOk: 'Paiement confirmé : licence à vie activée.',
    paidPending: "Paiement non encore confirmé. Réessayez dans un instant.",
    or: 'ou',
  },
  ar: {
    trialLeft: (n: number) => `فترة تجريبية: ${n} يوم متبقٍ`,
    paidLeft: (n: number) => `الترخيص: ${n} يوم متبقٍ`,
    enterKey: 'أدخل مفتاح التفعيل',
    expiredTitle: 'انتهى الترخيص',
    expiredTrial: 'انتهت فترتك التجريبية (14 يومًا).',
    expiredPaid: 'انتهى ترخيصك.',
    expiredBody: 'أدخل مفتاح تفعيل لمواصلة العمل. بياناتك محفوظة.',
    cashierBody: 'اطلب من مدير المتجر إدخال مفتاح التفعيل.',
    keyLabel: 'مفتاح التفعيل',
    activate: 'تفعيل',
    activating: 'جارٍ التفعيل…',
    close: 'إغلاق',
    ok: 'تم تفعيل الترخيص.',
    payOnline: (p: string) => `ادفع ${p} عبر الإنترنت (CIB / الذهبية)`,
    redirecting: 'جارٍ التحويل…',
    paidOk: 'تم تأكيد الدفع: تم تفعيل الترخيص مدى الحياة.',
    paidPending: 'لم يتم تأكيد الدفع بعد. أعد المحاولة بعد لحظات.',
    or: 'أو',
  },
} as const;

interface Props {
  /** JWT de la session (le statut cloud est lié au commerce) ; absent sur le poste local, où l'API de licence est publique. */
  token?: string;
  /** false pour un caissier : seul un admin peut activer (voir POST /license/activate). */
  canActivate: boolean;
}

/**
 * Bandeau « jours restants » pendant l'essai (≤ 14 j) + écran bloquant à l'expiration. Ne bloque jamais
 * sur une erreur réseau : seul un statut `expired` renvoyé par le serveur (ou un 402) verrouille l'interface.
 */
export function LicenseGate({ token, canActivate }: Props) {
  const { locale } = useTranslation();
  const tx = TEXT[locale];
  const [status, setStatus] = useState<LicenseStatusDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState<LicensePrice | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    const s = await fetchLicenseStatus(token);
    if (s) setStatus(s);
  }, [token]);

  useEffect(() => {
    void fetchLicensePrice().then(setPrice);
  }, []);

  // Retour de SofizPay (?license_order=...) : on confirme auprès du serveur puis on nettoie l'URL.
  useEffect(() => {
    if (!token) return;
    const orderId = new URLSearchParams(window.location.search).get('license_order');
    if (!orderId) return;
    void verifyLicenseCheckout(token, orderId).then((r) => {
      if (r.paid && r.license) setStatus(r.license);
      setNotice(r.paid ? tx.paidOk : tx.paidPending);
      if (r.paid) window.history.replaceState(null, '', window.location.pathname);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function payOnline() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      window.location.href = await startLicenseCheckout(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 10 * 60_000);
    const onExpired = () => setStatus((s) => ({ activated: s?.activated ?? true, kind: s?.kind, expiresAt: s?.expiresAt, expired: true }));
    window.addEventListener(LICENSE_EXPIRED_EVENT, onExpired);
    return () => {
      clearInterval(timer);
      window.removeEventListener(LICENSE_EXPIRED_EVENT, onExpired);
    };
  }, [refresh]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setStatus(await activateLicense(token, key));
      setKey('');
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;

  const payButton = price?.onlinePayment && token ? (
    <>
      <button type="button" disabled={busy} onClick={payOnline} className="rounded-lg bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50">
        {busy ? tx.redirecting : tx.payOnline(`${price.lifetime.amount.toLocaleString('fr-DZ')} ${price.lifetime.currency}`)}
      </button>
      <p className="text-center text-xs text-neutral-400">{tx.or}</p>
    </>
  ) : null;

  const keyForm = (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {payButton}
      <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
        {tx.keyLabel}
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="POS-XXXX-XXXX-XXXX-XXXX"
          autoCapitalize="characters"
          spellCheck={false}
          dir="ltr"
          className="rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm uppercase text-neutral-900"
          required
        />
      </label>
      {notice && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" role="status">{notice}</p>}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button disabled={busy} type="submit" className="flex-1 rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {busy ? tx.activating : tx.activate}
        </button>
        {!status.expired && (
          <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
            {tx.close}
          </button>
        )}
      </div>
    </form>
  );

  if (status.expired) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/70 px-4" role="dialog" aria-modal="true">
        <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-8">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">{tx.expiredTitle}</h2>
            <p className="mt-1 text-sm text-neutral-600">{status.kind === 'paid' ? tx.expiredPaid : tx.expiredTrial}</p>
          </div>
          {canActivate ? (
            <>
              <p className="text-sm text-neutral-500">{tx.expiredBody}</p>
              {keyForm}
            </>
          ) : (
            <p className="text-sm text-neutral-500">{tx.cashierBody}</p>
          )}
        </div>
      </div>
    );
  }

  // Bandeau : visible pendant l'essai, et pour une licence payante seulement dans ses 14 derniers jours.
  const days = status.daysLeft ?? 0;
  if (status.kind === 'lifetime' || (status.kind === 'paid' && days > 14)) return null;
  const urgent = days <= 3;
  return (
    <div className={`print:hidden border-b px-4 py-2 text-sm ${urgent ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">{status.kind === 'paid' ? tx.paidLeft(days) : tx.trialLeft(days)}</span>
        {canActivate && !formOpen && (
          <button onClick={() => setFormOpen(true)} className="underline underline-offset-2">{tx.enterKey}</button>
        )}
      </div>
      {formOpen && <div className="mt-2 max-w-sm">{keyForm}</div>}
    </div>
  );
}
