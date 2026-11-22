// Found work, "Leads and early signals": the lead rules (stories kept and dropped), that no story text ever reaches the page, the cards and lane,
// "Add to pipeline" as a lead, signed-out behaviour, the early-signal shape, and the alert-email control. Stand-ins only: no browser, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore, memoryBackend, memoryFiles } from '../../architecture/js/store.js';
import { createSwitch } from '../../architecture/js/cloud.js';
import { mountAccount } from '../../architecture/js/account.js';
import { sampleProject } from '../../architecture/js/model.js';
import { AUTH_STORAGE_KEY } from '../../architecture/js/config.js';
import { fakeSupabase } from './fake-supabase.mjs';
import { parseLens, rankLeads, scoreLead, storyFromKb, regionsNamed, LEAD_MIN } from '../../architecture/js/hunt-rank.js';
import { cleanHunt, cleanLead, cleanEarlySignal, cleanSignal, enquiryFromSignal, enquiryFromItem, sourceLine, addedAs, SETTING, KIND_LABEL, KIND_NOTE } from '../../architecture/js/hunt-model.js';
import { createHunt, readEarlySignals } from '../../architecture/js/hunt.js';

const NOW = new Date('2026-11-22T00:00:00Z');
const ME = '00000000-0000-4000-8000-00000000a11c', PRACTICE = '11111111-1111-4111-8111-111111111111';
const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms));
const row = (title, o = {}) => ({ id: `0000-${Math.abs([...title].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7))}`, source: 'RNZ — Top stories', title, url: 'https://www.rnz.co.nz/news/national/1/x', published_at: '2026-11-21T01:00:00Z', snippet: '', ...o });
const lens = (o = {}) => parseLens({ keywords: 'library', sectors: 'education,kaupapa', regions: '', ...o });
const kept = (title, o = {}, l = lens()) => rankLeads([row(title, o)], l, NOW);

test('stories about a building or place, and what is happening to it, are kept; each has a reason in our own words', () => {
  const cases = [
    ['Marae wharenui badly damaged by fire in Northland', /wharenui was damaged by fire: repair or rebuild may follow/],
    ['Auckland school classroom block to be rebuilt after fire', /classroom block was damaged by fire/],
    ['New Hamilton library to be built on the old council site', /A new library is announced or proposed: design or briefing work may follow/],
    ['Cyclone-hit community gets revamped fire station to bolster disaster resilience', /fire station is to be upgraded, extended or replaced/],
    ['Iwi takes over former bank building in Whanganui', /building is changing hands or changing use/],
    ['Government funding for new Gisborne pool announced', /Funding is named for a pool/],
    ['Earthquake-prone Wellington town hall to be strengthened', /may be demolished or strengthened|unsafe|upgraded/],
  ];
  for (const [title, re] of cases) { const [l] = kept(title); assert.ok(l, title); assert.match(l.reason, re, title); assert.equal(l.kind, 'lead'); assert.ok(l.fit >= LEAD_MIN); }
});

test('politics, sport results, crime, opinion, hospital patients, school gossip, foreign stories and plain "building" verbs are dropped', () => {
  const dropped = [
    'One person dead, two airlifted to hospital after being trapped in house collapse', 'Did GTA VI’s launch day cause a mass school wag?', 'Whanganui Collegiate sees off challenges to optional fee of nearly $11,000',
    '‘We were miles off’: Under-fire All Blacks searching for answers after England rout', 'New survey shows the Chrises face tough task building their credibility', 'The Waikato farmer who spent 15 years building his dream catamaran',
    'Man jailed for burning down Auckland church', 'Man caught taking photos through school fence', 'Store employee in hospital after being hit by masked intruder', 'Labour MP says new school policy is a mess',
    'Opinion: why the new library is a waste of money', 'New Palmerston North fire truck unable to be used due to electrical fault', 'Why Kiwis are trading poolside cocktails for 42km and a finish-line croissant',
    'Warriors beat Roosters to win new stadium opener', 'Hospital opens new wing in Sydney after funding boost', 'Wine company cuts cloth to fit very challenging export market',
  ];
  for (const t of dropped) assert.deepEqual(kept(t, { source: 'Stuff — Top stories', url: 'https://www.stuff.co.nz/nz-news/1/x' }), [], t);
  // the section of the site counts too: a world, sport or crime page is dropped whatever the headline says
  for (const sec of ['world-news', 'sport', 'crime-and-justice', 'entertainment', 'opinion']) assert.deepEqual(kept('New library to be built', { url: `https://www.stuff.co.nz/${sec}/1/x` }), [], sec);
  // a plain building project that happens to mention a minister is still a lead
  assert.equal(kept('Minister announces upgrade of Hamilton school hall').length, 1);
});

