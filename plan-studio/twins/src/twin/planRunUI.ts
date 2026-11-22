// The "Check this plan set" card: one press runs the full check in order (planRun.ts holds the steps' logic and words)
// and shows a live checklist, then a run report a person can print, download, or send to a project in the ops page.
// Agents prepare, people approve: the report says plainly it is not a compliance decision or a professional sign-off.
//
// The site point is typed here (or comes from the Site facts and Real ground cards, which share it). It is kept in this
// browser only. The ground is read straight from LINZ by this browser; site facts ask the lab's feed, which asks each
// publisher. The point is never written into the model, a share link or the run report.
import { runCodeChecks } from './codeChecks';
import { modelFingerprint } from './approvals';
import { parseWhere } from './siteFacts';
import { readGround, keepGround, rebuildOnGround, type GroundStore, type Applied } from './siteGround';
import { LIMIT_S } from './groundLook';
import {
  STEPS, AGENTS, STANDING, PRIVACY, square, runSteps, drawingsStep, namesStep, groundStep, factsStep, codeStep, checkStep, buildReport, reportText, reportFileName, holdsPoint,
  type StepResult, type RunReport, type ReadRecord, type GroundInput, type Status, type CodeCheck, type Fact,
} from './planRun';

/** what the trace card leaves for the run (this tab only), and the hand-over to the ops page */
export const READ_KEY = 'assembl-plan-read-record', AUTO_KEY = 'assembl-plan-run-auto', LAST_KEY = 'assembl-plan-run-last', HANDOFF_KEY = 'assembl-plan-run-handoff';
export const OPS_PAGE = '/architecture/?from=plan-run';
const WHERE = 'assembl.siteFacts.where', FACTS_LAST = 'assembl.siteFacts.last';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const secs = (ms: number) => `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)} s`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Plan = any;
type Row = { id: string; title: string; status: Status | 'running' | 'waiting'; summary: string; lines: string[]; seconds: number | null; reason?: string };
interface Host { project: { key: string; title: string }; log(msg: string): void; save: ((filename: string, data: Blob) => Promise<void>) | null }

/** the read record the trace card kept for this exact model, or null */
export function readRecordFor(fp: string): ReadRecord | null {
  try { const r = JSON.parse(sessionStorage.getItem(READ_KEY) ?? 'null') as ReadRecord | null; return r?.v === 1 && r.fingerprint === fp ? r : null; } catch { return null; }
}
/** the ground a stored read gives, in the words the run step takes */
function groundFrom(kind: 'loaded' | 'read', st: GroundStore, ap: Applied): GroundInput {
  return { kind, survey: st.ground.title, flown: st.ground.captured, readOn: st.ground.fetchedAt.slice(0, 10), seconds: st.read?.seconds, floorRule: ap.floorRule, under: ap.groundUnder,
    placement: { turnTag: st.placement.turnTag, moveTag: st.placement.moveTag, floorTag: st.placement.floorTag }, tops: !!st.surface, boundary: st.parcel ? (ap.features.length ? 'drawn' : 'outside') : 'none', emptyCells: ap.emptyCells };
}
const withGround = (plan: Plan, ap: Applied) => ({ ...plan, site: { ...(plan.site ?? {}), terrain: ap.terrain, features: [...(plan.site?.features ?? []), ...ap.features] } });

/**
 * plan: the plan as dropped (no ground fetched for a point, never the point). shown: the plan the page built, with any
 * ground already applied. pause: rests the 3D view while LINZ's files arrive.
 */
