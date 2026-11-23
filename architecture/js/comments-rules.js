// Comments and pins: the rules, with no page in them, so they can be tested on their own and shared by the workspace, the client
// page and the server (functions/api/arch-comments.js).
//
// A comment belongs to a project, may name one file (a still, film, drawing sheet or model) and, on a still, a point on it:
// x and y as fractions of the picture (0 to 1), shown as a numbered pin. Comments are plain text only, at most MAX_BODY
// characters, and a link in one is never made clickable. Nothing here writes anything.

export const MAX_BODY = 2000;
export const MAX_NAME = 60;
/** the server's limits for client comments: n comments in this many seconds. supabase/migrations/20261123220000_arch_comments.sql says the same. */
export const RATE = { ip: { n: 8, seconds: 600 }, token: { n: 40, seconds: 3600 } };

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export { esc };

/** at most n characters (not UTF-16 halves) */
const cap = (s, n) => { const a = Array.from(s); return a.length > n ? a.slice(0, n).join('') : s; };

/**
 * A comment's words as they will be kept: text only. Control and direction-changing characters go, line ends are plain, a run of
 * blank lines becomes one, and the ends are trimmed. { ok, text, why }: not ok when nothing is left or it is over the limit.
 */
export function cleanBody(input, max = MAX_BODY) {
  if (typeof input !== 'string') return { ok: false, text: '', why: 'Write a comment.' };
  const text = input.normalize('NFC').replace(/\r\n?/g, '\n').replace(CONTROL, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!text) return { ok: false, text: '', why: 'Write a comment.' };
  if (Array.from(text).length > max) return { ok: false, text: cap(text, max), why: `Keep it to ${max.toLocaleString('en-NZ')} characters.`, over: true };
  return { ok: true, text, why: '' };
}

/** the name a person gives: one line, at most MAX_NAME characters */
export function cleanName(input, max = MAX_NAME) {
  if (typeof input !== 'string') return { ok: false, text: '', why: 'Add your name.' };
  const text = cap(input.normalize('NFC').replace(CONTROL, '').replace(/\s+/g, ' ').trim(), max);
  return text ? { ok: true, text, why: '' } : { ok: false, text: '', why: 'Add your name.' };
}

// ---- pins ----------------------------------------------------------------------------------------------------------------
const frac = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.round(Math.min(1, Math.max(0, n)) * 10000) / 10000 : null; };
/** a point on a picture as two fractions (0 to 1, four places), or null when either is not a number */
export function pinOf(x, y) {
  const px = frac(x), py = frac(y);
  return px === null || py === null || x === '' || y === '' || x === null || y === null ? null : { x: px, y: py };
}
/** where a click landed on a picture whose box is rect (getBoundingClientRect), as fractions. null for an empty box. */
export function pinFromPoint(clientX, clientY, rect) {
  if (!rect || !(rect.width > 0) || !(rect.height > 0)) return null;
  return pinOf((clientX - rect.left) / rect.width, (clientY - rect.top) / rect.height);
}
/** the CSS that puts a pin at its point on the picture's box */
export const pinStyle = (pin) => `left:${(pin.x * 100).toFixed(2)}%;top:${(pin.y * 100).toFixed(2)}%`;

// ---- a comment's shape ----------------------------------------------------------------------------------------------------
/** 'pin' (a point on a file), 'file' (a file) or 'project' */
export const targetOf = (c) => (c?.pin ? 'pin' : c?.file_id ? 'file' : 'project');

/**
 * The number of each pin on a file. A pin keeps the number it was given (pin_no, from the database or the browser); one with none
 * is numbered in the order it was made, after the numbered ones. { <comment id>: number }
 */
export function pinNumbers(comments) {
  const byFile = new Map();
  for (const c of comments ?? []) if (c?.pin && c.file_id) (byFile.get(c.file_id) ?? byFile.set(c.file_id, []).get(c.file_id)).push(c);
  const out = {};
  for (const list of byFile.values()) {
    const sorted = [...list].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)));
    let next = Math.max(0, ...sorted.map((c) => Number(c.pin_no) || 0)) + 1;
    for (const c of sorted) out[c.id] = Number(c.pin_no) > 0 ? Number(c.pin_no) : next++;
  }
  return out;
}

/** the next pin number on a file, from the comments already on it */
export const nextPinNo = (comments, fileId) => Math.max(0, ...(comments ?? []).filter((c) => c.file_id === fileId && c.pin).map((c) => Number(c.pin_no) || 0)) + 1;

/** the comments on one library item: any version of it (versions are file notes) */
export const onItem = (comments, item) => {
  const ids = new Set((item?.versions ?? []).map((v) => v.id));
  return (comments ?? []).filter((c) => c.file_id && ids.has(c.file_id)).sort(byWhen);
};
export const onProject = (comments) => (comments ?? []).filter((c) => !c.file_id).sort(byWhen);
const byWhen = (a, b) => String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id));
export { byWhen };

// ---- @mentions -------------------------------------------------------------------------------------------------------------
const WORD = '[\\p{L}\\p{N}]';
const HANDLE = new RegExp(`@(${WORD}[\\p{L}\\p{N}._-]*)`, 'gu');
const first = (name) => String(name ?? '').trim().split(/\s+/)[0] ?? '';

/**
 * How a person is @mentioned: their first name, or first.last when another member shares it, or the start of their email.
 * people: [{ user_id, name, email }]. Returns { <user_id>: handle } (letters, digits, dot, dash, underscore).
 */
