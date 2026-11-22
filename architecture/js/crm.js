// Clients: a small visual CRM inside the architecture operations page. It registers itself with the add-on registry
// (modules.js): a screen at #/crm, a top-bar link, and a "Client" section on each project.
//
//   #/crm                  the pipeline board, with the next steps along the top
//   #/crm/contacts         the people
//   #/crm/c/<contact id>   one person: their enquiries and a timeline
//   #/crm/e/<enquiry id>   one enquiry: the timeline, the next step, the linked project
//
// Records go through the page's store (ctx.store): this browser when signed out, the practice's shared records when signed
// in. Nothing here sends anything, deletes anything, moves a stage or starts a project unless a person presses a button.

import { registerRoute, registerNav, registerProjectPanel } from './modules.js';
import { newProject, activity as projectActivity } from './model.js';
import {
  STAGES, STAGE_KEYS, TYPED_KINDS, KIND_LABEL, QUIET_DAYS, stageLabel, newContact, newEnquiry, newActivity, initials, parseValue, money, isOpen, isQuiet, isOverdue,
  quietDays, missingStep, nextSteps, moveEnquiry, followUpDraft, timeline, sameId, dayName, shortDay, clock, localInput, fromLocalInput, cardFacts, daysBetween,
} from './crm-model.js';
import { createHunt, ensureHuntCss } from './hunt.js';
import { sourceLink } from './hunt-model.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const attr = esc;

// ---- the stylesheet ---------------------------------------------------------------------------------------------------
let cssReady = null;
function ensureCss() {
  if (cssReady) return cssReady;
  const href = new URL('../crm.css?v=1', import.meta.url).href;
  const existing = [...document.querySelectorAll('link[rel="stylesheet"]')].find((l) => l.dataset.crm === '1');
  const link = existing ?? Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
  link.dataset.crm = '1';
  cssReady = new Promise((resolve) => {
    if (existing && existing.sheet) return resolve();
    const done = () => resolve();
    link.addEventListener('load', done, { once: true }); link.addEventListener('error', done, { once: true });
    setTimeout(done, 2500); // a slow stylesheet never holds the screen back for long
    if (!existing) document.head.append(link);
  });
  return cssReady;
}

// ---- line icons: stroke 1.5, currentColor, never emoji ------------------------------------------------------------------
const P = {
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.3a3.2 3.2 0 0 1 0 5.9M18 14c1.8.7 3 2.4 3 5"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  move: '<path d="M4 8h13m-3-3 3 3-3 3M20 16H7m3-3-3 3 3 3"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="1"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  alert: '<path d="M12 4 3 19.5h18L12 4Z"/><path d="M12 10v4.5M12 17v.3"/>',
  note: '<path d="M6 3.5h9l4 4V20.5H6z"/><path d="M14.5 3.5V8H19M9 12.5h7M9 16h5"/>',
  call: '<path d="M7.5 4h2.8l1.4 4-2 1.3a11 11 0 0 0 5 5l1.3-2 4 1.4v2.8a2 2 0 0 1-2.1 2A15.5 15.5 0 0 1 5.5 6.1 2 2 0 0 1 7.5 4Z"/>',
  meeting: '<path d="M4 6.5h16v10H12l-4.5 3.5v-3.5H4z"/><path d="M8 10.5h8M8 13h5"/>',
  email: '<rect x="3.5" y="5.5" width="17" height="13" rx="1"/><path d="m4 7 8 6 8-6"/>',
  stage: '<path d="M5 20V4M5 5h11l-2 3.5 2 3.5H5"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="1"/><path d="M15.5 8.5v-3a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  checksq: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="m8 12.5 3 3 5-6"/>',
  archive: '<rect x="3.5" y="4.5" width="17" height="4" rx="1"/><path d="M5 8.5V19h14V8.5M10 12.5h4"/>',
  folder: '<path d="M3.5 6.5a1 1 0 0 1 1-1H10l2 2.5h7.5a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z"/>',
  building: '<path d="M5 20.5V4.5h9v16M14 9.5h5v11M3.5 20.5h17M8 8.5h3M8 12h3M8 15.5h3"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>',
  dollar: '<path d="M12 3.5v17M16 7.5c-.6-1.2-2-2-4-2-2.4 0-4 1.2-4 3 0 4.5 8.4 2 8.4 6.5 0 1.800-1.700 3-4.400 3-2.200 0-3.800-.9-4.400-2.200"/>',
  inbox: '<path d="M3.5 13.5 6 5.5h12l2.500 8v5h-17z"/><path d="M3.5 13.5H9a3 3 0 0 0 6 0h5.500"/>',
  pause: '<rect x="7" y="5" width="3.5" height="14"/><rect x="13.500" y="5" width="3.500" height="14"/>',
  xcircle: '<circle cx="12" cy="12" r="8.500"/><path d="m9 9 6 6m0-6-6 6"/>',
  circlecheck: '<circle cx="12" cy="12" r="8.500"/><path d="m8.500 12.500 2.500 2.500 4.500-5"/>',
  send: '<path d="M4 12 20 4l-4 16-4.500-6.500z"/>',
};
const icon = (name, cls = '') => `<svg class="crm-i ${cls}" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] ?? ''}</svg>`;
const STAGE_ICON = { new: 'inbox', meeting: 'meeting', proposal: 'note', won: 'circlecheck', lost: 'xcircle', paused: 'pause' };
const KIND_ICON = { note: 'note', call: 'call', meeting: 'meeting', email: 'email', stage: 'stage' };
const NAV_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" focusable="false">${P.users}</svg>`;

// ---- small pieces of page -----------------------------------------------------------------------------------------------
const avatar = (name, cls = '') => `<span class="crm-av ${cls}" aria-hidden="true">${esc(initials(name) || '–')}</span>`;
const stageChip = (key) => `<span class="crm-chip" data-stage="${attr(key)}">${icon(STAGE_ICON[key], 'crm-i-s')}<span>${esc(stageLabel(key))}</span></span>`;
const emptyLine = (ic, text) => `<p class="crm-none">${icon(ic)}<span>${esc(text)}</span></p>`;
const when = (iso) => `${dayName(iso)}, ${clock(iso)}`;
function ago(iso, now) {
  const d = daysBetween(iso, now);
  if (!(d >= 0)) return '';
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : d < 60 ? `${d} days ago` : shortDay(iso, now);
}
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** where an enquiry came from; a notice link (from Found work) is a real link that opens the notice */
function sourceFact(text) {
  const url = sourceLink(text);
  return url ? `<a href="${attr(url)}" target="_blank" rel="noopener noreferrer">${icon('arrow', 'crm-i-s')}<span>${esc(text.replace(url, '').replace(/[\s·]+$/, ''))}<span class="vh"> (opens the notice)</span></span></a>` : `<span>${icon('arrow', 'crm-i-s')}<span>${esc(text)}</span></span>`;
}

// ---- state kept between draws (one screen at a time) ----------------------------------------------------------------------
const ui = { stage: null, allSteps: false, adding: null, offer: null, projectForm: null, flash: null, draft: null, logKind: 'note', edit: null, focus: null, announce: '' };

