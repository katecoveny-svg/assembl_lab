import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SkyMesh } from 'three/addons/objects/SkyMesh.js';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { builtinAOContext, emissive, mrt, normalView, output, pass, screenUV } from 'three/tsl';

// The twin viewer shell, shared by every project: WebGPU renderer (WebGL 2 fallback, shown
// truthfully), sky and a sun placed by date and time for the project's latitude, layers,
// x-ray and a section cut, an inspector that reads each part's element data and provenance,
// walk mode, a camera path with WebM recording, path-traced stills and downloads.

export interface Layer {
  id: string;
  label: string;
  note?: string;
  visible: boolean;
  /** built on first show */
  make?: () => Promise<THREE.Object3D> | THREE.Object3D;
  object?: THREE.Object3D;
  /** belongs to the model the x-ray and section act on */
  model?: boolean;
  /** included in path-traced stills */
  traced?: boolean;
}
export interface Key {
  eye: THREE.Vector3;
  look: THREE.Vector3;
  label: string;
}
export interface Chip {
  text: string;
  tone?: 'ok' | 'warn' | 'plain';
  title?: string;
}
export interface Built {
  layers: Layer[];
  focus: THREE.Vector3;
  radius: number;
  view: { eye: THREE.Vector3; look: THREE.Vector3 };
  path: Key[];
  /** world y range the section slider covers */
  section: [number, number];
  labels?: { text: string; at: THREE.Vector3 }[];
  /** extra info rows for the inspector, from a world point */
  probe?: (p: THREE.Vector3) => [string, string][];
  /** ground (or floor) height for walk mode */
  support?: (p: THREE.Vector3) => number | null;
  panels?: HTMLElement[];
  exports: { label: string; note?: string; run: () => Promise<{ name: string; blob: Blob }> }[];
  sources: string[];
  /** the north direction in world xz (default −z) */
  north?: THREE.Vector2;
}
export interface Project {
  key: string;
  title: string;
  kicker: string;
  chips: Chip[];
  lat: number;
  lon: number;
  build(app: App): Promise<Built>;
}

type Saver = (name: string, blob: Blob) => Promise<void>;

const fmt = (n: number, d = 2) => n.toFixed(d);

