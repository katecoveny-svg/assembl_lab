// The page. It draws what the rules in model.js say and saves through store.js: nothing here touches storage directly.
import {
  STAGES, STAGE_KEYS, STATUS, ROLES, DOC_KINDS, stageDef, stageNumber, closingStatement, statusMark, statusWord, newProject, sampleProject, SAMPLE_ID,
  gate, closingApprovals, askForApproval, backToWork, recordApproval, markDone, nextAction, currentStage, allDone, openRfis, hasSiteFacts, hasModel,
  activity, newId, twinLink, twinHandoff, isEdited, sourceLabel, missingSourced, consentRow, taskRow, AUCKLAND, READ_ON,
  PLAN_RUN_KEY, readPlanRun, runReportDocument, runReportStage, runReportFileName,
} from './model.js';
import { createStore, browserBackend, sizeText, sessionHandoff } from './store.js';
import { describeModel, modelFingerprint } from './fingerprint.js';
import { parseWhere, fetchSiteFacts, answered, notConnected, noAnswer, credits, showValue, keptAddress, placeLine, packPlace, ADDRESS_CREDIT } from './facts.js';
import { addressBoxHtml, mountAddressBox } from './address.js';

// [cloud] One store for the whole page. It starts as this browser's store, exactly as before. account.js points it at the
// practice's shared records when a person is signed in with a practice, and back again when they sign out.
import { createSwitch } from './cloud.js';
import { mountAccount } from './account.js';
import { getRoute, projectPanels, navItems, loadAddons } from './modules.js'; // add-ons (models, clients) draw themselves into the page
import { planOutline, coverSvg, sketchSvg, outlineFor } from './cover.js';
import { THEMES, pickTheme, applyTheme, lookChoiceHtml, isTheme, LOOK_SETTING } from './theme.js';
import { icon, STAGE_ICON, NAV_ICON } from './icons.js';
import { glance } from './glance.js';
const store = createSwitch(createStore(browserBackend()));
const account = mountAccount({ store, local: store.local, slot: document.getElementById('acct'), panel: document.getElementById('account-panel'), nameLabel: document.querySelector('label.me') });
const W = (project) => account.words(project); // [cloud] wording that depends on where a project is kept
const $app = document.getElementById('app'), $me = document.getElementById('me'), $truth = document.getElementById('truth');
const ui = { adding: null, editing: null, confirm: null, flash: '', busy: false, factsError: '', modelError: '', allActivity: false, focus: null, scrollTo: null, exporting: false, fileFor: null, tabs: {}, wallAt: 0, learn: [], addr: { chosen: null, change: false } };
let me = '';
let kept = new Map(); // the files kept for the project on screen (in this browser, or in the shared records), by file id
let shown = null; // [cloud] the project on screen, for wording that depends on where it is kept
const handoff = { fp: '', pid: '', ok: false, why: '', told: false }; // whether the model on screen is ready to pass to the 3D page
const HERO = '/plan-studio/twins/drop/hero.webp';
let cleanups = []; // what the add-ons on screen asked to be run before the page is drawn again
const $mods = document.getElementById('mods');
let browserLook = ''; // this browser's own choice of look (theme.js): used when no practice is in use
let outlines = {}; // plan outlines this browser worked out from kept model files, by model fingerprint (a cache, kept as a setting)
let storage = null; try { storage = window.localStorage; } catch { /* blocked: the look is not remembered between visits */ }
/** the project page's tabs: [key, label, icon] */
const TABS = [['site', 'Site', 'site'], ['model', 'Model', 'cube'], ['drawings', 'Drawings', 'drawings'], ['presentation', 'Presentation', 'presentation'], ['takeoff', 'Takeoff', 'takeoff'], ['deliverables', 'Deliverables', 'deliverables']];
const TAB_KEYS = TABS.map((t) => t[0]);

// ---- small helpers ----------------------------------------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "22 Nov 2026" from a date or a date and time */
function day(v) {
  if (!v) return '';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function dayTime(v) {
  const d = new Date(v);
  if (!v || Number.isNaN(d.getTime())) return '';
  const h = d.getHours(), mm = String(d.getMinutes()).padStart(2, '0');
  return `${day(v)}, ${h % 12 || 12}:${mm} ${h < 12 ? 'am' : 'pm'}`;
}
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const href = (pid, ...rest) => `#/p/${encodeURIComponent(pid)}${rest.length ? '/' + rest.join('/') : ''}`;

function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'settings') return { view: 'settings' };
  if (parts[0] && parts[0] !== 'p' && getRoute(parts[0])) return { view: 'module', name: parts[0], rest: parts.slice(1) };
  if (parts[0] !== 'p' || !parts[1]) return { view: 'projects' };
  if (parts[2] === 'pack') return { view: 'pack', pid: parts[1] };
  if (parts[2] === 's' && STAGE_KEYS.includes(parts[3])) return { view: 'stage', pid: parts[1], stage: parts[3], section: parts[4] ?? null };
  return { view: 'dash', pid: parts[1], tab: parts[2] === 't' && TAB_KEYS.includes(parts[3]) ? parts[3] : null };
}

async function log(pid, action, detail) {
  await store.save('activity', activity(pid, me, action, detail));
  const p = await store.get('project', pid);
  if (p) { p.updated_at = new Date().toISOString(); await store.save('project', p); }
}

// ---- the lists: one description for each kind of record, used for showing, adding and editing ---------------------
const fld = (name, label, o = {}) => ({ name, label, ...o });
const KIND = {
  task: { list: 'tasks', noun: 'task', status: 'task', first: 'todo',
    fields: [fld('title', 'Task', { req: 1, wide: 1 }), fld('owner', 'Owner'), fld('due', 'Due', { type: 'date' }), fld('note', 'Note', { span2: 1 })],
    main: (r) => r.title, sub: (r) => r.note, meta: (r) => [r.owner, r.due && `due ${day(r.due)}`] },
  document: { list: 'documents', noun: 'document',
    fields: [fld('title', 'Document', { req: 1, wide: 1 }), fld('kind', 'Kind', { options: DOC_KINDS }), fld('version', 'Version'), fld('date', 'Date', { type: 'date' }), fld('source', 'Where it is kept or came from'), fld('note', 'Note', { wide: 1 })],
    main: (r) => r.title, sub: (r) => [r.source, r.note].filter(Boolean).join(' · '), meta: (r) => [r.kind, r.version && `version ${r.version}`, r.date && day(r.date)] },
  rfi: { list: 'rfis', noun: 'request', status: 'rfi', first: 'open',
    fields: [fld('received_at', 'Received', { type: 'date', req: 1 }), fld('from', 'From', { req: 1 }), fld('question', 'Question', { req: 1, area: 1, wide: 1 }), fld('response', 'Drafted reply', { area: 1, wide: 1 })],
    main: (r) => r.question, sub: (r) => (r.response ? `Reply: ${r.response}` : 'No reply drafted yet.'), meta: (r) => [r.from, r.received_at && `received ${day(r.received_at)}`, r.sent_at && `sent ${day(r.sent_at)}`] },
  observation: { list: 'observations', noun: 'observation',
    fields: [fld('date', 'Date', { type: 'date', req: 1 }), fld('by', 'Seen by', { req: 1 }), fld('note', 'What was seen', { req: 1, area: 1, wide: 1 })],
    main: (r) => r.note, sub: () => '', meta: (r) => [r.date && day(r.date), r.by] },
  variation: { list: 'variations', noun: 'variation', status: 'variation', first: 'raised',
    fields: [fld('title', 'Variation', { req: 1, wide: 1 }), fld('note', 'Note', { wide: 1 })], main: (r) => r.title, sub: (r) => r.note, meta: () => [] },
  defect: { list: 'defects', noun: 'defect', status: 'defect', first: 'open',
    fields: [fld('title', 'Defect', { req: 1, wide: 1 }), fld('note', 'Note', { wide: 1 })], main: (r) => r.title, sub: (r) => r.note, meta: () => [] },
  checklist_item: { list: 'checklist', noun: 'item', status: 'checklist_item', first: 'needed',
    fields: [fld('title', 'Item', { req: 1, wide: 1 }), fld('document_id', 'Satisfied by', { docs: 1, span2: 1 }), fld('note', 'Note', { span2: 1 })],
    main: (r) => r.title, sub: (r) => r.note, meta: (r, b) => { const d = b.documents.find((x) => x.id === r.document_id); return [d ? `satisfied by: ${d.title}` : r.list === 'consent' ? 'no document yet' : '']; } },
};

function fieldHtml(f, value, b) {
  const cls = f.wide ? ' class="wide"' : f.span2 ? ' class="span2"' : '', req = f.req ? ' required' : '', v = esc(value ?? '');
  let control;
  if (f.options) control = `<select name="${f.name}">${['', ...f.options].map((o) => `<option value="${esc(o)}"${o === (value ?? '') ? ' selected' : ''}>${o ? esc(o) : 'Choose…'}</option>`).join('')}</select>`;
  else if (f.docs) control = `<select name="${f.name}"><option value="">No document yet</option>${b.documents.map((d) => `<option value="${esc(d.id)}"${d.id === value ? ' selected' : ''}>${esc(d.title)}${d.version ? ` (version ${esc(d.version)})` : ''}</option>`).join('')}</select>`;
  else if (f.area) control = `<textarea name="${f.name}"${req}>${v}</textarea>`;
  else control = `<input name="${f.name}" type="${f.type ?? 'text'}" value="${v}"${req} maxlength="400" />`;
  return `<label${cls}>${esc(f.label)}${control}</label>`;
}

/** where a task or checklist item came from, shown under it: a link to the source, or a plain word that it has none */
function sourceHtml(kind, r) {
  if (kind !== 'task' && kind !== 'checklist_item') return '';
  const s = r.source_ref;
  if (s?.url) {
    const a = `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(sourceLabel(s))}</a>`;
    return `<div class="srcl">${s.council ? `<span class="tag">${esc(s.council)}</span> ` : ''}${isEdited(r) ? `<span class="tag">Edited</span> Edited by the practice. Started from ${a}` : `From ${a}`}, read ${esc(day(s.read))}.</div>`;
  }
  return `<div class="srcl">${r.origin === 'starter' ? 'assembl starter, not sourced.' : r.origin === 'practice' ? 'Added by the practice, not sourced.' : 'Not sourced.'}</div>`;
}

/** the sources a list draws on, written out once: name, what the source said about its own date, the date read, the address */
function sourcesHtml(rows, cls = '') {
  const seen = new Map();
  for (const r of rows) if (r.source_ref?.url && !seen.has(r.source_ref.url)) seen.set(r.source_ref.url, r.source_ref);
  if (!seen.size) return '';
  return `<div class="sources${cls ? ` ${cls}` : ''}"><p class="lab">Sources, read ${esc(day(READ_ON))}</p><ul>${[...seen.values()].map((x) => `<li><span>${x.council ? `${esc(x.council)}, ` : ''}${esc(x.name)}${x.version ? ` · ${esc(x.version)}` : ''} · read ${esc(day(x.read))}</span><a class="url" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url)}</a></li>`).join('')}</ul></div>`;
}

/** the file kept with a document: its name and size, and the buttons to download, replace or remove it */
function fileBar(d) {
  const f = d.file, sure = ui.confirm === `file:${d.id}`, name = `<span class="vh"> for ${esc(d.title)}</span>`;
  if (!f?.id) return `<div class="filebar"><span class="st">□ No file kept</span><button class="link" data-act="file-pick" data-id="${esc(d.id)}">Attach a file${name}</button></div>`;
  if (!kept.has(f.id)) return `<div class="filebar"><span class="st">${esc(W(shown).fileState[1]) /* [cloud] */}</span><span class="fname">${esc(f.name)} · ${esc(sizeText(f.size))}</span><button class="link" data-act="file-pick" data-id="${esc(d.id)}">Attach it again${name}</button></div>`;
  return `<div class="filebar"><span class="st">${esc(W(shown).fileState[0]) /* [cloud] */}</span><span class="fname">${esc(f.name)} · ${esc(sizeText(f.size))}</span>
    <button class="link" data-act="file-get" data-id="${esc(f.id)}">Download${name}</button><button class="link" data-act="file-pick" data-id="${esc(d.id)}">Replace${name}</button><button class="link" data-act="file-remove" data-id="${esc(d.id)}">${sure ? 'Remove for good' : 'Remove file'}${name}</button></div>`;
}

