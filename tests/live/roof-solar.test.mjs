import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { sunPosition, sunVector, daySteps, dayLength, nzOffsetMinutes, nzMidnight, KLEIN_DAY_OF_YEAR, monthDay } from '../../roof-solar/sun.mjs';
import { parseClimatology, climatologyUrl, spreadDay, roundHalf } from '../../roof-solar/irradiance.mjs';
import { detectPlanes, layoutPanels, fitPlane, planeAngles, heightAt, inRings, PANEL } from '../../roof-solar/roof.mjs';
import { blocked, horizon, skyShare, yearSteps, surfaceYear, dcPerM2, bestUnshaded, panelPoints, ASSUME } from '../../roof-solar/pv.mjs';

// Offline. The sun is checked against Meeus's printed worked example, against closed-form geometry and against the vendored
// astronomy-engine (an independent implementation). The sunlight fixture is NASA POWER's own answer for the half-degree cell
// at 37.0 S 174.5 E, read on 23 Nov 2026 (a grid cell in the sea off the Auckland coast, not a person's site). The roofs are made up.
const POWER = parseClimatology(JSON.parse(fs.readFileSync(new URL('./fixtures/power-climatology-37.0S-174.5E.json', import.meta.url), 'utf8')));
const AKL = { lat: -36.85, lon: 174.76 }; // Auckland's public reference point, to a hundredth of a degree

// astronomy-engine, loaded as its own UMD file
const Astro = (() => { const src = fs.readFileSync(new URL('../../assets/vendor/astronomy-engine/astronomy.browser.min.js', import.meta.url), 'utf8'); const m = { exports: {} }; vm.runInNewContext(src, { module: m, exports: m.exports, self: {}, window: {} }); return m.exports; })();
const astro = (ms, lat, lon) => { const t = new Astro.AstroTime((ms - Date.UTC(2000, 0, 1, 12)) / 86400000), o = new Astro.Observer(lat, lon, 0), eq = Astro.Equator('Sun', t, o, true, true), h = Astro.Horizon(t, o, eq.ra, eq.dec, null); return { az: h.azimuth, alt: h.altitude }; };

