// Workspace redesign phase 2: comments and pins. The migration's shape (read as text), the rules, the local and shared stores,
// the server's token and rate-limit behaviour, and the escaping. Invented data only (the Sample project).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { memoryBackend } from '../../architecture/js/store.js';
import { createGateway } from '../../architecture/js/cloud.js';
import { createLocalComments, createSharedComments, draftOf, KEY } from '../../architecture/js/comments-store.js';
import * as R from '../../architecture/js/comments-rules.js';
import { ADDONS } from '../../architecture/js/modules.js';
import { fakeSupabase } from './fake-supabase.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const SQL = read('supabase/migrations/20261123220000_arch_comments.sql');
const TOKEN = 'a'.repeat(64);
const PRACTICE = '11111111-1111-4111-8111-111111111111';

// ---- the migration ---------------------------------------------------------------------------------------------------------
test('migration: row level security on, nothing for anon, members read and write, owners alone hide and delete', () => {
  assert.match(SQL, /alter table arch\.comment enable row level security;/);
  assert.match(SQL, /alter table arch\.comment_hit enable row level security;/);
  assert.match(SQL, /revoke all on arch\.comment from public, anon, authenticated;/);
  assert.doesNotMatch(SQL, /grant [^;]*arch\.comment[^;]* to (anon|public)\b/);
  // the policies, by name and by what they check
  const policy = (name) => SQL.match(new RegExp(`create policy ${name} on arch\\.comment for (\\w+) to authenticated\\s+([\\s\\S]*?);\\n`))?.[0] ?? '';
  const sel = policy('comment_select'), ins = policy('comment_insert'), hide = policy('comment_hide'), del = policy('comment_delete');
  assert.match(sel, /for select/); assert.match(sel, /arch\.is_member\(practice_id\)/); assert.match(sel, /not hidden or arch\.is_owner\(practice_id\)/);
  assert.match(ins, /for insert/); assert.match(ins, /arch\.can_write\(practice_id\)/); assert.match(ins, /author_kind = 'member'/); assert.match(ins, /author_id = auth\.uid\(\)/);
  assert.match(ins, /via_token_hash is null/); assert.match(ins, /practice_id = arch\.project_practice\(project_id\)/);
  assert.match(hide, /for update/); assert.match(hide, /using \(arch\.is_owner\(practice_id\)\) with check \(arch\.is_owner\(practice_id\)\)/);
  assert.match(del, /for delete/); assert.match(del, /using \(arch\.is_owner\(practice_id\)\)/);
  // hiding is the only column a signed-in person can update; a comment's words cannot be edited
  assert.match(SQL, /grant update \(hidden\) on arch\.comment to authenticated;/);
  assert.doesNotMatch(SQL, /grant update on arch\.comment/);
  assert.match(SQL, /grant select, insert, delete on arch\.comment to authenticated;/);
});

test('migration: a client comment can only come through the token function, called by the server key alone', () => {
  // no insert path for a client row from a signed-in person
  assert.match(SQL, /constraint comment_client_has_token check \(author_kind <> 'client' or \(author_id is null and via_token_hash is not null and to_client\)\)/);
  assert.match(SQL, /constraint comment_member_has_author check \(author_kind <> 'member' or \(author_id is not null and via_token_hash is null\)\)/);
  for (const sig of ['arch\\.client_comments\\(text\\)', 'arch\\.client_comment_add\\(text, text, text, text, uuid, numeric, numeric\\)']) {
    assert.match(SQL, new RegExp(`revoke all on function ${sig} from public, anon, authenticated;`));
    assert.match(SQL, new RegExp(`grant execute on function ${sig} to service_role;`));
    assert.doesNotMatch(SQL, new RegExp(`grant execute on function ${sig} to (anon|authenticated|public)`));
  }
  // the token must be a link that is on, in the share table; the same lookup as arch.shared_project
  const add = SQL.slice(SQL.indexOf('create or replace function arch.client_comment_add'));
  assert.match(add, /sh\.shared and sh\.token is not null and sh\.token = p_token and p_token ~ '\^\[a-f0-9\]\{64\}\$'/);
  assert.match(add, /raise exception 'not_shared'/); assert.match(add, /raise exception 'bad_comment'/); assert.match(add, /raise exception 'rate_limited'/);
  // a client comment is read back only under the token it was written under; practice comments only when marked for the client
  const list = SQL.slice(SQL.indexOf('create or replace function arch.client_comments'), SQL.indexOf('create or replace function arch.client_comment_add'));
  assert.match(list, /c\.to_client and not c\.hidden/);
  assert.match(list, /c\.author_kind = 'member' or c\.via_token_hash = encode\(sha256\(convert_to\(p_token, 'UTF8'\)\), 'hex'\)/);
  assert.match(list, /s\.shared and s\.token is not null and s\.token = p_token/);
});

