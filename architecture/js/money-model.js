// Money, time and people: the rules, with no page in them. money.js draws these and saves through the page's store.
// Nothing here saves, sends or reaches the network, and nothing here makes up a figure: every amount is one a person
// typed, or worked out from figures a person typed, and each answer says which.
//
// Part of this is ported from assembl's main repository, lib/workforce/jobs/forecast.ts (the month arithmetic, the
// pipeline weighted by likelihood and spread evenly over its months, the first months below break-even and the leads
// that could fill them), as plain JavaScript for this page. No data came with it.
//
// Shapes (the page's own; cloud.js maps the three lists to the arch tables time_entry, invoice and allocation):
//   project.money   { fee, hours, rate, targets: { <stage key>: 'YYYY-MM-DD' }, split: { <stage key>: percent },
//                     hold: { kind: 'consent'|'site', reason, by, at } | null,
//                     payment: { reason, by, at } | null,                       a person's flag: payment pending
//                     set: { state, reason, by, at } | null,                    the dial set by hand
//                     from_enquiry: { id, by, at } | null }                     the won enquiry's figures, taken on
//   time_entry      { id, project_id, person, date, hours, stage, note, created_at }
//   invoice         { id, project_id, number, amount_nzd, issued, due, paid, void, void_reason, note, created_at }
//                   never removed: an invoice is voided instead
//   allocation      { id, person, project_id, enquiry_id, hours_week, from, to, note, created_at }   one of project or enquiry
//   practice money  { period, break_even, target_low, target_high, counts, rate, leeway, labels, chances, team }
//                   practice.extra.money in the shared records (an owner changes it), the "money" setting in a browser
//   enquiry         (crm-model.js) may carry start_month 'YYYY-MM', months and hours, typed on the Money screen

import { STAGE_KEYS, stageDef, stageNumber, currentStage, allDone, newId } from './model.js';
import { dayKey, daysBetween, parseValue, money as dollars, sameId } from './crm-model.js';

const clean = (s) => String(s ?? '').trim();
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const isDay = (v) => typeof v === 'string' && DAY.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const nowIso = (now) => (now instanceof Date ? now : new Date(now ?? Date.now())).toISOString();
export const money = dollars;
/** a number, or null. Only finite numbers count: nothing is read out of words. */
export const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : null);
const pos = (v) => { const n = num(v); return n != null && n > 0 ? n : null; };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** "22 Nov" from a day or a date and time */
export function dayShort(v) {
  const m = DAY.exec(String(v ?? '')), d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(v);
  return !v || Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
export const pct = (x) => `${Math.round(x * 100)}%`;

// ---- the four states of the dial, in the practice's own words ------------------------------------------------------
/** left to right on the dial */
export const HEALTH_KEYS = ['payment', 'hold', 'go', 'allgo'];
export const HEALTH = {
  allgo: { key: 'allgo', label: 'All go', meaning: 'On budget and on time', icon: 'tick' },
  go: { key: 'go', label: 'Go', meaning: 'On target', icon: 'dot' },
  hold: { key: 'hold', label: 'On hold', meaning: 'Permission or dig off', icon: 'pause' },
  payment: { key: 'payment', label: 'Payment pending', meaning: 'Client payment pending', icon: 'coin' },
};
export const NOT_ENOUGH = 'Not enough to tell';
export const HOLD_KINDS = { consent: 'A consent or permission', site: 'Site works (dig off)' };
const LABEL_MAX = 24;

/** the practice's four words, each one the default unless the practice typed its own */
export function labelsOf(labels) {
  const l = isObj(labels) ? labels : {};
  return Object.fromEntries(HEALTH_KEYS.map((k) => [k, clean(l[k]).slice(0, LABEL_MAX) || HEALTH[k].label]));
}

// ---- figures a person types ----------------------------------------------------------------------------------------
/** dollars as typed ("85000", "$85,000"); '' is null. Anything else is refused, never guessed. */
export const parseDollars = (text) => parseValue(text);
/** hours as typed: a number above nought with at most two decimals; '' is null */
export function parseHours(text, { max = 10000, what = 'hours' } = {}) {
  const t = clean(text);
  if (!t) return null;
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(t) || Number(t) <= 0 || Number(t) > max) throw new Error(`Type the ${what} as a number above nought${max < 10000 ? `, up to ${max}` : ''}, for example 7.5.`);
  return Number(t);
}
/** a whole percent, 0 to 100; '' is null */
export function parsePercent(text) {
  const t = clean(text).replace(/%$/, '').trim();
  if (!t) return null;
  if (!/^\d{1,3}$/.test(t) || Number(t) > 100) throw new Error('Type a whole percent from 0 to 100.');
  return Number(t);
}
/** a month as "YYYY-MM"; '' is null */
export function parseMonth(text) {
  const t = clean(text);
  if (!t) return null;
  if (!ymOk(t)) throw new Error('Give the month as year and month.');
  return t;
}
function dayOrEmpty(v, what) {
  const t = clean(v);
  if (!t) return '';
  if (!isDay(t)) throw new Error(`Give ${what} as day, month and year.`);
  return t;
}

