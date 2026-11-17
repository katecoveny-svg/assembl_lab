import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { boxUV, type Quality } from '../objects/util';
import { twinMats, twinMatsFor, type TwinMats } from './mats';
import { fitOut } from './fitout';
import { interiorMats, ribbedMetal, type Finishes } from './furniture';
import { pbr, paint } from '../objects/tex';

// A home generated from a plan model (assembl.plan-model.v1): walls, openings, partitions,
// rooms and fit-out from the plan file; decks, spa and stairs from what RC-06 draws; roof
// from the written pitch, eaves and verges. Every part is a named mesh with element metadata
// (IFC class, predefined type, material, and where its size came from: written, scaled,
// assumed), so the inspector, glTF extras and the IFC export all carry it.
//
// Home-local axes: x = u (along the long side, from the north-west outside corner),
// z = v (across, south), y = up from finished floor level.

export type Src = 'written' | 'scaled' | 'assumed' | 'proposed' | 'survey' | 'traced' | 'ai';
type Pt = [number, number];

export interface Opening { id: string; kind: string; type?: string; name: string; a: number; b: number; sill: number; head: number; source?: Src; open?: boolean }
export interface WallSpec { id: string; name: string; axis: 'x' | 'z'; at: number; from: number; to: number; out: number; thickness: number; cladding: string; source?: Src; openings?: Opening[] }
export interface PartitionSpec { id: string; axis: 'x' | 'z'; at: number; from: number; to: number; thickness: number; source?: Src; openings?: Opening[] }
export interface RoomSpec { id: string; name: string; u: number; v: number; w: number; d: number; labelledArea?: number; source?: Src }
export interface BuildingSpec {
  id: string;
  name: string;
  roof: { type: string; ridge: string; pitchDeg: number; eave: number; verge: number; cover: string; source?: Src };
  levels: { plate: number; walls: WallSpec[]; partitions: PartitionSpec[]; rooms: RoomSpec[]; fitout?: { id: string; name: string; u0: number; u1: number; v0: number; v1: number; y0: number; y1: number; finish: string }[] }[];
}
export interface Drawn { northDeck: { u0: number; u1: number }; spa: { u: number; v: number; d: number }; southDeck: { u0: number; u1: number; v1: number }; stair: { u0: number; u1: number; side: 'south' | 'east' } }
export interface Placement { origin: Pt; u: Pt; v: Pt; ffl: number; bearing: number }
/** a yard limit: points p (e, n) must satisfy n·(p − a) ≥ offset */
export interface Limit { a: Pt; n: Pt; offset: number; name: string }

const tan15 = Math.tan((15 * Math.PI) / 180);

/** the footprint (outer faces) and the roof's half-span and pitch, from the plan model: ridge along u at v = D / 2 */
export function footprint(spec: BuildingSpec) {
  const L = spec.levels[0];
  const xs = L.walls.filter((w) => w.axis === 'x');
  const zs = L.walls.filter((w) => w.axis === 'z');
  const W = Math.max(...xs.map((w) => w.to), ...zs.map((w) => w.at), 1);
  const D = Math.max(...zs.map((w) => w.to), ...xs.map((w) => w.at), 1);
  const pitch = ((spec.roof?.pitchDeg ?? 15) * Math.PI) / 180;
  return { W, D, hs: D / 2, tanP: Math.tan(pitch) };
}

function hashId(s: string) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619);
    h2 = Math.imul(h2 ^ s.charCodeAt(i), 2246822519);
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const a = hex(h1) + hex(h2) + hex(h1 ^ h2) + hex(Math.imul(h1, h2));
  return `${a.slice(0, 8)}-${a.slice(8, 12)}-${a.slice(12, 16)}-${a.slice(16, 20)}-${a.slice(20, 32)}`;
}

function tag<T extends THREE.Object3D>(o: T, asset: string, ifc: string, props: Record<string, string | number | boolean> = {}) {
  o.userData = { ...o.userData, ifcClass: ifc, globalId: hashId(`${asset}/${o.name}`), ...props };
  return o;
}

function mesh(name: string, g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[]) {
  const o = new THREE.Mesh(g, m);
  o.name = name;
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}

function grp(name: string) {
  const g = new THREE.Group();
  g.name = name;
  return g;
}

/** a box at (x, y, z) of size (w, h, d), UVs in metres / tile */
function boxAt(w: number, h: number, d: number, x: number, y: number, z: number, tile: number, along: 'x' | 'y' | 'z' = 'x') {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return boxUV(g, tile, along);
}

function scaleUV(g: THREE.BufferGeometry, tile: number) {
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile);
  return g;
}

/** an extruded skin from a wall-local outline (s along the wall, y up) with holes, thickness along +z */
function skin(outline: Pt[], holes: Pt[][], z0: number, depth: number, tile: number) {
  const sh = new THREE.Shape(outline.map(([s, y]) => new THREE.Vector2(s, y)));
  for (const h of holes) sh.holes.push(new THREE.Path(h.map(([s, y]) => new THREE.Vector2(s, y))));
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, z0);
  return scaleUV(g, tile);
}

// --- polygon helpers in the home's (u, v) plane ------------------------------------------------
function clipHalf(poly: Pt[], f: (p: Pt) => number) {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i];
    const B = poly[(i + 1) % poly.length];
    const fa = f(A);
    const fb = f(B);
    if (fa >= 0) out.push(A);
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb);
      out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]);
    }
  }
  return out;
}
/** the [min, max] of a convex polygon along one axis at a fixed value of the other */
function spanAt(poly: Pt[], axis: 0 | 1, c: number): [number, number] | null {
  const o = axis === 0 ? 1 : 0;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i];
    const B = poly[(i + 1) % poly.length];
    if ((A[o] - c) * (B[o] - c) > 0 || A[o] === B[o]) {
      if (A[o] === c) {
        lo = Math.min(lo, A[axis]);
        hi = Math.max(hi, A[axis]);
      }
      continue;
    }
    const t = (c - A[o]) / (B[o] - A[o]);
    const x = A[axis] + (B[axis] - A[axis]) * t;
    lo = Math.min(lo, x);
    hi = Math.max(hi, x);
  }
  return hi > lo ? [lo, hi] : null;
}

