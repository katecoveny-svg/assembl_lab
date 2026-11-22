// A project at a glance, for its tile and its header: where it is in the seven stages, one status, and the next
// action in a few words. Worked out from the same rules as model.js nextAction; nothing here changes a record.
//
//   status  'go'       work is under way and nothing is held up (or all seven stages are done)
//           'needs'    something is needed before work can move: a site lookup, a model, replies, a step to take
//           'waiting'  waiting on a named person's approval
import { STAGE_KEYS, stageDef, stageNumber, nextAction, currentStage, allDone } from './model.js';

export const STATUS_WORD = { go: 'Under way', needs: 'Needs something', waiting: 'Waiting on a person' };

/** each stage as one segment: 'done' | 'now' (in progress) | 'wait' (awaiting approval) | 'todo' */
export function segments(stages = []) {
  return STAGE_KEYS.map((k) => {
    const s = stages.find((x) => x.key === k)?.status;
    return s === 'done' ? 'done' : s === 'in_progress' ? 'now' : s === 'awaiting_approval' ? 'wait' : 'todo';
  });
}

/** b: a project bundle (at least project, stages, tasks, rfis, approvals) */
export function glance(b) {
  const segs = segments(b?.stages ?? []), done = segs.filter((s) => s === 'done').length;
  if (b?.project && allDone(b)) return { status: 'go', word: 'All seven done', next: 'Print the client pack', stage: null, segs, done };
  const st = b?.project ? currentStage(b) : null;
  if (!st) return { status: 'needs', word: STATUS_WORD.needs, next: 'No stage in progress', stage: null, segs, done };
  const n = nextAction(b), def = stageDef(st.key), stage = { key: st.key, n: stageNumber(st.key), label: def.label, status: st.status };
  const open = b.tasks.filter((t) => t.stage === st.key && t.status !== 'done'), blocked = open.filter((t) => t.status === 'blocked').length;
  const say = (status, next) => ({ status, word: STATUS_WORD[status], next, stage, segs, done });
  switch (n?.kind) {
    case 'approve': return say('waiting', 'Approval from a named person');
    case 'done': return say('needs', 'Approved: mark the stage done');
    case 'ask': return say('needs', 'Tasks done: ask for approval');
    case 'tool': {
      if (def.tool === 'site') return say('needs', 'Look up the site facts');
      if (def.tool === 'model') return say('needs', 'Attach the plan model');
      const r = b.rfis.filter((x) => x.status === 'open').length;
      return say('needs', `${r} request${r === 1 ? '' : 's'} to answer`);
    }
    default:
      if (blocked) return say('needs', `${blocked} blocked task${blocked === 1 ? '' : 's'}`);
      return say('go', open.length === 1 ? 'One task left' : `${open.length} open tasks`);
  }
}
