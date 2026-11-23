// roof-solar · shade, sunlight on a tilted panel, and a year of generation. No DOM, no network.
//
// What is measured and what is assumed is stated in METHOD below, which the page prints. Short version:
//   measured   the shape of the roof and of everything that can throw a shadow on it (LINZ 1 m LiDAR surface heights),
//              and where the sun is at every step of the year (astronomy);
//   from data  monthly sunlight and air temperature for the place (NASA POWER 25-year averages);
//   assumed    the panel, the losses, the ground's reflectance, how the monthly sunlight is spread across a day.
import { daySteps, KLEIN_DAY_OF_YEAR, monthDay, DAYS_IN_MONTH } from "./sun.mjs";
import { spreadDay } from "./irradiance.mjs";
import { heightAt, PANEL } from "./roof.mjs";
const RAD = Math.PI / 180;

export const ASSUME = {
  moduleEfficiency: 0.215,        // STC efficiency of the assumed 430 W, 1.134 x 1.762 m panel
  tempCoeffPerK: -0.0030,         // power change per kelvin of cell temperature above 25 C (typical for current silicon panels)
  noct: 45,                       // nominal operating cell temperature, degrees C
  systemLosses: 0.14,             // wiring, mismatch, soiling, inverter: the 14 % default of NREL's PVWatts
  albedo: 0.2,                    // how much of the sunlight on the ground bounces up onto the panel
  b0: 0.05,                       // ASHRAE incidence-angle modifier: 1 - b0 (1/cos(angle) - 1)
  usableShare: 0.7,               // a plane is used if it gets at least this share of the best-possible roof's yearly sunlight
  shadeTolerance: 0.25,           // m: a LiDAR height must stand this far above the line to the sun to count as blocking it
  reach: 90,                      // m: how far from the panel the LiDAR square is searched for shade (the square is cut at its edge)
};

// ---- shade -------------------------------------------------------------------------------------------------------------------------
/** is the straight line from (e, n, z) toward the sun blocked by anything in the surface grid? vec = unit vector toward the sun (east, north, up) */
export function blocked(dsm, e, n, z, vec, o = {}) {
  const { tol = ASSUME.shadeTolerance, reach = ASSUME.reach, step = 0.5 } = o, hz = Math.hypot(vec[0], vec[1]);
  if (hz < 1e-6) return false; // sun overhead: nothing beside the point can be in the way
  const dx = vec[0] / hz, dy = vec[1] / hz, tan = vec[2] / hz;
  for (let s = step; s <= reach; s += step) {
    const x = e + dx * s, y = n + dy * s, h = heightAt(dsm, x, y);
    if (h !== h) { if (x < dsm.originE || x > dsm.originE + dsm.n - 1 || y > dsm.originN || y < dsm.originN - dsm.n + 1) return false; continue; } // left the square, or a cell with no height: carry on
    if (h - tol > z + s * tan) return true;
  }
  return false;
}
/** the highest angle (radians above level) of anything in each of nAz compass directions, as seen from a point */
export function horizon(dsm, e, n, z, nAz = 24, o = {}) {
  const { tol = ASSUME.shadeTolerance, reach = ASSUME.reach, step = 1 } = o, out = new Float32Array(nAz);
  for (let k = 0; k < nAz; k++) {
    const a = (k / nAz) * 2 * Math.PI, dx = Math.sin(a), dy = Math.cos(a); let m = 0;
    for (let s = step; s <= reach; s += step) { const h = heightAt(dsm, e + dx * s, n + dy * s); if (h === h) { const t = Math.atan2(h - tol - z, s); if (t > m) m = t; } }
    out[k] = m;
  }
  return out;
}

// ---- sky patches: the diffuse sunlight comes from the whole sky ---------------------------------------------------------------------
const N_EL = 9, N_AZ = 24, D_EL = (90 / N_EL) * RAD, D_AZ = (360 / N_AZ) * RAD;
export const PATCHES = (() => { const p = []; for (let i = 0; i < N_EL; i++) { const lo = i * D_EL, el = lo + D_EL / 2; for (let k = 0; k < N_AZ; k++) { const az = (k + 0.5) * D_AZ; p.push({ lo, hi: lo + D_EL, el, azIndex: k, az, vec: [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)], dOmega: Math.cos(el) * D_EL * D_AZ }); } } return p; })();
/**
 * the share of the sky's diffuse sunlight a surface gets: 1 means it takes everything a flat, unobstructed surface would from the whole sky.
 * With a clear sky and a plane tilted by b this is (1 + cos b) / 2. `hz` (from horizon()) removes the sky patches behind obstacles.
 */
export function skyShare(normal, hz) {
  let sum = 0;
  for (const p of PATCHES) {
    const c = p.vec[0] * normal[0] + p.vec[1] * normal[1] + p.vec[2] * normal[2]; if (c <= 0) continue;
    let open = 1; if (hz) { const h = hz[Math.min(N_AZ - 1, Math.floor(p.az / D_AZ))]; open = p.hi <= h ? 0 : p.lo >= h ? 1 : (p.hi - h) / D_EL; }
    sum += c * p.dOmega * open;
  }
  return sum / Math.PI;
}

