// A fictional three-bedroom timber house in Plan Studio's schema (assembl.planstudio.v1, plan-studio/js/model.js), so the
// concept page runs the real tool: the same model drives the 3D, the working drawings, the code pre-check and the exports.
// Invented for this demonstration; not any real project. Millimetres, plan x east and y north.
import { SCHEMA } from "/plan-studio/js/model.js";

const ev = { src: "demo", conf: 1, note: "Fictional sample house" };

// the levers the page and the agent can move; everything else follows from them
export const DEFAULTS = { livingWidth: 9600, deckDepth: 3000, pitch: "standard", kitchenWindow: 2400 };
export const PITCH = { low: 3900, standard: 5100, steep: 6300 };   // ridge height above floor, eaves at 2700
export const LIMITS = { livingWidth: [7200, 12000], deckDepth: [1800, 4200], kitchenWindow: [1200, 4800] };
const clamp = (v, [a, b]) => Math.min(b, Math.max(a, Math.round(+v || 0)));

export function houseProject(o = {}) {
  const k = { ...DEFAULTS, ...o };
  for (const key of Object.keys(LIMITS)) k[key] = clamp(k[key], LIMITS[key]);
  if (!PITCH[k.pitch]) k.pitch = DEFAULTS.pitch;
  const L = Math.round(k.livingWidth), B = 8400, W = L + B, H = 9000;     // living wing L wide, bedroom wing 8.4 m, 9 m deep
  const T = 140, t = 90, x = (v) => L + v;                                  // bedroom-wing coordinates from the living/bedroom wall
  const wall = (id, a, b, kind = "ext", extra = {}) => ({ id, a, b, t: kind === "ext" ? T : t, h: kind === "ext" ? 2700 : 2400, kind, mat: kind === "ext" ? "cladding-vertical" : "lining-plasterboard", ev, ...extra });
  const walls = [
    wall("W1", [0, 0], [W, 0]), wall("W2", [W, 0], [W, H]), wall("W3", [W, H], [0, H]), wall("W4", [0, H], [0, 0]),
    wall("W5", [L, 0], [L, H], "int"),
    wall("W6", [L, 3900], [W, 3900], "int"), wall("W7", [L, 5100], [W, 5100], "int"),
    wall("W8", [x(4200), 5100], [x(4200), H], "int"),
    wall("W9", [x(4800), 0], [x(4800), 3900], "int"), wall("W10", [x(2100), 0], [x(2100), 3900], "int"), wall("W11", [L, 2100], [x(2100), 2100], "int"),
  ];
  const op = (id, wallId, at, w, h, kind, extra = {}) => ({ id, wall: wallId, at, w, h, sill: kind.startsWith("door") || kind === "opening" ? 0 : (extra.sill ?? 900), kind,
    mat: extra.mat || (kind.startsWith("door") ? "door-timber" : "window-thermal"), openable: extra.openable ?? (kind === "window" ? 0.5 : 0), note: extra.note || "", ev });
  const openings = [
    op("D1", "W1", L - 1200, 1000, 2100, "door", { mat: "door-glazed", note: "Main entry" }),
    op("D2", "W5", 4500, 1000, 2100, "opening", { note: "Living to hall" }),
    op("D3", "W7", 2100, 860, 2100, "door", { note: "Bedroom 2" }), op("D4", "W7", 6300, 860, 2100, "door", { note: "Bedroom 1" }),
    op("D5", "W6", 1050, 760, 2100, "door", { note: "WC" }), op("D6", "W6", 3450, 810, 2100, "door", { note: "Bathroom" }), op("D7", "W6", 6600, 860, 2100, "door", { note: "Bedroom 3" }),
    op("D8", "W1", x(1050), 860, 2100, "door", { note: "Laundry, back door" }),
    op("G1", "W3", W - L / 2, Math.min(7200, L - 1600), 2400, "glazing", { sill: 0, openable: 0.5, mat: "door-glazed", note: "Sliders from the living room to the deck" }),
    op("N1", "W3", B - 2100, 1800, 1500, "window", { note: "Bedroom 2" }), op("N2", "W3", B - 6300, 1800, 1500, "window", { note: "Bedroom 1" }),
    op("N3", "W1", 3000, k.kitchenWindow, 1000, "window", { sill: 1100, note: "Kitchen" }), op("N4", "W1", x(3450), 900, 900, "window", { sill: 1300, openable: 1, note: "Bathroom" }),
    op("N5", "W1", x(6600), 1500, 1500, "window", { note: "Bedroom 3" }), op("N6", "W4", 3000, 2400, 2100, "window", { sill: 300, note: "Living, west" }),
    op("N7", "W2", 2000, 1200, 1500, "window", { note: "Bedroom 3, east" }), op("N8", "W2", 7000, 1200, 1500, "window", { note: "Bedroom 1, east" }),
  ];
  const room = (id, name, use, poly, extra = {}) => ({ id, name, use, poly, ev, ...extra });
  const rooms = [
    room("R1", "Living", "living", [[0, 3600], [L, 3600], [L, H], [0, H]]),
    room("R2", "Kitchen and dining", "kitchen", [[0, 0], [L, 0], [L, 3600], [0, 3600]]),
    room("R3", "Hall", "corridor", [[L, 3900], [W, 3900], [W, 5100], [L, 5100]]),
    room("R4", "Bedroom 1", "bedroom", [[x(4200), 5100], [W, 5100], [W, H], [x(4200), H]]),
    room("R5", "Bedroom 2", "bedroom", [[L, 5100], [x(4200), 5100], [x(4200), H], [L, H]]),
    room("R6", "Bedroom 3", "bedroom", [[x(4800), 0], [W, 0], [W, 3900], [x(4800), 3900]]),
    room("R7", "Bathroom", "bathroom", [[x(2100), 0], [x(4800), 0], [x(4800), 3900], [x(2100), 3900]], { fixtures: { pan: 1, basin: 1, shower: 1, bath: 1 } }),
    room("R8", "Laundry", "laundry", [[L, 0], [x(2100), 0], [x(2100), 2100], [L, 2100]], { fixtures: { tub: 1 } }),
    room("R9", "WC", "wc", [[L, 2100], [x(2100), 2100], [x(2100), 3900], [L, 3900]], { fixtures: { pan: 1, basin: 1 } }),
  ];
  const D = Math.round(k.deckDepth);
  return {
    schema: SCHEMA,
    meta: { name: "Sample house, three bedrooms", address: "Waiheke Island (fictional site)", owner: "Fictional client", designer: "assembl Plan Studio · concept for ArchiPro",
      number: "AP-001", status: "Concept · fictional", truth: "Simulated", use: "SH", storeys: 1, climateZone: 1, windZone: "high", units: "mm" },
    levels: [{ id: "L0", name: "Ground floor", z: 0 }],
    walls, openings, rooms,
    decks: [{ id: "K1", name: "North deck", poly: [[0, H], [L, H], [L, H + D], [0, H + D]], fall: 600, mat: "deck-timber", ev }],
    slab: { t: 150, mat: "slab-concrete", ev },
    roof: { type: "gable", ridge: "x", eaves: 2700, ridgeH: PITCH[k.pitch] || PITCH.standard, overhang: 450, mat: "roof-standing-seam", ev },
    site: { north: 0, ground: "grass", floorAboveGround: 600 },
    revisions: [],
    inputs: { sanitaryRatioVerified: false },
    levers: k,
  };
}
