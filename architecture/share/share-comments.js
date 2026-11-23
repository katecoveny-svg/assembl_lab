// Comments on the client page: a name and a comment, nothing else (no account, no email). Plain text, 2,000 characters at most;
// a link in a comment is shown as text, never clickable. A comment can sit on the project, on a still, a film or the model, and
// on a still at a point (a numbered pin).
//
//   ?t=<token>            comments go to /api/arch-comments, which checks the token in the database. When the architect turns the
//                         client link off, reading and writing both stop at once.
//   ?t=<token>&p=<id>     a preview from this browser's own records (signed out): comments are kept in this browser only.
import { createLocalComments } from '../js/comments-store.js';
import { cleanBody, cleanName, bodyHtml, pinNumbers, esc, whenText, initials, byWhen, MAX_BODY, MAX_NAME } from '../js/comments-rules.js';
import { mountStage } from '../js/comments-stage.js';

const NAME_KEY = 'assembl.arch.share.name';
const say = (s) => `<svg class="ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${s}"/></svg>`;
const IC = { say: say('M4 5h16v11H9l-5 4z'), pin: say('M12 21s-6-5.4-6-10.5a6 6 0 0 1 12 0C18 15.6 12 21 12 21zM12 8.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'), send: say('M4 12 20 4l-4 16-4-6z'), x: say('M6 6l12 12M18 6 6 18') };
const rememberedName = () => { try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; } };
const rememberName = (n) => { try { localStorage.setItem(NAME_KEY, n); } catch { /* typed again next time */ } };

const WORDS = { not_shared: 'This link is not on any more, so comments are closed.', rate_limited: 'That is a lot of comments at once. Try again in a few minutes.', not_configured: 'Comments are not switched on yet.', other_site: 'That comment could not be sent from here.' };

/** the page's source of comments: the server (a shared link) or this browser (a preview). Same calls either way. */
export function commentSource({ token, pid = '', fetcher = (...a) => fetch(...a), backend } = {}) {
  if (pid) {
    const place = createLocalComments(backend);
    const shape = (c) => ({ id: c.id, file_id: c.file_id, pin: c.pin, pin_no: c.pin_no, from: c.author_kind === 'client' ? 'client' : 'practice', by: c.author_name, body: c.body, at: c.created_at });
    return {
      local: true,
      async list() { return (await place.forClient(pid)).map(shape); },
      async add({ name, body, file_id = null, pin = null }) { return shape(await place.add({ project_id: pid, author_kind: 'client', author_name: name, body, file_id, pin })); },
    };
  }
  const fail = async (r) => { let e = ''; try { e = (await r.json())?.error ?? ''; } catch { /* no reason given */ } return new Error(WORDS[e] ?? (r.status === 404 ? WORDS.not_shared : 'That did not go through. Try again in a moment.')); };
  return {
    local: false,
    async list() {
      const r = await fetcher(`/api/arch-comments?t=${encodeURIComponent(token)}`, { headers: { accept: 'application/json' }, referrerPolicy: 'no-referrer' });
      if (!r.ok) throw await fail(r);
      return (await r.json()).comments ?? [];
    },
    async add({ name, body, file_id = null, pin = null }) {
      const r = await fetcher('/api/arch-comments', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, referrerPolicy: 'no-referrer', body: JSON.stringify({ t: token, name, body, file_id, pin }) });
      if (!r.ok) throw await fail(r);
      return (await r.json()).comment;
    },
  };
}

/** a list of comments in the page's own shape as the workspace's comment shape, so the same rules number the pins */
const asComment = (c) => ({ id: c.id, file_id: c.file_id, pin: c.pin, pin_no: c.pin_no, created_at: c.at });

/**
 * A thread drawn into host: the comments that match, and a form to add one.
 *   src       commentSource()      all   the shared array of every comment on the page (kept up to date here)
 *   fileId    the file a new comment names (null: the project)       canPin   a pin may be placed (a still)
 * Returns { redraw, pins(), on(fn), placePin(pin), activate(id), pinning }.
 */
