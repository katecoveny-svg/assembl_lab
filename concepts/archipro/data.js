// An independent assembl concept for ArchiPro. Every supplier and product here is invented sample data, written so the
// ideas can run in a browser. Specs are illustrative, not maker data. `fin` is the option id the 16A twin's finishes
// schedule uses (plan-studio/twins/src/twin/finishes.ts), so a product picked here can be shown on the real model.

export const CLAUSES = {
  B2: "B2 Durability",
  E2: "E2 External moisture",
  H1: "H1 Energy efficiency",
  D1: "D1 Access routes (slip resistance)",
};

export const ZONES = {
  B: "Zone B, low (sheltered inland)",
  C: "Zone C, medium (inland, exposed)",
  D: "Zone D, high (coastal)",
  E: "Zone E, sea spray",
};

export const CATS = {
  cladding: { label: "Cladding", surface: "cladding" },
  roof: { label: "Roofing", surface: "roof" },
  joinery: { label: "Window and door joinery", surface: "joinery" },
  decking: { label: "Decking", surface: "decking" },
  floor: { label: "Flooring", surface: "floor" },
  bench: { label: "Benchtops", surface: "bench" },
};

// swatches for cards and the point cloud tags: approximate screen colours only
export const PRODUCTS = [
  // cladding
  { id: "mf-cedar-oil", cat: "cladding", name: "Vertical cedar shiplap, natural oil", supplier: "Marlow & Finch Timber", fin: "cedar", swatch: ["#B07A4F", "#8A5A36"],
    line: "135 mm cover, kiln-dried western red cedar, penetrating oil.", zones: ["B", "C", "D"], upkeep: "Medium", upkeepNote: "Re-oil every two to three years.",
    life: "15 years", lead: 3, band: "$$", tags: ["timber", "warm", "natural", "wood", "cedar"], clauses: ["B2", "E2"], note: "Stainless fixings in Zone D." },
  { id: "mf-cedar-black", cat: "cladding", name: "Vertical cedar shiplap, black stain", supplier: "Marlow & Finch Timber", fin: "blackstain", swatch: ["#2A2422", "#171312"],
    line: "135 mm cover, cedar with a pigmented black stain.", zones: ["B", "C", "D", "E"], upkeep: "Low", upkeepNote: "Re-stain every five to seven years.",
    life: "15 years", lead: 3, band: "$$", tags: ["timber", "black", "dark", "wood", "cedar"], clauses: ["B2", "E2"], note: "Stainless fixings in Zones D and E." },
  { id: "os-rib-charcoal", cat: "cladding", name: "Ribbed steel cladding, charcoal", supplier: "Ordinal Steelworks", fin: "metal", swatch: ["#3A3B3E", "#26272A"],
    line: "Trapezoidal rib at 300 mm centres, prefinished charcoal.", zones: ["B", "C"], upkeep: "Low", upkeepNote: "Wash sheltered areas the rain doesn't reach.",
    life: "15 years", lead: 5, band: "$$", tags: ["metal", "steel", "dark", "charcoal", "modern"], clauses: ["B2", "E2"], note: "Zone D and E need the marine-grade coating." },
  { id: "pb-fc-white", cat: "cladding", name: "Fibre-cement weatherboard, painted white", supplier: "Plainsong Building Products", fin: "white", swatch: ["#EEECE7", "#D8D5CE"],
    line: "Smooth bevel-back boards, low-sheen white.", zones: ["B", "C", "D", "E"], upkeep: "Low", upkeepNote: "Repaint every eight to ten years.",
    life: "15 years", lead: 2, band: "$", tags: ["white", "painted", "light", "classic"], clauses: ["B2", "E2"], note: "" },
  // roofing
  { id: "os-corr-charcoal", cat: "roof", name: "Corrugate, charcoal", supplier: "Ordinal Steelworks", fin: "charcoal", swatch: ["#34363A", "#232427"],
    line: "Corrugated prefinished steel, standard coating.", zones: ["B", "C"], upkeep: "Low", upkeepNote: "Wash unwashed areas yearly.",
    life: "15 years", lead: 4, band: "$", tags: ["metal", "dark", "charcoal"], clauses: ["B2", "E2"], note: "Not for Zone D or E: use the marine coating." },
  { id: "os-corr-black-marine", cat: "roof", name: "Corrugate, black, marine coating", supplier: "Ordinal Steelworks", fin: "black", swatch: ["#1F2022", "#141516"],
    line: "Corrugated steel, marine-grade coating for coastal sites.", zones: ["B", "C", "D", "E"], upkeep: "Low", upkeepNote: "Wash unwashed areas every three months near surf.",
    life: "15 years", lead: 6, band: "$$", tags: ["metal", "black", "dark", "coastal", "marine", "sea"], clauses: ["B2", "E2"], note: "" },
  { id: "nb-corr-grey", cat: "roof", name: "Corrugate, warm grey", supplier: "Northbeam Roofing", fin: "grey", swatch: ["#6E6C66", "#55534E"],
    line: "Corrugated prefinished steel, warm mid grey.", zones: ["B", "C", "D"], upkeep: "Low", upkeepNote: "Wash unwashed areas twice a year.",
    life: "15 years", lead: 4, band: "$", tags: ["metal", "grey", "light"], clauses: ["B2", "E2"], note: "" },
  { id: "nb-corr-zinc", cat: "roof", name: "Corrugate, unpainted zinc-aluminium", supplier: "Northbeam Roofing", fin: "zinc", swatch: ["#AEB2B5", "#8E9295"],
    line: "Unpainted zinc-aluminium coated steel.", zones: ["B", "C"], upkeep: "Low", upkeepNote: "Keep clear of copper and lead run-off.",
    life: "15 years", lead: 3, band: "$", tags: ["metal", "silver", "natural"], clauses: ["B2", "E2"], note: "Not for coastal or sea-spray sites." },
  // joinery
  { id: "hj-tb-black", cat: "joinery", name: "Thermally broken aluminium, matt black", supplier: "Halcyon Joinery", fin: "black", swatch: ["#19191A", "#0F0F10"],
    line: "Thermally broken frames, double glazed, low-E, argon fill.", zones: ["B", "C", "D", "E"], upkeep: "Low", upkeepNote: "Wash frames and tracks every three months near the sea.",
    life: "15 years", lead: 7, band: "$$$", tb: true, tags: ["aluminium", "black", "dark", "thermal", "warm", "energy"], clauses: ["B2", "E2", "H1"], note: "" },
  { id: "hj-tb-bronze", cat: "joinery", name: "Thermally broken aluminium, dark bronze", supplier: "Halcyon Joinery", fin: "bronze", swatch: ["#3D3128", "#2A211B"],
    line: "Thermally broken, anodised dark bronze, double glazed, low-E.", zones: ["B", "C", "D"], upkeep: "Low", upkeepNote: "Wash frames every six months.",
    life: "15 years", lead: 9, band: "$$$", tb: true, tags: ["aluminium", "bronze", "warm", "thermal", "energy"], clauses: ["B2", "E2", "H1"], note: "" },
  { id: "sw-std-white", cat: "joinery", name: "Aluminium, white powdercoat", supplier: "Southroad Windows", fin: "white", swatch: ["#ECEAE5", "#D2CFC9"],
    line: "Standard aluminium frames, double glazed.", zones: ["B", "C", "D"], upkeep: "Low", upkeepNote: "Wash frames every six months.",
    life: "15 years", lead: 4, band: "$", tb: false, tags: ["aluminium", "white", "light"], clauses: ["B2", "E2", "H1"], note: "Not thermally broken: check the H1 calculation." },
  { id: "qs-timber-clear", cat: "joinery", name: "Timber joinery, clear finish", supplier: "Quarter Sawn Joinery", fin: "timber", swatch: ["#8E6C4D", "#6B4F38"],
    line: "Timber sashes and frames, clear finish, double glazed.", zones: ["B", "C", "D"], upkeep: "Medium", upkeepNote: "Recoat the exterior every three to four years.",
    life: "15 years", lead: 10, band: "$$$", tb: true, tags: ["timber", "wood", "warm", "natural", "thermal"], clauses: ["B2", "E2", "H1"], note: "" },
  // decking
  { id: "mf-hw-oiled", cat: "decking", name: "Hardwood decking 140 × 19, oiled", supplier: "Marlow & Finch Timber", fin: "kwila", swatch: ["#A4795A", "#6F4A33"],
    line: "Dense red-brown hardwood, pre-oiled, certified source.", zones: ["B", "C", "D", "E"], upkeep: "Medium", upkeepNote: "Re-oil yearly to keep the colour.",
    life: "15 years", lead: 2, band: "$$", tags: ["timber", "hardwood", "warm", "red", "wood"], clauses: ["B2", "D1"], note: "Tannin can stain paving in the first months." },
  { id: "mf-hw-silver", cat: "decking", name: "Hardwood decking 140 × 19, left to silver", supplier: "Marlow & Finch Timber", fin: "vitex", swatch: ["#9A9286", "#6E675D"],
    line: "Hardwood left unfinished to weather to silver grey.", zones: ["B", "C", "D", "E"], upkeep: "Low", upkeepNote: "Wash yearly. No oil needed.",
    life: "15 years", lead: 2, band: "$$", tags: ["timber", "hardwood", "grey", "silver", "weathered", "natural", "silvers"], clauses: ["B2", "D1"], note: "" },
  { id: "ng-hw-pale", cat: "decking", name: "Pale hardwood decking, oiled", supplier: "Northgrain Timber", fin: "pale", swatch: ["#C9A77C", "#9A7A54"],
    line: "Pale, fine-grained hardwood, oiled.", zones: ["B", "C", "D"], upkeep: "Medium", upkeepNote: "Re-oil every year or two.",
    life: "15 years", lead: 4, band: "$$", tags: ["timber", "pale", "light", "wood"], clauses: ["B2", "D1"], note: "" },
  { id: "pb-comp-charcoal", cat: "decking", name: "Composite decking, charcoal", supplier: "Plainsong Building Products", fin: "charcoal", swatch: ["#4A4744", "#343230"],
    line: "Capped composite boards, grooved fixing.", zones: ["B", "C", "D", "E"], upkeep: "Low", upkeepNote: "Wash twice a year.",
    life: "15 years", lead: 3, band: "$$", tags: ["composite", "dark", "charcoal", "low"], clauses: ["B2", "D1"], note: "Dark boards get hot underfoot in full sun." },
  // flooring
  { id: "lr-oak-natural", cat: "floor", name: "Engineered oak, natural matt", supplier: "Long Reach Floors", fin: "oak", swatch: ["#CFAE80", "#9B7650"],
    line: "180 mm engineered European oak, natural matt lacquer.", zones: [], upkeep: "Low", upkeepNote: "Recoat high-traffic areas every eight to ten years.",
    life: "Interior", lead: 3, band: "$$", tags: ["oak", "timber", "wood", "warm", "light"], clauses: [], note: "" },
  { id: "lr-oak-smoked", cat: "floor", name: "Engineered oak, smoked", supplier: "Long Reach Floors", fin: "oak-smoked", swatch: ["#8C6A4C", "#5A4130"],
    line: "180 mm engineered oak, smoked, matt oil.", zones: [], upkeep: "Medium", upkeepNote: "Maintenance oil every year or two.",
    life: "Interior", lead: 5, band: "$$$", tags: ["oak", "timber", "dark", "smoked"], clauses: [], note: "" },
  { id: "gw-concrete", cat: "floor", name: "Ground and polished concrete", supplier: "Greywacke Surfaces", fin: "concrete", swatch: ["#B9B5AE", "#8F8B84"],
    line: "Light exposure grind, sealed.", zones: [], upkeep: "Low", upkeepNote: "Reseal every few years.",
    life: "Interior", lead: 1, band: "$$", tags: ["concrete", "grey", "thermal", "mass"], clauses: [], note: "Good thermal mass under north glazing." },
  { id: "rr-rimu", cat: "floor", name: "Recovered rimu tongue-and-groove", supplier: "Second Growth Recovery", fin: "rimu", swatch: ["#C27A48", "#7D3B22"],
    line: "Recovered rimu boards, sanded and clear finished.", zones: [], upkeep: "Medium", upkeepNote: "Recoat every ten years or so.",
    life: "Interior", lead: 8, band: "$$$", tags: ["rimu", "timber", "native", "recovered", "warm", "red"], clauses: [], note: "Recovered timber only." },
  // benchtops
  { id: "ql-stone", cat: "bench", name: "Engineered stone, low silica, warm white", supplier: "Quarry Lane Surfaces", fin: "stone", swatch: ["#EFEBE4", "#D9D3C9"],
    line: "20 mm low-silica engineered stone, eased edge.", zones: [], upkeep: "Low", upkeepNote: "Wipe clean. Avoid hot pans.",
    life: "Interior", lead: 3, band: "$$", tags: ["stone", "white", "light"], clauses: [], note: "Fabricators cut it wet, with dust controls." },
  { id: "ql-marble", cat: "bench", name: "Honed marble, white with grey vein", supplier: "Quarry Lane Surfaces", fin: "marble", swatch: ["#F1EFEA", "#B9B6B0"],
    line: "20 mm honed marble.", zones: [], upkeep: "High", upkeepNote: "Seal yearly. It will etch with citrus.",
    life: "Interior", lead: 6, band: "$$$", tags: ["marble", "white", "stone", "classic"], clauses: [], note: "" },
  { id: "gw-terrazzo", cat: "bench", name: "Terrazzo, warm white", supplier: "Greywacke Surfaces", fin: "terrazzo", swatch: ["#E9E3D8", "#6B6258"],
    line: "30 mm terrazzo with dark aggregate.", zones: [], upkeep: "Medium", upkeepNote: "Reseal every year or two.",
    life: "Interior", lead: 7, band: "$$$", tags: ["terrazzo", "warm", "speckled"], clauses: [], note: "" },
];

