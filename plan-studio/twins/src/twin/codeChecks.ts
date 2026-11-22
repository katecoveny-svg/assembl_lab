// Code pre-checks: for each measurable rule, what the plan model shows against what the published document says.
//
// What this is: a pre-check against cited figures, for a person to review. It compares one measurement at a time with
// one figure in one official document, and says where the figure is written.
// What this is not: a compliance decision, a consent check, or a professional sign-off. It never says a design
// complies. Many requirements of each document are not checked at all; each rule says what it leaves out.
//
// The rules below were each read from the official published document on the date in `readOn`: the Ministry of
// Business, Innovation and Employment's Building Performance site (building.govt.nz) and legislation.govt.nz.
// Nothing here is written from memory. To add a rule: open the official document, record the fields in `Citation`,
// and add the three tests (meets, does not meet, lacks the measurement). A wrong rule is worse than a missing one.
//
// Pure module: no browser, no three.js, no imports. The page card is in codeChecksUI.ts.
//
// Measurements today's plan models do not hold. The checks read these optional fields when a model has them, and
// answer "cannot tell from this model: needs ..." when it does not. Each may carry its own "<field>Source" note.
//   an opening:        openableArea (m², net, the face of the part that opens), glazed (true or false)
//   outside steps:     risers (count), going (m) or treads (count), handrails (0, 1, 2 or "none", "one", "both"),
//                      barrier ("none" or a type), barrierHeight (m)
//   a stair landing:   barrier, barrierHeight (m)
//   a deck:            barrierHeight (m); "none" in its rail list means the model says there is no barrier
//
// Read on 22 November 2026 and left out on purpose (see docs/architecture/code-checks.md):
//   smoke alarms: F7/AS1 (fifth edition) no longer holds the figures; they sit in C/AS1 2.2.1.2 and NZS 4514.
//   doors: C/AS1 3.2.1.1(b) and 3.2.4.1(a) give a clear height and a clear width; the model holds wall openings.
//   G7/AS1 2.1.2.1(b), (c) and 3.1.2.1: glass transmittance, head height against room width, awareness of outside.
//   D1/AS1 6.0.6 handrail height and Table 1 height clearances: nothing in the model to measure them against.
// The services page (plan-studio/twins/services) pre-checks extract fans, hot water, drains and wiring separately.

export type Status = 'meets the cited figure' | 'does not meet the cited figure' | 'cannot tell from this model' | 'not applicable';
/** how a measurement came to be in the model, worst first when several are combined */
export type Derived = 'assumed' | 'proposed' | 'read by AI' | 'not labelled' | 'other' | 'scaled' | 'survey' | 'written';

export interface Citation {
  /** the short name people use, e.g. "G7/AS1" */
  short: string;
  document: string;
  edition: string;
  /** the date the edition or version took effect, as the document states it */
  effective: string;
  clause: string;
  publisher: string;
  /** the page address the rule was read from */
  url: string;
  /** the page of the PDF the clause is on (PDF page count, not the printed page number) */
  page?: number;
  /** the date the document was opened and read */
  readOn: string;
  /** the requirement in our own short words, with the numbers */
  requirement: string;
}
export interface Rule { id: string; title: string; figure: string; cite: Citation; leavesOut: string }
export interface Check {
  rule: string; title: string;
  /** what was measured, e.g. "Bedroom 1" */
  subject: string;
  /** where in the model it was measured */
  where: string;
  status: Status;
  measured: number | null; unit: string;
  /** the measured value in words, with what it is a measure of */
  measuredText: string;
  figure: string;
  /** how the measurement was derived; null when nothing was measured */
  derived: Derived | null;
  derivedNote: string;
  /** when the model cannot answer: what it would need */
  needs?: string;
  /** one sentence a person can read on its own */
  says: string;
  caveats: string[];
  cite: Citation;
}

const READ = '2026-11-22';
const MBIE = 'Ministry of Business, Innovation and Employment (building.govt.nz)';
const D1: Omit<Citation, 'clause' | 'requirement' | 'page'> = {
  short: 'D1/AS1', document: 'Acceptable Solution D1/AS1: Access routes', edition: 'Second edition, Amendment 6', effective: '1 January 2017', publisher: MBIE, readOn: READ,
  url: 'https://www.building.govt.nz/assets/Uploads/building-code-compliance/d-access/d1-access-routes/asvm/d1-access-routes-2nd-edition-amendment6.pdf',
};
const F4: Omit<Citation, 'clause' | 'requirement' | 'page'> = {
  short: 'F4/AS1', document: 'Acceptable Solution F4/AS1: Safety from falling', edition: 'Third edition, Amendment 2', effective: '1 January 2017', publisher: MBIE, readOn: READ,
  url: 'https://www.building.govt.nz/assets/Uploads/building-code-compliance/f-safety-of-users/f4-safety-from-falling/asvm/f4-safety-from-falling-3rd-edition-amendment2.pdf',
};
const MAIN_PRIVATE = 'Outside steps to a house are read as a main private stairway: D1/AS1 defines that to include all exterior private stairways.';

