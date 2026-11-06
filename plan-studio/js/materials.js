// assembl Plan Studio · materials. Real, specifiable NZ products where we can name them, generic assemblies where we cannot.
// Rules (research, Nov 2026):
//  - Only manufacturer-published values go in `data`, each with its source and the date we read it; conflicting documents are
//    shown as a range, never silently resolved. COLORSTEEL publishes LRV and TSR but no RGB, so every screen colour here is an
//    approximation (`approx: true`) and the UI says so: choose from a physical swatch.
//  - We link to the maker and to miproducts (the national product database linked to Masterspec) rather than shipping a copy of
//    their data: no licence for bulk redistribution was found.
//  - Māori design (carving, kōwhaiwhai, tukutuku patterns) is NOT offered as a texture: that work goes through engagement with
//    mana whenua and the artists (Te Aranga principles; Wai 262 categories). The model only reserves the surface.
export const MIPRODUCTS = "https://www.miproducts.co.nz/";

export const MATERIALS = {
  "cladding-vertical": { name: "Vertical timber cladding, shiplap", cat: "cladding", maker: "Generic: select a product (e.g. cedar or thermally modified radiata)", hex: "#8a6f58", approx: true, pattern: "boards-v", rough: 0.75,
    note: "Board width 140 mm shown. Confirm the product, its coating and its E2 cavity detail." },
  "cladding-fibre-cement": { name: "Fibre-cement weatherboard, painted", cat: "cladding", maker: "James Hardie (NZ range); colour per Resene chart", hex: "#d9d4cc", approx: true, pattern: "boards-h", rough: 0.6,
    links: ["https://www.jameshardie.co.nz/"], note: "James Hardie publishes BIM and CAD libraries; confirm the NZ profile." },
  "cladding-colorsteel-titania": { name: "COLORSTEEL® MAXAM, Titania", cat: "cladding", maker: "New Zealand Steel · COLORSTEEL®", hex: "#d8d6cf", approx: true, pattern: "rib-v", metal: 0.2, rough: 0.4,
    data: { LRV: "68–69%", TSR: "65–67%" }, src: "COLORSTEEL colours page (LRV 68, TSR 66) and Design Guide Aug 2023 (LRV 69, TSR 67): documents differ", links: ["https://www.colorsteel.co.nz/"] },
  "cladding-colorsteel-cloud": { name: "COLORSTEEL® MAXAM, Cloud", cat: "cladding", maker: "New Zealand Steel · COLORSTEEL®", hex: "#e4e3dd", approx: true, pattern: "rib-v", metal: 0.2, rough: 0.4,
    data: { LRV: "74–76%", TSR: "69–72%" }, src: "COLORSTEEL Design Guide (LRV 76, TSR 72) and an older brochure (74 / 69): documents differ", links: ["https://www.colorsteel.co.nz/"] },
  "roof-standing-seam": { name: "Standing-seam roofing, COLORSTEEL® MAXAM", cat: "roof", maker: "New Zealand Steel · COLORSTEEL® (colour: choose from the chart)", hex: "#3d3a38", approx: true, pattern: "seam", metal: 0.35, rough: 0.45,
    note: "MAXAM replaced Endura and Maxx; an EPD is published. Pick the colour from the chart: no RGB is published.", links: ["https://www.colorsteel.co.nz/"] },
  "roof-colorsteel-titania": { name: "Standing seam, COLORSTEEL® Titania", cat: "roof", maker: "New Zealand Steel · COLORSTEEL®", hex: "#d8d6cf", approx: true, pattern: "seam", metal: 0.25, rough: 0.4, data: { LRV: "68–69%", TSR: "65–67%" }, src: "as Titania cladding", links: ["https://www.colorsteel.co.nz/"] },
  "glass-curtain": { name: "Curtain wall, double-glazed low-E", cat: "glazing", maker: "Viridian (glass) in an aluminium curtain-wall system", hex: "#7f969f", approx: true, glass: true, rough: 0.05,
    data: { "Example IGU": "ClimaTech SuperGreen 6+12+6", VLT: "60%", U: "1.50 W/m²K", SHGC: "0.33" }, src: "Viridian performance PDF (WINDOW 7 / NFRC 100-2010); read from an extract, check the PDF", links: ["https://www.viridianglass.co.nz/"] },
  "window-thermal": { name: "Thermally broken aluminium window, double glazed", cat: "glazing", maker: "Generic: select a joinery supplier and IGU", hex: "#2b2b2c", approx: true, glass: true, rough: 0.3,
    note: "Whole-window R-value for H1 depends on the frame and the IGU: enter the supplier's tested value." },
  "door-timber": { name: "Solid-core timber door, clear finish", cat: "door", maker: "Generic", hex: "#9b7a5a", approx: true, rough: 0.6 },
  "door-glazed": { name: "Aluminium glazed door", cat: "door", maker: "Generic: matches the curtain wall", hex: "#2b2b2c", approx: true, glass: true, rough: 0.3 },
  "lining-plasterboard": { name: "Plasterboard lining, painted", cat: "lining", maker: "Generic; paint colour per Resene chart (Resene publishes RGB and LRV)", hex: "#ece8e3", approx: true, rough: 0.9, links: ["https://www.resene.co.nz/"] },
  "slab-concrete": { name: "Concrete slab, polished", cat: "floor", maker: "Generic", hex: "#a8a29d", approx: true, pattern: "concrete", rough: 0.5 },
  "timber-ceiling": { name: "Timber ceiling battens", cat: "lining", maker: "Generic", hex: "#a5835f", approx: true, pattern: "boards-h", rough: 0.6 },
  "cultural-panel": { name: "Reserved: cultural design panel", cat: "cultural", maker: "Commissioned with mana whenua and the artists", hex: "#b89a77", approx: true, rough: 0.7, reserved: true,
    note: "A placeholder only. Carving, kōwhaiwhai and tukutuku are designed with mana whenua and the artists, not taken from a texture library." },
};

