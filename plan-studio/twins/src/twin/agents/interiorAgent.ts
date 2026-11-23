import * as THREE from 'three/webgpu';
// @ts-expect-error plain script shared with the ops page (architecture/js/agents/interior-rules.js), no types
import * as R from './interior-rules.js';
import { CATALOGUE, byId } from '../library/catalogue';
import { buildPiece, type PlanRooms } from '../library/picks';
import { setTexDetail } from '../library/mats';

// The interior design agent on the 3D page (roster agent 8). The rules (interior-rules.js) lay each room out from the library;
// this file measures the model's rooms, walls and doors, builds the proposal's pieces in the model as "proposed", and switches
// a hall between its layouts. A person moves pieces with Move (arrange.ts) and approves the proposal on the ops page.
//
// The layout switch, for the camera path and film tools (and the console):
//   import { layoutModes, setLayout, blendLayouts } from './agents/interiorAgent';
//   layoutModes()                         → ['banquet', 'conference', 'exhibition', 'lounge'] for the halls in this model, [] if none
//   setLayout(mode, { transition, ms, room })  → Promise, resolved when the switch has finished
//        transition: 'cut' (at once) or 'grow' (the default: the old pieces sink into the floor one after another, then the new
//        ones rise; ms is the whole switch, 1600 by default). room: one room's name; every hall when left out.
//   blendLayouts(from, to, t, room?)      → the same switch at t from 0 to 1, drawn at once: a film renders it frame by frame
//   currentLayout(room?)                  → the mode showing
// The same is on window.__interior for a page without imports; a finished switch fires 'interior-layout' on window ({ room, mode }). A mode a hall cannot take is refused (the promise rejects).
// "banquet": round tables of ten; "conference": rows facing the stage end (assumed: the short wall furthest from the doors);
// "exhibition" and "lounge" as well. Cross-fading is not built: the library's materials are shared between pieces.

export type Proposal = ReturnType<typeof R.propose>;
type Box = { x0: number; x1: number; z0: number; z1: number };
type Host = { log(m: string): void; modelRoot: THREE.Object3D; onFrame: ((dt: number) => void)[] };
interface Shown { room: string; mode: string; group: THREE.Group; parts: Part[] }
/** one piece in the scene, or one instance of many: its own scale is how far it has grown (0 to 1) */
interface Part { set(s: number): void; order: number }
const INSTANCE_FROM = 24;
const FRAME_ROOTS = new Map<string, THREE.Group>(); // more of one piece than this in a layout: drawn as instances (moved as a layout, not one by one)

const box2 = (b: THREE.Box3): Box => ({ x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z });
let STATE: { proposal: Proposal; groups: Map<string, Map<string, Shown>>; root: THREE.Group; walls: Box[]; doors: Box[] } | null = null;

/** the frames rooms are laid out in: each generated house's own (rooms square to its walls, however it is turned on its site),
 *  or the world's for a model with no plan (an opened IFC, whose spaces are measured where they stand) */