test('sun: Meeus example 25.a (13 Oct 1992, 0h): declination -7.78507, right ascension 198.38083, equation of time +13m 42.6s', () => {
  const p = sunPosition(new Date(Date.UTC(1992, 9, 13, 0, 0, 0)), 0, 0);
  assert.ok(Math.abs(p.declination - -7.78507) < 0.003, p.declination);
  assert.ok(Math.abs(p.rightAscension - 198.38083) < 0.003, p.rightAscension);
  assert.ok(Math.abs(p.equationOfTimeMin - 13.7) < 0.05, p.equationOfTimeMin);
});
test('sun: agrees with astronomy-engine within 0.05 degree at 60 instants across a year and New Zealand', () => {
  let worst = 0, n = 0;
  for (let d = 0; d < 365; d += 11) for (const [lat, lon] of [[-36.85, 174.76], [-41.29, 174.78], [-45.03, 168.66]]) {
    const ms = Date.UTC(2026, 0, 1 + d, (d * 7) % 24, (d * 13) % 60), a = sunPosition(new Date(ms), lat, lon), b = astro(ms, lat, lon);
    worst = Math.max(worst, Math.abs(a.elevation - b.alt), Math.abs(((a.azimuth - b.az + 540) % 360) - 180)); n++;
  }
  assert.ok(n >= 90 && worst < 0.05, `worst difference ${worst} degrees over ${n}`);
});
test('sun: noon height at Auckland is 90 - |latitude - declination| (about 76.6 at the December solstice, 29.7 in June, 53.2 at the equinox)', () => {
  const noon = (y, m, d) => { let best = { elevation: -90 }; for (let t = nzMidnight(y, m, d).getTime(); t < nzMidnight(y, m, d + 1).getTime(); t += 60e3) { const p = sunPosition(new Date(t), AKL.lat, AKL.lon); if (p.elevation > best.elevation) best = p; } return best; };
  const dec = noon(2026, 12, 21), jun = noon(2026, 6, 21), eq = noon(2026, 3, 20);
  assert.ok(Math.abs(dec.elevation - 76.6) < 0.2, dec.elevation); assert.ok(Math.abs(jun.elevation - 29.7) < 0.2, jun.elevation); assert.ok(Math.abs(eq.elevation - 53.15) < 0.4, eq.elevation);
  for (const p of [dec, jun, eq]) assert.ok(Math.min(p.azimuth, 360 - p.azimuth) < 6, 'at noon the sun is in the north, not the south: ' + p.azimuth); // NZ: the sun is north of the zenith at midday all year
});
test('sun: day length matches cos(H) = -tan(lat) tan(dec), and the sun rises in the east side and sets in the west side', () => {
  for (const [m, d] of [[12, 21], [6, 21], [3, 20]]) {
    const st = daySteps(2026, m, d, AKL.lat, AKL.lon, 2), mid = sunPosition(new Date(st[0].date.getTime() + 12 * 3600e3), AKL.lat, AKL.lon), dec = mid.declination * Math.PI / 180;
    const want = (2 * Math.acos(-Math.tan(AKL.lat * Math.PI / 180) * Math.tan(dec)) * 180 / Math.PI) / 15;
    assert.ok(Math.abs(dayLength(st) - want) < 0.08, `${m}/${d}: ${dayLength(st)} vs ${want}`);
    assert.ok(st[0].azimuth < 180 && st.at(-1).azimuth > 180);
  }
});
test('clock: New Zealand is 12 h ahead of UTC in winter and 13 h in daylight time; the day the clocks go forward has 23 h', () => {
  assert.equal(nzOffsetMinutes(new Date(Date.UTC(2026, 5, 21))), 720); assert.equal(nzOffsetMinutes(new Date(Date.UTC(2026, 11, 21))), 780);
  assert.equal((nzMidnight(2026, 9, 28) - nzMidnight(2026, 9, 27)) / 3600e3, 23); // last Sunday of September 2026 is the 27th
  assert.equal((nzMidnight(2026, 4, 6) - nzMidnight(2026, 4, 5)) / 3600e3, 25);     // first Sunday of April 2026 is the 5th
});
test('sun: the twelve representative days are the days Klein (1977) gives, as dates', () => {
  assert.deepEqual(KLEIN_DAY_OF_YEAR.map((d) => { const x = monthDay(d); return `${x.day}/${x.month}`; }), ['17/1', '16/2', '16/3', '15/4', '15/5', '11/6', '17/7', '16/8', '15/9', '15/10', '14/11', '10/12']);
});

test('sunlight data: reads NASA POWER monthly values, refuses fill values, rounds the request to half a degree', () => {
  assert.equal(POWER.ghi.length, 12); assert.ok(POWER.ghi[11] > POWER.ghi[5] * 2.5, 'December sunnier than June by well over 2x in Auckland');
  assert.equal(roundHalf(-36.8485), -37); assert.equal(roundHalf(174.7633), 175); assert.equal(roundHalf(174.2), 174);
  const u = climatologyUrl(-36.8485, 174.7633); assert.ok(u.includes('latitude=-37') && u.includes('longitude=175') && !u.includes('36.84') && !u.includes('174.76'));
  const bad = JSON.parse(fs.readFileSync(new URL('./fixtures/power-climatology-37.0S-174.5E.json', import.meta.url), 'utf8')); bad.properties.parameter.T2M.MAR = -999;
  assert.throws(() => parseClimatology(bad), /T2M for MAR/);
  assert.throws(() => parseClimatology({}), /no data/);
});
test('sunlight data: spreading a month over a day keeps its beam and diffuse totals exactly, and its flat total within 12 %', () => {
  for (const m of [0, 5, 11]) {
    const { month, day } = monthDay(KLEIN_DAY_OF_YEAR[m]), st = daySteps(2026, month, day, -37, 174.5, 20), r = spreadDay(st, { dni: POWER.dni[m], dhi: POWER.dhi[m], ghi: POWER.ghi[m] });
    const tot = (a) => a.reduce((s, x, i) => s + x * st[i].stepMin / 60, 0) / 1000;
    assert.ok(Math.abs(tot(r.dni) - POWER.dni[m]) < 1e-6 && Math.abs(tot(r.dhi) - POWER.dhi[m]) < 1e-6);
    assert.ok(Math.abs(r.closure - 1) < 0.12, `month ${m + 1} closure ${r.closure}`);
  }
});

