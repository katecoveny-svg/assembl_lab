import * as THREE from 'three';
import { boxUV, detail, group, instanced, lathe, M, part, segs, slab, smoothShape, type Quality } from './util';
import { metal, pbr, plastic, wood } from './tex';
import type { ObjectInfo } from './types';

// An original solid-body electric guitar: not a copy of any maker's model. Its body and
// headstock outlines are drawn for this library; the construction follows common
// solid-body practice: 648 mm (25.5") scale, 22 frets, set neck, two humbucking pickups,
// a fixed bridge with a separate tailpiece, 3+3 tuners.
//
// Lying in the XY plane, face toward +Z, neck toward +Y, body centred near the origin.
// Metres throughout.

const SCALE = 0.648;
const FRETS = 22;
const BRIDGE_Y = -0.105; // saddle line
const NUT_Y = BRIDGE_Y + SCALE;
const BODY_T = 0.044;
const TOP_Z = BODY_T / 2;
const fretY = (n: number) => BRIDGE_Y + SCALE / Math.pow(2, n / 12);
/** board width at a point along it */
const boardW = (y: number) => THREE.MathUtils.lerp(0.0565, 0.043, (y - fretY(FRETS)) / (NUT_Y - fretY(FRETS)));

export const info: ObjectInfo = {
  key: 'guitar',
  name: 'Tōtara solid-body electric guitar',
  category: 'Musical instruments',
  summary: 'An original solid-body design: tōtara body under high-gloss lacquer, maple set neck, dark fretboard with 22 nickel-silver frets, two humbuckers, fixed bridge and stop tailpiece, 3+3 tuners.',
  dimensions: 'Overall about 965 × 350 mm; body 44 mm thick, 86 mm deep including hardware and the 10° headstock angle; scale length 648 mm (25.5″); nut width 43 mm; fretboard width 56.5 mm at the 22nd fret.',
  sources: [
    'Fret positions from the equal-temperament rule: distance from bridge = scale ÷ 2^(n/12).',
    'Scale, nut width, body thickness and string gauges (0.010–0.046″) are common solid-body values.',
  ],
  assumptions: [
    'Original body and headstock outlines; not modelled on, and not intended to match, any manufacturer’s design.',
    'Fretboard is flat (real boards have a 254–305 mm radius); neck carve is a simplified C profile.',
    'Overall length is a little under a typical 990–1000 mm solid-body because the headstock is short; scale length and string spacing are unaffected.',
    'Strings run straight from saddle to nut to post; no string wraps or ball ends.',
    'Wood, nickel and chrome surfaces are procedural textures, not photographed.',
  ],
};

function bodyShape() {
  // drawn for this library: a broad lower bout, an asymmetric waist, one deep cutaway on the
  // treble side and a short rounded shoulder on the bass side (mm, then metres)
  const p: [number, number][] = [
    [0, -230], [70, -226], [128, -205], [162, -165], [169, -112], [156, -62], [132, -28], [128, 6], [142, 48], [150, 96], [134, 140],
    [104, 156], [80, 130], [62, 94], [40, 92], [24, 128], [-28, 150], [-74, 168], [-112, 158], [-134, 116], [-136, 62], [-120, 18],
    [-126, -26], [-152, -70], [-168, -124], [-160, -176], [-122, -214], [-64, -230],
  ];
  return smoothShape(p.map(([x, y]) => [x / 1000, y / 1000 + 0.02]), 220);
}

function headstockShape() {
  // a tapered paddle with a shallow notch at the tip (drawn for this library)
  const p: [number, number][] = [
    [-22, 0], [-30, 40], [-41, 95], [-46, 150], [-36, 182], [-12, 190], [0, 178], [12, 190], [36, 182], [46, 150], [41, 95], [30, 40], [22, 0],
  ];
  return smoothShape(p.map(([x, y]) => [x / 1000, y / 1000]), 120);
}