/** The rules table. Data only: the functions further down do the measuring. */
export const RULES: Rule[] = [
  {
    id: 'natural-light', title: 'Natural light: glazing against floor area', figure: 'glazing no less than 10% of the floor area',
    cite: {
      short: 'G7/AS1', document: 'Acceptable Solution G7/AS1: Natural light for simple buildings up to three storeys excluding those with borrowed daylight', edition: 'Second edition', effective: '29 November 2021',
      clause: '2.1.2.1(a)', publisher: MBIE, readOn: READ, page: 7,
      url: 'https://www.building.govt.nz/assets/Uploads/building-code-compliance/g-services-and-facilities/g7-natural-light/asvm/g7-natural-light-as1-2nd-edition.pdf',
      requirement: 'In each habitable space, vertical windows in external walls have an area of glazing of no less than 10% of the floor area.',
    },
    leavesOut: 'Not checked: light transmittance of the glass (no less than 70%), window head height against room width, surface reflectances, outside obstructions, and the awareness-of-outside rule (2.1.2.1(b) and (c), 2.1.2.2 to 2.1.2.4, 3.1.2.1). G7/AS1 does not cover rooms with ceilings over 3.0 m, borrowed light, or windows facing a porch or under a balcony (1.1.2.1).',
  },
  {
    id: 'ventilation', title: 'Natural ventilation: openable area against floor area', figure: 'net openable area no less than 5% of the floor area',
    cite: {
      short: 'G4/AS1', document: 'Acceptable Solution G4/AS1: Ventilation of buildings', edition: 'Fifth edition', effective: '28 July 2025',
      clause: '2.2.1.2', publisher: MBIE, readOn: READ, page: 8,
      url: 'https://www.building.govt.nz/assets/Uploads/building-code-compliance/g-services-and-facilities/g4-ventilation/asvm/g4-ventilation-as1-fifth-edition.pdf',
      requirement: 'Natural ventilation of an occupied space needs a net openable area of windows or other openings to the outside of no less than 5% of the floor area. Net openable area is measured on the face of the part that opens (Appendix B).',
    },
    leavesOut: 'Not checked: mechanical ventilation, which G4/AS1 2.1.1.2 allows instead of or with natural ventilation; the extract fans 2.2.1.5 requires for cooktops, showers and baths (the services page pre-checks those); whether openings can be fixed open (2.2.1.3). Homes with opening windows on only one outside wall follow 2.2.2 instead, which is not checked.',
  },
  {
    id: 'stair-pitch', title: 'Stairs: pitch', figure: 'pitch no more than 37°',
    cite: { ...D1, clause: 'Table 6 (paragraph 4.1.1)', page: 29, requirement: 'Common and main private stairways: maximum pitch 37°, maximum riser height 190 mm, minimum tread 280 mm.' },
    leavesOut: `${MAIN_PRIVATE} Not checked: uniform risers and treads (4.1.3), tread projection, open risers, slip resistance.`,
  },
  {
    id: 'stair-riser', title: 'Stairs: riser height', figure: 'riser no more than 190 mm',
    cite: { ...D1, clause: 'Table 6 (paragraph 4.1.1)', page: 29, requirement: 'Common and main private stairways: maximum pitch 37°, maximum riser height 190 mm, minimum tread 280 mm.' },
    leavesOut: `${MAIN_PRIVATE} Not checked: that every riser in a flight is the same within 5 mm (4.1.3).`,
  },
  {
    id: 'stair-tread', title: 'Stairs: tread depth', figure: 'tread no less than 280 mm',
    cite: { ...D1, clause: 'Table 6 (paragraph 4.1.1)', page: 29, requirement: 'Common and main private stairways: maximum pitch 37°, maximum riser height 190 mm, minimum tread 280 mm.' },
    leavesOut: `${MAIN_PRIVATE} Not checked: tread projection and nosings (4.1.6), winders.`,
  },
  {
    id: 'stair-flight-rise', title: 'Stairs: rise between landings', figure: 'no more than 4.0 m of rise between landings',
    cite: { ...D1, clause: 'Table 7 (paragraph 4.3.2)', page: 33, requirement: 'Private stairways: the rise between successive landings is no more than 4.0 m.' },
    leavesOut: 'Each flight in the model is read as one run between two landings. Not checked: that a landing sits at the top and bottom of every flight (4.3.1).',
  },
  {
    id: 'landing-length', title: 'Stairs: landing length', figure: 'landing no less than 900 mm long',
    cite: { ...D1, clause: '4.3.4', page: 33, requirement: 'Landing length is no less than 900 mm.' },
    leavesOut: 'Not checked: landing width against the route it serves (4.3.3), door swings over a landing (4.3.5).',
  },
  {
    id: 'stair-handrail', title: 'Stairs: a handrail', figure: 'a handrail on at least one side',
    cite: { ...D1, clause: '6.0.1', page: 41, requirement: 'Stairways 2.0 m wide or less with two or more risers have a handrail on at least one side. Handrails may be left off stairways of two or three risers within or giving access to a household unit.' },
    leavesOut: 'Not checked: handrail height (900 mm to 1 m above the pitch line, 6.0.6), slope, extent and profile (6.0.4, 6.0.7). Stairs wider than 2.0 m follow 6.0.2 and are not checked.',
  },
  {
    id: 'barrier-needed', title: 'Falls: a barrier where the fall is 1 m or more', figure: 'a barrier where people could fall 1 m or more',
    cite: {
      short: 'Building Code F4.3.1', document: 'Building Code clause F4 Safety from falling (Building Regulations 1992, Schedule 1)', edition: 'Version as at 15 January 2026', effective: '15 January 2026',
      clause: 'F4.3.1', publisher: 'Parliamentary Counsel Office (legislation.govt.nz)', readOn: READ,
      url: 'https://www.legislation.govt.nz/secondary-legislation/pco-drafted/1992/150/en/latest/',
      requirement: 'Where people could fall 1 metre or more from an opening in the external envelope or floor of a building, or from a sudden change of level within or associated with a building, a barrier shall be provided.',
    },
    leavesOut: 'The fall is measured to the existing ground in the model, not to finished ground after earthworks. Not checked: that the barrier runs the full length of the hazard, its strength, and its openings (F4.3.4).',
  },
  {
    id: 'barrier-height', title: 'Falls: barrier height', figure: 'barrier no less than 1000 mm on decks and balconies, 900 mm on stairs and their landings',
    cite: { ...F4, clause: 'Table 1 (paragraph 1.1.1)', page: 15, requirement: 'Detached dwellings: barriers on balconies and decks are no less than 1000 mm high; on stairs and ramps and their intermediate landings no less than 900 mm. Measured from the floor, or from the pitch line on stairs.' },
    leavesOut: 'Not checked: openings in the barrier (none a 100 mm sphere fits through, 1.2.1), climbability, fixed seats beside a barrier (1.2.4), opening windows (2.0).',
  },
];

/** The tool's own caution bands. These are not from the Building Code. A scaled, surveyed or assumed measurement that
 *  lands this close to a figure is reported as "cannot tell" so a person reads the drawing, rather than called either way. */
export const CAUTION = { ratioShare: 0.1, angleDeg: 1, stepMm: 5, lengthM: 0.03, groundM: 0.3 };

// ------------------------------------------------------------------------------------------------ the model, loosely typed
type Pt = [number, number];
interface Opening { kind?: string; type?: string; name?: string; a?: number; b?: number; sill?: number; head?: number; source?: string; material?: string; glazed?: boolean; openableArea?: number; openableAreaSource?: string }
interface Wall { id?: string; name?: string; axis?: 'x' | 'z'; at?: number; from?: number; to?: number; thickness?: number; openings?: Opening[]; line?: [number, number][] }
interface Room { id?: string; name?: string; u?: number; v?: number; w?: number; d?: number; source?: string }
interface Deck { id?: string; name?: string; u0?: number; u1?: number; v0?: number; v1?: number; drop?: number; poly?: Pt[]; rail?: string[]; railSource?: string; source?: string; gaps?: [Pt, Pt][]; barrierHeight?: number; barrierHeightSource?: string }
interface Level { id?: string; name?: string; floor?: number; plate?: number; walls?: Wall[]; rooms?: Room[]; decks?: Deck[]; stairs?: { id?: string; source?: string }[] }
interface Building { id?: string; name?: string; origin?: Pt; floorLevel?: number; roof?: { type?: string; pitchDeg?: number; high?: string }; levels?: Level[] }
interface Feature {
  kind?: string; name?: string; pts?: Pt[]; levels?: [number, number]; width?: number; source?: string;
  risers?: number; risersSource?: string; treads?: number; going?: number; goingSource?: string;
  handrails?: number | string; handrailsSource?: string; barrier?: string; barrierSource?: string; barrierHeight?: number; barrierHeightSource?: string;
}
interface Grid { centre?: Pt; size?: number; n?: number; heights?: number[]; source?: string }
interface Plan { schema?: string; job?: { title?: string; nickname?: string }; revision?: { current?: string }; buildings?: Building[]; site?: { terrain?: Grid; fall?: { at: Pt; y: number; slopeX: number; slopeZ: number; source?: string }; features?: Feature[] } }

// ------------------------------------------------------------------------------------------------ small helpers
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const ORDER: Derived[] = ['assumed', 'proposed', 'read by AI', 'not labelled', 'other', 'scaled', 'survey', 'written'];

/** which label a source note falls under: the same reading as the approval card uses */
export function derivedFrom(source: string | undefined): Derived {
  const s = (source ?? '').toLowerCase();
  if (!s) return 'not labelled';
  if (s === 'ai' || s.startsWith('ai ')) return 'read by AI';
  if (s.includes('assum') || s.includes('indicative')) return 'assumed';
  if (s.includes('propos')) return 'proposed';
  if (s.includes('survey') || s.includes('linz') || s.includes('lidar')) return 'survey';
  if (s.includes('written') || s === 'read') return 'written';
  if (s.includes('scaled') || s.includes('outline') || s.includes('position') || s.includes('traced') || s.includes('drawn') || s.includes('drawing')) return 'scaled';
  return 'other';
}
/** several measurements feed one check: it is only as good as the weakest of them */
const weakest = (list: Derived[]): Derived => ORDER.find((d) => list.includes(d)) ?? 'not labelled';
const round = (v: number, dp: number) => Math.round(v * 10 ** dp) / 10 ** dp;
const pct = (v: number) => `${round(v * 100, 1)}%`;
const m2 = (v: number) => `${round(v, 2)} m²`;
const mm = (metres: number) => `${Math.round(metres * 1000)} mm`;
const rule = (id: string) => RULES.find((r) => r.id === id)!;
/** a check that rests on anything weaker than a drawing says so in its own sentence */
const RESTS: Partial<Record<Derived, string>> = {
  assumed: 'This rests on an assumed size.', proposed: 'This rests on a proposed size.', 'read by AI': 'This rests on a size read by AI and not yet confirmed by a person.',
  'not labelled': 'The model does not say where this size came from.',
};
/** the label in full, as the cards show it */
export const DERIVED_WORDS: Record<Derived, string> = {
  written: 'written on the drawings', scaled: 'scaled from the drawings', survey: 'from survey data', 'read by AI': 'read by AI', proposed: 'proposed', assumed: 'assumed', 'not labelled': 'not labelled in the model', other: 'other source',
};

