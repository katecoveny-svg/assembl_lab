// Working Plans & Drawings Agent + IFC/GLB NZBC Pre-Check Engine.
// Pure TypeScript with zero DOM/Three.js imports so Node unit tests run it directly.
//
// Generates 5 practice-branded A3 Architectural Working Drawing Sheets (420 × 297 mm SVG), Printable A3 Set HTML,
// and AutoCAD/Archicad-compatible R12/2000 ASCII DXF from ANY loaded 2D Plan, Multi-Sheet PDF, IFC, or GLB model:
//   - A101: Dimensioned Floor / Footprint Plan, Structural Grid (A–E / 1–5) & Room Schedule
//   - A201: Primary & Side Architectural Elevations, RL Levels & Glazing/Cladding Callouts
//   - A301: Cross-Section, LINZ Ground Profile & Cited NZ Building Code Pre-Check Table
//   - A401: NZ Specification, Live Cost/Delay Summary & Cultural Narrative / Governance Sheet
//   - L101: Landscape, Rohe Eco-Sourcing & Permeable Surfaces Site Plan (beds, native canopy, 2 m RPZ halos,
//           Council permeable/impervious %, NZBC E1 stormwater table) + DXF layers L-BED-EDGE / L-PLNT-CANP / L-PERM-ZONE

import type { CulturalNarrative } from './culturalNarrative.ts';
import { formatNzdDelta, formatNzdTotal, type SpecImpactSummary } from './nzSpecifier.ts';

/** Brushed or proposed landscape bed (metres, relative to building minX / minZ; may sit outside the footprint) */
export interface LandscapeBed {
  x: number;
  z: number;
  r: number;
  kind: string; // 'corten' | 'macrocarpa' | 'pebble' | 'paver' (free text tolerated)
}

/** Native plant placement: s = mature canopy spread (diameter, metres) */
export interface LandscapePlant {
  sp: string;
  x: number;
  z: number;
  s: number;
  sunOk?: boolean;
  rootClash?: boolean;
}

export interface LandscapePlanInput {
  roheLabel?: string;
  permeablePct?: number;
  imperviousPct?: number;
  detentionLitres?: number;
  beds?: LandscapeBed[];
  plants?: LandscapePlant[];
}

export interface DrawingRoom {
  name: string;
  x: number; // metres from building minX
  z: number; // metres from building minZ
  w: number;
  d: number;
}

export interface DrawingBuildingInput {
  projectTitle: string;
  practiceName?: string;
  practiceLogo?: string;
  stageStatus?: string;
  drawingSource: string; // e.g. "Measured from IFC (412 elements)" or "Traced from sheet P1-117"
  widthM: number;
  depthM: number;
  wallHeightM: number;
  ridgeHeightM: number;
  fflDatumM?: number;
  roofType?: 'gable' | 'skillion' | 'flat';
  roofPitchDeg?: number;
  glazingRatio?: number; // 0..1
  linzNote?: string;
  rooms: DrawingRoom[];
  specSummary: SpecImpactSummary;
  narrative: CulturalNarrative;
  /** Optional brushed garden state; synthesised from the landscaping spec + footprint when absent */
  landscapePlan?: LandscapePlanInput;
}

/** Alias used by Plan Studio UI modules */
export type WorkingDrawingInput = DrawingBuildingInput;

export interface NzbcPrecheckItem {
  clause: string;
  title: string;
  status: 'meets' | 'review' | 'verify';
  measured: string;
  requirement: string;
}