// ---- the screen ------------------------------------------------------------------------------------------------------------
async function renderScreen(el, ctx, rest = []) {
  await Promise.all([ensureCss(), ensureHuntCss()]);
  const [view, id] = rest;
  // a message belongs to the screen it was made on; opening another screen puts it away (unless the screen was opened by that very action)
  const key = rest.join('/');
  if (ui.key !== key) { if (!ui.carry) ui.flash = null; ui.edit = null; ui.draft = null; ui.projectForm = ui.projectForm && view === 'c' ? null : ui.projectForm; }
  ui.key = key; ui.carry = false;
  const st = { contacts: [], enquiries: [], acts: [] };
  // "Found work" above the board (hunt.js): drawn from its own state, so a redraw here never looks anything up again
  const hunt = view ? null : createHunt(ctx, { enquiries: () => st.enquiries, readOnly, redraw: () => draw(), added: async (text) => { ok(text); await refresh(); } });
  const readOnly = ctx.practice?.role === 'viewer';
  const now = () => new Date();
  let gone = false;

  const load = async () => {
    [st.contacts, st.enquiries, st.acts] = await Promise.all([ctx.store.list('contact'), ctx.store.list('enquiry'), ctx.store.list('crm_activity')]);
  };
  const contactOf = (e) => st.contacts.find((c) => sameId(c.id, e?.contact_id)) ?? null;
  const enquiryById = (x) => st.enquiries.find((e) => sameId(e.id, x)) ?? null;
  const contactById = (x) => st.contacts.find((c) => sameId(c.id, x)) ?? null;
  const actsOfEnquiry = (e) => st.acts.filter((a) => sameId(a.enquiry_id, e.id));
  const enquiriesOf = (c) => st.enquiries.filter((e) => sameId(e.contact_id, c.id));
  const actsOfContact = (c) => {
    const mine = new Set(enquiriesOf(c).map((e) => e.id));
    return st.acts.filter((a) => sameId(a.contact_id, c.id) || [...mine].some((m) => sameId(a.enquiry_id, m)));
  };
  const orgOrName = (e) => { const c = contactOf(e); return c ? (c.organisation || c.name) : ''; };

  // -- the top of every Clients screen
  const head = (title, sub = '') => `
    <header class="crm-head">
      <div class="crm-head-t">
        <h1>${esc(title)}</h1>${sub ? `<p class="crm-sub">${esc(sub)}</p>` : ''}
      </div>
      <nav class="crm-tabs" aria-label="Clients">
        <a href="#/crm" ${!view ? 'aria-current="page"' : ''}>${icon('stage')}<span>Pipeline</span></a>
        <a href="#/crm/contacts" ${view === 'contacts' ? 'aria-current="page"' : ''}>${icon('users')}<span>People</span></a>
      </nav>
      ${readOnly ? '' : `<div class="crm-head-a">
        <button type="button" class="crm-btn solid" data-crm="add-enquiry" aria-expanded="${ui.adding === 'enquiry'}">${icon('plus')}<span>New enquiry</span></button>
        <button type="button" class="crm-btn" data-crm="add-contact" aria-expanded="${ui.adding === 'contact'}">${icon('plus')}<span>New person</span></button>
      </div>`}
    </header>
    ${readOnly ? `<p class="crm-flash">${icon('alert')}<span>You can look at everything here and change nothing.</span></p>` : ''}
    ${flashHtml()}${addPanels()}`;
  const flashHtml = () => (ui.flash ? `<p class="crm-flash${ui.flash.error ? ' is-error' : ''}" role="${ui.flash.error ? 'alert' : 'status'}">${icon(ui.flash.error ? 'alert' : 'check')}<span>${esc(ui.flash.text)}</span></p>` : '');

  const field = (name, label, o = {}) => `<label class="crm-f${o.wide ? ' wide' : ''}"><span>${esc(label)}</span>${o.area
    ? `<textarea name="${name}" rows="${o.rows ?? 3}"${o.req ? ' required' : ''}${o.ph ? ` placeholder="${attr(o.ph)}"` : ''}>${esc(o.value ?? '')}</textarea>`
    : `<input name="${name}" type="${o.type ?? 'text'}" value="${attr(o.value ?? '')}"${o.req ? ' required' : ''}${o.ph ? ` placeholder="${attr(o.ph)}"` : ''}${o.inputmode ? ` inputmode="${o.inputmode}"` : ''}${o.auto ? ` autocomplete="${o.auto}"` : ''}>`}</label>`;
  const contactSelect = (value = '', withNew = true) => `<label class="crm-f"><span>Person</span><select name="contact_id">
      <option value="">${withNew ? 'Nobody yet' : 'Nobody'}</option>${st.contacts.filter((c) => !c.archived || sameId(c.id, value)).sort((a, b) => a.name.localeCompare(b.name)).map((c) => `<option value="${attr(c.id)}"${sameId(c.id, value) ? ' selected' : ''}>${esc(c.name)}${c.organisation ? `, ${esc(c.organisation)}` : ''}</option>`).join('')}
    </select></label>`;

  function addPanels() {
    if (readOnly) return '';
    if (ui.adding === 'enquiry') {
      const pre = ui.adding_contact ?? '';
      return `<form class="crm-panel" data-crm-form="new-enquiry" aria-label="New enquiry" novalidate>
        <div class="crm-grid">
          ${field('title', 'What is it?', { req: 1, wide: 1, ph: 'Hill house', auto: 'off' })}
          ${contactSelect(pre)}
          ${field('new_person', 'Or a new person', { ph: 'A. Client', auto: 'off' })}
          ${field('value', 'Value, NZD (if you know)', { inputmode: 'numeric', ph: '85000' })}
          ${field('source', 'Where it came from', { ph: 'Referral' })}
          ${field('next_action', 'Next step: what', { ph: 'Visit the site' })}
          ${field('owner', 'Next step: who', { value: ctx.me ?? '', auto: 'name' })}
          ${field('next_action_due', 'Next step: when', { type: 'date' })}
        </div>
        <div class="crm-acts"><button class="crm-btn solid" type="submit">${icon('check')}<span>Add enquiry</span></button><button class="crm-btn" type="button" data-crm="cancel-add">Cancel</button></div>
      </form>`;
    }
    if (ui.adding === 'contact') {
      return `<form class="crm-panel" data-crm-form="new-contact" aria-label="New person" novalidate>
        <div class="crm-grid">
          ${field('name', 'Name', { req: 1, auto: 'off', ph: 'A. Client' })}
          ${field('organisation', 'Organisation', { auto: 'off' })}
          ${field('role', 'Role', { auto: 'off' })}
          ${field('email', 'Email', { type: 'email', auto: 'off' })}
          ${field('phone', 'Phone', { type: 'tel', auto: 'off' })}
          ${field('notes', 'Notes', { area: 1, rows: 2, wide: 1 })}
        </div>
        <div class="crm-acts"><button class="crm-btn solid" type="submit">${icon('check')}<span>Add person</span></button><button class="crm-btn" type="button" data-crm="cancel-add">Cancel</button></div>
      </form>`;
    }
    return '';
  }

  // ---------------------------------------------------------------------------------- the board
  const dueKey = (e) => e.next_action_due || '9999-12-31';
  const byUrgency = (a, b) => (isOverdue(b, now()) - isOverdue(a, now())) || dueKey(a).localeCompare(dueKey(b)) || a.title.localeCompare(b.title);

  function card(e) {
    const f = cardFacts(e, st.acts, now()), org = orgOrName(e), c = contactOf(e);
    const flags = [];
    if (f.value) flags.push(`<span class="crm-pill" title="Typed by a person"><span>${esc(f.value)}</span></span>`);
    if (f.due) flags.push(f.overdue
      ? `<span class="crm-pill is-overdue" title="The next step was due ${attr(f.due)}">${icon('alert', 'crm-i-s')}<span>${esc(f.due)}<span class="vh"> (overdue)</span></span></span>`
      : `<span class="crm-pill">${icon('calendar', 'crm-i-s')}<span>${esc(f.due)}</span></span>`);
    if (f.quiet) flags.push(`<span class="crm-pill is-quiet" title="Nothing logged for ${f.days} days">${icon('clock', 'crm-i-s')}<span>${f.days} d quiet</span></span>`);
    if (f.missing.length) flags.push(`<span class="crm-pill is-need" title="Needs: ${attr(f.missing.join(', '))}">${icon('checksq', 'crm-i-s')}<span>${f.missing.length === 3 ? 'No next step' : `Needs ${esc(f.missing.join(', '))}`}</span></span>`);
    return `<li class="crm-card${f.overdue ? ' is-overdue' : ''}" data-id="${attr(e.id)}" data-stage="${attr(e.stage)}" ${readOnly ? '' : 'draggable="true"'}>
      <div class="crm-card-top">
        ${avatar(c?.name || e.title, 'sm')}
        <span class="crm-card-org">${org ? esc(org) : 'No person yet'}</span>
        ${readOnly ? '' : `<button type="button" class="crm-move" data-crm="menu" data-id="${attr(e.id)}" aria-haspopup="menu" aria-expanded="false" aria-label="Move ${attr(e.title)} to another stage" title="Move to…">${icon('move')}</button>`}
      </div>
      <a class="crm-card-title" href="#/crm/e/${encodeURIComponent(e.id)}">${esc(e.title)}</a>
      ${flags.length ? `<div class="crm-card-meta">${flags.join('')}</div>` : ''}
    </li>`;
  }

  function stepsStrip() {
    const q = nextSteps(st.enquiries, st.acts, now());
    if (!q.length) {
      return `<section class="crm-next" aria-labelledby="crm-next-h"><h2 id="crm-next-h" class="crm-h">${icon('checksq')}<span>Next steps</span></h2>
        ${emptyLine('checksq', st.enquiries.some(isOpen) ? 'Every open enquiry has a next step.' : 'Each open enquiry shows here with who, what and when.')}</section>`;
    }
    const show = ui.allSteps ? q : q.slice(0, 4);
    const need = q.filter((r) => r.missing.length).length;
    const slot = (r, key, ic, text, extra = '') => {
      const miss = r.missing.includes(key);
      return `<span class="crm-slot${miss ? ' is-missing' : ''}${extra}">${icon(miss ? 'alert' : ic, 'crm-i-s')}<span>${miss ? `<span class="vh">Missing: </span>${{ who: 'Who?', what: 'What?', when: 'When?' }[key]}` : esc(text)}</span></span>`;
    };
    return `<section class="crm-next" aria-labelledby="crm-next-h">
      <h2 id="crm-next-h" class="crm-h">${icon('checksq')}<span>Next steps</span><span class="crm-count">${q.length}<span class="vh"> open ${q.length === 1 ? 'enquiry' : 'enquiries'}</span></span>${need ? `<span class="crm-count is-need">${need} to fix</span>` : ''}</h2>
      <ul class="crm-steps${ui.allSteps ? ' is-all' : ''}">${show.map((r) => {
        const e = r.enquiry, c = contactOf(e);
        return `<li class="crm-step${r.missing.length ? ' is-missing' : ''}${r.overdue ? ' is-overdue' : ''}">
          <a class="crm-step-t" href="#/crm/e/${encodeURIComponent(e.id)}">${avatar(c?.name || e.title, 'sm')}<span>${esc(e.title)}</span></a>
          <span class="crm-slots">${slot(r, 'who', 'user', e.owner)}${slot(r, 'what', 'checksq', e.next_action)}${slot(r, 'when', r.overdue ? 'alert' : 'calendar', shortDay(e.next_action_due, now()), r.overdue ? ' is-overdue' : '')}</span>
        </li>`;
      }).join('')}</ul>
      ${q.length > 2 ? `<button type="button" class="crm-link${q.length <= 4 ? ' crm-only-small' : ''}" data-crm="all-steps" aria-expanded="${ui.allSteps}">${ui.allSteps ? 'Show fewer' : `Show all ${q.length}`}</button>` : ''}
    </section>`;
  }

  function offerHtml() {
    const o = ui.offer;
    if (!o) return '';
    const e = enquiryById(o.id);
    if (!e) return '';
    if (o.done) return `<div class="crm-offer is-done" role="status">${icon('folder')}<span><strong>${esc(e.title)}</strong> is now a project.</span><a class="crm-btn solid" href="#/p/${encodeURIComponent(o.pid)}">Open the project</a><button type="button" class="crm-link" data-crm="dismiss-offer">Close</button></div>`;
    if (e.project_id || e.stage !== 'won') return '';
    if (ui.projectForm === e.id) return projectForm(e, 'crm-offer');
    return `<div class="crm-offer" role="status">${icon('circlecheck')}<span><strong>${esc(e.title)}</strong> is won.</span>
      <button type="button" class="crm-btn solid" data-crm="project-form" data-id="${attr(e.id)}">${icon('folder')}<span>Start a project from this</span></button>
      <button type="button" class="crm-link" data-crm="dismiss-offer">Not now</button></div>`;
  }
  function projectForm(e, cls = '') {
    const c = contactOf(e);
    return `<form class="${cls} crm-panel" data-crm-form="start-project" data-id="${attr(e.id)}" aria-label="Start a project from ${attr(e.title)}" novalidate>
      <p class="crm-note">${icon('folder')}<span>This makes a new project in the practice. Nothing is made until you press Create project.</span></p>
      <div class="crm-grid">${field('name', 'Project name', { value: e.title, req: 1, auto: 'off' })}${field('client', 'Client', { value: c?.organisation || c?.name || '', auto: 'off' })}</div>
      <div class="crm-acts"><button class="crm-btn solid" type="submit">${icon('check')}<span>Create project</span></button><button class="crm-btn" type="button" data-crm="cancel-project-form">Cancel</button></div>
    </form>`;
  }

  function board() {
    const live = st.enquiries.filter((e) => !e.archived), archived = st.enquiries.filter((e) => e.archived);
    const by = Object.fromEntries(STAGE_KEYS.map((k) => [k, live.filter((e) => e.stage === k).sort(byUrgency)]));
    if (!ui.stage) ui.stage = STAGE_KEYS.find((k) => by[k].length) ?? 'new';
    const none = !live.length;
    const cols = STAGES.map((s) => `
      <section class="crm-col" data-stage="${s.key}" aria-labelledby="crm-col-${s.key}">
        <h3 id="crm-col-${s.key}" class="crm-col-h">${icon(STAGE_ICON[s.key])}<span>${esc(s.label)}</span><span class="crm-count">${by[s.key].length}</span></h3>
        <ul class="crm-cards">${by[s.key].map(card).join('')}</ul>
        ${by[s.key].length ? '' : none && s.key === 'new'
          ? `<div class="crm-ghost" aria-hidden="true"><span class="crm-av sm"></span><span class="crm-bar w60"></span><span class="crm-bar w40"></span><span class="crm-pillbar"></span></div><p class="crm-hint">Each enquiry is a card here: who, what, its value and its next step.</p>`
          : `<p class="crm-hint">${icon(STAGE_ICON[s.key], 'crm-i-s')}<span>${esc(emptyColumn[s.key])}</span></p>`}
      </section>`).join('');
    const switcher = `<div class="crm-switch" role="group" aria-label="Show a stage">${STAGES.map((s) => `
      <button type="button" data-crm="stage" data-stage="${s.key}" aria-pressed="${ui.stage === s.key}">${icon(STAGE_ICON[s.key])}<span>${esc(s.label)}</span><span class="crm-count">${by[s.key].length}</span></button>`).join('')}</div>`;
    return `${stepsStrip()}${offerHtml()}${hunt ? hunt.html() : ''}
      <section class="crm-board" data-show="${attr(ui.stage)}" aria-label="Pipeline">${switcher}<div class="crm-cols">${cols}</div></section>
      ${archived.length ? `<details class="crm-arch"><summary>${icon('archive')}<span>Archived (${archived.length})</span></summary><ul>${archived.map((e) => `<li><a href="#/crm/e/${encodeURIComponent(e.id)}">${esc(e.title)}</a>${stageChip(e.stage)}</li>`).join('')}</ul></details>` : ''}`;
  }
  const emptyColumn = { new: 'Enquiries nobody has spoken to yet.', meeting: 'Enquiries you are talking with.', proposal: 'Enquiries with an offer out.', won: 'Enquiries going ahead.', lost: 'Enquiries not going ahead.', paused: 'Enquiries on hold.' };

  // ---------------------------------------------------------------------------------- people
  function contactsView() {
    const live = st.contacts.filter((c) => !c.archived).sort((a, b) => a.name.localeCompare(b.name)), archived = st.contacts.filter((c) => c.archived);
    const tile = (c) => {
      const mine = enquiriesOf(c), open = mine.filter(isOpen).length, acts = actsOfContact(c);
      const last = acts.length ? timeline(acts)[0].at : '';
      return `<li><a class="crm-person" href="#/crm/c/${encodeURIComponent(c.id)}">
        ${avatar(c.name, 'lg')}
        <span class="crm-person-n">${esc(c.name)}</span>
        <span class="crm-person-o">${c.organisation ? `${icon('building', 'crm-i-s')}<span>${esc(c.organisation)}</span>` : '<span>&nbsp;</span>'}</span>
        <span class="crm-person-m"><span class="crm-pill${open ? '' : ' is-flat'}">${icon('stage', 'crm-i-s')}<span>${open} open</span></span>
        <span class="crm-pill is-flat">${icon('clock', 'crm-i-s')}<span>${last ? esc(ago(last, now())) : 'No contact yet'}</span></span></span>
      </a></li>`;
    };
    return `${live.length ? `<ul class="crm-people">${live.map(tile).join('')}</ul>`
      : `<div class="crm-empty"><ul class="crm-people"><li class="crm-person is-ghost" aria-hidden="true"><span class="crm-av lg"></span><span class="crm-bar w60"></span><span class="crm-bar w40"></span><span class="crm-pillbar"></span></li></ul>${emptyLine('users', 'People you work with appear here as cards: who, where they work, what is open.')}</div>`}
      ${archived.length ? `<details class="crm-arch"><summary>${icon('archive')}<span>Archived (${archived.length})</span></summary><ul>${archived.map((c) => `<li><a href="#/crm/c/${encodeURIComponent(c.id)}">${esc(c.name)}</a></li>`).join('')}</ul></details>` : ''}`;
  }

  // ---------------------------------------------------------------------------------- the timeline, used by both pages
  function timelineHtml(acts, { showEnquiry = false } = {}) {
    if (!acts.length) return emptyLine('note', 'Notes, calls, meetings and emails appear here, newest first.');
    return `<ol class="crm-tl">${timeline(acts).map((a) => {
      const e = showEnquiry ? enquiryById(a.enquiry_id) : null;
      return `<li class="crm-tl-i" data-kind="${attr(a.kind)}">
        <span class="crm-tl-ic">${icon(KIND_ICON[a.kind] ?? 'note')}</span>
        <div class="crm-tl-b">
          <p class="crm-tl-h"><strong>${esc(KIND_LABEL[a.kind] ?? a.kind)}</strong><span>${esc(when(a.at))}</span>${a.who ? `<span>${esc(a.who)}</span>` : ''}${e ? `<a href="#/crm/e/${encodeURIComponent(e.id)}">${esc(e.title)}</a>` : ''}</p>
          <p class="crm-tl-t">${esc(a.body)}</p>
        </div>
      </li>`;
    }).join('')}</ol>`;
  }
  function logForm(kind, ids) {
    if (readOnly) return '';
    return `<form class="crm-log" data-crm-form="log" data-enquiry="${attr(ids.enquiry ?? '')}" data-contact="${attr(ids.contact ?? '')}" novalidate>
      <div class="crm-kinds" role="group" aria-label="What happened">${TYPED_KINDS.map((k) => `<button type="button" data-crm="kind" data-kind="${k}" aria-pressed="${kind === k}">${icon(KIND_ICON[k])}<span>${esc(KIND_LABEL[k])}</span></button>`).join('')}</div>
      <label class="crm-f wide"><span class="vh">What happened</span><textarea name="body" rows="3" required placeholder="${{ note: 'A note', call: 'What was said on the call', meeting: 'What came out of the meeting', email: 'What the email said' }[kind]}"></textarea></label>
      <label class="crm-f"><span>When it happened</span><input type="datetime-local" name="at" value="${attr(localInput(now()))}" required></label>
      <button class="crm-btn solid" type="submit">${icon('plus')}<span>Add to the timeline</span></button>
    </form>`;
  }

  // ---------------------------------------------------------------------------------- an enquiry
  function enquiryView(e) {
    const c = contactOf(e), f = cardFacts(e, st.acts, now()), acts = actsOfEnquiry(e);
    const proj = e.project_id;
    const miss = missingStep(e);
    const stepper = `<div class="crm-stepper" role="group" aria-label="Stage">${STAGES.map((s) => `<button type="button" data-crm="move-to" data-id="${attr(e.id)}" data-stage="${s.key}" ${e.stage === s.key ? 'aria-current="step"' : ''} ${readOnly ? 'disabled' : ''}>${icon(STAGE_ICON[s.key])}<span>${esc(s.label)}</span></button>`).join('')}</div>`;
    const detailForm = ui.edit === e.id ? `<form class="crm-panel" data-crm-form="edit-enquiry" data-id="${attr(e.id)}" aria-label="Edit details" novalidate>
        <div class="crm-grid">${field('title', 'Title', { value: e.title, req: 1, wide: 1 })}${contactSelect(e.contact_id)}${field('value', 'Value, NZD (if you know)', { value: e.value_nzd ?? '', inputmode: 'numeric' })}${field('source', 'Where it came from', { value: e.source })}</div>
        <div class="crm-acts"><button class="crm-btn solid" type="submit">${icon('check')}<span>Save</span></button><button class="crm-btn" type="button" data-crm="cancel-edit">Cancel</button></div></form>` : '';
    const draftText = ui.draft === e.id ? followUpDraft({ enquiry: e, contact: c, acts, me: ctx.me, now: now() }) : '';
    const draft = ui.draft === e.id ? `<div class="crm-draft">
        <label class="crm-f"><span>Draft</span><textarea id="crm-draft-t" rows="${draftText.split('\n').length + 2}" spellcheck="true">${esc(draftText)}</textarea></label>
        <div class="crm-acts"><button type="button" class="crm-btn solid" data-crm="copy">${icon('copy')}<span>Copy</span></button><button type="button" class="crm-link" data-crm="close-draft">Close</button></div>
        <p class="crm-note">${icon('send')}<span>Copy and send it yourself. assembl does not send anything.</span></p>
      </div>` : '';
    const projectCard = proj
      ? `<div class="crm-side-c">${icon('folder')}<div><p class="crm-lab">Project</p><a class="crm-big" href="#/p/${encodeURIComponent(proj)}">Open the project</a></div></div>`
      : e.stage === 'won' && !readOnly
        ? (ui.projectForm === e.id ? projectForm(e) : `<div class="crm-side-c">${icon('circlecheck')}<div><p class="crm-lab">Project</p><button type="button" class="crm-btn solid" data-crm="project-form" data-id="${attr(e.id)}">${icon('folder')}<span>Start a project from this</span></button></div></div>`)
        : `<div class="crm-side-c is-flat">${icon('folder')}<div><p class="crm-lab">Project</p><p class="crm-dim">${e.stage === 'won' ? 'None yet.' : 'A won enquiry can start a project.'}</p></div></div>`;
    return `
      <p class="crm-crumb"><a href="#/crm">${icon('back', 'crm-i-s')}<span>Pipeline</span></a></p>
      <header class="crm-ehead">
        ${avatar(c?.name || e.title, 'lg')}
        <div class="crm-ehead-t"><h1>${esc(e.title)}</h1>
          <p class="crm-facts">${c ? `<a href="#/crm/c/${encodeURIComponent(c.id)}">${icon('user', 'crm-i-s')}<span>${esc(c.name)}${c.organisation ? `, ${esc(c.organisation)}` : ''}</span></a>` : `<span>${icon('user', 'crm-i-s')}<span>No person yet</span></span>`}
            ${f.value ? `<span>${icon('dollar', 'crm-i-s')}<span>${esc(f.value)}</span></span>` : ''}${e.source ? sourceFact(e.source) : ''}
            ${f.quiet ? `<span class="is-quiet">${icon('clock', 'crm-i-s')}<span>Nothing logged for ${f.days} days</span></span>` : ''}</p>
        </div>
        ${readOnly ? '' : `<div class="crm-ehead-a"><button type="button" class="crm-btn" data-crm="edit" data-id="${attr(e.id)}" aria-expanded="${ui.edit === e.id}">${icon('edit')}<span>Edit</span></button>
          <button type="button" class="crm-btn" data-crm="archive" data-id="${attr(e.id)}">${icon('archive')}<span>${e.archived ? 'Restore' : 'Archive'}</span></button></div>`}
      </header>
      ${e.archived ? `<p class="crm-flash">${icon('archive')}<span>Archived. It stays on record and is off the board.</span></p>` : ''}
      ${flashHtml()}${detailForm}
      ${stepper}
      <div class="crm-two">
        <section class="crm-main" aria-labelledby="crm-tl-h">
          <h2 class="crm-h" id="crm-tl-h">${icon('note')}<span>Timeline</span><span class="crm-count">${acts.length}</span></h2>
          ${logForm(ui.logKind, { enquiry: e.id, contact: e.contact_id })}
          ${timelineHtml(acts)}
        </section>
        <aside class="crm-side" aria-label="Next step and project">
          <form class="crm-step-ed${miss.length ? ' is-missing' : ''}" data-crm-form="next-step" data-id="${attr(e.id)}" novalidate ${readOnly ? 'inert' : ''}>
            <h2 class="crm-h">${icon('checksq')}<span>Next step</span></h2>
            ${field('next_action', 'What', { value: e.next_action, ph: 'Send the proposal' })}
            ${field('owner', 'Who', { value: e.owner, auto: 'name' })}
            ${field('next_action_due', 'When', { value: e.next_action_due, type: 'date' })}
            ${miss.length ? `<p class="crm-note is-need">${icon('alert')}<span>Missing: ${miss.join(', ')}. Without a next step an enquiry quietly dies.</span></p>` : ''}
            ${readOnly ? '' : `<button class="crm-btn solid" type="submit">${icon('check')}<span>Save next step</span></button>`}
          </form>
          ${projectCard}
          <div class="crm-side-c">${icon('send')}<div><p class="crm-lab">Follow-up</p>${ui.draft === e.id ? '' : `<button type="button" class="crm-btn" data-crm="draft" data-id="${attr(e.id)}">${icon('note')}<span>Draft a follow-up</span></button>`}</div></div>
          ${draft}
        </aside>
      </div>`;
  }

  // ---------------------------------------------------------------------------------- a person
  function contactView(c) {
    const mine = enquiriesOf(c).sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)) || byUrgency(a, b)), acts = actsOfContact(c);
    const edit = ui.edit === c.id ? `<form class="crm-panel" data-crm-form="edit-contact" data-id="${attr(c.id)}" aria-label="Edit person" novalidate><div class="crm-grid">
        ${field('name', 'Name', { value: c.name, req: 1 })}${field('organisation', 'Organisation', { value: c.organisation })}${field('role', 'Role', { value: c.role })}${field('email', 'Email', { value: c.email, type: 'email' })}${field('phone', 'Phone', { value: c.phone, type: 'tel' })}${field('notes', 'Notes', { value: c.notes, area: 1, rows: 3, wide: 1 })}</div>
        <div class="crm-acts"><button class="crm-btn solid" type="submit">${icon('check')}<span>Save</span></button><button class="crm-btn" type="button" data-crm="cancel-edit">Cancel</button></div></form>` : '';
    return `
      <p class="crm-crumb"><a href="#/crm/contacts">${icon('back', 'crm-i-s')}<span>People</span></a></p>
      <header class="crm-ehead">
        ${avatar(c.name, 'xl')}
        <div class="crm-ehead-t"><h1>${esc(c.name)}</h1>
          <p class="crm-facts">${c.organisation ? `<span>${icon('building', 'crm-i-s')}<span>${esc(c.organisation)}${c.role ? `, ${esc(c.role)}` : ''}</span></span>` : c.role ? `<span>${esc(c.role)}</span>` : ''}
            ${c.email ? `<a href="mailto:${attr(c.email)}">${icon('email', 'crm-i-s')}<span>${esc(c.email)}</span></a>` : ''}${c.phone ? `<a href="tel:${attr(c.phone.replace(/[^\d+]/g, ''))}">${icon('call', 'crm-i-s')}<span>${esc(c.phone)}</span></a>` : ''}</p>
          ${c.notes ? `<p class="crm-notes">${esc(c.notes)}</p>` : ''}
        </div>
        ${readOnly ? '' : `<div class="crm-ehead-a"><button type="button" class="crm-btn" data-crm="edit" data-id="${attr(c.id)}" aria-expanded="${ui.edit === c.id}">${icon('edit')}<span>Edit</span></button>
          <button type="button" class="crm-btn" data-crm="archive-contact" data-id="${attr(c.id)}">${icon('archive')}<span>${c.archived ? 'Restore' : 'Archive'}</span></button></div>`}
      </header>
      ${c.archived ? `<p class="crm-flash">${icon('archive')}<span>Archived. It stays on record and is off the people list.</span></p>` : ''}
      ${flashHtml()}${edit}
      <div class="crm-two">
        <section class="crm-main" aria-labelledby="crm-tl-h">
          <h2 class="crm-h" id="crm-tl-h">${icon('note')}<span>Timeline</span><span class="crm-count">${acts.length}</span></h2>
          ${logForm(ui.logKind, { contact: c.id })}
          ${timelineHtml(acts, { showEnquiry: true })}
        </section>
        <aside class="crm-side" aria-label="Enquiries">
          <h2 class="crm-h">${icon('stage')}<span>Enquiries</span><span class="crm-count">${mine.length}</span></h2>
          ${mine.length ? `<ul class="crm-mini">${mine.map((e) => {
            const f = cardFacts(e, st.acts, now());
            return `<li><a href="#/crm/e/${encodeURIComponent(e.id)}"><span class="crm-mini-t">${esc(e.title)}</span>${stageChip(e.stage)}${f.value ? `<span class="crm-pill is-flat">${esc(f.value)}</span>` : ''}${f.overdue ? `<span class="crm-pill is-overdue">${icon('alert', 'crm-i-s')}<span>${esc(f.due)}<span class="vh"> (overdue)</span></span></span>` : ''}</a></li>`;
          }).join('')}</ul>` : emptyLine('stage', 'Enquiries from this person appear here.')}
          ${readOnly ? '' : `<button type="button" class="crm-btn" data-crm="add-enquiry-for" data-id="${attr(c.id)}">${icon('plus')}<span>New enquiry</span></button>`}
        </aside>
      </div>`;
  }

  // ---------------------------------------------------------------------------------- drawing
  async function draw({ keepScroll = true } = {}) {
    if (gone) return;
    const y = window.scrollY;
    let html;
    if (view === 'contacts') html = `${head('People', 'Everyone you work with')}${contactsView()}`;
    else if (view === 'c') {
      const c = contactById(id);
      html = c ? contactView(c) : `${head('People')}${emptyLine('alert', 'That person is not here.')}`;
    } else if (view === 'e') {
      const e = enquiryById(id);
      html = e ? enquiryView(e) : `${head('Clients')}${emptyLine('alert', 'That enquiry is not here.')}`;
    } else html = `${head('Clients', 'Who is asking, and what happens next')}${board()}`;
    el.innerHTML = `<div class="crm" data-view="${attr(view ?? 'board')}">${html}<p class="vh" role="status" aria-live="polite" id="crm-live">${esc(ui.announce)}</p></div>`;
    ui.announce = '';
    if (keepScroll) window.scrollTo(0, y);
    if (ui.focus) {
      // the first of these that is on screen (on a phone the card's column may be hidden: the stage buttons take the focus then)
      const t = [].concat(ui.focus).map((q) => el.querySelector(q)).find((x) => x && x.getClientRects().length);
      ui.focus = null; t?.focus({ preventScroll: false });
    }
  }
  const refresh = async (opts) => { await load(); await draw(opts); };
  const fail = (err) => { ui.flash = { error: true, text: String(err?.message ?? err ?? 'That did not work.') }; return draw(); };
  const ok = (text, announce = text) => { ui.flash = { text }; ui.announce = announce; };

  // ---------------------------------------------------------------------------------- doing things (each one is a person's action)
  const who = () => String(ctx.me ?? '').trim();
  const go = (hash) => { ui.carry = true; ctx.navigate(hash); };
  async function moveTo(eid, stage, { focus } = {}) {
    const e = enquiryById(eid);
    if (!e || readOnly) return;
    let m;
    try { m = moveEnquiry(e, stage, { who: who(), now: now() }); } catch (err) { return fail(err); }
    if (!m) return;
    try {
      await ctx.store.save('enquiry', m.enquiry);
      try { await ctx.store.save('crm_activity', m.activity); } catch (err) { ui.flash = { error: true, text: `Moved ${e.title}, but the history line was not saved. ${err.message}` }; await load(); return draw(); }
    } catch (err) { await load(); return fail(err); }
    ui.flash = null;
    ui.announce = `Moved ${e.title} to ${stageLabel(stage)}.`;
    if (stage === 'won' && !e.project_id) { ui.offer = { id: e.id }; ui.projectForm = null; }
    ui.focus = focus ?? [`.crm-card[data-id="${CSS.escape(e.id)}"] .crm-card-title`, '.crm-switch [aria-pressed="true"]'];
    await refresh();
  }
  async function startProject(form) {
    const e = enquiryById(form.dataset.id), d = Object.fromEntries(new FormData(form).entries());
    if (!e || readOnly) return;
    try {
      const b = newProject({ name: String(d.name ?? ''), client: String(d.client ?? '') });
      b.activity.push(projectActivity(b.project.id, who(), 'Project created', `From the enquiry “${e.title}”`));
      const pid = (await ctx.store.saveProject(b)) || b.project.id;
      await ctx.store.save('enquiry', { ...e, project_id: pid });
      try { await ctx.store.save('crm_activity', newActivity({ enquiry_id: e.id, contact_id: e.contact_id, kind: 'note', body: `Project started: ${b.project.name}.`, who: who(), now: now() })); } catch { /* the project and its link are saved; the line can be added by hand */ }
      ui.projectForm = null; ui.offer = { id: e.id, done: true, pid };
      ok(`Project “${b.project.name}” created and linked.`);
      ui.focus = '.crm-offer a, .crm-side a.crm-big';
      await refresh();
    } catch (err) { await load(); fail(err); }
  }
  async function onSubmit(ev) {
    const form = ev.target.closest('form[data-crm-form]');
    if (!form) return;
    ev.preventDefault();
    if (readOnly) return;
    const kind = form.dataset.crmForm, d = Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, String(v).trim()]));
    try {
      if (kind === 'start-project') return await startProject(form);
      if (kind === 'new-contact') {
        const c = newContact(d);
        await ctx.store.save('contact', c);
        ui.adding = null; ok(`Added ${c.name}.`); ui.focus = null;
        return view === 'contacts' ? await refresh() : go(`#/crm/c/${encodeURIComponent(c.id)}`);
      }
      if (kind === 'new-enquiry') {
        let contact_id = d.contact_id;
        if (!d.title) throw new Error('Say what the enquiry is.');
        const value = parseValue(d.value);
        if (!contact_id && d.new_person) { const c = newContact({ name: d.new_person }); await ctx.store.save('contact', c); contact_id = c.id; }
        const e = newEnquiry({ title: d.title, contact_id, value_nzd: value, source: d.source, next_action: d.next_action, next_action_due: d.next_action_due, owner: d.owner });
        await ctx.store.save('enquiry', e);
        ui.adding = null; ui.adding_contact = ''; ui.stage = 'new'; ok(`Added ${e.title}.`); ui.focus = `.crm-card[data-id="${CSS.escape(e.id)}"] .crm-card-title`;
        return view === 'c' || view === 'contacts' ? go(`#/crm/e/${encodeURIComponent(e.id)}`) : await refresh();
      }
      if (kind === 'edit-enquiry') {
        const e = enquiryById(form.dataset.id); if (!e) return;
        if (!d.title) throw new Error('Say what the enquiry is.');
        await ctx.store.save('enquiry', { ...e, title: d.title, contact_id: d.contact_id, value_nzd: parseValue(d.value), source: d.source });
        ui.edit = null; ok('Saved.'); ui.focus = '[data-crm="edit"]'; return await refresh();
      }
      if (kind === 'edit-contact') {
        const c = contactById(form.dataset.id); if (!c) return;
        if (!d.name) throw new Error('Give the person a name.');
        await ctx.store.save('contact', { ...c, name: d.name, organisation: d.organisation, role: d.role, email: d.email, phone: d.phone, notes: d.notes });
        ui.edit = null; ok('Saved.'); ui.focus = '[data-crm="edit"]'; return await refresh();
      }
      if (kind === 'next-step') {
        const e = enquiryById(form.dataset.id); if (!e) return;
        if (d.next_action_due && !/^\d{4}-\d{2}-\d{2}$/.test(d.next_action_due)) throw new Error('Give the date as day, month and year.');
        await ctx.store.save('enquiry', { ...e, next_action: d.next_action, owner: d.owner, next_action_due: d.next_action_due });
        ok('Next step saved.'); ui.focus = '.crm-step-ed button[type="submit"]'; return await refresh();
      }
      if (kind === 'log') {
        const a = newActivity({ enquiry_id: form.dataset.enquiry, contact_id: form.dataset.contact, kind: ui.logKind, body: d.body, at: fromLocalInput(d.at) || undefined, who: who(), now: now() });
        await ctx.store.save('crm_activity', a);
        ok(`${KIND_LABEL[a.kind]} added.`); ui.focus = '.crm-log textarea'; return await refresh();
      }
    } catch (err) { await fail(err); }
  }

  // the "Move to…" menu: one at a time, opened by its button, a real menu with arrow keys
  const closeMenus = (returnFocus = false) => {
    for (const m of el.querySelectorAll('.crm-menu')) {
      const btn = m.closest('.crm-card')?.querySelector('.crm-move');
      m.remove();
      if (btn) { btn.setAttribute('aria-expanded', 'false'); if (returnFocus) btn.focus(); }
    }
  };
  function openMenu(btn) {
    const cardEl = btn.closest('.crm-card'), e = enquiryById(btn.dataset.id);
    if (!cardEl || !e) return;
    const wasOpen = btn.getAttribute('aria-expanded') === 'true';
    closeMenus();
    if (wasOpen) return;
    const menu = document.createElement('div');
    menu.className = 'crm-menu'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', `Move ${e.title} to`);
    menu.innerHTML = `<p class="crm-menu-h" aria-hidden="true">Move to…</p>${STAGES.filter((s) => s.key !== e.stage).map((s) => `<button type="button" role="menuitem" tabindex="-1" data-crm="move-to" data-id="${attr(e.id)}" data-stage="${s.key}">${icon(STAGE_ICON[s.key])}<span>${esc(s.label)}</span></button>`).join('')}`;
    cardEl.append(menu);
    btn.setAttribute('aria-expanded', 'true');
    menu.querySelector('button')?.focus();
  }
  function onKey(ev) {
    const menu = ev.target.closest?.('.crm-menu');
    if (menu) {
      const items = [...menu.querySelectorAll('[role="menuitem"]')], at = items.indexOf(document.activeElement);
      const go = (i) => { ev.preventDefault(); items[(i + items.length) % items.length].focus(); };
      if (ev.key === 'ArrowDown') go(at + 1);
      else if (ev.key === 'ArrowUp') go(at - 1);
      else if (ev.key === 'Home') go(0);
      else if (ev.key === 'End') go(items.length - 1);
      else if (ev.key === 'Escape') { ev.preventDefault(); closeMenus(true); } else if (ev.key === 'Tab') closeMenus();
    } else if (ev.key === 'ArrowDown' && ev.target.matches?.('.crm-move') && ev.target.getAttribute('aria-expanded') !== 'true') { ev.preventDefault(); openMenu(ev.target); }
  }

  async function onClick(ev) {
    const t = ev.target.closest('[data-crm]');
    if (!t) { if (!ev.target.closest('.crm-menu')) closeMenus(); return; }
    const act = t.dataset.crm;
    try {
      if (act === 'menu') return openMenu(t);
      if (act === 'move-to') { closeMenus(); return await moveTo(t.dataset.id, t.dataset.stage, view === 'e' ? { focus: `.crm-stepper [data-stage="${t.dataset.stage}"]` } : {}); }
      if (act === 'stage') { ui.stage = t.dataset.stage; el.querySelector('.crm-board')?.setAttribute('data-show', ui.stage); for (const b of el.querySelectorAll('.crm-switch button')) b.setAttribute('aria-pressed', String(b.dataset.stage === ui.stage)); return; }
      if (act === 'all-steps') { ui.allSteps = !ui.allSteps; ui.focus = '[data-crm="all-steps"]'; return await draw(); }
      if (act === 'add-enquiry') { ui.adding = ui.adding === 'enquiry' ? null : 'enquiry'; ui.adding_contact = ''; ui.focus = ui.adding ? 'form[data-crm-form] input' : '[data-crm="add-enquiry"]'; return await draw(); }
      if (act === 'add-enquiry-for') { ui.adding = 'enquiry'; ui.adding_contact = t.dataset.id; ui.focus = 'form[data-crm-form] input'; ctx.navigate('#/crm'); return; }
      if (act === 'add-contact') { ui.adding = ui.adding === 'contact' ? null : 'contact'; ui.focus = ui.adding ? 'form[data-crm-form] input' : '[data-crm="add-contact"]'; return await draw(); }
      if (act === 'cancel-add') { const was = ui.adding; ui.adding = null; ui.focus = `[data-crm="add-${was}"]`; return await draw(); }
      if (act === 'dismiss-offer') { ui.offer = null; ui.projectForm = null; return await draw(); }
      if (act === 'project-form') { ui.projectForm = t.dataset.id; ui.focus = 'form[data-crm-form="start-project"] input'; return await draw(); }
      if (act === 'cancel-project-form') { ui.projectForm = null; ui.focus = '[data-crm="project-form"]'; return await draw(); }
      if (act === 'kind') { ui.logKind = t.dataset.kind; const keep = el.querySelector('.crm-log textarea')?.value ?? ''; await draw(); const ta = el.querySelector('.crm-log textarea'); if (ta) { ta.value = keep; ta.focus(); } return; }
      if (act === 'edit') { ui.edit = ui.edit === t.dataset.id ? null : t.dataset.id; ui.focus = ui.edit ? 'form[data-crm-form] input' : '[data-crm="edit"]'; return await draw(); }
      if (act === 'cancel-edit') { ui.edit = null; ui.focus = '[data-crm="edit"]'; return await draw(); }
      if (act === 'draft') { ui.draft = t.dataset.id; ui.focus = '#crm-draft-t'; return await draw(); }
      if (act === 'close-draft') { ui.draft = null; ui.focus = '[data-crm="draft"]'; return await draw(); }
      if (act === 'copy') return await copyDraft();
      if (act === 'archive' || act === 'archive-contact') {
        if (readOnly) return;
        const isC = act === 'archive-contact', rec = isC ? contactById(t.dataset.id) : enquiryById(t.dataset.id);
        if (!rec) return;
        const to = !rec.archived;
        await ctx.store.save(isC ? 'contact' : 'enquiry', { ...rec, archived: to });
        try { await ctx.store.save('crm_activity', newActivity({ enquiry_id: isC ? '' : rec.id, contact_id: isC ? rec.id : rec.contact_id, kind: 'note', body: to ? 'Archived.' : 'Restored.', who: who(), now: now() })); } catch { /* the change is saved */ }
        ok(to ? 'Archived. It stays on record.' : 'Restored.'); ui.focus = `[data-crm="${act}"]`; return await refresh();
      }
    } catch (err) { await fail(err); }
  }
  async function copyDraft() {
    const ta = el.querySelector('#crm-draft-t');
    if (!ta) return;
    let done = false;
    try { await navigator.clipboard.writeText(ta.value); done = true; } catch { /* fall back to the old way below */ }
    if (!done) { ta.focus(); ta.select(); try { done = document.execCommand('copy'); } catch { done = false; } }
    const live = el.querySelector('#crm-live');
    ui.flash = null;
    const msg = done ? 'Copied. Paste it into your email and send it yourself.' : 'Select the text and copy it yourself.';
    if (live) live.textContent = msg;
    el.querySelector('.crm-draft .crm-note span').textContent = `${msg} assembl does not send anything.`;
  }

  // drag and drop: the same move as "Move to…", with the same history line
  let dragging = null;
  el.addEventListener('dragstart', (ev) => {
    const c = ev.target.closest?.('.crm-card');
    if (!c || readOnly) return;
    closeMenus();
    dragging = c.dataset.id; c.classList.add('is-dragging');
    ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', dragging);
  });
  el.addEventListener('dragend', () => { dragging = null; for (const x of el.querySelectorAll('.is-dragging, .is-over')) x.classList.remove('is-dragging', 'is-over'); });
  el.addEventListener('dragover', (ev) => { const col = ev.target.closest?.('.crm-col'); if (!col || !dragging) return; ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; col.classList.add('is-over'); });
  el.addEventListener('dragleave', (ev) => { const col = ev.target.closest?.('.crm-col'); if (col && !col.contains(ev.relatedTarget)) col.classList.remove('is-over'); });
  el.addEventListener('drop', async (ev) => {
    const col = ev.target.closest?.('.crm-col');
    if (!col || !dragging) return;
    ev.preventDefault();
    const eid = dragging; dragging = null;
    for (const x of el.querySelectorAll('.is-dragging, .is-over')) x.classList.remove('is-dragging', 'is-over');
    await moveTo(eid, col.dataset.stage);
  });
  el.addEventListener('click', onClick);
  el.addEventListener('submit', onSubmit);
  if (hunt) { el.addEventListener('click', hunt.click); el.addEventListener('submit', hunt.submit); }
  el.addEventListener('keydown', onKey);
  document.addEventListener('click', outside);
  function outside(ev) { if (!el.isConnected) return document.removeEventListener('click', outside); if (!el.contains(ev.target)) closeMenus(); }

  try { await load(); } catch (err) { el.innerHTML = `<div class="crm"><p class="crm-flash is-error" role="alert">${icon('alert')}<span>${esc(err?.message ?? 'The clients could not be read.')}</span></p></div>`; return; }
  await draw({ keepScroll: false });
  hunt?.start();
  return () => { gone = true; hunt?.stop(); document.removeEventListener('click', outside); };
}

