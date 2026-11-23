// "Make photoreal still + film": the parts with no browser in them, so Node runs them in tests (it strips the types as it loads).
// No imports. photoFinish.ts is the page side. What is here:
//   - the label every output carries, and what the button costs (Google's published prices, cited below with the date read);
//   - how the confirmed fly-through is cut into short clips, one or more a shot, within Google's limits;
//   - the order a line drawing is drawn in for the title card (stroke by stroke: each joined line in turn, along its length);
//   - where the title card, the logo bug, the closing card and a still's footer strip sit, at any size.
// The brand itself (the practice's name, logo and drawing) is read from the workspace at run time (practiceLook.ts): nothing of
// any practice is written here.

/** on every output, in the viewer, burned into stills and films, and in the record saved back to the project */
export const FINISH_LABEL = 'AI-finished from the browser render, look only — not a design change';
/** the closing card's line */
export const END_LINE = 'Visualisation, not for construction';

// ---- models and prices ----------------------------------------------------------------------------------------------------
// Read from Google's own docs on 23 Nov 2026 (ai.google.dev redirects to aistudio.google.com/docs):
//   aistudio.google.com/docs/image-generation.md: Nano Banana Pro (gemini-3-pro-image) is "the premium choice for complex visual
//     tasks", thinking always on, sizes 1K, 2K and 4K. The highest-quality still is that model at 4K (functions/api/render.js,
//     quality 'finest').
//   aistudio.google.com/docs/veo.md: the Veo 3.1 preview models (veo-3.1-generate-preview, -fast-, -lite-) "shut down on
//     October 22, 2026"; Veo takes a first frame and reference images but cannot edit a video the caller sends (only extend a
//     Veo-made one), so it could not keep the browser film's geometry in any case. Veo is not on the Gemini API pricing page.
//   aistudio.google.com/docs/models/gemini-omni-flash.md: gemini-omni-1.2-flash, stable (Nov 2026), edits input video up to
//     15 s, output 3 to 15 s at 24 FPS, 360p / 720p / 1080p / 4K. There is no Pro tier of Omni. Its quality lever is the size:
//     the pricing page bills 1080p and 4K "with upsampling" from the 720p generation.
//   aistudio.google.com/docs/pricing.md#gemini-omni-1.2-flash: US$12 per 1M video output tokens; 5,792 tokens a second of 720p
//     (about US$0.07 a second), 1,931 at 360p, 8,688 at 1080p (US$0.104 a second), 17,376 at 4K (US$0.209 a second); input
//     US$1.50 per 1M tokens.
//   aistudio.google.com/docs/pricing.md#gemini-3-pro-image: a 4K image is 2,000 output tokens at US$120 per 1M = US$0.24; an
//     input image is 560 tokens = US$0.0011; text and thinking US$12 per 1M.
// The film endpoint (functions/api/film.js) takes 360p, 720p and 1080p; it refuses 4K (a 4K clip comes back inline, too big
// to pass through the lab's function), so the film's quality default here is 1080p, the largest the lab sends for.
export const STILL_MODEL = 'gemini-3-pro-image';
export const STILL_SIZE = '4K';
export const FILM_MODEL = 'gemini-omni-1.2-flash';
export const FILM_SIZES = ['1080p', '720p'] as const;
export type FilmSize = (typeof FILM_SIZES)[number];
export const PRICES = {
  read: '23 Nov 2026',
  still: { usd: 0.26, text: 'US$0.24 for the 4K image (2,000 tokens at US$120 per 1M), US$0.0022 for the two input images, about US$0.02 thinking' },
  filmPerSecond: { '720p': (5792 * 12) / 1e6, '1080p': (8688 * 12) / 1e6 } as Record<FilmSize, number>,
  /** the input clip, the look still and the guide frame, billed at US$1.50 per 1M input tokens: a cent or two a clip, allowed for */
  filmInputPerClip: 0.02,
  /** the look critique (functions/api/agent-judge.js, OpenAI first): a few thousand text tokens; an allowance, not Google's price */
  judge: 0.03,
};
const cents = (v: number) => Math.round(v * 100) / 100;

