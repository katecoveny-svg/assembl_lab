// assembl lab · instrument studies: the shared studio.
// One instrument at a time is built from parts (each part is a group of meshes with a name, a category and notes).
// The studio puts every part in one of three places and blends between them:
//   assembled (where it sits in the instrument), exploded (pulled apart along its own direction) and laid flat
//   (every part lying on the table in tidy blocks by category).
// It also does hover labels, click to inspect, search, category chips, a demo and the camera.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const inOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Studio {
  constructor({ host, ui, sound }) {
    this.host = host; this.ui = ui; this.sound = sound;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.02;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.setAttribute('aria-label', 'Instrument model. Use the controls below, or search for a part.');
    r.domElement.setAttribute('role', 'img');
    host.appendChild(r.domElement);

    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color('#F2ECE7');
    const pm = new THREE.PMREMGenerator(r);
    s.environment = this.envRoom = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    s.environmentIntensity = 0.85;
    this.pmrem = pm;
    s.add(new THREE.HemisphereLight(0xfffaf5, 0xe6d9df, 0.55));
    const key = this.key = new THREE.DirectionalLight(0xfff4ec, 2.1);
    key.position.set(2.2, 5.5, 3.2); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.015;
    const sc = key.shadow.camera; sc.left = -3.2; sc.right = 3.2; sc.top = 3.2; sc.bottom = -3.2; sc.near = 0.5; sc.far = 14;
    s.add(key, key.target);
    const fill = new THREE.DirectionalLight(0xf3e6ee, 0.5); fill.position.set(-4, 2.5, -2); s.add(fill);
    const ground = this.ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ color: 0x3a1f33, opacity: 0.17 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);

    const cam = this.camera = new THREE.PerspectiveCamera(30, 1, 0.01, 80);
    cam.position.set(2, 2, 4);
    const c = this.controls = new OrbitControls(cam, r.domElement);
    c.enableDamping = true; c.dampingFactor = 0.08; c.enableZoom = false; c.enablePan = false; c.rotateSpeed = 0.7;
    c.minPolarAngle = 0.02; c.maxPolarAngle = Math.PI / 2 - 0.03;
    c.addEventListener('start', () => { this.dirGoal = null; this.stopDemo(); });

    this.stage = new THREE.Group(); s.add(this.stage);
    this.parts = []; this.pickables = [];
    this.e = 0; this.eGoal = 0; this.k = 0; this.kGoal = 0; this.zoom = 1;
    this.mode = 'overview'; this.selected = null; this.hovered = null; this.filter = 'all';
    this.heroMode = true; this.heroBlend = 0; this.hero = null;
    this.target = V(); this.dist = 4; this.dirGoal = null;
    this.ray = new THREE.Raycaster(); this.ndc = new THREE.Vector2(9, 9); this.pointerMoved = false;
    this.clock = new THREE.Clock(); this.time = 0;
    this.loader = new GLTFLoader(); this.loader.setMeshoptDecoder(MeshoptDecoder);

    this.bindInput();
    this.bindUI();
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
    r.setAnimationLoop(() => this.frame());
  }

  /* ───────────── loading an instrument ───────────── */
  async load(def) {
    this.unload();
    // a photo studio for gloss finishes: a dark room with softboxes, so lacquer shows crisp highlights instead of a grey wash
    if (def.studioEnv === 'softbox') { this.scene.environment = this.envSoftbox ||= this.softbox(); this.scene.environmentIntensity = def.studioEnvIntensity ?? 1; }
    else { this.scene.environment = this.envRoom; this.scene.environmentIntensity = 0.85; }
    this.def = def; this.mode = 'overview'; this.selected = null; this.filter = 'all';
    this.e = this.eGoal = 0; this.k = this.kGoal = 0; this.zoom = 1;
    this.heroMode = !!def.hero; this.heroBlend = def.hero ? 1 : 0;
    const root = new THREE.Object3D();
    const parts = [];
    let n = 0;
    const api = {
      THREE, V,
      part: (spec) => {
        const obj = spec.obj || new THREE.Group();
        const inner = spec.inner || new THREE.Group();
        if (!spec.inner) { for (const ch of [...obj.children]) inner.add(ch); obj.add(inner); }
        const p = {
          id: spec.id || `p${n}`, idx: n++, name: spec.name, cat: spec.cat, desc: spec.desc || '', spec: spec.spec || '', role: spec.role || '',
          obj, inner, explode: spec.explode ? spec.explode.clone() : V(), delay: spec.delay ?? 0, playable: !!spec.playable,
          looks: [], look: '', code: '',
        };
        parts.push(p); return p;
      },
    };
    const built = def.build(api, this) || {};
    this.built = built;
    // root: the instrument's orientation, then a scale so every instrument sits at the same size on the table
    root.rotation.copy(def.root?.rotation || new THREE.Euler());
    root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const p of parts) { p.obj.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(p.obj, true); b.applyMatrix4(root.matrixWorld); box.union(b); }
    const size = box.getSize(V());
    const scale = (def.size || 2.3) / Math.max(size.x, size.y, size.z);
    root.scale.setScalar(scale);
    const lift = def.root?.lift ?? 0.02;
    root.updateMatrixWorld(true);
    const box2 = new THREE.Box3();
    for (const p of parts) { const b = new THREE.Box3().setFromObject(p.obj, true); b.applyMatrix4(root.matrixWorld); box2.union(b); }
    const c2 = box2.getCenter(V());
    root.position.set(-c2.x, -box2.min.y + lift, -c2.z);
    root.updateMatrixWorld(true);
    this.root = root; this.scale = scale;
    this.assembledBox = box2.clone().translate(root.position);

    // per-part transforms in world space
    const rq = new THREE.Quaternion().setFromEuler(root.rotation);
    for (const p of parts) {
      p.obj.updateMatrix();
      const m = new THREE.Matrix4().multiplyMatrices(root.matrixWorld, p.obj.matrix);
      p.homePos = V(); p.homeQuat = new THREE.Quaternion(); p.homeScale = V();
      m.decompose(p.homePos, p.homeQuat, p.homeScale);
      p.explodeW = p.explode.clone().multiplyScalar(scale).applyQuaternion(rq);
      // local box (part frame, no transform) for knolling and framing
      const keep = { pos: p.obj.position.clone(), quat: p.obj.quaternion.clone(), sc: p.obj.scale.clone() };
      p.obj.position.set(0, 0, 0); p.obj.quaternion.identity(); p.obj.scale.set(1, 1, 1); p.obj.updateMatrixWorld(true);
      p.localBox = new THREE.Box3().setFromObject(p.obj, true);
      p.obj.position.copy(keep.pos); p.obj.quaternion.copy(keep.quat); p.obj.scale.copy(keep.sc);
      p.obj.matrixAutoUpdate = false;
      this.stage.add(p.obj);
      p.code = `${def.code}-${String(101 + p.idx)}`;
      p.obj.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = o.userData.noShadow ? false : true; o.receiveShadow = true;
        o.userData.part = p;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const own = mats.map((mt) => (mt.userData.unique ? mt : mt.clone()));
        o.material = Array.isArray(o.material) ? own : own[0];
        for (const mt of own) p.looks.push({ m: mt, opacity: mt.opacity, transparent: mt.transparent, emissive: mt.emissive ? mt.emissive.clone() : null, ei: mt.emissiveIntensity ?? 1 });
        if (!o.userData.noPick) this.pickables.push(o);
      });
    }
    this.parts = parts;
    this.cats = def.cats.filter((c) => parts.some((p) => p.cat === c.id));
    this.layoutExplode();
    this.layoutKnoll();
    this.framing();
    if (def.hero) this.loadHero(def.hero);
    this.ui.onLoad?.(this);
    const dir = (def.cam?.dir || V(0.5, 0.6, 1)).clone().normalize();
    this.target.copy(this.goal().target); this.dist = this.goal().dist;
    this.camera.position.copy(this.target).addScaledVector(dir, this.dist);
    this.controls.target.copy(this.target); this.controls.update();
    this.dirGoal = null;
    built.ready?.();
  }

  unload() {
    this.stopDemo();
    for (const p of this.parts) {
      this.stage.remove(p.obj);
      p.obj.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); } });
    }
    if (this.hero) { this.stage.remove(this.hero); this.hero = null; }
    this.parts = []; this.pickables = []; this.def = null; this.built = null;
    this.ui.closeCard?.();
  }

  softbox() {
    const sc = new THREE.Scene();
    const room = new THREE.Mesh(new THREE.BoxGeometry(24, 14, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color('#3a2e33').multiplyScalar(0.9), side: THREE.BackSide }));
    room.position.y = 5; sc.add(room);
    const panel = (w, h, k, x, y, z, col = '#fff7f2') => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0.5, 0); sc.add(m);
    };
    panel(6, 6, 2.2, 0, 10, 0); // a big soft overhead
    for (let i = 0; i < 3; i++) { // three tall strip boxes round the set, so a highlight reads from any side
      const a = i * Math.PI * 2 / 3 + 0.4;
      panel(1.1, 5.5, 6.5, Math.cos(a) * 8, 5.5, Math.sin(a) * 8);
    }
    panel(14, 1.4, 0.9, 0, 0.6, -10, '#f3d9e3'); // a low dusty-rose bounce
    const tex = this.pmrem.fromScene(sc, 0.015).texture;
    sc.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    return tex;
  }

  loadHero(h) {
    const want = this.def;
    this.loader.load(h.url, (g) => {
      if (this.def !== want) return;
      const m = g.scene;
      m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.material.transparent = false; if (h.tune) h.tune(o.material, this); } });
      const holder = new THREE.Group(); holder.add(m);
      m.position.copy(h.position || V()); m.rotation.copy(h.rotation || new THREE.Euler()); m.scale.setScalar(h.scale || 1);
      holder.matrixAutoUpdate = false;
      holder.matrix.copy(this.root.matrixWorld);
      this.hero = holder; this.stage.add(holder);
      this.ui.heroLoaded?.(true);
    }, undefined, () => { this.heroMode = false; this.heroBlend = 0; this.ui.heroLoaded?.(false); });
  }

  /* ───────────── layouts ───────────── */
  layoutExplode() {
    // keep exploded parts off the table: lift the whole instrument as it opens if anything would dip below
    let minY = Infinity, box = new THREE.Box3();
    for (const p of this.parts) {
      const r = p.localBox.getSize(V()).length() * 0.5 * this.scale;
      const c = p.localBox.getCenter(V()).multiplyScalar(this.scale).applyQuaternion(p.homeQuat).add(p.homePos).add(p.explodeW);
      minY = Math.min(minY, c.y - r * 0.6);
      box.expandByPoint(c.clone().addScalar(r * 0.7)); box.expandByPoint(c.clone().addScalar(-r * 0.7));
    }
    this.liftE = Math.max(0, 0.04 - minY);
    box.min.y += this.liftE; box.max.y += this.liftE;
    this.explodedBox = box;
  }

  layoutKnoll() {
    // lay every part flat: longest side along x, shortest side up; pack each category into a block, then the blocks into rows
    const gap = 0.045;
    const items = this.parts.map((p) => {
      const sz = p.localBox.getSize(V()).multiplyScalar(this.scale);
      const ax = [{ i: 0, v: sz.x }, { i: 1, v: sz.y }, { i: 2, v: sz.z }].sort((a, b) => b.v - a.v);
      const basis = [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)];
      const eL = basis[ax[0].i], eM = basis[ax[1].i], eS = basis[ax[2].i];
      const to = new THREE.Matrix4().makeBasis(V(1, 0, 0), V(0, 0, 1), V(0, 1, 0));
      const from = new THREE.Matrix4().makeBasis(eL, eM, eS);
      const R = new THREE.Matrix4().multiplyMatrices(to, from.clone().transpose());
      if (R.determinant() < 0) { const flip = new THREE.Matrix4().makeBasis(V(1, 0, 0), V(0, 0, -1), V(0, 1, 0)); R.multiplyMatrices(flip, from.clone().transpose()); }
      const q = new THREE.Quaternion().setFromRotationMatrix(R);
      if (p.knollQuat) q.premultiply(p.knollQuat);
      return { p, l: ax[0].v, w: ax[1].v, h: ax[2].v, q };
    });
    const blocks = [];
    for (const c of this.cats) {
      const its = items.filter((it) => it.p.cat === c.id).sort((a, b) => b.l - a.l || b.w - a.w);
      if (!its.length) continue;
      const area = its.reduce((s, it) => s + (it.l + gap) * (it.w + gap), 0);
      const W = Math.max(its[0].l + gap, Math.sqrt(area * 1.6));
      let x = 0, z = 0, rowH = 0, maxW = 0;
      for (const it of its) {
        if (x > 0 && x + it.l > W) { x = 0; z += rowH + gap; rowH = 0; }
        it.bx = x + it.l / 2; it.bz = z + it.w / 2; x += it.l + gap; rowH = Math.max(rowH, it.w); maxW = Math.max(maxW, x);
      }
      blocks.push({ cat: c, its, w: maxW, d: z + rowH + gap });
    }
    const total = blocks.reduce((s, b) => s + (b.w + 0.12) * (b.d + 0.16), 0);
    const aspect = Math.max(1.1, Math.min(2.2, this.aspect || 1.5));
    const RW = Math.max(...blocks.map((b) => b.w), Math.sqrt(total * aspect));
    blocks.sort((a, b) => b.d - a.d);
    let x = 0, z = 0, rowD = 0, maxX = 0;
    for (const b of blocks) {
      if (x > 0 && x + b.w > RW) { x = 0; z += rowD + 0.16; rowD = 0; }
      b.x = x; b.z = z + 0.12; x += b.w + 0.12; rowD = Math.max(rowD, b.d + 0.12); maxX = Math.max(maxX, x);
    }
    const W = maxX - 0.12, D = z + rowD;
    for (const b of blocks) {
      b.x -= W / 2; b.z -= D / 2;
      for (const it of b.its) {
        const p = it.p, c = p.localBox.getCenter(V()).multiplyScalar(this.scale).applyQuaternion(it.q);
        p.knollQuat2 = it.q;
        p.knollPos = V(b.x + it.bx, it.h / 2 + 0.002, b.z + it.bz).sub(V(c.x, c.y, c.z));
        p.knollDelay = 0.25 * ((b.x + it.bx + W / 2) / Math.max(W, 0.001));
      }
    }
    this.knollBlocks = blocks; this.knollSize = { w: W, d: D };
  }

  framing() {
    const fit = (radius) => {
      const vf = THREE.MathUtils.degToRad(this.camera.fov);
      const hf = 2 * Math.atan(Math.tan(vf / 2) * this.camera.aspect);
      return radius / Math.sin(Math.min(vf, hf) / 2);
    };
    this.fit = fit;
    const a = this.assembledBox, e = this.explodedBox;
    this.views = {
      home: { target: this.def.cam?.focus ? this.def.cam.focus.clone().applyMatrix4(this.root.matrixWorld) : a.getCenter(V()), dist: fit(a.getSize(V()).length() * 0.5) * (this.def.cam?.homeFit || 0.92) },
      exploded: { target: e.getCenter(V()), dist: fit(e.getSize(V()).length() * 0.5) * (this.def.cam?.explodeFit || 0.82) },
      knoll: { target: V(0, 0, 0.0), dist: fit(Math.hypot(this.knollSize.w, this.knollSize.d) * 0.5) * 1.24 },
    };
  }

  goal() {
    const v = this.views;
    if (!v) return { target: V(), dist: 4 };
    if (this.mode === 'inspect' && this.selected) {
      const p = this.selected, b = p.localBox.clone();
      const c = b.getCenter(V()).multiplyScalar(this.scale).applyQuaternion(p.curQuat || p.homeQuat).add(p.curPos || p.homePos);
      const r = Math.max(b.getSize(V()).length() * 0.5 * this.scale, 0.06);
      return { target: c, dist: Math.max(this.fit(r) * 1.25, 0.35) * this.zoom };
    }
    if (this.mode === 'play' && this.def.cam?.play) {
      const pl = this.def.cam.play;
      const t = pl.target.clone().applyMatrix4(this.root.matrixWorld);
      return { target: t, dist: this.fit(pl.radius * this.scale) * this.zoom };
    }
    const e = smooth(this.e), k = inOut(this.k);
    const t = v.home.target.clone().lerp(v.exploded.target, e).lerp(v.knoll.target, k);
    const d = THREE.MathUtils.lerp(THREE.MathUtils.lerp(v.home.dist, v.exploded.dist, e), v.knoll.dist, k);
    return { target: t, dist: d * this.zoom };
  }

  /* ───────────── state changes ───────────── */
  setExplode(v, fromUser = true) {
    this.eGoal = clamp(v);
    if (fromUser && this.kGoal) this.setKnoll(false);
    if (this.mode === 'play' && fromUser && v > 0.01) this.setMode('overview');
  }
  setKnoll(on) {
    this.kGoal = on ? 1 : 0;
    if (on) { this.eGoal = 1; if (this.mode !== 'overview') this.setMode('overview'); }
    this.dirGoal = on ? V(0, 1, 0.12).normalize() : (this.def.cam?.dir || V(0.5, 0.6, 1)).clone().normalize();
    this.ui.sync?.();
  }
  setMode(m, part) {
    const was = this.mode;
    this.mode = m; this.selected = m === 'inspect' ? part : null;
    if (m === 'inspect') { this.zoom = 1; this.ui.openCard?.(part); }
    else this.ui.closeCard?.();
    if (m === 'play') { this.zoom = 1; this.eGoal = 0; this.kGoal = 0; this.dirGoal = (this.def.cam?.play?.dir || this.def.cam?.dir).clone().normalize(); }
    if (was === 'play' && m !== 'play') this.dirGoal = (this.def.cam?.dir || V(0.5, 0.6, 1)).clone().normalize();
    if (m === 'overview' && was === 'inspect') this.zoom = 1;
    this.built?.mode?.(m, was);
    this.ui.sync?.();
  }
  inspect(p) { if (!p) return; this.stopDemo(); if (this.kGoal === 0 && this.e < 0.02) this.heroMode = false; this.setMode('inspect', p); }
  step(d) {
    const list = this.visibleParts();
    if (!this.selected || !list.length) return;
    let i = list.indexOf(this.selected); i = (i + d + list.length) % list.length;
    this.setMode('inspect', list[i]);
  }
  visibleParts() { return this.parts.filter((p) => this.filter === 'all' || p.cat === this.filter); }
  setFilter(id) { this.filter = id; if (this.selected && id !== 'all' && this.selected.cat !== id) this.setMode('overview'); this.ui.sync?.(); }
  setHero(on) { this.heroMode = on && !!this.def.hero; if (on) { this.setExplode(0); this.setKnoll(false); if (this.mode === 'inspect') this.setMode('overview'); } this.ui.sync?.(); }

  /* ───────────── demo ───────────── */
  async demo() {
    if (this.demoOn) { this.stopDemo(); return; }
    const token = this.demoOn = {};
    const wait = (ms) => new Promise((res) => setTimeout(res, reduced ? ms * 0.3 : ms));
    const alive = () => this.demoOn === token;
    const ramp = async (to, ms) => { const from = this.eGoal, t0 = performance.now(); while (alive()) { const t = clamp((performance.now() - t0) / ms); this.eGoal = from + (to - from) * inOut(t); this.ui.sync?.(); if (t >= 1) break; await wait(30); } };
    this.ui.sync?.();
    if (this.mode !== 'overview') this.setMode('overview');
    this.setKnoll(false); this.controls.autoRotate = !reduced; this.controls.autoRotateSpeed = 0.9;
    await ramp(0, 600); if (!alive()) return;
    await wait(500); if (!alive()) return;
    await ramp(1, 2600); if (!alive()) return;
    await wait(1400); if (!alive()) return;
    this.controls.autoRotate = false; this.setKnoll(true); this.ui.sync?.();
    await wait(3200); if (!alive()) return;
    this.setKnoll(false); this.ui.sync?.();
    await wait(1200); if (!alive()) return;
    this.controls.autoRotate = !reduced;
    await ramp(0, 2200); if (!alive()) return;
    this.controls.autoRotate = false;
    if (this.built?.demo) await this.built.demo(alive, wait);
    if (alive()) this.stopDemo();
  }
  stopDemo() { if (!this.demoOn) return; this.demoOn = null; this.controls.autoRotate = false; this.ui.sync?.(); }

  /* ───────────── input ───────────── */
  bindInput() {
    const el = this.renderer.domElement;
    // plain scroll explodes (as in the reference); pinch or ctrl-scroll zooms
    this.host.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      this.stopDemo();
      if (ev.ctrlKey || this.mode !== 'overview') { this.zoom = clamp(this.zoom * Math.exp(ev.deltaY * 0.0022), 0.35, 2.2); return; }
      if (this.kGoal && ev.deltaY < 0) { this.setKnoll(false); return; }
      this.setExplode(this.eGoal + ev.deltaY * 0.0011);
      this.ui.sync?.();
    }, { passive: false, capture: true });
    // while playing, a press on the instrument itself plays it; a press anywhere else turns the view
    this.host.addEventListener('pointerdown', (ev) => {
      if (this.mode !== 'play') { this.controls.enabled = true; return; }
      const grab = this.built?.grabs ? this.built.grabs(this.pickAt(ev)) : true;
      this.controls.enabled = !grab;
    }, { capture: true });
    const release = () => { if (this.mode === 'play') this.controls.enabled = true; };
    addEventListener('pointerup', release); addEventListener('pointercancel', release);
    const pts = new Map(); let pinch = 0;
    el.addEventListener('pointerdown', (ev) => {
      pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      this.down = { x: ev.clientX, y: ev.clientY, t: performance.now() };
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
      this.built?.pointer?.('down', ev, this.pickAt(ev));
    });
    el.addEventListener('pointermove', (ev) => {
      const rect = el.getBoundingClientRect();
      this.ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
      this.mouse = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      this.pointerMoved = true;
      if (pts.has(ev.pointerId)) pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); this.zoom = clamp(this.zoom * (pinch / d), 0.35, 2.2); pinch = d; }
      // a drag that began on the instrument plays it; one that began on the background only turns the view
      if (ev.buttons && (this.mode !== 'play' || !this.controls.enabled)) this.built?.pointer?.('drag', ev, this.pickAt(ev));
    });
    const up = (ev) => {
      pts.delete(ev.pointerId); if (pts.size < 2) pinch = 0;
      if (this.down && ev.type === 'pointerup') {
        const moved = Math.hypot(ev.clientX - this.down.x, ev.clientY - this.down.y);
        if (moved < 6 && performance.now() - this.down.t < 600) this.click(ev);
      }
      this.down = null;
      this.built?.pointer?.('up', ev, null);
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', () => { this.ndc.set(9, 9); this.pointerMoved = true; });
    addEventListener('keydown', (ev) => {
      if (ev.target?.closest?.('input,textarea,select,button')) return;
      if (this.built?.key?.(ev)) { ev.preventDefault(); return; }
      if (ev.key === 'Escape') { if (this.mode !== 'overview') this.setMode('overview'); else if (this.kGoal) this.setKnoll(false); this.stopDemo(); }
      else if (ev.key === 'ArrowRight' && this.mode === 'inspect') this.step(1);
      else if (ev.key === 'ArrowLeft' && this.mode === 'inspect') this.step(-1);
    });
  }

  pickAt(ev) {
    const el = this.renderer.domElement, rect = el.getBoundingClientRect();
    const n = new THREE.Vector2(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(n, this.camera);
    const list = this.built?.pickList?.(this.mode) || this.pickables;
    const hit = this.ray.intersectObjects(list, false).find((h) => this.isPickable(h.object));
    return hit || null;
  }
  isPickable(o) {
    const p = o.userData.part;
    if (!p) return !!o.userData.playTarget;
    return this.filter === 'all' || p.cat === this.filter;
  }
  click(ev) {
    const hit = this.pickAt(ev);
    if (this.built?.click?.(hit, ev)) return;
    if (hit && hit.object.userData.part) this.inspect(hit.object.userData.part);
    else if (this.mode === 'inspect') this.setMode('overview');
  }

  bindUI() { this.ui.bind?.(this); }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%';
    // the dock covers the bottom of the stage: centre the view in the space above it
    const d = Math.round(Math.min(160, h * 0.16));
    this.camera.aspect = w / (h + d); this.camera.setViewOffset(w, h + d, 0, d, w, h); this.camera.updateProjectionMatrix();
    const old = this.aspect; this.aspect = w / h;
    if (this.parts.length) { if (!old || Math.abs(old - this.aspect) > 0.25) this.layoutKnoll(); this.framing(); }
  }

  /* ───────────── per frame ───────────── */
  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05); this.time += dt;
    if (!this.def) { this.renderer.render(this.scene, this.camera); return; }
    this.e = damp(this.e, this.eGoal, reduced ? 30 : 6, dt);
    const kRate = reduced ? 10 : 0.85;
    this.k = this.kGoal > this.k ? Math.min(this.kGoal, this.k + dt * kRate) : Math.max(this.kGoal, this.k - dt * kRate * 1.3);
    const lift = this.liftE * smooth(this.e) * (1 - inOut(this.k));
    // hero (the generated model) shows only while everything is assembled
    const keep = this.mode === 'play' ? this.built?.heroKeep : null; // parts drawn over the hero while playing (the strings)
    const heroOn = this.hero && this.heroMode && this.eGoal < 0.005 && this.kGoal === 0 && (this.mode === 'overview' || !!keep) && !this.built?.forceParts;
    this.heroBlend = damp(this.heroBlend, heroOn ? 1 : 0, 9, dt);
    if (!this.hero) this.heroBlend = 0;
    const hb = this.heroBlend;

    const tmpQ = new THREE.Quaternion();
    for (const p of this.parts) {
      const ei = smooth((this.e - p.delay) / 0.6);
      const pos = (p.curPos ||= V()).copy(p.homePos).addScaledVector(p.explodeW, ei); pos.y += lift;
      const q = (p.curQuat ||= new THREE.Quaternion()).copy(p.homeQuat);
      if (this.k > 0) {
        const ki = inOut((this.k - p.knollDelay) / 0.75);
        pos.lerp(p.knollPos, ki); pos.y += Math.sin(Math.PI * ki) * 0.28;
        q.slerp(p.knollQuat2, ki);
      }
      p.obj.matrix.compose(pos, tmpQ.copy(q), p.homeScale);
      p.obj.matrixWorldNeedsUpdate = true;
    }
    if (this.hero) {
      this.hero.visible = hb > 0.01;
      this.hero.traverse((o) => { if (o.isMesh) { o.material.transparent = hb < 0.99; o.material.opacity = hb; o.material.depthWrite = hb > 0.5; o.castShadow = hb > 0.5; } });
    }
    this.updateLooks(hb);
    this.updateHover();
    this.built?.tick?.(dt, this.time);
    this.updateCamera(dt);
    this.ui.frame?.(this);
    this.renderer.render(this.scene, this.camera);
  }

  updateLooks(hb) {
    const insp = this.mode === 'inspect' ? this.selected : null;
    for (const p of this.parts) {
      let op = 1, glow = 0;
      if (this.filter !== 'all' && p.cat !== this.filter) op = 0.1;
      if (insp && p !== insp) op = Math.min(op, 0.12);
      if (p === this.hovered && this.mode !== 'play') glow = 0.55;
      if (p === insp) glow = 0.35;
      if (!(this.mode === 'play' && this.built?.heroKeep?.has(p.cat))) op *= 1 - hb;
      const look = `${op.toFixed(2)}|${glow}`;
      p.obj.visible = op > 0.005;
      if (look === p.look) continue;
      p.look = look;
      for (const l of p.looks) {
        const m = l.m;
        const t = op < 0.999 || l.transparent;
        if (m.transparent !== t) { m.transparent = t; m.needsUpdate = true; }
        m.opacity = l.opacity * op; m.depthWrite = op > 0.5;
        if (l.emissive) { m.emissive.copy(l.emissive).lerp(new THREE.Color('#C98FB0'), glow); m.emissiveIntensity = glow ? Math.max(l.ei, 0.55) : l.ei; }
      }
    }
  }

  updateHover() {
    if (!this.pointerMoved && Math.abs(this.e - this.eGoal) < 1e-3 && this.k === this.kGoal) return;
    this.pointerMoved = false;
    if (this.down && this.mode !== 'play') { return; }
    this.ray.setFromCamera(this.ndc, this.camera);
    const list = this.built?.pickList?.(this.mode) || this.pickables;
    const hit = this.ndc.x > 2 ? null : this.ray.intersectObjects(list, false).find((h) => this.isPickable(h.object));
    const p = hit?.object.userData.part || null;
    const hp = hit?.object.userData.playTarget || null;
    if (p !== this.hovered || hp !== this.hoverPlay) { this.hovered = p; this.hoverPlay = hp; this.ui.hover?.(p, hp, this.mouse); }
    else if (p || hp) this.ui.moveTip?.(this.mouse);
    this.renderer.domElement.style.cursor = p || hp ? 'pointer' : 'grab';
  }

  updateCamera(dt) {
    const g = this.goal();
    const rate = reduced ? 30 : 4.2;
    this.target.lerp(g.target, 1 - Math.exp(-rate * dt));
    this.dist = damp(this.dist, g.dist, rate, dt);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    if (this.dirGoal) {
      dir.lerp(this.dirGoal, 1 - Math.exp(-(reduced ? 30 : 3.2) * dt)).normalize();
      if (dir.angleTo(this.dirGoal) < 0.002) this.dirGoal = null;
    }
    this.controls.target.copy(this.target);
    this.camera.position.copy(this.target).addScaledVector(dir, this.dist);
    this.controls.update();
    this.key.target.position.copy(this.target).setY(0);
    this.key.position.copy(this.key.target.position).add(V(2.2, 5.5, 3.2));
  }

  // screen position of a world point (for labels drawn over the canvas)
  project(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * this.host.clientWidth, y: (-p.y * 0.5 + 0.5) * this.host.clientHeight, front: p.z < 1 };
  }
  partCenter(p) { return p.localBox.getCenter(V()).multiplyScalar(this.scale).applyQuaternion(p.curQuat || p.homeQuat).add(p.curPos || p.homePos); }
  // instrument-space point → world, following the root
  toWorld(v) { return v.clone().applyMatrix4(this.root.matrixWorld); }
}

