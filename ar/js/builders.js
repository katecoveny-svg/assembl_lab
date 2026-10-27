// assembl AR: every object the studio can make, built in the browser in real-world metres.
// Each builder returns {object, title, kind, note, shareable, spec?, fixedScale, mount}. The object sits on its base
// (lowest point at y = 0), centred on x and z, facing +z. object.userData.parts lists the pieces the stage can
// bring together when the object first appears.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from '../vendor/three/loaders/GLTFLoader.js';
import { SVGLoader } from '../vendor/three/loaders/SVGLoader.js';
import { loadFont, layout, glyphShapes, FONTS } from './fonts.js';
import { PAL, swatch, finish, isLight } from './palette.js';
import { decodeLogo, modelFromShapes, packLogo, normalise, CARS, CAR_PAINTS } from './codec.js';

export const KIND_LABEL = { text: '3D text', logo: '3D logo', frame: 'Photo frame', car: 'Library car', bike: 'Library bike', glb: 'Your 3D file' };

export function makeMaterial(hex, finishId = 's', extra = {}) {
  const f = finish(finishId);
  return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex), roughness: f.roughness, metalness: f.metalness,
    clearcoat: f.clearcoat, clearcoatRoughness: 0.18, ...extra });
}

// Lift a group so its lowest point is on y = 0 and centre it on x and z.
export function seat(content, name = 'assembl AR object') {
  const root = new THREE.Group(); root.name = name;
  root.add(content);
  content.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(content, true);
  const c = box.getCenter(new THREE.Vector3());
  content.position.x -= c.x; content.position.z -= c.z; content.position.y -= box.min.y;
  root.updateMatrixWorld(true);
  return root;
}
export function sizeOf(obj) {
  obj.updateMatrixWorld(true);
  const s = new THREE.Box3().setFromObject(obj, true).getSize(new THREE.Vector3());
  return { x: s.x, y: s.y, z: s.z };
}
const fmtLen = m => (m >= 1 ? (Math.round(m * 100) / 100).toFixed(m >= 10 ? 1 : 2).replace(/\.?0+$/, '') + ' m' : m >= 0.1 ? Math.round(m * 100) + ' cm' : (Math.round(m * 1000) / 10).toString().replace(/\.0$/, '') + ' cm');
export const fmtSize = s => {
  const big = Math.max(s.x, s.y, s.z) >= 1;
  if (big) return [s.x, s.y, s.z].map(v => (Math.round(v * 100) / 100).toFixed(2).replace(/\.?0+$/, '')).join(' × ') + ' m';
  return [s.x, s.y, s.z].map(v => (v * 100 >= 10 ? Math.round(v * 100) : Math.round(v * 1000) / 10)).join(' × ') + ' cm';
};
export { fmtLen };

function plinth(width, height, depth, hex) {
  const r = Math.min(height * 0.38, width * 0.08, depth * 0.2);
  const m = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 3, r), makeMaterial(hex, 's'));
  m.name = 'Base'; m.position.y = height / 2;
  return m;
}
const baseColourFor = id => (isLight(id) ? PAL.ink : PAL.chalk);

