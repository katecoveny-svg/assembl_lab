// Intake: an add-on for the ops page (see modules.js), at the top of each project's Site tab. Drop a whole folder, or many files at
// once (a drawing set, an IFC, photos, notes). The intake agent sorts every file by kind, splits each PDF into its sheets, and
// builds one list: the files, the sheet index (number, title, scale, revision, date) and what is missing from the set.
//
// How it works (the rules are in intake-rules.js, the steps in intake-run.js, the job runner in conductor.js, the saved shape in
// intake-record.js): the sheet's own text is read first, by pdf.js, in this browser. A model is asked only about a sheet with no text
// of its own, only after a person presses the button that says how many paid requests that is, and never twice for the same sheet in
// the same file. Everything read by a model is marked and is for a person to check. The result is kept with the project.
// What it never does: read a drawing's linework, work out a size or a position, or say that a set is complete or compliant.
import { registerProjectPanel } from './modules.js';
import { placeFor, sizeProblem, sizeText } from './models-rules.js';
import { activity, SAMPLE_ID } from './model.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, BUCKET } from './config.js';
import { isSource, nextVersion, sourceExtra } from './site-sources-rules.js';
import { createJob, runJob, approve, retry, STATUS, summary } from './conductor.js';
import { intakeRun } from './intake-run.js';
import { loadPdfjs } from './intake-pdf.js';
import { sortFiles, buildIndex } from './intake-rules.js';
import { normalIntake, toRecord, withIntake } from './intake-record.js';

const isSample = (p) => !!p && (p.sample === true || p.id === SAMPLE_ID);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const PART = 6 * 1024 * 1024;
const MAX_FILES = 2000;

