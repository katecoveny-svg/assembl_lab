// The measured shell: a bird's body loft built from its published measurements
// (./measured.ts) and a few proportions read off side-on photographs, instead of stretching the
// mountain-gem hummingbird the engine started from.
//
// Method (Kate's, from the Berlin 1917 film: measured shell first, detail attached after):
//   1. Size. Every bird is drawn at one on-screen length (LM model units for its published
//      total length), so k = LM / length is model units per millimetre for that bird.
//   2. Lengths from the measurements: head (THL - exposed bill), bill (exposed culmen), tail,
//      wing chord, tarsus. Torso = total length - bill - head - tail.
//   3. Proportions from photographs (ShellDef): how the torso is held (posture), its depth and
//      width, head height and width, where the head sits on the shoulders, tail angle, heel angle.
//   4. The loft keeps the engine's 11 sections and their roles (0 tail root ... 10 bill base) and
//      the hand-tuned curvature of the original: the torso and head templates are rotated and
//      scaled onto the measured lengths, never redrawn by hand.
//   5. Detail (feather tracts, wing, tail, legs) is attached to this shell by the engine.
//
// scripts/shape_check.py renders the result side, front and top and overlays it on outlines
// traced from photographs (study only, never shipped); docs/manu/proportions.md has the numbers.

import * as THREE from 'three';
import { MOUNTAIN_GEM, type Section, type Species } from '../bird/species';
import { Loft } from '../bird/loft';
import type { Measures } from './measured';

const DEG = Math.PI / 180;

/** One on-screen length for every bird, model units (the stage was framed for about this). */
export const LM = 1.75;

export interface ShellDef {
  /** torso axis, degrees above horizontal (vent to base of neck) */
  posture: number;
  /** greatest torso depth (back to belly) / torso length */
  depth: number;
  /** greatest torso width / greatest depth */
  width: number;
  /** head height (crown to chin) / head length; head width / head height */
  headH: number;
  headW: number;
  /** bill axis, degrees below horizontal (+ = bill pointing down) */
  headPitch: number;
  /** where the back of the head sits from the base of the neck, in head lengths: forward, up */
  neck: [number, number];
  /** bill depth at the base / exposed bill; how far the tip curves down / exposed bill */
  billDepth: number;
  billDroop: number;
  /** visible eye diameter / head length */
  eye: number;
  /** tail angle, degrees below horizontal; central and outer feather as a fraction of the tail; one rectrix width / tail */
  tailDroop: number;
  tailShape: [number, number];
  tailWidth: number;
  /** tarsus lean from vertical, heel behind the foot (degrees); share of the tarsus hidden by belly feathers */
  heel: number;
  cover: number;
  /** middle toe / tarsus */
  toe: number;
  /** how far the base of the neck (section 5) narrows toward the head, 0 = template shoulders */
  shoulder?: number;
  /** torso length correction for rounded field-guide totals (default 1) */
  torso?: number;
}

export interface Shell {
  k: number;
  sections: Section[];
  shoulder: [number, number, number];
  heelPoint: [number, number, number];
  wingScale: number;
  bodyScale: number;
  /** model-unit lengths the engine uses */
  bill: { length: number; radius: number; droop: number };
  tail: { length: [number, number]; width: number; droop: number };
  legs: { spread: number; toe: number; thick: number };
  eyeRadius: number;
  chord: number;
  /** what the shell was built to, for the shape check */
  target: { torso: number; head: number; headH: number; depth: number; tarsus: number; wing: number; tail: number; bill: number };
}

type P = { y: number; z: number };
const rot = (p: P, c: P, a: number) => {
  // positive a turns forward (+z) toward up (+y)
  const dz = p.z - c.z;
  const dy = p.y - c.y;
  return { z: c.z + dz * Math.cos(a) - dy * Math.sin(a), y: c.y + dz * Math.sin(a) + dy * Math.cos(a) };
};