export function planRunPanel(app: Host, o: { plan: Plan; shown: Plan; onGround: { store: GroundStore; applied: Applied } | null; pause?: (on: boolean) => void }): HTMLElement {
  const el = document.createElement('section');
  el.className = 'card'; el.id = 'planRun';
  const plan = o.plan, fp = modelFingerprint(plan), own = !!plan?.site?.terrain;
  const tool = (document.querySelector('script[src*="twin-"]') as HTMLScriptElement | null)?.src.split('/').pop() ?? 'unknown build';
  el.innerHTML = `<h3>check this plan set</h3>
    <p class="pr-lede">One press runs every check in order, and says what a person must check.</p>
    <div class="pr-go"><input id="prWhere" class="mono" placeholder="Site point: -36.80, 175.08" aria-label="Site point, latitude and longitude" /><button class="pr-btn solid" id="prRun">Run the full check</button></div>
    <p class="pr-note" id="prNote">The point stays in this browser. Ground is read from LINZ by this browser; site facts ask the lab’s feed. It is never put in the model, a share link or the report.</p>
    <ol class="pr-list" id="prList"></ol>
    <div class="pr-after" id="prAfter" hidden><button class="pr-btn solid" id="prOpen">Open the run report</button><button class="pr-btn" id="prSend">Send to a project</button></div>
    <p class="pr-agents"><b>Agents:</b> ${esc(AGENTS)}</p>
    <style>
      #planRun{border-radius:0;border:1px solid #654A4E;background:#FFFDFB;font-family:'Instrument Sans',system-ui,sans-serif}
      #planRun h3{color:#654A4E}
      #planRun .pr-lede{font-size:14px;color:#33212F;margin:0 0 8px}
      #planRun .pr-go{display:flex;gap:6px;flex-wrap:wrap}
      #planRun .pr-go input{flex:1 1 150px;min-width:0;border:1px solid #654A4E;border-radius:0;padding:7px 8px;font-size:13px;background:#fff;color:#33212F}
      .pr-btn{border:1px solid #654A4E;background:#FFFDFB;color:#654A4E;border-radius:0;padding:7px 12px;min-height:36px;font:500 13px 'Instrument Sans',system-ui,sans-serif;cursor:pointer}
      .pr-btn.solid{background:#654A4E;color:#FFFDFB}
      .pr-btn:disabled{opacity:.5;cursor:not-allowed}
      .pr-btn:focus-visible,#planRun input:focus-visible{outline:2px solid #E3D0D2;outline-offset:2px}
      #planRun .pr-note{font-size:12px;color:#756771;margin:6px 0 0}
      #planRun .pr-list{list-style:none;margin:10px 0 0;padding:0;counter-reset:pr}
      #planRun .pr-list li{border-top:1px solid #E3D0D2;padding:8px 0}
      #planRun .pr-top{display:flex;justify-content:space-between;gap:8px;align-items:baseline}
      #planRun .pr-top b{font-size:13.5px;color:#33212F;font-weight:600}
      #planRun .pr-st{font:12px 'IBM Plex Mono',monospace;color:#654A4E;white-space:nowrap}
      #planRun .pr-st.done{color:#33212F}
      #planRun .pr-st.failed{color:#9b2f45}
      #planRun .pr-sum{font-size:12.5px;color:#33212F;margin:2px 0 0}
      #planRun details{margin-top:2px}
      #planRun summary{cursor:pointer;font:12px 'IBM Plex Mono',monospace;color:#654A4E}
      #planRun details ul{margin:4px 0 0;padding-left:16px;font-size:12px;color:#33212F}
      #planRun details li{border:0;padding:2px 0}
      #planRun .pr-list li.check details ul{list-style:none;padding-left:0}
      #planRun .pr-list li.check details li::before{content:'□ ';font-family:'IBM Plex Mono',monospace;color:#654A4E}
      #planRun .pr-after{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
      #planRun .pr-after[hidden]{display:none}
      #planRun .pr-agents{font-size:12px;color:#756771;margin:10px 0 0;padding-top:8px;border-top:1px solid #E3D0D2}
      #planRun .pr-agents b{color:#654A4E;font-weight:600}
    </style>`;
  const $ = <T extends HTMLElement>(id: string) => el.querySelector('#' + id) as T;
  const where = $('prWhere') as HTMLInputElement, note = $('prNote'), list = $('prList'), go = $('prRun') as HTMLButtonElement;
  try { where.value = o.onGround ? `${o.onGround.store.point.lat}, ${o.onGround.store.point.lon}` : localStorage.getItem(WHERE) ?? ''; } catch { /* storage can be closed */ }
  let report: RunReport | null = null, busy = false;

  const rowHtml = (r: Row) => {
    const word = r.status === 'running' ? 'running…' : r.status === 'waiting' ? 'waiting' : r.status;
    const cls = r.status === 'done' ? 'done' : r.status === 'failed' ? 'failed' : '';
    return `<li class="${r.id === 'check' ? 'check' : ''}"><div class="pr-top"><b>${esc(r.title)}</b><span class="pr-st ${cls}">${square(r.status)} ${esc(word)}${r.seconds != null ? ` · ${esc(secs(r.seconds * 1000))}` : ''}</span></div>` +
      (r.summary ? `<p class="pr-sum">${esc(r.summary)}</p>` : '') +
      (r.lines.length ? `<details${r.id === 'check' ? ' open' : ''}><summary>${r.id === 'check' ? 'The list' : 'What it did'}</summary><ul>${r.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></details>` : '') + '</li>';
  };
  const draw = (rows: Row[]) => { list.innerHTML = rows.map(rowHtml).join(''); };
  const fromResults = (done: StepResult[], running: string | null): Row[] => STEPS.map((s) => {
    const r = done.find((x) => x.id === s.id);
    return r ? { id: r.id, title: r.title, status: r.status, summary: r.summary, lines: r.lines, seconds: r.ms / 1000, reason: r.reason } : { id: s.id, title: s.title, status: running === s.id ? 'running' : 'waiting', summary: '', lines: [], seconds: null };
  });
  const fromReport = (r: RunReport): Row[] => r.steps.map((s) => ({ id: s.id, title: s.title, status: s.status, summary: s.summary, lines: s.lines, seconds: s.seconds, reason: s.reason }));

  // the last run in this tab, for this exact model: shown again after the page is rebuilt (on new ground, or new finishes)
  try {
    const last = JSON.parse(sessionStorage.getItem(LAST_KEY) ?? 'null') as { fp: string; report: RunReport; rebuilt?: boolean } | null;
    if (last?.fp === fp && last.report?.type) {
      report = last.report; draw(fromReport(report)); $('prAfter').hidden = false;
      note.textContent = `Run at ${new Date(report.ranAt).toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })} in this tab${last.rebuilt && o.onGround ? '. The house is now on the ground it read' : ''}. Run again for a fresh check.`;
      if (last.rebuilt) sessionStorage.setItem(LAST_KEY, JSON.stringify({ ...last, rebuilt: false }));
    }
  } catch { /* nothing kept */ }

  const run = async () => {
    if (busy) return;
    busy = true; go.disabled = true; $('prAfter').hidden = true; report = null;
    const typed = where.value.trim(), p = typed ? parseWhere(typed) : null, bad = !!typed && !p;
    if (p) try { localStorage.setItem(WHERE, typed); } catch { /* fine */ }
    let readNow: { store: GroundStore; applied: Applied } | null = null, checked: Plan = o.shown;
    const ranAt = new Date();
    note.textContent = 'Running…';
    const defs = [
      { id: 'drawings' as const, run: () => drawingsStep(plan, readRecordFor(fp)) },
      { id: 'names' as const, run: () => namesStep(plan) },
      { id: 'ground' as const, run: async () => {
        if (own) return groundStep({ kind: 'own', source: String(plan.site.terrain.source ?? 'source not stated'), floorSource: plan.buildings?.[0]?.floorLevelSource, pointGiven: !!p });
        if (bad) return groundStep({ kind: 'bad-point' });
        const L = o.onGround;
        if (L && (!p || (Math.abs(p.lat - L.store.point.lat) < 1e-7 && Math.abs(p.lon - L.store.point.lon) < 1e-7))) return groundStep(groundFrom('loaded', L.store, L.applied));
        if (!p) return groundStep({ kind: 'none' });
        const ac = new AbortController(), cap = setTimeout(() => ac.abort(new Error(`LINZ took longer than ${LIMIT_S} s`)), LIMIT_S * 1000), t0 = performance.now();
        o.pause?.(true);
        try {
          const res = await readGround(plan, p, { signal: ac.signal, onProgress: (n, b) => { note.textContent = `Reading LINZ’s ground from this browser: ${n} answers, ${(b / 1e6).toFixed(1)} MB, ${Math.round((performance.now() - t0) / 1000)} s.`; } });
          if (res.status === 'unavailable') return groundStep({ kind: 'unavailable', reason: res.reason });
          readNow = { store: res.store, applied: res.applied }; keepGround(res.store); checked = withGround(plan, res.applied);
          return groundStep(groundFrom('read', res.store, res.applied));
        } finally { clearTimeout(cap); o.pause?.(false); note.textContent = 'Running…'; }
      } },
      { id: 'facts' as const, run: async () => {
        if (!p) return factsStep({ kind: 'none' });
        const ac = new AbortController(), cap = setTimeout(() => ac.abort(), 45000);
        try {
          const r = await fetch(`/api/live/?feeds=site&lat=${p.lat}&lon=${p.lon}`, { headers: { accept: 'application/json' }, signal: ac.signal });
          if (!r.ok) throw new Error(`the lab’s feed answered ${r.status}`);
          const site = (await r.json())?.feeds?.site;
          if (!site?.facts) throw new Error(site?.error ?? 'no facts came back');
          try { sessionStorage.setItem(FACTS_LAST, JSON.stringify({ where: typed, site })); } catch { /* the Site facts card asks again */ }
          return factsStep({ kind: 'fetched', facts: site.facts as Record<string, Fact>, fetchedAt: site.fetchedAt });
        } catch (e) { throw ac.signal.aborted ? new Error('the lab’s feed took longer than 45 s') : e; } finally { clearTimeout(cap); }
      } },
      { id: 'code' as const, run: () => {
        const T = checked?.site?.terrain, words = readNow || (o.onGround && T) ? 'LINZ’s 1 m LiDAR ground for the site point (existing ground, not finished ground)' : T ? 'the model’s own surveyed ground (existing ground, not finished ground)' : checked?.site?.fall ? 'the model’s own fall plane, which is not a survey' : 'no ground: the model holds none, so falls cannot be told';
        return codeStep(runCodeChecks(checked) as unknown as CodeCheck[], words);
      } },
      { id: 'check' as const, run: (done: StepResult[]) => checkStep(done) },
    ];
    try {
      const results = await runSteps(defs, (done, running) => draw(fromResults(done, running)), () => performance.now());
      const rep = buildReport({ plan, fingerprint: fp, tool, ranAt, results });
      if (holdsPoint(rep, p)) throw new Error('the report would hold the site point, so it was not made');
      report = rep;
      try { sessionStorage.setItem(LAST_KEY, JSON.stringify({ fp, report: rep, rebuilt: !!readNow })); } catch { /* shown now; not kept for a rebuild */ }
      $('prAfter').hidden = false;
      const by = (s: Status) => results.filter((r) => r.status === s).length;
      note.textContent = `Done in ${rep.seconds < 0.1 ? 'under 0.1' : rep.seconds} s: ${by('done')} done, ${by('needs a person')} need a person, ${by('not run')} not run, ${by('failed')} failed.${readNow ? ' Putting the house on the ground it read…' : ''}`;
      app.log(`Full check run on version ${fp}. ${STANDING}`);
      if (readNow) setTimeout(rebuildOnGround, 2500);
    } catch (e) {
      note.textContent = `The run could not finish: ${(e as Error).message}. Nothing is shown rather than a guess.`;
    } finally { busy = false; go.disabled = false; }
  };
  go.addEventListener('click', () => void run());
  where.addEventListener('keydown', (e) => { if (e.key === 'Enter') void run(); });
  $('prOpen').addEventListener('click', () => report && openReport(app, report, () => send()));
  const send = () => { if (report) sendToProject(app, plan, report, (m) => { note.textContent = m; }); };
  $('prSend').addEventListener('click', send);
  // a plan just read from drawings runs the check straight away, once
  try { if (sessionStorage.getItem(AUTO_KEY) === fp) { sessionStorage.removeItem(AUTO_KEY); setTimeout(() => void run(), 600); } } catch { /* fine */ }
  return el;
}

