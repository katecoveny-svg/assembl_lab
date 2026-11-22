import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { twinMats } from './mats';
import { pbr, wood, concrete, paint } from '../objects/tex';
import type { Quality } from '../objects/util';
import { along, bbox, clipToSide, dormerAt, inside, isFreeform, lineLength, offset, pieces, roofAt, ridgeSide, seatCount, type FreeBuilding, type FreeLevel, type FreeOpening, type FreeRoof, type FreeWall, type Pt, type Seat } from './freeformGeom';

// Free-form buildings (freeformGeom.ts) as meshes: walls at any angle with their openings cut, glazed walls with
// mullions, doors standing open on their swing, slabs and a mezzanine with its barrier, stairs (straight and spiral),
// a gable roof over any footprint with its rafters and skylights, and furniture layouts as switchable groups.
// Every mesh carries element data (IFC class, name, material, source, note) for the inspector, glTF extras and IFC.
// Model frame: x = u, z = v, y up from the building's floor level; the caller places the group at its origin.

export { isFreeform };
type Mats = ReturnType<typeof freeMats>;
const cache = new Map<string, ReturnType<typeof makeMats>>();

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, tileU: number, tileV: number, srgb = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / tileU, 1 / tileV);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
/** clay brick in stretcher bond: brick to brick colour, recessed mortar (normal map from the courses) */
function brickMats() {
  const W = 512, H = 512, bw = 0.23, bh = 0.076, mortar = 0.01, tile = 1.2, px = W / tile;
  const rnd = (i: number) => { const v = Math.sin(i * 91.7 + 13.1) * 43758.5; return v - Math.floor(v); };
  const rows = Math.round(tile / bh), cols = Math.round(tile / bw);
  const map = canvasTex(W, H, (c) => {
    c.fillStyle = '#b9aea0'; c.fillRect(0, 0, W, H);
    for (let r = 0; r < rows; r++) for (let k = -1; k <= cols; k++) {
      const i = r * 97 + k, x = (k + (r % 2) * 0.5) * (W / cols), y = r * (H / rows);
      const v = rnd(i), red = 150 + v * 45, g = 72 + v * 26 + rnd(i + 3) * 10, b = 52 + v * 18;
      c.fillStyle = `rgb(${red | 0},${g | 0},${b | 0})`;
      c.fillRect(x + mortar * px / 2, y + mortar * px / 2, W / cols - mortar * px, H / rows - mortar * px);
      for (let s = 0; s < 14; s++) { c.fillStyle = `rgba(${rnd(i + s) > 0.5 ? '60,30,20' : '230,180,150'},${0.05 + rnd(i * 3 + s) * 0.08})`; c.fillRect(x + rnd(i + s * 7) * W / cols, y + rnd(i + s * 5) * H / rows, 3 + rnd(s) * 6, 2 + rnd(s + 1) * 3); }
    }
  }, tile, tile);
  const nrm = canvasTex(W, H, (c) => {
    c.fillStyle = 'rgb(128,128,255)'; c.fillRect(0, 0, W, H);
    for (let r = 0; r < rows; r++) {
      const y = r * (H / rows);
      c.fillStyle = 'rgb(128,90,230)'; c.fillRect(0, y, W, 2); c.fillStyle = 'rgb(128,166,230)'; c.fillRect(0, y + mortar * px - 2, W, 2);
      for (let k = -1; k <= cols; k++) { const x = (k + (r % 2) * 0.5) * (W / cols); c.fillStyle = 'rgb(90,128,230)'; c.fillRect(x, y, 2, H / rows); c.fillStyle = 'rgb(166,128,230)'; c.fillRect(x + mortar * px - 2, y, 2, H / rows); }
    }
  }, tile, tile, false);
  return new THREE.MeshPhysicalMaterial({ name: 'clay_brick_stretcher_bond', map, normalMap: nrm, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.86, metalness: 0 });
}
/** a glazed panel with an indicative printed pattern (a lattice and a curve): stands in for the artist's design */
function patternedMat() {
  const map = canvasTex(256, 512, (c) => {
    c.fillStyle = 'rgba(220,232,236,0.0)'; c.clearRect(0, 0, 256, 512);
    c.strokeStyle = 'rgba(245,248,250,0.45)'; c.lineWidth = 1.2;
    for (let y = -256; y < 512; y += 22) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y + 128); c.stroke(); c.beginPath(); c.moveTo(256, y); c.lineTo(0, y + 128); c.stroke(); }
    c.strokeStyle = 'rgba(245,248,250,0.7)'; c.lineWidth = 5; c.beginPath(); for (let t = 0; t <= 1; t += 0.01) { const a = t * Math.PI * 3.2, r = 30 + 70 * (1 - t); const x = 128 + Math.cos(a) * r, y = 300 + Math.sin(a) * r - t * 160; if (t === 0) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke();
  }, 1.5, 3.0);
  return new THREE.MeshPhysicalMaterial({ name: 'printed_panel_pattern', map, transparent: true, alphaTest: 0.05, color: 0xffffff, roughness: 0.35, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
}
function makeMats(q: Quality) {
  const M = twinMats(q), d = q === 'hq' ? 1024 : 512;
  const cedar = pbr(wood(d, { light: 0xb07a5a, dark: 0x6e4632, tile: 1.8, rings: 30, straight: 1, figure: 0.3, name: 'cedar_vertical_cladding' }), 'cedar_vertical_cladding', {});
  const ceiling = pbr(wood(d, { light: 0x9a6a46, dark: 0x5a3a26, tile: 1.2, rings: 24, straight: 1, name: 'timber_ceiling_boards' }), 'timber_ceiling_boards', {});
  const beam = pbr(wood(d, { light: 0x5c3d2a, dark: 0x2e1d14, tile: 2.4, rings: 16, straight: 1, name: 'dark_glulam_rafter' }), 'dark_glulam_rafter', {});
  const floorT = pbr(wood(d, { light: 0x8a5a3a, dark: 0x4f3020, tile: 1.6, rings: 22, straight: 1, gloss: 0.5, name: 'timber_floor' }), 'timber_floor', {});
  const polished = pbr(concrete(d, { colour: 0xb4b0a8, tile: 2.0, pores: 0.4, mottle: 0.5, rough: 0.35, name: 'polished_concrete' }), 'polished_concrete', { clearcoat: 0.4, clearcoatRoughness: 0.3 });
  const slab = pbr(concrete(d, { colour: 0x9a968e, tile: 2.0, name: 'concrete_slab_edge' }), 'concrete_slab_edge', {});
  const white = pbr(paint(d, { colour: 0xf3f0ea, gloss: 0.2, tile: 1.5, name: 'white_wall_paint' }), 'white_wall_paint', {});
  const roofM = new THREE.MeshPhysicalMaterial({ name: 'dark_standing_seam_roof', color: 0x3a3532, roughness: 0.42, metalness: 0.55, clearcoat: 0.2 });
  const fascia = new THREE.MeshPhysicalMaterial({ name: 'bronze_fascia', color: 0x4a3a2e, roughness: 0.4, metalness: 0.6 });
  const frame = new THREE.MeshPhysicalMaterial({ name: 'bronze_aluminium_frame', color: 0x3b332c, roughness: 0.38, metalness: 0.7 });
  const roofLight = new THREE.MeshPhysicalMaterial({ name: 'existing_roof_light_grey', color: 0xb9b6b0, roughness: 0.6, metalness: 0.3 });
  const tile = M.tile, vinyl = new THREE.MeshPhysicalMaterial({ name: 'sheet_vinyl_grey', color: 0x8d8f8c, roughness: 0.55 });
  const balusterWhite = new THREE.MeshPhysicalMaterial({ name: 'white_painted_balusters', color: 0xf4f1ec, roughness: 0.5 });
  const fabric = new THREE.MeshPhysicalMaterial({ name: 'charcoal_upholstery', color: 0x2e2f33, roughness: 0.92, sheen: 0.6, sheenColor: new THREE.Color(0x55565c) });
  const cloth = new THREE.MeshPhysicalMaterial({ name: 'table_linen_deep_blue', color: 0x1f3a66, roughness: 0.9, sheen: 0.5, sheenColor: new THREE.Color(0x4a6aa0) });
  return { M, cedar, ceiling, beam, floorT, polished, slab, white, roofM, fascia, frame, roofLight, tile, vinyl, balusterWhite, fabric, cloth, glass: M.glass, brick: brickMats(), pattern: patternedMat(), lift: M.joinery, door: M.door };
}
function freeMats(q: Quality) { let m = cache.get(q); if (!m) { m = makeMats(q); cache.set(q, m); } return m; }

const tagged = <T extends THREE.Object3D>(o: T, ifcClass: string, data: Record<string, unknown>) => { o.userData = { ...o.userData, kind: 'element', ifcClass, ...data }; return o; };
function mesh(name: string, g: THREE.BufferGeometry, m: THREE.Material, shadow = true) { const o = new THREE.Mesh(g, m); o.name = name; o.castShadow = shadow; o.receiveShadow = true; return o; }
/** merge pieces made different ways: every piece gets the same attributes (position, normal, uv) first */
const merged = (gs: THREE.BufferGeometry[]) => {
  if (!gs.length) return new THREE.BufferGeometry();
  const norm = gs.map((g0) => {
    const g = g0.index ? g0.toNonIndexed() : g0;
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    if (!g.getAttribute('uv')) { const p = g.getAttribute('position'), uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) + p.getZ(i); uv[i * 2 + 1] = p.getY(i); } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
    g.morphAttributes = {};
    return g;
  });
  return mergeGeometries(norm) ?? new THREE.BufferGeometry();
};

