// Geometry of the public assembl. timber house. Original source https://assembl.co.nz/hero.js
export function houseParts(THREE) {
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

  return {parts,kinds};
}
