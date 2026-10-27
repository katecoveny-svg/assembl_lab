// assembl AR: what a share link carries, and how to read it back.
// A link is /ar/v/#k=<kind>&... with short keys. The viewer rebuilds the object in the browser from these numbers;
// nothing is stored on a server. Logos travel as their outlines: quantised Bézier paths, packed as varints,
// deflated (fflate) and written as base64url.
import { deflateSync, inflateSync } from '../vendor/three/libs/fflate.module.js';
import { SWATCHES } from './palette.js';

export const VIEWER = new URL('../v/', import.meta.url);
export const STUDIO = new URL('../', import.meta.url);

const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d; };
const pick = (v, list, d) => (list.includes(v) ? v : d);
const colourIds = SWATCHES.map(s => s.id);
const hex6 = (v, d) => (/^#?[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).replace('#', '').toUpperCase() : d);

export const CARS = [
  { id: 'hatch', name: 'Hatch' }, { id: 'sedan', name: 'Sedan' }, { id: 'suv', name: 'SUV' },
  { id: 'ute', name: 'Ute' }, { id: 'van', name: 'Van' }
];
export const CAR_PAINTS = [{ id: 'silver', name: 'Silver', hex: '#8C8F94' }, ...SWATCHES.filter(s => s.id !== 'paper')];

// Defaults and clamps, per kind. Every link is read through these, so a hand-edited link can't build anything odd.
export const KINDS = {
  text: {
    def: { k: 'text', t: 'kia ora', f: 'sans', h: 60, d: 30, c: 'ink', b: 1, m: 's' },
    norm: s => ({ k: 'text', t: String(s.t ?? 'kia ora').replace(/\r/g, '').split('\n').slice(0, 2).join('\n').slice(0, 48) || 'kia ora',
      f: pick(s.f, ['sans', 'medium', 'mono'], 'sans'), h: num(s.h, 10, 1000, 60), d: num(s.d, 5, 100, 30),
      c: pick(s.c, colourIds, 'ink'), b: s.b === 0 || s.b === '0' ? 0 : 1, m: pick(s.m, ['s', 'g', 'm'], 's') })
  },
  logo: {
    def: { k: 'logo', s: '', w: 160, d: 12, v: 1, c: 'own', b: 1, m: 's' },
    norm: s => ({ k: 'logo', s: String(s.s || '').replace(/[^A-Za-z0-9_-]/g, ''), w: num(s.w, 20, 3000, 160), d: num(s.d, 2, 60, 12),
      v: num(s.v, 0, 3, 1), c: pick(s.c, ['own', ...colourIds], 'own'), b: s.b === 0 || s.b === '0' ? 0 : 1, m: pick(s.m, ['s', 'g', 'm'], 's') })
  },
  car: {
    def: { k: 'car', m: 'ute', s: 'table', p: 'ink' },
    norm: s => ({ k: 'car', m: pick(s.m, CARS.map(c => c.id), 'ute'), s: pick(s.s, ['table', 'real'], 'table'),
      p: pick(s.p, CAR_PAINTS.map(p => p.id), 'ink') })
  },
  bike: {
    def: { k: 'bike', wb: 125, wd: 70, su: 200, fr: '492B3E', ac: 'F5F1F2', b: 1, s: 'model' },
    norm: s => ({ k: 'bike', wb: num(s.wb, 110, 170, 125), wd: num(s.wd, 54, 102, 70), su: num(s.su, 160, 220, 200),
      fr: hex6(s.fr, '492B3E'), ac: hex6(s.ac, 'F5F1F2'), b: s.b === 0 || s.b === '0' ? 0 : 1, s: pick(s.s, ['model', 'real'], 'model') })
  }
};
export const ORDER = { text: ['k', 't', 'f', 'h', 'd', 'c', 'b', 'm'], logo: ['k', 'w', 'd', 'v', 'c', 'b', 'm', 's'],
  car: ['k', 'm', 's', 'p'], bike: ['k', 'wb', 'wd', 'su', 'fr', 'ac', 'b', 's'] };

export function normalise(spec) {
  const K = KINDS[spec && spec.k];
  return K ? K.norm({ ...K.def, ...spec }) : null;
}

export function encodeHash(spec) {
  const s = normalise(spec);
  if (!s) return '';
  const p = new URLSearchParams();
  for (const key of ORDER[s.k]) p.set(key, String(s[key]));
  return p.toString();
}

export function decodeHash(hash) {
  const h = String(hash || '').replace(/^#/, '');
  if (!h) return { spec: null, error: 'empty' };
  const p = new URLSearchParams(h), raw = {};
  for (const [k, v] of p) raw[k] = v;
  if (!KINDS[raw.k]) return { spec: null, error: 'unknown' };
  const spec = normalise(raw);
  if (spec.k === 'logo') {
    try { decodeLogo(spec.s); } catch (e) { return { spec: null, error: 'damaged' }; }
  }
  return { spec, error: null };
}

export const shareURL = spec => VIEWER.href + '#' + encodeHash(spec);

// ---------------------------------------------------------------- base64url
export function toB64url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function fromB64url(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------------------------------------------------------------- logo outlines
// model: {grid, w, h, colours:['RRGGBB'], shapes:[{c, rings:[{start:[x,y], segs:[{t:0|1|2, p:[...]}]}]}]}
// t 0 = line (x,y), 1 = quadratic (cx,cy,x,y), 2 = cubic (c1x,c1y,c2x,c2y,x,y). Integers on a grid, y down.
class Writer {
  constructor() { this.b = []; }
  u8(v) { this.b.push(v & 255); }
  uv(v) { v = Math.max(0, Math.floor(v)); do { let x = v & 127; v = Math.floor(v / 128); if (v) x |= 128; this.b.push(x); } while (v); }
  sv(v) { this.uv(v < 0 ? -2 * v - 1 : 2 * v); }
  bytes() { return Uint8Array.from(this.b); }
}
class Reader {
  constructor(b) { this.b = b; this.i = 0; }
  u8() { if (this.i >= this.b.length) throw new Error('short'); return this.b[this.i++]; }
  uv() { let v = 0, m = 1, x; do { x = this.u8(); v += (x & 127) * m; m *= 128; if (m > 2 ** 35) throw new Error('bad varint'); } while (x & 128); return v; }
  sv() { const v = this.uv(); return v & 1 ? -(v + 1) / 2 : v / 2; }
}
const ARGS = [2, 4, 6];

export function packLogo(model) {
  const w = new Writer();
  w.u8(1); w.uv(model.grid); w.uv(model.w); w.uv(model.h);
  w.u8(model.colours.length);
  for (const c of model.colours) { const n = parseInt(c, 16); w.u8(n >> 16); w.u8(n >> 8); w.u8(n); }
  w.uv(model.shapes.length);
  let px = 0, py = 0;
  for (const sh of model.shapes) {
    if (model.colours.length > 1) w.u8(sh.c);
    w.uv(sh.rings.length);
    for (const r of sh.rings) {
      w.uv(r.segs.length);
      w.sv(r.start[0] - px); w.sv(r.start[1] - py); px = r.start[0]; py = r.start[1];
      for (let i = 0; i < r.segs.length; i += 4) {
        let b = 0;
        for (let k = 0; k < 4 && i + k < r.segs.length; k++) b |= r.segs[i + k].t << (k * 2);
        w.u8(b);
      }
      let cx = r.start[0], cy = r.start[1];
      for (const s of r.segs) {
        for (let k = 0; k < s.p.length; k += 2) { w.sv(s.p[k] - cx); w.sv(s.p[k + 1] - cy); }
        cx = s.p[s.p.length - 2]; cy = s.p[s.p.length - 1];
      }
    }
  }
  return toB64url(deflateSync(w.bytes(), { level: 9 }));
}

export function decodeLogo(str) {
  if (!str) throw new Error('empty');
  const r = new Reader(inflateSync(fromB64url(str)));
  if (r.u8() !== 1) throw new Error('version');
  const model = { grid: r.uv(), w: r.uv(), h: r.uv(), colours: [], shapes: [] };
  const nc = r.u8();
  for (let i = 0; i < nc; i++) model.colours.push(((r.u8() << 16) | (r.u8() << 8) | r.u8()).toString(16).padStart(6, '0').toUpperCase());
  const ns = r.uv();
  if (ns > 5000) throw new Error('too many shapes');
  let px = 0, py = 0;
  for (let s = 0; s < ns; s++) {
    const sh = { c: nc > 1 ? r.u8() : 0, rings: [] };
    const nr = r.uv();
    for (let q = 0; q < nr; q++) {
      const n = r.uv(); if (n > 200000) throw new Error('too many segments');
      const start = [px + r.sv(), py + r.sv()]; px = start[0]; py = start[1];
      const types = [];
      for (let i = 0; i < n; i += 4) { const b = r.u8(); for (let k = 0; k < 4 && i + k < n; k++) types.push((b >> (k * 2)) & 3); }
      let cx = start[0], cy = start[1];
      const segs = types.map(t => {
        if (t > 2) throw new Error('bad segment');
        const p = [];
        for (let k = 0; k < ARGS[t]; k += 2) p.push(cx + r.sv(), cy + r.sv());
        cx = p[p.length - 2]; cy = p[p.length - 1];
        return { t, p };
      });
      sh.rings.push({ start, segs });
    }
    model.shapes.push(sh);
  }
  return model;
}

// From SVGLoader output to the compact model. shapes: [{shape: THREE.Shape, colour: 'rrggbb'}]
export function modelFromShapes(items, grid) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const { shape } of items) {
    for (const p of shape.getPoints(8)) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  }
  const span = Math.max(maxX - minX, maxY - minY);
  if (!(span > 0)) throw new Error('This SVG has no filled area we can use.');
  const k = grid / span;
  const q = v => [Math.round((v.x - minX) * k), Math.round((v.y - minY) * k)];
  const colours = [], shapes = [];
  const ring = curves => {
    const segs = []; let start = null, cur = null;
    const same = (a, b) => a[0] === b[0] && a[1] === b[1];
    const line = p => { if (!same(p, cur)) { segs.push({ t: 0, p: [...p] }); cur = p; } };
    for (const c of curves) {
      const pts = c.isLineCurve ? [c.v1, c.v2] : c.isQuadraticBezierCurve ? [c.v0, c.v1, c.v2] : c.isCubicBezierCurve ? [c.v0, c.v1, c.v2, c.v3] : null;
      const first = q(pts ? pts[0] : c.getPoint(0));
      if (!start) { start = first; cur = first; } else line(first);
      if (c.isLineCurve) line(q(c.v2));
      else if (c.isQuadraticBezierCurve) { const e = q(c.v2); segs.push({ t: 1, p: [...q(c.v1), ...e] }); cur = e; }
      else if (c.isCubicBezierCurve) { const e = q(c.v3); segs.push({ t: 2, p: [...q(c.v1), ...q(c.v2), ...e] }); cur = e; }
      else for (const p of c.getPoints(Math.max(6, Math.round(c.getLength() * k / 12))).slice(1)) line(q(p));
    }
    while (segs.length && segs[segs.length - 1].t === 0 && same(segs[segs.length - 1].p, start)) segs.pop();
    return segs.length >= 2 ? { start, segs } : null;
  };
  for (const { shape, colour } of items) {
    const outer = ring(shape.curves);
    if (!outer) continue;
    let c = colours.indexOf(colour);
    if (c < 0) { if (colours.length < 15) { colours.push(colour); c = colours.length - 1; } else c = 0; }
    const rings = [outer];
    for (const h of shape.holes) { const r = ring(h.curves); if (r) rings.push(r); }
    shapes.push({ c, rings });
  }
  if (!shapes.length) throw new Error('This SVG has no filled shapes we can use.');
  return { grid, w: Math.round((maxX - minX) * k), h: Math.round((maxY - minY) * k), colours: colours.length ? colours : ['492B3E'], shapes };
}
