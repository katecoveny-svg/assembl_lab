// assembl lab · Auckland live: the page. Finds a route, stop or ferry terminal, shows where the vehicles are right now,
// and (when the at-live function is switched on) whether they are late and what is coming next. Never invents a delay.
import * as X from './transit.js';
import { nearbyStops, readSavedStops, searchWords } from './passenger.js';
import { statusColour } from './status.js';

const POSITIONS_URL = 'https://wurwcrgxjjwqdaxqceey.supabase.co/functions/v1/bus-positions';
const AT_LIVE_URL = 'https://wurwcrgxjjwqdaxqceey.supabase.co/functions/v1/at-live';
const DATA = new URL('./data/', import.meta.url).href;
const qs = new URLSearchParams(location.search);
const phone = matchMedia('(max-width: 899px)').matches || matchMedia('(pointer: coarse)').matches;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ago = (sec) => { if (sec == null) return 'unknown'; const d = Math.max(0, Math.round(Date.now() / 1000 - sec)); return d < 90 ? `${d} s ago` : d < 5400 ? `${Math.round(d / 60)} min ago` : `${Math.round(d / 3600)} h ago`; };
const cleanHead = (h) => String(h || '').replace(/\s+\d+\b(?=\s|$)/g, '').replace(/\s+Via\s+[A-Z0-9 ,]+$/i, '').replace(/\s+/g, ' ').trim();
const MODE_WORD = { bus: 'Bus', train: 'Train', ferry: 'Ferry' };

// time of day for the sky: now, or ?time=HH:MM (today, Auckland time) for checking the light; the truth line says which
let skyMs = Date.now(), skyNote = '';
if (/^\d{1,2}:\d\d$/.test(qs.get('time') || '')) {
  const [h, m] = qs.get('time').split(':').map(Number), today = X.nzServiceDate(Date.now()).replace(/-/g, '');
  skyMs = X.gtfsTimeToEpoch(today, `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`) * 1000; skyNote = ` · sky set to ${qs.get('time')} by the page address, not now`;
}

let nearController, stopRun = 0, locationRun = 0;
let savedStops = []; try { savedStops = readSavedStops(localStorage); } catch {}
const S = { index: null, shapes: null, positions: null, posSource: 'live', posError: null, updates: new Map(), alerts: [], atLive: { state: 'checking' },
  mode: 'all', sel: null, arrivals: null, weather: null, world: null };

// ------------------------------------------------------------------------------------------------ start
const canvas = $('#scene');
const [routesJson, stopsJson] = await Promise.all([fetch(DATA + 'routes.json').then((r) => r.json()), fetch(DATA + 'stops.json').then((r) => r.json())]);
S.index = X.buildIndex(routesJson, stopsJson); S.gtfs = routesJson;
const mode = qs.get('view');
const listOnly = mode === 'list' || (mode !== '3d' && (phone || matchMedia('(prefers-reduced-motion: reduce)').matches));
const switchView = $('#switch-view');
const alternate = new URL(location.href);
alternate.searchParams.set('view', listOnly ? '3d' : 'list');
switchView.href = alternate.href;
switchView.textContent = listOnly ? 'Open 3D city' : 'Use list view';
document.body.classList.toggle('list-only', listOnly);
if (!listOnly) try {
  const { createWorld } = await import('./scene.js');
  S.world = await createWorld(canvas, { phone, capture: qs.has('capture'), timeMs: skyMs });
  window.liveWorld = S.world;
} catch (e) { console.error(e); document.body.classList.add('list-only'); switchView.textContent = 'Retry 3D city'; alternate.searchParams.set('view', '3d'); switchView.href = alternate.href; $('#detail').innerHTML = `<p class="note warn">The 3D city could not start in this browser (${esc(e.message)}). The search and lists below still work.</p>`; }
wireUi(); render(); fitInset();
function fitInset() { if (S.world) S.world.setInset(phone && innerWidth < 900 ? $('#panel').getBoundingClientRect().height : 0); }
addEventListener('resize', fitInset); new ResizeObserver(fitInset).observe($('#panel'));
await Promise.all([loadPositions(), loadAtLive(), loadWeather()]);
setInterval(loadPositions, 15000);
setInterval(() => S.atLive.state === 'on' ? loadAtLive() : null, 20000);
setInterval(() => S.atLive.state !== 'on' ? loadAtLive() : null, 120000);
setInterval(() => { if (!skyNote && S.world) S.world.setTime(Date.now(), S.weather?.cloudPct ?? null); }, 5 * 60000);
setInterval(renderTruth, 5000);
setInterval(() => { if (!document.hidden && S.sel?.kind === 'stop') void refreshDepartures(S.sel); }, 45000);
deepLink();
window.liveReady = true;

