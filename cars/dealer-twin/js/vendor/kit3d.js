// Copied read-only from the assembl lab (wt_kimi/cars/kit3d.js): the stylised studio car kit used for the lab's stock renders.
// A family of stylised studio cars (hatch, sedan, SUV, ute, van), sculpted the way a design studio makes a maquette: one smooth
// shell lofted from side-profile splines through rounded cross-sections, a glasshouse that leans in (tumblehome), flush glazing
// cut from the same surface, rolled wheel arches with dark liners, slim light bands, a subtle shut-line, multi-spoke rims on
// profiled tyres, and a soft contact shadow for each body. No badges and no brand cues: a car of this size and shape, no more.
//
//   const kit = buildCarKit(THREE)
//   kit.TYPES[kind]       the design numbers; the older fields (L, W, roof, belt, bot, wr, wf, wb, glass, top, tail, mirrorX) are kept
//   kit[kind]             built the first time it is asked for:
//     .body .glass .tyres .rims .heads .tails .trim   one BufferGeometry per material (position + normal; the body also carries colour)
//     .mirrors                                          the door mirrors, in body colour: drawn without a shadow, which would float
//     .L .W .H .T .map(x, y, z)                         size, the type's numbers, profile point → car space (the identity: metres)
//     .topAt(x, z) .sideAt(x, y, side) .windscreen(t, z) .rearGlass(t, z)   a point on the shell and its outward normal: { p, n }
//     .windscreenHalf(t)                                how far the windscreen glass reaches either side of the centre at t
//     .shadowTex                                        a contact shadow for an (L + 0.7) × (W + 0.7) plane under the car
//   kit.shadowTex         the hatch's contact shadow (older callers)
//
// Axes: the car faces +x, y is up, it stands on y = 0, and +z is the driver's side of a right-hand-drive car.
export function buildCarKit(THREE) {
  // one geometry from many (non-indexed, position + normal; a colour attribute too when any part has one, white elsewhere)
  const merge = (geos) => { let n = 0; const ps = [], ns = [], cs = []; geos.forEach((g) => { g = g.index ? g.toNonIndexed() : g; ps.push(g.attributes.position.array); ns.push(g.attributes.normal.array); cs.push(g.attributes.color ? g.attributes.color.array : null); n += g.attributes.position.count; });
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), withC = cs.some(Boolean), C = withC ? new Float32Array(n * 3).fill(1) : null; let o = 0;
    ps.forEach((a, i) => { P.set(a, o); N.set(ns[i], o); if (C && cs[i]) C.set(cs[i], o); o += a.length; });
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3)); if (C) g.setAttribute("color", new THREE.BufferAttribute(C, 3)); return g; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const V2 = (x, y) => new THREE.Vector2(x, y), V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---- the five bodies, in metres --------------------------------------------------------------------------------------------
  // top / bot: the side profile's upper and lower edges, (x, y) points through monotone splines. cowl, roofF, roofR, rearBase: where
  // the windscreen and rear glass start and stop. dlo: the side glass's front and rear x; pillars: [x, half width] cut into it.
  // doors: x of the vertical door shut-lines. end: [length, squareness] of the plan-view rounding into the nose and tail. ledge:
  // the shoulder step at the window line; tumble: how far the glasshouse leans in per metre of height. head / tail: where the
  // light bands begin on the flanks. bonnetF: the bonnet's front shut-line. clad: dark lower body; rails: roof rails.
  const SPEC = {
    hatch: { L: 4.00, W: 1.75, H: 1.50, wr: 0.31, tw: 0.20, rim: 0.64, wf: 1.27, wb: -1.28, sill: 0.29, beltF: 0.93, beltR: 1.01,
      top: [[2.00, 0.61], [1.985, 0.70], [1.93, 0.77], [1.70, 0.825], [1.30, 0.875], [0.87, 0.925], [0.12, 1.455], [-0.30, 1.495], [-1.30, 1.455], [-1.46, 1.42], [-1.80, 1.08], [-1.93, 1.01], [-1.99, 0.88], [-2.00, 0.76]],
      bot: [[2.00, 0.42], [1.96, 0.31], [1.84, 0.27], [1.0, 0.29], [-1.0, 0.29], [-1.84, 0.30], [-1.96, 0.36], [-2.00, 0.47]],
      cowl: 0.87, roofF: 0.12, roofR: -1.44, rearBase: -1.79, dlo: [0.80, -1.72], pillars: [[-0.14, 0.05], [-1.0, 0.075]], doors: [0.84, -0.14, -0.86],
      end: { f: [0.33, 3.0], r: [0.26, 3.6] }, ledge: 0.07, tumble: 0.21, rr: 0.075, rs: 0.085, rb: 0.065, tuck: 0.028, crown: 0.028, bonnetF: 1.68, head: 1.60, tail: -1.74 },
    sedan: { L: 4.65, W: 1.80, H: 1.45, wr: 0.32, tw: 0.21, rim: 0.66, wf: 1.40, wb: -1.38, sill: 0.29, beltF: 0.94, beltR: 1.0,
      top: [[2.325, 0.60], [2.31, 0.70], [2.25, 0.765], [2.0, 0.81], [1.5, 0.865], [0.98, 0.93], [0.18, 1.41], [-0.35, 1.45], [-0.88, 1.425], [-1.04, 1.38], [-1.62, 1.03], [-1.80, 1.005], [-2.20, 0.985], [-2.31, 0.93], [-2.325, 0.80]],
      bot: [[2.325, 0.42], [2.28, 0.30], [2.15, 0.26], [1.0, 0.29], [-1.0, 0.29], [-2.15, 0.30], [-2.29, 0.36], [-2.325, 0.48]],
      cowl: 0.98, roofF: 0.18, roofR: -0.98, rearBase: -1.60, dlo: [0.92, -1.06], pillars: [[-0.18, 0.05]], doors: [0.95, -0.18, -0.96],
      end: { f: [0.34, 3.0], r: [0.30, 3.4] }, ledge: 0.07, tumble: 0.23, rr: 0.075, rs: 0.085, rb: 0.065, tuck: 0.03, crown: 0.028, bonnetF: 2.02, head: 1.95, tail: -2.07, boot: [-1.66, -2.24] },
    suv: { L: 4.60, W: 1.85, H: 1.70, wr: 0.36, tw: 0.23, rim: 0.64, wf: 1.36, wb: -1.36, sill: 0.42, beltF: 1.07, beltR: 1.13, clad: true, rails: true,
      top: [[2.30, 0.71], [2.285, 0.83], [2.22, 0.92], [1.95, 0.98], [1.50, 1.025], [1.02, 1.07], [0.28, 1.655], [-0.40, 1.70], [-1.80, 1.68], [-1.98, 1.63], [-2.17, 1.25], [-2.25, 1.16], [-2.295, 1.0], [-2.30, 0.88]],
      bot: [[2.30, 0.50], [2.25, 0.36], [2.12, 0.33], [1.0, 0.42], [-1.0, 0.42], [-2.10, 0.38], [-2.25, 0.42], [-2.30, 0.52]],
      cowl: 1.02, roofF: 0.28, roofR: -1.95, rearBase: -2.15, dlo: [0.95, -2.08], pillars: [[-0.10, 0.055], [-1.02, 0.05]], doors: [0.97, -0.10, -0.90],
      end: { f: [0.34, 3.6], r: [0.28, 3.8] }, ledge: 0.08, tumble: 0.17, rr: 0.08, rs: 0.09, rb: 0.07, tuck: 0.03, crown: 0.03, bonnetF: 1.98, head: 1.86, tail: -2.10 },
    ute: { L: 5.30, W: 1.87, H: 1.80, wr: 0.38, tw: 0.25, rim: 0.58, wf: 1.62, wb: -1.50, sill: 0.47, beltF: 1.10, beltR: 1.14, clad: true,
      top: [[2.65, 0.80], [2.635, 0.93], [2.57, 1.01], [2.25, 1.05], [1.70, 1.08], [1.12, 1.105], [0.42, 1.77], [-0.30, 1.80], [-0.74, 1.79], [-0.80, 1.74], [-0.835, 1.17], [-0.86, 1.14], [-2.55, 1.14], [-2.62, 1.10], [-2.65, 0.98]],
      bot: [[2.65, 0.56], [2.60, 0.42], [2.45, 0.40], [1.2, 0.47], [-1.0, 0.47], [-2.40, 0.46], [-2.60, 0.50], [-2.65, 0.60]],
      cowl: 1.12, roofF: 0.42, roofR: -0.78, rearBase: -0.83, dlo: [1.04, -0.72], pillars: [[-0.16, 0.055]], doors: [1.08, -0.16, -0.78],
      end: { f: [0.32, 3.8], r: [0.18, 5.0] }, ledge: 0.06, tumble: 0.16, rr: 0.08, rs: 0.09, rb: 0.07, tuck: 0.03, crown: 0.03, bonnetF: 2.30, head: 2.22, tail: -2.52, tray: [-0.89, -2.56] },
    van: { L: 5.00, W: 1.90, H: 2.00, wr: 0.35, tw: 0.21, rim: 0.60, wf: 1.78, wb: -1.48, sill: 0.38, beltF: 1.14, beltR: 1.16,
      top: [[2.50, 0.76], [2.485, 0.88], [2.42, 0.97], [2.15, 1.05], [1.72, 1.10], [1.05, 1.925], [0.60, 1.99], [-2.20, 2.00], [-2.38, 1.97], [-2.47, 1.86], [-2.50, 1.62]],
      bot: [[2.50, 0.48], [2.45, 0.34], [2.30, 0.32], [1.0, 0.38], [-1.0, 0.38], [-2.30, 0.36], [-2.45, 0.40], [-2.50, 0.50]],
      cowl: 1.72, roofF: 1.05, roofR: -2.30, rearBase: -2.30, dlo: [1.30, 0.70], pillars: [], doors: [1.34, 0.66, -0.72],
      end: { f: [0.25, 3.0], r: [0.20, 5.0] }, ledge: 0.04, tumble: 0.07, rr: 0.09, rs: 0.08, rb: 0.07, tuck: 0.025, crown: 0.03, bonnetF: 2.22, head: 2.16, tail: -2.40 },
  };

  // monotone cubic through the profile points (Fritsch–Carlson): no overshoot at the roof, the cab step or the tail
  function mono(pts) {
    const P = pts.slice().sort((a, b) => a[0] - b[0]), n = P.length, xs = P.map((p) => p[0]), ys = P.map((p) => p[1]), d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
    return (x) => { if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1]; let i = 0; while (x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]; };
  }

  // the half cross-section, bottom centre → top centre, as named segments with the same point counts at every station, so they
  // loft: underside, lower corner, the flank in five bands (rocker, grille band, main, light band, top strip), the shoulder, the
  // ledge at the window line, the glasshouse side (margin, glass, margin), the roof corner, and the top (margin, seam, the rest)
  const SEG = [["bot", 3], ["rb", 4], ["c0", 1], ["c1", 2], ["c2", 5], ["c3", 1], ["c4", 1], ["rs", 5], ["ledge", 1], ["f0", 1], ["f1", 4], ["f2", 1], ["rr", 4], ["h1", 1], ["h0", 1], ["h2", 6]];
  const SEGOF = []; SEG.forEach(([id, n]) => { for (let i = 0; i < n; i++) SEGOF.push(id); });
  const NH = SEGOF.length; // intervals in a half section (NH + 1 points)

  function design(kind) {
    const S = SPEC[kind], xf = S.L / 2, xr = -S.L / 2, top = mono(S.top), bot0 = mono(S.bot), hw0 = S.W / 2;
    const R = S.wr + 0.055, wheels = [S.wf, S.wb];
    const belt = (x) => lerp(S.beltR, S.beltF, clamp((x - xr) / (S.cowl - xr), 0, 1));
    const arch = (x) => { let y = -1; for (const wx of wheels) { const d = Math.abs(x - wx); if (d < R) y = Math.max(y, S.wr + Math.sqrt(R * R - d * d)); } return y; };
    const bottom = (x) => Math.max(bot0(x), arch(x));
    // plan view: full width between the end zones, superelliptic rounding into the nose and tail, a little flare over each wheel
    const [Df, pf] = S.end.f, [Dr, pr] = S.end.r;
    const kOf = (x) => { if (x > xf - Df) { const u = clamp((x - (xf - Df)) / Df, 0, 1); return Math.pow(Math.max(0, 1 - Math.pow(u, pf)), 1 / pf); }
      if (x < xr + Dr) { const u = clamp((xr + Dr - x) / Dr, 0, 1); return Math.pow(Math.max(0, 1 - Math.pow(u, pr)), 1 / pr); } return 1; };
    const flare = (x) => { let f = 0; for (const wx of wheels) f = Math.max(f, 0.016 * Math.pow(Math.cos(clamp((x - wx) / (R * 1.9), -1, 1) * Math.PI / 2), 2)); return f; };

    // one half section at x: [[z, y] × (NH + 1)], with z already narrowed by the plan rounding
    function half(x) {
      const k = kOf(x), yt = top(x), yb = Math.min(bottom(x), yt - 0.06), hw = hw0 + flare(x), crown = S.crown * smooth(0.0, 0.5, yt - Math.min(bot0(x), yt - 0.06));
      const ysh = Math.min(belt(x), yt - crown - 0.004), gh = Math.max(0, yt - crown - ysh), ybRef = Math.min(bot0(x), yt - 0.06);
      const span = Math.max(0.02, ysh - yb), spanRef = Math.max(0.02, ysh - ybRef);
      // the flank is one surface, drawn from the body's own bottom (not the arches); an arch only trims it from below, so the
      // shoulder and the light band stay one clean line over the wheels
      const rb0 = Math.min(S.rb, spanRef * 0.28); let rs = Math.min(S.rs, spanRef * 0.3), rb = rb0;
      if (span - rb - rs < 0.014) { const f = Math.max(0.05, (span - 0.014) / (rb + rs)); rb *= f; rs *= f; }
      const tuck = Math.min(S.tuck, rb0 * 0.6), hb = hw - tuck;
      const ledge = S.ledge * smooth(0.0, 0.16, gh), gw0 = hw - rs - ledge, gw1 = gw0 - S.tumble * gh, rr = Math.min(S.rr, gh * 0.45);
      const pts = [];
      const line = (a, b, n) => { for (let i = 0; i < n; i++) pts.push([lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)]); };
      const arc = (cz, cy, r, a0, a1, n) => { for (let i = 0; i < n; i++) { const a = lerp(a0, a1, i / n); pts.push([cz + r * Math.cos(a), cy + r * Math.sin(a)]); } };
      const refC0 = ybRef + rb0, cTop = ysh - rs, refAvail = Math.max(0.001, cTop - refC0);
      const bulge = 0.012 * smooth(0.1, 0.3, spanRef - S.rb - S.rs);
      const sideZ = (y) => { const t = clamp((y - refC0) / refAvail, 0, 1); return lerp(hb, hw, Math.sqrt(t)) + bulge * Math.sin(Math.PI * t); };
      const c0y = Math.min(yb + rb, cTop - 0.004), zc0 = sideZ(c0y);
      line([0, yb], [zc0 - rb, yb], 3); arc(zc0 - rb, c0y - rb, rb, -Math.PI / 2, 0, 4);
      // the flank's rows sit at fixed heights (rocker, grille band, main side, light band, top strip); over an arch the lower rows
      // gather on the arch's lip
      let L0 = 0.035, L1 = 0.085, L3 = 0.045, L4 = 0.012; const fixed = L0 + L1 + L3 + L4, sc = fixed > refAvail * 0.8 ? (refAvail * 0.8) / fixed : 1; L0 *= sc; L1 *= sc; L3 *= sc; L4 *= sc;
      const ref = [refC0, refC0 + L0, refC0 + L0 + L1, cTop - L4 - L3, cTop - L4, cTop], cn = [1, 2, 5, 1, 1];
      let n = 0;
      for (let s = 0; s < 5; s++) for (let i = 0; i < cn[s]; i++) { const y = Math.min(cTop - 0.0005 * (10 - n), Math.max(lerp(ref[s], ref[s + 1], i / cn[s]), c0y + 0.0005 * n)); n++; pts.push([sideZ(y), y]); }
      // the shoulder rolls over onto the ledge at the window line
      arc(hw - rs, ysh - rs, rs, 0, Math.PI / 2, 5); line([hw - rs, ysh], [gw0, ysh], 1);
      // the glasshouse side: a margin above the belt, the glass, a margin under the roof edge
      const fTop = [gw1, ysh + gh - rr], fl = Math.hypot(gw0 - gw1, gh - rr), m0 = Math.min(0.022, fl * 0.2), m2 = Math.min(0.03, fl * 0.2);
      const fAt = (d) => { const t = fl > 1e-6 ? d / fl : 0; return [lerp(gw0, fTop[0], t), lerp(ysh, fTop[1], t)]; };
      pts.push(fAt(0)); for (let i = 0; i < 4; i++) pts.push(fAt(m0 + (fl - m0 - m2) * i / 4)); pts.push(fAt(fl - m2));
      // the roof corner: from the leaning side round to level
      const a0 = Math.atan2(S.tumble, 1), cz = gw1 - rr * Math.cos(a0), cy = fTop[1] - rr * Math.sin(a0);
      arc(cz, cy, rr, a0, Math.PI / 2, 4);
      // the top (bonnet, windscreen, roof, rear glass, boot or tray): an edge margin, a seam strip, the crowned rest
      const z0 = Math.max(0, cz), yEdge = cy + rr, crownY = (z) => yEdge + crown * (1 - Math.pow(z / Math.max(z0, 1e-6), 2));
      const za = Math.max(0, z0 - 0.03), zb = Math.max(0, z0 - 0.036);
      pts.push([z0, crownY(z0)], [za, crownY(za)]);
      for (let i = 0; i <= 6; i++) { const z = zb * (1 - i / 6); pts.push([z, crownY(z)]); }
      for (const p of pts) p[0] *= k; // the plan rounding narrows the whole section
      return { pts, k, gh };
    }

    // stations along x: an even spacing, dense round the arches, into the nose and tail and down steep steps, plus every boundary
    const X = new Set(), add = (x) => X.add(+x.toFixed(5));
    for (let x = xr; x <= xf + 1e-9; x += 0.05) add(x);
    for (const wx of wheels) for (let i = 0; i <= 24; i++) add(wx + R * Math.cos(Math.PI * i / 24));
    for (let i = 0; i <= 18; i++) { const th = (Math.PI / 2) * i / 18; add(xf - Df + Df * Math.pow(Math.sin(th), 2 / pf)); add(xr + Dr - Dr * Math.pow(Math.sin(th), 2 / pr)); }
    for (let i = 0; i < S.top.length - 1; i++) { const [x0, y0] = S.top[i], [x1, y1] = S.top[i + 1]; if (Math.abs((y1 - y0) / (x1 - x0)) > 2.5) for (let q = 1; q < 8; q++) add(lerp(x0, x1, q / 8)); }
    const SH = 0.003, cuts = [S.cowl - 0.035, S.roofF + 0.03, S.roofR - 0.03, S.rearBase + 0.035, S.dlo[0], S.dlo[1], S.head, S.tail];
    S.pillars.forEach(([px, w]) => cuts.push(px - w, px + w));
    const seams = [...S.doors, S.bonnetF, ...(S.tray || []), ...(S.boot ? [S.boot[1]] : [])];
    seams.forEach((x) => cuts.push(x - SH, x + SH)); cuts.forEach(add);
    const xs = [...X].filter((x) => x >= xr - 1e-6 && x <= xf + 1e-6).sort((a, b) => a - b).filter((x, i, a) => i === 0 || x - a[i - 1] > 4e-4);
    xs[0] = xr; xs[xs.length - 1] = xf;
    return { S, xf, xr, top, belt, half, xs, R, wheels, hw0 };
  }

  // ---- the shell: loft the sections, then give each face its material ------------------------------------------------------
  function shell(D) {
    const { S, xs } = D, M = 2 * NH, NS = xs.length, P = new Float32Array(NS * M * 3), info = [];
    for (let i = 0; i < NS; i++) {
      const h = D.half(xs[i]); info.push(h);
      for (let j = 0; j < M; j++) { const r = j <= NH ? h.pts[j] : h.pts[2 * NH - j], o = (i * M + j) * 3; P[o] = xs[i]; P[o + 1] = r[1]; P[o + 2] = j <= NH ? r[0] : -r[0]; }
    }
    const segOf = (j) => SEGOF[j < NH ? j : 2 * NH - 1 - j], vid = (i, j) => i * M + (j % M);
    // vertex normals from the grid's own directions (central differences along the length and round the section), so they don't
    // depend on how the stations happen to be spaced; glass, lights and paint share them, so the surface reads as one piece
    const Nn = new Float32Array(P.length), a = V3(), b = V3(), tx = V3(), ts = V3(), nn = V3(), tris = [];
    for (let i = 0; i < NS - 1; i++) for (let j = 0; j < M; j++) { const A = vid(i, j), B = vid(i + 1, j), C = vid(i + 1, j + 1), Dd = vid(i, j + 1); tris.push([A, B, C, i, j], [A, C, Dd, i, j]); }
    const at = (i, j, v) => v.fromArray(P, vid(i, (j + M) % M) * 3);
    for (let i = 0; i < NS; i++) for (let j = 0; j < M; j++) {
      const v = vid(i, j); at(i, j, a);
      let jm = j - 1, jp = j + 1, g = 0; while (g++ < M && at(i, jm, b).distanceToSquared(a) < 1e-12) jm--; g = 0; while (g++ < M && at(i, jp, b).distanceToSquared(a) < 1e-12) jp++;
      ts.subVectors(at(i, jp, b), at(i, jm, nn));
      const im = Math.max(0, i - 1), ip = Math.min(NS - 1, i + 1); tx.subVectors(at(ip, j, b), at(im, j, nn));
      nn.crossVectors(ts, tx); if (nn.lengthSq() < 1e-16) nn.set(a.x > 0 ? 1 : -1, 0, 0);
      nn.normalize(); if (Math.abs(a.z) < 1e-7) { nn.z = 0; nn.normalize(); } // on the centreline: left and right agree
      Nn[v * 3] = nn.x; Nn[v * 3 + 1] = nn.y; Nn[v * 3 + 2] = nn.z;
    }
    const probe = vid(Math.floor(NS / 2), SEGOF.indexOf("c2") + 2), flip = Nn[probe * 3 + 2] < 0 ? -1 : 1; // the right flank must face +z
    if (flip < 0) for (let q = 0; q < Nn.length; q++) Nn[q] = -Nn[q];
    // and the faces wound to match
    let vote = 0; const fn = V3(), na = V3(); // a majority vote over the faces, so a few degenerate ones at the tips can't decide it
    for (const [A, B, C] of tris) { a.fromArray(P, A * 3); b.fromArray(P, B * 3); nn.fromArray(P, C * 3); fn.crossVectors(tx.subVectors(b, a), ts.subVectors(nn, a)); if (fn.lengthSq() > 1e-12) vote += Math.sign(fn.dot(na.fromArray(Nn, A * 3))); }
    const wind = vote >= 0 ? 1 : -1;
    const near = (x0, x1, list) => list.some((s) => x0 >= s - 0.0031 && x1 <= s + 0.0031);
    const FLANK = new Set(["c0", "c1", "c2", "c3", "c4", "rs", "ledge"]);
    const partOf = (i, j) => {
      const seg = segOf(j), x0 = xs[i], x1 = xs[i + 1], xm = (x0 + x1) / 2, k = (info[i].k + info[i + 1].k) / 2, gh = Math.min(info[i].gh, info[i + 1].gh);
      if (seg === "bot") return "trim";
      if (S.clad && (seg === "rb" || seg === "c0")) return "trim";
      if (seg === "c1" && k < 0.55 && (xm > S.head || xm < S.tail)) return "trim"; // grille and rear diffuser on the end faces
      if (seg === "c3" && xm > S.head && k > 0.36) return "heads";
      if (seg === "c3" && xm < S.tail) return "tails";
      if (seg === "f1" && xm < S.dlo[0] && xm > S.dlo[1] && gh > 0.12) { for (const [px, w] of S.pillars) if (xm > px - w && xm < px + w) return "trim"; return "glass"; }
      if (seg === "h2" && xm < S.cowl - 0.035 && xm > S.roofF + 0.03) return "glass"; // windscreen
      if (seg === "h2" && S.rearBase < S.roofR && xm < S.roofR - 0.03 && xm > S.rearBase + 0.035) return "glass"; // rear glass
      if (FLANK.has(seg) && near(x0, x1, S.doors)) return "trim"; // door shut-lines
      if (seg === "h0" && ((xm < S.cowl - 0.035 && xm > S.bonnetF) || (S.tray && xm < S.tray[0] && xm > S.tray[1]) || (S.boot && xm < S.boot[0] && xm > S.boot[1]))) return "trim"; // bonnet, tray, boot edges
      if (seg === "h2" && near(x0, x1, [S.bonnetF, ...(S.tray || []), ...(S.boot ? [S.boot[1]] : [])])) return "trim"; // and their cross lines
      return "body";
    };
    const out = { body: [], glass: [], heads: [], tails: [], trim: [] };
    for (const [A, B, C, i, j] of tris) out[partOf(i, j)].push(wind > 0 ? [A, B, C] : [A, C, B]);
    // a baked studio falloff, as vertex colours: the paint deepens low on the flank and round the arch lips (materials that don't
    // use vertex colours ignore it)
    const AO = new Float32Array(NS * M);
    for (let i = 0; i < NS; i++) for (let j = 0; j < M; j++) { const v = vid(i, j), y = P[v * 3 + 1], ny = Nn[v * 3 + 1], low = smooth(S.sill - 0.04, S.sill + 0.34, y);
      AO[v] = (0.74 + 0.26 * low) * (ny < -0.2 ? 0.8 : 1); }
    const geo = (list) => { const pos = new Float32Array(list.length * 9), nor = new Float32Array(list.length * 9), col = new Float32Array(list.length * 9); let o = 0;
      for (const t of list) for (const v of t) { pos.set(P.subarray(v * 3, v * 3 + 3), o); nor.set(Nn.subarray(v * 3, v * 3 + 3), o); col[o] = col[o + 1] = col[o + 2] = AO[v]; o += 3; }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); return g; };
    return Object.fromEntries(Object.entries(out).map(([k, l]) => [k, geo(l)]));
  }

  // ---- points on the shell, with their normals, for decals and pins -----------------------------------------------------------
  function probes(D) {
    const topFrom = SEGOF.indexOf("rr"), sideFrom = SEGOF.indexOf("c0"), sideTo = SEGOF.indexOf("ledge");
    const topY = (x, z) => { const p = D.half(x).pts, az = Math.abs(z); // the top, walked inwards (z falls towards the centre)
      for (let j = topFrom; j < NH; j++) { const [z0, y0] = p[j], [z1, y1] = p[j + 1]; if (az <= z0 + 1e-9 && az >= z1 - 1e-9) return lerp(y0, y1, z0 - z1 > 1e-9 ? (z0 - az) / (z0 - z1) : 0); }
      return p[NH][1]; };
    const sideZ = (x, y) => { const p = D.half(x).pts; // the flank, walked upwards
      for (let j = sideFrom; j < sideTo; j++) { const [z0, y0] = p[j], [z1, y1] = p[j + 1]; if (y >= y0 - 1e-9 && y <= y1 + 1e-9) return lerp(z0, z1, y1 - y0 > 1e-9 ? (y - y0) / (y1 - y0) : 0); }
      return p[sideTo][0]; };
    const e = 0.01;
    const topAt = (x, z) => { const p = V3(x, topY(x, z), z), dx = V3(2 * e, topY(x + e, z) - topY(x - e, z), 0), dz = V3(0, topY(x, z + e) - topY(x, z - e), 2 * e);
      const n = V3().crossVectors(dz, dx).normalize(); if (n.y < 0) n.negate(); return { p, n }; };
    const sideAt = (x, y, side = 1) => { const p = V3(x, y, sideZ(x, y) * side), dx = V3(2 * e, 0, side * (sideZ(x + e, y) - sideZ(x - e, y))), dy = V3(0, 2 * e, side * (sideZ(x, y + e) - sideZ(x, y - e)));
      const n = V3().crossVectors(dx, dy).normalize(); if (n.z * side < 0) n.negate(); return { p, n }; };
    const S = D.S;
    const wsX = (t) => lerp(S.cowl - 0.035, S.roofF + 0.03, t), glassHalf = (x) => D.half(x).pts[SEGOF.indexOf("h2")][0]; // where the glass starts across the top
    return { topAt, sideAt, windscreen: (t, z) => topAt(wsX(t), z), windscreenHalf: (t) => glassHalf(wsX(t)), rearGlass: (t, z) => topAt(lerp(S.rearBase + 0.035, S.roofR - 0.03, t), z) };
  }

  // ---- wheels: profiled tyres, ten-spoke rims dished towards the hub, a dark barrel behind the spokes -------------------------
  function mirrorZ(g) { g = g.index ? g.toNonIndexed() : g.clone(); const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { p.setZ(i, -p.getZ(i)); n.setZ(i, -n.getZ(i)); }
    for (let i = 0; i < p.count; i += 3) for (const att of [p, n]) { const t = [att.getX(i + 1), att.getY(i + 1), att.getZ(i + 1)]; att.setXYZ(i + 1, att.getX(i + 2), att.getY(i + 2), att.getZ(i + 2)); att.setXYZ(i + 2, t[0], t[1], t[2]); }
    return g; }
  const lathe = (prof, n) => { const g = new THREE.LatheGeometry(prof.map(([r, a]) => V2(r, a)), n); g.rotateX(Math.PI / 2); return g; }; // lathe axis y → car z
  function wheel(S) { // one wheel at the origin, axle along z, the outer face towards +z
    const R = S.wr, w = S.tw, rr = R * S.rim, sh = 0.045, prof = [];
    prof.push([rr * 0.99, -w / 2 + 0.016], [rr * 1.04, -w / 2 + 0.002], [lerp(rr, R, 0.55), -w / 2 - 0.006]);
    for (let i = 0; i <= 5; i++) { const t = (Math.PI / 2) * i / 5; prof.push([R - sh + sh * Math.sin(t), -w / 2 + sh - sh * Math.cos(t)]); }
    for (let i = 1; i < 4; i++) prof.push([R + 0.003 * Math.sin(Math.PI * i / 4), lerp(-w / 2 + sh, w / 2 - sh, i / 4)]);
    for (let i = 0; i <= 5; i++) { const t = (Math.PI / 2) * (1 - i / 5); prof.push([R - sh + sh * Math.sin(t), w / 2 - sh + sh * Math.cos(t)]); }
    prof.push([lerp(rr, R, 0.55), w / 2 + 0.006], [rr * 1.04, w / 2 - 0.002], [rr * 0.99, w / 2 - 0.016]);
    const tyre = lathe(prof, 56); tyre.computeVertexNormals();
    const face = w / 2 - 0.004, rims = [], dark = [];
    const lip = new THREE.RingGeometry(rr * 0.9, rr * 1.03, 56, 1); lip.translate(0, 0, face); rims.push(lip); // the rim's bright lip
    const lipIn = new THREE.CylinderGeometry(rr * 0.9, rr * 0.9, 0.03, 56, 1, true); lipIn.rotateX(Math.PI / 2); lipIn.translate(0, 0, face - 0.015);
    { const idx = lipIn.index.array; for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } lipIn.computeVertexNormals(); } rims.push(lipIn);
    const barrel = new THREE.CircleGeometry(rr * 0.92, 40); barrel.translate(0, 0, face - 0.06); dark.push(barrel);
    const drum = new THREE.CylinderGeometry(rr * 0.985, rr * 0.985, w - 0.02, 40, 1, true); drum.rotateX(Math.PI / 2);
    { const idx = drum.index.array; for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } drum.computeVertexNormals(); } dark.push(drum);
    const disc = new THREE.CircleGeometry(rr * 0.62, 36); disc.translate(0, 0, face - 0.05); rims.push(disc); // the brake disc, seen through the spokes
    const hubR = rr * 0.2, to = rr * 0.92;
    for (let s = 0; s < 10; s++) { // five split spokes: each pair leaves the hub together and opens towards the rim
      const base = (Math.floor(s / 2) / 5) * Math.PI * 2, side = s % 2 ? 1 : -1, aIn = base + side * 0.10, aOut = base + side * 0.19;
      const wIn = 0.03, wOut = 0.024, dIn = 0.03, dOut = 0.018, zIn = face - 0.03, zOut = face - 0.004;
      const at = (r, a, t, z) => { const c = Math.cos(a), sn = Math.sin(a); return V3(r * c - t * sn, r * sn + t * c, z); };
      const tp = [at(hubR, aIn, -wIn / 2, zIn), at(hubR, aIn, wIn / 2, zIn), at(to, aOut, -wOut / 2, zOut), at(to, aOut, wOut / 2, zOut)];
      const bk = tp.map((v, i) => V3(v.x, v.y, v.z - (i < 2 ? dIn : dOut)));
      const q = (A, B, C, Dd) => [A, B, C, A, C, Dd];
      const F = [...q(tp[0], tp[2], tp[3], tp[1]), ...q(bk[0], bk[1], bk[3], bk[2]), ...q(tp[0], bk[0], bk[2], tp[2]), ...q(tp[1], tp[3], bk[3], bk[1]), ...q(tp[2], bk[2], bk[3], tp[3])];
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(F.flatMap((p) => [p.x, p.y, p.z])), 3)); g.computeVertexNormals(); rims.push(g);
    }
    const cap = new THREE.CylinderGeometry(hubR * 1.0, hubR * 1.12, 0.026, 28); cap.rotateX(Math.PI / 2); cap.translate(0, 0, face - 0.024); rims.push(cap);
    return { tyre, rim: merge(rims), dark: merge(dark) };
  }

  // ---- small parts: wheels, arch liners and floor, mirrors, roof rails ---------------------------------------------------------
  function extras(D, P) {
    const { S } = D, trim = [], body = [], tyres = [], rims = [], mirrors = [], W1 = wheel(S), zc = D.hw0 - S.tw / 2 - 0.022;
    const liner = new THREE.CylinderGeometry(D.R - 0.012, D.R - 0.012, 0.5, 32, 1, true, Math.PI / 2, Math.PI); liner.rotateX(Math.PI / 2);
    { const idx = liner.index.array; for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } liner.computeVertexNormals(); }
    const linerEnd = new THREE.CircleGeometry(D.R - 0.012, 32, 0, Math.PI);
    for (const wx of D.wheels) for (const side of [1, -1]) {
      const place = (g, z) => { g = side < 0 ? mirrorZ(g) : g.clone(); g.translate(wx, S.wr, side * z); return g; };
      tyres.push(place(W1.tyre, zc), place(W1.dark, zc)); rims.push(place(W1.rim, zc));
      trim.push(place(liner, D.hw0 - 0.27), place(linerEnd, D.hw0 - 0.52)); // the inside of the arch, dark, so nothing shows through
    }
    const fl = new THREE.BoxGeometry(S.L - 0.9, 0.05, S.W - 0.62); fl.translate(0, S.sill - 0.04, 0); trim.push(fl); // the floor
    for (const side of [1, -1]) { // door mirrors: a soft cap in body colour on a dark arm, at the front of the side glass
      const sx = S.dlo[0] - 0.03, by = D.belt(sx), base = Math.abs(P.sideAt(sx, by - 0.03, side).p.z), sy = by + 0.08;
      const cap = new THREE.SphereGeometry(1, 24, 16); cap.scale(0.07, 0.06, 0.115); cap.translate(sx - 0.015, sy, side * (base + 0.14)); mirrors.push(cap);
      const face = new THREE.CircleGeometry(1, 24); face.rotateY(-Math.PI / 2); face.scale(1, 0.048, 0.098); face.translate(sx - 0.072, sy, side * (base + 0.14)); trim.push(face);
      const arm = new THREE.CylinderGeometry(0.014, 0.018, 0.13, 10); arm.rotateX(Math.PI / 2); arm.translate(sx + 0.01, sy - 0.035, side * (base + 0.055)); mirrors.push(arm);
    }
    if (S.rails) for (const side of [1, -1]) { // two slim roof rails
      const x0 = S.roofF - 0.08, x1 = S.roofR + 0.14, z = side * 0.57, ym = P.topAt((x0 + x1) / 2, z).p.y;
      const r = new THREE.CapsuleGeometry(0.017, x0 - x1, 4, 10); r.rotateZ(Math.PI / 2); r.translate((x0 + x1) / 2, ym + 0.05, z); trim.push(r);
      for (const fx of [x0 - 0.01, x1 + 0.01, (x0 + x1) / 2]) { const f = new THREE.BoxGeometry(0.06, 0.06, 0.03); f.translate(fx, P.topAt(fx, z).p.y + 0.025, z); trim.push(f); }
    }
    return { trim, body, tyres, rims, mirrors };
  }

  // ---- a contact shadow per body: a soft footprint, darker where the tyres meet the floor ---------------------------------------
  function shadowTexture(S) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 256; const x = c.getContext("2d");
    const PW = S.L + 0.7, PH = S.W + 0.7, u = (mx) => (mx / PW + 0.5) * c.width, v = (mz) => (mz / PH + 0.5) * c.height;
    const rect = (x0, x1, y0, y1, r) => { x.beginPath(); x.moveTo(x0 + r, y0); x.arcTo(x1, y0, x1, y1, r); x.arcTo(x1, y1, x0, y1, r); x.arcTo(x0, y1, x0, y0, r); x.arcTo(x0, y0, x1, y0, r); x.fill(); };
    x.filter = "blur(22px)"; x.fillStyle = "rgba(255,255,255,0.55)"; rect(u(-S.L / 2 - 0.05), u(S.L / 2 + 0.05), v(-S.W / 2 - 0.02), v(S.W / 2 + 0.02), 60);
    x.filter = "blur(9px)"; x.fillStyle = "rgba(255,255,255,0.7)"; rect(u(-S.L / 2 + 0.15), u(S.L / 2 - 0.15), v(-S.W / 2 + 0.12), v(S.W / 2 - 0.12), 40);
    x.filter = "blur(5px)"; x.fillStyle = "#fff";
    for (const wx of [S.wf, S.wb]) for (const s of [1, -1]) { x.beginPath(); x.ellipse(u(wx), v(s * (S.W / 2 - S.tw / 2 - 0.022)), (0.24 / PW) * c.width, (S.tw * 0.55 / PH) * c.height, 0, 0, Math.PI * 2); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
  }

  // ---- assemble: each type is built the first time it is asked for -------------------------------------------------------------
  const TYPES = {}, built = {};
  for (const [kind, S] of Object.entries(SPEC)) {
    const top = mono(S.top);
    TYPES[kind] = { ...S, profile: S.top, roof: S.H, belt: S.beltF, bot: S.sill, glass: [S.cowl, S.roofF, S.roofR, S.rearBase], mirrorX: S.dlo[0] - 0.04,
      top: [S.L / 2, (S.L / 2 + S.bonnetF) / 2, S.bonnetF, (S.bonnetF + S.cowl) / 2, S.cowl].map((x) => [x, top(x)]), tail: [[S.rearBase, top(S.rearBase)], [-S.L / 2, top(-S.L / 2)]] };
  }
  function build(kind) {
    const D = design(kind), S = D.S, sh = shell(D), P = probes(D), ex = extras(D, P);
    const parts = { body: merge([sh.body, ...ex.body]), glass: sh.glass, tyres: merge(ex.tyres), rims: merge(ex.rims), heads: sh.heads, tails: sh.tails, trim: merge([sh.trim, ...ex.trim]), mirrors: merge(ex.mirrors) };
    parts.mirrors.setAttribute("color", new THREE.BufferAttribute(new Float32Array(parts.mirrors.attributes.position.count * 3).fill(1), 3)); // drawn with the body's material, which reads vertex colours
    return Object.assign(parts, P, { T: TYPES[kind], L: S.L, W: S.W, H: S.H, map: (x, y, z) => V3(x, y, z), shadowTex: shadowTexture(S) });
  }
  const kit = { TYPES, merge };
  for (const kind of Object.keys(SPEC)) Object.defineProperty(kit, kind, { enumerable: true, get: () => built[kind] || (built[kind] = build(kind)) });
  Object.defineProperty(kit, "shadowTex", { enumerable: true, get: () => kit.hatch.shadowTex });
  return kit;
}
