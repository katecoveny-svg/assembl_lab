import * as THREE from 'three/webgpu';
// @ts-expect-error plain script shared with the ops page (architecture/js/agents/look-rules.js), no types
import * as L from './look-rules.js';
import { captureView } from '../photoUI';

// The 3D look expert on the 3D page: the automatic reviewer of the browser twin's look, run before a person's look gate.
// It draws the standard views (three-quarter, entry, aerial), measures the scene (nothing floating or buried, glass and frames,
// shadows, the planting's clear band, grey default materials, frame time at the phone tier) and scores them with look-rules.js.
// A critique by a model is optional (/api/agent-judge, mode look), with the architect's own render when a person gives one.
// It never approves: the report is always "for a person". It moves the camera only while it draws the views, then puts it back.

type Host = {
  scene: THREE.Scene; camera: THREE.PerspectiveCamera; canvas: HTMLCanvasElement; modelRoot: THREE.Object3D; plain: THREE.Object3D;
  controls: { target: THREE.Vector3; update(): void }; renderer: THREE.WebGPURenderer; pipeline: THREE.RenderPipeline | null;
  onFrame: ((dt: number) => void)[];
};
type Box = { x0: number; x1: number; z0: number; z1: number };
const box2 = (b: THREE.Box3): Box => ({ x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z });
const label = (o: THREE.Object3D) => String(o.userData?.name || o.name || o.type).slice(0, 60);
const isGlass = (m: THREE.Material | THREE.Material[]) => (Array.isArray(m) ? m : [m]).some((x) => { const p = x as THREE.MeshPhysicalMaterial; return (p.transparent && p.opacity < 0.9) || (p.transmission ?? 0) > 0 || /glass|glaz/i.test(x.name); });
const visibleUp = (o: THREE.Object3D) => { for (let t: THREE.Object3D | null = o; t; t = t.parent) if (!t.visible) return false; return true; };

/** the building's walls, in plan boxes: what the planting band is measured from */
function wallBoxes(root: THREE.Object3D) { const w: Box[] = []; root.traverse((o) => { if (o.userData?.ifcClass === 'IfcWall' && visibleUp(o)) w.push(box2(new THREE.Box3().setFromObject(o))); }); return w; }
const distTo = (x: number, z: number, b: Box) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1));

/** the top object of each loose thing: a piece of furniture, a plant (not the meshes inside them) */
function loose(root: THREE.Object3D, kind: string) {
  const out: THREE.Object3D[] = [];
  root.traverse((o) => { if (o.userData?.kind === kind && !(o.parent && o.parent.userData?.kind === kind) && visibleUp(o)) out.push(o); });
  return out;
}

