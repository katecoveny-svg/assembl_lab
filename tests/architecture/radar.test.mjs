// "Look ahead with Radar" on Found work: the company profile (built the way the function's sellerProfileSchema checks it), the mission's bounds,
// the cost words, the confirm gate (nothing paid is sent without it), status and error handling, past runs, opportunities as cards in the lane,
// and the hand-off to the pipeline. Stand-ins only: a mocked Radar function and the repo's fake Supabase. No network and NO real run is ever paid for.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore, memoryBackend, memoryFiles } from '../../architecture/js/store.js';
import { createSwitch } from '../../architecture/js/cloud.js';
import { mountAccount } from '../../architecture/js/account.js';
import { sampleProject } from '../../architecture/js/model.js';
import { AUTH_STORAGE_KEY } from '../../architecture/js/config.js';
import { fakeSupabase } from './fake-supabase.mjs';
import { createHunt } from '../../architecture/js/hunt.js';
import { cleanHunt, cleanEarlySignal, SECTORS, enquiryFromSignal } from '../../architecture/js/hunt-model.js';
import { createRadarClient, FUNCTION_NAME } from '../../architecture/js/radar-client.js';
import {
  RADAR_FOCUS, LIMITS, RUN_WARNING, COST_NOTE, MAX_KEPT, buildProfile, draftFromWorkspace, draftFromProfile, sameDescription, missionTemplates, checkMission, runRequest, readStatus, explainRadarError,
  cleanOpportunity, cleanRun, cardFromOpportunity, cardsFromRun, radarForEnquiry, readProfileRow, newUuid, okUrl, emptyDraft,
} from '../../architecture/js/radar-model.js';

const NOW = new Date('2026-11-22T00:00:00Z');
const ME = '00000000-0000-4000-8000-00000000a11c', OTHER = '00000000-0000-4000-8000-0000000000b2', PRACTICE = '11111111-1111-4111-8111-111111111111';
const PROFILE_ID = '22222222-2222-4222-8222-222222222222', RUN_A = '33333333-3333-4333-8333-333333333333', RUN_B = '44444444-4444-4444-8444-444444444444';
const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms));
const SET = { keywords: ['library', 'hall'], regions: ['Waikato'], sectors: ['education', 'kaupapa'], min: null, max: null, sources: { radar: true, gets: false }, cultural: true };

// ---- an opportunity as the function returns it (radarOpportunitySchema), and a run ------------------------------------------------------------------
const evidence = (o = {}) => ({ claim: 'The plan names a new hall', sourceUrl: 'https://www.beehive.govt.nz/release/a-new-hall', sourceTitle: 'Beehive release', publishedAt: '2026-10-01', verified: true, ...o });
const opp = (o = {}) => ({
  id: 'opp-1', accountName: 'Sample District Council', signalType: 'funding', headline: 'Funding named for a new community hall', whatChanged: 'A funding round was announced for community halls.',
  whyItMayMatter: 'A hall may need a design practice before the end of next year.', assemblOutcome: 'A feasibility and concept design for the hall.', demoIdea: 'A walk-through of the hall site.',
  buyerRoles: ['Property manager'], evidence: [evidence(), evidence({ sourceUrl: 'https://example.org/page', sourceTitle: 'Council plan', verified: false, caveat: 'Search did not return this exact link.' })],
  unknowns: ['Whether design work will be tendered'], score: { serviceFit: 70, evidenceStrength: 60, timing: 50, buyerAccess: 40, total: 61 }, stage: 'signal', nextAction: 'Read the council plan.', reviewAt: '2027-01-15', ...o,
});
const run = (o = {}, opps = [opp()]) => ({ runId: RUN_A, generatedAt: '2026-11-21T20:00:00.000Z', mission: 'Find early signs of design work in Waikato.', seller: { id: PROFILE_ID, name: 'Tui Architects' }, opportunities: opps, ...o });

// ---- the stand-ins -------------------------------------------------------------------------------------------------------------------------------
/** a Radar client that never reaches anything: it records every call, and `answers` decides what comes back */
function mockClient({ status = { ready: true, missing: [], unknown: false }, runs = [], profile = null, runImpl = null, statusError = null } = {}) {
  const calls = [], store = { runs: [...runs], profile };
  return {
    calls, store,
    async status() { calls.push(['status']); if (statusError) throw new Error(statusError); return status; },
    async run(a) { calls.push(['run', a]); if (runImpl) return runImpl(a, store); const r = cleanRun(run({ runId: a.runId, mission: a.mission })); store.runs.unshift(r); return r; },
    async getProfile() { calls.push(['getProfile']); return store.profile; },
    async saveProfile(p, { isNew }) { calls.push(['saveProfile', p, isNew]); store.profile = { id: p.id, profile: p, updatedAt: NOW.toISOString() }; return p; },
    async listRuns() { calls.push(['listRuns']); return [...store.runs]; },
  };
}
const approvedRow = () => { const d = draftFromWorkspace({ practice: { name: 'Tui Architects' }, hunt: SET, sectorLabels: SECTORS }); d.approved = true; const p = buildProfile(d, { id: PROFILE_ID, canApprove: true }); return { id: PROFILE_ID, profile: p, updatedAt: '2026-11-20T00:00:00Z' }; };
const el = (dataset = {}, extra = {}) => ({ dataset, ...extra });
const hit = (act, extra = {}) => ({ target: { closest: (sel) => (sel === '[data-radar]' ? el({ radar: act, ...extra }) : null) }, preventDefault() {} });
const hunthit = (act, id) => ({ target: { closest: (sel) => (sel === '[data-hunt]' ? el({ hunt: act, id }) : null) }, preventDefault() {} });
const typed = (attr, key, props) => ({ target: { closest: (sel) => (sel === `[${attr}]` ? { dataset: { [key]: props.k }, ...props } : null) } });
const typeField = (name, value) => typed('data-radar-f', 'radarF', { k: name, value });

