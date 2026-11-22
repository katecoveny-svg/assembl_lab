// Reading a drawing into a plan model: a PDF sheet or a picture of a plan in, buildings out.
//  1. A vector PDF is measured exactly from its linework (the lab's Plan Studio reader).
//  2. A sheet whose plan is an embedded picture (many CAD exports), a scan or a photo goes to the lab's AI plan reader,
//     one crop per plan found on the sheet (the room labels in the text layer say where the plans are).
//  3. Either way the result is straightened, snapped to the written dimension strings where they agree, and turned into
//     the rectangular home the twin builds. Every element keeps where it came from: written, traced, read by AI, assumed.
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import type { BuildingSpec, Opening, PartitionSpec, RoomSpec, Src, WallSpec } from './homes';
import { modelFromDrawing, readPdfPage, toReal } from './planread';
import { readingOrder, suggestNames, unprinted, type Link } from './roomNames';

type Pt = [number, number];
const PT_MM = 25.4 / 72;

// ------------------------------------------------------------------------------------------------ what a reader returns
// Coordinates are pixels of the image the reader looked at (x right, y down). mmPerPx turns them into real millimetres.
export interface TraceWall { a: Pt; b: Pt; t: number; ext: boolean; conf: number }
export interface TraceOpening { kind: string; a: Pt; b: Pt; conf: number }
export interface TraceRoom { name: string; x: number; y: number; w: number; h: number; area?: number; conf: number; fixtures?: string }
export interface TraceDim { value: number; a: Pt; b: Pt }
export interface TraceRead {
  label: string;
  src: 'drawing' | 'ai';
  walls: TraceWall[];
  openings: TraceOpening[];
  rooms: TraceRoom[];
  dims: TraceDim[];
  north: number | null;
  mmPerPx: number | null;
  /** the crop's top-left on the sheet, in real mm, so several plans on one sheet keep their places */
  offsetMm: Pt;
  scaleNote: string;
  notes: string;
  image: HTMLCanvasElement;
  /** the AI reader's prompt revision, when its reply says (replies before 2026-11-22b do not) */
  rev?: string;
  /** the model that answered, when the AI reader read it */
  model?: string;
}

// ------------------------------------------------------------------------------------------------ pdf.js
let lib: typeof import('pdfjs-dist') | null = null;
export async function pdfLib() {
  if (!lib) {
    const m = await import('pdfjs-dist');
    const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    m.GlobalWorkerOptions.workerSrc = worker;
    lib = m;
  }
  return lib;
}
export async function openPdf(bytes: ArrayBuffer) {
  const L = await pdfLib();
  return L.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
}

export interface TextItem { str: string; x: number; y: number; h: number }
/** text runs in viewport points at scale 1 (x right, y down from the top of the sheet) */
export async function pageText(page: PDFPageProxy): Promise<TextItem[]> {
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const out: TextItem[] = [];
  for (const it of tc.items) {
    if (!('str' in it) || !it.str.trim()) continue;
    const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
    out.push({ str: it.str.trim(), x, y, h: Math.hypot(it.transform[2], it.transform[3]) || 8 });
  }
  return out;
}

const ROOM_RE = /^(master\s+)?(bed(room)?\s*\d*|lounge|living(\s+room)?|kitchen(ette)?|bath(room)?|ensuite|en-suite|wc|toilet|dining|laundry|office|study|garage|entry|foyer|hall(way)?|family|rumpus|media|scullery|pantry|w\.?i\.?r\.?|studio|store|utility|mud\s*room|guest|lobby|reception|cafe|café|shop|retail)\b/i;
const isRoomLabel = (s: string) => s.length <= 26 && ROOM_RE.test(s);

export interface SheetInfo { page: number; title: string; score: number; rooms: number; role: 'plan' | 'site' | 'elevation' | 'section' | 'other' }
/** what each sheet is: the floor plans score highest */
export async function surveySheets(doc: PDFDocumentProxy): Promise<SheetInfo[]> {
  const out: SheetInfo[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const items = await pageText(await doc.getPage(p));
    const all = items.map((t) => t.str).join(' ');
    const rooms = items.filter((t) => isRoomLabel(t.str)).length;
    // titles are short runs: "Ground Floor Plan", "SITE SECTIONS". Long runs are notes ("refer floor plans for wall types"),
    // which must not make a notes sheet look like a plan.
    const titles = items.map((t) => t.str.trim()).filter((t) => t.length <= 40);
    let score = rooms * 3;
    if (titles.some((t) => PLAN_TITLE.test(t))) score += 10;
    else if (/floor\s*plans?|ground\s*(floor|level)|first\s*floor|upper\s*floor|level\s*\d+\s*plan|proposed\s*plans?/i.test(all)) score += 3;
    for (const re of [/elevation/i, /\bsections?\b/i, /site\s*(plan|layout)|location\s*plan|area\s*plans?|coverage/i, /roof\s*plan/i, /wall\s*types|partition\s*walls|notes\s*(&|and)\s*legends?|legends?$|schedule|cover\s*sheet|planning\s*controls|sketch\s*views?/i])
      if (titles.some((t) => re.test(t))) score -= 4;
    if (all.length > 6000) score -= 4;
    // the sheet's title: the largest run that names a kind of drawing
    const titled = items.filter((t) => /plan|elevation|section|site|layout/i.test(t.str) && t.str.length < 60).sort((a, b) => b.h - a.h);
    const title = titled[0]?.str ?? (rooms ? `${rooms} room labels` : 'no text');
    const role = /\brefer\b|\bsee\b/i.test(title) ? 'other' : PLAN_TITLE.test(title.trim()) || score >= 10 ? 'plan' : /site\s*(layout|plan)|area\s*plans?|landscap/i.test(title) ? 'site' : /elevation/i.test(title) ? 'elevation' : /\bsections?\b/i.test(title) ? 'section' : 'other';
    out.push({ page: p, title, score, rooms, role });
  }
  return out;
}
const PLAN_TITLE = /^((proposed|existing|new)\s+)?((ground|first|second|third|upper|lower|mezzanine|basement|attic)\s+)?(floor\s+)?plans?$|^level\s*\d+\s*(floor\s*)?plan$/i;

// ------------------------------------------------------------------------------------------------ the drawing's scale
// "1:50" from the sheet text, with two traps handled:
//  - title-block templates that list every standard scale ("1:500 1:1000 1:200 … 1:10") in one place: ignored.
//  - a scale written for a bigger paper size ("1 : 25@A1", "A1 SCALE") on a sheet printed smaller: converted to the scale
//    the drawing actually has on this PDF (1:25 at A1 is 1:50 on an A3 page).
const PAPER: Record<string, number> = { A0: 1189, A1: 841, A2: 594, A3: 420, A4: 297 };
export function sheetScale(items: TextItem[], pageW: number, pageH: number): { scale: number; note: string } | null {
  const hits = items.flatMap((t) => {
    const m = t.str.match(/\b1\s*[:：]\s*(\d{2,4})\b(?:\s*@\s*(A[0-4]))?/i);
    return m ? [{ t, s: +m[1], paper: m[2]?.toUpperCase() }] : [];
  });
  const legend = (h: (typeof hits)[number]) => hits.filter((o) => o !== h && o.s !== h.s && Math.hypot(o.t.x - h.t.x, o.t.y - h.t.y) < 80).length >= 3;
  const real = hits.filter((h) => !legend(h));
  if (!real.length) return null;
  const score = new Map<number, number>(), first = new Map<number, number>();
  real.forEach((h, i) => {
    const nearTitle = items.some((t) => t.str.length <= 40 && /plan|elevation|section/i.test(t.str) && Math.hypot(t.x - h.t.x, t.y - h.t.y) < 60);
    score.set(h.s, (score.get(h.s) || 0) + 1 + (h.paper ? 1 : 0) + (nearTitle ? 2 : 0));
    if (!first.has(h.s)) first.set(h.s, i);
  });
  const best = [...score.entries()].sort((a, b) => b[1] - a[1] || first.get(a[0])! - first.get(b[0])!)[0][0];
  let paper = real.find((h) => h.s === best && h.paper)?.paper || real.find((h) => h.paper)?.paper;
  if (!paper) { const m = items.map((t) => t.str.match(/\b(A[0-4])\s*SCALE\b/i) || t.str.match(/@\s*(A[0-4])\b/i)).find(Boolean); if (m) paper = m[1].toUpperCase(); }
  const pageLong = Math.max(pageW, pageH) * PT_MM;
  const others = [...new Set(real.map((h) => h.s))].filter((s) => s !== best);
  const also = others.length ? ` (also saw ${others.map((s) => `1:${s}`).join(', ')})` : '';
  if (paper && PAPER[paper] && Math.abs(PAPER[paper] / pageLong - 1) > 0.08) {
    const eff = Math.round((best * PAPER[paper]) / pageLong);
    return { scale: eff, note: `Read "1:${best} at ${paper}" from the sheet${also}. This PDF is ${paperName(pageLong)}, so the drawing is 1:${eff} at this size.` };
  }
  return { scale: best, note: `Read "1:${best}" from the sheet text${also}.` };
}
const paperName = (mm: number) => Object.entries(PAPER).find(([, v]) => Math.abs(v / mm - 1) < 0.04)?.[0] ?? `${Math.round(mm)} mm`;

