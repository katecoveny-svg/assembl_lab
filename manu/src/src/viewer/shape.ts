import * as THREE from 'three';
import { createBird } from '../engine/bird';
import { NZ_SPECIES } from '../engine/nz/species';
import { MEASURED } from '../engine/nz/measured';

// Shape check harness (not shipped): one bird, no perch, orthographic, at rest, head straight.
// Renders silhouettes from the canvas alpha (feather cards keep their alpha cut-outs), in
// passes: everything; without the legs; the bill alone. scripts/shape_check.py reads them
// and overlays them on the reference outlines. Also reports the model's own measures.
//   ?bird=tui&view=side|front|top
const q = new URLSearchParams(location.search);
const key = q.get('bird') ?? 'tui';
const view = q.get('view') ?? 'side';
const canvas = document.querySelector<HTMLCanvasElement>('canvas')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(1);
const W = canvas.clientWidth;
const H = canvas.clientHeight;
renderer.setSize(W, H, false);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));
const bird = createBird({ species: NZ_SPECIES[key] });
bird.mind.quiet = true;
bird.mind.pinGaze = [0, 0, 0];
scene.add(bird.root);
for (let i = 0; i < 30; i++) bird.update(1 / 30);

const rig = bird.rig;
const sp = bird.species;
const v = (n: string) => rig.rest[n].worldPos.clone();
// visible extent: bounding box of the rendered meshes (bind pose is close enough for framing)
const box = new THREE.Box3();
const tmp = new THREE.Vector3();
bird.root.updateMatrixWorld(true);
bird.root.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isSkinnedMesh || !m.visible) return;
  const pos = m.geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i += 7) {
    m.getVertexPosition(i, tmp);
    tmp.applyMatrix4(m.matrixWorld);
    box.expandByPoint(tmp);
  }
});
const c = box.getCenter(new THREE.Vector3());
const size = box.getSize(new THREE.Vector3());
const half = Math.max(size.y, size.z, size.x) * 0.62;
const asp = W / H;
const cam = new THREE.OrthographicCamera(-half * asp, half * asp, half, -half, 0.01, 50);
if (view === 'side') cam.position.set(c.x - 10, c.y, c.z);
else if (view === 'front') cam.position.set(c.x, c.y, c.z + 10);
else cam.position.set(c.x, c.y + 10, c.z);
cam.up.set(0, 1, 0);
if (view === 'top') cam.up.set(0, 0, 1);
cam.lookAt(c);
cam.updateMatrixWorld();

function snap() {
  renderer.render(scene, cam);
  return canvas.toDataURL('image/png');
}
const meshes: Record<string, THREE.Object3D> = {};
bird.root.traverse((o) => o.name.startsWith('bird.') && (meshes[o.name] = o));
const all = snap();
meshes['bird.bare'].visible = false;
const noLegs = snap();
meshes['bird.bill'].visible = false;
meshes['bird.tongue'].visible = false;
const noBill = snap();
for (const [n, o] of Object.entries(meshes)) o.visible = n === 'bird.bill';
const bill = snap();
for (const o of Object.values(meshes)) o.visible = true;
renderer.render(scene, cam);

// the model's own measures, model units
const tailLen = sp.tail.length[0];
const wrist = v('hand.L');
let chord = 0;
for (const b of rig.wings.L.primaries) chord = Math.max(chord, b.getWorldPosition(new THREE.Vector3()).distanceTo(wrist));
const proj = (p: THREE.Vector3) => {
  const s = p.clone().project(cam);
  return [((s.x + 1) / 2) * W, ((1 - s.y) / 2) * H];
};
const billTip = bird.billTip(new THREE.Vector3());
Object.assign(window, {
  __shape: {
    ready: true,
    key,
    view,
    pxPerUnit: H / (2 * half),
    images: { all, noLegs, noBill, bill },
    measures: {
      billParam: sp.bill.length,
      tail: tailLen,
      tarsus: rig.tarsusLength,
      headEye: v('eye.L').distanceTo(v('bill')),
      boxSize: size.toArray(),
      verts: Object.fromEntries(Object.entries(bird.feathers).map(([n, m]) => [n, m.geometry.getAttribute('position').count])),
      measured: MEASURED[key] ?? null,
      eyeRadius: sp.eye.radius,
      chordParam: sp.wing.chord ?? null,
    },
    px: { billTip: proj(billTip), eye: proj(v('eye.L')), tailRoot: proj(v('tail')), wrist: proj(wrist), footL: proj(v('foot.L')), hip: proj(v('tarsus.L')) },
  },
});
