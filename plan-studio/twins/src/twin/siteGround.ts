// Real ground under a dropped plan, from LINZ's open 1 m LiDAR.
// The person's browser reads LINZ's survey cells round a point straight from LINZ's open elevation bucket (linz/ground.js),
// with the survey's name, dates, datum and credit, and the parcel outline straight from LINZ's parcel map (linz/parcel.js).
// The lab's server is not asked, so the site point never reaches it. This file turns that square into the plan model's own
// frame, sets the floor level by a stated rule, and offers the person the three things only they can know: which way the
// house faces, exactly where it sits, and its floor level. Each of those is tagged from the plan, assumed, or set by hand.
// The point, the ground and the placement are kept in this browser tab only (sessionStorage). They are not written into
// the dropped plan, the kept copy, or a share link; "Save the plan with its ground" is the one way they leave, and it says so.
// A read that fails is never kept and never drawn: the model stays as it was, and the card says which ground is showing.
import { modelFingerprint } from './approvals';
import { parseWhere } from './siteFacts';
import { readLayer } from './linz/ground.js';
import { parcelAt } from './linz/parcel.js';
import { toNZTM as nztm, gridConvergence } from './linz/nztm.js';
import { groundTint, progressText, LIMIT_S } from './groundLook';

const STORE = 'assembl-twin-site-ground', WHERE = 'assembl.siteFacts.where';
const RADIUS = 110, SIZE = 140, NUDGE_MAX = 10, PAD = 0.45;
export const PRIVACY = 'The same point as Site facts. This browser reads LINZ’s open data for it directly (the elevation files and the parcel map); the lab’s server is not asked and never receives the point. It is kept in this browser tab only: not in the model, not in a share link.';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const r2 = (v: number) => Math.round(v * 100) / 100;

interface Packed { n: number; cell: number; originE: number; originN: number; base: number; scale: number; nodata: number; data: string; stats?: { cellsWithoutHeight?: number } }
interface Grid { n: number; originE: number; originN: number; data: Float32Array }
interface Layer { heights: Packed; title: string | null; captured: { from: string | null; to: string | null } | null; identified?: string; credit: string; file?: string; asOf: string | null; fetchedAt: string; heightAtPoint: number | null; datum: string }
export type Tag = 'from the plan' | 'assumed' | 'set by hand';
export interface Placement { turnDeg: number; turnTag: Tag; east: number; north: number; moveTag: Tag; floor: number | null; floorTag: Tag }
export interface GroundStore { v: 1; plan: string; point: { lat: number; lon: number; e: number; n: number }; ground: Layer; surface: Layer | null; surfaceWhy?: string; parcel: { rings: [number, number][][]; asOf: string | null; credit: string } | null; parcelWhy?: string; placement: Placement;
  /** how the read went in this browser: seconds from asking to having both layers and the boundary, answers from LINZ, bytes */
  read?: { seconds: number; requests: number; bytes: number } }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Plan = any;

// ---- NZTM2000 (EPSG:2193): the same arithmetic the reader uses to find LINZ's cells (linz/nztm.js, checked against PROJ) ----
export const toNZTM = (latDeg: number, lonDeg: number) => nztm(latDeg, lonDeg) as { e: number; n: number };
/** how far grid north (up the map) is turned from true north at a point, degrees clockwise */
export const convergence = (latDeg: number, lonDeg: number) => gridConvergence(latDeg, lonDeg) as number;

function unpack(h: Packed): Grid {
  const s = atob(h.data), out = new Float32Array(h.n * h.n);
  for (let i = 0; i < out.length; i++) { const v = s.charCodeAt(2 * i) | (s.charCodeAt(2 * i + 1) << 8); out[i] = v === h.nodata ? NaN : h.base + v * h.scale; }
  return { n: h.n, originE: h.originE, originN: h.originN, data: out };
}
/** height at a map point: bilinear between the four nearest cell centres; NaN outside the square or beside an empty cell */
function at(g: Grid, e: number, n: number) {
  const fx = e - g.originE, fy = g.originN - n, i = Math.floor(fx), j = Math.floor(fy);
  if (i < 0 || j < 0 || i >= g.n - 1 || j >= g.n - 1) return NaN;
  const a = fx - i, b = fy - j, H = g.data, k = j * g.n + i;
  return (H[k] * (1 - a) + H[k + 1] * a) * (1 - b) + (H[k + g.n] * (1 - a) + H[k + g.n + 1] * a) * b;
}

