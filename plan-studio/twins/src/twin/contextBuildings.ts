// The site as it is now: the existing buildings round a model, from LINZ outlines and LiDAR heights (the rules are in
// contextRules.ts). Each outline is stood on the ground at its lowest corner and given a finish proposed by rule, not surveyed:
// painted weatherboard or brick walls, a pitched corrugated-iron roof on small and medium near-rectangular outlines and a low
// longrun roof on large or irregular ones, and windows as darker glass bands. Light for a laptop: every building goes into a few
// merged meshes (one per material), the surfaces are 512 px tiles baked once in code (objects/tex.ts), the colour varies by
// building through vertex colours, and occlusion is baked into those colours at the foot of the walls and under the eaves.
import * as THREE from 'three/webgpu';
import { ASSUMED_HEIGHT, finishFor, orientedBox, OUTLINE_CREDIT, type Finish, type Outline } from './contextRules';
import { bake, fbm, hex, mix, pbr, reliefPaint, weatherboardPaint, type PBRSet } from '../objects/tex';

/** older institutional brick, muted: brown-red stretcher bond, weathered, on recessed grey mortar (230 × 76 mm bricks, 10 mm joints) */
function mutedBrick(size: number): PBRSet {
  const nx = 4, ny = 12, B = hex(0x7a5244), Bd = hex(0x5a3b31), Bl = hex(0x8f6a5a), Mo = hex(0xa9a397);
  const h1 = (a: number, b: number, sd: number) => { const v = Math.sin(a * 127.1 + b * 311.7 + sd * 74.7) * 43758.5453; return v - Math.floor(v); };
  return bake(size, 0.96, (u, v) => {
    const row = Math.floor(v * ny), fy = v * ny - row, xx = u * nx + (row % 2 ? 0.5 : 0), col = Math.floor(xx), fx = xx - col;
    const jx = 0.01 / 0.24, jy = 0.01 / 0.08, sand = fbm(u, v, 128, 128, 2, 41), grime = fbm(u, v, 3, 3, 3, 42);
    if (fx < jx || fy < jy) { const k = 0.82 + sand * 0.15; return { c: [Mo[0] * k, Mo[1] * k, Mo[2] * k], h: 0.05 + sand * 0.1, r: 0.96, m: 0, o: 0.65 }; }
    const id = h1(((col % nx) + nx) % nx, row, 7), base = id < 0.3 ? Bd : id > 0.78 ? Bl : B;
    const k = (0.84 + sand * 0.2) * (0.9 + (grime - 0.5) * 0.25);
    const t = h1(row, col, 9) * 0.35;
    return { c: [mix(base[0], Mo[0], t * 0.3) * k, mix(base[1], Mo[1], t * 0.3) * k, mix(base[2], Mo[2], t * 0.3) * k], h: 0.75 + sand * 0.15, r: 0.88 + sand * 0.08, m: 0 };
  }, 2.4, 'context_brick');
}
export { outlinesUrl, parseOutlines, toSceneRings, OUTLINE_CREDIT } from './contextRules';

const SIZE = 512, STOREY = 3, EAVE_MIN = 2.4, OVERHANG = 0.45;
type Sets = { board: PBRSet; brick: PBRSet; roof: PBRSet };
let sets: Sets | null = null;
const getSets = (): Sets => (sets ??= {
  board: weatherboardPaint(SIZE, { colour: 0xffffff, gloss: 0.35, seed: 61, name: 'context_weatherboard' }),
  brick: mutedBrick(SIZE),
  // corrugated iron: 76 mm pitch, 17 mm deep, as the common NZ profile; greyscale, the colour comes from each roof
  roof: reliefPaint(SIZE, { colour: 0xffffff, gloss: 0.5, tile: 0.76, height: (u) => 0.5 + 0.5 * Math.cos(u * 10 * 2 * Math.PI), relief: 2.2, seed: 62, name: 'context_corrugate' }),
});

