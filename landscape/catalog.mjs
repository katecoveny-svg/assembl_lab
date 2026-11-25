// Aotearoa New Zealand Botanical Catalogue, Supplier Hardscapes, Piet Oudolf Drift & Site-Plan Brush Engine.
// Grounded in NZPCN, Oratia Native Plant Nursery, Southern Woods Nursery, Daltons, Firth Concrete, Straightcurve.
// Pure ES module (zero DOM / Three.js imports) so Node unit tests verify all geometry, drift, phenology & schedule math directly.

export const NZ_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const NZ_SEASONS = [
  'Raumati · Summer', 'Raumati · Summer', 'Ngahuru · Autumn',
  'Ngahuru · Autumn', 'Ngahuru · Autumn', 'Takurua · Winter',
  'Takurua · Winter', 'Takurua · Winter', 'Kōanga · Spring',
  'Kōanga · Spring', 'Kōanga · Spring', 'Raumati · Summer',
];

export const MONTHS_NZ = [
  { idx: 0, short: 'Jan', name: 'January · Mid-Raumati (Summer)', season: 'summer' },
  { idx: 1, short: 'Feb', name: 'February · Late Raumati', season: 'summer' },
  { idx: 2, short: 'Mar', name: 'March · Early Ngahuru (Autumn)', season: 'autumn' },
  { idx: 3, short: 'Apr', name: 'April · Mid-Ngahuru', season: 'autumn' },
  { idx: 4, short: 'May', name: 'May · Late Ngahuru', season: 'autumn' },
  { idx: 5, short: 'Jun', name: 'June · Early Takurua (Winter)', season: 'winter' },
  { idx: 6, short: 'Jul', name: 'July · Mid-Takurua', season: 'winter' },
  { idx: 7, short: 'Aug', name: 'August · Late Takurua', season: 'winter' },
  { idx: 8, short: 'Sep', name: 'September · Early Kōanga (Spring)', season: 'spring' },
  { idx: 9, short: 'Oct', name: 'October · Mid-Kōanga', season: 'spring' },
  { idx: 10, short: 'Nov', name: 'November · Late Kōanga', season: 'spring' },
  { idx: 11, short: 'Dec', name: 'December · Early Raumati (Pōhutukawa Bloom)', season: 'summer' },
];

// ── AUTHENTIC NZ HARDSCAPE & SURFACE MATERIALS (GPU Splatmap Channels 0–5) ──
export const NZ_SURFACES = [
  {
    id: 'lawn',
    channel: 0,
    name: 'NZ Ryegrass Lawn',
    brand: 'Aotearoa Turf',
    spec: 'Perennial Ryegrass & White Clover',
    pricePerM2: 18,
    swatch: '#4C7238',
  },
  {
    id: 'mulch',
    channel: 1,
    name: 'Daltons Black Bark Mulch',
    brand: 'Daltons NZ',
    spec: 'Composted Aged Bark · 75 mm depth',
    pricePerM2: 14,
    swatch: '#2A221D',
  },
  {
    id: 'pavers',
    channel: 2,
    name: 'Firth Piazza 50 Black Sands',
    brand: 'Firth Concrete NZ',
    spec: 'Black Sands · 400×200×50 mm (12.5/m²)',
    pricePerM2: 92,
    swatch: '#46494D',
  },
  {
    id: 'pebbles',
    channel: 3,
    name: 'Waikato River Pebble',
    brand: 'Daltons Landscape',
    spec: 'Washed Greywacke Riverstone 20–40 mm',
    pricePerM2: 26,
    swatch: '#8B877D',
  },
  {
    id: 'schist',
    channel: 4,
    name: 'Central Otago Schist',
    brand: 'NZ Natural Stone',
    spec: 'Split Flagstone · Mica Grey & Warm Gold',
    pricePerM2: 165,
    swatch: '#7B786C',
  },
  {
    id: 'kwila',
    channel: 5,
    name: 'Kwila Hardwood Decking',
    brand: 'NZ Architectural Timber',
    spec: '140×19 mm Dressed Grooved Boards',
    pricePerM2: 195,
    swatch: '#6E3F27',
  },
];

export const EDGING_STYLES = {
  corten: {
    id: 'corten',
    label: 'Straightcurve Corten Steel (150 mm)',
    supplier: 'Straightcurve NZ',
    color: 0x8f4424,
    hex: '#8F4424',
    rough: 0.80,
    metal: 0.28,
    height: 0.145,
    width: 0.04,
    ratePerM: 38,
  },
  macrocarpa: {
    id: 'macrocarpa',
    label: 'Macrocarpa Timber Sleepers',
    supplier: 'Southern Woods / NZ Sawmill',
    color: 0x7a5c3c,
    hex: '#7A5C3C',
    rough: 0.88,
    metal: 0.02,
    height: 0.175,
    width: 0.125,
    ratePerM: 46,
  },
  timber: {
    id: 'timber',
    label: 'Charred Macrocarpa Sleeper',
    supplier: 'NZ Architectural Timber',
    color: 0x352b26,
    hex: '#352B26',
    rough: 0.86,
    metal: 0.02,
    height: 0.165,
    width: 0.115,
    ratePerM: 54,
  },
  basalt: {
    id: 'basalt',
    label: 'Honed Auckland Basalt Kerb',
    supplier: 'NZ Volcanic Stone',
    color: 0x3b3e42,
    hex: '#3B3E42',
    rough: 0.82,
    metal: 0.05,
    height: 0.135,
    width: 0.105,
    ratePerM: 68,
  },
  natural: {
    id: 'natural',
    label: 'Spade-Cut Flush Mulch Edge',
    supplier: 'Landscape Prep',
    color: 0x3b2d23,
    hex: '#3B2D23',
    rough: 0.96,
    metal: 0.0,
    height: 0.0,
    width: 0.0,
    ratePerM: 12,
  },
};

export const NZ_EDGINGS = [
  EDGING_STYLES.corten,
  EDGING_STYLES.macrocarpa,
  EDGING_STYLES.basalt,
  EDGING_STYLES.natural,
];

export const MULCH_STYLES = {
  bark: { id: 'bark', label: 'Daltons Black Bark Mulch (75 mm)', supplier: 'Daltons NZ', color: 0x261d17, ratePerM2: 14, channel: 1 },
  pebble: { id: 'pebble', label: 'Waikato River Pebble (20–40 mm)', supplier: 'Daltons Landscape', color: 0x726f68, ratePerM2: 26, channel: 3 },
  scoria: { id: 'scoria', label: 'Central Otago Schist Chip', supplier: 'NZ Natural Stone', color: 0x6e6b60, ratePerM2: 34, channel: 4 },
};

/** Helper to sample smooth 12-month phenology weights from [bloomStart, bloomEnd] (0..12, handles Dec->Jan wrap) */
function makeBloomMonths(start, end) {
  if (start > 12.2) return new Array(12).fill(0.0);
  const out = [];
  for (let m = 0; m < 12; m++) {
    const mc = m + 0.5;
    let v = 0;
    if (start <= end) {
      if (mc >= start - 0.6 && mc <= end + 0.6) {
        const rise = Math.min(1, Math.max(0, (mc - (start - 0.6)) / 1.0));
        const fall = Math.min(1, Math.max(0, (end + 0.6 - mc) / 1.0));
        v = Math.min(rise, fall);
      }
    } else {
      const inLate = mc >= start - 0.6 ? Math.min(1, (mc - (start - 0.6)) / 1.0) : 0;
      const inEarly = mc <= end + 0.6 ? Math.min(1, (end + 0.6 - mc) / 1.0) : 0;
      v = Math.max(inLate, inEarly);
    }
    out.push(+v.toFixed(2));
  }
  return out;
}

