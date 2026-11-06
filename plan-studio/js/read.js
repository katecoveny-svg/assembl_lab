// assembl Plan Studio · reading a plan. Measure first, interpret second:
//  1. A CAD-exported PDF already holds exact linework. pdf.js gives us every path segment and text run; nothing is guessed.
//  2. The drawing scale comes from the title block ("1:100") and is confirmed by a person (or calibrated on a known dimension).
//  3. Deterministic geometry finds walls as pairs of parallel lines a wall-thickness apart, openings as gaps in a wall run
//     (a swing arc nearby means a door), and rooms from the room labels in the text layer.
//  4. Everything carries evidence: src "drawing" for measured linework, "text" for labels, with a confidence and a reason.
// A raster image or a scan has no linework: that path goes to /api/plan-read (a vision model), and its output is marked "ai".
const PT_MM = 25.4 / 72;

// ------------------------------------------------------------------------------------------------ pdf.js glue (browser)
export async function readPdfPage(pdfjsLib, data, pageNo = 1) {
  const doc = await pdfjsLib.getDocument({ data }).promise, page = await doc.getPage(pageNo);
  const ops = await page.getOperatorList(), OPS = pdfjsLib.OPS, text = await page.getTextContent();
  // every segment remembers how it was painted: "poche" (a dark fill: wall poché), "tone" (a light fill: room colour), or
  // "stroke" with its line weight. CAD sheets draw walls as poché or heavy strokes; dimensions and grids are hairlines.
  const segs = [], arcs = []; let ctm = [1, 0, 0, 1, 0, 0], fill = [0, 0, 0], lw = 1; const stack = [];
  let pend = [], pendArcs = [], pendSub = [], subN = 0;
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const tp = (x, y) => [ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5]];
  const scaleOf = () => Math.sqrt(Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2])) || 1;
  const flush = (how) => {
    const lum = (fill[0] + fill[1] + fill[2]) / 3, w = lw * scaleOf();
    if (how === "fill" || how === "fillStroke") {
      // how thick is this filled shape? 2·area/perimeter ≈ the width of a long thin shape. Hairline fills (dashes a PDF writer
      // turned into shapes, hatch strokes) are not wall poché.
      const sat = Math.max(...fill) - Math.min(...fill), subs = new Map();
      pend.forEach((s_, i) => { const id = pendSub[i]; if (!subs.has(id)) subs.set(id, []); subs.get(id).push(s_); });
      for (const sub of subs.values()) {
        let A = 0, Pm = 0; for (const [p, q] of sub) { A += p[0] * q[1] - q[0] * p[1]; Pm += Math.hypot(q[0] - p[0], q[1] - p[1]); }
        const thick = Pm ? Math.abs(A) / Pm : 0;              // = 2·area / perimeter
        const kind = lum >= 215 ? "tone" : sat > 60 ? "colour" : thick < 1.0 ? "thin" : "poche";
        for (const s_ of sub) segs.push({ p: s_, kind, lum, lw: 0, thick });
      }
      const ak = lum >= 215 ? "tone" : sat > 60 ? "colour" : "poche"; for (const a_ of pendArcs) arcs.push({ p: a_, kind: ak });
    }
    if (how === "stroke" || how === "fillStroke") { for (const s_ of pend) segs.push({ p: s_, kind: "stroke", lw: w }); for (const a_ of pendArcs) arcs.push({ p: a_, kind: "stroke", lw: w }); }
    pend = []; pendArcs = []; pendSub = [];
  };
  const F = { [OPS.fill]: "fill", [OPS.eoFill]: "fill", [OPS.stroke]: "stroke", [OPS.closeStroke]: "stroke", [OPS.fillStroke]: "fillStroke", [OPS.eoFillStroke]: "fillStroke", [OPS.closeFillStroke]: "fillStroke", [OPS.closeEOFillStroke]: "fillStroke", [OPS.endPath]: "none" };
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i], a = ops.argsArray[i];
    if (fn === OPS.save) stack.push([ctm.slice(), fill.slice(), lw]);
    else if (fn === OPS.restore) { const st = stack.pop(); if (st) [ctm, fill, lw] = st; }
    else if (fn === OPS.transform) ctm = mul(ctm, a);
    else if (fn === OPS.paintFormXObjectBegin && a?.[0]) { stack.push([ctm.slice(), fill.slice(), lw]); ctm = mul(ctm, a[0]); }
    else if (fn === OPS.paintFormXObjectEnd) { const st = stack.pop(); if (st) [ctm, fill, lw] = st; }
    else if (fn === OPS.setFillRGBColor) fill = [a[0], a[1], a[2]];
    else if (fn === OPS.setFillGray) fill = [a[0] * 255, a[0] * 255, a[0] * 255];
    else if (fn === OPS.setLineWidth) lw = a[0];
    else if (fn === OPS.setGState) { for (const [k, v] of a[0] || []) if (k === "LW") lw = v; }
    else if (F[fn] !== undefined) flush(F[fn]);
    else if (fn === OPS.constructPath) {
      const [sub, coords] = a; let k = 0, cur = null, start = null;
      for (const op of sub) {
        if (op === OPS.moveTo) { cur = start = tp(coords[k], coords[k + 1]); k += 2; subN++; }
        else if (op === OPS.lineTo) { const p = tp(coords[k], coords[k + 1]); k += 2; if (cur) { pend.push([cur, p]); pendSub.push(subN); } cur = p; }
        else if (op === OPS.curveTo) { const p = tp(coords[k + 4], coords[k + 5]); pendArcs.push([cur, tp(coords[k], coords[k + 1]), p]); k += 6; cur = p; }
        else if (op === OPS.curveTo2 || op === OPS.curveTo3) { const p = tp(coords[k + 2], coords[k + 3]); pendArcs.push([cur, p]); k += 4; cur = p; }
        else if (op === OPS.rectangle) { const [x, y, w, h] = coords.slice(k, k + 4); k += 4; const q = [tp(x, y), tp(x + w, y), tp(x + w, y + h), tp(x, y + h)]; subN++; for (let j = 0; j < 4; j++) { pend.push([q[j], q[(j + 1) % 4]]); pendSub.push(subN); } cur = start = q[0]; }
        else if (op === OPS.closePath) { if (cur && start && (cur[0] !== start[0] || cur[1] !== start[1])) { pend.push([cur, start]); pendSub.push(subN); } cur = start; }
      }
    }
  }
  const items = text.items.filter((t) => t.str && t.str.trim()).map((t) => ({ str: t.str.trim(), x: t.transform[4], y: t.transform[5], h: Math.hypot(t.transform[2], t.transform[3]) }));
  const vp = page.getViewport({ scale: 1 });
  return { segs, arcs, items, pageW: vp.width, pageH: vp.height, pages: doc.numPages };
}

