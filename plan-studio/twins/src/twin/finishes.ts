// The finishes schedule: every surface the twin can finish, the choices for each, and a spec line a
// designer can hand on. A schedule is just { surface: option } and travels in the URL (?fin=…) so a
// look can be shared. Presets are starting points. Names are generic descriptions, not products.

export type Group = 'Exterior' | 'Interior' | 'Kitchen' | 'Bathroom' | 'Soft furnishings';

export interface Option {
  id: string;
  label: string;
  spec: string;
  /** render parameters, read by the material builders */
  p: Record<string, number | string>;
}
export interface Surface {
  key: string;
  group: Group;
  label: string;
  options: Option[];
}

export const SURFACES: Surface[] = [
  // --- exterior
  {
    key: 'cladding',
    group: 'Exterior',
    label: 'Cladding',
    options: [
      { id: 'cedar', label: 'Cedar shiplap, natural oil', spec: 'Vertical cedar shiplap, 135 mm cover, natural penetrating oil', p: { kind: 'cedar' } },
      { id: 'blackstain', label: 'Cedar shiplap, black stain', spec: 'Vertical cedar shiplap, 135 mm cover, black pigmented stain', p: { kind: 'blackstain' } },
      { id: 'metal', label: 'Ribbed metal, dark', spec: 'Vertical trapezoidal ribbed steel, 300 mm centres, prefinished charcoal', p: { kind: 'metal' } },
      { id: 'white', label: 'Painted cladding, white', spec: 'Smooth painted fibre-cement or timber cladding, low-sheen white', p: { kind: 'white' } },
    ],
  },
  {
    key: 'roof',
    group: 'Exterior',
    label: 'Roofing',
    options: [
      { id: 'charcoal', label: 'Corrugate, charcoal', spec: 'Corrugated prefinished steel, charcoal', p: { colour: 0x2f3134 } },
      { id: 'black', label: 'Corrugate, black', spec: 'Corrugated prefinished steel, black', p: { colour: 0x1c1d1f } },
      { id: 'grey', label: 'Corrugate, warm grey', spec: 'Corrugated prefinished steel, warm mid grey', p: { colour: 0x6c6a64 } },
      { id: 'zinc', label: 'Corrugate, natural zinc-aluminium', spec: 'Corrugated unpainted zinc-aluminium coated steel', p: { colour: 0xa9adb0 } },
    ],
  },
  {
    key: 'joinery',
    group: 'Exterior',
    label: 'Window and door joinery',
    options: [
      { id: 'black', label: 'Aluminium, matt black', spec: 'Thermally broken aluminium, matt black powdercoat, double glazed', p: { colour: 0x161617 } },
      { id: 'bronze', label: 'Aluminium, bronze', spec: 'Thermally broken aluminium, dark bronze anodised, double glazed', p: { colour: 0x3b3027 } },
      { id: 'white', label: 'Aluminium, white', spec: 'Thermally broken aluminium, white powdercoat, double glazed', p: { colour: 0xe9e7e2 } },
      { id: 'timber', label: 'Timber, clear finish', spec: 'Timber joinery, clear finish, double glazed', p: { colour: 0x8b6a4b } },
    ],
  },
  {
    key: 'decking',
    group: 'Exterior',
    label: 'Decking and balustrade timber',
    options: [
      { id: 'kwila', label: 'Hardwood, warm red-brown', spec: 'Hardwood decking 140 × 19 (kwila-type), oiled', p: { light: 0xa4795a, dark: 0x6f4a33 } },
      { id: 'vitex', label: 'Hardwood, weathered grey', spec: 'Hardwood decking 140 × 19, left to silver', p: { light: 0x9a9286, dark: 0x6e675d } },
      { id: 'pale', label: 'Hardwood, pale', spec: 'Pale hardwood decking 140 × 19, oiled', p: { light: 0xc9a77c, dark: 0x9a7a54 } },
      { id: 'charcoal', label: 'Composite, charcoal', spec: 'Composite decking boards, charcoal', p: { light: 0x4a4744, dark: 0x343230 } },
    ],
  },
  // --- interior
  {
    key: 'floor',
    group: 'Interior',
    label: 'Flooring',
    options: [
      { id: 'oak', label: 'Engineered oak, natural', spec: 'Engineered European oak, 180 mm boards, natural matt lacquer', p: { kind: 'oak', light: 0xcfae80, dark: 0x9b7650 } },
      { id: 'oak-smoked', label: 'Engineered oak, smoked', spec: 'Engineered European oak, 180 mm boards, smoked, matt oil', p: { kind: 'oak', light: 0x8c6a4c, dark: 0x5a4130 } },
      { id: 'oak-white', label: 'Engineered oak, whitewashed', spec: 'Engineered European oak, 180 mm boards, white-pigmented oil', p: { kind: 'oak', light: 0xe2d6c4, dark: 0xbfae94 } },
      { id: 'concrete', label: 'Polished concrete', spec: 'Ground and polished concrete slab, light exposure, sealed', p: { kind: 'concrete' } },
      { id: 'terrazzo', label: 'Terrazzo tiles', spec: '600 × 600 terrazzo tiles, warm white with dark aggregate', p: { kind: 'terrazzo' } },
      { id: 'tile', label: 'Porcelain tile, stone look', spec: '600 × 600 porcelain, stone look, matt', p: { kind: 'tile' } },
    ],
  },
  {
    key: 'walls',
    group: 'Interior',
    label: 'Wall and ceiling paint',
    options: [
      { id: 'warm-white', label: 'Warm white', spec: 'Low-sheen acrylic, warm white', p: { colour: 0xf1ede6 } },
      { id: 'bright-white', label: 'Clean white', spec: 'Low-sheen acrylic, clean neutral white', p: { colour: 0xf6f5f1 } },
      { id: 'greige', label: 'Soft greige', spec: 'Low-sheen acrylic, soft warm grey-beige', p: { colour: 0xddd5c8 } },
      { id: 'plaster-rose', label: 'Plaster rose', spec: 'Low-sheen acrylic, pale plaster pink', p: { colour: 0xeadcd6 } },
      { id: 'sage', label: 'Pale sage', spec: 'Low-sheen acrylic, pale grey-green', p: { colour: 0xd9ddd0 } },
    ],
  },
  {
    key: 'cabinetry',
    group: 'Kitchen',
    label: 'Cabinetry and robes',
    options: [
      { id: 'white', label: 'Painted, warm white', spec: 'Painted MDF doors, satin, warm white', p: { colour: 0xe9e4da } },
      { id: 'charcoal', label: 'Painted, charcoal', spec: 'Painted MDF doors, satin, charcoal', p: { colour: 0x2b2b2d } },
      { id: 'oak', label: 'Oak veneer', spec: 'Crown-cut oak veneer doors, natural matt', p: { colour: 0xc9a77c } },
      { id: 'plum', label: 'Painted, deep plum', spec: 'Painted MDF doors, satin, deep plum', p: { colour: 0x3a1f33 } },
      { id: 'sage', label: 'Painted, sage', spec: 'Painted MDF doors, satin, sage green', p: { colour: 0x8a957c } },
    ],
  },
  {
    key: 'bench',
    group: 'Kitchen',
    label: 'Benchtop',
    options: [
      { id: 'stone', label: 'Engineered stone, warm white', spec: '20 mm engineered stone (low-silica), warm white, eased edge', p: { kind: 'stone' } },
      { id: 'marble', label: 'Marble, white with grey vein', spec: '20 mm honed marble, white with grey veining', p: { kind: 'marble' } },
      { id: 'terrazzo', label: 'Terrazzo', spec: '30 mm terrazzo, warm white with dark aggregate', p: { kind: 'terrazzo' } },
    ],
  },
  {
    key: 'splashback',
    group: 'Kitchen',
    label: 'Splashback',
    options: [
      { id: 'white-gloss', label: 'Gloss tile, white', spec: '150 × 150 glazed ceramic tile, gloss white, pale grout', p: { colour: 0xe9e6e0, grout: 0xc9c4bc, n: 4, gloss: 1 } },
      { id: 'clay', label: 'Glazed tile, clay', spec: '150 × 150 glazed tile, warm clay, pale grout', p: { colour: 0xb98a6c, grout: 0xd9cfc2, n: 4, gloss: 1 } },
      { id: 'green', label: 'Glazed tile, deep green', spec: '150 × 150 glazed tile, deep green, pale grout', p: { colour: 0x3e5a4a, grout: 0xcfcabf, n: 4, gloss: 1 } },
      { id: 'match', label: 'Matches the benchtop', spec: 'Full-height slab to match the benchtop', p: { match: 1 } },
    ],
  },
  {
    key: 'metal',
    group: 'Kitchen',
    label: 'Tapware and handles',
    options: [
      { id: 'brass', label: 'Brushed brass', spec: 'Brushed brass PVD tapware and handles', p: { colour: 0xb08a4a } },
      { id: 'black', label: 'Matt black', spec: 'Matt black tapware and handles', p: { colour: 0x1a1a1a } },
      { id: 'nickel', label: 'Brushed nickel', spec: 'Brushed nickel tapware and handles', p: { colour: 0xa7a6a1 } },
      { id: 'chrome', label: 'Chrome', spec: 'Polished chrome tapware, steel handles', p: { colour: 0xd8d8d8 } },
    ],
  },
  {
    key: 'bathTile',
    group: 'Bathroom',
    label: 'Bathroom tiles',
    options: [
      { id: 'stone', label: 'Stone-look porcelain', spec: '600 × 600 porcelain, warm stone look, matt', p: { colour: 0xd9d4ca, grout: 0xb4ada2 } },
      { id: 'white', label: 'Matt white', spec: '600 × 600 porcelain, matt white', p: { colour: 0xeceae5, grout: 0xcfcac2 } },
      { id: 'terracotta', label: 'Terracotta', spec: '600 × 600 porcelain, terracotta', p: { colour: 0xb7765a, grout: 0xcfb9a6 } },
      { id: 'charcoal', label: 'Charcoal', spec: '600 × 600 porcelain, charcoal, matt', p: { colour: 0x4a4846, grout: 0x6a6764 } },
    ],
  },
  // --- soft furnishings
  {
    key: 'fabric',
    group: 'Soft furnishings',
    label: 'Upholstery and accents',
    options: [
      { id: 'oatmeal', label: 'Oatmeal linen, rust accents', spec: 'Upholstery in oatmeal linen; accent cushions and throws in rust', p: { fabric: 0xb8ab96, accent: 0x8a5a3c } },
      { id: 'stone', label: 'Stone linen, charcoal accents', spec: 'Upholstery in stone linen; accents in charcoal', p: { fabric: 0xd6d0c4, accent: 0x3a3836 } },
      { id: 'tobacco', label: 'Tobacco wool, cream accents', spec: 'Upholstery in tobacco wool; accents in cream', p: { fabric: 0x9a7f6a, accent: 0xe8e0d0 } },
      { id: 'plum', label: 'Plum velvet, rose accents', spec: 'Upholstery in deep plum; accents in dusty rose', p: { fabric: 0x5b2a4a, accent: 0xd9bacb } },
    ],
  },
];

