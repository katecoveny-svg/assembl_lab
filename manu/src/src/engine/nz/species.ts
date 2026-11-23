// Aotearoa perching birds for the Feather engine.
//
// Each bird is one Species object (see ../bird/species.ts): body loft, feather tracts and
// their looks, wing and tail, behaviour tempo. They keep the engine's 11-section topology
// (s = 0 tail root … 10 bill base, phi = 0 belly line … 1 back line), so a tract written
// for one bird lands in the same place on another. All birds are drawn at the same
// on-screen size, like plates in a field guide; real lengths are in ./catalogue.ts.
//
// Shape: each body is a measured shell (./shell.ts) built from published measurements
// (./measured.ts: HANZAB via NZ Birds Online) and proportions read off photographs; the
// feather tracts and colours are art-directed from field-guide descriptions and photographs.
// Not scans. docs/manu/proportions.md lists every number and its source.

import { MOUNTAIN_GEM, type FeatherLook, type Section, type Species, type Tract } from '../bird/species';
import { MEASURED } from './measured';
import { shell, type ShellDef } from './shell';

type Look = Partial<FeatherLook> & Pick<FeatherLook, 'base' | 'tip'>;

/** A matte contour feather, filled in with sensible defaults. */
function look(l: Look): FeatherLook {
  return {
    width: 0.03,
    aspect: 2.2,
    rowStep: 0.29,
    tilt: 12,
    lift: 1,
    cup: 0.3,
    round: 0.7,
    loose: 0.4,
    fuzz: 0.3,
    iri: 0xffffff,
    iriGraze: 0xffffff,
    iriStrength: 0,
    iriPower: 4,
    iriAlign: 0,
    jitter: 0.45,
    ...l,
  };
}

/**
 * A body for this bird, worked from the mountain-gem's hand-tuned loft (so the curvature
 * stays as smooth as his) by the measures that make a silhouette: how far the body leans
 * from upright, torso length, girth and width, neck length, head size and tilt, face length.
 * Returns the sections plus the shoulder and hip points carried along with the torso.
 */
interface Shape {
  /** degrees the torso leans forward from the mountain-gem's near-upright posture */
  tilt?: number;
  length?: number;
  girth?: number;
  width?: number;
  neck?: number;
  head?: number;
  /** degrees the head is raised back toward level (birds hold the head level as they lean) */
  headLevel?: number;
  face?: number;
  /** raise the whole body (longer legs), units */
  lift?: number;
}

function shape(sh: Shape) {
  const H = MOUNTAIN_GEM.sections.map((x) => ({ ...x }));
  const L = sh.length ?? 1;
  const G = sh.girth ?? 1;
  const W = sh.width ?? 1;
  const N = sh.neck ?? 1;
  const HS = sh.head ?? 1;
  const F = sh.face ?? 1;
  const tilt = ((sh.tilt ?? 0) * Math.PI) / 180;
  const level = (((sh.headLevel ?? (sh.tilt ?? 0) * 0.75) * Math.PI) / 180);
  const pivot = { y: H[2].y, z: H[2].z };
  const out = H.map((x) => ({ ...x }));
  // torso: stretch along its length about the hips, fill out its girth
  for (let i = 0; i <= 5; i++) {
    out[i].y = pivot.y + (H[i].y - pivot.y) * L;
    out[i].z = pivot.z + (H[i].z - pivot.z) * L;
    out[i].rd = H[i].rd * G;
    out[i].rv = H[i].rv * G;
    out[i].w = H[i].w * W;
  }
  // neck from the shoulders, head from the neck, face from the crown
  const d5 = { y: out[5].y - H[5].y, z: out[5].z - H[5].z };
  out[6].y = out[5].y + (H[6].y - H[5].y) * N;
  out[6].z = out[5].z + (H[6].z - H[5].z) * N;
  out[6].w = H[6].w * lerp(W, HS, 0.5);
  out[6].rd = H[6].rd * lerp(G, HS, 0.5);
  out[6].rv = H[6].rv * lerp(G, HS, 0.5);
  for (let i = 7; i <= 10; i++) {
    const k = i >= 9 ? F : 1;
    const ref = i >= 9 ? H[8] : H[6];
    const at = i >= 9 ? out[8] : out[6];
    out[i].y = at.y + (H[i].y - ref.y) * HS * k;
    out[i].z = at.z + (H[i].z - ref.z) * HS * k;
    out[i].w = H[i].w * HS;
    out[i].rd = H[i].rd * HS;
    out[i].rv = H[i].rv * HS;
  }
  void d5;
  // lean: the whole body tips forward about the hips, the head comes back toward level
  const rot = (p: { y: number; z: number }, c: { y: number; z: number }, a: number) => {
    const dy = p.y - c.y;
    const dz = p.z - c.z;
    // a positive angle tips the axis from up toward forward (+Z)
    p.z = c.z + dz * Math.cos(a) + dy * Math.sin(a);
    p.y = c.y - dz * Math.sin(a) + dy * Math.cos(a);
  };
  const shoulder = { y: MOUNTAIN_GEM.wing.shoulder[1], z: MOUNTAIN_GEM.wing.shoulder[2] };
  shoulder.y = pivot.y + (shoulder.y - pivot.y) * L;
  shoulder.z = pivot.z + (shoulder.z - pivot.z) * L;
  for (const p of out) {
    rot(p, pivot, tilt);
    p.a -= (tilt * 180) / Math.PI;
  }
  rot(shoulder, pivot, tilt);
  const neckC = { y: out[6].y, z: out[6].z };
  for (let i = 7; i <= 10; i++) {
    rot(out[i], neckC, -level);
    out[i].a += (level * 180) / Math.PI;
  }
  out[6].a += (level * 90) / Math.PI;
  // keep the belly where it was over the feet
  const vent = (i: number) => out[i].y - out[i].rv * Math.cos((out[i].a * Math.PI) / 180);
  const ref = Math.min(H[1].y - H[1].rv * Math.cos((H[1].a * Math.PI) / 180), H[2].y - H[2].rv * Math.cos((H[2].a * Math.PI) / 180));
  const dy = ref - Math.min(vent(1), vent(2)) + (sh.lift ?? 0);
  for (const p of out) p.y += dy;
  shoulder.y += dy;
  return {
    sections: out as Section[],
    shoulder: [MOUNTAIN_GEM.wing.shoulder[0] * W, shoulder.y, shoulder.z] as [number, number, number],
    hip: [MOUNTAIN_GEM.legs.hip[0] * W, MOUNTAIN_GEM.legs.hip[1] + (sh.lift ?? 0), MOUNTAIN_GEM.legs.hip[2]] as [number, number, number],
    length: L,
  };
}

