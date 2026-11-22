// Money: the dial's rules, the money and time maths, the pipeline forecast, resourcing, who may change what, both
// stores, the instruments and the add-on hooks. All names and figures here are invented.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newProject, STAGE_KEYS, SAMPLE_ID, sampleProject } from '../../architecture/js/model.js';
import { createStore, memoryBackend, KINDS } from '../../architecture/js/store.js';
import { createCloudStore, toRecord, fromRecord, dbId, CloudError, MONEY_KINDS } from '../../architecture/js/cloud.js';
import * as M from '../../architecture/js/money-model.js';
import { healthDial, practiceDial, feeGauge, needleAngle, animateDials, _forget } from '../../architecture/js/dial.js';
import { registerProjectTab, registerProjectHead, registerWall, registerSettings, projectTabs, projectHeads, wallParts, settingsParts, ADDONS, _reset } from '../../architecture/js/modules.js';
import { fakeSupabase } from './fake-supabase.mjs';

const T = '2026-11-22';
const PRACTICE = { id: '22222222-2222-4222-8222-222222222222', name: 'Test Practice', role: 'member' };
const PID = 'p_11111111-1111-4111-8111-111111111111';

/** a project in a stage, with a share of that stage's tasks done, and money as given */
function bundle({ at = 'developed', done = 0.5, money = {}, id = PID } = {}) {
  const b = newProject({ name: 'Ridge house', id, now: '2026-08-01T00:00:00Z' });
  const i = STAGE_KEYS.indexOf(at);
  b.stages.forEach((s, j) => { s.status = j < i ? 'done' : j === i ? 'in_progress' : 'not_started'; });
  const mine = b.tasks.filter((t) => t.stage === at);
  mine.forEach((t, j) => { t.status = j < Math.round(mine.length * done) ? 'done' : 'todo'; });
  b.project.money = money;
  return b;
}
const hours = (n, pid = PID) => Array.from({ length: n }, (_, i) => ({ id: `te_${i}`, project_id: pid, person: 'A. Person', date: '2026-11-01', hours: 1 }));
const inv = (o) => ({ id: `in_${o.number}`, project_id: PID, void: false, issued: '', due: '', paid: '', amount_nzd: 1000, ...o });

// ---- the dial: each state from the records ------------------------------------------------------------------------------
test('All go: on time and on budget, both worked out from typed figures', () => {
  const b = bundle({ money: { fee: 60000, targets: { developed: '2026-12-10' } } }); // 2 of 7 done and half of stage 3: 36%
  const h = M.health({ b, time: hours(70), settings: { rate: 150 }, today: T }); // 70 × 150 = 10,500 = 18% of the fee
  assert.equal(h.state, 'allgo');
  assert.equal(h.label, 'All go');
  assert.equal(h.meaning, 'On budget and on time');
  assert.equal(h.source, 'worked');
  assert.equal(h.line, 'Worked out: stage 3 on time, 18% of fee used at 36% progress');
  assert.deepEqual(h.watch, []);
});

test('Go: on target when only one measure can be told, and Go with a watch when one is off', () => {
  const onlyTime = M.health({ b: bundle({ money: { targets: { developed: '2026-12-10' } } }), today: T });
  assert.equal(onlyTime.state, 'go');
  assert.equal(onlyTime.line, 'Worked out: stage 3 on time');
  assert.equal(onlyTime.meaning, 'On target');
  const late = M.health({ b: bundle({ money: { fee: 60000, targets: { developed: '2026-11-17' } } }), time: hours(10), settings: { rate: 150 }, today: T });
  assert.equal(late.state, 'go');
  assert.deepEqual(late.watch, ['stage 3 is 5 days past its target']);
  assert.equal(late.line, 'Worked out: 3% of fee used at 36% progress', 'what is fine stays in the line; what is off is only in the watch');
  assert.equal(late.meaning, '', 'it does not say on target while something wants watching');
  const over = M.health({ b: bundle({ at: 'concept', done: 0, money: { fee: 28000, targets: { concept: '2026-12-20' } } }), time: hours(60), settings: { rate: 150 }, today: T });
  assert.equal(over.state, 'go');
  assert.deepEqual(over.watch, ['32% of fee used at 14% progress']);
});

test('On hold: set by a person, with what it waits on, who and when', () => {
  const b = bundle({ money: { fee: 60000, targets: { developed: '2026-12-10' }, hold: { kind: 'site', reason: 'Waiting on the dig off', by: 'A. Person', at: '2026-11-16T09:00:00Z' } } });
  const h = M.health({ b, settings: { rate: 150 }, today: T });
  assert.equal(h.state, 'hold');
  assert.equal(h.source, 'hold');
  assert.equal(h.line, 'Held by A. Person, 16 Nov, for site works (dig off): Waiting on the dig off');
});

