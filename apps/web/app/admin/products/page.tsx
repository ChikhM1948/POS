'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '../../../lib/adminAuth';
import { adminFetch } from '../../../lib/adminApi';
import { ProductForm } from '../../../components/admin/ProductForm';
import { useTranslation } from '../../../lib/i18n/LanguageContext';
import { formatCurrency } from '../../../lib/format';
import { IconPlus, IconSearch } from '../../../components/icons';
import type { ProductDTO, ProductInput } from '@pos-dz/shared';

export default function ProductsPage() {
  const { t, locale } = useTranslation();
  const formatDZD = (cents: number) => formatCurrency(cents, locale);
  const { session } = useAdminAuth();
  const canViewCostPrice = session ? session.role !== 'cashier' || Boolean(session.canViewPurchasePrice) : true;
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ProductDTO | 'new' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { products } = await adminFetch<{ products: ProductDTO[] }>(
        session.token,
        `/products${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      );
      setProducts(products);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [session, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(input: ProductInput, initialStock?: { quantity: number; expiryDate?: string }) {
    if (!session) return;
    let productId: string | undefined;
    if (editing === 'new') {
      const { product } = await adminFetch<{ product: ProductDTO }>(session.token, '/products', { method: 'POST', body: JSON.stringify(input) });
      productId = product.id;
    } else if (editing) {
      await adminFetch(session.token, `/products/${editing.id}`, { method: 'PATCH', body: JSON.stringify(input) });
      productId = editing.id;
    }
    // Quantité saisie dans le formulaire : ajoutée au stock de la première boutique (stock initial à la création).
    if (productId && initialStock && initialStock.quantity > 0) {
      const { stores } = await adminFetch<{ stores: { id: string }[] }>(session.token, '/stores');
      if (stores[0]) {
        await adminFetch(session.token, '/stock/movements', {
          method: 'POST',
          body: JSON.stringify({
            productId,
            storeId: stores[0].id,
            type: 'adjustment',
            quantityDelta: initialStock.quantity,
            expiryDate: initialStock.expiryDate,
            note: editing === 'new' ? 'Stock initial' : 'Ajout de stock',
          }),
        });
      }
    }
    setEditing(null);
    await load();
  }

  async function handleDeactivate(product: ProductDTO) {
    if (!session) return;
    if (!confirm(t('products.confirmDeactivate', { name: product.name.fr }))) return;
    await adminFetch(session.token, `/products/${product.id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-neutral-900">{t('products.title')}</h1>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          <IconPlus className="h-4 w-4" />
          {t('products.newProduct')}
        </button>
      </div>

      <div className="relative max-w-sm">
        <IconSearch className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('products.searchPlaceholder')}
          className="w-full rounded-lg border border-neutral-300 py-2 ps-9 pe-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500"
        />
      </div>

      {editing && (
        <ProductForm
          initial={editing === 'new' ? null : editing}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
          canViewCostPrice={canViewCostPrice}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-start text-xs font-medium text-neutral-500">
            <tr>
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3">{t('products.tableProduct')}</th>
              <th className="px-4 py-3">{t('products.tableSku')}</th>
              <th className="px-4 py-3">{t('products.tableBarcode')}</th>
              <th className="px-4 py-3">{t('products.tableCategory')}</th>
              <th className="px-4 py-3">{t('products.tablePrice')}</th>
              <th className="px-4 py-3">{t('products.tableTax')}</th>
              <th className="px-4 py-3">{t('products.tableStatus')}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-2.5">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-neutral-400">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-neutral-900">{p.name.fr}</p>
                  {p.name.ar && (
                    <p dir="rtl" className="text-neutral-500">
                      {p.name.ar}
                    </p>
                  )}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-neutral-500">{p.sku}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-neutral-500">{p.barcode ?? '—'}</td>
                <td className="px-4 py-2.5 text-neutral-600">{p.category ?? '—'}</td>
                <td className="px-4 py-2.5 font-medium text-neutral-900">{formatDZD(p.sellingPriceCents)}</td>
                <td className="px-4 py-2.5 text-neutral-600">{p.taxRate}%</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600">
                    <span className={`h-1.5 w-1.5 rounded-full ${p.active ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
                    {p.active ? t('common.active') : t('common.inactive')}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-end">
                  <button onClick={() => setEditing(p)} className="me-3 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline">
                    {t('common.edit')}
                  </button>
                  {p.active && (
                    <button onClick={() => handleDeactivate(p)} className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline">
                      {t('common.deactivate')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {loading && products.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-neutral-400">
                  {t('common.loading')}
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-neutral-500">
                  {t('products.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
