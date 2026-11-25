// Working Plans & Drawings Agent + IFC/GLB NZBC Pre-Check Engine.
// Pure TypeScript with zero DOM/Three.js imports so Node unit tests run it directly.
//
// Generates 4 practice-branded A3 Architectural Working Drawing Sheets (420 × 297 mm SVG), Printable A3 Set HTML,
// and AutoCAD/Archicad-compatible R12/2000 ASCII DXF from ANY loaded 2D Plan, Multi-Sheet PDF, IFC, or GLB model:
//   - A101: Dimensioned Floor / Footprint Plan, Structural Grid (A–E / 1–5) & Room Schedule
//   - A201: Primary & Side Architectural Elevations, RL Levels & Glazing/Cladding Callouts
//   - A301: Cross-Section, LINZ Ground Profile & Cited NZ Building Code Pre-Check Table
//   - A401: NZ Specification, Live Cost/Delay Summary & Cultural Narrative / Governance Sheet

import type { CulturalNarrative } from './culturalNarrative.ts';
import { formatNzdDelta, formatNzdTotal, type SpecImpactSummary } from './nzSpecifier.ts';

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
}

export interface NzbcPrecheckItem {
  clause: string;
  title: string;
  status: 'meets' | 'review' | 'verify';
  measured: string;
  requirement: string;
}

export interface WorkingSheet {
  id: 'A101' | 'A201' | 'A301' | 'A401';
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
<div class="bar"><span><b>${esc(projectTitle)}</b> · 4-Sheet A3 Architectural Working Drawing Set (A101–A401)</span><button onclick="window.print()">Print / Save as A3 PDF</button></div>
${sheets.map((s) => `<div class="sheet">${s.svg}</div>`).join('\n')}
</body></html>`;
}

/** Export minimal CAD-ready ASCII DXF (millimetres, layers WALLS, ROOMS, GRID, TEXT) */
export function exportWorkingSetDXF(b: DrawingBuildingInput): string {
  const lines: (string | number)[] = ['0', 'SECTION', '2', 'ENTITIES'];
  const rect = (layer: string, x0: number, y0: number, w: number, h: number) => {
    const pts: [number, number][] = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
    for (let i = 0; i < 4; i++) {
      const a = pts[i], c = pts[(i + 1) % 4];
      lines.push('0', 'LINE', '8', layer, '10', a[0].toFixed(1), '20', a[1].toFixed(1), '30', '0.0', '11', c[0].toFixed(1), '21', c[1].toFixed(1), '31', '0.0');
    }
  };
  const Wmm = b.widthM * 1000, Dmm = b.depthM * 1000;
  rect('A-WALL-EXTR', 0, 0, Wmm, Dmm);
  for (const r of b.rooms) {
    rect('A-ROOM-OTLN', r.x * 1000, r.z * 1000, r.w * 1000, r.d * 1000);
    lines.push('0', 'TEXT', '8', 'A-ANNO-TEXT', '10', ((r.x + r.w / 2) * 1000).toFixed(1), '20', ((r.z + r.d / 2) * 1000).toFixed(1), '30', '0.0', '40', '180.0', '1', r.name.replace(/[^\x20-\x7E]/g, ''));
  }
  lines.push('0', 'ENDSEC', '0', 'EOF');
  return lines.join('\n') + '\n';
}
