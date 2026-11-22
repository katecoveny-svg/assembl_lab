// Clients: the rules, with no page in them. contact, enquiry and crm_activity rows, which enquiries have gone quiet or are
// overdue, who needs a next step, a stage move that writes its own history line, and the plain follow-up draft.
// crm.js draws these and saves them through the page's store. Nothing here saves, sends or reaches the network.
//
// Shapes (the page's own; cloud.js maps them to the arch tables):
//   contact       { id, name, email, phone, organisation, role, notes, archived, created_at }
//   enquiry       { id, title, contact_id, stage, value_nzd, source, next_action, next_action_due, owner, project_id, archived, created_at }
//   crm_activity  { id, enquiry_id, contact_id, kind, body, at, who, created_at }     append-only: never changed, never removed
// Contacts and enquiries are archived, never deleted. value_nzd is only ever what a person typed.

import { newId } from './model.js';

export const STAGES = [
  { key: 'new', label: 'New', hint: 'Not yet spoken to' },
  { key: 'meeting', label: 'Meeting', hint: 'Talking' },
  { key: 'proposal', label: 'Proposal', hint: 'Offer sent' },
  { key: 'won', label: 'Won', hint: 'Going ahead' },
  { key: 'lost', label: 'Lost', hint: 'Not going ahead' },
  { key: 'paused', label: 'Paused', hint: 'On hold' },
];
export const STAGE_KEYS = STAGES.map((s) => s.key);
export const stageLabel = (key) => STAGES.find((s) => s.key === key)?.label ?? String(key ?? '');
/** the stages where someone still has to do something: these are the ones that need a next step and can go quiet */
export const OPEN_STAGES = ['new', 'meeting', 'proposal'];
export const ACTIVITY_KINDS = ['note', 'call', 'meeting', 'email', 'stage'];
/** what a person can add by hand (a stage line is written by a move, never typed) */
export const TYPED_KINDS = ['note', 'call', 'meeting', 'email'];
export const KIND_LABEL = { note: 'Note', call: 'Call', meeting: 'Meeting', email: 'Email', stage: 'Stage' };
export const QUIET_DAYS = 14;

const clean = (s) => String(s ?? '').trim();
const nowIso = (now) => (now instanceof Date ? now : new Date(now ?? Date.now())).toISOString();
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

