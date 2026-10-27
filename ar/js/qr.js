// assembl AR: QR codes that look like assembl and still scan.
// Error correction H (30%) leaves room for a centre mark; a four-module quiet zone; dark modules on paper, never
// inverted. Styles: assembly (rounded tiles with small gaps), dots, glass (deep plum to muted plum) and square.
// Every style is checked with OpenCV's QRCodeDetector at about 160 px in tools/test_ar.py.
import qrcode from '../vendor/qrcode/qrcode.module.js';
import { PAL } from './palette.js';
import { loadFont, svgText } from './fonts.js';
import { esc } from './ui.js';

export const STYLES = [
  { id: 'assembly', name: 'Assembly' }, { id: 'dots', name: 'Dots' }, { id: 'glass', name: 'Glass' }, { id: 'square', name: 'Square' }
];

export function qrMatrix(text, ecl = 'H') {
  const q = qrcode(0, ecl);
  q.addData(text, 'Byte');
  q.make();
  const n = q.getModuleCount();
  return { n, version: (n - 17) / 4, ecl, dark: (r, c) => q.isDark(r, c) };
}

// H with a centre mark while the code stays small enough to scan easily, then plainer fallbacks for long links.
export function planQR(text) {
  for (const [ecl, maxVersion, centre] of [['H', 22, true], ['Q', 27, false], ['M', 31, false], ['L', 35, false]]) {
    try { const m = qrMatrix(text, ecl); if (m.version <= maxVersion) return { ...m, centre }; } catch (e) { /* too long at this level */ }
  }
  return null;
}
export function density(m) {
  if (!m) return { level: 'too-big', text: 'Too long for a code a phone can read reliably.' };
  if (m.version <= 10) return { level: 'easy', text: `Scans easily · ${m.n} × ${m.n} modules` };
  if (m.version <= 20) return { level: 'good', text: `Scans well at 4 cm or larger · ${m.n} × ${m.n} modules` };
  return { level: 'dense', text: `Dense: print it 6 cm or larger · ${m.n} × ${m.n} modules` };
}

const r2 = v => Math.round(v * 1000) / 1000;
function rrect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  if (r <= 0) return `M${r2(x)} ${r2(y)}h${r2(w)}v${r2(h)}h${r2(-w)}z`;
  return `M${r2(x + r)} ${r2(y)}h${r2(w - 2 * r)}a${r2(r)} ${r2(r)} 0 0 1 ${r2(r)} ${r2(r)}v${r2(h - 2 * r)}a${r2(r)} ${r2(r)} 0 0 1 ${r2(-r)} ${r2(r)}h${r2(-(w - 2 * r))}a${r2(r)} ${r2(r)} 0 0 1 ${r2(-r)} ${r2(-r)}v${r2(-(h - 2 * r))}a${r2(r)} ${r2(r)} 0 0 1 ${r2(r)} ${r2(-r)}z`;
}
// counter-clockwise rounded rect, for holes with the nonzero fill rule
function rrectCCW(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  return `M${r2(x + r)} ${r2(y)}a${r2(r)} ${r2(r)} 0 0 0 ${r2(-r)} ${r2(r)}v${r2(h - 2 * r)}a${r2(r)} ${r2(r)} 0 0 0 ${r2(r)} ${r2(r)}h${r2(w - 2 * r)}a${r2(r)} ${r2(r)} 0 0 0 ${r2(r)} ${r2(-r)}v${r2(-(h - 2 * r))}a${r2(r)} ${r2(r)} 0 0 0 ${r2(-r)} ${r2(-r)}z`;
}
// a unit square with its own radius per corner (top-left, top-right, bottom-right, bottom-left), grown slightly
// into neighbouring modules (g) so joined modules don't show hairline seams
function cornerRect(x, y, tl, tr, br, bl, g) {
  const x0 = x - g[3], y0 = y - g[0], x1 = x + 1 + g[1], y1 = y + 1 + g[2];
  let p = `M${r2(x0 + tl)} ${r2(y0)}H${r2(x1 - tr)}`;
  if (tr) p += `A${tr} ${tr} 0 0 1 ${r2(x1)} ${r2(y0 + tr)}`;
  p += `V${r2(y1 - br)}`;
  if (br) p += `A${br} ${br} 0 0 1 ${r2(x1 - br)} ${r2(y1)}`;
  p += `H${r2(x0 + bl)}`;
  if (bl) p += `A${bl} ${bl} 0 0 1 ${r2(x0)} ${r2(y1 - bl)}`;
  p += `V${r2(y0 + tl)}`;
  if (tl) p += `A${tl} ${tl} 0 0 1 ${r2(x0 + tl)} ${r2(y0)}`;
  return p + 'z';
}
const circle = (cx, cy, r) => `M${r2(cx - r)} ${r2(cy)}a${r2(r)} ${r2(r)} 0 1 0 ${r2(2 * r)} 0a${r2(r)} ${r2(r)} 0 1 0 ${r2(-2 * r)} 0z`;

