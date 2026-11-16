import * as THREE from 'three';
import { boxUV, detail, group, instanced, lathe, M, part, segs, slab, smoothShape, type Quality } from './util';
import { castIron, metal, pbr, plastic, wood } from './tex';
import type { ObjectInfo } from './types';

// Kitchen pieces, all original designs: a brushed-steel electric kettle on its power base,
// a 210 mm chef's knife with a tōtara handle, and a 260 mm seasoned cast-iron skillet.
// Metres, +Y up, resting on y = 0.

// --- kettle ------------------------------------------------------------------------------
export const kettleInfo: ObjectInfo = {
  key: 'kettle',
  name: 'Brushed-steel electric kettle',
  category: 'Kitchen',
  summary: 'An original 1.7 L cordless kettle: brushed stainless body, domed lid with a resin knob, short spout with a filter lip, a black resin handle, on a separate 360° power base.',
  dimensions: 'Kettle on base 252 mm tall; body Ø 190 mm at its widest; 1.7 L nominal; base Ø 170 × 22 mm. Spout to handle 262 mm.',
  sources: ['Capacity and footprint typical of 1.7 L cordless kettles; the body volume of this profile is about 1.9 L gross.'],
  assumptions: ['Original design.', 'No heating element, cord or electronics are modelled.', 'Steel and resin surfaces are procedural textures.'],
};

export function buildKettle(q: Quality) {
  const d = detail(q);
  const steelSet = metal(d.tex, { tint: 0xd0d2d4, rough: 0.28, brush: 1, tile: 0.12, name: 'brushed_stainless' });
  const resinSet = plastic(d.texS, { colour: 0x141415, rough: 0.4, name: 'black_resin' });
  const steel = pbr(steelSet, 'brushed_stainless');
  const resin = pbr(resinSet, 'black_resin');
  const base0 = 0.022;
  const parts: THREE.Object3D[] = [];
  const bodyProf: [number, number][] = [[0.0001, 0.004], [0.07, 0.004], [0.085, 0.008], [0.093, 0.03], [0.095, 0.07], [0.09, 0.12], [0.078, 0.17], [0.066, 0.2], [0.064, 0.206], [0.06, 0.206]];
  const body = lathe(bodyProf.map(([r, y]) => [r, y + base0]), segs(d, 96, 28), steelSet.tile);
  parts.push(part('body', body, steel));
  const lidProf: [number, number][] = [[0.0001, 0.222], [0.02, 0.221], [0.045, 0.216], [0.058, 0.208], [0.06, 0.204], [0.06, 0.2]];
  parts.push(part('lid', lathe(lidProf.map(([r, y]) => [r, y + base0]), segs(d, 72, 24), steelSet.tile), steel));
  const knob = lathe([[0.0001, 0.018], [0.012, 0.017], [0.016, 0.01], [0.013, 0.002], [0.013, 0]], segs(d, 40, 14), resinSet.tile);
  parts.push(part('lid_knob', knob.translate(0, 0.221 + base0, 0), resin));
  // spout: a short flared tube from the upper body, tilted forward (+Z)
  const spoutCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.15 + base0, 0.07), new THREE.Vector3(0, 0.175 + base0, 0.098), new THREE.Vector3(0, 0.198 + base0, 0.115)]);
  const spout = new THREE.TubeGeometry(spoutCurve, segs(d, 24, 8), 1, segs(d, 24, 10), false);
  {
    const p = spout.getAttribute('position');
    const c = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const rows = segs(d, 24, 8) + 1;
    const cols = segs(d, 24, 10) + 1;
    for (let i = 0; i < rows; i++) {
      const t = i / (rows - 1);
      spoutCurve.getPointAt(t, c);
      const r = THREE.MathUtils.lerp(0.024, 0.016, t);
      for (let j = 0; j < cols; j++) {
        const k = i * cols + j;
        tmp.fromBufferAttribute(p, k).sub(c).normalize().multiplyScalar(r);
        // flatten sideways into a lip toward the mouth
        tmp.x *= THREE.MathUtils.lerp(1, 1.25, t);
        p.setXYZ(k, c.x + tmp.x, c.y + tmp.y, c.z + tmp.z);
      }
    }
    spout.computeVertexNormals();
  }
  parts.push(part('spout', boxUV(spout, steelSet.tile, 'y'), steel));
  // handle: a resin loop on the back (-Z)
  const hc = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.185 + base0, -0.072),
    new THREE.Vector3(0, 0.19 + base0, -0.118),
    new THREE.Vector3(0, 0.15 + base0, -0.142),
    new THREE.Vector3(0, 0.08 + base0, -0.14),
    new THREE.Vector3(0, 0.045 + base0, -0.105),
    new THREE.Vector3(0, 0.04 + base0, -0.09),
  ]);
  const handle = new THREE.TubeGeometry(hc, segs(d, 64, 18), 0.011, segs(d, 20, 8), false);
  handle.scale(1.35, 1, 1);
  parts.push(part('handle', boxUV(handle, resinSet.tile, 'y'), resin));
  const sw = new THREE.CapsuleGeometry(0.004, 0.012, 4, 10);
  parts.push(part('power_switch', sw.translate(0, 0.055 + base0, -0.142), resin));
  // power base
  const pb = lathe([[0.0001, 0.0], [0.082, 0.0], [0.085, 0.004], [0.085, 0.016], [0.08, 0.021], [0.04, 0.022], [0.0001, 0.022]], segs(d, 72, 24), resinSet.tile);
  parts.push(part('power_base', pb, resin));
  return group('brushed_steel_kettle', ...parts);
}