// ------------------------------------------------------------------------------------------------ scale from the title block
export function findScale(items) {
  const found = [];
  for (const t of items) { const m = t.str.match(/\b1\s*[:：]\s*(\d{2,4})\b/); if (m) found.push(+m[1]); }
  if (!found.length) return null;
  const count = found.reduce((acc, s) => ((acc[s] = (acc[s] || 0) + 1), acc), {});
  const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  return { scale: +best[0], seen: found, note: `Read "1:${best[0]}" from the sheet text${found.length > 1 ? ` (also saw ${[...new Set(found)].filter((s) => s !== +best[0]).map((s) => "1:" + s).join(", ") || "only this"})` : ""}. A person confirms before anything is measured.` };
}

// pdf points → real millimetres at a drawing scale (pdf y already points up, like a plan)
export function toReal(raw, scale) {
  const k = PT_MM * scale, P = (p) => [p[0] * k, p[1] * k];
  return { segs: raw.segs.map((s) => ({ ...s, p: [P(s.p[0]), P(s.p[1])], lw: (s.lw || 0) * k })), arcs: raw.arcs.map((a) => ({ ...a, p: a.p.filter(Boolean).map(P) })), items: raw.items.map((t) => ({ ...t, x: t.x * k, y: t.y * k, h: t.h * k })) };
}

