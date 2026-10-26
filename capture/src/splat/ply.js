// assembl capture · Gaussian-splat container and PLY read/write (3DGS / Inria layout, binary little-endian).
//
// Splats (structure of arrays, float32):
//   pos     n×3              rot   n×4 (w, x, y, z) = rot_0..rot_3        scale  n×3 log-scales
//   opacity n   logit        fdc   n×3 SH DC (f_dc_0..2)
//   frest   n×3×K channel-major per splat, like the PLY (f_rest_0..K-1 red, K..2K-1 green, …), K ∈ {0,3,8,15}

export const SH_C0 = 0.28209479177387814;
const K_FOR_DEGREE = [0, 3, 8, 15];

export class Splats {
  constructor(n, K = 0) {
    this.n = n; this.K = K;
    this.pos = new Float32Array(n * 3);
    this.rot = new Float32Array(n * 4);
    this.scale = new Float32Array(n * 3);
    this.opacity = new Float32Array(n);
    this.fdc = new Float32Array(n * 3);
    this.frest = new Float32Array(n * 3 * K);
    this.comments = [];
  }
  get shDegree() { return K_FOR_DEGREE.indexOf(this.K); }
  alpha(i) { return 1 / (1 + Math.exp(-this.opacity[i])); }
  /** Keep splats where mask[i] is truthy. */
  subset(mask) {
    let m = 0;
    for (let i = 0; i < this.n; i++) if (mask[i]) m++;
    const o = new Splats(m, this.K);
    o.comments = this.comments.slice();
    const K3 = 3 * this.K;
    for (let i = 0, j = 0; i < this.n; i++) {
      if (!mask[i]) continue;
      o.pos.set(this.pos.subarray(i * 3, i * 3 + 3), j * 3);
      o.rot.set(this.rot.subarray(i * 4, i * 4 + 4), j * 4);
      o.scale.set(this.scale.subarray(i * 3, i * 3 + 3), j * 3);
      o.opacity[j] = this.opacity[i];
      o.fdc.set(this.fdc.subarray(i * 3, i * 3 + 3), j * 3);
      if (K3) o.frest.set(this.frest.subarray(i * K3, i * K3 + K3), j * K3);
      j++;
    }
    return o;
  }
  /** Drop SH bands above `degree`. */
  withShDegree(degree) {
    const K = K_FOR_DEGREE[Math.max(0, Math.min(3, degree))];
    if (K >= this.K) return this;
    const o = new Splats(this.n, K);
    o.pos = this.pos; o.rot = this.rot; o.scale = this.scale; o.opacity = this.opacity; o.fdc = this.fdc; o.comments = this.comments;
    for (let i = 0; i < this.n; i++) for (let c = 0; c < 3; c++) for (let k = 0; k < K; k++)
      o.frest[i * 3 * K + c * K + k] = this.frest[i * 3 * this.K + c * this.K + k];
    return o;
  }
}

const TYPES = { char: [1, "getInt8"], uchar: [1, "getUint8"], short: [2, "getInt16"], ushort: [2, "getUint16"], int: [4, "getInt32"], uint: [4, "getUint32"],
  float: [4, "getFloat32"], double: [8, "getFloat64"], int8: [1, "getInt8"], uint8: [1, "getUint8"], int16: [2, "getInt16"], uint16: [2, "getUint16"],
  int32: [4, "getInt32"], uint32: [4, "getUint32"], float32: [4, "getFloat32"], float64: [8, "getFloat64"] };