test('migration: plain text with a 2,000 character cap, pins as fractions, and the rate numbers match the server', () => {
  assert.match(SQL, /length\(btrim\(body\)\) between 1 and 2000/);
  assert.match(SQL, /length\(btrim\(author_name\)\) between 1 and 60/);
  assert.match(SQL, /pin_x\s+numeric\(5, 4\) check \(pin_x is null or \(pin_x >= 0 and pin_x <= 1\)\)/);
  assert.match(SQL, /pin_y\s+numeric\(5, 4\) check \(pin_y is null or \(pin_y >= 0 and pin_y <= 1\)\)/);
  assert.match(SQL, /constraint comment_pin_whole check \(\(pin_x is null\) = \(pin_y is null\)\)/);
  assert.match(SQL, /constraint comment_pin_on_file check \(pin_x is null or file_id is not null\)/);
  assert.match(SQL, /coalesce\(max\(c\.pin_no\), 0\) \+ 1/);
  assert.equal(R.MAX_BODY, 2000);
  assert.match(SQL, new RegExp(`h\\.ip_hash = p_ip_hash and h\\.at > now\\(\\) - interval '${R.RATE.ip.seconds / 60} minutes'\\) >= ${R.RATE.ip.n}`));
  assert.match(SQL, new RegExp(`h\\.at > now\\(\\) - interval '${R.RATE.token.seconds / 3600} hour'\\) >= ${R.RATE.token.n}`));
  // the rate table holds a hash, never an address, and nobody signed in can read it
  assert.match(SQL, /ip_hash\s+text not null/);
  assert.doesNotMatch(SQL, /grant [^;]*arch\.comment_hit[^;]* to (authenticated|anon)/);
  // additive: nothing is dropped except its own triggers, and it is not applied from here
  assert.doesNotMatch(SQL, /^\s*drop (table|column|policy|schema|function)\b/im);
  assert.match(SQL, /NOT APPLIED/);
});

test('migration: no client names, addresses, coordinates or real files appear in the repo files of this change', () => {
  for (const f of ['supabase/migrations/20261123220000_arch_comments.sql', 'architecture/js/comments-rules.js', 'architecture/js/comments.js', 'functions/api/arch-comments.js']) {
    assert.doesNotMatch(read(f), /\b-?\d{2}\.\d{4,}\s*,\s*-?\d{2,3}\.\d{4,}\b/, `${f} holds no coordinates`);
  }
});

// ---- the rules -------------------------------------------------------------------------------------------------------------
test('plain text: control and direction characters go, ends are trimmed, the cap is 2,000 characters', () => {
  assert.deepEqual(R.cleanBody('  Hello\u0000 there‮ \r\n\r\n\r\n\r\nbye  '), { ok: true, text: 'Hello there\n\nbye', why: '' });
  assert.equal(R.cleanBody('   \n ').ok, false);
  assert.equal(R.cleanBody(null).ok, false);
  const ok = R.cleanBody('x'.repeat(2000)); assert.equal(ok.ok, true);
  const over = R.cleanBody('x'.repeat(2001)); assert.equal(over.ok, false); assert.equal(over.over, true); assert.equal(Array.from(over.text).length, 2000);
  assert.equal(R.cleanBody('😀'.repeat(2000)).ok, true, 'characters are counted, not UTF-16 halves');
  assert.equal(R.cleanName('  Ana\u0000   Smith  ').text, 'Ana Smith');
  assert.equal(R.cleanName('n'.repeat(90)).text.length, 60);
  assert.equal(R.cleanName('   ').ok, false);
});