/** a flat polygon in plan as a mesh at height y (u, v → x, z), facing up or down */
function planShape(poly: Pt[], holes: Pt[][] = []) {
  const s = new THREE.Shape(poly.map(([u, v]) => new THREE.Vector2(u, -v)));
  for (const h of holes) s.holes.push(new THREE.Path(h.map(([u, v]) => new THREE.Vector2(u, -v))));
  return s;
}
function flat(poly: Pt[], y: number, up = true, holes: Pt[][] = []) {
  const g = new THREE.ShapeGeometry(planShape(poly, holes)); g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
  const uv = g.getAttribute('uv'), p = g.getAttribute('position');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i), p.getZ(i));
  if (!up) {
    // facing down: reverse the winding (a mirror across the plane the triangles lie in would change nothing)
    const ix = g.getIndex();
    if (ix) { const arr = ix.array as Uint16Array | Uint32Array; for (let i = 0; i < arr.length; i += 3) { const t0 = arr[i]; arr[i] = arr[i + 1]; arr[i + 1] = t0; } ix.needsUpdate = true; }
    g.computeVertexNormals();
  }
  return g;
}
function slab(poly: Pt[], top: number, th: number, holes: Pt[][] = []) {
  const g = new THREE.ExtrudeGeometry(planShape(poly, holes), { depth: th, bevelEnabled: false, curveSegments: 4 });
  g.rotateX(-Math.PI / 2); g.translate(0, top - th, 0);
  return g;
}