async function signedIn({ role = 'owner', rpc = {} } = {}) {
  const fake = fakeSupabase({ userId: ME, rpc: { my_invitations: () => [], practice_people: () => [], hunt_signals: () => [], hunt_leads: () => [], ...rpc } });
  fake.db.practice = [{ id: PRACTICE, name: 'Tui Architects', created_by: ME, extra: { hunt: cleanHunt(SET) } }];
  fake.db.practice_member = [{ practice_id: PRACTICE, user_id: ME, role }];
  fake.db.hunt_inbox = []; fake.db.pursuit_seller_profiles = []; fake.db.pursuit_radar_runs = [];
  const session = { access_token: 'test.session.token', user: { id: ME, email: 'mere@example.org', user_metadata: { full_name: 'Mere Ngata' } } };
  fake.auth = { getSession: async () => ({ data: { session }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), refreshSession: async () => ({ data: { session: null }, error: { message: 'x' } }), signOut: async () => ({ error: null }) };
  const mem = new Map([[AUTH_STORAGE_KEY, 'kept'], ['assembl.architecture.practice', PRACTICE]]);
  const win = { location: { href: 'https://lab.assembl.co.nz/architecture/', hash: '' }, history: { state: null, replaceState() {} }, localStorage: { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, String(v)), removeItem: (k) => void mem.delete(k) }, addEventListener() {}, removeEventListener() {}, open() {} };
  const e = () => ({ innerHTML: '', hidden: false, listeners: {}, addEventListener(t, fn) { this.listeners[t] = fn; } });
  const local = createStore(memoryBackend(), { files: memoryFiles() }), store = createSwitch(local);
  await local.saveProject(sampleProject());
  const account = mountAccount({ store, local, slot: e(), panel: e(), nameLabel: e(), win, loadClient: async () => ({ createClient: () => fake }) });
  await account.ready;
  for (let i = 0; i < 40 && account.state.phase !== 'in'; i++) await tick(5);
  await tick();
  return { account, fake, store };
}
function screen(p, radarClient, { practice = p.account.state.practice, readOnly = false } = {}) {
  const log = { draws: 0, added: [] }, state = { enquiries: [] }, ctx = { store: p.store, me: 'Mere', practice, account: p.account };
  const reload = async () => { state.enquiries = await ctx.store.list('enquiry'); };
  const h = createHunt(ctx, { radarClient, readOnly, enquiries: () => state.enquiries, redraw: () => { log.draws++; }, added: async (t) => { log.added.push(t); await reload(); }, fetch: async () => ({ ok: true, status: 200, json: async () => ({}) }), now: () => NOW });
  return { h, log, state, ctx };
}
const open = async (s) => { await s.h.click(hit('toggle')); await tick(); };

// =================================================================================================================================================
test('the profile is built to the function\'s own rules: strict keys, the id the table needs, limits, focus "other", and only an owner\'s tick approves', () => {
  const d = { name: ' Tui Architects ', website: 'https://example.org', offering: 'An architecture practice. Sectors: Education.', targetCustomers: '', voice: '', approved: true, evidence: [{ id: 'ev-1', title: 'A hall', body: 'Our own words.', approved: true }, { id: 'ev-2', title: '', body: '', approved: false }] };
  const p = buildProfile(d, { id: PROFILE_ID, canApprove: true });
  assert.deepEqual(Object.keys(p).sort(), ['approved', 'evidence', 'focus', 'id', 'name', 'offering', 'targetCustomers', 'voice', 'website']);
  assert.deepEqual(Object.keys(p.evidence[0]).sort(), ['approved', 'body', 'id', 'title']); assert.equal(p.evidence.length, 1, 'an empty evidence row is dropped'); assert.equal(p.name, 'Tui Architects'); assert.equal(p.id, PROFILE_ID);
  assert.equal(p.approved, true); assert.equal(buildProfile(d, { id: PROFILE_ID, canApprove: false }).approved, false, 'a member cannot approve, whatever the draft says');
  assert.equal(RADAR_FOCUS, 'other'); assert.equal(p.focus, 'other'); assert.ok(['technology', 'construction', 'agency', 'other'].includes(p.focus));
  const bad = (patch, re) => assert.throws(() => buildProfile({ ...d, ...patch }, { id: PROFILE_ID }), re);
  bad({ name: ' ' }, /name/); bad({ name: 'x'.repeat(101) }, /name is over 100/); bad({ offering: '' }, /what the practice offers/i); bad({ offering: 'x'.repeat(3001) }, /over 3000/);
  bad({ targetCustomers: 'x'.repeat(1801) }, /over 1800/); bad({ voice: 'x'.repeat(601) }, /over 600/);
  for (const w of ['javascript:alert(1)', 'ftp://example.org', 'https://user:pw@example.org', 'not a link', `https://example.org/${'a'.repeat(1500)}`]) bad({ website: w }, /website/);
  assert.equal(buildProfile({ ...d, website: 'http://example.org' }, { id: PROFILE_ID }).website, 'http://example.org'); assert.equal(buildProfile({ ...d, website: '' }, { id: PROFILE_ID }).website, '');
  bad({ evidence: Array.from({ length: 13 }, (_, i) => ({ id: `e${i}`, title: 't', body: 'b' })) }, /12 evidence/);
  bad({ evidence: [{ id: 'a', title: 'only a title', body: '' }] }, /own words/); bad({ evidence: [{ id: 'a', title: '', body: 'only words' }] }, /needs a title/);
  bad({ evidence: [{ id: 'a', title: 't', body: 'b' }, { id: 'a', title: 't2', body: 'b2' }] }, /repeated/); bad({ evidence: [{ id: 'a', title: 'x'.repeat(161), body: 'b' }] }, /title is over 160/);
  assert.throws(() => buildProfile(d, { id: 'not-a-uuid' }), /no valid number/);
  assert.equal(readProfileRow({ id: PROFILE_ID, profile: p })?.name, 'Tui Architects'); assert.equal(readProfileRow({ id: PROFILE_ID, profile: { ...p, id: 'other' } }), null, 'the table\'s own check: profile.id equals the row id');
  assert.equal(readProfileRow({ id: PROFILE_ID, profile: { ...p, name: '' } }), null, 'a row that would not pass is not trusted');
  assert.equal(okUrl('https://example.org'), true); assert.equal(okUrl('https://u@example.org'), false);
});

test('the first draft comes only from what the practice already has here, and never invents experience, awards, people or credentials', () => {
  const d = draftFromWorkspace({ practice: { name: 'Tui Architects' }, hunt: SET, sectorLabels: SECTORS });
  assert.equal(d.name, 'Tui Architects'); assert.match(d.offering, /^An architecture practice\./); assert.match(d.offering, /library, hall/); assert.match(d.offering, /Sectors: Education, Kaupapa Māori and Indigenous/); assert.match(d.offering, /Regions: Waikato/); assert.match(d.offering, /kaupapa Māori and Indigenous work/);
  assert.deepEqual(d.evidence, [], 'no evidence is made up'); assert.equal(d.approved, false, 'it is never pre-approved'); assert.equal(d.website, ''); assert.equal(d.voice, '');
  assert.doesNotMatch(JSON.stringify(d), /award|years of experience|registered|certified|team of|founded/i);
  const bare = draftFromWorkspace({ practice: { name: 'Tui Architects' }, hunt: null }); assert.equal(bare.offering, 'An architecture practice.'); assert.equal(bare.targetCustomers, '');
  assert.equal(draftFromWorkspace({ practice: { name: 'x'.repeat(300) }, hunt: null }).name.length, 100);
  assert.equal(sameDescription(d, { ...d, evidence: [] }), true); assert.equal(sameDescription(d, { ...d, offering: `${d.offering} More.` }), false);
  assert.equal(draftFromProfile({ ...buildProfile(d, { id: PROFILE_ID }), approved: true }).approved, true); assert.deepEqual(emptyDraft().evidence, []);
});