export class HomeFrame {
  constructor(public p: Placement) {}
  /** home (u, v) → site (e, n) */
  en(u: number, v: number): Pt {
    const { origin: o, u: U, v: V } = this.p;
    return [o[0] + u * U[0] + v * V[0], o[1] + u * U[1] + v * V[1]];
  }
  /** a yard limit in site coordinates → a linear function of (u, v) */
  limit(l: Limit) {
    const { origin: o, u: U, v: V } = this.p;
    const c = l.n[0] * (o[0] - l.a[0]) + l.n[1] * (o[1] - l.a[1]) - l.offset;
    const cu = l.n[0] * U[0] + l.n[1] * U[1];
    const cv = l.n[0] * V[0] + l.n[1] * V[1];
    return (q: Pt) => c + cu * q[0] + cv * q[1];
  }
  get rotationY() {
    // three: x east, z = −north; home x (u) must point along U
    return Math.atan2(this.p.u[1], this.p.u[0]);
  }
}

/** the north deck as drawn: from the wall out to the rear and side yards */
export function northDeckPolygon(frame: HomeFrame, drawn: Drawn, limits: Limit[]): Pt[] {
  let poly: Pt[] = [
    [drawn.northDeck.u0, -8],
    [drawn.northDeck.u1, -8],
    [drawn.northDeck.u1, 0],
    [drawn.northDeck.u0, 0],
  ];
  for (const l of limits) poly = clipHalf(poly, frame.limit(l));
  return poly;
}

export function southDeckPolygon(drawn: Drawn): Pt[] {
  const u1 = drawn.stair.side === 'east' ? Math.min(drawn.southDeck.u1, drawn.stair.u0) : drawn.southDeck.u1;
  return [
    [drawn.southDeck.u0, 6],
    [u1, 6],
    [u1, drawn.southDeck.v1],
    [drawn.southDeck.u0, drawn.southDeck.v1],
  ];
}

export interface HomeOptions {
  key: string;
  spec: BuildingSpec;
  /** decks, spa and stair as drawn; without it the plan model's own deck rectangles are used */
  drawn?: Drawn;
  placement: Placement;
  limits: Limit[];
  /** proposed ground RL at site (e, n) */
  ground: (e: number, n: number) => number;
  quality: Quality;
  /** furnish the rooms and apply this finishes palette */
  finishes?: Finishes;
}

const claddingCache = new Map<string, THREE.MeshPhysicalMaterial>();
function claddingMat(kind: 'metal' | 'white', q: Quality, d: { tex: number }) {
  const k = `${kind}/${q}`;
  let m = claddingCache.get(k);
  if (!m) {
    m = kind === 'metal' ? pbr(ribbedMetal(d.tex, 0x2b2d30), 'ribbed_metal_cladding_dark', { clearcoat: 0.3, clearcoatRoughness: 0.4 }) : pbr(paint(d.tex, { colour: 0xf3f2ee, gloss: 0.25, tile: 1.0, seed: 77, name: 'white_painted_cladding' }), 'white_painted_cladding');
    claddingCache.set(k, m);
  }
  return m;
}