// ── 24 GENUINE AOTEAROA BOTANICAL STARS + KŌHATU MOSSY BASALT STONE (25 TOTAL) ─
// Grounded in Oratia Native Plant Nursery & Southern Woods Nursery grades and pricing.
// Strictly zero banned violet/lavender hexes per DESIGN.md.
export const NZ_SPECIES = [
  // ── CANOPY & PALMS (5) ───────────────────────────────────────────────────────
  {
    id: 'pohutukawa',
    maori: 'Pōhutukawa',
    common: 'NZ Christmas Tree',
    botanical: 'Metrosideros excelsa',
    nursery: 'Oratia Natives',
    category: 'trees',
    tier: 'canopy',
    archetype: 'canopyTree',
    heightM: 5.4,
    spreadM: 4.6,
    matureHeight: 5.4,
    matureSpread: 4.6,
    minSpacingM: 2.1,
    radius: 1.65,
    density: 0.06,
    edgeBias: 'core',
    growth: [0.24, 0.45, 0.68, 0.92, 1.0],
    bloomStart: 10.8,
    bloomEnd: 1.5,
    bloomMonths: makeBloomMonths(10.8, 1.5),
    foliageColor: '#3A5233',
    foliageTipColor: '#58734A',
    winterColor: '#34492E',
    flowerColor: '#D91E2A',
    flowerColor2: '#FF4752',
    trunkColor: '#5C524A',
    foliageHex: 0x3a5233,
    bloomHex: 0xd91e2a,
    deciduous: 0.0,
    grade: '45L',
    rateNzd: 295,
    priceNZD: 295,
    swatch: '#D91E2A',
    sun: 'Full sun · Salt-wind hardy',
    moisture: 'Dry–Moist Coastal',
    ecology: 'Iconic summer crimson stamen canopy feeding tūī, korimako & kākā',
  },
  {
    id: 'kowhai',
    maori: 'Kōwhai',
    common: 'Small-leaved Kōwhai',
    botanical: 'Sophora microphylla',
    nursery: 'Southern Woods',
    category: 'trees',
    tier: 'canopy',
    archetype: 'kowhaiTree',
    heightM: 4.4,
    spreadM: 3.2,
    matureHeight: 4.4,
    matureSpread: 3.2,
    minSpacingM: 1.65,
    radius: 1.35,
    density: 0.10,
    edgeBias: 'core',
    growth: [0.24, 0.48, 0.72, 0.94, 1.0],
    bloomStart: 7.4,
    bloomEnd: 10.3,
    bloomMonths: makeBloomMonths(7.4, 10.3),
    foliageColor: '#4F6E39',
    foliageTipColor: '#799E52',
    winterColor: '#667546',
    flowerColor: '#F2C22E',
    flowerColor2: '#FFE052',
    trunkColor: '#665B4F',
    foliageHex: 0x4f6e39,
    bloomHex: 0xf2c22e,
    deciduous: 0.22,
    grade: 'PB18 / 12L',
    rateNzd: 85,
    priceNZD: 85,
    swatch: '#E8B732',
    sun: 'Full sun · Dappled shade',
    moisture: 'Free-draining',
    ecology: 'Spring golden kōwhai nectar magnet for tūī, kererū & korimako',
  },
  {
    id: 'tikouka',
    maori: 'Tī Kōuka',
    common: 'Cabbage Tree',
    botanical: 'Cordyline australis',
    nursery: 'Oratia Natives',
    category: 'trees',
    tier: 'canopy',
    archetype: 'cabbageTree',
    heightM: 4.2,
    spreadM: 1.9,
    matureHeight: 4.2,
    matureSpread: 1.9,
    minSpacingM: 1.45,
    radius: 0.95,
    density: 0.32,
    edgeBias: 'core',
    growth: [0.26, 0.52, 0.75, 0.95, 1.0],
    bloomStart: 9.5,
    bloomEnd: 12.1,
    bloomMonths: makeBloomMonths(9.5, 12.1),
    foliageColor: '#5B7A3B',
    foliageTipColor: '#88A65B',
    winterColor: '#536E36',
    flowerColor: '#F5F2E1',
    flowerColor2: '#E8E0C5',
    trunkColor: '#706355',
    foliageHex: 0x5b7a3b,
    bloomHex: 0xf5f2e1,
    deciduous: 0.0,
    grade: 'PB12 / 8L',
    rateNzd: 58,
    priceNZD: 58,
    swatch: '#7C9A52',
    sun: 'Full sun · Wet or dry',
    moisture: 'Dry to Wetland',
    ecology: 'Sculptural multi-headed silhouette; fragrant summer panicles & berries for kererū',
  },
  {
    id: 'nikau',
    maori: 'Nīkau',
    common: 'Nīkau Palm',
    botanical: 'Rhopalostylis sapida',
    nursery: 'Oratia Natives',
    category: 'trees',
    tier: 'canopy',
    archetype: 'nikauPalm',
    heightM: 4.2,
    spreadM: 2.3,
    matureHeight: 4.2,
    matureSpread: 2.3,
    minSpacingM: 1.5,
    radius: 1.05,
    density: 0.30,
    edgeBias: 'core',
    growth: [0.22, 0.39, 0.58, 0.86, 1.0],
    bloomStart: 10.5,
    bloomEnd: 3.2,
    bloomMonths: makeBloomMonths(10.5, 3.2),
    foliageColor: '#2D5C2B',
    foliageTipColor: '#4D8543',
    winterColor: '#285226',
    flowerColor: '#E2B4C2',
    flowerColor2: '#C9382E',
    trunkColor: '#5B704E',
    foliageHex: 0x2d5c2b,
    bloomHex: 0xe2b4c2,
    deciduous: 0.0,
    grade: '12L',
    rateNzd: 95,
    priceNZD: 95,
    swatch: '#2D5C2B',
    sun: 'Part shade · Sheltered glade',
    moisture: 'Moist Humus-rich',
    ecology: 'Endemic Aotearoa palm; year-round fruit sustains kererū & kākā',
  },
  {
    id: 'titoki',
    maori: 'Tītoki',
    common: 'NZ Oak',
    botanical: 'Alectryon excelsus',
    nursery: 'Southern Woods',
    category: 'trees',
    tier: 'canopy',
    archetype: 'canopyTree',
    heightM: 4.6,
    spreadM: 3.5,
    matureHeight: 4.6,
    matureSpread: 3.5,
    minSpacingM: 1.8,
    radius: 1.4,
    density: 0.08,
    edgeBias: 'core',
    growth: [0.25, 0.47, 0.70, 0.93, 1.0],
    bloomStart: 10.2,
    bloomEnd: 2.6,
    bloomMonths: makeBloomMonths(10.2, 2.6),
    foliageColor: '#365C2E',
    foliageTipColor: '#5E8C4A',
    winterColor: '#32532A',
    flowerColor: '#CC292B',
    flowerColor2: '#E84A3C',
    trunkColor: '#4F463F',
    foliageHex: 0x365c2e,
    bloomHex: 0xcc292b,
    deciduous: 0.0,
    grade: '25L',
    rateNzd: 145,
    priceNZD: 145,
    swatch: '#4B783B',
    sun: 'Sun to part shade',
    moisture: 'Free-draining Loam',
    ecology: 'Lush glossy street & courtyard specimen; scarlet aril berries feed kererū',
  },

  // ── ARCHITECTURAL FLAX, FERNS, LANCEWOOD & LILIES (8) ────────────────────────
  {
    id: 'ponga',
    maori: 'Ponga',
    common: 'Silver Tree Fern',
    botanical: 'Cyathea dealbata',
    nursery: 'Oratia Natives',
    category: 'architectural',
    tier: 'canopy',
    archetype: 'treeFern',
    heightM: 2.9,
    spreadM: 2.4,
    matureHeight: 2.9,
    matureSpread: 2.4,
    minSpacingM: 1.35,
    radius: 1.05,
    density: 0.35,
    edgeBias: 'core',
    growth: [0.26, 0.50, 0.72, 0.93, 1.0],
    bloomStart: 13,
    bloomEnd: 13,
    bloomMonths: new Array(12).fill(0.5),
    foliageColor: '#3A6B2C',
    foliageTipColor: '#69994A',
    winterColor: '#335E26',
    flowerColor: '#DCE3DB',
    flowerColor2: '#DCE3DB',
    trunkColor: '#453528',
    foliageHex: 0x3a6b2c,
    bloomHex: 0xdce3db,
    deciduous: 0.0,
    grade: 'PB18',
    rateNzd: 78,
    priceNZD: 78,
    swatch: '#467D36',
    sun: 'Part shade · Sheltered',
    moisture: 'Moist Humus',
    ecology: 'Emblematic silver-backed tree fern creating cool humid microclimates',
  },
  {
    id: 'horoeka',
    maori: 'Horoeka',
    common: 'Fierce Lancewood',
    botanical: 'Pseudopanax ferox',
    nursery: 'Southern Woods',
    category: 'architectural',
    tier: 'accent',
    archetype: 'lancewood',
    heightM: 2.8,
    spreadM: 1.1,
    matureHeight: 2.8,
    matureSpread: 1.1,
    minSpacingM: 0.85,
    radius: 0.55,
    density: 0.75,
    edgeBias: 'core',
    growth: [0.28, 0.54, 0.78, 0.96, 1.0],
    bloomStart: 13,
    bloomEnd: 13,
    bloomMonths: new Array(12).fill(0.2),
    foliageColor: '#473D2B',
    foliageTipColor: '#6E5B3B',
    winterColor: '#3F3526',
    flowerColor: '#7A6B48',
    flowerColor2: '#8F7D56',
    trunkColor: '#3E362E',
    foliageHex: 0x473d2b,
    bloomHex: 0x7a6b48,
    deciduous: 0.0,
    grade: 'PB8 / 5L',
    rateNzd: 42,
    priceNZD: 42,
    swatch: '#5E4F35',
    sun: 'Full sun · Part shade',
    moisture: 'Dry–Moist',
    ecology: 'Unmistakable prehistoric saw-toothed bronze silhouette for modern courtyards',
  },
  {
    id: 'harakeke',
    maori: 'Harakeke',
    common: 'NZ Flax',
    botanical: 'Phormium tenax',
    nursery: 'Oratia Natives',
    category: 'architectural',
    tier: 'accent',
    archetype: 'flaxTall',
    heightM: 1.95,
    spreadM: 1.6,
    matureHeight: 1.95,
    matureSpread: 1.6,
    minSpacingM: 0.95,
    radius: 0.72,
    density: 1.1,
    edgeBias: 'core',
    growth: [0.42, 0.72, 0.92, 1.0, 1.0],
    bloomStart: 10.2,
    bloomEnd: 1.4,
    bloomMonths: makeBloomMonths(10.2, 1.4),
    foliageColor: '#476832',
    foliageTipColor: '#6D8F4A',
    winterColor: '#43602F',
    flowerColor: '#C24322',
    flowerColor2: '#E3772B',
    trunkColor: '#3A3028',
    foliageHex: 0x476832,
    bloomHex: 0xc24322,
    deciduous: 0.0,
    grade: 'PB5',
    rateNzd: 22,
    priceNZD: 22,
    swatch: '#577A3C',
    sun: 'Full sun · Coastal & wetland',
    moisture: 'Dry to Wetland',
    ecology: 'Tall kōrari flower spikes feed tūī & korimako; weaving taonga species',
  },
  {
    id: 'platts_black',
    maori: 'Wharariki',
    common: "Platt's Black Mountain Flax",
    botanical: "Phormium cookianum 'Platt's Black'",
    nursery: 'Southern Woods',
    category: 'architectural',
    tier: 'accent',
    archetype: 'flaxArching',
    heightM: 0.95,
    spreadM: 0.95,
    matureHeight: 0.95,
    matureSpread: 0.95,
    minSpacingM: 0.62,
    radius: 0.45,
    density: 2.2,
    edgeBias: 'mid',
    growth: [0.48, 0.80, 0.96, 1.0, 1.0],
    bloomStart: 9.5,
    bloomEnd: 12.0,
    bloomMonths: makeBloomMonths(9.5, 12.0),
    foliageColor: '#2C1E22',
    foliageTipColor: '#593338',
    winterColor: '#24171A',
    flowerColor: '#9C7D48',
    flowerColor2: '#BFA46B',
    trunkColor: '#24171A',
    foliageHex: 0x2c1e22,
    bloomHex: 0x9c7d48,
    deciduous: 0.0,
    grade: '2.5L',
    rateNzd: 21,
    priceNZD: 21,
    swatch: '#4A282E',
    sun: 'Full sun · Part shade',
    moisture: 'Free-draining',
    ecology: 'Dramatic dark espresso-bronze architectural contrast against silver spear',
  },
  {
    id: 'astelia',
    maori: 'Kākaha / Silver Spear',
    common: 'Chatham Island Silver Spear',
    botanical: 'Astelia chathamica',
    nursery: 'Oratia Natives',
    category: 'architectural',
    tier: 'accent',
    archetype: 'flaxBroad',
    heightM: 1.15,
    spreadM: 1.25,
    matureHeight: 1.15,
    matureSpread: 1.25,
    minSpacingM: 0.68,
    radius: 0.60,
    density: 1.3,
    edgeBias: 'mid',
    growth: [0.38, 0.68, 0.92, 1.0, 1.0],
    bloomStart: 1.5,
    bloomEnd: 6.2,
    bloomMonths: makeBloomMonths(1.5, 6.2),
    foliageColor: '#8D9D96',
    foliageTipColor: '#C5D2CB',
    winterColor: '#82938C',
    flowerColor: '#E87C1E',
    flowerColor2: '#F5A13B',
    trunkColor: '#5C6661',
    foliageHex: 0x8d9d96,
    bloomHex: 0xe87c1e,
    deciduous: 0.0,
    grade: '2.5L / PB5',
    rateNzd: 28,
    priceNZD: 28,
    swatch: '#9FB0A4',
    sun: 'Sun · Dappled shade',
    moisture: 'Moist Free-draining',
    ecology: 'Sculptural metallic-pewter sword rosette with autumn orange berries',
  },
  {
    id: 'rengarenga',
    maori: 'Rengarenga',
    common: 'NZ Rock Lily',
    botanical: 'Arthropodium cirratum',
    nursery: 'Oratia Natives',
    category: 'architectural',
    tier: 'ground',
    archetype: 'lilyClump',
    heightM: 0.65,
    spreadM: 0.72,
    matureHeight: 0.65,
    matureSpread: 0.72,
    minSpacingM: 0.45,
    radius: 0.36,
    density: 3.4,
    edgeBias: 'border',
    growth: [0.60, 0.90, 1.0, 1.0, 1.0],
    bloomStart: 9.2,
    bloomEnd: 12.2,
    bloomMonths: makeBloomMonths(9.2, 12.2),
    foliageColor: '#5D8A45',
    foliageTipColor: '#8CB86A',
    winterColor: '#4F783B',
    flowerColor: '#FAFAF5',
    flowerColor2: '#F0DF7A',
    trunkColor: '#4A6B36',
    foliageHex: 0x5d8a45,
    bloomHex: 0xfafaf5,
    deciduous: 0.0,
    grade: 'PB5 / 2L',
    rateNzd: 18,
    priceNZD: 18,
    swatch: '#84B063',
    sun: 'Coastal sun to dry shade',
    moisture: 'Dry–Moist',
    ecology: 'Lush arching strap foliage with airy starry-white spring panicles',
  },
  {
    id: 'libertia',
    maori: 'Mikoikoi',
    common: 'NZ Orange Iris',
    botanical: 'Libertia peregrinans',
    nursery: 'Southern Woods',
    category: 'architectural',
    tier: 'ground',
    archetype: 'irisFan',
    heightM: 0.55,
    spreadM: 0.52,
    matureHeight: 0.55,
    matureSpread: 0.52,
    minSpacingM: 0.38,
    radius: 0.28,
    density: 4.4,
    edgeBias: 'border',
    growth: [0.58, 0.88, 1.0, 1.0, 1.0],
    bloomStart: 9.4,
    bloomEnd: 1.2,
    bloomMonths: makeBloomMonths(9.4, 1.2),
    foliageColor: '#B36822',
    foliageTipColor: '#E0892B',
    winterColor: '#C95C18',
    flowerColor: '#FFFFFF',
    flowerColor2: '#FFF4CC',
    trunkColor: '#7A4515',
    foliageHex: 0xb36822,
    bloomHex: 0xffffff,
    deciduous: 0.0,
    grade: 'PB5',
    rateNzd: 16,
    priceNZD: 16,
    swatch: '#D67C22',
    sun: 'Full sun · Coastal gravel',
    moisture: 'Free-draining',
    ecology: 'Fiery copper-orange sword fans intensifying in winter; crisp white iris blooms',
  },
  {
    id: 'xeronema',
    maori: 'Raupō Taranga',
    common: 'Poor Knights Lily',
    botanical: 'Xeronema callistemon',
    nursery: 'Oratia Natives',
    category: 'architectural',
    tier: 'accent',
    archetype: 'irisFan',
    heightM: 0.85,
    spreadM: 0.78,
    matureHeight: 0.85,
    matureSpread: 0.78,
    minSpacingM: 0.52,
    radius: 0.38,
    density: 2.4,
    edgeBias: 'mid',
    growth: [0.45, 0.76, 0.95, 1.0, 1.0],
    bloomStart: 8.5,
    bloomEnd: 11.8,
    bloomMonths: makeBloomMonths(8.5, 11.8),
    foliageColor: '#4E7838',
    foliageTipColor: '#78A352',
    winterColor: '#466B32',
    flowerColor: '#D92323',
    flowerColor2: '#FF5438',
    trunkColor: '#5C3B28',
    foliageHex: 0x4e7838,
    bloomHex: 0xd92323,
    deciduous: 0.0,
    grade: '2.5L',
    rateNzd: 36,
    priceNZD: 36,
    swatch: '#D92323',
    sun: 'Full sun · Frost-free rockery',
    moisture: 'Sharp Drainage',
    ecology: 'Rare offshore island taonga with dazzling scarlet bottlebrush nectar spikes',
  },

  // ── FLOWERING SHRUBS (6) ─────────────────────────────────────────────────────
  {
    id: 'koromiko',
    maori: 'Koromiko',
    common: "White Hebe 'Wiri Mist'",
    botanical: "Veronica 'Wiri Mist'",
    nursery: 'Oratia Natives',
    category: 'shrubs',
    tier: 'shrub',
    archetype: 'floweringShrub',
    heightM: 0.75,
    spreadM: 0.95,
    matureHeight: 0.75,
    matureSpread: 0.95,
    minSpacingM: 0.58,
    radius: 0.46,
    density: 2.5,
    edgeBias: 'mid',
    growth: [0.55, 0.88, 1.0, 1.0, 1.0],
    bloomStart: 9.8,
    bloomEnd: 3.2,
    bloomMonths: makeBloomMonths(9.8, 3.2),
    foliageColor: '#3F6E3A',
    foliageTipColor: '#66995A',
    winterColor: '#396134',
    flowerColor: '#FAF7F5',
    flowerColor2: '#EADCE3',
    trunkColor: '#5C4D3E',
    foliageHex: 0x3f6e3a,
    bloomHex: 0xfaf7f5,
    deciduous: 0.0,
    grade: 'PB5',
    rateNzd: 19,
    priceNZD: 19,
    swatch: '#EAE0E5',
    sun: 'Full sun · Coastal',
    moisture: 'Free-draining',
    ecology: 'Rich nectar spikes for native bees, admiral butterflies & korimako',
  },
  {
    id: 'manuka',
    maori: 'Mānuka',
    common: 'Crimson Tea Tree',
    botanical: "Leptospermum scoparium 'Burgundy'",
    nursery: 'Southern Woods',
    category: 'shrubs',
    tier: 'shrub',
    archetype: 'manukaShrub',
    heightM: 1.75,
    spreadM: 1.4,
    matureHeight: 1.75,
    matureSpread: 1.4,
    minSpacingM: 0.85,
    radius: 0.64,
    density: 1.2,
    edgeBias: 'core',
    growth: [0.42, 0.72, 0.92, 1.0, 1.0],
    bloomStart: 8.2,
    bloomEnd: 1.5,
    bloomMonths: makeBloomMonths(8.2, 1.5),
    foliageColor: '#3B4D32',
    foliageTipColor: '#596144',
    winterColor: '#383D2E',
    flowerColor: '#D9295C',
    flowerColor2: '#F48CA4',
    trunkColor: '#5E5045',
    foliageHex: 0x3b4d32,
    bloomHex: 0xd9295c,
    deciduous: 0.0,
    grade: 'PB5',
    rateNzd: 22,
    priceNZD: 22,
    swatch: '#D9295C',
    sun: 'Full sun · Hardy pioneer',
    moisture: 'Dry–Moist',
    ecology: 'Cloud of starry crimson-rose blossoms; essential pollinator & rongoā shrub',
  },
  {
    id: 'kakabeak',
    maori: 'Kōwhai Ngutu-kākā',
    common: 'Kākābeak',
    botanical: 'Clianthus puniceus',
    nursery: 'Oratia Natives',
    category: 'shrubs',
    tier: 'shrub',
    archetype: 'kakabeak',
    heightM: 1.65,
    spreadM: 1.6,
    matureHeight: 1.65,
    matureSpread: 1.6,
    minSpacingM: 0.9,
    radius: 0.70,
    density: 0.85,
    edgeBias: 'mid',
    growth: [0.48, 0.82, 1.0, 1.0, 1.0],
    bloomStart: 7.5,
    bloomEnd: 11.4,
    bloomMonths: makeBloomMonths(7.5, 11.4),
    foliageColor: '#4A703D',
    foliageTipColor: '#6F9658',
    winterColor: '#436337',
    flowerColor: '#E62229',
    flowerColor2: '#FF5247',
    trunkColor: '#5C4E40',
    foliageHex: 0x4a703d,
    bloomHex: 0xe62229,
    deciduous: 0.0,
    grade: '2.5L',
    rateNzd: 32,
    priceNZD: 32,
    swatch: '#E62229',
    sun: 'Full sun · Sheltered wall',
    moisture: 'Free-draining',
    ecology: 'Threatened taonga shrub bearing pendulous scarlet nectar clusters for tūī',
  },
  {
    id: 'tororaro',
    maori: 'Tororaro',
    common: 'Shrubby Tororaro',
    botanical: 'Muehlenbeckia astonii',
    nursery: 'Southern Woods',
    category: 'shrubs',
    tier: 'shrub',
    archetype: 'divaricating',
    heightM: 1.45,
    spreadM: 1.55,
    matureHeight: 1.45,
    matureSpread: 1.55,
    minSpacingM: 0.82,
    radius: 0.68,
    density: 1.2,
    edgeBias: 'mid',
    growth: [0.36, 0.66, 0.88, 1.0, 1.0],
    bloomStart: 13,
    bloomEnd: 13,
    bloomMonths: new Array(12).fill(0.25),
    foliageColor: '#694E3F',
    foliageTipColor: '#829C59',
    winterColor: '#5C4135',
    flowerColor: '#E8E5D8',
    flowerColor2: '#E8E5D8',
    trunkColor: '#4F382E',
    foliageHex: 0x694e3f,
    bloomHex: 0xe8e5d8,
    deciduous: 0.15,
    grade: 'PB5',
    rateNzd: 21,
    priceNZD: 21,
    swatch: '#7D634D',
    sun: 'Full sun · Extreme wind',
    moisture: 'Dry Coastal / Gravel',
    ecology: 'Divaricating copper wireframe refuge protecting native lizards & invertebrates',
  },
  {
    id: 'pachystegia',
    maori: 'Pachystegia',
    common: 'Marlborough Rock Daisy',
    botanical: 'Pachystegia insignis',
    nursery: 'Southern Woods',
    category: 'shrubs',
    tier: 'shrub',
    archetype: 'coneflower',
    heightM: 0.72,
    spreadM: 0.92,
    matureHeight: 0.72,
    matureSpread: 0.92,
    minSpacingM: 0.54,
    radius: 0.42,
    density: 2.6,
    edgeBias: 'border',
    growth: [0.52, 0.86, 1.0, 1.0, 1.0],
    bloomStart: 10.2,
    bloomEnd: 2.2,
    bloomMonths: makeBloomMonths(10.2, 2.2),
    foliageColor: '#6A7F64',
    foliageTipColor: '#A3B59D',
    winterColor: '#60735B',
    flowerColor: '#FCFAF5',
    flowerColor2: '#E8B838',
    trunkColor: '#6B6254',
    foliageHex: 0x6a7f64,
    bloomHex: 0xfcfaf5,
    deciduous: 0.0,
    grade: '2.5L',
    rateNzd: 24,
    priceNZD: 24,
    swatch: '#F5EFE2',
    sun: 'Full sun · Dry coastal cliff',
    moisture: 'Dry Schist & Gravel',
    ecology: 'Felted silver-olive leaves & crisp white summer daisies for native pollinators',
  },
  {
    id: 'kawakawa',
    maori: 'Kawakawa',
    common: 'NZ Pepper Tree',
    botanical: 'Piper excelsum',
    nursery: 'Oratia Natives',
    category: 'shrubs',
    tier: 'shrub',
    archetype: 'hydrangea',
    heightM: 1.55,
    spreadM: 1.35,
    matureHeight: 1.55,
    matureSpread: 1.35,
    minSpacingM: 0.82,
    radius: 0.62,
    density: 1.3,
    edgeBias: 'core',
    growth: [0.46, 0.80, 0.96, 1.0, 1.0],
    bloomStart: 11.0,
    bloomEnd: 3.2,
    bloomMonths: makeBloomMonths(11.0, 3.2),
    foliageColor: '#3F732F',
    foliageTipColor: '#6BA34B',
    winterColor: '#39662A',
    flowerColor: '#E88B28',
    flowerColor2: '#F5AD42',
    trunkColor: '#4A543B',
    foliageHex: 0x3f732f,
    bloomHex: 0xe88b28,
    deciduous: 0.0,
    grade: 'PB5',
    rateNzd: 21,
    priceNZD: 21,
    swatch: '#578F3E',
    sun: 'Part shade · Warm courtyard',
    moisture: 'Moist Sheltered',
    ecology: 'Lush heart-shaped rongoā foliage & sweet orange fruiting spikes for kererū',
  },

  // ── NATIVE TUSSOCKS & SEDGES (5) ─────────────────────────────────────────────
  {
    id: 'toetoe',
    maori: 'Toetoe',
    common: 'Coastal Toetoe',
    botanical: 'Austroderia fulvida',
    nursery: 'Oratia Natives',
    category: 'grasses',
    tier: 'accent',
    archetype: 'tussockPlume',
    heightM: 2.05,
    spreadM: 1.45,
    matureHeight: 2.05,
    matureSpread: 1.45,
    minSpacingM: 1.0,
    radius: 0.65,
    density: 1.5,
    edgeBias: 'core',
    growth: [0.44, 0.76, 0.95, 1.0, 1.0],
    bloomStart: 8.8,
    bloomEnd: 2.8,
    bloomMonths: makeBloomMonths(8.8, 2.8),
    foliageColor: '#527337',
    foliageTipColor: '#91AB59',
    winterColor: '#6B7D42',
    flowerColor: '#F2E6C2',
    flowerColor2: '#E6D39C',
    trunkColor: '#544A35',
    foliageHex: 0x527337,
    bloomHex: 0xf2e6c2,
    deciduous: 0.0,
    grade: 'PB8 / 2.5L',
    rateNzd: 24,
    priceNZD: 24,
    swatch: '#E8D9AB',
    sun: 'Full sun · Coastal & riparian',
    moisture: 'Dry–Moist',
    ecology: 'Silky arching creamy-gold plumes (true native toetoe, never invasive pampas)',
  },
  {
    id: 'chionochloa',
    maori: 'Haumata / Red Tussock',
    common: 'Red Tussock',
    botanical: 'Chionochloa rubra',
    nursery: 'Southern Woods',
    category: 'grasses',
    tier: 'accent',
    archetype: 'tussockFine',
    heightM: 1.05,
    spreadM: 0.98,
    matureHeight: 1.05,
    matureSpread: 0.98,
    minSpacingM: 0.60,
    radius: 0.44,
    density: 2.5,
    edgeBias: 'mid',
    growth: [0.42, 0.74, 0.94, 1.0, 1.0],
    bloomStart: 9.5,
    bloomEnd: 3.0,
    bloomMonths: makeBloomMonths(9.5, 3.0),
    foliageColor: '#8C4C26',
    foliageTipColor: '#C9783A',
    winterColor: '#A64D21',
    flowerColor: '#D9B578',
    flowerColor2: '#C2995B',
    trunkColor: '#59331D',
    foliageHex: 0x8c4c26,
    bloomHex: 0xd9b578,
    deciduous: 0.0,
    grade: 'PB5',
    rateNzd: 18,
    priceNZD: 18,
    swatch: '#B8622C',
    sun: 'Full sun · Wind-hardy',
    moisture: 'Moist–Dry Alpine',
    ecology: 'Iconic bronze-red upright tussock catching coastal & high-country breezes',
  },
  {
    id: 'carex_testacea',
    maori: 'Mānia / Orange Sedge',
    common: 'Speckled Orange Sedge',
    botanical: 'Carex testacea',
    nursery: 'Oratia Natives',
    category: 'grasses',
    tier: 'ground',
    archetype: 'sedgeCascading',
    heightM: 0.54,
    spreadM: 0.62,
    matureHeight: 0.54,
    matureSpread: 0.62,
    minSpacingM: 0.40,
    radius: 0.30,
    density: 4.2,
    edgeBias: 'border',
    growth: [0.62, 0.92, 1.0, 1.0, 1.0],
    bloomStart: 13,
    bloomEnd: 13,
    bloomMonths: [0.5, 0.7, 0.9, 1.0, 0.9, 0.7, 0.6, 0.5, 0.4, 0.4, 0.4, 0.5],
    foliageColor: '#697336',
    foliageTipColor: '#CC6F27',
    winterColor: '#D4661C',
    flowerColor: '#B88342',
    flowerColor2: '#B88342',
    trunkColor: '#594225',
    foliageHex: 0x9c6234,
    bloomHex: 0xd48c46,
    deciduous: 0.0,
    grade: '2.5L',
    rateNzd: 16,
    priceNZD: 16,
    swatch: '#CC6F27',
    sun: 'Full sun · Part shade',
    moisture: 'Free-draining',
    ecology: 'Drought-hardy copper-olive cascading sedge providing warm skink shelter',
  },
  {
    id: 'carex_secta',
    maori: 'Pūkio',
    common: 'Swamp & Rain-Garden Sedge',
    botanical: 'Carex secta',
    nursery: 'Oratia Natives',
    category: 'grasses',
    tier: 'ground',
    archetype: 'sedgeCascading',
    heightM: 0.85,
    spreadM: 0.90,
    matureHeight: 0.85,
    matureSpread: 0.90,
    minSpacingM: 0.54,
    radius: 0.40,
    density: 3.0,
    edgeBias: 'mid',
    growth: [0.56, 0.88, 1.0, 1.0, 1.0],
    bloomStart: 9.8,
    bloomEnd: 2.2,
    bloomMonths: makeBloomMonths(9.8, 2.2),
    foliageColor: '#4E7532',
    foliageTipColor: '#82AD4E',
    winterColor: '#597D38',
    flowerColor: '#A89F68',
    flowerColor2: '#BFB57A',
    trunkColor: '#47592B',
    foliageHex: 0x62853a,
    bloomHex: 0xa89f68,
    deciduous: 0.0,
    grade: '2.5L',
    rateNzd: 17,
    priceNZD: 17,
    swatch: '#6E8F43',
    sun: 'Sun · Wet or dry swale',
    moisture: 'Bio-retention Swale',
    ecology: 'NZBC E1 bio-retention swale sedge; filters roof & driveway stormwater runoff',
  },
  {
    id: 'poa_cita',
    maori: 'Wī / Silver Tussock',
    common: 'Silver Tussock',
    botanical: 'Poa cita',
    nursery: 'Southern Woods',
    category: 'grasses',
    tier: 'ground',
    archetype: 'tussockFine',
    heightM: 0.68,
    spreadM: 0.68,
    matureHeight: 0.68,
    matureSpread: 0.68,
    minSpacingM: 0.42,
    radius: 0.33,
    density: 3.6,
    edgeBias: 'border',
    growth: [0.54, 0.86, 1.0, 1.0, 1.0],
    bloomStart: 10.2,
    bloomEnd: 1.8,
    bloomMonths: makeBloomMonths(10.2, 1.8),
    foliageColor: '#8D9960',
    foliageTipColor: '#CFD19D',
    winterColor: '#B5AD74',
    flowerColor: '#E6E0B8',
    flowerColor2: '#D4CCA0',
    trunkColor: '#6E6847',
    foliageHex: 0x8d9960,
    bloomHex: 0xe6e0b8,
    deciduous: 0.0,
    grade: 'PB3 / 1.5L',
    rateNzd: 12,
    priceNZD: 12,
    swatch: '#C4C48B',
    sun: 'Full sun · Drought-hardy',
    moisture: 'Dry Gravel & Loam',
    ecology: 'Luminous blonde-silver tussock drifting in the slightest coastal breeze',
  },

  // ── COASTAL PERENNIALS, GROUNDCOVERS & KŌHATU STONE (3) ──────────────────────
  {
    id: 'kopakopa',
    maori: 'Kopakopa',
    common: 'Chatham Island Forget-Me-Not',
    botanical: 'Myosotidium hortensia',
    nursery: 'Oratia Natives',
    category: 'flowers',
    tier: 'ground',
    archetype: 'agapanthus',
    heightM: 0.65,
    spreadM: 0.72,
    matureHeight: 0.65,
    matureSpread: 0.72,
    minSpacingM: 0.48,
    radius: 0.34,
    density: 3.2,
    edgeBias: 'border',
    growth: [0.58, 0.90, 1.0, 1.0, 1.0],
    bloomStart: 8.5,
    bloomEnd: 12.2,
    bloomMonths: makeBloomMonths(8.5, 12.2),
    foliageColor: '#2E6636',
    foliageTipColor: '#4E8C52',
    winterColor: '#29592F',
    flowerColor: '#2D78C8',
    flowerColor2: '#75B8F0',
    trunkColor: '#355E38',
    foliageHex: 0x2e6636,
    bloomHex: 0x2d78c8,
    deciduous: 0.0,
    grade: '2.5L',
    rateNzd: 26,
    priceNZD: 26,
    swatch: '#3B84CC',
    sun: 'Dappled shade · Coastal sun',
    moisture: 'Moist Mulched Loam',
    ecology: 'Bold ribbed coastal foliage crowned with true ocean-blue spring flower heads',
  },
  {
    id: 'panakenake',
    maori: 'Pānakenake',
    common: 'NZ Creeping Lobelia',
    botanical: 'Lobelia angulata',
    nursery: 'Southern Woods',
    category: 'flowers',
    tier: 'ground',
    archetype: 'groundcover',
    heightM: 0.10,
    spreadM: 0.65,
    matureHeight: 0.10,
    matureSpread: 0.65,
    minSpacingM: 0.34,
    radius: 0.25,
    density: 5.8,
    edgeBias: 'border',
    growth: [0.65, 0.95, 1.0, 1.0, 1.0],
    bloomStart: 10.0,
    bloomEnd: 3.5,
    bloomMonths: makeBloomMonths(10.0, 3.5),
    foliageColor: '#4C8035',
    foliageTipColor: '#73AB50',
    winterColor: '#447030',
    flowerColor: '#FFFFFF',
    flowerColor2: '#E3F0EC',
    trunkColor: '#3F692B',
    foliageHex: 0x4c8035,
    bloomHex: 0xffffff,
    deciduous: 0.0,
    grade: '1.5L',
    rateNzd: 15,
    priceNZD: 15,
    swatch: '#639E44',
    sun: 'Part shade · Sun',
    moisture: 'Moist Paver Joints',
    ecology: 'Living green carpet softening Firth stepping pavers with starry white blooms',
  },
  {
    id: 'boulder',
    maori: 'Kōhatu / Mossy Basalt',
    common: 'NZ Volcanic Feature Stone',
    botanical: 'Local NZ Basalt / Greywacke',
    nursery: 'NZ Natural Stone',
    category: 'flowers',
    tier: 'stone',
    archetype: 'boulder',
    heightM: 0.45,
    spreadM: 0.76,
    matureHeight: 0.45,
    matureSpread: 0.76,
    minSpacingM: 0.65,
    radius: 0.38,
    density: 0.8,
    edgeBias: 'border',
    growth: [1.0, 1.0, 1.0, 1.0, 1.0],
    bloomStart: 13,
    bloomEnd: 13,
    bloomMonths: new Array(12).fill(0.5),
    foliageColor: '#585B56',
    foliageTipColor: '#6F7A58',
    winterColor: '#525550',
    flowerColor: '#6F7C53',
    flowerColor2: '#6F7C53',
    trunkColor: '#494B47',
    foliageHex: 0x585b56,
    bloomHex: 0x6f7c53,
    deciduous: 0.0,
    grade: 'Feature',
    rateNzd: 95,
    priceNZD: 95,
    swatch: '#626560',
    sun: 'Any',
    moisture: 'All Conditions',
    ecology: 'Warm sun-basking stone habitat for native copper skinks & geckos',
  },
];

