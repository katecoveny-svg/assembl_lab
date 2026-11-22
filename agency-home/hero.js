// assembl.co.nz home: the hero. A small New Zealand bach that assembles itself.
// Every part is modelled here in code at real size (metres): piles, bearers, joists, floor, wall framing, cladding
// boards, lining, joinery with glass, roof framing, long-run roofing, deck, balustrade, steps and planting.
// The parts start as a flat lay around the site, drawn in plum line on the page. They lift and fly into place in true
// building order, and each one turns from line to material as it lands: line means proposed, material means done.
// It plays itself. Drag to turn it, scroll to run the build forward; after a rest it goes back to playing.
// Reduced motion: one still frame of the finished house. No WebGL, or anything fails: a prepared picture.
// Frame: x along the front of the house, y up, z toward the viewer (downhill). Floor level is y = 0.
const fig = document.getElementById("hero-pic");
const cap = fig && fig.querySelector("figcaption");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const qs = new URLSearchParams(location.search);
const FREEZE = qs.has("t") ? parseFloat(qs.get("t")) || 0 : null;   // ?t=12 holds one moment of the build, for stills
const CAP0 = cap && cap.textContent;                                  // the page's own caption: true of the prepared picture

function still() {                                   // the prepared picture of the finished house
  if (!fig || fig.querySelector("img")) return;
  const im = new Image(); im.width = 1400; im.height = 1400; im.decoding = "async";
  im.alt = "A small dark timber house on piles, with a deck, steps and a mono-pitch roof";
  im.src = "./img/house-assembled.webp?v=20261122c";
  fig.querySelector("canvas")?.remove(); fig.prepend(im);
  if (cap) { cap.textContent = CAP0; cap.style.visibility = ""; }
}
function hasGL() {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext(); return true;
  } catch { return false; }
}
if (fig) {
  // while three.js loads there is no picture yet, so no caption either; the scene or the picture brings its own
  if (hasGL()) { if (cap) cap.style.visibility = "hidden"; import("three").then(start).catch((e) => { console.warn("hero: showing the still picture.", e); still(); }); }
  else still();
}