// --- chef's knife -----------------------------------------------------------------------
export const knifeInfo: ObjectInfo = {
  key: 'knife',
  name: '210 mm chef’s knife, tōtara handle',
  category: 'Kitchen',
  summary: 'An original Western-profile chef’s knife: satin stainless blade with a ground edge, a full tang between tōtara scales, three steel rivets, a rounded bolster.',
  dimensions: 'Blade 210 × 48 mm, spine 2.4 mm tapering to the tip; handle 125 mm; overall 345 mm. Lying flat on its side.',
  sources: ['210 mm blade, 45–50 mm heel height and ~2.5 mm spine are typical chef’s-knife figures.'],
  assumptions: ['Original profile.', 'The edge bevel is a geometric taper, not a sharpened apex.', 'Steel and timber are procedural textures.'],
};

export function buildKnife(q: Quality) {
  const d = detail(q);
  const bladeSet = metal(d.tex, { tint: 0xc8cacc, rough: 0.2, brush: 0.9, tile: 0.1, name: 'satin_stainless' });
  const totaraSet = wood(d.texS, { light: 0xa8582e, dark: 0x5e2812, rings: 24, gloss: 0.35, tile: 0.18, seed: 41, name: 'totara_scales' });
  const blade = pbr(bladeSet, 'satin_stainless');
  const scale = pbr(totaraSet, 'totara_oiled');
  const rivetM = pbr(metal(256, { tint: 0xdedede, rough: 0.15, brush: 0.2, name: 'rivet_steel' }), 'rivet_steel');
  // blade profile in XY (x along the knife, y up), heel at x = 0
  const bladePts: [number, number][] = [[0, 0.002], [0.04, 0.0], [0.11, 0.003], [0.17, 0.012], [0.2, 0.026], [0.21, 0.038], [0.18, 0.042], [0.1, 0.047], [0.02, 0.048], [0, 0.046]];
  const bg = slab(smoothShape(bladePts, 160), 0.0024, 0.0003, d, 160);
  {
    // grind: the blade thins toward the edge (y = 0) and toward the tip
    const p = bg.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const edge = THREE.MathUtils.smoothstep(y, 0, 0.03);
      const tip = 1 - THREE.MathUtils.smoothstep(x, 0.12, 0.215) * 0.75;
      p.setZ(i, p.getZ(i) * (0.08 + 0.92 * edge) * tip);
    }
    bg.computeVertexNormals();
  }
  const parts: THREE.Object3D[] = [part('blade', boxUV(bg, bladeSet.tile, 'x'), blade)];
  const bol = new THREE.CapsuleGeometry(0.0055, 0.03, 6, segs(d, 20, 8));
  bol.scale(1.6, 1, 1);
  parts.push(part('bolster', bol.translate(-0.006, 0.026, 0), blade));
  // handle: tang (steel) between two scales
  const hPts: [number, number][] = [[-0.008, 0.008], [-0.06, 0.012], [-0.11, 0.01], [-0.128, 0.018], [-0.13, 0.032], [-0.118, 0.04], [-0.06, 0.042], [-0.008, 0.044]];
  const shapeH = smoothShape(hPts, 100);
  const tang = slab(shapeH, 0.0024, 0.0002, d, 100);
  parts.push(part('tang', boxUV(tang, bladeSet.tile, 'x'), blade));
  for (const side of [1, -1]) {
    const sc = slab(shapeH, 0.0075, 0.0028, d, 100);
    sc.translate(0, 0, side * (0.0012 + 0.0037));
    parts.push(part(side > 0 ? 'handle_scale_right' : 'handle_scale_left', boxUV(sc, totaraSet.tile, 'x'), scale));
  }
  const rivet = new THREE.CylinderGeometry(0.0028, 0.0028, 0.0172, segs(d, 20, 8));
  rivet.rotateX(Math.PI / 2);
  parts.push(instanced('rivets', rivet, rivetM, [M(-0.028, 0.027), M(-0.065, 0.027), M(-0.1, 0.026)]));
  const root = group('chefs_knife_210', ...parts);
  // lying on its side on y = 0, edge toward +Z
  root.rotation.x = -Math.PI / 2;
  root.position.y = 0.0055;
  return group('chefs_knife', root);
}