/** one straight piece of wall with its openings cut: a shape in (s, y) extruded through the thickness, set on its line */
function wallPiece(a: Pt, b: Pt, L: number, t: number, top: (s: number) => number, ridgeS: number[], ops: (FreeOpening & { a: number; b: number })[], y0 = 0) {
  const ss = [0, ...ridgeS.filter((s) => s > 0.01 && s < L - 0.01), L].sort((p, q) => p - q);
  const outline = [new THREE.Vector2(0, y0), new THREE.Vector2(L, y0), ...ss.slice().reverse().map((s) => new THREE.Vector2(s, Math.max(y0 + 0.3, top(s))))];
  const shape = new THREE.Shape(outline);
  for (const o of ops) {
    const lo = Math.max(0.02, o.a), hi = Math.min(L - 0.02, o.b); if (hi - lo < 0.1) continue;
    const roofHere = Math.min(top(lo), top(hi)) - 0.05, head = Math.min(o.head, roofHere), sill = Math.max(y0 + (o.sill <= 0.01 ? -0.01 : o.sill), y0 - 0.01);
    if (head - sill < 0.2) continue;
    const p = new THREE.Path();
    if (o.arch && head - sill > (hi - lo)) {
      const w = hi - lo, spring = head - (o.arch === 'pointed' ? w * 0.87 : w / 2);
      p.moveTo(lo, sill); p.lineTo(hi, sill); p.lineTo(hi, spring);
      if (o.arch === 'pointed') { p.quadraticCurveTo(hi, spring + w * 0.55, lo + w / 2, head); p.quadraticCurveTo(lo, spring + w * 0.55, lo, spring); }
      else p.absarc(lo + w / 2, spring, w / 2, 0, Math.PI, false);
      p.lineTo(lo, sill);
    } else { p.moveTo(lo, sill); p.lineTo(hi, sill); p.lineTo(hi, head); p.lineTo(lo, head); p.lineTo(lo, sill); }
    shape.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -t / 2);
  const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
  const m = new THREE.Matrix4().set(dx, 0, -dz, a[0], 0, 1, 0, 0, dz, 0, dx, a[1], 0, 0, 0, 1);
  g.applyMatrix4(m);
  /** the same face as a thin lining on one side (+1: the side to the left of the line, −1: the right), for a painted inside face */
  const lining = (side: 1 | -1) => { const f = new THREE.ShapeGeometry(shape, 8); f.translate(0, 0, side * (t / 2 + 0.006)); if (side < 0) { f.scale(1, 1, 1); f.rotateY(0); } const mm = m.clone(); f.applyMatrix4(mm); if (side < 0) { const ix = f.getIndex(); if (ix) { const arr = ix.array as Uint16Array; for (let i = 0; i < arr.length; i += 3) { const t0 = arr[i]; arr[i] = arr[i + 1]; arr[i + 1] = t0; } ix.needsUpdate = true; } } f.computeVertexNormals(); return f; };
  return Object.assign(g, { lining });
}
/** a box from plan point a to b (centreline), y from y0 to y1, width w across */
function bar(a: Pt, b: Pt, y0: number, y1: number, w: number) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 0.001, g = new THREE.BoxGeometry(L, y1 - y0, w);
  g.rotateY(-Math.atan2(b[1] - a[1], b[0] - a[0])); g.translate((a[0] + b[0]) / 2, (y0 + y1) / 2, (a[1] + b[1]) / 2);
  return g;
}
/** a raking bar between two 3D points (rafters, handrails) */
function bar3(p: THREE.Vector3, q: THREE.Vector3, w: number, h: number) {
  const L = p.distanceTo(q), g = new THREE.BoxGeometry(L, h, w), mid = p.clone().add(q).multiplyScalar(0.5);
  const dir = q.clone().sub(p).normalize(), quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
  g.applyQuaternion(quat); g.translate(mid.x, mid.y, mid.z);
  return g;
}

export interface FreeBuilt { group: THREE.Group; layouts: Record<string, THREE.Group>; seats: Record<string, number> }

/** `ground` (optional): the ground's height under a plan point, relative to the building's floor level */
export function buildFreeform(b: FreeBuilding, q: Quality, ground?: (u: number, v: number) => number): FreeBuilt {
  const X = freeMats(q), existing = b.kind === 'existing';
  const root = new THREE.Group(); root.name = `building_${b.id}`;
  tagged(root, 'IfcBuilding', { name: b.name, source: existing ? 'survey' : 'written', note: b.note ?? '' });
  const rAt = roofAt(b.roof), rTh = b.roof.thickness ?? 0.35;
  const roofUnder = (u: number, v: number) => rAt(u, v);
  const ridgeCross = (a: Pt, bb: Pt, L: number) => {
    // distance along a straight piece where it crosses the ridge line (the roof's fold), if it does
    const s0 = ridgeSide(b.roof, a), s1 = ridgeSide(b.roof, bb); if (s0 === s1) return [] as number[];
    let lo = 0, hi = L; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2, p: Pt = [a[0] + ((bb[0] - a[0]) * m) / L, a[1] + ((bb[1] - a[1]) * m) / L]; if (ridgeSide(b.roof, p) === s0) lo = m; else hi = m; }
    return [(lo + hi) / 2];
  };
  const layouts: Record<string, THREE.Group> = {}, seats: Record<string, number> = {};
  for (const L of b.levels) {
    const lg = new THREE.Group(); lg.name = `level_${L.id}`; root.add(lg);
    tagged(lg, 'IfcBuildingStorey', { name: L.name, elevation: L.floor, source: L.floor ? 'assumed' : 'written' });
    // floors
    const slabs = L.slab?.length ? L.slab : L.floor === 0 ? [b.footprint] : [];
    for (const [i, s] of slabs.entries()) {
      const holes = (L.voids ?? []).filter((h) => h.every((p) => inside(p, s)));
      // the ground floor stands on a base that reaches down to the ground where the site falls away (earthworks are not drawn)
      let th = L.slabThickness ?? (L.floor === 0 ? 0.2 : 0.3), base = false;
      if (L.floor === 0 && ground) { let lo = 0; const bb = bbox(s); for (let u = bb.u0; u <= bb.u1; u += 1) for (let v = bb.v0; v <= bb.v1; v += 1) if (inside([u, v], s)) { const g = ground(u, v); if (g === g) lo = Math.min(lo, g); } if (-lo + 0.1 > th) { th = -lo + 0.1; base = true; } }
      const m = mesh(`slab_${L.id}_${i}`, slab(s, L.floor, th, holes), L.floor === 0 ? X.slab : X.white);
      if (base) m.userData.baseNote = `the floor slab is shown on a concrete base ${th.toFixed(1)} m deep at most, down to today's ground where the site falls away: assumed, as the set has no levels or earthworks`;
      tagged(m, 'IfcSlab', { name: `${L.name} floor`, predefinedType: 'FLOOR', material: L.floor === 0 ? 'concrete slab on grade' : 'concrete slab, painted soffit', source: L.floor === 0 ? 'scaled' : 'scaled', note: (base ? m.userData.baseNote + '. ' : '') + (L.floor === 0 ? 'outline from the plan' : `outline from the plan; floor height ${L.floor} m assumed`) });
      lg.add(m);
    }
    // room floors: a finish per room, named for the inspector
    for (const r of L.rooms ?? []) {
      if (r.poly.length < 3) continue;
      const n = r.name.toLowerCase(), fin = r.finish ?? (/wc|toilet|bath|shower/.test(n) ? 'tile' : /kitchen|store|plant/.test(n) ? 'vinyl' : /foyer|entrance|entry|circulation|stair|lift/.test(n) ? 'polished' : existing ? 'polished' : 'timber');
      const mat = fin === 'tile' ? X.tile : fin === 'vinyl' ? X.vinyl : fin === 'polished' ? X.polished : X.floorT;
      const m = mesh(`room_${r.id}`, flat(r.poly, L.floor + 0.004), mat, false);
      const bb = bbox(r.poly); let a = 0; for (let i = 0; i < r.poly.length; i++) { const p = r.poly[i], p2 = r.poly[(i + 1) % r.poly.length]; a += p[0] * p2[1] - p2[0] * p[1]; }
      tagged(m, 'IfcSpace', { name: r.name, kind: 'room', area: +(Math.abs(a) / 2).toFixed(1), size: `${bb.w.toFixed(2)} × ${bb.d.toFixed(2)} m`, nameSource: r.nameSrc ?? 'printed', source: r.source ?? 'scaled', material: fin === 'tile' ? 'porcelain tile (proposed)' : fin === 'vinyl' ? 'sheet vinyl (proposed)' : fin === 'polished' ? 'polished concrete (proposed)' : 'timber floor (proposed)' });
      lg.add(m);
    }
    // walls
    for (const w of L.walls) addWall(lg, w, L, b, X, roofUnder, rTh, ridgeCross);
    // stairs
    for (const st of L.stairs ?? []) lg.add(stair(st, X));
    // furniture layouts
    for (const [name, lay] of Object.entries(L.layouts ?? {})) {
      const g = seating(lay.seats, L.floor, X); g.name = `layout_${name}`; g.visible = name === (L.layout ?? Object.keys(L.layouts!)[0]);
      tagged(g, 'IfcFurnishingElement', { name: `Seating: ${name}`, seats: seatCount(lay.seats), source: 'scaled', note: lay.note ?? 'positions from the plan; furniture shapes proposed' });
      layouts[name] = g; seats[name] = seatCount(lay.seats); lg.add(g);
    }
  }
  root.add(roof(b, X, existing));
  return { group: root, layouts, seats };
}

