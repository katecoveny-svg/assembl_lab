"""Hand-checked data for the assembl design inventory build.

Everything here is either copied from a source (named in build_catalogue.py) or is wording written for this
inventory: neutral titles with no brand or product names (the approach of `title` in src/twin/library.ts), a
category for the shelf tabs, and a short list of the materials each model depicts. Nothing here adds an item:
every entry maps to a real file in one of the four sources.
"""

# Shelf tabs, in order. `id` is what catalogue.json uses.
CATEGORIES = [
    ('architecture', 'Architecture'),
    ('furniture', 'Furniture'),
    ('lighting', 'Lighting'),
    ('kitchen', 'Kitchen'),
    ('bathroom', 'Bathroom'),
    ('objects', 'Objects & textiles'),
    ('outdoor', 'Outdoor & site'),
    ('nature', 'Flora & fauna'),
]

# Kōwhai Studio pieces (generator ids). Titles come from src/twin/library.ts at build time; here: category, type, and
# depicted materials rewritten without brand references or certification claims.
KOWHAI = {
    'HERO-LIV-01': ('furniture', 'Sofa', ['Wool bouclé upholstery', 'Flax and leather details', 'Beech plinth and turned legs']),
    'HERO-LIV-02': ('furniture', 'Armchair', ['Beech frame', 'Woven flax or leather seat options as modelled', 'Linen cushions']),
    'HERO-LIV-03': ('furniture', 'Coffee table', ['Solid ash or oak top', 'Honed travertine drum side table']),
    'HERO-LIV-04': ('objects', 'Rug', ['Undyed wool', 'Braided jute']),
    'HERO-LIV-05': ('lighting', 'Floor lamp', ['Honed travertine base', 'Brushed brass arc stem', 'Raw flax drum shade']),
    'HERO-LIV-06': ('lighting', 'Table lamp', ['Turned ash base', 'Brushed brass stem', 'Frosted opal glass shade']),
    'HERO-BED-01': ('furniture', 'Bed', ['Whitewashed ash frame', 'Stonewashed flax linen', 'Merino throw']),
    'HERO-BED-02': ('furniture', 'Bedside table', ['Whitewashed ash', 'Brushed brass reveal']),
    'HERO-BED-03': ('furniture', 'Wardrobe', ['Fluted whitewashed ash doors', 'Oak interior', 'Knurled brass pulls']),
    'HERO-DIN-01': ('furniture', 'Dining table', ['42 mm solid ash top', 'Arched slab legs']),
    'HERO-DIN-02': ('furniture', 'Dining chair', ['Steam-bent beech', 'Bouclé seat pad']),
    'HERO-DIN-03': ('lighting', 'Pendant light', ['Hoop-pine rib lattice', 'Brushed brass canopy', 'Glass diffuser']),
    'HERO-DIN-04': ('lighting', 'Pendant light', ['Brushed brass housing', 'Honed alabaster diffuser']),
    'HERO-KIT-01': ('kitchen', 'Wall oven', ['Smoked toughened glass door', 'Brushed metal trim', 'Wire racks']),
    'HERO-KIT-02': ('kitchen', 'Cooktop', ['Black ceramic glass', 'Brushed metal edge trim']),
    'HERO-KIT-03': ('kitchen', 'Rangehood', ['Brushed stainless steel', 'Baffle grease filters']),
    'HERO-KIT-04': ('kitchen', 'Fridge', ['Whitewashed ash panels', 'Knurled brushed brass handles']),
    'HERO-KIT-05': ('kitchen', 'Espresso machine', ['Brushed stainless steel', 'Ash paddle and portafilter handle', 'Ceramic cups']),
    'HERO-KIT-06': ('kitchen', 'Kettle', ['Brushed brass-tone steel', 'Ash handle', 'Heated base']),
    'HERO-KIT-07': ('kitchen', 'Toaster', ['Brushed stainless steel', 'Solid ash end panels and lever']),
    'HERO-KIT-08': ('kitchen', 'Kitchen mixer tap', ['Brushed brass-tone metal', 'Pull-out spray wand']),
    'HERO-KIT-09': ('furniture', 'Counter stool', ['Turned beech', 'Leather seat', 'Brass footrest']),
    'HERO-BTH-01': ('bathroom', 'Vanity', ['Fluted whitewashed ash', '40 mm honed marble top', 'Reeded vessel basin']),
    'HERO-BTH-02': ('bathroom', 'Toilet', ['Matte ceramic', 'Soft-close seat', 'Brass flush plate']),
    'HERO-BTH-03': ('bathroom', 'Shower screen and fittings', ['10 mm clear glass', 'Brushed brass channels', '250 mm rain shower head']),
    'HERO-BTH-04': ('bathroom', 'Towel rail', ['Brushed brass-tone stainless steel', 'Flax towel']),
    'HERO-OUT-01': ('outdoor', 'Outdoor sofa and table', ['Weathered slatted hardwood', 'Oatmeal outdoor cushions']),
    'HERO-OUT-02': ('outdoor', 'Planters', ['Honed concrete', 'Weathering steel', 'Bark mulch, cobbles and tussock']),
    'HERO-OUT-03': ('outdoor', 'Barbecue', ['Brushed stainless steel', 'Ash side shelves', 'Cast iron grates']),
    'HERO-NAT-01': ('nature', 'Tree', ['Ringed trunk', 'Crownshaft', 'Pinnate fronds']),
    'HERO-NAT-02': ('nature', 'Tree', ['Gnarled bark limbs', 'Olive-silver leaves', 'Crimson flowers']),
    'HERO-NAT-03': ('nature', 'Tree fern', ['Fibrous trunk', 'Silver-backed fronds']),
    'HERO-CAR-01': ('outdoor', 'Vehicle', ['Painted metal body', 'Smoked glass', 'Alloy wheels']),
}