// --- cast-iron skillet --------------------------------------------------------------------
export const panInfo: ObjectInfo = {
  key: 'pan',
  name: '260 mm cast-iron skillet',
  category: 'Kitchen',
  summary: 'An original seasoned cast-iron skillet: thick flat base, flared wall, two pour lips, a long handle with a hanging hole and a helper handle opposite.',
  dimensions: 'Ø 260 mm at the rim, Ø 210 mm cooking surface, 52 mm tall, wall 5 mm; overall length with handles 452 mm.',
  sources: ['260 mm rim, ~5 mm walls and a ~50 mm depth are common for 10–10.5″ skillets.'],
  assumptions: ['Original design.', 'Pour lips are shaped into the rim; casting marks are not modelled.', 'Seasoned iron surface is a procedural texture.'],
};

export function buildPan(q: Quality) {
  const d = detail(q);
  const ironSet = castIron(d.tex, { tile: 0.12 });
  const iron = pbr(ironSet, 'seasoned_cast_iron');
  const prof: [number, number][] = [[0.0001, 0.006], [0.105, 0.006], [0.11, 0.0075], [0.124, 0.045], [0.128, 0.052], [0.13, 0.05], [0.126, 0.044], [0.11, 0.008], [0.104, 0.0], [0.0001, 0.0]];
  const bowl = lathe(prof.map(([r, y]) => [r, y]), segs(d, 128, 36), ironSet.tile);
  {
    // pour lips: pull the rim out and down a touch at ±X
    const p = bowl.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y < 0.03) continue;
      const a = Math.atan2(p.getZ(i), p.getX(i));
      const lip = Math.pow(Math.max(Math.abs(Math.cos(a)), 0), 40) * THREE.MathUtils.smoothstep(y, 0.03, 0.052);
      const k = 1 + lip * 0.06;
      p.setXYZ(i, p.getX(i) * k, y - lip * 0.004, p.getZ(i) * k);
    }
    bowl.computeVertexNormals();
  }
  const parts: THREE.Object3D[] = [part('pan_body', bowl, iron)];
  // handle along +Z: a tapered, slightly rising bar with a hole near the end
  const hs = new THREE.Shape();
  hs.moveTo(-0.017, 0);
  hs.lineTo(-0.011, 0.155);
  hs.quadraticCurveTo(0, 0.175, 0.011, 0.155);
  hs.lineTo(0.017, 0);
  hs.closePath();
  const hole = new THREE.Path();
  hole.absellipse(0, 0.142, 0.0055, 0.011, 0, Math.PI * 2, false, 0);
  hs.holes.push(hole);
  const hg = slab(hs, 0.011, 0.003, d, 48);
  // shape +Y → out along +Z, rising about 10°
  hg.rotateX(Math.PI / 2 - 0.17);
  hg.translate(0, 0.04, 0.12);
  parts.push(part('handle', boxUV(hg, ironSet.tile, 'z'), iron));
  const helper = new THREE.TorusGeometry(0.026, 0.006, segs(d, 10, 6), segs(d, 32, 10), Math.PI);
  helper.rotateX(-Math.PI / 2);
  helper.rotateY(Math.PI);
  helper.scale(1, 1, 0.8);
  parts.push(part('helper_handle', boxUV(helper.translate(0, 0.047, -0.124), ironSet.tile), iron));
  return group('cast_iron_skillet_260', ...parts);
}
