/** Ideal small-angle pendulum. SI units; angle input is cycle phase in degrees.
 * theta=A cos(phi), omega=sqrt(g/L), v=L thetaDot.
 * U=mgL theta²/2 is the small-angle energy, NOT exact mgh.
 * No friction, air drag, finite bob inertia, support motion or escapement drive.
 */
export const G = 9.81;
export const SPEC = {length: 0.6, mass: 0.5, amplitude: 8};
const radians = Math.PI / 180;
const bounded = (x, lo, hi, fallback) => Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : fallback;
export function at(phase, inputs = {}) {
  const length = bounded(inputs.length, 0.3, 1, SPEC.length);
  const mass = bounded(inputs.mass, 0.1, 1, SPEC.mass);
  const amplitude = bounded(inputs.amplitude, 2, 10, SPEC.amplitude);
  const theta = ((Number.isFinite(phase) ? phase : 0) % 360 + 360) % 360;
  const phi = theta * radians;
  const A = amplitude * radians;
  const omega = Math.sqrt(G / length);
  const angle = A * Math.cos(phi);
  const angularVelocity = -A * omega * Math.sin(phi);
  const speed = length * angularVelocity;
  const U = 0.5 * mass * G * length * angle * angle;
  const K = 0.5 * mass * speed * speed;
  const E = 0.5 * mass * G * length * A * A;
  return {theta, length, mass, amplitude, angle, angleDegrees: angle / radians, angularVelocity,
    speed, U, K, E, period: 2 * Math.PI / omega, frequency: omega / (2 * Math.PI),
    x: length * Math.sin(angle), y: -length * Math.cos(angle),
    torque: -mass * G * length * angle,
    stage: Math.abs(speed) < 1e-8 ? 'Turning point' : Math.abs(angle) < 1e-8 ? 'Lowest point' : speed < 0 ? 'Swinging left' : 'Swinging right'};
}
export function checks() {
  const turning = at(0, {length: 1, mass: 1, amplitude: 10});
  const centre = at(90, {length: 1, mass: 1, amplitude: 10});
  return [
    {name: '1 m pendulum period', got: turning.period, want: 2.0060666807, unit: 's', tol: 1e-9},
    {name: 'Speed at turning point', got: turning.speed, want: 0, abs: true, tol: 1e-12, unit: 'm/s'},
    {name: '10° amplitude: maximum speed magnitude', got: Math.abs(centre.speed), want: 0.5466531705, unit: 'm/s', tol: 1e-8},
    {name: 'Energy at lowest point equals initial energy', got: centre.K, want: turning.U, unit: 'J', tol: 1e-12},
  ];
}