// the drawing on a sheet with no room labels. Solid walls are the heaviest ink on a plan sheet.
//  - the title block is found from its own words (drawing no., scale, checked, general notes…) and left out;
//  - ink is joined through mid-grey lines too, so glazing and doors do not split the building into pieces;
//  - the cluster holding the most heavy ink (ink that survives thinning: walls, not text or hatching) is the plan,
//    with any heavy clusters right beside it.
export function titleBand(items: TextItem[], W: number, H: number): { bottom?: number; right?: number } {
  const adm = items.filter((t) => /drawing\s*(no|number|title)?\b|^scale\b|\bproject\b|checked|drawn|revision|\brev\b|general notes|do not scale|copyright/i.test(t.str));
  const bottom = adm.filter((t) => t.y > H * 0.6), right = adm.filter((t) => t.x > W * 0.65 && t.y <= H * 0.6);
  if (bottom.length >= 3 && bottom.length >= right.length) return { bottom: Math.min(...bottom.map((t) => t.y - t.h)) - 10 };
  if (right.length >= 3) return { right: Math.min(...right.map((t) => t.x)) - 10 };
  return {};
}
async function inkBox(page: PDFPageProxy, items: TextItem[]): Promise<[number, number, number, number] | null> {
  const vp = page.getViewport({ scale: 1 });
  const { canvas, s } = await renderRegion(page, [0, 0, vp.width, vp.height], 1400);
  const W = canvas.width, H = canvas.height, N = W * H, px = canvas.getContext('2d')!.getImageData(0, 0, W, H).data;
  const band = titleBand(items, vp.width, vp.height);
  const yMax = band.bottom ? Math.floor(band.bottom * s) : H, xMax = band.right ? Math.floor(band.right * s) : W;
  const dark = new Uint8Array(N), grey = new Uint8Array(N);
  for (let y = 0; y < yMax; y++) for (let x = 0; x < xMax; x++) {
    const i = y * W + x, l = 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2];
    dark[i] = l < 70 ? 1 : 0; grey[i] = l < 170 ? 1 : 0;
  }
  const erode = (a: Uint8Array) => { const o = new Uint8Array(N); for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; o[i] = a[i] & a[i - 1] & a[i + 1] & a[i - W] & a[i + W]; } return o; };
  const heavy = erode(erode(dark));
  // close hairline gaps in the grey ink (separable 7 × 7 box)
  const R = 3, row = new Uint8Array(N), J = new Uint8Array(N);
  for (let y = 0; y < H; y++) { const pre = new Int32Array(W + 1); for (let x = 0; x < W; x++) pre[x + 1] = pre[x] + grey[y * W + x]; for (let x = 0; x < W; x++) row[y * W + x] = pre[Math.min(W, x + R + 1)] - pre[Math.max(0, x - R)] > 0 ? 1 : 0; }
  for (let x = 0; x < W; x++) { const pre = new Int32Array(H + 1); for (let y = 0; y < H; y++) pre[y + 1] = pre[y] + row[y * W + x]; for (let y = 0; y < H; y++) J[y * W + x] = pre[Math.min(H, y + R + 1)] - pre[Math.max(0, y - R)] > 0 ? 1 : 0; }
  const seen = new Uint8Array(N), stack: number[] = [];
  const comps: { b: [number, number, number, number]; heavy: number }[] = [];
  for (let i = 0; i < N; i++) {
    if (!J[i] || seen[i]) continue;
    let x0 = W, y0 = H, x1 = -1, y1 = -1, hv = 0;
    seen[i] = 1; stack.push(i);
    while (stack.length) {
      const k = stack.pop()!, x = k % W, y = (k / W) | 0;
      if (heavy[k]) hv++;
      if (grey[k]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x > 0 && J[k - 1] && !seen[k - 1]) { seen[k - 1] = 1; stack.push(k - 1); }
      if (x < W - 1 && J[k + 1] && !seen[k + 1]) { seen[k + 1] = 1; stack.push(k + 1); }
      if (y > 0 && J[k - W] && !seen[k - W]) { seen[k - W] = 1; stack.push(k - W); }
      if (y < H - 1 && J[k + W] && !seen[k + W]) { seen[k + W] = 1; stack.push(k + W); }
    }
    if (hv < 50 || x1 < 0) continue;
    // the sheet's border spans the sheet both ways; a plan picture can be nearly as tall as the sheet without being one
    if (x1 - x0 > W * 0.85 && y1 - y0 > H * 0.85) continue;
    if (hv / ((x1 - x0 + 1) * (y1 - y0 + 1)) > 0.45) continue; // a filled block: a logo or a solid band
    comps.push({ b: [x0, y0, x1, y1], heavy: hv });
  }
  if (!comps.length) return null;
  comps.sort((p, q) => q.heavy - p.heavy);
  const u = [...comps[0].b] as [number, number, number, number], used = new Set([0]), gap = 0.05 * W;
  for (let grew = true; grew; ) {
    grew = false;
    comps.forEach((c, j) => {
      if (used.has(j)) return;
      const dx = Math.max(0, c.b[0] - u[2], u[0] - c.b[2]), dy = Math.max(0, c.b[1] - u[3], u[1] - c.b[3]);
      if (Math.max(dx, dy) < gap) { u[0] = Math.min(u[0], c.b[0]); u[1] = Math.min(u[1], c.b[1]); u[2] = Math.max(u[2], c.b[2]); u[3] = Math.max(u[3], c.b[3]); used.add(j); grew = true; }
    });
  }
  const pw = (u[2] - u[0]) * 0.08 + 6, ph = (u[3] - u[1]) * 0.08 + 6;
  return [Math.max(0, (u[0] - pw) / s), Math.max(0, (u[1] - ph) / s), Math.min(vp.width, (u[2] + pw) / s), Math.min(vp.height, (u[3] + ph) / s)];
}

// ------------------------------------------------------------------------------------------------ where the plans are
interface Cluster { box: [number, number, number, number]; label: string; n: number }
/** groups of room labels: each group is one plan. Boxes in viewport points. */
function planClusters(items: TextItem[], scale: number | null, pageW: number, pageH: number): Cluster[] {
  const labels = items.filter((t) => isRoomLabel(t.str));
  if (!labels.length) return [];
  const ptPerMm = scale ? 1 / (PT_MM * scale) : null;
  const link = ptPerMm ? 5200 * ptPerMm : Math.max(pageW, pageH) * 0.1;
  const id = labels.map((_, i) => i);
  const find = (i: number): number => (id[i] === i ? i : (id[i] = find(id[i])));
  for (let i = 0; i < labels.length; i++)
    for (let j = i + 1; j < labels.length; j++) if (Math.hypot(labels[i].x - labels[j].x, labels[i].y - labels[j].y) < link) id[find(i)] = find(j);
  const groups = new Map<number, TextItem[]>();
  labels.forEach((t, i) => {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(t);
  });
  let out: Cluster[] = [...groups.values()]
    .filter((g) => g.length >= 2 || labels.length === 1)
    .map((g) => {
      const x0 = Math.min(...g.map((t) => t.x)), x1 = Math.max(...g.map((t) => t.x + t.str.length * t.h * 0.55));
      const y0 = Math.min(...g.map((t) => t.y - t.h)), y1 = Math.max(...g.map((t) => t.y));
      const pad = Math.max(ptPerMm ? 3000 * ptPerMm : 0, 0.38 * Math.max(x1 - x0, y1 - y0));
      const box: [number, number, number, number] = [Math.max(0, x0 - pad), Math.max(0, y0 - pad), Math.min(pageW, x1 + pad), Math.min(pageH, y1 + pad)];
      // a name for the plan: "Unit 16C" or similar written inside it
      const inside = items.filter((t) => t.x > x0 - pad / 2 && t.x < x1 + pad / 2 && t.y > y0 - pad / 2 && t.y < y1 + pad / 2);
      const nm = inside.map((t) => t.str.match(/\b(unit|dwelling|house|home|villa|apartment|apt|flat|lot|building|block)\s*[\w-]{1,6}\b/i)?.[0]).find(Boolean);
      return { box, label: nm ? nm.replace(/\s+/g, ' ').replace(/^\w/, (c) => c.toUpperCase()).replace(/^(\w+)\s/, (m) => m[0] + m.slice(1).toLowerCase()) : '', n: g.length };
    })
    .sort((a, b) => b.n - a.n)
    .slice(0, 4);
  // merge plans whose crops mostly overlap (one plan, labels far apart)
  const merged: Cluster[] = [];
  for (const c of out) {
    const m = merged.find((d) => {
      const ix = Math.min(c.box[2], d.box[2]) - Math.max(c.box[0], d.box[0]), iy = Math.min(c.box[3], d.box[3]) - Math.max(c.box[1], d.box[1]);
      const a = (c.box[2] - c.box[0]) * (c.box[3] - c.box[1]);
      return ix > 0 && iy > 0 && (ix * iy) / a > 0.6;
    });
    if (m) m.box = [Math.min(m.box[0], c.box[0]), Math.min(m.box[1], c.box[1]), Math.max(m.box[2], c.box[2]), Math.max(m.box[3], c.box[3])];
    else merged.push({ ...c });
  }
  out = merged;
  out.forEach((c, i) => (c.label ||= out.length > 1 ? `Plan ${i + 1}` : 'Traced plan'));
  return out;
}

