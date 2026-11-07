// node --test tools/study-teardown/tests/*.test.mjs
// The four-stroke model must agree with the hand calculations; the template must run its own checks; the kit must
// stay on brand (no violet or lilac, no glow, lowercase "assembl").
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const load = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const passes = (k) => (k.abs ? Math.abs(k.got - k.want) : Math.abs(k.got - k.want) / (Math.abs(k.want) || 1)) <= (k.tol ?? 0.01);

test('four-stroke: every hand check passes at the spec sheet compression ratio', async () => {
  const m = await load('study/teardown/four-stroke/model.js');
  for (const k of m.checks({cr: 9, q: 800, spark: true})) assert.ok(passes(k), `${k.name}: ${k.got} vs ${k.want}`);
});

test('four-stroke: hand checks pass across the input ranges', async () => {
  const m = await load('study/teardown/four-stroke/model.js');
  for (const cr of [6, 7.5, 12]) for (const q of [200, 1500]) for (const k of m.checks({cr, q, spark: true})) assert.ok(passes(k), `cr ${cr} q ${q}: ${k.name}`);
});

test('four-stroke: known values by hand', async () => {
  const m = await load('study/teardown/four-stroke/model.js');
  const K = m.cycle({cr: 9, q: 800});
  assert.ok(Math.abs(m.VD / 1000 - 163.43) < 0.01, 'swept volume 163.43 cm³');
  assert.ok(Math.abs(K.p2 - 21.674) < 0.001, 'compression pressure 9^1.4 = 21.674 bar');
  assert.ok(Math.abs(K.eta - 0.58476) < 1e-4, 'efficiency 1 − 9^−0.4 = 0.585');
  assert.ok(Math.abs(K.W - 99.89) < 0.05, 'ideal work 99.9 J per cycle');
  assert.equal(m.at(0).stroke, 'Intake');
  assert.equal(m.at(200).stroke, 'Compression');
  assert.equal(m.at(400).stroke, 'Power');
  assert.equal(m.at(600).stroke, 'Exhaust');
  assert.equal(m.at(90).liftEx, 0, 'exhaust shut during intake');
  assert.equal(m.at(630).liftIn, 0, 'intake shut during exhaust');
  assert.ok(m.at(380).torque > 0 && m.at(300).torque < 0, 'power pushes the crank, compression takes it back');
});

test('four-stroke: every number comes from the state, and the state is a pure function of θ', async () => {
  const m = await load('study/teardown/four-stroke/model.js');
  assert.deepEqual(m.at(123.4, {cr: 9, q: 800}), m.at(123.4 + 720, {cr: 9, q: 800}));
  assert.deepEqual(m.at(500), m.at(500));
});

test('template: the starter machine passes its own checks', async () => {
  const m = await load('tools/study-teardown/template/model.js');
  for (const k of m.checks()) assert.ok(passes(k), k.name);
  assert.equal(m.at(0).x, 0);
});

test('kit and example stay on brand', () => {
  const files = ['study/teardown/kit/teardown.css', 'study/teardown/kit/teardown.js', 'study/teardown/four-stroke/main.js', 'study/teardown/four-stroke/machine.js', 'study/teardown/four-stroke/index.html'];
  const banned = /#(C7B4F0|D7B3F0|D9CBF2|6A50BE|8B5CF6|7C3AED|A78BFA)\b|violet|lavender|lilac|box-shadow:[^;]*0 0 \d+px|text-shadow/i;
  const brand = /\bAssembl\b|ASSEMBL|\bAssemble\b(?= (study|lab))/;
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/No violet, no glows|No violet, no glow|no violet or lilac|No glows|no glows/gi, '');
    const hit = text.match(banned) || text.match(brand);
    assert.equal(hit, null, `${f}: ${hit && hit[0]}`);
  }
});

test('the kit never reaches into the existing study machines', () => {
  for (const f of ['study/teardown/kit/teardown.js', 'study/teardown/four-stroke/main.js', 'study/teardown/four-stroke/machine.js', 'tools/study-teardown/new-machine.cjs']) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(!/['"`][^'"`\n]*study\/m\//.test(text), `${f} references study/m/`);
  }
});