function addWall(lg: THREE.Group, w: FreeWall, L: FreeLevel, b: FreeBuilding, X: Mats, roofUnder: (u: number, v: number) => number, rTh: number, ridgeCross: (a: Pt, b: Pt, L: number) => number[]) {
  const g = new THREE.Group(); g.name = `wall_${w.id}`; lg.add(g);
  const kind = w.kind ?? 'wall', y0 = L.floor;
  const topAt = (p: Pt) => (w.height === 'roof' || w.height == null ? roofUnder(p[0], p[1]) - (kind === 'glass' ? 0.02 : 0) : Math.min(y0 + w.height, roofUnder(p[0], p[1]) - 0.02));
  const existing = b.kind === 'existing';
  if (kind === 'balustrade') {
    const H = typeof w.height === 'number' ? w.height : 1.0, gs: THREE.BufferGeometry[] = [];
    for (const pc of pieces(w)) {
      const n = Math.max(1, Math.round(pc.L / 0.12));
      for (let k = 0; k <= n; k++) { const t = k / n, p: Pt = [pc.a[0] + (pc.b[0] - pc.a[0]) * t, pc.a[1] + (pc.b[1] - pc.a[1]) * t]; gs.push(new THREE.BoxGeometry(0.045, H - 0.06, 0.045).translate(p[0], y0 + (H - 0.06) / 2, p[1])); }
      gs.push(bar(pc.a, pc.b, y0 + H - 0.06, y0 + H, 0.09), bar(pc.a, pc.b, y0 + 0.02, y0 + 0.08, 0.06));
    }
    const m = mesh(`balustrade_${w.id}`, merged(gs), X.balusterWhite);
    tagged(m, 'IfcRailing', { name: w.name ?? 'Barrier', predefinedType: 'BALUSTRADE', height: H, material: 'white painted timber balusters and rail (as the interior renders show)', source: w.source ?? 'scaled', note: w.note ?? 'line from the plan; height assumed 1.0 m' });
    g.add(m); return;
  }
  for (const pc of pieces(w)) {
    const dir: Pt = [(pc.b[0] - pc.a[0]) / pc.L, (pc.b[1] - pc.a[1]) / pc.L];
    const P = (s: number): Pt => [pc.a[0] + dir[0] * s, pc.a[1] + dir[1] * s];
    const top = (s: number) => topAt(P(s)), rx = ridgeCross(pc.a, pc.b, pc.L);
    if (kind === 'glass') {
      // a glazed wall: panes between mullions, a head and a sill, doors standing open where the plan draws them
      const gs: THREE.BufferGeometry[] = [], panes: THREE.BufferGeometry[] = [], printed: THREE.BufferGeometry[] = [];
      const step = w.mullions ?? 1.5, n = Math.max(1, Math.round(pc.L / step));
      const doorAt = (s: number) => pc.openings.find((o) => o.kind === 'door' && s > o.a - 0.01 && s < o.b + 0.01);
      // mullions where the drawing puts them, or evenly at the stated spacing
      const at = w.mullionsAt ? [0, ...w.mullionsAt.map((s) => s - pc.s0).filter((s) => s > 0.05 && s < pc.L - 0.05), pc.L] : Array.from({ length: n + 1 }, (_, k) => (k / n) * pc.L);
      for (const s of at) gs.push(bar(P(Math.max(0, s - 0.03)), P(Math.min(pc.L, s + 0.03)), y0, top(s), 0.14));
      gs.push(bar(pc.a, pc.b, y0, y0 + 0.08, 0.12));
      for (let k = 0; k < at.length - 1; k++) {
        const s0 = at[k] + 0.03, s1 = at[k + 1] - 0.03, sm = (s0 + s1) / 2, d = doorAt(sm);
        const y1a = top(s0), y1b = top(s1);
        const quad = (lo: number, hi: number, z: number) => { const A = P(s0), B = P(s1), nz: Pt = [-dir[1] * z, dir[0] * z]; const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([A[0] + nz[0], lo, A[1] + nz[1], B[0] + nz[0], lo, B[1] + nz[1], B[0] + nz[0], hi === -1 ? y1b : hi, B[1] + nz[1], A[0] + nz[0], hi === -1 ? y1a : hi, A[1] + nz[1]], 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, lo, s1 - s0, lo, s1 - s0, hi === -1 ? y1b : hi, 0, hi === -1 ? y1a : hi], 2)); geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals(); return geo; };
        if (d) { const head = Math.min(d.head, Math.min(y1a, y1b) - 0.1); gs.push(bar(P(s0), P(s1), y0 + head, y0 + head + 0.1, 0.12)); panes.push(quad(y0 + head + 0.1, -1, 0)); }
        else { panes.push(quad(y0 + 0.08, -1, 0)); if (w.external && k % 2 === 1) printed.push(quad(y0 + 0.08, -1, 0.012)); }
      }
      const fm = mesh(`glazing_frame_${w.id}`, merged(gs), X.frame); tagged(fm, 'IfcCurtainWall', { name: w.name ?? 'Glazed wall', material: 'bronze aluminium mullions and transoms', mullionSpacing: step, source: w.source ?? 'scaled', note: w.note ?? '' }); g.add(fm);
      const pm = mesh(`glass_${w.id}`, merged(panes), X.glass, false); tagged(pm, 'IfcPlate', { name: `${w.name ?? 'Glazed wall'}: glass`, material: 'clear double glazing', source: w.source ?? 'scaled', note: 'height runs to the roof: assumed from the renders' }); g.add(pm);
      if (printed.length) { const pp = mesh(`printed_${w.id}`, merged(printed), X.pattern, false); tagged(pp, 'IfcPlate', { name: 'Printed panels', material: 'printed (fritted) glass interlayer', source: 'proposed', note: 'every second bay, as the front render shows printed panels; the pattern is indicative, the artist’s design is not reproduced' }); g.add(pp); }
      for (const d of pc.openings.filter((o) => o.kind === 'door')) g.add(door(d, P, dir, y0, X, true));
      continue;
    }
    const geo = wallPiece(pc.a, pc.b, pc.L, w.thickness, top, rx, pc.openings, y0);
    const outM = existing ? X.brick : w.external ? X.cedar : X.white;
    if (w.external) {
      // the inside face: painted (or plastered in the existing building), on whichever side of the line is inside the footprint
      const mid = P(pc.L / 2), left: Pt = [mid[0] - dir[1] * 0.6, mid[1] + dir[0] * 0.6];
      const side = inside(left, b.footprint) ? 1 : -1;
      const ln = mesh(`wall_${w.id}_${Math.round(pc.s0 * 10)}_inside`, geo.lining(side as 1 | -1), X.white);
      tagged(ln, 'IfcCovering', { name: `${w.name ?? w.id}: inside lining`, predefinedType: 'CLADDING', material: existing ? 'plaster (assumed)' : 'painted lining (proposed)', source: 'proposed' });
      g.add(ln);
    }
    // outside face cladding, inside paint: one material per wall keeps it light; an external wall shows its cladding
    const m = mesh(`wall_${w.id}_${Math.round(pc.s0 * 10)}`, geo, outM);
    tagged(m, 'IfcWall', { name: w.name ?? w.id, predefinedType: w.external ? 'SOLIDWALL' : 'PARTITIONING', thickness: w.thickness, material: w.material ?? (existing ? 'clay brick (from the renders)' : w.external ? 'vertical cedar cladding outside, painted lining inside (proposed, matched to the renders)' : 'painted plasterboard on framing (proposed)'), source: w.source ?? 'scaled', note: w.note ?? (w.height === 'roof' || w.height == null ? 'runs up to the underside of the roof (roof assumed from the renders)' : '') });
    g.add(m);
    for (const o of pc.openings) {
      if (o.kind === 'door') g.add(door(o, P, dir, y0, X, false));
      else if (o.kind === 'window' || o.kind === 'glazing') {
        const lo = Math.max(0.02, o.a), hi = Math.min(pc.L - 0.02, o.b), head = Math.min(o.head, Math.min(top(lo), top(hi)) - 0.05);
        const A = P(lo), B = P(hi), gl = bar(A, B, y0 + o.sill, y0 + head, 0.012);
        const pm = mesh(`window_glass_${w.id}`, gl, X.glass, false); tagged(pm, 'IfcWindow', { name: o.name ?? 'Window', overallWidth: Math.round((hi - lo) * 1000), overallHeight: Math.round((head - o.sill) * 1000), material: o.arch ? 'leaded glass in a pointed arch (from the renders)' : 'glazing', source: o.source ?? 'scaled', note: o.note ?? '' });
        g.add(pm);
      }
    }
  }
}

