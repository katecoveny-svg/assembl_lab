// The grocery DC model. Plain JavaScript, no rendering: the scene reads this state every frame and draws it.
// Every number the page shows comes from here, and every input below is an assumption, listed on the page.
// It is a simple agent model: each worker or vehicle takes the next job by a fixed rule, and a job's duration is
// its path length over its speed plus its handling times (see Path in layout.js).
import * as L from './layout.js';

export const ASSUME = {
  shiftStart: 5 * 3600,  // the shift starts at 05:00
  walk: 1.25,            // m/s walking
  walkJack: 1.05,        // m/s walking with a loaded hand pallet jack
  forklift: 2.2,         // m/s counterbalance forklift, indoor speed limit
  orderPicker: 1.5,      // m/s high-level order picker
  liftRate: 0.32,        // m/s forks or cab going up or down
  handle: 4,             // s to engage or release a pallet
  faceStop: 6,           // s to stop, scan the location and confirm, at each pick face
  perCarton: 5,          // s to pick one carton onto the pallet
  linesMin: 4, linesMax: 6, cartonsMin: 5, cartonsMax: 10, palletMax: 40,
  wrapCycle: 52,         // s for a turntable wrapper to wrap one pallet
  labelTime: 18,         // s to print, apply and scan the pallet label
  scanTime: 20,          // s to check one inbound pallet against the delivery
  toteFill: 28,          // s to pick one tote at a face
  cartonsPerTote: 2,
  toteStack: 5,          // s to stack one tote on the store pallet
  reorder: 10,           // cartons left at a pick face that trigger a let-down from reserve
  dockMove: 40,          // s to reverse onto, or pull off, a dock
  doorTime: 8,           // s for a dock door to open or close
  truckGap: 300,         // s between a store truck leaving and the next one for that route arriving
  inboundGap: 360,       // s between supplier trucks at each inbound door
  pickers: 4, totePickers: 2,
};

const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

class Lane { // 12 floor positions in two columns (even and odd indices); index 0/1 is the door end
  // A forklift can only reach a slot along its own column, from the door end (east) or the back (west), so it can
  // place behind or in front of the pallets already there, and take the first pallet from the side it comes from.
  constructor(kind, z) { this.kind = kind; this.z = z; this.s = Array(L.LANE.cap).fill(null); }
  col(c) { const a = []; for (let i = c; i < this.s.length; i += 2) a.push(i); return a; }
  place() { // dispatch lanes fill from the door end (marshal comes from the west); inbound fill from the back
    const opts = [];
    for (const c of [0, 1]) {
      const ix = this.col(c), occ = ix.filter(i => this.s[i] !== null);
      if (!occ.length) { opts.push(this.kind === 'out' ? { i: c, side: 'west' } : { i: ix[ix.length - 1], side: 'east' }); continue; }
      const mn = Math.min(...occ), mx = Math.max(...occ);
      if (this.kind === 'out') { if (mx + 2 < this.s.length) opts.push({ i: mx + 2, side: 'west' }); else if (mn - 2 >= 0) opts.push({ i: mn - 2, side: 'east' }); }
      else { if (mn - 2 >= 0) opts.push({ i: mn - 2, side: 'east' }); else if (mx + 2 < this.s.length) opts.push({ i: mx + 2, side: 'west' }); }
    }
    if (!opts.length) return null;
    opts.sort((a, b) => this.kind === 'out' ? a.i - b.i : b.i - a.i); return opts[0];
  }
  take(ok = () => true) { // dispatch: the loader takes from the door end; inbound: putaway takes from the back
    const opts = [];
    for (const c of [0, 1]) {
      const occ = this.col(c).filter(i => this.s[i] !== null); if (!occ.length) continue;
      const i = this.kind === 'out' ? Math.min(...occ) : Math.max(...occ);
      if (typeof this.s[i] === 'number' && ok(this.s[i])) opts.push(i);
    }
    if (!opts.length) return -1; opts.sort((a, b) => this.kind === 'out' ? a - b : b - a); return opts[0];
  }
  count() { return this.s.filter(v => typeof v === 'number').length; }
  reserved() { return this.s.filter(v => v === 'R').length; }
  pos(i) { return L.lanePos(this.z, i); }
}

