// The ops page's files are versioned by their content (tools/arch-importmap.mjs). If this fails, run
//   node tools/arch-importmap.mjs
// and commit architecture/index.html: otherwise a returning visitor's browser can mix new and cached files.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expected, rewrite } from '../../tools/arch-importmap.mjs';

const html = readFileSync(new URL('../../architecture/index.html', import.meta.url), 'utf8');

test('index.html is in step with the files (run node tools/arch-importmap.mjs)', () => {
  assert.equal(rewrite(html), html);
});

test('every script in architecture/js is in the import map, with a version', () => {
  const m = html.match(/<script type="importmap">(.*?)<\/script>/s);
  assert.ok(m, 'the page has an import map');
  const { imports } = JSON.parse(m[1]);
  const want = expected();
  assert.deepEqual(Object.keys(imports).sort(), Object.keys(want.imports).sort());
  for (const [k, v] of Object.entries(imports)) assert.match(v, new RegExp(`^${k.replace('.', '\\.')}\\?v=[0-9a-f]{10}$`));
});

test('the import map comes before the page script, so every import goes through it', () => {
  assert.ok(html.indexOf('type="importmap"') < html.indexOf('<script type="module"'));
});
