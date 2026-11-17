import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../bird/util';

// Native flowering sprigs for the perch's side shoot: kōwhai, pōhutukawa and mānuka.
//
// Each sprig is built in world space along the line the Blender twig's own shoot took
// (root → tip), as merged meshes named the way env/sway.ts expects: 'shoot' for the stem,
// 'buds' for everything that hangs off it, so the flowers nod after the twig as the
// original buds did. No instancing here: sway bends vertices in world space.
//
// Sizes are drawn to the birds' scale (they are all shown at one size, ≈ 20 cm birds at
// 1 unit = 10 cm × 0.55), so flowers read in proportion to a bird on the twig.
// Art-directed from botanical descriptions and photographs, not scanned.

export type FloraKind = 'kowhai' | 'pohutukawa' | 'manuka';

const UP = new THREE.Vector3(0, 1, 0);

/** a tube along a curve with vertex colours; closed at the far end when `cap` */
function tube(curve: THREE.Curve<THREE.Vector3>, radius: (u: number) => number, colour: (u: number, a: number) => THREE.Color, segs = 24, radial = 8) {
  const frames = curve.computeFrenetFrames(segs, false);
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    curve.getPointAt(u, p);
    const r = radius(u);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      n.copy(frames.normals[i]).multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
      pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
      nor.push(n.x, n.y, n.z);
      const c = colour(u, a);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

/**
 * A leaf blade: an outline (half-width along its length), cupped across and arched along,
 * two-sided with its own colour on each face. Built along +Z from the origin, face up +Y.
 */
function leaf(len: number, halfWidth: (u: number) => number, top: THREE.Color, under: THREE.Color, opts: { arch?: number; cup?: number; segs?: number; across?: number; vein?: number } = {}) {
  const segs = opts.segs ?? 10;
  const across = opts.across ?? 4;
  const arch = opts.arch ?? 0.15;
  const cup = opts.cup ?? 0.25;
  const vein = opts.vein ?? 0.12;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const thick = len * 0.006;
  for (const side of [1, -1]) {
    const start = pos.length / 3;
    const c0 = side > 0 ? top : under;
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const w = halfWidth(u);
      for (let j = 0; j <= across * 2; j++) {
        const v = j / across - 1; // -1 … 1
        const x = v * w;
        const z = u * len;
        const y = arch * len * Math.sin(u * Math.PI) * 0.5 - arch * len * u * u * 0.6 + cup * Math.abs(v) * w + side * thick;
        pos.push(x, y, z);
        // a paler midrib
        const k = 1 + vein * Math.exp(-(v * v) * 60);
        col.push(c0.r * k, c0.g * k, c0.b * k);
      }
    }
    const row = across * 2 + 1;
    for (let i = 0; i < segs; i++) {
      for (let j = 0; j < row - 1; j++) {
        const a = start + i * row + j;
        const b = a + row;
        if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1);
        else idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** orient a +Z-built part so its +Z runs along `dir` with its +Y as close to `up` as it can, then place it */
function place(g: THREE.BufferGeometry, at: THREE.Vector3, dir: THREE.Vector3, up = UP, roll = 0) {
  const z = dir.clone().normalize();
  const x = new THREE.Vector3().crossVectors(up, z);
  if (x.lengthSq() < 1e-6) x.set(1, 0, 0);
  x.normalize();
  const y = new THREE.Vector3().crossVectors(z, x);
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  if (roll) m.multiply(new THREE.Matrix4().makeRotationZ(roll));
  m.setPosition(at);
  return g.applyMatrix4(m);
}

function solid(c: number | THREE.Color) {
  const k = c instanceof THREE.Color ? c : new THREE.Color(c);
  return () => k;
}

function mergeNamed(name: string, parts: THREE.BufferGeometry[], material: THREE.Material) {
  for (const p of parts) {
    if (!p.getAttribute('normal')) p.computeVertexNormals();
    for (const k of Object.keys(p.attributes)) if (!['position', 'normal', 'color'].includes(k)) p.deleteAttribute(k);
    if (!p.index) p.setIndex([...Array(p.getAttribute('position').count).keys()]);
  }
  const m = new THREE.Mesh(mergeGeometries(parts, false), material);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** the stem from root to tip: a gentle S, so it doesn't look ruled */
function stemCurve(root: THREE.Vector3, tip: THREE.Vector3, rng: () => number) {
  const d = tip.clone().sub(root);
  const side = new THREE.Vector3(-d.z, 0, d.x).normalize().multiplyScalar(d.length() * 0.06);
  return new THREE.CatmullRomCurve3([
    root.clone(),
    root.clone().addScaledVector(d, 0.33).add(side.clone().multiplyScalar(rng() - 0.3)),
    root.clone().addScaledVector(d, 0.66).add(side.clone().multiplyScalar(-(rng() - 0.3))),
    tip.clone(),
  ]);
}

// --- kōwhai ------------------------------------------------------------------------
// Sophora: drooping racemes of long, curved, golden tubular pea-flowers, often on
// near-bare wood, with a few young pinnate leaves of tiny paired leaflets.
function kowhai(root: THREE.Vector3, tip: THREE.Vector3) {
  const rng = mulberry32(81);
  const stem = stemCurve(root, tip, rng);
  const stemCol = new THREE.Color(0x5a4a2a);
  const stems: THREE.BufferGeometry[] = [tube(stem, (u) => 0.02 * (1 - u * 0.55), (u) => stemCol.clone().lerp(new THREE.Color(0x6a7a32), u * 0.7), 40, 8)];
  const flowers: THREE.BufferGeometry[] = [];
  const leaves: THREE.BufferGeometry[] = [];
  const gold = new THREE.Color(0xf2b000);
  const deep = new THREE.Color(0xd88a00);
  const calyx = new THREE.Color(0x9a9a2a);
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const racemes = 6;
  for (let r = 0; r < racemes; r++) {
    const u = 0.25 + (r / (racemes - 1)) * 0.72;
    stem.getPointAt(u, p);
    stem.getTangentAt(u, t);
    // a short stalk out to the side, then the raceme hangs from it
    const out = new THREE.Vector3(Math.cos(r * 2.4 + 0.5), 0.15, Math.sin(r * 2.4 + 0.5)).normalize();
    const hang = p.clone().addScaledVector(out, 0.035 + rng() * 0.03);
    const axis = new THREE.CatmullRomCurve3([p.clone(), hang, hang.clone().add(new THREE.Vector3(out.x * 0.03, -0.08, out.z * 0.03))]);
    stems.push(tube(axis, (v) => 0.006 * (1 - v * 0.5), solid(0x6a6a2a), 10, 5));
    const n = 4 + Math.floor(rng() * 4);
    for (let k = 0; k < n; k++) {
      const v = 0.35 + (k / n) * 0.65;
      const at = axis.getPointAt(v);
      // pedicel, then a flower hanging off it, curved like a sickle, mouth down
      const swing = new THREE.Vector3(Math.cos(k * 2.1 + r), 0, Math.sin(k * 2.1 + r)).multiplyScalar(0.5);
      const down = new THREE.Vector3(swing.x, -1, swing.z).normalize();
      const L = 0.1 + rng() * 0.035;
      const side = new THREE.Vector3().crossVectors(down, UP).normalize();
      const bend = new THREE.Vector3().crossVectors(side, down).normalize();
      const c = new THREE.QuadraticBezierCurve3(
        at.clone(),
        at.clone().addScaledVector(down, L * 0.55).addScaledVector(bend, L * 0.18),
        at.clone().addScaledVector(down, L).addScaledVector(bend, L * 0.05),
      );
      flowers.push(
        tube(
          c,
          (w) => (w < 0.12 ? 0.006 + w * 0.05 : 0.012 * Math.sin(Math.min(1, (1 - w) / 0.12) * Math.PI * 0.5) * (1 - 0.25 * w) + 0.004 * (w < 0.97 ? 1 : 0)),
          (w, a) => (w < 0.12 ? calyx : gold.clone().lerp(deep, 0.25 + 0.25 * Math.sin(a * 2) * w)),
          18,
          10,
        ),
      );
      // the standard: one petal flared back over the top of the tube
      const std = leaf(L * 0.42, (q) => 0.02 * Math.sin(Math.PI * Math.min(1, q * 1.1)), gold, deep, { arch: -0.4, cup: 0.6, segs: 6, across: 3, vein: 0.2 });
      flowers.push(place(std, c.getPointAt(0.1), down.clone().multiplyScalar(-0.3).addScaledVector(bend, -1), down));
    }
  }
  // a few young pinnate leaves near the tip
  const leaflet = (s: number) => leaf(0.03 * s, (q) => 0.011 * s * Math.sin(Math.PI * Math.min(1, q * 1.05)), new THREE.Color(0x6a8a2a), new THREE.Color(0x8a9a5a), { segs: 5, across: 2, arch: 0.1 });
  for (let k = 0; k < 4; k++) {
    const u = 0.55 + k * 0.13;
    stem.getPointAt(Math.min(u, 0.98), p);
    const dir = new THREE.Vector3(Math.cos(k * 2.6 + 1), 0.6, Math.sin(k * 2.6 + 1)).normalize();
    const len = 0.22;
    const rach = new THREE.QuadraticBezierCurve3(p.clone(), p.clone().addScaledVector(dir, len * 0.6), p.clone().addScaledVector(dir, len).add(new THREE.Vector3(0, -0.05, 0)));
    stems.push(tube(rach, () => 0.0028, solid(0x6a7a32), 10, 4));
    for (let i = 1; i < 14; i++) {
      const w = i / 14;
      const q = rach.getPointAt(w);
      const tg = rach.getTangentAt(w);
      const sd = new THREE.Vector3().crossVectors(tg, UP).normalize();
      for (const sgn of [1, -1]) leaves.push(place(leaflet(1 - w * 0.35), q, sd.clone().multiplyScalar(sgn).addScaledVector(tg, 0.4), UP));
    }
  }
  const stemMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  const petalMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, sheen: 0.6, sheenColor: new THREE.Color(0xffe080), side: THREE.DoubleSide, emissive: 0x2a1600 });
  const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide });
  return [mergeNamed('shoot', stems, stemMat), mergeNamed('buds', flowers, petalMat), mergeNamed('buds', leaves, leafMat)];
}