export class Sim {
  constructor(seed = 11) {
    this.seed = seed; this.rng = mulberry32(seed); this.t = 0; this.nextId = 1;
    this.pallets = new Map(); this.agents = []; this.totes = []; this.events = [];
    this.m = { cartons: 0, storePallets: 0, totes: 0, totePallets: 0, wrapped: 0, labelled: 0, loaded: 0, trucksOut: 0,
      received: 0, trucksIn: 0, putaways: 0, replens: 0, shorts: 0, pickLog: [], wrapBusy: [0, 0], queueMax: 0 };
    const r = this.rng;

    // racking: every column starts with a part-picked face and some reserve
    this.cols = L.COLUMNS.map(c => ({ ...c, face: null, reserve: [null, null, null], resClaim: [false, false, false], replenBy: null }));
    for (const c of this.cols) {
      c.face = this.newPallet({ kind: 'stock', col: c.id, cartons: 10 + Math.floor(r() * 31), wrapped: false, where: { t: 'rack', col: c.id, level: 0 } }).id;
      for (let l = 0; l < 3; l++) if (r() < 0.55) c.reserve[l] = this.newPallet({ kind: 'stock', col: c.id, cartons: L.FULL, wrapped: true, where: { t: 'rack', col: c.id, level: l + 1 } }).id;
    }

    // docks
    this.inLanes = L.INBOUND_DOORS.map(d => new Lane('in', d.z));
    this.outLanes = L.ROUTES.map(rt => new Lane('out', rt.z));
    this.inTrucks = L.INBOUND_DOORS.map((d, i) => ({ door: d.id, z: d.z, state: i === 0 ? 'docked' : 'away', t0: 0, wait: i === 0 ? 0 : 160, slots: Array(L.TRAILER.cap).fill(null), offset: 0, door01: i === 0 ? 1 : 0 }));
    this.outTrucks = L.ROUTES.map((rt, i) => ({ route: i, door: rt.door, z: rt.z, state: 'docked', t0: 0, wait: 0, slots: Array(L.TRAILER.cap).fill(null), loaded: 0, offset: 0, door01: 1 }));
    this.loadInbound(this.inTrucks[0]);
    // a running start: some pallets already loaded and some waiting in each lane
    L.ROUTES.forEach((rt, i) => {
      const tr = this.outTrucks[i], ln = this.outLanes[i];
      for (let k = 0; k < 2 * i; k++) { const p = this.newPallet({ kind: 'store', route: i, cartons: 34, wrapped: true, labelled: true, stage: 'trailer', where: { t: 'trailer', side: 'out', truck: i, i: k } }); tr.slots[k] = p.id; tr.loaded++; }
      for (let k = 0; k < 2 + (i % 2) * 2; k++) { const p = this.newPallet({ kind: 'store', route: i, cartons: 36, wrapped: true, labelled: true, stage: 'lane', where: { t: 'lane', side: 'out', lane: i, i: k } }); ln.s[k] = p.id; }
    });

    // wrap stations
    this.wrappers = L.WRAPPERS.map((w, i) => ({ i, ...w, pallet: null, claim: null, state: 'free', t0: 0, prog: 0, angle: 0, queue: [], labelBy: null }));
    this.tote = { pallet: null, ready: false, claim: null };
    this.startTotePallet();

    // people and vehicles
    for (let i = 0; i < ASSUME.pickers; i++) this.addAgent('picker', `Picker ${i + 1}`, L.PICKER_HOME(i), { home: L.PICKER_HOME(i), carry: this.newPallet({ kind: 'store', cartons: 0, stage: 'empty', where: null }).id });
    for (let i = 0; i < ASSUME.totePickers; i++) this.addAgent('totePicker', `Tote picker ${i + 1}`, L.TOTE_PICKER_HOME(i), { home: L.TOTE_PICKER_HOME(i), tote: false });
    this.addAgent('receiver', 'Receiver', L.RECEIVE_DESK, { home: { x: L.RECEIVE_DESK.x + 0.8, z: L.RECEIVE_DESK.z + 0.6 } });
    this.addAgent('labeller', 'Labeller', { x: 10.6, z: 13.4 }, { home: { x: 10.6, z: 13.4 } });
    this.addAgent('toteBuilder', 'Tote builder', { x: L.TOTE_BUILD.x - 1.0, z: L.TOTE_BUILD.z - 0.3 }, { home: { x: L.TOTE_BUILD.x - 1.0, z: L.TOTE_BUILD.z - 0.3 } });
    this.addAgent('forklift', 'Forklift 1 · marshal', L.CHARGE(0), { role: 'marshal', park: L.CHARGE(0) });
    this.addAgent('forklift', 'Forklift 2 · loading', L.CHARGE(1), { role: 'load', park: L.CHARGE(1) });
    this.addAgent('forklift', 'Forklift 3 · unloading', L.CHARGE(2), { role: 'unload', park: L.CHARGE(2) });
    this.addAgent('orderPicker', 'Order picker 1', L.OP_PARK(0), { park: L.OP_PARK(0) });
    this.addAgent('orderPicker', 'Order picker 2', L.OP_PARK(1), { park: L.OP_PARK(1) });
    for (const a of this.agents) if (a.carry) this.pallets.get(a.carry).where = { t: 'carried', by: a.id };
    for (const a of this.agents) a.pose = { x: a.at.x, z: a.at.z, yaw: a.kind === 'forklift' || a.kind === 'orderPicker' ? -Math.PI / 2 : Math.PI, lift: 0, moving: false };
  }

  // ── bookkeeping ──────────────────────────────────────────────────────────────────────────────────────────────────
  newPallet(o) { const p = { id: this.nextId++, kind: 'stock', cartons: 0, wrapped: false, labelled: false, checked: false, route: null, col: null, stage: null, claim: null, totes: 0, ...o }; this.pallets.set(p.id, p); return p; }
  addAgent(kind, name, at, extra = {}) { const a = { id: this.agents.length, kind, name, at: { ...at }, path: null, t0: 0, fired: 0, busy: 0, job: 'idle', carry: null, ...extra }; this.agents.push(a); return a; }
  log(text) { this.events.unshift({ t: this.t, text }); if (this.events.length > 40) this.events.pop(); }
  clock(t = this.t) { const s = ASSUME.shiftStart + t; const h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }

