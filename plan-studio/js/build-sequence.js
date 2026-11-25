// Coordinates are in PDF user space (points), project plan space (mm, Y north)
// and Three's XZ plane (metres, north = -Z). No image fitting or guessed footprint.
export const BEATS = ["Drawing", "Floor", "Walls", "Openings", "Roof", "Finishes"];
export const mmPerPoint = scale => (25.4 / 72) * scale;
export function fromPdf([x, y], origin, scale) {
  const k = mmPerPoint(scale);
  return [(x * k - origin[0]) / 1000, -(y * k - origin[1]) / 1000];
}
export function toViewport([x, y], origin, scale, [a, b, c, d, e, f]) {
  const k = mmPerPoint(scale), u = (x + origin[0]) / k, v = (y + origin[1]) / k;
  return [a * u + c * v + e, b * u + d * v + f];
}
export function depthOf(part) {
  if (part.name === "SLAB" || part.name.startsWith("DECK_") || part.userData.buildBeat === 1) return 1;
  return ({ WALLS: 2, OPENINGS: 3, ROOF: 4 })[part.name] ?? 5;
}
export function calibration(scale, segment, writtenMm) {
  if (!Number.isFinite(writtenMm) || writtenMm <= 0 || !(scale > 0)) return null;
  const length = Math.hypot(segment.b[0] - segment.a[0], segment.b[1] - segment.a[1]);
  return length > 0 ? scale * writtenMm / length : null;
}
// Never normalise a reviewed Plan Twin into Studio's simpler single-level schema.
// Read provenance for the handoff card only; the existing twin viewer gets the original Blob.
export function twinEvidence(plan) {
  if (plan?.schema!=="assembl.plan-model.v1" || !Array.isArray(plan.buildings) || !plan.buildings.length) return null;
  const counts={buildings:plan.buildings.length,walls:0,openings:0,written:0,scaled:0,other:0};
  for(const b of plan.buildings)for(const level of (b.levels||[])){
    for(const w of [...(level.walls||[]),...(level.partitions||[])]){
      counts.walls++;const ops=w.openings||[];counts.openings+=ops.length;
      for(const part of [w,...ops]){const src=String(part.source||"").toLowerCase();counts[src.startsWith("written")?"written":src.startsWith("scaled")?"scaled":"other"]++;}
    }
  }
  return counts;
}
