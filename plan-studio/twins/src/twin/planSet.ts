// Reading the rest of a drawing set: the site plan and the elevations, on top of the floor plan.
//  - Site or area plan: decks, stairs, paths, pads, retaining walls, beds and trees, read by the AI plan reader and lined
//    up with the house by matching the footprint it draws to the one the floor plan gave.
//  - Elevations: the roof form and pitch, the plate height (from the RL levels written on the sheet where there are
//    any), and how far the floor sits above the ground at each end, so the ground can fall under the house.
// Everything keeps where it came from; anything inferred is said to be inferred.
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Src } from './homes';
import { aiRead, pageText, renderRegion, sheetScale, titleBand, type Built, type SheetInfo, type TextItem } from './planTrace';
import type { SiteFeature } from './projectPlan';

type Pt = [number, number];
const PT_MM = 25.4 / 72;
export type Role = 'skip' | 'site' | 'elevation';

/** which sheets to read besides the floor plan: one site plan (a layout plan first) and up to two elevation sheets */
export function defaultRoles(sheets: SheetInfo[], planPage: number): Map<number, Role> {
  const roles = new Map<number, Role>(sheets.map((s) => [s.page, 'skip']));
  const site = sheets.filter((s) => s.page !== planPage && s.role === 'site')
    .sort((a, b) => rank(b.title) - rank(a.title))[0];
  if (site) roles.set(site.page, 'site');
  sheets.filter((s) => s.page !== planPage && s.role === 'elevation').slice(0, 2).forEach((s) => roles.set(s.page, 'elevation'));
  return roles;
}
const rank = (t: string) => (/layout/i.test(t) ? 3 : /site\s*plan/i.test(t) ? 2 : /landscap/i.test(t) ? 2 : /area/i.test(t) ? 1 : 0);

interface Crop { canvas: HTMLCanvasElement; k: number | null; scaleNote: string; items: TextItem[] }
/** the drawing area of a sheet (title block left out), with the drawing's scale in mm per crop pixel */
async function drawingCrop(doc: PDFDocumentProxy, pageNo: number): Promise<Crop> {
  const page = await doc.getPage(pageNo);
  const vp = page.getViewport({ scale: 1 });
  const items = await pageText(page);
  const band = titleBand(items, vp.width, vp.height);
  const box: [number, number, number, number] = [0, 0, band.right ?? vp.width, band.bottom ?? vp.height];
  const { canvas, s } = await renderRegion(page, box, 1568);
  const sc = sheetScale(items, vp.width, vp.height);
  return { canvas, k: sc ? (PT_MM * sc.scale) / s : null, scaleNote: sc ? sc.note : 'No scale on the sheet.', items };
}

/* ───────────── the site plan ───────────── */
interface XY { x: number; y: number }
interface AiSite {
  building: { points: XY[] };
  decks: { label: string; points: XY[]; confidence: number }[];
  stairs: { points: XY[]; confidence: number }[];
  paths: { kind: 'path' | 'driveway' | 'steps'; points: XY[]; width_px: number; confidence: number }[];
  hard: { kind: 'parking' | 'patio' | 'pad'; points: XY[]; confidence: number }[];
  retaining: { points: XY[]; height_text: string | null; confidence: number }[];
  planting: { kind: 'garden bed' | 'lawn' | 'native planting'; points: XY[]; confidence: number }[];
  trees: { x: number; y: number; r_px: number; confidence: number }[];
  boundary: XY[];
  north_deg: number | null;
  notes: string;
}
export interface SiteRead { page: number; title: string; data: AiSite; k: number | null; scaleNote: string; image: HTMLCanvasElement; model: string }
export async function readSiteSheet(doc: PDFDocumentProxy, info: SheetInfo, progress: (m: string) => void): Promise<SiteRead> {
  progress(`Reading the site plan (sheet ${info.page}) with the AI plan reader…`);
  const c = await drawingCrop(doc, info.page);
  const { plan, model } = await aiRead<AiSite>(c.canvas, 'site');
  return { page: info.page, title: info.title, data: plan, k: c.k, scaleNote: c.scaleNote, image: c.canvas, model };
}

