import * as THREE from 'three';
import { boxUV, detail, group, instanced, M, part, segs, type Quality } from './util';
import { linen, pbr, woolHerringbone, woolPile } from './tex';
import type { ObjectInfo } from './types';

// Soft furnishings: a piped linen cushion, a folded herringbone wool throw with a twisted
// fringe, and a hand-tufted wool rug. Original designs. Metres, resting on y = 0.

/** a filled pillow surface: two puffed faces meeting at a seam, z up before placement */
function pillow(w: number, h: number, t: number, n: number) {
  const g = new THREE.PlaneGeometry(w, h, n, n);
  const pos: number[] = [];
  const idx: number[] = [];
  const src = g.getAttribute('position');
  const rows = n + 1;
  for (const side of [1, -1]) {
    const start = pos.length / 3;
    for (let i = 0; i < src.count; i++) {
      let x = src.getX(i);
      let y = src.getY(i);
      const u = (2 * x) / w;
      const v = (2 * y) / h;
      // puff: full in the middle, falling to the seam, corners pinched in a little
      const fill = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 2.6)), 0.6) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(v), 2.6)), 0.6);
      const pinch = 1 - 0.07 * Math.pow(Math.abs(u * v), 3);
      x *= pinch * (1 - 0.03 * fill);
      y *= pinch * (1 - 0.03 * fill);
      // soft dents from the filling settling
      const dent = 0.06 * Math.sin(u * 3.1 + 0.4) * Math.sin(v * 2.7 - 0.3) * fill;
      const z = side * ((t / 2) * fill * (1 + dent));
      pos.push(x, y, z);
    }
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const a = start + r * rows + c;
        const b = a + rows;
        if (side > 0) idx.push(a, a + 1, b, b, a + 1, b + 1);
        else idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setIndex(idx);
  out.computeVertexNormals();
  return out;
}

export const cushionInfo: ObjectInfo = {
  key: 'cushion',
  name: 'Piped linen cushion',
  category: 'Soft furnishings',
  summary: 'A 500 mm square feather-filled cushion in stone-washed oatmeal linen, with self-piped edges and a soft settled shape.',
  dimensions: '500 × 500 mm cover, about 150 mm thick filled; piping Ø 6 mm. Lying flat.',
  sources: ['50 × 50 cm is a standard cushion size.'],
  assumptions: ['The filled shape is an approximation of a settled feather insert, not a cloth simulation.', 'The plain weave and slubs are a procedural texture; no zip is modelled.'],
};

export function buildCushion(q: Quality) {
  const d = detail(q);
  const set = linen(d.tex, { colour: 0xcdbfa6, threads: 110, tile: 0.08, name: 'oatmeal_linen' });
  const mat = pbr(set, 'oatmeal_linen', { sheen: 0.5, sheenColor: new THREE.Color(0xfff6e6), sheenRoughness: 0.7 });
  const n = segs(d, 64, 24);
  const g = pillow(0.5, 0.5, 0.15, n);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0.075, 0);
  const parts: THREE.Object3D[] = [part('cushion_cover', boxUV(g, set.tile, 'x'), mat)];
  // piping round the seam
  const edge: THREE.Vector3[] = [];
  const k = 0.25;
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    // a squircle that follows the pinched outline
    const r = Math.pow(Math.pow(Math.abs(c), 6) + Math.pow(Math.abs(s), 6), -1 / 6);
    const pinch = 1 - 0.07 * Math.pow(Math.abs(c * s * r * r), 3);
    edge.push(new THREE.Vector3(c * r * k * pinch, 0.075, s * r * k * pinch));
  }
  const pipe = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge, true), segs(d, 240, 64), 0.003, 8, true);
  parts.push(part('piping', boxUV(pipe, set.tile, 'x'), mat));
  return group('linen_cushion', ...parts);
}

export const throwInfo: ObjectInfo = {
  key: 'throw',
  name: 'Herringbone wool throw, folded',
  category: 'Soft furnishings',
  summary: 'A New Zealand wool throw in a two-tone herringbone twill, folded in eighths, with a twisted fringe at both ends.',
  dimensions: 'Unfolded 1300 × 1800 mm (assumed); folded 430 × 330 × 70 mm; fringe 70 mm, 92 tassels shown along the visible edge.',
  sources: ['130 × 180 cm is a common throw size.'],
  assumptions: ['Folded form is sculpted, not cloth-simulated.', 'Herringbone is a procedural texture.'],
};

