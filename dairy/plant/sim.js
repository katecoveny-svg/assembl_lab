// The milk powder plant model. Plain JavaScript, no rendering: the scene reads this state every frame and draws it.
// Every number the page shows comes from here. Inputs are either the season model's own figures on /dairy/ (marked
// SEASON) or this page's assumptions, and both are listed on the page. A tanker's time on site, a pallet's time in the
// hall and a forklift's drive are each built from distances, speeds and handling times, so queues form for real reasons.
import * as L from './layout.js';
import { mulberry32, clockAt } from '../../assets/twin/3/path.js';

export const MONTHS = ['June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'];
export const ASSUME = {
  // SEASON: the same figures as the season model on /dairy/ (its PEAK_L, SHARE, TANKER, L_PER_KG, DRYER_TPH, BOX_T)
  peakLitres: 4.4e6,       // litres a day in October, the peak month
  share: [1.1, 1.3, 6.1, 11.1, 13.5, 12.7, 11.7, 10.8, 8.8, 9.3, 8.2, 5.4], // % of the year's milk each month, June to May
  tankerLitres: 28000,     // one truck-and-trailer load
  litresPerKg: 7.5,        // litres of milk for a kilogram of whole milk powder
  dryerTph: 30,            // tonnes of powder an hour at full rate
  boxTonnes: 22,           // tonnes in a 20 ft container
  runHours: 20, cleanHours: 4, // evaporator: runs about 20 h between cleans, about 4 h a clean (the season model's estimate)
  // this page's assumptions
  shiftStart: 5 * 3600,    // the model day starts at 05:00
  hookup: 240,             // s for the driver to connect, vent and start the pump
  pumpLpm: 2000,           // litres a minute through the unloading pump
  rinse: 180,              // s to stop, rinse the line and disconnect
  sampleTime: 90,          // s to take a sample at the tanker
  testTime: 300,           // s for the rapid test in the lab after the sample comes back
  walk: 1.25,              // m/s walking
  siloLitres: 300000,      // each of six raw milk silos
  startLevel: 0.42,        // silos at 05:00
  dryerStop: 0.04, dryerStart: 0.22, // the dryer stops below 4% of the silo farm and restarts above 22%
  ramp: 1800,              // s for the dryer to come back to full rate after a clean or a stop
  binKg: 60000,            // each of two powder bins over the baggers
  bagKg: 25, bagsPerMin: 12, bagsPerPallet: 40,
  palletiser: 4.5,         // s to place one bag
  palletChange: 25,        // s to push out a full pallet and bring in an empty one
  outfeedMove: 6,          // s for a pallet to roll one place on
  wrapIn: 8, wrapCycle: 52, labelTime: 18, // the same turntable wrapper and print-and-apply label as the DC twin
  forklift: 2.2, liftRate: 0.32, handle: 4,
  boxGap: 4800,            // s between one container truck leaving a door and the next arriving
  dockMove: 40, closeUp: 60, arrive: 50,
  storeStart: 110,         // pallets in the finished goods store at 05:00, from earlier days and released to ship
  // tanker arrivals through the day, relative (milking is morning and afternoon, so pickups bunch after both)
  hourly: [3, 2, 2, 2, 3, 4, 6, 7, 8, 8, 7, 6, 5, 4, 5, 6, 7, 8, 8, 7, 6, 5, 4, 3],
};
const HOURLY = (() => { const s = ASSUME.hourly.reduce((a, b) => a + b); return ASSUME.hourly.map(x => x / s); })();
export const BAGS_PER_PALLET = ASSUME.bagsPerPallet;

