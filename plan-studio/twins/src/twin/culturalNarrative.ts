// Cultural Narrative & Large Architectural Document Intake (pure TS, zero DOM/Three imports so Node tests run it directly).
// Extracts Te Ao Māori / mana whenua / architectural design narratives, named motifs (e.g. Kōmiromiro, Ngaru, Mangōpare,
// Aramoana), local waterways/rohe, practice names, layout variants (e.g. Banquet vs Auditorium), and reference render sheets
// from large multi-page PDF sets — or holds an architect-authored cultural narrative for IFC/GLB/2D-plan projects.
//
// Governance rule: Never invent iwi attributions or claim whakairo/cultural approval. Every extracted motif cites the exact
// sheet/page it came from, and carries a mandatory mana whenua review notice.

export interface CulturalMotif {
  term: string;
  meaning: string;
  architecturalExpression: string;
  sourcePage?: number;
}

export interface SheetClassification {
  page: number;
  code: string;
  title: string;
  kind: 'plan' | 'site' | 'elevation' | 'section' | 'narrative' | 'render' | 'cover' | 'schedule' | 'other';
  scale?: string;
  layoutVariant?: { mode: string; seats: number } | null;
}

export interface CulturalNarrative {
  schema: 'assembl.cultural-narrative.v1';
  projectTitle: string;
  practiceName: string;
  stageStatus: string;
  roheOrPlace: string;
  summary: string;
  paragraphs: string[];
  motifs: CulturalMotif[];
  waterwaysAndLandmarks: string[];
  layoutVariants: { mode: string; seats: number; page: number; code: string }[];
  renderPages: number[];
  narrativePages: number[];
  source: 'pdf-extracted' | 'architect-entered' | 'default-aotearoa';
  governanceNote: string;
}

export const NARRATIVE_STORAGE_KEY = 'assembl.nz.cultural-narrative';

export const GOVERNANCE_NOTE =
  'Cultural narratives, ingoa wāhi and traditional motifs belong to mana whenua and the design practice. Visualisations and AI renders are indicative design studies only — whakairo, tukutuku, kōwhaiwhai and cultural glass/screen patterns require mana whenua review and sign-off before specification or public issue.';

const KNOWN_MOTIFS: { re: RegExp; term: string; meaning: string; expr: string }[] = [
  { re: /\bk[ōo]miromiro\b/i, term: 'Kōmiromiro', meaning: 'Wake trailing behind a waka across the water — journey, guidance and collective momentum', expr: 'Rhythmic façade frit / vertical entry screen and approach paving alignment' },
  { re: /\bngaru\b/i, term: 'Ngaru', meaning: 'Ocean waves and ancestral voyaging navigation across Te Moananui-a-Kiwa', expr: 'Wave-profiled acoustic timber battens and glazed mullion rhythm' },
  { re: /\bmang[ōo]pare\b/i, term: 'Mangōpare', meaning: 'Hammerhead shark — unyielding strength, resilience, courage and determination', expr: 'Structural portal bracing geometry and threshold lintel expression' },
  { re: /\baramoana\b/i, term: 'Aramoana', meaning: 'Ocean pathways connecting streams to the moana — continuous growth and future pathways', expr: 'Continuous threshold-to-courtyard circulation spine and stormwater swale planting' },
  { re: /\bpoutama\b/i, term: 'Poutama', meaning: 'Stepped ascent of knowledge, growth and aspiration', expr: 'Stepped stair/mezzanine balustrade and acoustic wall articulation' },
  { re: /\bp[āa]tiki\b/i, term: 'Pātiki', meaning: 'Flounder diamond motif — abundance, hospitality and manaakitanga for guests', expr: 'Foyer hospitality threshold and banquet ceiling acoustic coffers' },
  { re: /\bwhakapapa\b/i, term: 'Whakapapa', meaning: 'Genealogical layering connecting whenua, waterways, tūpuna and future generations', expr: 'Layered LINZ ground plinth, warm native timber structure and sky-facing roof form' },
  { re: /\bmanaakitanga\b/i, term: 'Manaakitanga', meaning: 'Generous hosting, care and uplift of manuhiri and community', expr: 'Open sheltered forecourt, clear sightlines to kitchen/hui hall and warm entry lighting' },
  { re: /\bkaitiakitanga\b/i, term: 'Kaitiakitanga', meaning: 'Guardianship of whenua, wai and native ecology', expr: 'Low-impact foundations, rainwater/stream care and endemic NZ native planting' },
];

