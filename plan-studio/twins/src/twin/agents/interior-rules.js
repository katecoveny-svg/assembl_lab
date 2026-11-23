// The interior design agent's rules (roster agent 8). Plain script with no imports and no browser, so the ops page, the 3D page and
// the tests run the same rules. This file is kept twice, byte for byte: architecture/js/agents/interior-rules.js (the ops page) and
// plan-studio/twins/src/twin/agents/interior-rules.js (the 3D page's build). tests/architecture/interior-agent.test.mjs checks the
// two are the same.
//
// What it does: for each room of a project (its name, its area, and its shape when the plan or the model gives one), it proposes a
// fit-out from the library: which pieces, how many, and where, laid out by rules first: the room's use from its name, clearances,
// a clear way round, the doors kept clear, and for a large hall a choice of layouts (banquet, conference, exhibition, lounge).
// A model is asked only for judgement (a style brief, the finishes, which of the allowed layouts suits a room): applyJudgement()
// takes only those choices and nothing else. It never takes a position, a size or a count from a model.
// Every number carries where it came from. Every placement is "proposed": a person moves it in 3D and a person approves it.
// What it is not: a code check, an accessibility check, or a designer's sign-off.

export const RULES_VERSION = 'interior-rules 2026-11-23a';
export const PROPOSAL_TYPE = 'assembl.interior-proposal.v1';
export const SOURCES = ['written', 'read', 'scaled', 'from the survey', 'from the file', 'set by a person', 'assumed', 'proposed'];

/** clearances in metres. All assumed: common planning allowances for a first layout, not a building code or access check */
export const CLEAR = Object.freeze({
  wallGap: { m: 0.05, src: 'assumed', what: 'gap between a piece and the wall behind it' },
  walk: { m: 0.9, src: 'assumed', what: 'a clear way past furniture' },
  door: { m: 0.9, src: 'assumed', what: 'kept clear on each side of a door' },
  slider: { m: 0.6, src: 'assumed', what: 'kept clear in front of a wide sliding or stacking door (wider than 1.2 m), on each side' },
  bedSide: { m: 0.6, src: 'assumed', what: 'beside a bed, to get in and make it' },
  bedFoot: { m: 0.75, src: 'assumed', what: 'at the foot of a bed' },
  chairBack: { m: 0.9, src: 'assumed', what: 'from a table edge to a wall, to pull a chair out and pass' },
  sofaTable: { m: 0.45, src: 'assumed', what: 'from a sofa to its coffee table' },
  hallEdge: { m: 1.2, src: 'assumed', what: 'a clear way round the edge of a hall' },
  banquetAisle: { m: 0.9, src: 'assumed', what: 'between the backs of chairs at banquet tables' },
  crossAisle: { m: 1.5, src: 'assumed', what: 'a main aisle across a banquet layout' },
  exhibitAisle: { m: 1.8, src: 'assumed', what: 'between exhibition islands, for people standing and passing' },
  loungeGap: { m: 1.2, src: 'assumed', what: 'between lounge groups' },
  stage: { m: 3.0, src: 'assumed', what: 'kept clear at the stage end of a conference layout' },
  rowPitch: { m: 0.95, src: 'assumed', what: 'from one row of conference chairs to the next' },
  seatPitch: { m: 0.55, src: 'assumed', what: 'from one conference chair to the next in a row' },
});
/** a hall big enough for event layouts. Assumed thresholds: a "hall" smaller than this is a corridor */
export const EVENT_HALL = Object.freeze({ minArea: 40, minSide: 5, src: 'assumed' });

export const FUNCTIONS = ['living', 'dining', 'living-dining', 'kitchen', 'bedroom', 'bathroom', 'study', 'outdoor', 'event-hall', 'meeting', 'circulation', 'service', 'unknown'];
/** the layouts each use of a room may take; the first is the rules' own choice */
export const LAYOUTS = Object.freeze({
  living: ['conversation', 'compact'], dining: ['table'], 'living-dining': ['split'], bedroom: ['bed'], study: ['reading'],
  'event-hall': ['banquet', 'conference', 'exhibition', 'lounge'], meeting: ['boardroom'],
  kitchen: ['none'], bathroom: ['none'], outdoor: ['none'], circulation: ['none'], service: ['none'], unknown: ['none'],
});
/** the catalogue roles each use draws on (procedural pieces only: built in code, no files) */
export const ROLES = ['sofa', 'armchair', 'coffee_table', 'rug', 'floor_lamp', 'dining_table', 'banquet_table', 'dining_chair', 'bed', 'bedside', 'sideboard', 'sculpture', 'vase', 'pendant'];

// ---- geometry: plan boxes in metres (x and z), the same shapes as library/fit.ts -------------------------------------------------
export const boxOf = (x, z, w, d, rot = 0) => {
  const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot)), hx = (w * c + d * s) / 2, hz = (w * s + d * c) / 2;
  return { x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz };
};
export const overlaps = (a, b, eps = 0) => a.x0 < b.x1 - eps && a.x1 > b.x0 + eps && a.z0 < b.z1 - eps && a.z1 > b.z0 + eps;
export const inside = (b, r, eps = 0.01) => b.x0 >= r.x0 - eps && b.x1 <= r.x1 + eps && b.z0 >= r.z0 - eps && b.z1 <= r.z1 + eps;
const W = (b) => b.x1 - b.x0, D = (b) => b.z1 - b.z0;
const r3 = (v) => Math.round(v * 1000) / 1000;

