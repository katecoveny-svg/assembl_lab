// The practice's records and the rules that move a project through its stages. No page and no storage in here:
// every function takes plain data and returns plain data, so the same rules can sit on a database later.
//
// Names follow the data model agreed for the database:
//   project, stage, task, document, approval, rfi, observation, variation, defect, activity.
// Added here because the flow needs them (flagged for the database design):
//   checklist_item  the consent bundle and completion checklists
//   project.sample  marks the sample project
//   project_id      on every child row

// ---- the seven stages ------------------------------------------------------------------------------------------------
// Stage names are the seven the NZ Institute of Architects describes. The one-line "produces" text, the starter tasks
// and the closing statements are assembl's starter wording for a practice to edit. They are not the Institute's words.
export const STAGES = [
  { key: 'predesign', label: 'Predesign', tool: 'site', produces: 'A written brief, and what is known about the site.',
    closing: 'The brief and the site information are accepted as the basis for design.',
    starter: ['Visit the site', 'Write the brief with the client', 'Look up the site facts', 'Gather any existing drawings and reports'] },
  { key: 'concept', label: 'Concept design', tool: 'model', produces: 'A first design the client can see and respond to.',
    closing: 'The concept shown is accepted to develop.',
    starter: ['Sketch options against the brief', 'Attach the plan model', 'Walk the client through the 3D model', 'Note what the client asked to change'] },
  { key: 'developed', label: 'Developed design', tool: 'model', produces: 'The agreed design, worked through and coordinated.',
    closing: 'The developed design is accepted to document.',
    starter: ['Update the plan model to the agreed design', 'Coordinate with the other consultants', 'Check the model against the drawings'] },
  { key: 'detailed', label: 'Detailed design', tool: 'consent', produces: 'The drawings and documents for consent and for building.',
    closing: 'The documents are accepted as ready to issue.',
    starter: ['Gather the consent bundle', 'Answer requests for information', 'Issue the documents for pricing'] },
  { key: 'contract', label: 'Contract administration', tool: 'site_log', produces: 'A running record of the building contract.',
    closing: 'The contract records are accepted as up to date.',
    starter: ['Set up the variations register', 'Record each instruction and variation'] },
  { key: 'observation', label: 'Project observation', tool: 'site_log', produces: 'A dated record of what was seen on site.',
    closing: 'The site observation record is accepted as complete.',
    starter: ['Log each site visit', 'Raise anything that differs from the documents'] },
  { key: 'completion', label: 'Completion', tool: 'close_out', produces: 'Defects closed out and the records handed over.',
    closing: 'The defects list and the handover records are accepted as closed out.',
    starter: ['Walk the finished building with the client', 'List the defects', 'Hand over the record documents'] },
];
export const STAGE_KEYS = STAGES.map((s) => s.key);
export const stageDef = (key) => STAGES.find((s) => s.key === key) ?? null;
export const stageNumber = (key) => STAGE_KEYS.indexOf(key) + 1;

/** the sentence a named person agrees to when they close a stage */
export const closingStatement = (key) => { const d = stageDef(key); return d ? `Closes ${d.label}. ${d.closing}` : ''; };

export const STAGE_STATUS = { not_started: 'To come', in_progress: 'In progress', awaiting_approval: 'Awaiting approval', done: 'Done' };

// ---- status words for each list, in order. "filled" marks the ones shown with a filled square. ----------------------
export const STATUS = {
  task: [['todo', 'To do'], ['doing', 'Doing'], ['done', 'Done'], ['blocked', 'Blocked']],
  rfi: [['open', 'Open'], ['drafted', 'Drafted'], ['sent', 'Sent'], ['closed', 'Closed']],
  variation: [['raised', 'Raised'], ['agreed', 'Agreed'], ['declined', 'Declined']],
  defect: [['open', 'Open'], ['fixed', 'Fixed'], ['closed', 'Closed']],
  checklist_item: [['needed', 'To do'], ['gathered', 'Done'], ['not_needed', 'Not needed']],
};
const FILLED = { task: ['done'], rfi: ['closed'], variation: ['agreed', 'declined'], defect: ['closed'], checklist_item: ['gathered', 'not_needed'], stage: ['done'] };
export const isFilled = (kind, status) => (FILLED[kind] ?? []).includes(status);
export const statusWord = (kind, status) => (kind === 'stage' ? STAGE_STATUS[status] : (STATUS[kind] ?? []).find((s) => s[0] === status)?.[1]) ?? String(status ?? '');
/** "■ Done" or "□ To do": a filled or open square with a word */
export const statusMark = (kind, status) => `${isFilled(kind, status) ? '■' : '□'} ${statusWord(kind, status)}`;

