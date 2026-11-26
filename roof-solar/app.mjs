// roof-solar · the page. Choose a place, read it from open data, work out the roof and a year of sun, draw it.
import { RoofScene, RAMP } from "./scene.mjs";
import { loadSite, askAddress, pickBuilding, inNZ, ADDRESS_CREDIT, OUTLINE_CREDIT } from "./site.mjs";
import { analyse } from "./plan.mjs";
import { ASSUME, blocked } from "./pv.mjs";
import { panelPoints } from "./pv.mjs";
import { sunPosition, sunVector, nzMidnight, nzClock, nzDayLabel, MONTHS } from "./sun.mjs";
import { inRings } from "./roof.mjs";
import { PANEL } from "./roof.mjs";
import { mapLite } from "./maplite.mjs";

// A public landmark for first look and for stills: Old St Paul's, Wellington (a heritage church, open to visitors). Coordinates as written on its
// Wikipedia page: 41°16′35″S 174°46′49″E. It is a roof that shows the method, not a place to put panels.
export const LANDMARK = { name: "Old St Paul's, Wellington (public heritage church)", lat: -(41 + 16 / 60 + 35 / 3600), lon: 174 + 46 / 60 + 49 / 3600 };

const $ = (s, r = document) => r.querySelector(s), esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const nf = (x, d = 0) => (x == null || !isFinite(x) ? "n/a" : x.toLocaleString("en-NZ", { maximumFractionDigits: d, minimumFractionDigits: d }));
const round = (x, step) => Math.round(x / step) * step;
const COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"], compass = (az) => COMPASS[Math.round((((az % 360) + 360) % 360) / 45) % 8];
const q = new URLSearchParams(location.search), reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const year = new Date().getFullYear();

const S = { site: null, plan: null, sc: null, abort: null, run: 0, playing: false, raf: 0 };
window.__roof = S; // for checks

// ---- the sun controls ------------------------------------------------------------------------------------------------------------------
const doyDate = (doy) => { const d = new Date(Date.UTC(year, 0, doy)); return { month: d.getUTCMonth() + 1, day: d.getUTCDate() }; };
const sunInstant = () => { const { month, day } = doyDate(+$("#day").value); return new Date(nzMidnight(year, month, day).getTime() + +$("#min").value * 60e3); };
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
function sunChanged() {
  const d = sunInstant(); $("#dayOut").textContent = nzDayLabel(d); $("#minOut").textContent = hhmm(+$("#min").value) + " NZ time";
  if (!S.sc) return; S.sc.setSun(d); const p = S.sc.sunPos; let line = p.elevation > 0 ? `Sun ${p.elevation.toFixed(0)}° up, bearing ${p.azimuth.toFixed(0)}° (${compass(p.azimuth)})` : "Sun below the horizon";
  if (S.plan?.panels.length && p.elevation > 0) { const v = sunVector(p); let lit = 0; for (const pn of S.plan.panels) { const cos = v[0] * pn.normal[0] + v[1] * pn.normal[1] + v[2] * pn.normal[2]; if (cos > 0 && panelPoints(pn).filter((pt, i) => i % 2 === 0).some((pt) => !blocked(S.site.dsm, pt[0], pt[1], pt[2], v))) lit++; }
    line += `<br>${lit} of ${S.plan.panels.length} panels in direct sun`; }
  $("#readout").innerHTML = line + (S.study ? "<br>Auckland-region sun · design study" : "");
}
for (const id of ["day", "min"]) $("#" + id).addEventListener("input", sunChanged);
for (const b of document.querySelectorAll("[data-doy]")) b.addEventListener("click", () => { $("#day").value = b.dataset.doy; $("#min").value = 12 * 60 + 40 + (+b.dataset.doy > 300 || +b.dataset.doy < 40 ? 60 : 0); sunChanged(); });
$("#heat").addEventListener("change", (e) => { S.sc?.setHeat(e.target.checked); $("#legend").hidden = !e.target.checked || !S.plan?.panels.length; });
$("#paths").addEventListener("change", (e) => S.sc?.setPaths(e.target.checked));
$("#propertyLayer").addEventListener("change",(e)=>S.sc?.setPropertyVisible(e.target.checked));
function clearProperty(){
  $("#propertyControl").hidden=true; $("#propertyInfo").hidden=true;
}
function showProperty(property){
  const n=property?.outlines?.length||0;
  $("#propertyControl").hidden=!n; const info=$("#propertyInfo"); info.hidden=false;
  info.replaceChildren();
  const link=document.createElement("a");link.href="https://data.linz.govt.nz/layer/122657-nz-property-boundaries/";link.target="_blank";link.rel="noopener";link.textContent="LINZ NZ Property Boundaries";
  const message=n?"Rose lines show mapped property boundaries at the selected point. Visual context only, not a survey or an input to the solar estimate.":property?.status==="available"?"No mapped property boundary at this point.":"Property boundary lookup unavailable.";
  info.append(document.createTextNode(message+" "),link,document.createTextNode(" · CC BY 4.0"));
}
async function getProperty(lat,lon,signal){
  try{
    const response=await fetch("/api/garden-site",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({mode:"property",lat,lon}),signal,cache:"no-store"});
    if(response.ok)return (await response.json()).property;
  }catch{}
  return null;
}
$("#clay").addEventListener("change", (e) => S.sc?.setClay(e.target.checked));
$("#play").addEventListener("click", () => {
  S.playing = !S.playing; $("#play").textContent = S.playing ? "Pause" : "Play the day"; if (!S.playing) return cancelAnimationFrame(S.raf);
  let last = performance.now(); const step = (t) => { const dt = t - last; last = t; let m = +$("#min").value + dt * 0.09; if (m > 1439) m = 0; $("#min").value = m; sunChanged(); S.raf = requestAnimationFrame(step); }; S.raf = requestAnimationFrame(step);
});