/** the use of a room from its name (and, for a hall, its size). Returns one of FUNCTIONS */
export function roomFunction(name, box = null, area = null) {
  const n = String(name ?? '').toLowerCase().trim();
  const a = Number.isFinite(area) ? area : box ? W(box) * D(box) : null;
  const minSide = box ? Math.min(W(box), D(box)) : null;
  const big = a != null && a >= EVENT_HALL.minArea && (minSide == null || minSide >= EVENT_HALL.minSide);
  if (/wardrobe|\bw\/?r\b|\bwir\b|robe|pantry|linen|cupboard|\bstore|storage|laundry|l'?dry|garage|plant room|cleaner|\bcpd\b|\bdb\b/.test(n)) return 'service';
  if (/foyer|atrium|function|auditorium|ballroom|gallery|exhibition|wharekai|whare kai|wharenui|event|banquet/.test(n)) return big ? 'event-hall' : 'circulation';
  if (/\bhall\b|hallway|corridor|passage|entry|entrance|landing|lobby|vestibule|porch/.test(n)) return big ? 'event-hall' : 'circulation';
  if (/meeting|board ?room|conference|seminar/.test(n)) return 'meeting';
  if (/(lounge|living|family).*(dining)|dining.*(lounge|living)/.test(n)) return 'living-dining';
  if (/lounge|living|family|sitting/.test(n)) return 'living';
  if (/dining/.test(n)) return 'dining';
  if (/kitchen|scullery/.test(n)) return 'kitchen';
  if (/bath|ensuite|en-suite|shower|\bwc\b|toilet|powder/.test(n)) return 'bathroom';
  if (/bed|master|guest|nursery/.test(n)) return 'bedroom';
  if (/study|office|library|den/.test(n)) return 'study';
  if (/deck|garden|outdoor|patio|terrace|courtyard|balcony/.test(n)) return 'outdoor';
  return 'unknown';
}

/** the catalogue pieces the rules use, by role: procedural first, not legacy */
export function pieceFor(catalogue, role) {
  const list = (catalogue ?? []).filter((c) => c.role === role && c.source === 'procedural' && c.status !== 'legacy');
  const c = list[0];
  return c ? { id: c.id, role, w: c.dims.w / 1000, d: c.dims.d / 1000, h: c.dims.h / 1000, fit: c.fit, finishes: (c.finishes ?? []).map((f) => f.id) } : null;
}

// ---- layouts: each returns placements { role, x, z, rot, on?, rule } inside the box b (or none, with the reason) --------------------
// rot: turn about y (radians); a piece's front faces its +z turned by rot: 0 faces +z, PI faces -z, PI/2 faces +x, -PI/2 faces -x
const P = Math.PI;
const put = (role, x, z, rot, rule, on, group) => ({ role, x, z, rot, rule, ...(on ? { on } : {}), ...(group ? { group } : {}) });

/** the ways to stand a piece's back to a wall of box b: each wall, centred and slid along it in 300 mm steps, facing into the room */
function againstWalls(b, p, gap = CLEAR.wallGap.m) {
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, out = [];
  const walls = [
    { wall: 'north', x: cx, z: b.z0 + gap + p.d / 2, rot: 0, run: W(b), depth: D(b), ax: 'x' },
    { wall: 'south', x: cx, z: b.z1 - gap - p.d / 2, rot: P, run: W(b), depth: D(b), ax: 'x' },
    { wall: 'west', x: b.x0 + gap + p.d / 2, z: cz, rot: P / 2, run: D(b), depth: W(b), ax: 'z' },
    { wall: 'east', x: b.x1 - gap - p.d / 2, z: cz, rot: -P / 2, run: D(b), depth: W(b), ax: 'z' },
  ].sort((a, c) => c.run - a.run);
  for (const k of [0, 1, -1, 2, -2, 3, -3, 4, -4]) for (const w of walls) {
    const sh = k * 0.3;
    if (Math.abs(sh) * 2 > w.run - p.w - 2 * gap + 1e-9) continue;
    out.push({ ...w, x: w.ax === 'x' ? w.x + sh : w.x, z: w.ax === 'z' ? w.z + sh : w.z, shift: sh });
  }
  return out;
}
/** a point at distance t in front of a wall position (along the way it faces) */
const ahead = (s, t) => ({ x: s.x + Math.sin(s.rot) * t, z: s.z + Math.cos(s.rot) * t });
const side = (s, t) => ({ x: s.x + Math.cos(s.rot) * t, z: s.z - Math.sin(s.rot) * t });

function living(b, K, full = true) {
  const out = [], sofa = K.sofa, ct = K.coffee_table, rug = K.rug, chair = K.armchair, lamp = K.floor_lamp;
  if (!sofa || !ct) return { tries: [], why: 'the library has no sofa or coffee table' };
  const tries = [];
  for (const s of againstWalls(b, sofa)) {
    if (s.run < sofa.w + 2 * CLEAR.wallGap.m) continue;
    const need = sofa.d + CLEAR.sofaTable.m + ct.d + (full && chair ? 0.6 + chair.d : 0) + CLEAR.walk.m * (full ? 0 : 1);
    if (s.depth < need) continue;
    const t = ahead(s, sofa.d / 2 + CLEAR.sofaTable.m + ct.d / 2);
    const one = [put('sofa', s.x, s.z, s.rot, `back to the ${s.wall} wall`), put('coffee_table', t.x, t.z, s.rot, `${CLEAR.sofaTable.m} m in front of the sofa`)];
    if (rug) one.push(put('rug', t.x, t.z, s.rot, 'under the coffee table'));
    if (full && chair) {
      const a = ahead(s, sofa.d / 2 + CLEAR.sofaTable.m + ct.d + 0.6 + chair.d / 2);
      for (const k of [-1, 1]) { const q = side({ ...a, rot: s.rot }, k * (chair.w / 2 + 0.15)); one.push(put('armchair', q.x, q.z, s.rot + P, 'facing the sofa across the table')); }
    }
    if (lamp) { const q = side(s, sofa.w / 2 + lamp.w / 2 + 0.1); one.push(put('floor_lamp', q.x, q.z, s.rot, 'at the end of the sofa')); }
    tries.push(one);
  }
  return { tries, why: tries.length ? '' : 'the room is too small for the sofa and its table with a way past' };
}
function dining(b, K) {
  const t = K.dining_table, c = K.dining_chair;
  if (!t || !c) return { tries: [], why: 'the library has no dining table or chair' };
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, tries = [];
  for (const rot of W(b) >= D(b) ? [0, P / 2] : [P / 2, 0]) {
    const along = rot === 0 ? W(b) : D(b), across = rot === 0 ? D(b) : W(b);
    if (along < t.w + 2 * CLEAR.chairBack.m || across < t.d + 2 * CLEAR.chairBack.m) continue;
    tries.push([put('dining_table', cx, cz, rot, 'centred, chairs pulled out clear of the walls'), ...chairsRound({ x: cx, z: cz, rot }, t, c, along >= t.w + 2 * CLEAR.chairBack.m + 0.6)]);
  }
  return { tries, why: tries.length ? '' : `the room is too small for a ${t.w} m table with ${CLEAR.chairBack.m} m to pull a chair out` };
}
/** chairs round a table at (x, z, rot): 0.6 m a place along each long side, one at each end when asked */
function chairsRound(at, t, c, ends) {
  const out = [], per = Math.max(1, Math.floor(t.w / 0.6)), step = t.w / per, off = t.d / 2 + c.d / 2 + 0.01;
  const ux = Math.cos(at.rot), uz = -Math.sin(at.rot), vx = Math.sin(at.rot), vz = Math.cos(at.rot); // along the table, across it
  for (let i = 0; i < per; i++) {
    const a = -t.w / 2 + step * (i + 0.5);
    out.push(put('dining_chair', at.x + ux * a - vx * off, at.z + uz * a - vz * off, at.rot, 'at the table'));
    out.push(put('dining_chair', at.x + ux * a + vx * off, at.z + uz * a + vz * off, at.rot + P, 'at the table'));
  }
  if (ends) for (const k of [-1, 1]) { const e = t.w / 2 + c.d / 2 + 0.01; out.push(put('dining_chair', at.x + ux * e * k, at.z + uz * e * k, at.rot + (k < 0 ? P / 2 : -P / 2), 'at the end of the table')); }
  return out;
}
function bedroom(b, K) {
  const bed = K.bed, bs = K.bedside;
  if (!bed) return { tries: [], why: 'the library has no bed' };
  const tries = [];
  for (const s of againstWalls(b, bed)) {
    if (s.run < bed.w + 2 * CLEAR.bedSide.m || s.depth < bed.d + CLEAR.bedFoot.m) continue;
    const one = [put('bed', s.x, s.z, s.rot, `headboard to the ${s.wall} wall`)];
    if (bs && s.run >= bed.w + 2 * Math.max(bs.w, CLEAR.bedSide.m)) for (const k of [-1, 1]) {
      const back = { x: s.x - Math.sin(s.rot) * (bed.d / 2 - bs.d / 2), z: s.z - Math.cos(s.rot) * (bed.d / 2 - bs.d / 2) };
      const q = side({ ...back, rot: s.rot }, k * (bed.w / 2 + bs.w / 2 + 0.02));
      one.push(put('bedside', q.x, q.z, s.rot, 'beside the bed head'));
    }
    tries.push(one);
  }
  return { tries, why: tries.length ? '' : `the room is too small for the bed with ${CLEAR.bedSide.m} m each side and ${CLEAR.bedFoot.m} m at its foot` };
}
function study(b, K) {
  const c = K.armchair, lamp = K.floor_lamp;
  if (!c) return { tries: [], why: 'the library has no armchair' };
  const tries = [];
  for (const s of againstWalls(b, c)) {
    if (s.depth < c.d + CLEAR.walk.m) continue;
    const one = [put('armchair', s.x, s.z, s.rot, `back to the ${s.wall} wall, facing into the room`)];
    if (lamp) for (const k of [1, -1]) { const q = side(s, k * (c.w / 2 + lamp.w / 2 + 0.05)); one.push(put('floor_lamp', q.x, q.z, s.rot, 'beside the chair')); break; }
    tries.push(one);
  }
  return { tries, why: tries.length ? '' : 'the room is too small for a chair with a way past' };
}
/** a grid of units of size uw × ud across box b, with gaps gx and gz between them, inside an edge band */
function grid(b, uw, ud, gx, gz, edge) {
  const iw = W(b) - 2 * edge, id = D(b) - 2 * edge;
  const nx = Math.floor((iw + gx) / (uw + gx)), nz = Math.floor((id + gz) / (ud + gz));
  if (nx < 1 || nz < 1) return [];
  const sx = b.x0 + edge + (iw - (nx * uw + (nx - 1) * gx)) / 2 + uw / 2, sz = b.z0 + edge + (id - (nz * ud + (nz - 1) * gz)) / 2 + ud / 2, out = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) out.push({ x: sx + i * (uw + gx), z: sz + j * (ud + gz), i, j, nx, nz });
  return out;
}
/** banquet: round tables of ten, chairs round each; a round table and its chairs are one group, checked as one */
export const BANQUET_SEATS = { n: 10, src: 'assumed', what: 'chairs round each 1.8 m round table' };
function banquet(b, K) {
  const t = K.banquet_table, c = K.dining_chair;
  if (!t || !c) return { tries: [], why: 'the library has no round banquet table or chair' };
  const R = t.w / 2 + c.d / 2 + 0.01, unit = 2 * (R + c.d / 2) + 0.1, out = [];
  let cells = grid(b, unit, unit, CLEAR.banquetAisle.m, CLEAR.banquetAisle.m, CLEAR.hallEdge.m);
  // a main aisle down the middle when there are four columns or more: the middle column is left out
  if (cells.length && cells[0].nx >= 4) { const mid = Math.floor(cells[0].nx / 2); cells = cells.filter((q) => q.i !== mid); }
  cells.forEach((q, k) => {
    const g = `table ${k + 1}`;
    out.push(put('banquet_table', q.x, q.z, 0, 'round banquet table in rows', undefined, g));
    for (let i = 0; i < BANQUET_SEATS.n; i++) {
      const a = (i / BANQUET_SEATS.n) * 2 * P, x = q.x + Math.sin(a) * R, z = q.z + Math.cos(a) * R;
      out.push(put('dining_chair', x, z, a + P, 'round the banquet table', undefined, g));
    }
  });
  return { tries: out.length ? [out] : [], why: out.length ? '' : 'the hall is too small for a round table with its way round' };
}
/** the stage end of a hall: the short wall furthest from the doors (assumed; a person may choose another) */
export function stageEnd(b, doors = [], asked = '') {
  const walls = W(b) >= D(b) ? ['west', 'east'] : ['north', 'south'];
  if (['north', 'south', 'east', 'west'].includes(asked)) return { wall: asked, src: 'set by a person' };
  const mid = { west: [b.x0, (b.z0 + b.z1) / 2], east: [b.x1, (b.z0 + b.z1) / 2], north: [(b.x0 + b.x1) / 2, b.z0], south: [(b.x0 + b.x1) / 2, b.z1] };
  const far = (w) => Math.min(Infinity, ...doors.map((d) => Math.hypot((d.x0 + d.x1) / 2 - mid[w][0], (d.z0 + d.z1) / 2 - mid[w][1])));
  const pick = doors.length ? walls.sort((p, q) => far(q) - far(p))[0] : walls[0];
  return { wall: pick, src: 'assumed' };
}
/** conference: rows of chairs facing the stage end, a centre aisle, the stage zone kept clear */
function conference(b, K, opts = {}) {
  const c = K.dining_chair;
  if (!c) return { tries: [], why: 'the library has no chair' };
  const st = opts.stage ?? stageEnd(b), e = CLEAR.hallEdge.m, out = [];
  // work in the stage's own frame: s runs from the stage into the room, t across it
  const ax = st.wall === 'west' || st.wall === 'east', len = ax ? W(b) : D(b), wid = ax ? D(b) : W(b);
  const s0 = CLEAR.stage.m, s1 = len - e, half = (wid - 2 * e - CLEAR.crossAisle.m) / 2;
  const perSide = Math.floor((half + 0.1) / CLEAR.seatPitch.m), rows = Math.floor((s1 - s0 - c.d) / CLEAR.rowPitch.m) + 1;
  if (perSide < 1 || rows < 1) return { tries: [], why: 'the hall is too small for rows of chairs with a stage end and aisles' };
  const face = { west: -P / 2, east: P / 2, north: P, south: 0 }[st.wall]; // chairs face the stage
  const at = (s, t) => {
    if (st.wall === 'west') return { x: b.x0 + s, z: b.z0 + t };
    if (st.wall === 'east') return { x: b.x1 - s, z: b.z0 + t };
    if (st.wall === 'north') return { x: b.x0 + t, z: b.z0 + s };
    return { x: b.x0 + t, z: b.z1 - s };
  };
  for (let r = 0; r < rows; r++) {
    const s = s0 + c.d / 2 + r * CLEAR.rowPitch.m;
    for (let k = 0; k < perSide; k++) for (const sgn of [-1, 1]) {
      const t = wid / 2 + sgn * (CLEAR.crossAisle.m / 2 + c.w / 2 + k * CLEAR.seatPitch.m), p = at(s, t);
      out.push(put('dining_chair', p.x, p.z, face, `row ${r + 1}, facing the stage at the ${st.wall} end`));
    }
  }
  return { tries: [out], why: '', stage: st };
}
function exhibition(b, K) {
  const plinth = K.sideboard, deco = ['sculpture', 'vase'].map((r) => K[r]).filter(Boolean);
  if (!plinth) return { tries: [], why: 'the library has no low cabinet to show pieces on' };
  const out = [];
  const cells = grid(b, plinth.w, plinth.d + 0.6, CLEAR.exhibitAisle.m, CLEAR.exhibitAisle.m, CLEAR.hallEdge.m);
  cells.forEach((q, k) => {
    out.push(put('sideboard', q.x, q.z, (q.j % 2) * P, 'exhibition island, set out with aisles to stand and pass'));
    const d = deco[k % Math.max(1, deco.length)];
    if (d) out.push(put(d.role, q.x, q.z, (q.j % 2) * P, 'shown on the island', 'sideboard'));
  });
  return { tries: out.length ? [out] : [], why: out.length ? '' : 'the hall is too small for an exhibition island with its aisles' };
}
function lounge(b, K) {
  const sofa = K.sofa, ct = K.coffee_table, chair = K.armchair, rug = K.rug;
  if (!sofa || !ct || !chair) return { tries: [], why: 'the library has no sofa, coffee table or armchair' };
  const uw = Math.max(sofa.w, rug ? rug.w : 0), ud = sofa.d + CLEAR.sofaTable.m + ct.d + 0.6 + chair.d, out = [];
  for (const q of grid(b, uw, ud, CLEAR.loungeGap.m, CLEAR.loungeGap.m, CLEAR.hallEdge.m)) {
    const s = { x: q.x, z: q.z - ud / 2 + sofa.d / 2, rot: 0 }, t = ahead(s, sofa.d / 2 + CLEAR.sofaTable.m + ct.d / 2), a = ahead(s, sofa.d / 2 + CLEAR.sofaTable.m + ct.d + 0.6 + chair.d / 2);
    out.push(put('sofa', s.x, s.z, 0, 'lounge group'), put('coffee_table', t.x, t.z, 0, 'lounge group'));
    if (rug) out.push(put('rug', t.x, t.z, 0, 'under the lounge group'));
    for (const k of [-1, 1]) { const p = side({ ...a, rot: 0 }, k * (chair.w / 2 + 0.15)); out.push(put('armchair', p.x, p.z, P, 'lounge group, facing the sofa')); }
  }
  return { tries: out.length ? [out] : [], why: out.length ? '' : 'the hall is too small for a lounge group with its way round' };
}
function boardroom(b, K) {
  const t = K.dining_table, c = K.dining_chair;
  if (!t || !c) return { tries: [], why: 'the library has no table or chair' };
  const long = W(b) >= D(b), along = long ? W(b) : D(b), across = long ? D(b) : W(b), rot = long ? 0 : P / 2;
  const n = Math.floor((along - 2 * (CLEAR.chairBack.m + c.d)) / t.w);
  if (n < 1 || across < t.d + 2 * CLEAR.chairBack.m) return { tries: [], why: 'the room is too small for a table with chairs pulled out' };
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, out = [];
  for (let i = 0; i < n; i++) {
    const a = (i - (n - 1) / 2) * t.w, x = cx + (long ? a : 0), z = cz + (long ? 0 : -a);
    out.push(put('dining_table', x, z, rot, 'tables end to end'), ...chairsRound({ x, z, rot }, t, c, false));
  }
  // one chair at each end of the run
  const e = (n * t.w) / 2 + c.d / 2 + 0.01;
  for (const k of [-1, 1]) out.push(put('dining_chair', cx + (long ? e * k : 0), cz + (long ? 0 : -e * k), rot + (k < 0 ? P / 2 : -P / 2), 'at the head of the table'));
  return { tries: [out], why: '' };
}
const LAYOUT_FN = { conversation: (b, K) => living(b, K, true), compact: (b, K) => living(b, K, false), table: dining, bed: bedroom, reading: study, banquet, conference, exhibition, lounge, boardroom };