test('the mission: 10 to 4,000 characters, templates fill in the regions and stay within the bound, and the request has exactly three keys', () => {
  assert.equal(checkMission('x'.repeat(9)).ok, false); assert.equal(checkMission('x'.repeat(10)).ok, true); assert.equal(checkMission('x'.repeat(4000)).ok, true);
  assert.match(checkMission('x'.repeat(4001)).error, /1 characters over the 4,000 limit/); assert.equal(checkMission('   short   ').ok, false); assert.equal(checkMission(`  ${'x'.repeat(4000)}  `).ok, true, 'it is counted trimmed, as the function counts it');
  const t = missionTemplates({ regions: ['Waikato', 'Auckland'] });
  assert.deepEqual(t.map((x) => x.id), ['early', 'kaupapa', 'planned']);
  assert.match(t[0].text, /^Find early signs \(6–24 months ahead\) of architecture and design work for this practice in Waikato, Auckland, including kaupapa Māori and Indigenous work \(marae, papakāinga, kura, iwi and hapū facilities\), schools, health, housing and community buildings\. Prefer primary sources: Beehive, the Gazette, council plans and agendas, iwi and Te Puni Kōkiri announcements, GETS future procurement\.$/);
  assert.match(missionTemplates({})[0].text, /in New Zealand, including/);
  for (const x of t) assert.ok(checkMission(x.text).ok && x.text.length <= LIMITS.mission);
  const r = runRequest({ mission: ' Find early signs of work. ', sellerProfileId: PROFILE_ID, runId: RUN_A }); assert.deepEqual(Object.keys(r).sort(), ['mission', 'runId', 'sellerProfileId']); assert.equal(r.mission, 'Find early signs of work.');
  assert.throws(() => runRequest({ mission: 'short', sellerProfileId: PROFILE_ID, runId: RUN_A }), /at least 10/); assert.throws(() => runRequest({ mission: 'Find early signs.', sellerProfileId: 'x', runId: RUN_A }), /profile/); assert.throws(() => runRequest({ mission: 'Find early signs.', sellerProfileId: PROFILE_ID, runId: 'x' }), /no valid number/);
});

test('the cost words: the warning is exact, and no price is claimed because the models and provider are not visible to the page', () => {
  assert.equal(RUN_WARNING, 'This sends about 16 research calls with web search to the model provider. It is a paid run.');
  assert.match(COST_NOTE, /not known in advance/); assert.match(COST_NOTE, /usage page/); assert.doesNotMatch(COST_NOTE + RUN_WARNING, /\$|NZD|USD|cents|per run costs/i);
  const src = readFileSync(new URL('../../architecture/js/radar-model.js', import.meta.url), 'utf8') + readFileSync(new URL('../../architecture/js/radar.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /\$\d|\bUSD\b|\bNZD \d/, 'no figure for the cost is written anywhere');
});

test('status and errors are read into plain sentences; an answer that is not understood is never taken as ready', () => {
  assert.deepEqual(readStatus({ ready: true, missing: [] }), { ready: true, missing: [], unknown: false });
  assert.deepEqual(readStatus({ ready: false, missing: ['scout model', 'director model'] }), { ready: false, missing: ['scout model', 'director model'], unknown: false });
  assert.equal(readStatus({ ready: true, missing: ['scout model'] }).ready, false, 'ready with something missing is not ready');
  for (const bad of [null, {}, { ready: 'yes' }, 'ok', []]) { const s = readStatus(bad); assert.equal(s.ready, false); assert.equal(s.unknown, true); }
  assert.match(explainRadarError({ status: 401 }), /Sign in again/); assert.match(explainRadarError({ timedOut: true }), /may still finish[\s\S]*charged again/); assert.match(explainRadarError({ aborted: true }), /stopped waiting/);
  assert.match(explainRadarError({ network: true }), /could not be reached/); assert.match(explainRadarError({ status: 400, message: 'Choose a saved, reviewed company profile.' }), /Choose a saved/);
  assert.match(explainRadarError({ status: 502, message: 'Radar returned an incomplete report (x).' }), /may have used some of its research calls/); assert.match(explainRadarError({ status: 404 }), /not switched on/);
  assert.ok(explainRadarError({ status: 500, message: 'x'.repeat(900) }).length < 500);
});

// ---- the client: what is sent, and with whose token ------------------------------------------------------------------------------------------------------
function clientWith({ token = 'a.b.c', fetchImpl, rows = {}, userId = ME } = {}) {
  const calls = [], fake = fakeSupabase({ userId });
  Object.assign(fake.db, { pursuit_seller_profiles: [], pursuit_radar_runs: [], ...rows });
  const gateway = { token: async () => token, ask: async (build) => { const r = await build(); if (r.error) throw Object.assign(new Error(r.error.message), { code: 'refused' }); return r.data; }, pub: (t) => fake.from(t) };
  const fetch = fetchImpl ?? (async (u, o) => { calls.push([u, o]); return { ok: true, status: 200, json: async () => ({ ready: true, missing: [] }) }; });
  return { client: createRadarClient({ gateway, userId, fetch, url: 'https://x.supabase.test', key: 'sb_publishable_test', now: () => NOW }), calls, fake };
}
test('status sends only { action: "status" } to the function with the signed-in person\'s token, and a run sends exactly mission, profile and run ids', async () => {
  const f = clientWith();
  const s = await f.client.status(); assert.equal(s.ready, true);
  const [u, o] = f.calls[0]; assert.equal(u, `https://x.supabase.test/functions/v1/${FUNCTION_NAME}`); assert.equal(o.method, 'POST'); assert.equal(o.headers.authorization, 'Bearer a.b.c'); assert.equal(o.headers.apikey, 'sb_publishable_test');
  assert.deepEqual(JSON.parse(o.body), { action: 'status' });
  const g = clientWith({ fetchImpl: async (u2, o2) => { g.calls.push([u2, o2]); return { ok: true, status: 200, json: async () => run({ runId: RUN_B }) }; } });
  const r = await g.client.run({ mission: 'Find early signs of work.', sellerProfileId: PROFILE_ID, runId: RUN_B });
  assert.deepEqual(JSON.parse(g.calls[0][1].body), { mission: 'Find early signs of work.', sellerProfileId: PROFILE_ID, runId: RUN_B }); assert.equal(r.runId, RUN_B); assert.equal(r.opportunities.length, 1);
  assert.ok(!JSON.stringify(g.calls[0]).includes('test.session.token'));
});
test('no token, no call: signed out, the function is never contacted; an invalid request is refused before anything leaves the page', async () => {
  const f = clientWith({ token: null });
  await assert.rejects(f.client.status(), /Sign in again/); await assert.rejects(f.client.run({ mission: 'Find early signs of work.', sellerProfileId: PROFILE_ID, runId: RUN_A }), /Sign in again/); assert.equal(f.calls.length, 0);
  const g = clientWith(); await assert.rejects(g.client.run({ mission: 'no', sellerProfileId: PROFILE_ID, runId: RUN_A }), /at least 10/); await assert.rejects(g.client.run({ mission: 'Find early signs of work.', sellerProfileId: 'x', runId: RUN_A }), /profile/); assert.equal(g.calls.length, 0);
});
test('the function\'s refusals, a network failure, a timeout and a stop come back as plain words with a code', async () => {
  const say = (status, error) => clientWith({ fetchImpl: async () => ({ ok: false, status, json: async () => ({ error }) }) });
  await assert.rejects(say(400, 'Choose a saved, reviewed company profile and a research mission before running Radar.').client.run({ mission: 'Find early signs of work.', sellerProfileId: PROFILE_ID, runId: RUN_A }), (e) => /Choose a saved/.test(e.message) && e.status === 400);
  await assert.rejects(say(409, 'That completed research belongs to a different company profile.').client.run({ mission: 'Find early signs of work.', sellerProfileId: PROFILE_ID, runId: RUN_A }), /different company profile/);
  await assert.rejects(say(500, 'Radar took too long.').client.run({ mission: 'Find early signs of work.', sellerProfileId: PROFILE_ID, runId: RUN_A }), /could not finish: Radar took too long/);
  await assert.rejects(say(401, 'Authentication required').client.status(), /Sign in again/);
  await assert.rejects(clientWith({ fetchImpl: async () => { throw new TypeError('fetch failed'); } }).client.status(), (e) => e.code === 'network' && /could not be reached/.test(e.message));
  const slow = clientWith({ fetchImpl: (u, o) => new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })))) });
  const quick = createRadarClient({ gateway: { token: async () => 't', ask: async () => [], pub: () => ({}) }, userId: ME, fetch: slow.client ? (u, o) => new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })))) : null, timeoutMs: 30 });
  await assert.rejects(quick.run({ mission: 'Find early signs of work.', sellerProfileId: PROFILE_ID, runId: RUN_A }), (e) => e.code === 'timeout');
  const ctl = new AbortController(); const p = quick.run({ mission: 'Find early signs of work.', sellerProfileId: PROFILE_ID, runId: RUN_A, signal: ctl.signal }); setTimeout(() => ctl.abort(), 5);
  await assert.rejects(p, (e) => e.code === 'stopped');
  await assert.rejects(clientWith({ fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ nonsense: true }) }) }).client.run({ mission: 'Find early signs of work.', sellerProfileId: PROFILE_ID, runId: RUN_A }), /did not return a complete report/);
});