test('Payment pending: worked out from an unpaid invoice past its due day, or a person’s flag', () => {
  const b = bundle({ money: { fee: 60000, targets: { developed: '2026-12-10' } } });
  const invoices = [inv({ number: '1040', issued: '2026-10-13', due: '2026-11-12' }), inv({ number: '1041', issued: '2026-10-20', due: '2026-11-20' }), inv({ number: '1039', issued: '2026-10-01', due: '2026-10-15', paid: '2026-10-14' })];
  const h = M.health({ b, invoices, today: T });
  assert.equal(h.state, 'payment');
  assert.equal(h.source, 'worked');
  assert.equal(h.line, 'Worked out: invoice 1040 was due 12 Nov and is not paid, and 1 more');
  // due today is not overdue; paid and void ones never are
  assert.equal(M.health({ b, invoices: [inv({ number: '1', issued: '2026-11-01', due: T })], today: T }).state, 'go');
  assert.equal(M.health({ b, invoices: [inv({ number: '2', issued: '2026-10-01', due: '2026-10-02', void: true, void_reason: 'x' })], today: T }).state, 'go');
  const flagged = M.health({ b: bundle({ money: { payment: { reason: 'Stage 2 invoice disputed', by: 'A. Person', at: '2026-11-21T09:00:00Z' } } }), today: T });
  assert.equal(flagged.state, 'payment');
  assert.equal(flagged.source, 'flag');
  assert.equal(flagged.line, 'Flagged by A. Person, 21 Nov: Stage 2 invoice disputed');
});

test('order: set by hand beats everything; payment pending beats a hold, which is still mentioned', () => {
  const hold = { kind: 'consent', reason: 'Consent lodged', by: 'A. Person', at: '2026-11-10T00:00:00Z' };
  const both = bundle({ money: { hold, payment: { reason: 'Unpaid', by: 'A. Person', at: '2026-11-11T00:00:00Z' } } });
  const h = M.health({ b: both, today: T });
  assert.equal(h.state, 'payment');
  assert.equal(h.also.length, 1);
  assert.match(h.also[0], /^Held by A\. Person/);
  const set = bundle({ money: { hold, set: { state: 'allgo', reason: 'Client confirmed the consent is through', by: 'B. Person', at: '2026-11-22T01:00:00Z' } } });
  const s = M.health({ b: set, today: T });
  assert.equal(s.state, 'allgo');
  assert.equal(s.source, 'set');
  assert.match(s.line, /^Set by B\. Person, 22 Nov$/);
  assert.equal(s.reason, 'Client confirmed the consent is through');
});

test('missing data says not enough to tell, and what it needs', () => {
  const h = M.health({ b: bundle({ at: 'predesign', done: 0 }), today: T });
  assert.equal(h.state, null);
  assert.equal(h.label, 'Not enough to tell');
  assert.equal(h.source, 'none');
  assert.equal(h.line, 'Needs a fee (or budget hours) and a target date for stage 1');
  const feeNoRate = M.health({ b: bundle({ money: { fee: 50000 } }), today: T });
  assert.equal(feeNoRate.line, 'Needs an hourly rate (or budget hours) and a target date for stage 3');
});

test('the practice renames the four words; colours and meanings stay', () => {
  const words = M.labelsOf({ allgo: 'Sweet as', go: '  ', hold: 'x'.repeat(40) });
  assert.deepEqual(words, { payment: 'Payment pending', hold: 'x'.repeat(24), go: 'Go', allgo: 'Sweet as' });
  const h = M.health({ b: bundle({ money: { targets: { developed: '2026-12-10' } } }), settings: { labels: { go: 'Away' } }, today: T });
  assert.equal(h.label, 'Away');
  assert.equal(h.meaning, 'On target');
  assert.deepEqual(M.HEALTH_KEYS, ['payment', 'hold', 'go', 'allgo']);
});

// ---- money and time maths ------------------------------------------------------------------------------------------------
test('progress: done stages count in full, the stage in hand by its tasks done, by the typed split or equally', () => {
  assert.equal(M.progress(bundle({ at: 'predesign', done: 0 })).value, 0);
  assert.ok(Math.abs(M.progress(bundle({ at: 'developed', done: 0.5 })).value - 2.5 / 7) < 1e-9);
  const split = { predesign: 5, concept: 15, developed: 20, detailed: 35, contract: 15, observation: 5, completion: 5 };
  const p = M.progress(bundle({ at: 'developed', done: 0.5 }), split);
  assert.ok(Math.abs(p.value - 0.3) < 1e-9);
  assert.equal(p.how, 'the fee split typed for this project');
  const all = bundle(); all.stages.forEach((s) => { s.status = 'done'; });
  assert.equal(M.progress(all).value, 1);
});

