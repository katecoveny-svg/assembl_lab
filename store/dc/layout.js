// Plan of the simulated grocery distribution centre, in metres. One source for the model (travel distances) and the
// scene (where every SimReady model stands), so a forklift's drive time and the drive you see are the same drive.
//   x: east (+), from the racking (west) to the dock doors (east)   z: south (+), towards the default camera   y: up
// Nothing here is a measured building. It is a fictional South Auckland DC, laid out the way ambient grocery DCs
// commonly are, and scaled down (about 72 x 40 m) so it runs in a browser.

export const HALL = { x0: -36, x1: 36, z0: -20, z1: 20, h: 11 };

// Racking: SimReady rack_large_empty_a01 (4.0 m bay, 2.07 m deep, 3.01 m tall, decks at 0.51 and 2.38 m), stacked two
// high. Deck heights below are measured from the model (pipeline notes in docs/SIMREADY-PLAN.md).
export const RACK = { bayW: 4, depth: 2.07, tierH: 3.01, x0: -32, bays: 6, decks: [0.51, 2.38, 3.52, 5.39] };
export const SLOT_DX = [-1.25, 0, 1.25];       // three pallet positions per bay
export const PALLET = { w: 1.0, d: 1.21, h: 0.21 }; // pallet_b01 turned 90°: 1.0 m face to the aisle
export const LAYER_H = 0.19, CARTONS_PER_LAYER = 10, LAYERS_FULL = 4, FULL = 40;

// Seven rows. face = the side the pallets are taken from (+1 south, -1 north). aisle = which aisle serves the row.
export const ROWS = [
  { z: -18.00, face: +1, aisle: 0 },
  { z: -12.70, face: -1, aisle: 0 }, { z: -10.63, face: +1, aisle: 1 },
  { z: -5.33, face: -1, aisle: 1 }, { z: -3.26, face: +1, aisle: 2 },
  { z: 2.04, face: -1, aisle: 2 }, { z: 4.11, face: +1, aisle: 3 },
];
export const AISLES = [-15.35, -7.98, -0.61, 6.35];     // aisle centre lines (z). Aisle 3 is the cross aisle by row G.
export const AISLE_ENTRY_X = -6.4;                      // vehicles and pickers enter every aisle from the east end
export const bayX = b => RACK.x0 + RACK.bayW * (b + 0.5);
export const slotX = (b, s) => bayX(b) + SLOT_DX[s];
export const slotZ = row => ROWS[row].z + ROWS[row].face * 0.38; // pallet centre, pushed to the aisle side of the deck

// One SKU per column (row, bay, slot): the pick face is the bottom deck, reserve is the three decks above it.
export const COLUMNS = [];
ROWS.forEach((r, row) => { for (let b = 0; b < RACK.bays; b++) for (let s = 0; s < 3; s++) COLUMNS.push({ id: COLUMNS.length, row, bay: b, slot: s, aisle: r.aisle, x: slotX(b, s), z: slotZ(row) }); });

// Where a picker or truck stands to work a column: in the aisle, beside the face.
export const faceStand = (col, off = 0.0) => ({ x: col.x, z: AISLES[col.aisle] + (ROWS[col.row].z < AISLES[col.aisle] ? -1 : 1) * off });

// ── docks ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export const DOOR_X = HALL.x1;           // east wall
export const DOOR = { w: 3.0, h: 3.2 };
export const INBOUND_DOORS = [{ id: 1, z: -16 }, { id: 2, z: -10 }];
export const ROUTES = [ // fictional store routes for Example stores; the suburbs are real places, the stores are not
  { id: 0, name: 'Papakura', door: 3, z: -2 },
  { id: 1, name: 'Manukau', door: 4, z: 4 },
  { id: 2, name: 'Pukekohe', door: 5, z: 10 },
  { id: 3, name: 'Botany', door: 6, z: 16 },
];
export const LANE = { cap: 12, x1: 29.5, pitch: 1.3, half: 0.62 }; // 2 x 6 pallet floor lane, 6.5 m in from each door
export const DOCK_AISLE_X = 33.2;   // forklifts run north-south between the lane fronts and the doors
export const lanePos = (z, i) => ({ x: LANE.x1 - Math.floor(i / 2) * LANE.pitch, z: z + (i % 2 ? LANE.half : -LANE.half) });
// A rigid truck's 8.2 m body: 12 pallets, two across, loaded from the front wall back to the doors.
export const TRAILER = { len: 8.2, w: 2.5, h: 2.6, cap: 12, pitch: 1.22, x0: HALL.x1 + 0.45, floor: 0.0 };
export const trailerPos = (z, i) => ({ x: TRAILER.x0 + TRAILER.len - 0.75 - Math.floor(i / 2) * TRAILER.pitch, z: z + (i % 2 ? 0.62 : -0.62) });

export const RECEIVE_DESK = { x: 23.0, z: -13.0 };
export const CHARGE = i => ({ x: 15.0 + i * 2.4, z: 18.3 });          // forklift chargers along the south wall
export const OP_PARK = i => ({ x: -1.6, z: -13.0 + i * 8.5 });        // order pickers wait by the rack ends

// ── wrap and label ─────────────────────────────────────────────────────────────────────────────────────────────────
export const WRAPPERS = [{ x: 8.0, z: 11.4 }, { x: 8.0, z: 15.4 }];
export const WRAP_QUEUE = (w, i) => ({ x: 4.6 - i * 2.6, z: WRAPPERS[w].z }); // pickers wait here, with the pallet
export const LABEL_STAND = w => ({ x: 9.9, z: WRAPPERS[w].z + (w === 0 ? 1.5 : -1.5) });
export const WRAP_MAST = w => (w === 0 ? -1 : 1);                     // the wrapper mast stands on the far side
export const EMPTY_STACK = { x: -2.5, z: 18.2 };
export const PICKER_HOME = i => ({ x: -1.0 + i * 1.6, z: 17.6 });