/** one list with its rows, the form to edit a row, and the form to add one */
function listHtml(b, kind, rows, ctx, { addLabel, emptyText, extra = '', head } = {}) {
  const K = KIND[kind], addKey = `${kind}:${ctx.key}`;
  let lastHead = null;
  // an optional heading row wherever the group changes (the consent list: every council, then Auckland Council)
  const headed = (r, html) => { const h = head ? head(r) : null; if (!h || h === lastHead) return html; lastHead = h; return `<li class="grp">${esc(h)}</li>${html}`; };
  const row = (r) => headed(r, rowHtml(r));
  const rowHtml = (r) => {
    if (ui.editing === r.id) {
      const sure = ui.confirm === r.id;
      return `<li class="rowi editing"><form class="f" data-form="edit" data-kind="${kind}" data-id="${esc(r.id)}">${K.fields.map((f) => fieldHtml(f, r[f.name], b)).join('')}
        <div class="f-act"><button class="btn solid">Save</button><button type="button" class="btn" data-act="cancel">Cancel</button>
        <button type="button" class="link" data-act="remove" data-kind="${kind}" data-id="${esc(r.id)}">${sure ? 'Remove for good' : `Remove this ${K.noun}`}</button></div></form></li>`;
    }
    const meta = K.meta(r, b).filter(Boolean).map(esc).join(' · '), sub = K.sub(r);
    const st = K.status
      ? `<select class="st" data-status="${kind}" data-id="${esc(r.id)}" aria-label="Status of ${esc(K.main(r))}">${STATUS[K.status].map(([v]) => `<option value="${v}"${v === r.status ? ' selected' : ''}>${esc(statusMark(K.status, v))}</option>`).join('')}</select><span class="st paper" aria-hidden="true">${esc(statusMark(K.status, r.status))}</span>`
      : '<span class="st-none"></span>';
    return `<li class="rowi${K.status ? '' : ' plain'}"><div class="main"><span class="t">${esc(K.main(r))}</span>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</div>${sourceHtml(kind, r)}<div class="meta">${meta}</div>${st}
      <button class="link" data-act="edit" data-id="${esc(r.id)}" aria-label="Edit ${esc(K.main(r))}">Edit</button>${kind === 'document' ? fileBar(r) : ''}</li>`;
  };
  const adding = ui.adding === addKey;
  // only what is true by default: a request or a visit logged now is dated today; a document's own date is never guessed
  const blank = kind === 'rfi' ? { received_at: today() } : kind === 'observation' ? { date: today(), by: me } : {};
  return `<ul class="rows">${rows.length ? rows.map(row).join('') : `<li class="none">${esc(emptyText ?? `No ${K.noun}s yet.`)}</li>`}</ul>
    ${adding
      ? `<div class="addbox"><form class="f" data-form="add" data-kind="${kind}" data-ctx="${esc(ctx.key)}">${K.fields.map((f) => fieldHtml(f, blank[f.name] ?? '', b)).join('')}
          <div class="f-act"><button class="btn solid">${esc(addLabel ?? `Add ${K.noun}`)}</button><button type="button" class="btn" data-act="cancel">Cancel</button></div></form></div>`
      : `<div class="acts"><button class="btn" data-act="add" data-key="${esc(addKey)}">+ ${esc(addLabel ?? `Add ${K.noun}`)}</button>${extra}</div>`}`;
}

// ---- covers, stage bars and status: the visual parts every project shows ---------------------------------------------------
/** the project's cover: its model's plan when there is one, otherwise a plain decorative sketch that says there is no model */
function coverHtml(p, cls = '') {
  const o = outlineFor(p.model, outlines);
  if (o) return `<div class="cover plan${cls ? ` ${cls}` : ''}">${coverSvg(o, { label: `${o.level || 'Ground floor'} plan of ${p.name}, drawn from its plan model${p.model.revision ? `, revision ${p.model.revision}` : ''}` })}</div>`;
  return `<div class="cover deco${cls ? ` ${cls}` : ''}">${sketchSvg()}<span class="cover-note">${p.model?.fingerprint ? 'Model attached' : 'No model yet'}</span></div>`;
}
const coverCaption = (p) => { const o = outlineFor(p.model, outlines); return o ? `${o.level || 'Ground floor'} · from the model${p.model.revision ? `, revision ${p.model.revision}` : ''}` : ''; };
/** seven segments, one a stage */
const segsHtml = (g) => `<span class="segs" role="img" aria-label="${esc(`${g.done} of 7 stages done${g.stage ? `. Now stage ${g.stage.n}, ${g.stage.label}` : ''}`)}">${g.segs.map((x) => `<i class="${x}"></i>`).join('')}</span>`;
/** a status dot with its word: the colour only repeats what the word says */
const stateHtml = (g) => `<span class="state ${g.status}"><span class="dot" aria-hidden="true"></span><span>${esc(g.word)}</span></span>`;
const stageLine = (g) => (g.stage ? `${g.stage.n}/7 · ${g.stage.label}` : g.done === 7 ? '7/7 · Done' : '');
// the client pack's own small rail and line (it prints, so it keeps the squares)
const miniRail = (stages) => `<span class="mini" aria-hidden="true">${STAGE_KEYS.map((k) => { const s = stages.find((x) => x.key === k); return `<i class="${s?.status === 'done' ? 'done' : s && s.status !== 'not_started' ? 'now' : ''}"></i>`; }).join('')}</span>`;
function whereLine(stages) {
  if (stages.length && stages.every((s) => s.status === 'done')) return '■ All seven stages done';
  const s = stages.find((x) => x.status === 'in_progress' || x.status === 'awaiting_approval');
  return s ? `Stage ${stageNumber(s.key)} of 7 · ${stageDef(s.key).label} · ${statusMark('stage', s.status)}` : '';
}

// ---- projects screen ----------------------------------------------------------------------------------------------------
async function projectsView() {
  const projects = (await store.list('project')).sort((a, b) => (a.sample ? 1 : 0) - (b.sample ? 1 : 0) || String(b.updated_at).localeCompare(String(a.updated_at)));
  const [stages, tasks, rfis, approvals] = await Promise.all(['stage', 'task', 'rfi', 'approval'].map((k) => store.list(k)));
  const hasSample = projects.some((p) => p.sample);
  const seen = projects.map((p) => {
    const mine = (list) => list.filter((x) => x.project_id === p.id);
    return { p, g: glance({ project: p, stages: mine(stages), tasks: mine(tasks), rfis: mine(rfis), approvals: mine(approvals) }) };
  });
  const count = (st) => seen.filter((x) => x.g.status === st).length;
  const tiles = seen.map(({ p, g }, i) => {
    const sure = ui.confirm === p.id;
    return `<li class="prow ptile" style="--i:${Math.min(i, 8)}">
      ${coverHtml(p)}
      <div class="ptile-body">
        <p class="ptile-kick">${p.sample ? '<span class="tag">Sample</span>' : p.client ? esc(p.client) : 'No client named'}</p>
        <h2><a class="ptile-a" href="${href(p.id)}">${esc(p.name)}</a></h2>
        <div class="ptile-where">${segsHtml(g)}<span class="st">${esc(stageLine(g))}</span></div>
        <p class="ptile-state">${stateHtml(g)}</p>
        <p class="ptile-next">${esc(g.next)}</p>
      </div>
      <div class="ptile-foot"><span class="when">Changed ${esc(day(p.updated_at))}</span>
        <button class="link" data-act="project-remove" data-id="${esc(p.id)}">${sure ? 'Remove for good' : 'Remove'}<span class="vh"> ${esc(p.name)}</span></button></div></li>`;
  }).join('');
  ui.learn = projects.filter((p) => p.model?.file?.id && !outlineFor(p.model, outlines)).slice(0, 6); // covers still to work out
  // tiles fade and rise in once, when the wall is first shown (the page may draw twice as sign-in answers: both count as first)
  const now = performance.now();
  if (!ui.wallAt) ui.wallAt = now;
  const anim = now - ui.wallAt < 900 ? ' rise' : '';
  return `<div class="wrap">
    <section class="hero"><p class="label">Projects</p><h1><span class="accent">From the first site visit</span> to completion.</h1>
      <dl class="bignums"><div><dt>Projects</dt><dd>${projects.length}</dd></div><div><dt><span class="dot go" aria-hidden="true"></span>Under way</dt><dd>${count('go')}</dd></div>
        <div><dt><span class="dot needs" aria-hidden="true"></span>Need something</dt><dd>${count('needs')}</dd></div><div><dt><span class="dot waiting" aria-hidden="true"></span>Waiting on a person</dt><dd>${count('waiting')}</dd></div></dl></section>
    ${flashHtml()}${incomingHtml(projects)}
    ${projects.length ? '' : `<div class="empty"><h3>No projects ${esc(W().here)} yet.</h3><p>Create one, import a project file, or add the sample to look around.</p></div>`}
    <ul class="pwall${anim}" aria-label="Projects">${tiles}
      <li class="ptile new" style="--i:${Math.min(seen.length, 8)}"><h2 class="new-h" id="newp">${icon('plus')}<span>New project</span></h2>
        <form class="f newp" data-form="new-project" aria-labelledby="newp"><label>Project name<input name="name" required maxlength="120" placeholder="e.g. House on the ridge" /></label>
          <label>Client<input name="client" maxlength="120" placeholder="optional" /></label>
          <div class="f-act"><button class="btn solid">Create project</button></div></form>
        <div class="acts"><button class="btn" data-act="pick" data-target="import-file">${icon('import')}<span>Import a project file</span></button>${hasSample ? '' : '<button class="link" data-act="sample">Add the sample project</button>'}
          <input type="file" id="import-file" data-file="import" accept=".json,application/json" hidden /></div>
        <details class="more-note"><summary>What a new project starts with</summary><p class="small">Predesign, with a list of tasks for each stage and a consent list. Each item shows its source, or says it is an assembl starter with none. Edit the lists to suit your practice, and check your council’s current checklist.</p></details></li>
    </ul></div>`;
}

const flashHtml = () => (ui.flash ? `<p class="flash" role="status">${esc(ui.flash)}</p>` : '');