export interface WorkingSheet {
  id: 'A101' | 'A201' | 'A301' | 'A401' | 'L101';
  title: string;
  scale: string;
  svg: string;
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Deterministic NZ Building Code pre-check applicable to Plan, IFC and GLB models */
export function buildUniversalNzbcPrecheck(b: DrawingBuildingInput): NzbcPrecheckItem[] {
  const glazPct = Math.round((b.glazingRatio ?? 0.34) * 100);
  const cladRow = b.specSummary.rows.find((r) => r.categoryId === 'cladding');
  const joinRow = b.specSummary.rows.find((r) => r.categoryId === 'joinery');
  const fitRow = b.specSummary.rows.find((r) => r.categoryId === 'fittings');
  const area = Math.round(b.specSummary.floorAreaM2);

  return [
    {
      clause: 'NZBC B1 / NZS 3604',
      title: 'Structure & Span Grid',
      status: b.widthM <= 42 && b.ridgeHeightM <= 12 ? 'meets' : 'review',
      measured: `Envelope ${b.widthM.toFixed(2)} × ${b.depthM.toFixed(2)} m, apex ${b.ridgeHeightM.toFixed(2)} m`,
      requirement: 'SED portal check required where clear span > 12 m or wind zone > Extra High',
    },
    {
      clause: 'NZBC B2.3.1',
      title: 'Durability (50 / 15 / 5 yr)',
      status: 'meets',
      measured: cladRow ? cladRow.selectedLabel : 'Cavity cladding system',
      requirement: '50 yr primary structure, 15 yr building envelope cladding & roofing, 5 yr interior linings',
    },
    {
      clause: 'NZBC D1/AS1',
      title: 'Access Routes & Thresholds',
      status: area > 300 ? 'review' : 'meets',
      measured: area > 300 ? `Public/civic floor ${area} m² — accessible WC, lift/ramp & 1:20 approach required` : 'Level/ramped entry & ≥ 850 mm clear doors',
      requirement: 'D1/AS1 max ramp 1:12, accessible route ≥ 1200 mm for public buildings (NZS 4121)',
    },
    {
      clause: 'NZBC E2/AS1',
      title: 'External Moisture & Flashings',
      status: b.roofPitchDeg && b.roofPitchDeg < 8 ? 'review' : 'meets',
      measured: `${b.roofType ?? 'gable'} roof (${b.roofPitchDeg ?? 18}°), 20 mm drained wall cavity`,
      requirement: 'Drained & vented cavity for risk matrix > 6; min 8°–10° pitch for corrugated/tray profiles',
    },
    {
      clause: 'NZBC F4/AS1',
      title: 'Safety from Falling (Barriers)',
      status: b.ridgeHeightM > 5.2 ? 'review' : 'meets',
      measured: b.ridgeHeightM > 5.2 ? 'Upper level / mezzanine / deck drops > 1.0 m' : 'Single-level platform drops checked against LINZ ground',
      requirement: '1000 mm min barrier height internally/decks (1100 mm commercial balconies), no 100 mm sphere openings',
    },
    {
      clause: 'NZBC G7/AS1',
      title: 'Natural Light & Visual Awareness',
      status: glazPct >= 12 ? 'meets' : 'review',
      measured: `Estimated façade glazing ~${glazPct}% of wall envelope`,
      requirement: 'Habitable spaces ≥ 10% floor area glazed light, visual awareness ≥ 30% of window area',
    },
    {
      clause: 'NZBC H1/AS1 (5th Ed)',
      title: 'Energy Efficiency & Thermal Glazing',
      status: glazPct <= 30 ? 'meets' : 'review',
      measured: `${joinRow ? joinRow.selectedLabel : 'Thermally broken Low-E IGU'} (${glazPct}% WWR)`,
      requirement: glazPct > 30 ? 'Glazing > 30% WWR: use H1 Calculation / Modelling Method (VM1)' : 'Schedule method R-values: Roof R6.6, Wall R2.0, Windows R0.46–R0.50',
    },
    {
      clause: 'NZBC G12/AS1',
      title: 'Water Supplies (Lead-Free)',
      status: 'meets',
      measured: fitRow ? fitRow.selectedLabel : 'Lead-free DZR / 316 stainless tapware',
      requirement: 'Potable tapware max weighted lead content ≤ 0.25% from May 2026 transition',
    },
  ];
}

function a3Frame(opts: {
  sheetId: WorkingSheet['id'];
  sheetTitle: string;
  scale: string;
  b: DrawingBuildingInput;
  body: string;
}): string {
  const { sheetId, sheetTitle, scale, b, body } = opts;
  const date = new Date().toISOString().slice(0, 10);
  const prac = b.practiceName || 'assembl · NZ Architectural Studio';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1190 842" style="width:100%;height:auto;display:block" role="img" aria-label="${esc(`${sheetId} ${sheetTitle} — ${b.projectTitle}`)}">
  <style>
    .bg { fill: #FFFDFB; }
    .bdr { fill: none; stroke: #240B21; stroke-width: 1.8; }
    .thin { fill: none; stroke: #654A4E; stroke-width: 0.75; }
    .grid { fill: none; stroke: #B4466F; stroke-width: 0.65; stroke-dasharray: 7 4; opacity: 0.72; }
    .wall { fill: #240B21; stroke: #240B21; stroke-width: 2.4; }
    .wall-line { fill: none; stroke: #240B21; stroke-width: 2.6; }
    .room-fill { fill: #F6F1ED; stroke: #654A4E; stroke-width: 1.0; }
    .glass { fill: #D9E6EC; stroke: #2F6B86; stroke-width: 1.4; opacity: 0.85; }
    .ground { fill: none; stroke: #2F6B4F; stroke-width: 2.2; }
    .dim { fill: none; stroke: #654A4E; stroke-width: 0.85; }
    .sans { font-family: 'Instrument Sans', system-ui, -apple-system, sans-serif; fill: #240B21; }
    .mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; fill: #240B21; }
    .muted { fill: #654A4E; }
    .rose { fill: #916A70; }
  </style>
  <rect class="bg" x="0" y="0" width="1190" height="842"/>
  <rect class="bdr" x="24" y="24" width="1142" height="794"/>
  <line class="bdr" x1="24" y1="736" x2="1166" y2="736"/>
  ${body}
  <!-- A3 Practice Title Block -->
  <g transform="translate(24,736)">
    <rect x="0" y="0" width="1142" height="82" fill="#F6F1ED" stroke="#240B21" stroke-width="1.2"/>
    <line class="thin" x1="340" y1="0" x2="340" y2="82"/>
    <line class="thin" x1="740" y1="0" x2="740" y2="82"/>
    <line class="thin" x1="990" y1="0" x2="990" y2="82"/>
    <text class="mono muted" x="16" y="22" font-size="9.5" letter-spacing="1.2">PRACTICE / ARCHITECT</text>
    <text class="sans" x="16" y="44" font-size="15" font-weight="600">${esc(prac.slice(0, 38))}</text>
    <text class="mono muted" x="16" y="66" font-size="9.5">FOR INFORMATION · NOT FOR CONSTRUCTION</text>

    <text class="mono muted" x="356" y="22" font-size="9.5" letter-spacing="1.2">PROJECT &amp; ROHE</text>
    <text class="sans" x="356" y="44" font-size="14.5" font-weight="600">${esc(b.projectTitle.slice(0, 46))}</text>
    <text class="mono muted" x="356" y="66" font-size="9.5">${esc((b.narrative.roheOrPlace || 'Aotearoa NZ').slice(0, 52))} · ${esc(b.stageStatus || 'Design Twin')}</text>

    <text class="mono muted" x="756" y="22" font-size="9.5" letter-spacing="1.2">DRAWING TITLE</text>
    <text class="sans" x="756" y="44" font-size="13.5" font-weight="600">${esc(sheetTitle)}</text>
    <text class="mono muted" x="756" y="66" font-size="9.5">Scale ${esc(scale)} @ A3 · ${esc(date)}</text>

    <text class="mono muted" x="1006" y="22" font-size="9.5" letter-spacing="1.2">SHEET</text>
    <text class="mono" x="1006" y="54" font-size="26" font-weight="600">${sheetId}</text>
    <text class="mono muted" x="1006" y="70" font-size="9">Rev P1 · Twin</text>
  </g>
</svg>`;
}

// ---------------------------------------------------------------------------------------------
// L101 Landscape helpers
// ---------------------------------------------------------------------------------------------

const BOTANICAL: Record<string, string> = {
  'pōhutukawa': 'Metrosideros excelsa',
  'pohutukawa': 'Metrosideros excelsa',
  'harakeke': 'Phormium tenax',
  'pōhuehue': 'Muehlenbeckia complexa',
  'muehlenbeckia': 'Muehlenbeckia complexa',
  'ponga': 'Cyathea dealbata',
  'nīkau': 'Rhopalostylis sapida',
  'nikau': 'Rhopalostylis sapida',
  'tī kōuka': 'Cordyline australis',
  'ti kouka': 'Cordyline australis',
  'tikouka': 'Cordyline australis',
  'cabbage tree': 'Cordyline australis',
  'tussock': 'Chionochloa rubra',
  'fern': 'Blechnum novae-zelandiae',
  'carex': 'Carex secta',
  'pūrei': 'Carex secta',
  'oioi': 'Apodasmia similis',
  'kōwhai': 'Sophora microphylla',
  'kowhai': 'Sophora microphylla',
  'mānuka': 'Leptospermum scoparium',
  'manuka': 'Leptospermum scoparium',
  'tōtara': 'Podocarpus totara',
  'totara': 'Podocarpus totara',
  'kawakawa': 'Piper excelsum',
  'puka': 'Meryta sinclairii',
  'rengarenga': 'Arthropodium cirratum',
  'kānuka': 'Kunzea robusta',
  'kanuka': 'Kunzea robusta',
  'tītoki': 'Alectryon excelsus',
  'titoki': 'Alectryon excelsus',
  'karaka': 'Corynocarpus laevigatus',
  'hebe': 'Veronica spp.',
  'koromiko': 'Veronica stricta',
  'wharariki': 'Phormium cookianum',
};

export function botanicalName(sp: string): string {
  const k = sp.toLowerCase().trim();
  if (BOTANICAL[k]) return BOTANICAL[k];
  const hit = Object.keys(BOTANICAL).find((key) => k.includes(key));
  return hit ? BOTANICAL[hit] : sp;
}

export type CanopyLayer = 'canopy' | 'sub-canopy' | 'groundcover';
export const canopyLayer = (s: number): CanopyLayer => (s >= 5 ? 'canopy' : s >= 2 ? 'sub-canopy' : 'groundcover');
const LAYER_FILL: Record<CanopyLayer, string> = { canopy: '#2F6B4F', 'sub-canopy': '#5D7047', groundcover: '#8FA36B' };

export type BedMaterial = 'corten' | 'macrocarpa' | 'pebble' | 'paver' | 'planting';
export function bedMaterial(kind: string): BedMaterial {
  const k = kind.toLowerCase();
  if (/corten|steel|weather/.test(k)) return 'corten';
  if (/macro|sleeper|timber|cypress/.test(k)) return 'macrocarpa';
  if (/pebble|gravel|chip|stone|scoria|swale/.test(k)) return 'pebble';
  if (/paver|paving|brick|flag|basalt/.test(k)) return 'paver';
  return 'planting';
}
const BED_STYLE: Record<BedMaterial, { fill: string; stroke: string; label: string }> = {
  corten: { fill: '#E9D2C2', stroke: '#9C4F26', label: 'Corten steel raised bed edge' },
  macrocarpa: { fill: '#EFE1CC', stroke: '#8A6440', label: 'Macrocarpa sleeper bed edge' },
  pebble: { fill: '#E4E1DA', stroke: '#7D786F', label: 'Pebble / scoria permeable swale' },
  paver: { fill: '#DCD8D2', stroke: '#5E5A55', label: 'Permeable clay paver zone' },
  planting: { fill: '#E3EBDD', stroke: '#2F6B4F', label: 'Bark mulch / native planting bed' },
};

const PALETTES: Record<string, [string, number][]> = {
  'coastal-harakeke': [['Pōhutukawa', 8], ['Harakeke', 1.8], ['Pōhuehue', 1.2], ['Kōwhai', 5], ['Harakeke', 1.8], ['Rengarenga', 0.6]],
  'ponga-nikau-bush': [['Ponga', 4], ['Nīkau', 3], ['Tī kōuka', 3.5], ['Kawakawa', 2], ['Tōtara', 7], ['Rengarenga', 0.6]],
  'wetland-raingarden': [['Carex', 0.9], ['Oioi', 0.8], ['Harakeke', 1.8], ['Tī kōuka', 3.5], ['Mānuka', 3], ['Carex', 0.9]],
  'minimal-lawn': [['Tōtara', 7], ['Kōwhai', 5], ['Mānuka', 3], ['Rengarenga', 0.6], ['Kānuka', 4], ['Harakeke', 1.8]],
};

/** Deterministic proposed garden (beds + native canopy) around the footprint from the landscaping spec option */
export function synthesizeLandscapePlan(b: DrawingBuildingInput): Required<Pick<LandscapePlanInput, 'beds' | 'plants'>> {
  const W = Math.max(4, b.widthM || 18), D = Math.max(4, b.depthM || 12);
  const m = Math.min(12, Math.max(3, 0.3 * Math.max(W, D)));
  const optId = b.specSummary.rows.find((r) => r.categoryId === 'landscaping')?.selectedId ?? 'coastal-harakeke';
  const pal = PALETTES[optId] ?? PALETTES['coastal-harakeke'];
  const beds: LandscapeBed[] = [
    { x: W * 0.12, z: D + m * 0.62, r: Math.min(2.4, m * 0.32), kind: 'corten' },
    { x: W * 0.5, z: -m * 0.5, r: Math.min(2.8, m * 0.36), kind: 'macrocarpa' },
    { x: -m * 0.5, z: D * 0.5, r: Math.min(2.2, m * 0.3), kind: 'pebble' },
    { x: W * 0.45, z: D + m * 0.45, r: Math.min(2.6, m * 0.34), kind: 'paver' },
  ];
  const spots: [number, number][] = [
    [-m * 0.55, D + m * 0.75], // front-left canopy specimen
    [W * 0.28, D + m * 0.9],
    [W + m * 0.5, D * 0.3],
    [W + m * 0.55, -m * 0.5], // rear-right canopy
    [W * 0.82, -m * 0.6],
    [-m * 0.45, -m * 0.4],
  ];
  const plants: LandscapePlant[] = spots.map(([x, z], i) => {
    const [sp, s] = pal[i % pal.length];
    return { sp, x, z, s: Math.min(s, m * 1.6) };
  });
  return { beds, plants };
}

const distToFootprint = (x: number, z: number, W: number, D: number) => {
  const dx = Math.max(0 - x, 0, x - W), dz = Math.max(0 - z, 0, z - D);
  return Math.hypot(dx, dz);
};

export interface ResolvedLandscapePlan {
  roheLabel: string;
  beds: LandscapeBed[];
  plants: (LandscapePlant & { rootClash: boolean; sunOk: boolean })[];
  site: { minX: number; maxX: number; minZ: number; maxZ: number; areaM2: number };
  drive: { x: number; z: number; w: number; d: number };
  imperviousM2: number;
  permeablePct: number;
  imperviousPct: number;
  detentionLitres: number;
  detentionRequiredLitres: number;
  peakFlowLps: number;
  synthesized: boolean;
}

export const ROOT_PROTECTION_M = 2;

export function resolveLandscapePlan(b: DrawingBuildingInput): ResolvedLandscapePlan {
  const W = Math.max(4, b.widthM || 18), D = Math.max(4, b.depthM || 12);
  const lp = b.landscapePlan ?? {};
  const synthesized = !(lp.beds?.length || lp.plants?.length);
  const syn = synthesized ? synthesizeLandscapePlan(b) : null;
  const beds = (syn ? syn.beds : lp.beds ?? []).filter((x) => Number.isFinite(x.x) && Number.isFinite(x.z) && x.r > 0).slice(0, 40);
  const rawPlants = (syn ? syn.plants : lp.plants ?? []).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.z)).slice(0, 60);
  const plants = rawPlants.map((p) => ({
    ...p,
    s: Math.max(0.3, p.s || 1),
    rootClash: p.rootClash ?? distToFootprint(p.x, p.z, W, D) < ROOT_PROTECTION_M,
    sunOk: p.sunOk ?? true,
  }));

  const m = Math.min(12, Math.max(3, 0.3 * Math.max(W, D)));
  let minX = -m, maxX = W + m, minZ = -m, maxZ = D + m * 1.3;
  for (const bd of beds) { minX = Math.min(minX, bd.x - bd.r - 1); maxX = Math.max(maxX, bd.x + bd.r + 1); minZ = Math.min(minZ, bd.z - bd.r - 1); maxZ = Math.max(maxZ, bd.z + bd.r + 1); }
  for (const p of plants) { const r = p.s / 2; minX = Math.min(minX, p.x - r - 1); maxX = Math.max(maxX, p.x + r + 1); minZ = Math.min(minZ, p.z - r - 1); maxZ = Math.max(maxZ, p.z + r + 1); }
  const areaM2 = (maxX - minX) * (maxZ - minZ);

  const driveW = Math.min(3.6, W * 0.4);
  const drive = { x: W - driveW - 0.2, z: D, w: driveW, d: maxZ - D };
  const imperviousCalc = W * D + drive.w * drive.d;
  let imperviousPct = Math.round((100 * imperviousCalc) / areaM2);
  let permeablePct = 100 - imperviousPct;
  if (Number.isFinite(lp.permeablePct)) { permeablePct = Math.round(lp.permeablePct!); imperviousPct = Number.isFinite(lp.imperviousPct) ? Math.round(lp.imperviousPct!) : 100 - permeablePct; }
  else if (Number.isFinite(lp.imperviousPct)) { imperviousPct = Math.round(lp.imperviousPct!); permeablePct = 100 - imperviousPct; }
  const imperviousM2 = Math.round((imperviousPct / 100) * areaM2);
  // On-site detention: 20 L per m² impervious (≈ 20 mm event capture), rounded up to 500 L tanks
  const detentionRequiredLitres = Math.ceil((imperviousM2 * 20) / 500) * 500;
  const detentionLitres = Number.isFinite(lp.detentionLitres) ? Math.round(lp.detentionLitres!) : detentionRequiredLitres;
  // Rational method Q = C·i·A, C ≈ 0.9 impervious, i = 100 mm/h (10% AEP indicative)
  const peakFlowLps = Math.round(((0.9 * 100 * imperviousM2) / 3600) * 10) / 10;

  return {
    roheLabel: (lp.roheLabel || b.narrative.roheOrPlace || 'Aotearoa New Zealand').slice(0, 60),
    beds, plants,
    site: { minX, maxX, minZ, maxZ, areaM2 },
    drive, imperviousM2, permeablePct, imperviousPct,
    detentionLitres, detentionRequiredLitres, peakFlowLps, synthesized,
  };
}

function renderL101Body(b: DrawingBuildingInput, W: number, D: number): string {
  const L = resolveLandscapePlan(b);
  const { site } = L;
  const sW = site.maxX - site.minX, sD = site.maxZ - site.minZ;
  const areaW = 780, areaH = 590;
  const k = Math.min(areaW / sW, areaH / sD);
  const lox = 50 + (areaW - sW * k) / 2;
  const loy = 78 + (areaH - sD * k) / 2;
  const X = (x: number) => (lox + (x - site.minX) * k).toFixed(1);
  const Y = (z: number) => (loy + (z - site.minZ) * k).toFixed(1);
  const R = (r: number) => Math.max(0.8, r * k).toFixed(1);

  const bedsSvg = L.beds.map((bd, i) => {
    const mat = bedMaterial(bd.kind);
    const st = BED_STYLE[mat];
    return `<g data-layer="L-BED-EDGE"><circle cx="${X(bd.x)}" cy="${Y(bd.z)}" r="${R(bd.r)}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"${mat === 'paver' ? ' stroke-dasharray="3 2"' : ''}/>
      <text class="mono" x="${X(bd.x)}" y="${(Number(Y(bd.z)) + 3).toFixed(1)}" font-size="8" text-anchor="middle">B${i + 1}</text></g>`;
  }).join('\n');

  const plantsSvg = L.plants.map((p, i) => {
    const lay = canopyLayer(p.s);
    const halo = `<circle cx="${X(p.x)}" cy="${Y(p.z)}" r="${R(ROOT_PROTECTION_M)}" fill="none" stroke="${p.rootClash ? '#9b2f45' : '#2F6B4F'}" stroke-width="0.9" stroke-dasharray="4 3"/>`;
    return `<g data-layer="L-PLNT-CANP">
      <circle cx="${X(p.x)}" cy="${Y(p.z)}" r="${R(p.s / 2)}" fill="${LAYER_FILL[lay]}" fill-opacity="0.32" stroke="${LAYER_FILL[lay]}" stroke-width="1.2"/>
      ${halo}
      <circle cx="${X(p.x)}" cy="${Y(p.z)}" r="2" fill="#240B21"/>
      <text class="mono" x="${(Number(X(p.x)) + 4).toFixed(1)}" y="${(Number(Y(p.z)) - 4).toFixed(1)}" font-size="8"${p.sunOk ? '' : ' style="fill:#A4541A"'}>P${i + 1} ${esc(p.sp.slice(0, 14))}${p.rootClash ? ' ⚠RPZ' : ''}</text></g>`;
  }).join('\n');

  // Graphic scale bar (5 m)
  const barM = sW > 60 ? 10 : 5;
  const barPx = barM * k;

  const perPass = L.permeablePct >= 40;
  const detPass = L.detentionLitres >= L.detentionRequiredLitres;
  const clashes = L.plants.filter((p) => p.rootClash).length;
  const shaded = L.plants.filter((p) => !p.sunOk).length;
  const e1Rows: { c: string; t: string; m: string; ok: boolean | null }[] = [
    { c: 'District Plan', t: 'Permeable ≥ 40% site', m: `${L.permeablePct}% perm · ${L.imperviousPct}% imperv`, ok: perPass },
    { c: 'NZBC E1/AS1', t: '10% AEP surface water', m: `${L.imperviousM2} m² → ${L.peakFlowLps} L/s`, ok: null },
    { c: 'NZBC E1/VM1', t: 'On-site detention', m: `${L.detentionLitres.toLocaleString('en-NZ')} L vs ${L.detentionRequiredLitres.toLocaleString('en-NZ')} L req`, ok: detPass },
    { c: 'Arb. RPZ 2 m', t: 'Root protection', m: clashes ? `${clashes} clash with footprint` : 'No footprint clashes', ok: clashes === 0 },
    { c: 'Aspect / sun', t: 'Plant sun suitability', m: shaded ? `${shaded} plant(s) in shade` : 'All placements suited', ok: shaded === 0 },
  ];

  const species = new Map<string, { sp: string; n: number; s: number }>();
  for (const p of L.plants) {
    const key = p.sp.toLowerCase();
    const cur = species.get(key);
    if (cur) cur.n++; else species.set(key, { sp: p.sp, n: 1, s: p.s });
  }
  const spRows = [...species.values()].slice(0, 8);

  const legend = (['corten', 'macrocarpa', 'pebble', 'paver'] as BedMaterial[]).map((mat, i) => {
    const st = BED_STYLE[mat];
    const lx = 56 + i * 196;
    return `<circle cx="${lx + 6}" cy="696" r="6" fill="${st.fill}" stroke="${st.stroke}" stroke-width="1.6"/><text class="sans muted" x="${lx + 16}" y="699.5" font-size="9">${esc(st.label)}</text>`;
  }).join('');
  const layerLegend = (Object.keys(LAYER_FILL) as CanopyLayer[]).map((lay, i) => {
    const lx = 56 + i * 150;
    return `<circle cx="${lx + 6}" cy="716" r="6" fill="${LAYER_FILL[lay]}" fill-opacity="0.32" stroke="${LAYER_FILL[lay]}" stroke-width="1.2"/><text class="sans muted" x="${lx + 16}" y="719.5" font-size="9">${lay === 'canopy' ? 'Canopy ≥ 5 m' : lay === 'sub-canopy' ? 'Sub-canopy 2–5 m' : 'Groundcover < 2 m'}</text>`;
  }).join('');

  return `
    <text class="mono muted" x="46" y="54" font-size="10.5" letter-spacing="1.2">01 · LANDSCAPE, ECO-SOURCING &amp; PERMEABLE SURFACES PLAN${L.synthesized ? ' (PROPOSED FROM SPEC)' : ' (BRUSHED GARDEN STATE)'}</text>
    <!-- L-PERM-ZONE: site boundary / permeable landscape zone -->
    <rect data-layer="L-PERM-ZONE" x="${X(site.minX)}" y="${Y(site.minZ)}" width="${(sW * k).toFixed(1)}" height="${(sD * k).toFixed(1)}" fill="#EEF3EA" stroke="#2F6B4F" stroke-width="1.4" stroke-dasharray="14 4 2 4"/>
    <text class="mono" x="${(Number(X(site.minX)) + 6).toFixed(1)}" y="${(Number(Y(site.minZ)) + 12).toFixed(1)}" font-size="8.5" style="fill:#2F6B4F">SITE BOUNDARY · ${Math.round(site.areaM2)} m² · PERMEABLE ${L.permeablePct}%</text>
    <!-- Impervious driveway -->
    <rect x="${X(L.drive.x)}" y="${Y(L.drive.z)}" width="${(L.drive.w * k).toFixed(1)}" height="${(L.drive.d * k).toFixed(1)}" fill="#C9C4BE" stroke="#654A4E" stroke-width="0.8"/>
    <text class="mono muted" transform="translate(${(Number(X(L.drive.x + L.drive.w / 2)) + 3).toFixed(1)},${Y(L.drive.z + L.drive.d / 2)}) rotate(90)" font-size="8" text-anchor="middle">IMPERVIOUS DRIVE</text>
    ${bedsSvg}
    <!-- Building footprint (roof = impervious) -->
    <rect x="${X(0)}" y="${Y(0)}" width="${(W * k).toFixed(1)}" height="${(D * k).toFixed(1)}" fill="#F6F1ED" stroke="#240B21" stroke-width="2.6"/>
    <text class="sans" x="${X(W / 2)}" y="${Y(D / 2)}" font-size="11" font-weight="600" text-anchor="middle">BUILDING FOOTPRINT</text>
    <text class="mono muted" x="${X(W / 2)}" y="${(Number(Y(D / 2)) + 14).toFixed(1)}" font-size="9" text-anchor="middle">${Math.round(W * 1000)} × ${Math.round(D * 1000)} mm · ${(W * D).toFixed(0)} m² roof → E1 outfall</text>
    ${plantsSvg}
    <!-- North Arrow -->
    <g transform="translate(815,78)">
      <circle cx="0" cy="0" r="20" fill="#F6F1ED" stroke="#240B21" stroke-width="1.2"/>
      <polygon points="0,-15 6,8 0,4 -6,8" fill="#240B21"/>
      <text class="mono" x="0" y="17" font-size="8.5" text-anchor="middle">N</text>
    </g>
    <!-- Graphic scale -->
    <g transform="translate(56,672)">
      <rect x="0" y="0" width="${(barPx / 2).toFixed(1)}" height="5" fill="#240B21"/>
      <rect x="${(barPx / 2).toFixed(1)}" y="0" width="${(barPx / 2).toFixed(1)}" height="5" fill="#FFFDFB" stroke="#240B21" stroke-width="0.8"/>
      <text class="mono" x="0" y="-3" font-size="8">0</text>
      <text class="mono" x="${barPx.toFixed(1)}" y="-3" font-size="8" text-anchor="end">${barM} m</text>
      <text class="mono muted" x="${(barPx + 8).toFixed(1)}" y="5" font-size="8">1:100 @ A3 (graphic scale governs) · dashed halo = ${ROOT_PROTECTION_M} m root-protection zone</text>
    </g>
    ${legend}
    ${layerLegend}

    <!-- Right panel: Council permeable / NZBC E1 table + Rohe eco-sourcing schedule -->
    <g transform="translate(865,54)">
      <rect x="0" y="0" width="275" height="655" fill="#F6F1ED" stroke="#654A4E" stroke-width="0.9"/>
      <text class="mono" x="12" y="22" font-size="10" font-weight="600">PERMEABLE vs IMPERVIOUS · NZBC E1</text>
      <line class="thin" x1="0" y1="32" x2="275" y2="32"/>
      <rect x="12" y="42" width="251" height="12" fill="#C9C4BE"/>
      <rect x="12" y="42" width="${(251 * Math.max(0, Math.min(100, L.permeablePct)) / 100).toFixed(1)}" height="12" fill="#5D7047"/>
      <text class="mono" x="12" y="68" font-size="9" style="fill:#2F6B4F">PERMEABLE ${L.permeablePct}%</text>
      <text class="mono muted" x="263" y="68" font-size="9" text-anchor="end">IMPERVIOUS ${L.imperviousPct}%</text>
      ${e1Rows.map((r, i) => {
        const y = 92 + i * 40;
        const badge = r.ok === null ? '◧ VERIFY' : r.ok ? '■ MEETS' : '◧ REVIEW';
        const col = r.ok === null ? '#A4541A' : r.ok ? '#2F6B4F' : '#9b2f45';
        return `<text class="mono" x="12" y="${y}" font-size="8.8" font-weight="600">${esc(r.c)}</text>
          <text class="mono" x="263" y="${y}" font-size="8.5" text-anchor="end" style="fill:${col}">${badge}</text>
          <text class="sans" x="12" y="${y + 13}" font-size="9.5" font-weight="500">${esc(r.t)}</text>
          <text class="mono muted" x="12" y="${y + 25}" font-size="8.3">${esc(r.m.slice(0, 44))}</text>`;
      }).join('\n')}
      <line class="thin" x1="0" y1="${92 + e1Rows.length * 40 - 6}" x2="275" y2="${92 + e1Rows.length * 40 - 6}"/>
      <text class="mono" x="12" y="${92 + e1Rows.length * 40 + 12}" font-size="10" font-weight="600">ROHE ECO-SOURCING SCHEDULE</text>
      <text class="sans muted" x="12" y="${92 + e1Rows.length * 40 + 27}" font-size="9">Eco-sourced: ${esc(L.roheLabel.slice(0, 40))}</text>
      ${spRows.map((s, i) => {
        const y = 92 + e1Rows.length * 40 + 48 + i * 30;
        const lay = canopyLayer(s.s);
        return `<circle cx="17" cy="${y - 3}" r="4" fill="${LAYER_FILL[lay]}"/>
          <text class="sans" x="26" y="${y}" font-size="10" font-weight="500">${esc(s.sp.slice(0, 18))}</text>
          <text class="mono" x="263" y="${y}" font-size="9" text-anchor="end">× ${s.n} · ${s.s.toFixed(1)} m</text>
          <text class="mono muted" x="26" y="${y + 12}" font-size="8.3" font-style="italic">${esc(botanicalName(s.sp).slice(0, 30))} · ${lay}</text>`;
      }).join('\n')}
      <text class="mono muted" x="12" y="640" font-size="8">Nursery stock from local ecological district.</text>
    </g>`;
}

export function generateWorkingDrawingSet(b: DrawingBuildingInput): WorkingSheet[] {
  const W = Math.max(4, b.widthM || 18);
  const D = Math.max(4, b.depthM || 12);
  const wallH = Math.max(2.4, b.wallHeightM || 3.0);
  const ridgeH = Math.max(wallH + 0.3, b.ridgeHeightM || wallH + 2.2);
  const checks = buildUniversalNzbcPrecheck(b);

  // ---- A101: Floor / Footprint Plan & Room Schedule ----
  const planAreaW = 680, planAreaH = 520;
  const sc = Math.min(planAreaW / W, planAreaH / D) * 0.82;
  const ox = 110 + (planAreaW - W * sc) / 2;
  const oy = 135 + (planAreaH - D * sc) / 2;
  const pw = W * sc, pd = D * sc;
  const cols = ['A', 'B', 'C', 'D', 'E'];
  const rows = ['1', '2', '3', '4'];

  const roomsToDraw: DrawingRoom[] = b.rooms.length
    ? b.rooms
    : [
        { name: 'Entry / Foyer', x: 0, z: 0, w: W * 0.36, d: D * 0.34 },
        { name: 'Main Living / Hui Hall', x: 0, z: D * 0.34, w: W * 0.66, d: D * 0.66 },
        { name: 'Kitchen & Hospitality', x: W * 0.66, z: D * 0.34, w: W * 0.34, d: D * 0.38 },
        { name: 'Accessible Sanitary / Services', x: W * 0.36, z: 0, w: W * 0.64, d: D * 0.34 },
        { name: 'Meeting / Study', x: W * 0.66, z: D * 0.72, w: W * 0.34, d: D * 0.28 },
      ];

  const gridLines = [
    ...cols.map((lbl, i) => {
      const gx = ox + (pw * i) / (cols.length - 1);
      return `<line class="grid" x1="${gx.toFixed(1)}" y1="${(oy - 36).toFixed(1)}" x2="${gx.toFixed(1)}" y2="${(oy + pd + 28).toFixed(1)}"/>
        <circle cx="${gx.toFixed(1)}" cy="${(oy - 48).toFixed(1)}" r="11" fill="#FFFDFB" stroke="#B4466F" stroke-width="1"/>
        <text class="mono" x="${gx.toFixed(1)}" y="${(oy - 44).toFixed(1)}" font-size="10" text-anchor="middle">${lbl}</text>`;
    }),
    ...rows.map((lbl, i) => {
      const gy = oy + (pd * i) / (rows.length - 1);
      return `<line class="grid" x1="${(ox - 36).toFixed(1)}" y1="${gy.toFixed(1)}" x2="${(ox + pw + 28).toFixed(1)}" y2="${gy.toFixed(1)}"/>
        <circle cx="${(ox - 48).toFixed(1)}" cy="${gy.toFixed(1)}" r="11" fill="#FFFDFB" stroke="#B4466F" stroke-width="1"/>
        <text class="mono" x="${(ox - 48).toFixed(1)}" y="${(gy + 3.5).toFixed(1)}" font-size="10" text-anchor="middle">${lbl}</text>`;
    }),
  ].join('\n');

  const roomRects = roomsToDraw.slice(0, 14).map((r) => {
    const rx = ox + Math.max(0, Math.min(W - 0.5, r.x)) * sc;
    const ry = oy + Math.max(0, Math.min(D - 0.5, r.z)) * sc;
    const rw = Math.max(18, Math.min(W * sc - (rx - ox), r.w * sc));
    const rd = Math.max(18, Math.min(D * sc - (ry - oy), r.d * sc));
    const areaM2 = (r.w * r.d).toFixed(1);
    return `<g>
      <rect class="room-fill" x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rd.toFixed(1)}"/>
      <text class="sans" x="${(rx + rw / 2).toFixed(1)}" y="${(ry + rd / 2 - 3).toFixed(1)}" font-size="10.5" font-weight="600" text-anchor="middle">${esc(r.name.slice(0, 22))}</text>
      <text class="mono muted" x="${(rx + rw / 2).toFixed(1)}" y="${(ry + rd / 2 + 11).toFixed(1)}" font-size="9" text-anchor="middle">${(r.w * 1000).toFixed(0)} × ${(r.d * 1000).toFixed(0)} (${areaM2} m²)</text>
    </g>`;
  }).join('\n');

  const a101Body = `
    <text class="mono muted" x="46" y="54" font-size="10.5" letter-spacing="1.2">01 · GENERAL ARRANGEMENT PLAN (${esc(b.drawingSource)})</text>
    ${gridLines}
    ${roomRects}
    <rect class="wall-line" x="${ox.toFixed(1)}" y="${oy.toFixed(1)}" width="${pw.toFixed(1)}" height="${pd.toFixed(1)}"/>
    <!-- Glazed entry indicator along primary front -->
    <rect class="glass" x="${(ox + pw * 0.18).toFixed(1)}" y="${(oy + pd - 4).toFixed(1)}" width="${(pw * 0.64).toFixed(1)}" height="8"/>
    <!-- Overall metric dimension strings (mm) -->
    <line class="dim" x1="${ox.toFixed(1)}" y1="${(oy - 20).toFixed(1)}" x2="${(ox + pw).toFixed(1)}" y2="${(oy - 20).toFixed(1)}"/>
    <text class="mono" x="${(ox + pw / 2).toFixed(1)}" y="${(oy - 25).toFixed(1)}" font-size="10.5" text-anchor="middle">${Math.round(W * 1000)} mm OVERALL</text>
    <line class="dim" x1="${(ox + pw + 22).toFixed(1)}" y1="${oy.toFixed(1)}" x2="${(ox + pw + 22).toFixed(1)}" y2="${(oy + pd).toFixed(1)}"/>
    <text class="mono" transform="translate(${(ox + pw + 34).toFixed(1)},${(oy + pd / 2).toFixed(1)}) rotate(90)" font-size="10.5" text-anchor="middle">${Math.round(D * 1000)} mm OVERALL</text>

    <!-- North Arrow -->
    <g transform="translate(815,72)">
      <circle cx="0" cy="0" r="20" fill="#F6F1ED" stroke="#240B21" stroke-width="1.2"/>
      <polygon points="0,-15 6,8 0,4 -6,8" fill="#240B21"/>
      <text class="mono" x="0" y="17" font-size="8.5" text-anchor="middle">N</text>
    </g>

    <!-- Right-side Room & Area Schedule -->
    <g transform="translate(865,54)">
      <rect x="0" y="0" width="275" height="655" fill="#F6F1ED" stroke="#654A4E" stroke-width="0.9"/>
      <text class="mono" x="14" y="24" font-size="10.5" font-weight="600">SPACE &amp; AREA SCHEDULE</text>
      <line class="thin" x1="0" y1="34" x2="275" y2="34"/>
      ${roomsToDraw.slice(0, 12).map((r, idx) => {
        const y = 56 + idx * 36;
        return `<text class="sans" x="14" y="${y}" font-size="11" font-weight="500">${esc(r.name.slice(0, 24))}</text>
          <text class="mono muted" x="14" y="${y + 14}" font-size="9.5">${r.w.toFixed(2)} × ${r.d.toFixed(2)} m</text>
          <text class="mono" x="260" y="${y + 6}" font-size="10.5" text-anchor="end">${(r.w * r.d).toFixed(1)} m²</text>`;
      }).join('\n')}
      <line class="thin" x1="14" y1="510" x2="261" y2="510"/>
      <text class="mono" x="14" y="532" font-size="10.5" font-weight="600">MODELLED FLOOR AREA</text>
      <text class="mono" x="260" y="532" font-size="12" font-weight="600" text-anchor="end">${b.specSummary.floorAreaM2} m²</text>
      <text class="mono muted" x="14" y="562" font-size="9.5">SITE &amp; DATUM</text>
      <text class="sans muted" x="14" y="580" font-size="10">${esc((b.linzNote || 'LINZ 1 m LiDAR / NZVD2016 ready').slice(0, 42))}</text>
      <text class="sans muted" x="14" y="600" font-size="9.5">Accessible D1 threshold &amp; escape</text>
      <text class="sans muted" x="14" y="615" font-size="9.5">widths to be verified on consent set.</text>
    </g>`;

  // ---- A201: Architectural Elevations & Envelope ----
  const elSc = Math.min(460 / W, 190 / ridgeH);
  const e1x = 95, e1y = 310, ew = W * elSc, eWall = wallH * elSc, eRidge = ridgeH * elSc;
  const e2x = 650, e2w = D * elSc;
  const cladLbl = b.specSummary.rows.find((r) => r.categoryId === 'cladding')?.selectedLabel ?? 'NZ Cladding';
  const roofLbl = b.specSummary.rows.find((r) => r.categoryId === 'roof')?.selectedLabel ?? 'Profiled Metal Roof';
  const joinLbl = b.specSummary.rows.find((r) => r.categoryId === 'joinery')?.selectedLabel ?? 'Thermal Aluminium Joinery';

  const a201Body = `
    <text class="mono muted" x="46" y="54" font-size="10.5" letter-spacing="1.2">01 · PRIMARY GLAZED ENTRY ELEVATION</text>
    <line class="ground" x1="${e1x - 45}" y1="${e1y}" x2="${e1x + ew + 65}" y2="${e1y}"/>
    <polygon points="${e1x},${e1y} ${e1x + ew},${e1y} ${e1x + ew},${e1y - eWall} ${e1x + ew / 2},${e1y - eRidge} ${e1x},${e1y - eWall}" fill="#F6F1ED" stroke="#240B21" stroke-width="2.2"/>
    <polygon class="glass" points="${e1x + ew * 0.14},${e1y} ${e1x + ew * 0.86},${e1y} ${e1x + ew * 0.86},${e1y - eWall * 0.92} ${e1x + ew / 2},${e1y - eRidge * 0.9} ${e1x + ew * 0.14},${e1y - eWall * 0.92}"/>
    ${[0.26, 0.38, 0.5, 0.62, 0.74].map((f) => `<line class="thin" x1="${(e1x + ew * f).toFixed(1)}" y1="${e1y}" x2="${(e1x + ew * f).toFixed(1)}" y2="${(e1y - eWall * 0.92).toFixed(1)}"/>`).join('')}
    <!-- RL Markers -->
    <line class="grid" x1="${e1x - 35}" y1="${e1y - eRidge}" x2="${e1x + ew + 55}" y2="${e1y - eRidge}"/>
    <text class="mono" x="${e1x + ew + 60}" y="${e1y - eRidge + 4}" font-size="9.5">RIDGE RL +${ridgeH.toFixed(2)} m</text>
    <line class="grid" x1="${e1x - 35}" y1="${e1y - eWall}" x2="${e1x + ew + 55}" y2="${e1y - eWall}"/>
    <text class="mono" x="${e1x + ew + 60}" y="${e1y - eWall + 4}" font-size="9.5">EAVE / PLATE RL +${wallH.toFixed(2)} m</text>
    <text class="mono" x="${e1x + ew + 60}" y="${e1y + 4}" font-size="9.5">FFL RL ${(b.fflDatumM ?? 0).toFixed(2)} m</text>

    <text class="mono muted" x="630" y="54" font-size="10.5" letter-spacing="1.2">02 · SIDE LONGITUDINAL ELEVATION</text>
    <line class="ground" x1="${e2x - 35}" y1="${e1y}" x2="${e2x + e2w + 45}" y2="${e1y}"/>
    <rect x="${e2x}" y="${e1y - eWall}" width="${e2w}" height="${eWall}" fill="#F6F1ED" stroke="#240B21" stroke-width="2.2"/>
    <rect x="${e2x - 8}" y="${e1y - eRidge}" width="${e2w + 16}" height="${eRidge - eWall}" fill="#EBE4DF" stroke="#240B21" stroke-width="1.8"/>
    ${[0.18, 0.44, 0.72].map((f) => `<rect class="glass" x="${(e2x + e2w * f).toFixed(1)}" y="${(e1y - eWall * 0.82).toFixed(1)}" width="${(e2w * 0.14).toFixed(1)}" height="${(eWall * 0.65).toFixed(1)}"/>`).join('')}

    <!-- Envelope Specification Callout Box -->
    <g transform="translate(56,385)">
      <rect x="0" y="0" width="1078" height="315" fill="#F6F1ED" stroke="#654A4E" stroke-width="0.9"/>
      <text class="mono" x="18" y="26" font-size="11" font-weight="600">ENVELOPE &amp; EXTERNAL FINISHES KEYNOTES (LIVE SYNCED FROM 3D SPECIFIER)</text>
      <line class="thin" x1="0" y1="38" x2="1078" y2="38"/>
      <text class="mono rose" x="18" y="66" font-size="10.5">E-01 ROOFING</text>
      <text class="sans" x="170" y="66" font-size="12" font-weight="600">${esc(roofLbl)}</text>
      <text class="sans muted" x="170" y="84" font-size="10.5">${esc(b.specSummary.rows.find((r) => r.categoryId === 'roof')?.specLine ?? '')}</text>

      <text class="mono rose" x="18" y="122" font-size="10.5">E-02 CLADDING</text>
      <text class="sans" x="170" y="122" font-size="12" font-weight="600">${esc(cladLbl)}</text>
      <text class="sans muted" x="170" y="140" font-size="10.5">${esc(b.specSummary.rows.find((r) => r.categoryId === 'cladding')?.specLine ?? '')}</text>

      <text class="mono rose" x="18" y="178" font-size="10.5">E-03 JOINERY</text>
      <text class="sans" x="170" y="178" font-size="12" font-weight="600">${esc(joinLbl)}</text>
      <text class="sans muted" x="170" y="196" font-size="10.5">${esc(b.specSummary.rows.find((r) => r.categoryId === 'joinery')?.specLine ?? '')}</text>

      <text class="mono rose" x="18" y="234" font-size="10.5">E-04 LANDSCAPE</text>
      <text class="sans" x="170" y="234" font-size="12" font-weight="600">${esc(b.specSummary.rows.find((r) => r.categoryId === 'landscaping')?.selectedLabel ?? '')}</text>
      <text class="sans muted" x="170" y="252" font-size="10.5">${esc(b.specSummary.rows.find((r) => r.categoryId === 'landscaping')?.specLine ?? '')}</text>

      <text class="mono muted" x="18" y="292" font-size="9.5">CULTURAL SCREEN / FAÇADE MOTIF: ${esc(b.narrative.motifs.map((m) => `${m.term} (${m.architecturalExpression})`).slice(0, 2).join(' · '))}</text>
    </g>`;

  // ---- A301: Cross-Section & Cited NZBC Pre-Check ----
  const sx = 95, sy = 285;
  const a301Body = `
    <text class="mono muted" x="46" y="54" font-size="10.5" letter-spacing="1.2">01 · CROSS-SECTION A–A &amp; LINZ GROUND PROFILE</text>
    <path class="ground" d="M ${sx - 50} ${sy + 14} Q ${sx + ew * 0.25} ${sy + 2} ${sx + ew * 0.5} ${sy} T ${sx + ew + 65} ${sy + 18}"/>
    <rect x="${sx - 6}" y="${sy}" width="${ew + 12}" height="12" fill="#9B968E" stroke="#240B21" stroke-width="1.5"/>
    <polygon points="${sx},${sy} ${sx},${sy - eWall} ${sx + ew / 2},${sy - eRidge} ${sx + ew},${sy - eWall} ${sx + ew},${sy}" fill="#FFFDFB" stroke="#240B21" stroke-width="2.6"/>
    <line class="thin" x1="${sx + 10}" y1="${sy - eWall * 0.92}" x2="${sx + ew / 2}" y2="${sy - eRidge + 10}"/>
    <line class="thin" x1="${sx + ew - 10}" y1="${sy - eWall * 0.92}" x2="${sx + ew / 2}" y2="${sy - eRidge + 10}"/>
    <text class="mono muted" x="${sx + ew / 2}" y="${sy - eWall * 0.45}" font-size="10" text-anchor="middle">INSULATED ENVELOPE · ACOUSTIC TIMBER SOFFIT · H1 SLAB EDGE</text>

    <!-- NZBC Pre-Check Table -->
    <g transform="translate(46,340)">
      <rect x="0" y="0" width="1098" height="370" fill="#F6F1ED" stroke="#240B21" stroke-width="1"/>
      <text class="mono" x="16" y="24" font-size="11" font-weight="600">ADVISORY NEW ZEALAND BUILDING CODE PRE-CHECK (PREPARED BY AGENT · PERSON REVIEWS)</text>
      <line class="thin" x1="0" y1="36" x2="1098" y2="36"/>
      ${checks.map((c, idx) => {
        const y = 58 + idx * 38;
        const badge = c.status === 'meets' ? '■ MEETS GUIDE' : '◧ CHECK / SED';
        return `<text class="mono" x="16" y="${y}" font-size="10" font-weight="600">${esc(c.clause)}</text>
          <text class="sans" x="165" y="${y}" font-size="11" font-weight="600">${esc(c.title)}</text>
          <text class="mono" x="385" y="${y}" font-size="9.5" style="fill:${c.status === 'meets' ? '#2F6B4F' : '#A4541A'}">${badge}</text>
          <text class="sans muted" x="505" y="${y - 5}" font-size="10">${esc(c.measured.slice(0, 82))}</text>
          <text class="mono muted" x="505" y="${y + 10}" font-size="8.8">${esc(c.requirement.slice(0, 92))}</text>`;
      }).join('\n')}
    </g>`;

  // ---- A401: Cultural Narrative, Specification & Cost/Programme Schedule ----
  const a401Body = `
    <g transform="translate(46,44)">
      <rect x="0" y="0" width="1098" height="210" fill="#F6F1ED" stroke="#240B21" stroke-width="1"/>
      <text class="mono rose" x="18" y="24" font-size="10.5" letter-spacing="1.1">01 · CULTURAL NARRATIVE, MANA WHENUA MOTIFS &amp; DESIGN GOVERNANCE</text>
      <text class="sans" x="18" y="48" font-size="12" font-weight="500">${esc(b.narrative.summary.slice(0, 145))}${b.narrative.summary.length > 145 ? '…' : ''}</text>
      ${b.narrative.motifs.slice(0, 4).map((m, i) => {
        const y = 76 + i * 26;
        return `<text class="mono" x="18" y="${y}" font-size="10.5" font-weight="600">• ${esc(m.term)}</text>
          <text class="sans muted" x="155" y="${y}" font-size="10.5">${esc(m.meaning.slice(0, 68))} → ${esc(m.architecturalExpression.slice(0, 58))}</text>`;
      }).join('\n')}
      <text class="mono muted" x="18" y="194" font-size="8.8">${esc(b.narrative.governanceNote.slice(0, 148))}…</text>
    </g>

    <g transform="translate(46,272)">
      <rect x="0" y="0" width="1098" height="442" fill="#FFFDFB" stroke="#240B21" stroke-width="1"/>
      <rect x="0" y="0" width="1098" height="34" fill="#240B21"/>
      <text class="mono" x="18" y="22" font-size="10.5" style="fill:#F9F6F2">02 · LIVE NZ SPECIFICATION, ALLOWANCE &amp; PROGRAMME DELAY SCHEDULE (${b.specSummary.floorAreaM2} m² · EXCL. GST)</text>
      <text class="mono" x="1080" y="22" font-size="10.5" style="fill:#D9BACB" text-anchor="end">TOTAL ${formatNzdTotal(b.specSummary.selectedTotalNzd)} (${formatNzdDelta(b.specSummary.netDeltaNzd)}) · ${b.specSummary.netDelayWeeks > 0 ? `+${b.specSummary.netDelayWeeks} WK DELAY` : '0 WK DELAY'}</text>
      ${b.specSummary.rows.map((r, i) => {
        const y = 60 + i * 41;
        return `<line class="thin" x1="14" y1="${y + 14}" x2="1084" y2="${y + 14}"/>
          <text class="mono" x="18" y="${y}" font-size="10" font-weight="600">${esc(r.categoryTitle.slice(0, 34))}</text>
          <text class="sans" x="268" y="${y}" font-size="11" font-weight="500">${esc(r.selectedLabel.slice(0, 40))}</text>
          <text class="mono muted" x="585" y="${y}" font-size="9.5">${esc(r.nzbcClause.slice(0, 26))}</text>
          <text class="mono" x="805" y="${y}" font-size="10" text-anchor="end">${formatNzdTotal(r.selectedCostNzd)}</text>
          <text class="mono" x="945" y="${y}" font-size="10" text-anchor="end">${formatNzdDelta(r.deltaNzd)}</text>
          <text class="mono" x="1080" y="${y}" font-size="10" text-anchor="end" style="fill:${r.delayWeeks > 0 ? '#9b2f45' : '#2F6B4F'}">${r.leadWeeks}w${r.delayWeeks > 0 ? ` (+${r.delayWeeks}w)` : ''}</text>`;
      }).join('\n')}
    </g>`;

  return [
    { id: 'A101', title: 'General Arrangement Plan & Space Schedule', scale: '1:100', svg: a3Frame({ sheetId: 'A101', sheetTitle: 'General Arrangement Plan & Space Schedule', scale: '1:100', b, body: a101Body }) },
    { id: 'A201', title: 'Architectural Elevations & Envelope Keynotes', scale: '1:100', svg: a3Frame({ sheetId: 'A201', sheetTitle: 'Architectural Elevations & Envelope Keynotes', scale: '1:100', b, body: a201Body }) },
    { id: 'A301', title: 'Cross-Section & NZ Building Code Pre-Check', scale: '1:100', svg: a3Frame({ sheetId: 'A301', sheetTitle: 'Cross-Section & NZBC Pre-Check', scale: '1:100', b, body: a301Body }) },
    { id: 'A401', title: 'Cultural Narrative, Finishes & Cost/Delay Schedule', scale: 'NTS', svg: a3Frame({ sheetId: 'A401', sheetTitle: 'Cultural Narrative & Live NZ Spec Schedule', scale: 'NTS', b, body: a401Body }) },
    { id: 'L101', title: 'Landscape, Rohe & Permeable Site Plan', scale: '1:100', svg: a3Frame({ sheetId: 'L101', sheetTitle: 'Landscape, Rohe & Permeable Site Plan', scale: '1:100', b, body: renderL101Body(b, W, D) }) },
  ];
}

export function exportWorkingSetPrintableHTML(sheets: WorkingSheet[], projectTitle: string): string {
  return `<!doctype html><html lang="en-NZ"><head><meta charset="utf-8"><title>${esc(projectTitle)} — A3 Working Drawing Set</title>
<style>
  @page { size: A3 landscape; margin: 0; }
  html, body { margin: 0; padding: 0; background: #180B18; font-family: system-ui, sans-serif; }
  .bar { padding: 12px 20px; background: #240B21; color: #F9F6F2; display: flex; justify-content: space-between; align-items: center; }
  .bar button { background: #F6F1ED; color: #240B21; border: 0; border-radius: 999px; padding: 8px 16px; font-weight: 600; cursor: pointer; }
  .sheet { max-width: 1190px; margin: 18px auto; background: #FFFDFB; box-shadow: 0 14px 40px rgba(0,0,0,.45); }
  svg { display: block; width: 100%; height: auto; }
  @media print { .bar { display: none; } html, body { background: #fff; } .sheet { margin: 0; max-width: none; box-shadow: none; break-after: page; page-break-after: always; } }
</style></head><body>
<div class="bar"><span><b>${esc(projectTitle)}</b> · ${sheets.length}-Sheet A3 Architectural Working Drawing Set (${sheets.length ? `${sheets[0].id}–${sheets[sheets.length - 1].id}` : '—'})</span><button onclick="window.print()">Print / Save as A3 PDF</button></div>
${sheets.map((s) => `<div class="sheet">${s.svg}</div>`).join('\n')}
</body></html>`;
}

/** Export minimal CAD-ready ASCII DXF (millimetres; layers A-WALL-EXTR, A-ROOM-OTLN, A-ANNO-TEXT, L-PERM-ZONE, L-BED-EDGE, L-PLNT-CANP) */
export function exportWorkingSetDXF(b: DrawingBuildingInput): string {
  const lines: (string | number)[] = ['0', 'SECTION', '2', 'ENTITIES'];
  const rect = (layer: string, x0: number, y0: number, w: number, h: number) => {
    const pts: [number, number][] = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
    for (let i = 0; i < 4; i++) {
      const a = pts[i], c = pts[(i + 1) % 4];
      lines.push('0', 'LINE', '8', layer, '10', a[0].toFixed(1), '20', a[1].toFixed(1), '30', '0.0', '11', c[0].toFixed(1), '21', c[1].toFixed(1), '31', '0.0');
    }
  };
  const circle = (layer: string, x: number, y: number, r: number) => {
    lines.push('0', 'CIRCLE', '8', layer, '10', x.toFixed(1), '20', y.toFixed(1), '30', '0.0', '40', Math.max(1, r).toFixed(1));
  };
  const text = (layer: string, x: number, y: number, h: number, s: string) => {
    lines.push('0', 'TEXT', '8', layer, '10', x.toFixed(1), '20', y.toFixed(1), '30', '0.0', '40', h.toFixed(1), '1', s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, ''));
  };
  const Wmm = b.widthM * 1000, Dmm = b.depthM * 1000;
  rect('A-WALL-EXTR', 0, 0, Wmm, Dmm);
  for (const r of b.rooms) {
    rect('A-ROOM-OTLN', r.x * 1000, r.z * 1000, r.w * 1000, r.d * 1000);
    text('A-ANNO-TEXT', (r.x + r.w / 2) * 1000, (r.z + r.d / 2) * 1000, 180, r.name);
  }
  // ---- L101 landscape layers ----
  const L = resolveLandscapePlan(b);
  const s = L.site;
  rect('L-PERM-ZONE', s.minX * 1000, s.minZ * 1000, (s.maxX - s.minX) * 1000, (s.maxZ - s.minZ) * 1000);
  text('L-PERM-ZONE', (s.minX + 0.5) * 1000, (s.minZ + 0.5) * 1000, 250, `SITE ${Math.round(s.areaM2)} m2 PERMEABLE ${L.permeablePct}% IMPERVIOUS ${L.imperviousPct}%`);
  L.beds.forEach((bd, i) => {
    circle('L-BED-EDGE', bd.x * 1000, bd.z * 1000, bd.r * 1000);
    text('L-BED-EDGE', bd.x * 1000, bd.z * 1000, 160, `B${i + 1} ${bedMaterial(bd.kind).toUpperCase()}`);
  });
  L.plants.forEach((p, i) => {
    circle('L-PLNT-CANP', p.x * 1000, p.z * 1000, (p.s / 2) * 1000);
    circle('L-PLNT-RPZ', p.x * 1000, p.z * 1000, ROOT_PROTECTION_M * 1000);
    text('L-PLNT-CANP', p.x * 1000, p.z * 1000, 160, `P${i + 1} ${p.sp} (${botanicalName(p.sp)})`);
  });
  lines.push('0', 'ENDSEC', '0', 'EOF');
  return lines.join('\n') + '\n';
}