// ---- a panel through a year -------------------------------------------------------------------------------------------------------
/** the sun's steps for the twelve representative days, with NASA's monthly sunlight spread over each */
export function yearSteps(climate, lat, lon, year = 2026, stepMin = 20) {
  return KLEIN_DAY_OF_YEAR.map((doy, m) => {
    const { month, day } = monthDay(doy), steps = daySteps(year, month, day, lat, lon, stepMin), sp = spreadDay(steps, { dni: climate.dni[m], dhi: climate.dhi[m], ghi: climate.ghi[m] });
    return { month: m, days: DAYS_IN_MONTH[m], steps, ...sp, temp: climate.temp[m], monthGhi: climate.ghi[m] };
  });
}
const iam = (cosT) => Math.max(0, 1 - ASSUME.b0 * (1 / Math.max(cosT, 0.05) - 1));
/**
 * Power from one square metre of panel at one step (W/m2 of panel area), from the sunlight on its face (W/m2) and the air temperature.
 */
export function dcPerM2(poa, airC) {
  const A = ASSUME, cell = airC + ((A.noct - 20) / 800) * poa;
  return poa * A.moduleEfficiency * (1 + A.tempCoeffPerK * (cell - 25)) * (1 - A.systemLosses);
}
/**
 * One surface through the year.
 * @param surf  { normal:[e,n,u], points:[[e,n,z]...] } the sample points on the surface (shade is tested at each) 
 * @param ys    yearSteps()
 * @param dsm   surface grid, or null for no shade at all (a clear horizon)
 * @returns {{monthlyKwh:number[], annualKwh:number, poaKwhM2:number, poaMonthly:number[], skyShare:number, beamShadedShare:number}} per square metre of panel
 */
export function surfaceYear(surf, ys, dsm) {
  const nrm = surf.normal, np = surf.points.length, zen = Math.acos(Math.max(-1, Math.min(1, nrm[2])));
  let sky = skyShare(nrm, null);
  if (dsm) { let t = 0; for (const [e, n, z] of surf.points) t += skyShare(nrm, horizon(dsm, e, n, z)); sky = t / np; }
  const groundView = (1 - Math.cos(zen)) / 2, monthlyKwh = [], poaMonthly = []; let beamAll = 0, beamLit = 0;
  for (const mo of ys) {
    let kwh = 0, poaWh = 0;
    mo.steps.forEach((st, i) => {
      const h = st.stepMin / 60, cosT = st.vec[0] * nrm[0] + st.vec[1] * nrm[1] + st.vec[2] * nrm[2];
      let beam = 0;
      if (cosT > 0 && mo.dni[i] > 0) {
        let lit = 1; if (dsm) { let b = 0; for (const [e, n, z] of surf.points) if (blocked(dsm, e, n, z, st.vec)) b++; lit = 1 - b / np; }
        const raw = mo.dni[i] * cosT * iam(cosT); beamAll += raw * h; beamLit += raw * lit * h; beam = raw * lit;
      }
      const poa = beam + mo.dhi[i] * sky + ASSUME.albedo * mo.ghi[i] * groundView;
      poaWh += poa * h; kwh += (dcPerM2(poa, mo.temp) * h) / 1000;
    });
    monthlyKwh.push(kwh); poaMonthly.push(poaWh / 1000);
  }
  const days = ys.map((m) => m.days);
  return { monthlyKwh: monthlyKwh.map((v, i) => v * days[i]), annualKwh: monthlyKwh.reduce((s, v, i) => s + v * days[i], 0), poaMonthly: poaMonthly.map((v, i) => v * days[i]),
    poaKwhM2: poaMonthly.reduce((s, v, i) => s + v * days[i], 0), skyShare: sky, beamShadedShare: beamAll > 0 ? 1 - beamLit / beamAll : 0 };
}
/** the best sunlight any roof could get here with a clear horizon: the yearly kWh/m2 of panel at the best tilt facing north (the sun side in NZ) */
export function bestUnshaded(ys) {
  let best = { kwh: 0, tilt: 0 };
  for (let t = 0; t <= 60; t += 5) { const b = t * RAD, r = surfaceYear({ normal: [0, Math.sin(b), Math.cos(b)], points: [[0, 0, 0]] }, ys, null); if (r.annualKwh > best.kwh) best = { kwh: r.annualKwh, tilt: t, poa: r.poaKwhM2 }; }
  return best;
}
/** sample points spread over a plane's cells (at most `max`), lifted onto the plane by the standoff */
export function planePoints(dsm, plane, max = 14) {
  const N = dsm.n, step = Math.max(1, Math.floor(plane.cells.length / max)), pts = [];
  for (let i = 0; i < plane.cells.length; i += step) { const k = plane.cells[i], e = dsm.originE + (k % N), n = dsm.originN - Math.floor(k / N); pts.push([e, n, plane.a * (e - plane.e0) + plane.b * (n - plane.n0) + plane.c + PANEL.standoff]); }
  return pts;
}
/** a panel's own six sample points (3 across, 2 along) */
export function panelPoints(p) {
  const [c0, c1, c2, c3] = p.corners, pts = [], lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  for (const u of [1 / 6, 3 / 6, 5 / 6]) for (const v of [0.25, 0.75]) { const x = lerp(c0, c1, u), y = lerp(c3, c2, u); pts.push(lerp(x, y, v)); }
  return pts;
}
