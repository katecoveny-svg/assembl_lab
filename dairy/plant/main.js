// Dairy plant floor: wires the shared twin kit (assets/twin/3) to this plant's layout, model and scene.
import { THREE, $, params, reduce, createViewer, loadModels, progressUI, createTour, createTags, createPaths, wireBar, setK, pct, num } from '../../assets/twin/3/kit.js';
import * as L from './layout.js';
import { Sim, ASSUME, MONTHS } from './sim.js';
import { World, FILES, TEX } from './world.js';

const viewer = createViewer({ canvas: $('#c'), stage: $('#stage'), bg: 0x150f15, fog: [220, 520],
  cam: { pos: [46, 74, 128], target: [-4, 2, -6], max: 330, min: 4 }, sun: { pos: [-60, 110, 50], box: [-110, 110, 70, -70, 20, 300] },
  clamp: { x: [-92, 100], z: [-50, 60], y: [0, 30] }, aoRadius: 0.8 });
const { camera, controls, scene } = viewer;

// ── the model and its levers ─────────────────────────────────────────────────────────────────────────────────────
const opts = { month: +(params.get('month') ?? 4), bays: 4, forklifts: 2 };
let sim = new Sim(opts), world = null;
const state = { speed: 20, running: !reduce };
$('#month').innerHTML = MONTHS.map((m, i) => `<option value="${i}"${i === opts.month ? ' selected' : ''}>${m}${i === 4 ? ' (peak)' : ''}</option>`).join('');

