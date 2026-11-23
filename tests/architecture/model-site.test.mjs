// Where an opened IFC says it stands (plan-studio/twins/src/twin/modelSite.ts), how the site point and north are chosen, how the
// ground storey's level is labelled against the LiDAR, and the 3D page's practice look. The small-house fixture has no site
// position; the georeferenced copies below are made from it here with invented numbers (an Auckland park, made-up levels).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readIfcSite, compoundAngle, pickSitePoint, northFrom, groundStorey, floorFor, isNZTM, args } from '../../plan-studio/twins/src/twin/modelSite.ts';
import { pageLook, LOOK_CACHE } from '../../plan-studio/twins/src/twin/practiceLook.ts';
import { fromNZTM, toNZTM } from '../../plan-studio/twins/src/twin/linz/nztm.js';

const house = readFileSync(new URL('./fixtures/small-house.ifc', import.meta.url), 'utf8');
const SITE = /#19=IFCSITE\([^;]*\);/;
// invented: Victoria Park, Auckland, about -36.8481, 174.7536, written as IFC compound angles; RefElevation 12500 mm
const withSite = (extra = '') => house.replace(SITE, "#19=IFCSITE('0gHPqEPj4IG5$s0f7wmzMq',#5,'Site',$,$,#18,$,$,.ELEMENT.,(-36,-50,-53,-160000),(174,45,12,960000),12500.,$,$);" + extra);

test('the small-house fixture: millimetres, two storeys, and no site position, north or map conversion', () => {
  const s = readIfcSite(house);
  assert.equal(s.schema, 'IFC4');
  assert.equal(s.unit, 0.001); assert.equal(s.unitSaid, true);
  assert.deepEqual(s.storeys, [{ name: 'Ground floor', elevation: 0 }, { name: 'First floor', elevation: 2.7 }]);
  assert.equal(s.lat, null); assert.equal(s.lng, null); assert.equal(s.elevation, null);
  assert.equal(s.trueNorth, null); assert.equal(s.map, null);
  assert.deepEqual(s.said, ['length unit millimetres', '2 storeys']);
  assert.equal(pickSitePoint({ ifc: s }), null, 'no point is made up');
  const n = northFrom(s); assert.equal(n.tag, 'proposed'); assert.equal(n.deg, 0); assert.match(n.says, /proposed/);
  assert.deepEqual(groundStorey(s.storeys), { name: 'Ground floor', elevation: 0, why: 'the lowest storey' });
});

test('IfcSite RefLatitude, RefLongitude and RefElevation (as IFC2X3 files have them) are read and labelled', () => {
  const s = readIfcSite(withSite());
  assert.ok(Math.abs(s.lat - (-(36 + 50 / 60 + 53.16 / 3600))) < 1e-9); assert.ok(Math.abs(s.lng - (174 + 45 / 60 + 12.96 / 3600)) < 1e-9);
  assert.equal(s.elevation, 12.5);
  assert.ok(s.said.includes('IfcSite RefLatitude and RefLongitude') && s.said.includes('IfcSite RefElevation'));
  const p = pickSitePoint({ ifc: s }); assert.equal(p.source, 'from the IFC'); assert.match(p.note, /RefLatitude/);
  assert.equal(compoundAngle('(-36,-50,-53,-160000)').toFixed(6), '-36.848100');
});