export class Sim {
  constructor({ month = 4, bays = 4, forklifts = 2, runHours = 20, seed = 7 } = {}) {
    const A = ASSUME;
    this.o = { month, bays, forklifts, runHours, seed }; this.rand = mulberry32(seed); this.t = 0; this.events = [];
    this.perDay = A.peakLitres * A.share[month] / 13.5 / A.tankerLitres;
    this.nextId = 1; this.pallets = new Map(); this.tankers = []; this.queue = []; this.done = [];
    this.bays = L.BAYS.x.map((x, i) => ({ i, open: i < bays, tanker: null }));
    this.silo = { L: A.startLevel * A.siloLitres * 6, cap: A.siloLitres * 6 };
    this.dryer = { state: 'run', rate: A.dryerTph, runSec: 9 * 3600, cleanLeft: 0, ramp: 1, since: 0 };
    this.bins = [0, 1].map(() => ({ kg: A.binKg * 0.5 }));
    this.lines = [0, 1].map(i => ({ i, bags: [], acc: 0, pal: null, busy: 0, change: 0, out: [null, null], blocked: false }));
    this.wrapper = { p: null, state: 'idle', left: 0, prog: 0, angle: 0, busy: 0 };
    this.pd = [null, null, null, null];
    this.slots = new Array(L.SLOTS.length).fill(null);
    this.trucks = L.DOORS.map((d, i) => ({ i, door: d.id, state: 'away', left: i === 0 ? 0 : 900, n: 0, claimed: 0, offset: 40, places: [] }));
    this.c = { tankersIn: 0, unloaded: 0, litres: 0, powderKg: 0, bags: 0, palletsMade: 0, wrapped: 0, shipped: 0, boxes: 0, waits: [], siloFullSec: 0, dryerRunSec: 0 };
    this.agents = []; this.sampleQ = []; this.slotClaim = new Set();
    // people and vehicles
    for (let i = 0; i < 3; i++) this.addAgent('forklift', L.CHARGE(i), { active: i < forklifts, pose: { x: L.CHARGE(i).x, z: L.CHARGE(i).z, yaw: Math.PI, lift: 0 } });
    this.addAgent('sampler', L.QA_LAB.door, {});
    this.addAgent('patrol', L.PATROL[0], { leg: 0 });
    L.LINE_OPS.forEach((p, i) => this.addAgent('lineop', p, { line: i }));
    // the store and the first container start part-way through the day
    const slots = [...L.SLOTS].sort((a, b) => a.lv - b.lv || b.bay - a.bay);
    for (let k = 0; k < A.storeStart; k++) { const s = slots[k * 2 % slots.length] && this.slots[slots[k * 2 % slots.length].id] === null ? slots[k * 2 % slots.length] : slots.find(q => this.slots[q.id] === null);
      const p = this.newPallet({ bags: A.bagsPerPallet, wrapped: true, labelled: true, made: -3600 * (1 + this.rand() * 8) }); p.where = { t: 'rack', slot: s.id }; this.slots[s.id] = p.id; }
    const tr = this.trucks[0]; tr.state = 'loading'; tr.offset = 0;
    for (let k = 0; k < 8; k++) { const p = this.newPallet({ bags: A.bagsPerPallet, wrapped: true, labelled: true }); p.where = { t: 'box', truck: 0, k }; tr.places[k] = p.id; tr.n++; }
    // two tankers already unloading, one waiting
    this.arrive(0, { bay: 0, stage: 'pump', pumped: 0.55 }); this.arrive(0, { bay: 2, stage: 'hookup' }); this.arrive(0, {});
    this.lines.forEach(l => { l.pal = this.newPallet({ bags: 14 + l.i * 9 }); l.pal.where = { t: 'line', line: l.i }; });
    this.log('The model day starts at 05:00 with the silos at ' + Math.round(A.startLevel * 100) + '%');
  }
  newPallet(o) { const p = { id: this.nextId++, bags: 0, wrapped: false, labelled: false, made: this.t, where: null, claim: null, ...o }; this.pallets.set(p.id, p); return p; }
  addAgent(kind, at, extra) { const a = { id: this.agents.length, kind, path: null, t0: 0, fired: 0, job: 'idle', busy: 0, pose: { x: at.x, z: at.z, yaw: 0, lift: 0, moving: false, tag: null }, ...extra }; this.agents.push(a); return a; }
  log(text) { this.events.unshift({ t: this.t, text }); if (this.events.length > 40) this.events.pop(); }
  clock(t = this.t) { return clockAt(ASSUME.shiftStart, t); }
  hour() { return Math.floor((ASSUME.shiftStart + this.t) / 3600) % 24; }
  go(a, path, job) { a.path = path; a.t0 = this.t; a.fired = 0; a.job = job; path.sample(0, a.pose); }
  fn(path, f) { path.steps[path.steps.length - 1].fn = f; return path; }

