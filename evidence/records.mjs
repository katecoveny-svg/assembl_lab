export const CLASSIFICATIONS = ['live','published benchmark','estimate','simulated'];
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
export function validateRecord(r) {
 if (!r || r.schemaVersion !== 1 || !r.id || !CLASSIFICATIONS.includes(r.classification) ||
 !r.source?.url?.startsWith('https://') || !r.source.license?.url?.startsWith('https://') || !r.source.license.name || !r.source.attribution ||
 !date(r.retrievedAt) || !(r.observedAt === null || date(r.observedAt)) || !r.observationBasis || !r.scope || !r.units ||
 !Number.isFinite(r.maxAgeMs) || r.maxAgeMs <= 0 || r.value === undefined) throw Error('Invalid evidence record');
 return r;
}
export function freshness(r, now = Date.now()) {
 if (!r) return 'missing';
 try { validateRecord(r); } catch { return 'invalid'; }
 const age = now - Date.parse(r.retrievedAt);
 if (!Number.isFinite(now) || age < 0) return 'invalid';
 return age > r.maxAgeMs ? 'stale' : 'recently retrieved';
}
export function describe(r, now = Date.now()) {
 return `${r.classification === 'live' ? 'live source / saved snapshot' : r.classification === 'published benchmark' ? 'published reference / directory sample' : r.classification} · ${freshness(r, now)} · ${r.observedAt ? `reported ${r.observedAt}` : 'reporting date not supplied'} · retrieved ${r.retrievedAt}`;
}

// Boundary DTO for public-data consumers; calculated freshness must never be cached as truth.
export function toSourceContext(record, now=Date.now()) {
 const r=validateRecord(record);
 return {id:r.id,sourceUrl:r.source.url,licence:{...r.source.license},observedAt:r.observedAt,retrievedAt:r.retrievedAt,freshness:freshness(r,now),kind:r.classification,scope:r.scope,units:r.units,observationBasis:r.observationBasis,attribution:r.source.attribution,value:r.value};
}
