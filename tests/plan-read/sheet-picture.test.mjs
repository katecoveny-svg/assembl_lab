// Two fixes to the drop page's reading of a PDF set, checked in the source (both run in the browser on a canvas):
// 1. Choosing a sheet whose plan is a picture, after a sheet measured from its linework, must not reuse the old sheet's read
//    when the AI reader is asked (traceUI.ts: a new read starts clean).
// 2. Finding a plan picture by its ink must not throw the picture away as the sheet's border because it is nearly as tall as
//    the sheet (planTrace.ts inkBox: a border spans the sheet both ways).
// Run with:  node --test tests/plan-read/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = (f) => readFileSync(new URL(`../../plan-studio/twins/src/twin/${f}`, import.meta.url), 'utf8');

test('a new read starts clean, so the AI button reads the sheet now chosen', () => {
  const s = src('traceUI.ts'), run = s.slice(s.indexOf('const run = async (useAi: boolean)'), s.indexOf('const t0 = performance.now();', s.indexOf('const run = async (useAi: boolean)')));
  assert.match(run, /reads = \[\]; built = \[\]; include = \[\];/);
  assert.match(s, /if \(reads\.length && reads\[0\]\.src === 'drawing'\)/, 'the AI button still reads only the rest of the set when this sheet was measured');
});

test('a plan picture nearly as tall as the sheet is not taken for the sheet border', () => {
  const s = src('planTrace.ts'), ink = s.slice(s.indexOf('async function inkBox'), s.indexOf('// ----', s.indexOf('async function inkBox')));
  assert.match(ink, /if \(x1 - x0 > W \* 0\.85 && y1 - y0 > H \* 0\.85\) continue;/);
  assert.doesNotMatch(ink, /x1 - x0 > W \* 0\.85 \|\| y1 - y0 > H \* 0\.85/);
});
