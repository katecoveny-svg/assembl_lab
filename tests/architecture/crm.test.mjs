// Clients: the rules (crm-model.js), the browser store round trip, and the shared store, against the fake of Supabase's client.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryBackend } from '../../architecture/js/store.js';
import { createCloudStore, createSwitch, toRecord, fromRecord, dbId, CloudError, CRM_KINDS } from '../../architecture/js/cloud.js';
import {
  STAGES, STAGE_KEYS, OPEN_STAGES, QUIET_DAYS, newContact, newEnquiry, newActivity, initials, parseValue, money, isOpen, isQuiet, isOverdue, quietDays, lastTouch,
  missingStep, nextSteps, moveEnquiry, followUpDraft, timeline, sameId, dayKey, daysBetween, dayName, localInput, fromLocalInput, cardFacts,
} from '../../architecture/js/crm-model.js';
import { fakeSupabase } from './fake-supabase.mjs';

// "now" is built from local parts so the tests give the same answers in any time zone
const NOW = new Date(2026, 10, 22, 10, 0, 0); // Sun 22 Nov 2026, 10:00
const at = (y, m, d, h = 9) => new Date(y, m - 1, d, h, 0, 0).toISOString();
const PRACTICE = { id: '11111111-1111-4111-8111-111111111111', name: 'Tui Architects', role: 'member' };

const enq = (o = {}) => newEnquiry({ title: 'Hill house', owner: 'Kate', next_action: 'Send the proposal', next_action_due: '2026-11-28', now: at(2026, 11, 20), ...o });
const log = (e, daysAgo, kind = 'note', body = 'Spoke') => newActivity({ enquiry_id: e.id, kind, body, at: new Date(2026, 10, 22 - daysAgo, 9).toISOString(), who: 'Kate' });

// ---- record shapes ------------------------------------------------------------------------------------------------------
test('the stages are the six a person asked for, and three are open', () => {
  assert.deepEqual(STAGE_KEYS, ['new', 'meeting', 'proposal', 'won', 'lost', 'paused']);
  assert.deepEqual(OPEN_STAGES, ['new', 'meeting', 'proposal']);
});

test('a contact, an enquiry and a history line have the shapes the tables expect', () => {
  const c = newContact({ name: '  A. Client ', email: 'a@client.example', organisation: 'Hill Trust', now: NOW });
  assert.deepEqual(Object.keys(c).sort(), ['archived', 'created_at', 'email', 'id', 'name', 'notes', 'organisation', 'phone', 'role']);
  assert.match(c.id, /^ct_/); assert.equal(c.name, 'A. Client'); assert.equal(c.archived, false);
  const e = newEnquiry({ title: 'Hill house', contact_id: c.id, value_nzd: 85000, now: NOW });
  assert.deepEqual(Object.keys(e).sort(), ['archived', 'contact_id', 'created_at', 'id', 'next_action', 'next_action_due', 'owner', 'project_id', 'source', 'stage', 'title', 'value_nzd']);
  assert.match(e.id, /^en_/); assert.equal(e.stage, 'new'); assert.equal(e.project_id, ''); assert.equal(e.archived, false);
  assert.equal(newEnquiry({ title: 'x' }).value_nzd, null, 'no value until a person types one');
  const a = newActivity({ enquiry_id: e.id, contact_id: c.id, kind: 'call', body: ' Rang about the site ', at: at(2026, 11, 20, 14), who: 'Kate' });
  assert.deepEqual(Object.keys(a).sort(), ['at', 'body', 'contact_id', 'created_at', 'enquiry_id', 'id', 'kind', 'who']);
  assert.equal(a.at, at(2026, 11, 20, 14), '"at" is the time the person gave, not the time it was typed');
  assert.match(a.id, /^ca_/); assert.equal(a.body, 'Rang about the site');
});

test('empty or wrong records are refused in plain words', () => {
  assert.throws(() => newContact({ name: ' ' }), /name/);
  assert.throws(() => newEnquiry({ title: '' }), /title/);
  assert.throws(() => newEnquiry({ title: 'x', next_action_due: '28/11/2026' }), /date/);
  assert.throws(() => newActivity({ enquiry_id: 'en_1', kind: 'text', body: 'x' }), /kind/);
  assert.throws(() => newActivity({ enquiry_id: 'en_1', body: '' }), /what happened/);
  assert.throws(() => newActivity({ kind: 'note', body: 'x' }), /belongs to/);
  assert.throws(() => newActivity({ enquiry_id: 'en_1', body: 'x', at: 'not a date' }), /date and time/);
});