export const NZ_PLANTS = NZ_SPECIES;

export const SPECIES_BY_ID = Object.fromEntries(NZ_SPECIES.map((s) => [s.id, s]));
// Convenient backwards-compatible aliases
SPECIES_BY_ID.ti_kouka = SPECIES_BY_ID.tikouka;
SPECIES_BY_ID.silver_spear = SPECIES_BY_ID.astelia;
SPECIES_BY_ID.red_tussock = SPECIES_BY_ID.chionochloa;

export const PLANT_MAP = SPECIES_BY_ID;

// ── 8 CURATED AOTEAROA ECOLOGICAL & ARCHITECTURAL COMPOSITIONS ───────────────
export const NZ_COMPOSITIONS = [
  {
    id: 'coastal_native',
    title: 'Tāmaki Coastal & Pōhutukawa',
    name: 'Tāmaki Coastal & Pōhutukawa',
    subtitle: 'Salt-tolerant crimson summer canopy, harakeke, rock daisy & kopakopa',
    soil: 'Volcanic loam · Dry–Moist',
    density: 3.6,
    defaultSeasonMonth: 11.4,
    swatches: ['#D91E2A', '#577A3C', '#E8D9AB', '#D67C22', '#3B84CC', '#F5EFE2'],
    palette: ['#D91E2A', '#577A3C', '#E8D9AB', '#D67C22', '#3B84CC', '#F5EFE2'],
    mix: [
      { id: 'carex_testacea', weight: 0.20, layer: 'matrix' },
      { id: 'libertia', weight: 0.18, layer: 'matrix' },
      { id: 'pachystegia', weight: 0.16, layer: 'flower' },
      { id: 'kopakopa', weight: 0.14, layer: 'flower' },
      { id: 'koromiko', weight: 0.12, layer: 'shrub' },
      { id: 'harakeke', weight: 0.09, layer: 'structure' },
      { id: 'toetoe', weight: 0.07, layer: 'structure' },
      { id: 'pohutukawa', weight: 0.04, layer: 'canopy' },
    ],
  },
  {
    id: 'pollinator_meadow',
    title: 'Kōwhai & Mānuka Tūī Sanctuary',
    name: 'Kōwhai & Mānuka Tūī Sanctuary',
    subtitle: 'Four-season golden kōwhai, kākābeak & mānuka nectar matrix',
    soil: 'Free-draining garden loam',
    density: 3.5,
    defaultSeasonMonth: 9.2,
    swatches: ['#E8B732', '#E62229', '#D9295C', '#EAE0E5', '#84B063', '#7C9A52'],
    palette: ['#E8B732', '#E62229', '#D9295C', '#EAE0E5', '#84B063', '#7C9A52'],
    mix: [
      { id: 'carex_testacea', weight: 0.20, layer: 'matrix' },
      { id: 'rengarenga', weight: 0.20, layer: 'matrix' },
      { id: 'koromiko', weight: 0.16, layer: 'shrub' },
      { id: 'manuka', weight: 0.14, layer: 'shrub' },
      { id: 'kakabeak', weight: 0.10, layer: 'shrub' },
      { id: 'harakeke', weight: 0.10, layer: 'structure' },
      { id: 'kowhai', weight: 0.06, layer: 'canopy' },
      { id: 'tikouka', weight: 0.04, layer: 'canopy' },
    ],
  },
  {
    id: 'forest_glade',
    title: 'Nīkau, Ponga & Kawakawa Glade',
    name: 'Nīkau, Ponga & Kawakawa Glade',
    subtitle: 'Dappled subtropical shade with silver tree ferns, palms & rock lilies',
    soil: 'Rich forest humus · Sheltered',
    density: 3.2,
    defaultSeasonMonth: 10.6,
    swatches: ['#2D5C2B', '#467D36', '#578F3E', '#9FB0A4', '#84B063', '#639E44'],
    palette: ['#2D5C2B', '#467D36', '#578F3E', '#9FB0A4', '#84B063', '#639E44'],
    mix: [
      { id: 'rengarenga', weight: 0.26, layer: 'matrix' },
      { id: 'panakenake', weight: 0.20, layer: 'ground' },
      { id: 'astelia', weight: 0.16, layer: 'structure' },
      { id: 'kawakawa', weight: 0.14, layer: 'shrub' },
      { id: 'ponga', weight: 0.12, layer: 'canopy' },
      { id: 'nikau', weight: 0.07, layer: 'canopy' },
      { id: 'boulder', weight: 0.05, layer: 'stone' },
    ],
  },
  {
    id: 'alpine_tussock',
    title: 'Central Otago Tussock & Schist',
    name: 'Central Otago Tussock & Schist',
    subtitle: 'Red & silver tussocks, divaricating tororaro, rock daisy & stone',
    soil: 'Schist gravel · Sharp drainage',
    density: 3.8,
    defaultSeasonMonth: 2.2,
    swatches: ['#B8622C', '#C4C48B', '#CC6F27', '#7D634D', '#F5EFE2', '#626560'],
    palette: ['#B8622C', '#C4C48B', '#CC6F27', '#7D634D', '#F5EFE2', '#626560'],
    mix: [
      { id: 'chionochloa', weight: 0.24, layer: 'matrix' },
      { id: 'poa_cita', weight: 0.22, layer: 'matrix' },
      { id: 'carex_testacea', weight: 0.18, layer: 'matrix' },
      { id: 'pachystegia', weight: 0.12, layer: 'flower' },
      { id: 'tororaro', weight: 0.10, layer: 'shrub' },
      { id: 'platts_black', weight: 0.08, layer: 'structure' },
      { id: 'boulder', weight: 0.06, layer: 'stone' },
    ],
  },
  {
    id: 'arch_subtropical',
    title: 'Architectural Lancewood & Silver',
    name: 'Architectural Lancewood & Silver',
    subtitle: 'Sculptural horoeka, tī kōuka, black flax, Poor Knights lily & pewter spear',
    soil: 'Daltons Bark Mulch · Modern',
    density: 3.0,
    defaultSeasonMonth: 10.2,
    swatches: ['#5E4F35', '#4A282E', '#9FB0A4', '#D92323', '#7C9A52', '#CC6F27'],
    palette: ['#5E4F35', '#4A282E', '#9FB0A4', '#D92323', '#7C9A52', '#CC6F27'],
    mix: [
      { id: 'carex_testacea', weight: 0.22, layer: 'matrix' },
      { id: 'rengarenga', weight: 0.18, layer: 'matrix' },
      { id: 'astelia', weight: 0.16, layer: 'structure' },
      { id: 'platts_black', weight: 0.16, layer: 'structure' },
      { id: 'xeronema', weight: 0.12, layer: 'flower' },
      { id: 'horoeka', weight: 0.10, layer: 'structure' },
      { id: 'tikouka', weight: 0.06, layer: 'canopy' },
    ],
  },
  {
    id: 'raingarden_swale',
    title: 'Kaitiakitanga Rain-Garden (NZBC E1)',
    name: 'Kaitiakitanga Rain-Garden (NZBC E1)',
    subtitle: 'Stormwater bio-retention swale with pūkio, harakeke, toetoe & tī kōuka',
    soil: 'Engineered bio-retention media',
    density: 3.6,
    defaultSeasonMonth: 11.2,
    swatches: ['#6E8F43', '#577A3C', '#E8D9AB', '#7C9A52', '#EAE0E5', '#CC6F27'],
    palette: ['#6E8F43', '#577A3C', '#E8D9AB', '#7C9A52', '#EAE0E5', '#CC6F27'],
    mix: [
      { id: 'carex_secta', weight: 0.34, layer: 'matrix' },
      { id: 'carex_testacea', weight: 0.18, layer: 'matrix' },
      { id: 'harakeke', weight: 0.16, layer: 'structure' },
      { id: 'rengarenga', weight: 0.12, layer: 'matrix' },
      { id: 'toetoe', weight: 0.09, layer: 'structure' },
      { id: 'koromiko', weight: 0.06, layer: 'shrub' },
      { id: 'tikouka', weight: 0.05, layer: 'canopy' },
    ],
  },
  {
    id: 'coastal_headland',
    title: 'Coastal Headland & Kopakopa',
    name: 'Coastal Headland & Kopakopa',
    subtitle: 'Chatham Island forget-me-not, toetoe plumes, mikoikoi & basalt stone',
    soil: 'Coastal sand & volcanic loam',
    density: 3.5,
    defaultSeasonMonth: 10.8,
    swatches: ['#3B84CC', '#E8D9AB', '#D67C22', '#9FB0A4', '#577A3C', '#626560'],
    palette: ['#3B84CC', '#E8D9AB', '#D67C22', '#9FB0A4', '#577A3C', '#626560'],
    mix: [
      { id: 'libertia', weight: 0.22, layer: 'matrix' },
      { id: 'kopakopa', weight: 0.20, layer: 'flower' },
      { id: 'pachystegia', weight: 0.16, layer: 'flower' },
      { id: 'astelia', weight: 0.14, layer: 'structure' },
      { id: 'harakeke', weight: 0.11, layer: 'structure' },
      { id: 'toetoe', weight: 0.09, layer: 'structure' },
      { id: 'boulder', weight: 0.05, layer: 'stone' },
      { id: 'titoki', weight: 0.03, layer: 'canopy' },
    ],
  },
  {
    id: 'minimal_courtyard',
    title: 'Contemporary Corten Courtyard',
    name: 'Contemporary Corten Courtyard',
    subtitle: 'Restrained architectural silver spear, copper sedge, pānakenake & ponga',
    soil: 'Free-draining courtyard bed',
    density: 3.4,
    defaultSeasonMonth: 10.4,
    swatches: ['#9FB0A4', '#CC6F27', '#639E44', '#467D36', '#4A282E', '#626560'],
    palette: ['#9FB0A4', '#CC6F27', '#639E44', '#467D36', '#4A282E', '#626560'],
    mix: [
      { id: 'carex_testacea', weight: 0.28, layer: 'matrix' },
      { id: 'panakenake', weight: 0.22, layer: 'ground' },
      { id: 'astelia', weight: 0.20, layer: 'structure' },
      { id: 'platts_black', weight: 0.14, layer: 'structure' },
      { id: 'boulder', weight: 0.09, layer: 'stone' },
      { id: 'ponga', weight: 0.07, layer: 'canopy' },
    ],
  },
];

