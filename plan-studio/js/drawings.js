// assembl Plan Studio · working drawings. Pure functions: project model in, SVG sheets out (A3 landscape, millimetres on paper),
// so the same code renders on the page, prints to PDF, and runs in tests. Every sheet carries the MBIE minimum title-block
// fields (drawing number and title, designer, owner, address, scale, version date) and a revision table; anything changed since
// the previous revision is clouded and tagged with the revision letter.
import { polyArea, polyBox, openingSpan, isDoor, wallFacing, diffModels, revLetter, wallById } from "./model.js";
import { DISCLAIMER } from "./code.js";
import { MATERIALS } from "./materials.js";

export const SHEET = { w: 420, h: 297, margin: 10, tb: 105 };      // A3 landscape; title block on the right
const INK = "#1d1418", SOFT = "#6d5d63", HAIR = 0.18, MED = 0.35, BOLD = 0.6, CLOUD = "#B0213A";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const f1 = (n) => +n.toFixed(2);
const txt = (x, y, s, o = {}) => `<text x="${f1(x)}" y="${f1(y)}" font-size="${o.size || 2.2}" ${o.anchor ? `text-anchor="${o.anchor}"` : ""} ${o.weight ? `font-weight="${o.weight}"` : ""} fill="${o.fill || INK}" font-family="${o.mono ? "IBM Plex Mono, monospace" : "Instrument Sans, Arial, sans-serif"}"${o.rot ? ` transform="rotate(${o.rot} ${f1(x)} ${f1(y)})"` : ""}>${esc(s)}</text>`;
const line = (x1, y1, x2, y2, w = HAIR, c = INK, dash = "") => `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${c}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
const poly = (pts, fill, stroke = "none", w = HAIR) => `<polygon points="${pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
const matName = (id) => MATERIALS[id]?.name || id;

