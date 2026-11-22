// The full check of a plan set: one press runs every step in the same order and says, for each, what it did, how sure it
// is, and what a person must check. Agents prepare, people approve: nothing here claims compliance or gives a sign-off.
//
// The order: (1) the drawings read, (2) room names, (3) real ground, (4) site facts, (5) the cited Building Code
// pre-check, (6) what a person must check before relying on any of it, gathered from every step.
//
// This file is the run's logic and words only: no browser, no three.js, no imports, so the tests run it as it is
// (node --test tests/plan-run/*.test.mjs). The card in planRunUI.ts does the reading and fetching and hands the results
// to the functions here. A step that throws is recorded as failed with its reason, and the steps after it still run.
//
// The site point is never written into the report: no step summary holds it, and site facts that would point to the
// site (the parcel's identifier and outline, overlay names, the weather cell) are left out of the report by name.

export type StepId = 'drawings' | 'names' | 'ground' | 'facts' | 'code' | 'check';
export type Status = 'done' | 'needs a person' | 'not run' | 'failed';
export const STATUSES: Status[] = ['done', 'needs a person', 'not run', 'failed'];
export const STEPS: { id: StepId; title: string }[] = [
  { id: 'drawings', title: 'Drawings read' },
  { id: 'names', title: 'Room names' },
  { id: 'ground', title: 'Real ground' },
  { id: 'facts', title: 'Site facts' },
  { id: 'code', title: 'Building Code pre-check' },
  { id: 'check', title: 'What a person must check' },
];
export const STANDING = 'A pre-check prepared by software for a person to review. It is not a compliance decision or a professional sign-off.';
export const AGENTS = 'Models in this tool: the plan reader on the lab’s server, only when you say yes to a read, and Google Gemini for Make it a photo, only when you press it. Everything else here is fixed code, in your browser and in the lab’s site-facts feed. No agent drafts replies, lodges anything or approves anything.';
export const PRIVACY = 'The site point is not in this report, the model or a share link.';
export const REPORT_TYPE = 'assembl.plan-run.v1';

/** ■ for a step that is done; □ for every other state */
export const square = (s: Status | 'running' | 'waiting') => (s === 'done' ? '■' : '□');

export interface StepResult {
  id: StepId; title: string; status: Status;
  /** why it was not run, or why it failed */
  reason?: string;
  /** one line a person can read on its own */
  summary: string;
  /** the detail, one fact a line */
  lines: string[];
  /** what a person must check before relying on this step */
  check: string[];
  /** milliseconds the step took */
  ms: number;
}
/** what a step's work returns; the runner adds the id, title and time */
export type StepOut = Omit<StepResult, 'id' | 'title' | 'ms'>;
export interface StepDef { id: StepId; run: (done: StepResult[]) => Promise<StepOut> | StepOut }

const titleOf = (id: StepId) => STEPS.find((s) => s.id === id)?.title ?? id;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const clip = (s: unknown, n = 220) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const msg = (e: unknown) => clip((e as Error)?.message ?? String(e), 300) || 'no reason given';

/** Run the steps in order. Each is timed; one that throws or answers badly is failed with its reason and the rest still
 *  run. `onUpdate` is called before each step starts and after it ends, with every result so far. */
