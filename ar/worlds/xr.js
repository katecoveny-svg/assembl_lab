// assembl AR worlds: the live world in WebXR (Android Chrome with ARCore, and Meta Quest's browser).
//   On your table  find a surface, tap, and the world builds itself piece by piece; then the model runs: tankers queue,
//                  patients wait, the claw grabs. Drag to turn, pinch to resize, tap a label to learn more.
//   Step inside    places get a doorway on the floor: walk through it into the life-size world, and look back through the
//                  door at your own room. Objects stand in the room at real size (or giant), and stay that size.
// Call startWorldXR() straight from a tap: the session request has to happen while the tap still counts.
import * as THREE from 'three';
import { world as worldInfo, modeOf, SIMREADY } from './worlds.js';
import { lights, contactShadow, assembler, Portal, cues as makeCues, reduceMotion } from './stagekit.js';
import { esc } from '../js/ui.js';

const CSS = `
.wxr{position:fixed;inset:0;z-index:2147483000;pointer-events:auto;touch-action:none;-webkit-user-select:none;user-select:none;
 font:500 15px/1.35 "Instrument Sans",system-ui,-apple-system,sans-serif;color:#F9F6F2;
 padding:max(12px,env(safe-area-inset-top)) 12px max(14px,env(safe-area-inset-bottom));display:flex;flex-direction:column;justify-content:space-between}
.wxr *{box-sizing:border-box}
.wxr-top{display:flex;flex-direction:column;gap:6px;align-items:stretch}
.wxr-bar{display:flex;align-items:center;gap:10px;padding:6px 6px 6px 14px;border-radius:999px;background:rgba(24,11,24,.78);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.wxr-brand{font:400 11px/1 "IBM Plex Mono",ui-monospace,monospace;color:#D9BACB;white-space:nowrap}
.wxr-brand b{font-weight:500;color:#F9F6F2}
.wxr-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}
.wxr-chips{display:flex;flex-wrap:wrap;gap:5px;padding:0 4px}
.wxr-chip{font:500 10.5px/1 "IBM Plex Mono",ui-monospace,monospace;padding:6px 8px;border-radius:999px;background:rgba(24,11,24,.72);color:#F9F6F2;border:1px solid rgba(217,186,203,.35)}
.wxr-chip.quiet{color:#D9BACB}
.wxr-status{font:400 11px/1 "IBM Plex Mono",ui-monospace,monospace;color:#F9F6F2;padding:6px 9px;border-radius:999px;background:rgba(24,11,24,.72)}
.wxr-sos{margin:0;padding:8px 12px;border-radius:14px;background:#F9F6F2;color:#21121F;font:500 12.5px/1.35 "Instrument Sans",system-ui,sans-serif}
.wxr-sos b{font-weight:600}
.wxr-btn{appearance:none;border:0;border-radius:999px;min-height:48px;padding:12px 18px;background:#F9F6F2;color:#21121F;font:600 15px/1 "Instrument Sans",system-ui,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}
.wxr-btn.ghost{background:rgba(24,11,24,.78);color:#F9F6F2;box-shadow:inset 0 0 0 1px rgba(217,186,203,.4)}
.wxr-btn[aria-pressed="false"]{opacity:.62}
.wxr-btn:focus-visible{outline:2px solid #D9BACB;outline-offset:3px}
.wxr-done{min-height:40px;padding:10px 16px;font-size:14px}
.wxr-bottom{display:flex;flex-direction:column;align-items:center;gap:10px}
.wxr-hint{margin:0;padding:11px 16px;border-radius:18px;background:rgba(24,11,24,.78);text-align:center;max-width:34ch;font-size:15px}
.wxr-prog{width:min(260px,70vw);height:4px;border-radius:4px;background:rgba(249,246,242,.2);overflow:hidden}
.wxr-prog i{display:block;height:100%;width:100%;background:#D9BACB;transform-origin:left;transform:scaleX(0);transition:transform .2s}
.wxr-tools{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;width:100%}
.wxr-tools .wxr-btn{flex:1 1 0;min-width:0;max-width:150px;min-height:56px;font-size:14.5px}
.wxr-scale{font:400 11px/1 "IBM Plex Mono",ui-monospace,monospace;color:#F9F6F2;padding:6px 10px;border-radius:999px;background:rgba(24,11,24,.72)}
.wxr-credit{margin:0;padding:5px 10px;border-radius:10px;background:rgba(24,11,24,.62);font:400 10px/1.35 "IBM Plex Mono",ui-monospace,monospace;color:#F9F6F2;text-align:center;max-width:46ch}
.wxr-tags{position:fixed;inset:0;pointer-events:none;overflow:hidden}
.wxr-tag{position:absolute;left:0;top:0;pointer-events:auto;border:0;padding:7px 11px 8px;border-radius:14px;background:rgba(249,246,242,.95);color:#21121F;text-align:left;
 font:600 13px/1.15 "Instrument Sans",system-ui,sans-serif;max-width:180px;box-shadow:0 6px 18px -8px rgba(0,0,0,.6);visibility:hidden}
.wxr-tag span{display:block;font:400 10.5px/1.25 "IBM Plex Mono",ui-monospace,monospace;color:#756771;margin-top:2px}
.wxr-tag::after{content:"";position:absolute;left:50%;bottom:-6px;width:2px;height:6px;background:rgba(249,246,242,.95);transform:translateX(-50%)}
.wxr-card{position:fixed;left:12px;right:12px;bottom:max(14px,env(safe-area-inset-bottom));padding:18px 18px 16px;border-radius:24px;background:#F9F6F2;color:#33212F;box-shadow:0 18px 40px -18px rgba(0,0,0,.7)}
.wxr-card h3{margin:0 40px 6px 0;font:600 19px/1.2 "Instrument Sans",system-ui,sans-serif;color:#21121F}
.wxr-card p{margin:0;font:400 15px/1.45 "Instrument Sans",system-ui,sans-serif}
.wxr-card small{display:block;margin-top:10px;font:400 10.5px/1.3 "IBM Plex Mono",ui-monospace,monospace;color:#756771}
.wxr-card .wxr-x{position:absolute;top:10px;right:10px;width:40px;height:40px;border:0;border-radius:50%;background:#EDE5EA;color:#33212F;font:500 20px/1 system-ui}
.wxr [hidden]{display:none!important}
`;
function injectCSS() { if (document.getElementById('wxr-css')) return; const s = document.createElement('style'); s.id = 'wxr-css'; s.textContent = CSS; document.head.appendChild(s); }