export const ROLES = ['Registered architect', 'Design LBP', 'Chartered engineer', 'Owner or client', 'Other'];
export const DOC_KINDS = ['Brief', 'Drawing', 'Specification', 'Report', 'Consent document', 'Correspondence', 'Contract', 'Photo', 'Other'];

// Starter checklists. They are a place to start, not a statement of what any council or contract requires.
export const CONSENT_STARTER = ['Application form', 'Drawings', 'Specification', 'Engineering design and calculations', 'Record of title', 'Anything else your council’s checklist names'];
export const COMPLETION_STARTER = ['Final walk through with the client', 'Defects closed out', 'Manuals and warranties handed over', 'Record drawings filed'];

// Plan models the lab hosts beside its own pages. The 3D page can open these straight from a link (?plan=<file>).
// The fingerprints are checked against the files in tests/architecture/fingerprint.test.mjs.
export const TWIN_PAGE = '/plan-studio/twins/drop/';
export const HOSTED_MODELS = [
  { file_name: 'hero.plan.json', fingerprint: '99eea08ce8e9', revision: 'A',
    drawings: 'Draft set printed 17 November 2026: ground floor plan RC-031, site sheets RC-030 and RC-014, elevations and section RC-020, area plans RC-016, 3D sketch RC-029.' },
  { file_name: 'hero-plane.plan.json', fingerprint: 'fe966b1b90f4', revision: 'A',
    drawings: 'Draft partial set: ground floor plan RC-031 (1:25 at A1), site elevations RC-020, area plans RC-016, 3D sketch RC-029.' },
];

/**
 * How "Open in 3D" really works for this model.
 * The 3D page accepts a plan in two ways only: a link to a .json the lab hosts beside its pages, or a file the person
 * chooses or drops on that page. So a hosted model gets a direct link; any other file has to be chosen again there.
 */
export function twinLink(model) {
  if (!model?.fingerprint) return null;
  const hosted = HOSTED_MODELS.find((m) => m.fingerprint === model.fingerprint);
  if (hosted) return { direct: true, href: `${TWIN_PAGE}?plan=${hosted.file_name}` };
  return { direct: false, href: `${TWIN_PAGE}?drop=1` };
}

