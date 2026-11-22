// Open in 3D: the model goes from the ops page to the 3D page through this browser's own storage (handoff.js and the
// 3D page's handoff.ts), so it does not matter whether the browser opens a new tab or replaces the page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { putHandoff, takeHandoff, HANDOFF_DB, HANDOFF_STORE, HANDOFF_PARAM, HANDOFF_MAX_AGE } from '../../architecture/js/handoff.js';

/** just enough of IndexedDB: one database, object stores keyed by id, transactions that finish once their requests have */
function fakeIdb() {
  const dbs = new Map();
  const request = (run) => { const r = {}; queueMicrotask(() => { try { r.result = run(); r.onsuccess?.(); } catch (e) { r.error = e; r.onerror?.(); } }); return r; };
  return {
    dbs,
    open(name) {
      const r = {};
      queueMicrotask(() => {
        let stores = dbs.get(name);
        const fresh = !stores;
        if (fresh) { stores = new Map(); dbs.set(name, stores); }
        r.result = {
          objectStoreNames: { contains: (n) => stores.has(n) },
          createObjectStore: (n) => { stores.set(n, new Map()); },
          close() {},
          transaction(n) {
            const rows = stores.get(n), tx = {};
            let timer = null;
            const touch = () => { clearTimeout(timer); timer = setTimeout(() => tx.oncomplete?.(), 0); };
            const op = (run) => { touch(); return request(run); };
            tx.objectStore = () => ({
              getAll: () => op(() => [...rows.values()].map((x) => ({ ...x }))),
              get: (id) => op(() => (rows.has(id) ? { ...rows.get(id) } : undefined)),
              put: (v) => op(() => { rows.set(v.id, { ...v }); return v.id; }),
              delete: (id) => op(() => { rows.delete(id); }),
            });
            touch();
            return tx;
          },
        };
        if (fresh) r.onupgradeneeded?.();
        r.onsuccess?.();
      });
      return r;
    },
  };
}
const blob = (text, type = 'application/octet-stream') => new Blob([text], { type });

test('a model kept for the 3D page comes back once, named as kept, and is gone after', async () => {
  const idb = fakeIdb();
  const id = await putHandoff(blob('ISO-10303-21;'), 'garden-studio.ifc', { idb });
  assert.match(id, /^[\w-]{8,}$/);
  const got = await takeHandoff(id, { idb });
  assert.equal(got.name, 'garden-studio.ifc');
  assert.equal(await got.blob.text(), 'ISO-10303-21;');
  assert.equal(await takeHandoff(id, { idb }), null, 'taking it deletes it');
  assert.equal(idb.dbs.get(HANDOFF_DB).get(HANDOFF_STORE).size, 0, 'nothing is left in this browser');
});

test('anything left for more than an hour is cleared at the next hand-over, and never handed out', async () => {
  const idb = fakeIdb(), t0 = Date.UTC(2026, 10, 23, 0, 0, 0);
  const old = await putHandoff(blob('a'), 'a.ifc', { idb, now: t0 });
  const kept = await putHandoff(blob('b'), 'b.ifc', { idb, now: t0 + HANDOFF_MAX_AGE - 1000 });
  const rows = idb.dbs.get(HANDOFF_DB).get(HANDOFF_STORE);
  assert.ok(rows.has(old) && rows.has(kept), 'both are under an hour old');
  await putHandoff(blob('c'), 'c.ifc', { idb, now: t0 + HANDOFF_MAX_AGE + 1 });
  assert.ok(!rows.has(old), 'the hour-old one was cleared');
  assert.ok(rows.has(kept));
  assert.equal(await takeHandoff(kept, { idb, now: t0 + 3 * HANDOFF_MAX_AGE }), null, 'too old to hand out');
});

test('no storage, or no id, is said plainly rather than guessed at', async () => {
  await assert.rejects(putHandoff(blob('a'), 'a.ifc', { idb: null }), /no storage to pass the model across/);
  assert.equal(await takeHandoff('', { idb: fakeIdb() }), null);
});

