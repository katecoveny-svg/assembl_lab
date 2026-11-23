// The rules behind the "Finished look" for an opened IFC or GLB (dressModel.ts), kept free of three.js so they can be tested
// on their own: which finish each part gets from its IFC class and material name, the glass tint, and where planting may go.
//
// Everything here is an interpretation of the model's own classes and material names. Nothing is read from a specification,
// and nothing moves or adds a building element: a finish changes how a surface is drawn, never where it is.

export type Finish =
  | 'glass' | 'mullion' | 'roof' | 'brick' | 'timberCladding' | 'concrete' | 'render' | 'plaster' | 'slab' | 'paving'
  | 'decking' | 'frameMetal' | 'frameTimber' | 'timber' | 'fabric' | 'metal' | 'stone' | 'tile' | 'lawn' | 'bed' | 'neutral';

/** what a finish is called on the page, and its colour in the finished look (sRGB hex) */
export const FINISHES: Record<Finish, { label: string; colour: number }> = {
  glass: { label: 'tinted glass', colour: 0xffffff },
  mullion: { label: 'dark anodised aluminium', colour: 0x2b2b2d },
  roof: { label: 'standing-seam metal roofing', colour: 0x34373a },
  brick: { label: 'clay brick', colour: 0x9a5a44 },
  timberCladding: { label: 'vertical timber cladding, oiled', colour: 0x8a6a4e },
  concrete: { label: 'board-smooth concrete', colour: 0xb0aca4 },
  render: { label: 'fine sand-finish render', colour: 0xd9d1c4 },
  plaster: { label: 'painted plaster', colour: 0xece7de },
  slab: { label: 'honed concrete', colour: 0xb9b4ab },
  paving: { label: 'herringbone clay pavers', colour: 0xa58e78 },
  decking: { label: 'hardwood decking', colour: 0x8c6447 },
  frameMetal: { label: 'powder-coated aluminium frame', colour: 0x2e2f31 },
  frameTimber: { label: 'stained timber frame', colour: 0x7a5a40 },
  timber: { label: 'oiled oak', colour: 0xb08d64 },
  fabric: { label: 'woven upholstery', colour: 0x8f8a80 },
  metal: { label: 'satin steel', colour: 0x8e9093 },
  stone: { label: 'stone flags', colour: 0xb7b0a4 },
  tile: { label: 'porcelain tile', colour: 0xc9c4bb },
  lawn: { label: 'lawn', colour: 0xffffff },
  bed: { label: 'planted bed, bark mulch', colour: 0x5a4636 },
  neutral: { label: 'fine-textured neutral finish', colour: 0xd8d3ca },
};

export interface PartInfo {
  /** IFC class in any case: IFCWALLSTANDARDCASE, IfcWall, ifcwall… ('' when the file gives none) */
  cls: string;
  /** the element's Name */
  name?: string;
  /** the material or surface style name, if the file has one */
  material?: string;
  /** the part's colour, 0 to 1, and its opacity */
  rgb?: [number, number, number] | null;
  opacity?: number;
}

export interface Rule {
  id: string;
  /** canonical IFC classes this rule is for (any when left out) */
  cls?: string[];
  /** matched against the material name, then the element's name */
  words?: RegExp;
  /** only see-through parts (true) or only solid ones (false) */
  clear?: boolean;
  finish: Finish;
  why: string;
}

// --- IFC class names ---------------------------------------------------------------------------------------------------
const KNOWN = [
  'IfcWallStandardCase', 'IfcWallElementedCase', 'IfcWall', 'IfcCurtainWall', 'IfcPlate', 'IfcMember', 'IfcRoof', 'IfcSlab',
  'IfcCovering', 'IfcDoor', 'IfcWindow', 'IfcFurnishingElement', 'IfcFurniture', 'IfcSystemFurnitureElement',
  'IfcBuildingElementProxy', 'IfcRailing', 'IfcStair', 'IfcStairFlight', 'IfcRamp', 'IfcRampFlight', 'IfcColumn', 'IfcBeam',
  'IfcFooting', 'IfcPile', 'IfcSite', 'IfcGeographicElement', 'IfcCivilElement', 'IfcFlowTerminal', 'IfcSanitaryTerminal',
  'IfcLightFixture', 'IfcChimney', 'IfcShadingDevice', 'IfcSpace', 'IfcOpeningElement',
];
const BY_UPPER = new Map(KNOWN.map((k) => [k.toUpperCase(), k]));
/** IFCWALLSTANDARDCASE, ifcwall, IfcWall → the class as IFC writes it ('' for nothing) */
export function normClass(s: string | undefined | null) {
  if (!s) return '';
  const t = String(s).trim();
  const hit = BY_UPPER.get(t.toUpperCase());
  if (hit) return hit;
  // an unknown class: Ifc + capitalised rest
  return /^ifc/i.test(t) ? 'Ifc' + t.slice(3, 4).toUpperCase() + t.slice(4).toLowerCase() : t;
}

