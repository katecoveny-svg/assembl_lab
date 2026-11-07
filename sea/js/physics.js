// assembl lab · Sea state: the boat as a rigid body. Buoyancy is sampled at points across the hull bottom against the true sea
// height (the CPU twin of the shader), so the boat heaves, pitches and rolls on the waves you see. Thrust acts at the stern, the
// outboard or rudder side-force turns it, drag is quadratic forward and stiff sideways, and a planing hull gains lift with speed.
import * as THREE from "three";
import { G, heightAt } from "./waves.js";

const RHO = 1025;   // sea water, kg/m³
export function createBody(phys) {
  const [B, Hh, L] = phys.dims, m = phys.mass;
  return {
    phys, pos: new THREE.Vector3(0, 0, 0), q: new THREE.Quaternion(), vel: new THREE.Vector3(), w: new THREE.Vector3(),
    I: new THREE.Vector3((m * (L * L + Hh * Hh)) / 12, (m * (L * L + B * B)) / 12, (m * (B * B + Hh * Hh)) / 12),   // pitch (x), yaw (y), roll (z)
    area: (m / (RHO * 0.32)),                                        // total plan area the points share: settles at ~0.32 m immersion
    throttle: 0, steer: 0, wet: 0, speed: 0, seatVy: 0, seatA: 0, ride: 0, slams: 0, t: 0,
  };
}

const _p = new THREE.Vector3(), _r = new THREE.Vector3(), _v = new THREE.Vector3(), _f = new THREE.Vector3(), _tau = new THREE.Vector3(), _tmp = new THREE.Vector3();
const _fwd = new THREE.Vector3(), _side = new THREE.Vector3(), _up = new THREE.Vector3(), _qi = new THREE.Quaternion();

function applyAt(force, point, body, F, T) { F.add(force); _r.subVectors(point, body.pos); T.add(_tmp.crossVectors(_r, force)); }

