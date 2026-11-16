import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { boxUV, type Quality } from '../objects/util';
import { twinMats } from './mats';
import type { Limit } from './homes';

// The survey layer: ground from the traced contours and spot levels, the boundary from the
// surveyed bearings, the existing dwelling as massing, services, yards, and the planning
// envelope (height in relation to boundary and maximum height) as a surface you can check
// the homes against. Site (e, n) → three (x = e, y = RL, z = −n).

type Pt = [number, number];

export interface SiteData {
  schema: string;
  job: string;
  frame: string;
  sources: string[];
  derivation: Record<string, string>;
  datumOffset: number;
  units: Record<string, { origin: Pt; u: Pt; v: Pt; bearing: number; ffl: number; fflDrawing: number; measuredFootprint: Pt }>;
  boundary: { NW: Pt; NE: Pt; E: Pt; Sp: Pt; SW: Pt };
  lotLine: Pt[];
  existing: { outline: Pt[]; area: number; eave: number; west: { ffl: number; ridge: number; rect: Pt[] }; east: { ffl: number; ridge: number; rect: Pt[] } };
  stormwater: Pt[];
  trees: Pt[];
  hedge: Pt[];
  impervious: { polys: Pt[][]; note: string };
  planning: { zone: string; maxHeight: number; hirb: { height: number; angle: number }; yards: { front: number; side: number; rear: number }; source: string };
  drawn: Record<string, unknown>;
  dtm: { x0: number; z0: number; h: number; nx: number; nz: number; base: number; scale: number; data: string };
  contours: { rl: number; pts: Pt[] }[];
}

export const toV3 = (e: number, n: number, y: number) => new THREE.Vector3(e, y, -n);