function make(id: string, subject: string, where: string, status: Status, o: { measured?: number | null; unit?: string; measuredText?: string; derived?: Derived | null; derivedNote?: string; needs?: string; reason?: string; caveats?: string[] } = {}): Check {
  const r = rule(id), ref = `${r.cite.short}${r.cite.short.includes(r.cite.clause) ? '' : ' ' + r.cite.clause}`;
  const says =
    status === 'meets the cited figure' ? `Meets the figure in ${ref}: ${o.measuredText} against ${r.figure}.`
    : status === 'does not meet the cited figure' ? `Does not meet the figure in ${ref}: ${o.measuredText} against ${r.figure}.`
    : status === 'cannot tell from this model' ? `Cannot tell from this model: needs ${o.needs}.${o.measuredText ? ` The model shows ${o.measuredText}.` : ''}`
    : `Not applicable: ${o.reason}.`;
  const rests = status === 'not applicable' ? '' : RESTS[o.derived ?? 'written'] ?? '';
  return { rule: id, title: r.title, subject, where, status, measured: o.measured ?? null, unit: o.unit ?? '', measuredText: o.measuredText ?? '', figure: r.figure, derived: o.derived ?? null, derivedNote: o.derivedNote ?? '', needs: o.needs, says: rests ? `${says} ${rests}` : says, caveats: o.caveats ?? [], cite: r.cite };
}
const cannot = (id: string, subject: string, where: string, needs: string, o: { measuredText?: string; measured?: number; unit?: string; derived?: Derived; derivedNote?: string; caveats?: string[] } = {}) => make(id, subject, where, 'cannot tell from this model', { needs, ...o });
const notApplicable = (id: string, subject: string, where: string, reason: string) => make(id, subject, where, 'not applicable', { reason });

/** the verdict for a measured value against a limit, with the tool's caution band for anything not written on the drawings */
function verdict(value: number, limit: number, sense: 'at least' | 'at most', band: number, derived: Derived): Status | 'too close' {
  if (derived !== 'written' && Math.abs(value - limit) < band) return 'too close';
  return (sense === 'at least' ? value >= limit : value <= limit) ? 'meets the cited figure' : 'does not meet the cited figure';
}
const TOO_CLOSE = 'a written dimension: the value is within the tool\'s caution band of the figure, and it is not written on the drawings';

// ------------------------------------------------------------------------------------------------ rooms and their openings
const NOT_HABITABLE = /bath|ensuite|en-suite|shower|laundry|\bwc\b|toilet|water.?closet|powder|pantry|wardrobe|\brobe\b|\bwir\b|corridor|hall|lobby|drying/i;
const SMALL_SPACE = /wardrobe|\brobe\b|\bwir\b|corridor|hall|lobby|pantry|drying|cupboard|linen|store|storage/i;
const SPECIALISED = /garage|carport|store|storage|cupboard|linen|plant|services|workshop|shed/i;
const HABITABLE = /bed|living|lounge|dining|family|kitchen|study|office|rumpus|media|sitting|snug|studio|sleep.?out|play/i;
/** habitable, by the room's name only: the Building Code's definition lists what is left out (clause A2; repeated in G7/AS1 and G4/AS1) */
export function roomUse(name: string | undefined): 'habitable' | 'wet' | 'small' | 'specialised' | 'unknown' {
  const n = name ?? '';
  if (/bath|ensuite|en-suite|shower|laundry|\bwc\b|toilet|water.?closet|powder/i.test(n)) return 'wet';
  if (SMALL_SPACE.test(n)) return 'small';
  if (SPECIALISED.test(n)) return 'specialised';
  if (HABITABLE.test(n) && !NOT_HABITABLE.test(n)) return 'habitable';
  return 'unknown';
}

interface Share { opening: Opening; wall: Wall; width: number; height: number; area: number; share: number }
/** the parts of outside-wall openings that sit on a room's own edge */
function openingsOf(room: Room, level: Level): Share[] {
  const out: Share[] = [];
  if (!num(room.u) || !num(room.v) || !num(room.w) || !num(room.d)) return out;
  for (const w of level.walls ?? []) {
    if (!num(w.at) || (w.axis !== 'x' && w.axis !== 'z')) continue;
    const reach = (num(w.thickness) ? w.thickness : 0.2) + 0.06;
    const [lo, hi, near, far] = w.axis === 'x' ? [room.u, room.u + room.w, room.v, room.v + room.d] : [room.v, room.v + room.d, room.u, room.u + room.w];
    if (Math.min(Math.abs(near - w.at), Math.abs(far - w.at)) > reach) continue;
    for (const o of w.openings ?? []) {
      if (!num(o.a) || !num(o.b) || !num(o.sill) || !num(o.head)) continue;
      const full = Math.abs(o.b - o.a), width = Math.min(Math.max(o.a, o.b), hi) - Math.max(Math.min(o.a, o.b), lo), height = o.head - o.sill;
      if (width > 0.01 && height > 0 && full > 0) out.push({ opening: o, wall: w, width, height, area: width * height, share: width / full });
    }
  }
  return out;
}
/** openings on a room's outside walls that lack a size */
function unsized(room: Room, level: Level): string[] {
  const names: string[] = [];
  if (!num(room.u) || !num(room.v) || !num(room.w) || !num(room.d)) return names;
  for (const w of level.walls ?? []) {
    if (!num(w.at) || (w.axis !== 'x' && w.axis !== 'z')) continue;
    const reach = (num(w.thickness) ? w.thickness : 0.2) + 0.06;
    const [lo, hi, near, far] = w.axis === 'x' ? [room.u, room.u + room.w, room.v, room.v + room.d] : [room.v, room.v + room.d, room.u, room.u + room.w];
    if (Math.min(Math.abs(near - w.at), Math.abs(far - w.at)) > reach) continue;
    for (const o of w.openings ?? []) {
      const placed = num(o.a) && num(o.b), onRoom = placed && Math.min(Math.max(o.a as number, o.b as number), hi) - Math.max(Math.min(o.a as number, o.b as number), lo) > 0.01;
      if (!placed || (onRoom && (!num(o.sill) || !num(o.head)))) names.push(o.name ?? 'an opening');
    }
  }
  return names;
}
/** the highest the ceiling would be over a room if it follows the roof, the way the page draws it; null when the model cannot say */
function ceilingTop(b: Building, level: Level, room: Room): number | null {
  if (!num(level.plate) || !num(room.v) || !num(room.d)) return null;
  const t = b.roof?.type ?? 'gable', pitch = b.roof?.pitchDeg;
  if (t === 'flat') return level.plate;
  if (!num(pitch)) return null;
  const D = Math.max(0, ...(level.walls ?? []).filter((w) => w.axis === 'x' && num(w.at)).map((w) => w.at as number), ...(level.walls ?? []).filter((w) => w.axis === 'z' && num(w.to)).map((w) => w.to as number));
  if (!(D > 0)) return null;
  const tanP = Math.tan((pitch * Math.PI) / 180), clamp = (v: number) => Math.max(0, Math.min(D, v)), ends = [room.v, room.v + room.d];
  if (t === 'skillion') return level.plate + Math.max(...ends.map((v) => clamp(b.roof?.high === 'v0' ? D - v : v))) * tanP;
  const hs = D / 2, nearestRidge = ends[0] <= hs && ends[1] >= hs ? 0 : Math.min(...ends.map((v) => Math.abs(v - hs)));
  return level.plate + Math.max(0, hs - nearestRidge) * tanP;
}
const isDoor = (o: Opening) => (o.kind ?? '').startsWith('door');
/** a level with walls drawn as lines at any angle (a free-form building): openings on them are not measured against rooms here */
const freeWalls = (level: Level) => (level.walls ?? []).some((w) => Array.isArray(w.line));
const FREE_NEEDS = 'openings measured against this room: its walls are drawn at any angle (a free-form building), and this check reads openings only on straight walls along the plan’s axes';
const isWindow = (o: Opening) => o.kind === 'window' || o.kind === 'glazing';
const whereRoom = (b: Building, l: Level, r: Room) => [b.name ?? b.id ?? 'Building', l.name ?? l.id ?? 'Level', `room ${r.id ?? '(no id)'}`].join(' · ');