test('a value is only what a person typed: dollars as digits, nothing guessed', () => {
  assert.equal(parseValue(''), null);
  assert.equal(parseValue('  '), null);
  assert.equal(parseValue('85000'), 85000);
  assert.equal(parseValue('$85,000'), 85000);
  assert.equal(parseValue('85 000.50'), 85000.5);
  for (const bad of ['85k', 'about 80000', '-5', '1e5', '85000 to 90000']) assert.throws(() => parseValue(bad), /dollars/, bad);
  assert.equal(money(85000), '$85,000');
  assert.equal(money(null), '');
  assert.equal(money(''), '');
});

test('initials: two letters, from the first and last word', () => {
  assert.equal(initials('A. Client'), 'AC');
  assert.equal(initials('Mere Ngata-Smith'), 'MN');
  assert.equal(initials('Hill Trust'), 'HT');
  assert.equal(initials('Tui'), 'TU');
  assert.equal(initials('  '), '');
  assert.equal(initials('Āwhina Pōtiki'), 'ĀP');
});

// ---- quiet and overdue -------------------------------------------------------------------------------------------------
test('quiet: an open enquiry with nothing logged for 14 days or more', () => {
  const e = enq({ now: at(2026, 10, 1) });
  assert.equal(QUIET_DAYS, 14);
  assert.equal(isQuiet(e, [log(e, 13)], NOW), false, '13 days is not quiet');
  assert.equal(isQuiet(e, [log(e, 14)], NOW), true, '14 days is');
  assert.equal(quietDays(e, [log(e, 14), log(e, 30)], NOW), 14, 'the latest line is the one that counts');
  assert.equal(isQuiet(e, [log(e, 20), log(e, 2)], NOW), false, 'one recent line ends it');
  assert.equal(isQuiet(e, [], NOW), true, 'nothing ever logged: it counts from the day it was made');
  assert.equal(isQuiet(enq({ now: at(2026, 11, 20) }), [], NOW), false, 'made two days ago');
  // a line on another enquiry does not count
  const other = enq({ title: 'Other' });
  assert.equal(isQuiet(e, [log(other, 1)], NOW), true);
  // a stage move is a line too
  assert.equal(isQuiet(e, [log(e, 3, 'stage', 'Moved')], NOW), false);
  // only open enquiries go quiet
  for (const stage of ['won', 'lost', 'paused']) assert.equal(isQuiet({ ...e, stage }, [], NOW), false, stage);
  assert.equal(isQuiet({ ...e, archived: true }, [], NOW), false);
  assert.equal(lastTouch(e, [log(e, 5)]), new Date(2026, 10, 17, 9).toISOString());
});

test('overdue: an open enquiry whose next step was due before today', () => {
  const e = enq({ next_action_due: '2026-11-21' });
  assert.equal(isOverdue(e, NOW), true);
  assert.equal(isOverdue({ ...e, next_action_due: '2026-11-22' }, NOW), false, 'due today is not overdue');
  assert.equal(isOverdue({ ...e, next_action_due: '' }, NOW), false);
  assert.equal(isOverdue({ ...e, stage: 'won' }, NOW), false);
  assert.equal(isOverdue({ ...e, stage: 'paused' }, NOW), false);
  assert.equal(dayKey(NOW), '2026-11-22');
  assert.equal(daysBetween(new Date(2026, 10, 1, 23, 59), new Date(2026, 10, 2, 0, 1)), 1, 'calendar days, not 24-hour blocks');
});

test('cardFacts says only what is true: the value if typed, the date, the flags', () => {
  const e = enq({ value_nzd: 85000, next_action_due: '2026-11-20' });
  const f = cardFacts(e, [log(e, 20)], NOW);
  assert.deepEqual([f.value, f.due, f.overdue, f.quiet, f.days, f.missing], ['$85,000', '20 Nov', true, true, 20, []]);
  assert.equal(cardFacts(enq(), [], NOW).value, '');
});