export const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

// what a person might ask an assistant, and the words that stand for a filter
export const SYNONYMS = [
  [/\b(coast(al)?|beach|sea|ocean|harbour|waiheke|island|bach)\b/, { zone: "D" }],
  [/\b(sea ?spray|surf|breaking waves|beachfront|on the beach)\b/, { zone: "E" }],
  [/\b(low[- ]?(maintenance|upkeep)|easy[- ]care|no[- ]fuss|hands[- ]off)\b/, { upkeep: "Low" }],
  [/\b(thermally broken|thermal(ly)?|warm(er)? windows?|energy|h1|insulat\w*)\b/, { tb: true }],
  [/\b(clad(ding)?|weatherboards?|shiplap|walls? outside|exterior walls?)\b/, { cat: "cladding" }],
  [/\b(roof(ing)?|corrugate[d]?)\b/, { cat: "roof" }],
  [/\b(windows?|doors?|joinery|glazing|sliders?)\b/, { cat: "joinery" }],
  [/\b(deck(ing)?|outdoor floor)\b/, { cat: "decking" }],
  [/\b(floor(ing)?|floorboards?)\b/, { cat: "floor" }],
  [/\b(bench(top)?s?|kitchen tops?|counter(top)?s?)\b/, { cat: "bench" }],
];

