/* Ideal rotating-coil generator. Geometry is an illustrative 20 cm × 16 cm loop.
   Uniform field along +x, normal initially +x; coil rotates about +y.
   No resistance in the winding, no inductance, no friction; purely resistive load. */
export const SPEC = Object.freeze({width: .20, height: .16, turns: 100, field: .2, rpm: 120, resistance: 20});
const bounded = (v, d, a, b) => Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : d;
export function at(theta, input = {}) {
  const phase = ((Number.isFinite(theta) ? theta : 0) % 360 + 360) % 360;
  const angle = phase * Math.PI / 180;
  const rpm = bounded(input.rpm, SPEC.rpm, 0, 600);
  const B = bounded(input.field, SPEC.field, 0, .8);
  const R = bounded(input.resistance, SPEC.resistance, 5, 100);
  const N = SPEC.turns, A = SPEC.width * SPEC.height, omega = rpm * 2 * Math.PI / 60;
  const flux = B * A * Math.cos(angle), linkage = N * flux;
  const peak = N * B * A * omega, emf = peak * Math.sin(angle);
  const current = emf / R, power = emf * current;
  const torque = omega > 0 ? power / omega : 0;
  return {phase, theta:phase, angle, rpm, B, R, N, A, omega, flux, linkage, peak, emf, current, power, torque,
    rms: peak / Math.sqrt(2), meanPower: peak * peak / (2 * R), frequency: rpm / 60,
    direction: Math.abs(emf) < 1e-9 ? 'Zero crossing' : emf > 0 ? 'Positive half-cycle' : 'Negative half-cycle'};
}
export function checks() {
  return [
    {name:'Loop area: 0.20 × 0.16', got:at(0).A, want:.032, unit:'m²', tol:1e-12,d:3},
    {name:'Maximum flux linkage: 100 × 0.2 × 0.032',got:at(0).linkage,want:.64,unit:'Wb-turn',tol:1e-12,d:2},
    {name:'Quarter turn emf: N B A ω',got:at(90).emf,want:.64 * 4 * Math.PI,unit:'V',tol:1e-10,d:3},
    {name:'No motion means no generated emf',got:at(90,{rpm:0}).emf,want:0,unit:'V',tol:1e-12,d:1},
    {name:'Half-turn reverses the output',got:at(270).emf,want:-at(90).emf,unit:'V',tol:1e-12,d:3},
  ];
}
