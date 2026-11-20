import * as THREE from 'three/webgpu';
import type { App } from './app';

// Arrange and review: move proposed furniture in the 3D view (snapped to 100 mm), and drop numbered review pins on
// any surface. Furniture stays labelled proposed; pins are kept in this browser only (localStorage, per page).
// The drag idea came from the Gemini-built WebGPU studio prototype; this is written for the twin's own scene.
type Pin = { id: number; p: [number, number, number]; note: string; done: boolean };
type Loose = { camera: THREE.PerspectiveCamera; controls: { enabled: boolean; target: THREE.Vector3; update(): void }; canvas: HTMLCanvasElement; modelRoot: THREE.Object3D; plain: THREE.Object3D; scene: THREE.Scene; walk: { on: boolean }; clip: { enabled: boolean }; sectionPlane: THREE.Plane; isUnder(o: THREE.Object3D, root: THREE.Object3D): boolean; log(m: string): void };
const SNAP = 0.1;

export function initArrange(appIn: App) {
  const app = appIn as unknown as Loose;
  const moveBtn = document.getElementById('moveMode'), pinBtn = document.getElementById('pinMode'), list = document.getElementById('pins'), labels = document.getElementById('labels');
  if (!moveBtn || !pinBtn || !list || !labels) return;
  let mode: 'none' | 'move' | 'pin' = 'none';
  const setMode = (m: typeof mode) => {
    mode = mode === m ? 'none' : m; if (mode === 'none') app.log('Ready. Drag to orbit, click a part to inspect it.');
    moveBtn.setAttribute('aria-pressed', String(mode === 'move')); pinBtn.setAttribute('aria-pressed', String(mode === 'pin'));
    moveBtn.classList.toggle('solid', mode === 'move'); pinBtn.classList.toggle('solid', mode === 'pin');
    app.canvas.style.cursor = mode === 'move' ? 'grab' : mode === 'pin' ? 'crosshair' : '';
    if (mode === 'move') app.log('Move furniture: drag a piece across the floor. It snaps to 100 mm.');
    if (mode === 'pin') app.log('Add a pin: tap any surface.');
  };
  moveBtn.addEventListener('click', () => setMode('move'));
  pinBtn.addEventListener('click', () => setMode('pin'));

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hit = (ev: PointerEvent) => {
    const r = app.canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, app.camera);
    return ray.intersectObjects([app.modelRoot, app.plain].filter((o) => o.visible), true).find((h) => {
      if (!(h.object as THREE.Mesh).isMesh) return false;
      for (let o: THREE.Object3D | null = h.object; o; o = o.parent) if (!o.visible) return false;
      // parts cut away by the section slider can't be picked, so you can reach what is under them
      if (app.clip.enabled && h.point.y > app.sectionPlane.constant && app.isUnder(h.object, app.modelRoot)) return false;
      return true;
    }) ?? null;
  };
  const furnitureOf = (o: THREE.Object3D) => { let t: THREE.Object3D | null = o, top: THREE.Object3D | null = null; while (t) { if (t.userData?.kind === 'furniture') top = t; t = t.parent; } return top; };

  // ---- move furniture
  let drag: { obj: THREE.Object3D; plane: THREE.Plane; grab: THREE.Vector3; start: THREE.Vector3; id: number } | null = null;
  const onPlane = (ev: PointerEvent, plane: THREE.Plane) => {
    const r = app.canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, app.camera);
    return ray.ray.intersectPlane(plane, new THREE.Vector3());
  };
  app.canvas.addEventListener('pointerdown', (ev) => {
    if (mode !== 'move' || app.walk.on) return;
    const h = hit(ev); const obj = h && furnitureOf(h.object);
    if (!h || !obj) return;
    ev.stopImmediatePropagation(); ev.preventDefault();
    app.controls.enabled = false; app.canvas.setPointerCapture(ev.pointerId); app.canvas.style.cursor = 'grabbing';
    drag = { obj, plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -h.point.y), grab: h.point.clone(), start: obj.getWorldPosition(new THREE.Vector3()), id: ev.pointerId };
  }, { capture: true });
  app.canvas.addEventListener('pointermove', (ev) => {
    if (!drag || ev.pointerId !== drag.id) return;
    ev.stopImmediatePropagation();
    const p = onPlane(ev, drag.plane); if (!p) return;
    const dx = Math.round((p.x - drag.grab.x) / SNAP) * SNAP, dz = Math.round((p.z - drag.grab.z) / SNAP) * SNAP;
    const w = drag.start.clone().add(new THREE.Vector3(dx, 0, dz));
    drag.obj.parent!.worldToLocal(w); drag.obj.position.copy(w);
  }, { capture: true });
  const end = (ev: PointerEvent) => {
    if (!drag || ev.pointerId !== drag.id) return;
    ev.stopImmediatePropagation();
    const now = drag.obj.getWorldPosition(new THREE.Vector3()), d = now.clone().sub(drag.start);
    if (d.length() > 0.01) { drag.obj.userData.note = 'Moved by hand in this view. Still proposed.'; const mm = (v: number, pos: string, neg: string) => (Math.abs(v) < 0.005 ? '' : `${Math.round(Math.abs(v) * 1000)} mm ${v > 0 ? pos : neg}`); app.log(`${drag.obj.userData.name ?? 'Piece'} moved ${[mm(d.x, 'east', 'west'), mm(d.z, 'south', 'north')].filter(Boolean).join(', ')} (model axes).`); }
    drag = null; app.controls.enabled = true; app.canvas.style.cursor = mode === 'move' ? 'grab' : '';
  };
  app.canvas.addEventListener('pointerup', end, { capture: true });
  app.canvas.addEventListener('pointercancel', end, { capture: true });

  // ---- review pins
  const KEY = `assembl-twin-pins:${location.pathname}:${document.body.dataset.project ?? ''}`;
  let pins: Pin[] = [];
  try { pins = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Pin[]; } catch { /* storage blocked: pins last for this visit */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(pins)); } catch { /* blocked */ } };
  const dots = new Map<number, HTMLElement>();
  const layer = document.createElement('div'); layer.className = 'pin-layer'; labels.parentElement!.append(layer);   // its own layer: the twin clears #labels when its own labels change
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const goTo = (pin: Pin) => {
    const p = new THREE.Vector3(...pin.p), off = app.camera.position.clone().sub(app.controls.target).setLength(6);
    app.controls.target.copy(p); app.camera.position.copy(p).add(off); app.controls.update();
  };
  const render = () => {
    list.innerHTML = pins.map((p) => `<li data-id="${p.id}" class="pinrow${p.done ? ' done' : ''}"><button class="pill" data-go aria-label="Go to pin ${p.id}">${p.id}</button><input type="text" value="${esc(p.note)}" placeholder="Note" aria-label="Note for pin ${p.id}"><button class="pill" data-done aria-pressed="${p.done}">${p.done ? 'Resolved' : 'Open'}</button><button class="pill" data-del aria-label="Remove pin ${p.id}">×</button></li>`).join('');
    for (const [id, el] of dots) if (!pins.some((p) => p.id === id)) { el.remove(); dots.delete(id); }
    for (const p of pins) {
      let el = dots.get(p.id);
      if (!el) { el = document.createElement('div'); el.className = 'pin-dot'; el.textContent = String(p.id); layer.append(el); dots.set(p.id, el); }
      el.classList.toggle('done', p.done);
    }
  };
  list.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button'), li = (e.target as HTMLElement).closest('li'); if (!b || !li) return;
    const pin = pins.find((p) => p.id === Number(li.dataset.id)); if (!pin) return;
    if (b.hasAttribute('data-go')) goTo(pin);
    if (b.hasAttribute('data-done')) { pin.done = !pin.done; save(); render(); }
    if (b.hasAttribute('data-del')) { pins = pins.filter((p) => p !== pin); save(); render(); }
  });
  list.addEventListener('input', (e) => {
    const li = (e.target as HTMLElement).closest('li'), pin = pins.find((p) => p.id === Number(li?.dataset.id));
    if (pin) { pin.note = (e.target as HTMLInputElement).value.slice(0, 200); save(); }
  });
  let down: [number, number] | null = null;
  app.canvas.addEventListener('pointerdown', (ev) => { if (mode === 'pin') down = [ev.clientX, ev.clientY]; });
  app.canvas.addEventListener('pointerup', (ev) => {
    if (mode !== 'pin' || !down || Math.hypot(ev.clientX - down[0], ev.clientY - down[1]) > 4) return;
    ev.stopImmediatePropagation();
    const h = hit(ev); if (!h) return;
    pins.push({ id: Math.max(0, ...pins.map((p) => p.id)) + 1, p: [h.point.x, h.point.y, h.point.z], note: '', done: false });
    save(); render(); setMode('pin');
    (list.querySelector('li:last-child input') as HTMLInputElement | null)?.focus();
  }, { capture: true });
  const v = new THREE.Vector3();
  const tick = () => {
    const r = app.canvas.getBoundingClientRect(); app.camera.updateMatrixWorld();
    for (const p of pins) {
      const el = dots.get(p.id); if (!el) continue;
      v.set(...p.p).project(app.camera);
      const on = v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1;
      el.style.display = on ? '' : 'none';
      if (on) el.style.transform = `translate(${((v.x + 1) / 2) * r.width}px, ${((1 - v.y) / 2) * r.height}px) translate(-50%, -50%)`;
    }
    requestAnimationFrame(tick);
  };
  render(); requestAnimationFrame(tick);
  // for automated checks: where a piece of furniture is on screen
  (window as unknown as { __arrange?: unknown }).__arrange = { pieces: () => { const out: { name: string; x: number; y: number }[] = []; const r = app.canvas.getBoundingClientRect(); app.modelRoot.traverse((o) => { if (o.userData?.kind === 'furniture' && o.parent?.userData?.kind !== 'furniture') { const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).project(app.camera); out.push({ name: String(o.userData.name), x: r.left + ((c.x + 1) / 2) * r.width, y: r.top + ((1 - c.y) / 2) * r.height }); } }); return out; } };
}
