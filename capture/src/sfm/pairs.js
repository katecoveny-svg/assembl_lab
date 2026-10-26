// assembl capture · which image pairs to match.
//
// A guided capture is ordered and ring-structured (one loop per height), and every frame carries an
// azimuth estimate (from WebXR poses, or the phone's attitude: a walk-around keeps the camera pointed at
// the subject, so heading tracks the walker's position around it). So instead of all n²/2 pairs:
//   · each frame with its next `window` neighbours in the same ring, wrapping round the loop;
//   · each frame with frames of other rings whose azimuth is within `crossDeg`;
//   · when nothing is known, a sliding window plus long jumps (video-style).

import { m3, mat3FromQuat } from "../geom.js";

/** Heading of a camera (degrees, 0–360) from a camera-to-world quaternion in the +Y-up world. */
export function headingFromAttitude(q) {
  const R = mat3FromQuat(q);
  const fwd = m3.vec(R, [0, 0, -1]); // where the camera looks
  return ((Math.atan2(fwd[0], -fwd[2]) * 180) / Math.PI + 360) % 360;
}

const angDiff = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

/**
 * frames: [{ ring?, azimuthDeg?, attitude?: {q} }] in capture order.
 * Returns [[i, j], …] with i < j, deduplicated.
 */
export function capturePairs(frames, { window = 6, crossDeg = 22, loop = true, jumps = [12, 24] } = {}) {
  const n = frames.length;
  const seen = new Set();
  const out = [];
  const add = (a, b) => {
    if (a === b) return;
    const i = Math.min(a, b), j = Math.max(a, b);
    const k = i * 100000 + j;
    if (!seen.has(k)) { seen.add(k); out.push([i, j]); }
  };
  const az = frames.map((f) => (f.azimuthDeg != null ? f.azimuthDeg : f.attitude?.q ? headingFromAttitude(f.attitude.q) : null));
  const rings = new Map();
  frames.forEach((f, i) => { const r = f.ring ?? 0; if (!rings.has(r)) rings.set(r, []); rings.get(r).push(i); });

  for (const idx of rings.values()) {
    const m = idx.length;
    for (let a = 0; a < m; a++) {
      for (let o = 1; o <= window; o++) {
        if (a + o < m) add(idx[a], idx[a + o]);
        else if (loop && m > 2 * window) add(idx[a], idx[(a + o) % m]);
      }
      for (const o of jumps) if (a + o < m && o < m / 2) add(idx[a], idx[a + o]);
    }
  }
  const ringKeys = [...rings.keys()];
  if (az.every((v) => v != null)) {
    for (let x = 0; x < ringKeys.length; x++) for (let y = x + 1; y < ringKeys.length; y++) {
      for (const i of rings.get(ringKeys[x])) for (const j of rings.get(ringKeys[y])) {
        if (angDiff(az[i], az[j]) <= crossDeg) add(i, j);
      }
    }
    if (loop) {
      // the same ring may have been walked more than once, or a single ring passes the start again
      for (const idx of rings.values()) for (let a = 0; a < idx.length; a++) for (let b = a + window + 1; b < idx.length; b++) {
        if (angDiff(az[idx[a]], az[idx[b]]) <= crossDeg / 2) add(idx[a], idx[b]);
      }
    }
  }
  return out;
}
