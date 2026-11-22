// "Found work" on the Clients screen: a strip of cards above the pipeline board. The workspace looks at public tender notices when the
// screen opens (once a day, kept in this browser), ranks them against what the practice said to look for, and a person adds the good
// ones to the pipeline. Nothing is contacted, registered for, sent or submitted, and nothing is added without a press.
//
// crm.js draws this inside its board: it asks createHunt(...) for html(), passes it clicks and submits, and redraws when asked.
// The rules are in hunt-model.js; the feed is /api/live/?feeds=hunt (api/_feeds/hunt.js).
import { parseLens, rankKbRows, rankLeads } from './hunt-rank.js';
import { parseGetsEmail, emailText } from './gets-alert.js';
import { readerScript } from './gmail-reader-script.js';
import { INBOX_SETTING, cleanInboxItem, mergeInbox, tidyInbox, rankInbox } from './hunt-inbox.js';
import { clock, dayName, shortDay } from './crm-model.js';
import { icon as pageIcon } from './icons.js';
import {
  REGIONS, SECTORS, SOURCES, SHOWN_MAX, SETTING, emptyHunt, cleanHunt, huntIsEmpty, huntQuery, sourcesOn, readAnswer, cleanSignal, fitWord, fitSteps, daysLeft, buyerInitials,
  addedAs, enquiryFromSignal, cleanDismissed, dismiss, restore, scopeOf, cacheFresh, cleanLead, cleanEarlySignal, KIND_LABEL, KIND_NOTE,
} from './hunt-model.js';

