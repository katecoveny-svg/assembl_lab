// "Found work" on the Clients screen: a strip of cards above the pipeline board. The workspace looks at public tender notices when the
// screen opens (once a day, kept in this browser), ranks them against what the practice said to look for, and a person adds the good
// ones to the pipeline. Nothing is contacted, registered for, sent or submitted, and nothing is added without a press.
//
// crm.js draws this inside its board: it asks createHunt(...) for html(), passes it clicks and submits, and redraws when asked.
// The rules are in hunt-model.js; the feed is /api/live/?feeds=hunt (api/_feeds/hunt.js).
import { parseLens, rankKbRows } from './hunt-rank.js';
import { clock, dayName, shortDay } from './crm-model.js';
import {
  REGIONS, SECTORS, SOURCES, SHOWN_MAX, SETTING, emptyHunt, cleanHunt, huntIsEmpty, huntQuery, sourcesOn, readAnswer, cleanSignal, fitWord, fitSteps, daysLeft, buyerInitials,
  addedAs, enquiryFromSignal, cleanDismissed, dismiss, restore, scopeOf, cacheFresh,
} from './hunt-model.js';

export const FEED = '/api/live/';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ---- the stylesheet (loaded with the page's own custom properties; nothing here sets a colour of its own) -----------------------------
export const CSS_VERSION = '1';
let cssReady = null;
export function ensureHuntCss() {
  if (typeof document === 'undefined') return Promise.resolve();
  if (cssReady) return cssReady;
  const href = new URL(`../hunt.css?v=${CSS_VERSION}`, import.meta.url).href;
  const existing = [...document.querySelectorAll('link[rel="stylesheet"]')].find((l) => l.dataset.hunt === '1');
  const link = existing ?? Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
  link.dataset.hunt = '1';
  cssReady = new Promise((resolve) => {
    if (existing && existing.sheet) return resolve();
    link.addEventListener('load', () => resolve(), { once: true }); link.addEventListener('error', () => resolve(), { once: true });
    setTimeout(resolve, 2500);
    if (!existing) document.head.append(link);
  });
  return cssReady;
}

// ---- line icons: stroke 1.5, currentColor, never emoji ------------------------------------------------------------------------------
const P = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  out: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  sliders: '<path d="M4 7h9m4 0h3M4 17h3m4 0h9M13 4.5v5M7 14.5v5"/>',
  refresh: '<path d="M19.5 12a7.500 7.500 0 1 1-2.200-5.300M19.500 4.500v4h-4"/>',
  alert: '<path d="M12 4 3 19.500h18L12 4Z"/><path d="M12 10v4.500M12 17v.3"/>',
  clock: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>',
  pin: '<path d="M12 21s6.500-5.800 6.500-11a6.500 6.500 0 0 0-13 0c0 5.200 6.500 11 6.500 11Z"/><circle cx="12" cy="10" r="2.300"/>',
  eye: '<path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12Z"/><circle cx="12" cy="12" r="2.800"/>',
  send: '<path d="M4 12 20 4l-4 16-4.500-6.500z"/>',
};
const icon = (name, cls = '') => `<svg class="hunt-i ${cls}" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] ?? ''}</svg>`;

