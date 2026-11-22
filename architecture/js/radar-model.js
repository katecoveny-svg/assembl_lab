// "Look ahead with Radar": the rules, with no page in them and no network.
// Radar is the assembl Pursuit research pipeline (the edge function radar-pursuit-v2): scouts search the web, a second pass checks
// their sources, producers draft ideas and a director returns at most three opportunities. This file holds
//   - the company profile a run is about, validated the way the function validates it (sellerProfileSchema in the main repo's
//     supabase/functions/_shared/studioContract.ts, mirrored here by hand: if that schema changes, change this and its test),
//   - the mission (at most 4,000 characters) and its templates,
//   - what a run costs, in words (never a number we cannot stand behind),
//   - how one opportunity becomes a card in "Leads and early signals" and what it keeps when a person adds it to the pipeline.
// Nothing here saves, sends or reaches the network: radar-client.js does the calls, radar.js draws, and only a person's press starts anything.

/**
 * The profile's `focus`. The function's radarScope.ts (sellerFocus, scopeInstructions) reads it like this:
 *   technology    an enterprise software seller. Physical building work is held back as "not for this seller" (scopeIssue). Wrong for an architecture practice.
 *   construction  a main contractor. Research is steered to contractor evidence, staging and site access, and design services are not the aim. Wrong for a design practice.
 *   agency        reads the same as "other" for anyone who is not named "assembl" (the name is checked first), but says "agency".
 *   other         "Match every opportunity to this seller's reviewed offering": no assumption about what is sold or who delivers it.
 * An architecture practice sells design and advice, not software and not building work, so "other" is the value that steers the research
 * least in the wrong direction. If the function later learns an architecture focus, change this one constant and the test that names it.
 */
export const RADAR_FOCUS = 'other';

