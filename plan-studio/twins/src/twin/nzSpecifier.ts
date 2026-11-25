// Live Aotearoa NZ Architectural Specifier, Cost ($ NZD) & Programme Lead-Time / Time-Delay Engine.
// Pure TypeScript with zero browser/Three.js imports so Node unit tests run it directly.
//
// Covers all 9 architectural & landscape categories requested by NZ practices and clients:
//   1. Cladding        2. Roofing           3. Window & Door Joinery
//   4. Interior Colour 5. Interior Flooring 6. NZ Fittings & Tapware
//   7. Fit-Out & Furniture Suite            8. Architectural Lighting
//   9. NZ Native Landscaping & External Works
//
// Every option carries:
//   - Material render parameters (hex, roughness, metalness, emissive, layoutMode, floraPreset)
//   - Indicative NZ supply + install rate ($ NZD excl. GST, per m² or package, transparently marked illustrative)
//   - NZ supplier/fabrication lead time in weeks, compared against baseline procurement float to compute live time delay
//   - Cited NZ Building Code / NZS 3604 clauses (B2, E2, H1, D1, G7)

export type SpecCategoryId =
  | 'cladding'
  | 'roof'
  | 'joinery'
  | 'colours'
  | 'flooring'
  | 'fittings'
  | 'fitout'
  | 'lighting'
  | 'landscaping';

export interface SpecOption {
  id: string;
  label: string;
  swatch: string;
  specLine: string;
  /** Indicative NZD rate: per m² of measured area if unit === 'm2', else fixed zone/project allowance */
  rateNzd: number;
  unit: 'm2' | 'package';
  /** Typical NZ fabrication/delivery lead time in weeks */
  leadWeeks: number;
  nzbcClause: string;
  zones: ('B' | 'C' | 'D' | 'E')[];
  render: {
    hex: number;
    roughness: number;
    metalness: number;
    accentHex?: number;
    lightKelvin?: number;
    lightBoost?: number;
    layoutMode?: string;
    floraDensity?: number;
    floraPalette?: 'coastal' | 'bush' | 'wetland' | 'minimal';
  };
}

export interface SpecCategory {
  id: SpecCategoryId;
  title: string;
  shortTitle: string;
  /** Multiplier from building floor area (m²) to this element's measured quantity when unit === 'm2' */
  areaFactor: number;
  baselineOptionId: string;
  options: SpecOption[];
}