test('fee used and fee left: hours × rate against the fee; by hours when there is no fee and rate; with leeway', () => {
  const b = bundle({ money: { fee: 60000 } });
  const bud = M.budget({ b, time: hours(40), rate: 150 });
  assert.equal(bud.basis, 'fee'); assert.equal(bud.cost, 6000); assert.equal(bud.used, 0.1); assert.equal(bud.left, 54000); assert.equal(bud.rateFrom, 'practice');
  assert.deepEqual(M.profit(bud), { fee: 60000, cost: 6000, left: 54000, share: 0.9 });
  const own = M.budget({ b: bundle({ money: { fee: 60000, rate: 120 } }), time: hours(40), rate: 150 });
  assert.equal(own.cost, 4800); assert.equal(own.rateFrom, 'project', 'the project’s own rate wins');
  const byHours = M.budget({ b: bundle({ money: { hours: 400 } }), time: hours(100) });
  assert.equal(byHours.basis, 'hours'); assert.equal(byHours.used, 0.25); assert.equal(byHours.state, 'ok');
  assert.equal(M.profit(byHours), null, 'no fee left without a fee and a rate');
  const tight = M.budget({ b: bundle({ money: { fee: 10000 } }), time: hours(26), rate: 150 }); // 39% used at 36%
  assert.equal(tight.state, 'over');
  assert.equal(M.budget({ b: bundle({ money: { fee: 10000 } }), time: hours(26), rate: 150, leeway: 5 }).state, 'ok');
  const none = M.budget({ b: bundle(), time: hours(5) });
  assert.equal(none.state, null); assert.deepEqual(none.missing, ['fee', 'rate', 'hours']);
  assert.equal(M.budget({ b, time: [...hours(10), ...hours(30, 'p_other')], rate: 100 }).hours, 10, 'only this project’s time counts');
});

test('on time against the stage targets', () => {
  assert.equal(M.onTime(bundle({ money: { targets: { developed: '2026-11-22' } } }), undefined, T).state, 'ok', 'due today is still on time');
  const late = M.onTime(bundle({ money: { targets: { concept: '2026-11-01', developed: '2026-12-30' } } }), undefined, T);
  assert.equal(late.state, 'ok', 'a done stage that finished late is not late now');
  const later = M.onTime(bundle({ money: { targets: { developed: '2026-12-30', detailed: '2026-11-20' } } }), undefined, T);
  assert.equal(later.state, 'late'); assert.equal(later.stage, 'detailed'); assert.equal(later.days, 2);
  assert.equal(M.onTime(bundle(), undefined, T).state, null);
});

test('invoices: paid, due, overdue, not issued, void', () => {
  assert.equal(M.invoiceStatus(inv({ number: '1', issued: '2026-11-01', due: '2026-11-21' }), T), 'overdue');
  assert.equal(M.invoiceStatus(inv({ number: '1', issued: '2026-11-01', due: '2026-11-22' }), T), 'due');
  assert.equal(M.invoiceStatus(inv({ number: '1', issued: '2026-11-01', due: '2026-11-21', paid: '2026-11-22' }), T), 'paid');
  assert.equal(M.invoiceStatus(inv({ number: '1' }), T), 'draft');
  assert.equal(M.invoiceStatus(inv({ number: '1', void: true }), T), 'void');
});

// ---- the practice's month and the pipeline (ported from forecast.ts) ---------------------------------------------------------
test('practice settings: a month unless a year is chosen; nothing filled in that was not typed', () => {
  const s = M.practiceMoney(null);
  assert.equal(s.period, 'month'); assert.equal(s.counts, 'issued');
  assert.deepEqual([s.break_even, s.target_low, s.target_high, s.rate], [null, null, null, null]);
  assert.deepEqual(s.chances, { new: null, meeting: null, proposal: null, paused: null });
  assert.deepEqual(M.monthly({ break_even: 40000, target_low: 50000, target_high: 65000 }), { breakEven: 40000, low: 50000, high: 65000, perYear: false });
  assert.deepEqual(M.monthly({ period: 'year', break_even: 480000, target_low: 600000, target_high: 780000 }), { breakEven: 40000, low: 50000, high: 65000, perYear: true });
  assert.equal(M.practiceMoney({ chances: { new: 150, meeting: '30' } }).chances.new, null, 'not a percent: left out');
  assert.equal(M.practiceMoney({ chances: { meeting: '30' } }).chances.meeting, 30);
});

