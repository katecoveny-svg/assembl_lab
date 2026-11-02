// assembl lab · trades twin. NZ reference data for the plan-to-quote desk: Building Code clauses to check per condition,
// the H1 insulation schedule by climate zone, the consent-trigger questions (Building Act 2004, Schedule 1), a register of
// common NZ defects by element type, and illustrative trade labour rates. Pure data, shared by the browser and the endpoint.
//
// Truth: ILLUSTRATIVE. Clause names and the broad "what to check" lines are the lab's reading of public MBIE guidance on
// building.govt.nz at the date below. Nothing here is a compliance determination, a design, or legal advice; a licensed
// building practitioner, designer or the council decides. R-values and heights are quoted for orientation only: confirm
// the current acceptable solution before relying on any figure. Rates and provisional sums are fictional.

export const NZ_REF_DATE = "2026-11-02";
export const NZ_TRUTH = "Illustrative · not a compliance determination";
const GOVT = "https://www.building.govt.nz/";

// ---------------------------------------------------------------- Building Code clauses, with where to read them
export const CLAUSES = {
  B1: { id: "B1", name: "Structure", std: "NZS 3604:2011 (timber-framed buildings) via B1/AS1", link: GOVT + "building-code-compliance/b-stability/b1-structure/" },
  B2: { id: "B2", name: "Durability", std: "B2/AS1 · timber treatment (H1.2, H3.2, H5) per NZS 3640", link: GOVT + "building-code-compliance/b-stability/b2-durability/" },
  D1: { id: "D1", name: "Access routes", std: "D1/AS1 · doorways, thresholds, handrails, stairs", link: GOVT + "building-code-compliance/d-access/d1-access-routes/" },
  E2: { id: "E2", name: "External moisture", std: "E2/AS1 · flashings, clearances, risk matrix", link: GOVT + "building-code-compliance/e-moisture/e2-external-moisture/" },
  E3: { id: "E3", name: "Internal moisture", std: "E3/AS1 · wet-area linings, floors and upstands", link: GOVT + "building-code-compliance/e-moisture/e3-internal-moisture/" },
  F4: { id: "F4", name: "Safety from falling", std: "F4/AS1 · barriers 1.0 m where the fall is 1.0 m or more", link: GOVT + "building-code-compliance/f-safety-of-users/f4-safety-from-falling/" },
  G4: { id: "G4", name: "Ventilation", std: "G4/AS1 · openable windows 5% of floor area, or mechanical extract in wet rooms", link: GOVT + "building-code-compliance/g-services-and-facilities/g4-ventilation/" },
  G12: { id: "G12", name: "Water supplies", std: "G12/AS1 · hot water at taps, backflow, materials", link: GOVT + "building-code-compliance/g-services-and-facilities/g12-water-supplies/" },
  G13: { id: "G13", name: "Foul water", std: "G13/AS1 · sanitary plumbing and drainage", link: GOVT + "building-code-compliance/g-services-and-facilities/g13-foul-water/" },
  G9: { id: "G9", name: "Electricity", std: "G9 · AS/NZS 3000 wiring rules; certificate of compliance from the electrician", link: GOVT + "building-code-compliance/g-services-and-facilities/g9-electricity/" },
  H1: { id: "H1", name: "Energy efficiency", std: "H1/AS1 5th edition · schedule method R-values by climate zone", link: GOVT + "building-code-compliance/h-energy-efficiency/h1-energy-efficiency/" },
};
export const SCHEDULE1_LINK = GOVT + "projects-and-consents/planning-a-successful-build/scope-and-design/check-if-you-need-consents/building-work-that-doesnt-need-a-building-consent/";

// ---------------------------------------------------------------- H1 insulation schedule, housing, as the lab read H1/AS1 5th edition
// Six climate zones follow council boundaries. Zone 1 takes in Northland, Auckland and Coromandel; 2 the rest of the upper North
// Island; 3 the lower North Island, Nelson, Marlborough and the West Coast; 4 Canterbury; 5 and 6 Otago, Southland and the
// Mackenzie. Confirm your zone and the current amendment on building.govt.nz before specifying.
export const H1_ZONES = [
  { zone: 1, where: "Northland · Tāmaki Makaurau Auckland · Coromandel" }, { zone: 2, where: "Waikato · Bay of Plenty · Gisborne · Taranaki coast" },
  { zone: 3, where: "Lower North Island · Te Whanganui-a-Tara Wellington · Nelson · West Coast" }, { zone: 4, where: "Waitaha Canterbury" },
  { zone: 5, where: "Ōtepoti Dunedin · coastal Otago" }, { zone: 6, where: "Central Otago · Mackenzie · Murihiku Southland" },
];
export const H1_SCHEDULE = [ // minimum construction R-values (m²·K/W), by zone 1..6
  { element: "Roof", r: [6.6, 6.6, 6.6, 6.6, 6.6, 6.6] },
  { element: "Walls", r: [2.0, 2.0, 2.0, 2.0, 2.0, 2.0] },
  { element: "Floor · suspended timber", r: [2.5, 2.5, 2.5, 2.8, 3.0, 3.0] },
  { element: "Floor · slab on ground", r: [1.5, 1.5, 1.5, 1.6, 1.7, 1.7] },
  { element: "Windows and doors (vertical)", r: [0.46, 0.46, 0.46, 0.46, 0.50, 0.50] },
];

