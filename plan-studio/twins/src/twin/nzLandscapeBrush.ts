// Interactive 3D Aotearoa Native Garden & Hardscape Brush inside /plan-studio/twins/drop/
// Lets architects & clients freehand-brush smooth merged 3D Corten/Macrocarpa mulched & river-pebble beds,
// Firth Black Sands architectural stepping paths, mossy volcanic boulders, and stratified NZ native plant mixes
// directly onto a dropped 2D Site Plan or 3D LINZ LiDAR Twin — with live NZ solar shade microclimate awareness,
// Council Permeable-Surface & NZBC E1 stormwater calculations, eco-sourced Regional Rohe filtering, 2 m root-zone
// clash detection, Yr 1/4/10 path-traced growth scaling, and window.__nzGardenState sync to Sheet L101.

import * as THREE from 'three/webgpu';
import type { App } from './app';
import { plantMaterial, planting, type Placement, type Species } from './plants';

export type BedSurfaceMode = 'bark_corten' | 'pebble_macrocarpa' | 'firth_path' | 'plants_only';

export type BrushSpeciesChoice =
  | 'mix_coastal'
  | 'mix_glade'
  | 'mix_swale'
  | 'mix_alpine'
  | Species
  | 'pohutukawa'
  | 'boulder'
  | 'none';

export type RoheId = 'tamaki' | 'waikato' | 'wellington' | 'canterbury' | 'otago';
export type GrowthYear = 1 | 4 | 10;

type ExtendedSpecies = Species | 'pohutukawa' | 'boulder';
type SunZone = 'full_sun' | 'morning_sun' | 'deep_shade';

export interface BrushGardenStats {
  areaM2: number;
  plantCount: number;
  boulderCount: number;
  paverCount: number;
  totalNzd: number;
  permeablePct: number;
  imperviousPct: number;
  detentionLitres: number;
  rootClashCount: number;
  shadeWarnCount: number;
  roheLabel: string;
  growthYear: GrowthYear;
}

export interface NzGardenExportState {
  roheLabel: string;
  permeablePct: number;
  imperviousPct: number;
  detentionLitres: number;
  growthYear: GrowthYear;
  rootClashCount: number;
  beds: { x: number; z: number; r: number; kind: string }[];
  plants: { sp: string; x: number; z: number; s: number; sunOk?: boolean; rootClash?: boolean }[];
}

export interface LandscapeBrushHost {
  app: App;
  bounds: THREE.Box3;
  groundAt: (x: number, z: number) => number;
  onStatsChange?: (stats: BrushGardenStats) => void;
}

interface SurfaceOption {
  id: BedSurfaceMode;
  label: string;
  shortLabel: string;
  supplierSpec: string;
  swatchBg: string;
  swatchRing: string;
  cursorHex: number;
  ratePerM2: number;
  edgeRatePerM: number;
}

const SURFACE_MODES: SurfaceOption[] = [
  {
    id: 'bark_corten',
    label: 'Daltons Bark + Corten Edge',
    shortLabel: 'Daltons Bark + Corten',
    supplierSpec: 'Daltons 75 mm Composted Bark · Straightcurve Corten 115 mm rim',
    swatchBg: '#2B201B',
    swatchRing: '#9E4B28',
    cursorHex: 0xc96f44,
    ratePerM2: 18,
    edgeRatePerM: 68,
  },
  {
    id: 'pebble_macrocarpa',
    label: 'Waikato River Pebble + Macrocarpa',
    shortLabel: 'Waikato Pebble + Macrocarpa',
    supplierSpec: 'Waikato 20–40 mm Riverstone · Charred Macrocarpa Sleeper kerb',
    swatchBg: '#8B867B',
    swatchRing: '#3D2E24',
    cursorHex: 0xb5aea0,
    ratePerM2: 32,
    edgeRatePerM: 74,
  },
  {
    id: 'firth_path',
    label: 'Firth Black Sands Stepping Path',
    shortLabel: 'Firth Black Sands Path',
    supplierSpec: 'Firth Piazza 50 Black Sands Pavers · Permeable scoria aggregate',
    swatchBg: '#3D4044',
    swatchRing: '#797E85',
    cursorHex: 0x9aa2aa,
    ratePerM2: 95,
    edgeRatePerM: 0,
  },
  {
    id: 'plants_only',
    label: 'Plants Only (Open Lawn/Bank)',
    shortLabel: 'Plants Only (Open Bank)',
    supplierSpec: 'Direct naturalistic matrix planting into open turf or coastal bank',
    swatchBg: '#4E6E3A',
    swatchRing: '#7FA362',
    cursorHex: 0x8ab86e,
    ratePerM2: 0,
    edgeRatePerM: 0,
  },
];

interface RoheProfile {
  id: RoheId;
  label: string;
  nurseryNote: string;
  favored: ExtendedSpecies[];
  cautioned: ExtendedSpecies[];
}

const ROHE_PROFILES: RoheProfile[] = [
  {
    id: 'tamaki',
    label: 'Tāmaki Makaurau Coastal',
    nurseryNote: 'Auckland volcanic & coastal eco-sourcing (Oratia Natives · Zone D)',
    favored: ['pohutukawa', 'nikau', 'ponga', 'harakeke', 'hebe', 'kawakawa', 'boulder'],
    cautioned: [],
  },
  {
    id: 'waikato',
    label: 'Waikato Riparian',
    nurseryNote: 'Waikato alluvial basin & wetland provenance (riparian E1 buffers)',
    favored: ['harakeke', 'tikouka', 'carex', 'fern', 'ponga', 'kawakawa'],
    cautioned: ['pohutukawa'],
  },
  {
    id: 'wellington',
    label: 'Te Whanganui-a-Tara Wind-Zone',
    nurseryNote: 'Cook Strait salt-gale hardy eco-sourced coastal flora',
    favored: ['harakeke', 'hebe', 'tussock', 'coprosma', 'carex', 'tikouka', 'boulder'],
    cautioned: ['nikau'],
  },
  {
    id: 'canterbury',
    label: 'Canterbury Plains Frost-Hardy',
    nurseryNote: 'Southern Woods / Plains frost-tolerant dry-wind natives',
    favored: ['tussock', 'carex', 'tikouka', 'hebe', 'coprosma', 'harakeke'],
    cautioned: ['nikau', 'pohutukawa', 'kawakawa'],
  },
  {
    id: 'otago',
    label: 'Central Otago Schist & Alpine',
    nurseryNote: 'Arid schist & hard-frost alpine provenance (Otago Eco-Sourced)',
    favored: ['tussock', 'carex', 'coprosma', 'hebe', 'boulder'],
    cautioned: ['nikau', 'pohutukawa', 'ponga', 'kawakawa'],
  },
];

function inferRoheFromLat(lat?: number): RoheId {
  if (typeof lat !== 'number' || !Number.isFinite(lat)) return 'tamaki';
  if (lat > -37.25) return 'tamaki';
  if (lat > -38.65) return 'waikato';
  if (lat > -42.15) return 'wellington';
  if (lat > -44.25) return 'canterbury';
  return 'otago';
}

interface SpeciesMeta {
  label: string;
  grade: string;
  rateNzd: number;
  minGap: number;
  canopyAreaM2: number;
  zone: 'border' | 'mid' | 'core';
  swatch: string;
  sunPref: 'sun' | 'shade' | 'any';
  isCanopyRootRisk: boolean;
  growthScale: Record<GrowthYear, number>;
  spongeLitres: number;
}

const SPECIES_META: Record<ExtendedSpecies, SpeciesMeta> = {
  pohutukawa: {
    label: 'Pōhutukawa / Coastal Canopy',
    grade: '45L',
    rateNzd: 165,
    minGap: 2.15,
    canopyAreaM2: 3.4,
    zone: 'core',
    swatch: '#D62828',
    sunPref: 'sun',
    isCanopyRootRisk: true,
    growthScale: { 1: 0.42, 4: 0.82, 10: 1.18 },
    spongeLitres: 14,
  },
  nikau: {
    label: 'Nīkau Palm',
    grade: '45L',
    rateNzd: 115,
    minGap: 1.35,
    canopyAreaM2: 1.9,
    zone: 'core',
    swatch: '#356830',
    sunPref: 'shade',
    isCanopyRootRisk: true,
    growthScale: { 1: 0.44, 4: 0.80, 10: 1.16 },
    spongeLitres: 11,
  },
  ponga: {
    label: 'Ponga / Silver Tree Fern',
    grade: 'PB18',
    rateNzd: 85,
    minGap: 1.32,
    canopyAreaM2: 2.1,
    zone: 'core',
    swatch: '#3B6235',
    sunPref: 'shade',
    isCanopyRootRisk: true,
    growthScale: { 1: 0.46, 4: 0.84, 10: 1.15 },
    spongeLitres: 10,
  },
  wheki: {
    label: 'Whekī / Rough Tree Fern',
    grade: 'PB18',
    rateNzd: 78,
    minGap: 1.25,
    canopyAreaM2: 1.9,
    zone: 'core',
    swatch: '#476A30',
    sunPref: 'shade',
    isCanopyRootRisk: true,
    growthScale: { 1: 0.46, 4: 0.84, 10: 1.14 },
    spongeLitres: 9,
  },
  tikouka: {
    label: 'Tī Kōuka / Cabbage Tree',
    grade: '45L',
    rateNzd: 95,
    minGap: 1.28,
    canopyAreaM2: 1.6,
    zone: 'core',
    swatch: '#65834B',
    sunPref: 'sun',
    isCanopyRootRisk: true,
    growthScale: { 1: 0.44, 4: 0.86, 10: 1.18 },
    spongeLitres: 11,
  },
  harakeke: {
    label: 'Harakeke / NZ Flax',
    grade: 'PB5',
    rateNzd: 24,
    minGap: 0.86,
    canopyAreaM2: 1.15,
    zone: 'mid',
    swatch: '#4A673B',
    sunPref: 'sun',
    isCanopyRootRisk: false,
    growthScale: { 1: 0.56, 4: 0.94, 10: 1.10 },
    spongeLitres: 9,
  },
  kawakawa: {
    label: 'Kawakawa / Pepper Tree',
    grade: 'PB5',
    rateNzd: 24,
    minGap: 0.74,
    canopyAreaM2: 0.85,
    zone: 'mid',
    swatch: '#3D6A2C',
    sunPref: 'shade',
    isCanopyRootRisk: false,
    growthScale: { 1: 0.54, 4: 0.92, 10: 1.12 },
    spongeLitres: 6,
  },
  coprosma: {
    label: 'Coprosma / Bronze Shrub',
    grade: 'PB5',
    rateNzd: 22,
    minGap: 0.68,
    canopyAreaM2: 0.72,
    zone: 'mid',
    swatch: '#6A6234',
    sunPref: 'sun',
    isCanopyRootRisk: false,
    growthScale: { 1: 0.58, 4: 0.94, 10: 1.08 },
    spongeLitres: 5,
  },
  hebe: {
    label: 'Koromiko / White Hebe',
    grade: 'PB5',
    rateNzd: 22,
    minGap: 0.62,
    canopyAreaM2: 0.68,
    zone: 'mid',
    swatch: '#EAE0E5',
    sunPref: 'sun',
    isCanopyRootRisk: false,
    growthScale: { 1: 0.60, 4: 0.96, 10: 1.08 },
    spongeLitres: 5,
  },
  tussock: {
    label: 'Wī Kura / Red Tussock',
    grade: 'PB3',
    rateNzd: 16,
    minGap: 0.48,
    canopyAreaM2: 0.48,
    zone: 'border',
    swatch: '#B96B35',
    sunPref: 'sun',
    isCanopyRootRisk: false,
    growthScale: { 1: 0.58, 4: 0.95, 10: 1.08 },
    spongeLitres: 6,
  },
  carex: {
    label: 'Pūrei / Copper Sedge',
    grade: 'PB3',
    rateNzd: 16,
    minGap: 0.44,
    canopyAreaM2: 0.38,
    zone: 'border',
    swatch: '#9E6838',
    sunPref: 'any',
    isCanopyRootRisk: false,
    growthScale: { 1: 0.64, 4: 0.96, 10: 1.06 },
    spongeLitres: 8,
  },
  fern: {
    label: 'Piupiu / Ground Crown Fern',
    grade: 'PB5',
    rateNzd: 19,
    minGap: 0.48,
    canopyAreaM2: 0.46,
    zone: 'border',
    swatch: '#6E8F43',
    sunPref: 'shade',
    isCanopyRootRisk: false,
    growthScale: { 1: 0.62, 4: 0.95, 10: 1.08 },
    spongeLitres: 7,
  },
  boulder: {
    label: 'Kōhatu / Mossy Volcanic Boulder',
    grade: 'Feature',
    rateNzd: 95,
    minGap: 0.68,
    canopyAreaM2: 0.45,
    zone: 'border',
    swatch: '#5E625B',
    sunPref: 'any',
    isCanopyRootRisk: false,
    growthScale: { 1: 1.0, 4: 1.0, 10: 1.0 },
    spongeLitres: 0,
  },
};

interface CuratedMix {
  id: 'mix_coastal' | 'mix_glade' | 'mix_swale' | 'mix_alpine';
  label: string;
  subtitle: string;
  swatches: string[];
  entries: { sp: ExtendedSpecies; weight: number }[];
}