// --- pōhutukawa -------------------------------------------------------------------
// Metrosideros excelsa: dense heads of crimson stamens with gold-tipped anthers, on pale
// felted stalks among thick oval leaves, dark and glossy above, white-felted beneath.
function pohutukawa(root: THREE.Vector3, tip: THREE.Vector3) {
  const rng = mulberry32(82);
  const stem = stemCurve(root, tip, rng);
  const stems: THREE.BufferGeometry[] = [tube(stem, (u) => 0.024 * (1 - u * 0.4), (u) => new THREE.Color(0x4a3e34).lerp(new THREE.Color(0xb8b2a2), smoothstep(0.5, 1, u)), 40, 8)];
  const stamens: THREE.BufferGeometry[] = [];
  const leaves: THREE.BufferGeometry[] = [];
  const crimson = new THREE.Color(0xc3121c);
  const deepRed = new THREE.Color(0x7a0a10);
  const anther = new THREE.Color(0xd8a020);
  const felt = new THREE.Color(0xc8c2b4);
  const filament = new THREE.CylinderGeometry(0.0016, 0.0022, 1, 3, 1);
  filament.translate(0, 0.5, 0);
  const antherGeo = new THREE.SphereGeometry(0.0055, 5, 4);
  const cupGeo = new THREE.SphereGeometry(0.018, 8, 6, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55);
  const heads = [
    { u: 1, spread: 0.11 },
    { u: 0.72, spread: 0.09 },
  ];
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  for (const h of heads) {
    stem.getPointAt(h.u, p);
    stem.getTangentAt(h.u, t);
    const centre = p.clone().addScaledVector(t, 0.03);
    const nFlowers = 11;
    for (let f = 0; f < nFlowers; f++) {
      // flowers on short felted stalks, spread over a dome
      const a = f * 2.39996;
      const r = Math.sqrt((f + 0.5) / nFlowers);
      const out = new THREE.Vector3(Math.cos(a) * r, 0.9 - r * 0.6, Math.sin(a) * r).normalize();
      const base = centre.clone().addScaledVector(out, h.spread * 0.6);
      const ped = new THREE.LineCurve3(centre.clone(), base);
      stems.push(tube(ped, () => 0.004, () => felt, 4, 4));
      const cup = cupGeo.clone();
      setColour(cup, felt);
      stamens.push(place(cup, base, out, UP));
      for (let s = 0; s < 34; s++) {
        const sa = s * 2.39996 + f;
        const sr = 0.35 + 0.65 * Math.sqrt((s + 0.5) / 34);
        const tilt = 0.25 + sr * 0.75;
        const local = new THREE.Vector3(Math.cos(sa) * tilt, 1, Math.sin(sa) * tilt).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(UP, out);
        const dir = local.applyQuaternion(q);
        const len = 0.07 + rng() * 0.035;
        const fil = filament.clone();
        fil.scale(1, len, 1);
        const shade = crimson.clone().lerp(deepRed, rng() * 0.35);
        setColour(fil, shade);
        const m = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir)).setPosition(base);
        stamens.push(fil.applyMatrix4(m));
        const an = antherGeo.clone();
        setColour(an, anther.clone().multiplyScalar(0.8 + rng() * 0.3));
        stamens.push(an.translate(base.x + dir.x * len, base.y + dir.y * len, base.z + dir.z * len));
      }
    }
  }
  // leaves: in pairs round the stem below the heads, held out and a little up
  const top = new THREE.Color(0x24401c);
  const under = new THREE.Color(0xd2d0c4);
  for (let k = 0; k < 7; k++) {
    const u = 0.42 + (k / 6) * 0.5;
    stem.getPointAt(u, p);
    const a = k * 1.9 + 0.4;
    const dir = new THREE.Vector3(Math.cos(a), 0.35, Math.sin(a)).normalize();
    const L = 0.3 + rng() * 0.08;
    const g = leaf(L, (q) => 0.065 * Math.pow(Math.sin(Math.PI * Math.min(1, q)), 0.8) * (1 - 0.15 * q), top, under, { arch: 0.12, cup: 0.18, segs: 12, across: 4, vein: 0.18 });
    leaves.push(place(g, p, dir, UP, (rng() - 0.5) * 0.4));
  }
  const stemMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const stamenMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.45, sheen: 0.5, sheenColor: new THREE.Color(0xff6060), emissive: 0x200000 });
  const leafMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.35, side: THREE.DoubleSide });
  return [mergeNamed('shoot', stems, stemMat), mergeNamed('buds', stamens, stamenMat), mergeNamed('buds', leaves, leafMat)];
}

