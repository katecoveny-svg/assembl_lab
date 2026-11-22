// Writes tests/architecture/fixtures/small-house.ifc: a small, made-up two-storey house in IFC4, for the Models tests
// and stills. Run: node tests/architecture/fixtures/make-small-house.mjs
// Everything in it is invented here (names, sizes, rooms). It is part of this repository and under its licence.
// Same input, same file: ids, GlobalIds and the time stamp are fixed, so the file only changes when this script does.
//
// What it holds, on purpose, so the reader has something real to find:
//   two storeys (0 and 2700 mm), 12 walls, 3 doors, 8 windows, 3 slabs, 1 roof, 10 spaces with floor areas,
//   wall and slab quantity sets, millimetres for length and square metres for area, colours for a preview.
import { writeFileSync } from 'node:fs';

const lines = [];
let n = 0;
const add = (s) => { n++; lines.push(`#${n}=${s};`); return `#${n}`; };
const str = (s) => `'${String(s).replace(/'/g, "''")}'`;
const real = (v) => { const s = Number(v).toFixed(4).replace(/0+$/, ''); return s.endsWith('.') ? s : s; };
const pt = (x, y, z) => add(`IFCCARTESIANPOINT((${real(x)},${real(y)},${real(z)}))`);
const dir = (x, y, z) => add(`IFCDIRECTION((${real(x)},${real(y)},${real(z)}))`);
// a GlobalId: 22 characters of IFC's base 64, from a key (steady, not random)
const B64 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
const guid = (key) => {
  let h = 2166136261 >>> 0, out = '';
  for (let i = 0; i < 22; i++) { for (const c of `${key}:${i}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; out += B64[(i === 0 ? h % 4 : h % 64)]; }
  return str(out);
};

const owner = (() => {
  const person = add(`IFCPERSON($,$,'Tester',$,$,$,$,$)`);
  const org = add(`IFCORGANIZATION($,'assembl test writer',$,$,$)`);
  const po = add(`IFCPERSONANDORGANIZATION(${person},${org},$)`);
  const app = add(`IFCAPPLICATION(${org},'1','assembl test writer','assembl-test')`);
  return add(`IFCOWNERHISTORY(${po},${app},$,.ADDED.,$,$,$,1795000000)`);
})();
const units = [
  add(`IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.)`),
  add(`IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)`),
  add(`IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)`),
  add(`IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.)`),
];
const ua = add(`IFCUNITASSIGNMENT((${units.join(',')}))`);
const origin = pt(0, 0, 0), Z = dir(0, 0, 1), X = dir(1, 0, 0);
const world = add(`IFCAXIS2PLACEMENT3D(${origin},${Z},${X})`);
const ctx = add(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,${world},$)`);
const body = add(`IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,${ctx},$,.MODEL_VIEW.,$)`);
const project = add(`IFCPROJECT(${guid('project')},${owner},'Sample house',$,$,$,$,(${ctx}),${ua})`);
const sitePl = add(`IFCLOCALPLACEMENT($,${world})`);
const site = add(`IFCSITE(${guid('site')},${owner},'Site',$,$,${sitePl},$,$,.ELEMENT.,$,$,$,$,$)`);
const bldPl = add(`IFCLOCALPLACEMENT(${sitePl},${world})`);
const building = add(`IFCBUILDING(${guid('building')},${owner},'House',$,$,${bldPl},$,$,.ELEMENT.,$,$,$)`);
add(`IFCRELAGGREGATES(${guid('agg-p')},${owner},$,$,${project},(${site}))`);
add(`IFCRELAGGREGATES(${guid('agg-s')},${owner},$,$,${site},(${building}))`);

// colours
const style = (name, r, g, b, t = 0) => {
  const rgb = add(`IFCCOLOURRGB($,${real(r)},${real(g)},${real(b)})`);
  const shade = add(`IFCSURFACESTYLERENDERING(${rgb},${real(t)},$,$,$,$,$,$,.NOTDEFINED.)`);
  return add(`IFCSURFACESTYLE(${str(name)},.BOTH.,(${shade}))`);
};
const S = { wall: style('Wall', 0.93, 0.91, 0.88), slab: style('Slab', 0.78, 0.76, 0.74), roof: style('Roof', 0.24, 0.22, 0.23), glass: style('Glass', 0.55, 0.66, 0.72, 0.4), door: style('Door', 0.55, 0.38, 0.25) };

