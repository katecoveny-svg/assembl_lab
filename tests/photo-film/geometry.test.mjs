// The geometry passes' pictures (photoreal/lines.ts) and the geometry check (photoreal/geocheck.ts): offline, deterministic,
// nothing sent anywhere. Run with:  node --test tests/photo-film/*.test.mjs   (Node 22.18+ strips the TypeScript types)
//
// Fixtures (tests/photo-film/fixtures), all of the lab's own sample house (plan-studio/twins/drop/hero.plan.json), opening
// view of the plan-drop page, 1040 × 780 (the 4:3 frame "Make it a photo" sends):
//   opening-line.png, opening-mask.png  the model's line drawing and part mask of that view, from the exact geometry passes
//                                       (tools/film/film.mjs geo-still, 23 Nov 2026), trimmed 3 rows top and bottom from 1040 × 786
//   model-view.png                      the twin's own normal-look render of the view: the check's reference (256 colours)
//   gemini-fast.png, gemini-best.png    the two photos Google Gemini made of that view on 22 Nov 2026 (Nano Banana 2.1 and
//                                       Nano Banana Pro, prompt 2026-11-22a, no line drawing), scaled and reduced to 256
//                                       colours. Generated from the model view by Google Gemini. Not a photograph, and not
//                                       a checked drawing. Both changed the stair (and more): the check must say so.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodePNG, encodePNG } from '../../tools/film/png.mjs';
import { PART, PART_NAMES, isBuilding, isScored, decodePasses, flipRows, lineDrawing, maskRGB, maskFrom, depthView, partView, lined, cropPx, FAR } from '../../plan-studio/twins/src/twin/photoreal/lines.ts';
import { checkGeometry, distanceTransform, cannyRGB, resizeRGB, LIMITS, KEY_PARTS } from '../../plan-studio/twins/src/twin/photoreal/geocheck.ts';

const fx = (f) => decodePNG(readFileSync(new URL(`fixtures/${f}`, import.meta.url)));
const rgbOf = (p) => { if (p.ch === 3) return p.px; const out = new Uint8Array(p.w * p.h * 3); for (let i = 0; i < p.w * p.h; i++) for (let k = 0; k < 3; k++) out[i * 3 + k] = p.px[i * p.ch + (p.ch >= 3 ? k : 0)]; return out; };

// --- a small synthetic scene: a ground plane, a box (a "wall") and a thin post (a "stair" part) in front of it ------------
const W = 240, H = 160;
function scene() {
  const n = W * H, nrm = new Uint8Array(n * 4), dep = new Uint8Array(n * 4), id = new Uint8Array(n * 4);
  const put = (i, z, normal, part, glass = 0) => {
    const v = Math.round((Math.min(z, FAR) / FAR) * 16777215);
    dep[i * 4] = v >> 16; dep[i * 4 + 1] = (v >> 8) & 255; dep[i * 4 + 2] = v & 255;
    for (let k = 0; k < 3; k++) nrm[i * 4 + k] = Math.round((normal[k] * 0.5 + 0.5) * 255);
    id[i * 4] = part; id[i * 4 + 1] = glass ? 255 : 0;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (((x >= 140 && x < 146) || (x >= 175 && x < 181)) && y >= 25 && y < 155) put(i, 8, [0, 0, 1], PART.STAIR);
    else if (x >= 60 && x < 200 && y >= 30 && y < 120) put(i, 12, x < 130 ? [0, 0, 1] : [0.7071, 0, 0.7071], PART.WALLS, x >= 90 && x < 110 && y >= 50 && y < 90 ? 1 : 0);
    else if (y >= 100) put(i, 14 + (H - y) * 0.05, [0, 1, 0], PART.GROUND);
    else put(i, Infinity, [0, 0, 0], PART.SKY);
  }
  return { nrm, dep, id };
}
/** a "photo" of the scene: flat shades per face, so its edges sit where the geometry's do */
function photoOf(P, shift = { part: -1, dx: 0 }) {
  const out = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let sx = x;
    const i = y * W + x;
    // move one part's pixels sideways (as a model that changed one element would draw it); where it stood, what is beside it
    if (shift.part >= 0) {
      const from = x - shift.dx;
      if (from >= 0 && from < W && P.part[y * W + from] === shift.part) sx = from;
      else if (P.part[i] === shift.part) { sx = x; while (sx > 0 && P.part[y * W + sx] === shift.part) sx--; }
    }
    const j = sx < W ? y * W + sx : -1;
    const p = j >= 0 ? P.part[j] : PART.SKY;
    const c = p === PART.SKY ? [200, 215, 235] : p === PART.GROUND ? [70, 95, 60] : p === PART.STAIR ? [150, 105, 60] : P.glass[j] ? [120, 150, 160] : P.normal[j * 3] > 0.5 ? [55, 55, 60] : [95, 95, 100];
    out.set(c, i * 3);
  }
  return out;
}