test('escaping: a comment is text. Markup is escaped and a link is never clickable', () => {
  const people = [{ user_id: 'u1', name: 'Tui Rangi', email: 'tui@example.test' }];
  const html = R.bodyHtml('<img src=x onerror=alert(1)> see https://evil.example/path?a=1&b=2 and www.evil.example, javascript:alert(1) "quoted" @Tui @Nobody\nnext line', people);
  assert.doesNotMatch(html, /<img|<script|<a[\s>]|href=|onerror=alert\(1\)>/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /<span class="cm-url">https:\/\/evil\.example\/path\?a=1&amp;b=2<\/span>/);
  assert.match(html, /<span class="cm-url">www\.evil\.example,?<\/span>/);
  assert.match(html, /<span class="cm-at">@Tui<\/span>/);
  assert.doesNotMatch(html, /cm-at">@Nobody/, 'a name that is not a member is plain text');
  assert.match(html, /<br>next line/);
  assert.match(html, /&quot;quoted&quot;/);
  // every page that shows a comment goes through bodyHtml; none writes the body into the page by hand
  for (const f of ['architecture/js/comments.js', 'architecture/share/share-comments.js']) {
    const src = read(f);
    assert.match(src, /bodyHtml\(c\.body/, `${f} shows the words through bodyHtml`);
    assert.doesNotMatch(src, /\$\{c\.body\}/, `${f} never puts the raw body in the page`);
    assert.doesNotMatch(src, /<a [^>]*href=["']?\$\{[^}]*body/, `${f} never makes the body a link`);
  }
});

test('pins: a point is two fractions of the picture, four places, kept inside it', () => {
  assert.deepEqual(R.pinOf(0.123456, 0.5), { x: 0.1235, y: 0.5 });
  assert.deepEqual(R.pinOf(-1, 7), { x: 0, y: 1 });
  assert.equal(R.pinOf('a', 0.5), null);
  assert.equal(R.pinOf(null, 0.5), null);
  assert.equal(R.pinOf('', 0.5), null);
  // a click on a picture 400 wide and 200 high at (100, 50): the centre is 0.5, 0.5
  const rect = { left: 100, top: 50, width: 400, height: 200 };
  assert.deepEqual(R.pinFromPoint(300, 150, rect), { x: 0.5, y: 0.5 });
  assert.deepEqual(R.pinFromPoint(100, 50, rect), { x: 0, y: 0 });
  assert.deepEqual(R.pinFromPoint(500, 250, rect), { x: 1, y: 1 });
  assert.deepEqual(R.pinFromPoint(900, -40, rect), { x: 1, y: 0 }, 'a click on the pin layer beyond the edge is kept on the picture');
  assert.equal(R.pinFromPoint(5, 5, { left: 0, top: 0, width: 0, height: 0 }), null);
  assert.equal(R.pinStyle({ x: 0.25, y: 0.9 }), 'left:25.00%;top:90.00%');
});

test('pins: each keeps its number; ones with none are numbered after the numbered, in the order made', () => {
  const c = (id, file, pin_no, at) => ({ id, file_id: file, pin: { x: 0.1, y: 0.1 }, pin_no, created_at: at });
  const n = R.pinNumbers([c('a', 'f1', 1, '2026-11-23T01:00'), c('b', 'f1', 3, '2026-11-23T02:00'), c('c', 'f1', null, '2026-11-23T03:00'), c('d', 'f2', null, '2026-11-23T01:30'), { id: 'e', file_id: 'f1', pin: null, created_at: 'x' }]);
  assert.deepEqual(n, { a: 1, b: 3, c: 4, d: 1 });
  assert.equal(R.nextPinNo([c('a', 'f1', 2, 'x'), c('b', 'f2', 9, 'x')], 'f1'), 3);
  assert.equal(R.nextPinNo([], 'f1'), 1);
  assert.equal(R.targetOf({ pin: { x: 0, y: 0 }, file_id: 'f' }), 'pin');
  assert.equal(R.targetOf({ file_id: 'f' }), 'file');
  assert.equal(R.targetOf({}), 'project');
});

test('@mentions: first names, first.last when two share one; only members are mentioned', () => {
  const people = [{ user_id: 'u1', name: 'Tui Rangi', email: 'a@example.test' }, { user_id: 'u2', name: 'Hana Smith', email: 'b@example.test' }, { user_id: 'u3', name: 'Hana Jones', email: 'c@example.test' }, { user_id: 'u4', name: '', email: 'moa@example.test' }];
  assert.deepEqual(R.handles(people), { u1: 'Tui', u2: 'Hana.Smith', u3: 'Hana.Jones', u4: 'moa' });
  assert.deepEqual(R.mentionsIn('@tui and @Hana.Smith, @moa. @Hana and @ghost', people), ['u1', 'u2', 'u4']);
  assert.deepEqual(R.mentionQuery('look @Tu', 8), { start: 5, query: 'Tu' });
  assert.equal(R.mentionQuery('mail a@b', 8), null, 'an address is not a mention');
  assert.deepEqual(R.mentionChoices(people, 'ha').map((p) => p.handle), ['Hana.Smith', 'Hana.Jones']);
  const mq = R.mentionQuery('look @Tu', 8);
  assert.deepEqual(R.insertMention('look @Tu', mq, 8, 'Tui'), { text: 'look @Tui ', caret: 10 });
});

test('rate limit: 8 in ten minutes for one address on one link, 40 in an hour for a link, then the wait is said', () => {
  const now = 1_000_000_000_000, hit = (i, at, token = 't1', ip = 'ip1') => ({ token, ip, at: now - at * 1000 });
  const eight = Array.from({ length: 8 }, (_, i) => hit(i, 100 + i * 10));
  assert.equal(R.rateDecision(eight.slice(0, 7), { token: 't1', ip: 'ip1', now }).ok, true);
  const d = R.rateDecision(eight, { token: 't1', ip: 'ip1', now });
  assert.equal(d.ok, false);
  assert.equal(d.retry, 600 - 170, 'the oldest of the window drops out after that many seconds');
  assert.equal(R.rateDecision(eight, { token: 't1', ip: 'ip2', now }).ok, true, 'another address is counted on its own');
  assert.equal(R.rateDecision(eight, { token: 't2', ip: 'ip1', now }).ok, true, 'another link is counted on its own');
  assert.equal(R.rateDecision(eight.map((h) => ({ ...h, at: now - 700_000 })), { token: 't1', ip: 'ip1', now }).ok, true, 'after ten minutes it is open again');
  const forty = Array.from({ length: 40 }, (_, i) => hit(i, 700 + i, 't1', `ip${i}`));
  assert.equal(R.rateDecision(forty, { token: 't1', ip: 'new', now }).ok, false, 'forty from many addresses stops the link');
  assert.equal(R.rateDecision(forty, { token: 't1', ip: 'new', now: now + 3_600_000 }).ok, true);
});

// ---- the stores ------------------------------------------------------------------------------------------------------------
test('local comments: kept in this browser, pins numbered per file, hide and delete, and what a client preview sees', async () => {
  const backend = memoryBackend(), place = createLocalComments(backend, { now: (() => { let n = 0; return () => `2026-11-23T00:00:${String(n++).padStart(2, '0')}Z`; })() });
  const base = { project_id: 'sample', author_name: 'Hana', body: 'Hello <b>there</b>' };
  const a = await place.add({ ...base, file_id: 'f1', pin: { x: 0.2, y: 0.4 } });
  const b = await place.add({ ...base, file_id: 'f1', pin: { x: 0.8, y: 0.1 }, to_client: true });
  const c = await place.add({ ...base, file_id: 'f2', pin: { x: 0.5, y: 0.5 } });
  const proj = await place.add({ ...base, body: 'note for the project' });
  assert.deepEqual([a.pin_no, b.pin_no, c.pin_no, proj.pin_no], [1, 2, 1, null]);
  assert.equal(a.body, 'Hello <b>there</b>', 'stored as typed text; it is escaped when shown');
  assert.ok(backend.getItem(KEY), 'in the browser store');
  assert.equal((await place.list('sample')).length, 4);
  assert.equal((await place.list('other')).length, 0);
  assert.deepEqual((await place.forClient('sample')).map((x) => x.id), [b.id], 'only what is marked for the client');
  await place.setHidden(b.id, true);
  assert.equal((await place.forClient('sample')).length, 0, 'hidden is gone from the client preview');
  assert.equal((await place.list('sample')).find((x) => x.id === b.id).hidden, true, 'the owner still sees it, hidden');
  assert.equal(await place.remove(a.id), true); assert.equal(await place.remove(a.id), false);
  await assert.rejects(() => place.add({ ...base, pin: { x: 0.1, y: 0.1 } }), /needs a picture/);
  await assert.rejects(() => place.add({ ...base, file_id: 'f', pin: { x: 'a', y: 1 } }), /not on the picture/);
  await assert.rejects(() => place.add({ ...base, body: 'x'.repeat(2001) }), /2,000 characters/);
  await assert.rejects(() => place.add({ ...base, author_name: ' ' }), /name/);
  // a client preview comment is always for the client and has no author id
  const cl = await place.add({ ...base, author_kind: 'client', to_client: false });
  assert.equal(cl.to_client, true); assert.equal(cl.author_id, null); assert.equal(cl.author_kind, 'client');
});

test('shared comments: member comments go to the practice with their own id; only an owner hides or deletes; a viewer is refused', async () => {
  const fake = fakeSupabase();
  const gw = createGateway(fake);
  const people = [{ user_id: fake.userId, name: 'Tui Rangi', email: 't@example.test' }, { user_id: 'u2', name: 'Hana Smith', email: 'h@example.test' }];
  const team = { people: async () => people };
  const owner = createSharedComments(gw, { id: PRACTICE, role: 'owner' }, { id: fake.userId }, team);
  const member = createSharedComments(gw, { id: PRACTICE, role: 'member' }, { id: fake.userId }, team);
  const pid = '22222222-2222-4222-8222-222222222222', fid = '33333333-3333-4333-8333-333333333333';
  const c = await member.add({ project_id: pid, file_id: fid, pin: { x: 0.3, y: 0.6 }, author_name: 'Tui', body: 'Check this @Hana please', to_client: false });
  const sent = fake.writes()[0];
  assert.equal(sent.table, 'comment'); assert.equal(sent.action, 'insert');
  const row = sent.rows[0];
  assert.equal(row.practice_id, PRACTICE); assert.equal(row.author_kind, 'member'); assert.equal(row.author_id, fake.userId);
  assert.deepEqual(row.mentions, ['u2']); assert.equal(row.pin_x, 0.3); assert.equal(row.project_id, pid);
  assert.ok(!('hidden' in row) && !('via_token_hash' in row), 'a member cannot set what only the server sets');
  assert.equal((await member.list(pid)).length, 1);
  assert.deepEqual((await member.list(pid))[0].pin, { x: 0.3, y: 0.6 });
  // a member cannot hide or delete: refused before it is asked of the database, and the database refuses too
  const before = fake.writes().length;
  await assert.rejects(() => member.setHidden(c.id, true), /Only an owner/);
  await assert.rejects(() => member.remove(c.id), /Only an owner/);
  assert.equal(fake.writes().length, before, 'nothing was sent');
  assert.equal(member.canModerate, false); assert.equal(owner.canModerate, true);
  assert.equal((await owner.setHidden(c.id, true)).hidden, true);
  assert.deepEqual(fake.writes().at(-1).rows[0], { hidden: true }, 'hiding sends only that');
  assert.equal(await owner.remove(c.id), true);
  fake.viewer = true;
  await assert.rejects(() => member.add({ project_id: pid, author_name: 'V', body: 'hi' }));
});

// ---- the server ------------------------------------------------------------------------------------------------------------
const STILL = { id: 's1', name: 'front.jpg', type: 'image/jpeg', size: 10, owner_kind: 'source', owner_id: 'p', kept_at: '2026-11-22T00:00:00Z', extra: { source: { slot: 'films', version: 1 } }, path: 'pr/p/s1' };
const FILM = { id: 'f1', name: 'walk.mp4', type: 'video/mp4', size: 10, owner_kind: 'source', owner_id: 'p', kept_at: '2026-11-22T00:00:01Z', extra: { source: { slot: 'films', version: 1 } }, path: 'pr/p/f1' };
const SITE = { id: 'x1', name: 'site.pdf', type: 'application/pdf', size: 10, owner_kind: 'source', owner_id: 'p', kept_at: '2026-11-22T00:00:02Z', extra: { source: { slot: 'site_plan', version: 1 } }, path: 'pr/p/x1' };
const UID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sharedData = () => ({ project: { id: 'p', name: 'Sample house' }, practice: { name: 'Sample practice' }, files: [{ ...STILL, id: UID(1) }, { ...FILM, id: UID(2) }, { ...SITE, id: UID(3) }], documents: [] });

function serverWorld({ on = true, add = null } = {}) {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const name = String(url).split('/rpc/')[1];
    const args = init?.body ? JSON.parse(init.body) : {};
    calls.push({ name, args });
    const answer = (status, body) => new Response(JSON.stringify(body), { status });
    if (name === 'shared_project') return answer(200, on && args.p_token === TOKEN ? sharedData() : null);
    if (name === 'client_comments') return answer(200, on && args.p_token === TOKEN ? { project_id: 'p', comments: [{ id: 'c1', file_id: null, pin_x: null, pin_y: null, pin_no: null, from: 'client', by: 'Ana', body: 'Lovely', at: '2026-11-23T00:00:00Z' }] } : null);
    if (name === 'client_comment_add') return add ? add(args) : answer(200, { id: 'c2', file_id: args.p_file, pin_x: args.p_pin_x, pin_y: args.p_pin_y, pin_no: args.p_pin_x == null ? null : 1, from: 'client', by: args.p_name, body: args.p_body, at: '2026-11-23T00:00:01Z' });
    return answer(500, {});
  };
  return { calls, done: () => { globalThis.fetch = real; } };
}
const post = (api, body, { env = { ARCH_SHARE_SERVICE_KEY: 'test-only' }, headers = {}, ip = '203.0.113.9' } = {}) => api.onRequestPost({ request: new Request('https://lab.assembl.co.nz/api/arch-comments', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }), env });
const get = (api, t, env = { ARCH_SHARE_SERVICE_KEY: 'test-only' }) => api.onRequestGet({ request: new Request(`https://lab.assembl.co.nz/api/arch-comments?t=${t}`), env });

test('server: reading needs a link that is on; a wrong, malformed or turned-off token gets the same 404', async () => {
  const api = await import('../../functions/api/arch-comments.js');
  assert.equal((await get(api, 'nope')).status, 404);
  assert.equal((await get(api, TOKEN, {})).status, 503, 'no server key: not switched on');
  const w = serverWorld();
  try {
    const r = await get(api, TOKEN), d = await r.json();
    assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.deepEqual(d.comments.map((c) => [c.by, c.body, c.from]), [['Ana', 'Lovely', 'client']]);
    assert.equal((await get(api, 'b'.repeat(64))).status, 404, 'an unknown token');
  } finally { w.done(); }
  const off = serverWorld({ on: false });
  try { assert.equal((await get(api, TOKEN)).status, 404, 'the link was turned off: reading stops'); } finally { off.done(); }
});

test('server: a link turned off rejects a comment at once and writes nothing', async () => {
  const api = await import('../../functions/api/arch-comments.js'); api._forget();
  const w = serverWorld({ on: false });
  try {
    const r = await post(api, { t: TOKEN, name: 'Ana', body: 'Still there?' });
    assert.equal(r.status, 404); assert.deepEqual(await r.json(), { error: 'not_shared' });
    assert.ok(!w.calls.some((c) => c.name === 'client_comment_add'), 'the write function was never called');
    assert.equal((await post(api, { t: 'short', name: 'Ana', body: 'x' })).status, 404);
  } finally { w.done(); }
});

test('server: a comment is cleaned, tied to the token, and may name only what the page shows', async () => {
  const api = await import('../../functions/api/arch-comments.js'); api._forget();
  const w = serverWorld();
  try {
    const ok = await post(api, { t: TOKEN, name: '  Ana\u0000 Client ', body: ' Love the <b>kitchen</b>‮ \r\n\r\n\r\n\r\nthanks ', file_id: UID(1), pin: { x: 0.25, y: 1.4 } });
    const d = await ok.json();
    assert.equal(ok.status, 201);
    const sent = w.calls.find((c) => c.name === 'client_comment_add').args;
    assert.equal(sent.p_token, TOKEN); assert.equal(sent.p_name, 'Ana Client'); assert.equal(sent.p_body, 'Love the <b>kitchen</b>\n\nthanks');
    assert.deepEqual([sent.p_file, sent.p_pin_x, sent.p_pin_y], [UID(1), 0.25, 1], 'a pin is kept on the picture');
    assert.equal(d.comment.from, 'client'); assert.equal(d.comment.pin_no, 1);
    assert.match(sent.p_ip_hash, /^[a-f0-9]{32}$/); assert.ok(!JSON.stringify(sent).includes('203.0.113.9'), 'the address itself is never sent on');
    // the film: a comment yes, a pin no
    assert.equal((await post(api, { t: TOKEN, name: 'Ana', body: 'nice', file_id: UID(2) })).status, 201);
    const pinFilm = await post(api, { t: TOKEN, name: 'Ana', body: 'nice', file_id: UID(2), pin: { x: 0.5, y: 0.5 } });
    assert.equal(pinFilm.status, 400);
    // a site plan is not on the page: no comments on it, and a made-up id is no good either
    assert.equal((await post(api, { t: TOKEN, name: 'Ana', body: 'what is this', file_id: UID(3) })).status, 400);
    assert.equal((await post(api, { t: TOKEN, name: 'Ana', body: 'x', file_id: UID(9) })).status, 400);
    assert.equal((await post(api, { t: TOKEN, name: 'Ana', body: 'x', file_id: 'not-a-uuid' })).status, 400);
    assert.equal((await post(api, { t: TOKEN, name: 'Ana', body: 'x', pin: { x: 0.1, y: 0.1 } })).status, 400, 'a pin needs a picture');
    assert.equal((await post(api, { t: TOKEN, name: 'Ana', body: 'x', file_id: UID(1), pin: { x: 'a', y: 1 } })).status, 400);
    // length, name, shape
    assert.equal((await post(api, { t: TOKEN, name: 'Ana', body: 'x'.repeat(2001) })).status, 400);
    assert.equal((await post(api, { t: TOKEN, name: '   ', body: 'x' })).status, 400);
    assert.equal((await post(api, { t: TOKEN, name: 'Ana', body: '   ' })).status, 400);
    assert.equal((await post(api, '[1,2]')).status, 400);
    assert.equal((await post(api, 'not json')).status, 400);
    assert.equal((await post(api, 'x'.repeat(9000))).status, 413);
  } finally { w.done(); }
});

test('server: another site cannot post, GET and POST only, and no key means not switched on', async () => {
  const api = await import('../../functions/api/arch-comments.js'); api._forget();
  const w = serverWorld();
  try {
    assert.equal((await post(api, { t: TOKEN, name: 'Ana', body: 'hi' }, { headers: { origin: 'https://other.example' } })).status, 403);
    assert.equal((await post(api, { t: TOKEN, name: 'Ana', body: 'hi' }, { headers: { origin: 'https://lab.assembl.co.nz' } })).status, 201);
    assert.equal((await post(api, { t: TOKEN, name: 'Ana', body: 'hi' }, { env: {} })).status, 503);
    const other = await api.onRequest({ request: new Request('https://lab.assembl.co.nz/api/arch-comments', { method: 'DELETE' }) });
    assert.equal(other.status, 405); assert.equal(other.headers.get('allow'), 'GET, POST');
  } finally { w.done(); }
});

test('server: the rate limit stops the ninth comment from one address on one link (429 with a wait), and the database can stop it too', async () => {
  const api = await import('../../functions/api/arch-comments.js'); api._forget();
  const w = serverWorld();
  try {
    for (let i = 0; i < 8; i++) assert.equal((await post(api, { t: TOKEN, name: 'Ana', body: `n${i}` })).status, 201);
    const r = await post(api, { t: TOKEN, name: 'Ana', body: 'one more' });
    assert.equal(r.status, 429); assert.ok(Number(r.headers.get('retry-after')) >= 1); assert.equal((await r.json()).error, 'rate_limited');
    assert.equal(w.calls.filter((c) => c.name === 'client_comment_add').length, 8, 'the ninth never reached the database');
    assert.equal((await post(api, { t: TOKEN, name: 'Ben', body: 'hello' }, { ip: '198.51.100.7' })).status, 201, 'another address is counted on its own');
  } finally { w.done(); }
  api._forget();
  // the database's own answer, from another server instance, is also a 429; its other answers map to plain ones
  for (const [message, status] of [['rate_limited', 429], ['not_shared', 404], ['bad_comment', 400]]) {
    const dbw = serverWorld({ add: () => new Response(JSON.stringify({ code: 'P0001', message }), { status: 400 }) });
    try { assert.equal((await post(api, { t: TOKEN, name: 'Ana', body: 'x' })).status, status, message); } finally { dbw.done(); }
  }
  // the migration is not applied: not switched on, not an error page
  const missing = serverWorld({ add: () => new Response(JSON.stringify({ code: 'PGRST202', message: 'Could not find the function' }), { status: 404 }) });
  try { assert.equal((await post(api, { t: TOKEN, name: 'Ana', body: 'x' })).status, 503); } finally { missing.done(); }
});

test('the share API gives each file its id, so a comment can name it', async () => {
  const api = await import('../../functions/api/arch-share.js');
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('/rpc/shared_project')) return new Response(JSON.stringify(sharedData()), { status: 200 });
    if (String(url).includes('/object/sign/')) { const { paths } = JSON.parse(init.body); return new Response(JSON.stringify(paths.map((p) => ({ path: p, signedURL: `/object/sign/arch-files/${p}?token=x` }))), { status: 200 }); }
    return new Response('', { status: 500 });
  };
  try {
    const d = await (await api.onRequestGet({ request: new Request(`https://lab.assembl.co.nz/api/arch-share?t=${TOKEN}`), env: { ARCH_SHARE_SERVICE_KEY: 'test-only' } })).json();
    assert.equal(d.stills[0].file.id, UID(1)); assert.equal(d.films[0].file.id, UID(2));
    assert.ok(!JSON.stringify(d).includes(UID(3)), 'the site plan is still never offered');
  } finally { globalThis.fetch = real; }
});