/** a box w × d × h (mm) at x, y, z in the storey, turned by angle (radians) about z, as an extruded rectangle */
function boxShape(w, d, h, st) {
  const p2 = add(`IFCAXIS2PLACEMENT2D(${add(`IFCCARTESIANPOINT((${real(w / 2)},${real(d / 2)}))`)},$)`);
  const prof = add(`IFCRECTANGLEPROFILEDEF(.AREA.,$,${p2},${real(w)},${real(d)})`);
  const solid = add(`IFCEXTRUDEDAREASOLID(${prof},${add(`IFCAXIS2PLACEMENT3D(${origin},$,$)`)},${Z},${real(h)})`);
  add(`IFCSTYLEDITEM(${solid},(${st}),$)`);
  const rep = add(`IFCSHAPEREPRESENTATION(${body},'Body','SweptSolid',(${solid}))`);
  return add(`IFCPRODUCTDEFINITIONSHAPE($,$,(${rep}))`);
}
function placeAt(rel, x, y, z, angle = 0) {
  const a = add(`IFCAXIS2PLACEMENT3D(${pt(x, y, z)},${Z},${dir(Math.cos(angle), Math.sin(angle), 0)})`);
  return add(`IFCLOCALPLACEMENT(${rel},${a})`);
}
const qto = (owner_, name, items, key) => {
  const set = add(`IFCELEMENTQUANTITY(${guid(`q-${key}`)},${owner},${str(name)},$,$,(${items.join(',')}))`);
  add(`IFCRELDEFINESBYPROPERTIES(${guid(`r-${key}`)},${owner},$,$,(${owner_}),${set})`);
};
const qLen = (name, v) => add(`IFCQUANTITYLENGTH(${str(name)},$,$,${real(v)},$)`);
const qArea = (name, v) => add(`IFCQUANTITYAREA(${str(name)},$,$,${real(v)},$)`);
const qVol = (name, v) => add(`IFCQUANTITYVOLUME(${str(name)},$,$,${real(v)},$)`);

const W = 10000, D = 8000, T = 200, H = 2700, SLAB = 200;
const storeys = [];
const storeyIds = [];
const contained = new Map();
for (const [i, name] of ['Ground floor', 'First floor'].entries()) {
  const z = i * H;
  const pl = placeAt(bldPl, 0, 0, z);
  const st = add(`IFCBUILDINGSTOREY(${guid(`storey-${i}`)},${owner},${str(name)},$,$,${pl},$,$,.ELEMENT.,${real(z)})`);
  storeys.push({ id: st, pl, z }); storeyIds.push(st); contained.set(st, []);
}
add(`IFCRELAGGREGATES(${guid('agg-b')},${owner},$,$,${building},(${storeyIds.join(',')}))`);

let wallNo = 0;
function wall(s, x, y, len, angle, name) {
  wallNo++;
  const shape = boxShape(len, T, H - (s.z ? 0 : 0), S.wall);
  const w = add(`IFCWALL(${guid(`wall-${wallNo}`)},${owner},${str(name)},$,$,${placeAt(s.pl, x, y, 0, angle)},${shape},$,.STANDARD.)`);
  contained.get(s.id).push(w);
  qto(w, 'Qto_WallBaseQuantities', [qLen('Length', len), qLen('Height', H), qLen('Width', T), qArea('NetSideArea', (len * H) / 1e6)], `wall-${wallNo}`);
}
// four outside walls and two inside walls on the ground floor; four outside and two inside upstairs
for (const s of storeys) {
  wall(s, 0, 0, W, 0, 'Outside wall south');
  wall(s, W, 0, D, Math.PI / 2, 'Outside wall east');
  wall(s, W, D, W, Math.PI, 'Outside wall north');
  wall(s, 0, D, D, -Math.PI / 2, 'Outside wall west');
  wall(s, 6000, T, D - 2 * T, Math.PI / 2, 'Inside wall');
  wall(s, 6000, 4000, W - 6000 - T, 0, 'Inside wall');
}
// slabs: ground, first floor; the roof is its own element
function slab(s, z, name, key, type = 'FLOOR') {
  const sl = add(`IFCSLAB(${guid(`slab-${key}`)},${owner},${str(name)},$,$,${placeAt(s.pl, -T, -T, z)},${boxShape(W + 2 * T, D + 2 * T, SLAB, S.slab)},$,.${type}.)`);
  contained.get(s.id).push(sl);
  qto(sl, 'Qto_SlabBaseQuantities', [qArea('NetArea', ((W + 2 * T) * (D + 2 * T)) / 1e6), qLen('Depth', SLAB), qVol('NetVolume', ((W + 2 * T) * (D + 2 * T) * SLAB) / 1e9)], `slab-${key}`);
}
slab(storeys[0], -SLAB, 'Ground slab', 'g');
slab(storeys[1], -SLAB, 'First floor', 'f');
slab(storeys[1], H, 'Ceiling', 'c');
// a gable roof: a triangle (across the house) pushed along the house's length
{
  const over = 400, rise = 2200, s = storeys[1];
  const tri = add(`IFCPOLYLINE((${[[-D / 2 - over, 0], [D / 2 + over, 0], [0, rise], [-D / 2 - over, 0]].map(([a, b]) => add(`IFCCARTESIANPOINT((${real(a)},${real(b)}))`)).join(',')}))`);
  const prof = add(`IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,'Gable',${tri})`);
  const pos = add(`IFCAXIS2PLACEMENT3D(${pt(-over, D / 2, H + SLAB)},${dir(1, 0, 0)},${dir(0, 1, 0)})`);
  const solid = add(`IFCEXTRUDEDAREASOLID(${prof},${pos},${Z},${real(W + 2 * over)})`);
  add(`IFCSTYLEDITEM(${solid},(${S.roof}),$)`);
  const rep = add(`IFCSHAPEREPRESENTATION(${body},'Body','SweptSolid',(${solid}))`);
  const shape = add(`IFCPRODUCTDEFINITIONSHAPE($,$,(${rep}))`);
  const roof = add(`IFCROOF(${guid('roof')},${owner},'Roof',$,$,${placeAt(s.pl, 0, 0, 0)},${shape},$,.GABLE_ROOF.)`);
  contained.get(s.id).push(roof);
}
// doors and windows sit in the outside walls (no openings are cut: this is a test file)
let doorNo = 0, winNo = 0;
function door(s, x, y, angle, name) {
  doorNo++;
  const d = add(`IFCDOOR(${guid(`door-${doorNo}`)},${owner},${str(name)},$,$,${placeAt(s.pl, x, y, 0, angle)},${boxShape(900, T + 40, 2100, S.door)},$,2100.,900.,.DOOR.,.SINGLE_SWING_LEFT.,$)`);
  contained.get(s.id).push(d);
}
function win(s, x, y, angle, w = 1200) {
  winNo++;
  const d = add(`IFCWINDOW(${guid(`win-${winNo}`)},${owner},'Window',$,$,${placeAt(s.pl, x, y, 900, angle)},${boxShape(w, T + 40, 1200, S.glass)},$,1200.,${real(w)},.WINDOW.,.SINGLE_PANEL.,$)`);
  contained.get(s.id).push(d);
}
door(storeys[0], 2000, -20, 0, 'Front door');
door(storeys[0], 7600, D - T - 20, 0, 'Back door');
door(storeys[0], 6000 + 20, 1200, Math.PI / 2, 'Inside door');
win(storeys[0], 4000, -20, 0, 1800); win(storeys[0], 7800, -20, 0); win(storeys[0], W + 20, 2500, Math.PI / 2); win(storeys[0], 1500, D - T - 20, 0);
win(storeys[1], 1500, -20, 0); win(storeys[1], 7000, -20, 0, 1800); win(storeys[1], W + 20, 5500, Math.PI / 2); win(storeys[1], 3500, D - T - 20, 0);

