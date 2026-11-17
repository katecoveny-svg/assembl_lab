// Thumbnail renderer for the design inventory: one GLB at a time, studio light on an ivory ground.
// Bundled by tools/render/build.mjs and driven by scripts/render_previews.py in headless Chrome.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const GROUND = new THREE.Color('#F3EEE9');
const size = 1080;
const canvas = document.createElement('canvas');
canvas.width = canvas.height = size;
document.body.append(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(size, size, false);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const pmrem = new THREE.PMREMGenerator(renderer);
const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(62,46,38,0.5)');
  grd.addColorStop(0.5, 'rgba(62,46,38,0.16)');
  grd.addColorStop(1, 'rgba(62,46,38,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const blob = blobTexture();

(window as any).renderOne = async (url: string, opts: { az?: number; elev?: number; fill?: number } = {}) => {
  const gltf = await loader.loadAsync(url);
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root, true);
  const sz = box.getSize(new THREE.Vector3());
  const ctr = box.getCenter(new THREE.Vector3());
  root.position.set(-ctr.x, -box.min.y, -ctr.z);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
  });
  const scene = new THREE.Scene();
  scene.background = GROUND;
  scene.environment = env;
  scene.environmentIntensity = 0.75;
  scene.add(root);
  const R = Math.max(sz.x, sz.y, sz.z);
  const hemi = new THREE.HemisphereLight(0xfffaf4, 0xe9ddd8, 0.5);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff6ee, 2.2);
  key.position.set(-0.8 * R, 2.2 * R, 1.3 * R);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera as THREE.OrthographicCamera;
  sc.left = sc.bottom = -1.2 * R; sc.right = sc.top = 1.2 * R; sc.near = 0.01 * R; sc.far = 6 * R;
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.01 * R;
  scene.add(key);
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(8 * R, 8 * R), new THREE.ShadowMaterial({ color: 0x3e2e26, opacity: 0.17 }));
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(sz.x * 1.25 + 0.02 * R, sz.z * 1.25 + 0.02 * R), new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false, opacity: 0.55 }));
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.0005 * R;
  scene.add(contact);

  const az = THREE.MathUtils.degToRad(opts.az ?? 35);
  const el = THREE.MathUtils.degToRad(opts.elev ?? 18);
  const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const cam = new THREE.PerspectiveCamera(28, 1, 0.001 * R, 100 * R);
  const target = new THREE.Vector3(0, sz.y / 2, 0);
  // fit: move out until every bounding-box corner sits inside `fill` of the frame
  const fill = opts.fill ?? 0.84;
  const corners: THREE.Vector3[] = [];
  for (const x of [-sz.x / 2, sz.x / 2]) for (const y of [0, sz.y]) for (const z of [-sz.z / 2, sz.z / 2]) corners.push(new THREE.Vector3(x, y, z));
  let d = 3 * R;
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const right = new THREE.Vector3(), up = new THREE.Vector3();
  for (let i = 0; i < 40; i++) {
    cam.position.copy(target).addScaledVector(dir, d);
    cam.lookAt(target);
    cam.updateMatrixWorld(true);
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const c of corners) {
      const p = c.clone().project(cam);
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const h = d * tanHalf;
    right.setFromMatrixColumn(cam.matrixWorld, 0);
    up.setFromMatrixColumn(cam.matrixWorld, 1);
    target.addScaledVector(right, ((minX + maxX) / 2) * h * 0.8).addScaledVector(up, ((minY + maxY) / 2) * h * 0.8);
    const ext = Math.max((maxX - minX) / 2, (maxY - minY) / 2);
    d *= Math.pow(ext / fill, 0.8);
  }
  cam.position.copy(target).addScaledVector(dir, d);
  cam.lookAt(target);
  renderer.render(scene, cam);
  const url2 = canvas.toDataURL('image/png');
  // dispose
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry.dispose();
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
        for (const v of Object.values(mat)) if ((v as THREE.Texture)?.isTexture) (v as THREE.Texture).dispose();
        mat.dispose();
      }
    }
  });
  shadowPlane.geometry.dispose(); contact.geometry.dispose();
  return { png: url2, bounds: [sz.x, sz.y, sz.z], min: [box.min.x, box.min.y, box.min.z] };
};
(window as any).ready = true;
