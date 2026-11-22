// Models: an add-on for the ops page (see modules.js). On each project, one big place to drop a Revit model, IFC, drawing
// set or GLB; a card for each kept model with its version, who kept it and when; an IFC's counts, storeys and floor area
// read in this browser; a small 3D view; and Open in 3D, which passes the model to the 3D page inside this browser
// (handoff.js: through the browser's own storage, so it works in a new tab, in the same tab, or after a blocked pop-up).
// Also a screen of every project's models (#/models) and a top-bar link to it.
//
// Where files go: the project's own store (ctx.store). In the browser, up to 25 MB a file. In a practice's shared
// records, up to 1 GB: anything over 6 MB goes up in parts that pause and pick up again (upload.js).
// What it never does: send a model anywhere but the practice's own records, read a .rvt (that needs Autodesk's
// translation service, which is not connected), or work out a number the file does not carry.
//
// For a later Takeoff screen: a kept IFC's note carries extra.ifc, the summary from ifc-summary.js (counts, storeys,
// spaces with their floor areas, and every quantity set summed per class). modelSummary(note) gives it; ifcSummary(bytes)
// in ifc-summary.js reads one afresh. No costs and no prices.
// Loaded with the page: this file, models-rules.js and models.css. Loaded only when needed: ifc-summary.js (an IFC is
// dropped), upload.js (a big file goes to the shared records), model-view.js with three.js and web-ifc (a model is drawn).
import { registerProjectPanel, registerRoute, registerNav } from './modules.js';
import { KINDS, ACCEPT, kindOf, checkKind, placeFor, sizeProblem, sizeText, isModel, nextVersion, stacks, factsOf, areaOf, storeysOf, PART_SIZE, AUTO_PREVIEW_LIMIT, TWIN_DROP, BROWSER_3D_LIMIT, tooBigFor3d } from './models-rules.js';
import { activity, SAMPLE_ID } from './model.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, BUCKET } from './config.js';

/** the IFC summary kept on a model's note, or null. To read one afresh: ifcSummary(bytes) in ifc-summary.js. */
export const modelSummary = (note) => note?.extra?.ifc ?? null;

// ---- small things ---------------------------------------------------------------------------------------------------
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const when = (v) => { const d = new Date(v); if (!v || Number.isNaN(d.getTime())) return ''; const h = d.getHours(); return `${d.getDate()}\u00a0${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}\u00a0${h < 12 ? 'am' : 'pm'}`; };
const isSample = (p) => !!p && (p.sample === true || p.id === SAMPLE_ID);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const later = (ms) => new Promise((r) => setTimeout(r, ms));
const withTime = (p, ms, fallback) => Promise.race([p, later(ms).then(() => fallback)]);
/** a size never breaks across two lines: "1 GB", not "1 / GB" */
const nb = (t) => String(t ?? '').replace(/(\d) (bytes|KB|MB|GB|m²|m\b)/g, '$1\u00a0$2');