const WALLS = ['IfcWall', 'IfcWallStandardCase', 'IfcWallElementedCase', 'IfcChimney'];
const SITE = ['IfcSite', 'IfcGeographicElement', 'IfcCivilElement', 'IfcBuildingElementProxy'];
const FURN = ['IfcFurnishingElement', 'IfcFurniture', 'IfcSystemFurnitureElement'];
const OPENINGS = ['IfcDoor', 'IfcWindow'];
const STRUCT = ['IfcColumn', 'IfcBeam', 'IfcFooting', 'IfcPile', 'IfcStair', 'IfcStairFlight', 'IfcRamp', 'IfcRampFlight'];

// --- the table ---------------------------------------------------------------------------------------------------------
// First match wins. Edit here: every rule says why, and the page shows that reason against each part.
const GLASSY = /\b(glass|glazing|glazed|glaz|vitr|pane|window ?glass)\b|glass/i;
const TIMBER = /timber|wood|cedar|oak|pine|larch|kwila|ply(wood)?\b|veneer|bamboo|totara|rimu|macrocarpa|weatherboard/i;
const BRICK = /brick|masonry|clay block|bagged/i;
const CONCRETE = /concrete|precast|tilt.?slab|cement|cast.?in.?place|\bcip\b|blockwork|concrete block|\bblock\b/i;
const PLASTER = /plaster|stucco|render|gib|plasterboard|gypsum|paint/i;
const METAL = /metal|steel|alu|alumin|zinc|copper|chrome|stainless|iron|colorsteel|anodis/i;
const FABRIC = /fabric|upholster|textile|cushion|sofa|couch|lounge|armchair|carpet|wool|leather|curtain|drape|mattress|bed\b/i;
const PAVING = /pav(er|ing|ers)|terrace|patio|courtyard|foot ?path|\bpath|driveway|hardscape|hard landscap|kerb|forecourt|plaza/i;
const LAWN = /lawn|grass|turf/i;
const BED = /plant(ing|ed|s)?\b|garden|\bbed\b|mulch|soil|vegetat|shrub|landscap/i;
const GROUND = /topo|terrain|ground|site|earth|existing ground/i;