const cleanText = (s: string) =>
  s
    .replace(/reﬂ\s*ect/gi, 'reflect')
    .replace(/ﬂ\s*ow/gi, 'flow')
    .replace(/ﬁ\s*/gi, 'fi')
    .replace(/\s+/g, ' ')
    .trim();

const SHEET_CODE_RE = /\b([PASTC]\d[-_.]?\d{2,4}|A\d{2,4}|RC[-_.]?\d{2,3}|SK[-_.]?\d{2,3})\b/i;

export function classifySheetPage(page: number, rawItems: string[]): SheetClassification {
  const joined = cleanText(rawItems.join(' '));
  const codeMatch = joined.match(SHEET_CODE_RE);
  const code = codeMatch ? codeMatch[1].toUpperCase() : `P${String(page).padStart(2, '0')}`;
  const scaleMatch = joined.match(/\b1\s*:\s*(\d{2,4})(?:\s*@\s*A[0-4])?/i);
  const scale = scaleMatch ? scaleMatch[0].replace(/\s+/g, ' ') : undefined;

  // Detect title phrase
  const shortRuns = rawItems.map((x) => cleanText(x)).filter((x) => x.length >= 4 && x.length <= 72);
  const titleCandidate =
    shortRuns.find((x) => /\b(ground floor|first floor|site plan|narrative|renders?|elevations?|sections?|cover sheet|sketch|banquet|auditorium)\b/i.test(x)) ??
    shortRuns[0] ??
    `Sheet ${page}`;

  // Detect seating / layout variants (e.g. Banquet 420 vs Auditorium 312+4)
  let layoutVariant: { mode: string; seats: number } | null = null;
  if (/\bbanquet\b/i.test(joined)) {
    const sm = joined.match(/total\s+seating\s*[:\-]?\s*(\d{2,4})/i);
    layoutVariant = { mode: 'banquet', seats: sm ? Number(sm[1]) : 420 };
  } else if (/\bauditorium\b/i.test(joined)) {
    const main = joined.match(/auditorium\s+chairs\s*[:\-]?\s*(\d{2,4})/i);
    const acc = joined.match(/acces+ible\s+seats\s*[:\-]?\s*(\d{1,3})/i);
    const total = main ? Number(main[1]) + (acc ? Number(acc[1]) : 0) : 316;
    layoutVariant = { mode: 'conference', seats: total };
  }

  let kind: SheetClassification['kind'] = 'other';
  if (/\bnarrative\b|cultural\s+design|design\s+statement|\bk[ōo]miromiro\b|\bmang[ōo]pare\b|\baramoana\b/i.test(joined) && !/\b1\s*:\s*100\b/.test(joined)) {
    kind = 'narrative';
  } else if (/\brenders?\b|perspective|3d\s+view/i.test(titleCandidate) || /\b-\s*renders\b/i.test(joined)) {
    kind = 'render';
  } else if (/\bsite\s*plan\b|master\s*plan|location\s*plan/i.test(titleCandidate)) {
    kind = 'site';
  } else if (/\b(ground|first|upper|lower|mezzanine|level\s*\d+)\s*floor\s*plan\b|\bbanquet\s+seating\b|\bauditorium\s+seating\b/i.test(joined)) {
    kind = 'plan';
  } else if (/\belevations?\b/i.test(titleCandidate)) {
    kind = 'elevation';
  } else if (/\bsections?\b/i.test(titleCandidate)) {
    kind = 'section';
  } else if (/\bcover\s*sheet\b|drawing\s+list/i.test(joined)) {
    kind = 'cover';
  } else if (/\bschedule\b/i.test(titleCandidate)) {
    kind = 'schedule';
  }

  return { page, code, title: titleCandidate, kind, scale, layoutVariant };
}

