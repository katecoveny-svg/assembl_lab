// Room names for a read plan: the name printed on the drawing when there is one; otherwise a name suggested from what is
// drawn in the room (its fixtures, its shape and the doors off it), always marked as a suggestion for a person to check;
// and a person's own name, which wins over both. No imports, so the rules can be tested on their own.
//
// The rules, in order (a room gets the first that fits):
//   a bed drawn                                  -> Bedroom
//   a toilet with no shower or bath              -> WC            (a shower would be wrong in a WC's fit-out)
//   a toilet, shower, bath, basin or vanity      -> Bathroom, or Ensuite when every door of the room opens off a bedroom
//   a hob, cooktop or oven, or a bench with a sink -> Kitchen
//   a washing machine, dryer or laundry tub      -> Laundry
//   a hanging rail or a wardrobe drawn           -> Wardrobe
//   a small room (up to 3 m², 1.2 m across) off a bedroom, with nothing else drawn -> Wardrobe
//   a corridor shape (up to 1.8 m wide, at least 2.2 times as long) with two or more doors off it -> Hall
//   anything else                                -> Room
// A name used more than once is numbered in sheet reading order (top to bottom, then left to right), after any number the
// drawing already prints for it ("Bedroom 1" printed: the next suggested bedroom is "Bedroom 2").

export type NameSrc = 'printed' | 'drawn' | 'person';
export const NAME_NOTE: Record<NameSrc, string> = { printed: 'as printed on the drawing', drawn: 'named from what is drawn: check', person: 'named by a person' };

export interface NamingRoom { id: string; name: string; u: number; v: number; w: number; d: number; fixtures?: string; order?: number }
/** a door or doorless opening joining two rooms; null is outside, or a space that is not one of the rooms */
export interface Link { a: string | null; b: string | null }
export interface Named { name: string; src: 'printed' | 'drawn'; printed: string; why: string }

/** a tag that names nothing: blank, or only question marks (an unplaced tag in the drawing software) */
export const unprinted = (s: string | undefined | null) => !s || /^[\s?？]*$/.test(s);

const has = (f: string, re: RegExp) => re.test(f);
const BED = /\b(beds?|bunks?|cot)\b/;
const TOILET = /\b(toilets?|wc|w\/c|pans?|water closet)\b/;
const WASH = /\b(showers?|baths?|bathtub)\b/;
const BASIN = /\b(basins?|vanity|vanities)\b/;
const COOK = /\b(hobs?|cooktop|ovens?|stove|range)\b/;
const BENCH = /\b(bench(es)?|counters?|island|kitchen)\b/;
const SINK = /\bsinks?\b/;
const LAUNDRY = /\b(washing machine|washer|dryer|laundry|tub)\b/;
const ROBE = /\b(hanging rail|rail|wardrobes?|robes?)\b/;

/** the base name (no number) suggested from the fixtures alone, or null when they say nothing */
export function fromFixtures(fixtures = ''): string | null {
  const f = fixtures.toLowerCase();
  if (has(f, BED)) return 'Bedroom';
  if (has(f, TOILET) && !has(f, WASH)) return 'WC';
  if (has(f, TOILET) || has(f, WASH) || has(f, BASIN)) return 'Bathroom';
  if (has(f, COOK) || (has(f, BENCH) && has(f, SINK))) return 'Kitchen';
  if (has(f, LAUNDRY)) return 'Laundry';
  if (has(f, ROBE)) return 'Wardrobe';
  return null;
}

const touching = (p: NamingRoom, q: NamingRoom, gap = 0.3, along = 0.3) => {
  const ov = (a0: number, a1: number, b0: number, b1: number) => Math.min(a1, b1) - Math.max(a0, b0);
  const sideU = Math.min(Math.abs(p.u + p.w - q.u), Math.abs(q.u + q.w - p.u)) <= gap && ov(p.v, p.v + p.d, q.v, q.v + q.d) >= along;
  const sideV = Math.min(Math.abs(p.v + p.d - q.v), Math.abs(q.v + q.d - p.v)) <= gap && ov(p.u, p.u + p.w, q.u, q.u + q.w) >= along;
  return sideU || sideV;
};