test('this month’s revenue: invoices issued, or paid, that month; void ones never; against break-even and the band', () => {
  const list = [inv({ number: 'a', issued: '2026-11-02', amount_nzd: 20000 }), inv({ number: 'b', issued: '2026-10-28', paid: '2026-11-05', amount_nzd: 15000 }), inv({ number: 'c', issued: '2026-11-10', amount_nzd: 9999, void: true })];
  assert.equal(M.revenueIn(list, '2026-11', 'issued').total, 20000);
  assert.equal(M.revenueIn(list, '2026-11', 'paid').total, 15000);
  const mo = M.monthly({ break_even: 40000, target_low: 50000, target_high: 65000 });
  assert.deepEqual([30000, 45000, 55000, 70000].map((v) => M.revenueState(v, mo)), ['below', 'over', 'target', 'above']);
  assert.equal(M.revenueState(1, M.monthly({})), null, 'no break-even typed: nothing to compare with');
});

test('the weighted pipeline: open work × its stage’s chance, won work in full, each spread evenly over its months', () => {
  const chances = { new: 10, meeting: 30, proposal: 60, paused: 0 };
  const e = (o) => ({ id: o.title, archived: false, value_nzd: null, start_month: '', months: null, ...o });
  const list = [
    e({ title: 'Bay', stage: 'proposal', value_nzd: 90000, start_month: '2026-12', months: 6 }),     // 9,000 a month
    e({ title: 'Pair', stage: 'won', value_nzd: 180000, start_month: '2026-12', months: 9 }),        // 20,000 a month
    e({ title: 'Hall', stage: 'new', value_nzd: 250000, start_month: '2027-03', months: 10 }),       // 2,500 a month from March
    e({ title: 'Lost one', stage: 'lost', value_nzd: 99999, start_month: '2026-12', months: 1 }),
    e({ title: 'No month', stage: 'proposal', value_nzd: 45000 }),
    e({ title: 'No value', stage: 'meeting', start_month: '2026-12', months: 2 }),
  ];
  const f = M.forecast(list, chances, '2026-12', 6);
  assert.deepEqual(f.rows.map((r) => r.ym), ['2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05']);
  assert.deepEqual(f.rows.map((r) => Math.round(r.total)), [29000, 29000, 29000, 31500, 31500, 31500]);
  assert.deepEqual(f.rows.map((r) => r.won), [20000, 20000, 20000, 20000, 20000, 20000]);
  assert.deepEqual(f.counted, ['Bay', 'Pair', 'Hall']);
  assert.deepEqual(f.unscheduled.map((u) => [u.enquiry.title, u.why]), [['No month', 'no start month'], ['No value', 'no value typed']]);
  // no chance typed for a stage: left out, and it says why
  assert.equal(M.inForecast(e({ stage: 'meeting', value_nzd: 1, start_month: '2026-12', months: 1 }), {}).why, 'no chance typed for the meeting stage');
  // months below break-even, and how far short
  assert.deepEqual(M.shortMonths(f.rows, 30000).map((s) => [s.ym, s.short]), [['2026-12', 1000], ['2027-01', 1000], ['2027-02', 1000]]);
  assert.deepEqual(M.shortMonths(f.rows, null), []);
  // what could fill a month: open enquiries starting by then, or with no start month yet, biggest first
  assert.deepEqual(M.gapLeads(list, '2027-01').map((x) => x.title), ['Bay', 'No month', 'No value']);
  assert.deepEqual(M.gapLeads(list, '2027-04').map((x) => x.title), ['Hall', 'Bay', 'No month', 'No value']);
});

test('month arithmetic ported from forecast.ts', () => {
  assert.equal(M.ymAdd('2026-11', 2), '2027-01');
  assert.equal(M.ymAdd('2026-01', -1), '2025-12');
  assert.equal(M.ymDiff('2026-11', '2027-02'), 3);
  assert.equal(M.ymLabel('2027-01'), 'Jan');
  assert.equal(M.ymLabel('2027-01', { long: true, year: true }), 'January 2027');
});

test('a won enquiry brings its value and hours to the project only when the person says so', () => {
  assert.deepEqual(M.fromEnquiry({ value_nzd: 60000, hours: 300 }), { fee: 60000, hours: 300 });
  assert.deepEqual(M.fromEnquiry({ value_nzd: 60000 }), { fee: 60000, hours: null });
  assert.equal(M.fromEnquiry({ value_nzd: null }), null);
});

