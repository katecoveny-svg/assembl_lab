// Pure helpers shared by the art studios. No DOM here, so Node tests can import it.

export const PALETTES = [
  { id: "cubes", name: "Cubes", colours: ["#F6B48E", "#C7B4F0", "#A7DEC7", "#F3A5BE", "#F2DC7C", "#A9C9F2"] },
  { id: "sherbet", name: "Sherbet", colours: ["#FF8FB1", "#FFB36B", "#FFE07A", "#9BE7C4", "#8EC5FF", "#B79CFF"] },
  { id: "pohutukawa", name: "Pōhutukawa", colours: ["#B3122E", "#E2453C", "#F59A6B", "#F6D27A", "#9CC79A", "#2F6B3A"] },
  { id: "moana", name: "Moana", colours: ["#0B3C5D", "#1D7A8C", "#38B6C9", "#A9E4EF", "#F2DC7C", "#F6B48E"] },
  { id: "neon", name: "Neon", colours: ["#FF3CAC", "#7B2FF7", "#2B86C5", "#00E0C6", "#FEE440", "#FF8A3D"] },
  { id: "kowhai", name: "Kōwhai", colours: ["#F7C531", "#F29E1F", "#E46A3B", "#6E8B3D", "#2E4A2A", "#FFF3C4"] },
  { id: "plum", name: "Plum", colours: ["#240B21", "#492B3E", "#916A70", "#C7B4F0", "#F3A5BE", "#F8F4EF"] },
];

export const BACKGROUNDS = [
  { id: "paper", name: "Paper", colour: "#F8F4EF", ink: "#492B3E", dark: false },
  { id: "plum", name: "Plum", colour: "#240B21", ink: "#F8F4EF", dark: true },
  { id: "white", name: "White", colour: "#FFFFFF", ink: "#492B3E", dark: false },
  { id: "night", name: "Night", colour: "#0D1220", ink: "#F8F4EF", dark: true },
];

/** Small, fast, deterministic PRNG (mulberry32). Same seed, same picture. */
export function rng(seed) {
  let a = seed >>> 0 || 1;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  next.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * next());
  next.pick = (list) => list[Math.floor(next() * list.length)];
  next.gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = next();
    while (v === 0) v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return next;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const randomSeed = () => 1 + Math.floor(Math.random() * 999998);

export function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
}
/** Mix a colour toward white (amt > 0) or toward deep plum (amt < 0). */
export function shade(hex, amt) {
  const c = hexToRgb(hex);
  const target = amt >= 0 ? [255, 255, 255] : [36, 11, 33];
  const k = Math.abs(amt);
  return rgbToHex(c.map((v, i) => v + (target[i] - v) * k));
}
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Settings that recreate a starting point. Only these go into a share link:
 * never the picture, never a name or title.
 */
export function encodeState(state, sliders = []) {
  const q = new URLSearchParams();
  q.set("s", String(state.seed));
  q.set("p", PALETTES[state.palette]?.id || "cubes");
  q.set("b", BACKGROUNDS[state.bg]?.id || "paper");
  if (state.start) q.set("k", state.start);
  if (state.tool) q.set("t", state.tool);
  const v = sliders.map((s) => `${s.id}:${Math.round(state.values[s.id] ?? s.value)}`).join(",");
  if (v) q.set("v", v);
  if (state.data) q.set("d", state.data);
  return q.toString();
}

export function decodeState(search, defaults, sliders = [], starts = [], tools = []) {
  const q = new URLSearchParams(search);
  const out = { ...defaults, values: { ...defaults.values } };
  const seed = parseInt(q.get("s"), 10);
  if (Number.isFinite(seed) && seed > 0 && seed < 1e9) out.seed = seed;
  const p = PALETTES.findIndex((x) => x.id === q.get("p"));
  if (p >= 0) out.palette = p;
  const b = BACKGROUNDS.findIndex((x) => x.id === q.get("b"));
  if (b >= 0) out.bg = b;
  const k = q.get("k");
  if (k && starts.some((s) => s.id === k)) out.start = k;
  const t = q.get("t");
  if (t && tools.some((s) => s.id === t)) out.tool = t;
  for (const pair of (q.get("v") || "").split(",")) {
    const [id, raw] = pair.split(":");
    const def = sliders.find((s) => s.id === id);
    const n = parseFloat(raw);
    if (def && Number.isFinite(n)) out.values[id] = clamp(n, def.min, def.max);
  }
  const d = q.get("d");
  if (d && /^[A-Za-z0-9_-]{1,3000}$/.test(d)) out.data = d;
  return out;
}

export function bytesToB64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return (typeof btoa === "function" ? btoa(s) : Buffer.from(s, "binary").toString("base64"))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function b64urlToBytes(str) {
  const b = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = typeof atob === "function" ? atob(b) : Buffer.from(b, "base64").toString("binary");
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Fit a w×h picture inside a box, keeping its shape. */
export function contain(w, h, bw, bh) {
  const k = Math.min(bw / w, bh / h);
  return { w: Math.round(w * k), h: Math.round(h * k), x: Math.round((bw - w * k) / 2), y: Math.round((bh - h * k) / 2) };
}

/** Output size for a high-resolution PNG that keeps the on-screen shape. */
export function exportSize(cssW, cssH, factor = 2, maxEdge = 4096) {
  let w = Math.round(cssW * factor), h = Math.round(cssH * factor);
  const k = Math.min(1, maxEdge / Math.max(w, h));
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

/** A4 portrait at 300 dpi. */
export const A4 = { w: 2480, h: 3508, dpi: 300 };

export function niceDate(d = new Date()) {
  return d.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" });
}