/* ───────────── shared helpers for building parts ───────────── */
export const H = {
  // a closed shape extruded along z between z0 and z1
  extrude(shape, z0, z1, mat, opts = {}) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: !!opts.bevel, bevelThickness: opts.bevel || 0, bevelSize: opts.bevel || 0, bevelSegments: 2, curveSegments: opts.curve || 24, steps: 1 });
    g.translate(0, 0, z0);
    const m = new THREE.Mesh(g, mat);
    return m;
  },
  // loft rings of points (each ring the same length) into a closed solid
  loft(rings, mat, { capStart = true, capEnd = true } = {}) {
    const n = rings[0].length, pos = [], idx = [];
    for (const r of rings) for (const p of r) pos.push(p.x, p.y, p.z);
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < n; j++) {
      const a = i * n + j, b = i * n + ((j + 1) % n), c = (i + 1) * n + j, d = (i + 1) * n + ((j + 1) % n);
      idx.push(a, c, b, b, c, d);
    }
    const cap = (ri, flip) => {
      const c = V(); rings[ri].forEach((p) => c.add(p)); c.multiplyScalar(1 / n);
      const ci = pos.length / 3; pos.push(c.x, c.y, c.z);
      for (let j = 0; j < n; j++) { const a = ri * n + j, b = ri * n + ((j + 1) % n); flip ? idx.push(ci, a, b) : idx.push(ci, b, a); }
    };
    if (capStart) cap(0, false); if (capEnd) cap(rings.length - 1, true);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return new THREE.Mesh(g, mat);
  },
  // cylinder between two points
  rod(a, b, r, mat, seg = 12, r2) {
    const d = b.clone().sub(a), len = d.length();
    const g = new THREE.CylinderGeometry(r2 ?? r, r, len, seg, 1);
    const m = new THREE.Mesh(g, mat);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    return m;
  },
  box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; },
  // simple wood-grain canvas texture
  grain(base, line, { stripes = 90, wobble = 0.6, size = 512, rough = false, seed = 1 } = {}) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < stripes; i++) {
      const x0 = rnd() * size, w = 0.4 + rnd() * (rough ? 3 : 1.6), a = 0.06 + rnd() * 0.16;
      g.strokeStyle = line; g.globalAlpha = a; g.lineWidth = w; g.beginPath();
      for (let y = 0; y <= size; y += 8) { const x = x0 + Math.sin(y * 0.012 + i) * wobble * 6 + Math.sin(y * 0.05 + i * 3) * wobble; y === 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  },
};
export { THREE, V, clamp, smooth, inOut };