/** split an open-plan living and dining room along its long side: dining at one end, living at the other */
function splitBoxes(b) {
  if (W(b) >= D(b)) { const m = b.x0 + W(b) * 0.45; return [{ ...b, x1: m }, { ...b, x0: m }]; }
  const m = b.z0 + D(b) * 0.45; return [{ ...b, z1: m }, { ...b, z0: m }];
}

// ---- the checks every placement must pass -----------------------------------------------------------------------------------------
const LOW = new Set(['rug']);
/** may this placement stand here: in the room, clear of the walls, the doors' clear zones and what is already placed */
export function checkPlace(pl, piece, room, walls = [], doors = [], taken = []) {
  const bx = boxOf(pl.x, pl.z, piece.w, piece.d, pl.rot);
  if (![pl.x, pl.z, pl.rot].every(Number.isFinite)) return { ok: false, why: 'not a number', box: bx };
  if (!inside(bx, room)) return { ok: false, why: 'it would stand outside the room', box: bx };
  if (walls.some((w) => overlaps(bx, w, 0.005))) return { ok: false, why: 'it would go through a wall', box: bx };
  if (pl.on) return { ok: true, why: '', box: bx }; // shown on another piece: that piece was checked
  if (!LOW.has(pl.role) && doors.some((d) => overlaps(bx, d, 0.005))) return { ok: false, why: `it would stand in a door's ${CLEAR.door.m} m clear zone`, box: bx };
  if (!LOW.has(pl.role) && taken.some((t) => !LOW.has(t.role) && !(pl.group && t.group === pl.group) && overlaps(bx, t.box, 0.005))) return { ok: false, why: 'another piece is already there', box: bx };
  return { ok: true, why: '', box: bx };
}
/** the clear zone of a door: its width, CLEAR.door metres out on each side of its wall. A door drawn open (its box is not thin:
 *  the leaf stands out into a room) already marks its swing: the zone is that box and DOOR_OPEN metres round it */
