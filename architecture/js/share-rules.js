// The client hand-off: what a client's read-only page shows, whether it may be opened at all, and what goes in the
// download package. No page and no storage in here, so the rules can be tested on their own (tests/architecture/share.test.mjs).
//
// Sharing is OFF until a person who may turn it on does so, and turning it off kills the link (the token goes; turning it
// on again makes a new one). In this browser (signed out) the person at the browser decides; in a practice's shared
// records only an owner can, and the database checks that again (supabase/migrations/*_arch_share.sql).
//
// What a client sees: stills, films, drawings as PDFs for information, and the project's model to walk in 3D. Never: site
// files (a site plan or survey can say where the site is), photos (often of the site), money, tasks, people, the site
// point or the address. The page shows nothing at all when sharing is off or the token does not match.
import { libraryOf, primaryModel, ext } from './file-library-rules.js';

/** the share record a project carries in this browser: { on, token, changed_at, changed_by }. Absent means off. */
export function shareOf(project) {
  const s = project?.share;
  return s && typeof s === 'object' && s.on === true && typeof s.token === 'string' && TOKEN.test(s.token)
    ? { on: true, token: s.token, changed_at: s.changed_at ?? '', changed_by: s.changed_by ?? '' }
    : { on: false, token: '', changed_at: s?.changed_at ?? '', changed_by: s?.changed_by ?? '' };
}
export const TOKEN = /^[a-f0-9]{32,64}$/;

/** a new token: 32 hex characters from the browser's secure random source */
export function newToken(rand = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n))) {
  return [...rand(16)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** the project with sharing turned on (a new token when it had none) or off (the token goes) */
export function withShare(project, on, { who = '', now = new Date().toISOString(), token = null } = {}) {
  const was = shareOf(project);
  const share = on ? { on: true, token: was.on ? was.token : (token ?? newToken()), changed_at: now, changed_by: String(who || '') } : { on: false, changed_at: now, changed_by: String(who || '') };
  return { ...project, share };
}

/**
 * Who may turn sharing on or off.
 *   place: 'browser' (this browser's own records) or 'shared' (a practice's records); role: the person's role in the practice
 * The Sample can be shared in this browser as a preview; it never leaves the browser.
 */
export function mayShare({ place = 'browser', role = '' } = {}) {
  if (place === 'browser') return { ok: true, why: '' };
  if (role === 'owner') return { ok: true, why: '' };
  return { ok: false, why: 'Only an owner of the practice can share a project with a client.' };
}

/** the client page's address. A browser share opens only in this browser, so it carries the project id too. */
export function shareUrl(origin, { token, pid = '', place = 'browser' }) {
  const u = new URL('/architecture/share/', origin);
  u.searchParams.set('t', token);
  if (place === 'browser' && pid) u.searchParams.set('p', pid);
  return u.href;
}

/** the kinds of library item a client may see */
export const CLIENT_KINDS = ['stills', 'films', 'drawings'];

/**
 * What the client page shows, from the project's records. Returns null when sharing is off or the token does not match
 * (the caller shows the same "not shared" page either way, so a guess learns nothing).
 *   { name, practice, stills: [item], films: [item], drawings: [item], model: { note, open } | null }
 */
export function clientView({ project, files = [], documents = [], token = '', practice = null }) {
  const s = shareOf(project);
  if (!s.on || !token || s.token !== token) return null;
  return clientParts({ project, files, documents, practice });
}

/** the parts of the client page, when the caller has already checked that sharing is on (the server does, in SQL) */
export function clientParts({ project, files = [], documents = [], practice = null }) {
  const items = libraryOf({ project, files, documents });
  const pm = primaryModel(project, files);
  return {
    name: String(project?.name ?? ''),
    practice: practice ? { name: String(practice.name ?? ''), theme: practice.theme ?? '' } : null,
    stills: items.filter((i) => i.kind === 'stills'),
    films: items.filter((i) => i.kind === 'films'),
    drawings: items.filter((i) => i.kind === 'drawings' && ext(i.name) === 'pdf'),
    model: pm?.kind === 'uploaded' && pm.open ? { note: pm.open, of: pm.note } : null,
  };
}

const safe = (s) => String(s ?? 'file').normalize('NFKD').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'file';

/**
 * The download package: the client's view as folders. Returns [{ path, note }] plus a read-me text.
 * Only the newest version of each item goes in. Names are made safe and never repeat.
 */
export function packageEntries(view) {
  if (!view) return { entries: [], readme: '' };
  const seen = new Set(), entries = [];
  const put = (folder, note) => {
    let base = safe(note.name), p = `${folder}/${base}`, n = 2;
    while (seen.has(p.toLowerCase())) { const m = base.match(/^(.*?)(\.[^.]+)?$/); p = `${folder}/${m[1]} (${n++})${m[2] ?? ''}`; }
    seen.add(p.toLowerCase()); entries.push({ path: p, note });
  };
  for (const i of view.stills) put('stills', i.latest);
  for (const i of view.films) put('films', i.latest);
  for (const i of view.drawings) put('drawings', i.latest);
  if (view.model) put('model', view.model.note);
  const readme = [
    `${view.name}`,
    view.practice?.name ? `Shared by ${view.practice.name}` : '',
    '',
    `stills/    ${view.stills.length} picture${view.stills.length === 1 ? '' : 's'}`,
    `films/     ${view.films.length} film${view.films.length === 1 ? '' : 's'}`,
    `drawings/  ${view.drawings.length} drawing set${view.drawings.length === 1 ? '' : 's'}, for information only`,
    `model/     ${view.model ? '1 model (open a .glb in any 3D viewer)' : 'none'}`,
    '',
    'Renders and films are pictures of a design. They are not photographs and not a promise of the finished building.',
    'Drawings are for information only, not for construction. They are not a consent document or a professional sign-off.',
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
  return { entries, readme };
}

/**
 * [p1b] One plain line about whether a client can open the link, or ''.
 *   place 'browser' | 'shared'; table: the practice's share records answered; configured: the server key is set (null: unknown)
 */
export function linkNote({ place = 'browser', on = false, table = true, configured = null } = {}) {
  if (place === 'browser') return '';
  if (!table) return 'Client links need one database update for this practice. Nothing is shared until it is made.';
  if (on && configured === false) return 'The link is on, but clients can’t open it yet: assembl’s server key for client links still has to be added in Cloudflare.';
  return '';
}

/** the total size of a package's files, in bytes */
export const packageBytes = (entries) => entries.reduce((n, e) => n + (Number(e.note?.size) || 0), 0);
/** the most a package built in a browser holds before it asks the person to download files one by one */
export const PACKAGE_LIMIT = 1024 * 1024 * 1024;