/** the first building's outline box in the model, from its outside walls (the same rule the ground pads use) */
function footprint(plan: Plan) {
  const fb = plan.buildings[0] as unknown as { form?: string; footprint?: [number, number][]; origin: [number, number]; floorLevel?: number };
  if (fb.form === 'freeform' && fb.footprint?.length) {
    // a free-form building: the box round its outline
    const us = fb.footprint.map((p) => p[0]), vs = fb.footprint.map((p) => p[1]), u0 = Math.min(...us), v0 = Math.min(...vs), W = Math.max(...us) - u0, D = Math.max(...vs) - v0;
    return { x0: fb.origin[0] + u0, z0: fb.origin[1] + v0, W, D, cx: fb.origin[0] + u0 + W / 2, cz: fb.origin[1] + v0 + D / 2, floor: (fb.floorLevel ?? 0) as number };
  }
  const b = plan.buildings[0], ws = b.levels[0].walls as { axis: 'x' | 'z'; at: number }[];
  const W = Math.max(...ws.filter((w) => w.axis === 'z').map((w) => w.at)), D = Math.max(...ws.filter((w) => w.axis === 'x').map((w) => w.at));
  return { x0: b.origin[0], z0: b.origin[1], W, D, cx: b.origin[0] + W / 2, cz: b.origin[1] + D / 2, floor: (b.floorLevel ?? 0) as number };
}
/** which way the plan says north is: degrees clockwise from up the sheet (which is −z in the model) */
export function planNorth(plan: Plan): { deg: number; tag: Tag; says: string } {
  const v = plan.site?.north;
  if (Array.isArray(v) && v.length === 2) return { deg: (Math.atan2(v[0], -v[1]) * 180) / Math.PI, tag: 'from the plan', says: 'the plan model’s north direction' };
  const src = String(plan.north?.source ?? '');
  if (typeof plan.north?.deg === 'number' && /north point/i.test(src)) return { deg: plan.north.deg, tag: 'from the plan', says: 'read from the north point on the drawing' };
  return { deg: 0, tag: 'assumed', says: 'the drawing gave no north point, so north is taken as up the sheet' };
}

