// The emergency department model: a generic large NZ city ED, simulated minute by minute. Plain JavaScript, no rendering.
// Shared by the department page (/ed/) and the SimReady floor (/ed/floor/), so both show the same patients and numbers.
// Moved here unchanged from the inline script in ed/index.html.
// A generic large NZ city emergency department, simulated minute by minute.
// Public patterns only: triage mix and day-of-week pattern from Ministry of Health "ED use 2014/15";
// the hour-of-day curve is an estimate from comparable published studies. Not any real hospital.
export const ED = (() => {
  const TRIAGE = [ // share of arrivals, doctor time (min), tests/observation (min), chance of admission
    { cat: 1, share: 0.007, doc: 60, obs: 180, admit: 0.65, amb: 0.85 },
    { cat: 2, share: 0.110, doc: 40, obs: 220, admit: 0.45, amb: 0.55 },
    { cat: 3, share: 0.420, doc: 30, obs: 200, admit: 0.30, amb: 0.35 },
    { cat: 4, share: 0.396, doc: 18, obs: 75, admit: 0.03, amb: 0.10 },
    { cat: 5, share: 0.067, doc: 12, obs: 15, admit: 0.01, amb: 0.04 }];
  // estimated share of a day's arrivals in each hour (trough 3–6am, plateau 10am–8pm)
  const HOUR = (() => { const raw = [2.2, 1.8, 1.5, 1.2, 1.1, 1.2, 1.7, 2.6, 3.8, 5.0, 5.8, 6.0, 5.9, 5.8, 5.7, 5.6, 5.5, 5.5, 5.6, 5.4, 4.9, 4.2, 3.4, 2.7]; const s = raw.reduce((a, b) => a + b); return raw.map(x => x / s); })();
  const DOW = [1.06, 1.0, 0.97, 0.96, 0.99, 0.98, 1.06]; // Mon..Sun (Sun and Mon busiest)
  // ward discharges by hour (most patients leave the ward in the afternoon)
  const DISCH_LATE = (() => { const raw = [0, 0, 0, 0, 0, 0, 0, 0, 0.2, 0.4, 0.7, 1.0, 1.4, 1.8, 2.0, 2.0, 1.8, 1.4, 1.0, 0.6, 0.3, 0.1, 0, 0]; const s = raw.reduce((a, b) => a + b); return raw.map(x => x / s); })();
  const DISCH_EARLY = (() => { const raw = [0, 0, 0, 0, 0, 0, 0, 0, 0.8, 1.6, 2.2, 2.2, 1.8, 1.4, 1.2, 1.0, 0.8, 0.6, 0.4, 0.3, 0.1, 0, 0, 0]; const s = raw.reduce((a, b) => a + b); return raw.map(x => x / s); })();
  const BASE = { perDay: 280, cubicles: 44, resus: 4, doctors: 6, triageNurses: 2, wardPerDay: 62, surge: 0, shift: 0, fastTrack: false, ftChairs: 14, extraBeds: 0, earlyDischarge: false, wardBuffer: 3 };

  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; }; }
  function newState(S, seed = 7) {
    return { t: 0, rand: rng(seed), id: 0, pts: [], done: [], wardFree: 4, docs: Array.from({ length: S.doctors }, () => ({ busy: 0, p: null })), triageBusy: Array(S.triageNurses).fill(0), arrAcc: 0, ftDocs: [{ p: null }, { p: null }], dischAcc: 0 };
  }
  const dayOf = t => Math.floor(t / 1440), hourOf = t => Math.floor((t % 1440) / 60);
  function arrivalsPerMin(S, t) { const d = dayOf(t) % 7, h = hourOf(t); return S.perDay * (1 + S.surge) * DOW[d] * HOUR[h] / 60; }
  function pickCat(r) { let x = r, a = 0; for (const c of TRIAGE) { a += c.share; if (x < a) return c; } return TRIAGE[2]; }
  // one simulated minute
  function step(S, st) {
    const R = st.rand, t = st.t;
    // arrivals (some lower-urgency patients go elsewhere if "right place" is on)
    st.arrAcc += arrivalsPerMin(S, t);
    while (st.arrAcc >= 1) { st.arrAcc -= 1; const c = pickCat(R());
      if (c.cat >= 4 && R() < S.shift) { st.diverted = (st.diverted || 0) + 1; continue; }
      const amb = R() < c.amb;
      st.pts.push({ id: ++st.id, cat: c.cat, amb, arr: t, state: "triage", left: 2 + R() * 4, admit: R() < c.admit, docLeft: c.doc * (0.6 + R() * 0.8), obsLeft: c.obs * (0.6 + R() * 0.8), where: null, seenAt: null }); }
    // ward beds free up through the day
    const dis = (S.earlyDischarge ? DISCH_EARLY : DISCH_LATE)[hourOf(t)] * (S.wardPerDay + S.extraBeds / 4) / 60;
    st.dischAcc += dis; while (st.dischAcc >= 1) { st.dischAcc -= 1; st.wardFree += 1; }
    st.wardFree = Math.min(st.wardFree, S.wardBuffer + S.extraBeds / 7);
    // triage (two nurses, about 2–6 minutes each)
    let nurses = S.triageNurses;
    for (const p of st.pts) { if (p.state !== "triage") continue; if (nurses <= 0) break; nurses--; p.left -= 1; if (p.left <= 0) p.state = "wait"; }
    // place waiting patients: most urgent first, then longest waiting
    const inCub = st.pts.filter(p => p.where === "cub").length, inRes = st.pts.filter(p => p.where === "resus").length, inFt = st.pts.filter(p => p.where === "ft").length;
    let freeCub = S.cubicles - inCub, freeRes = S.resus - inRes, freeFt = S.ftChairs - inFt;
    const waiting = st.pts.filter(p => p.state === "wait").sort((a, b) => a.cat - b.cat || a.arr - b.arr);
    for (const p of waiting) {
      if (p.cat === 1 && freeRes > 0) { p.where = "resus"; freeRes--; p.state = "needdoc"; continue; }
      if (p.cat >= 4) { if (freeFt > 0) { p.where = "ft"; freeFt--; p.state = "needdoc"; } else if (freeCub > 6) { p.where = "cub"; freeCub--; p.state = "needdoc"; } continue; }
      if (freeCub > 0) { p.where = "cub"; freeCub--; p.state = "needdoc"; }
    }
    // doctors: most urgent patient in a space without a doctor yet
    const free = st.docs.filter(d => !d.p);
    if (free.length) { const need = st.pts.filter(p => p.state === "needdoc").sort((a, b) => a.cat - b.cat || a.arr - b.arr);
      for (const d of free) { const p = need.shift(); if (!p) break; d.p = p; p.state = "doc"; if (p.seenAt == null) p.seenAt = t; } }
    if (S.fastTrack) for (const d of st.ftDocs) { if (d.p) continue; const p = st.pts.filter(q => q.state === "needdoc" && q.where === "ft").sort((a, b) => a.arr - b.arr)[0]; if (!p) break; d.p = p; p.state = "doc"; p.docLeft *= 0.8; p.obsLeft *= 0.6; if (p.seenAt == null) p.seenAt = t; }
    for (const d of [...st.docs, ...st.ftDocs]) { const p = d.p; if (!p) continue; p.docLeft -= 1; if (p.docLeft <= 0) { d.p = null; p.state = "obs"; } }
    // tests and observation, then home or a ward bed
    for (const p of st.pts) {
      if (p.state === "obs") { p.obsLeft -= 1; if (p.obsLeft <= 0) p.state = p.admit ? "board" : "out"; p.decided = t; }
      if (p.state === "board" && st.wardFree >= 1) { st.wardFree -= 1; p.state = "ward"; }
    }
    // leave
    const keep = [];
    for (const p of st.pts) { if (p.state === "out" || p.state === "ward") { st.done.push({ id: p.id, arr: p.arr, out: t, cat: p.cat, admit: p.state === "ward", seen: p.seenAt }); } else keep.push(p); }
    st.pts = keep;
    if (st.done.length > 5000) st.done.splice(0, st.done.length - 5000);
    st.t++;
  }
  function stats(st, windowMin = 1440) {
    const since = st.t - windowMin, w = st.done.filter(d => d.out >= since);
    const within6 = w.length ? w.filter(d => d.out - d.arr <= 360).length / w.length : 1;
    const waits = w.filter(d => d.seen != null).map(d => d.seen - d.arr).sort((a, b) => a - b);
    const med = waits.length ? waits[Math.floor(waits.length / 2)] : 0;
    const board = st.pts.filter(p => p.state === "board").length, wait = st.pts.filter(p => p.state === "wait" || p.state === "triage").length;
    const ramped = st.pts.filter(p => p.amb && (p.state === "wait" || p.state === "triage") && st.t - p.arr > 15).length;
    const longest = st.pts.reduce((m, p) => Math.max(m, st.t - p.arr), 0);
    return { within6, med, board, wait, ramped, longest, seen: w.length, inED: st.pts.length };
  }
  // a whole simulated week for a scenario, returning daily and overall measures
  function week(S, seed = 11) {
    const st = newState(S, seed); for (let i = 0; i < 1440 * 2; i++) step(S, st); // two days to warm up
    st.done = []; const t0 = st.t; let boardSum = 0, rampSum = 0, n = 0;
    for (let i = 0; i < 1440 * 7; i++) { step(S, st); if (i % 15 === 0) { const s = stats(st, 1); boardSum += s.board; rampSum += s.ramped; n++; } }
    const all = st.done.filter(d => d.out >= t0);
    const within6 = all.length ? all.filter(d => d.out - d.arr <= 360).length / all.length : 1;
    const waits = all.filter(d => d.seen != null).map(d => d.seen - d.arr).sort((a, b) => a - b);
    return { within6, medWait: waits.length ? waits[Math.floor(waits.length / 2)] : 0, board: boardSum / n, ramped: rampSum / n, visits: all.length + (st.diverted || 0), diverted: st.diverted || 0 };
  }
  return { TRIAGE, HOUR, DOW, BASE, newState, step, stats, week, arrivalsPerMin, hourOf, dayOf };
})();