export async function renderRegion(page: PDFPageProxy, box: [number, number, number, number], longEdge = 1568) {
  const w = box[2] - box[0], h = box[3] - box[1];
  const s = longEdge / Math.max(w, h);
  const vp = page.getViewport({ scale: s });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * s);
  canvas.height = Math.round(h * s);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp, transform: [1, 0, 0, 1, -box[0] * s, -box[1] * s] }).promise;
  return { canvas, s };
}

export async function sheetThumb(page: PDFPageProxy, longEdge = 520) {
  const vp = page.getViewport({ scale: 1 });
  return (await renderRegion(page, [0, 0, vp.width, vp.height], longEdge)).canvas;
}

// ------------------------------------------------------------------------------------------------ the AI plan reader
const API = typeof location === 'undefined' || /assembl\.co\.nz$|^localhost$|^127\.0\.0\.1$/.test(location.hostname) ? '/api/plan-read/' : 'https://lab.assembl.co.nz/api/plan-read/';
export async function aiStatus(): Promise<{ configured: boolean; model?: string }> {
  try {
    return await (await fetch(API)).json();
  } catch {
    return { configured: false };
  }
}
interface AiPlan {
  scale_text: string | null;
  north_deg: number | null;
  walls: { x1: number; y1: number; x2: number; y2: number; thickness_px: number; external: boolean; confidence: number }[];
  openings: { kind: string; x1: number; y1: number; x2: number; y2: number; confidence: number }[];
  rooms: { name: string; x: number; y: number; w: number; h: number; confidence: number; fixtures?: string }[];
  dimensions: { text: string; x1: number; y1: number; x2: number; y2: number }[];
  notes: string;
}
export async function aiRead<T = AiPlan>(canvas: HTMLCanvasElement, mode: 'plan' | 'site' | 'elevation' = 'plan'): Promise<{ plan: T; model: string; rev?: string }> {
  let url = canvas.toDataURL('image/png');
  if (url.length > 4_200_000) url = canvas.toDataURL('image/jpeg', 0.88);
  const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image: url, mode }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const why: Record<string, string> = {
      not_configured: 'the AI plan reader is not set up on the lab yet',
      daily_cap: 'the AI plan reader has done its reads for today',
      too_much_on_one_sheet: 'there is too much on this sheet for one read',
      declined: 'the reader declined this image',
      image_too_large: 'the image is too large',
    };
    throw new Error(why[j.error] ?? `the AI plan reader answered ${r.status}${j.error ? ` (${j.error})` : ''}`);
  }
  return { plan: j.plan as T, model: j.model ?? 'AI', ...(typeof j.prompts === 'string' ? { rev: j.prompts } : {}) };
}

/** mm per image pixel from the dimension strings the reader found: the median of the long ones */
export function dimsScale(dims: TraceDim[]) {
  const r = dims
    .map((d) => ({ v: d.value, px: Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]) }))
    .filter((d) => d.v >= 900 && d.px >= 60)
    .map((d) => d.v / d.px)
    .sort((a, b) => a - b);
  if (r.length < 2) return null;
  return { k: r[Math.floor(r.length / 2)], n: r.length };
}

export function fromAi(plan: AiPlan, image: HTMLCanvasElement, label: string, rev?: string): Omit<TraceRead, 'mmPerPx' | 'offsetMm' | 'scaleNote'> {
  const dims: TraceDim[] = [];
  for (const d of plan.dimensions ?? []) {
    const v = +String(d.text).replace(/[^\d.]/g, '');
    if (Number.isFinite(v) && v > 0 && /^\s*\d[\d\s,.]*\s*(mm)?\s*$/i.test(d.text)) dims.push({ value: v < 100 && /\./.test(d.text) ? v * 1000 : v, a: [d.x1, d.y1], b: [d.x2, d.y2] });
  }
  return {
    label,
    src: 'ai',
    walls: (plan.walls ?? []).map((w) => ({ a: [w.x1, w.y1], b: [w.x2, w.y2], t: w.thickness_px, ext: !!w.external, conf: w.confidence })),
    openings: (plan.openings ?? []).map((o) => ({ kind: o.kind, a: [o.x1, o.y1], b: [o.x2, o.y2], conf: o.confidence })),
    rooms: (plan.rooms ?? []).map((r) => ({ name: r.name?.trim() || '?', x: r.x, y: r.y, w: r.w, h: r.h, conf: r.confidence, ...(r.fixtures ? { fixtures: r.fixtures } : {}) })),
    dims,
    north: plan.north_deg ?? null,
    notes: plan.notes ?? '',
    image,
    ...(rev ? { rev } : {}),
  };
}

/** areas written under room names ("10.50 m²"), taken from the sheet's text layer: exact where the AI only sees pixels */
function areasFromText(rooms: TraceRoom[], items: TextItem[], toPx: (x: number, y: number) => Pt) {
  const areas = items.filter((t) => /^\d{1,4}([.,]\d{1,2})?\s*(m²|m2|sqm|sq\.?\s*m)$/i.test(t.str)).map((t) => ({ v: +t.str.replace(',', '.').replace(/[^\d.]/g, ''), p: toPx(t.x, t.y) }));
  for (const r of rooms) {
    const inside = areas.filter((a) => a.p[0] > r.x && a.p[0] < r.x + r.w && a.p[1] > r.y && a.p[1] < r.y + r.h);
    if (inside.length === 1) r.area = inside[0].v;
  }
}

export type Progress = (msg: string) => void;

