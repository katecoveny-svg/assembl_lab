// Plan of the simulated milk powder plant, in metres. One source for the model (travel distances) and the scene (where
// every SimReady model and every made-for-the-page building stands), so a tanker's drive and the drive you see match.
//   x: east (+), from the tanker bays (west) to the container dock (east)   z: south (+), towards the default camera   y: up
// Nothing here is a measured site. It is a fictional New Zealand-style powder plant, laid out the way such plants
// commonly are (milk in at one end, powder out at the other), and kept compact so it runs in a browser.
import { Path, dist } from '../../assets/twin/3/path.js';
export { Path, dist };

// ── tanker bays: drive-through, tankers face north while they unload ─────────────────────────────────────────────
export const BAYS = { x: [-74, -68, -62, -56, -50], z: -5, canopy: { x0: -78.5, x1: -45.5, z0: -15, z1: 15, h: 6.6 } };
export const HOSE = b => ({ x: BAYS.x[b] + 1.9, z: -1.2 });      // where the driver connects the hose, beside the truck
export const CAB_DOOR = b => ({ x: BAYS.x[b] + 1.6, z: -8.6 });   // the driver's door
export const STALL = k => ({ x: -74 + 6 * k, z: 36 });            // the first five tankers in the queue wait here
export const ROAD = j => ({ x: -90, z: 62 + 21 * j });             // the next three wait on the approach road
export const ENTRY = { x: -90, z: 150 }, EXIT = { x: -90, z: -140 };
export const TANKER = { gap: 10.4, speed: 4.2 };                  // truck to trailer, metres along the path; site speed m/s
export const QA_LAB = { x: -40, z: 25, w: 7, d: 5, door: { x: -42.5, z: 21.9 } };

// ── raw milk silos ───────────────────────────────────────────────────────────────────────────────────────────────
export const SILOS = [];
for (const z of [-21, -8]) for (const x of [-36, -28, -20]) SILOS.push({ x, z, r: 3.0, h: 16, base: 2.4 });

// ── evaporator hall, dryer tower, boiler house ───────────────────────────────────────────────────────────────────
export const EVAP = { x0: -9, x1: 5, z0: -28, z1: -4, h: 22 };
export const TOWER = { x0: 8, x1: 26, z0: -30, z1: -6, h: 40 };
export const STACK = { x: 29, z: -26, r: 1.3, h: 58 };
export const BAGHOUSE = { x0: 27, x1: 32, z0: -22, z1: -9, y0: 8, h: 10 };
export const BOILER = { x0: -9, x1: 7, z0: 10, z1: 24, h: 11, stack: { x: 4, z: 21, r: 0.9, h: 30 } };

// ── packing hall: two bagging lines, palletisers, the wrapper, the finished goods store and the container dock ───
export const HALL = { x0: 33, x1: 80, z0: -30, z1: 12, h: 12 };
export const BINS = [{ x: 37, z: -23 }, { x: 37, z: -13 }];         // powder bins over the baggers
export const LINES = [{ z: -23 }, { z: -13 }];
export const BELT = { x0: 41.4, x1: 52.4, seg: 2.75, top: 0.93, speed: 0.5, pitch: 0.95 }; // 4 SimReady belt sections
export const BAGGER_X = 39.6, PALLETISER_X = 55.4;
export const OUTFEED = (line, k) => ({ x: 58.8 + 2.6 * k, z: LINES[line].z });               // two pallets wait per line
export const WRAPPER = { x: 65.2, z: -18 };
export const PD = [{ x: 69.6, z: -20.2 }, { x: 69.6, z: -15.8 }, { x: 72.0, z: -20.2 }, { x: 72.0, z: -15.8 }]; // pick-up stands
export const PALLET = { w: 1.0, d: 1.21, h: 0.21 }, BAG = { w: 0.62, d: 0.42, h: 0.13 }, LAYER = 5, LAYERS = 8;

// Racking: SimReady rack_large_empty_a01 (4.0 m bay, 2.07 m deep, decks at 0.51 and 2.38 m), two high, back to back.
export const RACK = { bayW: 4, depth: 2.07, tierH: 3.01, x0: 36, bays: 8, decks: [0.51, 2.38, 3.52, 5.39] };
export const SLOT_DX = [-1.25, 0, 1.25];
export const ROWS = [{ z: -5.2, face: -1, stand: -7.55, travel: -9.2 }, { z: -3.13, face: +1, stand: -0.78, travel: 0.9 }];
export const bayX = b => RACK.x0 + RACK.bayW * (b + 0.5);
export const SLOTS = [];
ROWS.forEach((r, row) => { for (let b = 0; b < RACK.bays; b++) for (let s = 0; s < 3; s++) for (let lv = 0; lv < 4; lv++) SLOTS.push({ id: SLOTS.length, row, bay: b, s, lv, x: bayX(b) + SLOT_DX[s], z: r.z + r.face * 0.38, y: RACK.decks[lv] }); });

// container dock: trucks back a 20 ft box onto each door; eleven floor places, two pallets high = 22 pallets
export const DOORS = [{ id: 1, z: -2.6 }, { id: 2, z: 6.2 }];
export const DOOR = { w: 3.2, h: 3.4 };
export const BOX = { len: 6.1, w: 2.44, h: 2.6, x0: HALL.x1 + 0.4, places: 11, high: 2 };
export const boxPos = (door, i) => ({ x: BOX.x0 + BOX.len - 0.62 - Math.floor(i / 2) * 1.07, z: DOORS[door].z + (i % 2 ? 0.56 : -0.56) });
export const DOCK_X = 77.2;                                          // forklifts line up here before driving into a box
export const CHARGE = i => ({ x: 74.5 + i * 2.3, z: 10.2 });

// ── forklift routes: keep to the open floor (east of the racking, the aisles, the dock apron) ────────────────────
export const EAST_X = 74.6;                                          // the north-south drive between the racking and the dock
export function toSlot(p, slot, speed) {
  const r = ROWS[slot.row];
  p.to({ x: EAST_X, z: p.at.z }, speed); p.to({ x: EAST_X, z: r.travel }, speed);
  p.to({ x: slot.x, z: r.travel }, speed); p.to({ x: slot.x, z: r.stand }, speed);
  return p;
}
export function fromSlot(p, slot, speed) {
  const r = ROWS[slot.row];
  p.to({ x: slot.x, z: r.travel }, speed, true); p.to({ x: EAST_X, z: r.travel }, speed);
  return p;
}
export function toPD(p, i, speed) { const s = PD[i]; p.to({ x: EAST_X, z: p.at.z }, speed); p.to({ x: EAST_X, z: s.z }, speed); p.to({ x: s.x + 1.95, z: s.z }, speed); return p; }
export function toBox(p, door, i, speed) { const b = boxPos(door, i), z = DOORS[door].z; p.to({ x: EAST_X, z: p.at.z }, speed); p.to({ x: EAST_X, z }, speed); p.to({ x: DOCK_X, z }, speed); p.to({ x: b.x - 1.95, z: b.z }, speed * 0.6); return p; }
export const LINE_OPS = [{ x: 39.6, z: -21.4 }, { x: 39.6, z: -11.4 }];   // a bagging operator at each bagger
export const PATROL = [{ x: 54.2, z: -17.8 }, { x: 60.4, z: -17.8 }, { x: 62.6, z: -20.6 }, { x: 60.4, z: -17.8 }, { x: 54.2, z: -17.6 }, { x: 52.8, z: -15.0 }, { x: 52.8, z: -20.8 }];