// ---- the "Client" section on a project page --------------------------------------------------------------------------------
async function renderProjectPanel(el, ctx) {
  await ensureCss();
  const p = ctx.project;
  let enquiries = [], contacts = [], acts = [];
  try { [contacts, enquiries, acts] = await Promise.all([ctx.store.list('contact'), ctx.store.list('enquiry'), ctx.store.list('crm_activity')]); } catch { el.innerHTML = `<div class="crm"><h2 class="crm-h">${icon('users')}<span>Client</span></h2><p class="crm-none">${icon('alert')}<span>The client could not be read just now.</span></p></div>`; return; }
  const mine = p ? enquiries.filter((e) => sameId(e.project_id, p.id)) : [];
  const body = mine.length ? mine.map((e) => {
    const c = contacts.find((x) => sameId(x.id, e.contact_id)), lines = timeline(acts.filter((a) => sameId(a.enquiry_id, e.id))).slice(0, 4);
    return `<article class="crm-pp">
      <header>${avatar(c?.name || e.title, 'lg')}<div><p class="crm-pp-n">${c ? `<a href="#/crm/c/${encodeURIComponent(c.id)}">${esc(c.name)}</a>` : esc('No person on the enquiry')}</p>
        <p class="crm-facts">${c?.organisation ? `<span>${icon('building', 'crm-i-s')}<span>${esc(c.organisation)}</span></span>` : ''}${c?.email ? `<a href="mailto:${attr(c.email)}">${icon('email', 'crm-i-s')}<span>${esc(c.email)}</span></a>` : ''}${c?.phone ? `<a href="tel:${attr(c.phone.replace(/[^\d+]/g, ''))}">${icon('call', 'crm-i-s')}<span>${esc(c.phone)}</span></a>` : ''}</p></div>
        <a class="crm-btn" href="#/crm/e/${encodeURIComponent(e.id)}">${icon('arrow')}<span>${esc(e.title)}</span></a></header>
      ${lines.length ? `<ol class="crm-tl is-compact">${lines.map((a) => `<li class="crm-tl-i" data-kind="${attr(a.kind)}"><span class="crm-tl-ic">${icon(KIND_ICON[a.kind] ?? 'note')}</span><div class="crm-tl-b"><p class="crm-tl-h"><strong>${esc(KIND_LABEL[a.kind] ?? a.kind)}</strong><span>${esc(when(a.at))}</span></p><p class="crm-tl-t">${esc(a.body)}</p></div></li>`).join('')}</ol>` : ''}
    </article>`;
  }).join('') : `<p class="crm-none">${icon('users')}<span>No client linked yet. Start a project from a won enquiry and the client shows here.</span></p><a class="crm-btn" href="#/crm">${icon('stage')}<span>Open Clients</span></a>`;
  el.innerHTML = `<div class="crm crm-panel-wrap"><h2 class="crm-h">${icon('users')}<span>Client</span></h2>${body}</div>`;
}

registerRoute('crm', { title: 'Clients', render: renderScreen });
registerNav({ id: 'crm', label: 'Clients', hash: '#/crm', order: 20, icon: NAV_ICON });
registerProjectPanel({ id: 'client', title: 'Client', order: 5, render: renderProjectPanel });