export const DOOR_OPEN = { m: 0.3, src: 'assumed' };
export function doorZone(d) {
  const t = CLEAR.door.m;
  if (Math.min(W(d), D(d)) > 0.3) return { x0: d.x0 - DOOR_OPEN.m, x1: d.x1 + DOOR_OPEN.m, z0: d.z0 - DOOR_OPEN.m, z1: d.z1 + DOOR_OPEN.m };
  const k = Math.max(W(d), D(d)) > 1.2 ? CLEAR.slider.m : t;
  return W(d) >= D(d) ? { x0: d.x0, x1: d.x1, z0: d.z0 - k, z1: d.z1 + k } : { x0: d.x0 - k, x1: d.x1 + k, z0: d.z0, z1: d.z1 };
}

/** lay one layout out in a room: the first try whose every piece passes wins; the pieces that do not are listed with the reason */
export function layOut(room, layout, K, walls = [], doors = [], opts = {}) {
  const zones = doors.map(doorZone), b = room.box;
  if (layout === 'none') return { placements: [], unplaced: [], note: 'No loose furniture proposed: fixed fittings come from the drawings.' };
  let tries = [], why = '';
  const extra = {};
  if (layout === 'split') {
    const [a, c] = splitBoxes(b), d = dining(a, K), l = living(c, K, true), l2 = l.tries.length ? l : living(c, K, false);
    const dd = d.tries[0] ?? [], ll = l2.tries[0] ?? [];
    tries = dd.length || ll.length ? [[...dd, ...ll]] : [];
    why = [d.why, l2.why].filter(Boolean).join('; ');
    // also try the other way round
    const d2 = dining(c, K), l3 = living(a, K, true).tries.length ? living(a, K, true) : living(a, K, false);
    if ((d2.tries[0] ?? []).length || (l3.tries[0] ?? []).length) tries.push([...(d2.tries[0] ?? []), ...(l3.tries[0] ?? [])]);
    if (!dd.length && !(d2.tries[0] ?? []).length && K.dining_table) {
      // no room for the table in either part: the living group may use the whole room, and the table is said, not forced in
      extra.missing = [{ id: K.dining_table.id, role: 'dining_table', why: d.why || d2.why }];
      const whole = living(b, K, true), w2 = living(b, K, false);
      tries = [...whole.tries, ...w2.tries, ...tries];
    }
  } else {
    const fn = LAYOUT_FN[layout];
    if (!fn) return { placements: [], unplaced: [], note: `There is no rule for a "${layout}" layout.` };
    const st = layout === 'conference' ? stageEnd(b, doors, opts.stage) : null;
    ({ tries, why } = fn(b, K, { stage: st }));
    if (st) extra.stage = st;
  }
  let best = null;
  for (const t of tries) {
    const taken = [], placed = [], left = [];
    for (const pl of t) {
      const piece = K[pl.role];
      const c = checkPlace(pl, piece, b, walls, zones, taken);
      if (c.ok) { taken.push({ role: pl.role, group: pl.group, box: c.box }); placed.push({ ...pl, box: c.box }); } else left.push({ ...pl, why: c.why });
    }
    // an item shown on a piece that did not make it goes too
    const hosts = new Set(placed.filter((p) => !p.on).map((p) => p.role));
    const keep = placed.filter((p) => !p.on || hosts.has(p.on)), lost = placed.filter((p) => p.on && !hosts.has(p.on)).map((p) => ({ ...p, why: 'what it stands on could not be placed' }));
    const score = keep.length - left.length * 2;
    if (!best || score > best.score) best = { score, placed: keep, left: [...left, ...lost] };
    if (!left.length && !lost.length) break;
  }
  if (!best) return { placements: [], unplaced: [], note: why || 'Nothing could be laid out here.' };
  const conv = (p) => {
    const k = K[p.role];
    return { id: k.id, role: p.role, x: r3(p.x), z: r3(p.z), rot: r3(((p.rot % (2 * P)) + 3 * P) % (2 * P) - P), w: k.w, d: k.d, h: k.h, ...(p.on ? { on: p.on } : {}), ...(p.group ? { group: p.group } : {}), rule: p.rule, src: 'proposed' };
  };
  const { missing = [], ...more } = extra;
  return { placements: best.placed.map(conv), unplaced: [...best.left.map((p) => ({ id: K[p.role].id, role: p.role, why: p.why })), ...missing], note: '', ...more };
}