  // ── tankers ────────────────────────────────────────────────────────────────────────────────────────────────────
  arrive(t, pre = {}) {
    const k = { id: this.nextId++, arr: this.t, state: 'queue', bay: null, loc: null, path: null, t0: this.t, litres: ASSUME.tankerLitres, pumped: 0, left: 0, sampled: false, testAt: null, drv: null, pose: { x: L.ENTRY.x, z: L.ENTRY.z, yaw: Math.PI, s: 0 } };
    this.tankers.push(k); this.c.tankersIn++;
    if (pre.bay != null) { // already in a bay when the day starts
      const b = this.bays[pre.bay]; b.tanker = k.id; k.bay = pre.bay; k.state = pre.stage; k.sampled = true; k.testAt = -1; k.wait = 0;
      k.path = new L.Path({ x: L.BAYS.x[pre.bay], z: 16 }).to({ x: L.BAYS.x[pre.bay], z: L.BAYS.z }, 1); k.t0 = -100; k.path.sample(1e6, k.pose);
      if (pre.stage === 'pump') { k.pumped = k.litres * pre.pumped; } else { k.left = ASSUME.hookup * 0.5; k.sampled = false; k.testAt = null; this.sampleQ.push(k.id); }
      k.drv = { path: new L.Path(L.HOSE(pre.bay)).wait(1), t0: this.t }; return k;
    }
    this.queue.push(k.id); this.placeQueue(); return k;
  }
  // where each waiting tanker parks: five stalls in front of the bays, three places on the approach road, then off site
  placeQueue() {
    const used = new Set(this.queue.map(id => this.tk(id)).filter(k => k.loc && k.loc.t === 'stall').map(k => k.loc.k));
    let roadJ = 0;
    for (const id of this.queue) {
      const k = this.tk(id);
      if (k.loc && k.loc.t === 'stall') continue;
      let free = -1; for (let s = 0; s < 5; s++) if (!used.has(s)) { free = s; break; }
      if (free >= 0) { used.add(free); this.driveTo(k, this.stallPath(k, free)); k.loc = { t: 'stall', k: free }; continue; }
      if (roadJ < 3) { const j = roadJ++; if (!k.loc || k.loc.t !== 'road' || k.loc.j !== j) { this.driveTo(k, new L.Path(k.loc ? k.pose : L.ENTRY).to(L.ROAD(j), L.TANKER.speed)); k.loc = { t: 'road', j }; } continue; }
      k.loc = { t: 'off' }; k.path = null;
    }
  }
  stallPath(k, s) { const from = k.loc && k.loc.t !== 'off' ? k.pose : L.ENTRY, st = L.STALL(s); return new L.Path(from).to({ x: -90, z: 54 }, L.TANKER.speed).to({ x: st.x, z: 50 }, L.TANKER.speed).to(st, L.TANKER.speed * 0.7); }
  driveTo(k, path) { k.path = path; k.t0 = this.t; path.sample(0, k.pose); }
  tk(id) { return this.tankers.find(k => k.id === id); }
  stepTankers(dt) {
    const A = ASSUME;
    // arrivals: a Poisson stream whose rate follows the hour
    if (this.rand() < this.perDay * HOURLY[this.hour()] / 3600 * dt) this.arrive(this.t);
    // a free bay takes the tanker that has waited longest
    for (const b of this.bays) {
      if (!b.open || b.tanker != null || !this.queue.length) continue;
      const k = this.tk(this.queue.shift()); b.tanker = k.id; k.bay = b.i; k.wait = this.t - k.arr; this.c.waits.push({ t: this.t, w: k.wait });
      const from = k.loc && k.loc.t !== 'off' ? k.pose : L.ENTRY, sx = k.loc && k.loc.t === 'stall' ? L.STALL(k.loc.k).x : -90;
      const p = new L.Path(from); if (k.loc && k.loc.t === 'stall') p.to({ x: sx, z: 25 }, L.TANKER.speed); else p.to({ x: -90, z: 54 }, L.TANKER.speed).to({ x: L.BAYS.x[b.i], z: 30 }, L.TANKER.speed);
      p.to({ x: L.BAYS.x[b.i], z: 17 }, L.TANKER.speed).to({ x: L.BAYS.x[b.i], z: L.BAYS.z }, L.TANKER.speed * 0.6);
      this.driveTo(k, p); k.state = 'drive'; k.loc = null; this.placeQueue();
      if (k.wait > 1800) this.log(`A tanker waited ${Math.round(k.wait / 60)} min for a bay`);
    }
    for (const k of this.tankers) {
      if (k.path) { k.path.sample(this.t - k.t0, k.pose); k.pose.s = k.pose.s ?? 0; }
      const done = !k.path || this.t - k.t0 >= k.path.total;
      if (k.state === 'drive' && done) { k.state = 'hookup'; k.left = A.hookup; this.sampleQ.push(k.id); k.drv = { path: new L.Path(L.CAB_DOOR(k.bay)).to(L.HOSE(k.bay), A.walk), t0: this.t }; }
      else if (k.state === 'hookup') { k.left -= dt; if (k.left <= 0 && k.testAt != null && this.t >= k.testAt) { k.state = 'pump'; } else if (k.left <= 0) k.state = 'test'; }
      else if (k.state === 'test') { if (k.testAt != null && this.t >= k.testAt) k.state = 'pump'; }
      else if (k.state === 'pump') {
        const want = Math.min(A.pumpLpm / 60 * dt, k.litres - k.pumped), room = Math.max(0, this.silo.cap - this.silo.L), q = Math.min(want, room);
        k.pumped += q; this.silo.L += q; this.c.litres += q; k.full = q < want - 1e-6;
        if (k.pumped >= k.litres - 1e-6) { k.state = 'rinse'; k.left = A.rinse; }
      } else if (k.state === 'rinse') { k.left -= dt; if (k.left <= 0) {
          k.state = 'leave'; this.c.unloaded++; k.drv = { path: new L.Path(L.HOSE(k.bay)).to(L.CAB_DOOR(k.bay), A.walk), t0: this.t, last: true };
          const x = L.BAYS.x[k.bay]; this.driveTo(k, new L.Path(k.pose).wait(L.dist(L.HOSE(k.bay), L.CAB_DOOR(k.bay)) / A.walk + 6).to({ x, z: -30 }, L.TANKER.speed * 0.7).to({ x: -90, z: -36 }, L.TANKER.speed).to(L.EXIT, L.TANKER.speed));
          k.freeAt = this.t + L.dist(L.HOSE(k.bay), L.CAB_DOOR(k.bay)) / A.walk + 6 + 34 / (L.TANKER.speed * 0.7); } }
      else if (k.state === 'leave') { if (k.bay != null && this.t >= k.freeAt) { this.bays[k.bay].tanker = null; k.bay = null; } if (done) k.gone = true; }
      if (k.drv && k.drv.last && this.t - k.drv.t0 > k.drv.path.total) k.drv = null;
    }
    if (this.tankers.some(k => k.gone)) this.tankers = this.tankers.filter(k => !k.gone);
    if (this.tankers.some(k => k.state === 'pump' && k.full)) this.c.siloFullSec += dt;
  }