// ---- loading a place --------------------------------------------------------------------------------------------------------------------
const badge = (t, load) => { $("#badge").innerHTML = (load ? '<i class="rs-load"></i>' : "") + esc(t); };
export async function choose(lat, lon, label) {
  clearProperty(); S.study = false; S.twin = null; $("#twinView").replaceChildren(); $("#twinView").hidden = $("#twinControls").hidden = true; $("#gl").hidden = $("#measuredControls").hidden = false;
  S.playing=false; cancelAnimationFrame(S.raf); $("#play").textContent="Play the day"; $("#clay").disabled = $("#heat").disabled = false; $("#sampleStudy").setAttribute("aria-pressed","false");
  S.abort?.abort(); const ctl = (S.abort = new AbortController()), run = ++S.run; badge("Reading LINZ's LiDAR", true);
  $("#result").innerHTML = `<h2>Likely generation</h2><p class="rs-msg"><i class="rs-load"></i>Reading the roof and the sun for this place. About 2 MB from LINZ.</p>`; $("#roofs").hidden = true;
  const propertyRead=getProperty(lat,lon,ctl.signal);
  try {
    const site = await loadSite(lat, lon, { signal: ctl.signal, onStage: (t) => run === S.run && badge(t, true) }); if (run !== S.run) return;
    if (!site.chosen) throw new Error("LINZ has no building outline within 40 m of that point. Pick a point on or beside a building.");
    S.site = site; site.label = label || null; await work(site, site.chosen, run);
    propertyRead.then((property)=>{
      if(S.site!==site||S.study||ctl.signal.aborted)return;
      site.property=property;showProperty(property);S.sc?.buildProperty(property);S.sc?.setPropertyVisible($("#propertyLayer").checked);
    });
  } catch (e) { if (run !== S.run || e?.name === "AbortError") return; badge("Could not read this place"); $("#result").innerHTML = `<h2>Likely generation</h2><p class="rs-msg" role="alert">${esc(e.message || e)}</p><p class="rs-msg">Nothing is estimated in its place.</p>`; }
}
async function work(site, building, run) {
  badge("Reading the roof planes", true); await new Promise((r) => setTimeout(r, 30));
  site.chosen = building; const plan = await analyse({ dsm: site.dsm, point: site.point, climate: site.climate, rings: building.rings }, { onProgress: (t) => run === S.run && badge(t, true) }); if (run !== S.run) return;
  S.plan = plan;
  if (!S.sc) { S.sc = new RoofScene($("#gl"), { tier: matchMedia("(max-width:700px)").matches ? "low" : "high" }); S.sc.canvas.addEventListener("pointerdown", pd); S.sc.canvas.addEventListener("pointerup", pu); }
  S.sc.setSite(site, plan); S.sc.setPropertyVisible($("#propertyLayer").checked); S.sc.setHeat($("#heat").checked); S.sc.setPaths($("#paths").checked); S.sc.setClay($("#clay").checked); $("#legend").hidden = !$("#heat").checked || !plan.panels.length;
  badge(site.label || "Chosen roof"); sunChanged(); render(site, plan); $("#roofs").hidden = false; S.ready = true; document.documentElement.dataset.ready = "1";
}
/** Default for the bare entry route: a plan study; address and map still use measured LiDAR. */
async function show16a(){
 clearProperty(); S.abort?.abort(); const run=++S.run;
 S.study=true; S.site=null; S.plan=null; S.ready=false; S.twin=null;
 if(S.sc){ S.sc.canvas.removeEventListener("pointerdown",pd); S.sc.canvas.removeEventListener("pointerup",pu); S.sc.dispose(); S.sc=null; }
 delete document.documentElement.dataset.ready;
 $("#clay").checked=$("#heat").checked=false; $("#clay").disabled=$("#heat").disabled=true;
 $("#sampleStudy").setAttribute("aria-pressed","true"); $("#legend").hidden=$("#roofs").hidden=true;
 badge("Preparing the 16A plan study",true);
 $("#result").innerHTML='<h2>16A · roof design study</h2><p class="rs-msg">Preparing the proposed timber homes.</p>';
 try{
  $("#gl").hidden=$("#measuredControls").hidden=true;
  $("#twinControls").hidden=true;
  $("#readout").textContent="";
  const m=await import('./twin16a.mjs');
  S.twin=await m.mountTwin16a($("#twinView"),()=>run===S.run);if(run!==S.run)return;
  const panels=Object.values(S.twin.units).reduce((a,b)=>a+b,0);
  $("#twinControls").hidden=false; $("#showSolar").checked=true;
  $("#studySun").value=new Intl.DateTimeFormat("en-NZ",{timeZone:"Pacific/Auckland",hour:"numeric",hourCycle:"h23"}).format(S.twin.app.when); $("#studySunTime").textContent=$("#studySun").value.padStart(2,"0")+":00";
  badge("16A · roof design study");
  $("#result").innerHTML='<h2>16A · roof design study</h2><p><strong>'+panels+' illustrative panels</strong> on 16C and 16D, the proposed roofs.</p><p class="rs-msg">Roof shapes and true-north orientation follow the consent drawings and traced survey. The original interactive 16A model keeps its building form, terrain and plant placements. The roof, decking and landscape finishes are illustrative. The drawing has no verified geographic anchor in this tool; no yield or measured shade is calculated.</p><p><a href="/plan-studio/twins/16a/">Open the full 16A twin</a></p><p class="rs-msg">For measured roof data and a generation estimate, choose a New Zealand address, map point or the public landmark.</p>';
  $("#methodBody").textContent="Design view only: illustrative panels on the north-facing slope of each roof; local geometry on traced survey terrain. Visual shade includes the geometry shown, not measured surroundings.";
  $("#sourcesBody").textContent="16A draft resource-consent set, issue A, 12 May 2025; RC-02 survey, RC-05 area plan, RC-06 plans, RC-07 sections. Survey traced, not survey-grade. Approximate Auckland-region sun; no new address or parcel location is included.";
  S.ready=true;document.documentElement.dataset.ready="1";
  if(document.documentElement.classList.contains('roof-plate')){
   parent.postMessage({type:'assembl:plate-ready'},location.origin);
  }
 }catch(e){if(run!==S.run)return;$("#twinView").replaceChildren();badge("Could not open 16A");$("#result").innerHTML='<p role="alert">'+esc(e.message)+'</p><p><a href="/plan-studio/twins/16a/">Open the original 16A viewer</a>, or use the address search for an estimate.</p>';}
}
$("#sampleStudy").addEventListener('click',()=>{if(!S.study||!S.ready)show16a();});
$("#roofView").addEventListener("click",()=>S.twin?.reset());
$("#siteView").addEventListener("click",()=>S.twin?.reset('overview'));
$("#houseView").addEventListener("click",()=>S.twin?.reset('home'));
$("#studySun").addEventListener("input",e=>{if(!S.twin)return;const hour=+e.target.value;
 const m=S.twin.app.when;
 const d=new Date(m); const dateParts=new Intl.DateTimeFormat("en-NZ",{timeZone:"Pacific/Auckland",year:"numeric",month:"numeric",day:"numeric"}).formatToParts(d);
 const get=k=>+dateParts.find(p=>p.type===k).value;
 S.twin.app.setSun(S.twin.app.constructor.nzToUTC(get("year"),get("month"),get("day"),hour));
 $("#studySunTime").textContent=String(hour).padStart(2,"0")+":00";
});
$("#showSolar").addEventListener("change",e=>{if(S.twin)S.twin.overlay.visible=e.target.checked;});
// click a building in the 3D view to work on that one
let pdown = null; const pd = (e) => { pdown = { x: e.clientX, y: e.clientY, t: performance.now() }; };
const pu = async (e) => { if (!pdown || Math.hypot(e.clientX - pdown.x, e.clientY - pdown.y) > 5 || performance.now() - pdown.t > 450) return; const hit = S.sc.pick(e.clientX, e.clientY); pdown = null; if (!hit) return;
  const b = S.site.buildings.filter((x) => inRings(hit.e, hit.n, x.rings)).sort((a, c) => a.areaM2 - c.areaM2)[0]; if (!b || b === S.site.chosen) return; const run = ++S.run; try { await work(S.site, b, run); } catch (err) { badge("Could not work out that roof"); } };