// ---- a run report passed across from the 3D page (model.js, readPlanRun): nothing is saved until a person chooses ----------
function incoming() {
  let text = null;
  try { text = globalThis.sessionStorage?.getItem(PLAN_RUN_KEY) ?? null; } catch { return null; }
  if (!text) return null;
  try { return readPlanRun(text, modelFingerprint); } catch (err) { return { error: err.message }; }
}
function incomingHtml(projects) {
  const h = incoming();
  if (!h) return '';
  if (h.error) return `<section class="panel incoming" aria-labelledby="inh"><h3 id="inh">From the 3D page</h3><p>□ ${esc(h.error)}</p><div class="acts"><button class="link" data-act="run-dismiss">Clear it</button></div></section>`;
  const opts = projects.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}${p.model?.fingerprint ? ` (model ${esc(p.model.fingerprint)})` : ' (no model yet)'}</option>`).join('');
  return `<section class="panel incoming" aria-labelledby="inh"><h3 id="inh">From the 3D page: a run report</h3>
    <p><b>${esc(h.title)}</b> · model version <span class="mono">${esc(h.fingerprint)}</span> · run ${esc(dayTime(h.ranAt))}</p>
    <p class="small"><b>A pre-check prepared by software for a person to review. It is not a compliance decision or a professional sign-off.</b></p>
    <p class="small">${esc(h.summary)} ${esc(plural(h.mustCheck, 'thing'))} for a person to check.</p>
    ${projects.length ? `<form class="f" data-form="run-add"><label class="wide">Add it to<select name="pid">${opts}</select></label><div class="f-act"><button class="btn solid">Add the report</button></div></form>` : ''}
    <form class="f" data-form="run-new"><label class="wide">Or start a project<input name="name" required maxlength="120" value="${esc(h.title)}" /></label><div class="f-act"><button class="btn">Create a project with it</button><button type="button" class="link" data-act="run-dismiss">Not now</button></div></form>
    <p class="small">Nothing is saved until you choose. The report becomes a document on the project, with its text file kept ${esc(W().keptOnly) /* [cloud] */}. ${h.plan ? 'The model is attached only if the project has none.' : 'The model was too big to pass across, so only the report came.'} The site point is not in either.</p></section>`;
}
/** add the passed-across report to a project: a document with its file, and the model when the project has none */
async function addRun(pid, h) {
  const b = await store.loadProject(pid);
  if (!b) throw new Error('That project is no longer here, so nothing was added.');
  const p = b.project, stage = runReportStage(b);
  let said = '';
  if (h.plan && !p.model?.fingerprint) {
    const m = describeModel(h.planText, h.name);
    let keptFile = null;
    if (!twinLink({ fingerprint: m.fingerprint })?.direct) {
      try { const meta = await store.putFile({ project_id: pid, owner_kind: 'model', owner_id: pid, name: m.file_name, type: 'application/json', data: h.planText }); keptFile = { id: meta.id, name: meta.name, type: meta.type, size: meta.size, kept_at: meta.kept_at }; } catch (err) { said = ` The model file was not kept: ${err.message}`; }
    }
    p.model = { fingerprint: m.fingerprint, drawings: m.drawings, revision: m.revision, file_name: m.file_name, file: keptFile };
    await store.save('project', p);
    await log(pid, 'Model attached', `${m.file_name}, revision ${m.revision}, version ${m.fingerprint}, from the 3D page`);
    said = ` The model is attached (version ${m.fingerprint}).${said}`;
  } else if (p.model?.fingerprint === h.fingerprint) said = ' The project already has this model version.';
  else if (p.model?.fingerprint) said = ` The project’s model is version ${p.model.fingerprint}; the report is on version ${h.fingerprint}, so the model was left as it is.`;
  else said = ' The model did not come with it: attach it from the model page.';
  const d = runReportDocument(pid, stage, h);
  try {
    const meta = await store.putFile({ project_id: pid, owner_kind: 'document', owner_id: d.id, name: runReportFileName(h), type: 'text/plain', data: h.text });
    d.file = { id: meta.id, name: meta.name, type: meta.type, size: meta.size, kept_at: meta.kept_at };
  } catch (err) { said += ` The report’s file was not kept (${err.message}); the document records it.`; }
  await store.save('document', d);
  await log(pid, 'Run report added', `${h.title}, model version ${h.fingerprint}`);
  try { globalThis.sessionStorage?.removeItem(PLAN_RUN_KEY); } catch { /* it goes when the tab closes */ }
  return { stage, flash: `Added the run report to ${stageDef(stage).label} as a document.${said}` };
}


// ---- the project frame: the seven stages as a strip of icons ---------------------------------------------------------------
function stripHtml(b, r) {
  const p = b.project;
  return `<nav class="strip" aria-label="The seven stages"><ol>${STAGES.map((s, i) => {
    const st = b.stages.find((x) => x.key === s.key), cls = st.status === 'done' ? 'done' : st.status === 'awaiting_approval' ? 'wait' : st.status === 'in_progress' ? 'now' : '';
    return `<li><a class="${cls}" href="${href(p.id, 's', s.key)}"${r.view === 'stage' && r.stage === s.key ? ' aria-current="page"' : ''}>
      <span class="sic">${icon(STAGE_ICON[s.key])}</span><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="name">${esc(s.label)}</span><span class="st">${esc(statusMark('stage', st.status))}</span></a></li>`;
  }).join('')}</ol></nav>`;
}
const railNow = (b) => { const cur = currentStage(b); return allDone(b) ? '■ All seven stages done' : cur ? `Stage ${stageNumber(cur.key)} of 7 · ${stageDef(cur.key).label} · ${statusMark('stage', cur.status)}` : ''; };
const projectNav = (p, r) => `<nav class="pnav" aria-label="Project">${r.view === 'dash' ? '' : `<a class="btn" href="${href(p.id)}">${icon('projects')}<span>Overview</span></a>`}<a class="btn" href="${href(p.id, 'pack')}">${icon('pack')}<span>Client pack</span></a><button class="btn" data-act="export"${ui.exporting ? ' aria-expanded="true"' : ''}>${icon('export')}<span>Export</span></button></nav>`;
const who = (p) => `<p class="label">${p.sample ? '<span class="tag">Sample</span>' : 'Project'}</p>`;
const clientLine = (p) => (p.sample ? 'The lab’s example plan model. No client is named.' : p.client ? `Client: ${esc(p.client)}` : 'No client named');

/** a stage page's frame: a small header with the cover, then the strip */
function frame(b, r, inner) {
  const p = b.project;
  return `<div class="wrap">
    <nav class="crumb" aria-label="Back"><a href="${href(p.id)}">${icon('back')}<span>${esc(p.name)}</span></a></nav>
    <header class="phead pmini">${coverHtml(p, 'thumb')}<div class="who">${who(p)}<h1>${esc(p.name)}</h1><p class="small">${clientLine(p)}</p></div>${projectNav(p, r)}</header>
    ${ui.exporting ? exportHtml(p) : ''}
    ${stripHtml(b, r)}
    <p class="rail-now">${esc(railNow(b))}</p>
    ${flashHtml()}${inner}</div>`;
}

/** Export asks one thing first: with the kept files, or without. Either way it says which. */
function exportHtml(p) {
  const files = [...kept.values()], bytes = files.reduce((n, f) => n + f.size, 0);
  return `<section class="panel exportbox" aria-labelledby="exh"><h3 id="exh">Export “${esc(p.name)}”</h3>
    ${files.length
    ? `<p>This project has ${plural(files.length, 'file')} kept ${esc(W(p).here) /* [cloud] */} (${esc(sizeText(bytes))}). Choose whether they go in the project file.</p>
      <div class="acts"><button class="btn solid" data-act="export-go" data-files="1">Export with the files</button><button class="btn" data-act="export-go" data-files="0">Export the records only</button><button class="link" data-act="export-cancel">Cancel</button></div>
      <p class="small">With the files: one larger file that holds everything, so another browser can open the documents. Records only: the files stay ${esc(W(p).here) /* [cloud] */}, and each document still names the file it had.</p>`
    : `<p>This project has no files kept ${esc(W(p).here) /* [cloud] */}, so there are none to include. The project file holds the records.</p>
      <div class="acts"><button class="btn solid" data-act="export-go" data-files="0">Export the project</button><button class="link" data-act="export-cancel">Cancel</button></div>`}
    <p class="small">The file includes the site point and address if they are saved.</p></section>`;
}

/** the Open in 3D button: a link straight to a hosted model, a hand-over of a kept file, or the 3D page's own chooser */
function open3dHtml(p, link, label = 'Open in 3D ↗') {
  const stuck = handoff.fp === p.model.fingerprint && !!handoff.why;
  if (link.handoff && !stuck) return `<a class="btn solid" href="${esc(link.href)}" target="_blank" rel="opener" data-act="open-3d">${label}</a>`;
  return `<a class="btn solid" href="${esc(link.handoff ? '/plan-studio/twins/drop/?drop=1' : link.href)}" target="_blank" rel="noopener">${label}</a>`;
}

// ---- the project page: the drawing, the seven stages, a few numbers, then the work in tabs --------------------------------------
function dashView(b, r) {
  const p = b.project, cur = currentStage(b), n = nextAction(b), g = glance(b);
  const nextHref = !n ? '#/' : n.kind === 'pack' ? href(p.id, 'pack') : href(p.id, 's', n.stage, { tool: 'tool', tasks: 'tasks', ask: 'approval', approve: 'approval', done: 'approval' }[n.kind]);
  const tasks = cur ? b.tasks.filter((t) => t.stage === cur.key && t.status !== 'done') : [];
  const waiting = b.stages.filter((s) => s.status === 'awaiting_approval');
  const rfis = openRfis(b), openDefects = b.defects.filter((d) => d.status !== 'closed').length;
  const tab = r.tab ?? ui.tabs[p.id] ?? 'model';
  const cap = coverCaption(p);
  const num = (value, caption, to) => `<a class="num" href="${to}"><span class="big">${value}</span><span class="cap">${esc(caption)}</span></a>`;
  const panel = (key, body) => `<section class="tp" role="tabpanel" id="tp-${key}" aria-labelledby="tab-${key}" tabindex="0"${key === tab ? '' : ' hidden'}>${body}</section>`;
  const acts = ui.allActivity ? b.activity : b.activity.slice(0, 8);
  return `<div class="wrap">
    <nav class="crumb" aria-label="Back"><a href="#/">${icon('back')}<span>All projects</span></a></nav>
    <header class="phead pvis">
      <figure class="pfig">${coverHtml(p, 'big')}${cap ? `<figcaption class="caption">${esc(cap)}</figcaption>` : ''}</figure>
      <div class="who">${who(p)}<h1>${esc(p.name)}</h1><p class="small">${clientLine(p)}</p>
        <div class="pstate">${stateHtml(g)}${segsHtml(g)}<span class="st">${esc(stageLine(g))}</span></div>
        ${n ? `<section class="next" aria-labelledby="nx"><p class="label" id="nx">Next</p><p class="say">${esc(g.next)}</p><a class="btn solid" href="${nextHref}">${esc(n.button)}</a></section>` : ''}
        ${projectNav(p, r)}</div>
    </header>
    ${ui.exporting ? exportHtml(p) : ''}
    ${stripHtml(b, r)}
    <p class="rail-now">${esc(railNow(b))}</p>
    ${flashHtml()}
    <div class="nums">
      ${num(tasks.length, `open task${tasks.length === 1 ? '' : 's'}${cur ? ` · ${stageDef(cur.key).label}` : ''}`, cur ? href(p.id, 's', cur.key, 'tasks') : href(p.id, 's', 'completion', 'tasks'))}
      ${num(waiting.length, `waiting for approval`, waiting.length ? href(p.id, 's', waiting[0].key, 'approval') : cur ? href(p.id, 's', cur.key, 'approval') : href(p.id, 't', 'deliverables'))}
      ${num(rfis.length, `open request${rfis.length === 1 ? '' : 's'}`, href(p.id, 's', 'detailed', 'tool'))}
      ${num(openDefects, `open defect${openDefects === 1 ? '' : 's'}`, href(p.id, 's', 'completion', 'tool'))}
    </div>
    <div class="tabs" role="tablist" aria-label="Project work">${TABS.map(([k, label, ic]) => `<button type="button" role="tab" id="tab-${k}" aria-controls="tp-${k}" aria-selected="${k === tab}" tabindex="${k === tab ? 0 : -1}" data-tab="${k}">${icon(ic)}<span>${label}</span></button>`).join('')}</div>
    ${panel('site', siteTab(b))}
    ${panel('model', modelTab(b))}
    ${panel('drawings', drawingsTab(b))}
    ${panel('presentation', presentationTab(b))}
    ${panel('takeoff', takeoffTab(b))}
    ${panel('deliverables', deliverablesTab(b))}
    <details class="more log"${ui.allActivity ? ' open' : ''}><summary><span class="label">Activity</span><span class="st">${plural(b.activity.length, 'entry', 'entries')}</span></summary>
      ${b.activity.length ? `<ol>${acts.map((a) => `<li><span class="when">${esc(dayTime(a.at))} · ${esc(a.who)}</span><span><b style="font-weight:500">${esc(a.action)}</b>${a.detail ? `: ${esc(a.detail)}` : ''}</span></li>`).join('')}</ol>
        ${b.activity.length > 8 ? `<div><button class="link" data-act="activity-more">${ui.allActivity ? 'Show the latest only' : `Show all ${b.activity.length}`}</button></div>` : ''}` : '<p class="small">Nothing has been done on this project yet. Each change is logged here with who made it and when.</p>'}
      <p class="small">${esc(W(p).whoNote) /* [cloud] */}</p></details>
  </div>`;
}

// the tab names the panel (aria-labelledby), so a panel starts with its one status line, not its name again
const tabHead = (_ic, _title, line = '') => (line ? `<div class="tphead"><p class="st">${line}</p></div>` : '');
const emptyState = (ic, title, line) => `<div class="empty vis">${icon(ic, 'big')}<h3>${esc(title)}</h3>${line ? `<p class="small">${line}</p>` : ''}</div>`;

/** Site: the site facts and the way to the real ground */
function siteTab(b) {
  const s = b.project.site ?? {};
  return `${tabHead('site', 'Site', hasSiteFacts(b) ? `■ ${plural(answered(s.facts).length, 'fact')} · ${esc(dayTime(s.fetched_at))}` : '□ Not looked up')}
    ${siteTool(b)}
    <p class="small">The real ground under the house (LINZ LiDAR and the legal boundary) is on the 3D page, in its Real ground card. <a href="/plan-studio/twins/drop/?drop=1" target="_blank" rel="noopener">Open the 3D page ↗</a></p>`;
}

/** Model: the kept plan model, then the add-on sections (Revit and IFC models) */
function modelTab(b) {
  const p = b.project;
  return `${tabHead('cube', 'Model', hasModel(b) ? `■ Revision ${esc(p.model.revision)} · version ${esc(p.model.fingerprint)}` : '□ Not attached')}
    ${modelTool(b, stageDef('concept'))}
    <div class="mod-host" data-mod-panels></div>`;
}

/** Drawings: every document, each with its file */
function drawingsTab(b) {
  const p = b.project, cur = currentStage(b), order = (d) => STAGE_KEYS.indexOf(d.stage);
  const docs = [...b.documents].sort((x, y) => order(x) - order(y)), files = docs.filter((d) => d.file?.id && kept.has(d.file.id)).length;
  const tile = (d) => `<li class="doc">${icon(d.kind === 'Photo' ? 'photo' : 'drawings', 'doc-ic')}<div class="doc-main"><p class="doc-t">${esc(d.title)}</p>
      <p class="doc-m">${esc([d.kind, d.version && `version ${d.version}`, d.date && day(d.date)].filter(Boolean).join(' · ') || 'No kind or date')}</p>
      <p class="doc-m"><a href="${href(p.id, 's', d.stage, 'documents')}">${esc(stageDef(d.stage)?.label ?? 'Stage')}<span class="vh">: edit ${esc(d.title)}</span></a></p></div>${fileBar(d)}</li>`;
  return `${tabHead('drawings', 'Drawings', `${plural(docs.length, 'document')} · ${plural(files, 'file')} kept`)}
    ${docs.length ? `<ul class="docs">${docs.map(tile).join('')}</ul>` : emptyState('drawings', 'No documents yet.', 'Drawings, reports and consent documents you add appear here, each with its file.')}
    <div class="acts"><button class="btn" data-act="pick" data-target="doc-new">${icon('plus')}<span>Add a file</span></button><span class="small">It goes in ${esc(stageDef(cur?.key ?? 'completion').label)}. To change a document’s details, open its stage.</span></div>
    <input type="file" id="doc-file" data-file="doc" hidden /><input type="file" id="doc-new" data-file="doc-new" data-stage="${esc(cur?.key ?? 'completion')}" hidden />`;
}

/** Presentation: the model in 3D, the sample's rendering, and photos */
function presentationTab(b) {
  const p = b.project, link = twinLink(p.model), photos = b.documents.filter((d) => d.kind === 'Photo');
  const three = link ? `<div class="pres-3d">${icon('cube', 'big')}<div><h3>${esc(p.model.file_name)}</h3><p class="st">■ Revision ${esc(p.model.revision)}</p>
      <div class="acts">${open3dHtml(p, link)}</div>${link.direct ? `<p class="url">${esc(new URL(link.href, location.origin).href)}</p>` : '<p class="small">Opens in this browser. A link a client can open for a practice’s own model: Not built yet.</p>'}</div></div>`
    : emptyState('cube', 'No model to show in 3D yet.', 'Attach the plan model in the Model tab.');
  const pic = p.sample ? `<figure class="pres-pic"><img src="${HERO}" alt="A dark-clad house on timber piles among trees." loading="lazy" /><figcaption class="caption">A rendering of the sample plan model. Not a photograph.</figcaption></figure>` : '';
  return `${tabHead('presentation', 'Presentation')}
    ${three}${pic}
    <div class="sub-h"><h3>Photos</h3><span class="st">${plural(photos.length, 'photo')}</span></div>
    ${photos.length ? `<ul class="docs">${photos.map((d) => `<li class="doc">${icon('photo', 'doc-ic')}<div class="doc-main"><p class="doc-t">${esc(d.title)}</p><p class="doc-m">${esc(d.date ? day(d.date) : 'No date')}</p></div>${fileBar(d)}</li>`).join('')}</ul>`
      : emptyState('photo', 'Photos will appear here.', 'Add a document of kind Photo, with its file, in the Drawings tab or on a stage. Stills taken on the 3D page: Not built yet.')}`;
}

/** Takeoff: nothing is measured here yet */
function takeoffTab() {
  return `${tabHead('takeoff', 'Takeoff')}${emptyState('takeoff', 'Quantities from the model, coming.', 'Not built yet. Nothing is measured on this page.')}`;
}

/** Deliverables: the consent bundle, the approvals and the stage gate, the client pack and export */
function deliverablesTab(b) {
  const p = b.project, cur = currentStage(b), consent = b.checklist.filter((c) => c.list === 'consent'), got = consent.filter((c) => c.status !== 'needed').length;
  const approvals = [...b.approvals].sort((x, y) => String(y.at).localeCompare(String(x.at)));
  const g = cur ? gate(b, cur.key) : null, at = !cur ? 3 : g?.ok ? 2 : cur.status === 'awaiting_approval' ? 1 : 0;
  const step = (i, text) => `<li class="${at === i ? 'on' : ''}">${at > i ? '■' : '□'} ${i + 1}. ${text}</li>`;
  const comp = b.checklist.filter((c) => c.list === 'completion');
  return `${tabHead('deliverables', 'Deliverables')}
    <div class="dl-grid">
      <a class="num dl" href="${href(p.id, 's', 'detailed', 'tool')}"><span class="big">${got}<small>/${consent.length}</small></span><span class="cap">Consent bundle · done or not needed</span></a>
      <a class="num dl" href="${cur ? href(p.id, 's', cur.key, 'approval') : href(p.id, 'pack')}"><span class="big">${approvals.length}</span><span class="cap">${approvals.length === 1 ? 'approval' : 'approvals'} on record</span></a>
      <div class="dl dl-acts"><a class="btn solid" href="${href(p.id, 'pack')}">${icon('pack')}<span>Client pack</span></a><button class="btn" data-act="export">${icon('export')}<span>Export</span></button></div>
    </div>
    ${cur ? `<div class="sub-h"><h3>${esc(stageDef(cur.key).label)}: the stage gate</h3><a class="link" href="${href(p.id, 's', cur.key, 'approval')}">Open the approval</a></div>
      <ol class="steps">${step(0, 'The work is ready')}${step(1, 'A named person approves')}${step(2, 'The stage is marked done')}</ol>` : '<p class="st">■ All seven stages done</p>'}
    ${approvals.length ? `<div class="sub-h"><h3>Approvals so far</h3></div>${approvals.slice(0, 3).map((a) => `<div class="record"><p class="st" style="white-space:normal">${esc(stageDef(a.stage)?.label ?? a.stage)}</p><p class="by">${esc(a.who)}, ${esc(a.role)}</p><p class="when">${esc(dayTime(a.at))}${a.fingerprint ? ` · model version ${esc(a.fingerprint)}` : ''}</p></div>`).join('')}
      ${approvals.length > 3 ? `<p class="small">All ${approvals.length} are in the client pack.</p>` : ''}` : ''}
    <p class="starter">Agents prepare, people approve. An approval here is a record of what a named person said. It is not a signature, not a professional sign-off and not a council decision.</p>
    <div class="sub-h"><h3>More records</h3></div>
    <ul class="morelinks">
      <li><a href="${href(p.id, 's', 'detailed', 'tool')}">${icon('drawings')}<span>Requests for information</span><span class="st">${openRfis(b).length} open</span></a></li>
      <li><a href="${href(p.id, 's', 'contract', 'tool')}">${icon('contract')}<span>Variations register</span><span class="st">${b.variations.length}</span></a></li>
      <li><a href="${href(p.id, 's', 'observation', 'tool')}">${icon('observation')}<span>Site observations</span><span class="st">${b.observations.length}</span></a></li>
      <li><a href="${href(p.id, 's', 'completion', 'tool')}">${icon('completion')}<span>Defects and completion checklist</span><span class="st">${comp.filter((c) => c.status !== 'needed').length}/${comp.length}</span></a></li>
    </ul>`;
}

// ---- settings: the look of the workspace -----------------------------------------------------------------------------------------
function lookState() {
  const practice = store.shared ? account.state.practice : null;
  return { practice, ...pickTheme({ practice, browser: browserLook }) };
}
function settingsView() {
  const { practice, theme, scope } = lookState(), owner = practice?.role === 'owner';
  return `<div class="wrap">
    <section class="hero"><p class="label">Settings</p><h1>How the workspace <span class="accent">looks</span>.</h1></section>
    ${flashHtml()}
    <section class="panel" aria-labelledby="lookh"><h2 id="lookh">Look</h2>
      ${lookChoiceHtml({ theme, scope, canChange: scope === 'browser' || owner, practice: practice?.name ?? '' })}
      <p class="small">${scope === 'practice'
    ? (owner ? `Everyone in ${esc(practice.name)} sees the look chosen here.` : `An owner of ${esc(practice.name)} chooses its look.`)
    : 'Signed out, or with nothing shared, each browser keeps its own look. Signed in with a practice, the practice’s look is used.'} Printing always uses white paper.</p></section>
  </div>`;
}

// ---- the stage screen: produces, tasks, documents, tool, approval --------------------------------------------------------
const TOOL_NAME = { site: 'Site facts', model: 'The model', consent: 'Consent bundle and requests', site_log: 'Site log and variations', close_out: 'Defects and completion' };

function stageView(b, r) {
  const p = b.project, def = stageDef(r.stage), st = b.stages.find((s) => s.key === r.stage), i = STAGE_KEYS.indexOf(r.stage);
  const tasks = b.tasks.filter((t) => t.stage === r.stage), docs = b.documents.filter((d) => d.stage === r.stage);
  const open = tasks.filter((t) => t.status !== 'done').length;
  const missingTasks = missingSourced(b, 'tasks', r.stage), docFiles = docs.map((d) => kept.get(d.file?.id)).filter(Boolean);
  const sec = (n, id, label, extra, body) => `<section class="sec" id="sec-${id}" aria-labelledby="lab-${id}"><p class="lab" id="lab-${id}"><span>${n} ${esc(label)}</span>${extra ? `<span class="n">${esc(extra)}</span>` : ''}</p><div class="body">${body}</div></section>`;
  return frame(b, r, `<article class="sheet">
    <header class="shead"><p class="label">Stage ${i + 1} of 7 · ${esc(statusMark('stage', st.status))}${st.done_at ? ` · ${esc(day(st.done_at))}` : ''}</p><h2>${esc(def.label)}</h2>
      <div class="acts"><button class="link" data-act="print">Print this stage or save it as PDF</button></div></header>
    ${st.status === 'not_started' ? `<p class="notyet">□ To come. ${esc(def.label)} starts when ${esc(STAGES[i - 1].label)} is done. You can plan its tasks and documents now.</p>` : ''}
    ${sec('01', 'produces', 'Produces', '', `<p class="produces">${esc(def.produces)}</p>`)}
    ${sec('02', 'tasks', 'Tasks', tasks.length ? `${open} open of ${tasks.length}` : '', `${listHtml(b, 'task', tasks, { key: r.stage }, { emptyText: 'No tasks in this stage. Add the first one.' })}
      ${tasks.some((t) => t.source_ref) || !missingTasks.length ? '' : `<div class="acts"><button class="btn" data-act="sourced-tasks">Add the ${plural(missingTasks.length, 'sourced task')} for this stage</button><span class="small">This project was made before the lists had sources. Nothing already here is changed.</span></div>`}
      ${sourcesHtml(tasks, 'paper')}
      <p class="starter">Tasks that show a source are assembl’s short wording of what the NZ Institute of Architects publishes about this stage: follow the link for the Institute’s own words. The others are an assembl starter with no source. This is not a full list of an architect’s services: your agreement with the client sets those. Edit the list to suit your practice.</p>`)}
    ${sec('03', 'documents', 'Documents', docs.length ? `${plural(docs.length, 'document')} · ${plural(docFiles.length, 'file')} kept` : '', `${listHtml(b, 'document', docs, { key: r.stage }, { emptyText: 'No documents recorded for this stage. Add the first one.', extra: '<button class="btn" data-act="pick" data-target="doc-new">+ Add a file</button>' })}
      <input type="file" id="doc-file" data-file="doc" hidden /><input type="file" id="doc-new" data-file="doc-new" hidden />
      <p class="starter">${esc(W(p).filesLine(sizeText(store.fileLimit), store.filesPersistent, docFiles.length ? `: ${plural(docFiles.length, 'file')}, ${sizeText(docFiles.reduce((n, f) => n + f.size, 0))} in this stage` : '')) /* [cloud] */}</p>`)}
    ${sec('04', 'tool', TOOL_NAME[def.tool], '', toolHtml(b, def))}
    ${sec('05', 'approval', 'Approval', '', approvalHtml(b, def, st))}
    <p class="paper printed">Printed ${esc(day(new Date().toISOString()))}${me ? ` by ${esc(me)}` : ''} from assembl. architecture operations. ${esc(W(p).record) /* [cloud] */} It does not check a design against any rule, and an approval here is not a signature, a professional sign-off or a council decision.</p>
  </article>`);
}

function toolHtml(b, def) {
  if (def.tool === 'site') return siteTool(b);
  if (def.tool === 'model') return modelTool(b, def);
  const sub = (title, note) => `<div class="sub-h"><h3>${esc(title)}</h3>${note ? `<span class="starter">${esc(note)}</span>` : ''}</div>`;
  if (def.tool === 'consent') {
    // every council's items first, then Auckland Council's, then the practice's own
    const group = (c) => (!c.source_ref ? 2 : c.source_ref.council ? 1 : 0);
    const items = b.checklist.filter((c) => c.list === 'consent').map((c, i) => [c, i]).sort((x, y) => group(x[0]) - group(y[0]) || x[1] - y[1]).map((x) => x[0]);
    const got = items.filter((c) => c.status !== 'needed').length, akl = items.filter((c) => c.source_ref?.council === AUCKLAND), missing = missingSourced(b, 'consent');
    const heads = ['Every council · the Building Act 2004 and the prescribed form', 'Auckland Council only · its residential lodgement checklist. Other councils differ', 'Added by the practice, or not sourced'];
    return `${sub('Consent bundle', `${got} of ${items.length} done or not needed`)}
      ${listHtml(b, 'checklist_item', items, { key: 'consent' }, { addLabel: 'Add item', emptyText: 'The checklist is empty. Add the documents your council asks for.', head: (c) => heads[group(c)] })}
      <div class="acts">${items.some((c) => c.source_ref) || !missing.length ? '' : `<button class="btn" data-act="sourced-consent">Add the ${plural(missing.length, 'sourced item')}</button><span class="small">This project was made before the list had sources. Nothing already here is changed.</span>`}
        ${akl.length ? `<button class="link" data-act="auckland-remove">${ui.confirm === 'auckland' ? `Remove all ${akl.length} for good` : `Not in Auckland? Remove the ${plural(akl.length, 'Auckland Council item')}`}</button>` : ''}</div>
      ${sourcesHtml(items)}
      <p class="starter">${items.some((c) => c.source_ref)
    ? `Items that show a source are from the Building Act 2004, the prescribed application form, the Ministry of Business, Innovation and Employment’s Building Performance guidance, and Auckland Council’s residential lodgement checklist, read ${esc(day(READ_ON))}. The wording is assembl’s: follow each link for the source’s own. Each source says more than is listed here.`
    : 'No item here shows a source.'} Check your council’s current checklist. Other councils differ. This page does not know what your council requires for this job, and it does not lodge anything.</p>
      ${sub('Requests for information', `${openRfis(b).length} open`)}
      ${listHtml(b, 'rfi', [...b.rfis].sort((x, y) => String(y.received_at).localeCompare(String(x.received_at))), { key: 'rfi' }, { addLabel: 'Log a request', emptyText: 'No requests logged. When one arrives, log who asked, what they asked and when.' })}
      <p class="starter">Replies are written by a person here. A reply drafted for you by an agent: Not built yet. Nothing is sent from this page.</p>`;
  }
  if (def.tool === 'site_log') {
    return `${sub('Site observations', plural(b.observations.length, 'visit'))}
      ${listHtml(b, 'observation', [...b.observations].sort((x, y) => String(y.date).localeCompare(String(x.date))), { key: 'observation' }, { addLabel: 'Log an observation', emptyText: 'No site observations yet. Log each visit: the date, who went and what was seen.' })}
      ${sub('Variations register', plural(b.variations.length, 'variation'))}
      ${listHtml(b, 'variation', b.variations, { key: 'variation' }, { emptyText: 'No variations recorded. Add each one as it is raised.' })}
      <p class="starter">One log and one register for the project: Contract administration and Project observation both show them.</p>`;
  }
  const items = b.checklist.filter((c) => c.list === 'completion'), openDefects = b.defects.filter((d) => d.status !== 'closed').length;
  return `${sub('Defects', `${openDefects} not closed`)}
    ${listHtml(b, 'defect', b.defects, { key: 'defect' }, { emptyText: 'No defects listed. Add each one found at the final walk through.' })}
    ${sub('Completion checklist', `${items.filter((c) => c.status !== 'needed').length} of ${items.length} done or not needed`)}
    ${listHtml(b, 'checklist_item', items, { key: 'completion' }, { addLabel: 'Add item', emptyText: 'The checklist is empty. Add what your contract and council ask for at completion.' })}
    <p class="starter">assembl starter, not sourced: no official source has been read for this list. Check it against your contract and your council’s current checklist.</p>`;
}

function siteTool(b) {
  const s = b.project.site ?? {}, facts = s.facts ?? [], has = facts.length > 0;
  const live = answered(facts), off = notConnected(facts), down = noAnswer(facts), cr = credits(facts);
  const where = s.lat != null && s.lon != null ? `${s.lat}, ${s.lon}` : '';
  const fact = (f) => `<li class="fact"><p class="st" style="white-space:normal">■ ${esc(f.truthLabel || 'Live')}${f.asOf ? ` · as of ${esc(day(String(f.asOf).slice(0, 10)))}` : ''}</p><p class="v">${esc(showValue(f))}</p><p class="l">${esc(f.label)}</p>
    <p class="src">${esc(f.source?.name ?? '')}</p>${f.note ? `<details><summary>Note</summary><p>${esc(f.note)}</p></details>` : ''}</li>`;
  const none = (f, word) => `<li class="fact off"><p class="st" style="white-space:normal">□ ${word}</p><p class="l">${esc(f.label)}</p><p class="src">${esc(f.source?.name ?? '')}</p>
    ${f.reason || f.note || f.needs ? `<details><summary>Why</summary><p>${esc(f.reason || f.note)}${f.needs ? ` Needs: ${esc(f.needs)}` : ''}</p></details>` : ''}</li>`;
  const a = s.address, mine = ui.addr.chosen, changing = ui.addr.change || (!a && !mine);
  const chosenPanel = (m, saved) => `<div class="addr-chosen"><p class="st" style="white-space:normal">${saved ? '■ Site address, saved on this project' : '■ Chosen address'}</p>
      <p class="addr-big">${esc(m.address)}</p><p class="addr-where">${esc(placeLine(m))}${m.council && ![m.suburb, m.town].includes(m.council) ? ` · ${esc(m.council)}` : ''}</p><p class="credit">${esc(ADDRESS_CREDIT)}</p>
      <div class="acts">${saved ? `<button class="btn"${ui.busy ? ' disabled' : ''} data-act="addr-again">${ui.busy ? 'Asking the publishers…' : 'Look up the facts again'}</button><button class="link" data-act="addr-change">Change the address</button>`
        : `<button class="btn solid"${ui.busy ? ' disabled' : ''} data-act="addr-use">${ui.busy ? 'Asking the publishers…' : 'Use this site'}</button><button class="link" data-act="addr-cancel">Choose another</button>`}</div></div>`;
  const printed = a ? `<label class="chk"><input type="checkbox" data-addr-print${s.print_address ? ' checked' : ''} /><span>Print the street address in the client pack. Off: the pack says only “${esc(placeLine(a) || 'the suburb and town')}”.</span></label>` : '';
  const coords = `<details class="more-note"${!a && !mine && s.lat != null ? ' open' : ''}><summary>Or enter coordinates</summary>
      <form class="where-f" data-form="facts"><label>Latitude, longitude<input class="mono" name="where" value="${a ? '' : esc(where)}" placeholder="-36.80, 175.08" autocomplete="off" inputmode="text" required /></label>
      <button class="btn"${ui.busy ? ' disabled' : ''}>${ui.busy ? 'Asking the publishers…' : 'Look up'}</button></form>
      <p class="small">A point in New Zealand, latitude first. Entering a point replaces the address.</p></details>`;
  return `${mine ? chosenPanel(mine, false) : a && !changing ? chosenPanel(a, true) : addressBoxHtml({ busy: ui.busy }) + (a ? '<div class="acts"><button class="link" data-act="addr-cancel">Keep the saved address</button></div>' : '')}
    ${printed}
    ${coords}
    <details class="more-note"><summary>Where the address goes</summary><p class="small">What you type is sent to the lab’s address feed, which asks LINZ’s public address list. The point goes to the lab’s site feed, which asks the public maps. Neither feed logs or stores it, apart from a short-lived cache of its answer. The address and point are ${esc(W(b.project).pointSaved) /* [cloud] */}. They are not put in a share link, and the client pack prints only the suburb and town unless you turn the street address on.</p></details>
    ${ui.factsError ? `<p class="flash" role="alert">${esc(ui.factsError)}</p>` : ''}
    ${has ? `<div class="snap-h"><h3>Snapshot of ${esc(dayTime(s.fetched_at))}</h3><span class="st" style="white-space:normal">■ ${plural(live.length, 'fact')} answered${off.length ? ` · □ ${off.length} not connected` : ''}${down.length ? ` · □ ${down.length} no answer` : ''}</span></div>
      <ul class="facts">${live.map(fact).join('')}${down.map((f) => none(f, 'No answer just now')).join('')}${off.map((f) => none(f, 'Not connected')).join('')}</ul>
      <p class="small">What each published map shows at the point, on the date shown. It is not a planning, hazard or Building Code assessment. A point outside a mapped hazard is not proof the site cannot be affected. Most layers cover Auckland only.</p>
      ${cr.length ? `<p class="credit">${cr.map(esc).join(' ')}</p>` : ''}
      <div class="acts"><button class="link" data-act="facts-remove">${ui.confirm === 'facts' ? 'Remove for good' : 'Remove this snapshot, the point and the address'}</button></div>`
      : '<div class="empty"><h3>No site facts saved yet.</h3><p class="small">Choose a site address to save a dated snapshot: land parcel, planning zone and overlays, flood, coast, landslide and liquefaction maps, each with its source and credit.</p></div>'}`;
}

function modelTool(b, def) {
  const p = b.project, m = p.model ?? {}, link = twinLink(m);
  const input = '<input type="file" id="model-file" data-file="model" accept=".json,application/json" hidden />';
  const err = ui.modelError ? `<p class="flash" role="alert">${esc(ui.modelError)}</p>` : '';
  if (!link) return `<div class="empty"><h3>No plan model attached.</h3><p class="small">Attach the plan model file (.json) for this design. The project keeps its name, drawings note, revision and a fingerprint of what it says, and keeps the file itself ${esc(W(p).keptOnly) /* [cloud] */} (up to ${esc(sizeText(store.fileLimit))}), so it can open in 3D from here.${W(p).shared ? '' : ' Nothing is uploaded.'}</p>
    <button class="btn solid" data-act="pick" data-target="model-file">Attach a plan model</button>${input}</div>${err}
    <p class="starter">Reading a plan model out of a PDF happens on the 3D page, not here. <a href="/plan-studio/twins/drop/?drop=1" target="_blank" rel="noopener">Open the 3D page ↗</a></p>`;
  const { stale } = closingApprovals(b, def.key), here = kept.get(m.file?.id), stuck = handoff.fp === m.fingerprint && !!handoff.why;
  const pic = p.sample ? `<figure><img src="${HERO}" alt="A dark-clad house on timber piles among trees." loading="lazy" /><figcaption class="caption">A rendering of the sample plan model. Not a photograph.</figcaption></figure>` : '';
  return `<div class="model${pic ? ' pic' : ''}">${pic}<div style="display:grid;gap:14px;min-width:0">
      <dl class="kv"><dt>File</dt><dd>${esc(m.file_name)}</dd><dt>Drawings</dt><dd>${esc(m.drawings)}</dd><dt>Revision</dt><dd>${esc(m.revision)}</dd><dt>Fingerprint</dt><dd class="fp">${esc(m.fingerprint)}</dd>
        <dt>Kept</dt><dd>${link.direct ? 'The lab hosts this example file, so it is not kept here.' : here ? `<span class="st" style="white-space:normal">■ File kept ${esc(W(p).keptOnly) /* [cloud] */} · ${esc(sizeText(here.size))}</span> <button class="link" data-act="file-get" data-id="${esc(here.id)}">Download</button>` : `<span class="st" style="white-space:normal">□ The file itself is not kept ${esc(W(p).here) /* [cloud] */}</span>`}</dd></dl>
      <div class="acts">${open3dHtml(p, link)}<button class="btn" data-act="pick" data-target="model-file">Replace the file</button>
        <button class="link" data-act="model-remove">${ui.confirm === 'model' ? 'Remove for good' : 'Remove'}</button>${input}</div>
      ${link.direct ? '<p class="small">Opens this model on the 3D page: walk through it, change the sun, take stills.</p>'
        : link.handoff && !stuck ? `<p class="small">Opens this model on the 3D page in a new tab, with no second choosing. ${esc(W(p).passAcross) /* [cloud] */}</p>`
        : `<p class="small">□ ${stuck ? esc(handoff.why) : here ? '' : 'The file is not kept here, so it cannot be passed across.'} The 3D page will ask for a file: choose <b style="font-weight:500">${esc(m.file_name)}</b> again there.${here ? '' : ' Replace the file here to keep it and open it straight from this page.'}</p>`}
      ${err}${stale.length ? `<p class="flash">□ An approval for this stage was recorded on an earlier version (${esc(stale[stale.length - 1].fingerprint || 'no model')}). It does not carry over to this one.</p>` : ''}
      <p class="starter">The fingerprint is a short code for what the model says. If the model changes, the code changes, so an approval always names the version it was made on. Concept design and Developed design share this one model.</p>
    </div></div>`;
}

function approvalRecord(a, b, def) {
  const fp = b.project.model?.fingerprint ?? '';
  const version = def.tool === 'model' ? `<p class="st" style="white-space:normal">${(a.fingerprint ?? '') === fp ? '■ This version' : '□ An earlier version'}${a.fingerprint ? ` (${esc(a.fingerprint)})` : ''}</p>` : '';
  return `<div class="record">${version}<p class="by">${esc(a.who)}, ${esc(a.role)}</p><p class="q">“${esc(a.what)}”</p>${a.note ? `<p class="small">Note: ${esc(a.note)}</p>` : ''}
    <p class="when">${esc(dayTime(a.at))}${a.fingerprint && def.tool !== 'model' ? ` · model version ${esc(a.fingerprint)}` : ''}</p></div>`;
}

function approvalHtml(b, def, st) {
  const { valid, stale } = closingApprovals(b, def.key), g = gate(b, def.key), i = STAGE_KEYS.indexOf(def.key);
  const open = b.tasks.filter((t) => t.stage === def.key && t.status !== 'done').length;
  const at = st.status === 'done' ? 3 : st.status === 'not_started' ? -1 : g.ok ? 2 : st.status === 'awaiting_approval' ? 1 : 0;
  const step = (n, text) => `<li class="${at === n && st.status !== 'done' ? 'on' : ''}">${at > n || st.status === 'done' ? '■' : '□'} ${n + 1}. ${text}</li>`;
  const steps = `<ol class="steps">${step(0, 'The work is ready')}${step(1, 'A named person approves')}${step(2, 'The stage is marked done')}</ol>`;
  const standing = '<p class="starter">Agents prepare, people approve. This is a record of who said yes, to what, and when. It is not a signature, not a professional sign-off and not a council decision.</p>';
  const records = [...valid, ...stale].map((a) => approvalRecord(a, b, def)).join('');
  if (st.status === 'not_started') return `${steps}<p>${esc(def.label)} has not started. It starts when ${esc(STAGES[i - 1].label)} is done.</p>${standing}`;
  if (st.status === 'done') return `${steps}<p class="st">■ Done · ${esc(dayTime(st.done_at))}</p>${records}${standing}`;
  if (g.ok) return `${steps}${records}<div class="acts"><button class="btn solid" data-act="done">Mark ${esc(def.label)} done</button>${i < 6 ? `<span class="small">${esc(STAGES[i + 1].label)} starts when you do.</span>` : ''}</div>${standing}`;
  if (st.status === 'in_progress') return `${steps}
    <p>${open ? `${plural(open, 'task')} still open in this stage. You can ask for approval when the work is ready.` : 'The tasks are done. Ask a named person to approve the stage.'}</p>
    ${records}<div class="acts"><button class="btn solid" data-act="ask">Ask for approval</button></div>${standing}`;
  return `${steps}<p class="say-what">“${esc(closingStatement(def.key))}”</p>${stale.length ? `<p class="flash">□ ${esc(g.reason)}</p>` : ''}${records}
    <form class="f appr" data-form="approve"><label>Name of the person approving<input name="who" required minlength="2" maxlength="80" autocomplete="off" /></label>
      <label>Role<select name="role">${ROLES.map((x) => `<option>${esc(x)}</option>`).join('')}</select></label>
      <label class="wide">Note<input name="note" maxlength="300" placeholder="optional: how they said it, or any condition" /></label>
      <div class="f-act"><button class="btn solid">Record approval</button><button type="button" class="link" data-act="back">Not ready: back to in progress</button></div></form>
    ${hasModel(b) ? `<p class="small">Recorded against model version <span class="mono">${esc(b.project.model.fingerprint)}</span>.</p>` : ''}${standing}`;
}

// ---- client pack -------------------------------------------------------------------------------------------------------------
function packView(b) {
  const p = b.project, s = p.site ?? {}, facts = s.facts ?? [], live = answered(facts), off = [...notConnected(facts), ...noAnswer(facts)], cr = credits(facts), link = twinLink(p.model);
  const url = link?.direct ? new URL(link.href, location.origin).href : '';
  const sec = (label, body) => `<section class="pack-sec"><p class="lab">${esc(label)}</p><div class="body">${body}</div></section>`;
  const approvals = [...b.approvals].sort((x, y) => String(x.at).localeCompare(String(y.at)));
  return `<div class="wrap">
    <div class="pack-bar"><a class="btn" href="${href(p.id)}">← Back to the project</a><button class="btn solid" data-act="print">Print or save as PDF</button></div>
    ${flashHtml()}
    <article class="pack">
      <header class="pack-head"><p class="label">Client pack ${p.sample ? '<span class="tag">Sample</span>' : ''}</p><h1>${esc(p.name)}</h1>
        <p>${p.sample ? 'A sample project. No client is named.' : p.client ? `Prepared for ${esc(p.client)}` : 'No client named'}</p>
        <div style="display:grid;gap:8px">${miniRail(b.stages)}<p class="st" style="white-space:normal">${esc(whereLine(b.stages))}</p></div>
        <p class="when">Prepared ${esc(day(new Date().toISOString()))}${me ? ` by ${esc(me)}` : ''}</p></header>
      ${sec('Site facts', live.length ? `${packPlace(s) ? `<p class="site-place">Site: ${esc(packPlace(s))}</p>` : ''}<h3>What the published maps show, as fetched ${esc(dayTime(s.fetched_at))}</h3>
        <ul class="pack-facts">${live.map((f) => `<li><div><p>${esc(f.label)}</p><p class="src">${esc(f.source?.name ?? '')}${f.asOf ? ` · as of ${esc(day(String(f.asOf).slice(0, 10)))}` : ''}</p></div><p class="v">${esc(showValue(f))}</p></li>`).join('')}</ul>
        ${off.length ? `<p class="small">□ Not connected or no answer: ${off.map((f) => esc(f.label)).join('; ')}.</p>` : ''}
        <p class="small">These are facts to read, not a planning, hazard or Building Code assessment. A point outside a mapped hazard is not proof the site cannot be affected. The point looked up is not printed here${s.address ? (s.print_address ? ', and the street address is printed because this project’s setting says so' : ', and the street address is not printed: only the suburb and town') : ''}.</p>
        ${[...cr, ...(s.address ? [ADDRESS_CREDIT] : [])].length ? `<p class="credit">${[...cr, ...(s.address ? [ADDRESS_CREDIT] : [])].map(esc).join(' ')}</p>` : ''}` : '<p>□ No site facts have been saved for this project yet.</p>')}
      ${sec('3D model', link ? `${p.sample ? `<figure><img src="${HERO}" alt="A dark-clad house on timber piles among trees." style="border:1px solid var(--line);width:100%;max-width:520px;aspect-ratio:16/10;object-fit:cover" /><figcaption class="caption" style="margin-top:6px">A rendering of the sample plan model. Not a photograph.</figcaption></figure>` : ''}
        <dl class="kv"><dt>Drawings</dt><dd>${esc(p.model.drawings)}</dd><dt>Revision</dt><dd>${esc(p.model.revision)}</dd><dt>Version</dt><dd class="fp">${esc(p.model.fingerprint)}</dd></dl>
        ${link.direct ? `<div class="acts"><a class="btn solid" href="${esc(link.href)}" target="_blank" rel="noopener">Open the 3D model ↗</a></div><p class="url">${esc(url)}</p>`
          : `<p class="small">The model is a file held by the practice (${esc(p.model.file_name)}). A link the client can open for a practice’s own model: Not built yet. On the 3D page, Share makes a link once the file is open there.</p>`}
        <p class="small">The 3D model shows the design in the drawings named above. It is not a survey.</p>` : '<p>□ No plan model has been attached yet.</p>')}
      ${sec('Approvals so far', `${approvals.length ? approvals.map((a) => `<div class="record"><p class="st" style="white-space:normal">${esc(stageDef(a.stage)?.label ?? a.stage)}</p><p class="by">${esc(a.who)}, ${esc(a.role)}</p><p class="q">“${esc(a.what)}”</p>${a.note ? `<p class="small">Note: ${esc(a.note)}</p>` : ''}
          <p class="when">${esc(dayTime(a.at))}${a.fingerprint ? ` · model version ${esc(a.fingerprint)}` : ''}</p></div>`).join('') : '<p>□ No approvals have been recorded yet.</p>'}
        <p class="small">A record of what named people said, ${esc(W(p).approvalsNote) /* [cloud] */}. It is not a signature, not a professional sign-off and not a council decision.</p>`)}
    </article></div>`;
}

// ---- drawing the page ----------------------------------------------------------------------------------------------------------
let lastRoute = '';
async function render(fromLink = false) {
  const r = route(), key = JSON.stringify([r.view, r.pid, r.stage, r.name, r.rest]);
  for (const stop of cleanups.splice(0)) { try { stop(); } catch { /* an add-on that fails to tidy up does not stop the page */ } }
  const moved = key !== lastRoute;
  if (moved) { ui.adding = ui.editing = ui.confirm = null; ui.addr = { chosen: null, change: false }; ui.factsError = ui.modelError = ''; ui.allActivity = false; ui.exporting = false; }
  showLook();
  let html, onScreen = null;
  try { // [cloud] the shared records can fail to answer; this browser's own store never does
    if (r.view === 'projects') { shown = null; html = await projectsView(); }
    else if (r.view === 'settings') { shown = null; html = settingsView(); }
    else if (r.view === 'module') { shown = null; html = `<div class="wrap mod-screen" data-mod-screen="${esc(r.name)}"></div>`; }
    else {
      const b = await store.loadProject(r.pid);
      kept = new Map((b ? await store.listFiles({ project_id: r.pid }) : []).map((f) => [f.id, f]));
      onScreen = shown = b?.project ?? null;
      if (!b) html = `<div class="wrap"><div class="empty" style="margin-top:32px"><h3>${esc(W().missingTitle)}</h3><p>${esc(W().missingText)}</p><a class="btn solid" href="#/">All projects</a></div></div>`;
      else html = r.view === 'pack' ? packView(b) : r.view === 'stage' ? stageView(b, r) : dashView(b, r);
    }
  } catch (err) { html = account.troubleHtml(err); }
  const y = window.scrollY;
  $app.innerHTML = html;
  account.afterRender($app); // [cloud] for a viewer of shared records: take away what they cannot do
  await drawAddons(r, onScreen);
  if ($app.querySelector('[data-addr]')) cleanups.push(mountAddressBox($app, { onPick: (m) => { ui.addr.chosen = m; ui.factsError = ''; ui.focus = '[data-act="addr-use"]'; redraw(''); } })); // the Site tab's address box
  $truth.innerHTML = account.truthHtml(store.persistent); // [cloud] browser only / signed in and shared with a practice / not switched on yet
  document.title = r.view === 'projects' ? 'Architecture operations · assembl.' : r.view === 'settings' ? 'Settings · assembl.' : `${$app.querySelector('h1')?.textContent ?? 'Project'} · assembl.`;
  markBar(r);
  const target = (moved || fromLink) && r.section ? document.getElementById(`sec-${r.section}`) : null;
  if (target) target.scrollIntoView({ block: 'start' });
  else if (moved) window.scrollTo(0, 0);
  else window.scrollTo(0, y);
  if (moved) lastRoute = key;
  if (ui.focus) { const el = $app.querySelector(ui.focus); ui.focus = null; if (el) el.focus({ preventScroll: false }); }
  if (moved) ui.flash = ''; // a message is shown once, on the screen it belongs to
  // get the kept model ready for the 3D page now, so pressing Open in 3D is an ordinary link
  if (onScreen) ready3d(onScreen).then((ok) => { if (!ok && handoff.why && !handoff.told) { handoff.told = true; render(false); } });
  // a kept model attached before covers were drawn: work out its plan once, in this browser, and draw it
  if (onScreen) learnOutline(onScreen).then((got) => { if (got) render(false); });
  if (r.view === 'projects' && ui.learn?.length) {
    const list = ui.learn.splice(0);
    (async () => { let got = false; for (const p of list) got = (await learnOutline(p)) || got; if (got && route().view === 'projects') render(false); })();
  }
}

/** Show the look in use: the practice's when a practice is in use, otherwise this browser's (theme.js). */
function showLook() { return applyTheme(document, lookState().theme, storage); }

/** the top bar: which link is the screen on show, and an icon for any add-on link that brings none */
function markBar(r) {
  const on = { projects: ['projects', 'dash', 'stage', 'pack'].includes(r.view), settings: r.view === 'settings' };
  for (const a of document.querySelectorAll('.bar [data-core]')) { if (on[a.dataset.core]) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
  for (const a of $mods?.querySelectorAll('a[data-nav]') ?? []) if (!a.querySelector('.nav-ic')) a.insertAdjacentHTML('afterbegin', `<span class="nav-ic" aria-hidden="true">${icon(NAV_ICON[a.dataset.nav] ?? 'addon')}</span>`);
}

/** Read a kept model file once to draw its plan, when the project has no outline yet. Kept as a setting in this browser. */
async function learnOutline(p) {
  const m = p?.model;
  if (!m?.fingerprint || !m.file?.id || outlineFor(m, outlines)) return false;
  try {
    const f = await store.getFile(m.file.id);
    const o = f ? planOutline(JSON.parse(new TextDecoder().decode(f.data))) : null;
    if (!o) return false;
    const keys = Object.keys(outlines).filter((k) => k !== m.fingerprint).slice(-39); // keep the last forty
    outlines = { ...Object.fromEntries(keys.map((k) => [k, outlines[k]])), [m.fingerprint]: o };
    await store.save('setting', { id: 'outlines', value: outlines });
    return true;
  } catch { return false; } // no drawing: the cover says a model is attached
}

/** the project page's tabs: show one, keep it in the address without drawing the page again */
function selectTab(key, focus = false) {
  const list = $app.querySelector('[role="tablist"]');
  if (!list || !TAB_KEYS.includes(key)) return;
  for (const t of list.querySelectorAll('[role="tab"]')) { const on = t.dataset.tab === key; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); }
  for (const pn of $app.querySelectorAll('[role="tabpanel"]')) pn.hidden = pn.id !== `tp-${key}`;
  const r = route();
  if (r.pid) { ui.tabs[r.pid] = key; try { history.replaceState(history.state, '', href(r.pid, 't', key)); } catch { /* the address keeps the old tab */ } }
  window.dispatchEvent(new Event('resize')); // an add-on's view that was in a hidden tab can measure itself again
}

/** the add-ons: the top-bar links, an add-on screen, and the add-on sections on a project page */
async function drawAddons(r, project) {
  if ($mods) {
    const items = navItems();
    $mods.hidden = !items.length;
    $mods.innerHTML = items.map((n) => `<a href="${esc(n.hash)}" data-nav="${esc(n.id)}"${location.hash.startsWith(n.hash) ? ' aria-current="page"' : ''}>${n.icon ? `<span class="nav-ic" aria-hidden="true">${n.icon}</span>` : ''}<span>${esc(n.label)}</span></a>`).join('');
  }
  const ctx = { store, account, me, project: project ?? null, practice: account.state?.practice ?? null, navigate: (h) => { location.hash = h; }, redraw, esc };
  const mount = async (el, fn, ...args) => {
    try { const stop = await fn(el, ctx, ...args); if (typeof stop === 'function') cleanups.push(stop); }
    catch (err) { el.innerHTML = `<p class="small">□ This part could not open: ${esc(err.message)}</p>`; }
  };
  if (r.view === 'module') {
    const mod = getRoute(r.name), el = $app.querySelector('[data-mod-screen]');
    if (mod && el) { document.title = `${mod.title} · assembl.`; await mount(el, mod.render, r.rest); }
    return;
  }
  if (r.view !== 'dash' || !project) return;
  const panels = projectPanels();
  if (!panels.length) return;
  const host = $app.querySelector('[data-mod-panels]') ?? $app.querySelector('article') ?? $app.querySelector('.wrap') ?? $app;
  for (const pn of panels) {
    const sec = document.createElement('section');
    sec.className = 'mod-panel'; sec.dataset.panel = pn.id; sec.setAttribute('aria-label', pn.title);
    host.append(sec);
    await mount(sec, pn.render);
  }
}

/** Put the kept plan model where the 3D page looks for a dropped plan. True when it is ready to open there. */
async function ready3d(p, again = false) {
  const m = p?.model;
  if (!m?.file?.id || !twinLink(m)?.handoff) return false;
  if (handoff.fp === m.fingerprint && handoff.pid === p.id && (handoff.ok || (handoff.why && !again))) return handoff.ok;
  handoff.fp = m.fingerprint; handoff.pid = p.id; handoff.ok = false; handoff.why = ''; handoff.told = false;
  try {
    const f = await store.getFile(m.file.id);
    if (!f) throw new Error(`The model file is not ${W(p).here}.`); // [cloud] in the shared store, it is read from the shared records
    const h = twinHandoff(new TextDecoder().decode(f.data), m.file_name);
    sessionHandoff(h.key, h.value);
    handoff.ok = true;
  } catch (err) { handoff.why = err.message; }
  return handoff.ok;
}
const redraw = (flash) => { if (flash !== undefined) ui.flash = flash; return render(false); };

function download(name, data, type = 'application/json') {
  const a = document.createElement('a'), url = URL.createObjectURL(new Blob([data], { type: type || 'application/octet-stream' }));
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ---- what happens when something is pressed -------------------------------------------------------------------------------------
const formData = (form) => Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, String(v).trim()]));

async function onSubmit(e) {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const r = route(), d = formData(form), what = form.dataset.form;
  try {
    if (what === 'run-add' || what === 'run-new') {
      const h = incoming();
      if (!h || h.error) return redraw(h?.error ?? 'The report from the 3D page is no longer here: send it again from there.');
      let pid = d.pid;
      if (what === 'run-new') {
        const b = newProject({ name: d.name });
        b.activity.push(activity(b.project.id, me, 'Project created', b.project.name));
        pid = (await store.saveProject(b)) || b.project.id; // [cloud] the id the store keeps it under
      }
      const got = await addRun(pid, h);
      ui.flash = got.flash;
      location.hash = href(pid, 's', got.stage, 'documents');
      return;
    }
    if (what === 'new-project') {
      const b = newProject({ name: d.name, client: d.client });
      b.activity.push(activity(b.project.id, me, 'Project created', b.project.name));
      const id = await store.saveProject(b);
      location.hash = href(id || b.project.id); // [cloud] the id the store keeps it under (the shared records use database ids)
      return;
    }
    if (what === 'add' || what === 'edit') {
      const kind = form.dataset.kind, K = KIND[kind];
      const old = what === 'edit' ? await store.get(kind, form.dataset.id) : null;
      const row = old ?? { id: newId(kind[0]), project_id: r.pid };
      const missing = K.fields.find((f) => f.req && !d[f.name]);
      if (missing) return redraw(`Fill in “${missing.label}” first.`);
      for (const f of K.fields) row[f.name] = d[f.name] ?? '';
      if (!old) {
        if (kind === 'task' || kind === 'checklist_item') row.origin = 'practice';
        if (K.status) row.status = K.first;
        if (kind === 'task' || kind === 'document') row.stage = r.stage;
        if (kind === 'checklist_item') { row.list = form.dataset.ctx; row.stage = row.list === 'consent' ? 'detailed' : 'completion'; }
        if (kind === 'rfi') row.sent_at = '';
      }
      // a reply written on an open request makes it drafted: that is what the word means
      if (kind === 'rfi' && row.response && row.status === 'open') row.status = 'drafted';
      await store.save(kind, row);
      await log(r.pid, `${old ? 'Changed' : 'Added'} ${K.noun}`, K.main(row));
      ui.adding = ui.editing = ui.confirm = null;
      return redraw('');
    }
    if (what === 'approve') {
      const b = await store.loadProject(r.pid), a = recordApproval(b, r.stage, d);
      await store.saveProject(b);
      await log(r.pid, 'Approval recorded', `${a.who}, ${a.role}: ${stageDef(r.stage).label}${a.fingerprint ? `, model version ${a.fingerprint}` : ''}`);
      ui.focus = '[data-act="done"]';
      return redraw(`Approval recorded: ${a.who}, ${a.role}.`);
    }
    if (what === 'facts') {
      const where = parseWhere(d.where);
      if (!where) { ui.factsError = 'That is not a point in New Zealand. Use decimal degrees, latitude first: -36.80, 175.08'; return redraw(); }
      ui.busy = true; ui.factsError = ''; await redraw();
      try {
        const got = await fetchSiteFacts(where);
        const p = await store.get('project', r.pid);
        p.site = { lat: where.lat, lon: where.lon, facts: got.facts, fetched_at: got.fetched_at }; // a typed point replaces any address: it would no longer match
        await store.save('project', p);
        await log(r.pid, 'Site facts saved', `${plural(answered(got.facts).length, 'fact')} answered, snapshot of ${dayTime(got.fetched_at)}`);
        ui.busy = false;
        return redraw(`Saved to this project: ${plural(answered(got.facts).length, 'fact')} answered, as a snapshot of ${dayTime(got.fetched_at)}.`);
      } catch (err) {
        ui.busy = false; ui.factsError = `Site facts could not be fetched (${err.message}). Nothing is shown rather than a guess.`;
        return redraw();
      }
    }
  } catch (err) {
    return redraw(err.message);
  }
}

async function onClick(e) {
  const tab = e.target.closest('[role="tab"][data-tab]');
  if (tab) return selectTab(tab.dataset.tab);
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act, r = route();
  // anything that deletes asks twice: the second press on the same button does it
  const twice = (key) => { if (ui.confirm === key) { ui.confirm = null; return true; } ui.confirm = key; redraw(); return false; };
  try {
    if (act === 'pick') return document.getElementById(el.dataset.target)?.click();
    if (act === 'add') { ui.adding = el.dataset.key; ui.editing = null; ui.focus = '.addbox input, .addbox textarea'; return redraw(''); }
    if (act === 'edit') { ui.editing = el.dataset.id; ui.adding = null; ui.confirm = null; ui.focus = '.rowi.editing input, .rowi.editing textarea'; return redraw(''); }
    if (act === 'cancel') { ui.adding = ui.editing = ui.confirm = null; return redraw(''); }
    if (act === 'remove') {
      if (!twice(el.dataset.id)) return;
      const kind = el.dataset.kind, row = await store.get(kind, el.dataset.id);
      await store.remove(kind, el.dataset.id);
      if (kind === 'document' && row?.file?.id) await store.removeFile(row.file.id);
      if (kind === 'document') for (const c of await store.list('checklist_item', { project_id: r.pid })) if (c.document_id === el.dataset.id) await store.save('checklist_item', { ...c, document_id: '' });
      await log(r.pid, `Removed ${KIND[kind].noun}`, row ? KIND[kind].main(row) : '');
      ui.editing = null;
      return redraw('');
    }
    if (act === 'project-remove') {
      if (!twice(el.dataset.id)) return;
      const p = await store.get('project', el.dataset.id);
      await store.removeProject(el.dataset.id);
      return redraw(`Removed “${p?.name ?? 'project'}” ${W(p).from /* [cloud] */}.`);
    }
    if (act === 'run-dismiss') { try { globalThis.sessionStorage?.removeItem(PLAN_RUN_KEY); } catch { /* fine */ } return redraw('The report from the 3D page was not added. Send it again from there when you want it.'); }
    if (act === 'sample') { await store.saveProject(sampleProject()); return redraw('The sample project is back.'); }
    if (act === 'export') { ui.exporting = !ui.exporting; ui.focus = ui.exporting ? '.exportbox .btn' : null; return redraw(''); }
    if (act === 'export-cancel') { ui.exporting = false; ui.focus = '[data-act="export"]'; return redraw(''); }
    if (act === 'export-go') {
      const withFiles = el.dataset.files === '1', here = kept.size;
      const f = await store.exportProject(r.pid, undefined, { files: withFiles });
      download(f.file_name, f.text);
      const said = f.files_included ? `Files are included: ${plural(f.file_count, 'file')}, ${sizeText(f.file_bytes)}.${f.files_missing ? ` ${plural(f.files_missing, 'file')} could not be found ${W(shown).here} and ${f.files_missing === 1 ? 'is' : 'are'} not in it.` : ''}` : here ? `Files are not included: the ${plural(here, 'file')} stay ${W(shown).keptOnly}.` : 'There were no files to include.';
      // [cloud] the file is downloaded either way; the log entry can still be refused (a viewer cannot add to the activity log)
      const unlogged = await log(r.pid, 'Project exported', `${f.file_name}. ${said}`).then(() => '', (err) => (err?.code === 'read_only' ? ' This export is not in the activity log: viewers cannot add to it.' : ' This export is not in the activity log: the entry could not be saved.'));
      ui.exporting = false;
      return redraw(`Exported ${f.file_name}. It holds the project’s records, including the site point and address if they are saved. ${said}${unlogged}`);
    }
    // ---- files ----
    if (act === 'file-pick') { ui.fileFor = el.dataset.id; return document.getElementById('doc-file')?.click(); }
    if (act === 'file-get') {
      const f = await store.getFile(el.dataset.id);
      if (!f) return redraw(`That file is not ${W(shown).here}.`); // [cloud]
      return download(f.name, f.data, f.type);
    }
    if (act === 'file-remove') {
      if (!twice(`file:${el.dataset.id}`)) return;
      const d = await store.get('document', el.dataset.id);
      if (d?.file?.id) await store.removeFile(d.file.id);
      if (d) { const name = d.file?.name ?? ''; d.file = null; await store.save('document', d); await log(r.pid, 'File removed', `${name} from ${d.title}`); }
      return redraw('');
    }
    // ---- sourced lists, for a project made before the lists had sources ----
    if (act === 'sourced-consent' || act === 'sourced-tasks') {
      const b = await store.loadProject(r.pid), consent = act === 'sourced-consent';
      const add = missingSourced(b, consent ? 'consent' : 'tasks', r.stage);
      // [cloud] one save for all of them: in the shared records that is one write, so they arrive together or not at all
      if (consent) b.checklist.push(...add.map((x) => consentRow(r.pid, x))); else b.tasks.push(...add.map((x) => taskRow(r.pid, r.stage, x)));
      await store.saveProject(b);
      await log(r.pid, consent ? 'Sourced consent items added' : 'Sourced tasks added', consent ? plural(add.length, 'item') : `${plural(add.length, 'task')}, ${stageDef(r.stage).label}`);
      return redraw(`Added ${plural(add.length, consent ? 'sourced item' : 'sourced task')}. Nothing that was already here was changed.`);
    }
    if (act === 'auckland-remove') {
      if (!twice('auckland')) return;
      const b = await store.loadProject(r.pid), rows = b.checklist.filter((c) => c.list === 'consent' && c.source_ref?.council === AUCKLAND);
      b.checklist = b.checklist.filter((c) => !rows.includes(c)); // [cloud] one save: in the shared records that is one write
      await store.saveProject(b);
      await log(r.pid, 'Auckland Council items removed', plural(rows.length, 'item'));
      return redraw(`Removed ${plural(rows.length, 'Auckland Council item')}. Add what your own council’s checklist asks for.`);
    }
    // ---- Open in 3D for a kept model: an ordinary link once the model is ready; otherwise make it ready, then go ----
    if (act === 'open-3d') {
      if (handoff.ok && handoff.pid === (shown?.id ?? r.pid)) return; // ready: the link opens a new tab, which starts with this tab's copy of the model ([cloud] the project's own id: the address can carry the page's id for it)
      e.preventDefault(); // not ready yet (or it failed before): make it ready, then open the 3D page in this tab
      const go = el.getAttribute('href');
      if (await ready3d(await store.get('project', r.pid), true)) { location.assign(go); return; }
      return redraw(`${handoff.why} The 3D page will ask for a file: choose it again there.`);
    }
    if (act === 'print') return window.print();
    if (act === 'activity-more') { ui.allActivity = !ui.allActivity; return redraw(); }
    if (act === 'ask' || act === 'back' || act === 'done') {
      const b = await store.loadProject(r.pid), label = stageDef(r.stage).label;
      if (act === 'ask') { askForApproval(b, r.stage); await store.saveProject(b); await log(r.pid, 'Asked for approval', label); ui.focus = 'form[data-form="approve"] input[name="who"]'; return redraw(''); }
      if (act === 'back') { backToWork(b, r.stage); await store.saveProject(b); await log(r.pid, 'Back to in progress', label); return redraw(''); }
      const done = markDone(b, r.stage);
      await store.saveProject(b);
      await log(r.pid, 'Stage done', done.next ? `${label}. ${stageDef(done.next.key).label} started.` : `${label}. All seven stages are done.`);
      ui.flash = done.next ? `${label} is done. ${stageDef(done.next.key).label} has started.` : `${label} is done. All seven stages are done.`;
      location.hash = href(r.pid);
      return;
    }
    if (act === 'addr-use' || act === 'addr-again') {
      if (ui.busy) return;
      const p0 = await store.get('project', r.pid), m = act === 'addr-use' ? ui.addr.chosen : p0?.site?.address && p0.site.lat != null ? { ...p0.site.address, lat: p0.site.lat, lon: p0.site.lon } : null;
      if (!m) return redraw('');
      const where = parseWhere(`${m.lat}, ${m.lon}`);
      if (!where) { ui.factsError = 'That address has no point in New Zealand, so nothing was saved. Choose another, or enter coordinates.'; return redraw(); }
      ui.busy = true; ui.factsError = ''; await redraw();
      try {
        const got = await fetchSiteFacts(where);
        const p = await store.get('project', r.pid);
        p.site = { lat: where.lat, lon: where.lon, facts: got.facts, fetched_at: got.fetched_at, address: keptAddress(m), ...(p.site?.print_address ? { print_address: true } : {}) };
        await store.save('project', p);
        await log(r.pid, 'Site set from a street address', `${plural(answered(got.facts).length, 'fact')} answered, snapshot of ${dayTime(got.fetched_at)}`);
        ui.busy = false; ui.addr = { chosen: null, change: false };
        return redraw(`Saved to this project: the site address and ${plural(answered(got.facts).length, 'fact')} answered, as a snapshot of ${dayTime(got.fetched_at)}.`);
      } catch (err) {
        ui.busy = false; ui.factsError = `Site facts could not be fetched (${err.message}). Nothing was saved and nothing is shown rather than a guess.`;
        return redraw();
      }
    }
    if (act === 'addr-change') { ui.addr = { chosen: null, change: true }; ui.focus = '#addr-in'; return redraw(''); }
    if (act === 'addr-cancel') { ui.addr = { chosen: null, change: false }; ui.focus = '#addr-in'; return redraw(''); }
    if (act === 'facts-remove') {
      if (!twice('facts')) return;
      const p = await store.get('project', r.pid);
      p.site = { lat: null, lon: null, facts: [], fetched_at: null };
      await store.save('project', p); await log(r.pid, 'Site facts removed', '');
      return redraw('');
    }
    if (act === 'model-remove') {
      if (!twice('model')) return;
      const p = await store.get('project', r.pid);
      if (p.model?.file?.id) await store.removeFile(p.model.file.id);
      p.model = { fingerprint: '', drawings: '', revision: '', file_name: '', file: null };
      await store.save('project', p); await log(r.pid, 'Model removed', '');
      return redraw('');
    }
  } catch (err) {
    return redraw(err.message);
  }
}

async function onChange(e) {
  const el = e.target, r = route();
  try {
    if (el.matches('select[data-status]')) {
      const kind = el.dataset.status, row = await store.get(kind, el.dataset.id);
      if (!row) return;
      row.status = el.value;
      if (kind === 'rfi' && row.status === 'sent' && !row.sent_at) row.sent_at = today();
      await store.save(kind, row);
      await log(r.pid, `${KIND[kind].noun[0].toUpperCase()}${KIND[kind].noun.slice(1)} ${statusWord(KIND[kind].status, row.status).toLowerCase()}`, KIND[kind].main(row));
      ui.focus = `select[data-id="${CSS.escape(row.id)}"]`;
      return redraw('');
    }
    if (el.matches('input[data-addr-print]')) {
      const p = await store.get('project', r.pid);
      if (!p?.site?.address) return;
      p.site = { ...p.site, print_address: el.checked };
      await store.save('project', p);
      await log(r.pid, el.checked ? 'Street address set to print in the client pack' : 'Street address set not to print in the client pack', '');
      ui.focus = 'input[data-addr-print]';
      return redraw(el.checked ? 'The client pack will print the street address.' : 'The client pack will print only the suburb and town.');
    }
    if (el.matches('input[data-file]')) {
      const file = el.files?.[0], what = el.dataset.file;
      if (!file) return;
      // a file for a document: kept where the project is kept (this browser, or the shared records), with the record saying which file it is
      if (what === 'doc' || what === 'doc-new') {
        el.value = '';
        let d = what === 'doc' ? await store.get('document', ui.fileFor) : null;
        ui.fileFor = null;
        if (what === 'doc' && !d) return redraw('That document is no longer here.');
        if (file.size > store.fileLimit) return redraw(`“${file.name}” is ${sizeText(file.size)}. The limit is ${sizeText(store.fileLimit)} a file${W(shown).limitWhy /* [cloud] */}. Keep the file where it is and record where.`);
        const fresh = !d;
        if (fresh) d = { id: newId('d'), project_id: r.pid, stage: r.stage ?? (STAGE_KEYS.includes(el.dataset.stage) ? el.dataset.stage : 'predesign'), title: file.name.replace(/\.[^.]+$/, '') || file.name, kind: '', version: '', date: '', source: '', note: '' };
        const before = d.file?.id ?? '';
        // keep the new file first: if the browser refuses, the document and any file it had are left as they were
        const meta = await store.putFile({ project_id: r.pid, owner_kind: 'document', owner_id: d.id, name: file.name, type: file.type, data: await file.arrayBuffer() });
        d.file = { id: meta.id, name: meta.name, type: meta.type, size: meta.size, kept_at: meta.kept_at };
        await store.save('document', d);
        if (before) await store.removeFile(before);
        await log(r.pid, fresh ? 'Added document' : before ? 'File replaced' : 'File attached', `${meta.name}, ${sizeText(meta.size)}${fresh ? '' : `: ${d.title}`}`);
        return redraw(`${before ? 'Replaced with' : 'Kept'} “${meta.name}”, ${sizeText(meta.size)}, ${W(shown).keptOnly /* [cloud] */}.${store.filesPersistent ? '' : ' This browser is not keeping files past this tab: export with the files to keep it.'}`);
      }
      const text = await file.text();
      el.value = '';
      if (what === 'import') {
        const got = await store.importProject(text);
        const p = await store.get('project', got.project_id);
        const docs = await store.list('document', { project_id: got.project_id }), named = docs.filter((d) => d.file?.id).length + (p.model?.file?.id ? 1 : 0);
        const said = 'files' in got ? ` ${plural(got.files, 'file')} came with it.${got.files_failed ? ` ${plural(got.files_failed, 'file')} could not be kept ${W(p).here /* [cloud] */}.` : ''}` : named ? ` The project file did not include its ${plural(named, 'file')}: they are still where the project was exported from.` : '';
        await log(got.project_id, 'Project imported', `${file.name}${got.copied ? ' (as a copy: the project already here was left as it was)' : ''}.${said}`);
        return redraw(`${got.copied ? `Imported as “${p.name}”. The project already ${W(p).here /* [cloud] */} was left as it was.` : `Imported “${p.name}”.`}${said}`);
      }
      ui.modelError = '';
      let m;
      try { m = describeModel(text, file.name); } catch (err) { ui.modelError = err.message; return redraw(); }
      const p = await store.get('project', r.pid), before = p.model?.fingerprint ?? '', oldFile = p.model?.file?.id ?? '';
      // keep the file itself, so it can open in 3D from here. If the browser will not keep it, the model is still attached.
      let keptFile = null, notKept = '';
      if (!twinLink({ fingerprint: m.fingerprint })?.direct) {
        try { const meta = await store.putFile({ project_id: r.pid, owner_kind: 'model', owner_id: r.pid, name: m.file_name, type: 'application/json', data: text }); keptFile = { id: meta.id, name: meta.name, type: meta.type, size: meta.size, kept_at: meta.kept_at }; } catch (err) { notKept = err.message; }
      }
      // the plan the project's cover draws: worked out once from the file and kept on the project (cover.js)
      let outline = null;
      try { outline = planOutline(JSON.parse(text)); } catch { outline = null; }
      p.model = { fingerprint: m.fingerprint, drawings: m.drawings, revision: m.revision, file_name: m.file_name, file: keptFile, ...(outline ? { outline } : {}) };
      await store.save('project', p);
      if (oldFile) await store.removeFile(oldFile);
      await log(r.pid, before ? 'Model replaced' : 'Model attached', `${m.file_name}, revision ${m.revision}, version ${m.fingerprint}${keptFile ? `, file kept (${sizeText(keptFile.size)})` : ''}`);
      return redraw(`${before && before !== m.fingerprint ? 'Model replaced' : 'Model attached'}: ${m.file_name}, version ${m.fingerprint}.${keptFile ? ` The file is kept ${W(p).keptOnly /* [cloud] */} (${sizeText(keptFile.size)}).` : notKept ? ` The file was not kept: ${notKept}` : ''}${m.schemaOk ? '' : ' This file does not name the plan model format the 3D page expects, so it may not open there.'}`);
    }
  } catch (err) {
    return redraw(err.message);
  }
}

/** arrow keys, Home and End move along the tabs */
function onTabKey(e) {
  const t = e.target.closest?.('[role="tab"][data-tab]');
  if (!t) return;
  const i = TAB_KEYS.indexOf(t.dataset.tab), to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TAB_KEYS.length - 1 }[e.key];
  if (to === undefined) return;
  e.preventDefault();
  selectTab(TAB_KEYS[(to + TAB_KEYS.length) % TAB_KEYS.length], true);
}

/** a look chosen: for the practice (an owner; saved in the shared records) or for this browser */
async function onLook(e) {
  const el = e.target.closest('[data-look]');
  if (!el || el.disabled || !isTheme(el.dataset.look)) return;
  const t = el.dataset.look, { practice, scope } = lookState();
  try {
    if (scope === 'practice') { await account.setLook(t); ui.flash = `The ${THEMES[t].label} look is saved for everyone in ${practice.name}.`; }
    else { browserLook = t; await store.save('setting', { id: LOOK_SETTING, value: t }); ui.flash = `The ${THEMES[t].label} look is saved in this browser.`; }
  } catch (err) { ui.flash = err.message; }
  await render(false);
  document.querySelector(`[data-look="${t}"]`)?.focus();
}

// ---- start ------------------------------------------------------------------------------------------------------------------------
async function start() {
  for (const el of document.querySelectorAll('[data-icon]')) el.innerHTML = icon(el.dataset.icon);
  browserLook = (await store.get('setting', LOOK_SETTING))?.value ?? '';
  const saved = (await store.get('setting', 'outlines'))?.value;
  outlines = saved && typeof saved === 'object' ? saved : {};
  showLook();
  me = (await store.get('setting', 'me'))?.value ?? '';
  $me.value = me;
  $me.addEventListener('change', async () => { me = $me.value.trim(); await store.save('setting', { id: 'me', value: me }); });
  // first visit: put the sample in, so the page never opens empty. It is not put back if it has been removed.
  if (!(await store.get('setting', 'sample_seeded'))) {
    if (!(await store.get('project', SAMPLE_ID))) await store.saveProject(sampleProject());
    await store.save('setting', { id: 'sample_seeded', value: new Date().toISOString() });
  }
  $app.addEventListener('submit', onSubmit);
  $app.addEventListener('click', onClick);
  $app.addEventListener('change', onChange);
  $app.addEventListener('keydown', onTabKey);
  document.addEventListener('click', onLook); // the look chooser: on the settings screen and in the practice panel
  window.addEventListener('hashchange', () => render(true));
  // [cloud] wait a moment to learn whether someone is signed in, so the first screen shows the right records.
  // While signed in, "who" is the name on the account; otherwise it is the name typed in "Working as".
  account.onChange(() => { me = account.who() ?? $me.value.trim(); return render(true); });
  await account.ready;
  me = account.who() ?? me;
  await loadAddons(); // the add-ons that are there; a missing one is left out
  await render(true);
}
start().catch((err) => { $app.innerHTML = `<p class="opening">The page could not start: ${esc(err.message)}</p>`; });
