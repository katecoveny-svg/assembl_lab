// The building's own bounds in a model, for framing a still of it: the same rule as the 3D page
// (plan-studio/twins/src/twin/modelBounds.ts, #246; tests/architecture/workspace-redesign-p1b.test.mjs checks the two agree).
// A model from Revit or ArchiCAD often carries a topography mesh, a road or survey points far from the building, and a box
// round everything shows a grey slab with the building tiny in it.
//   buildingBounds([[minx, miny, minz, maxx, maxy, maxz], ...]) -> { box, kept, left }
const pct = (v, p) => { const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))]; };
const all = (list) => list.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]), Math.max(a[3], b[3]), Math.max(a[4], b[4]), Math.max(a[5], b[5])], [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]);

export function buildingBounds(boxes) {
  const ok = boxes.filter((b) => b.every(Number.isFinite) && b[3] >= b[0] && b[5] >= b[2]);
  if (ok.length < 8) return { box: all(ok), kept: ok.length, left: 0 };
  const cx = ok.map((b) => (b[0] + b[3]) / 2), cz = ok.map((b) => (b[2] + b[5]) / 2);
  const mx = pct(cx, 0.5), mz = pct(cz, 0.5);
  const d = ok.map((_, i) => Math.hypot(cx[i] - mx, cz[i] - mz));
  const R = Math.max(6, pct(d, 0.9) * 1.25);
  const kept = ok.filter((b, i) => d[i] <= R && Math.max(b[3] - b[0], b[5] - b[2]) <= R * 1.6);
  if (!kept.length) return { box: all(ok), kept: ok.length, left: 0 };
  const box = all(kept);
  box[1] = Math.max(box[1], pct(kept.map((b) => b[1]), 0.05));
  return { box, kept: kept.length, left: ok.length - kept.length };
}

/** a colour made warm for a still: greys and whites lean to warm clay and timber; real colours keep their hue */
export function warmColour([r, g, b, a = 1]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), sat = max ? (max - min) / max : 0;
  if (sat > 0.18) return [r, g, b, a];
  const t = 0.42, warm = max > 0.7 ? [0.93, 0.88, 0.8] : max > 0.35 ? [0.74, 0.64, 0.54] : [0.36, 0.3, 0.27];
  return [r + (warm[0] - r) * t, g + (warm[1] - g) * t, b + (warm[2] - b) * t, a];
}