export function buildHome(o: HomeOptions) {
  const M = twinMatsFor(o.quality, o.finishes);
  const frame = new HomeFrame(o.placement);
  const L = o.spec.levels[0];
  const plate = L.plate;
  const { W, D, hs, tanP } = footprint(o.spec);
  const asset = `unit_${o.key}`;
  const root = grp(asset);
  root.position.set(o.placement.origin[0], o.placement.ffl, -o.placement.origin[1]);
  root.rotation.y = frame.rotationY;
  tag(root, asset, 'IfcBuilding', { name: `Unit ${o.key}`, ffl: o.placement.ffl, source: 'written', note: 'FFL from the drawing RL less the fitted datum offset' });
  /** ground under home point (u, v), as a height relative to the floor */
  const gy = (u: number, v: number) => o.ground(...frame.en(u, v)) - o.placement.ffl;
  const t = (key: keyof TwinMats) => (M.sets[key as string] ?? M.sets.lining).tile;
  // inside faces: the palette's matte wall paint when a fit-out is asked for
  const IMw = o.finishes ? interiorMats(o.quality, o.finishes) : null;
  const inMat = IMw ? IMw.wallPaint : M.lining;
  const inTile = IMw ? IMw.sets.wallPaint.tile : t('lining');

  // --- exterior walls ----------------------------------------------------------------------
  const wallsG = grp('walls');
  root.add(wallsG);
  const y0 = -0.36;
  const gableTop = (s: number) => plate + 0.19 + (hs - Math.abs(s - hs)) * tanP;
  for (const w of L.walls) {
    const g = grp(`wall_${w.id}_${w.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`);
    const len = w.to - w.from;
    const gable = w.axis === 'z';
    // wall-local s runs so that the outside face is at z = 0 and the inside at z = thickness
    const mirror = (w.axis === 'x' && w.out > 0) || (w.axis === 'z' && w.out < 0);
    const sOf = (x: number) => (mirror ? len - (x - w.from) : x - w.from);
    const outline: Pt[] = gable
      ? [
          [0, y0],
          [len, y0],
          [len, gableTop(mirror ? 0 : len)],
          [len / 2, gableTop(hs)],
          [0, gableTop(mirror ? len : 0)],
        ]
      : [
          [0, y0],
          [len, y0],
          [len, plate + 0.12],
          [0, plate + 0.12],
        ];
    const inner: Pt[] = gable
      ? [
          [0.0, -0.015],
          [len, -0.015],
          [len, plate + (hs - Math.abs((mirror ? 0 : len) - hs)) * tanP],
          [len / 2, plate + hs * tanP],
          [0, plate + (hs - Math.abs((mirror ? len : 0) - hs)) * tanP],
        ]
      : [
          [0, -0.015],
          [len, -0.015],
          [len, plate],
          [0, plate],
        ];
    const holes: Pt[][] = (w.openings ?? []).map((op) => {
      const a = Math.min(sOf(op.a), sOf(op.b));
      const b = Math.max(sOf(op.a), sOf(op.b));
      return [
        [a, op.sill],
        [b, op.sill],
        [b, op.head],
        [a, op.head],
      ];
    });
    const kind = o.finishes?.cladding ?? w.cladding;
    const cladM = kind === 'metal' || kind === 'white' ? claddingMat(kind, o.quality, M.d) : kind === 'blackstain' ? M.blackstain : M.cedar;
    const cladT = kind === 'metal' ? 0.6 : kind === 'white' ? 1.0 : (kind === 'blackstain' ? M.sets.blackstain : M.sets.cedar).tile;
    const th = w.thickness;
    const outer = mesh('cladding', skin(outline, holes, 0, 0.022, cladT), cladM);
    tag(outer, asset, 'IfcCovering', { predefinedType: 'CLADDING', material: kind === 'metal' ? 'dark ribbed metal cladding, vertical' : kind === 'white' ? 'white painted cladding' : kind === 'blackstain' ? 'cedar shiplap, black stain' : 'cedar shiplap, natural stain', source: o.finishes?.cladding ? 'proposed' : w.source ?? 'written' });
    const core = mesh('framing_core', skin(outline.map(([s, y]) => [s, Math.min(y, gable ? y : plate)] as Pt), holes, 0.022, th - 0.035, t('lining')), M.lining);
    const lin = mesh('lining', skin(inner, holes, th - 0.013, 0.013, inTile), inMat);
    g.add(outer, core, lin);
    tag(g, asset, 'IfcWall', { predefinedType: 'SOLIDWALL', name: w.name, thickness: th, cladding: w.cladding, source: w.source ?? 'written', material: '90 × 45 timber frame, building wrap, cavity battens, cedar shiplap; 10 mm plasterboard' });
    // place: wall-local (s, y, z) → home (u, y, v)
    if (w.axis === 'x') {
      if (!mirror) g.position.set(w.from, 0, w.at);
      else {
        g.rotation.y = Math.PI;
        g.position.set(w.to, 0, w.at);
      }
    } else if (w.out > 0) {
      g.rotation.y = -Math.PI / 2;
      g.position.set(w.at, 0, w.from);
    } else {
      g.rotation.y = Math.PI / 2;
      g.position.set(w.at, 0, w.to);
    }
    wallsG.add(g);
    // joinery in this wall
    for (const op of w.openings ?? []) {
      const a = Math.min(sOf(op.a), sOf(op.b));
      const b = Math.max(sOf(op.a), sOf(op.b));
      g.add(joinery(op, a, b, th, M, asset));
    }
  }

  // --- interior partitions -----------------------------------------------------------------
  const partsG = grp('partitions');
  root.add(partsG);
  const ceil = (v: number) => plate + (hs - Math.abs(v - hs)) * tanP;
  for (const p of L.partitions) {
    const th = Math.max(0.09, p.thickness);
    const len = p.to - p.from;
    const ops = (p.openings ?? []).slice().sort((x, y) => x.a - y.a);
    const out: Pt[] = [[0, 0]];
    for (const op of ops) {
      out.push([op.a - p.from, 0], [op.a - p.from, op.head], [op.b - p.from, op.head], [op.b - p.from, 0]);
    }
    out.push([len, 0]);
    if (p.axis === 'z') {
      const n = 8;
      for (let i = n; i >= 0; i--) {
        const s = (i / n) * len;
        out.push([s, ceil(p.from + s) - 0.005]);
      }
    } else {
      out.push([len, ceil(p.at) - 0.005], [0, ceil(p.at) - 0.005]);
    }
    const g = mesh(`partition_${p.id}`, skin(out, [], -th / 2, th, inTile), inMat);
    tag(g, asset, 'IfcWall', { predefinedType: 'PARTITIONING', thickness: th, source: p.source ?? 'written', note: p.thickness < 0.09 ? `plan model gives ${Math.round(p.thickness * 1000)} mm; drawn at 90 mm` : '', material: '70 × 45 timber frame, 10 mm plasterboard both sides' });
    if (p.axis === 'x') g.position.set(p.from, 0, p.at);
    else {
      g.rotation.y = -Math.PI / 2;
      g.position.set(p.at, 0, p.from);
    }
    partsG.add(g);
    for (const op of ops) {
      if (op.kind !== 'door') continue;
      const d = interiorDoor(op, op.a - p.from, op.b - p.from, th, M, asset);
      d.position.z -= th / 2;
      g.add(d);
    }
  }

  // --- floor, rooms, fit-out -----------------------------------------------------------------
  const tW = 0.113;
  const IM = o.finishes ? interiorMats(o.quality, o.finishes) : null;
  const floor = mesh('floor_finish', boxAt(W - 2 * tW, 0.02, D - 2 * tW, W / 2, -0.01, D / 2, IM ? IM.sets.floor.tile : t('oak'), 'x'), IM ? IM.floor : M.oak);
  tag(floor, asset, 'IfcCovering', { predefinedType: 'FLOORING', material: 'engineered oak on 20 mm particleboard', source: 'proposed' });
  root.add(floor);
  const roomsG = grp('spaces');
  root.add(roomsG);
  for (const r of L.rooms) {
    if (/bath/i.test(r.name)) {
      const tileF = mesh(`floor_tile_${r.id}`, boxAt(r.w, 0.012, r.d, r.u + r.w / 2, 0.006, r.v + r.d / 2, t('tile'), 'x'), M.tile);
      tag(tileF, asset, 'IfcCovering', { predefinedType: 'FLOORING', material: 'porcelain tile', source: 'proposed' });
      roomsG.add(tileF);
    }
    const sp = new THREE.Object3D();
    sp.name = `space_${r.id}_${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    sp.position.set(r.u + r.w / 2, 1.2, r.v + r.d / 2);
    sp.userData = { kind: 'space', name: r.name, area: r.labelledArea ?? +(r.w * r.d).toFixed(2), labelled: r.labelledArea != null, source: r.source ?? 'written' };
    roomsG.add(sp);
  }
  for (const f of o.finishes ? [] : L.fitout ?? []) {
    const mat = f.finish === 'stone' ? M.bench : M.oak;
    const b = mesh(`fitout_${f.id}`, boxAt(f.u1 - f.u0, f.y1 - f.y0, f.v1 - f.v0, (f.u0 + f.u1) / 2, (f.y0 + f.y1) / 2, (f.v0 + f.v1) / 2, t('bench'), 'x'), mat);
    tag(b, asset, 'IfcFurnishingElement', { name: f.name, material: f.finish, source: 'proposed' });
    root.add(b);
  }

  // --- raking ceiling ------------------------------------------------------------------------
  {
    const geos: THREE.BufferGeometry[] = [];
    for (const side of [0, 1]) {
      const g = new THREE.PlaneGeometry(W - 2 * tW, (hs - tW) / Math.cos(Math.atan(tanP)), 1, 1);
      g.rotateX(side === 0 ? Math.PI / 2 - Math.atan(tanP) : Math.PI / 2 + Math.atan(tanP));
      const vMid = side === 0 ? (tW + hs) / 2 : (hs + D - tW) / 2;
      g.translate(W / 2, ceil(vMid), vMid);
      geos.push(boxUV(g, IMw ? inTile : 1, 'x'));
    }
    const c = mesh('ceiling_raking', mergeGeometries(geos), inMat);
    tag(c, asset, 'IfcCovering', { predefinedType: 'CEILING', material: '10 mm plasterboard on rafters', source: 'scaled', note: 'raking ceiling read from sections B and E' });
    root.add(c);
  }

  // --- roof ----------------------------------------------------------------------------------
  root.add(roof(o.spec, plate, M, asset, gy));

  // --- subfloor: bearers, joists, piles --------------------------------------------------------
  root.add(subfloor(asset, M, [
    [0.05, 0.05],
    [W - 0.05, 0.05],
    [W - 0.05, D - 0.05],
    [0.05, D - 0.05],
  ], -0.02, gy, 'floor', 0.19));

  // --- decks, spa, stair ----------------------------------------------------------------------
  let nd: Pt[] = [];
  let sd: Pt[] = [];
  if (o.drawn) {
    nd = northDeckPolygon(frame, o.drawn, o.limits);
    if (nd.length >= 3) root.add(deck(asset, 'north_deck', nd, M, gy, [], 'scaled'));
    sd = southDeckPolygon(o.drawn);
    const stairEdge = o.drawn.stair.side === 'east' ? 'east' : 'south';
    root.add(deck(asset, 'south_deck', sd, M, gy, ['s'], 'scaled', stairEdge === 'south' ? [o.drawn.stair.u0, o.drawn.stair.u1] : null, stairEdge === 'east' ? sd[1][0] : null));
    root.add(spa(asset, o.drawn.spa, M));
    root.add(stair(asset, o.drawn, M, gy));
  } else {
    const ds = (L as unknown as { decks?: { id: string; u0: number; u1: number; v0: number; v1: number; rail?: string[] }[] }).decks ?? [];
    for (const dk of ds) {
      let poly: Pt[] = [
        [dk.u0, dk.v0],
        [dk.u1, dk.v0],
        [dk.u1, dk.v1],
        [dk.u0, dk.v1],
      ];
      for (const l of o.limits) poly = clipHalf(poly, frame.limit(l));
      if (poly.length >= 3) root.add(deck(asset, `deck_${dk.id.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, poly, M, gy, dk.rail ?? [], 'scaled'));
      if (dk.v1 <= 0.01) nd = poly;
      else sd = poly;
    }
  }

  if (o.finishes) {
    const ceilAt = (_u: number, v: number) => plate + (hs - Math.abs(v - hs)) * tanP;
    root.add(fitOut(o.spec, o.quality, o.finishes, ceilAt));
  }
  root.userData.decks = { north: nd, south: sd };
  return root;
}

