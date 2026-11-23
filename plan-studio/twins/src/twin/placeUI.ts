// Place the building: where an opened model stands on its site. The project's site point is a LINZ address point (the road
// address, not the middle of the building) and an IFC from Revit rarely says where it is, so the page starts with the building's
// middle at the site point, assumed, and offers three ways to do better, each labelled:
//   1. Match to an existing building: when the model carries a building that is already there, its footprint is fitted to the
//      LINZ outline of similar size and shape near the site point (placeFit.ts), starting from the IFC's own true north when it
//      has one; then the model's own ground surfaces, if any, are checked against LiDAR. Assumed, with the residual, until a
//      person confirms it.
//   2. By hand: drag the building over the LiDAR ground, and turn it with the slider, with the existing buildings and the
//      parcel in view for reference.
//   3. Check against the site plan: the project's Site plan sheet laid on the ground, half see-through, scaled and turned by a
//      person from the sheet's own scale bar and north point.
// Only Confirm placement makes it "set by a person". It is then saved back to the project (handoff.ts putBackRecord, kind
// 'placement'), so the next Open in 3D starts from it. Nothing here invents a placement.
import * as THREE from 'three/webgpu';
import type { App } from './app';
import { putBackRecord, type HandoffSite } from './handoff';
import { bestMatch, clusters, existingGroup, groundAgreement, hull, placementFrom, plan, type Candidate, type P2, type Part, type PlacementRecord } from './placeFit';
import { convergence } from './siteGround';
import type { ModelGround, PlaceRequest } from './modelGround';
import type { Outline } from './contextRules';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const r2 = (v: number) => Math.round(v * 100) / 100;
const SKIP = /^(IfcSite|IfcSpace|IfcOpeningElement|IfcAnnotation|IfcGrid|IfcVirtualElement)$/;
const GROUNDISH = /topo|toposolid|terrain|ground|landscape|site/i;

export interface PlaceCtx {
  name: string; handoffId: string | null; site: HandoffSite | null;
  /** the opened model, as it stands in the scene */
  model: THREE.Object3D;
  /** things that move with the building while it is dragged (planting, contact shade, the camera path) */
  movers: () => THREE.Object3D[];
  /** the building's own box in the scene (buildingBounds) */
  box: THREE.Box3;
  /** the IFC's own true north as a turn (frameOf's turnDeg), when it says */
  ifcNorth: number | null;
  ground: () => ModelGround | null;
  setPlacement: (r: PlaceRequest) => Promise<unknown>;
  busy: () => boolean;
  /** LINZ outlines round the site point (NZTM), read once */
  outlines: () => Promise<Outline[]>;
  kept: PlacementRecord | null;
}

type Status = { state: 'assumed' | 'set by a person'; method: PlacementRecord['method']; words: string; residual: number | null; matched: string | null; by?: string; at?: string };

async function sheetCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  if (blob.type === 'application/pdf' || /%PDF-/.test(new TextDecoder().decode(new Uint8Array(await blob.slice(0, 1024).arrayBuffer())))) {
    const { openPdf, sheetThumb } = await import('./planTrace');
    const doc = await openPdf(await blob.arrayBuffer());
    return (await sheetThumb(await doc.getPage(1), 1800)) as unknown as HTMLCanvasElement;
  }
  const bmp = await createImageBitmap(blob), k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}