test('passes decode exactly: 24-bit depth to the metre, sky at FAR, parts and glass; rows flip back', () => {
  const s = scene(), P = decodePasses(W, H, s.nrm, s.dep, s.id);
  assert.ok(Math.abs(P.depth[45 * W + 142] - 8) < 1e-3); assert.ok(Math.abs(P.depth[35 * W + 70] - 12) < 1e-3);
  assert.equal(P.depth[5 * W + 5], Infinity); assert.equal(P.part[5 * W + 5], PART.SKY);
  assert.equal(P.glass[60 * W + 95], 1); assert.equal(P.glass[60 * W + 80], 0);
  assert.ok(Math.abs(P.normal[(35 * W + 150) * 3] - 0.7071) < 0.01);
  const a = Uint8Array.from({ length: 4 * 3 * 2 }, (_, i) => i);
  assert.deepEqual([...flipRows(flipRows(a, 3, 2), 3, 2)], [...a]);
  assert.deepEqual([...flipRows(a, 3, 2).subarray(0, 12)], [...a.subarray(12)]);
});

test('the line drawing: silhouettes on the nearer pixel, folds, glass edges; building black, context grey', () => {
  const P = decodePasses(W, H, ...Object.values(scene())), L = lineDrawing(P);
  // the post's left silhouette is on the post (x 140), not on the wall behind it (x 139)
  assert.equal(L.line[80 * W + 140], 0); assert.equal(L.edgePart[80 * W + 140], PART.STAIR); assert.equal(L.line[80 * W + 138], 255);
  // the wall's fold at x 130 (normals 45° apart) is drawn
  assert.ok(L.line[40 * W + 129] === 0 || L.line[40 * W + 130] === 0);
  // the glass pane's outline is drawn; the inside of a face is paper
  assert.equal(L.line[50 * W + 100] === 0 || L.line[49 * W + 100] === 0, true); assert.equal(L.line[70 * W + 100], 255);
  // the wall's silhouette against the sky is black (building); the ground's edge against the sky is grey (context)
  assert.equal(L.line[30 * W + 80], 0);
  assert.ok(L.line[100 * W + 20] > 100 && L.line[100 * W + 20] < 255, 'ground outline is grey');
  // the same input always gives the same drawing
  assert.deepEqual(lineDrawing(P).line, L.line);
});

test('mask round trip and the pictures for contact sheets', () => {
  const P = decodePasses(W, H, ...Object.values(scene())), m = maskFrom(maskRGB(P), W, H);
  assert.deepEqual(m.part, P.part); assert.deepEqual(m.glass, P.glass);
  const d = depthView(P); assert.ok(d[45 * W + 142] > d[35 * W + 70], 'near is lighter'); assert.equal(d[5 * W + 5], 0);
  assert.equal(partView(P.part).length, W * H * 3);
  assert.equal(lined(new Uint8Array(W * H * 3).fill(200), new Uint8Array(W * H).fill(0), 0.5)[0], 100);
  assert.deepEqual([...cropPx(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9]), 3, 1, 1, 1, 2, 2)], [5, 6, 8, 9]);
  for (const p of [PART.WALLS, PART.STAIR, PART.RIBS]) assert.ok(isBuilding(p));
  assert.ok(!isScored(PART.RIBS) && !isBuilding(PART.FITOUT) && !isBuilding(PART.VEG));
  for (const p of KEY_PARTS) assert.ok(PART_NAMES[p] && isScored(p));
});

test('PNG: grey, RGB and RGBA round trip', () => {
  for (const ch of [1, 3, 4]) {
    const px = Uint8Array.from({ length: 7 * 5 * ch }, (_, i) => (i * 37) & 255), d = decodePNG(encodePNG(px, 7, 5, ch));
    assert.equal(d.w, 7); assert.equal(d.h, 5); assert.equal(d.ch, ch); assert.deepEqual([...d.px], [...px]);
  }
});

test('distance transform is exact Euclidean; Canny finds a step edge where it is', () => {
  const s = new Uint8Array(9 * 9); s[4 * 9 + 4] = 1;
  const d = distanceTransform(s, 9, 9);
  assert.equal(d[4 * 9 + 4], 0); assert.equal(d[4 * 9 + 7], 3); assert.ok(Math.abs(d[0] - Math.hypot(4, 4)) < 1e-6);
  const img = new Uint8Array(40 * 30 * 3); for (let y = 0; y < 30; y++) for (let x = 20; x < 40; x++) img.fill(220, (y * 40 + x) * 3, (y * 40 + x) * 3 + 3);
  const E = cannyRGB(img, 40, 30, null, { log: true });
  for (let y = 5; y < 25; y++) assert.ok(E.edge[y * 40 + 19] || E.edge[y * 40 + 20], `row ${y}`);
  assert.equal(E.edge[15 * 40 + 5], 0);
  assert.equal(resizeRGB({ w: 2, h: 2, ch: 3, px: Uint8Array.from([0, 0, 0, 100, 100, 100, 100, 100, 100, 200, 200, 200]) }, 1, 1)[0], 100);
});