export function extractPdfSetNarrative(pages: { page: number; items: string[] }[], fallbackName = 'Architectural Project'): {
  narrative: CulturalNarrative;
  sheets: SheetClassification[];
} {
  const sheets = pages.map((p) => classifySheetPage(p.page, p.items));
  const fullTexts = pages.map((p) => ({ page: p.page, text: cleanText(p.items.join(' ')) }));
  const allCombined = fullTexts.map((p) => p.text).join('\n');

  // Extract practice name generically from individual PDF titleblock runs first (avoids merging adjacent titleblock labels)
  let practiceName = '';
  const itemRuns = pages.flatMap((p) => p.items.map(cleanText)).filter((s) => s.length >= 5 && s.length <= 68);
  const pracPatterns = [
    /(?:^|[\s|,;:])([A-ZĀĒĪŌŪ][A-ZĀĒĪŌŪa-zāēīōū&']*(?:\s+[A-ZĀĒĪŌŪa-zāēīōū&'|]+){0,4}\s+(?:ARCHITECTS|ARCHITECTURE|STUDIO)(?:\s+LTD)?)(?=$|[\s.,;:|)])/,
    /(?:^|[\s|,;:])((?:TE\s+[A-ZĀĒĪŌŪ]+\s+[A-ZĀĒĪŌŪ]+|[A-ZĀĒĪŌŪ][A-ZĀĒĪŌŪa-zāēīōū&']*(?:\s+[A-ZĀĒĪŌŪ|]+){1,4})\s+LTD)(?=$|[\s.,;:|)])/,
  ];
  for (const re of pracPatterns) {
    const hitRun = itemRuns.find((r) => re.test(r) && !/\b(CONSENT|DRAWING|SCALE|COVER\s+SHEET)\b/i.test(r));
    const m = hitRun ? hitRun.match(re) : allCombined.match(re);
    if (m) {
      practiceName = cleanText(m[1]).replace(/\bLTD\b/i, 'Ltd');
      break;
    }
  }

  // Extract project title & place generically from titleblock text
  let projectTitle = fallbackName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  let roheOrPlace = 'Aotearoa New Zealand';
  const projLine = allCombined.match(
    /\b([A-ZĀĒĪŌŪ0-9][A-ZĀĒĪŌŪ0-9\s'&-]{3,56}(?:HUB|CENTRE|WHARE|PAVILION|COLLEGE|HOUSE|MARAE))\s*-\s*([A-ZĀĒĪŌŪ][A-ZĀĒĪŌŪ\s-]{3,48}(?:AUCKLAND|WELLINGTON|CHRISTCHURCH|WAIKATO|TAURANGA|NORTHLAND|OTAGO)(?:\s+NZ)?)/i,
  );
  if (projLine) {
    projectTitle = cleanText(projLine[1]);
    roheOrPlace = cleanText(projLine[2]);
  } else {
    const nzPlace = allCombined.match(/\b([A-ZĀĒĪŌŪ][a-zāēīōū]+(?:\s+[A-ZĀĒĪŌŪ][a-zāēīōū]+)?\s*[-–,]\s*(?:South\s+)?(?:Auckland|Wellington|Christchurch|Waikato|Tauranga|Queenstown|Wānaka|Northland|Bay of Plenty|Otago|Hawke's Bay)(?:\s+NZ)?)\b/i);
    if (nzPlace) roheOrPlace = cleanText(nzPlace[1]);
  }

  // Stage status
  const stageMatch = allCombined.match(/\b(\d{2,3}%\s*(?:DRAFT\s+)?(?:RESOURCE CONSENT|BUILDING CONSENT|DEVELOPED DESIGN|CONCEPT DESIGN|DETAILED DESIGN))\b/i);
  const stageStatus = stageMatch ? cleanText(stageMatch[1]) : 'Design Review';

  // Extract narrative prose paragraphs (sentences > 60 chars that aren't ALL-CAPS titleblock labels)
  const paragraphs: string[] = [];
  const narrativePages: number[] = [];
  for (const { page, text } of fullTexts) {
    const sentences = text.match(/[A-ZĀĒĪŌŪ][^.!?]{45,}[.!?]/g) ?? [];
    const prose = sentences.filter((s) => {
      const upperRatio = (s.replace(/[^A-Za-z]/g, '').match(/[A-Z]/g)?.length ?? 0) / Math.max(1, s.replace(/[^A-Za-z]/g, '').length);
      return upperRatio < 0.45 && !/do not scale|copyright|resource consent/i.test(s);
    });
    if (prose.length >= 2) {
      narrativePages.push(page);
      paragraphs.push(prose.join(' '));
    }
  }

  // Extract motifs with page citations
  const motifs: CulturalMotif[] = [];
  for (const km of KNOWN_MOTIFS) {
    const hitPage = fullTexts.find((p) => km.re.test(p.text));
    if (hitPage) {
      motifs.push({
        term: km.term,
        meaning: km.meaning,
        architecturalExpression: km.expr,
        sourcePage: hitPage.page,
      });
    }
  }

  // Extract named streams, harbours, moana, and surrounding civic landmarks generically
  const landmarks = new Set<string>();
  const lmPatterns = [
    /\b([A-ZĀĒĪŌŪ][a-zāēīōū]+(?:\s+and\s+[A-ZĀĒĪŌŪ][a-zāēīōū]+)?\s+(?:Streams?|River|Harbour|Chapel|College|Marae))\b/g,
    /\b(Te\s+Moananui-a-Kiwa)\b/gi,
  ];
  for (const re of lmPatterns) {
    for (const m of allCombined.matchAll(re)) landmarks.add(cleanText(m[1]));
  }

  const layoutVariants = sheets
    .filter((s) => s.layoutVariant)
    .map((s) => ({ mode: s.layoutVariant!.mode, seats: s.layoutVariant!.seats, page: s.page, code: s.code }));

  const renderPages = sheets.filter((s) => s.kind === 'render').map((s) => s.page);
  if (narrativePages.length === 0) {
    sheets.filter((s) => s.kind === 'narrative').forEach((s) => narrativePages.push(s.page));
  }

  const hasExtracted = paragraphs.length > 0 || motifs.length > 0;
  const summary = hasExtracted
    ? paragraphs[0]?.slice(0, 320) ??
      `Cultural narrative extracted from ${projectTitle} (${motifs.map((m) => m.term).join(', ')}).`
    : `Grounded in whenua, natural daylight, local hydrology and manaakitanga for ${projectTitle} (${roheOrPlace}). Add mana whenua narrative notes below to weave specific motifs and kōrero into the model, drawings and narration.`;

  return {
    sheets,
    narrative: {
      schema: 'assembl.cultural-narrative.v1',
      projectTitle,
      practiceName,
      stageStatus,
      roheOrPlace,
      summary,
      paragraphs,
      motifs: motifs.length
        ? motifs
        : [
            {
              term: 'Manaakitanga',
              meaning: 'Warmth of welcome, shelter and care for whānau and visitors',
              architecturalExpression: 'Sheltered entry threshold, clear interior sightlines and warm natural timber',
            },
            {
              term: 'Kaitiakitanga',
              meaning: 'Stewardship of whenua, stormwater and endemic flora',
              architecturalExpression: 'LINZ contour-fitted ground platform and NZ native planting palette',
            },
          ],
      waterwaysAndLandmarks: [...landmarks],
      layoutVariants,
      renderPages,
      narrativePages,
      source: hasExtracted ? 'pdf-extracted' : 'default-aotearoa',
      governanceNote: GOVERNANCE_NOTE,
    },
  };
}

export function defaultNarrativeForModel(name: string, practiceName = ''): CulturalNarrative {
  const clean = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Aotearoa Project';
  return {
    schema: 'assembl.cultural-narrative.v1',
    projectTitle: clean,
    practiceName,
    stageStatus: '3D Design Twin',
    roheOrPlace: 'Aotearoa New Zealand',
    summary: `Architectural twin for ${clean}, integrating live LINZ ground contours, New Zealand Building Code pre-checks, local climate/sun paths, native ecology and manaakitanga spatial principles.`,
    paragraphs: [],
    motifs: [
      {
        term: 'Manaakitanga',
        meaning: 'Generous threshold, shelter and clarity of arrival for community and whānau',
        architecturalExpression: 'Glazed entry canopy, warm timber soffit and accessible level thresholds (NZBC D1)',
      },
      {
        term: 'Kaitiakitanga',
        meaning: 'Respectful placement on the land and regeneration of native flora',
        architecturalExpression: 'Measured LINZ LiDAR terrain fit, low-glare bronze glazing and endemic planting',
      },
    ],
    waterwaysAndLandmarks: [],
    layoutVariants: [],
    renderPages: [],
    narrativePages: [],
    source: 'default-aotearoa',
    governanceNote: GOVERNANCE_NOTE,
  };
}

/** Build a fluent, respectful bilingual Te Reo Māori + NZ English walkthrough script from the active narrative & specs */
export function buildBilingualNarrationScript(opts: {
  narrative: CulturalNarrative;
  practiceName?: string;
  claddingLabel?: string;
  joineryLabel?: string;
  landscapingLabel?: string;
  layoutMode?: string;
}): string {
  const n = opts.narrative;
  const prac = opts.practiceName || n.practiceName;
  const motifNames = n.motifs.map((m) => m.term).slice(0, 4);
  const streams = n.waterwaysAndLandmarks.filter((w) => /stream|river|moana|harbour/i.test(w));

  const intro = `Tēnā koutou, nau mai, haere mai ki ${n.projectTitle}${prac ? `, nā ${prac} i hoahoa` : ''}.`;
  const placeLine = n.roheOrPlace && n.roheOrPlace !== 'Aotearoa New Zealand'
    ? `Set on the contours of ${n.roheOrPlace}${streams.length ? `, honouring the connection to ${streams.join(' and ')}` : ''}, this three-dimensional twin brings together live LINZ LiDAR ground, solar paths and architectural craft.`
    : `Set on measured New Zealand ground with live LINZ contours and true solar orientation, this three-dimensional twin lets whānau, clients and consultants experience the architecture in real scale.`;

  const motifLine = n.source === 'pdf-extracted' && motifNames.length
    ? `Guided by the cultural narrative of ${motifNames.join(', ')}, the threshold weaves ancestral journey, resilience and manaakitanga into the built form.`
    : `Guided by manaakitanga and kaitiakitanga, the arrival threshold opens from native plantings into warm, light-filled interior spaces.`;

  const specBits = [
    opts.claddingLabel ? `${opts.claddingLabel.toLowerCase()}` : 'natural timber and durable New Zealand cladding',
    opts.joineryLabel ? `${opts.joineryLabel.toLowerCase()}` : 'thermally broken architectural joinery',
    opts.landscapingLabel ? `framed by ${opts.landscapingLabel.toLowerCase()}` : 'framed by ponga, tī kōuka and harakeke',
  ];
  const matLine = `Outside and in, the palette pairs ${specBits.join(', ')}${opts.layoutMode ? `, shown here in the ${opts.layoutMode} configuration` : ''}.`;
  const close = `Mauri ora ki te whānau, ki te whenua hoki — walk freely through each space to test finishes, lighting, programme and cost live.`;

  return [intro, placeLine, motifLine, matLine, close].join(' ');
}

export function saveNarrative(n: CulturalNarrative, storage: Pick<Storage, 'setItem'> | null = typeof localStorage !== 'undefined' ? localStorage : null) {
  try { storage?.setItem(NARRATIVE_STORAGE_KEY, JSON.stringify(n)); } catch { /* ignore quota */ }
}

export function loadNarrative(storage: Pick<Storage, 'getItem'> | null = typeof localStorage !== 'undefined' ? localStorage : null): CulturalNarrative | null {
  try {
    const raw = storage?.getItem(NARRATIVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CulturalNarrative;
    return parsed?.schema === 'assembl.cultural-narrative.v1' ? parsed : null;
  } catch {
    return null;
  }
}
