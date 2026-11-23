// The building's own bounds in an opened model, for framing the camera and setting the haze: a model from Revit or ArchiCAD
// often carries a few parts far from the building (survey points, site furniture, a stray family at the project base point),
// and a box round everything puts the building on the horizon. Pure: tested in tests/architecture/model-bounds.test.mjs.
export type Box6 = [number, number, number, number, number, number];   // min x, y, z, max x, y, z

const pct = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))]; };

/**
 * The parts' boxes in, the building's box out. The building is where most of the parts are: round the median of the parts'
 * centres, out to the distance that holds 90% of them (and a little more); parts with a centre further out, and parts bigger
 * than that circle (a topography mesh, a road), are left out. The floor is the 5th percentile of the kept parts' bottoms, so a
 * few pieces of ground or footing reaching down do not sink the building. With fewer than eight parts, the plain box.
 */
export function buildingBounds(boxes: Box6[]): { box: Box6; kept: number; left: number } {
  const ok = boxes.filter((b) => b.every(Number.isFinite) && b[3] >= b[0] && b[5] >= b[2]);
  const all = (list: Box6[]): Box6 => list.reduce<Box6>((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]), Math.max(a[3], b[3]), Math.max(a[4], b[4]), Math.max(a[5], b[5])], [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]);
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
