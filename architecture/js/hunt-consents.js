// "Building consents": the panel in Found work, under "Rule changes coming". Monthly building consents from Stats NZ, by region: the latest month, the value of
// non-residential consents and its top three building types, new dwellings, each with the change on the same month a year earlier (in words as well as arrows).
// Consents are permission to build, not a commission: the panel says so, and has no "Add to pipeline". Read-only: nothing is contacted or saved but a day's copy of the figures.
//
// hunt.js draws this in a clearly separate block: it asks createConsentsLane(...) for html(), start() and click(). The feed is /api/live/?feeds=consents
// (api/_feeds/consents.js). The practice's regions (from its lens) come first, in the order it set them, then New Zealand.
const FEED = '/api/live/';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const dayOf = (d) => { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
export const CONSENTS_SETTING = { cache: (scope) => `hunt-consents-cache:${scope}` };
export const COPY = 'Building consents are permission to build, not a commission. They can show where work is coming.';
export const LICENCE_NAME = 'Creative Commons Attribution 4.0 International';
const LICENCE_URL = 'https://creativecommons.org/licenses/by/4.0/';

let cssReady = null;
/** the panel's own stylesheet, so hunt.css and its version stay as they are */
export function ensureConsentsCss() {
  if (typeof document === 'undefined') return Promise.resolve();
  if (cssReady) return cssReady;
  const href = new URL('../hunt-consents.css?v=1', import.meta.url).href;
  const existing = [...document.querySelectorAll('link[rel="stylesheet"]')].find((l) => l.dataset.huntConsents === '1');
  const link = existing ?? Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
  link.dataset.huntConsents = '1';
  cssReady = new Promise((resolve) => {
    if (existing && existing.sheet) return resolve();
    link.addEventListener('load', () => resolve(), { once: true }); link.addEventListener('error', () => resolve(), { once: true });
    setTimeout(resolve, 2500);
    if (!existing) document.head.append(link);
  });
  return cssReady;
}

// ---- words and numbers (plain NZ English, NZD) -----------------------------------------------------------------------------------------------
const num = (n) => (Number.isFinite(n) ? n : null);
/** $96 million, $1.2 billion, $850 thousand: whole words, no symbols that need explaining. */
export function money(n) {
  n = num(n); if (n == null) return 'no figure';
  const dp = (x) => (x >= 100 ? Math.round(x) : Math.round(x * 10) / 10).toLocaleString('en-NZ', { maximumFractionDigits: 1 });
  if (n >= 1e9) return `$${dp(n / 1e9)} billion`;
  if (n >= 1e6) return `$${dp(n / 1e6)} million`;
  if (n >= 1e3) return `$${Math.round(n / 1e3).toLocaleString('en-NZ')} thousand`;
  return `$${Math.round(n).toLocaleString('en-NZ')}`;
}
export const count = (n, one, many) => (num(n) == null ? 'no figure' : `${Math.round(n).toLocaleString('en-NZ')} ${Math.round(n) === 1 ? one : many}`);
/** { dir, text } for a change on a year earlier. The words carry the meaning; the arrow is a second signal. */
export function changeWords(yoy, against) {
  const a = String(against || 'a year earlier');
  if (!yoy || !yoy.dir) return { dir: 'none', text: `no figure for ${a} to compare` };
  if (yoy.dir === 'same') return { dir: 'same', text: `about the same as ${a}` };
  if (yoy.pct == null) return { dir: yoy.dir, text: `up from none in ${a}` };
  const p = Math.abs(yoy.pct), shown = p >= 10 ? Math.round(p) : Math.round(p * 10) / 10;
  return { dir: yoy.dir, text: `${yoy.dir} ${shown.toLocaleString('en-NZ')}% on ${a}` };
}
const ARROW = { up: '<path d="M12 19V6M6.500 11.500 12 6l5.500 5.500"/>', down: '<path d="M12 5v13M6.500 12.500 12 18l5.500-5.500"/>', same: '<path d="M5 9.500h14M5 14.500h14"/>', none: '<path d="M7 12h10"/>' };
const arrow = (dir) => `<svg class="hc-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ARROW[dir] ?? ARROW.none}</svg>`;
const chg = (yoy, against) => { const c = changeWords(yoy, against); return `<span class="hc-chg is-${esc(c.dir)}">${arrow(c.dir)}<span>${esc(c.text)}</span></span>`; };

// ---- cleaning what the feed sent (it is data, not markup) -------------------------------------------------------------------------------------
const txt = (s, n = 80) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
const cleanYoy = (y) => ({ pct: Number.isFinite(y?.pct) ? y.pct : null, dir: ['up', 'down', 'same'].includes(y?.dir) ? y.dir : null });
export function cleanScope(s) {
  if (!s || typeof s !== 'object') return null;
  const name = txt(s.name, 60); if (!name) return null;
  const types = (Array.isArray(s.types) ? s.types : []).slice(0, 3).map((t) => ({ key: txt(t?.key, 20), label: txt(t?.label, 40), value: num(t?.value), count: num(t?.count), yoy: cleanYoy(t?.yoy) })).filter((t) => t.label && t.value != null);
  return { name, national: !!s.national, month: txt(s.month, 20), against: txt(s.against, 20), period: txt(s.period, 7),
    nonres: { value: num(s.nonres?.value), valueYoy: cleanYoy(s.nonres?.valueYoy), count: num(s.nonres?.count), countYoy: cleanYoy(s.nonres?.countYoy) },
    types, dwellings: { count: num(s.dwellings?.count), yoy: cleanYoy(s.dwellings?.yoy) } };
}
/** The practice's regions first, in the order it set them (those the table has no figure for are named in `missing`), then New Zealand. */
export function orderScopes(regions, national, lensRegions = []) {
  const by = new Map(regions.map((r) => [r.name, r])), seen = new Set(), out = [], missing = [];
  for (const n of lensRegions) { if (seen.has(n)) continue; seen.add(n); if (by.has(n)) out.push(by.get(n)); else missing.push(n); }
  if (national) out.push(national);
  return { scopes: out, missing };
}

/**
 * The panel for one Clients screen.
 *   ctx   the page's ctx
 *   opts  { regions(): the practice's regions, redraw(), fetch, now, readKept(id), writeKept(id, value), scope }
 */
export function createConsentsLane(ctx, { regions = () => [], redraw = () => {}, fetch: fetchImpl = (...a) => globalThis.fetch(...a), now = () => new Date(), readKept = async () => null, writeKept = async () => {}, scope = 'browser' } = {}) {
  const S = { phase: 'idle', regions: [], national: null, needsKey: false, error: '', licence: LICENCE_NAME, fetchedAt: '', all: false };
  let gone = false, run = 0;
  const draw = () => { if (!gone) redraw(); };

  async function readFeed() {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null, timer = ctl ? setTimeout(() => ctl.abort(), 40000) : null;
    let res;
    try { res = await fetchImpl(`${FEED}?feeds=consents`, { headers: { accept: 'application/json' }, signal: ctl?.signal }); }
    catch (e) { throw new Error(e?.name === 'AbortError' ? 'Building consents took too long to answer. Try again in a minute.' : 'Building consents could not be reached. Check the connection and try again.'); }
    finally { if (timer) clearTimeout(timer); }
    if (!res.ok) throw new Error(`Building consents are not answering just now (${res.status}). Try again in a few minutes.`);
    const f = (await res.json())?.feeds?.consents;
    if (!f) throw new Error('Building consents did not answer. Try again in a minute.');
    if (f.error) throw new Error(txt(f.error, 200));
    const v = f.values ?? {};
    return { needsKey: !!v.needsKey, regions: (Array.isArray(v.regions) ? v.regions : []).slice(0, 20).map(cleanScope).filter(Boolean), national: cleanScope(v.national),
      licence: txt(f.licence?.name, 100) || LICENCE_NAME, fetchedAt: txt(f.fetchedAt, 40) };
  }

  async function look({ force = false } = {}) {
    const mine = ++run, kept = await readKept(CONSENTS_SETTING.cache(scope));
    if (!force && kept && kept.day === dayOf(now()) && Array.isArray(kept.regions)) {
      S.regions = kept.regions.map(cleanScope).filter(Boolean); S.national = cleanScope(kept.national); S.licence = txt(kept.licence, 100) || LICENCE_NAME; S.fetchedAt = txt(kept.fetchedAt, 40); S.needsKey = false; S.phase = 'ready'; return draw();
    }
    S.phase = 'loading'; draw();
    try {
      const r = await readFeed(); if (mine !== run) return;
      Object.assign(S, { regions: r.regions, national: r.national, needsKey: r.needsKey, licence: r.licence, fetchedAt: r.fetchedAt || now().toISOString(), error: '', phase: 'ready' });
      if (!r.needsKey && (r.regions.length || r.national)) await writeKept(CONSENTS_SETTING.cache(scope), { day: dayOf(now()), regions: S.regions, national: S.national, licence: S.licence, fetchedAt: S.fetchedAt });
    } catch (e) { if (mine !== run) return; S.phase = 'error'; S.error = String(e?.message ?? e); }
    draw();
  }
  async function start() { ensureConsentsCss(); await look(); }

  function cardHtml(s) {
    const n = s.nonres, hid = `hc-${esc(s.name.replace(/[^A-Za-z]+/g, '-'))}`;
    const types = s.types.length ? `<ol class="hc-types">${s.types.map((t) => `<li><span class="hc-tn">${esc(t.label)}</span><span class="hc-tv">${esc(money(t.value))}</span>${chg(t.yoy, s.against)}</li>`).join('')}</ol>` : `<p class="hc-none">No building types to show for this month.</p>`;
    return `<li class="hc-card${s.national ? ' is-national' : ''}" data-scope="${esc(s.name)}" aria-labelledby="${hid}">
      <div class="hc-top"><h4 id="${hid}" class="hc-name">${esc(s.name)}</h4><span class="hc-month">${esc(s.month)}</span></div>
      <div class="hc-row"><p class="hc-lab">Non-residential consents</p><p class="hc-big">${esc(money(n.value))}</p>${chg(n.valueYoy, s.against)}${n.count != null ? `<p class="hc-sub">${esc(count(n.count, 'building', 'buildings'))}</p>` : ''}</div>
      <div class="hc-row"><p class="hc-lab">Biggest building types, by value</p>${types}</div>
      <div class="hc-row"><p class="hc-lab">New dwellings</p><p class="hc-big">${esc(count(s.dwellings.count, 'dwelling', 'dwellings'))}</p>${chg(s.dwellings.yoy, s.against)}</div>
    </li>`;
  }

  function html() {
    if (S.phase === 'idle') return '';
    const lens = regions() ?? [], { scopes, missing } = orderScopes(S.regions, S.national, S.all ? [...S.regions.map((r) => r.name)] : lens);
    const noLens = !lens.length && !S.all, list = noLens ? scopes.filter((x) => x.national) : scopes;
    let body;
    if (S.phase === 'loading' && !scopes.length) body = `<p class="hunt-empty"><span><span>Looking at building consents…</span></span></p>`;
    else if (S.phase === 'error' && !scopes.length) body = `<p class="hunt-flash is-error" role="alert"><span>${esc(S.error || 'Building consents did not answer.')}</span></p>`;
    else if (S.needsKey && !scopes.length) body = `<p class="hunt-empty"><span><span>Building consents are not switched on yet. They need a free key from Stats NZ, which an assembl owner adds. Nothing has been read.</span></span></p>`;
    else if (!list.length) body = `<p class="hunt-empty"><span><span>No building consent figures came back. Try again in a few minutes.</span></span></p>`;
    else body = `<ul class="hc-cards" role="list">${list.map(cardHtml).join('')}</ul>`;
    const notes = [noLens && S.regions.length ? 'Pick regions in “What to look for” to see them here first, or show every region.' : '', !noLens && S.regions.length && missing.length ? `No figures came back for ${missing.join(', ')}.` : ''].filter(Boolean)
      .map((t) => `<p class="hunt-dim">${esc(t)}</p>`).join('');
    const toggle = S.regions.length && (lens.length || S.all || S.regions.length > 1) ? `<button type="button" class="hunt-link hc-toggle" data-consents="all" aria-pressed="${S.all}">${S.all ? 'Show only my regions' : 'Show every region'}</button>` : '';
    return `<section class="hunt-lane hunt-consents" aria-labelledby="hunt-consents-h" data-consents-lane>
      <h3 id="hunt-consents-h" class="hunt-lane-h"><span>Building consents</span>
        <button type="button" class="hunt-btn hc-again" data-consents="look"${S.phase === 'loading' ? ' disabled' : ''}><span>Check again</span></button></h3>
      <p class="hunt-lane-note">${esc(COPY)} Values are in New Zealand dollars. Each change compares the month with the same month a year earlier.</p>
      ${body}${notes}${toggle}
      <p class="hunt-credit">Stats NZ, licensed under <a href="${esc(LICENCE_URL)}" target="_blank" rel="noopener noreferrer">${esc(S.licence)}</a>. Source: <a href="https://explore.data.stats.govt.nz/" target="_blank" rel="noopener noreferrer">Aotearoa Data Explorer</a>. Changes on a year earlier are worked out by assembl.</p>
    </section>`;
  }

  async function click(ev) {
    const t = ev.target?.closest?.('[data-consents]');
    if (!t) return false;
    if (t.dataset.consents === 'look') { await look({ force: true }); return true; }
    if (t.dataset.consents === 'all') { S.all = !S.all; draw(); return true; }
    return false;
  }
  return { html, start, click, look, stop() { gone = true; run++; }, get state() { return S; } };
}
