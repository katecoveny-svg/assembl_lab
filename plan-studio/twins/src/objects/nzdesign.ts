import * as THREE from 'three';
import { boxUV, detail, group, lathe, part, segs, slab, type Quality } from './util';
import { linen, metal, paint, pbr, wood } from './tex';
import type { ObjectInfo } from './types';

// Aotearoa architecture and design pieces: a verandah fretwork bracket in the manner of
// the 1890s–1910s New Zealand villa (a vernacular pattern, drawn for this library), and an
// original turned rimu bell pendant light. Metres.

export const bracketInfo: ObjectInfo = {
  key: 'bracket',
  name: 'Villa verandah fretwork bracket',
  category: 'Aotearoa architecture',
  summary: 'A painted timber verandah bracket in the manner of the New Zealand villa: a quadrant with a scrolled edge and pierced fretwork of a roundel, two tear-drops and a crescent, cut from 45 mm stock.',
  dimensions: '450 × 450 mm, 45 mm thick; shown upright as it would sit between post (left edge) and beam (top edge), detached from both.',
  sources: ['Pattern drawn in the manner of turn-of-the-century villa verandah brackets; not traced from any one house or catalogue.', 'Thickness from typical 45 mm (2″ nominal) dressed timber.'],
  assumptions: ['Painted white over timber; paint texture is procedural.', 'No fixings are modelled.'],
};


/** the bracket's outline: post edge up the left (x = 0), beam edge along the top (y = 0.45) */
export function bracketShape() {
  const s = 0.45;
  const sh = new THREE.Shape();
  // the post edge runs up the left (x = 0), the beam edge along the top (y = s)
  sh.moveTo(0, 0);
  sh.lineTo(0, s);
  sh.lineTo(s, s);
  sh.lineTo(s, s - 0.05);
  // scrolled lower edge: two lobes, then a sweep down to a pendant tip at the post
  sh.bezierCurveTo(s - 0.04, s - 0.11, s - 0.11, s - 0.1, s - 0.13, s - 0.14);
  sh.bezierCurveTo(s - 0.16, s - 0.2, s - 0.22, s - 0.2, s - 0.24, s - 0.24);
  sh.bezierCurveTo(s - 0.29, s - 0.33, s - 0.36, s - 0.33, s - 0.38, s - 0.36);
  sh.bezierCurveTo(s - 0.405, s - 0.4, s - 0.43, s - 0.44, 0.03, 0.0);
  sh.lineTo(0, 0);
  const hole = (f: (p: THREE.Path) => void) => {
    const p = new THREE.Path();
    f(p);
    sh.holes.push(p);
  };
  // roundel near the corner
  hole((p) => p.absarc(0.1, s - 0.1, 0.045, 0, Math.PI * 2, false));
  // two tear-drops pointing out from the roundel
  const tear = (cx: number, cy: number, ang: number, len: number, r: number) =>
    hole((p) => {
      const tx = cx + Math.cos(ang) * len;
      const ty = cy + Math.sin(ang) * len;
      p.moveTo(tx, ty);
      const a1 = ang + Math.PI / 2;
      p.bezierCurveTo(tx - Math.cos(ang) * len * 0.4 + Math.cos(a1) * r * 0.6, ty - Math.sin(ang) * len * 0.4 + Math.sin(a1) * r * 0.6, cx + Math.cos(a1) * r * 1.4, cy + Math.sin(a1) * r * 1.4, cx - Math.cos(ang) * r, cy - Math.sin(ang) * r);
      p.bezierCurveTo(cx - Math.cos(a1) * r * 1.4, cy - Math.sin(a1) * r * 1.4, tx - Math.cos(ang) * len * 0.4 - Math.cos(a1) * r * 0.6, ty - Math.sin(ang) * len * 0.4 - Math.sin(a1) * r * 0.6, tx, ty);
    });
  tear(0.24, s - 0.085, 0, 0.08, 0.022);
  tear(0.085, s - 0.24, -Math.PI / 2, 0.08, 0.022);
  // a crescent in the body of the quadrant
  hole((p) => {
    p.absarc(0.2, s - 0.2, 0.06, Math.PI * 0.95, Math.PI * 1.55, false);
    p.absarc(0.225, s - 0.225, 0.045, Math.PI * 1.6, Math.PI * 0.9, true);
  });
  return sh;
}