/** names for every room: printed where printed, suggested where not, numbered where a suggestion repeats */
export function suggestNames(rooms: NamingRoom[], links: Link[]): Map<string, Named> {
  const out = new Map<string, Named>();
  const base = new Map<string, string>(), why = new Map<string, string>();
  const isBedroom = (r: NamingRoom) => (unprinted(r.name) ? base.get(r.id) === 'Bedroom' : /\bbed/i.test(r.name));
  const linksOf = (id: string) => links.filter((l) => l.a === id || l.b === id).map((l) => (l.a === id ? l.b : l.a));
  const blank = rooms.filter((r) => unprinted(r.name));
  // first the fixtures, then what needs to know where the bedrooms are
  for (const r of blank) { const b = fromFixtures(r.fixtures); if (b) { base.set(r.id, b); why.set(r.id, `drawn in it: ${r.fixtures}`); } }
  for (const r of blank) {
    if (base.get(r.id) !== 'Bathroom' && base.get(r.id) !== 'WC') continue;
    const to = linksOf(r.id);
    const byId = (id: string | null) => rooms.find((x) => x.id === id);
    if (to.length && to.every((id) => { const o = byId(id); return !!o && isBedroom(o); })) { base.set(r.id, 'Ensuite'); why.set(r.id, `${why.get(r.id)}; its only door opens off a bedroom`); }
  }
  for (const r of blank) {
    if (base.has(r.id)) continue;
    const small = r.w * r.d <= 3.0 && Math.min(r.w, r.d) <= 1.2, nothing = !(r.fixtures ?? '').trim();
    const offBed = rooms.some((o) => o !== r && isBedroom(o) && (linksOf(r.id).includes(o.id) || (!linksOf(r.id).length && touching(r, o))));
    if (small && nothing && offBed) { base.set(r.id, 'Wardrobe'); why.set(r.id, 'a small room off a bedroom, nothing else drawn in it'); continue; }
    const narrow = Math.min(r.w, r.d), long = Math.max(r.w, r.d), doors = linksOf(r.id).length;
    if (narrow <= 1.8 && long >= 2.2 * narrow && doors >= 2) { base.set(r.id, 'Hall'); why.set(r.id, `a corridor shape with ${doors} doors off it`); continue; }
    base.set(r.id, 'Room'); why.set(r.id, (r.fixtures ?? '').trim() ? `drawn in it: ${r.fixtures}; no rule names that` : 'nothing drawn that names it');
  }
  // numbering, in sheet reading order, after any number the drawing already prints for the same name
  const ordered = [...blank].sort((p, q) => (p.order ?? 0) - (q.order ?? 0));
  for (const name of new Set(ordered.map((r) => base.get(r.id)!))) {
    const mine = ordered.filter((r) => base.get(r.id) === name);
    const re = new RegExp(`^${name}\\s*(\\d+)?$`, 'i');
    const printedNums = rooms.filter((r) => !unprinted(r.name)).map((r) => r.name.trim().match(re)).filter(Boolean).map((m) => +(m![1] ?? 1));
    const number = mine.length > 1 || printedNums.length > 0;
    let n = 0;
    for (const r of mine) {
      do n++; while (printedNums.includes(n));
      out.set(r.id, { name: number ? `${name} ${n}` : name, src: 'drawn', printed: r.name.trim() || '?', why: why.get(r.id)! });
    }
  }
  for (const r of rooms) if (!unprinted(r.name)) out.set(r.id, { name: r.name, src: 'printed', printed: r.name, why: 'printed on the drawing' });
  return out;
}

/** a person's names win: an empty box gives the room back its printed or suggested name */
export function applyNameEdits<T extends { id: string; name: string; nameSrc?: NameSrc; printed?: string; suggested?: string }>(rooms: T[], edits: Record<string, string>): T[] {
  for (const r of rooms) {
    const e = edits[r.id]?.trim();
    if (e) { r.name = e; r.nameSrc = 'person'; }
    else if (r.nameSrc === 'person') { r.name = r.suggested ?? r.printed ?? r.name; r.nameSrc = r.suggested ? 'drawn' : 'printed'; }
  }
  return rooms;
}

/** sheet reading order: rows top to bottom (centres within `band` of each other share a row), then left to right */
export function readingOrder(centres: { id: string; x: number; y: number }[], band: number): Map<string, number> {
  const s = [...centres].sort((p, q) => p.y - q.y), rows: (typeof centres)[] = [];
  for (const c of s) { const row = rows[rows.length - 1]; if (row && c.y - row[0].y <= band) row.push(c); else rows.push([c]); }
  const out = new Map<string, number>(); let i = 0;
  for (const row of rows) for (const c of row.sort((p, q) => p.x - q.x)) out.set(c.id, i++);
  return out;
}