// ------------------------------------------------------------------------------------------------ the report screen
function reportHtml(r: RunReport): string {
  const when = new Date(r.ranAt).toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' });
  const code = r.steps.find((s) => s.id === 'code'), fails = (code?.lines ?? []).filter((l) => l.startsWith('□ Does not meet'));
  return `<div class="rs-head"><p class="rs-kick">run report</p><h2>${esc(r.model.title)}</h2>
      <p class="rs-mono">version ${esc(r.model.fingerprint)} · revision ${esc(r.model.revision)} · ${esc(when)} · ${esc(String(r.seconds))} s</p>
      <p class="rs-standing">${esc(r.standing)}</p></div>
    <ol class="rs-steps">${r.steps.map((s) => `<li><span class="rs-sq">${s.square} ${esc(s.status)}</span><b>${esc(s.title)}</b><span class="rs-t">${esc(String(s.seconds))} s</span><p>${esc(s.summary)}</p></li>`).join('')}</ol>
    ${fails.length ? `<section><h3>Does not meet the cited figure</h3><ul class="rs-fails">${fails.map((l) => `<li>${esc(l.replace(/^□ Does not meet: /, ''))}</li>`).join('')}</ul></section>` : ''}
    <section><h3>Before relying on it, a person checks</h3><ul class="rs-check">${r.personMustCheck.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></section>
    <details class="rs-more"><summary>Every line of every step</summary>${r.steps.map((s) => `<p><b>${esc(s.title)}</b></p><ul>${s.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`).join('')}</details>
    <p class="rs-small">Drawings: ${esc(r.model.drawings)}</p>
    <p class="rs-small">${esc(r.agents)} ${esc(r.privacy)} Tool ${esc(r.model.tool)}.</p>`;
}
const SHEET_CSS = `
  #prSheet{border:1px solid #654A4E;border-radius:0;padding:0;margin:auto;width:min(760px,100vw);max-width:100vw;max-height:100dvh;background:#FFFDFB;color:#33212F;font-family:'Instrument Sans',system-ui,sans-serif}
  #prSheet::backdrop{background:rgba(33,18,31,.45)}
  #prSheet .rs-bar{position:sticky;top:0;display:flex;gap:6px;flex-wrap:wrap;padding:10px 16px;background:#FFFDFB;border-bottom:1px solid #E3D0D2;z-index:1}
  #prSheet .rs-bar .pr-btn:last-child{margin-left:auto}
  #prSheet .rs-body{padding:14px 18px 22px}
  #prSheet .rs-kick{font:12px 'IBM Plex Mono',monospace;color:#654A4E;margin:0}
  #prSheet h2{font-size:22px;font-weight:500;letter-spacing:-.02em;margin:2px 0 4px;color:#21121F}
  #prSheet h3{font:500 12px 'IBM Plex Mono',monospace;color:#654A4E;margin:16px 0 6px;text-transform:lowercase}
  #prSheet .rs-mono{font:12px 'IBM Plex Mono',monospace;color:#654A4E;margin:0}
  #prSheet .rs-standing{margin:10px 0 0;padding:8px 10px;background:#E3D0D2;font-weight:600;font-size:13.5px}
  #prSheet .rs-steps{list-style:none;margin:12px 0 0;padding:0}
  #prSheet .rs-steps li{display:grid;grid-template-columns:auto 1fr auto;gap:2px 10px;padding:8px 0;border-top:1px solid #E3D0D2;align-items:baseline}
  #prSheet .rs-steps p{grid-column:1/-1;margin:0;font-size:13px}
  #prSheet .rs-sq{font:12px 'IBM Plex Mono',monospace;color:#654A4E;white-space:nowrap}
  #prSheet .rs-t{font:12px 'IBM Plex Mono',monospace;color:#756771}
  #prSheet ul{margin:0;padding-left:18px;font-size:13px}
  #prSheet li{margin:3px 0}
  #prSheet .rs-check{list-style:none;padding-left:0}
  #prSheet .rs-check li::before{content:'□ ';font-family:'IBM Plex Mono',monospace;color:#654A4E}
  #prSheet .rs-fails li{color:#7c2f43}
  #prSheet .rs-more{margin-top:14px;font-size:12.5px}
  #prSheet .rs-more summary{cursor:pointer;font:12px 'IBM Plex Mono',monospace;color:#654A4E}
  #prSheet .rs-small{font-size:12px;color:#756771;margin:10px 0 0}
  @media (max-width:520px){#prSheet{width:100vw;height:100dvh;margin:0}#prSheet .rs-body{padding:12px 14px 20px}#prSheet h2{font-size:19px}}
  @media print{body.pr-print>*:not(#prSheet){display:none!important}body.pr-print{overflow:visible!important;height:auto!important;display:block!important;background:#fff}
    body.pr-print #prSheet{position:static;display:block;border:0;width:auto;max-height:none;margin:0}body.pr-print #prSheet .rs-bar{display:none}body.pr-print #prSheet .rs-more{display:none}}`;

/** the run report on one screen: print it, download it as text or JSON, send it to a project */
export function openReport(app: Host, r: RunReport, send: () => void) {
  document.getElementById('prSheet')?.remove();
  const d = document.createElement('dialog');
  d.id = 'prSheet'; d.setAttribute('aria-label', 'Run report');
  d.innerHTML = `<style>${SHEET_CSS}</style><div class="rs-bar"><button class="pr-btn" data-a="print">Print</button><button class="pr-btn" data-a="txt">Download text</button><button class="pr-btn" data-a="json">Download JSON</button><button class="pr-btn solid" data-a="send">Send to a project</button><button class="pr-btn" data-a="close">Close</button></div><div class="rs-body">${reportHtml(r)}</div>`;
  document.body.append(d);
  const save = async (ext: 'txt' | 'json') => {
    if (!app.save) return app.log('Downloads aren’t available in this view.');
    const body = ext === 'txt' ? reportText(r) : JSON.stringify(r, null, 2);
    await app.save(reportFileName(r, ext), new Blob([body], { type: ext === 'txt' ? 'text/plain' : 'application/json' })).catch(() => void 0);
    app.log(`Run report for version ${r.model.fingerprint} offered for download. ${STANDING}`);
  };
  d.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest('[data-a]')?.getAttribute('data-a');
    if (a === 'close') d.close();
    else if (a === 'print') { document.body.classList.add('pr-print'); window.print(); setTimeout(() => document.body.classList.remove('pr-print'), 500); }
    else if (a === 'txt' || a === 'json') void save(a);
    else if (a === 'send') send();
  });
  d.addEventListener('close', () => d.remove());
  try { d.showModal(); } catch { d.setAttribute('open', ''); }
}

