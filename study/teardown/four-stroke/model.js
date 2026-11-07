/* The four-stroke model. One input, the crank angle θ over the 720° cycle, drives every pose and every number.
   No three.js in here, so Node can test it (tools/study-teardown/tests/four-stroke.test.mjs).

   Units: mm, cm³, bar, K, J, N·m. θ = 0 is top dead centre (TDC) at the start of the intake stroke.

   What is real and what is simplified:
   - Stated: bore 68 mm, stroke 45 mm, compression ratio 9.0 : 1, 3,600 rpm. These are the published figures for a
     common 163 cm³ single-cylinder garden and generator engine (manufacturer spec sheet, see SOURCES).
   - Exact: piston position from the slider-crank, x = r + l − (r cos θ + √(l² − r² sin² θ)).
   - Assumed: connecting rod 75 mm, valve lift 6 mm. Not published; picked to look like a small engine.
   - Simplified: the gas follows the ideal air-standard Otto cycle (ideal gas, γ = 1.4, no heat loss, an instant
     burn at TDC, valves that open and close exactly at the dead centres). Real engines burn over many degrees, open
     their valves early and close them late, and lose heat to the walls, so real pressures and efficiency are lower.
   - Illustrative: heat added, 800 kJ per kg of air, a common textbook teaching value. You can change it. */

export const SPEC = {bore: 68, stroke: 45, cr: 9.0, rpm: 3600, cc: 163};
export const ASSUMED = {rod: 75, liftMax: 6};
export const GAS = {p1: 1.0, T1: 300, gamma: 1.4, cv: 718, R: 287};
export const STROKES = ['Intake', 'Compression', 'Power', 'Exhaust'];
export const BANDS = STROKES.map((label, i) => ({from: i * 180, to: (i + 1) * 180, label}));

const D2R = Math.PI / 180;
const mod = (a, m) => ((a % m) + m) % m;
export const r = SPEC.stroke / 2; // crank radius, mm
export const l = ASSUMED.rod; // rod length, mm
export const AREA = (Math.PI * SPEC.bore * SPEC.bore) / 4; // mm²
export const VD = AREA * SPEC.stroke; // swept volume, mm³

/** piston distance below TDC in mm (0 at TDC, 45 at BDC): the exact slider-crank */
export const pistonX = (th) => {
  const a = th * D2R;
  return r + l - (r * Math.cos(a) + Math.sqrt(l * l - r * r * Math.sin(a) ** 2));
};
/** connecting-rod angle from the cylinder axis, degrees */
export const rodAngle = (th) => Math.asin((r * Math.sin(th * D2R)) / l) / D2R;
/** clearance volume (mm³) for a compression ratio: V1 / V2 = cr, V1 = Vd + Vc */
export const clearance = (cr) => VD / (cr - 1);

/** valve lift in mm: a smooth sin² bump between opening and closing (simplified timing, dead centre to dead centre) */
const bump = (c, a, b) => (c >= a && c <= b ? ASSUMED.liftMax * Math.sin((Math.PI * (c - a)) / (b - a)) ** 2 : 0);
export const VALVES = {intake: [0, 180], exhaust: [540, 720]};

/** Everything constant over one cycle for these inputs. */
export function cycle(inp = {}) {
  const cr = inp.cr ?? SPEC.cr;
  const q = inp.spark === false ? 0 : (inp.q ?? 800) * 1000; // J per kg of air
  const {p1, T1, gamma: g, cv, R} = GAS;
  const Vc = clearance(cr);
  const V1 = VD + Vc;
  const m = (p1 * 1e5 * V1 * 1e-9) / (R * T1); // kg of air in the cylinder
  const T2 = T1 * Math.pow(cr, g - 1);
  const p2 = p1 * Math.pow(cr, g);
  const T3 = T2 + q / cv;
  const p3 = (p2 * T3) / T2;
  const T4 = T3 / Math.pow(cr, g - 1);
  const p4 = (p3 * Math.pow(1 / cr, g));
  const W = m * cv * (T3 - T4 - (T2 - T1)); // J per cycle, the textbook result
  const eta = 1 - 1 / Math.pow(cr, g - 1);
  return {cr, q, Vc, V1, m, T2, p2, T3, p3, T4, p4, W, eta, Qin: m * q};
}

