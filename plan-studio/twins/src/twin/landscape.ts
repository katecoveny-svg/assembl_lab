import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bake, fbm, hex, mix, pbr, type PBRSet } from '../objects/tex';
import { boxUV, detail, type Quality } from '../objects/util';
import type { Placement as PlantAt, Species } from './plants';

// Landscape pieces for a site twin: paths that follow the ground, mulched beds with layered native
// planting, and a paling fence on the boundary. Site coordinates are (e, n) metres; three's frame is
// x = e, y = height, z = −n. Everything here is proposed unless a caller says otherwise.

type Pt = [number, number];
export type Ground = (e: number, n: number) => number;

const cache = new Map<string, { mulch: THREE.MeshPhysicalMaterial; path: THREE.MeshPhysicalMaterial; edge: THREE.MeshStandardMaterial; fence: THREE.MeshPhysicalMaterial; sets: Record<string, PBRSet> }>();

/** bark mulch: chips of mixed size, dark and warm, with soft occlusion between them */
function mulchSet(size: number) {
  const A = hex(0x4a3324);
  const B = hex(0x2a1c14);
  const C = hex(0x6b4a33);
  return bake(
    size,
    1.0,
    (u, v) => {
      const big = fbm(u, v, 22, 22, 2, 301);
      const small = fbm(u * 1.7 + 0.3, v * 1.3, 48, 48, 2, 302);
      const chip = Math.max(big, small);
      const t = fbm(u, v, 9, 9, 3, 303);
      const c = chip > 0.62 ? (t > 0.55 ? C : A) : B;
      const k = 0.8 + 0.4 * chip;
      return { c: [c[0] * k, c[1] * k, c[2] * k], h: chip, r: 0.92, m: 0, o: 0.6 + 0.4 * chip };
    },
    2.2,
    'bark_mulch',
  );
}
/** permeable path: compacted fine gravel, warm grey */
function pathSet(size: number) {
  const G = hex(0xa69c8c);
  const D = hex(0x7a7064);
  return bake(
    size,
    0.8,
    (u, v) => {
      const s = fbm(u, v, 80, 80, 2, 311);
      const t = fbm(u, v, 6, 6, 3, 312);
      const c: [number, number, number] = [mix(G[0], D[0], s * 0.8 + t * 0.2), mix(G[1], D[1], s * 0.8 + t * 0.2), mix(G[2], D[2], s * 0.8 + t * 0.2)];
      return { c, h: s, r: 0.95, m: 0, o: 0.75 + 0.25 * s };
    },
    1.6,
    'permeable_gravel_path',
  );
}
/** rough-sawn palings, black stain */
function palingSet(size: number) {
  const C = hex(0x2c2724);
  const D = hex(0x1b1715);
  return bake(
    size,
    0.6,
    (u, v) => {
      const g = fbm(u, v, 3, 60, 3, 321);
      const saw = fbm(u, v, 40, 4, 2, 322);
      const t = 0.5 * g + 0.5 * saw;
      return { c: [mix(C[0], D[0], t), mix(C[1], D[1], t), mix(C[2], D[2], t)], h: saw, r: 0.86, m: 0 };
    },
    1.4,
    'paling_black_stain',
  );
}

export function landMats(q: Quality) {
  const hit = cache.get(q);
  if (hit) return hit;
  const d = q === 'hq' ? detail('hq') : { ...detail('web'), tex: 1024, texS: 512 };
  const sets = { mulch: mulchSet(d.texS), path: pathSet(d.texS), fence: palingSet(d.texS) };
  const m = {
    sets,
    mulch: pbr(sets.mulch, 'bark_mulch'),
    path: pbr(sets.path, 'permeable_gravel_path'),
    edge: new THREE.MeshStandardMaterial({ name: 'steel_edging_corten', color: 0x5a3a26, roughness: 0.7, metalness: 0.4 }),
    fence: pbr(sets.fence, 'paling_black_stain'),
  };
  cache.set(q, m);
  return m;
}

const uvTop = (G: THREE.BufferGeometry, tile: number) => {
  const p = G.getAttribute('position');
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[2 * i] = p.getX(i) / tile;
    uv[2 * i + 1] = -p.getZ(i) / tile;
  }
  G.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return G;
};

/** resample a polyline every `step` metres */
function resample(pts: Pt[], step: number): Pt[] {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(L / step));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