// Also expose `.species` alias on each composition for engine compatibility
for (const c of NZ_COMPOSITIONS) {
  c.species = c.mix;
}

// ── PURE 2D NOISE, SPLINE & ECOLOGICAL DRIFT PLACEMENT MATH ──────────────────

function hash2(ix, iz) {
  const n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

/** Smooth 2D value noise for naturalistic Piet Oudolf drift/clump zones */
export function noise2D(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

/** Deterministic PRNG for reproducible composition fills */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Evaluate closed Catmull-Rom spline through control points `pts: ([x, z] | {x, z})[]` into `[x, z][]` */
export function sampleClosedSpline(pts, segmentsPerSpan = 12) {
  const norm = pts.map((p) => (Array.isArray(p) ? [p[0], p[1]] : [p.x, p.z]));
  const n = norm.length;
  if (n < 3) return norm;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = norm[(i - 1 + n) % n];
    const p1 = norm[i];
    const p2 = norm[(i + 1) % n];
    const p3 = norm[(i + 2) % n];
    for (let s = 0; s < segmentsPerSpan; s++) {
      const t = s / segmentsPerSpan;
      const t2 = t * t, t3 = t2 * t;
      const x =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const z =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      out.push([x, z]);
    }
  }
  return out;
}

export function polygonAreaM2(poly) {
  let a = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const p1 = poly[i], p2 = poly[(i + 1) % n];
    const x1 = Array.isArray(p1) ? p1[0] : p1.x;
    const z1 = Array.isArray(p1) ? p1[1] : p1.z;
    const x2 = Array.isArray(p2) ? p2[0] : p2.x;
    const z2 = Array.isArray(p2) ? p2[1] : p2.z;
    a += x1 * z2 - x2 * z1;
  }
  return Math.abs(a) * 0.5;
}