/** read one sheet of a PDF: the vector reader first, then the AI reader for each plan on the sheet */
export async function readSheet(doc: PDFDocumentProxy, pageNo: number, progress: Progress, useAi = false): Promise<TraceRead[] | null> {
  const page = await doc.getPage(pageNo);
  const vp1 = page.getViewport({ scale: 1 });
  const items = await pageText(page);
  const sc = sheetScale(items, vp1.width, vp1.height);
  const scale: number | null = sc?.scale ?? null;

  // 1. exact linework
  if (scale) {
    progress('Measuring the linework…');
    const L = await pdfLib();
    const raw = await readPdfPage(L, page);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = modelFromDrawing(toReal(raw, scale)) as any;
    const xs = m.walls.flatMap((w: { a: Pt; b: Pt }) => [w.a[0], w.b[0]]), ys = m.walls.flatMap((w: { a: Pt; b: Pt }) => [w.a[1], w.b[1]]);
    const W = Math.max(...xs) - Math.min(...xs), D = Math.max(...ys) - Math.min(...ys);
    const good = m.walls.filter((w: { ev: { conf: number } }) => w.ev.conf >= 0.8).length;
    // the outside walls on their own must also enclose a real footprint: a site plan's stray lines can spread 3 m
    // while its "outside walls" make a sliver, which must not be offered as a measured building
    const ex = m.walls.filter((w: { kind: string }) => w.kind === 'ext'), exs = ex.flatMap((w: { a: Pt; b: Pt }) => [w.a[0], w.b[0]]), eys = ex.flatMap((w: { a: Pt; b: Pt }) => [w.a[1], w.b[1]]);
    const We = ex.length ? Math.max(...exs) - Math.min(...exs) : 0, De = ex.length ? Math.max(...eys) - Math.min(...eys) : 0;
    if (m.walls.length >= 4 && W > 3000 && W < 80000 && D > 3000 && D < 80000 && good >= 2 && ex.length >= 3 && We > 3000 && De > 3000) {
      // walls in real mm, pdf y up, origin moved to the building's corner: back to sheet points for a preview crop
      const [ox, oy] = m.origin as Pt;
      const toVp = (p: Pt): Pt => [(p[0] + ox) / (PT_MM * scale), vp1.height - (p[1] + oy) / (PT_MM * scale)];
      const corners = m.walls.flatMap((w: { a: Pt; b: Pt }) => [toVp(w.a), toVp(w.b)]);
      const pad = 2500 / (PT_MM * scale);
      const box: [number, number, number, number] = [Math.max(0, Math.min(...corners.map((c: Pt) => c[0])) - pad), Math.max(0, Math.min(...corners.map((c: Pt) => c[1])) - pad), Math.min(vp1.width, Math.max(...corners.map((c: Pt) => c[0])) + pad), Math.min(vp1.height, Math.max(...corners.map((c: Pt) => c[1])) + pad)];
      const { canvas, s } = await renderRegion(page, box, 1400);
      const px = (p: Pt): Pt => { const v = toVp(p); return [(v[0] - box[0]) * s, (v[1] - box[1]) * s]; };
      const k = (PT_MM * scale) / s;
      const walls: TraceWall[] = m.walls.map((w: { a: Pt; b: Pt; t: number; kind: string; ev: { conf: number } }) => ({ a: px(w.a), b: px(w.b), t: w.t / k, ext: w.kind === 'ext', conf: w.ev.conf }));
      const openings: TraceOpening[] = m.openings.map((o: { wall: string; at: number; w: number; kind: string; ev: { conf: number } }) => {
        const w = m.walls.find((x: { id: string }) => x.id === o.wall);
        const L_ = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), d = [(w.b[0] - w.a[0]) / L_, (w.b[1] - w.a[1]) / L_];
        const at = (s_: number): Pt => [w.a[0] + d[0] * s_, w.a[1] + d[1] * s_];
        return { kind: o.kind, a: px(at(o.at - o.w / 2)), b: px(at(o.at + o.w / 2)), conf: o.ev.conf };
      });
      const rooms: TraceRoom[] = m.rooms.map((r: { name: string; poly: Pt[]; ev: { conf: number } }) => {
        const q = r.poly.map(px);
        const x0 = Math.min(...q.map((p) => p[0])), y0 = Math.min(...q.map((p) => p[1]));
        return { name: r.name, x: x0, y: y0, w: Math.max(...q.map((p) => p[0])) - x0, h: Math.max(...q.map((p) => p[1])) - y0, conf: r.ev.conf };
      });
      areasFromText(rooms, items, (x, y) => [(x - box[0]) * s, (y - box[1]) * s]);
      return [{ label: 'Traced plan', src: 'drawing', walls, openings, rooms, dims: [], north: null, mmPerPx: k, offsetMm: [box[0] * PT_MM * scale, box[1] * PT_MM * scale], scaleNote: sc!.note, notes: `Measured from the PDF linework: ${m.stats.walls}.`, image: canvas }];
    }
  }

  // 2. the AI reader, one crop per plan on the sheet: only when the person has said yes to sending crops to it
  if (!useAi) return null;
  const st = await aiStatus();
  if (!st.configured) throw new Error('This sheet has no measurable linework (its plan is a picture inside the PDF), and the AI plan reader is not set up on the lab.');
  let clusters = planClusters(items, scale, vp1.width, vp1.height);
  if (!clusters.length) {
    progress('No room names on this sheet: finding the plan by its linework…');
    clusters = [{ box: (await inkBox(page, items)) ?? [0, 0, vp1.width, vp1.height], label: 'Traced plan', n: 0 }];
  }
  progress(clusters.length > 1 ? `Found ${clusters.length} plans on this sheet. Reading them with the AI plan reader (about half a minute)…` : 'Reading the plan with the AI plan reader (about half a minute)…');
  const reads = await Promise.all(
    clusters.map(async (c) => {
      const { canvas, s } = await renderRegion(page, c.box);
      const { plan, model, rev } = await aiRead(canvas);
      const r = fromAi(plan, canvas, c.label, rev);
      const toPx = (x: number, y: number): Pt => [(x - c.box[0]) * s, (y - c.box[1]) * s];
      areasFromText(r.rooms, items, toPx);
      // scale: the title block, checked against the dimension strings
      const kSheet = scale ? (PT_MM * scale) / s : null;
      const kd = dimsScale(r.dims);
      let k: number | null, note: string;
      if (kSheet && kd && Math.abs(kd.k / kSheet - 1) <= 0.06) {
        k = kSheet;
        note = `1:${scale} from the title block, agreeing with ${kd.n} dimension strings (within ${(Math.abs(kd.k / kSheet - 1) * 100).toFixed(1)}%).`;
      } else if (kd) {
        k = kd.k;
        note = kSheet ? `The title block says 1:${scale}, but ${kd.n} dimension strings measure 1:${Math.round((kd.k * s) / PT_MM)} on this sheet, so the dimensions were used.` : `From ${kd.n} dimension strings (about 1:${Math.round((kd.k * s) / PT_MM)} on this sheet).`;
      } else if (kSheet) {
        k = kSheet;
        note = `1:${scale} from the title block (no dimension strings to check it against).`;
      } else {
        k = null;
        note = 'No scale on the sheet and no dimension strings: give one length.';
      }
      return { ...r, mmPerPx: k, offsetMm: [k ? c.box[0] * s * k : 0, k ? c.box[1] * s * k : 0] as Pt, scaleNote: note, notes: `Read by ${model}. ${r.notes}`, model } as TraceRead;
    }),
  );
  return reads;
}

/** a picture of a plan (a scan, a photo, a screenshot): the AI reader, scale from its dimension strings */
export async function readImage(file: File, progress: Progress): Promise<TraceRead[]> {
  const st = await aiStatus();
  if (!st.configured) throw new Error('Pictures of plans are read by the AI plan reader, which is not set up on the lab.');
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 1568 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * s);
  canvas.height = Math.round(bmp.height * s);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  progress('Reading the plan with the AI plan reader (about half a minute)…');
  const { plan, model, rev } = await aiRead(canvas);
  const r = fromAi(plan, canvas, 'Traced plan', rev);
  const kd = dimsScale(r.dims);
  return [{ ...r, mmPerPx: kd?.k ?? null, offsetMm: [0, 0], scaleNote: kd ? `From ${kd.n} dimension strings on the picture.` : 'No dimension strings found: give one length.', notes: `Read by ${model}. ${r.notes}`, model }];
}

// ------------------------------------------------------------------------------------------------ into a twin building
export interface BuildOpts { plate: number; pitch: number; floor: number; roof?: 'gable' | 'skillion' | 'flat'; high?: 'v0' | 'v1'; roofSrc?: Src }
export interface Built {
  building: BuildingSpec & { origin: [number, number]; floorLevel: number };
  W: number;
  D: number;
  report: string[];
  /** lines to draw over the reader's image, in its pixels */
  overlay: { a: Pt; b: Pt; kind: 'ext' | 'part' | 'door' | 'window' | 'slider' | 'opening' | 'deck' }[];
  labels: { at: Pt; text: string }[];
  /** sheet position of the footprint's top-left corner, real mm */
  sheetMm: Pt;
  /** the read's drawing frame (crop mm) to home metres, and the footprint's box in that frame */
  drawing: { toHome: (mm: Pt) => Pt; box: [number, number, number, number] };
}

interface Line { h: boolean; c: number; s0: number; s1: number; t: number; ext: boolean; conf: number }

const r3 = (x: number) => Math.round(x * 1000) / 1000;
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };

/** dimension chains along one axis: boundary positions where consecutive written dimensions meet */
function chains(dims: { v: number; a: number; b: number; c: number }[], anchor0: number, anchor1: number) {
  const groups: { c: number; ds: { v: number; a: number; b: number }[] }[] = [];
  for (const d of dims) {
    const g = groups.find((x) => Math.abs(x.c - d.c) < 260);
    if (g) g.ds.push(d);
    else groups.push({ c: d.c, ds: [d] });
  }
  const out: { pos: number[]; vals: number[]; closes: boolean; anchored: boolean }[] = [];
  for (const g of groups) {
    // overall dimensions (one that spans two or more others on its line) are not links in the chain
    const ds = g.ds
      .filter((d) => g.ds.filter((e) => e !== d && e.v < d.v * 0.8 && (e.a + e.b) / 2 > d.a && (e.a + e.b) / 2 < d.b).reduce((t, e) => t + e.v, 0) < d.v * 0.6)
      .sort((x, y) => x.a - y.a);
    let run: typeof ds = [];
    const flush = () => {
      if (run.length < 2) return void (run = []);
      const start = Math.abs(run[0].a - anchor0) < 300 ? anchor0 : run[0].a;
      const pos = [start];
      for (const d of run) pos.push(pos[pos.length - 1] + d.v);
      out.push({ pos, vals: run.map((d) => d.v), anchored: start === anchor0, closes: Math.abs(pos[pos.length - 1] - anchor1) < Math.max(60, (anchor1 - anchor0) * 0.012) });
      run = [];
    };
    for (const d of ds) {
      if (run.length && Math.abs(d.a - run[run.length - 1].b) > 160) flush();
      run.push(d);
    }
    flush();
  }
  return out;
}