// --- joinery ------------------------------------------------------------------------------------
function joinery(op: Opening, a: number, b: number, th: number, M: TwinMats, asset: string) {
  const g = grp(`${op.kind}_${op.id}_${op.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`);
  const w = b - a;
  const h = op.head - op.sill;
  const f = 0.045; // frame face
  const depth = 0.1;
  const zc = 0.022 + depth / 2 - 0.01;
  const jt = M.sets.joinery.tile;
  const frameGeos = [
    boxAt(w, f, depth, a + w / 2, op.head - f / 2, zc, jt),
    boxAt(w, f, depth, a + w / 2, op.sill + f / 2, zc, jt),
    boxAt(f, h - 2 * f, depth, a + f / 2, op.sill + h / 2, zc, jt, 'y'),
    boxAt(f, h - 2 * f, depth, b - f / 2, op.sill + h / 2, zc, jt, 'y'),
  ];
  const frame = mesh('frame', mergeGeometries(frameGeos), M.joinery);
  g.add(frame);
  const sash = (x0: number, x1: number, z: number, name: string, stile = 0.055) => {
    const sw = x1 - x0;
    const sh = h - 2 * f;
    const yb = op.sill + f;
    const parts = [
      boxAt(sw, stile, 0.04, x0 + sw / 2, yb + stile / 2, z, jt),
      boxAt(sw, stile, 0.04, x0 + sw / 2, yb + sh - stile / 2, z, jt),
      boxAt(stile, sh - 2 * stile, 0.04, x0 + stile / 2, yb + sh / 2, z, jt, 'y'),
      boxAt(stile, sh - 2 * stile, 0.04, x1 - stile / 2, yb + sh / 2, z, jt, 'y'),
    ];
    const s = grp(name);
    s.add(mesh('sash_frame', mergeGeometries(parts), M.joinery));
    const gl = new THREE.PlaneGeometry(sw - 2 * stile, sh - 2 * stile);
    gl.translate(x0 + sw / 2, yb + sh / 2, z);
    const glass = mesh('glass', gl, M.glass);
    glass.castShadow = false;
    s.add(glass);
    return s;
  };
  if (op.kind === 'door' && op.type === 'slider') {
    const mid = a + w / 2;
    const fixed = sash(a + f, mid + 0.025, zc - 0.022, 'fixed_panel');
    const off = op.open ? -(w / 2 - f - 0.05) : 0;
    const slide = sash(mid - 0.025 + off, b - f + off, zc + 0.022, 'sliding_panel');
    g.add(fixed, slide);
    tag(g, asset, 'IfcDoor', { predefinedType: 'DOOR', operation: 'SLIDING', overallWidth: Math.round(w * 1000), overallHeight: Math.round(h * 1000), material: 'aluminium, double glazed', source: op.source ?? 'scaled', open: !!op.open });
  } else if (op.kind === 'door') {
    const leaf = sash(a + f, b - f, zc, 'door_leaf', 0.09);
    const handle = mesh('handle', boxAt(0.02, 0.18, 0.03, b - f - 0.08, 1.0, zc - 0.04, jt, 'y'), M.joinery);
    g.add(leaf, handle);
    tag(g, asset, 'IfcDoor', { predefinedType: 'DOOR', operation: 'SINGLE_SWING', overallWidth: Math.round(w * 1000), overallHeight: Math.round(h * 1000), material: 'aluminium, double glazed', source: op.source ?? 'scaled' });
  } else {
    g.add(sash(a + f, b - f, zc, 'awning_sash'));
    tag(g, asset, 'IfcWindow', { predefinedType: 'WINDOW', operation: 'AWNING', overallWidth: Math.round(w * 1000), overallHeight: Math.round(h * 1000), material: 'aluminium, double glazed', source: op.source ?? 'scaled' });
  }
  return g;
}