// ------------------------------------------------------------------------------------------------ to the ops page
/** Hand the model and its run report to the ops page (/architecture/) in a new tab. A tab opened from this one starts with
 *  a copy of this tab's session storage, so the entry written here is there to pick up; it is not a saved record. */
export function sendToProject(app: Host, plan: Plan, r: RunReport, say: (m: string) => void) {
  const entry = (withPlan: boolean) => JSON.stringify({ type: 'assembl.plan-run-handoff.v1', name: `${plan?.job?.title ?? 'Plan model'}.plan.json`, fingerprint: r.model.fingerprint, plan: withPlan ? plan : null, report: r, text: reportText(r) });
  let withPlan = true;
  try { sessionStorage.setItem(HANDOFF_KEY, entry(true)); } catch {
    withPlan = false;
    try { sessionStorage.setItem(HANDOFF_KEY, entry(false)); } catch { say('This browser would not pass the report to the ops page. Download it and add it to the project there.'); return; }
  }
  const w = window.open(OPS_PAGE, '_blank');
  if (!w) { say('The browser blocked the new tab. Allow it, or open the ops page from this tab: the report waits there until this tab closes.'); return; }
  say(`Opened the ops page in a new tab with the report${withPlan ? ' and the model' : ' (the model was too big to pass across, so only the report went)'}. Choose the project there.`);
  app.log(`Run report for version ${r.model.fingerprint} handed to the ops page. Nothing is saved until a person chooses the project.`);
}