function naturalLight(b: Building, level: Level, room: Room): Check {
  const id = 'natural-light', subject = room.name ?? room.id ?? 'Room', where = whereRoom(b, level, room), use = roomUse(room.name);
  if (use === 'wet' || use === 'small') return notApplicable(id, subject, where, `"${subject}" is read as a space the Building Code leaves out of habitable spaces, from its name`);
  if (use === 'specialised') return notApplicable(id, subject, where, `"${subject}" is read as a space of a specialised nature, from its name; a person confirms`);
  if (use === 'unknown') return cannot(id, subject, where, `to know whether "${subject}" is a habitable space; the model has only its name`);
  if (!num(room.w) || !num(room.d) || !num(room.u) || !num(room.v) || room.w <= 0 || room.d <= 0) return cannot(id, subject, where, 'the room\'s position and size (u, v, w, d)');
  if (freeWalls(level)) return cannot(id, subject, where, FREE_NEEDS);
  const floor = room.w * room.d, shares = openingsOf(room, level), missing = unsized(room, level);
  const solid = (o: Opening) => o.glazed === false || (o.glazed !== true && isDoor(o) && !!o.material);
  const sure = shares.filter((s) => isWindow(s.opening) && s.opening.glazed !== false || s.opening.glazed === true);
  const maybe = shares.filter((s) => !sure.includes(s) && isDoor(s.opening) && !solid(s.opening));
  const aSure = sure.reduce((t, s) => t + s.area, 0), aMaybe = maybe.reduce((t, s) => t + s.area, 0), band = 0.1 * CAUTION.ratioShare;
  const caveats = ['Measured to the opening sizes, frames included: the glass itself is smaller.'];
  const top = ceilingTop(b, level, room);
  if (top !== null && top > 3.0) caveats.push(`G7/AS1 does not cover rooms with a floor-to-ceiling height over 3.0 m (1.1.2.1(d)). If the ceiling follows the roof in the model it reaches about ${round(top, 2)} m here. A person confirms which document applies.`);
  const sizes = `the position and size of ${missing.join(', ')}: the model does not give them, so glazing may be missing from this count`;
  const note = (list: Share[]) => `floor ${m2(floor)} from the room size (${room.source ?? 'not labelled'}); openings: ${list.map((s) => `${s.opening.name ?? 'opening'} ${round(s.width, 2)} × ${round(s.height, 2)} m (${s.opening.source ?? 'not labelled'})`).join('; ') || 'none on this room\'s outside walls'}`;
  const dSure = weakest([derivedFrom(room.source), ...sure.map((s) => derivedFrom(s.opening.source))]);
  const r1 = aSure / floor, v1 = verdict(r1, 0.1, 'at least', band, dSure);
  if (v1 === 'meets the cited figure') return make(id, subject, where, v1, { measured: round(r1 * 100, 1), unit: '% of floor area', measuredText: `${m2(aSure)} of window openings over ${m2(floor)} of floor, ${pct(r1)}`, derived: dSure, derivedNote: note(sure), caveats });
  const all = [...sure, ...maybe], r2 = (aSure + aMaybe) / floor, dAll = weakest([derivedFrom(room.source), ...all.map((s) => derivedFrom(s.opening.source)), ...(maybe.length ? ['assumed' as Derived] : [])]);
  const v2 = verdict(r2, 0.1, 'at least', band, dAll), text = `${m2(aSure + aMaybe)} of openings over ${m2(floor)} of floor, ${pct(r2)}`;
  if (v2 === 'meets the cited figure') return make(id, subject, where, v2, { measured: round(r2 * 100, 1), unit: '% of floor area', measuredText: text, derived: dAll, derivedNote: note(all), caveats: [`Rests on an assumption: ${maybe.map((s) => s.opening.name ?? 'a door').join(', ')} counted as glass. The model does not say whether a door is glazed. Windows alone give ${pct(r1)}.`, ...caveats] });
  if (missing.length) return cannot(id, subject, where, sizes, { measuredText: text, measured: round(r2 * 100, 1), unit: '% of floor area', derived: dAll, derivedNote: note(all), caveats });
  if (v2 === 'too close') return cannot(id, subject, where, TOO_CLOSE, { measuredText: text, measured: round(r2 * 100, 1), unit: '% of floor area', derived: dAll, derivedNote: note(all), caveats });
  return make(id, subject, where, 'does not meet the cited figure', { measured: round(r2 * 100, 1), unit: '% of floor area', measuredText: text, derived: dAll, derivedNote: note(all), caveats: [...caveats, 'Roof windows and borrowed light are not in the model. G7/AS2 and G7/VM1 are other routes.'] });
}

function ventilation(b: Building, level: Level, room: Room, wallsWithOpeners: number): Check {
  const id = 'ventilation', subject = room.name ?? room.id ?? 'Room', where = whereRoom(b, level, room), use = roomUse(room.name);
  if (use === 'small') return notApplicable(id, subject, where, `G4/AS1 2.2.1.1 asks for no specific ventilation to small spaces such as hallways and lobbies where air is available from adjacent spaces; "${subject}" is read as one from its name, and a person confirms`);
  if (use === 'specialised') return notApplicable(id, subject, where, `"${subject}" is not checked: the tool checks habitable spaces, kitchens, bathrooms, toilets and laundries`);
  if (use === 'unknown') return cannot(id, subject, where, `to know what "${subject}" is used for; the model has only its name`);
  if (wallsWithOpeners <= 1) return notApplicable(id, subject, where, 'the model shows opening windows or doors on no more than one outside wall, so G4/AS1 2.2.2 applies in place of 2.2.1.2, and 2.2.2 is not checked');
  if (!num(room.w) || !num(room.d) || !num(room.u) || !num(room.v) || room.w <= 0 || room.d <= 0) return cannot(id, subject, where, 'the room\'s position and size (u, v, w, d)');
  if (freeWalls(level)) return cannot(id, subject, where, FREE_NEEDS);
  const floor = room.w * room.d, need = 0.05 * floor, shares = openingsOf(room, level).filter((s) => s.opening.type !== 'fixed'), band = 0.05 * CAUTION.ratioShare;
  const whole = shares.reduce((t, s) => t + s.area, 0), stated = shares.filter((s) => num(s.opening.openableArea));
  const known = stated.reduce((t, s) => t + (s.opening.openableArea as number) * s.share, 0), unstated = shares.filter((s) => !stated.includes(s));
  const fans = 'G4/AS1 2.1.1.2 also allows mechanical ventilation, alone or with natural ventilation; the model does not record fans.';
  const note = `floor ${m2(floor)} from the room size (${room.source ?? 'not labelled'}); units that are not fixed: ${shares.map((s) => `${s.opening.name ?? 'opening'} ${round(s.width, 2)} × ${round(s.height, 2)} m${num(s.opening.openableArea) ? `, ${m2(s.opening.openableArea)} openable as stated` : ''} (${s.opening.source ?? 'not labelled'})`).join('; ') || 'none on this room\'s outside walls'}`;
  const dWhole = weakest([derivedFrom(room.source), ...shares.map((s) => derivedFrom(s.opening.source))]);
  // the most that could open: every unit that is not fixed, opened over its whole face
  const most = known + unstated.reduce((t, s) => t + s.area, 0);
  const vMost = verdict(most / floor, 0.05, 'at least', band, dWhole);
  const missing = unsized(room, level);
  if (vMost !== 'meets the cited figure' && missing.length) return cannot(id, subject, where, `the position and size of ${missing.join(', ')}: the model does not give them`);
  if (vMost === 'does not meet the cited figure') return make(id, subject, where, vMost, { measured: round((most / floor) * 100, 1), unit: '% of floor area', measuredText: shares.length ? `at most ${m2(most)} that could open over ${m2(floor)} of floor, ${pct(most / floor)}` : `no opening window or door on this room's outside walls, over ${m2(floor)} of floor`, derived: dWhole, derivedNote: note, caveats: [fans] });
  const dKnown = weakest([derivedFrom(room.source), ...stated.map((s) => derivedFrom(s.opening.openableAreaSource ?? s.opening.source))]);
  const vKnown = stated.length ? verdict(known / floor, 0.05, 'at least', band, dKnown) : null;
  if (vKnown === 'meets the cited figure') return make(id, subject, where, vKnown, { measured: round((known / floor) * 100, 1), unit: '% of floor area', measuredText: `${m2(known)} net openable over ${m2(floor)} of floor, ${pct(known / floor)}`, derived: dKnown, derivedNote: note, caveats: [] });
  if (vMost === 'too close' && !unstated.length) return cannot(id, subject, where, TOO_CLOSE, { measuredText: `${m2(known)} net openable over ${m2(floor)} of floor, ${pct(known / floor)}`, derived: dKnown, derivedNote: note, caveats: [fans] });
  if (!unstated.length) return make(id, subject, where, 'does not meet the cited figure', { measured: round((known / floor) * 100, 1), unit: '% of floor area', measuredText: `${m2(known)} net openable over ${m2(floor)} of floor, ${pct(known / floor)}`, derived: dKnown, derivedNote: note, caveats: [fans] });
  return cannot(id, subject, where, `the net openable area of ${unstated.map((s) => s.opening.name ?? 'an opening').join(', ')}: the model holds each unit's overall size and whether it is fixed, not how much of it opens`, {
    measuredText: `units that are not fixed totalling ${m2(most)} over ${m2(floor)} of floor; ${m2(need)} of it would have to open to reach 5%`, measured: round((most / floor) * 100, 1), unit: '% of floor area if every unit opened fully', derived: dWhole, derivedNote: note, caveats: [fans],
  });
}

