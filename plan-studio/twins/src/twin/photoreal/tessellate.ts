// Conforming edge-split tessellation, for light stored per vertex: a 13 m floor drawn as two triangles cannot hold a
// shadow, so every edge longer than `maxEdge` is split at its midpoint, round by round, with shared midpoints so no
// T-junctions appear. Pure arrays (no three.js) so it is tested under node.

export interface AttrIn {
  array: Float32Array;
  itemSize: number;
  /** re-normalise after interpolation (normals) */
  unit?: boolean;
}

export interface Tess {
  attrs: Record<string, Float32Array>;
  index: Uint32Array;
  vertices: number;
}

/**
 * @param attrs float attributes by name; must include `position` (local space)
 * @param index triangle list (or null for a non-indexed soup)
 * @param maxEdge longest edge allowed, in world metres
 * @param scale world size of one local unit (largest axis scale of the mesh's world matrix)
 * @param maxVerts stop refining past this many vertices (safety)
 */
export function tessellate(attrs: Record<string, AttrIn>, index: ArrayLike<number> | null, maxEdge: number, scale = 1, maxVerts = 400000): Tess {
  const P = attrs.position.array, n0 = P.length / 3;
  const names = Object.keys(attrs);
  // growable copies
  const cap = { n: n0 };
  const data: Record<string, number[]> = {};
  for (const k of names) data[k] = Array.from(attrs[k].array);
  let tris: number[] = index ? Array.from(index) : Array.from({ length: n0 }, (_, i) => i);
  const lim = (maxEdge / scale) ** 2;
  const len2 = (a: number, b: number) => {
    const p = data.position;
    const dx = p[a * 3] - p[b * 3], dy = p[a * 3 + 1] - p[b * 3 + 1], dz = p[a * 3 + 2] - p[b * 3 + 2];
    return dx * dx + dy * dy + dz * dz;
  };
  const mid = (a: number, b: number) => {
    const id = cap.n++;
    for (const k of names) {
      const s = attrs[k].itemSize, d = data[k];
      for (let c = 0; c < s; c++) d.push((d[a * s + c] + d[b * s + c]) * 0.5);
      if (attrs[k].unit) {
        const o = id * s; let l = 0;
        for (let c = 0; c < s; c++) l += d[o + c] * d[o + c];
        l = Math.sqrt(l) || 1; for (let c = 0; c < s; c++) d[o + c] /= l;
      }
    }
    return id;
  };
  for (let round = 0; round < 14; round++) {
    const split = new Map<number, number>();
    const key = (a: number, b: number) => (a < b ? a * 4194304 + b : b * 4194304 + a);
    let any = false;
    for (let t = 0; t < tris.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const a = tris[t + e], b = tris[t + ((e + 1) % 3)];
        const k = key(a, b);
        if (split.has(k)) continue;
        if (len2(a, b) > lim && cap.n < maxVerts) { split.set(k, mid(a, b)); any = true; }
      }
    }
    if (!any) break;
    const next: number[] = [];
    for (let t = 0; t < tris.length; t += 3) {
      const v = [tris[t], tris[t + 1], tris[t + 2]];
      const m = [split.get(key(v[0], v[1])), split.get(key(v[1], v[2])), split.get(key(v[2], v[0]))];
      const c = (m[0] !== undefined ? 1 : 0) + (m[1] !== undefined ? 1 : 0) + (m[2] !== undefined ? 1 : 0);
      if (c === 0) { next.push(v[0], v[1], v[2]); continue; }
      if (c === 3) {
        const [ab, bc, ca] = m as number[];
        next.push(v[0], ab, ca, ab, v[1], bc, ca, bc, v[2], ab, bc, ca);
        continue;
      }
      // rotate so the first split edge starts at r
      let r = 0;
      if (c === 1) r = m[0] !== undefined ? 0 : m[1] !== undefined ? 1 : 2;
      else r = m[0] === undefined ? 1 : m[1] === undefined ? 2 : 0; // c === 2: the unsplit edge is (r+2 → r)
      const A = v[r], B = v[(r + 1) % 3], C = v[(r + 2) % 3];
      const mAB = m[r]!;
      if (c === 1) { next.push(A, mAB, C, mAB, B, C); continue; }
      const mBC = m[(r + 1) % 3]!;
      // two split edges AB and BC: corner triangle at B, then split the quad A mAB mBC C along its shorter diagonal
      next.push(mAB, B, mBC);
      if (len2(A, mBC) < len2(mAB, C)) next.push(A, mAB, mBC, A, mBC, C);
      else next.push(A, mAB, C, mAB, mBC, C);
    }
    tris = next;
  }
  const out: Record<string, Float32Array> = {};
  for (const k of names) out[k] = Float32Array.from(data[k]);
  return { attrs: out, index: Uint32Array.from(tris), vertices: cap.n };
}