// ---- the next-steps queue ----------------------------------------------------------------------------------------------
test('missing: who, what and when', () => {
  assert.deepEqual(missingStep(enq()), []);
  assert.deepEqual(missingStep(enq({ owner: '' })), ['who']);
  assert.deepEqual(missingStep(enq({ next_action: ' ' })), ['what']);
  assert.deepEqual(missingStep(enq({ next_action_due: '' })), ['when']);
  assert.deepEqual(missingStep(enq({ owner: '', next_action: '', next_action_due: '' })), ['who', 'what', 'when']);
});

test('the queue lists open enquiries only, missing steps first, then the soonest due', () => {
  const a = enq({ title: 'A late', next_action_due: '2026-11-20' });
  const b = enq({ title: 'B soon', next_action_due: '2026-11-25' });
  const c = enq({ title: 'C no date', next_action_due: '' });
  const d = enq({ title: 'D nothing', owner: '', next_action: '', next_action_due: '' });
  const e = enq({ title: 'E no owner', owner: '' });
  const won = { ...enq({ title: 'Won one', owner: '' }), stage: 'won' };
  const paused = { ...enq({ title: 'Paused one', owner: '' }), stage: 'paused' };
  const gone = { ...enq({ title: 'Archived', owner: '' }), archived: true };
  const q = nextSteps([b, won, a, c, paused, d, gone, e], [], NOW);
  assert.deepEqual(q.map((r) => r.enquiry.title), ['D nothing', 'E no owner', 'C no date', 'A late', 'B soon']);
  assert.deepEqual(q[0].missing, ['who', 'what', 'when']);
  assert.equal(q[3].overdue, true);
  assert.equal(q[4].overdue, false);
  assert.ok(q.every((r) => isOpen(r.enquiry)));
  assert.deepEqual(nextSteps([], [], NOW), []);
});

test('the queue is the same whatever order the records arrive in', () => {
  const list = ['a', 'b', 'c', 'd'].map((t, i) => enq({ title: t, next_action_due: `2026-12-0${4 - i}`, owner: i === 1 ? '' : 'Kate', id: `en_${i}` }));
  const want = nextSteps(list, [], NOW).map((r) => r.enquiry.id);
  assert.deepEqual(nextSteps([...list].reverse(), [], NOW).map((r) => r.enquiry.id), want);
});

// ---- moving a stage -----------------------------------------------------------------------------------------------------
test('a move returns the enquiry in its new stage and a "stage" line to keep with it', () => {
  const e = enq({ contact_id: 'ct_1' });
  const got = moveEnquiry(e, 'meeting', { who: 'Kate', now: NOW });
  assert.equal(got.enquiry.stage, 'meeting');
  assert.equal(e.stage, 'new', 'the original is not changed');
  assert.equal(got.activity.kind, 'stage');
  assert.equal(got.activity.body, 'Moved from New to Meeting.');
  assert.deepEqual([got.activity.enquiry_id, got.activity.contact_id, got.activity.who, got.activity.at], [e.id, 'ct_1', 'Kate', NOW.toISOString()]);
  assert.equal(moveEnquiry(e, 'new', { now: NOW }), null, 'already there: nothing to write');
  assert.throws(() => moveEnquiry(e, 'done'), /not a stage/);
  for (const to of STAGE_KEYS.filter((k) => k !== 'new')) assert.equal(moveEnquiry(e, to, { now: NOW }).enquiry.stage, to);
});

// ---- the draft ------------------------------------------------------------------------------------------------------------
test('the follow-up draft comes from the last thing that happened and the next step', () => {
  const c = newContact({ name: 'A. Client' });
  const e = enq({ contact_id: c.id, next_action: 'Send the proposal', next_action_due: '2026-11-28' });
  const meeting = newActivity({ enquiry_id: e.id, kind: 'meeting', body: 'On site', at: at(2026, 11, 18) });
  const moved = newActivity({ enquiry_id: e.id, kind: 'stage', body: 'Moved from New to Meeting.', at: at(2026, 11, 19) });
  const draft = followUpDraft({ enquiry: e, contact: c, acts: [meeting, moved], me: 'Kate', now: NOW });
  assert.equal(draft, ['Hi A.,', '', 'Thanks for meeting on Wed 18 Nov.', 'Next, send the proposal, by Sat 28 Nov.', 'If anything has changed on your side, let me know.', '', 'Ngā mihi,', 'Kate'].join('\n'));
  assert.ok(draft.length < 400, 'short');
  assert.ok(!/(!|\bAI\b|exciting|delighted)/.test(draft), 'no hype');
});

