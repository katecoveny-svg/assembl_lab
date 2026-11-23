// The workspace redesign, phase 1: one file library, one model, the client hand-off (share link and package), and the money
// empty states. Invented data only (the Sample and made-up file names).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { libraryOf, kindOf, primaryModel, counts, docsWithoutFiles, nextVersionFor, slotForUpload, uploadExtra, mediaOf } from '../../architecture/js/file-library-rules.js';
import { shareOf, withShare, mayShare, shareUrl, clientView, clientParts, packageEntries, newToken, TOKEN } from '../../architecture/js/share-rules.js';
import { zipParts } from '../../architecture/js/zip-write.js';
import { readZip } from '../../architecture/js/artwork-kit.js';
import { sourceExtra } from '../../architecture/js/site-sources-rules.js';
import { noInvoicesYet, emptyPipeline, forecast } from '../../architecture/js/money-model.js';
import { createStore, memoryBackend, memoryFiles } from '../../architecture/js/store.js';
import { sampleProject } from '../../architecture/js/model.js';
import { ADDONS } from '../../architecture/js/modules.js';

const src = (slot, name, o = {}) => ({ id: o.id ?? `f-${name}-${o.v ?? 1}`, name, owner_kind: 'source', owner_id: 'p1', kept_at: o.at ?? '2026-11-20T00:00:00Z', size: o.size ?? 100, extra: { ...sourceExtra({ slot, version: o.v ?? 1, by: 'Aroha' }), ...(o.extra ?? {}) } });
const mdl = (name, o = {}) => ({ id: o.id ?? `m-${name}`, name, owner_kind: 'model', owner_id: 'p1', kept_at: o.at ?? '2026-11-21T00:00:00Z', size: o.size ?? 1000, extra: o.extra ?? {} });
const project = (o = {}) => ({ id: 'p1', name: 'Sample house', ...o });

test('one library: documents, models and sources all show, each once, sorted into kinds', () => {
  const files = [
    src('films', 'view-a.jpg'), src('films', 'view-b.jpg'), src('films', 'walk.mp4'),
    src('drawing_set', 'set.pdf'), src('site_plan', 'site.pdf'), src('other', 'house.glb'),
    mdl('house.ifc'), { id: 'd1f', name: 'photo.jpg', owner_kind: 'document', owner_id: 'd1', kept_at: '2026-11-19T00:00:00Z', size: 5 },
  ];
  const documents = [{ id: 'd1', title: 'Site visit photo', kind: 'Photo', stage: 'predesign', file: { id: 'd1f' } }];
  const items = libraryOf({ project: project(), files, documents });
  const c = counts(items);
  assert.equal(c.all, 8);
  assert.deepEqual({ stills: c.stills, films: c.films, drawings: c.drawings, site: c.site, models: c.models, photos: c.photos }, { stills: 2, films: 1, drawings: 1, site: 1, models: 2, photos: 1 });
  assert.equal(items.find((i) => i.kind === 'photos').title, 'Site visit photo');
});

test('films and stills: every different picture is its own tile (not stacked as versions of one file)', () => {
  const items = libraryOf({ files: [src('films', 'a.png', { at: '2026-11-20T01:00:00Z' }), src('films', 'b.png', { at: '2026-11-20T02:00:00Z' }), src('films', 'c.mp4')] });
  assert.equal(items.length, 3);
  assert.ok(items.every((i) => i.count === 1));
});

test('the same name and kind again is a version: newest first, counted', () => {
  const items = libraryOf({ files: [src('films', 'a.png', { v: 1, at: '2026-11-20T01:00:00Z' }), src('films', 'a.png', { v: 2, id: 'f2', at: '2026-11-21T01:00:00Z' })] });
  assert.equal(items.length, 1);
  assert.equal(items[0].count, 2);
  assert.equal(items[0].latest.id, 'f2');
  assert.equal(nextVersionFor(items, 'stills', 'A.PNG'), 3);
  assert.equal(nextVersionFor(items, 'stills', 'new.png'), 1);
});

