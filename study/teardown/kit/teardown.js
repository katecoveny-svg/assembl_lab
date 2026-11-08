/* teardown.js: the assembl study teardown kit.
   One machine, one page. One input, the phase of the machine's cycle, drives a pure model (model.js, no three.js);
   the model's state poses every part and redraws every panel on every frame, so nothing on screen can disagree with
   the motion. Around the machine: the title and one live number, readouts, a schematic, live charts with a cursor
   that moves with the part, one row of subsystem buttons (isolate, cut open, explode), camera views, callouts with
   thin leaders into the parts, and an assemble / take-apart timeline, the assembl signature.

   Ideas adapted from elvarofficial/teardown (MIT licence): start from a reference, one source for every number,
   the console laid out around the machine, review by frames. This file is written for assembl; no code is copied.

   Usage (see tools/study-teardown/README.md):
     import {createTeardown} from '/study/teardown/kit/teardown.js';
     createTeardown({id, title, model, build, live, readouts, charts, schematic, callouts, subsystems, views, ...});
*/
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

/** The assembl study palette. Parts use these; no violet, no glow colours. */
export const COLOURS = {
  ivory: '#F9F6F2', blush: '#F1EAE9', paleRose: '#EADCDF', roseMauve: '#D4B6C7', rose: '#D9BACB',
  roseInk: '#7E5570', mauve: '#756771', mist: '#B8A8B2', ink: '#33212F', plum: '#21121F', aubergine: '#180B18',
};
const MODES = {
  light: {ground: COLOURS.ivory, edge: COLOURS.ink, edgeA: 0.5, shadowA: 0.16},
  night: {ground: COLOURS.aubergine, edge: COLOURS.rose, edgeA: 0.34, shadowA: 0.4},
};
const ACCENT = new THREE.Color(COLOURS.roseInk);

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // state to state
const easeOut = (t) => 1 - Math.pow(1 - t, 3); // entrances
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
/** NZ-English number format; '–' for anything that is not a finite number. */
export const fmt = (x, d = 0) => {
  if (!Number.isFinite(x)) return '–';
  const v = Math.round(x * 10 ** d) / 10 ** d;
  return (v === 0 ? 0 : v).toLocaleString('en-NZ', {minimumFractionDigits: d, maximumFractionDigits: d});
};

// The flat "assembled a": shoulder, stem, bowl and a rose dot. Thicker strokes below 24 px, per the brand guidelines.
const MARK = `<svg viewBox="0 0 200 200" aria-hidden="true"><path d="M66 82 C72 56 132 52 132 84" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round"/><line x1="132" y1="76" x2="132" y2="160" stroke="currentColor" stroke-width="18" stroke-linecap="round"/><path d="M132 112 C132 90 64 90 64 128 C64 166 132 166 132 136" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round"/><circle cx="160" cy="160" r="14" fill="var(--accent)"/></svg>`;

const chip = (t) => (t ? `<span class="tdk-chip" title="${esc(t.note || '')}" tabindex="0">${esc(t.label)}</span>` : '');

/** Camera position from an orbit description: azimuth and elevation in degrees, distance, target. */
function orbitPos(v) {
  const az = ((v.az ?? 30) * Math.PI) / 180;
  const el = ((v.el ?? 15) * Math.PI) / 180;
  const d = v.dist ?? 60;
  const t = v.target ?? [0, 0, 0];
  return {
    pos: new THREE.Vector3(t[0] + d * Math.cos(el) * Math.sin(az), t[1] + d * Math.sin(el), t[2] + d * Math.cos(el) * Math.cos(az)),
    target: new THREE.Vector3(...t),
  };
}

// ------------------------------------------------------------------------------------------------ charts (SVG)
const CW = 288;
const CH = 150;
const PAD = {l: 34, r: 8, t: 14, b: 22};
const niceRange = (vals, lo, hi) => {
  let a = lo ?? Math.min(...vals);
  let b = hi ?? Math.max(...vals);
  if (lo === undefined || hi === undefined) {
    const pad = (b - a || 1) * 0.06;
    if (lo === undefined) a -= pad;
    if (hi === undefined) b += pad;
  }
  return [a, b];
};
const tick = (v) => (Math.abs(v) >= 100 ? fmt(v, 0) : Math.abs(v) >= 10 ? fmt(v, 0) : fmt(v, 1));

function chartShell(c) {
  const key = (c.series || [])
    .map((s, i) => `<span><i style="background:var(${['--ink', '--accent', '--mute'][i % 3]})"></i>${esc(s.label)}</span>`)
    .join('');
  return `<section class="tdk-pn tdk-chart" data-chart="${esc(c.id)}" aria-label="${esc(c.title)}">
    <h3><span>${esc(c.title)}</span>${chip(c.truth)}</h3>
    <p class="tdk-pn-sub"><span class="val" data-live="chart-${esc(c.id)}">–</span></p>
    <svg viewBox="0 0 ${CW} ${CH}" role="img" aria-label="${esc(c.title)} chart, redrawn from the model"></svg>
    ${key && c.kind === 'sweep' ? `<div class="key">${key}</div>` : ''}
    ${c.note ? `<p class="tdk-pn-sub">${esc(c.note)}</p>` : ''}
    <p class="tdk-pn-sub" data-foot></p>
  </section>`;
}