test('the draft for each kind of last line, and for none', () => {
  const e = enq({ next_action: '', next_action_due: '', owner: '' });
  const d = (acts, extra = {}) => followUpDraft({ enquiry: { ...e, ...extra }, acts, now: NOW });
  const mk = (kind) => newActivity({ enquiry_id: e.id, kind, body: 'x', at: at(2026, 11, 20) });
  assert.match(d([mk('call')]), /Thanks for the call on Fri 20 Nov\./);
  assert.match(d([mk('email')]), /Following up on my email of Fri 20 Nov about Hill house\./);
  assert.match(d([mk('note')]), /Following up on Hill house\./);
  assert.match(d([]), /I am getting in touch about Hill house\./);
  assert.match(d([]), /^Hi,\n/, 'no contact: no name');
  assert.match(d([]), /Tell me what suits as a next step/, 'no next step: it asks, and does not make one up');
  assert.match(d([], { next_action: 'Book a site visit', next_action_due: '' }), /Next, book a site visit\./);
  assert.ok(!/Kate/.test(d([])), 'no name to sign with: none is invented');
  assert.equal(followUpDraft({}), '');
});

test('timeline puts the newest first', () => {
  const e = enq();
  const rows = [log(e, 9, 'note', 'old'), log(e, 1, 'call', 'new'), log(e, 5, 'email', 'mid')];
  assert.deepEqual(timeline(rows).map((a) => a.body), ['new', 'mid', 'old']);
});

test('ids with and without the browser’s prefix are the same record', () => {
  const u = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';
  assert.ok(sameId(`en_${u}`, u));
  assert.ok(sameId(u.toUpperCase(), `ct_${u}`));
  assert.ok(!sameId('en_a', 'en_b'));
  assert.ok(!sameId('', ''));
});

test('the date and time box round-trips as the time the person meant', () => {
  const v = localInput(new Date(2026, 10, 20, 15, 5));
  assert.equal(v, '2026-11-20T15:05');
  assert.equal(fromLocalInput(v), new Date(2026, 10, 20, 15, 5).toISOString());
  assert.equal(fromLocalInput(''), '');
  assert.equal(fromLocalInput('tomorrow'), '');
  assert.equal(dayName('2026-11-28'), 'Sat 28 Nov');
});

// ---- the browser store ---------------------------------------------------------------------------------------------------
test('browser store: contacts, enquiries and history save, read back, filter and survive a reload', async () => {
  const backend = memoryBackend();
  let s = createStore(backend);
  const c = newContact({ name: 'A. Client', organisation: 'Hill Trust', now: NOW });
  const e = newEnquiry({ title: 'Hill house', contact_id: c.id, value_nzd: 85000, source: 'Referral', now: NOW });
  const a = newActivity({ enquiry_id: e.id, contact_id: c.id, kind: 'meeting', body: 'On site', at: at(2026, 11, 20, 14), who: 'Kate' });
  for (const [k, r] of [['contact', c], ['enquiry', e], ['crm_activity', a]]) assert.deepEqual(await s.save(k, r), r);
  s = createStore(backend); // a reload: a new store on the same storage
  assert.deepEqual(await s.get('contact', c.id), c);
  assert.deepEqual(await s.get('enquiry', e.id), e);
  assert.deepEqual(await s.list('crm_activity', { enquiry_id: e.id }), [a]);
  assert.deepEqual(await s.list('enquiry', { contact_id: 'nobody' }), []);
  // an archive is a save, and the record stays
  await s.save('contact', { ...c, archived: true });
  assert.equal((await s.get('contact', c.id)).archived, true);
  assert.equal((await s.list('contact')).length, 1);
  // other kinds are not disturbed, and the project list stays as it was
  assert.deepEqual(await s.list('project'), []);
});

test('a stage move is saved as the enquiry and its history line together, in the browser store', async () => {
  const s = createStore(memoryBackend());
  const e = enq(); await s.save('enquiry', e);
  const m = moveEnquiry(e, 'proposal', { who: 'Kate', now: NOW });
  await s.save('enquiry', m.enquiry); await s.save('crm_activity', m.activity);
  assert.equal((await s.get('enquiry', e.id)).stage, 'proposal');
  const lines = await s.list('crm_activity', { enquiry_id: e.id });
  assert.deepEqual(lines.map((l) => [l.kind, l.body]), [['stage', 'Moved from New to Proposal.']]);
});