function ensureCss() {
  if (document.querySelector('link[data-models-css]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = new URL('../models.css?v=1', import.meta.url).href; l.dataset.modelsCss = '';
  document.head.append(l);
}

// ---- line icons (stroke only, in the text colour) -------------------------------------------------------------------
const svg = (body, cls = '') => `<svg class="mdl-ic${cls ? ` ${cls}` : ''}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">${body}</svg>`;
const IC = {
  drop: '<path d="M16 3v16M10 13l6 6 6-6"/><path d="M4 17v10h24V17"/>',
  model: '<path d="M16 3 28 9.5v13L16 29 4 22.5v-13Z"/><path d="M4 9.5 16 16l12-6.5M16 16v13"/>',
  sheet: '<path d="M7 3h13l5 5v21H7Z"/><path d="M20 3v5h5M11 15h10M11 19h10M11 23h6"/>',
  walls: '<path d="M3 8h26v16H3Z"/><path d="M3 16h26M11 8v8M21 8v8M7 16v8M16 16v8M25 16v8"/>',
  doors: '<path d="M8 28V4h16v24M4 28h24"/><path d="M19.5 16h1"/>',
  windows: '<path d="M5 5h22v22H5Z"/><path d="M16 5v22M5 16h22"/>',
  slabs: '<path d="M3 15 13 9h16l-10 6Z"/><path d="M3 15v4h16l10-6V9M19 15v4"/>',
  roofs: '<path d="M3 17 16 6l13 11"/><path d="M7 14v13h18V14"/>',
  spaces: '<path d="M5 5h22v22H5Z" stroke-dasharray="3 2.5"/><path d="M11 16h10M16 11v10"/>',
  storeys: '<path d="M4 10 16 5l12 5-12 5Z"/><path d="M4 16l12 5 12-5M4 22l12 5 12-5"/>',
  app: '<path d="M3 6h26v20H3Z"/><path d="M3 10h26"/><path d="M16 13l5 2.6v5.3L16 23.5l-5-2.6v-5.3Z"/>',
  menu: '<path d="M5 4h22v24H5Z"/><path d="M9 9h14M9 13h14"/><path class="mdl-hi" d="M7 17h18v5H7Z"/>',
  pause: '<path d="M11 8v16M21 8v16"/>',
  play: '<path d="M10 7l14 9-14 9Z"/>',
  turn: '<path d="M26 12a11 11 0 1 0 1 7"/><path d="M27 5v7h-7"/>',
  cube: '<path d="M16 3 28 9.5v13L16 29 4 22.5v-13Z"/><path d="M4 9.5 16 16l12-6.5M16 16v13"/>',
  arrow: '<path d="M6 16h18M18 10l6 6-6 6"/>',
};
const NAV_ICON = '<svg viewBox="0 0 32 32" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M16 3 28 9.5v13L16 29 4 22.5v-13Z"/><path d="M4 9.5 16 16l12-6.5M16 16v13"/></svg>';

// ---- state that outlives a redraw ------------------------------------------------------------------------------------
// The page draws itself again often (any change anywhere). Uploads and messages live here, not in the page.
const S = {
  jobs: new Map(),    // job id -> { id, pid, name, size, kind, stage, sent, total, up, samples, error }
  notes: new Map(),   // project id -> [{ id, tone, name, text }]
  confirm: '',        // the file id whose Remove was pressed once
  live: null,         // { id, stop } the one live 3D view on screen
  bytes: new Map(),   // file id -> bytes read this visit (one model at a time, so a big one is not held twice)
  ctx: null,
  open: new Set(),    // file ids whose earlier versions are shown
  preps: new Map(),   // project id -> { id, file, name, kind, got, total, state, href } a model being passed to the 3D page
};
let jobSeq = 0;
const say = (pid, tone, name, text, meter = null, label = '') => { const list = S.notes.get(pid) ?? []; list.unshift({ id: `n${++jobSeq}`, tone, name, text, meter, label }); S.notes.set(pid, list.slice(0, 4)); };
const remember = (id, bytes) => { S.bytes.clear(); if (bytes && bytes.byteLength <= AUTO_PREVIEW_LIMIT) S.bytes.set(id, bytes); };

/** keep the page from closing quietly while a model is still going up */
const guard = (e) => { e.preventDefault(); e.returnValue = ''; return ''; };
const sending = () => [...S.jobs.values()].some((j) => j.up && !['done', 'failed', 'stopped'].includes(j.up.state));
const watchClose = () => { if (sending()) addEventListener('beforeunload', guard); else removeEventListener('beforeunload', guard); };

// ---- where this project's models go ------------------------------------------------------------------------------------
function placeHere(ctx, p) {
  const shared = !!ctx.store.shared;
  return placeFor({ shared, sample: isSample(p), viewer: shared && !isSample(p) && ctx.practice?.role === 'viewer', practice: ctx.practice?.name ?? '', signIn: ctx.account?.state ?? {} });
}

// ---- the project section ---------------------------------------------------------------------------------------------
async function renderPanel(el, ctx) {
  ensureCss();
  S.ctx = ctx;
  const p = ctx.project;
  if (!p) return undefined;
  // sit under the site and model tiles, not at the foot of the page (unless the page gives add-ons their own place)
  const tiles = el.parentElement?.querySelector(':scope > .tiles.two');
  if (!el.closest('[data-mod-panels]') && tiles) tiles.after(el);
  const files = await ctx.store.listFiles({ project_id: p.id });
  const models = files.filter((f) => isModel(f, p));
  if (S.confirm && !models.some((f) => f.id === S.confirm)) S.confirm = ''; // a Remove pressed once elsewhere does not carry over
  const place = placeHere(ctx, p);
  el.innerHTML = panelHtml(ctx, p, models, place);
  wirePanel(el, ctx, p, place, models);
  return () => { stopLive(); el.__mdlOff?.(); };
}

function panelHtml(ctx, p, models, place) {
  const esc = ctx.esc, st = stacks(models), jobs = [...S.jobs.values()].filter((j) => j.pid === p.id), notes = S.notes.get(p.id) ?? [];
  const left = unfinished(p.id);
  const count = st.length ? `${plural(st.length, 'model')}${models.length > st.length ? ` · ${plural(models.length, 'version')}` : ''}` : '';
  const drop = place.viewer
    ? `<p class="mdl-viewer">□ You are a viewer in ${esc(ctx.practice?.name ?? 'this practice')}: you can open the models, not add them.</p>`
    : `<label class="mdl-drop" data-mdrop>
        <input type="file" class="vh" data-mpick accept="${ACCEPT}" multiple aria-describedby="mdl-where-${esc(p.id)}" />
        ${svg(IC.drop, 'mdl-drop-ic')}
        <span class="mdl-drop-t">Drop your Revit model</span>
        <span class="mdl-drop-k">${Object.values(KINDS).map((k) => `<span>${k.tag}</span>`).join('')}</span>
        <span class="btn solid mdl-drop-b">Choose a file</span>
        <span class="mdl-drop-w" id="mdl-where-${esc(p.id)}">${place.where === 'shared' ? '■' : '□'} ${esc(nb(place.line))}</span>
      </label>`;
  const cards = [
    ...notes.map((n) => noteCard(esc, n)),
    ...(S.preps.has(p.id) ? [prepCard(esc, S.preps.get(p.id))] : []),
    ...jobs.map((j) => jobCard(esc, j)),
    ...left.filter((u) => !jobs.some((j) => j.key === u.key)).map((u) => leftCard(esc, u)),
    ...st.map((s) => modelCard(ctx, p, s, place)),
  ];
  return `<div class="mdl" data-mdl="${esc(p.id)}">
    <div class="mdl-head"><p class="label">Models</p>${count ? `<p class="mdl-count">${esc(count)}</p>` : ''}</div>
    ${drop}
    ${cards.length ? `<ul class="mdl-cards">${cards.join('')}</ul>` : ''}
  </div>`;
}

// ---- cards -----------------------------------------------------------------------------------------------------------------
const tagHtml = (esc, kind, v) => `<span class="mdl-tag">${esc(KINDS[kind]?.tag ?? '?')}</span>${v ? `<span class="mdl-v">v${v}</span>` : ''}`;
const kindPic = (kind) => `<div class="mdl-pic is-icon">${svg(KINDS[kind]?.look === 'sheet' ? IC.sheet : IC.model, 'mdl-big')}<span class="mdl-pic-tag">${KINDS[kind]?.tag ?? ''}</span></div>`;
/** a size against its limit, drawn: the file's bar runs past the limit's mark */
function meterHtml(esc, m) {
  const scale = Math.max(m.size, m.limit) * 1.06, at = (m.limit / scale) * 100, len = (m.size / scale) * 100;
  return `<div class="mdl-meter" aria-hidden="true"><i style="width:${len.toFixed(1)}%"></i><b style="left:${at.toFixed(1)}%"></b></div>
    <p class="mdl-meter-k" aria-hidden="true"><span style="${at <= 55 ? `left:${Math.max(0, at - 6).toFixed(1)}%` : `right:${Math.max(0, 100 - at - 6).toFixed(1)}%`}">▲ limit ${esc(nb(sizeText(m.limit)))}</span><span style="${at <= 55 ? 'right:0' : 'left:0'}">${esc(nb(sizeText(m.size)))}</span></p>`;
}

function noteCard(esc, n) {
  return `<li class="mdl-card is-note${n.tone === 'error' ? ' is-error' : ''}" ${n.tone === 'error' ? 'role="alert"' : 'role="status"'}><div class="mdl-in">
    <div class="mdl-body"><p class="mdl-top">${n.name && kindOf(n.name) ? tagHtml(esc, kindOf(n.name)) : ''}<span class="mdl-state">${esc(n.label || (n.tone === 'error' ? '□ Not kept' : '■ Stopped'))}</span></p>
      ${n.name ? `<h3 class="mdl-name">${esc(n.name)}</h3>` : ''}${n.meter ? meterHtml(esc, n.meter) : ''}<p class="mdl-say">${esc(nb(n.text))}</p>
      <div class="acts"><button class="link" data-m="dismiss" data-id="${esc(n.id)}">Dismiss</button></div></div></div></li>`;
}

const STAGE_WORD = { checking: 'Checking', reading: 'Reading the model', keeping: 'Keeping', starting: 'Starting', sending: 'Sending', retrying: 'Connection lost: trying again', waiting: 'Offline: it carries on when the connection is back', paused: 'Paused', stalled: 'Stopped: the connection kept failing', recording: 'Saving its record', done: 'Kept' };
function jobCard(esc, j) {
  const pct = j.total ? Math.floor((j.sent / j.total) * 100) : 0, parts = !!j.up, state = j.up?.state ?? j.stage;
  const btns = parts && !['done', 'recording'].includes(state)
    ? `${state === 'paused' || state === 'stalled' ? `<button class="btn" data-m="resume" data-job="${esc(j.id)}">${svg(IC.play)}${state === 'stalled' ? 'Try again' : 'Resume'}</button>` : `<button class="btn" data-m="pause" data-job="${esc(j.id)}">${svg(IC.pause)}Pause</button>`}
       <button class="link" data-m="stop" data-job="${esc(j.id)}">Stop</button>` : '';
  return `<li class="mdl-card is-job" data-jobcard="${esc(j.id)}"><div class="mdl-in">${kindPic(j.kind)}
    <div class="mdl-body"><p class="mdl-top">${tagHtml(esc, j.kind, j.version)}<span class="mdl-state" data-jstate>${esc(STAGE_WORD[state] ?? state)}</span></p>
      <h3 class="mdl-name">${esc(j.name)}</h3>
      <div class="mdl-bar${parts ? '' : ' is-busy'}" role="progressbar" aria-label="Sent so far" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" data-jbar><i style="width:${parts ? pct : 100}%"></i></div>
      <p class="mdl-pct" data-jline>${parts ? `<b>${pct}%</b>` : ''}<span>${esc(nb(jobLine(j)))}</span></p>
      ${btns ? `<div class="acts">${btns}</div>` : ''}</div></div></li>`;
}
function jobLine(j) {
  if (!j.up) return sizeText(j.size);
  const left = timeLeft(j);
  return `${sizeText(j.sent)} of ${sizeText(j.total)}${left ? ` · ${left}` : ''}${j.up.resumedFrom ? ` · carried on from ${sizeText(j.up.resumedFrom)}` : ''}`;
}
function timeLeft(j) {
  const s = j.samples ?? [];
  if (s.length < 2 || j.up?.state !== 'sending') return '';
  const [t0, b0] = s[0], [t1, b1] = s[s.length - 1], rate = (b1 - b0) / Math.max(1, t1 - t0);
  if (rate <= 0) return '';
  const secs = (j.total - j.sent) / rate / 1000;
  return secs < 60 ? 'under a minute left' : secs < 3600 ? `about ${Math.round(secs / 60)} min left` : `about ${(secs / 3600).toFixed(1)} h left`;
}

function leftCard(esc, u) {
  const kind = kindOf(u.name);
  return `<li class="mdl-card is-left"><div class="mdl-in">${kindPic(kind)}
    <div class="mdl-body"><p class="mdl-top">${tagHtml(esc, kind, u.version)}<span class="mdl-state">□ Not finished</span></p>
      <h3 class="mdl-name">${esc(u.name)}</h3>
      <div class="mdl-bar" role="progressbar" aria-label="Sent before" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor((u.sent / u.total) * 100)}"><i style="width:${Math.floor((u.sent / u.total) * 100)}%"></i></div>
      <p class="mdl-meta">${esc(nb(`${sizeText(u.sent)} of ${sizeText(u.total)} sent`))}</p>
      <p class="mdl-say">Drop the same file again to carry on from there.</p>
      <div class="acts"><button class="link" data-m="forget" data-key="${esc(u.key)}">Forget it</button></div></div></div></li>`;
}

function picHtml(esc, f, kind) {
  if (KINDS[kind]?.family === 'revit' || KINDS[kind]?.family === 'navis') return `<div class="mdl-pic is-guide"><span class="mdl-pic-cap">To see it in 3D</span>${guideHtml(kind)}</div>`;
  const thumb = f.extra?.model?.thumb;
  const turn = KINDS[kind]?.read && canDraw() && !tooBigFor3d(f.size) ? `<button class="mdl-turn" data-m="turn" data-id="${esc(f.id)}">${svg(IC.turn)}<span>Turn it</span></button>` : '';
  if (thumb && /^data:image\/(webp|jpeg|png);base64,/.test(thumb)) return `<div class="mdl-pic" data-pic="${esc(f.id)}"><img src="${thumb}" alt="${esc(`${f.name} in 3D, drawn in this browser from the file`)}" loading="lazy" />${turn}</div>`;
  return `<div class="mdl-pic is-icon" data-pic="${esc(f.id)}">${svg(KINDS[kind]?.look === 'sheet' ? IC.sheet : IC.model, 'mdl-big')}<span class="mdl-pic-tag">${esc(KINDS[kind]?.tag ?? '')}</span>${turn}</div>`;
}

function modelCard(ctx, p, s, place) {
  const esc = ctx.esc, f = s.latest, kind = kindOf(f.name), k = KINDS[kind], sum = modelSummary(f);
  const by = f.extra?.model?.by, sure = S.confirm === f.id, canChange = !place.viewer;
  const meta = nb([sizeText(f.size), by, when(f.kept_at)].filter(Boolean).join(' · '));
  const big = k.to3d === 'model' && tooBigFor3d(f.size);
  const to3d = big ? ''
    : k.to3d === 'model' ? `<button class="btn solid" data-m="open3d" data-id="${esc(f.id)}">Open in 3D ↗</button>`
    : k.to3d === 'plan' ? `<button class="btn" data-m="open3d" data-id="${esc(f.id)}">Read the plan in 3D ↗</button>` : '';
  const bigNote = big ? `<p class="mdl-say">□ Too big to open in 3D in a browser: ${esc(nb(sizeText(f.size)))}, and the most here is ${esc(nb(sizeText(BROWSER_3D_LIMIT)))}. It stays kept, counted and downloadable. An IFC exported without furniture, or a lighter copy, can open.</p>` : '';
  const acts = `<div class="acts">${to3d}<button class="btn" data-m="get" data-id="${esc(f.id)}">Download<span class="vh"> ${esc(f.name)}</span></button>
    ${canChange ? `<button class="link" data-m="remove" data-id="${esc(f.id)}">${sure ? 'Remove for good' : 'Remove'}<span class="vh"> ${esc(f.name)} v${f.version}</span></button>` : ''}</div>`;
  let body = '';
  if (k.family === 'ifc') body = sum ? ifcBlock(esc, f, sum) : f.extra?.ifc_error ? `<p class="mdl-say">□ The counts could not be read: ${esc(f.extra.ifc_error)}</p>` : '<p class="mdl-say">□ Not read yet.</p>';
  else if (k.family === 'revit' || k.family === 'navis') body = `<p class="mdl-say">Opening .${kind} directly needs Autodesk’s translation service, which is not connected. Export an IFC to see it here.</p>`;
  else if (kind === 'dwg') body = '<p class="mdl-say">A CAD drawing, kept with the project. Opening .dwg here needs Autodesk’s translation service, which is not connected.</p>';
  else if (kind === 'pdf') body = '<p class="mdl-say">A drawing set, kept with the project. The 3D page can read a plan from it, in your browser.</p>';
  else if (kind === 'glb') body = '<p class="mdl-say">A 3D model, kept with the project.</p>';
  const older = s.older.length ? `<details class="mdl-older" data-older="${esc(f.id)}"${S.open.has(f.id) ? ' open' : ''}><summary>${plural(s.older.length, 'earlier version')}</summary><ul>${s.older.map((o) => `<li><span class="mdl-v">v${o.version}</span><span class="mdl-meta">${esc(nb([sizeText(o.size), o.extra?.model?.by, when(o.kept_at)].filter(Boolean).join(' · ')))}</span>
      <span class="mdl-older-acts"><button class="link" data-m="get" data-id="${esc(o.id)}">Download<span class="vh"> v${o.version}</span></button>${canChange ? `<button class="link" data-m="remove" data-id="${esc(o.id)}">${S.confirm === o.id ? 'Remove for good' : 'Remove'}<span class="vh"> v${o.version}</span></button>` : ''}</span></li>`).join('')}</ul></details>` : '';
  return `<li class="mdl-card" data-card="${esc(f.id)}" data-kind="${esc(kind)}"><div class="mdl-in">${picHtml(esc, f, kind)}
    <div class="mdl-body"><p class="mdl-top">${tagHtml(esc, kind, f.version)}<span class="mdl-state">■ ${esc(k.word)}</span></p>
      <h3 class="mdl-name">${esc(f.name)}</h3><p class="mdl-meta">${esc(meta)}</p>
      ${body}${bigNote}${acts}${older}</div></div></li>`;
}

function ifcBlock(esc, f, sum) {
  const facts = factsOf(sum), area = areaOf(sum), storeys = storeysOf(sum);
  const more = storeys.length > 6 ? storeys.length - 6 : 0;
  return `<ul class="mdl-facts" aria-label="Counted in the file">${facts.map((x) => `<li class="${x.n ? '' : 'is-zero'}">${svg(IC[x.key])}<b>${esc(x.text)}</b><span>${esc(x.label)}</span>${x.also ? `<small>${esc(x.also)}</small>` : ''}</li>`).join('')}</ul>
    ${storeys.length ? `<div class="mdl-storeys" aria-label="Storeys, lowest first">${svg(IC.storeys)}<ol>${storeys.slice(0, 6).reverse().map((s) => `<li><span>${esc(s.name)}</span><span class="mono">${esc(s.level)}</span></li>`).join('')}</ol>${more ? `<span class="mdl-meta">and ${more} more</span>` : ''}</div>` : '<p class="mdl-meta">No storeys in the file.</p>'}
    ${area ? `<p class="mdl-area"><b>${esc(nb(area.value))}</b><span>${esc(area.label)}</span></p>` : `<p class="mdl-meta">No floor area: ${esc(sum.spaces?.count ? 'the spaces carry none' : 'the file has no spaces')}.</p>`}
    <details class="mdl-from"><summary>Where these numbers come from</summary>
      <p>${esc(sum.from?.counts ?? '')}</p>${sum.counts?.curtain_walls ? `<p>Curtain walls are counted from IfcCurtainWall. Revit exports curtain-wall glazing as curtain walls, so their glass is not in the window count.</p>` : ''}<p>${esc(sum.from?.storeys ?? '')}</p><p>${esc(area?.from ? `${area.from}. Nothing is measured from the shapes.` : sum.from?.area ?? '')}</p>
      <p class="mdl-meta">${esc([sum.schema, sum.app && `from ${sum.app}`, sum.units?.length && `lengths in ${sum.units.length}`, `read in this browser in ${sum.ms} ms`].filter(Boolean).join(' · '))}. Nothing was sent anywhere to read it.</p></details>`;
}

function guideHtml(kind) {
  const navis = KINDS[kind].family === 'navis';
  return `<ol class="mdl-guide" aria-label="To see it in 3D here, three steps">
      <li>${svg(IC.app)}<span>${navis ? 'Open the Revit model it came from' : 'Open it in Revit'}</span></li>
      <li>${svg(IC.menu)}<span>File\u00a0›\u00a0Export\u00a0› IFC</span></li>
      <li>${svg(IC.drop)}<span>Drop the .ifc here</span></li>
    </ol>`;
}

// ---- unfinished uploads from an earlier visit --------------------------------------------------------------------------------
let saved = null;
async function savedStore() { if (!saved) { const m = await import('./upload.js'); saved = m.savedUploads(); } return saved; }
function unfinished(pid) {
  // read without loading upload.js: the same entry it writes
  try { const all = JSON.parse(localStorage.getItem('assembl.architecture.uploads.v1') ?? '{}'); return Object.entries(all).map(([key, v]) => ({ key, ...v })).filter((u) => u.project_id === pid && u.total > 0 && u.sent < u.total); } catch { return []; }
}

// ---- events ----------------------------------------------------------------------------------------------------------------
function wirePanel(el, ctx, p, place, models) {
  const zone = el.querySelector('[data-mdrop]');
  el.addEventListener('change', (e) => {
    const input = e.target.closest('[data-mpick]');
    if (input?.files?.length) { const list = [...input.files]; input.value = ''; keepAll(list, ctx, p); }
  });
  el.addEventListener('toggle', (e) => { const d = e.target.closest?.('[data-older]'); if (d) { if (d.open) S.open.add(d.dataset.older); else S.open.delete(d.dataset.older); } }, true);
  el.addEventListener('click', (e) => onClick(e, ctx, p, models));
  // a file dropped anywhere on the project page comes here, not into a new tab
  if (zone) {
    let depth = 0;
    const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files');
    const over = (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; zone.classList.add('is-over'); };
    const enter = (e) => { if (hasFiles(e)) { depth++; zone.classList.add('is-over'); } };
    const leave = () => { depth = Math.max(0, depth - 1); if (!depth) zone.classList.remove('is-over'); };
    const drop = (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); depth = 0; zone.classList.remove('is-over');
      const list = [...(e.dataTransfer.files ?? [])];
      if (list.length) keepAll(list, ctx, p);
    };
    addEventListener('dragover', over); addEventListener('dragenter', enter); addEventListener('dragleave', leave); addEventListener('drop', drop);
    el.__mdlOff = () => { removeEventListener('dragover', over); removeEventListener('dragenter', enter); removeEventListener('dragleave', leave); removeEventListener('drop', drop); };
  }
}

async function onClick(e, ctx, p, models) {
  const b = e.target.closest('[data-m]');
  if (!b) return;
  const what = b.dataset.m, id = b.dataset.id ?? '', note = models.find((f) => f.id === id);
  try {
    if (what === 'dismiss') { S.notes.set(p.id, (S.notes.get(p.id) ?? []).filter((n) => n.id !== id)); return ctx.redraw(); }
    if (what === 'pause' || what === 'resume' || what === 'stop') {
      const j = S.jobs.get(b.dataset.job);
      if (!j?.up) return undefined;
      if (what === 'pause') j.up.pause(); else if (what === 'resume') j.up.resume(); else await j.up.stop();
      return paintSoon(j);
    }
    if (what === 'forget') { (await savedStore()).remove(b.dataset.key); return ctx.redraw(); }
    if (what === 'prep-done') { S.preps.delete(p.id); return ctx.redraw(); }
    if (what === 'prep-open') { const r = S.preps.get(p.id); if (r) { r.state = 'opened'; setTimeout(() => ctx.redraw(), 0); } return undefined; } // the link opens the page itself
    if (!note) return undefined;
    if (what === 'get') return download(ctx, note);
    if (what === 'remove') {
      if (S.confirm !== id) { S.confirm = id; return ctx.redraw(); }
      S.confirm = '';
      await ctx.store.removeFile(id);
      await log(ctx, p.id, 'Model removed', `${note.name} v${versionLabel(note, models)}`);
      return ctx.redraw();
    }
    if (what === 'open3d') return open3d(ctx, p, note);
    if (what === 'turn') return turn(ctx, note, b.closest('[data-pic]'));
  } catch (err) {
    say(p.id, 'error', note?.name ?? '', err?.message ?? 'That did not work.');
    return ctx.redraw();
  }
  return undefined;
}
const versionLabel = (note, models) => stacks(models).flatMap((s) => [s.latest, ...s.older]).find((f) => f.id === note.id)?.version ?? 1;

async function log(ctx, pid, action, detail) {
  try {
    await ctx.store.save('activity', activity(pid, ctx.me, action, detail));
    const pr = await ctx.store.get('project', pid);
    if (pr) { pr.updated_at = new Date().toISOString(); await ctx.store.save('project', pr); }
  } catch { /* the model is kept or removed either way; a viewer cannot add to the log */ }
}

async function bytesOf(ctx, note) {
  if (S.bytes.has(note.id)) return S.bytes.get(note.id);
  const f = await ctx.store.getFile(note.id);
  if (!f?.data) throw new Error(`“${note.name}” is not ${ctx.store.shared ? 'in the shared records' : 'in this browser'} any more.`);
  return f.data;
}
async function download(ctx, note) {
  const data = await bytesOf(ctx, note);
  const a = document.createElement('a'), url = URL.createObjectURL(new Blob([data], { type: note.type || 'application/octet-stream' }));
  a.href = url; a.download = note.name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ---- keeping a dropped file ------------------------------------------------------------------------------------------------
async function keepAll(list, ctx, p) {
  for (const file of list) await keepOne(file, ctx, p); // one after another: a big model is not read twice at once
}

async function keepOne(file, ctx, p) {
  const place = placeHere(ctx, p), kind = kindOf(file.name);
  const job = { id: `j${++jobSeq}`, pid: p.id, name: file.name, size: file.size, kind, stage: 'checking', sent: 0, total: file.size, samples: [] };
  S.jobs.set(job.id, job);
  ctx.redraw();
  try {
    if (place.viewer) throw new Error('You are a viewer: you can open models, not add them.');
    const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    const wrongKind = checkKind(file.name, head);
    if (wrongKind) throw new Error(wrongKind);
    const tooBig = sizeProblem(file, place);
    if (tooBig) throw Object.assign(new Error(tooBig), { meter: file.size ? { size: file.size, limit: place.limit } : null });
    const all = (await ctx.store.listFiles({ project_id: p.id })).filter((f) => isModel(f, p));
    job.version = nextVersion(all, file.name);
    const base = { model: { kind, version: job.version, by: ctx.me || '' } };
    const reading = KINDS[kind].read ? readModel(file, kind, job) : Promise.resolve({});
    let note;
    if (place.where === 'shared' && file.size > PART_SIZE) note = await sendInParts(job, file, ctx, p, base, reading);
    else {
      job.stage = KINDS[kind].read ? 'reading' : 'keeping'; paintSoon(job);
      const got = await reading;
      job.stage = 'keeping'; paintSoon(job);
      const data = await file.arrayBuffer();
      note = await ctx.store.putFile({ project_id: p.id, owner_kind: 'model', owner_id: p.id, name: file.name, type: file.type, data, extra: { ...base, model: { ...base.model, ...got.model }, ...(got.ifc ? { ifc: got.ifc } : {}), ...(got.ifc_error ? { ifc_error: got.ifc_error } : {}) } });
    }
    remember(note.id, job.bytes);
    await log(ctx, p.id, job.version > 1 ? 'Model version kept' : 'Model kept', `${file.name} v${job.version}, ${sizeText(file.size)}`);
  } catch (err) {
    if (err?.code !== 'stopped') say(p.id, 'error', file.name, err?.message ?? 'It could not be kept.', err?.meter ?? null);
    else say(p.id, 'info', file.name, 'Stopped. Nothing was kept.');
  } finally {
    S.jobs.delete(job.id);
    watchClose();
    ctx.redraw();
  }
}

/** an IFC's summary (in a worker, so the page stays free) and a still for its card; a GLB's still. Never throws. */
async function readModel(file, kind, job) {
  const out = { model: {} };
  if (kind === 'ifc' || kind === 'ifczip') {
    try { out.ifc = await withTime(summaryOf(file), 180000, null); if (!out.ifc) out.ifc_error = 'it took too long to read in this browser.'; }
    catch (e) { out.ifc_error = String(e?.message ?? e).slice(0, 200); }
  }
  if (file.size <= AUTO_PREVIEW_LIMIT && canDraw()) {
    try {
      const raw = new Uint8Array(await file.arrayBuffer());
      const view = await import('./model-view.js');
      let bytes = raw;
      if (kind === 'ifczip') bytes = (await (await import('./ifc-summary.js')).unzipIfc(raw)).bytes;
      job.bytes = bytes;
      const thumb = await withTime(view.thumbnail(kind === 'glb' ? 'glb' : 'ifc', bytes), 90000, null);
      if (thumb && thumb.length < 120000) out.model.thumb = thumb;
    } catch { /* no still: the card shows its kind and its numbers */ }
  }
  return out;
}
function summaryOf(file) {
  return new Promise((resolve, reject) => {
    let w;
    try { w = new Worker(new URL('./ifc-summary.js', import.meta.url), { type: 'module' }); } catch { w = null; }
    if (!w) { import('./ifc-summary.js').then(async (m) => { const { bytes } = await m.ifcBytesFrom(file.name, new Uint8Array(await file.arrayBuffer())); resolve(m.ifcSummary(bytes)); }).catch(reject); return; }
    w.onmessage = (e) => { w.terminate(); if (e.data?.summary) resolve(e.data.summary); else reject(new Error(e.data?.error ?? 'The file could not be read.')); };
    w.onerror = (e) => { w.terminate(); e.preventDefault?.(); reject(new Error('The reader could not start in this browser.')); };
    w.postMessage({ file, name: file.name });
  });
}

/** a big file for the shared records: in 6 MB parts straight to the practice's bucket, then its record */
async function sendInParts(job, file, ctx, p, base, reading) {
  const { createUpload, savedUploads, uploadKey, tusEndpoint } = await import('./upload.js');
  const cloud = ctx.store.current, keep = (saved ??= savedUploads()), key = uploadKey(file, p.id);
  const before = keep.get(key);
  const place = before?.file_id && before?.path && before.total === file.size ? { id: before.file_id, path: before.path } : await cloud.filePlace({ project_id: p.id });
  if (before?.version) job.version = before.version, base.model.version = before.version;
  job.key = key;
  job.up = createUpload({
    file, key, saved: keep, endpoint: tusEndpoint(SUPABASE_URL),
    metadata: { bucketName: BUCKET, objectName: place.path, contentType: file.type || 'application/octet-stream', cacheControl: '3600' },
    headers: async () => ({ authorization: `Bearer ${await cloud.fileToken()}`, apikey: SUPABASE_PUBLISHABLE_KEY, 'x-upsert': 'false' }),
    info: { name: file.name, project_id: p.id, file_id: place.id, path: place.path, version: job.version },
    onProgress: (sent) => { job.sent = sent; job.samples.push([Date.now(), sent]); if (job.samples.length > 12) job.samples.shift(); paintSoon(job); },
    onState: () => { paintSoon(job); watchClose(); },
  });
  watchClose();
  await job.up.start();
  job.stage = 'recording';
  const got = await withTime(reading, 120000, {});
  return cloud.fileKept({ ...place, project_id: p.id, owner_kind: 'model', owner_id: p.id, name: file.name, type: file.type, size: file.size,
    extra: { ...base, model: { ...base.model, ...got.model }, ...(got.ifc ? { ifc: got.ifc } : {}), ...(got.ifc_error ? { ifc_error: got.ifc_error } : {}) } });
}

// progress is painted straight into the card, not by drawing the page again
let painting = new Set(), frame = 0;
function paintSoon(job) {
  painting.add(job);
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    for (const j of painting) {
      const card = document.querySelector(`[data-jobcard="${CSS.escape(j.id)}"]`);
      if (!card) continue;
      const esc = S.ctx?.esc ?? ((s) => String(s));
      const fresh = document.createElement('ul');
      fresh.innerHTML = jobCard(esc, j);
      const focused = card.contains(document.activeElement) ? document.activeElement?.dataset?.m : '';
      card.replaceWith(fresh.firstElementChild);
      if (focused) document.querySelector(`[data-jobcard="${CSS.escape(j.id)}"] [data-m="${focused === 'pause' ? 'resume' : focused === 'resume' ? 'pause' : focused}"]`)?.focus();
    }
    painting = new Set();
  });
}

