// Where a picked piece can go in the model: pure geometry on plan boxes (metres, x and z), no three.js, so the rules
// are tested on their own (tests/architecture/library-place.test.mjs). picks.ts measures the model (walls, rooms,
// fit-out slots) into these shapes and does what plan() and dropAt() say.
//
// The one rule that is never bent: a piece is never placed through a wall. Its footprint (turned with it) must stay
// clear of every wall's box and inside a room, and clear of the pieces already placed.

export interface Box2 { x0: number; x1: number; z0: number; z1: number }
export interface Room extends Box2 { name: string; y: number }
export interface Slot {
  key: string;
  /** the fit-out role (slot_<role>, or a code-built suite's main piece) */
  role: string;
  /** the room's name in the model */
  room: string;
  x: number; y: number; z: number;
  /** turn about y (radians) of the slot: the piece's front faces its +z turned by this */
  rot: number;
  maxW?: number; maxD?: number; maxH?: number;
}
export interface Want { uid: string; id: string; role: string; w: number; d: number; h: number; room: string; fit: 'floor' | 'wall' | 'hang' | 'surface' }
export interface Placed { uid: string; id: string; slot: string; x: number; y: number; z: number; rot: number; box: Box2 }
export interface ToPlace { uid: string; id: string; why: string }

/** pieces that can stand in for one another's place in the fit-out */
export const ROLE_ALIASES: Record<string, string[]> = {
  sofa: ['sofa'], armchair: ['armchair', 'lounge_chair'], lounge_chair: ['armchair', 'lounge_chair'], dining_chair: ['dining_chair'], dining_table: ['dining_table'],
  coffee_table: ['coffee_table'], bed: ['bed'], bedside: ['bedside'], rug: ['rug'], floor_lamp: ['floor_lamp'], table_lamp: ['table_lamp'],
  pendant: ['pendant', 'pendant_linear'], pendant_linear: ['pendant_linear', 'pendant'], curtain: ['curtain'], mirror: ['mirror'], toilet: ['toilet'],
  towel_rail: ['towel_rail'], speaker: ['speaker'], guitar: ['guitar'], wardrobe: ['wardrobe'],
};

/** which of the ops page's room choices a model room's name is (fitout.ts reads names the same way) */
export function roomKind(name: string): string {
  const n = name.toLowerCase();
  if (/lounge|living|family/.test(n)) return 'Living';
  if (/dining/.test(n)) return 'Dining';
  if (/kitchen/.test(n)) return 'Kitchen';
  if (/bath|ensuite|en-suite|shower|wc|toilet|powder/.test(n)) return 'Bathroom';
  if (/bed|master|guest/.test(n)) return 'Bedroom';
  if (/study|office|library/.test(n)) return 'Study';
  if (/deck|garden|outdoor|patio|terrace|courtyard/.test(n)) return 'Outdoor';
  return '';
}

/** the plan box of a w × d footprint centred at (x, z) and turned by rot about y */
export function footprint(x: number, z: number, rot: number, w: number, d: number, pad = 0): Box2 {
  const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot));
  const hx = (w * c + d * s) / 2 + pad, hz = (w * s + d * c) / 2 + pad;
  return { x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz };
}
export const overlaps = (a: Box2, b: Box2, eps = 0) => a.x0 < b.x1 - eps && a.x1 > b.x0 + eps && a.z0 < b.z1 - eps && a.z1 > b.z0 + eps;
/** true when the box crosses any wall (touching within eps is allowed: a sofa may stand against a wall) */
export const hitsWall = (b: Box2, walls: Box2[], eps = 0.005) => walls.some((w) => overlaps(b, w, eps));
export const inside = (b: Box2, r: Box2, eps = 0.03) => b.x0 >= r.x0 - eps && b.x1 <= r.x1 + eps && b.z0 >= r.z0 - eps && b.z1 <= r.z1 + eps;
export const roomAt = (x: number, z: number, rooms: Room[]) => rooms.find((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) ?? null;
/** the rooms a footprint lies in, together: open-plan rooms meet at a line with no wall, so a piece may span two */
function within(b: Box2, rooms: Room[], eps = 0.03) {
  if (rooms.some((r) => inside(b, r, eps))) return true;
  // or it is covered by rooms that touch: check a grid of points
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
    const x = b.x0 + ((b.x1 - b.x0) * i) / 4, z = b.z0 + ((b.z1 - b.z0) * j) / 4;
    if (!rooms.some((r) => x >= r.x0 - eps && x <= r.x1 + eps && z >= r.z0 - eps && z <= r.z1 + eps)) return false;
  }
  return true;
}
/** may a piece of this footprint stand here: inside the rooms, clear of walls and of what is already placed */
export function clear(b: Box2, rooms: Room[], walls: Box2[], taken: Box2[] = []) {
  if (!within(b, rooms)) return 'it would stand outside the rooms';
  if (hitsWall(b, walls)) return 'it would go through a wall';
  if (taken.some((t) => overlaps(b, t, 0.01))) return 'another picked piece is already there';
  return '';
}

