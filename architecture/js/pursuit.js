// Pursuit studio: one enquiry, from a public tender notice to a draft response the practice can print and check. It registers a
// screen with the add-on registry (modules.js) at #/pursuit/<enquiry id>/<step>, reached from "Pursue" on an open enquiry.
//
//   notice        what is known about the notice (from the enquiry and the Found work finding), and the notice text the practice pastes
//   ideas         "How the practice could help": Claude's ideas, who decides, questions for the buyer, go or no-go, the countdown
//   draft         the response by section; the practice edits every section in place; a free template or a draft from Claude
//   requirements  the requirements this response should address, with their publishers, links and dates read
//   esg           which environmental, social and governance points the draft's own words cover, and which not yet
//   visuals       the site in 3D from LINZ's outlines with a massing block, stills, the programme and the stage wheel
//   pack          the print-ready A4 pack, saved as a PDF from the browser
//
// The studio prepares; the practice decides and approves. Nothing here is submitted, sent or published. A paid ask goes to
// /api/pursuit only when a signed-in member presses twice (the price is on the button). Everything is saved with the enquiry
// (enquiry.pursuit: extra.pursuit in the shared records, the enquiry row in this browser otherwise). See pursuit-model.js.

import { registerRoute } from './modules.js';
import { sameId, isOpen, dayName, clock, stageLabel } from './crm-model.js';
import { practiceMoney, weekLoad, weeksFrom } from './money-model.js';
import { STAGES, SAMPLE_ID } from './model.js';
import { SECTIONS, KIND_LABEL, FEES_TEXT, NOTICE_MAX } from './pursuit-schema.js';
import {
  noticeOf, countdown, readPursuit, withPursuit, applicable, forSection, requirementIds, esgCoverage, templateDraft, figuresNotGiven, givenTexts,
  programmeRows, programmeWeeks, teamRows, markerCount, today, pursuitSize, DEFAULT_MASSING,
} from './pursuit-model.js';
import { REQUIREMENTS } from './pursuit-requirements.js';
import { programmeSvg, stageWheelSvg } from './pursuit-charts.js';
import { packBlocks, paginate, packFooter, longDay } from './pursuit-pack.js';
import { addressBoxHtml, mountAddressBox } from './address.js';
import { placeLine, parseWhere } from './facts.js';
import { artHero } from './artwork.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const attr = esc;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const CSS_VERSION = '7ac66dc281'; // the first ten of pursuit.css's sha-256: tests/architecture/pursuit.test.mjs fails when it is out of step
export const API = '/api/pursuit';

// ---- the stylesheet ---------------------------------------------------------------------------------------------------
let cssReady = null;
function ensureCss() {
  if (cssReady) return cssReady;
  const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL(`../pursuit.css?v=${CSS_VERSION}`, import.meta.url).href });
  link.dataset.pursuitCss = '';
  cssReady = new Promise((resolve) => { link.addEventListener('load', resolve, { once: true }); link.addEventListener('error', resolve, { once: true }); setTimeout(resolve, 2500); });
  document.head.append(link);
  return cssReady;
}

// ---- line icons: 24 by 24, stroke 1.5, currentColor, always beside a word -------------------------------------------------
const P = {
  notice: '<path d="M6 3.5h9l4 4V20.5H6z"/><path d="M14.5 3.5V8H19M9 12h7M9 15.5h7M9 19h4"/>',
  ideas: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
  draft: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>',
  rules: '<path d="M12 3.5 20 7v5c0 4.5-3.4 7.7-8 8.5-4.6-.8-8-4-8-8.5V7z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  esg: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19 13 11"/>',
  visuals: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9"/>',
  pack: '<path d="M6 3h9l4 4v14H6zM15 3v4h4"/><path d="M9 13h7M9 16.5h5"/>',
  back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
  link: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  alert: '<path d="M12 4 3 19.5h18L12 4Z"/><path d="M12 10v4.5M12 17v.3"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>',
  ask: '<path d="M4 6.5h16v10H12l-4.5 3.5v-3.5H4z"/><path d="M9.5 10a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.4M12 15.5v.3"/>',
  flag: '<path d="M5 20V4M5 5h11l-2 3.5 2 3.5H5"/>',
  quote: '<path d="M7 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.3a3.2 3.2 0 0 1 0 5.9M18 14c1.8.7 3 2.4 3 5"/>',
  effort: '<path d="M4 20h4v-5H4zM10 20h4V10h-4zM16 20h4V4h-4z"/>',
  risk: '<path d="M12 3.5 21 19.5H3z"/><path d="M12 10v4M12 16.5v.3"/>',
  keep: '<path d="M6 3.5h12v17l-6-4-6 4z"/>',
  printer: '<path d="M7 9V3.5h10V9M7 17H4.5v-8h15v8H17"/><path d="M7 14h10v6.5H7z"/>',
  camera: '<path d="M4 7.5h3.5L9 5h6l1.5 2.5H20v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  site: '<path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="1"/><path d="M15.5 8.5v-3a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3"/>',
  service: '<path d="M5 20.5V4.5h9v16M14 9.5h5v11M3.5 20.5h17M8 8.5h3M8 12h3M8 15.5h3"/>',
  digital: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9"/>',
  engagement: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2.5 19c0-3 2.5-5 5.5-5 1.6 0 3 .6 4 1.6 1-1 2.4-1.6 4-1.6 3 0 5.5 2 5.5 5"/>',
  sustainability: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19 13 11"/>',
  cultural: '<path d="M12 21c-4-3-6.5-6.5-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 14.5 16 18 12 21z"/><path d="M12 7.5c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3"/>',
  programme: '<rect x="4" y="5" width="16" height="15" rx="1"/><path d="M4 10h16M9 3v4M15 3v4M8 14h3M13 17h3"/>',
};
const icon = (name, cls = '') => `<svg class="ps-i ${cls}" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] ?? ''}</svg>`;

export const STEPS = [
  { key: 'notice', label: 'Notice', icon: 'notice' }, { key: 'ideas', label: 'Ideas', icon: 'ideas' }, { key: 'draft', label: 'Draft', icon: 'draft' },
  { key: 'requirements', label: 'Require\u00adments', icon: 'rules' }, { key: 'esg', label: 'ESG', icon: 'esg' }, { key: 'visuals', label: 'Visuals', icon: 'visuals' }, { key: 'pack', label: 'Pack', icon: 'pack' },
];
const EFFORT_WORD = { small: 'Small effort', medium: 'Medium effort', large: 'Large effort' };
const RISK_WORD = { low: 'Low risk', medium: 'Medium risk', high: 'High risk' };
const FROM_WORD = { practice: 'typed in the studio', finding: 'from Found work', source: 'from the enquiry', 'next step': 'from the next step’s date', notice: 'found in the notice text', typed: 'typed' };

// ---- state kept between draws and visits (memory only) -----------------------------------------------------------------------
const ui = { confirm: '', busy: '', started: 0, flash: null, stills: new Map(), scene: new Map(), status: null, statusAt: 0, packFor: '' };
async function serverStatus(fetchImpl = globalThis.fetch) {
  if (ui.status && Date.now() - ui.statusAt < 5 * 60 * 1000) return ui.status;
  try { const r = await fetchImpl(API, { headers: { accept: 'application/json' } }); ui.status = r.ok ? await r.json() : { configured: false, unreachable: true }; }
  catch { ui.status = { configured: false, unreachable: true }; }
  ui.statusAt = Date.now();
  return ui.status;
}

// ---- small pieces of page -----------------------------------------------------------------------------------------------------
function ring(cd) {
  const r = 26, c = 2 * Math.PI * r, frac = cd.days == null ? 0 : cd.past ? 0 : Math.max(0.04, Math.min(1, cd.days / 30));
  return `<div class="ps-ring${cd.soon ? ' is-soon' : ''}${cd.past ? ' is-past' : ''}" role="img" aria-label="${attr(cd.text)}">
    <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><circle class="ps-ring-bg" cx="32" cy="32" r="${r}"/><circle class="ps-ring-fg" cx="32" cy="32" r="${r}" stroke-dasharray="${(frac * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 32 32)"/></svg>
    <span class="ps-ring-n">${cd.days == null ? '–' : cd.past ? '0' : cd.days}</span><span class="ps-ring-l">${cd.days == null ? 'no date' : cd.past ? 'closed' : cd.days === 1 ? 'day left' : 'days left'}</span></div>`;
}
const pill = (text, cls = '', ic = '') => `<span class="ps-pill ${cls}">${ic ? icon(ic, 'ps-i-s') : ''}<span>${esc(text)}</span></span>`;
const draftTag = '<span class="ps-draft" title="Every generated section is a draft for the practice to check">Draft</span>';
const field = (name, label, o = {}) => `<label class="ps-f${o.wide ? ' wide' : ''}"><span>${esc(label)}${o.hint ? `<em>${esc(o.hint)}</em>` : ''}</span>${o.area
  ? `<textarea name="${name}" rows="${o.rows ?? 4}"${o.ph ? ` placeholder="${attr(o.ph)}"` : ''}${o.ro ? ' readonly' : ''}${o.max ? ` maxlength="${o.max}"` : ''}>${esc(o.value ?? '')}</textarea>`
  : `<input name="${name}" type="${o.type ?? 'text'}" value="${attr(o.value ?? '')}"${o.ph ? ` placeholder="${attr(o.ph)}"` : ''}${o.ro ? ' readonly' : ''}${o.step ? ` step="${o.step}"` : ''}${o.min != null ? ` min="${o.min}"` : ''}${o.max != null ? ` max="${o.max}"` : ''}${o.inputmode ? ` inputmode="${o.inputmode}"` : ''} autocomplete="off">`}</label>`;
