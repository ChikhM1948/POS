/**
 * Encodeur Code 128 (sets B et C) + générateur de codes EAN-13 internes.
 * Écrit à la main (aucune dépendance) : fonctionne hors-ligne, y compris dans le shell Electron.
 */

const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232',
  '2331112', // STOP (106)
];

const START_B = 104;
const START_C = 105;
const CODE_B = 100;
const CODE_C = 99;
const STOP = 106;

/** Retourne les largeurs de modules (alternance barre/espace, en commençant par une barre). */
export function encodeCode128(text: string): number[] {
  if (!text) throw new Error('Texte vide.');
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c < 32 || c > 126) throw new Error(`Caractère non supporté : "${ch}"`);
  }

  const codes: number[] = [];
  const allDigits = /^\d+$/.test(text);

  if (allDigits && text.length >= 4) {
    // Set C pour la partie paire ; si longueur impaire, un chiffre en set B au début.
    let i = 0;
    if (text.length % 2 === 1) {
      codes.push(START_B, text.charCodeAt(0) - 32, CODE_C);
      i = 1;
    } else {
      codes.push(START_C);
    }
    for (; i < text.length; i += 2) codes.push(parseInt(text.slice(i, i + 2), 10));
  } else {
    codes.push(START_B);
    for (const ch of text) codes.push(ch.charCodeAt(0) - 32);
  }

  let sum = codes[0];
  for (let i = 1; i < codes.length; i++) sum += codes[i] * i;
  codes.push(sum % 103, STOP);

  return codes.flatMap((code) => PATTERNS[code].split('').map(Number));
}

export function code128ModuleCount(text: string): number {
  return encodeCode128(text).reduce((a, b) => a + b, 0);
}

/** Génère les rectangles SVG (x, largeur) des barres, en unités de module. */
export function code128Bars(text: string): { bars: { x: number; w: number }[]; total: number } {
  const widths = encodeCode128(text);
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w });
    x += w;
  });
  return { bars, total: x };
}

/** Clé de contrôle EAN-13 pour 12 chiffres. */
export function ean13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

/**
 * Code EAN-13 à usage interne (préfixe 200–299 = circulation restreinte, jamais attribué à un fabricant),
 * donc sans risque de collision avec un code produit du commerce.
 */
export function generateInternalEan13(existing: Set<string>): string {
  for (let attempt = 0; attempt < 1000; attempt++) {
    let body = '2';
    for (let i = 0; i < 11; i++) body += Math.floor(Math.random() * 10);
    const code = body + ean13CheckDigit(body);
    if (!existing.has(code)) return code;
  }
  throw new Error('Impossible de générer un code unique.');
}
