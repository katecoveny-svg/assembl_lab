// The IFC summary reader (architecture/js/ifc-summary.js): counts, storeys, units, quantity sets and floor area, read
// from the file's own entries. The fixture is made by tests/architecture/fixtures/make-small-house.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deflateRawSync, crc32 } from 'node:zlib';
import { ifcSummary, unzipIfc, ifcBytesFrom, isIfcText, isZip, parseArgs, READER } from '../../architecture/js/ifc-summary.js';

const house = readFileSync(new URL('./fixtures/small-house.ifc', import.meta.url));

test('the small house: counts, storeys, units and where each number came from', () => {
  const s = ifcSummary(house);
  assert.equal(s.reader, READER);
  assert.equal(s.schema, 'IFC4');
  assert.equal(s.app, 'assembl test writer 1');
  assert.equal(s.view, 'ReferenceView_V1.2');
  assert.equal(s.project, 'Sample house');
  assert.deepEqual({ walls: s.counts.walls, doors: s.counts.doors, windows: s.counts.windows, slabs: s.counts.slabs, roofs: s.counts.roofs, spaces: s.counts.spaces }, { walls: 12, doors: 3, windows: 8, slabs: 3, roofs: 1, spaces: 10 });
  assert.equal(s.counts.roof_slabs, 0, 'none of the slabs is a roof slab');
  assert.equal(s.classes.IfcWall, 12); assert.equal(s.classes.IfcRoof, 1); assert.equal(s.classes.IfcSpace, undefined, 'a space is not a building element');
  assert.deepEqual(s.units, { length: 'mm', area: 'm²', volume: 'm³', length_m: 0.001, area_m2: 1, volume_m3: 1 });
  assert.deepEqual(s.storeys, [{ name: 'Ground floor', elevation_m: 0, elements: 14 }, { name: 'First floor', elevation_m: 2.7, elements: 13 }]);
  assert.equal(s.entities, 597);
  assert.equal(s.bytes, house.length);
  assert.match(s.from.counts, /IfcWall, IfcWallStandardCase/);
  assert.match(s.from.storeys, /2 IfcBuildingStorey entries/);
});

test('floor area is the sum of the spaces’ own NetFloorArea and GrossFloorArea, and says so', () => {
  const s = ifcSummary(house);
  const net = [28.4, 14.2, 4.6, 4.1, 6.3, 15.2, 11.8, 10.4, 5.6, 7.9].reduce((a, b) => a + b, 0);
  const gross = [30.1, 15.0, 5.0, 4.5, 6.9, 16.0, 12.5, 11.0, 6.1, 8.6].reduce((a, b) => a + b, 0);
  assert.equal(s.spaces.count, 10); assert.equal(s.spaces.with_net, 10); assert.equal(s.spaces.with_gross, 10);
  assert.equal(s.spaces.net_m2, Math.round(net * 100) / 100);
  assert.equal(s.spaces.gross_m2, Math.round(gross * 100) / 100);
  assert.equal(s.spaces.set, 'Qto_SpaceBaseQuantities');
  assert.deepEqual(s.spaces.list[0], { name: 'G01', long_name: 'Living', storey: 'Ground floor', net_m2: 28.4, gross_m2: 30.1 });
  assert.equal(s.spaces.list.find((x) => x.long_name === 'Hall').storey, 'First floor');
  assert.match(s.from.area, /sum of NetFloorArea on 10 of 10 spaces/);
  assert.match(s.from.area, /Nothing is measured from the shapes/);
});

test('quantity sets are summed per class, in metres and square metres, for a later takeoff', () => {
  const s = ifcSummary(house);
  const q = (cls, name) => s.quantities.find((r) => r.class === cls && r.name === name);
  // 12 walls: 4 of 10 m, 4 of 8 m, 2 of 7.6 m and 2 of 3.8 m, written in millimetres
  assert.deepEqual(q('IfcWall', 'Length'), { class: 'IfcWall', set: 'Qto_WallBaseQuantities', name: 'Length', kind: 'length', unit: 'm', total: 4 * 10 + 4 * 8 + 2 * 7.6 + 2 * 3.8, elements: 12, of: 12 });
  assert.equal(q('IfcWall', 'NetSideArea').unit, 'm²');
  assert.equal(q('IfcWall', 'NetSideArea').total, Math.round((4 * 10 + 4 * 8 + 2 * 7.6 + 2 * 3.8) * 2.7 * 1e4) / 1e4);
  assert.equal(q('IfcSlab', 'NetArea').total, Math.round(3 * 10.4 * 8.4 * 1e4) / 1e4);
  assert.equal(q('IfcSlab', 'NetVolume').unit, 'm³');
  assert.equal(q('IfcSpace', 'Height').total, Math.round(10 * 2.5 * 1e4) / 1e4);
  assert.ok(s.quantities.every((r) => !('seen' in r)), 'no working state is left on the rows');
});

