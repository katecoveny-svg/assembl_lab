// Exact geometry passes of the twin's own model, for the photo and film tools: view-space normals, linear depth (24 bits)
// and a part map (which part of the building each pixel shows, and whether it is glass). Each mesh is drawn for the pass
// with a plain, unlit replacement material and given its own material back straight afterwards. The passes go to a
// render target with no tone mapping, no colour conversion and no anti-aliasing, and are read back byte for byte, so
// lines.ts can draw the building's edges from them and geocheck.ts can check a generated photo against them.
// Glass is drawn as a solid surface (its edges are part of the building); light decals (downlight pools, uplight glows,
// contact shadows), lines and the sky are left out.
import * as THREE from 'three/webgpu';
import { uniform, positionView, normalViewGeometry, faceDirection, vec3, vec4, floor, clamp, float } from 'three/tsl';
import type { App } from '../app';
import { FAR, PART, decodePasses, flipRows, type Passes } from './lines.ts';

type Part = (typeof PART)[keyof typeof PART];
interface Swap { mesh: THREE.Mesh; mat: THREE.Material | THREE.Material[]; visible: boolean }

/** which part of the building a mesh is, from its layer, its parents' names and kinds, and its material */
export function partOf(mesh: THREE.Object3D, layer: string): { part: Part | null; glass: boolean } {
  const mat = (mesh as THREE.Mesh).material as THREE.Material | undefined;
  const mname = mat && !Array.isArray(mat) ? mat.name : '';
  const glass = /glass/i.test(mname) && !!mat?.transparent;
  // light decals and see-through overlays with no depth of their own are not geometry
  if (mat && !Array.isArray(mat) && mat.transparent && !mat.depthWrite && !glass) return { part: null, glass };
  const names: string[] = [], kinds: string[] = [];
  for (let p: THREE.Object3D | null = mesh; p; p = p.parent) { names.push(p.name || ''); kinds.push(String(p.userData?.kind ?? '')); }
  const has = (re: RegExp) => names.some((n) => re.test(n));
  const kind = (k: string) => kinds.includes(k);
  if (layer === 'model') {
    if (kind('fitout') || kind('furniture') || has(/^fit_?out|^deck_furniture/)) return { part: PART.FITOUT, glass };
    if (has(/^roof$/)) return { part: PART.ROOF, glass };
    if (has(/^deck_/)) {
      if (has(/_balustrade$/)) return { part: PART.BALUSTRADE, glass };
      if (/h5|pile|pole/i.test(mname + ' ' + mesh.name)) return { part: PART.POLES, glass };
      if (has(/_framing$/)) return { part: PART.FRAMING, glass };
      return { part: PART.DECK, glass };
    }
    if (has(/^floor_framing$/)) return { part: /pile|pole/i.test(mesh.name) ? PART.POLES : PART.FRAMING, glass };
    if (has(/^walls$/) || has(/^wall_/)) return { part: glass || /alumin|joinery|door|frame/i.test(mname) ? PART.OPENINGS : PART.WALLS, glass };
    if (has(/cladding_ribs|_ribs$/)) return { part: PART.RIBS, glass };
    if (has(/cladding/)) return { part: PART.WALLS, glass };
    if (has(/^partitions$|^floor_finish$|^spaces$|^ceiling|^floor_tile|^skirting/)) return { part: PART.INTERIOR, glass };
    return { part: PART.BUILT, glass };
  }
  if (layer === 'site') {
    if (kind('steps')) return { part: PART.STAIR, glass };
    if (kind('retaining')) return { part: PART.RETAINING, glass };
    if (kind('boundary')) return { part: null, glass };
    return { part: PART.GROUND, glass };
  }
  if (layer === 'ground') return { part: PART.GROUND, glass };
  if (layer === 'bush' || layer === 'planting') return { part: PART.VEG, glass };
  return { part: null, glass };
}

export class GeometryPasses {
  app: App;
  /** 0 normals, 1 depth, 2 part map */
  private mode = uniform(0);
  private mats = new Map<string, THREE.MeshBasicNodeMaterial>();
  private rt: THREE.RenderTarget | null = null;
  timing = { render: 0, read: 0, passes: 0 };
  constructor(app: App) { this.app = app; }

  private material(part: number, glass: boolean, side: THREE.Side) {
    const key = `${part}|${glass ? 1 : 0}|${side}`;
    let m = this.mats.get(key);
    if (m) return m;
    m = new THREE.MeshBasicNodeMaterial({ side, fog: false });
    m.name = `geometry_pass_${key}`;
    const n = normalViewGeometry.mul(faceDirection).normalize().mul(0.5).add(0.5);
    // linear depth along the view axis, in 24 bits (every step a whole number, exact in a 32-bit float)
    const z = clamp(positionView.z.negate().div(FAR), 0, 1).mul(16777215.0);
    const r = floor(z.div(65536.0)), g = floor(z.sub(r.mul(65536.0)).div(256.0)), b = floor(z.sub(r.mul(65536.0)).sub(g.mul(256.0)));
    const d = vec3(r, g, b).div(255.0);
    const id = vec3(float(part / 255), float(glass ? 1 : 0), float(0));
    // the whole fragment stage is replaced, so nothing (instance colours, the environment, fog, tone mapping) touches the value
    m.fragmentNode = vec4(this.mode.equal(0).select(n, this.mode.equal(1).select(d, id)), 1.0);
    this.mats.set(key, m);
    return m;
  }