export const CATEGORY_LABEL = { cladding: "Cladding", roof: "Roofing", glazing: "Glazing", door: "Doors", lining: "Linings", floor: "Floors", cultural: "Cultural design" };
export const byCategory = (cat) => Object.entries(MATERIALS).filter(([, m]) => m.cat === cat).map(([id, m]) => ({ id, ...m }));

// small procedural textures (canvas), so the 3D model reads as the material without shipping anyone's image files
export function textureCanvas(id, size = 256) {
  const m = MATERIALS[id]; if (!m || typeof document === "undefined") return null;
  const c = document.createElement("canvas"); c.width = c.height = size; const g = c.getContext("2d");
  g.fillStyle = m.hex; g.fillRect(0, 0, size, size);
  const shade = (a) => `rgba(0,0,0,${a})`, light = (a) => `rgba(255,255,255,${a})`;
  if (m.pattern === "boards-v" || m.pattern === "boards-h") {
    const n = 8, step = size / n;
    for (let i = 0; i < n; i++) {
      const v = (Math.sin(i * 12.9898) * 43758.5453) % 1, t = 0.04 + Math.abs(v) * 0.06;
      g.fillStyle = (i % 2 ? shade : light)(t);
      if (m.pattern === "boards-v") g.fillRect(i * step, 0, step, size); else g.fillRect(0, i * step, size, step);
      g.fillStyle = shade(0.35);
      if (m.pattern === "boards-v") g.fillRect(i * step, 0, 2, size); else g.fillRect(0, i * step, size, 2);
    }
    for (let k = 0; k < 400; k++) { g.fillStyle = shade(Math.random() * 0.05); const x = Math.random() * size, y = Math.random() * size; m.pattern === "boards-v" ? g.fillRect(x, y, 1, 18) : g.fillRect(x, y, 18, 1); }
  } else if (m.pattern === "seam" || m.pattern === "rib-v") {
    const n = m.pattern === "seam" ? 4 : 8, step = size / n;
    for (let i = 0; i < n; i++) { g.fillStyle = light(0.12); g.fillRect(i * step, 0, 3, size); g.fillStyle = shade(0.25); g.fillRect(i * step + 3, 0, 2, size); }
  } else if (m.pattern === "concrete") {
    for (let k = 0; k < 2500; k++) { g.fillStyle = (Math.random() > 0.5 ? shade : light)(Math.random() * 0.06); g.fillRect(Math.random() * size, Math.random() * size, 2, 2); }
  }
  return c;
}