// ---------------------------------------------------------------- consent trigger: the questions an agent asks before anyone prices
// Each exemption is a Schedule 1 clause as commonly cited; the council's own checklist decides. "likely" is the lab's reading.
export const CONSENT_QUESTIONS = [
  { id: "like-for-like", q: "Is it repair, maintenance or like-for-like replacement of an existing part (linings, flooring, a window in the same hole)?", exemption: "Schedule 1, clause 1 · general repair and maintenance", likely: "exempt", note: "Not exempt if the original failed through a design or durability fault, or the work changes a bracing element." },
  { id: "deck-height", q: "Is the deck or platform 1.5 m or less above the ground at every point?", exemption: "Schedule 1, clause 24 · decks, platforms and bridges where a fall is 1.5 m or less", likely: "exempt if yes", note: "Above 1.5 m the deck needs consent; the barrier (F4) is checked either way." },
  { id: "pergola", q: "Is the pergola an open, unroofed frame?", exemption: "Schedule 1, clause 20 · pergolas", likely: "exempt", note: "Add a roof or a wall and it becomes a carport or a room, which has its own rules." },
  { id: "plumbing", q: "Does the work add or move a sanitary fixture or a drain?", exemption: "Replacing a fixture in place is commonly exempt; new drainage or a new wet room usually needs consent", likely: "consent likely if yes", note: "An authorised plumber or drainlayer does the work in any case (G12, G13)." },
  { id: "structure", q: "Does anything touch a structural element: a load-bearing or bracing wall, a lintel, a beam?", exemption: "No general exemption for structural alteration", likely: "consent likely if yes", note: "NZS 3604 bracing lines are easy to remove and hard to see; ask for the bracing schedule." },
  { id: "wet-area", q: "Does the work create a new wet area, or change waterproofing in one?", exemption: "No exemption for new wet-area membranes", likely: "consent likely if yes", note: "E3 and the membrane manufacturer's system both apply." },
];