  loadInbound(tr) {
    // a supplier delivery: 12 full pallets for the columns with the least stock that still have a free reserve deck
    const ranked = this.cols.map(c => ({ c, free: c.reserve.findIndex((v, l) => v === null && !c.resClaim[l]), have: this.colStock(c) }))
      .filter(o => o.free >= 0).sort((a, b) => a.have - b.have || a.c.id - b.c.id);
    for (let i = 0; i < L.TRAILER.cap; i++) {
      const o = ranked[i]; let col = null, level = null;
      if (o) { col = o.c.id; level = o.free; o.c.resClaim[level] = true; }
      const p = this.newPallet({ kind: 'stock', col, dest: level, cartons: L.FULL, wrapped: true, stage: 'inbound', where: { t: 'trailer', side: 'in', truck: this.inTrucks.indexOf(tr), i } });
      tr.slots[i] = p.id;
    }
  }
  colStock(c) { return (c.face ? this.pallets.get(c.face).cartons : 0) + c.reserve.filter(Boolean).length * L.FULL; }

  routeNeed(r) {
    const tr = this.outTrucks[r], ln = this.outLanes[r];
    let pipe = 0; for (const p of this.pallets.values()) if (p.route === r && (p.stage === 'picking' || p.stage === 'wrapq' || p.stage === 'wrap' || p.stage === 'ready' || p.stage === 'marshal' || p.stage === 'tote')) pipe++;
    const loaded = tr.state === 'away' || tr.state === 'arriving' ? 0 : tr.loaded;
    return L.TRAILER.cap - loaded - ln.count() - ln.reserved() - pipe;
  }
  neediestRoute() {
    let best = -1, need = 0;
    for (let r = 0; r < L.ROUTES.length; r++) { const n = this.routeNeed(r); if (n > need) { need = n; best = r; } }
    return best;
  }

  // ── stepping ─────────────────────────────────────────────────────────────────────────────────────────────────────
  step(dt) {
    this.t += dt;
    this.stepTrucks(dt); this.stepWrappers(dt); this.stepConveyor(dt);
    for (const a of this.agents) this.stepAgent(a, dt);
    const cut = this.t - 900; while (this.m.pickLog.length && this.m.pickLog[0][0] < cut) this.m.pickLog.shift();
  }

  go(a, path, job) {
    let end = 0; for (const s of path.steps) { end += s.t; s.end = end; }
    a.path = path; a.t0 = this.t; a.fired = 0; a.job = job;
  }
  stepAgent(a, dt) {
    if (!a.path) this.assign(a);
    if (!a.path) return;
    if (a.job !== 'idle' && a.job !== 'wait' && a.job !== 'park') a.busy += dt;
    const el = this.t - a.t0, steps = a.path.steps;
    while (a.fired < steps.length && steps[a.fired].end <= el) { const s = steps[a.fired++]; if (s.fn) s.fn(); }
    a.path.sample(el, a.pose);
    if (el >= a.path.total) { a.at = { x: a.pose.x, z: a.pose.z }; const done = a.onDone; a.path = null; a.onDone = null; if (done) done(); }
  }
  idle(a, t = 2, where) { const p = new L.Path(a.at, a.pose.lift || 0); if (where) p.to(where, a.kind === 'forklift' ? ASSUME.forklift : a.kind === 'orderPicker' ? ASSUME.orderPicker : ASSUME.walk); p.wait(t); this.go(a, p, where ? 'park' : 'idle'); }
  fn(path, f) { path.steps[path.steps.length - 1].fn = f; return path; }

  assign(a) {
    switch (a.kind) {
      case 'picker': return this.assignPicker(a);
      case 'totePicker': return this.assignTotePicker(a);
      case 'receiver': return this.assignReceiver(a);
      case 'labeller': return this.assignLabeller(a);
      case 'toteBuilder': return this.assignToteBuilder(a);
      case 'forklift': return a.role === 'marshal' ? this.assignMarshal(a) : a.role === 'load' ? this.assignLoader(a) : this.assignUnloader(a);
      case 'orderPicker': return this.assignOrderPicker(a);
    }
  }

