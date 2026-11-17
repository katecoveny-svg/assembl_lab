// assembl lab · play the amp. A valve head on a 4×12 cabinet, modelled in code, with the guitar plugged in.
// The knobs drive a real signal chain (gain into a soft-clipping stage, a three-band tone stack, presence,
// a speaker-cabinet filter, master volume). The readout draws the actual output and the tone curve the knobs set.
import { Studio, THREE, V } from '../../engine.js';
import { Sound, midiHz } from '../../audio.js';
import amp, { KNOBS } from '../../amp.js';

const $ = (id) => document.getElementById(id);
const IDLE_MS = 25000;
const OPEN = [40, 45, 50, 55, 59, 64];
const SHAPES = { E5: [0, 2, 2, -1, -1, -1], A5: [-1, 0, 2, 2, -1, -1], D5: [-1, -1, 0, 2, 3, -1], G5: [3, 5, 5, -1, -1, -1], C5: [-1, 3, 5, 5, -1, -1], F5: [1, 3, 3, -1, -1, -1],
  E: [0, 2, 2, 1, 0, 0], A: [-1, 0, 2, 2, 2, 0], D: [-1, -1, 0, 2, 3, 2] };
const ORDER = ['E5', 'A5', 'D5', 'G5', 'C5', 'F5', 'E', 'A', 'D'];
let coachGone = false, frameHook = () => {};
const ui = { bind() {}, onLoad() {}, sync() {}, moveTip() {}, openCard() {}, closeCard() {}, setPlayPanel() {}, showPlay() {}, heroLoaded() {}, hover() {}, frame(s) { frameHook(s); }, flash() {} };
const hideCoach = () => { if (!coachGone) { coachGone = true; $('coach').classList.add('gone'); } };

function diagram(shape) {
  const x = (i) => 3 + i * 5.6, base = Math.max(1, Math.min(...shape.filter((n) => n > 0)) - (Math.max(...shape) > 4 ? 1 : 0)), y = (f) => 6 + (f - base + 0.5) * 6;
  let s = `<svg viewBox="0 0 34 30" aria-hidden="true"><g stroke="currentColor" stroke-width=".7" fill="none">`;
  for (let i = 0; i < 6; i++) s += `<line x1="${x(i)}" y1="6" x2="${x(i)}" y2="30"/>`;
  for (let f = 0; f <= 4; f++) s += `<line x1="3" y1="${6 + f * 6}" x2="31" y2="${6 + f * 6}" ${f === 0 && base === 1 ? 'stroke-width="1.6"' : ''}/>`;
  s += '</g>';
  shape.forEach((n, i) => { if (n > 0) s += `<circle cx="${x(i)}" cy="${y(n)}" r="2.1" fill="currentColor"/>`; if (n < 0) s += `<text x="${x(i)}" y="4.2" font-size="4.6" text-anchor="middle" fill="currentColor">×</text>`; });
  return s + '</svg>';
}

// the tone filters as a description, so the same numbers drive the live chain and the drawn curve
const TONE = (v) => [
  ['highpass', 75, 0.7, 0], ['peaking', 115, 1.2, 3], // the cabinet's low thump
  ['lowshelf', 110, 0.7, (v.bass - 5) * 2.4], ['peaking', 650, 0.8, (v.middle - 5) * 2.0], ['highshelf', 3200, 0.7, (v.treble - 5) * 2.4],
  ['peaking', 5000, 1.0, (v.presence - 5) * 1.8], ['peaking', 2400, 1.2, 2], ['lowpass', 5200, 0.7, 0], // speaker bite and roll-off
];
const drive = (g) => 1.5 + g * g * 0.9; // how hard the preamp clips
const curveFor = (k) => { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } return c; };

