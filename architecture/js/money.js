// Money: each project's health dial, money and time, the practice's month and pipeline, and who is working on what.
// An add-on (modules.js). It brings:
//   a dial on every project tile and in every project's header        registerWall tiles, registerProjectHead
//   the practice's month and its six-month pipeline, above the wall     registerWall top
//   a Money tab on each project: fee, time, invoices, programme, people  registerProjectTab
//   a Money section in Settings: break-even, targets, labels, chances, team   registerSettings
//   a Money screen at #/money: the pipeline, the team's weeks, allocations, the enquiries' months   registerRoute
// The rules are in money-model.js and the instruments in dial.js. Records go through the page's store (this browser, or
// the practice's shared records). Every figure on screen is one a person typed, or worked out from those, and the page
// says which. Nothing here gives advice on fees or tax, and nothing is saved until a person presses a button.

import { registerRoute, registerNav, registerProjectTab, registerProjectHead, registerWall, registerSettings } from './modules.js';
import * as M from './money-model.js';
import { healthDial, practiceDial, feeGauge, stateIcon, animateDials, STATE_ICON } from './dial.js';
import { activity, STAGE_KEYS, stageNumber, currentStage, SAMPLE_ID } from './model.js';
import { dayKey, sameId, initials, stageLabel as enquiryStage } from './crm-model.js';

const CSS_VERSION = '0f5d7af2df'; // the first ten of money.css's sha-256: tests/architecture/money.test.mjs fails when it is out of step
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const today = () => dayKey(new Date());
const nzd = (n) => (n == null || !Number.isFinite(Number(n)) ? '' : `${n < 0 ? '−' : ''}$${Math.round(Math.abs(n)).toLocaleString('en-NZ')}`);
const hrs = (n) => `${Math.round(n * 10) / 10} h`;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const isSample = (p) => !!p && (p.sample === true || p.id === SAMPLE_ID);
const projectHash = (pid, tab = '') => `#/p/${encodeURIComponent(pid)}${tab ? `/t/${tab}` : ''}`;
/** a phone: the charts are drawn narrower, so their words stay readable rather than shrinking with the drawing */
const narrow = () => (globalThis.innerWidth ?? 1200) < 600;
const crmOnly = (ids) => (ids.length ? `#/crm/only/${ids.map(encodeURIComponent).join(',')}` : '#/crm');

// ---- the stylesheet ---------------------------------------------------------------------------------------------------
let cssReady = null;
function ensureCss() {
  if (cssReady) return cssReady;
  const v = new URL(import.meta.url).searchParams.get('v') ?? '0';
  const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL(`../money.css?v=${v}.${CSS_VERSION}`, import.meta.url).href });
  link.dataset.money = '1';
  cssReady = new Promise((resolve) => {
    link.addEventListener('load', resolve, { once: true }); link.addEventListener('error', resolve, { once: true });
    setTimeout(resolve, 2500); // a slow stylesheet never holds the screen back for long
    document.head.append(link);
  });
  return cssReady;
}

// ---- line icons (stroke 1.5, the colour of the text beside them) -----------------------------------------------------
const P = {
  speedo: '<path d="M4.2 17.5a8.5 8.5 0 1 1 15.6 0"/><path d="M12 14.5 16 9"/><circle cx="12" cy="14.5" r="1.4"/><path d="M6.5 12.5h1M12 6.5v1M17.5 12.5h-1"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  invoice: '<path d="M6 3.5h12v17l-2.5-1.6L13 20.5l-2-1.6-2.5 1.6L6 18.9z"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.3a3.2 3.2 0 0 1 0 5.9M18 14c1.8.7 3 2.4 3 5"/>',
  plan: '<path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17"/><circle cx="8" cy="6.5" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="11" cy="17.5" r="1.6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="m7 7 10 10M17 7 7 17"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="1"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  settings: '<path d="M4 7h9M17 7h3M15 4.5v5M4 17h3M11 17h9M9 14.5v5"/>',
  dash: '<circle cx="12" cy="12" r="8.5" stroke-dasharray="2.4 2.6"/>',
};
const icon = (name, cls = '') => `<svg class="m-i${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] ?? ''}</svg>`;
const TAB_ICON = `<svg class="ic" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P.speedo}</svg>`;
const NAV_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" focusable="false">${P.speedo}</svg>`;
const STATUS_ICON = { paid: 'tick', due: 'clock', overdue: 'coin', draft: 'none', void: 'x' };
const statusIcon = (st) => (st === 'due' ? icon('clock', 'h-ic') : st === 'void' ? icon('x', 'h-ic') : stateIcon(STATUS_ICON[st]));
const avatar = (name) => `<span class="m-av" aria-hidden="true">${esc(initials(name) || '–')}</span>`;

// ---- reading: one read of everything for every part drawn at once -------------------------------------------------------
let gen = 0, cache = null;
const bump = () => { gen++; cache = null; };
function readAll(ctx) {
  const key = ctx.store.current ?? ctx.store;
  if (cache && cache.gen === gen && cache.key === key && Date.now() - cache.at < 2500) return cache.p;
  const p = (async () => {
    const out = { settings: M.practiceMoney(null), raw: null, where: ctx.store.shared ? 'practice' : 'browser', invoices: [], time: [], allocations: [], enquiries: [], problem: '' };
    try {
      out.raw = ctx.store.shared && ctx.store.current?.practiceExtra ? await ctx.store.current.practiceExtra('money') : (await ctx.store.get('setting', 'money'))?.value ?? null;
      out.settings = M.practiceMoney(out.raw);
    } catch (e) { out.problem = e.message; }
    const list = async (k) => { try { return await ctx.store.list(k); } catch (e) { out.problem ||= e.message; return []; } };
    [out.invoices, out.time, out.allocations, out.enquiries] = await Promise.all(['invoice', 'time_entry', 'allocation', 'enquiry'].map(list));
    return out;
  })();
  cache = { gen, key, at: Date.now(), p, bundles: new Map() };
  return p;
}
/** a project with its stages and tasks: what the dial needs from the seven stages */
async function bundleOf(ctx, project) {
  await readAll(ctx);
  const c = cache, hit = c?.bundles.get(project.id);
  if (hit) return hit;
  const b = (async () => {
    const [stages, tasks] = await Promise.all([ctx.store.list('stage', { project_id: project.id }), ctx.store.list('task', { project_id: project.id })]);
    return { project, stages, tasks };
  })();
  c?.bundles.set(project.id, b);
  return b;
}
const healthOf = (b, d) => M.health({ b, invoices: d.invoices, time: d.time, settings: d.settings, today: today() });

// ---- who may change what ------------------------------------------------------------------------------------------------
const role = (ctx) => ctx.practice?.role ?? 'owner';
const mayFor = (ctx, project) => (what) => M.can(what, { shared: !!ctx.store.shared && !isSample(project), role: role(ctx) });
const mayPractice = (ctx) => M.can('practice', { shared: !!ctx.store.shared, role: role(ctx) });
const who = (ctx) => String(ctx.me ?? '').trim();

// ---- writing --------------------------------------------------------------------------------------------------------------
async function log(ctx, pid, action, detail = '') {
  try { await ctx.store.save('activity', activity(pid, who(ctx), action, detail)); } catch { /* the change is saved; a viewer's log line is refused */ }
}
async function saveMoney(ctx, pid, change) {
  const p = await ctx.store.get('project', pid);
  if (!p) throw new Error('That project is no longer here, so nothing was saved.');
  const next = { ...(p.money && typeof p.money === 'object' ? p.money : {}), ...change };
  for (const k of Object.keys(next)) if (next[k] === undefined || next[k] === null) delete next[k];
  p.money = next; p.updated_at = new Date().toISOString();
  await ctx.store.save('project', p);
  bump();
  return p;
}
async function saveSettings(ctx, next) {
  const clean = M.practiceMoney(next);
  if (ctx.store.shared && ctx.store.current?.setPracticeExtra) await ctx.store.current.setPracticeExtra('money', clean);
  else await ctx.store.save('setting', { id: 'money', value: clean });
  bump();
  return clean;
}
const stamp = (ctx, extra = {}) => ({ ...extra, by: who(ctx), at: new Date().toISOString() });
const formData = (form) => Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, String(v).trim()]));

// one message, error or not, shown where the person was working; one confirm at a time for anything removed
const ui = { note: null, confirm: '', focus: null }; // focus: { where, sel }, taken by the part drawn for that place
/** the message for a place, shown once: the next drawing of that place no longer has it */
function noteHtml(where) {
  if (ui.note?.where !== where) return '';
  const n = ui.note; ui.note = null;
  return `<p class="flash m-note${n.error ? ' is-error' : ''}" role="${n.error ? 'alert' : 'status'}" tabindex="-1">${esc(n.text)}</p>`;
}
function afterDraw(el, where = '') {
  animateDials(el);
  if (where && ui.focus?.where === where) { const t = el.querySelector(ui.focus.sel); ui.focus = null; t?.focus({ preventScroll: false }); }
}
const focusing = (where, part) => ui.focus?.where === where && String(ui.focus.sel).includes(part);

// ---- the dial with its words --------------------------------------------------------------------------------------------
function dialBlock(h, { small = false, key = '' } = {}) {
  const st = h.state;
  return `<figure class="hd${small ? ' hd-sm' : ''} is-${st ?? 'none'}">${healthDial(h, { small, key })}
    <figcaption><p class="hd-word">${stateIcon(st ? STATE_ICON[st] : 'none')}<span>${esc(h.label)}</span></p>
      ${small ? '' : h.meaning ? `<p class="hd-mean">${esc(h.meaning)}</p>` : ''}
      <p class="hd-from">${esc(h.line)}${h.reason ? `: “${esc(h.reason)}”` : ''}</p>
      ${h.watch.length ? `<p class="hd-watch">${stateIcon('warn')}<span>Watch: ${esc(h.watch.join('; '))}</span></p>` : ''}
      ${!small && h.also.length ? `<p class="hd-from">Also: ${esc(h.also.join('; '))}</p>` : ''}</figcaption></figure>`;
}