function interiorDoor(op: Opening, a: number, b: number, th: number, M: TwinMats, asset: string) {
  const g = grp(`door_${op.id}_${op.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`);
  const w = b - a;
  const lt = M.sets.door.tile;
  const lining = [boxAt(w, 0.02, th + 0.02, a + w / 2, op.head + 0.01, th / 2, lt), boxAt(0.02, op.head, th + 0.02, a + 0.01, op.head / 2, th / 2, lt, 'y'), boxAt(0.02, op.head, th + 0.02, b - 0.01, op.head / 2, th / 2, lt, 'y')];
  g.add(mesh('door_lining', mergeGeometries(lining), M.door));
  // leaf swung open 70° about the hinge at a
  const leaf = mesh('door_leaf', boxAt(w - 0.05, op.head - 0.025, 0.035, (w - 0.05) / 2, (op.head - 0.025) / 2 + 0.01, 0, lt, 'x'), M.door);
  const hinge = grp('leaf_hinge');
  hinge.position.set(a + 0.025, 0, th / 2);
  hinge.rotation.y = -1.2;
  hinge.add(leaf);
  g.add(hinge);
  tag(g, asset, 'IfcDoor', { predefinedType: 'DOOR', operation: 'SINGLE_SWING', overallWidth: Math.round(w * 1000), overallHeight: Math.round(op.head * 1000), material: 'painted hollow-core leaf', source: op.source ?? 'assumed' });
  return g;
}

// --- roof ----------------------------------------------------------------------------------------
function corrugate(width: number, length: number, p = 0.0762, dep = 0.017) {
  const across = Math.max(8, Math.round((width / p) * 8));
  const g = new THREE.PlaneGeometry(width, length, across, Math.max(1, Math.round(length / 0.6)));
  g.rotateX(-Math.PI / 2);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + width / 2;
    pos.setY(i, (dep / 2) * Math.cos((2 * Math.PI * x) / p));
  }
  g.computeVertexNormals();
  return g;
}