const CURATED_MIXES: CuratedMix[] = [
  {
    id: 'mix_coastal',
    label: 'Coastal Pohutukawa & Flax',
    subtitle: 'Salt-hardy pōhutukawa, harakeke, tī kōuka, koromiko & copper sedge',
    swatches: ['#D62828', '#4A673B', '#65834B', '#EAE0E5', '#B96B35', '#5E625B'],
    entries: [
      { sp: 'carex', weight: 0.25 },
      { sp: 'tussock', weight: 0.22 },
      { sp: 'hebe', weight: 0.17 },
      { sp: 'harakeke', weight: 0.16 },
      { sp: 'boulder', weight: 0.07 },
      { sp: 'tikouka', weight: 0.07 },
      { sp: 'pohutukawa', weight: 0.06 },
    ],
  },
  {
    id: 'mix_glade',
    label: 'Ponga & Nikau Bush Glade',
    subtitle: 'Sheltered silver tree ferns, nīkau palms, kawakawa & crown ferns',
    swatches: ['#3B6235', '#356830', '#3D6A2C', '#6E8F43', '#4A673B', '#5E625B'],
    entries: [
      { sp: 'fern', weight: 0.34 },
      { sp: 'carex', weight: 0.16 },
      { sp: 'kawakawa', weight: 0.16 },
      { sp: 'harakeke', weight: 0.10 },
      { sp: 'ponga', weight: 0.11 },
      { sp: 'nikau', weight: 0.08 },
      { sp: 'boulder', weight: 0.05 },
    ],
  },
  {
    id: 'mix_swale',
    label: 'Kaitiakitanga Rain-Garden Swale',
    subtitle: 'NZBC E1 stormwater bio-retention sedges, harakeke, fern & tī kōuka',
    swatches: ['#6E8F43', '#4A673B', '#9E6838', '#65834B', '#EAE0E5', '#5E625B'],
    entries: [
      { sp: 'carex', weight: 0.32 },
      { sp: 'fern', weight: 0.22 },
      { sp: 'harakeke', weight: 0.18 },
      { sp: 'tussock', weight: 0.11 },
      { sp: 'hebe', weight: 0.08 },
      { sp: 'tikouka', weight: 0.05 },
      { sp: 'boulder', weight: 0.04 },
    ],
  },
  {
    id: 'mix_alpine',
    label: 'Alpine Red Tussock & Stone',
    subtitle: 'Wind-sculpted bronze red tussock, mossy volcanic boulders & coprosma',
    swatches: ['#B96B35', '#5E625B', '#9E6838', '#6A6234', '#EAE0E5'],
    entries: [
      { sp: 'tussock', weight: 0.36 },
      { sp: 'carex', weight: 0.24 },
      { sp: 'boulder', weight: 0.16 },
      { sp: 'coprosma', weight: 0.13 },
      { sp: 'hebe', weight: 0.11 },
    ],
  },
];

const INDIVIDUAL_OPTIONS: { id: BrushSpeciesChoice; label: string }[] = [
  { id: 'ponga', label: 'Ponga / Silver Fern (PB18 · $85)' },
  { id: 'nikau', label: 'Nīkau Palm (45L · $115)' },
  { id: 'tikouka', label: 'Tī Kōuka / Cabbage Tree (45L · $95)' },
  { id: 'pohutukawa', label: 'Pōhutukawa / Coastal Canopy (45L · $165)' },
  { id: 'harakeke', label: 'Harakeke / NZ Flax (PB5 · $24)' },
  { id: 'hebe', label: 'Koromiko / White Hebe (PB5 · $22)' },
  { id: 'tussock', label: 'Red / Copper Tussock (PB3 · $16)' },
  { id: 'fern', label: 'Ground Crown Fern (PB5 · $19)' },
  { id: 'boulder', label: 'Mossy Volcanic Boulder ($95)' },
  { id: 'none', label: 'Bed / Stepping Path Only (No Plants)' },
];

const BRUSH_CSS = `
.lsb-wrap {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(101, 74, 78, 0.2);
  display: grid;
  gap: 8px;
}
.lsb-top-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}
.lsb-btn-brush[aria-pressed="true"] {
  background: #240B21 !important;
  color: #F9F6F2 !important;
  border-color: #240B21 !important;
  box-shadow: 0 4px 12px rgba(24, 11, 24, 0.22);
}
.lsb-studio-link {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #F6F1ED;
  color: #240B21;
  border: 1px solid rgba(101, 74, 78, 0.34);
  font-weight: 500;
}
.lsb-studio-link:hover {
  background: #240B21;
  color: #F9F6F2;
}
.lsb-drawer {
  background: #F6F1ED;
  border: 1px solid rgba(101, 74, 78, 0.24);
  border-radius: 12px;
  padding: 10px;
  display: grid;
  gap: 8px;
}
.lsb-drawer[hidden] { display: none !important; }
.lsb-kicker {
  font: 500 10px/1.2 'IBM Plex Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #654A4E;
}
.lsb-surf-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}
.lsb-surf-btn {
  appearance: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 7px;
  border-radius: 8px;
  border: 1px solid rgba(101, 74, 78, 0.24);
  background: #FFFDFB;
  color: #240B21;
  font: 500 11px/1.2 'Instrument Sans', system-ui, sans-serif;
  text-align: left;
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.12s ease;
}
.lsb-surf-btn:hover { transform: translateY(-1px); }
.lsb-surf-btn[aria-pressed="true"] {
  border-color: #240B21;
  box-shadow: inset 0 0 0 1px #240B21;
  background: #FFFDFB;
}
.lsb-surf-dot {
  flex: none;
  width: 15px;
  height: 15px;
  border-radius: 999px;
}
.lsb-select {
  width: 100%;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid rgba(101, 74, 78, 0.3);
  font: 500 12px/1.25 'Instrument Sans', system-ui, sans-serif;
  background: #FFFDFB;
  color: #240B21;
}
.lsb-swatches {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.lsb-swatch-bar {
  display: inline-flex;
  gap: 3px;
  align-items: center;
}
.lsb-swatch-chip {
  width: 11px;
  height: 11px;
  border-radius: 999px;
  border: 1px solid rgba(36, 11, 33, 0.25);
}
.lsb-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  background: #240B21;
  color: #F9F6F2;
  border-radius: 9px;
  padding: 7px 9px;
}
.lsb-stat-lbl {
  font: 500 9.5px/1.15 'IBM Plex Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #D9BACB;
}
.lsb-stat-val {
  font: 500 12.5px/1.25 'IBM Plex Mono', monospace;
  color: #F9F6F2;
  margin-top: 2px;
}
.lsb-e1-box {
  background: #FFFDFB;
  border: 1px solid rgba(101, 74, 78, 0.22);
  border-radius: 9px;
  padding: 7px 9px;
  display: grid;
  gap: 5px;
}
.lsb-e1-track {
  height: 7px;
  border-radius: 999px;
  background: #534A4E;
  overflow: hidden;
  display: flex;
}
.lsb-e1-perm {
  height: 100%;
  background: #4C7A46;
  transition: width 0.18s ease;
}
.lsb-e1-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  font: 500 10.5px/1.25 'IBM Plex Mono', monospace;
  color: #240B21;
}
.lsb-badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
}
.lsb-badge {
  font: 500 10.5px/1.25 'IBM Plex Mono', monospace;
  padding: 3px 7px;
  border-radius: 999px;
  border: 1px solid rgba(101, 74, 78, 0.24);
  background: #FFFDFB;
  color: #240B21;
}
.lsb-badge.is-ok {
  border-color: rgba(47, 107, 79, 0.35);
  background: #EEF6F0;
  color: #23553C;
}
.lsb-badge.is-warn {
  border-color: rgba(181, 108, 22, 0.45);
  background: #FDF4E6;
  color: #824909;
}
.lsb-yr-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.lsb-yr-group {
  display: inline-flex;
  gap: 4px;
}
.lsb-yr-btn {
  appearance: none;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(101, 74, 78, 0.28);
  background: #FFFDFB;
  color: #240B21;
  font: 500 11px/1.2 'IBM Plex Mono', monospace;
  cursor: pointer;
}
.lsb-yr-btn[aria-pressed="true"] {
  background: #240B21;
  color: #F9F6F2;
  border-color: #240B21;
}
.lsb-erase-btn[aria-pressed="true"] {
  background: #7A2835 !important;
  color: #FFFDFB !important;
  border-color: #7A2835 !important;
}
.lsb-mini-pill {
  font: 400 11px/1.3 'IBM Plex Mono', monospace;
  color: #654A4E;
  background: rgba(246, 241, 237, 0.9);
  border: 1px solid rgba(101, 74, 78, 0.2);
  border-radius: 8px;
  padding: 5px 8px;
}
.lsb-mini-pill[hidden] { display: none !important; }
`;

// ---- Seeded PRNG & Smooth 2D Drift Noise (Piet Oudolf Naturalistic Clumping) -------------------------

function seededRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix: number, iz: number): number {
  const n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function noise2D(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function distToBox2D(x: number, z: number, minX: number, maxX: number, minZ: number, maxZ: number): number {
  const dx = x < minX ? minX - x : x > maxX ? x - maxX : 0;
  const dz = z < minZ ? minZ - z : z > maxZ ? z - maxZ : 0;
  return Math.hypot(dx, dz);
}

// ---- Procedural NZ Supplier Hardscape Textures (Daltons Bark, Waikato Pebble, Firth Black Sands, Macrocarpa) ----

interface HardscapePalette {
  barkMat: THREE.MeshStandardMaterial;
  cortenMat: THREE.MeshStandardMaterial;
  pebbleMat: THREE.MeshStandardMaterial;
  macrocarpaMat: THREE.MeshStandardMaterial;
  scoriaBaseMat: THREE.MeshStandardMaterial;
  firthPaverMat: THREE.MeshStandardMaterial;
}

let cachedHardscapeMats: HardscapePalette | null = null;

function makeProcTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function getHardscapeMaterials(): HardscapePalette {
  if (cachedHardscapeMats) return cachedHardscapeMats;

  // 1. Daltons Composted Dark Forest Bark Mulch
  const barkTex = makeProcTexture((ctx, S) => {
    const rnd = seededRand(2026);
    ctx.fillStyle = '#1e1612';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 2200; i++) {
      const v = 20 + Math.floor(rnd() * 22);
      ctx.fillStyle = `rgb(${v + 8},${v + 3},${v})`;
      ctx.fillRect(rnd() * S, rnd() * S, 3, 3);
    }
    for (let i = 0; i < 1450; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const w = 9 + rnd() * 22;
      const h = 4 + rnd() * 8.5;
      const ang = rnd() * Math.PI;
      const drawChip = (ox: number, oy: number) => {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(ang);
        ctx.fillStyle = 'rgba(9,6,5,0.62)';
        ctx.fillRect(-w * 0.5 + 1.4, -h * 0.5 + 1.4, w, h);
        const tone = Math.floor(28 + rnd() * 34);
        const warm = Math.floor(rnd() * 15);
        ctx.fillStyle = `rgb(${tone + 14 + warm},${tone + 6 + Math.floor(warm * 0.5)},${tone})`;
        ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
        ctx.strokeStyle = `rgba(${tone + 38},${tone + 22},${tone + 14},0.34)`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-w * 0.35, 0);
        ctx.lineTo(w * 0.35, 0);
        ctx.stroke();
        ctx.restore();
      };
      drawChip(x, y);
      if (x < 24) drawChip(x + S, y);
      if (x > S - 24) drawChip(x - S, y);
      if (y < 24) drawChip(x, y + S);
      if (y > S - 24) drawChip(x, y - S);
    }
  });

  // 2. Waikato 20–40 mm Washed River Pebbles
  const pebbleTex = makeProcTexture((ctx, S) => {
    const rnd = seededRand(4040);
    ctx.fillStyle = '#34312c';
    ctx.fillRect(0, 0, S, S);
    const tones = [
      [138, 134, 125],
      [110, 106, 98],
      [158, 150, 136],
      [92, 95, 98],
      [146, 132, 112],
      [120, 116, 108],
      [78, 76, 72],
    ];
    for (let i = 0; i < 980; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const rx = 5.5 + rnd() * 11;
      const ry = 4.2 + rnd() * 8;
      const ang = rnd() * Math.PI;
      const col = tones[Math.floor(rnd() * tones.length)];
      const sh = 0.84 + rnd() * 0.3;
      const drawStone = (ox: number, oy: number) => {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(ang);
        ctx.fillStyle = 'rgba(12,11,10,0.55)';
        ctx.beginPath();
        ctx.ellipse(1.5, 1.8, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        const g = ctx.createRadialGradient(-rx * 0.25, -ry * 0.25, 1, 0, 0, Math.max(rx, ry));
        g.addColorStop(0, `rgb(${Math.min(255, Math.round(col[0] * sh + 24))},${Math.min(255, Math.round(col[1] * sh + 22))},${Math.min(255, Math.round(col[2] * sh + 18))})`);
        g.addColorStop(1, `rgb(${Math.floor(col[0] * sh * 0.72)},${Math.floor(col[1] * sh * 0.72)},${Math.floor(col[2] * sh * 0.72)})`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawStone(x, y);
      if (x < 22) drawStone(x + S, y);
      if (x > S - 22) drawStone(x - S, y);
      if (y < 22) drawStone(x, y + S);
      if (y > S - 22) drawStone(x, y - S);
    }
  });

  // 3. Firth Piazza Black Sands Honed Volcanic Concrete Pavers
  const firthTex = makeProcTexture((ctx, S) => {
    const rnd = seededRand(3033);
    ctx.fillStyle = '#3a3d41';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 6500; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const v = 42 + Math.floor(rnd() * 44);
      ctx.fillStyle = `rgba(${v},${v + 2},${v + 4},0.55)`;
      ctx.fillRect(x, y, 1.8, 1.8);
    }
    ctx.strokeStyle = 'rgba(170,176,184,0.22)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, S - 6, S - 6);
  }, 256);

  // 4. Charred NZ Macrocarpa Sleeper Grain
  const macroTex = makeProcTexture((ctx, S) => {
    const rnd = seededRand(6061);
    ctx.fillStyle = '#362920';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 240; i++) {
      const y = rnd() * S;
      const a = 0.08 + rnd() * 0.18;
      ctx.strokeStyle = rnd() > 0.45 ? `rgba(22,15,11,${a})` : `rgba(98,74,54,${a})`;
      ctx.lineWidth = 1 + rnd() * 2.4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(S * 0.33, y + (rnd() - 0.5) * 6, S * 0.66, y + (rnd() - 0.5) * 6, S, y);
      ctx.stroke();
    }
  }, 256);

  cachedHardscapeMats = {
    barkMat: new THREE.MeshStandardMaterial({
      name: 'daltons_bark_mulch',
      map: barkTex,
      color: 0xd8cec8,
      roughness: 0.95,
      metalness: 0.0,
    }),
    cortenMat: new THREE.MeshStandardMaterial({
      name: 'straightcurve_corten_edging',
      color: 0x944827,
      roughness: 0.74,
      metalness: 0.34,
    }),
    pebbleMat: new THREE.MeshStandardMaterial({
      name: 'waikato_river_pebble',
      map: pebbleTex,
      color: 0xe6e2da,
      roughness: 0.84,
      metalness: 0.03,
    }),
    macrocarpaMat: new THREE.MeshStandardMaterial({
      name: 'charred_macrocarpa_sleeper',
      map: macroTex,
      color: 0x9c826c,
      roughness: 0.89,
      metalness: 0.02,
    }),
    scoriaBaseMat: new THREE.MeshStandardMaterial({
      name: 'permeable_scoria_fines',
      map: barkTex,
      color: 0x706c68,
      roughness: 0.94,
      metalness: 0.02,
    }),
    firthPaverMat: new THREE.MeshStandardMaterial({
      name: 'firth_piazza_black_sands',
      map: firthTex,
      color: 0xb4b8be,
      roughness: 0.72,
      metalness: 0.06,
    }),
  };
  return cachedHardscapeMats;
}

// ---- Custom 3D Geometries for Coastal Pōhutukawa & Mossy Volcanic Basalt Boulders ---------------------

function buildVolcanicBoulderGeo(seed: number): THREE.BufferGeometry {
  const rnd = seededRand(seed);
  const ico = new THREE.IcosahedronGeometry(0.42, 2);
  const nonIdx = ico.index ? ico.toNonIndexed() : ico;
  const pos = nonIdx.attributes.position as THREE.BufferAttribute;

  const ox = rnd() * 17.3;
  const oz = rnd() * 29.1;
  const sx = 0.92 + rnd() * 0.38;
  const sy = 0.56 + rnd() * 0.22;
  const sz = 0.86 + rnd() * 0.36;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const n1 = noise2D(x * 3.1 + ox, z * 3.1 + oz + y * 1.9);
    const n2 = noise2D(x * 6.4 - oz, z * 6.4 + ox - y * 2.7);
    const disp = 0.78 + n1 * 0.34 + n2 * 0.12;
    x *= sx * disp;
    y = y * sy * disp + 0.14;
    if (y < -0.05) y = -0.05 + (y + 0.05) * 0.25;
    z *= sz * disp;
    pos.setXYZ(i, x, y, z);
  }
  nonIdx.computeVertexNormals();
  const nrm = nonIdx.attributes.normal as THREE.BufferAttribute;
  const cols = new Float32Array(pos.count * 3);
  const rockDark = new THREE.Color(0x3f423f);
  const rockLight = new THREE.Color(0x62655f);
  const mossDeep = new THREE.Color(0x4b6933);
  const mossBright = new THREE.Color(0x6c8c47);
  const tmpC = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const ny = nrm.getY(i);
    const vx = pos.getX(i);
    const vz = pos.getZ(i);
    const patch = noise2D(vx * 5.2 + ox, vz * 5.2 + oz);
    const mossMask = ny > 0.38 && patch > 0.42 ? Math.min(1, (ny - 0.38) * 2.4 * ((patch - 0.42) * 2.1)) : 0;
    tmpC.copy(rockDark).lerp(rockLight, Math.max(0, Math.min(1, 0.35 + ny * 0.45 + (patch - 0.5) * 0.3)));
    if (mossMask > 0.02) {
      const mCol = mossDeep.clone().lerp(mossBright, patch);
      tmpC.lerp(mCol, mossMask * 0.88);
    }
    cols[i * 3] = tmpC.r;
    cols[i * 3 + 1] = tmpC.g;
    cols[i * 3 + 2] = tmpC.b;
  }
  nonIdx.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return nonIdx;
}