/** a ribbon of width w along a polyline, draped on the ground; with steel edging both sides */
export function pathRibbon(name: string, pts: Pt[], w: number, ground: Ground, q: Quality, note: string) {
  const M = landMats(q);
  const P = resample(pts, 0.4);
  const pos: number[] = [];
  const idx: number[] = [];
  const edges: THREE.BufferGeometry[] = [];
  const side: Pt[][] = [[], []];
  P.forEach((p, i) => {
    const a = P[Math.max(0, i - 1)];
    const b = P[Math.min(P.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dn = b[1] - a[1];
    const L = Math.hypot(dx, dn) || 1;
    const nx = -dn / L;
    const nn = dx / L;
    for (const s of [-1, 1]) {
      const e = p[0] + (s * nx * w) / 2;
      const n = p[1] + (s * nn * w) / 2;
      pos.push(e, ground(e, n) + 0.025, -n);
      side[s < 0 ? 0 : 1].push([e, n]);
    }
    if (i > 0) {
      const k = (i - 1) * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  });
  const G = new THREE.BufferGeometry();
  G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  G.setIndex(idx);
  G.computeVertexNormals();
  const m = new THREE.Mesh(uvTop(G, M.sets.path.tile), M.path);
  m.name = name;
  m.receiveShadow = true;
  m.userData = { kind: 'landscape', name: 'Permeable path', material: 'compacted fine gravel between steel edging', source: 'scaled', note };
  for (const s of side) {
    for (let i = 1; i < s.length; i++) {
      const [a, b] = [s[i - 1], s[i]];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const g = new THREE.BoxGeometry(L + 0.01, 0.08, 0.006);
      g.rotateY(Math.atan2(b[1] - a[1], b[0] - a[0]));
      const e = (a[0] + b[0]) / 2;
      const n = (a[1] + b[1]) / 2;
      g.translate(e, ground(e, n) + 0.02, -n);
      edges.push(g);
    }
  }
  const eg = new THREE.Mesh(mergeGeometries(edges), M.edge);
  eg.name = `${name}_edging`;
  eg.castShadow = eg.receiveShadow = true;
  const g = new THREE.Group();
  g.name = name;
  g.add(m, eg);
  return g;
}

/** a mulched bed: polygon in site coords, draped just above the ground */
export function mulchBed(name: string, poly: Pt[], ground: Ground, q: Quality) {
  const M = landMats(q);
  const shape = new THREE.Shape(poly.map(([e, n]) => new THREE.Vector2(e, n)));
  const G = new THREE.ShapeGeometry(shape, 1);
  // subdivide by resampling the triangles onto a grid would be ideal; drape the vertices instead
  const tess = tessellate(G, 0.5);
  const p = tess.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const e = p.getX(i);
    const n = p.getY(i);
    p.setXYZ(i, e, ground(e, n) + 0.03, -n);
  }
  tess.computeVertexNormals();
  const m = new THREE.Mesh(uvTop(tess, M.sets.mulch.tile), M.mulch);
  m.name = name;
  m.receiveShadow = true;
  m.userData = { kind: 'landscape', name: 'Planted bed, bark mulch', source: 'proposed' };
  return m;
}

/** split triangles until no edge is longer than max (so a bed can follow the ground) */
function tessellate(G: THREE.BufferGeometry, max: number) {
  const src = G.index ? G.toNonIndexed() : G;
  const p = src.getAttribute('position');
  let tris: number[][] = [];
  for (let i = 0; i < p.count; i += 3) tris.push([p.getX(i), p.getY(i), p.getX(i + 1), p.getY(i + 1), p.getX(i + 2), p.getY(i + 2)]);
  for (let pass = 0; pass < 8; pass++) {
    const next: number[][] = [];
    let split = false;
    for (const t of tris) {
      const [ax, ay, bx, by, cx, cy] = t;
      const l = [Math.hypot(bx - ax, by - ay), Math.hypot(cx - bx, cy - by), Math.hypot(ax - cx, ay - cy)];
      const k = l.indexOf(Math.max(...l));
      if (l[k] <= max) {
        next.push(t);
        continue;
      }
      split = true;
      const P = [
        [ax, ay],
        [bx, by],
        [cx, cy],
      ];
      const a = P[k];
      const b = P[(k + 1) % 3];
      const c = P[(k + 2) % 3];
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      next.push([a[0], a[1], m[0], m[1], c[0], c[1]], [m[0], m[1], b[0], b[1], c[0], c[1]]);
    }
    tris = next;
    if (!split) break;
  }
  const out = new THREE.BufferGeometry();
  const pos = new Float32Array(tris.length * 9);
  tris.forEach((t, i) => {
    pos.set([t[0], t[1], 0, t[2], t[3], 0, t[4], t[5], 0], i * 9);
  });
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return out;
}

/** a 1.8 m paling fence along a polyline: posts at 2.4 m, three rails, 150 mm palings with 12 mm gaps */
export function palingFence(name: string, pts: Pt[], ground: Ground, q: Quality, h = 1.8) {
  const M = landMats(q);
  const posts: THREE.BufferGeometry[] = [];
  const rails: THREE.BufferGeometry[] = [];
  const pal: THREE.BufferGeometry[] = [];
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const at = (s: number): Pt => [a[0] + ((b[0] - a[0]) * s) / L, a[1] + ((b[1] - a[1]) * s) / L];
    const nP = Math.max(1, Math.round(L / 2.4));
    for (let k = 0; k <= nP; k++) {
      const [e, n] = at((k * L) / nP);
      const g0 = ground(e, n);
      const g = new THREE.BoxGeometry(0.1, h + 0.05, 0.1);
      g.translate(e, g0 + (h + 0.05) / 2, -n);
      posts.push(g);
    }
    for (let s = 0.0; s < L; s += 0.162) {
      const [e, n] = at(s + 0.075);
      const g0 = ground(e, n);
      const g = new THREE.BoxGeometry(0.15, h - 0.05, 0.019);
      g.rotateY(ang);
      // palings on the outside face of the rails
      g.translate(e - Math.sin(ang) * -0.07, g0 + 0.05 + (h - 0.05) / 2, -(n + Math.cos(ang) * -0.07));
      pal.push(boxUV(g, 0.6, 'y'));
    }
    for (let k = 0; k < nP; k++) {
      const s0 = (k * L) / nP;
      const s1 = ((k + 1) * L) / nP;
      const [e0, n0] = at(s0);
      const [e1, n1] = at(s1);
      const em = (e0 + e1) / 2;
      const nm = (n0 + n1) / 2;
      const gm = (ground(e0, n0) + ground(e1, n1)) / 2;
      for (const y of [0.25, h / 2, h - 0.2]) {
        const g = new THREE.BoxGeometry(s1 - s0, 0.075, 0.05);
        g.rotateY(ang);
        g.translate(em - Math.sin(ang) * -0.025, gm + y, -(nm + Math.cos(ang) * -0.025));
        rails.push(g);
      }
    }
  }
  const g = new THREE.Group();
  g.name = name;
  const mk = (nm: string, geos: THREE.BufferGeometry[]) => {
    const m = new THREE.Mesh(mergeGeometries(geos), M.fence);
    m.name = nm;
    m.castShadow = m.receiveShadow = true;
    m.userData = { kind: 'landscape', name: 'Boundary fence, 1.8 m timber palings, black stain', source: 'proposed', note: 'Not on the drawings. A typical side and rear boundary fence, shown for context.' };
    return m;
  };
  g.add(mk(`${name}_posts`, posts), mk(`${name}_rails`, rails), mk(`${name}_palings`, pal));
  return g;
}

/** fill a bed with layered natives: taller structure at the back (toward `back`), grasses and ferns at the front */
export function bedPlanting(poly: Pt[], ground: Ground, opts: { back?: Pt; shade?: boolean; density?: number; seed?: number; skip?: (e: number, n: number) => boolean }) {
  const out: PlantAt[] = [];
  let s = opts.seed ?? 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let minE = Infinity;
  let maxE = -Infinity;
  let minN = Infinity;
  let maxN = -Infinity;
  for (const [e, n] of poly) {
    minE = Math.min(minE, e);
    maxE = Math.max(maxE, e);
    minN = Math.min(minN, n);
    maxN = Math.max(maxN, n);
  }
  const inPoly = (e: number, n: number) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > n !== yj > n && e < ((xj - xi) * (n - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const step = 0.55 / Math.sqrt(opts.density ?? 1);
  const back = opts.back;
  // distance to the back line, normalised across the bed
  const depthOf = (e: number, n: number) => {
    if (!back) return 0.5;
    return Math.min(1, Math.max(0, Math.hypot(e - back[0], n - back[1]) / 2.2));
  };
  const shadeMix: Species[] = ['fern', 'fern', 'kawakawa', 'carex', 'wheki'];
  const sunBack: Species[] = ['harakeke', 'hebe', 'coprosma', 'harakeke'];
  const sunFront: Species[] = ['carex', 'tussock', 'carex', 'fern'];
  for (let e = minE + step / 2; e < maxE; e += step) {
    for (let n = minN + step / 2; n < maxN; n += step) {
      const je = e + (rnd() - 0.5) * step * 0.9;
      const jn = n + (rnd() - 0.5) * step * 0.9;
      if (!inPoly(je, jn) || opts.skip?.(je, jn)) continue;
      if (rnd() < 0.18) continue;
      const d = depthOf(je, jn);
      let sp: Species;
      if (opts.shade) sp = shadeMix[Math.floor(rnd() * shadeMix.length)];
      else sp = d < 0.45 ? sunBack[Math.floor(rnd() * sunBack.length)] : sunFront[Math.floor(rnd() * sunFront.length)];
      if (sp === 'wheki' && rnd() < 0.7) sp = 'fern';
      const sc = sp === 'harakeke' ? 0.75 + rnd() * 0.35 : sp === 'carex' || sp === 'tussock' ? 0.8 + rnd() * 0.4 : 0.7 + rnd() * 0.5;
      out.push({ sp, x: je, y: ground(je, jn) + 0.02, z: -jn, s: sc, r: rnd() * Math.PI * 2 });
    }
  }
  return out;
}

/** horizontal painted weatherboards (bevel-back, 150 mm cover) for the existing villa-era house */
export function weatherboardSet(size: number, colour = 0xe6e0d4) {
  const C = hex(colour);
  return bake(
    size,
    0.9,
    (u, v) => {
      const boards = 6;
      const b = v * boards;
      const f = b - Math.floor(b);
      // each board is thicker at the bottom: the lower edge throws a shadow line
      const shade = f < 0.06 ? 0.55 + f * 5 : 0.9 + 0.1 * f;
      const n = fbm(u, v, 8, 2, 3, 331);
      const k = shade * (0.97 + 0.04 * n);
      return { c: [C[0] * k, C[1] * k, C[2] * k], h: f < 0.06 ? 0 : 0.3 + 0.7 * f, r: 0.6 + 0.1 * n, m: 0 };
    },
    2.4,
    'weatherboard_painted',
  );
}

/** painted brick, as on the existing house (from Kate's photos): 230 × 76 mm bricks, 10 mm recessed joints, pitted face, white paint */
export function paintedBrickSet(size: number, colour = 0xeef0ee) {
  const C = hex(colour);
  const courses = 8;
  const course = 0.086;
  return bake(
    size,
    courses * course,
    (u, v) => {
      const r = Math.floor(v * courses);
      const fv = v * courses - r;
      const perRow = 2.98;
      const along = u * perRow + (r % 2) * 0.5;
      const fu = along - Math.floor(along);
      const joint = fv < 0.12 || fu < 0.042;
      const pit = fbm(u, v, 90, 90, 2, 341) > 0.74 ? 1 : 0;
      const n = fbm(u, v, 24, 24, 3, 342);
      const k = joint ? 0.9 : (0.96 + 0.05 * n) * (pit ? 0.88 : 1);
      return { c: [C[0] * k, C[1] * k, C[2] * k * 1.005], h: joint ? 0.0 : 0.75 + 0.1 * n - pit * 0.25, r: 0.8 + 0.08 * n, m: 0, o: joint ? 0.72 : 1 };
    },
    3.0,
    'painted_brick',
  );
}

/** profiled concrete roof tiles, weathered charcoal brown (existing house roof, from Kate's photos) */
export function concreteTileSet(size: number, colour = 0x4a403a) {
  const C = hex(colour);
  return bake(
    size,
    0.9,
    (u, v) => {
      const rows = 2.4;
      const r = v * rows;
      const fr = r - Math.floor(r);
      const wave = Math.sin(u * Math.PI * 2 * 3) * 0.5 + 0.5;
      const lap = fr > 0.9 ? 0.55 : 1;
      const n = fbm(u, v, 12, 12, 4, 351);
      const lichen = fbm(u, v, 5, 5, 3, 352) > 0.68 ? 0.85 : 1;
      const k = lap * (0.82 + 0.25 * wave) * (0.92 + 0.12 * n) * lichen;
      return { c: [C[0] * k, C[1] * k, C[2] * k], h: wave * 0.8 + (fr > 0.9 ? -0.3 : 0), r: 0.8, m: 0 };
    },
    2.4,
    'concrete_roof_tile',
  );
}
