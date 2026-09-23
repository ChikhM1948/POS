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

  async function handleSubmit(input: ProductInput) {
    if (!session) return;
    if (editing === 'new') {
      await adminFetch(session.token, '/products', { method: 'POST', body: JSON.stringify(input) });
    } else if (editing) {
      await adminFetch(session.token, `/products/${editing.id}`, { method: 'PATCH', body: JSON.stringify(input) });
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
        <h1 className="text-xl font-semibold text-neutral-900">{t('products.title')}</h1>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700"
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

      {editing && <ProductForm initial={editing === 'new' ? null : editing} onSubmit={handleSubmit} onCancel={() => setEditing(null)} />}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-start text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2">{t('products.tableProduct')}</th>
              <th className="px-4 py-2">{t('products.tableSku')}</th>
              <th className="px-4 py-2">{t('products.tableBarcode')}</th>
              <th className="px-4 py-2">{t('products.tableCategory')}</th>
              <th className="px-4 py-2">{t('products.tablePrice')}</th>
              <th className="px-4 py-2">{t('products.tableTax')}</th>
              <th className="px-4 py-2">{t('products.tableStatus')}</th>
              <th className="px-4 py-2"></th>
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
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-neutral-600'}`}>
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