// ── tote line: small items picked into totes at row G, carried east on SimReady roller conveyor ───────────────────
export const TOTE_LINE = { z: 8.55, x0: -30.0, x1: -10.0, seg: 2.0, speed: 0.45, pitch: 0.7, top: 0.77 };
export const TOTE_BUILD = { x: -8.6, z: 10.6 };   // where totes are stacked onto a pallet for the stores
export const TOTE_PALLET = { x: -8.6, z: 12.4 };
export const TOTES_PER_PALLET = 30;               // 2 x 3 a layer, five high
export const TOTE_PICKER_HOME = i => ({ x: -28 + i * 9, z: 7.4 });

// ── block stack (not simulated): bulk drinks floor-stacked two high ───────────────────────────────────────────────
export const BLOCK = { x0: 2.0, z0: -18.4, cols: 9, rows: 5, dx: 1.35, dz: 2.15 };

// ── paths ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// A path is a list of steps. A move step goes to a point at a speed (rev: drive in reverse); a dwell step stands still
// (lift: the forks or cab go from one height to another during it). Time along a path is distance/speed plus dwells,
// so the model's service time and the scene's motion come from the same function.
const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);

export class Path {
  constructor(from, lift = 0) { this.steps = []; this.at = { x: from.x, z: from.z }; this.lift = lift; this.total = 0; this.yaw = null; }
  to(p, speed, rev = false) {
    const d = dist(this.at, p); if (d < 1e-4) return this;
    const t = d / speed; this.steps.push({ k: 'm', a: { ...this.at }, b: { x: p.x, z: p.z }, t, rev, lift: this.lift });
    this.at = { x: p.x, z: p.z }; this.total += t; return this;
  }
  via(pts, speed, rev = false) { for (const p of pts) this.to(p, speed, rev); return this; }
  wait(t, tag) { if (t > 0) { this.steps.push({ k: 'w', a: { ...this.at }, t, lift: this.lift, lift2: this.lift, tag }); this.total += t; } return this; }
  raise(h, rate, extra = 0, tag) { // lift to height h at rate m/s, plus a fixed handling time
    const t = Math.abs(h - this.lift) / rate + extra;
    this.steps.push({ k: 'w', a: { ...this.at }, t: Math.max(t, 0.01), lift: this.lift, lift2: h, tag });
    this.lift = h; this.total += Math.max(t, 0.01); return this;
  }
  length() { let d = 0; for (const s of this.steps) if (s.k === 'm') d += dist(s.a, s.b); return d; }
  // where the vehicle is at time t (seconds since the path began)
  sample(t, out = {}) {
    let yaw = out.yaw ?? 0, tt = Math.max(0, t);
    for (let i = 0; i < this.steps.length; i++) {
      const s = this.steps[i];
      if (s.k === 'm') {
        const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z;
        yaw = Math.atan2(dx, dz) + (s.rev ? Math.PI : 0);
        if (tt <= s.t) { const f = tt / s.t; out.x = s.a.x + dx * f; out.z = s.a.z + dz * f; out.yaw = yaw; out.lift = s.lift; out.moving = true; out.tag = null; out.step = i; return out; }
      } else if (tt <= s.t) {
        const f = s.t ? tt / s.t : 1; out.x = s.a.x; out.z = s.a.z; out.yaw = yaw;
        out.lift = s.lift + (s.lift2 - s.lift) * smooth(f); out.moving = false; out.tag = s.tag; out.step = i; return out;
      }
      tt -= s.t;
    }
    const last = this.steps[this.steps.length - 1];
    out.x = this.at.x; out.z = this.at.z; out.yaw = yaw; out.lift = this.lift; out.moving = false; out.tag = last ? last.tag : null; out.step = this.steps.length;
    return out;
  }
  // points still to come, for the path overlay
  remaining(t) {
    const pts = []; let tt = t;
    for (const s of this.steps) {
      if (s.k !== 'm') { tt -= s.t; continue; }
      if (tt >= s.t) { tt -= s.t; continue; }
      const f = Math.max(0, tt / s.t); if (!pts.length) pts.push({ x: s.a.x + (s.b.x - s.a.x) * f, z: s.a.z + (s.b.z - s.a.z) * f });
      pts.push(s.b); tt = 0;
    }
    return pts;
  }
}
const smooth = f => f * f * (3 - 2 * f);

// Route from anywhere in the open floor into an aisle position, keeping to the aisle ends (no driving through racks).
export function viaAisle(path, aisle, x, speed, standOff = 0) {
  const z = AISLES[aisle] + standOff;
  path.to({ x: AISLE_ENTRY_X + 1.2, z: path.at.z < z ? z - 1.4 : z + 1.4 }, speed);
  path.to({ x: AISLE_ENTRY_X, z }, speed);
  path.to({ x, z }, speed);
  return path;
}
export function outOfAisle(path, aisle, speed, rev = false) {
  const z = path.at.z;
  path.to({ x: AISLE_ENTRY_X, z }, speed, rev);
  path.to({ x: AISLE_ENTRY_X + 1.4, z: z + (z < AISLES[3] ? 1.2 : -1.2) }, speed);
  return path;
}