// ---- resourcing ------------------------------------------------------------------------------------------------------------
test('weeks, planned hours a week, the team’s capacity and who is on a project', () => {
  assert.equal(M.mondayOf('2026-11-22'), '2026-11-16', 'a Sunday belongs to the week that began on Monday');
  assert.deepEqual(M.weeksFrom('2026-11-24', 3), ['2026-11-23', '2026-11-30', '2026-12-07']);
  const a = [
    { person: 'A', project_id: 'p1', enquiry_id: '', hours_week: 30, from: '2026-11-20', to: '2026-12-01' },
    { person: 'B', project_id: '', enquiry_id: 'e1', hours_week: 10, from: '2026-12-02', to: '2026-12-20' },
    { person: 'A', project_id: 'p1', enquiry_id: '', hours_week: 5, from: '2026-12-08', to: '2026-12-31' },
  ];
  const load = M.weekLoad(a, M.weeksFrom('2026-11-23', 3));
  assert.deepEqual(load.map((w) => w.total), [30, 40, 15]);
  assert.deepEqual(load[1].by, { p1: 30, e1: 10 });
  assert.deepEqual(load[2].people, { B: 10, A: 5 });
  assert.equal(M.teamCapacity([{ name: 'A', capacity: 40 }, { name: 'B', capacity: 32 }, { name: 'C', capacity: null }]), 72);
  assert.equal(M.teamCapacity([{ name: 'A' }]), null);
  assert.deepEqual(M.onProject(a, 'p1', '2026-12-05').map((x) => [x.person, x.hours_week, x.now]), [['A', 5, false]]);
  assert.deepEqual(M.onProject(a, 'p1', '2026-11-25').map((x) => [x.person, x.hours_week, x.now]), [['A', 30, true]]);
});

// ---- new records: only what a person typed ---------------------------------------------------------------------------------
test('time entries, invoices and allocations are checked in plain words', () => {
  const t = M.newTimeEntry({ project_id: PID, person: ' A. Person ', date: T, hours: '7.5', stage: 'developed' });
  assert.deepEqual([t.person, t.hours, t.stage], ['A. Person', 7.5, 'developed']); assert.match(t.id, /^te_/);
  assert.throws(() => M.newTimeEntry({ project_id: PID, person: 'A', date: T, hours: '25' }), /up to 24/);
  assert.throws(() => M.newTimeEntry({ project_id: PID, person: 'A', date: T, hours: 'about 3' }), /number/);
  assert.throws(() => M.newTimeEntry({ project_id: PID, person: '', date: T, hours: '1' }), /whose time/);
  assert.throws(() => M.newTimeEntry({ project_id: PID, person: 'A', date: '22/11/2026', hours: '1' }), /day, month and year/);
  const i = M.newInvoice({ project_id: PID, number: '1044', amount: '$15,000', issued: '2026-11-10', due: '2026-11-30' });
  assert.deepEqual([i.amount_nzd, i.void, i.paid], [15000, false, '']);
  assert.throws(() => M.newInvoice({ project_id: PID, number: '1', amount: '15k' }), /dollars/);
  assert.throws(() => M.newInvoice({ project_id: PID, number: '1', amount: '1', issued: '2026-11-10', due: '2026-11-01' }), /before the issue/);
  assert.throws(() => M.newInvoice({ project_id: PID, number: '1', amount: '1', paid: '2026-11-10' }), /issued before it is paid/);
  assert.throws(() => M.newInvoice({ project_id: PID, number: ' ', amount: '1' }), /number/);
  assert.equal(M.markPaid(i, '2026-11-25').paid, '2026-11-25');
  assert.throws(() => M.markPaid(i, '2026-11-01'), /before the issue/);
  const v = M.voidInvoice(i, 'Raised twice');
  assert.deepEqual([v.void, v.void_reason], [true, 'Raised twice']);
  assert.throws(() => M.voidInvoice(i, ''), /why/);
  assert.throws(() => M.voidInvoice(v, 'again'), /already void/);
  assert.throws(() => M.markPaid(v, '2026-11-25'), /void invoice/);
  const a = M.newAllocation({ person: 'A', project_id: PID, hours_week: '20', from: '2026-11-23', to: '2027-01-29' });
  assert.equal(a.hours_week, 20);
  assert.throws(() => M.newAllocation({ person: 'A', project_id: PID, enquiry_id: 'en_1', hours_week: '1', from: T, to: T }), /one project or one enquiry/);
  assert.throws(() => M.newAllocation({ person: 'A', hours_week: '1', from: T, to: T }), /one project or one enquiry/);
  assert.throws(() => M.newAllocation({ person: 'A', project_id: PID, hours_week: '81', from: T, to: T }), /up to 80/);
  assert.throws(() => M.newAllocation({ person: 'A', project_id: PID, hours_week: '1', from: '2026-12-01', to: T }), /before the first/);
  assert.equal(M.parseHours(''), null); assert.equal(M.parsePercent('60%'), 60); assert.throws(() => M.parsePercent('101'), /0 to 100/);
  assert.equal(M.parseMonth('2027-02'), '2027-02'); assert.throws(() => M.parseMonth('Feb'), /year and month/);
});

