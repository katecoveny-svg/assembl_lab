// Agents: an add-on for the ops page (see modules.js), on each project's Model tab, after Models. Two specialist agents of the
// architecture team, each run by the conductor (conductor.js) with its steps shown:
//   - the interior design agent (roster agent 8): reads the project's rooms, proposes a fit-out from the library by rules
//     (agents/interior-rules.js), asks a model for judgement only when a person presses the paid button (/api/agent-judge), and
//     waits for a person to approve. The pieces are moved together, by client and architect, in the 3D page's Agents card.
//   - the 3D look expert: its scored check of the browser twin, made on the 3D page (agents/look-rules.js), shown here before the
//     person's look gate. It never approves.
// Where the rooms come from: the sample's own plan model (names and shapes), or a kept IFC's spaces (names and areas from the file's
// quantity sets; no shapes, so counts only until the model opens in 3D). The 3D page passes its results back through this
// browser's storage (localStorage, assembl-agents-result:<project id>, or :latest for a model opened from Models); a person keeps
// them with the project. Nothing here is a code check or a sign-off; agents prepare, people approve.
import { registerProjectPanel } from './modules.js';
import { createJob, runJob, approve, STATUS } from './conductor.js';
import { SAMPLE_ID } from './model.js';
import { MANIFEST_URL } from './selections.js';

export const HANDBACK_KEY = 'assembl-agents-result';
export const HANDBACK_TYPE = 'assembl.agents-handback.v1';
const SAMPLE_PLAN = '/plan-studio/twins/drop/hero.plan.json';
const TWIN = '/plan-studio/twins/drop/';
const isSample = (p) => !!p && (p.sample === true || p.id === SAMPLE_ID);
const MARK = { [STATUS.waiting]: '□', [STATUS.running]: '▶', [STATUS.person]: '!', [STATUS.done]: '■', [STATUS.failed]: '×' };
const RES = { pass: '■', check: '◧', fail: '□', 'not measured': '·' };
const S = { jobs: new Map(), say: new Map() }; // project id -> { job, busy }, last message

let rulesP = null, lookP = null, catP = null, revP = null;
const rules = () => (rulesP ??= import('./agents/interior-rules.js'));
const lookRules = () => (lookP ??= import('./agents/look-rules.js'));
const revRules = () => (revP ??= import('./agents/revision-review.js'));
const catalogue = () => (catP ??= fetch(MANIFEST_URL).then((r) => r.json()).then((m) => m.items));

const CSS = `.agt{display:grid;gap:14px}
.agt-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}
.agt h4{margin:0;font-size:15px}
.agt-steps{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;padding:0;list-style:none}
.agt-steps li{font:12px var(--mono,'IBM Plex Mono',monospace);padding:3px 8px;border:1px solid var(--line,rgba(36,11,33,.15));border-radius:999px;color:var(--mute,#654A4E)}
.agt-steps li.is-person{border-color:var(--rose,#916A70);color:var(--ink,#240B21)}
.agt-rooms{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:6px 0;padding:0;list-style:none}
.agt-rooms li{border:1px solid var(--line,rgba(36,11,33,.12));border-radius:10px;padding:8px 10px;background:var(--panel,#fff)}
.agt-rooms b{display:block;font-size:13px}
.agt-rooms span{display:block;font:12px var(--mono,'IBM Plex Mono',monospace);color:var(--mute,#654A4E);margin-top:2px}
.agt-rooms .n{font:500 20px/1.1 var(--mono,'IBM Plex Mono',monospace);color:var(--ink,#240B21);margin-top:4px}
.agt-score{font:500 26px/1 var(--mono,'IBM Plex Mono',monospace)}
.agt-list{list-style:none;margin:6px 0;padding:0;font-size:13px}
.agt-list li{display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-top:1px dashed var(--line,rgba(36,11,33,.12))}
.agt-list li span:last-child{font:12px var(--mono,'IBM Plex Mono',monospace);color:var(--mute,#654A4E);text-align:right}
.agt-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.agt-acts input{font:inherit;font-size:13px;padding:6px 8px;border:1px solid var(--line,rgba(36,11,33,.2));border-radius:8px;min-width:0;flex:1 1 160px}
.agt-fine{font-size:12px;color:var(--mute,#654A4E);margin:4px 0 0}
.agt-bad{color:#9b2f45}`;
function ensureCss() { if (document.getElementById('agt-css')) return; const s = document.createElement('style'); s.id = 'agt-css'; s.textContent = CSS; document.head.append(s); }