export const LIMITS = { name: 100, website: 1500, offering: 3000, targetCustomers: 1800, voice: 600, evidence: 12, evidenceTitle: 160, evidenceBody: 6000, id: 100, mission: 4000, missionMin: 10 };
/** the words the Run button says, and the cost line. Kept here so the page and the tests say the same thing. */
export const RUN_WARNING = 'This sends about 16 research calls with web search to the model provider. It is a paid run.';
export const RUN_DETAIL = 'Ten of the sixteen search the web. Radar works in stages (scouts, a second check of their sources, drafts, then a final shortlist of at most three) and does not report which stage it is in, so the page shows only the time that has passed. A run can take about two minutes.';
export const COST_NOTE = 'The cost is not known in advance. It depends on the models and the provider the workspace is set up with, and the page cannot see either. Check the model provider’s usage page afterwards.';
export const CANCEL_NOTE = 'Stopping only stops waiting. If Radar has already started, it may still finish and be saved under past runs, and any cost is still charged.';
export const RUN_TIMEOUT_MS = 150000; // the function gives up at 125 seconds (supabase/functions/radar-pursuit-v2/index.ts); a little longer is allowed for the network

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v) => UUID.test(String(v ?? ''));
export function newUuid() {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

/** a link the function accepts: public http(s), no sign-in details in it, at most 1,500 characters */
export function okUrl(s, max = LIMITS.website) {
  const v = String(s ?? '');
  if (!v || v.length > max) return false;
  try { const u = new URL(v); return (u.protocol === 'https:' || u.protocol === 'http:') && !u.username && !u.password; } catch { return false; }
}
const https = (v) => { const u = String(v ?? '').trim(); return okUrl(u, 1500) && u.startsWith('https://') ? u : ''; };

// ---- the profile -----------------------------------------------------------------------------------------------------------------
export const emptyDraft = () => ({ name: '', website: '', offering: '', targetCustomers: '', voice: '', evidence: [], approved: false });

/**
 * A first draft from what the practice already has in the workspace: its name, the words, sectors and regions it set under
 * "What to look for", and the kaupapa Māori lens. Nothing else: no experience, awards, people or credentials are ever filled in.
 * `sectorLabels` is hunt-model's SECTORS list; it is passed in so this file imports nothing.
 */
export function draftFromWorkspace({ practice = null, hunt = null, sectorLabels = [] } = {}) {
  const d = emptyDraft();
  d.name = clean(practice?.name).slice(0, LIMITS.name);
  const labelOf = (k) => (sectorLabels.find(([key]) => key === k) || [k, k])[1];
  const words = (hunt?.keywords ?? []).map(clean).filter(Boolean), sectors = (hunt?.sectors ?? []).map(labelOf), regions = (hunt?.regions ?? []).map(clean).filter(Boolean);
  const kaupapa = hunt?.cultural === true || (hunt?.sectors ?? []).includes('kaupapa');
  const parts = ['An architecture practice.'];
  if (words.length) parts.push(`Work it looks for: ${words.join(', ')}.`);
  if (sectors.length) parts.push(`Sectors: ${sectors.join(', ')}.`);
  if (regions.length) parts.push(`Regions: ${regions.join(', ')}.`);
  if (kaupapa) parts.push('Includes kaupapa Māori and Indigenous work.');
  d.offering = parts.join(' ').slice(0, LIMITS.offering);
  d.targetCustomers = sectors.length ? `Buyers in these sectors: ${sectors.join(', ')}.`.slice(0, LIMITS.targetCustomers) : '';
  return d;
}

/** a profile row's content as the form holds it */
export function draftFromProfile(p) {
  const d = emptyDraft();
  if (!p || typeof p !== 'object') return d;
  d.name = String(p.name ?? ''); d.website = String(p.website ?? ''); d.offering = String(p.offering ?? ''); d.targetCustomers = String(p.targetCustomers ?? ''); d.voice = String(p.voice ?? '');
  d.evidence = (Array.isArray(p.evidence) ? p.evidence : []).slice(0, LIMITS.evidence).map((e) => ({ id: String(e?.id ?? newEvidenceId()), title: String(e?.title ?? ''), body: String(e?.body ?? ''), approved: e?.approved === true }));
  d.approved = p.approved === true;
  return d;
}
export const newEvidenceId = () => `ev-${newUuid().slice(0, 8)}`;

/** do two drafts say the same thing (ignoring the "I've checked this" box)? Used to clear the box when a person edits an approved description. */
export function sameDescription(a, b) {
  const f = (d) => JSON.stringify([clean(d.name), clean(d.website), String(d.offering ?? '').trim(), String(d.targetCustomers ?? '').trim(), String(d.voice ?? '').trim(),
    (d.evidence ?? []).map((e) => [String(e.title ?? '').trim(), String(e.body ?? '').trim(), e.approved === true])]);
  return f(a) === f(b);
}

/**
 * The profile as the function takes it (sellerProfileSchema, strict). `id` is the row's id (a uuid: the table's check needs profile.id = id).
 * `approved` is set only by an owner's tick, and only an owner may set it. Throws one plain sentence naming the thing to fix.
 */
export function buildProfile(draft, { id, canApprove = false } = {}) {
  const d = draft && typeof draft === 'object' ? draft : {};
  if (!isUuid(id)) throw new Error('This profile has no valid number. Reload the page and try again.');
  const name = String(d.name ?? '').trim(), offering = String(d.offering ?? '').trim(), targetCustomers = String(d.targetCustomers ?? '').trim(), voice = String(d.voice ?? '').trim(), website = String(d.website ?? '').trim();
  if (!name) throw new Error('Give the practice a name.');
  if (name.length > LIMITS.name) throw new Error(`The name is over ${LIMITS.name} characters.`);
  if (website && !okUrl(website)) throw new Error('The website must be a full web address such as https://example.org, with no sign-in details in it.');
  if (!offering) throw new Error('Say what the practice offers: services, sectors and regions.');
  if (offering.length > LIMITS.offering) throw new Error(`What the practice offers is over ${LIMITS.offering} characters (${offering.length}).`);
  if (targetCustomers.length > LIMITS.targetCustomers) throw new Error(`The customers line is over ${LIMITS.targetCustomers} characters (${targetCustomers.length}).`);
  if (voice.length > LIMITS.voice) throw new Error(`The voice line is over ${LIMITS.voice} characters (${voice.length}).`);
  const rows = (Array.isArray(d.evidence) ? d.evidence : []).filter((e) => String(e?.title ?? '').trim() || String(e?.body ?? '').trim());
  if (rows.length > LIMITS.evidence) throw new Error(`Keep to ${LIMITS.evidence} evidence items.`);
  const seen = new Set();
  const evidence = rows.map((e, i) => {
    const title = String(e.title ?? '').trim(), body = String(e.body ?? '').trim(), eid = String(e.id ?? '').trim() || newEvidenceId();
    if (!title) throw new Error(`Evidence item ${i + 1} needs a title.`);
    if (!body) throw new Error(`Evidence item ${i + 1} needs the practice’s own words.`);
    if (title.length > LIMITS.evidenceTitle) throw new Error(`Evidence item ${i + 1}: the title is over ${LIMITS.evidenceTitle} characters.`);
    if (body.length > LIMITS.evidenceBody) throw new Error(`Evidence item ${i + 1}: the words are over ${LIMITS.evidenceBody} characters.`);
    if (eid.length > LIMITS.id || seen.has(eid)) throw new Error(`Evidence item ${i + 1} has a number that is too long or repeated. Remove it and add it again.`);
    seen.add(eid);
    return { id: eid, title, body, approved: e.approved === true };
  });
  return { id, name, focus: RADAR_FOCUS, website, offering, targetCustomers, voice, approved: canApprove && d.approved === true, evidence };
}

/** the profile as a saved row's `profile` holds it, checked again before it is trusted (a bad row gives null, never a half profile) */
export function readProfileRow(row) {
  const p = row?.profile;
  if (!p || typeof p !== 'object' || !isUuid(row.id) || p.id !== row.id) return null;
  try { return { ...buildProfile(draftFromProfile(p), { id: row.id, canApprove: true }), approved: p.approved === true, focus: p.focus ?? RADAR_FOCUS }; } catch { return null; }
}

// ---- the mission ---------------------------------------------------------------------------------------------------------------------
const place = (regions) => (regions?.length ? regions.join(', ') : 'New Zealand');
/** starting points a person edits before running. Regions come from "What to look for". */
export function missionTemplates({ regions = [] } = {}) {
  const where = place(regions);
  const t = [
    { id: 'early', label: 'Early signs of work', text: `Find early signs (6–24 months ahead) of architecture and design work for this practice in ${where}, including kaupapa Māori and Indigenous work (marae, papakāinga, kura, iwi and hapū facilities), schools, health, housing and community buildings. Prefer primary sources: Beehive, the Gazette, council plans and agendas, iwi and Te Puni Kōkiri announcements, GETS future procurement.` },
    { id: 'kaupapa', label: 'Kaupapa Māori and Indigenous work', text: `Find early signs (6–24 months ahead) of kaupapa Māori and Indigenous building work in ${where}: marae, papakāinga, kura, and iwi and hapū facilities, including funding rounds and Treaty settlement or Crown announcements that point to design work. Prefer primary sources: iwi and hapū announcements, Te Puni Kōkiri, the Beehive, the Gazette and council plans. Say plainly what is not confirmed.` },
    { id: 'planned', label: 'Planned public procurement', text: `Find planned or upcoming public procurement in ${where} that a design practice could respond to: GETS future procurement notices and the buyers’ own procurement pages for councils, schools, health and housing. Check each notice, its status, scope and any closing date. Closed or awarded notices are context only. Do not invent tenders.` },
  ];
  return t.map((x) => ({ ...x, text: x.text.slice(0, LIMITS.mission) }));
}
/** the mission as the function counts it (trimmed, 10 to 4,000 characters). */
export function checkMission(text) {
  const t = String(text ?? '').trim();
  if (t.length < LIMITS.missionMin) return { ok: false, text: t, error: `Say what to look for, in at least ${LIMITS.missionMin} characters.`, length: t.length };
  if (t.length > LIMITS.mission) return { ok: false, text: t, error: `The mission is ${t.length - LIMITS.mission} characters over the ${LIMITS.mission.toLocaleString('en-NZ')} limit. Shorten it.`, length: t.length };
  return { ok: true, text: t, error: '', length: t.length };
}
/** the body of a run: exactly the three keys the function accepts */
export function runRequest({ mission, sellerProfileId, runId }) {
  const m = checkMission(mission);
  if (!m.ok) throw new Error(m.error);
  if (!isUuid(sellerProfileId)) throw new Error('Save and check the company profile first.');
  if (!isUuid(runId)) throw new Error('This run has no valid number. Reload the page and try again.');
  return { mission: m.text, sellerProfileId, runId };
}

// ---- what the function says back --------------------------------------------------------------------------------------------------------
/** { action: "status" } answers { ready, missing }. Anything else is not trusted. */
export function readStatus(body) {
  if (!body || typeof body !== 'object' || typeof body.ready !== 'boolean') return { ready: false, missing: [], unknown: true };
  const missing = (Array.isArray(body.missing) ? body.missing : []).map((x) => clean(x).slice(0, 80)).filter(Boolean).slice(0, 8);
  return { ready: body.ready === true && missing.length === 0, missing, unknown: false };
}
/** one plain sentence for something that went wrong, from what we know of it */
export function explainRadarError({ status = 0, message = '', aborted = false, timedOut = false, network = false } = {}) {
  const said = clean(message).slice(0, 300);
  if (timedOut) return 'Radar did not answer within two and a half minutes. It may still finish and be saved: look under past runs in a minute before running again, because a second run is charged again.';
  if (aborted) return 'You stopped waiting for Radar. It may still finish and be saved under past runs.';
  if (network) return 'Radar could not be reached. Check the connection. Nothing was charged for a call that never arrived, but look under past runs before trying again.';
  if (status === 401) return 'Your sign-in was not accepted. Sign in again and try once more.';
  if (status === 404) return 'Radar is not switched on in this workspace.';
  if (status === 400 || status === 409) return said || 'Radar did not accept this request. Check the profile and the mission.';
  if (status === 429) return said || 'Radar has reached its usage limit with the model provider. Try again later.';
  if (status >= 500) return `Radar could not finish${said ? `: ${said.replace(/\.$/, '')}` : ''}. It may have used some of its research calls, so check the provider’s usage page.`;
  return said || 'Radar did not give a usable answer. Nothing was added.';
}

// ---- results: a run, its opportunities and the cards ----------------------------------------------------------------------------------
export const SIGNAL_TYPES = { policy: 'Policy', consultation: 'Consultation', funding: 'Funding', procurement: 'Procurement', leadership: 'Leadership', technology: 'Technology', 'customer-experience': 'Customer experience', partnership: 'Partnership', 'ai-visibility': 'Search visibility', other: 'Other' };
export const STAGES = { signal: 'Signal', qualified: 'Qualified', pursuit: 'Pursuit', hold: 'On hold' };
const text = (v, max) => clean(v).slice(0, max);
const score = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0);
const dayOf = (v) => { const t = Date.parse(v); return Number.isNaN(t) ? '' : new Date(t).toISOString().slice(0, 10); };
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