// ---- who may change what ---------------------------------------------------------------------------------------------------
test('permissions: one browser does everything; shared, a viewer nothing, a member the work, an owner the practice and rates', () => {
  for (const what of ['practice', 'rate', 'time', 'invoice']) assert.equal(M.can(what, { shared: false, role: 'viewer' }), true, what);
  for (const what of ['practice', 'rate', 'fee', 'time', 'invoice', 'allocation', 'hold', 'set', 'enquiry']) assert.equal(M.can(what, { shared: true, role: 'viewer' }), false, what);
  for (const what of ['fee', 'hours', 'targets', 'time', 'invoice', 'allocation', 'hold', 'set', 'enquiry']) assert.equal(M.can(what, { shared: true, role: 'member' }), true, what);
  assert.equal(M.can('practice', { shared: true, role: 'member' }), false);
  assert.equal(M.can('rate', { shared: true, role: 'member' }), false);
  assert.equal(M.can('practice', { shared: true, role: 'owner' }), true);
  assert.equal(M.can('rate', { shared: true, role: 'owner' }), true);
});

// ---- the browser store -----------------------------------------------------------------------------------------------------
test('browser store: the three kinds are kept, listed by project, and go with their project', async () => {
  assert.ok(['time_entry', 'invoice', 'allocation'].every((k) => KINDS.includes(k)));
  const s = createStore(memoryBackend()), b = bundle();
  await s.saveProject(b);
  await s.save('time_entry', M.newTimeEntry({ project_id: PID, person: 'A', date: T, hours: '2' }));
  await s.save('invoice', M.newInvoice({ project_id: PID, number: '1', amount: '100' }));
  await s.save('allocation', M.newAllocation({ person: 'A', project_id: PID, hours_week: '5', from: T, to: T }));
  await s.save('allocation', M.newAllocation({ person: 'A', enquiry_id: 'en_1', hours_week: '5', from: T, to: T }));
  assert.equal((await s.list('time_entry', { project_id: PID })).length, 1);
  assert.equal((await s.list('allocation')).length, 2);
  await s.removeProject(PID);
  assert.deepEqual([(await s.list('time_entry')).length, (await s.list('invoice')).length, (await s.list('allocation')).length], [0, 0, 1], 'the enquiry’s allocation stays');
  // the practice's money settings live in this browser as a setting
  await s.save('setting', { id: 'money', value: M.practiceMoney({ break_even: 40000 }) });
  assert.equal(M.monthly((await s.get('setting', 'money')).value).breakEven, 40000);
});

// ---- the shared store --------------------------------------------------------------------------------------------------
function setup({ role = 'member', theme = 'sketch' } = {}) {
  const fake = fakeSupabase({ rpc: { practice_people: () => [{ user_id: 'u1', email: 'a@x.example', name: 'A. Person', role: 'owner' }] } });
  fake.db.practice = [{ id: PRACTICE.id, name: PRACTICE.name, extra: { theme } }];
  const local = createStore(memoryBackend());
  return { fake, local, cloud: createCloudStore({ client: fake, practice: { ...PRACTICE, role }, local }) };
}
const says = (re, code) => (err) => { assert.ok(err instanceof CloudError, `a CloudError, got ${err}`); assert.match(err.message, re); if (code) assert.equal(err.code, code); return true; };