// ---------------------------------------------------------------- 3D text
export async function buildText(spec0) {
  const spec = normalise({ ...spec0, k: 'text' });
  const font = await loadFont(spec.f);
  const cap = spec.h / 1000, scale = cap / font.capHeight, depth = Math.max(0.002, cap * spec.d / 100);
  const L = layout(font, spec.t, { tracking: spec.f === 'mono' ? 0 : -8 });
  const mat = makeMaterial(swatch(spec.c).hex, spec.m);
  const bevel = Math.min(depth * 0.16, cap * 0.022);
  const opts = { depth: Math.max(1e-4, depth - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.7,
    bevelOffset: -bevel * 0.7, bevelSegments: 3, curveSegments: cap >= 0.2 ? 10 : 7 };
  const letters = new THREE.Group(); letters.name = 'Letters';
  const parts = [];
  const n = L.lines.length;
  L.lines.forEach((line, i) => {
    const baseline = (n - 1 - i) * L.advance * scale, ox = -line.width * scale / 2;
    for (const g of line.glyphs) {
      const shapes = glyphShapes(font, g.ch, scale, ox + g.x * scale, baseline);
      if (!shapes.length) continue;
      const geo = new THREE.ExtrudeGeometry(shapes, opts);
      geo.translate(0, 0, -opts.depth / 2);
      const m = new THREE.Mesh(geo, mat); m.name = 'Letter ' + g.ch;
      letters.add(m); parts.push(m);
    }
  });
  if (!parts.length) throw new Error('None of those characters are in the font.');
  const content = new THREE.Group(); content.add(letters);
  letters.updateMatrixWorld(true);
  const lb = new THREE.Box3().setFromObject(letters, true), ls = lb.getSize(new THREE.Vector3());
  if (spec.b) {
    const desc = Math.max(0, -lb.min.y);
    const h = Math.max(cap * 0.2, desc + cap * 0.07, 0.004), pad = cap * 0.34;
    const base = plinth(ls.x + 2 * pad, h, depth + 2 * pad * 0.85, baseColourFor(spec.c));
    base.position.x = (lb.min.x + lb.max.x) / 2;
    letters.position.y = h;
    content.add(base); parts.unshift(base);
  }
  const object = seat(content, 'assembl AR · ' + spec.t.replace(/\n/g, ' '));
  object.userData.parts = parts;
  return { object, kind: 'text', title: spec.t.replace(/\n/g, ' / '), shareable: true, spec, fixedScale: false, mount: 'floor',
    note: `${FONTS[spec.f].name} · ${Math.round(spec.h / 10 * 10) / 10} cm letters` };
}

// ---------------------------------------------------------------- 3D logo from SVG
// Read an SVG file into the compact outline model (never put into the page as markup).
export function logoFromSVGText(text) {
  if (!/<svg[\s>]/i.test(text)) throw new Error('That file doesn’t look like an SVG.');
  const data = new SVGLoader().parse(text);
  const items = []; let strokes = 0;
  for (const path of data.paths) {
    const st = path.userData && path.userData.style || {};
    const filled = st.fill !== undefined && st.fill !== 'none' && st.fill !== 'transparent' && Number(st.fillOpacity ?? 1) > 0.01 && Number(st.opacity ?? 1) > 0.01;
    if (!filled) { if (st.stroke && st.stroke !== 'none') strokes++; continue; }
    const colour = path.color.getHexString().toUpperCase();
    for (const shape of SVGLoader.createShapes(path)) items.push({ shape, colour });
  }
  if (!items.length) {
    throw new Error(strokes ? 'This SVG is drawn with strokes only. Turn the strokes into outlines (Outline stroke in Figma, Outline Stroke in Illustrator) and try again.' : 'This SVG has no filled shapes we can use.');
  }
  return { items, strokes };
}

// Pack for a link. Tries a fine grid first, then coarser ones if the link would be long.
export function packLogoForLink(items, budget = 1400) {
  let best = null;
  for (const grid of [2000, 1200, 800]) {
    const model = modelFromShapes(items, grid);
    const s = packLogo(model);
    best = { s, grid, model };
    if (s.length <= budget) break;
  }
  return best;
}

export function buildLogo(spec0) {
  const spec = normalise({ ...spec0, k: 'logo' });
  const model = decodeLogo(spec.s);
  const W = spec.w / 1000, u = W / Math.max(model.w, model.h);
  const depth = Math.max(0.002, W * spec.d / 100);
  const bevel = [0, 0.3, 0.55, 0.85][spec.v] * Math.min(depth * 0.42, W * 0.014);
  const opts = { depth: Math.max(1e-4, depth - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.75,
    bevelOffset: -bevel * 0.75, bevelSegments: bevel > 0 ? 3 : 1, curveSegments: 10 };
  const P = (x, y) => [(x - model.w / 2) * u, (model.h - y) * u];
  const toPath = (ring, path) => {
    path.moveTo(...P(...ring.start));
    for (const s of ring.segs) {
      const p = s.p;
      if (s.t === 0) path.lineTo(...P(p[0], p[1]));
      else if (s.t === 1) path.quadraticCurveTo(...P(p[0], p[1]), ...P(p[2], p[3]));
      else path.bezierCurveTo(...P(p[0], p[1]), ...P(p[2], p[3]), ...P(p[4], p[5]));
    }
    return path;
  };
  const colourOf = i => (spec.c === 'own' ? '#' + (model.colours[i] || '492B3E') : swatch(spec.c).hex);
  const mats = new Map();
  const matFor = hex => { if (!mats.has(hex)) mats.set(hex, makeMaterial(hex, spec.m)); return mats.get(hex); };
  const pieces = new THREE.Group(); pieces.name = 'Logo';
  const parts = [];
  const perShape = model.shapes.length <= 80;
  const groups = new Map();
  model.shapes.forEach((sh, i) => {
    const shape = toPath(sh.rings[0], new THREE.Shape());
    for (const h of sh.rings.slice(1)) shape.holes.push(toPath(h, new THREE.Path()));
    const key = perShape ? i : colourOf(sh.c);
    if (!groups.has(key)) groups.set(key, { hex: colourOf(sh.c), shapes: [] });
    groups.get(key).shapes.push(shape);
  });
  for (const { hex, shapes } of groups.values()) {
    const geo = new THREE.ExtrudeGeometry(shapes, opts);
    geo.translate(0, 0, -opts.depth / 2);
    const m = new THREE.Mesh(geo, matFor(hex)); m.name = 'Logo piece';
    pieces.add(m); parts.push(m);
  }
  const content = new THREE.Group(); content.add(pieces);
  if (spec.b) {
    const h = Math.max(W * 0.06, 0.004), pad = W * 0.1;
    const light = spec.c === 'own' ? false : isLight(spec.c);
    const base = plinth(model.w * u + 2 * pad, h, depth + 2 * pad, light ? PAL.ink : PAL.chalk);
    pieces.position.y = h;
    content.add(base); parts.unshift(base);
  }
  const object = seat(content, 'assembl AR · logo');
  object.userData.parts = parts;
  return { object, kind: 'logo', title: 'Your logo', shareable: true, spec, fixedScale: false, mount: 'floor',
    note: `${model.shapes.length} shape${model.shapes.length === 1 ? '' : 's'} · ${Math.round(spec.w / 10)} cm across` };
}

// ---------------------------------------------------------------- photo or poster frame (this device only)
export const FRAME_SIZES = [
  { id: 'a4', name: 'A4', long: 0.297 }, { id: 'a3', name: 'A3', long: 0.42 }, { id: 'a2', name: 'A2', long: 0.594 },
  { id: 'p70', name: '50 × 70 cm', long: 0.70 }, { id: 'a0', name: 'A0', long: 1.189 }
];
export function imageToCanvas(img, max = 2048) {
  const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
  const k = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}
export function buildFrame({ canvas, size = 'a3', colour = 'ink', mat = true, mount = 'wall', name = 'Your photo' }) {
  const S = FRAME_SIZES.find(s => s.id === size) || FRAME_SIZES[1];
  const ar = canvas.width / canvas.height;
  const pw = ar >= 1 ? S.long : S.long * ar, ph = ar >= 1 ? S.long / ar : S.long;
  const m = mat ? S.long * 0.075 : 0, fw = Math.max(0.016, S.long * 0.042), fd = Math.max(0.022, S.long * 0.045);
  const iw = pw + 2 * m, ih = ph + 2 * m, ow = iw + 2 * fw, oh = ih + 2 * fw;
  const frameMat = makeMaterial(swatch(colour).hex, 's');
  const group = new THREE.Group();
  // moulding: a rectangle with a rectangular hole, extruded with a soft bevel
  const outer = new THREE.Shape();
  outer.moveTo(-ow / 2, 0); outer.lineTo(ow / 2, 0); outer.lineTo(ow / 2, oh); outer.lineTo(-ow / 2, oh); outer.lineTo(-ow / 2, 0);
  const hole = new THREE.Path();
  hole.moveTo(-iw / 2, fw); hole.lineTo(-iw / 2, fw + ih); hole.lineTo(iw / 2, fw + ih); hole.lineTo(iw / 2, fw); hole.lineTo(-iw / 2, fw);
  outer.holes.push(hole);
  const bev = fw * 0.14;
  const mg = new THREE.ExtrudeGeometry(outer, { depth: fd - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 2, curveSegments: 1 });
  mg.translate(0, 0, bev);
  const moulding = new THREE.Mesh(mg, frameMat); moulding.name = 'Frame';
  group.add(moulding);
  // backing board (shows as the mat) and the picture, set back from the front of the frame
  const front = fd * 0.62;
  const back = new THREE.Mesh(new THREE.BoxGeometry(iw + fw * 0.6, ih + fw * 0.6, front * 0.92), makeMaterial(PAL.paper, 's'));
  back.position.set(0, fw + ih / 2, front * 0.46); back.name = 'Mat';
  group.add(back);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.userData.mimeType = 'image/jpeg'; tex.anisotropy = 4;
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0 }));
  pic.position.set(0, fw + ih / 2, front * 0.92 + 0.0008); pic.name = 'Picture';
  group.add(pic);
  const parts = [moulding, back, pic];
  let content = group;
  if (mount === 'stand') {
    // lean back 10° on a kickstand, like a frame on a desk
    const tilt = THREE.MathUtils.degToRad(10);
    const holder = new THREE.Group(); holder.add(group); group.rotation.x = -tilt;
    const legLen = oh * 0.62, legW = Math.max(0.02, ow * 0.08), legT = 0.006;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(legW, legLen, legT), frameMat);
    const top = new THREE.Vector3(0, oh * 0.58, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), -tilt);
    const footZ = top.z - Math.sqrt(Math.max(0, legLen * legLen - top.y * top.y));
    leg.position.set(0, top.y / 2, (top.z + footZ) / 2 - legT);
    leg.rotation.x = Math.atan2(top.z - footZ, top.y);
    leg.name = 'Stand'; holder.add(leg); parts.push(leg);
    content = holder;
  }
  const object = seat(content, 'assembl AR · ' + name);
  object.userData.parts = parts;
  return { object, kind: 'frame', title: name, shareable: false, fixedScale: true, mount: mount === 'wall' ? 'wall' : 'floor',
    note: `${S.name} picture · ${mat ? 'with mat' : 'no mat'} · ${mount === 'wall' ? 'hangs on a wall' : 'stands on a table'}` };
}

