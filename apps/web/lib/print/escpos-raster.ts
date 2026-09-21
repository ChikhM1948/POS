/**
 * Convertit une image (canvas) en commande raster ESC/POS `GS v 0` et assemble un job
 * d'impression complet. Fonctionne identiquement pour du texte FR (LTR) ou AR (RTL) puisque
 * tout est déjà rasterisé en amont — voir receipt-renderer.ts.
 */

const ESC = 0x1b;
const GS = 0x1d;
const LUMINANCE_THRESHOLD = 200; // 0-255 ; sous ce seuil, le pixel est considéré "noir"

/** ImageData RGBA → bitmap monochrome empaqueté en octets (1 bit/pixel), format attendu par GS v 0. */
export function imageDataToEscPosRaster(image: ImageData): { widthBytes: number; heightDots: number; bytes: Uint8Array } {
  const { width, height, data } = image;
  const widthBytes = Math.ceil(width / 8);
  const bytes = new Uint8Array(widthBytes * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const luminance = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
      const isBlack = luminance < LUMINANCE_THRESHOLD && data[offset + 3] > 0;
      if (isBlack) {
        const byteIndex = y * widthBytes + (x >> 3);
        bytes[byteIndex] |= 0x80 >> (x & 7);
      }
    }
  }

  return { widthBytes, heightDots: height, bytes };
}

/** Assemble : init imprimante → image raster → avance papier → coupe partielle. */
export function buildPrintJob(raster: { widthBytes: number; heightDots: number; bytes: Uint8Array }): Uint8Array {
  const init = [ESC, 0x40]; // ESC @

  const xL = raster.widthBytes & 0xff;
  const xH = (raster.widthBytes >> 8) & 0xff;
  const yL = raster.heightDots & 0xff;
  const yH = (raster.heightDots >> 8) & 0xff;
  const rasterHeader = [GS, 0x76, 0x30, 0x00, xL, xH, yL, yH]; // GS v 0 m xL xH yL yH

  const feedAndCut = [0x0a, 0x0a, 0x0a, GS, 0x56, 0x42, 0x00]; // feed 3 lignes + coupe partielle (GS V 66 0)

  const job = new Uint8Array(init.length + rasterHeader.length + raster.bytes.length + feedAndCut.length);
  let offset = 0;
  job.set(init, offset); offset += init.length;
  job.set(rasterHeader, offset); offset += rasterHeader.length;
  job.set(raster.bytes, offset); offset += raster.bytes.length;
  job.set(feedAndCut, offset);

  return job;
}