export function polygonPerimeterM(poly) {
  let p = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const p1 = poly[i], p2 = poly[(i + 1) % n];
    const x1 = Array.isArray(p1) ? p1[0] : p1.x;
    const z1 = Array.isArray(p1) ? p1[1] : p1.z;
    const x2 = Array.isArray(p2) ? p2[0] : p2.x;
    const z2 = Array.isArray(p2) ? p2[1] : p2.z;
    p += Math.hypot(x2 - x1, z2 - z1);
  }
  return p;
}

export function pointInPolygon(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i], pj = poly[j];
    const xi = Array.isArray(pi) ? pi[0] : pi.x;
    const zi = Array.isArray(pi) ? pi[1] : pi.z;
    const xj = Array.isArray(pj) ? pj[0] : pj.x;
    const zj = Array.isArray(pj) ? pj[1] : pj.z;
    const intersect = (zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function distToPolygonEdge(x, z, poly) {
  let minD = Infinity;
  for (let i = 0, n = poly.length; i < n; i++) {
    const p1 = poly[i], p2 = poly[(i + 1) % n];
    const x1 = Array.isArray(p1) ? p1[0] : p1.x;
    const z1 = Array.isArray(p1) ? p1[1] : p1.z;
    const x2 = Array.isArray(p2) ? p2[0] : p2.x;
    const z2 = Array.isArray(p2) ? p2[1] : p2.z;
    const dx = x2 - x1, dz = z2 - z1;
    const len2 = dx * dx + dz * dz;
    const t = len2 > 1e-8 ? Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / len2)) : 0;
    const d = Math.hypot(x - (x1 + t * dx), z - (z1 + t * dz));
    if (d < minD) minD = d;
  }
  return minD;
}