// ---------------------------------------------------------------- which clauses to check per condition
// Each entry: clause id, a short "what to check" line a builder can act on. Illustrative, not exhaustive.
export const CODE_CHECKS = {
  "floor-tiles": [{ clause: "E3", check: "In bathrooms, ensuites, WCs and laundries: impervious floor with a membrane and upstands at wall junctions; fall to a floor waste where one is fitted." }, { clause: "D1", check: "Slip resistance of the tile in wet areas; thresholds flush or ramped." }],
  carpet: [{ clause: "H1", check: "If the floor is opened up, the underfloor insulation must meet the zone's schedule R-value (suspended timber) before it closes again." }],
  vinyl: [{ clause: "E3", check: "Sheet or plank in a wet room: coved or sealed at the wall, and a dry, flat substrate (moisture test the slab)." }],
  skirting: [{ clause: "B2", check: "Finger-jointed pine inside is fine; any skirting on a wet-area floor is sealed at the floor line." }],
  "gib-wall": [{ clause: "B1", check: "Bracing: a plasterboard wall may be a bracing element under NZS 3604. Do not cut or remove it without the bracing schedule." }, { clause: "E3", check: "Wet-area board (and a membrane behind tiles) in showers and above baths." }, { clause: "H1", check: "Wall insulation in the frame before lining: R2.0 schedule value, no gaps, no compression." }],
  "paint-walls": [{ clause: "E3", check: "Wet-area paint systems in bathrooms, kitchens and laundries; let new plaster cure first." }],
  "int-door": [{ clause: "D1", check: "Clear widths and thresholds on the accessible route; door swings clear of fixtures." }],
  window: [{ clause: "E2", check: "Head flashing with stop-ends, sill tray, jamb flashings and the air seal, per E2/AS1 for the cladding type and risk score." }, { clause: "H1", check: "Whole-window R-value for the zone (R0.46 in zones 1–4, R0.50 in 5–6) when a window is new, not like-for-like." }, { clause: "G4", check: "Openable area at least 5% of the room's floor area, or mechanical ventilation." }, { clause: "F4", check: "A sill under 760 mm above a floor with a fall of 1 m or more needs a restrictor or a barrier." }],
  fixture: [{ clause: "G12", check: "Hot water to a bath or basin tempered to 55 °C or less (45 °C in care settings); backflow protection where required." }, { clause: "G13", check: "Every fixture trapped and vented; drainage falls and access points as the drainlayer's as-built shows." }, { clause: "G4", check: "Extract fan in the bathroom or WC if there is no openable window." }],
  downlight: [{ clause: "G9", check: "Fittings rated for contact with insulation (IC or CA) under H1-depth ceiling insulation; electrician's certificate of compliance." }, { clause: "H1", check: "Cutting holes in a sealed, insulated ceiling: keep the insulation continuous around the fitting." }],
  "power-point": [{ clause: "G9", check: "RCD protection on the circuit; certificate of compliance from the electrician." }],
  decking: [{ clause: "B2", check: "Decking H3.2 minimum; stainless or hot-dip galvanised fixings; gaps for drainage." }, { clause: "D1", check: "Slip resistance of the walking surface; step risers even." }],
  "deck-joist": [{ clause: "B1", check: "Joist size, span and centres from the NZS 3604 deck tables; H3.2 treatment; a 12 mm gap where the deck meets the house." }, { clause: "E2", check: "The deck-to-house junction: a flashing or a gap so the cladding stays dry; never fix a ledger through the cladding without a detail." }],
  bearer: [{ clause: "B1", check: "Bearer size against post spacing; bolted or strapped to the post; a damp-proof separation at the post." }],
  post: [{ clause: "B2", check: "H5 for posts in the ground or in concrete; footing size and depth from NZS 3604 for the soil." }, { clause: "B1", check: "Bracing of a deck more than 1 m off the ground: diagonal braces or cantilevered posts." }],
  handrail: [{ clause: "F4", check: "Barrier at least 1.0 m high where the fall is 1.0 m or more; no opening over 100 mm; nothing climbable between 150 mm and 760 mm." }, { clause: "B1", check: "Barrier fixings designed for the F4 loads, not just screwed to a joist." }],
  rafter: [{ clause: "B1", check: "A pergola carries little load, but fixings to the house face must not breach the cladding (E2)." }],
  beam: [{ clause: "B1", check: "Beam span against post spacing; H3.2 outdoors." }],
};