// an older file of the kind Revit writes: IFC2X3, IfcWallStandardCase, feet and square feet, BaseQuantities,
// a string with an escaped quote and a non-ASCII letter, a comment, an entity over two lines, and no gross area
const IFC2X3 = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView_V2.0]'),'2;1');
FILE_NAME('C:\\\\Users\\\\someone\\\\job.ifc','2026-11-20T10:00:00',(''),(''),'The EXPRESS Data Manager Version 5.02','Autodesk Revit 2024 (ENU)','');
FILE_SCHEMA(('IFC2X3'));
ENDSEC;
DATA;
/* a comment with a ; in it */
#1=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);
#2=IFCMEASUREWITHUNIT(IFCLENGTHMEASURE(0.3048),#1);
#3=IFCDIMENSIONALEXPONENTS(1,0,0,0,0,0,0);
#4=IFCCONVERSIONBASEDUNIT(#3,.LENGTHUNIT.,'FOOT',#2);
#5=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);
#6=IFCMEASUREWITHUNIT(IFCAREAMEASURE(0.09290304),#5);
#7=IFCCONVERSIONBASEDUNIT(#3,.AREAUNIT.,'SQUARE FOOT',#6);
#8=IFCUNITASSIGNMENT((#4,#7));
#10=IFCPROJECT('2Y5Kq$9qn1Bg8aWkNiUCbL',$,'Caf\\X2\\00E9\\X0\\ o''clock',$,$,$,$,$,#8);
#20=IFCBUILDINGSTOREY('3Y5Kq$9qn1Bg8aWkNiUCbL',$,'Level 1',$,$,$,$,$,.ELEMENT.,0.);
#21=IFCBUILDINGSTOREY('4Y5Kq$9qn1Bg8aWkNiUCbL',$,'Level 2',$,$,$,$,$,.ELEMENT.,
  10.);