export type Schedule = Record<string, string>;

export const PRESETS: Record<string, { name: string; s: Schedule }> = {
  'cedar-charcoal': { name: 'Cedar and charcoal', s: { cladding: 'blackstain', roof: 'charcoal', joinery: 'black', decking: 'kwila', floor: 'oak', walls: 'warm-white', cabinetry: 'white', bench: 'stone', splashback: 'white-gloss', metal: 'black', bathTile: 'stone', fabric: 'oatmeal' } },
  'white-black': { name: 'White walls, black joinery, dark metal', s: { cladding: 'metal', roof: 'black', joinery: 'black', decking: 'vitex', floor: 'oak', walls: 'bright-white', cabinetry: 'charcoal', bench: 'marble', splashback: 'match', metal: 'black', bathTile: 'white', fabric: 'stone' } },
  'warm-oak': { name: 'Warm oak and terrazzo', s: { cladding: 'cedar', roof: 'grey', joinery: 'bronze', decking: 'pale', floor: 'oak', walls: 'greige', cabinetry: 'oak', bench: 'terrazzo', splashback: 'clay', metal: 'brass', bathTile: 'terracotta', fabric: 'tobacco' } },
  'plum-rose': { name: 'assembl plum and rose', s: { cladding: 'blackstain', roof: 'charcoal', joinery: 'black', decking: 'charcoal', floor: 'oak-white', walls: 'plaster-rose', cabinetry: 'plum', bench: 'marble', splashback: 'match', metal: 'brass', bathTile: 'stone', fabric: 'plum' } },
};

