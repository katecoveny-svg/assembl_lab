// An opened IFC or GLB on its real site: LINZ's 1 m LiDAR ground, coloured by slope with a line each metre, and the LINZ parcel,
// the same ground the Real ground card puts under a plan (siteGround.ts). Nothing reloads: the ground is built under the model in
// place, so the model file never has to be kept anywhere.
// The site point comes, in order, from the workspace's hand-over, the IFC itself (its map conversion or IfcSite), or the person.
// North comes from the IFC (TrueNorth, or its map conversion) or is a proposal until a person confirms or sets it. The ground
// storey's level comes from the IFC when it states one near the LiDAR ground; otherwise a stated rule. Every value is labelled.
// Under the model the ground is cut and filled to a level platform a metre wider than its box (assumed, and said so).
// The LiDAR is read by this browser straight from LINZ (linz/ground.js); the lab's server never receives the point.
import * as THREE from 'three/webgpu';
import { applyGroundAt, convergence, frameOf, readGroundFor, toNZTM, PRIVACY, type Applied, type Footprint, type GroundStore, type Placement, type Tag } from './siteGround';
import { fromNZTM } from './linz/nztm.js';
import { parseWhere } from './siteFacts';
import { floorFor, groundStorey, isNZTM, northFrom, pickSitePoint, type IfcSiteInfo, type SitePoint } from './modelSite';
import type { HandoffSite } from './handoff';
import { progressText, LIMIT_S } from './groundLook';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const f2 = (v: number) => v.toFixed(2);

export interface Terrainish { centre: [number, number]; size: number; n: number; heights: number[]; datum?: number; source?: string; chip?: string; layerNote?: string; photoKind?: 'contours'; north?: [number, number] }
export interface ModelSiteCtx {
  name: string; kind: 'ifc' | 'glb';
  /** what the IFC's own text says about its site (null for a GLB) */
  info: IfcSiteInfo | null;
  site: HandoffSite | null;
  /** scene = model frame + shift (the model was moved to the origin and stood on y = 0 when it was opened) */
  shift: THREE.Vector3;
  /** the model's box in the scene */
  box: THREE.Box3;
  /** where the ground layer's pieces go, and the flat ground shown until the real ground is read */
  holder: THREE.Group; flat: THREE.Object3D;
  build: (T: Terrainish, yAt: (x: number, z: number) => number) => Promise<THREE.Group>;
  boundary: (features: Applied['features'], yAt: (x: number, z: number) => number) => THREE.Object3D;
  log: (m: string) => void;
  pause: (on: boolean) => void;
  /** told each time the ground under the model changes (null: flat again) */
  onGround: (g: ModelGround | null) => void;
}
export interface ModelGround {
  /** ground level at a scene point, the platform under the model included */
  yAt: (x: number, z: number) => number;
  /** metres true north and true east of the site point, from a scene point */
  fromPoint: (x: number, z: number) => [number, number];
  point: SitePoint; applied: Applied; store: GroundStore; floorTag: string;
  /** a NZTM point (e, n) in the scene (x, z): for things LINZ gives in map coordinates, such as building outlines */
  toScene: (e: number, n: number) => [number, number];
}

