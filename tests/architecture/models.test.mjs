// The rules behind the Models section (architecture/js/models-rules.js): kinds and how a real file starts, where a model
// is kept and how big it may be there (and what is said when it is too big), version numbers, and what a card shows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  KINDS, ACCEPT, kindOf, checkKind, placeFor, sizeProblem, BROWSER_LIMIT, SHARED_MODEL_LIMIT, PART_SIZE,
  isModel, versionOf, nextVersion, stacks, factsOf, areaOf, storeysOf, TWIN_DROP, TWIN_FILE_INPUT, sizeText,
} from '../../architecture/js/models-rules.js';
import { ifcSummary } from '../../architecture/js/ifc-summary.js';

const MB = 1024 * 1024;
const bytes = (...xs) => new Uint8Array(xs);
const text = (s) => new TextEncoder().encode(s);

test('it keeps the nine kinds asked for, and knows each by its name', () => {
  assert.deepEqual(Object.keys(KINDS), ['rvt', 'rfa', 'ifc', 'ifczip', 'nwc', 'nwd', 'dwg', 'pdf', 'glb']);
  assert.equal(ACCEPT, '.rvt,.rfa,.ifc,.ifczip,.nwc,.nwd,.dwg,.pdf,.glb');
  assert.equal(kindOf('House R3.RVT'), 'rvt');
  assert.equal(kindOf('site.IfcZip'), 'ifczip');
  assert.equal(kindOf('notes.txt'), null);
  assert.equal(kindOf('house.plan.json'), null, 'the 3D tile’s plan model is not a model here');
  assert.equal(KINDS.ifc.read, true); assert.equal(KINDS.rvt.read, undefined, 'a Revit file is kept, not read');
});

test('a file must start the way its kind does; a wrong one is refused in plain words', () => {
  const ole = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0);
  assert.equal(checkKind('house.rvt', ole), '');
  assert.equal(checkKind('chair.rfa', ole), '');
  assert.match(checkKind('house.rvt', text('ISO-10303-21;')), /does not start the way a RVT file does/);
  assert.equal(checkKind('house.ifc', text('ISO-10303-21;\nHEADER;')), '');
  assert.equal(checkKind('house.ifc', bytes(0x50, 0x4b, 3, 4)), '', 'an IFC saved zipped is still read');
  assert.match(checkKind('house.ifc', text('%PDF-1.7')), /IFC file/);
  assert.equal(checkKind('plans.pdf', text('%PDF-1.4\n')), '');
  assert.equal(checkKind('site.dwg', text('AC1032\0\0')), '');
  assert.match(checkKind('site.dwg', text('hello')), /DWG/);
  assert.equal(checkKind('house.glb', bytes(0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0)), '');
  assert.equal(checkKind('house.nwd', text('anything')), '', 'Navisworks files are not checked');
  assert.match(checkKind('house.skp', text('x')), /not a kind of model this keeps\. It keeps RVT, RFA, IFC, IFCZIP, NWC, NWD, DWG, PDF, GLB/);
  assert.match(checkKind('house.rvt', new Uint8Array(0)), /empty/);
});

test('where a model goes: the shared records up to 1 GB, or this browser up to 25 MB', () => {
  assert.deepEqual([sizeText(840 * 1024), sizeText(180 * MB), sizeText(1024 * MB), sizeText(1.5 * 1024 * MB)], ['840 KB', '180 MB', '1 GB', '1.5 GB']);
  assert.equal(SHARED_MODEL_LIMIT, 1073741824);
  assert.equal(BROWSER_LIMIT, 25 * MB);
  assert.equal(PART_SIZE, 6 * MB);
  const shared = placeFor({ shared: true, practice: 'Ridge Architects' });
  assert.deepEqual([shared.where, shared.limit], ['shared', SHARED_MODEL_LIMIT]);
  assert.equal(shared.line, 'Kept in the shared records of Ridge Architects, up to 1 GB a file.');
  assert.equal(placeFor({ shared: true, sample: true }).where, 'browser', 'the Sample stays in this browser');
  assert.equal(placeFor({}).line, 'Kept in this browser, up to 25 MB a file.');
});

test('too big for where it is kept: the size, the limit, and the way to keep it, in one message', () => {
  const big = { name: 'House R3.rvt', size: 180 * MB };
  assert.equal(sizeProblem(big, placeFor({ signIn: { phase: 'out', shared: 'ready' } })),
    '“House R3.rvt” is 180 MB. This browser keeps models up to 25 MB. Sign in to keep big models in your practice’s shared records, up to 1 GB a file.');
  assert.match(sizeProblem(big, placeFor({ signIn: { phase: 'in', shared: 'ready' } })), /Start or join a practice/);
  assert.match(sizeProblem(big, placeFor({ signIn: { phase: 'out', shared: 'not_switched_on' } })), /Shared records are not switched on yet/);
  assert.match(sizeProblem(big, placeFor({ shared: true, sample: true })), /The Sample stays in this browser/);
  assert.equal(sizeProblem(big, placeFor({ shared: true })), '', 'a 180 MB model fits the shared records');
  assert.equal(sizeProblem({ name: 'a.ifc', size: 25 * MB }, placeFor({})), '', 'exactly the limit is kept');
  assert.match(sizeProblem({ name: 'a.ifc', size: 25 * MB + 1 }, placeFor({})), /“a\.ifc” is 25 MB\. This browser keeps models up to 25 MB/);
  assert.match(sizeProblem({ name: 'huge.nwd', size: 1.5 * 1024 * MB }, placeFor({ shared: true })), /“huge\.nwd” is 1\.5 GB\. The shared records take models up to 1 GB a file/);
  assert.match(sizeProblem({ name: 'e.ifc', size: 0 }, placeFor({})), /empty/);
});

