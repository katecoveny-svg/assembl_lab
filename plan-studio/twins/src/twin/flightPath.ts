// The fly-through: a list of shots (where the camera stops, how it moves between them) turned into a camera at any moment.
// Pure functions, no three.js and no page, so they are tested directly (tests/architecture/flight-path.test.mjs). The editor
// card is flightUI.ts; the film is made frame by frame from `timeline(...).at(t)`.
//
//   importShotList  an assembl.shot-list.v1 (shots with id, where, move, note, as read from an architect's hand-drawn path)
//                   becomes a flight path whose shots are not yet placed: a person places each one on the plan or model
//   timeline        the camera through the placed shots: travel at the shot's speed along a smooth curve, a dwell at each
//                   shot (with an optional pan round and tilt up and down), and an optional rise to an aerial pull-back
//   confirm         a person's initials and the time: until then the path is a proposal (drawn amber), after it is white
//   bump            a new version number each time it is saved to the project
//
// Every position says where it came from: placed by a person, or proposed by the tool. Nothing here is a measurement.

export const SHOT_LIST_SCHEMA = 'assembl.shot-list.v1';
export const FLIGHT_SCHEMA = 'assembl.flight-path.v1';
export const WALK = 1.3;          // metres a second: a slow walking pace
export const EYE = 1.6;           // eye height above the ground, metres (assumed)

export type Source = 'placed by a person' | 'proposed by the tool' | 'not placed';
export interface Shot {
  id: string;
  label: string;
  /** where it is, in words, as the shot list says */
  where: string;
  /** how the camera moves from here, in words */
  move: string;
  note: string;
  /** plan position in the scene's frame (x, z), metres; null until placed */
  x: number | null; z: number | null;
  /** eye height above the ground there, metres */
  h: number;
  /** seconds held at the shot */
  dwell: number;
  /** metres a second on the way to the next shot */
  speed: number;
  /** degrees turned (left is negative) while held at the shot, and degrees tilted up then back down */
  pan: number; tilt: number;
  /** a layout change faded in while held here (the hook: the page decides what the layout is); null for none */
  layout: string | null;
  source: Source;
}
export interface FlightPath {
  schema: typeof FLIGHT_SCHEMA;
  name: string;
  version: number;
  shots: Shot[];
  /** after the last shot: back through these shot ids in order (e.g. to the entry and out), then rise and pull back */
  finish: { via: string[]; aerial: boolean; rise: number; pull: number; secs: number };
  status: 'proposed' | 'confirmed';
  confirmed_by: string | null; confirmed_at: string | null;
  from: { schema: string; source: string; open_questions: string[]; defaults_chosen: Record<string, string> | null; notes?: string[] } | null;
  frame: string;
  updated_at: string | null;
}

const num = (v: unknown, d: number, lo: number, hi: number) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
const str = (v: unknown, max = 400) => String(v ?? '').slice(0, max);

/** a new shot, with its defaults labelled as such by the editor (dwell 0, walking pace, eye height 1.6 m assumed) */
export function newShot(id: string, o: Partial<Shot> = {}): Shot {
  return {
    id: str(id, 24) || '?', label: str(o.label ?? `Shot ${id}`, 80), where: str(o.where), move: str(o.move), note: str(o.note),
    x: o.x ?? null, z: o.z ?? null, h: num(o.h, EYE, 0.3, 120), dwell: num(o.dwell, 0, 0, 30), speed: num(o.speed, WALK, 0.2, 30),
    pan: num(o.pan, 0, -360, 360), tilt: num(o.tilt, 0, -80, 80), layout: o.layout ?? null, source: o.source ?? (o.x == null ? 'not placed' : 'placed by a person'),
  };
}