export const SPEC_CATEGORIES: SpecCategory[] = [
  {
    id: 'cladding',
    title: 'Exterior Cladding',
    shortTitle: 'Cladding',
    areaFactor: 0.92, // wall envelope ~ 0.92 × floor area
    baselineOptionId: 'cedar-oil',
    options: [
      {
        id: 'cedar-oil',
        label: 'Western Red Cedar Shiplap, Natural Oil',
        swatch: '#A86F45',
        specLine: '135 mm vertical Western Red Cedar weatherboard over 20 mm drained cavity, penetrating natural oil',
        rateNzd: 285,
        unit: 'm2',
        leadWeeks: 4,
        nzbcClause: 'NZBC E2/AS1 & B2.3.1 (15 yr cladding)',
        zones: ['B', 'C', 'D'],
        render: { hex: 0xa86f45, roughness: 0.68, metalness: 0.03 },
      },
      {
        id: 'cedar-black',
        label: 'Cedar Vertical Shiplap, Carbon Black Stain',
        swatch: '#262220',
        specLine: '135 mm kiln-dried cedar shiplap on drained cavity, pigmented carbon-black oil stain, 316 SS fixings',
        rateNzd: 298,
        unit: 'm2',
        leadWeeks: 4,
        nzbcClause: 'NZBC E2/AS1 & B2 (316 SS Zone D/E)',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0x262220, roughness: 0.64, metalness: 0.05 },
      },
      {
        id: 'colorsteel-marine',
        label: 'Trapezoidal Ribbed Steel, Marine Charcoal',
        swatch: '#36383C',
        specLine: '0.55 mm marine-coated prefinished steel rib profile at 300 mm centres on thermal break cavity battens',
        rateNzd: 215,
        unit: 'm2',
        leadWeeks: 5,
        nzbcClause: 'NZBC E2/AS1 & B2 (Coastal Zone B–E)',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0x36383c, roughness: 0.42, metalness: 0.56 },
      },
      {
        id: 'chalk-plaster',
        label: 'Architectural Mineral Plaster, Warm Chalk',
        swatch: '#EAE4DC',
        specLine: '20 mm drained cavity fibre-cement substrate with breathable mineral silicate plaster, warm chalk',
        rateNzd: 320,
        unit: 'm2',
        leadWeeks: 6,
        nzbcClause: 'NZBC E2/VM1 tested cavity plaster',
        zones: ['B', 'C', 'D'],
        render: { hex: 0xeae4dc, roughness: 0.84, metalness: 0.0 },
      },
      {
        id: 'heritage-brick',
        label: 'Kiln-Fired Clay Brick Veneer, Warm Terracotta',
        swatch: '#9C5543',
        specLine: '70 mm NZ kiln-fired clay brick veneer over 50 mm vented cavity, flush raked lime-sand mortar',
        rateNzd: 345,
        unit: 'm2',
        leadWeeks: 5,
        nzbcClause: 'NZBC B1/AS1 & B2.3.1 (50 yr durability)',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0x9c5543, roughness: 0.86, metalness: 0.02 },
      },
    ],
  },
  {
    id: 'roof',
    title: 'Roofing Profile & Coating',
    shortTitle: 'Roofing',
    areaFactor: 1.15,
    baselineOptionId: 'corr-charcoal',
    options: [
      {
        id: 'corr-charcoal',
        label: 'Corrugated Steel, Charcoal',
        swatch: '#2F3134',
        specLine: '0.55 mm corrugated prefinished steel roofing over synthetic breathable underlay, charcoal',
        rateNzd: 145,
        unit: 'm2',
        leadWeeks: 4,
        nzbcClause: 'NZBC E2/AS1 8.4 Profiled Metal',
        zones: ['B', 'C', 'D'],
        render: { hex: 0x2f3134, roughness: 0.46, metalness: 0.52 },
      },
      {
        id: 'tray-black-marine',
        label: 'Standing-Seam Eurotray, Marine Black',
        swatch: '#1B1C1F',
        specLine: 'Angle-seam 450 mm architectural tray roofing on plywood substrate, marine-grade matt black',
        rateNzd: 235,
        unit: 'm2',
        leadWeeks: 7,
        nzbcClause: 'NZBC E2 & B2 Sea-Spray Zone E',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0x1b1c1f, roughness: 0.36, metalness: 0.65 },
      },
      {
        id: 'corr-warmgrey',
        label: 'Corrugated Steel, Warm Grey',
        swatch: '#6C6A64',
        specLine: '0.55 mm corrugated prefinished steel, high solar-reflectance warm mid-grey',
        rateNzd: 145,
        unit: 'm2',
        leadWeeks: 4,
        nzbcClause: 'NZBC E2/AS1 & H1 Solar Gain Reduction',
        zones: ['B', 'C', 'D'],
        render: { hex: 0x6c6a64, roughness: 0.48, metalness: 0.48 },
      },
      {
        id: 'zinc-natural',
        label: 'Natural Unpainted Zinc-Aluminium',
        swatch: '#A9ADB0',
        specLine: 'Unpainted zinc-aluminium alloy standing-seam / corrugate, weathers to soft pewter',
        rateNzd: 168,
        unit: 'm2',
        leadWeeks: 4,
        nzbcClause: 'NZBC E2/AS1 (Sheltered/Inland Zone B–C)',
        zones: ['B', 'C'],
        render: { hex: 0xa9adb0, roughness: 0.34, metalness: 0.78 },
      },
    ],
  },
  {
    id: 'joinery',
    title: 'Window & Door Joinery',
    shortTitle: 'Joinery',
    areaFactor: 0.34,
    baselineOptionId: 'alu-black-tb',
    options: [
      {
        id: 'alu-black-tb',
        label: 'Thermally Broken Aluminium, Matt Black',
        swatch: '#18181A',
        specLine: 'Polyamide thermally broken aluminium joinery, matt black powdercoat, argon Low-E IGU (R0.50)',
        rateNzd: 980,
        unit: 'm2',
        leadWeeks: 6,
        nzbcClause: 'NZBC H1/AS1 5th Ed (Climate Zones 1–6)',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0x18181a, roughness: 0.38, metalness: 0.58 },
      },
      {
        id: 'alu-bronze-anodised',
        label: 'Dark Bronze Anodised Thermal Aluminium',
        swatch: '#3D3027',
        specLine: '25-micron architectural dark bronze anodised thermally broken aluminium, solar-control Low-E IGU (R0.54)',
        rateNzd: 1190,
        unit: 'm2',
        leadWeeks: 9,
        nzbcClause: 'NZBC H1/VM1 & B2 Coastal Anodised',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0x3d3027, roughness: 0.28, metalness: 0.74 },
      },
      {
        id: 'timber-clear',
        label: 'Engineered Native/Accoya Timber Joinery',
        swatch: '#8B6244',
        specLine: 'Clear-finished engineered timber architectural sashes & mullions, warm-edge Low-E double glazing (R0.62)',
        rateNzd: 1460,
        unit: 'm2',
        leadWeeks: 11,
        nzbcClause: 'NZBC H1 High-R & E2 Sill Flashing',
        zones: ['B', 'C', 'D'],
        render: { hex: 0x8b6244, roughness: 0.54, metalness: 0.04 },
      },
      {
        id: 'alu-triple-chalk',
        label: 'Triple-Glazed Acoustic Thermal Joinery, Warm White',
        swatch: '#E7E4DD',
        specLine: 'Triple-glazed krypton/argon thermally broken suite (R0.86, STC 42 acoustic), warm white powdercoat',
        rateNzd: 1580,
        unit: 'm2',
        leadWeeks: 12,
        nzbcClause: 'NZBC H1 High-Performance & G6 Acoustic',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0xe7e4dd, roughness: 0.4, metalness: 0.42 },
      },
    ],
  },
  {
    id: 'colours',
    title: 'Interior Colours & Acoustic Linings',
    shortTitle: 'Colours',
    areaFactor: 2.1,
    baselineOptionId: 'warm-alabaster',
    options: [
      {
        id: 'warm-alabaster',
        label: 'Warm Alabaster Low-VOC Paint',
        swatch: '#F1EDE6',
        specLine: 'Level 4 plasterboard with Environmental Choice NZ low-VOC washable acrylic, warm alabaster (LRV 84%)',
        rateNzd: 52,
        unit: 'm2',
        leadWeeks: 2,
        nzbcClause: 'NZBC G7 Natural Light Reflectance',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0xf1ede6, roughness: 0.86, metalness: 0.0 },
      },
      {
        id: 'plaster-rose',
        label: 'Mineral Clay Plaster, Dusty Clay Rose',
        swatch: '#EADCD6',
        specLine: 'Hand-trowelled NZ mineral clay/lime finish, soft dusty plaster rose (LRV 72%)',
        rateNzd: 96,
        unit: 'm2',
        leadWeeks: 4,
        nzbcClause: 'NZBC C/AS2 Group 1-S Non-Combustible',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0xeadcd6, roughness: 0.88, metalness: 0.0 },
      },
      {
        id: 'harakeke-sage',
        label: 'Harakeke Pale Sage Botanical Matte',
        swatch: '#D9DDD0',
        specLine: 'Low-sheen botanical matte acrylic inspired by harakeke underside tones (LRV 71%)',
        rateNzd: 56,
        unit: 'm2',
        leadWeeks: 2,
        nzbcClause: 'NZBC G7 Interior Light Balance',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0xd9ddd0, roughness: 0.86, metalness: 0.0 },
      },
      {
        id: 'timber-acoustic-batten',
        label: 'Acoustic Slatted Rimu/Cedar Feature Linings',
        swatch: '#B57B4C',
        specLine: 'Solid timber acoustic battens over black recycled PET acoustic fleece (NRC 0.80, Group 1-S fire treatment)',
        rateNzd: 148,
        unit: 'm2',
        leadWeeks: 8,
        nzbcClause: 'NZBC C/AS2 Fire Group 1-S & Acoustic',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0xeadfce, roughness: 0.72, metalness: 0.02, accentHex: 0xb57b4c },
      },
    ],
  },
  {
    id: 'flooring',
    title: 'Interior Flooring',
    shortTitle: 'Flooring',
    areaFactor: 1.0,
    baselineOptionId: 'oak-natural',
    options: [
      {
        id: 'oak-natural',
        label: 'Engineered Oak Wideboard, Natural Matte',
        swatch: '#CFAE80',
        specLine: '190 × 15 mmFSC engineered oak boards over acoustic underlay, natural hardwax oil (SRV ≥ 39)',
        rateNzd: 195,
        unit: 'm2',
        leadWeeks: 4,
        nzbcClause: 'NZBC D1/AS1 Slip Resistance & G6',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0xcfae80, roughness: 0.58, metalness: 0.02 },
      },
      {
        id: 'greywacke-concrete',
        label: 'Ground & Polished NZ Greywacke Concrete',
        swatch: '#9B968E',
        specLine: 'Insulated concrete slab ground to salt-and-pepper local greywacke aggregate, penetrating lithium seal',
        rateNzd: 155,
        unit: 'm2',
        leadWeeks: 2,
        nzbcClause: 'NZBC H1 Thermal Mass & D1 Wet/Dry Slip',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0x9b968e, roughness: 0.36, metalness: 0.05 },
      },
      {
        id: 'recovered-rimu',
        label: 'Recovered Heart Rimu Tongue & Groove',
        swatch: '#B86B3E',
        specLine: 'Salvaged NZ heart rimu T&G strip flooring, secret-nailed and finished in waterborne matte polyurethane',
        rateNzd: 285,
        unit: 'm2',
        leadWeeks: 9,
        nzbcClause: 'NZBC B2 & Circular Carbon Salvage',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0xb86b3e, roughness: 0.52, metalness: 0.03 },
      },
      {
        id: 'honed-terrazzo',
        label: 'Honed Terrazzo Tile, Warm Aggregate',
        swatch: '#DED7CB',
        specLine: '600 × 600 × 20 mm honed cementitious terrazzo tiles over waterproof membrane in wet/public zones',
        rateNzd: 260,
        unit: 'm2',
        leadWeeks: 7,
        nzbcClause: 'NZBC E3/AS1 Internal Moisture & D1',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0xded7cb, roughness: 0.34, metalness: 0.04 },
      },
    ],
  },
  {
    id: 'fittings',
    title: 'NZ Architectural Fittings & Hardware',
    shortTitle: 'Fittings',
    areaFactor: 1,
    baselineOptionId: 'matt-black-fit',
    options: [
      {
        id: 'matt-black-fit',
        label: 'Matt Black Tapware, Mixers & Door Hardware',
        swatch: '#1D1D1F',
        specLine: 'WELS 4-star gooseneck mixers, rain shower rails, heated towel ladders & lever hardware in electroplated matt black',
        rateNzd: 14800,
        unit: 'package',
        leadWeeks: 3,
        nzbcClause: 'NZBC G12/AS1 Lead-Free DZR Brass & D1 Lever',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0x1d1d1f, roughness: 0.36, metalness: 0.62 },
      },
      {
        id: 'brushed-brass-pvd',
        label: 'Brushed Brass PVD Architectural Tapware & Pulls',
        swatch: '#B58E4C',
        specLine: 'Lead-free NZ-compliant PVD brushed brass mixers, flush plates, knurled cabinet pulls & acoustic door levers',
        rateNzd: 21400,
        unit: 'package',
        leadWeeks: 5,
        nzbcClause: 'NZBC G12 Lead-Free (<0.25% Pb) & D1',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0xb58e4c, roughness: 0.26, metalness: 0.84 },
      },
      {
        id: 'aged-bronze-fit',
        label: 'Living Aged Bronze Bespoke Hardware & Mixers',
        swatch: '#5A4332',
        specLine: 'Tumbled living bronze tapware, custom milled entry pulls and commercial D1 accessible bathroom suite',
        rateNzd: 27900,
        unit: 'package',
        leadWeeks: 8,
        nzbcClause: 'NZBC G1/AS1 Accessible Sanitary & G12',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0x5a4332, roughness: 0.32, metalness: 0.78 },
      },
      {
        id: 'marine-316-ss',
        label: 'Brushed 316 Marine Stainless Suite',
        swatch: '#C8CDD0',
        specLine: 'Solid 316 marine-grade stainless steel mixers, showers, external pulls & balustrade fixings',
        rateNzd: 19200,
        unit: 'package',
        leadWeeks: 4,
        nzbcClause: 'NZBC B2 Sea-Spray & G12 Lead-Free',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0xc8cdd0, roughness: 0.22, metalness: 0.88 },
      },
    ],
  },
  {
    id: 'fitout',
    title: 'Joinery Fit-Out & Furniture Package',
    shortTitle: 'Fit-Out & Furniture',
    areaFactor: 1,
    baselineOptionId: 'oak-linen-living',
    options: [
      {
        id: 'oak-linen-living',
        label: 'Crown Oak Joinery, Low-Silica Stone & Wool Bouclé',
        swatch: '#C9A77C',
        specLine: 'Crown-cut oak cabinetry, 20 mm low-silica stone benchtops, NZ wool bouclé seating & solid oak tables',
        rateNzd: 48500,
        unit: 'package',
        leadWeeks: 6,
        nzbcClause: 'NZBC G3 Food Prep & WorkSafe Low-Silica',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0xc9a77c, roughness: 0.56, metalness: 0.04, accentHex: 0xd6c8b0, layoutMode: 'lounge' },
      },
      {
        id: 'banquet-event-suite',
        label: 'Civic Banquet Fit-Out + Commercial Catering Kitchen',
        swatch: '#E3DCCF',
        specLine: 'Commercial stainless catering kitchen, round banquet tables for 10 in washed linen, stackable timber chairs',
        rateNzd: 64200,
        unit: 'package',
        leadWeeks: 7,
        nzbcClause: 'NZBC G3 Commercial Kitchen & C/AS2 Aisle Clearances',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0xe3dccf, roughness: 0.72, metalness: 0.04, accentHex: 0xb58e4c, layoutMode: 'banquet' },
      },
      {
        id: 'hui-auditorium-suite',
        label: 'Auditorium / Hui Fit-Out + Accessible Seating & Stage',
        swatch: '#6F4F38',
        specLine: 'Linked acoustic timber auditorium seating, wheelchair companion bays (NZBC D1), modular timber dais',
        rateNzd: 56800,
        unit: 'package',
        leadWeeks: 6,
        nzbcClause: 'NZBC D1 Accessible Spaces & C/AS2 Escape Paths',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0x6f4f38, roughness: 0.62, metalness: 0.04, accentHex: 0x5b2a4a, layoutMode: 'conference' },
      },
      {
        id: 'charcoal-marble-bespoke',
        label: 'Satin Charcoal Cabinetry, Honed Marble & Tobacco Wool',
        swatch: '#2B2B2D',
        specLine: 'Fluted charcoal joinery, 20 mm honed veined marble benchtop & splashback, NZ tobacco wool upholstery',
        rateNzd: 68900,
        unit: 'package',
        leadWeeks: 9,
        nzbcClause: 'NZBC E3 Benchtop Junctions & B2',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0x2b2b2d, roughness: 0.46, metalness: 0.08, accentHex: 0x9a7f6a, layoutMode: 'lounge' },
      },
    ],
  },
  {
    id: 'lighting',
    title: 'Architectural Lighting Scene & Fixtures',
    shortTitle: 'Lighting',
    areaFactor: 1,
    baselineOptionId: 'standard-led',
    options: [
      {
        id: 'standard-led',
        label: 'Recessed Architectural Downlights & Eave Spots (3000K)',
        swatch: '#FFF1D6',
        specLine: 'CRI 95+ low-glare recessed LED downlights, IC-4 insulation rated, exterior soffit spots',
        rateNzd: 16500,
        unit: 'package',
        leadWeeks: 3,
        nzbcClause: 'NZBC G8 Artificial Light & H1 IC-4 Air-Seal',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0xfff1d6, roughness: 0.3, metalness: 0.2, lightKelvin: 3000, lightBoost: 1.0 },
      },
      {
        id: 'warm-cove-pendants',
        label: 'Warm Cove Grazing, Linen Pendants & Brass Sconces (2700K)',
        swatch: '#FFD296',
        specLine: '2700K dim-to-warm perimeter timber cove strips, pleated washed-linen pendants & ceramic/brass sconces',
        rateNzd: 28400,
        unit: 'package',
        leadWeeks: 6,
        nzbcClause: 'NZBC G8 & Dark-Sky Shielded Exterior',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0xffd296, roughness: 0.35, metalness: 0.4, lightKelvin: 2700, lightBoost: 1.38 },
      },
      {
        id: 'dali-tunable-gallery',
        label: 'DALI Tunable Gallery Track + Landscape Bollards & Uplights',
        swatch: '#FFE4B8',
        specLine: 'DALI-2 scene-controlled acoustic track spots, stair-tread markers & IP67 bronze landscape bollards',
        rateNzd: 39600,
        unit: 'package',
        leadWeeks: 10,
        nzbcClause: 'NZBC F6 Visibility in Escape & D1 Path Lighting',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0xffe4b8, roughness: 0.25, metalness: 0.6, lightKelvin: 2850, lightBoost: 1.65 },
      },
    ],
  },
  {
    id: 'landscaping',
    title: 'NZ Native Landscaping & External Works',
    shortTitle: 'Landscaping',
    areaFactor: 0.65,
    baselineOptionId: 'coastal-harakeke',
    options: [
      {
        id: 'minimal-lawn',
        label: 'Seeded Lawn, Permeable Aggregate & Retained Trees',
        swatch: '#7B8A62',
        specLine: 'Topsoil re-spread, drought-tolerant fescue lawn, permeable local chip paths & existing canopy retention',
        rateNzd: 95,
        unit: 'm2',
        leadWeeks: 2,
        nzbcClause: 'NZBC E1 Surface Water Permeable Cover',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0x7b8a62, roughness: 0.92, metalness: 0.0, floraDensity: 0.35, floraPalette: 'minimal' },
      },
      {
        id: 'coastal-harakeke',
        label: 'Coastal Pōhutukawa, Harakeke & Silvered Hardwood Deck',
        swatch: '#5D7047',
        specLine: 'Eco-sourced Metrosideros excelsa, Phormium tenax, Muehlenbeckia & FSC hardwood decking',
        rateNzd: 185,
        unit: 'm2',
        leadWeeks: 4,
        nzbcClause: 'NZBC E1 Stormwater & D1 Level Threshold Deck',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0x5d7047, roughness: 0.88, metalness: 0.0, floraDensity: 1.0, floraPalette: 'coastal' },
      },
      {
        id: 'ponga-nikau-bush',
        label: 'Regenerating Ponga, Nīkau, Tī Kōuka & Herringbone Forecourt',
        swatch: '#3E573B',
        specLine: 'Specimen Cyathea dealbata (ponga), Rhopalostylis sapida (nīkau), Cordyline australis & permeable clay pavers',
        rateNzd: 265,
        unit: 'm2',
        leadWeeks: 7,
        nzbcClause: 'NZBC E1 Retention & D1 Accessible Forecourt (1:20 max)',
        zones: ['B', 'C', 'D'],
        render: { hex: 0x3e573b, roughness: 0.86, metalness: 0.0, floraDensity: 1.45, floraPalette: 'bush' },
      },
      {
        id: 'wetland-raingarden',
        label: 'Kaitiakitanga Wetland Swale: Carex, Tī Kōuka & Basalt Stepping',
        swatch: '#4F6B56',
        specLine: 'Engineered stormwater treatment rain-garden swales with Carex secta, oioi, harakeke & honed NZ basalt flags',
        rateNzd: 310,
        unit: 'm2',
        leadWeeks: 8,
        nzbcClause: 'NZBC E1/VM1 Bio-Retention & Kaitiakitanga Wai Care',
        zones: ['B', 'C', 'D', 'E'],
        render: { hex: 0x4f6b56, roughness: 0.84, metalness: 0.0, floraDensity: 1.25, floraPalette: 'wetland' },
      },
    ],
  },
];