  // ── process: silos → evaporator and dryer → powder bins ────────────────────────────────────────────────────────
  stepDryer(dt) {
    const A = ASSUME, d = this.dryer, s = this.silo, lvl = s.L / s.cap;
    if (d.state === 'clean') { d.cleanLeft -= dt; if (d.cleanLeft <= 0) { d.state = lvl > A.dryerStart ? 'ramp' : 'starved'; d.runSec = 0; d.ramp = 0.2; this.log('Evaporator clean finished; the dryer comes back up'); } }
    else if (d.state === 'starved') { if (lvl > A.dryerStart) { d.state = 'ramp'; d.ramp = 0.2; this.log('Enough milk in the silos: the dryer restarts'); } }
    else { // run or ramp
      if (d.state === 'ramp') { d.ramp = Math.min(1, d.ramp + dt / A.ramp); if (d.ramp >= 1) d.state = 'run'; }
      if (d.runSec >= this.o.runHours * 3600) { d.state = 'clean'; d.cleanLeft = A.cleanHours * 3600; this.log(`Evaporator clean starts after ${this.o.runHours} h of running: no powder for ${A.cleanHours} h`); }
      else if (lvl < A.dryerStop) { d.state = 'starved'; this.log('Silos nearly empty: the dryer stops until more milk is in'); }
    }
    let rate = d.state === 'run' || d.state === 'ramp' ? A.dryerTph * d.ramp : 0;
    // powder bins full: the dryer is turned down to what the baggers can take away
    const binRoom = this.bins.reduce((t, b) => t + (A.binKg - b.kg), 0);
    d.held = false; if (rate > 0 && binRoom < 2000) { rate = Math.min(rate, 2 * A.bagsPerMin * A.bagKg * 60 / 1000 * 0.9); d.held = true; }
    const kg = rate * 1000 / 3600 * dt, milk = kg * A.litresPerKg;
    if (milk > s.L) { rate = 0; } else if (kg > 0) { s.L -= milk; this.c.powderKg += kg; d.runSec += dt; this.c.dryerRunSec += dt; const b = this.bins[0].kg <= this.bins[1].kg ? this.bins[0] : this.bins[1]; b.kg = Math.min(A.binKg, b.kg + kg); }
    d.rate = rate;
  }