// ------------------------------------------------------------------------------------------------ ground, falls and barriers
/** existing ground level at a point, in the model's own datum; null where the model has no ground there */
export function groundLevel(plan: Plan): { at: (x: number, z: number) => number | null; derived: Derived; note: string } | null {
  const T = plan.site?.terrain, fall = plan.site?.fall;
  if (T && Array.isArray(T.heights) && num(T.size) && num(T.n) && T.centre && T.heights.length >= T.n * T.n && T.n >= 2) {
    const n = T.n, H = T.heights, c = T.centre, size = T.size;
    const at = (x: number, z: number) => {
      const fx = ((x - c[0]) / size + 0.5) * (n - 1), fz = ((z - c[1]) / size + 0.5) * (n - 1);
      if (fx < 0 || fz < 0 || fx > n - 1 || fz > n - 1) return null;
      const i = Math.min(n - 2, Math.floor(fx)), j = Math.min(n - 2, Math.floor(fz)), a = fx - i, b = fz - j;
      const y = (H[j * n + i] * (1 - a) + H[j * n + i + 1] * a) * (1 - b) + (H[(j + 1) * n + i] * (1 - a) + H[(j + 1) * n + i + 1] * a) * b;
      return num(y) ? y : null;
    };
    const said = (T.source ?? '').slice(0, 80);
    return { at, derived: said ? derivedFrom(said) : 'not labelled', note: `existing ground from the site grid, ${round(size / (n - 1), 2)} m spacing${said ? ` (${said}${(T.source ?? '').length > 80 ? '…' : ''})` : ''}` };
  }
  if (fall && fall.at && num(fall.y) && num(fall.slopeX) && num(fall.slopeZ)) return { at: (x, z) => fall.y + fall.slopeX * (x - fall.at[0]) + fall.slopeZ * (z - fall.at[1]), derived: derivedFrom(fall.source ?? 'assumed'), note: `ground from the model's fall plane (${fall.source ?? 'not a survey'})` };
  return null;
}
const inPoly = (p: Pt, poly: Pt[]) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
const toSeg = (p: Pt, a: Pt, b: Pt) => { const vx = b[0] - a[0], vy = b[1] - a[1], L2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2)); return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vy * t); };
const lengthOf = (pts: Pt[]) => pts.slice(1).reduce((t, b, i) => t + Math.hypot(b[0] - pts[i][0], b[1] - pts[i][1]), 0);

interface Solid { poly: Pt[]; kind: 'deck' | 'house' | 'landing' }
interface Run { pts: Pt[]; half: number }
/** the highest fall from the open edges of a level platform to the ground just outside it; null where the ground is unknown */
function fallFromPlatform(poly: Pt[], y: number, ground: (x: number, z: number) => number | null, others: Solid[], runs: Run[], gaps: [Pt, Pt][] = []): { fall: number; at: Pt } | null {
  let best: { fall: number; at: Pt } | null = null;
  const cx = poly.reduce((t, p) => t + p[0], 0) / poly.length, cz = poly.reduce((t, p) => t + p[1], 0) / poly.length;
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    if (L < 0.05) continue;
    let nx = -(B[1] - A[1]) / L, nz = (B[0] - A[0]) / L;
    const mid: Pt = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    if (inPoly([mid[0] + nx * 0.05, mid[1] + nz * 0.05], poly) || (!inPoly([mid[0] - nx * 0.05, mid[1] - nz * 0.05], poly) && nx * (mid[0] - cx) + nz * (mid[1] - cz) < 0)) { nx = -nx; nz = -nz; }
    const steps = Math.max(1, Math.round(L / 0.25));
    for (let k = 0; k <= steps; k++) {
      const e: Pt = [A[0] + ((B[0] - A[0]) * k) / steps, A[1] + ((B[1] - A[1]) * k) / steps], p: Pt = [e[0] + nx * 0.15, e[1] + nz * 0.15];
      if (others.some((s) => inPoly(p, s.poly))) continue;                                  // the house, another deck or a landing is there: no fall
      if (runs.some((r) => r.pts.slice(1).some((b2, j) => toSeg(p, r.pts[j], b2) < r.half + 0.2))) continue;   // a flight leaves here
      if (gaps.some(([g0, g1]) => toSeg(e, g0, g1) < 0.06)) continue;
      const g = ground(p[0], p[1]);
      if (g === null) continue;
      if (!best || y - g > best.fall) best = { fall: y - g, at: e };
    }
  }
  return best;
}
function fallFromFlight(f: Feature, ground: (x: number, z: number) => number | null, others: Solid[]): { fall: number; at: Pt } | null {
  const pts = f.pts as Pt[], lv = f.levels as [number, number], L = lengthOf(pts), half = (num(f.width) ? f.width : 1) / 2;
  let best: { fall: number; at: Pt } | null = null, d = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], s = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s < 0.01) continue;
    const nx = -(b[1] - a[1]) / s, nz = (b[0] - a[0]) / s, steps = Math.max(1, Math.round(s / 0.25));
    for (let k = 0; k <= steps; k++) {
      const t = (d + (s * k) / steps) / L, y = lv[0] + (lv[1] - lv[0]) * t, c: Pt = [a[0] + ((b[0] - a[0]) * k) / steps, a[1] + ((b[1] - a[1]) * k) / steps];
      for (const side of [-1, 1]) {
        const p: Pt = [c[0] + nx * side * (half + 0.15), c[1] + nz * side * (half + 0.15)];
        if (others.some((o) => inPoly(p, o.poly))) continue;
        const g = ground(p[0], p[1]);
        if (g !== null && (!best || y - g > best.fall)) best = { fall: y - g, at: c };
      }
    }
    d += s;
  }
  return best;
}
const deckPoly = (d: Deck, o: Pt): Pt[] | null => {
  const local = d.poly && d.poly.length >= 3 ? d.poly : num(d.u0) && num(d.u1) && num(d.v0) && num(d.v1) ? ([[d.u0, d.v0], [d.u1, d.v0], [d.u1, d.v1], [d.u0, d.v1]] as Pt[]) : null;
  return local ? local.map((p) => [o[0] + p[0], o[1] + p[1]] as Pt) : null;
};
function footprint(b: Building): Pt[] | null {
  const L = b.levels?.[0], o = b.origin ?? [0, 0];
  const W = Math.max(0, ...(L?.walls ?? []).filter((w) => w.axis === 'z' && num(w.at)).map((w) => w.at as number)), D = Math.max(0, ...(L?.walls ?? []).filter((w) => w.axis === 'x' && num(w.at)).map((w) => w.at as number));
  return W > 0 && D > 0 ? [[o[0], o[1]], [o[0] + W, o[1]], [o[0] + W, o[1] + D], [o[0], o[1] + D]] : null;
}
/** what the model records about a barrier: 'none' means it says there is none; null means it does not say */
function barrierOn(list: string[] | string | undefined): string | 'none' | null {
  const tokens = (Array.isArray(list) ? list : list ? [list] : []).map((t) => String(t).toLowerCase()).filter((t) => t !== 'posts');
  if (tokens.includes('none')) return 'none';
  return tokens.length ? tokens.join(', ') : null;
}