export const ASK_EXAMPLES = [
  "Low-upkeep cladding for a house 200 m from the beach on Waiheke",
  "Black thermally broken window joinery in under eight weeks",
  "Hardwood decking that silvers off, for a coastal deck",
  "Roofing that copes with sea spray",
];

// the sample practice for idea 4. Invented, along with every page and image it "has".
export const PRACTICE = {
  name: "Halden & Wu Architects",
  site: "haldenwu.example",
  city: "Auckland",
  pages: 14,
  images: 41,
  projects: [
    { title: "Onetangi bach", place: "Waiheke Island", year: 2025, images: 9, tags: ["mf-cedar-black", "os-corr-black-marine", "mf-hw-silver"], people: false },
    { title: "Grey Lynn villa extension", place: "Auckland", year: 2024, images: 7, tags: ["hj-tb-black", "lr-oak-natural"], people: true },
    { title: "Wānaka alpine house", place: "Wānaka", year: 2025, images: 8, tags: ["os-rib-charcoal", "hj-tb-bronze", "gw-concrete"], people: false },
    { title: "Mt Eden townhouses", place: "Auckland", year: 2023, images: 6, tags: ["pb-fc-white", "sw-std-white"], people: false },
    { title: "Raglan studio", place: "Raglan", year: 2024, images: 5, tags: ["mf-cedar-oil", "pb-comp-charcoal"], people: true },
    { title: "Remuera garden pavilion", place: "Auckland", year: 2025, images: 6, tags: ["qs-timber-clear", "gw-terrazzo"], people: false },
  ],
  services: ["New homes", "Alterations and additions", "Baches"],
  about: "A small Auckland studio designing homes and baches that are warm, simple to live in and built to last.",
};