test('the two tables: a person saves and lists only their own rows; the database refuses another person\'s (row level security, as the fake imitates it)', async () => {
  const f = clientWith({ rows: { pursuit_seller_profiles: [{ id: 'other-row', user_id: OTHER, profile: { id: 'other-row', name: 'Someone else' }, updated_at: '2026-11-01T00:00:00Z' }], pursuit_radar_runs: [{ id: RUN_B, user_id: OTHER, payload: run({ runId: RUN_B }), generated_at: '2026-11-01T00:00:00Z' }, { id: RUN_A, user_id: ME, payload: run({ runId: RUN_A }), generated_at: '2026-11-21T00:00:00Z' }, { id: 'anon', user_id: null, payload: { kind: 'public-radar' }, generated_at: '2026-11-22T00:00:00Z' }] } });
  assert.equal(await f.client.getProfile(), null, 'another person\'s profile is not returned');
  const p = buildProfile({ ...draftFromWorkspace({ practice: { name: 'Tui Architects' }, hunt: SET, sectorLabels: SECTORS }), approved: true }, { id: PROFILE_ID, canApprove: true });
  await f.client.saveProfile(p, { isNew: true });
  let row = f.fake.db.pursuit_seller_profiles.find((r) => r.id === PROFILE_ID); assert.equal(row.user_id, ME, 'the row is the signed-in person\'s own'); assert.equal(row.profile.id, row.id, 'the table\'s check: profile.id = id');
  assert.equal((await f.client.getProfile()).profile.name, 'Tui Architects');
  await f.client.saveProfile({ ...p, voice: 'Plain' }, { isNew: false }); assert.equal(f.fake.db.pursuit_seller_profiles.find((r) => r.id === PROFILE_ID).profile.voice, 'Plain');
  await assert.rejects(f.client.saveProfile({ ...p, id: 'other-row' }, { isNew: false }), /did not change that profile/);
  const runs = await f.client.listRuns(); assert.deepEqual(runs.map((r) => r.runId), [RUN_A], 'only this person\'s run: not another person\'s and not an anonymous public run');
  f.fake.viewer = true; await assert.rejects(f.client.saveProfile({ ...p, id: newUuid() }, { isNew: true }), /row-level security/);
  const writes = f.fake.writes().map((w) => w.table); assert.ok(writes.every((t) => t === 'pursuit_seller_profiles'), 'the page never writes to pursuit_radar_runs: only the function saves a run');
});

