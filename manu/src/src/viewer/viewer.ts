import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { BackdropTheme } from '../engine/env/backdrop';
import { createBranch, GRIP_X, loadBranch, PERCH_RANGE, perchFrames } from '../engine/env/branch';
import { createBird, type BirdHandle, type HopLayer } from '../engine/bird';
import { NZ_SPECIES } from '../engine/nz/species';
import { dressBranch, type FloraKind } from '../engine/nz/flora';

// Manu, teaching edition: one bird on its sprig in a page, not a full-screen scene.
// The bird, the twig and the sprig are the manu library's own (Feather engine by Theo
// Tillberg, MIT; Aotearoa species and flora by assembl). What's added here: a calm stage
// on the page's plate colour, preset views, anatomy anchors that follow the bones, a pause
// that really stops the bird, and rendering only when something changed.

export type AnchorId = 'bill' | 'eye' | 'forehead' | 'crown' | 'ear' | 'throat' | 'breast' | 'wing' | 'tail' | 'feet' | 'shoulder';

export interface ViewerOptions {
  bird: string;
  flora: FloraKind;
  perchUrl: string;
  /** start with the motion stopped (prefers-reduced-motion, or the visitor's choice) */
  paused?: boolean;
  /** fixed camera, quiet bird: for making the stills */
  still?: boolean;
}

export interface ScreenAnchor {
  id: AnchorId;
  x: number;
  y: number;
  /** false when the point is behind the bird from this view */
  front: boolean;
}

export type ViewName = 'three' | 'front' | 'side' | 'back';

// warm light for the reflections only (the backdrop itself is never drawn: the page's
// blush plate shows through a transparent canvas). Linear RGB, from Kate's palette:
// soft blush, pale rose, rose mauve, ivory.
const ROOM: BackdropTheme = { deep: [0.62, 0.5, 0.56], mid: [0.82, 0.72, 0.74], lite: [0.95, 0.92, 0.89], bokeh: [0.08, 0.06, 0.07] };