// ── tour ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const tank = () => { const k = sim.tankers.find(t => t.bay != null && t.state !== 'leave'); return k ? { x: k.pose.x, y: 1.5, z: k.pose.z + 4, off: [16, 11, 18] } : { x: -62, y: 1, z: 0, off: [18, 12, 22] }; };
const agent = (kind, n = 0) => { const a = sim.agents.filter(x => x.kind === kind && (x.active ?? true))[n] || sim.agents.find(x => x.kind === kind); return { x: a.pose.x, y: 1 + (a.pose.lift || 0) * 0.5, z: a.pose.z }; };
const STOPS = [
  { id: 'overview', title: 'The whole plant', pos: [46, 74, 128], target: [-4, 2, -6], fit: [[-78, 0, -15], [-78, 0, 15], [-40, 4, 26], [-36, 20, -21], [17, 44, -18], [29, 58, -26], [80, 0, -30], [80, 0, 12], [87, 3, 6]],
    text: 'A fictional New Zealand-style milk powder plant on one simulated day. Milk comes in by tanker on the left, is stored in six silos, dried to powder in the tower, and leaves on the right as 25 kg bags in containers.' },
  { id: 'bays', title: 'Tanker bays', pos: [-30, 30, 44], target: [-62, 1, 4], fit: [[-78, 0, -15], [-46, 0, -15], [-78, 0, 15], [-46, 7, 15], [-40, 3, 26]],
    text: () => `About ${num(sim.perDay)} tankers a day at this point in the season, more after each milking. A tanker takes the first free bay; the driver connects the hose, and nothing is pumped until the milk passes its test.` },
  { id: 'test', title: 'Milk testing', follow: 'sampler', off: [8, 18, -12],
    text: 'A technician walks out to each tanker for a sample and back to the lab for a rapid test. While she is out at one bay, the next tanker waits, so the test is often what holds a bay up.' },
  { id: 'silos', title: 'Raw milk silos', pos: [-6, 22, 30], target: [-28, 8, -14], fit: [[-39, 0, -5], [-17, 0, -5], [-39, 20, -24], [-17, 20, -24]],
    text: 'Six stainless silos, 300,000 litres each in this model. The lit gauges show how full they are. They buffer the gap between milk arriving in waves and the dryer drawing it steadily.' },
  { id: 'dryer', title: 'Evaporator and dryer', pos: [58, 36, 50], target: [6, 13, -14], fit: [[-9, 0, -4], [-9, 22, -28], [26, 40, -30], [32, 0, -9], [29, 52, -26], [26, 0, -6]],
    text: 'Falling-film evaporators take most of the water out, and the spray dryer turns the concentrate into powder at up to 30 tonnes an hour. About every 20 hours of running, the evaporator stops for a clean of about 4 hours, and milk keeps arriving.' },
  { id: 'packing', title: 'Bagging and palletising', pos: [42, 13, 2], target: [52, 1, -18], fit: [[36, 0, -25], [66, 0, -25], [38, 0, -11], [66, 0, -11], [55, 4.2, -23]],
    text: 'Two baggers fill 25 kg sacks at up to 12 a minute each. Belts carry them through a check-weigher to gantry palletisers that stack forty to a pallet, and the wrapper and label printer finish it.' },
  { id: 'store', title: 'Finished goods store', pos: [84, 17, 20], target: [58, 2, -4], fit: [[36, 0, -6.5], [68, 0, -6.5], [36, 6, -1.5], [68, 6, -1.5], [75, 0, -18], [75, 0, 10]],
    text: 'Forklifts clear the pick-up stands into the racking. New powder waits there for its test results before it ships, so containers are loaded from older stock. If the forklifts fall behind, pallets back up all the way to the baggers.' },
  { id: 'dock', title: 'Containers out', pos: [104, 16, 26], target: [80, 1, 1], fit: [[73, 0, -6], [88, 0, -6], [73, 0, 10], [88, 3, 10]],
    text: 'A 20 ft container takes 22 one-tonne pallets, two high. Each door gets a new truck a while after the last one leaves.' },
];
const tour = createTour({ stops: STOPS, viewer, follow: k => k === 'tanker' ? tank() : agent(k) });
const tags = createTags($('#tags'), [
  { text: 'Tanker bays', sub: 'Unload, test, pump', pos: [-62, 8.5, 0], stop: 1 },
  { text: 'Milk testing', sub: 'Rapid test before pumping', pos: [-40, 4.5, 25], stop: 2 },
  { text: 'Silos', sub: 'Six × 300,000 L', pos: [-28, 21, -14], stop: 3 },
  { text: 'Dryer tower', sub: 'Up to 30 t/h', pos: [17, 45, -18], stop: 4 },
  { text: 'Bagging lines', sub: 'Two baggers, two palletisers', pos: [48, 5.2, -18], stop: 5 },
  { text: 'Finished goods', sub: 'SimReady racking', pos: [52, 7.4, -4], stop: 6 },
  { text: 'Container dock', sub: 'Doors 1–2', pos: [83, 4.6, 2], stop: 7 },
], i => tour.choose(i));
const paths = createPaths(scene);

