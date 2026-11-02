// Draws the two sample sheets as SVG from trades/js/plans-data.js. Run: node trades/src/build-plans.mjs <outdir>
// Then trades/src/print-plans.py prints each SVG to a one-page A3 PDF in trades/plans/. Fictional plans, drawn by the lab.
import { writeFileSync, mkdirSync } from "node:fs";
import { PLANS } from "../js/plans-data.js";

const out = process.argv[2] || "/tmp/trades-plans"; mkdirSync(out, { recursive: true });
const INK = "#492B3E", MUTED = "#916A70", PALE = "#E8DDE3";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

function sheetSvg(sh) {
  const S = sh.scale, o = sh.origin, P = ([x, y]) => [o.x + x / S, o.y + y / S], m = (mm) => mm / S, D = m(810), W = m(750);
  const pts = (poly) => poly.map(P).map((p) => p.join(",")).join(" ");
  const g = [];
  // frame and grid
  g.push(`<rect x="10" y="10" width="400" height="277" fill="none" stroke="${INK}" stroke-width="0.5"/>`);
  for (let x = 20; x < 400; x += 10) g.push(`<line x1="${x}" y1="10" x2="${x}" y2="12" stroke="${MUTED}" stroke-width="0.2"/>`);
  // rooms
  const fills = { carpet: "#EFE9F8", tiles: "#E6F0FA", vinyl: "#FBF5DA", decking: "#FBE9DD", pergola: "none" };
  for (const r of sh.rooms) {
    const c = r.poly.reduce((a, p) => [a[0] + p[0] / r.poly.length, a[1] + p[1] / r.poly.length], [0, 0]), [cx, cy] = P(c);
    const w = Math.max(...r.poly.map((p) => p[0])) - Math.min(...r.poly.map((p) => p[0])), h = Math.max(...r.poly.map((p) => p[1])) - Math.min(...r.poly.map((p) => p[1]));
    g.push(`<polygon points="${pts(r.poly)}" fill="${fills[r.finish] || "none"}" stroke="${r.finish === "pergola" ? MUTED : "none"}" stroke-width="${r.finish === "pergola" ? 0.6 : 0}" stroke-dasharray="${r.finish === "pergola" ? "3 1.5" : "none"}"/>`);
    const small = w / S < 22 || h / S < 16;
    g.push(`<text x="${cx}" y="${cy - (small ? 0 : 1.2)}" font-size="${small ? 2.6 : 3.6}" fill="${INK}" text-anchor="middle" font-weight="600">${esc(r.name.toUpperCase())}</text>`);
    if (!small) g.push(`<text x="${cx}" y="${cy + 3}" font-size="2.4" fill="${MUTED}" text-anchor="middle">${(w / 1000).toFixed(1)} × ${(h / 1000).toFixed(1)} · ${esc(r.finish)}</text>`);
  }
  if (sh.walls) {
    g.push(`<polygon points="${pts([[0, 0], [sh.extent.w, 0], [sh.extent.w, sh.extent.h], [0, sh.extent.h]])}" fill="none" stroke="${INK}" stroke-width="${m(90) + 0.6}"/>`);
    for (const [a, b] of sh.walls) g.push(`<line x1="${P(a)[0]}" y1="${P(a)[1]}" x2="${P(b)[0]}" y2="${P(b)[1]}" stroke="${INK}" stroke-width="1.1"/>`);
    for (const d of sh.doors) { const [x, y] = P(d); const horiz = d[1] % 1000 === 0 && (d[1] === 5000 || d[1] === 6200); // doors in horizontal walls swing down/up
      const h = D / 2, sw = d[1] === 5000 ? -D : D;
      g.push(horiz ? `<rect x="${x - h}" y="${y - 1}" width="${D}" height="2" fill="#fff" stroke="none"/><path d="M${x - h} ${y} a${D} ${D} 0 0 ${sw < 0 ? 1 : 0} ${D} ${sw}" fill="none" stroke="${MUTED}" stroke-width="0.35"/><line x1="${x - h}" y1="${y}" x2="${x - h}" y2="${y + sw}" stroke="${INK}" stroke-width="0.7"/>`
        : `<rect x="${x - 1}" y="${y - h}" width="2" height="${D}" fill="#fff" stroke="none"/><path d="M${x} ${y - h} a${D} ${D} 0 0 1 ${D} ${D}" fill="none" stroke="${MUTED}" stroke-width="0.35"/><line x1="${x}" y1="${y - h}" x2="${x + D}" y2="${y - h}" stroke="${INK}" stroke-width="0.7"/>`); }
    for (const w of sh.windows) { const [x, y] = P(w); const vert = w[0] === 0 || w[0] === sh.extent.w;
      g.push(vert ? `<rect x="${x - 1.2}" y="${y - W}" width="2.4" height="${2 * W}" fill="#fff" stroke="${INK}" stroke-width="0.4"/><line x1="${x}" y1="${y - W}" x2="${x}" y2="${y + W}" stroke="${INK}" stroke-width="0.3"/>`
        : `<rect x="${x - W}" y="${y - 1.2}" width="${2 * W}" height="2.4" fill="#fff" stroke="${INK}" stroke-width="0.4"/><line x1="${x - W}" y1="${y}" x2="${x + W}" y2="${y}" stroke="${INK}" stroke-width="0.3"/>`); }
    for (const f of sh.fixtures) { const [x, y] = P(f.at);
      const k = 100 / S;
      g.push(f.k === "wc" ? `<ellipse cx="${x}" cy="${y + 1.5 * k}" rx="${1.9 * k}" ry="${2.6 * k}" fill="none" stroke="${MUTED}" stroke-width="0.35"/><rect x="${x - 2.3 * k}" y="${y - 2.4 * k}" width="${4.6 * k}" height="${2 * k}" fill="none" stroke="${MUTED}" stroke-width="0.35"/>`
        : f.k === "shower" ? `<rect x="${x - 4.5 * k}" y="${y - 4.5 * k}" width="${9 * k}" height="${9 * k}" fill="none" stroke="${MUTED}" stroke-width="0.35"/><line x1="${x - 4.5 * k}" y1="${y - 4.5 * k}" x2="${x + 4.5 * k}" y2="${y + 4.5 * k}" stroke="${MUTED}" stroke-width="0.25"/><line x1="${x + 4.5 * k}" y1="${y - 4.5 * k}" x2="${x - 4.5 * k}" y2="${y + 4.5 * k}" stroke="${MUTED}" stroke-width="0.25"/>`
        : f.k === "bath" ? `<rect x="${x - 3.7 * k}" y="${y - 4.5 * k}" width="${7.4 * k}" height="${17 * k}" rx="${1.5 * k}" fill="none" stroke="${MUTED}" stroke-width="0.35"/>`
        : f.k === "tub" ? `<rect x="${x - 3 * k}" y="${y - 3 * k}" width="${6 * k}" height="${6 * k}" fill="none" stroke="${MUTED}" stroke-width="0.35"/><circle cx="${x}" cy="${y}" r="${1.2 * k}" fill="none" stroke="${MUTED}" stroke-width="0.3"/>`
        : `<rect x="${x - 2.5 * k}" y="${y - 2 * k}" width="${5 * k}" height="${4 * k}" rx="${k}" fill="none" stroke="${MUTED}" stroke-width="0.35"/>`); }
  }
  if (sh.joists) {
    g.push(`<polygon points="${pts(sh.rooms[0].poly)}" fill="none" stroke="${INK}" stroke-width="1.2"/>`);
    for (const [a, b] of sh.joists) g.push(`<line x1="${P(a)[0]}" y1="${P(a)[1]}" x2="${P(b)[0]}" y2="${P(b)[1]}" stroke="${MUTED}" stroke-width="0.9" stroke-dasharray="2 1"/>`);
    for (const [a, b] of sh.bearers) g.push(`<line x1="${P(a)[0]}" y1="${P(a)[1]}" x2="${P(b)[0]}" y2="${P(b)[1]}" stroke="${INK}" stroke-width="1.6"/>`);
    for (const p of sh.posts) { const [x, y] = P(p); g.push(`<rect x="${x - m(62.5)}" y="${y - m(62.5)}" width="${m(125)}" height="${m(125)}" fill="${INK}"/>`); }
    for (const [a, b] of sh.beams) g.push(`<line x1="${P(a)[0]}" y1="${P(a)[1]}" x2="${P(b)[0]}" y2="${P(b)[1]}" stroke="#7A4F6B" stroke-width="2"/>`);
    for (const [a, b] of sh.rafters) g.push(`<line x1="${P(a)[0]}" y1="${P(a)[1]}" x2="${P(b)[0]}" y2="${P(b)[1]}" stroke="#7A4F6B" stroke-width="0.8"/>`);
    for (const p of sh.pergolaPosts) { const [x, y] = P(p); g.push(`<rect x="${x - m(62.5)}" y="${y - m(62.5)}" width="${m(125)}" height="${m(125)}" fill="#fff" stroke="#7A4F6B" stroke-width="0.8"/>`); }
    for (const [a, b] of sh.handrail) g.push(`<line x1="${P(a)[0]}" y1="${P(a)[1]}" x2="${P(b)[0]}" y2="${P(b)[1]}" stroke="${INK}" stroke-width="0.5" stroke-dasharray="0.8 0.8" transform="translate(${a[0] === 0 && b[0] === 0 ? -3 : a[0] === 6000 ? 3 : 0} ${a[1] === 0 && b[1] === 0 ? -3 : 0})"/>`);
    g.push(`<polygon points="${pts(sh.steps)}" fill="none" stroke="${INK}" stroke-width="0.6"/>`);
    for (let i = 1; i < 3; i++) { const y = P([0, 4000 + i * 300])[1]; g.push(`<line x1="${P([2400, 0])[0]}" y1="${y}" x2="${P([3600, 0])[0]}" y2="${y}" stroke="${INK}" stroke-width="0.4"/>`); }
    // legend
    const lx = 300, ly = 70;
    const legend = [["Joists 140×45 H3.2 at 450 crs", MUTED, "2 1", 0.9], ["Bearers 190×45 H3.2 at 1 800 crs", INK, "none", 1.6], ["Posts 125×125 H5 on footings", INK, "none", 2.5], ["Pergola beams 190×45, rafters 140×45", "#7A4F6B", "none", 1.2], ["Handrail and balustrade, 1.0 m", INK, "0.8 0.8", 0.5]];
    legend.forEach(([t, c, d, w], i) => g.push(`<line x1="${lx}" y1="${ly + i * 7}" x2="${lx + 14}" y2="${ly + i * 7}" stroke="${c}" stroke-width="${w}" stroke-dasharray="${d}"/><text x="${lx + 18}" y="${ly + i * 7 + 1}" font-size="2.6" fill="${INK}">${esc(t)}</text>`));
    g.push(`<text x="${lx}" y="${ly - 6}" font-size="3" fill="${INK}" font-weight="600">FRAMING LEGEND</text><text x="${lx}" y="${ly + 40}" font-size="2.3" fill="${MUTED}">Sizes are NZS 3604 names used as labels. Not for construction.</text>`);
  }
  // dimension line
  const d = sh.dimension, [ax, ay] = P(d.a), [bx, by] = P(d.b);
  g.push(`<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${INK}" stroke-width="0.35"/><line x1="${ax}" y1="${ay - 2}" x2="${ax}" y2="${ay + 2}" stroke="${INK}" stroke-width="0.35"/><line x1="${bx}" y1="${by - 2}" x2="${bx}" y2="${by + 2}" stroke="${INK}" stroke-width="0.35"/>`);
  g.push(`<line x1="${ax}" y1="${ay}" x2="${ax}" y2="${P([0, 0])[1]}" stroke="${MUTED}" stroke-width="0.2"/><line x1="${bx}" y1="${by}" x2="${bx}" y2="${P([0, 0])[1]}" stroke="${MUTED}" stroke-width="0.2"/>`);
  g.push(`<text x="${(ax + bx) / 2}" y="${ay - 1.5}" font-size="3.2" fill="${INK}" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, monospace">${d.label}</text>`);
  // north arrow and title block
  g.push(`<g transform="translate(395 30)"><circle r="6" fill="none" stroke="${INK}" stroke-width="0.4"/><path d="M0 -5 L2.5 3 L0 1.5 L-2.5 3Z" fill="${INK}"/><text y="11" font-size="2.6" text-anchor="middle" fill="${INK}">N</text></g>`);
  g.push(`<rect x="300" y="232" width="110" height="55" fill="#fff" stroke="${INK}" stroke-width="0.5"/>`);
  sh.title_block.forEach((t, i) => g.push(`<text x="306" y="${243 + i * 11}" font-size="${i === 0 ? 4.2 : i === 1 ? 3.4 : 2.8}" fill="${i >= 2 ? MUTED : INK}" font-weight="${i === 0 ? 700 : 400}" ${i === 2 ? 'font-family="IBM Plex Mono, ui-monospace, monospace"' : ""}>${esc(t)}</text>`));
  g.push(`<rect x="300" y="232" width="110" height="3" fill="${PALE}"/>`);
  g.push(`<text x="14" y="284" font-size="2.4" fill="${MUTED}">assembl lab · trades twin · Simulated · fictional plan and rates · not for construction</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297" font-family="Instrument Sans, Helvetica, Arial, sans-serif"><rect width="420" height="297" fill="#fff"/>${g.join("")}</svg>`;
}

for (const sh of PLANS.sheets) { const f = `${out}/${sh.id.toLowerCase()}.svg`; writeFileSync(f, sheetSvg(sh)); console.log("wrote", f); }
