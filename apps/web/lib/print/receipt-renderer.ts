import type { SaleLine, SaleTotals } from '@pos-dz/shared';

/**
 * La plupart des imprimantes thermiques ESC/POS n'ont pas de jeu de caractères arabe
 * correctement formé (liaison des lettres, RTL). La solution fiable est de dessiner le ticket
 * sur un canvas (qui gère nativement `direction: rtl` et le shaping via le moteur de rendu texte
 * du navigateur/Electron) puis d'imprimer le résultat comme une image raster — voir
 * escpos-raster.ts. Ça unifie aussi le rendu FR/AR sur une même image, plus fidèle au branding.
 */

const DOTS_PER_MM_203DPI = 8; // imprimantes thermiques standard 203 dpi ≈ 8 dots/mm

export interface ReceiptRenderInput {
  widthMm: 80 | 58;
  header: string;
  footer?: string;
  saleNumber: string;
  dateLabel: string;
  lines: SaleLine[];
  totals: SaleTotals;
}

const formatDZD = (cents: number) =>
  new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(cents / 100);

export async function renderReceiptToImageData(input: ReceiptRenderInput): Promise<ImageData> {
  const widthDots = input.widthMm * DOTS_PER_MM_203DPI; // 576 (80mm) ou 464 (58mm)
  const paddingX = 16;
  const lineHeight = 28;
  const estimatedHeight =
    220 + input.lines.length * lineHeight * 2 + (input.footer ? 60 : 0);

  const canvas = document.createElement('canvas');
  canvas.width = widthDots;
  canvas.height = estimatedHeight;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';

  let y = 30;

  ctx.textAlign = 'center';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(input.header, canvas.width / 2, y);
  y += 34;

  ctx.font = '16px sans-serif';
  ctx.fillText(`Ticket ${input.saleNumber}`, canvas.width / 2, y);
  y += 20;
  ctx.fillText(input.dateLabel, canvas.width / 2, y);
  y += 20;

  drawRule(ctx, canvas.width, y, paddingX);
  y += 20;

  ctx.textAlign = 'left';
  for (const line of input.lines) {
    ctx.font = '17px sans-serif';
    ctx.fillText(`${line.name.fr} × ${line.quantity}`, paddingX, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatDZD(line.lineTotalCents), canvas.width - paddingX, y);
    ctx.textAlign = 'left';
    y += lineHeight;

    if (line.name.ar) {
      ctx.save();
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.font = '17px "Noto Sans Arabic", sans-serif';
      ctx.fillText(line.name.ar, canvas.width - paddingX, y);
      ctx.restore();
      y += lineHeight;
    }
  }

  drawRule(ctx, canvas.width, y, paddingX);
  y += 26;

  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Total', paddingX, y);
  ctx.textAlign = 'right';
  ctx.fillText(formatDZD(input.totals.grandTotalCents), canvas.width - paddingX, y);
  y += 26;

  if (input.totals.stampDutyCents > 0) {
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Dont timbre fiscal', paddingX, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatDZD(input.totals.stampDutyCents), canvas.width - paddingX, y);
    y += 24;
  }

  if (input.footer) {
    y += 16;
    ctx.textAlign = 'center';
    ctx.font = '14px sans-serif';
    wrapText(ctx, input.footer, canvas.width / 2, y, canvas.width - paddingX * 2, 18);
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function drawRule(ctx: CanvasRenderingContext2D, width: number, y: number, paddingX: number) {
  ctx.beginPath();
  ctx.moveTo(paddingX, y);
  ctx.lineTo(width - paddingX, y);
  ctx.strokeStyle = '#000000';
  ctx.stroke();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, y);
}