// ------------------------------------------------------------------------------------------------ the kit
export async function createTeardown(cfg) {
  const host = document.getElementById(cfg.mount || 'app');
  const q = new URLSearchParams(location.search);
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = reduceMQ.matches || q.has('still');
  const capture = q.has('capture');
  const M = cfg.model;
  const period = M.period;
  const inputs = {};
  (M.inputs || []).forEach((i) => (inputs[i.key] = i.value));
  (M.toggles || []).forEach((t) => (inputs[t.key] = t.value));

  let phase = cfg.start ?? 0;
  let playing = false;
  let cycleSeconds = cfg.cycleSeconds || 6;
  const SPEEDS = cfg.speeds || [cycleSeconds * 2, cycleSeconds, cycleSeconds / 2];
  let mode = q.get('mode') === 'light' ? 'light' : 'night';
  let selected = 'all';
  const act = {isolate: false, cut: !!cfg.cutOnStart, explode: false};
  let labelsOn = !(q.has('nolabels'));
  let state = M.at(phase, inputs);

  // ---------------------------------------------------------------- DOM
  const subs = [{key: 'all', label: 'Whole machine'}, ...(cfg.subsystems || [])];
  const views = cfg.views || {hero: {az: 30, el: 15, dist: 60}};
  const viewKeys = Object.keys(views).filter((k) => !views[k].hidden);
  const el = document.createElement('div');
  el.className = 'tdk';
  el.dataset.mode = mode;
  el.innerHTML = `
  <div class="tdk-console">
    <div class="tdk-col">
      <section class="tdk-pn tdk-title" aria-label="${esc(cfg.title)}">
        <h1>${esc(cfg.title)}</h1>
        <p class="tdk-sub">${esc(cfg.subtitle || '')}</p>
        <div class="tdk-live"><span class="tdk-live-n" data-live="live">–</span><span class="tdk-live-u">${esc(cfg.live?.unit || '')}</span></div>
        <div class="tdk-live-l">${esc(cfg.live?.label || '')}</div>
        <div class="tdk-live-s"><b data-live="live-a" style="font-weight:400"></b><span data-live="live-b"></span></div>
        <div class="tdk-chips">${(cfg.truth || []).map(chip).join('')}</div>
        ${cfg.level ? `<div class="tdk-level">${esc(cfg.level)}</div>` : ''}
      </section>
      <section class="tdk-pn tdk-readp" aria-label="Readouts">
        <h2><span>From the model</span>${chip(cfg.readoutsTruth)}</h2>
        <div class="tdk-read">${(cfg.readouts || [])
          .map((r, i) => `<div><span>${esc(r.label)}</span><b data-live="r${i}">–</b></div>`)
          .join('')}</div>
      </section>
      ${cfg.schematic ? `<section class="tdk-pn tdk-schem" aria-label="${esc(cfg.schematic.title)}">
        <h2><span>${esc(cfg.schematic.title)}</span>${chip(cfg.schematic.truth)}</h2>
        <svg viewBox="0 0 268 ${cfg.schematic.height || 150}" role="img" aria-label="${esc(cfg.schematic.title)}, redrawn from the model" data-schem></svg>
        ${cfg.schematic.formula ? `<p class="formula">${cfg.schematic.formula}</p>` : ''}
      </section>` : ''}
      ${(M.inputs || []).length || (M.toggles || []).length ? `<section class="tdk-pn tdk-inp" aria-label="Investigate">
        <h2><span>Change one thing</span>${chip(cfg.inputsTruth)}</h2>
        <div class="tdk-inputs">
          ${(M.inputs || []).map((i) => `<div class="tdk-in"><label for="tdk-in-${i.key}"><span>${esc(i.label)}</span><output data-out="${i.key}"></output></label>
            <input id="tdk-in-${i.key}" type="range" min="${i.min}" max="${i.max}" step="${i.step}" value="${i.value}" data-in="${i.key}">
            ${i.note ? `<p>${esc(i.note)}</p>` : ''}</div>`).join('')}
          ${(M.toggles || []).map((t) => `<div class="tdk-tog"><span>${esc(t.label)}</span><button class="tdk-btn" type="button" data-tog="${t.key}" aria-pressed="${!!t.value}">${t.value ? esc(t.on || 'On') : esc(t.off || 'Off')}</button></div>
            ${t.note ? `<p class="tdk-pn-sub" style="margin:0">${esc(t.note)}</p>` : ''}`).join('')}
        </div>
      </section>` : ''}
    </div>
    <div class="tdk-centre">
      <div class="tdk-stage">
        <canvas tabindex="0" aria-label="${esc(cfg.canvasLabel || cfg.title + ' in 3D')}. Arrow keys turn the view, plus and minus zoom, Home resets."></canvas>
        <div class="tdk-stage-meta">
        <div class="tdk-legend" aria-hidden="true">${(cfg.legend?.items || []).map((it) => `<span data-leg="${esc(it.key)}"><i style="background:${it.colour}"></i>${esc(it.label)}</span>`).join('')}</div>
        <div class="tdk-status" data-live="status"></div>
        </div>
        <div class="tdk-calls${labelsOn ? '' : ' off'}" aria-hidden="true"><svg></svg></div>
        <div class="tdk-hint">Drag to turn · scroll to zoom · keys: space, ← →, 1–${Math.min(9, viewKeys.length)}</div>
        <div class="tdk-mark">${MARK}<span>assembl<em>.</em> study</span></div>
        <div class="tdk-fallback"><svg viewBox="0 0 268 ${cfg.schematic?.height || 150}" data-schem-big></svg><p>3D could not start on this device, so the drawing shows the same model. Every number still comes from it.</p></div>
      </div>
      <div class="tdk-pn tdk-dock" role="group" aria-label="Machine controls">
        <div class="tdk-row"><span class="tdk-k">Run</span>
          <button class="tdk-btn primary" type="button" data-act="play" aria-pressed="false">Play</button>
          <button class="tdk-btn" type="button" data-act="back" aria-label="Step back">−${cfg.step || 10}${esc(M.unit || '')}</button>
          <button class="tdk-btn" type="button" data-act="fwd" aria-label="Step forward">+${cfg.step || 10}${esc(M.unit || '')}</button>
          <span class="tdk-sep"></span>
          ${SPEEDS.map((s, i) => `<button class="tdk-btn" type="button" data-speed="${s}" aria-pressed="${s === cycleSeconds}">${['Slow', 'Steady', 'Brisk'][i] || s + ' s'}</button>`).join('')}
        </div>
        <div class="tdk-row"><span class="tdk-k">Assemble</span>
          <button class="tdk-btn" type="button" data-act="asm">Take apart</button>
          <label class="tdk-range"><span class="vh">Assembly</span><input type="range" min="0" max="100" step="1" value="100" data-asm aria-label="Assembly, from apart to put together"><output data-live="asm">100%</output></label>
        </div>
        <div class="tdk-row" role="group" aria-label="Subsystem"><span class="tdk-k">Part</span>
          ${subs.map((s) => `<button class="tdk-btn" type="button" data-sub="${esc(s.key)}" aria-pressed="${s.key === 'all'}" title="${esc(s.note || '')}">${esc(s.label)}</button>`).join('')}
        </div>
        <div class="tdk-row"><span class="tdk-k">Open it up</span>
          <button class="tdk-btn" type="button" data-tgl="isolate" aria-pressed="false">Isolate</button>
          <button class="tdk-btn" type="button" data-tgl="cut" aria-pressed="${act.cut}">Cut open</button>
          <button class="tdk-btn" type="button" data-tgl="explode" aria-pressed="false">Explode</button>
          <span class="tdk-sep"></span>
          <button class="tdk-btn" type="button" data-act="labels" aria-pressed="${labelsOn}">Labels</button>
          <button class="tdk-btn" type="button" data-act="night" aria-pressed="${mode === 'night'}">Night</button>
        </div>
        <div class="tdk-row" role="group" aria-label="Camera"><span class="tdk-k">View</span>
          ${viewKeys.map((k, i) => `<button class="tdk-btn" type="button" data-view="${esc(k)}" aria-pressed="${i === 0}">${esc(views[k].label || k)}</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="tdk-col">${(cfg.charts || []).map(chartShell).join('')}</div>
  </div>
  <div class="tdk-below">
    ${cfg.learn ? `<section class="tdk-pn tdk-learn" aria-label="Learn"><h2><span>Explore, predict, investigate, explain</span></h2><ol>
      ${cfg.learn.map((l, i) => `<li><b>${esc(l.step)}</b><p>${esc(l.text)}</p>${l.show ? `<button class="tdk-btn" type="button" data-learn="${i}">${esc(l.button || 'Show me')}</button>` : ''}</li>`).join('')}
    </ol></section>` : ''}
    <section class="tdk-pn tdk-src" aria-label="Sources and labels">
      <h2><span>Sources</span><span class="tdk-pn-sub" style="margin:0">checked ${esc(cfg.checked || '')}</span></h2>
      <ul>${(cfg.sources || []).map((s) => `<li>${s.href ? `<a href="${esc(s.href)}" rel="noopener" target="_blank">${esc(s.label)}</a>` : esc(s.label)}${s.note ? `<span>${esc(s.note)}</span>` : ''}</li>`).join('')}</ul>
      <div class="tdk-checks" data-checks></div>
      <div class="tdk-keys"><kbd>Space</kbd> play or pause · <kbd>←</kbd> <kbd>→</kbd> step · <kbd>1</kbd>–<kbd>${Math.min(9, viewKeys.length)}</kbd> views ·
        <kbd>A</kbd> assemble · <kbd>I</kbd> isolate · <kbd>C</kbd> cut · <kbd>X</kbd> explode · <kbd>[</kbd> <kbd>]</kbd> part · <kbd>L</kbd> labels · <kbd>N</kbd> night</div>
    </section>
  </div>
  <p class="vh" aria-live="polite" data-say></p>`;
  host.replaceChildren(el);
  const $ = (s) => el.querySelector(s);
  const $$ = (s) => [...el.querySelectorAll(s)];
  // the lab's nav bar is injected by /lab/navigation.js, maybe after this runs: measure it whenever it can change
  const setTop = () => {
    const nav = document.getElementById('al-nav');
    el.style.setProperty('--tdk-top', (nav ? nav.getBoundingClientRect().height : 0) + 'px');
  };
  setTop();
  [100, 600, 1500].forEach((ms) => setTimeout(setTop, ms));
  addEventListener('resize', setTop);

  const stage = $('.tdk-stage');
  const canvas = stage.querySelector('canvas');
  const live = Object.fromEntries($$('[data-live]').map((n) => [n.dataset.live, n]));
  const lastText = {};
  const put = (k, v) => {
    if (lastText[k] !== v && live[k]) {
      live[k].textContent = v;
      lastText[k] = v;
    }
  };

  // ---------------------------------------------------------------- three.js scene
  let renderer = null;
  let ok3d = true;
  try {
    renderer = new THREE.WebGLRenderer({canvas, antialias: q.get('quality') !== 'low', alpha: false, powerPreference: 'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q.get('quality') === 'low' ? 1 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.localClippingEnabled = true;
  } catch (e) {
    ok3d = false;
    stage.classList.add('no3d');
    console.warn('teardown: WebGL unavailable, showing the drawing', e);
  }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(MODES[mode].ground);
  const camera = new THREE.PerspectiveCamera(cfg.fov || 30, 1, 0.5, 4000);
  scene.add(new THREE.HemisphereLight(0xffffff, new THREE.Color(COLOURS.rose), 1.5));
  const key = new THREE.DirectionalLight(0xfff6ee, 1.9);
  key.position.set(28, 46, 34);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.55);
  fill.position.set(-30, 12, -18);
  scene.add(fill);
  const root = new THREE.Group();
  scene.add(root);

  // a soft contact shadow under the machine (cheaper and calmer than shadow maps)
  const sc = document.createElement('canvas');
  sc.width = sc.height = 128;
  const g2 = sc.getContext('2d');
  const grd = g2.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,1)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g2.fillStyle = grd;
  g2.fillRect(0, 0, 128, 128);
  const shadowMat = new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(sc), color: COLOURS.ink, transparent: true, opacity: MODES[mode].shadowA, depthWrite: false});
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  const cutPlane = new THREE.Plane(new THREE.Vector3(...(cfg.cutNormal || [0, 0, -1])), cfg.cutConstant || 0);
  const parts = [];
  const anchors = {};
  const edgeMats = new Set();

  /** The builder's toolbox. */
  const kit = {
    THREE, scene, root, COLOURS, inputs,
    /** A matte study-model material in one of the palette colours. */
    mat(colour, o = {}) {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(colour), roughness: o.rough ?? 0.78, metalness: o.metal ?? 0,
        transparent: o.opacity !== undefined, opacity: o.opacity ?? 1, side: THREE.DoubleSide, depthWrite: o.opacity === undefined || o.opacity > 0.9,
      });
    },
    /**
     * Register a part. `obj` is what pose() moves; the kit wraps it in a group it moves for assembly and explode.
     * opts: {sub: subsystem key, explode: [x,y,z] (the direction and distance it flies out), order (assembly order),
     *        cut: 'all' (cut open with the whole machine) | true (cut when its subsystem is picked) | false,
     *        edges: false (no ink outline), edgeAngle, hideApart: true (only shown when assembled)}
     */
    part(name, obj, o = {}) {
      const wrap = new THREE.Group();
      wrap.name = 'part:' + name;
      wrap.add(obj);
      root.add(wrap);
      const mats = [];
      const edges = [];
      obj.traverse((m) => {
        if (!m.isMesh) return;
        m.material = m.material.clone();
        m.material.userData.base = m.material.color.clone();
        m.material.userData.opacity = m.material.opacity;
        mats.push(m.material);
        if (o.edges !== false) {
          const em = new THREE.LineBasicMaterial({color: MODES[mode].edge, transparent: true, opacity: MODES[mode].edgeA * (o.edgeOpacity ?? 1)});
          em.userData.k = o.edgeOpacity ?? 1;
          edgeMats.add(em);
          const ln = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, o.edgeAngle ?? 28), em);
          ln.raycast = () => {};
          m.add(ln);
          edges.push(em);
        }
      });
      parts.push({
        name, wrap, obj, mats, edges, sub: o.sub || 'other', order: o.order ?? parts.length,
        explode: new THREE.Vector3(...(o.explode || [0, 0, 0])), cut: o.cut ?? false, hideApart: !!o.hideApart,
        ghost: 1, hot: false, tint: null,
      });
      return obj;
    },
    /** An invisible point on a part that a callout's leader points at. */
    anchor(name, parent, at = [0, 0, 0]) {
      const a = new THREE.Object3D();
      a.position.set(...at);
      parent.add(a);
      anchors[name] = a;
      return a;
    },
    /** Mark a part as the one doing the work right now: it takes the one accent colour. */
    hot(name, on = true) {
      const p = parts.find((x) => x.name === name);
      if (p) p.hot = !!on;
    },
    /** Tint a part with a palette colour (or null to restore its own), e.g. the charge as it burns. */
    tint(name, colour) {
      const p = parts.find((x) => x.name === name);
      if (p) p.tint = colour ? new THREE.Color(colour) : null;
    },
  };

  const machine = (await cfg.build(kit)) || {};
  const ordered = [...new Set(parts.map((p) => p.order))].sort((a, b) => a - b);
  const N = ordered.length;
  const bounds = new THREE.Box3().setFromObject(root);
  const ground = cfg.groundY ?? bounds.min.y;
  shadow.position.set((bounds.min.x + bounds.max.x) / 2, ground + 0.01, (bounds.min.z + bounds.max.z) / 2);
  const span = Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z);
  shadow.scale.set(span * 1.9, span * 1.5, 1);

  let controls = null;
  if (ok3d) {
    controls = new OrbitControls(camera, canvas);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.minDistance = cfg.minDist || 12;
    controls.maxDistance = cfg.maxDist || 400;
    controls.addEventListener('start', () => (camTween = null));
  }

  // ---------------------------------------------------------------- state that animates between settings
  let asm = 1; // 0 = all apart, 1 = put together
  let asmTarget = 1;
  let explodeAmt = 0;
  let camTween = null;
  let frozen = false;
  let viewKey = viewKeys[0];
  const ASM_SECONDS = cfg.assembleSeconds || 3.2;
  const localAsm = (p) => {
    const k = ordered.indexOf(p.order);
    const w = 2 / (N + 2);
    const s = k / (N + 2);
    return clamp((asm - s) / w, 0, 1);
  };
  const inSel = (p) => selected === 'all' || p.sub === selected;
  const cutOn = (p) => act.cut && (selected === 'all' ? p.cut === 'all' : p.sub === selected && p.cut !== false);

  function aspectDist(v) {
    const a = camera.aspect || 1;
    return {...v, dist: (v.dist ?? 60) * (a < 0.62 ? Math.min(1.35, 0.62 / a) : 1)};
  }
  function setView(k, instant = reduce) {
    const v = views[k];
    if (!v) return;
    viewKey = k;
    $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === k)));
    const to = orbitPos(aspectDist(v));
    if (instant || !controls) {
      camera.position.copy(to.pos);
      if (controls) controls.target.copy(to.target);
      else camera.lookAt(to.target);
      camTween = null;
    } else {
      camTween = {t: 0, d: 0.9, fp: camera.position.clone(), ft: controls.target.clone(), tp: to.pos, tt: to.target};
    }
  }

  // ---------------------------------------------------------------- charts: sample the model over one period
  const charts = (cfg.charts || []).map((c) => ({c, node: el.querySelector(`[data-chart="${CSS.escape(c.id)}"]`)}));
  let samples = [];
  const SAMPLES = cfg.samples || 361;
  function resample() {
    samples = Array.from({length: SAMPLES}, (_, i) => M.at((i / (SAMPLES - 1)) * period, inputs));
    for (const ch of charts) {
      const {c, node} = ch;
      const svg = node.querySelector('svg');
      const X0 = PAD.l;
      const X1 = CW - PAD.r;
      const Y0 = CH - PAD.b;
      const Y1 = PAD.t;
      let o = '';
      if (c.kind === 'loop') {
        const xs = samples.map(c.x.get);
        const ys = samples.map(c.y.get);
        const [xa, xb] = niceRange(xs, c.x.min, c.x.max);
        const [ya, yb] = niceRange(ys, c.y.min, c.y.max);
        ch.sx = (v) => X0 + ((v - xa) / (xb - xa || 1)) * (X1 - X0);
        ch.sy = (v) => Y0 - ((v - ya) / (yb - ya || 1)) * (Y0 - Y1);
        const d = xs.map((x, i) => `${i ? 'L' : 'M'}${ch.sx(x).toFixed(1)},${ch.sy(ys[i]).toFixed(1)}`).join('') + 'Z';
        o += `<line class="ax" x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}"/><line class="ax" x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y1}"/>`;
        o += `<line class="gr" x1="${X0}" y1="${ch.sy((ya + yb) / 2)}" x2="${X1}" y2="${ch.sy((ya + yb) / 2)}"/>`;
        if (c.fill) o += `<path class="fillloop" d="${d}"/>`;
        o += `<path class="s0" d="${d}"/>`;
        o += `<text class="tk" x="${X0 - 4}" y="${Y1 + 3}" text-anchor="end">${tick(yb)}</text><text class="tk" x="${X0 - 4}" y="${Y0}" text-anchor="end">${tick(ya)}</text>`;
        o += `<text class="tk" x="${X0}" y="${CH - 6}">${tick(xa)}</text><text class="tk" x="${X1}" y="${CH - 6}" text-anchor="end">${tick(xb)} ${esc(c.x.label)}</text>`;
        o += `<text class="tk" x="${X0 + 4}" y="${Y1 + 3}">${esc(c.y.label)}</text>`;
        o += `<circle class="dot" r="4" data-dot="0"/>`;
      } else {
        const sx = (p) => X0 + (p / period) * (X1 - X0);
        const all = c.series.flatMap((s) => samples.map(s.get));
        const [ya, yb] = niceRange(all, c.y?.min, c.y?.max);
        const sy = (v) => Y0 - ((v - ya) / (yb - ya || 1)) * (Y0 - Y1);
        ch.sx = sx;
        ch.sy = sy;
        (c.bands || cfg.bands || []).forEach((b, i) => {
          if (i % 2 === 0) o += `<rect class="band" x="${sx(b.from)}" y="${Y1}" width="${sx(b.to) - sx(b.from)}" height="${Y0 - Y1}"/>`;
          o += `<text class="bt" x="${(sx(b.from) + sx(b.to)) / 2}" y="${Y1 - 3}" text-anchor="middle">${esc(b.label)}</text>`;
        });
        o += `<line class="ax" x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}"/><line class="ax" x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y1}"/>`;
        if (ya < 0 && yb > 0) o += `<line class="gr" x1="${X0}" y1="${sy(0)}" x2="${X1}" y2="${sy(0)}"/>`;
        c.series.forEach((s, j) => {
          const d = samples.map((st, i) => `${i ? 'L' : 'M'}${sx((i / (SAMPLES - 1)) * period).toFixed(1)},${sy(s.get(st)).toFixed(1)}`).join('');
          o += `<path class="s${j % 3}" d="${d}"/>`;
        });
        o += `<text class="tk" x="${X0 - 4}" y="${Y1 + 3}" text-anchor="end">${tick(yb)}</text><text class="tk" x="${X0 - 4}" y="${Y0}" text-anchor="end">${tick(ya)}</text>`;
        o += `<text class="tk" x="${X0}" y="${CH - 6}">0</text><text class="tk" x="${X1}" y="${CH - 6}" text-anchor="end">${fmt(period)}${esc(M.unit || '')}</text>`;
        if (c.y?.label) o += `<text class="tk" x="${X0 + 4}" y="${Y1 + 10}">${esc(c.y.label)}</text>`;
        o += `<line class="cur" y1="${Y1}" y2="${Y0}" data-cur/>`;
        c.series.forEach((_, j) => (o += `<circle class="dot" r="3.5" data-dot="${j}"/>`));
      }
      svg.innerHTML = o;
      ch.dots = [...svg.querySelectorAll('[data-dot]')];
      ch.cur = svg.querySelector('[data-cur]');
      const foot = node.querySelector('[data-foot]');
      foot.textContent = c.footer ? c.footer(samples, inputs) : '';
      foot.hidden = !c.footer;
    }
    renderChecks();
  }
  function drawCharts(s) {
    for (const ch of charts) {
      const {c} = ch;
      if (c.kind === 'loop') {
        ch.dots[0]?.setAttribute('cx', ch.sx(c.x.get(s)).toFixed(1));
        ch.dots[0]?.setAttribute('cy', ch.sy(c.y.get(s)).toFixed(1));
      } else {
        const x = ch.sx(s.phase).toFixed(1);
        ch.cur?.setAttribute('x1', x);
        ch.cur?.setAttribute('x2', x);
        c.series.forEach((ser, j) => {
          ch.dots[j]?.setAttribute('cx', x);
          ch.dots[j]?.setAttribute('cy', ch.sy(ser.get(s)).toFixed(1));
        });
      }
      if (c.value) put('chart-' + c.id, c.value(s));
    }
  }

  // ---------------------------------------------------------------- checks: numbers checked by hand
  let lastChecks = [];
  function renderChecks() {
    if (!M.checks) return;
    lastChecks = M.checks(inputs).map((k) => {
      const tol = k.tol ?? 0.01;
      const err = k.abs ? Math.abs(k.got - k.want) : Math.abs(k.got - k.want) / (Math.abs(k.want) || 1);
      return {...k, pass: err <= tol};
    });
    const n = lastChecks.filter((k) => k.pass).length;
    $('[data-checks]').innerHTML = `<details><summary>Model checks: <b>${n} of ${lastChecks.length}</b> agree with the hand calculation</summary>${lastChecks
      .map((k) => `<div>${k.pass ? '✓' : '✗'} ${esc(k.name)}: <b>${fmt(k.got, k.d ?? 2)}</b> vs ${fmt(k.want, k.d ?? 2)} ${esc(k.unit || '')}</div>`)
      .join('')}</details>`;
  }

  // ---------------------------------------------------------------- callouts
  const calls = (cfg.callouts || []).map((c, i) => {
    const n = document.createElement('div');
    n.className = 'tdk-call' + (c.side === 'right' ? ' r' : '');
    n.innerHTML = `<b>${esc(c.label)}</b><span data-cv="${i}"></span>`;
    $('.tdk-calls').appendChild(n);
    return {c, n, v: n.querySelector('span'), w: 0};
  });
  const callSvg = $('.tdk-calls svg');
  const tmp = new THREE.Vector3();
  const world = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  let meshes = null;
  const meshPart = new Map();
  let SW = 1;
  let SH = 1;
  let frameNo = 0;
  // Is the anchor hidden behind a part from another subsystem? (Parts of the same subsystem may cross each other.)
  function hidden(k) {
    if (!meshes) {
      meshes = [];
      for (const p of parts) p.obj.traverse((m) => m.isMesh && (meshes.push(m), meshPart.set(m, p)));
    }
    const dir = world.clone().sub(camera.position);
    const dist = dir.length();
    ray.set(camera.position, dir.normalize());
    ray.far = dist - 0.05;
    for (const h of ray.intersectObjects(meshes, false)) {
      const p = meshPart.get(h.object);
      if (!p || p === k.part || (k.part && p.sub === k.part.sub)) continue;
      if (!p.wrap.visible || p.ghost < 0.5 || h.object.material.opacity < 0.7) continue;
      if (cutOn(p) && cutPlane.distanceToPoint(h.point) < 0) continue;
      return true;
    }
    return false;
  }
  function drawCallouts(s) {
    if (!labelsOn || !ok3d) return;
    frameNo++;
    for (const k of calls) {
      const a = anchors[k.c.anchor];
      k.ok = !!a;
      if (!a) continue;
      if (k.part === undefined) {
        k.part = null;
        for (let o = a.parent; o && !k.part; o = o.parent) k.part = parts.find((p) => p.wrap === o) || null;
      }
      a.getWorldPosition(world);
      tmp.copy(world).project(camera);
      k.px = (tmp.x * 0.5 + 0.5) * SW;
      k.py = (-tmp.y * 0.5 + 0.5) * SH;
      k.off = tmp.z > 1 || k.px < -20 || k.px > SW + 20 || k.py < -20 || k.py > SH + 20;
      if (frameNo % 4 === 1 || k.occ === undefined || capture || frozen) k.occ = !k.off && hidden(k);
      k.dim = k.occ || (k.part ? k.part.ghost < 0.5 || !k.part.wrap.visible : false);
      if (!k.w) k.w = k.n.offsetWidth || 110;
    }
    // each side keeps its order from the config; a label sits at its anchor's height, at least GAP below the last
    const GAP = SW < 700 ? 26 : 38;
    for (const side of ['left', 'right']) {
      const list = calls.filter((k) => k.ok && !k.off && (k.c.side === 'right') === (side === 'right'));
      let y = -Infinity;
      for (const k of list) y = k.ty = Math.max(clamp(k.py, 40, SH - 40), y + GAP);
      let maxY = SH - 34;
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].ty > maxY) list[i].ty = maxY;
        maxY = list[i].ty - GAP;
      }
    }
    let o = '';
    for (const k of calls) {
      if (!k.ok) continue;
      const lx = k.c.side === 'right' ? SW - 16 - k.w : 16;
      const ly = k.ty ?? k.c.at * SH;
      k.n.style.left = lx + 'px';
      k.n.style.top = ly.toFixed(1) + 'px';
      k.n.style.opacity = k.off ? 0 : k.dim ? 0.32 : 1;
      k.n.classList.toggle('hot', !k.dim && !!k.c.hot?.(s));
      const txt = k.c.value ? k.c.value(s) : '';
      if (k.last !== txt) {
        k.v.textContent = txt;
        k.last = txt;
      }
      if (!k.off && !k.dim) {
        const ex = k.c.side === 'right' ? lx - 8 : lx + k.w + 8;
        o += `<line x1="${ex.toFixed(1)}" y1="${ly.toFixed(1)}" x2="${k.px.toFixed(1)}" y2="${k.py.toFixed(1)}"/><circle cx="${k.px.toFixed(1)}" cy="${k.py.toFixed(1)}" r="3"/>`;
      }
    }
    callSvg.innerHTML = o;
  }

  // ---------------------------------------------------------------- the console, from the frame's state
  const schem = $('[data-schem]');
  const schemBig = $('[data-schem-big]');
  let lastSay = '';
  function drawConsole(s) {
    if (cfg.live) {
      put('live', fmt(cfg.live.value(s), cfg.live.digits ?? 0));
      put('live-a', cfg.live.a ? cfg.live.a(s) : '');
      put('live-b', cfg.live.b ? cfg.live.b(s) : '');
    }
    (cfg.readouts || []).forEach((r, i) => put('r' + i, r.get(s)));
    drawCharts(s);
    if (cfg.schematic) {
      const svg = cfg.schematic.draw(s, {w: 268, h: cfg.schematic.height || 150, c: COLOURS, mode});
      schem.innerHTML = svg;
      if (!ok3d) schemBig.innerHTML = svg;
    }
    if (cfg.legend?.active) {
      const k = cfg.legend.active(s);
      $$('[data-leg]').forEach((n) => n.classList.toggle('on', n.dataset.leg === k));
    }
    const say = cfg.say ? cfg.say(s) : '';
    if (say && say !== lastSay) {
      $('[data-say]').textContent = say;
      lastSay = say;
    }
    put('status', (cfg.status ? cfg.status(s, {playing, cycleSeconds, reduce}) : '') + (reduce && !playing ? (cfg.status ? ' · ' : '') + 'Reduced motion: paused' : ''));
    put('asm', Math.round(asm * 100) + '%');
    drawCallouts(s);
  }

  // ---------------------------------------------------------------- one frame
  const tmpCol = new THREE.Color();
  function applyParts(dt) {
    const k = dt ? 1 - Math.pow(0.0005, dt) : 1;
    for (const p of parts) {
      const la = easeOut(localAsm(p));
      const ex = inSel(p) ? explodeAmt * (cfg.explodeScale ?? 0.55) : 0;
      const away = Math.max(1 - la, ex);
      p.wrap.position.copy(p.explode).multiplyScalar(away);
      p.wrap.visible = !(p.hideApart && la < 0.98);
      const gTarget = act.isolate && !inSel(p) ? 0.08 : 1;
      p.ghost += (gTarget - p.ghost) * (reduce ? 1 : k * 4 > 1 ? 1 : k * 4);
      const cut = cutOn(p);
      for (const m of p.mats) {
        const base = p.tint || m.userData.base;
        tmpCol.copy(base);
        if (p.hot) tmpCol.lerp(ACCENT, 0.85);
        m.color.copy(tmpCol);
        const op = m.userData.opacity * p.ghost;
        const tr = op < 0.999;
        if (m.transparent !== tr) {
          m.transparent = tr;
          m.needsUpdate = true;
        }
        m.opacity = op;
        m.depthWrite = op > 0.9;
        const want = cut ? 1 : 0;
        if ((m.clippingPlanes?.length || 0) !== want) {
          m.clippingPlanes = cut ? [cutPlane] : [];
          m.needsUpdate = true;
        }
      }
      for (const em of p.edges) {
        em.opacity = MODES[mode].edgeA * em.userData.k * p.ghost;
        const want = cut ? 1 : 0;
        if ((em.clippingPlanes?.length || 0) !== want) {
          em.clippingPlanes = cut ? [cutPlane] : [];
          em.needsUpdate = true;
        }
      }
    }
  }
  function resize() {
    const r = stage.getBoundingClientRect();
    SW = Math.max(1, r.width);
    SH = Math.max(1, r.height);
    if (renderer) renderer.setSize(SW, SH, false);
    camera.aspect = SW / SH;
    camera.updateProjectionMatrix();
    calls.forEach((k) => (k.w = 0));
    if (labelsAuto) setLabels(SW >= 640);
  }
  function step(dt) {
    if (playing && introDone) phase = (phase + (dt * period) / cycleSeconds) % period;
    if (asm !== asmTarget) {
      const d = reduce || !dt ? 1 : dt / ASM_SECONDS;
      asm = asm < asmTarget ? Math.min(asmTarget, asm + d) : Math.max(asmTarget, asm - d);
      if (asm === 1 && !introDone) introDone = true;
    }
    const slider = $('[data-asm]');
    if (document.activeElement !== slider && Number(slider.value) !== Math.round(asm * 100)) slider.value = Math.round(asm * 100);
    const exT = act.explode ? 1 : 0;
    if (explodeAmt !== exT) {
      const d = reduce || !dt ? 1 : dt / 0.8;
      explodeAmt = explodeAmt < exT ? Math.min(exT, explodeAmt + d) : Math.max(exT, explodeAmt - d);
    }
    if (camTween) {
      camTween.t = Math.min(1, camTween.t + dt / camTween.d);
      const e = easeIO(camTween.t);
      camera.position.lerpVectors(camTween.fp, camTween.tp, e);
      controls.target.lerpVectors(camTween.ft, camTween.tt, e);
      if (camTween.t >= 1) camTween = null;
    }
    state = M.at(phase, inputs);
    state.phase = phase;
    machine.pose?.(state, kit);
    applyParts(dt);
    if (ok3d) {
      controls.update();
      renderer.render(scene, camera);
      window.__tdvAfterRender?.(canvas);
    }
    drawConsole(state);
  }

  // ---------------------------------------------------------------- controls
  const say = (t) => ($('[data-say]').textContent = t);
  function setPlay(on) {
    playing = !!on;
    const b = $('[data-act=play]');
    b.textContent = playing ? 'Pause' : 'Play';
    b.setAttribute('aria-pressed', String(playing));
  }
  function nudge(dir) {
    setPlay(false);
    phase = (((phase + dir * (cfg.step || 10)) % period) + period) % period;
  }
  function setAssembly(target, instant = false) {
    asmTarget = clamp(target, 0, 1);
    if (instant || reduce) asm = asmTarget;
    $('[data-act=asm]').textContent = asmTarget < 0.5 ? 'Put together' : 'Take apart';
    if (asmTarget < 0.5 && views.apart) setView('apart');
    else if (asmTarget >= 0.5 && viewKey === 'apart') setView(viewKeys[0]);
  }
  function select(key) {
    selected = subs.some((s) => s.key === key) ? key : 'all';
    $$('[data-sub]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sub === selected)));
    say(subs.find((s) => s.key === selected).label + ' selected');
  }
  function toggle(name, on) {
    act[name] = on ?? !act[name];
    $$(`[data-tgl=${name}]`).forEach((b) => b.setAttribute('aria-pressed', String(act[name])));
  }
  let labelsAuto = !q.has('nolabels') && !q.has('labels');
  function setLabels(on) {
    labelsOn = !!on;
    $('.tdk-calls').classList.toggle('off', !labelsOn);
    $('[data-act=labels]').setAttribute('aria-pressed', String(labelsOn));
    if (!labelsOn) callSvg.innerHTML = '';
  }
  function setMode(m) {
    mode = m === 'night' ? 'night' : 'light';
    el.dataset.mode = mode;
    scene.background = new THREE.Color(MODES[mode].ground);
    shadowMat.opacity = MODES[mode].shadowA;
    edgeMats.forEach((em) => em.color.set(MODES[mode].edge));
    $('[data-act=night]').setAttribute('aria-pressed', String(mode === 'night'));
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act === 'play') setPlay(!playing);
    else if (b.dataset.act === 'back') nudge(-1);
    else if (b.dataset.act === 'fwd') nudge(1);
    else if (b.dataset.act === 'asm') setAssembly(asmTarget < 0.5 ? 1 : 0);
    else if (b.dataset.act === 'labels') {
      labelsAuto = false;
      setLabels(!labelsOn);
    } else if (b.dataset.act === 'night') setMode(mode === 'night' ? 'light' : 'night');
    else if (b.dataset.speed) {
      cycleSeconds = Number(b.dataset.speed);
      $$('[data-speed]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    } else if (b.dataset.sub) select(b.dataset.sub);
    else if (b.dataset.tgl) toggle(b.dataset.tgl);
    else if (b.dataset.view) setView(b.dataset.view);
    else if (b.dataset.tog) {
      const t = M.toggles.find((x) => x.key === b.dataset.tog);
      inputs[t.key] = !inputs[t.key];
      b.setAttribute('aria-pressed', String(inputs[t.key]));
      b.textContent = inputs[t.key] ? t.on || 'On' : t.off || 'Off';
      resample();
    } else if (b.dataset.learn) {
      const s = cfg.learn[Number(b.dataset.learn)].show || {};
      if (s.select) select(s.select);
      if (s.view) setView(s.view);
      if (s.phase !== undefined) phase = s.phase;
      ['isolate', 'cut', 'explode'].forEach((k) => s[k] !== undefined && toggle(k, s[k]));
      if (s.assemble !== undefined) setAssembly(s.assemble);
      if (s.play !== undefined) setPlay(s.play);
      stage.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'center'});
    }
  });
  $$('[data-in]').forEach((inp) => {
    const def = M.inputs.find((i) => i.key === inp.dataset.in);
    const out = el.querySelector(`[data-out="${def.key}"]`);
    const show = () => (out.textContent = def.format ? def.format(inputs[def.key]) : fmt(inputs[def.key], def.digits ?? 0) + ' ' + (def.unit || ''));
    show();
    let pend = false;
    inp.addEventListener('input', () => {
      inputs[def.key] = Number(inp.value);
      show();
      if (!pend) {
        pend = true;
        requestAnimationFrame(() => {
          pend = false;
          resample();
          step(0); // Keep below-stage mobile readouts in sync even when animation is offscreen.
        });
      }
    });
  });
  $('[data-asm]').addEventListener('input', (e) => {
    asm = asmTarget = Number(e.target.value) / 100;
    $('[data-act=asm]').textContent = asmTarget < 0.5 ? 'Put together' : 'Take apart';
  });
  // keyboard: the page keys, and orbit keys while the 3D view has focus
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t.closest && (t.closest('input,select,textarea') || t.isContentEditable)) return;
    if (t === canvas && controls && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_', 'Home'].includes(e.key)) {
      e.preventDefault();
      camTween = null;
      const off = camera.position.clone().sub(controls.target);
      const sph = new THREE.Spherical().setFromVector3(off);
      if (e.key === 'ArrowLeft') sph.theta -= 0.12;
      if (e.key === 'ArrowRight') sph.theta += 0.12;
      if (e.key === 'ArrowUp') sph.phi = clamp(sph.phi - 0.1, 0.1, Math.PI - 0.1);
      if (e.key === 'ArrowDown') sph.phi = clamp(sph.phi + 0.1, 0.1, Math.PI - 0.1);
      if (e.key === '+' || e.key === '=') sph.radius = Math.max(controls.minDistance, sph.radius * 0.9);
      if (e.key === '-' || e.key === '_') sph.radius = Math.min(controls.maxDistance, sph.radius * 1.1);
      if (e.key === 'Home') return setView(viewKeys[0]);
      camera.position.copy(controls.target).add(off.setFromSpherical(sph));
      return;
    }
    const k = e.key.toLowerCase();
    if (k === ' ' && t.closest?.('button')) return;
    if (k === ' ') {
      e.preventDefault();
      setPlay(!playing);
    } else if (k === 'arrowleft') nudge(-1);
    else if (k === 'arrowright') nudge(1);
    else if (/^[1-9]$/.test(k) && viewKeys[Number(k) - 1]) setView(viewKeys[Number(k) - 1]);
    else if (k === 'a') setAssembly(asmTarget < 0.5 ? 1 : 0);
    else if (k === 'i') toggle('isolate');
    else if (k === 'c') toggle('cut');
    else if (k === 'x') toggle('explode');
    else if (k === 'l') {
      labelsAuto = false;
      setLabels(!labelsOn);
    } else if (k === 'n') setMode(mode === 'night' ? 'light' : 'night');
    else if (k === '[' || k === ']') {
      const i = subs.findIndex((s) => s.key === selected);
      select(subs[(i + (k === ']' ? 1 : subs.length - 1)) % subs.length].key);
    } else return;
  });
  reduceMQ.addEventListener?.('change', (e) => {
    reduce = e.matches;
    if (reduce) setPlay(false);
  });

  // ---------------------------------------------------------------- start
  let introDone = true;
  resize();
  setView(viewKeys[0], true);
  setMode(mode);
  if (labelsAuto) setLabels(SW >= 640);
  resample();
  if (!reduce && !capture && cfg.intro !== false) {
    introDone = false;
    asm = 0;
    asmTarget = 1;
  }
  setPlay(!reduce && !capture);
  new ResizeObserver(resize).observe(stage);
  let visible = true;
  new IntersectionObserver((es) => (visible = es[0].isIntersecting)).observe(stage);
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!frozen && visible && !document.hidden) step(dt);
    requestAnimationFrame(loop);
  }
  step(0);
  requestAnimationFrame(loop);

  // ---------------------------------------------------------------- the handle the verify script (and capture) uses
  const api = {
    ready: true, id: cfg.id, period, kit, parts, anchors,
    get phase() { return phase; },
    get introDone() { return introDone; },
    get playing() { return playing; },
    state: () => ({...state}),
    /** A string that changes whenever anything on screen should change. */
    signature: () => {
      const nums = Object.entries(state).filter(([, v]) => typeof v === 'number').map(([k, v]) => k + ':' + v.toFixed(4));
      return nums.join('|') + `|asm:${asm.toFixed(3)}|ex:${explodeAmt.toFixed(3)}|cam:${camera.position.toArray().map((v) => v.toFixed(2)).join(',')}`;
    },
    checks: () => lastChecks.map((k) => ({name: k.name, got: k.got, want: k.want, unit: k.unit, pass: k.pass})),
    /** Draw one exact frame at a phase, for stills. Freezes the clock until freeze(false). */
    seek(p) {
      frozen = true;
      introDone = true;
      phase = ((p % period) + period) % period;
      step(0);
      return {...state};
    },
    freeze(on = true) { frozen = !!on; last = performance.now(); },
    play: setPlay, setView, setAssembly, select, toggle, setMode, setLabels,
    setInput(k, v) {
      inputs[k] = v;
      const inp = el.querySelector(`[data-in="${k}"]`);
      if (inp) inp.value = v;
      resample();
    },
  };
  window.STUDY_TEARDOWN = api;
  return api;
}