// --- mānuka ------------------------------------------------------------------------
// Leptospermum scoparium: wiry twigs crowded with small sharp leaves, and small white
// five-petalled flowers with a dark red-brown centre.
function manuka(root: THREE.Vector3, tip: THREE.Vector3) {
  const rng = mulberry32(83);
  const stem = stemCurve(root, tip, rng);
  const bark = new THREE.Color(0x4a3428);
  const stems: THREE.BufferGeometry[] = [tube(stem, (u) => 0.014 * (1 - u * 0.5), solid(bark), 40, 6)];
  const flowers: THREE.BufferGeometry[] = [];
  const leaves: THREE.BufferGeometry[] = [];
  const p = new THREE.Vector3();
  // side twigs
  const twigs: THREE.Curve<THREE.Vector3>[] = [stem];
  for (let k = 0; k < 5; k++) {
    const u = 0.25 + k * 0.15;
    stem.getPointAt(u, p);
    const a = k * 2.3 + 0.7;
    const dir = new THREE.Vector3(Math.cos(a), 0.7, Math.sin(a)).normalize();
    const c = new THREE.QuadraticBezierCurve3(p.clone(), p.clone().addScaledVector(dir, 0.1), p.clone().addScaledVector(dir, 0.2).add(new THREE.Vector3(0, 0.03, 0)));
    stems.push(tube(c, (v) => 0.006 * (1 - v * 0.5), solid(0x5a3a2a), 10, 5));
    twigs.push(c);
  }
  const leafTop = new THREE.Color(0x3a4a26);
  const leafUnder = new THREE.Color(0x5a6a3e);
  const petal = new THREE.Color(0xf6f2ec);
  const centre = new THREE.Color(0x5a1a14);
  for (const c of twigs) {
    for (let i = 0; i < 26; i++) {
      const u = 0.08 + (i / 26) * 0.9;
      c.getPointAt(u, p);
      const tg = c.getTangentAt(u);
      const a = i * 2.39996;
      const sd = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).addScaledVector(tg, -tg.dot(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)))).normalize();
      const g = leaf(0.045, (q) => 0.008 * Math.sin(Math.PI * Math.min(1, q * 1.05)) * (1 - 0.5 * q), leafTop, leafUnder, { segs: 4, across: 1, arch: 0.05, cup: 0.3, vein: 0.1 });
      leaves.push(place(g, p, sd.clone().addScaledVector(tg, 1.2), UP));
    }
    // flowers at the leaf axils, facing out and up
    for (let i = 0; i < 6; i++) {
      const u = 0.2 + rng() * 0.75;
      c.getPointAt(u, p);
      const a = rng() * Math.PI * 2;
      const face = new THREE.Vector3(Math.cos(a), 0.9, Math.sin(a)).normalize();
      const at = p.clone().addScaledVector(face, 0.012);
      for (let k = 0; k < 5; k++) {
        const g = leaf(0.032, (q) => 0.017 * Math.sqrt(Math.max(0, Math.sin(Math.PI * Math.min(1, q)))), petal, petal.clone().multiplyScalar(0.9), { segs: 5, across: 3, arch: -0.1, cup: 0.25, vein: 0 });
        // petals lie in the plane across `face`, fanned round it
        const q = new THREE.Quaternion().setFromUnitVectors(UP, face);
        const radial = new THREE.Vector3(Math.cos((k / 5) * Math.PI * 2), 0.18, Math.sin((k / 5) * Math.PI * 2)).applyQuaternion(q);
        flowers.push(place(g, at, radial, face));
      }
      const disc = new THREE.CylinderGeometry(0.009, 0.011, 0.006, 10);
      setColour(disc, centre);
      flowers.push(place(disc.rotateX(Math.PI / 2), at.clone().addScaledVector(face, 0.002), face, UP));
    }
  }
  const stemMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const flowerMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide });
  const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide });
  return [mergeNamed('shoot', stems, stemMat), mergeNamed('buds', flowers, flowerMat), mergeNamed('buds', leaves, leafMat)];
}