export function inPoly(p: Pt, poly: Pt[]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function closestOnSeg(p: Pt, a: Pt, b: Pt): [Pt, number] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  const q: Pt = [a[0] + dx * t, a[1] + dy * t];
  return [q, Math.hypot(p[0] - q[0], p[1] - q[1])];
}
function hull(pts: Pt[]): Pt[] {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: Pt[] = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up: Pt[] = [];
  for (const q of p.reverse()) {
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

export class Site {
  data: SiteData;
  grid: Float32Array;
  lot: Pt[];
  leg: Pt[];
  pads: { key: string; hull: Pt[]; level: number }[] = [];
  /** boundaries the height-in-relation-to-boundary rule applies to */
  hirbEdges: { a: Pt; b: Pt; name: string }[] = [];

  constructor(data: SiteData) {
    this.data = data;
    const bin = atob(data.dtm.data);
    const u16 = new Uint16Array(bin.length / 2);
    for (let i = 0; i < u16.length; i++) u16[i] = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
    this.grid = new Float32Array(u16.length);
    for (let i = 0; i < u16.length; i++) this.grid[i] = data.dtm.base + u16[i] * data.dtm.scale;
    const B = data.boundary;
    this.lot = [B.NW, B.NE, B.E, B.Sp, B.SW];
    const b = (114 * Math.PI) / 180;
    const d: Pt = [33.19 * Math.sin(b), 33.19 * Math.cos(b)];
    this.leg = [B.E, [B.E[0] + d[0], B.E[1] + d[1]], [B.Sp[0] + d[0], B.Sp[1] + d[1]], B.Sp];
    this.hirbEdges = [
      { a: B.NW, b: B.NE, name: 'rear boundary (north)' },
      { a: B.SW, b: B.NW, name: 'west side boundary' },
      { a: B.NE, b: B.E, name: 'east side boundary' },
      { a: data.lotLine[0], b: data.lotLine[1], name: 'boundary between lots 1 and 2 (traced)' },
    ];
  }

  /** surveyed (existing) ground RL at (e, n): bilinear on the 0.5 m grid, clamped at its edge */
  existing(e: number, n: number) {
    const { x0, z0, h, nx, nz } = this.data.dtm;
    const j = Math.min(nx - 1.001, Math.max(0, (e - x0) / h));
    const i = Math.min(nz - 1.001, Math.max(0, (n - z0) / h));
    const j0 = Math.floor(j);
    const i0 = Math.floor(i);
    const fj = j - j0;
    const fi = i - i0;
    const g = this.grid;
    const a = g[i0 * nx + j0];
    const b = g[i0 * nx + j0 + 1];
    const c = g[(i0 + 1) * nx + j0];
    const d = g[(i0 + 1) * nx + j0 + 1];
    return a * (1 - fj) * (1 - fi) + b * fj * (1 - fi) + c * (1 - fj) * fi + d * fj * fi;
  }

  /** proposed ground: the surveyed ground, cut down to a pad under each home and its decks */
  ground = (e: number, n: number) => {
    let y = this.existing(e, n);
    for (const p of this.pads) if (inPoly([e, n], p.hull)) y = Math.min(y, p.level);
    return y;
  };

  /** the ground the terrain mesh uses: pads widened by `ext` so the step sits behind the retaining wall */
  meshGround(e: number, n: number, ext: number) {
    let y = this.existing(e, n);
    for (const p of this.pads) {
      if (y <= p.level) continue;
      if (inPoly([e, n], p.hull)) y = p.level;
      else {
        let d = Infinity;
        for (let i = 0; i < p.hull.length; i++) d = Math.min(d, closestOnSeg([e, n], p.hull[i], p.hull[(i + 1) % p.hull.length])[1]);
        if (d < ext) y = p.level;
      }
    }
    return y;
  }

  addPad(key: string, pts: Pt[], level: number) {
    this.pads.push({ key, hull: hull(pts), level });
  }

  /** the yard limits a unit's decks are clipped to, as half-planes with inward normals */
  yardLimits(key: string): Limit[] {
    const out: Limit[] = [];
    const inward = (a: Pt, b: Pt, inside: Pt): Pt => {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l = Math.hypot(dx, dy);
      let n: Pt = [-dy / l, dx / l];
      if ((inside[0] - a[0]) * n[0] + (inside[1] - a[1]) * n[1] < 0) n = [-n[0], -n[1]];
      return n;
    };
    const c = this.data.units[key].origin;
    const B = this.data.boundary;
    const side = this.data.planning.yards.side;
    out.push({ a: B.NW, n: inward(B.NW, B.NE, c), offset: this.data.planning.yards.rear, name: 'rear yard' });
    out.push({ a: B.SW, n: inward(B.SW, B.NW, c), offset: side, name: 'west side yard' });
    out.push({ a: B.NE, n: inward(B.NE, B.E, c), offset: side, name: 'east side yard' });
    const L = this.data.lotLine;
    out.push({ a: L[0], n: inward(L[0], L[1], c), offset: side, name: 'yard to the lot boundary' });
    return out;
  }

  /** the planning envelope RL at (e, n): min of HIRB planes and maximum height */
  envelope(e: number, n: number) {
    const { hirb, maxHeight } = this.data.planning;
    let H = this.existing(e, n) + maxHeight;
    let by = 'maximum height 8 m';
    const k = Math.tan((hirb.angle * Math.PI) / 180);
    for (const ed of this.hirbEdges) {
      const [q, d] = closestOnSeg([e, n], ed.a, ed.b);
      const h = this.existing(q[0], q[1]) + hirb.height + d * k;
      if (h < H) {
        H = h;
        by = `HIRB from the ${ed.name}`;
      }
    }
    return { H, by };
  }

  // --- meshes ---------------------------------------------------------------------------------
  build(q: Quality) {
    const M = twinMats(q);
    const root = new THREE.Group();
    root.name = 'site_survey';
    root.add(this.terrain(q));
    root.add(this.retaining(q));
    const lines = this.lines();
    root.add(lines);
    root.add(this.existingDwelling(q));
    root.userData = { kind: 'survey', note: 'Traced from the topographical survey; not survey-grade.' };
    void M;
    return root;
  }

  terrain(q: Quality) {
    const M = twinMats(q);
    const g = new THREE.Group();
    g.name = 'terrain';
    // fine mesh over the lot and surrounds, coarse skirt beyond
    const make = (x0: number, x1: number, n0: number, n1: number, h: number, hole?: [number, number, number, number]) => {
      const nx = Math.round((x1 - x0) / h);
      const nz = Math.round((n1 - n0) / h);
      const pos: number[] = [];
      const col: number[] = [];
      const idxLawn: number[] = [];
      const idxDrive: number[] = [];
      const vid = (i: number, j: number) => i * (nx + 1) + j;
      for (let i = 0; i <= nz; i++) {
        for (let j = 0; j <= nx; j++) {
          const e = x0 + j * h;
          const n = n0 + i * h;
          pos.push(e, this.meshGround(e, n, h * 1.6), -n);
          const inside = inPoly([e, n], this.lot) || inPoly([e, n], this.leg);
          const k = inside ? 1 : 0.72;
          col.push(k, inside ? 1 : 0.76, k);
        }
      }
      const drive = this.data.impervious.polys;
      for (let i = 0; i < nz; i++) {
        for (let j = 0; j < nx; j++) {
          const e = x0 + (j + 0.5) * h;
          const n = n0 + (i + 0.5) * h;
          if (hole && e > hole[0] && e < hole[1] && n > hole[2] && n < hole[3]) continue;
          const a = vid(i, j);
          const b = vid(i, j + 1);
          const c = vid(i + 1, j);
          const d = vid(i + 1, j + 1);
          const target = drive.some((p) => inPoly([e, n], p)) ? idxDrive : idxLawn;
          target.push(a, b, c, b, d, c);
        }
      }
      const geo = (idx: number[]) => {
        const G = new THREE.BufferGeometry();
        G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        G.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        G.setIndex(idx);
        G.computeVertexNormals();
        return G;
      };
      return { lawn: geo(idxLawn), drive: geo(idxDrive) };
    };
    const fineH = q === 'hq' ? 0.2 : 0.25;
    const fine = make(-8, 52, -42, 8, fineH);
    const coarse = make(-60, 110, -100, 50, 2.5, [-8, 52, -42, 8]);
    const lawnM = M.lawn.clone();
    lawnM.vertexColors = true;
    lawnM.name = 'lawn_ground';
    const driveM = M.drive.clone();
    driveM.vertexColors = true;
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
    for (const [name, part, mat, tile] of [
      ['ground_lawn', fine.lawn, lawnM, M.sets.lawn.tile],
      ['ground_concrete', fine.drive, driveM, M.sets.drive.tile],
      ['ground_context', coarse.lawn, lawnM, M.sets.lawn.tile],
    ] as const) {
      const m = new THREE.Mesh(uvTop(part, tile), mat);
      m.name = name;
      m.receiveShadow = true;
      m.userData = { kind: 'terrain', source: 'survey', note: name === 'ground_context' ? 'beyond the survey: extrapolated, for context only' : 'surveyed ground; cut to pads under the proposed homes' };
      g.add(m);
    }
    return g;
  }

  /** concrete retaining walls where a pad cuts more than 150 mm into the surveyed ground: a continuous ribbon whose top follows the ground */
  retaining(q: Quality) {
    const M = twinMats(q);
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const tile = M.sets.concrete.tile;
    const runs: { key: string; length: number; maxH: number }[] = [];
    const T = 0.2;
    const quad = (a: number, b: number, c: number, d: number) => idx.push(a, b, c, a, c, d);
    for (const p of this.pads) {
      let length = 0;
      let maxH = 0;
      const H = p.hull;
      for (let i = 0; i < H.length; i++) {
        const a = H[i];
        const b = H[(i + 1) % H.length];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const n = Math.max(1, Math.round(L / 0.25));
        const dir: Pt = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
        const out: Pt = [dir[1], -dir[0]];
        // samples along the edge, grouped into runs where the cut is worth a wall
        let run: { e: number; n: number; top: number; s: number }[] = [];
        const flush = () => {
          if (run.length >= 2) {
            const base = pos.length / 3;
            for (const r of run) {
              const ie = r.e;
              const inn = r.n;
              const oe = r.e + out[0] * T;
              const on = r.n + out[1] * T;
              const bot = p.level - 0.15;
              // inner bottom, inner top, outer top, outer bottom
              pos.push(ie, bot, -inn, ie, r.top, -inn, oe, r.top, -on, oe, bot, -on);
              uv.push(r.s / tile, bot / tile, r.s / tile, r.top / tile, r.s / tile, (r.top + T) / tile, r.s / tile, bot / tile);
            }
            for (let k = 0; k < run.length - 1; k++) {
              const A = base + k * 4;
              const B = A + 4;
              quad(A, B, B + 1, A + 1); // inner face
              quad(A + 1, B + 1, B + 2, A + 2); // top
              quad(A + 2, B + 2, B + 3, A + 3); // outer face
            }
            const f = base;
            const l = base + (run.length - 1) * 4;
            quad(f, f + 1, f + 2, f + 3);
            quad(l + 3, l + 2, l + 1, l);
          }
          run = [];
        };
        for (let k = 0; k <= n; k++) {
          const t = (k / n) * L;
          const e = a[0] + dir[0] * t;
          const nn = a[1] + dir[1] * t;
          const ex = this.existing(e + out[0] * 0.3, nn + out[1] * 0.3);
          const cut = ex - p.level;
          if (cut < 0.15) {
            flush();
            continue;
          }
          if (run.length) length += L / n;
          maxH = Math.max(maxH, cut);
          run.push({ e, n: nn, top: ex + 0.08, s: t });
        }
        flush();
      }
      runs.push({ key: p.key, length: +length.toFixed(1), maxH: +maxH.toFixed(2) });
    }
    const g = new THREE.Group();
    g.name = 'retaining_walls';
    if (idx.length) {
      const G = new THREE.BufferGeometry();
      G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      G.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      G.setIndex(idx);
      G.computeVertexNormals();
      const m = new THREE.Mesh(G, M.concrete);
      (m.material as THREE.Material).side = THREE.DoubleSide;
      m.name = 'retaining_walls_concrete';
      m.castShadow = m.receiveShadow = true;
      m.userData = { ifcClass: 'IfcWall', predefinedType: 'SOLIDWALL', material: 'concrete retaining wall (RW), 200 mm', source: 'assumed', note: 'where the pad cuts more than 150 mm into the surveyed ground; RC-09 shows a concrete retaining wall (RW) but not its line' };
      g.add(m);
    }
    g.userData.runs = runs;
    return g;
  }

  lines() {
    const g = new THREE.Group();
    g.name = 'survey_lines';
    const line = (pts: Pt[], colour: number, lift: number, name: string, dashed = false, close = false, opacity = 1) => {
      const p = close ? [...pts, pts[0]] : pts;
      // densify so the line follows the ground
      const v: THREE.Vector3[] = [];
      for (let i = 0; i < p.length - 1; i++) {
        const a = p[i];
        const b = p[i + 1];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const n = Math.max(1, Math.ceil(L / 0.5));
        for (let k = 0; k < n; k++) {
          const e = a[0] + ((b[0] - a[0]) * k) / n;
          const nn = a[1] + ((b[1] - a[1]) * k) / n;
          v.push(toV3(e, nn, this.existing(e, nn) + lift));
        }
      }
      const last = p[p.length - 1];
      v.push(toV3(last[0], last[1], this.existing(last[0], last[1]) + lift));
      const geo = new THREE.BufferGeometry().setFromPoints(v);
      const mat = dashed ? new THREE.LineDashedMaterial({ color: colour, dashSize: 0.6, gapSize: 0.35, transparent: opacity < 1, opacity }) : new THREE.LineBasicMaterial({ color: colour, transparent: opacity < 1, opacity });
      const l = new THREE.Line(geo, mat);
      if (dashed) l.computeLineDistances();
      l.name = name;
      return l;
    };
    const B = this.data.boundary;
    const bnd = line([B.NW, B.NE, B.E, ...this.leg.slice(1, 3), B.Sp, B.SW], 0x240b21, 0.05, 'boundary', false, true);
    bnd.userData = { kind: 'boundary', note: 'From surveyed bearings and distances' };
    g.add(bnd);
    g.add(line(this.data.lotLine, 0x240b21, 0.05, 'boundary_between_lots', true));
    g.add(line(this.data.stormwater, 0x3d6f8c, 0.04, 'stormwater_225_gis', true));
    // yards: 1 m inside rear and side boundaries
    const inset = (a: Pt, b: Pt, d: number): Pt[] => {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l = Math.hypot(dx, dy);
      const n: Pt = [dy / l, -dx / l];
      // inward for a clockwise lot
      return [
        [a[0] + n[0] * d, a[1] + n[1] * d],
        [b[0] + n[0] * d, b[1] + n[1] * d],
      ];
    };
    for (const [a, b] of [
      [B.NW, B.NE],
      [B.NE, B.E],
      [B.SW, B.NW],
    ] as [Pt, Pt][]) {
      g.add(line(inset(a, b, 1), 0x916a70, 0.04, 'yard_1m', true, false, 0.9));
    }
    // contours
    const cg = new THREE.Group();
    cg.name = 'contours';
    const majorM = new THREE.LineBasicMaterial({ color: 0x654a4e, transparent: true, opacity: 0.75 });
    const minorM = new THREE.LineBasicMaterial({ color: 0x654a4e, transparent: true, opacity: 0.35 });
    for (const c of this.data.contours) {
      const major = Math.abs(c.rl - Math.round(c.rl)) < 1e-6;
      let run: THREE.Vector3[] = [];
      const flush = () => {
        if (run.length > 1) {
          const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(run), major ? majorM : minorM);
          l.name = `contour_${c.rl.toFixed(1)}`;
          l.userData = { kind: 'contour', rl: c.rl };
          cg.add(l);
        }
        run = [];
      };
      for (const [e, n] of c.pts) {
        if (inPoly([e, n], this.lot) || inPoly([e, n], this.leg)) run.push(toV3(e, n, this.existing(e, n) + 0.03));
        else flush();
      }
      flush();
    }
    g.add(cg);
    // boundary pegs
    const pegG: THREE.BufferGeometry[] = [];
    for (const p of [B.NW, B.NE, B.E, B.Sp, B.SW]) {
      const c = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8);
      c.translate(p[0], this.existing(p[0], p[1]) + 0.2, -p[1]);
      pegG.push(c);
    }
    const pegs = new THREE.Mesh(mergeGeometries(pegG), new THREE.MeshStandardMaterial({ color: 0x240b21, roughness: 0.6 }));
    pegs.name = 'boundary_pegs';
    g.add(pegs);
    return g;
  }

  /** existing dwelling (units 16A and 16B): massing only, walls to the surveyed eave, hips to the ridge RLs */
  existingDwelling(q: Quality) {
    const M = twinMats(q);
    const g = new THREE.Group();
    g.name = 'existing_dwelling';
    const E = this.data.existing;
    for (const [name, part] of [
      ['west', E.west],
      ['east', E.east],
    ] as const) {
      const r = part.rect;
      // long axis
      const e01 = Math.hypot(r[1][0] - r[0][0], r[1][1] - r[0][1]);
      const e12 = Math.hypot(r[2][0] - r[1][0], r[2][1] - r[1][1]);
      const R = e01 >= e12 ? r : [r[1], r[2], r[3], r[0]];
      const Lx = Math.max(e01, e12);
      const Sx = Math.min(e01, e12);
      const base = Math.min(...R.map((p) => this.existing(p[0], p[1]))) - 0.15;
      const eave = E.eave;
      // walls: an extruded rectangle from base to eave
      const shape = new THREE.Shape(R.map(([e, n]) => new THREE.Vector2(e, n)));
      const wg = new THREE.ExtrudeGeometry(shape, { depth: eave - base, bevelEnabled: false });
      wg.rotateX(-Math.PI / 2); // shape (e, n) → (x, −z); extrusion along +y
      wg.translate(0, base, 0);
      const walls = new THREE.Mesh(boxUV(wg, 1, 'x'), M.existingWall);
      walls.name = `existing_${name}_walls`;
      walls.castShadow = walls.receiveShadow = true;
      walls.userData = { ifcClass: 'IfcBuildingElementProxy', name: `Existing dwelling, ${name} part`, eave: eave, ridge: part.ridge, ffl: part.ffl, source: 'survey', note: 'massing from the survey outline (RC-05 coverage), eave RL 51.43 and ridge RL; not a model of the building' };
      g.add(walls);
      // hip roof with 0.45 m overhang
      const c: Pt = [(R[0][0] + R[2][0]) / 2, (R[0][1] + R[2][1]) / 2];
      const ux: Pt = [(R[1][0] - R[0][0]) / Lx, (R[1][1] - R[0][1]) / Lx];
      const uy: Pt = [(R[3][0] - R[0][0]) / Sx, (R[3][1] - R[0][1]) / Sx];
      const o = 0.45;
      const P = (a: number, b: number): Pt => [c[0] + ux[0] * a + uy[0] * b, c[1] + ux[1] * a + uy[1] * b];
      const hx = Lx / 2 + o;
      const hy = Sx / 2 + o;
      const ridgeHalf = Math.max(0, Lx / 2 - Sx / 2);
      const corners = [P(-hx, -hy), P(hx, -hy), P(hx, hy), P(-hx, hy)].map((p) => toV3(p[0], p[1], eave - 0.12));
      const r0 = toV3(...P(-ridgeHalf, 0), part.ridge);
      const r1 = toV3(...P(ridgeHalf, 0), part.ridge);
      const tri = (a: THREE.Vector3, b: THREE.Vector3, cc: THREE.Vector3) => [a.x, a.y, a.z, b.x, b.y, b.z, cc.x, cc.y, cc.z];
      const pos = [
        ...tri(corners[0], r0, corners[1]),
        ...tri(corners[1], r0, r1),
        ...tri(corners[1], r1, corners[2]),
        ...tri(corners[2], r1, corners[3]),
        ...tri(corners[3], r1, r0),
        ...tri(corners[3], r0, corners[0]),
      ];
      const rg = new THREE.BufferGeometry();
      rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      rg.computeVertexNormals();
      // make sure faces point up
      const nrm = rg.getAttribute('normal');
      if (nrm.getY(0) < 0) {
        const p = rg.getAttribute('position');
        for (let i = 0; i < p.count; i += 3) {
          for (const k of [0, 1, 2]) {
            const a = p.getComponent(i + 1, k);
            p.setComponent(i + 1, k, p.getComponent(i + 2, k));
            p.setComponent(i + 2, k, a);
          }
        }
        rg.computeVertexNormals();
      }
      const roof = new THREE.Mesh(boxUV(rg, 0.9, 'x'), M.existingRoof);
      roof.material = M.existingRoof.clone();
      (roof.material as THREE.MeshPhysicalMaterial).side = THREE.DoubleSide;
      roof.name = `existing_${name}_roof`;
      roof.castShadow = roof.receiveShadow = true;
      roof.userData = { ...walls.userData, name: `Existing roof, ${name} part` };
      g.add(roof);
    }
    return g;
  }

  /** the envelope as a translucent surface over the lot */
  envelopeMesh(h = 0.5) {
    const xs: number[] = [];
    const B = this.data.boundary;
    let minE = Infinity;
    let maxE = -Infinity;
    let minN = Infinity;
    let maxN = -Infinity;
    for (const p of [B.NW, B.NE, B.E, B.Sp, B.SW]) {
      minE = Math.min(minE, p[0]);
      maxE = Math.max(maxE, p[0]);
      minN = Math.min(minN, p[1]);
      maxN = Math.max(maxN, p[1]);
    }
    const nx = Math.ceil((maxE - minE) / h);
    const nz = Math.ceil((maxN - minN) / h);
    const pos: number[] = [];
    const inside: boolean[] = [];
    for (let i = 0; i <= nz; i++) {
      for (let j = 0; j <= nx; j++) {
        const e = minE + j * h;
        const n = minN + i * h;
        pos.push(e, this.envelope(e, n).H, -n);
        inside.push(inPoly([e, n], this.lot));
      }
    }
    const idx: number[] = [];
    const vid = (i: number, j: number) => i * (nx + 1) + j;
    for (let i = 0; i < nz; i++) {
      for (let j = 0; j < nx; j++) {
        if (!inPoly([minE + (j + 0.5) * h, minN + (i + 0.5) * h], this.lot)) continue;
        const a = vid(i, j);
        const b = vid(i, j + 1);
        const c = vid(i + 1, j);
        const d = vid(i + 1, j + 1);
        idx.push(a, b, c, b, d, c);
      }
    }
    void xs;
    void inside;
    const G = new THREE.BufferGeometry();
    G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    G.setIndex(idx);
    G.computeVertexNormals();
    const m = new THREE.Mesh(G, new THREE.MeshStandardMaterial({ color: 0xd9bacb, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false, roughness: 0.9 }));
    m.name = 'planning_envelope';
    m.renderOrder = 5;
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(G), new THREE.LineBasicMaterial({ color: 0x916a70, transparent: true, opacity: 0.18 }));
    wire.name = 'planning_envelope_lines';
    const g = new THREE.Group();
    g.name = 'planning_envelope';
    g.add(m, wire);
    g.userData = { kind: 'envelope', note: 'Indicative: HIRB 2.5 m + 45° from surveyed ground at the side and rear boundaries, and 8 m above surveyed ground. Not a compliance check.' };
    return g;
  }

  /** check every vertex of the given objects against the envelope */
  check(objs: THREE.Object3D[]) {
    const v = new THREE.Vector3();
    let worst = { over: -Infinity, at: new THREE.Vector3(), by: '' };
    let margin = Infinity;
    const breaches: THREE.Vector3[] = [];
    for (const o of objs) {
      o.updateWorldMatrix(true, true);
      o.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (!mesh.isMesh || /glass|ceiling|floor|partition|lining|framing|joist|bearer|pile|spa|tread|stringer|board|post|rail|batten/i.test(mesh.name)) return;
        const p = mesh.geometry.getAttribute('position');
        const step = Math.max(1, Math.floor(p.count / 4000));
        for (let i = 0; i < p.count; i += step) {
          v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
          const env = this.envelope(v.x, -v.z);
          const over = v.y - env.H;
          margin = Math.min(margin, -over);
          if (over > worst.over) worst = { over, at: v.clone(), by: env.by };
          if (over > 0.005) breaches.push(v.clone());
        }
      });
    }
    return { worst, margin, breaches };
  }
}