export const surface = (key: string) => SURFACES.find((s) => s.key === key)!;
export function pick(s: Schedule, key: string): Option {
  const sf = surface(key);
  return sf.options.find((o) => o.id === s[key]) ?? sf.options[0];
}

/** fill any surface the schedule leaves out from the first preset */
export function complete(s: Partial<Schedule>): Schedule {
  const base = PRESETS['cedar-charcoal'].s;
  const out: Schedule = {};
  for (const sf of SURFACES) out[sf.key] = s[sf.key] && sf.options.some((o) => o.id === s[sf.key]) ? s[sf.key]! : base[sf.key] ?? sf.options[0].id;
  return out;
}

/** compact, URL-safe: option ids joined in surface order */
export function encode(s: Schedule) {
  return SURFACES.map((sf) => s[sf.key] ?? '').join('.');
}
export function decode(txt: string | null): Schedule | null {
  if (!txt) return null;
  const parts = txt.split('.');
  if (parts.length < 3) return null;
  const s: Partial<Schedule> = {};
  SURFACES.forEach((sf, i) => {
    if (parts[i]) s[sf.key] = parts[i];
  });
  return complete(s);
}

/** the schedule from the page URL: ?fin=… wins, then ?palette=…, else the given preset */
export function fromURL(fallback = 'cedar-charcoal'): { s: Schedule; name: string } {
  const qs = new URLSearchParams(location.search);
  const f = decode(qs.get('fin'));
  if (f) return { s: f, name: 'Custom schedule' };
  const p = PRESETS[qs.get('palette') ?? ''] ?? PRESETS[fallback];
  return { s: complete(p.s), name: p.name };
}