// ------------------------------------------------------------------------------------------------ walls: parallel line pairs
export function detectWalls(segs, o = {}) {
  const tMin = o.tMin ?? 60, tMax = o.tMax ?? 400, minLen = o.minLen ?? 250, minOverlap = o.minOverlap ?? 250, angTol = 0.6;
  const L = segs.map(([a, b]) => {
    let dx = b[0] - a[0], dy = b[1] - a[1]; const len = Math.hypot(dx, dy); if (len < minLen) return null;
    dx /= len; dy /= len; if (dx < -1e-9 || (Math.abs(dx) < 1e-9 && dy < 0)) { dx = -dx; dy = -dy; }
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI, n = [-dy, dx], c = n[0] * a[0] + n[1] * a[1], s0 = dx * a[0] + dy * a[1], s1 = dx * b[0] + dy * b[1];
    return { a, b, len, d: [dx, dy], n, ang, c, s0: Math.min(s0, s1), s1: Math.max(s0, s1) };
  }).filter(Boolean);
  // de-duplicate exact overlaps (fill + stroke of the same edge)
  const uniq = []; for (const s of L) if (!uniq.some((u) => Math.abs(u.ang - s.ang) < 0.01 && Math.abs(u.c - s.c) < 1 && Math.abs(u.s0 - s.s0) < 1 && Math.abs(u.s1 - s.s1) < 1)) uniq.push(s);
  const pairs = [];
  for (const s of uniq) {
    let best = null;
    for (const r of uniq) {
      if (r === s || Math.abs(r.ang - s.ang) > angTol) continue;
      const dc = r.c - s.c; if (dc < tMin || dc > tMax) continue;        // r lies on s's positive side, a wall thickness away
      const ov = Math.min(s.s1, r.s1) - Math.max(s.s0, r.s0); if (ov < minOverlap) continue;
      if (!best || dc < best.dc - 1 || (Math.abs(dc - best.dc) <= 1 && ov > best.ov)) best = { r, dc, ov };
    }
    if (best) pairs.push({ ang: s.ang, d: s.d, n: s.n, t: Math.round(best.dc), c: s.c + best.dc / 2, s0: Math.max(s.s0, best.r.s0), s1: Math.min(s.s1, best.r.s1), lines: 2, lenA: s.len, lenB: best.r.len });
  }
  // merge collinear pieces of the same wall; remember the gaps (candidate openings)
  pairs.sort((p, q) => p.ang - q.ang || p.c - q.c || p.s0 - q.s0);
  const runs = [];
  for (const p of pairs) {
    const run = runs.find((r) => Math.abs(r.ang - p.ang) < angTol && Math.abs(r.c - p.c) < 15 && Math.abs(r.t - p.t) < 20 && p.s0 <= r.s1 + (o.maxGap ?? 16000));
    if (run) { if (p.s0 > r_end(run) + 5) run.gaps.push([r_end(run), p.s0]); run.pieces.push([p.s0, p.s1]); run.s1 = Math.max(run.s1, p.s1); run.s0 = Math.min(run.s0, p.s0); }
    else runs.push({ ang: p.ang, d: p.d, n: p.n, t: p.t, c: p.c, s0: p.s0, s1: p.s1, pieces: [[p.s0, p.s1]], gaps: [] });
  }
  function r_end(run) { return Math.max(...run.pieces.map((x) => x[1])); }
  return runs.map((r, i) => {
    const P = (s) => [r.d[0] * s + r.n[0] * r.c, r.d[1] * s + r.n[1] * r.c], len = r.s1 - r.s0, typical = r.t >= 70 && r.t <= 320;
    const conf = Math.min(0.97, 0.55 + (typical ? 0.25 : 0) + Math.min(0.15, len / 40000));
    return { id: `W${i + 1}`, a: P(r.s0), b: P(r.s1), t: r.t, gaps: r.gaps.map(([g0, g1]) => [P(g0), P(g1)]),
      ev: { src: "drawing", conf: +conf.toFixed(2), note: `Two parallel lines ${r.t} mm apart over ${Math.round(len)} mm${typical ? "" : "; unusual thickness, check"}` } };
  });
}

// snap wall ends onto the centreline of a wall they run into (an L or T junction), so rooms close
export function joinWalls(walls, tol = 400) {
  for (const w of walls) for (const end of ["a", "b"]) {
    const p = w[end]; let best = null;
    for (const v of walls) {
      if (v === w) continue;
      const L = Math.hypot(v.b[0] - v.a[0], v.b[1] - v.a[1]), d = [(v.b[0] - v.a[0]) / L, (v.b[1] - v.a[1]) / L];
      if (Math.abs(d[0] * (w.b[0] - w.a[0]) + d[1] * (w.b[1] - w.a[1])) / Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) > 0.2) continue;   // only roughly perpendicular walls
      const s = (p[0] - v.a[0]) * d[0] + (p[1] - v.a[1]) * d[1]; if (s < -tol || s > L + tol) continue;
      const q = [v.a[0] + d[0] * s, v.a[1] + d[1] * s], dist = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (dist <= Math.max(tol, v.t) && (!best || dist < best.dist)) best = { q, dist };
    }
    if (best) w[end] = best.q.map((x) => Math.round(x));
  }
  return walls;
}