// ---------------------------------------------------------------- library: assembl's own cars
const gltf = () => new GLTFLoader();
const carCache = new Map();
export const carURL = (id, scale) => new URL(`../models/car_${id}${scale === 'table' ? '_table' : ''}.glb`, import.meta.url).href;
export async function buildCar(spec0) {
  const spec = normalise({ ...spec0, k: 'car' });
  if (!carCache.has(spec.m)) carCache.set(spec.m, gltf().loadAsync(carURL(spec.m, 'real')).then(g => g.scene));
  const src = await carCache.get(spec.m);
  const car = src.clone(true);
  const paint = CAR_PAINTS.find(p => p.id === spec.p);
  car.traverse(o => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
    for (const m of [].concat(o.material)) if (m.name === 'paint' && spec.p !== 'silver') m.color.set(paint.hex);
  });
  const k = spec.s === 'real' ? 1 : 1 / 18;
  car.scale.multiplyScalar(k);
  const object = seat(car, 'assembl AR · ' + spec.m);
  object.userData.parts = [];
  const name = CARS.find(c => c.id === spec.m).name;
  return { object, kind: 'car', title: name + (spec.s === 'real' ? ', real size' : ', table model'), shareable: true, spec, fixedScale: spec.s === 'real', mount: 'floor',
    note: `assembl’s own model · ${spec.s === 'real' ? 'real size (1:1)' : 'table model (1:18)'} · ${paint.name.toLowerCase()} paint`, sceneViewer: carURL(spec.m, spec.s) };
}

