// assembl AR worlds: the 3D preview on a computer. The same world, model and "assembling" moment as the phone, on a
// plum stage you can turn with the mouse or the keyboard. "Step inside" shows the doorway as it stands in a room, with
// the life-size world through it; objects stand next to a 1.7 m figure for scale.
import * as THREE from 'three';
import { buildWorld, tagPos } from './scenes.js';
import { lights, contactShadow, assembler, Portal, reduceMotion } from './stagekit.js';
import { world as worldInfo, modeOf } from './worlds.js';

export async function createPreview(canvas, id, { mode = 'table', onProgress, onReady, tagsEl = null, onLearn = null } = {}) {
  mode = modeOf(mode);
  const info = worldInfo(id);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: true, preserveDrawingBuffer: new URLSearchParams(location.search).has('capture') });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.info.autoReset = false;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x21121f);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.02, 1200);
  const { OrbitControls } = await import('/assets/vendor/three/addons/controls/OrbitControls.js');
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = 1.5;
  controls.listenToKeyEvents && controls.listenToKeyEvents(canvas);
  await lights(scene, renderer);
  // a quiet floor: an aubergine disc with a fine ring, so the diorama sits on something
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 96).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2b1a29, roughness: 0.95 }));
  floor.position.y = -0.001; scene.add(floor);

  const ctx = { renderer, onProgress, scale: info[mode].scale, mode };
  const w = await buildWorld(id, ctx);
  const k = mode === 'table' ? info.table.scale : info.inside.scale;
  w.rescale && w.rescale();
  const holder = new THREE.Group(); scene.add(holder);
  let portal = null, figure = null;
  const real = w.size.clone().multiplyScalar(k);
  if (mode === 'inside' && info.kind === 'place') {
    portal = new Portal(); portal.setWorld(w); holder.add(portal.group);
    // the room's floor stops at the door, so it never shows through into the world
    floor.geometry = new THREE.PlaneGeometry(12, 7).rotateX(-Math.PI / 2).translate(0, 0, 3.5);
    camera.position.set(2.6, 1.65, 4.6); controls.target.set(0, 1.1, -0.4);
    if (new URLSearchParams(location.search).has('through')) {   // look from the standing spot, already through the door
      portal.setInside(true); camera.position.set(0, 1.6, -1.4); controls.target.set(0, 1.5, -4); }
    controls.maxDistance = 14; controls.minDistance = 0.4;
  } else {
    holder.add(w.root); holder.scale.setScalar(k);
    holder.add(contactShadow(w.size, { round: id === 'earth' || id === 'heart' }));
    const span = Math.max(real.x, real.z, real.y * 1.2);
    floor.scale.setScalar(Math.max(span * 1.25, 0.6));
    if (mode === 'inside') {
      const kit = await import('/assets/twin/3/kit.js');
      figure = kit.makePerson(2, kit.OUTFIT.plain); figure.position.set(real.x / 2 + 0.7, 0, real.z * 0.15); figure.rotation.y = -0.6; scene.add(figure);
    }
    // fit the bounding sphere in the vertical field of view, looking down a little
    const r = 0.5 * Math.hypot(real.x, real.y, real.z), d = r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * (real.y > Math.max(real.x, real.z) ? 1.08 : 0.92);
    const dir = new THREE.Vector3(0.52, 0.42, 0.82).normalize();
    controls.target.set(0, real.y * 0.45, 0);
    camera.position.copy(controls.target).addScaledVector(dir, d);
    controls.maxDistance = d * 3; controls.minDistance = Math.max(0.15, span * 0.25);
  }
  camera.near = Math.max(0.01, Math.min(real.x, real.z) / 200); camera.updateProjectionMatrix();

  // tags as buttons over the canvas
  const tagEls = [];
  if (tagsEl) {
    tagsEl.innerHTML = '';
    w.tags.forEach((t, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'wtag';
      b.innerHTML = '<b></b><span></span>'; b.querySelector('b').textContent = t.text;
      b.addEventListener('click', () => onLearn && onLearn(t));
      tagsEl.appendChild(b); tagEls.push(b);
    });
  }
  const reduce = reduceMotion();
  const build = assembler(w.root, w.pieces(), { height: w.size.y * 0.9 + Math.max(w.size.x, w.size.z) * 0.12 });
  if (!reduce && !portal) build.start();
  let running = !reduce, raf = 0, last = performance.now(), dead = false, frames = 0;
  const maxFrames = +new URLSearchParams(location.search).get('frames') || 0;
  document.documentElement.classList.remove('still');   // ?frames=N stops after N frames (stills on slow test machines)
  const camLocal = new THREE.Vector3(), tp = new THREE.Vector3();
  function resize() {
    const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  function frame(now) {
    if (dead) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!build.done && !portal && !reduce) build.update(dt);
    else if (running) { w.root.updateMatrixWorld(); camLocal.copy(camera.position); w.root.worldToLocal(camLocal); w.tick(dt, camLocal); }
    controls.update();
    if (portal) portal.update(renderer, camera.position);
    renderer.info.reset();
    renderer.render(scene, camera);
    if (tagEls.length) {
      const r = canvas.getBoundingClientRect();
      const boxes = [];
      w.tags.forEach((t, i) => {
        const el = tagEls[i]; tp.copy(tagPos(t)); w.root.localToWorld(tp); tp.project(camera);
        let vis = (build.done || reduce) && !portal && tp.z < 1 && Math.abs(tp.x) < 1 && Math.abs(tp.y) < 1;
        const x = (tp.x + 1) / 2 * r.width, y = (1 - tp.y) / 2 * r.height;
        if (vis) { const bw = el.offsetWidth || 120, bh = el.offsetHeight || 36, b = { l: x - bw / 2, r: x + bw / 2, t: y - bh, b: y };
          if (boxes.some(o => b.l < o.r - 6 && b.r > o.l + 6 && b.t < o.b - 4 && b.b > o.t + 4)) vis = false; else boxes.push(b); }
        el.style.visibility = vis ? 'visible' : 'hidden';
        if (vis) { el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`; const s = el.querySelector('span'); if (s.textContent !== t.sub) s.textContent = t.sub || ''; }
      });
    }
    if (maxFrames && ++frames >= maxFrames && (build.done || reduce || portal)) { document.documentElement.classList.add('still'); return; }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  const api = {
    world: w, renderer, scene, camera, controls, portal, mode,
    get calls() { return renderer.info.render.calls; }, get triangles() { return renderer.info.render.triangles; },
    get assembled() { return build.done; },
    play(v) { running = v; },
    status: () => w.status(),
    dispose() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); controls.dispose(); }
  };
  onReady && onReady(api);
  return api;
}