function roof(spec: BuildingSpec, plate: number, M: TwinMats, asset: string, gy: (u: number, v: number) => number) {
  const r = spec.roof;
  const { W, D, hs } = footprint(spec);
  const g = grp('roof');
  tag(g, asset, 'IfcRoof', { predefinedType: 'GABLE_ROOF', pitch: r.pitchDeg, eave: r.eave, verge: r.verge, cover: r.cover, source: r.source ?? 'written' });
  const a = (r.pitchDeg * Math.PI) / 180;
  const tn = Math.tan(a);
  const top = (v: number) => plate + 0.22 + (hs - Math.abs(v - hs)) * tn;
  const u0 = -r.verge;
  const u1 = W + r.verge;
  const runV = hs + r.eave;
  const len = runV / Math.cos(a);
  const sheets: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const s = corrugate(u1 - u0, len);
    s.rotateX(side < 0 ? -a : a);
    const vMid = side < 0 ? hs - runV / 2 : hs + runV / 2;
    s.translate((u0 + u1) / 2, top(vMid) + 0.01, vMid);
    sheets.push(boxUV(s, M.sets.roof.tile, 'z'));
  }
  const cover = mesh('roof_sheets', mergeGeometries(sheets), M.roof);
  tag(cover, asset, 'IfcCovering', { predefinedType: 'ROOFING', material: 'profiled metal roof sheeting (RS), pre-painted steel; corrugate profile assumed', source: 'written' });
  g.add(cover);
  // underlay / sarking surface, soffits
  const under: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const s = new THREE.PlaneGeometry(u1 - u0, len);
    s.rotateX(Math.PI / 2 + (side < 0 ? -a : a));
    const vMid = side < 0 ? hs - runV / 2 : hs + runV / 2;
    s.translate((u0 + u1) / 2, top(vMid) - 0.02, vMid);
    under.push(boxUV(s, 1, 'x'));
  }
  const soffit = mesh('soffit_and_underlay', mergeGeometries(under), M.lining);
  soffit.castShadow = false;
  g.add(soffit);
  // fascia + gutter along the eaves, barge boards on the verges, ridge capping
  const ft = M.sets.roof.tile;
  const eaveY = top(-r.eave);
  const trims: THREE.BufferGeometry[] = [];
  for (const v of [-r.eave, D + r.eave]) {
    const out = v < 0 ? -1 : 1;
    trims.push(boxAt(u1 - u0 + 0.05, 0.2, 0.025, (u0 + u1) / 2, eaveY - 0.1, v + out * 0.0125, ft));
    // quad gutter
    trims.push(boxAt(u1 - u0 + 0.05, 0.11, 0.004, (u0 + u1) / 2, eaveY - 0.07, v + out * 0.14, ft));
    trims.push(boxAt(u1 - u0 + 0.05, 0.004, 0.125, (u0 + u1) / 2, eaveY - 0.125, v + out * 0.08, ft));
  }
  for (const u of [u0, u1]) {
    for (const side of [-1, 1]) {
      const b = new THREE.BoxGeometry(0.025, 0.22, len + 0.02);
      b.rotateX(side < 0 ? -a : a);
      const vMid = side < 0 ? hs - runV / 2 : hs + runV / 2;
      b.translate(u + (u === u0 ? -0.0125 : 0.0125), top(vMid) - 0.08, vMid);
      trims.push(boxUV(b, ft, 'z'));
    }
  }
  for (const side of [-1, 1]) {
    const c = new THREE.BoxGeometry(u1 - u0 + 0.06, 0.004, 0.2);
    c.translate(0, 0, side * 0.1);
    c.rotateX(side < 0 ? -a : a);
    c.translate((u0 + u1) / 2, top(hs) + 0.03, hs);
    trims.push(boxUV(c, ft, 'x'));
  }
  const trim = mesh('fascia_gutters_barges_ridge', mergeGeometries(trims), M.flashing);
  tag(trim, asset, 'IfcCovering', { predefinedType: 'ROOFING', material: 'pre-painted steel fascia, quad gutter, barge and ridge flashings', source: 'assumed' });
  g.add(trim);
  // downpipes at the four corners, to ground
  const dps: THREE.BufferGeometry[] = [];
  for (const [u, v] of [
    [0.25, -0.17],
    [W - 0.25, -0.17],
    [0.25, D + 0.17],
    [W - 0.25, D + 0.17],
  ] as Pt[]) {
    const gr = gy(u, v);
    const h = eaveY - 0.12 - gr;
    if (h <= 0.1) continue;
    const c = new THREE.CylinderGeometry(0.04, 0.04, h, 12);
    c.translate(u, gr + h / 2, v);
    dps.push(boxUV(c, ft, 'y'));
  }
  if (dps.length) {
    const dp = mesh('downpipes', mergeGeometries(dps), M.flashing);
    tag(dp, asset, 'IfcPipeSegment', { predefinedType: 'RIGIDSEGMENT', material: '80 mm round downpipe, pre-painted steel', source: 'assumed' });
    g.add(dp);
  }
  return g;
}

// --- subfloor and decks ---------------------------------------------------------------------------
/** bearers along u, joists along v, piles to ground, for a convex outline at top level `topY` */
function subfloor(asset: string, M: TwinMats, poly: Pt[], topY: number, gy: (u: number, v: number) => number, name: string, joistH = 0.14) {
  const g = grp(`${name}_framing`);
  const ft = M.sets.framing.tile;
  const joistTop = topY;
  const bearerTop = joistTop - joistH;
  const bearerH = 0.14;
  let vMin = Infinity;
  let vMax = -Infinity;
  let uMin = Infinity;
  let uMax = -Infinity;
  for (const [u, v] of poly) {
    vMin = Math.min(vMin, v);
    vMax = Math.max(vMax, v);
    uMin = Math.min(uMin, u);
    uMax = Math.max(uMax, u);
  }
  // joists along v at 450 centres
  const joists: THREE.BufferGeometry[] = [];
  for (let u = uMin + 0.03; u <= uMax - 0.02; u += 0.45) {
    const sp = spanAt(poly, 1, u);
    if (!sp || sp[1] - sp[0] < 0.2) continue;
    joists.push(boxAt(0.045, joistH, sp[1] - sp[0] - 0.02, u, joistTop - joistH / 2, (sp[0] + sp[1]) / 2, ft, 'z'));
  }
  // bearers along u, ≤ 1.6 m apart, with piles ≤ 1.6 m apart
  const bearers: THREE.BufferGeometry[] = [];
  const piles: THREE.BufferGeometry[] = [];
  const nb = Math.max(2, Math.ceil((vMax - vMin - 0.3) / 1.6) + 1);
  for (let i = 0; i < nb; i++) {
    const v = vMin + 0.15 + (i * (vMax - vMin - 0.3)) / (nb - 1);
    const sp = spanAt(poly, 0, v);
    if (!sp || sp[1] - sp[0] < 0.3) continue;
    bearers.push(boxAt(sp[1] - sp[0] - 0.1, bearerH, 0.09, (sp[0] + sp[1]) / 2, bearerTop - bearerH / 2, v, ft, 'x'));
    const np = Math.max(2, Math.ceil((sp[1] - sp[0] - 0.3) / 1.6) + 1);
    for (let k = 0; k < np; k++) {
      const u = sp[0] + 0.15 + (k * (sp[1] - sp[0] - 0.3)) / (np - 1);
      const gr = gy(u, v);
      const h = bearerTop - bearerH - gr + 0.05;
      if (h < 0.05) continue;
      piles.push(boxAt(0.125, h, 0.125, u, gr - 0.05 + h / 2, v, M.sets.pile.tile, 'y'));
    }
  }
  if (joists.length) g.add(tag(mesh(`${name}_joists`, mergeGeometries(joists), M.framing), asset, 'IfcMember', { predefinedType: 'JOIST', material: `radiata pine H3.2, ${Math.round(joistH * 1000)} × 45 at 450 centres`, source: 'assumed' }));
  if (bearers.length) g.add(tag(mesh(`${name}_bearers`, mergeGeometries(bearers), M.framing), asset, 'IfcBeam', { predefinedType: 'BEAM', material: 'radiata pine H3.2, 140 × 90', source: 'assumed' }));
  if (piles.length) g.add(tag(mesh(`${name}_piles`, mergeGeometries(piles), M.pile), asset, 'IfcPile', { predefinedType: 'DRIVEN', material: 'radiata pine H5, 125 × 125; plan model floor type "timber piles"', source: 'written' }));
  return g;
}