# Kōwhai descriptions: the generator notes with brand and certification wording taken out.
KOWHAI_DESC = {
    'HERO-OUT-01': 'Slatted hardwood outdoor two-and-a-half-seater sofa with wide timber armrests, weather-resistant oatmeal seat and back cushions, and a matching slatted low table.',
    'HERO-CAR-01': 'Generic, unbranded driveway-scale vehicle, right-hand drive: aerodynamic body, panoramic glass roof, flush door handles, light bars, side mirrors, steering wheel and seats, and four 21-inch multi-spoke wheels with brake discs.',
    'HERO-KIT-02': 'Slim bevel-edged black ceramic induction cooktop with a brushed metal perimeter frame, five cooking-zone rings and a touch-slider control bar.',
    'HERO-DIN-03': 'Open-lattice icosahedral timber rib shade hung from a brushed brass ceiling rose, with a frosted glass diffuser inside.',
}

# Kate's curated site: the nine owner-supplied, refined pieces. curated id -> (inventory id, category, type, title,
# materials, twin library id or None, description)
CURATED_OWNER = {
    'lounge-chair': ('curated-lounge-chair', 'furniture', 'Lounge chair', None,
                     ['Timber frame', 'Fabric upholstery'], 'LIVING-34',
                     'A low lounge chair: a timber frame with loose seat and back cushions.'),
    'arch-mirror': ('curated-arch-mirror', 'bathroom', 'Mirror', None,
                    ['Satin brass frame', 'Mirror surface'], 'ABI-MIR-08',
                    'An arched wall mirror in a slim satin brass frame.'),
    'assembl-bath-stone': ('curated-bath-stone', 'bathroom', 'Bath', 'Freestanding bath, stone finish',
                           ['Stone-look finish'], None,
                           'A freestanding oval bath in a stone-look finish. One form with two finishes: see the marble variant.'),
    'assembl-bath-marble': ('curated-bath-marble', 'bathroom', 'Bath', 'Freestanding bath, marble finish',
                            ['Marble-look finish'], None,
                            'A freestanding oval bath in a veined marble-look finish. One form with two finishes: see the stone variant.'),
    'assembl-guitar-black': ('curated-guitar-black', 'objects', 'Electric guitar', None,
                             ['Gloss black body', 'White pickguard', 'Timber neck', 'Brass-tone hardware'], 'HERO-GTR-01',
                             'A generic solid-body electric guitar in gloss black. Proportions and hardware are not taken from any manufacturer.'),
    'assembl-guitar-white': ('curated-guitar-white', 'objects', 'Electric guitar', 'Solid-body electric guitar, white',
                             ['Gloss white body', 'White pickguard', 'Timber neck', 'Brass-tone hardware'], None,
                             'The same generic solid-body electric guitar in gloss white.'),
    'assembl-kitchen-knife-block': ('curated-knife-block', 'kitchen', 'Knife block', None,
                                    ['Timber block', 'Steel blades', 'Brass base'], 'APPLIANCES-10',
                                    'A timber knife block holding four knives, on a brass base. A simple background prop.'),
    'assembl-speaker-ash': ('curated-speaker-ash', 'objects', 'Speaker', None,
                            ['Pale timber cabinet', 'Grey acoustic face', 'Timber-ringed drivers'], 'HERO-SPK-02',
                            'A bookshelf speaker in pale timber with two timber-ringed drivers.'),
    'assembl-sheer-curtain': ('curated-sheer-curtain', 'objects', 'Curtain', None,
                              ['Sheer fabric', 'Ceiling track'], 'WINDOW-37',
                              'An S-fold sheer curtain hanging from a separate ceiling track.'),
}