/** a door in its opening, standing open on its swing (hinged), or with its leaves parked (sliding) */
function door(o: FreeOpening & { a: number; b: number }, P: (s: number) => Pt, dir: Pt, y0: number, X: Mats, glazed: boolean) {
  const g = new THREE.Group(); g.name = `door_${o.id ?? Math.round(o.a * 100)}`;
  const w = o.b - o.a, h = Math.min(o.head, 2.4), type = o.type ?? (glazed ? 'auto' : w > 1.3 ? 'double' : 'hinged');
  const leafM = glazed ? X.glass : X.door, frameG: THREE.BufferGeometry[] = [];
  frameG.push(bar(P(o.a), P(o.a + 0.05), y0, y0 + h, 0.16), bar(P(o.b - 0.05), P(o.b), y0, y0 + h, 0.16));
  const leaves: THREE.BufferGeometry[] = [];
  const side = o.swing ?? 1, nrm: Pt = [-dir[1] * side, dir[0] * side];
  const leaf = (hinge: Pt, toward: Pt, lw: number, angle: number) => {
    // a leaf of width lw hinged at `hinge`, closed along `toward`, opened by `angle` towards the swing side
    const c = Math.cos(angle), s = Math.sin(angle), d: Pt = [toward[0] * c + nrm[0] * s, toward[1] * c + nrm[1] * s];
    leaves.push(bar(hinge, [hinge[0] + d[0] * lw, hinge[1] + d[1] * lw], y0 + 0.01, y0 + h - 0.02, 0.045));
  };
  const open = (85 * Math.PI) / 180;
  if (type === 'sliding' || type === 'auto') {
    const lw = w / 2; leaves.push(bar(P(o.a - lw * 0.85), P(o.a + lw * 0.15), y0 + 0.01, y0 + h, 0.04), bar(P(o.b - lw * 0.15), P(o.b + lw * 0.85), y0 + 0.01, y0 + h, 0.04));
  } else if (type === 'double' || type === 'pivot') {
    leaf(P(o.a), dir, w / 2, open); leaf(P(o.b), [-dir[0], -dir[1]], w / 2, open);
  } else {
    if (o.hinge === 'b') leaf(P(o.b), [-dir[0], -dir[1]], w, open); else leaf(P(o.a), dir, w, open);
  }
  const fm = mesh('door_frame', merged(frameG), X.frame), lm = mesh('door_leaf', merged(leaves), leafM, !glazed);
  tagged(g, 'IfcDoor', { name: o.name ?? (glazed ? 'Glazed door' : 'Door'), operation: type === 'sliding' || type === 'auto' ? 'SLIDING' : type === 'double' ? 'DOUBLE_SWING' : 'SINGLE_SWING', overallWidth: Math.round(w * 1000), overallHeight: Math.round(h * 1000), source: o.source ?? 'scaled', note: (o.note ? o.note + '; ' : '') + 'shown open; width from the plan, height assumed 2.4 m or less' });
  g.add(fm, lm);
  return g;
}