function ensureCss() {
  if (document.querySelector('link[data-intake-css]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = new URL('../intake.css?v=1', import.meta.url).href; l.dataset.intakeCss = '';
  document.head.append(l);
}
const svg = (body, cls = '') => `<svg class="itk-ic${cls ? ` ${cls}` : ''}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">${body}</svg>`;
const IC = { drop: '<path d="M16 3v16M10 13l6 6 6-6"/><path d="M4 17v10h24V17"/>', folder: '<path d="M3 8h9l3 3h14v16H3Z"/>' };

// ---- state that outlives a redraw ----------------------------------------------------------------------------------------
const S = {
  runs: new Map(),   // project id -> { job, run, who, busy }
  notes: new Map(),  // project id -> [text]
};
const say = (pid, text) => { const l = S.notes.get(pid) ?? []; S.notes.set(pid, [text, ...l].slice(0, 3)); };
const MARK = { [STATUS.waiting]: '□', [STATUS.running]: '▶', [STATUS.person]: '!', [STATUS.done]: '■', [STATUS.failed]: '×' };

function placeHere(ctx, p) {
  const shared = !!ctx.store.shared;
  return placeFor({ shared, sample: isSample(p), viewer: shared && !isSample(p) && ctx.practice?.role === 'viewer', practice: ctx.practice?.name ?? '', signIn: ctx.account?.state ?? {} });
}

// ---- the section ------------------------------------------------------------------------------------------------------------
async function renderPanel(el, ctx) {
  ensureCss();
  const p = ctx.project;
  if (!p) return undefined;
  const pr = (await ctx.store.get('project', p.id)) ?? p, rec = normalIntake(pr.intake), place = placeHere(ctx, p), live = S.runs.get(p.id);
  el.innerHTML = html(ctx, p, rec, live, place);
  wire(el, ctx, p, place);
  return undefined;
}

/** what is shown: a run in this page (live) while it is there, otherwise what was kept */
function view(rec, live) {
  if (!live) return { files: rec.files, sheets: rec.sheets, register: rec.register, job: rec.job, model: rec.model, idx: { ...rec.index }, saved: true };
  const st = live.run.state, sheets = st.sheets, register = st.register, idx = buildIndex(sheets, register);
  return { files: st.files, sheets: idx.sheets, register, job: live.job, model: st.model, idx, saved: false };
}

function html(ctx, p, rec, live, place) {
  const esc = ctx.esc, v = view(rec, live), has = v.files.length > 0 || !!v.job;
  const notes = (S.notes.get(p.id) ?? []).map((t) => `<li class="itk-note" role="alert"><p><b>Not done.</b> ${esc(t)}</p></li>`).join('');
  const nSheets = v.sheets.length, nFiles = v.files.filter((f) => f.kind !== 'ignored').length;
  const count = has ? [nFiles ? plural(nFiles, 'file') : '', nSheets ? plural(nSheets, 'sheet') : ''].filter(Boolean).join(' · ') : '';
  return `<div class="itk" data-itk="${esc(p.id)}">
    <div class="itk-head"><p class="label">Intake</p>${count ? `<p class="itk-count">${esc(count)}</p>` : ''}</div>
    ${place.viewer ? '' : dropHtml(esc, has)}
    ${notes ? `<ul class="itk-notes">${notes}</ul>` : ''}
    ${v.job ? stepsHtml(esc, v.job, live, place) : ''}
    ${has ? listHtml(esc, v) : `<p class="itk-empty">${place.viewer ? 'Nothing here yet.' : 'Nothing dropped yet. A folder is fine: everything inside it is read.'}</p>`}
  </div>`;
}

function dropHtml(esc, has) {
  return `<label class="itk-drop${has ? ' is-filled' : ''}" data-itk-drop>
    <input type="file" class="vh" multiple data-itk-pick />
    ${svg(IC.drop, 'itk-drop-ic')}
    <span class="itk-t">Drop a folder or many files</span>
    <span class="itk-k">Drawing sets, IFC, photos, notes. They are sorted and the sheets are read here, on your device.</span>
    <span class="itk-cta">Drop, or choose files</span>
  </label>
  <p class="itk-alt"><label class="link itk-folder">${svg(IC.folder, 'itk-mini')}or choose a whole folder<input type="file" class="vh" webkitdirectory data-itk-folder /></label></p>`;
}

// ---- the job: its steps, and the one place a person is asked ---------------------------------------------------------------------
function stepsHtml(esc, job, live, place) {
  const sm = summary(job), asking = job.steps.find((s) => s.status === STATUS.person), failed = job.steps.find((s) => s.status === STATUS.failed);
  const gone = !live && (asking || failed || job.steps.some((s) => s.status === STATUS.waiting));
  const rows = job.steps.map((s) => {
    const word = s.status === STATUS.person ? 'needs you' : s.status;
    return `<li class="itk-step is-${esc(s.status.replace(/ /g, '-'))}" data-step="${esc(s.id)}"><span class="itk-mark" aria-hidden="true">${MARK[s.status] ?? '□'}</span><span class="itk-sl">${esc(s.label)}${s.paid ? ' <em class="itk-paid">paid</em>' : ''}</span><span class="itk-ss"><span class="vh">${esc(s.label)}: </span>${esc(word)}${s.note && s.status === STATUS.done ? ` · ${esc(s.note)}` : ''}</span></li>`;
  }).join('');
  const ask = asking && live && !place.viewer ? `<div class="itk-ask" role="status"><p>${esc(asking.reason)}</p><div class="acts"><button class="btn solid" data-itk-go="${esc(asking.id)}">Read ${asking.reason.match(/^(\d+) sheets? /)?.[1] === '1' ? 'it' : 'them'} with a model</button><span class="itk-fine">Or leave it: the rest of the list stands without it.</span></div></div>` : '';
  const bad = failed && live && !place.viewer ? `<div class="itk-ask is-bad" role="alert"><p><b>${esc(failed.label)} did not work.</b> ${esc(failed.reason)}</p><div class="acts"><button class="btn" data-itk-retry="${esc(failed.id)}">${failed.paid ? 'Try the paid read again' : 'Try again'}</button></div></div>` : '';
  const stale = gone ? '<p class="itk-fine">This run stopped when the page closed. Drop the files again to carry on: a sheet a model already read is not sent again.</p>' : '';
  const log = job.log.length ? `<details class="itk-log"><summary>Log, ${plural(job.log.length, 'line')}</summary><ol>${job.log.slice(-60).map((l) => `<li><span class="itk-t0">${esc(l.at.slice(11, 19))}</span> <b>${esc(l.step)}</b> ${esc(l.event)}${l.text ? `: ${esc(l.text)}` : ''}</li>`).join('')}</ol></details>` : '';
  return `<section class="itk-job" aria-label="The run"><ol class="itk-steps">${rows}</ol>
    ${sm.paid_calls ? `<p class="itk-fine">${esc(plural(sm.paid_calls, 'paid request'))} made.</p>` : ''}${ask}${bad}${stale}${log}</section>`;
}

// ---- the list: files, sheets, missing ---------------------------------------------------------------------------------------------
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateText = (s) => (s.date_iso ? `${+s.date_iso.slice(8, 10)} ${MONTH[+s.date_iso.slice(5, 7) - 1]} ${s.date_iso.slice(0, 4)}` : s.date);

function listHtml(esc, v) {
  return `<div class="itk-list">${missingHtml(esc, v)}${sheetsHtml(esc, v)}${filesHtml(esc, v)}</div>`;
}

function sheetsHtml(esc, v) {
  if (!v.sheets.length) return '';
  const rows = v.sheets.map((s) => {
    const meta = [s.scale, s.rev ? `Rev ${s.rev}` : '', s.date ? dateText(s) : ''].filter(Boolean).join(' · ');
    const chip = s.from === 'model' ? ['model', 'Read by a model: check it'] : s.status === 'read' ? ['read', 'Read from the sheet'] : s.status === 'partly' ? ['partly', `Not read: ${s.unread.join(', ')}`] : ['unread', s.no_text ? 'No text: not read' : 'Title block not recognised'];
    return `<li class="itk-sheet is-${chip[0]}"><span class="itk-num">${esc(s.number ?? '—')}</span><span class="itk-title">${esc(s.title ?? 'Title not read')}${s.dup ? ' <em class="itk-paid">also elsewhere</em>' : ''}</span>
      <span class="itk-meta">${esc(meta || '—')}</span><span class="itk-chip">${esc(chip[1])}</span><span class="itk-where">${esc(s.file.split('/').pop())}, page ${s.page}${s.paper ? ` · ${esc(s.paper)}` : ''}</span></li>`;
  }).join('');
  const unlisted = v.idx.unlisted?.length ? `<p class="itk-fine">${plural(v.idx.unlisted.length, 'sheet is', 'sheets are')} not on the drawing register.</p>` : '';
  return `<section class="itk-sec" aria-label="Sheet index"><h3 class="itk-h">Sheets <span>${v.sheets.length}</span></h3><ol class="itk-sheets">${rows}</ol>${unlisted}</section>`;
}

function missingHtml(esc, v) {
  if (!v.sheets.length) return '';
  const idx = v.idx;
  if (!v.register.found) return `<section class="itk-sec" aria-label="Missing"><h3 class="itk-h">Missing</h3><p class="itk-fine">No drawing register was found in the sheets, so nothing can be checked against one. A register lists every sheet in the set; with one, anything it lists that is not in the files is shown here.</p></section>`;
  const caution = idx.unreadable ? `<p class="itk-fine">${esc(plural(idx.unreadable, 'sheet'))} could not be read, so ${idx.unreadable === 1 ? 'it' : 'some'} of these may be there under a number that was not read.</p>` : '';
  const list = idx.missing.length ? `<ul class="itk-missing">${idx.missing.map((m) => `<li><span class="itk-num">${esc(m.number)}</span><span class="itk-title">${esc(m.title || 'No title on the register')}</span><span class="itk-where">${m.rev ? `Rev ${esc(m.rev)} · ` : ''}on the register, ${esc(m.from)}</span></li>`).join('')}</ul>` : '<p class="itk-fine">Every sheet on the register is in the files.</p>';
  return `<section class="itk-sec" aria-label="Missing"><h3 class="itk-h">Not in the files <span>${idx.missing.length}</span></h3>${list}${caution}</section>`;
}

function filesHtml(esc, v) {
  const groups = sortFiles(v.files);
  if (!groups.length) return '';
  const rows = groups.map((g) => `<details class="itk-group"><summary><span>${esc(g.word)}</span><b>${g.files.length}</b></summary><ul>${g.files.map((f) => {
    const bits = [sizeText(f.size), f.pages ? plural(f.pages, 'page') : '', f.pdf === 'document' ? 'a document, no sheets' : '', f.kept && f.kept !== 'kept' ? f.kept : ''].filter(Boolean).join(' · ');
    return `<li><span class="itk-fname">${esc(f.path)}</span><span class="itk-where">${esc(bits)}</span>${f.problem ? `<span class="itk-bad">${esc(f.problem)}</span>` : ''}</li>`;
  }).join('')}</ul></details>`).join('');
  return `<section class="itk-sec" aria-label="Files"><h3 class="itk-h">Files <span>${v.files.filter((f) => f.kind !== 'ignored').length}</span></h3>${rows}</section>`;
}

// ---- events ---------------------------------------------------------------------------------------------------------------------
function wire(el, ctx, p, place) {
  el.addEventListener('change', (e) => {
    const input = e.target.closest('[data-itk-pick],[data-itk-folder]');
    if (!input?.files?.length) return;
    const entries = [...input.files].map((file) => ({ path: file.webkitRelativePath || file.name, file }));
    input.value = '';
    start(ctx, p, entries);
  });
  el.addEventListener('click', (e) => {
    const go = e.target.closest('[data-itk-go]'), again = e.target.closest('[data-itk-retry]');
    if (go) decide(ctx, p, 'approve', go.dataset.itkGo); else if (again) decide(ctx, p, 'retry', again.dataset.itkRetry);
  });
  const zone = el.querySelector('[data-itk-drop]');
  if (zone) {
    const has = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files');
    zone.addEventListener('dragover', (e) => { if (!has(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; zone.classList.add('is-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
    zone.addEventListener('drop', (e) => {
      if (!has(e)) return;
      e.preventDefault(); zone.classList.remove('is-over');
      const items = [...(e.dataTransfer.items ?? [])].map((i) => i.webkitGetAsEntry?.() ?? null), plain = [...(e.dataTransfer.files ?? [])]; // entries must be taken before any await
      entriesFrom(items, plain).then((entries) => entries.length && start(ctx, p, entries)).catch((err) => { say(p.id, err?.message ?? 'That folder could not be read.'); ctx.redraw(); });
    });
  }
}

/** every file in what was dropped, folders walked, each with its path from the dropped folder down */
export async function entriesFrom(items, plain = []) {
  if (!items.some(Boolean)) return plain.map((file) => ({ path: file.name, file }));
  const out = [];
  const walk = async (entry, base) => {
    if (out.length >= MAX_FILES) return;
    if (entry.isFile) { const file = await new Promise((ok, no) => entry.file(ok, no)); out.push({ path: `${base}${entry.name}`, file }); return; }
    if (!entry.isDirectory) return;
    const reader = entry.createReader();
    for (;;) { const batch = await new Promise((ok, no) => reader.readEntries(ok, no)); if (!batch.length) break; for (const child of batch) await walk(child, `${base}${entry.name}/`); }
  };
  for (const e of items) if (e) await walk(e, '');
  return out;
}

// ---- running ----------------------------------------------------------------------------------------------------------------------
const frame = { id: 0 };
function repaint(ctx) { if (frame.id) return; frame.id = requestAnimationFrame(() => { frame.id = 0; ctx.redraw(); }); }

async function start(ctx, p, entries) {
  const place = placeHere(ctx, p), cur = S.runs.get(p.id);
  if (place.viewer) { say(p.id, 'You are a viewer: you can read the list, not add files.'); return ctx.redraw(); }
  if (cur?.busy) { say(p.id, 'A run is still going. Wait for it, then drop the rest.'); return ctx.redraw(); }
  if (entries.length > MAX_FILES) { say(p.id, `That is ${entries.length} files. Up to ${MAX_FILES} can go in at once; the rest were left out.`); entries = entries.slice(0, MAX_FILES); }
  try {
    const pr = (await ctx.store.get('project', p.id)) ?? p, prior = normalIntake(pr.intake);
    const lib = entries.some((e) => /\.pdf$/i.test(e.path)) ? await loadPdfjs() : null;
    const run = intakeRun({
      entries, lib, prior: { sheets: prior.sheets, register: prior.register },
      readSheet: readSheetWithServer,
      saveFiles: (st, log) => keepFiles(st, log, ctx, p, place),
      saveRecord: (st) => withIntake(ctx.store, p.id, () => toRecord(st, live.job, ctx.me || '')).then(() => log(ctx, p, 'Intake read', `${st.sheets.length} sheets from ${st.files.filter((f) => f.kind !== 'ignored').length} files`)),
    });
    const job = createJob({ id: `intake-${Date.now().toString(36)}`, kind: 'intake', project_id: p.id, steps: run.defs });
    const live = { job, run, busy: true };
    S.runs.set(p.id, live); S.notes.delete(p.id); ctx.redraw();
    await drive(ctx, p, live);
  } catch (err) { say(p.id, err?.message ?? 'That did not work.'); ctx.redraw(); }
}

async function drive(ctx, p, live) {
  live.busy = true;
  try { await runJob(live.job, live.run.handlers, { onChange: () => repaint(ctx) }); } finally { live.busy = false; }
  // a run that stopped for a person, or failed, is kept as far as it got, so the list is not lost with the page
  try { await withIntake(ctx.store, p.id, () => toRecord(live.run.state, live.job, ctx.me || '')); } catch { /* shown from this page either way */ }
  ctx.redraw();
}

/** a person presses the button: this is the only place a paid step is approved or run again */
async function decide(ctx, p, what, stepId) {
  const live = S.runs.get(p.id);
  if (!live || live.busy) return;
  const who = ctx.me || 'a person at this browser';
  try { if (what === 'approve') approve(live.job, stepId, who); else retry(live.job, stepId, who); } catch (err) { say(p.id, err?.message ?? 'That did not work.'); return ctx.redraw(); }
  ctx.redraw();
  await drive(ctx, p, live);
}

/** one sheet picture to the lab's reader (/api/plan-read, mode "sheet"): OpenAI, then Gemini, then Anthropic, on the server */
async function readSheetWithServer(image) {
  let r;
  try { r = await fetch('/api/plan-read', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image, mode: 'sheet' }) }); } catch { throw new Error('The reader could not be reached.'); }
  let j = null; try { j = await r.json(); } catch { /* not JSON */ }
  if (!r.ok) throw new Error(j?.error === 'not_configured' ? 'No model is set up on this server.' : j?.error === 'daily_cap' ? 'The day’s limit for model reads is used up.' : j?.error === 'image_too_large' ? 'The sheet picture was too big to send.' : `The reader answered ${r.status}${j?.error ? ` (${j.error})` : ''}.`);
  return { plan: j.plan, provider: j.provider, model: j.model };
}

async function log(ctx, p, action, detail) {
  try { await ctx.store.save('activity', activity(p.id, ctx.me, action, detail)); } catch { /* the list is kept either way; a viewer cannot add to the log */ }
}

// ---- keeping the files --------------------------------------------------------------------------------------------------------------
/** each file kept with the project as a source ("Other" on Site and sources), so it is there to open and download. A file already kept is not kept twice. */
async function keepFiles(state, logLine, ctx, p, place) {
  const mine = (await ctx.store.listFiles({ project_id: p.id })).filter(isSource);
  let n = 0, already = 0, skipped = 0;
  for (const f of state.files) {
    if (f.kind === 'ignored') continue;
    const same = mine.find((x) => x.name === f.name && x.size === f.size && x.extra.source.path === f.path);
    if (same) { f.file_id = same.id; f.kept = 'already kept'; already += 1; continue; }
    if (sizeProblem({ name: f.name, size: f.size }, place)) { f.kept = `Not kept: ${sizeText(f.size)} is more than the ${sizeText(place.limit)} this project keeps a file at.`; skipped += 1; continue; }
    try {
      const version = nextVersion(mine, 'other', f.name), extra = sourceExtra({ slot: 'other', version, by: ctx.me || '' });
      extra.source.path = f.path.slice(0, 300);
      let note;
      if (place.where === 'shared' && f.size > PART) note = await sendInParts(f, ctx, p, extra);
      else note = await ctx.store.putFile({ project_id: p.id, owner_kind: 'source', owner_id: p.id, name: f.name, type: f.file.type || '', data: await f.file.arrayBuffer(), extra });
      f.file_id = note?.id ?? ''; f.kept = 'kept'; n += 1; mine.push(note);
    } catch (err) { f.kept = `Not kept: ${String(err?.message ?? err).slice(0, 160)}`; skipped += 1; }
  }
  logLine(`${n} kept${already ? `, ${already} already kept` : ''}${skipped ? `, ${skipped} not kept` : ''}.`);
}

/** a big file for the shared records: in 6 MB parts straight to the practice's bucket, then its record (as models.js and site-sources.js do) */
async function sendInParts(f, ctx, p, extra) {
  const { createUpload, uploadKey, tusEndpoint } = await import('./upload.js');
  const cloud = ctx.store.current, file = f.file, key = uploadKey(file, p.id), at = await cloud.filePlace({ project_id: p.id });
  const up = createUpload({
    file, key, saved: null, endpoint: tusEndpoint(SUPABASE_URL),
    metadata: { bucketName: BUCKET, objectName: at.path, contentType: file.type || 'application/octet-stream', cacheControl: '3600' },
    headers: async () => ({ authorization: `Bearer ${await cloud.fileToken()}`, apikey: SUPABASE_PUBLISHABLE_KEY, 'x-upsert': 'false' }),
    info: { name: file.name, project_id: p.id, file_id: at.id, path: at.path },
  });
  await up.start();
  return cloud.fileKept({ ...at, project_id: p.id, owner_kind: 'source', owner_id: p.id, name: file.name, type: file.type, size: file.size, extra });
}

registerProjectPanel({ id: 'intake', title: 'Intake', tab: 'site', order: 10, render: renderPanel });
