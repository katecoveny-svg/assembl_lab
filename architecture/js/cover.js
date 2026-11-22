// Project covers: a line drawing for each project tile and project header.
//
// When a project has a plan model, its cover is the model's own ground-floor plan, drawn from the model file: the
// outside walls (outer face at "at", thickness inwards), the partitions (centred on "at"), the gaps the openings leave,
// each window as a thin box across the wall with a line along it, and the decks as dashed outlines. Nothing is added that the model does not say, and the
// drawing keeps the model's proportions (metres in, metres out: the SVG viewBox is the model's own extent).
// Plan view: x to the right, z down, as the plan model's units say (x east, z south). No north arrow is drawn.
//
// When there is no model, the cover is a plain decorative sketch of a house elevation. It is the same for every
// project, it is hidden from screen readers, and it is never presented as the project's drawing.

const r2 = (n) => Math.round(n * 100) / 100;
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** the pieces of [from, to] left once the openings are cut out, and the openings themselves, clamped to the run */
function cut(from, to, openings) {
  const ops = (Array.isArray(openings) ? openings : [])
    .map((o) => ({ a: Math.max(from, Math.min(num(o?.a), num(o?.b))), b: Math.min(to, Math.max(num(o?.a), num(o?.b))), kind: String(o?.kind ?? '') }))
    .filter((o) => o.b - o.a > 0.001)
    .sort((x, y) => x.a - y.a);
  const solid = [];
  let at = from;
  for (const o of ops) { if (o.a > at + 0.001) solid.push([at, o.a]); at = Math.max(at, o.b); }
  if (to > at + 0.001) solid.push([at, to]);
  return { solid, ops };
}

/**
 * What a cover needs from a plan model, small enough to keep on the project: the lowest level of each building.
 * Returns null when the model has no walls or decks to draw.
 *   { v: 1, x, y, w, h,             the extent, in the model's metres
 *     walls: [[x0, y0, x1, y1]],    solid pieces of the outside walls
 *     parts: [[x0, y0, x1, y1]],    solid pieces of the partitions
 *     glass: [[x0, y0, x1, y1]],    each window: the opening across the wall's thickness (drawn with a line along it)
 *     decks: [[x0, y0, x1, y1]],
 *     rooms, level }                how many rooms the level names, and the level's name
 */
export function planOutline(plan) {
  const out = { v: 1, x: 0, y: 0, w: 0, h: 0, walls: [], parts: [], glass: [], decks: [], rooms: 0, level: '' };
  for (const b of Array.isArray(plan?.buildings) ? plan.buildings : []) {
    const levels = Array.isArray(b?.levels) ? b.levels.filter((l) => l && typeof l === 'object') : [];
    if (!levels.length) continue;
    const L = levels.reduce((lo, l) => (num(l.floor) < num(lo.floor) ? l : lo));
    const ox = num(b.origin?.[0]), oz = num(b.origin?.[1]);
    // a run along one axis, between two offsets across it: axis 'x' runs along x at z = across; axis 'z' runs along z at x = across
    const rect = (axis, c0, c1, s0, s1) => (axis === 'x' ? [ox + s0, oz + c0, ox + s1, oz + c1] : [ox + c0, oz + s0, ox + c1, oz + s1]);
    const run = (w, outside) => {
      const axis = w?.axis === 'z' ? 'z' : w?.axis === 'x' ? 'x' : null;
      if (!axis) return;
      const at = num(w.at), t = Math.max(0, num(w.thickness, 0.1)), from = Math.min(num(w.from), num(w.to)), to = Math.max(num(w.from), num(w.to));
      if (to - from <= 0.001) return;
      // an outside wall's outer face is at "at" and its thickness runs inwards (away from "out"); a partition is centred
      const side = outside && (w.out === 1 || w.out === -1) ? w.out : 0;
      const c0 = side ? Math.min(at, at - side * t) : at - t / 2, c1 = side ? Math.max(at, at - side * t) : at + t / 2;
      const { solid, ops } = cut(from, to, w.openings);
      for (const [s0, s1] of solid) (outside ? out.walls : out.parts).push(rect(axis, c0, c1, s0, s1));
      for (const o of ops) if (o.kind === 'window') out.glass.push(rect(axis, c0, c1, o.a, o.b));
    };
    for (const w of Array.isArray(L.walls) ? L.walls : []) run(w, true);
    for (const p of Array.isArray(L.partitions) ? L.partitions : []) run(p, false);
    for (const d of Array.isArray(L.decks) ? L.decks : []) {
      const u0 = Math.min(num(d?.u0), num(d?.u1)), u1 = Math.max(num(d?.u0), num(d?.u1)), v0 = Math.min(num(d?.v0), num(d?.v1)), v1 = Math.max(num(d?.v0), num(d?.v1));
      if (u1 - u0 > 0.001 && v1 - v0 > 0.001) out.decks.push([ox + u0, oz + v0, ox + u1, oz + v1]);
    }
    out.rooms += Array.isArray(L.rooms) ? L.rooms.length : 0;
    if (!out.level) out.level = String(L.name ?? '');
  }
  const all = [...out.walls, ...out.parts, ...out.glass, ...out.decks];
  if (!out.walls.length && !out.parts.length && !out.decks.length) return null;
  const xs = all.flatMap((r) => [r[0], r[2]]), ys = all.flatMap((r) => [r[1], r[3]]);
  const x = Math.min(...xs), y = Math.min(...ys);
  out.x = r2(x); out.y = r2(y); out.w = r2(Math.max(...xs) - x); out.h = r2(Math.max(...ys) - y);
  for (const k of ['walls', 'parts', 'glass', 'decks']) out[k] = out[k].map((r) => r.map(r2));
  return out;
}