// ------------------------------------------------------------------------------------------------ data
async function getJSON(url, ms = 9000) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' }); if (!r.ok) { const e = new Error(`HTTP ${r.status}`); e.status = r.status; throw e; } return await r.json(); } finally { clearTimeout(t); }
}
async function loadPositions() {
  try {
    if (qs.has('sample')) throw new Error('sample asked for in the address');
    S.positions = X.parsePositions(await getJSON(POSITIONS_URL)); S.posSource = 'live'; S.posError = null;
  } catch (e) {
    S.posError = e.message;
    if (!S.positions || S.posSource === 'sample') { const j = await getJSON(DATA + 'sample-positions.json'); S.positions = X.parsePositions(j); S.posSource = 'sample'; S.sampleAt = j.sample?.savedAt; }
  }
  pushVehicles(); render();
}
async function loadAtLive(stopIds = null) {
  try {
    const j = await getJSON(AT_LIVE_URL + (stopIds?.length ? '?stop=' + stopIds.map(encodeURIComponent).join(',') : ''), 10000);
    if (j.tripUpdates?.error) throw new Error('trip updates ' + j.tripUpdates.error);
    S.updates = X.parseTripUpdates(j.tripUpdates); S.alerts = j.alerts?.error ? [] : X.parseAlerts(j.alerts);
    S.atLive = { state: 'on', at: Math.round(Date.parse(j.fetchedAt) / 1000) || Math.round(Date.now() / 1000), alertsOk: !j.alerts?.error };
    pushVehicles(); render();
    return j;
  } catch (e) {
    S.atLive = { state: 'off', reason: e.status === 404 ? 'not deployed yet' : e.status === 503 ? 'not switched on yet' : 'not reachable', checked: Date.now() };
    S.updates = new Map(); S.alerts = []; pushVehicles(); render();
    return null;
  }
}
async function loadWeather() {
  try {
    const j = await getJSON('/api/live/?feeds=weather&place=auckland'); const w = j.feeds?.weather; if (!w || w.error) throw new Error('no weather');
    S.weather = { tempC: w.values.tempC, windKmh: w.values.windKmh, cloudPct: w.values.cloudPct, rainMm: w.values.rainMm, at: w.values.at, rainChance: w.values.today?.rainChancePct, source: w.source?.name };
    if (S.world && !skyNote) S.world.setTime(Date.now(), S.weather.cloudPct);
    const el = $('#weather'); el.hidden = false;
    el.textContent = `${Math.round(S.weather.tempC)}°C · wind ${Math.round(S.weather.windKmh)} km/h · cloud ${Math.round(S.weather.cloudPct)}%${S.weather.rainMm ? ` · rain ${S.weather.rainMm} mm` : ''}`;
    el.title = `Auckland weather now, ${S.weather.source || 'Open-Meteo'} (modelled), ${S.weather.at || ''}`;
  } catch { S.weather = null; }
}

// ------------------------------------------------------------------------------------------------ vehicles into the scene
function freshMappedVehicle(v, now = Math.round(Date.now()/1000)) {
  return !!v && S.posSource === 'live' && !S.posError && X.timestampFresh(v.ts, now) && X.inArea(v.lat,v.lon);
}
function followHref(id) {
  const u = new URL(location.href);
  for (const k of ['route','stop','sample']) u.searchParams.delete(k);
  u.searchParams.set('view','3d'); u.searchParams.set('vehicle',id);
  return u.pathname + '?' + u.searchParams;
}
function vehicleInfo(v) {
  const candidate = v.tripId ? S.updates.get(v.tripId) : null;
  const u = candidate && (!candidate.routeId || candidate.routeId === v.routeId) && (!candidate.vehicleId || candidate.vehicleId === v.id) ? candidate : null;
  const r = v.routeId ? S.index.routes.get(v.routeId) : null;
  const st = X.delayStatus(S.posSource === 'live' && !S.posError && X.timestampFresh(v.ts, Math.round(Date.now()/1000)) ? u : null, Math.round(Date.now() / 1000));
  return { r, u, st, mode: r?.mode || 'bus' };
}
function pushVehicles() {
  if (!S.positions) return;
  const counts = { bus: 0, train: 0, ferry: 0 }, out = [];
  for (const v of S.positions.vehicles) {
    if (!v.routeId) continue;
    const { st, mode } = vehicleInfo(v); counts[mode]++;
    if (S.mode !== 'all' && S.mode !== mode) continue;
    if (!X.inArea(v.lat, v.lon)) continue;
    const p = X.toWorld(v.lat, v.lon);
    out.push({ id: v.id, mode, x: p.x, z: p.z, heading: v.bearing == null ? null : v.bearing * Math.PI / 180, colour: statusColour(st) });
  }
  for (const k of Object.keys(counts)) document.querySelector(`[data-count="${k}"]`).textContent = counts[k];
  S.counts = counts; S.world?.setVehicles(out);
}