/** The state at crank angle θ (any real number; wrapped to 0..720). */
export function at(theta, inp = {}) {
  const c = mod(theta, 720);
  const K = cycle(inp);
  const x = pistonX(c);
  const Vmm = K.Vc + AREA * x;
  const {p1, T1, gamma: g} = GAS;
  const si = Math.min(3, Math.floor(c / 180));
  let p;
  let T = NaN;
  if (si === 0) {
    p = p1;
    T = T1;
  } else if (si === 1) {
    p = p1 * Math.pow(K.V1 / Vmm, g);
    T = T1 * Math.pow(K.V1 / Vmm, g - 1);
  } else if (si === 2) {
    p = K.p3 * Math.pow(K.Vc / Vmm, g);
    T = K.T3 * Math.pow(K.Vc / Vmm, g - 1);
  } else {
    p = p1; // exhaust: open to the pipe (the air-standard cycle does not model the gas temperature here)
  }
  const phi = rodAngle(c);
  const F = (p - p1) * 1e5 * AREA * 1e-6; // N on the crown, gauge (atmosphere is under the piston)
  const torque = (F * (r / 1000) * Math.sin((c + phi) * D2R)) / Math.cos(phi * D2R); // N·m on the crank
  const liftIn = bump(c, ...VALVES.intake);
  const liftEx = bump(c, ...VALVES.exhaust);
  const sparking = inp.spark !== false && c >= 356 && c < 372;
  const charge = si === 0 ? 'fresh' : si === 1 ? 'compressed' : si === 2 ? (c < 400 && inp.spark !== false ? 'burning' : 'expanding') : 'exhaust';
  return {
    theta: c, crank: mod(c, 360), cam: c / 2, strokeIndex: si, stroke: STROKES[si],
    x, V: Vmm / 1000, p, T, phi, F, torque, liftIn, liftEx, sparking, charge,
    cr: K.cr, W: K.W, eta: K.eta, p2: K.p2, p3: K.p3, Qin: K.Qin, m: K.m,
    headShift: (K.Vc - clearance(SPEC.cr)) / AREA, // mm the head sits higher or lower than at 9.0 : 1
  };
}

/** Work per cycle two independent ways: ∮ p dV and ∫ τ dθ. They must agree with each other and with cycle().W. */
export function integrate(inp = {}, n = 7200) {
  let pdv = 0;
  let tdth = 0;
  let prev = at(0, inp);
  for (let i = 1; i <= n; i++) {
    const th = (i / n) * 720 - 1e-9; // stay inside the cycle so the last step is not wrapped back to θ = 0
    const s = at(th, inp);
    pdv += ((prev.p + s.p) / 2) * 1e5 * (s.V - prev.V) * 1e-6;
    tdth += ((prev.torque + s.torque) / 2) * ((720 / n) * D2R);
    prev = s;
  }
  return {pdv, tdth};
}

/** Numbers checked by hand (the teardown rule: check one number yourself). */
export function checks(inp = {}) {
  const K = cycle(inp);
  const I = integrate(inp, 3600);
  const motor = integrate({...inp, spark: false}, 3600);
  return [
    {name: 'Swept volume, π/4 × 68² × 45 mm, against the spec sheet', got: VD / 1000, want: SPEC.cc, unit: 'cm³', tol: 0.01, d: 1},
    {name: 'Piston travel from TDC to BDC equals the stroke', got: pistonX(180), want: SPEC.stroke, unit: 'mm', tol: 1e-9, d: 2},
    {name: 'Volume at BDC ÷ volume at TDC equals the compression ratio', got: at(180, inp).V / at(0, inp).V, want: K.cr, unit: '', tol: 1e-6, d: 2},
    {name: 'Pressure at the end of compression, p₁ × r^1.4', got: at(359.999, inp).p, want: GAS.p1 * Math.pow(K.cr, 1.4), unit: 'bar', tol: 1e-3, d: 2},
    {name: 'The loop closes: pressure at 0° equals pressure at 720°', got: at(0, inp).p, want: at(719.999, inp).p, unit: 'bar', tol: 1e-6, d: 2},
    {name: 'Work from the loop area ∮p dV against the formula', got: I.pdv, want: K.W, unit: 'J', tol: 0.01, d: 1},
    {name: 'Work from the crank torque ∫τ dθ against ∮p dV', got: I.tdth, want: I.pdv, unit: 'J', tol: 0.01, d: 1},
    {name: 'Efficiency W ÷ heat added against 1 − 1/r^0.4', got: K.Qin ? K.W / K.Qin : K.eta, want: K.eta, unit: '', tol: 1e-6, d: 3},
    {name: 'Spark cut: the loop collapses and the net work is zero', got: motor.pdv, want: 0, unit: 'J', tol: 0.05, abs: true, d: 2},
  ];
}