/** one piece of evidence: a link we can open, whether the function marks it checked, and its caveat. A link that is not https is dropped. */
export function cleanEvidence(e) {
  const url = https(e?.sourceUrl ?? e?.url); // the function's names, or the page's own (so a cleaned piece of evidence cleans to itself)
  if (!url) return null;
  return { claim: text(e.claim, 900), url, title: text(e.sourceTitle ?? e.title, 180) || hostOf(url), publishedAt: text(e.publishedAt, 100), eventAt: text(e.eventAt, 100), verified: e.verified === true, caveat: text(e.caveat, 900) };
}
/** one opportunity as the page keeps it, bounded. null when it is not usable (no headline, or no link to look at). */
export function cleanOpportunity(o) {
  if (!o || typeof o !== 'object' || !clean(o.id) || !clean(o.headline)) return null;
  const evidence = (Array.isArray(o.evidence) ? o.evidence : []).map(cleanEvidence).filter(Boolean).slice(0, 16);
  if (!evidence.length) return null;
  const sc = o.score && typeof o.score === 'object' ? o.score : {};
  return {
    id: text(o.id, LIMITS.id), accountName: text(o.accountName, 120), signalType: Object.hasOwn(SIGNAL_TYPES, o.signalType) ? o.signalType : 'other',
    headline: text(o.headline, 140), whatChanged: text(o.whatChanged, 2000), whyItMayMatter: text(o.whyItMayMatter, 2000), outcome: text(o.assemblOutcome ?? o.outcome, 2000), demoIdea: text(o.demoIdea, 3000),
    buyerRoles: (Array.isArray(o.buyerRoles) ? o.buyerRoles : []).map((x) => text(x, 160)).filter(Boolean).slice(0, 12),
    evidence, unknowns: (Array.isArray(o.unknowns) ? o.unknowns : []).map((x) => text(x, 900)).filter(Boolean).slice(0, 12),
    score: { serviceFit: score(sc.serviceFit), evidenceStrength: score(sc.evidenceStrength), timing: score(sc.timing), buyerAccess: score(sc.buyerAccess), total: score(sc.total) },
    stage: Object.hasOwn(STAGES, o.stage) ? o.stage : 'signal', nextAction: text(o.nextAction, 900), reviewAt: text(o.reviewAt, 100),
  };
}
/** a run as the function returns it and as pursuit_radar_runs keeps it. Throws a plain sentence when it is not a run. */
export function cleanRun(body) {
  if (!body || typeof body !== 'object' || !isUuid(body.runId) || !Array.isArray(body.opportunities)) throw new Error('Radar did not return a complete report. Nothing was added.');
  const all = body.opportunities.slice(0, 12), opportunities = all.map(cleanOpportunity).filter(Boolean);
  return { runId: body.runId, generatedAt: Number.isNaN(Date.parse(body.generatedAt)) ? '' : new Date(body.generatedAt).toISOString(), mission: text(body.mission, LIMITS.mission), seller: { id: text(body.seller?.id, LIMITS.id), name: text(body.seller?.name, LIMITS.name) }, opportunities, skipped: all.length - opportunities.length };
}
/** a short line for a past run */
export const runSummary = (r) => ({ runId: r.runId, generatedAt: r.generatedAt, mission: r.mission, count: r.opportunities.length, skipped: r.skipped ?? 0, seller: r.seller.name });