export function step(body, waves, t, dt) {
  const P = body.phys, m = P.mass, F = new THREE.Vector3(0, -m * G, 0), T = new THREE.Vector3();
  _fwd.set(0, 0, -1).applyQuaternion(body.q); _side.set(1, 0, 0).applyQuaternion(body.q); _up.set(0, 1, 0).applyQuaternion(body.q);
  // buoyancy and heave damping at each sample point
  let wetSum = 0;
  for (const s of P.points) {
    _p.copy(s.p).applyQuaternion(body.q).add(body.pos);
    const h = heightAt(waves, _p.x, _p.z, t), sub = Math.min(Math.max(h - _p.y, 0), P.smax);
    if (sub <= 0) continue;
    wetSum += s.w * Math.min(1, sub / 0.25);
    const A = body.area * s.w;
    _f.set(0, RHO * G * A * sub, 0);
    _v.crossVectors(body.w, _r.subVectors(_p, body.pos)).add(body.vel);
    const wv = (heightAt(waves, _p.x, _p.z, t + 0.03) - heightAt(waves, _p.x, _p.z, t - 0.03)) / 0.06;   // the water's own heave
    _f.y += -A * 2600 * (_v.y - wv) * Math.min(1, sub / 0.2);
    applyAt(_f, _p, body, F, T);
  }
  body.wet = wetSum;
  // body-frame velocity
  const vf = body.vel.dot(_fwd), vs = body.vel.dot(_side), wet = Math.min(1, wetSum * 1.6);
  body.speed = vf;
  // thrust at the stern, just under the waterline (only when the props are in the water)
  _p.set(0, P.propY ?? -0.45, P.sternZ).applyQuaternion(body.q).add(body.pos);
  const sternWet = heightAt(waves, _p.x, _p.z, t) > _p.y - 0.1 ? 1 : 0.15;
  applyAt(_tmp.copy(_fwd).multiplyScalar(body.throttle * P.thrust * sternWet), _p, body, F, T);
  // the outboard / rudder: a side force at the stern that grows with speed through the water
  const steerF = -body.steer * P.lat * 0.06 * (Math.abs(vf) + 1.2) * (P.yaw) * wet;
  applyAt(_tmp.copy(_side).multiplyScalar(steerF), _p, body, F, T);
  // drag: quadratic forward, tuned so full thrust reaches vmax; stiff sideways (the hull's grip); planing lift with speed
  const c2 = (P.thrust * 0.88) / (P.vmax * P.vmax), c1 = (P.thrust * 0.12) / P.vmax;
  F.addScaledVector(_fwd, -(c1 * vf + c2 * vf * Math.abs(vf)) * wet);
  F.addScaledVector(_side, -P.lat * vs * wet - P.lat * 0.05 * vs * Math.abs(vs) * wet);
  if (P.planing > 0) {
    const lift = Math.min(1, (vf * vf) / (P.vmax * P.vmax)) * P.planing * m * G * wet;
    _p.set(0, -0.2, P.sternZ * 0.25).applyQuaternion(body.q).add(body.pos);
    applyAt(_tmp.copy(_up).multiplyScalar(lift), _p, body, F, T);
  }
  // a planing boat banks into the turn; a displacement hull heels a little outward
  _tau.copy(_fwd).multiplyScalar(body.steer * vf * m * (P.planing > 0 ? -0.32 : 0.2) * wet); T.add(_tau);
  // angular damping in the water, plus a little in the air
  T.addScaledVector(body.w, -(wet * 0.9 + 0.08) * m * 8);
  // integrate (semi-implicit Euler); angular in the body frame with a diagonal inertia
  body.vel.addScaledVector(F, dt / m);
  _qi.copy(body.q).invert(); const tb = T.applyQuaternion(_qi);
  const ab = new THREE.Vector3(tb.x / body.I.x, tb.y / body.I.y, tb.z / body.I.z).applyQuaternion(body.q);
  body.w.addScaledVector(ab, dt);
  body.pos.addScaledVector(body.vel, dt);
  const wl = body.w.length();
  if (wl > 1e-6) { const dq = new THREE.Quaternion().setFromAxisAngle(_tmp.copy(body.w).divideScalar(wl), wl * dt); body.q.premultiply(dq).normalize(); }
  // the ride: vertical acceleration at a passenger seat, as a 10 s running RMS (m/s²)
  _p.copy(P.seat).applyQuaternion(body.q);
  const seatVy = body.vel.y + _tmp.crossVectors(body.w, _p).y, a = (seatVy - body.seatVy) / dt;
  body.seatVy = seatVy; body.seatA = a;
  body.ride += (a * a - body.ride) * Math.min(1, dt / 10);
  if (Math.abs(a) > 1.5 * G) body.slams++;
  body.t = t;
}

// several small steps per frame keep the buoyancy springs stable
export function advance(body, waves, t, frameDt) {
  const dt = Math.min(frameDt, 1 / 20), n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
  for (let i = 0; i < n; i++) step(body, waves, t - dt + (i + 1) * h, h);
}

// let the boat settle on the sea before the first frame
export function settle(body, waves, t) {
  body.pos.y = heightAt(waves, body.pos.x, body.pos.z, t) + 0.1;
  for (let i = 0; i < 480; i++) step(body, waves, t, 1 / 240);
  body.vel.set(0, 0, 0); body.w.set(0, 0, 0); body.ride = 0; body.slams = 0;
}

// ISO 2631-1 comfort reactions (frequency-weighted rms in the standard; here unweighted, so approximate)
export function comfort(rms) {
  if (rms < 0.315) return "not uncomfortable";
  if (rms < 0.63) return "a little uncomfortable";
  if (rms < 1.0) return "fairly uncomfortable";
  if (rms < 1.6) return "uncomfortable";
  if (rms < 2.5) return "very uncomfortable";
  return "extremely uncomfortable";
}