const ratio = k => (k >= 0.95 && k <= 1.05 ? 'Real size' : k < 1 ? `1:${Math.round(1 / k)}` : `${+k.toFixed(1)}× real size`);

function overlay(info, mode) {
  injectCSS();
  const el = document.createElement('div'); el.className = 'wxr'; el.setAttribute('role', 'application'); el.setAttribute('aria-label', `${info.name} in AR`);
  const chips = info.labels.map((l, i) => `<span class="wxr-chip${i ? ' quiet' : ''}">${esc(l)}</span>`).join('');
  el.innerHTML = `<div class="wxr-tags" aria-hidden="false"></div>
  <div class="wxr-top">
    <div class="wxr-bar"><span class="wxr-brand">assembl <b>ar</b></span><span class="wxr-title">${esc(info.name)}</span><button type="button" class="wxr-btn wxr-done">Done</button></div>
    <div class="wxr-chips">${chips}<span class="wxr-status" hidden></span></div>
    ${info.notice ? `<p class="wxr-sos" role="note"><b>${esc(info.notice.split('.')[0])}.</b>${esc(info.notice.slice(info.notice.indexOf('.') + 1))}</p>` : ''}
  </div>
  <div class="wxr-bottom">
    <p class="wxr-hint" role="status" aria-live="polite"></p>
    <div class="wxr-prog" aria-hidden="true"><i></i></div>
    <span class="wxr-scale" hidden></span>
    <div class="wxr-tools" hidden>
      <button type="button" class="wxr-btn ghost" data-act="move">Move</button>
      <button type="button" class="wxr-btn ghost" data-act="labels" aria-pressed="true">Labels</button>
      ${mode === 'table' ? '<button type="button" class="wxr-btn ghost" data-act="size">Reset size</button>' : ''}
      <button type="button" class="wxr-btn ghost" data-act="sound" aria-pressed="true">Sound</button>
    </div>
    <p class="wxr-credit">${esc(info.credit)}</p>
  </div>
  <div class="wxr-card" role="dialog" aria-modal="false" aria-labelledby="wxr-card-t" hidden><button type="button" class="wxr-x" aria-label="Close">×</button><h3 id="wxr-card-t"></h3><p></p><small></small></div>`;
  return el;
}

