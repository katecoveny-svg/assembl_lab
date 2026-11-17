// The 3D viewer: three.js WebGLRenderer, GLTFLoader with the Meshopt decoder, studio light on a transparent ground
// with a soft contact shadow. Loaded on demand (dynamic import) so the page's first paint carries no three.js.
// One Viewer per surface (the shelf's active card, the detail view); each holds one model at a time and disposes the
// last one's geometry, materials and textures before showing the next.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Item } from './types';

export type ViewerState = 'idle' | 'loading' | 'ready' | 'error' | 'lost';
export interface ViewerStatus {
  state: ViewerState;
  loaded?: number;
  total?: number;
  message?: string;
  itemId?: string;
}
export interface ViewerOptions {
  /** orbit, zoom and pan with pointer and keys (the detail view); otherwise a slow turn and a pointer tilt (the shelf) */
  interactive: boolean;
  autoRotate: boolean;
  label: string;
  onStatus?: (s: ViewerStatus) => void;
}

// raw GLB bytes, newest last; parsed GPU objects are never cached (each viewer owns and disposes its own)
const bytesCache = new Map<string, ArrayBuffer>();
let cachedBytes = 0;
const CACHE_LIMIT = 16e6;
const SWAY = 0.38; // radians either side, the shelf's slow turn

async function fetchBytes(url: string, expected: number, onProgress: (loaded: number, total: number) => void, signal: AbortSignal) {
  const hit = bytesCache.get(url);
  if (hit) {
    bytesCache.delete(url);
    bytesCache.set(url, hit);
    return hit;
  }
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`the server answered ${res.status}`);
  const total = Number(res.headers.get('content-length')) || expected;
  let buf: ArrayBuffer;
  if (res.body && 'getReader' in res.body) {
    const reader = res.body.getReader();
    const parts: Uint8Array[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      loaded += value.byteLength;
      onProgress(loaded, Math.max(total, loaded));
    }
    const out = new Uint8Array(loaded);
    let o = 0;
    for (const p of parts) {
      out.set(p, o);
      o += p.byteLength;
    }
    buf = out.buffer;
  } else {
    buf = await res.arrayBuffer();
  }
  bytesCache.set(url, buf);
  cachedBytes += buf.byteLength;
  for (const [k, v] of bytesCache) {
    if (cachedBytes <= CACHE_LIMIT) break;
    bytesCache.delete(k);
    cachedBytes -= v.byteLength;
  }
  return buf;
}

function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(62,46,38,0.5)');
  grd.addColorStop(0.55, 'rgba(62,46,38,0.14)');
  grd.addColorStop(1, 'rgba(62,46,38,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry?.dispose();
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      if (!mat) continue;
      for (const v of Object.values(mat)) {
        const t = v as THREE.Texture | null;
        if (t && t.isTexture) t.dispose();
      }
      mat.dispose();
    }
  });
}

export class Viewer {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  private controls: OrbitControls | null = null;
  private pivot = new THREE.Group();
  private model: THREE.Object3D | null = null;
  private key: THREE.DirectionalLight;
  private shadowPlane: THREE.Mesh;
  private contact: THREE.Mesh;
  private boundsHelper: THREE.Box3Helper | null = null;
  private envTex: THREE.Texture;
  private ro: ResizeObserver;
  private host: HTMLElement | null = null;
  private raf = 0;
  private dirty = true;
  private paused = false;
  private autoRotate: boolean;
  private tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  private home = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
  private abort: AbortController | null = null;
  private loadToken = 0;
  private last = 0;
  private t = 0;
  private opts: ViewerOptions;
  currentId: string | null = null;
  status: ViewerStatus = { state: 'idle' };

