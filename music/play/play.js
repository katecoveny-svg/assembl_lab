// assembl lab · play guitar. The guitar from the instrument studies, opened straight into playing, with nothing to learn first.
// Built to the lab's study standard: modelled in code, always something moving, numbered labels, views, a live readout
// drawn from the same state that moves the strings, and a tour that plays itself until someone touches it.
import { Studio, THREE, V } from '../engine.js';
import { Sound } from '../audio.js';
import guitar from '../guitar.js';

const $ = (id) => document.getElementById(id);
const ORDER = ['G', 'C', 'D', 'Em', 'Am', 'E', 'A', 'Dm', 'F'];
const IDLE_MS = 25000; // after this long untouched, the guitar plays its tour again
let coachGone = false, nowT = 0;
let frameHook = () => {};

const ui = {
  bind() {}, onLoad() {}, sync() {}, moveTip() {}, openCard() {}, closeCard() {}, setPlayPanel() {}, showPlay() {}, heroLoaded() {},
  hover() {},
  frame(studio) { frameHook(studio); },
  flash() { hideCoach(); },
};
const hideCoach = () => { if (!coachGone) { coachGone = true; $('coach').classList.add('gone'); } };

function diagram(shape) {
  // six strings, four frets, a dot where a finger goes and an x over a string that is not played
  const x = (i) => 3 + i * 5.6, y = (f) => 6 + (f - 0.5) * 6;
  let s = `<svg viewBox="0 0 34 30" aria-hidden="true"><g stroke="currentColor" stroke-width=".7" fill="none">`;
  for (let i = 0; i < 6; i++) s += `<line x1="${x(i)}" y1="6" x2="${x(i)}" y2="30"/>`;
  for (let f = 0; f <= 4; f++) s += `<line x1="3" y1="${6 + f * 6}" x2="31" y2="${6 + f * 6}" ${f === 0 ? 'stroke-width="1.6"' : ''}/>`;
  s += '</g>';
  shape.forEach((n, i) => {
    if (n > 0 && n <= 4) s += `<circle cx="${x(i)}" cy="${y(n)}" r="2.1" fill="currentColor"/>`;
    if (n < 0) s += `<text x="${x(i)}" y="4.2" font-size="4.6" text-anchor="middle" fill="currentColor">×</text>`;
  });
  return s + '</svg>';
}
const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