function deck(asset: string, name: string, poly: Pt[], M: TwinMats, gy: (u: number, v: number) => number, rails: string[], source: Src, stairGap: [number, number] | null = null, skipU: number | null = null) {
  const g = grp(name);
  const top = -0.05;
  const bt = 0.032;
  tag(g, asset, 'IfcSlab', { predefinedType: 'LANDING', name: name.replace('_', ' '), source, area: +polyArea(poly).toFixed(2), note: 'outline scaled from RC-06; clipped to the 1 m yards' });
  let vMin = Infinity;
  let vMax = -Infinity;
  for (const [, v] of poly) {
    vMin = Math.min(vMin, v);
    vMax = Math.max(vMax, v);
  }
  // boards run along u, 140 wide with 5 mm gaps, each cut to the deck's outline (angled ends where the edge is)
  const boards: THREE.BufferGeometry[] = [];
  for (let v = vMin + 0.0725; v <= vMax - 0.06; v += 0.145) {
    let strip = clipHalf(poly, (q) => q[1] - (v - 0.07));
    strip = clipHalf(strip, (q) => v + 0.07 - q[1]);
    if (strip.length < 3 || polyArea(strip) < 0.02) continue;
    // shape in (u, −v) so the extrusion (+z → up after rotation) keeps the winding outward
    const sh = new THREE.Shape(strip.map(([u, vv]) => new THREE.Vector2(u, -vv)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: bt, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    g.translate(0, top - bt, 0);
    boards.push(boxUV(g, M.sets.decking.tile, 'x'));
  }
  if (boards.length) g.add(tag(mesh(`${name}_boards`, mergeGeometries(boards), M.decking), asset, 'IfcCovering', { predefinedType: 'FLOORING', material: 'hardwood decking 140 × 32, 5 mm gaps (TD)', source: 'written' }));
  g.add(subfloor(asset, M, poly, top - bt, gy, name));
  // barriers on edges with a fall of 1 m or more (NZBC F4), or where the plan model asks
  const posts: THREE.BufferGeometry[] = [];
  const rail: THREE.BufferGeometry[] = [];
  const battens: THREE.BufferGeometry[] = [];
  const ft = M.sets.decking.tile;
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i];
    const B = poly[(i + 1) % poly.length];
    const along = Math.hypot(B[0] - A[0], B[1] - A[1]);
    if (along < 0.3) continue;
    const onWall = Math.abs(A[1]) < 1e-6 && Math.abs(B[1]) < 1e-6;
    const onSouthWall = Math.abs(A[1] - 6) < 1e-6 && Math.abs(B[1] - 6) < 1e-6;
    if (onWall || onSouthWall) continue;
    if (skipU != null && Math.abs(A[0] - skipU) < 1e-6 && Math.abs(B[0] - skipU) < 1e-6) continue;
    const mid: Pt = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    const fall = top - gy(mid[0], mid[1]);
    const southEdge = Math.abs(A[1] - B[1]) < 1e-6 && A[1] > 5.9;
    const wanted = fall >= 1.0 || (rails.includes('s') && southEdge);
    if (!wanted) continue;
    const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
    const segs: [number, number][] = [[0, along]];
    if (stairGap && southEdge) {
      const lo = Math.min(A[0], B[0]);
      const s0 = Math.abs(stairGap[0] - lo);
      const s1 = Math.abs(stairGap[1] - lo);
      segs.splice(0, 1, [0, Math.min(s0, s1)], [Math.max(s0, s1), along]);
    }
    const at = (s: number): Pt => [A[0] + Math.cos(ang) * s, A[1] + Math.sin(ang) * s];
    for (const [s0, s1] of segs) {
      const L = s1 - s0;
      if (L < 0.2) continue;
      const np = Math.max(1, Math.ceil(L / 1.5));
      for (let k = 0; k <= np; k++) {
        const p = at(s0 + (k * L) / np);
        const b = new THREE.BoxGeometry(0.09, 1.06, 0.09);
        b.translate(p[0], top + 0.5, p[1]);
        posts.push(boxUV(b, ft, 'y'));
      }
      const c = at((s0 + s1) / 2);
      const r = new THREE.BoxGeometry(L, 0.045, 0.14);
      r.rotateY(-ang);
      r.translate(c[0], top + 1.0, c[1]);
      rail.push(boxUV(r, ft, 'x'));
      for (let s = s0 + 0.08; s < s1 - 0.05; s += 0.1) {
        const p = at(s);
        const b = new THREE.BoxGeometry(0.042, 0.92, 0.019);
        b.rotateY(-ang);
        b.translate(p[0], top + 0.5, p[1]);
        battens.push(boxUV(b, ft, 'y'));
      }
    }
  }
  if (posts.length) {
    const bal = grp(`${name}_balustrade`);
    bal.add(mesh('posts', mergeGeometries(posts), M.decking), mesh('top_rail', mergeGeometries(rail), M.decking), mesh('vertical_battens', mergeGeometries(battens), M.decking));
    tag(bal, asset, 'IfcRailing', { predefinedType: 'BALUSTRADE', material: 'hardwood posts 90 × 90, top rail 140 × 45, vertical battens 42 × 19 at 100 centres', source: 'assumed', rule: 'barrier where the fall is 1 m or more, and on the south edge as the plan model notes' });
    g.add(bal);
  }
  return g;
}

