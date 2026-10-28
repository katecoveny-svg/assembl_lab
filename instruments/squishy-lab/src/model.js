import * as T from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
export const shapes = {
  pebble: "Pillow pebble",
  cloud: "Pocket cloud",
  halo: "Halo puff",
  star: "Star pillow",
};
export const patterns = ["blend", "stripes", "swirl", "speckles"];
export const finishes = ["gloss", "matte", "pearl"];
export const defaults = {
  shape: "cloud",
  colorA: "#ed799c",
  colorB: "#f6d580",
  mix: 0.5,
  pattern: "blend",
  finish: "gloss",
  spring: 0.5,
  squish: 0.7,
  rebound: 0.45,
};
export const recipes = {
  "Berry cloud": { ...defaults },
  "Mint ripple": {
    ...defaults,
    shape: "halo",
    colorA: "#79cbb5",
    colorB: "#efe9b7",
    pattern: "stripes",
    finish: "pearl",
    spring: 0.7,
  },
  "Moon pillow": {
    ...defaults,
    shape: "star",
    colorA: "#aaa4e1",
    colorB: "#e9c7e8",
    pattern: "swirl",
    finish: "matte",
    rebound: 0.25,
  },
  "Peach pebble": {
    ...defaults,
    shape: "pebble",
    colorA: "#f3a77c",
    colorB: "#dd708f",
    pattern: "speckles",
    squish: 0.9,
  },
};
function form(g, shape) {
  if (shape === "halo") return g;
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      a = Math.atan2(z, x),
      equator = Math.max(0, 1 - Math.abs(y) / 1.1);
    let f =
      shape === "star"
        ? 1 + 0.24 * Math.cos(5 * a) * equator
        : shape === "cloud"
          ? 1 + 0.17 * Math.cos(3 * a) * equator
          : 1 + 0.035 * Math.sin(a * 2);
    p.setXYZ(
      i,
      x * f * (shape === "cloud" ? 1.1 : 1),
      y * (shape === "star" ? 0.65 : 0.85),
      z * f * 0.85,
    );
  }
  return g;
}
export function cage(shape) {
  let g = form(
    shape === "halo"
      ? new T.TorusGeometry(0.8, 0.34, 10, 18)
      : new T.IcosahedronGeometry(1.1, 2),
    shape,
  );
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  let welded = mergeVertices(g);
  g.dispose();
  return welded;
}
export function skin(shape) {
  return form(
    shape === "halo"
      ? new T.TorusGeometry(0.8, 0.34, 24, 64)
      : new T.SphereGeometry(1.1, 48, 32),
    shape,
  );
}
const counts = Object.fromEntries(
  Object.keys(shapes).map((s) => {
    const g = cage(s),
      n = g.attributes.position.array.length;
    g.dispose();
    return [s, n];
  }),
);
function exact(o, keys) {
  if (
    !o ||
    typeof o !== "object" ||
    Array.isArray(o) ||
    Object.keys(o).sort().join("|") !== keys.slice().sort().join("|")
  )
    throw Error("Unexpected project fields.");
}
function numbers(a, n, bound) {
  if (
    !Array.isArray(a) ||
    a.length !== n ||
    !a.every(
      (x) =>
        typeof x === "number" && Number.isFinite(x) && Math.abs(x) <= bound,
    )
  )
    throw Error("Invalid saved geometry or view.");
}
export function validateProject(p) {
  exact(p, ["format", "version", "design", "pose", "view"]);
  if (p.format !== "assembl-squishy-project" || p.version !== 1)
    throw Error("Unsupported Squishy Lab project version.");
  const d = p.design;
  exact(d, Object.keys(defaults));
  if (
    !Object.hasOwn(shapes, d.shape) ||
    !patterns.includes(d.pattern) ||
    !finishes.includes(d.finish)
  )
    throw Error("Unknown shape or finish.");
  for (const k of ["colorA", "colorB"])
    if (typeof d[k] !== "string" || !/^#[0-9a-f]{6}$/i.test(d[k]))
      throw Error("Invalid colour.");
  for (const k of ["mix", "spring", "squish", "rebound"])
    if (
      typeof d[k] !== "number" ||
      !Number.isFinite(d[k]) ||
      d[k] < 0 ||
      d[k] > 1
    )
      throw Error("Invalid mix or feel setting.");
  numbers(p.pose, counts[d.shape], 6);
  exact(p.view, ["position", "target"]);
  numbers(p.view.position, 3, 20);
  numbers(p.view.target, 3, 4);
  if (Math.hypot(...p.view.position.map((v, i) => v - p.view.target[i])) < 1)
    throw Error("Camera is too close.");
  return structuredClone(p);
}
