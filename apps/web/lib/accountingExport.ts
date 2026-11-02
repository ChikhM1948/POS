import type { JournalEntryDTO } from '@pos-dz/shared';

/** Taux de TVA algériens, dans l'ordre d'affichage des colonnes. */
export const VAT_RATES = [19, 9, 0] as const;

export type Cell = string | number | null;

export interface Sheet {
  name: string;
  rows: Cell[][];
  /** Nombre de lignes d'en-tête figées et en gras (par défaut 1). */
  headerRows?: number;
  /** Autres lignes (0-indexées) à mettre en gras : totaux, titres de section. */
  boldRows?: number[];
}

const dzd = (cents: number) => Math.round(cents) / 100;

// --- Agrégation ---

export interface VatLine {
  taxRate: number;
  baseHtCents: number;
  taxCents: number;
  ttcCents: number;
}

export interface VatSummary {
  byRate: VatLine[];
  byMonth: { month: string; byRate: VatLine[]; totalHtCents: number; totalTaxCents: number; totalTtcCents: number }[];
  totalHtCents: number;
  totalTaxCents: number;
  totalTtcCents: number;
  stampDutyCents: number;
  cashCents: number;
  salesCount: number;
  refundsCount: number;
  invoicesCount: number;
}

/** Mois comptable à l'heure d'Alger (UTC+1), pour qu'une vente de 23h45 le 31 reste dans le bon mois. */
export function monthOf(iso: string): string {
  return new Date(new Date(iso).getTime() + 3_600_000).toISOString().slice(0, 7);
}

const dayOf = (iso: string) => new Date(new Date(iso).getTime() + 3_600_000).toISOString().slice(0, 10);

function addTo(map: Map<number, VatLine>, rate: number, base: number, tax: number) {
  const l = map.get(rate) ?? { taxRate: rate, baseHtCents: 0, taxCents: 0, ttcCents: 0 };
  l.baseHtCents += base;
  l.taxCents += tax;
  l.ttcCents += base + tax;
  map.set(rate, l);
}

const sortRates = (m: Map<number, VatLine>) => [...m.values()].sort((a, b) => b.taxRate - a.taxRate);

export function buildVatSummary(entries: JournalEntryDTO[]): VatSummary {
  const total = new Map<number, VatLine>();
  const months = new Map<string, Map<number, VatLine>>();
  const s: VatSummary = {
    byRate: [], byMonth: [], totalHtCents: 0, totalTaxCents: 0, totalTtcCents: 0,
    stampDutyCents: 0, cashCents: 0, salesCount: 0, refundsCount: 0, invoicesCount: 0,
  };
  for (const e of entries) {
    const m = months.get(monthOf(e.date)) ?? new Map<number, VatLine>();
    for (const v of e.vat) {
      addTo(total, v.taxRate, v.baseHtCents, v.taxCents);
      addTo(m, v.taxRate, v.baseHtCents, v.taxCents);
    }
    months.set(monthOf(e.date), m);
    s.stampDutyCents += e.stampDutyCents;
    s.cashCents += e.cashCents;
    if (e.kind === 'sale') s.salesCount++;
    else if (e.kind === 'refund') s.refundsCount++;
    else s.invoicesCount++;
  }
  s.byRate = sortRates(total);
  s.byMonth = [...months.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, rates]) => {
      const byRate = sortRates(rates);
      return {
        month,
        byRate,
        totalHtCents: byRate.reduce((a, r) => a + r.baseHtCents, 0),
        totalTaxCents: byRate.reduce((a, r) => a + r.taxCents, 0),
        totalTtcCents: byRate.reduce((a, r) => a + r.ttcCents, 0),
      };
    });
  s.totalHtCents = s.byRate.reduce((a, r) => a + r.baseHtCents, 0);
  s.totalTaxCents = s.byRate.reduce((a, r) => a + r.taxCents, 0);
  s.totalTtcCents = s.byRate.reduce((a, r) => a + r.ttcCents, 0);
  return s;
}

// --- Feuilles ---

export interface ExportLabels {
  journal: string;
  vatByRate: string;
  vatByMonth: string;
  date: string;
  type: string;
  number: string;
  invoiceNumber: string;
  customer: string;
  customerNif: string;
  baseHt: string;
  vat: string;
  totalHt: string;
  totalVat: string;
  totalTtc: string;
  stampDuty: string;
  payment: string;
  rate: string;
  month: string;
  total: string;
  kinds: Record<'sale' | 'refund' | 'invoice', string>;
  methods: Record<string, string>;
}

export function journalSheet(entries: JournalEntryDTO[], L: ExportLabels): Sheet {
  const header: Cell[] = [
    L.date, L.type, L.number, L.invoiceNumber, L.customer, L.customerNif,
    ...VAT_RATES.flatMap((r) => [`${L.baseHt} ${r}%`, `${L.vat} ${r}%`]),
    L.totalHt, L.totalVat, L.totalTtc, L.stampDuty, L.payment,
  ];
  const rows = entries.map((e): Cell[] => [
    dayOf(e.date),
    L.kinds[e.kind],
    e.number,
    e.documentNumber ?? '',
    e.customerName ?? '',
    e.customerNif ?? '',
    ...VAT_RATES.flatMap((r) => {
      const v = e.vat.find((x) => x.taxRate === r);
      return [dzd(v?.baseHtCents ?? 0), dzd(v?.taxCents ?? 0)];
    }),
    dzd(e.totalHtCents), dzd(e.totalTaxCents), dzd(e.totalTtcCents), dzd(e.stampDutyCents),
    [...new Set(e.paymentMethods)].map((m) => L.methods[m] ?? m).join(' + '),
  ]);
  const sum = (pick: (e: JournalEntryDTO) => number) => dzd(entries.reduce((a, e) => a + pick(e), 0));
  const totals: Cell[] = [
    L.total, '', '', '', '', '',
    ...VAT_RATES.flatMap((r) => [
      sum((e) => e.vat.find((x) => x.taxRate === r)?.baseHtCents ?? 0),
      sum((e) => e.vat.find((x) => x.taxRate === r)?.taxCents ?? 0),
    ]),
    sum((e) => e.totalHtCents), sum((e) => e.totalTaxCents), sum((e) => e.totalTtcCents), sum((e) => e.stampDutyCents), '',
  ];
  return { name: L.journal, rows: [header, ...rows, totals], boldRows: [rows.length + 1] };
}

