// A thrown stoneware vessel as a signed-distance shape, for the photoreal look's coffee table: a lobed body of
// revolution that twists gently as it rises, hollow with a rolled lip, on a thick base. It is meshed with the asset
// library's marching cubes (library/sdf.ts mesh()). Pure: no three.js, so the tests mesh it under node.
import type { SDF } from '../library/sdf.ts';

const smin = (a: number, b: number, k: number) => { const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k)); return b * (1 - h) + a * h - k * h * (1 - h); };
const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);

/** height H metres; base at y = 0 */
export function vesselSDF(H = 0.28): SDF {
  const prof = (t: number) => {
    const belly = 0.36 * Math.exp(-(((t - 0.36) / 0.26) ** 2));
    const neck = 0.16 + 0.05 * Math.exp(-(((t - 0.9) / 0.08) ** 2));
    return (Math.max(neck, 0.13 + belly) + 0.02 * Math.sin(t * 9)) * H * 0.62;
  };
  return (x, y, z) => {
    const t = y / H, th = Math.atan2(z, x);
    const lobes = 1 + 0.07 * Math.sin(5 * th + 2.6 * t) * Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
    // a turned foot, 55 mm in radius at the base, swelling into the belly, so it sits squarely on a table
    const tf = Math.min(1, Math.max(0, (t - 0.04) / 0.16)), foot = 0.055 * (1 - tf * tf * (3 - 2 * tf));
    const r = Math.max(prof(Math.min(1, Math.max(0, t))) * lobes, foot), q = Math.hypot(x, z);
    const body = smax((q - r) * 0.8, smax(-y, y - H, 0.006), 0.01);
    // hollow from the lip down to a 25 mm base, wall 8 mm; the smooth blend rolls the lip
    const inner = smax((q - (r - 0.008)) * 0.8, 0.025 - y, 0.006);
    return smax(body, -inner, 0.004);
  };
}
export const VESSEL_BOX: { min: [number, number, number]; max: [number, number, number] } = { min: [-0.13, -0.02, -0.13], max: [0.13, 0.3, 0.13] };
