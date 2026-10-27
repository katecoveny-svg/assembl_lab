// assembl AR: open-licence fonts as glyph outlines, for 3D letters and for text-as-paths on the QR card.
// The JSON files are three.js "typeface" fonts made by tools/build_fonts.py from Instrument Sans and IBM Plex Mono
// (both SIL OFL 1.1), plus pair kerning and the cap height. Outline commands follow three's Font: "q" and "b" list the
// end point first, then the control point(s).
import * as THREE from 'three';

export const FONTS = {
  sans: { file: 'instrument-sans-600.json', name: 'Instrument Sans', note: 'SemiBold' },
  medium: { file: 'instrument-sans-500.json', name: 'Instrument Sans Medium', note: 'Medium' },
  mono: { file: 'ibm-plex-mono-500.json', name: 'IBM Plex Mono', note: 'Medium' }
};
export const fontId = id => (FONTS[id] ? id : 'sans');

const cache = new Map();
export function loadFont(id) {
  const f = FONTS[fontId(id)];
  if (!cache.has(f.file)) {
    const url = new URL('../fonts/' + f.file, import.meta.url);
    cache.set(f.file, fetch(url).then(r => { if (!r.ok) throw new Error('Font failed to load (' + r.status + ')'); return r.json(); })
      .then(d => { d._cmds = new Map(); return d; }));
  }
  return cache.get(f.file);
}

export const hasGlyph = (font, ch) => !!font.glyphs[ch];
const glyphOf = (font, ch) => font.glyphs[ch] || font.glyphs['?'];

// Parsed outline: [['M',x,y],['L',x,y],['Q',cx,cy,x,y],['C',c1x,c1y,c2x,c2y,x,y]] in font units, y up.
export function commands(font, ch) {
  if (font._cmds.has(ch)) return font._cmds.get(ch);
  const g = glyphOf(font, ch), out = [];
  if (g && g.o) {
    const t = g.o.split(' ');
    for (let i = 0; i < t.length;) {
      const c = t[i++];
      if (c === 'm' || c === 'l') { out.push([c === 'm' ? 'M' : 'L', +t[i++], +t[i++]]); }
      else if (c === 'q') { const x = +t[i++], y = +t[i++], cx = +t[i++], cy = +t[i++]; out.push(['Q', cx, cy, x, y]); }
      else if (c === 'b') { const x = +t[i++], y = +t[i++], a = +t[i++], b = +t[i++], cc = +t[i++], d = +t[i++]; out.push(['C', a, b, cc, d, x, y]); }
    }
  }
  font._cmds.set(ch, out);
  return out;
}

// Lay out one or more lines with pair kerning. Positions are in font units (1000 per em).
export function layout(font, text, { tracking = 0, leading = 1.16 } = {}) {
  const lines = String(text).split('\n').map(line => {
    const glyphs = []; let x = 0, prev = null;
    for (const ch of Array.from(line)) {
      if (prev) x += (font.kern && font.kern[prev + ch]) || 0;
      glyphs.push({ ch, x });
      x += (glyphOf(font, ch)?.ha || 500) + tracking;
      prev = ch;
    }
    return { glyphs, width: Math.max(0, x - (glyphs.length ? tracking : 0)) };
  });
  return { lines, width: Math.max(0, ...lines.map(l => l.width)), advance: font.resolution * leading };
}

// One glyph as three.js shapes, scaled and offset (y up). Holes are found the same way three's Font does it.
export function glyphShapes(font, ch, scale, ox = 0, oy = 0) {
  const cmds = commands(font, ch);
  if (!cmds.length) return [];
  const p = new THREE.ShapePath();
  const X = v => v * scale + ox, Y = v => v * scale + oy;
  for (const c of cmds) {
    if (c[0] === 'M') p.moveTo(X(c[1]), Y(c[2]));
    else if (c[0] === 'L') p.lineTo(X(c[1]), Y(c[2]));
    else if (c[0] === 'Q') p.quadraticCurveTo(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]));
    else p.bezierCurveTo(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]), X(c[5]), Y(c[6]));
  }
  return p.toShapes();
}

const f2 = v => (Math.round(v * 100) / 100).toString();

// Text as one SVG path (y down), so a downloaded card looks right without the font installed.
// fit: shrink to maxWidth, down to minSize, then trim with an ellipsis.
export function svgText(font, text, { size = 16, x = 0, y = 0, align = 'start', maxWidth = Infinity, minSize = 0, tracking = 0 } = {}) {
  let s = size / font.resolution, str = String(text).replace(/\s*\n\s*/g, ' ');
  let L = layout(font, str, { tracking });
  if (L.width * s > maxWidth) {
    const ms = (minSize || size) / font.resolution;
    s = Math.max(ms, maxWidth / L.width);
    while (L.width * s > maxWidth && str.length > 1) { str = str.slice(0, -2).trimEnd() + '…'; L = layout(font, str, { tracking }); }
  }
  const w = L.width * s, x0 = align === 'middle' ? x - w / 2 : align === 'end' ? x - w : x;
  let d = '';
  for (const g of L.lines[0].glyphs) {
    const X = v => f2(x0 + (g.x + v) * s), Y = v => f2(y - v * s);
    for (const c of commands(font, g.ch)) {
      if (c[0] === 'M') d += (d ? 'Z' : '') + 'M' + X(c[1]) + ' ' + Y(c[2]);
      else if (c[0] === 'L') d += 'L' + X(c[1]) + ' ' + Y(c[2]);
      else if (c[0] === 'Q') d += 'Q' + X(c[1]) + ' ' + Y(c[2]) + ' ' + X(c[3]) + ' ' + Y(c[4]);
      else d += 'C' + X(c[1]) + ' ' + Y(c[2]) + ' ' + X(c[3]) + ' ' + Y(c[4]) + ' ' + X(c[5]) + ' ' + Y(c[6]);
    }
  }
  if (d) d += 'Z';
  return { d, width: w, size: s * font.resolution, text: str };
}