function buildPohutukawaGeo(seed: number): THREE.BufferGeometry {
  const rnd = seededRand(seed);
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];

  const addVert = (x: number, y: number, z: number, c: THREE.Color) => {
    pos.push(x, y, z);
    col.push(c.r, c.g, c.b);
    return pos.length / 3 - 1;
  };

  const addTube = (pts: THREE.Vector3[], radii: number[], seg: number, baseHex: number) => {
    const base = pos.length / 3;
    let prevN = new THREE.Vector3(1, 0, 0);
    const c = new THREE.Color(baseHex);
    for (let i = 0; i < pts.length; i++) {
      const d = (i < pts.length - 1 ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
      let nn = prevN.clone().sub(d.clone().multiplyScalar(prevN.dot(d)));
      if (nn.lengthSq() < 1e-6) nn = Math.abs(d.y) < 0.9 ? new THREE.Vector3(0, 1, 0).cross(d) : new THREE.Vector3(1, 0, 0).cross(d);
      nn.normalize();
      prevN = nn;
      const b = d.clone().cross(nn).normalize();
      for (let k = 0; k <= seg; k++) {
        const a = (k / seg) * Math.PI * 2;
        const p = pts[i].clone().addScaledVector(nn, Math.cos(a) * radii[i]).addScaledVector(b, Math.sin(a) * radii[i]);
        const shade = 0.82 + 0.28 * Math.sin(a * 3 + i);
        addVert(p.x, p.y, p.z, c.clone().multiplyScalar(shade));
      }
    }
    for (let i = 0; i < pts.length - 1; i++) {
      for (let k = 0; k < seg; k++) {
        const a = base + i * (seg + 1) + k;
        const cIdx = a + seg + 1;
        idx.push(a, cIdx, a + 1, a + 1, cIdx, cIdx + 1);
      }
    }
  };

  const stems = 3 + Math.floor(rnd() * 2);
  const crowns: { c: THREE.Vector3; r: number }[] = [];
  for (let s = 0; s < stems; s++) {
    const a = (s / stems) * Math.PI * 2 + rnd() * 0.5;
    const spread = 0.85 + rnd() * 0.55;
    const h = 2.4 + rnd() * 0.85;
    const p0 = new THREE.Vector3((rnd() - 0.5) * 0.18, -0.04, (rnd() - 0.5) * 0.18);
    const p1 = new THREE.Vector3(Math.cos(a) * spread * 0.48, h * 0.45, Math.sin(a) * spread * 0.48);
    const p2 = new THREE.Vector3(Math.cos(a) * spread, h, Math.sin(a) * spread);
    addTube([p0, p1, p2], [0.13, 0.09, 0.055], 7, 0x5c5046);
    crowns.push({ c: p2, r: 0.95 + rnd() * 0.32 });
  }
  crowns.push({ c: new THREE.Vector3(0, 3.05 + rnd() * 0.35, 0), r: 1.15 });

  const leafBase = new THREE.Color(0x37542f);
  const crimsonA = new THREE.Color(0xd6222e);
  const crimsonB = new THREE.Color(0xf2444e);
  for (const dome of crowns) {
    const count = 210;
    for (let i = 0; i < count; i++) {
      const u = rnd() * Math.PI * 2;
      const v = Math.acos(1 - 2 * rnd());
      const depth = Math.pow(rnd(), 0.28);
      const dir = new THREE.Vector3(Math.cos(u) * Math.sin(v), Math.cos(v) * 0.62, Math.sin(u) * Math.sin(v));
      const c = dome.c.clone().addScaledVector(dir, dome.r * depth);
      const isBloom = depth > 0.82 && dir.y > -0.1 && rnd() < 0.28;
      const nrm = dir.clone().normalize().add(new THREE.Vector3(rnd() - 0.5, 0.55, rnd() - 0.5).multiplyScalar(0.55)).normalize();
      const along = new THREE.Vector3(rnd() - 0.5, 0.25, rnd() - 0.5).cross(nrm).normalize();
      const side = nrm.clone().cross(along).normalize();
      const l = isBloom ? 0.085 + rnd() * 0.04 : 0.075 + rnd() * 0.035;
      const tone = isBloom
        ? crimsonA.clone().lerp(crimsonB, rnd())
        : leafBase.clone().multiplyScalar((0.55 + 0.5 * depth) * (0.85 + 0.3 * rnd()));
      const rim = tone.clone().multiplyScalar(1.1);
      const i0 = addVert(c.x - along.x * l * 0.55, c.y - along.y * l * 0.55, c.z - along.z * l * 0.55, tone);
      const i1 = addVert(c.x + side.x * l * 0.42, c.y + side.y * l * 0.42, c.z + side.z * l * 0.42, rim);
      const i2 = addVert(c.x + along.x * l, c.y + along.y * l, c.z + along.z * l, rim);
      const i3 = addVert(c.x - side.x * l * 0.42, c.y - side.y * l * 0.42, c.z - side.z * l * 0.42, rim);
      idx.push(i0, i1, i2, i0, i2, i3);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

let boulderVariants: THREE.BufferGeometry[] | null = null;
let pohutukawaVariants: THREE.BufferGeometry[] | null = null;
let boulderMat: THREE.MeshStandardMaterial | null = null;
let stepperGeo: THREE.BoxGeometry | null = null;
let clashHaloMat: THREE.LineBasicMaterial | null = null;

// ---- Scalar Brush Field + Exact Edge-Keyed Marching Squares + Chaikin + Manifold Terrain Subdivision ----

interface BrushField {
  cx: number;
  cz: number;
  spanM: number;
  res: number;
  cellM: number;
  halfM: number;
  data: Float32Array;
}

function createField(cx: number, cz: number, spanM: number, res = 176): BrushField {
  return {
    cx,
    cz,
    spanM,
    res,
    cellM: spanM / res,
    halfM: spanM * 0.5,
    data: new Float32Array((res + 1) * (res + 1)),
  };
}

function sampleField(field: BrushField, wx: number, wz: number): number {
  const { cx, cz, res, cellM, halfM, data } = field;
  const fc = (wx - cx + halfM) / cellM;
  const fr = (wz - cz + halfM) / cellM;
  if (fc <= 0 || fc >= res || fr <= 0 || fr >= res) return 0;
  const c0 = Math.floor(fc);
  const r0 = Math.floor(fr);
  const tx = fc - c0;
  const tz = fr - r0;
  const stride = res + 1;
  const v00 = data[r0 * stride + c0];
  const v10 = data[r0 * stride + c0 + 1];
  const v01 = data[(r0 + 1) * stride + c0];
  const v11 = data[(r0 + 1) * stride + c0 + 1];
  return (v00 * (1 - tx) + v10 * tx) * (1 - tz) + (v01 * (1 - tx) + v11 * tx) * tz;
}

function stampField(
  field: BrushField,
  wx: number,
  wz: number,
  radiusM: number,
  sign: 1 | -1,
  isBlocked?: (gx: number, gz: number) => boolean
): boolean {
  const { cx, cz, res, cellM, halfM, data } = field;
  const rPad = radiusM * 1.28;
  const c0 = Math.max(1, Math.floor((wx - rPad - cx + halfM) / cellM));
  const c1 = Math.min(res - 1, Math.ceil((wx + rPad - cx + halfM) / cellM));
  const r0 = Math.max(1, Math.floor((wz - rPad - cz + halfM) / cellM));
  const r1 = Math.min(res - 1, Math.ceil((wz + rPad - cz + halfM) / cellM));
  const stride = res + 1;
  let changed = false;

  for (let r = r0; r <= r1; r++) {
    const gz = cz - halfM + r * cellM;
    for (let c = c0; c <= c1; c++) {
      const gx = cx - halfM + c * cellM;
      const d = Math.hypot(gx - wx, gz - wz);
      if (d > rPad) continue;
      if (sign > 0 && isBlocked?.(gx, gz)) continue;
      const t = Math.max(0, Math.min(1, (rPad - d) / Math.max(0.16, rPad - radiusM * 0.56)));
      const w = t * t * (3 - 2 * t);
      const k = r * stride + c;
      const prev = data[k];
      const next = sign > 0 ? Math.min(1, Math.max(prev, w * 0.96)) : Math.max(0, prev - w * 0.98);
      if (Math.abs(next - prev) > 1e-4) {
        data[k] = next;
        changed = true;
      }
    }
  }
  return changed;
}

function chaikinSmooth(pts: [number, number][], passes = 2): [number, number][] {
  let cur = pts;
  for (let p = 0; p < passes; p++) {
    if (cur.length < 4) break;
    const next: [number, number][] = [];
    for (let i = 0; i < cur.length; i++) {
      const a = cur[i];
      const b = cur[(i + 1) % cur.length];
      next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    cur = next;
  }
  return cur;
}

function polySignedArea(poly: [number, number][]): number {
  let a = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const [x1, z1] = poly[i];
    const [x2, z2] = poly[(i + 1) % n];
    a += x1 * z2 - x2 * z1;
  }
  return a * 0.5;
}

function polyPerimeter(poly: [number, number][]): number {
  let p = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const [x1, z1] = poly[i];
    const [x2, z2] = poly[(i + 1) % n];
    p += Math.hypot(x2 - x1, z2 - z1);
  }
  return p;
}

function pointInPoly(x: number, z: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function distToPolyEdge(x: number, z: number, poly: [number, number][]): number {
  let minD = Infinity;
  for (let i = 0, n = poly.length; i < n; i++) {
    const [x1, z1] = poly[i];
    const [x2, z2] = poly[(i + 1) % n];
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len2 = dx * dx + dz * dz;
    const t = len2 > 1e-8 ? Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / len2)) : 0;
    const d = Math.hypot(x - (x1 + t * dx), z - (z1 + t * dz));
    if (d < minD) minD = d;
  }
  return minD;
}

interface SegNode {
  key: string;
  pt: [number, number];
}

function extractLoops(field: BrushField, iso = 0.45): [number, number][][] {
  const { cx, cz, res, cellM, halfM, data } = field;
  const stride = res + 1;
  const segs: [SegNode, SegNode][] = [];

  const interp = (v1: number, v2: number) => {
    const dv = v2 - v1;
    return Math.abs(dv) < 1e-6 ? 0.5 : Math.max(0.02, Math.min(0.98, (iso - v1) / dv));
  };

  for (let r = 0; r < res; r++) {
    const z0 = cz - halfM + r * cellM;
    const z1 = z0 + cellM;
    for (let c = 0; c < res; c++) {
      const x0 = cx - halfM + c * cellM;
      const x1 = x0 + cellM;
      const tl = data[r * stride + c];
      const tr = data[r * stride + c + 1];
      const br = data[(r + 1) * stride + c + 1];
      const bl = data[(r + 1) * stride + c];

      const mask = (tl >= iso ? 8 : 0) | (tr >= iso ? 4 : 0) | (br >= iso ? 2 : 0) | (bl >= iso ? 1 : 0);
      if (mask === 0 || mask === 15) continue;

      const top: SegNode = { key: `H:${r}:${c}`, pt: [x0 + interp(tl, tr) * cellM, z0] };
      const right: SegNode = { key: `V:${r}:${c + 1}`, pt: [x1, z0 + interp(tr, br) * cellM] };
      const bottom: SegNode = { key: `H:${r + 1}:${c}`, pt: [x0 + interp(bl, br) * cellM, z1] };
      const left: SegNode = { key: `V:${r}:${c}`, pt: [x0, z0 + interp(tl, bl) * cellM] };
      const centerHigh = 0.25 * (tl + tr + br + bl) >= iso;

      switch (mask) {
        case 1:
        case 14:
          segs.push([left, bottom]);
          break;
        case 2:
        case 13:
          segs.push([bottom, right]);
          break;
        case 3:
        case 12:
          segs.push([left, right]);
          break;
        case 4:
        case 11:
          segs.push([top, right]);
          break;
        case 5:
          if (centerHigh) segs.push([left, bottom], [top, right]);
          else segs.push([left, top], [bottom, right]);
          break;
        case 6:
        case 9:
          segs.push([top, bottom]);
          break;
        case 7:
        case 8:
          segs.push([left, top]);
          break;
        case 10:
          if (centerHigh) segs.push([left, top], [bottom, right]);
          else segs.push([top, right], [left, bottom]);
          break;
      }
    }
  }

  if (!segs.length) return [];

  const adj = new Map<string, number[]>();
  const used = new Uint8Array(segs.length);
  segs.forEach(([a, b], idx) => {
    for (const k of [a.key, b.key]) {
      let arr = adj.get(k);
      if (!arr) {
        arr = [];
        adj.set(k, arr);
      }
      arr.push(idx);
    }
  });

  const loops: [number, number][][] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const ringNodes: SegNode[] = [segs[i][0], segs[i][1]];
    let guard = 0;
    while (guard++ < 6000) {
      const tail = ringNodes[ringNodes.length - 1];
      if (ringNodes.length > 3 && tail.key === ringNodes[0].key) {
        ringNodes.pop();
        break;
      }
      const cands = adj.get(tail.key) ?? [];
      let nextIdx = -1;
      for (const ci of cands) {
        if (!used[ci]) {
          nextIdx = ci;
          break;
        }
      }
      if (nextIdx < 0) break;
      used[nextIdx] = 1;
      const [sa, sb] = segs[nextIdx];
      ringNodes.push(sa.key === tail.key ? sb : sa);
    }

    if (ringNodes.length >= 6) {
      const decimated = ringNodes.filter((_, idx) => idx % 2 === 0).map((n) => n.pt);
      if (decimated.length >= 4 && Math.abs(polySignedArea(decimated)) >= 0.32) {
        const smoothed = chaikinSmooth(decimated, 2);
        const clean: [number, number][] = [];
        for (const pt of smoothed) {
          const prev = clean[clean.length - 1];
          if (!prev || Math.hypot(pt[0] - prev[0], pt[1] - prev[1]) > 0.025) clean.push(pt);
        }
        if (clean.length >= 4 && Math.hypot(clean[0][0] - clean[clean.length - 1][0], clean[0][1] - clean[clean.length - 1][1]) <= 0.025) {
          clean.pop();
        }
        if (clean.length >= 4 && Math.abs(polySignedArea(clean)) >= 0.3) loops.push(clean);
      }
    }
  }
  return loops;
}