/**
 * One opportunity as a card for "Leads and early signals". It is an early signal (kind 'signal') from "Radar", marked as a draft.
 * The sorting score is score.total, never a chance of winning. The link on the card is the first checked source, else the first source.
 */
export function cardFromOpportunity(opp, run) {
  const o = cleanOpportunity(opp);
  if (!o) return null;
  const first = o.evidence.find((e) => e.verified) ?? o.evidence[0];
  const rid = String(run?.runId ?? '').replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase() || 'run';
  const slug = o.id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'item';
  const hold = o.stage === 'hold';
  return {
    id: `signal:radar-${rid}-${slug}`, kind: 'signal', title: o.headline, url: first.url, source: 'signal', sourceName: 'Radar', published: dayOf(run?.generatedAt), region: '', horizon: '', buyer: o.accountName, closesDay: '',
    reason: o.whyItMayMatter.slice(0, 300), reasons: o.whyItMayMatter ? [o.whyItMayMatter.slice(0, 300)] : [], fit: o.score.total, cultural: { on: false, why: [] },
    evidence: o.evidence.slice(0, 5).map((e) => ({ label: e.title.slice(0, 80), url: e.url })),
    radar: { v: 1, runId: run?.runId ?? '', generatedAt: run?.generatedAt ?? '', opportunity: o, hold, holdReason: hold ? (o.unknowns[0] || o.nextAction || 'Radar put this on hold.').slice(0, 300) : '' },
  };
}
export const cardsFromRun = (run) => (run?.opportunities ?? []).map((o) => cardFromOpportunity(o, run)).filter(Boolean);