/** what the words of a shot ask for, read by rule (the person changes any of it): a pause, slow, a pan, up and down */
export function readMove(text: string): Partial<Shot> {
  const t = text.toLowerCase(), o: Partial<Shot> = {};
  const secs = /pause[^.]*?(\d+(?:\.\d+)?)\s*s/.exec(t) ?? /(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?\s+pause/.exec(t);
  if (/\bpause|\bstop|\bhold|\bdwell/.test(t)) o.dwell = secs ? Number(secs[1]) : 3;
  if (/\bslow/.test(t)) o.speed = WALK * 0.6;
  const upDown = /up\s*(?:and|\/|&)\s*down/.test(t);
  if (/pan\s+(?:round|around)|look\s+(?:round|around)|\b360\b/.test(t)) { o.pan = 120; o.dwell = Math.max(o.dwell ?? 0, 5); }
  else if (/\bpan\b/.test(t) && !upDown) { o.pan = 60; o.dwell = Math.max(o.dwell ?? 0, 3); }
  if (/up\s*(?:and|\/|&)\s*down|\bup the void|\bvoid\b/.test(t)) { o.tilt = 35; o.dwell = Math.max(o.dwell ?? 0, 4); }
  return o;
}

/** a shot list (assembl.shot-list.v1) into a flight path with unplaced shots. Throws with a reason on anything else. */
export function importShotList(json: unknown, o: { frame: string; name?: string } = { frame: '' }): FlightPath {
  const d = json as { schema?: string; shots?: unknown[]; open_questions?: unknown[]; defaults_chosen?: Record<string, unknown>; source?: unknown; name?: unknown };
  if (!d || typeof d !== 'object') throw new Error('This is not a shot list.');
  if (d.schema !== SHOT_LIST_SCHEMA) throw new Error(`A shot list says schema "${SHOT_LIST_SCHEMA}"; this one says "${String(d.schema ?? 'nothing')}".`);
  if (!Array.isArray(d.shots) || !d.shots.length) throw new Error('The shot list has no shots.');
  if (d.shots.length > 200) throw new Error('A shot list of more than 200 shots is not a fly-through.');
  const seen = new Set<string>(), notes: string[] = [];
  // an entry that is a note, not a place for the camera (id "note", or no move at all), is kept as a note
  const isNote = (s: Record<string, unknown>) => /^note/i.test(String(s.id ?? '')) || String(s.kind ?? '') === 'note';
  for (const raw of d.shots) { const s = (raw ?? {}) as Record<string, unknown>; if (isNote(s)) notes.push([s.where, s.note].filter(Boolean).map((v) => str(v, 300)).join(': ')); }
  const shots = d.shots.filter((raw) => !isNote((raw ?? {}) as Record<string, unknown>)).map((raw, i) => {
    const s = (raw ?? {}) as Record<string, unknown>;
    let id = str(s.id, 24).trim() || String(i + 1).padStart(2, '0');
    while (seen.has(id)) id += "'";
    seen.add(id);
    const words = `${str(s.move)} ${str(s.note)}`;
    return newShot(id, { label: str(s.label ?? s.title ?? `Shot ${id}`, 80), where: str(s.where), move: str(s.move), note: str(s.note), ...readMove(words) });
  });
  const dc = d.defaults_chosen && typeof d.defaults_chosen === 'object' ? Object.fromEntries(Object.entries(d.defaults_chosen).map(([k, v]) => [k, str(v, 600)])) : null;
  return {
    schema: FLIGHT_SCHEMA, name: str(o.name ?? d.name ?? 'Fly-through', 120), version: 0, shots,
    finish: { via: [], aerial: false, rise: 30, pull: 40, secs: 8 },
    status: 'proposed', confirmed_by: null, confirmed_at: null,
    from: { schema: SHOT_LIST_SCHEMA, source: str(d.source, 300), open_questions: Array.isArray(d.open_questions) ? d.open_questions.map((q) => str(q, 300)) : [], defaults_chosen: dc, notes },
    frame: o.frame, updated_at: null,
  };
}

/** an empty flight path, to place shots on by hand */
export function emptyFlight(frame: string, name = 'Fly-through'): FlightPath {
  return { schema: FLIGHT_SCHEMA, name, version: 0, shots: [], finish: { via: [], aerial: false, rise: 30, pull: 40, secs: 8 }, status: 'proposed', confirmed_by: null, confirmed_at: null, from: null, frame, updated_at: null };
}

/** a flight path read back (from the project or a file): checked field by field; throws with a reason */
export function readFlight(json: unknown): FlightPath {
  const d = json as Partial<FlightPath>;
  if (!d || d.schema !== FLIGHT_SCHEMA || !Array.isArray(d.shots)) throw new Error(`This is not a fly-through (${FLIGHT_SCHEMA}).`);
  const shots = d.shots.map((s) => newShot(String(s.id), s));
  const f = (d.finish ?? {}) as Partial<FlightPath['finish']>;
  return {
    schema: FLIGHT_SCHEMA, name: str(d.name ?? 'Fly-through', 120), version: num(d.version, 0, 0, 1e6), shots,
    finish: { via: Array.isArray(f.via) ? f.via.map((v) => str(v, 24)) : [], aerial: !!f.aerial, rise: num(f.rise, 30, 0, 500), pull: num(f.pull, 40, 0, 1000), secs: num(f.secs, 8, 1, 60) },
    status: d.status === 'confirmed' && d.confirmed_by ? 'confirmed' : 'proposed', confirmed_by: d.status === 'confirmed' ? d.confirmed_by ?? null : null, confirmed_at: d.status === 'confirmed' ? d.confirmed_at ?? null : null,
    from: d.from ?? null, frame: str(d.frame), updated_at: d.updated_at ?? null,
  };
}

/** any edit makes it a proposal again: a confirmed path is only the path a person looked at */
export function edited(fp: FlightPath): FlightPath { return { ...fp, status: 'proposed', confirmed_by: null, confirmed_at: null }; }
export function confirm(fp: FlightPath, who: string, at = new Date().toISOString()): FlightPath {
  const w = String(who ?? '').trim();
  if (!w) throw new Error('A person confirms the path: their initials.');
  const placed = fp.shots.filter((s) => s.x != null && s.z != null);
  if (placed.length < 2) throw new Error('Place at least two shots first.');
  if (placed.length < fp.shots.length) throw new Error(`${fp.shots.length - placed.length} shot${fp.shots.length - placed.length > 1 ? 's are' : ' is'} not placed yet.`);
  return { ...fp, status: 'confirmed', confirmed_by: w.slice(0, 40), confirmed_at: at };
}
export function bump(fp: FlightPath, at = new Date().toISOString()): FlightPath { return { ...fp, version: fp.version + 1, updated_at: at }; }

/** move a shot up (-1) or down (+1) the list */
export function reorder(fp: FlightPath, id: string, by: -1 | 1): FlightPath {
  const i = fp.shots.findIndex((s) => s.id === id), j = i + by;
  if (i < 0 || j < 0 || j >= fp.shots.length) return fp;
  const shots = fp.shots.slice(); [shots[i], shots[j]] = [shots[j], shots[i]];
  return edited({ ...fp, shots });
}

// --- the camera through time ------------------------------------------------------------------------------------------
type V2 = [number, number];
const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
const len = (a: V2) => Math.hypot(a[0], a[1]);
/** a centripetal Catmull–Rom point between p1 and p2 */
function cr(p0: V2, p1: V2, p2: V2, p3: V2, t: number): V2 {
  const a = 0.5, d = (p: V2, q: V2) => Math.max(1e-4, len(sub(q, p)) ** a);
  const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3), u = t1 + (t2 - t1) * t;
  const L = (p: V2, q: V2, ta: number, tb: number): V2 => { const f = (u - ta) / (tb - ta); return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]; };
  const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3), B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
  return L(B1, B2, t1, t2);
}
const smooth = (u: number) => u * u * (3 - 2 * u);

