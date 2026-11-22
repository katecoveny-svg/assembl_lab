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
// Stage names are the seven the NZ Institute of Architects describes. The one-line "produces" text and the closing
// statements are assembl's wording for a practice to edit. They are not the Institute's words.
// Each stage's task list ("starter") mixes two kinds of task, told apart by NZIA_TASKS further down:
//   - tasks that are assembl's short wording of what the Institute's public page "The design process" says happens in
//     that stage. Each of these carries its source on the task row (source_ref).
//   - tasks about using this page's own tools, or that the Institute's page does not cover. These are an assembl
//     starter with no source, and the page says so.
export const STAGES = [
  { key: 'predesign', label: 'Predesign', tool: 'site', produces: 'A written brief, and what is known about the site.',
    closing: 'The brief and the site information are accepted as the basis for design.',
    starter: ['Hold the first meeting or meetings with the client', 'Visit the site', 'Write the brief with the client',
      'Gather the key information: certificate of title, drainage plans, zoning and town planning information',
      'Agree with the client who collects which information', 'Look up the site facts',
      'Have the site surveyed for contours and boundaries, if a survey is needed',
      'Check for issues with existing planting, water courses and soil type'] },
  { key: 'concept', label: 'Concept design', tool: 'model', produces: 'A first design the client can see and respond to.',
    closing: 'The concept shown is accepted to develop.',
    starter: ['Develop concepts from the project scope, the budget and the client’s requirements',
      'Show a range of solutions to the brief as drawings, sketches, renderings or models', 'Attach the plan model',
      'Walk the client through the 3D model', 'Check each concept against the brief with the client',
      'Record what the client does and does not like'] },
  { key: 'developed', label: 'Developed design', tool: 'model', produces: 'The agreed design, worked through and coordinated.',
    closing: 'The developed design is accepted to document.',
    starter: ['Test the ideas, refine the details and shape the final design', 'Ask the client for any further requirements now',
      'Agree priorities for time, quality and cost, and who makes the final decisions',
      'Estimate the cost, with a quantity surveyor if one is engaged',
      'Work out whether resource consent is needed and who will seek it',
      'Update the plan model to the agreed design', 'Coordinate with the other consultants', 'Check the model against the drawings'] },
  { key: 'detailed', label: 'Detailed design', tool: 'consent', produces: 'The drawings and documents for consent and for building.',
    closing: 'The documents are accepted as ready to issue.',
    starter: ['Take the design to the level of detail a contractor needs to assess the full scope: construction details, materials, components, systems and finishes',
      'Check the detailed design against the Agreement for Architects Services', 'Gather the consent bundle',
      'Communicate with the building consent authority about the project', 'Answer requests for information',
      'Help the client choose a builder and other contractors, by tender if that is the method'] },
  { key: 'contract', label: 'Contract administration', tool: 'site_log', produces: 'A running record of the building contract.',
    closing: 'The contract records are accepted as up to date.',
    starter: ['Ask the client about any preferences for the form of contract or the financing', 'Set up the variations register',
      'Manage the contractual and financial transactions during construction',
      'Record changes and unforeseen matters that need contractual consideration'] },
  { key: 'observation', label: 'Project observation', tool: 'site_log', produces: 'A dated record of what was seen on site.',
    closing: 'The site observation record is accepted as complete.',
    starter: ['Agree with the client how often the architect is on site', 'Visit the site and observe the quality of construction',
      'Log each site visit', 'Monitor the construction contracts that are in place', 'Point out any potential issues as they arise'] },
  { key: 'completion', label: 'Completion', tool: 'close_out', produces: 'Defects closed out and the records handed over.',
    closing: 'The defects list and the handover records are accepted as closed out.',
    starter: ['Assess the construction when the main contractor advises it is practically complete', 'Walk the finished building with the client',
      'Give a detailed list of the remaining work', 'Collect the trade warranties from the main contractor',
      'Secure the code compliance certificate for the client', 'Help administer the final payments to contractors',
      'Issue the main contractor with a defects liability certificate', 'Hand over the record documents'] },
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

// ---- sources ----------------------------------------------------------------------------------------------------------
// Every sourced item below was written from an official page opened and read on READ_ON. Nothing here is from memory,
// a blog or a supplier. The titles are assembl's short wording, not the source's own words: the link goes to the source.
// "version" is what the source said about its own date on the day it was read.
// When a source changes, read it again, change the items, and change READ_ON: do not change the date alone.
export const READ_ON = '2026-11-22';
export const SOURCES = {
  ba45: { name: 'Building Act 2004', publisher: 'New Zealand Legislation', version: 'version as at 8 October 2026',
    url: 'https://www.legislation.govt.nz/act/public/2004/0072/latest/DLM306381.html', read: READ_ON, council: '' },
  form2: { name: 'Building (Forms) Regulations 2004, Schedule 2, Form 2', publisher: 'New Zealand Legislation', version: 'version as at 7 July 2026',
    url: 'https://www.legislation.govt.nz/regulation/public/2004/0385/latest/DLM296493.html', read: READ_ON, council: '' },
  mbie_apply: { name: 'Building Performance, “Apply for building consent”', publisher: 'Ministry of Business, Innovation and Employment', version: 'last updated 9 September 2026',
    url: 'https://www.building.govt.nz/projects-and-consents/apply-for-building-consent', read: READ_ON, council: '' },
  mbie_support: { name: 'Building Performance, “Support your consent application”', publisher: 'Ministry of Business, Innovation and Employment', version: 'last updated 9 September 2026',
    url: 'https://www.building.govt.nz/projects-and-consents/apply-for-building-consent/support-your-consent-application', read: READ_ON, council: '' },
  ac1011: { name: 'AC1011 (v23) Lodgement Checklist: Residential', publisher: 'Auckland Council', version: 'December 2025',
    url: 'https://www.aucklandcouncil.govt.nz/content/dam/ac/docs/building-and-consents/ac1011-lodgement-checklist-residential.pdf', read: READ_ON, council: 'Auckland Council' },
  nzia: { name: 'NZ Institute of Architects, “The design process”', publisher: 'Te Kāhui Whaihanga New Zealand Institute of Architects', version: 'no date shown on the page',
    url: 'https://www.nzia.co.nz/learn/working-with-an-architect/the-design-process/', read: READ_ON, council: '' },
};

/** The source an item carries on its own row, so an exported project still says where each item came from. */
export function sourceRef(key, id, clause, title) {
  const src = SOURCES[key];
  if (!src) throw new Error(`Unknown source: ${key}`);
  return { id: `${key}.${id}`, key, name: src.name, clause, url: src.url, version: src.version, read: src.read, council: src.council, title };
}
/** "Building Act 2004, section 45(1)(a)" */
export const sourceLabel = (ref) => (ref ? `${ref.name}${ref.clause ? `, ${ref.clause}` : ''}` : '');
/** true when a practice has reworded an item that came from a source */
export const isEdited = (row) => !!row?.source_ref && clean(row.title) !== clean(row.source_ref.title);
export const AUCKLAND = 'Auckland Council';

// The consent bundle. Two parts:
//   - what the Building Act and the prescribed application form ask for, anywhere in New Zealand;
//   - what Auckland Council's residential lodgement checklist adds. Other councils publish their own and differ.
// It is a list of what the sources name. It is not a statement of what any one job needs, and it is not complete:
// section 45 also covers modular components, national multiple-use approvals and self-certified plumbing and
// drainlaying, and Auckland's checklist has sections for pools, solid fuel heaters, water heaters, demolition,
// vehicle crossings and engineering plan approval that are left out here. Auckland's checklist marks some items as
// required and others as strongly recommended; that marking is not carried here.
const C = (key, id, clause, title) => ({ title, source_ref: sourceRef(key, id, clause, title) });
export const CONSENT_SOURCED = [
  C('ba45', '1a', 'section 45(1)(a)', 'Application on the prescribed form (Form 2)'),
  C('mbie_apply', 'details', 'what the application must include', 'On the form: where the building work is, what it is, its estimated value, any change of use and any earlier consents for the project'),
  C('ba45', '1b', 'section 45(1)(b)', 'Plans and specifications'),
  C('form2', 'owner', '“The owner”', 'Evidence of ownership: record of title, lease, agreement for sale and purchase, or another document showing the legal owner'),
  C('form2', 'agent', '“Agent”', 'Details of the owner’s authorisation, if an agent applies for the owner'),
  C('form2', 'code', '“Building consent”', 'The means of compliance with the building code, listed clause by clause, and any waiver or modification asked for'),
  C('mbie_support', 'alt', '“Alternative solutions”', 'Evidence for any alternative solution, where the design departs from an acceptable solution or verification method'),
  C('form2', 'certs', '“Attachments”', 'Current product certificates, if the design relies on them'),
  C('ba45', '2-3', 'section 45(2) and (3)', 'Certificate of work from each licensed building practitioner who carried out or supervised design work that is restricted building work'),
  C('ba45', '1e', 'section 45(1)(e)', 'Names of the licensed building practitioners who will carry out or supervise restricted building work, as far as known'),
  C('ba45', '5', 'section 45(5)', 'Statutory declaration of owner-builder status, if an owner-builder does restricted building work or its design'),
  C('ba45', '1f', 'section 45(1)(f)', 'The project information memorandum, if one was applied for and issued, with any development contribution notice and section 37 certificate'),
  C('ba45', '1g', 'section 45(1)(g)', 'List of specified systems, if the work needs a compliance schedule or changes one'),
  C('ba45', '1d', 'section 45(1)(d)', 'Fees and charges set by the building consent authority'),
  C('ba45', '1c', 'section 45(1)(c)', 'Any other information the building consent authority reasonably requires'),
  C('ac1011', 'checklist', '“Guidance information”', 'The council’s own lodgement checklist (AC1011), filled in'),
  C('ac1011', 'title', '“General items”', 'Record of title no older than 90 days, with all consent notices and encumbrances'),
  C('ac1011', 'fee', '“General items”', 'Evidence that the application fee has been paid'),
  C('ac1011', 'spec', '“General items”', 'Project specifications that are complete and specific to the site'),
  C('ac1011', 'site-plan', '“Site plan”', 'Site plan at 1:100 (urban) or 1:200 (rural), with existing and proposed drainage and the datum stated'),
  C('ac1011', 'foundation', '“Foundation plan”', 'Foundation plan'),
  C('ac1011', 'floor', '“Floor plan”', 'Floor plan showing the existing and proposed layout and use, with finished floor levels'),
  C('ac1011', 'bracing', '“Bracing plan”', 'Bracing plan: calculations, specifications and layout'),
  C('ac1011', 'elevations', '“Elevations”', 'Elevations for each external wall'),
  C('ac1011', 'sections', '“Cross-sections”', 'At least two cross-sections, through the length and the width of the building'),
  C('ac1011', 'roof', '“Roof plan and roof framing plan”', 'Roof plan and roof framing plan'),
  C('ac1011', 'plumbing', '“Plumbing and drainage plan”', 'Plumbing and drainage plan'),
  C('ac1011', 'envelope', '“Building envelope”', 'Building envelope: an E2/AS1 risk matrix for each elevation, and details of the roof and wall junctions'),
  C('ac1011', 'sed', '“Specific engineered design (SED)”', 'Engineering calculations and drawings, with producer statements, where there is specific engineered design'),
  C('ac1011', 'geotech', '“B1 geotechnical engineering (foundation design) reports”', 'Geotechnical reports, where the checklist asks for them'),
  C('ac1011', 'surface-water', '“E1 surface water”', 'Surface water: site drainage plans, and stormwater and flooding reports where they apply'),
  C('ac1011', 'h1', '“Other documentation”', 'Energy efficiency (H1) report and calculations'),
  C('ac1011', 'wet', '“Other documentation”', 'Waterproofing details, linings and finishes for wet areas'),
  C('ac1011', 'rc', '“Planning information”', 'Copy of the approved resource consent, its conditions and stamped plans, if there is one'),
  C('ac1011', 'watercare', '“Watercare Approvals”', 'Approval from Watercare or another network operator, if building over or close to a public drain or trunk line'),
];
// kept under its old name: the titles of the consent list a new project starts with
export const CONSENT_STARTER = CONSENT_SOURCED.map((c) => c.title);
// The completion checklist is still assembl's own starter wording. No official source was read for it.
export const COMPLETION_STARTER = ['Final walk through with the client', 'Defects closed out', 'Manuals and warranties handed over', 'Record drawings filed'];

// Which of each stage's tasks come from the Institute's page. The clause is the heading on that page.
const NZIA_HEADING = { predesign: '1. Predesign', concept: '2. Concept design', developed: '3. Developed design', detailed: '4. Detailed design', contract: '5. Contract administration', observation: '6. Project Observation', completion: '7. Completion' };
export const NZIA_TASKS = {
  predesign: ['Hold the first meeting or meetings with the client', 'Gather the key information: certificate of title, drainage plans, zoning and town planning information',
    'Agree with the client who collects which information', 'Have the site surveyed for contours and boundaries, if a survey is needed', 'Check for issues with existing planting, water courses and soil type'],
  concept: ['Develop concepts from the project scope, the budget and the client’s requirements', 'Show a range of solutions to the brief as drawings, sketches, renderings or models',
    'Check each concept against the brief with the client', 'Record what the client does and does not like'],
  developed: ['Test the ideas, refine the details and shape the final design', 'Ask the client for any further requirements now', 'Agree priorities for time, quality and cost, and who makes the final decisions',
    'Estimate the cost, with a quantity surveyor if one is engaged', 'Work out whether resource consent is needed and who will seek it'],
  detailed: ['Take the design to the level of detail a contractor needs to assess the full scope: construction details, materials, components, systems and finishes',
    'Check the detailed design against the Agreement for Architects Services', 'Communicate with the building consent authority about the project', 'Help the client choose a builder and other contractors, by tender if that is the method'],
  contract: ['Ask the client about any preferences for the form of contract or the financing', 'Manage the contractual and financial transactions during construction', 'Record changes and unforeseen matters that need contractual consideration'],
  observation: ['Agree with the client how often the architect is on site', 'Visit the site and observe the quality of construction', 'Monitor the construction contracts that are in place', 'Point out any potential issues as they arise'],
  completion: ['Assess the construction when the main contractor advises it is practically complete', 'Give a detailed list of the remaining work', 'Collect the trade warranties from the main contractor',
    'Secure the code compliance certificate for the client', 'Help administer the final payments to contractors', 'Issue the main contractor with a defects liability certificate'],
};
/** the tasks a stage starts with: each has a title, where it came from ("origin"), and its source if it has one */
export function stageTasks(key) {
  const def = stageDef(key), sourced = NZIA_TASKS[key] ?? [];
  return (def?.starter ?? []).map((title) => {
    const n = sourced.indexOf(title);
    return n < 0 ? { title, origin: 'starter' } : { title, origin: 'source', source_ref: sourceRef('nzia', `${key}.${n + 1}`, NZIA_HEADING[key], title) };
  });
}
/** sourced items a project's list does not have yet: for projects made before the lists were sourced */
export function missingSourced(b, list, stageKey) {
  const have = new Set((list === 'consent' ? b.checklist : b.tasks).map((r) => r.source_ref?.id).filter(Boolean));
  const all = list === 'consent' ? CONSENT_SOURCED : stageTasks(stageKey).filter((t) => t.source_ref);
  return all.filter((x) => !have.has(x.source_ref.id));
}
export const consentRow = (pid, c) => ({ id: newId('c'), project_id: pid, stage: 'detailed', list: 'consent', title: c.title, status: 'needed', document_id: '', note: '', origin: 'source', source_ref: { ...c.source_ref } });
export const taskRow = (pid, stage, t) => ({ id: newId('t'), project_id: pid, stage, title: t.title, owner: '', status: 'todo', due: '', note: '', origin: t.origin, ...(t.source_ref ? { source_ref: { ...t.source_ref } } : {}) });

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
 * The 3D page accepts a plan in three ways:
 *   - a link to a .json the lab hosts beside its pages (?plan=<file>): a hosted model gets a direct link;
 *   - the plan it kept in the tab's session storage, which it reopens when its address has ?fin (see twinHandoff):
 *     a model whose file is kept in this browser is handed across that way, with no second choosing;
 *   - a file the person chooses or drops on that page (?drop=1): the only door left when the file is not kept here.
 */
export function twinLink(model) {
  if (!model?.fingerprint) return null;
  const hosted = HOSTED_MODELS.find((m) => m.fingerprint === model.fingerprint);
  if (hosted) return { direct: true, href: `${TWIN_PAGE}?plan=${hosted.file_name}` };
  if (model.file?.id) return { direct: false, handoff: true, href: TWIN_HANDOFF_HREF };
  return { direct: false, href: `${TWIN_PAGE}?drop=1` };
}

// Handing a practice's own plan model to the 3D page (plan-studio/twins/src/twin/projectPlan.ts, chooser):
// it keeps a dropped plan in the tab's session storage under KEEP as JSON { plan, name }, and reads it back only when
// the address has ?fin (its finishes card reloads the page that way). A tab opened from this one by a link with
// rel="opener" starts with a copy of this tab's session storage, so writing the same entry here and opening
// ?fin= there makes the 3D page open that model. tests/architecture/handoff.test.mjs checks this against its source.
export const TWIN_KEEP_KEY = 'assembl-twin-dropped-plan';
export const TWIN_HANDOFF_HREF = `${TWIN_PAGE}?fin=`;
/** What to put in session storage, and the address to open, so the 3D page opens this plan model. */
export function twinHandoff(planText, name) {
  let plan;
  try { plan = typeof planText === 'string' ? JSON.parse(planText) : planText; } catch { throw new Error('The kept file is not JSON, so it cannot be opened in 3D.'); }
  if (!plan || typeof plan !== 'object' || !Array.isArray(plan.buildings)) throw new Error('The kept file has no buildings in it, so it cannot be opened in 3D.');
  return { key: TWIN_KEEP_KEY, value: JSON.stringify({ plan, name: String(name || 'Plan model') }), href: TWIN_HANDOFF_HREF };
}

// ---- a run report handed over from the 3D page ----------------------------------------------------------------------------
// The 3D page's "Send to a project" (plan-studio/twins/src/twin/planRunUI.ts, sendToProject) writes one entry in its tab's
// session storage under PLAN_RUN_KEY and opens this page in a new tab, which starts with a copy of that storage. Nothing
// is saved here until a person chooses the project. The report is added as a document with its text file kept; the model
// is attached only when the project has none, so a model already on the project is never replaced by a hand-over.
// tests/plan-run/handoff.test.mjs checks the key and the shape against the 3D page's source.
export const PLAN_RUN_KEY = 'assembl-plan-run-handoff';
export const PLAN_RUN_TYPE = 'assembl.plan-run-handoff.v1';
export const RUN_REPORT_TYPE = 'assembl.plan-run.v1';
export const RUN_STANDING = 'A pre-check prepared by software for a person to review. It is not a compliance decision or a professional sign-off.';
/** Read the hand-over entry. Throws a plain-worded Error when it is not one, or when the model and the report differ. */
export function readPlanRun(text, fingerprintOf) {
  let h;
  try { h = typeof text === 'string' ? JSON.parse(text) : text; } catch { throw new Error('What the 3D page passed across is not readable, so nothing was added.'); }
  if (!h || h.type !== PLAN_RUN_TYPE || !h.report || h.report.type !== RUN_REPORT_TYPE) throw new Error('What the 3D page passed across is not a run report, so nothing was added.');
  const fp = String(h.report.model?.fingerprint ?? '');
  if (!fp || fp !== String(h.fingerprint ?? '')) throw new Error('The run report does not say which model version it is for, so nothing was added.');
  const plan = h.plan && typeof h.plan === 'object' && Array.isArray(h.plan.buildings) ? h.plan : null;
  if (plan && fingerprintOf && fingerprintOf(plan) !== fp) throw new Error(`The model passed across is not the version the report was run on (${fp}), so nothing was added.`);
  const steps = Array.isArray(h.report.steps) ? h.report.steps : [];
  const count = (s) => steps.filter((x) => x.status === s).length;
  const code = steps.find((x) => x.id === 'code');
  return {
    fingerprint: fp, name: clean(h.name) || 'plan-model.json', title: clean(h.report.model?.title) || 'Plan model', revision: clean(h.report.model?.revision) || 'not stated',
    drawings: clean(h.report.model?.drawings) || 'not stated', ranAt: String(h.report.ranAt ?? ''), plan, planText: plan ? JSON.stringify(plan) : null, text: String(h.text ?? ''), report: h.report,
    summary: `${steps.length} steps: ${count('done')} done, ${count('needs a person')} need a person, ${count('not run')} not run, ${count('failed')} failed.${code ? ` Pre-check: ${clean(code.summary)}` : ''}`,
    mustCheck: Array.isArray(h.report.personMustCheck) ? h.report.personMustCheck.length : 0,
  };
}
/** the stage a run report sits in: the design stage the project is in, or Concept design */
export function runReportStage(b) {
  const cur = (b?.stages ?? []).find((s) => s.status === 'in_progress' || s.status === 'awaiting_approval');
  return cur && (cur.key === 'concept' || cur.key === 'developed') ? cur.key : 'concept';
}
/** the document row for a run report (its file is kept apart, through the storage module) */
export function runReportDocument(pid, stage, h, now) {
  const at = nowIso(now);
  return { id: newId('d'), project_id: pid, stage, title: `Plan set check: ${h.title}`, kind: 'Report', version: h.fingerprint, date: (h.ranAt || at).slice(0, 10),
    source: `assembl plan drop tool, run report (${RUN_REPORT_TYPE}), model version ${h.fingerprint}`, note: `${RUN_STANDING} ${h.summary}`.slice(0, 400) };
}
export const runReportFileName = (h) => `plan-run-${h.fingerprint}-${(h.ranAt || '').slice(0, 10) || 'undated'}.txt`;

// ---- ids and small helpers --------------------------------------------------------------------------------------------
export function newId(prefix = '') {
  const u = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${u}` : u;
}
const nowIso = (now) => (now instanceof Date ? now : new Date(now ?? Date.now())).toISOString();
const clean = (s) => String(s ?? '').trim();
export const emptyBundle = () => ({ project: null, stages: [], tasks: [], documents: [], approvals: [], rfis: [], observations: [], variations: [], defects: [], checklist: [], activity: [] });

// ---- a new project ----------------------------------------------------------------------------------------------------
/** A project with its seven stages, each stage's tasks, the sourced consent list and the starter completion list. Predesign starts straight away. */
export function newProject({ name, client = '', now, id, sample = false } = {}) {
  const title = clean(name);
  if (title.length < 2) throw new Error('Give the project a name.');
  const at = nowIso(now), pid = id ?? newId('p');
  const b = emptyBundle();
  b.project = { id: pid, name: title, client: clean(client), stage: 'predesign', created_at: at, updated_at: at,
    site: { lat: null, lon: null, facts: [], fetched_at: null }, model: { fingerprint: '', drawings: '', revision: '', file_name: '', file: null } };
  if (sample) b.project.sample = true;
  b.stages = STAGES.map((s, i) => ({ id: `${pid}:${s.key}`, project_id: pid, key: s.key, status: i === 0 ? 'in_progress' : 'not_started', started_at: i === 0 ? at : null, done_at: null }));
  for (const s of STAGES) for (const t of stageTasks(s.key)) b.tasks.push(taskRow(pid, s.key, t));
  for (const c of CONSENT_SOURCED) b.checklist.push(consentRow(pid, c));
  for (const t of COMPLETION_STARTER) b.checklist.push({ id: newId('c'), project_id: pid, stage: 'completion', list: 'completion', title: t, status: 'needed', document_id: '', note: '', origin: 'starter' });
  return b;
}

export const SAMPLE_ID = 'p_sample-waiheke-house';
/** The sample: the example plan model the lab hosts, with no client, no site point and no approvals made up for it. */
export function sampleProject(now) {
  const b = newProject({ name: 'A house on Waiheke Island', client: '', now, id: SAMPLE_ID, sample: true });
  const m = HOSTED_MODELS[0];
  b.project.model = { fingerprint: m.fingerprint, drawings: m.drawings, revision: m.revision, file_name: m.file_name, file: null };
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
  b.project = { ...p, site: { lat: null, lon: null, facts: [], fetched_at: null, ...(p.site ?? {}) }, model: { fingerprint: '', drawings: '', revision: '', file_name: '', file: null, ...(p.model ?? {}) } };
  for (const k of LISTS) b[k] = Array.isArray(j[k]) ? j[k].filter((r) => r && typeof r === 'object' && typeof r.id === 'string') : [];
  if (j.files_included === true || Array.isArray(j.files)) b.files = bundleFiles(j); // only when the file says it carries files
  const keys = b.stages.map((s) => s.key);
  if (STAGE_KEYS.some((k) => !keys.includes(k))) throw new Error('The project in that file does not have all seven stages.');
  if (!STAGE_KEYS.includes(b.project.stage)) throw new Error('The project in that file is at a stage this page does not know.');
  return b;
}

/**
 * The file contents for a project: everything about it, and nothing about any other project.
 * "files" is the list of kept files with their contents (see store.exportProject). Leave it out and the export holds
 * the records only: each document still says which file it had, and the export says plainly the files are not in it.
 * "keptIn" says where the files stay when they are not included (the shared store passes the practice's shared records).
 */
export function writeBundle(b, now, files, keptIn = 'the browser they were kept in') {
  const withFiles = Array.isArray(files);
  const out = { type: BUNDLE_TYPE, exported_at: nowIso(now),
    note: `A project exported from assembl. architecture operations. It includes the site point if one was saved. ${withFiles ? `Files are included: ${files.length}.` : `Files are not included: only the records. The files stay in ${keptIn}.`} Approvals are a record of what named people said: not signatures and not a professional sign-off.`,
    files_included: withFiles, project: b.project };
  for (const k of LISTS) out[k] = b[k];
  if (withFiles) out.files = files;
  return out;
}

/** The kept files that came in a project file: each with an id, a name and its contents. Anything else is left out. */
export function bundleFiles(j) {
  return Array.isArray(j?.files) ? j.files.filter((f) => f && typeof f.id === 'string' && typeof f.name === 'string' && typeof f.data_base64 === 'string') : [];
}

/** Give a bundle new ids throughout, so it can sit beside the project it was exported from. */
export function copyBundle(b, now) {
  const pid = newId('p'), map = new Map(), fresh = (old, prefix) => { const n = newId(prefix); map.set(old, n); return n; };
  const c = emptyBundle();
  c.project = { ...structuredClone(b.project), id: pid, name: `${b.project.name} (imported copy)`, updated_at: nowIso(now) };
  c.stages = b.stages.map((s) => ({ ...s, id: `${pid}:${s.key}`, project_id: pid }));
  const P = { tasks: 't', documents: 'd', approvals: 'a', rfis: 'r', observations: 'o', variations: 'x', defects: 'f', checklist: 'c', activity: 'v' };
  for (const k of Object.keys(P)) c[k] = b[k].map((r) => ({ ...structuredClone(r), id: fresh(r.id, P[k]), project_id: pid }));
  for (const item of c.checklist) if (item.document_id) item.document_id = map.get(item.document_id) ?? '';
  // kept files get ids of their own too, and the records that point at them follow
  const fileId = (old) => { if (!map.has(old)) map.set(old, newId('file')); return map.get(old); };
  for (const d of c.documents) if (d.file?.id) d.file.id = fileId(d.file.id);
  if (c.project.model?.file?.id) c.project.model.file.id = fileId(c.project.model.file.id);
  if (Array.isArray(b.files)) c.files = b.files.map((f) => ({ ...f, id: fileId(f.id), project_id: pid, owner_id: f.owner_kind === 'model' ? pid : (map.get(f.owner_id) ?? f.owner_id) }));
  return c;
}

export const fileSlug = (name) => (clean(name).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project').slice(0, 48);
