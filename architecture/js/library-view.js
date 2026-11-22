// The Library section's screen (loaded by library.js when a project's Presentation tab is first shown). Big studio
// pictures in one horizontal scroller per category (or one grid), a detail card for each piece, and the project's
// selection board. Picks are kept through the store (selections.js); the board hands them to the 3D page.

import { selectionsOf, addPick, removePick, pickCount, canPick, saveSelections, selectionsHandoff, picksHref, ROOM_CHOICES, MANIFEST_URL } from './selections.js';
import { twinLink, twinHandoff, SAMPLE_ID } from './model.js';

let manifest = null; // { base, categories, items }
const S = {
  view: 'rows',     // 'rows' | 'grid'
  cat: 'all',       // a category id, or 'all'
  open: '',         // the piece whose detail card is open
  finish: '',       // the finish chosen on the open card
  qty: 1,
  room: '',
  note: new Map(),  // project id -> { tone, text }
  scroll: new Map(),// category id -> scrollLeft, kept across a redraw
  plan: new Map(),  // project id -> { key, value } the plan model's session entry, when the model is a kept file
  busy: false,
};

function ensureCss() {
  if (document.querySelector('link[data-library-css]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = new URL('../library.css?v=1', import.meta.url).href; l.dataset.libraryCss = '';
  document.head.append(l);
}
async function loadManifest() {
  if (manifest) return manifest;
  const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`the catalogue did not load (${res.status})`);
  const m = await res.json();
  if (m?.schema !== 'assembl.library.v1' || !Array.isArray(m.items)) throw new Error('the catalogue is not one this page reads');
  manifest = m;
  return m;
}

const nb = (t) => String(t).replace(/ × /g, ' × ').replace(/ mm$/, ' mm');
const size = (d) => nb(`${d.w} × ${d.d} × ${d.h} mm`);
const isSample = (p) => !!p?.sample || p?.id === SAMPLE_ID;
const who = (ctx) => (typeof ctx.me === 'function' ? ctx.me() : ctx.me) || '';
function placeOf(ctx, p) {
  const shared = !!ctx.store.shared;
  return { can: canPick({ shared, sample: isSample(p), role: ctx.practice?.role ?? '' }), practice: ctx.practice?.name ?? 'this practice' };
}

const wired = new WeakMap(); // section element -> the listeners on it now

/** draw the section; returns a cleanup */
export async function renderLibrary(el, ctx) {
  ensureCss();
  wired.get(el)?.();
  wired.delete(el);
  const esc = ctx.esc;
  el.innerHTML = '<p class="small lib-wait">Opening the library…</p>';
  const m = await loadManifest();
  const p = (await ctx.store.get('project', ctx.project.id)) ?? ctx.project;
  const picks = selectionsOf(p), place = placeOf(ctx, p), byId = new Map(m.items.map((x) => [x.id, x]));
  if (!m.categories.some((c) => c.id === S.cat)) S.cat = 'all';
  await preparePlan(ctx, p);
  const pic = (it) => `${m.base}${it.pic}`;
  const card = (it, eager = false) => `<button type="button" class="lib-card" data-lib="open" data-id="${esc(it.id)}" aria-haspopup="dialog">
      <span class="lib-pic"><img src="${esc(pic(it))}" alt="" width="800" height="800" ${eager ? '' : 'loading="lazy" '}decoding="async" /></span>
      <span class="lib-t">${esc(it.title)}</span><span class="lib-m">${size(it.dims)}</span></button>`;
  const cats = m.categories.map((c) => ({ ...c, items: m.items.filter((x) => x.category === c.id) })).filter((c) => c.items.length);
  const shown = S.cat === 'all' ? cats : cats.filter((c) => c.id === S.cat);
  const rows = shown.map((c, i) => `<section class="lib-cat" aria-labelledby="lc-${esc(c.id)}">
      <div class="lib-cat-h"><h4 id="lc-${esc(c.id)}">${esc(c.title)}</h4><span class="st">${c.items.length}</span>
        <span class="lib-arrows"><button type="button" class="lib-arrow" data-lib="prev" data-cat="${esc(c.id)}" aria-label="Scroll ${esc(c.title)} back">‹</button><button type="button" class="lib-arrow" data-lib="next" data-cat="${esc(c.id)}" aria-label="Scroll ${esc(c.title)} on">›</button></span></div>
      <ul class="lib-row" data-row="${esc(c.id)}" aria-label="${esc(c.title)}">${c.items.map((it, k) => `<li>${card(it, i === 0 && k < 4)}</li>`).join('')}</ul></section>`).join('');
  const grid = `<ul class="lib-grid">${shown.flatMap((c) => c.items).map((it) => `<li>${card(it)}</li>`).join('')}</ul>`;
  const note = S.note.get(p.id);
  el.innerHTML = `<div class="lib" data-lib-root>
    <header class="lib-head"><h3>Library</h3><span class="st">${m.items.length} pieces · studio pictures of the models, not photographs</span></header>
    ${boardHtml(ctx, p, picks, byId, place, m)}
    ${note ? `<p class="flash lib-note" role="status">${esc(note.text)}</p>` : ''}
    <div class="lib-bar">
      <div class="lib-seg" role="group" aria-label="Show the library as"><button type="button" data-lib="view" data-v="rows" aria-pressed="${S.view === 'rows'}">Rows</button><button type="button" data-lib="view" data-v="grid" aria-pressed="${S.view === 'grid'}">Grid</button></div>
      <div class="lib-chips" role="group" aria-label="Category"><button type="button" data-lib="cat" data-c="all" aria-pressed="${S.cat === 'all'}">All</button>${cats.map((c) => `<button type="button" data-lib="cat" data-c="${esc(c.id)}" aria-pressed="${S.cat === c.id}">${esc(c.title)}</button>`).join('')}</div>
    </div>
    ${S.view === 'rows' ? `<div class="lib-rows">${rows}</div>` : grid}
    ${S.open && byId.has(S.open) ? detailHtml(ctx, byId.get(S.open), place, m) : ''}
  </div>`;
  for (const r of el.querySelectorAll('[data-row]')) { const x = S.scroll.get(r.dataset.row); if (x) { r.style.scrollBehavior = 'auto'; r.scrollLeft = x; r.style.scrollBehavior = ''; } }
  wired.set(el, wire(el, ctx, p, picks, byId, place));
  return () => { wired.get(el)?.(); wired.delete(el); };
}

function boardHtml(ctx, p, picks, byId, place, m) {
  const esc = ctx.esc, n = pickCount(picks);
  const link = twinLink(p.model), href = link ? picksHref(link, p.id) : null;
  const ready = !!href && (!link.handoff || S.plan.get(p.id)?.ok);
  const go = !picks.length ? '' : ready
    ? `<a class="btn solid" href="${esc(href)}" target="_blank" rel="opener" data-lib="to3d">See them in 3D ↗</a>`
    : `<span class="small">${link?.handoff ? esc(S.plan.get(p.id)?.why || 'Getting the model ready for the 3D page…') : 'Attach the plan model in the Model tab to see these in 3D.'}</span>`;
  const items = picks.map((s) => {
    const it = byId.get(s.id), fin = it?.finishes?.find((f) => f.id === s.finish);
    return `<li class="lib-pick">${it ? `<img src="${esc(`${m.base}${it.pic}`)}" alt="" width="800" height="800" loading="lazy" decoding="async" />` : '<span class="lib-gone" aria-hidden="true">□</span>'}
      <div class="lib-pick-t"><p class="lib-t">${esc(it?.title ?? `${s.id} (no longer in the library)`)}</p><p class="lib-m">${s.qty} × ${esc(s.room || 'any room')}${fin ? ` · ${esc(fin.label)}` : ''}</p></div>
      ${place.can ? `<button type="button" class="link" data-lib="remove" data-uid="${esc(s.uid)}">Remove<span class="vh"> ${esc(it?.title ?? s.id)}</span></button>` : ''}</li>`;
  }).join('');
  return `<section class="lib-board" aria-labelledby="lib-board-h-${esc(p.id)}">
    <div class="lib-board-h"><h4 id="lib-board-h-${esc(p.id)}">Selections</h4><span class="st">${picks.length ? `■ ${picks.length} piece${picks.length === 1 ? '' : 's'} · ${n} item${n === 1 ? '' : 's'}` : '□ None yet'}</span>${go}</div>
    ${picks.length ? `<ul class="lib-strip">${items}</ul>` : `<p class="small">${place.can ? 'Nothing picked yet. Tap a piece below, then Add to this project.' : 'Nothing picked yet.'}</p>`}
    ${place.can ? '' : `<p class="small lib-viewer">□ You are a viewer in ${esc(place.practice)}: you can look at the library and the picks, not change them.</p>`}
  </section>`;
}

function detailHtml(ctx, it, place, m) {
  const esc = ctx.esc, fins = it.finishes ?? [];
  if (!fins.some((f) => f.id === S.finish)) S.finish = fins[0]?.id ?? '';
  const room = ROOM_CHOICES.includes(S.room) ? S.room : (ROOM_CHOICES.includes(it.rooms?.[0]) ? it.rooms[0] : '');
  return `<div class="lib-scrim" data-lib="close"></div>
  <div class="lib-detail" role="dialog" aria-modal="true" aria-labelledby="lib-d-t">
    <button type="button" class="lib-x" data-lib="close" aria-label="Close">×</button>
    <figure class="lib-d-pic"><img src="${esc(`${m.base}${it.pic}`)}" alt="${esc(it.title)}: a studio picture of the model" width="800" height="800" /></figure>
    <div class="lib-d-body">
      <h3 id="lib-d-t">${esc(it.title)}</h3>
      <dl class="lib-dl">
        <dt>Size</dt><dd class="mono">W ${it.dims.w} × D ${it.dims.d} × H ${it.dims.h} mm</dd>
        <dt>Made of</dt><dd>${esc(it.material)}</dd>
        <dt>Usually in</dt><dd>${esc((it.rooms ?? []).join(', ') || 'any room')}</dd>
      </dl>
      ${fins.length ? `<fieldset class="lib-fins"><legend>Finish</legend>${fins.map((f) => `<label class="lib-fin"><input type="radio" name="lib-fin" value="${esc(f.id)}"${f.id === S.finish ? ' checked' : ''}${place.can ? '' : ' disabled'} /><span class="lib-sw" style="background:${esc(/^#[0-9a-f]{6}$/i.test(f.swatch) ? f.swatch : '#cccccc')}"></span><span>${esc(f.label)}</span></label>`).join('')}</fieldset>
        <p class="small">The picture shows the first finish.</p>` : ''}
      ${place.can ? `<div class="lib-add">
        <label>Quantity<span class="lib-qty"><button type="button" data-lib="qty" data-d="-1" aria-label="One fewer">−</button><input type="number" id="lib-qty" min="1" max="99" value="${S.qty}" inputmode="numeric" /><button type="button" data-lib="qty" data-d="1" aria-label="One more">+</button></span></label>
        <label>Room<select id="lib-room"><option value="">Any room</option>${ROOM_CHOICES.map((r) => `<option${r === room ? ' selected' : ''}>${r}</option>`).join('')}</select></label>
        <button type="button" class="btn solid" data-lib="add" data-id="${esc(it.id)}">Add to this project</button></div>` : '<p class="small">Viewers can look, not add.</p>'}
      <p class="small lib-credit">${esc(it.credit)}. ${esc(it.licence)}.</p>
    </div>
  </div>`;
}

/** the plan model's session entry, when the project's model is a kept file (as app.js ready3d does for Open in 3D) */
async function preparePlan(ctx, p) {
  const link = twinLink(p.model);
  if (!link?.handoff) return;
  const have = S.plan.get(p.id);
  if (have && have.fp === p.model.fingerprint) return;
  try {
    const f = await ctx.store.getFile(p.model.file.id);
    if (!f) throw new Error('The model file is not here, so the 3D page cannot open it from this button.');
    const h = twinHandoff(new TextDecoder().decode(f.data), p.model.file_name);
    S.plan.set(p.id, { ok: true, fp: p.model.fingerprint, key: h.key, value: h.value });
  } catch (err) { S.plan.set(p.id, { ok: false, fp: p.model.fingerprint, why: err.message }); }
}

function wire(el, ctx, p, picks, byId, place) {
  const again = () => renderLibrary(el, ctx);
  const keepScroll = () => { for (const r of el.querySelectorAll('[data-row]')) S.scroll.set(r.dataset.row, r.scrollLeft); };
  const say = (tone, text) => S.note.set(p.id, { tone, text });
  const onClick = async (e) => {
    const b = e.target.closest('[data-lib]');
    if (!b || !el.contains(b)) return;
    const what = b.dataset.lib;
    if (what === 'open') { keepScroll(); S.open = b.dataset.id; S.qty = 1; S.room = ''; S.finish = ''; await again(); el.querySelector('.lib-x')?.focus(); return; }
    if (what === 'close') { keepScroll(); const back = S.open; S.open = ''; await again(); el.querySelector(`.lib-card[data-id="${CSS.escape(back)}"]`)?.focus(); return; }
    if (what === 'view') { S.view = b.dataset.v; return again(); }
    if (what === 'cat') { S.cat = b.dataset.c; S.scroll.clear(); return again(); }
    if (what === 'prev' || what === 'next') { const r = el.querySelector(`[data-row="${CSS.escape(b.dataset.cat)}"]`); r?.scrollBy({ left: (what === 'next' ? 1 : -1) * Math.max(240, r.clientWidth * 0.8), behavior: 'smooth' }); return; }
    if (what === 'qty') { const i = el.querySelector('#lib-qty'); i.value = String(Math.max(1, Math.min(99, (Number(i.value) || 1) + Number(b.dataset.d)))); S.qty = Number(i.value); return; }
    if (what === 'to3d') {
      // session storage first: the new tab starts with a copy of this tab's
      try {
        const h = selectionsHandoff(p, picks);
        sessionStorage.setItem(h.key, h.value);
        const plan = S.plan.get(p.id);
        if (plan?.ok) sessionStorage.setItem(plan.key, plan.value);
      } catch { e.preventDefault(); say('error', 'This browser would not pass the picks across (its storage is blocked).'); await again(); }
      return;
    }
    if (S.busy) return;
    if (what === 'add' && place.can) {
      const it = byId.get(b.dataset.id);
      const qty = Math.max(1, Math.min(99, Math.round(Number(el.querySelector('#lib-qty')?.value) || 1)));
      const room = el.querySelector('#lib-room')?.value ?? '';
      const finish = el.querySelector('input[name="lib-fin"]:checked')?.value ?? '';
      S.busy = true;
      try {
        const next = addPick(picks, { id: it.id, qty, room, finish, who: who(ctx) });
        await saveSelections(ctx.store, p.id, next, { who: who(ctx), action: 'Picked from the library', detail: `${qty} × ${it.title}${room ? `, ${room}` : ''}` });
        say('ok', `Added ${qty} × ${it.title}${room ? ` to ${room}` : ''}.`);
        keepScroll(); S.open = '';
      } catch (err) { say('error', err.message); }
      finally { S.busy = false; }
      return again();
    }
    if (what === 'remove' && place.can) {
      const s = picks.find((x) => x.uid === b.dataset.uid), it = s && byId.get(s.id);
      S.busy = true;
      try {
        await saveSelections(ctx.store, p.id, removePick(picks, b.dataset.uid), { who: who(ctx), action: 'Removed from the selections', detail: it?.title ?? s?.id ?? '' });
        say('ok', `Removed ${it?.title ?? 'that piece'} from the selections.`);
      } catch (err) { say('error', err.message); }
      finally { S.busy = false; }
      keepScroll();
      return again();
    }
  };
  const onChange = (e) => {
    if (e.target.name === 'lib-fin') S.finish = e.target.value;
    if (e.target.id === 'lib-room') S.room = e.target.value;
    if (e.target.id === 'lib-qty') S.qty = Math.max(1, Math.min(99, Math.round(Number(e.target.value) || 1)));
  };
  const onKey = (e) => { if (e.key === 'Escape' && S.open) { e.preventDefault(); el.querySelector('.lib-x')?.click(); } };
  el.addEventListener('click', onClick);
  el.addEventListener('change', onChange);
  document.addEventListener('keydown', onKey);
  return () => { el.removeEventListener('click', onClick); el.removeEventListener('change', onChange); document.removeEventListener('keydown', onKey); };
}