async function start() {
  let gl = false;
  try { gl = !!document.createElement('canvas').getContext('webgl2'); } catch { gl = false; }
  if (!gl) { $('loading').textContent = 'This needs WebGL 2, which this browser has turned off.'; return; }
  const sound = new Sound();
  const studio = new Studio({ host: $('canvas'), ui, sound });
  window.__studio = studio;
  // the guitar modelled in code (no take-apart, no generated model), lit like a product shot, framed like you are holding it
  // wide screens: the guitar across the screen; tall screens: looking up the neck, so you swipe sideways across the strings
  const wide = innerWidth > innerHeight * 0.9;
  const dir = wide ? V(0.55, 0.8, 0.42) : V(-0.42, 0.9, 0.62);
  const def = { ...guitar, hero: null, studioEnv: 'softbox', cam: { ...guitar.cam, dir, play: { target: V(0, wide ? 0.0 : -0.2, 0.08), radius: wide ? 0.8 : 0.68, dir } } };
  await studio.load(def);
  // a soft warm light behind it
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(256, 230, 30, 256, 256, 360);
  gr.addColorStop(0, '#FBF7F3'); gr.addColorStop(0.6, '#F2EAE6'); gr.addColorStop(1, '#E6D8DE');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  const bg = new THREE.CanvasTexture(cv); bg.colorSpace = THREE.SRGBColorSpace; studio.scene.background = bg;
  studio.ground.material.opacity = 0.12;
  studio.setMode('play');
  const P = studio.built.play;

  /* ── views: directions built from the guitar's own axes, so they hold whatever way it is turned ── */
  const axis = (x, y, z) => studio.toWorld(V(x, y, z)).sub(studio.toWorld(V())).normalize();
  const along = axis(0, 1, 0), across = axis(1, 0, 0), up = axis(0, 0, 1);
  const mix = (a, b, c) => along.clone().multiplyScalar(a).addScaledVector(across, b).addScaledVector(up, c).normalize();
  const VIEWS = {
    whole: { target: V(0, wide ? 0.0 : -0.2, 0.08), radius: wide ? 0.8 : 0.68, dir },
    soundhole: { target: V(0, -0.4, 0.08), radius: wide ? 0.34 : 0.3, dir: mix(-0.45, 0.28, 0.85) },
    neck: { target: V(0, 0.3, 0.09), radius: wide ? 0.42 : 0.36, dir: mix(-0.2, 0.62, 0.76) },
    head: { target: V(0, 0.93, 0.03), radius: wide ? 0.25 : 0.22, dir: mix(0.35, -0.42, 0.84) },
  };
  let view = 'whole';
  const setView = (k) => {
    const v = VIEWS[k]; if (!v) return;
    view = k; studio.def.cam.play = { target: v.target, radius: v.radius, dir: v.dir }; studio.zoom = 1; studio.dirGoal = v.dir.clone().normalize();
    $('views').querySelectorAll('[data-v]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === k)));
  };
  $('views').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { setView(b.dataset.v); } });

  /* ── numbered labels: each names a real part and opens its notes ── */
  const TOP = 0.073;
  const partBy = (id) => studio.parts.find((p) => p.id === id);
  const LABELS = [
    { n: 1, id: 'top', at: () => V(-0.2, -0.47, TOP) },
    { n: 2, id: 'bridge', at: () => V(-0.118, -0.571, TOP + 0.016) },
    { n: 3, id: 'guard', at: () => V(0.2, -0.36, TOP + 0.002), title: 'The tūī' },
    { n: 4, id: 'string2', at: () => P.fretPoint(2, 9) },
    { n: 5, id: 'board', at: () => P.fretPoint(4, 5).add(V(0.01, 0, -0.003)) },
    { n: 6, id: 'headstock', at: () => V(0, 0.95, 0.05) },
  ];
  const lw = $('labels');
  lw.innerHTML = LABELS.map((l) => `<button type="button" class="lab" data-n="${l.n}" aria-label="${l.n}: ${(l.title || partBy(l.id)?.name || '').replace(/"/g, '')}">${l.n}</button>`).join('');
  const labEls = [...lw.querySelectorAll('.lab')];
  let labelsOn = innerWidth > 700;
  const syncLabels = () => { lw.classList.toggle('off', !labelsOn); $('lblBtn').setAttribute('aria-pressed', String(labelsOn)); };
  $('lblBtn').addEventListener('click', () => { labelsOn = !labelsOn; syncLabels(); }); syncLabels();
  const openCard = (l) => {
    const p = partBy(l.id); if (!p) return;
    $('cardK').textContent = `${l.n} · ${p.cat}`;
    $('cardH').textContent = l.title || p.name; $('cardP').textContent = p.desc; $('cardS').textContent = p.spec;
    $('card').hidden = false;
  };
  lw.addEventListener('click', (e) => { const b = e.target.closest('.lab'); if (b) openCard(LABELS.find((l) => l.n === +b.dataset.n)); });
  $('cardX').addEventListener('click', () => { $('card').hidden = true; });

  /* ── chord pads ── */
  $('pads').innerHTML = ORDER.map((c, i) => `<button type="button" class="pad" data-c="${c}" aria-pressed="false" aria-label="${c} chord"><kbd>${i + 1}</kbd><b>${c}</b>${diagram(P.shapes[c])}</button>`).join('');
  const play = (c, vel = 0.75) => { sound.ensure(); hideCoach(); P.setChord(c); P.strum(true, vel); };
  $('pads').addEventListener('click', (e) => { const b = e.target.closest('.pad'); if (b) play(b.dataset.c); });
  $('strum').addEventListener('click', () => { sound.ensure(); hideCoach(); P.strum(true, 0.8); });
  const setMute = (on) => { P.setMute(on); $('mute').setAttribute('aria-pressed', String(on)); $('ring').setAttribute('aria-pressed', String(!on)); };
  $('mute').addEventListener('click', () => setMute(true));
  $('ring').addEventListener('click', () => setMute(false));
  const now = () => {
    $('pads').querySelectorAll('.pad').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.c === P.chord)));
    const el = $('now'); el.textContent = P.chord; el.classList.add('hit'); clearTimeout(nowT); nowT = setTimeout(() => el.classList.remove('hit'), 300);
  };
  P.on(now); now();
  // keys: 1–9 chords, space strums (shift for an up-stroke), m mutes
  addEventListener('keydown', (e) => {
    touched(); // playing from the keyboard hands control over too (this handler stops the event reaching later listeners)
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[1-9]$/.test(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) play(ORDER[+e.key - 1]); }
    else if (e.key === ' ') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) { sound.ensure(); hideCoach(); P.strum(!e.shiftKey, 0.8); } }
    else if (e.key === 'm' || e.key === 'M') { e.stopImmediatePropagation(); setMute(!P.mute); }
  }, { capture: true });

  /* ── the live readout: one row per string and a trace of what they sum to ── */
  $('strs').innerHTML = P.state().map((s) => `<li><span class="nm">${s.name}</span><b class="nt">–</b><span class="hz"></span><i class="bar"><i></i></i></li>`).join('');
  const rows = [...$('strs').children].map((li) => ({ nt: li.querySelector('.nt'), hz: li.querySelector('.hz'), bar: li.querySelector('.bar > i'), li, last: '' }));
  const wave = $('wave'), wg = wave.getContext('2d');
  const drawScope = (st, t) => {
    const W = wave.width, Hh = wave.height, mid = Hh / 2;
    wg.clearRect(0, 0, W, Hh);
    wg.strokeStyle = 'rgba(101,74,78,.18)'; wg.lineWidth = 1; wg.beginPath(); wg.moveTo(0, mid); wg.lineTo(W, mid); wg.stroke();
    const total = st.reduce((a, s) => a + s.level, 0);
    if (total < 0.004) return;
    // 25 ms of the six strings added together, slowed so the eye can follow it
    const span = 0.025, slow = t * 0.02;
    wg.lineWidth = 2.2; wg.strokeStyle = '#33212F'; wg.beginPath();
    for (let x = 0; x <= W; x += 2) {
      const tt = slow + (x / W) * span;
      let y = 0; st.forEach((s, i) => { if (s.level > 0) y += s.level * Math.sin(2 * Math.PI * s.hz * tt + i * 1.7) * (1 + 0.25 * Math.sin(2 * Math.PI * s.hz * 2 * tt)); });
      const py = mid - (y / 3.2) * (Hh * 0.46);
      x ? wg.lineTo(x, py) : wg.moveTo(x, py);
    }
    wg.stroke();
  };

  /* ── the tour: plays itself (silently) until someone touches it, and again after 25 s alone ── */
  const TOUR = [
    { t: 0.0, view: 'whole', chord: 'G' }, { t: 2.6, chord: 'Em' }, { t: 5.2, view: 'soundhole', chord: 'C' }, { t: 7.8, chord: 'D' },
    { t: 10.4, view: 'neck', chord: 'Am' }, { t: 13.0, chord: 'E' }, { t: 15.6, view: 'whole', chord: 'G' },
  ];
  const LOOP = 18.2;
  let lastInput = -1e9, tourT = 0, tourIdx = 0, touring = false, sweep = null;
  const pick = $('pick');
  function touched() { lastInput = performance.now(); if (touring) { touring = false; pick.classList.remove('on'); $('scopeTag').textContent = 'live'; } }
  for (const ev of ['pointerdown', 'pointerup', 'wheel', 'keydown', 'touchstart']) addEventListener(ev, touched, { capture: true, passive: true });
  window.__tour = () => ({ touring, idle: performance.now() - lastInput });
  const beginTour = () => { touring = true; tourT = 0; tourIdx = 0; $('scopeTag').textContent = 'playing itself'; $('card').hidden = true; };
  setTimeout(() => { if (performance.now() - lastInput > 2400) beginTour(); }, 2600);
  const tourStep = (dt) => {
    if (!touring) { if (performance.now() - lastInput > IDLE_MS) beginTour(); return; }
    tourT += dt;
    while (tourIdx < TOUR.length && tourT >= TOUR[tourIdx].t) {
      const b = TOUR[tourIdx++];
      if (b.view && b.view !== view) setView(b.view);
      if (b.chord) { P.setChord(b.chord); sweep = { t: 0, fired: false }; }
    }
    if (tourT >= LOOP) { tourT = 0; tourIdx = 0; }
  };
  const strumLine = P.strumLine();
  const placePick = (dt) => {
    if (!touring || !sweep) { return; }
    sweep.t += dt;
    // a short approach, then down across all six strings
    const k = ease((sweep.t - 0.35) / 0.32), a = strumLine[0], b = strumLine[1];
    const w = studio.toWorld(a.clone().lerp(b, k).add(V(0, 0, 0.004)));
    const q = studio.project(w);
    pick.style.transform = `translate(${q.x}px, ${q.y}px) rotate(-18deg)`;
    pick.classList.toggle('on', sweep.t < 1.1);
    if (!sweep.fired && sweep.t > 0.35) { sweep.fired = true; P.strum(true, 0.72, { silent: true }); }
  };

  /* ── every frame: labels, pick, readout, tour ── */
  let last = performance.now();
  frameHook = () => {
    const t = performance.now(), dt = Math.min(0.25, (t - last) / 1000); last = t; // real time, so the tour keeps time on a slow device
    tourStep(dt);
    studio.camera.updateMatrixWorld(); // place labels against this frame's camera, not the last one
    placePick(dt);
    if (labelsOn) for (let i = 0; i < LABELS.length; i++) {
      const q = studio.project(studio.toWorld(LABELS[i].at()));
      const off = q.x < 8 || q.y < 8 || q.x > studio.host.clientWidth - 8 || q.y > studio.host.clientHeight - 8 || !q.front;
      labEls[i].style.transform = `translate(${q.x}px, ${q.y}px)`; labEls[i].classList.toggle('hide', off);
    }
    const st = P.state();
    st.forEach((s, i) => {
      const r = rows[i], key = `${s.note}|${s.muted}`;
      if (key !== r.last) { r.last = key; r.nt.textContent = s.muted ? '×' : s.note; r.hz.textContent = s.muted ? 'not played' : `${s.hz.toFixed(1)} Hz`; r.li.classList.toggle('muted', s.muted); }
      r.bar.style.transform = `scaleX(${Math.min(1, s.level * 1.25).toFixed(3)})`; r.li.classList.toggle('ring', s.level > 0.06);
    });
    drawScope(st, t / 1000);
  };

  $('loading').hidden = true;
}
start();