// idea 5: the agents' queue. All sample. Every outbound step waits for the named person.
export const QUEUE = [
  { id: "q1", agent: "Renewals", market: "NZ", tz: "Pacific/Auckland", owner: "Client success lead, Auckland",
    title: "A supplier's renewal is in 24 days",
    why: "Profile views down 18% this quarter; 12 projects show their products untagged.",
    draft: "A check-in email with three fixes: tag the 12 projects, refresh four product photos, add lead times.",
    done: "Email sent from the client success lead's own inbox.", evidence: ["Profile analytics, last 90 days", "Tagging report", "Draft v1, edited by the owner"] },
  { id: "q2", agent: "Pipeline", market: "AU", tz: "Australia/Sydney", owner: "Sales lead, Sydney",
    title: "14 Sydney practices published new work without a profile",
    why: "Found on the practices' own websites in the last 30 days.",
    draft: "A ranked shortlist with one line on each practice's work. No outreach drafted or sent.",
    done: "Shortlist shared with the Sydney sales lead.", evidence: ["14 public project pages", "Ranking rules v2"] },
  { id: "q3", agent: "Editorial", market: "NZ", tz: "Pacific/Auckland", owner: "Editor, Auckland",
    title: "A Wānaka house went live with 11 tagged products",
    why: "Strong images, complete tags, a practice that hasn't been featured before.",
    draft: "A 300-word feature and three social cuts. A quote is requested from the architect, not invented.",
    done: "Quote request sent to the architect. Feature held until the quote is in.", evidence: ["Project page", "11 product records", "Style guide"] },
  { id: "q4", agent: "Onboarding", market: "US", tz: "America/Los_Angeles", owner: "Member success, Los Angeles",
    title: "A Los Angeles studio joined overnight, NZ time",
    why: "Trial started at 9.14 pm their time. Profile 30% complete.",
    draft: "A welcome note, a profile checklist and a 15-minute call slot in their morning.",
    done: "Welcome sent. Call offered for 9.30 am their time.", evidence: ["Trial record", "Profile checklist v3"] },
];