/** Build a watertight, terrain-draped 3D raised bed surface + extruded kerb Group from extracted loops */
function buildContouredBedGroup(
  field: BrushField,
  loops: [number, number][][],
  groundAt: (x: number, z: number) => number,
  topMat: THREE.Material,
  kerbMat: THREE.Material | null,
  opts: {
    rimLift: number;
    crownLift: number;
    uvScale: number;
    kerbHeight: number;
    kerbWidth: number;
    bedName: string;
    bedNote: string;
    kerbName?: string;
  }
): { group: THREE.Group; areaM2: number; perimeterM: number } {
  const group = new THREE.Group();
  if (!loops.length) return { group, areaM2: 0, perimeterM: 0 };

  const items = loops
    .map((pts) => ({ pts, absArea: Math.abs(polySignedArea(pts)), perim: polyPerimeter(pts) }))
    .sort((a, b) => b.absArea - a.absArea);

  const islands: { outer: [number, number][]; holes: [number, number][][]; area: number }[] = [];
  let totalPerimeter = 0;

  for (let i = 0; i < items.length; i++) {
    const cur = items[i];
    totalPerimeter += cur.perim;
    let containingCount = 0;
    let parentOuterIdx = -1;
    for (let j = 0; j < i; j++) {
      if (pointInPoly(cur.pts[0][0], cur.pts[0][1], items[j].pts)) {
        containingCount++;
        parentOuterIdx = j;
      }
    }
    if (containingCount % 2 === 1 && parentOuterIdx >= 0) {
      const parentPts = items[parentOuterIdx].pts;
      const targetIsland = islands.find((isl) => isl.outer === parentPts);
      if (targetIsland) {
        targetIsland.holes.push(cur.pts);
        targetIsland.area = Math.max(0, targetIsland.area - cur.absArea);
        continue;
      }
    }
    islands.push({ outer: cur.pts, holes: [], area: cur.absArea });
  }

  let totalArea = 0;

  for (const isl of islands) {
    totalArea += isl.area;
    const outerPts = polySignedArea(isl.outer) < 0 ? [...isl.outer].reverse() : isl.outer;
    const holePtsList = isl.holes.map((h) => (polySignedArea(h) > 0 ? [...h].reverse() : h));

    const contourV2 = outerPts.map(([x, z]) => new THREE.Vector2(x, z));
    const holesV2 = holePtsList.map((h) => h.map(([x, z]) => new THREE.Vector2(x, z)));
    const rawTris = THREE.ShapeUtils.triangulateShape(contourV2, holesV2);
    if (!rawTris.length) continue;

    const verts2D: [number, number][] = [...outerPts, ...holePtsList.flat()];
    let tris: [number, number, number][] = rawTris.map(([a, b, c]) => {
      const [ax, az] = verts2D[a];
      const [bx, bz] = verts2D[b];
      const [cx, cz] = verts2D[c];
      const cross = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
      return cross <= 0 ? [a, b, c] : [a, c, b];
    });

    const maxEdge = 1.15;
    for (let pass = 0; pass < 3; pass++) {
      const edgeMid = new Map<string, number>();
      const edgeKey = (u: number, v: number) => (u < v ? `${u}_${v}` : `${v}_${u}`);
      let splits = 0;

      for (const [a, b, c] of tris) {
        for (const [u, v] of [
          [a, b],
          [b, c],
          [c, a],
        ]) {
          const k = edgeKey(u, v);
          if (edgeMid.has(k)) continue;
          const [ux, uz] = verts2D[u];
          const [vx, vz] = verts2D[v];
          if (Math.hypot(vx - ux, vz - uz) > maxEdge) {
            verts2D.push([(ux + vx) * 0.5, (uz + vz) * 0.5]);
            edgeMid.set(k, verts2D.length - 1);
            splits++;
          }
        }
      }
      if (!splits) break;

      const nextTris: [number, number, number][] = [];
      for (const [a, b, c] of tris) {
        const m0 = edgeMid.get(edgeKey(a, b));
        const m1 = edgeMid.get(edgeKey(b, c));
        const m2 = edgeMid.get(edgeKey(c, a));
        const cnt = (m0 !== undefined ? 1 : 0) + (m1 !== undefined ? 1 : 0) + (m2 !== undefined ? 1 : 0);

        if (cnt === 0) {
          nextTris.push([a, b, c]);
        } else if (cnt === 3) {
          nextTris.push([a, m0!, m2!], [m0!, b, m1!], [m2!, m1!, c], [m0!, m1!, m2!]);
        } else if (cnt === 1) {
          if (m0 !== undefined) nextTris.push([a, m0, c], [m0, b, c]);
          else if (m1 !== undefined) nextTris.push([b, m1, a], [m1, c, a]);
          else nextTris.push([c, m2!, b], [m2!, a, b]);
        } else {
          if (m2 === undefined) nextTris.push([a, m0!, c], [m0!, m1!, c], [m0!, b, m1!]);
          else if (m0 === undefined) nextTris.push([b, m1!, a], [m1!, m2!, a], [m1!, c, m2!]);
          else nextTris.push([c, m2!, b], [m2!, m0!, b], [m2!, a, m0!]);
        }
      }
      tris = nextTris;
    }

    const posArr = new Float32Array(verts2D.length * 3);
    const uvArr = new Float32Array(verts2D.length * 2);
    for (let i = 0; i < verts2D.length; i++) {
      const [vx, vz] = verts2D[i];
      const gy = groundAt(vx, vz);
      const fv = sampleField(field, vx, vz);
      const crownT = Math.min(1, Math.max(0, (fv - 0.45) / 0.48));
      posArr[i * 3] = vx;
      posArr[i * 3 + 1] = gy + opts.rimLift + crownT * (opts.crownLift - opts.rimLift);
      posArr[i * 3 + 2] = vz;
      uvArr[i * 2] = vx * opts.uvScale;
      uvArr[i * 2 + 1] = vz * opts.uvScale;
    }

    const idxArr: number[] = [];
    for (const [a, b, c] of tris) idxArr.push(a, b, c);

    const topGeo = new THREE.BufferGeometry();
    topGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    topGeo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
    topGeo.setIndex(idxArr);
    topGeo.computeVertexNormals();

    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.receiveShadow = true;
    topMesh.castShadow = false;
    topMesh.name = opts.bedName;
    topMesh.userData = { kind: 'site', name: opts.bedName, source: 'proposed', note: opts.bedNote };
    group.add(topMesh);
  }

  if (kerbMat && opts.kerbHeight > 0.005) {
    const hw = opts.kerbWidth * 0.5;
    for (const loop of loops) {
      const n = loop.length;
      if (n < 4) continue;
      const kPos: number[] = [];
      const kUv: number[] = [];
      const kIdx: number[] = [];
      let arcLen = 0;

      for (let i = 0; i <= n; i++) {
        const curr = loop[i % n];
        const prev = loop[(i - 1 + n) % n];
        const next = loop[(i + 1) % n];
        if (i > 0) arcLen += Math.hypot(curr[0] - prev[0], curr[1] - prev[1]);

        const tx = next[0] - prev[0];
        const tz = next[1] - prev[1];
        const len = Math.hypot(tx, tz) || 1;
        let nx = -tz / len;
        let nz = tx / len;

        const fOut = sampleField(field, curr[0] + nx * 0.16, curr[1] + nz * 0.16);
        const fIn = sampleField(field, curr[0] - nx * 0.16, curr[1] - nz * 0.16);
        if (fOut > fIn) {
          nx = -nx;
          nz = -nz;
        }

        const gy = groundAt(curr[0], curr[1]);
        kPos.push(
          curr[0] - nx * hw, gy - 0.04, curr[1] - nz * hw,
          curr[0] - nx * hw, gy + opts.kerbHeight, curr[1] - nz * hw,
          curr[0] + nx * hw, gy + opts.kerbHeight, curr[1] + nz * hw,
          curr[0] + nx * hw, gy - 0.07, curr[1] + nz * hw
        );
        const u = arcLen * 0.75;
        kUv.push(u, 0, u, 0.38, u, 0.62, u, 1);
      }

      const dx = loop[1][0] - loop[0][0];
      const dz = loop[1][1] - loop[0][1];
      const onx = kPos[8] - kPos[4];
      const onz = kPos[10] - kPos[6];
      const flip = dx * onz - dz * onx > 0;

      for (let i = 0; i < n; i++) {
        const b0 = i * 4;
        const b1 = (i + 1) * 4;
        if (!flip) {
          kIdx.push(
            b0, b1, b0 + 1, b1, b1 + 1, b0 + 1,
            b0 + 1, b1 + 1, b0 + 2, b1 + 1, b1 + 2, b0 + 2,
            b0 + 2, b1 + 2, b0 + 3, b1 + 2, b1 + 3, b0 + 3
          );
        } else {
          kIdx.push(
            b0, b0 + 1, b1, b1, b0 + 1, b1 + 1,
            b0 + 1, b0 + 2, b1 + 1, b1 + 1, b0 + 2, b1 + 2,
            b0 + 2, b0 + 3, b1 + 2, b1 + 2, b0 + 3, b1 + 3
          );
        }
      }

      const kGeo = new THREE.BufferGeometry();
      kGeo.setAttribute('position', new THREE.Float32BufferAttribute(kPos, 3));
      kGeo.setAttribute('uv', new THREE.Float32BufferAttribute(kUv, 2));
      kGeo.setIndex(kIdx);
      kGeo.computeVertexNormals();

      const kMesh = new THREE.Mesh(kGeo, kerbMat);
      kMesh.castShadow = true;
      kMesh.receiveShadow = true;
      kMesh.name = opts.kerbName ?? 'garden_bed_edging';
      kMesh.userData = { kind: 'site', name: opts.kerbName ?? 'Garden bed edging', source: 'proposed', note: opts.bedNote };
      group.add(kMesh);
    }
  }

  return { group, areaM2: totalArea, perimeterM: totalPerimeter };
}