export type SpecSelections = Record<SpecCategoryId, string>;

export interface SpecImpactRow {
  categoryId: SpecCategoryId;
  categoryTitle: string;
  baselineLabel: string;
  selectedId: string;
  selectedLabel: string;
  specLine: string;
  nzbcClause: string;
  quantityText: string;
  baselineCostNzd: number;
  selectedCostNzd: number;
  deltaNzd: number;
  leadWeeks: number;
  delayWeeks: number;
}

export interface SpecImpactSummary {
  floorAreaM2: number;
  baselineFloatWeeks: number;
  baselineTotalNzd: number;
  selectedTotalNzd: number;
  netDeltaNzd: number;
  maxLeadWeeks: number;
  netDelayWeeks: number;
  netDelayWorkingDays: number;
  criticalPathDrivers: { categoryTitle: string; optionLabel: string; leadWeeks: number; extraWeeks: number }[];
  rows: SpecImpactRow[];
}

export function defaultSpecSelections(): SpecSelections {
  const out = {} as SpecSelections;
  for (const c of SPEC_CATEGORIES) out[c.id] = c.baselineOptionId;
  return out;
}

export function completeSpecSelections(partial?: Partial<Record<string, string>> | null): SpecSelections {
  const out = defaultSpecSelections();
  if (!partial) return out;
  for (const c of SPEC_CATEGORIES) {
    const pick = partial[c.id];
    if (pick && c.options.some((o) => o.id === pick)) out[c.id] = pick;
  }
  return out;
}

