// Reading a GETS "Tender Subscription" alert email: pure functions, no network, nothing saved or sent.
// A person pastes the email's text, or drops the .eml or .txt file, on the Found work strip; this turns it into tenders the same ranking
// can read. The text is data: it is never run, never shown as markup, and a link counts only when it is a gets.govt.nz tender page.
//
//   parseGetsAlert(text)  -> [{ rfxId, ref, organisation, name, closes (ISO, or ''), url, kind: 'current' | 'future' | 'update' }]
//   parseGetsEmail(text)  -> { type: 'subscription' | 'additional' | 'unknown', items }
//   emailText(raw)        -> the readable text of a raw .eml (MIME: quoted-printable and base64 decoded), or the text itself
//
// 'update' items come from a "GETS: Additional Information for GETS Notice" email: they change an RFx ID the practice may already have.
import { isGetsUrl, markupToText } from './hunt-rank.js';

export const MAX_ITEMS = 500, MAX_CHARS = 400000, MAX_LINE = 600;
const clean = (s) => String(s ?? '').replace(/[​-‍﻿ ]/g, ' ').replace(/\s+/g, ' ').trim();

// ---- dates -------------------------------------------------------------------------------------------------------------------------------
const NZ = new Intl.DateTimeFormat('en-US', { timeZone: 'Pacific/Auckland', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
const nzParts = (ms) => Object.fromEntries(NZ.formatToParts(new Date(ms)).filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]));
/** a wall-clock time in New Zealand to an ISO instant (daylight saving included), or '' when it is not a real time */
export function nzToIso(y, mo, d, h, mi) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  for (const off of [13, 12]) {
    const t = guess - off * 3600000, p = nzParts(t);
    if (p.year === y && p.month === mo && p.day === d && p.hour === h && p.minute === mi) return new Date(t).toISOString();
  }
  return '';
}
/** "07/12/2026 05:00PM" (day first) to an ISO time in New Zealand, or '' */
export function parseAlertDate(text) {
  const m = String(text ?? '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if (!m) return '';
  const [d, mo, y, mi] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[5])];
  let h = Number(m[4]);
  if (h < 1 || h > 12 || mi > 59 || mo < 1 || mo > 12 || d < 1 || d > 31) return '';
  h = (h % 12) + (m[6].toUpperCase() === 'PM' ? 12 : 0);
  return nzToIso(y, mo, d, h, mi);
}

// ---- links -------------------------------------------------------------------------------------------------------------------------------
/** { id, url } for a gets.govt.nz tender page (https, that host only, ExternalTenderDetails.htm, a numeric id), the link rebuilt without anything else on it; or null */
export function getsLink(raw) {
  const text = String(raw ?? '').trim().replace(/[)\].,;>"']+$/, '');
  if (!isGetsUrl(text)) return null;
  try {
    const u = new URL(text), m = /^\/+([A-Za-z0-9_-]{1,40})\/ExternalTenderDetails\.htm$/i.exec(u.pathname), id = u.searchParams.get('id') ?? '';
    if (!m || !/^\d{4,12}$/.test(id)) return null;
    return { id, url: `https://www.gets.govt.nz/${m[1]}/ExternalTenderDetails.htm?id=${id}` };
  } catch { return null; }
}

