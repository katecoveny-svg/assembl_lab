// "Look ahead with Radar": the part of Found work that runs the assembl Pursuit research pipeline and shows what it finds.
// hunt.js draws this inside its strip (html()), hands it clicks, submits and typing, and puts its cards in "Leads and early signals".
//
// What a person does, in order: check the company profile (it starts from what the practice already has here and an owner ticks that it is
// true), write or pick a mission, press Run, read the cost warning and confirm. Radar then takes about two minutes. Its results are drafts for a
// person to review: nothing is sent, published or submitted, and nothing is added to the pipeline without a press.
// The rules are in radar-model.js; the calls are in radar-client.js; this file holds the state and the markup.
import {
  RADAR_FOCUS, LIMITS, RUN_WARNING, RUN_DETAIL, COST_NOTE, CANCEL_NOTE, draftFromWorkspace, draftFromProfile, emptyDraft, sameDescription, buildProfile, newEvidenceId,
  missionTemplates, checkMission, newUuid, cardsFromRun, SIGNAL_TYPES, STAGES, runSummary,
} from './radar-model.js';
import { shortDay, clock } from './crm-model.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
/** a review date as a person reads it: "15 Jan 2027" for a day, the function's own words otherwise */
const reviewDay = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? shortDay(String(v), new Date(0)) : String(v));
const FIELDS = ['name', 'website', 'offering', 'targetCustomers', 'voice'];

/**
 *   ctx   the page's ctx ({ account, practice, ... })
 *   opts  icon(name, cls): hunt.js's line icons; hunt(): the hunt's settings (for the first draft and the mission's regions); redraw(); client: a Radar client
 *         (radar-client.js) for tests; sectors: hunt-model's SECTORS; now(); tick(fn, ms) / untick(id): the clock that counts the minutes
 */