// ---- dates (all in the day where the person is) ---------------------------------------------------------------------
const pad = (n) => String(n).padStart(2, '0');
/** "2026-11-22" for the local day of a date */
export const dayKey = (v) => { const d = v instanceof Date ? v : new Date(v); return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const dayNumber = (key) => { const m = DAY.exec(key); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 : NaN; };
/** whole calendar days from one day to another (a later day gives a positive number) */
export const daysBetween = (from, to) => dayNumber(dayKey(to)) - dayNumber(dayKey(from));
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Fri 28 Nov" from a day or a date and time */
export function dayName(v) {
  const m = DAY.exec(String(v ?? '')), d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(v);
  return !v || Number.isNaN(d.getTime()) ? '' : `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
/** "28 Nov" (and the year when it is not this year) */
export function shortDay(v, now = new Date()) {
  const m = DAY.exec(String(v ?? '')), d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(v);
  if (!v || Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() === new Date(now).getFullYear() ? '' : ` ${d.getFullYear()}`}`;
}
/** "3:05 pm" */
export function clock(v) {
  const d = new Date(v);
  if (!v || Number.isNaN(d.getTime())) return '';
  const h = d.getHours();
  return `${h % 12 || 12}:${pad(d.getMinutes())} ${h < 12 ? 'am' : 'pm'}`;
}
/** the value for a datetime-local box: the local date and time now, to the minute */
export const localInput = (v = new Date()) => { const d = new Date(v); return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
/** a datetime-local value back to a full time, or '' when it is not one */
export function fromLocalInput(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(clean(text));
  if (!m) return '';
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

// ---- people and money ------------------------------------------------------------------------------------------------
/** "A. Client" -> "AC"; one name -> its first two letters; nothing -> "" */
export function initials(name) {
  const words = clean(name).replace(/[^\p{L}\p{N}\s'’-]/gu, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const pick = words.length === 1 ? [...words[0]].slice(0, 2).join('') : `${[...words[0]][0]}${[...words[words.length - 1]][0]}`;
  return pick.toLocaleUpperCase('en-NZ');
}
export const firstName = (name) => clean(name).split(/\s+/)[0] ?? '';

/**
 * The value a person typed, as a number of New Zealand dollars. '' gives null (no value yet). "$85,000" and "85 000" are fine.
 * Anything else is refused: nothing is guessed from it.
 */
export function parseValue(text) {
  const t = clean(text).replace(/^\$/, '').replace(/[\s,]/g, '');
  if (!t) return null;
  if (!/^\d{1,11}(\.\d{1,2})?$/.test(t)) throw new Error('Type the value as dollars, for example 85000. Leave it empty if there is none yet.');
  return Number(t);
}
export const money = (n) => (n == null || n === '' || !Number.isFinite(Number(n)) ? '' : `$${Number(n).toLocaleString('en-NZ', { maximumFractionDigits: 2 })}`);

// ---- new records ---------------------------------------------------------------------------------------------------
export function newContact({ name, email = '', phone = '', organisation = '', role = '', notes = '', now, id } = {}) {
  const n = clean(name);
  if (!n) throw new Error('Give the person a name.');
  return { id: id ?? newId('ct'), name: n, email: clean(email), phone: clean(phone), organisation: clean(organisation), role: clean(role), notes: clean(notes), archived: false, created_at: nowIso(now) };
}

export function newEnquiry({ title, contact_id = '', value_nzd = null, source = '', next_action = '', next_action_due = '', owner = '', now, id } = {}) {
  const t = clean(title);
  if (!t) throw new Error('Give the enquiry a title.');
  const due = clean(next_action_due);
  if (due && !DAY.test(due)) throw new Error('Give the date as day, month and year.');
  return { id: id ?? newId('en'), title: t, contact_id: clean(contact_id), stage: 'new', value_nzd: value_nzd ?? null, source: clean(source), next_action: clean(next_action), next_action_due: due, owner: clean(owner), project_id: '', archived: false, created_at: nowIso(now) };
}

/** a line of history. "at" is when it happened (not when it was typed); a stage line is written by moveEnquiry. */
export function newActivity({ enquiry_id = '', contact_id = '', kind = 'note', body, at, who = '', now, id } = {}) {
  const text = clean(body);
  if (!ACTIVITY_KINDS.includes(kind)) throw new Error('That is not a kind of history line.');
  if (!text) throw new Error('Write what happened.');
  if (!clean(enquiry_id) && !clean(contact_id)) throw new Error('A history line belongs to an enquiry or a person.');
  const when = at ? new Date(at) : new Date(now ?? Date.now());
  if (Number.isNaN(when.getTime())) throw new Error('That date and time is not one.');
  return { id: id ?? newId('ca'), enquiry_id: clean(enquiry_id), contact_id: clean(contact_id), kind, body: text, at: when.toISOString(), who: clean(who), created_at: nowIso(now) };
}

// ---- ids that may or may not carry a prefix ---------------------------------------------------------------------------
/** The browser keeps "en_<uuid>" and the shared records keep "<uuid>": the same record. */
export const bare = (id) => String(id ?? '').replace(/^[a-z]{1,8}_(?=[0-9a-f]{8}-)/i, '').toLowerCase();
export const sameId = (a, b) => !!a && !!b && bare(a) === bare(b);

// ---- what has gone quiet, what is overdue, who needs a next step ----------------------------------------------------------
export const isOpen = (e) => !!e && !e.archived && OPEN_STAGES.includes(e.stage);
const actsOf = (e, acts) => acts.filter((a) => sameId(a.enquiry_id, e.id));

/** the last time anything was logged on this enquiry, or when it was made if nothing was */
export function lastTouch(e, acts = []) {
  let best = '';
  for (const a of actsOf(e, acts)) { const t = new Date(a.at).getTime(); if (!Number.isNaN(t) && (!best || t > new Date(best).getTime())) best = a.at; }
  return best || e.created_at || '';
}
/** days since anything was logged, or null when there is nothing to go by */
export function quietDays(e, acts = [], now = new Date()) {
  const t = lastTouch(e, acts);
  return t ? Math.max(0, daysBetween(t, now)) : null;
}
/** an open enquiry with nothing logged for 14 days or more */
export const isQuiet = (e, acts = [], now = new Date()) => isOpen(e) && (quietDays(e, acts, now) ?? 0) >= QUIET_DAYS;
/** an open enquiry whose next step was due before today */
export const isOverdue = (e, now = new Date()) => isOpen(e) && DAY.test(e.next_action_due ?? '') && e.next_action_due < dayKey(now);

/** Which of the three things a next step needs are missing: who, what, when. */
export function missingStep(e) {
  const out = [];
  if (!clean(e.owner)) out.push('who');
  if (!clean(e.next_action)) out.push('what');
  if (!clean(e.next_action_due)) out.push('when');
  return out;
}

/**
 * The next-steps queue: every open enquiry, the ones missing a who, a what or a when first (an enquiry with no next step
 * quietly dies), then by the date the step is due, the soonest first. Returns [{ enquiry, missing, overdue, quiet, days }].
 */
export function nextSteps(enquiries = [], acts = [], now = new Date()) {
  const rows = enquiries.filter(isOpen).map((enquiry) => ({
    enquiry, missing: missingStep(enquiry), overdue: isOverdue(enquiry, now), quiet: isQuiet(enquiry, acts, now), days: quietDays(enquiry, acts, now),
  }));
  const due = (r) => (r.enquiry.next_action_due && DAY.test(r.enquiry.next_action_due) ? r.enquiry.next_action_due : '9999-12-31');
  return rows.sort((a, b) =>
    (b.missing.length > 0) - (a.missing.length > 0)
    || b.missing.length - a.missing.length
    || (b.overdue - a.overdue)
    || due(a).localeCompare(due(b))
    || (b.quiet - a.quiet)
    || a.enquiry.title.localeCompare(b.enquiry.title)
    || String(a.enquiry.id).localeCompare(String(b.enquiry.id)));
}

/** history, the newest first (ties keep the order they were made in) */
export const timeline = (acts = []) => acts.map((a, i) => [a, i]).sort(([a, i], [b, j]) => String(b.at).localeCompare(String(a.at)) || j - i).map(([a]) => a);

// ---- moving a stage --------------------------------------------------------------------------------------------------------
/**
 * Move an enquiry to another stage. Returns { enquiry, activity }: the enquiry as it should now be saved, and the "stage"
 * line to save with it. Returns null when it is already there. It saves nothing and it is only ever called when a person
 * moves a card (dragging it or choosing "Move to…").
 */
export function moveEnquiry(e, to, { who = '', now } = {}) {
  if (!STAGE_KEYS.includes(to)) throw new Error('That is not a stage.');
  if (e.stage === to) return null;
  const activity = newActivity({
    enquiry_id: e.id, contact_id: e.contact_id, kind: 'stage', body: `Moved from ${stageLabel(e.stage)} to ${stageLabel(to)}.`, who, now, at: nowIso(now),
  });
  return { enquiry: { ...e, stage: to }, activity };
}

// ---- the follow-up draft ----------------------------------------------------------------------------------------------------
/**
 * A short, plain draft built from the last thing that happened and the next step. Template text: no network, no model,
 * and nothing is sent. The person copies it and sends it themselves.
 */
export function followUpDraft({ enquiry, contact = null, acts = [], me = '', now = new Date() } = {}) {
  if (!enquiry) return '';
  const last = timeline(actsOf(enquiry, acts)).find((a) => a.kind !== 'stage');
  const name = firstName(contact?.name);
  const lines = [name ? `Hi ${name},` : 'Hi,', ''];
  const on = last ? dayName(last.at) : '';
  if (!last) lines.push(`I am getting in touch about ${enquiry.title}.`);
  else if (last.kind === 'meeting') lines.push(`Thanks for meeting on ${on}.`);
  else if (last.kind === 'call') lines.push(`Thanks for the call on ${on}.`);
  else if (last.kind === 'email') lines.push(`Following up on my email of ${on} about ${enquiry.title}.`);
  else lines.push(`Following up on ${enquiry.title}.`);
  const what = clean(enquiry.next_action).replace(/[.\s]+$/, ''), due = clean(enquiry.next_action_due);
  if (what && DAY.test(due)) lines.push(`Next, ${lowerFirst(what)}, by ${dayName(due)}.`);
  else if (what) lines.push(`Next, ${lowerFirst(what)}.`);
  else lines.push('Tell me what suits as a next step and I will plan around it.');
  lines.push('If anything has changed on your side, let me know.', '', 'Ngā mihi,');
  const sign = clean(me) || clean(enquiry.owner);
  if (sign) lines.push(sign);
  return lines.join('\n');
}
const lowerFirst = (s) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

/** what an enquiry's card should say, in plain words: value, due date, flags */
export function cardFacts(e, acts = [], now = new Date()) {
  return {
    value: money(e.value_nzd), due: e.next_action_due ? shortDay(e.next_action_due, now) : '', overdue: isOverdue(e, now),
    quiet: isQuiet(e, acts, now), days: quietDays(e, acts, now), missing: isOpen(e) ? missingStep(e) : [],
  };
}