// ---- the text of the alert ---------------------------------------------------------------------------------------------------------------
const FIELD = /^(?:\(\s*\d{1,4}\s*\)\s*)?(Reference Number|Organisation|Organization|GETS RFx ID|RFx ID|Tender Name|Notice Name|Closing Date)\s*:\s*(.*)$/i;
const SECTION = [[/^current tenders\b/i, 'current'], [/^future procurement opportunities\b/i, 'future']];
const URL_IN = /https?:\/\/[^\s<>"]+/gi;

/** the items in an alert's text. Strict and bounded: at most 500 items; a block without a gets.govt.nz tender link is dropped. */
export function parseGetsAlert(text, { update = null } = {}) {
  const isUpdate = update ?? /additional information for gets notice/i.test(String(text ?? '').slice(0, MAX_CHARS));
  const lines = String(text ?? '').slice(0, MAX_CHARS).replace(/\r/g, '').split('\n').slice(0, 20000).map((l) => clean(l.slice(0, MAX_LINE)));
  const out = [], seen = new Set();
  let section = 'current', cur = null, waiting = ''; // waiting: a label whose value is on the next line (an email made from a table)
  const finish = () => {
    const b = cur; cur = null;
    if (!b || out.length >= MAX_ITEMS) return;
    const link = b.links.map(getsLink).find(Boolean);
    if (!link) return; // no gets.govt.nz tender link: dropped, whatever else it says
    const rfx = clean(b.rfx).replace(/\D/g, '');
    if (rfx && rfx !== link.id) return; // the email's number and its link disagree: not read
    const name = clean(b.name).slice(0, 300);
    if (!name && !isUpdate) return;
    const kind = isUpdate ? 'update' : b.section, key = `${link.id}:${kind}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ rfxId: link.id, ref: clean(b.ref).slice(0, 80), organisation: clean(b.org).slice(0, 200), name, closes: parseAlertDate(b.closes), url: link.url, kind });
  };
  const started = () => cur && (cur.rfx || cur.name || cur.org || cur.closes || cur.links.length);
  for (const line of lines) {
    if (!line) continue;
    const sec = SECTION.find(([re]) => re.test(line));
    if (sec) { finish(); section = sec[1]; waiting = ''; continue; }
    const f = FIELD.exec(line);
    if (!f && waiting && cur && !/https?:\/\//i.test(line)) { cur[waiting] = line; waiting = ''; continue; }
    if (f) {
      const key = f[1].toLowerCase();
      // a block starts at "(n) Reference Number:", or at the first field that its block already has
      const own = { 'reference number': 'ref', organisation: 'org', organization: 'org', 'gets rfx id': 'rfx', 'rfx id': 'rfx', 'tender name': 'name', 'notice name': 'name', 'closing date': 'closes' }[key];
      if (/^\(\s*\d/.test(line) || (cur && cur[own])) finish();
      cur ??= { section, ref: '', org: '', rfx: '', name: '', closes: '', links: [] };
      cur[own] = f[2]; waiting = f[2] ? '' : own;
      continue;
    }
    waiting = '';
    const urls = line.match(URL_IN);
    if (urls) {
      if (!cur) cur = { section, ref: '', org: '', rfx: '', name: '', closes: '', links: [] };
      cur.links.push(...urls.slice(0, 3));
      if (started() && urls.some((u) => getsLink(u))) finish(); // the tender's link closes its block
      else if (cur.links.length >= 3) finish();
    }
  }
  finish();
  return out;
}

/** what kind of email this is, and its items */
export function parseGetsEmail(text) {
  const t = String(text ?? '').slice(0, MAX_CHARS), head = t.slice(0, 4000);
  const additional = /additional information for gets notice/i.test(head);
  const items = parseGetsAlert(t, { update: additional });
  const subscription = /gets:\s*tender subscription/i.test(head) || /current tenders|future procurement opportunities/i.test(t);
  return { type: additional ? 'additional' : subscription || items.length ? 'subscription' : 'unknown', items };
}

// ---- a raw .eml ---------------------------------------------------------------------------------------------------------------------------
const bytesToText = (bytes, charset) => {
  const cs = /^[a-z0-9_.:-]{2,30}$/i.test(charset ?? '') ? charset : 'utf-8';
  try { return new TextDecoder(cs, { fatal: false }).decode(bytes); } catch { return new TextDecoder('utf-8').decode(bytes); }
};
export function decodeQuotedPrintable(s, charset) {
  const src = String(s).replace(/[ \t]+(\r?\n)/g, '$1').replace(/=\r?\n/g, ''), out = [];
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '=' && /^[0-9A-Fa-f]{2}$/.test(src.slice(i + 1, i + 3))) { out.push(parseInt(src.slice(i + 1, i + 3), 16)); i += 2; }
    else out.push(...new TextEncoder().encode(c));
  }
  return bytesToText(Uint8Array.from(out), charset);
}
export function decodeBase64(s, charset) {
  try {
    const bin = atob(String(s).replace(/[^A-Za-z0-9+/=]/g, ''));
    return bytesToText(Uint8Array.from(bin, (c) => c.charCodeAt(0)), charset);
  } catch { return ''; }
}
/** "Content-Type: text/plain; charset=utf-8" style headers (folded lines joined) to { name: value } */
function headersOf(block) {
  const h = {};
  for (const line of String(block).replace(/\r/g, '').replace(/\n[ \t]+/g, ' ').split('\n')) {
    const m = /^([A-Za-z0-9-]{1,40}):\s*(.*)$/.exec(line);
    if (m && !(m[1].toLowerCase() in h)) h[m[1].toLowerCase()] = m[2];
  }
  return h;
}
const splitHead = (raw) => { const m = /\r?\n\r?\n/.exec(raw); return m ? [raw.slice(0, m.index), raw.slice(m.index + m[0].length)] : [raw, '']; };
const param = (v, name) => { const m = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|([^;\\s]+))`, 'i').exec(v ?? ''); return m ? (m[1] ?? m[2]) : ''; };
function bodyText(head, body) {
  const h = headersOf(head), type = (h['content-type'] ?? 'text/plain').toLowerCase(), enc = (h['content-transfer-encoding'] ?? '7bit').toLowerCase().trim();
  const decoded = enc === 'quoted-printable' ? decodeQuotedPrintable(body, param(h['content-type'], 'charset')) : enc === 'base64' ? decodeBase64(body, param(h['content-type'], 'charset')) : body;
  return { type, text: decoded };
}
/** The readable text of a raw email. Text parts only (plain, else the html with its tags taken out); attachments are not read. Not an email: returned as it is. */
export function emailText(raw) {
  const src = String(raw ?? '').slice(0, 4 * MAX_CHARS);
  const [head, body] = splitHead(src);
  const h = headersOf(head);
  if (!/^(content-type|mime-version|subject|from|received|return-path|delivered-to):/im.test(head) || !Object.keys(h).length) return src; // not an email: the text as it is
  const plain = [], html = []; let parts = 0;
  const walk = (headBlock, bodyBlock, depth) => {
    if (++parts > 60 || depth > 4) return;
    const ph = headersOf(headBlock), type = (ph['content-type'] ?? 'text/plain').toLowerCase();
    if (/attachment/i.test(ph['content-disposition'] ?? '')) return;
    if (type.startsWith('multipart/')) {
      const boundary = param(ph['content-type'], 'boundary');
      if (!boundary) return;
      for (const piece of bodyBlock.split(`--${boundary}`).slice(1)) {
        if (piece.startsWith('--')) break;
        const [ch, cb] = splitHead(piece.replace(/^\r?\n/, ''));
        walk(ch, cb, depth + 1);
      }
      return;
    }
    const { text } = bodyText(headBlock, bodyBlock);
    if (type.startsWith('text/plain')) plain.push(text); else if (type.startsWith('text/html')) html.push(markupToText(text));
  };
  walk(head, body, 0);
  const subject = h.subject ? `Subject: ${decodeWords(h.subject)}\n\n` : '';
  return subject + (plain.length ? plain : html).join('\n\n');
}
/** =?utf-8?Q?...?= and =?utf-8?B?...?= words in a header */
function decodeWords(s) {
  return String(s).replace(/=\?([^?]+)\?([QqBb])\?([^?]*)\?=/g, (_, cs, enc, t) => (/b/i.test(enc) ? decodeBase64(t, cs) : decodeQuotedPrintable(t.replace(/_/g, ' '), cs)));
}