/** the items and how many of each, from placements and the pieces that could not be placed */
export function itemsOf(placements, unplaced = []) {
  const m = new Map();
  for (const p of [...placements, ...unplaced]) { const k = `${p.id}|${p.role}`; m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m].map(([k, qty]) => { const [id, role] = k.split('|'); return { id, role, qty }; }).sort((a, b) => a.id.localeCompare(b.id));
}

/** with no room shape (an IFC summary gives names and areas only): what the room's use usually takes, as counts, none placed */
const AREA_ONLY = {
  living: [['sofa', 1], ['coffee_table', 1], ['rug', 1], ['armchair', 2], ['floor_lamp', 1]],
  'living-dining': [['sofa', 1], ['coffee_table', 1], ['rug', 1], ['dining_table', 1], ['dining_chair', 6]],
  dining: [['dining_table', 1], ['dining_chair', 6]], bedroom: [['bed', 1], ['bedside', 2]], study: [['armchair', 1], ['floor_lamp', 1]],
  meeting: [['dining_table', 2], ['dining_chair', 10]],
};

/**
 * The proposal for a project's rooms.
 *   rooms: [{ name, box?: {x0,x1,z0,z1} (metres), box_src?, area_m2?, area_src?, y? }]
 *   catalogue: the library's items (catalogue.ts CATALOGUE or catalogue.json items)
 *   opts: { walls?: Box[], doors?: Box[], choices?: { [room name]: layout }, finishes?: { [role]: finish id }, style?: {...}, project?, prompt? }
 */