export function scheduleRows(s: Schedule) {
  return SURFACES.map((sf) => {
    const o = pick(s, sf.key);
    return { group: sf.group, surface: sf.label, choice: o.label, spec: o.spec };
  });
}

export function scheduleCSV(s: Schedule, project: string) {
  const esc = (x: string) => `"${x.replace(/"/g, '""')}"`;
  const rows = scheduleRows(s);
  return [`# Finishes schedule, ${project}. Proposed by assembl; not a specification for construction.`, 'Group,Surface,Choice,Specification', ...rows.map((r) => [r.group, r.surface, r.choice, r.spec].map(esc).join(','))].join('\n');
}

export function scheduleHTML(s: Schedule, project: string) {
  const rows = scheduleRows(s);
  const groups = [...new Set(rows.map((r) => r.group))];
  const body = groups
    .map(
      (g) =>
        `<h2>${g}</h2><table>${rows
          .filter((r) => r.group === g)
          .map((r) => `<tr><th>${r.surface}</th><td><b>${r.choice}</b><br>${r.spec}</td></tr>`)
          .join('')}</table>`,
    )
    .join('');
  return `<!doctype html><html lang="en-NZ"><head><meta charset="utf-8"><title>Finishes schedule · ${project}</title><style>
body{font:15px/1.5 system-ui,sans-serif;color:#33212f;background:#f9f6f2;max-width:760px;margin:40px auto;padding:0 24px}
h1{font-weight:500;letter-spacing:-.02em}h2{font:12px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.12em;color:#756771;margin-top:28px}
table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;padding:10px 8px;border-top:1px solid #e3d8da}th{width:34%;font-weight:500}
.note{color:#756771;font-size:13px}@media print{body{background:#fff;margin:0}}
</style></head><body><p class="note">assembl · finishes schedule</p><h1>${project}</h1>${body}
<p class="note">Proposed finishes for visualisation, generated in the assembl twin. Descriptions are generic; confirm products, compliance and availability before specifying.</p></body></html>`;
}