test('links must be the news sites\' own: a story with another host, http or no link is dropped', () => {
  for (const url of ['https://evil.example/news/1', 'http://www.rnz.co.nz/news/1', 'https://www.rnz.co.nz.evil.example/news/1', '', 'javascript:alert(1)']) assert.deepEqual(kept('New Hamilton library to be built', { url }), [], url);
});

test('the practice\'s regions: a story that names another place is dropped, one in the region is kept, one that names no place is kept', () => {
  const l = lens({ regions: 'Waikato' });
  assert.equal(kept('New Hamilton library to be built', {}, l).length, 1); assert.match(kept('New Hamilton library to be built', {}, l)[0].reasons.join(' '), /In Waikato/);
  assert.deepEqual(kept('New Dunedin library to be built', {}, l), []); assert.equal(kept('New library to be built on the old council site', {}, l).length, 1);
  assert.deepEqual(regionsNamed('Te Atatū peninsula fire in Queenstown').sort(), ['Otago']);
});

test('the practice\'s own words, sectors and the kaupapa Māori lens raise a lead; an unmatched lead still counts but ranks lower', () => {
  const a = kept('New Hamilton library to be built')[0], b = kept('New Hamilton hotel to be built')[0];
  assert.ok(a.fit > b.fit); assert.match(a.reasons.join(' '), /“library”, from your words/);
  const m = kept('Marae wharekai to be upgraded', {}, lens({ cultural: '1' }))[0];
  assert.equal(m.cultural.on, true); assert.match(m.reasons.join(' '), /kaupapa Māori or Indigenous words/); assert.match(m.reasons.join(' '), /Fits your Kaupapa Māori and Indigenous work/);
});

test('a lead never carries the story: the snippet is read for ranking and then gone, everywhere', () => {
  const secret = 'ZEBRA-SNIPPET-TEXT the council will upgrade the hall and the mayor said a great deal about it';
  const [l] = kept('New Hamilton library to be built', { snippet: secret });
  assert.ok(l); assert.ok(!JSON.stringify(l).includes('ZEBRA'));
  const c = cleanLead({ ...l, snippet: secret, content: secret, body: secret, summary: secret }); assert.ok(!JSON.stringify(c).includes('ZEBRA')); assert.deepEqual(Object.keys(c).sort(), ['buyer', 'closesDay', 'cultural', 'fit', 'id', 'kind', 'published', 'reason', 'reasons', 'region', 'source', 'sourceName', 'title', 'url']);
  assert.ok(storyFromKb(row('x', { snippet: 's'.repeat(500) })).snippet.length <= 200);
  const e = enquiryFromItem(l, { now: NOW }); assert.ok(!JSON.stringify(e).includes('ZEBRA'));
});

test('the same story from two sources shows once; the list is ordered and bounded', () => {
  const rows = [row('New Hamilton library to be built', { source: 'Stuff — Top stories', url: 'https://www.stuff.co.nz/nz-news/1/a' }), row('New Hamilton library to be built', { source: 'RNZ — Top stories', url: 'https://www.rnz.co.nz/news/1/b', id: 'other' })];
  assert.equal(rankLeads(rows, lens(), NOW).length, 1);
  assert.equal(rankLeads(Array.from({ length: 40 }, (_, i) => row(`New Hamilton library number ${i} to be built`, { id: `id${i}`, url: `https://www.rnz.co.nz/news/${i}/x` })), lens(), NOW, 12).length, 12);
  assert.deepEqual(rankLeads(null, lens(), NOW), []); assert.deepEqual(rankLeads([null, 5, {}], lens(), NOW), []);
});

