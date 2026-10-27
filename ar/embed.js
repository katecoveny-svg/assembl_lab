/* assembl AR embed: a "View in your space" button for any page, including the study machines.
 *
 *   <script type="module">
 *     import assemblAR from '/ar/embed.js';
 *
 *     // A library model. Shareable: on a computer the code opens the AR viewer with these settings.
 *     assemblAR.button(document.querySelector('#ar'), {
 *       model: 'lib:bike', params: { wheelbase: 140, frame: '#492B3E' }, scale: 'real', label: 'Put it on your desk' });
 *
 *     // Your own three.js content (a study machine). A snapshot is made when the button is tapped and exported
 *     // to USDZ or GLB on the fly. On a computer the code opens this page with #ar on the phone.
 *     const ar = assemblAR.button(slot, { object: () => S.scene, unitsPerMetre: 1, scale: 'table', title: 'Gene pool' });
 *     if (location.hash === '#ar') ar.prompt();   // can't open AR by itself: phones need a tap
 *   </script>
 *
 * Needs an import map for "three" (every 3D lab page has one, and study/kit.js adds it).
 *
 * button(host, options) appends the button to host and returns a controller.
 *   model         'lib:bike' | 'lib:hatch' | 'lib:sedan' | 'lib:suv' | 'lib:ute' | 'lib:van' (also 'lib:car-ute'),
 *                 or a share hash such as 'k=text&t=kia+ora'. Library ids keep codes short and shareable.
 *   params        library settings. Bike: {wheelbase, wheelDiameter, suspension, frame, accent, base}. Cars: {paint}.
 *   object        an Object3D, or a function returning one (or a Promise of one). Used when there's no model.
 *   unitsPerMetre how many of your scene units make one metre (default 1).
 *   scale         'real' (true size) | 'table' (fits 30–45 cm across, the default for objects) | a number.
 *                 Library: 'real' or 'table' (cars 1:18, bike 1:10 display model).
 *   label         button text (default 'View in your space'). title: the name shown in AR and on the code.
 *   maxTriangles  snapshot budget (default 150000). Over it, segment counts drop first, then the smallest
 *                 instanced items, then rounded boxes become boxes, then the smallest parts; see the report.
 *                 The budget also tightens to keep the USDZ near 14 MB (three's exporter writes text USDA).
 *
 * The snapshot deep-copies what it needs and never changes your scene. It bakes world transforms and every
 * InstancedMesh instance (matrix and colour) into plain meshes; skips lights, cameras, Points, Sprites, lines,
 * ShaderMaterials, shadow catchers, invisible or fully transparent things, helpers and HTML labels (and anything
 * with userData.arSkip = true); turns every material into MeshStandardMaterial (colour, map, roughness,
 * metalness, opacity, emissive); copies canvas, video and 8-bit data textures as they are at that moment; then sits
 * the result on y = 0, centred, in metres.
 *   camera        optional camera (or () => camera). Only what it can see goes into the snapshot: useful when a
 *                 scene lays several stations side by side and the camera flies between them.
 *   mount         'floor' (default) | 'wall'.
 *   qr            true (default) | false | a URL. What the code on a computer opens.
 *   style         code style: 'assembly' (default) | 'dots' | 'glass' | 'square'.
 *   key           optional () => string that changes when the model changes. Without it a fingerprint of the
 *                 scene decides whether the last snapshot (and its files) can be reused.
 *   variant       'dark' (plum, default) | 'light'.   note: true shows a one-line device note under the button.
 *   onReport      (report) => {} after each snapshot: triangles before and after, size in metres, what was
 *                 skipped, simplified or dropped.
 * Controller: { el, button, open(), prompt(), refresh(), files('glb' | 'usdz') → Promise<Blob>, report, destroy() }
 *   open() must run inside a user's tap (Quick Look and WebXR both insist). prompt() scrolls to the button and
 *   points at it.
 *
 * Also exported: support(), snapshot(object, options) → {group, report}, exportGLB(group), exportUSDZ(group, {mount}),
 * qrSVG(url, {style, size}), libraryHash(model, params, scale).
 *
 * What happens on each device: iPhone and iPad get AR Quick Look (USDZ); Android Chrome gets WebXR with hit-test;
 * Android without WebXR gets Scene Viewer for library cars; computers get the code in a small popover.
 */
import { injectCSS, AR_ICON, esc } from './js/ui.js';

let mods = null;
const load = () => (mods ||= Promise.all([import('./js/place.js'), import('./js/prepare.js'), import('./js/exporters.js'),
  import('./js/qr.js'), import('./js/ar.js'), import('./js/codec.js'), import('./js/builders.js')])
  .then(([place, prepare, exporters, qr, ar, codec, builders]) => ({ place, prepare, exporters, qr, ar, codec, builders })));