// ---------------------------------------------------------------- library: the Print Lab downhill bike
let bikeModule = null;
export async function buildBike(spec0) {
  const spec = normalise({ ...spec0, k: 'bike' });
  bikeModule = bikeModule || import(new URL('../../study/print/model.js', import.meta.url).href);
  const { createBike } = await bikeModule;
  const { group, stats } = createBike(THREE, { wheelbase: spec.wb, wheelDiameter: spec.wd, suspension: spec.su,
    frame: '#' + spec.fr, accent: '#' + spec.ac, base: !!spec.b, detail: 'standard', name: 'Downhill bike' });
  // Print Lab works in millimetres at about 1:10; real size is ten times that
  group.scale.setScalar(spec.s === 'real' ? 0.01 : 0.001);
  const object = seat(group, 'assembl AR · downhill bike');
  object.userData.parts = group.children.slice();
  return { object, kind: 'bike', title: 'Downhill bike' + (spec.s === 'real' ? ', real size' : ', display model'), shareable: true, spec,
    fixedScale: spec.s === 'real', mount: 'floor',
    note: `From the Print Lab · ${spec.wb} mm wheelbase at 1:10${spec.s === 'real' ? ', shown at real size' : ''} · ${Math.round(stats.triangles / 1000)}k triangles` };
}