export const RULES: Rule[] = [
  // glazing, wherever it sits
  { id: 'glass-by-name', words: GLASSY, finish: 'glass', why: 'its material is named as glass' },
  { id: 'curtain-panel-clear', cls: ['IfcCurtainWall', 'IfcPlate'], clear: true, finish: 'glass', why: 'a see-through curtain-wall panel' },
  { id: 'opening-clear', cls: [...OPENINGS, 'IfcCovering', 'IfcBuildingElementProxy', 'IfcRoof', 'IfcSlab'], clear: true, finish: 'glass', why: 'the see-through part of the element' },
  { id: 'curtain-panel-metal', cls: ['IfcCurtainWall', 'IfcPlate'], words: METAL, finish: 'metal', why: 'a curtain-wall panel named as metal (a spandrel)' },
  { id: 'curtain-panel', cls: ['IfcCurtainWall', 'IfcPlate'], finish: 'glass', why: 'curtain-wall panels and plates are taken as glazing' },
  // frames and mullions
  { id: 'member-timber', cls: ['IfcMember'], words: TIMBER, finish: 'timber', why: 'a member named as timber' },
  { id: 'member', cls: ['IfcMember'], finish: 'mullion', why: 'members (mullions, transoms) are taken as aluminium' },
  { id: 'frame-timber', cls: OPENINGS, words: TIMBER, finish: 'frameTimber', why: 'a door or window frame named as timber' },
  { id: 'frame', cls: OPENINGS, finish: 'frameMetal', why: 'the solid part of a door or window: its frame' },
  // roof
  { id: 'roof', cls: ['IfcRoof'], finish: 'roof', why: 'roofs are taken as standing-seam metal' },
  { id: 'roof-covering', cls: ['IfcCovering', 'IfcSlab'], words: /roof/i, finish: 'roof', why: 'a roof covering or roof slab' },
  // site surfaces
  { id: 'site-paving', cls: [...SITE, 'IfcSlab'], words: PAVING, finish: 'paving', why: 'a site surface named as paving or a path' },
  { id: 'site-lawn', cls: SITE, words: LAWN, finish: 'lawn', why: 'a site surface named as lawn' },
  { id: 'site-bed', cls: SITE, words: BED, finish: 'bed', why: 'a site surface named as planting' },
  { id: 'site-ground', cls: ['IfcSite', 'IfcGeographicElement'], finish: 'lawn', why: 'the site’s own ground, taken as grass' },
  { id: 'site-ground-named', cls: SITE, words: GROUND, finish: 'lawn', why: 'a surface named as ground or topography, taken as grass' },
  // walls by what they are made of
  { id: 'wall-brick', cls: WALLS, words: BRICK, finish: 'brick', why: 'a wall named as brick or masonry' },
  { id: 'wall-timber', cls: [...WALLS, 'IfcCovering'], words: TIMBER, finish: 'timberCladding', why: 'a wall or cladding named as timber' },
  { id: 'wall-concrete', cls: WALLS, words: CONCRETE, finish: 'concrete', why: 'a wall named as concrete' },
  { id: 'wall-plaster', cls: WALLS, words: PLASTER, finish: 'plaster', why: 'a wall named as plaster or paint' },
  { id: 'wall-metal', cls: [...WALLS, 'IfcCovering'], words: METAL, finish: 'metal', why: 'a wall or cladding named as metal' },
  { id: 'wall', cls: WALLS, finish: 'render', why: 'a wall with no material named: a fine-textured render' },
  // slabs
  { id: 'slab-deck', cls: ['IfcSlab', 'IfcCovering'], words: /deck/i, finish: 'decking', why: 'a slab named as a deck' },
  { id: 'slab-tile', cls: ['IfcSlab', 'IfcCovering'], words: /tile|porcelain|ceramic/i, finish: 'tile', why: 'a floor named as tile' },
  { id: 'slab-timber', cls: ['IfcSlab', 'IfcCovering'], words: TIMBER, finish: 'timber', why: 'a floor named as timber' },
  { id: 'slab-stone', cls: ['IfcSlab', 'IfcCovering'], words: /stone|granite|basalt|marble|travertine|limestone/i, finish: 'stone', why: 'a floor named as stone' },
  { id: 'slab', cls: ['IfcSlab'], finish: 'slab', why: 'slabs are taken as honed concrete' },
  { id: 'covering', cls: ['IfcCovering'], words: PLASTER, finish: 'plaster', why: 'a lining named as plaster or paint' },
  // furniture
  { id: 'furn-fabric', cls: FURN, words: FABRIC, finish: 'fabric', why: 'furniture named as upholstered' },
  { id: 'furn-timber', cls: FURN, words: TIMBER, finish: 'timber', why: 'furniture named as timber' },
  { id: 'furn-metal', cls: FURN, words: METAL, finish: 'metal', why: 'furniture named as metal' },
  { id: 'furn-seat', cls: FURN, words: /chair|seat|stool|bench|sofa|ottoman|pouf/i, finish: 'fabric', why: 'a seat, taken as upholstered' },
  { id: 'furn', cls: FURN, finish: 'timber', why: 'furniture with nothing named: taken as timber' },
  // structure, stairs, rails
  { id: 'rail', cls: ['IfcRailing'], words: GLASSY, finish: 'glass', why: 'a glass balustrade' },
  { id: 'rail-timber', cls: ['IfcRailing'], words: TIMBER, finish: 'timber', why: 'a timber rail' },
  { id: 'rail', cls: ['IfcRailing'], finish: 'mullion', why: 'rails are taken as dark metal' },
  { id: 'struct-steel', cls: STRUCT, words: METAL, finish: 'metal', why: 'structure named as steel' },
  { id: 'struct-timber', cls: STRUCT, words: TIMBER, finish: 'timber', why: 'structure named as timber' },
  { id: 'struct', cls: STRUCT, finish: 'concrete', why: 'structure and stairs with nothing named: taken as concrete' },
  { id: 'shading', cls: ['IfcShadingDevice'], words: TIMBER, finish: 'timber', why: 'timber shading' },
  { id: 'shading', cls: ['IfcShadingDevice'], finish: 'mullion', why: 'shading devices are taken as dark aluminium' },
  // by material name alone (a GLB with no classes, or a class the table does not list)
  { id: 'mat-brick', words: BRICK, finish: 'brick', why: 'its material is named as brick' },
  { id: 'mat-paving', words: PAVING, finish: 'paving', why: 'its material is named as paving' },
  { id: 'mat-lawn', words: LAWN, finish: 'lawn', why: 'its material is named as grass' },
  { id: 'mat-fabric', words: FABRIC, finish: 'fabric', why: 'its material is named as fabric' },
  { id: 'mat-timber', words: TIMBER, finish: 'timber', why: 'its material is named as timber' },
  { id: 'mat-concrete', words: CONCRETE, finish: 'concrete', why: 'its material is named as concrete' },
  { id: 'mat-metal', words: METAL, finish: 'metal', why: 'its material is named as metal' },
  { id: 'mat-tile', words: /tile|porcelain|ceramic/i, finish: 'tile', why: 'its material is named as tile' },
  { id: 'mat-stone', words: /stone|granite|basalt|marble|travertine|limestone/i, finish: 'stone', why: 'its material is named as stone' },
  { id: 'mat-plaster', words: PLASTER, finish: 'plaster', why: 'its material is named as plaster or paint' },
  { id: 'proxy', cls: ['IfcBuildingElementProxy'], finish: 'neutral', why: 'a generic element: a neutral textured finish' },
  { id: 'default', finish: 'neutral', why: 'nothing in its class or material name says more: a neutral textured finish' },
];

