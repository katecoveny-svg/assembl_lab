import * as THREE from 'three';

export type Quality = 'hq' | 'web';

export interface Detail {
  q: Quality;
  /** main texture size */
  tex: number;
  /** minor texture size */
  texS: number;
  /** curve segments multiplier */
  seg: number;
}

export function detail(q: Quality): Detail {
  return q === 'hq' ? { q, tex: 2048, texS: 1024, seg: 1 } : { q, tex: 512, texS: 256, seg: 0.4 };
}

/** at least n segments, scaled by quality */
export const segs = (d: Detail, n: number, min = 6) => Math.max(min, Math.round(n * d.seg));

type Axis = 'x' | 'y' | 'z';

/**
 * Box-projected UVs in metres divided by the texture tile, so texel density matches across
 * parts. `along` = the world axis the texture's U (wood grain, brushing) should follow.
 */
export function boxUV(g: THREE.BufferGeometry, tile: number, along: Axis = 'x') {
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  const p = g.getAttribute('position');
  const n = g.getAttribute('normal');
  const uv = new Float32Array(p.count * 2);
  const get = (a: Axis, i: number) => (a === 'x' ? p.getX(i) : a === 'y' ? p.getY(i) : p.getZ(i));
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i));
    const ay = Math.abs(n.getY(i));
    const az = Math.abs(n.getZ(i));
    // the two axes of the face's plane; U on `along` when it lies in that plane
    const plane: [Axis, Axis] = ax >= ay && ax >= az ? ['z', 'y'] : ay >= az ? ['x', 'z'] : ['x', 'y'];
    let [ua, va] = plane;
    if (va === along) [ua, va] = [va, ua];
    uv[i * 2] = get(ua, i) / tile;
    uv[i * 2 + 1] = get(va, i) / tile;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** a named mesh that casts and receives shadows */
export function part(name: string, g: THREE.BufferGeometry, m: THREE.Material) {
  const mesh = new THREE.Mesh(g, m);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** an instanced, named part: one geometry, many placements */
export function instanced(name: string, g: THREE.BufferGeometry, m: THREE.Material, mats: THREE.Matrix4[]) {
  const mesh = new THREE.InstancedMesh(g, m, mats.length);
  mats.forEach((x, i) => mesh.setMatrixAt(i, x));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  return mesh;
}

export const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

/** lathe from a [radius, height] profile in metres, UVs: U round the circumference in metres, V up the profile */
export function lathe(profile: [number, number][], radial: number, tile: number) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.00001), y));
  const g = new THREE.LatheGeometry(pts, radial);
  // rescale UVs to metres / tile
  const uv = g.getAttribute('uv');
  const p = g.getAttribute('position');
  let len = 0;
  const along: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    len += pts[i].distanceTo(pts[i - 1]);
    along.push(len);
  }
  const rows = pts.length;
  for (let i = 0; i < uv.count; i++) {
    const row = i % rows;
    const r = Math.hypot(p.getX(i), p.getZ(i));
    const circ = 2 * Math.PI * Math.max(r, 0.01);
    uv.setXY(i, (uv.getX(i) * circ) / tile, along[row] / tile);
  }
  return g;
}

/** a shape from [x, y] points (metres), smoothed through a closed Catmull-Rom spline */
export function smoothShape(pts: [number, number][], samples = 120) {
  const c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal');
  const s = new THREE.Shape();
  c.getSpacedPoints(samples).forEach((p, i) => (i === 0 ? s.moveTo(p.x, p.y) : s.lineTo(p.x, p.y)));
  return s;
}

/** extrude a shape `depth` metres along +Z, edges rounded by `bevel`, centred on z = 0 */
export function slab(shape: THREE.Shape, depth: number, bevel: number, d: Detail, curveSegs = 64) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(depth - 2 * bevel, 0.0002),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: segs(d, 6, 2),
    curveSegments: segs(d, curveSegs, 12),
  });
  g.translate(0, 0, -(depth - 2 * bevel) / 2);
  return g;
}

/** merge-free group helper: names a group and adds children */
export function group(name: string, ...children: THREE.Object3D[]) {
  const g = new THREE.Group();
  g.name = name;
  if (children.length) g.add(...children);
  return g;
}
