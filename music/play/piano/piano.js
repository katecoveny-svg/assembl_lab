// assembl lab · play piano. A white baby grand modelled in code, lit like a product shot, ready to play.
// Same standard as the guitar: always something moving, views, numbered labels, a live readout drawn from the same
// state that moves the keys and hammers, and a tour that plays itself (silently) until someone touches it.
import { Studio, THREE, V } from '../../engine.js';
import { Sound } from '../../audio.js';
import grand from '../../grand.js';

const $ = (id) => document.getElementById(id);
const IDLE_MS = 25000;
const CHORDS = { C: [48, 60, 64, 67], Dm: [50, 62, 65, 69], Em: [52, 59, 64, 67], F: [53, 60, 65, 69], G: [55, 59, 62, 67], Am: [57, 60, 64, 69] };
const ORDER = ['C', 'Dm', 'Em', 'F', 'G', 'Am'];
const KEYS = 'awsedftgyhujkolp;'; // C to E, white and black keys laid out like a piano on the home row
let coachGone = false, frameHook = () => {};
const ui = {
  bind() {}, onLoad() {}, sync() {}, moveTip() {}, openCard() {}, closeCard() {}, setPlayPanel() {}, showPlay() {}, heroLoaded() {}, hover() {},
  frame(studio) { frameHook(studio); }, flash() {},
};
const hideCoach = () => { if (!coachGone) { coachGone = true; $('coach').classList.add('gone'); } };
const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

