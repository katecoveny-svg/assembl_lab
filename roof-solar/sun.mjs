// roof-solar · where the sun is. Plain arithmetic, no libraries, runs in the browser and in Node.
//
// Method: the low-precision solar position of Jean Meeus, "Astronomical Algorithms" (2nd ed., ch. 25 and 28), in the form NOAA's
// Global Monitoring Laboratory publishes for its solar calculator (mean longitude, equation of the centre, nutation and aberration
// to the apparent longitude, equation of time). Stated accuracy of this form: about 0.01 degree for 1800 to 2100. It is a geometric
// position (no air refraction). Checked against Meeus's worked example 25.a and against the vendored astronomy-engine in the tests.
// Azimuth is in degrees clockwise from true north (0 = N, 90 = E, 180 = S, 270 = W). Elevation is above the horizon.
const RAD = Math.PI / 180, DEG = 180 / Math.PI;
export const julianDay = (date) => date.getTime() / 86400000 + 2440587.5;
const norm360 = (x) => ((x % 360) + 360) % 360;

/** @returns {{azimuth:number, elevation:number, zenith:number, declination:number, rightAscension:number, equationOfTimeMin:number, hourAngle:number}} degrees */
export function sunPosition(date, latDeg, lonDeg) {
  const jd = julianDay(date), T = (jd - 2451545) / 36525;
  const L0 = norm360(280.46646 + T * (36000.76983 + T * 0.0003032));
  const M = norm360(357.52911 + T * (35999.05029 - T * 0.0001537)), Mr = M * RAD;
  const e = 0.016708634 - T * (0.000042037 + T * 0.0000001267);
  const C = Math.sin(Mr) * (1.914602 - T * (0.004817 + T * 0.000014)) + Math.sin(2 * Mr) * (0.019993 - T * 0.000101) + Math.sin(3 * Mr) * 0.000289;
  const trueLong = L0 + C, omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD), er = eps * RAD, lr = lambda * RAD;
  const dec = Math.asin(Math.sin(er) * Math.sin(lr)) * DEG;
  const ra = norm360(Math.atan2(Math.cos(er) * Math.sin(lr), Math.cos(lr)) * DEG);
  const y = Math.tan(er / 2) ** 2, L0r = L0 * RAD;
  const eqt = 4 * DEG * (y * Math.sin(2 * L0r) - 2 * e * Math.sin(Mr) + 4 * e * y * Math.sin(Mr) * Math.cos(2 * L0r) - 0.5 * y * y * Math.sin(4 * L0r) - 1.25 * e * e * Math.sin(2 * Mr));
  const utcMin = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60 + date.getUTCMilliseconds() / 60000;
  const tst = (((utcMin + eqt + 4 * lonDeg) % 1440) + 1440) % 1440, ha = tst / 4 - 180, har = ha * RAD, lat = latDeg * RAD, dr = dec * RAD;
  const cz = Math.min(1, Math.max(-1, Math.sin(lat) * Math.sin(dr) + Math.cos(lat) * Math.cos(dr) * Math.cos(har)));
  const zen = Math.acos(cz) * DEG;
  const az = norm360(Math.atan2(Math.sin(har), Math.cos(har) * Math.sin(lat) - Math.tan(dr) * Math.cos(lat)) * DEG + 180);
  return { azimuth: az, elevation: 90 - zen, zenith: zen, declination: dec, rightAscension: ra, equationOfTimeMin: eqt, hourAngle: ha };
}

/** unit vector toward the sun in (east, north, up) */
export function sunVector(pos) {
  const a = pos.azimuth * RAD, el = pos.elevation * RAD, c = Math.cos(el);
  return [Math.sin(a) * c, Math.cos(a) * c, Math.sin(el)];
}

// ---- New Zealand clock time ---------------------------------------------------------------------------------------------------
const NZ = "Pacific/Auckland";
/** minutes east of UTC on the New Zealand clock at an instant (720 in winter, 780 in daylight time) */
export function nzOffsetMinutes(date) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: NZ, timeZoneName: "longOffset" }).formatToParts(date).find((x) => x.type === "timeZoneName")?.value || "GMT+12:00";
  const m = p.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/); if (!m) return 720;
  return (m[1] === "-" ? -1 : 1) * (+m[2] * 60 + (+m[3] || 0));
}
/** the instant of midnight at the start of a New Zealand calendar day (month 1 to 12) */
export function nzMidnight(year, month, day) {
  let t = Date.UTC(year, month - 1, day) - 12 * 3600e3;
  for (let i = 0; i < 3; i++) t = Date.UTC(year, month - 1, day) - nzOffsetMinutes(new Date(t)) * 60e3;
  return new Date(t);
}
export const nzClock = (date) => new Intl.DateTimeFormat("en-NZ", { timeZone: NZ, hour: "numeric", minute: "2-digit", hour12: false }).format(date);
export const nzDayLabel = (date) => new Intl.DateTimeFormat("en-NZ", { timeZone: NZ, day: "numeric", month: "short" }).format(date);

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const DAYS_IN_MONTH = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // 28.25: an average year (a leap year is 1/4 day longer)
/** the day of each month whose sun is nearest the month's average: Klein (1977), as tabulated in Duffie and Beckman, Solar Engineering of Thermal Processes, table 1.6.1 */
export const KLEIN_DAY_OF_YEAR = [17, 47, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344];
/** month (1 to 12) and day of month of a day of the year in a non-leap year */
export function monthDay(doy) { let m = 0, d = doy; const dm = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; while (d > dm[m]) { d -= dm[m]; m++; } return { month: m + 1, day: d }; }

/**
 * The sun through one New Zealand calendar day at a fixed step, keeping only the times it is above the horizon.
 * Each step stands for the interval around it, `stepMin` minutes long.
 */
export function daySteps(year, month, day, latDeg, lonDeg, stepMin = 20) {
  const t0 = nzMidnight(year, month, day), t1 = nzMidnight(year, month, day + 1), out = [];
  for (let t = t0.getTime() + (stepMin * 60e3) / 2; t < t1.getTime(); t += stepMin * 60e3) {
    const date = new Date(t), p = sunPosition(date, latDeg, lonDeg);
    if (p.elevation > 0) out.push({ date, azimuth: p.azimuth, elevation: p.elevation, vec: sunVector(p), stepMin });
  }
  return out;
}
/** sunrise, sunset and the longest elevation of a day, from the steps */
export function dayLength(steps) { return steps.reduce((s, x) => s + x.stepMin, 0) / 60; }