  // ── bagging, palletising, wrapping ─────────────────────────────────────────────────────────────────────────────
  stepLines(dt) {
    const A = ASSUME, len = L.BELT.x1 - L.BELT.x0;
    for (const l of this.lines) {
      // the bagger fills a bag every 5 s while its bin has powder and the belt has room
      l.acc += dt; const every = 60 / A.bagsPerMin, bin = this.bins[l.i];
      const tail = l.bags.length ? l.bags[l.bags.length - 1] : len;
      if (l.acc >= every) { if (bin.kg >= A.bagKg && tail > L.BELT.pitch) { l.bags.push(0); bin.kg -= A.bagKg; this.c.bags++; l.acc = 0; } else l.acc = every; }
      // the belt carries bags on until they meet the one in front (bags[0] is the lead bag)
      for (let i = 0; i < l.bags.length; i++) l.bags[i] = Math.min(l.bags[i] + L.BELT.speed * dt, i === 0 ? len : l.bags[i - 1] - L.BELT.pitch);
      // palletiser: one bag at a time, forty to a pallet, then the pallet goes out and an empty one comes in
      if (l.busy > 0) { l.busy -= dt; if (l.busy <= 0) { l.pal.bags++; if (l.pal.bags >= A.bagsPerPallet) { l.full = true; } } }
      if (l.full && !l.out[0]) { l.out[0] = l.pal.id; l.pal.where = { t: 'out', line: l.i, k: 0, since: this.t }; l.pal.made = this.t; this.c.palletsMade++; l.pal = null; l.full = false; l.change = A.palletChange; }
      l.blocked = !!l.full;
      if (!l.pal && l.change > 0) { l.change -= dt; if (l.change <= 0) { l.pal = this.newPallet({}); l.pal.where = { t: 'line', line: l.i }; } }
      if (l.pal && !l.full && l.busy <= 0 && l.bags.length && l.bags[0] >= len - 1e-6) { l.bags.shift(); l.busy = A.palletiser; }
      // the outfeed rolls a pallet on when the place in front is free
      if (l.out[0] && !l.out[1]) { const p = this.pallets.get(l.out[0]); if (this.t - p.where.since >= A.outfeedMove) { l.out[1] = l.out[0]; l.out[0] = null; p.where = { t: 'out', line: l.i, k: 1, since: this.t }; } }
    }
    // the wrapper takes whichever line's pallet has waited longest
    const w = this.wrapper;
    if (w.state === 'idle') {
      const ready = this.lines.filter(l => l.out[1]).map(l => this.pallets.get(l.out[1])).filter(p => this.t - p.where.since >= A.outfeedMove).sort((a, b) => a.made - b.made)[0];
      if (ready) { this.lines[ready.where.line].out[1] = null; ready.where = { t: 'wrap', from: ready.where.line, since: this.t }; w.p = ready.id; w.state = 'in'; w.left = A.wrapIn; }
    } else if (w.state === 'in') { w.left -= dt; if (w.left <= 0) { w.state = 'wrap'; w.left = A.wrapCycle; } }
    else if (w.state === 'wrap') { w.left -= dt; w.prog = 1 - w.left / A.wrapCycle; w.angle += dt * Math.PI * 2 / 4.3; if (w.left <= 0) { const p = this.pallets.get(w.p); p.wrapped = true; this.c.wrapped++; w.state = 'label'; w.left = A.labelTime; } }
    else if (w.state === 'label') { w.left -= dt; if (w.left <= 0) { this.pallets.get(w.p).labelled = true; w.state = 'out'; } }
    else if (w.state === 'out') { const i = this.pd.findIndex(x => x === null); if (i >= 0) { const p = this.pallets.get(w.p); this.pd[i] = p.id; p.where = { t: 'pd', i, since: this.t }; w.p = null; w.state = 'idle'; w.prog = 0; } }
    if (w.state !== 'idle' && w.state !== 'out') w.busy += dt;
  }