export const FEED = '/api/live/';
const LEADS_MAX = 8;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ---- the stylesheet (loaded with the page's own custom properties; nothing here sets a colour of its own) -----------------------------
export const CSS_VERSION = '4';
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

/**
 * The early signals (planning, funding and policy signs that work may come), handed over by the signal feeds (api/_feeds/signals*.js, ranked by
 * js/signals-rank.js). Until that feed exists this returns nothing, so the lane shows leads only. Each item must be shaped
 * { id, kind:'signal', title, source, sourceUrl, day, region, why, horizon, evidence:[{ label, url }], cultural }; cleanEarlySignal bounds it.
 */
export async function readEarlySignals(/* query */) { return []; }

const SECTOR_NAME = Object.fromEntries(SECTORS);
/** the start of the reason hunt-rank.js writes for a cultural match; the card shows the words in their own line instead */
const CULTURAL_REASON = 'kaupapa Māori or Indigenous words';

/**
 * The hunt for one Clients screen.
 *   ctx      the page's ctx: { store, account, practice, me, navigate }
 *   opts     { enquiries(): the current enquiries, readOnly, redraw(): draw the screen again, added(text): an enquiry was made, fetch, now }
 */
export function createHunt(ctx, { signalFeed = readEarlySignals, enquiries = () => [], readOnly = false, redraw = () => {}, added = async () => {}, fetch: fetchImpl = (...a) => globalThis.fetch(...a), now = () => new Date() } = {}) {
  const scope = scopeOf(ctx.practice);
  const canEdit = !readOnly && (!ctx.practice || ctx.practice.role === 'owner');
  const S = { phase: 'idle', settings: emptyHunt(), answer: null, older: null, error: '', dismissed: {}, showHidden: false, onlyCultural: false, inbox: [], alertFinds: [], reader: { status: null, token: '', busy: false, msg: '', error: false }, alerts: { open: false, text: '', busy: false, msg: '', error: false, drag: false }, panel: false, flash: null, busy: new Set(), announce: '' };
  const isOwner = !readOnly && !!ctx.practice && ctx.practice.role === 'owner';
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
    const lens = parseLens({ keywords: S.settings.keywords.join(','), regions: S.settings.regions.join(','), sectors: S.settings.sectors.join(','), min: S.settings.min, max: S.settings.max, cultural: S.settings.cultural });
    const signals = rankKbRows(rows, lens, now()).map(cleanSignal).filter(Boolean);
    return { signals, considered: Array.isArray(rows) ? rows.length : 0, fetchedAt: now().toISOString() };
  }
  /** the news stories the radar collected (members only), ranked here; each comes back as a headline, source, day, link and our own reason, with no story text */
  async function readLeads() {
    const rows = await ctx.account.huntLeads();
    const lens = parseLens({ keywords: S.settings.keywords.join(','), regions: S.settings.regions.join(','), sectors: S.settings.sectors.join(','), cultural: S.settings.cultural });
    return rankLeads(rows, lens, now()).map(cleanLead).filter(Boolean);
  }
  const readSignals = async () => { const got = await signalFeed(huntQuery(S.settings)); return (Array.isArray(got) ? got : []).map(cleanEarlySignal).filter(Boolean).slice(0, 20); };
  /** both sources in one answer: the same notice from both shows once (the feed's copy, which is read live); one source failing leaves the other's findings in */
  function mergeAnswers(radar, feed, radarOn, getsOn, extras = []) {
    const sources = [], byId = new Map(); let considered = 0, fetchedAt = now().toISOString();
    if (feed.status === 'fulfilled' && feed.value) { feed.value.signals.forEach((s) => byId.set(s.id, s)); sources.push(...feed.value.sources.filter((x) => x.id !== 'radar')); considered += feed.value.considered; fetchedAt = feed.value.fetchedAt; }
    else if (getsOn) sources.push({ id: 'gets', name: 'GETS', ok: false, error: String(feed.reason?.message ?? 'GETS did not answer just now.') });
    if (radar.status === 'fulfilled' && radar.value) { radar.value.signals.forEach((s) => { if (!byId.has(s.id)) byId.set(s.id, s); }); sources.push({ id: 'radar', name: 'Radar', ok: true, error: '' }); considered += radar.value.considered; }
    else if (radarOn) sources.push({ id: 'radar', name: 'Radar', ok: false, error: 'The radar’s notices could not be read just now. Try again in a few minutes.' });
    if (!sources.some((x) => x.ok)) throw new Error(sources.map((x) => x.error).join(' ') || 'Nothing could be looked at. Try again in a few minutes.');
    const signals = [...byId.values()].sort((a, b) => b.fit - a.fit || (a.closesDay || '9').localeCompare(b.closesDay || '9')).slice(0, 40);
    return { signals, leads: extras, sources, needsLens: false, considered, fetchedAt };
  }
  /** Look at the notices: the day's kept answer when there is one for these settings, otherwise the live feed. force = the person pressed "Look again". */
  async function look({ force = false } = {}) {
    const mine = ++run;
    if (huntIsEmpty(S.settings) || !sourcesOn(S.settings).length) { S.phase = 'ready'; S.answer = null; S.error = ''; return draw(); }
    const on = sourcesOn(S.settings), radarOn = on.includes('radar') && !!ctx.practice && typeof ctx.account?.huntSignals === 'function', getsOn = on.includes('gets');
    if (!radarOn && !getsOn) { S.phase = 'ready'; S.answer = null; S.error = ''; return draw(); }
    // lens=3: answers kept before leads and early signals existed are not reused
    const query = huntQuery(S.settings) + (radarOn ? '&radar=1' : '') + '&lens=3', kept = await readKept(SETTING.cache(scope));
    if (!force && cacheFresh(kept, query, now())) { S.answer = kept.answer; S.older = null; S.phase = 'ready'; S.error = ''; return draw(); }
    S.older = kept && kept.query === query && kept.answer ? { answer: kept.answer, day: kept.day } : null;
    S.phase = 'loading'; S.error = ''; draw();
    try {
      const [fromLeads, fromFeed, fromRadar, fromSignals] = await Promise.allSettled([radarOn && typeof ctx.account?.huntLeads === 'function' ? readLeads() : Promise.resolve([]), getsOn ? readFeed(huntQuery(S.settings)) : Promise.resolve(null), radarOn ? readRadar() : Promise.resolve(null), readSignals()]);
      if (mine !== run) return;
      const extras = [...(fromLeads.status === 'fulfilled' ? fromLeads.value : []), ...(fromSignals.status === 'fulfilled' ? fromSignals.value : [])];
      const answer = mergeAnswers(fromRadar, fromFeed, radarOn, getsOn, extras);
      answer.leadsNote = fromLeads.status === 'rejected' ? 'Leads could not be read just now. Try again in a few minutes.' : '';
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

  // ---- alert emails: read, kept, ranked like any other finding -----------------------------------------------------------------------------
  async function loadInbox() {
    try {
      const rows = ctx.practice && typeof ctx.account?.huntInbox === 'function' ? await ctx.account.huntInbox() : (await readKept(INBOX_SETTING(scope))) ?? [];
      S.inbox = tidyInbox(rows, now());
    } catch { S.inbox = []; }
    rankAlerts();
  }
  function rankAlerts() {
    if (huntIsEmpty(S.settings)) { S.alertFinds = []; return; }
    const lens = parseLens({ keywords: S.settings.keywords.join(','), regions: S.settings.regions.join(','), sectors: S.settings.sectors.join(','), min: S.settings.min, max: S.settings.max, cultural: S.settings.cultural });
    S.alertFinds = rankInbox(S.inbox, lens, now()).map(cleanSignal).filter(Boolean);
  }
  /** Read text (a pasted email, or the text of a dropped file), keep what it holds, and say what happened in a sentence. Nothing is sent anywhere. */
  async function addAlerts(texts) {
    const A = S.alerts;
    if (readOnly || (ctx.practice && ctx.practice.role === 'viewer')) { A.error = true; A.msg = 'A viewer cannot add alert emails. Ask an owner or member.'; return draw(); }
    const found = [], kinds = [];
    for (const t of texts.slice(0, 20)) { const r = parseGetsEmail(emailText(t)); kinds.push(r.type); found.push(...r.items); }
    if (!found.length) { A.error = true; A.msg = 'No GETS tenders were found in that. Paste the whole “GETS: Tender Subscription” email, or drop the .eml or .txt file. Only links to gets.govt.nz tender pages count.'; return draw(); }
    A.busy = true; A.msg = ''; draw();
    try {
      const r = mergeInbox(S.inbox, found, now()), ids = new Set(found.map((x) => x.rfxId));
      if (ctx.practice) await ctx.account.addHuntInbox(r.items.filter((i) => ids.has(i.rfxId)));
      else await ctx.store.save('setting', { id: INBOX_SETTING(scope), value: r.items });
      S.inbox = r.items; rankAlerts();
      const adv = found.filter((x) => x.kind === 'future').length, upd = found.filter((x) => x.kind === 'update').length;
      A.error = false; A.text = '';
      A.msg = `Read ${plural(found.length, 'tender')} from ${plural(texts.length, 'email')}: ${r.added} new${r.updated ? `, ${r.updated} changed` : ''}${r.same ? `, ${r.same} already kept` : ''}${adv ? `; ${adv} ${adv === 1 ? 'is an advance notice' : 'are advance notices'}` : ''}${upd ? `; ${plural(upd, 'update')} to a tender` : ''}. ${S.alertFinds.length ? `${plural(S.alertFinds.length, 'alert finding')} fit${S.alertFinds.length === 1 ? 's' : ''} what you look for.` : huntIsEmpty(S.settings) ? 'Set what to look for to see which fit.' : 'None fit what you look for yet.'}`;
      S.announce = A.msg;
    } catch (e) { A.error = true; A.msg = String(e?.message ?? e); }
    A.busy = false; draw();
  }
  async function addFiles(files) {
    const texts = [];
    for (const f of [...files].slice(0, 20)) {
      if (f.size > 3e6) { S.alerts.error = true; S.alerts.msg = `${String(f.name).slice(0, 60)} is too big to be an alert email (over 3 MB).`; return draw(); }
      try { texts.push(await f.text()); } catch { /* an unreadable file adds nothing */ }
    }
    if (!texts.length) { S.alerts.error = true; S.alerts.msg = 'Those files could not be read.'; return draw(); }
    await addAlerts(texts);
  }
  // ---- the Gmail reader: an owner makes it, everyone can see whether it is on ------------------------------------------------------------------------
  async function loadReader() {
    if (!ctx.practice || typeof ctx.account?.huntReader !== 'function') { S.reader.status = null; return; }
    S.reader.status = await ctx.account.huntReader();
  }
  async function makeReader() {
    const R = S.reader; if (R.busy || !isOwner) return;
    R.busy = true; R.msg = ''; R.error = false; draw();
    try { R.token = await ctx.account.makeHuntReader(); await loadReader(); R.msg = 'Reader made. Any earlier reader has stopped.'; }
    catch (e) { R.error = true; R.msg = String(e?.message ?? e); }
    R.busy = false; draw();
  }
  async function stopReader() {
    const R = S.reader; if (R.busy || !isOwner) return;
    R.busy = true; R.msg = ''; R.error = false; draw();
    try { await ctx.account.stopHuntReader(); R.token = ''; await loadReader(); R.msg = 'The reader is stopped. Its token no longer works. Alerts already filed stay.'; }
    catch (e) { R.error = true; R.msg = String(e?.message ?? e); }
    R.busy = false; draw();
  }
  async function copyScript() {
    const R = S.reader; if (!R.token) return;
    try { await globalThis.navigator.clipboard.writeText(readerScript(R.token)); R.msg = 'Copied. Now paste it into the Google project.'; R.error = false; }
    catch { R.msg = 'Copying was not allowed here. Select the script and copy it by hand.'; R.error = true; }
    draw();
  }
  /** the settings section: owners make and stop the reader; members and viewers only see whether it is on */
  function readerHtml() {
    const R = S.reader, st = R.status;
    const head = `<h3 class="hunt-lane-h">${icon('send')}<span>Read GETS alerts from Gmail</span></h3>`;
    if (!ctx.practice) return `<section class="hunt-reader" aria-labelledby="hunt-reader-h">${head.replace('<h3 ', '<h3 id="hunt-reader-h" ')}<p class="hunt-dim">A Gmail reader files the daily GETS alert emails for the whole practice, so it needs the practice’s records. Until then, paste or drop the emails in “Add alert emails”.</p></section>`;
    const last = st?.on ? (st.lastUsed ? `Last filed: ${clock(new Date(st.lastUsed))}${dayOf(new Date(st.lastUsed)) === dayOf(now()) ? ' today' : ` on ${dayName(new Date(st.lastUsed))}`}, ${plural(st.lastCount, 'notice')}.` : 'Nothing filed yet. It runs every hour.') : '';
    const state = st == null ? 'Whether a reader is on could not be read just now.' : st.on ? 'A reader is on for this practice.' : 'No reader is set up.';
    const msg = R.msg ? `<p class="hunt-flash${R.error ? ' is-error' : ''}" role="${R.error ? 'alert' : 'status'}">${icon(R.error ? 'alert' : 'check')}<span>${esc(R.msg)}</span></p>` : '';
    const script = R.token ? `<div class="hunt-script"><p class="hunt-flash is-error" role="note">${icon('alert')}<span>This token is private. It is shown once, only on this screen, and the workspace keeps only a scrambled copy. Anyone who has it can add notices to your alert inbox. Do not share it or post it.</span></p>
        <ol class="hunt-steps"><li><span>Open <a href="https://script.google.com" target="_blank" rel="noopener noreferrer">script.google.com<span class="vh"> (opens in a new tab)</span></a> in the Google account that gets the GETS emails, and make a new project.</span></li><li><span>Delete what is there and paste the script below.</span></li><li><span>Choose <b>setup</b> in the toolbar and press <b>Run</b>.</span></li><li><span>Approve Google’s permission screen. The script can read mail and label it. It cannot send, delete or forward.</span></li><li><span>Done. It now looks for new GETS emails every hour.</span></li></ol>
        <div class="hunt-acts"><button type="button" class="hunt-btn solid" data-hunt="copy-script">${icon('check')}<span>Copy the script</span></button><button type="button" class="hunt-btn" data-hunt="hide-script">I have pasted it: hide the script</button></div>
        <label class="hunt-f wide"><span>The script, with your token in it</span><textarea readonly rows="8" spellcheck="false" class="hunt-code" aria-label="The Gmail reader script">${esc(readerScript(R.token))}</textarea></label></div>` : '';
    const mine = isOwner ? `<div class="hunt-acts"><button type="button" class="hunt-btn${st?.on ? '' : ' solid'}" data-hunt="make-reader"${R.busy ? ' disabled' : ''}>${icon('plus')}<span>${R.busy ? 'Working…' : st?.on ? 'Make a new reader' : 'Make a reader'}</span></button>${st?.on ? `<button type="button" class="hunt-btn" data-hunt="stop-reader"${R.busy ? ' disabled' : ''}>Stop the reader</button>` : ''}</div>${st?.on ? '<p class="hunt-dim">Making a new reader stops the old one, so paste the new script into the same Google project.</p>' : ''}` : '<p class="hunt-dim">Only an owner can make or stop a reader.</p>';
    return `<section class="hunt-reader" aria-labelledby="hunt-reader-h">${head.replace('<h3 ', '<h3 id="hunt-reader-h" ')}<p class="hunt-dim">A small script in the practice’s own Gmail reads the daily GETS alert emails and files the tenders it finds, so nobody has to paste them. It only reads and labels mail. Nothing is forwarded and no mail address is changed.</p>
      <p class="hunt-reader-state"><b>${esc(state)}</b>${last ? ` <span>${esc(last)}</span>` : ''}</p>${mine}${msg}${script}</section>`;
  }

  const onDoc = {
    input: (ev) => { const t = ev.target; if (t?.matches?.('textarea[data-hunt-text]')) S.alerts.text = String(t.value ?? '').slice(0, 400000); },
    change: (ev) => { const t = ev.target; if (t?.matches?.('input[data-hunt-files]') && t.files?.length) addFiles(t.files); },
    dragover: (ev) => { if (ev.target?.closest?.('[data-hunt-drop]')) { ev.preventDefault(); if (!S.alerts.drag) { S.alerts.drag = true; ev.target.closest('[data-hunt-drop]').classList.add('is-drag'); } } },
    dragleave: (ev) => { const z = ev.target?.closest?.('[data-hunt-drop]'); if (z && !z.contains(ev.relatedTarget)) { S.alerts.drag = false; z.classList.remove('is-drag'); } },
    drop: (ev) => { const z = ev.target?.closest?.('[data-hunt-drop]'); if (!z) return; ev.preventDefault(); S.alerts.drag = false; z.classList.remove('is-drag'); if (ev.dataTransfer?.files?.length) addFiles(ev.dataTransfer.files); },
  };
  const listen = (on) => { if (typeof document === 'undefined') return; for (const [k, f] of Object.entries(onDoc)) document[on ? 'addEventListener' : 'removeEventListener'](k, f); };

  async function start() {
    ensureHuntCss();
    listen(true);
    await loadSettings();
    await loadInbox();
    loadReader().catch(() => {});
    S.dismissed = cleanDismissed(await readKept(SETTING.dismissed(scope)), now());
    await look();
  }

  // ---- the three things a person can do: add, "Not for us", change what to look for -----------------------------------------------------------
  const baseSignals = () => S.answer?.signals ?? S.older?.answer?.signals ?? [];
  /** tenders: the feed's and the radar's, and the alert emails' (a tender in both shows once, marked as also in the alert) */
  const signals = () => {
    const byId = new Map(baseSignals().map((s) => [s.id, s]));
    for (const a of S.alertFinds) byId.set(a.id, byId.has(a.id) ? { ...byId.get(a.id), alsoAlert: true } : a);
    return [...byId.values()].sort((a, b) => b.fit - a.fit || (a.closesDay || '9').localeCompare(b.closesDay || '9'));
  };
  /** leads and early signals: always kept apart from the tenders */
  const lane = () => S.answer?.leads ?? S.older?.answer?.leads ?? [];
  const findAny = (id) => signals().find((x) => x.id === id) ?? lane().find((x) => x.id === id);
  async function add(id) {
    const s = findAny(id);
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
    const s = findAny(id);
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
  const hidden = () => [...signals(), ...lane()].filter((s) => S.dismissed[s.id]);
  const visibleLane = () => lane().filter((s) => !S.dismissed[s.id]);

  function cardHtml(s) {
    const days = daysLeft(s, now()), made = addedAs(s, enquiries()), busy = S.busy.has(s.id);
    const kp = s.cultural?.on ? s.cultural : null;
    const reasons = s.reasons.filter((r) => !(kp && r.startsWith(CULTURAL_REASON)));
    const words = kp ? `<li class="hunt-kp-words">Kaupapa Māori and Indigenous words found in the notice: ${kp.why.map((w) => `<b>${esc(w)}</b>`).join(', ')}. This reads the words only; it is not a view on cultural fit.</li>` : '';
    const why = reasons.length || kp ? `<details class="hunt-why"><summary>Why this</summary><ul>${words}${reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></details>` : '';
    const badge = (kp ? `<span class="hunt-kp">${pageIcon('people', 'hunt-i hunt-i-s')}<span>Kaupapa Māori</span></span>` : '') + (s.advance ? '<span class="hunt-chip is-adv"><span>Advance notice</span></span>' : '') + (s.alsoAlert ? '<span class="hunt-chip is-src"><span>Also in your alert email</span></span>' : '');
    const acts = readOnly ? '' : made
      ? `<div class="hunt-acts"><span class="hunt-added">${icon('check')}<span>Added to the pipeline</span></span><a class="hunt-link" href="#/crm/e/${encodeURIComponent(made.id)}">Open the enquiry</a></div>`
      : `<div class="hunt-acts"><button type="button" class="hunt-btn solid" data-hunt="add" data-id="${esc(s.id)}" aria-label="Add ${esc(s.title)} to the pipeline"${busy ? ' disabled' : ''}>${icon('plus')}<span>${busy ? 'Adding…' : 'Add to pipeline'}</span></button><button type="button" class="hunt-link" data-hunt="no" data-id="${esc(s.id)}" aria-label="Not for us: hide ${esc(s.title)}">Not for us</button></div>`;
    return `<li class="hunt-card${made ? ' is-added' : ''}" data-id="${esc(s.id)}">
      <div class="hunt-top"><span class="hunt-av" aria-hidden="true">${esc(buyerInitials(s.buyer))}</span><span class="hunt-buyer">${esc(s.buyer || 'Buyer not stated')}</span>${ringHtml(days)}</div>
      <a class="hunt-title" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(s.title)}</span>${icon('out', 'hunt-i-s')}<span class="vh"> (opens the notice on GETS)</span></a>
      <div class="hunt-meta">${badge}${s.region ? `<span class="hunt-chip">${icon('pin', 'hunt-i-s')}<span>${esc(s.region)}</span></span>` : ''}<span class="hunt-chip is-src"><span>${esc(s.sourceName)}</span></span>${s.closesDay ? `<span class="hunt-chip">${icon('clock', 'hunt-i-s')}<span>${esc(shortDay(s.closesDay, now()))}</span></span>` : ''}</div>
      ${fitHtml(s.fit)}
      ${why}
      ${acts}
    </li>`;
  }
  /** a news lead or an early signal: always marked for what it is, with our own reason and never any text from the story */
  function leadCardHtml(s) {
    const made = addedAs(s, enquiries()), busy = S.busy.has(s.id), kp = s.cultural?.on ? s.cultural : null, signal = s.kind === 'signal';
    const more = (s.reasons ?? []).slice(1);
    const why = more.length ? `<details class="hunt-why"><summary>Why this</summary><ul>${more.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></details>` : '';
    const badge = kp ? `<span class="hunt-kp">${pageIcon('people', 'hunt-i hunt-i-s')}<span>Kaupapa Māori</span></span>` : '';
    const proof = signal && s.evidence?.length ? `<ul class="hunt-evidence" aria-label="Evidence">${s.evidence.slice(0, 3).map((e) => `<li><a class="hunt-link" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.label)}<span class="vh"> (opens in a new tab)</span></a></li>`).join('')}</ul>` : '';
    const acts = readOnly ? '' : made
      ? `<div class="hunt-acts"><span class="hunt-added">${icon('check')}<span>Added to the pipeline</span></span><a class="hunt-link" href="#/crm/e/${encodeURIComponent(made.id)}">Open the enquiry</a></div>`
      : `<div class="hunt-acts"><button type="button" class="hunt-btn solid" data-hunt="add" data-id="${esc(s.id)}" aria-label="Add ${esc(s.title)} to the pipeline as a lead"${busy ? ' disabled' : ''}>${icon('plus')}<span>${busy ? 'Adding…' : 'Add to pipeline'}</span></button><button type="button" class="hunt-link" data-hunt="no" data-id="${esc(s.id)}" aria-label="Not for us: hide ${esc(s.title)}">Not for us</button></div>`;
    return `<li class="hunt-card is-${s.kind}${made ? ' is-added' : ''}" data-id="${esc(s.id)}" data-kind="${s.kind}">
      <p class="hunt-kind">${icon(signal ? 'eye' : 'search', 'hunt-i-s')}<span>${esc(KIND_LABEL[s.kind])}</span></p>
      <a class="hunt-title" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(s.title)}</span>${icon('out', 'hunt-i-s')}<span class="vh"> (opens the ${signal ? 'source' : 'story'} on ${esc(s.sourceName)})</span></a>
      <div class="hunt-meta">${badge}<span class="hunt-chip is-src"><span>${esc(s.sourceName)}</span></span>${s.published ? `<span class="hunt-chip">${icon('clock', 'hunt-i-s')}<span>${esc(shortDay(s.published, now()))}</span></span>` : ''}${s.region ? `<span class="hunt-chip">${icon('pin', 'hunt-i-s')}<span>${esc(s.region)}</span></span>` : ''}${signal && s.horizon ? `<span class="hunt-chip"><span>${esc(s.horizon)}</span></span>` : ''}</div>
      ${s.reason ? `<p class="hunt-reason">${esc(s.reason)}</p>` : ''}
      <p class="hunt-notopp">${esc(KIND_NOTE[s.kind])}</p>
      ${proof}${why}${acts}
    </li>`;
  }
  /** the lane under the tenders */
  function laneHtml() {
    const all = visibleLane(), shown = (S.onlyCultural ? all.filter((s) => s.cultural?.on) : all).slice(0, LEADS_MAX);
    const off = !sourcesOn(S.settings).includes('radar');
    const body = !ctx.practice ? `<p class="hunt-empty"><span>${icon('alert')}<span>Leads need the practice’s records, so there are none while you are signed out. Sign in to a practice to see stories about buildings that may need design work.</span></span></p>`
      : S.answer?.leadsNote ? `<p class="hunt-flash is-error" role="alert">${icon('alert')}<span>${esc(S.answer.leadsNote)}</span></p>`
      : off ? `<p class="hunt-empty"><span>${icon('alert')}<span>Radar is switched off, and leads come from it. Switch it on in “What to look for”.</span></span></p>`
      : shown.length ? `<ul class="hunt-cards" role="list">${shown.map(leadCardHtml).join('')}</ul>${all.length > shown.length && !S.onlyCultural ? `<p class="hunt-dim">${all.length - shown.length} more are not shown.</p>` : ''}`
      : `<p class="hunt-empty"><span>${icon('search')}<span>${S.onlyCultural && all.length ? 'None of the leads carry kaupapa Māori or Indigenous words.' : 'No stories fit right now. Stories about a building or place that may need design work are looked at again tomorrow.'}</span></span></p>`;
    return `<section class="hunt-lane" aria-labelledby="hunt-leads-h"><h3 id="hunt-leads-h" class="hunt-lane-h">${icon('eye')}<span>Leads and early signals</span>${all.length ? `<span class="hunt-count">${all.length}<span class="vh"> items</span></span>` : ''}</h3>
      <p class="hunt-lane-note">Stories and signs that work may come. They are not tenders. Only the headline, source, date and a link are shown; the stories belong to their publishers.</p>${body}</section>`;
  }
  /** the paste and drop control for GETS alert emails */
  function alertsHtml() {
    const A = S.alerts, can = !readOnly && !(ctx.practice && ctx.practice.role === 'viewer');
    const where = ctx.practice ? `Kept for everyone in ${esc(ctx.practice.name ?? 'the practice')}.` : 'Kept in this browser only.';
    const msg = A.msg ? `<p class="hunt-flash${A.error ? ' is-error' : ''}" role="${A.error ? 'alert' : 'status'}">${icon(A.error ? 'alert' : 'check')}<span>${esc(A.msg)}</span></p>` : '';
    return `<details class="hunt-alerts"${A.open || A.msg || A.text ? ' open' : ''} data-hunt-alerts><summary><span>${icon('plus')}<span>Add alert emails</span></span>${S.inbox.length ? `<span class="hunt-count">${S.inbox.length}<span class="vh"> kept</span></span>` : ''}</summary>
      <div class="hunt-alerts-in"><p class="hunt-dim">Paste a “GETS: Tender Subscription” email, or drop the .eml or .txt file. The workspace reads the tender names, buyers, closing times and gets.govt.nz links, ranks them like any other finding, and keeps those only. The email itself is not kept. ${where}</p>
        ${can ? `<div class="hunt-drop" data-hunt-drop><label class="hunt-f wide"><span>Email text</span><textarea data-hunt-text rows="5" placeholder="Paste the email here" spellcheck="false" autocomplete="off">${esc(A.text)}</textarea></label>
        <div class="hunt-acts"><button type="button" class="hunt-btn solid" data-hunt="read-alert"${A.busy ? ' disabled' : ''}>${icon('check')}<span>${A.busy ? 'Reading…' : 'Read and add'}</span></button><label class="hunt-btn hunt-file"><input type="file" data-hunt-files accept=".eml,.txt,.html,.htm,message/rfc822,text/plain" multiple><span>Choose files</span></label></div>
        <p class="hunt-drop-t">${icon('out', 'hunt-i-s')}<span>Or drop .eml or .txt files here</span></p></div>` : '<p class="hunt-dim">A viewer can read what was added but not add more.</p>'}
        ${msg}</div></details>`;
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
      <div class="hunt-f wide"><label class="hunt-opt wide"><input type="checkbox" name="cultural" value="1"${h.cultural ? ' checked' : ''}${off}><span><strong class="hunt-opt-t">Always show kaupapa Māori and Indigenous work, whatever the other words</strong>A notice with words such as marae, papakāinga or an iwi as the buyer is kept even when it misses the words and sectors above. It must still be about buildings and in your regions.</span></label><small>This is a finding aid. It reads the words in public notices. It does not judge cultural fit, and nobody is contacted.</small></div>
      <fieldset class="hunt-f wide"><legend>Regions <small>(none ticked means anywhere)</small></legend><div class="hunt-opts">${REGIONS.map((r) => chip('regions', r, r, h.regions.includes(r))).join('')}</div></fieldset>
      <div class="hunt-f"><span class="hunt-lab">Usual value, NZD</span><div class="hunt-range"><label><span class="vh">From</span><input name="min" inputmode="numeric" placeholder="from 50000" value="${h.min ?? ''}" autocomplete="off"${off}></label><span aria-hidden="true">to</span><label><span class="vh">To</span><input name="max" inputmode="numeric" placeholder="to 2000000" value="${h.max ?? ''}" autocomplete="off"${off}></label></div><small>Used only when a notice states its own value, which most do not.</small></div>
      <fieldset class="hunt-f"><legend>Where to look</legend>${SOURCES.map((s) => `<label class="hunt-opt wide"><input type="checkbox" name="sources" value="${esc(s.id)}"${h.sources[s.id] !== false ? ' checked' : ''}${off}><span><strong>${esc(s.name)}</strong> ${esc(s.says)}</span></label>`).join('')}</fieldset>
      <p class="hunt-note">${icon('send')}<span>${canEdit ? 'Nothing is looked up until you have set a word, a sector or the kaupapa Māori setting.' : 'Only an owner can change this.'} ${who}</span></p>
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
    if (!sourcesOn(S.settings).length && !S.alertFinds.length) {
      return `<p class="hunt-empty"><span>${icon('alert')}<span>No source is switched on. Switch one on in “What to look for”.</span></span></p>${laneHtml()}`;
    }
    if (S.phase === 'error') {
      const cards = S.older ? `<p class="hunt-flash">${icon('clock')}<span>${esc(lookedAt())}. It may be out of date.</span></p><ul class="hunt-cards" role="list">${visible().slice(0, SHOWN_MAX).map(cardHtml).join('')}</ul>` : '';
      return `<p class="hunt-flash is-error" role="alert">${icon('alert')}<span>${esc(S.error)}</span></p><div class="hunt-acts"><button type="button" class="hunt-btn" data-hunt="look" data-force="1">${icon('refresh')}<span>Try again</span></button></div>${cards}`;
    }
    const all = visible(), culturalCount = [...all, ...visibleLane()].filter((s) => s.cultural?.on).length, shown = S.onlyCultural ? all.filter((s) => s.cultural?.on) : all, hid = hidden();
    const filters = all.length || hid.length || visibleLane().length ? `<div class="hunt-filters"><button type="button" class="hunt-filter" data-hunt="only-cultural" aria-pressed="${S.onlyCultural}"><span>Cultural work</span><span class="hunt-count">${culturalCount}<span class="vh"> findings</span></span></button><small>Found by reading the words in public notices. It does not judge cultural fit, and nobody is contacted.</small></div>` : '';
    const sorted = [...shown.filter((s) => !addedAs(s, enquiries())), ...shown.filter((s) => addedAs(s, enquiries()))].slice(0, SHOWN_MAX);
    const none = !shown.length ? `<p class="hunt-empty"><span>${icon('search')}<span>${S.onlyCultural && all.length ? 'None of today’s findings carry kaupapa Māori or Indigenous words. Press “Cultural work” again to see them all.' : hid.length ? 'Everything found is hidden.' : `Nothing fits right now. ${S.answer?.considered ? `${plural(S.answer.considered, 'open tender')} looked at. ` : ''}New notices are looked at again tomorrow.`}</span></span></p>` : '';
    const more = shown.length > SHOWN_MAX ? `<p class="hunt-dim">${shown.length - SHOWN_MAX} more fit but are not shown. Tighten the words or regions to see the best ones.</p>` : '';
    const hiddenList = hid.length ? `<div class="hunt-hidden"><button type="button" class="hunt-link" data-hunt="toggle-hidden" aria-expanded="${S.showHidden}">${icon('eye')}<span>${S.showHidden ? 'Hide the hidden' : `${hid.length} hidden as not for us`}</span></button>${S.showHidden ? `<ul>${hid.map((s) => `<li><span>${esc(s.title)}</span><button type="button" class="hunt-link" data-hunt="back" data-id="${esc(s.id)}">Bring back</button></li>`).join('')}</ul>` : ''}</div>` : '';
    return `${sourcesNote}${filters}${shown.length ? `<ul class="hunt-cards" role="list">${sorted.map(cardHtml).join('')}</ul>` : none}${more}${laneHtml()}${hiddenList}`;
  }

  function html() {
    const empty = huntIsEmpty(S.settings) && S.phase !== 'idle';
    const kw = S.settings.keywords.length + S.settings.sectors.length + S.settings.regions.length + (S.settings.cultural ? 1 : 0);
    const flash = S.flash ? `<p class="hunt-flash${S.flash.error ? ' is-error' : ''}" role="${S.flash.error ? 'alert' : 'status'}">${icon(S.flash.error ? 'alert' : 'check')}<span>${esc(S.flash.text)}</span></p>` : '';
    return `<section class="hunt" aria-labelledby="hunt-h" data-state="${S.phase}${empty ? '-empty' : ''}">
      <header class="hunt-head">
        <div class="hunt-head-t"><h2 id="hunt-h" class="hunt-h">${icon('search')}<span>Found work</span>${signals().length && !empty ? `<span class="hunt-count">${visible().length}<span class="vh"> findings</span></span>` : ''}</h2>
          <p class="hunt-sub">Finds tenders, news leads and early signals that look like work for the practice. Add the good ones to the pipeline. Nothing is contacted or sent.</p></div>
        <div class="hunt-head-a">${lookedAt() ? `<p class="hunt-looked">${icon('clock', 'hunt-i-s')}<span>${esc(lookedAt())}</span></p>` : ''}
          ${empty || S.phase === 'error' ? '' : `<button type="button" class="hunt-btn" data-hunt="look" data-force="1"${S.phase === 'loading' ? ' disabled' : ''}>${icon('refresh')}<span>Look again</span></button>`}
          ${empty && canEdit && !S.panel ? '' : `<button type="button" class="hunt-btn" data-hunt="open-settings" aria-expanded="${S.panel}">${icon('sliders')}<span>What to look for</span>${kw ? `<span class="hunt-count">${kw}</span>` : ''}</button>`}</div>
      </header>
      ${flash}${S.panel ? settingsHtml() + readerHtml() : ''}
      ${S.phase === 'idle' ? '' : alertsHtml()}
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
    if (act === 'only-cultural') { S.onlyCultural = !S.onlyCultural; S.announce = S.onlyCultural ? 'Showing cultural work only.' : 'Showing all findings.'; draw(); return true; }
    if (act === 'toggle-hidden') { S.showHidden = !S.showHidden; draw(); return true; }
    if (act === 'read-alert') { const t = S.alerts.text.trim(); if (!t) { S.alerts.error = true; S.alerts.msg = 'Paste the email text first, or choose a file.'; draw(); } else await addAlerts([t]); return true; }
    if (act === 'make-reader') { await makeReader(); return true; }
    if (act === 'stop-reader') { await stopReader(); return true; }
    if (act === 'copy-script') { await copyScript(); return true; }
    if (act === 'hide-script') { S.reader.token = ''; S.reader.msg = ''; draw(); return true; }
    if (act === 'look') { S.flash = null; await look({ force: true }); return true; }
    if (act === 'open-settings') { S.panel = !S.panel; S.flash = null; if (!S.panel) S.reader.token = ''; draw(); if (S.panel) loadReader().then(draw); return true; }
    if (act === 'close-settings') { S.panel = false; S.reader.token = ''; draw(); return true; }
    return false;
  }
  async function submit(ev) {
    const form = ev.target?.closest?.('form[data-hunt-form]');
    if (!form) return false;
    ev.preventDefault();
    if (!canEdit) return true;
    const fd = new FormData(form), sources = fd.getAll('sources');
    try {
      await saveSettings({ keywords: String(fd.get('keywords') ?? ''), sectors: fd.getAll('sectors'), regions: fd.getAll('regions'), min: String(fd.get('min') ?? '').trim(), max: String(fd.get('max') ?? '').trim(), sources: Object.fromEntries(SOURCES.map((s) => [s.id, sources.includes(s.id)])), cultural: fd.get('cultural') === '1' });
      rankAlerts(); S.panel = false; S.flash = { text: 'Saved. Looking at the notices again.' };
      await look({ force: true });
    } catch (err) { S.flash = { error: true, text: String(err?.message ?? err) }; draw(); }
    return true;
  }

  return {
    html, start, click, submit, look, add, addAlerts, addFiles, loadInbox, notForUs, bringBack, saveSettings, loadSettings,
    stop() { gone = true; run++; listen(false); },
    get state() { return S; },
  };
}