/** a kept outline that can be drawn: the right shape, with finite numbers and a size */
export function isOutline(o) {
  const box = (r) => Array.isArray(r) && r.length === 4 && r.every((n) => typeof n === 'number' && Number.isFinite(n));
  return !!o && o.v === 1 && [o.x, o.y, o.w, o.h].every((n) => typeof n === 'number' && Number.isFinite(n)) && o.w > 0 && o.h > 0
    && ['walls', 'parts', 'glass', 'decks'].every((k) => Array.isArray(o[k]) && o[k].every(box));
}

const f = (n) => String(r2(n));
const rects = (list) => list.map(([x0, y0, x1, y1]) => `M${f(x0)} ${f(y0)}H${f(x1)}V${f(y1)}H${f(x0)}Z`).join('');
// the line along the middle of each window, the long way
const mids = (list) => list.map(([x0, y0, x1, y1]) => (x1 - x0 >= y1 - y0 ? `M${f(x0)} ${f((y0 + y1) / 2)}H${f(x1)}` : `M${f((x0 + x1) / 2)} ${f(y0)}V${f(y1)}`)).join('');

/**
 * The model's plan as an SVG, in the model's own proportions. Lines take the colour of the text around them
 * (currentColor) and stay the same width at any size.
 *   label   what a screen reader hears; say where the drawing came from
 */
export function coverSvg(o, { label = 'Ground floor plan, drawn from the plan model', cls = 'cover-plan' } = {}) {
  if (!isOutline(o)) return '';
  const m = Math.max(o.w, o.h) * 0.06, vb = [o.x - m, o.y - m, o.w + 2 * m, o.h + 2 * m].map(f).join(' ');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ns = 'vector-effect="non-scaling-stroke"';
  return `<svg class="${cls}" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(label)}" fill="none" stroke="currentColor" stroke-linejoin="miter">`
    + (o.decks.length ? `<path class="pl-deck" d="${rects(o.decks)}" stroke-width="1" stroke-dasharray="3 3" ${ns} />` : '')
    + (o.parts.length ? `<path class="pl-part" d="${rects(o.parts)}" stroke-width="1" ${ns} />` : '')
    + (o.walls.length ? `<path class="pl-wall" d="${rects(o.walls)}" stroke-width="1.5" ${ns} />` : '')
    + (o.glass.length ? `<path class="pl-glass" d="${rects(o.glass)}${mids(o.glass)}" stroke-width="1" ${ns} />` : '')
    + '</svg>';
}

/** a plain sketch of a house elevation: decoration for a project with no model. Hidden from screen readers. */
export function sketchSvg(cls = 'cover-sketch') {
  return `<svg class="${cls}" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" data-decorative="true">`
    + '<path d="M14 100H186" stroke-width="1.5" vector-effect="non-scaling-stroke" />'
    + '<path d="M50 100V58L92 30L134 58V100" stroke-width="1.5" vector-effect="non-scaling-stroke" />'
    + '<path d="M42 63L92 30L142 63" stroke-width="1" vector-effect="non-scaling-stroke" />'
    + '<path d="M84 100V76H100V100M60 66H76V80H60ZM108 66H124V80H108Z" stroke-width="1" vector-effect="non-scaling-stroke" />'
    + '<path d="M162 100V78M162 78C150 78 148 60 162 54C176 60 174 78 162 78Z" stroke-width="1" vector-effect="non-scaling-stroke" />'
    + '<path d="M22 108H58M70 112H120M132 108H176" stroke-width="1" stroke-dasharray="2 4" vector-effect="non-scaling-stroke" />'
    + '</svg>';
}

