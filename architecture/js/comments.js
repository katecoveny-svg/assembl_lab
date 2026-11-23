// Comments in the workspace: a rail beside the large file viewer (Files and Hand-off), numbered pins on a still, and the Team
// tab (a project's comments and its activity). Plain text only; a link in a comment is shown as text, never clickable.
//
// Where comments are kept (comments-store.js): signed in with a practice, they are the practice's (members write, owners hide or
// delete; the database decides); for the Sample project, or signed out, they are kept in this browser, so the whole thing can be
// tried without the database. The rules (limits, pins, mentions, escaping) are in comments-rules.js.
import { registerProjectTab } from './modules.js';
import { icon } from './icons.js';
import { activity } from './model.js';
import { createLocalComments } from './comments-store.js';
import { mountStage } from './comments-stage.js';
import { shareOf } from './share-rules.js';
import { MAX_BODY, MAX_NAME, esc, nextPinNo, pinNumbers, onItem, onProject, bodyHtml, handles, mentionQuery, mentionChoices, insertMention, whenText, initials, byWhen } from './comments-rules.js';

let cssReady = null;
function ensureCss() {
  if (cssReady) return cssReady;
  const v = new URL(import.meta.url).searchParams.get('v') ?? '0';
  const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL(`../comments.css?v=${v}.1`, import.meta.url).href });
  cssReady = new Promise((resolve) => { link.addEventListener('load', resolve, { once: true }); link.addEventListener('error', resolve, { once: true }); });
  document.head.append(link);
  return cssReady;
}