// ---- a countdown ring and a fit meter: pictures first, with the words beside them --------------------------------------------------------
const R = 17, C = +(2 * Math.PI * R).toFixed(2);
/** the closing day as a ring: full at 30 days or more, draining to nothing on the day. A notice with no closing day gets a dashed ring. */
export function ringHtml(days) {
  if (days == null) return `<span class="hunt-ring is-none" title="The notice states no closing date"><svg viewBox="0 0 44 44" aria-hidden="true" focusable="false"><circle class="track dashed" cx="22" cy="22" r="${R}"/></svg><span class="hunt-ring-n">–</span><span class="vh">No closing date stated</span></span>`;
  const left = Math.max(0, Math.min(1, days / 30)), tone = days <= 3 ? ' is-soon' : days <= 10 ? ' is-near' : '';
  const label = days <= 0 ? 'Closes today' : days === 1 ? 'Closes tomorrow' : `Closes in ${days} days`;
  return `<span class="hunt-ring${tone}" title="${esc(label)}"><svg viewBox="0 0 44 44" aria-hidden="true" focusable="false"><circle class="track" cx="22" cy="22" r="${R}"/><circle class="arc" cx="22" cy="22" r="${R}" stroke-dasharray="${(C * left).toFixed(2)} ${C}" transform="rotate(-90 22 22)"/></svg><span class="hunt-ring-n" aria-hidden="true">${days <= 0 ? 'Today' : days}</span><span class="hunt-ring-u" aria-hidden="true">${days <= 0 ? '' : days === 1 ? 'day' : 'days'}</span><span class="vh">${esc(label)}</span></span>`;
}
export function fitHtml(fit) {
  const n = fitSteps(fit);
  return `<span class="hunt-fit" title="${esc(fitWord(fit))}: ${fit} out of 100"><span class="hunt-meter" role="img" aria-label="${esc(fitWord(fit))}, ${fit} out of 100">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span><span class="hunt-fit-w">${esc(fitWord(fit))}</span></span>`;
}

const SECTOR_NAME = Object.fromEntries(SECTORS);

/**
 * The hunt for one Clients screen.
 *   ctx      the page's ctx: { store, account, practice, me, navigate }
 *   opts     { enquiries(): the current enquiries, readOnly, redraw(): draw the screen again, added(text): an enquiry was made, fetch, now }
 */
