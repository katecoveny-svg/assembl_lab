// assembl AR: the calm 3D preview. Soft studio light, a contact shadow, a placement ring like the one you'll see in AR,
// and orbit controls. It renders only when something changes. When a new object arrives its parts come together
// (the one bit of motion, and it shows the object being assembled); reduced-motion turns that off.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { blobShadow } from './ar.js';

const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeOut = t => 1 - Math.pow(1 - t, 3);

export function createStage(host, { label = '3D preview' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage-canvas';
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', label);
  canvas.tabIndex = 0;
  host.appendChild(canvas);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false });
  } catch (e) { canvas.remove(); throw new Error('WebGL is not available here, so the 3D preview can’t run.'); }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.75;
  pm.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6dce0, 0.55));
  const key = new THREE.DirectionalLight(0xfff6f0, 1.6); key.position.set(-2, 4, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xf3e8ee, 0.6); rim.position.set(3, 2, -3); scene.add(rim);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 500);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.09; controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * 0.49; controls.rotateSpeed = 0.75;

  // ground: contact shadow and the placement ring
  const ground = new THREE.Group(); scene.add(ground);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobShadow(), transparent: true, depthWrite: false, toneMapped: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.0005; shadow.renderOrder = -2; ground.add(shadow);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x916a70, transparent: true, opacity: 0.38, depthWrite: false, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.992, 1, 128).rotateX(-Math.PI / 2), ringMat); ring.position.y = 0.0008; ground.add(ring);
  const ticks = new THREE.Group(); ground.add(ticks);
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.006, 0.07).rotateX(-Math.PI / 2), ringMat);
    const a = i * Math.PI / 2; t.position.set(Math.sin(a) * 1.06, 0.0008, Math.cos(a) * 1.06); t.rotation.y = a; ticks.add(t);
  }

  let current = null, anim = null, dirty = true, W = 0, H = 0, visible = true, radius = 1;
  const holder = new THREE.Group(); scene.add(holder);

  function resize() {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (w === W && h === H) return;
    W = w; H = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); dirty = true;
  }
  try { new ResizeObserver(resize).observe(host); } catch (e) { addEventListener('resize', resize); }
  try { new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) dirty = true; }).observe(host); } catch (e) { }
  controls.addEventListener('change', () => { dirty = true; });

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    resize();
    if (anim) {
      const t = Math.min(1, (now - anim.t0) / anim.dur);
      for (const p of anim.parts) {
        const k = easeOut(THREE.MathUtils.clamp((t - p.delay) / (1 - p.delay), 0, 1));
        p.obj.position.lerpVectors(p.from, p.to, k);
      }
      dirty = true;
      if (t >= 1) { for (const p of anim.parts) p.obj.position.copy(p.to); anim = null; }
    }
    if (controls.update()) dirty = true;
    if (dirty) { renderer.render(scene, camera); dirty = false; }
  }
  requestAnimationFrame(frame);

  function frameObject(obj, keepView) {
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj, true), size = box.getSize(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    radius = Math.max(sphere.radius, 1e-3);
    const foot = Math.max(size.x, size.z) * 0.5;
    ring.scale.setScalar(Math.max(foot * 1.16, radius * 0.72)); ticks.scale.copy(ring.scale);
    shadow.scale.set(size.x * 1.35 + radius * 0.25, size.z * 1.35 + radius * 0.25, 1);
    camera.near = radius / 100; camera.far = radius * 60; camera.updateProjectionMatrix();
    controls.target.set(0, size.y * 0.42, 0);
    controls.minDistance = radius * 1.3; controls.maxDistance = radius * 8;
    if (!keepView) {
      const fit = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.aspect < 0.9 ? 1.25 / Math.max(0.55, camera.aspect) : 1.05);
      const dir = new THREE.Vector3(0.62, 0.36, 1).normalize();
      camera.position.copy(controls.target).addScaledVector(dir, fit);
    } else {
      // keep the viewing angle, adjust distance to the new size
      const off = camera.position.clone().sub(controls.target);
      const d = THREE.MathUtils.clamp(off.length(), controls.minDistance, controls.maxDistance);
      const want = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.05;
      camera.position.copy(controls.target).addScaledVector(off.normalize(), keepView === 'refit' ? want : d);
    }
    controls.update();
  }

  function setObject(obj, { animate = false, keepView = false } = {}) {
    if (current) holder.remove(current);
    current = obj; anim = null;
    if (!obj) { dirty = true; return; }
    holder.add(obj);
    resize();
    frameObject(obj, keepView);
    const parts = (obj.userData.parts || []).filter(p => p.parent);
    if (animate && !REDUCED && parts.length > 1) {
      const box = new THREE.Box3().setFromObject(obj, true), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
      const lift = Math.max(s.x, s.y, s.z) * 0.18;
      anim = { t0: performance.now(), dur: 720 + Math.min(parts.length, 24) * 18, parts: parts.map((p, i) => {
        const to = p.position.clone();
        const wc = new THREE.Box3().setFromObject(p, true).getCenter(new THREE.Vector3());
        const dir = wc.sub(c); dir.y = Math.max(dir.y, 0); if (dir.lengthSq() < 1e-9) dir.set(0, 1, 0);
        dir.normalize();
        // offset in the part's parent space, roughly outward and up
        const from = to.clone().add(new THREE.Vector3(dir.x * lift * 0.6, lift * (0.6 + 0.4 * (i % 3) / 2), dir.z * lift * 0.6).divide(p.parent.getWorldScale(new THREE.Vector3())));
        p.position.copy(from);
        return { obj: p, from, to, delay: Math.min(0.45, i * 0.035) };
      }) };
    }
    dirty = true;
  }

  // jump any assembly motion to its end (before a snapshot or export)
  function finish() {
    if (!anim) return;
    for (const p of anim.parts) p.obj.position.copy(p.to);
    anim = null; dirty = true;
  }

  // a transparent PNG of the object from a fixed three-quarter view, for the code card. It draws one frame into the
  // stage's own canvas at thumbnail size and reads it straight back, then puts the canvas back as it was.
  function thumbnail(size = 480, aspect = 1.6, obj = null) {
    const subject = obj || current;
    if (!subject) return null;
    finish();
    const swap = obj && obj !== current;
    if (swap) { if (current) holder.remove(current); holder.add(obj); shadow.visible = false; }
    subject.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(subject, true), target = box.getCenter(new THREE.Vector3());
    const r = Math.max(1e-3, box.getBoundingSphere(new THREE.Sphere()).radius);
    const tw = Math.round(size * aspect), th = size;
    const cam = new THREE.PerspectiveCamera(26, aspect, r / 100, r * 60);
    const fitV = r / Math.sin(THREE.MathUtils.degToRad(13)), fitH = fitV / Math.min(1, aspect);
    cam.position.copy(target).addScaledVector(new THREE.Vector3(0.62, 0.3, 1).normalize(), Math.max(fitV * (aspect > 1.4 ? 0.82 : 1), fitH * 0.62)); cam.lookAt(target);
    ring.visible = false; ticks.visible = false;
    const pr = renderer.getPixelRatio();
    renderer.setPixelRatio(1); renderer.setSize(tw, th, false);
    renderer.render(scene, cam);
    const url = canvas.toDataURL('image/png');
    renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
    ring.visible = true; ticks.visible = true; shadow.visible = true;
    if (swap) { holder.remove(obj); if (current) holder.add(current); }
    renderer.render(scene, camera); dirty = false;
    return url;
  }

  return { canvas, renderer, scene, camera, controls, setObject, thumbnail, finish, get object() { return current; }, refit: () => { if (current) frameObject(current, 'refit'); dirty = true; }, render: () => { dirty = true; } };
}
