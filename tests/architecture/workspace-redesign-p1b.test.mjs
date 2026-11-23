// Workspace redesign p1b: the cover note from the practice's records, building-framed model stills, thumbnails drawn from
// part of a file, the client page in the practice's brand, and what Hand-off says about client links. Invented data only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore, memoryBackend, memoryFiles } from '../../architecture/js/store.js';
import { newProject } from '../../architecture/js/model.js';
import { createCloudStore, createGateway } from '../../architecture/js/cloud.js';
import { sourceExtra } from '../../architecture/js/site-sources-rules.js';
import { coverNote, primaryModel, thumbPlan, thumbKey } from '../../architecture/js/file-library-rules.js';
import { linkNote } from '../../architecture/js/share-rules.js';
import { buildingBounds, warmColour } from '../../architecture/js/model-bounds.js';
import { buildingBounds as pageRule } from '../../plan-studio/twins/src/twin/modelBounds.ts';
import { fakeSupabase } from './fake-supabase.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const GLB = new Uint8Array([0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0]);
const cloudStore = () => {
  const fake = fakeSupabase();
  fake.auth = { getSession: async () => ({ data: { session: { access_token: 't' } } }) };
  return { fake, cloud: createCloudStore({ gateway: createGateway(fake), practice: { id: '11111111-1111-4111-8111-111111111111', name: 'Tui', role: 'owner' }, local: createStore(memoryBackend(), { files: memoryFiles() }) }) };
};

test('cloud records: a GLB kept in Site and sources makes the cover say Model attached (no plan model)', async () => {
  const { cloud } = cloudStore();
  const pid = await cloud.saveProject(newProject({ name: 'Sample house' }));
  const p = await cloud.get('project', pid);
  assert.equal(p.model.fingerprint, '', 'a cloud-shaped project with no plan model');
  assert.equal(coverNote(p, await cloud.listFiles({ project_id: pid })), 'No model yet');
  await cloud.putFile({ project_id: pid, owner_kind: 'source', owner_id: pid, name: 'house.glb', type: 'model/gltf-binary', data: GLB, extra: sourceExtra({ slot: 'other', version: 1 }) });
  const files = await cloud.listFiles({ project_id: pid });
  assert.equal(primaryModel(p, files).note.name, 'house.glb');
  assert.equal(coverNote(p, files), 'Model attached');
  // the wall reads every file at once
  const all = await cloud.listFiles();
  assert.equal(coverNote(p, all.filter((f) => f.project_id === p.id)), 'Model attached');
});