/** Parse a binary little-endian PLY. Returns Splats (Gaussian PLY) — a plain point cloud becomes tiny isotropic splats. */
export function readPly(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const head = new TextDecoder().decode(u8.subarray(0, Math.min(u8.length, 65536)));
  const end = head.indexOf("end_header");
  if (!head.startsWith("ply") || end < 0) throw new Error("Not a PLY file");
  const headerLen = head.indexOf("\n", end) + 1;
  const lines = head.slice(0, end).split(/\r?\n/);
  if (!lines.some((l) => l.startsWith("format binary_little_endian"))) throw new Error("Only binary little-endian PLY is supported (convert compressed or ASCII PLY first)");
  let n = 0, inVertex = false, stride = 0;
  const props = [];
  const comments = [];
  for (const l of lines) {
    const t = l.trim().split(/\s+/);
    if (t[0] === "comment") comments.push(l.slice(8));
    if (t[0] === "element") { inVertex = t[1] === "vertex"; if (inVertex) n = Number(t[2]); else if (props.length) break; }
    else if (t[0] === "property" && inVertex) {
      if (t[1] === "list") throw new Error("PLY vertex lists are not supported");
      const [size, getter] = TYPES[t[1]] || [];
      if (!size) throw new Error(`PLY type ${t[1]} not supported`);
      props.push({ name: t[2], offset: stride, getter, size });
      stride += size;
    }
  }
  const idx = Object.fromEntries(props.map((p) => [p.name, p]));
  const restNames = props.map((p) => p.name).filter((s) => s.startsWith("f_rest_")).sort((a, b) => +a.slice(7) - +b.slice(7));
  const K = Math.floor(restNames.length / 3);
  const s = new Splats(n, K);
  s.comments = comments;
  const dv = new DataView(u8.buffer, u8.byteOffset + headerLen, n * stride);
  const get = (p, base) => dv[p.getter](base + p.offset, true);
  const P = (name) => idx[name] || null;
  const px = P("x"), py = P("y"), pz = P("z");
  const sc = [P("scale_0"), P("scale_1"), P("scale_2")], rt = [P("rot_0"), P("rot_1"), P("rot_2"), P("rot_3")];
  const dc = [P("f_dc_0"), P("f_dc_1"), P("f_dc_2")], op = P("opacity");
  const rgb = [P("red") || P("r"), P("green") || P("g"), P("blue") || P("b")];
  const rest = restNames.map((r) => idx[r]);
  const gaussian = !!(dc[0] && op && rt[0]);
  for (let i = 0; i < n; i++) {
    const b = i * stride;
    s.pos[i * 3] = get(px, b); s.pos[i * 3 + 1] = get(py, b); s.pos[i * 3 + 2] = get(pz, b);
    if (gaussian) {
      for (let k = 0; k < 4; k++) s.rot[i * 4 + k] = get(rt[k], b);
      for (let k = 0; k < 3; k++) { s.scale[i * 3 + k] = sc[k] ? get(sc[k], b) : -12; s.fdc[i * 3 + k] = get(dc[k], b); }
      s.opacity[i] = get(op, b);
      for (let k = 0; k < rest.length; k++) s.frest[i * 3 * K + k] = get(rest[k], b);
    } else {
      s.rot[i * 4] = 1;
      for (let k = 0; k < 3; k++) {
        s.scale[i * 3 + k] = Math.log(0.004);
        const c = rgb[k] ? get(rgb[k], b) : 128;
        const v = rgb[k] && rgb[k].getter === "getUint8" ? c / 255 : c;
        s.fdc[i * 3 + k] = (v - 0.5) / SH_C0;
      }
      s.opacity[i] = 2.0;
    }
  }
  return s;
}

/** Write the standard 3DGS PLY layout (x y z nx ny nz f_dc f_rest opacity scale rot), as prepare_splat.py does. */
export function writePly(s, comments = []) {
  const K3 = 3 * s.K;
  const names = ["x", "y", "z", "nx", "ny", "nz", "f_dc_0", "f_dc_1", "f_dc_2"];
  for (let k = 0; k < K3; k++) names.push(`f_rest_${k}`);
  names.push("opacity", "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3");
  const header = ["ply", "format binary_little_endian 1.0", ...[...s.comments, ...comments].map((c) => `comment ${c}`),
    `element vertex ${s.n}`, ...names.map((p) => `property float ${p}`), "end_header", ""].join("\n");
  const hb = new TextEncoder().encode(header);
  const stride = names.length * 4;
  const out = new Uint8Array(hb.length + s.n * stride);
  out.set(hb, 0);
  const dv = new DataView(out.buffer, hb.length);
  for (let i = 0; i < s.n; i++) {
    let o = i * stride;
    const w = (v) => { dv.setFloat32(o, v, true); o += 4; };
    w(s.pos[i * 3]); w(s.pos[i * 3 + 1]); w(s.pos[i * 3 + 2]); w(0); w(0); w(0);
    w(s.fdc[i * 3]); w(s.fdc[i * 3 + 1]); w(s.fdc[i * 3 + 2]);
    for (let k = 0; k < K3; k++) w(s.frest[i * K3 + k]);
    w(s.opacity[i]); w(s.scale[i * 3]); w(s.scale[i * 3 + 1]); w(s.scale[i * 3 + 2]);
    w(s.rot[i * 4]); w(s.rot[i * 4 + 1]); w(s.rot[i * 4 + 2]); w(s.rot[i * 4 + 3]);
  }
  return out;
}