test('the plan model file and browser copies are not tiles of their own', () => {
  const p = project({ model: { fingerprint: 'abc', file: { id: 'plan' } } });
  const items = libraryOf({ project: p, files: [{ id: 'plan', name: 'hero.plan.json', owner_kind: 'model' }, mdl('big.ifc', { id: 'big' }), mdl('big.glb', { id: 'copy', extra: { browser_copy_of: 'big' } })] });
  assert.deepEqual(items.map((i) => i.name), ['big.ifc']);
  assert.equal(items[0].copy.id, 'copy');
});

test('one model: an uploaded IFC or GLB wins wherever it was uploaded; the plan model only when nothing was', () => {
  const plan = project({ model: { fingerprint: 'abc', file: { id: 'plan' } } });
  assert.equal(primaryModel(plan, []).kind, 'plan');
  assert.equal(primaryModel(project(), []), null);
  // uploaded in Site and sources (slot other): the contradiction the audit found ("No model yet" while a GLB was attached)
  const viaSources = primaryModel(plan, [src('other', 'house.glb')]);
  assert.equal(viaSources.kind, 'uploaded'); assert.equal(viaSources.note.name, 'house.glb'); assert.ok(viaSources.opens);
  // a Revit file is the model but does not open in 3D; an IFC beside it does
  const rvt = primaryModel(project(), [mdl('house.rvt')]);
  assert.equal(rvt.opens, false); assert.match(rvt.why, /IFC or a GLB/);
  assert.equal(primaryModel(project(), [mdl('house.rvt', { at: '2026-11-22T00:00:00Z' }), mdl('house.ifc')]).note.name, 'house.ifc');
  // a browser copy is what opens
  const pm = primaryModel(project(), [mdl('big.ifc', { id: 'big' }), mdl('big.glb', { id: 'copy', extra: { browser_copy_of: 'big' } })]);
  assert.equal(pm.note.id, 'big'); assert.equal(pm.open.id, 'copy');
});

test('records without a file are listed apart; uploads go to the slot the 3D page reads', () => {
  assert.deepEqual(docsWithoutFiles([{ id: 'a', file: { id: 'x' } }, { id: 'b' }], [{ id: 'x' }]).map((d) => d.id), ['b']);
  assert.equal(slotForUpload('set.pdf'), 'drawing_set');
  assert.equal(slotForUpload('walk.mp4'), 'films');
  assert.equal(slotForUpload('house.glb'), 'other');
  assert.equal(uploadExtra({ name: 'a.jpg', version: 2 }).source.version, 2);
  assert.equal(kindOf({ name: 'a.jpg', owner_kind: 'source', extra: uploadExtra({ name: 'a.jpg', version: 1 }) }), 'stills');
  assert.equal(mediaOf('x.webm'), 'video');
});

test('sharing is off by default, and turning it off kills the link', () => {
  const p = project();
  assert.equal(shareOf(p).on, false);
  assert.equal(shareOf({ ...p, share: { on: true } }).on, false, 'on without a good token is still off');
  assert.equal(shareOf({ ...p, share: { on: 'yes', token: 'a'.repeat(32) } }).on, false);
  const on = withShare(p, true, { who: 'Aroha', token: 'b'.repeat(32) });
  assert.equal(shareOf(on).on, true);
  assert.equal(shareOf(withShare(on, true)).token, 'b'.repeat(32), 'turning it on again keeps the same link');
  const off = withShare(on, false);
  assert.equal(shareOf(off).on, false); assert.equal(off.share.token, undefined);
  assert.notEqual(shareOf(withShare(off, true)).token, 'b'.repeat(32), 'on again after off is a new link');
  assert.match(newToken(), TOKEN);
});

test('only an owner shares a practice project; the browser decides for its own', () => {
  assert.equal(mayShare({ place: 'browser' }).ok, true);
  assert.equal(mayShare({ place: 'shared', role: 'owner' }).ok, true);
  assert.equal(mayShare({ place: 'shared', role: 'member' }).ok, false);
  assert.equal(mayShare({ place: 'shared', role: 'viewer' }).ok, false);
  const u = new URL(shareUrl('https://lab.assembl.co.nz', { token: 'c'.repeat(32), pid: 'p1', place: 'browser' }));
  assert.equal(u.pathname, '/architecture/share/'); assert.equal(u.searchParams.get('p'), 'p1');
  assert.equal(new URL(shareUrl('https://x.nz', { token: 'c'.repeat(64), pid: 'p1', place: 'shared' })).searchParams.get('p'), null);
});