export function getSpecOption(catId: SpecCategoryId, optId?: string): SpecOption {
  const cat = SPEC_CATEGORIES.find((c) => c.id === catId)!;
  return cat.options.find((o) => o.id === optId) ?? cat.options.find((o) => o.id === cat.baselineOptionId) ?? cat.options[0];
}

/** Compact URL-safe token: 9 option IDs joined by '~' in SPEC_CATEGORIES order */
export function encodeSpecSelections(s: SpecSelections): string {
  return SPEC_CATEGORIES.map((c) => s[c.id] ?? c.baselineOptionId).join('~');
}

export function decodeSpecSelections(raw: string | null | undefined): SpecSelections | null {
  if (!raw) return null;
  const parts = raw.split('~');
  if (parts.length < 3) return null;
  const partial: Partial<Record<string, string>> = {};
  SPEC_CATEGORIES.forEach((c, i) => {
    if (parts[i]) partial[c.id] = parts[i];
  });
  return completeSpecSelections(partial);
}

/** Compute live cost ($ NZD excl. GST) & critical-path programme delay across all 9 NZ categories */
export function calculateSpecImpact(
  selections: Partial<SpecSelections> | null | undefined,
  opts: { floorAreaM2?: number; baselineFloatWeeks?: number } = {},
): SpecImpactSummary {
  const full = completeSpecSelections(selections);
  const area = Math.max(35, Math.min(12000, Math.round(opts.floorAreaM2 || 185)));
  const floatWeeks = Math.max(2, Math.min(20, Math.round(opts.baselineFloatWeeks ?? 6)));
  // Scale package allowances gently for large civic buildings (> 350 m²) vs residential
  const pkgScale = area > 350 ? Math.min(3.4, 1 + (area - 350) / 650) : 1;

  const rows: SpecImpactRow[] = [];
  let baselineTotalNzd = 0;
  let selectedTotalNzd = 0;
  let maxLeadWeeks = 0;
  const drivers: SpecImpactSummary['criticalPathDrivers'] = [];

  for (const cat of SPEC_CATEGORIES) {
    const baseOpt = getSpecOption(cat.id, cat.baselineOptionId);
    const selOpt = getSpecOption(cat.id, full[cat.id]);
    const qty = selOpt.unit === 'm2' ? Math.round(area * cat.areaFactor) : 1;
    const baseCost = Math.round(baseOpt.unit === 'm2' ? qty * baseOpt.rateNzd : baseOpt.rateNzd * pkgScale);
    const selCost = Math.round(selOpt.unit === 'm2' ? qty * selOpt.rateNzd : selOpt.rateNzd * pkgScale);
    const delta = selCost - baseCost;
    const delayWeeks = Math.max(0, selOpt.leadWeeks - floatWeeks);

    baselineTotalNzd += baseCost;
    selectedTotalNzd += selCost;
    if (selOpt.leadWeeks > maxLeadWeeks) maxLeadWeeks = selOpt.leadWeeks;
    if (delayWeeks > 0) {
      drivers.push({
        categoryTitle: cat.title,
        optionLabel: selOpt.label,
        leadWeeks: selOpt.leadWeeks,
        extraWeeks: delayWeeks,
      });
    }

    rows.push({
      categoryId: cat.id,
      categoryTitle: cat.title,
      baselineLabel: baseOpt.label,
      selectedId: selOpt.id,
      selectedLabel: selOpt.label,
      specLine: selOpt.specLine,
      nzbcClause: selOpt.nzbcClause,
      quantityText: selOpt.unit === 'm2' ? `${qty} m²` : pkgScale > 1.05 ? `1 civic pkg (×${pkgScale.toFixed(1)})` : '1 suite',
      baselineCostNzd: baseCost,
      selectedCostNzd: selCost,
      deltaNzd: delta,
      leadWeeks: selOpt.leadWeeks,
      delayWeeks,
    });
  }

  drivers.sort((a, b) => b.extraWeeks - a.extraWeeks || b.leadWeeks - a.leadWeeks);
  const netDelayWeeks = Math.max(0, maxLeadWeeks - floatWeeks);

  return {
    floorAreaM2: area,
    baselineFloatWeeks: floatWeeks,
    baselineTotalNzd,
    selectedTotalNzd,
    netDeltaNzd: selectedTotalNzd - baselineTotalNzd,
    maxLeadWeeks,
    netDelayWeeks,
    netDelayWorkingDays: netDelayWeeks * 5,
    criticalPathDrivers: drivers,
    rows,
  };
}