test('cloud mapping: each money kind is a flat row under the practice, and comes back as the page holds it', () => {
  assert.deepEqual(MONEY_KINDS, ['time_entry', 'invoice', 'allocation']);
  const rows = {
    time_entry: M.newTimeEntry({ project_id: PID, person: 'A. Person', date: T, hours: 7.5, stage: 'contract', note: 'Site meeting' }),
    invoice: { ...M.newInvoice({ project_id: PID, number: '1044', amount: 15000, issued: '2026-11-10', due: '2026-11-30' }), paid: '2026-11-20' },
    allocation: M.newAllocation({ person: 'A. Person', enquiry_id: 'en_33333333-3333-4333-8333-333333333333', hours_week: 12, from: '2026-12-01', to: '2027-01-31' }),
  };
  const rec = Object.fromEntries(Object.entries(rows).map(([k, r]) => [k, toRecord(k, r, { practice_id: PRACTICE.id })]));
  assert.equal(rec.time_entry.practice_id, PRACTICE.id);
  assert.equal(rec.time_entry.project_id, dbId(PID));
  assert.equal(rec.time_entry.on_date, T);
  assert.equal(rec.time_entry.stage, 'contract_admin', 'the table’s name for stage five');
  assert.deepEqual([rec.invoice.amount_nzd, rec.invoice.issued_on, rec.invoice.due_on, rec.invoice.paid_on, rec.invoice.void], [15000, '2026-11-10', '2026-11-30', '2026-11-20', false]);
  assert.deepEqual([rec.allocation.project_id, rec.allocation.enquiry_id, rec.allocation.hours_week, rec.allocation.from_on], [null, dbId(rows.allocation.enquiry_id), 12, '2026-12-01']);
  for (const [k, row] of Object.entries(rows)) {
    const back = fromRecord(k, rec[k]);
    assert.equal(back.id, dbId(row.id));
    for (const [f, v] of Object.entries(row)) if (!['id', 'project_id', 'enquiry_id', 'created_at'].includes(f)) assert.deepEqual(back[f], v, `${k}.${f}`);
  }
});

test('cloud: money rows are written under the practice; an invoice is voided, never removed', async () => {
  const { fake, cloud } = setup();
  const pid = '44444444-4444-4444-8444-444444444444';
  const t = await cloud.save('time_entry', M.newTimeEntry({ project_id: pid, person: 'A', date: T, hours: 3 }));
  const i = await cloud.save('invoice', M.newInvoice({ project_id: pid, number: '1', amount: 500, issued: '2026-11-01' }));
  assert.equal(fake.db.time_entry[0].practice_id, PRACTICE.id);
  assert.equal(fake.db.invoice[0].amount_nzd, 500);
  assert.equal((await cloud.list('time_entry', { project_id: pid })).length, 1);
  assert.equal((await cloud.get('invoice', i.id)).number, '1');
  await assert.rejects(cloud.remove('invoice', i.id), says(/voided, not removed/, 'kept'));
  await cloud.save('invoice', M.voidInvoice(await cloud.get('invoice', i.id), 'Raised twice'));
  assert.equal(fake.db.invoice[0].void, true);
  assert.equal(await cloud.remove('time_entry', t.id), true);
  assert.equal(fake.db.time_entry.length, 0);
  assert.ok(!fake.log.some((o) => o.table === 'invoice' && o.action === 'delete'), 'no delete was sent for an invoice');
});

test('cloud: a viewer changes nothing; the Sample’s money rows stay in this browser', async () => {
  const v = setup({ role: 'viewer' });
  await assert.rejects(v.cloud.save('time_entry', M.newTimeEntry({ project_id: '44444444-4444-4444-8444-444444444444', person: 'A', date: T, hours: 1 })), says(/viewer/, 'read_only'));
  assert.equal(v.fake.writes().length, 0);
  const { fake, local, cloud } = setup();
  await local.saveProject(sampleProject());
  await cloud.save('time_entry', M.newTimeEntry({ project_id: SAMPLE_ID, person: 'A', date: T, hours: 2 }));
  await cloud.save('invoice', M.newInvoice({ project_id: SAMPLE_ID, number: 'S1', amount: 10 }));
  assert.equal(fake.writes().length, 0, 'nothing about the Sample was sent');
  assert.equal((await local.list('time_entry')).length, 1);
  assert.equal((await cloud.list('time_entry', { project_id: SAMPLE_ID })).length, 1);
  assert.equal((await cloud.list('invoice')).length, 1, 'listing everything includes the Sample’s, from this browser');
  await assert.rejects(cloud.remove('invoice', (await local.list('invoice'))[0].id), says(/voided/));
});

test('cloud: the practice’s money settings are read by any member and changed only by an owner, keeping the look', async () => {
  const m = setup();
  assert.equal(await m.cloud.practiceExtra('money'), null);
  await assert.rejects(m.cloud.setPracticeExtra('money', { break_even: 1 }), says(/Only an owner/, 'read_only'));
  assert.equal(m.fake.writes().length, 0);
  await assert.rejects(m.cloud.practiceExtra('theme'), /not one of the practice’s settings/);
  const o = setup({ role: 'owner' });
  const saved = await o.cloud.setPracticeExtra('money', M.practiceMoney({ break_even: 40000, target_low: 50000 }));
  assert.equal(saved.break_even, 40000);
  assert.equal(o.fake.db.practice[0].extra.theme, 'sketch', 'the look is left as it was');
  assert.equal((await o.cloud.practiceExtra('money')).target_low, 50000);
  o.fake.viewer = true; // the database refuses (the person is not an owner there after all)
  await assert.rejects(o.cloud.setPracticeExtra('money', { break_even: 2 }), says(/only an owner/, 'refused'));
  assert.deepEqual((await o.cloud.practicePeople()).map((p) => p.name), ['A. Person']);
});

