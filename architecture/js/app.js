// The page. It draws what the rules in model.js say and saves through store.js: nothing here touches storage directly.
import {
  STAGES, STAGE_KEYS, STATUS, ROLES, DOC_KINDS, stageDef, stageNumber, closingStatement, statusMark, statusWord, newProject, sampleProject, SAMPLE_ID,
  gate, closingApprovals, askForApproval, backToWork, recordApproval, markDone, nextAction, currentStage, allDone, openRfis, hasSiteFacts, hasModel,
  activity, newId, twinLink, twinHandoff, isEdited, sourceLabel, missingSourced, consentRow, taskRow, AUCKLAND, READ_ON,
} from './model.js';
import { createStore, browserBackend, FILE_LIMIT, sizeText, sessionHandoff } from './store.js';
import { describeModel } from './fingerprint.js';
import { parseWhere, fetchSiteFacts, answered, notConnected, noAnswer, credits, showValue } from './facts.js';

// [cloud] One store for the whole page. It starts as this browser's store, exactly as before. account.js points it at the
// practice's shared records when a person is signed in with a practice, and back again when they sign out.
import { createSwitch } from './cloud.js';
import { mountAccount } from './account.js';
const store = createSwitch(createStore(browserBackend()));
const account = mountAccount({ store, local: store.local, slot: document.getElementById('acct'), panel: document.getElementById('account-panel'), nameLabel: document.querySelector('label.me') });
const W = (project) => account.words(project); // [cloud] wording that depends on where a project is kept
const $app = document.getElementById('app'), $me = document.getElementById('me'), $truth = document.getElementById('truth');
const ui = { adding: null, editing: null, confirm: null, flash: '', busy: false, factsError: '', modelError: '', allActivity: false, focus: null, scrollTo: null, exporting: false, fileFor: null };
let me = '';
let kept = new Map(); // the files kept in this browser for the project on screen, by file id
const handoff = { fp: '', pid: '', ok: false, why: '', told: false }; // whether the model on screen is ready to pass to the 3D page
const HERO = '/plan-studio/twins/drop/hero.webp';

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
  if (parts[0] !== 'p' || !parts[1]) return { view: 'projects' };
  if (parts[2] === 'pack') return { view: 'pack', pid: parts[1] };
  if (parts[2] === 's' && STAGE_KEYS.includes(parts[3])) return { view: 'stage', pid: parts[1], stage: parts[3], section: parts[4] ?? null };
  return { view: 'dash', pid: parts[1] };
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
  if (!kept.has(f.id)) return `<div class="filebar"><span class="st">□ File not in this browser</span><span class="fname">${esc(f.name)} · ${esc(sizeText(f.size))}</span><button class="link" data-act="file-pick" data-id="${esc(d.id)}">Attach it again${name}</button></div>`;
  return `<div class="filebar"><span class="st">■ File kept in this browser</span><span class="fname">${esc(f.name)} · ${esc(sizeText(f.size))}</span>
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

// ---- projects screen ----------------------------------------------------------------------------------------------------
const miniRail = (stages) => `<span class="mini" aria-hidden="true">${STAGE_KEYS.map((k) => { const s = stages.find((x) => x.key === k); return `<i class="${s?.status === 'done' ? 'done' : s && s.status !== 'not_started' ? 'now' : ''}"></i>`; }).join('')}</span>`;
function whereLine(stages) {
  if (stages.length && stages.every((s) => s.status === 'done')) return '■ All seven stages done';
  const s = stages.find((x) => x.status === 'in_progress' || x.status === 'awaiting_approval');
  return s ? `Stage ${stageNumber(s.key)} of 7 · ${stageDef(s.key).label} · ${statusMark('stage', s.status)}` : '';
}

async function projectsView() {
  const projects = (await store.list('project')).sort((a, b) => (a.sample ? 1 : 0) - (b.sample ? 1 : 0) || String(b.updated_at).localeCompare(String(a.updated_at)));
  const stages = await store.list('stage');
  const hasSample = projects.some((p) => p.sample);
  const rows = projects.map((p) => {
    const st = stages.filter((s) => s.project_id === p.id), sure = ui.confirm === p.id;
    const thumb = p.sample
      ? `<div class="thumb"><img src="${HERO}" alt="A dark-clad house on timber piles among trees: a rendering of the sample plan model, not a photograph." loading="lazy" /></div>`
      : `<div class="thumb blank"><span>${p.model?.fingerprint ? 'Model attached' : 'No model yet'}</span></div>`;
    return `<li class="prow">${thumb}
      <div class="body"><div class="who" style="display:grid;gap:6px;min-width:0"><p class="label">${p.sample ? '<span class="tag">Sample</span>' : 'Project'}</p><h2>${esc(p.name)}</h2>
        <p class="small">${p.sample ? 'The lab’s example plan model. No client, no site point and no approvals come with it.' : p.client ? `Client: ${esc(p.client)}` : 'No client named'}</p></div>
        <div class="where">${miniRail(st)}<p class="st" style="white-space:normal">${esc(whereLine(st))}</p><p class="when">Changed ${esc(day(p.updated_at))}</p></div></div>
      <div class="go"><a class="btn solid" href="${href(p.id)}">Open<span class="vh"> ${esc(p.name)}</span></a>
        <button class="link" data-act="project-remove" data-id="${esc(p.id)}">${sure ? 'Remove for good' : 'Remove'}</button></div></li>`;
  }).join('');
  return `<div class="wrap">
    <section class="hero"><p class="label">Projects</p><h1>From the first site visit to completion.</h1>
      <p class="lede">One project, seven stages. Each stage shows its tasks, its documents, its tool, and the approval that closes it.</p></section>
    ${flashHtml()}
    ${projects.length ? `<ul class="plist">${rows}</ul>` : `<div class="empty"><h3>No projects ${esc(W().here)} yet.</h3><p>Create one below, import a project file, or add the sample to look around.</p></div>`}
    <section class="panel" aria-labelledby="newp"><h3 id="newp">New project</h3>
      <form class="f newp" data-form="new-project"><label>Project name<input name="name" required maxlength="120" placeholder="e.g. House on the ridge" /></label>
        <label>Client<input name="client" maxlength="120" placeholder="optional" /></label>
        <div class="f-act"><button class="btn solid">Create project</button></div></form>
      <div class="acts"><button class="btn" data-act="pick" data-target="import-file">Import a project file</button>${hasSample ? '' : '<button class="btn" data-act="sample">Add the sample project</button>'}
        <input type="file" id="import-file" data-file="import" accept=".json,application/json" hidden /></div>
      <p class="small">A new project starts in Predesign with a list of tasks for each stage and a consent list. Each item shows its source, or says it is an assembl starter with none. Edit the lists to suit your practice, and check your council’s current checklist.</p>
    </section></div>`;
}

const flashHtml = () => (ui.flash ? `<p class="flash" role="status">${esc(ui.flash)}</p>` : '');

// ---- the project frame: header and stage rail --------------------------------------------------------------------------
function frame(b, r, inner) {
  const p = b.project, cur = currentStage(b);
  const rail = STAGES.map((s, i) => {
    const st = b.stages.find((x) => x.key === s.key), cls = st.status === 'done' ? 'done' : st.status === 'not_started' ? '' : 'now';
    return `<a class="${cls}" href="${href(p.id, 's', s.key)}"${r.view === 'stage' && r.stage === s.key ? ' aria-current="page"' : ''}>
      <span class="n">${String(i + 1).padStart(2, '0')}</span><span class="name">${esc(s.label)}</span><span class="st">${esc(statusMark('stage', st.status))}</span></a>`;
  }).join('');
  const now = allDone(b) ? '■ All seven stages done' : cur ? `Stage ${stageNumber(cur.key)} of 7 · ${stageDef(cur.key).label} · ${statusMark('stage', cur.status)}` : '';
  return `<div class="wrap">
    <nav class="crumb" aria-label="Back"><a href="#/">← All projects</a></nav>
    <header class="phead"><div class="who"><p class="label">${p.sample ? '<span class="tag">Sample</span>' : 'Project'}</p><h1>${esc(p.name)}</h1>
      <p class="small">${p.sample ? 'The lab’s example plan model. No client is named.' : p.client ? `Client: ${esc(p.client)}` : 'No client named'}</p></div>
      <nav class="pnav" aria-label="Project"><a class="btn" href="${href(p.id)}"${r.view === 'dash' ? ' aria-current="page"' : ''}>Overview</a><a class="btn" href="${href(p.id, 'pack')}">Client pack</a><button class="btn" data-act="export"${ui.exporting ? ' aria-expanded="true"' : ''}>Export</button></nav></header>
    ${ui.exporting ? exportHtml(p) : ''}
    <nav class="rail" aria-label="The seven stages">${rail}</nav>
    <p class="rail-now">${esc(now)}</p>
    ${flashHtml()}${inner}</div>`;
}

/** Export asks one thing first: with the kept files, or without. Either way it says which. */
function exportHtml(p) {
  const files = [...kept.values()], bytes = files.reduce((n, f) => n + f.size, 0);
  return `<section class="panel exportbox" aria-labelledby="exh"><h3 id="exh">Export “${esc(p.name)}”</h3>
    ${files.length
    ? `<p>This project has ${plural(files.length, 'file')} kept in this browser (${esc(sizeText(bytes))}). Choose whether they go in the project file.</p>
      <div class="acts"><button class="btn solid" data-act="export-go" data-files="1">Export with the files</button><button class="btn" data-act="export-go" data-files="0">Export the records only</button><button class="link" data-act="export-cancel">Cancel</button></div>
      <p class="small">With the files: one larger file that holds everything, so another browser can open the documents. Records only: the files stay in this browser, and each document still names the file it had.</p>`
    : `<p>This project has no files kept in this browser, so there are none to include. The project file holds the records.</p>
      <div class="acts"><button class="btn solid" data-act="export-go" data-files="0">Export the project</button><button class="link" data-act="export-cancel">Cancel</button></div>`}
    <p class="small">The file includes the site point if one is saved.</p></section>`;
}

/** the Open in 3D button: a link straight to a hosted model, a hand-over of a kept file, or the 3D page's own chooser */
function open3dHtml(p, link, label = 'Open in 3D ↗') {
  const stuck = handoff.fp === p.model.fingerprint && !!handoff.why;
  if (link.handoff && !stuck) return `<a class="btn solid" href="${esc(link.href)}" target="_blank" rel="opener" data-act="open-3d">${label}</a>`;
  return `<a class="btn solid" href="${esc(link.handoff ? '/plan-studio/twins/drop/?drop=1' : link.href)}" target="_blank" rel="noopener">${label}</a>`;
}

// ---- dashboard --------------------------------------------------------------------------------------------------------------
function dashView(b, r) {
  const p = b.project, cur = currentStage(b), n = nextAction(b);
  const nextHref = !n ? '#/' : n.kind === 'pack' ? href(p.id, 'pack') : href(p.id, 's', n.stage, { tool: 'tool', tasks: 'tasks', ask: 'approval', approve: 'approval', done: 'approval' }[n.kind]);
  const tasks = cur ? b.tasks.filter((t) => t.stage === cur.key && t.status !== 'done') : [];
  const waiting = b.stages.filter((s) => s.status === 'awaiting_approval').map((s) => { const g = gate(b, s.key); return { s, g }; });
  const rfis = openRfis(b);
  const link = twinLink(p.model);
  const acts = ui.allActivity ? b.activity : b.activity.slice(0, 8);
  return frame(b, r, `
    ${n ? `<section class="next" aria-labelledby="nx"><p class="label" id="nx">What to do next</p><p class="say">${esc(n.text)}</p><a class="btn solid" href="${nextHref}">${esc(n.button)}</a></section>` : ''}
    <div class="tiles">
      <section class="tile"><p class="label">Open tasks${cur ? ` · ${esc(stageDef(cur.key).label)}` : ''}</p><p class="count">${tasks.length}</p>
        ${tasks.length ? `<ul>${tasks.slice(0, 5).map((t) => `<li>${esc(t.title)}<span class="st">${esc(statusMark('task', t.status))}${t.owner ? ` · ${esc(t.owner)}` : ''}${t.due ? ` · due ${esc(day(t.due))}` : ''}</span></li>`).join('')}</ul>` : `<p class="small">${cur ? 'No open tasks in this stage.' : 'Every stage is done.'}</p>`}
        ${cur ? `<a class="more" href="${href(p.id, 's', cur.key, 'tasks')}">${tasks.length > 5 ? `All ${tasks.length} open tasks` : 'Open the task list'}</a>` : ''}</section>
      <section class="tile"><p class="label">Approvals waiting</p><p class="count">${waiting.length}</p>
        ${waiting.length ? `<ul>${waiting.map(({ s, g }) => `<li>${esc(stageDef(s.key).label)}<span class="st">${g.ok ? `■ Approved by ${esc(g.approval.who)}: mark the stage done` : '□ Waiting for a named person'}</span></li>`).join('')}</ul>
          <a class="more" href="${href(p.id, 's', waiting[0].s.key, 'approval')}">Go to the approval</a>` : '<p class="small">Nothing is waiting for a person’s approval.</p>'}</section>
      <section class="tile"><p class="label">Open requests for information</p><p class="count">${rfis.length}</p>
        ${rfis.length ? `<ul>${rfis.slice(0, 4).map((q) => `<li>${esc(q.question)}<span class="st">${esc(statusMark('rfi', q.status))} · ${esc(q.from)}</span></li>`).join('')}</ul>` : '<p class="small">No requests are open.</p>'}
        <a class="more" href="${href(p.id, 's', 'detailed', 'tool')}">Open the request log</a></section>
    </div>
    <div class="tiles two">
      <section class="tile"><p class="label">Site facts</p>
        ${hasSiteFacts(b) ? `<h3>${plural(answered(p.site.facts).length, 'fact')} answered</h3><p class="st">■ Snapshot · ${esc(dayTime(p.site.fetched_at))}</p>` : '<h3>No snapshot yet</h3><p class="st">□ Not looked up</p>'}
        <a class="more" href="${href(p.id, 's', 'predesign', 'tool')}">${hasSiteFacts(b) ? 'Read the snapshot' : 'Look up site facts'}</a></section>
      <section class="tile${hasModel(b) && p.sample ? ' pic' : ''}"><p class="label">3D model</p>
        ${hasModel(b) ? `${p.sample ? `<figure><img src="${HERO}" alt="A rendering of the sample plan model, not a photograph." loading="lazy" /></figure>` : ''}<div class="txt"><h3>${esc(p.model.file_name)}</h3><p class="st" style="white-space:normal">■ Revision ${esc(p.model.revision)} · version ${esc(p.model.fingerprint)}</p>
          <div class="acts">${open3dHtml(p, link)}<a class="more" href="${href(p.id, 's', 'concept', 'tool')}">Model details</a></div>${p.sample ? '<p class="caption">A rendering of the sample plan model. Not a photograph.</p>' : ''}</div>`
          : `<h3>No model attached</h3><p class="st">□ Not attached</p><a class="more" href="${href(p.id, 's', 'concept', 'tool')}">Attach a plan model</a>`}</section>
    </div>
    <section class="log" aria-labelledby="lg"><p class="label" id="lg">Activity</p>
      ${b.activity.length ? `<ol>${acts.map((a) => `<li><span class="when">${esc(dayTime(a.at))} · ${esc(a.who)}</span><span><b style="font-weight:500">${esc(a.action)}</b>${a.detail ? `: ${esc(a.detail)}` : ''}</span></li>`).join('')}</ol>
        ${b.activity.length > 8 ? `<div><button class="link" data-act="activity-more">${ui.allActivity ? 'Show the latest only' : `Show all ${b.activity.length}`}</button></div>` : ''}` : '<p class="small">Nothing has been done on this project yet. Each change is logged here with who made it and when.</p>'}
      <p class="small">${esc(W(p).whoNote) /* [cloud] */}</p></section>`);
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
      <p class="starter">${store.filesPersistent ? '■ Files are kept in this browser only' : '□ This browser is not keeping files past this tab'}, up to ${esc(sizeText(FILE_LIMIT))} a file${docFiles.length ? `: ${plural(docFiles.length, 'file')}, ${esc(sizeText(docFiles.reduce((n, f) => n + f.size, 0)))} in this stage` : ''}. Clearing this browser’s data removes them, so export with the files to keep a copy. Shared file storage for a team: Not built yet. It comes with sign-in.</p>`)}
    ${sec('04', 'tool', TOOL_NAME[def.tool], '', toolHtml(b, def))}
    ${sec('05', 'approval', 'Approval', '', approvalHtml(b, def, st))}
    <p class="paper printed">Printed ${esc(day(new Date().toISOString()))}${me ? ` by ${esc(me)}` : ''} from assembl. architecture operations. A record kept in one browser. It does not check a design against any rule, and an approval here is not a signature, a professional sign-off or a council decision.</p>
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
  return `<form class="where-f" data-form="facts"><label>Latitude, longitude<input class="mono" name="where" value="${esc(where)}" placeholder="-36.80, 175.08" autocomplete="off" inputmode="text" required /></label>
      <button class="btn solid"${ui.busy ? ' disabled' : ''}>${ui.busy ? 'Asking the publishers…' : has ? 'Look up again' : 'Look up'}</button></form>
    <p class="small">Type a point in New Zealand, latitude first. It is sent to the lab’s live feed to ask the public maps, and ${esc(W(b.project).pointSaved) /* [cloud] */}. It is never put in a link or printed in the client pack.</p>
    ${ui.factsError ? `<p class="flash" role="alert">${esc(ui.factsError)}</p>` : ''}
    ${has ? `<div class="snap-h"><h3>Snapshot of ${esc(dayTime(s.fetched_at))}</h3><span class="st" style="white-space:normal">■ ${plural(live.length, 'fact')} answered${off.length ? ` · □ ${off.length} not connected` : ''}${down.length ? ` · □ ${down.length} no answer` : ''}</span></div>
      <ul class="facts">${live.map(fact).join('')}${down.map((f) => none(f, 'No answer just now')).join('')}${off.map((f) => none(f, 'Not connected')).join('')}</ul>
      <p class="small">What each published map shows at the point, on the date shown. It is not a planning, hazard or Building Code assessment. A point outside a mapped hazard is not proof the site cannot be affected. Most layers cover Auckland only.</p>
      ${cr.length ? `<p class="credit">${cr.map(esc).join(' ')}</p>` : ''}
      <div class="acts"><button class="link" data-act="facts-remove">${ui.confirm === 'facts' ? 'Remove for good' : 'Remove this snapshot and the point'}</button></div>`
      : '<div class="empty"><h3>No site facts saved yet.</h3><p class="small">Look up a point to save a dated snapshot: land parcel, planning zone and overlays, flood, coast, landslide and liquefaction maps, each with its source and credit.</p></div>'}`;
}