// spaces: no shape (a space is a volume of air), each with its floor areas
const rooms = [
  [0, 'G01', 'Living', 28.4, 30.1], [0, 'G02', 'Kitchen', 14.2, 15.0], [0, 'G03', 'Laundry', 4.6, 5.0], [0, 'G04', 'Bathroom', 4.1, 4.5], [0, 'G05', 'Entry', 6.3, 6.9],
  [1, 'F01', 'Bedroom 1', 15.2, 16.0], [1, 'F02', 'Bedroom 2', 11.8, 12.5], [1, 'F03', 'Bedroom 3', 10.4, 11.0], [1, 'F04', 'Bathroom', 5.6, 6.1], [1, 'F05', 'Hall', 7.9, 8.6],
];
const spacesOf = new Map(storeys.map((s) => [s.id, []]));
for (const [si, num, longName, net, gross] of rooms) {
  const s = storeys[si];
  const sp = add(`IFCSPACE(${guid(`space-${num}`)},${owner},${str(num)},$,$,${placeAt(s.pl, 0, 0, 0)},$,${str(longName)},.ELEMENT.,.INTERNAL.,$)`);
  spacesOf.get(s.id).push(sp);
  qto(sp, 'Qto_SpaceBaseQuantities', [qArea('NetFloorArea', net), qArea('GrossFloorArea', gross), qLen('Height', H - SLAB)], `space-${num}`);
}
for (const s of storeys) {
  add(`IFCRELAGGREGATES(${guid(`agg-sp-${s.z}`)},${owner},$,$,${s.id},(${spacesOf.get(s.id).join(',')}))`);
  add(`IFCRELCONTAINEDINSPATIALSTRUCTURE(${guid(`in-${s.z}`)},${owner},$,$,(${contained.get(s.id).join(',')}),${s.id})`);
}

const header = [
  'ISO-10303-21;',
  'HEADER;',
  "FILE_DESCRIPTION(('ViewDefinition [ReferenceView_V1.2]'),'2;1');",
  "FILE_NAME('small-house.ifc','2026-11-22T09:00:00',('Tester'),('assembl test writer'),'assembl test writer 1','assembl test writer 1','');",
  "FILE_SCHEMA(('IFC4'));",
  'ENDSEC;',
  'DATA;',
];
const out = [...header, ...lines, 'ENDSEC;', 'END-ISO-10303-21;', ''].join('\n');
const to = new URL('./small-house.ifc', import.meta.url);
writeFileSync(to, out);
console.log(`wrote ${to.pathname}: ${out.length} bytes, ${n} entities`);
