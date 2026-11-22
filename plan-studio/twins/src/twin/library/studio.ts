import * as THREE from 'three';
import { sheet } from './geo';
import { plasterMat } from './mats';

// The library's photo studio: a seamless plaster sweep, a large soft key light, a sky of fill light, AgX tone
// mapping and a light grade. A picture is the average of many slightly different frames (room-at-dawn's method for
// its hero stills): each frame moves the pixel grid by a fraction of a pixel (clean edges), the lens within a small
// aperture (depth of field), the key light within its softbox (soft shadows) and the fill to another part of the
// sky, each with its own shadow, so that together they give soft contact shadows under and between everything.
// Runs on the classic WebGL renderer so each frame can be read back exactly; headless it is software rendering.

export interface ShotOpts {
  size?: number;
  frames?: number;
  /** camera azimuth (degrees, 0 = straight on to the front, + = from the right) and elevation */
  az?: number;
  el?: number;
  fov?: number;
  /** how much of the frame the piece fills (1 = its bounding sphere touches the frame) */
  zoom?: number;
  /** lens aperture as a fraction of the focus distance (0 = pinhole) */
  aperture?: number;
  /** look at this fraction of the piece's height (0.5 = centre) */
  aim?: number;
  /** exposure (AgX) */
  exposure?: number;
  /** a close-up: camera distance in metres from the aim point, ignoring zoom */
  dist?: number;
  /** aim at this point instead (metres, in the piece's frame) */
  at?: [number, number, number];
  /** light levels, for checking the set: key, fill, rim, hemi, env */
  lights?: Partial<Record<'key' | 'fill' | 'rim' | 'hemi' | 'env', number>>;
}

const halton = (i: number, b: number) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
const toLin = new Float32Array(256).map((_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

/** what shiny things reflect: a dim warm room with one big softbox up to the left and a smaller one to the right */
function studioEnv() {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ color: 0x8f8880, side: THREE.BackSide })));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9.8, 32), new THREE.MeshBasicMaterial({ color: 0x5f5a55 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.5; env.add(floor);
  const panel = (w: number, h: number, k: number, at: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k * 0.97, k * 0.93), side: THREE.DoubleSide }));
    m.position.set(...at); m.lookAt(0, 0, 0); env.add(m);
  };
  panel(5, 3.5, 7, [-6, 6, 4]);
  panel(2.5, 2.5, 3, [7, 3, 3]);
  return env;
}

export class Studio {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(30, 1, 0.01, 200);
  key = new THREE.DirectionalLight(0xfff1e2, 3.8);
  fill = new THREE.DirectionalLight(0xeef1ff, 0.9);
  rim = new THREE.DirectionalLight(0xffffff, 0.45);
  hemi = new THREE.HemisphereLight(0xf4f1ff, 0xd8cfc4, 0.1);
  cyc: THREE.Mesh | null = null;
  holder = new THREE.Group();
  size: number;