// ---- the client page's source, and the wiring ------------------------------------------------------------------------------
test('client page: a turned-off link says comments are closed; a preview keeps comments in this browser only', async () => {
  const { commentSource } = await import('../../architecture/share/share-comments.js');
  const res = (status, body) => ({ ok: status < 400, status, json: async () => body });
  const off = commentSource({ token: TOKEN, fetcher: async () => res(404, { error: 'not_shared' }) });
  await assert.rejects(() => off.list(), /not on any more/);
  await assert.rejects(() => off.add({ name: 'Ana', body: 'hi' }), /not on any more/);
  const busy = commentSource({ token: TOKEN, fetcher: async () => res(429, { error: 'rate_limited' }) });
  await assert.rejects(() => busy.add({ name: 'Ana', body: 'hi' }), /few minutes/);
  let sent;
  const live = commentSource({ token: TOKEN, fetcher: async (url, init) => { sent = { url, init }; return res(201, { comment: { id: 'c', by: 'Ana', body: 'hi', from: 'client', at: 'x', file_id: null, pin: null } }); } });
  assert.equal((await live.add({ name: 'Ana', body: 'hi' })).by, 'Ana');
  assert.equal(sent.url, '/api/arch-comments'); assert.equal(sent.init.method, 'POST'); assert.equal(sent.init.referrerPolicy, 'no-referrer');
  assert.equal(JSON.parse(sent.init.body).t, TOKEN);
  // a preview from this browser
  const backend = memoryBackend();
  const sample = commentSource({ token: TOKEN, pid: 'sample', backend });
  assert.equal(sample.local, true);
  await sample.add({ name: 'Ana', body: 'from the preview', file_id: 's1', pin: { x: 0.5, y: 0.5 } });
  const mine = await sample.list();
  assert.deepEqual(mine.map((c) => [c.by, c.from, c.pin_no]), [['Ana', 'client', 1]]);
  assert.ok(backend.getItem(KEY).includes('from the preview'));
});