/**
 * Choose a species from `composition` combining:
 *  1. Ecological edge-to-core stratification (low sedges/groundcovers hug kerbs; canopy trees rise in bed interior)
 *  2. Optional Piet Oudolf `noise2D` spatial drift clumping when `(x, z, clumping)` are supplied!
 */
export function pickSpeciesForSpot(composition, edgeDistM, rnd, x = null, z = null, clumping = 0.68, seed = 17) {
  const mix = composition.mix || composition.species || [];
  if (!mix.length) return 'carex_testacea';

  const useDrift = x !== null && z !== null && clumping > 0.08;
  const freq = 0.34 + (1 - clumping) * 0.42;

  const weighted = mix.map((entry, idx) => {
    const sp = SPECIES_BY_ID[entry.id];
    if (!sp) return { id: entry.id, w: 0 };
    let zoneMult = 1.0;
    if (sp.edgeBias === 'border') {
      zoneMult = edgeDistM < 0.95 ? 2.25 : edgeDistM < 1.85 ? 0.9 : 0.35;
    } else if (sp.edgeBias === 'core') {
      zoneMult = edgeDistM < 0.50 ? 0.0 : edgeDistM < 1.05 ? 0.55 : 2.25;
    } else {
      zoneMult = edgeDistM < 0.32 ? 0.45 : 1.25;
    }
    let driftMult = 1.0;
    if (useDrift && zoneMult > 0) {
      const n = noise2D(x * freq + idx * 19.3 + seed * 7.1, z * freq + idx * 31.7 + seed * 11.3);
      driftMult = Math.pow(0.25 + n * 1.5, 1.0 + clumping * 2.2);
    }
    return { id: sp.id, w: entry.weight * zoneMult * driftMult };
  });

  const total = weighted.reduce((s, item) => s + item.w, 0);
  if (total <= 0) return SPECIES_BY_ID[mix[0].id]?.id ?? mix[0].id;
  let r = rnd() * total;
  for (const item of weighted) {
    r -= item.w;
    if (r <= 0) return item.id;
  }
  return weighted[weighted.length - 1].id;
}

/**
 * Populate an organic spline or brushed planting bed with stratified + Piet Oudolf drift-clumped NZ natives.
 */