async function start() {
  let gl = false;
  try { gl = !!document.createElement('canvas').getContext('webgl2'); } catch { gl = false; }
  if (!gl) { $('loading').textContent = 'This needs WebGL 2, which this browser has turned off.'; return; }
  const sound = new Sound();
  const studio = new Studio({ host: $('canvas'), ui, sound });
  window.__studio = studio;
  const wide = innerWidth > innerHeight * 0.9;
  const VIEWS = {
    whole: { target: V(0.05, wide ? 0.9 : 0.95, -0.46), radius: wide ? 1.06 : 1.12, dir: V(1.0, 0.5, 0.62) },
    keys: { target: V(0, 0.76, 0.12), radius: wide ? 0.5 : 0.42, dir: V(0.12, 0.9, 1.0) },
    inside: { target: V(0.0, 0.88, -0.55), radius: wide ? 0.7 : 0.7, dir: V(1.0, 0.85, 0.12) },
    hammers: { target: V(0.1, 0.86, -0.17), radius: wide ? 0.3 : 0.27, dir: V(0.45, 0.95, 0.5) },
  };
  const def = { ...grand, studioEnv: 'softbox', cam: { ...grand.cam, dir: VIEWS.whole.dir, play: { ...VIEWS.whole } } };
  await studio.load(def);
  // a deeper blush behind a white instrument, so its edges read
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(256, 220, 40, 256, 256, 380);
  gr.addColorStop(0, '#F7F0EE'); gr.addColorStop(0.55, '#EADDE0'); gr.addColorStop(1, '#D6BFCB');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  const bg = new THREE.CanvasTexture(cv); bg.colorSpace = THREE.SRGBColorSpace; studio.scene.background = bg;
  studio.ground.material.opacity = 0.2;
  studio.setMode('play');
  const P = studio.built.play;

  /* ── views ── */
  let view = 'whole';
  const setView = (k) => {
    const v = VIEWS[k]; if (!v) return;
    view = k; studio.def.cam.play = { ...v }; studio.zoom = 1; studio.dirGoal = v.dir.clone().normalize();
    $('views').querySelectorAll('[data-v]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === k)));
  };
  $('views').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) setView(b.dataset.v); });

  /* ── numbered labels ── */
  const partBy = (id) => studio.parts.find((p) => p.id === id);
  const LABELS = [
    { n: 1, id: 'lid', at: () => V(0.0, 1.32, -0.75) },
    { n: 2, id: 'plate', at: () => V(-0.3, 0.86, -0.95) },
    { n: 3, id: 'strings', at: () => P.stringMid(30) },
    { n: 4, id: 'hammers', at: () => V(0.28, 0.85, -0.155) },
    { n: 5, id: 'dampers', at: () => V(-0.2, 0.905, -0.235) },
    { n: 6, id: 'keys', at: () => P.keyTop(67).add(V(0, -0.035, 0.05)) }, // on the key slip, so it never covers a key
    { n: 7, id: 'pedals', at: () => V(0.06, 0.1, 0.27) },
    { n: 8, id: 'soundboard', at: () => V(-0.38, 0.81, -0.55) },
  ];
  const lw = $('labels');
  lw.innerHTML = LABELS.map((l) => `<button type="button" class="lab" data-n="${l.n}" aria-label="${l.n}: ${(partBy(l.id)?.name || '').replace(/"/g, '')}">${l.n}</button>`).join('');
  const labEls = [...lw.querySelectorAll('.lab')];
  let labelsOn = innerWidth > 700;
  const syncLabels = () => { lw.classList.toggle('off', !labelsOn); $('lblBtn').setAttribute('aria-pressed', String(labelsOn)); };
  $('lblBtn').addEventListener('click', () => { labelsOn = !labelsOn; syncLabels(); }); syncLabels();
  lw.addEventListener('click', (e) => {
    const b = e.target.closest('.lab'); if (!b) return;
    const l = LABELS.find((x) => x.n === +b.dataset.n), p = partBy(l.id); if (!p) return;
    $('cardK').textContent = `${l.n} · ${p.cat}`; $('cardH').textContent = p.name; $('cardP').textContent = p.desc; $('cardS').textContent = p.spec; $('card').hidden = false;
  });
  $('cardX').addEventListener('click', () => { $('card').hidden = true; });

  /* ── chords, pedal, octave, computer keys ── */
  $('pads').innerHTML = ORDER.map((c) => `<button type="button" class="pad" data-c="${c}" aria-label="${c} chord"><b>${c}</b><small>${CHORDS[c].slice(1).map((m) => P.noteName(m).replace(/\d/, '')).join(' ')}</small></button>`).join('');
  const chord = (c, { silent = false } = {}) => {
    CHORDS[c].forEach((m, i) => setTimeout(() => { P.press(m, i ? 0.62 : 0.7, { silent }); setTimeout(() => P.release(m), 900); }, i * 45));
  };
  $('pads').addEventListener('click', (e) => { const b = e.target.closest('.pad'); if (b) { sound.ensure(); hideCoach(); chord(b.dataset.c); } });
  const setPedal = (on) => { P.setSustain(on); $('pedal').setAttribute('aria-pressed', String(on)); };
  $('pedal').addEventListener('click', () => { sound.ensure(); setPedal(!P.sustain); });
  let octave = 4;
  const syncOct = () => { $('octLabel').textContent = `C${octave}`; };
  $('octDown').addEventListener('click', () => { octave = Math.max(1, octave - 1); syncOct(); });
  $('octUp').addEventListener('click', () => { octave = Math.min(7, octave + 1); syncOct(); });
  const held = new Map();
  addEventListener('keydown', (e) => {
    touched();
    if (e.metaKey || e.ctrlKey || e.altKey || e.target?.closest?.('input,textarea,select')) return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); if (!e.repeat) { sound.ensure(); setPedal(true); } return; }
    if (k === 'z') { octave = Math.max(1, octave - 1); syncOct(); return; }
    if (k === 'x') { octave = Math.min(7, octave + 1); syncOct(); return; }
    const i = KEYS.indexOf(k); if (i < 0 || e.repeat) return;
    e.preventDefault(); sound.ensure(); hideCoach();
    const m = Math.min(P.high, Math.max(P.low, 12 * (octave + 1) + i)); held.set(k, m); P.press(m, 0.72);
  }, { capture: true });
  addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === ' ') { setPedal(false); return; }
    if (held.has(k)) { P.release(held.get(k)); held.delete(k); }
  });
  P.on(() => { hideCoach(); });

  /* ── live readout: the notes sounding now, and a trace of what they add up to ── */
  $('strs').innerHTML = Array.from({ length: 6 }, () => '<li><span class="nm"></span><b class="nt"></b><span class="hz"></span><i class="bar"><i></i></i></li>').join('');
  const rows = [...$('strs').children].map((li) => ({ li, nm: li.querySelector('.nm'), nt: li.querySelector('.nt'), hz: li.querySelector('.hz'), bar: li.querySelector('.bar > i') }));
  const wave = $('wave'), wg = wave.getContext('2d');
  const drawScope = (st, t) => {
    const W = wave.width, Hh = wave.height, mid = Hh / 2;
    wg.clearRect(0, 0, W, Hh);
    wg.strokeStyle = 'rgba(101,74,78,.18)'; wg.lineWidth = 1; wg.beginPath(); wg.moveTo(0, mid); wg.lineTo(W, mid); wg.stroke();
    if (!st.length) return;
    const span = 0.03, slow = t * 0.02, norm = Math.max(1.6, st.reduce((a, s) => a + s.level, 0));
    wg.lineWidth = 2.2; wg.strokeStyle = '#33212F'; wg.beginPath();
    for (let x = 0; x <= W; x += 2) {
      const tt = slow + (x / W) * span;
      let y = 0; st.forEach((s, i) => { y += s.level * (Math.sin(2 * Math.PI * s.hz * tt + i * 1.3) + 0.35 * Math.sin(4 * Math.PI * s.hz * tt + i)); });
      const py = mid - (y / norm) * (Hh * 0.42);
      x ? wg.lineTo(x, py) : wg.moveTo(x, py);
    }
    wg.stroke();
  };
  const now = $('now');
  let lastTop = '';

  /* ── the tour: arpeggios with a fingertip, silent, until someone touches it ── */
  const TOUR = [];
  const prog = ['C', 'Am', 'F', 'G'];
  prog.forEach((c, i) => {
    const base = i * 2.4, notes = CHORDS[c];
    TOUR.push({ t: base, view: i === 0 ? 'whole' : i === 1 ? 'keys' : i === 2 ? 'hammers' : 'inside' });
    notes.forEach((m, j) => TOUR.push({ t: base + 0.35 + j * 0.28, note: m }));
    TOUR.push({ t: base + 0.35 + 4 * 0.28, note: notes[2] + 12 });
  });
  TOUR.push({ t: 9.6, view: 'whole' });
  TOUR.sort((a, b) => a.t - b.t);
  const LOOP = 11.2;
  let lastInput = -1e9, tourT = 0, tourIdx = 0, touring = false, tap = null;
  const finger = $('pick'); finger.classList.add('finger');
  function touched() { lastInput = performance.now(); if (touring) { touring = false; finger.classList.remove('on'); $('scopeTag').textContent = 'live'; } }
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
      if (b.note) { const m = b.note; P.press(m, 0.62, { silent: true }); setTimeout(() => P.release(m), 420); tap = { m, t: 0 }; }
    }
    if (tourT >= LOOP) { tourT = 0; tourIdx = 0; }
  };

  let last = performance.now();
  frameHook = () => {
    const t = performance.now(), dt = Math.min(0.25, (t - last) / 1000); last = t;
    tourStep(dt);
    studio.camera.updateMatrixWorld();
    if (touring && tap) {
      tap.t += dt;
      const q = studio.project(studio.toWorld(P.keyTop(tap.m).add(V(0, 0.012 * (1 - ease(tap.t / 0.12)), 0))));
      finger.style.transform = `translate(${q.x}px, ${q.y}px)`; finger.classList.toggle('on', tap.t < 0.5);
    }
    if (labelsOn) for (let i = 0; i < LABELS.length; i++) {
      const q = studio.project(studio.toWorld(LABELS[i].at()));
      const off = q.x < 8 || q.y < 8 || q.x > studio.host.clientWidth - 8 || q.y > studio.host.clientHeight - 8 || !q.front;
      labEls[i].style.transform = `translate(${q.x}px, ${q.y}px)`; labEls[i].classList.toggle('hide', off);
    }
    const st = P.sounding().sort((a, b) => b.level - a.level).slice(0, 6).sort((a, b) => a.m - b.m);
    rows.forEach((r, i) => {
      const s = st[i];
      r.li.classList.toggle('empty', !s);
      if (!s) { r.nt.textContent = ''; r.nm.textContent = ''; r.hz.textContent = ''; r.bar.style.transform = 'scaleX(0)'; return; }
      r.nm.textContent = s.held ? 'held' : P.sustain ? 'pedal' : 'ringing'; r.nt.textContent = s.note; r.hz.textContent = `${s.hz.toFixed(1)} Hz`;
      r.bar.style.transform = `scaleX(${Math.min(1, s.level * 1.2).toFixed(3)})`; r.li.classList.add('ring');
    });
    const top = st.length ? st.map((s) => s.note).join(' ') : '';
    if (top !== lastTop) { lastTop = top; if (top) { now.textContent = st.length > 2 ? st.slice(-3).map((s) => s.note.replace(/\d/, '')).join(' ') : top; now.classList.add('hit'); setTimeout(() => now.classList.remove('hit'), 280); } }
    drawScope(st, t / 1000);
  };
  $('loading').hidden = true;
}
start();