export function createRadar(ctx, { icon, hunt = () => null, redraw = () => {}, client = null, sectors = [], now = () => new Date(), tick = (fn, ms) => setInterval(fn, ms), untick = (id) => clearInterval(id) } = {}) {
  const role = ctx.practice?.role ?? '';
  const gate = !ctx.practice ? 'out' : role === 'viewer' ? 'viewer' : 'ok';
  const isOwner = role === 'owner';
  const S = {
    open: false, gone: false, loaded: false,
    status: { phase: 'idle', missing: [], error: '' },
    profile: { phase: 'idle', row: null, draft: emptyDraft(), saved: emptyDraft(), prefilled: false, msg: '', error: false, busy: false },
    mission: '', templateId: 'early',
    run: { phase: 'idle', runId: '', startedAt: 0, error: '', msg: '', ctl: null, timer: null },
    runs: [], runsError: '', shown: null, announce: '',
  };
  const draw = () => { if (!S.gone) redraw(); };
  const api = () => client ?? (typeof ctx.account?.radar === 'function' ? ctx.account.radar() : null);
  const hunts = () => hunt() ?? {};
  const templates = () => missionTemplates({ regions: hunts().regions ?? [] });
  const say = (text, error = false) => { S.profile.msg = text; S.profile.error = error; };

  // ---- loading: the person's own profile and past runs (free reads; nothing is sent to the function) ------------------------------------------
  async function start() {
    if (gate !== 'ok' || S.loaded) return;
    const c = api();
    if (!c) return;
    S.loaded = true;
    S.mission = templates()[0].text;
    S.profile.phase = 'loading';
    await Promise.allSettled([loadProfile(c), loadRuns(c)]);
    draw();
  }
  async function loadProfile(c) {
    try {
      const got = await c.getProfile();
      if (got?.profile) { S.profile.row = { id: got.id }; S.profile.saved = draftFromProfile(got.profile); S.profile.draft = draftFromProfile(got.profile); S.profile.prefilled = false; }
      else if (got) { S.profile.row = { id: got.id }; prefill(); } // a row we cannot trust is not used: start again from the workspace
      else prefill();
      S.profile.phase = 'ready';
    } catch (e) { S.profile.phase = 'error'; say(String(e?.message ?? 'The saved profile could not be read.'), true); prefill(); }
  }
  function prefill() {
    S.profile.draft = draftFromWorkspace({ practice: ctx.practice, hunt: hunts(), sectorLabels: sectors });
    S.profile.saved = emptyDraft(); S.profile.prefilled = true;
  }
  async function loadRuns(c = api()) {
    try { S.runs = await c.listRuns(); S.runsError = ''; if (S.shown == null && S.runs[0]) S.shown = S.runs[0].runId; }
    catch (e) { S.runsError = 'Past runs could not be read just now.'; }
  }
  async function checkStatus() {
    const c = api();
    if (!c) return;
    S.status = { phase: 'checking', missing: [], error: '' }; draw();
    try { const r = await c.status(); S.status = { phase: r.unknown ? 'error' : r.ready ? 'ready' : 'missing', missing: r.missing, error: r.unknown ? 'Radar gave an answer this page does not understand.' : '' }; }
    catch (e) { S.status = { phase: 'error', missing: [], error: String(e?.message ?? e) }; }
    S.announce = S.status.phase === 'ready' ? 'Radar is ready.' : S.status.phase === 'missing' ? 'Radar is not ready.' : 'Radar could not be checked.';
    draw();
  }

  // ---- the profile ---------------------------------------------------------------------------------------------------------------------
  const dirty = () => !sameDescription(S.profile.draft, S.profile.saved) || (S.profile.draft.approved === true) !== (S.profile.saved.approved === true);
  /** the saved, approved profile Radar will use, or '' with the reason a run cannot start */
  function runBlock() {
    const P = S.profile;
    if (!P.row || !P.saved.name) return 'Save the company profile first.';
    if (dirty()) return 'The profile has changes that are not saved. Save it first.';
    if (!P.saved.approved) return isOwner ? 'Tick “I’ve checked this description” and save the profile.' : 'An owner needs to tick “I’ve checked this description” on the profile. Radar will not run without it.';
    if (!checkMission(S.mission).ok) return checkMission(S.mission).error;
    if (S.status.phase === 'missing') return 'Radar is not set up yet in this workspace: see what is missing above. Nothing was sent.';
    return '';
  }
  async function saveProfile() {
    const P = S.profile, c = api();
    if (P.busy || !c) return;
    let profile;
    try { profile = buildProfile(P.draft, { id: P.row?.id ?? newUuid(), canApprove: isOwner }); } catch (e) { say(String(e.message), true); return draw(); }
    P.busy = true; say(''); draw();
    try {
      await c.saveProfile(profile, { isNew: !P.row });
      P.row = { id: profile.id }; P.saved = draftFromProfile(profile); P.draft = draftFromProfile(profile); P.prefilled = false;
      say(profile.approved ? 'Saved. This description is checked, so Radar can use it.' : isOwner ? 'Saved, but not checked yet. Tick “I’ve checked this description” and save again before running Radar.' : 'Saved. An owner needs to tick “I’ve checked this description” before Radar can run.');
      S.announce = P.msg;
    } catch (e) { say(String(e?.message ?? e), true); }
    P.busy = false; draw();
  }
  /** a typed change: the form's own state is kept here, and an edit to a checked description clears the tick until it is checked again */
  function input(ev) {
    const t = ev.target;
    const f = t?.closest?.('[data-radar-f]'), e = t?.closest?.('[data-radar-ev]'), m = t?.closest?.('[data-radar-mission]'), a = t?.closest?.('[data-radar-approve]');
    const D = S.profile.draft;
    if (m) { S.mission = String(m.value ?? ''); const n = globalThis.document?.querySelector?.('[data-radar-count]'); if (n) n.textContent = countText(); return true; }
    if (!f && !e && !a) return false;
    if (f && FIELDS.includes(f.dataset.radarF)) D[f.dataset.radarF] = String(f.value ?? '');
    if (e) {
      const [i, key] = String(e.dataset.radarEv).split(':'), item = D.evidence[Number(i)];
      if (item && key === 'approved') item.approved = !!e.checked; else if (item && (key === 'title' || key === 'body')) item[key] = String(e.value ?? '');
    }
    if (a) D.approved = !!a.checked && isOwner;
    if (!a && D.approved && !sameDescription(D, S.profile.saved)) { // changed after it was checked: it has to be checked again
      D.approved = false;
      const box = globalThis.document?.querySelector?.('[data-radar-approve]'); if (box) box.checked = false;
      const note = globalThis.document?.querySelector?.('[data-radar-approve-note]'); if (note) note.textContent = 'You changed the description, so the tick was cleared. Tick it again once you have checked it.';
    }
    return true;
  }
  const countText = () => { const n = S.mission.trim().length; return `${n.toLocaleString('en-NZ')} of ${LIMITS.mission.toLocaleString('en-NZ')} characters`; };

  // ---- running -------------------------------------------------------------------------------------------------------------------------
  /** step one: check readiness (free), then ask for the confirm. Nothing paid has been sent. */
  async function askToRun() {
    const R = S.run;
    if (R.phase === 'running') return;
    const why = runBlock();
    if (why) { R.phase = 'error'; R.error = why; return draw(); }
    R.phase = 'idle'; R.error = ''; R.msg = '';
    await checkStatus();
    if (S.status.phase !== 'ready') { R.phase = 'error'; R.error = S.status.phase === 'missing' ? `Radar is not ready: ${S.status.missing.join(', ') || 'something is not set up'}. Nothing was sent.` : `${S.status.error || 'Radar could not be checked.'} Nothing was sent.`; return draw(); }
    R.phase = 'confirm'; R.runId = newUuid(); draw();
  }
  function cancelConfirm() { if (S.run.phase === 'confirm') { S.run.phase = 'idle'; S.run.runId = ''; draw(); } }
  /** step two, only after "Yes, run Radar": the paid call. Without the confirm step and the confirmed flag, nothing is sent. */
  async function run({ confirmed = false } = {}) {
    const R = S.run, c = api();
    if (confirmed !== true || R.phase !== 'confirm' || !c) return null;
    const why = runBlock(); if (why) { R.phase = 'error'; R.error = why; draw(); return null; }
    const ctl = new AbortController(); R.ctl = ctl; R.phase = 'running'; R.startedAt = now().getTime(); R.error = ''; R.msg = '';
    R.timer = tick(() => { const el = globalThis.document?.querySelector?.('[data-radar-elapsed]'); if (el) el.textContent = mmss(now().getTime() - R.startedAt); }, 1000);
    S.announce = 'Radar is running. This can take about two minutes.'; draw();
    const runId = R.runId;
    try {
      const result = await c.run({ mission: S.mission, sellerProfileId: S.profile.row.id, runId, signal: ctl.signal });
      finish(); await loadRuns(c); S.shown = result.runId;
      R.phase = 'done'; R.msg = result.opportunities.length ? `Radar found ${plural(result.opportunities.length, 'opportunity', 'opportunities')}${result.skipped ? ` and ${result.skipped} more that could not be shown` : ''}. They are in “Leads and early signals” below, marked as drafts for review.` : 'Radar found nothing it could defend this time. That is a valid answer: nothing was added.';
      S.announce = R.msg;
    } catch (e) {
      finish();
      await loadRuns(c); // it may have finished and been saved before the answer was lost
      const saved = S.runs.find((x) => x.runId === runId);
      if (saved && (e.code === 'timeout' || e.code === 'network' || e.code === 'stopped')) { S.shown = saved.runId; R.phase = 'done'; R.msg = 'Radar had finished and saved this run. It is in “Leads and early signals” below.'; }
      else { R.phase = e.code === 'stopped' ? 'idle' : 'error'; R.error = String(e?.message ?? e); if (e.code === 'stopped') R.msg = R.error; }
    }
    draw();
    return S.runs.find((x) => x.runId === runId) ?? null;
  }
  function finish() { if (S.run.timer != null) untick(S.run.timer); S.run.timer = null; S.run.ctl = null; }
  function stopWaiting() { if (S.run.phase === 'running') S.run.ctl?.abort(); }

  // ---- what the lane shows ---------------------------------------------------------------------------------------------------------------
  const shownRun = () => S.runs.find((r) => r.runId === S.shown) ?? null;
  const cards = () => (gate === 'ok' ? cardsFromRun(shownRun()) : []);

  // ---- drawing -------------------------------------------------------------------------------------------------------------------------
  const flash = (text, error = false) => `<p class="hunt-flash${error ? ' is-error' : ''}" role="${error ? 'alert' : 'status'}">${icon(error ? 'alert' : 'check')}<span>${esc(text)}</span></p>`;
  const when = (r) => { const d = r.generatedAt ? new Date(r.generatedAt) : null; return d ? `${shortDay(r.generatedAt.slice(0, 10), now())}, ${clock(d)}` : 'a day not recorded'; };

  function evidenceRows() {
    const D = S.profile.draft, off = gate === 'ok' ? '' : ' disabled';
    return D.evidence.map((e, i) => `<fieldset class="hunt-f wide hunt-ev"><legend>Evidence item ${i + 1}</legend>
      <label class="hunt-f"><span>Title</span><input type="text" data-radar-ev="${i}:title" value="${esc(e.title)}" maxlength="${LIMITS.evidenceTitle}" autocomplete="off"${off}></label>
      <label class="hunt-f"><span>The practice’s own words</span><textarea data-radar-ev="${i}:body" rows="3" maxlength="${LIMITS.evidenceBody}"${off}>${esc(e.body)}</textarea></label>
      <div class="hunt-acts"><label class="hunt-opt wide"><input type="checkbox" data-radar-ev="${i}:approved"${e.approved ? ' checked' : ''}${off}><span>These are our own words, checked by a person</span></label><button type="button" class="hunt-link" data-radar="ev-remove" data-i="${i}">Remove item ${i + 1}</button></div></fieldset>`).join('');
  }
  function profileHtml() {
    const P = S.profile, D = P.draft, off = '';
    if (P.phase === 'loading' || P.phase === 'idle') return `<p class="hunt-dim" aria-busy="true">Reading this sign-in’s saved profile…</p>`;
    const where = P.prefilled ? `<p class="hunt-note">${icon('send')}<span>Started from what this practice already has here: its name, and the words, sectors and regions under “What to look for”. Nothing else was added. Change it until it is true, because Radar treats it as the description of the practice.</span></p>` : `<p class="hunt-note">${icon('check')}<span>This is the profile saved under your sign-in. Radar uses the saved copy.</span></p>`;
    const approve = isOwner
      ? `<label class="hunt-opt wide"><input type="checkbox" data-radar-approve${D.approved ? ' checked' : ''}><span><strong class="hunt-opt-t">I’ve checked this description</strong>It says what the practice really offers, for the customers and regions named. Radar will not run until an owner ticks this.</span></label><p class="hunt-dim" data-radar-approve-note></p>`
      : `<label class="hunt-opt wide"><input type="checkbox" disabled><span><strong class="hunt-opt-t">I’ve checked this description</strong>Only an owner can tick this. You can still save a draft.</span></label>`;
    return `<form class="hunt-panel hunt-radar-form" data-radar-form="profile" aria-label="Company profile for Radar" novalidate>
      ${where}
      <label class="hunt-f"><span>Name</span><input type="text" data-radar-f="name" value="${esc(D.name)}" maxlength="${LIMITS.name}" autocomplete="off"></label>
      <label class="hunt-f"><span>Website <small>(optional)</small></span><input type="text" inputmode="url" data-radar-f="website" value="${esc(D.website)}" placeholder="https://" autocomplete="off"></label>
      <label class="hunt-f wide"><span>What the practice offers: services, sectors and regions</span><textarea data-radar-f="offering" rows="6" maxlength="${LIMITS.offering}">${esc(D.offering)}</textarea></label>
      <label class="hunt-f wide"><span>Who it works for <small>(optional)</small></span><textarea data-radar-f="targetCustomers" rows="2" maxlength="${LIMITS.targetCustomers}">${esc(D.targetCustomers)}</textarea></label>
      <label class="hunt-f wide"><span>How it speaks <small>(optional)</small></span><textarea data-radar-f="voice" rows="2" maxlength="${LIMITS.voice}" placeholder="Plain, warm, specific">${esc(D.voice)}</textarea></label>
      <div class="hunt-f wide"><span class="hunt-lab">Evidence <small>(optional)</small></span><small>Short passages in the practice’s own words, for example a project description it already publishes. Radar treats ticked items as the only proof of past work, and never invents experience, awards, people or credentials. Leave this empty rather than guess.</small></div>
      ${evidenceRows()}
      ${D.evidence.length < LIMITS.evidence ? `<div class="hunt-f wide"><button type="button" class="hunt-btn" data-radar="ev-add">${icon('plus')}<span>Add an evidence item</span></button></div>` : ''}
      <div class="hunt-f wide">${approve}</div>
      ${P.msg ? `<div class="hunt-f wide">${flash(P.msg, P.error)}</div>` : ''}
      <div class="hunt-acts"><button type="submit" class="hunt-btn solid"${P.busy ? ' disabled' : ''}>${icon('check')}<span>${P.busy ? 'Saving…' : 'Save the profile'}</span></button></div>
    </form>`;
  }
  function missionHtml() {
    const m = checkMission(S.mission);
    return `<div class="hunt-panel hunt-radar-mission">
      <div class="hunt-f wide"><span class="hunt-lab">Start from</span><div class="hunt-opts">${templates().map((t) => `<button type="button" class="hunt-btn" data-radar="template" data-id="${esc(t.id)}">${esc(t.label)}</button>`).join('')}</div><small>Choosing one replaces the text below. Edit it before you run: what you write is what Radar researches.</small></div>
      <label class="hunt-f wide"><span>Mission</span><textarea data-radar-mission rows="9" aria-describedby="radar-count">${esc(S.mission)}</textarea><small id="radar-count" data-radar-count>${esc(countText())}</small></label>
      ${m.ok || !S.mission.trim() ? '' : flash(m.error, true)}
    </div>`;
  }
  function statusHtml() {
    const s = S.status;
    const line = s.phase === 'ready' ? `${icon('check')}<span><b>Radar is ready.</b> The workspace has its provider connection and models set.</span>`
      : s.phase === 'missing' ? `${icon('alert')}<span><b>Radar is not ready.</b> Missing: ${esc(s.missing.join(', ') || 'something that is not named')}. Nothing can be run until an owner of assembl sets this up.</span>`
      : s.phase === 'checking' ? `${icon('refresh')}<span>Checking whether Radar is ready. This is free: it makes no research calls.</span>`
      : s.phase === 'error' ? `${icon('alert')}<span>${esc(s.error)}</span>` : `${icon('clock')}<span>Not checked yet. Checking is free: it makes no research calls.</span>`;
    return `<p class="hunt-radar-state${s.phase === 'missing' || s.phase === 'error' ? ' is-bad' : ''}" role="status">${line}</p><div class="hunt-acts"><button type="button" class="hunt-btn" data-radar="status"${s.phase === 'checking' ? ' disabled' : ''}>${icon('refresh')}<span>Check Radar is ready</span></button></div>`;
  }
  function runHtml() {
    const R = S.run, block = runBlock();
    if (R.phase === 'confirm') {
      return `<div class="hunt-confirm" role="alertdialog" aria-labelledby="radar-confirm-h" aria-describedby="radar-confirm-t"><h4 id="radar-confirm-h" class="hunt-confirm-h">${icon('alert')}<span>Run Radar?</span></h4>
        <p id="radar-confirm-t"><b>${esc(RUN_WARNING)}</b></p><p>${esc(RUN_DETAIL)}</p><p>${esc(COST_NOTE)}</p><p class="hunt-dim">It researches the mission above for ${esc(S.profile.saved.name)}, as described in the saved profile. Results are drafts for a person to review. Nothing is sent or published.</p>
        <div class="hunt-acts"><button type="button" class="hunt-btn solid" data-radar="run-confirm">${icon('check')}<span>Yes, run Radar (paid)</span></button><button type="button" class="hunt-btn" data-radar="run-cancel">Do not run</button></div></div>`;
    }
    if (R.phase === 'running') {
      return `<div class="hunt-running" role="status" aria-live="polite"><p class="hunt-running-t">${icon('refresh', 'hunt-spin')}<span>Radar is researching. <b data-radar-elapsed>${esc(mmss(now().getTime() - R.startedAt))}</b> so far. This can take about two minutes.</span></p>
        <div class="hunt-bar-run" aria-hidden="true"><i></i></div><p class="hunt-dim">Radar does not say which stage it is in, so this page does not guess. ${esc(CANCEL_NOTE)}</p>
        <div class="hunt-acts"><button type="button" class="hunt-btn" data-radar="run-stop">Stop waiting</button></div></div>`;
    }
    const msg = R.error ? flash(R.error, true) : R.msg ? flash(R.msg) : '';
    return `${msg}<div class="hunt-acts"><button type="button" class="hunt-btn solid" data-radar="run-start"${block || R.phase === 'checking' ? ' aria-describedby="radar-block"' : ''}${block ? ' aria-disabled="true"' : ''}>${icon('search')}<span>Run Radar…</span></button></div>
      <p class="hunt-dim">${esc(RUN_WARNING)} You will be asked to confirm before anything is sent.</p>${block ? `<p class="hunt-dim" id="radar-block"><b>Not yet:</b> ${esc(block)}</p>` : ''}`;
  }
  function pastHtml() {
    if (S.runsError) return `<p class="hunt-dim">${esc(S.runsError)}</p>`;
    if (!S.runs.length) return `<p class="hunt-dim">No past runs under this sign-in yet. Runs are saved under the signed-in person’s own account, so other people in the practice will not see them. Add a finding to the pipeline to share it.</p>`;
    return `<ul class="hunt-runs">${S.runs.map((r) => `<li class="hunt-run${S.shown === r.runId ? ' is-shown' : ''}"><div><b>${esc(when(r))}</b> <span class="hunt-dim">${plural(r.opportunities.length, 'finding')}${r.skipped ? `, ${r.skipped} not shown` : ''}</span><p class="hunt-run-m">${esc(r.mission.slice(0, 140))}${r.mission.length > 140 ? '…' : ''}</p></div>
      ${S.shown === r.runId ? `<span class="hunt-added">${icon('check')}<span>In the lane</span></span><button type="button" class="hunt-link" data-radar="hide-run">Hide</button>` : `<button type="button" class="hunt-btn" data-radar="open-run" data-id="${esc(r.runId)}" aria-label="Show the run from ${esc(when(r))} in the lane (free, no new run)">Show</button>`}</li>`).join('')}</ul><p class="hunt-dim">Showing a past run reads what was saved. It does not run Radar again and costs nothing.</p>`;
  }
  function html() {
    const head = `<summary data-radar="toggle" aria-expanded="${S.open}"><span>${icon('eye')}<span>Look ahead with Radar</span></span>${cards().length ? `<span class="hunt-count">${cards().length}<span class="vh"> Radar findings in the lane</span></span>` : ''}</summary>`;
    let inner = '';
    if (!S.open) inner = ''; // closed: nothing of the form is drawn, so a closed panel adds nothing to the page
    else if (gate === 'out') inner = `<p class="hunt-dim">Radar needs the practice’s sign-in. It saves its company profile and its runs under the signed-in person’s own account, and each run is a paid research call, so it does not work while you are signed out. Sign in to the practice to use it.</p>`;
    else if (gate === 'viewer') inner = `<p class="hunt-dim">A viewer can read what Radar found when it is added to the pipeline, but cannot set up or run Radar. Ask an owner or member.</p>`;
    else if (!api()) inner = `<p class="hunt-dim">Radar needs the shared records, and they are not reachable just now. Try again in a few minutes.</p>`;
    else inner = `<div class="hunt-alerts-in hunt-radar-in">
      <p class="hunt-dim">Radar looks ahead. Scouts search public sources for early signs of work, a second pass checks what they found, and a final step returns at most three opportunities with the sources behind them. Everything is a draft for a person to review: nothing is sent, published or submitted, and nothing reaches the pipeline until you press “Add to pipeline”.</p>
      <h4 class="hunt-radar-h"><span>1</span> Company profile</h4>${profileHtml()}
      <h4 class="hunt-radar-h"><span>2</span> Mission</h4>${missionHtml()}
      <h4 class="hunt-radar-h"><span>3</span> Run</h4><div class="hunt-radar-run">${statusHtml()}${runHtml()}</div>
      <h4 class="hunt-radar-h"><span>4</span> Past runs</h4>${pastHtml()}</div>`;
    return `<details class="hunt-alerts hunt-radar"${S.open ? ' open' : ''} data-radar-panel>${head}${inner}<p class="vh" role="status" aria-live="polite">${esc(S.announce)}</p></details>`;
  }

  /** one finding as a card in the lane. made = the enquiry already made from it (or null), busy = being added. */
  function cardHtml(s, { made = null, busy = false, readOnly = false } = {}) {
    const r = s.radar, o = r.opportunity, hold = r.hold;
    const checked = (e) => (e.verified ? `<span class="hunt-ck is-yes">${icon('check', 'hunt-i-s')}<span>Checked</span></span>` : `<span class="hunt-ck"><span>Not independently checked</span></span>`);
    const ev = o.evidence.map((e) => `<li><a class="hunt-link" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.title)}<span class="vh"> (opens in a new tab)</span></a>${checked(e)}${e.caveat ? `<small class="hunt-cav">${esc(e.caveat)}</small>` : ''}</li>`).join('');
    const unknowns = o.unknowns.length ? `<p class="hunt-lbl">Not known</p><ul class="hunt-unk">${o.unknowns.map((u) => `<li>${esc(u)}</li>`).join('')}</ul>` : '';
    const ideas = o.outcome || o.demoIdea ? `<details class="hunt-why"><summary>Ideas</summary>${o.outcome ? `<p class="hunt-lbl">What the practice could offer</p><p class="hunt-p">${esc(o.outcome)}</p>` : ''}${o.demoIdea ? `<p class="hunt-lbl">A way to show it</p><p class="hunt-p">${esc(o.demoIdea)}</p>` : ''}${o.buyerRoles.length ? `<p class="hunt-lbl">People who may decide</p><p class="hunt-p">${esc(o.buyerRoles.join(', '))}</p>` : ''}</details>` : '';
    const n = Math.max(1, Math.min(5, Math.round(o.score.total / 20)));
    const acts = readOnly ? '' : made
      ? `<div class="hunt-acts"><span class="hunt-added">${icon('check')}<span>Added to the pipeline</span></span><a class="hunt-link" href="#/crm/e/${encodeURIComponent(made.id)}">Open the enquiry</a></div>`
      : `<div class="hunt-acts"><button type="button" class="hunt-btn solid" data-hunt="add" data-id="${esc(s.id)}" aria-label="Add ${esc(s.title)} to the pipeline as an early signal"${busy ? ' disabled' : ''}>${icon('plus')}<span>${busy ? 'Adding…' : 'Add to pipeline'}</span></button><button type="button" class="hunt-link" data-hunt="no" data-id="${esc(s.id)}" aria-label="Not for us: hide ${esc(s.title)}">Not for us</button></div>`;
    return `<li class="hunt-card is-signal is-radar${hold ? ' is-hold' : ''}${made ? ' is-added' : ''}" data-id="${esc(s.id)}" data-kind="signal" data-source="radar">
      <p class="hunt-kind">${icon('eye', 'hunt-i-s')}<span>Early signal from Radar</span></p>
      <p class="hunt-draft">Draft, for review. Nothing has been sent.</p>
      <a class="hunt-title" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(o.headline)}</span>${icon('out', 'hunt-i-s')}<span class="vh"> (opens the first source)</span></a>
      ${hold ? `<p class="hunt-hold"><b>On hold.</b> ${esc(r.holdReason)}</p>` : ''}
      <div class="hunt-meta">${o.accountName ? `<span class="hunt-chip"><span>${esc(o.accountName)}</span></span>` : ''}<span class="hunt-chip is-src"><span>${esc(SIGNAL_TYPES[o.signalType])}</span></span><span class="hunt-chip"><span>${esc(STAGES[o.stage])}</span></span>${r.generatedAt ? `<span class="hunt-chip">${icon('clock', 'hunt-i-s')}<span>${esc(shortDay(r.generatedAt.slice(0, 10), now()))}</span></span>` : ''}</div>
      <p class="hunt-fit" title="A sorting aid worked out from four scores. It is not a chance of winning."><span class="hunt-meter" role="img" aria-label="Sorting score ${o.score.total} out of 100">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span><span class="hunt-fit-w">Sorting score ${o.score.total} of 100</span></p>
      <p class="hunt-notopp">A sorting aid, not a chance of winning.</p>
      ${o.whatChanged ? `<p class="hunt-lbl">What changed</p><p class="hunt-p">${esc(o.whatChanged)}</p>` : ''}
      ${o.whyItMayMatter ? `<p class="hunt-lbl">Why it may matter</p><p class="hunt-p">${esc(o.whyItMayMatter)}</p>` : ''}
      <p class="hunt-lbl">Sources</p><ul class="hunt-evidence hunt-ev-list" aria-label="Sources">${ev}</ul>
      ${unknowns}
      ${o.nextAction ? `<p class="hunt-lbl">Next step</p><p class="hunt-p">${esc(o.nextAction)}${o.reviewAt ? ` <span class="hunt-dim">Review by ${esc(reviewDay(o.reviewAt))}.</span>` : ''}</p>` : ''}
      ${ideas}${acts}
    </li>`;
  }

  // ---- events ------------------------------------------------------------------------------------------------------------------------------
  async function click(ev) {
    const t = ev.target?.closest?.('[data-radar]');
    const act = t?.dataset?.radar;
    if (!act) return false;
    if (act === 'toggle') { ev.preventDefault?.(); S.open = !S.open; draw(); if (S.open && gate === 'ok') { await start(); if (S.status.phase === 'idle') await checkStatus(); } return true; }
    if (gate !== 'ok') return true;
    if (act === 'status') { await checkStatus(); return true; }
    if (act === 'template') { const x = templates().find((y) => y.id === t.dataset.id); if (x) { S.mission = x.text; S.templateId = x.id; draw(); } return true; }
    if (act === 'ev-add') { if (S.profile.draft.evidence.length < LIMITS.evidence) { S.profile.draft.evidence.push({ id: newEvidenceId(), title: '', body: '', approved: false }); S.profile.draft.approved = false; } draw(); return true; }
    if (act === 'ev-remove') { S.profile.draft.evidence.splice(Number(t.dataset.i), 1); S.profile.draft.approved = false; draw(); return true; }
    if (act === 'run-start') { await askToRun(); return true; }
    if (act === 'run-cancel') { cancelConfirm(); return true; }
    if (act === 'run-confirm') { await run({ confirmed: true }); return true; }
    if (act === 'run-stop') { stopWaiting(); return true; }
    if (act === 'open-run') { if (S.runs.some((r) => r.runId === t.dataset.id)) { S.shown = t.dataset.id; S.announce = 'Showing a saved run in the lane. No new run was made.'; draw(); } return true; }
    if (act === 'hide-run') { S.shown = null; draw(); return true; }
    return false;
  }
  async function submit(ev) {
    const form = ev.target?.closest?.('form[data-radar-form]');
    if (!form?.dataset?.radarForm) return false;
    ev.preventDefault?.();
    if (gate === 'ok') await saveProfile();
    return true;
  }

  return {
    html, cardHtml, start, click, submit, input, cards, saveProfile, askToRun, run, cancelConfirm, stopWaiting, checkStatus, loadRuns,
    /** the Radar tools open only when the panel is open; the lane's cards show whatever run is chosen */
    get gate() { return gate; },
    summary: runSummary,
    stop() { S.gone = true; finish(); if (S.run.phase === 'running') S.run.ctl?.abort(); },
    get state() { return S; },
    RADAR_FOCUS,
  };
}