const FRAMES = new Map<string, THREE.Object3D>();
/** a box of an object in a frame's own coordinates */
function boxIn(o: THREE.Object3D, frame: THREE.Object3D | null) {
  const inv = frame ? frame.matrixWorld.clone().invert() : new THREE.Matrix4(), b = new THREE.Box3(), tmp = new THREE.Box3();
  // a wall's own box leaves out the doors and windows it carries (an open door leaf would fill the room beside it)
  const inOpening = (m: THREE.Object3D) => { for (let t: THREE.Object3D | null = m; t && t !== o; t = t.parent) if (/^Ifc(Door|Window)$/.test(String(t.userData?.ifcClass ?? '')) && o.userData?.ifcClass === 'IfcWall') return true; return false; };
  o.traverse((m) => { const g = (m as THREE.Mesh).geometry; if (!(m as THREE.Mesh).isMesh || !g || inOpening(m)) return; if (!g.boundingBox) g.computeBoundingBox(); tmp.copy(g.boundingBox!).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)); b.union(tmp); });
  return b;
}
/** the rooms, walls and doors of the model, each in its frame: rooms from the plan model, or the model's own spaces (IfcSpace) */
export function measureRooms(model: THREE.Object3D, plan?: PlanRooms) {
  model.updateMatrixWorld(true); FRAMES.clear();
  const rooms: { name: string; box: Box; box_src: string; y: number; frame: string; area_m2?: number; area_src?: string }[] = [], walls: (Box & { frame: string })[] = [], doors: (Box & { frame: string })[] = [];
  const houses: THREE.Object3D[] = []; model.traverse((o) => { if (o.userData?.ifcClass === 'IfcBuilding' && !houses.some((h) => isUnder(o, h))) houses.push(o); });
  const take = (root: THREE.Object3D, frame: THREE.Object3D | null, key: string) => root.traverse((o) => {
    const c = o.userData?.ifcClass;
    if ((c === 'IfcWall' || c === 'IfcDoor') && !(o.parent && o.parent.userData?.ifcClass === c)) { const b = boxIn(o, frame); if (!b.isEmpty()) (c === 'IfcWall' ? walls : doors).push({ ...box2(b), frame: key }); }
  });
  plan?.buildings.forEach((b, i) => {
    const h = houses[i]; if (!h) return;
    const key = `house ${i + 1}`; FRAMES.set(key, h); take(h, h, key);
    for (const r of b.levels[0]?.rooms ?? []) rooms.push({ name: r.name, box: { x0: r.u, x1: r.u + r.w, z0: r.v, z1: r.v + r.d }, box_src: 'scaled', y: 0, frame: key });
  });
  if (!rooms.length) {
    FRAMES.set('world', model.parent ?? model); take(model, null, 'world');
    model.traverse((o) => {
      if (o.userData?.ifcClass !== 'IfcSpace') return;
      const b = boxIn(o, null); if (b.isEmpty()) return;
      const u = o.userData as { name?: string; area?: number };
      rooms.push({ name: String(u.name ?? 'Space'), box: box2(b), box_src: 'from the file', y: b.min.y, frame: 'world', ...(Number.isFinite(u.area) ? { area_m2: u.area, area_src: 'from the file' } : {}) });
    });
  }
  return { rooms, walls, doors };
}
const isUnder = (o: THREE.Object3D, root: THREE.Object3D) => { for (let t: THREE.Object3D | null = o.parent; t; t = t.parent) if (t === root) return true; return false; };

/** the agent's proposal for this model, laid out by the rules and checked; throws if it does not pass its own checks */
export function proposeFor(model: THREE.Object3D, plan?: PlanRooms, opts: { choices?: Record<string, string>; finishes?: Record<string, string>; style?: unknown; project?: string } = {}) {
  const g = measureRooms(model, plan), frames = [...new Set(g.rooms.map((r) => r.frame))];
  let all: Proposal | null = null;
  for (const f of frames) {
    const walls = g.walls.filter((w) => w.frame === f), doors = g.doors.filter((d) => d.frame === f);
    const p = R.propose(g.rooms.filter((r) => r.frame === f), CATALOGUE, { walls, doors, catalogueVersion: `catalogue ${CATALOGUE.length} pieces`, ...opts }) as Proposal;
    const errs: string[] = R.validateProposal(p, CATALOGUE, { walls, doors });
    if (errs.length) throw new Error(`The proposal did not pass its checks: ${errs.slice(0, 3).join('; ')}`);
    for (const r of p.rooms as { frame?: string }[]) r.frame = f;
    if (!all) all = p; else all.rooms.push(...p.rooms);
  }
  if (!all) all = R.propose([], CATALOGUE, opts) as Proposal;
  return { proposal: all, ...g };
}

