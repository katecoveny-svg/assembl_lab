// The finished look for an opened IFC or GLB (plan-studio/twins/src/twin/dressRules.ts, used by dressModel.ts): which finish
// each part gets from its IFC class and material name, the glass tint, material names read from an IFC's own text, and where
// planting may go. The small-house fixture and an invented building made here (make-synthetic-model.mjs) are the only models.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  refineElement, needsFrame, refineByShape,
  classify, normClass, namedMaterial, meaningfulColour, glassTint, BRONZE_GREY, RULES, FINISHES, ifcMaterialNames, styleFor,
  makeGrid, markRect, fillTri, fillFootprint, distanceToFootprint, markDoor, planPlanting, allowed, cellAt,
} from '../../plan-studio/twins/src/twin/dressRules.ts';
import { syntheticGLB, SPEC } from './fixtures/make-synthetic-model.mjs';

const house = readFileSync(new URL('./fixtures/small-house.ifc', import.meta.url), 'utf8');

test('IFC class names in any case come back as IFC writes them', () => {
  assert.equal(normClass('IFCWALLSTANDARDCASE'), 'IfcWallStandardCase');
  assert.equal(normClass('ifccurtainwall'), 'IfcCurtainWall');
  assert.equal(normClass('IfcFurnishingElement'), 'IfcFurnishingElement');
  assert.equal(normClass('IFCSOMETHINGNEW'), 'IfcSomethingnew');
  assert.equal(normClass(''), '');
});

test('the mapping table: glazing, mullions, roofs, walls by material, slabs, frames, furniture, proxies', () => {
  const f = (cls, material, extra = {}) => classify({ cls, material, ...extra }).finish;
  // curtain walls and plates are glass; a see-through part of anything is glass; glass by name anywhere
  assert.equal(f('IFCPLATE', 'System Panel'), 'glass');
  assert.equal(f('IfcCurtainWall', ''), 'glass');
  assert.equal(f('IfcPlate', 'Aluminium spandrel panel'), 'metal', 'an opaque panel named as metal is a spandrel');
  assert.equal(f('IfcWindow', 'Frame', { opacity: 0.3 }), 'glass');
  assert.equal(f('IfcBuildingElementProxy', 'Glass - Clear'), 'glass');
  // members
  assert.equal(f('IFCMEMBER', 'Aluminium - Anodised'), 'mullion');
  assert.equal(f('IfcMember', 'Timber - Glulam'), 'timber');
  // roof
  assert.equal(f('IfcRoof', 'Metal - Standing Seam'), 'roof');
  assert.equal(f('IfcRoof', ''), 'roof');
  assert.equal(f('IfcSlab', 'Roof - membrane'), 'roof');
  // walls by material name, else render
  assert.equal(f('IfcWallStandardCase', 'Brick - Common'), 'brick');
  assert.equal(f('IfcWall', 'Cedar weatherboard'), 'timberCladding');
  assert.equal(f('IfcWall', 'Concrete - Precast'), 'concrete');
  assert.equal(f('IfcWall', 'Plasterboard, painted'), 'plaster');
  assert.equal(f('IfcWall', ''), 'render');
  assert.equal(f('IfcWall', 'IfcWall'), 'render', 'a material named after the class says nothing');
  // slabs
  assert.equal(f('IfcSlab', 'Concrete - Cast-in-Place'), 'slab');
  assert.equal(f('IfcSlab', 'Hardwood decking'), 'decking');
  assert.equal(f('IfcSlab', 'Paving - courtyard'), 'paving');
  // doors and windows: the solid part is the frame
  assert.equal(f('IfcDoor', 'Door - Timber'), 'frameTimber');
  assert.equal(f('IfcWindow', ''), 'frameMetal');
  // furniture by name
  assert.equal(f('IfcFurnishingElement', 'Fabric - Upholstery'), 'fabric');
  assert.equal(f('IfcFurnishingElement', '', { name: 'Chair: task' }), 'fabric');
  assert.equal(f('IfcFurniture', 'Wood - Oak'), 'timber');
  assert.equal(f('IfcFurnishingElement', '', { name: 'Cabinet' }), 'timber');
  // proxies and site
  assert.equal(f('IfcBuildingElementProxy', ''), 'neutral');
  assert.equal(f('IfcBuildingElementProxy', 'Paving - Herringbone'), 'paving');
  assert.equal(f('IfcGeographicElement', 'Planting bed'), 'bed');
  assert.equal(f('IfcSite', 'Topography'), 'lawn');
  assert.equal(f('IfcSite', ''), 'lawn');
  // no class at all (a GLB with no extras): the material name alone
  assert.equal(f('', 'Brick - Facing'), 'brick');
  assert.equal(f('', 'Steel - Galvanised'), 'metal');
  assert.equal(f('', ''), 'neutral');
});