function stair(st: NonNullable<FreeLevel['stairs']>[number], X: Mats) {
  const g = new THREE.Group(); g.name = `stair_${st.id}`;
  const rise = st.to - st.from, n = Math.max(2, Math.ceil(Math.abs(rise) / 0.18)), r = rise / n, treads: THREE.BufferGeometry[] = [], rails: THREE.BufferGeometry[] = [];
  if (st.kind === 'straight' && st.line) {
    const Lt = lineLength(st.line), going = Lt / n;
    for (let k = 0; k < n; k++) {
      const p = along(st.line, (k + 0.5) * going), y = st.from + (k + 1) * r;
      const t = new THREE.BoxGeometry(going + 0.03, 0.05, st.width); t.rotateY(-Math.atan2(p.dir[1], p.dir[0])); t.translate(p.p[0], y - 0.025, p.p[1]); treads.push(t);
      const rs = new THREE.BoxGeometry(0.02, Math.abs(r), st.width); rs.rotateY(-Math.atan2(p.dir[1], p.dir[0])); const q = along(st.line, k * going); rs.translate(q.p[0], y - Math.abs(r) / 2, q.p[1]); treads.push(rs);
    }
    for (const sd of [-1, 1]) {
      const a = along(st.line, 0), e = along(st.line, Lt), off = (p: { p: Pt; dir: Pt }): THREE.Vector3 => new THREE.Vector3(p.p[0] - p.dir[1] * sd * (st.width / 2 - 0.04), 0, p.p[1] + p.dir[0] * sd * (st.width / 2 - 0.04));
      const A = off(a).setY(st.from + 0.95), B = off(e).setY(st.to + 0.95);
      rails.push(bar3(A, B, 0.05, 0.05));
      const S0 = off(a).setY(st.from - 0.1), S1 = off(e).setY(st.to - 0.1); rails.push(bar3(S0, S1, 0.05, 0.3));
      for (let k = 0; k <= n; k += 3) { const pp = off(along(st.line, (k / n) * Lt)); const y = st.from + (k / n) * rise; rails.push(new THREE.BoxGeometry(0.035, 0.95, 0.035).translate(pp.x, y + 0.475, pp.z)); }
    }
  } else if (st.kind === 'spiral' && st.centre && st.r) {
    const a0 = ((st.startDeg ?? 0) * Math.PI) / 180, turn = ((st.turnDeg ?? 360) * Math.PI) / 180, [cx, cz] = st.centre;
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n, y = st.from + (k + 1) * r, aa = a0 + turn * t0, ab = a0 + turn * t1;
      const sh = new THREE.Shape([new THREE.Vector2(0.12 * Math.cos(aa), 0.12 * Math.sin(aa)), new THREE.Vector2(st.r * Math.cos(aa), st.r * Math.sin(aa)), new THREE.Vector2(st.r * Math.cos((aa + ab) / 2) * 1.02, st.r * Math.sin((aa + ab) / 2) * 1.02), new THREE.Vector2(st.r * Math.cos(ab), st.r * Math.sin(ab)), new THREE.Vector2(0.12 * Math.cos(ab), 0.12 * Math.sin(ab))]);
      const tg = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false }); tg.rotateX(Math.PI / 2); tg.translate(cx, y, cz); treads.push(tg);
      const ra = (st.r - 0.03), pa = new THREE.Vector3(cx + Math.cos(aa) * ra, y + 0.95 - r, cz + Math.sin(aa) * ra), pb = new THREE.Vector3(cx + Math.cos(ab) * ra, y + 0.95, cz + Math.sin(ab) * ra);
      rails.push(bar3(pa, pb, 0.05, 0.05), new THREE.BoxGeometry(0.03, 0.95, 0.03).translate(pa.x, y + 0.475 - r, pa.z));
    }
    rails.push(new THREE.CylinderGeometry(0.1, 0.1, Math.abs(rise) + 1, 12).translate(cx, st.from + rise / 2 + 0.5, cz));
  }
  const tm = mesh(`stair_${st.id}_treads`, merged(treads), X.beam), rm = mesh(`stair_${st.id}_rails`, merged(rails), X.frame);
  tagged(g, 'IfcStair', { name: st.name ?? 'Stair', predefinedType: st.kind === 'spiral' ? 'SPIRAL_STAIR' : 'STRAIGHT_RUN_STAIR', risers: n, rise: +Math.abs(r).toFixed(3), width: st.width, source: st.source ?? 'scaled', note: (st.note ? st.note + '; ' : '') + `${n} risers of ${Math.round(Math.abs(r) * 1000)} mm worked out from the floor heights (assumed)` });
  g.add(tm, rm);
  return g;
}

