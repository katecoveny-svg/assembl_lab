// The resumable upload client (architecture/js/upload.js) against a stand-in tus server in this process (fake-tus.mjs):
// parts of 6 MB, a connection cut off part-way through a part, pause and resume, carrying on after the page is closed,
// waiting while offline, refusals in plain words, and stopping.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createUpload, savedUploads, tusEndpoint, encodeMetadata, uploadKey, CHUNK, UploadError } from '../../architecture/js/upload.js';
import { SUPABASE_URL } from '../../architecture/js/config.js';
import { fakeTus, patterned } from './fake-tus.mjs';
import { memoryBackend } from '../../architecture/js/store.js';

const MB = 1024 * 1024;
const PATH = '00000000-0000-4000-8000-00000000aaaa/00000000-0000-4000-8000-00000000bbbb/00000000-0000-4000-8000-00000000cccc';
const sameBytes = async (file, got) => Buffer.compare(Buffer.from(await file.arrayBuffer()), Buffer.from(got)) === 0;
const noWait = async () => {};

function setup({ size = 20 * MB, name = 'house.rvt', saved = savedUploads(memoryBackend()), tus = fakeTus(), ...o } = {}) {
  const file = patterned(size, name);
  const progress = [], states = [];
  let asked = 0;
  const up = createUpload({
    file, endpoint: tus.endpoint, fetch: tus.fetch, saved, key: uploadKey(file, 'p1'), sleep: noWait,
    metadata: { bucketName: 'arch-files', objectName: PATH, contentType: 'application/octet-stream', cacheControl: '3600' },
    headers: async () => { asked++; return { authorization: `Bearer ${tus.token}`, apikey: 'sb_publishable_x', 'x-upsert': 'false' }; },
    onProgress: (s, t) => progress.push([s, t]), onState: (s) => states.push(s), info: { name, project_id: 'p1' }, ...o,
  });
  return { up, file, tus, saved, progress, states, asked: () => asked };
}

test('a 20 MB file goes up in 6 MB parts and arrives byte for byte, with the address, bucket and path it was given', async () => {
  const { up, file, tus, saved, progress, states } = setup();
  const done = await up.start();
  assert.equal(up.state, 'done');
  assert.ok(done.url.startsWith(`${tus.endpoint}/`));
  assert.deepEqual(tus.patches().map((p) => p.bytes), [6 * MB, 6 * MB, 6 * MB, 2 * MB]);
  assert.ok(await sameBytes(file, tus.objects.get(`arch-files/${PATH}`)));
  const create = tus.log.find((o) => o.method === 'POST');
  assert.equal(create.headers['upload-length'], String(20 * MB));
  assert.equal(create.headers['x-upsert'], 'false', 'a kept file is never written over');
  assert.ok(tus.log.every((o) => o.headers['tus-resumable'] === '1.0.0' && o.headers.authorization === 'Bearer token-1' && o.headers.apikey));
  assert.deepEqual(tus.uploads.get('u1').meta, { bucketName: 'arch-files', objectName: PATH, contentType: 'application/octet-stream', cacheControl: '3600' });
  assert.ok(progress.every(([s], i) => i === 0 || s >= progress[i - 1][0]), 'progress only goes forward');
  assert.deepEqual(progress.at(-1), [20 * MB, 20 * MB]);
  assert.deepEqual(states, ['starting', 'sending', 'done']);
  assert.deepEqual(saved.list(), [], 'a finished upload is not remembered');
});

test('the connection drops part-way through a part: it asks how much arrived, and sends only the rest', async () => {
  const { up, file, tus, states } = setup();
  let cut = false;
  tus.cut = (op) => (op.method === 'PATCH' && op.headers['upload-offset'] === String(6 * MB) && !cut ? ((cut = true), 0.4) : null);
  await up.start();
  assert.ok(await sameBytes(file, tus.objects.get(`arch-files/${PATH}`)), 'byte for byte after the cut');
  const offsets = tus.patches().map((p) => Number(p.headers['upload-offset']));
  const partial = 6 * MB + Math.floor(6 * MB * 0.4);
  assert.deepEqual(offsets, [0, 6 * MB, partial, partial + 6 * MB], 'carried on from what had arrived, not from the start of the part');
  assert.equal(tus.sentBytes(), 20 * MB, 'no byte was stored twice');
  assert.ok(tus.log.some((o) => o.method === 'HEAD'), 'it asked the server first');
  assert.ok(states.includes('retrying'));
});