export interface Applied {
  terrain: { centre: [number, number]; size: number; n: number; heights: number[]; photoKind: 'contours'; datum: number; north: [number, number]; source: string; chip: string; layerNote: string; tops?: { n: number; size: number; heights: number[]; note: string } };
  features: { kind: 'boundary'; pts: [number, number][]; source: string; open: boolean }[];
  floor: number; floorRule: string; datum0: number; emptyCells: number; groundUnder: { min: number; max: number; mean: number };
}
/** Put the stored survey square into the plan model's frame. Pure arithmetic: every height is a LINZ cell, bilinearly read. */
export function applyGround(plan: Plan, st: GroundStore): Applied {
  const fp = footprint(plan), P = st.placement, g = unpack(st.ground.heights), th = (P.turnDeg * Math.PI) / 180;
  const nv: [number, number] = [Math.sin(th), -Math.cos(th)], ev: [number, number] = [Math.cos(th), Math.sin(th)];   // north and east in the model's (x, z)
  // the plan's north is taken as true north; the survey grid's north is turned from it by the convergence
  const gam = (convergence(st.point.lat, st.point.lon) * Math.PI) / 180, tE: [number, number] = [Math.cos(gam), Math.sin(gam)], tN: [number, number] = [-Math.sin(gam), Math.cos(gam)];
  const A0 = { e: st.point.e + P.east, n: st.point.n + P.north };
  const world = (x: number, z: number): [number, number] => { const dx = x - fp.cx, dz = z - fp.cz, de = dx * ev[0] + dz * ev[1], dn = dx * nv[0] + dz * nv[1]; return [A0.e + de * tE[0] + dn * tN[0], A0.n + de * tE[1] + dn * tN[1]]; };
  const model = (e: number, n: number): [number, number] => { const re = e - A0.e, rn = n - A0.n, de = re * tE[0] + rn * tE[1], dn = re * tN[0] + rn * tN[1]; return [fp.cx + de * ev[0] + dn * nv[0], fp.cz + de * ev[1] + dn * nv[1]]; };
  // ground under the footprint, on a half-metre lattice
  let lo = Infinity, hi = -Infinity, sum = 0, cnt = 0;
  for (let x = fp.x0; x <= fp.x0 + fp.W + 1e-6; x += 0.5) for (let z = fp.z0; z <= fp.z0 + fp.D + 1e-6; z += 0.5) { const h = at(g, ...world(x, z)); if (h === h) { lo = Math.min(lo, h); hi = Math.max(hi, h); sum += h; cnt++; } }
  if (!cnt) throw new Error('the survey has no heights under the house at this spot');
  const ruleFloor = hi + PAD, floor = P.floor ?? ruleFloor, datum0 = floor - fp.floor;
  const floorRule = P.floor == null
    ? `Floor level ${r2(ruleFloor).toFixed(2)} m (NZVD2016): ${PAD} m above the highest surveyed ground under the house (${r2(hi).toFixed(2)} m), so no ground is cut. Assumed until you set it.`
    : `Floor level ${r2(floor).toFixed(2)} m (NZVD2016), set by hand. Ground under the house runs from ${r2(lo).toFixed(2)} to ${r2(hi).toFixed(2)} m.`;
  const n = SIZE + 1, heights: number[] = new Array(n * n), minValid = st.ground.heights.base;
  let empty = 0, lowest = Infinity;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const h = at(g, ...world(fp.cx + i - SIZE / 2, fp.cz + j - SIZE / 2)); heights[j * n + i] = h; if (h === h) lowest = Math.min(lowest, h); else empty++; }
  if (!isFinite(lowest)) lowest = minValid;
  for (let k = 0; k < heights.length; k++) heights[k] = r2((heights[k] === heights[k] ? heights[k] : lowest) - datum0);
  // tops of trees and buildings: the surface model less the ground, where it stands clear of it
  let tops: Applied['terrain']['tops'];
  if (st.surface) {
    const s = unpack(st.surface.heights), m = SIZE / 2 + 1, th2: number[] = new Array(m * m);
    for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) { const [e, nn] = world(fp.cx + i * 2 - SIZE / 2, fp.cz + j * 2 - SIZE / 2), d = at(s, e, nn) - at(g, e, nn); th2[j * m + i] = d === d && d > 2 ? r2(d) : 0; }
    tops = { n: m, size: SIZE, heights: th2, note: `Height of whatever stands more than 2 m above the ground, from LINZ's surface model less its ground model (${st.surface.title ?? 'LINZ 1 m LiDAR DSM'}). Trees and buildings are not told apart, and anything built or cleared since the flight is not shown.` };
  }
  // the legal parcel, clipped to the square of ground
  const features: Applied['features'] = [], half = SIZE / 2 - 0.5, inside = (p: [number, number]) => Math.abs(p[0] - fp.cx) <= half && Math.abs(p[1] - fp.cz) <= half;
  for (const ring of st.parcel?.rings ?? []) {
    const pts = ring.map(([lon, lat]) => { const q = toNZTM(lat, lon); return model(q.e, q.n); });
    let run: [number, number][] = [];
    const flush = () => { if (run.length >= 2) features.push({ kind: 'boundary', pts: run, source: `LINZ NZ Primary Parcels, live${st.parcel?.asOf ? ' (layer edited ' + st.parcel.asOf + ')' : ''}: a map of boundaries, not a survey`, open: true }); run = []; };
    for (let k = 0; k + 1 < pts.length; k++) {
      const a = pts[k], b = pts[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), steps = Math.max(1, Math.ceil(L));
      for (let t = 0; t <= steps; t++) { const p: [number, number] = [a[0] + ((b[0] - a[0]) * t) / steps, a[1] + ((b[1] - a[1]) * t) / steps]; if (inside(p)) { if (!(t === 0 && run.length && k > 0)) run.push([r2(p[0]), r2(p[1])]); } else flush(); }
    }
    flush();
  }
  const yr = (st.ground.captured?.to ?? st.ground.asOf ?? '').slice(0, 4);
  const source = `Ground: LINZ 1 m LiDAR ground model, ${st.ground.title ?? 'survey not identified'}${st.ground.captured ? `, flown ${st.ground.captured.from} to ${st.ground.captured.to}` : ''}; heights in NZVD2016, read by this browser straight from LINZ's open data on ${st.ground.fetchedAt.slice(0, 10)}. ${st.ground.credit} ` +
    `The ground's colour is drawn from those heights (greener where the ground is gentle, browner where it is steep) with a line each metre; it is not a photograph. House position: the point given (${P.moveTag === 'set by hand' ? `then moved ${P.east} m east and ${P.north} m north by hand` : 'taken as the middle of the house, assumed'}); north ${P.turnTag === 'set by hand' ? 'set by hand' : P.turnTag}; ${floorRule}` + (empty ? ` ${empty} cells of the square have no survey height and are drawn at the lowest surveyed level (assumed).` : '');
  return {
    terrain: { centre: [fp.cx, fp.cz], size: SIZE, n, heights, photoKind: 'contours', datum: r2(datum0), north: nv, source, tops,
      chip: 'Site: LINZ LiDAR ground', /* short enough to read in the bar; the survey, its year and "no aerial photo" are in the card, the layer note and the chip's tooltip */ layerNote: `LINZ 1 m LiDAR ground${yr ? ', ' + yr : ''}; coloured by its own slope with a line each metre, not a photo; cut to a platform only where it stands above the floor pad` },
    features, floor, floorRule, datum0, emptyCells: empty, groundUnder: { min: r2(lo), max: r2(hi), mean: r2(sum / cnt) },
  };
}

