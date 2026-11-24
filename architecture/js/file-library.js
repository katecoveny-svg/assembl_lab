// Files and Hand-off: two parts of each project page, drawn from one library of the project's files (file-library-rules.js).
//
//   Files      (the Files tab)         every file once, as a thumbnail: drawings, models, site, photos, stills, films and
//                                      other, each with its versions. Drop files anywhere on it to keep them.
//   Hand-off   (the Presentation tab)  the model to open in 3D, the stills and films as a gallery, the client link (off
//                                      until a person turns it on) and the download package (.zip).
//
// It reads the same three places the rest of the page keeps files in (documents, Models, Site and sources) and writes only
// new files, as sources (owner_kind 'source'), the way Site and sources keeps them. It never changes or removes a file.
import { registerProjectPanel } from './modules.js';
import { icon } from './icons.js';
import { thumbPlan, thumbKey, kindOf, libraryOf, docsWithoutFiles, counts, ofKind, primaryModel, KINDS, mediaOf, ext, nextVersionFor, uploadExtra, shortDay, IMAGE } from './file-library-rules.js';
import { linkNote, shareOf, withShare, mayShare, shareUrl, clientParts, packageEntries, packageBytes, PACKAGE_LIMIT } from './share-rules.js';
import { twinLink, activity } from './model.js';
import { sizeText } from './store.js';
import { mountRail, countsFor } from './comments.js';

const CSS_VERSION = '1';
let cssReady = null;
function ensureCss() {
  if (cssReady) return cssReady;
  const v = new URL(import.meta.url).searchParams.get('v') ?? '0';
  const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL(`../files.css?v=${v}.${CSS_VERSION}`, import.meta.url).href });
  cssReady = new Promise((resolve) => { link.addEventListener('load', resolve, { once: true }); link.addEventListener('error', resolve, { once: true }); });
  document.head.append(link);
  return cssReady;
}