// ---------------------------------------------------------------- your own GLB (this device only)
export async function buildUpload(buffer, { fit = 'auto', name = 'Your model' } = {}) {
  let g;
  try { g = await gltf().parseAsync(buffer, ''); }
  catch (e) {
    const msg = String(e && e.message || e);
    if (/DRACO/i.test(msg)) throw new Error('This file uses Draco compression, which this studio can’t open yet. Export it without Draco and try again.');
    if (/KTX2|meshopt/i.test(msg)) throw new Error('This file uses KTX2 textures or meshopt compression, which this studio can’t open yet.');
    throw new Error('We couldn’t read that file as a GLB. ' + msg.slice(0, 140));
  }
  const scene = g.scene || g.scenes[0];
  scene.updateMatrixWorld(true);
  const s = new THREE.Box3().setFromObject(scene, true).getSize(new THREE.Vector3());
  const longest = Math.max(s.x, s.y, s.z);
  if (!(longest > 0)) throw new Error('That file has no visible geometry.');
  let k = 1, why = 'as authored (glTF uses metres)';
  if (fit === 'desk' || (fit === 'auto' && (longest > 30 || longest < 0.02))) { k = 0.3 / longest; why = 'fitted to 30 cm'; }
  scene.scale.multiplyScalar(k);
  const object = seat(scene, 'assembl AR · ' + name);
  object.userData.parts = [];
  let tris = 0;
  object.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  return { object, kind: 'glb', title: name, shareable: false, fixedScale: k === 1, mount: 'floor',
    note: `${Math.round(tris).toLocaleString('en-NZ')} triangles · ${why}`, authored: { x: s.x, y: s.y, z: s.z }, fit: k === 1 ? 'auto' : 'desk' };
}

// ---------------------------------------------------------------- from a share spec
export async function buildFromSpec(spec) {
  switch (spec && spec.k) {
    case 'text': return buildText(spec);
    case 'logo': return buildLogo(spec);
    case 'car': return buildCar(spec);
    case 'bike': return buildBike(spec);
    default: throw new Error('Unknown object');
  }
}
