// Big files to a practice's shared records, sent in 6 MB parts that can pause, pick up again after a dropped connection,
// and carry on after the page is closed and the same file is dropped again. This is the tus protocol (tus.io, 1.0.0),
// which Supabase Storage speaks at https://<project>.storage.supabase.co/storage/v1/upload/resumable. A small client of
// its own, so nothing else is loaded: tested against a stand-in tus server in tests/architecture/upload.test.mjs.
//
//   createUpload({ file, endpoint, metadata, headers, key, saved, fetch, chunkSize, retryDelays, sleep, isOnline, whenOnline,
//                  onProgress(sent, total), onState(state) })
//     -> { start(), pause(), resume(), stop(), state, sent, total, url, resumedFrom }
//        start() resolves { url } when the last byte is in, and rejects an UploadError (code: refused | too_big | exists |
//        expired | failed | stopped) when it cannot go on. Pausing, waiting for the connection and stalling do not reject.
//   states: starting · sending · paused · waiting (offline: it carries on when the connection is back) ·
//           retrying · stalled (it kept failing: resume() tries again) · done · failed · stopped
//   savedUploads(storage)   where unfinished uploads are remembered between visits (localStorage), by key
//   uploadKey(file, projectId)   the same file for the same project gives the same key
//   tusEndpoint(supabaseUrl)
//
// The access token is asked for before every request (headers() is called each time), so a sign-in renewed during a long
// upload is used. Nothing is written to the console. No file contents are ever kept anywhere but the upload itself.

export const TUS_VERSION = '1.0.0';
/** Supabase asks for parts of exactly 6 MB (the last one can be smaller) */
export const CHUNK = 6 * 1024 * 1024;
export const RETRY_DELAYS = [0, 1000, 3000, 5000, 10000, 20000];

export class UploadError extends Error {
  constructor(message, code = 'failed', status = 0) { super(message); this.name = 'UploadError'; this.code = code; this.status = status; }
}

/** Supabase's direct storage address for resumable uploads, from the project's address */
export function tusEndpoint(supabaseUrl) {
  const host = new URL(supabaseUrl).hostname, ref = host.split('.')[0];
  if (!/^[a-z0-9]{6,40}$/.test(ref)) throw new Error('That is not a Supabase project address.');
  return `https://${ref}.storage.supabase.co/storage/v1/upload/resumable`;
}