// ---- months (ported from forecast.ts) ------------------------------------------------------------------------------
export const ymOk = (v) => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
export function ymAdd(ym, k) {
  const [y, m] = ym.split('-').map(Number), t = y * 12 + (m - 1) + k;
  return `${Math.floor(t / 12)}-${String((((t % 12) + 12) % 12) + 1).padStart(2, '0')}`;
}
export function ymDiff(a, b) { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); }
export const ymOf = (day) => String(dayKey(day) || '').slice(0, 7);
/** "Jan", or "January 2027" */
export function ymLabel(ym, { long = false, year = false } = {}) {
  if (!ymOk(ym)) return '';
  const [y, m] = ym.split('-').map(Number);
  return `${(long ? LONG : MONTHS)[m - 1]}${year ? ` ${y}` : ''}`;
}

// ---- weeks ---------------------------------------------------------------------------------------------------------
const addDays = (day, n) => { const [y, m, d] = day.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); };
/** the Monday of the week a day falls in */
export function mondayOf(day) {
  const k = dayKey(day), [y, m, d] = k.split('-').map(Number), wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(k, -((wd + 6) % 7));
}
/** n Mondays, starting with this week's */
export const weeksFrom = (day, n = 12) => Array.from({ length: n }, (_, i) => addDays(mondayOf(day), i * 7));
export { addDays };

// ---- the project's money -------------------------------------------------------------------------------------------
/** project.money, cleaned: anything that is not a figure or a date a person could have typed is left out */
export function projectMoney(project) {
  const m = isObj(project?.money) ? project.money : {};
  const targets = {}, split = {};
  for (const k of STAGE_KEYS) {
    if (isDay(m.targets?.[k])) targets[k] = m.targets[k];
    const s = num(m.split?.[k]);
    if (s != null && s >= 0 && s <= 100) split[k] = s;
  }
  const stamp = (x) => (isObj(x) ? { reason: clean(x.reason), by: clean(x.by), at: clean(x.at) } : null);
  const hold = isObj(m.hold) && HOLD_KINDS[m.hold.kind] ? { kind: m.hold.kind, ...stamp(m.hold) } : null;
  const set = isObj(m.set) && HEALTH[m.set.state] ? { state: m.set.state, ...stamp(m.set) } : null;
  return {
    fee: pos(m.fee), hours: pos(m.hours), rate: pos(m.rate), targets, split: Object.keys(split).length ? split : null,
    hold, payment: isObj(m.payment) ? stamp(m.payment) : null, set, from_enquiry: isObj(m.from_enquiry) ? { ...m.from_enquiry } : null,
  };
}

/**
 * How far through the work the project is, 0 to 1. A done stage counts in full; the stage in hand counts by the share
 * of its tasks that are done. Each stage counts by the fee split typed for the project, or the seven equally.
 */
export function progress(b, split = null) {
  const typed = isObj(split) ? STAGE_KEYS.map((k) => num(split[k]) ?? 0) : null;
  const total = typed ? typed.reduce((a, x) => a + x, 0) : 0;
  const w = typed && total > 0 ? typed.map((x) => x / total) : STAGE_KEYS.map(() => 1 / STAGE_KEYS.length);
  let value = 0;
  STAGE_KEYS.forEach((k, i) => {
    const st = b?.stages?.find((s) => s.key === k)?.status;
    if (st === 'done') value += w[i];
    else if (st === 'in_progress' || st === 'awaiting_approval') {
      const tasks = (b.tasks ?? []).filter((t) => t.stage === k);
      if (tasks.length) value += w[i] * (tasks.filter((t) => t.status === 'done').length / tasks.length);
    }
  });
  return { value: Math.min(1, value), how: typed && total > 0 ? 'the fee split typed for this project' : 'the seven stages counted equally, the stage in hand by its tasks done' };
}