// ---- opportunities and cards ------------------------------------------------------------------------------------------------------------------------------
test('an opportunity becomes an early-signal card from "Radar": headline, account, type, stage, a sorting score, evidence with checked marks, unknowns, next step and ideas', () => {
  const c = cardFromOpportunity(opp(), cleanRun(run()));
  assert.equal(c.kind, 'signal'); assert.equal(c.sourceName, 'Radar'); assert.equal(c.title, 'Funding named for a new community hall'); assert.equal(c.fit, 61); assert.match(c.id, /^signal:radar-33333333-opp-1$/); assert.equal(c.url, 'https://www.beehive.govt.nz/release/a-new-hall', 'the first checked source');
  assert.ok(cleanEarlySignal(c), 'it is a valid early signal for the rest of Found work'); assert.equal(cleanEarlySignal(c).id, c.id);
  const o = c.radar.opportunity; assert.equal(o.accountName, 'Sample District Council'); assert.equal(o.signalType, 'funding'); assert.equal(o.stage, 'signal'); assert.equal(o.score.total, 61); assert.equal(o.nextAction, 'Read the council plan.'); assert.equal(o.reviewAt, '2027-01-15');
  assert.equal(o.outcome, 'A feasibility and concept design for the hall.'); assert.equal(o.demoIdea, 'A walk-through of the hall site.'); assert.deepEqual(o.unknowns, ['Whether design work will be tendered']);
  assert.equal(c.radar.hold, false);
  assert.equal(cardFromOpportunity(opp({ evidence: [evidence({ verified: false })] }), cleanRun(run())).url, 'https://www.beehive.govt.nz/release/a-new-hall', 'with nothing checked, the first source');
});
test('hold, unchecked sources, bad links, odd scores and long text are all handled and bounded', () => {
  const h = cardFromOpportunity(opp({ stage: 'hold', unknowns: ['This looks like physical building work, not design.'] }), cleanRun(run())); assert.equal(h.radar.hold, true); assert.match(h.radar.holdReason, /physical building work/);
  const noReason = cardFromOpportunity(opp({ stage: 'hold', unknowns: [], nextAction: 'Wait for the notice.' }), cleanRun(run())); assert.equal(noReason.radar.holdReason, 'Wait for the notice.');
  assert.equal(cleanOpportunity(opp({ evidence: [evidence({ sourceUrl: 'javascript:alert(1)' }), evidence({ sourceUrl: 'http://example.org/a' })] })), null, 'a source that is not https is dropped, and with none left there is no card');
  assert.equal(cleanOpportunity(opp({ headline: '' })), null); assert.equal(cleanOpportunity(opp({ id: ' ' })), null); assert.equal(cleanOpportunity('x'), null);
  const big = cleanOpportunity(opp({ headline: 'h'.repeat(500), whatChanged: 'w'.repeat(5000), demoIdea: 'd'.repeat(9000), unknowns: Array.from({ length: 40 }, () => 'u'.repeat(2000)), buyerRoles: Array.from({ length: 40 }, () => 'r'.repeat(500)), evidence: Array.from({ length: 40 }, (_, i) => evidence({ sourceUrl: `https://example.org/${i}`, claim: 'c'.repeat(3000), caveat: 'v'.repeat(3000) })) }));
  assert.equal(big.headline.length, 140); assert.equal(big.whatChanged.length, 2000); assert.equal(big.demoIdea.length, 3000); assert.equal(big.unknowns.length, 12); assert.equal(big.unknowns[0].length, 900); assert.equal(big.buyerRoles.length, 12); assert.equal(big.evidence.length, 16); assert.equal(big.evidence[0].caveat.length, 900);
  const odd = cleanOpportunity(opp({ score: { total: 'high', serviceFit: 900, evidenceStrength: -5, timing: NaN, buyerAccess: null }, signalType: 'surprise', stage: 'maybe' })); assert.deepEqual(odd.score, { serviceFit: 100, evidenceStrength: 0, timing: 0, buyerAccess: 0, total: 0 }); assert.equal(odd.signalType, 'other'); assert.equal(odd.stage, 'signal');
  const r = cleanRun(run({}, [opp(), opp({ id: 'bad', headline: '' }), ...Array.from({ length: 20 }, (_, i) => opp({ id: `o${i}` }))])); assert.equal(r.opportunities.length, 12 - 1, 'at most twelve are read, and an unusable one is skipped'); assert.equal(r.skipped, 1);
  assert.throws(() => cleanRun({ runId: 'x', opportunities: [] }), /complete report/); assert.throws(() => cleanRun(null), /complete report/); assert.deepEqual(cleanRun(run({}, [])).opportunities, []);
  assert.deepEqual(cardsFromRun(null), []);
});
test('what an enquiry keeps of an opportunity is bounded: at most 8 sources and 24,000 bytes, with the run and the draft mark', () => {
  const c = cardFromOpportunity(opp({ evidence: Array.from({ length: 16 }, (_, i) => evidence({ sourceUrl: `https://example.org/${i}`, claim: 'c'.repeat(900), caveat: 'v'.repeat(900), sourceTitle: 't'.repeat(180) })), whatChanged: 'w'.repeat(2000), whyItMayMatter: 'y'.repeat(2000), assemblOutcome: 'o'.repeat(2000), demoIdea: 'd'.repeat(3000), unknowns: Array.from({ length: 12 }, () => 'u'.repeat(900)) }), cleanRun(run()));
  const k = radarForEnquiry(c); assert.equal(k.opportunity.evidence.length <= 8, true); assert.ok(new TextEncoder().encode(JSON.stringify(k)).length <= MAX_KEPT); assert.equal(k.runId, RUN_A); assert.equal(k.draft, true); assert.equal(k.v, 1);
  assert.equal(radarForEnquiry({}), null); assert.ok(!JSON.stringify(k).includes('seller'), 'the profile and its evidence words are not copied into the enquiry');
});