export function generateBedPlanting({
  controlPoints,
  isRawPoly = false,
  compositionId = 'coastal_native',
  seed = 42,
  density = 1.0,
  clumping = 0.72,
  bedId = 'bed-1',
}) {
  const comp = NZ_COMPOSITIONS.find((c) => c.id === compositionId) ?? NZ_COMPOSITIONS[0];
  const poly = isRawPoly
    ? controlPoints.map((p) => (Array.isArray(p) ? [p[0], p[1]] : [p.x, p.z]))
    : sampleClosedSpline(controlPoints, 12);
  if (poly.length < 3) return [];

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of poly) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  const rnd = mulberry32(seed);
  const area = polygonAreaM2(poly);
  const attempts = Math.min(5200, Math.max(320, Math.round(area * 64 * density)));
  const plants = [];

  for (let i = 0; i < attempts; i++) {
    const x = minX + rnd() * (maxX - minX);
    const z = minZ + rnd() * (maxZ - minZ);
    if (!pointInPolygon(x, z, poly)) continue;
    const edgeD = distToPolygonEdge(x, z, poly);
    if (edgeD < 0.2) continue;

    const spId = pickSpeciesForSpot(comp, edgeD, rnd, x, z, clumping, seed);
    const sp = SPECIES_BY_ID[spId];
    if (!sp) continue;

    if (sp.tier === 'canopy' && edgeD < 0.5) continue;

    const minDist = (sp.minSpacingM / Math.sqrt(Math.max(0.4, density))) * 0.82;
    let collides = false;
    for (let j = plants.length - 1; j >= 0; j--) {
      const o = plants[j];
      const oSp = SPECIES_BY_ID[o.speciesId];
      const req = Math.max(minDist, (oSp?.minSpacingM ?? 0.45) * 0.64);
      if (Math.hypot(o.x - x, o.z - z) < req) {
        collides = true;
        break;
      }
    }
    if (collides) continue;

    plants.push({
      id: `p_${seed}_${plants.length}`,
      bedId,
      speciesId: sp.id,
      x: +x.toFixed(3),
      z: +z.toFixed(3),
      scale: +(0.84 + rnd() * 0.34).toFixed(3),
      rot: +(rnd() * Math.PI * 2).toFixed(3),
      tintSeed: +rnd().toFixed(3),
    });
  }
  return plants;
}

/** Default organic kidney-shaped studio garden bed */
export function defaultKidneyBedPoints() {
  return [
    [-4.8, 1.4],
    [-2.4, 2.35],
    [0.4, 1.75],
    [3.3, 2.55],
    [5.2, 1.15],
    [4.9, -1.35],
    [2.5, -2.45],
    [-0.4, -1.95],
    [-3.4, -2.35],
    [-5.3, -0.75],
  ];
}

/** Calculate live NZ nursery schedule, supplier hardscapes & indicative NZD cost */
export function buildPlantingSchedule(beds, plants, surfaceAreasM2 = null) {
  const counts = new Map();
  for (const p of plants) {
    const sp = SPECIES_BY_ID[p.speciesId];
    const key = sp ? sp.id : p.speciesId;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  let totalBedAreaM2 = 0;
  let totalPerimeterM = 0;
  let totalEdgingCostNzd = 0;
  let totalMulchCostNzd = 0;

  for (const b of beds) {
    const poly = b.isRawPoly ? b.points : sampleClosedSpline(b.points, 12);
    const area = polygonAreaM2(poly);
    const perim = polygonPerimeterM(poly);
    totalBedAreaM2 += area;
    totalPerimeterM += perim;
    const edg = EDGING_STYLES[b.edging] ?? EDGING_STYLES.corten;
    const mlc = MULCH_STYLES[b.mulch] ?? MULCH_STYLES.bark;
    totalEdgingCostNzd += perim * edg.ratePerM;
    totalMulchCostNzd += area * mlc.ratePerM2;
  }

  // Optional painted NZ supplier hardscape surface areas (Firth pavers, Waikato pebble, Otago schist, Kwila deck)
  let surfaceCostNzd = 0;
  const surfaceRows = [];
  if (surfaceAreasM2) {
    for (const surf of NZ_SURFACES) {
      if (surf.channel === 0 || surf.channel === 1) continue; // Lawn base & bed mulch already counted
      const m2 = Number(surfaceAreasM2[surf.id] || surfaceAreasM2[surf.channel] || 0);
      if (m2 >= 0.8) {
        const sub = Math.round(m2 * surf.pricePerM2);
        surfaceCostNzd += sub;
        surfaceRows.push({
          id: surf.id,
          name: surf.name,
          brand: surf.brand,
          spec: surf.spec,
          swatch: surf.swatch,
          areaM2: +m2.toFixed(1),
          rateNzd: surf.pricePerM2,
          subtotalNzd: sub,
        });
      }
    }
  }

  const rows = [];
  let totalPlantsCostNzd = 0;
  for (const sp of NZ_SPECIES) {
    const qty = counts.get(sp.id) || 0;
    if (!qty) continue;
    const subtotal = qty * sp.rateNzd;
    totalPlantsCostNzd += subtotal;
    rows.push({
      speciesId: sp.id,
      maori: sp.maori,
      common: sp.common,
      botanical: sp.botanical,
      nursery: sp.nursery,
      tier: sp.tier,
      grade: sp.grade,
      swatch: sp.swatch,
      qty,
      rateNzd: sp.rateNzd,
      subtotalNzd: subtotal,
      ecology: sp.ecology,
    });
  }
  rows.sort((a, b) => b.qty - a.qty);

  const hardscapeCostNzd = Math.round(totalEdgingCostNzd + totalMulchCostNzd + surfaceCostNzd);
  const totalNzd = Math.round(totalPlantsCostNzd + hardscapeCostNzd);
  return {
    bedCount: beds.length,
    totalAreaM2: +totalBedAreaM2.toFixed(1),
    totalPerimeterM: +totalPerimeterM.toFixed(1),
    totalPlants: plants.length,
    densityPerM2: totalBedAreaM2 > 0.1 ? +(plants.length / totalBedAreaM2).toFixed(1) : 0,
    plantsCostNzd: Math.round(totalPlantsCostNzd),
    hardscapeCostNzd,
    totalNzd,
    rows,
    surfaceRows,
  };
}

export function exportPlantingCSV(schedule, siteLabel = 'Aotearoa Landscape Concept') {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    `# NZ Native Planting & Supplier Schedule — ${siteLabel}`,
    `# Bed Area: ${schedule.totalAreaM2} m² | Total Plants: ${schedule.totalPlants} (${schedule.densityPerM2} plants/m²) | Indicative Supply + Hardscape: $${schedule.totalNzd.toLocaleString('en-NZ')} NZD excl. GST`,
    'Te Reo / Common Name,Botanical Name,Supplier / Nursery,Tier,Grade,Qty,Unit Rate (NZD),Subtotal (NZD),Ecological Role',
    ...schedule.rows.map((r) =>
      [r.maori, r.botanical, r.nursery, r.tier, r.grade, r.qty, r.rateNzd, r.subtotalNzd, r.ecology].map(q).join(',')
    ),
    ...(schedule.surfaceRows || []).map((sr) =>
      [sr.name, sr.spec, sr.brand, 'hardscape', 'm²', sr.areaM2, sr.rateNzd, sr.subtotalNzd, 'NZ Hardscape Surface'].map(q).join(',')
    ),
    ['Edging & Daltons Mulch Bed Prep', `${schedule.bedCount} bed(s), ${schedule.totalAreaM2} m²`, 'Straightcurve / Daltons NZ', 'hardscape', 'lot', 1, schedule.hardscapeCostNzd, schedule.hardscapeCostNzd, 'Curved edging + 75 mm bark mulch'].map(q).join(','),
    ['TOTAL INDICATIVE ESTIMATE (NZD EXCL. GST)', '', '', '', '', schedule.totalPlants, '', schedule.totalNzd, 'Confirm regional NZ wholesale nursery availability'].map(q).join(','),
  ];
  return lines.join('\n');
}