// The cube mark: three faces of a cube coming together, in the plum family. Drawn in a 200-unit box.
export const CUBE_PATHS = [
  ['#916A70', 'M93.9 21.7Q100 18.2 106.1 21.7L159.5 52.5Q165.5 56 159.5 59.5L106.1 90.3Q100 93.8 93.9 90.3L40.5 59.5Q34.5 56 40.5 52.5Z'],
  ['#492B3E', 'M29.1 72.2Q29.1 65.2 35.2 68.7L88.6 99.6Q94.7 103.1 94.7 110.1L94.7 171.8Q94.7 178.8 88.6 175.3L35.2 144.4Q29.1 140.9 29.1 133.9Z'],
  ['#654A4E', 'M164.8 68.7Q170.9 65.2 170.9 72.2L170.9 133.9Q170.9 140.9 164.8 144.4L111.4 175.3Q105.3 178.8 105.3 171.8L105.3 110.1Q105.3 103.1 111.4 99.6Z']
];
export const cubeSVG = (x, y, s) => `<g transform="translate(${r2(x)} ${r2(y)}) scale(${r2(s / 200)})">${CUBE_PATHS.map(([c, d]) => `<path fill="${c}" d="${d}"/>`).join('')}</g>`;

let uid = 0;
// Shape settings per style, tuned with OpenCV's QRCodeDetector at 160 px (tools/test_ar.py). Finder patterns keep
// near-square outer corners because decoders find the code's corners from them.
export const STYLE_SHAPES = {
  square: { tile: 'square', fo: 0, fi: 0, fc: 0 },
  // rounded tiles with tiny gaps, like parts laid out to be assembled
  assembly: { tile: 'round', inset: 0.02, r: 0.15, fo: 0.35, fi: 0.25, fc: 0.35 },
  dots: { tile: 'dot', dot: 0.55, fo: 0.35, fi: 0.25, fc: 0.35 },
  // joined modules that flow into each other, in a deep plum to muted plum gradient
  glass: { tile: 'joined', r: 0.3, fo: 0.35, fi: 0.25, fc: 0.35 }
};
// Returns the inner SVG markup of a code drawn at (x, y) with the given width.
// centre: null | {kind:'cube'} | {kind:'image', href}
export function qrMarkup(m, { x = 0, y = 0, size = 300, style = 'assembly', quiet = 4, centre = { kind: 'cube' }, bg = PAL.paper, ink = PAL.plum, shape = null } = {}) {
  const id = 'aq' + (++uid);
  const sh = { ...(STYLE_SHAPES[style] || STYLE_SHAPES.assembly), ...(shape || {}) };
  const N = m.n + quiet * 2, u = size / N;
  const showCentre = centre && m.centre !== false;
  // knock out an odd-sized square in the middle for the mark (about 22% of the width, under 5% of the area)
  let cs = 0, c0 = 0;
  if (showCentre) { cs = Math.round(m.n * 0.22); if (cs % 2 === 0) cs += 1; cs = Math.max(cs, 5); c0 = (m.n - cs) / 2; }
  const inFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= m.n - 7) || (r >= m.n - 7 && c < 7);
  const inCentre = (r, c) => showCentre && r >= c0 && r < c0 + cs && c >= c0 && c < c0 + cs;
  let d = '';
  const X = c => quiet + c, Y = r => quiet + r;
  for (let r = 0; r < m.n; r++) {
    if (sh.tile === 'square') {
      // merge runs along each row
      let c = 0;
      while (c < m.n) {
        if (m.dark(r, c) && !inFinder(r, c) && !inCentre(r, c)) {
          let e = c; while (e + 1 < m.n && m.dark(r, e + 1) && !inFinder(r, e + 1) && !inCentre(r, e + 1)) e++;
          d += `M${X(c)} ${Y(r)}h${e - c + 1}v1h${-(e - c + 1)}z`; c = e + 1;
        } else c++;
      }
      continue;
    }
    for (let c = 0; c < m.n; c++) {
      if (!m.dark(r, c) || inFinder(r, c) || inCentre(r, c)) continue;
      if (sh.tile === 'dot') d += circle(X(c) + 0.5, Y(r) + 0.5, sh.dot);
      else if (sh.tile === 'joined') {
        const D = (rr, cc) => rr >= 0 && cc >= 0 && rr < m.n && cc < m.n && m.dark(rr, cc) && !inFinder(rr, cc) && !inCentre(rr, cc);
        const up = D(r - 1, c), dn = D(r + 1, c), lf = D(r, c - 1), rt = D(r, c + 1), R = sh.r, e = 0.02;
        d += cornerRect(X(c), Y(r), !up && !lf ? R : 0, !up && !rt ? R : 0, !dn && !rt ? R : 0, !dn && !lf ? R : 0, [up ? e : 0, rt ? e : 0, dn ? e : 0, lf ? e : 0]);
      }
      else d += rrect(X(c) + sh.inset, Y(r) + sh.inset, 1 - 2 * sh.inset, 1 - 2 * sh.inset, sh.r);
    }
  }
  // finder patterns: a ring and a centre, softly rounded
  let f = '';
  for (const [fr, fc] of [[0, 0], [0, m.n - 7], [m.n - 7, 0]]) {
    const fx = X(fc), fy = Y(fr);
    if (!sh.fo && !sh.fi && !sh.fc) { f += `M${fx} ${fy}h7v7h-7z` + `M${fx + 1} ${fy + 1}v5h5v-5z` + `M${fx + 2} ${fy + 2}h3v3h-3z`; continue; }
    f += rrect(fx, fy, 7, 7, sh.fo) + rrectCCW(fx + 1, fy + 1, 5, 5, sh.fi);
    f += rrect(fx + 2, fy + 2, 3, 3, sh.fc);
  }
  let defs = '', fill = ink, ffill = ink;
  if (style === 'glass') {
    defs = `<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${PAL.plum}"/><stop offset=".55" stop-color="${PAL.ink}"/><stop offset="1" stop-color="${PAL.muted}"/></linearGradient>`;
    fill = `url(#${id}g)`; ffill = PAL.plum;
  }
  let mid = '';
  if (showCentre) {
    const px = X(c0) + 0.35, py = Y(c0) + 0.35, ps = cs - 0.7;
    mid += `<path fill="${bg}" d="${rrect(px, py, ps, ps, ps * 0.24)}"/>`;
    if (centre.kind === 'image' && centre.href) {
      defs += `<clipPath id="${id}c"><path d="${rrect(px + 0.35, py + 0.35, ps - 0.7, ps - 0.7, ps * 0.2)}"/></clipPath>`;
      mid += `<rect x="${r2(px + 0.35)}" y="${r2(py + 0.35)}" width="${r2(ps - 0.7)}" height="${r2(ps - 0.7)}" rx="${r2(ps * 0.2)}" fill="${PAL.chalk}"/>`;
      mid += `<image href="${esc(centre.href)}" x="${r2(px + 0.35)}" y="${r2(py + 0.35)}" width="${r2(ps - 0.7)}" height="${r2(ps - 0.7)}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${id}c)"/>`;
    } else mid += cubeSVG(px + ps * 0.12, py + ps * 0.12, ps * 0.76);
  }
  return `<g transform="translate(${r2(x)} ${r2(y)}) scale(${u.toFixed(6)})">${defs ? `<defs>${defs}</defs>` : ''}<rect width="${N}" height="${N}" rx="${sh.tile === 'square' ? 0 : 1.2}" fill="${bg}"/><path fill="${fill}" d="${d}"/><path fill="${ffill}" fill-rule="nonzero" d="${f}"/>${mid}</g>`;
}