/** a picture of the ground made from its own heights (not a photograph): tinted by slope, with a line each metre, heavier
 *  each 5 m (NZVD2016). h is n × n levels relative to the model's datum, `cell` metres apart. */
export function contourPhoto(h: number[], n: number, datum0: number, cell = 1): string {
  const px = 1024, c = document.createElement('canvas'); c.width = c.height = px;
  const ctx = c.getContext('2d')!, img = ctx.createImageData(px, px), d = img.data;
  let lo = Infinity, hi = -Infinity; for (const v of h) { if (v < lo) lo = v; if (v > hi) hi = v; }
  // slope of each survey cell from its neighbours (one-sided at the edge of the square)
  const sl = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(n - 1, j + 1);
    sl[j * n + i] = Math.hypot((h[j * n + i1] - h[j * n + i0]) / ((i1 - i0) * cell), (h[j1 * n + i] - h[j0 * n + i]) / ((j1 - j0) * cell));
  }
  const z = new Float32Array(px * px), g = new Float32Array(px * px), s = (n - 1) / (px - 1);
  for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
    const fx = Math.min(n - 1.001, x * s), fy = Math.min(n - 1.001, y * s), i = Math.floor(fx), j = Math.floor(fy), a = fx - i, b = fy - j, k = j * n + i;
    z[y * px + x] = (h[k] * (1 - a) + h[k + 1] * a) * (1 - b) + (h[k + n] * (1 - a) + h[k + n + 1] * a) * b + datum0;
    g[y * px + x] = (sl[k] * (1 - a) + sl[k + 1] * a) * (1 - b) + (sl[k + n] * (1 - a) + sl[k + n + 1] * a) * b;
  }
  for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
    const k = y * px + x, v = z[k], vr = z[k + (x < px - 1 ? 1 : 0)], vd = z[k + (y < px - 1 ? px : 0)];
    const m1 = Math.floor(v) !== Math.floor(vr) || Math.floor(v) !== Math.floor(vd), m5 = Math.floor(v / 5) !== Math.floor(vr / 5) || Math.floor(v / 5) !== Math.floor(vd / 5);
    const [r, gg, bb] = groundTint(g[k], hi > lo ? (v - datum0 - lo) / (hi - lo) : 0.5, m5 ? 5 : m1 ? 1 : 0);
    d[k * 4] = r; d[k * 4 + 1] = gg; d[k * 4 + 2] = bb; d[k * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/jpeg', 0.9);
}

// ---- what is kept in this tab ---------------------------------------------------------------------------------------
export function loadGround(plan: Plan): GroundStore | null {
  try { const s = JSON.parse(sessionStorage.getItem(STORE) ?? 'null') as GroundStore | null; return s && s.v === 1 && s.plan === modelFingerprint(plan) ? s : null; } catch { return null; }
}
const keep = (s: GroundStore | null) => { if (s) sessionStorage.setItem(STORE, JSON.stringify(s)); else sessionStorage.removeItem(STORE); };
const rebuild = () => { const q = new URLSearchParams(location.search); q.set('ground', '1'); location.search = q.toString(); };
/** keep a read for this tab (the model is rebuilt on it next time the page opens with ?ground), and reload onto it */
export const keepGround = (s: GroundStore) => { try { keep(s); } catch { s.surface = null; s.surfaceWhy = 'left out: this browser tab had no room to keep it'; keep(s); } };
export const rebuildOnGround = () => rebuild();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const layerOf = (f: any): Layer => ({ heights: f.values.heights, title: f.values.survey?.title ?? null, captured: f.values.survey?.captured ?? null, identified: f.values.survey?.identified, credit: f.licence?.attribution ?? '', file: f.values.nationalModel?.file,
  asOf: f.asOf ?? null, fetchedAt: f.fetchedAt, heightAtPoint: f.values.heightAtPoint?.value ?? null, datum: f.values.verticalDatum?.name ?? 'NZVD2016' });