export function modelGroundPanel(ctx: ModelSiteCtx) {
  const el = document.createElement('section');
  el.className = 'card'; el.id = 'modelGround';
  const info = ctx.info, sy = ctx.shift.y;
  // the ground storey, in the scene: the model's own storey level, moved as the model was moved
  const gs = groundStorey(info?.storeys ?? []), storeyY = gs ? gs.elevation + sy : ctx.box.min.y;
  const bottomBelow = Math.max(0, storeyY - ctx.box.min.y);
  const stated = info && gs ? (info.map && isNZTM(info.map.crs) ? info.map.height + gs.elevation : info.elevation != null ? info.elevation + gs.elevation : null) : null;
  const statedWhy = info?.map && isNZTM(info.map.crs) ? 'the map conversion’s OrthogonalHeight plus the storey’s elevation' : 'IfcSite RefElevation plus the storey’s elevation';
  const fp: Footprint = { x0: ctx.box.min.x, z0: ctx.box.min.z, W: ctx.box.max.x - ctx.box.min.x, D: ctx.box.max.z - ctx.box.min.z, cx: (ctx.box.min.x + ctx.box.max.x) / 2, cz: (ctx.box.min.z + ctx.box.max.z) / 2, floor: storeyY };
  let typed: { lat: number; lng: number } | null = null, keepStated = false, byHand: number | null = null, busy: AbortController | null = null;
  let store: GroundStore | null = null, current: ModelGround | null = null, last: ReturnType<typeof floorFor> | null = null;
  const point = () => pickSitePoint({ handoff: ctx.site?.point ?? null, ifc: info, typed, fromMap: (e, n) => fromNZTM(e, n) as { lat: number; lon: number } });
  const tagMark = (t: string) => `<span class="mono small">${/assumed|proposed/.test(t) ? '□' : '■'} ${esc(t)}</span>`;
  const said = info ? (info.said.length ? `The IFC says: ${info.said.join(', ')}.` : 'The IFC gives no site, north or map position.') : 'A GLB carries no site, north or level: they are set here.';

  el.innerHTML = `<h3>On its site</h3>
    <p class="small">Puts the model on LINZ’s 1 m LiDAR ground at its site point, with the parcel. The heights are a survey from the air, not a site survey.</p>
    <p class="small" id="mgSaid">${esc(said)}</p>
    <div id="mgPoint"></div>
    <div class="row wrap"><input id="mgWhere" class="mono" placeholder="-36.85, 174.76" aria-label="Latitude, longitude of the site" style="flex:1;min-width:150px" /><button class="pill solid" id="mgGo">Put it on the ground</button></div>
    <div class="row wrap" id="mgBusy" style="display:none"><button class="pill" id="mgStop">Stop</button></div>
    <p class="small" id="mgNote" role="status" aria-live="polite">${esc(PRIVACY)}</p>
    <div id="mgOut"></div>
    <style>#modelGround .sg-list{list-style:none;margin:8px 0;padding:0}#modelGround .sg-list li{padding:7px 0;border-top:1px solid var(--line)}#modelGround .sg-top{display:flex;justify-content:space-between;gap:8px;align-items:baseline}#modelGround label.sg-f{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:6px 0}#modelGround label.sg-f input{width:92px}</style>`;
  const $ = <T extends HTMLElement>(s: string) => el.querySelector(s) as T;
  const where = $<HTMLInputElement>('#mgWhere'), note = $<HTMLElement>('#mgNote'), out = $<HTMLElement>('#mgOut'), go = $<HTMLButtonElement>('#mgGo'), pt = $<HTMLElement>('#mgPoint');
  const showPoint = () => {
    const p = point();
    pt.innerHTML = p
      ? `<ul class="sg-list"><li><div class="sg-top"><b>Site point</b>${tagMark(p.source)}</div><div class="mono">${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}</div><div class="small">${esc(p.note)}. Taken as ${p.source === 'from the IFC map conversion' ? 'the model’s own origin' : 'the middle of the model (assumed)'}.</div></li></ul>`
      : `<p class="small">No site point yet: the workspace did not hand one across and the IFC has none. Type one, or look up an address in Site facts.</p>`;
    if (p && !where.value) where.value = `${p.lat}, ${p.lng}`;
  };
  showPoint();

  /** the placement the model starts with at a point, every part labelled */
  const startPlacement = (p: SitePoint): Placement => {
    const gam = convergence(p.lat, p.lng), n = northFrom(info, gam);
    const pl: Placement = { turnDeg: n.deg, turnTag: n.tag as Tag, east: 0, north: 0, moveTag: 'assumed', floor: null, floorTag: 'assumed' };
    if (p.source === 'from the IFC map conversion') {
      // the point is the model's origin: move the model so its middle sits where the map conversion puts it
      const th = (n.deg * Math.PI) / 180, nv = [Math.sin(th), -Math.cos(th)], ev = [Math.cos(th), Math.sin(th)];
      const dx = fp.cx - ctx.shift.x, dz = fp.cz - ctx.shift.z, de = dx * ev[0] + dz * ev[1], dn = dx * nv[0] + dz * nv[1], g = (gam * Math.PI) / 180;
      pl.east = Math.round((de * Math.cos(g) - dn * Math.sin(g)) * 100) / 100; pl.north = Math.round((de * Math.sin(g) + dn * Math.cos(g)) * 100) / 100; pl.moveTag = 'from the IFC';
    }
    return pl;
  };
  const rule = () => (u: { min: number; max: number; mean: number }) => { const r = floorFor({ stated, bottomBelow, under: u, byHand, keepStated }); last = r; return { floor: r.floor, text: r.text }; };

  /** build the ground for the store as it stands, under the model */
  const place = async (st: GroundStore) => {
    const ap = applyGroundAt(fp, st, rule()), T = ap.terrain as Terrainish, fr = frameOf(fp, st);
    const grid = (x: number, z: number) => {
      const fx = Math.min(T.n - 1.001, Math.max(0, ((x - T.centre[0]) / T.size + 0.5) * (T.n - 1))), fz = Math.min(T.n - 1.001, Math.max(0, ((z - T.centre[1]) / T.size + 0.5) * (T.n - 1)));
      const i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j, H = T.heights, n = T.n;
      return (H[j * n + i] * (1 - a) + H[j * n + i + 1] * a) * (1 - b) + (H[(j + 1) * n + i] * (1 - a) + H[(j + 1) * n + i + 1] * a) * b;
    };
    // the platform: inside the box round the model (and a metre round it) the ground is cut and filled level with the model's
    // lowest part, so the model neither floats over a fall nor sinks into a rise; outside it the ground is as surveyed
    const bottom = ctx.box.min.y - 0.02, m = 1;
    const yAt = (x: number, z: number) => (x > fp.x0 - m && x < fp.x0 + fp.W + m && z > fp.z0 - m && z < fp.z0 + fp.D + m ? bottom : grid(x, z));
    const g = await ctx.build(T, yAt);
    for (const c of [...ctx.holder.children]) { ctx.holder.remove(c); c.traverse((o) => { const mm = o as THREE.Mesh; mm.geometry?.dispose?.(); }); }
    ctx.holder.add(g);
    if (ap.features.length) ctx.holder.add(ctx.boundary(ap.features, yAt));
    ctx.holder.userData = { kind: 'terrain', name: 'Ground', source: 'survey', note: T.source ?? '' };
    ctx.flat.visible = false;
    const p = point()!;
    current = { yAt, fromPoint: fr.fromPoint, toScene: fr.model, point: p, applied: ap, store: st, floorTag: last?.tag ?? 'assumed' };
    ctx.onGround(current);
    render(st, ap, p);
    return current;
  };

  const render = (st: GroundStore, ap: Applied, p: SitePoint) => {
    const P = st.placement, G = st.ground, n = northFrom(info, convergence(p.lat, p.lng));
    const row = (label: string, value: string, src: string, small = '') => `<li><div class="sg-top"><b>${esc(label)}</b>${tagMark(src)}</div><div>${esc(value)}</div>${small ? `<div class="small">${esc(small)}</div>` : ''}</li>`;
    const turnSays = P.turnTag === 'set by hand' ? 'Set by hand.' : P.turnTag === 'confirmed here' ? 'Confirmed here.' : n.says + '.';
    out.innerHTML = `<ul class="sg-list">
      ${row('Ground', G.title ?? 'LINZ 1 m LiDAR (survey not identified)', 'from the survey', `1 m cells${G.captured ? `, flown ${G.captured.from} to ${G.captured.to}` : ''}. Read by this browser straight from LINZ on ${G.fetchedAt.slice(0, 10)}${st.read ? ` in ${st.read.seconds} s` : ''}. Coloured by its own slope with a line each metre; not a photograph.`)}
      ${row('Ground under the model', `${f2(ap.groundUnder.min)} to ${f2(ap.groundUnder.max)} m NZVD2016`, 'from the survey', ap.emptyCells ? `${ap.emptyCells} cells have no survey height and are drawn at the lowest surveyed level (assumed).` : '')}
      ${row('Legal boundary', st.parcel ? (ap.features.length ? 'drawn on the ground' : 'outside the square of ground shown') : 'not drawn', st.parcel ? 'LINZ parcels, live' : 'not loaded', st.parcel ? 'LINZ’s parcel map: a map of boundaries, not a survey. Its place against the model depends on the point and north below.' : st.parcelWhy ?? '')}
      ${row('Ground storey', gs ? `${gs.name || 'unnamed'} at ${f2(gs.elevation)} m in the model` : 'no storeys: the bottom of the model', gs ? 'from the IFC' : 'assumed', gs ? `Taken as the ground storey: ${gs.why}.` : 'A GLB has no storeys; its lowest point is taken as its ground floor.')}
    </ul>
    <label class="sg-f"><span>North, degrees clockwise from up the model’s plan ${tagMark(P.turnTag)}</span><input id="mgTurn" type="number" step="1" value="${P.turnDeg}"></label>
    <p class="small">${esc(turnSays)}${P.turnTag === 'proposed' ? ' <button class="pill" id="mgNorthOk">Confirm north</button>' : ''}</p>
    <label class="sg-f"><span>Move east, m ${tagMark(P.moveTag)}</span><input id="mgE" type="number" step="0.5" value="${P.east}"></label>
    <label class="sg-f"><span>Move north, m</span><input id="mgN" type="number" step="0.5" value="${P.north}"></label>
    <label class="sg-f"><span>Ground storey level, m NZVD2016 ${tagMark(last?.tag ?? 'assumed')}</span><input id="mgF" type="number" step="0.05" value="${f2(ap.floor)}"></label>
    <p class="small" id="mgRule">${esc(ap.floorRule)}</p>
    ${stated != null ? `<label class="small"><input type="checkbox" id="mgKeep" ${keepStated ? 'checked' : ''}> Use the level the IFC states (${f2(stated)} m, ${esc(statedWhy)})</label>` : ''}
    <div class="row wrap"><button class="pill solid" id="mgApply">Apply</button><button class="pill" id="mgOff">Back to flat ground</button></div>
    <p class="small">${esc(G.credit)}${st.parcel?.credit ? ' ' + esc(st.parcel.credit) : ''}</p>`;
    const num = (id: string) => Number(($<HTMLInputElement>(id)).value);
    $<HTMLButtonElement>('#mgApply').addEventListener('click', () => {
      const turn = num('#mgTurn'), e = num('#mgE'), nn = num('#mgN'), f = num('#mgF');
      if (![turn, e, nn, f].every(isFinite)) { note.textContent = 'Those need to be numbers.'; return; }
      const next: Placement = { ...P };
      if (turn !== P.turnDeg) { next.turnDeg = turn; next.turnTag = 'set by hand'; }
      if (e !== P.east || nn !== P.north) { next.east = e; next.north = nn; next.moveTag = 'set by hand'; }
      if (Math.abs(f - ap.floor) > 0.004) byHand = Math.round(f * 100) / 100;
      keepStated = !!$<HTMLInputElement>('#mgKeep')?.checked; if (keepStated && Math.abs(f - ap.floor) <= 0.004) byHand = null;
      store = { ...st, placement: next }; void place(store).then(() => ctx.log('Placement applied.'));
    });
    el.querySelector('#mgNorthOk')?.addEventListener('click', () => { store = { ...st, placement: { ...P, turnTag: 'confirmed here' } }; void place(store); ctx.log('North confirmed as shown.'); });
    $<HTMLInputElement>('#mgKeep')?.addEventListener('change', (ev) => { keepStated = (ev.target as HTMLInputElement).checked; byHand = null; void place(st); });
    $<HTMLButtonElement>('#mgOff').addEventListener('click', () => { for (const c of [...ctx.holder.children]) ctx.holder.remove(c); ctx.flat.visible = true; current = null; store = null; out.innerHTML = ''; ctx.onGround(null); note.textContent = 'Back on flat ground, labelled as assumed.'; });
  };

  const run = async () => {
    if (busy) return;
    const p = point();
    if (!p) { note.textContent = 'That is not a point in New Zealand. Use decimal degrees, latitude first: -36.85, 174.76'; return; }
    const ac = new AbortController(), t0 = performance.now(), seen = { requests: 0, bytes: 0 };
    busy = ac; go.disabled = true; $<HTMLElement>('#mgBusy').style.display = ''; ctx.pause(true);
    let phase = 'Reading LINZ’s ground files from this browser (the 3D view rests meanwhile)';
    const show = () => { note.textContent = progressText(phase, seen.requests, seen.bytes, (performance.now() - t0) / 1000); };
    const tick = setInterval(show, 500), cap = setTimeout(() => ac.abort(new Error(`it took longer than ${LIMIT_S} s`)), LIMIT_S * 1000);
    show();
    try {
      const pl = startPlacement(p);
      const res = await readGroundFor({ key: `model:${ctx.name}`, north: { deg: pl.turnDeg, tag: pl.turnTag }, apply: (st) => applyGroundAt(fp, { ...st, placement: pl }, rule()) }, { lat: p.lat, lon: p.lng }, { signal: ac.signal, onProgress: (r, b) => { seen.requests = r; seen.bytes = b; }, onPhase: (t) => { phase = t; show(); } });
      if (res.status === 'unavailable') { note.textContent = `No real ground here: ${res.reason} The model stays on flat ground, labelled as assumed.`; return; }
      store = { ...res.store, placement: pl };
      ctx.pause(false);
      await place(store);
      note.textContent = `Ground read in ${res.store.read?.seconds ?? 0} s, straight from LINZ. ${p.source === 'typed here' ? 'Point typed here.' : `Point ${p.source}.`}`;
      ctx.log(`On LINZ ground at the site point (${p.source}).`);
    } catch (e) {
      note.textContent = `The ground could not be read (${(e as Error)?.message ?? e}). The model stays on ${current ? 'the ground read before' : 'flat ground, labelled as assumed'}; nothing is guessed.`;
    } finally { clearInterval(tick); clearTimeout(cap); busy = null; go.disabled = false; $<HTMLElement>('#mgBusy').style.display = 'none'; ctx.pause(false); }
  };
  go.addEventListener('click', () => { const q = parseWhere(where.value), p0 = point(); if (q && (!p0 || Math.abs(q.lat - p0.lat) > 1e-7 || Math.abs(q.lon - p0.lng) > 1e-7)) { typed = { lat: q.lat, lng: q.lon }; showPoint(); } void run(); });
  where.addEventListener('keydown', (e) => { if (e.key === 'Enter') go.click(); });
  $<HTMLButtonElement>('#mgStop').addEventListener('click', () => busy?.abort(new Error('stopped by hand')));
  // a point found in Site facts (an address, or coordinates looked up there) is the person's choice of point
  addEventListener('assembl:site-facts', ((ev: CustomEvent<{ lat: number; lon: number }>) => { typed = { lat: ev.detail.lat, lng: ev.detail.lon }; where.value = `${ev.detail.lat}, ${ev.detail.lon}`; showPoint(); void run(); }) as EventListener);
  // a point from the workspace or from the IFC: the ground follows without another click
  const auto = point();
  return { el, start: () => { if (auto) void run(); }, current: () => current, fp, toNZTM };
}