// ---- shade and sky ---------------------------------------------------------------------------------------------------------------
const flat = (n, h = 0) => ({ n, originE: 0, originN: n - 1, data: new Float32Array(n * n).fill(h) });
test('shade: a 5 m wall 10 m east blocks the sun below atan(5/10) = 26.6 degrees (less the 0.25 m tolerance) and not above', () => {
  const g = flat(61); for (let j = 0; j < 61; j++) for (let i = 40; i < 42; i++) g.data[j * 61 + i] = 5; // wall at east 40..41, the point is at east 30: 10 m away
  const v = (az, el) => sunVector({ azimuth: az, elevation: el });
  assert.equal(blocked(g, 30, 30, 0, v(90, 24)), true); assert.equal(blocked(g, 30, 30, 0, v(90, 29)), false);
  assert.equal(blocked(g, 30, 30, 0, v(270, 5)), false, 'the sun on the far side is not blocked by it');
});
test('sky: a clear sky gives a flat surface 1, a tilt b gives (1 + cos b) / 2, a wall gives 1/2, a horizon at 30 degrees gives cos^2(30) = 0.75', () => {
  const nrm = (b) => [0, Math.sin(b * Math.PI / 180), Math.cos(b * Math.PI / 180)];
  assert.ok(Math.abs(skyShare([0, 0, 1], null) - 1) < 0.01);
  for (const b of [20, 35, 60, 90]) assert.ok(Math.abs(skyShare(nrm(b), null) - (1 + Math.cos(b * Math.PI / 180)) / 2) < 0.015, `tilt ${b}`);
  const hz = new Float32Array(24).fill(30 * Math.PI / 180); assert.ok(Math.abs(skyShare([0, 0, 1], hz) - 0.75) < 0.02);
});
test('sky: horizon() finds the 5 m wall as atan((5 - 0.25)/10) = 25.4 degrees to the east and nothing to the west', () => {
  const g = flat(61); for (let j = 0; j < 61; j++) for (let i = 40; i < 42; i++) g.data[j * 61 + i] = 5;
  const h = horizon(g, 30, 30, 0, 24); assert.ok(Math.abs(h[6] * 180 / Math.PI - 25.4) < 1.2, h[6] * 180 / Math.PI); assert.equal(h[18], 0);
});