# Birds and sprigs from the Manu library (assembl, MIT), as exported to Kate's curated site.
# curated id suffix -> (inventory id, type, title, scientific name, real length note)
MANU = {
    'manu-tui': ('manu-tui', 'Bird', 'Tūī', 'Prosthemadera novaeseelandiae', 'about 30 cm long in life'),
    'manu-korimako': ('manu-korimako', 'Bird', 'Korimako, bellbird', 'Anthornis melanura', 'about 20 cm long in life'),
    'manu-piwakawaka': ('manu-piwakawaka', 'Bird', 'Pīwakawaka, fantail', 'Rhipidura fuliginosa', 'about 16 cm long in life'),
    'manu-tauhou': ('manu-tauhou', 'Bird', 'Tauhou, silvereye', 'Zosterops lateralis', 'about 12 cm long in life'),
    'manu-miromiro': ('manu-miromiro', 'Bird', 'Miromiro, tomtit', 'Petroica macrocephala macrocephala', 'about 13 cm long in life'),
    'manu-toutouwai': ('manu-toutouwai', 'Bird', 'Toutouwai, North Island robin', 'Petroica longipes', 'about 18 cm long in life'),
    'manu-hihi': ('manu-hihi', 'Bird', 'Hihi, stitchbird', 'Notiomystis cincta', 'about 18 cm long in life'),
    'manu-kereru': ('manu-kereru', 'Bird', 'Kererū, New Zealand pigeon', 'Hemiphaga novaeseelandiae', 'about 51 cm long in life'),
    'manu-kowhai': ('manu-kowhai', 'Flowering sprig', 'Kōwhai, flowering sprig', 'Sophora spp.', None),
    'manu-manuka': ('manu-manuka', 'Flowering sprig', 'Mānuka, flowering sprig', 'Leptospermum scoparium', None),
    'manu-pohutukawa': ('manu-pohutukawa', 'Flowering sprig', 'Pōhutukawa, flowering sprig', 'Metrosideros excelsa', None),
}