/** per-channel mix of two sRGB hex colours */
function mixHex(a: number, b: number, t: number) {
  const ch = (x: number, sh: number) => (x >> sh) & 255;
  const m = (sh: number) => Math.round(ch(a, sh) + (ch(b, sh) - ch(a, sh)) * t) << sh;
  return m(16) | m(8) | m(0);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const base = MOUNTAIN_GEM;

/** Start from the engine's bird and swap in what makes this one itself. */
function bird(s: Partial<Species> & Pick<Species, 'name' | 'looks' | 'tracts'> & { body: Shape }): Species {
  const out = structuredClone(base) as Species;
  const { body, ...rest } = s;
  const sh = shape(body);
  const wing = { ...out.wing, ...(s.wing ?? {}) };
  wing.shoulder = sh.shoulder;
  wing.upper *= sh.length;
  wing.fore *= sh.length;
  wing.hand *= sh.length;
  return {
    ...out,
    ...rest,
    sections: sh.sections,
    wing,
    tail: { ...out.tail, ...(s.tail ?? {}) },
    legs: { ...out.legs, ...(s.legs ?? {}), hip: s.legs?.hip ?? sh.hip, perchRadius: out.legs.perchRadius },
    behaviour: { ...out.behaviour, ...(s.behaviour ?? {}) },
  };
}

/**
 * A bird whose body is its measured shell (./shell.ts). The wing, tail, legs, bill and eye take
 * their sizes from the same measurements, so they stay in proportion with the body.
 */
type MeasuredSpec = Omit<Partial<Species>, 'eye' | 'bill'> & Pick<Species, 'name' | 'looks' | 'tracts'> & { eye: Omit<Species['eye'], 'radius'>; bill: Pick<Species['bill'], 'color'> };

function measured(key: string, def: ShellDef, s: MeasuredSpec): Species {
  const out = structuredClone(base) as Species;
  const sh = shell(MEASURED[key], def);
  const wing = { ...out.wing, ...(s.wing ?? {}) };
  wing.shoulder = sh.shoulder;
  wing.upper = base.wing.upper * sh.wingScale;
  wing.fore = base.wing.fore * sh.wingScale;
  wing.hand = base.wing.hand * sh.wingScale;
  // spread wing: chord = hand + 0.92 of the outer primary (as wingBlur draws it); a songbird's
  // inner primaries and secondaries are much longer than a hummingbird's
  const outer = Math.max((sh.chord - wing.hand) / 0.92, 0.2);
  wing.primaryLen = [outer * 0.62, outer];
  wing.secondaryLen = [outer * 0.6, outer * 0.55];
  wing.primaryWidth = base.wing.primaryWidth * sh.wingScale;
  wing.secondaryWidth = base.wing.secondaryWidth * sh.wingScale;
  wing.rest = { ...wing.rest, width: wing.rest.width.map((w) => w * sh.bodyScale) as [number, number, number], height: wing.rest.height * sh.bodyScale };
  wing.chord = sh.chord;
  // tail coverts reach a third of the way down the tail above and below: what makes the body
  // run on into the tail in a side view instead of the tail sticking out of a ball
  const looks = { ...s.looks };
  const tl = sh.tail.length[0];
  const cover = (name: string, frac: number, aspect: number) => {
    const l = looks[name];
    if (l && l.width * l.aspect < frac * tl) looks[name] = { ...l, aspect, width: (frac * tl) / aspect, loose: Math.min(l.loose ?? 0.4, 0.3), tilt: Math.min(l.tilt, 6) };
  };
  cover('undertail', 0.28, 3.2);
  cover('covert', 0.2, 3.0);
  // contour feathers: a little finer than the hummingbird's scales, and with less difference
  // between a feather's base and its tip, so the coat reads as soft plumage, not as scales
  for (const name of ['body', 'belly', 'flank', 'back', 'scapular', 'breast', 'throat', 'head', 'face', 'band', 'saddle', 'gold']) {
    const l = looks[name];
    if (!l) continue;
    looks[name] = { ...l, width: l.width * 0.85, base: mixHex(l.base, l.tip, 0.25), tip: mixHex(l.tip, l.base, 0.25) };
  }
  return {
    ...out,
    ...s,
    looks,
    sections: sh.sections,
    eye: { ...s.eye, radius: sh.eyeRadius },
    bill: { ...s.bill, ...sh.bill },
    wing,
    tail: { ...out.tail, ...(s.tail ?? {}), length: sh.tail.length, width: sh.tail.width, droop: sh.tail.droop },
    legs: { ...out.legs, ...(s.legs ?? {}), hip: sh.heelPoint, spread: sh.legs.spread, toe: sh.legs.toe, thick: sh.legs.thick, perchRadius: out.legs.perchRadius },
    behaviour: { ...out.behaviour, ...(s.behaviour ?? {}) },
    // songbird and pigeon heads are sleek: no hummingbird haircut, small feathers at the bill
    scruff: s.scruff ?? 0.15,
    faceTaper: s.faceTaper ?? 0.45,
  };
}

/** Tracts most songbirds share; species add their marks after these (later entries win). */
function coat(extra: Tract[]): Tract[] {
  return [
    { name: 'belly', look: 'belly', region: { kind: 'band', s: [0, 4.6], phi: [0, 0.45], soft: 0.6 } },
    { name: 'flank', look: 'flank', region: { kind: 'band', s: [1.2, 4.4], phi: [0.3, 0.52], soft: 0.5 } },
    { name: 'back', look: 'back', region: { kind: 'band', s: [0.9, 6.3], phi: [0.55, 1] } },
    { name: 'scapular', look: 'scapular', region: { kind: 'band', s: [3.7, 5.6], phi: [0.56, 0.84], soft: 0.3 } },
    { name: 'wingPit', look: 'down', region: { kind: 'blob', at: [3.8, 0.44], r: [0.3, 0.035], soft: 0.5 } },
    { name: 'tailCoverts', look: 'covert', region: { kind: 'band', s: [0, 1.15], phi: [0, 1] } },
    { name: 'undertail', look: 'undertail', region: { kind: 'band', s: [0, 1.35], phi: [0, 0.4], soft: 0.3 } },
    { name: 'breast', look: 'breast', region: { kind: 'band', s: [4.3, 6.4], phi: [0, 0.42], soft: 0.5 } },
    { name: 'throat', look: 'throat', region: { kind: 'band', s: [6.2, 8.4], phi: [0, 0.38], soft: 0.4 } },
    { name: 'head', look: 'head', region: { kind: 'band', s: [6.3, 11], phi: [0.36, 1], soft: 0.3 } },
    { name: 'face', look: 'face', region: { kind: 'blob', at: [8.6, 0.35], r: [1.4, 0.3], soft: 0.3 } },
    ...extra,
  ];
}

const songbirdBehaviour = {
  breathHz: [1.9, 3.2] as [number, number],
  holdCalm: [0.7, 2.6] as [number, number],
  holdAlert: [0.3, 1.1] as [number, number],
  saccade: [0.05, 0.0005] as [number, number],
  neckShare: [0.28, 0.32] as [number, number],
  blinkEvery: [2.2, 6.5] as [number, number],
  ruffleEvery: [40, 90] as [number, number],
  tailEvery: [3, 8] as [number, number],
  wingEvery: [8, 18] as [number, number],
  billUp: 6,
};


// Proportions read off side-on photographs (see docs/manu/proportions.md): posture, torso depth
// and width, head height, where the head sits, tail and heel angles. Lengths come from MEASURED.
const SHELL: Record<string, ShellDef> = {
  tui: { posture: 58, depth: 0.7, width: 0.8, headH: 0.72, headW: 0.85, headPitch: 8, neck: [0.1, 0.2], billDepth: 0.3, billDroop: 0.14, eye: 0.17, tailDroop: 70, tailShape: [1, 0.94], tailWidth: 0.19, heel: 25, cover: 0.45, toe: 0.7 },
  korimako: { posture: 30, depth: 0.7, width: 0.82, headH: 0.8, headW: 0.85, headPitch: 4, neck: [0.15, 0.25], billDepth: 0.31, billDroop: 0.1, eye: 0.2, tailDroop: 15, tailShape: [0.96, 1], tailWidth: 0.2, heel: 30, cover: 0.5, toe: 0.7 },
  piwakawaka: { posture: 34, depth: 0.95, width: 0.85, headH: 1.05, headW: 0.9, headPitch: 0, neck: [0.05, 0.2], billDepth: 0.45, billDroop: 0.03, eye: 0.25, tailDroop: 48, tailShape: [1, 0.85], tailWidth: 0.17, heel: 20, cover: 0.55, toe: 0.7, torso: 1.3 },
  tauhou: { posture: 35, depth: 0.78, width: 0.85, headH: 0.9, headW: 0.9, headPitch: 2, neck: [0.1, 0.25], billDepth: 0.35, billDroop: 0.08, eye: 0.23, tailDroop: 35, tailShape: [1, 1], tailWidth: 0.2, heel: 25, cover: 0.5, toe: 0.7 },
  miromiro: { posture: 25, depth: 0.8, width: 0.9, headH: 1.1, headW: 0.95, headPitch: 0, neck: [0.05, 0.3], billDepth: 0.4, billDroop: 0.04, eye: 0.22, tailDroop: 15, tailShape: [1, 1], tailWidth: 0.2, heel: 25, cover: 0.5, toe: 0.75 },
  toutouwai: { posture: 60, depth: 0.7, width: 0.82, headH: 0.92, headW: 0.88, headPitch: 0, neck: [0.1, 0.4], billDepth: 0.33, billDroop: 0.04, eye: 0.22, tailDroop: 62, tailShape: [1, 0.97], tailWidth: 0.2, heel: 15, cover: 0.25, toe: 0.7 },
  hihi: { posture: 22, depth: 0.82, width: 0.82, headH: 0.8, headW: 0.85, headPitch: 4, neck: [0.12, 0.25], billDepth: 0.3, billDroop: 0.12, eye: 0.18, tailDroop: -8, tailShape: [1, 0.95], tailWidth: 0.19, heel: 30, cover: 0.5, toe: 0.7 },
  kereru: { posture: 50, depth: 0.6, width: 0.85, headH: 0.86, headW: 0.8, headPitch: 8, neck: [0.1, 1.1], billDepth: 0.42, billDroop: 0.1, eye: 0.14, tailDroop: 55, tailShape: [0.92, 1], tailWidth: 0.2, heel: 20, cover: 0.7, toe: 1.0, shoulder: 0.5 },
};

// ---------------------------------------------------------------------------------------
/** Tūī, Prosthemadera novaeseelandiae. Near-black, with a blue-green-violet sheen that comes
 * and goes, a lacy white collar on the neck, two white throat tufts (poi), a white wing patch. */
export const TUI: Species = measured('tui', SHELL.tui, {
  name: 'Prosthemadera novaeseelandiae',
  seed: 2201,
  eye: { s: 7.85, phi: 0.56, inset: 0.84 },
  bill: { color: 0x0a0a0b },
  skin: 0x141110,
  shading: { flank: 0.75, under: 0.7, patch: 0.25, gold: 0x5a3c14, goldAmount: 0.3 },
  looks: {
    body: look({ width: 0.0252, base: 0x0b0c10, tip: 0x181b21, iri: 0x2a5a96, iriGraze: 0x5a2a86, iriStrength: 0.2, iriPower: 6, sparkle: 0.5 }),
    belly: look({ width: 0.0277, aspect: 2.5, rowStep: 0.24, lift: 0.95, loose: 0.5, base: 0x120e0b, tip: 0x261e17, iri: 0x2a4a5a, iriGraze: 0x3a2a4a, iriStrength: 0.07, sparkle: 0.6 }),
    flank: look({ width: 0.0302, aspect: 2.8, rowStep: 0.24, lift: 1.0, loose: 0.61, base: 0x160f09, tip: 0x2f2216, iri: 0x3a4a3a, iriGraze: 0x4a3a2a, iriStrength: 0.04 }),
    down: look({ width: 0.04, aspect: 2.6, tilt: 26, lift: 1.4, loose: 1, base: 0x161210, tip: 0x302824 }),
    back: look({ width: 0.0252, base: 0x140f0a, tip: 0x302416, iri: 0x3a7a3a, iriGraze: 0x8a5a1a, iriStrength: 0.19, iriPower: 7, loose: 0.32, sparkle: 0.45 }),
    scapular: look({ width: 0.0353, aspect: 3.3, rowStep: 0.24, tilt: 18, lift: 0.8, base: 0x130f0b, tip: 0x2c2318, iri: 0x3a8a4a, iriGraze: 0x7a5a1a, iriStrength: 0.18, iriPower: 6 }),
    breast: look({ width: 0.0252, aspect: 2.0, rowStep: 0.3, loose: 0.29, base: 0x0a0b0e, tip: 0x15171d, iri: 0x2a64a6, iriGraze: 0x6a3ab0, iriStrength: 0.21, iriPower: 6, iriAlign: 0.2, iriAim: [0, -0.2, 1], sparkle: 0.5 }),
    throat: look({ width: 0.022, aspect: 1.9, rowStep: 0.32, loose: 0.35, base: 0x08090c, tip: 0x13151b, iri: 0x2a70b6, iriGraze: 0x7a3ad0, iriStrength: 0.28, iriPower: 7, iriAlign: 0.3, iriAim: [0, -0.3, 1], sparkle: 0.45 }),
    head: look({ width: 0.018, aspect: 1.8, rowStep: 0.34, lift: 0.45, loose: 0.27, fuzz: 0.2, base: 0x08090d, tip: 0x13161c, iri: 0x2a8a9a, iriGraze: 0x6a3aa0, iriStrength: 0.25, iriPower: 7, sparkle: 0.4 }),
    face: look({ width: 0.014, aspect: 1.6, rowStep: 0.3, tilt: 7, lift: 0.2, loose: 0.43, fuzz: 0.5, base: 0x060607, tip: 0x0e0f12, iri: 0x2a5a8a, iriGraze: 0x3a2a6a, iriStrength: 0.1 }),
    // the lacy collar: fine filaments, dark with pale grey-white shafts showing through
    lace: look({ width: 0.0045, aspect: 8, rowStep: 0.2, tilt: 10, lift: 0.7, cup: 0.05, round: 0.15, loose: 1, fuzz: 0.6, base: 0x0b0c0f, tip: 0x6e706e, jitter: 1 }),
    // poi: two round, curled white tufts at the throat
    poi: look({ width: 0.02, aspect: 2.6, rowStep: 0.1, tilt: 72, lift: 2, cup: 1, round: 0.4, loose: 1, fuzz: 1, base: 0xc8c7c0, tip: 0xfdfcf7, jitter: 1.1 }),
    covert: look({ width: 0.0386, aspect: 2.6, rowStep: 0.33, tilt: 9, lift: 0.7, loose: 0.29, base: 0x130f0b, tip: 0x2a2014, iri: 0x3a7a4a, iriGraze: 0x6a5a2a, iriStrength: 0.14, iriPower: 6 }),
    undertail: look({ width: 0.04, aspect: 2.9, rowStep: 0.26, tilt: 10, lift: 0.8, loose: 0.5, base: 0x100e0d, tip: 0x221e1a }),
    wingCovert: look({ width: 0.03, aspect: 2.3, rowStep: 0.4, tilt: 7, lift: 0, round: 0.8, loose: 0.22, fuzz: 0, base: 0x101012, tip: 0x202026, iri: 0x3a5a8a, iriGraze: 0x4a3a6a, iriStrength: 0.16, iriPower: 6, sparkle: 0.5 }),
  },
  tracts: coat([
    { name: 'lace', look: 'lace', region: { kind: 'band', s: [5.5, 6.4], phi: [0.66, 0.97], soft: 0.9 } },
    { name: 'poi', look: 'poi', region: { kind: 'blob', at: [6.85, 0.07], r: [0.36, 0.042], soft: 0.25 } },
  ]),
  wing: { ...base.wing, color: 0x151412, sheen: 0x3a3c52, bar: { rows: [0.66, 1], v: [-0.1, 0.7], base: 0xc8c8c2, tip: 0xf4f4ee } },
  tail: { ...base.tail, rectrices: 6, color: 0x121418 },
  legs: { ...base.legs, color: 0x141110 },
  behaviour: { ...songbirdBehaviour, billUp: 8 },
});

/** Korimako, bellbird, Anthornis melanura (male). Olive green, a violet gloss on the forehead
 * and face, dark wings with a pale yellow patch at the bend, a red eye. */
export const KORIMAKO: Species = measured('korimako', SHELL.korimako, {
  name: 'Anthornis melanura',
  seed: 2202,
  eye: { s: 7.85, phi: 0.56, inset: 0.84, iris: 0xb3221c },
  bill: { color: 0x111010 },
  skin: 0x2a2620,
  shading: { flank: 0.8, under: 0.85, patch: 0.22, gold: 0x6a6420, goldAmount: 0.25 },
  looks: {
    body: look({ width: 0.0252, base: 0x1e240c, tip: 0x3a441a, iri: 0x6a8a2a, iriGraze: 0x8a7a2a, iriStrength: 0.06 }),
    belly: look({ width: 0.0277, aspect: 2.5, rowStep: 0.24, lift: 0.95, loose: 0.54, base: 0x34381a, tip: 0x6c6c3a }),
    flank: look({ width: 0.0302, aspect: 2.8, rowStep: 0.24, lift: 1.0, loose: 0.61, base: 0x30361a, tip: 0x5e6230 }),
    down: look({ width: 0.04, aspect: 2.6, tilt: 26, lift: 1.4, loose: 1, base: 0x2a2a1a, tip: 0x4a4a30 }),
    back: look({ width: 0.0252, base: 0x283012, tip: 0x4c5a22, iri: 0x5a7a2a, iriGraze: 0x6a6a1a, iriStrength: 0.08, loose: 0.32 }),
    scapular: look({ width: 0.0353, aspect: 3.3, rowStep: 0.24, tilt: 18, lift: 0.8, base: 0x262c12, tip: 0x485420 }),
    breast: look({ width: 0.0252, aspect: 2.1, loose: 0.43, base: 0x2c3116, tip: 0x565e30 }),
    throat: look({ width: 0.022, aspect: 1.9, rowStep: 0.32, loose: 0.36, base: 0x2c3015, tip: 0x5a6230 }),
    head: look({ width: 0.018, aspect: 1.8, rowStep: 0.34, lift: 0.45, loose: 0.29, fuzz: 0.2, base: 0x1a200e, tip: 0x343f1a, iri: 0x5a3aa8, iriGraze: 0x2a5aa8, iriStrength: 0.22, iriPower: 5, sparkle: 0 }),
    face: look({ width: 0.014, aspect: 1.6, rowStep: 0.3, tilt: 7, lift: 0.2, loose: 0.4, fuzz: 0.4, base: 0x181c10, tip: 0x2e3420, iri: 0x6a3ac0, iriGraze: 0x2a4ab0, iriStrength: 0.18, iriPower: 5, sparkle: 0 }),
    covert: look({ width: 0.0386, aspect: 2.6, rowStep: 0.33, tilt: 9, lift: 0.7, loose: 0.29, base: 0x2a3214, tip: 0x56622a }),
    undertail: look({ width: 0.04, aspect: 2.9, rowStep: 0.26, tilt: 10, lift: 0.8, loose: 0.54, base: 0x4a4a2a, tip: 0x8a8a5a }),
    wingCovert: look({ width: 0.03, aspect: 2.3, rowStep: 0.4, tilt: 7, lift: 0, round: 0.8, loose: 0.22, fuzz: 0, base: 0x1a1c12, tip: 0x343a20 }),
  },
  tracts: coat([]),
  wing: { ...base.wing, color: 0x1a1a14, sheen: 0x3a4a2a, bar: { rows: [0, 0.3], v: [0.2, 1.02], base: 0xb8b060, tip: 0xe8e0a0 } },
  tail: { ...base.tail, rectrices: 6, color: 0x1a1c14 },
  legs: { ...base.legs, color: 0x3a3428 },
  behaviour: { ...songbirdBehaviour, billUp: 7 },
});

/** Pīwakawaka, fantail, Rhipidura fuliginosa (pied form). Grey-brown head with a white brow,
 * white throat over a black band, warm buff underparts, a long tail with white outer feathers. */
export const PIWAKAWAKA: Species = measured('piwakawaka', SHELL.piwakawaka, {
  name: 'Rhipidura fuliginosa',
  seed: 2203,
  eye: { s: 7.85, phi: 0.56, inset: 0.84 },
  bill: { color: 0x0d0c0c },
  skin: 0x2a2420,
  shading: { flank: 0.82, under: 0.9, patch: 0.2, gold: 0x6a5020, goldAmount: 0.1 },
  looks: {
    body: look({ width: 0.0252, base: 0x2a241c, tip: 0x544838 }),
    belly: look({ width: 0.0277, aspect: 2.5, rowStep: 0.24, lift: 1.0, loose: 0.58, base: 0x6a4a28, tip: 0xc89a5e }),
    flank: look({ width: 0.0302, aspect: 2.8, rowStep: 0.24, lift: 1.0, loose: 0.61, base: 0x5a3e22, tip: 0xae7e48 }),
    down: look({ width: 0.04, aspect: 2.6, tilt: 26, lift: 1.4, loose: 1, base: 0x4a3a2a, tip: 0x8a6a4a }),
    back: look({ width: 0.0252, base: 0x2a2418, tip: 0x544a34, loose: 0.36 }),
    scapular: look({ width: 0.0353, aspect: 3.3, rowStep: 0.24, tilt: 18, lift: 0.8, base: 0x282216, tip: 0x4e4430 }),
    breast: look({ width: 0.0252, aspect: 2.1, loose: 0.47, base: 0x6a4a2a, tip: 0xc29660 }),
    band: look({ width: 0.0218, aspect: 2.0, loose: 0.32, base: 0x0b0a0a, tip: 0x1a1816 }),
    throat: look({ width: 0.02, aspect: 1.9, rowStep: 0.32, loose: 0.5, fuzz: 0.6, base: 0xbab4a8, tip: 0xf2eee4 }),
    head: look({ width: 0.018, aspect: 1.8, rowStep: 0.34, lift: 0.5, loose: 0.32, fuzz: 0.25, base: 0x26221e, tip: 0x4a443c }),
    face: look({ width: 0.014, aspect: 1.6, rowStep: 0.3, tilt: 7, lift: 0.2, loose: 0.43, fuzz: 0.4, base: 0x16140f, tip: 0x2a2620 }),
    stripe: look({ width: 0.012, aspect: 2.6, rowStep: 0.24, tilt: 6, lift: 0.2, cup: 0.15, round: 0.5, loose: 0.95, fuzz: 1, base: 0xb4b1aa, tip: 0xf2f0ea }),
    covert: look({ width: 0.0386, aspect: 2.6, rowStep: 0.33, tilt: 9, lift: 0.7, loose: 0.29, base: 0x221c14, tip: 0x3e3426 }),
    undertail: look({ width: 0.04, aspect: 2.9, rowStep: 0.26, tilt: 10, lift: 0.8, loose: 0.58, base: 0x8a6a40, tip: 0xd8b07a }),
    wingCovert: look({ width: 0.03, aspect: 2.3, rowStep: 0.4, tilt: 7, lift: 0, round: 0.8, loose: 0.22, fuzz: 0, base: 0x1c1814, tip: 0x342c22 }),
  },
  tracts: coat([
    { name: 'band', look: 'band', region: { kind: 'band', s: [5.55, 6.2], phi: [0, 0.4], soft: 0.25 } },
    { name: 'throat', look: 'throat', region: { kind: 'band', s: [6.2, 8.3], phi: [0, 0.3], soft: 0.3 } },
    { name: 'brow', look: 'stripe', region: { kind: 'streak', from: [9.2, 0.66], to: [7.7, 0.64], r: [0.16, 0.028] } },
    { name: 'earSpot', look: 'stripe', region: { kind: 'blob', at: [7.2, 0.56], r: [0.22, 0.03] } },
  ]),
  wing: { ...base.wing, color: 0x1a1612, sheen: 0x3a3428, bar: { rows: [0.55, 0.8], v: [-1.02, 1.02], base: 0x9a8a6a, tip: 0xd8ccb0 } },
  tail: { ...base.tail, rectrices: 6, restFan: 1.6, maxFan: 15, color: 0x121110, outer: { from: 0.75, color: 0xd8d4cc } },
  legs: { ...base.legs, color: 0x1a1612 },
  behaviour: { ...songbirdBehaviour, breathHz: [3, 4.6], holdCalm: [0.25, 1.1], holdAlert: [0.15, 0.6], saccade: [0.035, 0.0004], tailEvery: [0.6, 2.2], wingEvery: [3, 8], billUp: 4 },
});

/** Tauhou, silvereye, Zosterops lateralis. Olive-green head, a grey saddle, a bright white eye
 * ring, yellowish throat, cinnamon flanks and a pale belly. */
export const TAUHOU: Species = measured('tauhou', SHELL.tauhou, {
  name: 'Zosterops lateralis',
  seed: 2204,
  eye: { s: 7.85, phi: 0.56, inset: 0.84, iris: 0x5a3a24 },
  bill: { color: 0x2a2624 },
  skin: 0x3a3430,
  shading: { flank: 0.85, under: 0.9, patch: 0.2, gold: 0x6a6420, goldAmount: 0.1 },
  looks: {
    body: look({ width: 0.0252, base: 0x3a4418, tip: 0x6e7c32 }),
    belly: look({ width: 0.0277, aspect: 2.5, rowStep: 0.24, lift: 0.95, loose: 0.58, base: 0x8e8a7c, tip: 0xe2ddd0 }),
    flank: look({ width: 0.0302, aspect: 2.8, rowStep: 0.24, lift: 1.0, loose: 0.61, base: 0x7a4a2a, tip: 0xc68a58 }),
    down: look({ width: 0.04, aspect: 2.6, tilt: 26, lift: 1.4, loose: 1, base: 0x6a6a5a, tip: 0xaaa898 }),
    back: look({ width: 0.0252, base: 0x3e4420, tip: 0x6c7838, loose: 0.36 }),
    saddle: look({ width: 0.0269, aspect: 2.3, loose: 0.4, base: 0x48484a, tip: 0x88888a }),
    scapular: look({ width: 0.0353, aspect: 3.3, rowStep: 0.24, tilt: 18, lift: 0.8, base: 0x4a4a48, tip: 0x84847e }),
    breast: look({ width: 0.0252, aspect: 2.1, loose: 0.5, base: 0x7a786a, tip: 0xc8c4b2 }),
    throat: look({ width: 0.022, aspect: 1.9, rowStep: 0.32, loose: 0.43, base: 0x6a6a2a, tip: 0xc4c25a }),
    head: look({ width: 0.018, aspect: 1.8, rowStep: 0.34, lift: 0.45, loose: 0.32, fuzz: 0.25, base: 0x3a4418, tip: 0x6c7a30 }),
    face: look({ width: 0.014, aspect: 1.6, rowStep: 0.3, tilt: 7, lift: 0.2, loose: 0.4, fuzz: 0.4, base: 0x2e3414, tip: 0x56602a }),
    ring: look({ width: 0.011, aspect: 1.8, rowStep: 0.22, tilt: 5, lift: 0.15, cup: 0.3, round: 0.9, loose: 0.3, fuzz: 0.3, base: 0xdedcd6, tip: 0xffffff }),
    covert: look({ width: 0.0386, aspect: 2.6, rowStep: 0.33, tilt: 9, lift: 0.7, loose: 0.29, base: 0x3e4220, tip: 0x6a7438 }),
    undertail: look({ width: 0.04, aspect: 2.9, rowStep: 0.26, tilt: 10, lift: 0.8, loose: 0.58, base: 0x9a9a8a, tip: 0xe8e4d6 }),
    wingCovert: look({ width: 0.03, aspect: 2.3, rowStep: 0.4, tilt: 7, lift: 0, round: 0.8, loose: 0.22, fuzz: 0, base: 0x2a2e18, tip: 0x56602e }),
  },
  tracts: coat([
    { name: 'saddle', look: 'saddle', region: { kind: 'band', s: [3.6, 6.0], phi: [0.62, 1], soft: 0.4 } },
    { name: 'ring', look: 'ring', region: { kind: 'blob', at: [7.85, 0.56], r: [0.42, 0.055], pow: 2, soft: 0.1 } },
  ]),
  wing: { ...base.wing, color: 0x26281a, sheen: 0x5a6a2a },
  tail: { ...base.tail, rectrices: 6, color: 0x2a2c1c },
  legs: { ...base.legs, color: 0x5a5048 },
  behaviour: { ...songbirdBehaviour, breathHz: [2.6, 4], holdCalm: [0.35, 1.4], holdAlert: [0.2, 0.7], billUp: 5 },
});

/** Miromiro, tomtit, Petroica macrocephala (South Island male). Big black head with a white
 * spot over the bill, black back and wings with a white bar, yellow-orange breast fading to white. */
export const MIROMIRO: Species = measured('miromiro', SHELL.miromiro, {
  name: 'Petroica macrocephala macrocephala',
  seed: 2205,
  eye: { s: 7.8, phi: 0.56, inset: 0.84 },
  bill: { color: 0x0b0b0b },
  skin: 0x1a1816,
  shading: { flank: 0.85, under: 0.92, patch: 0.15, gold: 0x6a5a20, goldAmount: 0.05 },
  looks: {
    body: look({ width: 0.0252, base: 0x0b0b0c, tip: 0x19191b }),
    belly: look({ width: 0.0277, aspect: 2.5, rowStep: 0.24, lift: 1.0, loose: 0.58, base: 0xb8b2a4, tip: 0xf2eee4 }),
    flank: look({ width: 0.0302, aspect: 2.8, rowStep: 0.24, lift: 1.0, loose: 0.61, base: 0x9a7a40, tip: 0xe0b660 }),
    down: look({ width: 0.04, aspect: 2.6, tilt: 26, lift: 1.4, loose: 1, base: 0x2a2a2a, tip: 0x4a4a4a }),
    back: look({ width: 0.0252, base: 0x0a0a0b, tip: 0x18181a, loose: 0.32 }),
    scapular: look({ width: 0.0353, aspect: 3.3, rowStep: 0.24, tilt: 18, lift: 0.8, base: 0x0a0a0b, tip: 0x1a1a1c }),
    breast: look({ width: 0.0252, aspect: 2.1, loose: 0.47, base: 0xb87a1c, tip: 0xf2b23a }),
    throat: look({ width: 0.022, aspect: 1.9, rowStep: 0.32, loose: 0.32, base: 0x09090a, tip: 0x161618 }),
    head: look({ width: 0.019, aspect: 1.8, rowStep: 0.34, lift: 0.5, loose: 0.32, fuzz: 0.25, base: 0x09090a, tip: 0x161618 }),
    face: look({ width: 0.014, aspect: 1.6, rowStep: 0.3, tilt: 7, lift: 0.2, loose: 0.4, fuzz: 0.4, base: 0x070708, tip: 0x111113 }),
    spot: look({ width: 0.012, aspect: 1.8, rowStep: 0.26, tilt: 8, lift: 0.3, loose: 0.6, fuzz: 0.6, base: 0xd8d6d0, tip: 0xffffff }),
    covert: look({ width: 0.0386, aspect: 2.6, rowStep: 0.33, tilt: 9, lift: 0.7, loose: 0.29, base: 0x0a0a0b, tip: 0x18181a }),
    undertail: look({ width: 0.04, aspect: 2.9, rowStep: 0.26, tilt: 10, lift: 0.8, loose: 0.58, base: 0xc0bcb0, tip: 0xf4f2ea }),
    wingCovert: look({ width: 0.03, aspect: 2.3, rowStep: 0.4, tilt: 7, lift: 0, round: 0.8, loose: 0.22, fuzz: 0, base: 0x0b0b0c, tip: 0x19191b }),
  },
  tracts: coat([
    { name: 'breast', look: 'breast', region: { kind: 'band', s: [3.4, 6.0], phi: [0, 0.44], soft: 0.6 } },
    { name: 'throat', look: 'throat', region: { kind: 'band', s: [5.9, 8.6], phi: [0, 0.4], soft: 0.25 } },
    { name: 'spot', look: 'spot', region: { kind: 'blob', at: [9.6, 0.9], r: [0.4, 0.12] } },
  ]),
  wing: { ...base.wing, color: 0x0d0d0e, sheen: 0x2a2a2e, bar: { rows: [0.45, 0.85], v: [-1.02, 1.02], base: 0xd6d4ce, tip: 0xffffff } },
  tail: { ...base.tail, rectrices: 6, color: 0x0c0c0d, outer: { from: 0.8, color: 0xcfccc4 } },
  legs: { ...base.legs, color: 0x111111 },
  behaviour: { ...songbirdBehaviour, holdCalm: [0.5, 1.8], tailEvery: [1.8, 5], billUp: 4 },
});

/** Toutouwai, North Island robin, Petroica longipes. Dark slate grey, a pale breast patch and a
 * pale spot at the base of the bill; upright, long-legged, inquisitive. */
export const TOUTOUWAI: Species = measured('toutouwai', SHELL.toutouwai, {
  name: 'Petroica longipes',
  seed: 2206,
  eye: { s: 7.85, phi: 0.56, inset: 0.84 },
  bill: { color: 0x0e0e0e },
  skin: 0x24221f,
  shading: { flank: 0.82, under: 0.88, patch: 0.2, gold: 0x4a4a3a, goldAmount: 0.04 },
  looks: {
    body: look({ width: 0.0252, base: 0x202124, tip: 0x414448 }),
    belly: look({ width: 0.0277, aspect: 2.5, rowStep: 0.24, lift: 1.0, loose: 0.58, base: 0x3a3b3e, tip: 0x6a6c70 }),
    flank: look({ width: 0.0302, aspect: 2.8, rowStep: 0.24, lift: 1.0, loose: 0.61, base: 0x2a2b2d, tip: 0x505256 }),
    down: look({ width: 0.04, aspect: 2.6, tilt: 26, lift: 1.4, loose: 1, base: 0x3a3a3a, tip: 0x6a6a6a }),
    back: look({ width: 0.0252, base: 0x18191b, tip: 0x323437, loose: 0.36 }),
    scapular: look({ width: 0.0353, aspect: 3.3, rowStep: 0.24, tilt: 18, lift: 0.8, base: 0x17181a, tip: 0x303235 }),
    breast: look({ width: 0.0252, aspect: 2.1, loose: 0.54, base: 0x7a7874, tip: 0xc6c4be }),
    throat: look({ width: 0.022, aspect: 1.9, rowStep: 0.32, loose: 0.36, base: 0x1e1f21, tip: 0x3a3c40 }),
    head: look({ width: 0.018, aspect: 1.8, rowStep: 0.34, lift: 0.45, loose: 0.3, fuzz: 0.22, base: 0x17181a, tip: 0x323438 }),
    face: look({ width: 0.014, aspect: 1.6, rowStep: 0.3, tilt: 7, lift: 0.2, loose: 0.4, fuzz: 0.4, base: 0x121314, tip: 0x26282a }),
    spot: look({ width: 0.011, aspect: 1.8, rowStep: 0.26, tilt: 8, lift: 0.3, loose: 0.6, fuzz: 0.6, base: 0xb4b2ac, tip: 0xe8e6e0 }),
    covert: look({ width: 0.0386, aspect: 2.6, rowStep: 0.33, tilt: 9, lift: 0.7, loose: 0.29, base: 0x18191b, tip: 0x323437 }),
    undertail: look({ width: 0.04, aspect: 2.9, rowStep: 0.26, tilt: 10, lift: 0.8, loose: 0.58, base: 0x6a6a68, tip: 0xb8b6b0 }),
    wingCovert: look({ width: 0.03, aspect: 2.3, rowStep: 0.4, tilt: 7, lift: 0, round: 0.8, loose: 0.22, fuzz: 0, base: 0x141516, tip: 0x2a2c2e }),
  },
  tracts: coat([
    { name: 'slate', look: 'flank', region: { kind: 'band', s: [0, 2.4], phi: [0, 0.45], soft: 0.5 } },
    { name: 'breast', look: 'breast', region: { kind: 'blob', at: [3.9, 0], r: [1.25, 0.27], soft: 0.6 } },
    { name: 'throat', look: 'throat', region: { kind: 'band', s: [5.2, 8.6], phi: [0, 0.4], soft: 0.4 } },
    { name: 'spot', look: 'spot', region: { kind: 'blob', at: [9.7, 0.85], r: [0.32, 0.1] } },
  ]),
  wing: { ...base.wing, color: 0x16171a, sheen: 0x3a3c40 },
  tail: { ...base.tail, rectrices: 6, color: 0x161719 },
  legs: { ...base.legs, color: 0x2a2826 },
  behaviour: { ...songbirdBehaviour, holdCalm: [0.6, 2.2], tailEvery: [2, 6], billUp: 5 },
});

/** Hihi, stitchbird, Notiomystis cincta (male). Velvet-black head with white ear tufts held up,
 * a golden-yellow band at the shoulders, a white wing bar, olive-brown body. */
export const HIHI: Species = measured('hihi', SHELL.hihi, {
  name: 'Notiomystis cincta',
  seed: 2207,
  eye: { s: 7.85, phi: 0.56, inset: 0.84 },
  bill: { color: 0x0d0c0c },
  skin: 0x2a2620,
  shading: { flank: 0.85, under: 0.9, patch: 0.2, gold: 0x6a5a20, goldAmount: 0.1 },
  looks: {
    body: look({ width: 0.0252, base: 0x2a2618, tip: 0x5a523a }),
    belly: look({ width: 0.0277, aspect: 2.5, rowStep: 0.24, lift: 1.0, loose: 0.58, base: 0x6a6450, tip: 0xbab29a }),
    flank: look({ width: 0.0302, aspect: 2.8, rowStep: 0.24, lift: 1.0, loose: 0.61, base: 0x4a4430, tip: 0x847a5a }),
    down: look({ width: 0.04, aspect: 2.6, tilt: 26, lift: 1.4, loose: 1, base: 0x3a3a2a, tip: 0x6a6a4a }),
    back: look({ width: 0.0252, base: 0x2a2818, tip: 0x524c32, loose: 0.36 }),
    scapular: look({ width: 0.0353, aspect: 3.3, rowStep: 0.24, tilt: 18, lift: 0.8, base: 0x2a2616, tip: 0x4e4830 }),
    breast: look({ width: 0.0252, aspect: 2.1, loose: 0.47, base: 0x5a5440, tip: 0xa49a7c }),
    gold: look({ width: 0.0252, aspect: 2.2, loose: 0.36, base: 0xa07a10, tip: 0xf4c430 }),
    throat: look({ width: 0.02, aspect: 1.8, rowStep: 0.32, loose: 0.4, fuzz: 0.5, base: 0x060606, tip: 0x111111 }),
    head: look({ width: 0.018, aspect: 1.8, rowStep: 0.34, lift: 0.45, loose: 0.43, fuzz: 0.6, base: 0x050505, tip: 0x0f0f10 }),
    face: look({ width: 0.014, aspect: 1.6, rowStep: 0.3, tilt: 7, lift: 0.2, loose: 0.54, fuzz: 0.7, base: 0x040404, tip: 0x0c0c0c }),
    tuft: look({ width: 0.012, aspect: 3.6, rowStep: 0.16, tilt: 48, lift: 1.6, cup: 0.2, round: 0.4, loose: 0.8, fuzz: 0.8, base: 0xcac8c2, tip: 0xffffff, jitter: 0.6 }),
    covert: look({ width: 0.0386, aspect: 2.6, rowStep: 0.33, tilt: 9, lift: 0.7, loose: 0.29, base: 0x2a2616, tip: 0x524a30 }),
    undertail: look({ width: 0.04, aspect: 2.9, rowStep: 0.26, tilt: 10, lift: 0.8, loose: 0.58, base: 0x8a846c, tip: 0xd2cab0 }),
    wingCovert: look({ width: 0.03, aspect: 2.3, rowStep: 0.4, tilt: 7, lift: 0, round: 0.8, loose: 0.22, fuzz: 0, base: 0x1a1810, tip: 0x3a3624 }),
  },
  tracts: coat([
    { name: 'gold', look: 'gold', region: { kind: 'band', s: [5.1, 6.0], phi: [0.06, 0.62], soft: 0.3 } },
    { name: 'hood', look: 'head', region: { kind: 'band', s: [6.0, 11], phi: [0.35, 1] } },
    { name: 'throat', look: 'throat', region: { kind: 'band', s: [5.9, 8.6], phi: [0, 0.4], soft: 0.2 } },
    { name: 'tuft', look: 'tuft', region: { kind: 'blob', at: [7.15, 0.66], r: [0.34, 0.06] } },
  ]),
  wing: { ...base.wing, color: 0x1c1a14, sheen: 0x3a3828, bar: { rows: [0.6, 0.9], v: [-1.02, 1.02], base: 0xd0cec6, tip: 0xfaf8f0 } },
  tail: { ...base.tail, rectrices: 6, color: 0x1e1c16 },
  legs: { ...base.legs, color: 0x2a2620 },
  behaviour: { ...songbirdBehaviour, holdCalm: [0.4, 1.6], tailEvery: [1.5, 4.5], billUp: 9 },
});

/** Kererū, Hemiphaga novaeseelandiae. Metallic green and bronze head and breast with a violet
 * sheen, a clean line to a white belly, a red bill, eye and feet. Heavy-bodied, small-headed. */
export const KERERU: Species = measured('kereru', SHELL.kereru, {
  name: 'Hemiphaga novaeseelandiae',
  seed: 2208,
  eye: { s: 7.85, phi: 0.56, inset: 0.84, iris: 0xc0281e },
  bill: { color: 0xb02a20 },
  skin: 0x2a1e1e,
  shading: { flank: 0.85, under: 0.92, patch: 0.2, gold: 0x7a5a20, goldAmount: 0.35 },
  looks: {
    body: look({ width: 0.0252, base: 0x16220f, tip: 0x2c4018, iri: 0x3a9a3a, iriGraze: 0x9a6a1a, iriStrength: 0.55, iriPower: 6, sparkle: 0.4 }),
    belly: look({ width: 0.0302, aspect: 2.4, rowStep: 0.24, lift: 0.95, loose: 0.61, fuzz: 0.5, base: 0xc8c6c0, tip: 0xfbfaf6 }),
    flank: look({ width: 0.0319, aspect: 2.7, rowStep: 0.24, lift: 0.95, loose: 0.61, base: 0xb4b2ac, tip: 0xeeede8 }),
    down: look({ width: 0.04, aspect: 2.6, tilt: 26, lift: 1.4, loose: 1, base: 0x9a9a96, tip: 0xdedcd8 }),
    back: look({ width: 0.0252, base: 0x2a1820, tip: 0x4a2e36, iri: 0x8a3a8a, iriGraze: 0x3a8a5a, iriStrength: 0.5, iriPower: 6, loose: 0.32, sparkle: 0.4 }),
    scapular: look({ width: 0.037, aspect: 3.1, rowStep: 0.24, tilt: 16, lift: 0.8, base: 0x261a1c, tip: 0x46322e, iri: 0x7a4a6a, iriGraze: 0x4a8a3a, iriStrength: 0.45, iriPower: 6 }),
    breast: look({ width: 0.0269, aspect: 2.0, rowStep: 0.3, loose: 0.29, base: 0x12200e, tip: 0x26401a, iri: 0x4aaa3a, iriGraze: 0xb07a1a, iriStrength: 0.85, iriPower: 6, iriAlign: 0.2, iriAim: [0, -0.2, 1], sparkle: 0.35 }),
    throat: look({ width: 0.022, aspect: 1.9, rowStep: 0.32, loose: 0.35, base: 0x10200e, tip: 0x223c18, iri: 0x5aba4a, iriGraze: 0x9a5aa0, iriStrength: 0.8, iriPower: 7, sparkle: 0.35 }),
    head: look({ width: 0.018, aspect: 1.8, rowStep: 0.34, lift: 0.45, loose: 0.27, fuzz: 0.2, base: 0x13200f, tip: 0x253c1a, iri: 0x4aaa4a, iriGraze: 0x8a4aa0, iriStrength: 0.7, iriPower: 7, sparkle: 0.35 }),
    face: look({ width: 0.014, aspect: 1.6, rowStep: 0.3, tilt: 7, lift: 0.2, loose: 0.36, fuzz: 0.4, base: 0x0f180c, tip: 0x1e3016, iri: 0x3a8a3a, iriGraze: 0x6a3a8a, iriStrength: 0.35 }),
    covert: look({ width: 0.0386, aspect: 2.6, rowStep: 0.33, tilt: 9, lift: 0.7, loose: 0.29, base: 0x1c2a14, tip: 0x384c22, iri: 0x4a9a3a, iriGraze: 0x8a6a2a, iriStrength: 0.4, iriPower: 6 }),
    undertail: look({ width: 0.04, aspect: 2.9, rowStep: 0.26, tilt: 10, lift: 0.8, loose: 0.58, base: 0xbab8b2, tip: 0xf2f0ea }),
    wingCovert: look({ width: 0.032, aspect: 2.3, rowStep: 0.4, tilt: 7, lift: 0, round: 0.8, loose: 0.22, fuzz: 0, base: 0x1a2614, tip: 0x34481e, iri: 0x5a9a3a, iriGraze: 0x9a6a2a, iriStrength: 0.45, iriPower: 6, sparkle: 0.4 }),
  },
  tracts: coat([
    // the green bib ends in a clean line across the breast
    { name: 'breast', look: 'breast', region: { kind: 'band', s: [4.75, 6.4], phi: [0, 0.5], soft: 0.05 } },
    { name: 'belly', look: 'belly', region: { kind: 'band', s: [0, 4.75], phi: [0, 0.5], soft: 0.05 } },
  ]),
  wing: { ...base.wing, color: 0x1e2a16, sheen: 0x4a7a3a },
  tail: { ...base.tail, rectrices: 6, color: 0x2a2018 },
  legs: { ...base.legs, color: 0xb03628 },
  behaviour: { ...songbirdBehaviour, breathHz: [1.4, 2.4], holdCalm: [1.2, 3.6], holdAlert: [0.5, 1.6], saccade: [0.07, 0.0006], blinkEvery: [2.5, 7], tailEvery: [6, 14], wingEvery: [12, 26], billUp: 2 },
});

export const NZ_SPECIES: Record<string, Species> = {
  tui: TUI,
  korimako: KORIMAKO,
  piwakawaka: PIWAKAWAKA,
  tauhou: TAUHOU,
  miromiro: MIROMIRO,
  toutouwai: TOUTOUWAI,
  hihi: HIHI,
  kereru: KERERU,
};