export function mountThread(host, src, all, { fileId = null, canPin = false, match, placeholder = 'Say something', empty = 'No comments yet.', onChange = () => {} } = {}) {
  const S = { draft: { body: '', pin: null }, pinning: false, busy: false, error: '', active: '' };
  const listeners = new Set();
  const emit = () => { for (const fn of listeners) fn(); onChange(); };
  const mine = () => all.filter(match).sort((a, b) => byWhen(asComment(a), asComment(b)));
  const nums = () => pinNumbers(all.map(asComment));
  host.innerHTML = `<div class="cm sh-cmw">
    <ul class="cm-list" data-cm-list aria-live="polite"></ul>
    <form class="cm-form" novalidate>
      <div class="cm-pinrow" data-cm-pinrow hidden></div>
      <div class="cm-box"><textarea data-cm-text rows="2" maxlength="${MAX_BODY}" placeholder="${esc(placeholder)}" aria-label="Comment"></textarea></div>
      <div class="cm-name"><input data-cm-who maxlength="${MAX_NAME}" placeholder="Your name" aria-label="Your name" autocomplete="name" value="${esc(rememberedName())}"></div>
      <p class="cm-err" data-cm-err role="alert" hidden></p>
      <div class="cm-row">
        ${canPin ? `<button type="button" class="cm-tool" data-cm-act="pin" aria-pressed="false">${IC.pin}<span>Pin</span></button>` : ''}
        <span class="cm-count" data-cm-count></span>
        <button type="submit" class="btn solid cm-send" data-cm-send disabled>${IC.send}<span>Send</span></button>
      </div>
      <p class="sh-cm-fine">The architect and anyone with this link can read comments.</p>
    </form></div>`;
  const $ = (s) => host.querySelector(s);
  const drawList = () => {
    const list = mine(), n = nums();
    $('[data-cm-list]').innerHTML = list.length ? list.map((c) => `<li class="cm-item${c.from === 'client' ? ' is-client' : ''}${S.active === c.id ? ' is-active' : ''}" data-cm-id="${esc(c.id)}">
      <button type="button" class="cm-pick" data-cm-act="pick" data-id="${esc(c.id)}" aria-label="${c.pin ? `Pin ${n[c.id]}` : 'Comment'} from ${esc(c.by)}">${c.pin ? `<span class="cm-mark is-pin">${n[c.id]}</span>` : `<span class="cm-mark">${esc(initials(c.by))}</span>`}</button>
      <div class="cm-main"><p class="cm-head"><b>${esc(c.by)}</b>${c.from === 'practice' ? '<span class="cm-tag">Architect</span>' : ''}<span class="cm-when">${esc(whenText(c.at))}</span></p><p class="cm-body">${bodyHtml(c.body)}</p></div></li>`).join('')
      : `<li class="cm-empty">${IC.say}<span>${esc(empty)}</span></li>`;
  };
  const drawForm = () => {
    $('[data-cm-send]').disabled = S.busy || !S.draft.body.trim();
    const tool = $('[data-cm-act="pin"]');
    if (tool) { tool.setAttribute('aria-pressed', String(S.pinning)); tool.querySelector('span').textContent = S.pinning ? 'Tap the picture' : 'Pin'; }
    const row = $('[data-cm-pinrow]');
    row.hidden = !S.draft.pin;
    row.innerHTML = S.draft.pin ? `<span class="cm-chip">${IC.pin}<span>Pin</span><button type="button" class="cm-lk" data-cm-act="unpin" aria-label="Remove the pin">${IC.x}</button></span>` : '';
    const len = Array.from(S.draft.body).length;
    $('[data-cm-count]').textContent = len > MAX_BODY * 0.8 ? `${len}/${MAX_BODY}` : '';
    const err = $('[data-cm-err]'); err.hidden = !S.error; err.textContent = S.error;
  };
  const redraw = () => { drawList(); drawForm(); emit(); };
  async function send() {
    if (S.busy) return;
    const name = cleanName($('[data-cm-who]').value), body = cleanBody(S.draft.body);
    S.error = '';
    if (!body.ok) { S.error = body.why; return drawForm(); }
    if (!name.ok) { S.error = name.why; drawForm(); $('[data-cm-who]').focus(); return undefined; }
    S.busy = true; drawForm();
    try {
      const c = await src.add({ name: name.text, body: body.text, file_id: fileId, pin: S.draft.pin });
      rememberName(name.text);
      all.push(c);
      S.draft.body = ''; S.draft.pin = null; S.pinning = false; S.active = c.id; $('[data-cm-text]').value = '';
    } catch (e) { S.error = e.message; }
    S.busy = false; redraw();
    return undefined;
  }
  host.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cm-act]');
    if (!b) return;
    const a = b.dataset.cmAct;
    if (a === 'pick') { S.active = S.active === b.dataset.id ? '' : b.dataset.id; drawList(); emit(); }
    if (a === 'pin') { S.pinning = !S.pinning; if (!S.pinning) S.draft.pin = null; drawForm(); emit(); }
    if (a === 'unpin') { S.draft.pin = null; S.pinning = false; drawForm(); emit(); }
  });
  host.addEventListener('input', (e) => { if (e.target.matches('[data-cm-text]')) { S.draft.body = e.target.value; S.error = ''; drawForm(); } });
  host.addEventListener('keydown', (e) => {
    if (e.target.matches('[data-cm-text]') && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
    if (e.key === 'Escape' && S.pinning) { S.pinning = false; drawForm(); emit(); }
  });
  host.addEventListener('submit', (e) => { e.preventDefault(); send(); });
  drawList(); drawForm();
  return {
    redraw, on: (fn) => { listeners.add(fn); },
    pins: () => { const n = nums(); return { list: mine().filter((c) => c.pin).map((c) => ({ id: c.id, pin: c.pin, n: n[c.id], hidden: false, active: S.active === c.id })), draft: S.draft.pin, pinning: S.pinning }; },
    placePin(pin) { if (!pin) return; S.draft.pin = pin; S.pinning = false; drawForm(); emit(); $('[data-cm-text]')?.focus(); },
    activate(id) { S.active = id; drawList(); emit(); },
    get pinning() { return S.pinning; },
  };
}

export { mountStage };