test('every rule names its finish and says why; every finish has a label and a colour', () => {
  for (const r of RULES) { assert.ok(FINISHES[r.finish], r.id); assert.ok(r.why.length > 8, r.id); }
  for (const [k, v] of Object.entries(FINISHES)) { assert.ok(v.label, k); assert.equal(typeof v.colour, 'number'); }
  const c = classify({ cls: 'IfcWall', material: 'Brick - Common' });
  assert.equal(c.rule, 'wall-brick');
  assert.match(c.why, /brick/); assert.match(c.why, /Brick - Common/, 'the reason quotes the model’s own name');
  assert.equal(RULES.at(-1).id, 'default');
});

test('named materials, meaningful colours and the glass tint', () => {
  assert.equal(namedMaterial(''), false);
  assert.equal(namedMaterial('Default'), false);
  assert.equal(namedMaterial('ifc_0.800,0.800,0.800,1.00'), false);
  assert.equal(namedMaterial('IfcWindow', 'IFCWINDOW'), false);
  assert.equal(namedMaterial('Glass - Bronze'), true);
  // coloured glass keeps its colour, lifted toward white so it reads as a tint
  const g = glassTint({ cls: 'IfcPlate', material: 'Glass - Green', rgb: [0.2, 0.5, 0.3] });
  assert.equal(g.from, 'model'); assert.ok(g.rgb[1] > g.rgb[0] && g.rgb[1] > g.rgb[2], 'still green'); assert.ok(Math.min(...g.rgb) >= 0.35);
  // no name, or a grey: the neutral bronze-grey
  assert.deepEqual(glassTint({ cls: 'IfcPlate', material: '', rgb: [0.2, 0.5, 0.3] }), { rgb: BRONZE_GREY, from: 'default' });
  assert.deepEqual(glassTint({ cls: 'IfcPlate', material: 'Glass', rgb: [0.5, 0.5, 0.5] }).from, 'default');
  assert.equal(meaningfulColour({ cls: 'IfcDoor', material: 'Door', rgb: [0.55, 0.38, 0.25] }), true);
  assert.equal(meaningfulColour({ cls: 'IfcWall', material: 'Wall', rgb: [0.93, 0.91, 0.88] }), false, 'an off-white is not a colour to keep');
  assert.equal(meaningfulColour({ cls: 'IfcDoor', material: '', rgb: [0.55, 0.38, 0.25] }), false);
});