/** build one layout of one room in the model: one group, hidden until shown */
async function buildLayout(room: { name: string; y: number }, mode: string, L: { placements: { id: string; role: string; x: number; z: number; rot: number; on?: string; rule: string; h: number }[] }, finishes: Record<string, string>) {
  const g = new THREE.Group(); g.name = `proposal_${room.name}_${mode}`.replace(/\s+/g, '_');
  g.userData = { kind: 'context', name: `Proposed fit-out: ${room.name}, ${mode}`, source: 'proposed', note: 'Laid out by the interior agent from the library, by rules. A proposal for the client and architect to move; a person approves it.' };
  const parts: Part[] = [], byId = new Map<string, typeof L.placements>();
  for (const p of L.placements) byId.set(p.id, [...(byId.get(p.id) ?? []), p]);
  const hostH = (p: (typeof L.placements)[number]) => (p.on ? (L.placements.find((h) => h.role === p.on && !h.on && Math.hypot(h.x - p.x, h.z - p.z) < 1.2)?.h ?? 0) : 0);
  let order = 0;
  for (const [id, list] of byId) {
    const it = byIdCat(id); if (!it) continue;
    const tpl = await buildPiece(it, finishes[it.role] ?? '');
    if (!tpl) continue;
    tpl.traverse((m) => { if ((m as THREE.Mesh).isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    if (list.length > INSTANCE_FROM) {
      // many of one piece: one instanced mesh per part of the piece; each instance grows about its own base
      tpl.updateMatrixWorld(true);
      const at = list.map((p) => new THREE.Matrix4().compose(new THREE.Vector3(p.x, room.y + hostH(p), p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rot), new THREE.Vector3(1, 1, 1)));
      const meshes: { im: THREE.InstancedMesh; local: THREE.Matrix4 }[] = [];
      tpl.traverse((m) => {
        const mesh = m as THREE.Mesh; if (!mesh.isMesh) return;
        const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, list.length);
        im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.name = `${id}_${mesh.name}`;
        im.userData = { kind: 'context', name: `${it.title} × ${list.length} (proposed)`, source: 'proposed', libId: id, note: `Proposed by the interior agent: ${list[0].rule}. ${list.length} of them, drawn together; they move as a layout.` };
        meshes.push({ im, local: mesh.matrixWorld.clone() }); g.add(im);
      });
      const S = new THREE.Matrix4(), M = new THREE.Matrix4();
      list.forEach((_, i) => parts.push({ order: order++, set(s: number) { S.makeScale(s || 1e-4, s || 1e-4, s || 1e-4); for (const { im, local } of meshes) { M.copy(at[i]).multiply(S).multiply(local); im.setMatrixAt(i, M); im.instanceMatrix.needsUpdate = true; } } }));
    } else {
      for (const p of list) {
        const o = tpl.clone(true);
        o.position.set(p.x, room.y + hostH(p), p.z); o.rotation.y = p.rot;
        o.userData = { ...o.userData, kind: 'furniture', name: it.title, source: 'proposed', libId: id, note: `Proposed by the interior agent: ${p.rule}. Move it with Move; it stays proposed until a person approves.`, size: `${it.dims.w} × ${it.dims.d} × ${it.dims.h} mm` };
        g.add(o);
        parts.push({ order: order++, set(s: number) { o.visible = s > 0.001; o.scale.setScalar(Math.max(s, 1e-4)); } });
      }
    }
  }
  return { group: g, parts };
}
const byIdCat = (id: string) => byId(id);

/** put the proposal into the model: each room's chosen layout shown, a hall's other layouts built and hidden */
export async function placeProposal(app: Host, model: THREE.Object3D, proposal: Proposal, geo: { walls: Box[]; doors: Box[] }) {
  clearProposal();
  setTexDetail(0.5);
  const root = new THREE.Group(); root.name = 'interior_proposal';
  root.userData = { kind: 'context', name: 'Interior proposal', source: 'proposed', note: 'The interior agent’s proposal. Proposed: a person approves it.' };
  const groups = new Map<string, Map<string, Shown>>();
  // each frame's pieces go in a group of their own inside that house, so they turn and move with it
  FRAME_ROOTS.clear();
  for (const [k, f] of FRAMES) { if (k === 'world') continue; const g = new THREE.Group(); g.name = `interior_proposal_${k.replace(/\s+/g, '_')}`; g.userData = { ...root.userData }; f.add(g); FRAME_ROOTS.set(k, g); }
  for (const r of proposal.rooms as { name: string; y: number; layout: string; layouts: Record<string, never> }[]) {
    const m = new Map<string, Shown>();
    for (const [mode, L] of Object.entries(r.layouts)) {
      if (!(L as { placements: unknown[] }).placements.length) continue;
      const b = await buildLayout(r, mode, L, proposal.finishes as Record<string, string>);
      const on = mode === r.layout;
      b.group.visible = on; for (const p of b.parts) p.set(on ? 1 : 0);
      (FRAME_ROOTS.get((r as { frame?: string }).frame ?? '') ?? root).add(b.group); m.set(mode, { room: r.name, mode, group: b.group, parts: b.parts });
    }
    if (m.size) groups.set(r.name, m);
  }
  model.add(root);
  // the drawn fit-out of each room the proposal furnishes steps aside while the proposal is shown (its kitchen and bathroom stay)
  for (const r of proposal.rooms as { name: string; frame?: string; layouts: Record<string, { placements: unknown[] }> }[]) {
    if (!Object.values(r.layouts).some((L) => L.placements.length)) continue;
    const key = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), within = FRAMES.get(r.frame ?? '') ?? model;
    within.traverse((o) => { const m = /^fitout_[^_]+_(.+)$/.exec(o.name); if (m && m[1] === key && o.visible) { o.userData.hiddenByProposal = true; o.visible = false; } });
  }
  // the library's picks, placed earlier, give way too
  model.traverse((o) => { if (o.userData?.source === 'library' && o.userData?.kind === 'furniture' && o.visible && !isUnder(o, root)) { o.userData.hiddenByProposal = true; o.visible = false; } });
  STATE = { proposal, groups, root, ...geo };
  (window as unknown as { __interior?: unknown }).__interior = { layoutModes, setLayout, blendLayouts, currentLayout, proposal: () => STATE?.proposal, geometry: () => (STATE ? { walls: STATE.walls, doors: STATE.doors } : null) };
  void app;
  return root;
}
/** the proposal as it stands now (a hall's layout follows the switch), or null */
export const proposalNow = () => STATE?.proposal ?? null;
export function clearProposal() {
  if (!STATE) return;
  (STATE.root.parent ?? STATE.root).traverse((o) => { if (o.userData?.hiddenByProposal) { o.visible = true; delete o.userData.hiddenByProposal; } });
  STATE.root.removeFromParent();
  for (const g of FRAME_ROOTS.values()) g.removeFromParent();
  FRAME_ROOTS.clear(); STATE = null;
}
const halls = (room?: string) => (STATE ? [...STATE.groups].filter(([n, m]) => (room ? n === room : m.size > 1)) : []);

/** the layouts the halls in this model can switch between */
export function layoutModes(room?: string): string[] {
  const set = new Set<string>(); for (const [, m] of halls(room)) for (const k of m.keys()) set.add(k);
  return [...set];
}
export function currentLayout(room?: string): string | null {
  const h = halls(room)[0]; if (!h) return null;
  const r = (STATE!.proposal.rooms as { name: string; layout: string }[]).find((x) => x.name === h[0]);
  return r?.layout ?? null;
}
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/** how far one part of n has grown at progress t of its half: pieces follow one another (stagger) */
function grown(i: number, n: number, t: number, stagger = 0.6) { const s = n > 1 ? (i / (n - 1)) * stagger : 0; return ease((t - s) / (1 - stagger || 1)); }

/** the switch from one layout to another at t (0 to 1), drawn at once: the old sinks (first half), the new rises (second half) */
export function blendLayouts(from: string | null, to: string, t: number, room?: string) {
  for (const [name, m] of halls(room)) {
    const a = from ? m.get(from) : [...m.values()].find((x) => x.group.visible && x.mode !== to), b = m.get(to);
    if (!b) continue;
    const tt = Math.max(0, Math.min(1, t));
    if (a && a !== b) { const k = Math.min(1, tt * 2); a.group.visible = k < 1; a.parts.forEach((p, i) => p.set(1 - grown(i, a.parts.length, k))); }
    const k2 = a && a !== b ? Math.max(0, tt * 2 - 1) : tt;
    b.group.visible = true; b.parts.forEach((p, i) => p.set(grown(i, b.parts.length, k2)));
    if (tt >= 1) { const r = (STATE!.proposal.rooms as { name: string; layout: string; layout_by?: string }[]).find((x) => x.name === name); if (r && r.layout !== to) { r.layout = to; r.layout_by = 'set by a person'; window.dispatchEvent(new CustomEvent('interior-layout', { detail: { room: name, mode: to } })); } }
  }
}

/** switch the halls (or one room) to a layout; resolves when the switch has finished */
export function setLayout(mode: string, o: { transition?: 'cut' | 'grow'; ms?: number; room?: string } = {}): Promise<string> {
  const hs = halls(o.room);
  if (!hs.length) return Promise.reject(new Error(o.room ? `There is no ${o.room} with layouts in this model.` : 'This model has no hall with layouts.'));
  if (!hs.some(([, m]) => m.has(mode))) return Promise.reject(new Error(`"${mode}" is not a layout here: ${layoutModes(o.room).join(', ')}.`));
  const from = currentLayout(o.room);
  if (from === mode) return Promise.resolve(mode);
  if ((o.transition ?? 'grow') === 'cut') { blendLayouts(from, mode, 1, o.room); return Promise.resolve(mode); }
  const ms = Math.max(200, o.ms ?? 1600), t0 = performance.now();
  return new Promise((done) => {
    const step = () => { const t = (performance.now() - t0) / ms; blendLayouts(from, mode, t, o.room); if (t < 1) requestAnimationFrame(step); else done(mode); };
    requestAnimationFrame(step);
  });
}

/** the model's judgement through /api/agent-judge (mode interior): only the allowed choices are taken from it */
export async function askJudgement(proposal: Proposal, brief: string, fetcher: typeof fetch = fetch) {
  const r = await fetcher('/api/agent-judge', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'interior', input: R.judgeInput(proposal, brief, CATALOGUE) }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error === 'not_configured' ? 'No model is set up for judgement on this site.' : `The judgement could not be had (${j?.error ?? r.status}).`);
  return { ...R.applyJudgement(proposal, j.answer, CATALOGUE), provider: j.provider as string, model: j.model as string, prompts: j.prompts as string };
}
export const totals = (p: Proposal) => R.totals(p) as { rooms: number; placed: number; left: number };
export const RULES_VERSION: string = R.RULES_VERSION;