const sum = (list, f) => list.reduce((a, x) => a + (num(f(x)) ?? 0), 0);
const mine = (list, pid) => (list ?? []).filter((r) => sameId(r.project_id, pid));

/**
 * Fee used against the progress made. By money when the project has a fee and an hourly rate (the project's own, or the
 * practice's), otherwise by hours when it has budgeted hours. state 'ok' | 'over' | null (not enough to tell).
 * leeway: percentage points of fee used ahead of progress before it counts as over (the practice's choice; 0 unless set).
 */
export function budget({ b, m = projectMoney(b?.project), time = [], rate = null, leeway = 0 }) {
  const pid = b?.project?.id, entries = mine(time, pid), hours = sum(entries, (t) => t.hours);
  const r = m.rate ?? pos(rate), rateFrom = m.rate != null ? 'project' : pos(rate) != null ? 'practice' : null;
  const prog = progress(b, m.split), give = Math.max(0, num(leeway) ?? 0) / 100;
  const out = { basis: null, fee: m.fee, rate: r, rateFrom, hours, budgetHours: m.hours, cost: null, used: null, left: null, progress: prog.value, progressHow: prog.how, state: null, missing: [] };
  if (m.fee != null && r != null) {
    out.basis = 'fee'; out.cost = hours * r; out.used = out.cost / m.fee; out.left = m.fee - out.cost;
  } else if (m.hours != null) {
    out.basis = 'hours'; out.used = hours / m.hours;
    if (m.fee != null) out.missing.push('rate');
  } else {
    if (m.fee == null) out.missing.push('fee');
    if (r == null) out.missing.push('rate');
    out.missing.push('hours');
    return out;
  }
  out.state = out.used <= out.progress + give + 1e-9 ? 'ok' : 'over';
  return out;
}

/** fee less the time so far at the rate: { fee, cost, left, share } or null when there is no fee or no rate */
export function profit(bud) {
  if (bud?.basis !== 'fee') return null;
  return { fee: bud.fee, cost: bud.cost, left: bud.left, share: bud.fee > 0 ? bud.left / bud.fee : 0 };
}

/** Against the stage target dates: 'ok' | 'late' | null. A stage not done whose target day has gone by is late. */
export function onTime(b, m = projectMoney(b?.project), today = dayKey(new Date())) {
  const t = m.targets ?? {};
  if (b?.project && allDone(b)) return { state: 'ok', stage: null, target: '', days: 0, why: 'all seven stages done' };
  const late = STAGE_KEYS.filter((k) => t[k] && b.stages.find((s) => s.key === k)?.status !== 'done' && t[k] < today);
  if (late.length) { const k = late[0]; return { state: 'late', stage: k, target: t[k], days: daysBetween(t[k], today), why: `stage ${stageNumber(k)} is ${plural(daysBetween(t[k], today), 'day')} past its target` }; }
  const cur = b ? currentStage(b) : null;
  if (cur && t[cur.key]) return { state: 'ok', stage: cur.key, target: t[cur.key], days: daysBetween(today, t[cur.key]), why: `stage ${stageNumber(cur.key)} on time` };
  return { state: null, stage: cur?.key ?? null, target: '', days: 0, why: cur ? `stage ${stageNumber(cur.key)} has no target date` : 'no stage in progress' };
}
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ---- invoices ------------------------------------------------------------------------------------------------------
/** 'void' | 'paid' | 'draft' (not issued yet) | 'overdue' (past its due day, not paid) | 'due' */
export function invoiceStatus(inv, today = dayKey(new Date())) {
  if (inv?.void) return 'void';
  if (isDay(inv?.paid)) return 'paid';
  if (!isDay(inv?.issued)) return 'draft';
  if (isDay(inv?.due) && inv.due < today) return 'overdue';
  return 'due';
}
export const INVOICE_WORD = { paid: 'Paid', due: 'Due', overdue: 'Overdue', draft: 'Not issued', void: 'Void' };

