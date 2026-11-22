// A stand-in for Supabase Storage's resumable upload address (the tus protocol, 1.0.0), for tests. In memory, in this
// process, no network and no port: it is a fetch() function. It checks what the real one checks that matters to the
// page (the tus version, the sign-in, the offset, the part size, x-upsert, the bucket's size limit) and can be told to
// drop the connection part-way through a part, to answer a request with a status, or to be slow.
const encode = (s) => new TextEncoder().encode(s);
const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));

export function fakeTus({ endpoint = 'https://abcdefghijklmnop.storage.supabase.co/storage/v1/upload/resumable', token = 'token-1', chunk = 6 * 1024 * 1024, limit = Infinity } = {}) {
  const uploads = new Map(); // id -> { length, offset, parts: Uint8Array[], meta, upsert }
  const objects = new Map(); // "bucket/name" -> Uint8Array, once complete
  const log = [];            // { method, url, headers, bytes }
  let n = 0;
  const reply = (status, headers = {}) => new Response(null, { status, headers });
  const fake = {
    endpoint, uploads, objects, log, token,
    /** (op) => a fraction 0..1: the connection drops after that much of this PATCH arrived */
    cut: null,
    /** (op) => a status to answer this request with instead */
    fail: null,
    /** ms each PATCH takes (it can be cut short by the caller's abort) */
    delay: 0,
    patches: () => log.filter((o) => o.method === 'PATCH'),
    sentBytes: () => log.filter((o) => o.method === 'PATCH').reduce((a, o) => a + o.arrived, 0),
    async fetch(url, { method = 'GET', headers = {}, body, signal } = {}) {
      const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)]));
      const op = { method, url: String(url), headers: h, bytes: 0, arrived: 0, n: log.length };
      log.push(op);
      if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
      const forced = fake.fail?.(op);
      if (forced) return reply(forced);
      if (h['tus-resumable'] !== '1.0.0') return reply(412);
      if (h.authorization !== `Bearer ${fake.token}`) return reply(401);
      const id = String(url).startsWith(`${endpoint}/`) ? String(url).slice(endpoint.length + 1) : null;
      if (method === 'POST' && String(url) === endpoint) {
        const length = Number(h['upload-length']);
        const meta = Object.fromEntries((h['upload-metadata'] ?? '').split(',').filter(Boolean).map((p) => { const [k, v] = p.split(' '); return [k, v ? unb64(v) : '']; }));
        if (!meta.bucketName || !meta.objectName) return reply(400);
        if (length > limit) return reply(413);
        if (objects.has(`${meta.bucketName}/${meta.objectName}`) && h['x-upsert'] !== 'true') return reply(409);
        const uid = `u${++n}`;
        uploads.set(uid, { length, offset: 0, parts: [], meta, upsert: h['x-upsert'] });
        return reply(201, { Location: `${endpoint}/${uid}`, 'Tus-Resumable': '1.0.0' });
      }
      const up = id && uploads.get(id);
      if (!up) return reply(404);
      if (method === 'HEAD') return reply(200, { 'Upload-Offset': String(up.offset), 'Upload-Length': String(up.length), 'Cache-Control': 'no-store' });
      if (method === 'DELETE') { uploads.delete(id); return reply(204); }
      if (method !== 'PATCH') return reply(405);
      if (h['content-type'] !== 'application/offset+octet-stream') return reply(415);
      if (Number(h['upload-offset']) !== up.offset) return reply(409);
      const data = new Uint8Array(await body.arrayBuffer());
      op.bytes = data.length;
      if (data.length > chunk) return reply(413);
      if (fake.delay) {
        await new Promise((res, rej) => {
          const t = setTimeout(res, fake.delay);
          signal?.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('The operation was aborted.', 'AbortError')); }, { once: true });
        });
      }
      const f = fake.cut?.(op);
      const take = f == null ? data.length : Math.floor(data.length * f);
      up.parts.push(data.subarray(0, take)); up.offset += take; op.arrived = take;
      if (up.offset === up.length) {
        const all = new Uint8Array(up.length); let at = 0;
        for (const p of up.parts) { all.set(p, at); at += p.length; }
        objects.set(`${up.meta.bucketName}/${up.meta.objectName}`, all);
      }
      if (f != null) throw new TypeError('fetch failed'); // the connection dropped: the caller never hears back
      return reply(204, { 'Upload-Offset': String(up.offset), 'Tus-Resumable': '1.0.0' });
    },
  };
  return fake;
}

/** a test file of n bytes with a pattern that shows any byte out of place */
export function patterned(n, name = 'house.rvt', lastModified = 1795000000000) {
  const b = new Uint8Array(n);
  for (let i = 0; i < n; i++) b[i] = (i * 31 + (i >>> 11)) & 255;
  return new File([b], name, { lastModified, type: 'application/octet-stream' });
}
export const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
export { encode };