// cited public figures. Each one is ArchiPro's own number or a reporter's, with its source.
export const FACTS = [
  { n: "662%", what: "more sessions from AI platforms in Q2 2026 than a year before: 69,192 sessions", src: "ArchiPro Building and Interior Product Research Report, Q2 2026", url: "https://business.archipro.co.nz/articles/archipro-building-and-interior-product-research-report" },
  { n: "238%", what: "more enquiries were made on suppliers' own websites than on the platform, in the same report", src: "ArchiPro Building and Interior Product Research Report, Q2 2026", url: "https://business.archipro.co.nz/articles/archipro-building-and-interior-product-research-report" },
  { n: "3,000+", what: "members paying a yearly fee, with 400,000+ subscribers and 500,000 monthly active users", src: "Business of Home, 2026", url: "https://businessofhome.com/articles/after-a-successful-run-in-australasia-the-new-zealand-based-platform-aims-to-bring-american-designers-builders-product-vendors-and-homeowners-together-in-one-highly-curated-site" },
  { n: "1 Nov", what: "2026: ArchiPro launched in the United States, with a curated product layer and a small team", src: "Business of Home, 2026", url: "https://businessofhome.com/articles/after-a-successful-run-in-australasia-the-new-zealand-based-platform-aims-to-bring-american-designers-builders-product-vendors-and-homeowners-together-in-one-highly-curated-site" },
];