/** a material name that says nothing: empty, a default, the class itself, or a colour key */
export function namedMaterial(material: string | undefined, cls = '') {
  const m = (material ?? '').trim();
  if (!m) return false;
  if (/^(default|material|none|null|undefined|surface ?style|style|\d+)$/i.test(m)) return false;
  if (/^ifc_[\d.,]+$/i.test(m) || /^ifc[a-z]+$/i.test(m.replace(/\s|_/g, '')) && (!cls || normClass(m) === normClass(cls) || BY_UPPER.has(m.toUpperCase()))) return false;
  return true;
}

export interface Classified { finish: Finish; rule: string; why: string }
export function classify(p: PartInfo, rules: Rule[] = RULES): Classified {
  const cls = normClass(p.cls);
  const mat = namedMaterial(p.material, cls) ? p.material ?? '' : '';
  const text = [mat, p.name ?? ''].filter(Boolean).join(' · ');
  const clear = (p.opacity ?? 1) < 0.95;
  for (const r of rules) {
    if (r.cls && !r.cls.includes(cls)) continue;
    if (r.clear !== undefined && r.clear !== clear) continue;
    if (r.words && !(r.words.test(mat) || r.words.test(p.name ?? ''))) continue;
    // a rule with no class and no words is only the catch-all
    return { finish: r.finish, rule: r.id, why: r.why + (text ? ` (“${text.slice(0, 80)}”)` : '') };
  }
  return { finish: 'neutral', rule: 'default', why: 'nothing matched' };
}

// --- colour ------------------------------------------------------------------------------------------------------------
const chroma = (c: [number, number, number]) => Math.max(...c) - Math.min(...c);
/** a colour worth keeping: the part has a named material and a colour that is not a grey or a plain default */
export function meaningfulColour(p: PartInfo) {
  if (!p.rgb) return false;
  if (!namedMaterial(p.material, p.cls)) return false;
  return chroma(p.rgb) > 0.06;
}
export const BRONZE_GREY: [number, number, number] = [0.62, 0.6, 0.55];
/** the glass tint: the model's own colour when its material is named and the colour is not grey, else a neutral bronze-grey */
export function glassTint(p: PartInfo): { rgb: [number, number, number]; from: 'model' | 'default' } {
  if (p.rgb && namedMaterial(p.material, p.cls) && chroma(p.rgb) > 0.04) {
    // keep the hue, lift it so the glass reads as tinted rather than painted
    const mx = Math.max(...p.rgb, 1e-3);
    return { rgb: p.rgb.map((v) => Math.min(1, 0.35 + 0.65 * (v / mx))) as [number, number, number], from: 'model' };
  }
  return { rgb: BRONZE_GREY, from: 'default' };
}
export const hexOf = (c: [number, number, number]) => (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255);

// --- material names from an IFC's own text -----------------------------------------------------------------------------
/** element express id → material names (IfcRelAssociatesMaterial, through layer sets, constituents and profiles), and
 *  surface style names by colour (IfcSurfaceStyle → its rendering's colour), from the IFC text. */
