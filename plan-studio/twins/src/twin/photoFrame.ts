// "Make it a photo": the parts with no browser in them, so Node runs them in tests (it strips the types as it loads).
// No imports. The shapes and limits match functions/api/render.js; tests/render/frame.test.mjs checks they agree.

/** the fixed label, on and under every image and burned into every download */
export const PHOTO_LABEL = 'Generated from the model view by Google Gemini. Not a photograph, and not a checked drawing.';
/** the shapes Google Gemini makes (both image models): the view is trimmed to the nearest one before it is sent */
export const RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
export type Quality = 'fast' | 'best';
export type Time = 'morning' | 'midday' | 'golden' | 'overcast';
export type Season = '' | 'summer' | 'winter';
export const TIMES: [Time, string][] = [['morning', 'Morning'], ['midday', 'Midday'], ['golden', 'Golden hour'], ['overcast', 'Overcast']];
export const SEASONS: [Season, string][] = [['', 'Any season'], ['summer', 'Summer'], ['winter', 'Winter']];
export const SETTING_MAX = 120;
/** the longest side sent: big enough for Google's 2K output, small enough to stay well under the 5 MB body limit */
export const MAX_EDGE = 1600;
export const MIN_EDGE = 256;
export const KEEP = 4;
/** the price shown before anything is spent (Google's price, 22 Nov 2026, for the default models); the server's GET answer replaces it */
export const ESTIMATES: Record<Quality, { usd: number | null; text: string }> = {
  fast: { usd: 0.04, text: "about US$0.04 a photo: US$0.0336 for the image plus input and a little thinking (Google's price, 22 Nov 2026)" },
  best: { usd: 0.15, text: "about US$0.15 a photo: US$0.134 for the image plus input and thinking (Google's price, 22 Nov 2026)" },
};
export const priceShort = (e: { usd: number | null }) => (e.usd == null ? 'see price' : `≈US$${e.usd.toFixed(2)}`);

/** the supported shape closest to w × h, by the log of the ratio (the same rule as the server) */
export function nearestRatio(w: number, h: number): string {
  const r = Math.log(w / h);
  let best = RATIOS[0], d = Infinity;
  for (const s of RATIOS) {
    const [a, b] = s.split(':').map(Number), e = Math.abs(Math.log(a / b) - r);
    if (e < d - 1e-9) { d = e; best = s; }
  }
  return best;
}
export const ratioValue = (s: string) => { const [a, b] = s.split(':').map(Number); return a / b; };

export interface Crop { sx: number; sy: number; sw: number; sh: number; dw: number; dh: number; ratio: string; trimmed: number }
/** a centred crop of a w × h frame to the nearest shape, scaled so the long side is at most MAX_EDGE and the short side at least MIN_EDGE.
 *  trimmed: the share of the frame left out (0 to 1). */
export function cropFor(w: number, h: number, maxEdge = MAX_EDGE): Crop {
  const ratio = nearestRatio(w, h), r = ratioValue(ratio);
  let sw = w, sh = h;
  if (w / h > r) sw = Math.round(h * r); else sh = Math.round(w / r);
  const sx = Math.floor((w - sw) / 2), sy = Math.floor((h - sh) / 2);
  let k = Math.min(1, maxEdge / Math.max(sw, sh));
  if (Math.min(sw, sh) * k < MIN_EDGE) k = MIN_EDGE / Math.min(sw, sh);
  // the output keeps the shape exactly (rounding can drift a pixel: fix the short side from the long one)
  let dw: number, dh: number;
  if (r >= 1) { dw = Math.round(sw * k); dh = Math.round(dw / r); } else { dh = Math.round(sh * k); dw = Math.round(dh * r); }
  return { sx, sy, sw, sh, dw, dh, ratio, trimmed: 1 - (sw * sh) / (w * h) };
}

/** the time of day that matches the model's sun hour, until the person picks one */
export function timeFromSun(hour: number): Time {
  if (!Number.isFinite(hour)) return 'golden';
  return hour < 10 ? 'morning' : hour < 15 ? 'midday' : 'golden';
}

export const cleanSetting = (s: string) => String(s ?? '').replace(/[\u0000-\u001f\u007f<>{}[\]`\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, SETTING_MAX);

/** the request body /api/render takes: pressing the button beside the shown price is the confirmation. `line` is the line
 *  drawing of the same view from the model's geometry (photoreal/lines.ts), sent as a second image when the page could draw it */
export function requestBody(image: string, quality: Quality, time: Time, season: Season, setting: string, line?: string | null) {
  const look: { time: Time; season?: Season; setting?: string } = { time };
  if (season) look.season = season;
  const s = cleanSetting(setting);
  if (s) look.setting = s;
  return { image, quality, look, ...(line ? { line } : {}), confirm: true as const };
}

/** plain words for a failed request: the server's own message when it sent one */
export function errorText(status: number, body: unknown): string {
  const m = (body as { message?: unknown } | null)?.message;
  if (typeof m === 'string' && m.trim()) return m.trim();
  if (status === 0) return 'Could not reach the lab. Check the connection and try again.';
  if (status === 404) return 'Photos are not available on this copy of the lab.';
  if (status === 413) return 'That view is too big to send. Make the window smaller and try again.';
  if (status === 429) return 'Too many photos for now. Wait a minute and try again.';
  if (status >= 500) return 'Google Gemini could not make the photo. Nothing is shown rather than a guess.';
  return 'The photo could not be made. Try again.';
}

export interface Result { before: string; after: string; ratio: string; quality: Quality; time: Time; season: Season; setting: string; model: string; tookMs: number; prompt: string; at: number }
/** newest first, at most KEEP: kept in memory for this tab only */
export function keepRecent(list: Result[], r: Result, keep = KEEP): Result[] {
  return [r, ...list].slice(0, keep);
}

const pad = (n: number) => String(n).padStart(2, '0');
export function fileName(key: string, quality: Quality, at: Date): string {
  return `${key}-photo-${quality}-${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}.jpg`;
}
export const seconds = (ms: number) => (ms < 10_000 ? (ms / 1000).toFixed(1) : String(Math.round(ms / 1000))) + ' s';
export const qualityName = (q: Quality) => (q === 'best' ? 'Best' : 'Fast');
export const timeName = (t: Time) => TIMES.find(([k]) => k === t)?.[1] ?? t;