export interface SiteResult {
  decks: { id: string; u0: number; u1: number; v0: number; v1: number; poly: Pt[]; source: Src }[];
  stairs: { id: string; poly: Pt[]; source: Src }[];
  features: SiteFeature[];
  report: string[];
  ok: boolean;
}
const area = (p: Pt[]) => Math.abs(p.reduce((a, q, i) => { const r = p[(i + 1) % p.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
function clipHalf(poly: Pt[], f: (p: Pt) => number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
/** a deck outline, with any part inside the house cut away: split into the pieces beyond each wall */
function outsideHouse(p: Pt[], W: number, D: number): Pt[][] {
  const parts = [
    clipHalf(p, (q) => -q[1]),
    clipHalf(p, (q) => q[1] - D),
    clipHalf(clipHalf(clipHalf(p, (q) => -q[0]), (q) => q[1]), (q) => D - q[1]),
    clipHalf(clipHalf(clipHalf(p, (q) => q[0] - W), (q) => q[1]), (q) => D - q[1]),
  ];
  return parts.filter((q) => q.length >= 3 && area(q) > 0.6);
}
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** line the site plan up with the floor plan's footprint and turn what it draws into home and site coordinates */
export function registerSite(s: SiteRead, b: Built): SiteResult {
  const rep: string[] = [], d = s.data;
  const out: SiteResult = { decks: [], stairs: [], features: [], report: rep, ok: false };
  const bp = d.building?.points ?? [];
  if (!s.k) { rep.push(`Site plan (sheet ${s.page}): no scale found on it, so it could not be placed.`); return out; }
  if (bp.length < 3) { rep.push(`Site plan (sheet ${s.page}): the reader could not find the house on it, so nothing could be lined up.`); return out; }
  const k = s.k;
  const xs = bp.map((p) => p.x * k), ys = bp.map((p) => p.y * k);
  const S = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  const F = b.drawing.box;
  const sw = S[2] - S[0], sh = S[3] - S[1], fw = F[2] - F[0], fh = F[3] - F[1];
  const rx = fw / sw, ry = fh / sh;
  let f = 1;
  if (rx > 0.7 && rx < 1.4 && ry > 0.7 && ry < 1.4 && Math.abs(rx - ry) / Math.max(rx, ry) < 0.2) {
    f = (rx + ry) / 2;
    rep.push(`Site plan (sheet ${s.page}): lined up on the house footprint it draws, which matches the floor plan's ${Math.abs(1 - f) < 0.01 ? 'closely' : `to within ${Math.round(Math.abs(1 - f) * 100)}%`}.`);
  } else if (rx * sw / sh > 0.7 && rx * sw / sh < 1.4) {
    rep.push(`Site plan (sheet ${s.page}): its house is turned against the floor plan, so its features were not placed. Turn one sheet to match and read again.`);
    return out;
  } else {
    rep.push(`Site plan (sheet ${s.page}): its house (${(sw / 1000).toFixed(1)} × ${(sh / 1000).toFixed(1)} m) does not match the floor plan's footprint; placed by the centre only, so check it.`);
  }
  const sc: Pt = [(S[0] + S[2]) / 2, (S[1] + S[3]) / 2], fc: Pt = [(F[0] + F[2]) / 2, (F[1] + F[3]) / 2];
  const home = (p: XY): Pt => { const q = b.drawing.toHome([fc[0] + f * (p.x * k - sc[0]), fc[1] + f * (p.y * k - sc[1])]); return [r3(q[0]), r3(q[1])]; };
  const m = k * f / 1000; // metres per site pixel
  const { W, D } = b;
  const keep = (c: number) => c >= 0.35;
  let nd = 0;
  for (const dk of d.decks ?? []) {
    if (!keep(dk.confidence) || dk.points.length < 3) continue;
    for (const poly of outsideHouse(dk.points.map(home), W, D)) {
      const us = poly.map((p) => p[0]), vs = poly.map((p) => p[1]);
      out.decks.push({ id: `SD${++nd}`, u0: r3(Math.min(...us)), u1: r3(Math.max(...us)), v0: r3(Math.min(...vs)), v1: r3(Math.max(...vs)), poly, source: 'ai' });
    }
  }
  (d.stairs ?? []).filter((st) => keep(st.confidence) && st.points.length >= 3).forEach((st, i) => out.stairs.push({ id: `ST${i + 1}`, poly: st.points.map(home), source: 'ai' }));
  const feat = (f2: SiteFeature) => out.features.push(f2);
  for (const p of d.paths ?? []) if (keep(p.confidence) && p.points.length >= 2) feat({ kind: p.kind, pts: p.points.map(home), width: Math.max(0.8, Math.min(6, p.width_px * m || (p.kind === 'driveway' ? 3 : 1.2))), source: 'ai' });
  for (const h of d.hard ?? []) if (keep(h.confidence) && h.points.length >= 3) feat({ kind: h.kind, pts: h.points.map(home), source: 'ai' });
  for (const r of d.retaining ?? []) {
    if (!keep(r.confidence) || r.points.length < 2) continue;
    const mm = r.height_text?.match(/(\d+(?:\.\d+)?)\s*(mm|m)\b/i);
    const h = mm ? (mm[2].toLowerCase() === 'mm' ? +mm[1] / 1000 : +mm[1]) : undefined;
    feat({ kind: 'retaining', pts: r.points.map(home), ...(h && h > 0.2 && h < 6 ? { height: h } : {}), source: 'ai' });
  }
  for (const p of d.planting ?? []) if (keep(p.confidence) && p.points.length >= 3 && p.kind !== 'lawn') feat({ kind: 'bed', pts: p.points.map(home), source: 'ai' });
  for (const t of d.trees ?? []) if (keep(t.confidence)) feat({ kind: 'tree', pts: [home(t)], r: Math.max(1, Math.min(8, t.r_px * m)), source: 'ai' });
  const n = (k2: string) => out.features.filter((x) => x.kind === k2).length;
  const parts = [
    out.decks.length && `${out.decks.length} deck piece${out.decks.length > 1 ? 's' : ''}`, out.stairs.length && `${out.stairs.length} stair${out.stairs.length > 1 ? 's' : ''}`,
    n('path') + n('steps') && `${n('path') + n('steps')} path${n('path') + n('steps') > 1 ? 's' : ''}`, n('driveway') && `${n('driveway')} driveway${n('driveway') > 1 ? 's' : ''}`,
    n('parking') + n('patio') + n('pad') && `${n('parking') + n('patio') + n('pad')} paved area${n('parking') + n('patio') + n('pad') > 1 ? 's' : ''}`,
    n('retaining') && `${n('retaining')} retaining wall${n('retaining') > 1 ? 's' : ''}`, n('bed') && `${n('bed')} planting area${n('bed') > 1 ? 's' : ''}`, n('tree') && `${n('tree')} tree${n('tree') > 1 ? 's' : ''}`,
  ].filter(Boolean);
  rep.push(parts.length ? `From it: ${parts.join(', ')} (read by AI: outlines ± about 300 mm, check them).` : 'Nothing else on it could be read with confidence.');
  out.ok = true;
  return out;
}

/* ───────────── the elevations ───────────── */
interface AiView {
  label: string; roof: 'gable' | 'skillion' | 'hip' | 'flat' | 'unclear'; roof_seen: 'slope' | 'band'; high_side: 'left' | 'right' | 'none';
  roof_top_left: XY; roof_top_right: XY; eave_left: XY; eave_right: XY; ffl_y: number; wall_left_x: number; wall_right_x: number;
  ground_left: XY; ground_right: XY; confidence: number;
}
export interface ElevRead { page: number; title: string; views: AiView[]; k: number | null; scaleNote: string; rl: { plate: number | null; note: string }; model: string }
export async function readElevSheet(doc: PDFDocumentProxy, info: SheetInfo, progress: (m: string) => void): Promise<ElevRead> {
  progress(`Reading the elevations (sheet ${info.page}) with the AI plan reader…`);
  const c = await drawingCrop(doc, info.page);
  const { plan, model } = await aiRead<{ views: AiView[] }>(c.canvas, 'elevation');
  return { page: info.page, title: info.title, views: plan.views ?? [], k: c.k, scaleNote: c.scaleNote, rl: rlPlate(c.items), model };
}
/** heights written as levels: "RL 114000 Ground Floor FFL" and "RL 116420 Roof Pitch Point" give the plate height exactly */
function rlPlate(items: TextItem[]): { plate: number | null; note: string } {
  const rls = items.flatMap((t) => { const m = t.str.match(/\bRL\s*(\d{5,6}(?:\.\d+)?)/i); return m ? [{ v: +m[1], t }] : []; });
  const label = (r: { t: TextItem }) => items.filter((o) => o !== r.t && Math.abs(o.x - r.t.x) < 80 && o.y > r.t.y - 2 && o.y - r.t.y < r.t.h * 2.6).map((o) => o.str).join(' ') + ' ' + r.t.str;
  const ffl = rls.find((r) => /ffl|floor\s*level|ground\s*floor/i.test(label(r)));
  const top = rls.find((r) => /pitch\s*point|top\s*plate|wall\s*plate|\bplate\b|eave/i.test(label(r)));
  if (!ffl || !top) return { plate: null, note: '' };
  const d = (top.v - ffl.v) / (top.v > 50000 ? 1000 : 1);
  return d > 1.8 && d < 4.5 ? { plate: Math.round(d * 100) / 100, note: `Plate ${d.toFixed(2)} m above the floor, from the levels written on the elevations (RL ${top.v} less RL ${ffl.v}).` } : { plate: null, note: '' };
}

export interface ElevResult { roof: 'gable' | 'skillion' | 'flat' | null; pitch: number | null; plate: number | null; hUp: number | null; hDown: number | null; report: string[] }
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
export function interpretElevations(rs: ElevRead[]): ElevResult {
  const rep: string[] = [];
  const views = rs.flatMap((r) => r.views.filter((v) => v.confidence >= 0.3).map((v) => ({ v, k: r.k, r })));
  if (!views.length) return { roof: null, pitch: null, plate: null, hUp: null, hDown: null, report: ['Elevations: no views could be read.'] };
  const kinds = views.map((x) => x.v.roof).filter((k) => k !== 'unclear');
  const count = (k: string) => kinds.filter((x) => x === k).length;
  const roof = count('skillion') >= Math.max(1, count('gable')) ? 'skillion' : count('gable') ? 'gable' : count('flat') ? 'flat' : count('hip') ? 'gable' : null;
  // pitch: the roof's top edge where its fall shows (a ratio of pixels, so no scale is needed)
  const slopes = views.filter((x) => x.v.roof_seen === 'slope' && x.v.roof !== 'flat').map((x) => {
    const a = x.v.roof_top_left, b = x.v.roof_top_right, dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
    return dx > 10 ? (Math.atan(dy / dx) * 180) / Math.PI * (roof === 'gable' ? 0 : 1) : NaN;
  }).filter((p) => p >= 2 && p <= 45);
  const pitch = slopes.length ? Math.round(med(slopes)) : null;
  // the plate: written levels first, then measured from the eave on the low side
  const plateRL = rs.find((r) => r.rl.plate)?.rl;
  const plateM = views.filter((x) => x.k).map((x) => (x.v.ffl_y - Math.max(x.v.eave_left.y, x.v.eave_right.y)) * x.k! / 1000).filter((h) => h > 1.8 && h < 4.5);
  const plate = plateRL?.plate ?? (plateM.length ? Math.round(med(plateM) * 100) / 100 : null);
  // floor above the ground at each end of each view
  const hs = views.filter((x) => x.k).flatMap((x) => [(x.v.ground_left.y - x.v.ffl_y) * x.k! / 1000, (x.v.ground_right.y - x.v.ffl_y) * x.k! / 1000]).filter((h) => h > -1 && h < 12);
  const hUp = hs.length ? Math.max(0.15, Math.min(...hs)) : null, hDown = hs.length ? Math.max(...hs) : null;
  const sheets = [...new Set(rs.map((r) => r.page))].join(' and ');
  rep.push(`Elevations (sheet${rs.length > 1 ? 's' : ''} ${sheets}): ${views.length} view${views.length > 1 ? 's' : ''} read.`);
  if (roof) rep.push(`Roof: ${roof}${pitch ? `, about ${pitch}° measured from the drawn roof line` : ''}${roof === 'skillion' ? '. Which side is high is taken from the plan (see below); flip it if wrong' : ''}.`);
  if (plateRL?.plate) rep.push(plateRL.note); else if (plate) rep.push(`Plate about ${plate.toFixed(2)} m above the floor, measured from the eaves.`);
  if (hUp != null && hDown != null) rep.push(`Floor ${hUp.toFixed(1)} m above the ground on the high side of the site, ${hDown.toFixed(1)} m on the low side${hDown > 1.5 ? ': on poles' : ''}.`);
  return { roof, pitch, plate, hUp, hDown, report: rep };
}

/** a skillion usually rises over the side that opens to the view: the wall with the most glazing */
export function guessHigh(b: Built): 'v0' | 'v1' {
  const glaze = (id: string) => (b.building.levels[0].walls.find((w) => w.id === id)?.openings ?? []).reduce((a, o) => a + (o.b - o.a) * (o.kind === 'door' ? 1.3 : 1), 0);
  return glaze('N') > glaze('S') ? 'v0' : 'v1';
}

/** the ground as a plane falling across the house, from the floor heights the elevations give */
export function fallPlane(b: Built, hUp: number, hDown: number, downhill: 'v0' | 'v1', floor: number) {
  const { W, D } = b, o = b.building.origin;
  const gHigh = floor - hUp, gLow = floor - hDown; // ground under the uphill and downhill walls
  const slopeZ = (downhill === 'v1' ? gLow - gHigh : gHigh - gLow) / Math.max(D, 0.5);
  return { at: [o[0] + W / 2, o[1] + D / 2] as Pt, y: (gHigh + gLow) / 2, slopeX: 0, slopeZ };
}
