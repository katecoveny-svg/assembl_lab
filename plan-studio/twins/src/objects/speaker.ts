import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { boxUV, detail, group, instanced, lathe, M, part, segs, type Quality } from './util';
import { grille, metal, paint, pbr, plastic, wood } from './tex';
import type { ObjectInfo } from './types';

// An original two-way bookshelf loudspeaker (one of a pair): walnut-veneered cabinet with
// radiused edges, a satin-black front baffle, a 165 mm woofer and a 25 mm soft-dome
// tweeter in a shallow waveguide, rear bass port and binding posts, a detachable grille.
// Standing on its base at y = 0, baffle toward +Z. Metres.

const W = 0.19;
const H = 0.32;
const D = 0.27;

export const info: ObjectInfo = {
  key: 'speaker',
  name: 'Walnut two-way bookshelf speaker',
  category: 'Audio',
  summary: 'An original two-way design: walnut-veneered cabinet with radiused edges, satin-black baffle, 165 mm paper-composite woofer, 25 mm silk-dome tweeter in a waveguide, rear port and binding posts, detachable knitted grille.',
  dimensions: 'Cabinet 190 W × 320 H × 270 D mm; 165 mm (6.5″) woofer; 25 mm (1″) tweeter; 50 mm rear port. One of a pair. The grille is a separate part placed beside the cabinet.',
  sources: ['Driver sizes and cabinet volume are typical of two-way bookshelf monitors (about 12–15 litres gross).'],
  assumptions: [
    'Original design; not modelled on any manufacturer’s product.',
    'No internal bracing, crossover or wiring is modelled: the cabinet is a closed shell.',
    'Veneer, cone and dome surfaces are procedural textures.',
  ],
};