export interface Part { index: number; from: number; to: number; seconds: number; ask: number; shots: string[] }
export interface Estimate { still: number; film: number; judge: number; total: number; lines: string[] }

/** what the button will spend, from the plan (the server's own GET estimates replace the per-second rates where they differ) */
export function estimate(o: { still: boolean; parts: Part[]; size: FilmSize; judge: boolean; perSecond?: Partial<Record<FilmSize, number>>; stillUsd?: number }): Estimate {
  const ps = o.perSecond?.[o.size] ?? PRICES.filmPerSecond[o.size];
  const still = o.still ? (o.stillUsd ?? PRICES.still.usd) : 0;
  const secs = o.parts.reduce((s, p) => s + p.ask, 0);
  const film = o.parts.length ? secs * ps + o.parts.length * PRICES.filmInputPerClip : 0;
  const judge = o.judge ? PRICES.judge * ((o.still ? 1 : 0) + (o.parts.length ? 1 : 0)) : 0;
  const lines: string[] = [];
  if (o.still) lines.push(`Still: Nano Banana Pro (${STILL_MODEL}) at ${STILL_SIZE}, about US$${still.toFixed(2)} (${PRICES.still.text}).`);
  if (o.parts.length) lines.push(`Film: ${o.parts.length} clip${o.parts.length === 1 ? '' : 's'}, ${secs} s in all, Gemini Omni 1.2 Flash (${FILM_MODEL}) at ${o.size}${o.size === '1080p' ? ' (Google upsamples from 720p)' : ''}, about US$${cents(film).toFixed(2)} (US$${ps.toFixed(3)} a second, plus input).`);
  if (judge) lines.push(`Look critique: about US$${judge.toFixed(2)} (a text model; OpenAI first, then Gemini, then Claude).`);
  return { still: cents(still), film: cents(film), judge: cents(judge), total: cents(still + film + judge), lines };
}

// ---- the clips ----------------------------------------------------------------------------------------------------------
/**
 * Cut a film of `duration` seconds into clips for Google: a clip a shot where it can (cut where each shot arrives), each at
 * least `min` and at most `max` seconds. Cuts are on whole seconds; a clip under `min` joins its neighbour, one over `max` is
 * split evenly. The last clip keeps the film's own end; `ask` is the whole seconds asked of Google (the join trims it back).
 */
export function planParts(duration: number, marks: { id: string; arrive: number }[], max = 10, min = 3): Part[] {
  if (!(duration >= min - 1e-9)) throw new Error(`a film shorter than ${min} s cannot be sent`);
  const end = duration;
  let cuts = [...new Set(marks.map((m) => Math.round(m.arrive)).filter((t) => t > 0 && t < Math.floor(end + 1e-9)))].sort((a, b) => a - b);
  let edges = [0, ...cuts, end];
  // join any clip shorter than min to the one after it (the last one to the one before)
  for (let changed = true; changed;) {
    changed = false;
    for (let i = 0; i < edges.length - 1; i++) {
      if (edges[i + 1] - edges[i] < min - 1e-9 && edges.length > 2) { edges.splice(i + 1 === edges.length - 1 ? i : i + 1, 1); changed = true; break; }
    }
  }
  const out: Part[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const a = edges[i], b = edges[i + 1], n = Math.ceil((b - a) / max - 1e-9);
    for (let k = 0; k < n; k++) {
      const from = k === 0 ? a : Math.round(a + ((b - a) * k) / n), to = k === n - 1 ? b : Math.round(a + ((b - a) * (k + 1)) / n);
      const seconds = to - from;
      out.push({ index: out.length, from, to, seconds, ask: Math.min(max, Math.max(min, Math.ceil(seconds - 1e-9))), shots: marks.filter((m) => m.arrive >= from - 0.5 && m.arrive < to - 0.5).map((m) => m.id) });
    }
  }
  if (out.some((p) => p.seconds < min - 1e-9 || p.ask > max)) throw new Error('the film cannot be cut into clips within the limits');
  return out;
}

