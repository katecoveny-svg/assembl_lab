import type * as THREE from 'three/webgpu';
import type { PlanRooms } from '../library/picks';

// The agents card on the 3D page: the interior design agent (a fit-out proposal, a hall's layouts) and the 3D look expert
// (a scored check of the look before a person's look gate). Loaded on demand from projectPlan.ts with one line. With
// ?agents=<project id> on the address (the ops page's Agents section opens it so), the proposal is made as the page opens and
// the results are passed back to the ops page through this browser's storage (localStorage, key below), where a person keeps
// them with the project and approves. Nothing is approved here.

export const HANDBACK_KEY = 'assembl-agents-result';
export const HANDBACK_TYPE = 'assembl.agents-handback.v1';
type Host = { log(m: string): void; modelRoot: THREE.Object3D; onFrame: ((dt: number) => void)[]; status: HTMLElement };
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const MARK: Record<string, string> = { pass: '■', check: '◧', fail: '□', 'not measured': '·' };
const CSS = `
#agentsCard .ag-seg{display:inline-flex;flex-wrap:wrap;border:1px solid var(--line2);border-radius:999px;padding:2px;gap:2px;margin:4px 0}
#agentsCard .ag-seg button{border:0;background:transparent;border-radius:999px;padding:5px 12px;min-height:32px;font:inherit;font-size:13px;color:var(--ink);cursor:pointer}
#agentsCard .ag-seg button[aria-pressed="true"]{background:var(--plum);color:var(--ivory)}
#agentsCard .ag-seg button:focus-visible,#agentsCard .pill:focus-visible{outline:2px solid var(--rose);outline-offset:2px}
#agentsCard .ag-rooms,#agentsCard .ag-list{list-style:none;margin:6px 0;padding:0}
#agentsCard .ag-rooms li,#agentsCard .ag-list li{display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-top:1px dashed rgba(51,33,47,.12);font-size:13px}
#agentsCard .ag-list li span:last-child{font:12px 'IBM Plex Mono',monospace;color:var(--muted,#654A4E);text-align:right}
#agentsCard .ag-views{display:flex;gap:6px;margin:6px 0}
#agentsCard .ag-views img{width:31%;aspect-ratio:16/10;object-fit:cover;border-radius:6px;background:var(--pale)}
#agentsCard .ag-score{font:500 22px/1 'IBM Plex Mono',monospace}
#agentsCard input[type=text]{font:inherit;font-size:13px;padding:6px 8px;border:1px solid var(--line2);border-radius:8px;background:#fff;color:var(--ink);width:100%}
#agentsCard h4{margin:12px 0 2px;font-size:13px}
#agentsCard .bad{color:#9b2f45}
.ag-badge{position:absolute;left:12px;top:12px;z-index:6;display:flex;gap:6px;align-items:center;flex-wrap:wrap;max-width:calc(100% - 24px)}
.ag-badge .ag-seg{background:rgba(249,246,242,.94);backdrop-filter:blur(8px);border:1px solid rgba(101,74,78,.28);border-radius:999px;padding:2px;display:inline-flex;gap:2px}
.ag-badge .ag-seg button{border:0;background:transparent;border-radius:999px;padding:5px 12px;min-height:32px;font:13px "Instrument Sans",system-ui,sans-serif;color:#240B21;cursor:pointer}
.ag-badge .ag-seg button[aria-pressed="true"]{background:#240B21;color:#F5F1F2}
.ag-badge small{font:11px 'IBM Plex Mono',monospace;color:#654A4E;background:rgba(249,246,242,.9);padding:3px 6px;border-radius:6px}
@media (max-width:600px){.ag-badge{left:6px;top:6px}.ag-badge .ag-seg button{padding:5px 9px}}`;

