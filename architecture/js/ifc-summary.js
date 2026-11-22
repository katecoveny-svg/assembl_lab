// What an IFC file says about itself, read in the browser. Nothing is sent anywhere, and nothing is guessed: every number
// here is a count of entries in the file, or a quantity the file itself carries (an IfcElementQuantity), with a note of
// where it came from. A floor area is given only when the file's own spaces carry one.
//
//   ifcSummary(bytes)        -> the summary below (bytes: Uint8Array, ArrayBuffer or text). Throws a plain Error when the
//                               file is not an IFC (STEP) file.
//   ifcBytesFrom(name, bytes) -> the .ifc inside an .ifczip, or the bytes as they are for an .ifc (async)
//   isIfcText(head) / isZip(head)
//
// The summary (also kept on the file's note as extra.ifc, so a later Takeoff screen can read real quantities):
//   { v, reader, ms, bytes, entities, schema, app, exported_at, view, project, sites, buildings,
//     units: { length, area, volume, length_m, area_m2, volume_m3 },      the file's units, and their size in m, m², m³
//     counts: { walls, doors, windows, slabs, roof_slabs, roofs, spaces, stairs, columns, beams, railings, curtain_walls, coverings, furniture, proxies },
//     classes: { IfcWall: 12, ... },                                      every building-element class found, by its IFC name
//     storeys: [{ name, elevation_m, elements }], storey_count,           lowest first (the first 120)
//     spaces: { count, with_net, with_gross, net_m2, gross_m2, set, list: [{ name, long_name, storey, net_m2, gross_m2 }] },
//     quantities: [{ class, set, name, kind, unit, total, elements, of }], summed per class, set and quantity, in m, m², m³
//     from: { counts, storeys, area } }                                    where the numbers came from, in plain words
//
// This file is also a module worker: new Worker(new URL('./ifc-summary.js', import.meta.url), { type: 'module' }) and post
// it { file } (a File or Blob); it answers { summary } or { error }. The page's own thread is not held up by a big file.

export const READER = 'assembl ifc-summary 1';
const LIST_CAP = 300; // spaces listed by name; the totals always count every one
const STOREY_CAP = 120; // storeys listed; storey_count counts every one