function setColour(g: THREE.BufferGeometry, c: THREE.Color) {
  const n = g.getAttribute('position').count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) (a[i * 3] = c.r), (a[i * 3 + 1] = c.g), (a[i * 3 + 2] = c.b);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Build a sprig from root to tip (world space). */
export function createFlora(kind: FloraKind, root: THREE.Vector3, tip: THREE.Vector3) {
  const group = new THREE.Group();
  group.name = `flora.${kind}`;
  const meshes = kind === 'pohutukawa' ? pohutukawa(root, tip) : kind === 'manuka' ? manuka(root, tip) : kowhai(root, tip);
  group.add(...meshes);
  return group;
}

/**
 * Take the Blender twig's own flowering shoot off and put a native sprig in its place,
 * along the same line. Call before sway.use(). Returns the sprig.
 */
export function dressBranch(branch: THREE.Object3D, kind: FloraKind) {
  branch.updateMatrixWorld(true);
  const shoot = branch.getObjectByName('shoot') as THREE.Mesh | undefined;
  // where the old shoot ran: lowest to highest point, world space
  const root = new THREE.Vector3(1.07, 0.11, 0.26);
  const tip = new THREE.Vector3(1.41, 0.7, 0.09);
  if (shoot) {
    const pos = shoot.geometry.getAttribute('position') as THREE.BufferAttribute;
    shoot.geometry.computeBoundingBox();
    const bb = shoot.geometry.boundingBox!;
    const lo = new THREE.Vector3();
    const hi = new THREE.Vector3();
    let nl = 0;
    let nh = 0;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (v.y < bb.min.y + 0.03) (lo.add(v), nl++);
      if (v.y > bb.max.y - 0.03) (hi.add(v), nh++);
    }
    if (nl && nh) {
      root.copy(lo.divideScalar(nl)).applyMatrix4(shoot.matrixWorld);
      tip.copy(hi.divideScalar(nh)).applyMatrix4(shoot.matrixWorld);
    }
  }
  for (const name of ['shoot', 'buds', 'hairs']) {
    const o = branch.getObjectByName(name);
    if (o) o.removeFromParent();
  }
  // a little taller than the old shoot, so the flowers stand clear of the tail
  tip.add(new THREE.Vector3(0.04, 0.08, -0.02));
  const sprig = createFlora(kind, root, tip);
  branch.add(sprig);
  return sprig;
}
