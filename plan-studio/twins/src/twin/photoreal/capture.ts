// Offline pictures from the live renderer: each frame is the average of jittered sub-frames (sub-pixel offsets for
// clean edges, a thin-lens aperture for depth of field, times across a 180° shutter for motion blur), as room-at-dawn's
// film renderer does (MIT, Leon Lin, src/render/film.js). The average is taken on the CPU from 8-bit sub-frames, then
// the caption is drawn and the frame is encoded as PNG.
import * as THREE from 'three/webgpu';
import type { App } from '../app';
import { CAPTION, look, type Photoreal } from './photoreal.ts';
import type { CamState } from './path.ts';

const halton = (i: number, b: number) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };

export interface ShotOpts {
  w: number;
  h: number;
  /** sub-frames averaged */
  samples: number;
  caption?: boolean;
  /** use the photoreal pipeline (else the page's own) */
  photoreal?: Photoreal | null;
}

export class Capture {
  app: App;
  out: HTMLCanvasElement;
  private grab: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private acc: Float32Array = new Float32Array(0);
  timing = { render: 0, read: 0, encode: 0, frames: 0 };
  constructor(app: App) {
    this.app = app;
    this.out = document.createElement('canvas');
    this.out.getContext('2d', { willReadFrequently: true }); // a CPU canvas: frames are read back as raw pixels
    this.grab = document.createElement('canvas');
    this.g = this.grab.getContext('2d', { willReadFrequently: true })!;
  }

  private size(w: number, h: number) {
    const a = this.app;
    a.renderer.setPixelRatio(1);
    a.renderer.setSize(w, h, false);
    a.camera.aspect = w / h;
    a.camera.updateProjectionMatrix();
    if (this.grab.width !== w || this.grab.height !== h) { this.grab.width = w; this.grab.height = h; this.out.width = w; this.out.height = h; }
    if (this.acc.length !== w * h * 3) this.acc = new Float32Array(w * h * 3);
  }

  /** put the camera at a film state, with a lens offset (metres, in the camera plane) aimed back at the focus point */
  place(st: CamState, lens: [number, number] = [0, 0]) {
    const cam = this.app.camera;
    const eye = new THREE.Vector3(...st.eye), look = new THREE.Vector3(...st.look);
    cam.fov = st.fov; cam.up.set(0, 1, 0);
    cam.position.copy(eye); cam.lookAt(look); cam.updateMatrixWorld(true);
    if (lens[0] || lens[1]) {
      const fwd = look.clone().sub(eye).normalize();
      const right = new THREE.Vector3().crossVectors(fwd, cam.up).normalize(), up = new THREE.Vector3().crossVectors(right, fwd);
      const focusPt = eye.clone().addScaledVector(fwd, st.focus);
      cam.position.addScaledVector(right, lens[0]).addScaledVector(up, lens[1]);
      cam.lookAt(focusPt);
    }
    cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  }

  private renderOnce(time: number | null) {
    const a = this.app;
    const nf = (a.renderer as unknown as { _nodes: { nodeFrame: { update: () => void; time: number; deltaTime: number } } })._nodes.nodeFrame;
    nf.update(); // a new frame for the render passes
    if (time !== null) { nf.time = time; nf.deltaTime = 1 / 24; }
    if (a.pipeline) a.pipeline.render(); else a.renderer.render(a.scene, a.camera);
  }