/** one bucket of merged geometry: positions, normals, uvs (metres over the tile), colours */
class Bucket {
  p: number[] = []; n: number[] = []; uv: number[] = []; c: number[] = []; idx: number[] = [];
  constructor(public tile: number) {}
  /** a flat polygon (3 or 4 corners, in order), with its outward normal, uv in metres and a colour per corner */
  face(v: THREE.Vector3[], nrm: THREE.Vector3, uv: [number, number][], col: THREE.Color[]) {
    const k = this.p.length / 3;
    // wind so the face looks along its normal
    const e1 = v[1].clone().sub(v[0]), e2 = v[2].clone().sub(v[0]), flip = e1.cross(e2).dot(nrm) < 0;
    v.forEach((q, i) => { this.p.push(q.x, q.y, q.z); this.n.push(nrm.x, nrm.y, nrm.z); this.uv.push(uv[i][0] / this.tile, uv[i][1] / this.tile); this.c.push(col[i].r, col[i].g, col[i].b); });
    const tri = (a: number, b: number, c: number) => (flip ? this.idx.push(k + a, k + c, k + b) : this.idx.push(k + a, k + b, k + c));
    tri(0, 1, 2); if (v.length === 4) tri(0, 2, 3);
  }
  mesh(mat: THREE.Material, name: string) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.setIndex(this.idx);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.name = name; m.castShadow = true; m.receiveShadow = true;
    return m;
  }
}
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tint = (hex: number, k: number) => new THREE.Color(hex).multiplyScalar(k);
const signedArea = (r: number[][]) => { let a = 0; for (let i = 0; i + 1 < r.length; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return a / 2; };
const h1 = (s: number) => { const v = Math.sin(s * 127.1) * 43758.5453; return v - Math.floor(v); };

export interface ContextItem { o: Outline; ring: number[][] }
export type HeightOf = (it: ContextItem) => { h: number | null; how: string };

/** the existing buildings as finished blocks: walls, roof and windows by rule, heights from LiDAR where it reaches them */
export function contextGroup(items: ContextItem[], heightOf: HeightOf, yAt: (x: number, z: number) => number, asOf = '') {
  const g = new THREE.Group(); g.name = 'context_buildings';
  const S = getSets();
  const B = { board: new Bucket(S.board.tile), brick: new Bucket(S.brick.tile), roof: new Bucket(S.roof.tile), glass: new Bucket(1), frame: new Bucket(1) };
  let measured = 0; const forms: Record<string, number> = {};
  for (const it of items) {
    let ring = it.ring.slice();
    if (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring = ring.slice(0, -1);
    if (ring.length < 3) continue;
    const closed = [...ring, ring[0]], A = signedArea(closed), out = A > 0 ? 1 : -1;
    const hr = heightOf(it), f: Finish = finishFor(it.o, closed);
    if (hr.h != null) measured++;
    forms[`${f.cladding}, ${f.roof}`] = (forms[`${f.cladding}, ${f.roof}`] ?? 0) + 1;
    const base = Math.min(...ring.map(([x, z]) => yAt(x, z))) - 0.25;
    const ob = orientedBox(closed), half = ob.W / 2 + OVERHANG, pitch = (f.pitchDeg * Math.PI) / 180;
    const tall = hr.h ?? ASSUMED_HEIGHT;
    let eave: number, top: number;
    if (f.roof === 'low') { eave = Math.max(EAVE_MIN, tall); top = eave; }
    else {
      const rise = half * Math.tan(pitch);
      if (hr.h != null) { eave = Math.max(EAVE_MIN, hr.h - rise); top = Math.max(eave + 0.6, hr.h); }
      else { eave = 2.7; top = eave + rise; }
    }
    const wallB = f.cladding === 'brick' ? B.brick : B.board, wc = f.wall;
    const seed = h1(ring.length * 13.7 + ring[0][0] * 0.37 + ring[0][1] * 0.11), wallK = 0.94 + seed * 0.08;
    // walls, with occlusion baked in: darker at the foot, a little darker under the eaves
    let along = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
      if (L < 0.05) continue;
      const nrm = V(dz * out, 0, -dx * out).normalize();
      const yFoot = base + 1.05, yTop = base + eave + 0.25;
      const ao = (k: number) => tint(wc, k * wallK);
      wallB.face([V(a[0], base, a[1]), V(b[0], base, b[1]), V(b[0], yFoot, b[1]), V(a[0], yFoot, a[1])], nrm, [[along, 0], [along + L, 0], [along + L, yFoot - base], [along, yFoot - base]], [ao(0.62), ao(0.62), ao(0.97), ao(0.97)]);
      wallB.face([V(a[0], yFoot, a[1]), V(b[0], yFoot, b[1]), V(b[0], yTop, b[1]), V(a[0], yTop, a[1])], nrm, [[along, yFoot - base], [along + L, yFoot - base], [along + L, yTop - base], [along, yTop - base]], [ao(0.97), ao(0.97), ao(f.roof === 'low' ? 0.95 : 0.84), ao(f.roof === 'low' ? 0.95 : 0.84)]);
      if (f.roof === 'low') { // the parapet's inside face, down to the roof
        const yr = yTop - 0.4, inn = nrm.clone().negate();
        wallB.face([V(a[0], yr, a[1]), V(b[0], yr, b[1]), V(b[0], yTop, b[1]), V(a[0], yTop, a[1])], inn, [[along, 0], [along + L, 0], [along + L, 0.4], [along, 0.4]], [ao(0.7), ao(0.7), ao(0.9), ao(0.9)]);
      }
      // windows: a band per storey of 1.2 m panes, darker glass in a pale frame, set 20 mm proud
      if (L >= 2.6) {
        const storeys = Math.max(1, Math.floor((eave - 0.4) / STOREY)), ux = dx / L, uz = dz / L, inst = f.cladding === 'brick';
        const pane = 1.2, gap = inst ? 0.5 : 1.1, n = Math.max(1, Math.floor((L - 1.2 + gap) / (pane + gap))), run = n * pane + (n - 1) * gap, s0 = (L - run) / 2;
        for (let s = 0; s < storeys; s++) {
          const sill = base + 0.25 + s * STOREY + (inst ? 0.8 : 0.9), head = sill + (inst ? 1.5 : 1.2);
          if (head > base + eave + 0.1) break;
          for (let k = 0; k < n; k++) {
            if (h1(seed * 91 + i * 7 + k + s * 3) < 0.12) continue; // the odd blank bay
            const t0 = s0 + k * (pane + gap), p0 = [a[0] + ux * t0, a[1] + uz * t0], p1 = [a[0] + ux * (t0 + pane), a[1] + uz * (t0 + pane)];
            const off = (d: number, p: number[]) => [p[0] + nrm.x * d, p[1] + nrm.z * d];
            const fr = 0.06, q0 = off(0.012, [p0[0] - ux * fr, p0[1] - uz * fr]), q1 = off(0.012, [p1[0] + ux * fr, p1[1] + uz * fr]), g0 = off(0.022, p0), g1 = off(0.022, p1);
            const fc = new THREE.Color(inst ? 0x3a3d40 : 0xe9e6de);
            B.frame.face([V(q0[0], sill - fr, q0[1]), V(q1[0], sill - fr, q1[1]), V(q1[0], head + fr, q1[1]), V(q0[0], head + fr, q0[1])], nrm, [[0, 0], [1, 0], [1, 1], [0, 1]], [fc, fc, fc, fc]);
            const gk = 0.85 + h1(k + s * 5 + i) * 0.3, gc = tint(0x262b30, gk), gl = tint(0x3a4148, gk);
            B.glass.face([V(g0[0], sill, g0[1]), V(g1[0], sill, g1[1]), V(g1[0], head, g1[1]), V(g0[0], head, g0[1])], nrm, [[0, 0], [1, 0], [1, 1], [0, 1]], [gc, gc, gl, gl]);
          }
        }
      }
      along += L;
    }
    // the roof
    const rc = (k: number) => tint(f.roofColour, k * (0.95 + seed * 0.1));
    if (f.roof === 'low') {
      const yr = base + eave + 0.25 - 0.4, pts = ring.map(([x, z]) => new THREE.Vector2(x, z));
      const tris = THREE.ShapeUtils.triangulateShape(pts, []);
      for (const [a, b, c] of tris) B.roof.face([V(pts[a].x, yr, pts[a].y), V(pts[b].x, yr, pts[b].y), V(pts[c].x, yr, pts[c].y)], V(0, 1, 0), [[pts[a].x, pts[a].y], [pts[b].x, pts[b].y], [pts[c].x, pts[c].y]], [rc(0.9), rc(0.9), rc(0.9)]);
    } else {
      const ca = Math.cos(ob.angle), sa = Math.sin(ob.angle), at = (u: number, v: number, y: number) => V(ob.cx + u * ca - v * sa, y, ob.cz + u * sa + v * ca);
      const L2 = ob.L / 2 + OVERHANG, W2 = half, ye = base + 0.25 + eave - OVERHANG * Math.tan(pitch), yr = base + 0.25 + top, slope = Math.hypot(W2, yr - ye);
      const ridge = f.roof === 'gable' ? L2 : Math.max(0, L2 - W2);
      for (const sgn of [1, -1]) { // the two long slopes
        const nrm = V(-sa * sgn * (yr - ye), W2, ca * sgn * (yr - ye)).normalize();
        B.roof.face([at(-L2, sgn * W2, ye), at(L2, sgn * W2, ye), at(ridge, 0, yr), at(-ridge, 0, yr)], nrm, [[-L2, 0], [L2, 0], [ridge, slope], [-ridge, slope]], [rc(0.82), rc(0.82), rc(1), rc(1)]);
      }
      if (f.roof === 'hip') for (const sgn of [1, -1]) { // the hip ends
        const run = L2 - ridge, nrm = V(ca * sgn * (yr - ye), run, sa * sgn * (yr - ye)).normalize(), sl = Math.hypot(run, yr - ye);
        B.roof.face([at(sgn * L2, -W2, ye), at(sgn * L2, W2, ye), at(sgn * ridge, 0, yr)], nrm, [[-W2, 0], [W2, 0], [0, sl]], [rc(0.8), rc(0.8), rc(1)]);
      } else for (const sgn of [1, -1]) { // the gable ends, in the wall's own cladding
        const u = sgn * (ob.L / 2), nrm = V(ca * sgn, 0, sa * sgn), y0 = base + 0.25 + eave, w = ob.W / 2;
        wallB.face([at(u, -w, y0), at(u, w, y0), at(u, 0, y0 + w * Math.tan(pitch))], nrm, [[0, eave], [ob.W, eave], [w, eave + w * Math.tan(pitch)]], [tint(wc, 0.86 * wallK), tint(wc, 0.86 * wallK), tint(wc, 0.8 * wallK)]);
      }
    }
  }
  const credit = `Outlines from ${OUTLINE_CREDIT}${asOf ? ` (as of ${asOf})` : ''}`;
  const finishNote = 'Finish proposed by rule, not surveyed: painted weatherboard on smaller outlines and brick on larger institutional ones; a pitched corrugated-iron roof on small and medium near-rectangular outlines, a low longrun roof on large or irregular ones; windows as darker glass bands.';
  const wallMat = (set: PBRSet, name: string) => pbr(set, name, { vertexColors: true, roughness: 1, metalness: 0, metalnessMap: null });
  const parts: [Bucket, THREE.Material, string, string][] = [
    [B.board, wallMat(S.board, 'context_weatherboard'), 'context_walls_weatherboard', 'Painted weatherboard (proposed by rule, not surveyed)'],
    [B.brick, wallMat(S.brick, 'context_brick'), 'context_walls_brick', 'Brick (proposed by rule, not surveyed)'],
    [B.roof, pbr(S.roof, 'context_roof', { vertexColors: true, side: THREE.DoubleSide, metalness: 0.15, metalnessMap: null }), 'context_roofs', 'Corrugated iron and longrun roofs (proposed by rule, not surveyed)'],
    [B.frame, new THREE.MeshStandardMaterial({ name: 'context_window_frame', vertexColors: true, roughness: 0.55, metalness: 0 }), 'context_window_frames', 'Window frames (proposed by rule)'],
    [B.glass, new THREE.MeshPhysicalMaterial({ name: 'context_glass', vertexColors: true, roughness: 0.12, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.08 }), 'context_windows', 'Windows as darker glass bands (proposed by rule, not surveyed)'],
  ];
  for (const [bk, mat, name, label] of parts) {
    if (!bk.idx.length) continue;
    const m = bk.mesh(mat, name);
    m.userData = { kind: 'context', name: `Existing buildings: ${label}`, source: 'proposed by rule, not surveyed', note: `${credit} ${finishNote}` };
    g.add(m);
  }
  const formWords = Object.entries(forms).map(([k, v]) => `${v} ${k}`).join('; ');
  g.userData = { kind: 'context', name: 'Existing buildings', source: 'from the survey', note: `${items.length} existing buildings from LINZ outlines; ${measured} with heights from LiDAR (surface less ground), the rest assumed at ${ASSUMED_HEIGHT} m. Finishes proposed by rule, not surveyed (${formWords}). ${credit}` };
  return { group: g, measured, total: items.length };
}