test('check on the synthetic scene: a faithful picture holds, one moved part drifts and is named, a shift is aligned', () => {
  const P = decodePasses(W, H, ...Object.values(scene())), L = lineDrawing(P), ref = { w: W, h: H, ch: 3, px: photoOf(P) };
  const base = { line: L.line, part: P.part, glass: P.glass, w: W, h: H, reference: ref };
  const ok = checkGeometry({ ...base, photo: ref }, { overlay: false });
  assert.equal(ok.verdict, 'holds', ok.reasons.join('; ')); assert.ok(ok.score > 0.9);
  const moved = checkGeometry({ ...base, photo: { w: W, h: H, ch: 3, px: photoOf(P, { part: PART.STAIR, dx: 12 }) } });
  const stair = moved.parts.find((q) => q.part === PART.STAIR);
  assert.equal(moved.verdict, 'drifts'); assert.equal(stair.status, 'drifts', JSON.stringify(stair));
  assert.ok(moved.reasons.some((r) => r.startsWith(PART_NAMES[PART.STAIR])));
  assert.equal(moved.overlay.length, W * H * 3);
  // the whole picture 4 px to the right: aligned and reported, still holds
  const sh = new Uint8Array(W * H * 3); const src = photoOf(P);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const fx2 = Math.max(0, x - 4); sh.set(src.subarray((y * W + fx2) * 3, (y * W + fx2) * 3 + 3), (y * W + x) * 3); }
  const shifted = checkGeometry({ ...base, photo: { w: W, h: H, ch: 3, px: sh } }, { overlay: false });
  assert.equal(shifted.align.dx, 4); assert.equal(shifted.verdict, 'holds', shifted.reasons.join('; '));
  // a blank picture keeps nothing
  const blank = checkGeometry({ ...base, photo: { w: W, h: H, ch: 3, px: new Uint8Array(W * H * 3).fill(128) } }, { overlay: false });
  assert.equal(blank.verdict, 'drifts'); assert.ok(blank.score < 0.2);
});

// --- the real fixtures: the sample house's opening view -----------------------------------------------------------------------
const L = fx('opening-line.png'), M = fx('opening-mask.png'), mk = maskFrom(M.px, M.w, M.h, M.ch);
const REF = fx('model-view.png');
const real = (photo) => checkGeometry({ photo: { w: photo.w, h: photo.h, ch: 3, px: rgbOf(photo) }, line: L.px, part: mk.part, glass: mk.glass, w: L.w, h: L.h, reference: { w: REF.w, h: REF.h, ch: 3, px: rgbOf(REF) } }, { overlay: false });

test('fixtures: the model\'s own render holds (every key part kept)', () => {
  const r = real(REF);
  assert.equal(r.verdict, 'holds', r.reasons.join('; '));
  for (const p of r.parts) if (p.key) assert.equal(p.status, 'kept', p.name);
  assert.ok(r.edges.scored > 15000 && r.edges.model > r.edges.scored);
});

test('fixtures: both photos Google Gemini made drift, and the stair is flagged in each', () => {
  for (const [name, f] of [['fast', 'gemini-fast.png'], ['best', 'gemini-best.png']]) {
    const r = real(fx(f)), stair = r.parts.find((p) => p.part === PART.STAIR);
    assert.equal(r.verdict, 'drifts', name);
    assert.equal(stair.status, 'drifts', `${name}: stair ${JSON.stringify(stair)}`);
    assert.ok(stair.score < LIMITS.part, name);
    assert.ok(r.reasons.some((s) => s.startsWith(PART_NAMES[PART.STAIR])), `${name}: ${r.reasons.join('; ')}`);
    assert.ok(Math.abs(r.align.dx) <= 2 && Math.abs(r.align.dy) <= 2, `${name}: framed as the view`);
  }
});

test('fixtures: the stair moved in the model\'s own render is caught there and nowhere else', () => {
  // shift every stair pixel of the model's render 10 px left (the rest untouched): a changed stair, a faithful everything else
  const px = rgbOf(REF), out = px.slice(), w = REF.w, h = REF.h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mk.part[y * w + x] === PART.STAIR && x - 10 >= 0) out.set(px.subarray((y * w + x) * 3, (y * w + x) * 3 + 3), (y * w + x - 10) * 3);
  const r = real({ w, h, ch: 3, px: out }), stair = r.parts.find((p) => p.part === PART.STAIR);
  assert.equal(stair.status, 'drifts', JSON.stringify(stair));
  for (const p of r.parts) if (p.key && p.part !== PART.STAIR && p.part !== PART.BALUSTRADE) assert.notEqual(p.status, 'drifts', `${p.name} ${p.score}`);
  assert.ok(r.regions.some((g) => g.part === PART.STAIR), 'a region names the stair');
});