/**
 * Put each wanted piece in a fit-out place for its role, in the room asked for (any room when none was asked).
 * A piece goes in a place only when it fits the place's limits and the clear() rule; everything else is set out to be
 * placed by hand, with the reason. Hanging and surface pieces are checked on their plan footprint too.
 */
export function plan(wants: Want[], slots: Slot[], rooms: Room[], walls: Box2[]): { placed: Placed[]; toPlace: ToPlace[] } {
  const used = new Set<string>(), placed: Placed[] = [], toPlace: ToPlace[] = [];
  for (const w of wants) {
    const roles = ROLE_ALIASES[w.role] ?? [w.role];
    const cands = slots.filter((s) => roles.includes(s.role) && !used.has(s.key) && (!w.room || roomKind(s.room) === w.room));
    if (!cands.length) {
      const any = slots.some((s) => roles.includes(s.role));
      toPlace.push({ uid: w.uid, id: w.id, why: any && w.room ? `no free place for it in a ${w.room.toLowerCase()} here` : 'the model has no place for one of these' });
      continue;
    }
    let why = '';
    let done = false;
    for (const s of cands) {
      if ((s.maxW && w.w > s.maxW + 0.02) || (s.maxD && w.d > s.maxD + 0.02) || (s.maxH && w.h > s.maxH + 0.02)) { why = 'it is bigger than the place for it'; continue; }
      const box = footprint(s.x, s.z, s.rot, w.w, w.d);
      const no = w.fit === 'hang' ? (hitsWall(box, walls) ? 'it would go through a wall' : '') : clear(box, rooms, walls, placed.map((p) => p.box));
      if (no) { why = no; continue; }
      used.add(s.key);
      placed.push({ uid: w.uid, id: w.id, slot: s.key, x: s.x, y: s.y, z: s.z, rot: s.rot, box });
      done = true;
      break;
    }
    if (!done) toPlace.push({ uid: w.uid, id: w.id, why: why || 'there is no room for it there' });
  }
  return { placed, toPlace };
}

/**
 * A piece dragged into the model at (x, z): where it may stand. When the exact point is not clear (a wall, the edge of
 * the room, another piece), the nearest clear point within `reach` metres in the same room is used.
 */
export function dropAt(w: { w: number; d: number; fit?: Want['fit'] }, x: number, z: number, rot: number, rooms: Room[], walls: Box2[], taken: Box2[] = [], reach = 1.0): { ok: true; x: number; z: number; room: Room; nudged: boolean } | { ok: false; why: string } {
  const room = roomAt(x, z, rooms);
  if (!room) return { ok: false, why: 'Drop it inside a room.' };
  const test = (px: number, pz: number) => clear(footprint(px, pz, rot, w.w, w.d), rooms, walls, taken);
  if (!test(x, z)) return { ok: true, x, z, room, nudged: false };
  // spiral out in 50 mm steps
  for (let r = 0.05; r <= reach + 1e-9; r += 0.05) {
    const n = Math.max(8, Math.round((2 * Math.PI * r) / 0.05));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (roomAt(px, pz, rooms) !== room) continue;
      if (!test(px, pz)) return { ok: true, x: px, z: pz, room, nudged: true };
    }
  }
  return { ok: false, why: `It does not fit there: ${test(x, z)}.` };
}

/** the wall boxes and rooms of a plan model (assembl.plan-model.v1), in its own frame: for tests and for a model with no 3D yet */
export function planBoxes(plan: { buildings: { origin?: [number, number]; levels: { walls: { axis: 'x' | 'z'; at: number; from: number; to: number; thickness?: number }[]; partitions?: { axis: 'x' | 'z'; at: number; from: number; to: number; thickness?: number }[]; rooms: { name: string; u: number; v: number; w: number; d: number }[] }[] }[] }) {
  const walls: Box2[] = [], rooms: Room[] = [];
  for (const b of plan.buildings) {
    const [ox, oz] = b.origin ?? [0, 0], L = b.levels[0];
    for (const w of [...L.walls, ...(L.partitions ?? [])]) {
      const t = (w.thickness ?? 0.1) / 2;
      walls.push(w.axis === 'x' ? { x0: ox + w.from, x1: ox + w.to, z0: oz + w.at - t, z1: oz + w.at + t } : { x0: ox + w.at - t, x1: ox + w.at + t, z0: oz + w.from, z1: oz + w.to });
    }
    for (const r of L.rooms) rooms.push({ name: r.name, x0: ox + r.u, x1: ox + r.u + r.w, z0: oz + r.v, z1: oz + r.v + r.d, y: 0 });
  }
  return { walls, rooms };
}