/** Build a dashed 3D amber root-zone clash halo draped onto host.groundAt(x, z) (excluded from path-traced stills) */
function buildDashedRootHalo(cx: number, cz: number, radiusM: number, groundAt: (x: number, z: number) => number): THREE.LineSegments {
  clashHaloMat ??= new THREE.LineBasicMaterial({ color: 0xe69824, transparent: true, opacity: 0.92 });
  const dashes = 28;
  const pts: number[] = [];
  for (let i = 0; i < dashes; i++) {
    const a0 = (i / dashes) * Math.PI * 2;
    const a1 = ((i + 0.56) / dashes) * Math.PI * 2;
    const x0 = cx + Math.cos(a0) * radiusM;
    const z0 = cz + Math.sin(a0) * radiusM;
    const x1 = cx + Math.cos(a1) * radiusM;
    const z1 = cz + Math.sin(a1) * radiusM;
    pts.push(x0, groundAt(x0, z0) + 0.11, z0, x1, groundAt(x1, z1) + 0.11, z1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const seg = new THREE.LineSegments(geo, clashHaloMat);
  seg.renderOrder = 11;
  seg.name = 'root_zone_clash_halo';
  return seg;
}

// ---- Main Mounted Brush Component ---------------------------------------------------------------------

interface BrushItem {
  sp: ExtendedSpecies;
  x: number;
  y: number;
  z: number;
  s: number;
  r: number;
  sunOk: boolean;
  rootClash: boolean;
}

interface SteppingPaver {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitchX: number;
  rollZ: number;
  w: number;
  d: number;
}

interface BedStampRecord {
  x: number;
  z: number;
  r: number;
  kind: BedSurfaceMode;
}

interface UndoSnapshot {
  barkData: Float32Array;
  pebbleData: Float32Array;
  pathData: Float32Array;
  items: BrushItem[];
  pavers: SteppingPaver[];
  bedRecords: BedStampRecord[];
}

export function mountNzLandscapeBrush(host: LandscapeBrushHost) {
  if (!document.getElementById('nzLsbStyle')) {
    const st = document.createElement('style');
    st.id = 'nzLsbStyle';
    st.textContent = BRUSH_CSS;
    document.head.append(st);
  }

  const paintedGroup = new THREE.Group();
  paintedGroup.name = 'nz_painted_native_flora';
  host.app.plain.add(paintedGroup);

  // Register paintedGroup as a traced layer once app.built resolves so WebGPU path-tracing renders Yr 1/4/10 beds & plants
  setTimeout(() => {
    const layers = host.app.built?.layers;
    if (layers && !layers.some((l) => l.id === 'brushed-garden')) {
      layers.push({
        id: 'brushed-garden',
        label: 'Brushed 3D garden',
        visible: true,
        object: paintedGroup,
        traced: true,
      });
    }
  }, 260);

  const bMinX = Number.isFinite(host.bounds.min.x) ? host.bounds.min.x : -10;
  const bMaxX = Number.isFinite(host.bounds.max.x) ? host.bounds.max.x : 10;
  const bMinZ = Number.isFinite(host.bounds.min.z) ? host.bounds.min.z : -10;
  const bMaxZ = Number.isFinite(host.bounds.max.z) ? host.bounds.max.z : 10;
  const bW = Math.max(6, bMaxX - bMinX);
  const bD = Math.max(6, bMaxZ - bMinZ);
  const buildingFootprintM2 = bW * bD * 0.76;
  const siteParcelM2 = Math.max(buildingFootprintM2 * 2.15, (bW + 10) * (bD + 10));

  const centerX = (bMinX + bMaxX) * 0.5;
  const centerZ = (bMinZ + bMaxZ) * 0.5;
  const spanM = Math.max(76, Math.min(180, Math.max(bW, bD) + 56));

  const barkField = createField(centerX, centerZ, spanM, 176);
  const pebbleField = createField(centerX, centerZ, spanM, 176);
  const pathField = createField(centerX, centerZ, spanM, 176);

  let items: BrushItem[] = [];
  let pavers: SteppingPaver[] = [];
  let bedRecords: BedStampRecord[] = [];
  const undoStack: UndoSnapshot[] = [];

  let active = false;
  let eraseMode = false;
  let surfaceMode: BedSurfaceMode = 'bark_corten';
  let selectedChoice: BrushSpeciesChoice = 'mix_coastal';
  let activeRoheId: RoheId = inferRoheFromLat(host.app.project?.lat);
  let growthYear: GrowthYear = 4;
  let radiusM = 1.8;
  let paintingDrag = false;
  let lastPaintTime = 0;
  let lastStrokePt: { x: number; z: number } | null = null;
  let lastPaverPt: { x: number; z: number } | null = null;

  const getRohe = () => ROHE_PROFILES.find((r) => r.id === activeRoheId) ?? ROHE_PROFILES[0];

  const baseImperviousPct = Math.min(92, Math.max(12, Math.round((buildingFootprintM2 / siteParcelM2) * 100)));
  let currentStats: BrushGardenStats = {
    areaM2: 0,
    plantCount: 0,
    boulderCount: 0,
    paverCount: 0,
    totalNzd: 0,
    permeablePct: 100 - baseImperviousPct,
    imperviousPct: baseImperviousPct,
    detentionLitres: 0,
    rootClashCount: 0,
    shadeWarnCount: 0,
    roheLabel: getRohe().label,
    growthYear,
  };

  /** NZ Southern Hemisphere solar microclimate relative to building massing (North = -Z, West = -X, South = +Z) */
  const evaluateSunZone = (wx: number, wz: number): SunZone => {
    const inSouthShadowBand =
      wz >= bMaxZ - 0.5 &&
      wz <= bMaxZ + 4.5 &&
      wx >= bMinX - 1.4 &&
      wx <= bMaxX + 1.4;
    if (inSouthShadowBand) return 'deep_shade';
    const inEastMorningBand =
      wx >= bMaxX - 0.5 &&
      wx <= bMaxX + 5.0 &&
      wz >= bMinZ - 1.0 &&
      wz <= bMaxZ + 1.0;
    if (inEastMorningBand) return 'morning_sun';
    return 'full_sun';
  };

  const isSunCompatible = (sp: ExtendedSpecies, zone: SunZone): boolean => {
    const pref = SPECIES_META[sp].sunPref;
    if (pref === 'any') return true;
    if (zone === 'deep_shade' && pref === 'sun') return false;
    return true;
  };

  const hasRootClash = (sp: ExtendedSpecies, wx: number, wz: number): boolean => {
    if (!SPECIES_META[sp].isCanopyRootRisk) return false;
    return distToBox2D(wx, wz, bMinX, bMaxX, bMinZ, bMaxZ) < 2.0;
  };

  // Expose live state for Sheet L101 (workingDrawings.ts / practiceBrandVoice.ts)
  const getExportState = (): NzGardenExportState => ({
    roheLabel: getRohe().label,
    permeablePct: currentStats.permeablePct,
    imperviousPct: currentStats.imperviousPct,
    detentionLitres: currentStats.detentionLitres,
    growthYear,
    rootClashCount: currentStats.rootClashCount,
    beds: bedRecords.map((b) => ({ x: +b.x.toFixed(2), z: +b.z.toFixed(2), r: +b.r.toFixed(2), kind: b.kind })),
    plants: items.map((it) => {
      const meta = SPECIES_META[it.sp];
      const baseDiamM = Math.sqrt(meta.canopyAreaM2 / Math.PI) * 2;
      return {
        sp: it.sp,
        x: +it.x.toFixed(2),
        z: +it.z.toFixed(2),
        s: +(baseDiamM * it.s * meta.growthScale[growthYear]).toFixed(2),
        sunOk: it.sunOk,
        rootClash: it.rootClash,
      };
    }),
  });
  (window as unknown as { __nzGardenState?: () => NzGardenExportState }).__nzGardenState = getExportState;

  // Lazy roofed-building interior mask so courtyards & decks are paintable while indoor rooms stay clear
  let indoorGrid: { x0: number; z0: number; nx: number; nz: number; mask: Uint8Array } | null = null;
  const ensureIndoorMask = () => {
    if (indoorGrid) return indoorGrid;
    const pad = 0.4;
    const x0 = bMinX - pad;
    const z0 = bMinZ - pad;
    const w = Math.max(2, bW + pad * 2);
    const d = Math.max(2, bD + pad * 2);
    const step = Math.max(0.35, Math.min(w, d) / 64);
    const nx = Math.min(96, Math.max(8, Math.ceil(w / step)));
    const nz = Math.min(96, Math.max(8, Math.ceil(d / step)));
    const raw = new Uint8Array(nx * nz);
    const rc = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    const orig = new THREE.Vector3();
    const topY = (Number.isFinite(host.bounds.max.y) ? host.bounds.max.y : 12) + 6;

    host.app.modelRoot.updateMatrixWorld(true);
    let anyHit = false;
    for (let rz = 0; rz < nz; rz++) {
      const wz = z0 + (rz + 0.5) * (d / nz);
      for (let cx = 0; cx < nx; cx++) {
        const wx = x0 + (cx + 0.5) * (w / nx);
        orig.set(wx, topY, wz);
        rc.set(orig, down);
        const hits = rc.intersectObject(host.app.modelRoot, true);
        const gY = host.groundAt(wx, wz);
        if (hits.some((h) => (h.object as THREE.Mesh).isMesh && h.point.y > gY + 1.65)) {
          raw[rz * nx + cx] = 1;
          anyHit = true;
        }
      }
    }

    const eroded = new Uint8Array(nx * nz);
    if (anyHit) {
      for (let rz = 1; rz < nz - 1; rz++) {
        for (let cx = 1; cx < nx - 1; cx++) {
          const k = rz * nx + cx;
          if (raw[k] && raw[k - 1] && raw[k + 1] && raw[k - nx] && raw[k + nx]) eroded[k] = 1;
        }
      }
    }

    indoorGrid = { x0, z0, nx, nz, mask: eroded };
    return indoorGrid;
  };

  const isInsideBuilding = (wx: number, wz: number): boolean => {
    const g = ensureIndoorMask();
    const cx = Math.floor(((wx - g.x0) / Math.max(0.01, bW + 0.8)) * g.nx);
    const rz = Math.floor(((wz - g.z0) / Math.max(0.01, bD + 0.8)) * g.nz);
    if (cx < 0 || cx >= g.nx || rz < 0 || rz >= g.nz) return false;
    return g.mask[rz * g.nx + cx] === 1;
  };

  // Dual 3D Terrain-Following Brush Ring Cursor
  const ringPts = 48;
  const outerPos = new Float32Array((ringPts + 1) * 3);
  const innerPos = new Float32Array((ringPts + 1) * 3);
  const outerGeo = new THREE.BufferGeometry();
  const innerGeo = new THREE.BufferGeometry();
  outerGeo.setAttribute('position', new THREE.BufferAttribute(outerPos, 3));
  innerGeo.setAttribute('position', new THREE.BufferAttribute(innerPos, 3));

  const outerRingMat = new THREE.LineBasicMaterial({ color: 0xf9f6f2, transparent: true, opacity: 0.92 });
  const innerRingMat = new THREE.LineBasicMaterial({ color: 0xc96f44, transparent: true, opacity: 0.78 });
  const outerRing = new THREE.Line(outerGeo, outerRingMat);
  const innerRing = new THREE.Line(innerGeo, innerRingMat);
  outerRing.visible = false;
  innerRing.visible = false;
  outerRing.renderOrder = 12;
  innerRing.renderOrder = 12;
  host.app.plain.add(outerRing, innerRing);

  let lastCursorWorld: { x: number; z: number } | null = null;
  let lastHoverSun: SunZone | null = null;

  const syncCursorStyle = () => {
    if (eraseMode) {
      outerRingMat.color.setHex(0xe37868);
      innerRingMat.color.setHex(0xf9f6f2);
    } else {
      const surf = SURFACE_MODES.find((s) => s.id === surfaceMode) ?? SURFACE_MODES[0];
      outerRingMat.color.setHex(0xf9f6f2);
      innerRingMat.color.setHex(surf.cursorHex);
    }
  };

  const updateRingAt = (wx: number, wz: number) => {
    lastCursorWorld = { x: wx, z: wz };
    const coreR = radiusM * 0.36;
    for (let i = 0; i <= ringPts; i++) {
      const a = (i / ringPts) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const ox = wx + ca * radiusM;
      const oz = wz + sa * radiusM;
      outerPos[i * 3] = ox;
      outerPos[i * 3 + 1] = host.groundAt(ox, oz) + 0.085;
      outerPos[i * 3 + 2] = oz;

      const ix = wx + ca * coreR;
      const iz = wz + sa * coreR;
      innerPos[i * 3] = ix;
      innerPos[i * 3 + 1] = host.groundAt(ix, iz) + 0.095;
      innerPos[i * 3 + 2] = iz;
    }
    outerGeo.attributes.position.needsUpdate = true;
    innerGeo.attributes.position.needsUpdate = true;
    outerGeo.computeBoundingSphere();
    innerGeo.computeBoundingSphere();

    const sunZone = evaluateSunZone(wx, wz);
    if (sunZone !== lastHoverSun) {
      lastHoverSun = sunZone;
      const sunEl = wrap.querySelector<HTMLElement>('[data-lsb-sun-pill]');
      if (sunEl) {
        sunEl.textContent =
          sunZone === 'deep_shade'
            ? '◐ South Shade'
            : sunZone === 'morning_sun'
              ? '☀ Morning Sun (E)'
              : '☀ Full Sun (N/W)';
      }
    }
  };

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hitPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const tmpHit = new THREE.Vector3();

  const screenToGround = (ev: PointerEvent): { x: number; z: number } | null => {
    const rect = host.app.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, host.app.camera);

    const groundLayer = host.app.built?.layers?.find((l) => l.id === 'ground' && l.visible && l.object);
    if (groundLayer?.object) {
      const hits = raycaster.intersectObject(groundLayer.object, true);
      const meshHit = hits.find((h) => (h.object as THREE.Mesh).isMesh);
      if (meshHit) return { x: meshHit.point.x, z: meshHit.point.z };
    }

    let estH = host.groundAt(centerX, centerZ);
    for (let iter = 0; iter < 3; iter++) {
      hitPlane.constant = -estH;
      if (!raycaster.ray.intersectPlane(hitPlane, tmpHit)) return null;
      estH = host.groundAt(tmpHit.x, tmpHit.z);
    }
    return { x: tmpHit.x, z: tmpHit.z };
  };

  const pushSnapshot = () => {
    undoStack.push({
      barkData: new Float32Array(barkField.data),
      pebbleData: new Float32Array(pebbleField.data),
      pathData: new Float32Array(pathField.data),
      items: items.map((p) => ({ ...p })),
      pavers: pavers.map((pv) => ({ ...pv })),
      bedRecords: bedRecords.map((b) => ({ ...b })),
    });
    if (undoStack.length > 25) undoStack.shift();
  };

  const disposeChildGeometries = (root: THREE.Object3D) => {
    const sharedSet = new Set<THREE.BufferGeometry>([
      ...(boulderVariants ?? []),
      ...(pohutukawaVariants ?? []),
      ...(stepperGeo ? [stepperGeo] : []),
    ]);
    root.traverse((o) => {
      const m = o as THREE.Mesh | THREE.LineSegments;
      if ((m as THREE.Mesh).isMesh && m.geometry && !sharedSet.has(m.geometry)) {
        m.geometry.dispose();
      } else if ((m as THREE.LineSegments).isLineSegments && m.geometry) {
        m.geometry.dispose();
      }
    });
  };

  const rebuildPaintedMeshes = () => {
    while (paintedGroup.children.length) {
      const ch = paintedGroup.children[0];
      paintedGroup.remove(ch);
      disposeChildGeometries(ch);
    }

    const mats = getHardscapeMaterials();

    // 1. Contoured Daltons Bark + Straightcurve Corten Steel Beds
    const barkLoops = extractLoops(barkField, 0.45);
    const barkBuilt = buildContouredBedGroup(barkField, barkLoops, host.groundAt, mats.barkMat, mats.cortenMat, {
      rimLift: 0.032,
      crownLift: 0.072,
      uvScale: 0.62,
      kerbHeight: 0.115,
      kerbWidth: 0.03,
      bedName: 'Daltons Composted Bark Garden Bed',
      kerbName: 'Straightcurve Corten Steel Edging (115 mm)',
      bedNote: 'Hand-brushed 3D Daltons dark composted bark bed with weathered Corten steel kerb — proposed.',
    });
    if (barkBuilt.group.children.length) paintedGroup.add(barkBuilt.group);

    // 2. Contoured Waikato River Pebble + Charred Macrocarpa Sleeper Beds
    const pebbleLoops = extractLoops(pebbleField, 0.45);
    const pebbleBuilt = buildContouredBedGroup(pebbleField, pebbleLoops, host.groundAt, mats.pebbleMat, mats.macrocarpaMat, {
      rimLift: 0.035,
      crownLift: 0.062,
      uvScale: 0.72,
      kerbHeight: 0.135,
      kerbWidth: 0.115,
      bedName: 'Waikato River Pebble Bed',
      kerbName: 'Charred NZ Macrocarpa Sleeper Kerb',
      bedNote: 'Hand-brushed 3D Waikato 20–40 mm river pebble bed with charred Macrocarpa sleeper edge — proposed.',
    });
    if (pebbleBuilt.group.children.length) paintedGroup.add(pebbleBuilt.group);

    // 3. Firth Black Sands Permeable Aggregate Base + Architectural Stepping Pavers
    const pathLoops = extractLoops(pathField, 0.45);
    const pathBuilt = buildContouredBedGroup(pathField, pathLoops, host.groundAt, mats.scoriaBaseMat, null, {
      rimLift: 0.012,
      crownLift: 0.022,
      uvScale: 0.85,
      kerbHeight: 0,
      kerbWidth: 0,
      bedName: 'Permeable Dark Scoria Fines Path',
      bedNote: 'Permeable dark volcanic aggregate base beneath Firth Black Sands pavers — proposed.',
    });
    if (pathBuilt.group.children.length) paintedGroup.add(pathBuilt.group);

    if (pavers.length > 0) {
      stepperGeo ??= new THREE.BoxGeometry(1, 0.044, 1);
      const pvMesh = new THREE.InstancedMesh(stepperGeo, mats.firthPaverMat, pavers.length);
      const dummy = new THREE.Object3D();
      pavers.forEach((pv, idx) => {
        dummy.position.set(pv.x, pv.y + 0.026, pv.z);
        dummy.rotation.set(pv.pitchX, pv.yaw, pv.rollZ, 'YXZ');
        dummy.scale.set(pv.w, 1, pv.d);
        dummy.updateMatrix();
        pvMesh.setMatrixAt(idx, dummy.matrix);
      });
      pvMesh.instanceMatrix.needsUpdate = true;
      pvMesh.computeBoundingSphere();
      pvMesh.castShadow = true;
      pvMesh.receiveShadow = true;
      pvMesh.name = 'firth_black_sands_pavers';
      pvMesh.userData = {
        kind: 'site',
        name: 'Firth Piazza Black Sands Stepping Pavers',
        material: 'Honed Black Sands architectural concrete paver',
        source: 'proposed',
        note: 'Firth Black Sands architectural stepping path draped to site contours — proposed.',
      };
      paintedGroup.add(pvMesh);
    }

    // 4. Instanced 3D NZ Native Flora (scaled by Yr 1 / Yr 4 / Yr 10 maturity) + Pōhutukawa + Mossy Boulders + Root Clash Halos
    const stdPlacements: Placement[] = [];
    const pohutukawas: BrushItem[] = [];
    const boulders: BrushItem[] = [];
    let rootClashCount = 0;
    let shadeWarnCount = 0;

    for (const it of items) {
      const yrScale = SPECIES_META[it.sp].growthScale[growthYear];
      const scaled = it.s * yrScale;
      if (!it.sunOk) shadeWarnCount++;
      if (it.rootClash) {
        rootClashCount++;
        paintedGroup.add(buildDashedRootHalo(it.x, it.z, 1.85, host.groundAt));
      }

      if (it.sp === 'boulder') boulders.push(it);
      else if (it.sp === 'pohutukawa') pohutukawas.push({ ...it, s: scaled });
      else stdPlacements.push({ sp: it.sp, x: it.x, y: it.y, z: it.z, s: scaled, r: it.r });
    }

    if (stdPlacements.length > 0) {
      paintedGroup.add(planting(stdPlacements, `Hand-brushed Aotearoa native planting (${getRohe().label}, Yr ${growthYear}) — proposed.`));
    }

    if (pohutukawas.length > 0) {
      pohutukawaVariants ??= [101, 211, 307].map((s) => buildPohutukawaGeo(s));
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      pohutukawaVariants.forEach((geo, vi) => {
        const sub = pohutukawas.filter((_, idx) => idx % pohutukawaVariants!.length === vi);
        if (!sub.length) return;
        const im = new THREE.InstancedMesh(geo, plantMaterial(), sub.length);
        sub.forEach((p, idx) => {
          q.setFromAxisAngle(up, p.r);
          m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.s, p.s, p.s));
          im.setMatrixAt(idx, m);
        });
        im.instanceMatrix.needsUpdate = true;
        im.computeBoundingSphere();
        im.castShadow = true;
        im.receiveShadow = true;
        im.name = `pohutukawa_${vi}`;
        im.userData = {
          kind: 'planting',
          name: 'Pōhutukawa (Metrosideros excelsa)',
          source: 'proposed',
          note: `Coastal multi-stemmed Pōhutukawa canopy specimen (Yr ${growthYear}) — proposed.`,
        };
        paintedGroup.add(im);
      });
    }

    if (boulders.length > 0) {
      boulderVariants ??= [41, 83, 127].map((s) => buildVolcanicBoulderGeo(s));
      boulderMat ??= new THREE.MeshStandardMaterial({
        name: 'mossy_volcanic_basalt',
        vertexColors: true,
        roughness: 0.88,
        metalness: 0.04,
      });
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      boulderVariants.forEach((geo, vi) => {
        const sub = boulders.filter((_, idx) => idx % boulderVariants!.length === vi);
        if (!sub.length) return;
        const im = new THREE.InstancedMesh(geo, boulderMat!, sub.length);
        sub.forEach((p, idx) => {
          q.setFromAxisAngle(up, p.r);
          m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.s, p.s, p.s));
          im.setMatrixAt(idx, m);
        });
        im.instanceMatrix.needsUpdate = true;
        im.computeBoundingSphere();
        im.castShadow = true;
        im.receiveShadow = true;
        im.name = `mossy_boulder_${vi}`;
        im.userData = {
          kind: 'site',
          name: 'Kōhatu / Mossy Volcanic Basalt Boulder',
          source: 'proposed',
          note: 'Local volcanic basalt feature stone with native cushion moss — proposed skink habitat.',
        };
        paintedGroup.add(im);
      });
    }

    // 5. Compute Garden Area (m²), Council Permeable/Impervious %, NZBC E1 Detention (L), Plant Count & $ NZD
    const paverHardM2 = pavers.length * 0.30;
    const hardscapeArea = barkBuilt.areaM2 + pebbleBuilt.areaM2 + Math.max(pathBuilt.areaM2, paverHardM2);
    let openPlantArea = 0;
    let plantSpongeL = 0;
    for (const it of items) {
      const meta = SPECIES_META[it.sp];
      plantSpongeL += meta.spongeLitres;
      const inBed = sampleField(barkField, it.x, it.z) >= 0.42 || sampleField(pebbleField, it.x, it.z) >= 0.42;
      if (!inBed) openPlantArea += meta.canopyAreaM2 * 0.68;
    }
    const totalAreaM2 = +(hardscapeArea + openPlantArea).toFixed(1);

    const imperviousM2 = buildingFootprintM2 + paverHardM2;
    const imperviousPct = Math.min(98, Math.max(8, Math.round((imperviousM2 / siteParcelM2) * 100)));
    const permeablePct = 100 - imperviousPct;
    const detentionLitres = Math.round(
      barkBuilt.areaM2 * 22 + pebbleBuilt.areaM2 * 18 + Math.max(0, pathBuilt.areaM2 - paverHardM2) * 10 + plantSpongeL
    );

    const plantCount = items.filter((i) => i.sp !== 'boulder').length;
    const boulderCount = boulders.length;
    const paverCount = pavers.length;

    const plantsNzd = items.reduce((acc, it) => acc + SPECIES_META[it.sp].rateNzd, 0);
    const barkNzd = barkBuilt.areaM2 * 18 + barkBuilt.perimeterM * 68;
    const pebbleNzd = pebbleBuilt.areaM2 * 32 + pebbleBuilt.perimeterM * 74;
    const pathNzd = Math.max(pathBuilt.areaM2 * 62, pavers.length * 44);
    const totalNzd = Math.round(plantsNzd + barkNzd + pebbleNzd + pathNzd);

    currentStats = {
      areaM2: totalAreaM2,
      plantCount,
      boulderCount,
      paverCount,
      totalNzd,
      permeablePct,
      imperviousPct,
      detentionLitres,
      rootClashCount,
      shadeWarnCount,
      roheLabel: getRohe().label,
      growthYear,
    };
    updateSummaryUI();
    host.onStatsChange?.(currentStats);
  };

  /** Choose species from curated mix respecting NZ solar shade, regional Rohe provenance, border-to-core zoning & Piet Oudolf noise2D clumping */
  const pickCuratedSpecies = (mix: CuratedMix, px: number, pz: number, edgeDistM: number, sunZone: SunZone): ExtendedSpecies => {
    const rohe = getRohe();
    // In deep south shade, blend in authentic shade-tolerant bush glade companions even if user picked a sun mix
    const baseEntries =
      sunZone === 'deep_shade'
        ? [
            ...mix.entries,
            { sp: 'fern' as ExtendedSpecies, weight: 0.28 },
            { sp: 'ponga' as ExtendedSpecies, weight: 0.16 },
            { sp: 'nikau' as ExtendedSpecies, weight: 0.12 },
            { sp: 'kawakawa' as ExtendedSpecies, weight: 0.14 },
          ]
        : mix.entries;

    let bestSp: ExtendedSpecies = baseEntries[0].sp;
    let bestScore = -1e9;

    for (let i = 0; i < baseEntries.length; i++) {
      const entry = baseEntries[i];
      const meta = SPECIES_META[entry.sp];
      let zoneMult = 1.0;
      if (meta.zone === 'border') {
        zoneMult = edgeDistM < 0.78 ? 2.25 : edgeDistM < 1.55 ? 0.95 : 0.38;
      } else if (meta.zone === 'core') {
        zoneMult = edgeDistM < 0.48 ? 0.06 : edgeDistM < 1.05 ? 0.72 : 2.25;
      } else {
        zoneMult = edgeDistM < 0.32 ? 0.5 : 1.28;
      }

      // Solar microclimate weighting (NZ Southern Hemisphere)
      let sunMult = 1.0;
      if (sunZone === 'deep_shade') {
        sunMult = meta.sunPref === 'shade' ? 2.4 : meta.sunPref === 'any' ? 1.1 : 0.12;
      } else if (sunZone === 'full_sun') {
        sunMult = meta.sunPref === 'sun' ? 1.55 : meta.sunPref === 'any' ? 1.15 : 0.28;
      } else {
        sunMult = 1.1;
      }

      // Regional eco-sourced Rohe weighting
      let roheMult = 1.0;
      if (rohe.favored.includes(entry.sp)) roheMult = 1.45;
      else if (rohe.cautioned.includes(entry.sp)) roheMult = 0.22;

      const drift = noise2D(px * 0.44 + i * 17.3, pz * 0.44 + i * 29.7);
      const score = Math.log(Math.max(0.005, entry.weight * zoneMult * sunMult * roheMult)) * 0.54 + drift * 1.15 + Math.random() * 0.24;
      if (score > bestScore) {
        bestScore = score;
        bestSp = entry.sp;
      }
    }
    return bestSp;
  };

  const placeSteppingPaversAt = (wx: number, wz: number): boolean => {
    if (isInsideBuilding(wx, wz)) return false;
    const minStride = 0.62;
    if (lastPaverPt && Math.hypot(wx - lastPaverPt.x, wz - lastPaverPt.z) < minStride) return false;
    if (pavers.some((pv) => Math.hypot(pv.x - wx, pv.z - wz) < 0.48)) return false;

    const yaw =
      lastStrokePt && Math.hypot(wx - lastStrokePt.x, wz - lastStrokePt.z) > 0.06
        ? Math.atan2(wx - lastStrokePt.x, wz - lastStrokePt.z)
        : 0;

    const addSlab = (sx: number, sz: number, w: number, d: number) => {
      if (isInsideBuilding(sx, sz)) return;
      const gy = host.groundAt(sx, sz);
      const eps = 0.25;
      const gx1 = host.groundAt(sx + eps, sz);
      const gx0 = host.groundAt(sx - eps, sz);
      const gz1 = host.groundAt(sx, sz + eps);
      const gz0 = host.groundAt(sx, sz - eps);
      const slopeX = Math.max(-0.28, Math.min(0.28, (gx1 - gx0) / (2 * eps)));
      const slopeZ = Math.max(-0.28, Math.min(0.28, (gz1 - gz0) / (2 * eps)));
      pavers.push({
        x: sx,
        y: gy,
        z: sz,
        yaw: yaw + (Math.random() - 0.5) * 0.05,
        pitchX: -slopeZ * Math.cos(yaw) - slopeX * Math.sin(yaw),
        rollZ: slopeX * Math.cos(yaw) - slopeZ * Math.sin(yaw),
        w,
        d,
      });
    };

    if (radiusM >= 2.2) {
      const perpX = Math.cos(yaw);
      const perpZ = -Math.sin(yaw);
      addSlab(wx - perpX * 0.34, wz - perpZ * 0.34, 0.62, 0.44);
      addSlab(wx + perpX * 0.34, wz + perpZ * 0.34, 0.62, 0.44);
    } else {
      addSlab(wx, wz, 0.66, 0.44);
    }
    lastPaverPt = { x: wx, z: wz };
    return true;
  };

  const applyBrushAt = (cx: number, cz: number) => {
    if (eraseMode) {
      const c1 = stampField(barkField, cx, cz, radiusM, -1);
      const c2 = stampField(pebbleField, cx, cz, radiusM, -1);
      const c3 = stampField(pathField, cx, cz, radiusM, -1);
      const r2 = radiusM * radiusM;
      const prevItems = items.length;
      const prevPavers = pavers.length;
      const prevBeds = bedRecords.length;
      items = items.filter((it) => (it.x - cx) ** 2 + (it.z - cz) ** 2 > r2);
      pavers = pavers.filter((pv) => (pv.x - cx) ** 2 + (pv.z - cz) ** 2 > r2);
      bedRecords = bedRecords.filter((b) => (b.x - cx) ** 2 + (b.z - cz) ** 2 > r2 * 0.85);
      if (c1 || c2 || c3 || items.length !== prevItems || pavers.length !== prevPavers || bedRecords.length !== prevBeds) {
        rebuildPaintedMeshes();
      }
      lastStrokePt = { x: cx, z: cz };
      return;
    }

    let dirty = false;

    // 1. Stamp smooth merged bed or hardscape surface base
    if (surfaceMode === 'bark_corten') {
      if (stampField(barkField, cx, cz, radiusM, 1, isInsideBuilding)) dirty = true;
      if (stampField(pebbleField, cx, cz, radiusM * 0.92, -1)) dirty = true;
      if (!isInsideBuilding(cx, cz) && !bedRecords.some((b) => b.kind === 'bark_corten' && Math.hypot(b.x - cx, b.z - cz) < radiusM * 0.55)) {
        bedRecords.push({ x: cx, z: cz, r: radiusM, kind: 'bark_corten' });
      }
    } else if (surfaceMode === 'pebble_macrocarpa') {
      if (stampField(pebbleField, cx, cz, radiusM, 1, isInsideBuilding)) dirty = true;
      if (stampField(barkField, cx, cz, radiusM * 0.92, -1)) dirty = true;
      if (!isInsideBuilding(cx, cz) && !bedRecords.some((b) => b.kind === 'pebble_macrocarpa' && Math.hypot(b.x - cx, b.z - cz) < radiusM * 0.55)) {
        bedRecords.push({ x: cx, z: cz, r: radiusM, kind: 'pebble_macrocarpa' });
      }
    } else if (surfaceMode === 'firth_path') {
      const pathR = Math.max(0.55, Math.min(1.35, radiusM * 0.58));
      if (stampField(pathField, cx, cz, pathR, 1, isInsideBuilding)) dirty = true;
      if (placeSteppingPaversAt(cx, cz)) dirty = true;
      if (!isInsideBuilding(cx, cz) && !bedRecords.some((b) => b.kind === 'firth_path' && Math.hypot(b.x - cx, b.z - cz) < pathR * 0.7)) {
        bedRecords.push({ x: cx, z: cz, r: pathR, kind: 'firth_path' });
      }
    }

    // 2. Place naturalistic NZ native species / curated ecological mix
    if (selectedChoice !== 'none') {
      const mix = CURATED_MIXES.find((m) => m.id === selectedChoice) ?? null;
      const isPathMode = surfaceMode === 'firth_path';
      const burst = isPathMode
        ? Math.random() < 0.55 ? 1 : 0
        : radiusM <= 1.0
          ? 2
          : Math.min(8, Math.round(radiusM * 2.4));

      const activeLoops =
        surfaceMode === 'bark_corten'
          ? extractLoops(barkField, 0.45)
          : surfaceMode === 'pebble_macrocarpa'
            ? extractLoops(pebbleField, 0.45)
            : [];

      for (let k = 0; k < burst; k++) {
        const ang = Math.random() * Math.PI * 2;
        const radialFrac = isPathMode
          ? 0.68 + Math.random() * 0.28
          : k === 0 && burst <= 2
            ? Math.random() * 0.25
            : Math.sqrt(Math.random()) * 0.86;
        const dist = radialFrac * radiusM;
        const px = cx + Math.cos(ang) * dist;
        const pz = cz + Math.sin(ang) * dist;

        if (isInsideBuilding(px, pz)) continue;
        if (pavers.some((pv) => Math.hypot(pv.x - px, pv.z - pz) < 0.52)) continue;

        let edgeDist = Math.max(0.15, (1 - radialFrac) * radiusM);
        if (activeLoops.length > 0) {
          let bestEdge = Infinity;
          let insideAny = false;
          for (const lp of activeLoops) {
            if (pointInPoly(px, pz, lp)) {
              insideAny = true;
              bestEdge = Math.min(bestEdge, distToPolyEdge(px, pz, lp));
            }
          }
          if (!insideAny || bestEdge < 0.18) continue;
          edgeDist = bestEdge;
        }

        const sunZone = evaluateSunZone(px, pz);
        let sp: ExtendedSpecies;
        if (mix) {
          sp = isPathMode
            ? Math.random() < 0.22 ? 'boulder' : sunZone === 'deep_shade' || Math.random() < 0.5 ? 'fern' : 'carex'
            : pickCuratedSpecies(mix, px, pz, edgeDist, sunZone);
        } else {
          sp = selectedChoice as ExtendedSpecies;
        }

        const meta = SPECIES_META[sp];
        if (items.some((o) => Math.hypot(o.x - px, o.z - pz) < Math.max(meta.minGap * 0.82, SPECIES_META[o.sp].minGap * 0.66))) {
          continue;
        }

        const coreBoost = mix ? Math.min(0.22, edgeDist * 0.1) : 0.06;
        const bedLift =
          sampleField(barkField, px, pz) >= 0.45
            ? 0.035
            : sampleField(pebbleField, px, pz) >= 0.45
              ? 0.032
              : 0;

        items.push({
          sp,
          x: px,
          y: host.groundAt(px, pz) + bedLift - 0.025,
          z: pz,
          s: 0.78 + coreBoost + Math.random() * 0.28,
          r: Math.random() * Math.PI * 2,
          sunOk: isSunCompatible(sp, sunZone),
          rootClash: hasRootClash(sp, px, pz),
        });
        dirty = true;
      }
    }

    lastStrokePt = { x: cx, z: cz };
    if (dirty) rebuildPaintedMeshes();
  };

  const setActive = (on: boolean) => {
    active = on;
    outerRing.visible = on;
    innerRing.visible = on;
    host.app.controls.enabled = !on;
    const toggleBtn = wrap.querySelector<HTMLButtonElement>('[data-lsb-toggle]');
    if (toggleBtn) toggleBtn.setAttribute('aria-pressed', String(on));
    const drawer = wrap.querySelector<HTMLElement>('[data-lsb-drawer]');
    if (drawer) drawer.hidden = !on;
    updateSummaryUI();

    if (on) {
      ensureIndoorMask();
      syncCursorStyle();
      host.app.pickHook = () => true;
      host.app.log('NZ 3D Garden & Hardscape Brush active — drag on site plan or ground (E to toggle Erase, Esc to Orbit).');
    } else if (host.app.pickHook) {
      host.app.pickHook = null;
      paintingDrag = false;
    }
  };

  host.app.canvas.addEventListener('pointermove', (ev) => {
    if (!active) return;
    const pt = screenToGround(ev);
    if (!pt) return;
    updateRingAt(pt.x, pt.z);
    if (!paintingDrag) return;

    const now = performance.now();
    const stepTarget = surfaceMode === 'firth_path' ? 0.32 : Math.max(0.28, radiusM * 0.34);
    const dist = lastStrokePt ? Math.hypot(pt.x - lastStrokePt.x, pt.z - lastStrokePt.z) : Infinity;
    if (dist < stepTarget && now - lastPaintTime < 55) return;

    lastPaintTime = now;
    if (lastStrokePt && dist > stepTarget * 1.4 && dist < 14) {
      const steps = Math.min(10, Math.ceil(dist / stepTarget));
      const sx = lastStrokePt.x;
      const sz = lastStrokePt.z;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        applyBrushAt(sx + (pt.x - sx) * t, sz + (pt.z - sz) * t);
      }
    } else {
      applyBrushAt(pt.x, pt.z);
    }
  });

  host.app.canvas.addEventListener('pointerdown', (ev) => {
    if (!active || ev.button !== 0) return;
    const pt = screenToGround(ev);
    if (!pt) return;
    paintingDrag = true;
    lastStrokePt = null;
    lastPaverPt = null;
    pushSnapshot();
    lastPaintTime = performance.now();
    updateRingAt(pt.x, pt.z);
    applyBrushAt(pt.x, pt.z);
  });

  window.addEventListener('pointerup', () => {
    paintingDrag = false;
    lastStrokePt = null;
    lastPaverPt = null;
  });

  window.addEventListener('keydown', (ev) => {
    if (!active) return;
    const tag = (ev.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (ev.key === 'Escape') {
      setActive(false);
    } else if (ev.key === 'e' || ev.key === 'E') {
      eraseMode = !eraseMode;
      syncEraseBtn();
      syncCursorStyle();
    } else if (ev.key === '[' || ev.key === ']') {
      radiusM = Math.max(0.6, Math.min(4.5, +(radiusM + (ev.key === ']' ? 0.2 : -0.2)).toFixed(1)));
      const slider = wrap.querySelector<HTMLInputElement>('[data-lsb-rad]');
      if (slider) slider.value = String(radiusM);
      const out = wrap.querySelector('[data-lsb-rad-out]');
      if (out) out.textContent = `${radiusM.toFixed(1)}m`;
      if (lastCursorWorld) updateRingAt(lastCursorWorld.x, lastCursorWorld.z);
    }
  });

  // ---- Drawer UI inside Palette & Cost (#nzSpecCard) --------------------------------------------------

  const wrap = document.createElement('div');
  wrap.className = 'lsb-wrap';
  wrap.innerHTML = `
    <div class="lsb-top-row">
      <button type="button" class="pill lsb-btn-brush" data-lsb-toggle aria-pressed="false" title="Brush 3D Corten/Macrocarpa beds, Firth pavers &amp; New Zealand native plants directly onto the site plan or ground">Brush 3D Garden</button>
      <a class="pill lsb-studio-link" href="/landscape/?mode=siteplan" target="_blank" rel="noopener" title="Open the full Aotearoa 3D Site-Plan &amp; Landscape Studio">Full Site-Plan Studio ↗</a>
    </div>
    <div class="lsb-mini-pill" data-lsb-closed-pill hidden></div>
    <div class="lsb-drawer" data-lsb-drawer hidden>
      <div>
        <div class="lsb-kicker" style="margin-bottom:5px">1 · Bed &amp; NZ Hardscape Base</div>
        <div class="lsb-surf-grid" role="group" aria-label="Garden bed and hardscape surface base">
          ${SURFACE_MODES.map(
            (s) => `
            <button type="button" class="lsb-surf-btn" data-lsb-surf="${s.id}" aria-pressed="${s.id === surfaceMode}" title="${s.label} — ${s.supplierSpec}">
              <span class="lsb-surf-dot" style="background:${s.swatchBg};border:2.5px solid ${s.swatchRing}" aria-hidden="true"></span>
              <span>${s.shortLabel}</span>
            </button>`
          ).join('')}
        </div>
      </div>

      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
          <span class="lsb-kicker">2 · Eco-Sourced Rohe &amp; Planting Mix</span>
          <span class="lsb-badge" data-lsb-sun-pill title="Live Southern Hemisphere solar aspect under cursor">☀ Solar-Aware</span>
        </div>
        <select class="lsb-select" data-lsb-rohe aria-label="Eco-Sourced Regional Rohe" style="margin-bottom:5px">
          ${ROHE_PROFILES.map((r) => `<option value="${r.id}"${r.id === activeRoheId ? ' selected' : ''}>Rohe: ${r.label}</option>`).join('')}
        </select>
        <div class="small" style="color:#654A4E;font-size:10.5px;margin-bottom:6px" data-lsb-rohe-note>${getRohe().nurseryNote}</div>
        <select class="lsb-select" data-lsb-sp aria-label="NZ Native Planting Mix or Species">
          <optgroup label="Curated NZ Ecological Mixes (Solar &amp; Drift Clumped)">
            ${CURATED_MIXES.map((m) => `<option value="${m.id}">${m.label}</option>`).join('')}
          </optgroup>
          <optgroup label="Individual NZ Species &amp; Volcanic Stone">
            ${INDIVIDUAL_OPTIONS.map((o) => `<option value="${o.id}">${o.label}</option>`).join('')}
          </optgroup>
        </select>
        <div class="lsb-swatches" style="margin-top:5px">
          <span class="lsb-swatch-bar" data-lsb-swatches></span>
          <span class="small" style="color:#654A4E;font-size:11px" data-lsb-mix-note></span>
        </div>
      </div>

      <div class="lsb-yr-row">
        <span class="lsb-kicker">3 · Growth Maturity</span>
        <div class="lsb-yr-group" role="group" aria-label="Path-traced multi-year canopy maturity">
          ${([1, 4, 10] as GrowthYear[]).map((yr) => `<button type="button" class="lsb-yr-btn" data-lsb-yr="${yr}" aria-pressed="${yr === growthYear}">Yr ${yr}</button>`).join('')}
        </div>
      </div>

      <label class="small" style="display:flex;align-items:center;gap:8px;color:#240B21">
        <span style="font-weight:500">Brush Radius</span>
        <input type="range" data-lsb-rad min="0.6" max="4.5" step="0.2" value="1.8" style="flex:1;accent-color:#240B21" />
        <output class="mono small" data-lsb-rad-out>1.8m</output>
      </label>

      <div class="lsb-stats" aria-live="polite" data-lsb-summary>
        <div>
          <div class="lsb-stat-lbl">Garden Area</div>
          <div class="lsb-stat-val" data-lsb-area>0.0 m²</div>
        </div>
        <div>
          <div class="lsb-stat-lbl">Flora / Stone</div>
          <div class="lsb-stat-val" data-lsb-count>0 plants</div>
        </div>
        <div>
          <div class="lsb-stat-lbl">Indicative</div>
          <div class="lsb-stat-val" data-lsb-cost>$0 NZD</div>
        </div>
      </div>

      <div class="lsb-e1-box" aria-live="polite">
        <div class="lsb-e1-row">
          <span data-lsb-perm-txt>Permeable ${currentStats.permeablePct}% · Impervious ${currentStats.imperviousPct}%</span>
          <span data-lsb-e1-l>E1: 0 L</span>
        </div>
        <div class="lsb-e1-track" aria-hidden="true">
          <div class="lsb-e1-perm" data-lsb-perm-bar style="width:${currentStats.permeablePct}%"></div>
        </div>
        <div class="lsb-badge-row">
          <span class="lsb-badge is-ok" data-lsb-council-badge>✓ Unitary Plan OK (≤60% imp)</span>
          <span class="lsb-badge is-ok" data-lsb-clash-badge>✓ 0 root clashes</span>
          <span class="lsb-badge is-warn" data-lsb-shade-badge hidden></span>
        </div>
      </div>

      <div class="row wrap" style="justify-content:space-between">
        <div class="row wrap" style="gap:5px">
          <button type="button" class="pill lsb-erase-btn" data-lsb-erase aria-pressed="false" title="Toggle Erase mode (shortcut: E) to carve back beds, pavers &amp; plants">Erase</button>
          <button type="button" class="pill" data-lsb-undo title="Undo last brush stroke">Undo</button>
          <button type="button" class="pill" data-lsb-clear title="Clear all brushed beds, pavers &amp; plants">Clear</button>
        </div>
        <button type="button" class="pill solid" data-lsb-done>Done (Orbit)</button>
      </div>
    </div>
  `;

  const syncMixSwatches = () => {
    const bar = wrap.querySelector<HTMLElement>('[data-lsb-swatches]');
    const note = wrap.querySelector<HTMLElement>('[data-lsb-mix-note]');
    if (!bar || !note) return;
    const mix = CURATED_MIXES.find((m) => m.id === selectedChoice);
    if (mix) {
      bar.innerHTML = mix.swatches.map((hex) => `<span class="lsb-swatch-chip" style="background:${hex}"></span>`).join('');
      note.textContent = 'Shade + border-to-core drift';
    } else if (selectedChoice === 'none') {
      const surf = SURFACE_MODES.find((s) => s.id === surfaceMode) ?? SURFACE_MODES[0];
      bar.innerHTML = `<span class="lsb-swatch-chip" style="background:${surf.swatchBg}"></span>`;
      note.textContent = surf.ratePerM2 > 0 ? `$${surf.ratePerM2}/m² hardscape base` : 'No plants selected';
    } else {
      const meta = SPECIES_META[selectedChoice as ExtendedSpecies];
      bar.innerHTML = `<span class="lsb-swatch-chip" style="background:${meta.swatch}"></span>`;
      note.textContent = `${meta.grade} · $${meta.rateNzd} NZD ea`;
    }
  };

  const syncEraseBtn = () => {
    const btn = wrap.querySelector<HTMLButtonElement>('[data-lsb-erase]');
    if (btn) {
      btn.setAttribute('aria-pressed', String(eraseMode));
      btn.textContent = eraseMode ? 'Erasing ✓' : 'Erase';
    }
  };

  function updateSummaryUI() {
    const areaEl = wrap.querySelector('[data-lsb-area]');
    const cntEl = wrap.querySelector('[data-lsb-count]');
    const costEl = wrap.querySelector('[data-lsb-cost]');
    const permTxt = wrap.querySelector('[data-lsb-perm-txt]');
    const e1El = wrap.querySelector('[data-lsb-e1-l]');
    const permBar = wrap.querySelector<HTMLElement>('[data-lsb-perm-bar]');
    const councilBadge = wrap.querySelector<HTMLElement>('[data-lsb-council-badge]');
    const clashBadge = wrap.querySelector<HTMLElement>('[data-lsb-clash-badge]');
    const shadeBadge = wrap.querySelector<HTMLElement>('[data-lsb-shade-badge]');
    const closedPill = wrap.querySelector<HTMLElement>('[data-lsb-closed-pill]');

    if (areaEl) areaEl.textContent = `${currentStats.areaM2.toFixed(1)} m²`;
    if (cntEl) {
      const extras =
        currentStats.paverCount > 0
          ? ` · ${currentStats.paverCount} pv`
          : currentStats.boulderCount > 0
            ? ` + ${currentStats.boulderCount} st`
            : '';
      cntEl.textContent = `${currentStats.plantCount} plants${extras}`;
    }
    if (costEl) costEl.textContent = `$${currentStats.totalNzd.toLocaleString('en-NZ')} NZD`;

    if (permTxt) permTxt.textContent = `Permeable ${currentStats.permeablePct}% · Impervious ${currentStats.imperviousPct}%`;
    if (e1El) e1El.textContent = `E1: ${currentStats.detentionLitres.toLocaleString('en-NZ')} L`;
    if (permBar) permBar.style.width = `${currentStats.permeablePct}%`;

    if (councilBadge) {
      const compliant = currentStats.imperviousPct <= 60 && currentStats.permeablePct >= 35;
      councilBadge.className = `lsb-badge ${compliant ? 'is-ok' : 'is-warn'}`;
      councilBadge.textContent = compliant
        ? '✓ Unitary Plan OK (≤60% imp · ≥35% perm)'
        : '⚠ Check Unitary Plan (>60% imp / <35% perm)';
    }

    if (clashBadge) {
      const hasClash = currentStats.rootClashCount > 0;
      clashBadge.className = `lsb-badge ${hasClash ? 'is-warn' : 'is-ok'}`;
      clashBadge.textContent = hasClash
        ? `⚠ ${currentStats.rootClashCount} root clash${currentStats.rootClashCount === 1 ? '' : 'es'} (<2m)`
        : '✓ 0 root clashes';
    }

    if (shadeBadge) {
      shadeBadge.hidden = currentStats.shadeWarnCount === 0;
      if (currentStats.shadeWarnCount > 0) {
        shadeBadge.textContent = `◐ ${currentStats.shadeWarnCount} sun-lover${currentStats.shadeWarnCount === 1 ? '' : 's'} in south shade`;
      }
    }

    if (closedPill) {
      const hasAny =
        currentStats.areaM2 > 0 ||
        currentStats.plantCount > 0 ||
        currentStats.paverCount > 0 ||
        currentStats.boulderCount > 0;
      closedPill.hidden = active || !hasAny;
      if (hasAny) {
        closedPill.textContent = `Brushed: ${currentStats.areaM2.toFixed(1)} m² · ${currentStats.plantCount} plants · Permeable ${currentStats.permeablePct}% · ~$${currentStats.totalNzd.toLocaleString('en-NZ')} NZD`;
      }
    }
  }

  wrap.querySelector('[data-lsb-toggle]')?.addEventListener('click', () => setActive(!active));
  wrap.querySelector('[data-lsb-done]')?.addEventListener('click', () => setActive(false));

  wrap.querySelectorAll<HTMLButtonElement>('[data-lsb-surf]').forEach((btn) => {
    btn.addEventListener('click', () => {
      surfaceMode = btn.dataset.lsbSurf as BedSurfaceMode;
      eraseMode = false;
      syncEraseBtn();
      wrap.querySelectorAll<HTMLButtonElement>('[data-lsb-surf]').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.lsbSurf === surfaceMode));
      });
      syncCursorStyle();
      syncMixSwatches();
      const surf = SURFACE_MODES.find((s) => s.id === surfaceMode)!;
      host.app.log(`Garden base: ${surf.label} (${surf.supplierSpec}).`);
    });
  });

  wrap.querySelector<HTMLSelectElement>('[data-lsb-rohe]')?.addEventListener('change', (e) => {
    activeRoheId = (e.currentTarget as HTMLSelectElement).value as RoheId;
    const rohe = getRohe();
    const note = wrap.querySelector('[data-lsb-rohe-note]');
    if (note) note.textContent = rohe.nurseryNote;
    currentStats.roheLabel = rohe.label;
    host.app.log(`Eco-sourced Rohe switched to ${rohe.label} (${rohe.nurseryNote}).`);
  });

  wrap.querySelector<HTMLSelectElement>('[data-lsb-sp]')?.addEventListener('change', (e) => {
    selectedChoice = (e.currentTarget as HTMLSelectElement).value as BrushSpeciesChoice;
    eraseMode = false;
    syncEraseBtn();
    syncCursorStyle();
    syncMixSwatches();
  });

  wrap.querySelectorAll<HTMLButtonElement>('[data-lsb-yr]').forEach((btn) => {
    btn.addEventListener('click', () => {
      growthYear = Number(btn.dataset.lsbYr) as GrowthYear;
      wrap.querySelectorAll<HTMLButtonElement>('[data-lsb-yr]').forEach((b) => {
        b.setAttribute('aria-pressed', String(Number(b.dataset.lsbYr) === growthYear));
      });
      currentStats.growthYear = growthYear;
      if (items.length > 0) rebuildPaintedMeshes();
      host.app.log(`Planting canopy maturity scaled to Year ${growthYear} (ready for WebGPU path-traced stills).`);
    });
  });

  wrap.querySelector<HTMLInputElement>('[data-lsb-rad]')?.addEventListener('input', (e) => {
    radiusM = Number((e.currentTarget as HTMLInputElement).value) || 1.8;
    const out = wrap.querySelector('[data-lsb-rad-out]');
    if (out) out.textContent = `${radiusM.toFixed(1)}m`;
    if (lastCursorWorld) updateRingAt(lastCursorWorld.x, lastCursorWorld.z);
  });

  wrap.querySelector('[data-lsb-erase]')?.addEventListener('click', () => {
    eraseMode = !eraseMode;
    syncEraseBtn();
    syncCursorStyle();
  });

  wrap.querySelector('[data-lsb-undo]')?.addEventListener('click', () => {
    const snap = undoStack.pop();
    if (!snap) return;
    barkField.data.set(snap.barkData);
    pebbleField.data.set(snap.pebbleData);
    pathField.data.set(snap.pathData);
    items = snap.items;
    pavers = snap.pavers;
    bedRecords = snap.bedRecords;
    rebuildPaintedMeshes();
  });

  wrap.querySelector('[data-lsb-clear]')?.addEventListener('click', () => {
    const hasBark = barkField.data.some((v) => v > 0.05);
    const hasPebble = pebbleField.data.some((v) => v > 0.05);
    const hasPath = pathField.data.some((v) => v > 0.05);
    if (!hasBark && !hasPebble && !hasPath && !items.length && !pavers.length) return;
    pushSnapshot();
    barkField.data.fill(0);
    pebbleField.data.fill(0);
    pathField.data.fill(0);
    items = [];
    pavers = [];
    bedRecords = [];
    rebuildPaintedMeshes();
  });

  syncMixSwatches();
  updateSummaryUI();

  return {
    el: wrap,
    setActive,
    getStats: () => ({ ...currentStats }),
    getExportState,
  };
}