export function toBuilding(ir: TraceRead, id: string, o: BuildOpts, mmPerPx = ir.mmPerPx): Built {
  if (!mmPerPx) throw new Error('No scale yet');
  const k = mmPerPx;
  const rep: string[] = [];
  const tr: Src = ir.src === 'ai' ? ('ai' as Src) : ('traced' as Src);
  const walls0 = ir.walls.map((w) => ({ a: [w.a[0] * k, w.a[1] * k] as Pt, b: [w.b[0] * k, w.b[1] * k] as Pt, t: w.t * k, ext: w.ext, conf: w.conf }));
  if (walls0.length < 3) throw new Error('Too few walls were found to make a building');

  // straighten: the dominant wall direction (mod 90°) becomes the axes
  let sx = 0, sy = 0;
  for (const w of walls0) { const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), a = Math.atan2(w.b[1] - w.a[1], w.b[0] - w.a[0]); sx += L * Math.cos(4 * a); sy += L * Math.sin(4 * a); }
  const theta = Math.atan2(sy, sx) / 4;
  const cx0 = med(walls0.flatMap((w) => [w.a[0], w.b[0]])), cy0 = med(walls0.flatMap((w) => [w.a[1], w.b[1]]));
  const rot = (p: Pt, t: number): Pt => { const c = Math.cos(t), s = Math.sin(t), x = p[0] - cx0, y = p[1] - cy0; return [cx0 + c * x - s * y, cy0 + s * x + c * y]; };
  const straight = Math.abs(theta) > (0.25 * Math.PI) / 180;
  if (straight) rep.push(`Straightened by ${((theta * 180) / Math.PI).toFixed(1)}° so the walls run square.`);
  // a deep plan is turned so its long side runs along the ridge
  const fw = (p: Pt): Pt => (straight ? rot(p, -theta) : p);
  const pre = walls0.map((w) => ({ ...w, a: fw(w.a), b: fw(w.b) }));
  const spanX0 = Math.max(...pre.flatMap((w) => [w.a[0], w.b[0]])) - Math.min(...pre.flatMap((w) => [w.a[0], w.b[0]]));
  const spanY0 = Math.max(...pre.flatMap((w) => [w.a[1], w.b[1]])) - Math.min(...pre.flatMap((w) => [w.a[1], w.b[1]]));
  const turn = spanY0 > spanX0 * 1.15;
  if (turn) rep.push('Turned a quarter so the long side runs along the ridge (north turns with it).');
  const T = (p: Pt): Pt => { const q = fw(p); return turn ? [-q[1], q[0]] : q; };
  const Tinv = (q: Pt): Pt => { const p: Pt = turn ? [q[1], -q[0]] : q; return straight ? rot(p, theta) : p; };
  const toPx = (q: Pt): Pt => { const p = Tinv(q); return [p[0] / k, p[1] / k]; };

  const lines: Line[] = walls0.map((w) => {
    const a = T(w.a), b = T(w.b), h = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
    return h ? { h, c: (a[1] + b[1]) / 2, s0: Math.min(a[0], b[0]), s1: Math.max(a[0], b[0]), t: w.t, ext: w.ext, conf: w.conf } : { h, c: (a[0] + b[0]) / 2, s0: Math.min(a[1], b[1]), s1: Math.max(a[1], b[1]), t: w.t, ext: w.ext, conf: w.conf };
  });
  const dims = ir.dims.map((d) => {
    const a = T([d.a[0] * k, d.a[1] * k]), b = T([d.b[0] * k, d.b[1] * k]), h = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
    return { v: d.value, h, a: h ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]), b: h ? Math.max(a[0], b[0]) : Math.max(a[1], b[1]), c: h ? (a[1] + b[1]) / 2 : (a[0] + b[0]) / 2 };
  });

  // the outside walls
  const allX = lines.flatMap((l) => (l.h ? [l.s0, l.s1] : [l.c])), allY = lines.flatMap((l) => (l.h ? [l.c] : [l.s0, l.s1]));
  const bb = [Math.min(...allX), Math.min(...allY), Math.max(...allX), Math.max(...allY)];
  let E = lines.filter((l) => l.ext);
  if (E.length < 3) {
    E = lines.filter((l) => (l.h ? Math.min(Math.abs(l.c - bb[1]), Math.abs(l.c - bb[3])) : Math.min(Math.abs(l.c - bb[0]), Math.abs(l.c - bb[2]))) < 350);
    if (E.length) E.forEach((l) => (l.ext = true));
    rep.push('Outside walls taken as the ones on the outline of the plan.');
  }
  const ex = E.flatMap((l) => (l.h ? [l.s0, l.s1] : [l.c])), ey = E.flatMap((l) => (l.h ? [l.c] : [l.s0, l.s1]));
  const minX = Math.min(...ex), maxX = Math.max(...ex), minY = Math.min(...ey), maxY = Math.max(...ey);
  let tExt = Math.min(400, Math.max(70, med(E.map((l) => l.t))));
  let tSrc: Src = tr;
  const sizeFrom = (span: number, lo: number, hi: number, h: boolean) => {
    // a written dimension the size of the footprint, its witness points near the outside faces
    const cand = dims.filter((d) => d.h === h && Math.abs(d.v - span) / span < 0.06).sort((p, q) => Math.abs(p.a - lo) + Math.abs(p.b - hi) - (Math.abs(q.a - lo) + Math.abs(q.b - hi)));
    if (cand[0] && Math.abs(cand[0].a - lo) + Math.abs(cand[0].b - hi) < span * 0.12) return cand[0].v;
    // witness points misplaced, but the value is the size to within 1.5%: still the written size
    const close = cand.filter((d) => Math.abs(d.v - span) / span < 0.015).sort((p, q) => Math.abs(p.v - span) - Math.abs(q.v - span));
    return close[0]?.v ?? null;
  };
  const spanX = maxX - minX + tExt, spanY = maxY - minY + tExt;
  const Wd = sizeFrom(spanX, minX - tExt / 2, maxX + tExt / 2, true) ?? sizeFrom(maxX - minX, minX, maxX, true);
  const Dd = sizeFrom(spanY, minY - tExt / 2, maxY + tExt / 2, false) ?? sizeFrom(maxY - minY, minY, maxY, false);
  const Wmm = Wd ?? Math.round(spanX / 10) * 10, Dmm = Dd ?? Math.round(spanY / 10) * 10;
  const x0 = (minX + maxX) / 2 - Wmm / 2, y0 = (minY + maxY) / 2 - Dmm / 2;
  const sizeSrc = (d: number | null): Src => (d ? 'written' : tr);
  rep.push(`Footprint ${(Wmm / 1000).toFixed(2)} × ${(Dmm / 1000).toFixed(2)} m: ${Wd && Dd ? 'both sides from the written dimensions' : Wd || Dd ? 'one side from a written dimension, the other measured' : `measured (${ir.src === 'ai' ? 'AI positions, check' : 'from the linework'})`}.`);
  const outline = E.reduce((a, l) => a + (l.s1 - l.s0), 0), perim = 2 * (Wmm + Dmm);
  if (outline < perim * 0.8 || outline > perim * 1.35) rep.push('The outside walls do not make a simple rectangle: the twin uses the overall rectangle, so check recesses and wings.');

  // written dimension chains: exact boundary positions along each axis
  const cx = chains(dims.filter((d) => d.h), x0, x0 + Wmm), cy = chains(dims.filter((d) => !d.h), y0, y0 + Dmm);
  for (const ch of [...cx, ...cy]) {
    if (ch.closes && ch.anchored && ch.vals[0] >= 60 && ch.vals[0] <= 400 && Math.abs(ch.vals[0] - tExt) < 120) { tExt = ch.vals[0]; tSrc = 'written'; }
  }
  rep.push(`Outside walls ${Math.round(tExt)} mm thick (${tSrc === 'written' ? 'written' : 'measured'}).`);
  const snapPart = (c: number, chs: typeof cx): { c: number; t: number } | null => {
    let best: { c: number; t: number; d: number } | null = null;
    for (const ch of chs) for (let i = 0; i < ch.vals.length; i++) {
      const v = ch.vals[i]; if (v > 300 || v < 25) continue;
      const mid = (ch.pos[i] + ch.pos[i + 1]) / 2, d = Math.abs(mid - c);
      if (d < 230 && (!best || d < best.d)) best = { c: mid, t: v, d };
    }
    return best;
  };

  // partitions: inside walls, square to the outline
  const W = Wmm / 1000, D = Dmm / 1000, te = tExt / 1000;
  interface P { axis: 'x' | 'z'; at: number; from: number; to: number; t: number; src: Src; gaps: [number, number][] }
  let parts: P[] = [];
  let snapped = 0;
  for (const l of lines.filter((x) => !x.ext && x.s1 - x.s0 > 250)) {
    const sn = snapPart(l.c, l.h ? cy : cx);
    if (sn) snapped++;
    const c = sn?.c ?? l.c, t = Math.min(250, Math.max(40, sn?.t ?? l.t));
    if (l.h) parts.push({ axis: 'x', at: (c - y0) / 1000, from: (l.s0 - x0) / 1000, to: (l.s1 - x0) / 1000, t: t / 1000, src: sn ? 'written' : tr, gaps: [] });
    else parts.push({ axis: 'z', at: (c - x0) / 1000, from: (l.s0 - y0) / 1000, to: (l.s1 - y0) / 1000, t: t / 1000, src: sn ? 'written' : tr, gaps: [] });
  }
  // drop anything outside the footprint, clip to the inside faces
  parts = parts.filter((p) => p.at > te * 0.6 && p.at < (p.axis === 'x' ? D : W) - te * 0.6);
  for (const p of parts) { const lim = p.axis === 'x' ? W : D; p.from = Math.max(te, p.from); p.to = Math.min(lim - te, p.to); }
  // the reader's openings in home metres: a gap between two wall pieces in line is a doorway only if the reader put an
  // opening in it; otherwise it is a hall or open floor running past two separate walls, and the walls stay apart
  const opLines = ir.openings.map((op) => {
    const a = T([op.a[0] * k, op.a[1] * k]), b = T([op.b[0] * k, op.b[1] * k]), h = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
    return h ? { axis: 'x', at: ((a[1] + b[1]) / 2 - y0) / 1000, s0: (Math.min(a[0], b[0]) - x0) / 1000, s1: (Math.max(a[0], b[0]) - x0) / 1000 }
      : { axis: 'z', at: ((a[0] + b[0]) / 2 - x0) / 1000, s0: (Math.min(a[1], b[1]) - y0) / 1000, s1: (Math.max(a[1], b[1]) - y0) / 1000 };
  });
  const gapOf = (q: P, p: P): [number, number] | null => (p.from > q.to + 0.15 ? [q.to, p.from] : q.from > p.to + 0.15 ? [p.to, q.from] : null);
  const doorIn = (axis: string, at: number, g: [number, number]) => opLines.some((o) => o.axis === axis && Math.abs(o.at - at) < 0.3 && o.s0 < g[1] - 0.05 && o.s1 > g[0] + 0.05);
  // merge collinear pieces; the gaps between them are openings
  parts.sort((a, b) => (a.axis < b.axis ? -1 : a.axis > b.axis ? 1 : a.at - b.at || a.from - b.from));
  const merged: P[] = [];
  for (const p of parts) {
    const m = merged.find((q) => {
      if (q.axis !== p.axis || Math.abs(q.at - p.at) >= 0.15 || p.from > q.to + 1.6 || p.to < q.from - 1.6) return false;
      const g = gapOf(q, p);
      return !g || doorIn(p.axis, (p.at + q.at) / 2, g);
    });
    if (m) {
      if (p.from > m.to + 0.05) m.gaps.push([m.to, p.from]);
      else if (m.from > p.to + 0.05) m.gaps.push([p.to, m.from]);
      m.from = Math.min(m.from, p.from); m.to = Math.max(m.to, p.to);
      if (p.src === 'written') { m.at = p.at; m.t = p.t; m.src = 'written'; }
    } else merged.push({ ...p, gaps: [...p.gaps] });
  }
  // ends: run into the nearest wall square to them, within 450 mm
  for (const p of merged) {
    const stops = [te, (p.axis === 'x' ? W : D) - te, ...merged.filter((q) => q.axis !== p.axis && p.at > q.from - 0.2 && p.at < q.to + 0.2).flatMap((q) => [q.at - q.t / 2, q.at + q.t / 2])];
    for (const end of ['from', 'to'] as const) {
      const v = p[end]; let best = v, bd = 0.45;
      for (const s of stops) { const d = Math.abs(s - v); if (d < bd) { bd = d; best = s; } }
      p[end] = best;
    }
  }
  const partsOk = merged.filter((p) => p.to - p.from > 0.3);

  // openings
  const extOps: Record<'N' | 'S' | 'W' | 'E', Opening[]> = { N: [], S: [], W: [], E: [] };
  const partOps = new Map<P, Opening[]>();
  partsOk.forEach((p) => partOps.set(p, []));
  const decks: { id: string; name: string; u0: number; u1: number; v0: number; v1: number; drop: number; source: Src }[] = [];
  // rooms first (decks decide what a wide window onto them is)
  const rooms: RoomSpec[] = [];
  const uFaces = [te, W - te, ...partsOk.filter((p) => p.axis === 'z').flatMap((p) => [p.at - p.t / 2, p.at + p.t / 2])];
  const vFaces = [te, D - te, ...partsOk.filter((p) => p.axis === 'x').flatMap((p) => [p.at - p.t / 2, p.at + p.t / 2])];
  const snapTo = (v: number, fs: number[], tol = 0.35) => { let b = v, bd = tol; for (const f of fs) { const d = Math.abs(f - v); if (d < bd) { bd = d; b = f; } } return b; };
  let ri = 1, di = 1;
  const fixturesOf = new Map<string, string>(), sheetAt = new Map<string, Pt>();
  for (const r of ir.rooms) {
    const a = T([r.x * k, r.y * k]), b = T([(r.x + r.w) * k, (r.y + r.h) * k]);
    let u0 = (Math.min(a[0], b[0]) - x0) / 1000, u1 = (Math.max(a[0], b[0]) - x0) / 1000, v0 = (Math.min(a[1], b[1]) - y0) / 1000, v1 = (Math.max(a[1], b[1]) - y0) / 1000;
    const name = r.name.replace(/\s+/g, ' ').trim();
    if (/deck|terrace|patio|veranda|verandah|balcony/i.test(name)) {
      // a deck drawn against the house meets its outside face
      if (Math.abs(v1) < 0.5) v1 = 0;
      if (Math.abs(v0 - D) < 0.5) v0 = D;
      if (Math.abs(u1) < 0.5) u1 = 0;
      if (Math.abs(u0 - W) < 0.5) u0 = W;
      if (u1 - u0 > 0.8 && v1 - v0 > 0.6) decks.push({ id: `DK-${di++}`, name: name.replace(/^\w/, (c) => c.toUpperCase()), u0: r3(u0), u1: r3(u1), v0: r3(v0), v1: r3(v1), drop: 0.05, source: tr });
      continue;
    }
    const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
    if (cu < 0 || cu > W || cv < 0 || cv > D) continue;
    // snap to wall faces, never further than 40% of the room's own size (so a 0.6 m wardrobe keeps both sides)
    const tu = Math.min(0.35, 0.4 * (u1 - u0)), tv = Math.min(0.35, 0.4 * (v1 - v0));
    u0 = snapTo(u0, uFaces, tu); u1 = snapTo(u1, uFaces, tu); v0 = snapTo(v0, vFaces, tv); v1 = snapTo(v1, vFaces, tv);
    u0 = Math.max(te, u0); v0 = Math.max(te, v0); u1 = Math.min(W - te, u1); v1 = Math.min(D - te, v1);
    if (u1 - u0 < 0.45 || v1 - v0 < 0.45) continue;   // wardrobes, linen cupboards and WCs are rooms too (0.45 m and up)
    const id = `R-${String(ri++).padStart(2, '0')}`;
    if (r.fixtures) fixturesOf.set(id, r.fixtures);
    sheetAt.set(id, [r.x + r.w / 2, r.y + r.h / 2]);
    rooms.push({ id, name: unprinted(name) ? '?' : name, u: r3(u0), v: r3(v0), w: r3(u1 - u0), d: r3(v1 - v0), ...(r.area ? { labelledArea: r.area } : {}), source: tr });
  }
  // a small room (a wardrobe, a cupboard) inside a bigger room's box and along one of its sides, covering at least half of
  // that side: the bigger room stops at the small room's far wall face (room boxes are rectangles and must not overlap)
  let nCut = 0;
  const nextFace = (fs: number[], from: number, dir: 1 | -1) => fs.filter((f) => (f - from) * dir > 0.01 && Math.abs(f - from) < 0.3).sort((p, q) => (p - q) * dir)[0] ?? from;
  for (const big of rooms) for (const sm of rooms) {
    if (sm === big || sm.w * sm.d > 0.5 * big.w * big.d) continue;
    const e = 0.06;
    if (sm.u < big.u - e || sm.u + sm.w > big.u + big.w + e || sm.v < big.v - e || sm.v + sm.d > big.v + big.d + e) continue;
    const cuts: { area: number; apply: () => void }[] = [];
    if (Math.abs(sm.u - big.u) < 0.15 && sm.d >= 0.5 * big.d) { const f = nextFace(uFaces, sm.u + sm.w, 1); cuts.push({ area: (f - big.u) * big.d, apply: () => { big.w = r3(big.u + big.w - f); big.u = r3(f); } }); }
    if (Math.abs(sm.u + sm.w - big.u - big.w) < 0.15 && sm.d >= 0.5 * big.d) { const f = nextFace(uFaces, sm.u, -1); cuts.push({ area: (big.u + big.w - f) * big.d, apply: () => { big.w = r3(f - big.u); } }); }
    if (Math.abs(sm.v - big.v) < 0.15 && sm.w >= 0.5 * big.w) { const f = nextFace(vFaces, sm.v + sm.d, 1); cuts.push({ area: (f - big.v) * big.w, apply: () => { big.d = r3(big.v + big.d - f); big.v = r3(f); } }); }
    if (Math.abs(sm.v + sm.d - big.v - big.d) < 0.15 && sm.w >= 0.5 * big.w) { const f = nextFace(vFaces, sm.v, -1); cuts.push({ area: (big.v + big.d - f) * big.w, apply: () => { big.d = r3(f - big.v); } }); }
    const best = cuts.sort((p, q) => p.area - q.area)[0];
    if (best && best.area > 0 && best.area < 0.5 * big.w * big.d) { best.apply(); nCut++; }
  }
  const deckOn = (side: 'N' | 'S' | 'W' | 'E', a: number, b: number) => decks.some((d) => (side === 'N' ? d.v1 <= 0.05 && d.u1 > a && d.u0 < b : side === 'S' ? d.v0 >= D - 0.05 && d.u1 > a && d.u0 < b : side === 'W' ? d.u1 <= 0.05 && d.v1 > a && d.v0 < b : d.u0 >= W - 0.05 && d.v1 > a && d.v0 < b));
  let nExt = 0, nInt = 0;
  for (const op of ir.openings) {
    const a = T([op.a[0] * k, op.a[1] * k]), b = T([op.b[0] * k, op.b[1] * k]);
    const h = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
    const c = h ? (a[1] + b[1]) / 2 : (a[0] + b[0]) / 2, s0 = h ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]), s1 = h ? Math.max(a[0], b[0]) : Math.max(a[1], b[1]);
    const tol = Math.max(450, tExt * 3);
    const side: 'N' | 'S' | 'W' | 'E' | null = h ? (Math.abs(c - y0) < tol ? 'N' : Math.abs(c - (y0 + Dmm)) < tol ? 'S' : null) : Math.abs(c - x0) < tol ? 'W' : Math.abs(c - (x0 + Wmm)) < tol ? 'E' : null;
    const base = h ? x0 : y0, lim = h ? W : D;
    const A = Math.max(0.12, (s0 - base) / 1000), B = Math.min(lim - 0.12, (s1 - base) / 1000);
    if (B - A < 0.35) continue;
    if (side) {
      const wide = B - A >= 1.6, mid = (A + B) / 2;
      let o2: Opening;
      // a door of two or more leaves (sliders, stackers, bi-folds, a hinged pair) keeps its full width; a single leaf is at most
      // 1.2 m, centred where the reader put it; a wide window onto a deck is taken as a sliding door. "glazing" from the AI
      // reader (prompt revision 2026-11-22b on, which stamps its replies) is fixed full-height glass; from older AI replies and
      // from the linework reader it stays a sliding door, as before
      const fixedGlass = op.kind === 'glazing' && ir.src === 'ai' && !!ir.rev;
      if ((op.kind === 'glazing' && !fixedGlass) || (op.kind === 'door-double' && wide) || (op.kind === 'window' && wide && deckOn(side, A, B))) o2 = { id: `D-${side}${extOps[side].length + 1}`, kind: 'door', type: 'slider', name: op.kind === 'door-double' ? 'Sliding or folding doors' : 'Sliding door', a: r3(A), b: r3(B), sill: 0, head: 2.1, source: tr };
      else if (op.kind === 'door-double') o2 = { id: `D-${side}${extOps[side].length + 1}`, kind: 'door', type: 'hinged', name: 'Double doors', a: r3(A), b: r3(B), sill: 0, head: 2.1, source: tr };
      else if (op.kind.startsWith('door')) { const hw = Math.min(B - A, 1.2) / 2; o2 = { id: `D-${side}${extOps[side].length + 1}`, kind: 'door', type: 'hinged', name: 'Door', a: r3(mid - hw), b: r3(mid + hw), sill: 0, head: 2.1, source: tr }; }
      else if (op.kind === 'opening') o2 = { id: `O-${side}${extOps[side].length + 1}`, kind: 'opening', name: 'Opening', a: r3(A), b: r3(B), sill: 0, head: 2.1, source: tr };
      else if (fixedGlass) o2 = { id: `N-${side}${extOps[side].length + 1}`, kind: 'window', type: 'fixed', name: 'Fixed glazing', a: r3(A), b: r3(B), sill: 0, head: 2.1, source: tr };
      else o2 = { id: `N-${side}${extOps[side].length + 1}`, kind: 'window', name: 'Window', a: r3(A), b: r3(B), sill: B - A > 2.2 ? 0.5 : 0.9, head: 2.1, source: tr };
      if (!extOps[side].some((x) => x.a < o2.b && x.b > o2.a)) { extOps[side].push(o2); nExt++; }
      continue;
    }
    if (!op.kind.startsWith('door') && op.kind !== 'opening') continue;
    // an inside door: the partition it lies along
    const axis = h ? 'x' : 'z', at = (c - (h ? y0 : x0)) / 1000;
    const p = partsOk.find((q) => q.axis === axis && Math.abs(q.at - at) < 0.3 && A < q.to && B > q.from);
    if (!p) continue;
    const gap = p.gaps.find((g) => g[0] < B && g[1] > A);
    if (gap) { gap.push(1 as never); continue; }   // the gap it sits in becomes a door below
    const lst = partOps.get(p)!;
    // a single leaf: at most 1.0 m, centred where the reader put it. Two or more leaves (wardrobe sliders, bi-folds, a pair):
    // the full width; wider than 1.25 m it is drawn as an opening, as the twin has no inside sliding leaf
    const single = op.kind === 'door', mid = (A + B) / 2, hw = single ? Math.min(B - A, 1.0) / 2 : (B - A) / 2;
    const a2 = Math.max(p.from + 0.05, mid - hw), b2 = Math.min(p.to - 0.05, mid + hw);
    if (b2 - a2 > 0.5 && !lst.some((x) => x.a < b2 && x.b > a2)) {
      if (single || (op.kind === 'door-double' && b2 - a2 <= 1.25)) lst.push({ id: `D-I${++nInt}`, kind: 'door', type: 'hinged', name: single ? 'Door' : 'Double doors', a: r3(a2), b: r3(b2), sill: 0, head: 2.04, source: tr });
      else lst.push({ id: `O-I${++nInt}`, kind: 'opening', name: op.kind === 'opening' ? 'Opening' : 'Sliding or folding doors', a: r3(a2), b: r3(b2), sill: 0, head: 2.04, source: tr });
    }
  }
  for (const p of partsOk) {
    for (const g of p.gaps as (number[])[]) {
      const isDoor = g.length > 2, a = g[0], b = g[1];
      if (b - a < 0.5) continue;
      if (isDoor && b - a <= 1.25) partOps.get(p)!.push({ id: `D-I${++nInt}`, kind: 'door', type: 'hinged', name: 'Door', a: r3(a), b: r3(b), sill: 0, head: 2.04, source: tr });
      else partOps.get(p)!.push({ id: `O-I${++nInt}`, kind: 'opening', name: 'Opening', a: r3(a), b: r3(b), sill: 0, head: 2.04, source: tr });
    }
  }
  // names: as printed; where a tag prints "?" (or there is none), suggested from what is drawn in the room, its shape and the
  // doors off it (roomNames.ts), marked "named from what is drawn: check". First, which rooms each door or opening joins.
  const links: Link[] = [];
  const along = (r: RoomSpec, axis: 'x' | 'z', mid: number) => (axis === 'x' ? r.u <= mid && mid <= r.u + r.w : r.v <= mid && mid <= r.v + r.d);
  const lo = (r: RoomSpec, axis: 'x' | 'z') => (axis === 'x' ? r.v : r.u), hi = (r: RoomSpec, axis: 'x' | 'z') => (axis === 'x' ? r.v + r.d : r.u + r.w);
  for (const p of partsOk) for (const op of partOps.get(p)!) {
    const mid = (op.a + op.b) / 2;
    const before = rooms.find((r) => along(r, p.axis, mid) && Math.abs(hi(r, p.axis) - (p.at - p.t / 2)) < 0.25);
    const after = rooms.find((r) => along(r, p.axis, mid) && Math.abs(lo(r, p.axis) - (p.at + p.t / 2)) < 0.25);
    if (before || after) links.push({ a: before?.id ?? null, b: after?.id ?? null });
  }
  for (const wid of ['N', 'S', 'W', 'E'] as const) for (const op of extOps[wid]) {
    if (op.kind === 'window') continue;
    const axis = wid === 'N' || wid === 'S' ? 'x' : 'z', mid = (op.a + op.b) / 2, far = (axis === 'x' ? D : W) - te;
    const r = rooms.find((rm) => along(rm, axis, mid) && (wid === 'N' || wid === 'W' ? Math.abs(lo(rm, axis) - te) < 0.3 : Math.abs(hi(rm, axis) - far) < 0.3));
    if (r) links.push({ a: r.id, b: null });
  }
  const order = readingOrder([...sheetAt].map(([id, c]) => ({ id, x: c[0], y: c[1] })), 1000 / k);
  const named = suggestNames(rooms.map((r) => ({ id: r.id, name: r.name, u: r.u, v: r.v, w: r.w, d: r.d, fixtures: fixturesOf.get(r.id), order: order.get(r.id) })), links);
  for (const r of rooms) { const n = named.get(r.id)!; r.name = n.name; r.nameSrc = n.src; r.printed = n.printed; if (n.src === 'drawn') r.suggested = n.name; }
  const suggested = rooms.filter((r) => r.nameSrc === 'drawn').length;
  rep.push(`${partsOk.length} inside walls${snapped ? ` (${snapped} placed on written dimensions)` : ''}, ${rooms.length} rooms, ${nExt} openings in the outside walls, ${nInt} inside doors and openings. Opening positions ${ir.src === 'ai' ? 'read by AI, ± about 150 mm' : 'measured'}; heights and sills assumed.`);
  if (nCut) rep.push(`${nCut} room${nCut > 1 ? 's' : ''} cut back where a smaller room (a wardrobe or cupboard) sat inside ${nCut > 1 ? 'their boxes' : 'its box'}.`);
  if (suggested) rep.push(`${suggested} room tag${suggested > 1 ? 's print' : ' prints'} "?" on the drawing, or there is no tag. Names suggested from what is drawn in each room: check them above.`);
  if (decks.length) rep.push(`${decks.length} deck${decks.length > 1 ? 's' : ''} as drawn${ir.src === 'ai' ? ' (AI extents, check)' : ''}.`);
  const rf = o.roof ?? 'gable';
  rep.push(`Roof ${o.roofSrc && o.roofSrc !== 'assumed' ? 'from the elevations' : 'assumed'}: ${rf === 'skillion' ? `skillion, ${o.pitch}°, high over the ${o.high === 'v0' ? 'north' : 'south'} wall` : rf === 'flat' ? 'flat' : `gable, ${o.pitch}°, ridge along the long side`}; floor ${o.floor.toFixed(2)} m above the ground; ceiling plate ${o.plate.toFixed(2)} m.`);

  const wall = (id: string, name: string, axis: 'x' | 'z', at: number, to: number, out: number, ops: Opening[], src: Src): WallSpec => ({ id, name, axis, at: r3(at), from: 0, to: r3(to), out, thickness: r3(te), cladding: 'cedar', source: src, openings: ops.sort((a, b) => a.a - b.a) });
  const building = {
    id,
    name: ir.label,
    origin: [0, 0] as [number, number],
    floorLevel: o.floor,
    roof: { type: rf, ridge: 'x', pitchDeg: o.pitch, eave: 0.45, verge: 0.25, cover: 'profiled metal', source: (o.roofSrc ?? 'assumed') as Src, ...(rf === 'skillion' ? { high: o.high ?? 'v1' } : {}) },
    levels: [
      {
        plate: o.plate,
        walls: [wall('N', 'North wall', 'x', 0, W, -1, extOps.N, sizeSrc(Wd)), wall('S', 'South wall', 'x', D, W, 1, extOps.S, sizeSrc(Wd)), wall('W', 'West wall', 'z', 0, D, -1, extOps.W, sizeSrc(Dd)), wall('E', 'East wall', 'z', W, D, 1, extOps.E, sizeSrc(Dd))],
        partitions: partsOk.map((p, i): PartitionSpec => ({ id: `P${i + 1}`, axis: p.axis, at: r3(p.at), from: r3(p.from), to: r3(p.to), thickness: r3(p.t), source: p.src, openings: partOps.get(p)!.sort((a, b) => a.a - b.a) })),
        rooms,
        decks,
      },
    ],
  };

  // what to draw over the reader's image
  const P = (u: number, v: number) => toPx([x0 + u * 1000, y0 + v * 1000]);
  const overlay: Built['overlay'] = [
    { a: P(0, 0), b: P(W, 0), kind: 'ext' }, { a: P(W, 0), b: P(W, D), kind: 'ext' }, { a: P(W, D), b: P(0, D), kind: 'ext' }, { a: P(0, D), b: P(0, 0), kind: 'ext' },
  ];
  for (const p of partsOk) overlay.push(p.axis === 'x' ? { a: P(p.from, p.at), b: P(p.to, p.at), kind: 'part' } : { a: P(p.at, p.from), b: P(p.at, p.to), kind: 'part' });
  const side = { N: (a: number) => P(a, 0), S: (a: number) => P(a, D), W: (a: number) => P(0, a), E: (a: number) => P(W, a) };
  for (const s of ['N', 'S', 'W', 'E'] as const) for (const op of extOps[s]) overlay.push({ a: side[s](op.a), b: side[s](op.b), kind: op.type === 'slider' ? 'slider' : (op.kind as 'door' | 'window' | 'opening') });
  for (const p of partsOk) for (const op of partOps.get(p)!) overlay.push(p.axis === 'x' ? { a: P(op.a, p.at), b: P(op.b, p.at), kind: op.kind === 'door' ? 'door' : 'opening' } : { a: P(p.at, op.a), b: P(p.at, op.b), kind: op.kind === 'door' ? 'door' : 'opening' });
  for (const d of decks) { const c = [P(d.u0, d.v0), P(d.u1, d.v0), P(d.u1, d.v1), P(d.u0, d.v1)]; for (let i = 0; i < 4; i++) overlay.push({ a: c[i], b: c[(i + 1) % 4], kind: 'deck' }); }
  const labels = rooms.map((r) => ({ at: P(r.u + r.w / 2, r.v + r.d / 2), text: r.name }));
  const tl = Tinv([x0, y0]);
  const cs = [Tinv([x0, y0]), Tinv([x0 + Wmm, y0]), Tinv([x0 + Wmm, y0 + Dmm]), Tinv([x0, y0 + Dmm])];
  const drawing = {
    toHome: (q: Pt): Pt => { const t = T(q); return [(t[0] - x0) / 1000, (t[1] - y0) / 1000]; },
    box: [Math.min(...cs.map((c) => c[0])), Math.min(...cs.map((c) => c[1])), Math.max(...cs.map((c) => c[0])), Math.max(...cs.map((c) => c[1]))] as [number, number, number, number],
  };
  return { building, W, D, report: rep, overlay, labels, sheetMm: [ir.offsetMm[0] + tl[0], ir.offsetMm[1] + tl[1]], drawing };
}

/** a plan model from one or more traced buildings, placed as they sit on the sheet */
export function planModel(built: Built[], title: string, north: number | null, sheetNote: string) {
  const ref = built[0].sheetMm;
  for (const b of built) b.building.origin = [r3((b.sheetMm[0] - ref[0]) / 1000), r3((b.sheetMm[1] - ref[1]) / 1000)];
  return {
    schema: 'assembl.plan-model.v1',
    job: { title, what: `Traced from ${sheetNote}. Sizes from the written dimensions where they agree; everything else measured or read, with heights, roof and finishes assumed.`, traced: built.map((b) => ({ building: b.building.name, report: b.report })) },
    units: 'm',
    north: { deg: north ?? 0, source: north == null ? 'assumed: plan north up' : 'read from the north point' },
    buildings: built.map((b) => b.building),
  };
}