// ---- the answer ---------------------------------------------------------------------------------------------------------------------------
function chart(plan) {
  const W = 340, H = 130, pad = 18, max = Math.max(...plan.monthlyClear, 1), bw = (W - pad * 2) / 12;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly generation in kWh, with and without the shade of neighbours and trees">`;
  plan.monthly.forEach((v, m) => { const x = pad + m * bw + 3, h = ((H - 34) * v) / max, hc = ((H - 34) * plan.monthlyClear[m]) / max;
    s += `<rect x="${x}" y="${H - 20 - hc}" width="${bw - 6}" height="${hc}" fill="none" stroke="#916a70" stroke-dasharray="2 2"/><rect x="${x}" y="${H - 20 - h}" width="${bw - 6}" height="${h}" rx="2" fill="#7b3b6e"/><text x="${x + (bw - 6) / 2}" y="${H - 6}" text-anchor="middle">${MONTHS[m][0]}</text>`; });
  s += `</svg><p class="rs-msg">kWh a month. Solid: with the real shade of neighbours, trees and the roof's own parts. Dashed: a clear horizon.</p>`;
  const rows = plan.monthly.map((v, m) => `<tr><td>${MONTHS[m]}</td><td>${nf(v)}</td><td>${nf(plan.monthlyClear[m])}</td></tr>`).join("");
  return `<div class="rs-chart">${s}<details><summary>Monthly numbers</summary><div class="rs-scroll"><table class="rs-tbl"><tr><th>Month</th><th>With shade, kWh</th><th>Clear horizon, kWh</th></tr>${rows}</table></div></details></div>`;
}
function render(site, plan) {
  const t = plan.totals;
  if (!t.panels) {
    $("#result").innerHTML = `<h2>Likely generation</h2><p class="rs-msg" role="status">No panels fit on this roof under the rules used: ${plan.planes.length ? "each plane is too small, too steep or gets too little sun" : "LiDAR shows no flat plane big enough"}. The planes found are listed below. Nothing is estimated in their place.</p>`;
  } else {
    $("#result").innerHTML = `<h2>Likely generation</h2>
      <p><span class="rs-chip e">Estimate</span><span class="rs-chip m">Roof and shade: measured</span></p>
      <div class="rs-big"><b>about ${nf(round(t.annualKwh, 50))} kWh</b><span>a year from ${t.panels} panels (${nf(t.kwp, 1)} kW), on average weather</span></div>
      <div class="rs-stats"><div><b>${nf(t.kwhPerKwp, 0)}</b><span>kWh per kW</span></div><div><b>${nf(t.shadeLossShare * 100, 0)} %</b><span>lost to shade</span></div><div><b>${nf(t.areaM2, 0)} m²</b><span>of panel</span></div></div>
      ${chart(plan)}<p class="rs-msg">A range of years would vary. NASA's page gives no uncertainty figure for its sunlight data, so none is invented here.</p>`;
  }
  const rows = plan.planes.map((p) => `<tr><td>${p.id + 1}</td><td>${compass(p.azimuth)}<small>${p.azimuth.toFixed(0)}° bearing</small></td><td>${p.pitch.toFixed(0)}°</td><td>${nf(p.areaRoofM2, 0)} m²</td><td>${nf(p.yearShare * 100, 0)} %<small>of the best roof here</small></td><td>${p.usable ? `<b>${p.panels.length} panels</b>` : `not used<small>${esc(p.why)}</small>`}</td></tr>`).join("");
  $("#roofTable").innerHTML = `<p>${plan.planes.length} flat patches found in LINZ's cells inside ${site.chosen.name ? esc(site.chosen.name) + "'s" : "the"} outline (${site.chosen.areaM2} m² on the ground, ${site.how}). ${nf((plan.cellsInPlanes / Math.max(1, plan.insideCells)) * 100, 0)} % of the outline's cells belong to a plane; ridges, edges, chimneys and trees over the roof do not, and panels keep clear of them.</p>
    <div class="rs-scroll"><table class="rs-tbl"><tr><th>#</th><th>Faces</th><th>Pitch</th><th>Roof area</th><th>Sunlight</th><th>Panels</th></tr>${rows}</table></div>
    <p class="rs-msg">Click another building in the 3D view to work on it instead. A person confirms every plane before it is trusted.</p>`;
  method(site, plan); sources(site);
}
function method(site, plan) {
  $("#methodBody").innerHTML = `<div class="rs-two"><div>
    <h3>Measured</h3><ul>
      <li><b>The roof.</b> LINZ's 1 m LiDAR surface heights inside the building's outline. A plane is a patch of cells that agree on one slope (within 0.15 m over a 3 × 3 block, 8° between neighbours). Its pitch and the way it faces are fitted to those cells.</li>
      <li><b>Shade.</b> For each panel and each step of the year, a line is walked from the panel toward the sun across the LiDAR surface, up to ${ASSUME.reach} m. If any cell stands more than ${ASSUME.shadeTolerance} m above the line, the sun's direct light is blocked. The sky's scattered light is cut by the same surface, by the share of sky each panel can see.</li>
      <li><b>The sun.</b> Its position at every step of twelve typical days (one per month, Klein 1977), by the Meeus low-precision method (about 0.01°). Checked against Meeus's worked example and an independent library in the tests.</li></ul>
    <h3>Published</h3><ul><li><b>Sunlight for the place.</b> NASA POWER's 25-year monthly means of direct, scattered and total sunlight on level ground, and air temperature, for the half-degree cell nearest the point (${nf(site.climate.grid.lat, 1)}, ${nf(site.climate.grid.lon, 1)}). Satellite and model data, not a measurement at your roof.</li></ul></div><div>
    <h3>Assumed (and set here, not found)</h3><ul>
      <li>Panel: ${PANEL.watts} W, ${PANEL.w} × ${PANEL.l} m, ${(ASSUME.moduleEfficiency * 100).toFixed(1)} % efficient, lying ${(PANEL.standoff * 100).toFixed(0)} cm off the roof. Power falls ${(Math.abs(ASSUME.tempCoeffPerK) * 100).toFixed(2)} % per °C of cell temperature above 25 °C; cell temperature from air temperature and NOCT ${ASSUME.noct} °C.</li>
      <li>System losses ${(ASSUME.systemLosses * 100).toFixed(0)} % (wiring, mismatch, dirt, inverter): the default NREL's PVWatts uses. No battery, no export limits, no degradation with age.</li>
      <li>Ground reflects ${(ASSUME.albedo * 100).toFixed(0)} % of sunlight; sky light is taken as even across the sky; glass reflection by the ASHRAE angle rule (b0 ${ASSUME.b0}).</li>
      <li>A plane is used if it gets at least ${(ASSUME.usableShare * 100).toFixed(0)} % of the yearly power of the best possible roof here (north-facing, ${plan.best.tilt}° tilt, no shade) and is under 70° steep. Panels sit in rows, ${0.25} m clear of the plane's edge, on cells that belong to the plane.</li>
      <li>Flat roofs get panels lying flat on the roof, not tilted on frames.</li>
      <li>The month's sunlight is spread over a typical day by a clear-sky shape (Meinel and Meinel) and scaled to NASA's monthly total. That puts average sunlight where a clear day would put it; it carries no real hour-by-hour cloud.</li></ul>
    <h3>How the 3D view is drawn</h3><ul><li>Buildings are LINZ outlines raised from the LiDAR ground model to the roof read from the surface: fitted planes where the roof is planar, the surface itself where it is not. Trees are grown from the canopy height (surface minus ground): each top is the measured top and each crown is as wide as the canopy stays above half that height; where the crown starts is assumed. Roof finishes, cladding, grass and paving are drawn for looks: LINZ's heights carry no materials. The sums do not use the drawing; they walk the measured surface. Tick "Measured LiDAR surface" to see it.</li></ul>
    <h3>What it cannot see</h3><ul><li>Anything LINZ's survey does not hold: trees grown or felled since it was flown, new buildings, roof fittings under about 1 m, glass, or dirt. Hills beyond ${ASSUME.reach} m, or beyond the square read (${site.dsm.n} m wide), are ignored. Roof materials, structure, wiring, consents and the meter are not checked.</li></ul></div></div>`;
}
function sources(site) {
  const sv = site.surface.values.survey, c = site.climate, lic = site.surface.licence;
  $("#sourcesBody").innerHTML = `<p><span class="rs-chip m">Measured</span><span class="rs-chip p">Latest published</span><span class="rs-chip e">Estimate</span><span class="rs-chip a">Assumed</span></p><ul>
    <li><span class="rs-chip m">Measured</span> <b>LiDAR heights.</b> ${esc(sv?.title ?? site.surface.label)}, flown ${esc(sv?.captured?.from ?? "")} to ${esc(sv?.captured?.to ?? site.surface.asOf)}; LINZ New Zealand Elevation open data, 1 m surface model, vertical datum NZVD2016. Read in your browser from LINZ's public bucket. ${esc(lic?.attribution ?? "")} Licence: <a href="${esc(lic?.url)}" rel="noopener">CC BY 4.0</a>. A survey from the air, not a site survey by a licensed surveyor.</li>
    <li><span class="rs-chip m">Measured</span> <b>Building outline.</b> LINZ NZ Building Outlines, layer last edited ${esc(site.outlinesAsOf ?? "date not given")}${site.chosen.capturedTo ? `, this outline from imagery to ${esc(site.chosen.capturedTo)}` : ""}; about ±1 m, roofs of 10 m² and over. ${esc(OUTLINE_CREDIT)} Licence: CC BY 4.0.</li>
    <li><span class="rs-chip p">Latest published</span> <b>Sunlight and temperature.</b> NASA Langley Research Center POWER Project, climatology API ${esc(c.version ?? "")}, ${esc(c.period)}, MERRA-2 and CERES SYN1deg data, cell ${nf(c.grid.lat, 1)}, ${nf(c.grid.lon, 1)}; accessed ${esc(c.accessed)}. NASA's referencing page states no licence or formal terms and asks that the service, version and date accessed are named, as here. NIWA's SolarView was looked at and not used: it has no open licence or open data feed.</li>
    <li><span class="rs-chip m">Measured</span> <b>The sun.</b> Computed here from astronomy (Meeus), no data source. New Zealand clock time by the Pacific/Auckland time zone rules.</li>
    <li><span class="rs-chip e">Estimate</span> <b>Yearly generation.</b> Worked out on this page from the above and the assumptions in the method. An estimate for an average year, not a guarantee, quote or design.</li>
    <li><b>Address search</b> (only if used): LINZ NZ Addresses. ${esc(ADDRESS_CREDIT)} <b>Map:</b> © OpenStreetMap contributors, <a href="https://www.openstreetmap.org/copyright" rel="noopener">ODbL</a>. <b>Maths and code:</b> assembl lab, <code>roof-solar/</code>; panels sized by assumption, not a product. LiDAR reading code is the plan page's LINZ reader.</li></ul>`;
}