export interface Cam { eye: [number, number, number]; look: [number, number, number]; shot: string; phase: 'travel' | 'dwell' | 'finish' }
export interface Timeline {
  duration: number;
  /** when each shot is reached and left, seconds */
  marks: { id: string; arrive: number; leave: number }[];
  at(t: number): Cam;
  length: number;
}

/**
 * The camera through the placed shots (unplaced ones are skipped). ground(x, z) is the ground level there. focus is what the
 * aerial pull-back looks at (the building's centre). Between shots it travels at the leaving shot's speed, looking ahead along
 * the curve; it eases into and out of a shot it holds at. At a held shot it turns by `pan` and tilts by `tilt` and back.
 */
export function timeline(fp: FlightPath, ground: (x: number, z: number) => number, focus: [number, number, number] = [0, 0, 0]): Timeline {
  let placed = fp.shots.filter((s) => s.x != null && s.z != null);
  // the way back (finish.via): those shots again, in order, after the last
  for (const id of fp.finish.via) { const s = fp.shots.find((q) => q.id === id && q.x != null); if (s) placed = [...placed, { ...s, dwell: 0, pan: 0, tilt: 0, layout: null }]; }
  const P = placed.map((s) => [s.x!, s.z!] as V2);
  const n = P.length;
  const segs: { pts: V2[]; cum: number[]; L: number; T: number; easeA: boolean; easeB: boolean; from: number }[] = [];
  for (let i = 0; i + 1 < n; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
    const pts: V2[] = [], cum = [0];
    const m = Math.max(8, Math.ceil(len(sub(p2, p1)) * 2));
    for (let k = 0; k <= m; k++) { pts.push(cr(i === 0 ? [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]] : p0, p1, p2, i + 2 >= n ? [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]] : p3, k / m)); if (k) cum.push(cum[k - 1] + len(sub(pts[k], pts[k - 1]))); }
    const L = cum[m], easeA = i === 0 || placed[i].dwell > 0, easeB = i + 1 === n - 1 || placed[i + 1].dwell > 0;
    // easing in or out costs time: about a third more over the eased part
    const T = Math.max(0.5, (L / placed[i].speed) * (1 + (easeA ? 0.18 : 0) + (easeB ? 0.18 : 0)));
    segs.push({ pts, cum, L, T, easeA, easeB, from: i });
  }
  const along = (sg: (typeof segs)[number], d: number): V2 => {
    const x = Math.max(0, Math.min(sg.L, d));
    let lo = 0, hi = sg.cum.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (sg.cum[mid] <= x) lo = mid; else hi = mid; }
    const f = sg.cum[hi] > sg.cum[lo] ? (x - sg.cum[lo]) / (sg.cum[hi] - sg.cum[lo]) : 0;
    return [sg.pts[lo][0] + (sg.pts[hi][0] - sg.pts[lo][0]) * f, sg.pts[lo][1] + (sg.pts[hi][1] - sg.pts[lo][1]) * f];
  };
  // the time line: dwell at shot 0, travel 0→1, dwell at 1, ...
  type Piece = { kind: 'dwell'; i: number; t0: number; T: number } | { kind: 'travel'; s: number; t0: number; T: number } | { kind: 'finish'; t0: number; T: number };
  const pieces: Piece[] = [], marks: Timeline['marks'] = [];
  let t = 0;
  for (let i = 0; i < n; i++) {
    const arrive = t;
    if (placed[i].dwell > 0) { pieces.push({ kind: 'dwell', i, t0: t, T: placed[i].dwell }); t += placed[i].dwell; }
    marks.push({ id: placed[i].id, arrive, leave: t });
    if (i < segs.length) { pieces.push({ kind: 'travel', s: i, t0: t, T: segs[i].T }); t += segs[i].T; }
  }
  if (fp.finish.aerial && n) { pieces.push({ kind: 'finish', t0: t, T: fp.finish.secs }); t += fp.finish.secs; }
  const duration = t;
  const heading = (i: number): V2 => {
    // the direction the camera faces arriving at shot i (or leaving it, for the first)
    if (n < 2) return [1, 0];
    if (i > 0) { const sg = segs[i - 1], a = along(sg, sg.L - 0.6), b = along(sg, sg.L); const d = sub(b, a), l = len(d) || 1; return [d[0] / l, d[1] / l]; }
    const sg = segs[0], a = along(sg, 0), b = along(sg, 0.6); const d = sub(b, a), l = len(d) || 1; return [d[0] / l, d[1] / l];
  };
  const camAt = (x: number, z: number, h: number, dir: V2, pitch: number, shot: string, phase: Cam['phase']): Cam => {
    const y = ground(x, z) + h, c = Math.cos(pitch), ahead = 6;
    return { eye: [x, y, z], look: [x + dir[0] * ahead * c, y + Math.sin(pitch) * ahead - 0.25, z + dir[1] * ahead * c], shot, phase };
  };
  const rot = (d: V2, deg: number): V2 => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [d[0] * c - d[1] * s, d[0] * s + d[1] * c]; };
  const at = (tt: number): Cam => {
    if (!n) return { eye: [focus[0] + 20, focus[1] + 10, focus[2] + 20], look: focus, shot: '', phase: 'travel' };
    const x = Math.max(0, Math.min(duration, tt));
    let pc = pieces[pieces.length - 1];
    for (const p of pieces) if (x >= p.t0 && x <= p.t0 + p.T) { pc = p; break; }
    if (!pc) { const s = placed[0]; return camAt(s.x!, s.z!, s.h, heading(0), 0, s.id, 'dwell'); }
    const u = pc.T > 0 ? (x - pc.t0) / pc.T : 1;
    if (pc.kind === 'dwell') {
      const s = placed[pc.i], e = smooth(u);
      // pan round and back is not wanted: it turns by `pan` and stays; tilt goes up and comes back down
      return camAt(s.x!, s.z!, s.h, rot(heading(pc.i), s.pan * e), ((s.tilt * Math.PI) / 180) * Math.sin(Math.PI * u), s.id, 'dwell');
    }
    if (pc.kind === 'travel') {
      const sg = segs[pc.s], a = placed[sg.from], b = placed[sg.from + 1];
      // eased at the ends that hold; the turn a pan left behind unwinds over the first part of the way
      const e = sg.easeA && sg.easeB ? smooth(u) : sg.easeA ? (u < 0.5 ? smooth(u * 2) * 0.5 : u) : sg.easeB ? (u > 0.5 ? 0.5 + smooth((u - 0.5) * 2) * 0.5 : u) : u;
      const d = e * sg.L, p = along(sg, d), q = along(sg, Math.min(sg.L, d + 4)), r = d + 4 > sg.L && pc.s + 1 < segs.length ? along(segs[pc.s + 1], d + 4 - sg.L) : q;
      let dir = sub(r, p); const l = len(dir) || 1; dir = [dir[0] / l, dir[1] / l];
      const unwind = Math.max(0, 1 - u * 3);
      if (a.pan && unwind > 0) dir = rot(dir, a.pan * smooth(unwind));
      const h = a.h + (b.h - a.h) * e;
      return camAt(p[0], p[1], h, dir, 0, e < 0.5 ? a.id : b.id, 'travel');
    }
    // the finish: rise and pull back from the last shot, turning to look at the building
    const last = placed[n - 1], e = smooth(u), y0 = ground(last.x!, last.z!) + last.h;
    const away = sub([last.x!, last.z!], [focus[0], focus[2]]), al = len(away) || 1, dir: V2 = [away[0] / al, away[1] / al];
    const ex = last.x! + dir[0] * fp.finish.pull * e, ez = last.z! + dir[1] * fp.finish.pull * e, ey = y0 + fp.finish.rise * e;
    const fwd = heading(n - 1), lx = last.x! + fwd[0] * 6, lz = last.z! + fwd[1] * 6;
    return { eye: [ex, ey, ez], look: [lx + (focus[0] - lx) * e, y0 + (focus[1] - y0) * e, lz + (focus[2] - lz) * e], shot: last.id, phase: 'finish' };
  };
  return { duration, marks, at, length: segs.reduce((s, g) => s + g.L, 0) };
}