test('wiring: the add-on loads, the Team tab and the rail are there, the client page loads its comments and stylesheet', () => {
  assert.ok(ADDONS.includes('./comments.js'));
  const lib = read('architecture/js/file-library.js'), team = read('architecture/js/comments.js'), share = read('architecture/share/share.js'), page = read('architecture/share/index.html');
  assert.match(lib, /mountRail\(dlg\.querySelector\('\[data-cm-rail\]'\), ctx, \{ item: it \}\)/);
  assert.match(lib, /rail\.then\(\(r\) => r\?\.stage\(host\)\)/);
  assert.match(team, /registerProjectTab\(\{ id: 'team', label: 'Team'/);
  assert.match(share, /commentsFor\(d\)/); assert.match(share, /data-act="cm-film"/); assert.match(share, /data-act="cm-still"/);
  assert.match(page, /\.\.\/comments\.css/);
  assert.match(read('architecture/js/account.js'), /commentsPlace: \(\) =>/);
});

test('draftOf: a client draft can never mention or hide; a member draft carries only members as mentions', () => {
  const people = [{ user_id: 'u1', name: 'Tui', email: 't@example.test' }];
  const d = draftOf({ project_id: 'p', author_kind: 'client', author_name: 'Ana', body: 'hi @Tui', to_client: false }, { people });
  assert.deepEqual(d.mentions, []); assert.equal(d.to_client, true);
  const m = draftOf({ project_id: 'p', author_name: 'Hana', body: 'hi @Tui @Nobody' }, { people });
  assert.deepEqual(m.mentions, ['u1']); assert.equal(m.to_client, false);
});