// ---------------------------------------------------------------- common NZ defects by element type
// severity: high / medium / low. `ps` is a fictional provisional sum (NZD ex-GST) a builder might hold if the risk is live.
// `photo` is the site-check prompt the agent asks for. `when` says which conditions or rooms wake the defect.
export const DEFECTS = [
  { id: "wet-membrane", title: "Bathroom waterproofing missing or stopped short", where: "Wet-area floors and shower walls", severity: "high", clause: "E3", when: { conditions: ["floor-tiles", "vinyl"], rooms: ["bath", "ensuite", "wc", "laundry"] },
    photo: "Photograph the shower base to wall junction, the floor waste and each corner upstand before tiling.", ps: 1800, why: "Membranes stopping below the tile line, or no upstand at the wall, are the most common wet-room failure found at pre-purchase inspections." },
  { id: "window-flashing", title: "Weathertightness at window heads and jambs", where: "Every external window and door", severity: "high", clause: "E2", when: { conditions: ["window"] },
    photo: "Head flashing with stop-ends, sill tray and jamb flashing at each opening, cladding cut back 5 mm.", ps: 2400, why: "Water enters at junctions, not in the field of the cladding. Head flashings without stop-ends are the classic 2000s leak path." },
  { id: "cladding-clearance", title: "Cladding too close to the ground or paving", where: "Bottom edge of the external cladding", severity: "medium", clause: "E2", when: { conditions: ["gib-wall", "window"], elements: ["ext-wall"] },
    photo: "The bottom of the cladding against the finished ground: E2/AS1 asks for 100 mm to paving and 175 mm to unpaved ground.", ps: 900, why: "Landscaping and new paths creep up over the years; the bottom plate then wicks water." },
  { id: "insulation-gaps", title: "Retrofitted insulation with gaps, tucks or compression", where: "Walls opened for lining; ceilings cut for downlights", severity: "medium", clause: "H1", when: { conditions: ["gib-wall", "downlight", "carpet"] },
    photo: "Each bay before the board goes on: insulation to every edge, no folds behind wiring, no gap round the downlight.", ps: 650, why: "A 5% gap can cost a quarter of the insulation's value; it is invisible once lined." },
  { id: "bracing-removed", title: "Bracing element altered without a bracing schedule", where: "Internal and external walls", severity: "high", clause: "B1", when: { conditions: ["gib-wall", "int-door"] },
    photo: "The bracing schedule and the wall in question before any board or stud is cut.", ps: 1200, why: "Plasterboard bracing walls look like any other wall. Cutting a door through one is a structural change." },
  { id: "balustrade-height", title: "Deck barrier under 1.0 m, or with gaps over 100 mm", where: "Deck edges with a fall of 1 m or more", severity: "high", clause: "F4", when: { conditions: ["handrail", "decking"] },
    photo: "Measure the finished deck height to the ground at the lowest point, and the barrier height from the deck surface.", ps: 1500, why: "Decks settle, gardens get raised and a 950 mm rail becomes a fall hazard. The 100 mm gap rule is checked with a sphere." },
  { id: "deck-ledger", title: "Deck fixed through the cladding to the house", where: "Deck-to-house junction", severity: "high", clause: "E2", when: { conditions: ["deck-joist", "bearer"] },
    photo: "The junction: either a flashed ledger detail or a clear gap with the deck on its own posts.", ps: 1100, why: "A ledger bolted through weatherboards with no flashing is a leak straight into the floor framing." },
  { id: "post-footing", title: "Posts without H5 treatment or undersized footings", where: "Deck and pergola posts in or on the ground", severity: "medium", clause: "B2", when: { conditions: ["post"] },
    photo: "Treatment stamp on the post (H5 in ground), footing depth before the pour, a separator at the base.", ps: 700, why: "H3.2 posts in concrete rot at the collar within a decade." },
  { id: "hot-water-temp", title: "Hot water at the tap over 55 °C", where: "Baths and basins", severity: "medium", clause: "G12", when: { conditions: ["fixture"] },
    photo: "A thermometer reading at the bath tap after the tempering valve is set.", ps: 450, why: "Scalds in children and older people; a tempering valve is a small line that gets missed." },
  { id: "downlight-clearance", title: "Downlights not rated for insulation contact", where: "Insulated ceilings", severity: "medium", clause: "G9", when: { conditions: ["downlight"] },
    photo: "The fitting's IC or CA rating label, and the insulation around the fitting once it is in.", ps: 300, why: "A fire risk, and the usual reason a ceiling has a bare patch around each light." },
  { id: "subfloor-moisture", title: "Damp subfloor or slab under new flooring", where: "Floors receiving vinyl or carpet", severity: "low", clause: "E3", when: { conditions: ["vinyl", "carpet"] },
    photo: "A moisture meter reading on the slab or the subfloor, and a look under the house for ponding and ventilation.", ps: 500, why: "Vinyl plank lifts and carpet smells when laid over a damp substrate; a subfloor vent check is cheap." },
  { id: "door-access", title: "Doorway too narrow or threshold too high on the accessible route", where: "Entry and hall doors", severity: "low", clause: "D1", when: { conditions: ["int-door"] },
    photo: "Clear opening width with the door open, and the threshold step at the entry.", ps: 0, why: "Not always required in a house, but a cheap thing to get right while the door is out." },
];

// ---------------------------------------------------------------- trade labour rates (NZD per hour, ex GST). Fictional, editable on the desk.
export const TRADE_RATES = { Carpentry: 78, Linings: 70, Flooring: 65, Painting: 58, Plumbing: 98, Electrical: 96, Joinery: 82 };
// waste on materials by trade (%), illustrative
export const WASTE_PCT = { Carpentry: 10, Linings: 12, Flooring: 8, Painting: 5, Plumbing: 3, Electrical: 3, Joinery: 2 };

export const EXCLUSIONS = ["Building consent fees, PIM, engineering and council inspections", "Anything not drawn on the sheet or listed above", "Asbestos survey and removal, if the house is pre-2000", "Variations after approval, priced separately and approved before work continues", "Landscaping and reinstatement beyond the work area"];
export const QUOTE_TERMS = ["Valid 30 days from the date above", "GST at 15% shown separately on the whole", "Provisional sums are allowances; the actual cost is charged, with the record", "Progress claims monthly; final claim on practical completion", "Indicative only · not a quote: this is a simulation"];

// the variations the demo offers, one per sheet
export const VARIATIONS = {
  A101: { id: "V-A101-skirting", title: "Add skirting to the three bedrooms", who: "Ana Peterson (fictional client), by text at 2:10 pm", add: [{ element: "bed1", condition: "skirting" }, { element: "bed2", condition: "skirting" }, { element: "bed3", condition: "skirting" }], note: "A room tagged with skirting is measured on its perimeter." },
  A201: { id: "V-A201-posts", title: "Raise the deck 300 mm: longer posts and a step", who: "Josh Peterson (fictional client), on site", add: [{ element: "posts", condition: "post" }], note: "Re-measures the posts as the new count; the handrail check (F4) is flagged again because the fall grows." },
};