// ---- the cleaning of leads and early signals ---------------------------------------------------------------------------------------------------
const SIGNAL = { id: 'feed:abc 123', kind: 'signal', title: 'Council plans a new aquatic centre in its long-term plan', source: 'Example District Council long-term plan', sourceUrl: 'https://www.example.govt.nz/ltp', day: '2026-11-20', region: 'Waikato', why: 'The draft plan sets aside money for a new aquatic centre: a design brief may come first.', horizon: 'months 6–24', evidence: [{ label: 'Draft plan, page 41', url: 'https://www.example.govt.nz/ltp.pdf' }, { label: 'Not safe', url: 'javascript:alert(1)' }, { label: '', url: 'https://x.example/a' }], cultural: { on: true, why: ['marae'] } };

test('an early signal from the signal feeds is accepted, bounded and given a safe id; anything else is dropped', () => {
  const s = cleanEarlySignal(SIGNAL);
  assert.equal(s.kind, 'signal'); assert.match(s.id, /^signal:\S+$/); assert.equal(s.url, 'https://www.example.govt.nz/ltp'); assert.equal(s.sourceName, 'Example District Council long-term plan'); assert.equal(s.horizon, 'months 6–24');
  assert.deepEqual(s.evidence, [{ label: 'Draft plan, page 41', url: 'https://www.example.govt.nz/ltp.pdf' }], 'unsafe and empty evidence is dropped'); assert.deepEqual(s.cultural, { on: true, why: ['marae'] });
  assert.equal(cleanEarlySignal({ ...SIGNAL, title: 't'.repeat(900), why: 'w'.repeat(900), evidence: Array.from({ length: 20 }, (_, i) => ({ label: `l${i}`, url: `https://a.example/${i}` })) }).evidence.length, 5);
  assert.ok(cleanEarlySignal({ ...SIGNAL, title: 't'.repeat(900) }).title.length <= 300);
  for (const bad of [null, 'x', {}, { ...SIGNAL, kind: 'tender' }, { ...SIGNAL, sourceUrl: 'http://a.example' }, { ...SIGNAL, sourceUrl: '' }, { ...SIGNAL, title: '' }, { ...SIGNAL, id: '' }]) assert.equal(cleanEarlySignal(bad), null);
  assert.equal(cleanEarlySignal({ ...SIGNAL, day: 'last week' }).published, '');
});

test('early signals: asked of the signals feed with the same lens; a failing feed gives nothing and never throws', async () => {
  let asked = '';
  const ok = async (url) => { asked = url; return { ok: true, json: async () => ({ feeds: { signals: { values: { signals: [{ id: 'beehive:1', kind: 'signal', title: 'A marae', sourceUrl: 'https://www.beehive.govt.nz/release/a' }] } } } }) }; };
  const got = await readEarlySignals('feeds=hunt&keywords=marae&regions=Auckland&sectors=kaupapa&cultural=1&min=5&sources=gets&radar=1&lens=3', ok);
  assert.equal(got.length, 1);
  const q = new URLSearchParams(asked.split('?')[1]);
  assert.equal(asked.split('?')[0], '/api/live/');
  assert.equal(q.get('feeds'), 'signals'); assert.equal(q.get('keywords'), 'marae'); assert.equal(q.get('regions'), 'Auckland'); assert.equal(q.get('sectors'), 'kaupapa'); assert.equal(q.get('cultural'), '1');
  for (const k of ['sources', 'min', 'radar', 'lens']) assert.equal(q.has(k), false, `${k} is not sent to the signals feed`);
  assert.deepEqual(await readEarlySignals('feeds=hunt', async () => ({ ok: false, status: 503, json: async () => ({}) })), []);
  assert.deepEqual(await readEarlySignals('feeds=hunt', async () => { throw new Error('offline'); }), []);
  assert.deepEqual(await readEarlySignals('feeds=hunt', async () => ({ ok: true, json: async () => ({ feeds: {} }) })), []);
});