// Roads around a selected static stop are visual context, not a trip, directions or legal access.
async function streetsNear(sel,stop) {
  const ctl=nearController=new AbortController();
  try{
    const reply=await fetch('/api/garden-site',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({mode:'roads',lat:stop.lat,lon:stop.lon}),signal:AbortSignal.any([ctl.signal,AbortSignal.timeout(8000)])});
    if(!reply.ok||S.sel!==sel)return;
    const {roads}=await reply.json();
    if(S.sel!==sel||ctl.signal.aborted||roads?.status!=='available')return;
    S.nearStreetNames=[...new Set(roads.lines.filter(r=>r.distanceM<=140).map(r=>r.name))].slice(0,3);
    render();
  }catch{ /* transport remains usable when the streets layer cannot answer */ }
}
// ------------------------------------------------------------------------------------------------ selection
async function select(sel, { fly = true, closeUp = false } = {}) { // a later choice always wins over a slower earlier one (S.sel !== sel checks)
  S.world?.stopFlight();
  nearController?.abort(); S.nearStreetNames=[];
  ++locationRun; ++stopRun; S.sel = sel; S.closeUpBus = closeUp; S.arrivals = null; setPanelSmall(false);
  const w = S.world;
  if (w) { w.select(sel?.kind === 'vehicle' ? sel.id : null); if (sel?.kind !== 'vehicle') w.unfollow(); }
  if (sel?.kind === 'route') { await ensureShapes(); if (S.sel !== sel) return; const r = S.index.routes.get(sel.id); w?.showRoute(S.shapes[sel.id], r?.color && r.color !== '000000' ? '#' + r.color : '#ffffff'); w?.showStop(null); fitRoute(sel.id); }
  else if (sel?.kind === 'stop') {
    const s = S.index.stops.get(sel.id); w?.showRoute(null); const p = X.toWorld(s.lat, s.lon); w?.showStop(p.x, p.z); if (fly && X.inArea(s.lat, s.lon)) w?.flyTo([p.x, 0, p.z], 700, 0.55);
    render(); S.arrivals = { loading: true }; render();
    if(X.inArea(s.lat,s.lon))void streetsNear(sel,s);
    void refreshDepartures(sel);
  } else if (sel?.kind === 'vehicle') {
    const v = S.positions?.vehicles.find((x) => x.id === sel.id);
    if (closeUp) w?.showRoute(null);
    else if (v?.routeId) { await ensureShapes(); if (S.sel !== sel) return; const r = S.index.routes.get(v.routeId); w?.showRoute(S.shapes[v.routeId], r?.color && r.color !== '000000' ? '#' + r.color : '#ffffff'); }
    w?.showStop(null); if (v && fly && X.inArea(v.lat, v.lon)) {
      const p = X.toWorld(v.lat, v.lon), ground = w?.heightAt(p.x,p.z) || 0, close = closeUp && freshMappedVehicle(v);
      w?.flyTo([p.x, ground + (close ? 2 : 0), p.z], close ? 79 : 420, close ? 0.36 : 0.42, close && v.bearing != null ? v.bearing * Math.PI / 180 : null);
    }
  } else { w?.showRoute(null); w?.showStop(null); }
  const u = new URL(location.href); ['route', 'stop', 'vehicle'].forEach((k) => u.searchParams.delete(k));
  if (sel?.kind === 'route') u.searchParams.set('route', S.index.routes.get(sel.id)?.short || sel.id);
  if (sel?.kind === 'stop') u.searchParams.set('stop', S.index.stops.get(sel.id)?.code || sel.id);
  if (sel?.kind === 'vehicle' && closeUp) u.searchParams.set('vehicle',sel.id);
  history.replaceState(null, '', u);
  const other = new URL(u, location.href); other.searchParams.set('view', listOnly ? '3d' : 'list'); switchView.href = other.href;
  render();
}
// A platform lookup must not turn off network-wide delays if that one stop fails.
async function refreshDepartures(sel) {
  const request = ++stopRun, s = S.index.stops.get(sel.id);
  const ids = (s.children?.length ? s.children : [s.id]).slice(0, 6);
  try {
    const j = await getJSON(AT_LIVE_URL + '?stop=' + ids.map(encodeURIComponent).join(','), 10000);
    if (S.sel !== sel || request !== stopRun) return;
    const readable = ids.filter(id => Array.isArray(j?.stops?.[id]?.trips) && !j.stops[id].error);
    S.arrivals = readable.length ? { trips: readable.flatMap(id => j.stops[id].trips), partial: readable.length < ids.length, verified: j.stopTripsVerified } : { failed: true };
  } catch {
    if (S.sel !== sel || request !== stopRun) return;
    S.arrivals = { failed: true };
  }
  render();
}