const note = (id, name, kept_at, extra) => ({ id, project_id: 'p', owner_kind: 'model', owner_id: 'p', name, type: '', size: 10, kept_at, ...(extra ? { extra } : {}) });

test('a newer upload of the same name is the next version, and the earlier one is kept', () => {
  const a1 = note('a1', 'House.rvt', '2026-11-01T00:00:00Z', { model: { version: 1 } });
  assert.equal(nextVersion([], 'House.rvt'), 1);
  assert.equal(nextVersion([a1], 'house.RVT '), 2, 'the same name, whatever its case or spaces');
  assert.equal(nextVersion([a1], 'House.ifc'), 1, 'another kind is another model');
  const a2 = note('a2', 'House.rvt', '2026-11-05T00:00:00Z', { model: { version: 2 } });
  const s = stacks([a1, a2, note('b1', 'Site.dwg', '2026-11-03T00:00:00Z')]);
  assert.deepEqual(s.map((x) => [x.name, x.latest.id, x.latest.version, x.older.map((o) => o.version)]), [['House.rvt', 'a2', 2, [1]], ['Site.dwg', 'b1', 1, []]]);
  // removing v1 does not renumber v2, and the next one is v3
  assert.equal(versionOf(a2, [a2]), 2);
  assert.equal(nextVersion([a2], 'House.rvt'), 3);
});

test('files kept without a version number (an import, an older page) are numbered by when they were kept', () => {
  const x = [note('n2', 'm.ifc', '2026-11-02T00:00:00Z'), note('n1', 'm.ifc', '2026-11-01T00:00:00Z'), note('n3', 'm.ifc', '2026-11-03T00:00:00Z')];
  assert.deepEqual(x.map((f) => versionOf(f, x)), [2, 1, 3]);
  assert.equal(nextVersion(x, 'm.ifc'), 4);
});

test('the plan model of the 3D tile, documents’ files and unknown kinds are not models', () => {
  const project = { model: { file: { id: 'plan' } } };
  assert.equal(isModel(note('m', 'a.ifc', 't'), project), true);
  assert.equal(isModel({ ...note('plan', 'a.ifc', 't') }, project), false);
  assert.equal(isModel({ ...note('d', 'a.pdf', 't'), owner_kind: 'document' }, project), false);
  assert.equal(isModel(note('j', 'house.plan.json', 't'), project), false);
});

test('an IFC card: the same six big numbers, the storeys, and a floor area only from the file’s spaces', () => {
  const s = ifcSummary(readFileSync(new URL('./fixtures/small-house.ifc', import.meta.url)));
  assert.deepEqual(factsOf(s).map((f) => [f.label, f.n]), [['Walls', 12], ['Doors', 3], ['Windows', 8], ['Slabs', 3], ['Roofs', 1], ['Spaces', 10]]);
  assert.deepEqual(storeysOf(s), [{ name: 'Ground floor', level: '0.00 m', elements: 14 }, { name: 'First floor', level: '2.70 m', elements: 13 }]);
  assert.deepEqual(areaOf(s), { value: '108.5 m²', label: 'Floor area, net', from: 'Sum of NetFloorArea on 10 of 10 spaces, from the file’s Qto_SpaceBaseQuantities' });
  assert.equal(areaOf({ spaces: { count: 4, with_net: 0, with_gross: 0, net_m2: null, gross_m2: null } }), null, 'no area is made up');
  assert.equal(areaOf({ spaces: { count: 2, with_net: 0, with_gross: 2, net_m2: null, gross_m2: 1234.5, set: 'BaseQuantities' } }).value, '1,234.5 m²');
  assert.deepEqual(factsOf(null).map((f) => f.n), [0, 0, 0, 0, 0, 0]);
});

test('the 3D page still has the chooser this hands a model to: ?drop=1, the file input, and its IFC and GLB door', () => {
  const src = readFileSync(new URL('../../plan-studio/twins/src/twin/projectPlan.ts', import.meta.url), 'utf8');
  assert.equal(TWIN_DROP, '/plan-studio/twins/drop/?drop=1');
  assert.match(src, /!qs\.has\('drop'\)/, '?drop=1 stops the example opening, so the chooser shows');
  assert.ok(src.includes(`id="${TWIN_FILE_INPUT}" accept=".pdf,.png,.jpg,.jpeg,.webp,.json,.ifc,.glb,.gltf"`), 'the chooser’s file input takes .ifc and .glb');
  assert.match(src, new RegExp(`querySelector\\('#${TWIN_FILE_INPUT}'\\) as HTMLInputElement\\)\\.addEventListener\\('change'`), 'a change on that input reads the file');
  assert.match(src, /else if \(ext === 'ifc' \|\| ext === 'glb'\) done\(\{ kind: ext, bytes: await f\.arrayBuffer\(\), name: f\.name \}\)/, 'an .ifc or .glb is opened as it is');
  const built = readFileSync(new URL('../../plan-studio/twins/drop/index.html', import.meta.url), 'utf8');
  assert.match(built, /assets\/twin-[\w-]+\.js/, 'the drop page is the built 3D page');
});
