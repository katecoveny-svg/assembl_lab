// Emergency department floor: the department page's own model (/ed/sim.js, unchanged) drawn with the shared twin kit.
import { THREE, $, params, reduce, createViewer, loadModels, progressUI, createTour, createTags, createPaths, wireBar, setK, pct, num } from '../../assets/twin/3/kit.js';
import { ED } from '../sim.js';
import * as L from './layout.js';
import { World, FILES, TEX } from './world.js';

const viewer = createViewer({ canvas: $('#c'), stage: $('#stage'), bg: 0x150f15, fog: [140, 360],
  cam: { pos: [24, 30, 40], target: [-3, 0, -4], max: 200, min: 3 }, sun: { pos: [-30, 60, 30], box: [-64, 64, 46, -46, 10, 160] },
  clamp: { x: [-40, 64], z: [-26, 30], y: [0, 6] }, aoRadius: 0.4, exposure: 1.05 });
const { camera, controls, scene } = viewer;

// ── the model: the same settings, seed and start as the department page (Monday mid-morning after two days' warm-up) ─
const S = { ...ED.BASE }, NZ = { pct: 0.744, period: 'January–March 2026', source: 'Health NZ' };
let st = null, world = null;
function start() { st = ED.newState(S, 7); st.t = 5 * 1440; while (st.t < 7 * 1440 + 600) ED.step(S, st); }
start();
const state = { speed: 10, running: !reduce };
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const clockText = () => { const t = st.t, d = ED.dayOf(t) % 7, m = t % 1440, h = Math.floor(m / 60), mm = m % 60; return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };
const dayText = () => DAYS[ED.dayOf(st.t) % 7];
const mins = m => m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')}`;
function syncDocs() { while (st.docs.length < S.doctors) st.docs.push({ p: null }); while (st.docs.length > S.doctors) { const d = st.docs.pop(); if (d.p) d.p.state = 'needdoc'; } }

// ── tour ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const followPt = () => { const p = st.pts.filter(q => !q.amb && (q.state === 'triage' || q.state === 'wait')).sort((a, b) => b.arr - a.arr)[0]; const w = p && world && world.vis.get(p.id); return w ? { x: w.x, y: 1, z: w.z } : { x: -24, y: 1, z: 12 }; };
const STOPS = [
  { id: 'overview', title: 'The whole department', pos: [24, 30, 40], target: [-3, 0, -4],
    text: 'A generic large city emergency department of about 280 visits a day, the same simulated department as the page before this one, now on a floor of NVIDIA SimReady hospital beds, curtains and monitors.' },
  { id: 'door', title: 'The front door', pos: [-10, 13, 34], target: [-24, 0, 12],
    text: () => `About ${num(ED.arrivalsPerMin(S, st.t) * 60)} people arrive this hour. Walk-ins take a seat until triage; right now ${st.pts.filter(p => p.state === 'wait' && !p.amb).length} are waiting to be seen.` },
  { id: 'triage', title: 'Triage: most urgent first', pos: [-2, 7, 22], target: [-10, 0, 14],
    text: 'Two triage nurses sort everyone by urgency in two to six minutes each. The most urgent are seen first, so the longest waits fall on the least urgent.' },
  { id: 'cubicles', title: 'Cubicles and the bottleneck upstairs', pos: [14, 18, 10], target: [6, 0, -10],
    text: () => `44 curtained cubicles. An amber light over a cubicle means its patient is ready for a ward but has no bed, so the cubicle can't take the next person. Right now ${st.pts.filter(p => p.state === 'board').length} are waiting for a ward bed.` },
  { id: 'resus', title: 'Resus', pos: [20, 10, -2], target: [30, 0, -14],
    text: 'Four resus bays with surgical lights, monitors and a crash cart. Triage 1 patients go straight in.' },
  { id: 'minors', title: 'Minors', pos: [-14, 12, 0], target: [-26, 0, -15],
    text: 'Fourteen treatment chairs for triage 4 and 5. Turn on the fast-track stream and two dedicated clinicians work here with quicker tests.' },
  { id: 'ambulance', title: 'Ambulance bay', pos: [62, 14, 30], target: [46, 0, 10],
    text: 'One ambulance is drawn for each patient not yet handed over. When the department is full, they queue down the drive.' },
  { id: 'walk', title: 'One patient’s visit', follow: 'pt', off: [5, 6, 8],
    text: 'Following the newest walk-in from the door. Every move is the model deciding: triage, a seat, a space, a doctor, tests, then home or a ward.' },
];
const tour = createTour({ stops: STOPS, viewer, follow: () => followPt() });
const tags = createTags($('#tags'), [
  { text: 'Waiting room', sub: '40 seats', pos: [-27, 2.6, 13], stop: 1 },
  { text: 'Triage', sub: 'Two nurses', pos: [-9.6, 2.4, 14], stop: 2 },
  { text: 'Cubicles', sub: '44 beds', pos: [6, 2.8, -10], stop: 3 },
  { text: 'Resus', sub: '4 bays', pos: [30, 2.6, -14], stop: 4 },
  { text: 'Minors', sub: '14 chairs', pos: [-26, 2.4, -15], stop: 5 },
  { text: 'Ambulance bay', sub: 'Handovers', pos: [48, 5.4, 10], stop: 6 },
  { text: 'Doctors’ station', sub: 'Doctors on the floor', pos: [7.5, 2.2, 8], stop: null, quiet: true },
], i => tour.choose(i));
const paths = createPaths(scene);