  constructor(opts: ViewerOptions) {
    this.opts = opts;
    this.autoRotate = opts.autoRotate;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'gl';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // the piece and the light never move relative to each other, so the shadow is drawn once per piece
    this.renderer.shadowMap.autoUpdate = false;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.envTex = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();
    this.scene.environment = this.envTex;
    this.scene.environmentIntensity = 0.75;
    this.scene.add(new THREE.HemisphereLight(0xfffaf4, 0xe9ddd8, 0.5));
    this.key = new THREE.DirectionalLight(0xfff6ee, 2.2);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.radius = 5;
    this.key.shadow.bias = -0.0004;
    this.scene.add(this.key, this.key.target);
    this.shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ color: 0x3e2e26, opacity: 0.16 }));
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.receiveShadow = true;
    this.contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.55 }));
    this.contact.rotation.x = -Math.PI / 2;
    this.scene.add(this.shadowPlane, this.contact, this.pivot);

    if (opts.interactive) {
      const c = new OrbitControls(this.camera, this.canvas);
      c.enableDamping = true;
      c.dampingFactor = 0.08;
      c.autoRotate = this.autoRotate;
      c.autoRotateSpeed = 0.6;
      c.maxPolarAngle = Math.PI * 0.495;
      c.addEventListener('change', () => {
        this.dirty = true;
        this.start();
      });
      c.addEventListener('start', () => this.setAutoRotate(false));
      c.addEventListener('end', () => this.kick());
      this.controls = c;
    }
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.setStatus({ state: 'lost', message: 'The 3D view stopped: the browser took back its graphics context.' });
    });
    this.ro = new ResizeObserver(() => this.resize());
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()));
  }

  private setStatus(s: ViewerStatus) {
    this.status = { ...s, itemId: this.currentId ?? undefined };
    this.opts.onStatus?.(this.status);
  }

  /** move the canvas into a new host element */
  attach(host: HTMLElement) {
    if (this.host === host && this.canvas.parentElement === host) return;
    if (this.host) this.ro.unobserve(this.host);
    this.host = host;
    host.append(this.canvas);
    this.ro.observe(host);
    this.resize();
  }

  private resize() {
    if (!this.host) return;
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
    this.start();
  }

  async load(item: Item) {
    const file = item.files.find((f) => f.role === 'web') ?? item.files[0];
    if (!file) throw new Error('no file');
    if (this.currentId === item.id && this.model) {
      this.setStatus({ state: 'ready' });
      return;
    }
    const token = ++this.loadToken;
    this.abort?.abort();
    this.abort = new AbortController();
    this.currentId = item.id;
    this.clearModel();
    this.setStatus({ state: 'loading', loaded: 0, total: file.bytes });
    try {
      const buf = await fetchBytes(file.url, file.bytes, (loaded, total) => token === this.loadToken && this.setStatus({ state: 'loading', loaded, total }), this.abort.signal);
      if (token !== this.loadToken) return;
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      const gltf = await loader.parseAsync(buf.slice(0), '');
      if (token !== this.loadToken) {
        disposeObject(gltf.scene);
        return;
      }
      this.show(gltf.scene, item);
      this.setStatus({ state: 'ready' });
    } catch (err) {
      if (token !== this.loadToken || (err as Error).name === 'AbortError') return;
      this.setStatus({ state: 'error', message: (err as Error).message || String(err) });
    }
  }

  private show(root: THREE.Object3D, _item: Item) {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root, true);
    const size = box.getSize(new THREE.Vector3());
    const ctr = box.getCenter(new THREE.Vector3());
    root.position.set(-ctr.x, -box.min.y, -ctr.z);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = m.receiveShadow = true;
    });
    this.pivot.rotation.set(0, 0, 0);
    this.t = 0;
    this.pivot.add(root);
    this.renderer.shadowMap.needsUpdate = true;
    this.model = root;
    const R = Math.max(size.x, size.y, size.z, 1e-3);
    const sphere = Math.max(1e-3, 0.5 * size.length());
    // ground and light scaled to the piece
    this.shadowPlane.scale.set(8 * R, 8 * R, 1);
    this.contact.scale.set(size.x * 1.25 + 0.02 * R, size.z * 1.25 + 0.02 * R, 1);
    this.contact.position.y = 0.0005 * R;
    this.key.position.set(-0.8 * R, 2.2 * R, 1.3 * R);
    const sc = this.key.shadow.camera as THREE.OrthographicCamera;
    sc.left = sc.bottom = -1.2 * R;
    sc.right = sc.top = 1.2 * R;
    sc.near = 0.01 * R;
    sc.far = 6 * R;
    sc.updateProjectionMatrix();
    this.key.shadow.normalBias = 0.01 * R;
    // camera: three-quarter view from the front right, a little above, moved out until the piece's corners fit
    const target = new THREE.Vector3(0, size.y / 2, 0);
    const az = THREE.MathUtils.degToRad(35);
    const el = THREE.MathUtils.degToRad(18);
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const corners: THREE.Vector3[] = [];
    const yaws = this.opts.interactive ? [0] : [-SWAY, 0, SWAY];
    for (const yaw of yaws) {
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      for (const x of [-size.x / 2, size.x / 2]) for (const y of [0, size.y]) for (const z of [-size.z / 2, size.z / 2]) corners.push(new THREE.Vector3(x, y, z).applyQuaternion(q));
    }
    const dist = this.fit(target, dir, corners, this.opts.interactive ? 0.74 : 0.7, sphere);
    this.camera.near = Math.max(1e-4, dist / 200);
    this.camera.far = dist * 40;
    this.camera.position.copy(target).addScaledVector(dir, dist);
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();
    this.home.pos.copy(this.camera.position);
    this.home.target.copy(target);
    if (this.controls) {
      this.controls.target.copy(target);
      this.controls.minDistance = sphere * 0.35;
      this.controls.maxDistance = dist * 4;
      this.controls.update();
    }
    if (this.boundsWanted) this.showBounds(true);
    this.dirty = true;
    this.start();
  }

  /** distance along dir at which every corner sits inside `fill` of the frame; nudges target to centre them */
  private fit(target: THREE.Vector3, dir: THREE.Vector3, corners: THREE.Vector3[], fill: number, sphere: number) {
    const cam = this.camera;
    cam.near = sphere / 100;
    cam.far = sphere * 100;
    cam.updateProjectionMatrix();
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const right = new THREE.Vector3(), up = new THREE.Vector3(), p = new THREE.Vector3();
    let d = (3 * sphere) / Math.max(0.3, Math.min(1, cam.aspect));
    for (let i = 0; i < 30; i++) {
      cam.position.copy(target).addScaledVector(dir, d);
      cam.lookAt(target);
      cam.updateMatrixWorld(true);
      let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      for (const c of corners) {
        p.copy(c).project(cam);
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
      const h = d * tanHalf;
      right.setFromMatrixColumn(cam.matrixWorld, 0);
      up.setFromMatrixColumn(cam.matrixWorld, 1);
      target.addScaledVector(right, ((minX + maxX) / 2) * h * cam.aspect * 0.8).addScaledVector(up, ((minY + maxY) / 2) * h * 0.8);
      const ext = Math.max((maxX - minX) / 2, (maxY - minY) / 2);
      d *= Math.pow(Math.max(ext, 1e-4) / fill, 0.8);
    }
    return d;
  }

  private clearModel() {
    if (this.boundsHelper) {
      this.scene.remove(this.boundsHelper);
      this.boundsHelper.geometry.dispose();
      (this.boundsHelper.material as THREE.Material).dispose();
      this.boundsHelper = null;
    }
    if (this.model) {
      this.pivot.remove(this.model);
      disposeObject(this.model);
      this.model = null;
    }
    this.dirty = true;
  }

  private boundsWanted = false;
  showBounds(on: boolean) {
    if (this.boundsHelper) {
      this.scene.remove(this.boundsHelper);
      this.boundsHelper.geometry.dispose();
      (this.boundsHelper.material as THREE.Material).dispose();
      this.boundsHelper = null;
    }
    this.boundsWanted = on;
    if (on && this.model) {
      this.pivot.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(this.model, true);
      this.boundsHelper = new THREE.Box3Helper(box, 0x33212f);
      (this.boundsHelper.material as THREE.LineBasicMaterial).transparent = true;
      (this.boundsHelper.material as THREE.LineBasicMaterial).opacity = 0.55;
      this.scene.add(this.boundsHelper);
    }
    this.dirty = true;
    this.start();
  }

  get boundsOn() {
    return this.boundsWanted;
  }

  reset() {
    this.pivot.rotation.set(0, 0, 0);
    this.camera.position.copy(this.home.pos);
    if (this.controls) {
      this.controls.target.copy(this.home.target);
      this.controls.update();
    } else this.camera.lookAt(this.home.target);
    this.dirty = true;
    this.start();
  }

  /** dolly towards (f < 1) or away from (f > 1) the target */
  zoom(f: number) {
    const t = this.controls ? this.controls.target : this.home.target;
    const off = this.camera.position.clone().sub(t);
    let len = off.length() * f;
    if (this.controls) len = THREE.MathUtils.clamp(len, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(t).addScaledVector(off.normalize(), len);
    this.controls?.update();
    this.dirty = true;
    this.start();
  }

  /** turn the view about the target by degrees (keyboard orbit) */
  orbitBy(dAzDeg: number, dElDeg: number) {
    const t = this.controls ? this.controls.target : this.home.target;
    const off = this.camera.position.clone().sub(t);
    const s = new THREE.Spherical().setFromVector3(off);
    s.theta += THREE.MathUtils.degToRad(dAzDeg);
    s.phi = THREE.MathUtils.clamp(s.phi - THREE.MathUtils.degToRad(dElDeg), 0.05, Math.PI * 0.495);
    off.setFromSpherical(s);
    this.camera.position.copy(t).add(off);
    this.camera.lookAt(t);
    this.controls?.update();
    this.dirty = true;
    this.start();
  }

  setAutoRotate(on: boolean) {
    this.autoRotate = on;
    if (this.controls) this.controls.autoRotate = on;
    this.dirty = true;
    this.start();
  }

  get autoRotating() {
    return this.autoRotate;
  }

  /** pointer tilt for the shelf: x and y in -1..1 */
  setTilt(x: number, y: number) {
    this.tilt.tx = x;
    this.tilt.ty = y;
    this.start();
  }

  pause() {
    this.paused = true;
    this.stop();
  }

  resume() {
    this.paused = false;
    this.dirty = true;
    this.start();
  }

  private start() {
    if (this.raf || this.paused || document.hidden || !this.host) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private frame = () => {
    this.raf = 0;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    let moving = false;
    if (this.controls) {
      if (this.controls.update(dt)) this.dirty = true;
      moving = this.autoRotate || this.dirty;
    } else if (this.model) {
      // a slow sway of the view either side of the three-quarter angle (the piece stays framed and lit the same),
      // plus a small tilt towards the pointer
      if (this.autoRotate) {
        this.t += dt;
        moving = true;
      }
      const k = 1 - Math.pow(0.002, dt);
      const dx = this.tilt.tx - this.tilt.x;
      const dy = this.tilt.ty - this.tilt.y;
      const tilting = Math.abs(dx) + Math.abs(dy) > 1e-4;
      if (tilting) {
        this.tilt.x += dx * k;
        this.tilt.y += dy * k;
        moving = true;
      }
      if (moving) {
        const off = this.home.pos.clone().sub(this.home.target);
        const s = new THREE.Spherical().setFromVector3(off);
        s.theta += (this.autoRotate ? Math.sin(this.t * 0.42) * SWAY : 0) + this.tilt.x * 0.16;
        s.phi = THREE.MathUtils.clamp(s.phi + this.tilt.y * 0.1, 0.1, Math.PI * 0.49);
        off.setFromSpherical(s);
        this.camera.position.copy(this.home.target).add(off);
        this.camera.lookAt(this.home.target);
        this.dirty = true;
      }
    }
    if (this.dirty) {
      this.renderer.render(this.scene, this.camera);
      this.dirty = false;
    }
    // keep going while something moves (one callback per frame: OrbitControls' change event may already have asked
    // for the next one); an idle view draws nothing until the next change
    if (moving && !this.raf) this.raf = requestAnimationFrame(this.frame);
  };

  /** let the next frames run (OrbitControls damping needs a few after the pointer lets go) */
  kick() {
    this.dirty = true;
    this.start();
  }

  clear() {
    this.abort?.abort();
    this.loadToken++;
    this.currentId = null;
    this.clearModel();
    this.renderer.clear();
    this.setStatus({ state: 'idle' });
  }

  dispose() {
    this.clear();
    this.stop();
    this.ro.disconnect();
    this.controls?.dispose();
    this.envTex.dispose();
    this.shadowPlane.geometry.dispose();
    (this.shadowPlane.material as THREE.Material).dispose();
    this.contact.geometry.dispose();
    const cm = this.contact.material as THREE.MeshBasicMaterial;
    cm.map?.dispose();
    cm.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}