export function formatNzdDelta(n: number): string {
  if (n === 0) return '$0 NZD (on baseline)';
  return `${n > 0 ? '+' : '−'}$${Math.abs(Math.round(n)).toLocaleString('en-NZ')} NZD`;
}

export function formatNzdTotal(n: number): string {
  return `$${Math.round(n).toLocaleString('en-NZ')} NZD`;
}

export function exportSpecCSV(summary: SpecImpactSummary, projectTitle: string, practiceName = ''): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = [
    `# NZ Architectural Specification, Cost & Programme Impact — ${projectTitle}${practiceName ? ` (${practiceName})` : ''}`,
    `# Indicative visualisation & early quantity estimate (NZD excl. GST, ${summary.floorAreaM2} m² basis). Confirm supplier quotes & council compliance before contract.`,
    'Category,Selected Specification,NZBC Reference,Quantity,Selected Allowance (NZD),Variation vs Baseline (NZD),Lead Time (Weeks),Programme Impact (Weeks)',
  ];
  const lines = summary.rows.map((r) =>
    [
      r.categoryTitle,
      `${r.selectedLabel} — ${r.specLine}`,
      r.nzbcClause,
      r.quantityText,
      r.selectedCostNzd,
      r.deltaNzd,
      r.leadWeeks,
      r.delayWeeks > 0 ? `+${r.delayWeeks} wks` : 'On programme (0 wks)',
    ]
      .map(esc)
      .join(','),
  );
  lines.push(
    [
      'TOTAL FIT-OUT & ENVELOPE PACKAGES',
      `Max lead ${summary.maxLeadWeeks} wks (vs ${summary.baselineFloatWeeks} wk float)`,
      '',
      `${summary.floorAreaM2} m²`,
      summary.selectedTotalNzd,
      summary.netDeltaNzd,
      summary.maxLeadWeeks,
      summary.netDelayWeeks > 0 ? `+${summary.netDelayWeeks} wks (+${summary.netDelayWorkingDays} work days)` : '0 wks delay',
    ]
      .map(esc)
      .join(','),
  );
  return [...header, ...lines].join('\n');
}