// ---- a year of generation ----------------------------------------------------------------------------------------------------------
const YS = yearSteps(POWER, -37, 174.5);
test('yield: the panel formula at 1000 W/m2 and 25 C air is 1000 x 0.215 x (1 - 0.003 x 31.25) x 0.86', () => {
  assert.ok(Math.abs(dcPerM2(1000, 25) - 1000 * 0.215 * (1 - 0.003 * 31.25) * 0.86) < 1e-9);
  assert.equal(PANEL.watts, 430); assert.ok(Math.abs(PANEL.w * PANEL.l * 1000 * ASSUME.moduleEfficiency - 430) < 3, 'the stated 430 W is 1000 W/m2 x area x efficiency');
});
test('yield: a flat surface gets NASA\'s yearly flat sunlight, within 4 % (the loss is the incidence-angle modifier and the spread of the day)', () => {
  const nasa = POWER.ghi.reduce((s, v, i) => s + v * [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i], 0); // kWh/m2/yr
  const r = surfaceYear({ normal: [0, 0, 1], points: [[0, 0, 0]] }, YS, null);
  assert.ok(nasa > 1450 && nasa < 1700, 'Auckland gets about 1,500 to 1,600 kWh/m2 a year on the flat: ' + nasa);
  assert.ok(r.poaKwhM2 <= nasa * 1.03 && r.poaKwhM2 > nasa * 0.94, `${r.poaKwhM2} against ${nasa}`);
});
test('yield: facing north at 30 degrees beats flat, beats facing south, and gives a sane 1 kW year (sanity band, not a validation)', () => {
  const at = (b, az) => { const r = b * Math.PI / 180, a = az * Math.PI / 180; return surfaceYear({ normal: [Math.sin(a) * Math.sin(r), Math.cos(a) * Math.sin(r), Math.cos(r)], points: [[0, 0, 0]] }, YS, null).annualKwh; };
  const north = at(30, 0), flatY = at(0, 0), south = at(30, 180), east = at(30, 90), west = at(30, 270);
  assert.ok(north > flatY && flatY > south && east < north && west < north && Math.abs(east - west) / east < 0.04, `${north} ${flatY} ${south} ${east} ${west}`);
  const perKw = north / (ASSUME.moduleEfficiency * 1000 / 1000), perKwp = (north / ((ASSUME.moduleEfficiency)) ); // kWh per m2 / (kW per m2 at STC) = kWh per kWp
  assert.ok(perKwp > 1100 && perKwp < 1700, 'kWh per kWp ' + perKwp); assert.ok(perKw > 1100);
  assert.ok(bestUnshaded(YS).tilt >= 20 && bestUnshaded(YS).tilt <= 45, 'the best tilt at 37 S is near the latitude or a little less: ' + bestUnshaded(YS).tilt);
});
test('yield: a tall wall to the north takes beam sunlight from the panel, and the loss is zero with no wall', () => {
  const g = flat(121); const b = 30 * Math.PI / 180, surf = (pt) => ({ normal: [0, Math.sin(b), Math.cos(b)], points: [pt] });
  const free = surfaceYear(surf([60, 60, 2]), YS, g);
  for (let j = 30; j < 45; j++) for (let i = 30; i < 91; i++) g.data[j * 121 + i] = 12; // a 12 m wall, 16 to 31 m north of the point, 60 m wide
  const shaded = surfaceYear(surf([60, 60, 2]), YS, g);
  assert.ok(free.beamShadedShare < 0.005, free.beamShadedShare); assert.ok(shaded.beamShadedShare > 0.05, shaded.beamShadedShare);
  assert.ok(shaded.annualKwh < free.annualKwh * 0.98 && shaded.annualKwh > free.annualKwh * 0.5);
  assert.ok(shaded.skyShare < free.skyShare);
});