function modelTool(b, def) {
  const p = b.project, m = p.model ?? {}, link = twinLink(m);
  const input = '<input type="file" id="model-file" data-file="model" accept=".json,application/json" hidden />';
  const err = ui.modelError ? `<p class="flash" role="alert">${esc(ui.modelError)}</p>` : '';
  if (!link) return `<div class="empty"><h3>No plan model attached.</h3><p class="small">Attach the plan model file (.json) for this design. The project keeps its name, drawings note, revision and a fingerprint of what it says, and keeps the file itself in this browser only (up to ${esc(sizeText(FILE_LIMIT))}), so it can open in 3D from here. Nothing is uploaded.</p>
    <button class="btn solid" data-act="pick" data-target="model-file">Attach a plan model</button>${input}</div>${err}
    <p class="starter">Reading a plan model out of a PDF happens on the 3D page, not here. <a href="/plan-studio/twins/drop/?drop=1" target="_blank" rel="noopener">Open the 3D page ↗</a></p>`;
  const { stale } = closingApprovals(b, def.key), here = kept.get(m.file?.id), stuck = handoff.fp === m.fingerprint && !!handoff.why;
  const pic = p.sample ? `<figure><img src="${HERO}" alt="A dark-clad house on timber piles among trees." loading="lazy" /><figcaption class="caption">A rendering of the sample plan model. Not a photograph.</figcaption></figure>` : '';
  return `<div class="model${pic ? ' pic' : ''}">${pic}<div style="display:grid;gap:14px;min-width:0">
      <dl class="kv"><dt>File</dt><dd>${esc(m.file_name)}</dd><dt>Drawings</dt><dd>${esc(m.drawings)}</dd><dt>Revision</dt><dd>${esc(m.revision)}</dd><dt>Fingerprint</dt><dd class="fp">${esc(m.fingerprint)}</dd>
        <dt>Kept</dt><dd>${link.direct ? 'The lab hosts this example file, so it is not kept here.' : here ? `<span class="st" style="white-space:normal">■ File kept in this browser only · ${esc(sizeText(here.size))}</span> <button class="link" data-act="file-get" data-id="${esc(here.id)}">Download</button>` : '<span class="st" style="white-space:normal">□ The file itself is not kept in this browser</span>'}</dd></dl>
      <div class="acts">${open3dHtml(p, link)}<button class="btn" data-act="pick" data-target="model-file">Replace the file</button>
        <button class="link" data-act="model-remove">${ui.confirm === 'model' ? 'Remove for good' : 'Remove'}</button>${input}</div>
      ${link.direct ? '<p class="small">Opens this model on the 3D page: walk through it, change the sun, take stills.</p>'
        : link.handoff && !stuck ? '<p class="small">Opens this model on the 3D page in a new tab, with no second choosing. The kept file is passed across inside this browser. Nothing is uploaded.</p>'
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
      ${sec('Site facts', live.length ? `<h3>What the published maps show, as fetched ${esc(dayTime(s.fetched_at))}</h3>
        <ul class="pack-facts">${live.map((f) => `<li><div><p>${esc(f.label)}</p><p class="src">${esc(f.source?.name ?? '')}${f.asOf ? ` · as of ${esc(day(String(f.asOf).slice(0, 10)))}` : ''}</p></div><p class="v">${esc(showValue(f))}</p></li>`).join('')}</ul>
        ${off.length ? `<p class="small">□ Not connected or no answer: ${off.map((f) => esc(f.label)).join('; ')}.</p>` : ''}
        <p class="small">These are facts to read, not a planning, hazard or Building Code assessment. A point outside a mapped hazard is not proof the site cannot be affected. The point looked up is not printed here.</p>
        ${cr.length ? `<p class="credit">${cr.map(esc).join(' ')}</p>` : ''}` : '<p>□ No site facts have been saved for this project yet.</p>')}
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
  const r = route(), key = JSON.stringify([r.view, r.pid, r.stage]);
  const moved = key !== lastRoute;
  if (moved) { ui.adding = ui.editing = ui.confirm = null; ui.factsError = ui.modelError = ''; ui.allActivity = false; ui.exporting = false; }
  let html, onScreen = null;
  try { // [cloud] the shared records can fail to answer; this browser's own store never does
    if (r.view === 'projects') html = await projectsView();
    else {
      const b = await store.loadProject(r.pid);
      kept = new Map((b ? await store.listFiles({ project_id: r.pid }) : []).map((f) => [f.id, f]));
      onScreen = b?.project ?? null;
      if (!b) html = `<div class="wrap"><div class="empty" style="margin-top:32px"><h3>${esc(W().missingTitle)}</h3><p>${esc(W().missingText)}</p><a class="btn solid" href="#/">All projects</a></div></div>`;
      else html = r.view === 'pack' ? packView(b) : r.view === 'stage' ? stageView(b, r) : dashView(b, r);
    }
  } catch (err) { html = account.troubleHtml(err); }
  const y = window.scrollY;
  $app.innerHTML = html;
  account.afterRender($app); // [cloud] for a viewer of shared records: take away what they cannot do
  $truth.innerHTML = account.truthHtml(store.persistent); // [cloud] browser only / signed in and shared with a practice / not switched on yet
  document.title = r.view === 'projects' ? 'Architecture operations · assembl.' : `${$app.querySelector('h1')?.textContent ?? 'Project'} · assembl.`;
  const target = (moved || fromLink) && r.section ? document.getElementById(`sec-${r.section}`) : null;
  if (target) target.scrollIntoView({ block: 'start' });
  else if (moved) window.scrollTo(0, 0);
  else window.scrollTo(0, y);
  if (moved) lastRoute = key;
  if (ui.focus) { const el = $app.querySelector(ui.focus); ui.focus = null; if (el) el.focus({ preventScroll: false }); }
  if (moved) ui.flash = ''; // a message is shown once, on the screen it belongs to
  // get the kept model ready for the 3D page now, so pressing Open in 3D is an ordinary link
  if (onScreen) ready3d(onScreen).then((ok) => { if (!ok && handoff.why && !handoff.told) { handoff.told = true; render(false); } });
}

/** Put the kept plan model where the 3D page looks for a dropped plan. True when it is ready to open there. */
async function ready3d(p, again = false) {
  const m = p?.model;
  if (!m?.file?.id || !twinLink(m)?.handoff) return false;
  if (handoff.fp === m.fingerprint && handoff.pid === p.id && (handoff.ok || (handoff.why && !again))) return handoff.ok;
  handoff.fp = m.fingerprint; handoff.pid = p.id; handoff.ok = false; handoff.why = ''; handoff.told = false;
  try {
    const f = await store.getFile(m.file.id);
    if (!f) throw new Error('The model file is not in this browser.');
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
    if (what === 'new-project') {
      const b = newProject({ name: d.name, client: d.client });
      b.activity.push(activity(b.project.id, me, 'Project created', b.project.name));
      await store.saveProject(b);
      location.hash = href(b.project.id);
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
        p.site = { lat: where.lat, lon: where.lon, facts: got.facts, fetched_at: got.fetched_at };
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
    if (act === 'sample') { await store.saveProject(sampleProject()); return redraw('The sample project is back.'); }
    if (act === 'export') { ui.exporting = !ui.exporting; ui.focus = ui.exporting ? '.exportbox .btn' : null; return redraw(''); }
    if (act === 'export-cancel') { ui.exporting = false; ui.focus = '[data-act="export"]'; return redraw(''); }
    if (act === 'export-go') {
      const withFiles = el.dataset.files === '1', here = kept.size;
      const f = await store.exportProject(r.pid, undefined, { files: withFiles });
      download(f.file_name, f.text);
      const said = f.files_included ? `Files are included: ${plural(f.file_count, 'file')}, ${sizeText(f.file_bytes)}.` : here ? `Files are not included: the ${plural(here, 'file')} stay in this browser only.` : 'There were no files to include.';
      await log(r.pid, 'Project exported', `${f.file_name}. ${said}`);
      ui.exporting = false;
      return redraw(`Exported ${f.file_name}. It holds the project’s records, including the site point if one is saved. ${said}`);
    }
    // ---- files ----
    if (act === 'file-pick') { ui.fileFor = el.dataset.id; return document.getElementById('doc-file')?.click(); }
    if (act === 'file-get') {
      const f = await store.getFile(el.dataset.id);
      if (!f) return redraw('That file is not in this browser.');
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
      for (const x of add) await store.save(consent ? 'checklist_item' : 'task', consent ? consentRow(r.pid, x) : taskRow(r.pid, r.stage, x));
      await log(r.pid, consent ? 'Sourced consent items added' : 'Sourced tasks added', consent ? plural(add.length, 'item') : `${plural(add.length, 'task')}, ${stageDef(r.stage).label}`);
      return redraw(`Added ${plural(add.length, consent ? 'sourced item' : 'sourced task')}. Nothing that was already here was changed.`);
    }
    if (act === 'auckland-remove') {
      if (!twice('auckland')) return;
      const rows = (await store.list('checklist_item', { project_id: r.pid })).filter((c) => c.list === 'consent' && c.source_ref?.council === AUCKLAND);
      for (const c of rows) await store.remove('checklist_item', c.id);
      await log(r.pid, 'Auckland Council items removed', plural(rows.length, 'item'));
      return redraw(`Removed ${plural(rows.length, 'Auckland Council item')}. Add what your own council’s checklist asks for.`);
    }
    // ---- Open in 3D for a kept model: an ordinary link once the model is ready; otherwise make it ready, then go ----
    if (act === 'open-3d') {
      if (handoff.ok && handoff.pid === r.pid) return; // ready: the link opens a new tab, which starts with this tab's copy of the model
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
    if (el.matches('input[data-file]')) {
      const file = el.files?.[0], what = el.dataset.file;
      if (!file) return;
      // a file for a document: kept in this browser, with the record saying which file it is
      if (what === 'doc' || what === 'doc-new') {
        el.value = '';
        let d = what === 'doc' ? await store.get('document', ui.fileFor) : null;
        ui.fileFor = null;
        if (what === 'doc' && !d) return redraw('That document is no longer here.');
        if (file.size > FILE_LIMIT) return redraw(`“${file.name}” is ${sizeText(file.size)}. The limit is ${sizeText(FILE_LIMIT)} a file, because files are kept in this browser. Keep the file where it is and record where.`);
        const fresh = !d;
        if (fresh) d = { id: newId('d'), project_id: r.pid, stage: r.stage, title: file.name.replace(/\.[^.]+$/, '') || file.name, kind: '', version: '', date: '', source: '', note: '' };
        const before = d.file?.id ?? '';
        // keep the new file first: if the browser refuses, the document and any file it had are left as they were
        const meta = await store.putFile({ project_id: r.pid, owner_kind: 'document', owner_id: d.id, name: file.name, type: file.type, data: await file.arrayBuffer() });
        d.file = { id: meta.id, name: meta.name, type: meta.type, size: meta.size, kept_at: meta.kept_at };
        await store.save('document', d);
        if (before) await store.removeFile(before);
        await log(r.pid, fresh ? 'Added document' : before ? 'File replaced' : 'File attached', `${meta.name}, ${sizeText(meta.size)}${fresh ? '' : `: ${d.title}`}`);
        return redraw(`${before ? 'Replaced with' : 'Kept'} “${meta.name}”, ${sizeText(meta.size)}, in this browser only.${store.filesPersistent ? '' : ' This browser is not keeping files past this tab: export with the files to keep it.'}`);
      }
      const text = await file.text();
      el.value = '';
      if (what === 'import') {
        const got = await store.importProject(text);
        const p = await store.get('project', got.project_id);
        const docs = await store.list('document', { project_id: got.project_id }), named = docs.filter((d) => d.file?.id).length + (p.model?.file?.id ? 1 : 0);
        const said = 'files' in got ? ` ${plural(got.files, 'file')} came with it.${got.files_failed ? ` ${plural(got.files_failed, 'file')} could not be kept by this browser.` : ''}` : named ? ` The project file did not include its ${plural(named, 'file')}: they are still in the browser it came from.` : '';
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
      p.model = { fingerprint: m.fingerprint, drawings: m.drawings, revision: m.revision, file_name: m.file_name, file: keptFile };
      await store.save('project', p);
      if (oldFile) await store.removeFile(oldFile);
      await log(r.pid, before ? 'Model replaced' : 'Model attached', `${m.file_name}, revision ${m.revision}, version ${m.fingerprint}${keptFile ? `, file kept (${sizeText(keptFile.size)})` : ''}`);
      return redraw(`${before && before !== m.fingerprint ? 'Model replaced' : 'Model attached'}: ${m.file_name}, version ${m.fingerprint}.${keptFile ? ` The file is kept in this browser only (${sizeText(keptFile.size)}).` : notKept ? ` The file was not kept: ${notKept}` : ''}${m.schemaOk ? '' : ' This file does not name the plan model format the 3D page expects, so it may not open there.'}`);
    }
  } catch (err) {
    return redraw(err.message);
  }
}

// ---- start ------------------------------------------------------------------------------------------------------------------------
async function start() {
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
  window.addEventListener('hashchange', () => render(true));
  // [cloud] wait a moment to learn whether someone is signed in, so the first screen shows the right records.
  // While signed in, "who" is the name on the account; otherwise it is the name typed in "Working as".
  account.onChange(() => { me = account.who() ?? $me.value.trim(); return render(true); });
  await account.ready;
  me = account.who() ?? me;
  await render(true);
}
start().catch((err) => { $app.innerHTML = `<p class="opening">The page could not start: ${esc(err.message)}</p>`; });
