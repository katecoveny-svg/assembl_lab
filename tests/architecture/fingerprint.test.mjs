// node --test tests/architecture/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { sha256, modelFingerprint, describeModel } from '../../architecture/js/fingerprint.js';
import { HOSTED_MODELS, twinLink, TWIN_PAGE } from '../../architecture/js/model.js';

const root = new URL('../../', import.meta.url);
const file = (p) => readFileSync(new URL(p, root), 'utf8');

test('sha256 agrees with Node on short, long, empty and non-ASCII text', () => {
  for (const s of ['', 'abc', 'Tāmaki Makaurau', 'x'.repeat(54), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(1000), JSON.stringify({ a: [1, 2, { b: 'ō' }] })])
    assert.equal(sha256(s), createHash('sha256').update(s).digest('hex'));
});

// the 3D page's own sum, lifted out of its source with the type notes removed, so the two can be compared directly
function twinSha256() {
  const src = file('plan-studio/twins/src/twin/approvals.ts');
  const body = src.slice(src.indexOf('const K = new Uint32Array'), src.indexOf('/** A fingerprint of what the model says'))
    .replace('export function sha256(text: string): string', 'function sha256(text)').replace('(x: number, s: number)', '(x, s)');
  assert.doesNotMatch(body, /: (string|number)\b/, 'all type notes were removed');
  return new Function(`${body}; return sha256;`)();
}

test('it gives the same sum as the 3D page for every length, including the lengths where that sum is not standard', () => {
  const theirs = twinSha256(), odd = [];
  for (let n = 0; n < 260; n++) {
    const s = 'ā'.repeat(n % 7) + 'x'.repeat(n);
    assert.equal(sha256(s), theirs(s), `length ${n}`);
    if (sha256('x'.repeat(n)) !== createHash('sha256').update('x'.repeat(n)).digest('hex')) odd.push(n);
  }
  // known and kept on purpose: 55 bytes past a multiple of 64, the 3D page pads one block long
  assert.deepEqual(odd, [55, 119, 183, 247]);
});

test('the fingerprint is 12 characters and ignores the bulky ground data', () => {
  const plan = { schema: 'assembl.plan-model.v1', job: { title: 'T' }, revision: { current: 'A' }, buildings: [{ id: 'b1' }], site: { features: [], terrain: { heights: [1, 2, 3], clearing: { r: 4 } } } };
  const a = modelFingerprint(plan);
  assert.match(a, /^[0-9a-f]{12}$/);
  const moreGround = structuredClone(plan); moreGround.site.terrain.heights = [9, 9, 9, 9];
  assert.equal(modelFingerprint(moreGround), a, 'ground heights are not part of the fingerprint');
});

test('the fingerprint changes when the design, the revision or the clearing changes', () => {
  const plan = { schema: 'assembl.plan-model.v1', job: { title: 'T' }, revision: { current: 'A' }, buildings: [{ id: 'b1', levels: [] }], site: { features: [], terrain: { clearing: { r: 4 } } } };
  const a = modelFingerprint(plan);
  const moved = structuredClone(plan); moved.buildings[0].origin = [1, 0];
  const revB = structuredClone(plan); revB.revision.current = 'B';
  const cleared = structuredClone(plan); cleared.site.terrain.clearing.r = 5;
  for (const p of [moved, revB, cleared]) assert.notEqual(modelFingerprint(p), a);
});

test('it is the same sum the 3D page uses (plan-studio/twins/src/twin/approvals.ts)', () => {
  const core = (src) => src.match(/const core = (\{[^;]*\});/)?.[1].replace(/\s+/g, ' ');
  const ours = core(file('architecture/js/fingerprint.js')), theirs = core(file('plan-studio/twins/src/twin/approvals.ts'));
  assert.ok(ours && theirs, 'both files build the fingerprint from a "core" object');
  assert.equal(ours, theirs, 'the parts of the model that are fingerprinted must match the 3D page');
  assert.match(file('plan-studio/twins/src/twin/approvals.ts'), /sha256\(JSON\.stringify\(core\)\)\.slice\(0, 12\)/);
  assert.match(file('architecture/js/fingerprint.js'), /sha256\(JSON\.stringify\(core\)\)\.slice\(0, 12\)/);
});

test('the hosted models named in the page match the files the lab serves', () => {
  for (const m of HOSTED_MODELS) {
    const d = describeModel(file(`plan-studio/twins/drop/${m.file_name}`), m.file_name);
    assert.equal(d.fingerprint, m.fingerprint, m.file_name);
    assert.equal(d.drawings, m.drawings, m.file_name);
    assert.equal(d.revision, m.revision, m.file_name);
    assert.equal(d.schemaOk, true);
  }
});

test('describeModel refuses files that are not plan models, in plain words', () => {
  assert.throws(() => describeModel('not json', 'a.json'), /not JSON/);
  assert.throws(() => describeModel('{"hello":1}', 'a.json'), /no buildings/);
  assert.throws(() => describeModel('null', 'a.json'), /no buildings/);
  const d = describeModel('{"buildings":[]}', 'bare.json');
  assert.equal(d.drawings, 'not stated'); assert.equal(d.revision, 'not stated'); assert.equal(d.file_name, 'bare.json'); assert.equal(d.schemaOk, false);
});

test('Open in 3D: a direct link only for a model the lab hosts, and a link the 3D page will accept', () => {
  assert.equal(twinLink({ fingerprint: '' }), null);
  const hosted = twinLink({ fingerprint: HOSTED_MODELS[0].fingerprint });
  assert.deepEqual(hosted, { direct: true, href: `${TWIN_PAGE}?plan=hero.plan.json` });
  // the 3D page only opens ?plan= values that pass this test (projectPlan.ts, chooser)
  const accepted = file('plan-studio/twins/src/twin/projectPlan.ts').match(/if \(pu && (\/\^.*\$\/)\.test\(pu\)/)?.[1];
  assert.ok(accepted, 'found the 3D page’s own test for ?plan=');
  const re = new RegExp(accepted.slice(1, -1));
  for (const m of HOSTED_MODELS) assert.ok(re.test(m.file_name), m.file_name);
  assert.deepEqual(twinLink({ fingerprint: 'aaaaaaaaaaaa' }), { direct: false, href: `${TWIN_PAGE}?drop=1` });
  assert.match(file('plan-studio/twins/src/twin/projectPlan.ts'), /qs\.has\('drop'\)/, 'the 3D page still has its ?drop= door');
});