test('the client view shows only stills, films, PDF drawings and the model; nothing at all with a wrong token', () => {
  const files = [src('films', 'a.jpg'), src('films', 'walk.mp4'), src('drawing_set', 'set.pdf'), src('other', 'plan.dwg'), src('site_plan', 'site.pdf'), src('survey', 'survey.pdf'), src('other', 'house.glb'),
    { id: 'ph', name: 'photo.jpg', owner_kind: 'document', owner_id: 'd1' }];
  const documents = [{ id: 'd1', title: 'Site photo', kind: 'Photo', file: { id: 'ph' } }];
  const token = 'd'.repeat(32), p = withShare({ ...project(), site: { lat: -40.0001, lon: 172.0001 } }, true, { token });
  assert.equal(clientView({ project: p, files, documents, token: 'e'.repeat(32) }), null);
  assert.equal(clientView({ project: withShare(p, false), files, documents, token }), null);
  const v = clientView({ project: p, files, documents, token });
  assert.deepEqual(v.stills.map((i) => i.name), ['a.jpg']);
  assert.deepEqual(v.films.map((i) => i.name), ['walk.mp4']);
  assert.deepEqual(v.drawings.map((i) => i.name), ['set.pdf']);
  assert.equal(v.model.note.name, 'house.glb');
  const text = JSON.stringify(v);
  for (const no of ['site.pdf', 'survey.pdf', 'photo.jpg', '-40.0001', '172.0001']) assert.ok(!text.includes(no), `no ${no}`);
});

test('the package: folders, newest version only, safe and unique names, a read-me', () => {
  const v = clientParts({ project: project(), files: [src('films', 'a.jpg', { v: 1 }), src('films', 'a.jpg', { v: 2, id: 'new' }), src('films', '../x.jpg'), src('films', 'walk.mp4'), src('drawing_set', 'set.pdf'), src('other', 'house.glb')] });
  const { entries, readme } = packageEntries(v);
  assert.deepEqual(entries.map((e) => e.path).sort(), ['drawings/set.pdf', 'films/walk.mp4', 'model/house.glb', 'stills/..x.jpg', 'stills/a.jpg'].sort());
  assert.equal(entries.find((e) => e.path === 'stills/a.jpg').note.id, 'new');
  assert.match(readme, /not for construction/i);
  assert.match(readme, /not photographs/);
});

test('the zip writer makes a .zip that reads back byte for byte', async () => {
  const enc = new TextEncoder(), a = enc.encode('hello'), b = new Uint8Array(70000).map((_, i) => i % 251);
  const parts = zipParts([{ path: 'READ ME.txt', data: a }, { path: 'stills/x.bin', data: b }], { now: new Date(2026, 10, 23, 12, 0, 0) });
  const blob = new Blob(parts), got = await readZip(blob);
  assert.deepEqual(got.entries.map((e) => e.path), ['READ ME.txt', 'stills/x.bin']);
  const x = await got.read(got.entries[1]);
  assert.equal(x.byteLength, b.byteLength);
  assert.ok(Buffer.from(x).equals(Buffer.from(b)), 'the same bytes');
  assert.equal(new TextDecoder().decode(await got.read(got.entries[0])), 'hello');
  assert.throws(() => zipParts([{ path: '../evil', data: a }]), /unsafe/);
  assert.throws(() => zipParts([{ path: 'a', data: a }, { path: 'a', data: a }]), /same name/);
});

test('a browser share round trip through the real store: off, on, read, off', async () => {
  const store = createStore(memoryBackend(), { files: memoryFiles() });
  const s = sampleProject(); await store.saveProject(s);
  const pid = s.project?.id ?? s.id ?? (await store.list('project'))[0].id;
  await store.putFile({ project_id: pid, owner_kind: 'source', owner_id: pid, name: 'view.jpg', type: 'image/jpeg', data: new Uint8Array([1, 2, 3]), extra: uploadExtra({ name: 'view.jpg', version: 1 }) });
  const read = async (token) => { const b = await store.loadProject(pid); return clientView({ project: b.project, files: await store.listFiles({ project_id: pid }), documents: b.documents, token }); };
  assert.equal(await read('f'.repeat(32)), null);
  const p = await store.get('project', pid);
  const on = withShare(p, true, { token: '1'.repeat(32) }); await store.save('project', on);
  assert.equal((await read('1'.repeat(32))).stills.length, 1);
  await store.save('project', withShare(on, false));
  assert.equal(await read('1'.repeat(32)), null);
});