async function start() {
  let gl = false;
  try { gl = !!document.createElement('canvas').getContext('webgl2'); } catch { gl = false; }
  if (!gl) { $('loading').textContent = 'This needs WebGL 2, which this browser has turned off.'; return; }
  const sound = new Sound();
  const studio = new Studio({ host: $('canvas'), ui, sound });
  window.__studio = studio;
  const wide = innerWidth > innerHeight * 0.9;
  const VIEWS = {
    whole: { target: V(0, 0.54, 0), radius: wide ? 0.9 : 1.0, dir: V(0.62, 0.34, 1) },
    controls: { target: V(0.03, 0.84, 0.11), radius: wide ? 0.26 : 0.28, dir: V(0.12, 0.24, 1) },
    speakers: { target: V(0, 0.38, 0.16), radius: wide ? 0.58 : 0.62, dir: V(0.3, 0.16, 1) },
    valves: { target: V(-0.04, 0.9, -0.1), radius: wide ? 0.4 : 0.42, dir: V(-0.42, 0.4, -1) },
  };
  const def = { ...amp, studioEnv: 'softbox', cam: { ...amp.cam, dir: VIEWS.whole.dir, play: { ...VIEWS.whole } } };
  await studio.load(def);
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const g2 = cv.getContext('2d'), gr = g2.createRadialGradient(256, 230, 30, 256, 256, 360);
  gr.addColorStop(0, '#FBF7F3'); gr.addColorStop(0.6, '#F2EAE6'); gr.addColorStop(1, '#E6D8DE');
  g2.fillStyle = gr; g2.fillRect(0, 0, 512, 512);
  const bg = new THREE.CanvasTexture(cv); bg.colorSpace = THREE.SRGBColorSpace; studio.scene.background = bg;
  studio.ground.material.opacity = 0.16;
  studio.setMode('play');
  const P = studio.built.play;

  /* ── the signal chain, built on the first touch (browsers only allow sound after one) ── */
  let chain = null;
  const ensureChain = () => {
    const ctx = sound.ensure(); if (!ctx) return null;
    if (chain) return chain;
    const input = ctx.createGain(), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90;
    const pre = ctx.createGain(), shaper = ctx.createWaveShaper(); shaper.oversample = '4x';
    const post = ctx.createGain(), master = ctx.createGain(), analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
    const tone = TONE(P.values).map(([type, f, q]) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; });
    let n = input; for (const x of [hp, pre, shaper, post, ...tone, master, analyser]) { n.connect(x); n = x; }
    analyser.connect(sound.bus);
    sound.guitarIn = input; // the guitar now goes through the amp instead of its acoustic body
    chain = { ctx, pre, shaper, post, tone, master, analyser, buf: new Float32Array(analyser.fftSize) };
    apply(); return chain;
  };
  let lastK = -1;
  const apply = () => {
    const v = P.values;
    if (chain) {
      const k = drive(v.gain);
      if (Math.abs(k - lastK) > 0.05) { chain.shaper.curve = curveFor(k); lastK = k; }
      chain.pre.gain.value = 1 + v.gain * 0.35; chain.post.gain.value = 0.55 / (1 + v.gain * 0.12);
      TONE(v).forEach(([, , , gain], i) => { chain.tone[i].gain.value = gain; });
      chain.master.gain.value = Math.pow(v.master / 10, 2) * 1.2;
    }
    drawEQ(); syncSliders();
  };
  P.on(() => apply());

  /* ── chords ── */
  $('pads').innerHTML = ORDER.map((c, i) => `<button type="button" class="pad" data-c="${c}" aria-pressed="false" aria-label="${c} chord"><kbd>${i + 1}</kbd><b>${c}</b>${diagram(SHAPES[c])}</button>`).join('');
  let chord = 'E5', mute = false, energy = 0, notes = [];
  const stops = [];
  const strum = (down = true, vel = 0.8, { silent = false } = {}) => {
    if (!silent) ensureChain();
    const shape = SHAPES[chord], order = down ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0], gap = 0.012;
    notes = [];
    order.filter((i) => shape[i] >= 0).forEach((i, k) => {
      const m = OPEN[i] + shape[i]; notes.push(m);
      if (!silent) { stops[i]?.(0); stops[i] = sound.pluck(m, { when: k * gap, gain: 0.5, vel, mute, pan: (i - 2.5) * 0.08 }); }
    });
    energy = Math.min(1.2, energy * 0.4 + 0.75 + vel * 0.3); hideCoach();
  };
  const setChord = (c) => { chord = c; $('pads').querySelectorAll('.pad').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.c === c))); const el = $('now'); el.textContent = c; el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 280); };
  setChord('E5');
  $('pads').addEventListener('click', (e) => { const b = e.target.closest('.pad'); if (b) { setChord(b.dataset.c); strum(true, 0.85); } });
  $('strum').addEventListener('click', () => strum(true, 0.85));
  const setMute = (on) => { mute = on; $('mute').setAttribute('aria-pressed', String(on)); $('ring').setAttribute('aria-pressed', String(!on)); };
  $('mute').addEventListener('click', () => setMute(true)); $('ring').addEventListener('click', () => setMute(false));
  addEventListener('keydown', (e) => {
    touched();
    if (e.metaKey || e.ctrlKey || e.altKey || e.target?.closest?.('input')) return;
    if (/^[1-9]$/.test(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) { setChord(ORDER[+e.key - 1]); strum(true, 0.85); } }
    else if (e.key === ' ') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) strum(!e.shiftKey, 0.85); }
    else if (e.key === 'm' || e.key === 'M') { e.stopImmediatePropagation(); setMute(!mute); }
  }, { capture: true });

  /* ── sliders that mirror the knobs (for keyboards, screen readers and small screens) ── */
  $('sliders').innerHTML = KNOBS.map((k) => `<label><span>${k}</span><input type="range" min="0" max="10" step="0.1" data-k="${k}" aria-label="${k}"></label>`).join('');
  const sliders = [...$('sliders').querySelectorAll('input')];
  const syncSliders = () => { const v = P.values; sliders.forEach((s) => { if (document.activeElement !== s) s.value = v[s.dataset.k]; }); };
  $('sliders').addEventListener('input', (e) => { const s = e.target.closest('input'); if (s) P.set(s.dataset.k, +s.value); });

  /* ── the tone curve, from the same filter numbers (an offline context needs no sound permission) ── */
  const off = new OfflineAudioContext(1, 128, 44100);
  const F = new Float32Array(120); for (let i = 0; i < 120; i++) F[i] = 40 * Math.pow(10000 / 40, i / 119);
  const eq = $('eq'), eg = eq.getContext('2d');
  function drawEQ() {
    const mags = new Float32Array(120).fill(0), m1 = new Float32Array(120), ph = new Float32Array(120);
    for (const [type, f, q, gain] of TONE(P.values)) { const b = off.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.gain.value = gain; b.getFrequencyResponse(F, m1, ph); for (let i = 0; i < 120; i++) mags[i] += 20 * Math.log10(Math.max(1e-4, m1[i])); }
    const W = eq.width, Hh = eq.height, y = (db) => Hh / 2 - db * (Hh / 2 - 8) / 24;
    eg.clearRect(0, 0, W, Hh);
    eg.strokeStyle = 'rgba(101,74,78,.16)'; eg.lineWidth = 1;
    for (const f of [100, 1000, 10000]) { const x = Math.log(f / 40) / Math.log(10000 / 40) * W; eg.beginPath(); eg.moveTo(x, 0); eg.lineTo(x, Hh); eg.stroke(); }
    eg.beginPath(); eg.moveTo(0, y(0)); eg.lineTo(W, y(0)); eg.stroke();
    eg.fillStyle = 'rgba(217,186,203,.45)'; eg.strokeStyle = '#33212F'; eg.lineWidth = 2.4; eg.beginPath();
    for (let i = 0; i < 120; i++) { const x = i / 119 * W; i ? eg.lineTo(x, y(mags[i])) : eg.moveTo(x, y(mags[i])); }
    eg.stroke(); eg.lineTo(W, Hh); eg.lineTo(0, Hh); eg.closePath(); eg.fill();
    eg.fillStyle = '#654A4E'; eg.font = '20px "IBM Plex Mono", monospace'; eg.fillText('100 Hz', Math.log(100 / 40) / Math.log(250) * W + 6, Hh - 8); eg.fillText('1 kHz', Math.log(25) / Math.log(250) * W + 6, Hh - 8);
  }

  /* ── views, labels ── */
  let view = 'whole';
  const setView = (k) => { const v = VIEWS[k]; if (!v) return; view = k; studio.def.cam.play = { ...v }; studio.zoom = 1; studio.dirGoal = v.dir.clone().normalize(); P.xray(k === 'speakers');
    $('views').querySelectorAll('[data-v]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === k))); };
  $('views').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) setView(b.dataset.v); });
  const partBy = (id) => studio.parts.find((p) => p.id === id);
  const LABELS = [
    { n: 1, id: 'panel', at: () => P.knobTop('gain').add(V(0.03, 0.036, -0.02)), n3: V(0, 0, 1) }, { n: 2, id: 'valves', at: () => P.valveAt(), n3: V(0, 0, -1) }, { n: 3, id: 'speakers', at: () => P.speakerAt(0), n3: V(0, 0, 1) },
    { n: 4, id: 'grille', at: () => V(0.3, 0.68, 0.135), n3: V(0, 0, 1) }, { n: 5, id: 'cab', at: () => V(0.385, 0.25, 0.05), n3: V(1, 0, 0) }, { n: 6, id: 'front', at: () => V(-0.2, 0.965, 0.118), n3: V(0, 0, 1) },
  ];
  const lw = $('labels');
  lw.innerHTML = LABELS.map((l) => `<button type="button" class="lab" data-n="${l.n}" aria-label="${l.n}: ${partBy(l.id)?.name || ''}">${l.n}</button>`).join('');
  const labEls = [...lw.querySelectorAll('.lab')];
  let labelsOn = innerWidth > 700;
  const syncLabels = () => { lw.classList.toggle('off', !labelsOn); $('lblBtn').setAttribute('aria-pressed', String(labelsOn)); };
  $('lblBtn').addEventListener('click', () => { labelsOn = !labelsOn; syncLabels(); }); syncLabels();
  lw.addEventListener('click', (e) => { const b = e.target.closest('.lab'); if (!b) return; const l = LABELS.find((x) => x.n === +b.dataset.n), p = partBy(l.id); if (!p) return;
    $('cardK').textContent = `${l.n} · ${p.cat}`; $('cardH').textContent = p.name; $('cardP').textContent = p.desc; $('cardS').textContent = p.spec; $('card').hidden = false; });
  $('cardX').addEventListener('click', () => { $('card').hidden = true; });

  /* ── the tour: plays itself silently, turns the gain up, shows the speakers and the valves ── */
  const TOUR = [
    { t: 0, view: 'whole', chord: 'E5' }, { t: 0.9, chord: 'E5' }, { t: 1.8, chord: 'G5' }, { t: 2.7, chord: 'A5' },
    { t: 3.6, view: 'controls', knob: ['gain', 2, 8.5, 3.2] }, { t: 4.0, chord: 'E5' }, { t: 5.2, chord: 'E5' }, { t: 6.4, chord: 'A5' },
    { t: 7.6, view: 'speakers', chord: 'E5' }, { t: 8.5, chord: 'D5' }, { t: 9.4, chord: 'E5' }, { t: 10.3, chord: 'G5' },
    { t: 11.4, view: 'valves', chord: 'A5' }, { t: 12.6, chord: 'E5' }, { t: 14.4, view: 'whole', knob: ['gain', 8.5, 5, 1.2] },
  ];
  const LOOP = 16.2;
  let lastInput = -1e9, tourT = 0, tourIdx = 0, touring = false, sweep = null;
  function touched() { lastInput = performance.now(); if (touring) { touring = false; sweep = null; $('scopeTag').textContent = 'live'; } }
  for (const ev of ['pointerdown', 'pointerup', 'wheel', 'touchstart']) addEventListener(ev, touched, { capture: true, passive: true });
  window.__tour = () => ({ touring, idle: performance.now() - lastInput });
  const beginTour = () => { touring = true; tourT = 0; tourIdx = 0; $('scopeTag').textContent = 'playing itself'; $('card').hidden = true; };
  setTimeout(() => { if (performance.now() - lastInput > 2400) beginTour(); }, 2600);
  const tourStep = (dt) => {
    if (!touring) { if (performance.now() - lastInput > IDLE_MS) beginTour(); return; }
    tourT += dt;
    while (tourIdx < TOUR.length && tourT >= TOUR[tourIdx].t) {
      const b = TOUR[tourIdx++];
      if (b.view && b.view !== view) setView(b.view);
      if (b.chord) { setChord(b.chord); strum(true, 0.8, { silent: true }); }
      if (b.knob) { const [k, a, z, d] = b.knob; sweep = { k, a, z, d, t: 0 }; }
    }
    if (sweep) { sweep.t += dt; const u = Math.min(1, sweep.t / sweep.d), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; P.set(sweep.k, sweep.a + (sweep.z - sweep.a) * e); if (u >= 1) sweep = null; }
    if (tourT >= LOOP) { tourT = 0; tourIdx = 0; }
  };

  /* ── every frame: what the speakers, valves and readout show ── */
  const wave = $('wave'), wg = wave.getContext('2d');
  let last = performance.now();
  frameHook = () => {
    const t = performance.now(), dt = Math.min(0.25, (t - last) / 1000); last = t;
    tourStep(dt);
    studio.camera.updateMatrixWorld();
    energy *= Math.exp(-dt * (mute ? 9 : 1.6));
    const v = P.values, k = drive(v.gain), vol = Math.pow(v.master / 10, 2);
    // one trace: from the real output when sound is running, otherwise from the chord being played
    const W = wave.width, Hh = wave.height, mid = Hh / 2;
    let rms = 0;
    const live = chain && chain.ctx.state === 'running' && !touring;
    if (live) { chain.analyser.getFloatTimeDomainData(chain.buf); for (const x of chain.buf) rms += x * x; rms = Math.sqrt(rms / chain.buf.length); }
    else rms = energy * 0.25 * (0.4 + vol);
    const lvl = Math.min(1, rms * 3.2);
    // the cones as you would see them in slow motion: an outward push on every strum, and a wobble that grows with the level
    P.drive(lvl, lvl * Math.sin(t / 1000 * 2 * Math.PI * 7) + energy * 0.3);
    wg.clearRect(0, 0, W, Hh);
    wg.strokeStyle = 'rgba(101,74,78,.18)'; wg.lineWidth = 1; wg.beginPath(); wg.moveTo(0, mid); wg.lineTo(W, mid); wg.stroke();
    wg.lineWidth = 2.2; wg.strokeStyle = '#33212F'; wg.beginPath();
    if (live) {
      const b = chain.buf, n = Math.min(b.length, 1200), sc = Hh * 0.45 / Math.max(0.05, Math.max(...b.subarray(0, n).map(Math.abs)));
      for (let i = 0; i < n; i += 2) { const x = i / n * W, y = mid - b[i] * sc; i ? wg.lineTo(x, y) : wg.moveTo(x, y); }
    } else if (energy > 0.01) {
      // the chord through the same clipping curve: turn the gain up and the wave squares off
      for (let x = 0; x <= W; x += 2) {
        const tt = t / 1000 * 0.02 + x / W * 0.03; let s = 0; notes.forEach((m, i) => { s += Math.sin(2 * Math.PI * midiHz(m) * tt + i); });
        const y = Math.tanh(k * s / 4 * energy) / Math.tanh(k) * (0.4 + vol * 0.6);
        x ? wg.lineTo(x, mid - y * Hh * 0.44) : wg.moveTo(x, mid - y * Hh * 0.44);
      }
    }
    wg.stroke();
    if (labelsOn) for (let i = 0; i < LABELS.length; i++) {
      const at = LABELS[i].at(), w = studio.toWorld(at), q = studio.project(w);
      // hide a label when the side it names faces away from you
      const facing = studio.toWorld(at.clone().add(LABELS[i].n3)).sub(w).dot(studio.camera.position.clone().sub(w)) > 0;
      const offs = !facing || q.x < 8 || q.y < 8 || q.x > studio.host.clientWidth - 8 || q.y > studio.host.clientHeight - 8 || !q.front;
      labEls[i].style.transform = `translate(${q.x}px, ${q.y}px)`; labEls[i].classList.toggle('hide', offs);
    }
  };
  apply();
  $('loading').hidden = true;
}
start();