// ---- the shared store ------------------------------------------------------------------------------------------------------
function setup({ role = 'member' } = {}) {
  const fake = fakeSupabase(), local = createStore(memoryBackend());
  const cloud = createCloudStore({ client: fake, practice: { ...PRACTICE, role }, local });
  return { fake, local, cloud };
}
const says = (re, code) => (err) => { assert.ok(err instanceof CloudError, `a CloudError, got ${err}`); assert.match(err.message, re); if (code) assert.equal(err.code, code); return true; };

test('cloud mapping: each kind is a flat row with the practice, and comes back as the page holds it', () => {
  const c = newContact({ name: 'A. Client', email: 'a@client.example', organisation: 'Hill Trust', notes: 'Prefers calls', now: NOW, id: 'ct_3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b' });
  const e = { ...newEnquiry({ title: 'Hill house', contact_id: c.id, value_nzd: 85000, source: 'Referral', next_action: 'Visit', next_action_due: '2026-11-28', owner: 'Kate', now: NOW, id: 'en_4f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b' }), stage: 'won', project_id: 'p_5f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b', extra_note: 'kept' };
  const a = newActivity({ enquiry_id: e.id, contact_id: c.id, kind: 'call', body: 'Rang', at: at(2026, 11, 20, 14), who: 'Kate', id: 'ca_6f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b', now: NOW });
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  for (const [kind, row] of [['contact', c], ['enquiry', e], ['crm_activity', a]]) {
    const rec = JSON.parse(JSON.stringify(toRecord(kind, row, { practice_id: PRACTICE.id })));
    assert.match(rec.id, UUID, kind);
    assert.equal(rec.practice_id, PRACTICE.id, kind);
    assert.ok(!('project_id' in rec) || kind === 'enquiry', 'only an enquiry points at a project');
    const back = fromRecord(kind, rec);
    assert.equal(back.id, dbId(row.id));
    for (const f of ['contact_id', 'enquiry_id', 'project_id']) if (row[f]) assert.equal(back[f], dbId(row[f]), f);
    const { id, contact_id, enquiry_id, project_id, ...rest } = row;
    for (const [k, v] of Object.entries(rest)) assert.deepEqual(back[k], v, `${kind}.${k}`);
  }
  const rec = toRecord('enquiry', e, { practice_id: PRACTICE.id });
  assert.equal(rec.value_nzd, 85000);
  assert.equal(rec.next_action_due, '2026-11-28');
  assert.deepEqual(rec.extra, { extra_note: 'kept' }, 'a field the table does not know rides in extra');
  // nothing typed: empty text is null in the table and '' on the page; no value stays null
  const blank = toRecord('enquiry', newEnquiry({ title: 'x', now: NOW }), { practice_id: PRACTICE.id });
  assert.deepEqual([blank.value_nzd, blank.contact_id, blank.project_id, blank.next_action, blank.next_action_due, blank.owner], [null, null, null, null, null, null]);
  const back = fromRecord('enquiry', blank);
  assert.deepEqual([back.value_nzd, back.contact_id, back.next_action_due, back.stage, back.archived], [null, '', '', 'new', false]);
  assert.deepEqual(CRM_KINDS, ['contact', 'enquiry', 'crm_activity']);
});

test('cloud: save, read, list and archive; everything is written under the practice', async () => {
  const { fake, cloud } = setup();
  const c = await cloud.save('contact', newContact({ name: 'A. Client', now: NOW }));
  const e = await cloud.save('enquiry', newEnquiry({ title: 'Hill house', contact_id: c.id, value_nzd: 85000, now: NOW }));
  assert.equal(fake.db.contact[0].practice_id, PRACTICE.id);
  assert.equal(fake.db.enquiry[0].practice_id, PRACTICE.id);
  assert.equal(fake.db.enquiry[0].contact_id, fake.db.contact[0].id, 'the link carries the database id');
  assert.equal((await cloud.get('enquiry', e.id)).value_nzd, 85000);
  assert.equal((await cloud.list('enquiry', { contact_id: c.id })).length, 1);
  assert.deepEqual(await cloud.list('enquiry', { contact_id: 'nobody' }), []);
  assert.equal(await cloud.get('enquiry', '99999999-9999-4999-8999-999999999999'), null);
  await cloud.save('enquiry', { ...e, archived: true, stage: 'paused' });
  assert.equal(fake.db.enquiry.length, 1, 'an archive changes the row; it does not add or remove one');
  assert.equal((await cloud.get('enquiry', e.id)).archived, true);
  // no request carried the shared records' kinds to the browser store
  assert.deepEqual(await cloud.list('contact').then((r) => r.map((x) => x.name)), ['A. Client']);
});