export async function runSteps(defs: StepDef[], onUpdate: (results: StepResult[], running: StepId | null) => void = () => {}, now: () => number = () => Date.now()): Promise<StepResult[]> {
  const out: StepResult[] = [];
  for (const d of defs) {
    onUpdate([...out], d.id);
    const t0 = now();
    let r: StepResult;
    try {
      const o = await d.run([...out]);
      if (!o || !STATUSES.includes(o.status)) throw new Error(`the step answered with no status it is allowed (${String(o?.status)})`);
      if (o.status === 'failed' && !o.reason) throw new Error('the step failed without saying why');
      r = { id: d.id, title: titleOf(d.id), status: o.status, ...(o.reason ? { reason: o.reason } : {}), summary: o.summary, lines: [...(o.lines ?? [])], check: [...(o.check ?? [])], ms: Math.max(0, Math.round(now() - t0)) };
    } catch (e) {
      const why = msg(e);
      r = { id: d.id, title: titleOf(d.id), status: 'failed', reason: why, summary: `Failed: ${why}`, lines: [], check: [`${titleOf(d.id)} failed (${why}). Run it again, or do it by hand on its own card.`], ms: Math.max(0, Math.round(now() - t0)) };
    }
    out.push(r);
    onUpdate([...out], null);
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ the plan, loosely
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Plan = any;
const arr = <T = Plan>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const levelsOf = (plan: Plan) => arr(plan?.buildings).flatMap((b: Plan) => arr(b?.levels).map((l: Plan) => ({ b, l })));
const assumedSrc = (s: unknown) => /assum|indicative/i.test(String(s ?? ''));
const unnamed = (s: unknown) => !s || /^[\s?？]*$/.test(String(s));

/** walls, openings and rooms the model holds */
export function planCounts(plan: Plan) {
  let outside = 0, inside = 0, openings = 0, rooms = 0, decks = 0;
  for (const { l } of levelsOf(plan)) {
    const ws = arr(l.walls), ps = arr(l.partitions);
    outside += ws.length; inside += ps.length; rooms += arr(l.rooms).length; decks += arr(l.decks).length;
    openings += [...ws, ...ps].reduce((t: number, w: Plan) => t + arr(w?.openings).length, 0);
  }
  return { buildings: arr(plan?.buildings).length, outside, inside, openings, rooms, decks, features: arr(plan?.site?.features).length };
}
const countsLine = (c: ReturnType<typeof planCounts>) => `${plural(c.outside, 'outside wall')}, ${plural(c.inside, 'inside wall')}, ${plural(c.openings, 'opening')}, ${plural(c.rooms, 'room')}${c.decks ? `, ${plural(c.decks, 'deck')}` : ''}${c.buildings > 1 ? ` in ${c.buildings} buildings` : ''}.`;

/** parts the model itself labels as assumed, by name */
export function assumedParts(plan: Plan): string[] {
  const names = new Set<string>();
  for (const b of arr(plan?.buildings)) {
    if (assumedSrc(b?.floorLevelSource)) names.add('floor level');
    if (assumedSrc(b?.roof?.source)) names.add('roof');
    for (const l of arr(b?.levels)) {
      if (assumedSrc(l?.plateSource)) names.add('ceiling height');
      for (const w of [...arr(l?.walls), ...arr(l?.partitions)]) for (const o of arr(w?.openings)) if (assumedSrc(o?.source)) names.add(String(o?.name ?? 'an opening').toLowerCase());
      for (const d of arr(l?.decks)) if (assumedSrc(d?.source)) names.add(String(d?.name ?? 'a deck').toLowerCase());
    }
  }
  for (const f of arr(plan?.site?.features)) if (assumedSrc(f?.source)) names.add(String(f?.name ?? f?.kind ?? 'a site feature').toLowerCase());
  return [...names];
}

// ------------------------------------------------------------------------------------------------ 1. drawings read
/** what the trace card saw when it read the drawings; kept in the browser tab, never in the model */
export interface ReadRecord {
  v: 1; fingerprint: string; at: string;
  file: { kind: 'pdf' | 'image'; pages: number };
  seconds: number | null;
  plan: { page: number | null; title: string; reader: 'linework' | 'ai'; model?: string; rev?: string; scale: string; plans: number };
  sheets: { page: number; title: string; role: 'site' | 'elevation'; model?: string; ok: boolean; note?: string }[];
  skipped: number;
  heights: { plate: { value: number; from: 'elevations' | 'assumed' | 'set by a person' }; floor: { value: number; from: 'elevations' | 'assumed' | 'set by a person' }; roof: { type: string; pitch: number; from: 'elevations' | 'assumed' | 'set by a person' } };
  site: { read: boolean; kinds: string[] };
  notes: string[];
}
const readerWords = (r: { reader?: string; model?: string; rev?: string }) => (r.reader === 'linework' ? 'measured from its linework, in this browser' : `read by the AI plan reader on the lab’s server${r.model ? ` (model ${r.model}${r.rev ? `, prompts ${r.rev}` : ''})` : ''}`);
/** a scale note that a dimension string or a person confirmed */
export const scaleConfirmed = (note: string) => /agreeing with|dimension strings|length you gave/i.test(note) && !/no dimension strings to check|no scale on the sheet/i.test(note);

export function drawingsStep(plan: Plan, rec: ReadRecord | null): StepOut {
  const c = planCounts(plan), check: string[] = [], lines: string[] = [];
  const assumed = assumedParts(plan);
  if (!rec) {
    const said = clip(plan?.job?.drawings ?? '', 200), how = clip(plan?.job?.taken ?? plan?.job?.what ?? '', 240);
    lines.push('No drawings were read in this tab: the model was opened as a plan model file.');
    if (said) lines.push(`Drawings the model names: ${said}`);
    if (how) lines.push(`How the model says it was made: ${how}`);
    lines.push(`It holds ${countsLine(c)}`);
    if (assumed.length) lines.push(`Labelled assumed in the model: ${assumed.slice(0, 8).join(', ')}${assumed.length > 8 ? `, and ${assumed.length - 8} more` : ''}.`);
    check.push('Check the model against the drawings it names: it was not read from them here.');
    if (assumed.length) check.push(`Assumed in the model: ${assumed.slice(0, 5).join(', ')}${assumed.length > 5 ? ' and others' : ''}. Check each against the drawings.`);
    return { status: 'not run', reason: 'the model was opened as a plan model file, so no drawings were read in this tab', summary: `Not run here: opened as a plan model. It holds ${plural(c.rooms, 'room')} and ${plural(c.openings, 'opening')}.`, lines, check };
  }
  const p = rec.plan;
  lines.push(`Floor plan: ${p.page ? `sheet ${p.page}` : 'the picture'}${p.title ? ` (“${clip(p.title, 40)}”)` : ''}, ${readerWords(p)}${p.plans > 1 ? `; ${p.plans} plans on the sheet` : ''}.`);
  lines.push(`Scale: ${clip(p.scale, 200)}`);
  for (const s of rec.sheets) lines.push(`${s.role === 'site' ? 'Site plan' : 'Elevations'}: sheet ${s.page}${s.title ? ` (“${clip(s.title, 40)}”)` : ''}, ${s.ok ? readerWords({ reader: 'ai', model: s.model }) : `not read (${clip(s.note ?? 'no reason given', 120)})`}.`);
  if (rec.skipped) lines.push(`${plural(rec.skipped, 'other sheet')} not read.`);
  lines.push(`Read: ${countsLine(c)}${rec.seconds != null ? ` In ${rec.seconds} s.` : ''}`);
  const H = rec.heights, hw = (from: string) => (from === 'elevations' ? 'from the elevations' : from);
  lines.push(`Heights: ceiling ${H.plate.value.toFixed(2)} m ${hw(H.plate.from)}; floor ${H.floor.value.toFixed(2)} m above the ground ${hw(H.floor.from)}; roof ${H.roof.type}${H.roof.type === 'flat' ? '' : ` ${H.roof.pitch}°`} ${hw(H.roof.from)}.`);
  for (const n of rec.notes) lines.push(clip(n, 200));
  // what a person must check
  if (!scaleConfirmed(p.scale)) check.push('The scale is not confirmed by a written dimension: check one long wall against the drawing before relying on any size.');
  if (p.reader === 'ai') check.push('Positions read by AI are ± about 150 mm: check key sizes against the written dimensions.');
  const hs = [H.plate.from === 'assumed' ? `ceiling ${H.plate.value.toFixed(2)} m` : '', H.floor.from === 'assumed' ? `floor ${H.floor.value.toFixed(2)} m above the ground` : '', H.roof.from === 'assumed' ? `roof ${H.roof.type}` : ''].filter(Boolean);
  if (hs.length) check.push(`Assumed, not read: ${hs.join(', ')}. Check against the sections and elevations.`);
  check.push('Opening heights and sills are assumed: check them against the elevations.');
  const siteRead = rec.sheets.some((s) => s.role === 'site' && s.ok);
  if (!siteRead) check.push('No site plan was read: decks, stairs, paths and parking are only in the model where the floor plan shows them.');
  else if (!rec.site.kinds.includes('parking')) check.push('No car bay was found on the site plan. The reader often misses parking: check the site plan.');
  for (const s of rec.sheets) if (!s.ok) check.push(`Sheet ${s.page} (${s.role === 'site' ? 'site plan' : 'elevations'}) was not read: ${clip(s.note ?? 'no reason given', 100)}.`);
  const sure = scaleConfirmed(p.scale);
  return {
    status: sure ? 'done' : 'needs a person',
    ...(sure ? {} : { reason: 'the scale is not confirmed by a written dimension or a person' }),
    summary: `${p.reader === 'linework' ? 'Linework' : 'AI reader'}: ${plural(c.outside + c.inside, 'wall')}, ${plural(c.openings, 'opening')}, ${plural(c.rooms, 'room')}. Scale ${sure ? 'confirmed' : 'not confirmed'}.`,
    lines, check,
  };
}

// ------------------------------------------------------------------------------------------------ 2. room names
export function namesStep(plan: Plan): StepOut {
  const rooms = levelsOf(plan).flatMap(({ l }) => arr(l.rooms));
  if (!rooms.length) return { status: 'needs a person', reason: 'the model has no rooms', summary: 'No rooms in the model.', lines: ['The model holds no rooms, so nothing was furnished or checked by room.'], check: ['The model has no rooms: check the drawing was read as a floor plan.'] };
  const by = { printed: 0, drawn: 0, person: 0, none: 0, blank: 0 };
  const suggested: string[] = [], blanks: string[] = [];
  for (const r of rooms) {
    if (unnamed(r?.name)) { by.blank++; blanks.push(`${Number(r?.w ?? 0).toFixed(1)} × ${Number(r?.d ?? 0).toFixed(1)} m`); continue; }
    const s = r?.nameSrc as string | undefined;
    if (s === 'printed' || s === 'drawn' || s === 'person') by[s]++; else by.none++;
    if (s === 'drawn') suggested.push(`“${clip(r.name, 30)}” for a room the drawing prints as “${clip(r.printed ?? '?', 20) || '?'}”`);
  }
  const lines: string[] = [], check: string[] = [];
  const parts = [by.printed && `${by.printed} printed on the drawing`, by.drawn && `${by.drawn} suggested from what is drawn`, by.person && `${by.person} named by a person`, by.none && `${by.none} named in the model file (where each came from is not recorded)`, by.blank && `${by.blank} with no name`].filter(Boolean);
  lines.push(`${plural(rooms.length, 'room')}: ${parts.join(', ')}.`);
  for (const s of suggested) lines.push(`Suggested: ${s}.`);
  for (const b of blanks) lines.push(`No name: a room ${b}.`);
  if (suggested.length) check.push(`Check the ${plural(suggested.length, 'suggested room name')} against the drawing: ${suggested.length <= 4 ? rooms.filter((r) => r?.nameSrc === 'drawn').map((r) => r.name).join(', ') : 'see the room names step'}.`);
  if (by.blank) check.push(`Name the ${plural(by.blank, 'room')} with no name: furniture and the light and air checks go by a room’s name.`);
  const needs = suggested.length > 0 || by.blank > 0;
  return { status: needs ? 'needs a person' : 'done', ...(needs ? { reason: `${plural(suggested.length + by.blank, 'room name')} to confirm` } : {}), summary: needs ? `${plural(suggested.length + by.blank, 'name')} to confirm of ${rooms.length}.` : `All ${plural(rooms.length, 'room')} named${by.none === rooms.length ? ' in the model file' : ''}.`, lines, check };
}

// ------------------------------------------------------------------------------------------------ 3. real ground
export type GroundInput =
  | { kind: 'own'; source: string; floorSource?: string; pointGiven: boolean }
  | { kind: 'loaded' | 'read'; survey: string | null; flown: { from: string | null; to: string | null } | null; readOn: string; seconds?: number; floorRule: string; under: { min: number; max: number };
      placement: { turnTag: string; moveTag: string; floorTag: string }; tops: boolean; boundary: 'drawn' | 'outside' | 'none'; emptyCells: number }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'none' }
  | { kind: 'bad-point' };

export function groundStep(g: GroundInput): StepOut {
  if (g.kind === 'none') return { status: 'needs a person', reason: 'no site point given', summary: 'Give the site point to put the house on real ground.', lines: ['No site point was given, so the house stands on its assumed ground (flat, or the model’s own fall).', 'Type the site’s latitude and longitude above and run again. The point stays in this browser.'], check: ['The ground is assumed: give the site point to put the house on LINZ’s ground, or use a site survey.'] };
  if (g.kind === 'bad-point') return { status: 'needs a person', reason: 'the point is not in New Zealand', summary: 'That is not a point in New Zealand. Use decimal degrees, latitude first.', lines: ['Example: -36.80, 175.08'], check: ['Give the site point in decimal degrees, latitude first.'] };
  if (g.kind === 'unavailable') return { status: 'needs a person', reason: 'LINZ has no 1 m ground at this point', summary: 'No LINZ 1 m ground here: the house stays on its assumed ground.', lines: [clip(g.reason, 240)], check: ['LINZ has no 1 m LiDAR ground here: the ground is assumed. A site survey is needed.'] };
  if (g.kind === 'own') {
    const lines = [`The model carries its own surveyed ground: ${clip(g.source, 260)}`];
    if (g.floorSource) lines.push(`Floor level: ${clip(g.floorSource, 160)}`);
    const check = ['The model’s own ground was not read here: check where it came from (above).'];
    if (g.pointGiven) check.push('Site facts are for the point you gave. The model’s ground does not record where it is, so check the point is this site.');
    return { status: 'done', summary: 'The model carries its own surveyed ground.', lines, check };
  }
  const lines: string[] = [], check: string[] = [];
  lines.push(`${g.kind === 'read' ? 'Read in this run' : 'Already on the model'}: LINZ 1 m LiDAR ground, ${g.survey ?? 'survey not identified'}${g.flown?.from ? `, flown ${g.flown.from} to ${g.flown.to}` : ''}. Read by this browser straight from LINZ on ${g.readOn}${g.seconds != null ? ` in ${g.seconds} s` : ''}.`);
  lines.push(`Ground under the house: ${g.under.min.toFixed(2)} to ${g.under.max.toFixed(2)} m (NZVD2016).`);
  lines.push(clip(g.floorRule, 260));
  lines.push(`Tree and building tops: ${g.tops ? 'loaded' : 'not loaded'}. Legal boundary: ${g.boundary === 'drawn' ? 'drawn from LINZ’s parcel map (a map of boundaries, not a survey)' : g.boundary === 'outside' ? 'outside the square of ground shown' : 'not drawn'}.`);
  if (g.emptyCells) lines.push(`${plural(g.emptyCells, 'cell')} of the square had no survey height and are drawn at the lowest surveyed level (assumed).`);
  if (g.placement.floorTag === 'assumed') check.push('The floor level follows a rule (0.45 m above the highest ground under the house): set it from the drawings on the Real ground card.');
  if (g.placement.moveTag === 'assumed') check.push('The point is taken as the middle of the house: move the house on the Real ground card if it sits elsewhere.');
  if (g.placement.turnTag === 'assumed') check.push('North is taken as up the sheet (the drawing gave no north point): set it on the Real ground card.');
  check.push('LiDAR is a survey from the air, about 0.2 m in height: it is not a site survey.');
  return { status: 'done', summary: `On LINZ ground${g.survey ? `: ${clip(g.survey, 60)}` : ''}. Floor level ${g.placement.floorTag === 'assumed' ? 'by rule' : 'set by hand'}.`, lines, check };
}

// ------------------------------------------------------------------------------------------------ 4. site facts
export interface Fact { id?: string; label?: string; status?: string; value?: unknown; unit?: string; asOf?: string | null; note?: string; reason?: string; needs?: string; source?: { name?: string }; values?: Record<string, unknown> }
/** facts whose value would point to the site: named here so they are never copied into a report */
export const POINTING = ['parcel', 'weather', 'elevation'];
export interface FactLine { id: string; label: string; state: 'live' | 'no answer' | 'not connected'; value: string; asOf: string; source: string; needs: string; reason: string }
/** the facts as a report may hold them: what each says, with anything that would point to the site left out */
export function factLines(facts: Record<string, Fact>): FactLine[] {
  return Object.entries(facts ?? {}).map(([k, f]) => {
    // the lab's feed names each fact "site.<key>"; the key alone is what this file goes by
    const id = String(f?.id ?? k).replace(/^site\./, ''), state: FactLine['state'] = f?.status === 'live' ? 'live' : f?.status === 'not-wired' ? 'not connected' : 'no answer';
    let value = '';
    if (state === 'live') {
      if (POINTING.includes(id) || POINTING.includes(k)) value = 'answered; not copied here, as it would point to the site';
      else if (id === 'overlays' || k === 'overlays') {
        const hits = arr<{ overlay?: string }>(f?.values?.hits), kinds = [...new Set(hits.map((h) => String(h?.overlay ?? '')).filter(Boolean))];
        value = hits.length ? `${plural(hits.length, 'overlay')} at or near the point: ${kinds.join('; ')} (names left out: they would point to the site)` : 'none of the overlays checked';
      } else value = clip(`${f?.value ?? ''}${f?.unit && typeof f.value === 'number' ? ` ${f.unit}` : ''}`, 120);
    }
    return { id, label: clip(f?.label ?? id, 90), state, value, asOf: f?.asOf ? String(f.asOf).slice(0, 10) : '', source: clip(f?.source?.name ?? '', 100), needs: clip(f?.needs ?? '', 200), reason: clip(f?.reason ?? '', 200) };
  });
}
export type FactsInput = { kind: 'none' } | { kind: 'fetched'; facts: Record<string, Fact>; fetchedAt?: string };
export function factsStep(input: FactsInput): StepOut {
  if (input.kind === 'none') return { status: 'not run', reason: 'no site point given', summary: 'Not run: needs the site point.', lines: ['Site facts are looked up for the site point. None was given.'], check: [] };
  const L = factLines(input.facts), live = L.filter((f) => f.state === 'live'), off = L.filter((f) => f.state === 'not connected'), down = L.filter((f) => f.state === 'no answer');
  if (!L.length) throw new Error('the lab’s feed answered with no facts');
  const lines = [
    ...live.map((f) => `■ ${f.label}: ${f.value}${f.asOf ? ` (${f.asOf})` : ''}${f.source ? `. ${f.source}` : ''}`),
    ...down.map((f) => `□ ${f.label}: no answer just now${f.reason ? `. ${f.reason}` : ''}`),
    ...off.map((f) => `□ ${f.label}: not connected${f.reason ? `. ${f.reason}` : ''}${f.needs ? ` Needs: ${f.needs}` : ''}`),
  ];
  const check = ['Site facts show what each published map says at the point. A point outside a mapped hazard is not proof the site cannot be affected.'];
  // the ground height is the Real ground step's business; every other fact that is not connected is for a person to look up
  const byHand = off.filter((f) => f.id !== 'elevation');
  if (byHand.length) check.push(`Not connected, so look them up by hand: ${byHand.map((f) => f.label).join('; ')}.`);
  if (down.length) check.push(`No answer just now: ${down.map((f) => f.label).join('; ')}. Run again later.`);
  return { status: 'done', summary: `${live.length} live, ${off.length} not connected${down.length ? `, ${down.length} no answer` : ''}.`, lines, check };
}

// ------------------------------------------------------------------------------------------------ 5. code pre-check
/** the fields of a code check this file reads (codeChecks.ts makes them) */
export interface CodeCheck { rule: string; title: string; subject: string; status: string; says: string; needs?: string; cite: { short: string; clause: string; url: string; page?: number } }
const FAILS = 'does not meet the cited figure', MEETS = 'meets the cited figure', CANNOT = 'cannot tell from this model', NA = 'not applicable';
export const citeText = (c: CodeCheck['cite']) => `${c.short.includes(c.clause) ? c.short : `${c.short} ${c.clause}`}, ${c.url}${c.page ? `#page=${c.page}` : ''}`;
export function codeStep(checks: CodeCheck[], groundWords: string): StepOut {
  const n = (s: string) => checks.filter((c) => c.status === s).length;
  const fails = checks.filter((c) => c.status === FAILS), cannot = checks.filter((c) => c.status === CANNOT);
  const lines = [`${n(MEETS)} meet the cited figure · ${n(FAILS)} do not meet it · ${n(CANNOT)} cannot tell · ${n(NA)} not applicable.`, `Falls are measured to ${groundWords}.`];
  for (const c of fails) lines.push(`□ Does not meet: ${c.subject}, ${c.title.toLowerCase()}. ${clip(c.says, 260)} Cited: ${citeText(c.cite)}`);
  const byRule = new Map<string, number>();
  for (const c of cannot) byRule.set(c.title, (byRule.get(c.title) ?? 0) + 1);
  const top = [...byRule.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (cannot.length) lines.push(`Cannot tell: ${plural(cannot.length, 'line')}, mostly ${top.map(([k, v]) => `${k.toLowerCase()} (${v})`).join('; ')}. Each line says what measurement it needs.`);
  const check: string[] = [];
  if (fails.length) check.push(`Look at each “does not meet” line against the drawings: ${fails.map((c) => `${c.subject} (${c.cite.short.includes(c.cite.clause) ? c.cite.short : `${c.cite.short} ${c.cite.clause}`})`).join('; ')}.`);
  if (cannot.length) check.push(`${plural(cannot.length, 'line')} cannot be told from this model: each says what measurement it needs.`);
  check.push('The pre-check compares ten cited figures only. Many requirements are not checked at all.');
  return { status: fails.length ? 'needs a person' : 'done', ...(fails.length ? { reason: `${plural(fails.length, 'line')} do not meet the cited figure` } : {}), summary: `${n(MEETS)} meet · ${n(FAILS)} do not meet · ${n(CANNOT)} cannot tell · ${n(NA)} not applicable.`, lines, check };
}

// ------------------------------------------------------------------------------------------------ 6. what a person must check
export function checkStep(done: StepResult[]): StepOut {
  const seen = new Set<string>(), list: string[] = [];
  for (const r of done) for (const c of r.check) { const k = c.trim(); if (k && !seen.has(k)) { seen.add(k); list.push(k); } }
  list.push('A person reviews all of this before anyone relies on it. Agents prepare, people approve.');
  return { status: 'needs a person', reason: 'a person reviews the run before relying on it', summary: `${plural(list.length, 'thing')} to check before relying on it.`, lines: list, check: [] };
}

// ------------------------------------------------------------------------------------------------ the report
export interface RunReport {
  type: typeof REPORT_TYPE; standing: string;
  model: { title: string; fingerprint: string; revision: string; drawings: string; tool: string };
  ranAt: string; seconds: number;
  steps: { id: StepId; title: string; status: Status; square: string; reason?: string; summary: string; lines: string[]; seconds: number }[];
  personMustCheck: string[];
  agents: string; privacy: string;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildReport(o: { plan: any; fingerprint: string; tool: string; ranAt: Date; results: StepResult[] }): RunReport {
  const last = o.results.find((r) => r.id === 'check');
  return {
    type: REPORT_TYPE, standing: STANDING,
    model: { title: clip(o.plan?.job?.title ?? 'Untitled plan', 120), fingerprint: o.fingerprint, revision: String(o.plan?.revision?.current ?? 'not stated'), drawings: clip(o.plan?.job?.drawings ?? 'not stated', 300), tool: o.tool },
    ranAt: o.ranAt.toISOString(), seconds: Math.round(o.results.reduce((t, r) => t + r.ms, 0) / 100) / 10,
    steps: o.results.map((r) => ({ id: r.id, title: r.title, status: r.status, square: square(r.status), ...(r.reason ? { reason: r.reason } : {}), summary: r.summary, lines: r.lines, seconds: Math.round(r.ms / 100) / 10 })),
    personMustCheck: last ? [...last.lines] : [],
    agents: AGENTS, privacy: PRIVACY,
  };
}
const ymd = (iso: string) => iso.slice(0, 10);
/** dated file name: plan-run-<version>-<yyyy-mm-dd>.<ext> */
export const reportFileName = (r: RunReport, ext: 'txt' | 'json') => `plan-run-${r.model.fingerprint}-${ymd(r.ranAt)}.${ext}`;
export function reportText(r: RunReport): string {
  const out: string[] = ['Plan set check: run report', r.standing, '', `Model: ${r.model.title} · revision ${r.model.revision} · version ${r.model.fingerprint}`, `Drawings: ${r.model.drawings}`, `Run: ${r.ranAt.replace('T', ' ').slice(0, 16)} UTC, ${r.seconds} s · tool ${r.model.tool}`, ''];
  for (const [i, s] of r.steps.entries()) {
    out.push(`${i + 1}. ${s.square} ${s.title}: ${s.status}${s.reason ? ` (${s.reason})` : ''} · ${s.seconds} s`, `   ${s.summary}`);
    for (const l of s.lines) out.push(`   - ${l}`);
    out.push('');
  }
  out.push('Before relying on it, a person checks:');
  for (const c of r.personMustCheck) out.push(`[ ] ${c}`);
  out.push('', r.agents, r.privacy, r.standing);
  return out.join('\n');
}
/** true when the report holds the point in any common spelling (to 3 or more decimals, or the whole numbers as typed) */
export function holdsPoint(report: unknown, p: { lat: number; lon: number } | null): boolean {
  if (!p) return false;
  const t = JSON.stringify(report);
  const forms = (v: number) => [v, Math.abs(v)].flatMap((x) => [String(x), x.toFixed(3), x.toFixed(4), x.toFixed(5), x.toFixed(6)]).filter((s) => s.replace(/[^0-9]/g, '').length >= 4);
  return [...forms(p.lat), ...forms(p.lon)].some((s) => t.includes(s));
}