export type GroundRead = { status: 'read'; store: GroundStore; applied: Applied } | { status: 'unavailable'; reason: string };
/** Read LINZ's ground and tree tops round a point, and the parcel, straight from LINZ in this browser, and check the house
 *  can sit on it. Nothing is kept and nothing is drawn: the caller decides. A failure throws; it is never an answer.
 *  `parcel` is a boundary already in hand for this point (from Site facts); left out, LINZ's parcel map is asked. */
export async function readGround(plan: Plan, p: { lat: number; lon: number }, o: { signal: AbortSignal; onProgress?: (requests: number, bytes: number) => void; onPhase?: (phase: string) => void; parcel?: GroundStore['parcel'] }): Promise<GroundRead> {
  const t0 = performance.now(), seen: Record<string, { requests: number; bytes: number }> = {}, north = planNorth(plan);
  const total = () => Object.values(seen).reduce((a, v) => ({ requests: a.requests + v.requests, bytes: a.bytes + v.bytes }), { requests: 0, bytes: 0 });
  const opts = (k: string) => ({ lat: p.lat, lon: p.lon, radius: RADIUS, signal: o.signal, onProgress: (st: { requests: number; bytes: number }) => { seen[k] = { requests: st.requests, bytes: st.bytes }; const t = total(); o.onProgress?.(t.requests, t.bytes); } });
  // the ground decides everything; if it fails, the tops of trees and buildings are not waited for
  const ac2 = new AbortController(); o.signal.addEventListener('abort', () => ac2.abort(o.signal.reason), { once: true });
  const gP = (readLayer('ground', { ...opts('ground'), signal: ac2.signal }) as Promise<any>).catch((e: unknown) => { ac2.abort(e); throw e; }); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [g, s] = await Promise.allSettled([gP, readLayer('surface', { ...opts('surface'), signal: ac2.signal }) as Promise<any>]); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (g.status === 'rejected') throw g.reason;
  const gf = g.value;
  if (gf.status === 'unavailable') return { status: 'unavailable', reason: String(gf.reason ?? 'LINZ has no 1 m ground at this point.') };
  const theirs = gf.values.point;
  let parcel: GroundStore['parcel'] = o.parcel ?? null, parcelWhy: string | undefined;
  if (o.parcel === undefined) { // the boundary, straight from LINZ's parcel map
    o.onPhase?.('Ground read. Asking LINZ’s parcel map for the boundary');
    try { const pc = await parcelAt(p.lat, p.lon, { signal: o.signal }); parcel = pc.rings.length ? { rings: pc.rings, asOf: pc.asOf, credit: pc.credit } : null; if (pc.none) parcelWhy = 'LINZ’s parcel map has no primary parcel at this point.'; }
    catch (e) { if (o.signal.aborted) throw e; parcel = null; parcelWhy = `LINZ’s parcel map did not answer (${(e as Error).message}), so no boundary is drawn.`; }
  }
  const sf = s.status === 'fulfilled' && s.value.status !== 'unavailable' ? s.value : null, t = total(), secs = Math.round((performance.now() - t0) / 100) / 10;
  const store: GroundStore = { v: 1, plan: modelFingerprint(plan), point: { lat: p.lat, lon: p.lon, e: theirs.e, n: theirs.n }, ground: layerOf(gf), surface: sf ? layerOf(sf) : null,
    surfaceWhy: sf ? undefined : s.status === 'rejected' ? String((s.reason as Error)?.message ?? s.reason) : s.value.reason, parcel, parcelWhy,
    placement: { turnDeg: r2(north.deg), turnTag: north.tag, east: 0, north: 0, moveTag: 'assumed', floor: null, floorTag: 'assumed' }, read: { seconds: secs, requests: t.requests, bytes: t.bytes } };
  return { status: 'read', store, applied: applyGround(plan, store) }; // applyGround throws if the survey has nothing under the house
}