// ---- a project's tile and header --------------------------------------------------------------------------------------------
async function renderTiles(els, ctx, wall) {
  await ensureCss();
  const d = await readAll(ctx);
  for (const p of wall.projects ?? []) {
    const el = els[p.id];
    if (!el) continue;
    const b = { project: p, stages: (wall.stages ?? []).filter((s) => sameId(s.project_id, p.id)), tasks: (wall.tasks ?? []).filter((t) => sameId(t.project_id, p.id)) };
    el.innerHTML = dialBlock(healthOf(b, d), { small: true, key: `tile:${p.id}` });
    animateDials(el);
  }
}

async function renderHead(el, ctx) {
  await ensureCss();
  const p = ctx.project;
  if (!p) return;
  const d = await readAll(ctx), b = await bundleOf(ctx, p), h = healthOf(b, d), on = M.onProject(d.allocations, p.id, today());
  el.innerHTML = `<div class="mh">${dialBlock(h, { key: `head:${p.id}` })}
    <div class="mh-side">${on.length ? `<p class="lab">On it</p><ul class="m-people">${on.map((a) => `<li title="${esc(`${a.person}: ${a.hours_week} hours a week, ${M.dayShort(a.from)} to ${M.dayShort(a.to)}`)}">${avatar(a.person)}<span>${esc(a.person.split(/\s+/)[0])}</span>${a.now ? '' : '<span class="m-soon">from ' + esc(M.dayShort(a.from)) + '</span>'}</li>`).join('')}</ul>` : '<p class="small">Nobody is planned on it yet.</p>'}
      <a class="link" href="${projectHash(p.id, 'money')}">Money and time</a></div></div>`;
  afterDraw(el);
}

// ---- the practice: this month, and the pipeline month by month ----------------------------------------------------------------
function practicePanel(d, ctx, { full = false } = {}) {
  const s = d.settings, mo = M.monthly(s), ym = M.ymOf(today()), rev = M.revenueIn(d.invoices, ym, s.counts), st = M.revenueState(rev.total, mo);
  const from = M.ymAdd(ym, 1), fc = M.forecast(d.enquiries, s.chances, from, 6), short = M.shortMonths(fc.rows, mo.breakEven);
  const owner = mayPractice(ctx), typed = mo.breakEven != null;
  const word = st ? M.REVENUE_WORD[st] : typed ? '' : 'No break-even typed yet';
  const wordIcon = st === 'below' ? stateIcon('below') : st === 'target' || st === 'above' ? stateIcon('target') : st === 'over' ? stateIcon('up') : stateIcon('none');
  const counts = s.counts === 'paid' ? 'invoices paid this month' : 'invoices issued this month';
  const dialLabel = `This month: ${word || 'revenue'}. ${rev.rows.length ? `${plural(rev.rows.length, 'invoice')} counted.` : 'No invoices counted yet.'}`;
  const figures = `<details class="m-fig"><summary>The figures</summary><dl class="m-kv">
      <dt>This month</dt><dd>${nzd(rev.total)} from ${plural(rev.rows.length, 'invoice')} (${counts})</dd>
      <dt>Break-even</dt><dd>${typed ? `${nzd(mo.breakEven)} a month${mo.perYear ? ' (the year’s figure ÷ 12)' : ''}` : 'Not typed'}</dd>
      <dt>Target</dt><dd>${mo.low != null ? `${nzd(mo.low)}${mo.high != null ? ` to ${nzd(mo.high)}` : ''} a month` : 'Not typed'}</dd></dl>
      <p class="small">Break-even and targets are the practice’s own, typed in Settings. Revenue is added up from the invoices typed on each project. Nothing here is estimated, and it is not advice on fees or tax.</p></details>`;
  const setLine = typed ? '' : `<p class="small">${owner ? '<a href="#/settings">Type the practice’s break-even and target</a> to put the bands on the dial.' : 'An owner of the practice types its break-even and target in Settings.'}</p>`;
  return `<section class="pm${full ? ' pm-full' : ''}" aria-labelledby="pm-h">
    <div class="pm-head"><h2 id="pm-h" class="m-h">${icon('speedo')}<span>Practice money</span></h2>${full ? '' : '<a class="link" href="#/money">Money and people</a>'}</div>
    ${d.problem ? `<p class="flash">□ ${esc(d.problem)}</p>` : ''}
    <div class="pm-grid">
      <figure class="pm-dial is-${st ?? 'none'}"><p class="lab">This month</p>${practiceDial({ total: rev.total, mo, key: `month:${ym}:${Math.round(rev.total)}`, label: dialLabel })}
        <figcaption><p class="hd-word">${wordIcon}<span>${esc(word || 'This month')}</span></p><p class="hd-from">Counts ${esc(counts)}.</p>${setLine}${figures}</figcaption></figure>
      ${forecastChart(fc, mo, d, { full })}
    </div></section>`;
}

function forecastChart(fc, mo, d, { full = false } = {}) {
  const n = narrow(), vw = globalThis.innerWidth ?? 1200, rows = fc.rows, be = mo.breakEven, W = n ? 360 : vw < 1100 ? 440 : 600, H = 230, top = 18, base = 186, left = 4, right = n ? 66 : 78; // the labels sit in the right margin
  const max = Math.max(1, ...rows.map((r) => r.total), be ?? 0, mo.high ?? 0, mo.low ?? 0) * 1.12;
  const y = (v) => base - (v / max) * (base - top), slot = (W - left - right) / rows.length, bw = Math.min(64, slot * 0.56);
  const shortSet = new Set(M.shortMonths(rows, be).map((s) => s.ym));
  const band = mo.low != null ? `<rect class="fc-band" x="${left}" y="${y(mo.high ?? mo.low)}" width="${W - left - right}" height="${Math.max(2, y(mo.low) - y(mo.high ?? mo.low))}"/><text class="fc-t" x="${W - right + 8}" y="${(y(mo.high ?? mo.low) + y(mo.low)) / 2 + 4}">target</text>` : '';
  const beLine = be != null ? `<line class="fc-be" x1="${left}" x2="${W - right}" y1="${y(be)}" y2="${y(be)}"/><text class="fc-t fc-bet" x="${W - right + 8}" y="${y(be) + 4}">break-even</text>` : '';
  const bars = rows.map((r, i) => {
    const x = left + slot * i + (slot - bw) / 2, isShort = shortSet.has(r.ym);
    const ids = isShort ? M.gapLeads(d.enquiries, r.ym).map((e) => e.id) : [...new Set(r.items.map((it) => it.id))];
    const wonH = (r.won / max) * (base - top), likH = (r.likely / max) * (base - top);
    const label = `${M.ymLabel(r.ym, { long: true, year: true })}: ${isShort ? 'below break-even. Open the enquiries that could fill it' : be != null ? 'at or above break-even. Open the enquiries in it' : 'open the enquiries in it'}`;
    return `<a href="${crmOnly(ids)}" class="fc-m${isShort ? ' is-short' : ''}" aria-label="${esc(label)}"><title>${esc(label)}</title>
      <rect class="fc-hit" x="${left + slot * i}" y="${top - 14}" width="${slot}" height="${H - top + 14}"/>
      ${r.likely > 0 ? `<rect class="fc-likely" x="${x}" y="${base - wonH - likH}" width="${bw}" height="${likH}"/>` : ''}
      ${r.won > 0 ? `<rect class="fc-won" x="${x}" y="${base - wonH}" width="${bw}" height="${wonH}"/>` : ''}
      ${r.total === 0 ? `<rect class="fc-zero" x="${x}" y="${base - 2}" width="${bw}" height="2"/>` : ''}
      ${isShort ? `<g class="fc-flag" transform="translate(${x + bw / 2 - 9} ${Math.min(base - wonH - likH, y(be)) - 24})"><path d="M9 2v13M3.5 9.5 9 15l5.5-5.5" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>` : ''}
      <text class="fc-x" x="${x + bw / 2}" y="${base + 18}" text-anchor="middle">${esc(M.ymLabel(r.ym))}</text>
      ${isShort ? `<text class="fc-xs" x="${x + bw / 2}" y="${base + 34}" text-anchor="middle">short</text>` : ''}</a>`;
  }).join('');
  const shortList = rows.filter((r) => shortSet.has(r.ym));
  const unsched = fc.unscheduled.filter((u) => M.OPEN.includes(u.enquiry.stage) || u.enquiry.stage === 'won');
  const desc = `The next six months of the pipeline: won work in full, open work weighted by each stage’s chance${be != null ? `. ${shortList.length ? `${plural(shortList.length, 'month')} below break-even: ${shortList.map((r) => M.ymLabel(r.ym, { long: true })).join(', ')}` : 'No month below break-even'}` : ''}.`;
  return `<div class="fc"><p class="lab">The next six months</p>
    <svg class="fc-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(desc)}"><defs><pattern id="fc-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" class="fc-hatch-bg"/><line x1="0" y1="0" x2="0" y2="6" class="fc-hatch-ln"/></pattern></defs>
      ${band}<line class="fc-base" x1="${left}" x2="${W - right}" y1="${base}" y2="${base}"/>${bars}${beLine}</svg>
    <ul class="fc-key"><li><i class="k-won"></i>Won</li><li><i class="k-likely"></i>Likely, by stage chance</li>${be != null ? '<li><i class="k-be"></i>Break-even</li>' : ''}${mo.low != null ? '<li><i class="k-band"></i>Target</li>' : ''}${be != null ? `<li>${stateIcon('below', 'k-ic')}Below break-even</li>` : ''}</ul>
    ${be != null ? `<p class="fc-say">${shortList.length ? `${stateIcon('below')}<span>${shortList.map((r) => `<a href="${crmOnly(M.gapLeads(d.enquiries, r.ym).map((e) => e.id))}">${esc(M.ymLabel(r.ym, { long: true }))}</a>`).join(', ')} ${shortList.length === 1 ? 'is' : 'are'} below break-even. Choose a month to see the enquiries that could fill it.</span>` : `${stateIcon('target')}<span>No month in the next six is below break-even.</span>`}</p>` : ''}
    ${unsched.length ? `<p class="small">${plural(unsched.length, 'enquiry', 'enquiries')} ${unsched.length === 1 ? 'is' : 'are'} not in the forecast yet (${esc([...new Set(unsched.map((u) => u.why))].slice(0, 3).join('; '))}). <a href="#/money">Give ${unsched.length === 1 ? 'it' : 'them'} a start month and length</a>.</p>` : ''}
    <details class="m-fig"><summary>The figures</summary><table class="m-table"><thead><tr><th>Month</th><th>Won</th><th>Likely</th><th>Total</th>${be != null ? '<th>Short of break-even</th>' : ''}</tr></thead>
      <tbody>${rows.map((r) => `<tr><th>${esc(M.ymLabel(r.ym, { year: true }))}</th><td>${nzd(r.won)}</td><td>${nzd(r.likely)}</td><td>${nzd(r.total)}</td>${be != null ? `<td>${r.total < be ? nzd(be - r.total) : '–'}</td>` : ''}</tr>`).join('')}</tbody></table>
      <p class="small">Each enquiry’s value as typed, times the chance the practice typed for its stage (won counts in full), spread evenly over the months it runs. ${full ? '' : 'Start months and lengths are typed on the Money screen.'}</p></details></div>`;
}