const TARGET = new THREE.Vector3(GRIP_X + 0.1, 0.55, 0);
// azimuths about the target: three-quarter (the library's default), front, profile, back
const VIEWS: Record<ViewName, { theta: number; phi: number; r: number }> = {
  // (three-quarter from well round the side, so a bird that holds itself level shows its posture)
  three: { theta: -0.95, phi: 1.43, r: 3.6 },
  front: { theta: 0.02, phi: 1.45, r: 3.3 },
  side: { theta: -1.4, phi: 1.43, r: 4.45 },
  back: { theta: Math.PI - 0.5, phi: 1.4, r: 3.4 },
};

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export async function createViewer(canvas: HTMLCanvasElement, opts: ViewerOptions) {
  const phone = matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.still });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 120);

  // reflections: a softbox studio, baked once (assembl 3D standard): a dim warm room, one big
  // panel overhead and three tall strip boxes round the set so a sheen reads from any side,
  // and a faint dusty-rose bounce from below. The iridescent feathers pick their flash from it.
  {
    const envScene = new THREE.Scene();
    const room = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(ROOM.mid[0], ROOM.mid[1], ROOM.mid[2]).multiplyScalar(0.42), side: THREE.BackSide }));
    envScene.add(room);
    const panel = (w: number, h: number, c: THREE.Color, pos: THREE.Vector3) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
      m.position.copy(pos);
      m.lookAt(0, 0.5, 0);
      envScene.add(m);
      return m;
    };
    panel(9, 9, new THREE.Color(1, 0.97, 0.94).multiplyScalar(3.2), new THREE.Vector3(0, 9, 0.5));
    for (let i = 0; i < 3; i++) {
      const a = 0.6 + (i * Math.PI * 2) / 3;
      panel(2.2, 10, new THREE.Color(1, 0.96, 0.93).multiplyScalar(2.2), new THREE.Vector3(Math.sin(a) * 8, 1.5, Math.cos(a) * 8));
    }
    // dusty rose #D9BACB, faint
    panel(16, 16, new THREE.Color(0xd9bacb).multiplyScalar(0.25), new THREE.Vector3(0, -6, 0));
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.02).texture;
    scene.environmentIntensity = 1.0;
    pmrem.dispose();
    envScene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    });
  }

  const hemi = new THREE.HemisphereLight(0xfff6f0, 0x5a4450, 0.75);
  const key = new THREE.DirectionalLight(0xfff4ea, 2.3);
  key.position.set(-1.3, 3.6, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -1.1, right: 1.4, bottom: -1.0, top: 1.2, near: 0.5, far: 8 });
  key.shadow.bias = -0.0015;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 4;
  key.target.position.set(0, 0.5, 0);
  const rim = new THREE.DirectionalLight(0xfbeff2, 1.25);
  rim.position.set(1.5, 1.8, -2.5);
  rim.target.position.set(0, 0.5, 0);
  scene.add(hemi, key, key.target, rim, rim.target);

  // --- the twig and its sprig ---------------------------------------------------------
  let perch: THREE.Object3D;
  try {
    const b = await loadBranch(opts.perchUrl);
    dressBranch(b.group, opts.flora);
    perch = b.group;
  } catch {
    // no model: the library's own procedural twig, with the sprig at its tip
    const b = createBranch();
    dressBranch(b.group, opts.flora);
    perch = b.group;
  }
  scene.add(perch);

  // --- the bird -----------------------------------------------------------------------
  const base = NZ_SPECIES[opts.bird];
  if (!base) throw new Error(`no species ${opts.bird}`);
  // coat detail by device: phones get fewer, larger feathers and two fuzz shells; desktops the
  // fine coat (about 2.5x the feathers) with four
  const species = { ...base, plumage: phone ? { density: 0.85, fuzzLayers: 2 } : { density: 0.62, fuzzLayers: 4 } };
  const bird: BirdHandle = createBird({ species });
  bird.root.position.x = GRIP_X;
  bird.layer<HopLayer>('hop').home = GRIP_X;
  bird.setPerch(perchFrames(perch), PERCH_RANGE);
  if (phone) bird.feathers.contour.castShadow = false;
  if (opts.still) {
    bird.mind.quiet = true;
    // head turned toward profile from the three-quarter camera, so the bill reads
    bird.mind.pinGaze = [22, 8, 0];
  }
  scene.add(bird.root);

  // --- camera -------------------------------------------------------------------------
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(TARGET);
  controls.enableDamping = !opts.still;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 1.7;
  controls.maxDistance = 4.8;
  controls.minPolarAngle = 1.05;
  controls.maxPolarAngle = 1.85;
  controls.rotateSpeed = 0.55;
  controls.zoomToCursor = false;
  // a page scrolls under a finger: one finger turns the bird sideways only, vertical swipes
  // still scroll the page (pinch zooms)
  canvas.style.touchAction = 'pan-y';
  const sph = new THREE.Spherical();
  function setView(v: ViewName | { theta: number; phi: number; r: number }) {
    const s = typeof v === 'string' ? VIEWS[v] : v;
    sph.set(s.r, s.phi, s.theta);
    camera.position.copy(TARGET).add(new THREE.Vector3().setFromSpherical(sph));
    camera.lookAt(TARGET);
    controls.update();
  }
  setView('three');

  // smooth moves between preset views (instant when motion is reduced)
  let tween: { from: THREE.Spherical; to: THREE.Spherical; t: number } | null = null;
  function goView(v: ViewName, instant = false) {
    const to = new THREE.Spherical(VIEWS[v].r, VIEWS[v].phi, VIEWS[v].theta);
    const from = new THREE.Spherical().setFromVector3(camera.position.clone().sub(TARGET));
    // the short way round
    const d = THREE.MathUtils.euclideanModulo(to.theta - from.theta + Math.PI, Math.PI * 2) - Math.PI;
    to.theta = from.theta + d;
    if (instant || reduced) {
      setView({ theta: to.theta, phi: to.phi, r: to.radius });
      tween = null;
    } else tween = { from, to, t: 0 };
    wake();
  }
  function orbitBy(dTheta: number, dR = 0) {
    const s = new THREE.Spherical().setFromVector3(camera.position.clone().sub(TARGET));
    s.theta += dTheta;
    s.radius = THREE.MathUtils.clamp(s.radius * (1 + dR), controls.minDistance, controls.maxDistance);
    setView({ theta: s.theta, phi: s.phi, r: s.radius });
    tween = null;
    wake();
  }

  // --- anatomy anchors, in bone space so they follow the bird ---------------------------
  const rig = bird.rig;
  const restOf = (name: string) => rig.rest[name];
  type Pin = { bone: string; local: THREE.Vector3 };
  function pin(bone: string, restPoint: THREE.Vector3): Pin {
    const r = restOf(bone);
    const local = restPoint.clone().sub(r.worldPos).applyQuaternion(r.worldQuat.clone().invert());
    return { bone, local };
  }
  const sp = species;
  const tailDir = new THREE.Vector3(0, -Math.sin((sp.tail.droop * Math.PI) / 180), -Math.cos((sp.tail.droop * Math.PI) / 180));
  // both sides; the one facing the camera is used
  const sided = (f: (s: 'L' | 'R') => Pin) => ({ L: f('L'), R: f('R') });
  const eyesMid = restOf('eye.L').worldPos.clone().add(restOf('eye.R').worldPos).multiplyScalar(0.5);
  const pins: Record<Exclude<AnchorId, 'bill'>, { L: Pin; R: Pin }> = {
    eye: sided((s) => pin(`eye.${s}`, restOf(`eye.${s}`).worldPos.clone())),
    forehead: sided(() => pin('head', restOf('bill').worldPos.clone().add(new THREE.Vector3(0, 0.045, -0.02)))),
    crown: sided(() => pin('head', eyesMid.clone().add(new THREE.Vector3(0, 0.07, -0.015)))),
    ear: sided((s) => pin('head', restOf(`eye.${s}`).worldPos.clone().add(new THREE.Vector3(s === 'L' ? 0.012 : -0.012, -0.004, -0.06)))),
    throat: sided(() => pin('gular', restOf('gular').worldPos.clone().add(new THREE.Vector3(0, 0.01, 0.045)))),
    breast: sided(() => pin('sternum', restOf('gular').worldPos.clone().lerp(restOf('sternum').worldPos, 0.55).add(new THREE.Vector3(0, 0, 0.1)))),
    shoulder: sided((s) => pin(`forearm.${s}`, restOf(`forearm.${s}`).worldPos.clone().lerp(restOf(`shoulder.${s}`).worldPos, 0.7).add(new THREE.Vector3(s === 'L' ? 0.03 : -0.03, 0.02, 0.02)))),
    wing: sided((s) => pin(`hand.${s}`, restOf(`hand.${s}`).worldPos.clone().add(new THREE.Vector3(s === 'L' ? 0.04 : -0.04, 0, 0)))),
    tail: sided(() => pin('tail', restOf('tail').worldPos.clone().addScaledVector(tailDir, sp.tail.length[1] * 0.75))),
    feet: sided((s) => pin(`foot.${s}`, restOf(`foot.${s}`).worldPos.clone().add(new THREE.Vector3(0, 0.03, 0.02)))),
  };
  const tmp = new THREE.Vector3();
  const eyeL = new THREE.Vector3();
  const eyeR = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const toCam = new THREE.Vector3();
  const chestAt = new THREE.Vector3();
  // the side-dependent points (eye, wing …) always use the side facing the camera; only the
  // points on the front of the body hide, when the camera is round behind the bird
  const FRONT_ONLY: AnchorId[] = ['bill', 'throat', 'breast'];
  function anchors(ids: AnchorId[]): ScreenAnchor[] {
    bird.root.updateMatrixWorld(true);
    rig.bones['eye.L'].getWorldPosition(eyeL);
    rig.bones['eye.R'].getWorldPosition(eyeR);
    const side: 'L' | 'R' = eyeL.distanceToSquared(camera.position) < eyeR.distanceToSquared(camera.position) ? 'L' : 'R';
    rig.bones.chest.getWorldPosition(chestAt);
    fwd.set(0, 0, 1).transformDirection(bird.root.matrixWorld).setY(0).normalize();
    toCam.copy(camera.position).sub(chestAt).setY(0).normalize();
    const behind = fwd.dot(toCam) < -0.3;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    return ids.map((id) => {
      if (id === 'bill') bird.billTip(tmp);
      else {
        const p = pins[id][side];
        tmp.copy(p.local);
        rig.bones[p.bone].localToWorld(tmp);
      }
      tmp.project(camera);
      return { id, x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h, front: !(behind && FRONT_ONLY.includes(id)) };
    });
  }

  // --- the loop: only while something moves -------------------------------------------
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let paused = !!opts.paused || reduced;
  let visible = true;
  let dirty = true;
  let running = false;
  const listeners: Array<() => void> = [];
  const timer = new THREE.Timer();
  timer.connect(document);
  controls.addEventListener('change', () => wake());
  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // portrait stages: widen so the whole bird and its tail stay in frame
    camera.fov = w / h < 1 ? 30 / Math.max(w / h, 0.6) : 30;
    camera.updateProjectionMatrix();
    wake();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // what the bird pays attention to: a point ahead of it and side-on to the camera, so from
  // any view it mostly holds its head in profile and the bill reads (it still looks round
  // now and then, and at the camera)
  const look = new THREE.Vector3();
  const head0 = new THREE.Vector3(GRIP_X, 1.0, 0);
  function lookAt() {
    const vx = TARGET.x - camera.position.x;
    const vz = TARGET.z - camera.position.z;
    let dx = vz;
    let dz = -vx;
    if (dz < 0 || (Math.abs(dz) < 0.05 && dx > 0)) {
      dx = -dx;
      dz = -dz;
    }
    const n = Math.hypot(dx, dz) || 1;
    // turned a little toward the camera, so from a view well round the side the head still
    // shows its profile and eye rather than the back of its crown
    const vn = Math.hypot(vx, vz) || 1;
    dx = dx / n - (vx / vn) * 0.35;
    dz = dz / n - (vz / vn) * 0.35;
    const m = Math.hypot(dx, dz) || 1;
    return look.set(head0.x + (dx / m) * 2.2, head0.y + 0.1, head0.z + (dz / m) * 2.2);
  }
  function frame(now: number) {
    timer.update(now);
    const raw = timer.getDelta();
    // the bird steps at most 1/20 s a frame; camera moves run on real time, so a slow
    // device still finishes them in about a second
    const dt = Math.min(raw, 1 / 20);
    let moving = !paused;
    if (tween) {
      tween.t = Math.min(1, tween.t + Math.min(raw, 0.25) / 1.1);
      const k = THREE.MathUtils.smootherstep(tween.t, 0, 1);
      setView({ theta: tween.from.theta + (tween.to.theta - tween.from.theta) * k, phi: tween.from.phi + (tween.to.phi - tween.from.phi) * k, r: tween.from.radius + (tween.to.radius - tween.from.radius) * k });
      if (tween.t >= 1) tween = null;
      moving = true;
    }
    const damping = controls.update();
    if (!paused) {
      bird.setAttention(lookAt());
      bird.update(dt);
    }
    if (moving || dirty || damping) {
      renderer.render(scene, camera);
      dirty = false;
      for (const f of listeners) f();
    }
    if (!moving && !tween && !damping) stop();
  }
  function start() {
    if (running || !visible) return;
    running = true;
    timer.reset();
    renderer.setAnimationLoop(frame);
  }
  function stop() {
    if (!running) return;
    running = false;
    renderer.setAnimationLoop(null);
  }
  function wake() {
    dirty = true;
    start();
  }
  // nothing runs while the stage is scrolled away or the tab is hidden
  new IntersectionObserver((es) => {
    visible = es.some((e) => e.isIntersecting);
    if (visible) wake();
    else stop();
  }).observe(canvas);

  // the first picture: compile, then one frame
  try {
    await renderer.compileAsync(scene, camera);
  } catch {
    /* compile on first draw */
  }
  bird.update(0);
  renderer.render(scene, camera);
  wake();

  return {
    renderer,
    scene,
    camera,
    bird,
    reduced,
    anchors,
    goView,
    orbitBy,
    onFrame(f: () => void) {
      listeners.push(f);
    },
    get paused() {
      return paused;
    },
    setPaused(on: boolean) {
      paused = on;
      wake();
    },
    render() {
      renderer.render(scene, camera);
    },
    wake,
  };
}

export type Viewer = Awaited<ReturnType<typeof createViewer>>;
