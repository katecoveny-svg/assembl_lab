// Local passenger tools. Device position never leaves this browser.
import { toNZTM } from './transit.js';

export function nearbyStops(index, lat, lon, { radius = 1400, limit = 8, mode = 'all' } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -38 || lat > -35 || lon < 173 || lon > 177) return [];
  const [e, n] = toNZTM(lat, lon), best = new Map();
  for (const stop of index.stops.values()) {
    if (!stop.routes.length || (mode !== 'all' && !stop.modes.includes(mode))) continue;
    if (Math.abs(stop.lat - lat) > .022 || Math.abs(stop.lon - lon) > .03) continue;
    const [x,y] = toNZTM(stop.lat,stop.lon), metres = Math.round(Math.hypot(e-x,n-y));
    const main = index.stops.get(stop.parent) || stop;
    if (metres <= radius && (!best.has(main.id) || metres < best.get(main.id).metres)) best.set(main.id,{ stop: main, metres });
  }
  return [...best.values()].sort((a,b)=>a.metres-b.metres || a.stop.name.localeCompare(b.stop.name)).slice(0,limit);
}

export function readSavedStops(storage) {
  try {
    const ids = JSON.parse(storage.getItem('assembl-auckland-stops-v1') || '[]');
    if (Array.isArray(ids)) return [...new Set(ids.filter(id => typeof id === 'string'))].slice(0,12);
  } catch {}
  return [];
}

export function searchWords(raw) {
  // Do not treat destination fragments as route numbers unless a mode label is provided.
  const q = raw.trim();
  const prefixed = /^(?:school\s+bus|bus|train|ferry|route|stop)\s+([\da-z][\w-]*)$/i.exec(q);
  return prefixed ? prefixed[1] : q;
}