/** the card: fetch the ground for the site point, then say what was loaded and let the person place the house */
/** pause(true) stops the 3D view drawing while LINZ's files are read, so a slow graphics chip cannot hold the read up; pause(false) starts it again */
export function groundPanel(log: (m: string) => void, plan: Plan, loaded: { store: GroundStore; applied: Applied } | null, failed?: string, pause: (on: boolean) => void = () => {}): HTMLElement {
  const el = document.createElement('section');
  el.className = 'card'; el.id = 'siteGround';
  const own = !!plan.site?.terrain && !loaded, north = planNorth(plan);
  el.innerHTML = `<h3>Real ground</h3>
    <p class="small">${own ? 'This model carries its own surveyed ground, so nothing is read here.' : 'Puts the house on LINZ’s 1 m LiDAR ground for a point in New Zealand. The heights are a survey from the air, not a site survey.'}</p>
    <div ${own ? 'hidden' : ''}>
    <div class="row wrap"><input id="sgWhere" class="mono" placeholder="-36.80, 175.08" aria-label="Latitude, longitude of the site" style="flex:1;min-width:150px" /><button class="pill solid" id="sgGo">${loaded ? 'Read again' : 'Read the ground'}</button></div>
    <div class="row wrap" id="sgBusy" style="display:none"><button class="pill" id="sgStop">Stop</button></div>
    <p class="small" id="sgNote" role="status" aria-live="polite">${failed ? esc(failed) : PRIVACY}</p>
    <div id="sgOut"></div></div>
    <style>#siteGround .sg-list{list-style:none;margin:8px 0;padding:0}#siteGround .sg-list li{padding:7px 0;border-top:1px solid rgba(51,33,47,.12)}#siteGround .sg-top{display:flex;justify-content:space-between;gap:8px;align-items:baseline}#siteGround label.sg-f{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:6px 0}#siteGround label.sg-f input{width:92px}</style>`;
  const where = el.querySelector('#sgWhere') as HTMLInputElement, note = el.querySelector('#sgNote') as HTMLElement, out = el.querySelector('#sgOut') as HTMLElement, go = el.querySelector('#sgGo') as HTMLButtonElement;
  const busyRow = el.querySelector('#sgBusy') as HTMLElement, stopBtn = el.querySelector('#sgStop') as HTMLButtonElement;
  try { where.value = loaded ? `${loaded.store.point.lat}, ${loaded.store.point.lon}` : localStorage.getItem(WHERE) ?? ''; } catch { /* storage can be closed */ }
  try { const said = sessionStorage.getItem(STORE + '-note'); if (said && !loaded) note.textContent = said; sessionStorage.removeItem(STORE + '-note'); } catch { /* nothing kept */ }
  // the parcel outline comes from the Site facts answer when that card has looked the point up
  let parcel: GroundStore['parcel'] = loaded?.store.parcel ?? null, parcelFor = loaded ? `${loaded.store.point.lat},${loaded.store.point.lon}` : '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const takeParcel = (lat: number, lon: number, facts: any) => {
    const f = facts ? (Object.values(facts) as { id?: string; status?: string; asOf?: string; values?: { outline?: { type: string; coordinates: unknown } }; licence?: { attribution?: string } }[]).find((x) => x.id === 'site.parcel') : null, o = f?.status === 'live' ? f.values?.outline : null;
    if (!o) return;
    const polys = (o.type === 'Polygon' ? [o.coordinates] : o.type === 'MultiPolygon' ? o.coordinates : []) as [number, number][][][];
    parcel = { rings: polys.flat(), asOf: f?.asOf ? String(f.asOf).slice(0, 10) : null, credit: f?.licence?.attribution ?? '' }; parcelFor = `${lat},${lon}`;
  };
  let busy: AbortController | null = null, stoppedByHand = false, rebuilding = false;
  stopBtn.addEventListener('click', () => { stoppedByHand = true; busy?.abort(new Error('stopped by hand')); });
  const run = async () => {
    if (busy) return;
    const p = parseWhere(where.value);
    if (!p) { note.textContent = 'That is not a point in New Zealand. Use decimal degrees, latitude first: -36.80, 175.08'; return; }
    try { localStorage.setItem(WHERE, where.value.trim()); } catch { /* fine */ }
    const ac = new AbortController(), t0 = performance.now(), seen = { requests: 0, bytes: 0 };
    busy = ac; stoppedByHand = false; go.disabled = true; busyRow.style.display = ''; pause(true);
    let phase = 'Reading LINZ’s ground files from this browser (the 3D view rests meanwhile)';
    const show = () => { note.textContent = progressText(phase, seen.requests, seen.bytes, (performance.now() - t0) / 1000); };
    const tick = setInterval(show, 500), cap = setTimeout(() => ac.abort(new Error(`it took longer than ${LIMIT_S} s`)), LIMIT_S * 1000);
    show();
    try {
      const res = await readGround(plan, p, { signal: ac.signal, onProgress: (r, b) => { seen.requests = r; seen.bytes = b; }, onPhase: (t) => { phase = t; show(); }, parcel: parcelFor === `${p.lat},${p.lon}` ? parcel : undefined });
      if (res.status === 'unavailable') { // say so, and go back to the labelled assumed ground if real ground was showing
        const msg = `No real ground here: ${res.reason} The model ${loaded ? 'goes back to' : 'keeps'} its assumed ground, labelled as assumed.`;
        keep(null); note.textContent = msg; log('No LINZ ground for that point; the assumed ground stays.');
        if (loaded) { try { sessionStorage.setItem(STORE + '-note', msg); } catch { /* fine */ } rebuilding = true; rebuild(); }
        return;
      }
      const st = res.store, secs = st.read?.seconds ?? 0;
      parcel = st.parcel; parcelFor = `${p.lat},${p.lon}`;
      keepGround(st);
      log(`LINZ ground read by this browser in ${secs} s (${st.read?.requests ?? 0} answers, ${((st.read?.bytes ?? 0) / 1e6).toFixed(1)} MB): ${st.ground.title ?? 'survey not identified'}.`);
      clearInterval(tick); note.textContent = `Ground read in ${secs} s. Rebuilding the model on it…`; rebuilding = true; rebuild();
    } catch (e) {
      const why = stoppedByHand ? 'you stopped it' : (e as Error)?.message ?? String(e);
      note.textContent = loaded
        ? `The ground for ${p.lat}, ${p.lon} could not be read (${why}). The model still shows the ground read earlier for ${loaded.store.point.lat}, ${loaded.store.point.lon}; nothing new was placed, and nothing is guessed.`
        : `The ground could not be read (${why}). The model stays on its assumed ground, labelled as assumed; nothing is guessed. Try again in a moment.`;
      log('LINZ ground not read: ' + why + '. Nothing was kept.');
    } finally { clearInterval(tick); clearTimeout(cap); busy = null; go.disabled = false; busyRow.style.display = 'none'; if (!rebuilding) pause(false); }
  };
  go.addEventListener('click', () => void run());
  where.addEventListener('keydown', (e) => { if (e.key === 'Enter') void run(); });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addEventListener('assembl:site-facts', ((ev: CustomEvent<{ lat: number; lon: number; facts: any }>) => { takeParcel(ev.detail.lat, ev.detail.lon, ev.detail.facts); if (!loaded && !own) { where.value = `${ev.detail.lat}, ${ev.detail.lon}`; void run(); } }) as EventListener);   // a dropped plan with a site point: the ground follows without another click

  if (loaded) {
    const { store: st, applied: ap } = loaded, P = st.placement, G = st.ground, tag = (t: Tag) => `<span class="mono small">${t === 'assumed' ? '□' : '■'} ${t}</span>`;
    const row = (label: string, value: string, src: string, small = '') => `<li><div class="sg-top"><b>${esc(label)}</b><span class="mono small">${esc(src)}</span></div><div>${esc(value)}</div>${small ? `<div class="small">${esc(small)}</div>` : ''}</li>`;
    out.innerHTML = `<ul class="sg-list">
      ${row('Ground', G.title ?? 'LINZ 1 m LiDAR (survey not identified)', '■ from the survey', `1 m cells${G.captured ? `, flown ${G.captured.from} to ${G.captured.to}` : ''}. ${G.identified ? G.identified + '. ' : ''}Read by this browser straight from LINZ on ${G.fetchedAt.slice(0, 10)}${st.read ? ` in ${st.read.seconds} s (${st.read.requests} answers, ${(st.read.bytes / 1e6).toFixed(1)} MB)` : ''}.`)}
      ${row('Level at the point', G.heightAtPoint == null ? 'no height' : `${G.heightAtPoint.toFixed(2)} m`, '■ from the survey', `${G.datum}. LINZ describes this LiDAR as generally about 0.2 m accurate in height.`)}
      ${row('Ground under the house', `${ap.groundUnder.min.toFixed(2)} to ${ap.groundUnder.max.toFixed(2)} m`, '■ from the survey', ap.emptyCells ? `${ap.emptyCells} cells of the square have no survey height and are drawn at the lowest surveyed level (assumed).` : '')}
      ${row('Tree and building tops', st.surface ? st.surface.title ?? 'LINZ 1 m LiDAR surface model' : 'not loaded', st.surface ? '■ from the survey' : '□ not loaded', st.surface ? 'Turn on the “Tree and building tops” layer to see them: plain blocks where something stands more than 2 m above the ground. Trees and buildings are not told apart.' : st.surfaceWhy ?? '')}
      ${row('Legal boundary', st.parcel ? (ap.features.length ? 'drawn on the ground' : 'outside the square of ground shown') : 'not drawn', st.parcel ? '■ LINZ parcels, live' : '□ not loaded', st.parcel ? `LINZ’s digital parcel map${st.parcel.asOf ? ' (layer edited ' + st.parcel.asOf + ')' : ''}: a map of boundaries, not a survey. Its place against the house depends on the point and the turn below.` : st.parcelWhy ?? 'No parcel outline came back, so no boundary is drawn.')}
      ${row('Ground colour', 'drawn from the survey heights', '□ not a photograph', 'Greener where the ground is gentle, browner where it is steep, with a line each metre and a darker one each 5 m. No aerial photo is connected, so it does not show grass, paths or buildings.')}
    </ul>
    <p class="small"><b>Placing the house.</b> The point is taken as the middle of the house. The plan’s north is taken as true north (the survey grid is turned ${Math.abs(convergence(st.point.lat, st.point.lon)).toFixed(2)}° from it here, and that is allowed for).</p>
    <label class="sg-f"><span>North, degrees clockwise from up the sheet ${tag(P.turnTag)}</span><input id="sgTurn" type="number" step="1" value="${P.turnDeg}"></label>
    <p class="small">${esc(P.turnTag === 'set by hand' ? 'Set by hand.' : north.says + '.')}</p>
    <label class="sg-f"><span>Move east, m ${tag(P.moveTag)}</span><input id="sgE" type="number" step="0.5" min="-${NUDGE_MAX}" max="${NUDGE_MAX}" value="${P.east}"></label>
    <label class="sg-f"><span>Move north, m</span><input id="sgN" type="number" step="0.5" min="-${NUDGE_MAX}" max="${NUDGE_MAX}" value="${P.north}"></label>
    <label class="sg-f"><span>Floor level, m NZVD2016 ${tag(P.floorTag)}</span><input id="sgF" type="number" step="0.05" value="${ap.floor.toFixed(2)}"></label>
    <p class="small" id="sgRule">${esc(ap.floorRule)}</p>
    <div class="row wrap"><button class="pill solid" id="sgApply">Apply and rebuild</button><button class="pill" id="sgSave">Save the plan with its ground</button><button class="pill" id="sgOff">Remove the ground</button></div>
    <p class="small">Saving writes a file that shows where the site is. Sharing a link does not include the ground or the point.</p>
    <p class="small">${esc(G.credit)}${st.parcel?.credit ? ' ' + esc(st.parcel.credit) : ''}</p>`;
    const num = (id: string) => Number((out.querySelector(id) as HTMLInputElement).value);
    out.querySelector('#sgApply')!.addEventListener('click', () => {
      const turn = num('#sgTurn'), e = Math.max(-NUDGE_MAX, Math.min(NUDGE_MAX, num('#sgE'))), n = Math.max(-NUDGE_MAX, Math.min(NUDGE_MAX, num('#sgN'))), f = num('#sgF');
      if (![turn, e, n, f].every(isFinite)) { note.textContent = 'Those need to be numbers.'; return; }
      const next: Placement = { ...P };
      if (turn !== P.turnDeg) { next.turnDeg = turn; next.turnTag = 'set by hand'; }
      if (e !== P.east || n !== P.north) { next.east = e; next.north = n; next.moveTag = 'set by hand'; }
      if (Math.abs(f - ap.floor) > 0.004) { next.floor = r2(f); next.floorTag = 'set by hand'; }
      try { applyGround(plan, { ...st, placement: next }); } catch (err) { note.textContent = `That placement does not work: ${(err as Error).message}.`; return; }
      keep({ ...st, placement: next }); rebuild();
    });
    out.querySelector('#sgOff')!.addEventListener('click', () => { keep(null); rebuild(); });
    out.querySelector('#sgSave')!.addEventListener('click', () => {
      const t = ap.terrain, saved = { ...plan, site: { ...(plan.site ?? {}), terrain: { ...t, floorLevelNZVD2016: r2(ap.floor), placement: P, point: st.point }, features: [...(plan.site?.features ?? []), ...ap.features] } };
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(saved)], { type: 'application/json' })); a.download = 'plan-with-ground.plan.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      log('Plan with its ground offered for download. The file shows where the site is.');
    });
  }
  return el;
}