const ago = (iso) => (iso ? `${dayName(iso)}, ${clock(iso)}` : '');

/** the money settings and the allocations, read as money.js reads them; nothing is guessed when they cannot be read */
async function readMoney(ctx) {
  let settings = practiceMoney(null), allocations = [];
  try {
    const raw = ctx.store.shared && ctx.store.current?.practiceExtra ? await ctx.store.current.practiceExtra('money') : (await ctx.store.get('setting', 'money'))?.value ?? null;
    settings = practiceMoney(raw);
  } catch { /* no settings: the team section says so */ }
  try { allocations = await ctx.store.list('allocation'); } catch { allocations = []; }
  return { settings, allocations };
}

// ---- the screen ------------------------------------------------------------------------------------------------------------
async function renderScreen(el, ctx, rest = []) {
  await ensureCss();
  const [eid, stepRaw] = rest, step = STEPS.some((s) => s.key === stepRaw) ? stepRaw : 'notice';
  const st = { e: null, acts: [], projects: [], money: { settings: practiceMoney(null), allocations: [] }, status: ui.status };
  const readOnly = ctx.practice?.role === 'viewer';
  const now = () => new Date();
  const who = () => String(ctx.me ?? '').trim();
  let gone = false, scene = null, stopAddr = null, saveTimer = 0;
  const cleanups = [];

  async function load() {
    const [enquiries, acts, projects] = await Promise.all([ctx.store.list('enquiry'), ctx.store.list('crm_activity'), ctx.store.list('project').catch(() => [])]);
    st.e = enquiries.find((x) => sameId(x.id, eid)) ?? null;
    st.acts = st.e ? acts.filter((a) => sameId(a.enquiry_id, st.e.id)) : [];
    st.projects = projects.filter((p) => p && !p.sample && p.id !== SAMPLE_ID && p.name).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    st.money = await readMoney(ctx);
  }
  const P_ = () => readPursuit(st.e);
  const N_ = (p = P_()) => noticeOf(st.e, st.acts, p);
  const team = () => st.money.settings.team ?? [];
  const ticked = (p = P_()) => st.projects.filter((x) => p.experience.some((id) => sameId(id, x.id))).map((x) => ({ id: x.id, name: x.name, stage: stageName(x.stage) }));
  const stageName = (k) => STAGES.find((s) => s.key === k)?.label ?? '';
  const practiceName = () => ctx.practice?.name ?? '';
  const flashHtml = () => (ui.flash ? `<p class="ps-flash${ui.flash.error ? ' is-error' : ''}" role="${ui.flash.error ? 'alert' : 'status'}">${icon(ui.flash.error ? 'alert' : 'check')}<span>${esc(ui.flash.text)}</span></p>` : '');

  async function save(patch, what, { redraw = true } = {}) {
    if (readOnly) { ui.flash = { error: true, text: 'You can look at everything here and change nothing.' }; return draw(); }
    const next = withPursuit(st.e, patch, { who: who(), now: now(), what });
    if (pursuitSize(next) > 200_000) { ui.flash = { error: true, text: 'This pursuit is too big to save with the enquiry. Shorten the notice text or the longest sections.' }; return draw(); }
    try { st.e = await ctx.store.save('enquiry', next) ?? next; if (!st.e.pursuit) st.e = next; }
    catch (err) { ui.flash = { error: true, text: `Not saved: ${err?.message ?? err}` }; return draw(); }
    if (redraw) await draw();
    return st.e;
  }

  // ---------------------------------------------------------------------------------- the top of every step
  function head(p, n) {
    const cd = countdown(n.closes, now()), d = p.draft, sections = d ? SECTIONS.filter((s) => d.sections[s.key]?.body).length : 0;
    const gaps = d ? SECTIONS.reduce((a, s) => a + markerCount(d.sections[s.key]?.body ?? ''), 0) : 0;
    const list = applicable(n), cov = esgCoverage(d?.sections ?? {}), covered = Object.values(cov).reduce((a, g) => a + g.covered, 0), points = Object.values(cov).reduce((a, g) => a + g.points.length, 0);
    const status = {
      notice: p.notice.text ? `${Math.round(p.notice.text.length / 100) / 10}k characters` : 'Paste the notice',
      ideas: p.ideas ? `${plural(p.ideas.ideas.length, 'idea')}${p.keep.length ? `, ${p.keep.length} kept` : ''}` : 'Not asked yet',
      draft: d ? `${sections} of ${SECTIONS.length} · ${plural(gaps, 'gap')}` : 'Not started',
      requirements: `${list.filter((r) => r.applies === 'yes').length} apply · ${list.filter((r) => r.applies === 'maybe').length} to check`,
      esg: d ? `${covered} of ${points} covered` : 'Needs a draft',
      visuals: p.site ? 'Site chosen' : 'Choose the site',
      pack: d ? 'Ready to print' : 'Needs a draft',
    };
    return `<p class="ps-crumb"><a href="#/crm/e/${encodeURIComponent(st.e.id)}">${icon('back', 'ps-i-s')}<span>The enquiry</span></a></p>
      <header class="ps-head">
        ${ring(cd)}
        <div class="ps-head-t">
          <p class="ps-kick">Pursuit studio${n.cultural ? ' · kaupapa Māori work' : ''}</p>
          <h1>${esc(n.title)}</h1>
          <p class="ps-facts">${n.buyer ? `<span>${icon('people', 'ps-i-s')}<span>${esc(n.buyer)}</span></span>` : '<span class="ps-dim">Buyer not known yet</span>'}
            ${n.region ? `<span>${icon('site', 'ps-i-s')}<span>${esc(n.region)}</span></span>` : ''}
            <span class="${cd.soon ? 'is-soon' : ''}">${icon('clock', 'ps-i-s')}<span>${n.closes ? `${esc(cd.text)}, ${esc(dayName(n.closes))}` : 'No closing date known'}</span></span>
            ${n.url ? `<a href="${attr(n.url)}" target="_blank" rel="noopener noreferrer">${icon('link', 'ps-i-s')}<span>The notice${n.ref ? ` ${esc(n.ref)}` : ''}<span class="vh"> (opens the publisher’s page)</span></span></a>` : ''}</p>
        </div>
      </header>
      <p class="ps-rule">${icon('flag')}<span>The studio prepares. The practice decides and approves. Nothing here is submitted, sent or published.</span></p>
      <nav class="ps-steps" aria-label="Pursuit steps"><ol>${STEPS.map((s, i) => `<li><a href="#/pursuit/${encodeURIComponent(st.e.id)}/${s.key}"${s.key === step ? ' aria-current="step"' : ''}>
        <span class="ps-step-n">${i + 1}</span>${icon(s.icon)}<span class="ps-step-t"><strong>${esc(s.label)}</strong><span>${esc(status[s.key])}</span></span></a></li>`).join('')}</ol></nav>
      ${readOnly ? `<p class="ps-flash">${icon('alert')}<span>You can look at everything here and change nothing.</span></p>` : ''}${flashHtml()}`;
  }

  // ---------------------------------------------------------------------------------- asking Claude
  function askState() {
    const s = st.status ?? {};
    if (readOnly) return { can: false, why: 'Viewers can read what others asked for. Asking is for people who can change the practice’s records.' };
    if (!ctx.store.shared || !ctx.practice) return { can: false, why: 'Sign in with your practice to ask Claude. Signed out, you can still start from the template, edit every section and print the pack.' };
    if (s.unreachable) return { can: false, why: 'The studio’s server could not be reached just now. Try again in a minute.' };
    if (!s.configured) return { can: false, why: 'Not switched on here: this copy of the lab has no Anthropic key. Nothing can be sent.' };
    return { can: true, why: '' };
  }
  const priceOf = (task) => st.status?.estimate?.[task];
  function askBlock(task, label) {
    const a = askState(), est = priceOf(task), price = est?.usd != null ? `about US$${est.usd.toFixed(2)}` : '';
    if (ui.busy === task) {
      const secs = Math.round((Date.now() - ui.started) / 1000);
      return `<div class="ps-ask is-busy" role="status"><span class="ps-spin" aria-hidden="true"></span><p><strong>Claude is reading the notice.</strong> <span data-elapsed>${secs}</span> s so far. It usually takes one to three minutes. You can stay on this step.</p></div>`;
    }
    if (ui.confirm === task) {
      return `<div class="ps-ask is-confirm" role="group" aria-label="Check before it is sent">
        <p>${icon('alert')}<span>This sends the notice text, the practice’s name, its people’s names and hours, and the projects ticked as experience to Anthropic’s Claude (${esc(st.status?.model ?? 'claude-opus-5-5')}). It costs ${esc(est?.text ?? 'a small amount')}. The lab’s server keeps nothing; the answer is saved with this enquiry.</span></p>
        <div class="ps-acts"><button type="button" class="ps-btn solid" data-ps="go" data-task="${task}">${icon('check')}<span>Go ahead${price ? `, ${esc(price)}` : ''}</span></button><button type="button" class="ps-btn" data-ps="cancel-ask">Cancel</button></div></div>`;
    }
    return `<div class="ps-ask"><button type="button" class="ps-btn solid" data-ps="ask" data-task="${task}" ${a.can ? '' : 'disabled aria-describedby="ps-why"'}>${icon('ask')}<span>${esc(label)}</span>${price ? `<span class="ps-price">${esc(price)}</span>` : ''}</button>
      ${a.can ? `<p class="ps-note">Paid: ${esc(est?.text ?? '')}. You confirm before anything is sent.</p>` : `<p class="ps-note" id="ps-why">${icon('alert', 'ps-i-s')}<span>${esc(a.why)}</span></p>`}</div>`;
  }
  async function ask(task) {
    const p = P_(), n = N_(p), list = applicable(n);
    let token = null;
    try { token = await ctx.store.current?.fileToken?.(); } catch { token = null; }
    if (!token) { ui.flash = { error: true, text: 'Sign in again: the sign-in could not be read. Nothing was sent.' }; ui.confirm = ''; return draw(); }
    const body = {
      task, confirm: true, practice_id: ctx.practice.id, today: today(now()),
      notice: { title: n.title, buyer: n.buyer, region: n.region, closes: n.closes, url: n.url, ref: n.ref, text: p.notice.text || n.text, cultural: n.cultural, public: n.public, residential: n.residential },
      practice: { name: practiceName(), team: team().map((t) => ({ name: t.name, hours_week: t.capacity ?? null })), projects: ticked(p).map((x) => ({ name: x.name, stage: x.stage })), scope: p.scope.map(stageName), weeks: Object.fromEntries(Object.entries(p.weeks).map(([k, v]) => [stageName(k), v])) },
      ideas: (p.ideas?.ideas ?? []).filter((i) => p.keep.includes(i.id)).map((i) => ({ title: i.title, what: i.what })),
      requirements: requirementIds(list),
    };
    ui.confirm = ''; ui.busy = task; ui.started = Date.now(); ui.flash = null; await draw();
    const tick = setInterval(() => { const x = el.querySelector('[data-elapsed]'); if (x) x.textContent = String(Math.round((Date.now() - ui.started) / 1000)); }, 1000);
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      let j = null; try { j = await r.json(); } catch { j = null; }
      if (!r.ok || !j?.answer) throw new Error(j?.message ?? `The studio’s server answered ${r.status}. Nothing was saved.`);
      const at = now().toISOString(), cost = j.cost_usd != null ? `, about US$${j.cost_usd.toFixed(2)}` : '';
      if (task === 'ideas') {
        await save({ ideas: { ...j.answer, at, model: j.model, prompt_revision: j.prompt_revision, usage: j.usage, cost_usd: j.cost_usd }, keep: [], checks: {} }, `Asked Claude for ideas (${j.model}${cost})`, { redraw: false });
        ui.flash = { text: `${plural(j.answer.ideas.length, 'idea')} from Claude. Each is a draft for the practice to judge: keep the ones worth pursuing.` };
      } else {
        const sections = Object.fromEntries(Object.entries(j.answer.sections).map(([k, s]) => [k, { ...s, from: k === 'fees' ? 'practice' : 'model', by: who(), at, edited: false }]));
        await save({ draft: { replace: true, at, from: 'model', model: j.model, notes: j.answer.notes, sections, usage: j.usage, cost_usd: j.cost_usd } }, `Asked Claude for a draft (${j.model}${cost})`, { redraw: false });
        ui.flash = { text: 'A draft from Claude. Every section is marked Draft: check each one, fill the gaps and change what is not right.' };
      }
    } catch (err) { ui.flash = { error: true, text: String(err?.message ?? err) }; }
    finally { clearInterval(tick); ui.busy = ''; }
    if (!gone) await draw();
  }

  // ---------------------------------------------------------------------------------- 1. the notice
  function noticeStep(p, n) {
    const flag = (name, label, v, from, hint) => `<label class="ps-chk"><input type="checkbox" name="${name}" ${v ? 'checked' : ''}><span>${esc(label)}${from && from !== 'practice' ? `<em>${esc(FROM_WORD[from] ?? from)}${hint ? `: ${esc(hint)}` : ''}</em>` : ''}</span></label>`;
    return `<div class="ps-two">
      <form class="ps-card" data-ps-form="notice" novalidate>
        <h2 class="ps-h">${icon('notice')}<span>The notice</span></h2>
        <p class="ps-note">What the enquiry and Found work already know. Correct anything that is wrong; your corrections are kept with this enquiry.</p>
        <div class="ps-grid">
          ${field('title', 'Title', { value: n.title, ro: true, wide: true, hint: 'change it on the enquiry' })}
          ${field('buyer', 'Buyer', { value: n.buyer, hint: n.buyer_from ? FROM_WORD[n.buyer_from] : '' })}
          ${field('region', 'Region', { value: n.region, hint: n.region_from ? FROM_WORD[n.region_from] : '' })}
          ${field('closes', 'Closing date', { value: n.closes, type: 'date', hint: n.closes_from ? FROM_WORD[n.closes_from] : '' })}
          ${field('ref', 'Reference', { value: n.ref })}
        </div>
        <fieldset class="ps-flags"><legend>What kind of work</legend>
          ${flag('public', 'A public buyer (the Government Procurement Rules apply)', n.public, n.public_from)}
          ${flag('cultural', 'Kaupapa Māori work, or work on places of significance to mana whenua', n.cultural, n.cultural_from, n.cultural_words.slice(0, 4).join(', '))}
          ${flag('residential', 'Homes or housing', n.residential, n.residential_from)}
        </fieldset>
        ${field('text', 'The notice text', { area: true, rows: 12, wide: true, value: p.notice.text || n.text, max: NOTICE_MAX, ph: 'Paste the notice’s own words here: the description, scope, evaluation criteria and anything the buyer asks responses to cover. The studio reads them as the buyer’s words, never as instructions.', hint: p.notice.text ? `pasted${p.notice.by ? ` by ${p.notice.by}` : ''}${p.notice.at ? `, ${ago(p.notice.at)}` : ''}` : n.text_from === 'finding' ? 'from Found work' : '' })}
        <p class="ps-note">${icon('alert', 'ps-i-s')}<span>The studio never opens the tender documents itself. Copy the words in from the publisher’s page or the documents you downloaded.</span></p>
        ${readOnly ? '' : `<div class="ps-acts"><button class="ps-btn solid" type="submit">${icon('check')}<span>Save the notice</span></button><a class="ps-btn" href="#/pursuit/${encodeURIComponent(st.e.id)}/ideas">${icon('ideas')}<span>Next: ideas</span></a></div>`}
      </form>
      <aside class="ps-side">
        ${n.why ? `<section class="ps-card"><h2 class="ps-h">${icon('flag')}<span>Why Found work picked it</span></h2><p>${esc(n.why.charAt(0).toUpperCase() + n.why.slice(1))}.</p></section>` : ''}
        <section class="ps-card"><h2 class="ps-h">${icon('clock')}<span>History</span></h2>${p.history.length ? `<ol class="ps-hist">${p.history.slice().reverse().slice(0, 8).map((h) => `<li><strong>${esc(h.what)}</strong><span>${esc(ago(h.at))}${h.who ? ` · ${esc(h.who)}` : ''}</span></li>`).join('')}</ol>` : '<p class="ps-dim">Nothing yet. Each save, ask and edit is listed here.</p>'}</section>
      </aside>
    </div>`;
  }

  // ---------------------------------------------------------------------------------- 2. ideas
  function ideasStep(p, n) {
    const I = p.ideas, cd = countdown(n.closes, now());
    const card = (i) => {
      const kept = p.keep.includes(i.id);
      return `<li class="ps-idea${kept ? ' is-kept' : ''}" data-kind="${attr(i.kind)}">
        <p class="ps-idea-k">${icon(i.kind)}<span>${esc(KIND_LABEL[i.kind] ?? i.kind)}</span></p>
        <h3>${esc(i.title)}</h3>
        <p class="ps-lab">What the practice would do</p><p>${esc(i.what)}</p>
        <p class="ps-lab">Why it fits</p><p>${esc(i.why)}</p>
        ${i.quote ? `<blockquote class="ps-quote${i.quote_found ? '' : ' is-unfound'}">${icon('quote', 'ps-i-s')}<span>“${esc(i.quote)}”</span><em>${i.quote_found ? `${icon('check', 'ps-i-s')}The notice’s own words` : `${icon('alert', 'ps-i-s')}Not found in the notice text: check it before using it`}</em></blockquote>` : ''}
        <p class="ps-lab">What it needs from the practice</p><p>${esc(i.needs)}</p>
        <div class="ps-idea-f">${pill(EFFORT_WORD[i.effort], `is-${i.effort}`, 'effort')}${pill(RISK_WORD[i.risk], `is-risk-${i.risk}`, 'risk')}${i.risk_note ? `<span class="ps-dim ps-risknote">${esc(i.risk_note)}</span>` : ''}</div>
        ${readOnly ? '' : `<button type="button" class="ps-btn${kept ? ' solid' : ''}" data-ps="keep" data-id="${attr(i.id)}" aria-pressed="${kept}">${icon(kept ? 'check' : 'keep')}<span>${kept ? 'Kept for the draft' : 'Keep for the draft'}</span></button>`}
      </li>`;
    };
    const left = I ? `<section class="ps-card ps-sum"><p class="ps-lab">What the buyer is asking for</p><p class="ps-lead">${esc(I.summary)}</p>
        <p class="ps-by">${draftTag}<span>${I.sample ? 'A made-up sample, for the look of the studio' : `Written by Claude (${esc(I.model)})`}, ${esc(ago(I.at))}${I.usage ? ` · ${I.usage.input_tokens.toLocaleString('en-NZ')} tokens in, ${I.usage.output_tokens.toLocaleString('en-NZ')} out${I.cost_usd != null ? `, about US$${I.cost_usd.toFixed(2)}` : ''}` : ''}</span></p></section>
      <ul class="ps-ideas">${I.ideas.map(card).join('')}</ul>
      ${I.gaps ? `<section class="ps-card"><h2 class="ps-h">${icon('alert')}<span>What the notice does not say</span></h2><p>${esc(I.gaps)}</p></section>` : ''}`
      : `<div class="ps-empty"><div class="ps-ghosts" aria-hidden="true">${'<span class="ps-ghost"><i></i><b></b><b></b><b class="w60"></b></span>'.repeat(3)}</div>
        <p>Claude reads the notice and suggests four to six concrete ways the practice could help: design services, engagement, sustainability, digital and agentic work such as a walkable 3D site model, and a programme with hold points. Each one quotes the notice, says what it needs from the practice, and gives its effort and risk.</p>
        ${p.notice.text ? '' : `<p class="ps-note">${icon('alert', 'ps-i-s')}<span>Paste the notice text first for ideas that answer its own words. <a href="#/pursuit/${encodeURIComponent(st.e.id)}/notice">Paste it</a>.</span></p>`}</div>`;
    const side = `<aside class="ps-side">
      <section class="ps-card ps-count${cd.soon ? ' is-soon' : ''}">${ring(cd)}<div><p class="ps-lab">Closing</p><p class="ps-big">${esc(n.closes ? longDay(n.closes) : 'Not known')}</p><p class="ps-dim">${esc(cd.text)}${n.closes_from ? `, ${esc(FROM_WORD[n.closes_from])}` : ''}</p></div></section>
      ${I ? `<section class="ps-card"><h2 class="ps-h">${icon('people')}<span>Who decides</span></h2><ul class="ps-list">${I.deciders.map((d) => `<li><strong>${esc(d.who)}</strong><span>${esc(d.part)}</span></li>`).join('')}</ul></section>
      <section class="ps-card"><h2 class="ps-h">${icon('ask')}<span>Questions to ask the buyer</span></h2><ol class="ps-qs">${I.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>
        <button type="button" class="ps-btn" data-ps="copy-qs">${icon('copy')}<span>Copy the questions</span></button><p class="ps-note">Send them yourself, through the buyer’s question channel. assembl sends nothing.</p></section>
      <section class="ps-card"><h2 class="ps-h">${icon('check')}<span>Go or no-go</span><span class="ps-count-n">${Object.keys(p.checks).length} of ${I.go_no_go.length}</span></h2>
        <ul class="ps-gng">${I.go_no_go.map((g) => `<li><label class="ps-chk"><input type="checkbox" data-ps-check="${attr(g.id)}" ${p.checks[g.id] ? 'checked' : ''} ${readOnly ? 'disabled' : ''}><span>${esc(g.check)}<em>${esc(g.why)}</em></span></label></li>`).join('')}</ul>
        <p class="ps-note">The practice ticks each one. The decision is the practice’s.</p></section>` : ''}
    </aside>`;
    return `<div class="ps-bar">${askBlock('ideas', I ? 'Ask again for ideas' : 'Ask Claude for ideas')}</div><div class="ps-two">${`<div class="ps-main">${left}</div>`}${side}</div>`;
  }

  // ---------------------------------------------------------------------------------- 3. the draft
  function draftStep(p, n) {
    const d = p.draft, list = applicable(n), given = givenTexts({ notice: n, team: team(), projects: ticked(p), pursuit: p });
    const byReq = new Map(REQUIREMENTS.items.map((r) => [r.id, r]));
    const rows = programmeRows(p), load = weekLoad(st.money.allocations, weeksFrom(today(now()), 12)), tr = teamRows(team(), load);
    const extra = (k) => {
      if (k === 'experience') return `<fieldset class="ps-pick"><legend>The practice’s own projects to name${st.projects.length ? '' : ': none yet'}</legend>${st.projects.length ? st.projects.map((x) => `<label class="ps-chk"><input type="checkbox" data-ps-exp="${attr(x.id)}" ${p.experience.some((id) => sameId(id, x.id)) ? 'checked' : ''} ${readOnly ? 'disabled' : ''}><span>${esc(x.name)}<em>${esc(stageName(x.stage) || 'stage not set')}</em></span></label>`).join('') : '<p class="ps-dim">Projects the practice keeps here can be ticked as experience. Nothing is named that is not ticked.</p>'}</fieldset>`;
      if (k === 'team') return tr.length ? `<table class="ps-table"><caption>From the practice’s Money settings</caption><thead><tr><th scope="col">Person</th><th scope="col">Hours a week</th><th scope="col">Planned, next 12 weeks</th><th scope="col">Free</th></tr></thead><tbody>${tr.map((t) => `<tr><th scope="row">${esc(t.name)}</th><td>${t.capacity ?? '<span class="ps-dim">not typed</span>'}</td><td>${t.planned ?? '–'}</td><td>${t.free ?? '–'}</td></tr>`).join('')}</tbody></table>` : `<p class="ps-note">${icon('alert', 'ps-i-s')}<span>No people in the Money settings yet. <a href="#/settings">Add them in Settings</a>, with their hours a week.</span></p>`;
      if (k === 'programme') return `<form class="ps-prog" data-ps-form="programme" novalidate><fieldset><legend>Stages in scope, and the weeks the practice plans for each</legend>
          <div class="ps-prog-rows">${STAGES.map((s, i) => `<div class="ps-prog-r"><label class="ps-chk"><input type="checkbox" name="scope" value="${s.key}" ${p.scope.includes(s.key) ? 'checked' : ''} ${readOnly ? 'disabled' : ''}><span>${i + 1}. ${esc(s.label)}</span></label><label class="ps-wk"><span class="vh">Weeks for ${esc(s.label)}</span><input type="number" name="w-${s.key}" min="0.5" max="260" step="0.5" inputmode="decimal" value="${p.weeks[s.key] ?? ''}" placeholder="weeks" ${readOnly ? 'disabled' : ''}></label></div>`).join('')}</div>
          ${field('start', 'Start, if known', { type: 'date', value: p.start })}</fieldset>
          ${readOnly ? '' : `<button class="ps-btn" type="submit">${icon('check')}<span>Save the programme</span></button>`}</form>
        <div class="ps-charts"><figure class="ps-fig">${programmeSvg(rows)}<figcaption>${rows.length ? `${programmeWeeks(rows)} weeks typed${p.start ? `, from ${esc(longDay(p.start))}` : ''}. Each diamond is a hold point: the buyer signs off before the next stage.` : 'Tick the stages in scope above.'}</figcaption></figure><figure class="ps-fig ps-wheelfig">${stageWheelSvg(p.scope)}</figure></div>`;
      return '';
    };
    const sec = (s, i) => {
      const x = d?.sections?.[s.key], body = x?.body ?? '', gaps = markerCount(body), figs = s.key === 'fees' ? [] : figuresNotGiven(body, given);
      const reqs = [...new Set([...(x?.cites ?? []), ...forSection(s.key, list).map((r) => r.id)])].map((id) => byReq.get(id)).filter(Boolean);
      const from = !x ? '' : x.edited ? `Edited${x.by ? ` by ${x.by}` : ''}${x.at ? `, ${ago(x.at)}` : ''}` : x.from === 'model' ? `Written by Claude${d.model ? ` (${d.model})` : ''}` : x.from === 'template' ? 'From the template' : 'The practice’s own';
      return `<section class="ps-sec" id="sec-${s.key}" aria-labelledby="sec-${s.key}-h">
        <header class="ps-sec-h"><span class="ps-sec-n">${i + 1}</span><h2 id="sec-${s.key}-h">${esc(s.title)}</h2>${x && s.key !== 'fees' ? draftTag : ''}<span class="ps-dim ps-from" data-from="${s.key}">${esc(from)}</span></header>
        ${reqs.length ? `<p class="ps-chips">${reqs.map((r) => `<a class="ps-chip${(x?.cites ?? []).includes(r.id) ? ' is-cited' : ''}" href="${attr(r.url)}" target="_blank" rel="noopener noreferrer" title="${attr(`${r.publisher}, read ${longDay(r.read_on)}`)}">${icon('rules', 'ps-i-s')}<span>${esc(r.title)}</span></a>`).join('')}</p>` : ''}
        ${extra(s.key)}
        ${s.key === 'fees' ? `<p class="ps-fees">${icon('alert')}<span>${esc(FEES_TEXT)} Write the fee proposal yourself, in the pack or in the buyer’s own form.</span></p>`
          : d ? `<label class="ps-f wide"><span class="vh">${esc(s.title)}: the text</span><textarea data-ps-sec="${s.key}" rows="${Math.min(24, Math.max(4, body.split(/\n/).reduce((a, l) => a + Math.max(1, Math.ceil(l.length / 105)), 0) + 1))}" ${readOnly ? 'readonly' : ''}>${esc(body)}</textarea></label>
          <p class="ps-sec-f" data-sec-f="${s.key}">${gaps ? pill(`${plural(gaps, 'gap')} to fill`, 'is-need', 'alert') : x ? pill('No gaps marked', 'is-flat', 'check') : ''}${figs.length ? pill(`Check ${figs.length === 1 ? 'this figure' : 'these figures'}: ${figs.slice(0, 5).join(', ')}`, 'is-need', 'alert') : ''}${(x?.needs ?? []).length ? `<span class="ps-dim">To add: ${esc(x.needs.join('; '))}</span>` : ''}</p>` : ''}
      </section>`;
    };
    return `<div class="ps-bar">
        ${readOnly ? '' : `<div class="ps-ask"><button type="button" class="ps-btn" data-ps="template">${icon('draft')}<span>${d ? 'Start again from the template' : 'Start from the template'}</span><span class="ps-price">free</span></button><p class="ps-note">No model, no cost: the practice’s own facts, with a marked gap wherever something is missing.</p></div>`}
        ${askBlock('draft', d?.from === 'model' ? 'Ask Claude for a new draft' : 'Draft with Claude')}
      </div>
      ${d ? `<p class="ps-status">${draftTag}<span>${d.sample ? 'A made-up sample draft, for the look of the studio' : d.from === 'model' ? `Drafted by Claude (${esc(d.model)})` : 'Started from the template'}, ${esc(ago(d.at))}. Edit any section in place: it is saved when you leave the box.${d.notes ? ` ${esc(d.notes)}` : ''}</span></p>` : `<div class="ps-empty"><p>The response, section by section, in the order an NZ architectural services tender usually asks for it: understanding, approach, programme by the NZIA stages, team, experience, economic benefit, sustainability, Te Tiriti and mana whenua, health and safety in design, accessibility, risk, quality and fees.</p><p class="ps-note">Experience names only the projects the practice ticks. People come from the Money settings. Fees are always the practice’s own.</p></div>`}
      <div class="ps-draft-grid"><nav class="ps-toc" aria-label="Sections"><ol>${SECTIONS.map((s, i) => { const b = d?.sections?.[s.key]?.body ?? ''; return `<li><a href="#/pursuit/${encodeURIComponent(st.e.id)}/draft" data-ps="jump" data-sec="${s.key}"><span>${i + 1}</span>${esc(s.title)}${b && markerCount(b) ? `<em>${markerCount(b)}</em>` : ''}</a></li>`; }).join('')}</ol></nav>
      <div class="ps-secs">${SECTIONS.map(sec).join('')}</div></div>`;
  }

  // ---------------------------------------------------------------------------------- 4. requirements
  function reqStep(p, n) {
    const list = applicable(n), cited = new Set(Object.values(p.draft?.sections ?? {}).flatMap((s) => s.cites ?? []));
    const row = (r) => `<li class="ps-req is-${r.applies}">
      <div class="ps-req-h"><span class="ps-mark" aria-hidden="true"></span><h3><a href="${attr(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)}<span class="vh"> (opens ${esc(r.publisher)})</span></a></h3>
        ${pill(r.status === 'voluntary' ? 'Voluntary' : r.status === 'replaced' ? 'Replaced by Rule 8' : 'Current', r.status === 'current' ? 'is-flat' : '')}</div>
      <p class="ps-req-p">${esc(r.publisher)} · read ${esc(longDay(r.read_on))} · ${esc(r.kind)}</p>
      <p>${esc(r.summary)}</p>
      ${r.evidence?.quote ? `<blockquote class="ps-quote">${icon('quote', 'ps-i-s')}<span>“${esc(r.evidence.quote)}”</span><em>The publisher’s words</em></blockquote>` : ''}
      ${r.note ? `<p class="ps-dim">${esc(r.note)}</p>` : ''}
      <p class="ps-req-f"><span>${icon('draft', 'ps-i-s')}Informs ${esc(r.informs.map((k) => SECTIONS.find((s) => s.key === k)?.title).join(', '))}</span><span>${esc(r.why)}</span>${cited.has(r.id) ? pill('Cited in the draft', 'is-go', 'check') : p.draft ? pill('Not cited yet', 'is-flat') : ''}</p>
      ${(r.also ?? []).length ? `<p class="ps-also">${r.also.map((a) => `<a href="${attr(a.url)}" target="_blank" rel="noopener noreferrer">${icon('link', 'ps-i-s')}<span>${esc(a.label)}</span></a>`).join('')}</p>` : ''}
    </li>`;
    const group = (k, title, sub) => { const g = list.filter((r) => r.applies === k); return g.length ? `<section class="ps-reqs"><h2 class="ps-h">${esc(title)}<span class="ps-count-n">${g.length}</span></h2><p class="ps-note">${esc(sub)}</p><ul>${g.map(row).join('')}</ul></section>` : ''; };
    return `<p class="ps-status">${icon('rules')}<span>Requirements this response should address, read from each publisher on ${esc(longDay(REQUIREMENTS.read_on))} (data version ${esc(REQUIREMENTS.version)}). The summaries are assembl’s own words; the publisher’s words are in quotation marks. Nothing here says the response or a design meets any rule.</span></p>
      ${group('yes', 'Address these', 'They apply to this notice as it is described.')}
      ${group('maybe', 'Check whether these apply', 'They depend on the buyer or the kind of work: the notice or the buyer will say.')}
      ${group('no', 'Not for this notice', 'Kept here so nothing is hidden.')}
      <section class="ps-reqs"><h2 class="ps-h">Left out, and why</h2><ul>${REQUIREMENTS.left_out.map((x) => `<li class="ps-req is-out"><div class="ps-req-h"><span class="ps-mark" aria-hidden="true"></span><h3>${esc(x.title)}</h3></div><p>${esc(x.why)}</p><p class="ps-also">${x.urls.map((u) => `<a href="${attr(u)}" target="_blank" rel="noopener noreferrer">${icon('link', 'ps-i-s')}<span>${esc(new URL(u).hostname.replace(/^www\./, ''))}</span></a>`).join('')}</p></li>`).join('')}</ul></section>`;
  }

  // ---------------------------------------------------------------------------------- 5. ESG
  function esgStep(p) {
    const cov = esgCoverage(p.draft?.sections ?? {});
    const word = { covered: 'Covered', named: 'Named, still to fill', 'not yet': 'Not in the draft yet' };
    return `<p class="ps-status">${icon('esg')}<span>Which points the draft’s own words cover, and which they do not yet. Coverage only, read from the draft as it stands: not a score, a rating or a check of the design. Quotations of the notice do not count.</span></p>
      ${p.draft ? '' : `<p class="ps-note">${icon('alert', 'ps-i-s')}<span>There is no draft yet, so nothing is covered. <a href="#/pursuit/${encodeURIComponent(st.e.id)}/draft">Start the draft</a>.</span></p>`}
      <div class="ps-esg">${Object.entries(cov).map(([k, g]) => `<section class="ps-card ps-esg-g"><h2 class="ps-h"><span class="ps-esg-l">${k}</span><span>${esc(g.label)}</span><span class="ps-count-n">${g.covered} of ${g.points.length}</span></h2>
        <div class="ps-meter" aria-hidden="true">${g.points.map((x) => `<i class="is-${x.state.replace(' ', '-')}"></i>`).join('')}</div>
        <ul>${g.points.map((x) => `<li class="is-${x.state.replace(' ', '-')}"><span class="ps-dot" aria-hidden="true"></span><span class="ps-esg-t"><strong>${esc(x.label)}</strong><em>${esc(word[x.state])}${x.sections.length ? ` · ${esc(x.sections.map((s) => SECTIONS.find((y) => y.key === s)?.title).join(', '))}` : ''}</em></span>${x.sections.length ? `<a class="ps-link" href="#/pursuit/${encodeURIComponent(st.e.id)}/draft" data-ps="jump" data-sec="${attr(x.sections[0])}">Open</a>` : ''}</li>`).join('')}</ul></section>`).join('')}</div>`;
  }

  // ---------------------------------------------------------------------------------- 6. visuals
  function visualsStep(p) {
    const m = p.massing, rows = programmeRows(p);
    const num = (name, label, v, o) => `<label class="ps-num"><span>${esc(label)}</span><span class="ps-num-in"><input type="number" name="${name}" value="${v}" step="${o.step ?? 0.5}" min="${o.min}" max="${o.max}" inputmode="decimal" ${readOnly ? 'disabled' : ''}><em>${esc(o.unit ?? 'm')}</em></span></label>`;
    const site = p.site ? `<div class="ps-site-on">${icon('site')}<div><p class="ps-big">${esc(p.site.place || 'Site chosen')}</p><p class="ps-dim">${p.site.address ? 'Street address kept with the enquiry; the pack prints only the suburb and town unless you choose otherwise.' : `Point ${p.site.lat.toFixed(5)}, ${p.site.lon.toFixed(5)}`}</p></div>${readOnly ? '' : '<button type="button" class="ps-btn" data-ps="change-site">Change the site</button>'}</div>`
      : `<div class="ps-site-pick">${addressBoxHtml()}<form class="ps-where" data-ps-form="point" novalidate>${field('where', 'Or a point', { ph: '-36.850, 174.760', hint: 'latitude, longitude' })}<button class="ps-btn" type="submit">Use the point</button></form>${linkedSite() ? `<button type="button" class="ps-btn" data-ps="linked-site">${icon('site')}<span>Use the linked project’s site</span></button>` : ''}</div>`;
    return `<div class="ps-vis">
      <section class="ps-card ps-scene-card"><h2 class="ps-h">${icon('visuals')}<span>Site and massing study</span></h2>
        ${site}
        <div class="ps-stage" data-ps-stage>${p.site ? '<p class="ps-dim ps-stage-msg">Drawing the site…</p>' : `<div class="ps-stage-empty">${icon('site')}<p>Choose the site: the neighbouring buildings and the parcel come from LINZ, and a massing block sits on the site for the practice to size and move.</p></div>`}
          <p class="ps-stage-label" aria-hidden="true">Massing study, not a design</p></div>
        <p class="ps-credit" data-ps-credit>${esc('Building outlines and the parcel boundary: LINZ Data Service, licensed for reuse under CC BY 4.0.')} Neighbour heights are assumed at ${m.around} m: the outlines carry no heights.</p>
      </section>
      <aside class="ps-side">
        <form class="ps-card ps-mass" data-ps-form="massing" novalidate><h2 class="ps-h">${icon('digital')}<span>The massing block</span></h2>
          <p class="ps-note">A volume to test the site with, sized by the practice. Massing study, not a design.</p>
          <div class="ps-nums">${num('w', 'Width', m.w, { min: 1, max: 300 })}${num('d', 'Depth', m.d, { min: 1, max: 300 })}${num('h', 'Height', m.h, { min: 1, max: 120 })}${num('x', 'East (+) or west', m.x, { min: -300, max: 300 })}${num('z', 'North (+) or south', m.z, { min: -300, max: 300 })}${num('turn', 'Turn', m.turn, { min: -180, max: 180, step: 5, unit: '°' })}${num('around', 'Neighbours, assumed', m.around, { min: 2, max: 60 })}</div>
          <div class="ps-views" role="group" aria-label="View"><button type="button" class="ps-btn" data-ps="view" data-view="angle">Angle</button><button type="button" class="ps-btn" data-ps="view" data-view="top">From above</button><button type="button" class="ps-btn" data-ps="view" data-view="street">Street</button><button type="button" class="ps-btn ps-sq" data-ps="zoom" data-f="0.85" aria-label="Closer">${icon('plus')}</button><button type="button" class="ps-btn ps-sq" data-ps="zoom" data-f="1.18" aria-label="Further">${icon('minus')}</button></div>
          <button type="button" class="ps-btn solid" data-ps="still" ${p.site ? '' : 'disabled'}>${icon('camera')}<span>Save a still (PNG)</span></button>
          <ul class="ps-stills">${(ui.stills.get(st.e.id) ?? []).map((s, i) => `<li><img src="${attr(s.url)}" alt="Still ${i + 1} of the massing study" width="160" height="100"><a class="ps-link" href="${attr(s.url)}" download="massing-study-${i + 1}.png">Download still ${i + 1}</a></li>`).join('')}</ul>
          <p class="ps-dim">Stills stay in this browser tab; the newest goes in the pack. The sizes and position are saved with the enquiry.</p>
        </form>
      </aside>
      <section class="ps-card ps-wide"><h2 class="ps-h">${icon('programme')}<span>Programme and stages</span></h2>
        <div class="ps-charts"><figure class="ps-fig">${programmeSvg(rows)}<figcaption>${rows.length ? `${programmeWeeks(rows)} weeks typed by the practice.` : 'No stages in scope yet.'} <a href="#/pursuit/${encodeURIComponent(st.e.id)}/draft" data-ps="jump" data-sec="programme">Change them in the draft</a>.</figcaption></figure><figure class="ps-fig ps-wheelfig">${stageWheelSvg(p.scope)}</figure></div>
      </section>
    </div>`;
  }
  const linkedSite = () => { const pr = st.projects.find((x) => sameId(x.id, st.e?.project_id)); return pr?.site?.lat != null ? pr.site : null; };
  async function sceneDataFor(site) {
    const key = `${site.lat.toFixed(5)},${site.lon.toFixed(5)}`;
    if (ui.scene.has(key)) return ui.scene.get(key);
    const { fetchSceneData } = await import('./pursuit-scene.js');
    const d = await fetchSceneData(site);
    ui.scene.set(key, d);
    return d;
  }
  async function mountStage(p) {
    const host = el.querySelector('[data-ps-stage]');
    if (!host || !p.site) return;
    const msg = host.querySelector('.ps-stage-msg');
    try {
      const S = await import('./pursuit-scene.js');
      if (!S.webglOk()) { if (msg) msg.textContent = 'This browser cannot draw 3D, so the site scene is left out. The rest of the studio works.'; return; }
      const data = await sceneDataFor(p.site);
      if (gone) return;
      msg?.remove();
      scene = await S.mountScene(host, { data, massing: p.massing, look: document.documentElement.dataset.theme === 'sketch' ? 'sketch' : 'assembl' });
      const cr = el.querySelector('[data-ps-credit]');
      if (cr) cr.textContent = `${S.CREDIT} ${plural(data.count, 'outline')} within ${S.RADIUS} m${data.asOf ? `, layer updated ${data.asOf}` : ''}. Neighbour heights are assumed at ${p.massing.around} m: the outlines carry no heights.${data.problems.length ? ` ${data.problems.join(' ')}` : ''}`;
    } catch (err) { if (msg) msg.textContent = String(err?.message ?? 'The site could not be drawn.'); }
  }

  // ---------------------------------------------------------------------------------- 7. the pack
  function packStep(p) {
    return `<div class="ps-pack">
      <div class="ps-bar ps-packbar">
        <button type="button" class="ps-btn solid" data-ps="print">${icon('printer')}<span>Print or save as PDF</span></button>
        ${p.site?.address ? `<label class="ps-chk"><input type="checkbox" data-ps="print-address" ${p.print_address ? 'checked' : ''} ${readOnly ? 'disabled' : ''}><span>Print the street address<em>Off: the pack shows only the suburb and town</em></span></label>` : ''}
        <p class="ps-note">A4 portrait. In the print window choose “Save as PDF”. The footer on every page says it is a draft that has not been submitted.</p>
      </div>
      <div class="ps-sheets-wrap"><p class="ps-dim" data-ps-packmsg>Laying out the pages…</p><div class="ps-sheets" data-ps-sheets></div></div>
    </div>`;
  }
  async function buildPack(p, n) {
    const out = el.querySelector('[data-ps-sheets]'), msg = el.querySelector('[data-ps-packmsg]');
    if (!out) return;
    let still = (ui.stills.get(st.e.id) ?? []).at(-1)?.url ?? null, stillNote = '';
    if (p.site) {
      try {
        const data = await sceneDataFor(p.site);
        if (!still) { const S = await import('./pursuit-scene.js'); still = await S.renderStill({ data, massing: p.massing, look: 'assembl', width: 1600, height: 1000 }); }
        stillNote = `${CREDIT_TEXT} ${plural(data.count, 'outline')} within 110 m. Neighbour heights assumed at ${p.massing.around} m. Block ${p.massing.w} by ${p.massing.d} m, ${p.massing.h} m high, sized by the practice.`;
      } catch (err) { stillNote = String(err?.message ?? ''); }
    }
    if (gone) return;
    const place = p.site ? (p.print_address && p.site.address ? p.site.address : p.site.place) : '';
    const blocks = packBlocks({
      notice: n, pursuit: p, practiceName: practiceName(), place, list: applicable(n), team: teamRows(team(), weekLoad(st.money.allocations, weeksFrom(today(now()), 12))), projects: ticked(p),
      visuals: { still, stillNote, programme: programmeSvg(programmeRows(p)), wheel: stageWheelSvg(p.scope) }, now: now(),
    });
    // measure every block at the page's own width, then pack them into pages
    const meter = document.createElement('div');
    meter.className = 'ps-sheet ps-measure'; meter.setAttribute('aria-hidden', 'true');
    meter.innerHTML = `<div class="pk-body">${blocks.map((b) => `<div class="pk-b pk-k-${b.kind}">${b.html}</div>`).join('')}</div>`;
    (el.querySelector('.ps') ?? el).append(meter); // inside the studio, so the same rules lay it out
    await Promise.all([...meter.querySelectorAll('img')].map((i) => i.decode?.().catch(() => {})));
    try { await document.fonts?.ready; } catch { /* fine */ }
    const heights = [...meter.querySelectorAll('.pk-b')].map((b) => b.getBoundingClientRect().height);
    const pageH = (254 * 96) / 25.4; // the body of a sheet: 254 mm (pursuit.css .pk-body)
    meter.remove();
    const pages = paginate(blocks, heights, pageH), foot = packFooter(practiceName());
    const art = artHero();
    out.innerHTML = pages.map((ids, i) => `<section class="ps-sheet${ids.some((k) => blocks[k].kind === 'cover') ? ` is-cover${art ? ' has-art' : ''}` : ''}" aria-label="Page ${i + 1} of ${pages.length}">
        ${i === 0 && art ? `<div class="pk-art">${art}</div>` : ''}
        <div class="pk-body">${ids.map((k) => `<div class="pk-b pk-k-${blocks[k].kind}">${blocks[k].html}</div>`).join('')}</div>
        <footer class="pk-foot"><span>${esc(foot)}</span><span>Page ${i + 1} of ${pages.length}</span></footer></section>`).join('');
    if (msg) msg.textContent = `${plural(pages.length, 'page')}, laid out for A4.`;
    fitSheets();
  }
  function fitSheets() {
    const wrap = el.querySelector('.ps-sheets-wrap'), sheets = el.querySelector('[data-ps-sheets]');
    if (!wrap || !sheets) return;
    const k = Math.min(1, (wrap.clientWidth - 2) / (210 * 96 / 25.4));
    sheets.style.zoom = String(Math.round(k * 1000) / 1000);
  }

  // ---------------------------------------------------------------------------------- drawing
  async function draw() {
    if (gone) return;
    scene?.stop(); scene = null; stopAddr?.(); stopAddr = null;
    if (!st.e) { el.innerHTML = `<div class="ps"><p class="ps-crumb"><a href="#/crm">${icon('back', 'ps-i-s')}<span>Clients</span></a></p><p class="ps-flash is-error">${icon('alert')}<span>That enquiry is not here.</span></p></div>`; return; }
    const p = P_(), n = N_(p);
    const body = step === 'ideas' ? ideasStep(p, n) : step === 'draft' ? draftStep(p, n) : step === 'requirements' ? reqStep(p, n) : step === 'esg' ? esgStep(p) : step === 'visuals' ? visualsStep(p) : step === 'pack' ? packStep(p) : noticeStep(p, n);
    const y = window.scrollY;
    el.innerHTML = `<div class="ps" data-step="${step}">${head(p, n)}<div class="ps-body">${body}</div><p class="vh" role="status" aria-live="polite" id="ps-live"></p></div>`;
    window.scrollTo(0, y);
    if (step === 'visuals') {
      if (!p.site && el.querySelector('[data-addr]')) stopAddr = mountAddressBox(el, { onPick: (m) => pickSite(m) });
      mountStage(p);
    }
    if (step === 'pack') buildPack(p, n);
    if (ui.focus) { el.querySelector(ui.focus)?.focus(); ui.focus = null; }
  }
  async function pickSite(m) {
    if (!m || !Number.isFinite(m.lat)) return;
    await save({ site: { lat: m.lat, lon: m.lon, place: placeLine(m) || m.town || '', address: m.address || '' } }, `Site chosen: ${placeLine(m) || 'a point'}`);
  }

  // ---------------------------------------------------------------------------------- doing things (each one is a person's action)
  async function onSubmit(ev) {
    const form = ev.target.closest('form[data-ps-form]');
    if (!form) return;
    ev.preventDefault();
    if (readOnly) return;
    const kind = form.dataset.psForm, fd = new FormData(form), v = (k) => String(fd.get(k) ?? '').trim();
    try {
      if (kind === 'notice') {
        const n = N_(), closes = v('closes');
        if (closes && !/^\d{4}-\d{2}-\d{2}$/.test(closes)) throw new Error('Give the closing date as day, month and year.');
        const text = String(fd.get('text') ?? '').slice(0, NOTICE_MAX);
        const ctxPatch = { buyer: v('buyer') === n.buyer && n.buyer_from !== 'practice' ? '' : v('buyer'), region: v('region') === n.region && n.region_from !== 'practice' ? '' : v('region'), closes: closes === n.closes && n.closes_from !== 'practice' ? '' : closes, ref: v('ref') };
        for (const k of ['public', 'cultural', 'residential']) { const c = form.querySelector(`[name="${k}"]`).checked; if (c !== n[k] || n[`${k}_from`] === 'practice') ctxPatch[k] = c; }
        const changedText = text.trim() !== (P_().notice.text || '').trim();
        await save({ context: ctxPatch, ...(changedText ? { notice: { text: text.trim(), at: new Date().toISOString(), by: who() } } : {}) }, changedText ? 'Notice text pasted' : 'Notice details saved', { redraw: false });
        ui.flash = { text: 'Saved with the enquiry.' }; return draw();
      }
      if (kind === 'programme') {
        const scope = fd.getAll('scope').map(String), weeks = {};
        for (const s of STAGES) { const w = v(`w-${s.key}`); if (w) { const x = Number(w); if (!(x >= 0.5 && x <= 260)) throw new Error(`Type the weeks for ${s.label} as a number from 0.5 to 260.`); weeks[s.key] = x; } }
        const start = v('start');
        await save({ scope, weeks, start }, 'Programme saved', { redraw: false });
        ui.flash = { text: 'Programme saved. The charts below and in the pack use these weeks.' }; return draw();
      }
      if (kind === 'point') {
        const w = parseWhere(v('where'));
        if (!w) throw new Error('That is not a point in New Zealand. Use decimal degrees, latitude first: -36.85, 174.76');
        await save({ site: { lat: w.lat, lon: w.lon, place: '', address: '' } }, 'Site set from a point');
        return;
      }
      if (kind === 'massing') return;
    } catch (err) { ui.flash = { error: true, text: String(err?.message ?? err) }; return draw(); }
  }
  function massingFrom(form) {
    const m = { ...P_().massing };
    for (const k of Object.keys(DEFAULT_MASSING)) { const x = Number(form.querySelector(`[name="${k}"]`)?.value); if (Number.isFinite(x)) m[k] = x; }
    m.w = Math.min(300, Math.max(1, m.w)); m.d = Math.min(300, Math.max(1, m.d)); m.h = Math.min(120, Math.max(1, m.h)); m.around = Math.min(60, Math.max(2, m.around));
    m.turn = Math.max(-180, Math.min(180, m.turn)); m.x = Math.max(-300, Math.min(300, m.x)); m.z = Math.max(-300, Math.min(300, m.z));
    return m;
  }
  async function onInput(ev) {
    const form = ev.target.closest('form[data-ps-form="massing"]');
    if (!form || readOnly) return;
    const m = massingFrom(form);
    scene?.setMassing(m);
    const cr = el.querySelector('[data-ps-credit]');
    if (cr) cr.textContent = cr.textContent.replace(/assumed at [\d.]+ m/, `assumed at ${m.around} m`);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { save({ massing: m }, '', { redraw: false }).catch(() => {}); }, 700);
  }
  async function onChange(ev) {
    const t = ev.target;
    if (readOnly) return;
    if (t.matches('[data-ps-sec]')) {
      const key = t.dataset.psSec, cur = P_().draft?.sections?.[key];
      if (!cur || t.value === cur.body) return;
      const at = new Date().toISOString();
      await save({ draft: { sections: { [key]: { ...cur, body: t.value, edited: true, by: who(), at } } } }, `Edited ${SECTIONS.find((s) => s.key === key)?.title}`, { redraw: false });
      const f = el.querySelector(`[data-from="${key}"]`); if (f) f.textContent = `Edited${who() ? ` by ${who()}` : ''}, ${ago(at)}`;
      const live = el.querySelector('#ps-live'); if (live) live.textContent = 'Saved.';
      const foot = el.querySelector(`[data-sec-f="${key}"]`);
      if (foot) { const gaps = markerCount(t.value); foot.querySelector('.ps-pill')?.replaceWith(Object.assign(document.createElement('span'), { className: `ps-pill ${gaps ? 'is-need' : 'is-flat'}`, textContent: gaps ? `${plural(gaps, 'gap')} to fill` : 'No gaps marked' })); }
      return;
    }
    if (t.matches('[data-ps-check]')) {
      const checks = { ...P_().checks }; if (t.checked) checks[t.dataset.psCheck] = true; else delete checks[t.dataset.psCheck];
      await save({ checks }, t.checked ? 'Go or no-go: one ticked' : 'Go or no-go: one unticked', { redraw: false });
      const n = el.querySelector('.ps-gng')?.closest('.ps-card')?.querySelector('.ps-count-n'); if (n) n.textContent = `${Object.keys(checks).length} of ${P_().ideas?.go_no_go.length ?? 0}`;
      return;
    }
    if (t.matches('[data-ps-exp]')) {
      const ids = new Set(P_().experience); if (t.checked) ids.add(t.dataset.psExp); else ids.delete(t.dataset.psExp);
      await save({ experience: [...ids] }, t.checked ? 'Project ticked as experience' : 'Project unticked', { redraw: false });
      return;
    }
    if (t.matches('[data-ps="print-address"]')) { await save({ print_address: t.checked }, t.checked ? 'The pack prints the street address' : 'The pack prints the suburb and town only'); }
  }
  async function onClick(ev) {
    const t = ev.target.closest('[data-ps]');
    if (!t || t.matches('input')) return;
    const act = t.dataset.ps;
    try {
      if (act === 'ask') { ui.confirm = t.dataset.task; ui.focus = '[data-ps="go"]'; return draw(); }
      if (act === 'cancel-ask') { const task = ui.confirm; ui.confirm = ''; ui.focus = `[data-ps="ask"][data-task="${task}"]`; return draw(); }
      if (act === 'go') return ask(t.dataset.task);
      if (act === 'keep') { const keep = new Set(P_().keep); const id = t.dataset.id; if (keep.has(id)) keep.delete(id); else keep.add(id); ui.focus = `[data-ps="keep"][data-id="${id}"]`; return save({ keep: [...keep] }, keep.has(id) ? 'Idea kept for the draft' : 'Idea let go'); }
      if (act === 'copy-qs') { const qs = (P_().ideas?.questions ?? []).map((q, i) => `${i + 1}. ${q}`).join('\n'); try { await navigator.clipboard.writeText(qs); ui.flash = { text: 'Copied. Send them yourself, through the buyer’s question channel.' }; } catch { ui.flash = { error: true, text: 'Select the questions and copy them yourself.' }; } return draw(); }
      if (act === 'template') {
        const p = P_(), n = N_(p), edited = Object.values(p.draft?.sections ?? {}).filter((s) => s.edited).length;
        if (edited && ui.confirm !== 'template') { ui.confirm = 'template'; ui.flash = { error: true, text: `This replaces the draft, including ${plural(edited, 'edited section')}. Press “Start again from the template” again to go ahead.` }; return draw(); }
        ui.confirm = '';
        const d = templateDraft({ notice: n, pursuit: p, team: team(), projects: ticked(p), list: applicable(n), who: who(), now: now() });
        await save({ draft: { ...d, replace: true } }, 'Draft started from the template', { redraw: false });
        ui.flash = { text: 'Started from the template. Each marked gap is something the practice still has to write.' }; return draw();
      }
      if (act === 'jump') { ev.preventDefault(); if (step !== 'draft') { ui.jump = t.dataset.sec; return ctx.navigate(`#/pursuit/${encodeURIComponent(st.e.id)}/draft`); } el.querySelector(`#sec-${CSS.escape(t.dataset.sec)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (act === 'view') return scene?.view(t.dataset.view);
      if (act === 'zoom') return scene?.zoom(Number(t.dataset.f));
      if (act === 'still') {
        if (!scene) return;
        const url = scene.still(1600, 1000), list = ui.stills.get(st.e.id) ?? [];
        list.push({ url, at: new Date().toISOString() }); ui.stills.set(st.e.id, list.slice(-6));
        const ul = el.querySelector('.ps-stills');
        if (ul) ul.innerHTML = ui.stills.get(st.e.id).map((s, i) => `<li><img src="${attr(s.url)}" alt="Still ${i + 1} of the massing study" width="160" height="100"><a class="ps-link" href="${attr(s.url)}" download="massing-study-${i + 1}.png">Download still ${i + 1}</a></li>`).join('');
        const live = el.querySelector('#ps-live'); if (live) live.textContent = 'Still saved. It goes in the pack.';
        return;
      }
      if (act === 'change-site') return save({ site: null }, 'Site cleared');
      if (act === 'linked-site') { const s = linkedSite(); if (s) return save({ site: { lat: s.lat, lon: s.lon, place: placeLine(s.address) || '', address: s.address?.address ?? '' } }, 'Site taken from the linked project'); return; }
      if (act === 'print') { window.print(); return; }
    } catch (err) { ui.flash = { error: true, text: String(err?.message ?? err) }; return draw(); }
  }
  const onResize = () => fitSheets();
  el.addEventListener('click', onClick);
  el.addEventListener('submit', onSubmit);
  el.addEventListener('change', onChange);
  el.addEventListener('input', onInput);
  window.addEventListener('resize', onResize);

  try { await load(); } catch (err) { el.innerHTML = `<div class="ps"><p class="ps-flash is-error">${icon('alert')}<span>${esc(err?.message ?? 'The enquiry could not be read.')}</span></p></div>`; return; }
  if (st.e && !isOpen(st.e) && !st.e.pursuit) ui.flash = { text: `This enquiry is ${stageLabel(st.e.stage).toLowerCase()}${st.e.archived ? ' and archived' : ''}. The studio still opens, for the record.` };
  st.status = await serverStatus();
  await draw();
  if (ui.jump && step === 'draft') { const k = ui.jump; ui.jump = null; requestAnimationFrame(() => el.querySelector(`#sec-${CSS.escape(k)}`)?.scrollIntoView({ block: 'start' })); }
  return () => { gone = true; ui.flash = null; ui.confirm = ''; clearTimeout(saveTimer); scene?.stop(); stopAddr?.(); for (const c of cleanups) c(); window.removeEventListener('resize', onResize); };
}
const CREDIT_TEXT = 'Building outlines and the parcel boundary: LINZ Data Service, licensed for reuse under CC BY 4.0.';

registerRoute('pursuit', { title: 'Pursuit studio', render: renderScreen });
