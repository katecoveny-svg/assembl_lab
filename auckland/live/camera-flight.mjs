// Local NZTM camera motion. Log-distance avoids a dead long approach and a rush at landing.
const clamp = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => { t = clamp(t); return t * t * t * (t * (6 * t - 15) + 10); };
const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function flightPose(start, end, progress) {
  const k = clamp(progress);
  const aim = ease(k), turn = ease((k - 0.10) / .83), pitchPhase = ease((k - .24) / .76);
  const distance = Math.exp(lerp(Math.log(start.distance), Math.log(end.distance), ease(k / .98)));
  const bearing = start.bearing + angleDelta(start.bearing, end.bearing) * turn;
  const pitch = lerp(start.pitch, end.pitch, pitchPhase) + Math.sin(Math.PI * k) ** 2 * .07;
  const fov = lerp(start.fov, end.fov, ease(k)) - Math.sin(Math.PI * k) ** 2 * 4;
  const target = start.target.map((v, i) => lerp(v, end.target[i], aim));
  const horizontal = distance * Math.cos(pitch);
  return { target, fov, position: [target[0] + horizontal * Math.sin(bearing), target[1] + distance * Math.sin(pitch), target[2] + horizontal * Math.cos(bearing)] };
}

export function cameraPose(target, position, fov) {
  const d = position.map((v, i) => v - target[i]), distance = Math.max(1, Math.hypot(...d));
  return {target, distance, fov, bearing: Math.atan2(d[0], d[2]), pitch: Math.atan2(d[1], Math.hypot(d[0],d[2]))};
}