// keep the largest connected group of walls (the building); scale bars, legend boxes and title-block rules fall away
export function mainCluster(walls, tol = 500) {
  const near = (w, v) => {
    const d2 = (p, a, b) => { const vx = b[0] - a[0], vy = b[1] - a[1], L2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2)); return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vy * t); };
    return [w.a, w.b].some((p) => d2(p, v.a, v.b) < tol + v.t) || [v.a, v.b].some((p) => d2(p, w.a, w.b) < tol + w.t);
  };
  const comp = walls.map((_, i) => i), find = (i) => (comp[i] === i ? i : (comp[i] = find(comp[i])));
  for (let i = 0; i < walls.length; i++) for (let j = i + 1; j < walls.length; j++) if (near(walls[i], walls[j])) comp[find(i)] = find(j);
  const total = new Map(); walls.forEach((w, i) => { const r = find(i); total.set(r, (total.get(r) || 0) + Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1])); });
  const best = [...total.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return walls.filter((_, i) => find(i) === best).map((w, i) => ({ ...w, id: `W${i + 1}` }));
}

// ------------------------------------------------------------------------------------------------ openings from the gaps
export function detectOpenings(walls, arcs, segs) {
  const out = []; let k = 1;
  for (const w of walls) {
    const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), d = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L], n = [-d[1], d[0]];
    for (const [p0, p1] of w.gaps || []) {
      // gap ends are absolute points: project them onto the wall as it is now (its ends may have been snapped to a junction)
      const g0 = (p0[0] - w.a[0]) * d[0] + (p0[1] - w.a[1]) * d[1], g1 = (p1[0] - w.a[0]) * d[0] + (p1[1] - w.a[1]) * d[1];
      const width = Math.abs(g1 - g0); if (width < 500 || width > 16000) continue;
      const at = (g0 + g1) / 2, mid = [w.a[0] + d[0] * at, w.a[1] + d[1] * at], ends = [p0, p1];
      // a door: a leaf line drawn square to the wall from one end of the gap, a leaf long (one leaf, or two halves); or an arc
      // piece lying on that radius around a gap end. Dashed swings arrive as many small pieces, so each piece is tested on its own.
      const leaves = width <= 2600 ? [width, width / 2] : [];
      const leafLine = leaves.length && segs.some(([a, b]) => { const la = Math.hypot(b[0] - a[0], b[1] - a[1]); if (Math.abs((b[0] - a[0]) * d[0] + (b[1] - a[1]) * d[1]) / la > 0.2) return false; return ends.some((e) => [a, b].some((p) => Math.hypot(p[0] - e[0], p[1] - e[1]) < 60)) && leaves.some((L_) => la > L_ * 0.85 && la < L_ * 1.08); });
      const onRadius = leaves.length && arcs.some((arc) => { const pts = arc.filter(Boolean); if (pts.length < 2) return false;
        return ends.some((e, k) => { const other = ends[1 - k], inward = [(other[0] - e[0]) / width, (other[1] - e[1]) / width];
          return leaves.some((r) => pts.every((p) => Math.abs(Math.hypot(p[0] - e[0], p[1] - e[1]) - r) < r * 0.06 + 20)
            && pts.every((p) => (p[0] - e[0]) * inward[0] + (p[1] - e[1]) * inward[1] > -0.1 * r)                     // swings over the gap, not beside it
            && (() => { const a = pts[0], b = pts[pts.length - 1], cl = Math.hypot(b[0] - a[0], b[1] - a[1]); if (cl < 1) return true; const m_ = [(a[0] + b[0]) / 2 - e[0], (a[1] + b[1]) / 2 - e[1]], ml = Math.hypot(...m_);
                return Math.abs(((b[0] - a[0]) * m_[0] + (b[1] - a[1]) * m_[1]) / (cl * ml)) < 0.3; })());           // tangent to the circle round that end
        }); });
      const nearArc = !!(leafLine || onRadius);
      const glazingLines = segs.filter(([a, b]) => { const la = Math.hypot(b[0] - a[0], b[1] - a[1]); if (la < Math.min(width * 0.7, 1500)) return false; const u = [(b[0] - a[0]) / la, (b[1] - a[1]) / la]; if (Math.abs(u[0] * d[0] + u[1] * d[1]) < 0.99) return false; const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; const off = Math.abs((c[0] - mid[0]) * n[0] + (c[1] - mid[1]) * n[1]), al = Math.abs((c[0] - mid[0]) * d[0] + (c[1] - mid[1]) * d[1]); return off <= w.t / 2 + 5 && al < width / 2; }).length;
      const kind = nearArc ? (width > 1500 ? "door-double" : "door") : glazingLines >= 1 ? (width > 4500 && w.t >= 150 ? "glazing" : "window") : "opening";
      const conf = nearArc || glazingLines >= 2 ? 0.8 : 0.55;
      out.push({ id: `${kind.startsWith("door") ? "D" : kind === "opening" ? "O" : "N"}${k++}`, wall: w.id, at: Math.round(at), w: Math.round(width), h: kind.startsWith("door") || kind === "opening" ? 2100 : kind === "glazing" ? 3000 : 1500,
        sill: kind === "window" ? 900 : kind === "glazing" ? 300 : 0, kind, mat: kind.startsWith("door") ? "door-timber" : "window-thermal", openable: kind === "window" ? 0.5 : 0,
        ev: { src: "drawing", conf, note: `Gap of ${Math.round(width)} mm in a wall run; ${nearArc ? "a swing arc nearby, so a door" : glazingLines ? `${glazingLines} glazing line(s) across it, so a window` : "no arc or glazing lines: an opening"}. Height and sill are defaults: confirm from the elevations.` } });
    }
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ rooms from labels
const NOT_A_ROOM = /^(\d+([.,]\d+)?\s*(m²|m2|mm|m|people|persons|seats|pax)?|m²|m2|people|persons|seats|[A-Z]|\d|N|UP|DN|DOWN)$/i;
const USE_HINTS = [[/hall|conference|auditorium|function|assembly|church|worship/i, "assembly"], [/foyer|lobby|entrance|entry/i, "foyer"], [/meeting|workshop|office|room/i, "meeting"], [/kitchen|servery|kitchenette/i, "kitchen"], [/acc(essible)?\s*wc|accessible|disabled/i, "wc-accessible"], [/wc|toilet|male|female|ablution|bath/i, "wc"], [/corridor|hall ?way|passage/i, "corridor"], [/store|storage|cleaner/i, "store"], [/plant|services|riser/i, "plant"], [/stage/i, "stage"], [/living|lounge|family/i, "living"], [/bed/i, "bedroom"], [/laundry/i, "laundry"], [/garage/i, "garage"], [/deck/i, "deck"]];
export function guessUse(name) { for (const [re, use] of USE_HINTS) if (re.test(name)) return use; return "meeting"; }