/**
 * What an enquiry keeps of the opportunity (enquiry.radar, which the shared records hold in the row's `extra.radar`), so the Pursuit studio can use it later.
 * Bounded: the mission is cut, evidence is cut to 8 links, and the whole thing stays under MAX_KEPT bytes. Never the profile's evidence words.
 */
export const MAX_KEPT = 24000;
export function radarForEnquiry(card) {
  const r = card?.radar;
  if (!r?.opportunity) return null;
  const keep = { v: 1, kind: 'assembl.radar-opportunity', runId: String(r.runId ?? ''), generatedAt: String(r.generatedAt ?? ''), draft: true, opportunity: { ...r.opportunity, evidence: r.opportunity.evidence.slice(0, 8) } };
  const size = () => new TextEncoder().encode(JSON.stringify(keep)).length;
  while (size() > MAX_KEPT && keep.opportunity.evidence.length > 1) keep.opportunity.evidence.pop();
  if (size() > MAX_KEPT) { keep.opportunity.demoIdea = keep.opportunity.demoIdea.slice(0, 600); keep.opportunity.whatChanged = keep.opportunity.whatChanged.slice(0, 600); keep.opportunity.whyItMayMatter = keep.opportunity.whyItMayMatter.slice(0, 600); keep.opportunity.outcome = keep.opportunity.outcome.slice(0, 600); }
  return keep;
}
