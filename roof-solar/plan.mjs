// roof-solar · from a building outline and the LiDAR around it to roof planes, panels and a year of generation.
// This is the whole sum the page shows; scene.mjs only draws its result. No DOM, no network.
import { detectPlanes, layoutPanels, PANEL, heightAt } from "./roof.mjs";
import { yearSteps, surfaceYear, bestUnshaded, planePoints, panelPoints, ASSUME } from "./pv.mjs";
import { MONTHS } from "./sun.mjs";

const tick = () => new Promise((r) => setTimeout(r, 0));
export const PANEL_AREA = PANEL.w * PANEL.l;

/**
 * @param input { dsm, point:{lat,lon}, climate, rings }  rings = the building outline in NZTM metres
 * @param o     { usableShare, maxPitch 70, onProgress(text, 0..1) }
 * @returns {Promise<object>} { planes[] (with .usable, .yearShare), panels[] (with .year), totals, monthly, monthlyClear, best, bounds, steps }
 */
export async function analyse({ dsm, point, climate, rings }, { usableShare = ASSUME.usableShare, maxPitch = 70, onProgress = () => {} } = {}) {
  const ys = yearSteps(climate, point.lat, point.lon), best = bestUnshaded(ys), det = detectPlanes(dsm, rings);
  onProgress("Reading the roof planes", 0.1);
  const clearMemo = new Map(), clear = (key, normal) => { if (!clearMemo.has(key)) clearMemo.set(key, surfaceYear({ normal, points: [[0, 0, 0]] }, ys, null)); return clearMemo.get(key); };
  for (const p of det.planes) {
    const sy = surfaceYear({ normal: p.normal, points: planePoints(dsm, p) }, ys, dsm);
    p.yearShare = sy.annualKwh / best.kwh; p.beamShadedShare = sy.beamShadedShare; p.skyShare = sy.skyShare; p.poaKwhM2 = sy.poaKwhM2;
    p.usable = p.pitch <= maxPitch && p.yearShare >= usableShare; p.panels = p.usable ? layoutPanels(dsm, p) : [];
    if (p.usable && !p.panels.length) { p.usable = false; p.why = "too small for a panel with room round it"; } else if (!p.usable) p.why = p.pitch > maxPitch ? `steeper than ${maxPitch} degrees` : `gets ${(p.yearShare * 100).toFixed(0)} % of the best roof's sunlight, under the ${(usableShare * 100).toFixed(0)} % set`;
  }
  const panels = det.planes.flatMap((p) => p.panels), few = panels.length > 100; let done = 0;
  const monthly = Array(12).fill(0), monthlyClear = Array(12).fill(0); let annual = 0, annualClear = 0;
  for (const pn of panels) {
    const all = panelPoints(pn), pts = few ? [all[0], all[3], all[4]] : all, sy = surfaceYear({ normal: pn.normal, points: pts }, ys, dsm), cl = clear(pn.plane + ":" + pn.tilt.toFixed(2), pn.normal);
    pn.year = { kwh: sy.annualKwh * PANEL_AREA, kwhClear: cl.annualKwh * PANEL_AREA, kwhPerKwp: (sy.annualKwh * PANEL_AREA) / (PANEL.watts / 1000), share: sy.annualKwh / best.kwh, beamShadedShare: sy.beamShadedShare, monthly: sy.monthlyKwh.map((v) => v * PANEL_AREA) };
    annual += pn.year.kwh; annualClear += pn.year.kwhClear; sy.monthlyKwh.forEach((v, m) => { monthly[m] += v * PANEL_AREA; monthlyClear[m] += cl.monthlyKwh[m] * PANEL_AREA; });
    if (++done % 8 === 0) { onProgress("Following the sun across each panel", 0.15 + 0.85 * (done / panels.length)); await tick(); }
  }
  // where the roof is, for the camera
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const r of rings) for (const [x, y] of r) { if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; }
  const e = (a + c) / 2, n = (b + d) / 2, z = heightAt(dsm, e, n), top = det.planes.length ? Math.max(...det.planes.map((p) => p.a * 0 + p.c)) : z;
  const kwp = (panels.length * PANEL.watts) / 1000;
  return { planes: det.planes, insideCells: det.inside, cellsInPlanes: det.cellsInPlanes, panels, best, usableShare,
    totals: { panels: panels.length, kwp, annualKwh: annual, annualKwhClear: annualClear, shadeLossShare: annualClear > 0 ? 1 - annual / annualClear : 0, kwhPerKwp: kwp > 0 ? annual / kwp : 0, areaM2: panels.length * PANEL_AREA },
    monthly, monthlyClear, months: MONTHS, bounds: { e, n, z: Number.isFinite(top) ? top : z, r: Math.max(c - a, d - b) / 2 }, steps: ys.length };
}