test('pause stops the part in flight; resume carries on from what the server holds', async () => {
  const { up, file, tus, states } = setup({ size: 14 * MB });
  tus.delay = 30;
  const going = up.start();
  await new Promise((r) => setTimeout(r, 45)); // part 1 is in, part 2 is on its way
  up.pause();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(up.state, 'paused');
  const heldWhilePaused = tus.uploads.get('u1').offset;
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(tus.uploads.get('u1').offset, heldWhilePaused, 'nothing is sent while paused');
  up.resume();
  await going;
  assert.ok(await sameBytes(file, tus.objects.get(`arch-files/${PATH}`)));
  assert.ok(states.indexOf('paused') > 0 && states.at(-1) === 'done');
});

test('the page is closed part-way; dropping the same file again carries on where it stopped', async () => {
  const saved = savedUploads(memoryBackend());
  const tus = fakeTus();
  const first = setup({ saved, tus });
  tus.fail = (op) => (op.method === 'PATCH' && op.headers['upload-offset'] === String(12 * MB) ? 503 : null);
  first.up.start().catch(() => {});
  await new Promise((r) => setTimeout(r, 20)); // two parts in, then the server is busy and the tab is closed
  assert.equal(tus.uploads.get('u1').offset, 12 * MB);
  const left = saved.list();
  assert.equal(left.length, 1); assert.equal(left[0].name, 'house.rvt'); assert.equal(left[0].sent, 12 * MB); assert.equal(left[0].total, 20 * MB);
  assert.equal('data' in left[0], false, 'no file contents are remembered');
  tus.fail = null;
  const again = setup({ saved, tus }); // a new visit, the same file dropped again
  await again.up.start();
  assert.equal(again.up.resumedFrom, 12 * MB);
  assert.equal(tus.log.filter((o) => o.method === 'POST').length, 1, 'no second upload was started');
  assert.deepEqual(tus.patches().slice(-2).map((p) => Number(p.headers['upload-offset'])), [12 * MB, 18 * MB]);
  assert.ok(await sameBytes(again.file, tus.objects.get(`arch-files/${PATH}`)));
  assert.deepEqual(saved.list(), []);
});

test('offline: it waits for the connection, then carries on by itself', async () => {
  let online = true, back;
  const { up, file, tus, states } = setup({ size: 8 * MB, isOnline: () => online, whenOnline: () => new Promise((r) => { back = r; }) });
  tus.cut = (op) => (op.method === 'PATCH' && op.n < 3 && op.headers['upload-offset'] === '0' ? ((online = false), 0.5) : null);
  const going = up.start();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(up.state, 'waiting');
  online = true; back();
  await going;
  assert.ok(states.includes('waiting'));
  assert.ok(await sameBytes(file, tus.objects.get(`arch-files/${PATH}`)));
});

test('when it keeps failing it stalls rather than giving up; resume tries again', async () => {
  let broken = true;
  const { up, file, tus } = setup({ size: 7 * MB, retryDelays: [0, 0] });
  tus.fail = (op) => (op.method === 'PATCH' && broken ? 502 : null);
  const going = up.start();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(up.state, 'stalled');
  broken = false; up.resume();
  await going;
  assert.ok(await sameBytes(file, tus.objects.get(`arch-files/${PATH}`)));
});