export function propose(rooms, catalogue, opts = {}) {
  const K = Object.fromEntries(ROLES.map((r) => [r, pieceFor(catalogue, r)]).filter(([, v]) => v));
  const out = [];
  for (const r of rooms ?? []) {
    const box = r.box && [r.box.x0, r.box.x1, r.box.z0, r.box.z1].every(Number.isFinite) && W(r.box) > 0 && D(r.box) > 0 ? r.box : null;
    const area = Number.isFinite(r.area_m2) ? r.area_m2 : box ? r3(W(box) * D(box)) : null;
    const fn = roomFunction(r.name, box, Number.isFinite(r.area_m2) ? r.area_m2 : null), allowed = LAYOUTS[fn];
    const chosen = opts.choices?.[r.name] && allowed.includes(opts.choices[r.name]) ? opts.choices[r.name] : allowed[0];
    const base = { name: String(r.name ?? ''), function: fn, area_m2: area, area_src: Number.isFinite(r.area_m2) ? (r.area_src || 'from the file') : box ? (r.box_src || 'scaled') : null, box: box ? { x0: r3(box.x0), x1: r3(box.x1), z0: r3(box.z0), z1: r3(box.z1) } : null, box_src: box ? (r.box_src || 'scaled') : null, y: Number.isFinite(r.y) ? r.y : 0, layouts_available: allowed, layout: chosen, layout_by: opts.choices?.[r.name] && allowed.includes(opts.choices[r.name]) ? (opts.choice_by || 'model judgement') : 'rules' };
    const layouts = {};
    if (!box) {
      const list = (AREA_ONLY[fn] ?? []).filter(([role]) => K[role]).flatMap(([role, n]) => Array.from({ length: n }, () => ({ id: K[role].id, role, why: 'no room shape yet: placed when the model opens in 3D' })));
      layouts[chosen] = { items: itemsOf([], list), qty_src: list.length ? 'assumed' : null, placements: [], unplaced: list, note: list.length ? 'Counts are what this use of room usually takes (assumed), not measured: the file gives the room’s name and area, not its shape.' : 'No loose furniture proposed.' };
    } else {
      for (const l of fn === 'event-hall' ? allowed : [chosen]) {
        const g = layOut({ ...r, box }, l, K, opts.walls ?? [], opts.doors ?? [], { stage: opts.stages?.[r.name] });
        layouts[l] = { items: itemsOf(g.placements, g.unplaced), qty_src: 'proposed', placements: g.placements, unplaced: g.unplaced, note: g.note, ...(g.stage ? { stage: g.stage } : {}) };
      }
    }
    out.push({ ...base, layouts });
  }
  return {
    type: PROPOSAL_TYPE, v: 1, project: opts.project ?? null, status: 'proposed', approval: null,
    versions: { rules: RULES_VERSION, catalogue: opts.catalogueVersion ?? null, prompt: opts.prompt ?? null },
    style: opts.style ?? null, finishes: opts.finishes ?? {}, clearances: Object.fromEntries(Object.entries(CLEAR).map(([k, v]) => [k, { m: v.m, src: v.src }])),
    rooms: out,
    says: 'Proposed by the interior agent from the library, laid out by rules. Every piece is a proposal for the client and architect to move; a person approves it. Not a code or access check.',
  };
}