export function mountAgents(app: Host, model: THREE.Object3D, plan?: PlanRooms) {
  if (document.getElementById('agentsCard')) return;
  const extra = document.getElementById('extra'); if (!extra) return;
  if (!document.getElementById('agentsStyle')) { const st = document.createElement('style'); st.id = 'agentsStyle'; st.textContent = CSS; document.head.append(st); }
  // the project the results go back to: ?agents=<project id>, or 'latest' for a model opened from the ops page's Models
  const q = new URLSearchParams(location.search), project = q.get('agents') || (q.get('from') === 'ops' ? 'latest' : null);
  const el = document.createElement('section'); el.className = 'card'; el.id = 'agentsCard';
  el.innerHTML = `<h3>Agents</h3>
    <h4>Interior fit-out</h4>
    <p class="small" id="agIntSay">Proposes furniture for each room from the library, laid out by rules. Everything stays proposed.</p>
    <div id="agModes"></div><ul class="ag-rooms" id="agRooms"></ul>
    <div class="row wrap"><button class="pill solid" id="agPropose">Propose a fit-out</button><button class="pill" id="agClear" hidden>Back to the drawn fit-out</button></div>
    <label class="small" style="display:block;margin-top:8px">Style brief (optional)<input type="text" id="agBrief" maxlength="300" placeholder="e.g. warm, natural timber, calm"></label>
    <div class="row wrap" style="margin-top:6px"><button class="pill" id="agJudge" disabled>Ask for judgement · 1 paid request</button></div>
    <p class="small" id="agJudgeSay"></p>
    <h4>Look check</h4>
    <p class="small">Checks the look before a person looks. It never approves.</p>
    <div class="ag-views" id="agViews"></div><p id="agScore"></p><ul class="ag-list" id="agList"></ul>
    <div class="row wrap"><button class="pill" id="agLook">Run the look check</button></div>
    <label class="small" style="display:block;margin-top:8px">Architect’s render to compare (optional)<input type="file" id="agRender" accept="image/jpeg,image/png,image/webp"></label>
    <div class="row wrap" style="margin-top:6px"><button class="pill" id="agCrit" disabled>Add a critique · 1 paid request</button></div>
    <p class="small" id="agLookSay"></p>
    ${project ? '<p class="small mono">Results go back to the project on the ops page, where a person approves them.</p>' : ''}`;
  extra.prepend(el);
  const $ = <T extends HTMLElement>(id: string) => el.querySelector('#' + id) as T;
  let geo: { walls: never[]; doors: never[] } | null = null, render: string | null = null, last: { proposal?: unknown; look?: unknown } = {};
  let agent: typeof import('./interiorAgent') | null = null;
  const loadAgent = async () => (agent ??= await import('./interiorAgent'));
  const handBack = () => {
    if (!project) return;
    try { localStorage.setItem(`${HANDBACK_KEY}:${project}`, JSON.stringify({ type: HANDBACK_TYPE, project, at: new Date().toISOString(), page: location.pathname, ...last })); } catch { /* storage full or blocked: the card still shows it */ }
  };
  const badge = document.createElement('div'); badge.className = 'ag-badge'; badge.hidden = true;
  (document.querySelector('.stage') ?? extra.parentElement)?.append(badge);

  const drawModes = () => {
    if (!agent) return;
    const modes = agent.layoutModes(), now = agent.currentLayout();
    const seg = modes.length ? `<div class="ag-seg" role="group" aria-label="Hall layout">${modes.map((m) => `<button data-mode="${m}" aria-pressed="${m === now}">${esc(m)}</button>`).join('')}</div>` : '';
    $('agModes').innerHTML = seg;
    badge.hidden = !modes.length; badge.innerHTML = modes.length ? `${seg}<small>proposed</small>` : '';
  };
  const onMode = (e: Event) => {
    const b = (e.target as HTMLElement).closest('button[data-mode]') as HTMLButtonElement | null; if (!b || !agent) return;
    void agent.setLayout(b.dataset.mode!, { transition: 'grow' }).then((m) => app.log(`Hall layout: ${m}. Proposed.`)).catch((err) => app.log(String(err.message)));
  };
  $('agModes').addEventListener('click', onMode); badge.addEventListener('click', onMode);
  // a switch made by the camera path or film tools (setLayout) shows here too
  window.addEventListener('interior-layout', () => { drawModes(); drawRooms(); if (agent) { last.proposal = agent.proposalNow(); handBack(); } });
  const drawRooms = () => {
    const p = agent?.proposalNow() as { rooms: { name: string; layout: string; layouts: Record<string, { placements: unknown[]; unplaced: { why: string }[] }> }[] } | null;
    if (!p) return;
    const t = agent!.totals(p as never);
    $('agIntSay').innerHTML = `<b>${t.placed} pieces proposed</b>${t.left ? `, ${t.left} could not be placed` : ''}. Move them with Move. <span class="mono">proposed · a person approves</span>`;
    $('agRooms').innerHTML = p.rooms.filter((r) => r.layouts[r.layout]?.placements.length || r.layouts[r.layout]?.unplaced.length).map((r) => {
      const L = r.layouts[r.layout];
      return `<li><span>${esc(r.name)}${r.layout !== 'none' ? ` · ${esc(r.layout)}` : ''}</span><span class="mono small" title="${esc(L.unplaced.map((u) => u.why).join('; '))}">${L.placements.length}${L.unplaced.length ? ` · ${L.unplaced.length} not placed` : ''}</span></li>`;
    }).join('');
  };
  const propose = async (choices?: Record<string, string>, finishes?: Record<string, string>, style?: unknown) => {
    const a = await loadAgent();
    $('agPropose').setAttribute('disabled', '');
    try {
      const got = a.proposeFor(model, plan, { choices, finishes, style, project: project ?? undefined, ...(choices ? { choice_by: 'model judgement' } : {}) } as never);
      geo = { walls: got.walls as never[], doors: got.doors as never[] };
      await a.placeProposal(app, model, got.proposal, geo);
      last.proposal = got.proposal; drawRooms(); drawModes(); handBack();
      $('agClear').hidden = false; ($('agJudge') as HTMLButtonElement).disabled = false; $('agPropose').textContent = 'Propose again';
      app.log(`Interior agent: ${a.totals(got.proposal).placed} pieces proposed. All proposed: a person approves.`);
    } catch (err) { $('agIntSay').innerHTML = `<span class="bad">□ ${esc((err as Error).message)}</span>`; }
    finally { $('agPropose').removeAttribute('disabled'); }
  };
  $('agPropose').addEventListener('click', () => void propose());
  $('agClear').addEventListener('click', () => { agent?.clearProposal(); $('agRooms').innerHTML = ''; $('agModes').innerHTML = ''; badge.hidden = true; $('agClear').hidden = true; $('agIntSay').textContent = 'The drawn fit-out is back. The proposal can be made again.'; });
  $('agJudge').addEventListener('click', async () => {
    const a = await loadAgent(), p = a.proposalNow(); if (!p) return;
    ($('agJudge') as HTMLButtonElement).disabled = true; $('agJudgeSay').textContent = 'Asking…';
    try {
      const j = await a.askJudgement(p, ($('agBrief') as HTMLInputElement).value);
      await propose(j.choices, j.finishes, j.style);
      $('agJudgeSay').innerHTML = `${j.style ? `“${esc(j.style.brief)}” ` : ''}<span class="mono">model judgement · ${esc(j.provider)}</span>${j.dropped.length ? `<br>Not taken: ${esc(j.dropped.slice(0, 3).join('; '))}` : ''}`;
    } catch (err) { $('agJudgeSay').innerHTML = `<span class="bad">□ ${esc((err as Error).message)}</span>`; ($('agJudge') as HTMLButtonElement).disabled = false; }
  });

  const lookRun = async (critique: boolean) => {
    const btn = $(critique ? 'agCrit' : 'agLook') as HTMLButtonElement; btn.disabled = true; $('agLookSay').textContent = 'Drawing the views…';
    try {
      const { runLookCheck } = await import('./lookExpert');
      const { report, views } = await runLookCheck(app as never, { critique, render });
      $('agViews').innerHTML = Object.entries(views).map(([k, v]) => (v.ok ? `<img src="${v.url}" alt="${esc(k)} view" title="${esc(k)}">` : '')).join('');
      $('agScore').innerHTML = `<span class="ag-score">${report.score ?? '–'}</span> <span class="small mono">/ 100 · ${report.measured} of ${report.of} measured · for a person</span>`;
      $('agList').innerHTML = report.items.map((i: { result: string; label: string; value: string; want: string }) => `<li title="${esc(i.want)}"><span>${MARK[i.result]} ${esc(i.label)}</span><span>${esc(i.result)}${i.value ? `<br>${esc(i.value)}` : ''}</span></li>`).join('') +
        (report.critique ? `<li><span>Critique (a model’s opinion)</span><span>${Object.entries(report.critique.scores).filter(([, v]) => v != null).map(([k, v]) => `${k} ${v}/5`).join(' · ')}<br>${esc(report.critique.summary)}</span></li>${report.critique.notes.map((n: string) => `<li><span>·</span><span>${esc(n)}</span></li>`).join('')}` : '');
      $('agLookSay').textContent = critique ? 'Critique added. A person still looks and decides.' : 'Done. A person still looks and decides at the look gate.';
      ($('agCrit') as HTMLButtonElement).disabled = false;
      last.look = { ...report, views: Object.fromEntries(Object.entries(views).map(([k, v]) => [k, { ok: v.ok }])) }; handBack();
      (window as unknown as { __look?: unknown }).__look = report;
    } catch (err) { $('agLookSay').innerHTML = `<span class="bad">□ ${esc((err as Error).message)}</span>`; }
    finally { btn.disabled = false; }
  };
  $('agLook').addEventListener('click', () => void lookRun(false));
  $('agCrit').addEventListener('click', () => void lookRun(true));
  $('agRender').addEventListener('change', () => {
    const f = ($('agRender') as HTMLInputElement).files?.[0]; if (!f) { render = null; return; }
    if (f.size > 3_000_000) { $('agLookSay').textContent = 'That render is over 3 MB: choose a smaller copy.'; render = null; return; }
    const r = new FileReader(); r.onload = () => { render = String(r.result); $('agLookSay').textContent = 'Render ready to compare. It is sent only with a critique, and not kept.'; }; r.readAsDataURL(f);
  });
  // opened from the ops page's Agents section: propose once the model is ready
  if (q.get('agents')) {
    const wait = () => (app.status.textContent ?? '').startsWith('Ready') ? propose().then(() => (q.get('look') === '1' ? lookRun(false) : undefined)) : setTimeout(wait, 400);
    wait();
  }
}