export class App {
  canvas: HTMLCanvasElement;
  renderer!: THREE.WebGPURenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 1, 0.05, 6000);
  controls!: OrbitControls;
  sun = new THREE.DirectionalLight(0xfff4e6, 3.2);
  hemi = new THREE.HemisphereLight(0xeee8df, 0x8a7458, 0.6);
  clip = new THREE.ClippingGroup();
  modelRoot = new THREE.Group();
  plain = new THREE.Group();
  sectionPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);
  built!: Built;
  project: Project;
  webgpu = false;
  save: Saver | null = null;
  status: HTMLElement;
  quality: 'web' | 'hq';
  paused = false;
  private skyTex: THREE.Texture | null = null;
  sky = new SkyMesh();
  private envSky = new SkyMesh();
  private envScene = new THREE.Scene();
  private pmrem: THREE.PMREMGenerator | null = null;
  private envRT: THREE.RenderTarget | null = null;
  private envBusy = false;
  private envAgain = false;
  pipeline: THREE.RenderPipeline | null = null;
  night = 0;
  private when = new Date();
  private walk = { on: false, yaw: 0, pitch: 0, keys: new Set<string>() };
  private playing: { t0: number; dur: number; rec?: MediaRecorder; chunks?: Blob[] } | null = null;
  private highlight = new THREE.Box3Helper(new THREE.Box3(), 0xd9bacb);
  private labelsEl: HTMLElement;
  private north2 = new THREE.Vector2(0, -1);

  constructor(project: Project, canvas: HTMLCanvasElement) {
    this.project = project;
    this.canvas = canvas;
    this.status = document.getElementById('status')!;
    this.labelsEl = document.getElementById('labels')!;
    const q = new URLSearchParams(location.search).get('q');
    this.quality = q === 'hq' ? 'hq' : 'web';
  }

  log(msg: string) {
    this.status.textContent = msg;
  }

  async start() {
    const force = new URLSearchParams(location.search).has('webgl');
    this.renderer = new THREE.WebGPURenderer({ canvas: this.canvas, antialias: true, forceWebGL: force });
    await this.renderer.init();
    this.webgpu = !!(this.renderer.backend as unknown as { isWebGPUBackend?: boolean }).isWebGPUBackend;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 0.62;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    const chip = document.getElementById('renderer')!;
    chip.textContent = this.webgpu ? 'WebGPU · three r187' : 'WebGL 2 fallback · three r187';
    chip.className = `chip ${this.webgpu ? 'ok' : 'warn'}`;
    chip.title = this.webgpu ? 'Rendering with WebGPURenderer on the WebGPU backend' : 'This browser has no WebGPU here, so WebGPURenderer is running on its WebGL 2 backend. Path-traced stills need WebGPU.';

    this.scene.add(this.sun, this.sun.target, this.hemi, this.plain);
    for (const k of [this.sky, this.envSky]) {
      k.scale.setScalar(4000);
      k.turbidity.value = 2.6;
      k.rayleigh.value = 1.4;
      k.mieCoefficient.value = 0.004;
      k.mieDirectionalG.value = 0.82;
      k.cloudCoverage.value = 0.28;
      k.cloudDensity.value = 0.35;
    }
    this.sky.name = 'sky';
    for (const k of [this.sky, this.envSky]) (k.material as THREE.Material & { fog?: boolean }).fog = false;
    this.scene.add(this.sky);
    this.envScene.add(this.envSky);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.clip.clippingPlanes = [this.sectionPlane];
    this.clip.enabled = false;
    this.clip.add(this.modelRoot);
    this.scene.add(this.clip);
    this.highlight.visible = false;
    (this.highlight.material as THREE.LineBasicMaterial).depthTest = false;
    this.highlight.renderOrder = 10;
    this.scene.add(this.highlight);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.495;

    this.setupDownloads();
    this.log('Building the model…');
    this.built = await this.project.build(this);
    if (this.built.north) this.north2.copy(this.built.north).normalize();
    for (const l of this.built.layers) await this.setLayer(l, l.visible);
    const { eye, look } = this.built.view;
    this.camera.position.copy(eye);
    this.controls.target.copy(look);
    this.controls.maxDistance = this.built.radius * 6;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.radius = 3;
    const r = this.built.radius;
    const sc = this.sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = sc.bottom = -r;
    sc.right = sc.top = r;
    sc.near = 1;
    sc.far = r * 6;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.sun.castShadow = true;
    this.initSunUI();
    this.buildUI();
    this.resize();
    addEventListener('resize', () => this.resize());
    this.initInspector();
    this.initWalk();
    if (!new URLSearchParams(location.search).has('nopost')) this.setupPipeline();
    this.renderer.setAnimationLoop(() => this.frame());
    this.log(this.webgpu ? 'Ready. Drag to orbit, scroll to zoom, click a part to inspect it.' : 'Ready on the WebGL 2 fallback. Drag to orbit, click a part to inspect it.');
    (window as unknown as { __twin: App }).__twin = this;
  }

  resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  async setLayer(l: Layer, on: boolean) {
    l.visible = on;
    if (on && !l.object && l.make) {
      this.log(`Building ${l.label.toLowerCase()}…`);
      l.object = await l.make();
      this.log('');
    }
    if (l.object && !l.object.parent) {
      l.object.userData.layer = l.id;
      (l.model ? this.modelRoot : this.plain).add(l.object);
    }
    if (l.object) l.object.visible = on;
  }

  // --- sun and sky -------------------------------------------------------------------------------
  /** the sun's direction (three axes) at a UTC instant for lat/lon, after suncalc's formulae */
  sunDir(date: Date) {
    const rad = Math.PI / 180;
    const d = date.valueOf() / 86400000 - 0.5 + 2440588 - 2451545;
    const M = rad * (357.5291 + 0.98560028 * d);
    const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    const L = M + C + rad * 102.9372 + Math.PI;
    const e = rad * 23.4397;
    const dec = Math.asin(Math.sin(e) * Math.sin(L));
    const ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
    const lw = rad * -this.project.lon;
    const phi = rad * this.project.lat;
    const H = rad * (280.16 + 360.9856235 * d) - lw - ra;
    const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
    const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)); // from south, westward
    // east, north, up → world, honouring the project's north
    const east = -Math.sin(az) * Math.cos(alt);
    const north = -Math.cos(az) * Math.cos(alt);
    const n = this.north2;
    // world xz of north = n; of east = (−n.y, n.x) rotated so that east is clockwise from north
    const ex = -n.y;
    const ez = n.x;
    const v = new THREE.Vector3(east * ex + north * n.x, Math.sin(alt), east * ez + north * n.y);
    return { v: v.normalize(), alt: alt / rad, azFromNorth: ((az / rad + 180) % 360 + 360) % 360 };
  }

  /** NZ local time (NZST +12, NZDT +13 from the last Sunday in September to the first Sunday in April) → UTC */
  static nzToUTC(y: number, m: number, d: number, hour: number) {
    const lastSunSep = (() => {
      const t = new Date(Date.UTC(y, 8, 30));
      return 30 - t.getUTCDay();
    })();
    const firstSunApr = (() => {
      const t = new Date(Date.UTC(y, 3, 1));
      return 1 + ((7 - t.getUTCDay()) % 7);
    })();
    const md = m * 100 + d;
    const dst = md >= 900 + lastSunSep || md < 400 + firstSunApr;
    const off = dst ? 13 : 12;
    return new Date(Date.UTC(y, m - 1, d, 0, 0) + (hour - off) * 3600000);
  }

  setSun(date: Date) {
    this.when = date;
    const s = this.sunDir(date);
    const f = this.built.focus;
    const R = this.built.radius * 3;
    const up = Math.max(0, Math.sin((s.alt * Math.PI) / 180));
    this.sun.position.copy(f).addScaledVector(s.v, R);
    this.sun.target.position.copy(f);
    this.sun.intensity = s.alt > 0 ? 0.8 + 4.2 * Math.min(1, up * 1.6) : 0;
    this.sun.color.setHSL(0.09, 0.6, 0.55 + 0.4 * Math.min(1, up * 2));
    this.hemi.intensity = 0.08 + 0.18 * Math.min(1, up * 2 + 0.15);
    this.makeSky(s.v, s.alt);
    this.sky.sunPosition.value.copy(s.v).multiplyScalar(1000);
    this.envSky.sunPosition.value.copy(s.v).multiplyScalar(1000);
    this.night = Math.max(0, Math.min(1, (2 - s.alt) / 8));
    this.updateEnv();
    for (const cb of this.onSun) cb(this.night, s.alt);
    const out = document.getElementById('sunread');
    if (out) out.textContent = s.alt > 0 ? `Sun ${fmt(s.alt, 0)}° up, bearing ${fmt(s.azFromNorth, 0)}°` : 'Sun below the horizon';
  }

  makeSky(dir: THREE.Vector3, alt: number) {
    const W = 512;
    const H = 256;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    const day = Math.max(0, Math.min(1, (alt + 4) / 20));
    const zen = new THREE.Color().lerpColors(new THREE.Color(0x2a2236), new THREE.Color(0x7fa3c7), day);
    const hor = new THREE.Color().lerpColors(new THREE.Color(0x8b6f7c), new THREE.Color(0xe9ece8), day);
    const img = g.createImageData(W, H);
    const sunU = (Math.atan2(dir.x, -dir.z) / (2 * Math.PI) + 0.5) % 1;
    for (let y = 0; y < H; y++) {
      const lat = (0.5 - y / H) * Math.PI;
      for (let x = 0; x < W; x++) {
        const lon = (x / W - 0.5) * 2 * Math.PI;
        const v = new THREE.Vector3(Math.sin(lon) * Math.cos(lat), Math.sin(lat), -Math.cos(lon) * Math.cos(lat));
        let col: THREE.Color;
        if (lat >= 0) {
          const t = Math.pow(1 - lat / (Math.PI / 2), 2.2);
          col = new THREE.Color().lerpColors(zen, hor, t);
        } else {
          col = new THREE.Color().lerpColors(hor, new THREE.Color(0x4c4a40), Math.min(1, -lat * 3));
        }
        const cos = v.dot(dir);
        const glow = Math.pow(Math.max(0, cos), 24) * 0.6 * (0.3 + day) + Math.pow(Math.max(0, cos), 900) * 4;
        col.r += glow;
        col.g += glow * 0.92;
        col.b += glow * 0.8;
        const i = (y * W + x) * 4;
        img.data[i] = Math.min(255, col.r * 255);
        img.data[i + 1] = Math.min(255, col.g * 255);
        img.data[i + 2] = Math.min(255, col.b * 255);
        img.data[i + 3] = 255;
      }
    }
    void sunU;
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    const old = this.skyTex;
    this.skyTex = t;
    this.scene.background = null;
    this.scene.environmentIntensity = 0.05 + 0.15 * day;
    this.scene.fog = new THREE.Fog(hor.getHex(), this.built.radius * 3, this.built.radius * 9);
    if (old) setTimeout(() => old.dispose(), 500);
  }

  /** callbacks for projects that react to the time of day (lights on at dusk) */
  onSun: ((night: number, alt: number) => void)[] = [];

  /** the sky as image-based light: PMREM of a second SkyMesh, refreshed when the sun moves */
  async updateEnv() {
    if (!this.pmrem) return;
    if (this.envBusy) {
      this.envAgain = true;
      return;
    }
    this.envBusy = true;
    try {
      const rt = this.pmrem.fromScene(this.envScene, 0, 1, 10000);
      const old = this.envRT;
      this.envRT = rt;
      this.scene.environment = rt.texture;
      if (old) setTimeout(() => old.dispose(), 400);
    } catch (e) {
      console.warn('environment from sky failed; using the painted sky', e);
      this.scene.environment = this.skyTex;
    } finally {
      this.envBusy = false;
      if (this.envAgain) {
        this.envAgain = false;
        void this.updateEnv();
      }
    }
  }

  /** scene pass with ground-truth ambient occlusion and bloom from emissive surfaces (lamps, LEDs) */
  setupPipeline() {
    try {
      const rp = new THREE.RenderPipeline(this.renderer);
      const pre = pass(this.scene, this.camera);
      pre.setMRT(mrt({ output: normalView }));
      const preN = pre.getTextureNode();
      const preD = pre.getTextureNode('depth');
      const scenePass = pass(this.scene, this.camera);
      scenePass.setMRT(mrt({ output, emissive }));
      const aoPass = ao(preD, preN, this.camera);
      (aoPass as unknown as { resolutionScale: number }).resolutionScale = 0.5;
      (aoPass as unknown as { radius: { value: number } }).radius.value = 0.6;
      scenePass.contextNode = builtinAOContext(aoPass.getTextureNode().sample(screenUV).r);
      const col = scenePass.getTextureNode('output');
      const glow = bloom(scenePass.getTextureNode('emissive'), 0.9, 0.35, 0.0);
      rp.outputNode = col.add(glow);
      this.pipeline = rp;
      const c = document.getElementById('renderer');
      if (c) c.textContent += ' · AO + bloom';
    } catch (e) {
      console.warn('post-processing unavailable; plain render', e);
      this.pipeline = null;
    }
  }

  initSunUI() {
    const now = new Date();
    const date = document.getElementById('sundate') as HTMLInputElement;
    const time = document.getElementById('suntime') as HTMLInputElement;
    const y = now.getFullYear();
    date.value = `${y}-12-21`;
    time.value = '15';
    const apply = () => {
      const [yy, mm, dd] = date.value.split('-').map(Number);
      const h = Number(time.value);
      document.getElementById('suntimeout')!.textContent = `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`;
      this.setSun(App.nzToUTC(yy, mm, dd, h));
    };
    date.addEventListener('input', apply);
    time.addEventListener('input', apply);
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-sunpreset]')) {
      b.addEventListener('click', () => {
        const [md, h] = b.dataset.sunpreset!.split(' ');
        date.value = `${y}-${md}`;
        time.value = h;
        apply();
      });
    }
    apply();
  }

  // --- UI ---------------------------------------------------------------------------------------
  buildUI() {
    const p = this.project;
    document.getElementById('title')!.textContent = p.title;
    document.getElementById('kicker')!.textContent = p.kicker;
    const chips = document.getElementById('chips')!;
    for (const c of p.chips) {
      const s = document.createElement('span');
      s.className = `chip ${c.tone ?? 'plain'}`;
      s.textContent = c.text;
      if (c.title) s.title = c.title;
      chips.append(s);
    }
    const layers = document.getElementById('layers')!;
    for (const l of this.built.layers) {
      const row = document.createElement('label');
      row.className = 'row';
      row.innerHTML = `<input type="checkbox" ${l.visible ? 'checked' : ''}><span>${l.label}${l.note ? `<small>${l.note}</small>` : ''}</span>`;
      row.querySelector('input')!.addEventListener('change', (e) => void this.setLayer(l, (e.target as HTMLInputElement).checked));
      layers.append(row);
    }
    for (const el of this.built.panels ?? []) document.getElementById('extra')!.append(el);
    // x-ray
    const xr = document.getElementById('xray') as HTMLInputElement;
    xr.addEventListener('input', () => this.setXray(Number(xr.value)));
    // section
    const [s0, s1] = this.built.section;
    const sec = document.getElementById('section') as HTMLInputElement;
    const secOn = document.getElementById('sectionOn') as HTMLInputElement;
    sec.min = String(s0);
    sec.max = String(s1);
    sec.step = '0.05';
    sec.value = String((s0 + s1) / 2);
    const applySec = () => {
      this.clip.enabled = secOn.checked;
      this.sectionPlane.constant = Number(sec.value);
      document.getElementById('sectionout')!.textContent = secOn.checked ? `cut at RL ${fmt(Number(sec.value))}` : 'off';
    };
    sec.addEventListener('input', applySec);
    secOn.addEventListener('change', applySec);
    applySec();
    // path
    const keys = document.getElementById('keys')!;
    this.built.path.forEach((k, i) => {
      const b = document.createElement('button');
      b.className = 'pill';
      b.textContent = k.label;
      b.addEventListener('click', () => this.goTo(i));
      keys.append(b);
    });
    document.getElementById('play')!.addEventListener('click', () => this.play(false));
    document.getElementById('record')!.addEventListener('click', () => this.play(true));
    document.getElementById('walk')!.addEventListener('click', () => this.toggleWalk());
    document.getElementById('shot')!.addEventListener('click', () => void this.rasterStill());
    const pt = document.getElementById('trace') as HTMLButtonElement;
    if (!this.webgpu) {
      pt.disabled = true;
      pt.title = 'Path tracing needs WebGPU';
      document.getElementById('traceNote')!.textContent = 'Path-traced stills need WebGPU. This browser is on the WebGL 2 fallback; the raster still works.';
    }
    pt.addEventListener('click', () => void this.traceStill());
    // exports
    const ex = document.getElementById('exports')!;
    for (const e of this.built.exports) {
      const b = document.createElement('button');
      b.className = 'pill';
      b.textContent = e.label;
      if (e.note) b.title = e.note;
      b.addEventListener('click', async () => {
        if (!this.save) return this.log('Downloads aren’t available in this view.');
        b.disabled = true;
        this.log(`Preparing ${e.label.toLowerCase()}…`);
        try {
          const { name, blob } = await e.run();
          await this.save(name, blob);
          this.log(`${name} (${(blob.size / 1e6).toFixed(1)} MB) offered for download.`);
        } catch (err) {
          const code = (err as { code?: string })?.code;
          this.log(code === 'declined' ? 'Download cancelled.' : `Couldn’t make that file: ${(err as Error)?.message ?? code}`);
        } finally {
          b.disabled = false;
        }
      });
      ex.append(b);
    }
    const src = document.getElementById('sources')!;
    src.innerHTML = this.built.sources.map((s) => `<li>${s}</li>`).join('');
    document.getElementById('panelToggle')?.addEventListener('click', () => document.body.classList.toggle('panel-closed'));
  }

  setXray(opacity: number) {
    const seen = new Set<THREE.Material>();
    this.modelRoot.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (!m) return;
      for (const x of Array.isArray(m) ? m : [m]) {
        if (seen.has(x)) continue;
        seen.add(x);
        const mm = x as THREE.MeshPhysicalMaterial;
        if (mm.userData.baseTransparent === undefined) {
          mm.userData.baseTransparent = mm.transparent;
          mm.userData.baseOpacity = mm.opacity;
        }
        const glass = (mm.transmission ?? 0) > 0;
        if (opacity >= 0.999) {
          mm.transparent = mm.userData.baseTransparent;
          mm.opacity = mm.userData.baseOpacity;
          mm.depthWrite = true;
        } else if (!glass) {
          mm.transparent = true;
          mm.opacity = opacity;
          mm.depthWrite = opacity > 0.6;
        }
        mm.needsUpdate = true;
      }
    });
    document.getElementById('xrayout')!.textContent = opacity >= 0.999 ? 'solid' : `${Math.round(opacity * 100)}%`;
  }

  // --- inspector ---------------------------------------------------------------------------------
  initInspector() {
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const tip = document.getElementById('tip')!;
    const card = document.getElementById('inspect')!;
    let down: [number, number] | null = null;
    const pick = (ev: PointerEvent) => {
      const r = this.canvas.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera);
      const roots = [this.modelRoot, this.plain].filter((o) => o.visible);
      const hits = ray.intersectObjects(roots, true).filter((h) => {
        if (!(h.object as THREE.Mesh).isMesh || (h.object as unknown as { isGaussianSplat?: boolean }).isGaussianSplat) return false;
        let o: THREE.Object3D | null = h.object;
        while (o) {
          if (!o.visible) return false;
          o = o.parent;
        }
        if (this.clip.enabled && h.point.y > this.sectionPlane.constant && this.isUnder(h.object, this.modelRoot)) return false;
        return true;
      });
      return hits[0] ?? null;
    };
    const tagged = (o: THREE.Object3D) => {
      let t: THREE.Object3D | null = o;
      while (t && !(t.userData?.ifcClass || t.userData?.semantic_id || t.userData?.kind)) t = t.parent;
      return t ?? o;
    };
    this.canvas.addEventListener('pointermove', (ev) => {
      if (this.walk.on || ev.buttons) {
        tip.hidden = true;
        return;
      }
      const h = pick(ev);
      if (!h) {
        tip.hidden = true;
        return;
      }
      const t = tagged(h.object);
      tip.hidden = false;
      tip.style.left = `${ev.clientX + 14}px`;
      tip.style.top = `${ev.clientY + 12}px`;
      tip.innerHTML = `<b>${nice(t.userData?.name ?? t.name)}</b><span>${[t.userData?.ifcClass, t.userData?.predefinedType].filter(Boolean).join(' · ')}</span><span class="mono">RL ${fmt(h.point.y)}</span>`;
    });
    this.canvas.addEventListener('pointerleave', () => (tip.hidden = true));
    this.canvas.addEventListener('pointerdown', (ev) => (down = [ev.clientX, ev.clientY]));
    this.canvas.addEventListener('pointerup', (ev) => {
      if (!down || Math.hypot(ev.clientX - down[0], ev.clientY - down[1]) > 4 || this.walk.on) return;
      const h = pick(ev);
      if (!h) {
        card.hidden = true;
        this.highlight.visible = false;
        return;
      }
      const t = tagged(h.object);
      const box = new THREE.Box3().setFromObject(t);
      this.highlight.box.copy(box);
      this.highlight.visible = true;
      const size = box.getSize(new THREE.Vector3());
      const u = t.userData ?? {};
      const rows: [string, string][] = [];
      if (u.ifcClass) rows.push(['Element', [u.ifcClass, u.predefinedType].filter(Boolean).join(' · ')]);
      if (u.semantic_id) rows.push(['Semantic id', String(u.semantic_id)]);
      if (u.material) rows.push(['Material', String(u.material)]);
      for (const k of ['operation', 'overallWidth', 'overallHeight', 'thickness', 'pitch', 'risers', 'riser', 'going', 'area', 'ffl', 'eave', 'ridge', 'cladding', 'basis']) {
        if (u[k] !== undefined && u[k] !== '') rows.push([k.replace(/([A-Z])/g, ' $1').toLowerCase(), String(u[k])]);
      }
      rows.push(['Bounding box', `${fmt(size.x)} × ${fmt(size.z)} × ${fmt(size.y)} m (x, z, height)`]);
      rows.push(['Point picked', `RL ${fmt(h.point.y)}`]);
      for (const r of this.built.probe?.(h.point) ?? []) rows.push(r);
      if (u.globalId) rows.push(['Global id', String(u.globalId)]);
      const src = String(u.source ?? u.basis ?? '');
      card.hidden = false;
      card.innerHTML = `<button class="x" aria-label="Close">×</button><h4>${nice(u.name ?? t.name)}</h4>${src ? `<span class="src ${src.split(/[^a-z]/i)[0].toLowerCase()}">${srcLabel(src)}</span>` : ''}${u.note ? `<p class="note">${u.note}</p>` : ''}<dl>${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>`;
      card.querySelector('.x')!.addEventListener('click', () => {
        card.hidden = true;
        this.highlight.visible = false;
      });
    });
  }

  isUnder(o: THREE.Object3D, root: THREE.Object3D) {
    let p: THREE.Object3D | null = o;
    while (p) {
      if (p === root) return true;
      p = p.parent;
    }
    return false;
  }

  // --- walk mode ---------------------------------------------------------------------------------
  initWalk() {
    addEventListener('keydown', (e) => {
      if (!this.walk.on || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      this.walk.keys.add(e.key.toLowerCase());
      if (e.key === 'Escape') this.toggleWalk();
    });
    addEventListener('keyup', (e) => this.walk.keys.delete(e.key.toLowerCase()));
    let last: [number, number] | null = null;
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.walk.on) last = [e.clientX, e.clientY];
    });
    addEventListener('pointerup', () => (last = null));
    addEventListener('pointermove', (e) => {
      if (!this.walk.on || !last) return;
      this.walk.yaw -= (e.clientX - last[0]) * 0.004;
      this.walk.pitch = Math.max(-1.2, Math.min(1.2, this.walk.pitch - (e.clientY - last[1]) * 0.004));
      last = [e.clientX, e.clientY];
    });
  }

  toggleWalk() {
    this.walk.on = !this.walk.on;
    this.controls.enabled = !this.walk.on;
    const b = document.getElementById('walk')!;
    b.classList.toggle('on', this.walk.on);
    b.textContent = this.walk.on ? 'Leave walk mode' : 'Walk';
    if (this.walk.on) {
      const d = new THREE.Vector3();
      this.camera.getWorldDirection(d);
      this.walk.yaw = Math.atan2(-d.x, -d.z);
      this.walk.pitch = 0;
      const s = this.built.support?.(this.camera.position);
      if (s != null && this.camera.position.y - s > 3) {
        // drop to eye height at the orbit target
        const t = this.controls.target.clone();
        const st = this.built.support?.(t) ?? t.y;
        this.camera.position.set(t.x, st + 1.6, t.z);
      }
      this.log('Walk: W A S D or arrow keys to move, drag to look, Esc to leave. Walk mode does not stop at walls.');
    } else {
      const d = new THREE.Vector3();
      this.camera.getWorldDirection(d);
      this.controls.target.copy(this.camera.position).addScaledVector(d, 6);
      this.log('');
    }
  }

  private stepWalk(dt: number) {
    const k = this.walk.keys;
    const f = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    const s = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    const speed = (k.has('shift') ? 3.2 : 1.4) * dt;
    const yaw = this.walk.yaw;
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const p = this.camera.position;
    p.addScaledVector(fwd, f * speed).addScaledVector(right, s * speed);
    const g = this.built.support?.(p);
    if (g != null) p.y += (g + 1.6 - p.y) * Math.min(1, dt * 10);
    this.camera.rotation.set(this.walk.pitch, yaw, 0, 'YXZ');
  }

  // --- camera path -------------------------------------------------------------------------------
  goTo(i: number) {
    const k = this.built.path[i];
    if (this.walk.on) this.toggleWalk();
    this.camera.position.copy(k.eye);
    this.controls.target.copy(k.look);
    this.controls.update();
  }

  play(record: boolean) {
    if (this.playing) {
      this.stopPlay();
      return;
    }
    if (this.walk.on) this.toggleWalk();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced && !record) {
      this.goTo(this.built.path.length - 1);
      this.log('Reduced motion is on, so the path jumps to its last view instead of playing.');
      return;
    }
    const dur = Math.max(8, this.built.path.length * 5) * 1000;
    this.playing = { t0: performance.now(), dur };
    this.controls.enabled = false;
    if (record) {
      const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
      if (!mime) {
        this.log('This browser cannot record WebM.');
      } else {
        const stream = this.canvas.captureStream(30);
        const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        rec.onstop = async () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          if (this.save) {
            await this.save(`${this.project.key}-flythrough.webm`, blob).catch(() => void 0);
            this.log(`Fly-through recorded (${(blob.size / 1e6).toFixed(1)} MB WebM) and offered for download.`);
          }
        };
        rec.start(250);
        this.playing.rec = rec;
        this.log('Recording the fly-through…');
      }
    } else this.log('Playing the fly-through. Click Play again to stop.');
    document.getElementById('play')!.textContent = 'Stop';
  }

  stopPlay() {
    if (!this.playing) return;
    this.playing.rec?.stop();
    this.playing = null;
    this.controls.enabled = true;
    const d = new THREE.Vector3();
    this.camera.getWorldDirection(d);
    this.controls.target.copy(this.camera.position).addScaledVector(d, 6);
    document.getElementById('play')!.textContent = 'Play';
  }

  private stepPlay() {
    const p = this.playing!;
    const t = Math.min(1, (performance.now() - p.t0) / p.dur);
    const keys = this.built.path;
    const eyes = new THREE.CatmullRomCurve3(keys.map((k) => k.eye), false, 'centripetal');
    const looks = new THREE.CatmullRomCurve3(keys.map((k) => k.look), false, 'centripetal');
    const e = t * t * (3 - 2 * t);
    this.camera.position.copy(eyes.getPoint(e));
    this.camera.lookAt(looks.getPoint(e));
    if (t >= 1) this.stopPlay();
  }

  // --- stills --------------------------------------------------------------------------------------
  async rasterStill() {
    if (!this.save) return this.log('Downloads aren’t available in this view.');
    this.highlight.visible = false;
    if (this.pipeline) this.pipeline.render();
    else this.renderer.render(this.scene, this.camera);
    const url = this.canvas.toDataURL('image/png');
    const blob = await (await fetch(url)).blob();
    await this.save(`${this.project.key}-view.png`, blob);
    this.log(`Raster still (${this.canvas.width} × ${this.canvas.height}) offered for download.`);
  }

  async traceStill() {
    if (!this.webgpu) return;
    const btn = document.getElementById('trace') as HTMLButtonElement;
    const samples = Number((document.getElementById('samples') as HTMLSelectElement).value);
    btn.disabled = true;
    this.paused = true;
    this.highlight.visible = false;
    this.log('Preparing the path tracer (building the BVH)…');
    try {
      const { WebGPUPathTracer } = await import('three-gpu-pathtracer/webgpu');
      const pts = new THREE.Scene();
      pts.background = this.skyTex;
      pts.environment = this.skyTex;
      pts.environmentIntensity = this.scene.environmentIntensity;
      const sun = this.sun.clone();
      sun.target = this.sun.target.clone();
      pts.add(sun, sun.target);
      for (const l of this.built.layers) {
        if (!l.visible || !l.object || l.traced === false) continue;
        const c = l.object.clone(true);
        c.traverse((o) => {
          if ((o as THREE.Line).isLine || (o as unknown as { isGaussianSplat?: boolean }).isGaussianSplat || (o as THREE.Points).isPoints) o.visible = false;
        });
        c.applyMatrix4(l.object.parent?.matrixWorld ?? new THREE.Matrix4());
        pts.add(c);
      }
      pts.updateMatrixWorld(true);
      const pt = new WebGPUPathTracer(this.renderer);
      pt.maxSamples = samples;
      pt.renderScale = Math.min(1, 1600 / this.canvas.width);
      pt.dynamicLowRes = false;
      pt.minSamples = 1;
      this.log("Building the path tracer’s acceleration structure…");
      await new Promise((r) => setTimeout(r, 30));
      pt.setScene(pts, this.camera);
      const t0 = performance.now();
      let n = 0;
      await new Promise<void>((done) => {
        const tick = async () => {
          pt.renderSample();
          n++;
          if (n % 8 === 0) {
            const c = await pt.getSampleCountsAsync().catch(() => null);
            const s = (c as unknown as { min?: number; samples?: number } | null)?.min ?? (c as unknown as { samples?: number } | null)?.samples ?? n;
            this.log(`Path tracing… ${Math.min(samples, Math.round(s))} of ${samples} samples, ${((performance.now() - t0) / 1000).toFixed(0)} s`);
            if (pt.complete || s >= samples) {
              done();
              return;
            }
          }
          if (n > samples * 6) return done();
          requestAnimationFrame(() => void tick());
        };
        void tick();
      });
      pt.renderSample();
      const url = this.canvas.toDataURL('image/png');
      const blob = await (await fetch(url)).blob();
      this.log(`Path-traced still done in ${((performance.now() - t0) / 1000).toFixed(0)} s.`);
      if (this.save) await this.save(`${this.project.key}-pathtraced.png`, blob);
      await new Promise((r) => setTimeout(r, 2500));
      (pt as unknown as { dispose?: () => void }).dispose?.();
    } catch (err) {
      this.log(`Path tracing failed: ${(err as Error).message}`);
      console.error(err);
    } finally {
      this.paused = false;
      btn.disabled = false;
    }
  }

  // --- downloads ---------------------------------------------------------------------------------
  setupDownloads() {
    const claude = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
    if (claude?.use) {
      claude
        .use('downloads')
        .then((ns) => {
          const d = ns as { save?: (r: { filename: string; data: Blob }) => Promise<unknown> } | null;
          if (d?.save) this.save = async (filename, data) => void (await d.save!({ filename, data }));
        })
        .catch(() => void 0);
    } else {
      this.save = async (filename, data) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(data);
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      };
    }
  }

  // --- frame -------------------------------------------------------------------------------------
  private lastT = performance.now();
  frame() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastT) / 1000);
    this.lastT = now;
    if (this.paused) return;
    if (this.playing) this.stepPlay();
    else if (this.walk.on) this.stepWalk(dt);
    else this.controls.update();
    if (this.pipeline) {
      try {
        this.pipeline.render();
      } catch (e) {
        console.warn('post-processing failed; plain render from now on', e);
        this.pipeline = null;
        this.renderer.render(this.scene, this.camera);
      }
    } else this.renderer.render(this.scene, this.camera);
    this.drawLabels();
    // north arrow
    const d = new THREE.Vector3();
    this.camera.getWorldDirection(d);
    const head = Math.atan2(d.x * this.north2.y - d.z * this.north2.x, d.x * this.north2.x + d.z * this.north2.y);
    (document.getElementById('north') as HTMLElement).style.transform = `rotate(${head}rad)`;
  }

  private labelEls: HTMLElement[] = [];
  drawLabels() {
    const L = this.built.labels ?? [];
    if (this.labelEls.length !== L.length) {
      this.labelsEl.innerHTML = '';
      this.labelEls = L.map((l) => {
        const s = document.createElement('span');
        s.textContent = l.text;
        this.labelsEl.append(s);
        return s;
      });
    }
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const v = new THREE.Vector3();
    L.forEach((l, i) => {
      v.copy(l.at).project(this.camera);
      const el = this.labelEls[i];
      const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && !this.walk.on && !this.playing;
      el.style.display = vis ? '' : 'none';
      if (vis) el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
    });
  }
}

export function nice(s: string) {
  return String(s ?? '')
    .replace(/^unit_/, 'Unit ')
    .replace(/_/g, ' ')
    .replace(/\b(\w)/, (m) => m.toUpperCase());
}
function srcLabel(s: string) {
  const k = s.toLowerCase();
  if (k.startsWith('written')) return 'Written on the drawings';
  if (k.startsWith('scaled')) return 'Scaled from the drawings';
  if (k.startsWith('assumed')) return 'Assumed';
  if (k.startsWith('proposed')) return 'Proposed by assembl';
  if (k.startsWith('survey')) return 'From the survey';
  if (k.startsWith('simulated')) return 'Simulated';
  if (/^d\b|^d$/.test(k)) return 'D · drawing-labelled';
  if (/^r/.test(k)) return 'R · raster proportion';
  if (/^c/.test(k)) return 'C · concept board';
  if (/^i/.test(k)) return 'I · inferred';
  return s;
}