const CAR_IDS = ['hatch', 'sedan', 'suv', 'ute', 'van'];
// 'lib:bike' + params → a share hash the viewer understands
export function libraryHash(model, params = {}, scale) {
  const m = String(model || '').replace(/^lib:/, '').replace(/^car-/, '');
  const p = new URLSearchParams();
  if (m === 'bike') {
    p.set('k', 'bike');
    const hex = v => String(v || '').replace('#', '');
    if (params.wheelbase != null) p.set('wb', params.wheelbase);
    if (params.wheelDiameter != null) p.set('wd', params.wheelDiameter);
    if (params.suspension != null) p.set('su', params.suspension);
    if (params.frame) p.set('fr', hex(params.frame));
    if (params.accent) p.set('ac', hex(params.accent));
    if (params.base != null) p.set('b', params.base ? 1 : 0);
    p.set('s', scale === 'real' ? 'real' : 'model');
    return p.toString();
  }
  if (CAR_IDS.includes(m)) {
    p.set('k', 'car'); p.set('m', m); p.set('s', scale === 'real' ? 'real' : 'table');
    if (params.paint) p.set('p', params.paint);
    return p.toString();
  }
  if (/(^|&)k=/.test(String(model))) return String(model).replace(/^#/, '');
  throw new Error('assembl AR: unknown model ' + model);
}

export async function support() { const { ar } = await load(); return ar.support(); }
export async function snapshot(object, options) { const { prepare } = await load(); return prepare.snapshot(object, options); }
export async function exportGLB(group) { const { exporters } = await load(); return exporters.exportGLB(group); }
export async function exportUSDZ(group, o) { const { exporters } = await load(); return exporters.exportUSDZ(group, o); }
export async function qrSVG(url, o = {}) { const { qr } = await load(); return qr.qrSVG(url, { size: 280, centre: { kind: 'cube' }, ...o }); }

export function button(host, options = {}) {
  injectCSS();
  const o = { label: 'View in your space', maxTriangles: 150000, unitsPerMetre: 1, mount: 'floor', qr: true, style: 'assembly', variant: 'dark', ...options };
  const isLib = !!o.model;
  if (!isLib && !o.object) throw new Error('assembl AR: pass a model or an object');
  if (o.scale == null) o.scale = 'table';

  const wrap = document.createElement('div'); wrap.className = 'aar-wrap';
  const btn = document.createElement('button'); btn.type = 'button';
  btn.className = 'aar-btn' + (o.variant === 'light' ? ' aar-light' : '');
  btn.innerHTML = `${AR_ICON}<span class="aar-lbl"></span><span class="aar-bar"></span>`;
  const lbl = btn.querySelector('.aar-lbl'), bar = btn.querySelector('.aar-bar');
  lbl.textContent = o.label;
  wrap.appendChild(btn);
  let note = null;
  if (o.note) { note = document.createElement('p'); note.className = 'aar-note'; wrap.appendChild(note); }
  host.appendChild(wrap);

  let placer = null, current = null, lib = null, report = null, pop = null, busy = false;
  const libHash = isLib ? libraryHash(o.model, o.params, o.scale) : null;
  const qrTarget = () => {
    if (o.qr === false) return null;
    if (typeof o.qr === 'string') return o.qr;
    if (isLib) return null; // filled in once the codec is loaded
    const u = new URL(location.href); u.hash = 'ar'; return u.href;
  };

  const setBusy = (label, frac) => {
    busy = !!label; btn.disabled = busy;
    lbl.textContent = label || o.label; bar.style.width = label ? Math.round((frac || 0) * 100) + '%' : '0';
  };

  async function ready() {
    const m = await load();
    if (!placer) {
      placer = m.place.createPlacer({
        source: () => current,
        onState: (state, info) => {
          if (state === 'busy') setBusy(info.label, info.step / info.of);
          else setBusy(null);
          if (state === 'error') showPop(null, info.message);
        },
        onNoAR: info => showPop(info.qrURL, info.mode === 'sceneviewer'
          ? 'This browser can’t do web AR. Scan the code from another phone, or open this page in Chrome.' : null)
      });
      placer.ready.then(s => { if (note) note.textContent = m.ar.deviceSentence(s.mode); });
    }
    return m;
  }
  // build or snapshot the subject for this tap
  async function prepare(m) {
    if (isLib) {
      if (!lib) {
        const { spec } = m.codec.decodeHash(libHash);
        if (!spec) throw new Error('That library model link is not valid.');
        lib = await m.builders.buildFromSpec(spec);
        lib.url = m.codec.VIEWER.href + '#' + m.codec.encodeHash(spec);
      }
      current = { key: 'lib:' + libHash, object: lib.object, title: o.title || lib.title, mount: lib.mount, fixedScale: lib.fixedScale,
        sceneViewer: lib.sceneViewer || null, qrURL: o.qr === false ? null : typeof o.qr === 'string' ? o.qr : lib.url,
        snapshotOptions: { unitsPerMetre: 1, scale: 'real', maxTriangles: o.maxTriangles } };
      return;
    }
    const obj = typeof o.object === 'function' ? await o.object() : o.object;
    if (!obj || !obj.isObject3D) throw new Error('assembl AR: the object option did not give a three.js Object3D');
    const cam = typeof o.camera === 'function' ? o.camera() : o.camera;
    const key = (o.key ? 'k:' + o.key() : 'f:' + m.prepare.fingerprint(obj)) + (cam ? ':' + cam.matrixWorld.elements.map(v => v.toFixed(2)).join(',') : '');
    current = { key, object: obj, title: o.title || document.title, mount: o.mount, fixedScale: o.scale === 'real',
      sceneViewer: null, qrURL: qrTarget(), snapshotOptions: { unitsPerMetre: o.unitsPerMetre, scale: o.scale, maxTriangles: o.maxTriangles, view: cam || null } };
  }
  async function activate() {
    if (busy) return;
    try {
      const m = await ready();
      await prepare(m);
      await placer.activate();
      const r = placer.report();
      if (r && r !== report) { report = r; o.onReport && o.onReport(r); }
    } catch (e) {
      setBusy(null);
      showPop(null, e.message || String(e));
    }
  }
  btn.addEventListener('click', activate);

  // ---------------------------------------------------------------- the code popover (computers)
  function closePop() {
    if (!pop) return;
    pop.remove(); pop = null;
    document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onOutside, true);
    btn.focus();
  }
  const onKey = e => { if (e.key === 'Escape') closePop(); };
  const onOutside = e => { if (pop && !wrap.contains(e.target)) closePop(); };
  async function showPop(url, message) {
    closePop();
    pop = document.createElement('div'); pop.className = 'aar-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Scan to place it in your space');
    let html = `<button type="button" class="aar-x" aria-label="Close">×</button>`;
    if (url) {
      const { qr } = await load();
      html += qr.qrSVG(url, { size: 264, style: o.style, centre: { kind: 'cube' } }).replace('<svg ', '<svg class="aar-qr" ');
      html += `<h3>Scan to place it in your space</h3><p>${message ? esc(message) : isLib ? 'Point your phone’s camera here. It opens the assembl AR viewer.' : 'Point your phone’s camera here. It opens this page; tap “' + esc(o.label) + '” there.'}</p>`;
      if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) html += `<span class="aar-mono">This code points at ${esc(location.host)}, which a phone can’t reach.</span>`;
    } else {
      html += `<h3>Not on this device</h3><p>${esc(message || 'This device can’t place 3D in a room.')}</p>`;
    }
    pop.innerHTML = html;
    wrap.appendChild(pop);
    const r = pop.getBoundingClientRect();
    if (r.right > innerWidth - 12) pop.style.left = Math.min(0, innerWidth - 12 - r.right) + 'px';
    pop.querySelector('.aar-x').addEventListener('click', closePop);
    pop.querySelector('.aar-x').focus();
    document.addEventListener('keydown', onKey); setTimeout(() => document.addEventListener('pointerdown', onOutside, true), 0);
  }

  // warm the modules (and the USDZ for a library model on iPhone) when the browser is idle
  const idle = window.requestIdleCallback || (f => setTimeout(f, 800));
  idle(async () => {
    try {
      const m = await ready();
      if (isLib) { await prepare(m); if ((await placer.ready).mode === 'quicklook') placer.prefetch(); }
    } catch (e) { /* made on tap instead */ }
  });

  return {
    el: wrap, button: btn,
    open: activate,
    prompt() {
      wrap.scrollIntoView({ behavior: 'smooth', block: 'center' }); btn.focus({ preventScroll: true });
      btn.animate && btn.animate([{ boxShadow: '0 0 0 0 rgba(145,106,112,.7)' }, { boxShadow: '0 0 0 12px rgba(145,106,112,0)' }], { duration: 1100, iterations: 2 });
    },
    refresh() { if (placer) placer.invalidate(); lib = null; },
    async files(which = 'glb') { const m = await ready(); await prepare(m); const { blob, report: r } = await placer.files(which); report = r; o.onReport && o.onReport(r); return blob; },
    get report() { return report; },
    destroy() { closePop(); wrap.remove(); }
  };
}

const assemblAR = { button, support, snapshot, exportGLB, exportUSDZ, qrSVG, libraryHash };
export default assemblAR;