export function qrSVG(text, opts = {}) {
  const m = opts.matrix || planQR(text);
  if (!m) return null;
  const size = opts.size || 320;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR code">${qrMarkup(m, { ...opts, size })}</svg>`;
}

// ---------------------------------------------------------------- the card
// A downloadable card: rounded, an object thumbnail, the code and a plain instruction. All text is drawn as paths
// from the bundled fonts, so the SVG and PNG look the same everywhere.
export async function cardSVG({ url, title = '', detail = '', kind = '', thumb = null, centreThumb = null, style = 'assembly', centre = 'thumb', host = '' }) {
  const [sans, mono] = await Promise.all([loadFont('medium'), loadFont('mono')]);
  const m = planQR(url);
  if (!m) return null;
  const W = 720, H = 900, P = 48;
  const T = (font, s, o) => { const t = svgText(font, s, o); return t.d ? `<path d="${t.d}" fill="${o.fill}"/>` : ''; };
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc('assembl AR code: ' + title)}">`;
  out += `<defs><clipPath id="cardclip"><rect width="${W}" height="${H}" rx="40"/></clipPath></defs>`;
  out += `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="39" fill="${PAL.paper}" stroke="${PAL.line}" stroke-width="2"/>`;
  out += T(mono, 'assembl ar', { size: 17, x: P, y: 76, fill: PAL.plum });
  out += T(mono, String(kind).toUpperCase(), { size: 14, x: W - P, y: 75, align: 'end', fill: PAL.rose, tracking: 60, maxWidth: 360 });
  // thumbnail panel with assembly corner marks
  const tx = P, ty = 104, tw = W - 2 * P, th = 300;
  out += `<rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="26" fill="${PAL.chalk}"/>`;
  if (thumb) out += `<image href="${esc(thumb)}" x="${tx + 20}" y="${ty + 14}" width="${tw - 40}" height="${th - 28}" preserveAspectRatio="xMidYMid meet"/>`;
  else out += cubeSVG(W / 2 - 70, ty + th / 2 - 70, 140);
  const cm = 18, ci = 16;
  for (const [cx, cy, sx, sy] of [[tx + ci, ty + ci, 1, 1], [tx + tw - ci, ty + ci, -1, 1], [tx + ci, ty + th - ci, 1, -1], [tx + tw - ci, ty + th - ci, -1, -1]]) {
    out += `<path d="M${cx} ${cy + sy * cm}V${cy}H${cx + sx * cm}" fill="none" stroke="${PAL.rose}" stroke-width="2" stroke-linecap="round"/>`;
  }
  if (detail) out += T(mono, detail, { size: 13, x: tx + 26, y: ty + th - 24, fill: PAL.muted, maxWidth: tw - 120 });
  // the code
  const qs = 300, qx = P - 6, qy = 436;
  const centreOpt = !m.centre ? null : centre === 'thumb' && (centreThumb || thumb) ? { kind: 'image', href: centreThumb || thumb } : { kind: 'cube' };
  out += qrMarkup(m, { x: qx, y: qy, size: qs, style, centre: centreOpt });
  // words beside it
  const wx = qx + qs + 22, ww = W - P - wx;
  out += T(sans, 'Scan to place it', { size: 33, x: wx, y: qy + 62, fill: PAL.plum, maxWidth: ww, minSize: 24, tracking: -12 });
  out += T(sans, 'in your space', { size: 33, x: wx, y: qy + 102, fill: PAL.plum, maxWidth: ww, minSize: 24, tracking: -12 });
  out += T(sans, title, { size: 21, x: wx, y: qy + 156, fill: PAL.ink, maxWidth: ww, minSize: 15 });
  const steps = ['1  Open your phone camera', '2  Point it at the code', '3  Tap the link that appears'];
  steps.forEach((s, i) => { out += T(mono, s, { size: 12.5, x: wx, y: qy + 206 + i * 24, fill: PAL.muted, maxWidth: ww }); });
  out += `<path d="M${P} ${H - 104}H${W - P}" stroke="${PAL.line}" stroke-width="2"/>`;
  out += T(mono, 'iPhone, iPad and Android · no app', { size: 13, x: P, y: H - 62, fill: PAL.muted, maxWidth: 380 });
  if (host) out += T(mono, host, { size: 13, x: W - P, y: H - 62, align: 'end', fill: PAL.rose, maxWidth: 240 });
  out += '</svg>';
  return { svg: out, matrix: m };
}

export async function svgToPNG(svg, scale = 2) {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('Could not draw the card.')); img.src = url; });
    const w = img.naturalWidth || 720, h = img.naturalHeight || 900;
    const c = document.createElement('canvas'); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(res => c.toBlob(res, 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}