// ---- classes ----------------------------------------------------------------------------------------------------------
// building elements, by the name the file writes (upper case) and the name IFC gives them
const ELEMENTS = 'Beam BeamStandardCase BuildingElementPart BuildingElementProxy Chimney Column ColumnStandardCase Covering CurtainWall Door DoorStandardCase Footing Member MemberStandardCase Pile Plate PlateStandardCase Railing Ramp RampFlight Roof ShadingDevice Slab SlabElementedCase SlabStandardCase Stair StairFlight Wall WallElementedCase WallStandardCase Window WindowStandardCase FurnishingElement Furniture SystemFurnitureElement ElementAssembly DiscreteAccessory Fastener MechanicalFastener ReinforcingBar ReinforcingMesh Tendon FlowTerminal SanitaryTerminal LightFixture AirTerminal FlowSegment PipeSegment DuctSegment CableSegment CableCarrierSegment FlowFitting PipeFitting DuctFitting FlowController Valve Damper EnergyConversionDevice Boiler Chiller FlowMovingDevice Pump Fan FlowStorageDevice Tank ElectricAppliance Outlet SwitchingDevice DistributionControlElement Sensor Alarm GeographicElement TransportElement CivilElement'.split(' ');
export const CLASS_NAME = Object.fromEntries(ELEMENTS.map((n) => [`IFC${n.toUpperCase()}`, `Ifc${n}`]));
const SPATIAL = { IFCSPACE: 'IfcSpace', IFCBUILDINGSTOREY: 'IfcBuildingStorey', IFCBUILDING: 'IfcBuilding', IFCSITE: 'IfcSite' };
export const COUNTED = {
  walls: ['IFCWALL', 'IFCWALLSTANDARDCASE', 'IFCWALLELEMENTEDCASE'],
  doors: ['IFCDOOR', 'IFCDOORSTANDARDCASE'],
  windows: ['IFCWINDOW', 'IFCWINDOWSTANDARDCASE'],
  slabs: ['IFCSLAB', 'IFCSLABSTANDARDCASE', 'IFCSLABELEMENTEDCASE'],
  roofs: ['IFCROOF'],
  spaces: ['IFCSPACE'],
  stairs: ['IFCSTAIR'],
  columns: ['IFCCOLUMN', 'IFCCOLUMNSTANDARDCASE'],
  beams: ['IFCBEAM', 'IFCBEAMSTANDARDCASE'],
  railings: ['IFCRAILING'],
  curtain_walls: ['IFCCURTAINWALL'],
  coverings: ['IFCCOVERING'],
  furniture: ['IFCFURNISHINGELEMENT', 'IFCFURNITURE', 'IFCSYSTEMFURNITUREELEMENT'],
  proxies: ['IFCBUILDINGELEMENTPROXY'],
};
const QUANTITY_KIND = { IFCQUANTITYLENGTH: 'length', IFCQUANTITYAREA: 'area', IFCQUANTITYVOLUME: 'volume', IFCQUANTITYCOUNT: 'count', IFCQUANTITYWEIGHT: 'weight', IFCQUANTITYTIME: 'time' };
// the entities whose contents are read; every other entity is only counted
const KEEP = new Set(['IFCPROJECT', 'IFCBUILDINGSTOREY', 'IFCSPACE', 'IFCSLAB', 'IFCSLABSTANDARDCASE', 'IFCSLABELEMENTEDCASE', 'IFCELEMENTQUANTITY', ...Object.keys(QUANTITY_KIND),
  'IFCRELDEFINESBYPROPERTIES', 'IFCRELAGGREGATES', 'IFCRELCONTAINEDINSPATIALSTRUCTURE', 'IFCUNITASSIGNMENT', 'IFCSIUNIT', 'IFCCONVERSIONBASEDUNIT', 'IFCMEASUREWITHUNIT']);

// ---- bytes ------------------------------------------------------------------------------------------------------------
const toBytes = (v) => (typeof v === 'string' ? new TextEncoder().encode(v) : v instanceof Uint8Array ? v : v instanceof ArrayBuffer ? new Uint8Array(v) : ArrayBuffer.isView(v) ? new Uint8Array(v.buffer, v.byteOffset, v.byteLength) : null);
const latin1 = new TextDecoder('latin1');
/** does it start like a STEP (IFC) file? */
export const isIfcText = (head) => /^\s*ISO-10303-21\s*;/.test(latin1.decode(toBytes(head).subarray(0, 64)).replace(/^﻿|^ï»¿/, ''));
export const isZip = (head) => { const b = toBytes(head); return b.length > 3 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 3 && b[3] === 4; };