export function createHunt(ctx, { enquiries = () => [], readOnly = false, redraw = () => {}, added = async () => {}, fetch: fetchImpl = (...a) => globalThis.fetch(...a), now = () => new Date() } = {}) {
  const scope = scopeOf(ctx.practice);
  const canEdit = !readOnly && (!ctx.practice || ctx.practice.role === 'owner');
  const S = { phase: 'idle', settings: emptyHunt(), answer: null, older: null, error: '', dismissed: {}, showHidden: false, panel: false, flash: null, busy: new Set(), announce: '' };
  let gone = false, run = 0;
  const draw = () => { if (!gone) redraw(); };

  // ---- kept things: settings, the day's answer, "Not for us" -----------------------------------------------------------------------------
  async function loadSettings() {
    let raw = null;
    try { raw = ctx.practice && ctx.account?.hunt ? await ctx.account.hunt() : (await ctx.store.get('setting', SETTING.hunt))?.value ?? null; } catch { raw = null; }
    try { S.settings = cleanHunt(raw); } catch { S.settings = emptyHunt(); }
  }
  async function saveSettings(raw) {
    const h = cleanHunt(raw);
    if (ctx.practice) await ctx.account.setHunt(h); else await ctx.store.save('setting', { id: SETTING.hunt, value: h });
    S.settings = h;
    return h;
  }
  const readKept = async (id) => { try { return (await ctx.store.get('setting', id))?.value ?? null; } catch { return null; } };
  const writeKept = async (id, value) => { try { await ctx.store.save('setting', { id, value }); } catch { /* the page works without its memory: the next visit looks again */ } };

  // ---- looking ----------------------------------------------------------------------------------------------------------------------------
  /** the live feed: one call, to the lab's own address */
  async function readFeed(query) {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null, timer = ctl ? setTimeout(() => ctl.abort(), 40000) : null;
    let res;
    try { res = await fetchImpl(`${FEED}?${query}`, { headers: { accept: 'application/json' }, signal: ctl?.signal }); }
    catch (e) { throw new Error(e?.name === 'AbortError' ? 'The tender notices took too long to answer. Try again in a minute.' : 'The tender notices could not be reached. Check the connection and try again.'); }
    finally { if (timer) clearTimeout(timer); }
    if (!res.ok) throw new Error(`The tender notices are not answering just now (${res.status}). Try again in a few minutes.`);
    return readAnswer(await res.json());
  }
  /** the notices the radar already collected (members only, public fields), scored here against this practice's words */
  async function readRadar() {
    const rows = await ctx.account.huntSignals();
    const lens = parseLens({ keywords: S.settings.keywords.join(','), regions: S.settings.regions.join(','), sectors: S.settings.sectors.join(','), min: S.settings.min, max: S.settings.max });
    const signals = rankKbRows(rows, lens, now()).map(cleanSignal).filter(Boolean);
    return { signals, considered: Array.isArray(rows) ? rows.length : 0, fetchedAt: now().toISOString() };
  }
  /** both sources in one answer: the same notice from both shows once (the feed's copy, which is read live); one source failing leaves the other's findings in */
  function mergeAnswers(radar, feed, radarOn, getsOn) {
    const sources = [], byId = new Map(); let considered = 0, fetchedAt = now().toISOString();
    if (feed.status === 'fulfilled' && feed.value) { feed.value.signals.forEach((s) => byId.set(s.id, s)); sources.push(...feed.value.sources.filter((x) => x.id !== 'radar')); considered += feed.value.considered; fetchedAt = feed.value.fetchedAt; }
    else if (getsOn) sources.push({ id: 'gets', name: 'GETS', ok: false, error: String(feed.reason?.message ?? 'GETS did not answer just now.') });
    if (radar.status === 'fulfilled' && radar.value) { radar.value.signals.forEach((s) => { if (!byId.has(s.id)) byId.set(s.id, s); }); sources.push({ id: 'radar', name: 'Radar', ok: true, error: '' }); considered += radar.value.considered; }
    else if (radarOn) sources.push({ id: 'radar', name: 'Radar', ok: false, error: 'The radar’s notices could not be read just now. Try again in a few minutes.' });
    if (!sources.some((x) => x.ok)) throw new Error(sources.map((x) => x.error).join(' ') || 'Nothing could be looked at. Try again in a few minutes.');
    const signals = [...byId.values()].sort((a, b) => b.fit - a.fit || (a.closesDay || '9').localeCompare(b.closesDay || '9')).slice(0, 40);
    return { signals, sources, needsLens: false, considered, fetchedAt };
  }
  /** Look at the notices: the day's kept answer when there is one for these settings, otherwise the live feed. force = the person pressed "Look again". */
  async function look({ force = false } = {}) {
    const mine = ++run;
    if (huntIsEmpty(S.settings) || !sourcesOn(S.settings).length) { S.phase = 'ready'; S.answer = null; S.error = ''; return draw(); }
    const on = sourcesOn(S.settings), radarOn = on.includes('radar') && !!ctx.practice && typeof ctx.account?.huntSignals === 'function', getsOn = on.includes('gets');
    if (!radarOn && !getsOn) { S.phase = 'ready'; S.answer = null; S.error = ''; return draw(); }
    const query = huntQuery(S.settings) + (radarOn ? '&radar=1' : ''), kept = await readKept(SETTING.cache(scope));
    if (!force && cacheFresh(kept, query, now())) { S.answer = kept.answer; S.older = null; S.phase = 'ready'; S.error = ''; return draw(); }
    S.older = kept && kept.query === query && kept.answer ? { answer: kept.answer, day: kept.day } : null;
    S.phase = 'loading'; S.error = ''; draw();
    try {
      const [fromRadar, fromFeed] = await Promise.allSettled([radarOn ? readRadar() : Promise.resolve(null), getsOn ? readFeed(huntQuery(S.settings)) : Promise.resolve(null)]);
      if (mine !== run) return;
      const answer = mergeAnswers(fromRadar, fromFeed, radarOn, getsOn);
      S.answer = answer; S.older = null; S.phase = 'ready';
      await writeKept(SETTING.cache(scope), { query, day: dayOf(now()), answer });
      S.announce = answer.signals.length ? `${plural(answer.signals.length, 'finding')} found.` : 'Nothing found that fits.';
    } catch (e) {
      if (mine !== run) return;
      S.phase = 'error'; S.error = String(e?.message ?? e);
      S.answer = null;
    }
    draw();
  }
  const dayOf = (d) => { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

  async function start() {
    ensureHuntCss();
    await loadSettings();
    S.dismissed = cleanDismissed(await readKept(SETTING.dismissed(scope)), now());
    await look();
  }

  // ---- the three things a person can do: add, "Not for us", change what to look for -----------------------------------------------------------
  const signals = () => S.answer?.signals ?? S.older?.answer?.signals ?? [];
  async function add(id) {
    const s = signals().find((x) => x.id === id);
    if (!s || readOnly || S.busy.has(id)) return null;
    if (addedAs(s, enquiries())) return null; // already in the pipeline: nothing is made twice
    S.busy.add(id); draw();
    try {
      const { enquiry, activity } = enquiryFromSignal(s, { now: now(), who: String(ctx.me ?? '').trim() });
      await ctx.store.save('enquiry', enquiry);
      try { await ctx.store.save('crm_activity', activity); } catch { /* the enquiry is saved; its first history line can be written again by hand */ }
      S.busy.delete(id);
      await added(`Added “${enquiry.title}” to the pipeline. Pick who takes the next step.`);
      return enquiry;
    } catch (err) {
      S.busy.delete(id); S.flash = { error: true, text: String(err?.message ?? err) }; draw();
      return null;
    }
  }
  async function notForUs(id) {
    const s = signals().find((x) => x.id === id);
    if (!s || readOnly) return;
    S.dismissed = dismiss(S.dismissed, s, now());
    await writeKept(SETTING.dismissed(scope), S.dismissed);
    S.announce = 'Hidden. It will not come back.'; draw();
  }
  async function bringBack(id) {
    S.dismissed = restore(S.dismissed, id, now());
    await writeKept(SETTING.dismissed(scope), S.dismissed);
    draw();
  }

  // ---- drawing --------------------------------------------------------------------------------------------------------------------------------
  const visible = () => signals().filter((s) => !S.dismissed[s.id]);
  const hidden = () => signals().filter((s) => S.dismissed[s.id]);

  function cardHtml(s) {
    const days = daysLeft(s, now()), made = addedAs(s, enquiries()), busy = S.busy.has(s.id);
    const why = s.reasons.length ? `<details class="hunt-why"><summary>Why this</summary><ul>${s.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></details>` : '';
    const acts = readOnly ? '' : made
      ? `<div class="hunt-acts"><span class="hunt-added">${icon('check')}<span>Added to the pipeline</span></span><a class="hunt-link" href="#/crm/e/${encodeURIComponent(made.id)}">Open the enquiry</a></div>`
      : `<div class="hunt-acts"><button type="button" class="hunt-btn solid" data-hunt="add" data-id="${esc(s.id)}" aria-label="Add ${esc(s.title)} to the pipeline"${busy ? ' disabled' : ''}>${icon('plus')}<span>${busy ? 'Adding…' : 'Add to pipeline'}</span></button><button type="button" class="hunt-link" data-hunt="no" data-id="${esc(s.id)}" aria-label="Not for us: hide ${esc(s.title)}">Not for us</button></div>`;
    return `<li class="hunt-card${made ? ' is-added' : ''}" data-id="${esc(s.id)}">
      <div class="hunt-top"><span class="hunt-av" aria-hidden="true">${esc(buyerInitials(s.buyer))}</span><span class="hunt-buyer">${esc(s.buyer || 'Buyer not stated')}</span>${ringHtml(days)}</div>
      <a class="hunt-title" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(s.title)}</span>${icon('out', 'hunt-i-s')}<span class="vh"> (opens the notice on ${esc(s.sourceName)})</span></a>
      <div class="hunt-meta">${s.region ? `<span class="hunt-chip">${icon('pin', 'hunt-i-s')}<span>${esc(s.region)}</span></span>` : ''}<span class="hunt-chip is-src"><span>${esc(s.sourceName)}</span></span>${s.closesDay ? `<span class="hunt-chip">${icon('clock', 'hunt-i-s')}<span>${esc(shortDay(s.closesDay, now()))}</span></span>` : ''}</div>
      ${fitHtml(s.fit)}
      ${why}
      ${acts}
    </li>`;
  }
  const ghost = () => `<li class="hunt-card is-ghost" aria-hidden="true"><div class="hunt-top"><span class="hunt-av"></span><span class="hunt-bar w60"></span><span class="hunt-ring is-none"><svg viewBox="0 0 44 44"><circle class="track dashed" cx="22" cy="22" r="${R}"/></svg></span></div><span class="hunt-bar w90"></span><span class="hunt-bar w70"></span><div class="hunt-meta"><span class="hunt-pillbar"></span><span class="hunt-pillbar"></span></div><span class="hunt-meter"><i></i><i></i><i></i><i></i><i></i></span></li>`;

  const lookedAt = () => {
    const a = S.answer ?? null;
    if (a) { const d = new Date(a.fetchedAt), same = dayOf(d) === dayOf(now()); return `Looked at ${clock(d)}${same ? ' today' : ` on ${dayName(d)}`}`; }
    if (S.older) return `Showing what was found on ${dayName(S.older.day)}`;
    return '';
  };

  function settingsHtml() {
    const h = S.settings, off = canEdit ? '' : ' disabled';
    const chip = (name, value, label, on) => `<label class="hunt-opt"><input type="checkbox" name="${name}" value="${esc(value)}"${on ? ' checked' : ''}${off}><span>${esc(label)}</span></label>`;
    const who = ctx.practice ? `${canEdit ? 'Saved for everyone in' : 'Set by an owner of'} ${esc(ctx.practice.name ?? 'the practice')}.` : 'Saved in this browser only.';
    return `<form class="hunt-panel" data-hunt-form="settings" aria-label="What to look for" novalidate>
      <label class="hunt-f wide"><span>Words to look for</span><input name="keywords" type="text" value="${esc(h.keywords.join(', '))}" placeholder="library, school, marae, refurbishment" autocomplete="off"${off}><small>Separate them with commas. A notice must be about buildings and mention one of these, or be in a sector below.</small></label>
      <fieldset class="hunt-f wide"><legend>Sectors</legend><div class="hunt-opts">${SECTORS.map(([k, l]) => chip('sectors', k, l, h.sectors.includes(k))).join('')}</div></fieldset>
      <fieldset class="hunt-f wide"><legend>Regions <small>(none ticked means anywhere)</small></legend><div class="hunt-opts">${REGIONS.map((r) => chip('regions', r, r, h.regions.includes(r))).join('')}</div></fieldset>
      <div class="hunt-f"><span class="hunt-lab">Usual value, NZD</span><div class="hunt-range"><label><span class="vh">From</span><input name="min" inputmode="numeric" placeholder="from 50000" value="${h.min ?? ''}" autocomplete="off"${off}></label><span aria-hidden="true">to</span><label><span class="vh">To</span><input name="max" inputmode="numeric" placeholder="to 2000000" value="${h.max ?? ''}" autocomplete="off"${off}></label></div><small>Used only when a notice states its own value, which most do not.</small></div>
      <fieldset class="hunt-f"><legend>Where to look</legend>${SOURCES.map((s) => `<label class="hunt-opt wide"><input type="checkbox" name="sources" value="${esc(s.id)}"${h.sources[s.id] !== false ? ' checked' : ''}${off}><span><strong>${esc(s.name)}</strong> ${esc(s.says)} <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.long)}</a></span></label>`).join('')}</fieldset>
      <p class="hunt-note">${icon('send')}<span>${canEdit ? 'Nothing is looked up until you have set a word or a sector.' : 'Only an owner can change this.'} ${who}</span></p>
      <div class="hunt-acts">${canEdit ? `<button type="submit" class="hunt-btn solid">${icon('check')}<span>Save and look</span></button>` : ''}<button type="button" class="hunt-btn" data-hunt="close-settings">${canEdit ? 'Cancel' : 'Close'}</button></div>
    </form>`;
  }

  function bodyHtml() {
    const sourcesNote = (S.answer?.sources ?? []).filter((s) => !s.ok).map((s) => `<p class="hunt-flash is-error" role="alert">${icon('alert')}<span>${esc(s.error)}</span></p>`).join('');
    if (S.phase === 'idle' || (S.phase === 'loading' && !S.older && !signals().length)) {
      return `<ul class="hunt-cards is-loading" aria-busy="true">${ghost()}${ghost()}${ghost()}</ul><p class="hunt-empty"><span>${icon('search')}<span>Looking at the public tender notices…</span></span></p>`;
    }
    if (huntIsEmpty(S.settings)) {
      return `<div class="hunt-setup"><ul class="hunt-cards is-ghosts" aria-hidden="true">${ghost()}${ghost()}${ghost()}</ul>
        <div class="hunt-setup-t"><p class="hunt-empty-h">${icon('search')}<span>Set what to look for</span></p><p>Say which words, sectors and regions suit the practice, and the workspace will find public tender notices that fit, every day. Nothing is looked up until then.</p>
        ${canEdit ? `<button type="button" class="hunt-btn solid" data-hunt="open-settings">${icon('sliders')}<span>Set what to look for</span></button>` : '<p class="hunt-dim">An owner of the practice sets this.</p>'}</div></div>`;
    }
    if (!sourcesOn(S.settings).length) {
      return `<p class="hunt-empty"><span>${icon('alert')}<span>No source is switched on. Switch one on in “What to look for”.</span></span></p>`;
    }
    if (S.phase === 'error') {
      const cards = S.older ? `<p class="hunt-flash">${icon('clock')}<span>${esc(lookedAt())}. It may be out of date.</span></p><ul class="hunt-cards" role="list">${visible().slice(0, SHOWN_MAX).map(cardHtml).join('')}</ul>` : '';
      return `<p class="hunt-flash is-error" role="alert">${icon('alert')}<span>${esc(S.error)}</span></p><div class="hunt-acts"><button type="button" class="hunt-btn" data-hunt="look" data-force="1">${icon('refresh')}<span>Try again</span></button></div>${cards}`;
    }
    const shown = visible(), hid = hidden();
    const sorted = [...shown.filter((s) => !addedAs(s, enquiries())), ...shown.filter((s) => addedAs(s, enquiries()))].slice(0, SHOWN_MAX);
    const none = !shown.length ? `<p class="hunt-empty"><span>${icon('search')}<span>${hid.length ? 'Everything found is hidden.' : `Nothing fits right now. ${S.answer?.considered ? `${plural(S.answer.considered, 'open tender')} looked at. ` : ''}New notices are looked at again tomorrow.`}</span></span></p>` : '';
    const more = shown.length > SHOWN_MAX ? `<p class="hunt-dim">${shown.length - SHOWN_MAX} more fit but are not shown. Tighten the words or regions to see the best ones.</p>` : '';
    const hiddenList = hid.length ? `<div class="hunt-hidden"><button type="button" class="hunt-link" data-hunt="toggle-hidden" aria-expanded="${S.showHidden}">${icon('eye')}<span>${S.showHidden ? 'Hide the hidden' : `${hid.length} hidden as not for us`}</span></button>${S.showHidden ? `<ul>${hid.map((s) => `<li><span>${esc(s.title)}</span><button type="button" class="hunt-link" data-hunt="back" data-id="${esc(s.id)}">Bring back</button></li>`).join('')}</ul>` : ''}</div>` : '';
    return `${sourcesNote}${shown.length ? `<ul class="hunt-cards" role="list">${sorted.map(cardHtml).join('')}</ul>` : none}${more}${hiddenList}`;
  }

  function html() {
    const empty = huntIsEmpty(S.settings) && S.phase !== 'idle';
    const kw = S.settings.keywords.length + S.settings.sectors.length + S.settings.regions.length;
    const flash = S.flash ? `<p class="hunt-flash${S.flash.error ? ' is-error' : ''}" role="${S.flash.error ? 'alert' : 'status'}">${icon(S.flash.error ? 'alert' : 'check')}<span>${esc(S.flash.text)}</span></p>` : '';
    return `<section class="hunt" aria-labelledby="hunt-h" data-state="${S.phase}${empty ? '-empty' : ''}">
      <header class="hunt-head">
        <div class="hunt-head-t"><h2 id="hunt-h" class="hunt-h">${icon('search')}<span>Found work</span>${signals().length && !empty ? `<span class="hunt-count">${visible().length}<span class="vh"> findings</span></span>` : ''}</h2>
          <p class="hunt-sub">Public tender notices that look like work for the practice. Add the good ones to the pipeline. Nothing is contacted or sent.</p></div>
        <div class="hunt-head-a">${lookedAt() ? `<p class="hunt-looked">${icon('clock', 'hunt-i-s')}<span>${esc(lookedAt())}</span></p>` : ''}
          ${empty ? '' : `<button type="button" class="hunt-btn" data-hunt="look" data-force="1"${S.phase === 'loading' ? ' disabled' : ''}>${icon('refresh')}<span>Look again</span></button>`}
          <button type="button" class="hunt-btn" data-hunt="open-settings" aria-expanded="${S.panel}">${icon('sliders')}<span>What to look for</span>${kw ? `<span class="hunt-count">${kw}</span>` : ''}</button></div>
      </header>
      ${flash}${S.panel ? settingsHtml() : ''}
      ${bodyHtml()}
      ${empty ? '' : `<p class="hunt-credit">Tender notices from ${S.settings.sources.gets !== false ? '<a href="https://www.gets.govt.nz/ExternalIndex.htm" target="_blank" rel="noopener noreferrer">GETS</a>, MBIE (Crown copyright, reused under NZGOAL)' : 'the sources switched on'}. A fit is a reading of the notice: read the tender documents before deciding.</p>`}
      <p class="vh" role="status" aria-live="polite">${esc(S.announce)}</p>
    </section>`;
  }

  // ---- events (crm.js hands these on; they only act on elements that carry data-hunt) ---------------------------------------------------------
  async function click(ev) {
    const t = ev.target?.closest?.('[data-hunt]');
    if (!t) return false;
    const act = t.dataset.hunt;
    if (act === 'add') { await add(t.dataset.id); return true; }
    if (act === 'no') { await notForUs(t.dataset.id); return true; }
    if (act === 'back') { await bringBack(t.dataset.id); return true; }
    if (act === 'toggle-hidden') { S.showHidden = !S.showHidden; draw(); return true; }
    if (act === 'look') { S.flash = null; await look({ force: true }); return true; }
    if (act === 'open-settings') { S.panel = !S.panel; S.flash = null; draw(); return true; }
    if (act === 'close-settings') { S.panel = false; draw(); return true; }
    return false;
  }
  async function submit(ev) {
    const form = ev.target?.closest?.('form[data-hunt-form]');
    if (!form) return false;
    ev.preventDefault();
    if (!canEdit) return true;
    const fd = new FormData(form), sources = fd.getAll('sources');
    try {
      await saveSettings({ keywords: String(fd.get('keywords') ?? ''), sectors: fd.getAll('sectors'), regions: fd.getAll('regions'), min: String(fd.get('min') ?? '').trim(), max: String(fd.get('max') ?? '').trim(), sources: Object.fromEntries(SOURCES.map((s) => [s.id, sources.includes(s.id)])) });
      S.panel = false; S.flash = { text: 'Saved. Looking at the notices again.' };
      await look({ force: true });
    } catch (err) { S.flash = { error: true, text: String(err?.message ?? err) }; draw(); }
    return true;
  }

  return {
    html, start, click, submit, look, add, notForUs, bringBack, saveSettings, loadSettings,
    stop() { gone = true; run++; },
    get state() { return S; },
  };
}