  // ── forklifts: clear the pick-up stands into the store first, then load a waiting container from released stock ─
  // New powder waits in the store for its test results before it ships, so containers are loaded from older stock.
  assignForklift(a) {
    const A = ASSUME, sp = A.forklift;
    if (!a.active) { if (a.job !== 'park') this.go(a, new L.Path(a.pose, a.pose.lift).to(L.CHARGE(a.id), sp).raise(0, A.liftRate).wait(5), 'park'); else this.go(a, new L.Path(a.pose).wait(5), 'park'); return; }
    const loading = this.trucks.find(tr => tr.state === 'loading' && tr.n + tr.claimed < A.boxTonnes);
    const pdI = this.pd.map((id, i) => [id, i]).filter(([id]) => id && this.pallets.get(id).claim == null).sort((x, y) => this.pallets.get(x[0]).where.since - this.pallets.get(y[0]).where.since)[0];
    const free = L.SLOTS.filter(s => this.slots[s.id] === null && !this.slotClaim?.has(s.id));
    this.slotClaim = this.slotClaim || new Set();
    const pick = (p, i) => { p.claim = a.id; const path = new L.Path(a.pose, a.pose.lift); L.toPD(path, i, sp); path.raise(0.03, A.liftRate, 0); path.wait(A.handle, 'take'); this.fn(path, () => { this.pd[i] = null; p.where = { t: 'carried', by: a.id }; }); path.raise(0.25, A.liftRate); path.to({ x: L.EAST_X, z: L.PD[i].z }, sp, true); return path; };
    const intoBox = (path, p, tr) => { const k = tr.n + tr.claimed; tr.claimed++; const place = Math.floor(k / 2), high = k % 2, b = L.boxPos(tr.i, place);
      L.toBox(path, tr.i, place, sp); path.raise(high ? 1.25 : 0.03, A.liftRate, 0); path.wait(A.handle, 'place');
      this.fn(path, () => { p.where = { t: 'box', truck: tr.i, k }; tr.places[k] = p.id; tr.n++; tr.claimed--; p.claim = null; });
      path.to({ x: L.DOCK_X, z: L.DOORS[tr.i].z }, sp * 0.6, true).raise(0.25, A.liftRate); return path; };
    if (pdI && free.length) {
      const p = this.pallets.get(pdI[0]); const s = free.sort((x, y) => x.lv - y.lv || Math.abs(x.x - 74) - Math.abs(y.x - 74) || x.row - y.row)[0]; this.slotClaim.add(s.id);
      const path = pick(p, pdI[1]); L.toSlot(path, s, sp); path.raise(s.y + 0.06, A.liftRate, 0); path.wait(A.handle, 'place');
      this.fn(path, () => { this.slots[s.id] = p.id; p.where = { t: 'rack', slot: s.id }; p.claim = null; this.slotClaim.delete(s.id); });
      L.fromSlot(path, s, sp); path.raise(0.25, A.liftRate); this.go(a, path, 'putaway'); return;
    }
    if (loading) {
      const stock = L.SLOTS.filter(s => this.slots[s.id] !== null && this.pallets.get(this.slots[s.id]).claim == null).sort((x, y) => this.pallets.get(this.slots[x.id]).made - this.pallets.get(this.slots[y.id]).made)[0];
      if (stock) { const p = this.pallets.get(this.slots[stock.id]); p.claim = a.id;
        const path = new L.Path(a.pose, a.pose.lift); L.toSlot(path, stock, sp); path.raise(stock.y, A.liftRate, 0); path.wait(A.handle, 'take');
        this.fn(path, () => { this.slots[stock.id] = null; p.where = { t: 'carried', by: a.id }; }); path.raise(stock.y + 0.08, A.liftRate);
        L.fromSlot(path, stock, sp); path.raise(0.25, A.liftRate); this.go(a, intoBox(path, p, loading), 'load'); return; }
    }
    const home = L.CHARGE(a.id);
    if (L.dist(a.pose, home) > 0.5) this.go(a, new L.Path(a.pose, a.pose.lift).to({ x: L.EAST_X, z: a.pose.z }, sp).to({ x: L.EAST_X, z: home.z - 2.4 }, sp).to(home, sp * 0.5, true).raise(0, A.liftRate), 'park');
    else this.go(a, new L.Path(a.pose).wait(3), 'idle');
  }
  stepTrucks(dt) {
    const A = ASSUME;
    for (const tr of this.trucks) {
      if (tr.state === 'away') { tr.left -= dt; if (tr.left <= 0) { tr.state = 'arriving'; tr.left = A.arrive; tr.n = 0; tr.places = []; } }
      else if (tr.state === 'arriving') { tr.left -= dt; tr.offset = 14 + 26 * Math.max(0, tr.left / A.arrive); if (tr.left <= 0) { tr.state = 'docking'; tr.left = A.dockMove; } }
      else if (tr.state === 'docking') { tr.left -= dt; tr.offset = 14 * Math.max(0, tr.left / A.dockMove); if (tr.left <= 0) { tr.state = 'loading'; tr.offset = 0; } }
      else if (tr.state === 'loading') { if (tr.n >= A.boxTonnes) { tr.state = 'closing'; tr.left = A.closeUp; } }
      else if (tr.state === 'closing') { tr.left -= dt; if (tr.left <= 0) { tr.state = 'leaving'; tr.left = A.dockMove; this.c.boxes++; this.c.shipped += tr.n; this.log(`Container ${this.c.boxes} sealed at door ${tr.door}: ${tr.n} t of powder`); } }
      else if (tr.state === 'leaving') { tr.left -= dt; tr.offset = 40 * (1 - Math.max(0, tr.left / A.dockMove)); if (tr.left <= 0) { for (const id of tr.places) this.pallets.delete(id); tr.places = []; tr.n = 0; tr.state = 'away'; tr.left = A.boxGap; } }
    }
  }