// ── panel ────────────────────────────────────────────────────────────────────────────────────────────────────────
function updatePanel() {
  const s = ED.stats(st), inZ = w => st.pts.filter(p => p.where === w).length;
  setK('clock', clockText()); setK('m-clock', clockText()); setK('speed', `${state.speed} min a second`); setK('day', dayText());
  setK('p6', `${num(s.within6 * 100)}%`); const bar = document.querySelector('[data-m="p6"]'); if (bar) bar.style.transform = `scaleX(${Math.min(1, s.within6)})`;
  setK('inED', num(s.inED)); setK('wait', num(s.wait)); setK('board', num(s.board)); setK('ramp', num(s.ramped)); setK('med', mins(s.med)); setK('long', mins(s.longest));
  setK('cub', `${inZ('cub')} of ${S.cubicles}`); setK('resus', `${inZ('resus')} of ${S.resus}`); setK('ft', `${inZ('ft')} of ${S.ftChairs}`);
  setK('docs', `${st.docs.filter(d => d.p).length} of ${S.doctors} with a patient`); setK('ward', num(Math.floor(st.wardFree))); setK('rate', `${num(ED.arrivalsPerMin(S, st.t) * 60)} an hour`);
  setK('doctorsV', S.doctors); setK('bedsV', S.extraBeds ? `+${S.extraBeds}` : 'none');
  tags.setText(0, 'Waiting room', `${st.pts.filter(p => p.state === 'wait' && !p.amb).length} waiting · seats ${Math.min(40, st.pts.filter(p => p.state === 'wait' && !p.amb).length)}/40`);
  tags.setText(2, 'Cubicles', `${inZ('cub')}/${S.cubicles} · ${s.board} waiting for a ward bed`);
  tags.setText(3, 'Resus', `${inZ('resus')}/4 in use`); tags.setText(4, 'Minors', `${inZ('ft')}/${S.ftChairs}${S.fastTrack ? ' · fast-track on' : ''}`);
  tags.setText(5, 'Ambulance bay', `${world ? world.inAmb : 0} not yet handed over`);
}