test('every cover uses the one note: the practice-artwork cover is told it, not left to read the plan model', () => {
  const app = read('architecture/js/app.js'), art = read('architecture/js/artwork.js');
  assert.match(app, /const note = coverNote\(p,/);
  assert.match(app, /artCover\(p, cls, note\)/);
  assert.match(art, /export function artCover\(p, cls = '', note = null\)/);
  assert.match(art, /note \?\?=/);
});

test('cloud fileUrl: a short link for a practice file; none for a file that is not there', async () => {
  const { cloud } = cloudStore();
  const pid = await cloud.saveProject(newProject({ name: 'Sample house' }));
  const n = await cloud.putFile({ project_id: pid, owner_kind: 'source', owner_id: pid, name: 'set.pdf', type: 'application/pdf', data: new TextEncoder().encode('%PDF-1.4'), extra: sourceExtra({ slot: 'drawing_set', version: 1 }) });
  assert.match(await cloud.fileUrl(n.id), /^https:\/\/storage\.example\.test\/sign\//);
  assert.equal(await cloud.fileUrl('22222222-2222-4222-8222-222222222222'), null);
});

test('the still frames the building: the same rule as the 3D page, site slabs and strays left out', () => {
  const part = (x, z, w = 2, h = 3, y = 0) => [x, y, z, x + w, y + h, z + w];
  const parts = [];
  for (let i = 0; i < 40; i++) parts.push(part((i % 8) * 2, Math.floor(i / 8) * 2, 1.5, 6));
  parts.push([-300, -1, -300, 300, 0.5, 300]); // a topography mesh 600 m across
  parts.push(part(250, 250));                   // a survey point far off
  const { box, left } = buildingBounds(parts);
  assert.equal(left, 2);
  assert.ok(box[3] - box[0] < 20 && box[5] - box[2] < 20, 'the box is the building, not the site');
  // agrees with the 3D page's own rule on varied inputs
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 40; k++) {
    const list = Array.from({ length: 4 + Math.floor(rnd() * 40) }, () => { const x = rnd() * 60 - 30, z = rnd() * 60 - 30, w = rnd() * (rnd() < 0.1 ? 400 : 6); return [x, rnd(), z, x + w, 1 + rnd() * 9, z + w]; });
    assert.deepEqual(buildingBounds(list), pageRule(list));
  }
  const src = read('architecture/js/model-view.js');
  assert.match(src, /frame === 'building' && meshes\.boxes/);
});

test('warm light: greys and whites lean warm; real colours keep their hue', () => {
  const [r, , b] = warmColour([0.8, 0.8, 0.8, 1]);
  assert.ok(r > b, 'a grey wall turns warm');
  assert.deepEqual(warmColour([0.1, 0.5, 0.9, 1]), [0.1, 0.5, 0.9, 1]);
  assert.match(read('architecture/js/file-library.js'), /frame: 'building', look: 'warm'/);
});

test('thumbnails: practice files are drawn from a link (a big PDF by range), so they no longer stay an icon', () => {
  const big = (name, mb) => ({ id: 'x', name, size: mb * 1024 * 1024 });
  assert.deepEqual(thumbPlan(big('site-plan.pdf', 120), { remote: true }), { how: 'url', media: 'pdf' });
  assert.deepEqual(thumbPlan(big('render.jpg', 30), { remote: true }), { how: 'url', media: 'image' });
  assert.deepEqual(thumbPlan(big('render.jpg', 30)), { how: 'bytes', media: 'image' });
  assert.equal(thumbPlan(big('house.glb', 20), { remote: true }).how, 'bytes');
  assert.equal(thumbPlan(big('house.rvt', 2), { remote: true }).how, 'skip');
  assert.notEqual(thumbKey({ id: 'a', size: 1 }), thumbKey({ id: 'a', size: 2 }));
  const src = read('architecture/js/file-library.js');
  assert.match(src, /IntersectionObserver/);
  assert.match(src, /disableAutoFetch: true/);
  assert.doesNotMatch(src, /shown\.slice\(0, 60\)/, 'every tile, not the first sixty');
});

test('Hand-off says plainly what stands between the link and a client', () => {
  assert.equal(linkNote({ place: 'browser', on: true }), '');
  assert.match(linkNote({ place: 'shared', table: false }), /database update/);
  assert.match(linkNote({ place: 'shared', on: true, table: true, configured: false }), /server key/);
  assert.equal(linkNote({ place: 'shared', on: true, table: true, configured: true }), '');
  assert.equal(linkNote({ place: 'shared', on: false, table: true, configured: false }), '');
});

test('the client page wears the practice brand from the workspace at runtime: name, logo in the look’s ink, sketch look', async () => {
  const api = await import('../../functions/api/arch-share.js');
  const get = (q, env = {}) => api.onRequestGet({ request: new Request(`https://lab.assembl.co.nz/api/arch-share?${q}`), env });
  assert.deepEqual(await (await get('status=1')).json(), { type: 'assembl.arch.share.status', configured: false });
  assert.equal((await (await get('status=1', { ARCH_SHARE_SERVICE_KEY: 'k' })).json()).configured, true);
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('/rpc/shared_project')) return new Response(JSON.stringify({ project: { id: 'p1', name: 'Sample house' }, files: [], documents: [],
      practice: { name: 'Sample practice', theme: { theme: 'sketch' }, artwork: { logo: { white: { path: 'pr/artwork/logo-white.webp' }, black: { path: 'pr/artwork/logo-black.webp' } } } } }));
    if (String(url).includes('/object/sign/')) { const { paths } = JSON.parse(init.body); return new Response(JSON.stringify(paths.map((p) => ({ path: p, signedURL: `/object/sign/arch-files/${p}?token=x` })))); }
    return new Response('', { status: 500 });
  };
  try {
    const d = await (await get(`t=${'a'.repeat(64)}`, { ARCH_SHARE_SERVICE_KEY: 'k' })).json();
    assert.equal(d.practice.name, 'Sample practice');
    assert.equal(d.practice.theme, 'sketch');
    assert.match(d.practice.logo, /logo-(white|black)\.webp/);
  } finally { globalThis.fetch = real; }
  const share = read('architecture/share/share.js');
  assert.match(share, /BRAND_KEY/);
  assert.match(share, /practice\?\.logo/);
  const mig = read('supabase/migrations/20261123210000_arch_project_share_brand.sql');
  assert.match(mig, /'artwork', pr\.extra -> 'artwork'/);
  assert.match(mig, /grant execute on function arch\.shared_project\(text\) to service_role;/);
});

test('the compact header: the stages and open counts in one slim row', () => {
  const app = read('architecture/js/app.js');
  assert.match(app, /class="phead pcomp"/);
  assert.match(app, /class="pslim"/);
});