async function renderWallTop(el, ctx) {
  await ensureCss();
  const d = await readAll(ctx);
  el.innerHTML = practicePanel(d, ctx);
  afterDraw(el);
}

// ---- a project's Money tab ----------------------------------------------------------------------------------------------------
async function renderTab(el, ctx) {
  await ensureCss();
  const p = ctx.project;
  if (!p) return;
  const d = await readAll(ctx), b = await bundleOf(ctx, p), h = healthOf(b, d), may = mayFor(ctx, p);
  const m = M.projectMoney(p), bud = h.parts.budget, t = today(), where = `tab:${p.id}`;
  const inv = d.invoices.filter((i) => sameId(i.project_id, p.id)).sort((x, y) => String(x.issued || '9').localeCompare(String(y.issued || '9')) || String(x.number).localeCompare(String(y.number)));
  const time = d.time.filter((x) => sameId(x.project_id, p.id)).sort((x, y) => String(y.date).localeCompare(String(x.date)));
  const allocs = d.allocations.filter((a) => sameId(a.project_id, p.id)).sort((x, y) => String(x.from).localeCompare(String(y.from)));
  const team = d.settings.team, cur = currentStage(b);
  const won = d.enquiries.filter((e) => sameId(e.project_id, p.id) && M.fromEnquiry(e));
  const any = (what) => may(what);
  const teamList = `<datalist id="m-team-${esc(p.id)}">${team.map((x) => `<option value="${esc(x.name)}"></option>`).join('')}</datalist>`;

  // -- visuals: fee used against work done, the fee left, hours
  const usedW = bud.used == null ? 0 : Math.min(1, bud.used), doneW = Math.min(1, bud.progress);
  const over = bud.used != null && bud.used > bud.progress ? Math.min(1, bud.used) - doneW : 0;
  const feeBar = `<details class="m-tap mc"><summary><p class="lab">${bud.basis === 'hours' ? 'Budget hours used' : 'Fee used'} against work done</p>
      ${bud.basis ? `<div class="m-bars" role="img" aria-label="${esc(`${M.pct(bud.used)} of the ${bud.basis === 'hours' ? 'budget hours' : 'fee'} used at ${M.pct(bud.progress)} of the work done`)}">
        <div class="m-row"><span>Used</span><span class="m-track"><i class="m-fill${over > 0 ? ' is-over' : ''}" style="--w:${(Math.min(usedW, doneW) * 100).toFixed(1)}%"></i>${over > 0 ? `<i class="m-overrun" style="--l:${(doneW * 100).toFixed(1)}%;--w:${(over * 100).toFixed(1)}%"></i>` : ''}</span></div>
        <div class="m-row"><span>Done</span><span class="m-track"><i class="m-fill is-done" style="--w:${(doneW * 100).toFixed(1)}%"></i></span></div>
      </div><p class="hd-word">${bud.state === 'over' ? `${stateIcon('warn')}<span>Ahead of the work</span>` : `${stateIcon('tick')}<span>Within the work done</span>`}</p>`
      : `<p class="m-empty">${icon('dash')}<span>${any('fee') ? 'Type a fee and an hourly rate, or budget hours, to see this.' : 'No fee and rate, or budget hours, typed yet.'}</span></p>`}
      <span class="m-more">Figures</span></summary>
      <dl class="m-kv">${bud.basis === 'fee' ? `<dt>Fee</dt><dd>${nzd(bud.fee)}, typed</dd><dt>Rate</dt><dd>${nzd(bud.rate)} an hour, ${bud.rateFrom === 'project' ? 'this project’s own' : 'the practice’s default'}</dd><dt>Time</dt><dd>${hrs(bud.hours)} logged = ${nzd(bud.cost)}</dd><dt>Fee used</dt><dd>${M.pct(bud.used)}</dd>`
        : bud.basis === 'hours' ? `<dt>Budget</dt><dd>${hrs(bud.budgetHours)}, typed</dd><dt>Logged</dt><dd>${hrs(bud.hours)}</dd><dt>Used</dt><dd>${M.pct(bud.used)}</dd>` : '<dt>Fee</dt><dd>Not typed</dd>'}
        <dt>Work done</dt><dd>${M.pct(bud.progress)}: ${esc(bud.progressHow)}</dd></dl></details>`;
  const pr = M.profit(bud);
  const feeLeft = `<details class="m-tap mc"><summary><p class="lab">Fee left after the time so far</p>
      ${feeGauge(pr, { key: `fee:${p.id}:${pr ? Math.round(pr.share * 100) : 'none'}`, label: pr ? `${M.pct(Math.max(0, pr.share))} of the fee left after the time so far${pr.left < 0 ? ': the time so far is more than the fee' : ''}` : 'Not enough to tell: needs a fee and an hourly rate' })}
      <p class="hd-word">${pr ? (pr.left < 0 ? `${stateIcon('below')}<span>Past the fee</span>` : pr.share >= 0.5 ? `${stateIcon('tick')}<span>Most of the fee left</span>` : `${stateIcon('dot')}<span>${pr.share >= 0.25 ? 'Some' : 'Little'} of the fee left</span>`) : `${stateIcon('none')}<span>Needs a fee and a rate</span>`}</p>
      <span class="m-more">Figures</span></summary>
      ${pr ? `<dl class="m-kv"><dt>Fee</dt><dd>${nzd(pr.fee)}</dd><dt>Time × rate</dt><dd>${nzd(pr.cost)}</dd><dt>Left</dt><dd>${nzd(pr.left)}</dd></dl><p class="small">The fee less the time logged at the hourly rate. It is not a profit forecast.</p>` : `<p class="small">${any('fee') ? 'Type a fee, and an hourly rate here or in Settings.' : 'No fee and hourly rate typed yet.'}</p>`}</details>`;
  const bh = m.hours, logged = bud.hours, hoursW = bh ? Math.min(1, logged / bh) : 0;
  const hoursCard = `<details class="m-tap mc"><summary><p class="lab">Hours</p>
      ${bh ? `<div class="m-bars" role="img" aria-label="${esc(`${hrs(logged)} logged of ${hrs(bh)} budgeted`)}"><div class="m-row"><span>Logged</span><span class="m-track"><i class="m-fill${logged > bh ? ' is-over' : ''}" style="--w:${(hoursW * 100).toFixed(1)}%"></i></span></div></div>
        <p class="hd-word">${logged > bh ? `${stateIcon('warn')}<span>Past the budget hours</span>` : `${stateIcon('dot')}<span>${hoursW < 0.5 ? 'Well within' : hoursW < 0.9 ? 'Over half of' : 'Near'} the budget hours</span>`}</p>`
      : `<p class="m-empty">${icon('dash')}<span>${logged ? `${plural(time.length, 'entry', 'entries')} logged. Type budget hours to see them against it.` : 'No time logged yet.'}</span></p>`}
      <span class="m-more">Figures</span></summary><dl class="m-kv"><dt>Logged</dt><dd>${hrs(logged)} in ${plural(time.length, 'entry', 'entries')}</dd><dt>Budget</dt><dd>${bh ? hrs(bh) : 'Not typed'}</dd>
      ${Object.entries(time.reduce((a, x) => ({ ...a, [x.person]: (a[x.person] ?? 0) + Number(x.hours) }), {})).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${hrs(v)}</dd>`).join('')}</dl></details>`;

  // -- the programme: today against the stage targets
  const prog = programme(b, m, t);

  // -- invoices as chips
  const chip = (i) => {
    const st = M.invoiceStatus(i, t), open = ui.confirm === `inv:${i.id}`;
    return `<li><details class="m-chip is-${st}"${open ? ' open' : ''}><summary>${statusIcon(st)}<span class="m-chip-n">${esc(i.number)}</span><span class="m-chip-s">${esc(M.INVOICE_WORD[st])}</span></summary>
      <div class="m-chip-b"><dl class="m-kv"><dt>Amount</dt><dd>${nzd(i.amount_nzd)}, typed</dd><dt>Issued</dt><dd>${i.issued ? esc(M.dayShort(i.issued)) : 'Not yet'}</dd><dt>Due</dt><dd>${i.due ? esc(M.dayShort(i.due)) : 'No date'}</dd><dt>Paid</dt><dd>${i.paid ? esc(M.dayShort(i.paid)) : 'Not yet'}</dd>${i.void ? `<dt>Void</dt><dd>${esc(i.void_reason)}</dd>` : ''}</dl>
      ${!i.void && any('invoice') ? `${i.paid ? '' : `<form class="m-mini" data-m="paid" data-id="${esc(i.id)}"><label>Paid on<input type="date" name="paid" value="${t}" required></label><button class="btn">${icon('check')}<span>Mark paid</span></button></form>`}
        <form class="m-mini" data-m="void" data-id="${esc(i.id)}"><label>Why void<input name="reason" required maxlength="300" placeholder="Raised twice"></label><button class="btn">${icon('x')}<span>Void it</span></button></form>` : ''}</div></details></li>`;
  };
  const invoices = `<section class="ms" aria-labelledby="mi-h-${esc(p.id)}"><h3 class="m-h" id="mi-h-${esc(p.id)}">${icon('invoice')}<span>Invoices</span></h3>
    ${inv.length ? `<ul class="m-chips">${inv.map(chip).join('')}</ul>` : `<p class="m-empty">${icon('dash')}<span>No invoices yet.</span></p>`}
    ${any('invoice') ? `<details class="m-add"${focusing(where, 'invoice') ? ' open' : ''}><summary>${icon('plus')}<span>Add an invoice</span></summary>
      <form class="f m-form" data-m="invoice"><label>Number<input name="number" required maxlength="40" autocomplete="off"></label><label>Amount, NZD<input name="amount" required inputmode="decimal" placeholder="12000" autocomplete="off"></label>
        <label>Issued<input type="date" name="issued" value="${t}"></label><label>Due<input type="date" name="due"></label><div class="f-act"><button class="btn solid">${icon('check')}<span>Add invoice</span></button></div></form>
      <p class="small">Amounts are typed here and never worked out. An invoice is voided, not removed.</p></details>` : ''}</section>`;

  // -- time
  const stageOpts = (sel) => `<option value="">No stage</option>${STAGE_KEYS.map((k) => `<option value="${k}"${k === sel ? ' selected' : ''}>${stageNumber(k)}. ${esc(M.stageLabel(k))}</option>`).join('')}`;
  const timeSec = `<section class="ms" aria-labelledby="mt-h-${esc(p.id)}"><h3 class="m-h" id="mt-h-${esc(p.id)}">${icon('clock')}<span>Time</span></h3>
    ${any('time') ? `<form class="f m-form m-quick" data-m="time"><label>Who<input name="person" list="m-team-${esc(p.id)}" required maxlength="80" value="${esc(who(ctx))}" autocomplete="off"></label>
      <label>Day<input type="date" name="date" value="${t}" required></label><label>Hours<input name="hours" required inputmode="decimal" placeholder="7.5" autocomplete="off"></label>
      <label>Stage<select name="stage">${stageOpts(cur?.key ?? '')}</select></label><div class="f-act"><button class="btn solid">${icon('plus')}<span>Log time</span></button></div></form>${teamList}` : time.length ? '' : `<p class="m-empty">${icon('dash')}<span>No time logged yet.</span></p>`}
    ${time.length ? `<details class="m-fig"><summary>${plural(time.length, 'entry', 'entries')}, ${hrs(logged)} logged</summary><ul class="m-list">${time.slice(0, 60).map((x) => `<li>${avatar(x.person)}<span><b>${esc(x.person)}</b> · ${esc(M.dayShort(x.date))}${x.stage ? ` · ${stageNumber(x.stage)}. ${esc(M.stageLabel(x.stage))}` : ''}</span><span class="m-num">${hrs(Number(x.hours))}</span>
      ${any('time') ? `<button type="button" class="link" data-m="time-remove" data-id="${esc(x.id)}">${ui.confirm === `time:${x.id}` ? 'Remove for good' : 'Remove'}<span class="vh"> ${esc(x.person)}, ${esc(x.date)}</span></button>` : ''}</li>`).join('')}</ul></details>` : ''}</section>`;

  // -- people on it
  const peopleSec = `<section class="ms" aria-labelledby="mp-h-${esc(p.id)}"><h3 class="m-h" id="mp-h-${esc(p.id)}">${icon('people')}<span>Who is on it</span></h3>
    ${allocs.length ? `<ul class="m-list">${allocs.map((a) => `<li>${avatar(a.person)}<span><b>${esc(a.person)}</b> · ${esc(M.dayShort(a.from))} to ${esc(M.dayShort(a.to))}${a.to < t ? ' · finished' : ''}</span><span class="m-num">${esc(a.hours_week)} h a week</span>
      ${any('allocation') ? `<button type="button" class="link" data-m="alloc-remove" data-id="${esc(a.id)}">${ui.confirm === `alloc:${a.id}` ? 'Remove for good' : 'Remove'}<span class="vh"> ${esc(a.person)}</span></button>` : ''}</li>`).join('')}</ul>` : `<p class="m-empty">${icon('dash')}<span>Nobody is planned on it yet.</span></p>`}
    ${any('allocation') ? `<details class="m-add"><summary>${icon('plus')}<span>Plan someone on it</span></summary><form class="f m-form" data-m="alloc"><label>Who<input name="person" list="m-team-${esc(p.id)}" required maxlength="80" autocomplete="off"></label>
      <label>Hours a week<input name="hours_week" required inputmode="decimal" placeholder="20" autocomplete="off"></label><label>From<input type="date" name="from" value="${t}" required></label><label>To<input type="date" name="to" required></label>
      <div class="f-act"><button class="btn solid">${icon('check')}<span>Plan it</span></button></div></form></details>` : ''}</section>`;

  // -- the won enquiry's figures, taken on when the person says so
  const take = won.filter(() => !m.from_enquiry && m.fee == null && m.hours == null).map((e) => {
    const f = M.fromEnquiry(e), moving = d.allocations.filter((a) => sameId(a.enquiry_id, e.id));
    return `<form class="panel m-take" data-m="take" data-id="${esc(e.id)}"><p class="m-h">${icon('arrow')}<span>From the won enquiry “${esc(e.title)}”</span></p>
      <p>${f.fee != null ? `Its value, ${nzd(f.fee)}, as this project’s fee` : ''}${f.fee != null && f.hours != null ? ', and ' : ''}${f.hours != null ? `its ${hrs(f.hours)} expected as the budget hours` : ''}.</p>
      ${moving.length ? `<label class="chk"><input type="checkbox" name="move" value="1" checked><span>Move its ${plural(moving.length, 'planned allocation')} to this project too.</span></label>` : ''}
      <div class="acts"><button class="btn solid">${icon('check')}<span>Use these</span></button><span class="small">Nothing changes until you press it. Both stay as typed on the enquiry.</span></div></form>`;
  }).join('');

  // -- the project's own figures
  const ownerRate = may('rate');
  const setup = `<details class="m-set m-setup"${focusing(where, 'm-setup') ? ' open' : ''}><summary>${icon('settings')}<span>Fee, budget and programme</span></summary>
    <form class="f m-form" data-m="setup"${any('fee') ? '' : ' inert'}>
      <label>Fee, NZD<input name="fee" inputmode="decimal" value="${m.fee ?? ''}" placeholder="as agreed with the client" autocomplete="off"></label>
      <label>Budget hours<input name="hours" inputmode="decimal" value="${m.hours ?? ''}" autocomplete="off"></label>
      <label>Hourly cost rate, NZD<input name="rate" inputmode="decimal" value="${m.rate ?? ''}" placeholder="${d.settings.rate != null ? `practice: ${nzd(d.settings.rate)}` : 'none'}" autocomplete="off"${ownerRate ? '' : ' disabled'}></label>
      <p class="small span2">${ownerRate ? 'Empty: the practice’s blended rate from Settings is used.' : 'Only an owner sets a project’s own rate.'}</p>
      <fieldset class="wide m-dates"><legend>Target date for each stage to be done</legend>${STAGE_KEYS.map((k) => `<label>${stageNumber(k)}. ${esc(M.stageLabel(k))}<input type="date" name="t_${k}" value="${m.targets[k] ?? ''}"></label>`).join('')}</fieldset>
      <details class="wide m-split"><summary>Fee split by stage, optional</summary><p class="small">How much of the fee each stage earns, as the practice agreed it. Empty: the seven stages count equally.</p>
        <div class="m-dates">${STAGE_KEYS.map((k) => `<label>${stageNumber(k)}. ${esc(M.stageLabel(k))}, %<input name="s_${k}" inputmode="numeric" value="${m.split?.[k] ?? ''}" autocomplete="off"></label>`).join('')}</div></details>
      ${any('fee') ? `<div class="f-act"><button class="btn solid">${icon('check')}<span>Save</span></button></div>` : ''}</form></details>`;

  // -- holds and setting the dial by hand
  const radios = M.HEALTH_KEYS.slice().reverse().map((k) => `<label class="m-radio is-${k}"><input type="radio" name="state" value="${k}" required><span>${stateIcon(STATE_ICON[k])}<b>${esc(M.labelsOf(d.settings.labels)[k])}</b><small>${esc(M.HEALTH[k].meaning)}</small></span></label>`).join('');
  const holds = `<details class="m-set m-hold"${focusing(where, 'm-hold') ? ' open' : ''}><summary>${stateIcon('pause')}<span>Holds and the dial</span></summary><div class="m-holds">
    <div class="mc"><p class="lab">On hold: permission or dig off</p>${m.hold ? `<p>${esc(M.HOLD_KINDS[m.hold.kind])}${m.hold.reason ? `: ${esc(m.hold.reason)}` : ''}</p><p class="small">Held by ${esc(m.hold.by || 'a person')}, ${esc(M.dayShort(m.hold.at))}</p>${any('hold') ? '<button type="button" class="btn" data-m="hold-clear">Take it off hold</button>' : ''}`
      : any('hold') ? `<form class="m-mini" data-m="hold"><label>What it waits on<select name="kind">${Object.entries(M.HOLD_KINDS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label><label>Reason<input name="reason" required maxlength="200" placeholder="Resource consent lodged, waiting on council"></label><button class="btn">Put on hold</button></form>` : '<p class="small">Not on hold.</p>'}</div>
    <div class="mc"><p class="lab">On hold: client payment pending</p>${m.payment ? `<p>${esc(m.payment.reason || 'Flagged')}</p><p class="small">Flagged by ${esc(m.payment.by || 'a person')}, ${esc(M.dayShort(m.payment.at))}</p>${any('hold') ? '<button type="button" class="btn" data-m="pay-clear">Clear the flag</button>' : ''}`
      : any('hold') ? `<form class="m-mini" data-m="pay"><label>Reason<input name="reason" required maxlength="200" placeholder="Stage 2 invoice not paid"></label><button class="btn">Flag payment pending</button></form>` : ''}
      <p class="small">It also comes on by itself while an invoice is past its due day and not paid.</p></div>
    <div class="mc mc-wide"><p class="lab">Set the dial by hand</p>${m.set ? `<p>${stateIcon(STATE_ICON[m.set.state])} <b>${esc(M.labelsOf(d.settings.labels)[m.set.state])}</b>: “${esc(m.set.reason)}”</p><p class="small">Set by ${esc(m.set.by || 'a person')}, ${esc(M.dayShort(m.set.at))}. It stays until someone puts it back.</p>${any('set') ? '<button type="button" class="btn" data-m="set-clear">Back to worked out</button>' : ''}`
      : any('set') ? `<form class="m-mini m-setform" data-m="set"><fieldset><legend class="vh">State</legend><div class="m-radios">${radios}</div></fieldset><label>Reason<input name="reason" required maxlength="200" placeholder="Why the dial says this"></label><button class="btn">Set the dial</button></form>` : '<p class="small">Worked out from the records.</p>'}
      <p class="small">Every change here goes in the project’s activity, with who made it.</p></div></div></details>`;

  el.innerHTML = `<div class="mt">${noteHtml(where)}${d.problem ? `<p class="flash">□ ${esc(d.problem)}</p>` : ''}${ctx.store.shared && role(ctx) === 'viewer' && !isSample(p) ? '<p class="small">You can see everything here and change nothing.</p>' : ''}
    ${take}
    <div class="mt-top">${dialBlock(h, { key: `tab:${p.id}` })}<div class="mt-cards">${feeBar}${feeLeft}${hoursCard}</div></div>
    ${prog}
    ${invoices}${timeSec}${peopleSec}${setup}${holds}
    <p class="starter">Fees, rates, hours and invoices are typed by people here. Everything else on this tab is worked out from them, and says so. It is not advice on fees or tax.</p></div>`;
  wireTab(el, ctx, p, d);
  afterDraw(el, where);
}

/** the stage targets on a line, with today marked */
function programme(b, m, t) {
  const targets = STAGE_KEYS.map((k) => ({ k, d: m.targets[k] ?? '', st: b.stages.find((s) => s.key === k)?.status ?? 'not_started' }));
  const dated = targets.filter((x) => x.d);
  if (!dated.length) return `<section class="ms"><h3 class="m-h">${icon('cal')}<span>Programme</span></h3><p class="m-empty">${icon('dash')}<span>Give the stages target dates (in Fee, budget and programme, below) to see today against them.</span></p></section>`;
  const dayN = (s) => Date.parse(`${s}T00:00:00Z`) / 86400000;
  const startDay = [String(b.project.created_at ?? '').slice(0, 10), ...b.stages.map((s) => String(s.started_at ?? '').slice(0, 10))].filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort()[0] ?? dated[0].d;
  const lo = Math.min(dayN(startDay), dayN(t), ...dated.map((x) => dayN(x.d))), hi = Math.max(dayN(t), ...dated.map((x) => dayN(x.d)));
  const span = Math.max(14, hi - lo), W = narrow() ? 380 : 960, L = 20, R = 24, x = (s) => L + ((dayN(s) - lo) / span) * (W - L - R);
  let prev = startDay;
  const gapMin = narrow() ? 46 : 56, lastX = [-1e9, -1e9]; // where the last date label on each row ended
  const dateLabel = (x1, d) => {
    const row = x1 - lastX[0] >= gapMin ? 0 : x1 - lastX[1] >= gapMin ? 1 : -1;
    if (row < 0) return ''; // no room on either row: the date is in the description and the stage's title
    lastX[row] = x1;
    return `<text class="pg-d" x="${x1.toFixed(1)}" y="${row ? 84 : 68}" text-anchor="middle">${esc(M.dayShort(d))}</text>`;
  };
  const segs = targets.map((tg) => {
    if (!tg.d) return '';
    const x0 = x(prev < tg.d ? prev : tg.d), x1 = x(tg.d), late = tg.st !== 'done' && tg.d < t;
    prev = tg.d;
    const cls = tg.st === 'done' ? 'is-done' : tg.st === 'in_progress' || tg.st === 'awaiting_approval' ? 'is-now' : 'is-todo';
    return `<g class="pg-s ${cls}${late ? ' is-late' : ''}"><title>${esc(`Stage ${stageNumber(tg.k)}, ${M.stageLabel(tg.k)}: target ${M.dayShort(tg.d)}${tg.st === 'done' ? ', done' : late ? ', past its target and not done' : ''}`)}</title>
      <line x1="${x0.toFixed(1)}" x2="${x1.toFixed(1)}" y1="40" y2="40"/><circle cx="${x1.toFixed(1)}" cy="40" r="10"/><text x="${x1.toFixed(1)}" y="44" text-anchor="middle">${stageNumber(tg.k)}</text>
      ${late ? `<path class="pg-warn" d="M${(x1 - 6).toFixed(1)} 22h12l-6-10z"/>` : ''}${dateLabel(x1, tg.d)}</g>`;
  }).join('');
  const tx = x(t), lateN = targets.filter((tg) => tg.d && tg.st !== 'done' && tg.d < t).length, none = targets.filter((tg) => !tg.d).map((tg) => stageNumber(tg.k));
  const label = `Programme: today, ${M.dayShort(t)}, against the stage targets. ${lateN ? `${plural(lateN, 'stage')} past ${lateN === 1 ? 'its' : 'their'} target and not done.` : 'No stage past its target.'}`;
  return `<section class="ms"><h3 class="m-h">${icon('cal')}<span>Programme</span></h3>
    <svg class="pg" viewBox="0 -4 ${W} 96" role="img" aria-label="${esc(label)}"><line class="pg-base" x1="${L}" x2="${W - R}" y1="40" y2="40"/>${segs}
      <g class="pg-today"><line x1="${tx.toFixed(1)}" x2="${tx.toFixed(1)}" y1="14" y2="54"/><text x="${tx.toFixed(1)}" y="8" text-anchor="${tx < 40 ? 'start' : tx > W - 40 ? 'end' : 'middle'}">Today</text></g></svg>
    <ul class="fc-key"><li><i class="k-done"></i>Done</li><li><i class="k-now"></i>In hand</li><li><i class="k-todo"></i>To come</li>${lateN ? `<li>${stateIcon('warn', 'k-ic')}Past its target</li>` : ''}</ul>
    ${none.length ? `<p class="small">No target date yet for stage${none.length === 1 ? '' : 's'} ${none.join(', ')}.</p>` : ''}</section>`;
}

function wireTab(el, ctx, p, d) {
  const where = `tab:${p.id}`;
  const done = async (text, sel = '') => { ui.note = { where, text }; ui.confirm = ''; ui.focus = sel ? { where, sel } : null; bump(); await ctx.redraw(); };
  const fail = async (err) => { ui.note = { where, text: String(err?.message ?? err), error: true }; ui.confirm = ''; await ctx.redraw(); };
  el.addEventListener('submit', async (ev) => {
    const form = ev.target.closest('form[data-m]');
    if (!form) return;
    ev.preventDefault();
    const v = formData(form), kind = form.dataset.m, label = (k) => M.labelsOf(d.settings.labels)[k];
    try {
      if (kind === 'time') {
        const x = M.newTimeEntry({ project_id: p.id, person: v.person, date: v.date, hours: v.hours, stage: v.stage });
        await ctx.store.save('time_entry', x);
        await log(ctx, p.id, 'Time logged', `${x.person}, ${x.hours} hours on ${x.date}${x.stage ? `, ${M.stageLabel(x.stage)}` : ''}`);
        return done(`Logged ${x.hours} hours for ${x.person}.`, 'form[data-m="time"] input[name="hours"]');
      }
      if (kind === 'invoice') {
        const x = M.newInvoice({ project_id: p.id, number: v.number, amount: v.amount, issued: v.issued, due: v.due });
        if (d.invoices.some((i) => String(i.number).toLowerCase() === x.number.toLowerCase())) throw new Error(`The practice already has an invoice numbered ${x.number}.`);
        await ctx.store.save('invoice', x);
        await log(ctx, p.id, 'Invoice added', `${x.number}, ${nzd(x.amount_nzd)}${x.due ? `, due ${x.due}` : ''}`);
        return done(`Invoice ${x.number} added.`, 'form[data-m="invoice"] input[name="number"]');
      }
      if (kind === 'paid' || kind === 'void') {
        const i = d.invoices.find((x) => x.id === form.dataset.id);
        if (!i) throw new Error('That invoice is no longer here.');
        const x = kind === 'paid' ? M.markPaid(i, v.paid) : M.voidInvoice(i, v.reason);
        await ctx.store.save('invoice', x);
        await log(ctx, p.id, kind === 'paid' ? 'Invoice paid' : 'Invoice voided', kind === 'paid' ? `${x.number}, paid ${x.paid}` : `${x.number}: ${x.void_reason}`);
        return done(kind === 'paid' ? `Invoice ${x.number} marked paid.` : `Invoice ${x.number} is void. It stays on record.`);
      }
      if (kind === 'alloc') {
        const x = M.newAllocation({ person: v.person, project_id: p.id, hours_week: v.hours_week, from: v.from, to: v.to });
        await ctx.store.save('allocation', x);
        await log(ctx, p.id, 'Person planned on the project', `${x.person}, ${x.hours_week} hours a week, ${x.from} to ${x.to}`);
        return done(`${x.person} is planned on it.`);
      }
      if (kind === 'setup') {
        const fee = M.parseDollars(v.fee), hours = M.parseHours(v.hours), rate = 'rate' in v ? M.parseDollars(v.rate) : undefined;
        const targets = {}, split = {};
        for (const k of STAGE_KEYS) { if (v[`t_${k}`]) targets[k] = v[`t_${k}`]; const s = M.parsePercent(v[`s_${k}`]); if (s != null) split[k] = s; }
        const old = M.projectMoney(p), change = { fee, hours, targets, split: Object.keys(split).length ? split : null };
        if (rate !== undefined && mayFor(ctx, p)('rate')) change.rate = rate;
        await saveMoney(ctx, p.id, change);
        const said = [fee !== old.fee ? `fee ${fee == null ? 'cleared' : nzd(fee)}` : '', hours !== old.hours ? `budget hours ${hours ?? 'cleared'}` : '', 'rate' in change && change.rate !== old.rate ? `hourly rate ${change.rate == null ? 'cleared' : nzd(change.rate)}` : '',
          JSON.stringify(targets) !== JSON.stringify(old.targets) ? 'stage targets' : '', JSON.stringify(change.split) !== JSON.stringify(old.split) ? 'fee split' : ''].filter(Boolean);
        if (said.length) await log(ctx, p.id, 'Money changed', said.join(', '));
        return done(said.length ? `Saved: ${said.join(', ')}.` : 'Nothing had changed.', 'details.m-setup summary');
      }
      if (kind === 'hold') {
        await saveMoney(ctx, p.id, { hold: stamp(ctx, { kind: v.kind, reason: v.reason }) });
        await log(ctx, p.id, 'Put on hold', `${M.HOLD_KINDS[v.kind]}: ${v.reason}`);
        return done('On hold. The dial says so.', 'details.m-hold summary');
      }
      if (kind === 'pay') {
        await saveMoney(ctx, p.id, { payment: stamp(ctx, { reason: v.reason }) });
        await log(ctx, p.id, 'Flagged: client payment pending', v.reason);
        return done('Flagged: client payment pending.', 'details.m-hold summary');
      }
      if (kind === 'set') {
        if (!M.HEALTH[v.state]) throw new Error('Choose what the dial should say.');
        if (!v.reason) throw new Error('Say why, so the dial can show it.');
        await saveMoney(ctx, p.id, { set: stamp(ctx, { state: v.state, reason: v.reason }) });
        await log(ctx, p.id, 'Dial set by hand', `${label(v.state)}: ${v.reason}`);
        return done(`The dial says ${label(v.state)}, set by hand.`, 'details.m-hold summary');
      }
      if (kind === 'take') {
        const e = d.enquiries.find((x) => x.id === form.dataset.id), f = M.fromEnquiry(e);
        if (!f) throw new Error('That enquiry has no value or hours to use.');
        await saveMoney(ctx, p.id, { ...(f.fee != null ? { fee: f.fee } : {}), ...(f.hours != null ? { hours: f.hours } : {}), from_enquiry: stamp(ctx, { id: e.id }) });
        let moved = 0;
        if (v.move) for (const a of d.allocations.filter((x) => sameId(x.enquiry_id, e.id))) { await ctx.store.save('allocation', { ...a, project_id: p.id, enquiry_id: '' }); moved++; }
        await log(ctx, p.id, 'Figures taken from the won enquiry', `${e.title}: ${[f.fee != null ? `fee ${nzd(f.fee)}` : '', f.hours != null ? `${f.hours} budget hours` : '', moved ? plural(moved, 'allocation') + ' moved' : ''].filter(Boolean).join(', ')}`);
        return done(`Taken on from “${e.title}”.`);
      }
    } catch (err) { return fail(err); }
  });
  el.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button[data-m]');
    if (!b) return;
    const kind = b.dataset.m;
    try {
      if (kind === 'time-remove' || kind === 'alloc-remove') {
        const key = `${kind === 'time-remove' ? 'time' : 'alloc'}:${b.dataset.id}`;
        if (ui.confirm !== key) { ui.confirm = key; b.firstChild.textContent = 'Remove for good'; return; }
        const k = kind === 'time-remove' ? 'time_entry' : 'allocation', row = await ctx.store.get(k, b.dataset.id);
        await ctx.store.remove(k, b.dataset.id);
        await log(ctx, p.id, kind === 'time-remove' ? 'Time removed' : 'Allocation removed', row ? `${row.person}${row.date ? `, ${row.hours} hours on ${row.date}` : `, ${row.from} to ${row.to}`}` : '');
        return done('Removed.');
      }
      if (kind === 'hold-clear' || kind === 'pay-clear' || kind === 'set-clear') {
        const field = { 'hold-clear': 'hold', 'pay-clear': 'payment', 'set-clear': 'set' }[kind];
        await saveMoney(ctx, p.id, { [field]: null });
        await log(ctx, p.id, { hold: 'Taken off hold', payment: 'Payment pending flag cleared', set: 'Dial back to worked out' }[field], '');
        return done({ hold: 'Off hold.', payment: 'Flag cleared.', set: 'The dial is worked out from the records again.' }[field], 'details.m-hold summary');
      }
    } catch (err) { return fail(err); }
  });
}

// ---- Settings: the practice's money ---------------------------------------------------------------------------------------
async function renderSettings(el, ctx) {
  await ensureCss();
  const d = await readAll(ctx), s = d.settings, owner = mayPractice(ctx), shared = !!ctx.store.shared, words = M.labelsOf(s.labels);
  const name = ctx.practice?.name ?? 'the practice';
  const v = (x) => (x == null ? '' : esc(x));
  const team = [...s.team, { id: '', name: '', capacity: null }];
  el.innerHTML = `<section class="panel m-settings" aria-labelledby="ms-h"><h2 id="ms-h">Money</h2>${noteHtml('settings')}
    <p class="small">${shared ? (owner ? `For everyone in ${esc(name)}: they see the dials these drive. Only an owner changes them.` : `Chosen by an owner of ${esc(name)}. Everyone in the practice sees the dials they drive.`) : '■ For this browser only.'} These are the practice’s own figures. assembl does not suggest fees, targets or tax.</p>
    ${d.problem ? `<p class="flash">□ ${esc(d.problem)}</p>` : ''}
    <form class="f m-form" data-m="settings"${owner ? '' : ' inert'}>
      <fieldset class="wide"><legend>Break-even and target</legend><div class="m-grid">
        <div class="m-seg" role="radiogroup" aria-label="The figures are for"><span class="lab">The figures are for</span>${['month', 'year'].map((x) => `<label class="m-pill"><input type="radio" name="period" value="${x}"${s.period === x ? ' checked' : ''}><span>A ${x}</span></label>`).join('')}</div>
        <label>Break-even, NZD<input name="break_even" inputmode="decimal" value="${v(s.break_even)}" autocomplete="off"></label>
        <label>Target from, NZD<input name="target_low" inputmode="decimal" value="${v(s.target_low)}" autocomplete="off"></label>
        <label>Target to, NZD<input name="target_high" inputmode="decimal" value="${v(s.target_high)}" autocomplete="off"></label>
        <div class="m-seg" role="radiogroup" aria-label="Revenue counts"><span class="lab">Revenue counts invoices</span>${[['issued', 'Issued'], ['paid', 'Paid']].map(([x, l]) => `<label class="m-pill"><input type="radio" name="counts" value="${x}"${s.counts === x ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div>
      </div><p class="small">The practice dial shows this month; the forecast goes month by month. A year’s figures are divided by twelve for each month.</p></fieldset>
      <fieldset class="wide"><legend>Time and budget</legend><div class="m-grid">
        <label>Blended hourly cost rate, NZD<input name="rate" inputmode="decimal" value="${v(s.rate)}" autocomplete="off"></label>
        <label>Leeway before over budget, % points<input name="leeway" inputmode="numeric" value="${s.leeway || ''}" placeholder="0" autocomplete="off"></label></div>
        <p class="small">A project can have its own rate. A project counts as over budget when more of its fee is used than its work is done, by more than the leeway.</p></fieldset>
      <fieldset class="wide"><legend>What the dial says</legend><p class="small">Rename the four words to the practice’s own. Their colours and meanings stay.</p><div class="m-labels">
        ${M.HEALTH_KEYS.slice().reverse().map((k) => `<label class="m-lab is-${k}"><span class="m-sw">${stateIcon(STATE_ICON[k])}</span><span class="m-lab-t"><b>${esc(M.HEALTH[k].meaning)}</b><input name="l_${k}" maxlength="24" value="${esc(s.labels[k] ?? '')}" placeholder="${esc(M.HEALTH[k].label)}" aria-label="Word for ${esc(M.HEALTH[k].meaning)}" autocomplete="off"></span></label>`).join('')}</div></fieldset>
      <fieldset class="wide"><legend>Chance an enquiry goes ahead, by stage</legend><div class="m-grid m-four">
        ${M.CHANCE_STAGES.map((k) => `<label>${esc(enquiryStage(k))}, %<input name="c_${k}" inputmode="numeric" value="${s.chances[k] ?? ''}" autocomplete="off"></label>`).join('')}</div>
        <p class="small">Won counts in full and lost never counts. A stage with no chance typed is left out of the forecast.</p></fieldset>
      <fieldset class="wide"><legend>The team</legend><ul class="m-team">${team.map((x, i) => `<li><label>Name<input name="p_name_${i}" value="${esc(x.name)}" maxlength="80" autocomplete="off"${x.name ? '' : ' placeholder="Add a person"'}></label><label>Hours a week<input name="p_cap_${i}" inputmode="decimal" value="${v(x.capacity)}" autocomplete="off"></label><input type="hidden" name="p_id_${i}" value="${esc(x.id)}"></li>`).join('')}</ul>
        <p class="small">Empty a name to take the person off. The capacity chart on the Money screen adds these up.${shared && owner ? ' <button type="button" class="link" data-m="members">Add the practice’s members</button>' : ''}</p></fieldset>
      ${owner ? `<div class="f-act"><button class="btn solid">${icon('check')}<span>Save the money settings</span></button></div>` : ''}
    </form></section>`;
  el.addEventListener('submit', async (ev) => {
    const form = ev.target.closest('form[data-m="settings"]');
    if (!form) return;
    ev.preventDefault();
    const f = formData(form);
    try {
      const team = [];
      for (let i = 0; `p_name_${i}` in f; i++) if (f[`p_name_${i}`]) team.push({ id: f[`p_id_${i}`] || f[`p_name_${i}`], name: f[`p_name_${i}`], capacity: M.parseHours(f[`p_cap_${i}`], { max: 80, what: 'hours a week' }) });
      const next = {
        period: f.period, counts: f.counts, break_even: M.parseDollars(f.break_even), target_low: M.parseDollars(f.target_low), target_high: M.parseDollars(f.target_high),
        rate: M.parseDollars(f.rate), leeway: M.parsePercent(f.leeway) ?? 0,
        labels: Object.fromEntries(M.HEALTH_KEYS.map((k) => [k, f[`l_${k}`] ?? ''])),
        chances: Object.fromEntries(M.CHANCE_STAGES.map((k) => [k, M.parsePercent(f[`c_${k}`])])), team,
      };
      if (next.target_low != null && next.target_high != null && next.target_high < next.target_low) throw new Error('The target’s top is below its bottom.');
      await saveSettings(ctx, next);
      ui.note = { where: 'settings', text: shared ? `Saved for everyone in ${name}.` : 'Saved in this browser.' };
      ui.focus = { where: 'settings', sel: '.m-note' };
    } catch (err) { ui.note = { where: 'settings', text: String(err?.message ?? err), error: true }; }
    if (ui.note?.error) ui.focus = { where: 'settings', sel: '.m-note' };
    await ctx.redraw();
  });
  el.addEventListener('click', async (ev) => {
    if (!ev.target.closest('[data-m="members"]')) return;
    try {
      const people = await ctx.store.current.practicePeople();
      const have = new Set(s.team.map((x) => x.name.toLowerCase()));
      const add = people.map((x) => String(x.name || x.email || '').trim()).filter((n) => n && !have.has(n.toLowerCase()));
      await saveSettings(ctx, { ...d.raw, ...s, team: [...s.team, ...add.map((n) => ({ id: n, name: n, capacity: null }))] });
      ui.note = { where: 'settings', text: add.length ? `Added ${plural(add.length, 'person', 'people')}. Type each one’s hours a week.` : 'Everyone in the practice is already on the team.' };
    } catch (err) { ui.note = { where: 'settings', text: String(err?.message ?? err), error: true }; }
    await ctx.redraw();
  });
  afterDraw(el, 'settings');
}

// ---- the Money screen: the pipeline, the team's weeks, allocations, and the enquiries' months ------------------------------------
async function renderScreen(el, ctx) {
  await ensureCss();
  const d = await readAll(ctx), t = today();
  let projects = [];
  try { projects = await ctx.store.list('project'); } catch { projects = []; }
  const weeks = M.weeksFrom(t, 12), load = M.weekLoad(d.allocations, weeks), team = d.settings.team, cap = M.teamCapacity(team);
  const nameOf = (id) => projects.find((p) => sameId(p.id, id))?.name ?? d.enquiries.find((e) => sameId(e.id, id))?.title ?? 'Something not here';
  const isEnquiry = (id) => d.enquiries.some((e) => sameId(e.id, id)) && !projects.some((p) => sameId(p.id, id));
  const mayAlloc = M.can('allocation', { shared: !!ctx.store.shared, role: role(ctx) }), mayEnq = M.can('enquiry', { shared: !!ctx.store.shared, role: role(ctx) });
  const live = d.enquiries.filter((e) => !e.archived && (M.OPEN.includes(e.stage) || e.stage === 'won')).sort((a, b) => (b.stage === 'won') - (a.stage === 'won') || (Number(b.value_nzd) || 0) - (Number(a.value_nzd) || 0));
  const allocs = [...d.allocations].sort((a, b) => String(a.person).localeCompare(String(b.person)) || String(a.from).localeCompare(String(b.from)));
  const targets = [...projects.filter((p) => !isSample(p) || !ctx.store.shared).map((p) => [p.id, p.name, 'Project']), ...d.enquiries.filter((e) => !e.archived && M.OPEN.includes(e.stage)).map((e) => [e.id, e.title, 'Enquiry'])];
  el.innerHTML = `<div class="m-screen"><section class="hero"><p class="label">Money and people</p><h1>The practice’s <span class="accent">month</span>, pipeline and weeks.</h1></section>
    ${noteHtml('screen')}
    ${practicePanel(d, ctx, { full: true })}
    <section class="pm" aria-labelledby="cap-h"><div class="pm-head"><h2 id="cap-h" class="m-h">${icon('people')}<span>The next twelve weeks</span></h2></div>
      ${capacityChart(load, cap, nameOf, isEnquiry)}
      ${team.length ? peopleGrid(load, team) : `<p class="small">${mayPractice(ctx) ? '<a href="#/settings">Add the team and their hours a week</a> to draw the capacity line.' : 'An owner adds the team in Settings.'}</p>`}</section>
    <section class="pm" aria-labelledby="al-h"><div class="pm-head"><h2 id="al-h" class="m-h">${icon('plan')}<span>Who is planned on what</span></h2></div>
      ${allocs.length ? `<ul class="m-list">${allocs.map((a) => `<li>${avatar(a.person)}<span><b>${esc(a.person)}</b> · ${a.project_id ? `<a href="${projectHash(a.project_id, 'money')}">${esc(nameOf(a.project_id))}</a>` : `<a href="#/crm/e/${encodeURIComponent(a.enquiry_id)}">${esc(nameOf(a.enquiry_id))}</a> <span class="tag">Enquiry</span>`} · ${esc(M.dayShort(a.from))} to ${esc(M.dayShort(a.to))}</span><span class="m-num">${esc(a.hours_week)} h a week</span>
        ${mayAlloc ? `<button type="button" class="link" data-m="alloc-remove" data-id="${esc(a.id)}">${ui.confirm === `alloc:${a.id}` ? 'Remove for good' : 'Remove'}<span class="vh"> ${esc(a.person)}</span></button>` : ''}</li>`).join('')}</ul>` : `<p class="m-empty">${icon('dash')}<span>Nobody is planned on anything yet.</span></p>`}
      ${mayAlloc && targets.length ? `<details class="m-add"><summary>${icon('plus')}<span>Plan someone</span></summary><form class="f m-form" data-m="alloc">
        <label>Who<input name="person" list="m-team-all" required maxlength="80" autocomplete="off"></label><label class="span2">On<select name="target" required>${targets.map(([id, n, k]) => `<option value="${k === 'Project' ? 'p' : 'e'}:${esc(id)}">${esc(n)} (${k.toLowerCase()})</option>`).join('')}</select></label>
        <label>Hours a week<input name="hours_week" required inputmode="decimal" autocomplete="off"></label><label>From<input type="date" name="from" value="${t}" required></label><label>To<input type="date" name="to" required></label>
        <div class="f-act"><button class="btn solid">${icon('check')}<span>Plan it</span></button></div></form><datalist id="m-team-all">${team.map((x) => `<option value="${esc(x.name)}"></option>`).join('')}</datalist>
        <p class="small">Planning someone on an enquiry shows the work that may come. When the enquiry is won and becomes a project, the project’s Money tab offers to move it across.</p></details>` : ''}</section>
    <section class="pm" aria-labelledby="eq-h"><div class="pm-head"><h2 id="eq-h" class="m-h">${icon('cal')}<span>When each enquiry would run</span></h2><a class="link" href="#/crm">Clients</a></div>
      <p class="small">The forecast spreads each enquiry’s value over the months it would run. Type when it would start, for how many months, and the hours it would take. The value is the one typed on the enquiry.</p>
      ${live.length ? `<ul class="m-enq">${live.map((e) => { const f = M.inForecast(e, d.settings.chances); return `<li><form class="m-enq-f" data-m="enq" data-id="${esc(e.id)}"${mayEnq ? '' : ' inert'}>
        <p class="m-enq-t"><a href="#/crm/e/${encodeURIComponent(e.id)}">${esc(e.title)}</a> <span class="tag">${esc(enquiryStage(e.stage))}</span> ${e.value_nzd != null ? `<span class="m-num">${nzd(e.value_nzd)}</span>` : '<span class="small">no value typed</span>'}</p>
        <label>Starts<input type="month" name="start_month" value="${esc(e.start_month ?? '')}" placeholder="2027-02"></label><label>Months<input name="months" inputmode="numeric" value="${esc(e.months ?? '')}" autocomplete="off"></label><label>Hours<input name="hours" inputmode="decimal" value="${esc(e.hours ?? '')}" autocomplete="off"></label>
        ${mayEnq ? '<button class="btn">Save</button>' : ''}<p class="small m-enq-s">${f.value ? `${stateIcon(f.won ? 'tick' : 'dot')} In the forecast${f.won ? ' in full' : `, at ${Math.round(f.w * 100)}%`}.` : `${stateIcon('none')} Not in the forecast: ${esc(f.why)}.`}</p></form></li>`; }).join('')}</ul>`
        : `<p class="m-empty">${icon('dash')}<span>No open or won enquiries. <a href="#/crm">Clients</a></span></p>`}</section>
  </div>`;
  el.addEventListener('submit', async (ev) => {
    const form = ev.target.closest('form[data-m]');
    if (!form) return;
    ev.preventDefault();
    const v = formData(form);
    try {
      if (form.dataset.m === 'alloc') {
        const [k, id] = [v.target.slice(0, 1), v.target.slice(2)];
        const a = M.newAllocation({ person: v.person, project_id: k === 'p' ? id : '', enquiry_id: k === 'e' ? id : '', hours_week: v.hours_week, from: v.from, to: v.to });
        await ctx.store.save('allocation', a);
        if (a.project_id) await log(ctx, a.project_id, 'Person planned on the project', `${a.person}, ${a.hours_week} hours a week, ${a.from} to ${a.to}`);
        ui.note = { where: 'screen', text: `${a.person} is planned on ${nameOf(id)}.` };
      }
      if (form.dataset.m === 'enq') {
        const e = d.enquiries.find((x) => x.id === form.dataset.id);
        if (!e) throw new Error('That enquiry is no longer here.');
        const months = v.months ? Math.round(M.parseHours(v.months, { max: 120, what: 'months' })) : null;
        await ctx.store.save('enquiry', { ...e, start_month: M.parseMonth(v.start_month) ?? '', months: months ?? null, hours: M.parseHours(v.hours) ?? null });
        ui.note = { where: 'screen', text: `Saved when “${e.title}” would run.` };
        ui.focus = { where: 'screen', sel: `form[data-id="${CSS.escape(e.id)}"] button` };
      }
      bump();
    } catch (err) { ui.note = { where: 'screen', text: String(err?.message ?? err), error: true }; }
    await ctx.redraw();
  });
  el.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button[data-m="alloc-remove"]');
    if (!b) return;
    const key = `alloc:${b.dataset.id}`;
    if (ui.confirm !== key) { ui.confirm = key; b.firstChild.textContent = 'Remove for good'; return; }
    try {
      const row = await ctx.store.get('allocation', b.dataset.id);
      await ctx.store.remove('allocation', b.dataset.id);
      if (row?.project_id) await log(ctx, row.project_id, 'Allocation removed', `${row.person}, ${row.from} to ${row.to}`);
      ui.note = { where: 'screen', text: 'Removed.' }; ui.confirm = ''; bump();
    } catch (err) { ui.note = { where: 'screen', text: String(err?.message ?? err), error: true }; }
    await ctx.redraw();
  });
  afterDraw(el, 'screen');
}