export function vatSheet(summary: VatSummary, L: ExportLabels): Sheet {
  const head: Cell[] = [L.rate, L.baseHt, L.vat, L.totalTtc];
  const line = (r: VatLine): Cell[] => [`${r.taxRate}%`, dzd(r.baseHtCents), dzd(r.taxCents), dzd(r.ttcCents)];
  const rows: Cell[][] = [[L.vatByRate], head, ...summary.byRate.map(line)];
  const bold = [0, 1];
  bold.push(rows.length);
  rows.push([L.total, dzd(summary.totalHtCents), dzd(summary.totalTaxCents), dzd(summary.totalTtcCents)]);
  rows.push([L.stampDuty, null, null, dzd(summary.stampDutyCents)]);
  rows.push([]);
  bold.push(rows.length);
  rows.push([L.vatByMonth]);
  bold.push(rows.length);
  rows.push([L.month, ...head]);
  for (const m of summary.byMonth) {
    for (const r of m.byRate) rows.push([m.month, ...line(r)]);
    bold.push(rows.length);
    rows.push([m.month, L.total, dzd(m.totalHtCents), dzd(m.totalTaxCents), dzd(m.totalTtcCents)]);
  }
  return { name: L.vatByRate, rows, headerRows: 0, boldRows: bold };
}

// --- CSV ---

/** `;` + virgule décimale + BOM UTF-8 : s'ouvre directement et correctement dans Excel en configuration française. */
export function toCsv(rows: Cell[][]): string {
  const cell = (c: Cell): string => {
    if (c === null) return '';
    if (typeof c === 'number') return c.toFixed(2).replace('.', ',');
    // Neutralise l'injection de formule (=, +, -, @) dans un champ texte saisi par un utilisateur.
    const text = /^[=+\-@\t\r]/.test(c) && Number.isNaN(Number(c.replace(',', '.'))) ? `'${c}` : c;
    return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';
}

// --- XLSX (écrit à la main : pas de dépendance, deux feuilles de chiffres n'en justifient pas) ---

const enc = new TextEncoder();

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Archive ZIP sans compression (méthode « stored ») — valide pour un .xlsx. */
function zip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (v: number) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff]);
  const u32 = (v: number) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]);
  const cat = (...parts: Uint8Array[]) => {
    const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  };
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    // 0x0800 = noms en UTF-8 ; date DOS fixe (1980-01-01) pour un fichier reproductible.
    const local = cat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(f.data.length), u32(f.data.length), u16(name.length), u16(0), name, f.data);
    central.push(cat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(f.data.length), u32(f.data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name));
    chunks.push(local);
    offset += local.length;
  }
  const cd = cat(...central);
  return cat(...chunks, cd, u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cd.length), u32(offset), u16(0));
}

const xmlEsc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]!).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

function colName(i: number): string {
  let n = i + 1, s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function sheetXml(sheet: Sheet): string {
  const headerRows = sheet.headerRows ?? 1;
  const widths: number[] = [];
  const rowsXml = sheet.rows.map((row, r) => {
    const cells = row.map((v, c) => {
      if (v === null) return '';
      widths[c] = Math.max(widths[c] ?? 8, Math.min(40, (typeof v === 'number' ? 14 : v.length + 2)));
      const ref = `${colName(c)}${r + 1}`;
      const bold = r < headerRows || Boolean(sheet.boldRows?.includes(r));
      if (typeof v === 'number') return `<c r="${ref}" s="${bold ? 3 : 2}"><v>${v}</v></c>`;
      return `<c r="${ref}"${bold ? ' s="1"' : ''} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${cells}</row>`;
  }).join('');
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0">${headerRows > 0 ? `<pane ySplit="${headerRows}" topLeftCell="A${headerRows + 1}" activePane="bottomLeft" state="frozen"/>` : ''}</sheetView></sheetViews><cols>${cols}</cols><sheetData>${rowsXml}</sheetData></worksheet>`;
}

export function toXlsx(sheets: Sheet[]): Uint8Array {
  const names = sheets.map((s, i) => xmlEsc(s.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || `Feuille${i + 1}`));
  const parts: { name: string; text: string }[] = [
    { name: '[Content_Types].xml', text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
    { name: '_rels/.rels', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    // 0 défaut · 1 gras · 2 nombre 0,00 · 3 nombre 0,00 gras
    { name: 'xl/styles.xml', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="4" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs></styleSheet>' },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, text: sheetXml(s) })),
  ];
  return zip(parts.map((p) => ({ name: p.name, data: enc.encode(p.text) })));
}

export function downloadFile(content: BlobPart, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const CSV_MIME = 'text/csv;charset=utf-8';