test('the small-house IFC: surface style names by colour, and each element’s finish', () => {
  const { names, styles } = ifcMaterialNames(house);
  assert.equal(names.size, 0, 'the fixture associates no IfcMaterial');
  assert.deepEqual(styles.map((s) => s.name), ['Wall', 'Slab', 'Roof', 'Glass', 'Door']);
  assert.equal(styleFor(styles, [0.55, 0.66, 0.72]), 'Glass');
  assert.equal(styleFor(styles, [0.555, 0.655, 0.72]), 'Glass', 'within a small tolerance');
  assert.equal(styleFor(styles, [0.1, 0.1, 0.1]), undefined);
  const c = (cls, rgb, opacity = 1) => classify({ cls, material: styleFor(styles, rgb), rgb, opacity }).finish;
  assert.equal(c('IfcWall', [0.93, 0.91, 0.88]), 'render');
  assert.equal(c('IfcSlab', [0.78, 0.76, 0.74]), 'slab');
  assert.equal(c('IfcRoof', [0.24, 0.22, 0.23]), 'roof');
  assert.equal(c('IfcWindow', [0.55, 0.66, 0.72], 0.6), 'glass');
  assert.equal(c('IfcDoor', [0.55, 0.38, 0.25]), 'frameMetal');
});

test('IfcRelAssociatesMaterial through a layer set gives each element its material names', () => {
  const text = [
    "#10=IFCMATERIAL('Brick - Common',$,$);",
    "#11=IFCMATERIAL('Insulation',$,$);",
    '#12=IFCMATERIALLAYER(#10,0.11,$,$,$,$,$);',
    '#13=IFCMATERIALLAYER(#11,0.09,$,$,$,$,$);',
    "#14=IFCMATERIALLAYERSET((#12,#13),'Wall type',$);",
    '#15=IFCMATERIALLAYERSETUSAGE(#14,.AXIS2.,.POSITIVE.,0.,$);',
    "#16=IFCRELASSOCIATESMATERIAL('2x',#1,$,$,(#100,#101),#15);",
    "#17=IFCMATERIAL('Glass',$,$);",
    "#18=IFCRELASSOCIATESMATERIAL('2y',#1,$,$,(#102),#17);",
  ].join('\n');
  const { names } = ifcMaterialNames(text);
  assert.deepEqual(names.get(100), ['Brick - Common', 'Insulation']);
  assert.deepEqual(names.get(101), ['Brick - Common', 'Insulation']);
  assert.deepEqual(names.get(102), ['Glass']);
  assert.equal(classify({ cls: 'IfcWallStandardCase', material: names.get(100).join(', ') }).finish, 'brick');
});

test('the invented big building: every node’s class and material map to the expected finish', () => {
  const r = syntheticGLB();
  assert.ok(r.drawn > 6e6, `about ${(r.drawn / 1e6).toFixed(1)} M triangles drawn, the scale of a big browser copy`);
  assert.ok(r.nodes > 2000);
  const { nodes, materials, meshes } = r.json;
  const counts = {};
  for (const n of nodes) {
    const m = materials[meshes[n.mesh].primitives[0].material];
    const fin = classify({ cls: n.extras.ifc_class, name: n.extras.ifc_name, material: m.name, rgb: m.pbrMetallicRoughness.baseColorFactor.slice(0, 3), opacity: m.alphaMode === 'BLEND' ? m.pbrMetallicRoughness.baseColorFactor[3] : 1 }).finish;
    counts[`${n.extras.ifc_class}:${fin}`] = (counts[`${n.extras.ifc_class}:${fin}`] ?? 0) + 1;
  }
  const panels = Math.round(SPEC.length / SPEC.bay) * SPEC.storeys * 2;
  assert.equal(counts['IFCPLATE:glass'], panels);
  assert.equal(counts['IFCMEMBER:mullion'], panels * 2);
  assert.equal(counts['IFCROOF:roof'], 1);
  assert.equal(counts['IFCWALLSTANDARDCASE:brick'], 2);
  assert.equal(counts['IFCSLAB:slab'], SPEC.storeys + 1);
  assert.equal(counts['IFCDOOR:frameTimber'], 2);
  assert.equal(counts['IFCFURNISHINGELEMENT:fabric'], SPEC.chairs.shared + 1, 'the shared chairs and the one instanced node');
  assert.equal(counts['IFCFURNITURE:timber'], 12 * SPEC.storeys);
  assert.equal(counts['IFCBUILDINGELEMENTPROXY:paving'], 2);
  assert.equal(counts['IFCGEOGRAPHICELEMENT:bed'], 2);
  assert.equal(counts['IFCSITE:lawn'], 1);
  assert.equal(Object.keys(counts).length, 11, JSON.stringify(counts));
});