export function exportSpecHTML(summary: SpecImpactSummary, projectTitle: string, practiceName = '', logoUrl = ''): string {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  return `<!doctype html><html lang="en-NZ"><head><meta charset="utf-8"><title>Specification &amp; Variation Schedule · ${esc(projectTitle)}</title>
<style>
  body{font:14px/1.5 "Instrument Sans",system-ui,sans-serif;color:#240B21;background:#F9F6F2;max-width:960px;margin:32px auto;padding:0 24px}
  header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #240B21;padding-bottom:16px;margin-bottom:20px}
  .kicker{font:500 11px "IBM Plex Mono",monospace;text-transform:uppercase;letter-spacing:.12em;color:#654A4E}
  h1{margin:4px 0 0;font-size:26px;font-weight:500;letter-spacing:-.03em}
  .summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:24px}
  .box{background:#FFFDFB;border:1px solid rgba(101,74,78,.28);padding:12px 14px;border-radius:10px}
  .val{font:500 20px "IBM Plex Mono",monospace;margin-top:4px}
  table{width:100%;border-collapse:collapse;background:#FFFDFB}
  th,td{text-align:left;padding:10px 10px;border-bottom:1px solid rgba(101,74,78,.2);vertical-align:top}
  th{font:500 11px "IBM Plex Mono",monospace;text-transform:uppercase;letter-spacing:.08em;color:#654A4E;background:#F6F1ED}
  .mono{font-family:"IBM Plex Mono",monospace;font-size:12.5px}
  .foot{margin-top:22px;font-size:12px;color:#654A4E}
  @media print{body{background:#fff;margin:0}}
</style></head><body>
<header>
  <div><div class="kicker">${esc(practiceName || 'assembl · NZ Architectural Studio')}</div><h1>${esc(projectTitle)} — Client Specification &amp; Live Variation Schedule</h1></div>
  ${logoUrl ? `<img src="${esc(logoUrl)}" alt="${esc(practiceName)}" style="max-height:44px;width:auto">` : ''}
</header>
<section class="summary">
  <div class="box"><div class="kicker">Selected Fit-Out &amp; Envelope</div><div class="val">${formatNzdTotal(summary.selectedTotalNzd)}</div><div class="foot">Basis: ${summary.floorAreaM2} m² (excl. GST)</div></div>
  <div class="box"><div class="kicker">Net Cost Variation</div><div class="val">${formatNzdDelta(summary.netDeltaNzd)}</div><div class="foot">Against baseline specification</div></div>
  <div class="box"><div class="kicker">Net Programme Impact</div><div class="val">${summary.netDelayWeeks > 0 ? `+${summary.netDelayWeeks} wks (+${summary.netDelayWorkingDays} days)` : 'On track (0 days)'}</div><div class="foot">Max lead ${summary.maxLeadWeeks} wks vs ${summary.baselineFloatWeeks} wk float</div></div>
</section>
<table><thead><tr><th>Element</th><th>Selected NZ Specification</th><th>NZBC Clause</th><th>Qty</th><th>Allowance</th><th>Variation</th><th>Lead / Delay</th></tr></thead><tbody>
${summary.rows.map((r) => `<tr><td><b>${esc(r.categoryTitle)}</b></td><td><b>${esc(r.selectedLabel)}</b><br><span style="color:#654A4E;font-size:12.5px">${esc(r.specLine)}</span></td><td class="mono">${esc(r.nzbcClause)}</td><td class="mono">${esc(r.quantityText)}</td><td class="mono">${formatNzdTotal(r.selectedCostNzd)}</td><td class="mono">${formatNzdDelta(r.deltaNzd)}</td><td class="mono">${r.leadWeeks} wks${r.delayWeeks > 0 ? `<br><b style="color:#9b2f45">+${r.delayWeeks} wk delay</b>` : ''}</td></tr>`).join('')}
</tbody></table>
<p class="foot">Client Sign-Off: ___________________________ &nbsp;&nbsp; Date: _______________ &nbsp;&nbsp; Architect Review: ___________________________<br>
Indicative early-stage New Zealand architectural cost &amp; procurement schedule generated from the live 3D twin. Confirm formal QS schedule, supplier lead times and territorial authority consent conditions prior to procurement.</p>
</body></html>`;
}