// ---- roofs --------------------------------------------------------------------------------------------------------------------------
// a made-up gable roof: ridge east-west, 12 m long, 8 m deep, 30 degree pitch, eaves at 3 m, on flat ground, with 4 cm of repeatable noise
function gable() {
  const g = flat(61, 0), pitch = Math.tan(30 * Math.PI / 180), e0 = 24, e1 = 36, n0 = 26, n1 = 34; // cell centres east 24..36 and north 26..34 (rows from the top: originN = 60)
  for (let j = 0; j < 61; j++) for (let i = 0; i < 61; i++) {
    const e = i, n = 60 - j; let h = 0;
    if (e >= e0 && e <= e1 && n >= n0 && n <= n1) h = 3 + (4 - Math.abs(n - 30)) * pitch + 0.04 * Math.sin(i * 12.9898 + j * 78.233) ;
    g.data[j * 61 + i] = h;
  }
  return { g, rings: [[[e0 - 0.5, n0 - 0.5], [e1 + 0.5, n0 - 0.5], [e1 + 0.5, n1 + 0.5], [e0 - 0.5, n1 + 0.5], [e0 - 0.5, n0 - 0.5]]] };
}
test('roof: a made-up 30 degree gable gives two planes, one facing north and one south, with pitch within 1 degree and the cells they own', () => {
  const { g, rings } = gable(), r = detectPlanes(g, rings), big = r.planes.filter((p) => p.cells.length >= 15);
  assert.equal(big.length, 2, JSON.stringify(r.planes.map((p) => [p.cells.length, p.pitch.toFixed(1), p.azimuth.toFixed(0)])));
  for (const p of big) assert.ok(Math.abs(p.pitch - 30) < 1.2, p.pitch);
  const az = big.map((p) => Math.round(p.azimuth)).sort((a, b) => a - b); assert.ok(az[0] < 4 || az[0] > 356, az); assert.ok(Math.abs(az[1] - 180) < 4, az);
  assert.ok(r.cellsInPlanes / r.inside > 0.6 && r.cellsInPlanes <= r.inside);
});
test('roof: fitPlane recovers a plane exactly and planeAngles reads pitch, the way it faces and the normal', () => {
  const pts = []; for (let e = 0; e < 5; e++) for (let n = 0; n < 5; n++) pts.push([e, n, 2 + 0.5 * e - 0.25 * n]); // rises east and falls north
  const f = fitPlane(pts, 2, 2), a = planeAngles(f);
  assert.ok(Math.abs(f.a - 0.5) < 1e-9 && Math.abs(f.b + 0.25) < 1e-9 && f.rms < 1e-9);
  assert.ok(Math.abs(a.pitch - Math.atan(Math.hypot(0.5, 0.25)) * 180 / Math.PI) < 1e-9);
  assert.ok(Math.abs(a.azimuth - 360 + 0) > 0 && Math.abs(a.azimuth - (Math.atan2(-0.5, 0.25) * 180 / Math.PI + 360) % 360) < 1e-9, 'it faces west-north-west, downhill');
  assert.ok(Math.abs(Math.hypot(...a.normal) - 1) < 1e-12);
});
test('roof: panels fit inside the plane, do not overlap, and never cover more than the plane\'s own area', () => {
  const { g, rings } = gable(), r = detectPlanes(g, rings), north = r.planes.find((p) => p.cells.length >= 15 && (p.azimuth < 5 || p.azimuth > 355));
  const panels = layoutPanels(g, north); assert.ok(panels.length >= 4, 'a 12 m x 4.6 m north roof takes at least four panels: ' + panels.length);
  const area = panels.length * PANEL.w * PANEL.l; assert.ok(area < north.areaRoofM2);
  for (const p of panels) { assert.ok(inRings(p.e, p.n, rings)); assert.ok(Math.abs(p.tilt - 30) < 1.2); assert.equal(p.corners.length, 4); }
  for (let i = 0; i < panels.length; i++) for (let j = i + 1; j < panels.length; j++) assert.ok(Math.hypot(panels[i].e - panels[j].e, panels[i].n - panels[j].n) > 0.9, 'two panels share a place');
  assert.equal(panelPoints(panels[0]).length, 6);
});
test('roof: a tree beside the roof lowers a panel\'s yield and the flat tops of cells are not mistaken for shade by the roof itself', () => {
  const { g, rings } = gable(), r = detectPlanes(g, rings), north = r.planes.find((p) => p.azimuth < 5 || p.azimuth > 355), panels = layoutPanels(g, north);
  const run = (grid) => panels.reduce((s, p) => s + surfaceYear({ normal: p.normal, points: panelPoints(p) }, YS, grid).annualKwh, 0);
  const clear = run(g), withTree = (() => { const t = { ...g, data: Float32Array.from(g.data) }; for (let j = 0; j < 61; j++) for (let i = 0; i < 61; i++) if (Math.hypot(i - 30, 60 - j - 40) < 3) t.data[j * 61 + i] = 14; return t; })();
  const sh = run(withTree); assert.ok(clear > 0 && sh < clear && sh > clear * 0.5, `${clear} -> ${sh}`);
  const own = panels.map((p) => surfaceYear({ normal: p.normal, points: panelPoints(p) }, YS, g).beamShadedShare); assert.ok(Math.max(...own) < 0.01, 'the roof must not shade itself: ' + Math.max(...own));
});
test('grid: bilinear height and the cell indexing agree with the way LINZ lays out cells', () => {
  const g = { n: 3, originE: 100, originN: 200, data: Float32Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9]) };
  assert.equal(heightAt(g, 100, 200), 1); assert.equal(heightAt(g, 101, 199), 5); assert.ok(Math.abs(heightAt(g, 100.5, 200) - 1.5) < 1e-9); assert.ok(isNaN(heightAt(g, 99, 200)));
});