/** A coloured point cloud PLY (x y z red green blue), e.g. the pose solver's sparse points for Brush's init. */
export function writePointsPly(points, colors) {
  const n = points.length / 3;
  const header = `ply\nformat binary_little_endian 1.0\ncomment assembl capture sparse points\nelement vertex ${n}\nproperty float x\nproperty float y\nproperty float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nend_header\n`;
  const hb = new TextEncoder().encode(header);
  const out = new Uint8Array(hb.length + n * 15);
  out.set(hb);
  const dv = new DataView(out.buffer, hb.length);
  for (let i = 0; i < n; i++) {
    dv.setFloat32(i * 15, points[i * 3], true); dv.setFloat32(i * 15 + 4, points[i * 3 + 1], true); dv.setFloat32(i * 15 + 8, points[i * 3 + 2], true);
    dv.setUint8(i * 15 + 12, colors[i * 3]); dv.setUint8(i * 15 + 13, colors[i * 3 + 1]); dv.setUint8(i * 15 + 14, colors[i * 3 + 2]);
  }
  return out;
}

/**
 * Splats from Brush's GPU buffers, read back to the CPU:
 *   transforms  n×10 float32: means(3) | rotation(4, Brush's internal order = PLY rot_0..rot_3) | log-scales(3)
 *   shCoeffs    n×C×3 float32, C = (degree+1)²  (coefficient-major, RGB inner)
 *   rawOpacities n float32 (logit)
 * Matches brush-serde's PLY exporter when the 3D filter is off (min-scale-factor 0, which train.js sets),
 * because the filter's scale floor is not part of these buffers.
 */
export function splatsFromBrushBuffers(transforms, shCoeffs, rawOpacities, n, shDegree) {
  const C = (shDegree + 1) * (shDegree + 1);
  const K = C - 1;
  const s = new Splats(n, K);
  for (let i = 0; i < n; i++) {
    const t = i * 10;
    s.pos[i * 3] = transforms[t]; s.pos[i * 3 + 1] = transforms[t + 1]; s.pos[i * 3 + 2] = transforms[t + 2];
    let r0 = transforms[t + 3], r1 = transforms[t + 4], r2 = transforms[t + 5], r3 = transforms[t + 6];
    const rn = Math.max(1e-12, Math.hypot(r0, r1, r2, r3));
    s.rot[i * 4] = r0 / rn; s.rot[i * 4 + 1] = r1 / rn; s.rot[i * 4 + 2] = r2 / rn; s.rot[i * 4 + 3] = r3 / rn;
    s.scale[i * 3] = transforms[t + 7]; s.scale[i * 3 + 1] = transforms[t + 8]; s.scale[i * 3 + 2] = transforms[t + 9];
    s.opacity[i] = rawOpacities[i];
    const b = i * C * 3;
    for (let c = 0; c < 3; c++) {
      s.fdc[i * 3 + c] = shCoeffs[b + c];
      for (let k = 0; k < K; k++) s.frest[i * 3 * K + c * K + k] = shCoeffs[b + (k + 1) * 3 + c];
    }
  }
  s.comments = ["Trained with Brush (Apache-2.0) in the browser via assembl capture"];
  return s;
}