// ---- the strip: gates, the profile form, the confirm gate, runs, the lane -------------------------------------------------------------------------------------
test('signed out the panel explains that it needs the practice\'s sign-in and offers nothing; a viewer is told to ask an owner or member', async () => {
  const p = await signedIn(); const out = screen(p, mockClient(), { practice: null }); await out.h.start(); await open(out);
  let html = out.h.html(); assert.match(html, /Look ahead with Radar/); assert.match(html, /Radar needs the practice’s sign-in/); assert.doesNotMatch(html, /data-radar="run-start"|data-radar-form/);
  const v = await signedIn({ role: 'viewer' }); const vs = screen(v, mockClient()); await vs.h.start(); await open(vs);
  html = vs.h.html(); assert.match(html, /A viewer can read what Radar found/); assert.doesNotMatch(html, /data-radar="run-start"|data-radar-form/);
  const mc = mockClient(); const vs2 = screen(v, mc); await vs2.h.start(); await open(vs2); assert.equal(mc.calls.length, 0, 'a viewer\'s page reads and sends nothing');
});
test('opened as an owner: it reads the person\'s own profile and runs and checks readiness for free, and sends nothing paid', async () => {
  const p = await signedIn(); const mc = mockClient({ profile: approvedRow(), runs: [cleanRun(run())] }); const s = screen(p, mc); await s.h.start(); await open(s);
  assert.deepEqual(mc.calls.map((c) => c[0]).sort(), ['getProfile', 'listRuns', 'status']); assert.ok(!mc.calls.some((c) => c[0] === 'run'));
  const html = s.h.html(); assert.match(html, /Radar is ready/); assert.match(html, /1 Radar findings in the lane|class="hunt-count">1</); assert.match(html, /This sends about 16 research calls with web search to the model provider\. It is a paid run\./); assert.match(html, /Draft, for review/);
});
test('the profile form: prefilled from the workspace only, an owner\'s tick is needed, an edit clears the tick, a member cannot approve, and what is saved passes the rules', async () => {
  const p = await signedIn(); const mc = mockClient(); const s = screen(p, mc); await s.h.start(); await open(s);
  let html = s.h.html(); assert.match(html, /Started from what this practice already has here/); assert.match(html, /value="Tui Architects"/); assert.match(html, /Regions: Waikato/); assert.match(html, /I’ve checked this description/); assert.doesNotMatch(html, /data-radar-approve checked/);
  assert.match(html, /Not yet:<\/b> Save the company profile first/);
  const R = s.h.radar;
  await R.saveProfile(); assert.equal(mc.calls.filter((c) => c[0] === 'saveProfile').length, 1); const [, saved, isNew] = mc.calls.find((c) => c[0] === 'saveProfile'); assert.equal(isNew, true); assert.equal(saved.approved, false); assert.equal(saved.focus, 'other'); assert.match(s.h.html(), /Saved, but not checked yet/);
  assert.match(s.h.html(), /Tick “I’ve checked this description” and save the profile/);
  R.input({ target: { closest: (sel) => (sel === '[data-radar-approve]' ? { checked: true } : null) } }); await R.saveProfile();
  assert.equal(mc.calls.filter((c) => c[0] === 'saveProfile').at(-1)[1].approved, true); assert.equal(mc.calls.filter((c) => c[0] === 'saveProfile').at(-1)[2], false, 'the second save updates the same row'); assert.match(s.h.html(), /This description is checked/);
  R.input(typeField('offering', `${R.state.profile.draft.offering} We also do interiors.`)); assert.equal(R.state.profile.draft.approved, false, 'editing a checked description clears the tick');
  assert.match(s.h.html(), /Not yet:<\/b> The profile has changes that are not saved/);
  R.input(typeField('name', '')); await R.saveProfile(); assert.match(s.h.html(), /Give the practice a name/); assert.equal(mc.calls.filter((c) => c[0] === 'saveProfile').length, 2, 'an invalid profile is never sent');
  const m = await signedIn({ role: 'member' }); const mm = mockClient(); const ms = screen(m, mm); await ms.h.start(); await open(ms);
  assert.match(ms.h.html(), /Only an owner can tick this/); ms.h.radar.input({ target: { closest: (sel) => (sel === '[data-radar-approve]' ? { checked: true } : null) } }); await ms.h.radar.saveProfile();
  assert.equal(mm.calls.find((c) => c[0] === 'saveProfile')[1].approved, false, 'a member\'s save is never approved'); assert.match(ms.h.html(), /An owner needs to tick/);
});
test('evidence items are the practice\'s own words, each marked approved by a person; they can be added and removed', async () => {
  const p = await signedIn(); const mc = mockClient({ profile: approvedRow() }); const s = screen(p, mc); await s.h.start(); await open(s);
  await s.h.click(hit('ev-add')); assert.equal(s.h.radar.state.profile.draft.evidence.length, 1); assert.match(s.h.html(), /The practice’s own words/); assert.match(s.h.html(), /own words, checked by a person/);
  s.h.radar.input(typed('data-radar-ev', 'radarEv', { k: '0:title', value: 'A community hall' })); s.h.radar.input(typed('data-radar-ev', 'radarEv', { k: '0:body', value: 'We designed a hall for a rural community.' })); s.h.radar.input(typed('data-radar-ev', 'radarEv', { k: '0:approved', checked: true }));
  assert.deepEqual(s.h.radar.state.profile.draft.evidence[0], { id: s.h.radar.state.profile.draft.evidence[0].id, title: 'A community hall', body: 'We designed a hall for a rural community.', approved: true });
  await s.h.click(hit('ev-remove', { i: '0' })); assert.equal(s.h.radar.state.profile.draft.evidence.length, 0);
});

test('THE CONFIRM GATE: pressing Run checks status for free and asks; nothing paid is sent until "Yes, run Radar"; asking again or declining sends nothing', async () => {
  const p = await signedIn(); const mc = mockClient({ profile: approvedRow() }); const s = screen(p, mc); await s.h.start(); await open(s); const R = s.h.radar;
  const runs = () => mc.calls.filter((c) => c[0] === 'run').length;
  assert.equal(await R.run({ confirmed: true }), null, 'the run function alone, with no confirm step first, sends nothing'); assert.equal(runs(), 0);
  assert.equal(await R.run(), null); assert.equal(runs(), 0);
  await s.h.click(hit('run-start')); assert.equal(R.state.run.phase, 'confirm'); assert.equal(runs(), 0, 'asking to run sends no paid call'); assert.ok(mc.calls.filter((c) => c[0] === 'status').length >= 1);
  const html = s.h.html(); assert.match(html, /Run Radar\?/); assert.match(html, /It is a paid run\./); assert.match(html, /not known in advance/); assert.match(html, /Yes, run Radar \(paid\)/); assert.match(html, /Do not run/);
  assert.equal(await R.run({ confirmed: false }), null); assert.equal(runs(), 0, 'a confirm step without the confirmed flag sends nothing');
  await s.h.click(hit('run-cancel')); assert.equal(R.state.run.phase, 'idle'); assert.equal(await R.run({ confirmed: true }), null); assert.equal(runs(), 0, 'after declining, nothing can be sent');
  await s.h.click(hit('run-start')); await s.h.click(hit('run-confirm')); assert.equal(runs(), 1, 'one confirmed run, one call'); assert.equal(R.state.run.phase, 'done');
  const [, a] = mc.calls.find((c) => c[0] === 'run'); assert.equal(a.sellerProfileId, PROFILE_ID); assert.match(a.runId, /^[0-9a-f-]{36}$/); assert.equal(a.mission, R.state.mission.trim());
  await s.h.click(hit('run-confirm')); assert.equal(runs(), 1, 'a second press of confirm after it finished sends nothing');
});
test('the run is blocked, with the reason in words, when the profile is unsaved, unapproved or changed, the mission is out of bounds, or Radar is not ready', async () => {
  const mk = async (opts) => { const p = await signedIn(); const mc = mockClient(opts); const s = screen(p, mc); await s.h.start(); await open(s); return { mc, s, R: s.h.radar }; };
  const calls = (mc) => mc.calls.filter((c) => c[0] === 'run').length;
  let t = await mk({ profile: { ...approvedRow(), profile: { ...approvedRow().profile, approved: false } } }); await t.s.h.click(hit('run-start')); assert.match(t.s.h.html(), /Tick “I’ve checked this description”/); assert.equal(t.R.state.run.phase, 'error'); assert.equal(calls(t.mc), 0);
  t = await mk({ profile: approvedRow() }); t.R.input({ target: { closest: (sel) => (sel === '[data-radar-mission]' ? { value: 'short' } : null) } }); await t.s.h.click(hit('run-start')); assert.match(t.s.h.html(), /at least 10 characters/); assert.equal(calls(t.mc), 0);
  t.R.input({ target: { closest: (sel) => (sel === '[data-radar-mission]' ? { value: 'x'.repeat(4001) } : null) } }); await t.s.h.click(hit('run-start')); assert.match(t.s.h.html(), /over the 4,000 limit/); assert.equal(calls(t.mc), 0);
  t = await mk({ profile: approvedRow() }); t.R.input(typeField('voice', 'Changed')); await t.s.h.click(hit('run-start')); assert.match(t.s.h.html(), /changes that are not saved/); assert.equal(calls(t.mc), 0);
  t = await mk({ profile: approvedRow(), status: { ready: false, missing: ['scout model', 'director model'], unknown: false } }); assert.match(t.s.h.html(), /Radar is not ready[\s\S]*scout model, director model/); await t.s.h.click(hit('run-start')); assert.equal(t.R.state.run.phase, 'error'); assert.match(t.s.h.html(), /Nothing was sent/); assert.equal(calls(t.mc), 0);
  t = await mk({ profile: approvedRow(), statusError: 'Radar could not be reached.' }); await t.s.h.click(hit('run-start')); assert.equal(calls(t.mc), 0); assert.match(t.s.h.html(), /Nothing was sent/);
  t = await mk({ profile: null }); await t.s.h.click(hit('run-start')); assert.match(t.s.h.html(), /Save the company profile first/); assert.equal(calls(t.mc), 0);
});
test('a template replaces the mission text, which can then be edited before running; the count follows', async () => {
  const p = await signedIn(); const s = screen(p, mockClient({ profile: approvedRow() })); await s.h.start(); await open(s);
  assert.match(s.h.html(), /in Waikato, including kaupapa Māori/); await s.h.click(hit('template', { id: 'planned' })); assert.match(s.h.radar.state.mission, /^Find planned or upcoming public procurement in Waikato/);
  s.h.radar.input({ target: { closest: (sel) => (sel === '[data-radar-mission]' ? { value: 'Find early signs of marae work.' } : null) } }); assert.equal(s.h.radar.state.mission, 'Find early signs of marae work.'); assert.match(s.h.html(), /31 of 4,000 characters/);
});