const SVG = (d) => `<svg class="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const IC = {
  pin: SVG('<path d="M12 21s-6-5.4-6-10.5a6 6 0 0 1 12 0C18 15.6 12 21 12 21z"/><circle cx="12" cy="10.5" r="2"/>'),
  say: SVG('<path d="M4 5h16v11H9l-5 4z"/>'),
  eye: SVG('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.5"/>'),
  x: SVG('<path d="M6 6l12 12M18 6 6 18"/>'),
  send: SVG('<path d="M4 12 20 4l-4 16-4-6z"/>'),
};

const local = createLocalComments();
/** where this project's comments are kept: the practice's records, or this browser (the Sample, or signed out) */
export function placeFor(ctx) {
  const shared = !!ctx.store?.shared && !ctx.project?.sample;
  return (shared && ctx.account?.commentsPlace?.()) || local;
}
/** whether the client link of this project is on, so a comment can be marked for the client: async () => bool */
export const clientOnFor = (ctx) => async () => {
  const p = ctx.project;
  if (placeFor(ctx).place === 'shared') return !!(await ctx.account?.sharePlace?.()?.get(p.id))?.on;
  return shareOf((await ctx.store.loadProject(p.id))?.project).on;
};
const meName = (ctx) => String(ctx.me || ctx.account?.who?.() || '').trim();
const meId = (ctx) => ctx.account?.state?.user?.id ?? '';
const isViewer = (ctx) => !!ctx.store?.shared && !ctx.project?.sample && ctx.account?.state?.practice?.role === 'viewer';

/** how many comments each library item has (by item key), for the tiles: a small number, never blocking the page */
export async function countsFor(ctx, items) {
  try {
    const all = (await placeFor(ctx).list(ctx.project.id)).filter((c) => c.file_id && !c.hidden);
    const out = new Map();
    for (const it of items) { const n = onItem(all, it).length; if (n) out.set(it.key, n); }
    return out;
  } catch { return new Map(); }
}

/**
 * A thread of comments with its composer, drawn into host.
 *   ctx
 *   opts.fileId      the file a new comment names (null: the project)
 *   opts.match       (comment) => bool: which of the project's comments this thread shows
 *   opts.canPin      a pin may be placed (a still)
 *   opts.clientOn    async () => bool: the client link is on, so a comment can be marked "Client sees this"
 *   opts.label       (comment) => html: a small line saying what a comment is on (the Team tab)
 *   opts.filters     show the filter chips
 *   opts.placeholder
 * Returns { refresh(), pins(), on(fn), placePin(pin), pinning, destroy() }.
 */
export async function mountThread(host, ctx, opts = {}) {
  await ensureCss();
  const place = placeFor(ctx), p = ctx.project, viewer = isViewer(ctx);
  const S = { all: [], people: [], draft: { body: '', pin: null, toClient: false, name: '' }, pinning: false, confirm: '', error: '', busy: false, active: '', filter: 'all', failed: '', clientOn: false, mention: null };
  const listeners = new Set();
  const emit = () => { for (const fn of listeners) fn(); };
  const mine = () => S.all.filter((c) => (opts.match ? opts.match(c) : true));
  const visible = () => {
    let list = mine();
    if (S.filter === 'pins') list = list.filter((c) => c.pin);
    else if (S.filter === 'files') list = list.filter((c) => c.file_id && !c.pin);
    else if (S.filter === 'project') list = list.filter((c) => !c.file_id);
    else if (S.filter === 'client') list = list.filter((c) => c.author_kind === 'client');
    else if (S.filter === 'me') list = list.filter((c) => (c.mentions ?? []).includes(meId(ctx)));
    return list.sort(byWhen);
  };
  const numbers = () => pinNumbers(S.all);
  const hnd = () => handles(S.people);
  const personName = (c) => c.author_name;

  host.innerHTML = `<div class="cm" data-cm>
    ${opts.filters ? '<div class="cm-chips" data-cm-chips role="group" aria-label="Show"></div>' : ''}
    <ul class="cm-list" data-cm-list aria-live="polite"></ul>
    ${viewer ? '<p class="cm-note">You can read comments here. Writing needs member access.</p>' : `<form class="cm-form" data-cm-form novalidate>
      <div class="cm-pinrow" data-cm-pinrow hidden></div>
      <div class="cm-box"><textarea data-cm-text rows="2" maxlength="${MAX_BODY}" placeholder="${esc(opts.placeholder ?? 'Add a comment')}" aria-label="Comment"></textarea><div class="cm-ment" data-cm-ment hidden role="listbox" aria-label="Mention"></div></div>
      <div class="cm-name" data-cm-name hidden><input data-cm-who maxlength="${MAX_NAME}" placeholder="Your name" aria-label="Your name" autocomplete="name"></div>
      <p class="cm-err" data-cm-err role="alert" hidden></p>
      <div class="cm-row">
        ${opts.canPin ? `<button type="button" class="cm-tool" data-cm-act="pin" aria-pressed="false" title="Put a pin on the picture">${IC.pin}<span>Pin</span></button>` : ''}
        <label class="cm-client" data-cm-client hidden><input type="checkbox" data-cm-toclient>${IC.eye}<span>Client sees this</span></label>
        <span class="cm-count" data-cm-count></span>
        <button type="submit" class="btn solid cm-send" data-cm-send>${IC.send}<span>Send</span></button>
      </div>
    </form>`}
  </div>`;
  const $ = (s) => host.querySelector(s);

  // ---- drawing ----
  const mark = (c, n) => (c.pin ? `<span class="cm-mark is-pin" title="Pin ${n}">${n}</span>` : `<span class="cm-mark">${esc(initials(c.author_name))}</span>`);
  function drawList() {
    const nums = numbers(), list = visible(), ul = $('[data-cm-list]');
    if (S.failed) { ul.innerHTML = `<li class="cm-empty">${esc(S.failed)}</li>`; return; }
    if (!list.length) { ul.innerHTML = `<li class="cm-empty">${IC.say}<span>${esc(opts.empty ?? 'No comments yet.')}</span></li>`; return; }
    const people = S.people, me = meId(ctx);
    ul.innerHTML = list.map((c) => {
      const n = nums[c.id], tag = c.author_kind === 'client' ? '<span class="cm-tag">Client</span>' : '';
      const mods = place.canModerate ? `<span class="cm-mod"><button type="button" class="cm-lk" data-cm-act="hide" data-id="${esc(c.id)}">${c.hidden ? 'Show' : 'Hide'}</button><button type="button" class="cm-lk is-del" data-cm-act="del" data-id="${esc(c.id)}">${S.confirm === c.id ? 'Delete it?' : 'Delete'}</button></span>` : '';
      return `<li class="cm-item${c.hidden ? ' is-hidden' : ''}${c.author_kind === 'client' ? ' is-client' : ''}${S.active === c.id ? ' is-active' : ''}${(c.mentions ?? []).includes(me) && me ? ' is-me' : ''}" data-cm-id="${esc(c.id)}">
        <button type="button" class="cm-pick" data-cm-act="pick" data-id="${esc(c.id)}" aria-label="${c.pin ? `Pin ${n}` : 'Comment'} from ${esc(personName(c))}">${mark(c, n)}</button>
        <div class="cm-main"><p class="cm-head"><b>${esc(personName(c))}</b>${tag}${c.to_client && c.author_kind !== 'client' ? `<span class="cm-seen" title="The client sees this">${IC.eye}</span>` : ''}<span class="cm-when">${esc(whenText(c.created_at))}</span>${c.hidden ? '<span class="cm-tag is-off">Hidden</span>' : ''}</p>
          ${opts.label ? `<p class="cm-on">${opts.label(c, n)}</p>` : ''}
          <p class="cm-body">${bodyHtml(c.body, people)}</p>${mods}</div></li>`;
    }).join('');
  }
  function drawChips() {
    const el = $('[data-cm-chips]');
    if (!el) return;
    const all = mine(), me = meId(ctx);
    const n = { all: all.length, project: all.filter((c) => !c.file_id).length, files: all.filter((c) => c.file_id && !c.pin).length, pins: all.filter((c) => c.pin).length, client: all.filter((c) => c.author_kind === 'client').length, me: me ? all.filter((c) => (c.mentions ?? []).includes(me)).length : 0 };
    const chips = [['all', 'All'], ['project', 'Project'], ['files', 'Files'], ['pins', 'Pins'], ['client', 'Client'], ['me', 'Mentions me']].filter(([k]) => k === 'all' || n[k] > 0);
    if (S.filter !== 'all' && !n[S.filter]) S.filter = 'all';
    el.innerHTML = chips.map(([k, l]) => `<button type="button" class="fl-chip" data-cm-act="filter" data-k="${k}" aria-pressed="${k === S.filter}">${esc(l)}<span>${n[k]}</span></button>`).join('');
  }
  function drawForm() {
    const f = $('[data-cm-form]');
    if (!f) return;
    const len = Array.from(S.draft.body).length, who = meName(ctx);
    f.querySelector('[data-cm-name]').hidden = !!who;
    f.querySelector('[data-cm-count]').textContent = len > MAX_BODY * 0.8 ? `${len}/${MAX_BODY}` : '';
    f.querySelector('[data-cm-send]').disabled = S.busy || !S.draft.body.trim();
    const tool = f.querySelector('[data-cm-act="pin"]');
    if (tool) { tool.setAttribute('aria-pressed', String(S.pinning)); tool.querySelector('span').textContent = S.pinning ? 'Click the picture' : 'Pin'; }
    const row = f.querySelector('[data-cm-pinrow]');
    if (row) { row.hidden = !S.draft.pin; row.innerHTML = S.draft.pin ? `<span class="cm-chip">${IC.pin}<span>Pin ${S.draft.pinNo ?? ''}</span><button type="button" class="cm-lk" data-cm-act="unpin" aria-label="Remove the pin">${IC.x}</button></span>` : ''; }
    const cl = f.querySelector('[data-cm-client]');
    cl.hidden = !S.clientOn;
    cl.querySelector('input').checked = S.draft.toClient;
    const err = f.querySelector('[data-cm-err]');
    err.hidden = !S.error; err.textContent = S.error;
  }
  const drawAll = () => { drawChips(); drawList(); drawForm(); emit(); };

  // ---- loading ----
  async function load() {
    try { S.failed = ''; S.all = await place.list(p.id); } catch (e) { S.failed = e?.message ? `Comments could not be read: ${e.message}` : 'Comments could not be read just now.'; S.all = []; }
    try { S.people = await place.people(); } catch { S.people = []; }
    if (opts.clientOn) { try { S.clientOn = !!(await opts.clientOn()); } catch { S.clientOn = false; } }
    drawAll();
  }

  // ---- doing ----
  async function send() {
    if (S.busy) return;
    const name = meName(ctx) || S.draft.name;
    S.error = '';
    if (!S.draft.body.trim()) return;
    if (!name.trim()) { S.error = 'Add your name.'; drawForm(); $('[data-cm-who]')?.focus(); return; }
    S.busy = true; drawForm();
    try {
      const c = await place.add({ project_id: p.id, file_id: opts.fileId ?? null, pin: S.draft.pin, author_name: name, body: S.draft.body, to_client: S.clientOn && S.draft.toClient });
      S.all.push(c);
      S.draft.body = ''; S.draft.pin = null; S.pinning = false;
      const t = $('[data-cm-text]'); if (t) t.value = '';
      S.active = c.id;
      try { await ctx.store.save('activity', activity(p.id, name, c.pin ? 'Pin placed' : 'Comment', opts.fileName ? `${c.pin ? `Pin ${c.pin_no ?? ''} on ` : 'On '}${opts.fileName}` : 'On the project')); } catch { /* a viewer cannot add to the log; the comment is kept */ }
    } catch (e) { S.error = e?.message ?? 'That comment was not kept.'; }
    S.busy = false; drawAll();
    $('[data-cm-list]')?.querySelector('.is-active')?.scrollIntoView?.({ block: 'nearest' });
  }
  async function act(b) {
    const a = b.dataset.cmAct, id = b.dataset.id;
    if (a === 'filter') { S.filter = b.dataset.k; return drawAll(); }
    if (a === 'pick') { S.active = S.active === id ? '' : id; drawList(); return emit(); }
    if (a === 'pin') { S.pinning = !S.pinning; if (!S.pinning) S.draft.pin = null; drawForm(); return emit(); }
    if (a === 'unpin') { S.draft.pin = null; S.pinning = false; drawForm(); return emit(); }
    if (a === 'hide') {
      const c = S.all.find((x) => x.id === id);
      try { const r = await place.setHidden(id, !c.hidden); Object.assign(c, r); } catch (e) { S.error = e.message; }
      return drawAll();
    }
    if (a === 'del') {
      if (S.confirm !== id) { S.confirm = id; return drawList(); }
      S.confirm = '';
      try { if (await place.remove(id)) S.all = S.all.filter((x) => x.id !== id); } catch (e) { S.error = e.message; }
      return drawAll();
    }
    return undefined;
  }
  function ment(t) {
    const box = $('[data-cm-ment]');
    if (!box) return;
    const mq = S.people.length ? mentionQuery(t.value, t.selectionStart) : null, choices = mq ? mentionChoices(S.people, mq.query) : [];
    S.mention = mq && choices.length ? { mq, choices } : null;
    box.hidden = !S.mention;
    box.innerHTML = S.mention ? choices.map((c) => `<button type="button" role="option" class="cm-opt" data-cm-act="mention" data-handle="${esc(c.handle)}"><b>${esc(c.name)}</b><span>@${esc(c.handle)}</span></button>`).join('') : '';
  }
  const onClick = (e) => {
    const b = e.target.closest('[data-cm-act]');
    if (!b || !host.contains(b)) return;
    if (b.dataset.cmAct === 'mention') {
      const t = $('[data-cm-text]'), r = insertMention(t.value, S.mention.mq, t.selectionStart, b.dataset.handle);
      t.value = r.text; S.draft.body = r.text; t.focus(); t.setSelectionRange(r.caret, r.caret); S.mention = null; $('[data-cm-ment]').hidden = true; return drawForm();
    }
    act(b);
  };
  const onInput = (e) => {
    if (e.target.matches('[data-cm-text]')) { S.draft.body = e.target.value; S.error = ''; ment(e.target); drawForm(); }
    else if (e.target.matches('[data-cm-who]')) { S.draft.name = e.target.value; }
    else if (e.target.matches('[data-cm-toclient]')) { S.draft.toClient = e.target.checked; }
  };
  const onKey = (e) => {
    if (e.target.matches('[data-cm-text]') && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
    if (e.key === 'Escape' && S.pinning) { S.pinning = false; drawForm(); emit(); }
  };
  const onSubmit = (e) => { e.preventDefault(); send(); };
  host.addEventListener('click', onClick); host.addEventListener('input', onInput); host.addEventListener('keydown', onKey); host.addEventListener('submit', onSubmit);

  await load();
  const api = {
    refresh: load,
    /** what the picture draws: the pins of the comments shown (and the draft pin) */
    pins: () => { const nums = numbers(); return { list: mine().filter((c) => c.pin && (!c.hidden || place.canModerate)).map((c) => ({ id: c.id, pin: c.pin, n: nums[c.id], hidden: c.hidden, active: S.active === c.id })), draft: S.draft.pin, pinning: S.pinning }; },
    on: (fn) => { listeners.add(fn); },
    /** the picture was clicked in pin mode */
    placePin(pin) { if (!pin) return; S.draft.pin = pin; S.draft.pinNo = Math.max(nextPinNo(S.all, opts.fileId), ...Object.values(numbers()).map((n) => n + 1), 1); S.pinning = false; drawForm(); emit(); $('[data-cm-text]')?.focus(); },
    activate(id) { S.active = id; drawList(); emit(); $('[data-cm-list]')?.querySelector('.is-active')?.scrollIntoView?.({ block: 'nearest' }); },
    get pinning() { return S.pinning; },
    destroy() { host.removeEventListener('click', onClick); host.removeEventListener('input', onInput); host.removeEventListener('keydown', onKey); host.removeEventListener('submit', onSubmit); listeners.clear(); },
  };
  return api;
}

/** the rail beside a file in the large viewer: this file's comments (every version of it), and a pin for a picture */
export async function mountRail(host, ctx, { item, clientOn = null } = {}) {
  const n = item.latest;
  const thread = await mountThread(host, ctx, {
    fileId: n.id, fileName: n.name, canPin: item.media === 'image', clientOn: clientOn ?? clientOnFor(ctx),
    match: (c) => !!c.file_id && item.versions.some((v) => v.id === c.file_id),
    placeholder: item.media === 'image' ? 'Say something, or pin it' : 'Add a comment', empty: item.media === 'image' ? 'Nothing here yet. Pin a point and say what you see.' : 'Nothing here yet.',
  });
  return { thread, stage: (picHost) => mountStage(picHost, thread) };
}

// ---- the Team tab ---------------------------------------------------------------------------------------------------------
async function renderTeam(el, ctx) {
  const p = ctx.project;
  if (!p) return undefined;
  await ensureCss();
  const files = await ctx.store.listFiles({ project_id: p.id }).catch(() => []);
  const names = new Map(files.map((f) => [f.id, f.name]));
  const b = await ctx.store.loadProject(p.id).catch(() => null);
  const log = (b?.activity ?? []).slice(0, 8);
  el.innerHTML = `<div class="tm"><section class="tm-main" aria-label="Comments"><div class="tm-head"><h3>Comments</h3><span class="mono small" data-tm-where></span></div><div data-tm-thread></div></section>
    <aside class="tm-side" aria-label="Activity"><h3>Activity</h3>${log.length ? `<ol class="tm-log">${log.map((a) => `<li><span class="cm-mark">${esc(initials(a.who || '·'))}</span><div><p><b>${esc(a.who || 'Someone')}</b> ${esc(String(a.action ?? '').toLowerCase())}</p>${a.detail ? `<p class="small">${esc(a.detail)}</p>` : ''}<p class="mono small">${esc(whenText(a.at))}</p></div></li>`).join('')}</ol>` : `<p class="small">Nothing yet. Comments, files and approvals show here.</p>`}</aside></div>`;
  const place = placeFor(ctx);
  el.querySelector('[data-tm-where]').textContent = place.place === 'shared' ? '■ Kept in the practice’s records' : '□ Kept in this browser only';
  const thread = await mountThread(el.querySelector('[data-tm-thread]'), ctx, {
    fileId: null, filters: true, placeholder: 'Say something to the team. @ to mention', empty: 'No comments yet. Start with the project.',
    clientOn: clientOnFor(ctx),
    label: (c, n) => (c.file_id ? `<span class="cm-where">${c.pin ? IC.pin : IC.say}<span>${esc(names.get(c.file_id) ?? 'A file')}${c.pin ? ` · pin ${n}` : ''}</span></span>` : ''),
  });
  return () => thread.destroy();
}

registerProjectTab({ id: 'team', label: 'Team', icon: icon('people'), order: 5, render: renderTeam });
export const _internals = { renderTeam };