// ---- ids and small helpers --------------------------------------------------------------------------------------------
export function newId(prefix = '') {
  const u = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${u}` : u;
}
const nowIso = (now) => (now instanceof Date ? now : new Date(now ?? Date.now())).toISOString();
const clean = (s) => String(s ?? '').trim();
export const emptyBundle = () => ({ project: null, stages: [], tasks: [], documents: [], approvals: [], rfis: [], observations: [], variations: [], defects: [], checklist: [], activity: [] });

// ---- a new project ----------------------------------------------------------------------------------------------------
/** A project with its seven stages, the starter tasks and the two starter checklists. Predesign starts straight away. */
export function newProject({ name, client = '', now, id, sample = false } = {}) {
  const title = clean(name);
  if (title.length < 2) throw new Error('Give the project a name.');
  const at = nowIso(now), pid = id ?? newId('p');
  const b = emptyBundle();
  b.project = { id: pid, name: title, client: clean(client), stage: 'predesign', created_at: at, updated_at: at,
    site: { lat: null, lon: null, facts: [], fetched_at: null }, model: { fingerprint: '', drawings: '', revision: '', file_name: '' } };
  if (sample) b.project.sample = true;
  b.stages = STAGES.map((s, i) => ({ id: `${pid}:${s.key}`, project_id: pid, key: s.key, status: i === 0 ? 'in_progress' : 'not_started', started_at: i === 0 ? at : null, done_at: null }));
  for (const s of STAGES) for (const t of s.starter) b.tasks.push({ id: newId('t'), project_id: pid, stage: s.key, title: t, owner: '', status: 'todo', due: '', note: '' });
  for (const t of CONSENT_STARTER) b.checklist.push({ id: newId('c'), project_id: pid, stage: 'detailed', list: 'consent', title: t, status: 'needed', document_id: '', note: '' });
  for (const t of COMPLETION_STARTER) b.checklist.push({ id: newId('c'), project_id: pid, stage: 'completion', list: 'completion', title: t, status: 'needed', document_id: '', note: '' });
  return b;
}

export const SAMPLE_ID = 'p_sample-waiheke-house';
/** The sample: the example plan model the lab hosts, with no client, no site point and no approvals made up for it. */
export function sampleProject(now) {
  const b = newProject({ name: 'A house on Waiheke Island', client: '', now, id: SAMPLE_ID, sample: true });
  const m = HOSTED_MODELS[0];
  b.project.model = { fingerprint: m.fingerprint, drawings: m.drawings, revision: m.revision, file_name: m.file_name };
  return b;
}

// ---- the stage gate ---------------------------------------------------------------------------------------------------
const stageOf = (b, key) => b.stages.find((s) => s.key === key) ?? null;
export const currentStage = (b) => b.stages.find((s) => s.status === 'in_progress' || s.status === 'awaiting_approval') ?? null;
export const allDone = (b) => b.stages.length === STAGES.length && b.stages.every((s) => s.status === 'done');

/**
 * The approvals that close a stage: recorded on that stage, by a named person, to the closing statement.
 * For the two model stages an approval only counts on the model version it was made on.
 */
export function closingApprovals(b, key) {
  const def = stageDef(key);
  if (!def) return { valid: [], stale: [] };
  const all = b.approvals.filter((a) => a.stage === key && clean(a.who).length >= 2 && clean(a.what).startsWith(`Closes ${def.label}.`));
  const fp = b.project?.model?.fingerprint ?? '';
  if (def.tool !== 'model') return { valid: all, stale: [] };
  return { valid: all.filter((a) => (a.fingerprint ?? '') === fp), stale: all.filter((a) => (a.fingerprint ?? '') !== fp) };
}

/** Can this stage be marked done? Agents prepare, people approve: not until a named person's closing approval is on record. */
export function gate(b, key) {
  const st = stageOf(b, key), def = stageDef(key);
  if (!st || !def) return { ok: false, reason: 'That is not one of the seven stages.' };
  if (st.status === 'done') return { ok: false, reason: `${def.label} is already done.` };
  if (st.status === 'not_started') return { ok: false, reason: `${def.label} has not started. It starts when the stage before it is done.` };
  const { valid, stale } = closingApprovals(b, key);
  if (valid.length) return { ok: true, reason: '', approval: valid[valid.length - 1] };
  if (stale.length) return { ok: false, reason: 'The plan model has changed since the approval was recorded. A named person needs to approve this version.' };
  return { ok: false, reason: 'A named person has not recorded the approval that closes this stage.' };
}

/** in progress → awaiting approval */
export function askForApproval(b, key, now) {
  const st = stageOf(b, key);
  if (!st || st.status !== 'in_progress') throw new Error('Only a stage that is in progress can be put up for approval.');
  st.status = 'awaiting_approval'; b.project.updated_at = nowIso(now);
  return st;
}
/** awaiting approval → in progress (the work was not ready after all) */
export function backToWork(b, key, now) {
  const st = stageOf(b, key);
  if (!st || st.status !== 'awaiting_approval') throw new Error('Only a stage awaiting approval can go back to in progress.');
  st.status = 'in_progress'; b.project.updated_at = nowIso(now);
  return st;
}

/** A named person records what they approve. Returns the approval row; nothing is recorded without a name. */
export function recordApproval(b, key, { who, role, note = '' }, now) {
  const def = stageDef(key), st = stageOf(b, key), name = clean(who);
  if (!def || !st) throw new Error('That is not one of the seven stages.');
  if (st.status === 'not_started') throw new Error(`${def.label} has not started.`);
  if (st.status === 'done') throw new Error(`${def.label} is already done.`);
  if (name.length < 2) throw new Error('Type the name of the person approving.');
  const a = { id: newId('a'), project_id: b.project.id, stage: key, who: name, role: ROLES.includes(role) ? role : 'Other', what: closingStatement(key), note: clean(note), at: nowIso(now), fingerprint: b.project.model?.fingerprint ?? '' };
  b.approvals.push(a); b.project.updated_at = a.at;
  return a;
}

/** Mark a stage done and start the next one. Throws unless the gate is open. */
export function markDone(b, key, now) {
  const g = gate(b, key);
  if (!g.ok) throw new Error(g.reason);
  const at = nowIso(now), st = stageOf(b, key), next = stageOf(b, STAGE_KEYS[STAGE_KEYS.indexOf(key) + 1]);
  st.status = 'done'; st.done_at = at;
  if (next && next.status === 'not_started') { next.status = 'in_progress'; next.started_at = at; b.project.stage = next.key; }
  b.project.updated_at = at;
  return { stage: st, next: next ?? null };
}

// ---- what to do next: one clear action --------------------------------------------------------------------------------
const openTasks = (b, key) => b.tasks.filter((t) => t.stage === key && t.status !== 'done');
export const openRfis = (b) => b.rfis.filter((r) => r.status === 'open' || r.status === 'drafted');
export const hasSiteFacts = (b) => Array.isArray(b.project?.site?.facts) && b.project.site.facts.length > 0;
export const hasModel = (b) => !!b.project?.model?.fingerprint;

export function nextAction(b) {
  if (!b?.project) return null;
  if (allDone(b)) return { kind: 'pack', text: 'All seven stages are done. Print the client pack.', button: 'Open the client pack', stage: null };
  const st = currentStage(b);
  if (!st) return null;
  const def = stageDef(st.key), go = (kind, text, button) => ({ kind, text, button, stage: st.key });
  if (st.status === 'awaiting_approval') {
    const g = gate(b, st.key);
    if (g.ok) return go('done', `${def.label} is approved by ${g.approval.who}. Mark the stage done.`, 'Go to the approval');
    return go('approve', `${def.label} is waiting for a named person to approve it.`, 'Record the approval');
  }
  if (def.tool === 'site' && !hasSiteFacts(b)) return go('tool', 'Look up the site facts and save them to the project.', 'Open site facts');
  if (def.tool === 'model' && !hasModel(b)) return go('tool', 'Attach the plan model for this design.', 'Attach the model');
  if (def.tool === 'consent' && b.rfis.some((r) => r.status === 'open')) {
    const n = b.rfis.filter((r) => r.status === 'open').length;
    return go('tool', `${n} request${n === 1 ? '' : 's'} for information ${n === 1 ? 'needs' : 'need'} a reply.`, 'Open the requests');
  }
  const open = openTasks(b, st.key);
  if (open.length) return go('tasks', open.length === 1 ? `One task left in ${def.label}: ${open[0].title}.` : `${open.length} tasks are open in ${def.label}. Next: ${open[0].title}.`, 'Open the tasks');
  return go('ask', `The ${def.label} tasks are done. Ask a named person to approve the stage.`, 'Ask for approval');
}

// ---- activity ---------------------------------------------------------------------------------------------------------
export function activity(projectId, who, action, detail = '', now) {
  return { id: newId('v'), project_id: projectId, at: nowIso(now), who: clean(who) || 'Not named', action: clean(action), detail: clean(detail) };
}

// ---- export and import ------------------------------------------------------------------------------------------------
export const BUNDLE_TYPE = 'assembl.architecture-project.v1';
const LISTS = ['stages', 'tasks', 'documents', 'approvals', 'rfis', 'observations', 'variations', 'defects', 'checklist', 'activity'];

/** Check a file's contents are a project this page wrote. Returns a clean bundle or throws with a plain reason. */
export function readBundle(input) {
  let j;
  try { j = typeof input === 'string' ? JSON.parse(input) : input; } catch { throw new Error('That file is not JSON, so it is not a project file.'); }
  if (!j || j.type !== BUNDLE_TYPE) throw new Error('That file is not a project exported from this page.');
  const p = j.project;
  if (!p || typeof p.id !== 'string' || typeof p.name !== 'string') throw new Error('The project in that file has no name or id.');
  const b = emptyBundle();
  b.project = { ...p, site: { lat: null, lon: null, facts: [], fetched_at: null, ...(p.site ?? {}) }, model: { fingerprint: '', drawings: '', revision: '', file_name: '', ...(p.model ?? {}) } };
  for (const k of LISTS) b[k] = Array.isArray(j[k]) ? j[k].filter((r) => r && typeof r === 'object' && typeof r.id === 'string') : [];
  const keys = b.stages.map((s) => s.key);
  if (STAGE_KEYS.some((k) => !keys.includes(k))) throw new Error('The project in that file does not have all seven stages.');
  if (!STAGE_KEYS.includes(b.project.stage)) throw new Error('The project in that file is at a stage this page does not know.');
  return b;
}

/** The file contents for a project: everything about it, and nothing about any other project. */
export function writeBundle(b, now) {
  const out = { type: BUNDLE_TYPE, exported_at: nowIso(now), note: 'A project exported from assembl. architecture operations. It includes the site point if one was saved. Approvals are a record of what named people said: not signatures and not a professional sign-off.', project: b.project };
  for (const k of LISTS) out[k] = b[k];
  return out;
}

/** Give a bundle new ids throughout, so it can sit beside the project it was exported from. */
export function copyBundle(b, now) {
  const pid = newId('p'), map = new Map(), fresh = (old, prefix) => { const n = newId(prefix); map.set(old, n); return n; };
  const c = emptyBundle();
  c.project = { ...structuredClone(b.project), id: pid, name: `${b.project.name} (imported copy)`, updated_at: nowIso(now) };
  c.stages = b.stages.map((s) => ({ ...s, id: `${pid}:${s.key}`, project_id: pid }));
  const P = { tasks: 't', documents: 'd', approvals: 'a', rfis: 'r', observations: 'o', variations: 'x', defects: 'f', checklist: 'c', activity: 'v' };
  for (const k of Object.keys(P)) c[k] = b[k].map((r) => ({ ...r, id: fresh(r.id, P[k]), project_id: pid }));
  for (const item of c.checklist) if (item.document_id) item.document_id = map.get(item.document_id) ?? '';
  return c;
}

export const fileSlug = (name) => (clean(name).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project').slice(0, 48);