// ---- 3D -------------------------------------------------------------------------------------------------------------------
let drawable = null;
function canDraw() {
  if (drawable !== null) return drawable;
  try { const c = document.createElement('canvas'); const gl = c.getContext('webgl2') ?? c.getContext('webgl'); drawable = !!gl; gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { drawable = false; }
  return drawable;
}
function stopLive() { try { S.live?.stop(); } catch { /* already gone */ } S.live = null; }

async function turn(ctx, note, pic) {
  if (!pic || tooBigFor3d(note.size)) return;
  stopLive();
  const kind = kindOf(note.name);
  pic.classList.add('is-live', 'is-busy');
  pic.querySelector('.mdl-turn')?.remove();
  const label = document.createElement('span'); label.className = 'mdl-pic-note'; label.textContent = 'Drawing…'; pic.append(label);
  try {
    const view = await import('./model-view.js');
    let bytes = await bytesOf(ctx, note);
    if (kind === 'ifczip') bytes = (await (await import('./ifc-summary.js')).unzipIfc(bytes)).bytes;
    remember(note.id, bytes);
    const meshes = await view.meshesOf(kind === 'glb' ? 'glb' : 'ifc', bytes);
    if (!pic.isConnected) return;
    for (const c of [...pic.children]) if (c !== label) c.remove();
    const v = await view.mountView(pic, { meshes });
    S.live = { id: note.id, stop: v.stop };
    label.textContent = meshes.cut ? 'Part of the model · drag to turn' : 'Drag to turn';
    pic.classList.remove('is-busy');
  } catch (err) {
    label.textContent = `□ It could not be drawn here: ${err?.message ?? 'no reason given'}`;
    pic.classList.remove('is-busy');
  }
}

/** Open in 3D. The model goes into this browser's own storage first (handoff.js), then the 3D page opens with its id and
 * takes it from there. Nothing needs the two pages to talk, so it works whether the browser opens a new tab, replaces this
 * page with the 3D one (the Claude app's browser pane does), or blocks the tab: then a link opens it with a fresh press. */
function open3d(ctx, p, note) {
  if (tooBigFor3d(note.size) && KINDS[kindOf(note.name)]?.to3d === 'model') { say(p.id, 'error', note.name, `Too big to open in 3D in a browser (${sizeText(note.size)}; the most here is ${sizeText(BROWSER_3D_LIMIT)}).`, null, '□ Not opened'); return ctx.redraw(); }
  if (S.preps.get(p.id)?.state === 'fetching' || S.preps.get(p.id)?.state === 'keeping') return undefined; // one at a time
  const r = { id: `o${++jobSeq}`, pid: p.id, file: note.id, name: note.name, kind: kindOf(note.name), got: 0, total: Number(note.size) || 0, state: 'fetching', href: '' };
  S.preps.set(p.id, r); ctx.redraw();
  (async () => {
    let blob = await blobOf(ctx, note, (got, total) => { r.got = got; if (total) r.total = total; paintPrep(r); });
    let name = note.name;
    if (kindOf(name) === 'ifczip') { const z = await (await import('./ifc-summary.js')).unzipIfc(new Uint8Array(await blob.arrayBuffer())); blob = new Blob([z.bytes]); name = z.name; }
    r.state = 'keeping'; paintPrep(r);
    const { putHandoff, HANDOFF_PARAM } = await import('./handoff.js');
    const hid = await putHandoff(blob, name);
    r.href = `${TWIN_DROP}&from=ops&${HANDOFF_PARAM}=${encodeURIComponent(hid)}`;
    r.state = 'ready'; ctx.redraw();
    const w = window.open(r.href, '_blank'); // may replace this page (then the 3D page takes it from storage all the same)
    if (w) { r.state = 'opened'; ctx.redraw(); }
  })().catch((err) => { S.preps.delete(p.id); say(p.id, 'error', note.name, `${err?.message ?? 'It could not be passed across.'} You can download it and choose it on the 3D page instead.`, null, '□ Not opened'); ctx.redraw(); });
  return undefined;
}

/** the model's contents as a Blob, fetched with its progress when it is in the shared records */
async function blobOf(ctx, note, onProgress) {
  if (S.bytes.has(note.id)) return new Blob([S.bytes.get(note.id)]);
  const here = ctx.store.current ?? ctx.store;
  if (typeof here.fileBlob === 'function') {
    const f = await here.fileBlob(note.id, { onProgress });
    if (!f?.blob) throw new Error(`“${note.name}” is not in the shared records any more.`);
    return f.blob;
  }
  const f = await ctx.store.getFile(note.id);
  if (!f?.data) throw new Error(`“${note.name}” is not ${ctx.store.shared ? 'in the shared records' : 'in this browser'} any more.`);
  onProgress?.(f.data.byteLength, f.data.byteLength);
  return new Blob([f.data]);
}

const PREP_STATE = { fetching: 'Getting it for the 3D page', keeping: 'Passing it across', ready: '■ Ready for the 3D page', opened: '■ Sent to the 3D page' };
function prepLine(r) {
  if (r.state === 'fetching') return r.total ? `${sizeText(r.got)} of ${sizeText(r.total)}, from the shared records to this browser` : `${sizeText(r.got)} so far`;
  if (r.state === 'keeping') return 'Into this browser’s own storage, for the 3D page. It does not leave this device.';
  if (r.state === 'ready') return 'Your browser did not open the 3D page by itself. Open it here.';
  return 'The 3D page has it. To open it again, press Open in 3D.';
}
function prepCard(esc, r) {
  const busy = r.state === 'fetching' || r.state === 'keeping', pct = r.state === 'fetching' && r.total ? Math.min(100, Math.floor((r.got / r.total) * 100)) : busy ? 0 : 100;
  const acts = r.state === 'ready' ? `<div class="acts"><a class="btn solid" href="${esc(r.href)}" target="_blank" data-m="prep-open">Open the 3D page ↗</a><button class="link" data-m="prep-done">Dismiss</button></div>`
    : r.state === 'opened' ? '<div class="acts"><button class="link" data-m="prep-done">Dismiss</button></div>' : '';
  return `<li class="mdl-card is-job" data-prepcard="${esc(r.id)}" role="status"><div class="mdl-in">${kindPic(r.kind)}
    <div class="mdl-body"><p class="mdl-top">${tagHtml(esc, r.kind)}<span class="mdl-state">${esc(PREP_STATE[r.state] ?? '')}</span></p>
      <h3 class="mdl-name">${esc(r.name)}</h3>
      ${busy ? `<div class="mdl-bar${r.state === 'keeping' || !r.total ? ' is-busy' : ''}" role="progressbar" aria-label="Fetched so far" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${r.state === 'keeping' || !r.total ? 100 : pct}%"></i></div>` : ''}
      <p class="mdl-pct">${r.state === 'fetching' && r.total ? `<b>${pct}%</b>` : ''}<span>${esc(nb(prepLine(r)))}</span></p>
      ${acts}</div></div></li>`;
}
let prepFrame = 0;
function paintPrep(r) {
  if (prepFrame) return;
  prepFrame = requestAnimationFrame(() => {
    prepFrame = 0;
    const card = document.querySelector(`[data-prepcard="${CSS.escape(r.id)}"]`);
    if (!card) return;
    const fresh = document.createElement('ul');
    fresh.innerHTML = prepCard(S.ctx?.esc ?? ((x) => String(x)), r);
    card.replaceWith(fresh.firstElementChild);
  });
}

// ---- the screen of every project's models -----------------------------------------------------------------------------------
async function renderAll(el, ctx) {
  ensureCss();
  const esc = ctx.esc;
  const projects = await ctx.store.list('project');
  const files = await ctx.store.listFiles();
  const groups = projects.map((p) => ({ p, st: stacks(files.filter((f) => f.project_id === p.id && isModel(f, p))) })).filter((g) => g.st.length)
    .sort((a, b) => String(b.st[0].latest.kept_at).localeCompare(String(a.st[0].latest.kept_at)));
  const card = (p, s) => {
    const f = s.latest, kind = kindOf(f.name), sum = modelSummary(f), thumb = f.extra?.model?.thumb;
    const pic = thumb && /^data:image\/(webp|jpeg|png);base64,/.test(thumb) ? `<div class="mdl-pic"><img src="${thumb}" alt="" loading="lazy" /></div>` : kindPic(kind);
    const nums = sum ? `<ul class="mdl-mini">${factsOf(sum).map((x) => `<li title="${esc(x.label)}">${svg(IC[x.key])}<b>${esc(x.text)}</b><span class="vh"> ${esc(x.label)}</span></li>`).join('')}</ul>` : '';
    return `<li class="mdl-card is-small"><a class="mdl-cover" href="#/p/${encodeURIComponent(p.id)}" aria-label="${esc(`${f.name}, v${f.version}, in ${p.name}`)}"></a><div class="mdl-in">${pic}
      <div class="mdl-body"><p class="mdl-top">${tagHtml(esc, kind, f.version)}</p><h3 class="mdl-name">${esc(f.name)}</h3><p class="mdl-meta">${esc(nb([sizeText(f.size), when(f.kept_at)].filter(Boolean).join(' · ')))}</p>${nums}</div></div></li>`;
  };
  el.innerHTML = `<section class="hero"><p class="label">Models</p><h1>Every project’s models.</h1></section>
    ${groups.length ? groups.map((g) => `<section class="mdl-group" aria-labelledby="mg-${esc(g.p.id)}"><div class="mdl-head"><h2 id="mg-${esc(g.p.id)}"><a href="#/p/${encodeURIComponent(g.p.id)}">${esc(g.p.name)}</a></h2><p class="mdl-count">${esc(plural(g.st.length, 'model'))}</p></div>
        <ul class="mdl-cards is-small">${g.st.map((s) => card(g.p, s)).join('')}</ul></section>`).join('')
      : `<div class="mdl-empty">${svg(IC.drop, 'mdl-drop-ic')}<h3>No models yet.</h3><p class="small">Open a project and drop a Revit model, an IFC or a drawing set on it.</p><a class="btn solid" href="#/">All projects</a></div>`}`;
  return undefined;
}

// ---- register -------------------------------------------------------------------------------------------------------------
registerProjectPanel({ id: 'models', title: 'Models', order: 10, render: renderPanel });
registerRoute('models', { title: 'Models', render: renderAll });
registerNav({ id: 'models', label: 'Models', hash: '#/models', order: 10, icon: NAV_ICON });