  // ── pallet picking: hand pallet jack, one aisle per order ────────────────────────────────────────────────────────
  assignPicker(a) {
    const r = this.rng;
    if (a.wrapWait != null) return this.pickerQueue(a);
    const route = this.neediestRoute();
    if (route < 0) return this.idle(a, 4, Math.hypot(a.at.x - a.home.x, a.at.z - a.home.z) > 0.3 ? a.home : null);
    const aisle = Math.floor(r() * 3);
    const cands = this.cols.filter(c => c.aisle === aisle && this.pallets.get(c.face)?.cartons > 0);
    if (cands.length < 3) return this.idle(a, 3);
    const n = ASSUME.linesMin + Math.floor(r() * (ASSUME.linesMax - ASSUME.linesMin + 1));
    const lines = []; const pool = [...cands];
    while (lines.length < n && pool.length) lines.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    lines.sort((x, y) => y.x - x.x); // nearest the aisle entry first, then deeper
    const pal = this.pallets.get(a.carry); pal.route = route; pal.stage = 'picking'; pal.cartons = 0; pal.where = { t: 'carried', by: a.id };
    const path = new L.Path(a.at);
    L.viaAisle(path, aisle, lines[0].x + 1.2, ASSUME.walk);
    let total = 0;
    for (const c of lines) {
      const want = ASSUME.cartonsMin + Math.floor(r() * (ASSUME.cartonsMax - ASSUME.cartonsMin + 1));
      const take = Math.min(want, ASSUME.palletMax - total); if (take <= 0) break; total += take;
      path.to(L.faceStand(c, 0.55), ASSUME.walk).wait(ASSUME.faceStop + take * ASSUME.perCarton, 'pick');
      this.fn(path, () => {
        const face = this.pallets.get(c.face); const got = Math.min(take, face ? face.cartons : 0);
        if (face) face.cartons -= got; if (got < take) this.m.shorts++;
        pal.cartons += got; this.m.cartons += got; this.m.pickLog.push([this.t, got]);
      });
    }
    L.outOfAisle(path, aisle, ASSUME.walkJack);
    path.to({ x: 0.6, z: 13.4 }, ASSUME.walkJack);
    a.onDone = () => { a.wrapWait = 0; this.m.storePallets++; };
    this.go(a, path, 'pick');
  }
  pickerQueue(a) {
    // join the shorter wrapper queue; the front of a queue moves on to a free turntable
    if (a.wrapQ == null) {
      const w = this.wrappers.slice().sort((x, y) => (x.queue.length + (x.claim != null || x.pallet ? 1 : 0)) - (y.queue.length + (y.claim != null || y.pallet ? 1 : 0)))[0];
      w.queue.push(a.id); a.wrapQ = w.i; this.pallets.get(a.carry).stage = 'wrapq';
      this.m.queueMax = Math.max(this.m.queueMax, this.wrappers.reduce((s, x) => s + x.queue.length, 0));
    }
    const w = this.wrappers[a.wrapQ], pos = w.queue.indexOf(a.id);
    if (pos === 0 && !w.pallet && w.claim == null) {
      w.queue.shift(); w.claim = a.id;
      const path = new L.Path(a.at).to({ x: w.x - 2.4, z: w.z }, ASSUME.walkJack).to({ x: w.x - 0.85, z: w.z }, 0.5).wait(ASSUME.handle + 2, 'drop');
      const pal = this.pallets.get(a.carry);
      this.fn(path, () => { pal.where = { t: 'wrap', w: w.i }; pal.stage = 'wrap'; w.pallet = pal.id; w.claim = null; w.state = 'wrapping'; w.t0 = this.t; w.prog = 0; a.carry = null; });
      path.to({ x: w.x - 2.6, z: w.z }, ASSUME.walk, true).to({ x: L.EMPTY_STACK.x + 0.9, z: L.EMPTY_STACK.z - 0.4 }, ASSUME.walk).wait(ASSUME.handle, 'empty');
      this.fn(path, () => { a.carry = this.newPallet({ kind: 'store', cartons: 0, stage: 'empty', where: { t: 'carried', by: a.id } }).id; });
      path.to(a.home, ASSUME.walk);
      a.wrapWait = null; a.wrapQ = null;
      return this.go(a, path, 'drop');
    }
    const q = L.WRAP_QUEUE(a.wrapQ, Math.max(0, pos));
    const path = new L.Path(a.at); if (Math.hypot(q.x - a.at.x, q.z - a.at.z) > 0.05) path.to(q, ASSUME.walkJack); path.wait(1.0, 'queue');
    this.go(a, path, 'wait');
  }

  // ── wrapping and labelling ───────────────────────────────────────────────────────────────────────────────────────
  stepWrappers(dt) {
    for (const w of this.wrappers) {
      if (w.pallet) this.m.wrapBusy[w.i] += w.state === 'wrapping' ? dt : 0;
      if (w.state === 'wrapping') {
        w.prog = Math.min(1, (this.t - w.t0) / ASSUME.wrapCycle); w.angle += dt * 1.6;
        if (w.prog >= 1) { w.state = 'label'; const p = this.pallets.get(w.pallet); p.wrapped = true; this.m.wrapped++; }
      }
    }
  }
  assignLabeller(a) {
    const w = this.wrappers.find(x => x.state === 'label' && x.labelBy == null);
    if (!w) return this.idle(a, 2, Math.hypot(a.at.x - a.home.x, a.at.z - a.home.z) > 0.3 ? a.home : null);
    w.labelBy = a.id;
    const path = new L.Path(a.at).to(L.LABEL_STAND(w.i), ASSUME.walk).wait(ASSUME.labelTime, 'label');
    this.fn(path, () => { const p = this.pallets.get(w.pallet); p.labelled = true; p.stage = 'ready'; w.state = 'ready'; w.labelBy = null; this.m.labelled++; });
    this.go(a, path, 'label');
  }