export function ifcMaterialNames(text: string) {
  const line = new Map<number, string>();
  const re = /#(\d+)\s*=\s*(IFC(?:MATERIAL\w*|RELASSOCIATESMATERIAL|SURFACESTYLE\w*|COLOURRGB)\s*\([^;]*\));/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) line.set(Number(m[1]), m[2]);
  const refs = (s: string) => [...s.matchAll(/#(\d+)/g)].map((x) => Number(x[1]));
  const names = new Map<number, string[]>();
  const nameOf = (id: number, depth = 0): string[] => {
    if (depth > 6) return [];
    const l = line.get(id);
    if (!l) return [];
    const head = l.slice(0, l.indexOf('(')).toUpperCase();
    if (head === 'IFCMATERIAL') { const n = /^IFCMATERIAL\s*\(\s*'((?:[^']|'')*)'/i.exec(l); return n ? [n[1].replace(/''/g, "'")] : []; }
    return refs(l.slice(l.indexOf('('))).flatMap((r) => nameOf(r, depth + 1));
  };
  for (const [, l] of line) {
    if (!/^IFCRELASSOCIATESMATERIAL/i.test(l)) continue;
    const parts = /\(\s*([^()]*)\)\s*,\s*#(\d+)\s*\)\s*$/.exec(l);
    if (!parts) continue;
    const mats = [...new Set(nameOf(Number(parts[2])))];
    if (!mats.length) continue;
    for (const e of refs(parts[1])) names.set(e, [...new Set([...(names.get(e) ?? []), ...mats])]);
  }
  const styles: { name: string; rgb: [number, number, number] }[] = [];
  for (const [, l] of line) {
    const s = /^IFCSURFACESTYLE\s*\(\s*'((?:[^']|'')*)'\s*,[^,]*,\s*\(([^)]*)\)/i.exec(l);
    if (!s) continue;
    for (const r of refs(s[2])) {
      const rl = line.get(r);
      const col = rl && /\(\s*#(\d+)/.exec(rl.slice(rl.indexOf('(')));
      const c = col && line.get(Number(col[1]));
      const v = c && /IFCCOLOURRGB\s*\(\s*(?:\$|'[^']*')\s*,\s*([\d.eE+-]+)\s*,\s*([\d.eE+-]+)\s*,\s*([\d.eE+-]+)/i.exec(c);
      if (v) { styles.push({ name: s[1].replace(/''/g, "'"), rgb: [Number(v[1]), Number(v[2]), Number(v[3])] }); break; }
    }
  }
  return { names, styles };
}
/** the surface style whose colour is this one (within a small tolerance) */
export function styleFor(styles: { name: string; rgb: [number, number, number] }[], rgb: [number, number, number]) {
  let best: string | undefined, bd = 0.02;
  for (const s of styles) { const d = Math.abs(s.rgb[0] - rgb[0]) + Math.abs(s.rgb[1] - rgb[1]) + Math.abs(s.rgb[2] - rgb[2]); if (d < bd) { bd = d; best = s.name; } }
  return best;
}

// --- where planting may go ---------------------------------------------------------------------------------------------
// A grid over the ground round the model, 0.5 m cells: the building's footprint (everything the building covers, eaves
// included, and anything walled in by it), hard surfaces (the model's paving and paths), the model's own landscape areas,
// and keep-clear strips in front of doors. Planting goes only where none of those say no.
export const CELL = 0.5;
export interface Grid {
  x0: number; z0: number; nx: number; nz: number; cell: number;
  /** 1: covered by the building */
  occ: Uint8Array;
  /** 1: the model's paving or path */
  hard: Uint8Array;
  /** 1: the model's lawn or ground, 2: the model's planting bed */
  soft: Uint8Array;
  /** height of the model's landscape surface in the cell (NaN where it has none) */
  y: Float32Array;
  /** 1: keep clear (in front of a door) */
  clear: Uint8Array;
}
export function makeGrid(min: [number, number], max: [number, number], margin: number, cell = CELL): Grid {
  const x0 = Math.floor((min[0] - margin) / cell) * cell, z0 = Math.floor((min[1] - margin) / cell) * cell;
  const nx = Math.ceil((max[0] + margin - x0) / cell), nz = Math.ceil((max[1] + margin - z0) / cell), n = nx * nz;
  return { x0, z0, nx, nz, cell, occ: new Uint8Array(n), hard: new Uint8Array(n), soft: new Uint8Array(n), y: new Float32Array(n).fill(NaN), clear: new Uint8Array(n) };
}
const ci = (g: Grid, x: number, z: number) => { const i = Math.floor((x - g.x0) / g.cell), j = Math.floor((z - g.z0) / g.cell); return i < 0 || j < 0 || i >= g.nx || j >= g.nz ? -1 : j * g.nx + i; };
export const cellAt = ci;
/** mark the cells under an axis-aligned rectangle */
export function markRect(g: Grid, layer: Uint8Array, x0: number, z0: number, x1: number, z1: number, v = 1) {
  const i0 = Math.max(0, Math.floor((x0 - g.x0) / g.cell)), i1 = Math.min(g.nx - 1, Math.floor((x1 - g.x0) / g.cell));
  const j0 = Math.max(0, Math.floor((z0 - g.z0) / g.cell)), j1 = Math.min(g.nz - 1, Math.floor((z1 - g.z0) / g.cell));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) layer[j * g.nx + i] = v;
}
/** mark the cells a triangle's outline crosses (enough for the footprint: what it walls in is filled afterwards) */
export function markTriEdges(g: Grid, layer: Uint8Array, a: number[], b: number[], c: number[], v = 1) {
  const step = g.cell * 0.5;
  for (const [p, q] of [[a, b], [b, c], [c, a]]) {
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.ceil(L / step));
    for (let k = 0; k <= n; k++) { const t = k / n, i = ci(g, p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t); if (i >= 0) layer[i] = v; }
  }
}
/** fill the cells whose centres a triangle covers (x, z, and y for the height layer) */
export function fillTri(g: Grid, layer: Uint8Array, a: number[], b: number[], c: number[], v = 1, keepHigher = true) {
  const minx = Math.min(a[0], b[0], c[0]), maxx = Math.max(a[0], b[0], c[0]), minz = Math.min(a[1], b[1], c[1]), maxz = Math.max(a[1], b[1], c[1]);
  const i0 = Math.max(0, Math.floor((minx - g.x0) / g.cell)), i1 = Math.min(g.nx - 1, Math.floor((maxx - g.x0) / g.cell));
  const j0 = Math.max(0, Math.floor((minz - g.z0) / g.cell)), j1 = Math.min(g.nz - 1, Math.floor((maxz - g.z0) / g.cell));
  const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  if (Math.abs(d) < 1e-9) { markTriEdges(g, layer, a, b, c, v); return; }
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const x = g.x0 + (i + 0.5) * g.cell, z = g.z0 + (j + 0.5) * g.cell;
    const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (z - c[1])) / d, l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (z - c[1])) / d, l3 = 1 - l1 - l2;
    if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
    const k = j * g.nx + i;
    layer[k] = v;
    if (a.length > 2) { const y = l1 * a[2] + l2 * b[2] + l3 * c[2]; if (!(g.y[k] >= y) || !keepHigher) g.y[k] = y; }
  }
}
/** everything the building's outline walls in joins its footprint: flood the open ground from the grid's edge */
export function fillFootprint(g: Grid) {
  const out = new Uint8Array(g.occ.length), st: number[] = [];
  const push = (k: number) => { if (!out[k] && !g.occ[k]) { out[k] = 1; st.push(k); } };
  for (let i = 0; i < g.nx; i++) { push(i); push((g.nz - 1) * g.nx + i); }
  for (let j = 0; j < g.nz; j++) { push(j * g.nx); push(j * g.nx + g.nx - 1); }
  while (st.length) {
    const k = st.pop()!, i = k % g.nx, j = (k - i) / g.nx;
    if (i > 0) push(k - 1); if (i < g.nx - 1) push(k + 1); if (j > 0) push(k - g.nx); if (j < g.nz - 1) push(k + g.nx);
  }
  for (let k = 0; k < out.length; k++) if (!out[k]) g.occ[k] = 1;
}
/** metres from each cell to the nearest footprint cell (two-pass chamfer) */
export function distanceToFootprint(g: Grid) {
  const D = new Float32Array(g.occ.length).fill(1e9), s = g.cell, dg = s * Math.SQRT2;
  for (let k = 0; k < D.length; k++) if (g.occ[k]) D[k] = 0;
  for (let j = 0; j < g.nz; j++) for (let i = 0; i < g.nx; i++) {
    const k = j * g.nx + i; let d = D[k];
    if (i > 0) d = Math.min(d, D[k - 1] + s);
    if (j > 0) { d = Math.min(d, D[k - g.nx] + s); if (i > 0) d = Math.min(d, D[k - g.nx - 1] + dg); if (i < g.nx - 1) d = Math.min(d, D[k - g.nx + 1] + dg); }
    D[k] = d;
  }
  for (let j = g.nz - 1; j >= 0; j--) for (let i = g.nx - 1; i >= 0; i--) {
    const k = j * g.nx + i; let d = D[k];
    if (i < g.nx - 1) d = Math.min(d, D[k + 1] + s);
    if (j < g.nz - 1) { d = Math.min(d, D[k + g.nx] + s); if (i < g.nx - 1) d = Math.min(d, D[k + g.nx + 1] + dg); if (i > 0) d = Math.min(d, D[k + g.nx - 1] + dg); }
    D[k] = d;
  }
  return D;
}
/** a keep-clear strip through a door: its width plus 0.6 m, `reach` metres out each side along its thin axis */
export function markDoor(g: Grid, box: { min: [number, number]; max: [number, number] }, reach = 3) {
  const w = box.max[0] - box.min[0], d = box.max[1] - box.min[1], cx = (box.min[0] + box.max[0]) / 2, cz = (box.min[1] + box.max[1]) / 2;
  if (w >= d) markRect(g, g.clear, cx - w / 2 - 0.3, cz - reach, cx + w / 2 + 0.3, cz + reach);
  else markRect(g, g.clear, cx - reach, cz - d / 2 - 0.3, cx + reach, cz + d / 2 + 0.3);
}