interface Edge { subject: string; where: string; kind: 'deck' | 'stairs' | 'landing'; fall: { fall: number; at: Pt } | null; groundKnown: boolean; barrier: string | 'none' | null; barrierSource?: string; height?: number; heightSource?: string; source?: string; groundDerived?: Derived; groundNote?: string; placed: boolean }
function barrierChecks(e: Edge): Check[] {
  const out: Check[] = [], at = e.fall ? ` near (${round(e.fall.at[0], 1)}, ${round(e.fall.at[1], 1)})` : '';
  const derived = e.fall ? weakest([derivedFrom(e.source), e.groundDerived ?? 'not labelled']) : null;
  const fallText = e.fall ? `a fall of about ${round(Math.max(0, e.fall.fall), 2)} m at its highest open edge${at}` : '';
  const note = `${e.kind} level and outline (${e.source ?? 'not labelled'}); ${e.groundNote ?? ''}`;
  const far = 'Measured to existing ground. Finished ground after earthworks is not in the model and may differ.';
  const needed: 'yes' | 'no' | 'close' | 'unknown' = !e.placed ? 'unknown' : !e.fall ? 'unknown' : Math.abs(e.fall.fall - 1) < CAUTION.groundM ? 'close' : e.fall.fall >= 1 ? 'yes' : 'no';
  // is a barrier recorded where the fall is 1 m or more
  if (!e.placed) out.push(cannot('barrier-needed', e.subject, e.where, 'the outline and level of this part'));
  else if (!e.groundKnown || !e.fall) out.push(cannot('barrier-needed', e.subject, e.where, 'ground levels beside this part: the model has no ground here'));
  else if (needed === 'close') out.push(cannot('barrier-needed', e.subject, e.where, 'finished ground levels at this edge: the fall is within the tool\'s caution band of 1 m', { measuredText: fallText, measured: round(e.fall.fall, 2), unit: 'm of fall', derived: derived!, derivedNote: note, caveats: [far] }));
  else if (needed === 'no') out.push(notApplicable('barrier-needed', e.subject, e.where, `the model shows ${fallText}, less than 1 m, measured to existing ground`));
  else if (e.barrier === null) out.push(cannot('barrier-needed', e.subject, e.where, 'a barrier recorded on this part: the model does not say whether there is one (the page draws one of its own accord)', { measuredText: fallText, measured: round(e.fall.fall, 2), unit: 'm of fall', derived: derived!, derivedNote: note, caveats: [far] }));
  else out.push(make('barrier-needed', e.subject, e.where, e.barrier === 'none' ? 'does not meet the cited figure' : 'meets the cited figure', {
    measured: round(e.fall.fall, 2), unit: 'm of fall', measuredText: `${fallText}, and ${e.barrier === 'none' ? 'the model records no barrier' : `a barrier is recorded (${e.barrier}${e.barrierSource ? ': ' + e.barrierSource : ''})`}`,
    derived: weakest([derived!, derivedFrom(e.barrierSource ?? e.source)]), derivedNote: note, caveats: [far, 'Where the barrier runs is not in the model: a person checks it covers every edge with a fall of 1 m or more.'],
  }));
  // how high the barrier is
  const limit = e.kind === 'deck' ? 1.0 : 0.9, row = e.kind === 'deck' ? 'decks and balconies, 1000 mm' : 'stairs and their intermediate landings, 900 mm';
  if (needed === 'no') out.push(notApplicable('barrier-height', e.subject, e.where, 'the model shows a fall of less than 1 m here, so no barrier is called for by F4.3.1'));
  else if (e.barrier === 'none') out.push(notApplicable('barrier-height', e.subject, e.where, 'the model records no barrier here'));
  else if (!num(e.height)) out.push(cannot('barrier-height', e.subject, e.where, 'the barrier height: the model records none (the page draws its own)'));
  else {
    const d = derivedFrom(e.heightSource ?? e.source), v = verdict(e.height, limit, 'at least', CAUTION.lengthM, d), text = `a barrier ${mm(e.height)} high (row used: ${row})`;
    if (v === 'too close') out.push(cannot('barrier-height', e.subject, e.where, TOO_CLOSE, { measuredText: text, measured: Math.round(e.height * 1000), unit: 'mm', derived: d, derivedNote: `barrier height (${e.heightSource ?? e.source ?? 'not labelled'})` }));
    else out.push(make('barrier-height', e.subject, e.where, v, { measured: Math.round(e.height * 1000), unit: 'mm', measuredText: text, derived: d, derivedNote: `barrier height (${e.heightSource ?? e.source ?? 'not labelled'})`, caveats: needed === 'unknown' || needed === 'close' ? ['Whether a barrier is called for here could not be told: the fall is unknown or close to 1 m.'] : [] }));
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ stairs
function stairChecks(f: Feature, i: number): Check[] {
  const subject = f.name ?? `Outside steps ${i}`, where = `Site · steps ${i}${f.pts?.length ? ` from (${round(f.pts[0][0], 1)}, ${round(f.pts[0][1], 1)})` : ''}`, out: Check[] = [];
  const hasRun = Array.isArray(f.pts) && f.pts.length >= 2 && f.pts.every((p) => Array.isArray(p) && num(p[0]) && num(p[1])), hasLevels = Array.isArray(f.levels) && num(f.levels[0]) && num(f.levels[1]);
  const H = hasLevels ? Math.abs((f.levels as number[])[1] - (f.levels as number[])[0]) : null, L = hasRun ? lengthOf(f.pts as Pt[]) : null;
  const base = derivedFrom(f.source), src = f.source ?? 'not labelled';
  const risers = num(f.risers) && f.risers >= 1 ? f.risers : null, going = num(f.going) && f.going > 0 ? f.going : num(f.treads) && f.treads >= 1 && L ? L / f.treads : null;
  const dR = weakest([base, derivedFrom(f.risersSource ?? f.source)]), dG = num(f.going) && f.going > 0 ? derivedFrom(f.goingSource ?? f.source) : weakest([base, derivedFrom(f.goingSource ?? f.source)]);
  // pitch
  if (H !== null && risers && going) {
    const pitch = (Math.atan2(H / risers, going) * 180) / Math.PI, d = weakest([dR, dG]), v = verdict(pitch, 37, 'at most', CAUTION.angleDeg, d), text = `a pitch of ${round(pitch, 1)}° from ${mm(H / risers)} risers and ${mm(going)} goings`;
    out.push(v === 'too close' ? cannot('stair-pitch', subject, where, TOO_CLOSE, { measuredText: text, measured: round(pitch, 1), unit: '°', derived: d, derivedNote: `rise and run (${src})` }) : make('stair-pitch', subject, where, v, { measured: round(pitch, 1), unit: '°', measuredText: text, derived: d, derivedNote: `rise ${round(H, 2)} m over ${risers} risers; going ${mm(going)} (${src})` }));
  } else if (H !== null && L !== null && L > 0) {
    const slope = (Math.atan2(H, L) * 180) / Math.PI, text = `an overall slope of ${round(slope, 1)}°, ${round(H, 2)} m of rise over ${round(L, 2)} m on plan`;
    const o = { measuredText: text, measured: round(slope, 1), unit: '° overall', derived: base, derivedNote: `flight rise and plan length (${src})` };
    // the pitch line joins the nosings, so it can be no steeper than the overall slope from landing to landing
    if (slope <= 37 - (base === 'written' ? 0 : CAUTION.angleDeg)) out.push(make('stair-pitch', subject, where, 'meets the cited figure', { ...o, caveats: ['This is the overall slope from landing to landing. The pitch line, through the nosings, is no steeper than it.'] }));
    else out.push(cannot('stair-pitch', subject, where, 'the number of risers and the going: the overall slope is close to or above the figure, and the pitch line through the nosings can be flatter than the overall slope', o));
  } else out.push(cannot('stair-pitch', subject, where, 'the flight\'s top and bottom levels and its line on plan'));
  // riser
  if (H !== null && risers) {
    const r = H / risers, v = verdict(r * 1000, 190, 'at most', CAUTION.stepMm, dR), text = `risers of ${mm(r)}, ${round(H, 2)} m of rise over ${risers} risers`;
    out.push(v === 'too close' ? cannot('stair-riser', subject, where, TOO_CLOSE, { measuredText: text, measured: Math.round(r * 1000), unit: 'mm', derived: dR, derivedNote: `rise (${src}); riser count (${f.risersSource ?? src})` }) : make('stair-riser', subject, where, v, { measured: Math.round(r * 1000), unit: 'mm', measuredText: text, derived: dR, derivedNote: `rise (${src}); riser count (${f.risersSource ?? src})` }));
  } else out.push(cannot('stair-riser', subject, where, H === null ? 'the flight\'s top and bottom levels and the number of risers' : 'the number of risers: the model holds the flight\'s rise, not how it is divided (the page draws its own steps)', H === null ? {} : { measuredText: `${round(H, 2)} m of rise in the flight`, derived: base, derivedNote: `flight rise (${src})` }));
  // tread
  if (going) {
    const v = verdict(going * 1000, 280, 'at least', CAUTION.stepMm, dG), text = `treads of ${mm(going)}${num(f.going) ? '' : `, ${round(L as number, 2)} m on plan over ${f.treads} treads`}`;
    out.push(v === 'too close' ? cannot('stair-tread', subject, where, TOO_CLOSE, { measuredText: text, measured: Math.round(going * 1000), unit: 'mm', derived: dG, derivedNote: `going (${f.goingSource ?? src})` }) : make('stair-tread', subject, where, v, { measured: Math.round(going * 1000), unit: 'mm', measuredText: text, derived: dG, derivedNote: `going (${f.goingSource ?? src})`, caveats: ['The going is used as the tread depth: tread projection is not in the model.'] }));
  } else out.push(cannot('stair-tread', subject, where, 'the going of each step, or the number of treads: the model holds the flight\'s length on plan, not how it is divided', L === null ? {} : { measuredText: `${round(L, 2)} m of flight on plan`, derived: base, derivedNote: `flight line (${src})` }));
  // rise between landings
  if (H !== null) {
    const v = verdict(H, 4.0, 'at most', CAUTION.lengthM, base), text = `${round(H, 2)} m of rise in this flight`;
    out.push(v === 'too close' ? cannot('stair-flight-rise', subject, where, TOO_CLOSE, { measuredText: text, measured: round(H, 2), unit: 'm', derived: base, derivedNote: `flight levels (${src})` }) : make('stair-flight-rise', subject, where, v, { measured: round(H, 2), unit: 'm', measuredText: text, derived: base, derivedNote: `flight levels (${src})` }));
  } else out.push(cannot('stair-flight-rise', subject, where, 'the flight\'s top and bottom levels'));
  // handrail
  const rails = typeof f.handrails === 'string' ? ({ none: 0, one: 1, both: 2 } as Record<string, number>)[f.handrails.toLowerCase()] ?? null : num(f.handrails) ? f.handrails : null;
  const dH = derivedFrom(f.handrailsSource ?? f.source);
  if (num(f.width) && f.width > 2.0) out.push(notApplicable('stair-handrail', subject, where, `the stair is ${round(f.width, 2)} m wide, and stairs wider than 2.0 m follow D1/AS1 6.0.2, which is not checked`));
  else if (rails === null) out.push(cannot('stair-handrail', subject, where, 'handrails recorded on the stair: the model does not say whether there is one'));
  else if (rails >= 1) out.push(make('stair-handrail', subject, where, 'meets the cited figure', { measured: rails, unit: rails === 1 ? 'side' : 'sides', measuredText: `a handrail recorded on ${rails === 1 ? 'one side' : 'both sides'}`, derived: dH, derivedNote: `handrails (${f.handrailsSource ?? src})` }));
  else if (risers === null) out.push(cannot('stair-handrail', subject, where, 'the number of risers: the model records no handrail, and D1/AS1 6.0.1 lets handrails be left off stairs of two or three risers at a household unit', { measuredText: 'no handrail recorded', derived: dH, derivedNote: `handrails (${f.handrailsSource ?? src})` }));
  else if (risers <= 3) out.push(notApplicable('stair-handrail', subject, where, `the stair has ${risers} riser${risers === 1 ? '' : 's'}, and D1/AS1 6.0.1 lets handrails be left off stairs of two or three risers within or giving access to a household unit`));
  else out.push(make('stair-handrail', subject, where, 'does not meet the cited figure', { measured: 0, unit: 'sides', measuredText: `no handrail recorded on a stair of ${risers} risers`, derived: weakest([dH, dR]), derivedNote: `handrails (${f.handrailsSource ?? src})` }));
  return out;
}

function landingCheck(f: Feature, i: number, flights: Feature[]): Check {
  const subject = f.name ?? `Stair landing ${i}`, where = `Site · landing ${i}`, pts = f.pts ?? [];
  if (pts.length < 3 || !pts.every((p) => Array.isArray(p) && num(p[0]) && num(p[1]))) return cannot('landing-length', subject, where, 'the landing\'s outline');
  // the landing's extent along a direction
  const along = (dx: number, dz: number) => { const s = pts.map((p) => p[0] * dx + p[1] * dz); return Math.max(...s) - Math.min(...s); };
  // direction of travel: the line of each flight that ends on this landing
  const dirs: Pt[] = [];
  for (const fl of flights) {
    const q = fl.pts as Pt[];
    for (const [end, prev] of [[q[0], q[1]], [q[q.length - 1], q[q.length - 2]]] as [Pt, Pt][]) {
      const near = inPoly(end, pts) || pts.some((a, k) => toSeg(end, a, pts[(k + 1) % pts.length]) < 0.15), s = Math.hypot(end[0] - prev[0], end[1] - prev[1]);
      if (near && s > 0.01) dirs.push([(end[0] - prev[0]) / s, (end[1] - prev[1]) / s]);
    }
  }
  const d = derivedFrom(f.source), src = f.source ?? 'not labelled';
  const edges = pts.map((a, k) => { const b = pts[(k + 1) % pts.length], s = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / s, (b[1] - a[1]) / s] as Pt; });
  const least = Math.min(...edges.map((e) => along(-e[1], e[0])));
  const len = dirs.length ? Math.min(...dirs.map((e) => along(e[0], e[1]))) : least;
  const how = dirs.length ? `measured along the line of the ${dirs.length === 1 ? 'flight that meets' : 'flights that meet'} it` : 'no flight in the model meets this landing, so its least width is used';
  const v = verdict(len, 0.9, 'at least', CAUTION.lengthM, d), text = `a landing ${mm(len)} long, ${how}`;
  if (v === 'too close') return cannot('landing-length', subject, where, TOO_CLOSE, { measuredText: text, measured: Math.round(len * 1000), unit: 'mm', derived: d, derivedNote: `landing outline (${src})` });
  if (v === 'does not meet the cited figure' && !dirs.length && Math.max(...edges.map((e) => along(e[0], e[1]))) >= 0.9) return cannot('landing-length', subject, where, 'the direction of travel across the landing: one way it is under 900 mm, the other way it is not', { measuredText: `a landing ${mm(least)} at its least width`, measured: Math.round(least * 1000), unit: 'mm', derived: d, derivedNote: `landing outline (${src})` });
  return make('landing-length', subject, where, v, { measured: Math.round(len * 1000), unit: 'mm', measuredText: text, derived: d, derivedNote: `landing outline (${src})` });
}

// ------------------------------------------------------------------------------------------------ the whole run
/** Run every rule over a plan model (assembl.plan-model.v1). Returns one line per rule and thing measured. */
export function runCodeChecks(input: unknown): Check[] {
  const plan = (input ?? {}) as Plan, out: Check[] = [];
  const buildings = Array.isArray(plan.buildings) ? plan.buildings : [];
  // rooms: light and ventilation
  let rooms = 0;
  for (const b of buildings) for (const level of b.levels ?? []) {
    const wallsWithOpeners = (level.walls ?? []).filter((w) => (w.openings ?? []).some((o) => o.type !== 'fixed' && num(o.a) && num(o.b))).length;
    for (const room of level.rooms ?? []) { rooms++; out.push(naturalLight(b, level, room), ventilation(b, level, room, wallsWithOpeners)); }
  }
  if (!rooms) for (const id of ['natural-light', 'ventilation']) out.push(cannot(id, 'Rooms', 'Whole model', 'rooms with a name, position and size'));

  // stairs, landings, decks: what stands where, in the site's own frame
  const feats = Array.isArray(plan.site?.features) ? (plan.site!.features as Feature[]) : [];
  const steps = feats.filter((f) => f.kind === 'steps'), landings = feats.filter((f) => f.kind === 'landing');
  const flights = steps.filter((f) => Array.isArray(f.pts) && f.pts.length >= 2 && f.pts.every((p) => Array.isArray(p) && num(p[0]) && num(p[1])));
  const ground = groundLevel(plan), solids: Solid[] = [], runs: Run[] = flights.map((f) => ({ pts: f.pts as Pt[], half: (num(f.width) ? f.width : 1) / 2 }));
  const decks: { b: Building; level: Level; d: Deck; poly: Pt[] | null; y: number }[] = [];
  for (const b of buildings) {
    const fp = footprint(b); if (fp) solids.push({ poly: fp, kind: 'house' });
    for (const level of b.levels ?? []) for (const d of level.decks ?? []) {
      const poly = deckPoly(d, b.origin ?? [0, 0]); if (poly) solids.push({ poly, kind: 'deck' });
      decks.push({ b, level, d, poly, y: (b.floorLevel ?? 0) + (level.floor ?? 0) - (d.drop ?? 0) });
    }
  }
  const landingPolys = landings.map((f) => (Array.isArray(f.pts) && f.pts.length >= 3 && f.pts.every((p) => Array.isArray(p) && num(p[0]) && num(p[1])) ? (f.pts as Pt[]) : null));
  landingPolys.forEach((p) => p && solids.push({ poly: p, kind: 'landing' }));

  steps.forEach((f, k) => {
    out.push(...stairChecks(f, k + 1));
    const ok = flights.includes(f) && Array.isArray(f.levels) && num(f.levels[0]) && num(f.levels[1]);
    out.push(...barrierChecks({
      subject: f.name ?? `Outside steps ${k + 1}`, where: `Site · steps ${k + 1}`, kind: 'stairs', placed: ok, groundKnown: !!ground, fall: ok && ground ? fallFromFlight(f, ground.at, solids) : null,
      barrier: barrierOn(f.barrier), barrierSource: f.barrierSource, height: f.barrierHeight, heightSource: f.barrierHeightSource, source: f.source, groundDerived: ground?.derived, groundNote: ground?.note,
    }));
  });
  const inside = buildings.flatMap((b) => (b.levels ?? []).flatMap((l) => l.stairs ?? []));
  for (const id of ['stair-pitch', 'stair-riser', 'stair-tread', 'stair-flight-rise', 'stair-handrail']) {
    if (inside.length) out.push(cannot(id, 'Stairs inside the building', 'Whole model', 'each flight\'s rise, going, riser count, handrails and which kind of private stair it is: the model holds only the stair\'s outline'));
    else if (!steps.length) out.push(notApplicable(id, 'Stairs', 'Whole model', 'the model has no stairs'));
  }
  landings.forEach((f, k) => {
    out.push(landingCheck(f, k + 1, flights));
    const poly = landingPolys[k], y = Array.isArray(f.levels) && num(f.levels[0]) ? f.levels[0] : null, ok = !!poly && y !== null;
    out.push(...barrierChecks({
      subject: f.name ?? `Stair landing ${k + 1}`, where: `Site · landing ${k + 1}`, kind: 'landing', placed: ok, groundKnown: !!ground, fall: ok && ground ? fallFromPlatform(poly!, y!, ground.at, solids.filter((s) => s.poly !== poly), runs) : null,
      barrier: barrierOn(f.barrier), barrierSource: f.barrierSource, height: f.barrierHeight, heightSource: f.barrierHeightSource, source: f.source, groundDerived: ground?.derived, groundNote: ground?.note,
    }));
  });
  if (!landings.length) out.push(notApplicable('landing-length', 'Stair landings', 'Whole model', 'the model has no stair landings'));
  for (const { b, level, d, poly, y } of decks) {
    const subject = d.name ?? d.id ?? 'Deck';
    out.push(...barrierChecks({
      subject, where: [b.name ?? b.id ?? 'Building', level.name ?? level.id ?? 'Level', `deck ${d.id ?? ''}`.trim()].join(' · '), kind: 'deck', placed: !!poly, groundKnown: !!ground,
      fall: poly && ground ? fallFromPlatform(poly, y, ground.at, solids.filter((s) => s.poly !== poly), runs, (d.gaps ?? []).map(([p, q]) => [[(b.origin ?? [0, 0])[0] + p[0], (b.origin ?? [0, 0])[1] + p[1]], [(b.origin ?? [0, 0])[0] + q[0], (b.origin ?? [0, 0])[1] + q[1]]] as [Pt, Pt])) : null,
      barrier: barrierOn(d.rail), barrierSource: d.railSource, height: d.barrierHeight, heightSource: d.barrierHeightSource, source: d.source, groundDerived: ground?.derived, groundNote: ground?.note,
    }));
  }
  if (!decks.length && !steps.length && !landings.length) for (const id of ['barrier-needed', 'barrier-height']) out.push(notApplicable(id, 'Decks, stairs and landings', 'Whole model', 'the model has no decks, outside stairs or landings; falls from windows and inside floors are not checked'));
  return RULES.flatMap((r) => out.filter((c) => c.rule === r.id));
}

/** the edition and when it took effect, without saying the same date twice */
export const editionLine = (c: Citation) => (c.edition.includes(c.effective) ? c.edition : `${c.edition}, effective ${c.effective}`);
export const STANDING = 'A pre-check against cited figures. It is not a compliance decision. A person reviews it.';
export const STATUSES: Status[] = ['meets the cited figure', 'does not meet the cited figure', 'cannot tell from this model', 'not applicable'];
export function tally(checks: Check[]): Record<Status, number> {
  const t = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const c of checks) t[c.status]++;
  return t;
}

