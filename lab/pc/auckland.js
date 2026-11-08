// Terrain-only form from offline LINZ national DEM overview sampling. See linz-terrain.json for provenance.
// Heights exaggerated 5x; no building heights or modelled landmarks. Not raw LiDAR returns.
import { makeForm } from "./engine.js";

const BASE = "/assets/models/auckland/linz-terrain";
let headerP = null;
export const aucklandHeader = () => (headerP ??= fetch(BASE + ".json").then((r) => { if (!r.ok) throw new Error("auckland header " + r.status); return r.json(); }));

export async function aucklandForm(n = 300000) {
  const h = await aucklandHeader(), want = Math.min(n, h.count), bytes = want * h.stride;
  const r = await fetch(BASE + ".bin", { headers: want < h.count ? { Range: `bytes=0-${bytes - 1}` } : {} });
  if (!r.ok) throw new Error("auckland points " + r.status);
  const buf = await r.arrayBuffer(), got = Math.min(want, Math.floor(buf.byteLength / h.stride)), v = new DataView(buf), f = makeForm(got);
  const [x0, x1] = h.bounds.x, [y0, y1] = h.bounds.y, [z0, z1] = h.bounds.z, q = 1 / 65535;
  for (let i = 0; i < got; i++) {
    const o = i * h.stride;
    f.pos[i * 3] = x0 + (x1 - x0) * v.getUint16(o, true) * q; f.pos[i * 3 + 1] = y0 + (y1 - y0) * v.getUint16(o + 2, true) * q; f.pos[i * 3 + 2] = z0 + (z1 - z0) * v.getUint16(o + 4, true) * q;
    f.light[i] = v.getUint8(o + 6) / 255; f.kind[i] = v.getUint8(o + 7);
  }
  f.anchors = Object.fromEntries(Object.entries(h.anchors).map(([k, a]) => [k, a.slice()]));
  f.sites = Object.fromEntries(Object.entries(h.sites || {}).map(([k, st]) => [k, st.anchor.slice()]));   // twin id → roof top of its example site
  f.sitesGround = Object.fromEntries(Object.entries(h.sites || {}).map(([k, st]) => [k, (st.ground || st.anchor).slice()]));   // the plot's centre on the ground
  f.sitesPlot = Object.fromEntries(Object.entries(h.sites || {}).map(([k, st]) => [k, st.plot || 0.003]));                   // the plot's radius
  f.height = y1; f.header = h;
  return f;
}