  /** put the pass materials on, hide what is not geometry; returns what to put back */
  private swapIn(): Swap[] {
    const a = this.app, swaps: Swap[] = [];
    const vis = (o: THREE.Object3D) => { for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false; return true; };
    const layerOf = (o: THREE.Object3D) => { for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p.userData?.layer) return String(p.userData.layer); return ''; };
    const drawable: THREE.Object3D[] = [];
    a.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh || (o as unknown as THREE.Line).isLine || (o as unknown as THREE.Points).isPoints || (o as unknown as THREE.Sprite).isSprite) drawable.push(o); });
    for (const o of drawable) {
      const m = o as THREE.Mesh;
      if (!vis(m)) continue;
      swaps.push({ mesh: m, mat: m.material, visible: m.visible });
      // only meshes inside the page's layers are geometry; the sky dome, the inspector box, lines and helpers are not drawn
      const layer = m.isMesh ? layerOf(m) : '';
      const { part, glass } = layer ? partOf(m, layer) : { part: null, glass: false };
      if (part === null) { m.visible = false; continue; }
      const om = Array.isArray(m.material) ? m.material[0] : m.material;
      m.material = this.material(part, glass, glass ? THREE.DoubleSide : (om?.side ?? THREE.FrontSide));
    }
    return swaps;
  }
  private swapOut(swaps: Swap[]) { for (let i = swaps.length - 1; i >= 0; i--) { const s = swaps[i]; if (s.mat) s.mesh.material = s.mat; s.mesh.visible = s.visible; } }

  /**
   * Render the three passes of the camera's current view at w × h and read them back (rows top to bottom).
   * The camera's aspect is set to w / h and left so.
   */
  async render(w: number, h: number): Promise<Passes> {
    const a = this.app, R = a.renderer, cam = a.camera;
    if (!this.rt || this.rt.width !== w || this.rt.height !== h) {
      this.rt?.dispose();
      this.rt = new THREE.RenderTarget(w, h, { depthBuffer: true, samples: 0, type: THREE.UnsignedByteType, format: THREE.RGBAFormat, colorSpace: THREE.NoColorSpace, generateMipmaps: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    }
    cam.aspect = w / h; cam.clearViewOffset(); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
    const fog = a.scene.fog, bg = a.scene.background, env = a.scene.environment;
    const clear = R.getClearColor(new THREE.Color()), clearA = R.getClearAlpha(), target = R.getRenderTarget();
    const shadow = a.sun.shadow.needsUpdate, auto = a.sun.shadow.autoUpdate;
    a.sun.shadow.autoUpdate = false; a.sun.shadow.needsUpdate = false;
    a.scene.fog = null; a.scene.background = null;
    const swaps = this.swapIn();
    const out: Uint8Array[] = [];
    try {
      // the clear colour is the sky's value in each pass: no normal, the far depth, the sky part
      const clears = [new THREE.Color(0, 0, 0), new THREE.Color(1, 1, 1), new THREE.Color(1, 0, 0)];
      for (let k = 0; k < 3; k++) {
        const t0 = performance.now();
        this.mode.value = k;
        R.setRenderTarget(this.rt);
        R.setClearColor(clears[k], 1);
        R.clear();
        R.render(a.scene, cam);
        const t1 = performance.now();
        const px = (await R.readRenderTargetPixelsAsync(this.rt, 0, 0, w, h)) as Uint8Array;
        out.push(new Uint8Array(px.buffer, px.byteOffset, w * h * 4).slice());
        this.timing.render += t1 - t0; this.timing.read += performance.now() - t1;
      }
    } finally {
      this.swapOut(swaps);
      R.setRenderTarget(target); R.setClearColor(clear, clearA);
      a.scene.fog = fog; a.scene.background = bg; a.scene.environment = env;
      a.sun.shadow.autoUpdate = auto; a.sun.shadow.needsUpdate = shadow;
    }
    this.timing.passes++;
    // a WebGL read-back comes bottom row first; WebGPU's top row first
    const flip = !a.webgpu;
    const [n, d, id] = flip ? out.map((p) => flipRows(p, w, h)) : out;
    return decodePasses(w, h, n, d, id);
  }

  dispose() { this.rt?.dispose(); this.rt = null; for (const m of this.mats.values()) m.dispose(); this.mats.clear(); }
}
