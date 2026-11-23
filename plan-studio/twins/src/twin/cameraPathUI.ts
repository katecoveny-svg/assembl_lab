// The architect's camera path, from their sketch to the fly-through.
// The sketch (a PDF or picture of a site plan with the path drawn on it) is laid on the ground once a person aligns it: two
// points picked on the sketch, then the same two on the ground. The tool then proposes the path by following the drawn line's
// colour. The person edits the points, sets the eye height, and confirms with their initials; only then does Play (and Record
// WebM) follow it. A path can also be drawn by hand on the ground. The confirmed path is saved back to the project through the
// hand-over store (handoff.ts putPathBack) or downloaded as JSON. The maths is in camPath.ts.
import * as THREE from 'three/webgpu';
import type { App } from './app';
import { align2, DEFAULT_EYE, eyeAt, pathRecord, spline, traceStroke, type Align, type CameraPath, type P2 } from './camPath';
import { putPathBack, type HandoffSite } from './handoff';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const SPEED = 2; // metres a second along the path
const PROPOSED = 0xf2a516, CONFIRMED = 0xffffff, PICKED = 0xd9bacb;

export interface PathCtx {
  name: string; handoffId: string | null; site: HandoffSite | null;
  /** scene = model frame + shift */
  shift: THREE.Vector3;
  /** what the model's frame is, in words, for the record */
  frame: string;
  yAt: () => (x: number, z: number) => number;
  fromPoint: () => ((x: number, z: number) => [number, number]) | null;
  sitePoint: () => { lat: number; lng: number; source: string } | null;
  root: THREE.Group;
  pickables: () => THREE.Object3D[];
}
type Mode = 'idle' | 'sketchA' | 'sketchB' | 'groundA' | 'groundB' | 'draw' | 'move' | 'insert';

async function sketchCanvas(blob: Blob, name: string): Promise<HTMLCanvasElement> {
  if (/\.pdf$/i.test(name) || blob.type === 'application/pdf') {
    const { openPdf, sheetThumb } = await import('./planTrace');
    const doc = await openPdf(await blob.arrayBuffer());
    return (await sheetThumb(await doc.getPage(1), 1600)) as unknown as HTMLCanvasElement;
  }
  const bmp = await createImageBitmap(blob), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}