export function buildThrow(q: Quality) {
  const d = detail(q);
  const set = woolHerringbone(d.tex, { a: 0x8c8574, b: 0xb3aa94, tile: 0.06, name: 'herringbone_wool' });
  const mat = pbr(set, 'herringbone_wool', { sheen: 1, sheenColor: new THREE.Color(0xd8d0bc), sheenRoughness: 0.8 });
  const parts: THREE.Object3D[] = [];
  const W = 0.43;
  const D = 0.33;
  const layers = 8;
  const th = 0.0085;
  // eight folded layers, each a soft slab; the fold edge (front, +Z) rounds over between pairs
  const n = segs(d, 40, 14);
  for (let i = 0; i < layers; i++) {
    const g = new THREE.BoxGeometry(W - i * 0.002, th, D - i * 0.0015, n, 2, n);
    const p = g.getAttribute('position');
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k) / (W / 2);
      const z = p.getZ(k) / (D / 2);
      // edges round off and the middle sits a little proud: wool doesn't fold flat
      const soft = (1 - Math.pow(Math.abs(x), 8)) * (1 - Math.pow(Math.abs(z), 8));
      p.setY(k, p.getY(k) * (0.6 + 0.4 * soft) + 0.0018 * soft * Math.sin(x * 2.3 + i) * Math.cos(z * 1.7));
    }
    g.computeVertexNormals();
    g.translate(0, th / 2 + i * th, 0);
    parts.push(part(`fold_layer_${i + 1}`, boxUV(g, set.tile, 'x'), mat));
  }
  // rounded fold edges at the front between pairs of layers
  for (let i = 0; i < layers - 1; i += 2) {
    const c = new THREE.CylinderGeometry(th, th, W - i * 0.002, segs(d, 16, 8), 1, true, 0, Math.PI);
    c.rotateZ(Math.PI / 2);
    c.rotateX(Math.PI / 2);
    c.translate(0, th + i * th, D / 2 - i * 0.00075);
    parts.push(part(`fold_edge_${i / 2 + 1}`, boxUV(c, set.tile, 'x'), mat));
  }
  // fringe: twisted tassels hanging off the top layer's end, one geometry, many placements
  const tassel = new THREE.CylinderGeometry(0.0012, 0.0018, 0.07, 5, segs(d, 8, 3));
  {
    const p = tassel.getAttribute('position');
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k);
      const a = y * 120;
      const x = p.getX(k);
      const z = p.getZ(k);
      p.setXYZ(k, x * Math.cos(a) - z * Math.sin(a), y, x * Math.sin(a) + z * Math.cos(a));
    }
    tassel.computeVertexNormals();
  }
  const mats: THREE.Matrix4[] = [];
  const count = 92;
  for (let i = 0; i < count; i++) {
    const x = -W / 2 + 0.008 + (i / (count - 1)) * (W - 0.016);
    // draped over the side (-X? no: over the back edge, -Z), falling down the folded stack
    // hanging from the top layer's end down the back of the stack, a little splayed
    const lean = 0.06 + 0.05 * Math.sin(i * 1.7);
    mats.push(M(x, layers * th - 0.043, -D / 2 - 0.005, lean, 0, Math.sin(i * 2.3) * 0.08));
  }
  parts.push(instanced('fringe_tassels', boxUV(tassel, set.tile, 'y'), mat, mats));
  return group('herringbone_wool_throw', ...parts);
}

export const rugInfo: ObjectInfo = {
  key: 'rug',
  name: 'Hand-tufted wool rug',
  category: 'Soft furnishings',
  summary: 'A New Zealand wool rug with a cut pile in a soft two-tone banded pattern, bound edges and a knotted fringe on both short ends.',
  dimensions: '1600 × 2300 mm, pile 12 mm; fringe 60 mm, 2 × 140 knotted tassels.',
  sources: ['160 × 230 cm is a standard rug size.'],
  assumptions: ['The rug is an object on its own; it is laid flat but not attached to any floor.', 'Pile and pattern are procedural textures; individual tufts are not modelled as geometry.'],
};

export function buildRug(q: Quality) {
  const d = detail(q);
  const set = woolPile(d.tex, { a: 0xd8cfbe, b: 0x8a7a68, tile: 0.4, name: 'wool_pile' });
  const mat = pbr(set, 'wool_pile', { sheen: 0.8, sheenColor: new THREE.Color(0xe8e0d0), sheenRoughness: 0.9 });
  const fringeSet = woolPile(d.texS, { a: 0xe2dacb, b: 0xe2dacb, tile: 0.1, name: 'cotton_fringe' });
  const fringeMat = pbr(fringeSet, 'cotton_fringe');
  const W = 1.6;
  const L = 2.3;
  const t = 0.012;
  const g = new THREE.BoxGeometry(W, t, L, segs(d, 48, 12), 1, segs(d, 64, 16));
  const p = g.getAttribute('position');
  for (let k = 0; k < p.count; k++) {
    // a rolled, bound edge: the pile thins over the last few cm
    const ex = 1 - THREE.MathUtils.smoothstep(Math.abs(p.getX(k)), W / 2 - 0.03, W / 2);
    const ez = 1 - THREE.MathUtils.smoothstep(Math.abs(p.getZ(k)), L / 2 - 0.03, L / 2);
    if (p.getY(k) > 0) p.setY(k, p.getY(k) * (0.35 + 0.65 * Math.min(ex, ez)));
  }
  g.computeVertexNormals();
  g.translate(0, t / 2, 0);
  const parts: THREE.Object3D[] = [part('rug_body', boxUV(g, set.tile, 'z'), mat)];
  const tassel = new THREE.CylinderGeometry(0.0016, 0.0022, 0.06, 5, 2);
  tassel.rotateX(Math.PI / 2);
  const mats: THREE.Matrix4[] = [];
  for (const end of [1, -1]) {
    for (let i = 0; i < 140; i++) {
      const x = -W / 2 + 0.02 + (i / 139) * (W - 0.04);
      mats.push(M(x, 0.002, end * (L / 2 + 0.03), 0, Math.sin(i * 1.9) * 0.12, 0));
    }
  }
  parts.push(instanced('fringe', tassel, fringeMat, mats));
  return group('wool_rug_160x230', ...parts);
}