// ---- the instruments ---------------------------------------------------------------------------------------------------
test('the dial: one band a state, the needle on the state, its words in the description, nothing for colour alone', () => {
  assert.deepEqual(['payment', 'hold', 'go', 'allgo'].map((s) => needleAngle(s)), [-90, -30, 30, 90]);
  assert.ok(needleAngle('go', { watch: true }) < needleAngle('go'), 'a Go with a watch sits low in the green');
  assert.equal(needleAngle(null), -120, 'not enough to tell: the needle rests');
  const h = M.health({ b: bundle({ money: { targets: { developed: '2026-12-10' } } }), today: T });
  const svg = healthDial(h, { key: 'k' });
  assert.match(svg, /role="img"/);
  assert.match(svg, /aria-label="Go\. Worked out: stage 3 on time"/);
  for (const k of ['payment', 'hold', 'go', 'allgo']) assert.match(svg, new RegExp(`class="bd bd-${k}`));
  assert.match(svg, /class="bd bd-go on"/);
  assert.ok(!/#[0-9a-f]{6}/i.test(svg.replace(/flood-color="[^"]*"/, '')), 'colours come from the stylesheet, not the drawing');
  const empty = practiceDial({ total: 1000, mo: M.monthly({}), label: 'This month' });
  assert.match(empty, /bd-empty/);
  const full = practiceDial({ total: 45000, mo: M.monthly({ break_even: 40000, target_low: 50000, target_high: 65000 }), label: 'This month' });
  assert.match(full, /pd-short/); assert.match(full, />break-even</); assert.match(full, />target</);
  assert.doesNotMatch(feeGauge(null, { label: 'x' }), /data-needle/, 'no fee and rate: no needle is drawn');
});

test('the needle swings once per reading, and not at all with reduced motion', () => {
  _forget();
  const needle = () => { const attrs = {}; return { dataset: { key: 'k', to: '30' }, isConnected: true, ownerSVGElement: { classList: { contains: () => false } }, setAttribute: (k, v) => { attrs[k] = v; }, attrs }; };
  const frames = [];
  const win = { matchMedia: () => ({ matches: false }), requestAnimationFrame: (f) => frames.push(f), performance: { now: () => 0 } };
  const n1 = needle(), root = { querySelectorAll: () => [n1] };
  assert.equal(animateDials(root, { win }), 1);
  assert.equal(n1.attrs.transform, 'rotate(-120 100 100)', 'it starts at rest');
  frames.shift()(5000);
  assert.equal(n1.attrs.transform, 'rotate(30 100 100)', 'and settles on its reading');
  assert.equal(animateDials({ querySelectorAll: () => [needle()] }, { win }), 0, 'the same reading does not swing again');
  _forget();
  assert.equal(animateDials({ querySelectorAll: () => [needle()] }, { win: { ...win, matchMedia: () => ({ matches: true }) } }), 0, 'reduced motion: still');
});

// ---- the add-on hooks --------------------------------------------------------------------------------------------------
test('add-ons can bring a project tab, a header part, wall parts and a settings section', () => {
  _reset();
  registerProjectTab({ id: 'money', label: 'Money', order: 10, render() {} });
  registerProjectHead({ id: 'b', order: 20, render() {} });
  registerProjectHead({ id: 'a', order: 10, render() {} });
  registerWall({ id: 'money', top() {} });
  registerWall({ id: 'tiles', tiles() {} });
  registerSettings({ id: 'money', title: 'Money', render() {} });
  assert.deepEqual(projectTabs().map((t) => [t.id, t.label]), [['money', 'Money']]);
  assert.deepEqual(projectHeads().map((h) => h.id), ['a', 'b']);
  assert.deepEqual(wallParts().map((w) => [w.id, !!w.top, !!w.tiles]), [['money', true, false], ['tiles', false, true]]);
  assert.deepEqual(settingsParts().map((s) => s.title), ['Money']);
  assert.throws(() => registerProjectTab({ id: 'Bad Id', render() {} }));
  assert.throws(() => registerWall({ id: 'x' }), /nothing to draw/);
  assert.throws(() => registerSettings({ id: 'x' }), /nothing to draw/);
  assert.ok(ADDONS.includes('./money.js'));
  _reset();
});