// The plan models the lab hosts (model.js HOSTED_MODELS) are not kept with a project, so their outlines are kept here.
// tests/architecture/cover.test.mjs reads each hosted file and checks these are exactly what planOutline makes of it.
export const HOSTED_OUTLINES = {
  // hero.plan.json
  '99eea08ce8e9': {"v":1,"x":-1.21,"y":-2.41,"w":12.63,"h":14.04,"walls":[[0,0,1.39,0.14],[3.8,0,5.19,0.14],[6.05,0,8.11,0.14],[10.94,0,11.42,0.14],[0,7.56,0.87,7.7],[4.47,7.56,5.97,7.7],[7.06,7.56,8.11,7.7],[10.94,7.56,11.42,7.7],[0,0,0.14,0.98],[0,2.98,0.14,3.48],[0,4.39,0.14,4.79],[0,6.79,0.14,7.7],[11.28,0,11.42,0.32],[11.28,0.72,11.42,2.44],[11.28,2.84,11.42,4.81],[11.28,5.2,11.42,6.92],[11.28,7.32,11.42,7.7]],"parts":[[6.1,3.21,7.3,3.31],[8.2,3.21,11.28,3.31],[5.15,4.41,6.22,4.51],[7.12,4.41,7.3,4.51],[8.2,4.41,11.28,4.51],[8.37,3.31,8.47,3.47],[8.37,4.37,8.47,4.41],[7.91,0.14,8.01,0.36],[7.91,2.08,8.01,2.2],[7.91,5.53,8.01,5.64],[7.91,7.37,8.01,7.56],[7.16,0.14,7.26,3.21],[7.16,4.51,7.26,7.56],[6.66,2.15,8.01,2.25],[7.16,5.48,8.01,5.58],[5.05,0.14,5.15,3.38],[5.05,4.29,5.15,7.56]],"glass":[[1.39,0,3.8,0.14],[0,0.98,0.14,2.98],[0,4.79,0.14,6.79],[11.28,0.32,11.42,0.72],[11.28,2.44,11.42,2.84],[11.28,4.81,11.42,5.2],[11.28,6.92,11.42,7.32]],"decks":[[-1.21,-2.41,6.27,0],[-1.21,0,0,7.7],[-1.21,7.7,11.37,11.63]],"rooms":10,"level":"Ground floor"},
  // hero-plane.plan.json
  'fe966b1b90f4': {"v":1,"x":-1.78,"y":-2.5,"w":13.2,"h":14,"walls":[[0,0,1.39,0.14],[3.8,0,5.19,0.14],[6.05,0,8.11,0.14],[10.94,0,11.42,0.14],[0,7.56,0.87,7.7],[4.47,7.56,5.97,7.7],[7.06,7.56,8.11,7.7],[10.94,7.56,11.42,7.7],[0,0,0.14,0.99],[0,3,0.14,3.5],[0,4.41,0.14,4.8],[0,6.81,0.14,7.7],[11.28,0,11.42,0.35],[11.28,0.75,11.42,2.46],[11.28,2.86,11.42,4.83],[11.28,5.23,11.42,6.94],[11.28,7.34,11.42,7.7]],"parts":[[6.1,3.21,7.3,3.31],[8.2,3.21,11.28,3.31],[5.15,4.41,6.22,4.51],[7.12,4.41,7.3,4.51],[8.2,4.41,11.28,4.51],[8.1,3.31,8.2,3.45],[8.1,4.3,8.2,4.41],[7.91,0.14,8.01,0.38],[7.91,2.15,8.01,2.2],[7.91,5.53,8.01,5.58],[7.91,7.3,8.01,7.56],[7.16,0.14,7.26,3.21],[7.16,4.51,7.26,7.56],[6.66,2.15,8.01,2.25],[7.16,5.48,8.01,5.58],[5.05,0.14,5.15,3.38],[5.05,4.29,5.15,7.56]],"glass":[[1.39,0,3.8,0.14],[5.97,7.56,7.06,7.7],[11.28,0.35,11.42,0.75],[11.28,2.46,11.42,2.86],[11.28,4.83,11.42,5.23],[11.28,6.94,11.42,7.34]],"decks":[[-1.78,-2.5,5.92,0],[-1.78,0,0,7.7],[-1.78,7.7,5.92,11.5]],"rooms":10,"level":"Ground floor"},
};

/** the outline to draw for a project's model: the one kept on it, the hosted one, or one this browser worked out */
export function outlineFor(model, cache = {}) {
  const fp = model?.fingerprint;
  if (!fp) return null;
  for (const o of [model.outline, HOSTED_OUTLINES[fp], cache?.[fp]]) if (isOutline(o)) return o;
  return null;
}
