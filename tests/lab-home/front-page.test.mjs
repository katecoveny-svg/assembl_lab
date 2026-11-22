// The lab front page (/index.html): every link and asset on it resolves to a file in this repo, every #anchor to an id
// on the page, the live hero's plan model is a served file, and the page carries no client names and no off-brand words.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const refs = [...html.matchAll(/\b(?:href|src|srcset|imagesrcset)="([^"]+)"/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().split(/\s+/)[0]));
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const ignored = new RegExp(String.raw`^(https?:)?//`);

// a site path served as a file, or as a folder's index.html (trailing slash); not under a path the deploy leaves out
function resolves(p) {
  const clean = decodeURIComponent(p.split(/[?#]/)[0]);
  const f = path.join(ROOT, clean);
  if (clean.endsWith('/')) return fs.existsSync(path.join(f, 'index.html'));
  return fs.existsSync(f) && fs.statSync(f).isFile();
}
const notServed = ['/plan-studio/twins/src/', '/whaiao-story/', '/docs/', '/scripts/', '/cars/dealer-twin/private/'];

test('every internal link and asset on the front page is a file in the repo', () => {
  const internal = refs.filter((r) => r.startsWith('/'));
  assert.ok(internal.length > 30, `expected the page's links and pictures, found ${internal.length}`);
  const missing = internal.filter((r) => !resolves(r));
  assert.deepEqual(missing, [], 'missing files: ' + missing.join(', '));
  const hidden = internal.filter((r) => notServed.some((n) => r.startsWith(n)));
  assert.deepEqual(hidden, [], 'links to paths that are not deployed: ' + hidden.join(', '));
});

test('every #anchor on the front page points to an id on it', () => {
  const anchors = refs.filter((r) => r.startsWith('#'));
  assert.ok(anchors.length >= 4);
  const bad = anchors.filter((a) => !ids.has(a.slice(1)));
  assert.deepEqual(bad, []);
});

test('external links are https only', () => {
  const ext = refs.filter((r) => ignored.test(r));
  assert.ok(ext.every((r) => r.startsWith('https://')), ext.join(', '));
});

test('the live hero loads files that exist and are deployed', () => {
  const hero = fs.readFileSync(path.join(ROOT, 'lab/v4/hero.js'), 'utf8');
  const house = fs.readFileSync(path.join(ROOT, 'lab/v4/house.js'), 'utf8');
  const loads = [...(hero + house).matchAll(/["'](\/[^"'?]+\.(?:json|js))["'?]/g)].map((m) => m[1]);
  assert.ok(loads.includes('/plan-studio/twins/services/plan16a.json'));
  for (const l of loads) { assert.ok(resolves(l), l); assert.ok(!notServed.some((n) => l.startsWith(n)), l + ' is not deployed'); }
  assert.ok(fs.existsSync(path.join(ROOT, 'lab/v4/house.js')));
  // reduced motion keeps the rendering only; off screen it stops drawing
  assert.match(hero, /prefers-reduced-motion: reduce/);
  assert.match(hero, /IntersectionObserver/);
  assert.match(hero, /visibilitychange/);
});

test('the hero rendering is labelled as a rendering, and the live model as a model', () => {
  assert.match(html, /Rendering · not a photograph/);
  assert.match(fs.readFileSync(path.join(ROOT, 'lab/v4/hero.js'), 'utf8'), /not a scan/);
});

test('no client or project names, and the brand stays lowercase', () => {
  const text = html + fs.readFileSync(path.join(ROOT, 'lab/v4/hero.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'lab/v4/house.js'), 'utf8');
  for (const w of ['Whaiao', 'Weteriana', 'Wesley', 'Ryuki', 'Nick', 'Glenbrook', 'Waiheke', 'Hubert', 'Henderson']) assert.ok(!text.includes(w), w);
  assert.ok(!/\bAssembl\b|\bASSEMBL\b/.test(html), 'assembl is always lowercase');
  assert.ok(!/\bAI\b/.test(html.replace(/<[^>]+>/g, ' ')), 'no bare "AI" in page copy');
  for (const w of ['seamless', 'leverage', 'supercharge']) assert.ok(!html.toLowerCase().includes(w), w);
});

test('existing addresses are kept', () => {
  for (const p of ['/manu/', '/architecture/', '/plan-studio/twins/16a/', '/plan-studio/twins/drop/', '/plan-studio/twins/services/']) assert.ok(resolves(p), p);
});