// --- placement -------------------------------------------------------------------------------------------------------
/** a 12 × 8 m house at the origin with a door on its south face (+z), and a 2 m path running from the door to the south */
function houseGrid({ path = true, beds = false, lawn = false } = {}) {
  const g = makeGrid([-6, -4], [6, 4], 26);
  // the outline only, as walls would mark it: the inside is filled by fillFootprint
  markRect(g, g.occ, -6, -4, 6, -3.8); markRect(g, g.occ, -6, 3.8, 6, 4); markRect(g, g.occ, -6, -4, -5.8, 4); markRect(g, g.occ, 5.8, -4, 6, 4);
  if (path) markRect(g, g.hard, -1, 4, 1, 20);
  if (beds) { fillTri(g, g.soft, [-12, -9, 0.1], [12, -9, 0.1], [12, -6, 0.1], 2); fillTri(g, g.soft, [-12, -9, 0.1], [12, -6, 0.1], [-12, -6, 0.1], 2); }
  if (lawn) { fillTri(g, g.soft, [-30, -30, 0], [30, -30, 0], [30, 30, 0], 1); fillTri(g, g.soft, [-30, -30, 0], [30, 30, 0], [-30, 30, 0], 1); }
  markDoor(g, { min: [-0.5, 3.9], max: [0.5, 4.1] });
  fillFootprint(g);
  return g;
}
const inside = (x, z) => x > -6 && x < 6 && z > -4 && z < 4;

test('the footprint is everything the outline walls in, and distances are measured from it', () => {
  const g = houseGrid();
  assert.equal(g.occ[cellAt(g, 0, 0)], 1, 'the middle of the house is footprint though nothing marked it');
  assert.equal(g.occ[cellAt(g, 0, 10)], 0);
  const D = distanceToFootprint(g);
  assert.equal(D[cellAt(g, 0, 0)], 0);
  const d = D[cellAt(g, 0.25, 9.25)];
  assert.ok(d > 4.5 && d < 5.6, `about 5 m south of the wall: ${d}`);
});

test('ring planting: never inside the footprint, on the path, or in the door’s keep-clear strip; trees stand back', () => {
  const g = houseGrid();
  const p = planPlanting(g, { seed: 3, baseY: 0 });
  assert.equal(p.where, 'ring');
  assert.ok(p.shrubs.length > 15, `${p.shrubs.length} shrubs`);
  assert.ok(p.trees.length >= 2, `${p.trees.length} trees`);
  const D = distanceToFootprint(g);
  for (const s of [...p.shrubs, ...p.trees]) {
    assert.ok(!inside(s.x, s.z), `not inside the footprint: ${s.x}, ${s.z}`);
    assert.ok(!(Math.abs(s.x) < 1 && s.z > 4 && s.z < 20), `not on the path: ${s.x}, ${s.z}`);
    assert.ok(allowed(g, s.x, s.z), `allowed where it stands: ${s.x}, ${s.z}`);
    assert.equal(s.y, 0, 'on the flat ground');
  }
  for (const s of p.shrubs) { const d = D[cellAt(g, s.x, s.z)]; assert.ok(d > 1.7 && d < 6.7, `shrubs in the ring, a clear band off the house: ${d}`); }
  for (const t of p.trees) {
    const d = D[cellAt(g, t.x, t.z)]; assert.ok(d >= 6 && d <= 22, `trees stand back: ${d}`);
    assert.ok(t.h >= 6 && t.h <= 10.5, 'tree heights as grown trees, not toys'); assert.ok(t.r >= 2.2);
  }
  // the keep-clear strip in front of the door: 4 m out, a metre each side of it
  assert.ok(!p.shrubs.some((s) => Math.abs(s.x) < 1.4 && s.z > 4 && s.z < 8), 'nothing in front of the door');
  // shrubs keep their spacing
  for (let i = 0; i < p.shrubs.length; i++) for (let j = i + 1; j < p.shrubs.length; j++) assert.ok(Math.hypot(p.shrubs[i].x - p.shrubs[j].x, p.shrubs[i].z - p.shrubs[j].z) >= 0.55);
  // ponga and tī kōuka are accents
  assert.ok(p.shrubs.filter((s) => s.sp === 'ponga' || s.sp === 'tikouka').length <= Math.max(2, Math.round(900 / 60)));
});