// --- the templates, measured once from the mountain-gem's hand-tuned loft -------------------
const T = MOUNTAIN_GEM.sections;
const T0 = { y: T[0].y, z: T[0].z };
const T5 = { y: T[5].y, z: T[5].z };
const TORSO_LEN = Math.hypot(T5.y - T0.y, T5.z - T0.z);
const TORSO_AXIS = Math.atan2(T5.y - T0.y, T5.z - T0.z);
const TORSO_DEPTH = Math.max(...T.slice(0, 6).map((s) => s.rd + s.rv));
const TORSO_HALFW = Math.max(...T.slice(0, 6).map((s) => s.w));
const BILL_A = T[10].a * DEG;
// head length and height of the template along and across its bill axis
const HEAD_T = (() => {
  const loft = new Loft(MOUNTAIN_GEM);
  const base = { y: T[10].y, z: T[10].z };
  let back = 0;
  let top = -Infinity;
  let bot = Infinity;
  let wide = 0;
  const p = new THREE.Vector3();
  for (let s = 6.6; s <= 10; s += 0.05) {
    for (let a = 0; a < Math.PI * 2; a += 0.05) {
      loft.point(s, a, p);
      const dz = p.z - base.z;
      const dy = p.y - base.y;
      const u = dz * Math.cos(BILL_A) + dy * Math.sin(BILL_A);
      const w = -dz * Math.sin(BILL_A) + dy * Math.cos(BILL_A);
      back = Math.min(back, u);
      if (s >= 7.4) {
        top = Math.max(top, w);
        bot = Math.min(bot, w);
      }
      wide = Math.max(wide, Math.abs(p.x));
    }
  }
  return { len: -back, h: top - bot, w: 2 * wide };
})();