function polyArea(p: Pt[]) {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

function spa(asset: string, s: { u: number; v: number; d: number }, M: TwinMats) {
  const g = grp('spa_pool');
  const R = s.d / 2;
  const h = 0.9;
  const top = -0.05;
  const shellG = new THREE.CylinderGeometry(R, R, h, 6, 1, false, Math.PI / 6);
  shellG.translate(s.u, top + h / 2, s.v);
  const surround = mesh('spa_surround', boxUV(shellG, M.sets.decking.tile, 'y'), M.decking);
  const rim = new THREE.CylinderGeometry(R * 0.82, R * 0.72, 0.5, 32, 1, true);
  rim.translate(s.u, top + h - 0.25 + 0.002, s.v);
  const shell = mesh('spa_shell', rim, M.spaShell);
  const lip = new THREE.RingGeometry(R * 0.82, R * 0.86, 32);
  lip.rotateX(-Math.PI / 2);
  lip.translate(s.u, top + h + 0.003, s.v);
  const water = new THREE.CircleGeometry(R * 0.8, 32);
  water.rotateX(-Math.PI / 2);
  water.translate(s.u, top + h - 0.14, s.v);
  g.add(surround, shell, mesh('spa_lip', lip, M.spaShell), mesh('spa_water', water, M.water));
  tag(g, asset, 'IfcBuildingElementProxy', { name: 'Spa pool', material: 'acrylic shell, hardwood surround', source: 'scaled', note: 'hexagonal spa drawn on RC-06; 2.2 m across, height assumed 0.9 m' });
  return g;
}

function stair(asset: string, drawn: Drawn, M: TwinMats, gy: (u: number, v: number) => number) {
  const s = drawn.stair;
  const g = grp('deck_stair');
  const top = -0.05;
  const going = 0.27;
  const ft = M.sets.decking.tile;
  const treads: THREE.BufferGeometry[] = [];
  const stringers: THREE.BufferGeometry[] = [];
  const width = s.side === 'south' ? s.u1 - s.u0 : drawn.southDeck.v1 - 6;
  const startAlong = s.side === 'south' ? drawn.southDeck.v1 : s.u0;
  const across0 = s.side === 'south' ? s.u0 : 6;
  // iterate: the foot's ground depends on how far the flight runs
  let n = 3;
  for (let it = 0; it < 4; it++) {
    const foot = startAlong + n * going;
    const fu = s.side === 'south' ? (s.u0 + s.u1) / 2 : foot;
    const fv = s.side === 'south' ? foot : (6 + drawn.southDeck.v1) / 2;
    const rise = top - gy(fu, fv);
    n = Math.max(1, Math.ceil(rise / 0.18));
  }
  const fu = s.side === 'south' ? (s.u0 + s.u1) / 2 : startAlong + n * going;
  const fv = s.side === 'south' ? startAlong + n * going : (6 + drawn.southDeck.v1) / 2;
  const rise = top - gy(fu, fv);
  const r = rise / n;
  for (let i = 1; i < n; i++) {
    const along = startAlong + (i - 0.5) * going;
    const y = top - i * r;
    const b = s.side === 'south' ? boxAt(width, 0.032, going - 0.01, across0 + width / 2, y - 0.016, along, ft, 'x') : boxAt(going - 0.01, 0.032, width, along, y - 0.016, across0 + width / 2, ft, 'z');
    treads.push(b);
  }
  const run = n * going;
  const slope = Math.atan2(rise, run);
  const sl = Math.hypot(rise, run);
  for (const side of [0, 1]) {
    const c = across0 + (side ? width - 0.0225 : 0.0225);
    const b = new THREE.BoxGeometry(s.side === 'south' ? 0.045 : sl, 0.24, s.side === 'south' ? sl : 0.045);
    if (s.side === 'south') {
      b.rotateX(slope);
      b.translate(c, top - rise / 2 - 0.08, startAlong + run / 2);
    } else {
      b.rotateZ(-slope);
      b.translate(startAlong + run / 2, top - rise / 2 - 0.08, c);
    }
    stringers.push(boxUV(b, ft, s.side === 'south' ? 'z' : 'x'));
  }
  if (treads.length) g.add(mesh('treads', mergeGeometries(treads), M.decking));
  g.add(mesh('stringers', mergeGeometries(stringers), M.framing));
  tag(g, asset, 'IfcStair', { predefinedType: 'STRAIGHT_RUN_STAIR', risers: n, riser: Math.round(r * 1000), going: Math.round(going * 1000), source: 'scaled', note: 'position and width scaled from RC-06; risers fitted to the surveyed ground' });
  return g;
}