test('while it runs the page shows the time and a way to stop waiting, and no invented stages; stopping aborts the wait and says the run may still finish', async () => {
  const p = await signedIn(); let release, seen;
  const mc = mockClient({ profile: approvedRow(), runImpl: (a) => new Promise((res, rej) => { seen = a; release = res; a.signal.addEventListener('abort', () => rej(Object.assign(new Error('You stopped waiting for Radar. It may still finish and be saved under past runs.'), { code: 'stopped' }))); }) });
  const ticks = []; const s = screen(p, mc); await s.h.start(); await open(s);
  await s.h.click(hit('run-start')); const going = s.h.click(hit('run-confirm')); await tick();
  const html = s.h.html(); assert.equal(s.h.radar.state.run.phase, 'running'); assert.match(html, /Radar is researching/); assert.match(html, /so far/); assert.match(html, /does not say which stage it is in/); assert.match(html, /Stop waiting/); assert.match(html, /may still finish and be saved under past runs, and any cost is still charged/);
  assert.doesNotMatch(html, /Scouts are|Verifying|Step \d of|\d+%/, 'no fake stages or percentages');
  await s.h.click(hit('run-stop')); await going; assert.equal(seen.signal.aborted, true); assert.equal(s.h.radar.state.run.phase, 'idle'); assert.match(s.h.html(), /may still finish and be saved/); assert.equal(s.h.radar.state.run.timer, null, 'the clock is stopped');
  void ticks; void release;
});
test('a lost answer: if the run was saved before the connection dropped it is found under past runs and shown; if not, the error is plain and nothing is added', async () => {
  const p = await signedIn();
  const mc = mockClient({ profile: approvedRow(), runImpl: (a, store) => { store.runs.unshift(cleanRun(run({ runId: a.runId }))); throw Object.assign(new Error('Radar did not answer within two and a half minutes.'), { code: 'timeout' }); } });
  const s = screen(p, mc); await s.h.start(); await open(s); await s.h.click(hit('run-start')); await s.h.click(hit('run-confirm'));
  assert.equal(s.h.radar.state.run.phase, 'done'); assert.match(s.h.html(), /Radar had finished and saved this run/); assert.equal(s.h.radar.cards().length, 1);
  const bad = mockClient({ profile: approvedRow(), runImpl: () => { throw Object.assign(new Error('Radar could not finish: Radar took too long. It may have used some of its research calls, so check the provider’s usage page.'), { code: 'refused', status: 500 }); } });
  const t = screen(p, bad); await t.h.start(); await open(t); await t.h.click(hit('run-start')); await t.h.click(hit('run-confirm'));
  assert.equal(t.h.radar.state.run.phase, 'error'); assert.match(t.h.html(), /Radar could not finish/); assert.equal(t.h.radar.cards().length, 0); assert.deepEqual(await t.ctx.store.list('enquiry'), [], 'nothing reaches the pipeline');
  const none = mockClient({ profile: approvedRow(), runImpl: (a, store) => { const r = cleanRun(run({ runId: a.runId }, [])); store.runs.unshift(r); return r; } });
  const u = screen(p, none); await u.h.start(); await open(u); await u.h.click(hit('run-start')); await u.h.click(hit('run-confirm')); assert.match(u.h.html(), /found nothing it could defend/);
});
test('past runs open without a new paid run, are labelled, and can be hidden from the lane', async () => {
  const p = await signedIn(); const mc = mockClient({ profile: approvedRow(), runs: [cleanRun(run({ runId: RUN_A }, [opp()])), cleanRun(run({ runId: RUN_B, generatedAt: '2026-10-01T00:00:00.000Z' }, [opp({ id: 'old-1', headline: 'An older signal about a kura' })]))] });
  const s = screen(p, mc); await s.h.start(); await open(s);
  assert.equal(s.h.radar.cards()[0].title, 'Funding named for a new community hall', 'the newest run shows first'); assert.match(s.h.html(), /Showing a past run reads what was saved\. It does not run Radar again and costs nothing/);
  await s.h.click(hit('open-run', { id: RUN_B })); assert.equal(s.h.radar.cards()[0].title, 'An older signal about a kura'); assert.equal(mc.calls.filter((c) => c[0] === 'run').length, 0, 'opening a past run makes no run');
  assert.match(s.h.html(), /An older signal about a kura/); await s.h.click(hit('hide-run')); assert.equal(s.h.radar.cards().length, 0); assert.doesNotMatch(s.h.html(), /An older signal about a kura/);
  const failing = mockClient({ profile: approvedRow() }); failing.listRuns = async () => { throw new Error('x'); }; const f = screen(p, failing); await f.h.start(); await open(f); assert.match(f.h.html(), /Past runs could not be read just now/);
});