test('the same seed gives the same planting; the opening view has no trees in front of it', () => {
  const a = planPlanting(houseGrid(), { seed: 5 }), b = planPlanting(houseGrid(), { seed: 5 });
  assert.deepEqual(a, b);
  const view = { from: [0, 30], at: [0, 0], half: 0.7 };
  const p = planPlanting(houseGrid(), { seed: 5, view, maxTrees: 30 });
  for (const t of p.trees) { const ang = Math.acos((t.z) / Math.hypot(t.x, t.z)); assert.ok(ang >= 0.7, `tree at ${t.x.toFixed(1)}, ${t.z.toFixed(1)} is out of the view`); }
});

test('with the model’s own planting beds, shrubs go only in the beds, at the bed’s height', () => {
  const g = houseGrid({ beds: true });
  const p = planPlanting(g, { seed: 9, baseY: 0 });
  assert.equal(p.where, 'model');
  assert.ok(p.shrubs.length > 10);
  for (const s of p.shrubs) { assert.equal(g.soft[cellAt(g, s.x, s.z)], 2, 'in a bed'); assert.ok(Math.abs(s.y - 0.1) < 1e-6, 'on the bed surface'); }
  assert.match(p.said, /planting areas/);
});

test('with only the model’s lawn: shrubs along its edge by the building, trees on the lawn, still off the path', () => {
  const g = houseGrid({ lawn: true });
  const p = planPlanting(g, { seed: 2 });
  assert.equal(p.where, 'model');
  const D = distanceToFootprint(g);
  for (const s of p.shrubs) { const d = D[cellAt(g, s.x, s.z)]; assert.ok(d > 1.7 && d < 5, `by the building, past the clear band: ${d}`); }
  for (const s of [...p.shrubs, ...p.trees]) assert.ok(allowed(g, s.x, s.z));
});

test('a model that fills its grid leaves no room: nothing is planted rather than planting on it', () => {
  const g = makeGrid([0, 0], [10, 10], 1);
  markRect(g, g.occ, -5, -5, 20, 20);
  const p = planPlanting(g, {});
  assert.equal(p.shrubs.length + p.trees.length, 0);
});