function seating(list: Seat[], y: number, X: Mats) {
  const g = new THREE.Group();
  const tables = list.filter((s) => s.kind === 'round-table'), chairs: { at: Pt; deg: number }[] = list.filter((s) => s.kind === 'chair').map((s) => ({ at: s.at, deg: s.deg ?? 0 }));
  for (const t of tables) { const n = t.seats ?? 10, R = (t.d ?? 1.8) / 2 + 0.32; for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; chairs.push({ at: [t.at[0] + Math.cos(a) * R, t.at[1] + Math.sin(a) * R], deg: (Math.atan2(-Math.sin(a), -Math.cos(a)) * 180) / Math.PI }); } }
  if (tables.length) {
    const top = new THREE.CylinderGeometry(0.9, 0.9, 0.74, 32, 1, true).translate(0, 0.37, 0), disc = new THREE.CircleGeometry(0.9, 32).rotateX(-Math.PI / 2).translate(0, 0.745, 0);
    const tg = merged([top, disc]), im = new THREE.InstancedMesh(tg, X.cloth, tables.length), m4 = new THREE.Matrix4();
    tables.forEach((t, i) => { const s = (t.d ?? 1.8) / 1.8; im.setMatrixAt(i, m4.makeScale(s, 1, s).setPosition(t.at[0], y, t.at[1])); });
    im.castShadow = im.receiveShadow = true; im.name = 'round_tables'; g.add(im);
  }
  if (chairs.length) {
    const seat = new THREE.BoxGeometry(0.46, 0.06, 0.46).translate(0, 0.46, 0), back = new THREE.BoxGeometry(0.44, 0.42, 0.05).translate(0, 0.72, -0.21);
    const legs = [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z]) => new THREE.CylinderGeometry(0.012, 0.012, 0.45, 6).translate(x, 0.225, z));
    const cg = merged([seat, back, ...legs]), im = new THREE.InstancedMesh(cg, X.fabric, chairs.length), m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    // a chair faces +z in its own frame; `deg` is the direction it faces, measured from +u towards +v
    chairs.forEach((c, i) => { qq.setFromAxisAngle(up, Math.PI / 2 - (c.deg * Math.PI) / 180); im.setMatrixAt(i, m4.compose(new THREE.Vector3(c.at[0], y, c.at[1]), qq, new THREE.Vector3(1, 1, 1))); });
    im.castShadow = true; im.receiveShadow = true; im.name = 'chairs'; g.add(im);
  }
  return g;
}