// ---- the title card's drawing, stroke by stroke ------------------------------------------------------------------------
/**
 * The order a drawing's ink is drawn in, as a time from 0 to 1 for each pixel (-1 where there is no ink). Each joined line
 * (8-connected ink) is one stroke; strokes are drawn one after another, left to right, each taking time in proportion to its
 * ink, and each is drawn outward along its length from its leftmost end (the distance walked through the ink, not straight).
 * Deterministic: the same drawing always draws the same way.
 */
export function revealOrder(ink: Uint8Array, w: number, h: number, threshold = 48): Float32Array {
  const n = w * h, t = new Float32Array(n).fill(-1), comp = new Int32Array(n).fill(-1);
  const strokes: { seed: number; size: number; minX: number; minY: number }[] = [];
  const stack: number[] = [];
  for (let i = 0; i < n; i++) {
    if (ink[i] < threshold || comp[i] >= 0) continue;
    const id = strokes.length; let size = 0, minX = w, minY = h, seed = i;
    comp[i] = id; stack.push(i);
    while (stack.length) {
      const p = stack.pop()!, x = p % w, y = (p - x) / w; size++;
      if (x < minX || (x === minX && y < minY)) { minX = x; minY = y; seed = p; }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const q = yy * w + xx; if (comp[q] < 0 && ink[q] >= threshold) { comp[q] = id; stack.push(q); }
      }
    }
    strokes.push({ seed, size, minX, minY });
  }
  if (!strokes.length) return t;
  const order = strokes.map((s, i) => i).sort((a, b) => strokes[a].minX - strokes[b].minX || strokes[a].minY - strokes[b].minY || a - b);
  const total = strokes.reduce((s, k) => s + k.size, 0);
  const dist = new Int32Array(n).fill(-1);
  let start = 0;
  for (const id of order) {
    const s = strokes[id], q: number[] = [s.seed]; dist[s.seed] = 0; let far = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const p = q[qi], x = p % w, y = (p - x) / w;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const r = yy * w + xx; if (comp[r] === id && dist[r] < 0) { dist[r] = dist[p] + 1; if (dist[r] > far) far = dist[r]; q.push(r); }
      }
    }
    const span = s.size / total;
    for (const p of q) t[p] = start + span * (far ? dist[p] / far : 1);
    start += span;
  }
  return t;
}

/** ink of a drawing's pixels (RGBA): 'mask' files are grey line work (white = line); 'image' files are drawn on transparent */
export function inkOf(rgba: Uint8Array | Uint8ClampedArray, mode: 'mask' | 'image'): Uint8Array {
  const n = rgba.length >> 2, out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = mode === 'mask' ? Math.round((rgba[i * 4] + rgba[i * 4 + 1] + rgba[i * 4 + 2]) / 3) : rgba[i * 4 + 3];
  return out;
}
/** the model's own line drawing (lines.ts: black = building edge on white) as ink, for a title card with no practice drawing */
export function inkOfLineDrawing(rgba: Uint8Array | Uint8ClampedArray): Uint8Array {
  const n = rgba.length >> 2, out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = 255 - rgba[i * 4];
  return out;
}

