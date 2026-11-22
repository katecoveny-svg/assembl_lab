// "Rule changes coming": the lane in Found work, under "Leads and early signals". NZ legislation and bills that may change how buildings are
// designed, consented, funded or protected. Read-only: nothing is contacted. A person can note a rule on a project (a line in that project's
// activity) or hide it with "Not for us". There is no "Add to pipeline": a rule is not work.
//
// hunt.js draws this in a clearly separate block: it asks createRulesLane(...) for html(), start() and click(). The rules are in rules-rank.js;
// the feed is /api/live/?feeds=rules (api/_feeds/rules.js). Signed in, the bills the radar collected (arch.hunt_rules) join the legislation;
// signed out there is legislation only.
import { filterRules, topicCounts, mergeRules, rankBillRows, cleanRule, noteText, TOPICS, NOT_LEGAL_ADVICE } from './rules-rank.js';
import { cleanDismissed, dismiss, restore } from './hunt-model.js';
import { activity } from './model.js';
import { icon as pageIcon } from './icons.js';
import { shortDay } from './crm-model.js';

const FEED = '/api/live/';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const SHOWN = 12;
const dayOf = (d) => { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
export const RULES_SETTING = { dismissed: (scope) => `hunt-rules-dismissed:${scope}`, cache: (scope) => `hunt-rules-cache:${scope}` };

let cssReady = null;
/** the lane's own stylesheet, so hunt.css and its version stay as they are */
export function ensureRulesCss() {
  if (typeof document === 'undefined') return Promise.resolve();
  if (cssReady) return cssReady;
  const href = new URL('../hunt-rules.css?v=4', import.meta.url).href;
  const existing = [...document.querySelectorAll('link[rel="stylesheet"]')].find((l) => l.dataset.huntRules === '1');
  const link = existing ?? Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
  link.dataset.huntRules = '1';
  cssReady = new Promise((resolve) => {
    if (existing && existing.sheet) return resolve();
    link.addEventListener('load', () => resolve(), { once: true }); link.addEventListener('error', () => resolve(), { once: true });
    setTimeout(resolve, 2500);
    if (!existing) document.head.append(link);
  });
  return cssReady;
}

const I = {
  alert: '<path d="M12 4 3 19.500h18L12 4Z"/><path d="M12 10v4.500M12 17v.3"/>',
  refresh: '<path d="M19.5 12a7.500 7.500 0 1 1-2.200-5.300M19.500 4.500v4h-4"/>',
  book: '<path d="M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2zM5 20a2 2 0 0 0 2 1h12v-3M9 7.500h6"/>',
  note: '<path d="M6 3.500h9l4 4V20.500H6zM15 3.500v4h4M9 12h7M9 15.500h5"/>',
  out: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  pin: '<path d="M12 21s6.500-5.800 6.500-11a6.500 6.500 0 0 0-13 0c0 5.200 6.500 11 6.500 11Z"/><circle cx="12" cy="10" r="2.300"/>',
  clock: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>',
  eye: '<path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12Z"/><circle cx="12" cy="12" r="2.800"/>',
};
const icon = (n, cls = '') => `<svg class="hunt-i ${cls}" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${I[n] ?? ''}</svg>`;

/**
 * The lane for one Clients screen.
 *   ctx   the page's ctx: { store, account, practice, me }
 *   opts  { regions(): the practice's regions, readOnly, redraw(), fetch, now, readKept(id), writeKept(id, value), scope }
 */
export function createRulesLane(ctx, { regions = () => [], readOnly = false, redraw = () => {}, fetch: fetchImpl = (...a) => globalThis.fetch(...a), now = () => new Date(), readKept = async () => null, writeKept = async () => {}, scope = 'browser' } = {}) {
  const S = { phase: 'idle', legislation: [], bills: [], sources: [], billsNote: '', fetchedAt: '', topic: null, dismissed: {}, showHidden: false, picker: null, projects: [], flash: null, busy: new Set() };
  let gone = false, run = 0;
  const draw = () => { if (!gone) redraw(); };
  const signedIn = () => !!ctx.practice && typeof ctx.account?.huntRules === 'function';

  async function readFeed() {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null, timer = ctl ? setTimeout(() => ctl.abort(), 40000) : null;
    let res;
    try { res = await fetchImpl(`${FEED}?feeds=rules`, { headers: { accept: 'application/json' }, signal: ctl?.signal }); }
    catch (e) { throw new Error(e?.name === 'AbortError' ? 'Legislation took too long to answer. Try again in a minute.' : 'Legislation could not be reached. Check the connection and try again.'); }
    finally { if (timer) clearTimeout(timer); }
    if (!res.ok) throw new Error(`Legislation is not answering just now (${res.status}). Try again in a few minutes.`);
    const f = (await res.json())?.feeds?.rules;
    if (!f) throw new Error('Legislation did not answer. Try again in a minute.');
    if (f.error) throw new Error(String(f.error));
    const v = f.values ?? {};
    return { rules: (Array.isArray(v.rules) ? v.rules : []).map(cleanRule).filter(Boolean).slice(0, 40), sources: (Array.isArray(v.sources) ? v.sources : []).slice(0, 4).map((x) => ({ id: String(x.id ?? '').slice(0, 20), name: String(x.name ?? '').slice(0, 80), ok: !!x.ok, needsKey: !!x.needsKey, error: String(x.error ?? '').slice(0, 300) })), fetchedAt: f.fetchedAt };
  }
  async function readBills() {
    const rows = await ctx.account.huntRules();
    return rankBillRows(rows, { now: now() }).rules.map(cleanRule).filter(Boolean);
  }

  async function look({ force = false } = {}) {
    const mine = ++run;
    const query = `rules:${signedIn() ? 'members' : 'public'}`, kept = await readKept(RULES_SETTING.cache(scope));
    if (!force && kept && kept.query === query && kept.day === dayOf(now()) && Array.isArray(kept.legislation)) {
      S.legislation = kept.legislation.map(cleanRule).filter(Boolean); S.bills = (kept.bills ?? []).map(cleanRule).filter(Boolean); S.sources = kept.sources ?? []; S.billsNote = kept.billsNote ?? ''; S.fetchedAt = kept.fetchedAt; S.phase = 'ready'; return draw();
    }
    S.phase = 'loading'; draw();
    const [feed, bills] = await Promise.allSettled([readFeed(), signedIn() ? readBills() : Promise.resolve([])]);
    if (mine !== run) return;
    if (feed.status === 'rejected' && !(bills.status === 'fulfilled' && bills.value.length)) { S.phase = 'error'; S.flash = { error: true, text: String(feed.reason?.message ?? feed.reason) }; return draw(); }
    S.legislation = feed.status === 'fulfilled' ? feed.value.rules : [];
    S.sources = feed.status === 'fulfilled' ? feed.value.sources : [{ id: 'legislation', name: 'NZ Legislation', ok: false, needsKey: false, error: String(feed.reason?.message ?? 'Legislation did not answer just now.') }];
    S.bills = bills.status === 'fulfilled' ? bills.value : [];
    S.billsNote = bills.status === 'rejected' ? 'Bills before Parliament could not be read just now. Try again in a few minutes.' : '';
    S.fetchedAt = (feed.status === 'fulfilled' && feed.value.fetchedAt) || now().toISOString(); S.flash = null; S.phase = 'ready';
    if (feed.status === 'fulfilled' && bills.status === 'fulfilled' && !S.sources.some((x) => x.needsKey)) await writeKept(RULES_SETTING.cache(scope), { query, day: dayOf(now()), legislation: S.legislation, bills: S.bills, sources: S.sources, billsNote: S.billsNote, fetchedAt: S.fetchedAt });
    draw();
  }
  async function start() {
    ensureRulesCss();
    S.dismissed = cleanDismissed(await readKept(RULES_SETTING.dismissed(scope)), now());
    await look();
  }

  const all = () => mergeRules(S.legislation, S.bills);
  const inRegions = () => filterRules(all(), { regions: regions() });
  const shown = () => filterRules(inRegions(), { topic: S.topic }).filter((r) => !S.dismissed[r.id]);
  const hidden = () => inRegions().filter((r) => S.dismissed[r.id]);

  async function loadProjects() {
    try { S.projects = (await ctx.store.list('project')).filter((p) => p?.id).map((p) => ({ id: p.id, name: String(p.name ?? p.title ?? 'Untitled project').slice(0, 80) })).sort((a, b) => a.name.localeCompare(b.name)); }
    catch { S.projects = []; }
  }
  async function noteOn(ruleId, projectId) {
    const r = all().find((x) => x.id === ruleId), p = S.projects.find((x) => x.id === projectId);
    if (!r || !p || readOnly || S.busy.has(ruleId)) return;
    S.busy.add(ruleId); draw();
    try {
      await ctx.store.save('activity', activity(p.id, String(ctx.me ?? '').trim(), 'Rule change noted', noteText(r)));
      S.flash = { text: `Noted “${r.title}” on ${p.name}. It is in that project’s activity. Nothing has been sent.` }; S.picker = null;
    } catch (err) { S.flash = { error: true, text: String(err?.message ?? err) }; }
    S.busy.delete(ruleId); draw();
  }

  function cardHtml(r) {
    const busy = S.busy.has(r.id), open = S.picker === r.id;
    const links = r.formats.filter((f) => f.type === 'html' || f.type === 'pdf').map((f) => `<a class="hunt-link" href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${f.type === 'pdf' ? 'PDF' : r.sourceKind === 'parliament' ? 'Bill page' : 'Read it online'}<span class="vh"> (opens ${esc(r.title)} as ${f.type} in a new tab)</span></a>`).join('');
    const when = r.day ? `Version of ${shortDay(r.day, now())}` : '';
    const picker = open ? `<div class="hunt-rule-pick"><label class="hunt-f"><span>Which project?</span><select data-rules-project>${S.projects.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label>
        <div class="hunt-acts"><button type="button" class="hunt-btn solid" data-rules="note-save" data-id="${esc(r.id)}"${busy ? ' disabled' : ''}>${icon('note')}<span>${busy ? 'Noting…' : 'Add the note'}</span></button><button type="button" class="hunt-link" data-rules="note-cancel">Cancel</button></div></div>` : '';
    const acts = readOnly ? '' : open ? picker : `<div class="hunt-acts"><button type="button" class="hunt-btn solid" data-rules="note" data-id="${esc(r.id)}" aria-label="Note ${esc(r.title)} on a project">${icon('note')}<span>Note it on a project</span></button><button type="button" class="hunt-link" data-rules="no" data-id="${esc(r.id)}" aria-label="Not for us: hide ${esc(r.title)}">Not for us</button></div>`;
    return `<li class="hunt-card is-rule" data-id="${esc(r.id)}" data-kind="rule" data-stage="${esc(r.stage)}">
      <div class="hunt-rule-top">${r.badge ? `<span class="hunt-rule-badge is-${esc(r.badge.toLowerCase().replace(/\s+/g, '-'))}">${esc(r.badge)}</span>` : ''}<span class="hunt-rule-stage">${esc(r.stage)}</span></div>
      <a class="hunt-title" href="${esc(r.sourceUrl)}" target="_blank" rel="noopener noreferrer"><span>${esc(r.title)}</span>${icon('out', 'hunt-i-s')}<span class="vh"> (opens on ${esc(r.source)})</span></a>
      <div class="hunt-meta">${r.status && r.status.toLowerCase() !== (r.badge || '').toLowerCase() ? `<span class="hunt-chip"><span>${esc(r.status)}</span></span>` : ''}${when ? `<span class="hunt-chip">${icon('clock', 'hunt-i-s')}<span>${esc(when)}</span></span>` : ''}${r.region && r.region !== 'New Zealand' ? `<span class="hunt-chip">${icon('pin', 'hunt-i-s')}<span>${esc(r.region)}</span></span>` : ''}</div>
      ${r.agencies.length ? `<p class="hunt-rule-ag"><span class="hunt-rule-lab">Administered by</span> ${esc(r.agencies.join(', '))}</p>` : ''}
      <div class="hunt-rule-may"><p class="hunt-rule-lab">What it may change</p><p class="hunt-reason">${esc(r.why)}</p></div>
      <p class="hunt-rule-links">${links}</p>
      <p class="hunt-notopp">${esc(NOT_LEGAL_ADVICE)}</p>
      ${acts}
    </li>`;
  }

  function html() {
    if (S.phase === 'idle') return '';
    const items = inRegions(), counts = topicCounts(items), list = shown(), hid = hidden();
    const keyOff = S.sources.find((x) => x.needsKey), srcErr = S.sources.filter((x) => !x.ok && !x.needsKey);
    const flash = S.flash ? `<p class="hunt-flash${S.flash.error ? ' is-error' : ''}" role="${S.flash.error ? 'alert' : 'status'}">${icon(S.flash.error ? 'alert' : 'note')}<span>${esc(S.flash.text)}</span></p>` : '';
    const chips = items.length ? `<div class="hunt-filters" role="group" aria-label="Filter rule changes by topic"><button type="button" class="hunt-filter" data-rules="topic" data-topic="" aria-pressed="${S.topic == null}"><span>All</span><span class="hunt-count">${items.length}</span></button>${TOPICS.filter(([k]) => counts[k]).map(([k, l]) => `<button type="button" class="hunt-filter" data-rules="topic" data-topic="${k}" aria-pressed="${S.topic === k}"><span>${esc(l)}</span><span class="hunt-count">${counts[k]}<span class="vh"> rules</span></span></button>`).join('')}</div>` : '';
    let body;
    if (S.phase === 'loading' && !items.length) body = `<p class="hunt-empty"><span>${icon('book')}<span>Looking at legislation…</span></span></p>`;
    else if (S.phase === 'error' && !items.length) body = `<p class="hunt-flash is-error" role="alert">${icon('alert')}<span>${esc(S.flash?.text ?? 'Legislation did not answer.')}</span></p><div class="hunt-acts"><button type="button" class="hunt-btn" data-rules="look">${icon('refresh')}<span>Try again</span></button></div>`;
    else if (keyOff && !items.length) body = `<p class="hunt-empty"><span>${icon('alert')}<span>Legislation is not switched on yet. It needs a free key from the Parliamentary Counsel Office, which an assembl owner adds. Nothing has been read.</span></span></p>`;
    else if (list.length) body = `<ul class="hunt-cards" role="list">${list.slice(0, SHOWN).map(cardHtml).join('')}</ul>${list.length > SHOWN ? `<p class="hunt-dim">${list.length - SHOWN} more are not shown. Pick a topic to narrow them.</p>` : ''}`;
    else body = `<p class="hunt-empty"><span>${icon('book')}<span>${S.topic && items.length ? 'No rule changes under this topic. Press “All” to see the rest.' : hid.length ? 'Everything found is hidden.' : 'No rule changes found that touch buildings, planning or property.'}</span></span></p>`;
    const notes = [keyOff && items.length ? 'Legislation is not switched on yet (it needs a key), so only bills are shown.' : '', ...srcErr.map((x) => x.error), S.billsNote, !signedIn() ? 'Signed out, only legislation shows. Bills before Parliament need the practice’s records: sign in to a practice to see them.' : ''].filter(Boolean)
      .map((t) => `<p class="hunt-dim hunt-rule-note">${icon('alert', 'hunt-i-s')}<span>${esc(t)}</span></p>`).join('');
    const hiddenList = hid.length ? `<div class="hunt-hidden"><button type="button" class="hunt-link" data-rules="toggle-hidden" aria-expanded="${S.showHidden}">${icon('eye')}<span>${S.showHidden ? 'Hide the hidden' : `${hid.length} hidden as not for us`}</span></button>${S.showHidden ? `<ul>${hid.map((s) => `<li><span>${esc(s.title)}</span><button type="button" class="hunt-link" data-rules="back" data-id="${esc(s.id)}">Bring back</button></li>`).join('')}</ul>` : ''}</div>` : '';
    return `<section class="hunt-lane hunt-rules" aria-labelledby="hunt-rules-h" data-rules-lane>
      <h3 id="hunt-rules-h" class="hunt-lane-h">${icon('book')}<span>Rule changes coming</span>${items.length ? `<span class="hunt-count">${items.length}<span class="vh"> rules</span></span>` : ''}
        <button type="button" class="hunt-btn hunt-rules-again" data-rules="look"${S.phase === 'loading' ? ' disabled' : ''}>${icon('refresh')}<span>Check again</span></button></h3>
      <p class="hunt-lane-note">New Zealand legislation and bills that may change how buildings are designed, consented, funded or protected, newest version first. Each says what it may change in our own words; it is a reading of the title, not of the law.</p>
      ${flash}${chips}${body}${notes}${hiddenList}
      <p class="hunt-credit">Legislation from <a href="https://www.legislation.govt.nz/" target="_blank" rel="noopener noreferrer">legislation.govt.nz</a>, Parliamentary Counsel Office. Bills from the <a href="https://bills.parliament.nz/" target="_blank" rel="noopener noreferrer">NZ Parliament</a> bills list.</p>
    </section>`;
  }

  async function click(ev) {
    const t = ev.target?.closest?.('[data-rules]');
    if (!t) return false;
    const act = t.dataset.rules;
    if (act === 'topic') { S.topic = t.dataset.topic || null; S.flash = null; draw(); return true; }
    if (act === 'toggle-hidden') { S.showHidden = !S.showHidden; draw(); return true; }
    if (act === 'look') { S.flash = null; await look({ force: true }); return true; }
    if (act === 'no') { const r = all().find((x) => x.id === t.dataset.id); if (r && !readOnly) { S.dismissed = dismiss(S.dismissed, r, now()); await writeKept(RULES_SETTING.dismissed(scope), S.dismissed); draw(); } return true; }
    if (act === 'back') { S.dismissed = restore(S.dismissed, t.dataset.id, now()); await writeKept(RULES_SETTING.dismissed(scope), S.dismissed); draw(); return true; }
    if (act === 'note') {
      await loadProjects();
      if (!S.projects.length) { S.flash = { error: true, text: 'There is no project to note it on yet. Make a project first, then come back.' }; S.picker = null; }
      else { S.picker = t.dataset.id; S.flash = null; }
      draw(); return true;
    }
    if (act === 'note-cancel') { S.picker = null; draw(); return true; }
    if (act === 'note-save') {
      const sel = t.closest('.hunt-rule-pick')?.querySelector('select[data-rules-project]');
      await noteOn(t.dataset.id, sel?.value); return true;
    }
    return false;
  }

  return { html, start, click, look, noteOn, stop() { gone = true; run++; }, get state() { return S; }, items: all, shown };
}