async function ensureShapes() { if (!S.shapes) S.shapes = (await (await fetch(DATA + 'shapes.json')).json()).shapes; }
function fitRoute(id) {
  const enc = S.shapes?.[id]; if (!enc?.length || !S.world) return;
  let x = 0, z = 0, minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (let i = 0; i < enc[0].length; i += 2) { x += enc[0][i]; z += enc[0][i + 1]; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  const span = Math.max(maxX - minX, maxZ - minZ); S.world.flyTo([(minX + maxX) / 2, 0, (minZ + maxZ) / 2], Math.min(24000, Math.max(1500, span * 1.15)), 0.75);
}
function deepLink() {
  const r = qs.get('route'), s = qs.get('stop'), id = qs.get('vehicle');
  const target = id && S.positions?.vehicles.find(v=>v.id===id);
  if (id && freshMappedVehicle(target)) { void select({kind:'vehicle',id},{closeUp:true}); return; }
  if (id) {
    const route = S.index.routes.get(target?.routeId);
    if (route) { void select({kind:'route',id:route.id}); return; }
    const u=new URL(location.href);u.searchParams.delete('vehicle');history.replaceState(null,'',u);
    $('#q').placeholder='Bus no longer live. Search a route';
  }
  if (r) { const m = S.index.byShort.get(r.toLowerCase())?.[0] || S.index.routes.get(r); if (m) select({ kind: 'route', id: m.id }); }
  else if (s) { const m = [...S.index.stops.values()].find((x) => x.code === s || x.id === s); if (m) select({ kind: 'stop', id: m.id }); }
}

// ------------------------------------------------------------------------------------------------ rendering the panel
function statusPill(st) { return `<span class="pill"><i style="--c:${statusColour(st)}"></i>${esc(st.label)}</span>`; }
function delayNote() {
  if (S.atLive.state === 'on') return '';
  return `<p class="note">Late or on time, and live arrival times, switch on when Auckland Transport's trip-updates feed is connected to this page. Until then vehicles show grey: delay not known. Nothing here is guessed.</p>`;
}
function render() {
  const d = $('#detail'), sel = S.sel, now = Math.round(Date.now() / 1000);
  $('#panel').hidden = !document.body.classList.contains('list-only') && !sel;
  if ($('#panel').hidden) setPanelSmall(false);
  if (!S.positions && !sel) { d.innerHTML = '<p class="muted">Loading the live positions…</p>'; renderTruth(); return; }
  let html = '';
  if (!sel) {
    const c = S.counts || { bus: 0, train: 0, ferry: 0 };
    html += `<h2>Routes and vehicles</h2><p>${S.posSource === 'sample' ? 'In this saved sample' : (!S.posError && X.timestampFresh(S.positions?.newestFix, now)) ? 'Latest live snapshot' : 'In the last available snapshot (not current)'}: <b>${c.bus}</b> buses, <b>${c.train}</b> trains and <b>${c.ferry}</b> ferries are out on trips across Auckland. Search a route, stop or ferry terminal, or tap a vehicle.</p>`;
    if (S.atLive.state === 'on') {
      const tally = { 'on-time': 0, late: 0, early: 0, unknown: 0, cancelled: 0 };
      for (const v of S.positions.vehicles) if (v.routeId) tally[vehicleInfo(v).st.status]++;
      html += `<p class="mono">${tally['on-time']} on time · ${tally.late} late · ${tally.early} early · ${tally.unknown} not known</p>`;
      if (S.alerts.length) html += `<p class="muted">${S.alerts.length} service alerts are in force across the network. Choose a route or stop to see its own.</p>`;
    }
    if (listOnly && S.positions) {
      const trips = new Map();
      for (const vehicle of S.positions.vehicles) {
        const route = S.index.routes.get(vehicle.routeId);
        if (!route || (S.mode !== 'all' && route.mode !== S.mode)) continue;
        const item = trips.get(route.id) || { route, count: 0 };
        item.count++; trips.set(route.id, item);
      }
      const routes = [...trips.values()].sort((a,b) => b.count - a.count || a.route.short.localeCompare(b.route.short));
      html += '<h3>Routes in this snapshot</h3>' + (routes.length ? '<ul class="rows">' + routes.slice(0,12).map(({route,count}) => `<li><button type="button" class="row" data-route="${esc(route.id)}"><span class="r">${esc(route.short)}</span><span class="h">${esc(cleanHead(route.heads[0] || MODE_WORD[route.mode]))}</span><span class="w">${count}<small>vehicles</small></span></button></li>`).join('') + '</ul>' : '<p>No vehicles reported for this filter.</p>');
    }
    html += delayNote();
    if (S.posSource === 'sample') html += `<p class="note warn">Live positions could not be reached (${esc(S.posError)}). Showing a saved sample of a real answer from ${esc(fmtTime(S.sampleAt))}. It is not live.</p>`;
    html += `<h3>Try</h3><div class="chips">${['70', 'NX1', 'E-W', 'DEV', 'Britomart', 'Devonport'].map((q) => `<button data-try="${q}">${q}</button>`).join('')}</div>`;
  } else if (sel.kind === 'nearby' || sel.kind === 'saved') {
    const near = sel.kind === 'nearby';
    html += `<p class="panel-kicker">YOUR NEXT DEPARTURE</p><h2>${near ? 'Nearby stops' : 'Saved stops'}</h2>`;
    if (near) html += `<p class="muted">${esc(sel.message || 'Choose a stop for departures. Distances are in a straight line, not walking directions.')}</p>`;
    const rows = near ? sel.rows || [] : savedStops.map(id => ({stop:S.index.stops.get(id)})).filter(r=>r.stop);
    html += rows.length ? `<ul class="rows stop-list">${rows.map(({stop,metres})=>`<li><button class="row" data-stop="${esc(stop.id)}"><span class="r">${esc(stop.code || '↗')}</span><span class="h"><b>${esc(stop.name)}</b><small>${esc(stop.modes.map(m=>MODE_WORD[m]).join(' · '))}</small></span><span class="w">${metres == null ? '›' : metres < 1000 ? metres+' m' : (metres/1000).toFixed(1)+' km'}</span></button></li>`).join('')}</ul>` : (near ? '' : '<p class="muted">Open a stop and choose Save stop to keep it here on this browser.</p>');
    html += '<div class="actions"><button class="ghost" data-clear>Close</button></div>';
  } else if (sel.kind === 'vehicle') {
    const v = S.positions?.vehicles.find((x) => x.id === sel.id);
    if (!v) html += `<h2>Vehicle gone</h2><p class="muted">This vehicle is no longer in the live feed. It may have finished its trip.</p>`;
    else {
      const { r, u, st, mode } = vehicleInfo(v);
      html += `<p class="muted">${MODE_WORD[mode]}</p><h2>${esc(r?.short || v.routeId)}</h2>${statusPill(st)}`;
      html += `<dl class="facts">`;
      if (r?.heads?.length) html += `<dt>Route destinations</dt><dd>${r.heads.map(cleanHead).filter(Boolean).map(esc).join(' · ')}<br><small>Direction of this vehicle not confirmed</small></dd>`;
      html += `<dt>Speed</dt><dd>${v.speedKmh == null ? 'not reported' : 'about ' + v.speedKmh + ' km/h'}</dd>`;
      if (v.occupancy != null) html += `<dt>Room</dt><dd>${esc(X.OCCUPANCY[v.occupancy] || 'not reported')}</dd>`;
      const fresh = freshMappedVehicle(v,now);
      html += `<dt>Position</dt><dd>${fresh ? 'AT live fix' : S.posSource==='sample' ? 'Saved sample, not live' : 'Last reported position'} · ${ago(v.ts)}</dd>`;
      if (u?.stopId && X.timestampFresh(u.ts, now) && S.posSource === 'live' && !S.posError) { const s = S.index.stops.get(u.stopId); html += `<dt>Last stop event</dt><dd>${esc(s?.name || u.stopId)}, ${u.event === 'departure' ? 'left' : 'reached'} ${X.nzClock(u.time)}</dd>`; }
      html += `<dt>Vehicle</dt><dd class="mono">${esc(v.id)}</dd></dl>`;
      if (!X.inArea(v.lat, v.lon)) html += `<p class="note">This vehicle is outside the 3D area (the central isthmus, about 21 by 19 km). It is listed here but not drawn.</p>`;
      html += `<div class="actions">${fresh ? S.world ? `<button data-track="${esc(v.id)}">Follow ${MODE_WORD[mode].toLowerCase()} in 3D</button>` : `<a href="${esc(followHref(v.id))}">Follow ${MODE_WORD[mode].toLowerCase()} in 3D</a>` : ''}<button class="ghost" data-route="${esc(v.routeId)}">Whole route</button><button class="ghost" data-clear>Close</button></div>`;
      if (fresh) html += '<p class="muted mono">AT position · representative 3D vehicle</p>';
      html += delayNote();
    }
  } else if (sel.kind === 'route') {
    const r = S.index.routes.get(sel.id), vs = S.positions?.vehicles.filter((v) => v.routeId === sel.id) || [];
    html += `<p class="muted">${MODE_WORD[r.mode]} route</p><h2>${esc(r.short)}</h2><p>${r.heads.map((h) => esc(cleanHead(h))).join('<br>')}</p>`;
    const al = X.alertsFor(S.alerts, { routeIds: [sel.id] }, now); html += al.map(alertHtml).join('');
    const mapped = vs.filter(v=>freshMappedVehicle(v,now)).sort((a,b)=>b.ts-a.ts);
    const demo = qs.get('demo') === 'at';
    const downtown = demo ? mapped.find(v=>{const {x,z}=X.toWorld(v.lat,v.lon);return x>-2200 && x<-1000 && z>-650 && z<430;}) : null;
    if (mapped.length && r.mode === 'bus') {
      const candidate=downtown || mapped[0];
      html += `<section class="follow-feature"><div><b>${mapped.length} live ${mapped.length===1?'bus':'buses'} on the map</b><small>AT fix ${ago(candidate.ts)}${downtown ? ' · downtown demo' : ''}</small></div>${S.world ? `<button data-track="${esc(candidate.id)}">Follow a bus</button>` : `<a href="${esc(followHref(candidate.id))}">Follow a bus</a>`}</section>`;
    }
    html += `<h3>Vehicles reported on this route · ${vs.length}</h3>`;
    html += vs.length ? `<ul class="rows">${vs.map((v) => { const { st } = vehicleInfo(v); return `<li><button type="button" class="row" data-vehicle="${esc(v.id)}"><span class="r"><i style="--c:${statusColour(st)}"></i></span><span class="h">${esc(S.atLive.state === 'on' ? st.label : v.speedKmh ? 'Moving, about ' + v.speedKmh + ' km/h' : v.speedKmh === 0 ? 'Stopped' : 'Speed not reported')}<small>${S.atLive.state === 'on' && v.speedKmh != null ? 'about ' + v.speedKmh + ' km/h · ' : ''}reported ${ago(v.ts)}${X.inArea(v.lat, v.lon) ? '' : ' · outside the 3D area'}</small></span><span class="w">›</span></button></li>`; }).join('')}</ul>` : `<p class="muted">No vehicle on this route is in the live feed right now.</p>`;
    html += delayNote() + `<div class="actions"><button class="ghost" data-clear>Close</button></div>`;
  } else if (sel.kind === 'stop') {
    const s = S.index.stops.get(sel.id);
    html += `<p class="muted">${s.modes.includes('ferry') ? 'Ferry terminal' : s.modes.includes('train') ? 'Train station' : 'Stop'}${s.code ? ` · ${esc(s.code)}` : ''}</p><h2>${esc(s.name)}</h2>`;
    html += `<div class="chips">${s.routes.map((id) => S.index.routes.get(id)).filter(Boolean).sort((a, b) => a.short.localeCompare(b.short, 'en', { numeric: true })).map((r) => `<button data-route="${esc(r.id)}">${esc(r.short)}</button>`).join('')}</div>`;
    if(S.nearStreetNames?.length)html += `<p class="muted" data-linz-streets>Nearby streets: ${S.nearStreetNames.map(esc).join(' · ')} <small><a href="https://data.linz.govt.nz/layer/123110-nz-addresses-roads/" target="_blank" rel="noopener noreferrer" title="LINZ NZ Addresses: Roads, CC BY 4.0">LINZ</a></small></p>`;
    const ids = s.children?.length ? [s.id, ...s.children] : [s.id];
    html += X.alertsFor(S.alerts, { routeIds: [], stopIds: ids }, now).map(alertHtml).join('');
    html += `<div class="stop-heading"><h3>Next departures</h3><button class="save-stop" data-save-stop="${esc(s.id)}" aria-pressed="${savedStops.includes(s.id)}">${savedStops.includes(s.id) ? 'Saved ✓' : 'Save stop'}</button></div>` + arrivalsHtml(s);
    html += `<div class="actions"><button class="ghost" data-clear>Close</button></div>`;
  }
  if (d.innerHTML !== html) {
    const active = d.contains(document.activeElement) ? document.activeElement : null;
    const identity = active ? [...active.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value]) : [];
    d.innerHTML = html;
    if (identity.length) [...d.querySelectorAll('button')].find(b=>identity.every(([k,v])=>b.getAttribute(k)===v))?.focus({ preventScroll: true });
  }
  renderTruth();
}
function arrivalsHtml(s) {
  const a = S.arrivals;
  if (!a || a.loading) return `<p class="muted">Checking…</p>`;
  if (a.off || a.failed) {
    const near = X.vehiclesForStop(s, S.positions?.vehicles || []);
    let h = `<p class="note">${a.failed ? 'The timetable for this stop could not be read just now.' : "Live arrival times need Auckland Transport's trip updates, which are not connected to this page yet."} Meanwhile, these vehicles are out on routes that stop here, nearest first. Distance is a straight line, not a time, and a vehicle may be heading away.</p>`;
    h += near.length ? `<ul class="rows">${near.map((v) => { const r = S.index.routes.get(v.routeId); return `<li><button type="button" class="row" data-vehicle="${esc(v.id)}"><span class="r">${esc(r?.short || v.routeId)}</span><span class="h">${'Direction not confirmed'}<small>reported ${ago(v.ts)}</small></span><span class="w">${v.metres < 1000 ? v.metres + ' m' : (v.metres / 1000).toFixed(1) + ' km'}<small>away</small></span></button></li>`; }).join('')}</ul>` : `<p class="muted">No vehicle on these routes is in the live feed right now.</p>`;
    return h;
  }
  // Recompute when an update ages out or a subsequent poll fails. Never freeze a once-fresh ETA.
  const rows = X.arrivalsForStop(a.trips, S.updates, Math.round(Date.now() / 1000), { routes: S.index.routes, limit: 10 });
  if (!rows.length) return a.partial ? `<p class="note">The timetable was only available for some platforms. <a href="https://at.govt.nz/bus-train-ferry/service-announcements/check-before-you-travel">Check with AT.</a></p>` : `<p class="muted">Nothing due here in the next two hours by the timetable.</p>`;
  return `<ul class="rows">${rows.map((r) => { const st = r.status === 'estimated' ? { status: 'unknown', label: 'Estimate from last reported delay' } : r.status === 'cancelled' ? { status: 'cancelled', label: 'Cancelled' } : { status: 'unknown', label: r.status === 'stale' ? 'Scheduled · update stale' : 'Scheduled' };
    return `<li><button type="button" class="row" data-route="${esc(r.routeId)}"><span class="r">${esc(r.route)}</span><span class="h">${esc(cleanHead(r.headsign))}<small><i style="--c:${statusColour(st)}"></i> ${esc(st.label)}</small></span><span class="w">${r.status === 'cancelled' ? '–' : r.dueMin === 0 ? 'Due' : r.dueMin + ' min'}<small>${r.status === 'estimated' ? 'estimated ' + X.nzClock(r.predicted) : 'scheduled ' + X.nzClock(r.scheduled)}</small></span></button></li>`; }).join('')}</ul>`
    + (a.partial ? `<p class="note">Some platform timetables were unavailable.</p>` : '')
    + (a.verified === false ? `<p class="muted mono">Timetable from AT's GTFS API through at-live; this link is new and still being checked.</p>` : '');
}
function alertHtml(a) { return `<div class="alert"><b>${esc(a.header || 'Service alert')}</b>${esc(a.description).slice(0, 400)} <a href="https://at.govt.nz/bus-train-ferry/service-announcements/check-before-you-travel">Check official AT travel updates</a></div>`; }
function fmtTime(iso) { const t = Date.parse(iso); return Number.isFinite(t) ? new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(t) : 'an earlier time'; }
function renderTruth() {
  const p = S.positions, sun = S.world?.sun;
  const current = p && !S.posError && X.timestampFresh(p.newestFix, Math.round(Date.now() / 1000));
  const pos = !p ? 'Positions: loading' : S.posSource === 'sample' ? `Positions: SAVED SAMPLE from ${fmtTime(S.sampleAt)}, not live` : `Positions: Auckland Transport, ${current ? 'live' : 'stale or unavailable'}, newest fix ${X.nzClock(p.newestFix)} (${ago(p.newestFix)})`;
  const del = S.atLive.state === 'on' ? `Delays and alerts: AT trip updates ${ago(S.atLive.at)}` : `Delays: not connected yet`;
  const sunTxt = sun ? (sun.elevation > 0 ? ` · sun ${Math.round(sun.elevation)}° up` : ' · sun down') : '';
  const short = !p ? 'Loading' : S.posSource === 'sample' ? `SAVED SAMPLE ${fmtTime(S.sampleAt)}, not live` : `${current ? 'Live' : 'Stale or unavailable'} · newest fix ${X.nzClock(p.newestFix)} (${ago(p.newestFix)})`;
  const src = $('#source-detail'), content = sourcesHtml(pos, del) + esc(sunTxt + skyNote);
  if (src.innerHTML !== content && !src.contains(document.activeElement)) src.innerHTML = content;
  const live = $('#truth-live');
  live.dataset.state = S.posSource === 'sample' ? 'sample' : current ? 'current' : 'other';
  live.textContent = short + (S.atLive.state === 'on' ? '' : ' · no delay feed');
}
function gtfsSpan() { const f = (d) => d && /^\d{8}$/.test(d) ? new Intl.DateTimeFormat('en-NZ', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8))) : ''; return S.gtfs?.feedStart ? `${f(S.gtfs.feedStart)} to ${f(S.gtfs.feedEnd)}` : ''; }
function sourcesHtml(pos, del) {
  return `<b>Where this comes from.</b> ${esc(pos)}. ${esc(del)}${S.atLive.state === 'on' ? '' : ' (at-live is not switched on)'}. Routes, stops and route lines: Auckland Transport GTFS, timetable ${esc(gtfsSpan())}. Contains Auckland Transport data, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. <br><b>Static waterfront photography.</b> Auckland 0.075 m Urban Aerial Photos (2024–2025), Survey capture range: February 2024 to March 2025; exact flight days not supplied in these tiles’ metadata. Accessed 25 Nov 2026 from <a href="https://registry.opendata.aws/nz-imagery/">New Zealand Imagery</a>, licensed by Auckland Council for re-use under CC BY 4.0. A cropped, downsampled visual layer, not live imagery or measured façades.<br><b>Ferry Building detail.</b> Model aligned to the OSM footprint. Roof heights cross-checked with <a href="https://data.linz.govt.nz/">LINZ Data Service</a> Auckland Part 1 2024 LiDAR licensed by Auckland Council, CC BY 4.0. The façade is inferred, not surveyed. Masonry and terracotta textures adapted from <a href="https://commons.wikimedia.org/wiki/File:Auckland_Ferry_Terminal_from_Harbour.jpg">Alexander Klink’s 2006 photo</a>, <a href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a>.<br><b>Terrain and model.</b> Ground heights: LINZ 8 m DEM via AWS Terrain Tiles, CC BY 4.0 (underlying data © RSHL). Land, water, roads and buildings: © OpenStreetMap contributors, ODbL 1.0, via OpenFreeMap. Building heights are OSM heights or levels where mapped, otherwise a 5 m default. Weather: Open-Meteo, modelled. Vehicles are drawn in code at typical sizes; they are not the actual vehicle.`;
}
function fmtDate(iso) { const t = Date.parse(iso); return Number.isFinite(t) ? new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', day: 'numeric', month: 'short', year: 'numeric' }).format(t) : ''; }

// ------------------------------------------------------------------------------------------------ interactions
function setPanelSmall(small) {
  $('#panel').classList.toggle('small', small);
  $('#grip').setAttribute('aria-expanded', String(!small));
  $('#grip').textContent = small ? 'Show results' : 'Minimise';
}
function wireUi() {
  const q = $('#q'), list = $('#results'), empty = $('#search-empty'); let items = [], hi = -1;
  const hideResults = () => { list.hidden = empty.hidden = true; q.setAttribute('aria-expanded','false'); q.removeAttribute('aria-activedescendant'); };
  $('#near-me').onclick = () => {
    hideResults();
    const sel = {kind:'nearby',message:'Finding stops near you…'}; void select(sel);
    const request = locationRun;
    const show = message => { if (locationRun === request && S.sel===sel) { sel.message=message; render(); } };
    if (!navigator.geolocation) { show('Location is unavailable. Search by stop name or stop number above.'); return; }
    navigator.geolocation.getCurrentPosition(({coords})=>{
      if (request!==locationRun || S.sel!==sel) return;
      sel.rows=nearbyStops(S.index,coords.latitude,coords.longitude,{mode:S.mode});
      show(sel.rows.length ? '' : 'No stops for this filter within 1.4 km. Try All or search by stop name.');
    },()=>show('Location wasn’t available. Search by stop name or stop number above.'),{enableHighAccuracy:false,timeout:8000,maximumAge:120000});
  };
  $('#saved-stops').onclick = () => { hideResults(); void select({kind:'saved'}); };
  const show = () => {
    items = X.search(S.index, searchWords(q.value), 10); hi = -1; q.removeAttribute('aria-activedescendant');
    list.innerHTML = items.map((it, i) => it.kind === 'route'
      ? `<li role="option" id="at-search-${i}" data-i="${i}"><span class="k">${MODE_WORD[it.route.mode]}</span><span><span class="t">${esc(it.route.short)}</span><span class="s">${esc(cleanHead(it.route.heads[0] || ''))}</span></span></li>`
      : `<li role="option" id="at-search-${i}" data-i="${i}"><span class="k">${it.kind === 'ferry' ? 'Ferry' : it.kind === 'station' ? 'Station' : 'Stop'}</span><span><span class="t">${esc(it.stop.name)}</span><span class="s">${it.stop.code ? 'Stop ' + esc(it.stop.code) + ' · ' : ''}${it.stop.routes.length} routes</span></span></li>`).join('');
    empty.hidden = !q.value.trim() || !!items.length;
    if (!empty.hidden) empty.innerHTML = 'No match in this timetable. Try a stop number or the official <a href="https://at.govt.nz/bus-train-ferry/timetables/school-bus-timetables" target="_blank" rel="noopener noreferrer">AT school bus timetables</a>.';
    list.hidden = !items.length; q.setAttribute('aria-expanded', String(!!items.length));
  };
  if (q.value) show();
  const choose = (it) => { if (!it) return; hideResults(); setPanelSmall(false); q.blur(); q.value = it.kind === 'route' ? it.route.short : it.stop.name; select(it.kind === 'route' ? { kind: 'route', id: it.id } : { kind: 'stop', id: it.id }); };
  q.addEventListener('input', show); q.addEventListener('focus', () => q.value && show());
  q.addEventListener('keydown', (e) => {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && items.length) { e.preventDefault(); hi = Math.max(0, Math.min(items.length - 1, hi + (e.key === 'ArrowDown' ? 1 : -1))); [...list.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === hi))); q.setAttribute('aria-activedescendant','at-search-'+hi); list.children[hi]?.scrollIntoView({block:'nearest'}); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(items[Math.max(0, hi)]); } else if (e.key === 'Escape') hideResults();
  });
  list.addEventListener('pointerdown', (e) => { const li = e.target.closest('li'); if (li) { e.preventDefault(); choose(items[+li.dataset.i]); } });
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.search')) hideResults(); });
  document.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => { S.mode = b.dataset.mode; document.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); pushVehicles(); if (listOnly) render(); });
  const flyIn = $('#fly-in');
  function flightSubject() {
    if (S.sel?.kind === 'stop') {
      const stop = S.index.stops.get(S.sel.id);
      if (stop && X.inArea(stop.lat, stop.lon)) return {kind:'stop', lat:stop.lat, lon:stop.lon};
    }
    if (S.sel?.kind === 'vehicle' && S.posSource === 'live' && !S.posError) {
      const v = S.positions?.vehicles.find((x) => x.id === S.sel.id);
      if (v && S.index.routes.get(v.routeId)?.mode === 'ferry' && X.inArea(v.lat, v.lon) && X.timestampFresh(v.ts, Math.round(Date.now()/1000))) {
        return {kind:'ferry', lat:v.lat, lon:v.lon};
      }
    }
    return null;
  }
  flyIn.onclick = () => {
    const w = S.world; if (!w) return;
    if (w.flying) { w.stopFlight(); return; }
    let dest = w.views.waterfront;
    const subject = flightSubject();
    if (subject) {
      const {x,z} = X.toWorld(subject.lat,subject.lon), y = subject.kind === 'ferry' ? 0 : w.heightAt(x,z);
      dest = {t:[x,y+5,z],p:[x+125,y+140,z-320]};
    }
    w.flyCinematic(dest, { fromHarbour: !!subject });
  };
  document.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => {
    const w = S.world, view = w?.views[b.dataset.view]; if (!view) return; w.unfollow(); w.setView(view);
  });
  canvas.addEventListener('keydown', () => S.world?.stopFlight());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') S.world?.stopFlight(); });
  $('#grip').onclick = () => setPanelSmall(!$('#panel').classList.contains('small'));
  $('#detail').addEventListener('click', (e) => {
    const t = e.target.closest('[data-vehicle],[data-route],[data-clear],[data-try],[data-stop],[data-save-stop],[data-track]'); if (!t) return;
    if (t.dataset.try) { q.value = t.dataset.try; q.focus(); show(); return; }
    if (t.dataset.track) {
      const v=S.positions?.vehicles.find(x=>x.id===t.dataset.track);
      if (freshMappedVehicle(v)) void select({kind:'vehicle',id:v.id},{closeUp:true});
      else render();
      return;
    }
    if (t.dataset.saveStop) {
      const id=t.dataset.saveStop; savedStops = savedStops.includes(id) ? savedStops.filter(x=>x!==id) : [id,...savedStops].slice(0,12);
      try { localStorage.setItem('assembl-auckland-stops-v1', JSON.stringify(savedStops)); } catch {}
      render(); return;
    }
    if (t.dataset.stop) { const stop=S.index.stops.get(t.dataset.stop); if (stop) { q.value=stop.name; void select({kind:'stop',id:stop.id}); } return; }
    if ('clear' in t.dataset) { q.value = ''; select(null); return; }
    if (t.dataset.vehicle) select({ kind: 'vehicle', id: t.dataset.vehicle }); else if (t.dataset.route) select({ kind: 'route', id: t.dataset.route });
  });
  // taps on the city pick the nearest vehicle marker
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { if (e.isPrimary) down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || !e.isPrimary || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || !S.world) return;
    const r = canvas.getBoundingClientRect(), id = S.world.pick(e.clientX - r.left, e.clientY - r.top, phone ? 34 : 24);
    if (id) { setPanelSmall(false); select({ kind: 'vehicle', id }, { fly: false }); }
  });
  canvas.addEventListener('pointerdown', () => S.world?.unfollow(), { capture: false });
  // label over the chosen vehicle
  const label = $('#label');
  if (S.world) S.world.onFrame = () => {
    const subject = flightSubject();
    const cameraLabel = S.world.flying ? 'Stop flight' : subject?.kind === 'ferry' ? 'Fly to ferry' : subject ? 'Fly to stop' : 'Fly in';
    if (flyIn.textContent !== cameraLabel) {
      flyIn.textContent = cameraLabel;
      flyIn.title = subject?.kind === 'ferry' ? 'Fly from Waitematā Harbour to the ferry’s latest reported position' : subject ? 'Fly from Waitematā Harbour to the selected stop or ferry terminal' : 'Fly closer to the Auckland waterfront';
    }
    if (S.sel?.kind !== 'vehicle') { label.hidden = true; return; }
    const p = S.world.screenOf(S.sel.id, S.closeUpBus ? 6 : 20), v = S.positions?.vehicles.find((x) => x.id === S.sel.id);
    if (S.closeUpBus && (!v || S.posSource !== 'live' || S.posError || !X.timestampFresh(v.ts, Math.round(Date.now()/1000)))) S.world.unfollow();
    if (!p || !v) { label.hidden = true; return; }
    const { r, st } = vehicleInfo(v); label.hidden = false; label.style.left = p[0] + 'px'; label.style.top = p[1] + 'px';
    const caption = `${esc(r?.short || v.routeId)}<small>${esc(st.status === 'unknown' ? (v.speedKmh != null ? v.speedKmh + ' km/h' : '') : st.label)}</small>`;
    if (label.innerHTML !== caption) label.innerHTML = caption;
  };
}