// a few line icons this part needs that icons.js does not have (same 24 grid, 1.5 stroke)
const SVG = (d) => `<svg class="ic" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const IC = {
  film: SVG('<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
  share: SVG('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/>'),
  down: SVG('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  lock: SVG('<rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  play: SVG('<path d="M8 5v14l11-7z"/>'),
  say: SVG('<path d="M4 5h16v11H9l-5 4z"/>'),
  x: SVG('<path d="M6 6l12 12M18 6 6 18"/>'),
  link: SVG('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
};
const kindIcon = (k) => (k === 'films' ? IC.film : icon(KINDS.find((x) => x[0] === k)?.[2] ?? 'file'));

/** what this part remembers between draws, by project id */
const S = { filter: new Map(), thumbs: new Map(), jobs: new Map(), note: new Map(), zip: new Map(), copied: '', cc: new Map() };
const THUMB_LIMIT = { image: 15 * 1024 * 1024, pdf: 25 * 1024 * 1024, model: 30 * 1024 * 1024, video: 80 * 1024 * 1024 };

// ---- reading -----------------------------------------------------------------------------------------------------------
async function read(ctx) {
  const p = ctx.project;
  const [files, b] = await Promise.all([ctx.store.listFiles({ project_id: p.id }), ctx.store.loadProject(p.id)]);
  const documents = b?.documents ?? [];
  const items = libraryOf({ project: b?.project ?? p, files, documents });
  S.cc = await countsFor(ctx, items); // [workspace redesign p2] how many comments each tile has
  return { p: b?.project ?? p, files, documents, items, bare: docsWithoutFiles(documents, files) };
}

/** a kept file's contents as a Blob (the shared records may hand back a Blob with its progress) */
async function blobOf(ctx, note) {
  const here = ctx.store.current ?? ctx.store;
  if (typeof here.fileBlob === 'function') { const f = await here.fileBlob(note.id, {}); if (f?.blob) return f.blob; }
  const f = await ctx.store.getFile(note.id);
  if (!f?.data) throw new Error(`“${note.name}” is not kept here any more.`);
  return new Blob([f.data], { type: note.type || '' });
}

function download(blob, name) {
  const url = URL.createObjectURL(blob), a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ---- thumbnails: drawn when a tile comes into view, kept in this browser so the next visit shows them at once ---------------------
// [workspace redesign p1b] For a practice's files the thumbnail is drawn from a short-lived link: a PDF's first sheet is read by
// range and a film streams, so a big site plan or render no longer stays an icon. Models and small files are read whole.
let thumbKv;
const kv = () => (thumbKv ??= (async () => { try { const { idbKv } = await import('./artwork-kit.js'); return idbKv('assembl.architecture.thumbs.v1'); } catch { return null; } })());
const lanes = { light: Promise.resolve(), heavy: Promise.resolve() };
const fails = new Map();
function wantThumb(ctx, note) {
  if (!note?.id || S.thumbs.has(note.id) || (fails.get(note.id) ?? 0) >= 2) return;
  const remote = !!ctx.store.shared && !ctx.project?.sample && typeof ctx.store.current?.fileUrl === 'function';
  const plan = thumbPlan(note, { remote });
  if (plan.how === 'skip') { S.thumbs.set(note.id, 'none'); return; }
  S.thumbs.set(note.id, '');
  const lane = plan.media === 'model' ? 'heavy' : 'light';
  lanes[lane] = lanes[lane].then(async () => {
    let url = '';
    try {
      const store = await kv(), key = thumbKey(note);
      url = (await store?.get(key).catch(() => null)) ?? '';
      if (!url) {
        if (plan.how === 'url') {
          const link = await ctx.store.current.fileUrl(note.id);
          if (!link) throw new Error('gone');
          url = plan.media === 'image' ? await imageThumb(link) : plan.media === 'pdf' ? await pdfThumb({ url: link }) : await videoThumb(link);
        } else {
          const blob = await blobOf(ctx, note);
          if (plan.media === 'image') url = await imageThumb(URL.createObjectURL(blob), true);
          else if (plan.media === 'pdf') url = await pdfThumb({ data: new Uint8Array(await blob.arrayBuffer()) });
          else if (plan.media === 'video') url = await videoThumb(URL.createObjectURL(blob), true);
          else { const mv = await import('./model-view.js'); if (mv.webglOk()) url = (await mv.thumbnail(ext(note.name), new Uint8Array(await blob.arrayBuffer()), { width: 560, height: 400, frame: 'building', look: 'warm' })) ?? ''; }
        }
        if (url.startsWith('data:')) store?.set(key, url).catch(() => undefined);
      }
    } catch { fails.set(note.id, (fails.get(note.id) ?? 0) + 1); }
    if (url) { S.thumbs.set(note.id, url); for (const el of document.querySelectorAll(`[data-thumb="${CSS.escape(note.id)}"]`)) paintThumb(el, url); }
    else if ((fails.get(note.id) ?? 0) >= 2) S.thumbs.set(note.id, 'none');
    else S.thumbs.delete(note.id); // drawn again the next time the tile is in view
  });
}
/** watch the tiles in root and draw each one's thumbnail as it scrolls into view (and a screen's worth ahead) */
function watchThumbs(root, ctx, notes) {
  const byId = new Map(notes.map((n) => [n.id, n]));
  if (typeof IntersectionObserver !== 'function') { for (const n of notes) wantThumb(ctx, n); return () => {}; }
  const io = new IntersectionObserver((seen) => { for (const e of seen) if (e.isIntersecting) { io.unobserve(e.target); const n = byId.get(e.target.dataset.thumb); if (n) wantThumb(ctx, n); } }, { rootMargin: '600px 0px' });
  for (const el of root.querySelectorAll('[data-thumb]')) if (!el.classList.contains('has-pic')) io.observe(el);
  return () => io.disconnect();
}
function paintThumb(el, url) {
  if (!url || url === 'none') return;
  el.innerHTML = `<img src="${url}" alt="" decoding="async">`;
  el.classList.add('has-pic');
}
/** a picture made small for its tile (a full-size render in every tile is slow to draw and heavy to keep) */
function imageThumb(src, own = false) {
  return new Promise((resolve) => {
    const img = new Image(), done = (u) => { if (own) URL.revokeObjectURL(src); resolve(u); };
    img.crossOrigin = 'anonymous'; img.decoding = 'async';
    img.onload = () => {
      try { const s = Math.min(1, 560 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); done(c.toDataURL('image/jpeg', 0.84)); }
      catch { done(own ? '' : src); } // a picture the browser will not let be redrawn: shown from its link for this visit
    };
    img.onerror = () => done('');
    img.src = src;
  });
}
/** a frame from early in a film, as a still for its tile */
function videoThumb(src, own = false) {
  return new Promise((resolve) => {
    const v = document.createElement('video'), done = (u) => { if (own) URL.revokeObjectURL(src); v.removeAttribute('src'); v.load(); resolve(u); };
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.src = src;
    const t = setTimeout(() => done(''), 15000);
    v.addEventListener('loadeddata', () => { v.currentTime = Math.min(1, (v.duration || 2) / 3); }, { once: true });
    v.addEventListener('seeked', () => {
      try { const c = document.createElement('canvas'), s = Math.min(1, 640 / (v.videoWidth || 640)); c.width = Math.round((v.videoWidth || 640) * s); c.height = Math.round((v.videoHeight || 360) * s); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); clearTimeout(t); done(c.toDataURL('image/jpeg', 0.8)); }
      catch { clearTimeout(t); done(''); }
    }, { once: true });
    v.addEventListener('error', () => { clearTimeout(t); done(''); }, { once: true });
  });
}
/** a PDF's first sheet; from a link it is read by range, so a big set downloads only what the first sheet needs */
async function pdfThumb(source) {
  const { loadPdfjs } = await import('./intake-pdf.js');
  const lib = await loadPdfjs();
  const doc = await lib.getDocument({ ...source, isEvalSupported: false, disableAutoFetch: true, disableStream: !!source.url, rangeChunkSize: 262144 }).promise;
  try {
    const page = await doc.getPage(1), v0 = page.getViewport({ scale: 1 }), scale = Math.min(2, 520 / Math.max(v0.width, v0.height));
    const vp = page.getViewport({ scale }), c = document.createElement('canvas');
    c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: g, viewport: vp }).promise;
    return c.toDataURL('image/jpeg', 0.82);
  } finally { doc.destroy(); }
}

// ---- the Files tab -------------------------------------------------------------------------------------------------------
function tileHtml(esc, it) {
  const pic = S.thumbs.get(it.latest.id);
  const inner = pic && pic !== 'none' ? `<img src="${pic}" alt="" decoding="async">` : `<span class="fl-ph">${kindIcon(it.kind)}<b>${esc(ext(it.name).toUpperCase() || 'FILE')}</b></span>`;
  return `<li class="fl-tile is-${it.media}"><button type="button" class="fl-open" data-fl="open" data-key="${esc(it.key)}" aria-label="${esc(`${it.title}, ${it.kind}${it.count > 1 ? `, ${it.count} versions` : ''}`)}">
    <span class="fl-thumb${pic && pic !== 'none' ? ' has-pic' : ''}" data-thumb="${esc(it.latest.id)}">${inner}</span>
    ${it.media === 'video' ? `<span class="fl-play">${IC.play}</span>` : ''}${it.count > 1 ? `<span class="fl-ver">v${it.count}</span>` : ''}${S.cc.get(it.key) ? `<span class="fl-cm" title="Comments">${IC.say}${S.cc.get(it.key)}</span>` : ''}
    <span class="fl-cap"><span class="fl-name">${esc(it.title)}</span><span class="fl-meta">${esc(KINDS.find((k) => k[0] === it.kind)?.[1] ?? '')} · ${esc(shortDay(it.kept_at))}</span></span></button></li>`;
}

async function renderFiles(el, ctx) {
  const p = ctx.project;
  if (!p) return;
  await ensureCss();
  const d = await read(ctx), esc = ctx.esc, c = counts(d.items), f = S.filter.get(p.id) ?? 'all', shown = ofKind(d.items, f);
  const viewer = ctx.account?.state?.practice?.role === 'viewer' && ctx.store.shared && !p.sample;
  const jobs = [...S.jobs.values()].filter((j) => j.pid === p.id), note = S.note.get(p.id);
  const chips = [['all', 'All'], ...KINDS.map(([k, l]) => [k, l])].filter(([k]) => k === 'all' || c[k] > 0)
    .map(([k, l]) => `<button type="button" class="fl-chip" data-fl="filter" data-k="${k}" aria-pressed="${k === f}">${esc(l)}<span>${c[k]}</span></button>`).join('');
  el.innerHTML = `<div class="fl" data-fl-drop="${esc(p.id)}">
    <div class="fl-bar"><div class="fl-chips" role="group" aria-label="Show">${chips}</div>
      ${viewer ? '' : `<label class="btn solid fl-add">${icon('plus')}<span>Add files</span><input type="file" multiple data-fl="pick" hidden></label>`}</div>
    ${note ? `<p class="fl-note${note.error ? ' is-err' : ''}" role="status">${esc(note.text)}</p>` : ''}
    ${jobs.length ? `<ul class="fl-jobs">${jobs.map((j) => `<li><span class="fl-bar-pct" style="--pct:${j.pct}%"></span><span>${esc(j.name)}</span><span class="mono">${esc(j.say)}</span></li>`).join('')}</ul>` : ''}
    ${shown.length ? `<ul class="fl-grid">${shown.map((it) => tileHtml(esc, it)).join('')}</ul>`
      : `<div class="fl-empty">${icon('import', 'big')}<p class="fl-empty-h">${d.items.length ? 'None of these yet.' : 'Drop drawings, models, photos and films here.'}</p><p class="small">PDF · IFC · GLB · Revit · images · MP4</p></div>`}
    ${d.bare.length ? `<details class="fl-bare"><summary>${d.bare.length} record${d.bare.length === 1 ? '' : 's'} without a file</summary><ul>${d.bare.map((x) => `<li><span>${esc(x.title)}</span><a class="link" href="#/p/${encodeURIComponent(p.id)}/s/${esc(x.stage)}/documents">Attach</a></li>`).join('')}</ul></details>` : ''}
    <dialog class="fl-view" data-fl-view aria-label="File"></dialog></div>`;
  const root = el.querySelector('.fl');
  const onClick = async (e) => {
    const b = e.target.closest('[data-fl]');
    if (!b) return;
    const act = b.dataset.fl;
    if (act === 'filter') { S.filter.set(p.id, b.dataset.k); return ctx.redraw(); }
    if (act === 'open') return openView(el, ctx, d, b.dataset.key);
    if (act === 'close') return el.querySelector('[data-fl-view]')?.close();
    if (act === 'get') { const n = d.files.find((x) => x.id === b.dataset.id); if (n) { b.disabled = true; try { download(await blobOf(ctx, n), n.name); } catch (err) { S.note.set(p.id, { text: err.message, error: true }); ctx.redraw(); } b.disabled = false; } return undefined; }
    if (act === 'open3d') { const n = d.files.find((x) => x.id === b.dataset.id); if (n) return open3d(ctx, n, b); }
    return undefined;
  };
  const onPick = (e) => { if (e.target.matches('[data-fl="pick"]') && e.target.files?.length) { keep(ctx, d, [...e.target.files]); e.target.value = ''; } };
  const over = (e) => { if (viewer || ![...(e.dataTransfer?.types ?? [])].includes('Files')) return; e.preventDefault(); root.classList.add('is-over'); };
  const leave = (e) => { if (!root.contains(e.relatedTarget)) root.classList.remove('is-over'); };
  const drop = (e) => { if (viewer) return; e.preventDefault(); root.classList.remove('is-over'); const fs = [...(e.dataTransfer?.files ?? [])]; if (fs.length) keep(ctx, d, fs); };
  el.addEventListener('click', onClick); el.addEventListener('change', onPick);
  root.addEventListener('dragover', over); root.addEventListener('dragleave', leave); root.addEventListener('drop', drop);
  const unwatch = watchThumbs(el, ctx, shown.map((it) => it.latest));
  return () => { unwatch(); el.removeEventListener('click', onClick); el.removeEventListener('change', onPick); };
}

/** the viewer: the file large, its versions, download, and Open in 3D for a model */
function openView(el, ctx, d, key) {
  const it = d.items.find((x) => x.key === key), dlg = el.querySelector('[data-fl-view]'), esc = ctx.esc;
  if (!it || !dlg) return;
  const n = it.latest, pm = primaryModel(d.p, d.files);
  dlg.innerHTML = `<div class="fl-v">
    <div class="fl-v-pic" data-v-pic>${it.media === 'model' ? `<span class="fl-ph big">${kindIcon('models')}<b>${esc(ext(n.name).toUpperCase())}</b></span>` : '<span class="fl-spin" aria-label="Opening"></span>'}</div>
    <div class="fl-v-side"><button type="button" class="fl-x" data-fl="close" aria-label="Close">${IC.x}</button>
      <p class="label">${esc(KINDS.find((k) => k[0] === it.kind)?.[1] ?? '')}</p><h3>${esc(it.title)}</h3>
      <p class="mono small">${esc(sizeText(n.size))} · ${esc(shortDay(n.kept_at))}${n.extra?.source?.by ? ` · ${esc(n.extra.source.by)}` : ''}</p>
      <div class="acts"><button class="btn solid" data-fl="get" data-id="${esc(n.id)}">${IC.down}<span>Download</span></button>
        ${it.media === 'model' && pm?.kind === 'uploaded' && pm.note.id === n.id && pm.open ? `<button class="btn" data-fl="open3d" data-id="${esc(pm.open.id)}">${icon('cube')}<span>Open in 3D</span></button>` : ''}</div>
      ${pm?.kind === 'uploaded' && pm.note.id === n.id ? '<p class="fl-tag">■ The project’s model</p>' : ''}
      ${it.count > 1 ? `<p class="lab">Versions</p><ol class="fl-vers">${it.versions.map((v, i) => `<li><span>v${it.count - i}</span><span class="mono">${esc(shortDay(v.kept_at))}</span><button class="link" data-fl="get" data-id="${esc(v.id)}">Download</button></li>`).join('')}</ol>` : ''}
      <div class="cm-rail" data-cm-rail aria-label="Comments"></div></div></div>`;
  dlg.classList.add('has-rail');
  dlg.showModal?.() ?? dlg.setAttribute('open', '');
  // [workspace redesign p2] comments beside the file; a still also gets pins over the picture
  const rail = mountRail(dlg.querySelector('[data-cm-rail]'), ctx, { item: it }).catch(() => null);
  if (it.media === 'model') return;
  blobOf(ctx, n).then(async (blob) => {
    const host = dlg.querySelector('[data-v-pic]');
    if (!host) return;
    if (it.media === 'image') { host.innerHTML = `<img src="${URL.createObjectURL(blob)}" alt="${esc(it.title)}">`; rail.then((r) => r?.stage(host)); }
    else if (it.media === 'video') host.innerHTML = `<video src="${URL.createObjectURL(blob)}" controls playsinline preload="metadata"></video>`;
    else if (it.media === 'pdf') { const url = await pdfThumb({ data: new Uint8Array(await blob.arrayBuffer()) }); host.innerHTML = `<img src="${url}" alt="First sheet of ${esc(it.title)}">`; }
    else host.innerHTML = `<span class="fl-ph big">${kindIcon(it.kind)}<b>${esc(ext(n.name).toUpperCase() || 'FILE')}</b></span>`;
  }).catch(() => { const host = dlg.querySelector('[data-v-pic]'); if (host) host.innerHTML = `<span class="fl-ph big">${kindIcon(it.kind)}</span>`; });
}

/** keep dropped files, each as a source, one at a time; a file of the same name and kind becomes its next version */
async function keep(ctx, d, list) {
  const p = d.p, shared = !!ctx.store.shared && !p.sample;
  S.note.delete(p.id);
  let items = d.items, kept = 0;
  for (const file of list) {
    const job = { id: `${p.id}:${file.name}:${Date.now()}`, pid: p.id, name: file.name, pct: 0, say: 'waiting' };
    S.jobs.set(job.id, job);
  }
  ctx.redraw();
  for (const job of [...S.jobs.values()].filter((j) => j.pid === p.id)) {
    const file = list.find((f) => f.name === job.name);
    try {
      const kind = kindOf({ name: file.name, owner_kind: 'source', extra: uploadExtra({ name: file.name, version: 1 }) });
      const version = nextVersionFor(items, kind, file.name);
      const extra = uploadExtra({ name: file.name, version, by: ctx.me || '' });
      job.say = 'keeping'; job.pct = 10; ctx.redraw();
      if (shared && file.size > 6 * 1024 * 1024) await sendInParts(ctx, p, file, extra, job);
      else await ctx.store.putFile({ project_id: p.id, owner_kind: 'source', owner_id: p.id, name: file.name, type: file.type, data: await file.arrayBuffer(), extra });
      kept++;
      try { await ctx.store.save('activity', activity(p.id, ctx.me, version > 1 ? 'File version kept' : 'File kept', `${file.name} v${version}, ${sizeText(file.size)}`)); } catch { /* a viewer cannot add to the log */ }
      items = libraryOf({ project: p, files: await ctx.store.listFiles({ project_id: p.id }), documents: d.documents });
    } catch (err) {
      S.note.set(p.id, { text: `${file.name}: ${err?.message ?? 'it could not be kept.'}`, error: true });
    } finally { S.jobs.delete(job.id); }
  }
  if (kept && !S.note.get(p.id)?.error) S.note.set(p.id, { text: `■ ${kept} file${kept === 1 ? '' : 's'} kept.` });
  ctx.redraw();
}

async function sendInParts(ctx, p, file, extra, job) {
  const { createUpload, uploadKey, tusEndpoint } = await import('./upload.js');
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, BUCKET } = await import('./config.js');
  const cloud = ctx.store.current, at = await cloud.filePlace({ project_id: p.id });
  const up = createUpload({
    file, key: uploadKey(file, p.id), saved: null, endpoint: tusEndpoint(SUPABASE_URL),
    metadata: { bucketName: BUCKET, objectName: at.path, contentType: file.type || 'application/octet-stream', cacheControl: '3600' },
    headers: async () => ({ authorization: `Bearer ${await cloud.fileToken()}`, apikey: SUPABASE_PUBLISHABLE_KEY, 'x-upsert': 'false' }),
    info: { name: file.name, project_id: p.id, file_id: at.id, path: at.path },
    onProgress: (sent) => { job.pct = Math.round((sent / file.size) * 100); job.say = `${sizeText(sent)} of ${sizeText(file.size)}`; const li = document.querySelector('.fl-jobs .fl-bar-pct'); if (li) li.style.setProperty('--pct', `${job.pct}%`); },
    onState: () => {},
  });
  await up.start();
  return cloud.fileKept({ ...at, project_id: p.id, owner_kind: 'source', owner_id: p.id, name: file.name, type: file.type, size: file.size, extra });
}

/** Open in 3D for an uploaded model: through this browser's own storage, as the Models section does (handoff.js) */
async function open3d(ctx, note, btn) {
  btn.disabled = true;
  try {
    let blob = await blobOf(ctx, note), name = note.name;
    if (ext(name) === 'ifczip') { const z = await (await import('./ifc-summary.js')).unzipIfc(new Uint8Array(await blob.arrayBuffer())); blob = new Blob([z.bytes]); name = z.name; }
    const { putHandoff, HANDOFF_PARAM, keepBrand } = await import('./handoff.js');
    await keepBrand(ctx.practice?.name).catch(() => undefined);
    const { readSiteHandoff } = await import('./site-sources-rules.js');
    const { rememberHandoff } = await import('./site-sources.js');
    const p = (await ctx.store.get('project', ctx.project.id)) ?? ctx.project;
    const sources = await ctx.store.listFiles({ project_id: p.id });
    const site = await readSiteHandoff(p, sources, (f) => blobOf(ctx, f));
    const hid = await putHandoff(blob, name, { site });
    rememberHandoff(p.id, hid);
    window.open(`/plan-studio/twins/drop/?drop=1&from=ops&${HANDOFF_PARAM}=${encodeURIComponent(hid)}`, '_blank');
  } catch (err) { S.note.set(ctx.project.id, { text: err?.message ?? 'It could not be passed to the 3D page.', error: true }); ctx.redraw(); }
  btn.disabled = false;
}

// ---- the Presentation tab: hand-off ----------------------------------------------------------------------------------------
function placeOf(ctx, p) {
  const shared = !!ctx.store.shared && !p.sample;
  return { place: shared ? 'shared' : 'browser', role: ctx.account?.state?.practice?.role ?? '' };
}

async function shareState(ctx, p) {
  const where = placeOf(ctx, p);
  if (where.place === 'browser') return { ...shareOf(p), ...where, ready: true };
  const sp = ctx.account?.sharePlace?.();
  if (!sp) return { on: false, token: '', ...where, ready: false, why: 'Sharing from the practice’s records is not switched on yet.' };
  let s;
  try { s = await sp.get(p.id); }
  catch (err) { // the share table is missing only when the database update is not made; any other trouble says what it is
    const table = err?.code !== 'out_of_date';
    return { on: false, token: '', ...where, ready: false, table, why: table ? (err?.message ?? 'Sharing could not be read just now.') : linkNote({ place: 'shared', table: false }) };
  }
  const on = !!s?.on;
  return { on, token: s?.token ?? '', ...where, ready: true, table: true, configured: on ? await serverReady() : null };
}
/** whether the lab's server can open client links (the Cloudflare key is set): asked once a visit */
let serverAsk = null;
const serverReady = () => (serverAsk ??= fetch('/api/arch-share?status=1', { headers: { accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null)).then((d) => (typeof d?.configured === 'boolean' ? d.configured : null)).catch(() => null));

async function renderHandoff(el, ctx) {
  const p0 = ctx.project;
  if (!p0) return;
  await ensureCss();
  const d = await read(ctx), p = d.p, esc = ctx.esc, view = clientParts({ project: p, files: d.files, documents: d.documents, practice: ctx.practice });
  const pm = primaryModel(p, d.files), sh = await shareState(ctx, p), may = mayShare(sh), pack = packageEntries(view), bytes = packageBytes(pack.entries);
  const link = sh.on && sh.token ? shareUrl(location.origin, { token: sh.token, pid: p.id, place: sh.place }) : '';
  const twin = pm?.kind === 'plan' ? twinLink(pm.model) : null;
  const modelCard = pm?.kind === 'uploaded'
    ? `<div class="ho-model"><span class="fl-thumb" data-thumb="${esc(pm.note.id)}">${S.thumbs.get(pm.note.id) && S.thumbs.get(pm.note.id) !== 'none' ? `<img src="${S.thumbs.get(pm.note.id)}" alt="">` : `<span class="fl-ph">${icon('cube')}<b>${esc(ext(pm.note.name).toUpperCase())}</b></span>`}</span>
        <div><p class="label">The model</p><h3>${esc(pm.note.name)}</h3>${pm.open ? `<button class="btn solid" data-ho="open3d" data-id="${esc(pm.open.id)}">${icon('cube')}<span>Open in 3D</span></button>` : `<p class="small">${esc(pm.why)}</p>`}</div></div>`
    : pm?.kind === 'plan'
      ? `<div class="ho-model"><span class="fl-thumb">${icon('cube', 'big')}</span><div><p class="label">The model</p><h3>${esc(pm.model.file_name || 'Plan model')}</h3>${twin?.direct ? `<a class="btn solid" href="${esc(twin.href)}" target="_blank" rel="noopener">${icon('cube')}<span>Open in 3D</span></a>` : `<a class="btn solid" href="#/p/${encodeURIComponent(p.id)}/t/model">${icon('cube')}<span>Open the model</span></a>`}<p class="small">Upload an IFC or GLB in Files to make it the model.</p></div></div>`
      : `<div class="ho-model is-empty"><span class="fl-thumb">${icon('cube', 'big')}</span><div><p class="label">The model</p><h3>No model yet</h3><a class="btn" href="#/p/${encodeURIComponent(p.id)}/t/drawings">${icon('plus')}<span>Add an IFC or GLB</span></a></div></div>`;
  const stills = view.stills, films = view.films;
  const gallery = stills.length || films.length
    ? `<ul class="ho-gal">${[...films, ...stills].map((it) => tileHtml(esc, it)).join('')}</ul>`
    : `<div class="fl-empty">${icon('photo', 'big')}<p class="fl-empty-h">No stills or films yet.</p><p class="small">Take stills and make the fly-through on the 3D page, then add them in Files.</p></div>`;
  const shareCard = `<section class="ho-share${sh.on ? ' is-on' : ''}" aria-labelledby="ho-sh">
      <div class="ho-share-h"><span class="ho-ic">${sh.on ? IC.share : IC.lock}</span><div><h3 id="ho-sh">Client link</h3><p class="mono small">${sh.on ? '■ On: anyone with the link can look' : '□ Off: nobody outside can see this project'}</p></div>
        ${may.ok && sh.ready ? `<button class="ho-switch" role="switch" aria-checked="${sh.on}" data-ho="share" aria-label="Share with the client"><span></span></button>` : ''}</div>
      ${link ? `<div class="ho-link"><input readonly value="${esc(link)}" aria-label="Client link"><button class="btn" data-ho="copy">${IC.link}<span>${S.copied === link ? 'Copied' : 'Copy'}</span></button><a class="btn" href="${esc(link)}" target="_blank" rel="noopener">Open</a></div>
        <p class="small">Stills, films${pm?.kind === 'uploaded' ? ', the model' : ''} and drawings. Never money, tasks, people or the address.${sh.place === 'browser' ? ' Opens in this browser only until the project is in a practice’s records.' : ''}</p>` : ''}
      ${!may.ok ? `<p class="small">${esc(may.why)}</p>` : !sh.ready ? `<p class="small">${esc(sh.why ?? '')}</p>` : linkNote(sh) ? `<p class="small ho-warn">${esc(linkNote(sh))}</p>` : ''}</section>`;
  const z = S.zip.get(p.id);
  const packCard = `<section class="ho-pack"><span class="ho-ic">${IC.down}</span><div><h3>Hand-off package</h3>
      <p class="mono small">${pack.entries.length ? `${pack.entries.length} file${pack.entries.length === 1 ? '' : 's'} · ${esc(sizeText(bytes))} · .zip` : 'Nothing to package yet'}</p>
      ${z ? `<p class="small" role="status">${esc(z)}</p>` : ''}</div>
      <button class="btn${pack.entries.length ? ' solid' : ''}" data-ho="zip"${pack.entries.length && bytes <= PACKAGE_LIMIT ? '' : ' disabled'}>${IC.down}<span>Download</span></button></section>`;
  el.innerHTML = `<div class="ho">
    <div class="ho-top">${modelCard}<div class="ho-side">${shareCard}${packCard}</div></div>
    <div class="ho-gal-h"><h3>Stills and films</h3><span class="mono small">${stills.length} still${stills.length === 1 ? '' : 's'} · ${films.length} film${films.length === 1 ? '' : 's'}</span></div>
    ${gallery}
    ${view.drawings.length ? `<div class="ho-gal-h"><h3>Drawings for the client</h3><span class="mono small">${view.drawings.length} · for information</span></div><ul class="fl-grid is-small">${view.drawings.map((it) => tileHtml(esc, it)).join('')}</ul>` : ''}
    <dialog class="fl-view" data-fl-view aria-label="File"></dialog></div>`;
  const onClick = async (e) => {
    const b = e.target.closest('[data-ho], [data-fl]');
    if (!b) return undefined;
    const act = b.dataset.ho ?? `fl:${b.dataset.fl}`;
    if (act === 'fl:open') return openView(el, ctx, d, b.dataset.key);
    if (act === 'fl:close') return el.querySelector('[data-fl-view]')?.close();
    if (act === 'fl:get') { const n = d.files.find((x) => x.id === b.dataset.id); if (n) download(await blobOf(ctx, n), n.name); return undefined; }
    if (act === 'open3d' || act === 'fl:open3d') { const n = d.files.find((x) => x.id === b.dataset.id); if (n) return open3d(ctx, n, b); return undefined; }
    if (act === 'copy') { try { await navigator.clipboard.writeText(link); S.copied = link; } catch { el.querySelector('.ho-link input')?.select(); } return ctx.redraw(); }
    if (act === 'share') return toggleShare(ctx, p, sh, b);
    if (act === 'zip') return makeZip(ctx, p, pack, b);
    return undefined;
  };
  el.addEventListener('click', onClick);
  const unwatch = watchThumbs(el, ctx, [...films, ...stills, ...view.drawings].map((it) => it.latest).concat(pm?.kind === 'uploaded' ? [pm.note] : []));
  return () => { unwatch(); el.removeEventListener('click', onClick); };
}

async function toggleShare(ctx, p, sh, btn) {
  btn.disabled = true;
  const on = !sh.on;
  // the client page wears the practice's name and logo: kept in this browser for a browser preview (handoff.js keepBrand)
  if (on && (ctx.practice?.name || document.querySelector('img.art-logo'))) { try { const { keepBrand } = await import('./handoff.js'); await keepBrand(ctx.practice?.name); } catch { /* the page shows the name only */ } } // never written over with nothing
  try {
    if (sh.place === 'browser') {
      const cur = await ctx.store.get('project', p.id);
      await ctx.store.save('project', withShare(cur ?? p, on, { who: ctx.me }));
    } else {
      await ctx.account.sharePlace().set(p.id, on);
    }
    try { await ctx.store.save('activity', activity(p.id, ctx.me, on ? 'Client link turned on' : 'Client link turned off', on ? 'Stills, films, the model and drawings for information' : 'The old link no longer opens')); } catch { /* the change stands */ }
  } catch (err) { S.zip.set(p.id, err?.message ?? 'Sharing could not be changed.'); }
  return ctx.redraw();
}

async function makeZip(ctx, p, pack, btn) {
  btn.disabled = true;
  try {
    const { zipBlob } = await import('./zip-write.js');
    const entries = [{ path: 'READ ME.txt', data: new TextEncoder().encode(pack.readme) }];
    let i = 0;
    for (const e of pack.entries) {
      S.zip.set(p.id, `Getting ${++i} of ${pack.entries.length}: ${e.note.name}`);
      const s = btn.closest('.ho-pack')?.querySelector('[role=status]'); if (s) s.textContent = S.zip.get(p.id);
      entries.push({ path: e.path, data: new Uint8Array(await (await blobOf(ctx, e.note)).arrayBuffer()) });
    }
    const name = `${String(p.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'}-hand-off.zip`;
    download(zipBlob(entries), name);
    S.zip.set(p.id, `■ ${name} downloaded.`);
    try { await ctx.store.save('activity', activity(p.id, ctx.me, 'Hand-off package downloaded', `${pack.entries.length} files`)); } catch { /* fine */ }
  } catch (err) { S.zip.set(p.id, err?.message ?? 'The package could not be made.'); }
  return ctx.redraw();
}

registerProjectPanel({ id: 'files', title: 'Files', order: 1, tab: 'drawings', render: renderFiles });
registerProjectPanel({ id: 'handoff', title: 'Hand-off', order: 1, tab: 'presentation', render: renderHandoff });

export const _test = { S, tileHtml };
export { IMAGE };