export function build(q: Quality) {
  const d = detail(q);
  // --- materials
  const totaraSet = wood(d.tex, { light: 0xa85a34, dark: 0x7a3a1c, rings: 30, figure: 0.12, gloss: 0.95, tile: 0.45, seed: 4, name: 'totara' });
  const mapleSet = wood(d.texS, { light: 0xe6c99a, dark: 0xc49a62, rings: 30, figure: 0.08, gloss: 0.6, tile: 0.3, seed: 6, name: 'maple' });
  const boardSet = wood(d.texS, { light: 0x3a2116, dark: 0x1c0f0a, rings: 40, figure: 0.05, gloss: 0.15, tile: 0.25, seed: 8, pores: 0.8, name: 'fretboard' });
  const nickelSet = metal(d.texS, { tint: 0xd9d6cc, rough: 0.22, brush: 0.6, name: 'nickel_silver' });
  const chromeSet = metal(d.texS, { tint: 0xeceef0, rough: 0.08, brush: 0.2, name: 'chrome' });
  const blackSet = plastic(d.texS, { colour: 0x0d0d0e, rough: 0.35, name: 'black_plastic' });
  const body = pbr(totaraSet, 'totara_gloss', { clearcoat: 1, clearcoatRoughness: 0.04 });
  const maple = pbr(mapleSet, 'maple_satin', { clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const board = pbr(boardSet, 'fretboard_oiled');
  const nickel = pbr(nickelSet, 'nickel_silver');
  const chrome = pbr(chromeSet, 'chrome');
  const black = pbr(blackSet, 'black_plastic');
  const pearl = new THREE.MeshPhysicalMaterial({ name: 'mother_of_pearl', color: 0xf2efe8, roughness: 0.2, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 600] });
  const bone = new THREE.MeshPhysicalMaterial({ name: 'bone_nut', color: 0xefe6d2, roughness: 0.35 });
  const steel = new THREE.MeshPhysicalMaterial({ name: 'string_steel', color: 0xd8d8d8, metalness: 1, roughness: 0.25 });
  const bronze = new THREE.MeshPhysicalMaterial({ name: 'string_wound', color: 0xc8c0b0, metalness: 1, roughness: 0.4 });

  const parts: THREE.Object3D[] = [];
  // --- body
  const bodyG = boxUV(slab(bodyShape(), BODY_T, 0.006, d, 220), totaraSet.tile, 'y');
  parts.push(part('body', bodyG, body));

  // --- neck: a half-round C carve under the board, from the body to the nut, then the headstock
  const neckLen = NUT_Y + 0.004 - 0.12;
  const neckSeg = segs(d, 48, 12);
  const neckG = new THREE.CylinderGeometry(1, 1, 1, segs(d, 24, 10), neckSeg, false, Math.PI / 2, Math.PI);
  {
    const p = neckG.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const t = p.getY(i) + 0.5; // 0 at the body end, 1 at the nut
      const y = 0.12 + t * neckLen;
      const w = boardW(Math.min(y, NUT_Y)) / 2;
      const depth = THREE.MathUtils.lerp(0.023, 0.021, t);
      // cylinder x/z → neck x / depth below the board
      p.setXYZ(i, p.getX(i) * w, y, TOP_Z + 0.004 - Math.abs(p.getZ(i)) * depth);
    }
    neckG.computeVertexNormals();
  }
  parts.push(part('neck', boxUV(neckG, mapleSet.tile, 'y'), maple));
  // heel blending the neck into the body
  const heel = new THREE.SphereGeometry(1, segs(d, 24, 10), segs(d, 12, 6), 0, Math.PI * 2, 0, Math.PI / 2);
  heel.scale(0.03, 0.05, 0.018);
  heel.rotateX(Math.PI);
  heel.translate(0, 0.135, -TOP_Z + 0.003);
  parts.push(part('neck_heel', boxUV(heel, mapleSet.tile, 'y'), maple));

  // --- fretboard: tapered slab from just past the 22nd fret to the nut
  const y0 = fretY(FRETS) - 0.008;
  const fb = new THREE.Shape();
  fb.moveTo(-boardW(y0) / 2, y0);
  fb.lineTo(boardW(y0) / 2, y0);
  fb.lineTo(0.043 / 2, NUT_Y);
  fb.lineTo(-0.043 / 2, NUT_Y);
  fb.closePath();
  const fbG = slab(fb, 0.006, 0.0006, d, 4);
  fbG.translate(0, 0, TOP_Z + 0.007);
  parts.push(part('fretboard', boxUV(fbG, boardSet.tile, 'y'), board));

  // --- frets: one wire profile, 22 placements, each scaled to the board's width there
  const fretG = new THREE.CylinderGeometry(0.00125, 0.00125, 1, segs(d, 10, 6), 1, false, 0, Math.PI);
  fretG.rotateZ(Math.PI / 2);
  fretG.rotateX(-Math.PI / 2);
  const fretMats: THREE.Matrix4[] = [];
  for (let n = 1; n <= FRETS; n++) {
    const y = fretY(n);
    fretMats.push(M(0, y, TOP_Z + 0.01, 0, 0, 0, boardW(y) * 0.98, 1, 1));
  }
  parts.push(instanced('frets', boxUV(fretG, nickelSet.tile, 'x'), nickel, fretMats));

  // --- position markers: dots at 3 5 7 9 12(two) 15 17 19 21
  const dotG = new THREE.CylinderGeometry(0.003, 0.003, 0.0012, segs(d, 20, 10));
  dotG.rotateX(Math.PI / 2);
  const dotMats: THREE.Matrix4[] = [];
  for (const n of [3, 5, 7, 9, 12, 15, 17, 19, 21]) {
    const y = (fretY(n - 1) + fretY(n)) / 2;
    if (n === 12) dotMats.push(M(-0.011, y, TOP_Z + 0.0096), M(0.011, y, TOP_Z + 0.0096));
    else dotMats.push(M(0, y, TOP_Z + 0.0096));
  }
  parts.push(instanced('fret_markers', dotG, pearl, dotMats));

  // --- nut
  const nutG = new THREE.BoxGeometry(0.043, 0.005, 0.005);
  nutG.translate(0, NUT_Y + 0.0025, TOP_Z + 0.0115);
  parts.push(part('nut', nutG, bone));

  // --- headstock: angled back 10° from the nut
  const hsG = boxUV(slab(headstockShape(), 0.014, 0.0015, d, 120), mapleSet.tile, 'y');
  const head = new THREE.Group();
  head.name = 'headstock_assembly';
  head.add(part('headstock', hsG, maple));
  // headstock face veneer in the body timber
  const veneer = boxUV(slab(headstockShape(), 0.0015, 0.0004, d, 120), totaraSet.tile, 'y');
  veneer.translate(0, 0, 0.0075);
  head.add(part('headstock_veneer', veneer, body));
  // tuners 3+3: string post and bushing on the face, gear housing and button behind
  const tunerPos: [number, number][] = [[-0.03, 0.045], [-0.036, 0.09], [-0.038, 0.135], [0.03, 0.045], [0.036, 0.09], [0.038, 0.135]];
  const post = new THREE.CylinderGeometry(0.003, 0.003, 0.018, segs(d, 16, 8));
  post.rotateX(Math.PI / 2);
  const bush = lathe([[0.0001, 0.0035], [0.0052, 0.0035], [0.0055, 0.002], [0.0055, 0]], segs(d, 24, 10), chromeSet.tile);
  bush.rotateX(Math.PI / 2);
  const housing = new THREE.BoxGeometry(0.016, 0.019, 0.012);
  const button = new THREE.CapsuleGeometry(0.006, 0.01, segs(d, 6, 3), segs(d, 16, 8));
  button.scale(1, 1, 0.42);
  head.add(instanced('tuner_posts', post, chrome, tunerPos.map(([x, y]) => M(x, y, 0.016))));
  head.add(instanced('tuner_bushings', bush, chrome, tunerPos.map(([x, y]) => M(x, y, 0.0075))));
  head.add(instanced('tuner_housings', boxUV(housing, chromeSet.tile), chrome, tunerPos.map(([x, y]) => M(x * 1.25, y, -0.013))));
  head.add(instanced('tuner_buttons', button, chrome, tunerPos.map(([x, y]) => M(x * 1.25 + Math.sign(x) * 0.021, y, -0.013, 0, 0, Math.PI / 2))));
  head.position.set(0, NUT_Y + 0.006, TOP_Z + 0.004);
  head.rotation.x = -10 * THREE.MathUtils.DEG2RAD;
  parts.push(head);

  // --- pickups: two covered humbuckers in black surrounds, 12 pole screws each
  const pu = group('pickups');
  const cover = new THREE.BoxGeometry(0.07, 0.038, 0.016, 1, 1, 1);
  const ring = slab(roundRect(0.09, 0.05, 0.006), 0.006, 0.001, d, 16);
  const pole = new THREE.CylinderGeometry(0.0024, 0.0024, 0.0016, segs(d, 12, 8));
  pole.rotateX(Math.PI / 2);
  const poles: THREE.Matrix4[] = [];
  const covers: THREE.Matrix4[] = [];
  const rings: THREE.Matrix4[] = [];
  for (const y of [BRIDGE_Y + 0.045, BRIDGE_Y + 0.155]) {
    covers.push(M(0, y, TOP_Z + 0.006));
    rings.push(M(0, y, TOP_Z + 0.003));
    for (let i = 0; i < 6; i++) for (const r of [-0.009, 0.009]) poles.push(M((i - 2.5) * 0.0102, y + r, TOP_Z + 0.0142));
  }
  pu.add(instanced('pickup_covers', boxUV(cover, nickelSet.tile), nickel, covers));
  pu.add(instanced('pickup_rings', ring, black, rings));
  pu.add(instanced('pole_pieces', pole, nickel, poles));
  parts.push(pu);

  // --- bridge (6 adjustable saddles on a bar) and stop tailpiece
  const br = group('bridge_assembly');
  const bar = new THREE.CapsuleGeometry(0.004, 0.072, segs(d, 4, 2), segs(d, 16, 8));
  bar.rotateZ(Math.PI / 2);
  br.add(part('bridge_base', bar.clone().translate(0, BRIDGE_Y, TOP_Z + 0.007), chrome));
  const saddle = new THREE.BoxGeometry(0.0085, 0.006, 0.004);
  br.add(instanced('saddles', saddle, chrome, Array.from({ length: 6 }, (_, i) => M((i - 2.5) * 0.0105, BRIDGE_Y + (i % 2 ? 0.0012 : -0.0008), TOP_Z + 0.0115))));
  const studG = lathe([[0.0001, 0.012], [0.0042, 0.012], [0.0042, 0.009], [0.0028, 0.008], [0.0028, 0]], segs(d, 20, 8), chromeSet.tile);
  studG.rotateX(Math.PI / 2);
  br.add(instanced('bridge_posts', studG, chrome, [M(-0.041, BRIDGE_Y, TOP_Z), M(0.041, BRIDGE_Y, TOP_Z)]));
  const tail = new THREE.CapsuleGeometry(0.0055, 0.068, segs(d, 4, 2), segs(d, 16, 8));
  tail.rotateZ(Math.PI / 2);
  br.add(part('tailpiece', tail.translate(0, BRIDGE_Y - 0.04, TOP_Z + 0.008), chrome));
  br.add(instanced('tailpiece_studs', studG, chrome, [M(-0.044, BRIDGE_Y - 0.04, TOP_Z), M(0.044, BRIDGE_Y - 0.04, TOP_Z)]));
  parts.push(br);

  // --- controls: 2 volume + 1 tone dome knobs, a 3-way switch, output jack, strap buttons
  const knob = lathe([[0.0001, 0.017], [0.006, 0.0168], [0.0095, 0.014], [0.0105, 0.004], [0.0112, 0.0005], [0.0112, 0]], segs(d, 32, 12), blackSet.tile);
  knob.rotateX(Math.PI / 2);
  const knobAt: [number, number][] = [[0.086, -0.12], [0.112, -0.155], [0.07, -0.168]];
  parts.push(instanced('control_knobs', knob, black, knobAt.map(([x, y]) => M(x, y, TOP_Z))));
  const sw = group('selector_switch');
  const swRing = lathe([[0.0001, 0.003], [0.007, 0.003], [0.0075, 0]], segs(d, 24, 10), chromeSet.tile);
  swRing.rotateX(Math.PI / 2);
  sw.add(part('switch_ring', swRing.translate(-0.1, 0.095, TOP_Z), chrome));
  const lever = new THREE.CylinderGeometry(0.0012, 0.0016, 0.022, 8);
  lever.rotateX(Math.PI / 2 - 0.3);
  sw.add(part('switch_lever', lever.translate(-0.1, 0.099, TOP_Z + 0.012), chrome));
  const tip = new THREE.SphereGeometry(0.004, 12, 8);
  sw.add(part('switch_tip', tip.translate(-0.1, 0.102, TOP_Z + 0.023), bone));
  parts.push(sw);
  const jack = lathe([[0.0001, 0.004], [0.009, 0.004], [0.009, 0], [0.0035, 0]], segs(d, 24, 10), chromeSet.tile);
  jack.rotateZ(-Math.PI / 2);
  parts.push(part('output_jack', jack.translate(0.168, -0.12, 0), chrome));
  const strap = lathe([[0.0001, 0.011], [0.0045, 0.011], [0.0048, 0.008], [0.0026, 0.005], [0.0035, 0.002], [0.0035, 0]], segs(d, 20, 8), chromeSet.tile);
  parts.push(instanced('strap_buttons', strap, chrome, [M(0, -0.21 - 0.0035, 0, Math.PI, 0, 0), M(-0.074, 0.188 + 0.0035, 0)]));

  // --- strings: one cylinder each from saddle to nut (instanced, scaled per gauge), then nut to post
  const gauges = [0.046, 0.036, 0.026, 0.017, 0.013, 0.01].map((g) => (g * 0.0254) / 2);
  const strG = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
  const plain: THREE.Matrix4[] = [];
  const wound: THREE.Matrix4[] = [];
  const headQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -10 * THREE.MathUtils.DEG2RAD);
  for (let i = 0; i < 6; i++) {
    const xb = (i - 2.5) * 0.0105;
    const xn = (i - 2.5) * 0.0074;
    const a = new THREE.Vector3(xb, BRIDGE_Y, TOP_Z + 0.0135);
    const b = new THREE.Vector3(xn, NUT_Y + 0.003, TOP_Z + 0.0142);
    const [px, py] = tunerPos[i < 3 ? i : 3 + (5 - i)];
    const c = new THREE.Vector3(px, py, 0.016).applyQuaternion(headQ).add(new THREE.Vector3(0, NUT_Y + 0.006, TOP_Z + 0.004));
    const into = i < 3 ? wound : plain;
    for (const [p0, p1] of [[a, b], [b, c]] as const) {
      const dir = p1.clone().sub(p0);
      const mid = p0.clone().add(p1).multiplyScalar(0.5);
      const qn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      into.push(new THREE.Matrix4().compose(mid, qn, new THREE.Vector3(gauges[i], dir.length(), gauges[i])));
    }
  }
  parts.push(instanced('strings_wound', strG, bronze, wound));
  parts.push(instanced('strings_plain', strG, steel, plain));

  const root = group('totara_electric_guitar', ...parts);
  return root;
}

function roundRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  // the pickup sits in the ring: cut its window
  const hole = new THREE.Path();
  const hw = 0.0355;
  const hh = 0.0195;
  hole.moveTo(-hw, -hh);
  hole.lineTo(-hw, hh);
  hole.lineTo(hw, hh);
  hole.lineTo(hw, -hh);
  hole.closePath();
  s.holes.push(hole);
  return s;
}
