// The asset library's one catalogue: every piece a person can pick for a project, procedural (built in code, see
// pieces.ts) or a GLB from Kate's library (library.ts). Pure data with no imports, so the ops page's manifest
// (plan-studio/twins/library/catalogue.json, written by tools/library-shots.py), the 3D page and the tests all read
// the same list. Titles name what a piece is, never a brand or a product. Dimensions are the model's own bounds in
// millimetres (w across, d deep, h high), checked against the built model when the pictures are made.

export type CatId = 'seating' | 'tables' | 'beds' | 'storage' | 'lighting' | 'rugs-textiles' | 'decor' | 'kitchen-bath' | 'planting' | 'outdoor';
export const CATEGORIES: { id: CatId; title: string }[] = [
  { id: 'seating', title: 'Seating' },
  { id: 'tables', title: 'Tables' },
  { id: 'beds', title: 'Beds' },
  { id: 'storage', title: 'Storage' },
  { id: 'lighting', title: 'Lighting' },
  { id: 'rugs-textiles', title: 'Rugs and textiles' },
  { id: 'decor', title: 'Decor and sculpture' },
  { id: 'kitchen-bath', title: 'Kitchen and bath fittings' },
  { id: 'planting', title: 'Native planting' },
  { id: 'outdoor', title: 'Outdoor' },
];
export const ROOMS = ['Living', 'Dining', 'Kitchen', 'Bedroom', 'Bathroom', 'Study', 'Outdoor'] as const;

export interface Finish { id: string; label: string; swatch: string }
export interface CatItem {
  id: string;
  category: CatId;
  title: string;
  /** the fit-out role it fills (fitout.ts slot_<role>, or a suite part) */
  role: string;
  /** model bounds, millimetres */
  dims: { w: number; d: number; h: number };
  /** what it is made of, in a few words */
  material: string;
  finishes?: Finish[];
  licence: string;
  credit: string;
  source: 'procedural' | 'glb';
  /** the GLB in library.ts, for source glb */
  glb?: string;
  /** floor: stands on the floor; wall: backs onto a wall; hang: hangs from the ceiling; surface: sits on a table or bench */
  fit: 'floor' | 'wall' | 'hang' | 'surface';
  /** the rooms it suits, first the usual one */
  rooms: string[];
  /** the picture, relative to the manifest */
  pic: string;
  /** legacy: a GLB kept working and credited until it is rebuilt in code (Kate, 22 Nov 2026: "procedural is key") */
  status?: 'legacy';
  /** the piece built in code that stands in for this legacy GLB, where there is one */
  replacedBy?: string;
  /** studio camera for its picture */
  view?: { az?: number; el?: number; fov?: number; zoom?: number; aim?: number; exposure?: number };
}

const OWN = 'assembl’s own: built in code for this library (procedural geometry and textures, no image files)';
const OWN_CREDIT = 'assembl library, procedural';
const KS = 'CC BY 4.0 procedural mesh and PBR maps, Kōwhai Studio 3D generator (Kate Hudson, assembl)';
const KS_CREDIT = 'Kōwhai Studio 3D generator (Kate Hudson, assembl), CC BY 4.0';
const CUR = 'assembl curated library (owner supplied, cleared for use by Kate Hudson; not independently verified)';
const CUR_CREDIT = 'assembl curated library';

const own = (id: string, category: CatId, title: string, role: string, dims: CatItem['dims'], material: string, fit: CatItem['fit'], rooms: string[], extra: Partial<CatItem> = {}): CatItem =>
  ({ id, category, title, role, dims, material, licence: OWN, credit: OWN_CREDIT, source: 'procedural', fit, rooms, pic: `pics/${id}.webp`, ...extra });