function start(THREE) {
  const { Vector3, Quaternion, Matrix4, Color } = THREE;
  const v = (x = 0, y = 0, z = 0) => new Vector3(x, y, z);
  const X = v(1), Y = v(0, 1), Z = v(0, 0, 1), ONE = v(1, 1, 1), Q0 = new Quaternion();
  const clamp = (a, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, a));
  const smooth = (a) => a * a * (3 - 2 * a);
  const lerp = (a, b, k) => a + (b - a) * k;
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const R = (a, b) => a + (b - a) * rnd();

  // ---------- the site and the roof line ----------
  const G = (z) => -0.75 - 0.16 * (z + 2.1);          // the ground: an even slope falling toward the viewer
  const S = 0.9 / 4.11, K = Math.hypot(1, S);         // roof slope: 2.4 m at the back wall, 3.3 m at the front
  const roofU = (z) => 3.3 + S * (z - 2.01);          // underside of the rafters
  const E = v(0, S, 1).normalize(), N = v(0, 1, -S).normalize();   // up the roof slope, and square off it
  const U = (x, z, off = 0, along = 0) => v(x, roofU(z), z).addScaledVector(N, off).addScaledVector(E, along);

  // ---------- parts ----------
  // A part is one thing a builder would carry: a stud, a board, a window. It has a home (p, q), a place in the flat
  // lay (lp, lq) and one or more boxes ("bits") in its own frame: x along its length, y through its thin side.
  const parts = [], kinds = {}, mb = new Matrix4();
  const frame = (xd, yd) => {
    const x = xd.clone().normalize(), z = v().crossVectors(x, yd).normalize(), y = v().crossVectors(z, x);
    return new Quaternion().setFromRotationMatrix(mb.makeBasis(x, y, z));
  };
  function piece(step, p, q, o = {}) {
    const pc = { step, p, q, n: o.n || Y, ord: o.ord ?? parts.length, lay: o.lay || step, bits: [], lo: v(1e9, 1e9, 1e9), hi: v(-1e9, -1e9, -1e9), stand: o.stand, s: -1 };
    parts.push(pc); return pc;
  }
  function bit(pc, kind, x, y, z, sx, sy, sz, tint) {
    const b = { pc, kind, m: new Matrix4().compose(v(x, y, z), Q0, v(sx, sy, sz)), ax: sx >= sy && sx >= sz ? 0 : sy >= sz ? 1 : 2, tint };
    (kinds[kind] ||= []).push(b); pc.bits.push(b);
    pc.lo.min(v(x - sx / 2, y - sy / 2, z - sz / 2)); pc.hi.max(v(x + sx / 2, y + sy / 2, z + sz / 2));
  }
  // one straight member: L along xd, its thin side T along yd, W across
  function member(step, kind, L, T, W, p, xd, yd, o) { const pc = piece(step, p, frame(xd, yd), o); bit(pc, kind, 0, 0, 0, L, T, W); return pc; }
  // a stair stringer: a board with plumb cuts at both ends. Its top edge runs from a to b; it is dv deep measured
  // plumb, T thick across `lat`. (A box sheared so its end cuts stand upright, as a builder cuts them.)
  function stringer(step, a, b, dv, T, lat, o) {
    const ax = b.clone().sub(a), q = frame(ax, lat), iq = q.clone().invert();
    const pc = piece(step, a.clone().add(b).multiplyScalar(0.5).add(v(0, -dv / 2, 0)), q, o);
    const m = new Matrix4().makeBasis(ax.clone().applyQuaternion(iq), v(0, T, 0), v(0, -dv, 0).applyQuaternion(iq));
    const bb = { pc, kind: "deck", m, ax: 0 }; (kinds.deck ||= []).push(bb); pc.bits.push(bb);
    for (const sx of [-0.5, 0.5]) for (const sy of [-0.5, 0.5]) for (const sz of [-0.5, 0.5]) { const c = v(sx, sy, sz).applyMatrix4(m); pc.lo.min(c); pc.hi.max(c); }
    return pc;
  }

  // ---------- subfloor ----------
  const PX = [-3.4, -2.04, -0.68, 0.68, 2.04, 3.4];
  [-1.95, 0, 1.95].forEach((z, r) => PX.forEach((x, i) => { const b = G(z) - 0.03, t = -0.4; member("piles", "pile", t - b, 0.125, 0.125, v(x, (t + b) / 2, z), Y, Z, { ord: r * 10 + i }); }));
  [-3.4, -1.7, 0, 1.7, 3.4].forEach((x, i) => { const b = G(4.3) - 0.03, t = -0.412; member("piles", "pile", t - b, 0.125, 0.125, v(x, (t + b) / 2, 4.3), Y, Z, { ord: 30 + i }); });
  for (const z of [-1.95, 0, 1.95]) member("bearers", "pine", 7.2, 0.09, 0.19, v(0, -0.305, z), X, Z);
  member("bearers", "pine", 7.2, 0.09, 0.19, v(0, -0.317, 4.3), X, Z);                       // deck bearer
  for (const sx of [-1, 1]) {                                                                 // braces between the tall deck piles
    const a = v(sx * 3.4, G(4.3) + 0.2, 4.385), b = v(sx * 1.7, -0.5, 4.385), d = b.clone().sub(a);
    member("bearers", "pine", d.length(), 0.045, 0.09, a.clone().add(b).multiplyScalar(0.5), d, Z);
  }
  for (const z of [-2.0775, 2.0775]) member("joists", "pine", 7.2, 0.045, 0.19, v(0, -0.115, z), X, Z, { ord: -1, lay: "bearers" });
  for (let i = 0; i < 17; i++) member("joists", "pine", 4.11, 0.045, 0.19, v(-3.5775 + i * 0.44719, -0.115, 0), Z, X, { ord: i });
  member("joists", "pine", 7.2, 0.045, 0.14, v(0, -0.152, 2.1425), X, Z, { ord: 17, lay: "bearers" });      // deck ledger on the house
  for (let i = 0; i < 17; i++) member("joists", "pine", 2.29, 0.045, 0.14, v(-3.5775 + i * 0.44719, -0.152, 3.31), Z, X, { ord: 18 + i });
  member("joists", "pine", 7.2, 0.045, 0.14, v(0, -0.152, 4.4775), X, Z, { ord: 36, lay: "bearers" });

  // ---------- floor: 2.4 x 1.2 sheets, joints staggered ----------
  [[-2.1, -0.9], [-0.9, 0.3], [0.3, 1.5], [1.5, 2.1]].forEach(([z0, z1], r) => {
    const xs = r % 2 ? [-3.6, -2.4, 0, 2.4, 3.6] : [-3.6, -1.2, 1.2, 3.6];
    for (let i = 0; i < xs.length - 1; i++) member("floor", "ply", xs[i + 1] - xs[i] - 0.004, 0.02, z1 - z0 - 0.004, v((xs[i] + xs[i + 1]) / 2, -0.01, (z0 + z1) / 2), X, Y);
  });

  // ---------- walls: framing, cladding, lining, joinery ----------
  // Each wall runs clockwise seen from above, from its outside corner o along d, with n pointing out.
  // h(u) is the top of its top plate; e is how far its frame stops short at each end (it butts into the long walls).
  const WALLS = [
    { o: v(-3.6, 0, 2.1), d: X, n: Z, L: 7.2, h: () => 3.3, e: 0, cb: -0.04, ops: [{ u0: 0.75, u1: 5.55, y0: 0, y1: 2.2, t: "slider" }, { u0: 0.75, u1: 5.55, y0: 2.4, y1: 3.05, t: "win", panes: 4 }] },
    { o: v(3.6, 0, 2.1), d: v(0, 0, -1), n: X, L: 4.2, h: (u) => roofU(2.1 - u), e: 0.09, cb: -0.21, ct: 0.19 * K, ops: [{ u0: 1.05, u1: 2.55, y0: 0.9, y1: 2.1, t: "win", panes: 1 }] },
    { o: v(3.6, 0, -2.1), d: v(-1, 0, 0), n: v(0, 0, -1), L: 7.2, h: () => 2.4, e: 0, cb: -0.21, ct: -0.006, ops: [{ u0: 1.05, u1: 1.95, y0: 0, y1: 2.05, t: "door" }, { u0: 3.6, u1: 6, y0: 1.5, y1: 2.1, t: "win", panes: 2 }] },
    { o: v(-3.6, 0, -2.1), d: Z, n: v(-1, 0, 0), L: 4.2, h: (u) => roofU(-2.1 + u), e: 0.09, cb: -0.21, ct: 0.19 * K, ops: [{ u0: 1.5, u1: 2.7, y0: 0.9, y1: 2.1, t: "win", panes: 1 }] },
  ];
  WALLS.forEach((w, wi) => {
    const { L, e, ops, h, d, n } = w, slope = (h(L) - h(0)) / L, kw = Math.hypot(1, slope);
    const at = (u, y, off) => v(w.o.x + d.x * u + n.x * off, y, w.o.z + d.z * u + n.z * off);
    const ord = (u) => u / L + wi * 0.02;
    const top = (u) => Math.min(h(u - 0.0225), h(u + 0.0225)) - 0.045 * kw;       // underside of the top plate
    const inOp = (u, m = 0) => ops.filter((o) => u > o.u0 - m && u < o.u1 + m).sort((a, b) => a.y0 - b.y0);
    // bottom plates, cut at doors
    const cuts = [e]; for (const o of ops) if (o.y0 === 0) cuts.push(o.u0, o.u1); cuts.push(L - e);
    for (let i = 0; i < cuts.length; i += 2) member("plates", "pine", cuts[i + 1] - cuts[i], 0.045, 0.09, at((cuts[i] + cuts[i + 1]) / 2, 0.0225, -0.045), d, Y, { ord: ord(cuts[i]) });
    // studs at 600 centres, trimmers beside every opening, short jack studs under sills and over lintels
    const full = [e + 0.0225, L - e - 0.0225]; for (const o of ops) full.push(o.u0 - 0.0225, o.u1 + 0.0225);
    const stud = (u, y0, y1) => member("studs", "pine", y1 - y0, 0.045, 0.09, at(u, (y0 + y1) / 2, -0.045), Y, d, { ord: ord(u) });
    for (let u = 0.6; u < L - e - 0.1; u += 0.6) {
      const os = inOp(u, 0.045);
      if (!os.length) { if (!full.some((f) => Math.abs(f - u) < 0.07)) full.push(u); continue; }
      if (!inOp(u, -0.03).length) continue;
      let y = 0.045;
      for (const o of os) { const y1 = o.y0 - 0.045; if (o.y0 > 0 && y1 - y > 0.12) stud(u, y, y1); y = o.y1 + 0.14; }
      if (top(u) - y > 0.12) stud(u, y, top(u));
    }
    const uniq = [...new Set(full.map((f) => +f.toFixed(4)))].sort((a, b) => a - b);
    for (const u of uniq) stud(u, 0.045, top(u));
    // lintels, sills, and dwangs between the studs
    for (const o of ops) {
      const dl = Math.min(0.14, top((o.u0 + o.u1) / 2) - o.y1), um = (o.u0 + o.u1) / 2;
      if (dl > 0.03) member("nogs", "pine", o.u1 - o.u0, 0.09, dl, at(um, o.y1 + dl / 2, -0.045), d, n, { ord: ord(um), lay: "plates" });
      if (o.y0 > 0) member("nogs", "pine", o.u1 - o.u0, 0.045, 0.09, at(um, o.y0 - 0.0225, -0.045), d, Y, { ord: ord(um), lay: "plates" });
    }
    uniq.forEach((a, i) => {
      const b = uniq[i + 1], um = (a + b) / 2; if (!b || b - a < 0.2 || inOp(um).length) return;
      for (const y of top(um) > 3 ? [1.2, 2.45] : [1.2]) member("nogs", "pine", b - a - 0.045, 0.045, 0.09, at(um, y + (i % 2 ? 0.05 : -0.05), -0.045), d, Y, { ord: ord(um) });
    });
    // top plate (raked on the end walls)
    member("tops", "pine", (L - 2 * e) * kw - (slope ? 0.012 : 0), 0.045, 0.09, at(L / 2, h(L / 2) - 0.0225 * kw, -0.045), d.clone().addScaledVector(Y, slope), Y, { ord: wi });
    // boards and sheets: columns across the wall, cut round the openings
    const sheath = (step, kind, pitch, t, off, a, b, bot, topOf, gap, nd) => {
      const lines = []; for (let u = a + pitch; u < b - 0.05; u += pitch) lines.push(u);
      for (const o of ops) for (const u of [o.u0, o.u1]) { const j = lines.findIndex((l) => Math.abs(l - u) < 0.1); if (j >= 0) lines[j] = u; else lines.push(u); }
      const cs = [a, ...lines.sort((p, q) => p - q), b], runs = {};
      const flush = (r) => member(step, kind, r.q - r.p - gap, t, r.y1 - r.y0 - gap, at((r.p + r.q) / 2, (r.y0 + r.y1) / 2, off), d, n, { ord: ord((r.p + r.q) / 2), n: nd, lay: step + "h" });
      for (let i = 0; i < cs.length - 1; i++) {
        const p = cs[i], q = cs[i + 1], um = (p + q) / 2; if (q - p < 0.02) continue;
        let spans = [[bot, Math.min(topOf(p), topOf(q))]];
        for (const o of inOp(um)) spans = spans.flatMap(([y0, y1]) => [[y0, Math.min(y1, o.y0)], [Math.max(y0, o.y1), y1]]);
        for (const [y0, y1] of spans) {
          if (y1 - y0 < 0.04) continue;
          if (y1 - y0 > 0.45) { member(step, kind, y1 - y0, t, q - p - gap, at(um, (y0 + y1) / 2, off), Y, n, { ord: ord(um), n: nd }); continue; }
          const key = y0.toFixed(3) + "|" + y1.toFixed(3), r = runs[key];      // a short strip: join it to its neighbour
          if (r && Math.abs(r.q - p) < 1e-6) r.q = q; else { if (r) flush(r); runs[key] = { p, q, y0, y1 }; }
        }
      }
      for (const k in runs) flush(runs[k]);
    };
    const wrap = e ? 0 : 0.02;                                  // the long walls' boards cover the corners
    sheath("clad", "clad", 0.15, 0.02, 0.01, -wrap, L + wrap, w.cb, (u) => h(clamp(u, 0, L)) + (w.ct || 0), 0.006, n);
    const li = e ? 0.102 : 0.09;
    sheath("lining", "lining", 1.2, 0.012, -0.096, li, L - li, 0, (u) => h(u) - (slope ? 0.02 : 0), 0.003, n.clone().negate());
    // joinery: each unit is made up before it arrives. Local frame: x up, y out of the wall, z along it.
    for (const o of ops) {
      const W = o.u1 - o.u0, H = o.y1 - o.y0, um = (o.u0 + o.u1) / 2, ym = (o.y0 + o.y1) / 2, F = 0.05, q = frame(Y, n);
      const pc = piece("joinery", at(um, ym, 0), q, { n, ord: ord(um) });
      bit(pc, "alu", 0, -0.035, -(W / 2 - F / 2), H, 0.11, F); bit(pc, "alu", 0, -0.035, W / 2 - F / 2, H, 0.11, F);
      bit(pc, "alu", H / 2 - F / 2, -0.035, 0, F, 0.11, W - 2 * F); bit(pc, "alu", -(H / 2 - F / 2), -0.035, 0, F, 0.11, W - 2 * F);
      if (o.t === "win") {
        const pw = (W - 2 * F) / o.panes;
        for (let i = 0; i < o.panes; i++) {
          bit(pc, "glass", 0, -0.035, -W / 2 + F + pw * (i + 0.5), H - 2 * F, 0.012, pw - (o.panes > 1 ? 0.04 : 0));
          if (i) bit(pc, "alu", 0, -0.035, -W / 2 + F + pw * i, H - 2 * F, 0.07, 0.04);
        }
      } else if (o.t === "door") {
        bit(pc, "door", -F / 2, -0.03, 0, H - F - 0.008, 0.04, W - 2 * F - 0.006);
        bit(pc, "alu", -0.03, 0.0, W / 2 - F - 0.09, 0.15, 0.05, 0.022);
      } else {                                                  // four sliding leaves on two tracks
        const lw = (W - 2 * F + 0.09) / 4, lh = H - 2 * F, st = 0.06;     // leaves lap each other by 30, not the jambs
        for (let i = 0; i < 4; i++) {
          const lu = o.u0 + F + i * (lw - 0.03) + lw / 2, off = -0.035 + (i % 2 ? 0.02 : -0.02);
          const lf = piece("joinery", at(lu, ym, off), q, { n, ord: ord(lu) + 0.3 });
          bit(lf, "alu", 0, 0, -(lw / 2 - st / 2), lh, 0.036, st); bit(lf, "alu", 0, 0, lw / 2 - st / 2, lh, 0.036, st);
          bit(lf, "alu", lh / 2 - st / 2, 0, 0, st, 0.036, lw - 2 * st); bit(lf, "alu", -(lh / 2 - st / 2), 0, 0, st, 0.036, lw - 2 * st);
          bit(lf, "glass", 0, 0, 0, lh - 2 * st, 0.012, lw - 2 * st);
        }
      }
    }
  });

  // ---------- roof: rafters, blocking, purlins, long-run trays, fascias and a gutter ----------
  const RX = (i) => -3.5775 + i * 0.59625;
  for (let i = 0; i < 13; i++) member("rafters", "pine", 5.4 * K, 0.045, 0.19, U(RX(i), 0.3, 0.095), E, X, { n: N, ord: i });
  for (const sx of [-1, 1]) member("rafters", "trim", 5.4 * K, 0.045, 0.19, U(sx * 3.9225, 0.3, 0.095), E, X, { n: N, ord: 13 });
  for (const z of [2.055, -2.055]) for (let i = 0; i < 12; i++) member("blocking", "trim", 0.55125, 0.045, 0.19, U((RX(i) + RX(i + 1)) / 2, z, 0.095), X, E, { n: N, ord: i });
  for (const sx of [-1, 1]) for (const z of [-1.4, 0.4, 2.2]) {                  // outriggers carry the verge (outside the end-wall boards)
    const x0 = Math.abs(z) < 2.1 ? 3.62 : 3.6;
    member("blocking", "pine", 3.9 - x0, 0.045, 0.19, U((sx * (x0 + 3.9)) / 2, z, 0.095), X, E, { n: N, ord: 12 });
  }
  [-2.3, -1.4, -0.5, 0.4, 1.3, 2.2, 2.9].forEach((z, i) => member("purlins", "pine", 7.89, 0.045, 0.07, U(0, z, 0.2125), X, N, { n: N, ord: i }));
  for (let i = 0; i < 20; i++) {
    const w = 0.3945, pc = piece("trays", U(-3.945 + (i + 0.5) * w, 0.3, 0.239), frame(E, N), { n: N, ord: i });
    bit(pc, "steel", 0, 0, 0, 5.5 * K, 0.008, w - 0.004); bit(pc, "steel", 0, 0.024, -(w / 2 - 0.015), 5.5 * K, 0.04, 0.03);
    if (!i) bit(pc, "steel", 0, 0.024, w / 2 - 0.015, 5.5 * K, 0.04, 0.03);
  }
  member("fascia", "trim", 7.89, 0.02, 0.235, U(0, 3, 0.1175, 0.01), X, E, { n: Z });
  member("fascia", "trim", 7.89, 0.02, 0.235, U(0, -2.4, 0.1175, -0.01), X, E, { n: v(0, 0, -1) });
  {                                                                              // the gutter hangs on the back fascia's face
    const f0 = U(0, -2.4, 0, -0.02), gy = roofU(-2.4) + 0.15, gz = f0.z - (gy + 0.045 - f0.y) * S - 0.06;
    member("fascia", "steel", 7.89, 0.09, 0.12, v(0, gy, gz), X, Y, { n: v(0, 0, -1) });
  }
  for (const sx of [-1, 1]) member("fascia", "trim", 5.44 * K, 0.02, 0.255, U(sx * 3.957, 0.3, 0.1275), E, X, { n: v(sx, 0, 0), lay: "rafters" });   // barge boards

  // ---------- deck, balustrade and steps ----------
  for (let r = 0; r < 16; r++) {
    const z = 2.14 + (r + 0.5) * 0.14875, j = r % 2 ? 0.9 : -0.9;
    member("dboards", "deck", j + 3.6 - 0.004, 0.032, 0.143, v((j - 3.6) / 2, -0.066, z), X, Y, { ord: r });
    member("dboards", "deck", 3.6 - j - 0.004, 0.032, 0.143, v((j + 3.6) / 2, -0.066, z), X, Y, { ord: r + 0.5 });
  }
  const post = (x, z, y0 = -0.05, y1 = 0.95, step = "dposts", o) => member(step, "deck", y1 - y0, 0.09, 0.09, v(x, (y0 + y1) / 2, z), Y, Z, o);
  const FP = [-3.555, -2.37, -1.185, 0, 1.185, 2.37, 3.555];
  FP.forEach((x) => post(x, 4.455)); post(-3.555, 2.19); post(-3.555, 3.32); post(3.555, 3.345); post(3.555, 2.19);
  // a run of balustrade between two posts: bottom rail, then balusters at under 100 clear
  const rail = (a, b, fixed, alongX, ord) => {
    const len = b - a - 0.09, mid = (a + b) / 2, pos = (t) => (alongX ? v(t, 0, fixed) : v(fixed, 0, t));
    member("drails", "deck", len, 0.045, 0.065, pos(mid).setY(0.07), alongX ? X : Z, Y, { ord });
    const k = Math.ceil(len / 0.125) - 1;
    for (let i = 1; i <= k; i++) member("dbal", "deck", 0.8575, 0.02, 0.04, pos(a + 0.045 + (len * i) / (k + 1)).setY(0.52125), Y, alongX ? Z : X, { ord: ord + i / 20 });
  };
  for (let i = 0; i < 6; i++) rail(FP[i], FP[i + 1], 4.455, true, 2 + i);
  rail(2.19, 3.32, -3.555, false, 0); rail(3.32, 4.455, -3.555, false, 1); rail(3.345, 4.455, 3.555, false, 8);
  member("drails", "deck", 7.2, 0.045, 0.14, v(0, 0.9725, 4.455), X, Y, { ord: 20 });         // cap rails
  member("drails", "deck", 2.24, 0.045, 0.14, v(-3.555, 0.9725, 3.265), Z, Y, { ord: 21 });
  member("drails", "deck", 1.085, 0.045, 0.14, v(3.555, 0.9725, 3.8425), Z, Y, { ord: 22 });
  // steps off the east end of the deck, down to a level concrete pad: 8 equal risers on a 280 going. The stringers
  // hang off the deck's end joist with plumb cuts, flush with the deck, and stand on the pad; the treads run between them.
  // The pad is level, so it is set into the slope uphill and shows its edge downhill.
  const PAD = { y: G(2.12) + 0.02, z0: 2.12, z1: 3.45 }, RISE = (-0.05 - PAD.y) / 8, GO = 0.28, SL = RISE / GO;
  const DV = 0.19 * Math.hypot(1, SL), TOE = (-0.05 - DV - PAD.y) / SL, SZ = [2.235, 3.29];   // plumb depth; where the stringer meets the pad
  const padT = PAD.y - (G(PAD.z1) - 0.03);
  member("stairs", "stone", PAD.z1 - PAD.z0, padT, 0.9, v(3.6 + TOE + 0.3, PAD.y - padT / 2, (PAD.z0 + PAD.z1) / 2), Z, Y, { ord: -1 });
  for (const z of SZ) stringer("stairs", v(3.6, -0.05, z), v(3.6 + TOE, -0.05 - TOE * SL, z), DV, 0.045, Z, { ord: 0 });
  for (let k = 1; k <= 7; k++) member("stairs", "deck", SZ[1] - SZ[0] - 0.045, 0.045, 0.3, v(3.6 + (k - 0.5) * GO, -0.05 - k * RISE - 0.0225, (SZ[0] + SZ[1]) / 2), Z, Y, { ord: k });
  const bx = 3.6 + 6.5 * GO, by = -0.05 - 7 * RISE;
  for (const [z, x0] of [[SZ[0] - 0.0675, 3.6], [SZ[1] + 0.0675, 3.638]]) {      // newel posts on the pad; rails from the deck
    post(bx, z, PAD.y, by + 0.95, "stairs", { ord: 8 });
    const a = v(x0, 0.9725, z), b = v(bx + 0.045, by + 0.9725, z);
    member("stairs", "deck", a.distanceTo(b), 0.045, 0.09, a.clone().add(b).multiplyScalar(0.5), b.clone().sub(a), Y, { ord: 9 });
  }
  // three steps at the back door, hung off the house and landing on the ground, which rises behind it
  const BR = 0.16, BG = 0.28, BSL = BR / BG, BDV = 0.19 * Math.hypot(1, BSL), BZ = -2.12, BTOE = (-BDV - G(BZ)) / (BSL + 0.16);
  for (const x of [1.6225, 2.5775]) stringer("stairs", v(x, 0, BZ), v(x, -BTOE * BSL, BZ - BTOE), BDV, 0.045, X, { ord: 11, lay: "bsteps" });
  for (let k = 1; k <= 3; k++) member("stairs", "deck", 0.91, 0.045, 0.29, v(2.1, -BR * k - 0.0225, BZ - (k - 1) * BG - 0.145), X, Y, { ord: 11 + k, lay: "bsteps" });

  // ---------- planting: harakeke, tussock and one tī kōuka, each leaf a blade ----------
  const qa = new Quaternion(), qb = new Quaternion(), mt = new Matrix4();
  function blade(pc, x, y, z, az, tilt, len, wid, col, bend = 1, dir) {
    qa.setFromAxisAngle(Y, az); qb.setFromAxisAngle(X, tilt); qa.multiply(qb);
    if (dir) qa.premultiply(dir);
    const b = { pc, kind: "blade", m: new Matrix4().compose(v(x, y, z), qa, v(wid, len, len * bend)).multiply(mt.makeTranslation(0, 0.5, 0)), ax: 1, col };
    (kinds.blade ||= []).push(b); pc.bits.push(b);
  }
  const GREEN = ["#6f7d58", "#7b8961", "#66744f", "#87926b"], STRAW = ["#b6aa80", "#a79c72", "#c2b68e", "#9a9468"];
  const pick = (a) => a[(rnd() * a.length) | 0];
  function plant(type, x, z, s = 1) {
    const pc = piece("plants", v(x, G(z), z), new Quaternion(), { stand: true }); pc.kind = type;
    if (type === "tussock") { for (let i = 0; i < 38; i++) blade(pc, R(-0.05, 0.05), 0, R(-0.05, 0.05), R(0, 6.283), R(0.08, 0.95), s * R(0.45, 0.8), 0.026, pick(STRAW), R(1.2, 2.2)); pc.r = 0.4 * s; pc.h = 0.75 * s; pc.rr = 0.65 * s; }
    if (type === "flax") {                       // harakeke: fans of strap leaves, upright in the middle, arching over at the edges
      for (let f = 0; f < 3; f++) {
        const fa = f * 2.1 + R(0, 0.6);
        for (let i = 0; i < 9; i++) {
          const t = ((i - 4) / 4) * 0.62 + R(-0.05, 0.05), a = Math.abs(t);
          blade(pc, R(-0.05, 0.05), 0, R(-0.05, 0.05), fa + (t < 0 ? Math.PI : 0) + R(-0.3, 0.3), a + 0.05, s * R(1.35, 1.95) * (1 - a * 0.3), 0.075, pick(GREEN), 0.5 + a * 3.2);
        }
      }
      pc.r = 0.7 * s; pc.h = 1.9 * s; pc.rr = 1.45 * s;
    }
    if (type === "ti") {
      const h = 3.1 * s, add = (m, col) => { const b = { pc, kind: "trunk", m, ax: 1, col }; (kinds.trunk ||= []).push(b); pc.bits.push(b); };
      add(new Matrix4().compose(v(0, h / 2, 0), Q0, v(0.26, h, 0.26)), "#8d7f6d");
      for (let k = 0; k < 3; k++) {
        const dq = new Quaternion().setFromAxisAngle(Y, k * 2.094 + 0.4).multiply(new Quaternion().setFromAxisAngle(X, k ? 0.62 : 0.3));
        const bl = k ? 0.75 : 1.05, tip = v(0, bl, 0).applyQuaternion(dq).add(v(0, h - 0.05, 0));
        add(new Matrix4().compose(v(0, bl / 2, 0).applyQuaternion(dq).add(v(0, h - 0.05, 0)), dq, v(0.15, bl, 0.15)), "#8d7f6d");
        for (let i = 0; i < 44; i++) { const tl = R(0.05, 2.2); blade(pc, tip.x, tip.y - 0.06, tip.z, R(0, 6.283), tl, R(0.6, 0.95), 0.05, tl > 1.75 ? pick(STRAW) : pick(GREEN), 0.4 + tl * 0.5, dq); }
      }
      pc.r = 0.9; pc.h = 4.9; pc.rr = 1.2;
    }
    return pc;
  }
  plant("ti", 5.8, -3.2);                     // behind the east end, so it stands clear of the roof from the front
  [[-5.0, 3.1, 1], [-5.2, 0.4, 0.85], [5.6, -1.6, 1], [2.2, 5.7, 0.9], [-1.8, 5.9, 1.05]].forEach(([x, z, s]) => plant("flax", x, z, s));
  [[-4.3, 4.7], [-3.1, 5.6], [0.2, 5.4], [4.3, 5.1], [6.2, 4.3], [6.3, 0.6], [4.6, -3.1], [-0.8, -3.3], [-5.2, -1.3]].forEach(([x, z]) => plant("tussock", x, z, R(0.85, 1.15)));

  // ---------- timing: the building order ----------
  // step: [starts at, spread over] in seconds. Each part flies for about 1.15 s.
  const STEPS = {
    piles: [0.35, 0.9], bearers: [1.3, 0.5], joists: [1.8, 1.1], floor: [3.0, 0.8],
    plates: [3.9, 0.4], studs: [4.2, 1.7], nogs: [5.7, 1.0], tops: [6.6, 0.3],
    clad: [7.1, 2.4], lining: [8.9, 1.1], joinery: [10.3, 1.0],
    rafters: [11.5, 0.9], blocking: [12.2, 0.5], purlins: [12.7, 0.5], trays: [13.2, 1.1], fascia: [14.2, 0.3],
    dboards: [14.6, 0.9], dposts: [15.4, 0.4], drails: [15.8, 0.5], dbal: [16.1, 1.0], stairs: [16.6, 0.9],
    plants: [17.7, 0.9],
  };
  const LOW = new Set(["dboards", "dposts", "drails", "dbal", "stairs"]);       // these come in low, under the eaves
  const TB = 22, HOLD = 5.5, RESET = 4.2, REST = 0.5, LOOP = TB + HOLD + RESET + REST;
  for (const name in STEPS) {
    const list = parts.filter((p) => p.step === name).sort((a, b) => a.ord - b.ord);
    list.forEach((p, i) => { p.t0 = STEPS[name][0] + (list.length > 1 ? i / (list.length - 1) : 0) * STEPS[name][1]; p.dur = 1.15 * R(0.9, 1.15); });
  }
  for (const p of parts) {
    if (p.stand) { p.c = v(); p.L = p.W = p.r * 2; p.T = 0; }
    else { p.c = p.lo.clone().add(p.hi).multiplyScalar(0.5); p.L = p.hi.x - p.lo.x; p.T = p.hi.y - p.lo.y; p.W = p.hi.z - p.lo.z; if (p.W > p.L) { [p.L, p.W] = [p.W, p.L]; p.turn = true; } }
    p.low = LOW.has(p.step);
    p.hov = p.p.clone().addScaledVector(p.n, p.stand ? 0.5 : 0.32);
  }

  // ---------- the flat lay: every part set out in rows around the site, sheets in fanned stacks ----------
  // Parts lie on the slope (tilted with it), plants stand upright. p.lc: the corners that must stay in view while it waits.
  const QY = (a) => new Quaternion().setFromAxisAngle(Y, a), LQ = { x: [QY(0), QY(Math.PI / 2)], z: [QY(-Math.PI / 2), QY(0)] };
  const TILT = new Quaternion().setFromAxisAngle(X, Math.atan(0.16)), GN = Y.clone().applyQuaternion(TILT);
  const put = (p, cx, cz, dir, up = 0) => {
    p.lq = p.stand ? Q0 : TILT.clone().multiply(LQ[dir][p.turn ? 1 : 0]);
    p.lp = v(cx, G(cz), cz).addScaledVector(p.stand ? Y : GN, p.T / 2 + 0.012 + up).sub(p.c.clone().applyQuaternion(p.lq));
    const hx = (dir === "x" ? p.L : p.W) / 2, hz = (dir === "x" ? p.W : p.L) / 2;
    p.lc = [];
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const q = v(cx + sx * hx, G(cz + sz * hz), cz + sz * hz);
      p.lc.push(q.clone().setY(q.y + (p.stand ? p.h : p.T + up + 0.02)));
      if (p.stand) p.lc.push(q);
    }
  };
  const pickLay = (names) => parts.filter((p) => names.includes(p.lay));
  // rows: long sides along dir (growing sd), one beside the next (growing sa); a new block once a row is `across` wide
  function lay(names, x0, z0, dir, sd, sa, across, gap = 0.07, bgap = 0.4) {
    const list = pickLay(names).sort((a, b) => names.indexOf(a.lay) - names.indexOf(b.lay) || b.L - a.L);
    let cur = 0, off = 0, maxL = 0;
    for (const p of list) {
      if (cur + p.W > across && cur > 0) { off += maxL + bgap; cur = 0; maxL = 0; }
      const al = sd * (off + p.L / 2), ac = sa * (cur + p.W / 2);
      put(p, dir === "x" ? x0 + al : x0 + ac, dir === "x" ? z0 + ac : z0 + al, dir);
      cur += p.W + gap; maxL = Math.max(maxL, p.L);
    }
  }
  // stacks: sheets one on another, biggest at the bottom, each stepped fx, fz from the one below.
  // Within a stack the top sheet is the first to leave, so nothing is pulled out from under another.
  function stack(names, x0, z0, fx, fz, per, pitch) {
    const list = pickLay(names).sort((a, b) => b.L * b.W - a.L * a.W), ts = list.map((p) => p.t0).sort((a, b) => b - a);
    list.forEach((p, k) => {
      const i = k % per, j = (k / per) | 0; p.t0 = ts[k];
      put(p, x0 + j * pitch + p.L / 2 + i * fx, z0 + Math.sign(fz || 1) * p.W / 2 + i * fz, "x", i * (p.T + 0.004));
    });
  }
  // Set out in rings by time, so the kit shrinks toward the house as it is used: what goes in last waits nearest.
  // Behind the house: the plants (nursery stock, upright) and the back steps, then the roof (it flies over the walls).
  lay(["plants"], 3.4, -4.7, "x", -1, -1, 3.3, 0.25, 0.25);
  lay(["bsteps"], 3.8, -4.7, "x", 1, -1, 2.2, 0.1, 0.25);
  lay(["rafters"], -9.8, -8.4, "x", 1, -1, 5.0, 0.09);
  stack(["trays"], -3.8, -8.4, 0, -0.16, 99, 0);                  // fanned so each tray is carried by the one below
  lay(["purlins", "fascia"], -9.8, -13.6, "x", 1, -1, 2.4, 0.1);
  lay(["blocking"], -1.5, -13.6, "x", 1, -1, 2.0, 0.075, 0.2);
  // in front and to the east: the deck, balustrade and stair, which come in low under the eaves; the joinery, made up
  // and lying on its back
  lay(["dbal", "dposts"], 0.4, 7.8, "z", 1, 1, 7.8, 0.05, 0.2);
  lay(["drails"], 1.4, 10.3, "x", 1, 1, 1.3, 0.07, 0.2);
  lay(["dboards"], -9.6, 8.2, "x", 1, 1, 3.1, 0.05, 0.2);
  lay(["stairs"], 8.6, 5.2, "z", 1, 1, 3.0, 0.1, 0.25);
  lay(["joinery"], 7.4, 4.6, "z", -1, 1, 6.0, 0.2, 0.25);
  // the outer ring, used first: the subfloor behind to the east, the frames to the west, lining and cladding in front
  lay(["joists"], 5.0, -4.8, "z", -1, 1, 4.8, 0.09);
  lay(["bearers"], 10.4, -4.8, "z", -1, 1, 3.0, 0.09);
  lay(["piles"], 5.0, -12.0, "z", -1, 1, 3.4, 0.11);
  stack(["floor"], 9.0, -12.4, 0.09, -0.09, 99, 0);
  lay(["studs"], -6.9, -3.6, "x", -1, 1, 8.9, 0.075);
  lay(["tops", "plates"], -10.6, -3.6, "z", 1, -1, 3.4, 0.08);
  lay(["nogs"], -14.6, -3.6, "x", -1, 1, 8.9, 0.075, 0.2);
  stack(["lining"], -14.0, 5.4, 0, 0.12, 10, 3.7);
  lay(["clad"], -14.0, 12.0, "z", 1, 1, 27.2, 0.02, 0.25);
  lay(["cladh", "liningh"], 8.2, 12.0, "x", 1, 1, 3.2, 0.1, 0.2);

  // ---------- renderer, light, materials ----------
  const PAPER = "#FFFDFB", PLUM = "#654A4E";
  const cv = document.createElement("canvas");
  cv.setAttribute("role", "img"); cv.setAttribute("aria-label", "A small dark timber house assembling itself from a kit of parts: piles, floor, frames, cladding, windows, roof, deck and planting");
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: "high-performance" });
  const small = Math.min(innerWidth, innerHeight) < 700;
  let dpr = Math.min(devicePixelRatio || 1, 2);
  renderer.setClearColor(PAPER, 1);
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(24, 1, 2, 400);

  // a softbox room for the reflections: one big panel overhead, three tall strips, a warm floor
  {
    const es = new THREE.Scene(), mk = (g, r, gg, b) => new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new Color(r, gg, b), side: THREE.DoubleSide }));
    es.add(mk(new THREE.SphereGeometry(40, 24, 12), 0.6, 0.64, 0.7));
    const topP = mk(new THREE.PlaneGeometry(36, 36), 3.4, 3.3, 3.2); topP.position.y = 22; topP.rotation.x = Math.PI / 2; es.add(topP);
    const fl = mk(new THREE.PlaneGeometry(90, 90), 0.8, 0.78, 0.76); fl.position.y = -6; fl.rotation.x = -Math.PI / 2; es.add(fl);
    for (const a of [0.5, 2.6, 4.6]) { const sb = mk(new THREE.PlaneGeometry(6, 26), 5, 4.9, 4.7); sb.position.set(Math.sin(a) * 30, 6, Math.cos(a) * 30); sb.lookAt(0, 4, 0); es.add(sb); }
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, 0.035).texture; pm.dispose();
    scene.environmentIntensity = 0.78;
  }
  const sun = new THREE.DirectionalLight("#fff3e6", 2.5);
  sun.position.set(-7, 19, 9.5); sun.target.position.set(1, 0, 1); sun.castShadow = true;
  const sc = sun.shadow.camera; sc.left = -11; sc.right = 11; sc.top = 11; sc.bottom = -11; sc.near = 2; sc.far = 46;
  sun.shadow.mapSize.setScalar(small ? 1024 : 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.025;
  scene.add(sun, sun.target);

  // One shader idea for every part. Until a part lands it is drawn as paper with a plum outline;
  // as it lands the material sweeps along its length. aFx = (sweep axis, how far the material has got).
  const uni = { uPx: { value: dpr }, uTime: { value: 0 } };
  const VERT_PARS = "attribute vec4 aFx;\nvarying vec2 vE;\nvarying float vSw;\nvarying float vOn;\nuniform float uTime;\n";
  const VERT = "\nvE = uv; vSw = dot(position, aFx.xyz) + 0.5; vOn = aFx.w * 1.04 - 0.02;\n";
  const SWAY = "\n#ifdef USE_INSTANCING\n{ float k = (position.y + 0.5); k *= k; float ph = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3; transformed.z += k * 0.035 * sin(uTime * 1.1 + ph); transformed.x += k * 0.12 * sin(uTime * 0.8 + ph * 1.3); }\n#endif\n";
  const FRAG_PARS = "varying vec2 vE;\nvarying float vSw;\nvarying float vOn;\nuniform float uPx;\n";
  const FRAG = `
    { vec2 fw = fwidth(vE) + 1e-6; vec2 dd = min(vE, 1.0 - vE) / fw; float px = min(dd.x, dd.y);
      float on = step(vSw, vOn);
      float ln = 1.0 - smoothstep(uPx * 0.75 - 0.5, uPx * 0.75 + 0.5, px);
      vec3 drawn = mix(vec3(1.0, 0.992, 0.984), vec3(0.396, 0.29, 0.306), ln);
      gl_FragColor.rgb *= 1.0 - 0.16 * (1.0 - smoothstep(0.0, uPx * 2.2, px));
      gl_FragColor.rgb = mix(drawn, gl_FragColor.rgb, on);
      gl_FragColor.a = mix(1.0, gl_FragColor.a, on); }
  `;
  function fx(m, plant) {
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uni);
      sh.vertexShader = VERT_PARS + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>" + VERT + (plant ? SWAY : ""));
      sh.fragmentShader = FRAG_PARS + sh.fragmentShader.replace("#include <colorspace_fragment>", "#include <colorspace_fragment>" + FRAG);
    };
    m.customProgramCacheKey = () => "fx" + (plant ? 1 : 0);
    return m;
  }
  const depth = (plant) => {            // shadows: a part casts none until its material arrives
    const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: plant ? THREE.DoubleSide : THREE.FrontSide });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uni);
      sh.vertexShader = VERT_PARS + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>" + VERT + (plant ? SWAY : ""));
      sh.fragmentShader = FRAG_PARS + sh.fragmentShader.replace("void main() {", "void main() {\n if (vSw > vOn) discard;");
    };
    m.customProgramCacheKey = () => "fxd" + (plant ? 1 : 0);
    return m;
  };
  // colour, roughness, metalness, how much each piece varies
  const MATS = {
    pile: ["#a59a83", 0.9, 0, 0.06], pine: ["#dcc7a3", 0.78, 0, 0.07], ply: ["#cdb48f", 0.72, 0, 0.05], lining: ["#e0ccab", 0.75, 0, 0.03],
    clad: ["#3d3634", 0.52, 0, 0.2], trim: ["#262324", 0.6, 0, 0.05], steel: ["#4b4f54", 0.4, 0.7, 0.03], alu: ["#1f1e20", 0.45, 0.55, 0],
    door: ["#ae9575", 0.7, 0, 0], deck: ["#ae9575", 0.8, 0, 0.11], stone: ["#cbc6be", 0.95, 0, 0], trunk: ["#ffffff", 0.95, 0, 0], blade: ["#ffffff", 0.72, 0, 0],
    glass: ["#d3e0e3", 0.05, 0.9, 0],
  };
  // geometry: a unit box; a blade (a folded, arching leaf); a tapered eight-sided trunk
  const box = new THREE.BoxGeometry(1, 1, 1);
  const bladeG = (() => {
    const g = new THREE.BufferGeometry(), P = [], UV = [], I = [], n = 6;
    for (let i = 0; i <= n; i++) {
      const t = i / n, w = 0.5 * (1 - Math.pow(t, 2.4)) * (0.55 + 0.45 * Math.min(1, t * 5)), z = 0.34 * t * t;
      P.push(-w, t - 0.5, z, 0, t - 0.5, z - 0.16 * (1 - t), w, t - 0.5, z); UV.push(0, t, 0.5, t, 1, t);
      if (i < n) { const a = i * 3; I.push(a, a + 1, a + 3, a + 1, a + 4, a + 3, a + 1, a + 2, a + 4, a + 2, a + 5, a + 4); }
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals(); return g;
  })();
  const trunkG = (() => {
    const g = new THREE.BufferGeometry(), P = [], UV = [], NR = [], n = 8, rt = 0.34;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 6.2832, a1 = ((i + 1) / n) * 6.2832, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      P.push(0.5 * c0, -0.5, 0.5 * s0, rt * c0, 0.5, rt * s0, rt * c1, 0.5, rt * s1, 0.5 * c0, -0.5, 0.5 * s0, rt * c1, 0.5, rt * s1, 0.5 * c1, -0.5, 0.5 * s1);
      UV.push(0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0); NR.push(c0, 0.1, s0, c0, 0.1, s0, c1, 0.1, s1, c0, 0.1, s0, c1, 0.1, s1, c1, 0.1, s1);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute("normal", new THREE.Float32BufferAttribute(NR, 3)); return g;
  })();
  const AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], col = new Color(), meshes = [];
  for (const kind in kinds) {
    const list = kinds[kind], [c, rough, metal, vary] = MATS[kind], plant = kind === "blade" || kind === "trunk", glass = kind === "glass";
    const geo = (kind === "blade" ? bladeG : kind === "trunk" ? trunkG : box).clone();
    const fxa = new THREE.InstancedBufferAttribute(new Float32Array(list.length * 4), 4);
    geo.setAttribute("aFx", fxa);
    const mat = fx(new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal, side: kind === "blade" ? THREE.DoubleSide : THREE.FrontSide, transparent: glass, opacity: glass ? 0.3 : 1 }), plant);
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    mesh.frustumCulled = false; mesh.castShadow = !glass; mesh.receiveShadow = !glass; mesh.customDepthMaterial = depth(plant);
    if (glass) mesh.renderOrder = 2;
    list.forEach((b, i) => {
      b.mesh = mesh; b.i = i; fxa.setXYZW(i, ...AX[b.ax], 0);
      if (b.col) col.set(b.col); else { const k = 1 + (rnd() - 0.5) * 2 * vary; col.setRGB(k, k * (1 + (rnd() - 0.5) * vary * 0.25), k); }
      mesh.setColorAt(i, col);
    });
    mesh.fx = fxa; meshes.push(mesh); scene.add(mesh);
  }

  // the ground: nothing but the shadow it catches, the plan drawn on it, and a few contour lines
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.ShadowMaterial({ color: "#3a272c", opacity: 0.17 }));
  ground.rotation.x = -Math.PI / 2 + Math.atan(0.16); ground.position.set(0, G(0), 0); ground.receiveShadow = true; ground.renderOrder = 1; scene.add(ground);
  {
    const P = [], C = [], paper = new Color(PAPER), plum = new Color(PLUM), c = new Color();
    const seg = (x0, z0, x1, z1, k) => { c.copy(paper).lerp(plum, k); P.push(x0, G(z0) + 0.006, z0, x1, G(z1) + 0.006, z1); C.push(c.r, c.g, c.b, c.r, c.g, c.b); };
    const rect = (x0, z0, x1, z1, k) => { seg(x0, z0, x1, z0, k); seg(x1, z0, x1, z1, k); seg(x1, z1, x0, z1, k); seg(x0, z1, x0, z0, k); };
    rect(-3.6, -2.1, 3.6, 2.1, 0.85); rect(-3.6, 2.1, 3.6, 4.5, 0.6); rect(3.6, 2.2, 5.56, 3.3, 0.6);
    for (const p of parts) if (p.step === "piles") rect(p.p.x - 0.14, p.p.z - 0.14, p.p.x + 0.14, p.p.z + 0.14, 0.7);
    for (let k = -4; k <= 4; k++) for (let i = 0; i < 64; i++) {      // contours every half metre of fall, fading at the ends
      const f = (j) => { const x = -19 + (38 * j) / 64; return [x, k * 3.125 + 1 + 0.34 * Math.sin(0.31 * x + k * 1.7) + 0.14 * Math.sin(0.83 * x + k)]; };
      const [x0, z0] = f(i), [x1, z1] = f(i + 1); seg(x0, z0, x1, z1, 0.3 * clamp(1.25 - Math.abs(x0 + x1) / 30));
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
    const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false })); lines.frustumCulled = false; scene.add(lines);
  }

  // ---------- pose every part for a moment of the build ----------
  const pm4 = new Matrix4(), tm = new Matrix4(), pos = v(), quat = new Quaternion();
  let moved = true;
  function pose(tau) {
    for (const p of parts) {
      const s = clamp((tau - p.t0) / p.dur);
      if (s === p.s) continue;
      p.s = s; moved = true;
      let on = 0;
      if (s <= 0) { pos.copy(p.lp); quat.copy(p.lq); }
      else if (s >= 1) { pos.copy(p.p); quat.copy(p.q); on = 1; }
      else if (s < 0.8) {                                     // lift, carry, lower to just off its place
        const a = s / 0.8, e = a < 0.5 ? 4 * a * a * a : 1 - Math.pow(-2 * a + 2, 3) / 2;
        pos.lerpVectors(p.lp, p.hov, e); pos.y += p.arc * Math.pow(Math.sin(Math.PI * a), 0.85);
        quat.slerpQuaternions(p.lq, p.q, smooth(clamp((s - 0.05) / 0.55)));
      } else {                                                // drop the last hand's width, land, settle
        const b = (s - 0.8) / 0.2, d = b < 0.55 ? 1 - Math.pow(b / 0.55, 2) : 0.07 * Math.sin(Math.PI * (b - 0.55) / 0.45) * (1 - (b - 0.55) / 0.45);
        pos.lerpVectors(p.p, p.hov, d); quat.copy(p.q);
        on = clamp((b - 0.5) / 0.5);
      }
      pm4.compose(pos, quat, ONE);
      for (const b of p.bits) { tm.multiplyMatrices(pm4, b.m).toArray(b.mesh.instanceMatrix.array, b.i * 16); b.mesh.fx.array[b.i * 4 + 3] = on; b.mesh.dirty = true; }
    }
    for (const m of meshes) if (m.dirty) { m.instanceMatrix.needsUpdate = true; m.fx.needsUpdate = true; m.dirty = false; }
  }
  // a plant whose way in does not cross the house (or the stair) is carried low, beside it; any other lifts over the roof
  const crosses = (a, b, m) => [[-4.1, -2.7, 4.1, 4.6], [3.6, 2.1, 6.3, 3.5]].some(([x0, z0, x1, z1]) => {
    let t0 = 0, t1 = 1; const dx = b.x - a.x, dz = b.z - a.z;
    for (const [p, q] of [[-dx, a.x - (x0 - m)], [dx, x1 + m - a.x], [-dz, a.z - (z0 - m)], [dz, z1 + m - a.z]]) {
      if (Math.abs(p) < 1e-9) { if (q < 0) return false; continue; }
      const r = q / p; if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
    }
    return t0 <= t1;
  });
  for (const p of parts) {                                    // how high each part is carried, and the top of its flight
    const mid = (p.lp.y + p.hov.y) / 2, low = p.low || (p.stand && !crosses(p.lp, p.p, p.rr * 0.8));
    p.arc = low ? 1.25 + rnd() * 0.5 : Math.max(1.6, 6.0 + rnd() * 1.4 - mid);   // high flights top out 6 to 7.4 m up
    const pk = p.lp.clone().add(p.hov).multiplyScalar(0.5); pk.y += p.arc;   // the top of its flight, and its own height there
    p.peak = [pk, pk.clone().setY(pk.y + (p.stand ? p.h : Math.min(1.5, p.L / 2)))];
  }

  // ---------- camera: starts high over the flat lay, comes down and round to the finished house ----------
  // Its angle follows the clock of the build. Its aim and distance are planned (every half second of the build, each
  // time the frame changes size) so that every part still to come stays inside the frame where it lies, as does any part
  // in the air, and the finished house fills it. Turned by hand, it steps back if that angle needs more room.
  const homePts = [];
  {
    const lo = v(1e9, 1e9, 1e9), hi = v(-1e9, -1e9, -1e9), c = v();
    for (const p of parts) if (!p.stand) for (const b of p.bits) {
      tm.multiplyMatrices(pm4.compose(p.p, p.q, ONE), b.m);
      for (const sx of [-0.5, 0.5]) for (const sy of [-0.5, 0.5]) for (const sz of [-0.5, 0.5]) { c.set(sx, sy, sz).applyMatrix4(tm); lo.min(c); hi.max(c); }
    }
    for (const x of [lo.x, hi.x]) for (const z of [lo.z, hi.z]) homePts.push(v(x, G(z), z), v(x, hi.y, z));
  }
  for (const p of parts) if (p.stand) {                       // each plant's outermost leaf tips (and highest), allowing for sway
    const tips = p.bits.map((b) => v(0, 0.5, b.kind === "trunk" ? 0 : 0.34).applyMatrix4(b.m)), out = new Set();
    for (let k = 0; k < 8; k++) { const dx = Math.cos(k * 0.785), dz = Math.sin(k * 0.785); out.add(tips.reduce((m, q) => (q.x * dx + q.z * dz > m.x * dx + m.z * dz ? q : m))); }
    out.add(tips.reduce((m, q) => (q.y > m.y ? q : m)));
    for (const q of out) { const r = Math.hypot(q.x, q.z) || 1; homePts.push(q.clone().add(v((q.x / r) * 0.12, 0.05, (q.z / r) * 0.12)).add(p.p)); }
  }
  const homeShade = [];                                        // the shadows of the house and the plants on the ground: they
  {                                                            // may come nearer the edge than the things that throw them
    const L = sun.target.position.clone().sub(sun.position), src = homePts.slice(8);          // the leaves and trunks, and
    for (const x of [-3.97, 3.97]) for (const z of [-2.45, 3.0]) src.push(v(x, roofU(z) + 0.25, z));   // the roof's corners
    for (const q of src) { const hh = q.y - G(q.z); if (hh < 0.5) continue; const z = q.z + (L.z / -L.y) * hh; homeShade.push(v(q.x + (L.x / -L.y) * hh, G(z), z)); }
  }
  const EL0 = 1.02, EL1 = 0.33, AZ0 = 0.1, AZ1 = 0.6, tgt = v(), fq = v(), cf = v(), cr = v(), cu = v();
  const camK = (tau) => smooth(clamp((tau - 1.0) / (TB - 2.5)));   // high over the kit at first, down and round by the end
  const elAt = (tau) => lerp(EL0, EL1, camK(tau)), azAt = (tau) => lerp(AZ0, AZ1, camK(tau)) + 0.05 * clamp((tau - TB * 0.8) / (TB * 0.2));
  const swing = (tau) => 0.085 * (0.35 + 0.65 * camK(tau));          // how far the idle drift swings it round
  let MX = 0.9, MY = 0.86, OX = 0;                                     // the frame's usable half-width, half-height, centre
  function axes(el, az) { cf.set(-Math.cos(el) * Math.sin(az), -Math.sin(el), -Math.cos(el) * Math.cos(az)); cr.crossVectors(cf, Y).normalize(); cu.crossVectors(cr, cf); }
  function fit(F, pts, el, az) {
    axes(el, az); const th = Math.tan((camera.fov * Math.PI) / 360), tw = th * camera.aspect;
    F.c.set(0, 0, 1);
    for (let k = 0; k < 6; k++) {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of pts) { fq.copy(p).sub(F.c); const dz = F.d + fq.dot(cf), sx = fq.dot(cr) / (dz * tw), sy = fq.dot(cu) / (dz * th); x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
      F.c.addScaledVector(cr, ((x0 + x1) / 2 - OX) * F.d * tw).addScaledVector(cu, ((y0 + y1) / 2) * F.d * th);
      F.d *= Math.max((x1 - x0) / 2 / MX, (y1 - y0) / 2 / MY);
    }
  }
  function need(c, pts, el, az, loose = 0) {     // the nearest the camera may come, aimed at c, with every point in the frame
    axes(el, az); const th = Math.tan((camera.fov * Math.PI) / 360), tw = th * camera.aspect, R = Math.min(0.98, OX + MX + loose), Lf = MX - OX, T = Math.min(0.98, MY + loose); let d = 0;
    for (const p of pts) { fq.copy(p).sub(c); const a = fq.dot(cr); d = Math.max(d, Math.max(a / (R * tw), -a / (Lf * tw), Math.abs(fq.dot(cu)) / (T * th)) - fq.dot(cf)); }
    return d;
  }
  const needAll = (c, tau, el, az) => Math.max(need(c, kitAt(tau), el, az), need(c, homeShade, el, az, 0.2));
  const PDT = 0.5, NP = Math.round(TB / PDT) + 1, path = Array.from({ length: NP }, () => ({ c: v(), d: 0 })), kit = [];
  function kitAt(tau) {                           // what must be in view now: parts still to come, parts in the air, the house
    kit.length = 0;
    for (const p of parts) if (p.t0 + p.dur > tau) { for (const q of p.lc) kit.push(q); if (p.t0 < tau + PDT) kit.push(...p.peak); }
    for (const q of homePts) kit.push(q);
    return kit;
  }
  function plan() {
    const F = { c: v(), d: 30 }, dn = [];
    for (let k = 0; k < NP; k += 2) { const tau = k * PDT; fit(F, kitAt(tau), elAt(tau), azAt(tau)); path[k].c.copy(F.c); }   // aim: each second,
    for (let k = 1; k < NP; k += 2) path[k].c.lerpVectors(path[k - 1].c, path[Math.min(NP - 1, k + 1)].c, k + 1 < NP ? 0.5 : 0);   // halves between
    const cs = path.map((s) => s.c.clone());                          // aim: smoothed over about a second
    for (let k = 0; k < NP; k++) { const c = path[k].c.set(0, 0, 0); let ws = 0; for (let j = -4; j <= 4; j++) { const w = Math.exp((-j * j) / 8); c.addScaledVector(cs[clamp(k + j, 0, NP - 1)], w); ws += w; } c.multiplyScalar(1 / ws); }
    for (let k = 0; k < NP; k++) { const tau = k * PDT; dn.push(needAll(path[k].c, tau, elAt(tau), azAt(tau))); }   // distance
    const Wn = 3, dil = dn.map((_, k) => Math.max(...dn.slice(Math.max(0, k - Wn), k + Wn + 1)));   // widen, then average:
    for (let k = 0; k < NP; k++) { let s = 0; for (let j = -Wn; j <= Wn; j++) s += dil[clamp(k + j, 0, NP - 1)]; path[k].d = s / (2 * Wn + 1); }   // never nearer than needed
  }
  function pathAt(tau) {                          // a smooth (Catmull-Rom) reading of the path; sets tgt, returns the distance
    const x = clamp(tau / PDT, 0, NP - 1), i = Math.min(NP - 2, Math.floor(x)), f = x - i, P = (j) => path[clamp(j, 0, NP - 1)];
    const w0 = (((-f + 2) * f - 1) * f) / 2, w1 = ((3 * f - 5) * f * f + 2) / 2, w2 = (((-3 * f + 4) * f + 1) * f) / 2, w3 = ((f - 1) * f * f) / 2;
    tgt.set(0, 0, 0).addScaledVector(P(i - 1).c, w0).addScaledVector(P(i).c, w1).addScaledVector(P(i + 1).c, w2).addScaledVector(P(i + 2).c, w3);
    return P(i - 1).d * w0 + P(i).d * w1 + P(i + 1).d * w2 + P(i + 2).d * w3;
  }
  // The path is planned for the view without the idle drift; drifted or turned by hand, the camera steps back as far as
  // that angle needs right now (quickly), and comes back in (slowly) once it no longer does.
  let dNow = 0;
  function look(tau, drift, yaw, dt) {
    const el = elAt(tau) + 0.012 * Math.sin(drift * 0.23), az = azAt(tau) + swing(tau) * Math.sin(drift * 0.16) + yaw;
    const dp = pathAt(tau), want = needAll(tgt, tau, el, az);
    dNow = dt ? lerp(dNow, want, 1 - Math.exp(-dt * (want > dNow ? 12 : 2))) : want;
    const d = Math.max(dp, dNow);
    camera.position.set(tgt.x + d * Math.cos(el) * Math.sin(az), tgt.y + d * Math.sin(el), tgt.z + d * Math.cos(el) * Math.cos(az));
    camera.lookAt(tgt);
  }

  // ---------- size, clock, touch ----------
  let W = 0, H = 0, planned = "";
  const words = document.querySelector(".hero-text");
  function wordsEnd() {                           // the right-hand end of the headline, sub-line, words and buttons, on screen
    let r = -1e9; const rg = document.createRange();
    for (const el of words.querySelectorAll("h1, p")) { rg.selectNodeContents(el); for (const q of rg.getClientRects()) if (q.width) r = Math.max(r, q.right); }
    return r;
  }
  function size() {
    const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return false;
    W = w; H = h; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); uni.uPx.value = dpr * (w < 520 ? 0.7 : 1);
    // Words above the scene (phone, tablet): centred, clear of the soft top and bottom edges. Words beside it (desktop):
    // the scene keeps to the right of the last letter, and of the soft left edge, with room to spare.
    const cb = cv.getBoundingClientRect(), wb = words && words.getBoundingClientRect(), beside = wb && wb.bottom > cb.top + 0.25 * h;
    MY = 0.86;
    if (!beside) { MX = 0.88; OX = 0; }
    else { const L = Math.max(-0.72, ((wordsEnd() - cb.left + 32) / w) * 2 - 1), R = 0.86; MX = (R - L) / 2; OX = (R + L) / 2; }
    const key = [w, h, MX, MY, OX].map((q) => q.toFixed(3)).join();
    if (key !== planned) { const t0 = performance.now(); plan(); planned = key; stats.plan = +(performance.now() - t0).toFixed(1); stats.plans = (stats.plans || 0) + 1; }
    return true;
  }
  const stats = { n: 0, anim: 0, animMax: 0, all: 0, ring: new Float32Array(512), parts: parts.length, boxes: meshes.reduce((a, m) => a + m.count, 0) };   // ms: anim is this file's own work per frame, all includes the draw call
  let t = 0, tau = 0, drift = 0, yaw = 0, yawV = 0, heldUntil = 0, dragging = null, lastTouch = -1e9, shown = false;
  const scrub = { on: false, y0: 0, t0: 0, last: scrollY, at: 0, target: 0 };
  const tauOf = (t) => (t < TB ? t : t < TB + HOLD ? TB : t < TB + HOLD + RESET ? TB * (1 - smooth(smooth((t - TB - HOLD) / RESET))) : 0);
  function draw(dt) {
    const a = performance.now();
    pose(tau); look(tau, drift, yaw, dt);
    uni.uTime.value = drift;
    if (moved) { renderer.shadowMap.needsUpdate = true; moved = false; }
    const b = performance.now();
    renderer.render(scene, camera);
    stats.n++; stats.anim += b - a; stats.all += performance.now() - a; if (stats.n > 3 && b - a > stats.animMax) stats.animMax = b - a;
    stats.ring[stats.n % 512] = b - a;
    if (!shown) { shown = true; cv.classList.add("on"); }
  }
  let raf = 0, prev = 0, slow = 0;
  function tick(now) {
    raf = requestAnimationFrame(tick);
    const raw = (now - prev) / 1000, dt = Math.min(0.25, raw), sec = now / 1000; prev = now;
    drift += dt;
    if (dragging || sec < heldUntil) { /* touched: the build waits */ }
    else if (scrub.on) {
      tau += (scrub.target - tau) * (1 - Math.exp(-dt * 7));
      if (sec - scrub.at > 2.5) { scrub.on = false; t = Math.min(tau, TB); }
    } else { t = (t + dt) % LOOP; tau = tauOf(t); }
    if (!dragging) { yaw += yawV * dt; yawV *= Math.exp(-dt * 4.5); if (sec - lastTouch > 4) yaw *= Math.exp(-dt * 0.9); }
    draw(dt);
    // a slow device gets fewer pixels rather than a slow picture
    if (raw > 0.03 && raw < 0.2) { if (++slow > 45 && dpr > 1) { dpr = Math.max(1, dpr - 0.5); slow = 0; size(); } } else if (slow > 0) slow--;
  }
  const still1 = reduce || FREEZE !== null;                    // one frame, no loop
  let onScreen = true, lost = false;
  function run() {
    const go = !still1 && !lost && !document.hidden && onScreen;
    if (go && !raf) { prev = performance.now(); raf = requestAnimationFrame(tick); }
    if (!go && raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  fig.prepend(cv);
  size();
  new ResizeObserver(() => { if (size() && (still1 || !raf)) draw(); }).observe(cv);
  document.fonts?.ready.then(() => { if (size() && (still1 || !raf)) draw(); });     // the words' width changes when the font arrives
  if ("IntersectionObserver" in window) new IntersectionObserver((es) => { onScreen = es[es.length - 1].isIntersecting; run(); }).observe(fig);
  document.addEventListener("visibilitychange", run);
  cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); lost = true; run(); still(); });

  if (still1) { tau = FREEZE === null ? TB : FREEZE; drift = qs.has("d") ? parseFloat(qs.get("d")) : 0; yaw = qs.has("yaw") ? parseFloat(qs.get("yaw")) : 0; draw(); }
  else {
    // drag sideways to turn it. Up and down stays with the page (touch-action: pan-y), so a thumb can always scroll past.
    cv.addEventListener("pointerdown", (e) => { if (e.button) return; dragging = { x: e.clientX, id: e.pointerId, at: e.timeStamp }; yawV = 0; try { cv.setPointerCapture(e.pointerId); } catch {} cv.classList.add("held"); });
    cv.addEventListener("pointermove", (e) => {
      if (!dragging || e.pointerId !== dragging.id) return;
      const dx = e.clientX - dragging.x, dt = Math.max(8, e.timeStamp - dragging.at) / 1000; dragging.x = e.clientX; dragging.at = e.timeStamp;
      yaw -= dx * 0.006; yawV = clamp((-dx * 0.006) / dt, -2, 2); lastTouch = performance.now() / 1000;
    });
    const drop = (e) => {
      if (!dragging || e.pointerId !== dragging.id) return;
      if (e.timeStamp - dragging.at > 90) yawV = 0;             // it was held still before letting go: no coasting
      dragging = null; cv.classList.remove("held"); heldUntil = performance.now() / 1000 + 1.6; lastTouch = performance.now() / 1000;
    };
    cv.addEventListener("pointerup", drop); cv.addEventListener("pointercancel", drop);
    // scrolling the page runs the build forward (and back up, backward) until the hero has gone by
    addEventListener("scroll", () => {
      const y = scrollY, sec = performance.now() / 1000;
      if (!scrub.on) { scrub.on = true; scrub.y0 = scrub.last; scrub.t0 = Math.min(tau, TB); }
      scrub.last = y; scrub.at = sec;
      const r = fig.getBoundingClientRect(), range = Math.max(120, r.top + y - 68 + r.height * 0.45);
      scrub.target = y >= scrub.y0 ? scrub.t0 + (TB - scrub.t0) * clamp((y - scrub.y0) / Math.max(60, range - scrub.y0)) : scrub.t0 * clamp(y / Math.max(1, scrub.y0));
    }, { passive: true });
    run();
  }
  // the count is the house's own parts (the planting is counted apart), from the same list that moves the model
  const houseParts = parts.filter((p) => !p.stand).length; stats.houseParts = houseParts;
  if (cap) cap.textContent = reduce
    ? `A house of ${houseParts} parts, modelled in code and drawn in your browser. Not a photograph.`
    : `A house of ${houseParts} parts, modelled in code and assembled in your browser. Not a photograph.`;
  if (cap) cap.style.visibility = "";
  // for checking and for making the still picture: hold a moment, jump the clock, look from anywhere, save a frame
  window.__assemblHero = {
    stats, parts, TB, LOOP, camera, get tau() { return tau; }, get yaw() { return yaw; }, get running() { return raf > 0; }, get dpr() { return dpr; },
    seek: (x) => { tau = x; draw(); },
    at: (x) => { t = x; tau = tauOf(t); draw(); },
    view: (el, az, r, tx, ty, tz) => { pose(tau); const d = r / Math.tan((camera.fov * Math.PI) / 360); camera.position.set(tx + d * Math.cos(el) * Math.sin(az), ty + d * Math.sin(el), tz + d * Math.cos(el) * Math.cos(az)); camera.lookAt(tx, ty, tz); renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); },
    shot: (w, h) => { const d0 = dpr; dpr = 1; renderer.setPixelRatio(1); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); uni.uPx.value = 2; MX = MY = 0.9; OX = 0; plan(); tau = TB; drift = 0; yaw = 0; draw(); const u = cv.toDataURL("image/png"); dpr = d0; planned = ""; size(); draw(); return u; },
  };
}