const b64 = (s) => { const u = new TextEncoder().encode(String(s)); let bin = ''; for (const x of u) bin += String.fromCharCode(x); return btoa(bin); };
/** "key base64(value),key base64(value)" as tus wants it */
export const encodeMetadata = (m) => Object.entries(m).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k} ${b64(v)}`).join(',');
export const uploadKey = (file, projectId) => `${projectId}:${file.name}:${file.size}:${file.lastModified ?? 0}`;

/** a small store for unfinished uploads, kept in this browser's localStorage under one entry. Never holds file contents. */
export function savedUploads(storage = globalThis.localStorage, name = 'assembl.architecture.uploads.v1') {
  const read = () => { try { const v = JSON.parse(storage?.getItem(name) ?? '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };
  const write = (all) => { try { storage?.setItem(name, JSON.stringify(all)); } catch { /* not remembered: it can still finish in this visit */ } };
  return {
    get: (key) => read()[key] ?? null,
    set: (key, value) => { const all = read(); all[key] = { ...all[key], ...value, at: new Date().toISOString() }; write(all); },
    remove: (key) => { const all = read(); delete all[key]; write(all); },
    list: (where = {}) => Object.entries(read()).map(([key, v]) => ({ key, ...v })).filter((v) => Object.entries(where).every(([k, x]) => v[k] === x)),
  };
}

const isAbort = (e) => e?.name === 'AbortError';
const networkish = (e) => !isAbort(e) && !(e instanceof UploadError);

export function createUpload({
  file, endpoint, metadata = {}, headers = async () => ({}), key = '', saved = null, fetch = globalThis.fetch?.bind(globalThis),
  chunkSize = CHUNK, retryDelays = RETRY_DELAYS, sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  isOnline = () => globalThis.navigator?.onLine !== false,
  whenOnline = () => new Promise((r) => { const on = () => { globalThis.removeEventListener?.('online', on); r(); }; globalThis.addEventListener?.('online', on); setTimeout(on, 15000); }),
  onProgress = () => {}, onState = () => {}, info = {},
} = {}) {
  if (!file || typeof file.slice !== 'function') throw new Error('Nothing to send.');
  const total = file.size;
  let url = '', sent = 0, state = '', resumedFrom = 0, ctrl = null, wake = null, stopped = false, pauseAsked = false;
  const set = (s) => { if (state !== s) { state = s; onState(s); } };
  const remember = () => saved?.set(key, { url, sent, total, ...info });

  async function request(method, to, extra = {}, body) {
    ctrl = new AbortController();
    const h = { 'Tus-Resumable': TUS_VERSION, ...(await headers()), ...extra };
    try { return await fetch(to, { method, headers: h, body, signal: ctrl.signal }); } finally { ctrl = null; }
  }
  const offsetOf = (res) => { const v = Number(res.headers.get('upload-offset')); return Number.isFinite(v) && v >= 0 ? v : null; };

  /** what the server holds of an upload, or null when it no longer knows it */
  async function head(u) {
    const res = await request('HEAD', u);
    if (res.status === 404 || res.status === 410 || res.status === 403) return null;
    if (!res.ok) {
      if (retryable(res.status)) throw Object.assign(new Error(`status ${res.status}`), { status: res.status });
      throw refusal(res.status, 'head') ?? new UploadError(`The shared records gave an error (${res.status}) when asked how much had arrived.`, 'failed', res.status);
    }
    return offsetOf(res);
  }
  async function create() {
    const res = await request('POST', endpoint, { 'Upload-Length': String(total), 'Upload-Metadata': encodeMetadata(metadata) });
    if (res.status === 201) {
      const loc = res.headers.get('location');
      if (!loc) throw new UploadError('The shared records did not say where to send the file.', 'failed', 201);
      return new URL(loc, endpoint).href;
    }
    throw refusal(res.status, 'create');
  }
  function refusal(status, at) {
    if (status === 401) return new UploadError('Your sign-in has expired. Sign in again, then drop the file again to carry on.', 'refused', status);
    if (status === 403) return new UploadError('The shared records refused that file: your role in the practice does not allow it.', 'refused', status);
    if (status === 409 && at === 'create') return new UploadError('A file is already kept under that name in the shared records.', 'exists', status);
    if (status === 413) return new UploadError('That file is bigger than the shared records accept right now. The owner can raise the limit (see the practice database note).', 'too_big', status);
    if (status === 404 || status === 410) return new UploadError('The shared records no longer know this upload.', 'expired', status);
    return null;
  }
  const retryable = (status) => status === 0 || status === 408 || status === 409 || status === 423 || status === 429 || status >= 500;

  /** wait until resume() is called (a pause, or a stall) */
  const parked = (s) => { set(s); return new Promise((r) => { wake = r; }); };

  async function run() {
    // an upload this browser started before, for the same file: carry on from what the server already has
    set('starting');
    const before = saved?.get(key);
    let sync = false, first = true, attempt = 0, restarted = false, reauthed = false;
    if (before?.url && Number(before.total) === total) { url = before.url; sync = true; }
    for (;;) {
      if (stopped) throw new UploadError('Stopped. Nothing was kept.', 'stopped');
      if (pauseAsked) { await parked('paused'); pauseAsked = false; attempt = 0; if (url) sync = true; continue; }
      try {
        if (url && sync) { // how much has really arrived (a part cut off part-way may have left some of itself)
          const off = await head(url);
          sync = false;
          if (off == null || off > total) { url = ''; sent = 0; saved?.remove(key); }
          else { sent = off; if (first) resumedFrom = off; onProgress(sent, total); }
        }
        first = false;
        if (!url) { set('starting'); url = await create(); sent = 0; remember(); }
        if (sent >= total) break;
        set('sending');
        const end = Math.min(sent + chunkSize, total);
        const res = await request('PATCH', url, { 'Upload-Offset': String(sent), 'Content-Type': 'application/offset+octet-stream' }, file.slice(sent, end));
        if (res.status === 204 || res.ok) {
          const off = offsetOf(res);
          if (off == null || off < sent || off > total) throw new UploadError('The shared records answered in a way this page does not understand.', 'failed', res.status);
          sent = off; attempt = 0; remember(); onProgress(sent, total);
          continue;
        }
        if (res.status === 401 && !reauthed) { reauthed = true; throw Object.assign(new Error('status 401'), { status: 0 }); } // the sign-in may have just been renewed: once more
        if ((res.status === 404 || res.status === 410) && !restarted) { restarted = true; saved?.remove(key); url = ''; sent = 0; continue; } // it expired: start it again, once
        const no = refusal(res.status, 'patch');
        if (no && !retryable(res.status)) throw no;
        throw Object.assign(new Error(`status ${res.status}`), { status: res.status });
      } catch (e) {
        if (stopped) throw new UploadError('Stopped. Nothing was kept.', 'stopped');
        if (isAbort(e) && pauseAsked) continue; // pause() cut off the part in flight: it is sent again on resume
        if (e instanceof UploadError) { set('failed'); throw e; }
        if (e.status && !retryable(e.status)) { set('failed'); throw new UploadError(`The shared records gave an error (${e.status}).`, 'failed', e.status); }
        // the connection dropped, or the server asked to try again: wait, then ask how much arrived before going on
        if (!isOnline()) { set('waiting'); await Promise.race([whenOnline(), new Promise((r) => { wake = r; })]); wake = null; attempt = 0; }
        else if (attempt >= retryDelays.length) { await parked('stalled'); attempt = 0; }
        else { set('retrying'); await sleep(retryDelays[attempt++]); }
        if (url) sync = true;
      }
    }
    saved?.remove(key);
    set('done');
    onProgress(total, total);
    return { url };
  }

  let running = null;
  return {
    start() { running ??= run().catch((e) => { if (state !== 'stopped') set(e.code === 'stopped' ? 'stopped' : 'failed'); throw e; }); return running; },
    pause() { if (['done', 'failed', 'stopped', 'paused'].includes(state)) return; pauseAsked = true; ctrl?.abort(); },
    resume() { pauseAsked = false; const w = wake; wake = null; w?.(); },
    /** stop for good: the part in flight is dropped, the server is asked to forget the upload, and it is not remembered */
    async stop() {
      if (state === 'done') return;
      stopped = true; ctrl?.abort(); const w = wake; wake = null; w?.();
      set('stopped');
      saved?.remove(key);
      if (url) { try { await request('DELETE', url); } catch { /* the server forgets it by itself after a day */ } }
    },
    get state() { return state; }, get sent() { return sent; }, get total() { return total; }, get url() { return url; }, get resumedFrom() { return resumedFrom; },
  };
}