// ---- address search ----------------------------------------------------------------------------------------------------------------------
{
  const input = $("#addr"), list = $("#addrList"), msg = $("#addrMsg"); let matches = [], at = -1, timer, ctl, n = 0;
  const open = (o) => { list.hidden = !o; input.setAttribute("aria-expanded", String(o)); if (!o) { at = -1; input.removeAttribute("aria-activedescendant"); } };
  const act = (i) => { at = i; list.querySelectorAll("li").forEach((li, j) => li.setAttribute("aria-selected", String(j === i))); if (i >= 0) input.setAttribute("aria-activedescendant", "ao" + i); };
  const pick = (i) => { const m = matches[i]; if (!m) return; open(false); input.value = m.address; msg.textContent = "Reading that place."; $("#mapBtn").focus?.(); choose(m.lat, m.lon, "Your address"); };
  input.addEventListener("input", () => { clearTimeout(timer); const w = input.value.trim(); if (w.length < 4) { open(false); msg.textContent = ""; return; } timer = setTimeout(async () => { ctl?.abort(); ctl = new AbortController(); const my = ++n; msg.textContent = "Searching LINZ addresses."; try { const r = await askAddress(w, ctl.signal); if (my !== n) return; matches = r.matches;
    list.innerHTML = matches.map((m, i) => { const c = m.address.indexOf(","); return `<li id="ao${i}" role="option" aria-selected="false" data-i="${i}">${esc(c < 0 ? m.address : m.address.slice(0, c))}<small>${esc(c < 0 ? "" : m.address.slice(c + 1).trim())}</small></li>`; }).join(""); open(matches.length > 0); msg.textContent = matches.length ? `${matches.length} match${matches.length > 1 ? "es" : ""}${r.more ? ", more not shown" : ""}. ${ADDRESS_CREDIT}` : "No current address matches. Check the number and street, or pick on the map."; } catch (e) { if (e?.name !== "AbortError") msg.textContent = e.message; } }, 300); });
  input.addEventListener("keydown", (e) => { if (e.key === "ArrowDown") { e.preventDefault(); if (!list.hidden) act(Math.min(matches.length - 1, at + 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); act(Math.max(0, at - 1)); } else if (e.key === "Enter" && at >= 0) { e.preventDefault(); pick(at); } else if (e.key === "Escape") open(false); });
  list.addEventListener("mousedown", (e) => { const li = e.target.closest("li"); if (li) { e.preventDefault(); pick(+li.dataset.i); } });
  input.addEventListener("blur", () => setTimeout(() => open(false), 150));
}
// ---- map and landmark -----------------------------------------------------------------------------------------------------------------------
let map = null;
$("#mapBtn").addEventListener("click", () => { const w = $("#mapWrap"), o = w.hidden; w.hidden = !o; $("#mapBtn").setAttribute("aria-expanded", String(o)); if (o && !map) map = mapLite($("#map"), { lat: S.site?.point.lat ?? LANDMARK.lat, lon: S.site?.point.lon ?? LANDMARK.lon, zoom: 17, onPick: (lat, lon) => { if (!inNZ(lat, lon)) { $("#addrMsg").textContent = "That point is outside New Zealand's main islands."; return; } choose(lat, lon, "Your point"); } }); });
$("#landmark").addEventListener("click", () => { choose(LANDMARK.lat, LANDMARK.lon, LANDMARK.name); map?.set(LANDMARK.lat, LANDMARK.lon, 17); });

// ---- start ---------------------------------------------------------------------------------------------------------------------------------
{
  const now = new Date(), start = q.get("d") ? +q.get("d") : Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 864e5);
  $("#day").value = Math.max(1, Math.min(365, start)); $("#min").value = q.get("m") ? +q.get("m") : 15 * 60 + 30; sunChanged();
  const lat = parseFloat(q.get("lat")), lon = parseFloat(q.get("lon"));
  if (inNZ(lat, lon)) choose(lat, lon, "The point in the link"); else if(q.get("study")==="landmark") choose(LANDMARK.lat, LANDMARK.lon, LANDMARK.name); else show16a();
}