  /**
   * Render one picture as the average of `samples` sub-frames. `stateAt(k)` gives the camera for sub-frame k (time
   * across the shutter); `ap` is the aperture radius in metres. Returns nothing: the picture is in `this.out`.
   */
  shoot(o: ShotOpts, stateAt: (k: number) => CamState | null, timeAt: (k: number) => number | null = () => null) {
    const a = this.app, { w, h } = o;
    this.size(w, h);
    const n = Math.max(1, o.samples), acc = this.acc;
    acc.fill(0);
    const cam = a.camera;
    for (let k = 0; k < n; k++) {
      const st = stateAt(k);
      // sub-pixel jitter (Halton 2,3), and a point on the aperture disc (Halton 5,7)
      const jx = n > 1 ? halton(k + 1, 2) - 0.5 : 0, jy = n > 1 ? halton(k + 1, 3) - 0.5 : 0;
      if (st) {
        const r = Math.sqrt(halton(k + 1, 5)) * (st.ap / 1000), ph = 2 * Math.PI * halton(k + 1, 7);
        this.place(st, n > 1 ? [r * Math.cos(ph), r * Math.sin(ph)] : [0, 0]);
        if (o.photoreal) o.photoreal.exposure = Number.isFinite(st.exp) ? look.exposureOut * st.exp : null;
      }
      cam.setViewOffset(w, h, jx, jy, w, h);
      cam.updateMatrixWorld(true);
      this.cullFrame();
      const t0 = performance.now();
      a.updateInterior(1);
      this.renderOnce(timeAt(k));
      const t1 = performance.now();
      this.g.drawImage(a.canvas, 0, 0);
      const d = this.g.getImageData(0, 0, w, h).data;
      for (let i = 0, j = 0; i < d.length; i += 4, j += 3) { acc[j] += d[i]; acc[j + 1] += d[i + 1]; acc[j + 2] += d[i + 2]; }
      this.timing.render += t1 - t0; this.timing.read += performance.now() - t1;
    }
    cam.clearViewOffset();
    const og = this.out.getContext('2d')!;
    const img = og.createImageData(w, h), D = img.data, inv = 1 / n;
    let seed = (this.timing.frames * 2654435761) >>> 0;
    const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0, j = 0; i < D.length; i += 4, j += 3) {
      // average, plus a little triangular dither so 8-bit gradients do not band (seeded: frames repeat exactly)
      const dz = (rnd() + rnd() - 1) * 0.5;
      D[i] = acc[j] * inv + dz; D[i + 1] = acc[j + 1] * inv + dz; D[i + 2] = acc[j + 2] * inv + dz; D[i + 3] = 255;
    }
    og.putImageData(img, 0, 0);
    if (o.caption) drawCaption(og, w, h);
    this.timing.frames++;
  }

  /** the finished frame as raw RGB bytes (3 per pixel), for the film tool to write as PNG */
  rgb(): Uint8Array {
    const t0 = performance.now(), w = this.out.width, h = this.out.height;
    const d = this.out.getContext('2d')!.getImageData(0, 0, w, h).data, o = new Uint8Array(w * h * 3);
    for (let i = 0, j = 0; i < d.length; i += 4, j += 3) { o[j] = d[i]; o[j + 1] = d[i + 1]; o[j + 2] = d[i + 2]; }
    this.timing.encode += performance.now() - t0;
    return o;
  }

  // ---- instanced bush culled to the view for offline frames (the instanced meshes are drawn whole otherwise) ----
  cleared = 0;
  private packs: { m: THREE.InstancedMesh; mats: Float32Array; cols: Float32Array | null; count: number; c: Float32Array; r: Float32Array }[] | null = null;
  /** `clear`: points along the camera's path; trees standing within `clearR` metres of it are left out (a camera cannot fly through a trunk) */
  cullBegin(clear: [number, number, number][] = [], clearR = 1.8) {
    this.packs = [];
    this.cleared = 0;
    const M = new THREE.Matrix4(), V = new THREE.Vector3(), S = new THREE.Vector3(), Q = new THREE.Quaternion();
    this.app.scene.traverse((o) => {
      const m = o as THREE.InstancedMesh;
      if (!m.isInstancedMesh || m.count < 8) return;
      m.updateMatrixWorld();
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
      const bs = m.geometry.boundingSphere!, n = m.count, c = new Float32Array(n * 3), r = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        m.getMatrixAt(i, M); M.premultiply(m.matrixWorld); M.decompose(V, Q, S);
        const bx = V.x, by = V.y, bz = V.z;
        V.copy(bs.center).applyMatrix4(M); c[i * 3] = V.x; c[i * 3 + 1] = V.y; c[i * 3 + 2] = V.z; r[i] = bs.radius * Math.max(S.x, S.y, S.z);
        // trees by the camera's path: radius −1 marks them out
        if (clear.length && clear.some((p) => Math.hypot(p[0] - bx, p[2] - bz) < clearR && p[1] > by - 1 && p[1] < V.y + r[i])) { r[i] = -1; this.cleared++; }
      }
      this.packs!.push({ m, mats: (m.instanceMatrix.array as Float32Array).slice(), cols: m.instanceColor ? (m.instanceColor.array as Float32Array).slice() : null, count: n, c, r });
    });
  }
  cullFrame() {
    if (!this.packs) return;
    const cam = this.app.camera, F = new THREE.Frustum(), PM = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    F.setFromProjectionMatrix(PM);
    const sph = new THREE.Sphere();
    for (const p of this.packs) {
      const A = p.m.instanceMatrix.array as Float32Array, C = p.m.instanceColor?.array as Float32Array | undefined;
      let k = 0;
      for (let i = 0; i < p.count; i++) {
        if (p.r[i] < 0) continue;
        sph.center.set(p.c[i * 3], p.c[i * 3 + 1], p.c[i * 3 + 2]); sph.radius = p.r[i] * 1.15 + 0.5;
        if (!F.intersectsSphere(sph)) continue;
        if (k !== i) { A.set(p.mats.subarray(i * 16, i * 16 + 16), k * 16); if (C && p.cols) C.set(p.cols.subarray(i * 3, i * 3 + 3), k * 3); }
        k++;
      }
      p.m.count = k; p.m.instanceMatrix.needsUpdate = true; if (p.m.instanceColor) p.m.instanceColor.needsUpdate = true;
    }
  }
  cullEnd() {
    for (const p of this.packs ?? []) {
      (p.m.instanceMatrix.array as Float32Array).set(p.mats); if (p.cols && p.m.instanceColor) (p.m.instanceColor.array as Float32Array).set(p.cols);
      p.m.count = p.count; p.m.instanceMatrix.needsUpdate = true; if (p.m.instanceColor) p.m.instanceColor.needsUpdate = true;
    }
    this.packs = null;
  }

  async png(): Promise<Blob> {
    const t0 = performance.now();
    const b = await new Promise<Blob>((res, rej) => this.out.toBlob((x) => (x ? res(x) : rej(new Error('PNG encode failed'))), 'image/png'));
    this.timing.encode += performance.now() - t0;
    return b;
  }

  /** back to the page's own size */
  restore() {
    this.app.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.app.resize();
  }
}

/** the honesty caption, small, bottom left, in the evidence face (IBM Plex Mono) */
export function drawCaption(g: CanvasRenderingContext2D, w: number, h: number, text = CAPTION) {
  const s = Math.max(11, Math.round(h * 0.017));
  g.save();
  g.font = `500 ${s}px "IBM Plex Mono", ui-monospace, monospace`;
  const pad = Math.round(s * 0.7), x = Math.round(h * 0.03), y = h - Math.round(h * 0.03);
  const tw = g.measureText(text).width;
  g.fillStyle = 'rgba(36, 11, 33, 0.42)'; // deep plum scrim
  g.fillRect(x - pad, y - s - pad * 0.8, tw + pad * 2, s + pad * 1.6);
  g.fillStyle = 'rgba(245, 241, 242, 0.94)'; // chalk
  g.textBaseline = 'alphabetic';
  g.fillText(text, x, y - pad * 0.15);
  g.restore();
}
