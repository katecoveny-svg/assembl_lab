import * as THREE from 'three/webgpu';
import { byId, type CatItem } from './catalogue';
import { BUILDERS } from './pieces';
import { libraryItem, LIBRARY } from '../library';
import { addContactShadow } from '../scandiInteriors';
import { plan, dropAt, footprint, type Box2, type Room, type Slot, type Want } from './fit';

// A project's picks from the ops page's Library, placed in the model. The ops page writes one entry in the tab's
// session storage (architecture/js/selections.js, selectionsHandoff) and opens this page with ?picks=<project id>;
// a new tab opened that way starts with a copy of the opener's session storage.
//
// Each picked piece goes into a fit-out place for its role (fitout.ts slot_<role>, or the main piece of a code-built
// suite: the sofa, the bed, the dining table) in the room it was picked for, when it fits there and stays clear of
// every wall (fit.ts). Everything else waits on a "to place" strip; drag a card into a room to put it there. A piece
// is never put through a wall: fit.ts checks its turned footprint against the walls, the rooms and the pieces placed.

export const PICKS_KEY = 'assembl-twin-selections';
export const PICKS_TYPE = 'assembl.selections.v1';
export interface PickItem { id: string; qty: number; room: string; finish: string }

/** the picks handed over for this page's ?picks=<project id>, or null */
export function readPicks(search = location.search): { project: string; items: PickItem[] } | null {
  const pid = new URLSearchParams(search).get('picks');
  if (!pid) return null;
  try {
    const h = JSON.parse(sessionStorage.getItem(PICKS_KEY) ?? 'null');
    if (!h || h.type !== PICKS_TYPE || String(h.project_id) !== pid || !Array.isArray(h.items)) return null;
    const items = (h.items as PickItem[]).filter((x) => byId(String(x?.id))).map((x) => ({ id: String(x.id), qty: Math.max(1, Math.min(99, Math.round(Number(x.qty) || 1))), room: String(x.room ?? ''), finish: String(x.finish ?? '') }));
    return { project: pid, items };
  } catch { return null; }
}

type AppLike = { log(m: string): void; canvas: HTMLCanvasElement; camera: THREE.PerspectiveCamera; modelRoot?: THREE.Object3D };
const box2 = (b: THREE.Box3): Box2 => ({ x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z });
const yaw = (o: THREE.Object3D) => { const q = o.getWorldQuaternion(new THREE.Quaternion()), f = new THREE.Vector3(0, 0, 1).applyQuaternion(q); return Math.atan2(f.x, f.z); };

/** the walls, rooms and fit-out places of a built model, in world plan boxes */
export function measure(model: THREE.Object3D) {
  model.updateMatrixWorld(true);
  const walls: Box2[] = [], rooms: Room[] = [], slots: (Slot & { obj: THREE.Object3D; virtual: boolean })[] = [];
  const roomOf = (o: THREE.Object3D) => { for (let t: THREE.Object3D | null = o; t; t = t.parent) { const m = /^fitout_[^_]+_(.+)$/.exec(t.name); if (m) return m[1].replace(/_/g, ' '); } return ''; };
  model.traverse((o) => {
    if (o.userData?.ifcClass === 'IfcWall') walls.push(box2(new THREE.Box3().setFromObject(o)));
    if (o.userData?.kind === 'space' && (o as THREE.Mesh).isMesh) { const b = new THREE.Box3().setFromObject(o); rooms.push({ ...box2(b), name: String(o.userData.name ?? ''), y: b.min.y }); }
  });
  model.traverse((o) => {
    const p = o.getWorldPosition(new THREE.Vector3());
    if (o.name.startsWith('slot_')) {
      const u = o.userData as { maxW?: number; maxD?: number; maxH?: number };
      slots.push({ key: o.uuid, role: o.name.slice(5), room: roomOf(o), x: p.x, y: p.y, z: p.z, rot: yaw(o), maxW: u.maxW, maxD: u.maxD, maxH: u.maxH, obj: o, virtual: false });
      return;
    }
    // a code-built suite's main piece: the innermost group carrying the suite's name
    const n = o.userData?.kind === 'furniture' ? String(o.userData.name ?? '') : '';
    const role = /bouclé sofa|sofa,/i.test(n) ? 'sofa' : /^oak bed/i.test(n) ? 'bed' : /dining table/i.test(n) ? 'dining_table' : '';
    if (role && !o.children.some((c) => c.userData?.name === n)) slots.push({ key: o.uuid, role, room: roomOf(o), x: p.x, y: p.y, z: p.z, rot: yaw(o), obj: o, virtual: true });
  });
  return { walls, rooms, slots };
}

