// What the intake agent keeps with a project: project.intake. It goes with the project record, so in a practice's shared records it
// is kept in the project's "extra" column (schema arch) with no table of its own, the way site_sources is.
//   { v: 1, updated_at, by,
//     files:    [{ path, name, size, kind, ext, problem, pdf, pages, sha, file_id, kept }]   kept: '' | 'kept' | 'already kept' | a reason it was not
//     sheets:   [sheet record] (intake-rules.js sheetProblem: a record that fails is dropped, never kept)
//     register: { found, rows: [{ number, title, rev, date, scale, file, page, how? }], from: [{ file, page }] }
//     index:    { missing: [{ number, title, rev, from }], unlisted: [sheet id], unreadable, found }
//     model:    { asked, read, failed }
//     job:      the conductor's job (conductor.js) }
// Drawings, text and names stay in the practice's own records. Nothing here is sent anywhere but the one sheet picture a person approved.
import { sheetProblem, buildIndex } from './intake-rules.js';
import { recover } from './conductor.js';

export const EMPTY = Object.freeze({ v: 1, updated_at: null, by: '', files: [], sheets: [], register: { found: false, rows: [], from: [] }, index: { missing: [], unlisted: [], unreadable: 0, found: false }, model: { asked: 0, read: 0, failed: 0 }, job: null });
const LIMIT = 2000;
const text = (v, n = 300) => (typeof v === 'string' ? v.slice(0, n) : '');
const int = (v) => (Number.isInteger(v) && v >= 0 ? v : 0);

/** the record from a finished or paused run. state: intakeRun's state; job: the conductor's job. */
export function toRecord(state, job, by = '', now = () => new Date().toISOString()) {
  const sheets = state.sheets.map(({ ...s }) => s), register = state.register ?? EMPTY.register, idx = buildIndex(sheets, register);
  return normalIntake({
    v: 1, updated_at: now(), by,
    files: state.files.map((f) => ({ path: f.path, name: f.name, size: f.size, kind: f.kind, ext: f.ext, problem: f.problem, pdf: f.pdf ?? '', pages: f.pages ?? 0, sha: f.sha ?? '', file_id: f.file_id ?? '', kept: f.kept ?? '' })),
    sheets: idx.sheets, register, index: { missing: idx.missing, unlisted: idx.unlisted, unreadable: idx.unreadable, found: idx.found },
    model: { asked: state.model?.asked ?? 0, read: state.model?.read ?? 0, failed: state.model?.failed ?? 0 }, job: job ? JSON.parse(JSON.stringify(job)) : null,
  });
}

/** whatever was saved, as the record says: anything that does not fit is dropped */
export function normalIntake(v) {
  const o = v && typeof v === 'object' && !Array.isArray(v) && v.v === 1 ? v : null;
  if (!o) return structuredClone(EMPTY);
  const files = (Array.isArray(o.files) ? o.files : []).slice(0, LIMIT).filter((f) => f && typeof f.path === 'string' && typeof f.kind === 'string').map((f) => ({ path: text(f.path, 500), name: text(f.name, 260), size: int(f.size), kind: text(f.kind, 20), ext: text(f.ext, 12), problem: text(f.problem), pdf: text(f.pdf, 12), pages: int(f.pages), sha: /^[0-9a-f]{64}$/.test(f.sha) ? f.sha : '', file_id: text(f.file_id, 80), kept: text(f.kept) }));
  const sheets = (Array.isArray(o.sheets) ? o.sheets : []).slice(0, LIMIT).filter((s) => !sheetProblem(s));
  const reg = o.register && typeof o.register === 'object' ? o.register : {};
  const rows = (Array.isArray(reg.rows) ? reg.rows : []).slice(0, LIMIT).filter((r) => r && typeof r.number === 'string' && typeof r.title === 'string').map((r) => ({ number: text(r.number, 24), title: text(r.title, 160), rev: typeof r.rev === 'string' ? r.rev.slice(0, 12) : null, date: typeof r.date === 'string' ? r.date.slice(0, 24) : null, scale: typeof r.scale === 'string' ? r.scale.slice(0, 40) : null, file: text(r.file, 500), page: int(r.page), ...(r.how === 'model' ? { how: 'model' } : {}) }));
  const ix = o.index && typeof o.index === 'object' ? o.index : {};
  const missing = (Array.isArray(ix.missing) ? ix.missing : []).slice(0, LIMIT).filter((m) => m && typeof m.number === 'string').map((m) => ({ number: text(m.number, 24), title: text(m.title, 160), rev: typeof m.rev === 'string' ? m.rev.slice(0, 12) : null, from: text(m.from, 520) }));
  const md = o.model && typeof o.model === 'object' ? o.model : {};
  return {
    v: 1, updated_at: typeof o.updated_at === 'string' ? o.updated_at : null, by: text(o.by, 80), files, sheets,
    register: { found: !!reg.found && rows.length > 0, rows, from: (Array.isArray(reg.from) ? reg.from : []).slice(0, 50).filter((x) => x && typeof x.file === 'string').map((x) => ({ file: text(x.file, 500), page: int(x.page) })) },
    index: { missing, unlisted: (Array.isArray(ix.unlisted) ? ix.unlisted : []).filter((x) => typeof x === 'string').slice(0, LIMIT), unreadable: int(ix.unreadable), found: !!ix.found },
    model: { asked: int(md.asked), read: int(md.read), failed: int(md.failed) },
    job: o.job && o.job.v === 1 && Array.isArray(o.job.steps) ? recover(structuredClone(o.job)) : null,
  };
}

/** change the project's intake record and save it with the project (as site_sources is) */
export async function withIntake(store, projectId, change, now = () => new Date().toISOString()) {
  const pr = await store.get('project', projectId);
  if (!pr) return null;
  const next = normalIntake(await change(normalIntake(pr.intake)));
  pr.intake = next; pr.updated_at = now();
  await store.save('project', pr);
  return next;
}