test('the 3D page hooks it in with a few marked lines, and keeps ground, terrain and camera-path code out of it', () => {
  const plan = readFileSync(new URL('../../plan-studio/twins/src/twin/projectPlan.ts', import.meta.url), 'utf8');
  assert.match(plan, /import \{ dressModel, type Dressed \} from '\.\/dressModel';/);
  assert.match(plan, /dressed = await dressModel\(app, obj, \{ kind: input\.kind/);
  assert.match(plan, /if \(dressed\) layers\.push\(\.\.\.dressed\.layers\);/);
  const src = readFileSync(new URL('../../plan-studio/twins/src/twin/dressModel.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /siteGround|modelGround|camPath|cameraPath|realGround/, 'no ground or camera-path code in the dress module');
  assert.match(src, /Finishes: interpreted from the model’s classes and material names/);
  assert.match(src, /As it is/); assert.match(src, /Model’s colours/); assert.match(src, /Finished look/);
  // it never moves a part: no position, rotation, scale or matrix writes on the model's meshes
  assert.doesNotMatch(src, /p\.mesh\.(position|rotation|scale|matrix)\b\s*[.=]/);
});

test('a door with no glass is its leaf (stained timber); windows and doors with no frame part get one drawn', () => {
  const leaf = refineElement('IFCDOOR', [classify({ cls: 'IfcDoor', material: '' })]);
  assert.equal(leaf[0].finish, 'door'); assert.equal(leaf[0].rule, 'door-leaf');
  // a glazed door keeps its frame and its glass
  const glazed = refineElement('IfcDoor', [classify({ cls: 'IfcDoor', material: 'Glass' }), classify({ cls: 'IfcDoor', material: 'Aluminium' })]);
  assert.deepEqual(glazed.map((c) => c.finish), ['glass', 'frameMetal']);
  assert.equal(refineElement('IfcWall', [classify({ cls: 'IfcWall' })])[0].finish, 'render');
  assert.equal(needsFrame('IfcWindow', ['glass']), true);
  assert.equal(needsFrame('IfcWindow', ['glass', 'frameMetal']), false);
  assert.equal(needsFrame('IfcDoor', ['door']), true);
  assert.equal(needsFrame('IfcWall', ['glass']), false);
});

test('ponga and tī kōuka stay out of the opening view’s wedge', () => {
  const view = { from: [0, 30], at: [0, 0], half: 0.7 };
  for (const seed of [1, 2, 3, 4, 5]) {
    const p = planPlanting(houseGrid(), { seed, view, maxShrubs: 1400 });
    for (const s of p.shrubs.filter((x) => x.sp === 'ponga' || x.sp === 'tikouka')) assert.ok(Math.acos(s.z / Math.hypot(s.x, s.z)) >= 0.7);
  }
});

test('a model with no classes is read by shape: a surface far wider than the building is grass, a big sloping surface high up is roof', () => {
  const brick = classify({ cls: '', material: 'Brick 01' });
  assert.equal(refineByShape(brick, '', { across: 900, span: 90, slope: 0.1, up: 0.9, high: 0.1 }).finish, 'lawn', 'a topography mesh named brick is still the ground');
  assert.equal(refineByShape(brick, '', { across: 20, span: 90, slope: 0.1, up: 0.1, high: 0.4 }).finish, 'brick', 'a brick wall stays brick');
  const alum = classify({ cls: '', material: '!! ALUM' });
  assert.equal(alum.finish, 'mullion', 'aluminium is the dark frames, not grey steel');
  assert.equal(refineByShape(alum, '', { across: 40, span: 90, slope: 0.9, up: 0.9, high: 0.7 }).finish, 'roof');
  assert.equal(refineByShape(alum, '', { across: 2, span: 90, slope: 0.9, up: 0.9, high: 0.7 }).finish, 'mullion', 'a small part is not a roof');
  assert.equal(refineByShape(classify({ cls: 'IfcWall', material: '' }), 'IfcWall', { across: 900, span: 90, slope: 0, up: 1, high: 0 }).finish, 'render', 'a class decides');
  assert.equal(classify({ cls: '', material: 'ASPHALT - ROAD' }).finish, 'asphalt');
});

test('a dark paint or powder coat is charcoal-bronze metal, never white plaster; glass defaults to warm bronze', () => {
  assert.equal(classify({ cls: '', material: '!_Black_Paint(1)' }).finish, 'darkMetal');
  assert.equal(classify({ cls: 'IfcMember', material: 'Metal - Black - PC1' }).finish, 'darkMetal');
  assert.equal(classify({ cls: '', material: 'Paint - White' }).finish, 'plaster');
  assert.equal(classify({ cls: 'IfcWall', material: 'Brick - Black' }).finish, 'brick', 'a dark brick is still brick');
  assert.ok(BRONZE_GREY[0] > BRONZE_GREY[2] + 0.2, 'the default glass tint is warm');
});