// ---- where things sit -------------------------------------------------------------------------------------------------------
export interface Box { x: number; y: number; w: number; h: number }
/** the cards: the drawing's box (kept to its shape), the logo's, and the text lines' baselines and sizes; any W × H */
export function cardLayout(W: number, H: number, drawing: { w: number; h: number } | null, kind: 'title' | 'end') {
  const u = Math.min(W, H * 16 / 9) / 100, upright = H > W;
  const area: Box = kind === 'title'
    ? (upright ? { x: W * 0.08, y: H * 0.14, w: W * 0.84, h: H * 0.42 } : { x: W * 0.07, y: H * 0.1, w: W * 0.52, h: H * 0.8 })
    : { x: W * 0.3, y: H * 0.08, w: W * 0.4, h: H * 0.28 };
  let draw: Box | null = null;
  if (drawing && drawing.w > 0 && drawing.h > 0) {
    const k = Math.min(area.w / drawing.w, area.h / drawing.h), w = drawing.w * k, h = drawing.h * k;
    draw = { x: area.x + (area.w - w) / 2, y: area.y + (area.h - h) / 2, w, h };
  }
  const textX = kind === 'title' ? (upright ? W * 0.08 : W * 0.63) : W / 2;
  const logo: Box = kind === 'title'
    ? (upright ? { x: textX, y: H * 0.62, w: W * 0.4, h: H * 0.06 } : { x: textX, y: H * 0.34, w: W * 0.3, h: H * 0.11 })
    : { x: W / 2 - W * 0.14, y: H * 0.42, w: W * 0.28, h: H * 0.12 };
  const titleSize = Math.round(kind === 'title' ? u * (upright ? 7.5 : 4.6) : u * 3.6), smallSize = Math.round(u * (upright ? 2.6 : 1.7));
  const y0 = logo.y + logo.h + titleSize * 1.5;
  return { draw, logo, align: (kind === 'title' ? 'left' : 'center') as 'left' | 'center', textX, titleSize, smallSize, lines: [y0, y0 + titleSize * 0.4 + smallSize * 1.8, y0 + titleSize * 0.4 + smallSize * 3.6] };
}
/** the logo bug in every film frame: bottom right, inside a 4% margin, about 9% of the width at most */
export function bugBox(W: number, H: number, logo: { w: number; h: number } | null): Box {
  const m = Math.round(Math.min(W, H) * 0.04), maxW = W * 0.09, maxH = H * 0.06;
  const r = logo && logo.w > 0 && logo.h > 0 ? logo.w / logo.h : 3;
  let w = maxW, h = w / r; if (h > maxH) { h = maxH; w = h * r; }
  return { x: Math.round(W - m - w), y: Math.round(H - m - h), w: Math.round(w), h: Math.round(h) };
}
/** a still's footer strip: a slim band under the picture (never over it), its height and the logo's box in it */
export function footerLayout(W: number, H: number, logo: { w: number; h: number } | null) {
  const band = Math.max(36, Math.round(H * 0.05)), pad = Math.round(band * 0.25), lh = band - pad * 2;
  const r = logo && logo.w > 0 && logo.h > 0 ? logo.w / logo.h : 0;
  const logoBox: Box | null = r ? { x: W - pad - Math.round(Math.min(W * 0.2, lh * r)), y: H + pad, w: Math.round(Math.min(W * 0.2, lh * r)), h: lh } : null;
  return { band, pad, logo: logoBox, text: { x: pad * 2, y: H + band / 2, size: Math.max(10, Math.round(band * 0.3)) } };
}
/** the title card's progress at time s of `secs`: the drawing over the first 70%, then held; eased */
export function titleProgress(s: number, secs: number) {
  const u = Math.max(0, Math.min(1, s / (secs * 0.7)));
  return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
}
export const TITLE_SECS = 2.5;
export const END_SECS = 2.5;

// ---- the gate -----------------------------------------------------------------------------------------------------------------
export type Gate = { verdict: 'holds' | 'drifts' | 'not checked'; geometry: number | null; match: number | null; words: string };
/**
 * The gate on an AI finish: the free geometry check (photoreal/geocheck.ts: does the result keep the browser render's edges?)
 * and, where it was had, the look critique's match score (agent-judge, 1 to 5). A result whose geometry drifts is marked and
 * not offered as the finish; a person still looks at every picture. The critique never approves.
 */
export function gateOf(geo: { verdict: 'holds' | 'drifts'; score: number } | null, judge: { match: number | null; summary?: string } | null): Gate {
  const g = geo ? Math.round(geo.score * 100) / 100 : null, m = judge?.match ?? null;
  const verdict: Gate['verdict'] = geo ? geo.verdict : 'not checked';
  const words = [
    geo ? `Geometry ${geo.verdict === 'holds' ? 'holds' : 'drifts'}: ${Math.round(geo.score * 100)}% of the building's edges kept above chance` : 'Geometry not checked',
    m != null ? `look critique: match ${m} of 5${judge?.summary ? ` (${judge.summary})` : ''}` : '',
  ].filter(Boolean).join('; ');
  return { verdict, geometry: g, match: m, words: `${words}. For a person to review.` };
}