test('refusals are said in plain words and are not retried', async () => {
  const cases = [[403, 'refused', /your role in the practice does not allow it/], [413, 'too_big', /bigger than the shared records accept/], [409, 'exists', /already kept/]];
  for (const [status, code, words] of cases) {
    const { up, tus } = setup({ size: 1 * MB });
    tus.fail = (op) => (op.method === 'POST' ? status : null);
    await assert.rejects(up.start(), (e) => e instanceof UploadError && e.code === code && words.test(e.message));
    assert.equal(tus.log.length, 1);
    assert.equal(up.state, 'failed');
  }
  const tus = fakeTus({ limit: 50 * MB });
  const big = setup({ size: 51 * MB, tus });
  await assert.rejects(big.up.start(), (e) => e.code === 'too_big', 'the bucket’s own limit is reported, not hidden');
});

test('a sign-in that expires part-way: one refusal, the renewed token is asked for, and it carries on', async () => {
  const tus = fakeTus(), file = patterned(13 * MB);
  let renewed = false, parts = 0;
  const fetch = async (url, o) => {
    const r = await tus.fetch(url, o);
    if (o.method === 'PATCH' && r.status === 204 && ++parts === 1) tus.token = 'token-2'; // the old token stops working
    if (r.status === 401) renewed = true; // as Supabase's client does: the next ask gets a fresh one
    return r;
  };
  const up = createUpload({ file, endpoint: tus.endpoint, fetch, sleep: noWait, key: 'k', metadata: { bucketName: 'arch-files', objectName: 'a/b/c' },
    headers: async () => ({ authorization: `Bearer ${renewed ? 'token-2' : 'token-1'}` }) });
  await up.start();
  assert.equal(up.state, 'done');
  assert.equal(tus.log.filter((o) => o.method === 'PATCH' && o.headers.authorization === 'Bearer token-1').length, 2, 'one part went with the old token, one was refused');
  assert.ok(await sameBytes(file, tus.objects.get('arch-files/a/b/c')));
});

test('an upload the server has forgotten is started again once, from the beginning', async () => {
  const { up, file, tus } = setup({ size: 9 * MB });
  let gone = false;
  tus.fail = (op) => (op.method === 'PATCH' && op.headers['upload-offset'] === String(6 * MB) && !gone ? ((gone = true), tus.uploads.clear(), 404) : null);
  await up.start();
  assert.equal(tus.log.filter((o) => o.method === 'POST').length, 2);
  assert.ok(await sameBytes(file, tus.objects.get(`arch-files/${PATH}`)));
});

test('stop: the server is asked to forget it, it is not remembered, and it says nothing was kept', async () => {
  const { up, tus, saved } = setup({ size: 13 * MB });
  tus.delay = 30;
  const going = up.start();
  await new Promise((r) => setTimeout(r, 40));
  await up.stop();
  await assert.rejects(going, (e) => e.code === 'stopped' && /Nothing was kept/.test(e.message));
  assert.equal(up.state, 'stopped');
  assert.ok(tus.log.some((o) => o.method === 'DELETE'));
  assert.equal(tus.uploads.size, 0);
  assert.equal(tus.objects.size, 0);
  assert.deepEqual(saved.list(), []);
});

test('the address, the metadata and the key', () => {
  assert.equal(tusEndpoint(SUPABASE_URL), `https://${new URL(SUPABASE_URL).hostname.split('.')[0]}.storage.supabase.co/storage/v1/upload/resumable`);
  assert.throws(() => tusEndpoint('https://x.example/'), /not a Supabase project address/);
  const m = encodeMetadata({ bucketName: 'arch-files', objectName: 'a/b', contentType: '', note: 'Maunga Whau · ā' });
  assert.equal(m.split(',').length, 3, 'empty values are left out');
  assert.equal(new TextDecoder().decode(Uint8Array.from(atob(m.split(',')[2].split(' ')[1]), (c) => c.charCodeAt(0))), 'Maunga Whau · ā');
  assert.equal(uploadKey({ name: 'a.rvt', size: 5, lastModified: 7 }, 'p'), 'p:a.rvt:5:7');
  assert.equal(CHUNK, 6 * MB);
});