test('LINZ reader: the served copy in roof-solar/linz is byte-for-byte the plan-drop page\'s reader (the source folder is not served)', () => {
  for (const f of ['cog', 'lerc', 'nztm', 'ground']) {
    assert.equal(fs.readFileSync(new URL(`../../roof-solar/linz/${f}.js`, import.meta.url), 'utf8'), fs.readFileSync(new URL(`../../plan-studio/twins/src/twin/linz/${f}.js`, import.meta.url), 'utf8'), f);
  }
});

// ---- the whole sum on a made-up house ----------------------------------------------------------------------------------------------------
import { analyse, PANEL_AREA } from '../../roof-solar/plan.mjs';
import { pickBuilding, parseOutlines, outlinesUrl } from '../../roof-solar/site.mjs';
test('analyse: a made-up gable gives panels on the sunny side only, a total that adds up, and less with a tree beside it', async () => {
  const { g, rings } = gable(), input = { dsm: g, point: { lat: -37, lon: 174.5 }, climate: POWER, rings };
  const r = await analyse(input);
  assert.ok(r.panels.length >= 4 && r.panels.every((p) => p.year.kwh > 0)); const used = r.planes.filter((p) => p.usable);
  assert.ok(used.length >= 1 && used.every((p) => p.azimuth < 100 || p.azimuth > 260), 'the south-facing slope is not used: ' + used.map((p) => p.azimuth.toFixed(0)));
  assert.ok(Math.abs(r.totals.annualKwh - r.panels.reduce((s, p) => s + p.year.kwh, 0)) < 1e-6 && Math.abs(r.totals.annualKwh - r.monthly.reduce((s, v) => s + v, 0)) < 1e-6);
  assert.ok(Math.abs(r.totals.kwp - r.panels.length * 0.43) < 1e-9 && r.totals.areaM2 === r.panels.length * PANEL_AREA);
  assert.ok(r.totals.kwhPerKwp > 1100 && r.totals.kwhPerKwp < 1700, 'sanity band for a north roof: ' + r.totals.kwhPerKwp);
  assert.ok(r.totals.shadeLossShare >= -0.001 && r.totals.shadeLossShare < 0.03, 'a lone house has almost no shade: ' + r.totals.shadeLossShare);
  assert.ok(r.monthly[11] > r.monthly[5] * 1.8, 'December well above June');
  const t = { ...g, data: Float32Array.from(g.data) }; for (let j = 0; j < 61; j++) for (let i = 0; i < 61; i++) if (Math.hypot(i - 30, 60 - j - 40) < 4) t.data[j * 61 + i] = 16;
  const r2 = await analyse({ ...input, dsm: t }); assert.ok(r2.totals.annualKwh < r.totals.annualKwh && r2.totals.shadeLossShare > r.totals.shadeLossShare + 0.02, `${r.totals.annualKwh} -> ${r2.totals.annualKwh}`);
});
test('site: picks the outline the point is in, else the nearest within 40 m, else none; outline words are read from the esri JSON', () => {
  const sq = (x, y, s) => [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]], B = [{ id: 1, areaM2: 100, rings: sq(0, 0, 10) }, { id: 2, areaM2: 400, rings: sq(30, 0, 20) }];
  assert.equal(pickBuilding(B, 5, 5).building.id, 1); assert.equal(pickBuilding(B, 14, 5).building.id, 1, 'nearer to 1 (4 m) than 2 (16 m)'); assert.equal(pickBuilding(B, 120, 5), null);
  assert.equal(pickBuilding(B, 25, 5).building.id, 2);
  const u = outlinesUrl(-41.3, 174.8); assert.ok(u.includes('outSR=2193') && u.includes('LINZ_NZ_Building_Outlines'));
  const o = parseOutlines({ features: [{ attributes: { building_id: 7, name: null, use_: 'Unknown', Shape__Area: 12.4, capture_source_to: Date.UTC(2021, 0, 13) }, geometry: { rings: sq(0, 0, 3) } }, { attributes: { building_id: 8 }, geometry: {} }] });
  assert.equal(o.length, 1); assert.equal(o[0].use, null); assert.equal(o[0].capturedTo, '2021-01-13');
  assert.throws(() => parseOutlines({ error: { message: 'boom' } }), /boom/);
});
