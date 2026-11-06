// assembl Plan Studio · working drawings. Pure functions: project model in, SVG sheets out (A3 landscape, millimetres on paper),
// so the same code renders on the page, prints to PDF, and runs in tests. Every sheet carries the MBIE minimum title-block
// fields (drawing number and title, designer, owner, address, scale, version date) and a revision table; anything changed since
// the previous revision is clouded and tagged with the revision letter.
import { polyArea, polyBox, openingSpan, isDoor, wallFacing, diffModels, revLetter, wallById, roofZ, footprint, isGlazed, pointInPoly } from "./model.js";
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
  const sc = 100, all = [...P.rooms.flatMap((r) => r.poly), ...P.walls.flatMap((w) => [w.a, w.b]), ...(P.decks || []).flatMap((d) => d.poly)], ex = polyBox(all);
  const X0 = 20 + (285 - (ex.x1 - ex.x0) / sc) / 2 - ex.x0 / sc + 8, Y0 = 268 - (240 - (ex.y1 - ex.y0) / sc) / 2 + ex.y0 / sc, toX = (x) => X0 + x / sc, toY = (y) => Y0 - y / sc;   // centred on the sheet
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
  const te = Math.max(...P.walls.filter((w) => w.kind === "ext").map((w) => w.t), 0) / 2;
  g += dimH(gx, toY(bx.y1) - 8) + dimH([gx[0] - te, gx[gx.length - 1] + te], toY(bx.y1) - 4) + dimV(gy, toX(bx.x0) - 8) + dimV([gy[0] - te, gy[gy.length - 1] + te], toX(bx.x0) - 4);
  // decks: timber boards (light), their edge, and the barrier height
  for (const dk of P.decks || []) {
    const pts = dk.poly.map((p) => [toX(p[0]), toY(p[1])]), cid = "dk-" + dk.id; g += `<clipPath id="${cid}">${poly(pts, "#000")}</clipPath>` + poly(pts, "#f1e9df", INK, HAIR);
    const b = polyBox(dk.poly); g += `<g clip-path="url(#${cid})">`; for (let yy = b.y0 + 140; yy < b.y1; yy += 140) g += line(toX(b.x0), toY(yy), toX(b.x1), toY(yy), 0.06, "#c8b8a6"); g += "</g>";
    const lab = [b.x0 + 900, b.y0 + 900];
    g += txt(toX(lab[0]), toY(lab[1]), `${(dk.name || "DECK").toUpperCase()}`, { size: 2, anchor: "middle", weight: 600, fill: SOFT }) + (dk.barrier ? txt(toX(lab[0]), toY(lab[1]) + 3, `barrier ${dk.barrier}`, { size: 1.7, anchor: "middle", mono: 1, fill: SOFT }) : "");
  }
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