# assembl's procedural objects (src/objects). key -> (category, type, materials). Titles and descriptions come from
# each object's `info` block at build time.
OBJECTS = {
    'bach': ('architecture', 'Building', ['Painted weatherboards', 'Corrugate roof', 'Timber joinery and glass', 'Timber deck', 'Corrugated tank']),
    'sashwall': ('architecture', 'Window in wall', ['Painted timber sash window', 'Glass', 'Brass fastener and lifts', 'Bevel-back weatherboards', 'Timber framing']),
    'corrugate': ('architecture', 'Roofing', ['Pre-painted steel sheet, 0.40 mm', 'Galvanised steel offcut', 'Timber purlins', 'Hex-head screws']),
    'verandahpost': ('architecture', 'Verandah post', ['Painted timber post, beam and brackets', 'Galvanised post stirrup']),
    'deck': ('architecture', 'Deck', ['Pine decking, joists and bearers', 'H5 piles', 'Timber balustrade']),
    'bracket': ('architecture', 'Fretwork bracket', ['Painted timber, 45 mm']),
    'breezeblock': ('architecture', 'Screen wall', ['Concrete screen blocks', 'Concrete masonry piers', 'Mortar', 'Precast coping']),
    'pressedmetal': ('architecture', 'Ceiling panels', ['Painted pressed steel']),
    'pendant': ('lighting', 'Pendant light', ['Turned rimu shade', 'Brushed brass canopy', 'Linen-covered flex', 'Globe lamp']),
    'sideboard': ('furniture', 'Sideboard', ['Lacquered rimu', 'Rimu-faced plywood', 'Brushed brass ferrules']),
    'bunkbed': ('furniture', 'Bunk bed', ['Pine frame, rails and ladder', 'Foam mattresses in striped ticking']),
    'woolshedbench': ('furniture', 'Bench', ['Lanolin-darkened timber']),
    'kettle': ('kitchen', 'Kettle', ['Brushed stainless steel', 'Black resin handle and knob', 'Power base']),
    'knife': ('kitchen', 'Chef’s knife', ['Satin stainless blade', 'Tōtara scales', 'Steel rivets']),
    'pan': ('kitchen', 'Skillet', ['Seasoned cast iron']),
    'guitar': ('objects', 'Electric guitar', ['Lacquered tōtara body', 'Maple neck', 'Dark fretboard', 'Nickel-silver frets']),
    'speaker': ('objects', 'Speaker', ['Walnut veneer cabinet', 'Satin-black baffle', 'Knitted grille']),
    'cushion': ('objects', 'Cushion', ['Stone-washed oatmeal linen']),
    'throw': ('objects', 'Throw', ['Two-tone herringbone wool']),
    'rug': ('objects', 'Rug', ['Cut-pile wool', 'Bound edges', 'Knotted fringe']),
    'picketgate': ('outdoor', 'Fence and gate', ['Painted timber posts, rails and pickets', 'Galvanised hinges and latch']),
    'strainerfence': ('outdoor', 'Fence', ['Weathered tōtara-style strainer and posts', 'No. 8 wire', 'Timber battens', 'Staples']),
    'watertank': ('outdoor', 'Rainwater tank', ['Galvanised corrugated steel', 'Brass tap', 'Timber stand']),
    'letterbox': ('outdoor', 'Letterbox', ['Painted steel box', 'Weathered timber post', 'PVC newspaper tube']),
    'clothesline': ('outdoor', 'Clothesline', ['Galvanised steel mast and arms', 'PVC-coated line']),
}

# Objects that are also on Kate's curated site (exported earlier from the same source): object key -> curated id
OBJECTS_ON_CURATED = {k: f'intake-20261117-{k}' for k in [
    'speaker', 'throw', 'kettle', 'rug', 'cushion', 'knife', 'pan', 'guitar', 'sashwall', 'corrugate', 'bracket',
    'deck', 'verandahpost', 'bach', 'pendant']}

# The ten newer Aotearoa objects exported by a separate agent (manu-objects/shots/nz/glb/<key>/)
OBJECTS_NZ_EXPORT = ['breezeblock', 'picketgate', 'pressedmetal', 'strainerfence', 'watertank', 'sideboard', 'bunkbed',
                     'woolshedbench', 'letterbox', 'clothesline']

# Variant families (only where two files are the same form in different finishes)
FAMILIES = {
    'curated-bath-stone': ('freestanding-bath', 'Freestanding bath'),
    'curated-bath-marble': ('freestanding-bath', 'Freestanding bath'),
    'curated-guitar-black': ('electric-guitar-hero-gtr-01', 'Solid-body electric guitar'),
    'curated-guitar-white': ('electric-guitar-hero-gtr-01', 'Solid-body electric guitar'),
}

# Preview camera tweaks for the thumbnail renders: id -> dict(azimuth deg, elevation deg, fill)
VIEW = {
    'objects-corrugate': {'elev': 38},
    'objects-rug': {'elev': 45},
    'kowhai-hero-liv-04': {'elev': 48},
    'objects-deck': {'elev': 28},
    'kowhai-hero-kit-02': {'elev': 42},
    'objects-pressedmetal': {'elev': 62, 'az': 30},
    'objects-throw': {'elev': 35},
    'objects-cushion': {'elev': 30},
    'objects-strainerfence': {'az': 38, 'elev': 16},
    'objects-picketgate': {'az': 28},
    'objects-breezeblock': {'az': 28},
    'objects-sashwall': {'az': 28},
    'objects-bracket': {'az': 20},
    'curated-arch-mirror': {'az': 22},
    'curated-sheer-curtain': {'az': 24},
    'kowhai-hero-car-01': {'az': 50},
}