  // ── forklifts ────────────────────────────────────────────────────────────────────────────────────────────────────
  // A counterbalance forklift carries the pallet 1.95 m ahead of its centre. To lift a pallet at P it stands at
  // P minus 1.95 m along its heading.
  static FORK = 1.95;
  assignMarshal(a) {
    const S = ASSUME.forklift, F = Sim.FORK;
    // 1) a labelled pallet waiting on a turntable, 2) a full tote pallet
    let src = null, pal = null, from = null;
    const w = this.wrappers.find(x => x.state === 'ready' && x.claim == null);
    if (w) { pal = this.pallets.get(w.pallet); from = { x: w.x, z: w.z }; src = { w }; }
    else if (this.tote.ready && this.tote.claim == null) { pal = this.pallets.get(this.tote.pallet); from = { ...L.TOTE_PALLET }; src = { tote: true }; }
    if (!pal) return this.idle(a, 3, Math.hypot(a.at.x - a.park.x, a.at.z - a.park.z) > 0.3 ? a.park : null);
    const lane = this.outLanes[pal.route], pl = lane.place();
    if (!pl) return this.idle(a, 3);
    const idx = pl.i;
    lane.s[idx] = 'R'; if (src.w) src.w.claim = a.id; else this.tote.claim = a.id;
    const to = lane.pos(idx);
    const path = new L.Path(a.at);
    // approach the pallet from the east (turntable) or from the north (tote pallet), forks first
    const dir = src.w ? { x: 1, z: 0 } : { x: 0, z: 1 };
    const stand = { x: from.x + dir.x * F, z: from.z + dir.z * F }, back = { x: from.x + dir.x * (F + 1.6), z: from.z + dir.z * (F + 1.6) };
    path.to(back, S).to(stand, 0.7).raise(src.w ? 0.12 : 0.02, ASSUME.liftRate, 0).wait(ASSUME.handle, 'lift');
    this.fn(path, () => {
      pal.where = { t: 'carried', by: a.id }; pal.stage = 'marshal'; a.carry = pal.id;
      if (src.w) { src.w.pallet = null; src.w.claim = null; src.w.state = 'free'; src.w.prog = 0; }
      else { this.tote.pallet = null; this.tote.claim = null; this.tote.ready = false; this.startTotePallet(); }
    });
    path.raise(0.25, ASSUME.liftRate).to(back, 0.8, true);
    // drive to the lane's west end, then forks-first along the lane to the slot
    const dx = pl.side === 'west' ? -1 : 1; // which end of the lane the forklift drives in from
    if (pl.side === 'west') path.to({ x: Math.min(20, to.x - F - 3.0), z: to.z }, S).to({ x: to.x - F - 3.0, z: to.z }, S);
    else path.to({ x: 21, z: 18.6 }, S).to({ x: L.DOCK_AISLE_X, z: 18.6 }, S).to({ x: L.DOCK_AISLE_X, z: to.z }, S);
    path.to({ x: to.x + dx * F, z: to.z }, 0.8).raise(0.02, ASSUME.liftRate).wait(ASSUME.handle, 'drop');
    this.fn(path, () => { lane.s[idx] = pal.id; pal.where = { t: 'lane', side: 'out', lane: pal.route, i: idx }; pal.stage = 'lane'; a.carry = null; });
    path.to({ x: pl.side === 'west' ? to.x - F - 1.8 : L.DOCK_AISLE_X, z: to.z }, 0.8, true).raise(0, ASSUME.liftRate);
    this.go(a, path, 'marshal');
  }
  assignLoader(a) {
    const S = ASSUME.forklift, F = Sim.FORK;
    let best = null;
    for (let r = 0; r < this.outTrucks.length; r++) {
      const tr = this.outTrucks[r], ln = this.outLanes[r];
      if (tr.state !== 'loading' || tr.loaded >= L.TRAILER.cap) continue;
      // start loading once most of the truckload is staged in the lane (10 of 12), as DCs commonly stage loads first
      if (ln.count() + tr.loaded < L.TRAILER.cap - 2 && !tr.staged) continue; tr.staged = true;
      const i = ln.take(id => this.pallets.get(id).claim == null); if (i < 0) continue;
      const d = Math.abs(ln.pos(i).z - a.at.z) + Math.abs(ln.pos(i).x - a.at.x);
      if (!best || d < best.d) best = { r, i, d };
    }
    if (!best) return this.idle(a, 3, Math.hypot(a.at.x - a.park.x, a.at.z - a.park.z) > 0.3 ? a.park : null);
    const tr = this.outTrucks[best.r], ln = this.outLanes[best.r], pid = ln.s[best.i], pal = this.pallets.get(pid);
    const slot = tr.loaded; tr.loaded++; pal.claim = a.id;
    const at = ln.pos(best.i), tp = L.trailerPos(tr.z, slot);
    const path = new L.Path(a.at);
    // come in from the door side, forks pointing west
    if (a.at.x < L.DOCK_AISLE_X - 0.5) path.to({ x: L.DOCK_AISLE_X, z: a.at.z > 17 ? 18.6 : a.at.z }, S);
    path.to({ x: L.DOCK_AISLE_X, z: at.z }, S).to({ x: at.x + F, z: at.z }, 0.8).raise(0.08, ASSUME.liftRate).wait(ASSUME.handle, 'lift');
    this.fn(path, () => { ln.s[best.i] = null; pal.where = { t: 'carried', by: a.id }; pal.stage = 'loading'; a.carry = pid; });
    path.raise(0.2, ASSUME.liftRate).to({ x: L.DOCK_AISLE_X, z: at.z }, 0.8, true)
      .to({ x: L.DOOR_X - 1.6, z: tr.z }, 1.2).to({ x: tp.x - F, z: tp.z }, 1.1).raise(0.03, ASSUME.liftRate).wait(ASSUME.handle, 'drop');
    this.fn(path, () => { tr.slots[slot] = pid; pal.where = { t: 'trailer', side: 'out', truck: best.r, i: slot }; pal.stage = 'trailer'; a.carry = null; this.m.loaded++; });
    path.to({ x: L.DOCK_AISLE_X, z: tr.z }, 1.1, true).raise(0, ASSUME.liftRate);
    this.go(a, path, 'load');
  }
  assignUnloader(a) {
    const S = ASSUME.forklift, F = Sim.FORK;
    const ti = this.inTrucks.findIndex((tr, k) => tr.state === 'unloading' && tr.slots.some(Boolean) && this.inLanes[k].place());
    if (ti < 0) return this.idle(a, 3, Math.hypot(a.at.x - a.park.x, a.at.z - a.park.z) > 0.3 ? a.park : null);
    const tr = this.inTrucks[ti], ln = this.inLanes[ti];
    let si = -1; for (let i = tr.slots.length - 1; i >= 0; i--) if (tr.slots[i]) { si = i; break; }
    const pid = tr.slots[si], pal = this.pallets.get(pid), pl = ln.place(), idx = pl.i; ln.s[idx] = 'R';
    const tp = L.trailerPos(tr.z, si), to = ln.pos(idx);
    const path = new L.Path(a.at);
    if (a.at.x < L.DOCK_AISLE_X - 0.5) path.to({ x: L.DOCK_AISLE_X, z: a.at.z > 17 ? 18.6 : a.at.z }, S);
    path.to({ x: L.DOCK_AISLE_X, z: tr.z }, S).to({ x: L.DOOR_X - 1.6, z: tr.z }, 1.2).to({ x: tp.x - F, z: tp.z }, 1.1).raise(0.08, ASSUME.liftRate).wait(ASSUME.handle, 'lift');
    this.fn(path, () => { tr.slots[si] = null; pal.where = { t: 'carried', by: a.id }; pal.stage = 'unloading'; a.carry = pid; });
    path.raise(0.2, ASSUME.liftRate).to({ x: L.DOCK_AISLE_X, z: tr.z }, 1.1, true);
    if (pl.side === 'east') path.to({ x: L.DOCK_AISLE_X, z: to.z }, 1.2).to({ x: to.x + F, z: to.z }, 0.8);
    else path.to({ x: L.DOCK_AISLE_X, z: -7.3 }, S).to({ x: 19.2, z: -7.3 }, S).to({ x: Math.min(19.2, to.x - F - 2.5), z: to.z }, S).to({ x: to.x - F, z: to.z }, 0.8);
    path.raise(0.02, ASSUME.liftRate).wait(ASSUME.handle, 'drop');
    this.fn(path, () => { ln.s[idx] = pid; pal.where = { t: 'lane', side: 'in', lane: ti, i: idx }; pal.stage = 'staged'; a.carry = null; this.m.received++; });
    if (pl.side === 'east') path.to({ x: L.DOCK_AISLE_X, z: to.z }, 0.8, true).raise(0, ASSUME.liftRate);
    else path.to({ x: to.x - F - 2.0, z: to.z }, 0.8, true).raise(0, ASSUME.liftRate).to({ x: 19.2, z: -7.3 }, S);
    this.go(a, path, 'unload');
  }

