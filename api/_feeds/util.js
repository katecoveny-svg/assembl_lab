// assembl lab · shared helpers for live feed fetchers.
// Every upstream call has an 8 s timeout and identifies itself honestly. Nothing here needs an API key.
export const UA = "assembl-lab/1.0 (+https://assembl-lab.vercel.app)";
export const TIMEOUT_MS = 8000;

// timeout covers the whole transfer: the body is read before the timer is cleared
export async function getText(url, opts = {}) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), opts.ms || TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: c.signal, redirect: "follow", headers: { "user-agent": UA, ...(opts.headers || {}) } });
    if (!r.ok && r.status !== 206) throw new Error(`HTTP ${r.status} from ${new URL(url).host}`);
    return await r.text();
  } finally { clearTimeout(t); }
}
export async function getJSON(url, opts = {}) { return JSON.parse(await getText(url, opts)); }
export async function getBuffer(url, opts = {}) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), opts.ms || TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: c.signal, redirect: "follow", headers: { "user-agent": UA, ...(opts.headers || {}) } });
    if (!r.ok && r.status !== 206) throw new Error(`HTTP ${r.status} from ${new URL(url).host}`);
    return Buffer.from(await r.arrayBuffer());
  } finally { clearTimeout(t); }
}
// Stream a text body line by line; onLine returns false to stop early (the connection is then aborted).
export async function streamLines(url, onLine, opts = {}) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), opts.ms || TIMEOUT_MS);
  let stopped = false;
  try {
    const r = await fetch(url, { signal: c.signal, redirect: "follow", headers: { "user-agent": UA, ...(opts.headers || {}) } });
    if (!r.ok && r.status !== 206) throw new Error(`HTTP ${r.status} from ${new URL(url).host}`);
    const dec = new TextDecoder(); let buf = ""; let bytes = 0;
    for await (const chunk of r.body) {
      bytes += chunk.length; buf += dec.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        if (onLine(line) === false) { stopped = true; break; }
      }
      if (stopped) break;
    }
    if (!stopped && buf) onLine(buf);
    return { bytes, stopped };
  } finally { clearTimeout(t); if (stopped) c.abort(); }
}

// Small in-memory cache per warm function instance, on top of the edge cache. The ladder for each key is
// fresh memo → live fetch → stale memo (the last good answer, marked stale) → the caller's own snapshot, if it has one.
const MEMO = new Map(), LAST = new Map();
export const clearMemo = () => { MEMO.clear(); LAST.clear(); };
export function memo(key, ttlMs, fn) {
  const hit = MEMO.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.p;
  const p = fn().then((v) => { LAST.set(key, v); return v; }).catch((e) => {
    MEMO.delete(key);
    const last = LAST.get(key);
    if (last === undefined) throw e;
    return last && typeof last === "object" && !Array.isArray(last) ? { ...last, stale: true, staleError: String(e?.message || e).slice(0, 160) } : last;
  });
  MEMO.set(key, { at: Date.now(), p });
  return p;
}

// Which rung of the ladder an envelope came from: "live" (fetched in this answer), "cached" (a warm instance's earlier
// answer, or the last good one after an upstream failure) or "snapshot" (built in, nothing fetched). The edge cache in
// front of the function is invisible here; /feeds.js compares fetchedAt with the clock as well.
export function withStatus(e, now = Date.now()) {
  if (!e || e.error) return e;
  const snapshot = e.values && e.values.snapshot === true;
  const age = now - Date.parse(e.fetchedAt);
  const status = snapshot ? "snapshot" : e.stale || age > 90e3 ? "cached" : "live";
  const t = (iso) => { try { return new Date(iso).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" }); } catch (err) { return iso; } };
  const statusLabel = status === "live" ? "fetched now" : status === "cached" ? `cached · fetched ${t(e.fetchedAt)}${e.stale ? " · upstream not answering" : ""}` : `snapshot · copied ${(e.values && e.values.retrieved) || e.asOf}`;
  return { ...e, status, statusLabel };
}

export const CADENCE_TTL = { // seconds the edge may serve a cached copy, then revalidate in the background
  "5-min": { sMaxAge: 300, swr: 900 },
  hourly: { sMaxAge: 900, swr: 3600 },
  daily: { sMaxAge: 3600, swr: 86400 },
  weekly: { sMaxAge: 21600, swr: 604800 },
  fortnightly: { sMaxAge: 21600, swr: 604800 },
  monthly: { sMaxAge: 43200, swr: 2592000 },
  quarterly: { sMaxAge: 86400, swr: 2592000 },
  annual: { sMaxAge: 86400, swr: 2592000 }, // snapshots: the edge still revalidates daily so an updated JSON reaches readers within a day
};

// The uniform envelope every feed returns.
export function envelope({ id, label, value = null, values = null, unit = "", asOf, period, cadence, source, live = false, note }) {
  const truth = live ? "Live" : "Latest published";
  return {
    id, label, value, values, unit, asOf, period: period || asOf, fetchedAt: new Date().toISOString(), cadence,
    source, truth, truthLabel: live ? "Live" : `Latest published · ${period || asOf}`, status: "live", ...(note ? { note } : {}),
  };
}

export const round = (x, d = 1) => (x == null || !isFinite(x) ? null : +(+x).toFixed(d));
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MON = MONTHS.map((m) => m.slice(0, 3));

// NZ local date parts without a timezone library (Intl is available in Node 18+).
export function nzToday(now = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", hour12: false }).formatToParts(now);
  const g = (t) => p.find((x) => x.type === t)?.value;
  return { ymd: `${g("year")}-${g("month")}-${g("day")}`, year: +g("year"), month: +g("month"), day: +g("day"), weekday: g("weekday"), hour: +g("hour") % 24 };
}

// Minimal CSV line splitter (handles quoted fields with commas).
export function splitCSV(line) {
  const out = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.replace(/\r$/, ""));
}