/** a proposal's totals: pieces placed and still to place, over each room's chosen layout */
export function totals(p) {
  let placed = 0, left = 0;
  for (const r of p?.rooms ?? []) { const L = r.layouts?.[r.layout]; placed += L?.placements?.length ?? 0; left += L?.unplaced?.length ?? 0; }
  return { rooms: p?.rooms?.length ?? 0, placed, left };
}

// ---- validation: a proposal is checked before it is shown, kept or handed on ---------------------------------------------------------
/** the problems with a proposal, as sentences; an empty list means it may go on. geometry: { walls, doors } to check again */
export function validateProposal(p, catalogue, geometry = {}) {
  const errs = [], ids = new Set((catalogue ?? []).map((c) => c.id)), num = (v) => typeof v === 'number' && Number.isFinite(v);
  if (!p || typeof p !== 'object') return ['not a proposal'];
  if (p.type !== PROPOSAL_TYPE || p.v !== 1) errs.push('wrong type or version');
  if (!p.versions?.rules) errs.push('no rules version');
  if (!['proposed', 'approved'].includes(p.status)) errs.push(`status "${p.status}" is not proposed or approved`);
  if (p.status === 'approved' && !(p.approval && String(p.approval.by ?? '').trim() && p.approval.at)) errs.push('approved with no person named');
  if (p.status === 'proposed' && p.approval) errs.push('a proposal carries an approval');
  if (!Array.isArray(p.rooms)) return [...errs, 'no rooms'];
  const zones = (geometry.doors ?? []).map(doorZone);
  for (const r of p.rooms) {
    const at = `room "${r?.name}"`;
    if (!FUNCTIONS.includes(r?.function)) errs.push(`${at}: unknown use "${r?.function}"`);
    if (!Array.isArray(r?.layouts_available) || !r.layouts_available.includes(r.layout)) errs.push(`${at}: layout "${r?.layout}" is not one it may take`);
    if (r?.area_m2 != null && (!num(r.area_m2) || r.area_m2 <= 0 || !SOURCES.includes(r.area_src))) errs.push(`${at}: area without a number or a source`);
    if (r?.box && (!['x0', 'x1', 'z0', 'z1'].every((k) => num(r.box[k])) || !SOURCES.includes(r.box_src))) errs.push(`${at}: shape without numbers or a source`);
    for (const [name, L] of Object.entries(r?.layouts ?? {})) {
      const where = `${at}, ${name}`;
      if (!r.layouts_available?.includes(name)) errs.push(`${where}: not a layout it may take`);
      if (!Array.isArray(L?.placements) || !Array.isArray(L?.unplaced) || !Array.isArray(L?.items)) { errs.push(`${where}: missing lists`); continue; }
      if (L.placements.length && !r.box) errs.push(`${where}: placed with no room shape`);
      const taken = [];
      for (const pl of L.placements) {
        if (!ids.has(pl.id)) { errs.push(`${where}: ${pl.id} is not in the library`); continue; }
        const cat = catalogue.find((c) => c.id === pl.id);
        if (cat.role !== pl.role) errs.push(`${where}: ${pl.id} is not a ${pl.role}`);
        if (pl.src !== 'proposed') errs.push(`${where}: ${pl.id} placed as "${pl.src}", not proposed`);
        if (![pl.x, pl.z, pl.rot, pl.w, pl.d].every(num)) { errs.push(`${where}: ${pl.id} has a position that is not a number`); continue; }
        if (Math.abs(pl.w - cat.dims.w / 1000) > 0.001 || Math.abs(pl.d - cat.dims.d / 1000) > 0.001) errs.push(`${where}: ${pl.id} size is not the library's`);
        if (r.box) {
          const c = checkPlace(pl, pl, r.box, geometry.walls ?? [], pl.on ? [] : zones, pl.on ? [] : taken);
          if (!c.ok) errs.push(`${where}: ${pl.id} ${c.why}`);
          if (!pl.on) taken.push({ role: pl.role, group: pl.group, box: c.box });
          if (pl.on && !L.placements.some((h) => h.role === pl.on && !h.on && overlaps(boxOf(h.x, h.z, h.w, h.d, h.rot), c.box))) errs.push(`${where}: ${pl.id} is shown on a ${pl.on} that is not under it`);
        }
      }
      for (const u of L.unplaced) { if (!ids.has(u.id)) errs.push(`${where}: ${u.id} is not in the library`); if (!String(u.why ?? '').trim()) errs.push(`${where}: ${u.id} is not placed and gives no reason`); }
      const want = itemsOf(L.placements, L.unplaced), got = [...L.items].sort((a, b) => a.id.localeCompare(b.id));
      if (JSON.stringify(want) !== JSON.stringify(got.map(({ id, role, qty }) => ({ id, role, qty })))) errs.push(`${where}: the counts do not match the pieces`);
    }
    if (!r?.layouts?.[r.layout]) errs.push(`${at}: the chosen layout is not laid out`);
  }
  return errs;
}

