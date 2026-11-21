import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// A generic compact car, modelled in code from a side profile: body, glasshouse, wheels, lamps. It is there for scale
// in a car bay and is not part of any design. No make or model is intended; real size (4.4 m long, 1.82 m wide).
export function buildCar(colour = 0x8d9296) {
  const g = new THREE.Group();
  g.name = 'car_for_scale';
  const L = 4.4, W = 1.82;
  const paint = new THREE.MeshPhysicalMaterial({ color: colour, metalness: 0.7, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.08 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x151c20, metalness: 0.3, roughness: 0.06 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.6, metalness: 0.2 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.95 });
  const alloy = new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: 0.3, metalness: 0.9 });
  const lamp = new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.2, emissive: 0x222018 });
  const tail = new THREE.MeshStandardMaterial({ color: 0x7a1414, roughness: 0.3 });
  const shape = (pts: [number, number][], smooth = true) => {
    const s = new THREE.Shape();
    if (!smooth) { s.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((p) => s.lineTo(p[0], p[1])); s.closePath(); return s; }
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], 0)), true, 'centripetal').getPoints(96);
    s.moveTo(c[0].x, c[0].y); c.slice(1).forEach((p) => s.lineTo(p.x, p.y)); s.closePath(); return s;
  };
  // body: the lower shell with wheel arches cut in
  const body = shape([[-2.18, 0.34], [-2.2, 0.6], [-2.14, 0.8], [-1.9, 0.9], [-1.3, 0.96], [-0.2, 1.0], [1.2, 0.98], [1.9, 0.92], [2.16, 0.78], [2.2, 0.55], [2.17, 0.34], [1.0, 0.24], [-1.0, 0.24]]);
  for (const cx of [-1.4, 1.36]) { const h = new THREE.Path(); h.absarc(cx, 0.3, 0.4, 0, Math.PI * 2, false); body.holes.push(h); }
  const bg = new THREE.ExtrudeGeometry(body, { depth: W - 0.2, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.09, bevelSegments: 6, curveSegments: 24 });
  bg.translate(0, 0, -(W - 0.2) / 2);
  const shell = new THREE.Mesh(bg, paint); shell.castShadow = shell.receiveShadow = true; g.add(shell);
  // glasshouse: narrower than the body, tumbled in at the top
  const cabin = shape([[-1.22, 0.93], [-0.95, 1.22], [-0.6, 1.43], [0.2, 1.5], [0.9, 1.46], [1.45, 1.22], [1.72, 0.95]]);
  const cg = new THREE.ExtrudeGeometry(cabin, { depth: W - 0.5, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 5, curveSegments: 24 });
  cg.translate(0, 0, -(W - 0.5) / 2);
  const roofM = new THREE.Mesh(cg, glass); roofM.castShadow = true; g.add(roofM);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, W - 0.52), paint); cap.position.set(0.25, 1.5, 0); g.add(cap);
  // pillars
  const pil: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) for (const [x, lean] of [[-0.92, 0.75], [0.3, 0], [1.42, -0.8]] as [number, number][]) { const b = new THREE.BoxGeometry(0.07, 0.56, 0.05); b.rotateZ(lean * 0.6); b.translate(x, 1.21, side * (W / 2 - 0.2)); pil.push(b); }
  g.add(new THREE.Mesh(mergeGeometries(pil)!, paint));
  // wheels
  const tg: THREE.BufferGeometry[] = [], ag: THREE.BufferGeometry[] = [];
  for (const cx of [-1.4, 1.36]) for (const side of [-1, 1]) {
    const t = new THREE.TorusGeometry(0.255, 0.105, 14, 36); t.translate(cx, 0.36, side * (W / 2 - 0.13)); tg.push(t);
    const hub = new THREE.CylinderGeometry(0.2, 0.2, 0.12, 28); hub.rotateX(Math.PI / 2); hub.translate(cx, 0.36, side * (W / 2 - 0.1)); ag.push(hub);
    for (let k = 0; k < 5; k++) { const sp = new THREE.BoxGeometry(0.05, 0.36, 0.03); sp.rotateZ((k * Math.PI) / 5); sp.translate(cx, 0.36, side * (W / 2 - 0.035)); ag.push(sp); }
  }
  const wheels = new THREE.Mesh(mergeGeometries(tg)!, tyre); wheels.castShadow = true; g.add(wheels, new THREE.Mesh(mergeGeometries(ag)!, alloy));
  // lamps, grille, mirrors
  const lg: THREE.BufferGeometry[] = [], rg: THREE.BufferGeometry[] = [], dg: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    lg.push(new THREE.BoxGeometry(0.06, 0.1, 0.42).translate(-2.22, 0.72, side * 0.56));
    rg.push(new THREE.BoxGeometry(0.06, 0.12, 0.46).translate(2.22, 0.78, side * 0.55));
    dg.push(new THREE.BoxGeometry(0.16, 0.1, 0.07).translate(-0.86, 1.0, side * (W / 2 + 0.03)));
  }
  dg.push(new THREE.BoxGeometry(0.05, 0.16, 1.0).translate(-2.25, 0.5, 0), new THREE.BoxGeometry(0.05, 0.1, 1.3).translate(2.25, 0.45, 0));
  g.add(new THREE.Mesh(mergeGeometries(lg)!, lamp), new THREE.Mesh(mergeGeometries(rg)!, tail), new THREE.Mesh(mergeGeometries(dg)!, dark));
  g.userData = { kind: 'car', name: 'Car, for scale', source: 'assumed', note: `a generic ${L} m car to read the car bay against; not part of the design` };
  g.traverse((o) => { o.userData.kind ??= 'car'; });
  return g;
}
