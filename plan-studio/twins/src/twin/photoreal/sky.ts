// The daylight sky for the photoreal look: one radiance map used three ways, so they agree: the bake traces it, the
// live view reflects it (scene.environment) and its brightness is set against the sun. Pure arrays, no three.js.
//
// Colours by elevation follow the page's own painted day sky (editorial.ts) so the photoreal look keeps its palette;
// the glow sits round the real sun. Brightness is calibrated, not guessed: the open sky's irradiance on a level
// surface is set to SKY_RATIO of the sun's irradiance square to its rays. 0.18 is a clear-to-lightly-hazy coastal day
// (diffuse-horizontal over direct-normal irradiance is roughly 0.12 under a very clear sky, 0.25 in haze).

export const SKY_RATIO = 0.18;

const STOPS: [number, number, number, number][] = [
  // v from the top of the painted sky (0 = zenith, 0.5 = horizon, 1 = nadir), sRGB
  [0, 0x2f, 0x74, 0xc4], [0.3, 0x7d, 0xb4, 0xe6], [0.47, 0xd9, 0xeb, 0xf7], [0.5, 0xee, 0xf6, 0xfb],
  [0.53, 0xaa, 0xb4, 0xa0], [0.62, 0x72, 0x7a, 0x5c], [1, 0x3c, 0x4a, 0x33],
];
const lin = (c: number) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };

/** linear RGB of the painted gradient at elevation `el` (radians) */
export function gradient(el: number, out: number[]) {
  const v = 0.5 - el / Math.PI;
  let i = 0;
  while (i < STOPS.length - 2 && v > STOPS[i + 1][0]) i++;
  const a = STOPS[i], b = STOPS[i + 1], t = Math.max(0, Math.min(1, (v - a[0]) / (b[0] - a[0])));
  for (let k = 0; k < 3; k++) out[k] = lin(a[k + 1]) * (1 - t) + lin(b[k + 1]) * t;
}

export interface SkyBuild {
  w: number;
  h: number;
  data: Float32Array;
  /** scale applied to the painted colours to meet SKY_RATIO */
  scale: number;
  /** irradiance on a level surface from the open sky (upper hemisphere), luminance */
  horizontal: number;
}

/**
 * @param sunDir unit vector towards the sun (world, y up)
 * @param sunE sun irradiance square to its rays, linear RGB (light colour × intensity)
 */
export function buildSky(sunDir: [number, number, number], sunE: [number, number, number], w = 128, h = 64, ratio = SKY_RATIO): SkyBuild {
  const data = new Float32Array(w * h * 3);
  const c = [0, 0, 0];
  for (let j = 0; j < h; j++) {
    const el = ((j + 0.5) / h - 0.5) * Math.PI;
    gradient(el, c);
    for (let i = 0; i < w; i++) {
      const ph = ((i + 0.5) / w - 0.5) * 2 * Math.PI;
      const x = Math.cos(ph) * Math.cos(el), y = Math.sin(el), z = Math.sin(ph) * Math.cos(el);
      const cos = x * sunDir[0] + y * sunDir[1] + z * sunDir[2];
      // circumsolar glow (a broad forward-scattering lobe) and a brighter horizon band on the sun's side
      const g = y > -0.02 ? 0.9 * Math.pow(Math.max(0, cos), 8) + 0.25 * Math.pow(Math.max(0, cos), 2) * (1 - Math.abs(y)) : 0;
      const o = (j * w + i) * 3;
      data[o] = c[0] * (1 + g * 1.0); data[o + 1] = c[1] * (1 + g * 0.92); data[o + 2] = c[2] * (1 + g * 0.78);
    }
  }
  // calibrate: irradiance on a level surface E = ∫ L cosθ dω over the upper hemisphere
  let E = 0;
  for (let j = h >> 1; j < h; j++) {
    const el0 = (j / h - 0.5) * Math.PI, el1 = ((j + 1) / h - 0.5) * Math.PI, el = (el0 + el1) / 2;
    const dOmega = (2 * Math.PI / w) * (Math.sin(el1) - Math.sin(el0));
    for (let i = 0; i < w; i++) {
      const o = (j * w + i) * 3;
      E += (0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]) * Math.sin(el) * dOmega;
    }
  }
  const sunL = 0.2126 * sunE[0] + 0.7152 * sunE[1] + 0.0722 * sunE[2];
  const scale = E > 0 ? (ratio * sunL) / E : 1;
  for (let k = 0; k < data.length; k++) data[k] *= scale;
  return { w, h, data, scale, horizontal: E * scale };
}
