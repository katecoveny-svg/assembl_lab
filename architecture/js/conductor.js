// The conductor: a small job runner for the agent team. It runs on this page, with no server of its own.
//
// A job is a plain record (JSON, so it can be kept with the project in the shared records) with ordered steps. Each step has a
// status: "waiting", "running", "needs a person", "done" or "failed" (a failed step always carries its reason). Rules:
//   - steps run one after another; the job stops at the first step that is not done
//   - a step that throws is run once more (one retry), and its attempts and reason are kept; then it is "failed"
//   - a step marked paid (it spends money at a provider) is never run again by the conductor. It waits as "needs a person" until a
//     person approves it, and when it fails it stays "failed" until a person retries it. Every paid request is counted in step.calls
//   - a step marked person (a gate: a person looks and says yes) waits as "needs a person" the same way, until approve(); it
//     costs nothing and is never approved by the conductor itself
//   - every change is written to the job's log (step, event, text, time), newest last, capped at LOG_LIMIT lines
//
// Where it runs, and what would move: this runs in the page (conductor.js), reads and writes through the project's records
// (intake.js keeps the job with the project, so it reaches the practice's shared records in Supabase, schema arch), and its one
// paid call goes through the Pages Function /api/plan-read, which already tries OpenAI, then Gemini, then Anthropic.
// Cloudflare Workflows would take over what the page cannot do alone: carrying on after the tab is closed, and running steps in the
// background. A Workflow is a Worker (not a Pages Function), so it would be its own small Worker with a binding. It is not switched on.
// Cloudflare's docs (Nov 2026): Workflows and Queues both have a Workers Free tier (Workflows: 100,000 requests a day shared with
// Workers, 10 ms CPU per invocation, 3,000 steps a day, state kept 3 days; Queues: 10,000 operations a day, messages kept 24 hours).
// Workers Paid is from US$5 a month per account (Workflows then 10 million requests, 30 million CPU ms and 500,000 steps a month
// included). Nothing here needs the paid plan today.
export const STATUS = Object.freeze({ waiting: 'waiting', running: 'running', person: 'needs a person', done: 'done', failed: 'failed' });
export const LOG_LIMIT = 200;
const iso = () => new Date().toISOString();
const running = new WeakSet();

/** a new job. steps: [{ id, label, paid?, person? }] in the order they run. */
export function createJob({ id, kind, project_id, steps }, now = iso) {
  if (!id || !kind || !Array.isArray(steps) || !steps.length) throw new Error('A job needs an id, a kind and steps.');
  const ids = steps.map((s) => s.id);
  if (new Set(ids).size !== ids.length || ids.some((s) => !s)) throw new Error('Each step needs its own id.');
  const t = now();
  return {
    v: 1, id: String(id), kind: String(kind), project_id: project_id ?? null, status: STATUS.waiting, created_at: t, updated_at: t,
    steps: steps.map((s) => ({ id: s.id, label: String(s.label ?? s.id), paid: !!s.paid, ...(s.person ? { person: true } : {}), status: STATUS.waiting, attempts: 0, calls: 0, reason: '', note: '', approved_by: '', started_at: null, ended_at: null })),
    log: [],
  };
}

/** the job's own status, from its steps */
export function jobStatus(job) {
  const st = job.steps.map((s) => s.status);
  if (st.includes(STATUS.running)) return STATUS.running;
  if (st.includes(STATUS.failed)) return STATUS.failed;
  if (st.includes(STATUS.person)) return STATUS.person;
  if (st.every((s) => s === STATUS.done)) return STATUS.done;
  return STATUS.waiting;
}

function note(job, step, event, text, now) {
  job.log.push({ at: now(), step: step?.id ?? '', event, text: String(text ?? '').slice(0, 300) });
  if (job.log.length > LOG_LIMIT) job.log.splice(0, job.log.length - LOG_LIMIT);
  job.updated_at = now(); job.status = jobStatus(job);
}

/**
 * Run the job from its first step that is not done. handlers[stepId] is a function, or { run, when, approval }:
 *   run({ job, step, log(text), paid(text) })  does the work; a paid step calls paid() before each paid request. May return { note }.
 *   when(job)      false: the step is not needed (it is marked done, "not needed")
 *   approval(job)  the sentence a person sees before a paid step may run
 * Returns the job. Never throws for a step's own failure: that is recorded as the step's reason.
 */