test('TrueNorth and an IfcMapConversion to NZTM2000 (Revit with Shared Coordinates) give north and the point', () => {
  // invented: true north 20° west of up the plan, and the model origin on NZTM at Victoria Park, 12.5 m height, x axis turned 15°
  const tn = [Math.sin((-20 * Math.PI) / 180), Math.cos((-20 * Math.PI) / 180)], q = toNZTM(-36.8481, 174.7536), ph = (15 * Math.PI) / 180;
  const text = withSite().replace('#15=IFCGEOMETRICREPRESENTATIONCONTEXT($,\'Model\',3,1.E-05,#14,$);', `#15=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#14,#9001);#9001=IFCDIRECTION((${tn[0]},${tn[1]}));`)
    .replace('ENDSEC;\nEND', `#9002=IFCPROJECTEDCRS('EPSG:2193','NZGD2000 / New Zealand Transverse Mercator 2000',$,$,$,$,$);#9003=IFCMAPCONVERSION(#15,#9002,${q.e},${q.n},12.5,${Math.cos(ph)},${Math.sin(ph)},1.);\nENDSEC;\nEND`);
  const s = readIfcSite(text);
  assert.ok(Math.abs(s.trueNorth[0] - tn[0]) < 1e-9);
  assert.equal(s.map.crs, 'EPSG:2193'); assert.ok(isNZTM(s.map.crs)); assert.ok(Math.abs(s.map.eastings - q.e) < 1e-6);
  const n = northFrom(s, 0.5); assert.equal(n.tag, 'from the IFC'); assert.equal(n.deg, -20); assert.match(n.says, /TrueNorth/);
  // without TrueNorth, north comes from the map conversion's grid, turned for the convergence
  const noTN = { ...s, trueNorth: null }, n2 = northFrom(noTN, 0.5); assert.equal(n2.deg, 14.5); assert.match(n2.says, /grid north/);
  // the map conversion's point is preferred to RefLatitude and RefLongitude; the workspace's and a typed one beat both
  const p = pickSitePoint({ ifc: s, fromMap: fromNZTM }); assert.equal(p.source, 'from the IFC map conversion'); assert.ok(Math.abs(p.lat + 36.8481) < 1e-6);
  assert.equal(pickSitePoint({ ifc: s, fromMap: fromNZTM, handoff: { lat: -36.9, lng: 174.8, source: 'LINZ address' } }).source, 'from the workspace');
  assert.equal(pickSitePoint({ ifc: s, handoff: { lat: -36.9, lng: 174.8 }, typed: { lat: -36.85, lng: 174.76 } }).source, 'typed here');
  assert.equal(pickSitePoint({ handoff: { lat: 51.5, lng: -0.1 } }), null, 'a point outside New Zealand is not used');
  assert.equal(isNZTM('EPSG:27700'), false);
});

test('the ground storey: the lowest not below −0.5 m, so a basement is passed over', () => {
  assert.equal(groundStorey([{ name: 'Basement', elevation: -3 }, { name: 'Level 1', elevation: 0.2 }, { name: 'Level 2', elevation: 3.4 }]).name, 'Level 1');
  assert.equal(groundStorey([]), null);
});

test('the ground storey level: a stated level near the LiDAR is used; a far one is reported and not used; the rule is said', () => {
  const under = { min: 11.8, max: 12.9, mean: 12.3 };
  const near = floorFor({ stated: 12.5, bottomBelow: 0.3, under });
  assert.equal(near.tag, 'from the IFC'); assert.equal(near.floor, 12.5); assert.match(near.text, /the level the IFC states/);
  const far = floorFor({ stated: 100, bottomBelow: 0.3, under });
  assert.equal(far.tag, 'assumed'); assert.equal(far.far, 87.7); assert.ok(Math.abs(far.floor - 12.6) < 1e-9);
  assert.match(far.text, /87\.70 m above the LiDAR ground: that looks like a site datum/); assert.match(far.text, /It is not used/);
  const kept = floorFor({ stated: 100, bottomBelow: 0.3, under, keepStated: true });
  assert.equal(kept.floor, 100); assert.match(kept.text, /kept at your choice/);
  const none = floorFor({ stated: null, bottomBelow: 0.3, under });
  assert.equal(none.tag, 'assumed'); assert.match(none.text, /lowest part \(0\.30 m below the ground storey\) at the mean LiDAR ground/); assert.match(none.text, /Assumed until you set it/);
  const hand = floorFor({ stated: 100, bottomBelow: 0.3, under, byHand: 13.1 });
  assert.equal(hand.tag, 'set by hand'); assert.equal(hand.floor, 13.1);
});

test('STEP arguments split at the top level only, quotes and lists kept whole', () => {
  assert.deepEqual(args("'a,b',(1,2),$,'it''s'"), ["'a,b'", '(1,2)', '$', "'it''s'"]);
});

test('the 3D page wears the practice’s look only when opened from its workspace', () => {
  const store = (v) => (k) => (k === LOOK_CACHE ? v : null);
  assert.equal(pageLook('?drop=1&from=ops&handoff=x', store('sketch')), 'sketch');
  assert.equal(pageLook('?drop=1&handoff=x', store('sketch')), 'assembl', 'a public lab page keeps assembl’s look');
  assert.equal(pageLook('?from=ops', store('neon')), 'assembl', 'an unknown look is not honoured');
  assert.equal(pageLook('?from=ops', () => { throw new Error('closed'); }), 'assembl');
  assert.equal(LOOK_CACHE, readFileSync(new URL('../../architecture/js/theme.js', import.meta.url), 'utf8').match(/LOOK_CACHE = '([^']+)'/)[1], 'the same key the workspace keeps its look under');
});