test('in the lane: Radar findings are marked draft, show checked and unchecked sources apart, hold is dimmed with its reason, and the sorting score is not called a chance', async () => {
  const p = await signedIn(); const held = opp({ id: 'held-1', headline: 'A school rebuild that may be building work only', stage: 'hold', unknowns: ['This looks like physical building work, not design.'] });
  const mc = mockClient({ profile: approvedRow(), runs: [cleanRun(run({}, [opp(), held, opp({ id: 'x-3', headline: 'Unsafe <script>alert(1)</script> headline', evidence: [evidence({ sourceTitle: '<img src=x onerror=alert(1)>' })] })]))] });
  const s = screen(p, mc); await s.h.start(); const html = s.h.html();
  assert.match(html, /From Radar: 3 findings, drafts for review\. Nothing has been sent/); assert.match(html, /Early signal from Radar/); assert.equal((html.match(/Draft, for review\. Nothing has been sent\./g) ?? []).length, 3);
  assert.match(html, /<span>Checked<\/span>/); assert.match(html, /Not independently checked/); assert.match(html, /Search did not return this exact link\./);
  assert.match(html, /class="hunt-card is-signal is-radar is-hold"/); assert.match(html, /<b>On hold\.<\/b> This looks like physical building work/); assert.equal((html.match(/is-hold/g) ?? []).length, 1);
  assert.match(html, /Sorting score 61 of 100/); assert.match(html, /A sorting aid, not a chance of winning\./); assert.doesNotMatch(html, /probabilit|likelihood|win rate|odds of/i);
  assert.match(html, /What changed/); assert.match(html, /Why it may matter/); assert.match(html, /Not known/); assert.match(html, /Next step/); assert.match(html, /Review by 15 Jan 2027/); assert.match(html, /<summary>Ideas<\/summary>/); assert.match(html, /A feasibility and concept design for the hall\./); assert.match(html, /A walk-through of the hall site\./);
  assert.doesNotMatch(html, /<script>alert|<img src=x/); assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; headline/);
  assert.doesNotMatch(html, /\bAI\b/, 'no bare "AI" in the copy');
  assert.match(html, /rel="noopener noreferrer"/);
});
test('a Radar card that is verified-only shows a Checked mark only for sources the function marked verified', () => {
  const c = cardFromOpportunity(opp({ evidence: [evidence({ verified: false, sourceUrl: 'https://example.org/one' })] }), cleanRun(run()));
  const html = createHunt({ store: null, practice: null, account: null }, {}).radar.cardHtml(c, {});
  assert.doesNotMatch(html, /<span>Checked<\/span>/); assert.match(html, /Not independently checked/);
});

test('"Add to pipeline" on a Radar finding makes one enquiry as other findings do, keeps the opportunity in extra.radar in the shared records, and adding twice makes one', async () => {
  const p = await signedIn(); const mc = mockClient({ profile: approvedRow(), runs: [cleanRun(run())] }); const s = screen(p, mc); await s.h.start();
  const card = s.h.radar.cards()[0]; await s.h.click(hunthit('add', card.id)); await s.h.click(hunthit('add', card.id));
  const enq = await s.ctx.store.list('enquiry'); assert.equal(enq.length, 1); const e = enq[0];
  assert.equal(e.stage, 'new'); assert.equal(e.title, 'Funding named for a new community hall'); assert.equal(e.next_action, 'Check the signal before acting'); assert.equal(e.next_action_due, ''); assert.equal(e.value_nzd, null); assert.equal(e.owner, '');
  assert.match(e.source, /^Radar early signal, not a tender · https:\/\/www\.beehive\.govt\.nz\//); assert.equal(e.radar.opportunity.headline, card.title); assert.equal(e.radar.runId, RUN_A); assert.equal(e.radar.draft, true);
  const acts = await s.ctx.store.list('crm_activity'); assert.equal(acts.length, 1); assert.match(acts[0].body, /early signal from Radar, a draft for review/); assert.match(acts[0].body, /sorting aid, not a chance of winning/); assert.match(acts[0].body, /suggested next step: Read the council plan/); assert.match(acts[0].body, /Review by: 2027-01-15/); assert.match(acts[0].body, /Nothing has been sent/);
  assert.match(s.h.html(), /Added to the pipeline/); assert.equal(s.log.added.length, 1);
  const row = p.fake.db.enquiry?.find((r) => r.id === e.id); assert.ok(row, 'the enquiry is in the shared records'); assert.equal(row.extra.radar.opportunity.headline, card.title, 'the opportunity is in the row\'s extra.radar'); assert.equal(row.extra.radar.v, 1);
  assert.ok(new TextEncoder().encode(JSON.stringify(row.extra.radar)).length <= MAX_KEPT);
  assert.equal(row.extra.finding?.kind, 'signal', 'the Pursuit studio copy (extra.finding) is kept too'); assert.equal(row.extra.finding.title, card.title);
  const again = await s.ctx.store.list('enquiry'); assert.equal(again[0].radar.opportunity.id, 'opp-1', 'it reads back with the enquiry');
  const { enquiry } = enquiryFromSignal(cleanEarlySignal({ id: 'signal:other-1', kind: 'signal', title: 'x', sourceUrl: 'https://example.org/a' }), { now: NOW }); assert.equal('radar' in enquiry, false, 'other early signals carry nothing of Radar');
});
test('"Not for us" hides a Radar finding for this practice in this browser; a read-only page shows findings without buttons', async () => {
  const p = await signedIn(); const mc = mockClient({ profile: approvedRow(), runs: [cleanRun(run())] }); const s = screen(p, mc); await s.h.start(); const id = s.h.radar.cards()[0].id;
  await s.h.click(hunthit('no', id)); assert.doesNotMatch(s.h.html(), /Funding named for a new community hall<\/span><svg/); assert.match(s.h.html(), /1 hidden as not for us/);
  const p2 = await signedIn(); const ro = screen(p2, mockClient({ profile: approvedRow(), runs: [cleanRun(run())] }), { readOnly: true }); await ro.h.start(); assert.match(ro.h.html(), /Funding named for a new community hall/); assert.doesNotMatch(ro.h.html(), /data-hunt="add"/);
});

test('the page code for Radar has no way to contact anyone but the one function, and never holds a service key or a token of its own', () => {
  const read = (f) => readFileSync(new URL(`../../architecture/js/${f}`, import.meta.url), 'utf8');
  for (const f of ['radar.js', 'radar-model.js']) assert.doesNotMatch(read(f), /fetch\(|mailto:|sendBeacon|XMLHttpRequest|WebSocket|localStorage|sessionStorage|service_role|SERVICE_ROLE/, f);
  const c = read('radar-client.js'); assert.equal((c.match(/fetchImpl\(/g) ?? []).length, 1, 'one place makes a request'); assert.match(c, /\/functions\/v1\/\$\{FUNCTION_NAME\}/); assert.doesNotMatch(c, /service_role|localStorage|sessionStorage/);
  assert.doesNotMatch(c, /pursuit_radar_runs'\)\s*\.(insert|update|upsert|delete)/, 'only the function writes a run');
});