// ---- the dial: one state for a project, and where it came from ----------------------------------------------------
/**
 * The project's state, worked out from its records where it can be, or as a person set it. Returns
 *   { state: 'allgo'|'go'|'hold'|'payment'|null, label, meaning, source: 'set'|'flag'|'hold'|'worked'|'none', line,
 *     reason, watch: [what is off], also: [other holds], parts: { time, budget, overdue } }
 * Order: set by hand > payment pending (a person's flag, or an unpaid invoice past its due day) > on hold > worked out.
 */
export function health({ b, invoices = [], time = [], settings = {}, today = dayKey(new Date()) }) {
  const s = practiceMoney(settings), words = labelsOf(s.labels), m = projectMoney(b?.project), pid = b?.project?.id;
  const t = onTime(b, m, today), bud = budget({ b, m, time, rate: s.rate, leeway: s.leeway });
  const overdue = mine(invoices, pid).filter((i) => invoiceStatus(i, today) === 'overdue').sort((x, y) => x.due.localeCompare(y.due));
  const parts = { time: t, budget: bud, overdue };
  const say = (state, source, line, extra = {}) => ({ state, label: state ? words[state] : NOT_ENOUGH, meaning: state ? HEALTH[state].meaning : '', source, line, reason: '', watch: [], also: [], parts, ...extra });
  const by = (x) => `${x.by || 'a person'}${x.at ? `, ${dayShort(x.at)}` : ''}`;
  const payLine = () => (m.payment ? `Flagged by ${by(m.payment)}${m.payment.reason ? `: ${m.payment.reason}` : ''}`
    : `Worked out: invoice ${overdue[0].number} was due ${dayShort(overdue[0].due)} and is not paid${overdue.length > 1 ? `, and ${plural(overdue.length - 1, 'more')}` : ''}`);
  const holdLine = () => `Held by ${by(m.hold)}, for ${HOLD_KINDS[m.hold.kind].toLowerCase()}${m.hold.reason ? `: ${m.hold.reason}` : ''}`;
  if (m.set) return say(m.set.state, 'set', `Set by ${by(m.set)}`, { reason: m.set.reason });
  const pay = !!m.payment || overdue.length > 0;
  if (pay) return say('payment', m.payment ? 'flag' : 'worked', payLine(), { also: m.hold ? [holdLine()] : [] });
  if (m.hold) return say('hold', 'hold', holdLine());
  const budLine = bud.basis === 'fee' ? `${pct(bud.used)} of fee used at ${pct(bud.progress)} progress`
    : bud.basis === 'hours' ? `${pct(bud.used)} of budget hours used at ${pct(bud.progress)} progress` : '';
  if (t.state == null && bud.state == null) {
    const need = [m.fee == null ? 'a fee (or budget hours)' : bud.rate == null ? 'an hourly rate (or budget hours)' : '', t.stage ? `a target date for stage ${stageNumber(t.stage)}` : 'stage target dates'].filter(Boolean);
    return say(null, 'none', `Needs ${need.join(' and ')}`);
  }
  if (t.state === 'ok' && bud.state === 'ok') return say('allgo', 'worked', `Worked out: ${t.why}, ${budLine}`);
  // what is off goes in "watch"; the came-from line keeps what is fine, so nothing is said twice
  const watch = [t.state === 'late' ? t.why : '', bud.state === 'over' ? budLine : ''].filter(Boolean);
  const fine = [t.state === 'ok' ? t.why : '', bud.state === 'ok' ? budLine : ''].filter(Boolean);
  const from = [t.state ? 'the stage targets' : '', bud.state ? (bud.basis === 'fee' ? 'the fee and the time logged' : 'the budget hours and the time logged') : ''].filter(Boolean).join(' and ');
  const unknown = [t.state == null ? 'no target date for the stage in hand' : '', bud.state == null ? 'no fee and rate, or budget hours' : ''].filter(Boolean);
  return say('go', 'worked', fine.length ? `Worked out: ${fine.join(', ')}` : `Worked out from ${from}`, { watch, unknown, meaning: watch.length ? '' : HEALTH.go.meaning });
}

