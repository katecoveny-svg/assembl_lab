// Pursuit studio: the pack. A print-ready A4 document the practice saves as a PDF from its own browser: a cover, the draft
// sections, the visuals, the requirements with their sources, and working notes for the practice. Pure: it builds a list of
// blocks (HTML strings) and packs them into pages from measured heights; pursuit.js measures and draws them.
//
//   packFooter(name)            the line on every page: "Draft prepared with assembl for <practice> to review. Not submitted."
//   packBlocks(input)           [{ id, kind, html, keepNext, newPage }] in reading order
//   paginate(blocks, heights, pageHeight)   [[block index, ...], ...] one list a page; a heading never ends a page
//   markHtml(text)              a section's text as paragraphs, with "[practice to add: …]" shown as a marked gap
//
// Every generated section is marked Draft. No fee is ever written: the fees section is the practice's own marker.

import { SECTIONS } from './pursuit-schema.js';
import { esgCoverage, forSection, splitMarkers } from './pursuit-model.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const longDay = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? '')); if (m) return `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`; const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

export const packFooter = (name) => `Draft prepared with assembl for ${String(name ?? '').trim() || 'the practice'} to review. Not submitted.`;

/** paragraphs (a blank line apart), each marker shown as a marked gap the practice still has to fill */
export function markHtml(text) {
  return String(text ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\[practice to add[^\]]*\]/gi, (m) => `<mark class="pk-gap">${m}</mark>`).replace(/\n/g, '<br>')}</p>`);
}

/**
 * The pack's blocks, in order. input = { notice, pursuit, practiceName, place, list (applicable requirements), team (teamRows),
 * projects ([{ name, stage }] ticked), visuals: { still, stillNote, programme, wheel }, now }
 */
export function packBlocks({ notice, pursuit, practiceName = '', place = '', list = [], team = [], projects = [], visuals = {}, now = new Date() }) {
  const out = [], push = (kind, html, o = {}) => out.push({ id: `${kind}-${out.length}`, kind, html, keepNext: !!o.keepNext, newPage: !!o.newPage });
  const refs = list.filter((r) => r.applies !== 'no'), refNo = new Map(refs.map((r, i) => [r.id, i + 1]));
  const draft = pursuit?.draft;
  const name = String(practiceName ?? '').trim() || 'the practice';
  // ---- cover
  push('cover', `<section class="pk-cover">
    <p class="pk-kick">Tender response · Draft</p>
    <h1 class="pk-title">${esc(notice.title)}</h1>
    <dl class="pk-facts">
      ${notice.buyer ? `<div><dt>Buyer</dt><dd>${esc(notice.buyer)}</dd></div>` : ''}
      ${notice.ref ? `<div><dt>Reference</dt><dd>${esc(notice.ref)}</dd></div>` : ''}
      ${notice.region || place ? `<div><dt>Where</dt><dd>${esc(place || notice.region)}</dd></div>` : ''}
      ${notice.closes ? `<div><dt>Closes</dt><dd>${esc(longDay(notice.closes))}</dd></div>` : ''}
      <div><dt>Prepared for</dt><dd>${esc(name)}</dd></div>
      <div><dt>Prepared</dt><dd>${esc(longDay(now))}</dd></div>
    </dl>
    <p class="pk-stamp"><span>Draft</span> for the practice to check, edit and approve. Nothing in this pack has been submitted or sent. No section is a professional sign-off, and nothing here says a design meets any rule.</p>
  </section>`, { newPage: true });
  // ---- contents
  push('contents', `<section class="pk-contents"><h2>Contents</h2><ol>${SECTIONS.map((s) => `<li>${esc(s.title)}</li>`).join('')}<li>Site and massing study</li><li>Environmental, social and governance coverage</li><li>Requirements and sources</li><li>Working notes for the practice</li></ol></section>`, { newPage: true });
  // ---- sections
  SECTIONS.forEach((s, i) => {
    const sec = draft?.sections?.[s.key];
    push('h', `<h2 class="pk-h"><span class="pk-n">${i + 1}</span>${esc(s.title)}<span class="pk-draft">Draft</span></h2>`, { keepNext: true, newPage: i === 0 });
    if (!sec || !String(sec.body).trim()) push('p', `<p class="pk-none">Not drafted yet.</p>`);
    else for (const p of markHtml(sec.body)) push('p', p);
    if (s.key === 'programme') { if (visuals.programme) push('figure', `<figure class="pk-fig">${visuals.programme}</figure>`); if (visuals.wheel) push('figure', `<figure class="pk-fig pk-wheel">${visuals.wheel}</figure>`); }
    if (s.key === 'team' && team.length) push('table', `<table class="pk-table"><thead><tr><th>Person</th><th>Hours a week</th><th>Already planned</th><th>Free</th></tr></thead><tbody>${team.map((t) => `<tr><td>${esc(t.name)}</td><td>${t.capacity ?? '[practice to add]'}</td><td>${t.planned ?? '–'}</td><td>${t.free ?? '–'}</td></tr>`).join('')}</tbody></table><p class="pk-cap">From the practice’s Money settings: the hours each person typed, and the average already planned over the next twelve weeks.</p>`);
    if (s.key === 'experience' && projects.length) push('list', `<ul class="pk-list">${projects.map((p) => `<li>${esc(p.name)}${p.stage ? ` · reached ${esc(p.stage.toLowerCase())}` : ''}</li>`).join('')}</ul><p class="pk-cap">Ticked by the practice from its own projects.</p>`);
    const cites = [...new Set([...(sec?.cites ?? []), ...forSection(s.key, refs).map((r) => r.id)])].filter((id) => refNo.has(id)).sort((a, b) => refNo.get(a) - refNo.get(b));
    const needs = sec?.needs ?? [], gaps = sec ? splitMarkers(sec.body).marks.length : 0;
    if (s.key !== 'fees' && (cites.length || needs.length || gaps)) push('meta', `<p class="pk-meta">${cites.length ? `<span>Sources: ${cites.map((id) => `[${refNo.get(id)}]`).join(' ')}</span>` : ''}${gaps ? `<span>${gaps} ${gaps === 1 ? 'gap' : 'gaps'} to fill</span>` : ''}${needs.length ? `<span>To add: ${esc(needs.join('; '))}</span>` : ''}</p>`);
  });
  // ---- visuals
  push('h', `<h2 class="pk-h"><span class="pk-n">A</span>Site and massing study<span class="pk-draft">Draft</span></h2>`, { keepNext: true, newPage: true });
  if (visuals.still) push('figure', `<figure class="pk-fig pk-still"><img src="${esc(visuals.still)}" alt="The site from above at an angle: neighbouring buildings, the parcel boundary, north and a scale bar, and a simple massing block."><figcaption><strong>Massing study, not a design.</strong> ${esc(visuals.stillNote ?? '')}</figcaption></figure>`);
  else push('p', '<p class="pk-none">No site scene yet: choose the site in the studio’s Visuals step.</p>');
  // ---- ESG
  const esg = esgCoverage(draft?.sections ?? {});
  push('h', `<h2 class="pk-h"><span class="pk-n">B</span>Environmental, social and governance coverage</h2>`, { keepNext: true });
  push('p', '<p class="pk-cap">Which points the draft’s own words cover, and which it does not yet. Coverage only, read from the draft: not a score or a rating.</p>');
  push('esg', `<div class="pk-esg">${Object.values(esg).map((g) => `<div><h3>${esc(g.label)} · ${g.covered} of ${g.points.length}</h3><ul>${g.points.map((p) => `<li class="is-${p.state.replace(' ', '-')}"><span class="pk-dot" aria-hidden="true"></span>${esc(p.label)}<em>${p.state === 'covered' ? 'covered' : p.state === 'named' ? 'named, still to fill' : 'not yet'}</em></li>`).join('')}</ul></div>`).join('')}</div>`);
  // ---- requirements
  push('h', `<h2 class="pk-h"><span class="pk-n">C</span>Requirements and sources</h2>`, { keepNext: true, newPage: true });
  push('p', '<p class="pk-cap">Each line is assembl’s short wording of what the publisher says, with the publisher’s own words in quotation marks. Read the source before relying on it. Nothing here says a response or a design meets any rule.</p>');
  for (const r of refs) push('req', `<div class="pk-req"><p class="pk-req-h"><span class="pk-ref">[${refNo.get(r.id)}]</span><strong>${esc(r.title)}</strong> · ${esc(r.publisher)}${r.status === 'voluntary' ? ' · voluntary' : r.status === 'replaced' ? ' · replaced' : ''}</p><p>${esc(r.summary)}${r.evidence?.quote ? ` The publisher’s words: “${esc(r.evidence.quote)}”.` : ''}</p><p class="pk-src">${esc(r.url)} · read ${esc(longDay(r.read_on))} · informs ${esc(r.informs.map((k) => SECTIONS.find((s) => s.key === k)?.title ?? k).join(', '))}</p></div>`);
  // ---- working notes
  const ideas = pursuit?.ideas, kept = (ideas?.ideas ?? []).filter((i) => pursuit.keep.includes(i.id));
  push('h', `<h2 class="pk-h"><span class="pk-n">D</span>Working notes for the practice</h2>`, { keepNext: true, newPage: true });
  push('p', '<p class="pk-warn">For the practice only. Take these pages out before anything goes to the buyer.</p>');
  if (kept.length) { push('h3', '<h3 class="pk-h3">Ideas kept for this pursuit</h3>', { keepNext: true }); for (const i of kept) push('p', `<p><strong>${esc(i.title)}.</strong> ${esc(i.what)}</p>`); }
  if (ideas?.questions?.length) { push('h3', '<h3 class="pk-h3">Questions to ask the buyer</h3>', { keepNext: true }); push('list', `<ol class="pk-list">${ideas.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>`); }
  if (ideas?.go_no_go?.length) { push('h3', '<h3 class="pk-h3">Go or no-go</h3>', { keepNext: true }); push('list', `<ul class="pk-checks">${ideas.go_no_go.map((g) => `<li class="${pursuit.checks[g.id] ? 'on' : ''}"><span class="pk-box" aria-hidden="true"></span>${esc(g.check)}<em>${pursuit.checks[g.id] ? 'ticked' : 'not ticked'}</em></li>`).join('')}</ul>`); }
  if (!kept.length && !ideas) push('p', '<p class="pk-none">No ideas asked for yet.</p>');
  if (ideas?.at) push('p', `<p class="pk-cap">Ideas ${ideas.sample ? 'are a made-up sample' : `written by Claude (${esc(ideas.model || 'model not recorded')})`} on ${esc(longDay(ideas.at))}. A draft for the practice to judge.</p>`);
  return out;
}

/**
 * Pack blocks into pages, given each block's height and a page's height (the same units). A block that asks for a new page
 * starts one; a heading (keepNext) moves to the next page with the block after it; a block taller than a page gets a page of its own.
 */
export function paginate(blocks, heights, pageHeight) {
  const pages = [];
  let page = [], used = 0;
  const flush = () => { if (page.length) pages.push(page); page = []; used = 0; };
  for (let i = 0; i < blocks.length; i++) {
    const h = Math.max(0, heights[i] ?? 0), b = blocks[i];
    if (b.newPage) flush();
    const need = b.keepNext && i + 1 < blocks.length ? h + Math.min(heights[i + 1] ?? 0, pageHeight - h) : h;
    if (page.length && used + need > pageHeight) flush();
    page.push(i); used += h;
  }
  flush();
  return pages;
}