/** build a catalogue piece: in code, or from Kate's GLB library */
export async function buildPiece(it: CatItem, finish = ''): Promise<THREE.Object3D | null> {
  if (BUILDERS[it.id]) return BUILDERS[it.id](finish || undefined);
  const lib = LIBRARY.find((x) => x.id === (it.glb ?? it.id));
  return lib ? ((await libraryItem(lib.role)) as THREE.Object3D | null) : null;
}
function dress(o: THREE.Object3D, it: CatItem) {
  o.traverse((m) => { if ((m as THREE.Mesh).isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  o.userData = { ...o.userData, kind: 'furniture', name: it.title, source: 'library', libId: it.id, note: `Picked from the library. ${it.credit}.`, size: `${it.dims.w} × ${it.dims.d} × ${it.dims.h} mm` };
  if (it.fit === 'floor' && it.category !== 'rugs-textiles') addContactShadow(o as THREE.Group, it.dims.w / 1000 * 1.05, it.dims.d / 1000 * 1.05);
  return o;
}
/** hide a suite's own pieces where a picked piece now stands (its rug stays) */
function clearUnder(suite: THREE.Object3D, b: Box2) {
  suite.updateMatrixWorld(true);
  suite.traverse((m) => {
    if (!(m as THREE.Mesh).isMesh || m.userData?.libPiece) return;
    const bb = new THREE.Box3().setFromObject(m), c = bb.getCenter(new THREE.Vector3());
    if (bb.max.y - bb.min.y < 0.035) return;
    if (c.x > b.x0 - 0.05 && c.x < b.x1 + 0.05 && c.z > b.z0 - 0.05 && c.z < b.z1 + 0.05) m.visible = false;
  });
}

/** place the handed-over picks in the model; the rest go on the strip */
export async function applyPicks(app: AppLike, model: THREE.Object3D, picks = readPicks()) {
  if (!picks?.items.length) return null;
  const { walls, rooms, slots } = measure(model);
  const wants: (Want & { finish: string })[] = [];
  for (const p of picks.items) {
    const it = byId(p.id)!;
    for (let k = 0; k < p.qty; k++) wants.push({ uid: `${p.id}#${p.room}#${p.finish}#${k}`, id: p.id, role: it.role, w: it.dims.w / 1000, d: it.dims.d / 1000, h: it.dims.h / 1000, room: p.room, fit: it.fit, finish: p.finish });
  }
  const r = plan(wants, slots, rooms, walls);
  const taken: Box2[] = r.placed.map((p) => p.box);
  let placed = 0;
  for (const p of r.placed) {
    const w = wants.find((x) => x.uid === p.uid)!, it = byId(w.id)!, s = slots.find((x) => x.key === p.slot)!;
    const o = await buildPiece(it, w.finish);
    if (!o) { r.toPlace.push({ uid: w.uid, id: w.id, why: 'its model did not load' }); continue; }
    dress(o, it);
    o.traverse((m) => { m.userData.libPiece = true; });
    if (s.virtual) clearUnder(s.obj, p.box);
    else for (const c of [...s.obj.children]) if (c.userData?.fallback) s.obj.remove(c);
    s.obj.add(o);
    placed++;
  }
  const strip = r.toPlace.length ? stripUi(app, model, r.toPlace.map((t) => ({ ...t, want: wants.find((x) => x.uid === t.uid)! })), rooms, walls, taken) : null;
  const n = wants.length;
  app.log(`Your picks: ${placed} of ${n} placed in the model${r.toPlace.length ? `, ${r.toPlace.length} to place: drag them in from the strip` : ''}. All proposed.`);
  // a moved piece must not end up through a wall either (arrange.ts asks this before it lets go)
  (window as unknown as { __picksCheck?: (o: THREE.Object3D) => boolean }).__picksCheck = (o) => {
    const b = new THREE.Box3().setFromObject(o);
    const fp = box2(b.expandByScalar(-0.01));
    return !walls.some((w) => fp.x0 < w.x1 - 0.005 && fp.x1 > w.x0 + 0.005 && fp.z0 < w.z1 - 0.005 && fp.z1 > w.z0 + 0.005);
  };
  const out = { placed: r.placed.map((p) => ({ id: p.id, x: +p.x.toFixed(3), z: +p.z.toFixed(3), box: p.box })), toPlace: r.toPlace.map((t) => ({ id: t.id, why: t.why })), walls, rooms, strip };
  (window as unknown as { __picks?: unknown }).__picks = out;
  return out;
}

/** the strip of pieces still to place: drag a card into a room */
function stripUi(app: AppLike, model: THREE.Object3D, list: { uid: string; id: string; why: string; want: Want & { finish: string } }[], rooms: Room[], walls: Box2[], taken: Box2[]) {
  const stage = app.canvas.parentElement!;
  if (!document.getElementById('picks-css')) {
    const st = document.createElement('style'); st.id = 'picks-css';
    st.textContent = `.picks{position:absolute;left:12px;right:12px;bottom:12px;z-index:7;background:rgba(249,246,242,.95);backdrop-filter:blur(8px);border:1px solid rgba(101,74,78,.28);padding:8px 10px 10px;font:400 13px/1.3 "Instrument Sans",system-ui,sans-serif;color:#240B21;max-width:880px}
.picks h3{margin:0 0 6px;font:500 13px/1.2 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.04em;text-transform:uppercase;color:#654A4E}
.picks ul{list-style:none;margin:0;padding:0 0 2px;display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x proximity}
.picks li{flex:0 0 auto;width:132px;scroll-snap-align:start;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
.picks li img{display:block;width:132px;height:100px;object-fit:cover;background:#e6e0d9;pointer-events:none}
.picks li span{display:block;margin-top:3px;font-size:12px;line-height:1.2}
.picks li small{display:block;color:#654A4E;font-size:11px}
.picks .why{margin:6px 0 0;color:#654A4E;font-size:12px}
.picks-ghost{position:fixed;z-index:50;pointer-events:none;width:110px;opacity:.85;transform:translate(-50%,-60%)}
@media (max-width:600px){.picks{left:6px;right:6px;bottom:6px}.picks li{width:104px}.picks li img{width:104px;height:80px}}`;
    document.head.append(st);
  }
  const box = document.createElement('section');
  box.className = 'picks';
  box.setAttribute('aria-label', 'Picks to place');
  const pic = (id: string) => new URL(`../library/pics/${id}.webp`, location.href).href;
  const left = [...list];
  const draw = (msg = '') => {
    box.hidden = !left.length;
    box.innerHTML = `<h3>To place · ${left.length}</h3><ul>${left.map((t) => `<li data-uid="${t.uid}" title="${byId(t.id)!.title}: ${t.why}"><img src="${pic(t.id)}" alt="" width="132" height="100" /><span>${byId(t.id)!.title}</span><small>${t.want.room || 'Any room'} · drag into a room</small></li>`).join('')}</ul>${msg ? `<p class="why" role="status">${msg}</p>` : ''}`;
  };
  draw();
  stage.append(box);
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let drag: { t: (typeof list)[number]; ghost: HTMLImageElement; id: number } | null = null;
  const floorAt = (cx: number, cy: number) => {
    const r = app.canvas.getBoundingClientRect();
    if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return null;
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, app.camera);
    // the floor level of the rooms (all one level in a plan model)
    const y = rooms.length ? rooms[0].y : 0;
    const p = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), new THREE.Vector3());
    return p;
  };
  /** put one piece at a world point; returns what to say */
  const place = async (t: (typeof list)[number], x: number, z: number) => {
    const it = byId(t.id)!;
    // face the camera, square to the walls
    const cam = app.camera.position, rot = Math.round(Math.atan2(cam.x - x, cam.z - z) / (Math.PI / 2)) * (Math.PI / 2);
    const at = dropAt(t.want, x, z, rot, rooms, walls, taken);
    if (!at.ok) return at.why;
    const o = await buildPiece(it, t.want.finish);
    if (!o) return 'Its model did not load.';
    dress(o, it);
    o.position.set(at.x, at.room.y, at.z);
    o.rotation.y = rot;
    model.add(o);
    taken.push(footprint(at.x, at.z, rot, t.want.w, t.want.d));
    left.splice(left.indexOf(t), 1);
    return `${it.title} placed in ${at.room.name}${at.nudged ? ', moved clear of a wall' : ''}. Still proposed.`;
  };
  box.addEventListener('pointerdown', (e) => {
    const li = (e.target as HTMLElement).closest('li');
    if (!li) return;
    const t = left.find((x) => x.uid === li.dataset.uid); if (!t) return;
    e.preventDefault();
    const ghost = document.createElement('img'); ghost.className = 'picks-ghost'; ghost.src = pic(t.id); ghost.alt = '';
    ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`;
    document.body.append(ghost);
    drag = { t, ghost, id: e.pointerId };
    try { box.setPointerCapture(e.pointerId); } catch { /* fine */ }
  });
  box.addEventListener('pointermove', (e) => { if (drag && e.pointerId === drag.id) { drag.ghost.style.left = `${e.clientX}px`; drag.ghost.style.top = `${e.clientY}px`; } });
  const end = async (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null; d.ghost.remove();
    const p = floorAt(e.clientX, e.clientY);
    if (!p) return;
    const msg = await place(d.t, p.x, p.z);
    app.log(msg); draw(msg);
  };
  box.addEventListener('pointerup', end);
  box.addEventListener('pointercancel', (e) => { if (drag && e.pointerId === drag.id) { drag.ghost.remove(); drag = null; } });
  // for automated checks: drop a strip piece at a world point
  return { drop: async (id: string, x: number, z: number) => { const t = left.find((u) => u.id === id); if (!t) return 'not on the strip'; const m = await place(t, x, z); draw(m); return m; }, left: () => left.map((t) => t.id) };
}