// ---- the practice's money settings ---------------------------------------------------------------------------------
/** the stages an open enquiry can be in, each with a chance the practice types. Won counts in full; lost never counts. */
export const CHANCE_STAGES = ['new', 'meeting', 'proposal', 'paused'];
/** practice.extra.money (or this browser's "money" setting), cleaned. Nothing is filled in that a person did not type. */
export function practiceMoney(raw) {
  const r = isObj(raw) ? raw : {};
  const chances = {};
  for (const k of CHANCE_STAGES) { const c = num(r.chances?.[k]); chances[k] = c != null && c >= 0 && c <= 100 ? Math.round(c) : null; }
  const team = (Array.isArray(r.team) ? r.team : []).filter((p) => isObj(p) && clean(p.name)).map((p) => ({ id: clean(p.id) || clean(p.name), name: clean(p.name).slice(0, 80), capacity: pos(p.capacity) }));
  return {
    period: r.period === 'year' ? 'year' : 'month',
    break_even: pos(r.break_even), target_low: pos(r.target_low), target_high: pos(r.target_high),
    counts: r.counts === 'paid' ? 'paid' : 'issued',
    rate: pos(r.rate), leeway: (() => { const l = num(r.leeway); return l != null && l >= 0 && l <= 50 ? l : 0; })(),
    labels: isObj(r.labels) ? Object.fromEntries(HEALTH_KEYS.filter((k) => clean(r.labels[k])).map((k) => [k, clean(r.labels[k]).slice(0, LABEL_MAX)])) : {},
    chances, team,
  };
}
/** a month's figures from the typed ones: as typed for a month, or a year's divided by twelve. null when not typed. */
export function monthly(s) {
  const p = practiceMoney(s), d = p.period === 'year' ? 12 : 1, f = (v) => (v == null ? null : v / d);
  let low = f(p.target_low), high = f(p.target_high);
  if (low != null && high != null && high < low) [low, high] = [high, low];
  return { breakEven: f(p.break_even), low, high, perYear: p.period === 'year' };
}
/** the practice's revenue in the month of today: invoices issued (or paid) that month, not void */
export function revenueIn(invoices = [], ym, counts = 'issued') {
  const field = counts === 'paid' ? 'paid' : 'issued';
  const rows = invoices.filter((i) => !i.void && isDay(i[field]) && i[field].slice(0, 7) === ym && num(i.amount_nzd) != null);
  return { total: sum(rows, (i) => i.amount_nzd), rows, counts: field };
}
/** where the month stands against break-even and the target band */
export function revenueState(total, mo) {
  if (mo.breakEven == null) return null;
  if (total < mo.breakEven) return 'below';
  if (mo.low != null && total >= mo.low) return mo.high != null && total > mo.high ? 'above' : 'target';
  return 'over';
}
export const REVENUE_WORD = { below: 'Below break-even', over: 'Above break-even', target: 'In the target band', above: 'Above the target' };

// ---- the pipeline forecast (ported from forecast.ts: finIn, forecast, firstGap, gapLeads) -----------------------------
export const OPEN = ['new', 'meeting', 'proposal', 'paused'];
/** the chance an enquiry goes ahead, 0 to 1, or null when it does not count (lost, archived, or no chance typed) */
export function chanceOf(e, chances = {}) {
  if (!e || e.archived || e.stage === 'lost') return null;
  if (e.stage === 'won') return 1;
  const c = num(chances?.[e.stage]);
  return c == null ? null : Math.max(0, Math.min(100, c)) / 100;
}
/** whether an enquiry counts in the forecast and on what terms; otherwise why not, in plain words */
export function inForecast(e, chances = {}) {
  if (!e || e.archived || e.stage === 'lost') return { why: 'not going ahead' };
  const value = pos(e.value_nzd), months = Math.round(num(e.months) ?? 0), w = chanceOf(e, chances);
  if (value == null) return { why: 'no value typed' };
  if (w == null) return { why: `no chance typed for ${e.stage === 'paused' ? 'paused' : `the ${e.stage}`} stage` };
  if (!ymOk(e.start_month)) return { why: 'no start month' };
  if (months < 1) return { why: 'no length in months' };
  return { value, months, w, won: e.stage === 'won', start: e.start_month };
}
/**
 * n months from fromYm: won work in full, open work as value × chance, each spread evenly over its months.
 * Returns { rows: [{ ym, won, likely, total, items: [{ id, amount, won }] }], counted: [ids], unscheduled: [{ enquiry, why }] }.
 */