export function buildBracket(q: Quality) {
  const d = detail(q);
  const set = paint(d.tex, { colour: 0xf2efe6, gloss: 0.45, tile: 0.3, name: 'villa_white_enamel' });
  const mat = pbr(set, 'villa_white_enamel');
  const sh = bracketShape();
  const g = slab(sh, 0.045, 0.004, d, 96);
  g.translate(0, 0, 0);
  const parts: THREE.Object3D[] = [part('bracket', boxUV(g, set.tile, 'x'), mat)];
  // a turned pendant drop at the tip
  const drop = lathe([[0.0001, 0], [0.01, 0.004], [0.018, 0.02], [0.013, 0.035], [0.02, 0.05], [0.017, 0.06], [0.0001, 0.064]], segs(d, 32, 12), set.tile);
  drop.rotateX(Math.PI);
  drop.translate(0.02, 0.01, 0);
  parts.push(part('pendant_drop', drop, mat));
  const root = group('villa_fretwork_bracket', ...parts);
  // lowest point to y = 0
  root.position.y = 0.054;
  return group('villa_bracket', root);
}

export const pendantInfo: ObjectInfo = {
  key: 'pendant',
  name: 'Turned rimu bell pendant light',
  category: 'Aotearoa design',
  summary: 'An original pendant: a bell shade turned from rimu, oiled outside and matte white inside, on a brushed-brass canopy and lampholder, with a linen-covered flex and a globe lamp.',
  dimensions: 'Shade Ø 300 × 230 mm, wall 8 mm; drop 900 mm from ceiling canopy (Ø 110 mm) to shade rim; G95 globe lamp.',
  sources: ['Shade and canopy sizes typical of 300 mm pendants; G95 is a standard globe lamp size.'],
  assumptions: ['Original design; not modelled on any maker’s pendant.', 'No electrical internals; the lamp is shown unlit.', 'Rimu, brass and linen are procedural textures.'],
};

export function buildPendant(q: Quality) {
  const d = detail(q);
  const rimuSet = wood(d.tex, { light: 0x9a4a2a, dark: 0x5a2410, rings: 30, figure: 0.4, gloss: 0.35, tile: 0.3, seed: 51, name: 'rimu' });
  const brassSet = metal(d.texS, { tint: 0xc9a25a, rough: 0.3, brush: 1, tile: 0.08, name: 'brushed_brass' });
  const whiteSet = paint(d.texS, { colour: 0xf4f2ee, gloss: 0.1, name: 'matte_white' });
  const cordSet = linen(d.texS, { colour: 0x3a3632, threads: 40, tile: 0.02, name: 'linen_flex' });
  const rimu = pbr(rimuSet, 'rimu_oiled');
  const brass = pbr(brassSet, 'brushed_brass');
  const white = pbr(whiteSet, 'matte_white');
  const cord = pbr(cordSet, 'linen_flex');
  const glass = new THREE.MeshPhysicalMaterial({ name: 'opal_glass', color: 0xffffff, roughness: 0.25, transmission: 0.6, thickness: 0.002, ior: 1.5 });
  const drop = 0.9;
  const rim = 0.0; // the shade rim sits at y = 0; the canopy is at y = drop + 0.23
  const parts: THREE.Object3D[] = [];
  // shade: outside in rimu, inside in white, one profile each
  const out: [number, number][] = [[0.15, rim], [0.148, 0.03], [0.14, 0.08], [0.118, 0.14], [0.08, 0.195], [0.045, 0.222], [0.02, 0.23]];
  const inn: [number, number][] = out.map(([r, y]) => [Math.max(r - 0.008, 0.012), y + 0.006]);
  const outer = lathe(out, segs(d, 96, 28), rimuSet.tile);
  parts.push(part('shade_outer', outer, rimu));
  const inner = lathe([...inn].reverse(), segs(d, 96, 28), whiteSet.tile);
  parts.push(part('shade_inner', inner, white));
  const lip = new THREE.TorusGeometry(0.146, 0.004, 8, segs(d, 96, 28));
  lip.rotateX(Math.PI / 2);
  parts.push(part('shade_rim', lip.translate(0, rim + 0.002, 0), rimu));
  // lampholder, flex, canopy
  const holder = lathe([[0.0001, 0.17], [0.016, 0.17], [0.016, 0.235], [0.009, 0.245], [0.0001, 0.245]], segs(d, 32, 12), brassSet.tile);
  parts.push(part('lampholder', holder, brass));
  const flex = new THREE.CylinderGeometry(0.0035, 0.0035, drop - 0.012, segs(d, 12, 6), 1);
  parts.push(part('flex', boxUV(flex.translate(0, 0.245 + (drop - 0.012) / 2, 0), cordSet.tile, 'y'), cord));
  const canopy = lathe([[0.0001, 0.0], [0.012, 0.0], [0.05, 0.012], [0.055, 0.03], [0.055, 0.036], [0.0001, 0.036]], segs(d, 64, 20), brassSet.tile);
  parts.push(part('ceiling_canopy', canopy.translate(0, 0.245 + drop - 0.012, 0), brass));
  const bulb = new THREE.SphereGeometry(0.0475, segs(d, 40, 16), segs(d, 28, 12));
  parts.push(part('globe_lamp_g95', bulb.translate(0, 0.12, 0), glass));
  const root = group('rimu_bell_pendant', ...parts);
  return root;
}