function roof(b: FreeBuilding, X: Mats, existing: boolean) {
  const R = b.roof, g = new THREE.Group(); g.name = 'roof';
  const rAt = roofAt(R, false), th = R.thickness ?? 0.35, out = offset(b.footprint, R.eave ?? 0.5);
  const tops: THREE.BufferGeometry[] = [], unders: THREE.BufferGeometry[] = [], edges: THREE.BufferGeometry[] = [], beams: THREE.BufferGeometry[] = [], lights: THREE.BufferGeometry[] = [];
  const [r0, r1] = R.ridge, rl = Math.hypot(r1[0] - r0[0], r1[1] - r0[1]), rd: Pt = [(r1[0] - r0[0]) / rl, (r1[1] - r0[1]) / rl];
  for (const side of [1, -1] as const) {
    const half = clipToSide(out, R, side); if (half.length < 3) continue;
    const nrm: Pt = [-rd[1] * side, rd[0] * side];
    // skylights: rectangles on this plane, from `from` to `to` along the ridge and `a` to `b` out from it
    const holes: Pt[][] = (R.skylights ?? []).filter((s) => s.side === side).map((s) => [[s.from, s.a], [s.to, s.a], [s.to, s.b], [s.from, s.b]].map(([t, o]) => [r0[0] + rd[0] * t + nrm[0] * o, r0[1] + rd[1] * t + nrm[1] * o] as Pt));
    const dormerHoles: Pt[][] = (R.dormers ?? []).filter((d) => d.poly.every((p) => inside(p, half))).map((d) => d.poly);
    const lift = (geo: THREE.BufferGeometry, dy: number) => { const p = geo.getAttribute('position'); for (let i = 0; i < p.count; i++) p.setY(i, rAt(p.getX(i), p.getZ(i)) + dy); geo.computeVertexNormals(); return geo; };
    tops.push(lift(flat(half, 0, true, [...holes, ...dormerHoles]), th));
    unders.push(lift(flat(half, 0, false, [...holes, ...dormerHoles]), 0));
    for (let i = 0; i < half.length; i++) {
      const a = half[i], c = half[(i + 1) % half.length];
      const onRidge = Math.abs((a[0] - r0[0]) * nrm[0] + (a[1] - r0[1]) * nrm[1]) < 0.02 && Math.abs((c[0] - r0[0]) * nrm[0] + (c[1] - r0[1]) * nrm[1]) < 0.02;
      if (onRidge) continue;
      const ya = rAt(...a), yc = rAt(...c), e = new THREE.BufferGeometry();
      e.setAttribute('position', new THREE.Float32BufferAttribute([a[0], ya - 0.02, a[1], c[0], yc - 0.02, c[1], c[0], yc + th + 0.03, c[1], a[0], ya + th + 0.03, a[1]], 3)); e.setIndex([0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]); e.computeVertexNormals(); edges.push(e);
    }
    for (const h of holes) {
      const glass = flat(h, 0, true); lights.push(lift(glass, th * 0.5));
      for (let i = 0; i < 4; i++) { const a = h[i], c = h[(i + 1) % 4]; edges.push(bar3(new THREE.Vector3(a[0], rAt(...a) + th, a[1]), new THREE.Vector3(c[0], rAt(...c) + th, c[1]), 0.08, 0.18)); }
    }
    if (!existing) {
      // rafters under the roof, square to the ridge every 3 m, clipped to the footprint (the interior renders show dark beams)
      const fpHalf = clipToSide(b.footprint, R, side);
      for (let t = 1.5; t < rl + 30; t += 3.0) {
        const base: Pt = [r0[0] + rd[0] * t, r0[1] + rd[1] * t];
        if (!inside([base[0] + nrm[0] * 0.3, base[1] + nrm[1] * 0.3], fpHalf)) continue;
        let o = 0.3; while (o < 40 && inside([base[0] + nrm[0] * (o + 0.25), base[1] + nrm[1] * (o + 0.25)], fpHalf)) o += 0.25;
        const p: Pt = [base[0] + nrm[0] * 0.05, base[1] + nrm[1] * 0.05], q: Pt = [base[0] + nrm[0] * o, base[1] + nrm[1] * o];
        beams.push(bar3(new THREE.Vector3(p[0], rAt(...p) - 0.24, p[1]), new THREE.Vector3(q[0], rAt(...q) - 0.24, q[1]), 0.2, 0.45));
      }
    }
  }
  // dormers: a small gable over each, and a skirt from it up to the main roof round the hole it stands in
  for (const d of R.dormers ?? []) {
    const dAt = dormerAt(d), dOut = offset(d.poly, 0.25), dr: FreeRoof = { type: 'gable', ridge: d.ridge, height: d.height, pitchDeg: d.pitchDeg };
    for (const side of [1, -1] as const) {
      const half = clipToSide(dOut, dr, side); if (half.length < 3) continue;
      const lift = (geo: THREE.BufferGeometry, dy: number) => { const p = geo.getAttribute('position'); for (let i = 0; i < p.count; i++) p.setY(i, dAt(p.getX(i), p.getZ(i)) + dy); geo.computeVertexNormals(); return geo; };
      tops.push(lift(flat(half, 0, true), th)); unders.push(lift(flat(half, 0, false), 0));
    }
    const ring = [...d.poly, d.poly[0]];
    for (let i = 0; i < d.poly.length; i++) {
      const a = ring[i], c = ring[i + 1], n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 0.5));
      for (let k = 0; k < n; k++) {
        const p = [a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n] as Pt, q = [a[0] + ((c[0] - a[0]) * (k + 1)) / n, a[1] + ((c[1] - a[1]) * (k + 1)) / n] as Pt;
        const lo = (x: Pt) => Math.min(rAt(...x), dAt(...x)), hi = (x: Pt) => Math.max(rAt(...x), dAt(...x)) + th;
        const e = new THREE.BufferGeometry();
        e.setAttribute('position', new THREE.Float32BufferAttribute([p[0], lo(p), p[1], q[0], lo(q), q[1], q[0], hi(q), q[1], p[0], hi(p), p[1]], 3)); e.setIndex([0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]); e.computeVertexNormals(); edges.push(e);
      }
    }
  }
  if (!existing) {
    const fpR = b.footprint; let t0 = Infinity, t1 = -Infinity;
    for (let t = -10; t < rl + 30; t += 0.25) { const p: Pt = [r0[0] + rd[0] * t, r0[1] + rd[1] * t]; if (inside(p, fpR)) { t0 = Math.min(t0, t); t1 = Math.max(t1, t); } }
    if (t1 > t0) beams.push(bar3(new THREE.Vector3(r0[0] + rd[0] * t0, R.height - 0.3, r0[1] + rd[1] * t0), new THREE.Vector3(r0[0] + rd[0] * t1, R.height - 0.3, r0[1] + rd[1] * t1), 0.3, 0.6));
  }
  const src = R.source ?? 'assumed', note = R.note ?? 'pitch and ridge height assumed from the renders';
  const tm = mesh('roof_cover', merged(tops), existing ? X.roofLight : X.roofM); tagged(tm, 'IfcRoof', { name: existing ? 'Roof (existing, approximate)' : 'Roof', predefinedType: 'GABLE_ROOF', pitch: R.pitchDeg, ridgeHeight: R.height, material: R.cover ?? 'dark metal roofing', source: src, note });
  const um = mesh('roof_lining', merged(unders), existing ? X.white : X.ceiling); tagged(um, 'IfcCovering', { name: 'Ceiling under the roof', predefinedType: 'CEILING', material: existing ? 'lining' : 'timber ceiling boards (as the interior renders show)', source: src, note });
  const em = mesh('roof_edges', merged(edges), X.fascia); tagged(em, 'IfcCovering', { name: 'Fascia and verges', predefinedType: 'CLADDING', material: 'bronze metal fascia', source: src, note });
  g.add(tm, um, em);
  if (beams.length) { const bm = mesh('rafters', merged(beams), X.beam); tagged(bm, 'IfcBeam', { name: 'Rafters and ridge beam', material: 'dark stained glulam (as the interior renders show)', spacing: 3.0, source: 'assumed', note: 'spacing and size assumed; the renders show dark rafters' }); g.add(bm); }
  if (lights.length) { const lm = mesh('skylights', merged(lights), X.glass, false); tagged(lm, 'IfcWindow', { name: 'Skylights', predefinedType: 'SKYLIGHT', source: 'assumed', note: 'number and size assumed from the renders' }); g.add(lm); }
  return g;
}

/** every free-form building's switchable layouts, for the layer list: name → group */
export type { FreeRoof };