/** twelve weeks of planned hours, stacked by what they are on, against the team's hours a week */
function capacityChart(load, cap, nameOf, isEnquiry) {
  const n = narrow(), W = n ? 380 : 1040, H = 250, top = 20, base = 206, L = 4, R = n ? 62 : 76, slot = (W - L - R) / load.length, bw = slot * 0.62; // the label sits in the right margin
  const max = Math.max(1, cap ?? 0, ...load.map((w) => w.total)) * 1.12, y = (v) => base - (v / max) * (base - top);
  const keys = [...new Set(load.flatMap((w) => Object.keys(w.by)))];
  const totals = Object.fromEntries(keys.map((k) => [k, load.reduce((a, w) => a + (w.by[k] ?? 0), 0)]));
  keys.sort((a, b) => isEnquiry(a) - isEnquiry(b) || totals[b] - totals[a]);
  const shade = (i, k) => (isEnquiry(k) ? 'cp-enq' : `cp-p${i % 4}`);
  const bars = load.map((w, i) => {
    let acc = 0;
    const x = L + slot * i + (slot - bw) / 2, overCap = cap != null && w.total > cap;
    const segs = keys.map((k, j) => {
      const h = w.by[k] ?? 0;
      if (!h) return '';
      const y1 = y(acc + h), hh = y(acc) - y1;
      acc += h;
      return `<rect class="cp ${shade(j, k)}" x="${x.toFixed(1)}" y="${y1.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, hh - 1).toFixed(1)}"><title>${esc(`${nameOf(k)}: ${h} hours, week of ${M.dayShort(w.week)}`)}</title></rect>`;
    }).join('');
    const over = overCap ? `<rect class="cp-over" x="${x.toFixed(1)}" y="${y(w.total).toFixed(1)}" width="${bw.toFixed(1)}" height="${(y(cap) - y(w.total)).toFixed(1)}"/><g class="fc-flag cp-flag" transform="translate(${(x + bw / 2 - 9).toFixed(1)} ${(y(w.total) - 22).toFixed(1)})"><path d="M9 2 1.5 15h15z" fill="none" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 7v3.5M9 12.6v.2" stroke-width="1.8" stroke-linecap="round"/></g>` : '';
    const tick = !n || i % 2 === 0 ? `<text class="fc-x" x="${(x + bw / 2).toFixed(1)}" y="${base + 16}" text-anchor="middle">${esc(M.dayShort(w.week))}</text>` : '';
    return `<g>${segs}${over}${tick}</g>`;
  }).join('');
  const overN = cap == null ? 0 : load.filter((w) => w.total > cap).length;
  const label = `Planned hours each week for twelve weeks${cap != null ? ` against the team’s ${cap} hours a week. ${overN ? `${plural(overN, 'week')} over capacity.` : 'No week over capacity.'}` : '. No team capacity typed yet.'}`;
  return `<svg class="fc-svg cap-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><defs><pattern id="cp-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" class="fc-hatch-bg"/><line x1="0" y1="0" x2="0" y2="6" class="fc-hatch-ln"/></pattern></defs>
      <line class="fc-base" x1="${L}" x2="${W - R}" y1="${base}" y2="${base}"/>${bars}
      ${cap != null ? `<line class="fc-be cap-line" x1="${L}" x2="${W - R}" y1="${y(cap)}" y2="${y(cap)}"/><text class="fc-t fc-bet" x="${W - R + 8}" y="${y(cap) + 4}">capacity</text>` : ''}</svg>
    <ul class="fc-key">${keys.slice(0, 8).map((k, j) => `<li><i class="k-cp ${shade(j, k)}"></i>${esc(nameOf(k))}${isEnquiry(k) ? ' (enquiry)' : ''}</li>`).join('')}${cap != null ? '<li><i class="k-be"></i>Capacity</li>' : ''}${overN ? `<li>${stateIcon('warn', 'k-ic')}Over capacity</li>` : ''}</ul>
    <details class="m-fig"><summary>The figures</summary><table class="m-table"><thead><tr><th>Week of</th><th>Planned</th>${cap != null ? '<th>Capacity</th><th>Free</th>' : ''}</tr></thead><tbody>${load.map((w) => `<tr><th>${esc(M.dayShort(w.week))}</th><td>${hrs(w.total)}</td>${cap != null ? `<td>${hrs(cap)}</td><td>${w.total > cap ? `over by ${hrs(w.total - cap)}` : hrs(cap - w.total)}</td>` : ''}</tr>`).join('')}</tbody></table>
      <p class="small">Planned hours are the allocations typed for each person; capacity is each person’s hours a week, typed in Settings.</p></details>`;
}
/** one row a person: how full each of the twelve weeks is */
function peopleGrid(load, team) {
  return `<p class="lab pgrid-l">Each person’s weeks, how full</p><div class="pgrid" role="table" aria-label="How full each person’s weeks are"><div role="row" class="pgrid-r pgrid-h"><span role="columnheader">Person</span>${load.map((w) => `<span role="columnheader">${esc(M.dayShort(w.week))}</span>`).join('')}</div>
    ${team.map((x) => `<div role="row" class="pgrid-r"><span role="rowheader">${avatar(x.name)}${esc(x.name)}</span>${load.map((w) => { const h = w.people[x.name] ?? 0, c = x.capacity, k = c ? h / c : h ? 1 : 0, over = c != null && h > c; return `<span role="cell" class="pc${over ? ' is-over' : ''}" style="--k:${Math.min(1, k).toFixed(2)}" title="${esc(`${x.name}, week of ${M.dayShort(w.week)}: ${h} of ${c ?? '?'} hours`)}"><span class="vh">${over ? 'over' : `${Math.round(k * 100)}%`}</span></span>`; }).join('')}</div>`).join('')}</div>`;
}

registerWall({ id: 'money', order: 10, top: renderWallTop, tiles: renderTiles });
registerProjectHead({ id: 'money', order: 10, render: renderHead });
registerProjectTab({ id: 'money', label: 'Money', icon: TAB_ICON, order: 10, render: renderTab });
registerSettings({ id: 'money', title: 'Money', order: 10, render: renderSettings });
registerRoute('money', { title: 'Money and people', render: renderScreen });
registerNav({ id: 'money', label: 'Money', hash: '#/money', order: 30, icon: NAV_ICON });

/** for tests */
export const _internals = { practicePanel, forecastChart, programme, capacityChart, dialBlock, bump };