// ---- judgement: the one thing a model is asked ---------------------------------------------------------------------------------
export const JUDGE_PROMPTS = 'interior-judge 2026-11-23a';
const S = { type: 'string' };
const o = (properties) => ({ type: 'object', additionalProperties: false, properties, required: Object.keys(properties) });
export const JUDGE_SCHEMA = o({
  style_brief: { type: 'string', description: 'Two or three plain sentences: the feel of the fit-out, in New Zealand English' },
  finishes: { type: 'array', items: o({ role: S, finish: S }) },
  rooms: { type: 'array', items: o({ name: S, layout: S, why: S }) },
  notes: S,
});
export const JUDGE_SYSTEM = `You help assembl's interior design agent, a New Zealand architecture tool. Rules have already laid each room out; you only give judgement.
- style_brief: two or three short sentences on the feel of the fit-out for this project, from the brief and the rooms. Plain New Zealand English, no hype, no brand names.
- finishes: for each role listed with finishes, pick one finish id from its list, or leave the role out.
- rooms: for each room that has more than one layout, pick one of its layouts and say why in one short sentence. Use only the layout names given.
Never give a size, a position, a count or a code or compliance view. Leave anything you are unsure of out and say so in notes.`;

/** the text the model is given: the brief, and per room only its name, use, area and the layouts it may take */
export function judgeInput(p, brief = '', catalogue = []) {
  const roles = [...new Set((p?.rooms ?? []).flatMap((r) => Object.values(r.layouts ?? {}).flatMap((L) => (L.items ?? []).map((i) => i.id))))];
  const fin = roles.map((id) => catalogue.find((c) => c.id === id)).filter((c) => c?.finishes?.length).map((c) => ({ role: c.role, finishes: c.finishes.map((f) => f.id) }));
  return {
    brief: String(brief ?? '').slice(0, 800),
    rooms: (p?.rooms ?? []).map((r) => ({ name: r.name, use: r.function, area_m2: r.area_m2, layouts: r.layouts_available, now: r.layout })),
    finishes: fin,
  };
}
/** take from a model's answer only the choices the rules allow; everything else is dropped with the reason */
export function applyJudgement(p, j, catalogue = []) {
  const dropped = [], choices = {}, finishes = {};
  if (!j || typeof j !== 'object') return { choices, finishes, style: null, dropped: ['no answer'] };
  for (const c of Array.isArray(j.rooms) ? j.rooms : []) {
    const r = p.rooms.find((x) => x.name === c?.name);
    if (!r) { dropped.push(`room "${c?.name}" is not in the project`); continue; }
    if (!r.layouts_available.includes(c.layout)) { dropped.push(`"${c.layout}" is not a layout ${r.name} may take`); continue; }
    choices[r.name] = c.layout;
  }
  for (const f of Array.isArray(j.finishes) ? j.finishes : []) {
    const c = catalogue.find((x) => x.role === f?.role && x.source === 'procedural' && x.status !== 'legacy');
    if (!c?.finishes?.some((x) => x.id === f.finish)) { dropped.push(`finish "${f?.finish}" is not one the ${f?.role} comes in`); continue; }
    finishes[f.role] = f.finish;
  }
  const brief = typeof j.style_brief === 'string' ? j.style_brief.replace(/\s+/g, ' ').trim().slice(0, 400) : '';
  return { choices, finishes, style: brief ? { brief, src: 'model judgement' } : null, dropped };
}