// ------------------------------------------------------------------------------------------------ elevations (four on one sheet)
// Any roof: the wall top follows roofZ along the face, the roof silhouette is the highest roofZ across the building's depth.
export function elevationsSheet(P) {
  const fp = footprint(P), ext = P.walls.filter((w) => w.kind === "ext");
  const R = P.roof || {}, oh = R.overhang || 0, fag = P.site?.floorAboveGround || 0, th = 250, N = 40;
  // first pass: what each face needs on paper (walls, roof overhang, decks seen from that side, the roof's highest point)
  const faces = {};
  for (const face of ["N", "S", "E", "W"]) {
    const walls = ext.filter((w) => wallFacing(P, w).face === face); if (!walls.length) continue;
    const out = wallFacing(P, walls[0]).out, right = [-out[1], out[0]], u = (p) => p[0] * right[0] + p[1] * right[1], v = (p) => p[0] * out[0] + p[1] * out[1];
    const us = walls.flatMap((w) => [u(w.a), u(w.b)]), u0 = Math.min(...us), u1 = Math.max(...us), c = v(walls[0].a);
    const corners = [[fp.x0, fp.y0], [fp.x1, fp.y1], [fp.x0, fp.y1], [fp.x1, fp.y0]], vs = corners.map(v), vmin = Math.min(...vs), vmax = Math.max(...vs);
    const pt = (uu, vv) => [right[0] * uu + out[0] * vv, right[1] * uu + out[1] * vv];
    const topW = (uu) => roofZ(P, ...pt(Math.max(u0, Math.min(u1, uu)), c)), topR = (uu) => { let m = -1e9; for (let k = 0; k <= 16; k++) m = Math.max(m, roofZ(P, ...pt(Math.max(u0, Math.min(u1, uu)), vmin + ((vmax - vmin) * k) / 16))); return m; };
    const U = (k, a = u0, b = u1) => a + ((b - a) * k) / N, hiZ = Math.max(...Array.from({ length: N + 1 }, (_, k) => topR(U(k))));
    const du = (P.decks || []).flatMap((dk) => dk.poly.map(u)), umin = Math.min(u0 - oh, ...du), umax = Math.max(u1 + oh, ...du);
    faces[face] = { walls, u, u0, u1, topW, topR, U, hiZ, umin, umax };
  }
  // pick the largest standard scale at which every face, its level marks and its title fit a quarter of the drawing area
  const F = Object.values(faces), wMax = Math.max(...F.map((f) => f.umax - f.umin)), zTop = Math.max(...F.map((f) => f.hiZ)) + th, zBot = -Math.max(fag, 0);
  const sc = [50, 100, 200, 250, 500].find((s) => wMax / s + 26 <= 142 && (zTop - zBot) / s + 22 <= 128) || 500;
  const blockH = (zTop - zBot) / sc + 22, pad = Math.max(0, (136 - blockH) / 2), colX = [16, 162], rowTop = [14 + pad, 150 + pad], slot = { N: [0, 0], S: [1, 0], E: [0, 1], W: [1, 1] };
  let g = "";
  for (const face of ["N", "S", "E", "W"]) {
    if (!faces[face]) continue;
    const { walls, u, u0, u1, topW, topR, U, umin } = faces[face];
    const ox = colX[slot[face][0]], oy = rowTop[slot[face][1]] + 6 + zTop / sc, X = (vv) => ox + (vv - umin) / sc, Y = (z) => oy - z / sc;
    // ground under a raised floor, piles, the floor line
    g += line(X(umin) - 4, Y(-fag), X(faces[face].umax) + 4, Y(-fag), BOLD);
    if (fag > 300) { for (let vv = u0 + 300; vv <= u1; vv += 1800) g += line(X(vv), Y(-150), X(vv), Y(-fag), MED, "#6d5d63"); g += line(X(u0), Y(-150), X(u1), Y(-150), MED); }
    // wall face up to the roof line along this face
    const wallPts = [[X(u0), Y(0)], [X(u1), Y(0)]]; for (let k = N; k >= 0; k--) wallPts.push([X(U(k)), Y(topW(U(k)))]);
    const curtain = walls.every((w) => w.mat === "glass-curtain");
    g += poly(wallPts, curtain ? "#9fb3bd" : "#f3efe9", INK, MED);
    if (!curtain) for (const w of walls) { const a = u(w.a), b = u(w.b); for (let vv = Math.min(a, b) + 300; vv < Math.max(a, b); vv += 300) g += line(X(vv), Y(0), X(vv), Y(topW(vv)), 0.07, "#c4b9bd"); }
    // roof: from the wall top (and the eaves overhang) up to the silhouette
    const rp = []; for (let k = 0; k <= N; k++) { const uu = U(k, u0 - oh, u1 + oh); rp.push([X(uu), Y(Math.max(topR(uu), topW(uu)) + th)]); }
    for (let k = N; k >= 0; k--) { const uu = U(k, u0 - oh, u1 + oh); rp.push([X(uu), Y(Math.min(topW(uu), topR(uu)) - 40)]); }
    g += poly(rp, "#5d5659", INK, HAIR);
    // openings
    for (const o of P.openings.filter((x) => walls.some((w) => w.id === x.wall))) {
      const s = openingSpan(P, o), a = u(s.a), b = u(s.b), lo = Math.min(a, b), hi = Math.max(a, b);
      if (o.kind === "glazing") {
        const pts = [[lo, o.sill], [hi, o.sill]]; for (let k = N; k >= 0; k--) { const uu = lo + ((hi - lo) * k) / N; pts.push([uu, Math.min(o.sill + o.h, topW(uu) - 250) > o.sill + o.h - 1 ? topW(uu) - 250 : o.sill + o.h]); }
        g += poly(pts.map(([q, z]) => [X(q), Y(z)]), "#9fb3bd", INK, MED);
        for (let q = lo + 1200; q < hi; q += 1200) g += line(X(q), Y(o.sill), X(q), Y(topW(q) - 250), 0.15, "#3f4c52");
      } else {
        g += `<rect x="${f1(X(lo))}" y="${f1(Y(o.sill + o.h))}" width="${f1((hi - lo) / sc)}" height="${f1(o.h / sc)}" fill="${isDoor(o) && o.mat !== "door-glazed" ? "#c9b6a0" : "#9fb3bd"}" stroke="${INK}" stroke-width="${MED}"/>`;
        if (o.kind === "door-double") g += line(X((lo + hi) / 2), Y(o.sill + o.h), X((lo + hi) / 2), Y(o.sill), HAIR);
      }
    }
    // decks seen from this side: the deck edge and its balustrade
    for (const dk of P.decks || []) {
      const du = dk.poly.map(u), dl = Math.min(...du), dh = Math.max(...du);
      g += `<rect x="${f1(X(dl))}" y="${f1(Y(0))}" width="${f1((dh - dl) / sc)}" height="${f1(200 / sc)}" fill="#a58a6c" stroke="${INK}" stroke-width="${HAIR}"/>`;
      if (dk.barrier) g += `<rect x="${f1(X(dl))}" y="${f1(Y(dk.barrier))}" width="${f1((dh - dl) / sc)}" height="${f1(dk.barrier / sc)}" fill="#cfdde3" fill-opacity=".55" stroke="${INK}" stroke-width="${HAIR}"/>`;
      if (fag > 300) for (let q = dl + 300; q <= dh; q += 1800) g += line(X(q), Y(-200), X(q), Y(-fag), MED, "#6d5d63");
    }
    const hiZ = faces[face].hiZ, loZ = Math.min(...Array.from({ length: N + 1 }, (_, k) => topW(U(k))));
    const marks = [[0, "FFL ±0"], [loZ, `+${Math.round(loZ)}`], ...(hiZ - loZ > 50 ? [[hiZ, `+${Math.round(hiZ)}`]] : []), ...(fag > 300 ? [[-fag, `ground −${fag}`]] : [])];
    const mx = X(faces[face].umax); for (const [z, lab] of marks) g += line(mx + 1, Y(z), mx + 5, Y(z), HAIR) + txt(mx + 5.5, Y(z) + 0.7, lab, { size: 1.8, mono: 1 });
    const names = { N: "North", S: "South", E: "East", W: "West" };
    g += txt(ox, oy + fag / sc + 9, `${names[face]} elevation`, { size: 3.2, weight: 600 }) + txt(ox + 38, oy + fag / sc + 9, `1:${sc}`, { size: 2.2, mono: 1, fill: SOFT });
    g += txt(ox, oy + fag / sc + 13.5, [...new Set(walls.map((w) => w.mat))].map(matName).join(" · ") + " · " + matName(R.mat), { size: 1.8, fill: SOFT });
  }
  return frame(P, "A201", "Elevations", `1:${sc}`, g, P.revisions || []);
}