// ---- one argument list, as text -> values -------------------------------------------------------------------------------
// numbers, 'strings', .ENUMS., #refs ({ ref }), $ (null), * ('*'), (lists) and TYPED(values) ({ type, value })
function decodeString(s) {
  if (s.indexOf("'") < 0 && s.indexOf('\\') < 0) return s; // most strings: nothing to undo
  return s.replace(/''/g, "'")
    .replace(/\\X2\\([0-9A-F]+)\\X0\\/gi, (_, hex) => String.fromCharCode(...hex.match(/.{4}/g).map((h) => parseInt(h, 16))))
    .replace(/\\X\\([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\S\\(.)/g, (_, c) => String.fromCharCode(c.charCodeAt(0) + 128))
    .replace(/\\\\/g, '\\');
}
export function parseArgs(text) {
  let i = 0;
  const ws = () => { while (i < text.length && text.charCodeAt(i) <= 32) i++; };
  function value() {
    ws();
    const c = text[i];
    if (c === '(') { i++; const out = []; ws(); if (text[i] === ')') { i++; return out; } for (;;) { out.push(value()); ws(); if (text[i] === ',') { i++; continue; } if (text[i] === ')') { i++; return out; } throw new Error('bad list'); } }
    if (c === "'") { let j = i + 1; for (;;) { const k = text.indexOf("'", j); if (k < 0) throw new Error('bad string'); if (text[k + 1] === "'") { j = k + 2; continue; } const s = text.slice(i + 1, k); i = k + 1; return decodeString(s); } }
    if (c === '#') { let j = i + 1; while (j < text.length && text.charCodeAt(j) >= 48 && text.charCodeAt(j) <= 57) j++; const ref = Number(text.slice(i + 1, j)); i = j; return { ref }; }
    if (c === '$') { i++; return null; }
    if (c === '*') { i++; return '*'; }
    if (c === '.') { const k = text.indexOf('.', i + 1); const e = text.slice(i, k + 1); i = k + 1; return e; }
    if (/[A-Za-z_]/.test(c)) { let j = i; while (j < text.length && /[A-Za-z0-9_]/.test(text[j])) j++; const type = text.slice(i, j).toUpperCase(); i = j; ws(); if (text[i] !== '(') return type; i++; const inner = value(); ws(); if (text[i] === ')') i++; return { type, value: inner }; }
    let j = i;
    while (j < text.length && /[-+0-9.Ee]/.test(text[j])) j++;
    const n = Number(text.slice(i, j));
    i = j;
    if (Number.isNaN(n)) throw new Error('bad value');
    return n;
  }
  // the text is "(a,b,c)": read it as a list
  const out = value();
  return Array.isArray(out) ? out : [out];
}

// ---- the scan ---------------------------------------------------------------------------------------------------------
/** Read every entity once. Count all of them by type; keep where the ones in KEEP start and end. */
function scan(b) {
  const counts = new Map();
  const kept = []; // id, type index, start, end for each KEEP entity, four numbers at a time (start/end of the argument text)
  // a type's name from its bytes, without decoding text for each entity: by hash, then checked letter by letter
  const names = new Map();
  const typeName = (bytes, from, to, h) => {
    const key = h * 64 + (to - from), list = names.get(key);
    if (list) {
      for (const [raw, name] of list) {
        if (raw.length !== to - from) continue;
        let same = true;
        for (let q = 0; q < raw.length; q++) if (raw[q] !== bytes[from + q]) { same = false; break; }
        if (same) return name;
      }
    }
    const raw = bytes.slice(from, to), name = latin1.decode(raw);
    if (list) list.push([raw, name]); else names.set(key, [[raw, name]]);
    return name;
  };
  let typeOf = new Uint16Array(1 << 16); // entity id -> index of its type in typeNames (0: unknown)
  const typeNames = [''], typeIndex = new Map();
  const n = b.length;
  // the DATA section
  let i = 0, dataAt = -1;
  for (let k = 0; k + 5 <= n; k++) { if (b[k] === 0x44 && b[k + 1] === 0x41 && b[k + 2] === 0x54 && b[k + 3] === 0x41 && b[k + 4] === 0x3b) { dataAt = k + 5; break; } }
  if (dataAt < 0) throw new Error('This file has no DATA section, so it is not an IFC file this page can read.');
  const header = latin1.decode(b.subarray(0, dataAt));
  i = dataAt;
  let entities = 0;
  while (i < n) {
    const c = b[i];
    if (c !== 0x23) { // not '#': whitespace, a comment, or the end of the section
      if (c === 0x2f && b[i + 1] === 0x2a) { const k = indexOf2(b, 0x2a, 0x2f, i + 2); i = k < 0 ? n : k + 2; continue; }
      if (c === 0x45 && b[i + 1] === 0x4e && b[i + 2] === 0x44 && b[i + 3] === 0x53 && b[i + 4] === 0x45 && b[i + 5] === 0x43) break; // ENDSEC
      i++; continue;
    }
    // #id
    let j = i + 1, id = 0;
    while (j < n && b[j] >= 48 && b[j] <= 57) { id = id * 10 + (b[j] - 48); j++; }
    while (j < n && b[j] <= 32) j++;
    if (b[j] !== 0x3d) { i = j; continue; } // not "#id=": skip it
    j++;
    while (j < n && b[j] <= 32) j++;
    const t0 = j;
    let h = 2166136261;
    while (j < n && ((b[j] >= 65 && b[j] <= 90) || (b[j] >= 48 && b[j] <= 57) || b[j] === 95)) { h = Math.imul(h ^ b[j], 16777619); j++; }
    const type = typeName(b, t0, j, h >>> 0);
    while (j < n && b[j] <= 32) j++;
    const start = j;
    // to the ';' that ends the entity, outside strings and comments
    let k = j;
    for (; k < n; k++) {
      const x = b[k];
      if (x === 0x3b) break;
      if (x === 0x27) { k++; for (; k < n; k++) { if (b[k] === 0x27) { if (b[k + 1] === 0x27) { k++; continue; } break; } } continue; }
      if (x === 0x2f && b[k + 1] === 0x2a) { const e = indexOf2(b, 0x2a, 0x2f, k + 2); k = e < 0 ? n : e + 1; }
    }
    entities++;
    counts.set(type, (counts.get(type) ?? 0) + 1);
    let ti = typeIndex.get(type);
    if (ti === undefined) { ti = typeNames.length; typeNames.push(type); typeIndex.set(type, ti); }
    if (id >= typeOf.length) { const bigger = new Uint16Array(Math.max(id + 1, typeOf.length * 2)); bigger.set(typeOf); typeOf = bigger; }
    typeOf[id] = ti;
    if (KEEP.has(type)) kept.push(id, ti, start, k);
    i = k + 1;
  }
  return { header, counts, kept, typeOf, typeNames, entities };
}
function indexOf2(b, x, y, from) { for (let k = from; k + 1 < b.length; k++) if (b[k] === x && b[k + 1] === y) return k; return -1; }

// ---- the header -------------------------------------------------------------------------------------------------------
function readHeader(text) {
  const one = (name) => { const m = text.match(new RegExp(`${name}\\s*\\(([\\s\\S]*?)\\)\\s*;`, 'i')); if (!m) return null; try { return parseArgs(`(${m[1]})`); } catch { return null; } };
  const schemaArgs = one('FILE_SCHEMA'), nameArgs = one('FILE_NAME'), descArgs = one('FILE_DESCRIPTION');
  const flat = (v) => (Array.isArray(v) ? v.flat(3) : [v]).filter((x) => typeof x === 'string');
  const schema = flat(schemaArgs?.[0] ?? [])[0] ?? '';
  // only what the exporting program wrote about itself and when: the file's own path, author and organisation are left out
  const app = [nameArgs?.[5], nameArgs?.[4]].find((x) => typeof x === 'string' && x.trim()) ?? '';
  const view = (flat(descArgs?.[0] ?? []).join(' ').match(/ViewDefinition\s*\[([^\]]+)\]/i)?.[1] ?? '').trim();
  return { schema: String(schema).toUpperCase(), app: String(app).trim().slice(0, 120), exported_at: typeof nameArgs?.[1] === 'string' ? nameArgs[1].slice(0, 32) : '', view: view.slice(0, 120) };
}

// ---- units ------------------------------------------------------------------------------------------------------------
const PREFIX = { EXA: 1e18, PETA: 1e15, TERA: 1e12, GIGA: 1e9, MEGA: 1e6, KILO: 1e3, HECTO: 1e2, DECA: 1e1, DECI: 1e-1, CENTI: 1e-2, MILLI: 1e-3, MICRO: 1e-6, NANO: 1e-9, PICO: 1e-12, FEMTO: 1e-15, ATTO: 1e-18 };
const POWER = { LENGTHUNIT: 1, AREAUNIT: 2, VOLUMEUNIT: 3 };
const SHORT = { LENGTHUNIT: { 1: 'm', 1e-3: 'mm', 1e-2: 'cm', 1e3: 'km', 0.3048: 'ft', 0.0254: 'in' }, AREAUNIT: { 1: 'm²', 1e-6: 'mm²', 1e-4: 'cm²', 0.09290304: 'ft²' }, VOLUMEUNIT: { 1: 'm³', 1e-9: 'mm³', 1e-6: 'cm³', 0.028316846592: 'ft³' } };
const near = (a, b) => Math.abs(a - b) <= Math.abs(b) * 1e-6;
function unitWord(kind, factor, name) {
  const table = SHORT[kind] ?? {};
  for (const [f, w] of Object.entries(table)) if (near(factor, Number(f))) return w;
  return name ? String(name).toLowerCase() : `${factor} SI`;
}

// ---- the summary ------------------------------------------------------------------------------------------------------
export function ifcSummary(input) {
  const started = (globalThis.performance ?? Date).now();
  const b = toBytes(input);
  if (!b || !b.length) throw new Error('That file is empty.');
  if (!isIfcText(b)) throw new Error('That file does not start like an IFC file (ISO-10303-21), so it was not read.');
  const { header, counts, kept, typeOf, typeNames, entities } = scan(b);
  const head = readHeader(header);
  const typeOfId = (id) => (id < typeOf.length ? typeNames[typeOf[id]] : '');

  // the kept entities, read
  const rec = new Map();
  const byType = new Map();
  for (let q = 0; q < kept.length; q += 4) {
    const id = kept[q], type = typeNames[kept[q + 1]], s = kept[q + 2], e = kept[q + 3];
    let args;
    try { args = parseArgs(latin1.decode(b.subarray(s, e))); } catch { continue; } // one we cannot read is left out, not guessed
    rec.set(id, { type, args });
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push(id);
  }
  const all = (type) => byType.get(type) ?? [];
  const get = (ref) => (ref && typeof ref === 'object' && 'ref' in ref ? rec.get(ref.ref) : null);
  const refs = (v) => (Array.isArray(v) ? v : [v]).filter((x) => x && typeof x === 'object' && 'ref' in x).map((x) => x.ref);
  const text = (v) => (typeof v === 'string' ? v : '');

  // units the file declares for the project: the size of each in m, m², m³ (null when the file does not say)
  const unitFactor = (r) => {
    if (!r) return null;
    if (r.type === 'IFCSIUNIT') {
      const kind = String(r.args[1]).replace(/\./g, ''), prefix = PREFIX[String(r.args[2] ?? '').replace(/\./g, '')] ?? 1;
      return { kind, factor: prefix ** (POWER[kind] ?? 1), name: String(r.args[3] ?? '').replace(/\./g, '') };
    }
    if (r.type === 'IFCCONVERSIONBASEDUNIT') {
      const kind = String(r.args[1]).replace(/\./g, ''), m = get(r.args[3]);
      const v = m?.args?.[0], value = typeof v === 'number' ? v : typeof v?.value === 'number' ? v.value : null;
      const base = unitFactor(get(m?.args?.[1]));
      return value != null && base ? { kind, factor: value * base.factor, name: text(r.args[2]) } : null;
    }
    return null;
  };
  const units = {};
  for (const id of all('IFCUNITASSIGNMENT')) for (const u of refs(rec.get(id).args[0])) { const f = unitFactor(rec.get(u)); if (f && POWER[f.kind] && !units[f.kind]) units[f.kind] = f; }
  const projUnits = {
    length: units.LENGTHUNIT ? unitWord('LENGTHUNIT', units.LENGTHUNIT.factor, units.LENGTHUNIT.name) : null,
    area: units.AREAUNIT ? unitWord('AREAUNIT', units.AREAUNIT.factor, units.AREAUNIT.name) : null,
    volume: units.VOLUMEUNIT ? unitWord('VOLUMEUNIT', units.VOLUMEUNIT.factor, units.VOLUMEUNIT.name) : null,
    length_m: units.LENGTHUNIT?.factor ?? null, area_m2: units.AREAUNIT?.factor ?? null, volume_m3: units.VOLUMEUNIT?.factor ?? null,
  };
  const KIND_UNIT = { length: 'LENGTHUNIT', area: 'AREAUNIT', volume: 'VOLUMEUNIT' };
  const SI_WORD = { length: 'm', area: 'm²', volume: 'm³' };
  /** a quantity's value in m, m² or m³ when its unit is known; otherwise as written, with the unit said to be unknown */
  const measure = (kind, value, unitRef) => {
    const own = unitFactor(get(unitRef));
    const u = own && own.kind === KIND_UNIT[kind] ? own : units[KIND_UNIT[kind]];
    if (!(kind in KIND_UNIT)) return { value, unit: kind === 'count' ? '' : kind === 'weight' ? 'kg' : 's' };
    return u ? { value: value * u.factor, unit: SI_WORD[kind] } : { value, unit: 'unit not stated' };
  };

  // counts
  const sum = (types) => types.reduce((n, t) => n + (counts.get(t) ?? 0), 0);
  const countsOut = Object.fromEntries(Object.entries(COUNTED).map(([k, list]) => [k, sum(list)]));
  countsOut.roof_slabs = ['IFCSLAB', 'IFCSLABSTANDARDCASE', 'IFCSLABELEMENTEDCASE'].flatMap(all).filter((id) => rec.get(id).args[8] === '.ROOF.').length;
  const classes = {};
  for (const [t, c] of counts) if (CLASS_NAME[t]) classes[CLASS_NAME[t]] = c;

  // storeys, their elevation, and how many elements each holds
  const inStorey = new Map();
  for (const id of all('IFCRELCONTAINEDINSPATIALSTRUCTURE')) { const a = rec.get(id).args, s = refs(a[5])[0]; if (s) inStorey.set(s, (inStorey.get(s) ?? 0) + refs(a[4]).length); }
  const storeyOfSpace = new Map();
  for (const id of all('IFCRELAGGREGATES')) {
    const a = rec.get(id).args, parent = refs(a[4])[0];
    if (rec.get(parent)?.type !== 'IFCBUILDINGSTOREY') continue;
    for (const child of refs(a[5])) if (rec.get(child)?.type === 'IFCSPACE') storeyOfSpace.set(child, parent);
  }
  const storeys = all('IFCBUILDINGSTOREY').map((id) => {
    const a = rec.get(id).args, el = typeof a[9] === 'number' ? a[9] : null;
    return { id, name: text(a[2]) || text(a[7]) || `Storey #${id}`, elevation_m: el == null ? null : projUnits.length_m ? round(el * projUnits.length_m, 3) : null, elevation_raw: el, elements: inStorey.get(id) ?? 0 };
  }).sort((x, y) => (x.elevation_raw ?? 0) - (y.elevation_raw ?? 0));

  // quantity sets, joined to the elements they describe
  const totals = new Map(); // class|set|name -> { class, set, name, kind, unit, total, elements }
  const spaceQ = new Map(); // space id -> { set name -> { NetFloorArea, GrossFloorArea } }
  for (const id of all('IFCRELDEFINESBYPROPERTIES')) {
    const a = rec.get(id).args, objects = refs(a[4]);
    for (const defId of refs(a[5])) {
      const def = rec.get(defId);
      if (def?.type !== 'IFCELEMENTQUANTITY') continue;
      const setName = text(def.args[2]) || 'Quantities';
      const qs = refs(def.args[5]).map((q) => [q, rec.get(q)]).filter(([, q]) => q && QUANTITY_KIND[q.type]);
      for (const obj of objects) {
        const t = typeOfId(obj), cls = CLASS_NAME[t] ?? SPATIAL[t];
        if (!cls) continue;
        for (const [, q] of qs) {
          const kind = QUANTITY_KIND[q.type], raw = q.args[3];
          if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
          const m = measure(kind, raw, q.args[2]), qName = text(q.args[0]);
          const key = `${cls}|${setName}|${qName}`;
          const row = totals.get(key) ?? { class: cls, set: setName, name: qName, kind, unit: m.unit, total: 0, elements: 0, seen: new Set() };
          if (!row.seen.has(obj)) { row.seen.add(obj); row.elements++; }
          row.total += m.value;
          totals.set(key, row);
          if (t === 'IFCSPACE' && (qName === 'NetFloorArea' || qName === 'GrossFloorArea') && m.unit === 'm²') {
            const sq = spaceQ.get(obj) ?? {};
            (sq[setName] ??= {})[qName] = m.value;
            spaceQ.set(obj, sq);
          }
        }
      }
    }
  }
  const ofClass = (cls) => { const t = Object.keys(CLASS_NAME).find((k) => CLASS_NAME[k] === cls) ?? Object.keys(SPATIAL).find((k) => SPATIAL[k] === cls); return t ? counts.get(t) ?? 0 : 0; };
  const quantities = [...totals.values()].map(({ seen, ...r }) => ({ ...r, total: round(r.total, 4), of: ofClass(r.class) }))
    .sort((x, y) => x.class.localeCompare(y.class) || x.set.localeCompare(y.set) || x.name.localeCompare(y.name)).slice(0, 300);

  // spaces and their floor areas: Qto_SpaceBaseQuantities first, then the older BaseQuantities, then any other set
  const pick = (sq, name) => {
    if (!sq) return null;
    for (const set of ['Qto_SpaceBaseQuantities', 'BaseQuantities', ...Object.keys(sq)]) if (typeof sq[set]?.[name] === 'number') return { value: sq[set][name], set };
    return null;
  };
  const sets = new Set();
  let net = 0, gross = 0, withNet = 0, withGross = 0;
  const spaceIds = all('IFCSPACE');
  const list = spaceIds.map((id) => {
    const a = rec.get(id).args, sq = spaceQ.get(id), n = pick(sq, 'NetFloorArea'), g = pick(sq, 'GrossFloorArea');
    if (n) { net += n.value; withNet++; sets.add(n.set); }
    if (g) { gross += g.value; withGross++; sets.add(g.set); }
    const st = rec.get(storeyOfSpace.get(id));
    return { name: text(a[2]), long_name: text(a[7]), storey: st ? text(st.args[2]) : '', net_m2: n ? round(n.value, 2) : null, gross_m2: g ? round(g.value, 2) : null };
  });
  const spaces = { count: spaceIds.length, with_net: withNet, with_gross: withGross, net_m2: withNet ? round(net, 2) : null, gross_m2: withGross ? round(gross, 2) : null, set: [...sets].join(', '), list: list.slice(0, LIST_CAP) };

  const projectName = all('IFCPROJECT').map((id) => text(rec.get(id).args[2]) || text(rec.get(id).args[5])).find(Boolean) ?? '';
  const words = (keys) => keys.map((t) => CLASS_NAME[t] ?? SPATIAL[t]).join(', ');
  const from = {
    counts: `Counted from the entries in the file: walls are ${words(COUNTED.walls)}; doors ${words(COUNTED.doors)}; windows ${words(COUNTED.windows)}; slabs ${words(COUNTED.slabs)}; roofs IfcRoof; spaces IfcSpace.`,
    storeys: storeys.length ? `${storeys.length} IfcBuildingStorey entries, with the elevation each one states${projUnits.length ? ` (the file works in ${projUnits.length})` : ''}, and the elements the file places in each.` : 'The file has no IfcBuildingStorey entries.',
    area: !spaces.count ? 'The file has no spaces (IfcSpace), so it gives no floor area.'
      : !withNet && !withGross ? `The file has ${spaces.count} spaces (IfcSpace), but none of them carries a floor area, so no area is given.`
      : `${withNet ? `Net: the sum of NetFloorArea on ${withNet} of ${spaces.count} spaces` : ''}${withNet && withGross ? '. ' : ''}${withGross ? `Gross: the sum of GrossFloorArea on ${withGross} of ${spaces.count} spaces` : ''}, from the file's own quantity sets (${spaces.set}). Nothing is measured from the shapes.`,
  };
  return {
    v: 1, reader: READER, ms: Math.round((globalThis.performance ?? Date).now() - started), bytes: b.length, entities,
    schema: head.schema, app: head.app, exported_at: head.exported_at, view: head.view, project: projectName.slice(0, 160),
    sites: counts.get('IFCSITE') ?? 0, buildings: counts.get('IFCBUILDING') ?? 0,
    units: projUnits, counts: countsOut, classes,
    storeys: storeys.slice(0, STOREY_CAP).map(({ id, elevation_raw, ...s }) => s), storey_count: storeys.length,
    spaces, quantities, from,
  };
}
const round = (v, d) => { const f = 10 ** d; return Math.round(v * f) / f; };

// ---- .ifczip --------------------------------------------------------------------------------------------------------------
/** the first .ifc inside a zip, as bytes. Stored or deflated entries; throws a plain Error for anything else. */
export async function unzipIfc(input) {
  const b = toBytes(input), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  // the end of the central directory: the last 22+ bytes
  let eocd = -1;
  for (let k = b.length - 22; k >= Math.max(0, b.length - 65557); k--) if (dv.getUint32(k, true) === 0x06054b50) { eocd = k; break; }
  if (eocd < 0) throw new Error('That .ifczip is not a zip file this page can open.');
  const count = dv.getUint16(eocd + 10, true);
  let at = dv.getUint32(eocd + 16, true);
  for (let e = 0; e < count; e++) {
    if (dv.getUint32(at, true) !== 0x02014b50) break;
    const method = dv.getUint16(at + 10, true), csize = dv.getUint32(at + 20, true), usize = dv.getUint32(at + 24, true);
    const nlen = dv.getUint16(at + 28, true), xlen = dv.getUint16(at + 30, true), clen = dv.getUint16(at + 32, true), local = dv.getUint32(at + 42, true);
    const name = new TextDecoder().decode(b.subarray(at + 46, at + 46 + nlen));
    at += 46 + nlen + xlen + clen;
    if (!/\.ifc$/i.test(name) || name.endsWith('/')) continue;
    if (csize === 0xffffffff || usize === 0xffffffff || local === 0xffffffff) throw new Error('That .ifczip uses the large-zip format, which this page cannot open. Unzip it and drop the .ifc.');
    const dataAt = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    const raw = b.subarray(dataAt, dataAt + csize);
    if (method === 0) return { name: name.split('/').pop(), bytes: raw.slice() };
    if (method !== 8) throw new Error('That .ifczip is packed in a way this page cannot open. Unzip it and drop the .ifc.');
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot unzip files. Unzip it and drop the .ifc.');
    const out = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
    return { name: name.split('/').pop(), bytes: new Uint8Array(out) };
  }
  throw new Error('There is no .ifc file inside that .ifczip.');
}
/** the IFC text to read for a kept file: an .ifczip is unzipped, an .ifc is used as it is */
export async function ifcBytesFrom(name, input) {
  const b = toBytes(input);
  if (/\.ifczip$/i.test(name) || isZip(b)) return unzipIfc(b);
  return { name, bytes: b };
}

// ---- as a worker ------------------------------------------------------------------------------------------------------
const inWorker = typeof globalThis.WorkerGlobalScope !== 'undefined' && globalThis instanceof globalThis.WorkerGlobalScope;
if (inWorker) {
  globalThis.onmessage = async (e) => {
    try {
      const file = e.data?.file;
      const raw = new Uint8Array(await file.arrayBuffer());
      const { bytes } = await ifcBytesFrom(String(e.data?.name ?? file.name ?? ''), raw);
      globalThis.postMessage({ summary: ifcSummary(bytes) });
    } catch (err) { globalThis.postMessage({ error: String(err?.message ?? err) }); }
  };
}