export function handles(people) {
  const clean = (s) => String(s ?? '').normalize('NFC').replace(/[^\p{L}\p{N}._-]+/gu, '').replace(/^[._-]+|[._-]+$/g, '');
  const base = (p) => clean(first(p.name)) || clean(String(p.email ?? '').split('@')[0]) || 'member';
  const count = new Map();
  for (const p of people ?? []) count.set(base(p).toLowerCase(), (count.get(base(p).toLowerCase()) ?? 0) + 1);
  const used = new Set(), out = {};
  for (const p of people ?? []) {
    let h = base(p);
    if (count.get(h.toLowerCase()) > 1) { const parts = String(p.name ?? '').trim().split(/\s+/); const last = clean(parts.length > 1 ? parts[parts.length - 1] : ''); if (last) h = `${h}.${last}`; }
    let n = 2, trial = h;
    while (used.has(trial.toLowerCase())) trial = `${h}${n++}`;
    used.add(trial.toLowerCase()); out[p.user_id] = trial;
  }
  return out;
}

/** the user ids a comment's words mention, among people (each once, in the order mentioned) */
export function mentionsIn(body, people) {
  const h = handles(people), byHandle = new Map(Object.entries(h).map(([id, handle]) => [handle.toLowerCase(), id]));
  const out = [];
  for (const m of String(body ?? '').matchAll(HANDLE)) {
    const id = byHandle.get(m[1].toLowerCase().replace(/[._-]+$/, ''));
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

/** while typing: the @word just before the caret, or null. { start, query } */
export function mentionQuery(text, caret) {
  const before = String(text ?? '').slice(0, Math.max(0, caret ?? 0));
  const m = before.match(new RegExp(`(?:^|[\\s(])@(${WORD}[\\p{L}\\p{N}._-]*|)$`, 'u'));
  return m ? { start: before.length - m[1].length - 1, query: m[1] } : null;
}
/** the members whose handle starts with what is typed (up to 5) */
export function mentionChoices(people, query) {
  const h = handles(people), q = String(query ?? '').toLowerCase();
  return (people ?? []).filter((p) => h[p.user_id].toLowerCase().startsWith(q) || String(p.name ?? '').toLowerCase().includes(q) && q.length > 1).slice(0, 5).map((p) => ({ user_id: p.user_id, name: p.name || p.email || 'member', handle: h[p.user_id] }));
}
/** the text with the mention at start..caret replaced by "@handle " */
export function insertMention(text, mq, caret, handle) {
  const t = String(text ?? '');
  const head = t.slice(0, mq.start), tail = t.slice(caret);
  return { text: `${head}@${handle} ${tail.replace(/^ /, '')}`, caret: head.length + handle.length + 2 };
}

// ---- showing a comment: text only -----------------------------------------------------------------------------------------
const URL_LIKE = /(?:https?:\/\/|www\.)[^\s<>"']+/giu;
/**
 * A comment's words as parts: { t: 'text' | 'mention' | 'link', v }. A mention is shown as such only when it names a member;
 * a web address is marked 'link' so it can be styled, and is never turned into something clickable.
 */
export function bodyParts(body, people = []) {
  const text = String(body ?? '');
  const h = handles(people), known = new Set(Object.values(h).map((x) => x.toLowerCase()));
  const marks = [];
  for (const m of text.matchAll(URL_LIKE)) marks.push({ i: m.index, end: m.index + m[0].length, t: 'link' });
  for (const m of text.matchAll(HANDLE)) {
    const handle = m[1].replace(/[._-]+$/, '');
    if (!known.has(handle.toLowerCase())) continue;
    if (marks.some((x) => m.index >= x.i && m.index < x.end)) continue;
    marks.push({ i: m.index, end: m.index + 1 + handle.length, t: 'mention' });
  }
  marks.sort((a, b) => a.i - b.i);
  const parts = [];
  let at = 0;
  for (const mk of marks) { if (mk.i > at) parts.push({ t: 'text', v: text.slice(at, mk.i) }); parts.push({ t: mk.t, v: text.slice(mk.i, mk.end) }); at = mk.end; }
  if (at < text.length) parts.push({ t: 'text', v: text.slice(at) });
  return parts;
}
/** a comment's words as safe HTML: every character escaped, line ends kept, mentions and links as plain spans (no anchors) */
export function bodyHtml(body, people = []) {
  return bodyParts(body, people).map((p) => (p.t === 'text' ? esc(p.v) : `<span class="cm-${p.t === 'link' ? 'url' : 'at'}">${esc(p.v)}</span>`)).join('').replace(/\n/g, '<br>');
}

// ---- the rate limit (the server's rule, by share token and by address) -----------------------------------------------------
/**
 * Whether one more client comment may be written now.
 *   hits    earlier ones: [{ token, ip, at }] (at in milliseconds)
 * { ok } or { ok: false, retry } with the seconds to wait. The database applies the same limits; this is the server's first line.
 */
export function rateDecision(hits, { token, ip, now = Date.now(), limits = RATE } = {}) {
  const within = (secs, test) => (hits ?? []).filter((h) => h.at > now - secs * 1000 && test(h)).map((h) => h.at).sort((a, b) => a - b);
  for (const [secs, n, test] of [[limits.ip.seconds, limits.ip.n, (h) => h.token === token && h.ip === ip], [limits.token.seconds, limits.token.n, (h) => h.token === token]]) {
    const recent = within(secs, test);
    if (recent.length >= n) return { ok: false, retry: Math.max(1, Math.ceil((recent[recent.length - n] + secs * 1000 - now) / 1000)) };
  }
  return { ok: true };
}

// ---- a comment as the pages hold it --------------------------------------------------------------------------------------
/** "3 min ago", "2 h ago", "21 Nov" */
export function whenText(iso, now = Date.now()) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = new Date(t);
  return `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}`;
}
/** two letters for a person's mark */
export const initials = (name) => String(name ?? '').trim().split(/\s+/).slice(0, 2).map((w) => Array.from(w)[0] ?? '').join('').toUpperCase() || '·';