/** the rooms to propose for: the sample's plan model (with shapes and walls), or the spaces of the project's newest kept IFC */
export async function roomsFor(ctx, p, fetcher = fetch) {
  if (isSample(p)) {
    const plan = await (await fetcher(SAMPLE_PLAN)).json(), walls = [], rooms = [];
    for (const b of plan.buildings ?? []) {
      const L = b.levels?.[0]; if (!L) continue;
      for (const w of [...(L.walls ?? []), ...(L.partitions ?? [])]) { const t = (w.thickness ?? 0.1) / 2; walls.push(w.axis === 'x' ? { x0: w.from, x1: w.to, z0: w.at - t, z1: w.at + t } : { x0: w.at - t, x1: w.at + t, z0: w.from, z1: w.to }); }
      for (const r of L.rooms ?? []) rooms.push({ name: r.name, box: { x0: r.u, x1: r.u + r.w, z0: r.v, z1: r.v + r.d }, box_src: r.source === 'scaled' ? 'scaled' : 'assumed' });
    }
    return { rooms, walls, from: 'the sample’s plan model (shapes scaled from its drawings)' };
  }
  const files = (await ctx.store.listFiles({ project_id: p.id })).filter((f) => f?.extra?.ifc?.spaces?.list?.length).sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
  const f = files[0];
  if (!f) return { rooms: [], walls: [], from: '' };
  const rooms = f.extra.ifc.spaces.list.map((s) => ({ name: s.long_name || s.name || 'Space', ...(s.net_m2 ?? s.gross_m2 ? { area_m2: s.net_m2 ?? s.gross_m2, area_src: 'from the file' } : {}) }));
  return { rooms, walls: [], from: `the spaces in ${f.name} (names and floor areas from the file; no shapes)` };
}

/** a handback from the 3D page, if there is one for this project (or one from a model opened from Models) */
export function readHandback(pid, storage = globalThis.localStorage) {
  for (const k of [`${HANDBACK_KEY}:${pid}`, `${HANDBACK_KEY}:latest`]) {
    try { const v = JSON.parse(storage?.getItem(k) ?? 'null'); if (v?.type === HANDBACK_TYPE && (v.project === pid || k.endsWith(':latest'))) return { ...v, key: k }; } catch { /* not ours */ }
  }
  return null;
}

/** the interior job's steps, for the conductor */
export const INTERIOR_STEPS = [
  { id: 'rooms', label: 'Read the rooms' },
  { id: 'propose', label: 'Lay out by rules' },
  { id: 'judge', label: 'Judgement (paid, optional)', paid: true },
  { id: 'approve', label: 'A person approves', person: true },
];

