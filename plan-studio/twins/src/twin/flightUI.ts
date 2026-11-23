// The fly-through editor: shots on the plan or model that a person places, drags, adds, deletes and reorders, each with its
// hold, speed, pan and tilt; a live preview with a scrubber; save to the project (versioned, proposed until a person confirms);
// and the film, made frame by frame (filmRender.ts) with a Download button and a copy passed back to the project.
// A shot list (assembl.shot-list.v1, read from an architect's hand-drawn path) can be imported; its shots arrive unplaced.
// The maths is flightPath.ts. Generic: any project's model, or the generated homes.
import * as THREE from 'three/webgpu';
import type { App } from './app';
import { bump, confirm, edited, emptyFlight, importShotList, newShot, readFlight, reorder, timeline, type FlightPath, type Shot, type Timeline } from './flightPath';
import { renderFilm } from './filmRender';
import { putBackRecord } from './handoff';

const PROPOSED = '#f2a516', CONFIRMED = '#ffffff';
// for checks on a slow machine: ?filmsecs=N makes only the first N seconds, ?filmfps=N at N frames a second (default 30)
const QS = new URLSearchParams(location.search), CAP = Number(QS.get('filmsecs')) || Infinity, FPS = Math.max(6, Math.min(60, Number(QS.get('filmfps')) || 30));
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export interface FlightCtx {
  name: string;
  handoffId: string | null;
  /** what the scene's frame is, in words, for the record */
  frame: string;
  /** ground level at a scene point */
  yAt: () => (x: number, z: number) => number;
  /** what a click may land on */
  pickables: () => THREE.Object3D[];
  root: THREE.Group;
  focus: THREE.Vector3;
  /** objects to hide while a film is made (path markers, sketch) */
  hideForFilm?: () => THREE.Object3D[];
  /** the layout-change hook: a shot with a layout changes to it while held (the page decides what a layout is) */
  layout?: (name: string | null, amount: number) => void;
  /** the mode hook: the whole film in one mode (e.g. a fit-out); returns the words for the film's caption */
  setMode?: (name: string | null) => Promise<string> | string;
}

// The interior layouts are another agent's work (the interior design agent, library/ and its layout switch). Until it registers
// window.__assemblInterior = { setMode(name), setLayout(name, amount) }, modes and layout changes are named in the film's caption
// as placeholders, and nothing in the model changes.
type Interior = { setMode?: (name: string | null) => Promise<string | void> | string | void; setLayout?: (name: string | null, amount: number) => void };
const interior = () => (window as unknown as { __assemblInterior?: Interior }).__assemblInterior;
async function defaultMode(name: string | null) {
  if (!name) { await interior()?.setMode?.(null); return ''; }
  const it = interior();
  if (it?.setMode) { const said = await it.setMode(name); return typeof said === 'string' && said ? said : name; }
  return `${name} (layout placeholder until the interior layouts land)`;
}
const defaultLayout = (name: string | null, amount: number) => interior()?.setLayout?.(name, amount);