  // ── people ─────────────────────────────────────────────────────────────────────────────────────────────────────
  assignSampler(a) {
    const A = ASSUME;
    const id = this.sampleQ.shift(); const k = id != null ? this.tk(id) : null;
    if (k && k.bay != null) { const hose = L.HOSE(k.bay), at = { x: hose.x + 0.9, z: hose.z + 1.2 };
      const p = new L.Path(a.pose).to({ x: L.QA_LAB.door.x, z: 18 }, A.walk).to({ x: at.x, z: 18 }, A.walk).to(at, A.walk).wait(A.sampleTime, 'sample');
      this.fn(p, () => { k.sampled = true; }); p.to({ x: at.x, z: 18 }, A.walk).to({ x: L.QA_LAB.door.x, z: 18 }, A.walk).to(L.QA_LAB.door, A.walk);
      this.fn(p, () => { k.testAt = this.t + A.testTime; }); this.go(a, p, 'sample'); return; }
    this.go(a, new L.Path(a.pose).wait(5, 'lab'), 'idle');
  }
  assignPatrol(a) { a.leg = (a.leg + 1) % L.PATROL.length; this.go(a, new L.Path(a.pose).to(L.PATROL[a.leg], ASSUME.walk * 0.8).wait(8 + this.rand() * 10, 'check'), 'patrol'); }