  // ── receiving ────────────────────────────────────────────────────────────────────────────────────────────────────
  assignReceiver(a) {
    let target = null;
    this.inLanes.forEach((ln, k) => { for (let i = ln.s.length - 1; i >= 0 && !target; i--) { const v = ln.s[i]; if (typeof v === 'number') { const p = this.pallets.get(v); if (!p.checked && p.claim == null) target = { k, i, p }; } } });
    if (!target) return this.idle(a, 2, Math.hypot(a.at.x - a.home.x, a.at.z - a.home.z) > 0.3 ? a.home : null);
    target.p.claim = a.id;
    const pos = this.inLanes[target.k].pos(target.i);
    const side = target.i % 2 ? 1.05 : -1.05;
    const path = new L.Path(a.at).to({ x: pos.x - 0.9, z: pos.z + side * 1.25 }, ASSUME.walk).to({ x: pos.x, z: pos.z + side }, ASSUME.walk).wait(ASSUME.scanTime, 'scan');
    this.fn(path, () => { target.p.checked = true; target.p.claim = null; target.p.stage = target.p.col == null ? 'nospace' : 'checked'; });
    this.go(a, path, 'scan');
  }

  // ── order pickers: let-down replenishment first, then putaway ───────────────────────────────────────────────────
  // The order picker carries the pallet 1.35 m ahead of its centre, under the cab, and the cab rises with it.
  static OP = 1.35;
  assignOrderPicker(a) {
    const S = ASSUME.orderPicker, O = Sim.OP, R = L.RACK.decks;
    // replenishment
    let best = null;
    for (const c of this.cols) {
      if (c.replenBy != null) continue;
      const face = this.pallets.get(c.face); if (!face || face.cartons > ASSUME.reorder) continue;
      const lv = c.reserve.findIndex(v => v !== null && this.pallets.get(v).claim == null); if (lv < 0) continue;
      const d = Math.abs(c.x - a.at.x) + Math.abs(c.z - a.at.z) + face.cartons * 2;
      if (!best || d < best.d) best = { c, lv, d };
    }
    const toward = c => (ROWZ(c) < L.AISLES[c.aisle] ? -1 : 1); // +1: rack is south of the aisle
    const standAt = c => ({ x: c.x, z: c.z - toward(c) * O });
    if (best) {
      const { c, lv } = best; c.replenBy = a.id; const pid = c.reserve[lv], pal = this.pallets.get(pid); pal.claim = a.id;
      const path = new L.Path(a.at);
      L.viaAisle(path, c.aisle, c.x, S);
      path.to(standAt(c), 0.6).raise(R[lv + 1] + 0.06, ASSUME.liftRate, 0).wait(ASSUME.handle, 'lift');
      this.fn(path, () => { c.reserve[lv] = null; pal.where = { t: 'carried', by: a.id }; a.carry = pid; });
      path.raise(R[0] + 0.06, ASSUME.liftRate).wait(ASSUME.handle + 6, 'letdown');
      this.fn(path, () => {
        const face = this.pallets.get(c.face); pal.cartons += face ? face.cartons : 0; if (face) this.pallets.delete(face.id);
        c.face = pid; pal.where = { t: 'rack', col: c.id, level: 0 }; pal.wrapped = false; pal.claim = null; a.carry = null; c.replenBy = null; this.m.replens++;
      });
      path.to({ x: c.x, z: L.AISLES[c.aisle] }, 0.6, true).raise(0, ASSUME.liftRate);
      L.outOfAisle(path, c.aisle, S);
      return this.go(a, path, 'replen');
    }
    // putaway from an inbound lane (the oldest checked pallet; the lane is taken from its back, the west end)
    for (let k = 0; k < this.inLanes.length; k++) {
      const ln = this.inLanes[k], i = ln.take(id => { const q = this.pallets.get(id); return q.checked && q.claim == null && q.col != null; }); if (i < 0) continue;
      const pid = ln.s[i], pal = this.pallets.get(pid);
      pal.claim = a.id; const c = this.cols[pal.col], lv = pal.dest; const at = ln.pos(i);
      const path = new L.Path(a.at);
      path.to({ x: at.x - O - 2.2, z: at.z }, S).to({ x: at.x - O, z: at.z }, 0.6).raise(0.06, ASSUME.liftRate).wait(ASSUME.handle, 'lift');
      this.fn(path, () => { ln.s[i] = null; pal.where = { t: 'carried', by: a.id }; pal.stage = 'putaway'; a.carry = pid; });
      path.raise(0.3, ASSUME.liftRate).to({ x: at.x - O - 2.0, z: at.z }, 0.7, true);
      path.to({ x: 18, z: -6.2 }, S).to({ x: -3.0, z: -6.2 }, S);
      L.viaAisle(path, c.aisle, c.x, S);
      path.to(standAt(c), 0.6).raise(R[lv + 1] + 0.06, ASSUME.liftRate, 0).wait(ASSUME.handle, 'drop');
      this.fn(path, () => { c.reserve[lv] = pid; c.resClaim[lv] = false; pal.where = { t: 'rack', col: c.id, level: lv + 1 }; pal.stage = 'stored'; pal.claim = null; a.carry = null; this.m.putaways++; });
      path.raise(0.3, ASSUME.liftRate).to({ x: c.x, z: L.AISLES[c.aisle] }, 0.6, true).raise(0, ASSUME.liftRate);
      L.outOfAisle(path, c.aisle, S);
      return this.go(a, path, 'putaway');
    }
    this.idle(a, 3, Math.hypot(a.at.x - a.park.x, a.at.z - a.park.z) > 0.3 ? a.park : null);
  }