export function roomsFromLabels(items, walls) {
  if (!walls.length) return [];
  const xs = walls.flatMap((w) => [w.a[0], w.b[0]]), ys = walls.flatMap((w) => [w.a[1], w.b[1]]), box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  const labels = items.filter((t) => t.x > box[0] && t.x < box[2] && t.y > box[1] && t.y < box[3] && t.str.length > 1 && !NOT_A_ROOM.test(t.str) && /[a-z]/i.test(t.str));
  // the nearest wall centreline in each direction from the label gives a rectangle (orthogonal plans; flagged as such)
  const ray = (p, dx, dy) => {
    let best = Infinity;
    for (const w of walls) {
      const vx = w.b[0] - w.a[0], vy = w.b[1] - w.a[1], den = dx * vy - dy * vx; if (Math.abs(den) < 1e-9) continue;
      const t = ((w.a[0] - p[0]) * vy - (w.a[1] - p[1]) * vx) / den, u = ((w.a[0] - p[0]) * dy - (w.a[1] - p[1]) * dx) / den;
      if (t > 50 && u >= -0.01 && u <= 1.01) best = Math.min(best, t);
    }
    return best;
  };
  const rooms = [], seen = [];
  for (const t of labels) {
    const p = [t.x + (t.str.length * t.h) / 4, t.y + t.h / 3];
    const e = ray(p, 1, 0), wv = ray(p, -1, 0), nn = ray(p, 0, 1), s = ray(p, 0, -1);
    if (![e, wv, nn, s].every(Number.isFinite)) continue;
    const poly = [[p[0] - wv, p[1] - s], [p[0] + e, p[1] - s], [p[0] + e, p[1] + nn], [p[0] - wv, p[1] + nn]].map((q) => q.map((v) => Math.round(v)));
    const key = poly.flat().join(","); const dup = seen.indexOf(key);
    if (dup >= 0) { rooms[dup].name += " " + t.str; continue; }
    seen.push(key);
    rooms.push({ id: `R${rooms.length + 1}`, name: t.str.replace(/\s+/g, " "), use: guessUse(t.str), poly, ev: { src: "text", conf: 0.6, note: `Label "${t.str}" read from the drawing's text layer; extent from the nearest walls on four sides (rectangle: check)` } });
  }
  for (const r of rooms) r.use = guessUse(r.name);
  return rooms;
}

