// assembl AR: put an object in the room, the way each phone does it best.
//   iPhone and iPad (Safari): AR Quick Look, opened from an <a rel="ar"> link to a USDZ made in the browser.
//   Android (Chrome with ARCore): WebXR immersive-ar with hit-test, a placement ring, tap to place, drag to turn and
//   pinch to resize, using a DOM overlay for the controls.
//   Android without WebXR: Scene Viewer, when the object exists as a real https GLB (the library cars).
//   Anything else: no AR here, so the page shows a code to scan instead.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { injectCSS } from './ui.js';

const UA = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
export const isAndroid = /Android/i.test(UA);
export const isIOS = /iPad|iPhone|iPod/.test(UA) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const quickLook = (() => { try { const a = document.createElement('a'); return !!(a.relList && a.relList.supports && a.relList.supports('ar')); } catch (e) { return false; } })();

let xrCheck = null;
export function webxrAR() {
  if (!xrCheck) xrCheck = (typeof navigator !== 'undefined' && navigator.xr && navigator.xr.isSessionSupported)
    ? navigator.xr.isSessionSupported('immersive-ar').catch(() => false) : Promise.resolve(false);
  return xrCheck;
}
// mode: 'quicklook' | 'webxr' | 'sceneviewer' (Android without WebXR) | 'none' (desktop or unsupported)
export async function support() {
  const webxr = await webxrAR();
  const mode = quickLook ? 'quicklook' : webxr ? 'webxr' : isAndroid ? 'sceneviewer' : 'none';
  return { quickLook, webxr, android: isAndroid, ios: isIOS, mode };
}
export function deviceSentence(mode) {
  return mode === 'quicklook' ? 'Opens in AR Quick Look on this iPhone or iPad.'
    : mode === 'webxr' ? 'Uses your camera in Chrome to place it on a real surface.'
      : mode === 'sceneviewer' ? 'This browser can’t do web AR. Google’s Scene Viewer can open library models; anything else downloads as a file.'
        : 'A computer can’t place 3D in a room. Scan the code with a phone.';
}

// ---------------------------------------------------------------- iPhone and iPad: AR Quick Look
// Same pattern as Google's <model-viewer>: a hidden <a rel="ar"> with an <img> child, a blob URL with
// download="model.usdz", and a click. allowsContentScaling=0 keeps real-size objects at real size.
export function openQuickLook(blob, { fixedScale = false } = {}) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('rel', 'ar');
  a.appendChild(document.createElement('img'));
  a.setAttribute('href', url + (fixedScale ? '#allowsContentScaling=0' : ''));
  a.setAttribute('download', 'model.usdz');
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 60000);
}

// ---------------------------------------------------------------- Android without WebXR: Scene Viewer
export function openSceneViewer(glbURL, { title = '', fixedScale = false, fallback = location.href } = {}) {
  const p = new URLSearchParams({ file: glbURL, mode: 'ar_preferred' });
  if (title) p.set('title', title);
  if (fixedScale) p.set('resizable', 'false');
  location.href = `intent://arvr.google.com/scene-viewer/1.2?${p}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fallback)};end;`;
}

