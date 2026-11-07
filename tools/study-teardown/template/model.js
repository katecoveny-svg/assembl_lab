/* {{TITLE}}: the model. One input, the phase of the cycle (here the crank angle θ, 0–360°), drives every pose and
   every number. No three.js in here, so Node can test it.

   STARTER: this is an exact crank and slider (a piston pump, a sewing machine needle, a steam engine's crosshead).
   Replace it with the real mechanism from your reference. For every value, write down where it came from:
   - Stated: a published dimension (name the source in main.js `sources`)
   - Exact: geometry or a law that holds for these numbers
   - Assumed / Illustrative: a value you picked; say so on screen
   - Simplified: a model that leaves something out; say what */

export const SPEC = {crank: 30, rod: 100}; // mm. TODO: real dimensions from the reference, with the source
const D2R = Math.PI / 180;

/** slider distance in from its outermost point, mm (0 at θ = 0, 2r at 180°; exact for these lengths) */
export const sliderX = (th) => {
  const {crank: r, rod: l} = SPEC;
  const a = th * D2R;
  return r + l - (r * Math.cos(a) + Math.sqrt(l * l - (r * Math.sin(a)) ** 2));
};

/** The state at phase θ. Everything the console shows must come from here. */
export function at(theta, inp = {}) {
  const th = ((theta % 360) + 360) % 360;
  const {crank: r, rod: l} = SPEC;
  const rpm = inp.rpm ?? 60;
  const w = (rpm * 2 * Math.PI) / 60; // rad/s
  const h = 0.01;
  const v = ((sliderX(th + h) - sliderX(th - h)) / (2 * h)) * (w / D2R) / 1000; // m/s, dx/dθ × dθ/dt
  return {
    theta: th, x: sliderX(th), v, rpm,
    phi: Math.asin((r * Math.sin(th * D2R)) / l) / D2R, // rod angle, degrees
    phase: th, half: th < 180 ? 'Inward stroke' : 'Outward stroke',
  };
}

/** Numbers checked by hand: at least one per real dimension. */
export function checks() {
  return [
    {name: 'Slider travel from 0° to 180° equals twice the crank', got: sliderX(180), want: 2 * SPEC.crank, unit: 'mm', tol: 1e-9, d: 1},
    {name: 'The cycle closes: position at 0° equals position at 360°', got: sliderX(0), want: sliderX(360), unit: 'mm', tol: 1e-9, abs: true, d: 2},
  ];
}