/** the results as a plain text file a person can keep with the job */
export function resultsAsText(input: unknown, checks: Check[], when: Date, version = ''): string {
  const plan = (input ?? {}) as Plan, t = tally(checks), lines: string[] = [];
  lines.push('Code pre-check', STANDING, 'It gives no professional sign-off. It never says a design complies with the Building Code.', '');
  lines.push(`Model: ${plan.job?.title ?? 'untitled'}${plan.revision?.current ? ` · revision ${plan.revision.current}` : ''}${version ? ` · version ${version}` : ''}`);
  lines.push(`Run: ${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`, `Results: ${STATUSES.map((s) => `${t[s]} ${s}`).join(' · ')}`, '');
  lines.push(`Close calls: a measurement that is not written on the drawings and lands near a figure is reported as "cannot tell". The bands are the tool's own, not from the Building Code: ${CAUTION.ratioShare * 100}% of an area figure, ${CAUTION.angleDeg}° of pitch, ${CAUTION.stepMm} mm of a step, ${CAUTION.lengthM * 1000} mm of a length, ${CAUTION.groundM} m of a fall to surveyed ground.`, '');
  for (const r of RULES) {
    const mine = checks.filter((c) => c.rule === r.id);
    lines.push(`== ${r.title} ==`, `Figure: ${r.figure}`, `Source: ${r.cite.document}, ${r.cite.clause}. ${editionLine(r.cite)}. ${r.cite.publisher}.`, `Read on ${r.cite.readOn} at ${r.cite.url}${r.cite.page ? ` (PDF page ${r.cite.page})` : ''}`, `In short: ${r.cite.requirement}`, r.leavesOut, '');
    for (const c of mine) {
      lines.push(`${c.status === 'meets the cited figure' ? '[x]' : '[ ]'} ${c.subject}: ${c.status}`, `    ${c.says}`, `    Where: ${c.where}`);
      if (c.derived) lines.push(`    How it was measured: ${DERIVED_WORDS[c.derived]}${c.derivedNote ? '. ' + c.derivedNote : ''}`);
      for (const k of c.caveats) lines.push(`    Note: ${k}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