test('cloud: history is added once and never changed or removed', async () => {
  const { fake, cloud } = setup();
  const c = await cloud.save('contact', newContact({ name: 'A. Client', now: NOW }));
  const a = await cloud.save('crm_activity', newActivity({ contact_id: c.id, kind: 'note', body: 'Met at the market', at: at(2026, 11, 20), who: 'Kate' }));
  assert.equal(fake.db.crm_activity.length, 1);
  assert.equal(fake.db.crm_activity[0].kind, 'note');
  assert.equal(new Date(a.at).toISOString(), at(2026, 11, 20));
  await assert.rejects(cloud.save('crm_activity', { ...a, body: 'changed' }), says(/cannot be changed/, 'append_only'));
  await assert.rejects(cloud.remove('crm_activity', a.id), says(/cannot be removed/, 'append_only'));
  assert.equal(fake.db.crm_activity[0].body, 'Met at the market');
  assert.deepEqual(fake.writes().filter((w) => w.table === 'crm_activity').map((w) => w.action), ['upsert', 'upsert']);
});

test('cloud: contacts and enquiries are archived, never removed', async () => {
  const { fake, cloud } = setup();
  const c = await cloud.save('contact', newContact({ name: 'A. Client', now: NOW }));
  const e = await cloud.save('enquiry', newEnquiry({ title: 'x', contact_id: c.id, now: NOW }));
  await assert.rejects(cloud.remove('contact', c.id), says(/archived, not removed/, 'kept'));
  await assert.rejects(cloud.remove('enquiry', e.id), says(/archived, not removed/, 'kept'));
  assert.equal(fake.db.contact.length + fake.db.enquiry.length, 2);
  assert.ok(!fake.log.some((o) => o.action === 'delete'), 'no delete request was made');
});

test('cloud: a viewer reads and cannot write; nothing is sent for them', async () => {
  const { fake, cloud } = setup({ role: 'viewer' });
  await assert.rejects(cloud.save('contact', newContact({ name: 'x', now: NOW })), says(/viewer/, 'read_only'));
  await assert.rejects(cloud.save('enquiry', newEnquiry({ title: 'x', now: NOW })), says(/viewer/, 'read_only'));
  await assert.rejects(cloud.save('crm_activity', newActivity({ contact_id: 'ct_1', body: 'x' })), says(/viewer/, 'read_only'));
  assert.equal(fake.writes().length, 0);
  assert.deepEqual(await cloud.list('enquiry'), []);
});

test('cloud: a refusal from the database comes back in plain words, never the database’s own text', async () => {
  const { fake, cloud } = setup();
  fake.viewer = true; // the database treats this person as a viewer even though the page thought otherwise
  await assert.rejects(cloud.save('enquiry', newEnquiry({ title: 'Secret site', now: NOW })), (err) => {
    assert.ok(err instanceof CloudError); assert.equal(err.code, 'refused'); assert.ok(!/Secret site|row-level/.test(err.message)); return true;
  });
});

test('the page’s one switch hands the Clients kinds to the browser or the shared records', async () => {
  const { local, cloud, fake } = setup();
  const sw = createSwitch(local);
  const e = newEnquiry({ title: 'Browser one', now: NOW });
  await sw.save('enquiry', e);
  assert.equal((await sw.list('enquiry')).length, 1);
  assert.equal(fake.db.enquiry, undefined, 'signed out: nothing went to the shared records');
  sw.use(cloud);
  assert.deepEqual(await sw.list('enquiry'), [], 'signed in: the practice’s own records, not this browser’s');
  await sw.save('enquiry', newEnquiry({ title: 'Shared one', now: NOW }));
  assert.equal(fake.db.enquiry.length, 1);
  sw.use(null);
  assert.deepEqual((await sw.list('enquiry')).map((r) => r.title), ['Browser one']);
});