// ── levers (the department page's), applied straight away; and a week for each change ───────────────────────────
const seg = (name, key, f = Number) => document.querySelectorAll(`[name="${name}"]`).forEach(r => { if (f(r.value) === S[key]) r.checked = true; r.addEventListener('change', () => { S[key] = f(r.value); if (key === 'doctors') syncDocs(); updatePanel(); }); });
seg('doctors', 'doctors'); seg('beds', 'extraBeds');
$('#ft').addEventListener('change', e => { S.fastTrack = e.target.checked; updatePanel(); });
$('#early').addEventListener('change', e => { S.earlyDischarge = e.target.checked; updatePanel(); });
$('#reset').addEventListener('click', () => { Object.assign(S, ED.BASE); document.querySelectorAll('[name="doctors"],[name="beds"]').forEach(r => { r.checked = (r.name === 'doctors' ? +r.value === S.doctors : +r.value === 0); }); $('#ft').checked = false; $('#early').checked = false; syncDocs(); updatePanel(); });
$('#restart').addEventListener('click', () => { start(); syncDocs(); world.vis.clear(); Object.values(world.slots).forEach(m => m.clear()); updatePanel(); });
$('#compare').addEventListener('click', () => {
  const base = { ...S }, rows = [['Your settings', {}], ['Two more doctors', { doctors: base.doctors + 2 }], ['Fast-track stream', { fastTrack: true }], ['Ward discharges before 11am', { earlyDischarge: true }], ['A new 28-bed ward', { extraBeds: 28 }]]
    .filter(([n, ch]) => n === 'Your settings' || Object.keys(ch).some(k => ch[k] !== base[k]));
  const out = []; let i = 0; $('#compare').disabled = true; $('#whole').innerHTML = '<p class="src">Simulating a week for each…</p>';
  const next = () => { if (i >= rows.length) { const b = out[0], best = out.slice(1).sort((x, y) => y.within6 - x.within6)[0];
      $('#whole').innerHTML = `<table class="whole"><thead><tr><th>Week</th><th>Seen in 6 h</th><th>Median wait</th><th>Ward-bed waits</th></tr></thead><tbody>${out.map(r => `<tr class="${r === best && r.within6 > b.within6 + 0.005 ? 'best' : ''}"><td>${r.n}</td><td>${num(r.within6 * 100)}%</td><td>${mins(r.medWait)}</td><td>${num(r.board, 1)}</td></tr>`).join('')}</tbody></table><p class="src">One simulated week each, same arrivals. Direction and size, not a forecast.</p>`;
      $('#compare').disabled = false; return; }
    const [n, ch] = rows[i++]; out.push({ n, ...ED.week({ ...base, ...ch }, 11) }); setTimeout(next, 10); };
  setTimeout(next, 30);
});

// ── frame loop ───────────────────────────────────────────────────────────────────────────────────────────────────
const clock = new THREE.Clock(); let acc = 0, panelT = 0;
const maxFrames = +params.get('frames') || 0; let frameCount = 0;
function frame() {
  const raw = clock.getDelta(), dt = Math.min(raw, 0.1);
  if (state.running) { acc += dt * state.speed; let n = 0; while (acc >= 1 && n < 200) { ED.step(S, st); acc -= 1; n++; } }
  world.sync(st, S, state.running ? Math.max(dt, 0.016) : dt, camera.position);
  tour.update(dt); controls.update();
  const f = tour.following(); paths.focus(f ? followPt() : null);
  panelT += dt; if (panelT > 0.25) { panelT = 0; updatePanel(); }
  tags.place(camera, $('#stage').clientWidth, $('#stage').clientHeight, $('#t-labels').checked);
  viewer.render(dt, raw);
  window.__edf = { st, S, viewer, world, tier: () => viewer.tier, fps: viewer.fps, calls: viewer.calls, tris: viewer.tris };
  if (maxFrames && ++frameCount >= maxFrames) { document.documentElement.classList.add('still'); return; }
  requestAnimationFrame(frame);
}

(async () => {
  wireBar(tour, state, () => updatePanel()); viewer.applyTier();
  $('#nz').textContent = `${num(NZ.pct * 100, 1)}%`; $('#nz-src').textContent = `${NZ.source}, ${NZ.period}`;
  const { assets, tex } = await loadModels({ files: FILES, tex: TEX, renderer: viewer.renderer, onProgress: progressUI }).catch(e => { console.error(e); $('#load-text').textContent = 'The 3D models did not load. Reload to try again.'; throw e; });
  world = new World(scene, assets, tex);
  if (params.has('t')) { const T = +params.get('t'); for (let i = 0; i < T; i++) ED.step(S, st); }
  if (params.has('stop')) { tour.on = false; tour.chosen = STOPS[+params.get('stop')]?.follow ? +params.get('stop') : null; tour.go(+params.get('stop'), true); } else tour.go(0, true);
  tour.set(tour.on && !params.has('stop'));
  for (let i = 0; i < 40; i++) world.sync(st, S, 0.1, camera.position);   // settle everyone into place
  updatePanel(); viewer.renderer.compile(scene, camera);
  $('#loader').classList.add('done'); setTimeout(() => { $('#loader').hidden = true; }, 600);
  document.documentElement.classList.add('ready');
  clock.getDelta(); requestAnimationFrame(frame);
})();