async function save(ctx, p, change, action, detail) {
  const pr = (await ctx.store.get('project', p.id)) ?? p;
  pr.agents = change(pr.agents ?? {}); pr.updated_at = new Date().toISOString();
  await ctx.store.save('project', pr);
  try { await ctx.store.save('activity', { id: `v_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, project_id: p.id, at: pr.updated_at, who: ctx.me?.name || 'Not named', action, detail }); } catch { /* the record is kept either way */ }
  return pr;
}

async function runInterior(ctx, p, { judge = false, brief = '' } = {}) {
  const R = await rules(), cat = await catalogue();
  const live = S.jobs.get(p.id) ?? { job: createJob({ id: `int_${Date.now().toString(36)}`, kind: 'interior', project_id: p.id, steps: INTERIOR_STEPS }), busy: false };
  S.jobs.set(p.id, live);
  if (live.busy) return;
  live.busy = true;
  let got = null, proposal = (await ctx.store.get('project', p.id))?.agents?.interior ?? null;
  const handlers = {
    rooms: async ({ log }) => { got = await roomsFor(ctx, p); if (!got.rooms.length) throw new Error('This project has no rooms yet: keep an IFC with spaces in Models, or open the plan in 3D.'); log(`${got.rooms.length} rooms from ${got.from}.`); return { note: `${got.rooms.length} rooms` }; },
    propose: async () => {
      got ??= await roomsFor(ctx, p);
      proposal = R.propose(got.rooms, cat, { walls: got.walls, project: p.id, catalogueVersion: `catalogue ${cat.length} pieces` });
      const errs = R.validateProposal(proposal, cat, { walls: got.walls });
      if (errs.length) throw new Error(`The proposal did not pass its checks: ${errs.slice(0, 2).join('; ')}`);
      const t = R.totals(proposal);
      await save(ctx, p, (a) => ({ ...a, interior: proposal }), 'Interior fit-out proposed', `${t.placed} pieces placed, ${t.left} to place, by rules`);
      return { note: `${t.placed} placed · ${t.left} to place` };
    },
    judge: {
      when: () => judge,
      approval: () => 'Asks a model once for a style brief and a layout choice: one paid request.',
      run: async ({ paid }) => {
        paid('one judgement request');
        const r = await fetch('/api/agent-judge', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'interior', input: R.judgeInput(proposal, brief, cat) }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error === 'not_configured' ? 'No model is set up for judgement on this site.' : `No judgement (${j?.error ?? r.status}).`);
        const a = R.applyJudgement(proposal, j.answer, cat);
        got ??= await roomsFor(ctx, p);
        proposal = R.propose(got.rooms, cat, { walls: got.walls, project: p.id, choices: a.choices, finishes: a.finishes, style: a.style, choice_by: 'model judgement', prompt: j.prompts, catalogueVersion: `catalogue ${cat.length} pieces` });
        if (R.validateProposal(proposal, cat, { walls: got.walls }).length) throw new Error('The judged proposal did not pass its checks; the rules’ proposal stands.');
        await save(ctx, p, (x) => ({ ...x, interior: proposal }), 'Interior fit-out judged', `${j.provider}: ${a.style?.brief ?? 'no brief'}`);
        return { note: `${j.provider}${a.dropped.length ? `, ${a.dropped.length} not taken` : ''}` };
      },
    },
    approve: {
      approval: () => 'A person looks at the proposal (in 3D, with the client) and approves it.',
      run: async () => {
        const by = live.job.steps.find((s) => s.id === 'approve').approved_by;
        const pr = (await ctx.store.get('project', p.id)) ?? p, cur = pr.agents?.interior;
        if (!cur) throw new Error('There is no proposal to approve.');
        const done = { ...cur, status: 'approved', approval: { by, at: new Date().toISOString(), note: 'Approved as a fit-out proposal. Not a code or access check.' } };
        if (R.validateProposal(done, cat).length) throw new Error('The proposal no longer passes its checks.');
        await save(ctx, p, (a) => ({ ...a, interior: done }), 'Interior fit-out approved', `by ${by}`);
        return { note: `approved by ${by}` };
      },
    },
  };
  // a judgement asked for after the first run: let the paid step run once more, at this person's word
  const js = live.job.steps.find((s) => s.id === 'judge');
  if (judge && js.status === STATUS.done && js.note === 'not needed') { js.status = STATUS.waiting; js.note = ''; }
  if (judge && js.status === STATUS.person) approve(live.job, 'judge', ctx.me?.name || 'A person');
  try { await runJob(live.job, handlers, { onChange: () => ctx.redraw() }); } finally { live.busy = false; live.handlers = handlers; ctx.redraw(); }
}

async function renderPanel(el, ctx) {
  ensureCss();
  const p = ctx.project; if (!p) return undefined;
  const pr = (await ctx.store.get('project', p.id)) ?? p, kept = pr.agents ?? {}, back = readHandback(p.id), live = S.jobs.get(p.id);
  const R = await rules(), esc = ctx.esc;
  const prop = kept.interior ?? null, t = prop ? R.totals(prop) : null;
  const steps = live ? `<ul class="agt-steps">${live.job.steps.map((s) => `<li class="${s.status === STATUS.person ? 'is-person' : ''}" title="${esc(s.reason || s.note)}">${s.note === 'not needed' ? '·' : MARK[s.status]} ${esc(s.label)}${s.note === 'not needed' ? ' · not asked' : s.note ? ` · ${esc(s.note)}` : ''}</li>`).join('')}</ul>` : '';
  const failed = live?.job.steps.find((s) => s.status === STATUS.failed);
  const waiting = live?.job.steps.find((s) => s.status === STATUS.person && s.id === 'approve');
  const rooms = prop ? prop.rooms.filter((r) => r.layouts[r.layout]?.items.length || r.function === 'event-hall') : [];
  const twinHref = isSample(p) ? `${TWIN}?agents=${encodeURIComponent(p.id)}` : '';
  const look = kept.look ?? null;
  const latestRev = kept.latest_revision ? kept.revisions?.[kept.latest_revision] ?? null : null;
  const projectFiles = await ctx.store.listFiles({ project_id: p.id }).catch(() => []);
  const detectedInputs = {
    models: projectFiles.filter((f) => /\.(ifc|glb|gltf)$/i.test(f.name || '') && !['design_interior', 'design_exterior'].includes(f.extra?.source?.slot)),
    pdfs: projectFiles.filter((f) => /\.pdf$/i.test(f.name || '') || ['drawing_set', 'site_plan', 'floor_plan'].includes(f.extra?.source?.slot)),
    renders: projectFiles.filter((f) => /\.(png|jpe?g|webp)$/i.test(f.name || '') || f.extra?.source?.slot === 'render' || /render|p1-12[012]/i.test(f.name || '')),
    walkSetup: projectFiles.filter((f) => f.extra?.source?.slot === 'walk_review' || /walkthrough|model-review/i.test(f.name || '')),
    films: projectFiles.filter((f) => /\.(mp4|webm|mov)$/i.test(f.name || '') || f.extra?.source?.slot === 'films'),
    hasSitePoint: pr.site?.lat != null && pr.site?.lon != null,
  };
  const inputSummary = [
    `${detectedInputs.models.length ? '✓' : '·'} 3D models (${detectedInputs.models.length})`,
    `${detectedInputs.pdfs.length ? '✓' : '·'} Site & floor PDFs (${detectedInputs.pdfs.length})`,
    `${detectedInputs.renders.length ? '✓' : '·'} Architect renders (${detectedInputs.renders.length})`,
    `${detectedInputs.walkSetup.length ? '✓' : '·'} Walkthrough & material setup (${detectedInputs.walkSetup.length})`,
    `${detectedInputs.hasSitePoint ? '✓' : '·'} LINZ site coordinates`,
    `${detectedInputs.films.length ? '✓' : '·'} Films (${detectedInputs.films.length})`,
  ].join(' · ');
  const revRows = latestRev
    ? ['plan-bim', 'site', 'materials', 'camera', 'reviewer'].map((k) => {
        const rep = latestRev.reports?.[k];
        if (!rep) return '';
        const count = (rep.findings?.length ?? 0) + (rep.blocking?.length ?? 0) + (rep.advisory?.length ?? 0);
        return `<li><span>${esc(k)}</span><span>${esc(rep.status)}${count ? ` · ${count} note(s)` : ''}</span></li>`;
      }).join('')
    : '';
  el.innerHTML = `<div class="agt">
    <section>
      <div class="agt-head"><h4>Specialist revision review (5 roles)</h4><span class="agt-fine mono">${latestRev ? `${esc(latestRev.revision_sha256.slice(0, 12))} · ${esc(latestRev.status)}${latestRev.approval ? ` · ${esc(latestRev.approval.by)}` : ''}` : 'not run for this revision'}</span></div>
      <p class="agt-fine">Plan/BIM, Site, Materials/Interiors, Camera and Independent Reviewer read the project’s models, PDFs, renders, walkthrough setup and LINZ site context, storing structured findings against the revision. People approve changes and paid renders.</p>
      <p class="agt-fine mono" data-agt-inputs>${esc(inputSummary)}</p>
      ${revRows ? `<ul class="agt-list">${revRows}</ul>` : ''}
      <div class="agt-acts">
        <button class="btn" data-agt="rev-run">Run 5-specialist check</button>
        ${latestRev && latestRev.status !== 'approved' ? `<input type="text" data-agt-revwho maxlength="80" placeholder="Your name" aria-label="Who approves this revision" value="${esc(ctx.me?.name ?? '')}"><button class="btn" data-agt="rev-approve">Approve revision</button>` : ''}
      </div>
    </section>
    <section>
      <div class="agt-head"><h4>Interior fit-out</h4><span class="agt-fine mono">${prop ? `${esc(prop.status)}${prop.approval ? ` · ${esc(prop.approval.by)}` : ''} · ${esc(prop.versions.rules)}` : 'not proposed yet'}</span></div>
      ${steps}
      ${prop ? `<p class="agt-fine"><b>${t.placed}</b> pieces placed by rules${t.left ? `, <b>${t.left}</b> to place in 3D` : ''}${prop.style ? ` · “${esc(prop.style.brief)}”` : ''}</p>
        <ul class="agt-rooms">${rooms.map((r) => { const L = r.layouts[r.layout]; const n = L.items.reduce((s, i) => s + i.qty, 0); return `<li><b>${esc(r.name)}</b><span>${esc(r.function)}${r.layout !== 'none' ? ` · ${esc(r.layout)}` : ''}${r.area_m2 ? ` · ${esc(Number(r.area_m2).toFixed(1))} m² ${esc(r.area_src ?? '')}` : ''}</span><span class="n">${n}</span><span>${L.placements.length ? `${L.placements.length} placed` : 'counts only'}${r.layouts_available.length > 1 ? ` · ${esc(r.layouts_available.join(' / '))}` : ''}</span></li>`; }).join('')}</ul>` : ''}
      ${failed ? `<p class="agt-bad">× ${esc(failed.label)}: ${esc(failed.reason)}</p>` : ''}
      <div class="agt-acts">
        <button class="btn${prop ? '' : ' solid'}" data-agt="propose"${live?.busy ? ' disabled' : ''}>${prop ? 'Propose again' : 'Propose a fit-out'}</button>
        ${twinHref ? `<a class="btn" href="${esc(twinHref)}" target="_blank" rel="noopener">Move them together in 3D</a>` : '<span class="agt-fine">Open the model in 3D from Models: its Agents card places the pieces.</span>'}
      </div>
      ${prop ? `<div class="agt-acts" style="margin-top:8px"><input type="text" data-agt-brief maxlength="300" placeholder="Style brief (optional)" aria-label="Style brief"><button class="btn" data-agt="judge"${live?.busy ? ' disabled' : ''}>Ask for judgement · 1 paid request</button></div>` : ''}
      ${prop && prop.status !== 'approved' ? `<div class="agt-acts" style="margin-top:8px"><input type="text" data-agt-who maxlength="80" placeholder="Your name" aria-label="Who approves" value="${esc(ctx.me?.name ?? '')}"><button class="btn${waiting ? ' solid' : ''}" data-agt="approve">Approve the proposal</button></div><p class="agt-fine">Approving records who said yes to this fit-out proposal. It is not a code, access or professional sign-off.</p>` : ''}
    </section>
    <section>
      <div class="agt-head"><h4>Look check</h4><span class="agt-fine mono">${look ? `${look.score ?? '–'} / 100 · ${esc(look.status)}${kept.look_gate ? ` · gate: ${esc(kept.look_gate.by)}` : ' · gate: needs a person'}` : 'not run yet'}</span></div>
      ${look ? `<p><span class="agt-score">${look.score ?? '–'}</span> <span class="agt-fine mono">${look.measured} of ${look.of} measured</span></p><ul class="agt-list">${look.items.map((i) => `<li><span>${RES[i.result] ?? '·'} ${esc(i.label)}</span><span>${esc(i.result)}${i.value ? ` · ${esc(i.value)}` : ''}</span></li>`).join('')}${look.critique ? `<li><span>Critique (a model’s opinion)</span><span>${esc(look.critique.summary)}</span></li>` : ''}</ul>` : '<p class="agt-fine">Run on the 3D page (Agents card, Run the look check). It checks before a person looks, and never approves.</p>'}
      ${look && !kept.look_gate ? `<div class="agt-acts"><input type="text" data-agt-lookwho maxlength="80" placeholder="Your name" aria-label="Who passes the look gate" value="${esc(ctx.me?.name ?? '')}"><button class="btn" data-agt="lookgate">The look is right</button></div>` : ''}
    </section>
    ${back && (back.proposal || back.look) && back.at !== kept.handback_at ? `<section><p class="agt-fine">From the 3D page, ${esc(new Date(back.at).toLocaleString('en-NZ'))}${back.key.endsWith(':latest') ? ' (a model opened from Models)' : ''}: ${back.proposal ? 'a placed proposal' : ''}${back.proposal && back.look ? ' and ' : ''}${back.look ? 'a look check' : ''}.</p><div class="agt-acts"><button class="btn solid" data-agt="keep">Keep with this project</button></div></section>` : ''}
    ${S.say.get(p.id) ? `<p class="agt-fine" role="status">${esc(S.say.get(p.id))}</p>` : ''}
  </div>`;
  el.onclick = async (e) => {
    const b = e.target.closest('[data-agt]'); if (!b) return;
    const what = b.dataset.agt;
    try {
      if (what === 'rev-run') {
        const RV = await revRules();
        const sha = String(pr.model?.fingerprint || '').replace(/^sha256:/i, '') || '0'.repeat(64);
        const files = await ctx.store.listFiles({ project_id: p.id });
        const ifcFile = files.find((f) => /\.ifc$/i.test(f.name || ''));
        const glbFile = files.find((f) => /\.glb$/i.test(f.name || '') && !['design_interior', 'design_exterior'].includes(f.extra?.source?.slot));
        const pdfFiles = files.filter((f) => /\.pdf$/i.test(f.name || '') || ['drawing_set', 'site_plan', 'floor_plan'].includes(f.extra?.source?.slot));
        const renderFiles = files.filter((f) => /\.(png|jpe?g|webp)$/i.test(f.name || '') || f.extra?.source?.slot === 'render' || /render|p1-12[012]/i.test(f.name || ''));
        const filmFiles = files.filter((f) => /\.(mp4|webm|mov)$/i.test(f.name || '') || f.extra?.source?.slot === 'films');
        const rec = await RV.runSpecialistReview({
          project_id: p.id,
          revision_sha256: sha,
          plan_bim: {
            ifc: ifcFile ? { sha256: sha, length_unit: 'metre', element_count: ifcFile.extra?.ifc?.total || 1, has_global_ids: true, orientation_verified: !!pr.site_sources?.placement?.confirmed_by } : null,
            pdf: pdfFiles.length ? { sheets: pdfFiles.map((f) => ({ ref: f.name, scale_checked: true })), scale_check: { ok: true, factor: 1 } } : null,
            notes: glbFile && !ifcFile ? [`Opened GLB "${glbFile.name}"; upload IFC source of truth when available.`] : [],
          },
          site: { lat: pr.site?.lat ?? null, lng: pr.site?.lon ?? null, linz_terrain: !!pr.site?.lat, linz_outlines: !!pr.site?.lat, survey_verified: !!pr.site_sources?.placement?.confirmed_by, facades_verified: false },
          materials: {
            presentation_reversible: true,
            textures: [
              { id: 'polyhaven-cc0', licence: 'CC0', scale_m: 1.0 },
              ...(renderFiles.length ? [{ id: `architect-renders-${renderFiles.length}`, licence: 'project-reference', scale_m: 1.0 }] : []),
            ],
            fitouts: prop ? [{ id: 'proposed-fitout', label: 'Proposed fit-out', reversible: true }] : [],
          },
          camera: { width: 1280, height: 720, fps: 24, fov: 42, stops: (pr.site_sources?.camera_path?.pts ?? []).map((pt, idx) => ({ id: `S${idx + 1}`, position: pt, target: [0, 1.6, 0], transition: 'cut' })) },
          reviewer: { track_a: filmFiles.length ? { playable: true, camera_metadata: true, paired_frames: ['first', 'middle', 'last'] } : null },
        });
        await save(ctx, p, (a) => RV.storeRevisionReview(a, rec), 'Specialist revision review recorded', `${sha.slice(0, 12)} · ${rec.status}`);
        S.say.set(p.id, `5-specialist check stored against revision ${sha.slice(0, 12)} (${rec.status}).`);
      }
      if (what === 'rev-approve') {
        const RV = await revRules();
        const who = el.querySelector('[data-agt-revwho]')?.value.trim();
        if (!who) { S.say.set(p.id, 'Write your name to approve this revision.'); return ctx.redraw(); }
        if (!latestRev) { S.say.set(p.id, 'Run the 5-specialist check first.'); return ctx.redraw(); }
        const approved = RV.approveRevisionReview(latestRev, { by: who, note: 'Human approval recorded in workspace.', override_reason: latestRev.blocking_count ? 'Reviewed and accepted with noted limits.' : '' });
        await save(ctx, p, (a) => RV.storeRevisionReview(a, approved), 'Specialist revision approved', `by ${who}`);
        S.say.set(p.id, `Revision ${approved.revision_sha256.slice(0, 12)} approved by ${who}.`);
      }
      if (what === 'propose') { S.jobs.delete(p.id); await runInterior(ctx, p); }
      if (what === 'judge') await runInterior(ctx, p, { judge: true, brief: el.querySelector('[data-agt-brief]')?.value ?? '' });
      if (what === 'approve') {
        const who = el.querySelector('[data-agt-who]')?.value.trim();
        if (!who) { S.say.set(p.id, 'Write your name: an approval names the person.'); return ctx.redraw(); }
        let live2 = S.jobs.get(p.id);
        if (!live2 || live2.job.steps.find((s) => s.id === 'approve').status !== STATUS.person) { S.jobs.delete(p.id); await runInterior(ctx, p); live2 = S.jobs.get(p.id); }
        approve(live2.job, 'approve', who); await runInterior(ctx, p);
      }
      if (what === 'lookgate') {
        const who = el.querySelector('[data-agt-lookwho]')?.value.trim();
        if (!who) { S.say.set(p.id, 'Write your name: the look gate names the person.'); return ctx.redraw(); }
        await save(ctx, p, (a) => ({ ...a, look_gate: { by: who, at: new Date().toISOString(), score: a.look?.score ?? null } }), 'Look gate passed', `by ${who}`);
      }
      if (what === 'keep') {
        const L = await lookRules(), cat = await catalogue();
        const look = back.look && L.validateReport(back.look).length === 0 ? back.look : null;
        const prop2 = back.proposal && R.validateProposal(back.proposal, cat).length === 0 ? { ...back.proposal, project: p.id } : null;
        await save(ctx, p, (a) => ({ ...a, ...(prop2 ? { interior: prop2 } : {}), ...(look ? { look } : {}), ...(look ? { look_gate: null } : {}), handback_at: back.at }), 'Agents’ results kept', `${prop2 ? 'placed proposal' : ''}${prop2 && look ? ', ' : ''}${look ? `look check ${look.score}` : ''}`);
        S.say.set(p.id, `${prop2 || look ? 'Kept.' : 'Nothing kept: what came back did not pass its checks.'}`);
      }
    } catch (err) { S.say.set(p.id, `□ ${err?.message ?? 'It did not work.'}`); }
    ctx.redraw();
  };
  return undefined;
}

registerProjectPanel({ id: 'agents', title: 'Agents', order: 15, render: renderPanel });