export function placePanel(app: App, ctx: PlaceCtx) {
  const el = document.createElement('section');
  el.className = 'card'; el.id = 'placeBuilding';
  const hasPlan = !!ctx.site?.files?.site_plan;
  el.innerHTML = `<h3>Place the building</h3>
    <p class="small">The site point is a LINZ address point, so the building’s middle is only assumed to be there. Match it to a building LINZ already has, or move and turn it by hand, then confirm.</p>
    <p id="pbStatus" class="pb-status" role="status" aria-live="polite"></p>
    <div class="row wrap"><button class="pill solid" id="pbMatch">Match to an existing building</button></div>
    <label class="sg-f small" id="pbPickRow" hidden><span>The existing building in the model</span><select id="pbGroup"></select></label>
    <div class="row wrap"><button class="pill" id="pbDrag" aria-pressed="false">Move by dragging</button><button class="pill" id="pbClick">Pick it in the view</button></div>
    <label class="slider small">Turn, degrees <input id="pbTurn" type="range" min="-180" max="180" step="0.5" value="0" style="flex:1"><span class="mono" id="pbTurnV">0°</span></label>
    <div class="row wrap"><input id="pbWho" placeholder="Your initials" aria-label="Your initials, to confirm the placement" style="width:120px"><button class="pill solid" id="pbOk">Confirm placement</button></div>
    ${hasPlan ? `<details id="pbPlanBox"><summary class="small">Check against the site plan</summary>
      <label class="small"><input type="checkbox" id="pbPlan"> Show the site plan on the ground</label>
      <label class="sg-f small"><span>Sheet width on the ground, m <span class="mono" id="pbWTag">□ assumed</span></span><input id="pbW" type="number" step="1" min="5" value="120" style="width:90px"></label>
      <label class="slider small">Sheet turn <input id="pbPT" type="range" min="-180" max="180" step="0.5" value="0" style="flex:1"><span class="mono" id="pbPTV">0°</span></label>
      <label class="slider small">See-through <input id="pbPO" type="range" min="0.15" max="0.9" step="0.05" value="0.55" style="flex:1"></label>
      <div class="row wrap"><button class="pill" id="pbPlanDrag" aria-pressed="false">Move the sheet by dragging</button></div>
      <p class="small">Set the width from the sheet’s scale bar and turn it to its north point; the sheet is only a check, not a source of the placement.</p></details>` : ''}
    <p class="small" id="pbNote"></p>
    <style>#placeBuilding .pb-status{font-weight:600;margin:6px 0}#placeBuilding .pb-status .mono{font-weight:400}#placeBuilding [aria-pressed="true"]{background:var(--ink,#240B21);color:var(--paper,#FFFDFB)}#placeBuilding select{max-width:100%;min-width:0}#placeBuilding details label{display:flex;gap:8px;align-items:center;justify-content:space-between;margin:6px 0}#placeBuilding details label.small:first-of-type{justify-content:flex-start}</style>`;
  const $ = <T extends HTMLElement>(s: string) => el.querySelector(s) as T;
  const statusEl = $<HTMLElement>('#pbStatus'), note = $<HTMLElement>('#pbNote'), turnIn = $<HTMLInputElement>('#pbTurn'), turnV = $<HTMLElement>('#pbTurnV');
  // on the 3D view: what the placement is, in one line
  const chip = document.createElement('div');
  chip.className = 'chip'; chip.id = 'pbChip';
  chip.style.cssText = 'position:absolute;left:12px;top:52px;z-index:5;background:rgba(249,246,242,.92);color:#33212f;max-width:calc(100% - 24px);white-space:normal';
  app.canvas.parentElement!.append(chip);

  let status: Status = ctx.kept
    ? { state: ctx.kept.status, method: ctx.kept.method, words: ctx.kept.status === 'set by a person' ? `set by a person (${ctx.kept.confirmed_by}, ${String(ctx.kept.confirmed_at).slice(0, 10)})` : 'assumed, kept from before', residual: ctx.kept.residual_m, matched: ctx.kept.matched_to, by: ctx.kept.confirmed_by ?? undefined, at: ctx.kept.confirmed_at ?? undefined }
    : { state: 'assumed', method: 'site point', words: 'the building’s middle at the site point (an address point)', residual: null, matched: null };
  const show = () => {
    const mark = status.state === 'set by a person' ? '■ set by a person' : '□ assumed';
    statusEl.innerHTML = `<span class="mono">${mark}</span> · ${esc(status.words)}`;
    chip.textContent = `Placement: ${status.state === 'set by a person' ? 'set by a person' : 'assumed'}${status.matched && status.state !== 'set by a person' ? ` (matched to ${status.matched}, residual ${status.residual?.toFixed(2)} m: check)` : ''}`;
  };
  show();
  const unconfirm = (s: Omit<Status, 'state'>) => { status = { ...s, state: 'assumed' }; show(); };

  // ---- the model's parts, grouped into buildings --------------------------------------------------------------------------------
  type Grp = { idx: number[]; label: string; meshes: THREE.Mesh[] };
  let groups: Grp[] | null = null, named: number | null = null, picked = false;
  const elems: { o: THREE.Object3D; part: Part }[] = [];
  const readGroups = () => {
    if (groups) return groups;
    ctx.model.updateMatrixWorld(true);
    const bb = new THREE.Box3();
    ctx.model.traverse((o) => {
      const u = o.userData as { ifcClass?: string; name?: string };
      if (!u?.ifcClass || (o as THREE.Mesh).isMesh || SKIP.test(u.ifcClass)) return;   // the element's group, not each of its meshes
      bb.setFromObject(o); if (bb.isEmpty()) return;
      elems.push({ o, part: { box: [bb.min.x, bb.min.z, bb.max.x, bb.max.z], name: u.name ?? o.name, cls: u.ifcClass } });
    });
    if (!elems.length) { // a GLB: its top-level meshes
      ctx.model.traverse((o) => { if (!(o as THREE.Mesh).isMesh) return; bb.setFromObject(o); if (!bb.isEmpty()) elems.push({ o, part: { box: [bb.min.x, bb.min.z, bb.max.x, bb.max.z], name: o.name, cls: '' } }); });
    }
    const parts = elems.map((e) => e.part), cl = clusters(parts);
    groups = cl.map((idx, k) => {
      const named = idx.filter((i) => /\w/.test(parts[i].name)).map((i) => parts[i].name.split(':')[0]).sort();
      const common = named.length ? named[Math.floor(named.length / 2)] : 'unnamed parts';
      let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity; for (const i of idx) { const b = parts[i].box; x0 = Math.min(x0, b[0]); z0 = Math.min(z0, b[1]); x1 = Math.max(x1, b[2]); z1 = Math.max(z1, b[3]); }
      const meshes: THREE.Mesh[] = []; for (const i of idx) elems[i].o.traverse((m) => { if ((m as THREE.Mesh).isMesh) meshes.push(m as THREE.Mesh); });
      return { idx, meshes, label: `Part ${k + 1}: ${Math.round(x1 - x0)} × ${Math.round(z1 - z0)} m, ${idx.length} element${idx.length === 1 ? '' : 's'} (${common})` };
    });
    const sel = $<HTMLSelectElement>('#pbGroup');
    sel.innerHTML = groups.map((g, k) => `<option value="${k}">${esc(g.label)}</option>`).join('');
    const auto = existingGroup(parts, cl);
    named = auto;
    if (auto != null) sel.value = String(auto);
    sel.addEventListener('change', () => { picked = true; });
    $<HTMLElement>('#pbPickRow').hidden = groups.length < 2 && auto != null;
    return groups;
  };
  /** a group's footprint in the model's plan (p = x, −z), from its vertices (every few) */
  const footprintOf = (g: Grp): P2[] => {
    const pts: P2[] = [], v = new THREE.Vector3();
    for (const m of g.meshes) { const pa = m.geometry.getAttribute('position'); const step = Math.max(1, Math.floor(pa.count / 400)); for (let i = 0; i < pa.count; i += step) { v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld); pts.push(plan(v.x, v.z)); } }
    return hull(pts);
  };
  /** the model's own ground surfaces (its site or toposolid parts), as points to check against LiDAR */
  const groundPoints = (): [number, number, number][] => {
    const out: [number, number, number][] = [], v = new THREE.Vector3();
    ctx.model.traverse((o) => {
      const me = o as THREE.Mesh, u = me.userData as { ifcClass?: string; name?: string };
      if (!me.isMesh || !(u?.ifcClass === 'IfcSite' || GROUNDISH.test(`${u?.name ?? ''} ${me.name}`))) return;
      const pa = me.geometry.getAttribute('position'), nm = me.geometry.getAttribute('normal'), step = Math.max(1, Math.floor(pa.count / 3000));
      for (let i = 0; i < pa.count; i += step) { if (nm && nm.getY(i) < 0.6) continue; v.fromBufferAttribute(pa, i).applyMatrix4(me.matrixWorld); out.push([v.x, v.y, v.z]); }
    });
    return out;
  };
  const middle = () => ({ x: (ctx.box.min.x + ctx.box.max.x) / 2, z: (ctx.box.min.z + ctx.box.max.z) / 2 });

  // ---- 1. match to an existing building ---------------------------------------------------------------------------------------------
  const match = async () => {
    const gr = ctx.ground();
    if (!gr) { note.textContent = 'Put the model on its ground first (On its site): the match needs the site point and LINZ’s outlines.'; return; }
    if (ctx.busy()) { note.textContent = 'The ground is still being read; try again in a moment.'; return; }
    const gs = readGroups();
    if (!gs.length) { note.textContent = 'The model has no parts to match.'; return; }
    if (named == null && !picked) { $<HTMLElement>('#pbPickRow').hidden = false; note.textContent = 'No part of the model is named as a building already on the site. Choose it in the list or press Pick it in the view, then Match again.'; return; }
    const k = Number($<HTMLSelectElement>('#pbGroup').value || 0), g = gs[k];
    note.textContent = 'Fitting the footprint to LINZ’s outlines near the site point…';
    let list: Outline[];
    try { list = await ctx.outlines(); } catch (e) { note.textContent = `LINZ’s outlines could not be read (${(e as Error).message}); nothing is matched.`; return; }
    const cands: Candidate[] = list.map((o) => ({ id: o.id, label: o.name ? `${o.name}` : `building ${o.id}`, ring: o.rings[0].map(([e, n]) => [e, n] as P2) }));
    const gam = convergence(gr.point.lat, gr.point.lng), starts = ctx.ifcNorth != null ? [((ctx.ifcNorth + gam) * Math.PI) / 180] : [];
    const fp = footprintOf(g), m = bestMatch(fp, cands, [gr.site.e, gr.site.n], 450, starts);
    if (!m) { note.textContent = `No LINZ outline within 450 m of the site point is close in size to ${g.label}. Pick another part, or place it by hand.`; return; }
    if (m.fit.rms > 1.5) { note.textContent = `The closest LINZ outline in size (${m.candidate.label}) fits ${g.label} only to ${r2(m.fit.rms)} m, too loose to use. Nothing is moved: pick another part, or place it by hand.`; return; }
    const pl = placementFrom(m.fit, middle(), gr.site, gam);
    const area = Math.round(Math.abs(m.candidate.ring.reduce((a, p, i, r) => a + (r[(i + 1) % r.length][0] + p[0]) * (r[(i + 1) % r.length][1] - p[1]), 0) / 2));
    const what = `LINZ outline of ${m.candidate.label} (${area} m²)`, res = r2(m.fit.rms), resT = m.fit.rms.toFixed(2);
    await ctx.setPlacement({ east: pl.east, north: pl.north, turnDeg: pl.turnDeg, moveTag: 'assumed', turnTag: 'assumed' });
    turnIn.value = '0'; turnV.textContent = '0°';
    unconfirm({ method: 'matched', words: `matched to ${what}, residual ${resT} m: check`, residual: res, matched: what });
    let msg = `${g.label} fitted to ${what}, ${Math.round(m.distance)} m from the site point, out of ${m.tried} of similar size. Residual ${resT} m (largest ${m.fit.max.toFixed(2)} m).${m.fit.second ? ' The shape reads almost the same turned another way, so the turn is a guess: check it against the site plan.' : ''}${starts.length ? ' Started from the IFC’s own true north.' : ''}`;
    // 2. the model's own ground against LiDAR, and the small move that lines them up best
    const gnow = ctx.ground(), pts = groundPoints();
    if (gnow && pts.length) {
      const bx = ctx.box, inPad = (x: number, z: number) => x > bx.min.x - 1.5 && x < bx.max.x + 1.5 && z > bx.min.z - 1.5 && z < bx.max.z + 1.5;
      const ag = groundAgreement(pts, (x, z) => (inPad(x, z) ? NaN : gnow.yAt(x, z)));
      if (ag) {
        msg += ` The model’s own ground against LiDAR: ${ag.offset >= 0 ? 'above' : 'below'} it by a median ${Math.abs(ag.offset)} m, median deviation ${ag.mad} m over ${ag.n} points.`;
        if ((ag.best.dx || ag.best.dz) && ag.best.mad < ag.mad * 0.85) {
          await commit(ag.best.dx, ag.best.dz, 0, false);
          unconfirm({ method: 'matched', words: `matched to ${what}, residual ${resT} m, then moved ${r2(Math.hypot(ag.best.dx, ag.best.dz))} m to the LiDAR ground (deviation ${ag.best.mad} m): check`, residual: res, matched: what });
          msg += ` Moved ${ag.best.dx} m, ${ag.best.dz} m in the view to line its ground up with LiDAR (median deviation then ${ag.best.mad} m).`;
        }
      }
    } else msg += ' The model carries no ground surface of its own to check against LiDAR.';
    note.textContent = msg + ' Assumed until you confirm it.';
    app.log(`Placement matched to ${what}, residual ${resT} m: check.`);
  };
  $<HTMLButtonElement>('#pbMatch').addEventListener('click', () => { void match().catch((e) => { note.textContent = `The match did not finish (${(e as Error).message}).`; }); });

  // ---- 2. by hand: drag and turn, previewed by moving the model; committed as a new placement --------------------------------------
  let base: { o: THREE.Object3D; m: THREE.Matrix4 }[] | null = null;
  const preview = (dx: number, dz: number, turnDeg: number) => {
    const c = middle();
    if (!base) base = [ctx.model, ...ctx.movers()].map((o) => ({ o, m: o.matrix.clone() }));
    const M = new THREE.Matrix4().makeTranslation(c.x + dx, 0, c.z + dz).multiply(new THREE.Matrix4().makeRotationY((turnDeg * Math.PI) / 180)).multiply(new THREE.Matrix4().makeTranslation(-c.x, 0, -c.z));
    for (const { o, m } of base) { const n = M.clone().multiply(m); n.decompose(o.position, o.quaternion, o.scale); o.updateMatrixWorld(true); }
  };
  const reset = () => { if (!base) return; for (const { o, m } of base) { m.decompose(o.position, o.quaternion, o.scale); o.updateMatrixWorld(true); } base = null; };
  /** a move of dx, dz in the scene and a turn (degrees, the model turned anticlockwise from above) become the placement */
  async function commit(dx: number, dz: number, turnDeg: number, byHand = true) {
    reset();
    const gr = ctx.ground(); if (!gr) return;
    const o = gr.offset, th = ((o.turnDeg + convergence(gr.point.lat, gr.point.lng)) * Math.PI) / 180, p = plan(dx, dz);
    const de = p[0] * Math.cos(th) - p[1] * Math.sin(th), dn = p[0] * Math.sin(th) + p[1] * Math.cos(th);
    await ctx.setPlacement({ east: r2(o.east + de), north: r2(o.north + dn), turnDeg: r2(o.turnDeg + turnDeg), moveTag: byHand ? 'set by hand' : (o.moveTag as PlaceRequest['moveTag']), turnTag: byHand && turnDeg ? 'set by hand' : (o.turnTag as PlaceRequest['turnTag']) });
    if (byHand) unconfirm({ method: 'by hand', words: 'moved by hand: check it against the existing buildings and the parcel', residual: null, matched: null });
  }
  turnIn.addEventListener('input', () => { turnV.textContent = `${turnIn.value}°`; preview(0, 0, Number(turnIn.value)); });
  turnIn.addEventListener('change', () => { const t = Number(turnIn.value); turnIn.value = '0'; turnV.textContent = '0°'; void commit(0, 0, t); });

  type Drag = 'none' | 'building' | 'sheet';
  let dragMode: Drag = 'none', from: THREE.Vector3 | null = null, last = new THREE.Vector3();
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), flat = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = (ev: PointerEvent) => { const r = app.canvas.getBoundingClientRect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, app.camera); const p = new THREE.Vector3(); return ray.ray.intersectPlane(flat, p) ? p : null; };
  const setDrag = (m: Drag) => { dragMode = m; $<HTMLElement>('#pbDrag').setAttribute('aria-pressed', String(m === 'building')); el.querySelector('#pbPlanDrag')?.setAttribute('aria-pressed', String(m === 'sheet')); app.canvas.style.cursor = m === 'none' ? '' : 'grab'; if (m !== 'none') note.textContent = m === 'building' ? 'Drag the building over the ground. Let go to put it there.' : 'Drag the sheet over the ground.'; };
  $<HTMLButtonElement>('#pbDrag').addEventListener('click', () => setDrag(dragMode === 'building' ? 'none' : 'building'));
  const controls = (app as unknown as { controls: { enabled: boolean } }).controls;
  app.canvas.addEventListener('pointerdown', (ev) => {
    if (dragMode === 'none') return;
    const p = hit(ev); if (!p) return;
    if (dragMode === 'building') { const b = ctx.box; if (p.x < b.min.x - 8 || p.x > b.max.x + 8 || p.z < b.min.z - 8 || p.z > b.max.z + 8) return; }
    from = p; last.copy(p); controls.enabled = false; app.canvas.setPointerCapture(ev.pointerId); app.canvas.style.cursor = 'grabbing'; ev.preventDefault();
  });
  app.canvas.addEventListener('pointermove', (ev) => {
    if (!from) return; const p = hit(ev); if (!p) return;
    if (dragMode === 'building') preview(p.x - from.x, p.z - from.z, 0);
    else if (dragMode === 'sheet') { sheet.cx += p.x - last.x; sheet.cz += p.z - last.z; drapeSheet(); }
    last.copy(p);
  });
  const up = (ev: PointerEvent) => {
    if (!from) return;
    const d = last.clone().sub(from); from = null; controls.enabled = true; app.canvas.style.cursor = 'grab';
    try { app.canvas.releasePointerCapture(ev.pointerId); } catch { /* already released */ }
    if (dragMode === 'building' && Math.hypot(d.x, d.z) > 0.05) void commit(d.x, d.z, 0).then(() => { note.textContent = `Moved ${r2(Math.hypot(d.x, d.z))} m by hand. Confirm when it sits right.`; });
  };
  app.canvas.addEventListener('pointerup', up); app.canvas.addEventListener('pointercancel', up);

  // pick the existing building by clicking it in the view
  let picking = false;
  $<HTMLButtonElement>('#pbClick').addEventListener('click', () => { readGroups(); picking = true; note.textContent = 'Click the existing building in the view.'; });
  app.canvas.addEventListener('click', (ev) => {
    if (!picking) return; picking = false;
    const r = app.canvas.getBoundingClientRect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, app.camera);
    const h = ray.intersectObject(ctx.model, true)[0]; if (!h) { note.textContent = 'Nothing of the model there. Press Pick it in the view and try again.'; return; }
    const gs = readGroups(), k = gs.findIndex((g) => g.meshes.includes(h.object as THREE.Mesh));
    if (k < 0) { note.textContent = 'That part is not in any of the model’s buildings.'; return; }
    $<HTMLSelectElement>('#pbGroup').value = String(k); $<HTMLElement>('#pbPickRow').hidden = false; picked = true;
    note.textContent = `${gs[k].label} picked. Press Match to an existing building.`;
  });

  // ---- confirm, and save back to the project --------------------------------------------------------------------------------------
  const record = (): PlacementRecord | null => {
    const gr = ctx.ground(); if (!gr) return null;
    return { east: gr.offset.east, north: gr.offset.north, turn_deg: gr.offset.turnDeg, status: status.state, method: status.method, residual_m: status.residual, matched_to: status.matched,
      site_point: { lat: gr.point.lat, lng: gr.point.lng }, model: ctx.name, confirmed_by: status.by ?? null, confirmed_at: status.at ?? null };
  };
  $<HTMLButtonElement>('#pbOk').addEventListener('click', async () => {
    const who = $<HTMLInputElement>('#pbWho').value.trim();
    if (!who) { note.textContent = 'Type your initials first: a placement is confirmed by a person.'; return; }
    if (!ctx.ground()) { note.textContent = 'Put the model on its ground first.'; return; }
    status = { ...status, state: 'set by a person', by: who, at: new Date().toISOString(), words: `confirmed by ${who}, ${status.method === 'matched' ? `from the match to ${status.matched}, residual ${status.residual?.toFixed(2)} m` : status.method === 'by hand' ? 'placed by hand' : 'at the site point'}` };
    show();
    const rec = record()!;
    (window as unknown as { __placement?: unknown }).__placement = rec;
    if (!ctx.handoffId) { note.textContent = 'Confirmed on this page. It was not opened from a project, so there is nowhere to save it.'; return; }
    try {
      await putBackRecord(ctx.handoffId, 'placement', { name: 'placement.json', data: new Blob([JSON.stringify(rec)], { type: 'application/json' }), meta: { status: 'confirmed', confirmed_by: who, placement: rec } });
      note.textContent = 'Confirmed and passed back to the project: the next Open in 3D starts from it.';
    } catch (e) { note.textContent = `Confirmed here, but it could not be passed back (${(e as Error).message}).`; }
  });

  // ---- 3. the site plan on the ground, as a check ---------------------------------------------------------------------------------
  const sheet = { canvas: null as HTMLCanvasElement | null, w: 120, turn: 0, cx: middle().x, cz: middle().z, opacity: 0.55, mesh: null as THREE.Mesh | null };
  const sheetRoot = new THREE.Group(); sheetRoot.name = 'site_plan_overlay'; app.scene.add(sheetRoot);
  function drapeSheet() {
    if (sheet.mesh) { sheetRoot.remove(sheet.mesh); sheet.mesh.geometry.dispose(); sheet.mesh = null; }
    const gr = ctx.ground(); if (!sheet.canvas || !$<HTMLInputElement>('#pbPlan')?.checked) return;
    const W = sheet.w, H = (W * sheet.canvas.height) / sheet.canvas.width, n = 48, c = Math.cos((sheet.turn * Math.PI) / 180), s = Math.sin((sheet.turn * Math.PI) / 180);
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const u = (i / n - 0.5) * W, v = (j / n - 0.5) * H, x = sheet.cx + u * c + v * s, z = sheet.cz - u * s + v * c;
      pos.push(x, (gr ? gr.yAt(x, z) : 0) + 0.12, z); uv.push(i / n, 1 - j / n);
      if (i < n && j < n) { const k = j * (n + 1) + i; idx.push(k, k + n + 1, k + 1, k + 1, k + n + 1, k + n + 2); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    const tex = new THREE.CanvasTexture(sheet.canvas); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: sheet.opacity, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.renderOrder = 3; m.name = 'site_plan_sheet';
    m.userData = { kind: 'context', name: 'Site plan (a check)', source: 'set by hand', note: `The project’s site plan sheet laid on the ground: ${W} m wide (${$<HTMLElement>('#pbWTag')?.textContent ?? ''}), turned ${sheet.turn}°. A check on the placement, not a source of it.` };
    sheet.mesh = m; sheetRoot.add(m);
  }
  if (hasPlan) {
    const box = $<HTMLElement>('#pbPlanBox');
    box.addEventListener('toggle', async () => { if (!box.hasAttribute('open') || sheet.canvas) return; note.textContent = 'Opening the site plan…'; try { sheet.canvas = await sheetCanvas(ctx.site!.files!.site_plan); note.textContent = 'Site plan open. Tick Show to lay it on the ground.'; } catch (e) { note.textContent = `The site plan could not be opened (${(e as Error).message}).`; } });
    $<HTMLInputElement>('#pbPlan').addEventListener('change', () => { if (!$<HTMLInputElement>('#pbPlan').checked) { drapeSheet(); return; } const g = middle(); if (!sheet.mesh) { sheet.cx = g.x; sheet.cz = g.z; } drapeSheet(); });
    $<HTMLInputElement>('#pbW').addEventListener('change', (e) => { const v = Number((e.target as HTMLInputElement).value); if (v > 1) { sheet.w = v; $<HTMLElement>('#pbWTag').textContent = '■ set by hand'; drapeSheet(); } });
    $<HTMLInputElement>('#pbPT').addEventListener('input', (e) => { sheet.turn = Number((e.target as HTMLInputElement).value); $<HTMLElement>('#pbPTV').textContent = `${sheet.turn}°`; drapeSheet(); });
    $<HTMLInputElement>('#pbPO').addEventListener('input', (e) => { sheet.opacity = Number((e.target as HTMLInputElement).value); if (sheet.mesh) (sheet.mesh.material as THREE.MeshBasicMaterial).opacity = sheet.opacity; });
    $<HTMLButtonElement>('#pbPlanDrag').addEventListener('click', () => setDrag(dragMode === 'sheet' ? 'none' : 'sheet'));
  }
  return { el, refresh: () => { show(); drapeSheet(); }, status: () => status, record, match, openSheet: async () => { if (ctx.site?.files?.site_plan && !sheet.canvas) sheet.canvas = await sheetCanvas(ctx.site.files.site_plan); } };
}
