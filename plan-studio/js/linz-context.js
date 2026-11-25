// Consume the existing Cloudflare Pages feeds. No credentials are accepted from the browser.
export const CREDIT = 'LINZ Data Service · CC BY 4.0. Parcel map, not a survey. Building heights are illustrative.';
export function parseSitePoint(value) {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*$/.exec(value);
  if (!m) throw new Error('Enter WGS84 coordinates as latitude, longitude (e.g. -36.84355, 174.75741).');
  const [, a, b] = m;
  const lat = +a, lon = +b;
  if (lat < -47.5 || lat > -34 || lon < 166 || lon > 179) throw new Error('This preview covers the main New Zealand LINZ service area.');
  return {lat, lon};
}
function polygon(g) { return g && (g.type === 'Polygon' || g.type === 'MultiPolygon') && Array.isArray(g.coordinates); }
export async function loadLinzContext({lat, lon}, {radius = 75, fetcher = fetch} = {}) {
  const within = parseSitePoint(lat + ',' + lon);
  const r = Math.min(500, Math.max(20, Math.round(Number(radius)) || 75));
  const query = async (name) => {
    const args = new URLSearchParams({feeds:name, lat:String(within.lat), lon:String(within.lon), radius:String(r)});
    const response = await fetcher('/api/live/?' + args, {signal:AbortSignal.timeout(18000), headers:{Accept:'application/json'}});
    if (!response.ok) throw new Error('LINZ feed HTTP ' + response.status);
    const value = (await response.json())?.feeds?.[name];
    if (!value || value.error || ['unavailable','not-wired'].includes(value.status)) throw new Error('LINZ feed unavailable');
    return value;
  };
  const [site, footprint] = await Promise.allSettled([query('site'), query('footprint')]);
  const parcel = site.value?.facts?.parcel;
  const outline = parcel?.values?.outline;
  const p = polygon(outline) ? [{type:'Feature',geometry:outline,properties:{}}] : [];
  const parcelOK = site.status === 'fulfilled' && parcel?.status === 'live' && (p.length || parcel.values?.parcel === null);
  const raw = footprint.value?.values?.geojson?.features;
  const buildingsOK = footprint.status === 'fulfilled' && Array.isArray(raw);
  const b = buildingsOK ? raw.filter(f=>polygon(f.geometry)) : [];
  return {
    parcels:{type:'FeatureCollection',features:p},
    buildings:{type:'FeatureCollection',features:b},
    parcelStatus:parcelOK ? (p.length ? '1 mapped parcel' : 'No parcel at this point') : 'Parcel unavailable',
    buildingStatus:buildingsOK ? b.length + ' mapped roof outlines' + (footprint.value.values.truncated ? ' (limit reached)' : '') : 'Buildings unavailable',
    capturedThrough:buildingsOK ? footprint.value.values.latestCapture ?? null : null,
    parcelLayerDate:parcelOK ? parcel.asOf ?? null : null,
  };
}