  // ── tote line ────────────────────────────────────────────────────────────────────────────────────────────────────
  startTotePallet() { this.tote.pallet = this.newPallet({ kind: 'tote', route: null, totes: 0, stage: 'toteopen', where: { t: 'tote' } }).id; this.tote.ready = false; }
  assignTotePicker(a) {
    const T = L.TOTE_LINE;
    const queued = this.totes.length;
    if (queued >= Math.floor((T.x1 - T.x0) / T.pitch) - 2) return this.idle(a, 4);
    const cands = this.cols.filter(c => c.row === 6 && this.pallets.get(c.face)?.cartons >= ASSUME.cartonsPerTote && Math.abs(c.x - a.home.x) < 14);
    if (!cands.length) return this.idle(a, 4);
    const c = cands[Math.floor(this.rng() * cands.length)];
    const path = new L.Path(a.at).to(L.faceStand(c, 0.5), ASSUME.walk).wait(ASSUME.toteFill, 'tote');
    this.fn(path, () => { const f = this.pallets.get(c.face); f.cartons -= ASSUME.cartonsPerTote; this.m.cartons += ASSUME.cartonsPerTote; this.m.pickLog.push([this.t, ASSUME.cartonsPerTote]); a.tote = true; });
    const x = Math.min(T.x1 - 1.0, Math.max(T.x0 + 0.5, c.x));
    path.to({ x, z: T.z - 0.8 }, ASSUME.walk).wait(2.5, 'place');
    this.fn(path, () => { this.totes.push({ x, id: this.nextId++ }); this.totes.sort((p, q) => q.x - p.x); a.tote = false; this.m.totes++; });
    this.go(a, path, 'tote');
  }
  stepConveyor(dt) {
    const T = L.TOTE_LINE; // totes sorted east-most first; each stops at the end or behind the one ahead
    for (let i = 0; i < this.totes.length; i++) {
      const limit = i === 0 ? T.x1 - 0.3 : this.totes[i - 1].x - T.pitch;
      const t = this.totes[i]; t.x = Math.min(limit, t.x + T.speed * dt); t.moving = t.x < limit - 1e-3;
    }
  }
  assignToteBuilder(a) {
    const T = L.TOTE_LINE, pal = this.pallets.get(this.tote.pallet);
    if (!pal || this.tote.ready) return this.idle(a, 2);
    if (pal.route == null) { const r = this.neediestRoute(); if (r < 0) return this.idle(a, 3); pal.route = r; pal.stage = 'tote'; }
    const head = this.totes[0];
    if (!head || head.x < T.x1 - 0.32) return this.idle(a, 1.5);
    const path = new L.Path(a.at).wait(ASSUME.toteStack, 'stack');
    this.fn(path, () => {
      this.totes.shift(); pal.totes++;
      if (pal.totes >= L.TOTES_PER_PALLET) { this.tote.ready = true; pal.stage = 'tote'; pal.labelled = true; this.m.totePallets++; }
    });
    this.go(a, path, 'stack');
  }