export function forecast(enquiries = [], chances = {}, fromYm, n = 6) {
  const rows = Array.from({ length: n }, (_, i) => ({ ym: ymAdd(fromYm, i), won: 0, likely: 0, total: 0, items: [] }));
  const counted = [], unscheduled = [];
  for (const e of enquiries) {
    const f = inForecast(e, chances);
    if (!f.value) { if (!e.archived && e.stage !== 'lost') unscheduled.push({ enquiry: e, why: f.why }); continue; }
    counted.push(e.id);
    const per = (f.value * f.w) / f.months;
    for (let i = 0; i < f.months; i++) {
      const row = rows.find((x) => x.ym === ymAdd(f.start, i));
      if (!row) continue;
      row[f.won ? 'won' : 'likely'] += per;
      row.items.push({ id: e.id, amount: per, won: f.won });
    }
  }
  for (const r of rows) r.total = r.won + r.likely;
  return { rows, counted, unscheduled };
}
/** the months below break-even, each with how far short */
export const shortMonths = (rows, breakEven) => (breakEven == null ? [] : rows.filter((r) => r.total < breakEven).map((r) => ({ ym: r.ym, short: breakEven - r.total })));
/** open enquiries that could start by a month: their start month is on or before it, or not typed yet. Biggest first. */
export function gapLeads(enquiries = [], ym) {
  return enquiries.filter((e) => !e.archived && OPEN.includes(e.stage) && (!ymOk(e.start_month) || ymDiff(e.start_month, ym) >= 0))
    .sort((a, b) => (num(b.value_nzd) ?? 0) - (num(a.value_nzd) ?? 0) || String(a.title).localeCompare(String(b.title)));
}

// ---- resourcing ----------------------------------------------------------------------------------------------------
/** every week's planned hours: { week, total, by: { <project or enquiry id>: hours }, people: { <name>: hours } } */
export function weekLoad(allocations = [], weeks = []) {
  return weeks.map((w) => {
    const end = addDays(w, 6), by = {}, people = {};
    let total = 0;
    for (const a of allocations) {
      const h = pos(a.hours_week);
      if (h == null || !isDay(a.from) || !isDay(a.to) || a.from > end || a.to < w) continue;
      const key = a.project_id || a.enquiry_id;
      by[key] = (by[key] ?? 0) + h; people[a.person] = (people[a.person] ?? 0) + h; total += h;
    }
    return { week: w, total, by, people };
  });
}
/** the practice's hours a week: the sum of each person's typed capacity (null when nobody has one) */
export function teamCapacity(team = []) {
  const ps = team.filter((p) => pos(p.capacity) != null);
  return ps.length ? ps.reduce((a, p) => a + p.capacity, 0) : null;
}
/** who is on a project now or next: [{ person, hours_week, from, to }] (one line a person, the soonest allocation) */
export function onProject(allocations = [], pid, today = dayKey(new Date())) {
  const live = allocations.filter((a) => sameId(a.project_id, pid) && isDay(a.to) && a.to >= today).sort((x, y) => x.from.localeCompare(y.from));
  const seen = new Map();
  for (const a of live) if (!seen.has(a.person)) seen.set(a.person, { person: a.person, hours_week: a.hours_week, from: a.from, to: a.to, now: a.from <= today });
  return [...seen.values()];
}

// ---- new records ---------------------------------------------------------------------------------------------------
export function newTimeEntry({ project_id, person, date, hours, stage = '', note = '', now, id } = {}) {
  if (!clean(project_id)) throw new Error('Time is logged against a project.');
  if (!clean(person)) throw new Error('Say whose time it is.');
  const d = dayOrEmpty(date, 'the day');
  if (!d) throw new Error('Give the day the time was spent.');
  const h = typeof hours === 'number' ? hours : parseHours(hours, { max: 24 });
  if (!(h > 0 && h <= 24)) throw new Error('Type the hours as a number above nought, up to 24, for example 7.5.');
  if (stage && !STAGE_KEYS.includes(stage)) throw new Error('That is not one of the seven stages.');
  return { id: id ?? newId('te'), project_id: clean(project_id), person: clean(person).slice(0, 80), date: d, hours: h, stage: stage || '', note: clean(note).slice(0, 300), created_at: nowIso(now) };
}