export async function startWorldXR({ id, mode = 'table', onEnd = null } = {}) {
  mode = modeOf(mode);
  const info = worldInfo(id); if (!info) throw new Error('No world called ' + id);
  const ui = overlay(info, mode); ui.style.visibility = 'hidden'; document.body.appendChild(ui);
  let session;
  try {
    session = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay', 'local-floor'], domOverlay: { root: ui } });
  } catch (e) { ui.remove(); throw e; }
  ui.style.visibility = '';
  const $ = s => ui.querySelector(s);
  const hint = $('.wxr-hint'), prog = $('.wxr-prog'), progBar = $('.wxr-prog i'), tools = $('.wxr-tools'), scaleEl = $('.wxr-scale'), statusEl = $('.wxr-status'), card = $('.wxr-card'), tagsEl = $('.wxr-tags');
  const setHint = t => { if (hint.textContent !== t) hint.textContent = t; };
  const cue = makeCues(); cue.unlock();
  const reduce = reduceMotion();
  const place = info.kind === 'place' && mode === 'inside';
  const k0 = mode === 'table' ? info.table.scale : info.inside.scale;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local');
  // the twins draw a lot; a slightly smaller camera buffer keeps a mid-range phone near 30 fps
  if (info.kind === 'place') renderer.xr.setFramebufferScaleFactor(0.8);
  renderer.domElement.style.display = 'none'; document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.01, 600);
  await lights(scene, renderer);

  // the placement ring: ivory with a dusty rose edge
  const reticle = new THREE.Group(); reticle.matrixAutoUpdate = false; reticle.visible = false; scene.add(reticle);
  const rmat = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, depthTest: false, toneMapped: false });
  const rr = place ? 0.32 : 0.1;
  reticle.add(new THREE.Mesh(new THREE.RingGeometry(rr * 0.85, rr, 64).rotateX(-Math.PI / 2), rmat(0xf9f6f2)),
    new THREE.Mesh(new THREE.RingGeometry(rr, rr * 1.06, 64).rotateX(-Math.PI / 2), rmat(0xd9bacb)),
    new THREE.Mesh(new THREE.CircleGeometry(rr * 0.12, 24).rotateX(-Math.PI / 2), rmat(0xf9f6f2)));
  if (place) { const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.04).translate(0, 0.002, 0).rotateX(-Math.PI / 2), rmat(0xd9bacb)); reticle.add(door); }

  const holder = new THREE.Group(); holder.visible = false; scene.add(holder);
  let w = null, portal = null, build = null, placed = false, moving = false, wantPlace = false, ended = false, labels = true, scale = 1, hitSource = null, ctrlSource = null;
  const ctx = { renderer, scale: k0, mode, onProgress: (d, t) => { progBar.style.transform = `scaleX(${Math.min(1, d / Math.max(1, t))})`; } };
  setHint(place ? 'Point at the floor and move your phone slowly. The doorway goes where the ring is.' : mode === 'table' ? 'Point at a table or the floor and move your phone slowly.' : 'Point at the floor and move your phone slowly.');

  const ready = (async () => {
    w = await import('./scenes.js').then(m => m.buildWorld(id, ctx));
    if (place) { portal = new Portal(); portal.setWorld(w); holder.add(portal.group); portal.onCross = inside => { cue.cross(); setHint(inside ? 'You’re inside. Walk back through the doorway to leave.' : 'Walk through the doorway to step inside.'); } }
    else { holder.add(w.root); holder.add(contactShadow(w.size, { round: id === 'earth' || id === 'heart' })); }
    w.rescale && w.rescale();
    // tags
    w.tags.forEach(t => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'wxr-tag'; b.innerHTML = '<b></b><span></span>';
      b.querySelector('b').textContent = t.text; b.addEventListener('click', e => { e.stopPropagation(); learn(t); }); b.addEventListener('beforexrselect', e => e.preventDefault());
      tagsEl.appendChild(b); t.el = b;
    });
    prog.hidden = true;
    renderer.compile(scene, camera);
    if (wantPlace) doPlace();
    return w;
  })().catch(e => { setHint('This world couldn’t load here (' + (e.message || e) + '). Tap Done and try again.'); console.error(e); throw e; });

  function learn(t) {
    cue.tap();
    card.querySelector('h3').textContent = t.text; card.querySelector('p').textContent = t.learn || '';
    card.querySelector('small').textContent = info.labels.join(' · ');
    card.hidden = false;
  }
  card.querySelector('.wxr-x').addEventListener('click', e => { e.stopPropagation(); card.hidden = true; });

  const Y = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3(), camPos = new THREE.Vector3();
  function showScale() {
    if (mode !== 'table') { scaleEl.hidden = false; scaleEl.textContent = info.inside.verb === 'Giant' ? `Giant · ${ratio(k0)}` : place ? 'Life size' : 'Real size · locked'; return; }
    holder.scale.setScalar(k0 * scale); scaleEl.hidden = false; scaleEl.textContent = ratio(k0 * scale);
  }
  function doPlace() {
    if (!reticle.visible) { setHint('Move your phone slowly until the ring appears, then tap.'); return; }
    if (!w) { wantPlace = true; setHint('Nearly ready. It will build itself as soon as it has loaded.'); return; }
    wantPlace = false;
    const pos = tmp.setFromMatrixPosition(reticle.matrix);
    camPos.setFromMatrixPosition(renderer.xr.getCamera().matrixWorld);
    holder.position.copy(pos);
    holder.quaternion.setFromAxisAngle(Y, Math.atan2(camPos.x - pos.x, camPos.z - pos.z));
    holder.visible = true;
    if (place) { holder.scale.setScalar(1); portal.setInside(false); }
    else showScale();
    if (!placed) {
      placed = true; cue.place();
      holder.updateMatrixWorld(true);
      if (!reduce) { build = assembler(w.root, w.pieces(), { height: w.size.y * 0.9 + Math.max(w.size.x, w.size.z) * 0.12, duration: 2.6, onLand: (i, n) => cue.land(i, n) }); build.start(); }
      tools.hidden = false;
    } else cue.tap();
    moving = false; reticle.visible = false; showScale();
    setHint(place ? 'Walk through the doorway to step inside.' : mode === 'table' ? 'Drag to turn, pinch to resize. Tap a label to learn more.' : 'Walk round it. Drag to turn it. Tap a label to learn more.');
  }

  // gestures on the overlay: tap places, one finger turns, two fingers pinch (table only) and twist
  const pts = new Map(); let g0 = null, movedP = false, downAt = 0;
  const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const ang = () => { const [a, b] = [...pts.values()]; return Math.atan2(b.y - a.y, b.x - a.x); };
  ui.addEventListener('pointerdown', e => {
    if (e.target.closest('button,.wxr-card')) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { movedP = false; downAt = performance.now(); }
    if (pts.size === 2) { movedP = true; g0 = { d: dist(), a: ang(), s: scale, r: holder.rotation.y }; }
  });
  ui.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x;
    if (pts.size === 1) {
      if (Math.abs(dx) + Math.abs(e.clientY - p.y) > 8) movedP = true;
      if (movedP && placed && !place) holder.rotateY(dx * 0.012);
      p.x = e.clientX; p.y = e.clientY;
    } else if (pts.size === 2 && g0) {
      p.x = e.clientX; p.y = e.clientY;
      if (mode === 'table') { scale = THREE.MathUtils.clamp(g0.s * dist() / Math.max(1, g0.d), 0.25, 4); if (Math.abs(scale - 1) < 0.05) scale = 1; showScale(); }
      if (!place) holder.rotation.y = g0.r - (ang() - g0.a);
    }
  });
  const up = e => {
    if (!pts.has(e.pointerId)) return;
    if (pts.size === 1 && !movedP && performance.now() - downAt < 600) { if (!placed || moving) doPlace(); else if (!card.hidden) card.hidden = true; }
    pts.delete(e.pointerId); if (pts.size < 2) g0 = null;
  };
  ui.addEventListener('pointerup', up); ui.addEventListener('pointercancel', e => { pts.delete(e.pointerId); g0 = null; });
  for (const b of ui.querySelectorAll('button')) b.addEventListener('beforexrselect', e => e.preventDefault());
  $('.wxr-done').addEventListener('click', () => session.end());
  tools.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'move') { moving = true; setHint('Point where you want it, then tap.'); cue.tap(); }
    if (act === 'labels') { labels = !labels; b.setAttribute('aria-pressed', String(labels)); }
    if (act === 'size') { scale = 1; showScale(); cue.tap(); }
    if (act === 'sound') { cue.on = !cue.on; b.setAttribute('aria-pressed', String(cue.on)); }
  });
  // headsets (no DOM overlay): the trigger places, using the controller's own ray
  session.addEventListener('select', () => { if (!session.domOverlayState && (!placed || moving)) doPlace(); });
  session.addEventListener('inputsourceschange', async () => {
    const src = [...session.inputSources].find(s => s.targetRayMode === 'tracked-pointer');
    if (src && !ctrlSource) { try { ctrlSource = await session.requestHitTestSource({ space: src.targetRaySpace }); } catch (e) { /* the gaze ray still works */ } }
  });

  const viewerSpace = await session.requestReferenceSpace('viewer');
  hitSource = await session.requestHitTestSource({ space: viewerSpace });
  await renderer.xr.setSession(session);

  const v = new THREE.Vector3(), camLocal = new THREE.Vector3(), camW = new THREE.Vector3();
  let last = performance.now(), tagT = 0, statusT = 0, fps = 0, frames = 0, fpsT = 0;
  const api = window.__arxr = { session, renderer, scene, holder, get world() { return w; }, get portal() { return portal; }, get placed() { return placed; }, get assembled() { return !!build && build.done || (placed && reduce); },
    get fps() { return fps; }, get calls() { return renderer.info.render.calls; }, ready, place: () => doPlace(), mode, id, reticle };
  renderer.info.autoReset = false;
  renderer.setAnimationLoop((time, frame) => {
    const now = performance.now(), raw = (now - last) / 1000, dt = Math.min(0.1, raw); last = now;
    frames++; fpsT += raw; if (fpsT >= 1) { fps = frames / fpsT; frames = 0; fpsT = 0; }
    if (frame && (!placed || moving)) {
      const ref = renderer.xr.getReferenceSpace();
      const res = (ctrlSource && frame.getHitTestResults(ctrlSource)) || [];
      const hits = res.length ? res : frame.getHitTestResults(hitSource);
      let pose = null;
      for (const h of hits) { const p = h.getPose(ref); if (!p) continue; if (p.transform.matrix[5] > 0.7) { pose = p; break; } if (!pose) pose = p; }
      if (pose) { reticle.visible = true; reticle.matrix.fromArray(pose.transform.matrix); if (!w) setHint('Loading the world…'); else if (!placed || moving) setHint(place ? 'Tap to put the doorway here.' : 'Tap to place it here.'); }
      else reticle.visible = false;
    }
    if (placed && w) {
      if (build && !build.done) build.update(dt), build.done && cue.done();
      else { w.root.updateMatrixWorld(); camW.setFromMatrixPosition(renderer.xr.getCamera().matrixWorld); camLocal.copy(camW); w.root.worldToLocal(camLocal); w.tick(dt, camLocal); }
      if (portal) { camW.setFromMatrixPosition(renderer.xr.getCamera().matrixWorld); portal.update(renderer, camW); }
    }
    renderer.info.reset();
    renderer.render(scene, camera);
    // labels follow their places on screen, a few times a second is plenty for the text
    if (w && placed && (!build || build.done)) {
      const xc = renderer.xr.getCamera(), cam = xc.cameras && xc.cameras[0] ? xc.cameras[0] : xc;
      const showTags = labels && card.hidden && (!place || portal.inside);
      tagT += dt;
      const boxes = [];
      for (const t of w.tags) {
        const el = t.el; if (!el) continue;
        v.copy(typeof t.pos === 'function' ? t.pos() : t.pos); w.root.localToWorld(v);
        const d = v.distanceTo(camW.setFromMatrixPosition(xc.matrixWorld));
        v.project(cam);
        let vis = showTags && v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.9 && (!place || d < 40);
        const x = (v.x + 1) / 2 * innerWidth, y = (1 - v.y) / 2 * innerHeight;
        // labels that would sit on top of one already shown wait until you move closer or round
        if (vis) { const bw = el.offsetWidth || 120, bh = el.offsetHeight || 40, b = { l: x - bw / 2, r: x + bw / 2, t: y - bh - 6, b: y - 6 };
          if (boxes.some(o => b.l < o.r - 6 && b.r > o.l + 6 && b.t < o.b - 4 && b.b > o.t + 4)) vis = false; else boxes.push(b); }
        el.style.visibility = vis ? 'visible' : 'hidden';
        if (vis) el.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px) translate(-50%, calc(-100% - 6px))`;
        if (tagT > 0.4) { const s = el.querySelector('span'); if (s.textContent !== (t.sub || '')) s.textContent = t.sub || ''; }
      }
      if (tagT > 0.4) tagT = 0;
      statusT += dt; if (statusT > 0.5) { statusT = 0; const s = w.status(); statusEl.hidden = !s; if (s && statusEl.textContent !== s) statusEl.textContent = s; }
    }
  });

  return new Promise(resolve => {
    session.addEventListener('end', () => {
      if (ended) return; ended = true;
      renderer.setAnimationLoop(null);
      try { hitSource && hitSource.cancel(); ctrlSource && ctrlSource.cancel(); } catch (e) { /* already gone */ }
      renderer.dispose(); renderer.domElement.remove(); ui.remove();
      if (window.__arxr === api) window.__arxr = null;
      onEnd && onEnd(); resolve();
    });
  });
}
