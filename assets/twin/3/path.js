// assembl lab · twin kit v3 · paths. Plain JavaScript, no rendering, so a twin's sim.js can import it and run in Node.
// Taken from the grocery DC twin (store/dc/layout.js) so every SimReady twin times its jobs the same way.
// A path is a list of steps. A move step goes to a point at a speed (rev: drive in reverse); a dwell step stands still
// (lift: forks or a cab go from one height to another during it). Time along a path is distance over speed plus
// dwells, so the model's service time and the motion on screen come from the same function.
export const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const smooth = f => f * f * (3 - 2 * f);

export class Path {
  constructor(from, lift = 0) { this.steps = []; this.at = { x: from.x, z: from.z }; this.lift = lift; this.total = 0; }
  to(p, speed, rev = false) {
    const d = dist(this.at, p); if (d < 1e-4) return this;
    const t = d / speed; this.steps.push({ k: 'm', a: { ...this.at }, b: { x: p.x, z: p.z }, t, rev, lift: this.lift, d });
    this.at = { x: p.x, z: p.z }; this.total += t; return this;
  }
  via(pts, speed, rev = false) { for (const p of pts) this.to(p, speed, rev); return this; }
  wait(t, tag) { if (t > 0) { this.steps.push({ k: 'w', a: { ...this.at }, t, lift: this.lift, lift2: this.lift, tag }); this.total += t; } return this; }
  raise(h, rate, extra = 0, tag) { // lift to height h at rate m/s, plus a fixed handling time
    const t = Math.max(Math.abs(h - this.lift) / rate + extra, 0.01);
    this.steps.push({ k: 'w', a: { ...this.at }, t, lift: this.lift, lift2: h, tag });
    this.lift = h; this.total += t; return this;
  }
  length() { let d = 0; for (const s of this.steps) if (s.k === 'm') d += s.d; return d; }
  // where the vehicle is at time t (seconds since the path began)
  sample(t, out = {}) {
    let yaw = out.yaw ?? 0, tt = Math.max(0, t), s0 = 0;
    for (let i = 0; i < this.steps.length; i++) {
      const s = this.steps[i];
      if (s.k === 'm') {
        const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z;
        yaw = Math.atan2(dx, dz) + (s.rev ? Math.PI : 0);
        if (tt <= s.t) { const f = tt / s.t; out.x = s.a.x + dx * f; out.z = s.a.z + dz * f; out.yaw = yaw; out.lift = s.lift; out.moving = true; out.tag = null; out.step = i; out.s = s0 + s.d * f; return out; }
        s0 += s.d;
      } else if (tt <= s.t) {
        const f = s.t ? tt / s.t : 1; out.x = s.a.x; out.z = s.a.z; out.yaw = yaw;
        out.lift = s.lift + (s.lift2 - s.lift) * smooth(f); out.moving = false; out.tag = s.tag; out.step = i; out.s = s0; return out;
      }
      tt -= s.t;
    }
    const last = this.steps[this.steps.length - 1];
    out.x = this.at.x; out.z = this.at.z; out.yaw = yaw; out.lift = this.lift; out.moving = false; out.tag = last ? last.tag : null; out.step = this.steps.length; out.s = s0;
    return out;
  }
  // the point d metres back along the path from arc length s (for a trailer that follows its truck); before the path
  // began it extends the first move straight back, so a parked trailer stays in line behind its truck
  back(s, d, out = {}) {
    let want = s - d; const moves = this.steps.filter(x => x.k === 'm');
    if (!moves.length) { out.x = this.at.x; out.z = this.at.z; out.yaw = 0; return out; }
    if (want <= 0) { const m = moves[0], ux = (m.b.x - m.a.x) / m.d, uz = (m.b.z - m.a.z) / m.d; out.x = m.a.x + ux * want; out.z = m.a.z + uz * want; out.yaw = Math.atan2(ux, uz) + (m.rev ? Math.PI : 0); return out; }
    for (const m of moves) { if (want <= m.d) { const f = want / m.d; out.x = m.a.x + (m.b.x - m.a.x) * f; out.z = m.a.z + (m.b.z - m.a.z) * f; out.yaw = Math.atan2(m.b.x - m.a.x, m.b.z - m.a.z) + (m.rev ? Math.PI : 0); return out; } want -= m.d; }
    const m = moves[moves.length - 1]; out.x = m.b.x; out.z = m.b.z; out.yaw = Math.atan2(m.b.x - m.a.x, m.b.z - m.a.z) + (m.rev ? Math.PI : 0); return out;
  }
  // points still to come, for the path overlay
  remaining(t) {
    const pts = []; let tt = t;
    for (const s of this.steps) {
      if (s.k !== 'm') { tt -= s.t; continue; }
      if (tt >= s.t) { tt -= s.t; continue; }
      const f = Math.max(0, tt / s.t); if (!pts.length) pts.push({ x: s.a.x + (s.b.x - s.a.x) * f, z: s.a.z + (s.b.z - s.a.z) * f });
      pts.push(s.b); tt = 0;
    }
    return pts;
  }
}

// a seeded random number generator, so a scenario run twice gives the same day
export const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
// a clock label for seconds since the shift started
export const clockAt = (start, t) => { const s = start + t; const h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };
