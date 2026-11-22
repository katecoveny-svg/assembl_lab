// Alert emails kept for Found work: the tenders read out of GETS "Tender Subscription" emails (gets-alert.js), saved by a person's press.
// Pure rules, no network and no page. Signed in, the rows live in arch.hunt_inbox (cloud.js: huntInbox, addHuntInbox); signed out, in this browser's store.
// Only the notice's public fields are kept (reference, buyer, name, closing time, link): never the email, its sender or its recipient.
import { rankTenders, isGetsUrl, nzDay } from './hunt-rank.js';
import { getsLink, MAX_ITEMS } from './gets-alert.js';

export const INBOX_SETTING = (scope) => `hunt-inbox:${scope}`;
export const INBOX_MAX = MAX_ITEMS;
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const iso = (v) => { const t = Date.parse(v ?? ''); return Number.isNaN(t) ? '' : new Date(t).toISOString(); };

/** One saved item, bounded; null when it has no RFx ID, no name or no gets.govt.nz link. */
export function cleanInboxItem(x) {
  if (!x || typeof x !== 'object') return null;
  const link = getsLink(x.url), rfxId = clean(x.rfxId ?? x.rfx_id);
  if (!link || !/^\d{4,12}$/.test(rfxId) || link.id !== rfxId) return null;
  const name = clean(x.name).slice(0, 300);
  if (!name) return null;
  return {
    rfxId, ref: clean(x.ref).slice(0, 80), organisation: clean(x.organisation).slice(0, 200), name, closes: iso(x.closes ?? x.closes_at), url: link.url,
    kind: x.kind === 'future' ? 'future' : 'current', addedAt: iso(x.addedAt ?? x.added_at), extra: x.extra && typeof x.extra === 'object' && !Array.isArray(x.extra) ? { update: x.extra.update ? { at: iso(x.extra.update.at), closes: iso(x.extra.update.closes) } : undefined } : {},
  };
}

/**
 * Add what was read from emails to what is kept. One row per RFx ID: a tender seen again is not added twice.
 * An "additional information" item changes a tender already kept (its closing time and name, when the email states them) and notes the change;
 * with nothing kept for that RFx ID it is added as a current tender with the note.
 * Returns { items, added, updated, same } with items newest first and at most INBOX_MAX.
 */
export function mergeInbox(kept, parsed, now = new Date()) {
  const byId = new Map((Array.isArray(kept) ? kept : []).map(cleanInboxItem).filter(Boolean).map((i) => [i.rfxId, i]));
  let added = 0, updated = 0, same = 0;
  const at = now.toISOString();
  for (const p of Array.isArray(parsed) ? parsed : []) {
    const have = byId.get(p?.rfxId);
    if (p?.kind === 'update') {
      if (have) {
        const next = { ...have, name: clean(p.name) || have.name, closes: iso(p.closes) || have.closes, extra: { update: { at, closes: iso(p.closes) } } };
        if (JSON.stringify(next) === JSON.stringify(have)) same++; else { byId.set(have.rfxId, next); updated++; }
        continue;
      }
      const fresh = cleanInboxItem({ ...p, kind: 'current', name: clean(p.name) || `GETS notice ${p.rfxId}`, addedAt: at, extra: { update: { at, closes: p.closes } } });
      if (fresh) { byId.set(fresh.rfxId, fresh); added++; }
      continue;
    }
    const fresh = cleanInboxItem({ ...p, addedAt: at });
    if (!fresh) continue;
    if (have) {
      // seen again: a current tender never goes back to "advance notice"; a missing closing time is filled in
      const next = { ...have, closes: have.closes || fresh.closes, ref: have.ref || fresh.ref, organisation: have.organisation || fresh.organisation, kind: have.kind === 'current' || fresh.kind === 'current' ? 'current' : 'future' };
      if (JSON.stringify(next) === JSON.stringify(have)) same++; else { byId.set(have.rfxId, next); updated++; }
    } else { byId.set(fresh.rfxId, fresh); added++; }
  }
  const items = [...byId.values()].sort((a, b) => b.addedAt.localeCompare(a.addedAt) || a.rfxId.localeCompare(b.rfxId)).slice(0, INBOX_MAX);
  return { items, added, updated, same };
}

/** drop what closed more than 30 days ago, so the kept list does not grow for ever */
export const tidyInbox = (items, now = new Date()) => (Array.isArray(items) ? items : []).map(cleanInboxItem).filter((i) => i && (!i.closes || Date.parse(i.closes) > now.getTime() - 30 * 864e5)).slice(0, INBOX_MAX);

/** a kept item as a tender the scorer reads. An alert email has no region, no categories and no overview: the name and the buyer are what is read. */
export const tenderFromInbox = (i) => ({
  id: i.rfxId, title: i.name, buyer: i.organisation, url: i.url, regions: [], regionUnknown: true, categories: [], closes: i.closes || null, closesText: '', opened: null, // the day it was added is not the day the notice opened
  overview: '', value: null, valueText: '',
});

/** Rank kept items against a lens, exactly as GETS RSS findings are ranked. Items come back as findings from "GETS alert email"; future items carry advance: true. */
export function rankInbox(items, lens, now = new Date(), limit = 40) {
  const byId = new Map((items ?? []).map((i) => [i.rfxId, i]));
  return rankTenders(tidyInbox(items, now).map(tenderFromInbox), lens, now, limit).map((s) => {
    const i = byId.get(s.id.replace(/^gets:/, ''));
    return { ...s, id: `gets:${i.rfxId}`, source: 'alert', sourceName: 'GETS alert email', advance: i.kind === 'future', reasons: i.kind === 'future' ? ['an advance notice: the work is planned, not open yet', ...s.reasons.map((r) => r.replace(/^closes /, 'expected to close '))] : s.reasons };
  });
}
