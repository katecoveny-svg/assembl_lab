// Manu birds: the built pages point at files that exist, and the measurements the body shells
// are built from match the proportion sheet (docs/manu/proportions.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BIRDS = ['tui', 'korimako', 'piwakawaka', 'tauhou', 'miromiro', 'toutouwai', 'hihi', 'kereru'];

test('every manu page loads scripts, styles and stills that exist', () => {
  for (const page of ['', 'compare/', ...BIRDS.map((b) => `${b}/`)]) {
    const html = readFileSync(join(root, 'manu', page, 'index.html'), 'utf8');
    const refs = [...html.matchAll(/(?:src|href)="(\/manu\/[^"#?]+)"/g)].map((m) => m[1]).filter((u) => /\.(js|css|webp|jpg|glb)$/.test(u));
    assert.ok(refs.length > 0, `no assets referenced on /manu/${page}`);
    for (const u of refs) assert.ok(existsSync(join(root, u)), `/manu/${page} references missing ${u}`);
  }
});

test('measurements: one entry per bird, in plausible ranges, matching the proportion sheet', () => {
  const src = readFileSync(join(root, 'manu/src/src/engine/nz/measured.ts'), 'utf8');
  const doc = readFileSync(join(root, 'docs/manu/proportions.md'), 'utf8');
  for (const b of BIRDS) {
    const m = src.match(new RegExp(`\\n  ${b}: \\{([^}]*)\\}`));
    assert.ok(m, `no measurements for ${b}`);
    const v = Object.fromEntries([...m[1].matchAll(/(\w+): ([\d.]+)/g)].map((x) => [x[1], Number(x[2])]));
    for (const k of ['length', 'mass', 'wing', 'tail', 'billF', 'billS', 'thl', 'tarsus']) assert.ok(v[k] > 0, `${b}.${k}`);
    // exposed bill shorter than bill from the skull, which is shorter than the whole head
    assert.ok(v.billF < v.billS && v.billS < v.thl, `${b} bill/head order`);
    // head, bill and tail fit inside the total length with room for a body
    assert.ok(v.thl + v.tail < v.length * 0.85, `${b} head + tail too long for its length`);
    for (const k of ['wing', 'tail', 'tarsus']) assert.ok(doc.includes(String(v[k])), `${b}.${k} = ${v[k]} not in docs/manu/proportions.md`);
  }
});

test('the field guide ships a callable viewer and a still and lesson for each tab', () => {
  const html = readFileSync(join(root, 'manu/index.html'), 'utf8');
  const url = html.match(/await import\("(\/manu\/assets\/atlas-[^"]+\.js)"\)/)?.[1];
  assert.ok(url, 'the built page must import the atlas');
  const bundle = readFileSync(join(root, url), 'utf8');
  assert.match(bundle, /export\s*\{[^}]*\bopenPlate\b[^}]*\}/, 'the build must preserve the viewer factory');
  for (const bird of BIRDS) {
    assert.ok(html.includes('data-bird="' + bird + '"'));
    assert.ok(existsSync(join(root, 'manu/stills', bird + '-1200.webp')));
    assert.ok(existsSync(join(root, 'manu', bird, 'index.html')));
  }
});
