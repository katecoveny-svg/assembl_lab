// Kōwhai Studio hero assets: Kate's procedural, PBR-textured New Zealand interior pieces (sofa, armchair, tables, rug,
// lamps, dining, kitchen, bathroom, planting), lifted from her "NZ Architectural Hero 3D Assets" generator and ported to
// three.js r187 as an ES module. buildAsset(id) returns a THREE.Group in metres, sitting on y = 0.
import * as THREE from "three";

    // =========================================================================
    // 1. CALIBRATED MATERIAL SWATCHES (WITH REAL-WORLD UV TILE METERS)
    // =========================================================================
    const SWATCH_SETS = {
      lounge_upholstery: [
        { name: 'Unbleached Raw NZ Flax Linen', hex: '#DDD4C4', accent: '#B8AD99', pbrOverride: 'linen', tileMeters: 0.22 },
        { name: 'Cardrona Undyed Chalk Bouclé', hex: '#EDE9E0', accent: '#CFC8BA', pbrOverride: 'boucle', tileMeters: 0.24 },
        { name: 'Full-Grain Saddle Tan Leather', hex: '#8F5B38', accent: '#5E381F', pbrOverride: 'leather', tileMeters: 0.35 },
        { name: 'Full-Grain Putty Pebble Leather', hex: '#B9AA96', accent: '#8E7F6B', pbrOverride: 'leather', tileMeters: 0.35 },
        { name: 'Coastal Olive-Sage Flax Linen', hex: '#9DA392', accent: '#727868', pbrOverride: 'linen', tileMeters: 0.22 }
      ],
      abi_metals: [
        { name: 'Brushed Brass PVD (Satin)', hex: '#C6A772', accent: '#8E6F40', pbrOverride: 'abi_pvd', tileMeters: 0.16 },
        { name: 'Brushed Copper PVD (Satin)', hex: '#B87C64', accent: '#7D4D3A', pbrOverride: 'abi_pvd', tileMeters: 0.16 },
        { name: 'Brushed Gunmetal PVD', hex: '#4B4E53', accent: '#2A2C30', pbrOverride: 'abi_pvd', tileMeters: 0.16 },
        { name: 'Tumbled Aged Brass', hex: '#9A835C', accent: '#645235', pbrOverride: 'abi_pvd', tileMeters: 0.18 },
        { name: '316 Marine Brushed Stainless', hex: '#C6C8C9', accent: '#8B8E90', pbrOverride: 'abi_pvd', tileMeters: 0.16 }
      ],
      linen_wool: [
        { name: 'Unbleached Raw NZ Flax', hex: '#DDD4C4', accent: '#B8AD99', pbrOverride: 'linen', tileMeters: 0.22 },
        { name: 'Cardrona Undyed Chalk Wool', hex: '#EDE9E0', accent: '#CFC8BA', pbrOverride: 'boucle', tileMeters: 0.24 },
        { name: 'Muriwai Warm Sand Linen', hex: '#D4C5B0', accent: '#AD9D86', pbrOverride: 'linen', tileMeters: 0.22 },
        { name: 'Oatmeal Putty Bouclé', hex: '#C8BFA9', accent: '#9E947E', pbrOverride: 'boucle', tileMeters: 0.24 },
        { name: 'Driftwood Taupe Weave', hex: '#ACA090', accent: '#7D7264', pbrOverride: 'linen', tileMeters: 0.22 },
        { name: 'Coastal Olive-Sage Flax', hex: '#9DA392', accent: '#727868', pbrOverride: 'linen', tileMeters: 0.22 }
      ],
      nz_timber: [
        { name: 'Whitewashed Southland Ash', hex: '#D6C6B2', accent: '#A89680', pbrOverride: 'timber', tileMeters: 0.40 },
        { name: 'Natural Otago Beech / Oak', hex: '#BC9972', accent: '#8A6A47', pbrOverride: 'timber', tileMeters: 0.40 },
        { name: 'Abodo Sioo:x Silvered Cedar', hex: '#9E988E', accent: '#6E685F', pbrOverride: 'timber', tileMeters: 0.42 },
        { name: 'Abodo Vulcan Patina Cedar', hex: '#6B4C38', accent: '#422D1F', pbrOverride: 'timber', tileMeters: 0.42 },
        { name: 'Weathered NZ Kwila Heartwood', hex: '#7A4934', accent: '#4C2B1D', pbrOverride: 'timber', tileMeters: 0.40 }
      ],
      stone_ceramic: [
        { name: 'Vein-Cut Honed Travertine', hex: '#DCD4C6', accent: '#B3A896', pbrOverride: 'stone', tileMeters: 0.48 },
        { name: 'Calacatta Viola Honed Marble', hex: '#ECE8E0', accent: '#7D6668', pbrOverride: 'marble', tileMeters: 0.55 },
        { name: 'Matte Chalk Volcanic Limestone', hex: '#ECE9E2', accent: '#C8C3B8', pbrOverride: 'stone', tileMeters: 0.45 },
        { name: 'Timaru Volcanic Bluestone', hex: '#5D6164', accent: '#3B3E41', pbrOverride: 'stone', tileMeters: 0.45 },
        { name: 'Weathered Corten Architectural Steel', hex: '#8F4D32', accent: '#592D1B', pbrOverride: 'stone', tileMeters: 0.42 }
      ],
      nz_flora: [
        { name: 'Nīkau Deep Coastal Emerald', hex: '#3B5638', accent: '#243822', pbrOverride: 'botanical', tileMeters: 0.25 },
        { name: 'Pōhutukawa Olive & Crimson', hex: '#4D5E44', accent: '#A62328', pbrOverride: 'botanical', tileMeters: 0.20 },
        { name: 'Ponga Silver-Backed Frond', hex: '#53684B', accent: '#C9D0C5', pbrOverride: 'botanical', tileMeters: 0.25 }
      ],
      car_finishes: [
        { name: 'Cardrona Chalk Pearl Metallic', hex: '#E8E5DE', accent: '#C2BEB5', pbrOverride: 'lacquer', tileMeters: 0.45 },
        { name: 'Fiordland Slate Metallic', hex: '#4B555E', accent: '#2B3238', pbrOverride: 'lacquer', tileMeters: 0.45 },
        { name: 'Pōhutukawa Deep Crimson Gloss', hex: '#8F2429', accent: '#541215', pbrOverride: 'lacquer', tileMeters: 0.45 },
        { name: 'Kauri Moss Green Metallic', hex: '#3B4D3E', accent: '#202B22', pbrOverride: 'lacquer', tileMeters: 0.45 },
        { name: 'Obsidian Night Gloss', hex: '#1E2125', accent: '#0D0E10', pbrOverride: 'lacquer', tileMeters: 0.45 }
      ]
    };

    const STANDARD_LICENCE = 'CC BY 4.0 (Procedural Mesh & PBR Maps) · Referenced product/brand names remain trademarks of respective owners; verify commercial rights before commercial redistribution.';

    // =========================================================================
    // 2. ALL 33 PROVEN HERO BENCHMARK ASSETS ACROSS ALL 7 CATEGORIES
    // =========================================================================
    const HERO_ASSETS_DB = [
      // =======================================================================
      // 1. LIVING: Sofas, Armchairs, Coffee & Side Tables, Rugs, Floor & Table Lamps
      // =======================================================================
      {
        id: 'HERO-LIV-01',
        cat: 'living',
        catLabel: '1. Living',
        env: 'Interior',
        brand: 'Ref: NZ Modular Timber-Plinth Sofa (Approximation)',
        name: 'Arcade-Inspired 3-Seater Merino Bouclé & Beech Sofa',
        arch: 'hero_sofa',
        pbr: 'boucle',
        swatchSet: 'lounge_upholstery',
        defaultSwatch: 1,
        dims: '2360 W × 940 D × 760 H mm',
        material: 'NZ Merino Bouclé / Flax / Leather + Southland Beech Plinth',
        assumptions: 'Seat H 410mm · 3 independent crowned seat & back cushions with perimeter welt piping.',
        licence: STANDARD_LICENCE,
        notes: 'Recessed mitred Southland beech plinth with 5 turned legs, track arms, 3 individually sculpted seat cushions with welt piping, 3 chambered back cushions, and a draped merino throw with fringe.'
      },
      {
        id: 'HERO-LIV-02',
        cat: 'living',
        catLabel: '1. Living',
        env: 'Interior',
        brand: 'Ref: NZ Timber Lounge Chair (Approximation)',
        name: 'Parallel-Inspired Southland Beech & Linen/Leather Armchair',
        arch: 'hero_armchair',
        pbr: 'linen',
        swatchSet: 'lounge_upholstery',
        defaultSwatch: 0,
        dims: '740 W × 780 D × 760 H mm',
        material: 'Southland Beech Frame + Woven Flax / Full-Grain Leather',
        assumptions: 'Seat H 415mm · 104° back recline · 7 mortised back slats · piped welt cushions.',
        licence: STANDARD_LICENCE,
        notes: 'Tapered front legs, 12° raked rear posts, wide bullnose armrests, 7 mortised backrest slats, woven webbing deck, and crowned seat & lumbar cushions with welt piping.'
      },
      {
        id: 'HERO-LIV-03',
        cat: 'living',
        catLabel: '1. Living',
        env: 'Interior',
        brand: 'Ref: NZ Architectural Timber & Travertine Tables (Approximation)',
        name: 'Nested Solid Oak & Honed Travertine Coffee & Side Table Set',
        arch: 'hero_coffee_side_tables',
        pbr: 'timber',
        swatchSet: 'nz_timber',
        defaultSwatch: 0,
        dims: '1380 W × 860 D × 380 H mm',
        material: 'Solid Southland Ash / Oak + Honed Travertine Drum Side Table',
        assumptions: 'Coffee table H 340mm; nested honed travertine side table Ø440 × H 440mm.',
        licence: STANDARD_LICENCE,
        notes: 'Low-profile bullnose solid timber coffee table on recessed slab legs paired with an interlocking honed travertine cylindrical side table.'
      },
      {
        id: 'HERO-LIV-04',
        cat: 'living',
        catLabel: '1. Living',
        env: 'Interior',
        brand: 'Ref: Hand-Knotted NZ Wool & Jute Rug (Approximation)',
        name: 'Loop Hand-Knotted NZ Wool & Jute Bouclé Throw Rug',
        arch: 'hero_rug',
        pbr: 'boucle',
        swatchSet: 'linen_wool',
        defaultSwatch: 0,
        dims: '2300 W × 1580 D × 18 H mm',
        material: '80% Undyed NZ Crossbred Wool / 20% Braided Jute',
        assumptions: '18mm pile loft with whipped selvedge bindings and 144 fringe tassels.',
        licence: STANDARD_LICENCE,
        notes: 'Vertex-rippled hand-knotted wool bouclé rug with whipped end selvedge bindings and 144 individual splayed fringe tassels.'
      },
      {
        id: 'HERO-LIV-05',
        cat: 'living',
        catLabel: '1. Living',
        env: 'Interior',
        brand: 'Ref: NZ Architectural Floor Lamp (Approximation)',
        name: 'Arced Brushed Brass & Travertine Plinth Floor Lamp',
        arch: 'hero_floor_lamp',
        pbr: 'abi_pvd',
        swatchSet: 'abi_metals',
        defaultSwatch: 0,
        dims: '460 W × 920 D × 1680 H mm',
        material: 'Honed Travertine Plinth · Brushed Brass Stem · Raw Flax Drum Shade',
        assumptions: '1680mm overall height; weighted Ø280mm stone base; standalone object.',
        licence: STANDARD_LICENCE,
        notes: 'Cylindrical honed travertine base with swept brushed brass arc stem, swivel joint, and suspended raw NZ flax linen drum shade.'
      },
      {
        id: 'HERO-LIV-06',
        cat: 'living',
        catLabel: '1. Living',
        env: 'Interior',
        brand: 'Ref: Turned Ash & Opal Glass Table Lamp (Approximation)',
        name: 'Line Turned Southland Ash, Brushed Brass & Opal Glass Table Lamp',
        arch: 'hero_table_lamp',
        pbr: 'timber',
        swatchSet: 'nz_timber',
        defaultSwatch: 0,
        dims: '220 W × 220 D × 485 H mm',
        material: 'Lathe-Turned Southland Ash · Brushed Brass · Frosted Opal Glass',
        assumptions: 'Ø165mm turned timber base; Ø155mm frosted glass diffuser.',
        licence: STANDARD_LICENCE,
        notes: 'Sculptural bedside or console lamp with turned Southland ash plinth, brushed brass stem, milled knuckle, and frosted opal glass sphere.'
      },

      // =======================================================================
      // 2. BEDROOM: Beds with Bedding, Bedside Tables, Wardrobes
      // =======================================================================
      {
        id: 'HERO-BED-01',
        cat: 'bedroom',
        catLabel: '2. Bedroom',
        env: 'Interior',
        brand: 'Ref: Halford NZ Ash Bed & Flax Linens (Approximation)',
        name: 'Southland Ash King Bed with Layered Stonewashed Flax Bedding',
        arch: 'hero_bed_with_bedding',
        pbr: 'linen',
        swatchSet: 'linen_wool',
        defaultSwatch: 0,
        dims: '1960 W × 2140 D × 1010 H mm',
        material: 'Whitewashed Southland Ash + 100% Stonewashed NZ Flax + Merino Throw',
        assumptions: 'NZ King proportions (1820×2000mm mattress); multi-layered gravity-draped bedding.',
        licence: STANDARD_LICENCE,
        notes: 'Slatted solid Southland ash headboard & frame, deep mattress, crisp turn-down flax sheet, gravity-draped duvet cover, fringed merino foot throw, and 4 flanged pillows.'
      },
      {
        id: 'HERO-BED-02',
        cat: 'bedroom',
        catLabel: '2. Bedroom',
        env: 'Interior',
        brand: 'Ref: Seam NZ Ash Bedside Table (Approximation)',
        name: 'Mitred Southland Ash 2-Drawer Bedside Table with Brass Inlay',
        arch: 'hero_bedside_table',
        pbr: 'timber',
        swatchSet: 'nz_timber',
        defaultSwatch: 0,
        dims: '520 W × 420 D × 540 H mm',
        material: 'Solid Whitewashed Southland Ash · Brushed Brass Shadow Reveal',
        assumptions: '540mm height aligned to King mattress top; 2 shadow-gap finger-pull drawers.',
        licence: STANDARD_LICENCE,
        notes: '45° mitred waterfall timber carcass with brushed brass shadow-gap reveal, two soft-close drawer fronts, and tapered round ash legs.'
      },
      {
        id: 'HERO-BED-03',
        cat: 'bedroom',
        catLabel: '2. Bedroom',
        env: 'Interior',
        brand: 'Ref: Architectural Fluted Joinery Wardrobe (Approximation)',
        name: 'Fluted Southland Ash & Brushed Brass Double Wardrobe',
        arch: 'hero_wardrobe',
        pbr: 'timber',
        swatchSet: 'nz_timber',
        defaultSwatch: 0,
        dims: '1240 W × 600 D × 2200 H mm',
        material: 'Fluted Whitewashed Ash Doors · Oak Interior · Knurled Brass Pulls',
        assumptions: '2200mm architectural module; left door angled open 38° to reveal internal brass rail & oak shelves.',
        licence: STANDARD_LICENCE,
        notes: 'Full-height architectural wardrobe with recessed shadow plinth, vertically fluted timber doors, diamond-knurled brass pull bars, internal oak shelving, drawers, and brass hanging rail.'
      },

      // =======================================================================
      // 3. DINING: Tables, Chairs, Pendants
      // =======================================================================
      {
        id: 'HERO-DIN-01',
        cat: 'dining',
        catLabel: '3. Dining',
        env: 'Interior',
        brand: 'Ref: Arc NZ Solid Timber Dining Table (Approximation)',
        name: 'Arc Solid Whitewashed Ash Bullnose Architectural Dining Table',
        arch: 'hero_dining_table',
        pbr: 'timber',
        swatchSet: 'nz_timber',
        defaultSwatch: 0,
        dims: '2400 W × 1040 D × 750 H mm',
        material: '42mm Solid Southland Ash + Architectural Arched Slab Legs',
        assumptions: 'Seats 8–10; 750mm standard dining height; chamfered bullnose edge.',
        licence: STANDARD_LICENCE,
        notes: '42mm thick solid Southland ash tabletop with bullnose chamfered edge and recessed architectural slab legs with timber stretcher rail.'
      },
      {
        id: 'HERO-DIN-02',
        cat: 'dining',
        catLabel: '3. Dining',
        env: 'Interior',
        brand: 'Ref: Odin NZ Timber & Woven Dining Chair (Approximation)',
        name: 'Steam-Bent Otago Beech & Bouclé Upholstered Dining Chair',
        arch: 'hero_dining_chair',
        pbr: 'timber',
        swatchSet: 'nz_timber',
        defaultSwatch: 1,
        dims: '510 W × 490 D × 770 H mm',
        material: 'Steam-Bent Otago Beech · Tailored Chalk Bouclé Seat Pad',
        assumptions: 'Seat H 455mm; curved wrap-around steam-bent backrest.',
        licence: STANDARD_LICENCE,
        notes: 'Tapered turned Otago beech legs, sculpted wrap-around steam-bent backrest rail, mortised apron rails, and crowned bouclé seat cushion.'
      },
      {
        id: 'HERO-DIN-03',
        cat: 'dining',
        catLabel: '3. Dining',
        env: 'Interior',
        brand: 'Ref: David Trubridge Coral Pendant (Approximation)',
        name: 'Coral-Inspired Geometric Hoop-Pine Polyhedron Pendant',
        arch: 'hero_coral_pendant',
        pbr: 'timber',
        swatchSet: 'nz_timber',
        defaultSwatch: 0,
        dims: '720 W × 720 D × 1080 H mm',
        material: 'CNC Hoop-Pine Rib Lattice · Brushed Brass Canopy · Glass Diffuser',
        assumptions: 'Ø720mm shade sphere; 360mm ceiling drop cord.',
        licence: STANDARD_LICENCE,
        notes: 'Open-lattice icosahedral timber rib shade suspended from a brushed brass ceiling rose with inner frosted glass diffuser.'
      },
      {
        id: 'HERO-DIN-04',
        cat: 'dining',
        catLabel: '3. Dining',
        env: 'Interior',
        brand: 'Ref: Linear Brass & Alabaster Dining Luminaire (Approximation)',
        name: '1600mm Solid Brushed Brass & Honed Alabaster Linear Pendant',
        arch: 'hero_linear_pendant',
        pbr: 'abi_pvd',
        swatchSet: 'abi_metals',
        defaultSwatch: 0,
        dims: '1600 W × 80 D × 950 H mm',
        material: 'Brushed Brass PVD Chassis · Honed Spanish Alabaster Cylinder',
        assumptions: 'Twin rigid brass suspension rods; 1600mm span for 2.4m dining tables.',
        licence: STANDARD_LICENCE,
        notes: 'Architectural linear dining luminaire with twin brass ceiling canopies, slender suspension rods, milled brass housing, and glowing honed alabaster diffuser.'
      },

      // =======================================================================
      // 4. KITCHEN: Oven, Cooktop, Rangehood, Fridge, Coffee Machine, Kettle, Toaster, Tapware, Bar Stools
      // =======================================================================
      {
        id: 'HERO-KIT-01',
        cat: 'kitchen',
        catLabel: '4. Kitchen',
        env: 'Interior',
        brand: 'Ref: Fisher & Paykel Series 11 Wall Oven (Approximation)',
        name: '600mm Flush Black Smoked-Glass & Brushed PVD Wall Oven',
        arch: 'hero_wall_oven',
        pbr: 'abi_pvd',
        swatchSet: 'abi_metals',
        defaultSwatch: 2,
        dims: '596 W × 565 D × 598 H mm',
        material: 'Smoked Toughened Glass · Brushed PVD Trim · Internal Wire Racks',
        assumptions: 'Standard 600mm NZ cabinetry module; triple-glazed door with visible oven cavity & racks.',
        licence: STANDARD_LICENCE,
        notes: 'Flush pyrolytic wall oven with smoked glass door revealing internal stainless racks, milled rotary control dials, TFT display bezel, and brushed metal bar handle.'
      },
      {
        id: 'HERO-KIT-02',
        cat: 'kitchen',
        catLabel: '4. Kitchen',
        env: 'Interior',
        brand: 'Ref: 900mm Frameless Induction Cooktop (Approximation)',
        name: '900mm Flush Matte Black Ceramic 5-Zone Induction Cooktop',
        arch: 'hero_induction_cooktop',
        pbr: 'abi_pvd',
        swatchSet: 'abi_metals',
        defaultSwatch: 2,
        dims: '900 W × 520 D × 54 H mm',
        material: 'Schott-Style Black Ceramic Glass · Brushed PVD Edge Trim',
        assumptions: '900×520mm flush bench cutout; 5 etched brass/silver induction cooking zones.',
        licence: STANDARD_LICENCE,
        notes: 'Ultra-slim bevel-edged black ceramic induction cooktop with brushed metal perimeter frame, 5 concentric cooking zone rings, and touch-slider control bar.'
      },
      {
        id: 'HERO-KIT-03',
        cat: 'kitchen',
        catLabel: '4. Kitchen',
        env: 'Interior',
        brand: 'Ref: Architectural Chimney Rangehood (Approximation)',
        name: '900mm Brushed Stainless & Fluted Ash Canopy Rangehood',
        arch: 'hero_rangehood',
        pbr: 'abi_pvd',
        swatchSet: 'abi_metals',
        defaultSwatch: 4,
        dims: '900 W × 500 D × 820 H mm',
        material: '304 Brushed Stainless Steel · Commercial Baffle Grease Filters',
        assumptions: '900mm canopy width; telescopic chimney flue; 3 commercial stainless baffle filters underneath.',
        licence: STANDARD_LICENCE,
        notes: 'Architectural T-shape canopy rangehood with brushed metal flue, chamfered hood body, front capacitive controls, and 3 slotted commercial baffle filters.'
      },
      {
        id: 'HERO-KIT-04',
        cat: 'kitchen',
        catLabel: '4. Kitchen',
        env: 'Interior',
        brand: 'Ref: Integrated French-Door Refrigerator (Approximation)',
        name: '900mm Integrated Southland Ash & Brushed Brass French-Door Fridge',
        arch: 'hero_integrated_fridge',
        pbr: 'timber',
        swatchSet: 'nz_timber',
        defaultSwatch: 0,
        dims: '900 W × 610 D × 2030 H mm',
        material: 'Panel-Ready Whitewashed Ash · Knurled Brushed Brass Handles',
        assumptions: 'French-door upper cabinet + bottom freezer drawer; 2030mm NZ tall joinery datum.',
        licence: STANDARD_LICENCE,
        notes: 'Cabinetry-integrated French-door refrigerator-freezer finished in vertical-grain Southland ash with recessed shadow-gap trim and 3 knurled brushed brass bar handles.'
      },
      {
        id: 'HERO-KIT-05',
        cat: 'kitchen',
        catLabel: '4. Kitchen',
        env: 'Interior',
        brand: 'Ref: La Marzocco Linea Micra Espresso Machine (Approximation)',
        name: 'Dual-Boiler Brushed Steel & Otago Ash Espresso Machine',
        arch: 'hero_espresso_machine',
        pbr: 'abi_pvd',
        swatchSet: 'abi_metals',
        defaultSwatch: 4,
        dims: '290 W × 390 D × 340 H mm',
        material: 'Brushed 304 Stainless · Otago Ash Paddle & Portafilter · Ceramic Cups',
        assumptions: '290×390×340mm standalone countertop appliance.',
        licence: STANDARD_LICENCE,
        notes: 'Dual-boiler espresso machine with brushed stainless chassis, slotted drip tray, cup rail with 2 porcelain cups, saturated group head, ash brew paddle, bottomless portafilter, dual gauges, and steam wand.'
      },
      {
        id: 'HERO-KIT-06',
        cat: 'kitchen',
        catLabel: '4. Kitchen',
        env: 'Interior',
        brand: 'Ref: Precision Gooseneck Electric Kettle (Approximation)',
        name: 'Brushed Brass & Otago Ash Variable-Temp Pour-Over Kettle',
        arch: 'hero_kettle',
        pbr: 'abi_pvd',
        swatchSet: 'abi_metals',
        defaultSwatch: 0,
        dims: '290 W × 175 D × 215 H mm',
        material: '304 Stainless PVD · Ergonomic Otago Ash Handle · Heated Base',
        assumptions: '0.9L precision pour-over kettle with rotary temperature dial base.',
        licence: STANDARD_LICENCE,
        notes: 'Counterbalanced gooseneck pour-over electric kettle with turned Otago ash handle and lid finial resting on a brushed metal temperature-control base.'
      },
      {
        id: 'HERO-KIT-07',
        cat: 'kitchen',
        catLabel: '4. Kitchen',
        env: 'Interior',
        brand: 'Ref: Artisan 2-Slice Steel & Timber Toaster (Approximation)',
        name: '2-Slice Brushed Stainless & Southland Ash Artisan Toaster',
        arch: 'hero_toaster',
        pbr: 'abi_pvd',
        swatchSet: 'abi_metals',
        defaultSwatch: 4,
        dims: '295 W × 195 D × 205 H mm',
        material: 'Brushed 304 Stainless · Solid Southland Ash End Panels & Lever',
        assumptions: 'Wide 38mm artisan sourdough slots; knurled browning dial & high-lift timber lever.',
        licence: STANDARD_LICENCE,
        notes: 'Rounded architectural stainless toaster body with solid Southland ash end cheeks, twin wide bread slots, knurled browning dial, and ash carriage lever.'
      },
      {
        id: 'HERO-KIT-08',
        cat: 'kitchen',
        catLabel: '4. Kitchen',
        env: 'Interior',
        brand: 'Ref: ABI Elysian Gooseneck Pull-Out Mixer (Approximation)',
        name: 'Elysian-Inspired Gooseneck Pull-Out Kitchen Mixer (Standalone)',
        arch: 'hero_kitchen_tap',
        pbr: 'abi_pvd',
        swatchSet: 'abi_metals',
        defaultSwatch: 0,
        dims: '245 D × 54 W × 432 H mm',
        material: 'Brushed PVD Brass / Stainless + EPDM Seals + Under-Deck Tails',
        assumptions: '208mm spout reach · 262mm nozzle clearance · under-deck locknut & braided tails.',
        licence: STANDARD_LICENCE,
        notes: 'Standalone kitchen mixer with chamfered escutcheon, EPDM O-ring, under-deck brass shank/tails, swivel collar, 180° gooseneck, pull-out spray wand, and knurled pin lever.'
      },
      {
        id: 'HERO-KIT-09',
        cat: 'kitchen',
        catLabel: '4. Kitchen',
        env: 'Interior',
        brand: 'Ref: NZ Counter-Height Timber & Leather Bar Stool (Approximation)',
        name: '650mm Otago Beech & Saddle Leather Low-Back Counter Stool',
        arch: 'hero_bar_stool',
        pbr: 'timber',
        swatchSet: 'nz_timber',
        defaultSwatch: 1,
        dims: '450 W × 460 D × 780 H mm',
        material: 'Turned Otago Beech · Full-Grain Saddle Leather Seat · Brass Footrest',
        assumptions: '650mm seat height engineered for 900mm NZ kitchen islands.',
        licence: STANDARD_LICENCE,
        notes: 'Splayed turned Otago beech legs, circular brushed brass footrest ring, steam-bent low lumbar backrest, and crowned full-grain leather seat cushion.'
      },

      // =======================================================================
      // 5. BATHROOM: Vanity, Toilet, Shower Screen & Fittings, Towel Rails
      // =======================================================================
      {
        id: 'HERO-BTH-01',
        cat: 'bathroom',
        catLabel: '5. Bathroom',
        env: 'Interior',
        brand: 'Ref: Stanza 1200mm Fluted Ash & Marble Vanity (Approximation)',
        name: '1200mm Fluted Southland Ash & Calacatta Marble Floating Vanity',
        arch: 'hero_bathroom_vanity',
        pbr: 'timber',
        swatchSet: 'nz_timber',
        defaultSwatch: 0,
        dims: '1200 W × 460 D × 540 H mm',
        material: 'Fluted Whitewashed Ash · 40mm Honed Marble Top · Reeded Vessel Basin',
        assumptions: 'Wall-hung 1200mm floating vanity complete with reeded vessel basin & tall brass mixer.',
        licence: STANDARD_LICENCE,
        notes: 'Vertically fluted timber drawer cabinet with shadow-gap finger pull, 40mm honed marble top, reeded countertop vessel basin with brass waste, and tall vessel mixer.'
      },
      {
        id: 'HERO-BTH-02',
        cat: 'bathroom',
        catLabel: '5. Bathroom',
        env: 'Interior',
        brand: 'Ref: Rimless Matte Ceramic Architectural Toilet (Approximation)',
        name: 'Rimless Matte Chalk Ceramic Back-to-Wall Toilet & Brass Flush Plate',
        arch: 'hero_toilet',
        pbr: 'stone',
        swatchSet: 'stone_ceramic',
        defaultSwatch: 2,
        dims: '365 W × 560 D × 420 H mm',
        material: 'Matte Chalk Vitreous Ceramic · Slimline Soft-Close Seat · PVD Flush Plate',
        assumptions: '420mm comfort pan height; paired with matching brushed brass dual-flush wall plate.',
        licence: STANDARD_LICENCE,
        notes: 'Sculpted rimless matte ceramic back-to-wall toilet pan with slimline soft-close lid, concealed trap shroud, and brushed brass dual-flush actuator plate.'
      },
      {
        id: 'HERO-BTH-03',
        cat: 'bathroom',
        catLabel: '5. Bathroom',
        env: 'Interior',
        brand: 'Ref: Frameless Glass Shower & ABI Rain Fittings (Approximation)',
        name: '1000×2050mm Frameless Walk-In Shower Screen & 250mm Rain/Rail Set',
        arch: 'hero_shower_screen_fittings',
        pbr: 'abi_pvd',
        swatchSet: 'abi_metals',
        defaultSwatch: 0,
        dims: '1000 W × 420 D × 2050 H mm',
        material: '10mm Low-Iron Toughened Glass · Brushed Brass Channels · 250mm Rain Disc',
        assumptions: '1000mm walk-in glass panel with overhead stabiliser bar, 250mm rain head, hand wand & mixer.',
        licence: STANDARD_LICENCE,
        notes: 'Frameless 10mm low-iron glass walk-in shower panel set in slimline brushed brass U-channels with overhead stabiliser bar, 250mm overhead rain shower, slide rail hand wand, and concealed mixer.'
      },
      {
        id: 'HERO-BTH-04',
        cat: 'bathroom',
        catLabel: '5. Bathroom',
        env: 'Interior',
        brand: 'Ref: Vertical Heated Ladder Towel Rail (Approximation)',
        name: '550×900mm Brushed Brass PVD Heated Ladder Towel Rail & Flax Towel',
        arch: 'hero_towel_rail',
        pbr: 'abi_pvd',
        swatchSet: 'abi_metals',
        defaultSwatch: 0,
        dims: '550 W × 115 D × 900 H mm',
        material: '316 Marine Stainless PVD · 5 Horizontal Heated Bars · Raw Flax Towel',
        assumptions: '550mm width × 900mm height; concealed wall spigots; draped waffle-weave flax bath towel.',
        licence: STANDARD_LICENCE,
        notes: '5-bar architectural heated ladder towel rail in brushed PVD finish with turned wall mounting spigots and a gravity-draped raw NZ flax bath towel.'
      },

      // =======================================================================
      // 6. OUTDOOR: Deck Furniture, Planters, BBQ
      // =======================================================================
      {
        id: 'HERO-OUT-01',
        cat: 'outdoor',
        catLabel: '6. Outdoor',
        env: 'Outdoor',
        brand: 'Ref: NZ Kwila Slatted Deck Lounge Suite (Approximation)',
        name: 'Weathered NZ Kwila Slatted Outdoor Sofa & Low Deck Coffee Table',
        arch: 'hero_outdoor_deck_furniture',
        pbr: 'timber',
        swatchSet: 'nz_timber',
        defaultSwatch: 4,
        dims: '2150 W × 1450 D × 720 H mm',
        material: 'FSC Weathered NZ Kwila Heartwood · All-Weather Oatmeal Linen Cushions',
        assumptions: 'Slatted drainage base; quick-dry weather-resistant cushions with welt piping.',
        licence: STANDARD_LICENCE,
        notes: 'Architectural slatted NZ Kwila outdoor 2.5-seater sofa with wide timber armrests, tailored weather-resistant oatmeal seat & back cushions, and matching slatted deck coffee table.'
      },
      {
        id: 'HERO-OUT-02',
        cat: 'outdoor',
        catLabel: '6. Outdoor',
        env: 'Outdoor',
        brand: 'Ref: Architectural Concrete & Corten Planters (Approximation)',
        name: 'Tapered Honed Concrete & Corten Steel Architectural Planter Trio',
        arch: 'hero_outdoor_planters',
        pbr: 'stone',
        swatchSet: 'stone_ceramic',
        defaultSwatch: 0,
        dims: '1180 W × 540 D × 680 H mm',
        material: 'Glass-Fibre Reinforced Honed Concrete / Corten · Bark Mulch & Cobbles',
        assumptions: 'Graduated heights (680mm tall cylinder, 480mm medium bowl, 360mm low planter).',
        licence: STANDARD_LICENCE,
        notes: 'Three graduated architectural outdoor planters with chamfered rims, shadow-gap bases, river cobble mulch, and native tussock plantings.'
      },
      {
        id: 'HERO-OUT-03',
        cat: 'outdoor',
        catLabel: '6. Outdoor',
        env: 'Outdoor',
        brand: 'Ref: 316 Marine-Grade Hooded Outdoor BBQ (Approximation)',
        name: '316 Marine Stainless & Otago Ash 4-Burner Hooded Outdoor BBQ Grill',
        arch: 'hero_outdoor_bbq',
        pbr: 'abi_pvd',
        swatchSet: 'abi_metals',
        defaultSwatch: 4,
        dims: '1480 W × 620 D × 1180 H mm',
        material: '316 Coastal Stainless Steel · Otago Ash Side Shelves · Cast Iron Grates',
        assumptions: '1480mm overall width with twin timber prep shelves, roll-top hood, temperature gauge & lower cabinet.',
        licence: STANDARD_LICENCE,
        notes: 'Coastal-grade 316 brushed stainless 4-burner hooded BBQ grill with analog hood thermometer, 4 milled control knobs, cast-iron grill grates, Otago ash side prep tables, and double-door cabinet.'
      },

      // =======================================================================
      // 7. NATIVE PLANTS & CARS
      // =======================================================================
      {
        id: 'HERO-NAT-01',
        cat: 'plants_cars',
        catLabel: '7. Native Plants & Cars',
        env: 'Outdoor',
        brand: 'Botanical Ref: Rhopalostylis sapida (Approximation)',
        name: 'Mature NZ Nīkau Palm — Ringed Trunk, Crownshaft & 864 Leaflets',
        arch: 'proven_nikau_palm',
        pbr: 'botanical',
        swatchSet: 'nz_flora',
        defaultSwatch: 0,
        dims: '1480 W × 1480 D × 2620 H mm',
        material: 'Leaf-Scar Ringed Trunk · Crownshaft · 24 Pinnate Fronds (864 Leaflets)',
        assumptions: '1.32m clear trunk with 16 scar rings and 864 individually V-folded leaflets.',
        licence: STANDARD_LICENCE,
        notes: 'Endemic New Zealand palm built with root-flare humus mound, tapered trunk with 16 raised leaf-scar rings, bulbous emerald crownshaft, central spear, and 864 V-folded leaflets.'
      },
      {
        id: 'HERO-NAT-02',
        cat: 'plants_cars',
        catLabel: '7. Native Plants & Cars',
        env: 'Outdoor',
        brand: 'Botanical Ref: Metrosideros excelsa (Approximation)',
        name: 'Coastal Pōhutukawa — Gnarled Multi-Stem Limbs & Crimson Flowers',
        arch: 'pohutukawa_tree_specimen',
        pbr: 'botanical',
        swatchSet: 'nz_flora',
        defaultSwatch: 1,
        dims: '1500 W × 1400 D × 1680 H mm',
        material: 'Gnarled Bark Limbs · 1,800 Olive-Silver Leaves · Crimson Stamen Flowers',
        assumptions: 'Botanical visualisation approximation with instanced leaves & crimson flower brushes.',
        licence: STANDARD_LICENCE,
        notes: 'Gnarled multi-stemmed branches, 1,800+ instanced olive-silver leaves, and radiating crimson stamen brush inflorescences.'
      },
      {
        id: 'HERO-NAT-03',
        cat: 'plants_cars',
        catLabel: '7. Native Plants & Cars',
        env: 'Outdoor',
        brand: 'Botanical Ref: Cyathea dealbata (Approximation)',
        name: 'Ponga Silver Fern — Fibrous Trunk & Silver-Backed Fronds',
        arch: 'silver_fern_specimen',
        pbr: 'botanical',
        swatchSet: 'nz_flora',
        defaultSwatch: 2,
        dims: '1300 W × 1300 D × 1180 H mm',
        material: 'Fibrous Tree-Fern Trunk · 18 Bipinnate Silver-Backed Fronds',
        assumptions: 'Botanical visualisation approximation.',
        licence: STANDARD_LICENCE,
        notes: 'Endemic New Zealand tree fern with fibrous trunk and 18 arching fronds with silver-white undersides.'
      },
      {
        id: 'HERO-CAR-01',
        cat: 'plants_cars',
        catLabel: '7. Native Plants & Cars',
        env: 'Outdoor',
        brand: 'Ref: Contemporary Architectural EV SUV / Shooting Brake (Approximation)',
        name: 'Aotearoa Minimalist Electric SUV (Right-Hand-Drive NZ Spec · 1:1m)',
        arch: 'hero_electric_car',
        pbr: 'lacquer',
        swatchSet: 'car_finishes',
        defaultSwatch: 0,
        dims: '1920 W × 4680 L × 1580 H mm',
        material: 'Sculpted Metallic Body · Panoramic Smoked Glass · 21" Aero Alloy Wheels',
        assumptions: '1:1m real-world scale (4680mm length, 2890mm wheelbase); Right-Hand-Drive NZ cockpit visible through glass.',
        licence: STANDARD_LICENCE,
        notes: 'Architectural driveway scale vehicle in 1:1m RHD NZ spec: sculpted aerodynamic body shell, panoramic glass roof, flush door handles, LED front/rear light bars, side mirrors, RHD steering wheel & seats, and 4 multi-spoke 21" alloy wheels with brake discs.'
      }
    ];

    // =========================================================================
    // 3. 4-CHANNEL PHYSICALLY CALIBRATED PBR SHADER ENGINE (ALBEDO, NORMAL, ROUGH, METAL)
    // =========================================================================
    function hash2D(ix, iy) {
      const n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
      return n - Math.floor(n);
    }

    function valueNoise2D(x, y) {
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      const fx = x - ix;
      const fy = y - iy;
      const ux = fx * fx * (3 - 2 * fx);
      const uy = fy * fy * (3 - 2 * fy);
      const a = hash2D(ix, iy);
      const b = hash2D(ix + 1, iy);
      const c = hash2D(ix, iy + 1);
      const d = hash2D(ix + 1, iy + 1);
      return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    }

    function fbm2D(x, y, octaves = 4) {
      let v = 0;
      let amp = 0.5;
      let freq = 1.0;
      for (let i = 0; i < octaves; i++) {
        v += amp * valueNoise2D(x * freq, y * freq);
        freq *= 2.02;
        amp *= 0.5;
      }
      return v;
    }

    function voronoiPebble2D(u, v, cells = 28) {
      const x = u * cells;
      const y = v * cells;
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      const fx = x - ix;
      const fy = y - iy;
      let minDist = 8.0;
      let secondDist = 8.0;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cx = ((ix + dx) % cells + cells) % cells;
          const cy = ((iy + dy) % cells + cells) % cells;
          const rx = dx + 0.18 + 0.64 * hash2D(cx, cy) - fx;
          const ry = dy + 0.18 + 0.64 * hash2D(cx + 37, cy + 91) - fy;
          const d = Math.hypot(rx, ry);
          if (d < minDist) {
            secondDist = minDist;
            minDist = d;
          } else if (d < secondDist) {
            secondDist = d;
          }
        }
      }
      const edge = Math.min(1, (secondDist - minDist) * 2.6);
      const dome = Math.max(0, 1 - minDist * 1.35);
      return { edge, dome };
    }

    function hexToRgb(hex) {
      const clean = hex.replace('#', '');
      const num = parseInt(clean, 16);
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }

    const pbrCache = new Map();

    function generatePBRMaps(pbrType, primaryHex, accentHex, resolution = 512) {
      const key = `${pbrType}_${primaryHex}_${accentHex}_${resolution}`;
      if (pbrCache.has(key)) return pbrCache.get(key);

      const size = resolution;
      const albedoCanvas = document.createElement('canvas');
      const normalCanvas = document.createElement('canvas');
      const roughCanvas = document.createElement('canvas');
      const metalCanvas = document.createElement('canvas');
      const ormCanvas = document.createElement('canvas');
      albedoCanvas.width = normalCanvas.width = roughCanvas.width = metalCanvas.width = ormCanvas.width = size;
      albedoCanvas.height = normalCanvas.height = roughCanvas.height = metalCanvas.height = ormCanvas.height = size;

      const aCtx = albedoCanvas.getContext('2d');
      const nCtx = normalCanvas.getContext('2d');
      const rCtx = roughCanvas.getContext('2d');
      const mCtx = metalCanvas.getContext('2d');
      const ormCtx = ormCanvas.getContext('2d');

      const aImg = aCtx.createImageData(size, size);
      const nImg = nCtx.createImageData(size, size);
      const rImg = rCtx.createImageData(size, size);
      const mImg = mCtx.createImageData(size, size);
      const ormImg = ormCtx.createImageData(size, size);

      const [r1, g1, b1] = hexToRgb(primaryHex);
      const [r2, g2, b2] = hexToRgb(accentHex);

      const heightField = new Float32Array(size * size);

      for (let y = 0; y < size; y++) {
        const v = y / size;
        for (let x = 0; x < size; x++) {
          const u = x / size;
          const idx = y * size + x;
          const p = idx * 4;

          let h = 0.5;
          let blend = 0.2;
          let rough = 0.65;
          let metal = 0.0;

          if (pbrType === 'linen') {
            const freq = 140;
            const warp = Math.sin(u * Math.PI * freq);
            const weft = Math.sin(v * Math.PI * freq);
            const slubU = fbm2D(u * 12, v * 90, 2);
            const slubV = fbm2D(u * 90, v * 12, 2);
            const basket = Math.sin(u * Math.PI * (freq * 0.5)) * Math.sin(v * Math.PI * (freq * 0.5));
            h = 0.48 + 0.16 * warp * slubU + 0.16 * weft * slubV + 0.10 * basket;
            blend = Math.min(1, Math.max(0, 0.10 + 0.34 * (1 - h) + 0.14 * slubU));
            rough = 0.85 + 0.11 * (1 - h);
            metal = 0.0;
          } else if (pbrType === 'boucle') {
            const c1 = voronoiPebble2D(u, v, 36);
            const c2 = voronoiPebble2D(u + 0.31, v + 0.17, 54);
            const fiber = fbm2D(u * 140, v * 140, 3);
            h = 0.32 + 0.36 * c1.dome + 0.18 * c2.dome + 0.14 * fiber;
            blend = Math.min(1, Math.max(0, 0.10 + 0.45 * (1 - c1.dome) + 0.15 * fiber));
            rough = 0.88 + 0.09 * (1 - c1.dome);
            metal = 0.0;
          } else if (pbrType === 'leather') {
            const grain = voronoiPebble2D(u, v, 34);
            const microPore = fbm2D(u * 110, v * 110, 2);
            const pullUp = fbm2D(u * 3.5, v * 3.5, 3);
            h = 0.38 + 0.36 * grain.edge + 0.18 * grain.dome + 0.08 * microPore;
            blend = Math.min(1, Math.max(0, 0.08 + 0.38 * (1 - grain.edge) + 0.24 * pullUp));
            rough = 0.36 + 0.20 * (1 - grain.edge) + 0.06 * (1 - pullUp);
            metal = 0.0;
          } else if (pbrType === 'timber') {
            const warp = fbm2D(u * 4.5, v * 3.0, 3) * 2.1;
            const ring = Math.sin((u * 16 + warp) * Math.PI);
            const vessels = fbm2D(u * 95, v * 16, 2);
            h = 0.44 + 0.30 * ring + 0.26 * vessels;
            blend = Math.min(1, Math.max(0, 0.12 + 0.52 * (0.5 - 0.5 * ring) + 0.16 * (1 - vessels)));
            rough = 0.54 + 0.22 * (1 - vessels);
            metal = 0.0;
          } else if (pbrType === 'marble') {
            const qx = fbm2D(u * 4.0, v * 4.0, 4);
            const qy = fbm2D(u * 4.0 + 5.2, v * 4.0 + 1.3, 4);
            const veinPrimary = Math.abs(Math.sin((u * 3.2 + qx * 2.4 + v * 1.4) * Math.PI));
            const veinSharp = Math.pow(Math.max(0, 1.0 - veinPrimary), 5.5);
            const veinFine = Math.pow(Math.max(0, 1.0 - Math.abs(Math.sin((v * 5.0 + qy * 2.8) * Math.PI))), 8.0);
            const crystal = fbm2D(u * 40, v * 40, 3);
            h = 0.52 - 0.14 * veinSharp - 0.08 * veinFine + 0.10 * crystal;
            blend = Math.min(1, Math.max(0, 0.04 + 0.78 * veinSharp + 0.42 * veinFine + 0.08 * crystal));
            rough = 0.20 + 0.26 * veinSharp + 0.08 * (1 - crystal);
            metal = 0.0;
          } else if (pbrType === 'stone') {
            const strata = fbm2D(u * 4 + fbm2D(u * 10, v * 10, 3) * 0.9, v * 22, 4);
            const micro = fbm2D(u * 65, v * 65, 3);
            const pit = micro < 0.25 ? 0.14 : 0.72;
            h = 0.36 + 0.38 * strata + 0.26 * pit;
            blend = Math.min(1, Math.max(0, 0.12 + 0.56 * (1 - strata)));
            rough = pit < 0.3 ? 0.86 : 0.44 + 0.20 * (1 - strata);
            metal = 0.0;
          } else if (pbrType === 'abi_pvd') {
            const brushFine = fbm2D(u * 300, v * 12, 2);
            const brushMacro = fbm2D(u * 65, v * 5, 2);
            h = 0.38 + 0.40 * brushFine + 0.22 * brushMacro;
            blend = Math.min(1, Math.max(0, 0.06 + 0.26 * (1 - brushFine)));
            rough = 0.24 + 0.11 * (1 - brushFine);
            metal = 0.94 + 0.05 * brushFine;
          } else if (pbrType === 'lacquer') {
            const flake = fbm2D(u * 160, v * 160, 2);
            const clearWave = fbm2D(u * 6, v * 6, 2);
            h = 0.49 + 0.08 * flake + 0.06 * clearWave;
            blend = Math.min(1, Math.max(0, 0.06 + 0.18 * (1 - flake)));
            rough = 0.11 + 0.06 * (1 - flake);
            metal = 0.22;
          } else if (pbrType === 'botanical') {
            const vein = Math.abs(Math.sin((u * 18 + fbm2D(u * 5, v * 5, 2) * 0.4) * Math.PI));
            const cell = fbm2D(u * 48, v * 48, 3);
            h = 0.38 + 0.38 * vein + 0.24 * cell;
            blend = Math.min(1, Math.max(0, 0.14 + 0.48 * (1 - vein)));
            rough = 0.36 + 0.22 * cell;
            metal = 0.0;
          } else {
            const ripple = fbm2D(u * 16, v * 16, 3);
            h = 0.45 + 0.25 * ripple;
            blend = 0.15 * ripple;
            rough = 0.08 + 0.07 * ripple;
            metal = 0.0;
          }

          heightField[idx] = h;

          aImg.data[p] = Math.round(r1 * (1 - blend) + r2 * blend);
          aImg.data[p + 1] = Math.round(g1 * (1 - blend) + g2 * blend);
          aImg.data[p + 2] = Math.round(b1 * (1 - blend) + b2 * blend);
          aImg.data[p + 3] = 255;

          const rByte = Math.round(Math.min(255, Math.max(0, rough * 255)));
          rImg.data[p] = rByte;
          rImg.data[p + 1] = rByte;
          rImg.data[p + 2] = rByte;
          rImg.data[p + 3] = 255;

          const mByte = Math.round(Math.min(255, Math.max(0, metal * 255)));
          mImg.data[p] = mByte;
          mImg.data[p + 1] = mByte;
          mImg.data[p + 2] = mByte;
          mImg.data[p + 3] = 255;

          ormImg.data[p] = 255;
          ormImg.data[p + 1] = rByte;
          ormImg.data[p + 2] = mByte;
          ormImg.data[p + 3] = 255;
        }
      }

      const strength =
        pbrType === 'abi_pvd' ? 1.1 :
        pbrType === 'lacquer' ? 0.35 :
        pbrType === 'marble' ? 0.9 :
        pbrType === 'leather' ? 1.8 :
        pbrType === 'linen' ? 1.7 : 2.3;

      for (let y = 0; y < size; y++) {
        const ym = (y - 1 + size) % size;
        const yp = (y + 1) % size;
        for (let x = 0; x < size; x++) {
          const xm = (x - 1 + size) % size;
          const xp = (x + 1) % size;
          const dx = (heightField[y * size + xp] - heightField[y * size + xm]) * strength;
          const dy = (heightField[yp * size + x] - heightField[ym * size + x]) * strength;
          const invLen = 1.0 / Math.hypot(dx, dy, 1.0);
          const p = (y * size + x) * 4;
          nImg.data[p] = Math.round((-dx * invLen * 0.5 + 0.5) * 255);
          nImg.data[p + 1] = Math.round((-dy * invLen * 0.5 + 0.5) * 255);
          nImg.data[p + 2] = Math.round((invLen * 0.5 + 0.5) * 255);
          nImg.data[p + 3] = 255;
        }
      }

      aCtx.putImageData(aImg, 0, 0);
      nCtx.putImageData(nImg, 0, 0);
      rCtx.putImageData(rImg, 0, 0);
      mCtx.putImageData(mImg, 0, 0);
      ormCtx.putImageData(ormImg, 0, 0);

      const albedoTex = new THREE.CanvasTexture(albedoCanvas);
      const normalTex = new THREE.CanvasTexture(normalCanvas);
      const roughTex = new THREE.CanvasTexture(roughCanvas);
      const metalTex = new THREE.CanvasTexture(metalCanvas);
      const ormTex = new THREE.CanvasTexture(ormCanvas);

      [albedoTex, normalTex, roughTex, metalTex, ormTex].forEach(t => {
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 8;
        t.needsUpdate = true;
      });
      albedoTex.colorSpace = THREE.SRGBColorSpace;

      const bundle = {
        albedoTex,
        normalTex,
        roughTex,
        metalTex,
        ormTex,
        albedoCanvas,
        normalCanvas,
        roughCanvas,
        metalCanvas
      };
      pbrCache.set(key, bundle);
      return bundle;
    }

    function applyPhysicalUVScale(geometry, tileMeters = 0.25) {
      if (!geometry || !geometry.attributes || !geometry.attributes.position) return geometry;
      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      const pos = geometry.attributes.position;
      const norm = geometry.attributes.normal;
      const uvs = new Float32Array(pos.count * 2);

      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        const py = pos.getY(i);
        const pz = pos.getZ(i);
        const nx = norm ? Math.abs(norm.getX(i)) : 0;
        const ny = norm ? Math.abs(norm.getY(i)) : 1;
        const nz = norm ? Math.abs(norm.getZ(i)) : 0;

        let u = 0;
        let v = 0;
        if (ny >= nx && ny >= nz) {
          u = (px - box.min.x) / tileMeters;
          v = (pz - box.min.z) / tileMeters;
        } else if (nx >= ny && nx >= nz) {
          u = (pz - box.min.z) / tileMeters;
          v = (py - box.min.y) / tileMeters;
        } else {
          u = (px - box.min.x) / tileMeters;
          v = (py - box.min.y) / tileMeters;
        }
        uvs[i * 2] = u;
        uvs[i * 2 + 1] = v;
      }

      geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      return geometry;
    }

    // =========================================================================
    // 4. MAIN THREE.JS STUDIO PHOTOGRAPHY VIEWPORT SETUP
    // =========================================================================

    function buildStudioEnvTexture(renderer) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0xEDE9E1);
      const addPanel = (w, h, color, pos, rot) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
        m.position.set(...pos); m.rotation.set(...rot); envScene.add(m);
      };
      addPanel(16, 16, 0xFFFFFF, [0, 8, 0], [Math.PI / 2, 0, 0]);
      addPanel(12, 9, 0xFFFBF2, [7, 4, 6], [0, -Math.PI / 4, 0]);
      addPanel(10, 9, 0x262421, [-8, 3, 2], [0, Math.PI / 2, 0]);
      addPanel(10, 9, 0x2F2C28, [2, 3, -8], [0, 0, 0]);
      addPanel(16, 16, 0xD8D1C5, [0, -6, 0], [-Math.PI / 2, 0, 0]);
      const rt = pmrem.fromScene(envScene, 0.03); pmrem.dispose(); return rt.texture;
    }

    function fitShadowCameraToGroup(light, group) {
      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const extent = Math.max(size.x, size.y, size.z, 0.35) * 0.85;
      light.target.position.copy(center);
      light.target.updateMatrixWorld();
      light.shadow.camera.left = -extent;
      light.shadow.camera.right = extent;
      light.shadow.camera.top = extent;
      light.shadow.camera.bottom = -extent;
      light.shadow.camera.near = 0.2;
      light.shadow.camera.far = 25;
      light.shadow.camera.updateProjectionMatrix();
    }

    // =========================================================================
    // 5. SHARED ARCHITECTURAL, UPHOLSTERY, PLUMBING & BOTANICAL HELPERS
    // =========================================================================
    function createBeveledBox(w, h, d, cornerRadius = 0.015, bevelSize = 0.006, tileMeters = 0.35) {
      const bw = Math.max(0.004, w - bevelSize * 2);
      const bd = Math.max(0.004, d - bevelSize * 2);
      const bh = Math.max(0.002, h - bevelSize * 2);
      const r = Math.min(cornerRadius, bw * 0.45, bd * 0.45);

      const shape = new THREE.Shape();
      const hw = bw * 0.5;
      const hd = bd * 0.5;
      shape.moveTo(-hw + r, -hd);
      shape.lineTo(hw - r, -hd);
      shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
      shape.lineTo(hw, hd - r);
      shape.quadraticCurveTo(hw, hd, hw - r, hd);
      shape.lineTo(-hw + r, hd);
      shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
      shape.lineTo(-hw, -hd + r);
      shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: bh,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: bevelSize,
        bevelThickness: bevelSize
      });
      geo.rotateX(-Math.PI / 2);
      geo.center();
      geo.computeVertexNormals();
      return applyPhysicalUVScale(geo, tileMeters);
    }

    function createTailoredCushion(w, h, d, mat, pipingMat, {
      crownTop = 0.018,
      crownBottom = 0.008,
      cornerPinch = 0.014,
      seed = 1,
      segX = 26,
      segZ = 22,
      tileMeters = 0.22,
      includeBottomPiping = true
    } = {}) {
      const grp = new THREE.Group();
      const geo = new THREE.BoxGeometry(w, h, d, segX, 8, segZ);
      const pos = geo.attributes.position;
      const hw = w * 0.5;
      const hh = h * 0.5;
      const hd = d * 0.5;

      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        const nx = x / hw;
        const ny = y / hh;
        const nz = z / hd;

        const edgeFactor = Math.max(0, 1 - (Math.pow(Math.abs(nx), 3.4) * 0.28 + Math.pow(Math.abs(nz), 3.4) * 0.28));
        const dome = Math.max(0, (1 - nx * nx * 0.86) * (1 - nz * nz * 0.86));

        const isCorner = Math.abs(nx) > 0.82 && Math.abs(nz) > 0.82;
        if (isCorner) {
          x += Math.sign(nx) * cornerPinch * (1 - Math.abs(ny) * 0.65);
          z += Math.sign(nz) * cornerPinch * (1 - Math.abs(ny) * 0.65);
        }

        const organicWave =
          Math.sin((nx * 3.8 + seed * 1.7) + nz * 2.4) * 0.0035 * dome +
          Math.cos((nz * 4.5 - seed * 2.1)) * 0.0025 * dome;

        if (y >= 0) {
          y = y * (0.72 + 0.28 * edgeFactor) + crownTop * Math.pow(dome, 0.72) + organicWave;
        } else {
          y = y * (0.76 + 0.24 * edgeFactor) - crownBottom * Math.pow(dome, 0.75);
        }

        const sideBelly = (1 - ny * ny) * 0.010;
        x += Math.sign(nx) * sideBelly * (1 - Math.abs(nz) * 0.4);
        z += Math.sign(nz) * sideBelly * (1 - Math.abs(nx) * 0.4);

        pos.setXYZ(i, x, y, z);
      }

      geo.computeVertexNormals();
      applyPhysicalUVScale(geo, tileMeters);
      const body = new THREE.Mesh(geo, mat);
      body.castShadow = true;
      body.receiveShadow = true;
      grp.add(body);

      const buildWeltLoop = (ySign) => {
        const steps = 40;
        const pts = [];
        const rx = hw - 0.006;
        const rz = hd - 0.006;
        const cornerR = Math.min(0.038, rx * 0.25, rz * 0.25);

        const corners = [
          { cx: rx - cornerR, cz: rz - cornerR, a0: 0, a1: Math.PI * 0.5 },
          { cx: -rx + cornerR, cz: rz - cornerR, a0: Math.PI * 0.5, a1: Math.PI },
          { cx: -rx + cornerR, cz: -rz + cornerR, a0: Math.PI, a1: Math.PI * 1.5 },
          { cx: rx - cornerR, cz: -rz + cornerR, a0: Math.PI * 1.5, a1: Math.PI * 2 }
        ];

        corners.forEach(c => {
          const segSteps = Math.max(2, Math.floor(steps / 4));
          for (let s = 0; s < segSteps; s++) {
            const a = c.a0 + (s / segSteps) * (c.a1 - c.a0);
            const px = c.cx + Math.cos(a) * cornerR;
            const pz = c.cz + Math.sin(a) * cornerR;
            const nx = px / hw;
            const nz = pz / hd;
            const edgeFactor = Math.max(0, 1 - (Math.pow(Math.abs(nx), 3.4) * 0.28 + Math.pow(Math.abs(nz), 3.4) * 0.28));
            const dome = Math.max(0, (1 - nx * nx * 0.86) * (1 - nz * nz * 0.86));
            const py = ySign > 0
              ? hh * (0.72 + 0.28 * edgeFactor) + crownTop * Math.pow(dome, 0.72) * 0.55
              : -hh * (0.76 + 0.24 * edgeFactor) - crownBottom * Math.pow(dome, 0.75) * 0.55;
            pts.push(new THREE.Vector3(px, py, pz));
          }
        });

        const curve = new THREE.CatmullRomCurve3(pts, true);
        const tubeGeo = new THREE.TubeGeometry(curve, 56, 0.0036, 8, true);
        applyPhysicalUVScale(tubeGeo, tileMeters);
        const welt = new THREE.Mesh(tubeGeo, pipingMat);
        welt.castShadow = true;
        return welt;
      };

      grp.add(buildWeltLoop(1));
      if (includeBottomPiping) grp.add(buildWeltLoop(-1));
      return grp;
    }

    function createThickDrapedCloth(w, d, segX, segZ, thickness, edgeDrop, foldAmp, mat, tileMeters = 0.22) {
      const geo = new THREE.BoxGeometry(w, thickness, d, segX, 1, segZ);
      const pos = geo.attributes.position;
      const hw = w * 0.5;
      const hd = d * 0.5;

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const nx = x / hw;
        const nz = z / hd;
        const edgeDist = Math.max(0, Math.max(Math.abs(nx), Math.abs(nz)) - 0.72) / 0.28;
        const drop = edgeDrop * edgeDist * edgeDist;
        const diagFold = Math.sin((x * 7.5 + z * 5.2)) * foldAmp * (0.4 + 0.6 * edgeDist);
        const microRipple = Math.cos(x * 16.0 - z * 11.0) * (foldAmp * 0.35);
        pos.setY(i, y - drop + diagFold + microRipple);
      }
      geo.computeVertexNormals();
      applyPhysicalUVScale(geo, tileMeters);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }

    function createEscutcheonPlate(radius, height, metalMat, darkSealMat) {
      const grp = new THREE.Group();
      const pts = [
        new THREE.Vector2(0.0, 0.001),
        new THREE.Vector2(radius, 0.001),
        new THREE.Vector2(radius, height * 0.65),
        new THREE.Vector2(radius * 0.88, height),
        new THREE.Vector2(0.0, height)
      ];
      const flangeGeo = new THREE.LatheGeometry(pts, 36);
      applyPhysicalUVScale(flangeGeo, 0.16);
      const flange = new THREE.Mesh(flangeGeo, metalMat);
      flange.castShadow = true;
      flange.receiveShadow = true;

      const seal = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.96, 0.0011, 8, 32),
        darkSealMat
      );
      seal.rotation.x = Math.PI / 2;
      seal.position.y = 0.0011;

      grp.add(flange, seal);
      return grp;
    }

    function createAeratorNozzle(outerRadius, length, metalMat, darkSealMat) {
      const grp = new THREE.Group();
      const sleeveGeo = new THREE.CylinderGeometry(outerRadius * 0.96, outerRadius, length, 28);
      applyPhysicalUVScale(sleeveGeo, 0.16);
      const sleeve = new THREE.Mesh(sleeveGeo, metalMat);
      sleeve.position.y = -length * 0.5;
      sleeve.castShadow = true;

      const seam = new THREE.Mesh(
        new THREE.TorusGeometry(outerRadius * 0.98, 0.0009, 8, 24),
        darkSealMat
      );
      seam.rotation.x = Math.PI / 2;
      seam.position.y = -0.001;

      const screen = new THREE.Mesh(
        new THREE.CylinderGeometry(outerRadius * 0.82, outerRadius * 0.82, 0.003, 24),
        darkSealMat
      );
      screen.position.y = -length + 0.001;

      grp.add(sleeve, seam, screen);
      return grp;
    }

    function createKnurledMixerLever(metalMat, darkSealMat, scale = 1.0) {
      const grp = new THREE.Group();
      const bossGeo = new THREE.CylinderGeometry(0.015 * scale, 0.016 * scale, 0.016 * scale, 24);
      applyPhysicalUVScale(bossGeo, 0.16);
      const boss = new THREE.Mesh(bossGeo, metalMat);
      boss.rotation.z = Math.PI / 2;
      boss.position.x = -0.004 * scale;

      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.0154 * scale, 0.0011 * scale, 8, 24),
        darkSealMat
      );
      collar.rotation.y = Math.PI / 2;
      collar.position.x = 0.004 * scale;

      const barrelGeo = new THREE.CylinderGeometry(0.0152 * scale, 0.0152 * scale, 0.015 * scale, 24);
      applyPhysicalUVScale(barrelGeo, 0.16);
      const barrel = new THREE.Mesh(barrelGeo, metalMat);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.x = 0.012 * scale;

      const pinGeo = new THREE.CylinderGeometry(0.0032 * scale, 0.0044 * scale, 0.072 * scale, 16);
      applyPhysicalUVScale(pinGeo, 0.16);
      const pin = new THREE.Mesh(pinGeo, metalMat);
      pin.position.set(0.012 * scale, 0.038 * scale, 0);
      pin.rotation.z = -0.07;

      grp.add(boss, collar, barrel, pin);
      return grp;
    }

    function buildTrueGooseneckPoints(yBase, yArcStart, arcRadius, yTipEnd) {
      const pts = [];
      pts.push(new THREE.Vector3(0, yBase, 0));
      pts.push(new THREE.Vector3(0, yArcStart, 0));
      const steps = 18;
      for (let i = 1; i <= steps; i++) {
        const theta = Math.PI - (i / steps) * Math.PI;
        const z = arcRadius + Math.cos(theta) * arcRadius;
        const y = yArcStart + Math.sin(theta) * arcRadius;
        pts.push(new THREE.Vector3(0, y, z));
      }
      pts.push(new THREE.Vector3(0, yTipEnd, arcRadius * 2));
      return pts;
    }

    function createBotanicalBladeGeometry(length, baseWidth, archAngle, twistAngle = 0.08) {
      const segs = 12;
      const geo = new THREE.PlaneGeometry(baseWidth, length, 2, segs);
      geo.translate(0, length * 0.5, 0);
      const pos = geo.attributes.position;
      const colors = new Float32Array(pos.count * 3);

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const t = Math.min(1, Math.max(0, y / length));
        const taper = Math.sin(Math.pow(t, 0.65) * Math.PI * 0.94 + 0.06);
        const vFold = Math.abs(x / (baseWidth * 0.5)) * baseWidth * 0.24 * (1 - t * 0.5);
        const bend = archAngle * t * t;
        const ny = Math.sin(bend) * length * 0.52;
        const nz = (1 - Math.cos(bend)) * length * 0.72 + vFold;
        const twist = twistAngle * t;
        const rx = x * taper * Math.cos(twist);
        pos.setXYZ(i, rx, y - ny * 0.45, nz);

        const c = new THREE.Color().setHSL(0.24 - t * 0.04, 0.34, 0.34 + t * 0.18);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.computeVertexNormals();
      return geo;
    }

    function createNaturalRootMound(radius, height, barkMat, stoneMat) {
      const grp = new THREE.Group();
      const moundGeo = new THREE.CylinderGeometry(radius * 0.78, radius, height, 24, 3);
      const pos = moundGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        if (y > 0) {
          const n = fbm2D(x * 4.5 + 3, z * 4.5 + 7, 2);
          pos.setY(i, y + (n - 0.5) * 0.032);
        }
      }
      moundGeo.computeVertexNormals();
      applyPhysicalUVScale(moundGeo, 0.35);
      const mound = new THREE.Mesh(moundGeo, barkMat);
      mound.position.y = height * 0.5;
      mound.receiveShadow = true;
      grp.add(mound);

      for (let r = 0; r < 8; r++) {
        const ang = (r / 8) * Math.PI * 2 + hash2D(r, 4) * 0.5;
        const dist = radius * (0.45 + hash2D(r, 9) * 0.42);
        const rockGeo = new THREE.DodecahedronGeometry(0.036 + hash2D(r, 2) * 0.03, 1);
        applyPhysicalUVScale(rockGeo, 0.25);
        const rock = new THREE.Mesh(rockGeo, stoneMat);
        rock.scale.set(1.25, 0.65, 1.0);
        rock.position.set(Math.cos(ang) * dist, height * 0.92, Math.sin(ang) * dist);
        grp.add(rock);
      }
      return grp;
    }

    // =========================================================================
    // 6. ALL 33 HERO ARCHITECTURAL, APPLIANCE, BATH, OUTDOOR, PLANT & CAR BUILDERS
    // =========================================================================

    // --- 1. LIVING HEROES ---
    function buildHeroSofa(upholsteryMat, timberMat, throwMat, fringeMat, tileMeters, isOptimised = false) {
      const root = new THREE.Group();
      root.name = 'Hero_3SeaterSofa_2360x940x760mm';
      const pipingMat = upholsteryMat.clone();
      pipingMat.color = upholsteryMat.color.clone().multiplyScalar(0.92);

      const plinthGrp = new THREE.Group();
      plinthGrp.name = 'Sofa_TimberPlinth_Legs';
      const legH = 0.115;
      const plinthY = legH + 0.024;
      const plinthFront = new THREE.Mesh(createBeveledBox(2.26, 0.048, 0.036, 0.006, 0.003, 0.38), timberMat);
      plinthFront.position.set(0, plinthY, 0.41);
      const plinthBack = plinthFront.clone();
      plinthBack.position.z = -0.41;
      plinthGrp.add(plinthFront, plinthBack);

      [-1.11, 1.11].forEach(sx => {
        const sideBeam = new THREE.Mesh(createBeveledBox(0.036, 0.048, 0.85, 0.006, 0.003, 0.38), timberMat);
        sideBeam.position.set(sx, plinthY, 0);
        plinthGrp.add(sideBeam);
      });

      [[-1.06, 0.38], [1.06, 0.38], [-1.06, -0.38], [1.06, -0.38], [0, 0]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(applyPhysicalUVScale(new THREE.CylinderGeometry(0.024, 0.017, legH, 16), 0.35), timberMat);
        leg.position.set(lx, legH * 0.5, lz);
        leg.castShadow = true;
        plinthGrp.add(leg);
      });
      root.add(plinthGrp);

      const carcassGrp = new THREE.Group();
      carcassGrp.name = 'Sofa_UpholsteredCarcass';
      const deckBase = new THREE.Mesh(createBeveledBox(2.34, 0.145, 0.92, 0.018, 0.007, tileMeters), upholsteryMat);
      deckBase.position.set(0, 0.232, 0);
      deckBase.castShadow = true;
      const backFrame = new THREE.Mesh(createBeveledBox(2.36, 0.56, 0.21, 0.028, 0.010, tileMeters), upholsteryMat);
      backFrame.position.set(0, 0.46, -0.365);
      backFrame.castShadow = true;
      carcassGrp.add(deckBase, backFrame);

      [-1.09, 1.09].forEach(ax => {
        const arm = new THREE.Mesh(createBeveledBox(0.18, 0.44, 0.92, 0.026, 0.009, tileMeters), upholsteryMat);
        arm.position.set(ax, 0.40, 0);
        arm.castShadow = true;
        carcassGrp.add(arm);
      });
      root.add(carcassGrp);

      const segs = isOptimised ? 16 : 24;
      const seatGrp = new THREE.Group();
      seatGrp.name = 'Sofa_SeatCushions';
      [-0.665, 0.0, 0.665].forEach((cx, idx) => {
        const sc = createTailoredCushion(0.662, 0.152, 0.72, upholsteryMat, pipingMat, {
          crownTop: 0.020, crownBottom: 0.006, cornerPinch: 0.012, seed: 1.2 + idx * 1.9, segX: segs, segZ: segs, tileMeters
        });
        sc.position.set(cx, 0.376, 0.08);
        sc.rotation.x = -0.025;
        seatGrp.add(sc);
      });
      root.add(seatGrp);

      const backGrp = new THREE.Group();
      backGrp.name = 'Sofa_BackCushions';
      [-0.665, 0.0, 0.665].forEach((cx, idx) => {
        const bc = createTailoredCushion(0.660, 0.175, 0.45, upholsteryMat, pipingMat, {
          crownTop: 0.022, crownBottom: 0.008, cornerPinch: 0.015, seed: 4.5 + idx * 1.7, segX: segs, segZ: Math.max(14, segs - 4), tileMeters
        });
        bc.rotation.x = Math.PI * 0.5 - 0.19;
        bc.position.set(cx, 0.585, -0.205);
        backGrp.add(bc);
      });
      root.add(backGrp);

      const throwGrp = new THREE.Group();
      throwGrp.name = 'Sofa_DrapedMerinoThrow';
      const throwCloth = createThickDrapedCloth(0.54, 0.96, 20, 24, 0.018, 0.19, 0.012, throwMat, 0.24);
      throwCloth.position.set(1.09, 0.632, 0.0);
      throwGrp.add(throwCloth);
      for (let f = 0; f < 20; f++) {
        const fz = -0.44 + (f / 19) * 0.88;
        const fringe = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.0014, 0.065, 6), fringeMat);
        fringe.rotation.z = 0.22;
        fringe.position.set(1.36, 0.415, fz);
        throwGrp.add(fringe);
      }
      root.add(throwGrp);
      return root;
    }

    function buildHeroArmchair(upholsteryMat, timberMat, darkSealMat, tileMeters, isOptimised = false) {
      const root = new THREE.Group();
      root.name = 'Hero_LoungeArmchair_740x780x760mm';
      const pipingMat = upholsteryMat.clone();
      pipingMat.color = upholsteryMat.color.clone().multiplyScalar(0.92);

      const frameGrp = new THREE.Group();
      frameGrp.name = 'Armchair_SouthlandBeechFrame';
      const armH = 0.565;
      const seatDeckY = 0.305;

      [-0.33, 0.33].forEach(lx => {
        const frontLeg = new THREE.Mesh(applyPhysicalUVScale(new THREE.CylinderGeometry(0.019, 0.014, armH, 16), 0.35), timberMat);
        frontLeg.position.set(lx, armH * 0.5, 0.31);
        frontLeg.castShadow = true;

        const rearCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(lx, 0.0, -0.35),
          new THREE.Vector3(lx, seatDeckY, -0.30),
          new THREE.Vector3(lx, 0.74, -0.37)
        ]);
        const rearLeg = new THREE.Mesh(applyPhysicalUVScale(new THREE.TubeGeometry(rearCurve, 18, 0.018, 12, false), 0.35), timberMat);
        rearLeg.castShadow = true;

        const arm = new THREE.Mesh(createBeveledBox(0.068, 0.024, 0.68, 0.014, 0.005, 0.35), timberMat);
        arm.position.set(lx, armH, -0.01);
        arm.castShadow = true;

        const sideRail = new THREE.Mesh(createBeveledBox(0.032, 0.056, 0.62, 0.006, 0.003, 0.35), timberMat);
        sideRail.position.set(lx, seatDeckY - 0.028, 0.0);

        const stretcher = new THREE.Mesh(applyPhysicalUVScale(new THREE.CylinderGeometry(0.012, 0.012, 0.62, 12), 0.35), timberMat);
        stretcher.rotation.x = Math.PI / 2;
        stretcher.position.set(lx, 0.145, 0.0);

        frameGrp.add(frontLeg, rearLeg, arm, sideRail, stretcher);
      });

      const frontRail = new THREE.Mesh(createBeveledBox(0.64, 0.058, 0.032, 0.006, 0.003, 0.35), timberMat);
      frontRail.position.set(0, seatDeckY - 0.029, 0.30);
      const backBottomRail = new THREE.Mesh(createBeveledBox(0.64, 0.052, 0.032, 0.006, 0.003, 0.35), timberMat);
      backBottomRail.position.set(0, seatDeckY - 0.026, -0.30);
      const backTopRail = new THREE.Mesh(createBeveledBox(0.68, 0.044, 0.030, 0.010, 0.004, 0.35), timberMat);
      backTopRail.position.set(0, 0.735, -0.365);
      backTopRail.rotation.x = -0.18;
      frameGrp.add(frontRail, backBottomRail, backTopRail);

      for (let s = 0; s < 7; s++) {
        const sx = -0.255 + (s / 6) * 0.51;
        const slat = new THREE.Mesh(createBeveledBox(0.028, 0.44, 0.014, 0.004, 0.002, 0.35), timberMat);
        slat.position.set(sx, 0.515, -0.332);
        slat.rotation.x = -0.15;
        frameGrp.add(slat);
      }

      for (let wIdx = 0; wIdx < 4; wIdx++) {
        const wz = -0.20 + wIdx * 0.135;
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.63, 0.006, 0.055), darkSealMat);
        strap.position.set(0, seatDeckY - 0.005, wz);
        frameGrp.add(strap);
      }
      root.add(frameGrp);

      const segs = isOptimised ? 16 : 24;
      const seatCushion = createTailoredCushion(0.64, 0.132, 0.62, upholsteryMat, pipingMat, {
        crownTop: 0.018, crownBottom: 0.006, cornerPinch: 0.012, seed: 1.4, segX: segs, segZ: segs, tileMeters
      });
      seatCushion.name = 'Armchair_SeatCushion';
      seatCushion.position.set(0, seatDeckY + 0.064, 0.02);
      seatCushion.rotation.x = -0.04;

      const backCushion = createTailoredCushion(0.63, 0.140, 0.43, upholsteryMat, pipingMat, {
        crownTop: 0.020, crownBottom: 0.008, cornerPinch: 0.014, seed: 3.1, segX: segs, segZ: Math.max(14, segs - 4), tileMeters
      });
      backCushion.name = 'Armchair_BackCushion';
      backCushion.rotation.x = Math.PI * 0.5 - 0.21;
      backCushion.position.set(0, 0.525, -0.225);

      root.add(seatCushion, backCushion);
      return root;
    }

    function buildHeroCoffeeSideTables(timberMat, stoneMat, tileMeters) {
      const root = new THREE.Group();
      root.name = 'Hero_CoffeeAndSideTables_1380x860x440mm';

      const coffeeGrp = new THREE.Group();
      coffeeGrp.name = 'Table_SolidTimberCoffeeTable';
      const top = new THREE.Mesh(createBeveledBox(1.18, 0.038, 0.72, 0.045, 0.008, tileMeters), timberMat);
      top.position.set(-0.08, 0.321, 0.04);
      top.castShadow = true;
      top.receiveShadow = true;

      [-0.44, 0.28].forEach(lx => {
        const leg = new THREE.Mesh(createBeveledBox(0.065, 0.305, 0.48, 0.014, 0.005, tileMeters), timberMat);
        leg.position.set(lx, 0.1525, 0.04);
        leg.castShadow = true;
        coffeeGrp.add(leg);
      });
      const stretcher = new THREE.Mesh(createBeveledBox(0.74, 0.028, 0.08, 0.006, 0.003, tileMeters), timberMat);
      stretcher.position.set(-0.08, 0.14, 0.04);
      coffeeGrp.add(top, stretcher);

      const sideGrp = new THREE.Group();
      sideGrp.name = 'Table_HonedTravertineSideDrum';
      const drumGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.44, 44);
      applyPhysicalUVScale(drumGeo, 0.48);
      const drum = new THREE.Mesh(drumGeo, stoneMat);
      drum.position.set(0.47, 0.22, -0.18);
      drum.castShadow = true;
      drum.receiveShadow = true;

      const topCapGeo = new THREE.CylinderGeometry(0.224, 0.224, 0.026, 44);
      applyPhysicalUVScale(topCapGeo, 0.48);
      const topCap = new THREE.Mesh(topCapGeo, stoneMat);
      topCap.position.set(0.47, 0.435, -0.18);
      sideGrp.add(drum, topCap);

      root.add(coffeeGrp, sideGrp);
      return root;
    }

    function buildHeroRug(rugMat, fringeMat, tileMeters) {
      const grp = new THREE.Group();
      grp.name = 'Hero_HandKnottedWoolRug_2300x1580mm';
      const w = 1.58, d = 2.30;
      const rugBody = createThickDrapedCloth(w, d, 28, 36, 0.018, 0.004, 0.0045, rugMat, tileMeters);
      rugBody.name = 'Rug_WovenBoucleBody';
      rugBody.position.y = 0.011;
      grp.add(rugBody);

      [-1, 1].forEach(end => {
        const zEdge = end * (d * 0.5);
        for (let i = 0; i < 72; i++) {
          const tx = -w * 0.485 + (i / 71) * (w * 0.97);
          const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0014, 0.088, 6), fringeMat);
          tassel.rotation.x = Math.PI / 2;
          tassel.rotation.z = (hash2D(i, end + 3) - 0.5) * 0.18;
          tassel.position.set(tx, 0.003, zEdge + end * 0.044);
          grp.add(tassel);
        }
      });
      return grp;
    }

    function buildHeroFloorLamp(metalMat, stoneMat, shadeMat, darkSealMat) {
      const root = new THREE.Group();
      root.name = 'Hero_ArcFloorLamp_460x920x1680mm';

      const baseGeo = new THREE.CylinderGeometry(0.14, 0.145, 0.085, 40);
      applyPhysicalUVScale(baseGeo, 0.48);
      const plinth = new THREE.Mesh(baseGeo, stoneMat);
      plinth.name = 'FloorLamp_TravertinePlinth';
      plinth.position.set(0, 0.0425, -0.32);
      plinth.castShadow = true;

      const collar = createEscutcheonPlate(0.028, 0.012, metalMat, darkSealMat);
      collar.position.set(0, 0.085, -0.32);

      const arcPts = [
        new THREE.Vector3(0, 0.092, -0.32),
        new THREE.Vector3(0, 1.15, -0.30),
        new THREE.Vector3(0, 1.58, -0.10),
        new THREE.Vector3(0, 1.66, 0.18),
        new THREE.Vector3(0, 1.54, 0.34)
      ];
      const stemGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPts), 44, 0.011, 18, false);
      applyPhysicalUVScale(stemGeo, 0.16);
      const stem = new THREE.Mesh(stemGeo, metalMat);
      stem.name = 'FloorLamp_BrushedBrassArcStem';
      stem.castShadow = true;

      const shadeGeo = new THREE.CylinderGeometry(0.19, 0.22, 0.26, 40, 1, true);
      applyPhysicalUVScale(shadeGeo, 0.22);
      const shade = new THREE.Mesh(shadeGeo, shadeMat);
      shade.name = 'FloorLamp_FlaxLinenDrumShade';
      shade.position.set(0, 1.42, 0.34);
      shade.castShadow = true;

      const spider = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.003, 8, 36), metalMat);
      spider.rotation.x = Math.PI / 2;
      spider.position.set(0, 1.545, 0.34);

      root.add(plinth, collar, stem, shade, spider);
      return root;
    }

    function buildHeroTableLamp(ashMat, brassMat, darkSealMat) {
      const root = new THREE.Group();
      root.name = 'Hero_TableLamp_220x220x485mm';

      const opalGlassMat = new THREE.MeshPhysicalMaterial({
        color: 0xFAF7F0, roughness: 0.24, metalness: 0.0, reflectivity: 0.85, clearcoat: 0.6, transparent: true, opacity: 0.96
      });

      const basePts = [
        new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.082, 0.0), new THREE.Vector2(0.086, 0.012),
        new THREE.Vector2(0.078, 0.056), new THREE.Vector2(0.066, 0.068), new THREE.Vector2(0.0, 0.068)
      ];
      const baseGeo = new THREE.LatheGeometry(basePts, 44);
      applyPhysicalUVScale(baseGeo, 0.35);
      const baseMesh = new THREE.Mesh(baseGeo, ashMat);
      baseMesh.name = 'TableLamp_TurnedAshBase';
      baseMesh.castShadow = true;

      const brassCollar = createEscutcheonPlate(0.024, 0.012, brassMat, darkSealMat);
      brassCollar.position.y = 0.068;

      const stem = new THREE.Mesh(applyPhysicalUVScale(new THREE.CylinderGeometry(0.008, 0.008, 0.255, 20), 0.16), brassMat);
      stem.name = 'TableLamp_BrassStem';
      stem.position.y = 0.2075;

      const gallery = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.018, 0.022, 24), brassMat);
      gallery.position.set(0, 0.348, 0.024);

      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.078, 32, 24), opalGlassMat);
      globe.name = 'TableLamp_OpalGlassShade';
      globe.position.set(0, 0.415, 0.032);
      globe.castShadow = true;

      root.add(baseMesh, brassCollar, stem, gallery, globe);
      return root;
    }

    // --- 2. BEDROOM HEROES ---
    function buildHeroBedWithBedding(linenMat, oakMat, rawFlaxMat, fringeMat, tileMeters, isOptimised = false) {
      const root = new THREE.Group();
      root.name = 'Hero_KingBedWithBedding_1960x2140x1010mm';
      const pipingMat = linenMat.clone();
      pipingMat.color = linenMat.color.clone().multiplyScalar(0.92);

      const frameGrp = new THREE.Group();
      frameGrp.name = 'Bed_SouthlandAshFrame';
      const hb = new THREE.Mesh(createBeveledBox(1.96, 0.98, 0.065, 0.014, 0.006, 0.40), oakMat);
      hb.position.set(0, 0.52, -1.03);
      hb.castShadow = true;
      const base = new THREE.Mesh(createBeveledBox(1.92, 0.20, 2.08, 0.012, 0.005, 0.40), oakMat);
      base.position.set(0, 0.18, 0);
      base.castShadow = true;
      frameGrp.add(hb, base);

      [[-0.88, -0.96], [0.88, -0.96], [-0.88, 0.96], [0.88, 0.96]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.016, 0.12, 14), oakMat);
        leg.position.set(lx, 0.06, lz);
        frameGrp.add(leg);
      });
      root.add(frameGrp);

      const mattress = new THREE.Mesh(createBeveledBox(1.82, 0.24, 2.00, 0.035, 0.014, 0.22), rawFlaxMat);
      mattress.name = 'Bed_PocketSpringMattress';
      mattress.position.set(0, 0.39, 0.02);

      const turnDown = createThickDrapedCloth(1.94, 1.56, 26, 22, 0.018, 0.085, 0.008, rawFlaxMat, 0.22);
      turnDown.name = 'Bed_TurnDownSheet';
      turnDown.position.set(0, 0.518, 0.24);

      const duvet = createThickDrapedCloth(2.04, 1.48, 30, 24, 0.044, 0.135, 0.015, linenMat, tileMeters);
      duvet.name = 'Bed_DrapedFlaxDuvet';
      duvet.position.set(0, 0.538, 0.34);

      const footThrow = createThickDrapedCloth(2.08, 0.56, 26, 14, 0.022, 0.125, 0.012, fringeMat, 0.24);
      footThrow.name = 'Bed_MerinoFootThrow';
      footThrow.position.set(0, 0.566, 0.74);

      const segs = isOptimised ? 14 : 22;
      const pBackL = createTailoredCushion(0.76, 0.18, 0.50, rawFlaxMat, rawFlaxMat, { segX: segs, segZ: segs, tileMeters: 0.22 });
      pBackL.position.set(-0.44, 0.65, -0.78);
      pBackL.rotation.x = 0.34;
      const pBackR = createTailoredCushion(0.76, 0.18, 0.50, rawFlaxMat, rawFlaxMat, { segX: segs, segZ: segs, tileMeters: 0.22 });
      pBackR.position.set(0.44, 0.65, -0.78);
      pBackR.rotation.x = 0.34;

      const pFrontL = createTailoredCushion(0.68, 0.16, 0.44, linenMat, pipingMat, { segX: segs, segZ: segs, tileMeters });
      pFrontL.position.set(-0.42, 0.60, -0.62);
      pFrontL.rotation.x = 0.46;
      const pFrontR = createTailoredCushion(0.68, 0.16, 0.44, linenMat, pipingMat, { segX: segs, segZ: segs, tileMeters });
      pFrontR.position.set(0.42, 0.60, -0.62);
      pFrontR.rotation.x = 0.46;

      root.add(mattress, turnDown, duvet, footThrow, pBackL, pBackR, pFrontL, pFrontR);
      return root;
    }

    function buildHeroBedsideTable(timberMat, brassMat, tileMeters) {
      const root = new THREE.Group();
      root.name = 'Hero_BedsideTable_520x420x540mm';

      [[-0.21, -0.16], [0.21, -0.16], [-0.21, 0.16], [0.21, 0.16]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(applyPhysicalUVScale(new THREE.CylinderGeometry(0.016, 0.012, 0.18, 16), tileMeters), timberMat);
        leg.position.set(lx, 0.09, lz);
        leg.castShadow = true;
        root.add(leg);
      });

      const body = new THREE.Mesh(createBeveledBox(0.52, 0.36, 0.42, 0.010, 0.004, tileMeters), timberMat);
      body.name = 'Bedside_MitredCarcass';
      body.position.set(0, 0.36, 0);
      body.castShadow = true;

      const reveal = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.008, 0.424), brassMat);
      reveal.name = 'Bedside_BrassShadowReveal';
      reveal.position.set(0, 0.36, 0.002);

      [0.275, 0.445].forEach((dy, idx) => {
        const drawer = new THREE.Mesh(createBeveledBox(0.47, 0.145, 0.020, 0.005, 0.002, tileMeters), timberMat);
        drawer.name = `Bedside_Drawer_${idx + 1}`;
        drawer.position.set(0, dy, 0.206);
        drawer.castShadow = true;
        root.add(drawer);
      });

      root.add(body, reveal);
      return root;
    }

    function buildHeroWardrobe(timberMat, oakMat, brassMat, darkSealMat, tileMeters) {
      const root = new THREE.Group();
      root.name = 'Hero_DoubleWardrobe_1240x600x2200mm';

      const w = 1.24, d = 0.60, h = 2.20, plinthH = 0.10;

      const plinth = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, plinthH, d - 0.08), darkSealMat);
      plinth.name = 'Wardrobe_ShadowPlinth';
      plinth.position.set(0, plinthH * 0.5, -0.02);

      const carH = h - plinthH;
      const leftPanel = new THREE.Mesh(createBeveledBox(0.026, carH, d - 0.02, 0.005, 0.002, tileMeters), timberMat);
      leftPanel.position.set(-w * 0.5 + 0.013, plinthH + carH * 0.5, -0.01);
      const rightPanel = leftPanel.clone();
      rightPanel.position.x = w * 0.5 - 0.013;

      const topPanel = new THREE.Mesh(createBeveledBox(w, 0.026, d - 0.02, 0.005, 0.002, tileMeters), timberMat);
      topPanel.position.set(0, h - 0.013, -0.01);
      const botPanel = topPanel.clone();
      botPanel.position.y = plinthH + 0.013;

      const backPanel = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, carH - 0.02, 0.012), oakMat);
      backPanel.position.set(0, plinthH + carH * 0.5, -d * 0.5 + 0.016);

      root.add(plinth, leftPanel, rightPanel, topPanel, botPanel, backPanel);

      const interiorGrp = new THREE.Group();
      interiorGrp.name = 'Wardrobe_InteriorShelves_HangingRail';
      const divider = new THREE.Mesh(new THREE.BoxGeometry(0.022, carH - 0.04, d - 0.06), oakMat);
      divider.position.set(0, plinthH + carH * 0.5, -0.01);
      interiorGrp.add(divider);

      const hangRail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.57, 16), brassMat);
      hangRail.rotation.z = Math.PI / 2;
      hangRail.position.set(-0.30, h - 0.24, 0.02);
      interiorGrp.add(hangRail);

      [0.52, 0.94, 1.36, 1.78].forEach(sy => {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.022, d - 0.07), oakMat);
        shelf.position.set(0.30, sy, -0.01);
        interiorGrp.add(shelf);
      });
      root.add(interiorGrp);

      // Right closed fluted door
      const doorW = (w - 0.06) * 0.5;
      const doorH = carH - 0.04;
      const rightDoorGrp = new THREE.Group();
      rightDoorGrp.name = 'Wardrobe_RightFlutedDoor';
      rightDoorGrp.position.set(w * 0.5 - 0.028, plinthH + carH * 0.5, d * 0.5 - 0.015);
      const rDoor = new THREE.Mesh(createBeveledBox(doorW, doorH, 0.022, 0.004, 0.002, tileMeters), timberMat);
      rDoor.position.set(-doorW * 0.5, 0, 0);
      rDoor.castShadow = true;
      rightDoorGrp.add(rDoor);

      for (let f = 0; f < 16; f++) {
        const fx = -doorW + 0.022 + (f / 15) * (doorW - 0.044);
        const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, doorH - 0.04, 8), timberMat);
        rib.position.set(fx, 0, 0.012);
        rightDoorGrp.add(rib);
      }
      const rPull = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.24, 16), brassMat);
      rPull.position.set(-doorW + 0.035, 0.05, 0.028);
      rightDoorGrp.add(rPull);

      // Left door slightly ajar (34 degrees) to showcase interior joinery
      const leftDoorGrp = new THREE.Group();
      leftDoorGrp.name = 'Wardrobe_LeftFlutedDoor_Open';
      leftDoorGrp.position.set(-w * 0.5 + 0.028, plinthH + carH * 0.5, d * 0.5 - 0.015);
      leftDoorGrp.rotation.y = -0.58;
      const lDoor = new THREE.Mesh(createBeveledBox(doorW, doorH, 0.022, 0.004, 0.002, tileMeters), timberMat);
      lDoor.position.set(doorW * 0.5, 0, 0);
      lDoor.castShadow = true;
      leftDoorGrp.add(lDoor);

      for (let f = 0; f < 16; f++) {
        const fx = 0.022 + (f / 15) * (doorW - 0.044);
        const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, doorH - 0.04, 8), timberMat);
        rib.position.set(fx, 0, 0.012);
        leftDoorGrp.add(rib);
      }
      const lPull = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.24, 16), brassMat);
      lPull.position.set(doorW - 0.035, 0.05, 0.028);
      leftDoorGrp.add(lPull);

      root.add(rightDoorGrp, leftDoorGrp);
      return root;
    }

    // --- 3. DINING HEROES ---
    function buildHeroDiningTable(timberMat, tileMeters) {
      const root = new THREE.Group();
      root.name = 'Hero_DiningTable_2400x1040x750mm';
      const top = new THREE.Mesh(createBeveledBox(2.40, 0.042, 1.04, 0.024, 0.008, tileMeters), timberMat);
      top.name = 'DiningTable_BullnoseTop';
      top.position.y = 0.729;
      top.castShadow = true;
      top.receiveShadow = true;

      [-0.78, 0.78].forEach((lx, idx) => {
        const leg = new THREE.Mesh(createBeveledBox(0.085, 0.71, 0.74, 0.018, 0.005, tileMeters), timberMat);
        leg.name = `DiningTable_SlabLeg_${idx + 1}`;
        leg.position.set(lx, 0.355, 0);
        leg.castShadow = true;
        root.add(leg);
      });
      const beam = new THREE.Mesh(createBeveledBox(1.58, 0.055, 0.075, 0.008, 0.003, tileMeters), timberMat);
      beam.name = 'DiningTable_UnderStretcher';
      beam.position.set(0, 0.56, 0);
      root.add(top, beam);
      return root;
    }

    function buildHeroDiningChair(timberMat, seatMat, tileMeters) {
      const root = new THREE.Group();
      root.name = 'Hero_DiningChair_510x490x770mm';

      [[-0.20, -0.19], [0.20, -0.19], [-0.20, 0.19], [0.20, 0.19]].forEach(([lx, lz]) => {
        const h = lz < 0 ? 0.73 : 0.44;
        const leg = new THREE.Mesh(applyPhysicalUVScale(new THREE.CylinderGeometry(0.017, 0.012, h, 16), tileMeters), timberMat);
        leg.position.set(lx, h * 0.5, lz);
        leg.castShadow = true;
        root.add(leg);
      });

      const seatPad = createTailoredCushion(0.46, 0.036, 0.44, seatMat, seatMat, {
        crownTop: 0.008, crownBottom: 0.003, cornerPinch: 0.006, segX: 18, segZ: 18, tileMeters: 0.24, includeBottomPiping: false
      });
      seatPad.name = 'DiningChair_BoucleSeatPad';
      seatPad.position.set(0, 0.455, 0.01);

      const crestCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.24, 0.68, -0.10),
        new THREE.Vector3(-0.20, 0.73, -0.19),
        new THREE.Vector3(0.0, 0.76, -0.22),
        new THREE.Vector3(0.20, 0.73, -0.19),
        new THREE.Vector3(0.24, 0.68, -0.10)
      ]);
      const crestGeo = new THREE.TubeGeometry(crestCurve, 32, 0.022, 14, false);
      applyPhysicalUVScale(crestGeo, tileMeters);
      const crest = new THREE.Mesh(crestGeo, timberMat);
      crest.name = 'DiningChair_SteamBentBackrest';
      crest.castShadow = true;

      root.add(seatPad, crest);
      return root;
    }

    function buildHeroCoralPendant(timberMat, brassMat, darkSealMat, warmGlowMat) {
      const root = new THREE.Group();
      root.name = 'Hero_CoralPendant_720x720x1080mm';
      const rose = createEscutcheonPlate(0.055, 0.018, brassMat, darkSealMat);
      rose.rotation.x = Math.PI;
      rose.position.y = 1.08;
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.34, 10), darkSealMat);
      cord.position.y = 0.90;

      const baseGeo = new THREE.IcosahedronGeometry(0.34, 1);
      const edgesGeo = new THREE.EdgesGeometry(baseGeo);
      const posAttr = edgesGeo.attributes.position;
      const cageGrp = new THREE.Group();
      cageGrp.name = 'CoralPendant_HoopPineLattice';
      cageGrp.position.y = 0.46;

      const pA = new THREE.Vector3(), pB = new THREE.Vector3(), mid = new THREE.Vector3(), dir = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0), quat = new THREE.Quaternion();
      for (let i = 0; i < posAttr.count; i += 2) {
        pA.fromBufferAttribute(posAttr, i);
        pB.fromBufferAttribute(posAttr, i + 1);
        const len = pA.distanceTo(pB);
        mid.addVectors(pA, pB).multiplyScalar(0.5);
        dir.subVectors(pB, pA).normalize();
        quat.setFromUnitVectors(up, dir);
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.018, len, 0.008), timberMat);
        strut.position.copy(mid);
        strut.quaternion.copy(quat);
        strut.castShadow = true;
        cageGrp.add(strut);
      }
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.052, 20, 20), warmGlowMat);
      bulb.position.y = 0.46;
      root.add(rose, cord, cageGrp, bulb);
      return root;
    }

    function buildHeroLinearPendant(metalMat, darkSealMat, warmGlowMat) {
      const root = new THREE.Group();
      root.name = 'Hero_LinearPendant_1600x80x950mm';
      [-0.55, 0.55].forEach(rx => {
        const rose = createEscutcheonPlate(0.032, 0.014, metalMat, darkSealMat);
        rose.rotation.x = Math.PI;
        rose.position.set(rx, 0.95, 0);
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.52, 12), metalMat);
        rod.position.set(rx, 0.69, 0);
        root.add(rose, rod);
      });
      const bodyBar = new THREE.Mesh(createBeveledBox(1.56, 0.032, 0.044, 0.008, 0.003, 0.16), metalMat);
      bodyBar.name = 'LinearPendant_BrassBar';
      bodyBar.position.y = 0.43;
      bodyBar.castShadow = true;
      const diffuser = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.50, 20), warmGlowMat);
      diffuser.name = 'LinearPendant_AlabasterDiffuser';
      diffuser.rotation.z = Math.PI / 2;
      diffuser.position.y = 0.405;
      root.add(bodyBar, diffuser);
      return root;
    }

    // --- 4. KITCHEN HEROES ---
    function buildHeroWallOven(trimMat, oakMat, darkSealMat, warmGlowMat) {
      const root = new THREE.Group();
      root.name = 'Hero_WallOven_596x565x598mm';

      const chassis = new THREE.Mesh(createBeveledBox(0.56, 0.57, 0.52, 0.006, 0.003, 0.16), darkSealMat);
      chassis.name = 'Oven_RecessedChassis';
      chassis.position.set(0, 0.295, -0.02);

      const controlPanel = new THREE.Mesh(createBeveledBox(0.596, 0.105, 0.022, 0.004, 0.002, 0.16), trimMat);
      controlPanel.name = 'Oven_BrushedControlFascia';
      controlPanel.position.set(0, 0.542, 0.252);

      [-0.22, 0.22].forEach((dx, idx) => {
        const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.024, 24), trimMat);
        dial.name = `Oven_RotaryDial_${idx + 1}`;
        dial.rotation.x = Math.PI / 2;
        dial.position.set(dx, 0.542, 0.270);
        root.add(dial);
      });

      const doorFrame = new THREE.Mesh(createBeveledBox(0.596, 0.478, 0.024, 0.005, 0.002, 0.16), darkSealMat);
      doorFrame.name = 'Oven_SmokedGlassDoor';
      doorFrame.position.set(0, 0.245, 0.252);

      const handle = new THREE.Mesh(createBeveledBox(0.52, 0.014, 0.028, 0.004, 0.002, 0.16), trimMat);
      handle.name = 'Oven_BarHandle';
      handle.position.set(0, 0.445, 0.278);

      // Visible stainless oven racks inside cavity
      [0.16, 0.28].forEach(ry => {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.005, 0.38), trimMat);
        rack.position.set(0, ry, 0.02);
        root.add(rack);
      });

      root.add(chassis, controlPanel, doorFrame, handle);
      return root;
    }

    function buildHeroInductionCooktop(trimMat, darkSealMat) {
      const root = new THREE.Group();
      root.name = 'Hero_InductionCooktop_900x520x54mm';

      const underBox = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.044, 0.48), darkSealMat);
      underBox.name = 'Cooktop_UnderBenchHousing';
      underBox.position.y = 0.022;

      const bevelFrame = new THREE.Mesh(createBeveledBox(0.90, 0.010, 0.52, 0.006, 0.002, 0.16), trimMat);
      bevelFrame.name = 'Cooktop_BrushedTrimFrame';
      bevelFrame.position.y = 0.048;

      const glassTop = new THREE.Mesh(new THREE.BoxGeometry(0.888, 0.006, 0.508), darkSealMat);
      glassTop.name = 'Cooktop_BlackCeramicGlass';
      glassTop.position.y = 0.052;

      // 5 Etched induction cooking zone rings
      const zones = [
        { x: -0.29, z: -0.11, r: 0.095 },
        { x: -0.29, z: 0.11, r: 0.080 },
        { x: 0.0, z: 0.0, r: 0.125 },
        { x: 0.29, z: -0.11, r: 0.085 },
        { x: 0.29, z: 0.11, r: 0.095 }
      ];
      zones.forEach((z, idx) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(z.r, 0.0016, 8, 36), trimMat);
        ring.name = `Cooktop_InductionZone_${idx + 1}`;
        ring.rotation.x = Math.PI / 2;
        ring.position.set(z.x, 0.0558, z.z);
        root.add(ring);
      });

      root.add(underBox, bevelFrame, glassTop);
      return root;
    }

    function buildHeroRangehood(metalMat, darkSealMat) {
      const root = new THREE.Group();
      root.name = 'Hero_CanopyRangehood_900x500x820mm';

      const canopy = new THREE.Mesh(createBeveledBox(0.90, 0.075, 0.50, 0.006, 0.003, 0.16), metalMat);
      canopy.name = 'Rangehood_MainCanopy';
      canopy.position.y = 0.0375;
      canopy.castShadow = true;

      const flue = new THREE.Mesh(createBeveledBox(0.32, 0.745, 0.28, 0.005, 0.002, 0.16), metalMat);
      flue.name = 'Rangehood_ChimneyFlue';
      flue.position.set(0, 0.075 + 0.3725, -0.09);
      flue.castShadow = true;

      [-0.27, 0.0, 0.27].forEach((fx, idx) => {
        const baffle = new THREE.Mesh(createBeveledBox(0.25, 0.012, 0.38, 0.003, 0.001, 0.16), darkSealMat);
        baffle.name = `Rangehood_BaffleFilter_${idx + 1}`;
        baffle.position.set(fx, 0.004, 0.02);
        root.add(baffle);
      });

      root.add(canopy, flue);
      return root;
    }

    function buildHeroIntegratedFridge(panelMat, brassMat, darkSealMat, tileMeters) {
      const root = new THREE.Group();
      root.name = 'Hero_IntegratedFridge_900x610x2030mm';

      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.10, 0.56), darkSealMat);
      plinth.name = 'Fridge_VentilatedPlinth';
      plinth.position.set(0, 0.05, -0.02);

      const cabinet = new THREE.Mesh(createBeveledBox(0.90, 1.93, 0.58, 0.006, 0.003, tileMeters), panelMat);
      cabinet.name = 'Fridge_CabinetBox';
      cabinet.position.set(0, 0.10 + 0.965, -0.01);
      cabinet.castShadow = true;

      // Upper French Doors
      [-0.224, 0.224].forEach((dx, idx) => {
        const door = new THREE.Mesh(createBeveledBox(0.442, 1.24, 0.022, 0.004, 0.002, tileMeters), panelMat);
        door.name = `Fridge_UpperDoor_${idx + 1}`;
        door.position.set(dx, 1.39, 0.292);
        door.castShadow = true;

        const pullX = idx === 0 ? -0.032 : 0.032;
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.42, 16), brassMat);
        handle.name = `Fridge_BrassHandle_${idx + 1}`;
        handle.position.set(pullX, 1.25, 0.318);
        root.add(door, handle);
      });

      // Lower Freezer Drawer
      const freezer = new THREE.Mesh(createBeveledBox(0.89, 0.65, 0.022, 0.004, 0.002, tileMeters), panelMat);
      freezer.name = 'Fridge_LowerFreezerDrawer';
      freezer.position.set(0, 0.435, 0.292);
      freezer.castShadow = true;

      const fHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.46, 16), brassMat);
      fHandle.name = 'Fridge_FreezerBrassHandle';
      fHandle.rotation.z = Math.PI / 2;
      fHandle.position.set(0, 0.68, 0.318);

      root.add(plinth, cabinet, freezer, fHandle);
      return root;
    }

    function buildHeroEspressoMachine(metalMat, oakMat, ceramicMat, darkSealMat) {
      const root = new THREE.Group();
      root.name = 'Hero_EspressoMachine_290x390x340mm';

      const chassis = new THREE.Mesh(createBeveledBox(0.29, 0.285, 0.33, 0.014, 0.005, 0.16), metalMat);
      chassis.name = 'Espresso_BrushedSteelChassis';
      chassis.position.set(0, 0.165, -0.02);
      chassis.castShadow = true;

      const dripTray = new THREE.Mesh(createBeveledBox(0.29, 0.034, 0.15, 0.008, 0.003, 0.16), metalMat);
      dripTray.name = 'Espresso_DripTray';
      dripTray.position.set(0, 0.034, 0.175);

      const grate = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.005, 0.12), darkSealMat);
      grate.position.set(0, 0.052, 0.175);

      const cupRail = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.0032, 8, 28, Math.PI), metalMat);
      cupRail.rotation.x = Math.PI / 2;
      cupRail.rotation.z = Math.PI;
      cupRail.position.set(0, 0.322, -0.03);

      const groupHead = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.055, 24), metalMat);
      groupHead.name = 'Espresso_SaturatedGroupHead';
      groupHead.position.set(0, 0.215, 0.162);

      const paddle = new THREE.Mesh(createBeveledBox(0.014, 0.010, 0.052, 0.004, 0.002, 0.25), oakMat);
      paddle.name = 'Espresso_OtagoAshBrewPaddle';
      paddle.position.set(0, 0.252, 0.188);

      const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.030, 0.032, 24), metalMat);
      basket.position.set(0, 0.175, 0.162);

      const pfHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.017, 0.105, 16), oakMat);
      pfHandle.name = 'Espresso_AshPortafilterHandle';
      pfHandle.rotation.x = Math.PI / 2 - 0.12;
      pfHandle.position.set(0, 0.168, 0.265);

      [-0.072, 0.072].forEach(gx => {
        const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 20), metalMat);
        bezel.rotation.x = Math.PI / 2;
        bezel.position.set(gx, 0.245, 0.148);
        const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.003, 20), ceramicMat);
        dial.rotation.x = Math.PI / 2;
        dial.position.set(gx, 0.245, 0.154);
        root.add(bezel, dial);
      });

      const steamWand = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.125, 12), metalMat);
      steamWand.name = 'Espresso_CoolTouchSteamWand';
      steamWand.position.set(-0.095, 0.118, 0.168);
      steamWand.rotation.x = 0.18;

      [-0.055, 0.055].forEach((cx, idx) => {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.022, 0.048, 20), ceramicMat);
        cup.name = `Espresso_PorcelainCup_${idx + 1}`;
        cup.position.set(cx, 0.332, -0.02);
        root.add(cup);
      });

      root.add(chassis, dripTray, grate, cupRail, groupHead, paddle, basket, pfHandle, steamWand);
      return root;
    }

    function buildHeroKettle(metalMat, ashMat, darkSealMat) {
      const root = new THREE.Group();
      root.name = 'Hero_GooseneckKettle_290x175x215mm';

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.088, 0.022, 36), darkSealMat);
      base.name = 'Kettle_HeatedPowerBase';
      base.position.y = 0.011;

      const kettlePts = [
        new THREE.Vector2(0, 0.022), new THREE.Vector2(0.074, 0.022), new THREE.Vector2(0.078, 0.034),
        new THREE.Vector2(0.054, 0.168), new THREE.Vector2(0.050, 0.178), new THREE.Vector2(0, 0.178)
      ];
      const bodyGeo = new THREE.LatheGeometry(kettlePts, 40);
      applyPhysicalUVScale(bodyGeo, 0.16);
      const body = new THREE.Mesh(bodyGeo, metalMat);
      body.name = 'Kettle_PVDStainlessVessel';
      body.castShadow = true;

      const lidKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.009, 0.024, 18), ashMat);
      lidKnob.position.y = 0.190;

      const spoutCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.055, 0.048, 0),
        new THREE.Vector3(0.095, 0.095, 0),
        new THREE.Vector3(0.105, 0.168, 0),
        new THREE.Vector3(0.128, 0.188, 0)
      ]);
      const spout = new THREE.Mesh(new THREE.TubeGeometry(spoutCurve, 28, 0.0052, 14, false), metalMat);
      spout.name = 'Kettle_GooseneckSpout';

      const handleCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.052, 0.155, 0),
        new THREE.Vector3(-0.108, 0.148, 0),
        new THREE.Vector3(-0.112, 0.062, 0),
        new THREE.Vector3(-0.074, 0.044, 0)
      ]);
      const handle = new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 24, 0.010, 14, false), ashMat);
      handle.name = 'Kettle_OtagoAshHandle';

      root.add(base, body, lidKnob, spout, handle);
      return root;
    }

    function buildHeroToaster(metalMat, ashMat, darkSealMat) {
      const root = new THREE.Group();
      root.name = 'Hero_ArtisanToaster_295x195x205mm';

      const body = new THREE.Mesh(createBeveledBox(0.275, 0.185, 0.185, 0.028, 0.008, 0.16), metalMat);
      body.name = 'Toaster_BrushedSteelBody';
      body.position.y = 0.102;
      body.castShadow = true;

      [-0.138, 0.138].forEach((ex, idx) => {
        const cheek = new THREE.Mesh(createBeveledBox(0.016, 0.175, 0.175, 0.024, 0.004, 0.35), ashMat);
        cheek.name = `Toaster_AshEndPanel_${idx + 1}`;
        cheek.position.set(ex, 0.102, 0);
        root.add(cheek);
      });

      [-0.038, 0.038].forEach((sz, idx) => {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.185, 0.012, 0.036), darkSealMat);
        slot.name = `Toaster_BreadSlot_${idx + 1}`;
        slot.position.set(0, 0.192, sz);
        root.add(slot);
      });

      const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.018, 22), metalMat);
      dial.name = 'Toaster_BrowningDial';
      dial.rotation.z = Math.PI / 2;
      dial.position.set(0.152, 0.068, 0.042);

      const lever = new THREE.Mesh(createBeveledBox(0.028, 0.014, 0.032, 0.004, 0.002, 0.35), ashMat);
      lever.name = 'Toaster_AshCarriageLever';
      lever.position.set(0.156, 0.145, -0.02);

      root.add(body, dial, lever);
      return root;
    }

    function buildHeroKitchenTap(metalMat, darkSealMat, isOptimised = false) {
      const root = new THREE.Group();
      root.name = 'Hero_GooseneckMixer_245x54x432mm';
      const radialSegs = isOptimised ? 20 : 32;

      const escutcheon = createEscutcheonPlate(0.027, 0.008, metalMat, darkSealMat);
      escutcheon.name = 'Mixer_DeckEscutcheon';
      const brassHardwareMat = new THREE.MeshStandardMaterial({ color: 0xB89758, roughness: 0.35, metalness: 0.88 });
      const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.068, 20), brassHardwareMat);
      shank.position.y = -0.034;
      const lockNut = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.012, 6), brassHardwareMat);
      lockNut.position.y = -0.044;

      const bodyH = 0.155;
      const bodyGeo = new THREE.CylinderGeometry(0.022, 0.022, bodyH, radialSegs);
      applyPhysicalUVScale(bodyGeo, 0.16);
      const body = new THREE.Mesh(bodyGeo, metalMat);
      body.name = 'Mixer_CylindricalBody';
      body.position.y = 0.008 + bodyH * 0.5;
      body.castShadow = true;

      const swivelY = 0.008 + bodyH;
      const neckCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.0215, 0.018, radialSegs), metalMat);
      neckCollar.position.y = swivelY + 0.009;

      const reach = 0.208;
      const neckPts = buildTrueGooseneckPoints(swivelY + 0.016, 0.318, reach * 0.5, 0.268);
      const spoutGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(neckPts), 44, 0.012, radialSegs, false);
      applyPhysicalUVScale(spoutGeo, 0.16);
      const spout = new THREE.Mesh(spoutGeo, metalMat);
      spout.name = 'Mixer_180GooseneckSpout';
      spout.castShadow = true;

      const wand = createAeratorNozzle(0.0148, 0.062, metalMat, darkSealMat);
      wand.name = 'Mixer_PullOutSprayWand';
      wand.position.set(0, 0.268, reach);

      const lever = createKnurledMixerLever(metalMat, darkSealMat, 1.0);
      lever.name = 'Mixer_SidePinLever';
      lever.position.set(0.022, 0.088, 0);

      root.add(escutcheon, shank, lockNut, body, neckCollar, spout, wand, lever);
      return root;
    }

    function buildHeroBarStool(timberMat, leatherMat, brassMat, tileMeters) {
      const root = new THREE.Group();
      root.name = 'Hero_CounterBarStool_450x460x780mm';

      const seatH = 0.650;
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
        const botR = 0.205, topR = 0.145;
        const pts = [
          new THREE.Vector3(Math.cos(ang) * botR, 0, Math.sin(ang) * botR),
          new THREE.Vector3(Math.cos(ang) * topR, seatH - 0.02, Math.sin(ang) * topR)
        ];
        const legGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.015, 12, false);
        applyPhysicalUVScale(legGeo, tileMeters);
        const leg = new THREE.Mesh(legGeo, timberMat);
        leg.name = `BarStool_SplayedLeg_${i + 1}`;
        leg.castShadow = true;
        root.add(leg);
      }

      const footRing = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.008, 12, 36), brassMat);
      footRing.name = 'BarStool_BrassFootrestRing';
      footRing.rotation.x = Math.PI / 2;
      footRing.position.y = 0.21;

      const seatBase = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.024, 32), timberMat);
      seatBase.position.y = seatH - 0.012;

      const seatPad = createTailoredCushion(0.37, 0.042, 0.37, leatherMat, leatherMat, {
        crownTop: 0.012, crownBottom: 0.002, cornerPinch: 0.016, segX: 18, segZ: 18, tileMeters: 0.35, includeBottomPiping: false
      });
      seatPad.name = 'BarStool_LeatherSeatCushion';
      seatPad.position.y = seatH + 0.018;

      const backCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.18, seatH + 0.09, -0.05),
        new THREE.Vector3(-0.14, seatH + 0.11, -0.16),
        new THREE.Vector3(0.0, seatH + 0.12, -0.19),
        new THREE.Vector3(0.14, seatH + 0.11, -0.16),
        new THREE.Vector3(0.18, seatH + 0.09, -0.05)
      ]);
      const lowBack = new THREE.Mesh(new THREE.TubeGeometry(backCurve, 24, 0.016, 12, false), timberMat);
      lowBack.name = 'BarStool_LowLumbarBackrest';

      root.add(footRing, seatBase, seatPad, lowBack);
      return root;
    }

    // --- 5. BATHROOM HEROES ---
    function buildHeroBathroomVanity(timberMat, marbleMat, brassMat, ceramicMat, darkSealMat, tileMeters) {
      const root = new THREE.Group();
      root.name = 'Hero_FloatingVanity_1200x460x540mm';

      const car = new THREE.Mesh(createBeveledBox(1.20, 0.48, 0.46, 0.012, 0.005, tileMeters), timberMat);
      car.name = 'Vanity_FlutedTimberCabinet';
      car.position.y = 0.24;
      car.castShadow = true;

      for (let i = 0; i < 32; i++) {
        const fx = -0.56 + (i / 31) * 1.12;
        const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.45, 10), timberMat);
        rib.position.set(fx, 0.24, 0.232);
        root.add(rib);
      }

      const top = new THREE.Mesh(createBeveledBox(1.22, 0.040, 0.48, 0.008, 0.004, 0.55), marbleMat);
      top.name = 'Vanity_CalacattaMarbleTop';
      top.position.y = 0.50;
      top.castShadow = true;

      const pts = [
        new THREE.Vector2(0.0, 0.52), new THREE.Vector2(0.155, 0.52), new THREE.Vector2(0.192, 0.585),
        new THREE.Vector2(0.195, 0.655), new THREE.Vector2(0.184, 0.655), new THREE.Vector2(0.178, 0.588),
        new THREE.Vector2(0.132, 0.542), new THREE.Vector2(0.0, 0.538)
      ];
      const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), ceramicMat);
      bowl.name = 'Vanity_ReededVesselBasin';
      bowl.position.set(-0.18, 0, 0.02);
      bowl.castShadow = true;

      const tapStem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.019, 0.24, 24), brassMat);
      tapStem.name = 'Vanity_TallBrassVesselMixer';
      tapStem.position.set(0.08, 0.64, -0.06);

      const tapSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.16, 18), brassMat);
      tapSpout.rotation.z = Math.PI / 2 - 0.18;
      tapSpout.position.set(0.0, 0.74, -0.06);

      root.add(car, top, bowl, tapStem, tapSpout);
      return root;
    }

    function buildHeroToilet(ceramicMat, brassMat) {
      const root = new THREE.Group();
      root.name = 'Hero_ArchitecturalToilet_365x560x420mm';

      const shroud = new THREE.Mesh(createBeveledBox(0.355, 0.39, 0.34, 0.045, 0.012, 0.45), ceramicMat);
      shroud.name = 'Toilet_BackToWallShroud';
      shroud.position.set(0, 0.195, -0.10);
      shroud.castShadow = true;

      const bowlPts = [
        new THREE.Vector2(0.0, 0.04), new THREE.Vector2(0.12, 0.14), new THREE.Vector2(0.175, 0.30),
        new THREE.Vector2(0.182, 0.395), new THREE.Vector2(0.155, 0.395), new THREE.Vector2(0.135, 0.25),
        new THREE.Vector2(0.0, 0.20)
      ];
      const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlPts, 44), ceramicMat);
      bowl.name = 'Toilet_RimlessCeramicBowl';
      bowl.scale.set(1.0, 1.0, 1.38);
      bowl.position.set(0, 0, 0.04);
      bowl.castShadow = true;

      const seat = new THREE.Mesh(createBeveledBox(0.358, 0.018, 0.45, 0.16, 0.006, 0.45), ceramicMat);
      seat.name = 'Toilet_SlimlineSoftCloseSeat';
      seat.position.set(0, 0.405, 0.03);

      const flushPlate = new THREE.Mesh(createBeveledBox(0.22, 0.14, 0.008, 0.006, 0.002, 0.16), brassMat);
      flushPlate.name = 'Toilet_BrassDualFlushPlate';
      flushPlate.position.set(0, 0.88, -0.26);

      root.add(shroud, bowl, seat, flushPlate);
      return root;
    }

    function buildHeroShowerScreenFittings(metalMat, glassMat, darkSealMat) {
      const root = new THREE.Group();
      root.name = 'Hero_ShowerScreenAndFittings_1000x420x2050mm';

      // 10mm Low-iron toughened glass walk-in panel
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.98, 2.02, 0.010), glassMat);
      glass.name = 'Shower_ToughenedGlassPanel';
      glass.position.set(0.01, 1.02, 0);

      // Wall & floor slimline U-channels
      const wallChannel = new THREE.Mesh(new THREE.BoxGeometry(0.018, 2.04, 0.022), metalMat);
      wallChannel.name = 'Shower_WallChannel';
      wallChannel.position.set(-0.49, 1.02, 0);

      const floorChannel = new THREE.Mesh(new THREE.BoxGeometry(1.00, 0.016, 0.022), metalMat);
      floorChannel.name = 'Shower_FloorChannel';
      floorChannel.position.set(0, 0.008, 0);

      // Overhead stabiliser arm
      const stabBar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.48, 16), metalMat);
      stabBar.name = 'Shower_OverheadStabiliserBar';
      stabBar.rotation.x = Math.PI / 2;
      stabBar.position.set(0.46, 2.01, -0.24);

      // 250mm Overhead Rain Shower & Riser Rail behind glass
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.72, 20), metalMat);
      rail.name = 'Shower_VerticalRiserRail';
      rail.position.set(-0.18, 1.38, -0.40);

      const armPts = [new THREE.Vector3(-0.18, 1.74, -0.40), new THREE.Vector3(-0.18, 1.92, -0.40), new THREE.Vector3(-0.18, 1.92, -0.14)];
      const arm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(armPts), 24, 0.010, 16, false), metalMat);
      const rainDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.008, 44), metalMat);
      rainDisc.name = 'Shower_250mmRainHead';
      rainDisc.position.set(-0.18, 1.90, -0.14);

      const mixerPlate = new THREE.Mesh(createBeveledBox(0.11, 0.17, 0.008, 0.018, 0.003, 0.16), metalMat);
      mixerPlate.name = 'Shower_ConcealedMixerPlate';
      mixerPlate.position.set(-0.18, 1.12, -0.45);

      root.add(glass, wallChannel, floorChannel, stabBar, rail, arm, rainDisc, mixerPlate);
      return root;
    }

    function buildHeroTowelRail(metalMat, towelMat, darkSealMat) {
      const root = new THREE.Group();
      root.name = 'Hero_HeatedTowelLadder_550x115x900mm';

      [-0.255, 0.255].forEach((vx, idx) => {
        const upright = new THREE.Mesh(applyPhysicalUVScale(new THREE.CylinderGeometry(0.014, 0.014, 0.90, 20), 0.16), metalMat);
        upright.name = `TowelLadder_VerticalColumn_${idx + 1}`;
        upright.position.set(vx, 0.45, 0.085);
        upright.castShadow = true;
        root.add(upright);

        [0.10, 0.80].forEach(sy => {
          const esc = createEscutcheonPlate(0.024, 0.008, metalMat, darkSealMat);
          esc.rotation.x = Math.PI / 2;
          esc.position.set(vx, sy, 0);
          const spigot = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.085, 16), metalMat);
          spigot.rotation.x = Math.PI / 2;
          spigot.position.set(vx, sy, 0.0425);
          root.add(esc, spigot);
        });
      });

      [0.14, 0.30, 0.46, 0.62, 0.78].forEach((by, idx) => {
        const bar = new THREE.Mesh(applyPhysicalUVScale(new THREE.CylinderGeometry(0.009, 0.009, 0.51, 20), 0.16), metalMat);
        bar.name = `TowelLadder_HeatedBar_${idx + 1}`;
        bar.rotation.z = Math.PI / 2;
        bar.position.set(0, by, 0.085);
        bar.castShadow = true;
        root.add(bar);
      });

      // Draped raw NZ flax bath towel hanging over bar 4
      const towel = createThickDrapedCloth(0.38, 0.54, 18, 22, 0.012, 0.02, 0.008, towelMat, 0.22);
      towel.name = 'TowelLadder_DrapedFlaxTowel';
      towel.rotation.x = Math.PI / 2;
      towel.position.set(-0.04, 0.36, 0.098);
      root.add(towel);

      return root;
    }

    // --- 6. OUTDOOR HEROES ---
    function buildHeroOutdoorDeckFurniture(kwilaMat, cushionMat, tileMeters) {
      const root = new THREE.Group();
      root.name = 'Hero_OutdoorDeckSuite_2150x1450x720mm';
      const pipingMat = cushionMat.clone();

      const sofaGrp = new THREE.Group();
      sofaGrp.name = 'Outdoor_KwilaSlattedSofa';
      [[-0.96, -0.36], [0.96, -0.36], [-0.96, 0.36], [0.96, 0.36]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(createBeveledBox(0.055, 0.64, 0.055, 0.006, 0.003, tileMeters), kwilaMat);
        leg.position.set(lx, 0.32, lz - 0.26);
        leg.castShadow = true;
        sofaGrp.add(leg);
      });

      for (let s = 0; s < 5; s++) {
        const slat = new THREE.Mesh(createBeveledBox(1.98, 0.024, 0.135, 0.004, 0.002, tileMeters), kwilaMat);
        slat.position.set(0, 0.26, -0.56 + s * 0.15);
        slat.castShadow = true;
        sofaGrp.add(slat);
      }

      [-0.88, 0.0, 0.88].forEach((cx, idx) => {
        const sc = createTailoredCushion(0.62, 0.13, 0.68, cushionMat, pipingMat, {
          crownTop: 0.016, seed: idx + 1, segX: 18, segZ: 18, tileMeters: 0.22
        });
        sc.position.set(cx, 0.34, -0.24);
        const bc = createTailoredCushion(0.62, 0.15, 0.40, cushionMat, pipingMat, {
          crownTop: 0.018, seed: idx + 4, segX: 18, segZ: 14, tileMeters: 0.22
        });
        bc.rotation.x = Math.PI * 0.5 - 0.18;
        bc.position.set(cx, 0.52, -0.50);
        sofaGrp.add(sc, bc);
      });

      const tableGrp = new THREE.Group();
      tableGrp.name = 'Outdoor_KwilaSlattedCoffeeTable';
      for (let s = 0; s < 4; s++) {
        const slat = new THREE.Mesh(createBeveledBox(1.16, 0.026, 0.145, 0.004, 0.002, tileMeters), kwilaMat);
        slat.position.set(0, 0.32, 0.36 + s * 0.16);
        slat.castShadow = true;
        tableGrp.add(slat);
      }
      [[-0.50, 0.38], [0.50, 0.38], [-0.50, 0.82], [0.50, 0.82]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(createBeveledBox(0.05, 0.31, 0.05, 0.005, 0.002, tileMeters), kwilaMat);
        leg.position.set(lx, 0.155, lz);
        tableGrp.add(leg);
      });

      root.add(sofaGrp, tableGrp);
      return root;
    }

    function buildHeroOutdoorPlanters(planterMat, barkMat, leafMat, tileMeters) {
      const root = new THREE.Group();
      root.name = 'Hero_ArchitecturalPlanterTrio_1180x540x680mm';

      const specs = [
        { x: -0.32, z: -0.06, rTop: 0.24, rBot: 0.19, h: 0.68 },
        { x: 0.16, z: 0.08, rTop: 0.21, rBot: 0.17, h: 0.48 },
        { x: 0.46, z: -0.10, rTop: 0.17, rBot: 0.14, h: 0.36 }
      ];

      specs.forEach((p, idx) => {
        const pts = [
          new THREE.Vector2(0, 0), new THREE.Vector2(p.rBot, 0), new THREE.Vector2(p.rTop, p.h),
          new THREE.Vector2(p.rTop - 0.024, p.h), new THREE.Vector2(p.rTop - 0.024, p.h - 0.08),
          new THREE.Vector2(0, p.h - 0.08)
        ];
        const potGeo = new THREE.LatheGeometry(pts, 36);
        applyPhysicalUVScale(potGeo, tileMeters);
        const pot = new THREE.Mesh(potGeo, planterMat);
        pot.name = `Outdoor_PlanterVessel_${idx + 1}`;
        pot.position.set(p.x, 0, p.z);
        pot.castShadow = true;

        const soil = new THREE.Mesh(new THREE.CylinderGeometry(p.rTop - 0.026, p.rTop - 0.026, 0.02, 24), barkMat);
        soil.position.set(p.x, p.h - 0.06, p.z);
        root.add(pot, soil);
      });

      return root;
    }

    function buildHeroOutdoorBBQ(steelMat, ashMat, darkSealMat) {
      const root = new THREE.Group();
      root.name = 'Hero_OutdoorHoodedBBQ_1480x620x1180mm';

      const cabinet = new THREE.Mesh(createBeveledBox(0.84, 0.82, 0.56, 0.008, 0.004, 0.16), steelMat);
      cabinet.name = 'BBQ_StainlessBaseCabinet';
      cabinet.position.y = 0.44;
      cabinet.castShadow = true;

      [-0.36, 0.36].forEach(cx => {
        [-0.22, 0.22].forEach(cz => {
          const caster = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.026, 16), darkSealMat);
          caster.rotation.z = Math.PI / 2;
          caster.position.set(cx, 0.028, cz);
          root.add(caster);
        });
      });

      const firebox = new THREE.Mesh(createBeveledBox(0.86, 0.12, 0.58, 0.008, 0.003, 0.16), steelMat);
      firebox.name = 'BBQ_FireboxAndControlFascia';
      firebox.position.y = 0.91;

      [-0.24, -0.08, 0.08, 0.24].forEach((kx, idx) => {
        const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.024, 20), steelMat);
        knob.name = `BBQ_BurnerControlKnob_${idx + 1}`;
        knob.rotation.x = Math.PI / 2;
        knob.position.set(kx, 0.91, 0.302);
        root.add(knob);
      });

      const hood = new THREE.Mesh(createBeveledBox(0.84, 0.24, 0.52, 0.045, 0.008, 0.16), steelMat);
      hood.name = 'BBQ_RollTopStainlessHood';
      hood.position.set(0, 1.07, -0.02);
      hood.castShadow = true;

      const hoodHandle = new THREE.Mesh(createBeveledBox(0.72, 0.016, 0.026, 0.004, 0.002, 0.16), steelMat);
      hoodHandle.position.set(0, 1.00, 0.265);

      const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.014, 24), steelMat);
      gauge.rotation.x = Math.PI / 2;
      gauge.position.set(0, 1.11, 0.245);

      [-0.58, 0.58].forEach((sx, idx) => {
        const shelf = new THREE.Mesh(createBeveledBox(0.30, 0.028, 0.52, 0.008, 0.003, 0.35), ashMat);
        shelf.name = `BBQ_OtagoAshSideShelf_${idx + 1}`;
        shelf.position.set(sx, 0.91, 0);
        shelf.castShadow = true;
        root.add(shelf);
      });

      root.add(cabinet, firebox, hood, hoodHandle, gauge);
      return root;
    }

    // --- 7. NATIVE PLANTS & ELECTRIC CAR HEROES ---
    function buildHeroNikauPalm(barkMat, stoneMat, isOptimised = false) {
      const root = new THREE.Group();
      root.name = 'Hero_NikauPalm_1480x1480x2620mm';
      root.add(createNaturalRootMound(0.46, 0.068, barkMat, stoneMat));

      const trunkH = 1.32;
      const trunkPts = [];
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        const y = 0.065 + t * trunkH;
        const baseR = 0.122 * (1 - t * 0.28) + Math.pow(1 - t, 4) * 0.024;
        const scarWave = Math.pow(Math.max(0, Math.sin(t * 16 * Math.PI)), 6) * 0.0065;
        trunkPts.push(new THREE.Vector2(baseR + scarWave, y));
      }
      const trunkGeo = new THREE.LatheGeometry(trunkPts, 22);
      applyPhysicalUVScale(trunkGeo, 0.35);
      const trunkMesh = new THREE.Mesh(trunkGeo, barkMat);
      trunkMesh.name = 'NikauPalm_RingedTrunk';
      trunkMesh.castShadow = true;
      root.add(trunkMesh);

      const crownMat = new THREE.MeshStandardMaterial({ color: 0x3D5B36, roughness: 0.46 });
      const crownPts = [new THREE.Vector2(0.088, 0.0), new THREE.Vector2(0.118, 0.13), new THREE.Vector2(0.106, 0.30), new THREE.Vector2(0.072, 0.42)];
      const crown = new THREE.Mesh(new THREE.LatheGeometry(crownPts, 22), crownMat);
      crown.name = 'NikauPalm_Crownshaft';
      crown.position.y = 0.065 + trunkH - 0.02;
      const topY = 0.065 + trunkH + 0.38;
      const spear = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.58, 8), crownMat);
      spear.position.y = topY + 0.27;
      root.add(crown, spear);

      const leafletGeo = createBotanicalBladeGeometry(0.34, 0.025, 0.56, 0.05);
      const leafMaps = generatePBRMaps('botanical', '#466441', '#2B4227', 256);
      const leafMat = new THREE.MeshStandardMaterial({
        map: leafMaps.albedoTex, normalMap: leafMaps.normalTex, normalScale: new THREE.Vector2(0.7, 0.7),
        roughness: 0.46, metalness: 0.0, vertexColors: true, side: THREE.DoubleSide
      });

      const frondCount = isOptimised ? 18 : 24;
      const pairsPerFrond = isOptimised ? 13 : 18;
      const totalLeaflets = frondCount * pairsPerFrond * 2;
      const instLeaflets = new THREE.InstancedMesh(leafletGeo, leafMat, totalLeaflets);
      instLeaflets.name = 'NikauPalm_InstancedLeaflets';
      instLeaflets.castShadow = true;

      const dummy = new THREE.Object3D();
      const tintColor = new THREE.Color();
      let idx = 0;

      for (let f = 0; f < frondCount; f++) {
        const tier = f < frondCount * 0.42 ? 0 : (f < frondCount * 0.75 ? 1 : 2);
        const az = (f * 2.39996) + tier * 0.28 + (hash2D(f, 3) - 0.5) * 0.14;
        const frondLen = (tier === 0 ? 1.18 : (tier === 1 ? 1.05 : 0.92)) * (0.92 + hash2D(f, 5) * 0.16);
        const tilt = tier === 0 ? 0.38 : (tier === 1 ? 0.66 : 0.98);

        const rachisPts = [
          new THREE.Vector3(0, topY, 0),
          new THREE.Vector3(Math.cos(az) * frondLen * 0.48, topY + frondLen * (0.50 - tier * 0.14), Math.sin(az) * frondLen * 0.48),
          new THREE.Vector3(Math.cos(az) * frondLen, topY + frondLen * (0.34 - tier * 0.28), Math.sin(az) * frondLen)
        ];
        const curve = new THREE.CatmullRomCurve3(rachisPts);
        root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.007, 6, false), crownMat));

        for (let l = 1; l <= pairsPerFrond; l++) {
          const t = l / (pairsPerFrond + 1);
          const pt = curve.getPointAt(t);
          const leafletScale = Math.sin(t * Math.PI * 0.90 + 0.12);

          [-1, 1].forEach((side, sIdx) => {
            if (idx >= totalLeaflets) return;
            const jitter = hash2D(f * 50 + l, sIdx + 7);
            dummy.position.copy(pt);
            dummy.rotation.set((jitter - 0.5) * 0.16, -az + side * (1.12 + (jitter - 0.5) * 0.14), tilt + 0.42 + t * 0.22);
            dummy.scale.set(0.85 + jitter * 0.25, (0.55 + leafletScale * 0.68) * (0.9 + jitter * 0.2), 0.9 + jitter * 0.2);
            dummy.updateMatrix();
            instLeaflets.setMatrixAt(idx, dummy.matrix);

            tintColor.setHSL(0.25 - tier * 0.015 + (jitter - 0.5) * 0.03, 0.34 + jitter * 0.10, (tier === 0 ? 0.54 : 0.44) + (jitter - 0.5) * 0.12);
            instLeaflets.setColorAt(idx, tintColor);
            idx++;
          });
        }
      }
      instLeaflets.count = idx;
      if (instLeaflets.instanceColor) instLeaflets.instanceColor.needsUpdate = true;
      root.add(instLeaflets);
      return root;
    }

    function buildHeroPohutukawa(leafMat, barkMat, stoneMat) {
      const grp = new THREE.Group();
      grp.name = 'Hero_PohutukawaTree_1500x1400x1680mm';
      grp.add(createNaturalRootMound(0.54, 0.075, barkMat, stoneMat));

      const leafGeo = new THREE.SphereGeometry(0.032, 6, 4);
      leafGeo.scale(1.4, 0.18, 0.65);
      const instLeaves = new THREE.InstancedMesh(leafGeo, leafMat, 1800);
      instLeaves.name = 'Pohutukawa_InstancedLeaves';

      const flowerMat = new THREE.MeshStandardMaterial({ color: 0xA82026, emissive: 0x3A080A, roughness: 0.45 });
      const instFlowers = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.042, 4), flowerMat, 280);
      instFlowers.name = 'Pohutukawa_InstancedCrimsonFlowers';

      const dummy = new THREE.Object3D();
      let lIdx = 0, fIdx = 0;

      for (let b = 0; b < 8; b++) {
        const az = (b / 8) * Math.PI * 2 + hash2D(b, 1) * 0.4;
        const spread = 0.56 + hash2D(b, 2) * 0.30;
        const topH = 1.05 + hash2D(b, 3) * 0.42;
        const pts = [new THREE.Vector3(0, 0.06, 0), new THREE.Vector3(Math.cos(az) * 0.16, 0.45, Math.sin(az) * 0.16), new THREE.Vector3(Math.cos(az) * spread, topH, Math.sin(az) * spread)];
        grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.032, 8, false), barkMat));
        const tip = pts[2];
        for (let k = 0; k < 210 && lIdx < 1800; k++) {
          const r1 = hash2D(b * 300 + k, 4), r2 = hash2D(b * 300 + k, 5), r3 = hash2D(b * 300 + k, 6);
          const theta = r1 * Math.PI * 2, rad = Math.pow(r2, 0.45) * 0.34;
          dummy.position.set(tip.x + Math.cos(theta) * rad, tip.y + (r3 - 0.35) * 0.24, tip.z + Math.sin(theta) * rad);
          dummy.rotation.set(r3 * 2.4, theta, r1 * 2.4);
          dummy.scale.setScalar(0.75 + r2 * 0.65);
          dummy.updateMatrix();
          instLeaves.setMatrixAt(lIdx++, dummy.matrix);
        }
        for (let s = 0; s < 30 && fIdx < 280; s++) {
          const sa = (s / 30) * Math.PI * 2;
          dummy.position.set(tip.x + Math.cos(sa) * 0.14, tip.y + 0.12, tip.z + Math.sin(sa) * 0.14);
          dummy.rotation.set(Math.sin(sa) * 0.65, sa, -Math.cos(sa) * 0.65);
          dummy.scale.setScalar(1.0);
          dummy.updateMatrix();
          instFlowers.setMatrixAt(fIdx++, dummy.matrix);
        }
      }
      instLeaves.count = lIdx;
      instFlowers.count = fIdx;
      grp.add(instLeaves, instFlowers);
      return grp;
    }

    function buildHeroSilverFern(leafMat, barkMat, stoneMat) {
      const grp = new THREE.Group();
      grp.name = 'Hero_SilverFern_1300x1300x1180mm';
      grp.add(createNaturalRootMound(0.44, 0.065, barkMat, stoneMat));
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.105, 0.56, 16), barkMat);
      trunk.name = 'SilverFern_FibrousTrunk';
      trunk.position.y = 0.065 + 0.28;
      grp.add(trunk);

      const frondGeo = createBotanicalBladeGeometry(0.95, 0.18, 0.92, 0.06);
      const inst = new THREE.InstancedMesh(frondGeo, leafMat, 18);
      inst.name = 'SilverFern_InstancedFronds';
      const dummy = new THREE.Object3D();
      for (let i = 0; i < 18; i++) {
        const tier = i < 10 ? 0 : 1;
        dummy.position.set(0, 0.61 + tier * 0.04, 0);
        dummy.rotation.set(0.35 + (1 - tier) * 0.42, -(i * 2.39996 + tier * 0.4), 0);
        dummy.scale.setScalar(tier === 0 ? 1.05 : 0.82);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      grp.add(inst);
      return grp;
    }

    // HERO CAR: Aotearoa Minimalist Electric SUV / Shooting Brake (1920 × 4680 × 1580 mm · RHD NZ Spec)
    function buildHeroElectricCar(bodyMat, alloyMat, darkSealMat, glassMat, tileMeters) {
      const root = new THREE.Group();
      root.name = 'Hero_ElectricSUV_RHD_1920x4680x1580mm';

      const ledHeadMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0xE8F3FF, emissiveIntensity: 1.8, roughness: 0.1 });
      const ledTailMat = new THREE.MeshStandardMaterial({ color: 0xFF3333, emissive: 0xCC1111, emissiveIntensity: 1.6, roughness: 0.15 });
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x1D1E20, roughness: 0.86, metalness: 0.05 });

      // 1. Sculpted Aerodynamic Body Silhouette (Extruded in X-Z then rotated to Y-Z)
      const sideProfile = new THREE.Shape();
      sideProfile.moveTo(-2.32, 0.34); // Front chin
      sideProfile.quadraticCurveTo(-2.34, 0.72, -2.05, 0.84); // Front nose & bonnet edge
      sideProfile.lineTo(-1.12, 0.96); // Base of windscreen
      sideProfile.quadraticCurveTo(-0.45, 1.54, 0.18, 1.56); // Roofline apex
      sideProfile.quadraticCurveTo(1.18, 1.54, 2.08, 1.24); // Fastback rear glass
      sideProfile.quadraticCurveTo(2.32, 1.04, 2.30, 0.44); // Rear tailgate
      sideProfile.lineTo(1.88, 0.28); // Rear diffuser
      sideProfile.lineTo(-1.90, 0.28); // Flat EV battery undertray
      sideProfile.closePath();

      const bodyGeo = new THREE.ExtrudeGeometry(sideProfile, {
        depth: 1.76,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.08,
        bevelThickness: 0.08
      });
      bodyGeo.translate(0, 0, -0.88);
      bodyGeo.rotateY(Math.PI / 2); // Align vehicle length along Z axis (-Z = Front, +Z = Rear)
      bodyGeo.computeVertexNormals();
      applyPhysicalUVScale(bodyGeo, tileMeters);

      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.name = 'Car_AerodynamicBodyShell';
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      root.add(bodyMesh);

      // 2. Gloss Black Lower Cladding Skirt & Front/Rear Diffusers
      const skirt = new THREE.Mesh(createBeveledBox(1.88, 0.14, 4.54, 0.04, 0.01, 0.2), darkSealMat);
      skirt.name = 'Car_LowerBatterySkirt';
      skirt.position.set(0, 0.30, 0);
      root.add(skirt);

      // 3. Smoked Panoramic Glass Cabin & Windscreen
      const cabinGlass = new THREE.Mesh(createBeveledBox(1.52, 0.52, 2.55, 0.12, 0.02, 0.2), glassMat);
      cabinGlass.name = 'Car_PanoramicCabinGlass';
      cabinGlass.position.set(0, 1.25, 0.25);
      root.add(cabinGlass);

      // 4. Right-Hand-Drive (NZ Spec) Cockpit Interior (Steering Wheel & Twin Seats visible through glass)
      const interiorGrp = new THREE.Group();
      interiorGrp.name = 'Car_RHD_NZ_Cockpit';
      [-0.42, 0.42].forEach((sx, idx) => {
        const seat = new THREE.Mesh(createBeveledBox(0.46, 0.62, 0.50, 0.06, 0.01, 0.2), darkSealMat);
        seat.name = idx === 0 ? 'Car_RHD_DriverSeat' : 'Car_PassengerSeat';
        seat.position.set(sx, 0.86, -0.10);
        interiorGrp.add(seat);
      });
      // Right-hand side steering wheel (-X in our -Z forward orientation = Driver's Right)
      const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.016, 10, 28), darkSealMat);
      wheelRim.name = 'Car_RHD_SteeringWheel';
      wheelRim.rotation.x = -0.35;
      wheelRim.position.set(-0.42, 1.04, -0.58);
      interiorGrp.add(wheelRim);
      root.add(interiorGrp);

      // 5. Full-Width LED Front Light Bar & Rear Crimson Tail Light Bar
      const frontLed = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.032, 0.04), ledHeadMat);
      frontLed.name = 'Car_FrontLEDLightBar';
      frontLed.position.set(0, 0.78, -2.35);

      const rearLed = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.036, 0.04), ledTailMat);
      rearLed.name = 'Car_RearLEDLightBar';
      rearLed.position.set(0, 1.02, 2.31);
      root.add(frontLed, rearLed);

      // 6. Side Mirrors & Flush Door Handles
      [-0.98, 0.98].forEach((mx, idx) => {
        const mirror = new THREE.Mesh(createBeveledBox(0.16, 0.085, 0.14, 0.025, 0.008, 0.2), bodyMat);
        mirror.name = `Car_SideMirror_${idx + 1}`;
        mirror.position.set(mx, 1.06, -0.68);
        root.add(mirror);
      });

      // 7. Four 21" Multi-Spoke Aero Alloy Wheels, Tires & Brake Calipers (Grounded at Y = 0)
      const wheelRadius = 0.375;
      const wheelCoords = [
        [-0.84, -1.44], [0.84, -1.44],
        [-0.84, 1.44],  [0.84, 1.44]
      ];
      wheelCoords.forEach(([wx, wz], idx) => {
        const wGrp = new THREE.Group();
        wGrp.name = `Car_WheelAssembly_${idx + 1}`;
        wGrp.position.set(wx, wheelRadius, wz);

        const tire = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius - 0.065, 0.068, 16, 36), tireMat);
        tire.rotation.y = Math.PI / 2;
        tire.castShadow = true;

        const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius - 0.11, wheelRadius - 0.11, 0.22, 28), alloyMat);
        rim.rotation.z = Math.PI / 2;

        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.23, 18), darkSealMat);
        hub.rotation.z = Math.PI / 2;

        wGrp.add(tire, rim, hub);
        root.add(wGrp);
      });

      return root;
    }

    // =========================================================================
    // 7. UNIFIED HERO ASSET DISPATCHER
    // =========================================================================
    function createCalibratedMaterial(pbrType, swatch, maps) {
      const isMetal = pbrType === 'abi_pvd';
      const isLacquer = pbrType === 'lacquer';
      const isLeather = pbrType === 'leather';
      const isMarble = pbrType === 'marble';
      const isTextile = pbrType === 'linen' || pbrType === 'boucle';
      const isBotanical = pbrType === 'botanical';

      return new THREE.MeshPhysicalMaterial({
        map: maps.albedoTex,
        normalMap: maps.normalTex,
        normalScale: new THREE.Vector2(
          isLacquer ? 0.30 : (isMarble ? 0.55 : (isMetal ? 0.45 : (isLeather ? 0.95 : 1.15))),
          isLacquer ? 0.30 : (isMarble ? 0.55 : (isMetal ? 0.45 : (isLeather ? 0.95 : 1.15)))
        ),
        roughnessMap: maps.ormTex || maps.roughTex,
        roughness: 1.0,
        metalnessMap: maps.ormTex || maps.metalTex,
        metalness: 1.0,
        sheen: isTextile
          ? new THREE.Color('#FAF6EF').multiplyScalar(0.30)
          : (isLeather ? new THREE.Color('#FFF6EB').multiplyScalar(0.10) : null),
        clearcoat: isLacquer ? 0.94 : (isBotanical ? 0.18 : (isMarble ? 0.14 : 0.0)),
        clearcoatRoughness: isLacquer ? 0.07 : (isMarble ? 0.28 : 0.40),
        side: THREE.DoubleSide
      });
    }

    function buildAssetMesh(item, swatch, maps, isOptimised = false) {
      const root = new THREE.Group();
      const effectivePbr = swatch.pbrOverride || item.pbr;
      const tileMeters = swatch.tileMeters || 0.25;
      const primaryMat = createCalibratedMaterial(effectivePbr, swatch, maps);

      const brassMaps = generatePBRMaps('abi_pvd', '#C6A772', '#8E6F40', 256);
      const brassMat = createCalibratedMaterial('abi_pvd', { tileMeters: 0.16 }, brassMaps);

      const steelMaps = generatePBRMaps('abi_pvd', '#C6C8C9', '#8B8E90', 256);
      const steelMat = createCalibratedMaterial('abi_pvd', { tileMeters: 0.16 }, steelMaps);

      const stoneMaps = generatePBRMaps('stone', '#DCD4C6', '#B3A896', 256);
      const stoneMat = createCalibratedMaterial('stone', { tileMeters: 0.45 }, stoneMaps);

      const marbleMaps = generatePBRMaps('marble', '#ECE8E0', '#7D6668', 256);
      const marbleMat = createCalibratedMaterial('marble', { tileMeters: 0.55 }, marbleMaps);

      const oakMaps = generatePBRMaps('timber', '#D6C6B2', '#A89680', 256);
      const oakMat = createCalibratedMaterial('timber', { tileMeters: 0.38 }, oakMaps);

      const rawFlaxMaps = generatePBRMaps('linen', '#EDE9E0', '#CFC8BA', 256);
      const rawFlaxMat = createCalibratedMaterial('linen', { tileMeters: 0.22 }, rawFlaxMaps);

      const saddleLeatherMaps = generatePBRMaps('leather', '#8F5B38', '#5E381F', 256);
      const saddleLeatherMat = createCalibratedMaterial('leather', { tileMeters: 0.35 }, saddleLeatherMaps);

      const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xECE9E2, roughness: 0.42, metalness: 0.0 });
      const darkSealMat = new THREE.MeshStandardMaterial({ color: 0x262421, roughness: 0.55, metalness: 0.15 });
      const barkMat = new THREE.MeshStandardMaterial({ color: 0x4E3F32, roughness: 0.92, metalness: 0.0 });
      const warmGlowMat = new THREE.MeshStandardMaterial({
        color: 0xFFF7E4, emissive: 0xFFBC6B, emissiveIntensity: 1.45, roughness: 0.25, metalness: 0.0
      });

      const leafVertexMat = new THREE.MeshStandardMaterial({
        vertexColors: true, roughness: 0.46, metalness: 0.0, side: THREE.DoubleSide
      });

      const fringeMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(swatch.hex).lerp(new THREE.Color('#E8E2D5'), 0.35),
        roughness: 0.95, metalness: 0.0
      });

      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xDCE6E8, roughness: 0.08, metalness: 0.05, reflectivity: 0.92, clearcoat: 1.0, clearcoatRoughness: 0.06, transparent: true, opacity: 0.38
      });

      switch (item.arch) {
        // 1. Living
        case 'hero_sofa':
          root.add(buildHeroSofa(primaryMat, oakMat, rawFlaxMat, fringeMat, tileMeters, isOptimised));
          break;
        case 'hero_armchair':
          root.add(buildHeroArmchair(primaryMat, oakMat, darkSealMat, tileMeters, isOptimised));
          break;
        case 'hero_coffee_side_tables':
          root.add(buildHeroCoffeeSideTables(primaryMat, stoneMat, tileMeters));
          break;
        case 'hero_rug':
          root.add(buildHeroRug(primaryMat, fringeMat, tileMeters));
          break;
        case 'hero_floor_lamp':
          root.add(buildHeroFloorLamp(primaryMat, stoneMat, rawFlaxMat, darkSealMat));
          break;
        case 'hero_table_lamp':
          root.add(buildHeroTableLamp(primaryMat, brassMat, darkSealMat));
          break;

        // 2. Bedroom
        case 'hero_bed_with_bedding':
          root.add(buildHeroBedWithBedding(primaryMat, oakMat, rawFlaxMat, fringeMat, tileMeters, isOptimised));
          break;
        case 'hero_bedside_table':
          root.add(buildHeroBedsideTable(primaryMat, brassMat, tileMeters));
          break;
        case 'hero_wardrobe':
          root.add(buildHeroWardrobe(primaryMat, oakMat, brassMat, darkSealMat, tileMeters));
          break;

        // 3. Dining
        case 'hero_dining_table':
          root.add(buildHeroDiningTable(primaryMat, tileMeters));
          break;
        case 'hero_dining_chair':
          root.add(buildHeroDiningChair(primaryMat, rawFlaxMat, tileMeters));
          break;
        case 'hero_coral_pendant':
          root.add(buildHeroCoralPendant(primaryMat, brassMat, darkSealMat, warmGlowMat));
          break;
        case 'hero_linear_pendant':
          root.add(buildHeroLinearPendant(primaryMat, darkSealMat, warmGlowMat));
          break;

        // 4. Kitchen
        case 'hero_wall_oven':
          root.add(buildHeroWallOven(primaryMat, oakMat, darkSealMat, warmGlowMat));
          break;
        case 'hero_induction_cooktop':
          root.add(buildHeroInductionCooktop(primaryMat, darkSealMat));
          break;
        case 'hero_rangehood':
          root.add(buildHeroRangehood(primaryMat, darkSealMat));
          break;
        case 'hero_integrated_fridge':
          root.add(buildHeroIntegratedFridge(primaryMat, brassMat, darkSealMat, tileMeters));
          break;
        case 'hero_espresso_machine':
          root.add(buildHeroEspressoMachine(primaryMat, oakMat, ceramicMat, darkSealMat));
          break;
        case 'hero_kettle':
          root.add(buildHeroKettle(primaryMat, oakMat, darkSealMat));
          break;
        case 'hero_toaster':
          root.add(buildHeroToaster(primaryMat, oakMat, darkSealMat));
          break;
        case 'hero_kitchen_tap':
          root.add(buildHeroKitchenTap(primaryMat, darkSealMat, isOptimised));
          break;
        case 'hero_bar_stool':
          root.add(buildHeroBarStool(primaryMat, saddleLeatherMat, brassMat, tileMeters));
          break;

        // 5. Bathroom
        case 'hero_bathroom_vanity':
          root.add(buildHeroBathroomVanity(primaryMat, marbleMat, brassMat, ceramicMat, darkSealMat, tileMeters));
          break;
        case 'hero_toilet':
          root.add(buildHeroToilet(primaryMat, brassMat));
          break;
        case 'hero_shower_screen_fittings':
          root.add(buildHeroShowerScreenFittings(primaryMat, glassMat, darkSealMat));
          break;
        case 'hero_towel_rail':
          root.add(buildHeroTowelRail(primaryMat, rawFlaxMat, darkSealMat));
          break;

        // 6. Outdoor
        case 'hero_outdoor_deck_furniture':
          root.add(buildHeroOutdoorDeckFurniture(primaryMat, rawFlaxMat, tileMeters));
          break;
        case 'hero_outdoor_planters':
          root.add(buildHeroOutdoorPlanters(primaryMat, barkMat, leafVertexMat, tileMeters));
          break;
        case 'hero_outdoor_bbq':
          root.add(buildHeroOutdoorBBQ(primaryMat, oakMat, darkSealMat));
          break;

        // 7. Native Plants & Cars
        case 'proven_nikau_palm':
          root.add(buildHeroNikauPalm(barkMat, stoneMat, isOptimised));
          break;
        case 'pohutukawa_tree_specimen':
          root.add(buildHeroPohutukawa(leafVertexMat, barkMat, stoneMat));
          break;
        case 'silver_fern_specimen':
          root.add(buildHeroSilverFern(leafVertexMat, barkMat, stoneMat));
          break;
        case 'hero_electric_car':
        default:
          root.add(buildHeroElectricCar(primaryMat, steelMat, darkSealMat, glassMat, tileMeters));
          break;
      }

      return root;
    }

    // =========================================================================
    // 8. PHOTOREALISTIC STUDIO REFERENCE RENDER GENERATOR (TEXTURES & COLOURS)
    // =========================================================================
export { HERO_ASSETS_DB, SWATCH_SETS, buildStudioEnvTexture, fitShadowCameraToGroup, generatePBRMaps, createCalibratedMaterial, applyPhysicalUVScale };
export function buildAsset(id, swatchIdx) {
  const item = HERO_ASSETS_DB.find((a) => a.id === id); if (!item) throw new Error("no asset " + id);
  const set = SWATCH_SETS[item.swatchSet] || SWATCH_SETS.linen_wool; const swatch = set[swatchIdx ?? item.defaultSwatch ?? 0] || set[0];
  const maps = generatePBRMaps(swatch.pbrOverride || item.pbr, swatch.hex, swatch.accent, 512);
  const g = buildAssetMesh(item, swatch, maps, false);
  g.traverse((o) => { if (o.isMesh || o.isInstancedMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.asset = item; return g;
}