// ------------------------------------------------------------------------------------------------ section A–A
// Cut across the roof's fall so the section shows its profile: a roof that rises along y (mono to the north or south, or a gable
// whose ridge runs east–west) is cut north–south; anything else east–west. The largest standard scale that fits is used.
export function sectionSheet(P, cutAt) {
  const R = P.roof || {}, bx = footprint(P), oh = R.overhang || 0, slabT = P.slab?.t || 150, fag = P.site?.floorAboveGround || 0;
  const alongY = (R.type === "mono" && (R.low === "n" || R.low === "s")) || (R.type === "gable" && R.ridge !== "y");
  // s runs along the cut, c is the fixed coordinate of the cut line
  const [s0, s1, c0, c1] = alongY ? [bx.y0, bx.y1, bx.x0, bx.x1] : [bx.x0, bx.x1, bx.y0, bx.y1], c = cutAt ?? (c0 + c1) / 2;
  const XY = (sv) => (alongY ? [c, sv] : [sv, c]), rz = (sv) => roofZ(P, ...XY(Math.max(s0, Math.min(s1, sv))));
  let zTop = 0; for (let k = 0; k <= 24; k++) zTop = Math.max(zTop, rz(s0 + ((s1 - s0) * k) / 24)); zTop += 250;
  // decks the cut passes through (their extent along the cut counts toward the drawing's width)
  const deckSpans = (P.decks || []).map((dk) => { const pts = []; for (let k = 0; k <= 200; k++) { const sv = s0 - 8000 + ((s1 - s0 + 16000) * k) / 200; if (pointInPoly(XY(sv), dk.poly)) pts.push(sv); } return pts.length ? { dk, dl: Math.min(...pts), dh: Math.max(...pts) } : null; }).filter(Boolean);
  const sMin = Math.min(s0 - oh, ...deckSpans.map((d) => d.dl)), sMax = Math.max(s1 + oh, ...deckSpans.map((d) => d.dh));
  const W = sMax - sMin, H = zTop + Math.max(fag, slabT);
  const sc = [50, 100, 200, 500].find((v) => W / v + 32 <= 287 && H / v + 30 <= 250) || 500;
  const X0 = 16 + (289 - (W / sc + 32)) / 2 + (s0 - sMin) / sc, Z0 = 16 + (271 - (H / sc + 30)) / 2 + zTop / sc;
  const X = (sv) => X0 + (sv - s0) / sc, Y = (z) => Z0 - z / sc, pos = (p) => (alongY ? p[1] : p[0]), across = (p) => (alongY ? p[0] : p[1]);
  let g = fag > 300 ? "" : line(X(s0 - oh) - 4, Y(0) + slabT / sc, X(s1 + oh) + 2, Y(0) + slabT / sc, BOLD);
  g += `<rect x="${f1(X(s0))}" y="${f1(Y(0))}" width="${f1((s1 - s0) / sc)}" height="${f1(slabT / sc)}" fill="#9b9497" stroke="${INK}" stroke-width="${MED}"/>`;
  // walls the cut line crosses: walls that run across the cut direction
  for (const w of P.walls) {
    if (pos(w.a) !== pos(w.b)) continue; const lo = Math.min(across(w.a), across(w.b)), hi = Math.max(across(w.a), across(w.b)); if (c < lo || c > hi) continue;
    const cut = P.openings.find((o) => o.wall === w.id && (() => { const sp = openingSpan(P, o); return c >= Math.min(across(sp.a), across(sp.b)) && c <= Math.max(across(sp.a), across(sp.b)); })());
    const sv = pos(w.a), h = w.kind === "ext" ? rz(sv) : w.h, x = X(sv) - w.t / 2 / sc, wd = f1(w.t / sc);
    if (cut) { g += `<rect x="${f1(x)}" y="${f1(Y(h))}" width="${wd}" height="${f1((h - cut.sill - cut.h) / sc)}" fill="#2a2226"/>`; if (cut.sill > 0) g += `<rect x="${f1(x)}" y="${f1(Y(cut.sill))}" width="${wd}" height="${f1(cut.sill / sc)}" fill="#2a2226"/>`;
      if (isGlazed(cut)) g += `<rect x="${f1(x + w.t / 4 / sc)}" y="${f1(Y(cut.sill + cut.h))}" width="${f1(w.t / 2 / sc)}" height="${f1(cut.h / sc)}" fill="#9fb3bd" stroke="${INK}" stroke-width="${HAIR}"/>`; }
    else g += `<rect x="${f1(x)}" y="${f1(Y(h))}" width="${wd}" height="${f1(h / sc)}" fill="#2a2226"/>`;
  }
  // the roof along the cut, any shape, with its overhang continuing the pitch
  const rp = [], N = 48, a0 = s0 - oh, a1 = s1 + oh, slope = (rz(s0 + 10) - rz(s0)) / 10, slope1 = (rz(s1) - rz(s1 - 10)) / 10;
  const rr = (sv) => (sv < s0 ? rz(s0) - (s0 - sv) * slope : sv > s1 ? rz(s1) + (sv - s1) * slope1 : rz(sv));
  for (let k = 0; k <= N; k++) { const sv = a0 + ((a1 - a0) * k) / N; rp.push([X(sv), Y(rr(sv) + 250)]); }
  for (let k = N; k >= 0; k--) { const sv = a0 + ((a1 - a0) * k) / N; rp.push([X(sv), Y(rr(sv))]); }
  g += poly(rp, "#4a4246", INK, MED);
  // decks the cut passes through, the ground and piles under a raised floor
  for (const { dk, dl, dh } of deckSpans) {
    g += `<rect x="${f1(X(dl))}" y="${f1(Y(0))}" width="${f1((dh - dl) / sc)}" height="${f1(200 / sc)}" fill="#a58a6c" stroke="${INK}" stroke-width="${HAIR}"/>`;
    if (dk.barrier) for (const e of [dl, dh]) if (e < s0 - 1 || e > s1 + 1) g += line(X(e), Y(0), X(e), Y(dk.barrier), MED, "#3f4c52");
    if (fag > 300) for (let sv = dl + 300; sv <= dh; sv += 1800) if (sv < s0 || sv > s1) g += line(X(sv), Y(-200), X(sv), Y(-fag), MED, "#6d5d63");
  }
  if (fag > 300) { g += line(X(sMin) - 4, Y(-fag), X(sMax) + 2, Y(-fag), BOLD); for (let sv = s0 + 300; sv <= s1; sv += 1800) g += line(X(sv), Y(-slabT), X(sv), Y(-fag), MED, "#6d5d63"); }
  // rooms cut, labelled at mid height
  for (const r of P.rooms) { if (!pointInPoly(XY((Math.max(s0, polyBox(r.poly)[alongY ? "y0" : "x0"]) + Math.min(s1, polyBox(r.poly)[alongY ? "y1" : "x1"])) / 2), r.poly)) continue; const b = polyBox(r.poly), m = alongY ? (b.y0 + b.y1) / 2 : (b.x0 + b.x1) / 2; g += txt(X(m), Y(1500), r.name.toUpperCase(), { size: 2.2, anchor: "middle", weight: 600, fill: SOFT }); }
  const zs = [...new Set([0, Math.round(rz(s0)), Math.round(rz(s1)), Math.round(rz((s0 + s1) / 2)), ...(fag > 300 ? [-fag] : [])])];
  for (const z of zs) g += line(X(sMax) + 4, Y(z), X(sMax) + 12, Y(z), HAIR) + txt(X(sMax) + 13, Y(z) + 0.7, z > 0 ? `+${z}` : z < 0 ? `ground −${-z}` : "FFL ±0", { size: 2, mono: 1 });
  const ty = Y(-Math.max(fag, slabT)) + 12, dir = alongY ? `cut at x = ${Math.round(c)} mm, looking east` : `cut at y = ${Math.round(c)} mm, looking north`;
  g += txt(X(sMin), ty, "Section A–A", { size: 4, weight: 600 }) + txt(X(sMin) + 34, ty, `1:${sc} · ${dir}`, { size: 2.4, mono: 1, fill: SOFT });
  return frame(P, "A301", "Section A–A", `1:${sc}`, g, P.revisions || []);
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