export function newInvoice({ project_id, number, amount, issued = '', due = '', paid = '', note = '', now, id } = {}) {
  if (!clean(project_id)) throw new Error('An invoice belongs to a project.');
  if (!clean(number)) throw new Error('Give the invoice its number.');
  const a = typeof amount === 'number' ? amount : parseDollars(amount);
  if (a == null) throw new Error('Type the invoice amount in dollars, for example 12000.');
  const i = dayOrEmpty(issued, 'the issue date'), d = dayOrEmpty(due, 'the due date'), p = dayOrEmpty(paid, 'the paid date');
  if (i && d && d < i) throw new Error('The due date is before the issue date.');
  if (p && !i) throw new Error('An invoice is issued before it is paid: give the issue date too.');
  return { id: id ?? newId('in'), project_id: clean(project_id), number: clean(number).slice(0, 40), amount_nzd: a, issued: i, due: d, paid: p, void: false, void_reason: '', note: clean(note).slice(0, 300), created_at: nowIso(now) };
}
/** paid on a day: the invoice as it should now be saved */
export function markPaid(inv, day) {
  if (inv.void) throw new Error('A void invoice cannot be paid.');
  const p = dayOrEmpty(day, 'the paid date');
  if (!p) throw new Error('Give the day it was paid.');
  if (inv.issued && p < inv.issued) throw new Error('The paid date is before the issue date.');
  return { ...inv, paid: p };
}
/** voided, with a reason: an invoice is never removed */
export function voidInvoice(inv, reason) {
  if (inv.void) throw new Error('That invoice is already void.');
  if (!clean(reason)) throw new Error('Say why the invoice is void.');
  return { ...inv, void: true, void_reason: clean(reason).slice(0, 300) };
}

export function newAllocation({ person, project_id = '', enquiry_id = '', hours_week, from, to, note = '', now, id } = {}) {
  if (!clean(person)) throw new Error('Say who is working on it.');
  if (!!clean(project_id) === !!clean(enquiry_id)) throw new Error('An allocation is for one project or one enquiry.');
  const h = typeof hours_week === 'number' ? hours_week : parseHours(hours_week, { max: 80, what: 'hours a week' });
  if (!(h > 0 && h <= 80)) throw new Error('Type the hours a week as a number above nought, up to 80.');
  const f = dayOrEmpty(from, 'the first day'), t = dayOrEmpty(to, 'the last day');
  if (!f || !t) throw new Error('Give the first and the last day.');
  if (t < f) throw new Error('The last day is before the first.');
  return { id: id ?? newId('al'), person: clean(person).slice(0, 80), project_id: clean(project_id), enquiry_id: clean(enquiry_id), hours_week: h, from: f, to: t, note: clean(note).slice(0, 300), created_at: nowIso(now) };
}

/** what a won enquiry brings to its project when the person says yes: its value as the fee, its hours as the budget */
export function fromEnquiry(e) {
  if (!e) return null;
  const fee = pos(e.value_nzd), hours = pos(e.hours);
  return fee == null && hours == null ? null : { fee, hours };
}

// ---- who can change what -------------------------------------------------------------------------------------------
/**
 * In one browser, the person at it can change everything. In the shared records: a viewer changes nothing; a member logs
 * time, invoices and allocations, sets holds and the dial, and types the fee, budget hours and target dates; only an
 * owner changes the practice's money settings (targets, labels, chances, the team, the default rate) and a project's own
 * hourly rate. The database enforces the same (supabase/migrations/20261122130000_arch_money.sql).
 */
export const OWNER_ONLY = ['practice', 'rate'];
export const MEMBER_CAN = ['fee', 'hours', 'targets', 'split', 'time', 'invoice', 'allocation', 'hold', 'set', 'enquiry'];
export function can(what, { shared = false, role = 'owner' } = {}) {
  if (!shared) return true;
  if (role === 'owner') return true;
  if (role === 'member') return MEMBER_CAN.includes(what);
  return false;
}

/** the stage label for a key, or '' */
export const stageLabel = (k) => stageDef(k)?.label ?? '';