// ------------------------------------------------------------------------------------------------ the whole read
// pick the linework that draws walls: poché if the sheet uses it, otherwise the heavier strokes
export function wallLinework(real) {
  const poche = real.segs.filter((s) => s.kind === "poche");
  if (poche.length >= 12) return { segs: poche.map((s) => s.p), how: `${poche.length} edges of dark-filled wall poché` };
  const strokes = real.segs.filter((s) => s.kind === "stroke"), ws = strokes.map((s) => s.lw).sort((a, b) => a - b), cut = ws[Math.floor(ws.length * 0.6)] || 0;
  const heavy = strokes.filter((s) => s.lw >= cut && s.lw > 0);
  return { segs: (heavy.length >= 12 ? heavy : strokes).map((s) => s.p), how: heavy.length >= 12 ? `${heavy.length} heavier strokes (line weight ≥ ${cut.toFixed(0)} mm at scale)` : `${strokes.length} strokes (no poché or weight difference found)` };
}

export function modelFromDrawing(real, meta = {}) {
  const lw = wallLinework(real), strokesAll = real.segs.filter((s) => s.kind === "stroke" || s.kind === "poche").map((s) => s.p), arcsAll = real.arcs.filter((a) => a.kind !== "tone").map((a) => a.p);
  const walls = joinWalls(mainCluster(detectWalls(lw.segs))).map((w, i) => ({ ...w, h: w.t >= 150 ? 3000 : 2700, kind: w.t >= 150 ? "ext" : "int", mat: w.t >= 150 ? "cladding-vertical" : "lining-plasterboard" }));
  const openings = detectOpenings(walls, arcsAll, strokesAll);
  const rooms = roomsFromLabels(real.items, walls);
  // move the origin to the building's south-west corner
  const xs = walls.flatMap((w) => [w.a[0], w.b[0]]), ys = walls.flatMap((w) => [w.a[1], w.b[1]]), ox = Math.min(...xs), oy = Math.min(...ys);
  const sh = (p) => [Math.round(p[0] - ox), Math.round(p[1] - oy)];
  for (const w of walls) { w.a = sh(w.a); w.b = sh(w.b); delete w.gaps; }
  for (const r of rooms) r.poly = r.poly.map(sh);
  const height = 3000;
  return {
    schema: "assembl.planstudio.v1",
    meta: { name: meta.name || "Imported plan", address: meta.address || "", owner: meta.owner || "", designer: meta.designer || "", number: meta.number || "PS-IMPORT", status: "Imported · check every element", use: meta.use || "CS", storeys: 1, units: "mm", truth: "Measured from the drawing; heights assumed" },
    levels: [{ id: "L0", name: "Ground floor", z: 0 }], walls, openings, rooms,
    slab: { t: 150, mat: "slab-concrete", ev: { src: "user", conf: 0.5, note: "Assumed 150 mm" } },
    roof: { type: "gable", ridge: (Math.max(...xs) - ox) > (Math.max(...ys) - oy) ? "x" : "y", eaves: height, ridgeH: height + 2500, overhang: 450, mat: "roof-standing-seam", ev: { src: "user", conf: 0.3, note: "Roof assumed: read it from the elevations or set it" } },
    site: { north: 0 }, revisions: [], inputs: {}, origin: [ox, oy],
    stats: { segments: real.segs.length, arcs: real.arcs.length, texts: real.items.length, walls: lw.how },
  };
}