  // ── trucks and dock doors ────────────────────────────────────────────────────────────────────────────────────────
  stepTrucks(dt) {
    const A = ASSUME;
    const move = (tr, nextDocked) => {
      const el = this.t - tr.t0;
      if (tr.state === 'arriving') { tr.offset = 26 * Math.pow(1 - Math.min(1, el / A.dockMove), 2); if (el >= A.dockMove) { tr.state = 'opening'; tr.t0 = this.t; tr.offset = 0; } }
      else if (tr.state === 'opening') { tr.door01 = Math.min(1, el / A.doorTime); if (el >= A.doorTime) { tr.state = nextDocked; tr.t0 = this.t; } }
      else if (tr.state === 'closing') { tr.door01 = 1 - Math.min(1, el / A.doorTime); if (el >= A.doorTime) { tr.state = 'leaving'; tr.t0 = this.t; } }
      else if (tr.state === 'leaving') { tr.offset = 26 * Math.pow(Math.min(1, el / A.dockMove), 2); if (el >= A.dockMove) return true; }
      return false;
    };
    for (const tr of this.outTrucks) {
      if (tr.state === 'docked') { tr.state = 'loading'; tr.t0 = this.t; }
      if (tr.state === 'loading' && tr.loaded >= L.TRAILER.cap && tr.slots.every(Boolean)) {
        tr.state = 'closing'; tr.t0 = this.t; this.log(`${L.ROUTES[tr.route].name} truck loaded, door ${tr.door} closing`);
      }
      if (tr.state === 'away') { if (this.t - tr.t0 >= A.truckGap) { tr.state = 'arriving'; tr.t0 = this.t; tr.loaded = 0; tr.staged = false; } continue; }
      if (move(tr, 'loading')) {
        for (const id of tr.slots) if (id) this.pallets.delete(id);
        tr.slots.fill(null); tr.state = 'away'; tr.t0 = this.t; tr.offset = 30; tr.loaded = 0; this.m.trucksOut++;
        this.log(`${L.ROUTES[tr.route].name} truck left for the stores`);
      }
    }
    for (const tr of this.inTrucks) {
      if (tr.state === 'docked') { tr.state = 'unloading'; tr.t0 = this.t; }
      if (tr.state === 'unloading' && tr.slots.every(v => !v)) { tr.state = 'closing'; tr.t0 = this.t; }
      if (tr.state === 'away') {
        if (this.t - tr.t0 >= (tr.wait || A.inboundGap)) { tr.wait = 0; tr.state = 'arriving'; tr.t0 = this.t; this.loadInbound(tr); this.m.trucksIn++; this.log(`Supplier truck arriving at door ${tr.door}`); }
        continue;
      }
      if (move(tr, 'unloading')) { tr.state = 'away'; tr.t0 = this.t; tr.offset = 30; }
    }
  }

  // ── what the page shows ──────────────────────────────────────────────────────────────────────────────────────────
  metrics() {
    const m = this.m, el = Math.max(1, this.t);
    const win = Math.min(900, el); const recent = m.pickLog.reduce((s, x) => s + x[1], 0);
    let resFilled = 0, resTotal = 0, low = 0, empty = 0;
    for (const c of this.cols) { resTotal += 3; resFilled += c.reserve.filter(Boolean).length; const f = this.pallets.get(c.face); if (!f || f.cartons <= ASSUME.reorder) low++; if (!f || f.cartons === 0) empty++; }
    const util = kind => { const as = this.agents.filter(a => a.kind === kind); return as.reduce((s, a) => s + a.busy, 0) / (as.length * el); };
    let staged = 0, toCheck = 0, toPut = 0, noSpace = 0;
    for (const ln of this.inLanes) for (const v of ln.s) if (typeof v === 'number') { staged++; const p = this.pallets.get(v); if (!p.checked) toCheck++; else if (p.col == null) noSpace++; else toPut++; }
    const queue = this.wrappers.reduce((s, w) => s + w.queue.length, 0);
    return {
      clock: this.clock(), elapsed: this.t,
      cartons: m.cartons, cartonsPerHour: Math.round(recent * 3600 / win), storePallets: m.storePallets, totes: m.totes, totePallets: m.totePallets,
      wrapped: m.wrapped, queue, queueMax: m.queueMax, wrapUtil: (m.wrapBusy[0] + m.wrapBusy[1]) / (2 * el),
      loaded: m.loaded, trucksOut: m.trucksOut, received: m.received, trucksIn: m.trucksIn,
      staged, toCheck, toPut, noSpace, putaways: m.putaways, replens: m.replens, shorts: m.shorts,
      reserve: resFilled / resTotal, facesLow: low, facesEmpty: empty, faces: this.cols.length,
      utilPickers: util('picker'), utilForklifts: util('forklift'), utilOrderPickers: util('orderPicker'),
      totesOnLine: this.totes.length,
      doors: [
        ...this.inTrucks.map(tr => ({ door: tr.door, kind: 'in', label: 'Supplier delivery', state: tr.state, n: tr.slots.filter(Boolean).length, cap: L.TRAILER.cap })),
        ...this.outTrucks.map(tr => ({ door: tr.door, kind: 'out', label: L.ROUTES[tr.route].name, state: tr.state, n: tr.loaded, lane: this.outLanes[tr.route].count(), cap: L.TRAILER.cap })),
      ],
    };
  }
}
const ROWZ = c => L.ROWS[c.row].z;
