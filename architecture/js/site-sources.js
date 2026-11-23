// Site and sources: an add-on for the ops page (see modules.js), in each project's Site tab. Everything the 3D fly-through
// needs to know about the site, in one place: the site (read from the Site tab, not asked for again), five slots for the
// files (drawing set, site plan, camera path sketch, survey, other), the camera path record, and Open the walkthrough.
//
// Where files go: the project's own store, the same way Models keeps them (ctx.store.putFile; over 6 MB in a practice's
// shared records goes up in parts that pause and carry on, upload.js). owner_kind is 'source', so a source never shows
// in the Models section. Each note carries extra.source = { slot, version, by, note }. A new file in a fixed slot keeps the
// old one under "earlier versions".
// The project record carries site_sources (site-sources-rules.js has the contract). The tracing itself happens on the 3D page;
// here the path is stored and shown, and a person confirms it. Until then it is a proposal.
// What it never does: read a drawing, work out a position or a size, or fetch anything new about the site.
import { registerProjectPanel } from './modules.js';
import { placeFor, sizeProblem, sizeText, KINDS, kindOf, TWIN_DROP } from './models-rules.js';
import { activity, SAMPLE_ID } from './model.js';
import { placeLine } from './facts.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, BUCKET } from './config.js';
import {
  SLOTS, slotOf, acceptFor, checkSource, bySlot, nextVersion, sourceExtra, isSource, normalSiteSources, isConfirmed, pathPoints,
  pointFromSite, pointDiffers, parcelStatus, GROUND, pickModel, hasModel, siteHandoff, blobSlots, withSiteSources, confirmPath, ext, backToSource, GALLERY, mediaOf,
} from './site-sources-rules.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const when = (v) => { const d = new Date(v); if (!v || Number.isNaN(d.getTime())) return ''; const h = d.getHours(); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
const isSample = (p) => !!p && (p.sample === true || p.id === SAMPLE_ID);
const nb = (t) => String(t ?? '').replace(/(\d) (bytes|KB|MB|GB|m²|m\b)/g, '$1 $2');
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function ensureCss() {
  if (document.querySelector('link[data-site-sources-css]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = new URL('../site-sources.css?v=2', import.meta.url).href; l.dataset.siteSourcesCss = '';
  document.head.append(l);
}

const svg = (body, cls = '') => `<svg class="ssx-ic${cls ? ` ${cls}` : ''}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">${body}</svg>`;
const IC = {
  drop: '<path d="M16 3v16M10 13l6 6 6-6"/><path d="M4 17v10h24V17"/>',
  sheet: '<path d="M7 3h13l5 5v21H7Z"/><path d="M20 3v5h5M11 15h10M11 19h10M11 23h6"/>',
  plan: '<path d="M4 6h24v20H4Z"/><path d="M4 14h10v12M14 14h14M20 14v12"/><path d="M8 10h2"/>',
  path: '<path d="M4 26c6-1 6-9 12-9s5-9 12-11"/><path d="M4 26l0 0M24 3l4 3-4 3"/><circle cx="5" cy="26" r="1.6"/>',
  survey: '<path d="M4 24c5-2 9-12 14-12s7 6 10 6"/><path d="M4 28h24M16 4v6M13 7h6"/>',
  file: '<path d="M7 3h13l5 5v21H7Z"/><path d="M20 3v5h5"/>',
  pin: '<path d="M16 29s9-8.2 9-15A9 9 0 0 0 7 14c0 6.800 9 15 9 15Z"/><circle cx="16" cy="14" r="3.2"/>',
  parcel: '<path d="M5 9l14-4 8 6-3 14-16 3Z" stroke-dasharray="3 2.5"/><path d="M12 16h8"/>',
  ground: '<path d="M3 22c5-4 8-9 13-9s8 5 13 9"/><path d="M3 27h26M3 22v5M29 22v5M10 19v8M16 13v14M22 19v8" stroke-width="1"/>',
  walk: '<path d="M6 16h18M18 10l6 6-6 6"/>',
  cube: '<path d="M16 3 28 9.5v13L16 29 4 22.5v-13Z"/><path d="M4 9.5 16 16l12-6.5M16 16v13"/>',
};

// ---- state that outlives a redraw ------------------------------------------------------------------------------------
const S = {
  jobs: new Map(),   // job id -> { id, pid, slot, name, size, stage, sent, total, up }
  notes: new Map(),  // project id -> [{ id, name, text }]
  words: new Map(),  // project id + slot -> the one-line note typed for the next file
  confirm: '',       // the file id whose Remove was pressed once
  open: new Set(),   // slot stack keys whose earlier versions are shown
  media: new Map(),  // file id -> object URL of a film or still, for the gallery
  walk: new Map(),   // project id -> { state, text, href }
};
let seq = 0;
let saved = null;
const say = (pid, name, text) => { const l = S.notes.get(pid) ?? []; l.unshift({ id: `n${++seq}`, name, text }); S.notes.set(pid, l.slice(0, 4)); };

// ---- where this project's files go -------------------------------------------------------------------------------------
function placeHere(ctx, p) {
  const shared = !!ctx.store.shared;
  return placeFor({ shared, sample: isSample(p), viewer: shared && !isSample(p) && ctx.practice?.role === 'viewer', practice: ctx.practice?.name ?? '', signIn: ctx.account?.state ?? {} });
}
const PART = 6 * 1024 * 1024;

// ---- the section ---------------------------------------------------------------------------------------------------------
async function renderPanel(el, ctx) {
  ensureCss();
  const p = ctx.project;
  if (!p) return undefined;
  // anything the 3D page passed back since (camera path, fly-through, films, shots, the look) comes into the project first
  if (!placeHere(ctx, p).viewer) { listenBacks(ctx, p); if (await collectBacks(ctx, p)) return ctx.redraw(); }
  const files = (await ctx.store.listFiles({ project_id: p.id })).filter(isSource);
  const place = placeHere(ctx, p);
  // the point is the Site tab's point: bring the record into step with it, once
  if (!place.viewer && pointDiffers(normalSiteSources(p.site_sources).point, p.site)) {
    try { await withSiteSources(ctx.store, p.id, (ss) => ({ ...ss, point: pointFromSite(p.site) })); p.site_sources = { ...normalSiteSources(p.site_sources), point: pointFromSite(p.site) }; } catch { /* shown from the Site tab either way */ }
  }
  const all = await ctx.store.listFiles({ project_id: p.id });
  const picked = pickModel(all, p);
  if (S.confirm && !files.some((f) => f.id === S.confirm)) S.confirm = '';
  el.innerHTML = html(ctx, p, files, place, picked, !picked && hasModel(all, p));
  wire(el, ctx, p, place, files);
  void loadThumbs(el, ctx, files);
  return () => el.__ssxOff?.();
}

function html(ctx, p, files, place, picked, skipped) {
  const esc = ctx.esc, ss = normalSiteSources(p.site_sources), slots = bySlot(files);
  const count = files.length ? plural(slots.reduce((n, s) => n + s.stacks.length, 0), 'source') : '';
  const notes = (S.notes.get(p.id) ?? []).map((n) => `<li class="ssx-note-card is-error" role="alert"><p><b>Not kept.</b> ${n.name ? `${esc(n.name)}: ` : ''}${esc(nb(n.text))}</p><button class="link" data-s="dismiss" data-id="${esc(n.id)}">Dismiss</button></li>`).join('');
  return `<div class="ssx" data-ssx="${esc(p.id)}">
    <div class="ssx-head"><p class="label">Site and sources</p>${count ? `<p class="ssx-count">${esc(count)}</p>` : ''}</div>
    ${siteHtml(esc, p, ss)}
    ${notes ? `<ul class="ssx-notes">${notes}</ul>` : ''}
    <ul class="ssx-slots">${slots.map((s) => slotHtml(ctx, p, s, place)).join('')}</ul>
    ${pathHtml(ctx, p, ss, files, place)}
    ${walkHtml(ctx, p, ss, files, picked, skipped)}
  </div>`;
}

// ---- the site: three labelled facts --------------------------------------------------------------------------------------
function siteHtml(esc, p, ss) {
  const s = p.site ?? {}, a = s.address, pt = ss.point, par = parcelStatus(s);
  const place = a?.address ? placeLine(a) || 'Address chosen' : pt ? 'A point' : '';
  const tile = (ic, label, mark, main, line, extra = '') => `<li class="ssx-fact">${svg(IC[ic])}<div><p class="ssx-fl">${esc(label)}</p><p class="ssx-fm"><span class="ssx-st">${mark}</span> ${esc(main)}</p>${line ? `<p class="ssx-fs">${esc(nb(line))}</p>` : ''}${extra}</div></li>`;
  return `<ul class="ssx-facts" aria-label="The site">
    ${pt ? tile('pin', 'Site', '■ Set', place, `${pt.source}. ${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}`) : tile('pin', 'Site', '□ Not set', 'No address or point yet', 'Choose the address in the site tools above. It is used here as it is.')}
    ${tile('parcel', 'Parcel boundary (LINZ)', par.state === 'live' ? '■ Read' : '□', par.word, [par.says, par.from && par.state === 'live' ? `from ${par.from}` : '', par.asOf ? `as of ${String(par.asOf).slice(0, 10)}` : ''].filter(Boolean).join(' · '))}
    ${tile('ground', 'Ground', pt ? '■ Source' : '□', GROUND.word, pt ? GROUND.says : 'Needs the site point first. Read on the 3D page, not here.')}
    ${placementTile(esc, ss.placement, tile)}
  </ul>`;
}
/** where the building stands on the site: set on the 3D page (Place the building), confirmed there by a person */
function placementTile(esc, pl, tile) {
  if (!pl) return tile('cube', 'Building placement', '□ Assumed', 'Middle at the site point', 'An address point is the road address, not the building. Place it on the 3D page and confirm it there.');
  const how = pl.method === 'matched' ? `Matched to ${pl.matched_to ?? 'a LINZ outline'}${pl.residual_m != null ? `, residual ${pl.residual_m} m` : ''}` : pl.method === 'by hand' ? 'Placed by hand' : 'At the site point';
  return tile('cube', 'Building placement', pl.status === 'set by a person' ? '■ Set by a person' : '□ Assumed', how, `${Math.round(Math.hypot(pl.east, pl.north))} m from the site point, turned ${pl.turn_deg}°${pl.status === 'set by a person' ? ` · ${pl.confirmed_by}, ${when(pl.confirmed_at)}` : ' · not confirmed'}`);
}

// ---- the five slots --------------------------------------------------------------------------------------------------------
function slotHtml(ctx, p, { slot, stacks }, place) {
  const esc = ctx.esc, id = esc(slot.id);
  const drop = place.viewer ? '' : `<label class="ssx-drop${stacks.length ? ' is-filled' : ''}" data-sdrop="${id}">
      <input type="file" class="vh" data-spick="${id}" ${acceptFor(slot) ? `accept="${esc(acceptFor(slot))}"` : ''}${slot.id === 'other' || GALLERY.has(slot.id) ? ' multiple' : ''} />
      ${svg(IC[slot.icon], 'ssx-drop-ic')}
      <span class="ssx-t">${esc(slot.word)}</span>
      <span class="ssx-k">${esc(slot.tag)}</span>
      <span class="ssx-cta">${GALLERY.has(slot.id) ? (stacks.length ? 'Drop or choose more' : 'Drop or choose') : stacks.length && slot.id !== 'other' ? 'Drop a new version' : 'Drop or choose'}</span>
    </label>
    <input class="ssx-note-in" data-snote="${id}" maxlength="140" value="${esc(S.words.get(p.id + slot.id) ?? '')}" placeholder="One-line note for the next file" aria-label="${esc(`Note for the next ${slot.word.toLowerCase()} file`)}" />`;
  const jobs = [...S.jobs.values()].filter((j) => j.pid === p.id && j.slot === slot.id).map((j) => jobHtml(esc, j)).join('');
  return `<li class="ssx-slot" data-slot="${id}">
    ${drop}
    ${slot.hint && !stacks.length ? `<p class="ssx-hint">${esc(slot.hint)}</p>` : ''}
    ${jobs}
    ${GALLERY.has(slot.id) ? (stacks.length ? `<ul class="ssx-gallery" aria-label="${esc(`${slot.word}: ${plural(stacks.length, 'item')}, newest first`)}">${stacks.map((s) => galleryItem(ctx, s, place)).join('')}</ul>` : '') : stacks.map((s) => cardHtml(ctx, s, place)).join('')}
    ${!stacks.length && !jobs && place.viewer ? '<p class="ssx-empty">Nothing here yet.</p>' : ''}
  </li>`;
}

function jobHtml(esc, j) {
  const pct = j.total ? Math.floor((j.sent / j.total) * 100) : 0;
  const btns = j.up && !['done', 'recording'].includes(j.up.state)
    ? (j.up.state === 'paused' || j.up.state === 'stalled' ? `<button class="btn" data-s="resume" data-job="${esc(j.id)}">${j.up.state === 'stalled' ? 'Try again' : 'Resume'}</button>` : `<button class="btn" data-s="pause" data-job="${esc(j.id)}">Pause</button>`) + `<button class="link" data-s="stop" data-job="${esc(j.id)}">Stop</button>` : '';
  return `<div class="ssx-job" role="status"><p class="ssx-name">${esc(j.name)}</p>
    <div class="ssx-bar${j.up ? '' : ' is-busy'}" role="progressbar" aria-label="Sent so far" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${j.up ? pct : 100}%"></i></div>
    <p class="ssx-meta">${j.up ? `${pct}% · ${esc(nb(`${sizeText(j.sent)} of ${sizeText(j.total)}`))}` : esc(j.stage)}</p>${btns ? `<div class="acts">${btns}</div>` : ''}</div>`;
}

function cardHtml(ctx, s, place) {
  const esc = ctx.esc, f = s.latest, src = f.extra.source, sure = S.confirm === f.id, canChange = !place.viewer;
  const meta = nb([sizeText(f.size), src.by || 'added in this browser', when(f.kept_at)].filter(Boolean).join(' · '));
  const key = `${src.slot}:${f.id}`;
  const older = s.older.length ? `<details class="ssx-older" data-older="${esc(s.latest.id)}"${S.open.has(s.latest.id) ? ' open' : ''}><summary>${plural(s.older.length, 'earlier version')}</summary><ul>${s.older.map((o) => `<li><span class="ssx-v">v${o.version}</span><span class="ssx-meta">${esc(nb([o.name !== f.name ? o.name : '', sizeText(o.size), o.extra.source.by || 'added in this browser', when(o.kept_at)].filter(Boolean).join(' · ')))}</span>
      <span class="ssx-oa"><button class="link" data-s="get" data-id="${esc(o.id)}">Download<span class="vh"> v${o.version}</span></button>${canChange ? `<button class="link" data-s="remove" data-id="${esc(o.id)}">${S.confirm === o.id ? 'Remove for good' : 'Remove'}<span class="vh"> v${o.version}</span></button>` : ''}</span></li>`).join('')}</ul></details>` : '';
  return `<div class="ssx-file" data-file="${esc(f.id)}" data-key="${esc(key)}">
    <p class="ssx-top"><span class="ssx-tag">${esc((ext(f.name) || 'file').toUpperCase())}</span><span class="ssx-v">v${f.version}</span></p>
    <p class="ssx-name">${esc(f.name)}</p><p class="ssx-meta">${esc(meta)}</p>
    ${src.note ? `<p class="ssx-says">${esc(src.note)}</p>` : ''}
    <div class="acts"><button class="btn" data-s="get" data-id="${esc(f.id)}">Download<span class="vh"> ${esc(f.name)}</span></button>${canChange ? `<button class="link" data-s="remove" data-id="${esc(f.id)}">${sure ? 'Remove for good' : 'Remove'}<span class="vh"> ${esc(f.name)} v${f.version}</span></button>` : ''}</div>
    ${older}</div>`;
}

// ---- Films and stills: a gallery, each film and still its own item -------------------------------------------------------------
// The pictures are this project's own kept files: each is read once into a local object URL (S.media) and shown inline.
function galleryItem(ctx, s, place) {
  const esc = ctx.esc, f = s.latest, src = f.extra.source, kind = mediaOf(f), url = S.media.get(f.id), sure = S.confirm === f.id;
  const meta = nb([sizeText(f.size), when(f.kept_at)].filter(Boolean).join(' · '));
  const view = kind === 'image' ? (url ? `<img src="${esc(url)}" alt="${esc(f.name)}" loading="lazy" />` : '<span class="ssx-thumb-wait" aria-hidden="true"></span>')
    : kind === 'video' ? (url ? `<video src="${esc(url)}#t=0.1" preload="metadata" controls playsinline muted aria-label="${esc(f.name)}"></video>` : '<span class="ssx-thumb-wait" aria-hidden="true"></span>')
    : `<span class="ssx-thumb-file">${esc((ext(f.name) || 'file').toUpperCase())}</span>`;
  return `<li class="ssx-tile" data-file="${esc(f.id)}" ${kind !== 'file' && !url ? `data-thumb="${esc(f.id)}"` : ''}>
    <div class="ssx-thumb is-${kind}">${view}</div>
    <p class="ssx-name" title="${esc(f.name)}">${esc(f.name)}</p><p class="ssx-meta">${esc(meta)}</p>
    ${src.note ? `<p class="ssx-says">${esc(src.note)}</p>` : ''}
    <div class="acts"><button class="link" data-s="get" data-id="${esc(f.id)}">Download<span class="vh"> ${esc(f.name)}</span></button>${place.viewer ? '' : `<button class="link" data-s="remove" data-id="${esc(f.id)}">${sure ? 'Remove for good' : 'Remove'}<span class="vh"> ${esc(f.name)}</span></button>`}</div></li>`;
}
let thumbing = false;
async function loadThumbs(el, ctx, files) {
  if (thumbing) return;
  const want = [...el.querySelectorAll('[data-thumb]')].map((n) => files.find((f) => f.id === n.dataset.thumb)).filter(Boolean);
  if (!want.length) return;
  thumbing = true;
  let got = 0;
  try {
    for (const f of want) {
      if (S.media.has(f.id)) continue;
      try { S.media.set(f.id, URL.createObjectURL(await blobOf(ctx, f))); got++; } catch { S.media.set(f.id, ''); }
    }
  } finally { thumbing = false; }
  if (got) ctx.redraw();
}

// ---- the camera path ---------------------------------------------------------------------------------------------------------
function pathHtml(ctx, p, ss, files, place) {
  const esc = ctx.esc, c = ss.camera_path;
  if (!c) return `<section class="ssx-path" aria-label="Camera path">${svg(IC.path, 'ssx-path-ic')}<div><p class="ssx-fl">Camera path</p><p class="ssx-fm"><span class="ssx-st">□</span> No path yet</p>
    <p class="ssx-fs">It is traced on the 3D page, from the camera path sketch. A person confirms it before it is used.</p></div></section>`;
  const pts = pathPoints(c), ok = isConfirmed(c);
  const sketch = files.find((f) => f.id === c.sketch_file_id);
  const draw = `<svg class="ssx-plan" viewBox="0 0 100 100" role="img" aria-label="${esc(`The camera path from above, ${c.pts.length} points`)}"><path d="M0 50h100M50 0v100" class="ssx-axis"/><polyline points="${pts.map((q) => q.map((x) => x.toFixed(1)).join(',')).join(' ')}" class="ssx-line${ok ? '' : ' is-prop'}"/>
    ${pts.map((q, i) => `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${i === 0 || i === pts.length - 1 ? 2.6 : 1.5}" class="${i === 0 ? 'ssx-a' : i === pts.length - 1 ? 'ssx-b' : 'ssx-m'}"/>`).join('')}</svg>`;
  return `<section class="ssx-path${ok ? '' : ' is-prop'}" aria-label="Camera path">${draw}<div><p class="ssx-fl">Camera path</p>
    <p class="ssx-fm"><span class="ssx-st">${ok ? '■' : '□'}</span> ${ok ? 'Confirmed' : 'Proposed, not confirmed'}</p>
    <p class="ssx-fs">${esc(nb(ok ? `${c.confirmed_by}, ${when(c.confirmed_at)}` : `Traced by ${c.traced_by === 'person' ? 'a person' : 'the tool'}. It is not used for the walkthrough until a person confirms it.`))}</p>
    <p class="ssx-fs">${esc(plural(c.pts.length, 'point'))}, in metres in the model frame (from the sketch${sketch ? `: ${sketch.name}` : ''}).</p>
    ${place.viewer ? '' : `<div class="acts">${ok ? '' : '<button class="btn solid" data-s="path-ok">Confirm this path</button>'}<button class="link" data-s="path-clear">${S.confirm === 'path' ? 'Remove for good' : 'Remove the path'}</button></div>`}</div></section>`;
}

// ---- Open the walkthrough -------------------------------------------------------------------------------------------------------
function walkHtml(ctx, p, ss, files, picked, skipped) {
  const esc = ctx.esc, W = S.walk.get(p.id), slots = bySlot(files), has = (id) => slots.find((s) => s.slot.id === id)?.stacks.length;
  const set = slots.find((s) => s.slot.id === 'drawing_set')?.stacks[0]?.latest;
  const main = picked ? { name: picked.note.name, word: picked.why === 'browser copy' ? 'Browser copy of the model' : 'Model' } : set ? { name: set.name, word: 'Drawing set, no model' } : null;
  const chips = [main ? `<li class="is-on">${svg(IC.cube)}<span>${esc(main.word)}</span><b>${esc(main.name)}</b></li>` : '<li>' + svg(IC.cube) + '<span>No model or drawing set yet</span></li>',
    ...['site_plan', 'camera_sketch', 'survey'].map((id) => `<li class="${has(id) ? 'is-on' : ''}">${svg(IC[slotOf(id).icon])}<span>${esc(slotOf(id).word)}</span><b>${has(id) ? '■' : '□'}</b></li>`),
    `<li class="${ss.point ? 'is-on' : ''}">${svg(IC.pin)}<span>Site point</span><b>${ss.point ? '■' : '□'}</b></li>`,
    `<li class="${isConfirmed(ss.camera_path) ? 'is-on' : ''}">${svg(IC.path)}<span>Camera path</span><b>${isConfirmed(ss.camera_path) ? '■ confirmed' : ss.camera_path ? '□ proposed' : '□'}</b></li>`].join('');
  const busy = W && (W.state === 'fetching' || W.state === 'keeping');
  const act = W?.state === 'ready' ? `<a class="btn solid" href="${esc(W.href)}" target="_blank" data-s="walk-open">Open the walkthrough ↗</a><button class="link" data-s="walk-done">Dismiss</button>`
    : `<button class="btn solid" data-s="walk"${busy || !main ? ' disabled' : ''}>${busy ? 'Getting it ready…' : 'Open the walkthrough ↗'}</button>`;
  const line = W?.state === 'fetching' ? 'Getting the files for the 3D page.' : W?.state === 'keeping' ? 'Into this browser’s own storage, for the 3D page. It does not leave this device.'
    : W?.state === 'ready' ? 'Your browser did not open the 3D page by itself. Open it here.' : W?.state === 'opened' ? 'The 3D page has it. Press again to send it again.'
    : skipped ? (main ? 'The model is too big to draw in a browser, so the drawing set goes instead. A browser copy of the model would go in its place.' : 'The model is too big to draw in a browser and has no browser copy. Add a drawing set here.') : !main ? 'Add a model on the Model tab, or a drawing set here.' : picked?.why === 'model' || !picked ? '' : 'The model is drawn from its browser copy.';
  return `<section class="ssx-walk" aria-label="Open the walkthrough"><ul class="ssx-chips" aria-label="What goes across">${chips}</ul>
    <div class="acts ssx-walk-a">${act}</div>${line ? `<p class="ssx-fs" role="status">${esc(line)}</p>` : ''}</section>`;
}

// ---- events -------------------------------------------------------------------------------------------------------------------
function wire(el, ctx, p, place, files) {
  el.addEventListener('change', (e) => {
    const note = e.target.closest('[data-snote]');
    if (note) { S.words.set(p.id + note.dataset.snote, note.value); return; }
    const input = e.target.closest('[data-spick]');
    if (input?.files?.length) { const list = [...input.files]; const slot = input.dataset.spick; input.value = ''; keepAll(list, slot, ctx, p); }
  });
  el.addEventListener('input', (e) => { const note = e.target.closest('[data-snote]'); if (note) S.words.set(p.id + note.dataset.snote, note.value); });
  el.addEventListener('toggle', (e) => { const d = e.target.closest?.('[data-older]'); if (d) { if (d.open) S.open.add(d.dataset.older); else S.open.delete(d.dataset.older); } }, true);
  el.addEventListener('click', (e) => onClick(e, ctx, p, files));
  for (const zone of el.querySelectorAll('[data-sdrop]')) {
    const has = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files');
    zone.addEventListener('dragover', (e) => { if (!has(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; zone.classList.add('is-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
    zone.addEventListener('drop', (e) => { if (!has(e)) return; e.preventDefault(); zone.classList.remove('is-over'); const list = [...(e.dataTransfer.files ?? [])]; if (list.length) keepAll(list, zone.dataset.sdrop, ctx, p); });
  }
  // a file dropped beside a slot must not open in a new tab
  const stray = (e) => { if ([...(e.dataTransfer?.types ?? [])].includes('Files') && !e.target.closest?.('[data-sdrop]')) e.preventDefault(); };
  addEventListener('dragover', stray); addEventListener('drop', stray);
  el.__ssxOff = () => { removeEventListener('dragover', stray); removeEventListener('drop', stray); };
}

async function onClick(e, ctx, p, files) {
  const b = e.target.closest('[data-s]');
  if (!b) return;
  const what = b.dataset.s, id = b.dataset.id ?? '', note = files.find((f) => f.id === id);
  try {
    if (what === 'dismiss') { S.notes.set(p.id, (S.notes.get(p.id) ?? []).filter((n) => n.id !== id)); return ctx.redraw(); }
    if (what === 'pause' || what === 'resume' || what === 'stop') {
      const j = S.jobs.get(b.dataset.job);
      if (!j?.up) return undefined;
      if (what === 'pause') j.up.pause(); else if (what === 'resume') j.up.resume(); else await j.up.stop();
      return ctx.redraw();
    }
    if (what === 'walk-done') { S.walk.delete(p.id); return ctx.redraw(); }
    if (what === 'walk-open') { const w = S.walk.get(p.id); if (w) { w.state = 'opened'; setTimeout(() => ctx.redraw(), 0); } return undefined; }
    if (what === 'walk') return walk(ctx, p);
    if (what === 'path-ok') { await withSiteSources(ctx.store, p.id, (ss) => ({ ...ss, camera_path: confirmPath(ss.camera_path, ctx.me) })); await log(ctx, p.id, 'Camera path confirmed', ''); return ctx.redraw(); }
    if (what === 'path-clear') {
      if (S.confirm !== 'path') { S.confirm = 'path'; return ctx.redraw(); }
      S.confirm = '';
      await withSiteSources(ctx.store, p.id, (ss) => ({ ...ss, camera_path: null }));
      await log(ctx, p.id, 'Camera path removed', '');
      return ctx.redraw();
    }
    if (!note) return undefined;
    if (what === 'get') return download(ctx, note);
    if (what === 'remove') {
      if (S.confirm !== id) { S.confirm = id; return ctx.redraw(); }
      S.confirm = '';
      await ctx.store.removeFile(id);
      await log(ctx, p.id, 'Site source removed', `${note.name} v${note.extra?.source?.version ?? 1}`);
      return ctx.redraw();
    }
  } catch (err) { say(p.id, note?.name ?? '', err?.message ?? 'That did not work.'); return ctx.redraw(); }
  return undefined;
}

async function log(ctx, pid, action, detail) {
  try {
    await ctx.store.save('activity', activity(pid, ctx.me, action, detail));
    const pr = await ctx.store.get('project', pid);
    if (pr) { pr.updated_at = new Date().toISOString(); await ctx.store.save('project', pr); }
  } catch { /* the change is made either way; a viewer cannot add to the log */ }
}

async function blobOf(ctx, note, onProgress) {
  const here = ctx.store.current ?? ctx.store;
  if (typeof here.fileBlob === 'function') {
    const f = await here.fileBlob(note.id, { onProgress });
    if (!f?.blob) throw new Error(`“${note.name}” is not in the shared records any more.`);
    return f.blob;
  }
  const f = await ctx.store.getFile(note.id);
  if (!f?.data) throw new Error(`“${note.name}” is not ${ctx.store.shared ? 'in the shared records' : 'in this browser'} any more.`);
  onProgress?.(f.data.byteLength, f.data.byteLength);
  return new Blob([f.data], { type: note.type || '' });
}
async function download(ctx, note) {
  const blob = await blobOf(ctx, note);
  const a = document.createElement('a'), url = URL.createObjectURL(blob);
  a.href = url; a.download = note.name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ---- keeping a dropped file ------------------------------------------------------------------------------------------------------
async function keepAll(list, slotId, ctx, p) { for (const file of list) await keepOne(file, slotId, ctx, p); }

async function keepOne(file, slotId, ctx, p) {
  const place = placeHere(ctx, p), slot = slotOf(slotId);
  const job = { id: `j${++seq}`, pid: p.id, slot: slotId, name: file.name, size: file.size, stage: 'Checking', sent: 0, total: file.size };
  S.jobs.set(job.id, job);
  ctx.redraw();
  try {
    if (place.viewer) throw new Error('You are a viewer: you can open and download sources, not add them.');
    const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    const wrong = checkSource(slotId, file.name, head);
    if (wrong) throw new Error(wrong);
    const tooBig = sizeProblem(file, place);
    if (tooBig) throw new Error(tooBig);
    const mine = (await ctx.store.listFiles({ project_id: p.id })).filter(isSource);
    const version = nextVersion(mine, slotId, file.name);
    const extra = sourceExtra({ slot: slotId, version, by: ctx.me || '', note: S.words.get(p.id + slotId) ?? '' });
    if (place.where === 'shared' && file.size > PART) await sendInParts(job, file, ctx, p, extra);
    else {
      job.stage = 'Keeping'; ctx.redraw();
      await ctx.store.putFile({ project_id: p.id, owner_kind: 'source', owner_id: p.id, name: file.name, type: file.type, data: await file.arrayBuffer(), extra });
    }
    S.words.delete(p.id + slotId);
    await log(ctx, p.id, version > 1 ? 'Site source version kept' : 'Site source kept', `${slot.word}: ${file.name} v${version}, ${sizeText(file.size)}`);
  } catch (err) {
    if (err?.code !== 'stopped') say(p.id, file.name, err?.message ?? 'It could not be kept.');
  } finally {
    S.jobs.delete(job.id);
    ctx.redraw();
  }
}

/** a big file for the shared records: in 6 MB parts straight to the practice's bucket, then its record (as models.js does) */
async function sendInParts(job, file, ctx, p, extra) {
  const { createUpload, uploadKey, tusEndpoint } = await import('./upload.js');
  const cloud = ctx.store.current, key = uploadKey(file, p.id);
  const at = await cloud.filePlace({ project_id: p.id });
  job.up = createUpload({
    file, key, saved: null, endpoint: tusEndpoint(SUPABASE_URL), // not remembered between visits: Models' "not finished" list would show it as a model
    metadata: { bucketName: BUCKET, objectName: at.path, contentType: file.type || 'application/octet-stream', cacheControl: '3600' },
    headers: async () => ({ authorization: `Bearer ${await cloud.fileToken()}`, apikey: SUPABASE_PUBLISHABLE_KEY, 'x-upsert': 'false' }),
    info: { name: file.name, project_id: p.id, file_id: at.id, path: at.path },
    onProgress: (sent) => { job.sent = sent; paint(ctx, job); },
    onState: () => paint(ctx, job),
  });
  await job.up.start();
  job.stage = 'Saving its record';
  return cloud.fileKept({ ...at, project_id: p.id, owner_kind: 'source', owner_id: p.id, name: file.name, type: file.type, size: file.size, extra });
}
let frame = 0;
function paint(ctx, job) {
  if (frame) return;
  frame = requestAnimationFrame(() => { frame = 0; const slot = document.querySelector(`[data-slot="${CSS.escape(job.slot)}"] .ssx-job`); if (slot && S.jobs.has(job.id)) ctx.redraw(); });
}

// ---- Open the walkthrough ------------------------------------------------------------------------------------------------------------
/**
 * Everything for this project goes into this browser's own storage in one record (handoff.js), then the 3D page opens with its id.
 * The model is the latest one (a browser copy when there is one); with no model, the drawing set goes instead.
 */
function walk(ctx, p) {
  const cur = S.walk.get(p.id);
  if (cur?.state === 'fetching' || cur?.state === 'keeping') return undefined;
  const r = { state: 'fetching', href: '' };
  S.walk.set(p.id, r); ctx.redraw();
  (async () => {
    const pr = (await ctx.store.get('project', p.id)) ?? p;
    const all = await ctx.store.listFiles({ project_id: p.id });
    const mine = all.filter(isSource), slots = bySlot(mine);
    const picked = pickModel(all, pr), set = slots.find((s) => s.slot.id === 'drawing_set')?.stacks[0]?.latest;
    const main = picked?.note ?? set;
    if (!main) throw new Error('There is no model or drawing set to open yet.');
    let blob = await blobOf(ctx, main);
    let name = main.name;
    if (kindOf(name) === 'ifczip' && KINDS.ifczip) { const z = await (await import('./ifc-summary.js')).unzipIfc(new Uint8Array(await blob.arrayBuffer())); blob = new Blob([z.bytes]); name = z.name; }
    const site = siteHandoff(pr, mine);
    site.files = {};
    for (const id of blobSlots()) {
      const f = slots.find((s) => s.slot.id === id)?.stacks[0]?.latest;
      if (f) site.files[id] = await blobOf(ctx, f);
    }
    r.state = 'keeping'; ctx.redraw();
    const { putHandoff, HANDOFF_PARAM, keepBrand } = await import('./handoff.js');
    // the latest saved fly-through goes across too, so the 3D page opens with it to carry on editing
    const fl = slots.find((s) => s.slot.id === 'flythrough')?.stacks[0]?.latest;
    if (fl) { try { site.flight = JSON.parse(await (await blobOf(ctx, fl)).text()); } catch { /* opens without it */ } }
    await keepBrand(ctx.practice?.name).catch(() => void 0);   // the 3D page wears the practice's name and logo (practiceLook.ts)
    const hid = await putHandoff(blob, name, { site });
    rememberHandoff(p.id, hid);
    r.href = `${TWIN_DROP}&from=ops&${HANDOFF_PARAM}=${encodeURIComponent(hid)}`;
    r.state = 'ready'; ctx.redraw();
    const w = window.open(r.href, '_blank'); // may replace this page: the 3D page takes it from storage all the same
    if (w) { r.state = 'opened'; ctx.redraw(); }
  })().catch((err) => { S.walk.delete(p.id); say(p.id, '', `${err?.message ?? 'It could not be passed across.'}`); ctx.redraw(); });
  return undefined;
}

// ---- what comes back from the 3D page -------------------------------------------------------------------------------------------
// The 3D page leaves what a person made there under the hand-over's id (handoff.ts putBackRecord, putPathBack). This page remembers
// the ids it handed across for each project (this browser only) and takes those records into the project's own records: files in
// Site and sources (Fly-through path, Films and stills), the camera path into the project's site sources. No download and upload.
const HIDS = (pid) => `assembl-handoffs:${pid}`;
function rememberHandoff(pid, hid) {
  try { const list = JSON.parse(localStorage.getItem(HIDS(pid)) ?? '[]').filter((x) => x.id !== hid && Date.now() - x.at < 7 * 864e5); list.push({ id: hid, at: Date.now() }); localStorage.setItem(HIDS(pid), JSON.stringify(list.slice(-12))); } catch { /* private mode: the 3D page still has them for an hour */ }
}
const handedFor = (pid) => { try { return JSON.parse(localStorage.getItem(HIDS(pid)) ?? '[]').map((x) => x.id); } catch { return []; } };
let collecting = false;
async function collectBacks(ctx, p) {
  if (collecting) return false;
  collecting = true;
  let n = 0;
  try {
    const { takeBacks } = await import('./handoff.js');
    for (const hid of handedFor(p.id)) {
      for (const rec of await takeBacks(hid)) {
        const to = backToSource(rec);
        if (!to) continue;
        if (to.placement) { await withSiteSources(ctx.store, p.id, (ss) => ({ ...ss, placement: to.placement })); await log(ctx, p.id, 'Building placement from the 3D page', to.placement.status === 'set by a person' ? `set by ${to.placement.confirmed_by}` : 'assumed'); n++; continue; }
        if (to.path) { await withSiteSources(ctx.store, p.id, (ss) => ({ ...ss, camera_path: to.path })); await log(ctx, p.id, 'Camera path from the 3D page', to.path.confirmed_by ? `confirmed by ${to.path.confirmed_by}` : 'proposed'); n++; continue; }
        const mine = (await ctx.store.listFiles({ project_id: p.id })).filter(isSource);
        const version = nextVersion(mine, to.slot, to.name);
        const data = rec.data instanceof Blob ? await rec.data.arrayBuffer() : new TextEncoder().encode(JSON.stringify(rec.data ?? null)).buffer;
        await ctx.store.putFile({ project_id: p.id, owner_kind: 'source', owner_id: p.id, name: to.name, type: rec.type || (rec.data?.type ?? ''), data, extra: sourceExtra({ slot: to.slot, version, by: ctx.me || '', note: to.note }) });
        await log(ctx, p.id, `${slotOf(to.slot).word}: saved from the 3D page`, `${to.name} v${version}`);
        n++;
      }
    }
  } catch (err) { say(p.id, '', `What the 3D page passed back could not be kept: ${err?.message ?? 'no reason given'}`); }
  finally { collecting = false; }
  return n > 0;
}
let listening = null;
function listenBacks(ctx, p) {
  if (listening === p.id) return;
  listening = p.id;
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || listening !== p.id) return;
    const t = e.data?.type;
    if (t === 'assembl:back' || t === 'assembl:camera-path') void collectBacks(ctx, p).then((got) => got && ctx.redraw());
  });
  addEventListener('focus', () => { if (listening === p.id) void collectBacks(ctx, p).then((got) => got && ctx.redraw()); });
}

registerProjectPanel({ id: 'site-sources', title: 'Site and sources', tab: 'site', order: 20, render: renderPanel });