function markerTexture(label: string, colour: string) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(20,14,18,0.82)'; g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.fill();
  g.lineWidth = 8; g.strokeStyle = colour; g.stroke();
  g.fillStyle = colour; g.font = '600 50px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label.slice(0, 3), 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function flightPanel(app: App, ctx: FlightCtx) {
  let fp: FlightPath = emptyFlight(ctx.frame, `${ctx.name}: fly-through`);
  let tl: Timeline | null = null, placing: string | null = null, sel: string | null = null, dragging: string | null = null;
  let preview: { t0: number; from: number } | null = null, scrubT = 0, busy = false, stopFilm = false;
  const films: { name: string; blob: Blob }[] = [];
  const el = document.createElement('section');
  el.className = 'card'; el.id = 'flight';
  el.innerHTML = `<h3>Fly-through</h3>
    <p class="small">Shots on the model: place, drag, add, delete and reorder them. Preview, confirm, then make the film.</p>
    <div class="row wrap"><label class="pill" tabindex="0">Import a shot list<input type="file" id="flFile" accept=".json,application/json" hidden></label><button class="pill" id="flAdd">Add a shot</button></div>
    <ol id="flList" class="small" style="padding-left:0;list-style:none;margin:6px 0;display:grid;gap:6px"></ol>
    <div class="row wrap small" style="align-items:center;gap:6px"><label>Ending <select id="flEnd" aria-label="How the film ends"><option value="none">stop at the last shot</option><option value="rise">rise where it ends (up a void)</option><option value="aerial">rise to an aerial pull-back</option></select></label>
      <label>up <input id="flRise" type="number" step="1" style="width:56px" aria-label="How far up, metres"> m</label><label>over <input id="flSecs" type="number" step="1" style="width:50px" aria-label="Over how many seconds"> s</label></div>
    <label class="small">Modes: <input id="flModes" placeholder="e.g. banquet, conference" style="width:190px" aria-label="The film's modes, separated by commas"></label>
    <label class="small">Back through, after the last shot: <input id="flVia" placeholder="e.g. 04, 03" style="width:110px" aria-label="Shot numbers to go back through after the last shot"></label>
    <div class="row wrap" style="align-items:center"><button class="pill" id="flPlay">Preview</button><input type="range" id="flScrub" min="0" max="1000" value="0" style="flex:1;min-width:120px" aria-label="Scrub the fly-through"><span class="mono small" id="flTime">0:00</span></div>
    <p class="small mono" id="flSays" role="status" aria-live="polite"></p>
    <div class="row wrap"><input id="flWho" placeholder="Your initials" aria-label="Your initials, to confirm the path" style="width:110px"><button class="pill solid" id="flOk">Confirm the path</button></div>
    <div class="row wrap"><button class="pill" id="flSave"${ctx.handoffId ? '' : ' hidden'}>Save to the project</button><button class="pill" id="flJson">Download the path</button></div>
    <div class="row wrap" style="align-items:center"><select id="flSize" aria-label="Film size"><option value="1280x720">720p</option><option value="1920x1080">1080p</option><option value="720x1280">720p upright</option></select>
      <select id="flQ" aria-label="Film quality"><option value="full">Full</option><option value="draft">Draft (quicker)</option></select>
      <select id="flMake" aria-label="Which films"><option value="one">This version</option><option value="all">Every mode and variant</option></select>
      <button class="pill solid" id="flFilm">Render film</button></div>
    <p class="small" id="flFilmSays" role="status" aria-live="polite"></p>
    <div class="row wrap" id="flFilms"></div>`;
  const $ = <T extends HTMLElement>(s: string) => el.querySelector(s) as T;
  const says = (t: string) => ($('#flSays').textContent = t);

  // ---- the markers and the line on the model ----------------------------------------------------------------------------
  const group = new THREE.Group(); group.name = 'flight_path'; ctx.root.add(group);
  const texCache = new Map<string, THREE.Texture>();
  const tex = (label: string, colour: string) => { const k = label + colour; if (!texCache.has(k)) texCache.set(k, markerTexture(label, colour)); return texCache.get(k)!; };
  const draw = () => {
    group.clear();
    const y = ctx.yAt(), colour = fp.status === 'confirmed' ? CONFIRMED : PROPOSED;
    const span = Math.max(8, ctx.focus.distanceTo(app.camera.position) * 0.025);
    for (const s of fp.shots) {
      if (s.x == null || s.z == null) continue;
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(s.id, s.id === sel ? '#d9bacb' : colour), depthTest: false, transparent: true }));
      m.scale.setScalar(Math.min(3, span * 0.12)); m.position.set(s.x, y(s.x, s.z) + s.h + 0.6, s.z); m.renderOrder = 20;
      m.userData = { kind: 'context', name: `Shot ${s.id}`, source: s.source, note: `${s.label}. ${s.where}`, flightShot: s.id };
      group.add(m);
      const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(s.x, y(s.x, s.z), s.z), m.position.clone()]), new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0.7 }));
      group.add(stem);
    }
    tl = timeline(fp, y, [ctx.focus.x, ctx.focus.y, ctx.focus.z]);
    if (tl.duration > 0) {
      const pts: THREE.Vector3[] = [];
      for (let t = 0; t <= tl.duration; t += Math.max(0.1, tl.duration / 600)) { const c = tl.at(t); pts.push(new THREE.Vector3(c.eye[0], c.eye[1] - 0.4, c.eye[2])); }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0.9, depthTest: false }));
      line.renderOrder = 19; line.userData = { kind: 'context', name: `Fly-through, ${fp.status}`, source: fp.status === 'confirmed' ? 'set by hand' : 'proposed', note: `${fp.shots.length} shots, ${tl.length.toFixed(0)} m, ${Math.round(tl.duration)} s` };
      group.add(line);
    }
    const unplaced = fp.shots.filter((s) => s.x == null).length;
    $('#flTime').textContent = tl.duration ? `${fmt(scrubT)} / ${fmt(tl.duration)}` : '0:00';
    if (!preview) says(fp.shots.length ? `${fp.status === 'confirmed' ? `Confirmed by ${fp.confirmed_by}` : 'Proposed'} · v${fp.version} · ${fp.shots.length} shots${unplaced ? `, ${unplaced} not placed` : ''} · ${tl.duration ? `${Math.round(tl.duration)} s, ${tl.length.toFixed(0)} m` : 'place two shots to preview'}` : 'No shots yet: import a shot list or add a shot.');
    app.flight = fp.status === 'confirmed' && tl.duration ? { dur: tl.duration * 1000, at: (u) => { const c = tl!.at(u * tl!.duration); return { eye: new THREE.Vector3(...c.eye), look: new THREE.Vector3(...c.look) }; } } : app.flight;
  };
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ---- the list -----------------------------------------------------------------------------------------------------------
  const num = (id: string, k: keyof Shot, v: number, step: number, label: string, unit: string) => `<label title="${esc(label)}">${esc(label)} <input data-k="${String(k)}" data-id="${esc(id)}" type="number" step="${step}" value="${v}" style="width:58px" aria-label="${esc(`${label} for shot ${id}, ${unit}`)}"></label>`;
  const list = () => {
    $('#flList').innerHTML = fp.shots.map((s, i) => `<li data-shot="${esc(s.id)}" style="border:1px solid var(--line);border-radius:8px;padding:6px 8px${s.id === sel ? ';outline:2px solid var(--accent, #916A70)' : ''}">
      <div class="row wrap" style="align-items:center;gap:6px"><b class="mono">${esc(s.id)}</b><span style="flex:1;min-width:100px">${esc(s.label)}</span>
        <span class="mono">${s.x == null ? '□ not placed' : s.source === 'placed by a person' ? '■ placed' : '□ proposed'}</span></div>
      ${s.where || s.move ? `<div class="small" style="opacity:.8">${esc([s.where, s.move].filter(Boolean).join(' · '))}</div>` : ''}
      <div class="row wrap small" style="gap:6px">${num(s.id, 'dwell', s.dwell, 0.5, 'hold', 's')}${num(s.id, 'speed', Math.round(s.speed * 100) / 100, 0.1, 'speed', 'm/s')}${num(s.id, 'pan', s.pan, 15, 'pan', '°')}${num(s.id, 'tilt', s.tilt, 5, 'tilt', '°')}${num(s.id, 'h', s.h, 0.1, 'eye', 'm')}</div>
      <div class="row wrap small" style="gap:6px"><label>layout change <input data-t="layout" data-id="${esc(s.id)}" value="${esc(s.layout ?? '')}" placeholder="none" style="width:110px" aria-label="${esc(`Layout change at shot ${s.id}`)}"></label>${s.layout ? `<label>shown as <select data-t="variant" data-id="${esc(s.id)}" aria-label="${esc(`How the layout change at shot ${s.id} is shown`)}"><option value="layout"${s.variant !== 'fade' ? ' selected' : ''}>B: pan as it changes</option><option value="fade"${s.variant === 'fade' ? ' selected' : ''}>A: fade out and back</option></select></label>` : ''}</div>
      <div class="row wrap" style="gap:4px"><button class="pill" data-act="place" data-id="${esc(s.id)}" aria-pressed="${placing === s.id}">${s.x == null ? 'Place' : 'Move'}</button><button class="pill" data-act="go" data-id="${esc(s.id)}"${s.x == null ? ' disabled' : ''}>View</button>
        <button class="pill" data-act="up" data-id="${esc(s.id)}"${i ? '' : ' disabled'} aria-label="Move shot ${esc(s.id)} up">↑</button><button class="pill" data-act="down" data-id="${esc(s.id)}"${i < fp.shots.length - 1 ? '' : ' disabled'} aria-label="Move shot ${esc(s.id)} down">↓</button><button class="pill" data-act="del" data-id="${esc(s.id)}" aria-label="Delete shot ${esc(s.id)}">✕</button></div></li>`).join('');
    ($('#flEnd') as HTMLSelectElement).value = fp.finish.kind ?? (fp.finish.aerial ? 'aerial' : 'none');
    ($('#flRise') as HTMLInputElement).value = String(fp.finish.rise); ($('#flSecs') as HTMLInputElement).value = String(fp.finish.secs);
    ($('#flModes') as HTMLInputElement).value = (fp.modes ?? []).join(', ');
    ($('#flVia') as HTMLInputElement).value = fp.finish.via.join(', ');
  };
  const change = (next: FlightPath, why = '') => { fp = edited(next); list(); draw(); if (why) says(why); };
  const shot = (id: string) => fp.shots.find((s) => s.id === id)!;
  const setShot = (id: string, patch: Partial<Shot>) => change({ ...fp, shots: fp.shots.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  el.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.k && t.dataset.id) { const v = Number(t.value); if (Number.isFinite(v)) setShot(t.dataset.id, { [t.dataset.k]: t.dataset.k === 'speed' ? Math.max(0.2, v) : t.dataset.k === 'h' ? Math.max(0.3, v) : t.dataset.k === 'dwell' ? Math.max(0, v) : v } as Partial<Shot>); }
    if (t.dataset.t === 'layout' && t.dataset.id) setShot(t.dataset.id, { layout: t.value.trim().slice(0, 60) || null });
    if (t.dataset.t === 'variant' && t.dataset.id) setShot(t.dataset.id, { variant: t.value === 'fade' ? 'fade' : 'layout' });
    if (t.id === 'flEnd') change({ ...fp, finish: { ...fp.finish, kind: t.value as 'none' | 'rise' | 'aerial', aerial: t.value === 'aerial' } });
    if (t.id === 'flRise') change({ ...fp, finish: { ...fp.finish, rise: Math.max(0, Math.min(300, Number(t.value) || 0)) } });
    if (t.id === 'flSecs') change({ ...fp, finish: { ...fp.finish, secs: Math.max(1, Math.min(60, Number(t.value) || 8)) } });
    if (t.id === 'flModes') change({ ...fp, modes: t.value.split(',').map((m) => m.trim()).filter(Boolean).slice(0, 6) });
    if (t.id === 'flVia') change({ ...fp, finish: { ...fp.finish, via: t.value.split(/[\s,]+/).filter((v) => fp.shots.some((s) => s.id === v)) } });
  });
  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (!b) return;
    const id = b.dataset.id!, act = b.dataset.act;
    if (act === 'place') { placing = placing === id ? null : id; sel = id; list(); draw(); says(placing ? `Click the ground where shot ${id} is.` : ''); }
    if (act === 'go') { const s = shot(id), y = ctx.yAt(); sel = id; if (s.x != null && tl) { const m = tl.marks.find((k) => k.id === id); if (m) seek(m.arrive); else { app.camera.position.set(s.x, y(s.x, s.z!) + s.h, s.z!); app.controls.target.set(ctx.focus.x, app.camera.position.y, ctx.focus.z); app.controls.update(); } } list(); draw(); }
    if (act === 'up' || act === 'down') change(reorder(fp, id, act === 'up' ? -1 : 1), `Shot ${id} moved ${act}.`);
    if (act === 'del') { if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Delete?'; return; } change({ ...fp, shots: fp.shots.filter((s) => s.id !== id), finish: { ...fp.finish, via: fp.finish.via.filter((v) => v !== id) } }, `Shot ${id} deleted.`); }
  });
  $('#flAdd').addEventListener('click', () => {
    let n = fp.shots.length + 1, id = String(n).padStart(2, '0'); while (fp.shots.some((s) => s.id === id)) id = String(++n).padStart(2, '0');
    const s = newShot(id); sel = id; placing = id;
    change({ ...fp, shots: [...fp.shots, s] }, `Shot ${id} added: click the ground where it is.`);
  });
  $('#flFile').addEventListener('change', async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0]; (e.target as HTMLInputElement).value = '';
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      fp = j?.schema === 'assembl.flight-path.v1' ? readFlight(j) : importShotList(j, { frame: ctx.frame, name: `${ctx.name}: fly-through` });
      sel = null; placing = fp.shots.find((s) => s.x == null)?.id ?? null; list(); draw();
      says(placing ? `${fp.shots.length} shots read. Click the ground where shot ${placing} is (${shot(placing).where || 'see the list'}).` : `${fp.shots.length} shots read.`);
    } catch (err) { says((err as Error).message); }
  });

  // ---- placing and dragging on the 3D view ------------------------------------------------------------------------------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const toNdc = (ev: PointerEvent) => { const r = app.canvas.getBoundingClientRect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, app.camera); };
  const groundHit = (ev: PointerEvent) => { toNdc(ev); const h = ray.intersectObjects(ctx.pickables().filter((o) => o.visible), true).find((x) => (x.object as THREE.Mesh).isMesh); return h ? h.point : null; };
  const before = app.pickHook;
  app.pickHook = (ev) => {
    if (placing) {
      const p = groundHit(ev); if (!p) { says('That is not on the ground or the model. Click the ground.'); return true; }
      const id = placing; setShot(id, { x: p.x, z: p.z, source: 'placed by a person' });
      placing = fp.shots.find((s) => s.x == null)?.id ?? null; sel = placing ?? id; list(); draw();
      says(placing ? `Shot ${id} placed. Now shot ${placing}: ${shot(placing).where || 'click where it is'}.` : `Shot ${id} placed. Drag a marker to move it.`);
      return true;
    }
    return before ? before(ev) : false;
  };
  // drag a marker: pointer down on it, move along the ground, let go
  app.canvas.addEventListener('pointerdown', (ev) => {
    if (busy || !ev.isPrimary) return;
    toNdc(ev);
    const hit = ray.intersectObjects(group.children.filter((c) => (c as THREE.Sprite).isSprite), false)[0];
    if (!hit) return;
    dragging = hit.object.userData.flightShot as string; sel = dragging; app.controls.enabled = false; app.canvas.setPointerCapture(ev.pointerId);
    ev.stopPropagation();
  }, true);
  app.canvas.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    const p = groundHit(ev); if (!p) return;
    const s = shot(dragging); s.x = p.x; s.z = p.z; s.source = 'placed by a person'; draw();
  });
  const endDrag = (ev: PointerEvent) => { if (!dragging) return; const id = dragging; dragging = null; app.controls.enabled = true; try { app.canvas.releasePointerCapture(ev.pointerId); } catch { /* */ } change({ ...fp }, `Shot ${id} moved.`); };
  app.canvas.addEventListener('pointerup', endDrag); app.canvas.addEventListener('pointercancel', endDrag);

  // ---- preview and scrub --------------------------------------------------------------------------------------------------
  const seek = (t: number) => {
    if (!tl || !tl.duration) return;
    scrubT = Math.max(0, Math.min(tl.duration, t));
    const c = tl.at(scrubT);
    app.camera.position.set(...c.eye); app.controls.target.set(...c.look); app.camera.lookAt(c.look[0], c.look[1], c.look[2]);
    ($('#flScrub') as HTMLInputElement).value = String(Math.round((scrubT / tl.duration) * 1000));
    $('#flTime').textContent = `${fmt(scrubT)} / ${fmt(tl.duration)} · shot ${c.shot}${c.phase === 'dwell' ? ' (held)' : ''}`;
    layoutAt(scrubT);
  };
  const layoutAt = (t: number) => {
    if (!tl) return;
    const c = tl.at(t), fn = ctx.layout ?? defaultLayout;
    fn(c.layout?.name ?? null, c.layout?.amount ?? 0);
  };
  $('#flScrub').addEventListener('input', (e) => { if (tl) { preview = null; seek((Number((e.target as HTMLInputElement).value) / 1000) * tl.duration); } });
  $('#flPlay').addEventListener('click', () => {
    if (preview) { preview = null; $('#flPlay').textContent = 'Preview'; app.controls.enabled = true; return; }
    if (!tl?.duration) return says('Place two shots first.');
    preview = { t0: performance.now(), from: scrubT >= tl.duration - 0.05 ? 0 : scrubT }; $('#flPlay').textContent = 'Stop'; app.controls.enabled = false;
  });
  app.onFrame.push(() => {
    if (!preview || !tl) return;
    const t = preview.from + (performance.now() - preview.t0) / 1000;
    seek(t);
    if (t >= tl.duration) { preview = null; $('#flPlay').textContent = 'Preview'; app.controls.enabled = true; draw(); }
  });

  // ---- confirm, save, download ---------------------------------------------------------------------------------------------
  $('#flOk').addEventListener('click', () => {
    try { fp = confirm(fp, ($('#flWho') as HTMLInputElement).value); list(); draw(); says(`Confirmed by ${fp.confirmed_by}. Save it to the project, or make the film.`); }
    catch (err) { says((err as Error).message); }
  });
  const json = () => new Blob([JSON.stringify(fp, null, 1)], { type: 'application/json' });
  $('#flSave').addEventListener('click', async () => {
    if (!ctx.handoffId) return;
    try {
      fp = bump(fp);
      await putBackRecord(ctx.handoffId, 'flight', { name: `flight-path-v${fp.version}.json`, data: json(), meta: { status: fp.status, version: fp.version, confirmed_by: fp.confirmed_by, shots: fp.shots.length } });
      draw(); says(`Saved to the project as version ${fp.version} (${fp.status}). The project page takes it in when you go back to it.`);
    } catch (err) { says(`Not saved: ${(err as Error).message}`); }
  });
  $('#flJson').addEventListener('click', () => void app.save?.(`flight-path-v${fp.version}.json`, json()));

  // ---- the film -----------------------------------------------------------------------------------------------------------
  const fsays = (t: string) => ($('#flFilmSays').textContent = t);
  
  const slug = (v: string) => v.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').toLowerCase();
  const showFilms = () => {
    $('#flFilms').innerHTML = films.map((f, i) => `<button class="pill" data-film="${i}">Download ${esc(f.name.replace(/^.*-flythrough-/, ''))}</button>`).join('');
  };
  $('#flFilms').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest('[data-film]') as HTMLElement | null; if (b) { const f = films[Number(b.dataset.film)]; if (f) void app.save?.(f.name, f.blob); } });
  $('#flFilm').addEventListener('click', async () => {
    if (busy) { stopFilm = true; return; }
    if (!tl?.duration) return fsays('Place two shots first.');
    const [w, h] = ($('#flSize') as HTMLSelectElement).value.split('x').map(Number), q = ($('#flQ') as HTMLSelectElement).value as 'full' | 'draft';
    const all = ($('#flMake') as HTMLSelectElement).value === 'all';
    // what to make: each mode (or none), and for every shot with a layout change, each way of showing it (or as set)
    const modes: (string | null)[] = all && fp.modes?.length ? fp.modes : [fp.modes?.[0] ?? null];
    const layoutShots = fp.shots.filter((s) => s.layout && s.x != null);
    const variantSets: { tag: string; v: Record<string, 'layout' | 'fade'> }[] = all && layoutShots.length
      ? (['fade', 'layout'] as const).map((v) => ({ tag: v === 'fade' ? 'A-fade' : 'B-pan', v: Object.fromEntries(layoutShots.map((s) => [s.id, v])) }))
      : [{ tag: '', v: {} }];
    busy = true; stopFilm = false; $('#flFilm').textContent = 'Stop'; preview = null;
    const hide = [group, ...(ctx.hideForFilm?.() ?? [])].filter((o) => o.visible); for (const o of hide) o.visible = false;
    const setMode = ctx.setMode ?? defaultMode;
    try {
      let k = 0;
      for (const mode of modes) for (const vs of variantSets) {
        if (stopFilm) throw new Error('stopped');
        k++;
        const modeSays = await setMode(mode);
        const T = timeline(fp, ctx.yAt(), [ctx.focus.x, ctx.focus.y, ctx.focus.z], { variants: vs.v });
        const caption = [fp.status === 'confirmed' ? '' : 'proposed path, draft', modeSays, vs.tag ? `shot ${layoutShots.map((s) => s.id).join(', ')}: ${vs.tag === 'A-fade' ? 'A, fade' : 'B, pan as the layout changes'}` : ''].filter(Boolean).join(' · ');
        const lead = modes.length * variantSets.length > 1 ? `Film ${k} of ${modes.length * variantSets.length}: ` : '';
        const out = await renderFilm(app, { width: w, height: h, fps: FPS, quality: q, duration: Math.min(T.duration, CAP), at: T.at, caption,
          beforeFrame: (_t, c) => (ctx.layout ?? defaultLayout)(c.layout?.name ?? null, c.layout?.amount ?? 0), stop: () => stopFilm,
          onProgress: (d, n) => { if (d % 15 === 0 || d === n) fsays(`${lead}frame ${d} of ${n}…`); } });
        const name = `${slug(ctx.name)}-flythrough-v${fp.version}${mode ? `-${slug(mode)}` : ''}${vs.tag ? `-${vs.tag.toLowerCase()}` : ''}${fp.status === 'confirmed' ? '' : '-proposed'}.${out.type}`;
        films.push({ name, blob: out.blob }); app.lastVideo = out.blob; showFilms();
        fsays(`${lead}made: ${Math.round(out.secs)} s, ${w}×${h}, ${out.type.toUpperCase()}, ${(out.blob.size / 1e6).toFixed(1)} MB, in ${Math.round(out.ms / 1000)} s.${fp.status === 'confirmed' ? '' : ' The path is still a proposal: this is a draft.'}`);
        if (ctx.handoffId) {
          await putBackRecord(ctx.handoffId, 'film', { name, part: slug(name), data: out.blob, meta: { status: fp.status, version: fp.version, secs: Math.round(out.secs), size: `${w}x${h}`, quality: q, mode, variant: vs.tag || null } })
            .then(() => fsays(`${$('#flFilmSays').textContent} A copy goes to the project.`)).catch((e) => fsays(`${$('#flFilmSays').textContent} The copy for the project did not go: ${(e as Error).message}`));
        }
      }
      await setMode(null);
    } catch (err) { fsays((err as Error).message === 'stopped' ? 'Stopped.' : `The film could not be made: ${(err as Error).message}`); }
    finally { for (const o of hide) o.visible = true; busy = false; $('#flFilm').textContent = 'Render film'; (ctx.layout ?? defaultLayout)(null, 0); }
  });

  list(); draw();
  const api = {
    el,
    get path() { return fp; },
    set path(v: FlightPath) { fp = v; list(); draw(); },
    get timeline() { return tl; },
    redraw: draw,
    seek,
  };
  (window as unknown as { __flight?: unknown }).__flight = api;   // for checks from the console (this tab only)
  return api;
}