/** Export scaled 2D Architectural Landscape Planting Plan (A3 SVG with bed outlines, canopy circles & botanical legend) */
export function exportPlantingPlanSVG({ beds, plants, schedule, siteLabel = 'NZ Native Planting Plan' }) {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  let minX = -7, maxX = 7, minZ = -5, maxZ = 5;
  for (const b of beds) {
    for (const pt of b.points) {
      const x = Array.isArray(pt) ? pt[0] : pt.x;
      const z = Array.isArray(pt) ? pt[1] : pt.z;
      if (x - 1.5 < minX) minX = x - 1.5;
      if (x + 1.5 > maxX) maxX = x + 1.5;
      if (z - 1.5 < minZ) minZ = z - 1.5;
      if (z + 1.5 > maxZ) maxZ = z + 1.5;
    }
  }
  for (const p of plants) {
    if (p.x - 1.5 < minX) minX = p.x - 1.5;
    if (p.x + 1.5 > maxX) maxX = p.x + 1.5;
    if (p.z - 1.5 < minZ) minZ = p.z - 1.5;
    if (p.z + 1.5 > maxZ) maxZ = p.z + 1.5;
  }

  const drawW = 740, drawH = 720;
  const sc = Math.min(drawW / Math.max(2, maxX - minX), drawH / Math.max(2, maxZ - minZ));
  const ox = 44 + (drawW - (maxX - minX) * sc) * 0.5;
  const oy = 68 + (drawH - (maxZ - minZ) * sc) * 0.5;
  const px = (x) => (ox + (x - minX) * sc).toFixed(1);
  const py = (z) => (oy + (z - minZ) * sc).toFixed(1);

  const bedPaths = beds
    .map((b) => {
      const poly = b.isRawPoly
        ? b.points.map((pt) => (Array.isArray(pt) ? pt : [pt.x, pt.z]))
        : sampleClosedSpline(b.points, 14);
      if (poly.length < 3) return '';
      const d = poly.map(([x, z], i) => `${i ? 'L' : 'M'}${px(x)},${py(z)}`).join(' ') + ' Z';
      return `<path d="${d}" fill="#F3ECE6" stroke="#8F4424" stroke-width="2.6"/>`;
    })
    .join('\n  ');

  const tierOrder = { ground: 0, stone: 1, shrub: 2, accent: 3, canopy: 4 };
  const sorted = [...plants].sort(
    (a, b) => (tierOrder[SPECIES_BY_ID[a.speciesId]?.tier] ?? 0) - (tierOrder[SPECIES_BY_ID[b.speciesId]?.tier] ?? 0)
  );

  const circles = sorted
    .map((p) => {
      const sp = SPECIES_BY_ID[p.speciesId];
      if (!sp) return '';
      const r = Math.max(3.2, sp.spreadM * 0.42 * (p.scale || 1) * sc);
      return `<circle cx="${px(p.x)}" cy="${py(p.z)}" r="${r.toFixed(1)}" fill="${sp.swatch}" fill-opacity="0.58" stroke="#240B21" stroke-width="0.9"/>`;
    })
    .join('\n  ');

  const legend = schedule.rows
    .slice(0, 14)
    .map((r, i) => {
      const y = 112 + i * 44;
      return `<circle cx="826" cy="${y - 4}" r="8" fill="${r.swatch}" stroke="#240B21" stroke-width="1"/>
      <text x="844" y="${y - 6}" font-family="Instrument Sans, sans-serif" font-size="11.5" font-weight="500" fill="#240B21">${esc(r.maori)} (${r.qty}× ${r.grade})</text>
      <text x="844" y="${y + 9}" font-family="IBM Plex Mono, monospace" font-size="9.5" fill="#654A4E">${esc(r.botanical)} · $${r.subtotalNzd.toLocaleString('en-NZ')}</text>`;
    })
    .join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1190 842" style="width:100%;height:auto;display:block" role="img" aria-label="${esc(siteLabel)}">
  <rect width="1190" height="842" fill="#FFFDFB"/>
  <rect x="24" y="24" width="1142" height="794" fill="none" stroke="#240B21" stroke-width="1.8"/>
  <line x1="798" y1="24" x2="798" y2="818" stroke="#240B21" stroke-width="1.2"/>
  <text x="44" y="52" font-family="IBM Plex Mono, monospace" font-size="11" fill="#654A4E">L101 · AOTEAROA NATIVE PLANTING PLAN · ${schedule.totalAreaM2} m² · ${schedule.totalPlants} PLANTS</text>
  ${bedPaths}
  ${circles}
  <text x="818" y="56" font-family="Instrument Sans, sans-serif" font-size="18" font-weight="500" fill="#240B21">${esc(siteLabel)}</text>
  <text x="818" y="76" font-family="IBM Plex Mono, monospace" font-size="10.5" fill="#654A4E">TOTAL ESTIMATE: $${schedule.totalNzd.toLocaleString('en-NZ')} NZD (EXCL. GST)</text>
  <line x1="818" y1="88" x2="1148" y2="88" stroke="#D4C4C6" stroke-width="1"/>
  ${legend}
  <text x="818" y="796" font-family="IBM Plex Mono, monospace" font-size="9.5" fill="#654A4E">assembl. · NZ Native Landscape Studio · Proposed Indicative Plan</text>
</svg>`;
}

// ── FREEHAND 2D SITE-PLAN GARDEN BED BRUSH (Scalar Field + Marching Squares + Chaikin) ─

export function createBrushField({ spanM = 48, res = 144 } = {}) {
  return {
    spanM,
    res,
    cellM: spanM / res,
    halfM: spanM * 0.5,
    data: new Float32Array((res + 1) * (res + 1)),
  };
}

/** Paint (`sign = +1`) or erase (`sign = -1`) a soft organic garden-bed disc into `field` at world `(wx, wz)` */
export function stampBrushField(field, wx, wz, radiusM, sign = 1) {
  const { res, cellM, halfM, data } = field;
  const rPad = radiusM * 1.35;
  const c0 = Math.max(1, Math.floor((wx - rPad + halfM) / cellM));
  const c1 = Math.min(res - 1, Math.ceil((wx + rPad + halfM) / cellM));
  const r0 = Math.max(1, Math.floor((wz - rPad + halfM) / cellM));
  const r1 = Math.min(res - 1, Math.ceil((wz + rPad + halfM) / cellM));
  const stride = res + 1;

  for (let r = r0; r <= r1; r++) {
    const gz = -halfM + r * cellM;
    for (let c = c0; c <= c1; c++) {
      const gx = -halfM + c * cellM;
      const d = Math.hypot(gx - wx, gz - wz);
      if (d > rPad) continue;
      const t = Math.max(0, Math.min(1, (rPad - d) / Math.max(0.15, rPad - radiusM * 0.55)));
      const w = t * t * (3 - 2 * t);
      const k = r * stride + c;
      if (sign > 0) {
        data[k] = Math.min(1, Math.max(data[k], w * 0.96));
      } else {
        data[k] = Math.max(0, data[k] - w * 0.98);
      }
    }
  }
}

/** Chaikin closed-loop corner cutting for smooth landscape-architect bed curves */
export function chaikinSmoothLoop(pts, passes = 2) {
  let cur = pts;
  for (let p = 0; p < passes; p++) {
    if (cur.length < 4) break;
    const next = [];
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

/** Extract smooth closed 2D garden-bed polygons (`[x, z][]`) from `field` using Marching Squares (`iso = 0.45`) */
export function extractBrushedLoops(field, iso = 0.45) {
  const { res, cellM, halfM, data } = field;
  const stride = res + 1;
  const segs = [];

  const interp = (v1, v2) => {
    const dv = v2 - v1;
    return Math.abs(dv) < 1e-6 ? 0.5 : Math.max(0.02, Math.min(0.98, (iso - v1) / dv));
  };

  for (let r = 0; r < res; r++) {
    const z0 = -halfM + r * cellM;
    const z1 = z0 + cellM;
    for (let c = 0; c < res; c++) {
      const x0 = -halfM + c * cellM;
      const x1 = x0 + cellM;
      const tl = data[r * stride + c];
      const tr = data[r * stride + c + 1];
      const br = data[(r + 1) * stride + c + 1];
      const bl = data[(r + 1) * stride + c];

      const mask = (tl >= iso ? 8 : 0) | (tr >= iso ? 4 : 0) | (br >= iso ? 2 : 0) | (bl >= iso ? 1 : 0);
      if (mask === 0 || mask === 15) continue;

      const top = [x0 + interp(tl, tr) * cellM, z0];
      const right = [x1, z0 + interp(tr, br) * cellM];
      const bottom = [x0 + interp(bl, br) * cellM, z1];
      const left = [x0, z0 + interp(tl, bl) * cellM];

      const addSeg = (a, b) => segs.push([a, b]);
      switch (mask) {
        case 1: case 14: addSeg(left, bottom); break;
        case 2: case 13: addSeg(bottom, right); break;
        case 3: case 12: addSeg(left, right); break;
        case 4: case 11: addSeg(top, right); break;
        case 5: addSeg(left, top); addSeg(bottom, right); break;
        case 6: case 9: addSeg(top, bottom); break;
        case 7: case 8: addSeg(left, top); break;
        case 10: addSeg(top, right); addSeg(left, bottom); break;
      }
    }
  }

  if (!segs.length) return [];

  const keyOf = (pt) => `${Math.round(pt[0] * 200)},${Math.round(pt[1] * 200)}`;
  const adj = new Map();
  const used = new Uint8Array(segs.length);
  segs.forEach(([a, b], idx) => {
    for (const k of [keyOf(a), keyOf(b)]) {
      let arr = adj.get(k);
      if (!arr) { arr = []; adj.set(k, arr); }
      arr.push(idx);
    }
  });

  const loops = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const ring = [segs[i][0], segs[i][1]];
    let guard = 0;
    while (guard++ < 4000) {
      const tail = ring[ring.length - 1];
      const tk = keyOf(tail);
      const candidates = adj.get(tk) || [];
      let nextIdx = -1;
      for (const ci of candidates) {
        if (!used[ci]) { nextIdx = ci; break; }
      }
      if (nextIdx < 0) break;
      used[nextIdx] = 1;
      const [sa, sb] = segs[nextIdx];
      ring.push(keyOf(sa) === tk ? sb : sa);
    }
    if (ring.length >= 6) {
      const decimated = ring.filter((_, idx) => idx % 2 === 0);
      if (decimated.length >= 4 && polygonAreaM2(decimated) >= 0.45) {
        loops.push(chaikinSmoothLoop(decimated, 2));
      }
    }
  }
  return loops;
}

/** Calculate Kaitiakitanga Biodiversity, Native Manu Attraction & NZBC E1 Stormwater Retention metrics */
export function computeEcologyMetrics(beds, plants) {
  let nectarScore = 0;
  let berryScore = 0;
  let lizardScore = 0;
  let stormwaterLitresHr = 0;

  let totalAreaM2 = 0;
  for (const b of beds) {
    const poly = b.isRawPoly ? b.points : sampleClosedSpline(b.points, 10);
    totalAreaM2 += polygonAreaM2(poly);
  }
  stormwaterLitresHr += totalAreaM2 * 18;

  const nectarIds = new Set(['pohutukawa', 'kowhai', 'harakeke', 'manuka', 'koromiko', 'kakabeak', 'xeronema', 'pachystegia', 'kopakopa']);
  const berryIds = new Set(['tikouka', 'ti_kouka', 'nikau', 'titoki', 'kowhai', 'astelia', 'silver_spear', 'kawakawa']);
  const lizardIds = new Set(['boulder', 'tororaro', 'carex_testacea', 'chionochloa', 'red_tussock', 'poa_cita', 'rengarenga', 'libertia', 'panakenake']);
  const swaleIds = new Set(['carex_secta', 'harakeke', 'toetoe', 'tikouka', 'ti_kouka', 'ponga']);

  for (const p of plants) {
    const id = SPECIES_BY_ID[p.speciesId]?.id ?? p.speciesId;
    if (nectarIds.has(id)) {
      nectarScore += id === 'kowhai' || id === 'pohutukawa' || id === 'kakabeak' ? 14 : 5;
    }
    if (berryIds.has(id)) {
      berryScore += id === 'tikouka' || id === 'nikau' || id === 'titoki' ? 12 : 4;
    }
    if (lizardIds.has(id)) {
      lizardScore += id === 'boulder' || id === 'tororaro' ? 10 : 3;
    }
    if (swaleIds.has(id)) {
      stormwaterLitresHr += 9;
    }
  }

  return {
    tuiAttractionPct: Math.min(100, Math.round(nectarScore)),
    kereruAttractionPct: Math.min(100, Math.round(berryScore)),
    skinkHabitatPct: Math.min(100, Math.round(lizardScore)),
    stormwaterLitresHr: Math.round(stormwaterLitresHr),
  };
}