const glb = (id: string, category: CatId, title: string, role: string, dims: CatItem['dims'], material: string, fit: CatItem['fit'], rooms: string[], curated = false, extra: Partial<CatItem> = {}): CatItem =>
  ({ id, category, title, role, dims, material, licence: curated ? CUR : KS, credit: curated ? CUR_CREDIT : KS_CREDIT, source: 'glb', glb: id, status: 'legacy', fit, rooms, pic: `pics/${id}.webp`, ...extra });

const TIMBERS: Finish[] = [{ id: 'oak', label: 'Oiled oak', swatch: '#c9a87c' }, { id: 'ash', label: 'Oiled ash', swatch: '#dcc7a6' }, { id: 'walnut', label: 'Oiled walnut', swatch: '#6f4f38' }];

export const CATALOGUE: CatItem[] = [
  // the library's own pieces, raised to the photoreal standard
  own('LIB-SEAT-01', 'seating', 'Three-seat sofa, wool bouclé', 'sofa', { w: 2445, d: 975, h: 850 }, 'wool bouclé, oiled oak plinth', 'floor', ['Living'], { finishes: [{ id: 'ivory', label: 'Ivory bouclé', swatch: '#e6dfd2' }, { id: 'oat', label: 'Oat bouclé', swatch: '#cdbb9f' }, { id: 'charcoal', label: 'Charcoal bouclé', swatch: '#4a4642' }], view: { az: 24, el: 14 } }),
  own('LIB-SEAT-02', 'seating', 'Lounge armchair, knitted wool', 'armchair', { w: 715, d: 850, h: 885 }, 'knitted wool, oiled oak frame', 'floor', ['Living', 'Bedroom', 'Study'], { finishes: [{ id: 'oat', label: 'Oat knit', swatch: '#d6c8b0' }, { id: 'sage', label: 'Sage knit', swatch: '#9aa08a' }, { id: 'rust', label: 'Rust knit', swatch: '#a8654a' }], view: { az: 32, el: 14 } }),
  own('LIB-SEAT-03', 'seating', 'Dining chair, woven cord seat', 'dining_chair', { w: 450, d: 520, h: 800 }, 'oiled ash, woven paper cord', 'floor', ['Dining', 'Kitchen'], { finishes: TIMBERS, view: { az: 34, el: 16 } }),
  own('LIB-TAB-01', 'tables', 'Dining table, solid oak', 'dining_table', { w: 2000, d: 950, h: 750 }, 'oiled solid oak, three boards', 'floor', ['Dining'], { finishes: TIMBERS, view: { az: 26, el: 20 } }),
  own('LIB-TAB-02', 'tables', 'Coffee table, travertine and oak', 'coffee_table', { w: 1200, d: 650, h: 385 }, 'honed travertine, oiled oak', 'floor', ['Living'], { view: { az: 28, el: 24 } }),
  own('LIB-BED-01', 'beds', 'Queen bed with washed linen', 'bed', { w: 1825, d: 2230, h: 1095 }, 'oiled oak, washed linen, knitted throw', 'wall', ['Bedroom'], { finishes: [{ id: 'oat', label: 'Oat linen', swatch: '#e3dccf' }, { id: 'white', label: 'White linen', swatch: '#f1ede5' }, { id: 'clay', label: 'Clay linen', swatch: '#b98b6e' }], view: { az: 32, el: 22 } }),
  own('LIB-STO-01', 'storage', 'Sideboard, fluted oak doors', 'sideboard', { w: 1800, d: 470, h: 720 }, 'oiled oak, brushed brass pulls', 'wall', ['Living', 'Dining'], { view: { az: 22, el: 12 } }),
  own('LIB-LGT-01', 'lighting', 'Pleated linen pendant', 'pendant', { w: 570, d: 570, h: 1240 }, 'washed linen, brushed brass, cloth cord', 'hang', ['Dining', 'Living', 'Bedroom'], { view: { az: 20, el: -4, aim: 0.25 } }),
  own('LIB-LGT-02', 'lighting', 'Tripod floor lamp, turned oak', 'floor_lamp', { w: 730, d: 515, h: 1600 }, 'oiled oak, brushed brass, linen drum', 'floor', ['Living', 'Bedroom', 'Study'], { view: { az: 26, el: 10 } }),
  own('LIB-RUG-01', 'rugs-textiles', 'Hand-knotted wool rug, lattice', 'rug', { w: 2570, d: 1715, h: 17 }, 'hand-knotted wool, cotton fringe', 'floor', ['Living', 'Bedroom', 'Dining'], { view: { az: 22, el: 38 } }),
  own('LIB-TEX-01', 'rugs-textiles', 'Folded throw, chunky knit', 'throw', { w: 630, d: 480, h: 55 }, 'chunky-knit merino', 'surface', ['Living', 'Bedroom'], { finishes: [{ id: 'rust', label: 'Rust', swatch: '#a86b4f' }, { id: 'oat', label: 'Oat', swatch: '#cfc2aa' }, { id: 'moss', label: 'Moss', swatch: '#6f7652' }], view: { az: 24, el: 30 } }),
  own('LIB-DEC-01', 'decor', 'Pierced stone form', 'sculpture', { w: 300, d: 205, h: 600 }, 'chiselled limestone on a basalt block', 'surface', ['Living', 'Study', 'Dining'], { view: { az: 18, el: 10 } }),
  own('LIB-DEC-02', 'decor', 'Twisted ring, cast bronze', 'sculpture', { w: 390, d: 180, h: 455 }, 'cast bronze on a travertine foot', 'surface', ['Living', 'Study'], { view: { az: 24, el: 8 } }),
  own('LIB-DEC-03', 'decor', 'Thrown stoneware vase', 'vase', { w: 310, d: 275, h: 960 }, 'stoneware, crackled ash glaze, dried stems', 'surface', ['Living', 'Dining', 'Bedroom'], { finishes: [{ id: 'ash', label: 'Ash glaze', swatch: '#b7b39c' }, { id: 'iron', label: 'Iron glaze', swatch: '#6b4a38' }, { id: 'milk', label: 'Milk glaze', swatch: '#ece6da' }], view: { az: 20, el: 10 } }),
  own('LIB-NAT-01', 'planting', 'Harakeke (New Zealand flax)', 'harakeke', { w: 1855, d: 1590, h: 2265 }, 'living plant, Phormium tenax', 'floor', ['Outdoor'], { view: { az: 20, el: 12, zoom: 1.05 } }),
  own('LIB-NAT-02', 'planting', 'Tī kōuka (cabbage tree)', 'tikouka', { w: 2215, d: 2430, h: 3420 }, 'living plant, Cordyline australis', 'floor', ['Outdoor'], { view: { az: 20, el: 8 } }),
  own('LIB-NAT-03', 'planting', 'Ground fern with koru', 'fern', { w: 1295, d: 1345, h: 530 }, 'living plant, native ground fern', 'floor', ['Outdoor'], { view: { az: 20, el: 26 } }),
  own('LIB-SEAT-04', 'seating', 'Counter stool, oak and bouclé', 'stool', { w: 400, d: 400, h: 735 }, 'oiled oak, brushed brass, wool bouclé', 'floor', ['Kitchen'], { view: { az: 28, el: 14 } }),
  own('LIB-TAB-03', 'tables', 'Bedside table, oak with two drawers', 'bedside', { w: 520, d: 440, h: 540 }, 'oiled oak, brushed brass', 'wall', ['Bedroom'], { finishes: TIMBERS, view: { az: 30, el: 16 } }),
  own('LIB-STO-02', 'storage', 'Double wardrobe, fluted ash', 'wardrobe', { w: 1200, d: 620, h: 2200 }, 'oiled ash, brushed brass', 'wall', ['Bedroom'], { view: { az: 24, el: 8 } }),
  own('LIB-LGT-03', 'lighting', 'Table lamp, turned ash and linen', 'table_lamp', { w: 305, d: 305, h: 500 }, 'oiled ash, brushed brass, washed linen', 'surface', ['Bedroom', 'Living', 'Study'], { view: { az: 24, el: 10 } }),
  own('LIB-TEX-02', 'rugs-textiles', 'S-fold linen curtain on a ceiling track', 'curtain', { w: 1860, d: 75, h: 2380 }, 'washed linen, powder-coated track', 'wall', ['Living', 'Bedroom'], { view: { az: 22, el: 6 } }),
  own('LIB-DEC-04', 'decor', 'Arched mirror, brass frame', 'mirror', { w: 530, d: 25, h: 885 }, 'mirror glass, brushed brass', 'wall', ['Bathroom', 'Bedroom', 'Living'], { view: { az: 16, el: 4 } }),
  own('LIB-TAB-04', 'tables', 'Round banquet table for ten, linen cloth', 'banquet_table', { w: 1800, d: 1800, h: 750 }, 'washed linen cloth to the floor, oak pedestal', 'floor', ['Dining'], { finishes: [{ id: 'white', label: 'White linen', swatch: '#f1ede5' }, { id: 'oat', label: 'Oat linen', swatch: '#e3dccf' }, { id: 'clay', label: 'Clay linen', swatch: '#b98b6e' }], view: { az: 24, el: 22 } }),
  own('LIB-NAT-04', 'planting', 'Ponga (silver tree fern)', 'silver_fern', { w: 2900, d: 2900, h: 3055 }, 'living plant, Cyathea dealbata', 'floor', ['Outdoor'], { view: { az: 20, el: 10 } }),
  // Kate's GLB library (library.ts): legacy, kept working and credited until each is rebuilt in code
  glb('HERO-LIV-01', 'seating', 'Three-seater sofa, wool bouclé on a beech plinth', 'sofa', { w: 2550, d: 960, h: 850 }, 'wool bouclé, beech', 'floor', ['Living'], false, { replacedBy: 'LIB-SEAT-01' }),
  glb('HERO-LIV-02', 'seating', 'Beech armchair with linen cushions', 'armchair', { w: 730, d: 740, h: 775 }, 'beech, linen', 'floor', ['Living', 'Bedroom'], false, { replacedBy: 'LIB-SEAT-02' }),
  glb('LIVING-34', 'seating', 'Oak lounge chair, oatmeal upholstery', 'lounge_chair', { w: 680, d: 680, h: 785 }, 'oak, woven upholstery', 'floor', ['Living', 'Study'], true, { replacedBy: 'LIB-SEAT-02' }),
  glb('HERO-DIN-02', 'seating', 'Steam-bent beech dining chair, bouclé seat', 'dining_chair', { w: 520, d: 485, h: 780 }, 'beech, wool bouclé', 'floor', ['Dining', 'Kitchen'], false, { replacedBy: 'LIB-SEAT-03' }),
  glb('HERO-KIT-09', 'seating', 'Beech and leather counter stool', 'stool', { w: 415, d: 415, h: 785 }, 'beech, leather', 'floor', ['Kitchen'], false, { replacedBy: 'LIB-SEAT-04' }),
  glb('HERO-LIV-03', 'tables', 'Oak coffee table with travertine side table', 'coffee_table', { w: 1365, d: 805, h: 450 }, 'oak, travertine', 'floor', ['Living'], false, { replacedBy: 'LIB-TAB-02' }),
  glb('HERO-DIN-01', 'tables', 'Whitewashed ash dining table', 'dining_table', { w: 2400, d: 1040, h: 750 }, 'whitewashed ash', 'floor', ['Dining'], false, { replacedBy: 'LIB-TAB-01' }),
  glb('HERO-BED-02', 'tables', 'Two-drawer ash bedside table', 'bedside', { w: 520, d: 425, h: 540 }, 'ash', 'wall', ['Bedroom'], false, { replacedBy: 'LIB-TAB-03' }),
  glb('HERO-BED-01', 'beds', 'Ash bed with layered flax linen', 'bed', { w: 2080, d: 2150, h: 1010 }, 'ash, flax linen', 'wall', ['Bedroom'], false, { replacedBy: 'LIB-BED-01' }),
  glb('HERO-BED-03', 'storage', 'Fluted ash double wardrobe', 'wardrobe', { w: 1240, d: 920, h: 2200 }, 'fluted ash', 'wall', ['Bedroom'], false, { replacedBy: 'LIB-STO-02' }),
  glb('HERO-LIV-05', 'lighting', 'Arc floor lamp, brushed brass, flax shade', 'floor_lamp', { w: 440, d: 1025, h: 1675 }, 'brushed brass, travertine, flax', 'floor', ['Living'], false, { replacedBy: 'LIB-LGT-02' }),
  glb('HERO-LIV-06', 'lighting', 'Turned ash table lamp, opal glass', 'table_lamp', { w: 170, d: 195, h: 495 }, 'ash, brushed brass, opal glass', 'surface', ['Bedroom', 'Living'], false, { replacedBy: 'LIB-LGT-03' }),
  glb('HERO-DIN-03', 'lighting', 'Hoop-pine polyhedron pendant', 'pendant', { w: 700, d: 695, h: 970 }, 'hoop pine', 'hang', ['Dining'], false, { replacedBy: 'LIB-LGT-01', view: { el: -4, aim: 0.3 } }),
  glb('HERO-DIN-04', 'lighting', 'Linear pendant, brushed brass and alabaster', 'pendant_linear', { w: 1560, d: 65, h: 565 }, 'brushed brass, alabaster', 'hang', ['Dining', 'Kitchen'], false, { view: { el: -2, aim: 0.3 } }),
  glb('HERO-LIV-04', 'rugs-textiles', 'Hand-knotted wool and jute rug', 'rug', { w: 2475, d: 1580, h: 30 }, 'wool, jute', 'floor', ['Living', 'Bedroom'], false, { replacedBy: 'LIB-RUG-01', view: { el: 38 } }),
  glb('WINDOW-37', 'rugs-textiles', 'S-fold sheer curtain on a ceiling track', 'curtain', { w: 1820, d: 90, h: 2390 }, 'sheer linen, track', 'wall', ['Living', 'Bedroom'], true, { replacedBy: 'LIB-TEX-02', view: { az: 18, el: 6 } }),
  glb('ABI-MIR-08', 'decor', 'Arched mirror, satin brass frame', 'mirror', { w: 450, d: 30, h: 790 }, 'mirror glass, satin brass', 'wall', ['Bathroom', 'Bedroom'], true, { replacedBy: 'LIB-DEC-04', view: { az: 14, el: 4 } }),
  glb('HERO-SPK-02', 'decor', 'Pale ash bookshelf speaker', 'speaker', { w: 240, d: 350, h: 420 }, 'pale ash, cloth grille', 'surface', ['Living'], true),
  glb('HERO-GTR-01', 'decor', 'Solid-body electric guitar, black', 'guitar', { w: 335, d: 80, h: 985 }, 'lacquered body, maple neck', 'wall', ['Living', 'Study'], true, { view: { az: 14, el: 4 } }),
  glb('HERO-KIT-01', 'kitchen-bath', '600 mm wall oven', 'oven', { w: 595, d: 570, h: 590 }, 'black glass, steel', 'wall', ['Kitchen']),
  glb('HERO-KIT-02', 'kitchen-bath', '900 mm induction cooktop', 'cooktop', { w: 900, d: 520, h: 55 }, 'black glass', 'surface', ['Kitchen'], false, { view: { el: 36 } }),
  glb('HERO-KIT-03', 'kitchen-bath', '900 mm canopy rangehood', 'rangehood', { w: 900, d: 500, h: 820 }, 'brushed steel', 'wall', ['Kitchen']),
  glb('HERO-KIT-04', 'kitchen-bath', '900 mm integrated fridge', 'fridge', { w: 900, d: 625, h: 2030 }, 'panel-ready doors', 'wall', ['Kitchen']),
  glb('HERO-KIT-05', 'kitchen-bath', 'Espresso machine, brushed steel and ash', 'espresso', { w: 290, d: 505, h: 340 }, 'brushed steel, ash', 'surface', ['Kitchen']),
  glb('HERO-KIT-06', 'kitchen-bath', 'Pour-over kettle, brushed brass and ash', 'kettle', { w: 260, d: 175, h: 200 }, 'brushed brass, ash', 'surface', ['Kitchen']),
  glb('HERO-KIT-07', 'kitchen-bath', 'Two-slice toaster, stainless and ash', 'toaster', { w: 315, d: 185, h: 190 }, 'stainless steel, ash', 'surface', ['Kitchen']),
  glb('HERO-KIT-08', 'kitchen-bath', 'Gooseneck pull-out kitchen mixer', 'tap', { w: 70, d: 250, h: 500 }, 'brushed steel', 'surface', ['Kitchen']),
  glb('APPLIANCES-10', 'kitchen-bath', 'Knife block with four knives, weathered timber', 'knife_block', { w: 240, d: 135, h: 320 }, 'weathered timber, steel', 'surface', ['Kitchen'], true),
  glb('HERO-BTH-01', 'kitchen-bath', '1200 mm fluted ash vanity, marble top', 'vanity_wide', { w: 1220, d: 480, h: 765 }, 'fluted ash, marble', 'wall', ['Bathroom']),
  glb('HERO-BTH-02', 'kitchen-bath', 'Back-to-wall toilet with flush plate', 'toilet', { w: 365, d: 560, h: 950 }, 'vitreous china', 'wall', ['Bathroom']),
  glb('HERO-BTH-03', 'kitchen-bath', 'Frameless walk-in shower screen and rail', 'shower_screen', { w: 1000, d: 490, h: 2040 }, 'toughened glass, brushed steel', 'floor', ['Bathroom']),
  glb('HERO-BTH-04', 'kitchen-bath', 'Heated ladder towel rail with flax towel', 'towel_rail', { w: 560, d: 110, h: 900 }, 'brushed steel, flax towel', 'wall', ['Bathroom'], false, { view: { az: 14, el: 6 } }),
  glb('HERO-NAT-01', 'planting', 'Nīkau palm', 'nikau', { w: 2290, d: 2235, h: 2565 }, 'living plant, Rhopalostylis sapida', 'floor', ['Outdoor']),
  glb('HERO-NAT-02', 'planting', 'Pōhutukawa, multi-stemmed', 'pohutukawa', { w: 2145, d: 2200, h: 1510 }, 'living plant, Metrosideros excelsa', 'floor', ['Outdoor']),
  glb('HERO-NAT-03', 'planting', 'Ponga (silver fern)', 'silver_fern', { w: 605, d: 890, h: 1340 }, 'living plant, Cyathea dealbata', 'floor', ['Outdoor'], false, { replacedBy: 'LIB-NAT-04' }),
  glb('HERO-OUT-01', 'outdoor', 'Slatted outdoor sofa and low table', 'deck_lounge', { w: 2420, d: 1560, h: 755 }, 'slatted hardwood, outdoor canvas', 'floor', ['Outdoor']),
  glb('HERO-OUT-02', 'outdoor', 'Concrete and steel planter trio', 'planters', { w: 1190, d: 590, h: 680 }, 'concrete, weathering steel', 'floor', ['Outdoor']),
  glb('HERO-OUT-03', 'outdoor', 'Four-burner hooded barbecue', 'bbq', { w: 1460, d: 605, h: 1190 }, 'stainless steel', 'floor', ['Outdoor']),
];

export const byId = (id: string) => CATALOGUE.find((x) => x.id === id) ?? null;
export const sizeText = (d: CatItem['dims']) => `${d.w} × ${d.d} × ${d.h} mm`;