export function build(q: Quality) {
  const d = detail(q);
  const walnutSet = wood(d.tex, { light: 0x6e4a32, dark: 0x3e2618, rings: 34, figure: 0.3, gloss: 0.45, tile: 0.4, seed: 21, name: 'walnut_veneer' });
  const baffleSet = paint(d.texS, { colour: 0x111112, gloss: 0.25, name: 'satin_black' });
  const coneSet = plastic(d.texS, { colour: 0x4a4846, rough: 0.82, tile: 0.05, name: 'paper_cone' });
  const rubberSet = plastic(d.texS, { colour: 0x141414, rough: 0.65, name: 'rubber_surround' });
  const trimSet = metal(d.texS, { tint: 0x2c2c2e, rough: 0.35, brush: 0.8, tile: 0.1, name: 'anodised_trim' });
  const brassSet = metal(d.texS, { tint: 0xd6b36a, rough: 0.2, brush: 0.4, name: 'gold_plated' });
  const clothSet = grille(d.texS, { colour: 0x2a2a2c });
  const walnut = pbr(walnutSet, 'walnut_veneer', { clearcoat: 0.3, clearcoatRoughness: 0.4 });
  const baffleM = pbr(baffleSet, 'satin_black_baffle');
  const cone = pbr(coneSet, 'paper_composite_cone');
  const rubber = pbr(rubberSet, 'rubber_surround');
  const trim = pbr(trimSet, 'anodised_trim');
  const gold = pbr(brassSet, 'gold_plated');
  const cloth = pbr(clothSet, 'grille_cloth');
  const silk = new THREE.MeshPhysicalMaterial({ name: 'silk_dome', color: 0x1a1a1c, roughness: 0.6, sheen: 1, sheenColor: 0x6a6a70, sheenRoughness: 0.5 });

  const parts: THREE.Object3D[] = [];
  // the cabinet stops short of the front; a 30 mm baffle with cut-outs closes it, so the
  // drivers sit down in their holes as they do in a real box
  const BT = 0.03;
  const cab = new RoundedBoxGeometry(W, H, D - BT + 0.004, segs(d, 6, 2), 0.012);
  cab.translate(0, H / 2, -BT / 2 + 0.002);
  // open the front of the shell behind the baffle (drop the front face), so the driver
  // holes look into the box instead of onto veneer
  {
    const pos = cab.getAttribute('position');
    const nor = cab.getAttribute('normal');
    const front = D / 2 - BT + 0.004 - 0.0005;
    const src = cab.index ? (cab.index.array as ArrayLike<number>) : [...Array(pos.count).keys()];
    const keep: number[] = [];
    for (let t = 0; t < src.length; t += 3) {
      const tri = [src[t], src[t + 1], src[t + 2]];
      const isFront = tri.every((i) => nor.getZ(i) > 0.98 && pos.getZ(i) > front);
      if (!isFront) keep.push(...tri);
    }
    cab.setIndex(keep);
  }
  parts.push(part('cabinet', boxUV(cab, walnutSet.tile, 'y'), walnut));
  // the dark inside of the box
  const inside = new THREE.BoxGeometry(W - 0.024, H - 0.024, D - BT - 0.03);
  inside.translate(0, H / 2, -BT / 2 - 0.006);
  const insideM = new THREE.MeshStandardMaterial({ name: 'cabinet_interior', color: 0x0a0a0a, roughness: 0.95, side: THREE.BackSide });
  parts.push(part('cabinet_interior', inside, insideM));
  const wy = 0.115;
  const ty = 0.245;
  const bs = new THREE.Shape();
  {
    const w = W / 2 - 0.006;
    const h = H / 2 - 0.006;
    const r = 0.01;
    bs.moveTo(-w + r, -h);
    bs.lineTo(w - r, -h);
    bs.quadraticCurveTo(w, -h, w, -h + r);
    bs.lineTo(w, h - r);
    bs.quadraticCurveTo(w, h, w - r, h);
    bs.lineTo(-w + r, h);
    bs.quadraticCurveTo(-w, h, -w, h - r);
    bs.lineTo(-w, -h + r);
    bs.quadraticCurveTo(-w, -h, -w + r, -h);
    for (const [y, rad] of [[wy, 0.0835], [ty, 0.043]] as const) {
      const hole = new THREE.Path();
      hole.absarc(0, y - H / 2, rad, 0, Math.PI * 2, true);
      bs.holes.push(hole);
    }
  }
  const baffle = new THREE.ExtrudeGeometry(bs, { depth: BT - 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: segs(d, 64, 20) });
  baffle.translate(0, H / 2, D / 2 - BT + 0.002);
  parts.push(part('front_baffle', boxUV(baffle, baffleSet.tile), baffleM));
  const zF = D / 2;

  // woofer: cone, surround, dust cap, trim ring
  const wf = group('woofer');
  const coneG = lathe([[0.016, -0.03], [0.04, -0.022], [0.062, -0.01], [0.07, -0.004]], segs(d, 64, 20), coneSet.tile);
  const surround = lathe(Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI - (i / 8) * Math.PI;
    return [0.0765 + Math.cos(a) * 0.0065, Math.sin(a) * 0.006 - 0.004] as [number, number];
  }), segs(d, 64, 20), rubberSet.tile);
  const cap = lathe(Array.from({ length: 9 }, (_, i) => {
    const a = (i / 8) * (Math.PI / 2);
    return [Math.sin(a) * 0.019, -0.03 + Math.cos(a) * 0.007] as [number, number];
  }).reverse() as [number, number][], segs(d, 48, 16), coneSet.tile);
  const ring = lathe([[0.083, -0.004], [0.083, 0.002], [0.092, 0.003], [0.093, 0]], segs(d, 64, 20), trimSet.tile);
  const basket = lathe([[0.016, -0.03], [0.022, -0.06], [0.03, -0.075], [0.0001, -0.076]], segs(d, 40, 14), trimSet.tile);
  for (const [n, g, m] of [['woofer_basket', basket, trim], ['woofer_cone', coneG, cone], ['woofer_surround', surround, rubber], ['woofer_dust_cap', cap, cone], ['woofer_trim_ring', ring, trim]] as const) {
    g.rotateX(Math.PI / 2);
    g.translate(0, wy, zF);
    wf.add(part(n, g, m));
  }
  parts.push(wf);
  // tweeter: dome in a shallow waveguide with a trim ring
  const tw = group('tweeter');
  const guide = lathe([[0.014, -0.006], [0.025, -0.004], [0.036, -0.0015], [0.042, 0]], segs(d, 48, 16), trimSet.tile);
  const dome = lathe(Array.from({ length: 9 }, (_, i) => {
    const a = (i / 8) * (Math.PI / 2);
    return [Math.sin(a) * 0.0135, -0.006 + Math.cos(a) * 0.009] as [number, number];
  }).reverse() as [number, number][], segs(d, 40, 14), coneSet.tile);
  const tring = lathe([[0.042, 0], [0.043, 0.0025], [0.047, 0.003], [0.048, 0]], segs(d, 48, 16), trimSet.tile);
  for (const [n, g, m] of [['tweeter_waveguide', guide, trim], ['tweeter_dome', dome, silk], ['tweeter_trim_ring', tring, trim]] as const) {
    g.rotateX(Math.PI / 2);
    g.translate(0, ty, zF);
    tw.add(part(n, g, m));
  }
  parts.push(tw);

  // rear: bass port, terminal plate, two binding posts
  const port = lathe([[0.025, 0], [0.025, -0.12], [0.0235, -0.12], [0.0235, 0.001], [0.034, 0.003], [0.035, 0]], segs(d, 40, 14), rubberSet.tile);
  port.rotateX(-Math.PI / 2);
  port.translate(0, 0.235, -D / 2 - 0.001);
  parts.push(part('bass_port', port, rubber));
  const plate = new RoundedBoxGeometry(0.07, 0.09, 0.004, 2, 0.0015);
  plate.translate(0, 0.085, -D / 2 - 0.002);
  parts.push(part('terminal_plate', boxUV(plate, trimSet.tile), trim));
  const post = lathe([[0.0001, 0.022], [0.0055, 0.022], [0.006, 0.018], [0.0055, 0.008], [0.004, 0.006], [0.004, 0]], segs(d, 24, 10), brassSet.tile);
  post.rotateX(-Math.PI / 2);
  parts.push(instanced('binding_posts', post, gold, [M(0, 0.105, -D / 2 - 0.004), M(0, 0.065, -D / 2 - 0.004)]));
  const collar = new THREE.TorusGeometry(0.0062, 0.0018, 8, segs(d, 24, 10));
  parts.push(instanced('binding_post_collars', collar, rubber, [M(0, 0.105, -D / 2 - 0.009), M(0, 0.065, -D / 2 - 0.009)]));
  // feet
  const foot = new THREE.CylinderGeometry(0.009, 0.01, 0.004, segs(d, 20, 8));
  foot.translate(0, 0.002, 0);
  parts.push(instanced('rubber_feet', foot, rubber, [M(-0.07, -0.004, 0.1), M(0.07, -0.004, 0.1), M(-0.07, -0.004, -0.1), M(0.07, -0.004, -0.1)]));
  // detachable grille: thin frame wrapped in knitted cloth, held off the baffle
  const gr = new RoundedBoxGeometry(W - 0.01, H - 0.012, 0.008, segs(d, 4, 2), 0.003);
  // shown off the speaker, beside it, so the drivers stay in view; it fits the baffle face
  gr.translate(W + 0.07, H / 2, 0.06);
  const grilleMesh = part('grille_detached', boxUV(gr, clothSet.tile), cloth);
  parts.push(grilleMesh);

  const root = group('walnut_bookshelf_speaker', ...parts);
  return root;
}