test('the 3D page reads the same store, under the same names', () => {
  const ts = readFileSync(new URL('../../plan-studio/twins/src/twin/handoff.ts', import.meta.url), 'utf8');
  assert.ok(ts.includes(`HANDOFF_DB = '${HANDOFF_DB}'`));
  assert.ok(ts.includes(`HANDOFF_STORE = '${HANDOFF_STORE}'`));
  assert.ok(ts.includes(`HANDOFF_PARAM = '${HANDOFF_PARAM}'`));
  assert.ok(ts.includes('HANDOFF_MAX_AGE = 60 * 60 * 1000'));
  const plan = readFileSync(new URL('../../plan-studio/twins/src/twin/projectPlan.ts', import.meta.url), 'utf8');
  assert.match(plan, /qs\.get\(HANDOFF_PARAM\)/, 'the chooser looks for ?handoff=');
  assert.match(plan, /takeHandoff\(hid\)/);
});

test('the built 3D pages carry the hand-over reader', () => {
  for (const page of ['drop', '16a']) {
    const dir = new URL(`../../plan-studio/twins/${page}/assets/`, import.meta.url);
    const built = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n');
    assert.ok(built.includes(HANDOFF_DB), `${page}: the store name is in the bundle`);
    assert.ok(built.includes('Bringing your model across'), `${page}: it says what it is doing while the model comes across`);
  }
});

test('Open in 3D keeps the model first and opens the 3D page with its id, and never scripts the other window', () => {
  const src = readFileSync(new URL('../../architecture/js/models.js', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('function open3d('), src.indexOf('async function blobOf('));
  assert.ok(body.indexOf('putHandoff(') > 0 && body.indexOf('putHandoff(') < body.indexOf('window.open('), 'kept before the page opens');
  assert.match(body, /HANDOFF_PARAM\}=\$\{encodeURIComponent\(hid\)\}/);
  assert.ok(!/\.document|DataTransfer|dispatchEvent/.test(body), 'nothing reaches into the 3D page');
});

// ---- the site that goes across with the model (Site and sources) ----------------------------------------------------------
test('a site handed across with the model comes back with it, Blobs and all, once', async () => {
  const idb = fakeIdb();
  const site = {
    point: { lat: -36.8, lng: 175.1, source: 'a point typed on the Site tab' },
    camera_path: { pts: [[0, 0, 1.6], [4, 3, 1.6]], sketch_file_id: 'f_sketch', traced_by: 'person', confirmed_by: 'Aroha', confirmed_at: '2026-11-23T01:00:00.000Z' },
    sources: [{ kind: 'drawing_set', name: 'set.pdf', file_id: 'f_set' }],
    files: { drawing_set: blob('%PDF-1.4 tiny', 'application/pdf'), camera_sketch: blob('png', 'image/png') },
  };
  const id = await putHandoff(blob('ISO-10303-21;'), 'sample.ifc', { idb, site });
  const got = await takeHandoff(id, { idb });
  assert.equal(got.name, 'sample.ifc');
  assert.equal(await got.blob.text(), 'ISO-10303-21;');
  assert.deepEqual(got.site.point, site.point);
  assert.deepEqual(got.site.camera_path, site.camera_path);
  assert.deepEqual(got.site.sources, site.sources);
  assert.equal(await got.site.files.drawing_set.text(), '%PDF-1.4 tiny');
  assert.equal(got.site.files.camera_sketch.type, 'image/png');
  assert.equal(await takeHandoff(id, { idb }), null, 'taking it deletes it, site and all');
  assert.equal(idb.dbs.get(HANDOFF_DB).get(HANDOFF_STORE).size, 0);
});

test('without a site the record is as it was, and site comes back null', async () => {
  const idb = fakeIdb();
  const id = await putHandoff(blob('a'), 'a.ifc', { idb });
  assert.deepEqual([...idb.dbs.get(HANDOFF_DB).get(HANDOFF_STORE).get(id) && Object.keys(idb.dbs.get(HANDOFF_DB).get(HANDOFF_STORE).get(id))].sort(), ['at', 'blob', 'id', 'name', 'type']);
  assert.equal((await takeHandoff(id, { idb })).site, null);
});

test('the 3D page’s takeHandoff returns the site too', () => {
  const ts = readFileSync(new URL('../../plan-studio/twins/src/twin/handoff.ts', import.meta.url), 'utf8');
  assert.match(ts, /return \{ name: got\.name, type: got\.type, blob: got\.blob, site: got\.site \?\? null \}/);
  assert.match(ts, /site: HandoffSite \| null/);
});