export async function runJob(job, handlers, { now = iso, onChange = () => {} } = {}) {
  if (running.has(job)) throw new Error('This job is already running.');
  running.add(job);
  const change = () => { try { onChange(job); } catch { /* the page's own redraw must not stop the job */ } };
  try {
    for (const step of job.steps) {
      if (step.status === STATUS.done) continue;
      if (step.status === STATUS.failed || step.status === STATUS.person) break;
      const h = typeof handlers[step.id] === 'function' ? { run: handlers[step.id] } : handlers[step.id];
      if (!h?.run) { step.status = STATUS.failed; step.reason = 'No one is set up to do this step.'; note(job, step, 'failed', step.reason, now); change(); break; }
      if (h.when && !h.when(job)) { step.status = STATUS.done; step.note = 'not needed'; step.ended_at = now(); note(job, step, 'skipped', 'Not needed.', now); change(); continue; }
      if ((step.paid || step.person) && !step.approved_by) {
        step.status = STATUS.person; step.reason = String(h.approval?.(job) ?? (step.paid ? 'This step costs money. A person has to say go.' : 'A person has to look at this and say yes.'));
        note(job, step, 'needs a person', step.reason, now); change(); break;
      }
      let ok = false;
      for (;;) {
        step.attempts += 1; step.status = STATUS.running; step.reason = ''; step.started_at ??= now();
        note(job, step, 'running', step.attempts > 1 ? `Again (attempt ${step.attempts}).` : 'Started.', now); change();
        try {
          const out = await h.run({ job, step, log: (t) => { note(job, step, 'log', t, now); change(); }, paid: (t) => { step.calls += 1; note(job, step, 'paid call', t || `Paid request ${step.calls}.`, now); } });
          step.status = STATUS.done; step.note = String(out?.note ?? ''); step.ended_at = now(); note(job, step, 'done', step.note || 'Done.', now); change(); ok = true; break;
        } catch (e) {
          const why = String(e?.message || e || 'It did not work.').slice(0, 300);
          if (!step.paid && step.attempts < 2) { note(job, step, 'failed once', why, now); continue; } // the one retry
          step.status = STATUS.failed; step.reason = why; step.ended_at = now();
          note(job, step, 'failed', step.paid ? `${why} A paid step is not run again until a person says so.` : why, now); change(); break;
        }
      }
      if (!ok) break;
    }
  } finally { running.delete(job); job.status = jobStatus(job); }
  change();
  return job;
}

/** a person says go to a paid step that is waiting. person: who (a name); the conductor never approves for anyone. */
export function approve(job, stepId, person, now = iso) {
  const step = job.steps.find((s) => s.id === stepId);
  if (!step) throw new Error('There is no such step.');
  if (!String(person ?? '').trim()) throw new Error('A person has to approve this.');
  if (step.status !== STATUS.person) throw new Error('This step is not waiting for a person.');
  step.approved_by = String(person).trim(); step.status = STATUS.waiting; step.reason = '';
  note(job, step, 'approved', `Approved by ${step.approved_by}.`, now);
  return job;
}

/** a person asks for a failed step to be run again. A paid step is approved by that same act and its attempts start again. */
export function retry(job, stepId, person, now = iso) {
  const step = job.steps.find((s) => s.id === stepId);
  if (!step) throw new Error('There is no such step.');
  if (!String(person ?? '').trim()) throw new Error('A person has to ask for this.');
  if (step.status !== STATUS.failed) throw new Error('Only a failed step can be run again.');
  step.status = STATUS.waiting; step.attempts = 0; step.reason = ''; step.ended_at = null;
  if (step.paid) step.approved_by = String(person).trim();
  note(job, step, 'retry', `Run again at ${String(person).trim()}'s request.`, now);
  return job;
}

/** a job read back from the records: a step that was running when the page closed did not finish, and says so */
export function recover(job, now = iso) {
  if (!job || job.v !== 1 || !Array.isArray(job.steps)) return null;
  for (const s of job.steps) if (s.status === STATUS.running) { s.status = STATUS.failed; s.reason = 'The page was closed before this step finished.'; s.ended_at = now(); note(job, s, 'failed', s.reason, now); }
  job.status = jobStatus(job);
  return job;
}

/** the numbers a person wants: how far along, and how many paid requests were made */
export function summary(job) {
  const done = job.steps.filter((s) => s.status === STATUS.done).length;
  return { done, total: job.steps.length, paid_calls: job.steps.reduce((n, s) => n + (s.calls || 0), 0), status: jobStatus(job) };
}