// ---------------------------------------------------------------- Android: WebXR immersive-ar
let shadowTex = null;
function blobShadow() {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(36,11,33,0.42)'); gr.addColorStop(0.55, 'rgba(36,11,33,0.16)'); gr.addColorStop(1, 'rgba(36,11,33,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  shadowTex = new THREE.CanvasTexture(c); shadowTex.colorSpace = THREE.SRGBColorSpace;
  return shadowTex;
}
export { blobShadow };

function overlayEl(title, mount) {
  injectCSS();
  const el = document.createElement('div');
  el.className = 'aar-xr';
  el.innerHTML = `<div class="aar-xr-top"><span class="aar-xr-brand">assembl <b>ar</b></span><span class="aar-xr-title"></span><button type="button" class="aar-xr-btn aar-xr-close">Done</button></div>
  <div class="aar-xr-bottom"><p class="aar-xr-hint" role="status" aria-live="polite"></p>
  <div class="aar-xr-tools" hidden><span class="aar-xr-scale">Real size</span><button type="button" class="aar-xr-btn aar-xr-reset">Reset size</button></div></div>`;
  el.querySelector('.aar-xr-title').textContent = title;
  el.querySelector('.aar-xr-hint').textContent = mount === 'wall' ? 'Point at a wall and move your phone slowly.' : 'Point at the floor or a table and move your phone slowly.';
  return el;
}

// Call straight from a tap: the session request has to happen while the tap still counts as a user gesture.
export async function startWebXR(object, { title = '', mount = 'floor', fixedScale = false, onEnd } = {}) {
  const overlay = overlayEl(title, mount);
  document.body.appendChild(overlay);
  let session;
  try {
    session = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay'], domOverlay: { root: overlay } });
  } catch (e) { overlay.remove(); throw e; }

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local');
  renderer.domElement.style.display = 'none';
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 200);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.9;
  pm.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfd4, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(1, 3, 2); scene.add(key);

  // the object, with its own soft contact shadow
  const content = object.clone(true);
  content.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(content, true), size = box.getSize(new THREE.Vector3());
  const holder = new THREE.Group(); holder.visible = false; scene.add(holder);
  holder.add(content);
  if (mount === 'wall') content.position.set(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -box.min.z);
  else {
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobShadow(), transparent: true, depthWrite: false, toneMapped: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.001; sh.scale.set(size.x * 1.5 + 0.02, size.z * 1.5 + 0.02, 1); sh.renderOrder = -1;
    holder.add(sh);
  }

  // placement ring: a calm paper ring with a rose edge
  const reticle = new THREE.Group(); reticle.matrixAutoUpdate = false; reticle.visible = false; scene.add(reticle);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.085, 0.1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffdfb, transparent: true, opacity: 0.95, depthTest: false }));
  const edge = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.106, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x916a70, depthTest: false }));
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.012, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffdfb, depthTest: false }));
  reticle.add(ring, edge, dot);

  const $ = s => overlay.querySelector(s);
  const hint = $('.aar-xr-hint'), tools = $('.aar-xr-tools'), scaleEl = $('.aar-xr-scale');
  let placed = false, scale = 1, hitSource = null, ended = false;
  const setHint = t => { if (hint.textContent !== t) hint.textContent = t; };
  const showScale = () => { holder.scale.setScalar(scale); scaleEl.textContent = Math.abs(scale - 1) < 0.02 ? 'Real size' : Math.round(scale * 100) + '% of real size'; };

  const viewerSpace = await session.requestReferenceSpace('viewer');
  hitSource = await session.requestHitTestSource({ space: viewerSpace });
  await renderer.xr.setSession(session);
  const Y = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3(), nrm = new THREE.Vector3(), camPos = new THREE.Vector3();

  function place() {
    if (!reticle.visible) return;
    const pos = tmp.setFromMatrixPosition(reticle.matrix);
    nrm.setFromMatrixColumn(reticle.matrix, 1).normalize();
    holder.position.copy(pos);
    if (mount === 'wall' && Math.abs(nrm.y) < 0.5) {
      const z = nrm.clone(), x = new THREE.Vector3().crossVectors(Y, z).normalize(), y = new THREE.Vector3().crossVectors(z, x);
      holder.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    } else {
      camPos.setFromMatrixPosition(renderer.xr.getCamera().matrixWorld);
      holder.quaternion.setFromAxisAngle(Y, Math.atan2(camPos.x - pos.x, camPos.z - pos.z));
    }
    holder.visible = true; placed = true; tools.hidden = false; showScale();
    setHint(mount === 'wall' ? 'Pinch to resize. Tap the wall to move it.' : 'Drag to turn, pinch to resize, tap to move it.');
  }

  // gestures on the overlay: tap to place, one finger turns, two fingers pinch and twist
  const pts = new Map(); let g0 = null, moved = false, downAt = 0;
  const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const ang = () => { const [a, b] = [...pts.values()]; return Math.atan2(b.y - a.y, b.x - a.x); };
  const onDown = e => {
    if (e.target.closest('button')) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { moved = false; downAt = performance.now(); }
    if (pts.size === 2) { moved = true; g0 = { d: dist(), a: ang(), s: scale, r: holder.rotation.y }; }
  };
  const onMove = e => {
    const p = pts.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x;
    if (pts.size === 1) {
      if (Math.abs(dx) + Math.abs(e.clientY - p.y) > 8) moved = true;
      if (moved && placed && mount !== 'wall') holder.rotateY(dx * 0.012);
      p.x = e.clientX; p.y = e.clientY;
    } else if (pts.size === 2 && g0) {
      p.x = e.clientX; p.y = e.clientY;
      scale = THREE.MathUtils.clamp(g0.s * dist() / Math.max(1, g0.d), 0.05, 20);
      if (Math.abs(scale - 1) < 0.04) scale = 1;
      showScale();
      if (mount !== 'wall') { holder.rotation.y = g0.r - (ang() - g0.a); }
    }
  };
  const onUp = e => {
    if (!pts.has(e.pointerId)) return;
    if (pts.size === 1 && !moved && performance.now() - downAt < 600) place();
    pts.delete(e.pointerId); if (pts.size < 2) g0 = null;
  };
  overlay.addEventListener('pointerdown', onDown);
  overlay.addEventListener('pointermove', onMove);
  overlay.addEventListener('pointerup', onUp);
  overlay.addEventListener('pointercancel', e => { pts.delete(e.pointerId); g0 = null; });
  for (const b of overlay.querySelectorAll('button')) b.addEventListener('beforexrselect', e => e.preventDefault());
  $('.aar-xr-close').addEventListener('click', () => session.end());
  $('.aar-xr-reset').addEventListener('click', () => { scale = 1; showScale(); });
  // without a DOM overlay (some browsers), a screen tap arrives as an XR select
  session.addEventListener('select', () => { if (!session.domOverlayState) place(); });

  renderer.setAnimationLoop((t, frame) => {
    if (frame && hitSource) {
      const ref = renderer.xr.getReferenceSpace();
      const hits = frame.getHitTestResults(hitSource);
      let pose = null;
      for (const h of hits) {
        const p = h.getPose(ref); if (!p) continue;
        const m = p.transform.matrix, ny = m[5];
        const wantWall = mount === 'wall';
        if (wantWall ? Math.abs(ny) < 0.5 : ny > 0.7) { pose = p; break; }
        if (!pose) pose = p;
      }
      if (pose) {
        reticle.visible = true; reticle.matrix.fromArray(pose.transform.matrix);
        if (!placed) setHint(mount === 'wall' ? 'Tap to hang it here.' : 'Tap to place it here.');
      } else {
        reticle.visible = false;
        if (!placed) setHint(mount === 'wall' ? 'Point at a wall and move your phone slowly.' : 'Point at the floor or a table and move your phone slowly.');
      }
    }
    renderer.render(scene, camera);
  });

  return new Promise(resolve => {
    session.addEventListener('end', () => {
      if (ended) return; ended = true;
      renderer.setAnimationLoop(null);
      try { hitSource && hitSource.cancel(); } catch (e) { }
      renderer.dispose(); renderer.domElement.remove(); overlay.remove();
      onEnd && onEnd(); resolve();
    });
  });
}