/** measure the scene for scoreLook() */
export function measureScene(app: Host) {
  const roots = [app.modelRoot, app.plain].filter((o) => o.visible);
  const solids: THREE.Mesh[] = [], supports: THREE.Object3D[] = [];
  for (const r of roots) r.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !visibleUp(m) || isGlass(m.material)) return;
    solids.push(m);
    const k = (() => { for (let t: THREE.Object3D | null = m; t; t = t.parent) if (t.userData?.kind) return String(t.userData.kind); return ''; })();
    if (!(m as unknown as THREE.InstancedMesh).isInstancedMesh && k !== 'furniture' && k !== 'planting') supports.push(m);
  });
  // resting: drop a ray from just above each loose thing's base to what is under it
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), floating: string[] = [], buried: string[] = [];
  const rest = (name: string, x: number, y: number, z: number, buryAt: number, self?: THREE.Object3D) => {
    ray.set(new THREE.Vector3(x, y + 0.6, z), down); ray.far = 40;
    const hit = ray.intersectObjects(supports, false).find((h) => !self || !isUnder(h.object, self));
    if (!hit) return;
    const gap = y - hit.point.y;
    if (gap > L.LIMITS.rest.m) floating.push(name); else if (gap < -buryAt) buried.push(name);
  };
  const things = [...roots.flatMap((r) => loose(r, 'furniture')).map((o) => ({ o, bury: L.LIMITS.rest.m })), ...roots.flatMap((r) => loose(r, 'planting')).map((o) => ({ o, bury: 0.35 }))];
  let n = 0;
  for (const { o, bury } of things) {
    if ((o as THREE.InstancedMesh).isInstancedMesh) continue;
    if (o.userData?.kind === 'furniture' && o.userData?.on) continue;
    const b = new THREE.Box3().setFromObject(o); if (b.isEmpty() || ++n > 400) continue;
    const c = b.getCenter(new THREE.Vector3());
    // a hanging piece (a pendant) is held from above: not measured here
    if (/pendant/i.test(String(o.userData?.name ?? ''))) continue;
    rest(label(o), c.x, b.min.y, c.z, bury, o);
  }
  // glass and frames
  const els: THREE.Object3D[] = [];
  for (const r of roots) r.traverse((o) => { const c = o.userData?.ifcClass; if ((c === 'IfcWindow' || (c === 'IfcDoor' && /glaz|glass/i.test(String(o.userData?.material ?? '')))) && visibleUp(o) && !(o.parent?.userData?.ifcClass === c)) els.push(o); });
  const drawnFrames = new Set<string>(); for (const r of roots) r.traverse((o) => { const m = /^Frame \(drawn\) for (.+)$/.exec(String(o.userData?.name ?? '')); if (m) drawnFrames.add(m[1]); });
  const glassless: string[] = [], frameless: string[] = [];
  for (const e of els) {
    let glass = false, opaque = false;
    e.traverse((m) => { const mesh = m as THREE.Mesh; if (!mesh.isMesh) return; if (isGlass(mesh.material)) glass = true; else opaque = true; });
    if (!glass) glassless.push(label(e));
    if (!opaque && !drawnFrames.has(String(e.userData?.name ?? ''))) frameless.push(label(e));
  }
  // shadows
  let shadowLights = 0; app.scene.traverse((o) => { const l = o as THREE.DirectionalLight; if (l.isLight && l.castShadow && l.visible && l.intensity > 0) shadowLights++; });
  const casters = solids.filter((m) => m.castShadow).length;
  // planting band
  const walls = wallBoxes(app.modelRoot), plants: { name: string; x: number; z: number }[] = [];
  for (const r of roots) for (const o of loose(r, 'planting')) {
    if (o.userData?.source === 'survey') continue;
    const im = o as THREE.InstancedMesh;
    if (im.isInstancedMesh) { const M = new THREE.Matrix4(), p = new THREE.Vector3(); for (let i = 0; i < Math.min(im.count, 300); i++) { im.getMatrixAt(i, M); p.setFromMatrixPosition(M).applyMatrix4(im.matrixWorld); plants.push({ name: label(o), x: p.x, z: p.z }); } }
    else { const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()); plants.push({ name: label(o), x: c.x, z: c.z }); }
  }
  const inBand = walls.length ? [...new Set(plants.filter((p) => Math.min(...walls.map((w) => distTo(p.x, p.z, w))) < L.LIMITS.band.m - 0.1).map((p) => p.name))] : [];
  // grey defaults: a plain material still on three.js's own default (white, untextured, unnamed) or named as a default
  const greyDefaults = [...new Set(solids.filter((m) => (Array.isArray(m.material) ? m.material : [m.material]).some((x) => {
    const s = x as THREE.MeshStandardMaterial; if (s.map || !s.color) return false;
    const c = s.color, neutral = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) < 0.02;
    return neutral && (/^default|^$/i.test(x.name) && (c.getHex() === 0xffffff || /default/i.test(x.name)));
  }) && !/contact|shade|helper|grid/i.test(m.name)).map(label))];
  return { floating, buried, windows: els.length, glassless, frameless, shadowMap: !!app.renderer.shadowMap?.enabled, shadowLights, casters, solids: solids.length, plants: plants.length, inBand, greyDefaults };
}
const isUnder = (o: THREE.Object3D, root: THREE.Object3D) => { for (let t: THREE.Object3D | null = o; t; t = t.parent) if (t === root) return true; return false; };

/** where the camera stands for each standard view, from the building's bounds; the entry view looks at the front door */
export function standardViews(app: Host) {
  const b = new THREE.Box3(); app.modelRoot.traverse((o) => { if (o.userData?.ifcClass === 'IfcWall' && visibleUp(o)) b.expandByObject(o); });
  if (b.isEmpty()) b.setFromObject(app.modelRoot);
  const c = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3()), r = Math.max(4, Math.hypot(size.x, size.z) / 2);
  const at = (az: number, el: number, k: number) => { const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el), d = r * k; return { eye: new THREE.Vector3(c.x + Math.sin(a) * Math.cos(e) * d, c.y + Math.sin(e) * d, c.z + Math.cos(a) * Math.cos(e) * d), look: c.clone() }; };
  // the entry: the outside door nearest the building's edge, seen from 6 m out at eye height
  let door: THREE.Object3D | null = null, best = -Infinity;
  app.modelRoot.traverse((o) => {
    if (o.userData?.ifcClass !== 'IfcDoor' || !visibleUp(o)) return;
    const p = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
    const edge = Math.min(Math.abs(p.x - b.min.x), Math.abs(b.max.x - p.x), Math.abs(p.z - b.min.z), Math.abs(b.max.z - p.z));
    const score = -edge + (/feature|entry|front/i.test(String(o.userData?.material ?? '') + String(o.userData?.name ?? '')) ? 5 : 0);
    if (score > best) { best = score; door = o; }
  });
  let entry = at(200, 8, 1.6);
  if (door) {
    const p = new THREE.Box3().setFromObject(door).getCenter(new THREE.Vector3()), out = new THREE.Vector3(p.x - c.x, 0, p.z - c.z);
    // straight out of the wall the door is in
    out.set(Math.abs(out.x) / size.x > Math.abs(out.z) / size.z ? Math.sign(out.x) : 0, 0, Math.abs(out.x) / size.x > Math.abs(out.z) / size.z ? 0 : Math.sign(out.z));
    entry = { eye: new THREE.Vector3(p.x + out.x * 6 + out.z * 1.5, b.min.y + 1.6, p.z + out.z * 6 + out.x * 1.5), look: new THREE.Vector3(p.x, b.min.y + 1.4, p.z) };
  }
  return { 'three-quarter': at(215, 20, 2.4), entry, aerial: at(200, 62, 2.6) } as Record<string, { eye: THREE.Vector3; look: THREE.Vector3 }>;
}