/** Build the shell for one bird. */
export function shell(m: Measures, d: ShellDef): Shell {
  const k = LM / m.length;
  const head = (m.thl - m.billF) * k;
  const torso = (m.length - m.billF - m.tail) * k - head;
  const Lt = torso * (d.torso ?? 1);
  const D = d.depth * Lt;
  const Wd = d.width * D;
  const Hh = d.headH * head;
  const Wh = d.headW * Hh;

  // --- torso: template rotated to the posture, stretched to the measured length -------------
  const sL = Lt / TORSO_LEN;
  const sD = D / TORSO_DEPTH;
  const sW = Wd / 2 / TORSO_HALFW;
  const turn = d.posture * DEG - TORSO_AXIS;
  const out: Section[] = T.map((s) => ({ ...s }));
  const ax = { z: Math.cos(TORSO_AXIS), y: Math.sin(TORSO_AXIS) };
  const pr = { z: -ax.y, y: ax.z };
  const torsoPt = (p: P): P => {
    // along/across the template axis, scaled, then turned to the posture
    const dz = p.z - T0.z;
    const dy = p.y - T0.y;
    const u = dz * ax.z + dy * ax.y;
    const w = dz * pr.z + dy * pr.y;
    const q = { z: u * sL * ax.z + w * sD * pr.z, y: u * sL * ax.y + w * sD * pr.y };
    return rot(q, { y: 0, z: 0 }, turn);
  };
  for (let i = 0; i <= 5; i++) {
    const q = torsoPt(T[i]);
    out[i] = { y: q.y, z: q.z, a: T[i].a + turn / DEG, w: T[i].w * sW, rd: T[i].rd * sD, rv: T[i].rv * sD };
  }
  const tShoulder = torsoPt({ y: MOUNTAIN_GEM.wing.shoulder[1], z: MOUNTAIN_GEM.wing.shoulder[2] });

  // --- head: template turned so the bill axis has the measured pitch, scaled to head length,
  // height and width, its back placed off the base of the neck --------------------------------
  const hL = head / HEAD_T.len;
  const hH = Hh / HEAD_T.h;
  const hW = Wh / HEAD_T.w;
  const billA = -d.headPitch * DEG;
  const B = { y: T[10].y, z: T[10].z };
  const ca = Math.cos(BILL_A);
  const sa = Math.sin(BILL_A);
  const headPt = (p: P): P => {
    const dz = p.z - B.z;
    const dy = p.y - B.y;
    const u = (dz * ca + dy * sa) * hL;
    const w = (-dz * sa + dy * ca) * hH;
    return { z: u * Math.cos(billA) - w * Math.sin(billA), y: u * Math.sin(billA) + w * Math.cos(billA) };
  };
  const headSec: Section[] = [];
  for (let i = 7; i <= 10; i++) {
    const q = headPt(T[i]);
    // a section's radii lie across its own axis: scale them by height or length depending on
    // how far that axis is turned from the bill
    const off = Math.abs((T[i].a * DEG - BILL_A));
    const rs = hH * Math.cos(off) ** 2 + hL * Math.sin(off) ** 2;
    headSec.push({ y: q.y, z: q.z, a: T[i].a + (billA - BILL_A) / DEG, w: T[i].w * hW, rd: T[i].rd * rs, rv: T[i].rv * rs });
  }
  // back of the head relative to its section 7 centre, in the head's own frame
  const back = { z: -head * Math.cos(billA), y: -head * Math.sin(billA) };
  const s5 = out[5];
  // place: the back of the skull sits neck[0] head lengths forward of and neck[1] up from the shoulder centre
  const anchor = { z: s5.z + d.neck[0] * head, y: s5.y + d.neck[1] * head };
  const shift = { z: anchor.z - back.z, y: anchor.y - back.y };
  for (let i = 0; i < 4; i++) {
    const h = headSec[i];
    out[7 + i] = { ...h, y: h.y + shift.y, z: h.z + shift.z };
  }
  // the base of the neck narrows toward the head (small-headed birds: a smooth line from back to crown)
  const s7 = out[7];
  const tp = d.shoulder ?? 0.2;
  const s5n = out[5];
  out[5] = { ...s5n, rd: lerp(s5n.rd, s7.rd * 1.15, tp), rv: lerp(s5n.rv, s7.rv * 1.15, tp), w: lerp(s5n.w, s7.w * 1.1, tp) };
  // neck: between shoulders and the back of the head, a little toward the nape
  out[6] = {
    y: lerp(s5.y, s7.y, 0.5) + 0.04 * D,
    z: lerp(s5.z, s7.z, 0.5) - 0.02 * D,
    a: (s5.a + s7.a) / 2,
    w: lerp(s5.w, s7.w, 0.55),
    rd: lerp(s5.rd, s7.rd, 0.55) * 0.97,
    rv: lerp(s5.rv, s7.rv, 0.55) * 0.97,
  };

  // --- seat it: the heel under the belly feathers, the belly over the feet --------------------
  const Th = m.tarsus * k;
  const heelY = Th * Math.cos(d.heel * DEG);
  const heelZ = -Th * Math.sin(d.heel * DEG);
  const probe = { ...MOUNTAIN_GEM, sections: out } as Species;
  const loft = new Loft(probe);
  const pt = new THREE.Vector3();
  let low = { y: Infinity, z: 0 };
  for (let s = 1.2; s <= 4.4; s += 0.05) {
    loft.point(s, 0, pt);
    if (pt.y < low.y) low = { y: pt.y, z: pt.z };
  }
  const dy = heelY * (1 - d.cover) - low.y;
  const dz = heelZ + 0.25 * Th - low.z;
  for (const s of out) {
    s.y += dy;
    s.z += dz;
  }
  const shoulder: [number, number, number] = [MOUNTAIN_GEM.wing.shoulder[0] * sW, tShoulder.y + dy, tShoulder.z + dz];

  // the visible bill starts about where the face section's radius closes on it
  const billEmbed = out[10].rd * 0.15;
  return {
    k,
    sections: out,
    shoulder,
    heelPoint: [MOUNTAIN_GEM.legs.hip[0] * sW, heelY, heelZ],
    wingScale: sL,
    bodyScale: sD,
    bill: { length: m.billF * k + billEmbed, radius: (d.billDepth * m.billF * k) / 2, droop: d.billDroop * m.billF * k },
    tail: { length: [d.tailShape[0] * m.tail * k, d.tailShape[1] * m.tail * k], width: d.tailWidth * m.tail * k, droop: d.tailDroop },
    legs: { spread: MOUNTAIN_GEM.legs.spread * sW, toe: d.toe * Th, thick: 0.045 * Th },
    eyeRadius: (d.eye * head) / 2,
    chord: m.wing * k,
    target: { torso: Lt, head, headH: Hh, depth: D, tarsus: Th, wing: m.wing * k, tail: m.tail * k, bill: m.billF * k },
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