test('money: no invoices and an empty pipeline are empty states, not "below break-even" and "short"', () => {
  assert.equal(noInvoicesYet([]), true);
  assert.equal(noInvoicesYet([{ amount_nzd: 100, void: true }]), true);
  assert.equal(noInvoicesYet([{ amount_nzd: 100 }]), false);
  assert.equal(emptyPipeline(forecast([], {}, '2026-12', 6)), true);
  const money = readFileSync(new URL('../../architecture/js/money.js', import.meta.url), 'utf8');
  assert.match(money, /Nothing invoiced yet/);
  assert.match(money, /No won or likely work in the pipeline yet/);
});

test('wiring: the add-on is loaded, the tabs say Files and Hand-off, and the API refuses without its key', async () => {
  assert.ok(ADDONS.includes('./file-library.js'));
  const app = readFileSync(new URL('../../architecture/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /\['drawings', 'Files'/); assert.match(app, /\['presentation', 'Hand-off'/);
  assert.match(app, /alive\(\)/, 'a stale draw does not add sections twice');
  const api = await import('../../functions/api/arch-share.js');
  const ask = (t, env = {}) => api.onRequestGet({ request: new Request(`https://lab.assembl.co.nz/api/arch-share?t=${t}`), env });
  assert.equal((await ask('nope')).status, 404);
  assert.equal((await ask('a'.repeat(64))).status, 503);
  const sql = readFileSync(new URL('../../supabase/migrations/20261123200000_arch_project_share.sql', import.meta.url), 'utf8');
  assert.match(sql, /shared\s+boolean not null default false/);
  assert.match(sql, /arch\.is_owner\(v_practice\)/);
  assert.match(sql, /grant execute on function arch\.shared_project\(text\) to service_role;/);
  assert.doesNotMatch(sql, /grant execute on function arch\.shared_project\(text\) to (anon|authenticated)/);
});

test('the API serves only what an owner shared, with signed links, and never the site', async () => {
  const api = await import('../../functions/api/arch-share.js');
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push(String(url));
    if (String(url).includes('/rpc/shared_project')) {
      const body = JSON.parse(init.body);
      if (body.p_token !== 'a'.repeat(64)) return new Response('null', { status: 200 });
      return new Response(JSON.stringify({ project: { id: 'p1', name: 'Sample house' }, practice: { name: 'Sample practice', theme: 'sketch' },
        files: [{ ...src('films', 'a.jpg'), path: 'pr/p1/1' }, { ...src('site_plan', 'site.pdf'), path: 'pr/p1/2' }, { ...src('other', 'house.glb'), path: 'pr/p1/3' }], documents: [] }), { status: 200 });
    }
    if (String(url).includes('/object/sign/')) { const { paths } = JSON.parse(init.body); return new Response(JSON.stringify(paths.map((p) => ({ path: p, signedURL: `/object/sign/arch-files/${p}?token=x` }))), { status: 200 }); }
    return new Response('', { status: 500 });
  };
  try {
    const ask = (t) => api.onRequestGet({ request: new Request(`https://lab.assembl.co.nz/api/arch-share?t=${t}`), env: { ARCH_SHARE_SERVICE_KEY: 'test-only' } });
    assert.equal((await ask('b'.repeat(64))).status, 404);
    const r = await ask('a'.repeat(64)); const d = await r.json();
    assert.equal(r.status, 200);
    assert.deepEqual(d.stills.map((s) => s.file.name), ['a.jpg']);
    assert.match(d.stills[0].file.url, /\/storage\/v1\/object\/sign\//);
    assert.equal(d.model.name, 'house.glb');
    assert.ok(!JSON.stringify(d).includes('site.pdf'));
    assert.ok(!JSON.stringify(d).includes('pr/p1/2'), 'the site plan is never signed');
    assert.equal(r.headers.get('cache-control'), 'no-store');
  } finally { globalThis.fetch = realFetch; }
});