/** draw the standard views, each as a small JPEG; the camera is put back where it was */
export async function drawViews(app: Host) {
  const was = { eye: app.camera.position.clone(), look: app.controls.target.clone() }, out: Record<string, { ok: boolean; url: string }> = {};
  try {
    for (const [name, v] of Object.entries(standardViews(app))) {
      app.camera.position.copy(v.eye); app.controls.target.copy(v.look); app.controls.update(); app.camera.updateMatrixWorld();
      await new Promise((r) => setTimeout(r, 60));
      try {
        const shot = captureView(app as never), img = new Image();
        await new Promise((r) => { img.onload = r; img.onerror = r; img.src = shot.url; });
        const k = Math.min(1, 640 / (img.width || 640)), cv = document.createElement('canvas');
        cv.width = Math.round((img.width || 640) * k); cv.height = Math.round((img.height || 400) * k);
        cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
        out[name] = { ok: true, url: cv.toDataURL('image/jpeg', 0.82) };
      } catch { out[name] = { ok: false, url: '' }; }
    }
  } finally { app.camera.position.copy(was.eye); app.controls.target.copy(was.look); app.controls.update(); }
  return out;
}

/** frame time: the median gap between the page's own frames over about a second, scaled by pixel count to the phone tier
 *  (390 × 844 at a pixel ratio of 1.75). An estimate from this browser, not a phone */
export async function frameTime(app: Host, frames = 30) {
  const gaps: number[] = []; let last = 0;
  await new Promise<void>((done) => { const f = (t: number) => { if (last) gaps.push(t - last); last = t; if (gaps.length >= frames) done(); else requestAnimationFrame(f); }; requestAnimationFrame(f); setTimeout(done, 8000); });
  if (!gaps.length) return null;
  gaps.sort((a, b) => a - b);
  const med = gaps[Math.floor(gaps.length / 2)], px = app.canvas.width * app.canvas.height, phone = 390 * 844 * 1.75 * 1.75;
  return { median: med * Math.max(0.25, Math.min(4, phone / Math.max(1, px))), tier: 'phone', where: `estimated in this browser from ${Math.round(med)} ms frames at ${app.canvas.width} × ${app.canvas.height}, scaled to a phone’s pixels; not measured on a phone` };
}

/** run the look check: views, measures, score; the critique only when asked (it is a paid request) */
export async function runLookCheck(app: Host, o: { critique?: boolean; render?: string | null; fetcher?: typeof fetch } = {}) {
  const views = await drawViews(app), m = measureScene(app), ft = await frameTime(app);
  let critique = null;
  if (o.critique) {
    const shots = L.VIEWS.map((v: string) => views[v]).filter((v: { ok: boolean }) => v?.ok).map((v: { url: string }) => v.url);
    const r = await (o.fetcher ?? fetch)('/api/agent-judge', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'look', images: shots, views: L.VIEWS, ...(o.render ? { render: o.render } : {}) }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error === 'not_configured' ? 'No model is set up for the critique on this site.' : `The critique could not be had (${j?.error ?? r.status}).`);
    critique = { ...j.answer, provider: j.provider, model: j.model, prompts: j.prompts };
  }
  const report = L.scoreLook({ ...m, frameMs: ft, views: Object.fromEntries(Object.entries(views).map(([k, v]) => [k, { ok: v.ok }])) }, critique);
  const errs: string[] = L.validateReport(report);
  if (errs.length) throw new Error(`The look report did not pass its checks: ${errs.join('; ')}`);
  return { report, views };
}
export const VIEWS: string[] = L.VIEWS;