export type Shrub = 'harakeke' | 'tussock' | 'carex' | 'ponga' | 'tikouka';
export type TreeKind = 'pohutukawa' | 'kanuka';
export interface Spot { x: number; z: number; y: number; sp: Shrub; s: number }
export interface TreeSpot { x: number; z: number; y: number; h: number; r: number; kind: TreeKind }
export interface PlantPlan { shrubs: Spot[]; trees: TreeSpot[]; where: 'model' | 'ring'; said: string }

const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const h2 = (x: number, z: number) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
/** smooth value noise on the ground, 0 to 1, about `scale` metres across a blob */
function blob(x: number, z: number, scale: number) {
  const X = x / scale, Z = z / scale, xi = Math.floor(X), zi = Math.floor(Z), fx = X - xi, fz = Z - zi, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = h2(xi, zi), b = h2(xi + 1, zi), c = h2(xi, zi + 1), d = h2(xi + 1, zi + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

export interface PlanOpts {
  seed?: number;
  /** the direction the opening view looks from, on the ground (x, z), and the centre it looks at: no trees in that wedge */
  view?: { from: [number, number]; at: [number, number]; half?: number };
  /** ground level when the model has no landscape surface there */
  baseY?: number;
  /** caps, so a huge model does not plant a forest */
  maxShrubs?: number; maxTrees?: number;
}
/** where it is allowed: not the building, not paving, not a door strip, and inside the grid */
export function allowed(g: Grid, x: number, z: number, pad = 0) {
  const r = Math.ceil(pad / g.cell);
  const i = Math.floor((x - g.x0) / g.cell), j = Math.floor((z - g.z0) / g.cell);
  for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    const ii = i + di, jj = j + dj;
    if (ii < 0 || jj < 0 || ii >= g.nx || jj >= g.nz) return false;
    const k = jj * g.nx + ii;
    if (g.occ[k] || g.hard[k] || g.clear[k]) return false;
  }
  return true;
}
/**
 * The proposed planting: shrubs and grasses in drifts (harakeke, tussock, carex, with ponga and tī kōuka for height), and a
 * few native trees standing back from the building. With landscape areas in the model, shrubs go only in its planting beds
 * (or, with lawn only, along the lawn's edge by the building) and trees on its lawn or ground; without, in a ring on open
 * ground round the footprint. Never inside the footprint, on paving or paths, or in a door's keep-clear strip.
 */
export function planPlanting(g: Grid, o: PlanOpts = {}): PlantPlan {
  const R = rng(o.seed ?? 7), D = distanceToFootprint(g), base = o.baseY ?? 0;
  let beds = 0, lawn = 0;
  for (let k = 0; k < g.soft.length; k++) { if (g.soft[k] === 2) beds++; else if (g.soft[k] === 1) lawn++; }
  const where: PlantPlan['where'] = beds + lawn > 0 ? 'model' : 'ring';
  const order: number[] = [];
  for (let k = 0; k < D.length; k++) order.push(k);
  for (let k = order.length - 1; k > 0; k--) { const r = Math.floor(R() * (k + 1)); [order[k], order[r]] = [order[r], order[k]]; }
  const centre = (k: number): [number, number] => { const i = k % g.nx, j = (k - i) / g.nx; return [g.x0 + (i + 0.5) * g.cell + (R() - 0.5) * g.cell * 0.8, g.z0 + (j + 0.5) * g.cell + (R() - 0.5) * g.cell * 0.8]; };
  const yAt = (k: number) => (Number.isFinite(g.y[k]) ? g.y[k] : base);
  const shrubs: Spot[] = [], trees: TreeSpot[] = [];
  const SPACE: Record<Shrub, number> = { harakeke: 1.5, tussock: 0.75, carex: 0.6, ponga: 3.2, tikouka: 4.5 };
  const near = (x: number, z: number, d: number, list: { x: number; z: number }[]) => list.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < d * d);
  const maxS = o.maxShrubs ?? 900, maxT = o.maxTrees ?? 14;
  // the opening view's wedge: no trees there, and no tall shrubs (ponga, tī kōuka) to stand in front of the camera
  const vw = o.view, half = vw?.half ?? 0.7;
  const inView = (x: number, z: number) => {
    if (!vw) return false;
    const fx = vw.from[0] - vw.at[0], fz = vw.from[1] - vw.at[1], px = x - vw.at[0], pz = z - vw.at[1];
    const a = Math.acos(Math.max(-1, Math.min(1, (fx * px + fz * pz) / ((Math.hypot(fx, fz) || 1) * (Math.hypot(px, pz) || 1)))));
    return a < half;
  };
  // shrubs
  for (const k of order) {
    if (shrubs.length >= maxS) break;
    const d = D[k];
    const inBed = g.soft[k] === 2, inLawn = g.soft[k] === 1;
    if (where === 'model') { if (!(inBed || (!beds && inLawn && d > 0.8 && d < 3.2))) continue; }
    else if (!(d > 0.9 && d < 4.8)) continue;
    const [x, z] = centre(k);
    if (!allowed(g, x, z, 0.35)) continue;
    // drifts: planting comes and goes in blobs a few metres across, with open ground between
    const b = blob(x, z, 4.5);
    if (!inBed && b < 0.42) continue;
    const pick = blob(x + 50, z - 30, 3.2);
    // ponga and tī kōuka are the accents: a few, for height, never a hedge of them
    const tall = shrubs.filter((s) => s.sp === 'ponga' || s.sp === 'tikouka').length < Math.max(2, Math.round(maxS / 60));
    const sp: Shrub = tall && d > 3.4 && R() < 0.03 ? 'tikouka' : tall && d > 2.4 && R() < 0.03 ? 'ponga' : pick < 0.38 ? 'harakeke' : pick < 0.72 ? 'tussock' : 'carex';
    if (sp === 'ponga' || sp === 'tikouka') { if (!allowed(g, x, z, 1.2) || inView(x, z)) continue; }
    if (near(x, z, SPACE[sp], shrubs.filter((s) => s.sp === sp)) || near(x, z, 0.55, shrubs)) continue;
    shrubs.push({ x, z, y: yAt(k), sp, s: sp === 'harakeke' ? 0.85 + R() * 0.4 : sp === 'ponga' ? 2.4 + R() * 1.4 : sp === 'tikouka' ? 4 + R() * 1.5 : 0.85 + R() * 0.35 });
  }
  // trees, standing back: 6 to 22 m out on open ground (or on the model's lawn and ground)
  for (const k of order) {
    if (trees.length >= maxT) break;
    const d = D[k];
    if (d < 6 || d > 22) continue;
    if (where === 'model' && !g.soft[k]) continue;
    const [x, z] = centre(k);
    if (!allowed(g, x, z, 2.2) || inView(x, z)) continue;
    if (near(x, z, 8, trees) || near(x, z, 2.5, shrubs)) continue;
    const kind: TreeKind = R() < 0.45 ? 'pohutukawa' : 'kanuka';
    trees.push(kind === 'pohutukawa' ? { x, z, y: yAt(k), kind, h: 7 + R() * 3, r: 4 + R() * 1.6 } : { x, z, y: yAt(k), kind, h: 6.5 + R() * 3, r: 2.2 + R() * 0.9 });
  }
  const said = where === 'model'
    ? (beds ? 'in the model’s own planting areas' : 'along the model’s lawn by the building') + ', with trees on its lawn and ground'
    : 'in a ring on open ground round the footprint, with trees standing back';
  return { shrubs, trees, where, said };
}
