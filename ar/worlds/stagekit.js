// assembl AR worlds: the shared pieces of the stage, used by the WebXR session and the desktop preview alike.
//   lights        a hemisphere, one key light and a room environment (no shadow maps, so phones keep their frame rate)
//   contactShadow a soft shadow under the footprint, one draw
//   assembler     the "assembling" moment: the world builds itself piece by piece when it is placed
//   Portal        a doorway with a stencil mask: outside, the life-size world shows only through the door; walk through
//                 and the world is all round you, with your own room showing back through the door
//   cues          short sounds (Web Audio) and haptics (navigator.vibrate), both easy to turn off
import * as THREE from 'three';

export const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).get('motion') === 'reduce'; } catch (e) { return false; } };

export async function lights(scene, renderer, { env = 0.85 } = {}) {
  const { RoomEnvironment } = await import('/assets/vendor/three/addons/environments/RoomEnvironment.js');
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = env;
  pm.dispose();
  const hemi = new THREE.HemisphereLight(0xf9f6f2, 0x756771, 1.0);
  const key = new THREE.DirectionalLight(0xfff3e2, 2.2); key.position.set(-1.2, 3, 1.6);
  scene.add(hemi, key, key.target);
  return { hemi, key };
}

// a soft rounded-rectangle shadow, 1 × 1, laid flat
let shadowTex = null;
function shadowTexture() {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.filter = 'blur(26px)'; g.fillStyle = 'rgba(24,11,24,0.55)';
  g.beginPath(); if (g.roundRect) g.roundRect(48, 48, 160, 160, 40); else g.rect(48, 48, 160, 160); g.fill();
  shadowTex = new THREE.CanvasTexture(c); shadowTex.colorSpace = THREE.SRGBColorSpace;
  return shadowTex;
}
export function contactShadow(size, { round = false } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, toneMapped: false, opacity: 0.9 }));
  const s = round ? Math.max(size.x, size.z) : 0;
  m.scale.set((round ? s : size.x) * 1.45 + 0.02, 1, (round ? s : size.z) * 1.45 + 0.02);
  m.position.y = 0.002; m.renderOrder = -2; m.name = 'contact_shadow'; m.userData.arSkip = true;
  return m;
}

// ── assembling: each piece drops into place, a little staggered, nearest the centre first ─────────────────────────
// pieces: Object3D[] under root. height: the drop in root-local metres. Call start(), then update(dt) each frame until it
// returns true. onLand(i, n) fires as pieces land (for the clicks and the buzz).
export function assembler(root, pieces, { height = 1, duration = 2.4, onLand = null } = {}) {
  root.updateMatrixWorld(true);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), box = new THREE.Box3();
  const items = [];
  for (const p of pieces) {
    if (!p || !p.parent || p.userData.arSkip) continue;
    box.setFromObject(p, true); if (box.isEmpty()) continue;
    box.getCenter(c); root.worldToLocal(c);
    root.localToWorld(a.set(0, 0, 0)); root.localToWorld(b.set(0, height, 0));
    const pa = p.parent.worldToLocal(a.clone()), pb = p.parent.worldToLocal(b.clone());
    items.push({ p, rest: p.position.clone(), up: pb.sub(pa), key: Math.hypot(c.x, c.z) + c.y * 0.15, landed: false });
  }
  items.sort((x, y) => x.key - y.key);
  const n = items.length, each = Math.min(0.7, duration * 0.45), gap = n > 1 ? (duration - each) / (n - 1) : 0;
  let t = 0, done = false, landed = 0;
  const back = u => { const s = 1.4; u -= 1; return u * u * ((s + 1) * u + s) + 1; };   // ease out with a small overshoot
  function apply() {
    for (let i = 0; i < n; i++) {
      const it = items[i], u = Math.min(1, Math.max(0, (t - i * gap) / each));
      it.p.position.copy(it.rest).addScaledVector(it.up, 1 - back(u));
      it.p.visible = u > 0 || it.p.userData.__wasHidden;
      if (u >= 1 && !it.landed) { it.landed = true; landed++; onLand && onLand(landed, n); }
    }
  }
  return {
    count: n,
    start() { t = 0; done = false; landed = 0; for (const it of items) { it.landed = false; it.p.userData.__wasHidden = !it.p.visible; } apply(); },
    update(dt) { if (done) return true; t += dt; apply(); if (t >= (n - 1) * gap + each) { this.finish(); } return done; },
    finish() { for (const it of items) { it.p.position.copy(it.rest); if (!it.p.userData.__wasHidden) it.p.visible = true; delete it.p.userData.__wasHidden; } done = true; },
    get done() { return done; }
  };
}