  stepAgent(a, dt) {
    if (!a.path) this.assign(a);
    let tt = this.t - a.t0, acc = 0;
    for (let i = 0; i < a.path.steps.length; i++) { acc += a.path.steps[i].t; if (tt >= acc) { if (i >= a.fired) { a.fired = i + 1; const f = a.path.steps[i].fn; if (f) f(); } } else break; }
    if (tt >= a.path.total) { a.path = null; this.assign(a); tt = 0; }
    a.path.sample(this.t - a.t0, a.pose);
    if (a.job !== 'idle' && a.job !== 'park') a.busy += dt;
  }
  assign(a) {
    if (a.kind === 'forklift') this.assignForklift(a);
    else if (a.kind === 'sampler') this.assignSampler(a);
    else if (a.kind === 'patrol') this.assignPatrol(a);
    else this.go(a, new L.Path(a.pose).wait(30, 'work'), 'work');
  }

  step(dt) {
    this.stepTankers(dt); this.stepDryer(dt); this.stepLines(dt); this.stepTrucks(dt);
    for (const a of this.agents) this.stepAgent(a, dt);
    this.t += dt;
  }
  run(sec, dt = 1) { const end = this.t + sec; while (this.t < end) this.step(dt); return this; }
  // levers that apply straight away: open or close a bay, bring a forklift in or send it to charge
  setBays(n) { this.o.bays = n; this.bays.forEach(b => { b.open = b.i < n; }); }
  setForklifts(n) { this.o.forklifts = n; this.agents.filter(a => a.kind === 'forklift').forEach((a, i) => { a.active = i < n; }); }

  metrics() {
    const A = ASSUME, d = this.dryer, s = this.silo, t = this.t;
    const queue = this.queue.length, waitingNow = this.queue.map(id => t - this.tk(id).arr);
    const recent = this.c.waits.filter(w => w.t > t - 7200), avgWait = recent.length ? recent.reduce((a, w) => a + w.w, 0) / recent.length : 0;
    const longest = Math.max(0, ...waitingNow, ...this.c.waits.map(w => w.w));
    const store = this.slots.filter(x => x !== null).length, fl = this.agents.filter(a => a.kind === 'forklift' && a.active);
    return {
      clock: this.clock(), month: MONTHS[this.o.month], perDay: this.perDay, tankersIn: this.c.tankersIn, unloaded: this.c.unloaded, litres: this.c.litres,
      queue, waitNow: waitingNow.length ? Math.max(...waitingNow) : 0, avgWait, longest, longWaits: this.c.waits.filter(w => w.w > 1800).length,
      baysBusy: this.bays.filter(b => b.tanker != null).length, baysOpen: this.bays.filter(b => b.open).length, siloFullMin: this.c.siloFullSec / 60,
      silo: s.L / s.cap, siloL: s.L, dryer: d.state, held: d.held, rate: d.rate, runH: d.runSec / 3600, cleanIn: Math.max(0, this.o.runHours * 3600 - d.runSec), cleanLeft: d.cleanLeft,
      powderT: this.c.powderKg / 1000, bins: this.bins.map(b => b.kg / A.binKg), bags: this.c.bags, palletsMade: this.c.palletsMade, wrapped: this.c.wrapped,
      onBelts: this.lines.reduce((n, l) => n + l.bags.length, 0), linesBlocked: this.lines.filter(l => l.blocked).length, wrapper: this.wrapper.state, pd: this.pd.filter(Boolean).length,
      store, storeCap: L.SLOTS.length, boxes: this.c.boxes, shipped: this.c.shipped, trucks: this.trucks.map(tr => ({ door: tr.door, state: tr.state, n: tr.n })),
      forklifts: fl.length, forkBusy: fl.length && t > 0 ? fl.reduce((a, f) => a + f.busy, 0) / (fl.length * t) : 0, wrapBusy: t > 0 ? this.wrapper.busy / t : 0,
      elapsed: t,
    };
  }
}
