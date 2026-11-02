import type { DocumentKind } from '@pos-dz/shared';

/** Clé de traduction `docs.*` de chaque type de document (les clés historiques sont en camelCase). */
export const DOC_LABEL_KEY: Record<DocumentKind, 'quote' | 'order' | 'proforma' | 'deliveryNote' | 'invoice'> = {
  quote: 'quote',
  order: 'order',
  proforma: 'proforma',
  delivery_note: 'deliveryNote',
  invoice: 'invoice',
};

/** Un bon de livraison ne montre pas les prix. */
export const showsPrices = (kind: DocumentKind) => kind !== 'delivery_note';