addEventListener('message',event=>{
 if(event.source!==parent||event.origin!==location.origin||!document.documentElement.classList.contains('roof-plate'))return;
 if(event.data?.type==='assembl:roof-shot'&&['detail','home','overview'].includes(event.data.view))S.twin?.reset(event.data.view);
});

// ---- 1-click assembl. Studio Still PNG export ---------------------------------------------------------------------------------------------
function exportSolarStill() {
  const cv = document.querySelector('#twinView canvas') && !$('#twinView').hidden
    ? document.querySelector('#twinView canvas')
    : $('#gl');
  if (!cv) return;
  requestAnimationFrame(() => {
    try {
      const out = document.createElement('canvas');
      out.width = cv.width;
      out.height = cv.height;
      const ctx = out.getContext('2d');
      ctx.drawImage(cv, 0, 0);
      const barH = Math.max(40, Math.round(out.height * 0.048));
      ctx.fillStyle = 'rgba(246, 241, 237, 0.94)';
      ctx.fillRect(0, out.height - barH, out.width, barH);
      ctx.fillStyle = '#240B21';
      ctx.font = `500 ${Math.round(barH * 0.42)}px "Instrument Sans", system-ui, sans-serif`;
      const place = S.site?.label || '16D Proposed Home';
      const kwh = $('#kwh')?.textContent ? ` · ${$('#kwh').textContent}` : '';
      ctx.fillText(`assembl. Solar · ${place}${kwh} · ${new Date().toISOString().slice(0, 10)}`, 18, out.height - Math.round(barH * 0.34));
      const a = document.createElement('a');
      a.download = `assembl-roof-solar-${new Date().toISOString().slice(0, 10)}.png`;
      a.href = out.toDataURL('image/png');
      a.click();
    } catch (e) { console.warn('Solar still export:', e); }
  });
}
$('#stillBtn')?.addEventListener('click', exportSolarStill);
$('#stillBtnStudy')?.addEventListener('click', exportSolarStill);