#30=IFCWALLSTANDARDCASE('5Y5Kq$9qn1Bg8aWkNiUCbL',$,'Basic Wall: 140; a ''name''',$,$,$,$,$);
#31=IFCWALL('6Y5Kq$9qn1Bg8aWkNiUCbL',$,'Wall',$,$,$,$,$);
#32=IFCSLAB('7Y5Kq$9qn1Bg8aWkNiUCbL',$,'Roof slab',$,$,$,$,$,.ROOF.);
#33=IFCROOF('8Y5Kq$9qn1Bg8aWkNiUCbL',$,'Roof',$,$,$,$,$,.GABLE_ROOF.);
#34=IFCRELCONTAINEDINSPATIALSTRUCTURE('9Y5Kq$9qn1Bg8aWkNiUCbL',$,$,$,(#30,#31),#20);
#40=IFCSPACE('AY5Kq$9qn1Bg8aWkNiUCbL',$,'101',$,$,$,$,'Lounge',.ELEMENT.,.INTERNAL.,$);
#41=IFCSPACE('BY5Kq$9qn1Bg8aWkNiUCbL',$,'102',$,$,$,$,'Store',.ELEMENT.,.INTERNAL.,$);
#42=IFCRELAGGREGATES('CY5Kq$9qn1Bg8aWkNiUCbL',$,$,$,#20,(#40,#41));
#50=IFCQUANTITYAREA('NetFloorArea',$,$,215.278);
#51=IFCQUANTITYLENGTH('Length',$,$,10.);
#52=IFCELEMENTQUANTITY('DY5Kq$9qn1Bg8aWkNiUCbL',$,'BaseQuantities',$,$,(#50));
#53=IFCELEMENTQUANTITY('EY5Kq$9qn1Bg8aWkNiUCbL',$,'BaseQuantities',$,$,(#51));
#54=IFCRELDEFINESBYPROPERTIES('FY5Kq$9qn1Bg8aWkNiUCbL',$,$,$,(#40),#52);
#55=IFCRELDEFINESBYPROPERTIES('GY5Kq$9qn1Bg8aWkNiUCbL',$,$,$,(#30,#31),#53);
ENDSEC;
END-ISO-10303-21;
`;

test('an IFC2X3 file in feet: units converted, standard-case walls counted, one space with an area of two', () => {
  const s = ifcSummary(IFC2X3);
  assert.equal(s.schema, 'IFC2X3');
  assert.equal(s.app, 'Autodesk Revit 2024 (ENU)');
  assert.equal(JSON.stringify(s).includes('someone'), false, 'the file’s own path (with a person’s name in it) is not kept');
  assert.equal(s.view, 'CoordinationView_V2.0');
  assert.equal(s.project, 'Café o\'clock');
  assert.equal(s.units.length, 'ft'); assert.equal(s.units.area, 'ft²');
  assert.equal(s.counts.walls, 2, 'IfcWall and IfcWallStandardCase both count as walls');
  assert.equal(s.classes.IfcWallStandardCase, 1);
  assert.equal(s.counts.slabs, 1); assert.equal(s.counts.roof_slabs, 1); assert.equal(s.counts.roofs, 1);
  assert.deepEqual(s.storeys.map((x) => [x.name, x.elevation_m, x.elements]), [['Level 1', 0, 2], ['Level 2', 3.048, 0]], 'an entity written over two lines is read');
  assert.equal(s.spaces.count, 2); assert.equal(s.spaces.with_net, 1); assert.equal(s.spaces.with_gross, 0);
  assert.equal(s.spaces.net_m2, Math.round(215.278 * 0.09290304 * 100) / 100);
  assert.equal(s.spaces.gross_m2, null, 'no gross area is made up');
  assert.equal(s.spaces.set, 'BaseQuantities');
  assert.match(s.from.area, /NetFloorArea on 1 of 2 spaces/);
  const len = s.quantities.find((r) => r.class === 'IfcWallStandardCase');
  assert.equal(len.unit, 'm'); assert.equal(len.total, 3.048);
});

test('a file with spaces but no areas, and one with no spaces, give no floor area and say why', () => {
  const noArea = IFC2X3.replace(/#54=[^\n]+\n/, '');
  assert.equal(ifcSummary(noArea).spaces.net_m2, null);
  assert.match(ifcSummary(noArea).from.area, /none of them carries a floor area/);
  const none = IFC2X3.replace(/#4[0-2]=[^\n]+\n/g, '').replace(/#54=[^\n]+\n/, '');
  assert.equal(ifcSummary(none).spaces.count, 0);
  assert.match(ifcSummary(none).from.area, /no spaces \(IfcSpace\)/);
});

test('a file with no unit assignment keeps values as written and says the unit is not stated', () => {
  const s = ifcSummary(IFC2X3.replace('#10=IFCPROJECT(', '#9=IFCDUMMY(1);\n#10=IFCPROJECT(').replace(',#8);\n#20', ',$);\n#20').replace(/#8=IFCUNITASSIGNMENT[^\n]+\n/, ''));
  assert.equal(s.units.length, null);
  assert.equal(s.storeys[1].elevation_m, null, 'an elevation in an unknown unit is not turned into metres');
  assert.equal(s.quantities.find((r) => r.name === 'Length').unit, 'unit not stated');
});

test('files that are not IFC are refused in plain words', () => {
  assert.throws(() => ifcSummary(new Uint8Array(0)), /empty/);
  assert.throws(() => ifcSummary('%PDF-1.7\n...'), /does not start like an IFC file/);
  assert.throws(() => ifcSummary('ISO-10303-21;\nHEADER;\nENDSEC;\n'), /no DATA section/);
  assert.equal(isIfcText(house.subarray(0, 40)), true);
  assert.equal(isIfcText(new TextEncoder().encode('\uFEFFISO-10303-21;')), true, 'a byte-order mark in front is fine');
  assert.equal(isZip(new Uint8Array([0x50, 0x4b, 3, 4])), true);
});

test('the argument reader handles lists, typed values, enums, refs and empty values', () => {
  assert.deepEqual(parseArgs("('a',#12,$,*,.T.,(1.,-2.5E-1),IFCLABEL('x'),())"), ['a', { ref: 12 }, null, '*', '.T.', [1, -0.25], { type: 'IFCLABEL', value: 'x' }, []]);
});

/** a zip with one entry, stored or deflated, as an IFC exporter would write it */
function zip(name, data, deflate) {
  const body = deflate ? deflateRawSync(data) : data, nm = Buffer.from(name), crc = crc32(data);
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(deflate ? 8 : 0, 8); local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nm.length, 26);
  const cen = Buffer.alloc(46); cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(deflate ? 8 : 0, 10); cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(body.length, 20); cen.writeUInt32LE(data.length, 24); cen.writeUInt16LE(nm.length, 28); cen.writeUInt32LE(0, 42);
  const at = 30 + nm.length + body.length, size = 46 + nm.length;
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(size, 12); end.writeUInt32LE(at, 16);
  return new Uint8Array(Buffer.concat([local, nm, body, cen, nm, end]));
}

test('an .ifczip is unzipped in the browser (stored or deflated) and reads the same as the .ifc', async () => {
  for (const deflate of [true, false]) {
    const z = zip('models/small-house.ifc', house, deflate);
    const got = await unzipIfc(z);
    assert.equal(got.name, 'small-house.ifc');
    assert.equal(Buffer.compare(Buffer.from(got.bytes), house), 0, 'byte for byte');
    const viaName = await ifcBytesFrom('house.ifczip', z);
    assert.deepEqual(ifcSummary(viaName.bytes).counts, ifcSummary(house).counts);
  }
  assert.equal((await ifcBytesFrom('house.ifc', house)).bytes.length, house.length, 'an .ifc is used as it is');
  await assert.rejects(unzipIfc(zip('readme.txt', Buffer.from('hello'), false)), /no \.ifc file inside/);
  await assert.rejects(unzipIfc(new Uint8Array(40)), /not a zip file/);
});