  constructor(canvas: HTMLCanvasElement, size = 800) {
    this.size = size;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(size, size, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(studioEnv(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    this.scene.background = new THREE.Color(0xe6e0d9);
    for (const L of [this.key, this.fill]) {
      L.castShadow = true;
      L.shadow.mapSize.set(2048, 2048);
      L.shadow.bias = -0.0004;
      this.scene.add(L, L.target);
    }
    this.fill.shadow.mapSize.set(1024, 1024);
    this.scene.add(this.rim, this.rim.target, this.hemi, this.holder);
  }

  /** the plaster sweep, sized to the piece: floor running back and curving up into a wall */
  private sweep(R: number) {
    if (this.cyc) { this.scene.remove(this.cyc); this.cyc.geometry.dispose(); }
    const W = Math.max(6, R * 14), front = Math.max(3, R * 8), back = Math.max(1.2, R * 2.2), rc = Math.max(0.8, R * 1.6), up = Math.max(3, R * 8);
    const arc = (Math.PI / 2) * rc, L = front + back + arc + up;
    const g = sheet(W, L, Math.max(0.05, R * 0.08), (s, t) => {
      const x = s - W / 2;
      if (t < front + back) return [x, 0, front - t];
      if (t < front + back + arc) { const a = (t - front - back) / rc; return [x, rc - Math.cos(a) * rc, -back - Math.sin(a) * rc]; }
      return [x, rc + (t - front - back - arc), -back - rc];
    });
    // sheet() winds for +y up when t runs towards -z: check and turn it over if not
    const n = g.getAttribute('normal');
    if (n.getY(0) < 0) { const I = g.getIndex()!; const a = I.array as Uint32Array; for (let i = 0; i < a.length; i += 3) { const s2 = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = s2; } I.needsUpdate = true; g.computeVertexNormals(); }
    this.cyc = new THREE.Mesh(g, plasterMat(0xe9e3dc, 900) as unknown as THREE.Material);
    this.cyc.receiveShadow = true;
    this.scene.add(this.cyc);
  }

  /** render obj as a hero picture; returns PNG data (as a data URL) */
  async shoot(obj: THREE.Object3D, o: ShotOpts = {}) {
    const t0 = performance.now();
    const S = o.size ?? this.size, N = o.frames ?? 40;
    if (S !== this.size) { this.size = S; this.renderer.setSize(S, S, false); }
    this.renderer.toneMappingExposure = o.exposure ?? 1.0;
    const Lv = { key: 3.6, fill: 0.85, rim: 0.3, hemi: 0.03, env: 0.12, ...(o.lights ?? {}) };
    this.key.intensity = Lv.key; this.fill.intensity = Lv.fill; this.rim.intensity = Lv.rim; this.hemi.intensity = Lv.hemi; this.scene.environmentIntensity = Lv.env;
    this.holder.clear();
    this.holder.add(obj);
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj), sph = box.getBoundingSphere(new THREE.Sphere()), R = Math.max(0.05, sph.radius);
    this.sweep(R);
    const aimY = box.min.y + (box.max.y - box.min.y) * (o.aim ?? 0.5);
    const target = o.at ? new THREE.Vector3(...o.at) : new THREE.Vector3(sph.center.x, aimY, sph.center.z);
    const fov = o.fov ?? 30, az = THREE.MathUtils.degToRad(o.az ?? 28), el = THREE.MathUtils.degToRad(o.el ?? 16);
    const dist = o.dist ?? (R / Math.sin(THREE.MathUtils.degToRad(fov / 2))) / (o.zoom ?? 1.0);
    const fwd = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const eye = target.clone().addScaledVector(fwd, dist);
    this.cam.fov = fov; this.cam.near = Math.max(0.005, dist - R * 3); this.cam.far = dist + R * 30; this.cam.aspect = 1; this.cam.updateProjectionMatrix();
    // lights, scaled to the piece
    const keyDir = new THREE.Vector3(Math.sin(az - 1.25), 0.95, Math.cos(az - 1.25)).normalize();
    const shadowBox = (L: THREE.DirectionalLight, ext: number) => {
      const c = L.shadow.camera as THREE.OrthographicCamera;
      c.left = -ext; c.right = ext; c.top = ext; c.bottom = -ext; c.near = 0.01; c.far = R * 12; c.updateProjectionMatrix();
      L.shadow.normalBias = 0.0006 * Math.max(1, R / 0.5);
    };
    shadowBox(this.key, R * 2.0); shadowBox(this.fill, R * 2.2);
    this.rim.position.copy(target).add(new THREE.Vector3(-Math.sin(az) * 3, 2.2, -Math.cos(az) * 3).multiplyScalar(R)); this.rim.target.position.copy(target);
    const W = S, H = S, acc = new Float32Array(W * H * 3), px = new Uint8Array(W * H * 4);
    const gl = this.renderer.getContext();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, fwd).normalize();
    const ap = (o.aperture ?? 0.012) * dist;
    for (let k = 0; k < N; k++) {
      const i = k + 1;
      // the lens: a point on the aperture disc, always looking at the focus point
      const lr = Math.sqrt(halton(i, 5)) * ap, la = halton(i, 7) * Math.PI * 2;
      this.cam.position.copy(eye).addScaledVector(right, Math.cos(la) * lr).addScaledVector(up, Math.sin(la) * lr);
      this.cam.up.set(0, 1, 0); this.cam.lookAt(target);
      this.cam.setViewOffset(W, H, halton(i, 2) - 0.5, halton(i, 3) - 0.5, W, H);
      // the key: a point within its softbox
      const kr = Math.sqrt(halton(i, 11)) * 0.32, ka = halton(i, 13) * Math.PI * 2;
      const kd = keyDir.clone().addScaledVector(right, Math.cos(ka) * kr).addScaledVector(up, Math.sin(ka) * kr).normalize();
      this.key.position.copy(target).addScaledVector(kd, R * 5); this.key.target.position.copy(target);
      // the fill: a direction from the sky, cosine weighted
      const fu = halton(i, 17), fa = halton(i, 19) * Math.PI * 2, fr = Math.sqrt(fu);
      const fd = new THREE.Vector3(Math.cos(fa) * fr, Math.sqrt(1 - fu), Math.sin(fa) * fr);
      this.fill.position.copy(target).addScaledVector(fd, R * 5); this.fill.target.position.copy(target);
      this.key.updateMatrixWorld(); this.fill.updateMatrixWorld(); this.key.target.updateMatrixWorld(); this.fill.target.updateMatrixWorld();
      // (three keeps a light's shadow map unless told the light moved)
      this.key.shadow.needsUpdate = true; this.fill.shadow.needsUpdate = true; this.renderer.shadowMap.needsUpdate = true;
      this.renderer.render(this.scene, this.cam);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
      for (let p = 0, q = 0; p < px.length; p += 4, q += 3) { acc[q] += toLin[px[p]]; acc[q + 1] += toLin[px[p + 1]]; acc[q + 2] += toLin[px[p + 2]]; }
      if (k % 8 === 7) await new Promise((r) => setTimeout(r, 0));
    }
    this.cam.clearViewOffset();
    // the grade: a touch of warmth in the shadows, slightly less saturation, a soft vignette
    const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
    const ctx = c2.getContext('2d')!, img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const q = ((H - 1 - y) * W + x) * 3, p = (y * W + x) * 4;
      let r = acc[q] / N, g = acc[q + 1] / N, b = acc[q + 2] / N;
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b, sh = 1 - Math.min(1, l * 3);
      r = l + (r - l) * 0.94; g = l + (g - l) * 0.94; b = l + (b - l) * 0.94;
      r *= 1 + 0.03 * sh; b *= 1 - 0.035 * sh;
      const dx = x / W - 0.5, dy = y / H - 0.5, v = 1 - 0.16 * Math.pow(Math.min(1, (dx * dx + dy * dy) * 2.2), 1.6);
      const dither = ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000) / 1000 - 0.5;
      const sc = (c: number) => { const t = toSrgb(Math.max(0, c)); return Math.min(1, t * 0.86 + 0.14 * t * t * (3 - 2 * t)); };
      img.data[p] = Math.max(0, Math.min(255, sc(r * v) * 255 + dither));
      img.data[p + 1] = Math.max(0, Math.min(255, sc(g * v) * 255 + dither));
      img.data[p + 2] = Math.max(0, Math.min(255, sc(b * v) * 255 + dither));
      img.data[p + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    this.holder.remove(obj);
    return { png: c2.toDataURL('image/png'), ms: Math.round(performance.now() - t0), size: box.getSize(new THREE.Vector3()).toArray() };
  }
}