// ── panel ────────────────────────────────────────────────────────────────────────────────────────────────────────
const mins = s => s < 60 ? 'under a minute' : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)} h ${String(Math.round(s % 3600 / 60)).padStart(2, '0')}`;
const DRYER = { run: 'Running', ramp: 'Coming up to rate', clean: 'Stopped: evaporator clean', starved: 'Stopped: waiting for milk' };
const TRUCK = { away: 'On the road', arriving: 'Arriving', docking: 'Backing on', loading: 'Loading', closing: 'Sealing', leaving: 'Leaving' };
function updatePanel() {
  const m = sim.metrics();
  setK('clock', m.clock); setK('m-clock', m.clock); setK('month', m.month); setK('speed', `${state.speed}×`); setK('perDay', `${num(m.perDay)} tankers a day`);
  setK('baysBusy', `${m.baysBusy} of ${m.baysOpen} busy`); setK('forkBusy', `${pct(m.forkBusy)} busy`);
  setK('tankersIn', num(m.tankersIn)); setK('unloaded', num(m.unloaded)); setK('queue', num(m.queue)); setK('waitNow', m.queue ? mins(m.waitNow) : 'none');
  setK('avgWait', mins(m.avgWait)); setK('longWaits', num(m.longWaits)); setK('litres', `${num(m.litres / 1e6, 2)} million L`);
  setK('silo', `${pct(m.silo)} · ${num(m.siloL / 1000)}k L`); setK('dryer', m.held ? 'Turned down: bins full' : DRYER[m.dryer]); setK('rate', `${num(m.rate, 1)} t`);
  setK('clean', m.dryer === 'clean' ? `${mins(m.cleanLeft)} to go` : `in ${mins(m.cleanIn)} of running`); setK('powderT', `${num(m.powderT)} t`);
  setK('bins', m.bins.map(pct).join(' · ')); setK('bags', num(m.bags)); setK('onBelts', num(m.onBelts)); setK('palletsMade', num(m.palletsMade)); setK('pd', `${m.pd} of 4`);
  setK('store', `${m.store} of ${m.storeCap}`); setK('boxes', num(m.boxes)); setK('shipped', `${num(m.shipped)} t`);
  const mt = document.querySelector('[data-m="silo"]'); if (mt) mt.style.transform = `scaleX(${m.silo})`;
  const doors = $('#doors');
  m.trucks.forEach((d, i) => { let row = doors.children[i];
    if (!row) { row = document.createElement('li'); row.innerHTML = '<span class="d-n"></span><span class="d-l"></span><span class="d-bar"><i></i></span><span class="d-s"></span>'; doors.append(row); }
    row.querySelector('.d-n').textContent = d.door; row.querySelector('.d-l').textContent = `Door ${d.door}`;
    row.querySelector('i').style.transform = `scaleX(${d.state === 'away' ? 0 : d.n / ASSUME.boxTonnes})`;
    row.querySelector('.d-s').textContent = d.state === 'loading' ? `${d.n} of ${ASSUME.boxTonnes} pallets` : TRUCK[d.state]; row.dataset.state = d.state; });
  const ev = sim.events[0]; setK('event', ev ? `${sim.clock(ev.t)} · ${ev.text}` : 'The model day has just started');
  // live tags
  tags.setText(0, 'Tanker bays', m.queue ? `${m.baysBusy} of ${m.baysOpen} busy · ${m.queue} waiting` : `${m.baysBusy} of ${m.baysOpen} busy`);
  tags.setText(2, 'Silos', `${pct(m.silo)} full`);
  tags.setText(3, 'Dryer tower', m.rate > 0 ? `${num(m.rate, 1)} t/h` : DRYER[m.dryer].replace('Stopped: ', 'Stopped · '));
  tags.setText(4, 'Bagging lines', m.linesBlocked ? `${m.linesBlocked} held up · ${m.onBelts} bags on belts` : `${m.onBelts} bags on the belts`);
  tags.setText(5, 'Finished goods', `${m.store} of ${m.storeCap} pallets`);
}
function fillAssumptions() {
  const A = ASSUME, rows = [
    ['From the season model', `peak ${num(A.peakLitres / 1e6, 1)} million L a day; monthly shares from DCANZ 2022/23; ${num(A.tankerLitres)} L a tanker; ${A.litresPerKg} L of milk a kg of powder; dryer ${A.dryerTph} t/h; ${A.boxTonnes} t a container; evaporator runs about ${A.runHours} h between cleans of about ${A.cleanHours} h`],
    ['Tankers', `arrivals follow milking (busier mid-morning and evening); ${A.hookup / 60} min to connect; ${num(A.pumpLpm)} L a minute; ${A.rinse / 60} min to rinse and disconnect; ${L.TANKER.speed} m/s on site`],
    ['Testing', `${A.sampleTime} s to sample at the tanker, walking at ${A.walk} m/s; the rapid test takes ${A.testTime / 60} min once the sample is back in the lab`],
    ['Silos and dryer', `six silos of ${num(A.siloLitres)} L; dryer stops below ${pct(A.dryerStop)} and restarts above ${pct(A.dryerStart)}; ${A.ramp / 60} min back to full rate`],
    ['Bagging', `two bins of ${A.binKg / 1000} t; ${A.bagKg} kg sacks at ${A.bagsPerMin} a minute a line; ${A.bagsPerPallet} to a pallet; palletiser ${A.palletiser} s a bag, ${A.palletChange} s to change pallets`],
    ['Wrap and label', `${A.wrapCycle} s to wrap, ${A.labelTime} s to label (the same as the grocery DC twin)`],
    ['Forklifts', `${A.forklift} m/s, forks ${A.liftRate} m/s, ${A.handle} s to engage or release; ${L.SLOTS.length} rack places; ${A.storeStart} pallets released and ready to ship at 05:00`],
    ['Containers', `${A.boxTonnes} one-tonne pallets each; the next truck arrives ${A.boxGap / 60} min after one leaves a door`],
  ];
  $('#assume').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

// ── controls ─────────────────────────────────────────────────────────────────────────────────────────────────────
function restart() { sim = new Sim(opts); world.sim = sim; rebuildAgents(); updatePanel(); }
function rebuildAgents() { world.views.forEach((v, i) => { v.a = sim.agents[i]; }); for (const v of world.tankerViews) { v.id = null; v.truck.visible = v.trailer.visible = false; } }
$('#month').addEventListener('change', e => { opts.month = +e.target.value; restart(); });
document.querySelectorAll('[name="bays"]').forEach(r => r.addEventListener('change', () => { opts.bays = +r.value; sim.setBays(opts.bays); updatePanel(); }));
document.querySelectorAll('[name="forks"]').forEach(r => r.addEventListener('change', () => { opts.forklifts = +r.value; sim.setForklifts(opts.forklifts); updatePanel(); }));
$('#restart').addEventListener('click', restart);
$('#jump').addEventListener('click', () => { const T = 11 * 3600; if (sim.t >= T) restart(); const step = () => { let n = 0; while (sim.t < T && n < 7200) { sim.step(0.5); n++; } updatePanel(); if (sim.t < T) setTimeout(step, 0); }; step(); });
// a whole day for each change, run headless in small slices so the page stays responsive
$('#compare').addEventListener('click', () => {
  const rows = [['Your settings', {}], [`${opts.bays < 5 ? opts.bays + 1 : opts.bays - 1} bays`, { bays: opts.bays < 5 ? opts.bays + 1 : opts.bays - 1 }], [`${opts.forklifts > 1 ? opts.forklifts - 1 : 2} forklift${opts.forklifts - 1 === 1 ? '' : 's'}`, { forklifts: opts.forklifts > 1 ? opts.forklifts - 1 : 2 }], ['December', { month: 6 }]];
  const out = []; let i = 0, s = null; $('#compare').disabled = true; $('#whole').innerHTML = '<p class="src">Running whole days…</p>';
  const slice = () => {
    if (!s) s = new Sim({ ...opts, ...rows[i][1] });
    s.run(4 * 3600, 0.5);
    if (s.t >= 86400) { const m = s.metrics(); out.push({ n: rows[i][0], ...m }); s = null; i++; $('#whole').innerHTML = `<p class="src">Simulated ${i} of ${rows.length} days…</p>`; }
    if (i < rows.length) return setTimeout(slice, 0);
    const best = [...out].sort((a, b) => a.longWaits - b.longWaits)[0];
    $('#whole').innerHTML = `<table class="whole"><thead><tr><th>Day</th><th>Waited 30 min+</th><th>Longest wait</th><th>Powder</th><th>Containers</th></tr></thead><tbody>${out.map(r => `<tr class="${r === best ? 'best' : ''}"><td>${r.n}</td><td>${r.longWaits} of ${r.tankersIn}</td><td>${mins(r.longest)}</td><td>${num(r.powderT)} t</td><td>${r.boxes}</td></tr>`).join('')}</tbody></table><p class="src">05:00 to 05:00, ${MONTHS[opts.month]} unless the row says otherwise. Direction and size, not a forecast.</p>`;
    $('#compare').disabled = false;
  };
  setTimeout(slice, 20);
});

// ── frame loop ───────────────────────────────────────────────────────────────────────────────────────────────────
const clock = new THREE.Clock(); let acc = 0, panelT = 0, pathT = 0;
const maxFrames = +params.get('frames') || 0; let frameCount = 0;
function frame() {
  const raw = clock.getDelta(), dt = Math.min(raw, 0.1);
  if (state.running) { acc += dt * state.speed; let n = 0; while (acc > 0.5 && n < 600) { sim.step(0.5); acc -= 0.5; n++; } if (n >= 600) acc = 0; }
  world.sync(state.running ? dt : 0, camera.position, state.running ? state.speed : 0);
  tour.update(dt); controls.update();
  const f = tour.following(); if (f) { const p = f === 'tanker' ? tank() : agent(f); paths.focus(p, f === 'tanker' ? 3 : 1); } else paths.focus(null);
  pathT += dt; if (pathT > 0.2) { pathT = 0; updatePaths(); }
  panelT += dt; if (panelT > 0.25) { panelT = 0; updatePanel(); }
  tags.place(camera, $('#stage').clientWidth, $('#stage').clientHeight, $('#t-labels').checked);
  viewer.render(dt, raw);
  window.__dairy = { sim, viewer, world, tier: () => viewer.tier, fps: viewer.fps, calls: viewer.calls, tris: viewer.tris };
  if (maxFrames && ++frameCount >= maxFrames) { document.documentElement.classList.add('still'); return; }
  requestAnimationFrame(frame);
}
function updatePaths() {
  const list = [];
  for (const a of sim.agents) { if (!a.path || a.job === 'idle' || a.job === 'work' || (a.kind === 'forklift' && !a.active)) continue; const pts = a.path.remaining(sim.t - a.t0); if (pts.length > 1) list.push({ pts, vehicle: a.kind === 'forklift' }); }
  for (const k of sim.tankers) { if (!k.path || (k.loc && k.loc.t === 'off')) continue; const pts = k.path.remaining(sim.t - k.t0); if (pts.length > 1) list.push({ pts, vehicle: true }); }
  paths.update(list, $('#t-paths').checked);
}

// ── start ────────────────────────────────────────────────────────────────────────────────────────────────────────
(async () => {
  wireBar(tour, state, () => updatePanel()); fillAssumptions(); viewer.applyTier();
  const { assets, tex } = await loadModels({ files: FILES, tex: TEX, renderer: viewer.renderer, onProgress: progressUI }).catch(e => { console.error(e); $('#load-text').textContent = 'The 3D models did not load. Reload to try again.'; throw e; });
  world = new World(scene, assets, tex, sim);
  if (params.has('t')) { const T = +params.get('t'); while (sim.t < T) sim.step(0.5); }
  if (params.has('stop')) { tour.on = false; tour.chosen = STOPS[+params.get('stop')]?.follow ? +params.get('stop') : null; tour.go(+params.get('stop'), true); } else tour.go(0, true);
  tour.set(tour.on && !params.has('stop'));
  world.sync(0.016, camera.position, 1); updatePanel();
  if(params.get('pitch')==='1') { const {installPitch}=await import('./pitch-overlay.js'); installPitch({THREE,scene,camera,controls,tour}); }
  viewer.renderer.compile(scene, camera);
  $('#loader').classList.add('done'); setTimeout(() => { $('#loader').hidden = true; }, 600);
  document.documentElement.classList.add('ready');
  clock.getDelta(); requestAnimationFrame(frame);
})();