// ------------------------------------------------------------------------------------------------ the sheet frame
function frame(P, num, title, scale, body, revs) {
  const { w, h, margin: m, tb } = SHEET, x0 = w - m - tb, today = revs.length ? revs[revs.length - 1].date : new Date().toISOString().slice(0, 10);
  const meta = P.meta, rows = revs.slice(-6);
  const rowsSvg = rows.map((r, i) => { const y = 160 + i * 10, d = (r.desc || "").match(/.{1,40}(\s|$)/g) || [""]; return line(x0 + 2, y + 5.2, x0 + tb - 2, y + 5.2, HAIR, "#c9bec2") + txt(x0 + 3, y, r.rev, { mono: 1, size: 2.2, weight: 600 }) + txt(x0 + 10, y, r.date, { mono: 1, size: 2 }) + txt(x0 + 32, y, d[0].trim(), { size: 2 }) + (d[1] ? txt(x0 + 32, y + 3, (d[1].trim() + (d[2] ? "…" : "")), { size: 2 }) : ""); }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" data-sheet="${esc(num)}">
<rect x="0" y="0" width="${w}" height="${h}" fill="#fff"/>
<rect x="${m}" y="${m}" width="${w - 2 * m}" height="${h - 2 * m}" fill="none" stroke="${INK}" stroke-width="${BOLD}"/>
<line x1="${x0}" y1="${m}" x2="${x0}" y2="${h - m}" stroke="${INK}" stroke-width="${MED}"/>
${body}
<g class="titleblock">
${txt(x0 + 4, m + 9, "assembl", { size: 5.2, weight: 700, fill: "#240B21" })}${txt(x0 + 32, m + 9, "Plan Studio", { size: 3, fill: SOFT })}
${txt(x0 + 4, m + 15, meta.status || "Preliminary", { mono: 1, size: 2, fill: CLOUD })}
${line(x0, m + 19, w - m, m + 19, MED)}
${txt(x0 + 4, m + 25, "Project", { mono: 1, size: 1.8, fill: SOFT })}${txt(x0 + 4, m + 30, meta.name, { size: 3.2, weight: 600 })}
${txt(x0 + 4, m + 35, meta.address, { size: 2.3 })}
${txt(x0 + 4, m + 42, "Owner", { mono: 1, size: 1.8, fill: SOFT })}${txt(x0 + 4, m + 46.5, meta.owner, { size: 2.3 })}
${txt(x0 + 4, m + 53, "Designer", { mono: 1, size: 1.8, fill: SOFT })}${txt(x0 + 4, m + 57.5, meta.designer, { size: 2.3 })}
${line(x0, m + 62, w - m, m + 62, MED)}
${txt(x0 + 4, m + 68, "Drawing", { mono: 1, size: 1.8, fill: SOFT })}${txt(x0 + 4, m + 74, title, { size: 3.4, weight: 600 })}
${txt(x0 + 4, m + 83, "Number", { mono: 1, size: 1.8, fill: SOFT })}${txt(x0 + 4, m + 89, `${meta.number}-${num}`, { mono: 1, size: 3.4, weight: 600 })}
${txt(x0 + 56, m + 83, "Scale @ A3", { mono: 1, size: 1.8, fill: SOFT })}${txt(x0 + 56, m + 89, scale, { mono: 1, size: 3 })}
${txt(x0 + 4, m + 98, "Revision", { mono: 1, size: 1.8, fill: SOFT })}${txt(x0 + 4, m + 104, revs.length ? revs[revs.length - 1].rev : "–", { mono: 1, size: 3.4, weight: 600 })}
${txt(x0 + 56, m + 98, "Date", { mono: 1, size: 1.8, fill: SOFT })}${txt(x0 + 56, m + 104, today, { mono: 1, size: 3 })}
${line(x0, m + 110, w - m, m + 110, MED)}
${txt(x0 + 4, m + 116, "Model-generated drawing. Dimensions in mm.", { size: 2 })}
${txt(x0 + 4, m + 120, "Pre-check flags are advisory, not a consent decision.", { size: 2 })}
${txt(x0 + 4, m + 124, "Do not scale. Check on site.", { size: 2 })}
${line(x0, 150, w - m, 150, MED)}
${txt(x0 + 3, 155.5, "Rev", { mono: 1, size: 1.8, fill: SOFT })}${txt(x0 + 10, 155.5, "Date", { mono: 1, size: 1.8, fill: SOFT })}${txt(x0 + 32, 155.5, "Description", { mono: 1, size: 1.8, fill: SOFT })}
${rowsSvg || txt(x0 + 3, 162, "No revisions issued yet", { size: 2, fill: SOFT })}
${txt(x0 + 4, h - m - 4, `Generated ${new Date().toISOString().slice(0, 10)} from model ${esc(P.meta.number)}`, { mono: 1, size: 1.7, fill: SOFT })}
</g>
</svg>`;
}

// a scalloped cloud around a box, with the revision triangle
function cloud(x0, y0, x1, y1, rev) {
  const r = 2.2, pts = [];
  const edge = (ax, ay, bx, by) => { const L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(L / (2 * r))); for (let i = 0; i < n; i++) pts.push([ax + ((bx - ax) * (i + 1)) / n, ay + ((by - ay) * (i + 1)) / n]); };
  edge(x0, y0, x1, y0); edge(x1, y0, x1, y1); edge(x1, y1, x0, y1); edge(x0, y1, x0, y0);
  let d = `M${f1(x0)},${f1(y0)}`; for (const [x, y] of pts) d += ` A${r},${r} 0 0 1 ${f1(x)},${f1(y)}`;
  const tx = x1 + 1, ty = y0 - 1;
  return `<path d="${d}" fill="none" stroke="${CLOUD}" stroke-width="${MED}"/>` + poly([[tx, ty - 4.2], [tx - 2.4, ty], [tx + 2.4, ty]], "#fff", CLOUD, MED) + txt(tx, ty - 0.9, rev, { size: 2.1, anchor: "middle", fill: CLOUD, weight: 700 });
}

// ------------------------------------------------------------------------------------------------ plan
export function planSheet(P, opts = {}) {
  const sc = 100, X0 = 30, Y0 = 250, toX = (x) => X0 + x / sc, toY = (y) => Y0 - y / sc;      // paper origin at the plan's south-west
  let g = "";
  // grids from the external and main internal wall lines
  const gx = [...new Set(P.walls.filter((w) => w.a[0] === w.b[0] && (w.kind === "ext" || w.h >= 4000)).map((w) => w.a[0]))].sort((a, b) => a - b);
  const gy = [...new Set(P.walls.filter((w) => w.a[1] === w.b[1] && (w.kind === "ext" || w.h >= 4000)).map((w) => w.a[1]))].sort((a, b) => a - b);
  const bx = polyBox(P.rooms.flatMap((r) => r.poly));
  gx.forEach((x, i) => { g += line(toX(x), toY(bx.y1) - 14, toX(x), toY(bx.y0) + 6, HAIR, "#b41f39", "3 1 0.6 1") + `<circle cx="${f1(toX(x))}" cy="${f1(toY(bx.y1) - 17)}" r="3" fill="#fff" stroke="${INK}" stroke-width="${HAIR}"/>` + txt(toX(x), toY(bx.y1) - 16.2, String.fromCharCode(65 + i), { size: 2.6, anchor: "middle", mono: 1 }); });
  gy.forEach((y, i) => { g += line(toX(bx.x0) - 14, toY(y), toX(bx.x1) + 6, toY(y), HAIR, "#b41f39", "3 1 0.6 1") + `<circle cx="${f1(toX(bx.x0) - 17)}" cy="${f1(toY(y))}" r="3" fill="#fff" stroke="${INK}" stroke-width="${HAIR}"/>` + txt(toX(bx.x0) - 17, toY(y) + 0.9, String(i + 1), { size: 2.6, anchor: "middle", mono: 1 }); });
  // grid dimension chains (north and west)
  const dimH = (xs, y, lab) => { let s = ""; for (let i = 0; i < xs.length - 1; i++) { const a = toX(xs[i]), b = toX(xs[i + 1]); s += line(a, y, b, y, HAIR) + line(a, y - 1.2, a, y + 1.2, HAIR) + line(b, y - 1.2, b, y + 1.2, HAIR) + txt((a + b) / 2, y - 1, Math.round(xs[i + 1] - xs[i]), { size: 2, anchor: "middle", mono: 1 }); } return s; };
  const dimV = (ys, x) => { let s = ""; for (let i = 0; i < ys.length - 1; i++) { const a = toY(ys[i]), b = toY(ys[i + 1]); s += line(x, a, x, b, HAIR) + line(x - 1.2, a, x + 1.2, a, HAIR) + line(x - 1.2, b, x + 1.2, b, HAIR) + txt(x - 1, (a + b) / 2, Math.round(ys[i + 1] - ys[i]), { size: 2, anchor: "middle", mono: 1, rot: -90 }); } return s; };
  g += dimH(gx, toY(bx.y1) - 8) + dimH([gx[0], gx[gx.length - 1]], toY(bx.y1) - 4) + dimV(gy, toX(bx.x0) - 8) + dimV([gy[0], gy[gy.length - 1]], toX(bx.x0) - 4);
  // rooms: light tone, tag with name and area
  for (const r of P.rooms) {
    g += poly(r.poly.map((p) => [toX(p[0]), toY(p[1])]), r.use === "wc" || r.use === "wc-accessible" ? "#f4f1f2" : "#fbfafa");
    const b = polyBox(r.poly), cx = toX((b.x0 + b.x1) / 2), cy = toY((b.y0 + b.y1) / 2), small = (b.x1 - b.x0) < 2600;
    g += txt(cx, cy - 0.6, r.name.toUpperCase(), { size: small ? 1.7 : 2.4, anchor: "middle", weight: 600 }) + txt(cx, cy + (small ? 2 : 3), `${(polyArea(r.poly) / 1e6).toFixed(1)} m²`, { size: small ? 1.6 : 2, anchor: "middle", mono: 1, fill: SOFT });
    if (r.occupants) g += txt(cx, cy + 6, `${r.occupants} people`, { size: 1.8, anchor: "middle", mono: 1, fill: SOFT });
  }
  // walls: poché, with the openings left out
  for (const w of P.walls) {
    const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), d = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L], n = [-d[1], d[0]], ht = w.t / 2;
    const cuts = P.openings.filter((o) => o.wall === w.id).map((o) => [o.at - o.w / 2, o.at + o.w / 2]).sort((a, b) => a[0] - b[0]);
    let s = -(w.kind === "ext" ? ht : 0); const pieces = [];
    for (const [c0, c1] of cuts) { if (c0 > s) pieces.push([s, c0]); s = Math.max(s, c1); }
    if (L + (w.kind === "ext" ? ht : 0) > s) pieces.push([s, L + (w.kind === "ext" ? ht : 0)]);
    for (const [a, b] of pieces) {
      const p = (t, k) => [toX(w.a[0] + d[0] * t + n[0] * k), toY(w.a[1] + d[1] * t + n[1] * k)];
      g += poly([p(a, -ht), p(b, -ht), p(b, ht), p(a, ht)], w.kind === "ext" ? (w.mat === "glass-curtain" ? "#8fa3ad" : "#2a2226") : "#77696f");
    }
  }
  // openings: windows as three lines in the wall; doors as a leaf and a swing arc
  for (const o of P.openings) {
    const s = openingSpan(P, o); if (!s) continue;
    const w = s.w, n = [-s.d[1], s.d[0]], ht = w.t / 2, A = (pt, k = 0) => [toX(pt[0] + n[0] * k), toY(pt[1] + n[1] * k)];
    if (o.kind === "window" || o.kind === "glazing") {
      for (const k of [-ht, 0, ht]) { const a = A(s.a, k), b = A(s.b, k); g += line(a[0], a[1], b[0], b[1], k ? HAIR : MED, k ? INK : "#2f6f8f"); }
      const a1 = A(s.a, -ht), a2 = A(s.a, ht), b1 = A(s.b, -ht), b2 = A(s.b, ht); g += line(a1[0], a1[1], a2[0], a2[1], HAIR) + line(b1[0], b1[1], b2[0], b2[1], HAIR);
    } else if (isDoor(o)) {
      const a1 = A(s.a, -ht), a2 = A(s.a, ht), b1 = A(s.b, -ht), b2 = A(s.b, ht); g += line(a1[0], a1[1], a2[0], a2[1], HAIR) + line(b1[0], b1[1], b2[0], b2[1], HAIR);
      if (o.kind === "opening") continue;
      const side = o.swing === "out" ? -1 : 1, leaves = o.kind === "door-double" ? [[s.a, o.w / 2, 1], [s.b, o.w / 2, -1]] : [[s.a, o.w, 1]];
      for (const [hinge, lw, sgn] of leaves) {
        const tip = [hinge[0] + n[0] * lw * side, hinge[1] + n[1] * lw * side], end = [hinge[0] + s.d[0] * lw * sgn, hinge[1] + s.d[1] * lw * sgn];
        const H = A(hinge), T = A(tip), E = A(end), r = lw / sc;
        const sweep = (sgn * side > 0) ? 0 : 1;
        g += line(H[0], H[1], T[0], T[1], MED) + `<path d="M${f1(T[0])},${f1(T[1])} A${f1(r)},${f1(r)} 0 0 ${sweep} ${f1(E[0])},${f1(E[1])}" fill="none" stroke="${INK}" stroke-width="${HAIR}" stroke-dasharray="1 0.6"/>`;
      }
    }
    const m = A(s.mid, (w.kind === "ext" ? 1 : -1) * (ht + 380));
    if (opts.tags !== false) g += txt(m[0], m[1] + 0.7, o.id, { size: 1.6, anchor: "middle", mono: 1, fill: SOFT });
  }
  // revision clouds: elements changed since the previous revision
  const revs = P.revisions || [];
  if (revs.length && opts.clouds !== false) {
    const last = revs[revs.length - 1], prev = revs.length > 1 ? revs[revs.length - 2].model : null, df = prev ? diffModels(prev, last.model) : { changed: [] };
    for (const c of df.changed) {
      const e = (last.model[c.key] || []).find((x) => x.id === c.id) || c.was; if (!e) continue;
      let pts = [];
      if (c.key === "walls") pts = [e.a, e.b];
      else if (c.key === "rooms") pts = e.poly;
      else { const s = openingSpan(last.model, e) || openingSpan(P, e); if (s) pts = [s.a, s.b]; }
      if (!pts.length) continue;
      const b = polyBox(pts); g += cloud(toX(b.x0) - 3, toY(b.y1) - 3, toX(b.x1) + 3, toY(b.y0) + 3, last.rev);
    }
  }
  // north point, scale bar, view title
  const nx = 290, ny = 40;
  g += `<g transform="rotate(${-(P.site?.north || 0)} ${nx} ${ny})">` + poly([[nx, ny - 7], [nx - 3, ny + 3], [nx, ny + 1], [nx + 3, ny + 3]], INK) + txt(nx, ny - 8.5, "N", { size: 3, anchor: "middle", weight: 700 }) + "</g>";
  for (let i = 0; i < 5; i++) g += `<rect x="${X0 + i * 10}" y="270" width="10" height="1.6" fill="${i % 2 ? "#fff" : INK}" stroke="${INK}" stroke-width="${HAIR}"/>` + txt(X0 + i * 10, 275, `${i}`, { size: 1.8, mono: 1, anchor: "middle" });
  g += txt(X0 + 50, 275, "5 m", { size: 1.8, mono: 1, anchor: "middle" }) + txt(X0, 285, "Ground floor plan", { size: 4, weight: 600 }) + txt(X0 + 52, 285, "1:100", { size: 2.6, mono: 1, fill: SOFT });
  return frame(P, "A101", "Ground floor plan", "1:100", g, revs);
}

// ------------------------------------------------------------------------------------------------ elevations (1:200, four on one sheet)
export function elevationsSheet(P) {
  const sc = 200, faces = { N: null, E: null, S: null, W: null }, ext = P.walls.filter((w) => w.kind === "ext");
  const slots = { N: [22, 125], S: [170, 125], E: [22, 250], W: [170, 250] };
  let g = "";
  const R = P.roof || {}, ridgeAlongY = R.ridge === "y", bx = polyBox(P.rooms.flatMap((r) => r.poly));
  for (const face of Object.keys(faces)) {
    const walls = ext.filter((w) => wallFacing(P, w).face === face); if (!walls.length) continue;
    const out = wallFacing(P, walls[0]).out, right = [-out[1], out[0]], u = (p) => p[0] * right[0] + p[1] * right[1];
    const us = walls.flatMap((w) => [u(w.a), u(w.b)]), u0 = Math.min(...us), u1 = Math.max(...us);
    const [ox, oy] = slots[face], X = (v) => ox + (v - u0) / sc, Y = (z) => oy - z / sc;
    const eaves = R.eaves || Math.max(...walls.map((w) => w.h)), ridge = R.ridgeH || eaves, oh = R.overhang || 0;
    const gable = R.type === "gable" && ((ridgeAlongY && (face === "N" || face === "S")) || (!ridgeAlongY && (face === "E" || face === "W")));
    // ground, walls, roof silhouette
    g += line(X(u0) - 6, Y(0), X(u1) + 6, Y(0), BOLD);
    g += `<rect x="${f1(X(u0))}" y="${f1(Y(eaves))}" width="${f1((u1 - u0) / sc)}" height="${f1(eaves / sc)}" fill="#f3efe9" stroke="${INK}" stroke-width="${MED}"/>`;
    if (gable) g += poly([[X(u0) - oh / sc, Y(eaves - 150)], [X((u0 + u1) / 2), Y(ridge + 120)], [X(u1) + oh / sc, Y(eaves - 150)], [X(u1) + oh / sc, Y(eaves)], [X((u0 + u1) / 2), Y(ridge)], [X(u0) - oh / sc, Y(eaves)]], "#4a4246", INK, HAIR)
      + poly([[X(u0), Y(eaves)], [X((u0 + u1) / 2), Y(ridge)], [X(u1), Y(eaves)]], "#f3efe9", INK, MED);
    else { g += `<rect x="${f1(X(u0) - oh / sc)}" y="${f1(Y(ridge + 120))}" width="${f1((u1 - u0 + 2 * oh) / sc)}" height="${f1((ridge + 120 - eaves) / sc)}" fill="#8b8487" stroke="${INK}" stroke-width="${MED}"/>`;
      for (let v = u0 - oh + 500; v < u1 + oh; v += 500) g += line(X(v), Y(ridge + 120), X(v), Y(eaves), 0.1, "#5d5659"); }
    // cladding hint: vertical board lines on the cladding walls
    for (const w of walls) { if (w.mat === "glass-curtain") continue; const a = u(w.a), b = u(w.b); for (let v = Math.min(a, b); v < Math.max(a, b); v += 600) g += line(X(v), Y(0), X(v), Y(eaves), 0.08, "#b9aeb2"); }
    // openings on this face
    for (const o of P.openings.filter((x) => walls.some((w) => w.id === x.wall))) {
      const s = openingSpan(P, o), a = u(s.a), b = u(s.b), lo = Math.min(a, b), hi = Math.max(a, b);
      const top = o.kind === "glazing" && gable ? null : o.sill + o.h;
      if (o.kind === "glazing" && gable) {   // glazed gable: fill the triangle too, with mullions
        const mid = (u0 + u1) / 2, roofAt = (v) => eaves + (ridge - eaves) * (1 - Math.abs(v - mid) / ((u1 - u0) / 2)) - 250;
        const pts = [[lo, o.sill], [hi, o.sill]]; for (let v = hi; v >= lo; v -= 400) pts.push([v, roofAt(v)]);
        g += poly(pts.map(([v, z]) => [X(v), Y(z)]), "#9fb3bd", INK, MED);
        for (let v = lo + 1200; v < hi; v += 1200) g += line(X(v), Y(o.sill), X(v), Y(roofAt(v)), 0.15, "#3f4c52");
        for (const z of [1200, 2400, 3600, 4800, 6000]) { const xs = pts.filter(([, zz]) => zz > z).map(([v]) => v); if (xs.length > 1) g += line(X(Math.min(...xs)), Y(z), X(Math.max(...xs)), Y(z), 0.12, "#3f4c52"); }
      } else {
        g += `<rect x="${f1(X(lo))}" y="${f1(Y(top))}" width="${f1((hi - lo) / sc)}" height="${f1(o.h / sc)}" fill="${isDoor(o) ? "#c9b6a0" : "#9fb3bd"}" stroke="${INK}" stroke-width="${MED}"/>`;
        if (o.kind === "door-double") g += line(X((lo + hi) / 2), Y(top), X((lo + hi) / 2), Y(o.sill), HAIR);
      }
    }
    // level marks
    for (const [z, lab] of [[0, "±0"], [eaves, `+${eaves}`], ...(gable || R.type !== "flat" ? [[ridge, `+${ridge}`]] : [])]) g += line(X(u1) + oh / sc + 1, Y(z), X(u1) + oh / sc + 5, Y(z), HAIR) + txt(X(u1) + oh / sc + 5.5, Y(z) + 0.7, lab, { size: 1.8, mono: 1 });
    const names = { N: "North", S: "South", E: "East", W: "West" };
    g += txt(ox, oy + 9, `${names[face]} elevation`, { size: 3.2, weight: 600 }) + txt(ox + 38, oy + 9, "1:200", { size: 2.2, mono: 1, fill: SOFT });
    const mats = [...new Set(walls.map((w) => w.mat))].map(matName).join(" · ") + " · " + matName(R.mat);
    g += txt(ox, oy + 13.5, mats, { size: 1.8, fill: SOFT });
  }
  return frame(P, "A201", "Elevations", "1:200", g, P.revisions || []);
}

// ------------------------------------------------------------------------------------------------ section A–A (east–west through the hall)
export function sectionSheet(P, yCut) {
  const sc = 100, bx = polyBox(P.rooms.flatMap((r) => r.poly)), y = yCut ?? (bx.y0 + bx.y1) / 2, X0 = 40, Z0 = 220;
  const X = (x) => X0 + (x - bx.x0) / sc, Y = (z) => Z0 - z / sc, R = P.roof || {}, eaves = R.eaves || 3000, ridge = R.ridgeH || eaves, oh = R.overhang || 0;
  let g = line(X(bx.x0) - 15, Y(0) + (P.slab?.t || 150) / sc, X(bx.x1) + 15, Y(0) + (P.slab?.t || 150) / sc, BOLD);
  g += `<rect x="${f1(X(bx.x0))}" y="${f1(Y(0))}" width="${f1((bx.x1 - bx.x0) / sc)}" height="${f1((P.slab?.t || 150) / sc)}" fill="#9b9497" stroke="${INK}" stroke-width="${MED}"/>`;
  // cut walls (walls crossing the section line)
  for (const w of P.walls) {
    if (w.a[0] !== w.b[0]) continue; const ylo = Math.min(w.a[1], w.b[1]), yhi = Math.max(w.a[1], w.b[1]); if (y < ylo || y > yhi) continue;
    const cut = P.openings.find((o) => o.wall === w.id && (() => { const s = openingSpan(P, o); return y >= Math.min(s.a[1], s.b[1]) && y <= Math.max(s.a[1], s.b[1]); })());
    const h = w.kind === "ext" ? eaves : w.h, x = w.a[0];
    if (cut) { g += `<rect x="${f1(X(x) - w.t / 2 / sc)}" y="${f1(Y(h))}" width="${f1(w.t / sc)}" height="${f1((h - cut.sill - cut.h) / sc)}" fill="#2a2226"/>`; if (cut.sill > 0) g += `<rect x="${f1(X(x) - w.t / 2 / sc)}" y="${f1(Y(cut.sill))}" width="${f1(w.t / sc)}" height="${f1(cut.sill / sc)}" fill="#2a2226"/>`; }
    else g += `<rect x="${f1(X(x) - w.t / 2 / sc)}" y="${f1(Y(h))}" width="${f1(w.t / sc)}" height="${f1(h / sc)}" fill="#2a2226"/>`;
  }
  // roof: gable across the section when the ridge runs north–south
  const mid = (bx.x0 + bx.x1) / 2;
  if (R.type === "gable" && R.ridge === "y") g += poly([[X(bx.x0 - oh), Y(eaves - 120)], [X(mid), Y(ridge + 60)], [X(bx.x1 + oh), Y(eaves - 120)], [X(bx.x1 + oh), Y(eaves + 60)], [X(mid), Y(ridge + 240)], [X(bx.x0 - oh), Y(eaves + 60)]], "#4a4246", INK, MED);
  else g += `<rect x="${f1(X(bx.x0 - oh))}" y="${f1(Y(ridge + 200))}" width="${f1((bx.x1 - bx.x0 + 2 * oh) / sc)}" height="${f1(2)}" fill="#4a4246"/>`;
  // rooms cut, labelled at mid height
  for (const r of P.rooms) { const b = polyBox(r.poly); if (y < b.y0 || y > b.y1) continue; g += txt(X((b.x0 + b.x1) / 2), Y(1500), r.name.toUpperCase(), { size: 2.2, anchor: "middle", weight: 600, fill: SOFT }); }
  for (const [z, lab] of [[0, "FFL ±0"], [eaves, `Eaves +${eaves}`], [ridge, `Ridge +${ridge}`]]) g += line(X(bx.x1) + 6, Y(z), X(bx.x1) + 14, Y(z), HAIR) + txt(X(bx.x1) + 15, Y(z) + 0.7, lab, { size: 2, mono: 1 });
  g += txt(X0, 250, "Section A–A", { size: 4, weight: 600 }) + txt(X0 + 34, 250, `1:100 · cut at y = ${Math.round(y)} mm, looking north`, { size: 2.4, mono: 1, fill: SOFT });
  return frame(P, "A301", "Section A–A", "1:100", g, P.revisions || []);
}

// ------------------------------------------------------------------------------------------------ code pre-check schedule
export function codeSheet(P, results) {
  const mark = { pass: ["Pass", "#2f6b46"], fail: ["Fail", "#B0213A"], info: ["Needs info", "#8a6d1f"], out: ["Out of scope", "#6d5d63"] };
  let g = txt(20, 24, "Building Code pre-check schedule", { size: 5, weight: 600 }) + txt(20, 30, "Advisory. Generated from the model on every change.", { size: 2.4, fill: SOFT });
  const cols = [20, 42, 54, 130, 205, 255];
  g += [["Status", 0], ["Clause", 1], ["Check", 2], ["Measured", 3], ["Limit", 4], ["Source", 5]].map(([t, i]) => txt(cols[i], 40, t, { mono: 1, size: 1.9, fill: SOFT })).join("") + line(20, 42, 300, 42, MED);
  results.slice(0, 30).forEach((r, i) => {
    const y = 47 + i * 7.2, [lab, col] = mark[r.status];
    g += `<rect x="20" y="${y - 3}" width="19" height="4.2" rx="2.1" fill="${col}"/>` + txt(29.5, y - 0.1, lab, { size: 1.8, anchor: "middle", fill: "#fff", weight: 600 })
      + txt(cols[1], y, r.clause, { mono: 1, size: 2.2, weight: 600 }) + txt(cols[2], y, r.title.slice(0, 44), { size: 2.1 })
      + txt(cols[3], y, String(r.measured).slice(0, 44), { size: 1.9, mono: 1 }) + txt(cols[4], y, String(r.limit).slice(0, 30), { size: 1.9, mono: 1 })
      + txt(cols[5], y, (r.doc + (r.verified === false ? " · figure to confirm" : "")).slice(0, 26), { size: 1.7, fill: SOFT }) + line(20, y + 2.6, 300, y + 2.6, HAIR, "#e3dcdf");
  });
  const lines = DISCLAIMER.match(/.{1,110}(\s|$)/g) || [];
  lines.forEach((l, i) => { g += txt(20, 270 + i * 4, l.trim(), { size: 2.2, fill: SOFT }); });
  return frame(P, "A901", "Code pre-check schedule", "—", g, P.revisions || []);
}

export function sheetSet(P, results) {
  return [{ id: "A101", title: "Ground floor plan", svg: planSheet(P) }, { id: "A201", title: "Elevations", svg: elevationsSheet(P) },
    { id: "A301", title: "Section A–A", svg: sectionSheet(P) }, { id: "A901", title: "Code pre-check schedule", svg: codeSheet(P, results) }];
}