// ── the portal ───────────────────────────────────────────────────────────────────────────────────────────────────
// A doorway W × H standing on the floor at the group's origin, facing +z (towards you when you place it). The world
// is put behind it at life size. Every material in the world gets a stencil test: outside, it draws only where the
// doorway's mask is (stencil 1) and a clipping plane drops anything on your side of the door; once you walk through,
// the test flips and the world draws everywhere except the doorway, so your room shows back through it.
export class Portal {
  constructor({ width = 1.1, height = 2.15 } = {}) {
    this.w = width; this.h = height; this.inside = false;
    this.group = new THREE.Group(); this.group.name = 'portal';
    const mask = new THREE.Mesh(new THREE.PlaneGeometry(width, height).translate(0, height / 2, 0),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }));
    Object.assign(mask.material, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
    mask.renderOrder = -10; mask.name = 'portal_mask'; this.mask = mask;
    // the frame: ivory posts and lintel with a dusty rose inner edge, and a ring on the floor
    const ivory = new THREE.MeshStandardMaterial({ color: 0xf9f6f2, roughness: 0.55 }), rose = new THREE.MeshBasicMaterial({ color: 0xd9bacb, toneMapped: false });
    const t = 0.07, d = 0.12, frame = new THREE.Group();
    const bar = (w, h, x, y, m = ivory) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, 0); frame.add(b); };
    bar(t, height + t, -width / 2 - t / 2, (height + t) / 2); bar(t, height + t, width / 2 + t / 2, (height + t) / 2); bar(width + 2 * t, t, 0, height + t / 2);
    const edge = 0.012;
    bar(edge, height, -width / 2 + edge / 2, height / 2, rose); bar(edge, height, width / 2 - edge / 2, height / 2, rose); bar(width, edge, 0, height - edge / 2, rose);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.68, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xd9bacb, transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false }));
    ring.position.set(0, 0.004, 0.55); ring.renderOrder = 3;
    this.frame = frame; this.ring = ring;
    this.group.add(mask, frame, ring);
    this.world = new THREE.Group(); this.world.name = 'portal_world'; this.group.add(this.world);
    // the sky behind the world, so through the door it reads as another place, not your ceiling
    const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color(0x9fb4c8) }, bottom: { value: new THREE.Color(0xe9e2dc) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y * 1.6 + 0.12, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }'
    }));
    sky.renderOrder = -5; sky.name = 'portal_sky'; sky.frustumCulled = false; this.sky = sky; this.world.add(sky);
    this.plane = new THREE.Plane(); this._p = new THREE.Vector3(); this._last = null;
  }
  // put a built world behind the door so its standing spot is just through the doorway
  setWorld(w) {
    const holder = new THREE.Group(); holder.name = 'portal_world_holder';
    holder.add(w.root);
    const e = w.enter || { x: 0, z: 0, yaw: 0 };
    // world point e should land 1.4 m behind the door, looking along -z (into the world)
    holder.rotation.y = -e.yaw;
    holder.updateMatrixWorld(true);
    const p = new THREE.Vector3(e.x, 0, e.z).applyMatrix4(holder.matrixWorld);
    holder.position.set(-p.x, 0, -1.4 - p.z);
    this.world.add(holder); this.holder = holder;
    this.materials = new Set();
    this.world.traverse(o => { if (o.material) for (const m of [].concat(o.material)) this.materials.add(m); });
    this.apply();
  }
  apply() {
    const f = this.inside ? THREE.NotEqualStencilFunc : THREE.EqualStencilFunc;
    // a local clipping plane on the world's own materials only (a global one would clip the door frame too); it never
    // goes away, it just moves out of the way once you are inside, so crossing doesn't recompile any shaders
    for (const m of this.materials || []) { m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = f; m.stencilFail = m.stencilZFail = m.stencilZPass = THREE.KeepStencilOp; m.stencilWriteMask = 0;
      if (!m.clippingPlanes || m.clippingPlanes[0] !== this.plane) { m.clippingPlanes = [this.plane]; m.needsUpdate = true; } }
  }
  // call once a frame with the camera's world position; sets the clipping plane and flips inside/outside on crossing
  update(renderer, camWorld) {
    this.group.updateMatrixWorld(true);
    const local = this.group.worldToLocal(this._p.copy(camWorld));
    if (this._last) {
      const crossed = (this._last.z > 0) !== (local.z > 0) && Math.abs(local.x) < this.w / 2 + 0.25 && local.y < this.h + 0.3;
      if (crossed) { this.inside = local.z < 0; this.apply(); this.onCross && this.onCross(this.inside); }
    } else this._last = new THREE.Vector3();
    this._last.copy(local);
    // outside: hide everything on your side of the door (the plane's normal points into the world)
    renderer.localClippingEnabled = true;
    if (!this.inside) {
      const n = new THREE.Vector3(0, 0, -1).transformDirection(this.group.matrixWorld);
      const o = new THREE.Vector3().setFromMatrixPosition(this.group.matrixWorld);
      this.plane.setFromNormalAndCoplanarPoint(n, o);
    } else this.plane.set(new THREE.Vector3(0, 1, 0), 1e6);
    this.ring.visible = !this.inside;
  }
  setInside(v) { this.inside = v; this.apply(); }
  dispose() { }
}

// ── cues ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export function cues() {
  let ctx = null, on = true;
  try { on = localStorage.getItem('aar-sound') !== 'off'; } catch (e) { /* default on */ }
  const audio = () => { if (!on) return null; if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (ctx.state === 'suspended') ctx.resume(); return ctx; };
  function tone(freq, dur = 0.07, gain = 0.05, type = 'sine') {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const buzz = ms => { try { if (on && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* no haptics */ } };
  let lastClick = 0;
  return {
    get on() { return on; },
    set on(v) { on = !!v; try { localStorage.setItem('aar-sound', on ? 'on' : 'off'); } catch (e) { /* not saved */ } },
    unlock() { audio(); },
    place() { tone(330, 0.12, 0.06); buzz(18); },
    land(i, n) { const now = performance.now(); if (now - lastClick < 55) return; lastClick = now; tone(420 + 520 * (i / Math.max(1, n)), 0.045, 0.028, 'triangle'); if (i % 9 === 0) buzz(6); },
    done() { tone(660, 0.16, 0.05); setTimeout(() => tone(990, 0.22, 0.04), 110); buzz([12, 40, 12]); },
    tap() { tone(520, 0.05, 0.03); buzz(8); },
    cross() { tone(250, 0.3, 0.05); setTimeout(() => tone(500, 0.3, 0.04), 140); buzz(30); }
  };
}