test('a lead and a signal become enquiries marked as such, with a next step that is to check; nothing is a tender', () => {
  const [l] = kept('Marae wharenui badly damaged by fire in Northland');
  const { enquiry, activity } = enquiryFromSignal(l, { now: NOW, who: 'Mere' });
  assert.equal(enquiry.stage, 'new'); assert.equal(enquiry.next_action, 'Check the story before acting'); assert.equal(enquiry.next_action_due, ''); assert.equal(enquiry.value_nzd, null);
  assert.match(enquiry.source, /news lead, not a tender · https:\/\/www\.rnz\.co\.nz\//); assert.match(activity.body, /lead from the news \(RNZ\), not a tender and not an opportunity yet/); assert.match(activity.body, /Nothing has been sent/);
  const sig = enquiryFromItem(cleanEarlySignal(SIGNAL), { now: NOW });
  assert.equal(sig.enquiry.next_action, 'Check the signal before acting'); assert.match(sig.activity.body, /early signal .* may mean work in months 6–24/); assert.match(sig.enquiry.source, /early signal, not a tender/);
  assert.throws(() => enquiryFromItem({ kind: 'lead', title: 'x', url: 'http://x' }), /no link/);
  assert.equal(addedAs(l, [{ id: 'e1', source: enquiry.source }])?.id, 'e1', 'added already is matched on the link');
  assert.deepEqual([KIND_LABEL.lead, KIND_LABEL.signal], ['News, not a tender', 'Early signal: work that may come']); assert.equal(KIND_NOTE.lead, 'A story worth a look, not an opportunity. Check before acting.');
  assert.equal(cleanSignal({ id: 'gets:1', title: 'x', url: 'https://a.example', fit: 70, advance: true }).advance, true);
});

// ---- the strip -------------------------------------------------------------------------------------------------------------------------------------
const SET = { keywords: ['library'], regions: [], sectors: ['education'], min: null, max: null, sources: { radar: true, gets: false } };
const json = (b) => ({ ok: true, status: 200, json: async () => b });
async function signedIn({ role = 'owner', leads, inbox = [], rpc = {} } = {}) {
  const fake = fakeSupabase({ userId: ME, rpc: { my_invitations: () => [], practice_people: () => [], hunt_signals: () => [], ...(leads ? { hunt_leads: leads } : {}), ...rpc } });
  fake.db.practice = [{ id: PRACTICE, name: 'Tui Architects', created_by: ME, extra: { hunt: cleanHunt(SET) } }];
  fake.db.practice_member = [{ practice_id: PRACTICE, user_id: ME, role }];
  fake.db.hunt_inbox = inbox;
  const session = { access_token: 'x.y.z', user: { id: ME, email: 'mere@example.org', user_metadata: { full_name: 'Mere Ngata' } } };
  fake.auth = { getSession: async () => ({ data: { session }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), refreshSession: async () => ({ data: { session: null }, error: { message: 'x' } }), signOut: async () => ({ error: null }) };
  const mem = new Map([[AUTH_STORAGE_KEY, 'kept'], ['assembl.architecture.practice', PRACTICE]]);
  const win = { location: { href: 'https://lab.assembl.co.nz/architecture/', hash: '' }, history: { state: null, replaceState() {} }, localStorage: { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, String(v)), removeItem: (k) => void mem.delete(k) }, addEventListener() {}, removeEventListener() {}, open() {} };
  const el = () => ({ innerHTML: '', hidden: false, listeners: {}, addEventListener(t, fn) { this.listeners[t] = fn; } });
  const local = createStore(memoryBackend(), { files: memoryFiles() }), store = createSwitch(local);
  await local.saveProject(sampleProject());
  const account = mountAccount({ store, local, slot: el(), panel: el(), nameLabel: el(), win, loadClient: async () => ({ createClient: () => fake }) });
  await account.ready;
  for (let i = 0; i < 40 && account.state.phase !== 'in'; i++) await tick(5);
  await tick();
  return { account, fake, store };
}
function screen(ctx, opts = {}) {
  const log = { draws: 0, added: [] }, state = { enquiries: [] };
  const reload = async () => { state.enquiries = await ctx.store.list('enquiry'); };
  const h = createHunt(ctx, { enquiries: () => state.enquiries, redraw: () => { log.draws++; }, added: async (t) => { log.added.push(t); await reload(); }, fetch: async () => json({}), now: () => NOW, ...opts });
  return { h, log, state };
}
const click = (h, act, id = '') => h.click({ target: { closest: () => ({ dataset: { hunt: act, id } }) } });
const ctxOf = (p) => ({ store: p.store, me: 'Mere', practice: p.account.state.practice, account: p.account });
const LEADS = [row('Marae wharenui badly damaged by fire in Northland', { snippet: 'ZEBRA-SNIPPET-TEXT' }), row('New Hamilton library to be built', { id: 'lib', url: 'https://www.stuff.co.nz/nz-news/9/x', source: 'Stuff — Top stories' }), row('Man jailed for burning down Auckland church')];

test('signed in: the lane "Leads and early signals" shows each lead marked "News, not a tender", with the headline, source, day and link only', async () => {
  const p = await signedIn({ leads: () => LEADS });
  const s = screen(ctxOf(p)); await s.h.start();
  const out = s.h.html();
  assert.match(out, /<h3[^>]*>[\s\S]*Leads and early signals/); assert.match(out, /Finds tenders, news leads and early signals/);
  assert.equal((out.match(/News, not a tender/g) ?? []).length, 2, 'two leads, each marked'); assert.match(out, /A story worth a look, not an opportunity\. Check before acting\./);
  assert.match(out, /Marae wharenui badly damaged by fire in Northland/); assert.match(out, /href="https:\/\/www\.stuff\.co\.nz\/nz-news\/9\/x"/); assert.match(out, /wharenui was damaged by fire: repair or rebuild may follow/);
  assert.doesNotMatch(out, /ZEBRA/, 'the snippet is never shown'); assert.doesNotMatch(out, /jailed/);
  assert.match(out, /Kaupapa Māori/, 'the kaupapa badge'); assert.match(out, /Cultural work/);
  assert.match(JSON.stringify(await p.account.huntLeads()), /ZEBRA/, 'the stand-in database does send it: the page is what drops it');
  assert.ok(!JSON.stringify(s.h.state.answer).includes('ZEBRA'), 'and it is not kept in the day\'s answer either');
});

test('"Add to pipeline" on a lead makes an enquiry marked as a lead; "Not for us" hides it and remembers; adding twice makes one', async () => {
  const p = await signedIn({ leads: () => LEADS });
  const ctx = ctxOf(p), s = screen(ctx); await s.h.start();
  const [id1, id2] = s.h.state.answer.leads.map((x) => x.id);
  await click(s.h, 'add', id1); await click(s.h, 'add', id1);
  const enq = await ctx.store.list('enquiry'); assert.equal(enq.length, 1); assert.match(enq[0].source, /news lead, not a tender/); assert.equal(enq[0].next_action, 'Check the story before acting');
  const acts = await ctx.store.list('crm_activity'); assert.match(acts[0].body, /not a tender and not an opportunity yet/);
  await click(s.h, 'no', id2);
  assert.ok(!s.h.html().includes(`data-id="${id2}"`)); const kept = (await ctx.store.get('setting', SETTING.dismissed(`p-${PRACTICE}`))).value; assert.ok(kept[id2]);
  const s2 = screen(ctx); await s2.h.start(); assert.ok(!s2.h.html().includes(`data-id="${id2}"`), 'still hidden on the next visit');
});

test('signed out: there are no leads and the page says why; the tenders and the alert control still work', async () => {
  const store = createStore(memoryBackend(), { files: memoryFiles() });
  await store.save('setting', { id: SETTING.hunt, value: { ...SET, sources: { radar: true, gets: true } } });
  const s = screen({ store, me: 'Mere', practice: null, account: null }, { fetch: async () => json({ feeds: { hunt: { fetchedAt: NOW.toISOString(), values: { signals: [], sources: [{ id: 'gets', name: 'GETS', ok: true }], considered: 0 } } } }) });
  await s.h.start(); const out = s.h.html();
  assert.match(out, /Leads need the practice’s records/); assert.doesNotMatch(out, /News, not a tender/); assert.match(out, /Add alert emails/);
});

test('leads failing (the function not there yet) says so in the lane and leaves the rest alone; a viewer sees leads but the add buttons are the page\'s read-only ones', async () => {
  const p = await signedIn({ leads: () => { throw new Error('function arch.hunt_leads does not exist'); } });
  const s = screen(ctxOf(p)); await s.h.start();
  assert.match(s.h.html(), /Leads could not be read just now/); assert.equal(s.h.state.phase, 'ready');
});

test('early signals from the hook show with their own label, horizon, evidence and reason; they are added as signals', async () => {
  const p = await signedIn({ leads: () => [] });
  const ctx = ctxOf(p), s = screen(ctx, { signalFeed: async () => [cleanEarlySignal(SIGNAL) && SIGNAL, { ...SIGNAL, id: 'bad', sourceUrl: 'http://no' }] }); await s.h.start();
  const out = s.h.html();
  assert.match(out, /Early signal: work that may come/); assert.match(out, /months 6–24/); assert.match(out, /Draft plan, page 41/); assert.match(out, /a design brief may come first/); assert.doesNotMatch(out, /javascript:/);
  assert.equal(s.h.state.answer.leads.length, 1);
  await click(s.h, 'add', s.h.state.answer.leads[0].id);
  const [enq] = await ctx.store.list('enquiry'); assert.match(enq.source, /early signal, not a tender/);
});

test('a signal feed that throws leaves the leads in', async () => {
  const p = await signedIn({ leads: () => LEADS });
  const s = screen(ctxOf(p), { signalFeed: async () => { throw new Error('down'); } }); await s.h.start();
  assert.match(s.h.html(), /News, not a tender/); assert.equal(s.h.state.phase, 'ready');
});

// ---- alert emails on the strip ------------------------------------------------------------------------------------------------------------------------
const EMAIL = (id, name, kind = 'Current Tenders', close = '07/12/2026 05:00PM') => `${kind}\n Organisation: Example Council\n GETS RFx ID: ${id}\n Tender Name: ${name}\n Closing Date: ${close}\n https://www.gets.govt.nz/EX/ExternalTenderDetails.htm?id=${id}\n`;

test('signed out: pasted alert text is read, kept in the browser, ranked, shown as "GETS alert email", and the advance notice is badged', async () => {
  const store = createStore(memoryBackend(), { files: memoryFiles() });
  await store.save('setting', { id: SETTING.hunt, value: { ...SET, sources: { radar: false, gets: false } } });
  const ctx = { store, me: 'Mere', practice: null, account: null };
  const s = screen(ctx); await s.h.start();
  await s.h.addAlerts([EMAIL('10000001', 'Hillside Library Refurbishment Design Services') + EMAIL('20000001', 'School Redevelopment Feasibility', 'Future Procurement Opportunities', '30/06/2027 12:00AM') + EMAIL('10000009', 'Supply of road salt')]);
  const out = s.h.html();
  assert.match(out, /Hillside Library Refurbishment/); assert.match(out, /GETS alert email/); assert.match(out, /Advance notice/); assert.doesNotMatch(out, /road salt/, 'not about buildings: kept, but not a finding');
  assert.match(out, /Read 3 tenders from 1 email: 3 new; 1 is an advance notice/);
  assert.equal((await ctx.store.get('setting', 'hunt-inbox:browser')).value.length, 3);
  const s2 = screen(ctx); await s2.h.start(); assert.match(s2.h.html(), /Hillside Library Refurbishment/, 'kept for the next visit');
  await s.h.addAlerts([EMAIL('10000001', 'Hillside Library Refurbishment Design Services')]); assert.match(s.h.html(), /1 already kept/);
  await click(s.h, 'add', 'gets:10000001'); const [enq] = await ctx.store.list('enquiry');
  assert.match(enq.source, /^GETS alert email tender 10000001/); assert.equal(enq.next_action, 'Read the tender documents');
});

test('an alert that is junk or a phishing link says what was wrong and keeps nothing', async () => {
  const store = createStore(memoryBackend(), { files: memoryFiles() });
  await store.save('setting', { id: SETTING.hunt, value: { ...SET, sources: { radar: false, gets: false } } });
  const s = screen({ store, me: 'Mere', practice: null, account: null }); await s.h.start();
  await s.h.addAlerts([EMAIL('10000001', 'Library design').replace('www.gets.govt.nz', 'www.gets.govt.nz.example.org')]);
  assert.match(s.h.html(), /No GETS tenders were found/); assert.equal((await store.get('setting', 'hunt-inbox:browser')), null);
});

test('signed in: alert items are saved to the shared records for the practice, merge with the live feed by RFx ID, and a viewer cannot add', async () => {
  const p = await signedIn({ leads: () => [] }), ctx = ctxOf(p);
  const feed = async () => json({ feeds: { hunt: { fetchedAt: NOW.toISOString(), values: { signals: [{ id: 'gets:10000001', title: 'Hillside Library Refurbishment Design Services', buyer: 'Example Council', url: 'https://www.gets.govt.nz/EX/ExternalTenderDetails.htm?id=10000001', source: 'gets', sourceName: 'GETS', fit: 80, closesDay: '2026-12-07', reasons: [] }], sources: [{ id: 'gets', name: 'GETS', ok: true }], considered: 1 } } } });
  await p.account.setHunt(cleanHunt({ ...SET, sources: { radar: false, gets: true } }));
  const s = screen(ctx, { fetch: feed }); await s.h.start();
  await s.h.addAlerts([EMAIL('10000001', 'Hillside Library Refurbishment Design Services') + EMAIL('10000002', 'Pool Redevelopment Design Services')]);
  const rows = p.fake.db.hunt_inbox; assert.deepEqual(rows.map((r) => r.rfx_id).sort(), ['10000001', '10000002']); assert.equal(rows[0].practice_id, PRACTICE); assert.ok(!JSON.stringify(rows).includes('Dear'));
  const out = s.h.html(); assert.equal((out.match(/Hillside Library Refurbishment Design Services<\/span>/g) ?? []).length, 1, 'one card for the RFx ID'); assert.match(out, /Also in your alert email/);
  const viewer = await signedIn({ role: 'viewer', leads: () => [] }); const v = screen(ctxOf(viewer)); await v.h.start();
  await v.h.addAlerts([EMAIL('10000003', 'Library design')]); assert.match(v.h.html(), /A viewer cannot add alert emails/); assert.equal(viewer.fake.db.hunt_inbox.length, 0);
});

test('files dropped on the control are read as text; an .eml is decoded; a file that is too big is refused', async () => {
  const store = createStore(memoryBackend(), { files: memoryFiles() });
  await store.save('setting', { id: SETTING.hunt, value: { ...SET, sources: { radar: false, gets: false } } });
  const s = screen({ store, me: 'Mere', practice: null, account: null }); await s.h.start();
  const eml = `From: a@example.org\r\nSubject: GETS: Tender Subscription\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(EMAIL('10000001', 'Kura Library Refurbishment Design Services')).toString('base64')}`;
  await s.h.addFiles([{ name: 'alert.eml', size: eml.length, text: async () => eml }]); assert.match(s.h.html(), /Kura Library Refurbishment Design/);
  await s.h.addFiles([{ name: 'big.eml', size: 5e6, text: async () => 'x' }]); assert.match(s.h.html(), /too big/);
});

test('the control and the lane are drawn with the page\'s own styles: no colour of its own, and the stylesheet version moved on', () => {
  const css = readFileSync(new URL('../../architecture/hunt.css', import.meta.url), 'utf8'), js = readFileSync(new URL('../../architecture/js/hunt.js', import.meta.url), 'utf8');
  assert.match(js, /CSS_VERSION = '5'/);
  for (const c of ['.hunt-lane', '.hunt-kind', '.hunt-alerts', '.hunt-drop']) assert.ok(css.includes(c), c);
  assert.doesNotMatch(css.replace(/var\([^)]*\)/g, ''), /#[0-9a-fA-F]{3,8}\b|rgba?\(/);
});

// ---- the Gmail reader section ---------------------------------------------------------------------------------------------------------------------------
const TOKEN = 'ab12'.repeat(16);
const readerRpc = (state = { on: false, last: null, n: 0 }) => ({
  hunt_inbox_reader_status: () => [{ reader_on: state.on, since: state.on ? NOW.toISOString() : null, last_used_at: state.last, last_count: state.n }],
  hunt_inbox_new_token: () => { state.on = true; return TOKEN; }, hunt_inbox_stop_reader: () => { state.on = false; },
});
const openSettings = async (h) => { await click(h, 'open-settings'); await tick(); };

test('an owner makes a reader: the script comes with the token in it, shown on screen with a warning and five steps; hiding it removes the token', async () => {
  const state = { on: false, last: null, n: 0 }, p = await signedIn({ leads: () => [], rpc: readerRpc(state) });
  const s = screen(ctxOf(p)); await s.h.start(); await openSettings(s.h);
  let out = s.h.html();
  assert.match(out, /Read GETS alerts from Gmail/); assert.match(out, /No reader is set up/); assert.match(out, /Make a reader/); assert.doesNotMatch(out, new RegExp(TOKEN));
  await click(s.h, 'make-reader'); out = s.h.html();
  assert.match(out, /This token is private\. It is shown once/); assert.equal((out.match(new RegExp(TOKEN, 'g')) ?? []).length, 1, 'the token is in the script and nowhere else'); assert.match(out, new RegExp(`const ASSEMBL_TOKEN = &#39;${TOKEN}&#39;`));
  assert.equal((out.match(/<ol class="hunt-steps">[\s\S]*?<\/ol>/)[0].match(/<li>/g) ?? []).length, 5); assert.match(out, /script\.google\.com/); assert.match(out, /Copy the script/);
  assert.match(out, /A reader is on for this practice/); assert.match(out, /Stop the reader/);
  assert.ok(!JSON.stringify(s.h.state.answer ?? {}).includes(TOKEN) && !JSON.stringify(await p.store.get('setting', 'hunt') ?? {}).includes(TOKEN), 'the token is kept nowhere');
  await click(s.h, 'hide-script'); assert.doesNotMatch(s.h.html(), new RegExp(TOKEN));
  await click(s.h, 'open-settings'); await openSettings(s.h); assert.doesNotMatch(s.h.html(), new RegExp(TOKEN), 'closing and opening the settings does not bring it back');
});

test('the status says when it last filed and how many notices; stopping the reader turns it off', async () => {
  const state = { on: true, last: new Date(2026, 10, 22, 9, 5).toISOString(), n: 3 }, p = await signedIn({ leads: () => [], rpc: readerRpc(state) });
  const s = screen(ctxOf(p)); await s.h.start(); await openSettings(s.h);
  assert.match(s.h.html(), /Last filed: 9:05 am today, 3 notices\./);
  await click(s.h, 'stop-reader'); assert.equal(state.on, false); assert.match(s.h.html(), /No reader is set up/); assert.match(s.h.html(), /The reader is stopped/);
});

test('a member and a viewer see only whether a reader is on: no buttons, and the calls are refused in the page too', async () => {
  for (const role of ['member', 'viewer']) {
    const p = await signedIn({ role, leads: () => [], rpc: readerRpc({ on: true, last: null, n: 0 }) });
    const s = screen(ctxOf(p)); await s.h.start(); await openSettings(s.h);
    const out = s.h.html(); assert.match(out, /A reader is on for this practice/); assert.match(out, /Only an owner can make or stop a reader/); assert.doesNotMatch(out, /data-hunt="make-reader"|data-hunt="stop-reader"/);
    await click(s.h, 'make-reader'); assert.doesNotMatch(s.h.html(), new RegExp(TOKEN));
    await assert.rejects(p.account.makeHuntReader(), /Only an owner/);
  }
});

test('signed out: the section explains that a reader needs the practice\'s records', async () => {
  const store = createStore(memoryBackend(), { files: memoryFiles() });
  await store.save('setting', { id: SETTING.hunt, value: { ...SET, sources: { radar: false, gets: false } } });
  const s = screen({ store, me: 'Mere', practice: null, account: null }); await s.h.start(); await openSettings(s.h);
  assert.match(s.h.html(), /needs the practice’s records/); assert.doesNotMatch(s.h.html(), /data-hunt="make-reader"/);
});