export function cameraPathPanel(app: App, ctx: PathCtx) {
  const el = document.createElement('section');
  el.className = 'card'; el.id = 'cameraPath';
  el.innerHTML = `<h3>Camera path</h3>
    <p class="small">Lay the architect’s sketch on the ground, let the tool follow the drawn line, then check and confirm it. Or draw the path on the ground.</p>
    <div class="row wrap"><label class="pill" tabindex="0">Choose a sketch<input type="file" id="cpFile" accept=".pdf,.png,.jpg,.jpeg,.webp" hidden></label><button class="pill" id="cpDraw">Draw on the ground</button></div>
    <div id="cpSketchBox" hidden><canvas id="cpSketch" style="position:relative;inset:auto;width:100%;height:auto;border:1px solid var(--line);border-radius:8px;cursor:crosshair;display:block" aria-label="The sketch: click to pick points on it"></canvas>
      <div class="row wrap"><button class="pill" id="cpAlign">Align to the ground</button><button class="pill" id="cpTrace" disabled>Trace the drawn line</button><label class="small"><input type="checkbox" id="cpShow" checked> Show the sketch on the ground</label></div></div>
    <p class="small" id="cpNote" role="status" aria-live="polite"></p>
    <div id="cpEdit" hidden>
      <div class="row wrap"><button class="pill" id="cpMove">Move a point</button><button class="pill" id="cpIns">Add a point after</button><button class="pill" id="cpDel">Delete a point</button><button class="pill" id="cpRev">Reverse</button><button class="pill" id="cpClear">Clear</button></div>
      <label class="slider">Eye height, m <input id="cpH" type="number" step="0.1" min="0.3" max="60" value="${DEFAULT_EYE}" style="width:80px"> <span class="mono small" id="cpHTag">□ assumed</span></label>
      <div class="row wrap"><input id="cpWho" placeholder="Your initials" aria-label="Your initials, to confirm the path" style="width:120px"><button class="pill solid" id="cpOk">Confirm the path</button></div>
      <div class="row wrap"><button class="pill" id="cpSave" ${ctx.handoffId ? '' : 'hidden'}>Save path to the project</button><button class="pill" id="cpJson">Download the path (JSON)</button></div>
    </div>`;
  const $ = <T extends HTMLElement>(s: string) => el.querySelector(s) as T;
  const note = $<HTMLElement>('#cpNote'), cv = $<HTMLCanvasElement>('#cpSketch');
  // on the 3D view, a line saying what the path is: proposed or confirmed, and by whom
  const chip = document.createElement('div');
  chip.className = 'chip'; chip.id = 'cpChip'; chip.hidden = true;
  chip.style.cssText = 'position:absolute;left:12px;bottom:52px;z-index:5;background:rgba(249,246,242,.92);color:#33212f;max-width:calc(100% - 24px);white-space:normal';
  app.canvas.parentElement!.append(chip);

  let sketch: HTMLCanvasElement | null = null, sketchName = '', sketchId: string | null = null, al: Align | null = null;
  let a1: P2 | null = null, a2: P2 | null = null, b1: P2 | null = null, traced: P2[] = [];
  let nodes: P2[] = [], sel = -1, mode: Mode = 'idle', tracedBy = '', h = DEFAULT_EYE, hTag: 'assumed' | 'set by hand' = 'assumed';
  let record: CameraPath | null = null, alignRec: CameraPath['align'] = null;
  const confirmed = () => !!record?.confirmed_by;
  const groundModes: Mode[] = ['groundA', 'groundB', 'draw', 'move', 'insert'];
  /** tell the person what to do next: in the card, and on the 3D view while a click on the ground is wanted (on a phone the
   *  view is scrolled into sight, since the card sits below it) */
  const say = (msg: string) => {
    note.textContent = msg;
    if (groundModes.includes(mode)) {
      chip.hidden = false; chip.textContent = msg;
      if (matchMedia('(max-width: 900px)').matches) app.canvas.scrollIntoView({ block: 'start' });
    } else drawChip();
  };
  const overlay = new THREE.Group(); overlay.name = 'camera_sketch'; const pathG = new THREE.Group(); pathG.name = 'camera_path';
  ctx.root.add(overlay, pathG);
  // the sketch and the path's markers stay out of a played or recorded fly-through, and come back after it
  let shownBefore = true;
  app.onPlay.push((on) => { if (on) { shownBefore = ctx.root.visible; ctx.root.visible = false; } else ctx.root.visible = shownBefore; });

  // ---- the sketch, with what has been picked and traced on it --------------------------------------------------------------
  const drawSketch = () => {
    if (!sketch) return;
    cv.width = sketch.width; cv.height = sketch.height;
    const g = cv.getContext('2d')!; g.drawImage(sketch, 0, 0);
    const r = Math.max(6, sketch.width / 90);
    for (const [p, t] of [[a1, '1'], [a2, '2']] as [P2 | null, string][]) if (p) { g.fillStyle = '#21121f'; g.beginPath(); g.arc(p[0], p[1], r, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = `${r * 1.4}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, p[0], p[1]); }
    if (traced.length > 1) { g.strokeStyle = '#f2a516'; g.lineWidth = r / 2; g.setLineDash([r, r / 2]); g.beginPath(); traced.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.setLineDash([]); }
  };
  const loadSketch = async (blob: Blob, name: string, id: string | null) => {
    note.textContent = 'Opening the sketch…';
    try { sketch = await sketchCanvas(blob, name); } catch (e) { note.textContent = `That sketch could not be opened (${(e as Error).message}).`; return; }
    sketchName = name; sketchId = id; al = null; a1 = a2 = b1 = null; traced = [];
    for (const c of [...overlay.children]) overlay.remove(c);
    $<HTMLElement>('#cpSketchBox').hidden = false; ($<HTMLButtonElement>('#cpTrace')).disabled = true; drawSketch();
    note.textContent = `Sketch: ${name}. Press Align to the ground, then pick two points on the sketch and the same two on the ground.`;
  };

  // ---- the sketch laid on the ground ---------------------------------------------------------------------------------------
  const drapeSketch = () => {
    for (const c of [...overlay.children]) { overlay.remove(c); (c as THREE.Mesh).geometry?.dispose(); }
    if (!sketch || !al) return;
    const n = 64, yAt = ctx.yAt(), W = sketch.width, H = sketch.height, pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const [x, z] = al.apply([(i / n) * W, (j / n) * H]); pos.push(x, yAt(x, z) + 0.05, z); uv.push(i / n, 1 - j / n);
      if (i < n && j < n) { const k = j * (n + 1) + i; idx.push(k, k + n + 1, k + 1, k + 1, k + n + 1, k + n + 2); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const tex = new THREE.CanvasTexture(sketch); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.renderOrder = 3; m.name = 'camera_sketch_overlay';
    m.userData = { kind: 'context', name: 'Camera sketch', source: 'set by hand', note: `${sketchName}, laid on the ground by two points a person matched (${al.scale.toFixed(4)} m a pixel, turned ${al.turnDeg.toFixed(1)}°)` };
    overlay.add(m); overlay.visible = $<HTMLInputElement>('#cpShow').checked;
  };

  // ---- the path on the ground ----------------------------------------------------------------------------------------------
  const drawPath = () => {
    for (const c of [...pathG.children]) { pathG.remove(c); (c as THREE.Mesh).geometry?.dispose(); }
    $<HTMLElement>('#cpEdit').hidden = nodes.length === 0;
    chip.hidden = nodes.length === 0;
    if (!nodes.length) { app.flight = null; return; }
    const yAt = ctx.yAt(), colour = confirmed() ? CONFIRMED : PROPOSED;
    const mat = new THREE.MeshBasicMaterial({ color: colour, depthWrite: false, transparent: true, opacity: 0.95, polygonOffset: true, polygonOffsetFactor: -4 });
    if (nodes.length > 1) {
      const sp = spline(nodes, 0.4), pos: number[] = [], idx: number[] = [], w = 0.28;
      sp.pts.forEach((p, i) => {
        const q = sp.pts[Math.min(sp.pts.length - 1, i + 1)], o = sp.pts[Math.max(0, i - 1)], dx = q[0] - o[0], dz = q[1] - o[1], L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
        for (const s of [-1, 1]) { const x = p[0] + nx * w * s, z = p[1] + nz * w * s; pos.push(x, yAt(x, z) + 0.09, z); }
        if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
      });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      const rib = new THREE.Mesh(g, mat); rib.renderOrder = 4; rib.name = 'camera_path_line';
      rib.userData = { kind: 'context', name: confirmed() ? 'Camera path, confirmed' : 'Camera path, proposed', source: confirmed() ? 'set by hand' : 'proposed', note: `${tracedBy}${confirmed() ? `; confirmed by ${record!.confirmed_by}` : '; not confirmed'}. ${sp.length.toFixed(0)} m long` };
      pathG.add(rib);
    }
    // a post at each point, as tall as the eye height, with a bead where the eye is
    const postM = new THREE.MeshBasicMaterial({ color: colour }), selM = new THREE.MeshBasicMaterial({ color: PICKED });
    const post = new THREE.CylinderGeometry(0.035, 0.035, 1, 6).translate(0, 0.5, 0), bead = new THREE.SphereGeometry(0.16, 12, 8), foot = new THREE.CylinderGeometry(0.4, 0.4, 0.06, 20);
    nodes.forEach(([x, z], i) => {
      const y = yAt(x, z), m = i === sel ? selM : postM;
      const p = new THREE.Mesh(post, m); p.position.set(x, y, z); p.scale.y = h; pathG.add(p);
      const b = new THREE.Mesh(bead, m); b.position.set(x, y + h, z); pathG.add(b);
      const f = new THREE.Mesh(foot, m); f.position.set(x, y + 0.03, z); pathG.add(f);
    });
    drawChip();
    // Play follows the path once it is confirmed, and only then
    if (confirmed() && nodes.length > 1) {
      const sp = spline(nodes, 0.25), L = sp.length, step = 0.5, ys: number[] = [];
      for (let s = 0; s <= L + step; s += step) ys.push(eyeAt(sp, Math.min(s, L), yAt, h).eye[1]);
      const sm = ys.map((_, i) => { let t = 0, c = 0; for (let k = -4; k <= 4; k++) { const v = ys[i + k]; if (v !== undefined) { t += v; c++; } } return t / c; });
      const yS = (s: number) => { const f = Math.max(0, Math.min(sm.length - 1.001, s / step)), i = Math.floor(f); return sm[i] + (sm[i + 1] - sm[i]) * (f - i); };
      app.flight = { dur: Math.max(8, L / SPEED) * 1000, at: (t) => { const s = t * L, e = eyeAt(sp, s, yAt, h), y = yS(s); return { eye: new THREE.Vector3(e.eye[0], y, e.eye[2]), look: new THREE.Vector3(e.look[0], yS(Math.min(L, s + 6)) - 0.15, e.look[2]) }; } };
    } else app.flight = null;
  };
  function drawChip() {
    chip.hidden = nodes.length === 0;
    if (!nodes.length) return;
    chip.textContent = confirmed()
      ? `Camera path: confirmed by ${record!.confirmed_by}, ${new Date(record!.confirmed_at!).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })} · eye ${h} m (${hTag}) · Play follows it`
      : `Camera path: proposed, not confirmed · ${tracedBy} · eye ${h} m (${hTag})`;
  }
  const changed = (why: string) => { if (confirmed()) { record = null; note.textContent = `${why} The path is a proposal again until it is confirmed.`; } else note.textContent = why; drawPath(); };

  // ---- the record ----------------------------------------------------------------------------------------------------------
  const build = (who: string | null) => {
    const fp = ctx.fromPoint(), sx = ctx.shift.x, sz = ctx.shift.z;
    return pathRecord({ nodes: nodes.map(([x, z]) => [x - sx, z - sz] as P2), h, hSource: hTag, sketchFileId: sketchId, tracedBy: /^traced by assembl/.test(tracedBy) ? 'tool' : 'person', tracedHow: tracedBy, confirmedBy: who, frame: ctx.frame,
      toSite: fp ? (x, z) => fp(x + sx, z + sz) : null, sitePoint: ctx.sitePoint(), model: ctx.name });
  };

  // ---- picking on the 3D view ----------------------------------------------------------------------------------------------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const groundHit = (ev: PointerEvent): P2 | null => {
    const r = app.canvas.getBoundingClientRect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, app.camera);
    const h0 = ray.intersectObjects(ctx.pickables().filter((o) => o.visible), true).find((x) => (x.object as THREE.Mesh).isMesh);
    return h0 ? [h0.point.x, h0.point.z] : null;
  };
  const nearest = (p: P2) => { let k = -1, d = Infinity; nodes.forEach((q, i) => { const dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dd < d) { d = dd; k = i; } }); return d < Math.max(1.5, app.camera.position.distanceTo(app.controls.target) * 0.03) ? k : -1; };
  let ga: P2 | null = null;
  app.pickHook = (ev) => {
    if (mode === 'idle' || mode === 'sketchA' || mode === 'sketchB') return false;
    const p = groundHit(ev); if (!p) { say('That is not on the ground. Click the ground.'); return true; }
    if (mode === 'groundA') { ga = p; mode = 'groundB'; say('Now click the ground where point 2 of the sketch is.'); return true; }
    if (mode === 'groundB') {
      try { al = align2(a1!, a2!, ga!, p); } catch (e) { note.textContent = `${(e as Error).message}: pick two points apart.`; mode = 'groundA'; return true; }
      b1 = ga; mode = 'idle'; drawChip(); drapeSketch(); ($<HTMLButtonElement>('#cpTrace')).disabled = false;
      note.textContent = `Sketch laid on the ground: ${(al.scale * 100).toFixed(2)} cm a pixel, turned ${al.turnDeg.toFixed(1)}°, set by your two points. Check it sits on the parcel, then Trace the drawn line.`;
      alignRec = { sketch: [a1!, a2!], ground: [[ga![0] - ctx.shift.x, ga![1] - ctx.shift.z], [p[0] - ctx.shift.x, p[1] - ctx.shift.z]], metres_per_pixel: Math.round(al.scale * 1e5) / 1e5, turn_deg: Math.round(al.turnDeg * 10) / 10 };
      return true;
    }
    if (mode === 'draw') { nodes.push(p); sel = nodes.length - 1; if (!tracedBy || /traced/.test(tracedBy)) tracedBy = tracedBy ? `${tracedBy}, then edited by hand` : 'drawn by hand on the ground'; changed('A point was added.'); say(`${nodes.length} point${nodes.length === 1 ? '' : 's'}. Keep clicking the ground; press Done when the path is drawn.`); return true; }
    if (mode === 'move') {
      if (sel < 0) { sel = nearest(p); drawPath(); say(sel < 0 ? 'Click on a point of the path to pick it.' : `Point ${sel + 1} picked: click where it should go.`); return true; }
      nodes[sel] = p; edited(); mode = 'idle'; changed(`Point ${sel + 1} moved.`); setModeButtons(); return true;
    }
    if (mode === 'insert') {
      if (sel < 0) { sel = nearest(p); drawPath(); say(sel < 0 ? 'Click on a point of the path to add after it.' : `Click where the new point after ${sel + 1} goes.`); return true; }
      nodes.splice(sel + 1, 0, p); sel++; edited(); mode = 'idle'; changed('A point was added.'); setModeButtons(); return true;
    }
    return false;
  };
  const edited = () => { if (tracedBy && !/by hand/.test(tracedBy)) tracedBy += ', then edited by hand'; };
  const setModeButtons = () => {
    $<HTMLButtonElement>('#cpDraw').textContent = mode === 'draw' ? 'Done' : 'Draw on the ground';
    for (const [id, m] of [['#cpMove', 'move'], ['#cpIns', 'insert']] as const) $<HTMLButtonElement>(id).setAttribute('aria-pressed', String(mode === m));
  };

  // ---- the buttons ---------------------------------------------------------------------------------------------------------
  $<HTMLInputElement>('#cpFile').addEventListener('change', (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) void loadSketch(f, f.name, `chosen here: ${f.name}`); });
  cv.addEventListener('click', (ev) => {
    if (mode !== 'sketchA' && mode !== 'sketchB') return;
    const r = cv.getBoundingClientRect(), p: P2 = [((ev.clientX - r.left) / r.width) * cv.width, ((ev.clientY - r.top) / r.height) * cv.height];
    if (mode === 'sketchA') { a1 = p; a2 = null; mode = 'sketchB'; note.textContent = 'Now click a second point on the sketch, well apart from the first (two corners of the boundary work well).'; }
    else { a2 = p; mode = 'groundA'; say('Now click the ground where point 1 of the sketch is.'); }
    drawSketch();
  });
  $<HTMLButtonElement>('#cpAlign').addEventListener('click', () => { mode = 'sketchA'; a1 = a2 = null; drawSketch(); note.textContent = 'Click a point on the sketch you can also find on the ground: a boundary corner, or a corner of the building.'; });
  $<HTMLInputElement>('#cpShow').addEventListener('change', (e) => { overlay.visible = (e.target as HTMLInputElement).checked; });
  $<HTMLButtonElement>('#cpTrace').addEventListener('click', () => {
    if (!sketch || !al) return;
    const g = sketch.getContext('2d', { willReadFrequently: true }) ?? sketch.getContext('2d')!, img = g.getImageData(0, 0, sketch.width, sketch.height);
    const t = traceStroke(img);
    if (t.pts.length < 2) { note.textContent = `No path found on the sketch (${t.why ?? 'nothing to follow'}). Draw it on the ground instead.`; return; }
    traced = t.pts; drawSketch();
    nodes = t.pts.map((p) => al!.apply(p)); sel = -1; record = null;
    tracedBy = `traced by assembl from the ${t.colour} line on the sketch (${t.pieces} piece${t.pieces === 1 ? '' : 's'})`;
    drawPath();
    note.textContent = `Proposed: ${nodes.length} points along the ${t.colour} line. A proposal, not the path: check it, move or delete points, then confirm.`;
  });
  $<HTMLButtonElement>('#cpDraw').addEventListener('click', () => {
    if (mode === 'draw') { mode = 'idle'; setModeButtons(); note.textContent = nodes.length > 1 ? 'Path drawn. Check it, then confirm.' : 'A path needs at least two points.'; return; }
    if (!nodes.length) tracedBy = 'drawn by hand on the ground';
    mode = 'draw'; setModeButtons(); say('Click the ground for each point of the path, in order. Press Done when it is drawn.');
  });
  $<HTMLButtonElement>('#cpMove').addEventListener('click', () => { mode = mode === 'move' ? 'idle' : 'move'; sel = -1; setModeButtons(); drawPath(); say(mode === 'move' ? 'Click a point of the path, then where it should go.' : ''); });
  $<HTMLButtonElement>('#cpIns').addEventListener('click', () => { mode = mode === 'insert' ? 'idle' : 'insert'; sel = -1; setModeButtons(); drawPath(); say(mode === 'insert' ? 'Click a point of the path, then where the new point after it goes.' : ''); });
  $<HTMLButtonElement>('#cpDel').addEventListener('click', () => {
    if (sel < 0) { note.textContent = 'Pick a point first (Move a point, then click it), then Delete.'; return; }
    nodes.splice(sel, 1); sel = -1; mode = 'idle'; edited(); setModeButtons(); changed('A point was deleted.');
  });
  $<HTMLButtonElement>('#cpRev').addEventListener('click', () => { nodes.reverse(); sel = -1; changed('The path was reversed.'); });
  $<HTMLButtonElement>('#cpClear').addEventListener('click', () => { nodes = []; sel = -1; record = null; tracedBy = ''; traced = []; drawSketch(); drawPath(); note.textContent = 'Path cleared.'; });
  $<HTMLInputElement>('#cpH').addEventListener('change', (e) => { const v = Number((e.target as HTMLInputElement).value); if (!(v >= 0.3 && v <= 60)) return; h = v; hTag = 'set by hand'; $<HTMLElement>('#cpHTag').textContent = '■ set by hand'; changed('The eye height changed.'); });
  $<HTMLButtonElement>('#cpOk').addEventListener('click', () => {
    const who = $<HTMLInputElement>('#cpWho').value.trim();
    if (nodes.length < 2) { note.textContent = 'A path needs at least two points.'; return; }
    if (!who) { note.textContent = 'Type your initials to confirm the path: a person confirms it, not the tool.'; return; }
    mode = 'idle'; setModeButtons(); sel = -1;
    record = { ...build(who), align: alignRec };
    drawPath();
    note.textContent = `Confirmed by ${who}. Play and Record WebM now follow it (${record.length_m} m at ${SPEED} m/s).`;
    app.log('Camera path confirmed. Play follows it.');
  });
  const current = () => record ?? { ...build(null), align: alignRec };
  $<HTMLButtonElement>('#cpJson').addEventListener('click', () => {
    const r = current(), a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(r, null, 1)], { type: 'application/json' })); a.download = 'camera-path.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    app.log(r.confirmed_by ? 'Confirmed camera path offered for download.' : 'Proposed camera path (not confirmed) offered for download.');
  });
  $<HTMLButtonElement>('#cpSave').addEventListener('click', async () => {
    if (!confirmed()) { note.textContent = 'Confirm the path first: only a confirmed path is saved to the project.'; return; }
    try { await putPathBack(ctx.handoffId!, ctx.name, record); note.textContent = 'Saved for the project: the workspace picks it up from this browser when you go back to it.'; app.log('Camera path left for the workspace to save.'); }
    catch (e) { note.textContent = `The path could not be passed back (${(e as Error).message}). Download it instead.`; }
  });

  // ---- what the workspace handed across: its sketch, and a path it already has -------------------------------------------
  const given = ctx.site;
  const givenId = (given?.camera_path?.sketch_file_id as string | undefined) ?? (() => { const s = (given?.sources as { id?: string; file_id?: string; kind?: string }[] | undefined)?.find((x) => /camera/i.test(String(x?.kind ?? ''))); return s?.file_id ?? s?.id ?? null; })();
  const sk = given?.files?.camera_sketch;
  if (sk) void loadSketch(sk, (sk as File).name ?? 'camera sketch', givenId ?? 'from the workspace');
  const gp = given?.camera_path as unknown as Partial<CameraPath> | null | undefined;   // from the workspace: pts, sketch_file_id, traced_by, confirmed_by (null: a proposal)
  if (gp?.pts?.length && gp.pts.length > 1) {
    nodes = gp.pts.map(([u, v]) => [u + ctx.shift.x, v + ctx.shift.z] as P2);
    h = gp.height?.value ?? gp.pts[0][2] ?? DEFAULT_EYE; hTag = gp.height?.source === 'set by hand' ? 'set by hand' : 'assumed'; ($<HTMLInputElement>('#cpH')).value = String(h);
    tracedBy = (gp as { traced_how?: string }).traced_how ?? (gp.traced_by === 'tool' ? 'traced by the tool, from the project' : 'drawn by a person, from the project'); record = gp.confirmed_by ? (gp as CameraPath) : null; alignRec = gp.align ?? null;
  }
  return { el, refresh: () => { drapeSketch(); drawPath(); }, state: () => ({ nodes, mode, record, al, tracedBy }) };
}
