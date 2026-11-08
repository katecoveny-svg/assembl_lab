/**
 * The LINZ 1:50k map-sheet grid (NZTM2000), which the national LiDAR mosaic uses as its tile
 * index: `new-zealand/new-zealand/dem_1m/2193/BA32.tiff` covers sheet BA32, a 24 km x 36 km
 * rectangle. Source surveys are cut into 1:10k tiles (5 x 5 per sheet), named like
 * `BA32_10000_0403` (row 04, column 03, both 1-based from the top-left).
 *
 * Checked against the bucket on 7 Nov 2026: BA32.tiff has origin (1 756 000, 5 946 000),
 * 24 000 x 36 000 px at 1 m, which is what `sheetBounds('BA32')` returns.
 */

export const SHEET_WIDTH = 24_000;
export const SHEET_HEIGHT = 36_000;
export const SHEET_ORIGIN_LEFT = 988_000;
export const SHEET_ORIGIN_TOP = 6_234_000;
/** Letters used in sheet codes: the alphabet without I and O. */
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
/** Row 0 of the grid is "AS". */
const FIRST_ROW_OFFSET = LETTERS.indexOf('S');

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

function rowCode(row: number): string {
  const k = row + FIRST_ROW_OFFSET;
  return LETTERS[Math.floor(k / LETTERS.length)] + LETTERS[k % LETTERS.length];
}

/** Sheet code (e.g. "BA32") containing an NZTM point, or null when outside the grid. */
export function sheetCodeAt(x: number, y: number): string | null {
  const col = Math.floor((x - SHEET_ORIGIN_LEFT) / SHEET_WIDTH);
  const row = Math.floor((SHEET_ORIGIN_TOP - y) / SHEET_HEIGHT);
  if (col < 0 || col > 99 || row < 0 || row + FIRST_ROW_OFFSET >= LETTERS.length * LETTERS.length) return null;
  return `${rowCode(row)}${String(col).padStart(2, '0')}`;
}

/** NZTM bounds of a sheet code such as "BA32". */
export function sheetBounds(code: string): Bounds {
  const m = /^([A-HJ-NP-Z])([A-HJ-NP-Z])(\d{2})$/.exec(code);
  if (!m) throw new Error(`Not a sheet code: ${code}`);
  const row = LETTERS.indexOf(m[1]) * LETTERS.length + LETTERS.indexOf(m[2]) - FIRST_ROW_OFFSET;
  const col = Number(m[3]);
  const minX = SHEET_ORIGIN_LEFT + col * SHEET_WIDTH;
  const maxY = SHEET_ORIGIN_TOP - row * SHEET_HEIGHT;
  return { minX, maxX: minX + SHEET_WIDTH, maxY, minY: maxY - SHEET_HEIGHT };
}

/** Every sheet code a bounding box touches. */
export function sheetsForBounds(b: Bounds): string[] {
  const eps = 1e-6;
  const out: string[] = [];
  const col0 = Math.floor((b.minX - SHEET_ORIGIN_LEFT) / SHEET_WIDTH);
  const col1 = Math.floor((b.maxX - eps - SHEET_ORIGIN_LEFT) / SHEET_WIDTH);
  const row0 = Math.floor((SHEET_ORIGIN_TOP - b.maxY) / SHEET_HEIGHT);
  const row1 = Math.floor((SHEET_ORIGIN_TOP - (b.minY + eps)) / SHEET_HEIGHT);
  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) {
      const code = sheetCodeAt(
        SHEET_ORIGIN_LEFT + (col + 0.5) * SHEET_WIDTH,
        SHEET_ORIGIN_TOP - (row + 0.5) * SHEET_HEIGHT,
      );
      if (code) out.push(code);
    }
  }
  return out;
}

/** 1:10k tile names (`BA32_10000_0403`) a bounding box touches; used to find the source surveys. */
export function tiles10kForBounds(b: Bounds): string[] {
  const tw = SHEET_WIDTH / 5;
  const th = SHEET_HEIGHT / 5;
  const out = new Set<string>();
  for (const code of sheetsForBounds(b)) {
    const s = sheetBounds(code);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const minX = s.minX + c * tw;
        const maxY = s.maxY - r * th;
        const overlaps = minX < b.maxX && minX + tw > b.minX && maxY > b.minY && maxY - th < b.maxY;
        if (overlaps) out.add(`${code}_10000_${String(r + 1).padStart(2, '0')}${String(c + 1).padStart(2, '0')}`);
      }
    }
  }
  return [...out];
}
