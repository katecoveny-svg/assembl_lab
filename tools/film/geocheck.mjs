#!/usr/bin/env node
// The geometry check from the command line: does a generated photo, or every frame of a generated film, keep the
// building's geometry? Compares edges with the model's own line drawing and part mask of the same view
// (plan-studio/twins/src/twin/photoreal/geocheck.ts). Free and deterministic; needs Node 22.18+ and ffmpeg (to read JPEG
// and video).
//
//   node tools/film/geocheck.mjs --photo PHOTO.jpg --line VIEW-line.png --mask VIEW-mask.png [--reference VIEW-beauty.png]
//                                [--out DIR] [--name NAME]
//        one still: writes NAME-check.json and NAME-check.png (the photo dimmed; model edges found in green, missing in
//        red; drifting regions boxed: orange where the building changed, blue where planting stands in front).
//        --reference is the model's own render of the view (film.mjs geo-still writes it): only the edges it shows are scored.
//   node tools/film/geocheck.mjs --film FILM.mp4 --passes DIR/frames [--reference REF.mp4] [--from 0] [--every 1] [--out DIR]
//        every frame of a film against the line drawing and mask of the same frame (line_00000.png, mask_00000.png…), with
//        the model's own clip (gemini-input-normal-look.mp4, no caption) as reference; writes NAME-frames.json (one report a
//        frame, overlays left out) and NAME-check.png (the worst frame's overlay)
//
// If the photo's shape differs from the passes' (the page trims its frame to a shape Google Gemini makes), the passes are
// trimmed to the photo's shape about their centre first, as the page trims the view.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { decodePNG, encodePNG } from './png.mjs';
import { checkGeometry } from '../../plan-studio/twins/src/twin/photoreal/geocheck.ts';
import { maskFrom, cropPx } from '../../plan-studio/twins/src/twin/photoreal/lines.ts';

const argv = process.argv.slice(2), o = { photo: '', film: '', line: '', mask: '', passes: '', reference: '', out: '.', name: '', from: 0, every: 1, to: -1 };
for (let i = 0; i < argv.length; i++) { const k = argv[i].replace(/^--/, ''), v = argv[++i]; if (!(k in o)) throw new Error('unknown option --' + k); o[k] = typeof o[k] === 'number' ? Number(v) : v; }

/** any picture → { w, h, ch: 3, px } */
export function readImage(file) {
  if (/\.png$/i.test(file)) { const p = decodePNG(fs.readFileSync(file)); return p.ch === 3 ? p : { w: p.w, h: p.h, ch: p.ch, px: p.px }; }
  const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]).toString().trim().split(',').map(Number);
  const px = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 30 });
  return { w, h, ch: 3, px: new Uint8Array(px.buffer, px.byteOffset, w * h * 3) };
}
/** the passes, trimmed about their centre to the shape aw:ah */
export function passesFor(lineFile, maskFile, aw, ah) {
  const L = decodePNG(fs.readFileSync(lineFile)), M = decodePNG(fs.readFileSync(maskFile));
  let w = L.w, h = L.h, sx = 0, sy = 0;
  const want = aw / ah;
  if (Math.abs(w / h - want) > 0.002) { if (w / h > want) { const nw = Math.round(h * want); sx = Math.floor((w - nw) / 2); w = nw; } else { const nh = Math.round(w / want); sy = Math.floor((h - nh) / 2); h = nh; } }
  const line = L.ch === 1 ? L.px : L.px.filter((_, i) => i % L.ch === 0);
  const m = maskFrom(M.px, M.w, M.h, M.ch);
  return { w, h, line: cropPx(line, L.w, 1, sx, sy, w, h), part: cropPx(m.part, L.w, 1, sx, sy, w, h), glass: cropPx(m.glass, L.w, 1, sx, sy, w, h), trimmed: { sx, sy, from: [L.w, L.h] } };
}
/** a picture trimmed about its centre to the shape aw:ah */
export function trimTo(img, aw, ah) {
  const want = aw / ah; let { w, h } = img, sx = 0, sy = 0;
  if (Math.abs(w / h - want) <= 0.002) return img;
  if (w / h > want) { const nw = Math.round(h * want); sx = Math.floor((w - nw) / 2); w = nw; } else { const nh = Math.round(w / want); sy = Math.floor((h - nh) / 2); h = nh; }
  return { w, h, ch: img.ch, px: cropPx(img.px, img.w, img.ch, sx, sy, w, h) };
}
const pct = (v) => `${(v * 100).toFixed(0)}%`;
export function summary(r) {
  return [`${r.verdict.toUpperCase()}: keeps ${pct(r.score)} of the building's edges above chance (${pct(r.share)} within ${r.tau} px, chance ${pct(r.chance)}; ${r.edges.scored} of ${r.edges.model} model edges scored${r.reference ? ', those the model view shows' : ', no reference render'}; chamfer ${r.chamfer} px; aligned ${r.align.dx},${r.align.dy} px x${r.align.scale})`,
    ...r.parts.map((p) => `  ${p.status.padEnd(13)} ${p.key ? '*' : ' '} ${p.name}: ${pct(p.score)} (${pct(p.share)} kept, ${pct(p.chance)} by chance, ${p.edges} edges)`),
    ...r.regions.slice(0, 6).map((g) => `  region ${g.x},${g.y} ${g.w}x${g.h}: ${g.name}, ${pct(g.share)} of ${g.edges} edges found, ${pct(g.planting)} planting-coloured → ${g.cause}`),
    ...r.reasons.map((s) => '  reason: ' + s)].join('\n');
}

async function still() {
  const photo = readImage(o.photo), P = passesFor(o.line, o.mask, photo.w, photo.h);
  const reference = o.reference ? trimTo(readImage(o.reference), photo.w, photo.h) : null;
  const r = checkGeometry({ photo, ...P, reference });
  const name = o.name || path.basename(o.photo).replace(/\.\w+$/, '');
  fs.mkdirSync(o.out, { recursive: true });
  fs.writeFileSync(path.join(o.out, `${name}-check.png`), encodePNG(r.overlay, r.size.w, r.size.h, 3));
  delete r.overlay;
  fs.writeFileSync(path.join(o.out, `${name}-check.json`), JSON.stringify({ ...r, photo: path.basename(o.photo), line: path.basename(o.line), mask: path.basename(o.mask), reference_file: o.reference ? path.basename(o.reference) : null, trimmed: P.trimmed, made: new Date().toISOString() }, null, 1));
  console.log(summary(r));
}

async function film() {
  const first = decodePNG(fs.readFileSync(path.join(o.passes, `line_${String(o.from).padStart(5, '0')}.png`)));
  const w = first.w, h = first.h, size = w * h * 3;
  const frames = (file) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${w}:${h}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { stdio: ['ignore', 'pipe', 'inherit'] });
    const it = p.stdout[Symbol.asyncIterator]();
    let buf = Buffer.alloc(0), ended = false;
    return async () => { while (buf.length < size && !ended) { const r = await it.next(); if (r.done) ended = true; else buf = Buffer.concat([buf, r.value]); } if (buf.length < size) return null; const f = buf.subarray(0, size); buf = buf.subarray(size); return new Uint8Array(f); };
  };
  const nextPhoto = frames(o.film), nextRef = o.reference ? frames(o.reference) : null;
  const reports = [];
  let k = 0, worst = null;
  const name = o.name || path.basename(o.film).replace(/\.\w+$/, '');
  fs.mkdirSync(o.out, { recursive: true });
  for (;;) {
    const frame = await nextPhoto(), refFrame = nextRef ? await nextRef() : null;
    if (!frame) break;
    const f = o.from + k++;
    if ((f - o.from) % o.every || (o.to >= 0 && f >= o.to)) continue;
    const lf = path.join(o.passes, `line_${String(f).padStart(5, '0')}.png`), mf = path.join(o.passes, `mask_${String(f).padStart(5, '0')}.png`);
    if (!fs.existsSync(lf) || !fs.existsSync(mf)) { reports.push({ frame: f, error: 'no passes for this frame' }); continue; }
    const P = passesFor(lf, mf, w, h);
    const r = checkGeometry({ photo: { w, h, ch: 3, px: frame }, ...P, reference: refFrame ? { w, h, ch: 3, px: refFrame } : null });
    if (!worst || r.score < worst.score) worst = { score: r.score, frame: f, overlay: r.overlay };
    delete r.overlay;
    reports.push({ frame: f, ...r });
    process.stdout.write(`frame ${f}: ${r.verdict} ${pct(r.score)}${r.parts.filter((p) => p.key && p.status === 'drifts').map((p) => `, ${p.name} ${pct(p.score)}`).join('')}\n`);
  }
  const ok = reports.filter((r) => !r.error);
  const sum = { type: 'assembl.planstudio.geometry-check.film', film: path.basename(o.film), frames: ok.length, holds: ok.filter((r) => r.verdict === 'holds').length, drifts: ok.filter((r) => r.verdict === 'drifts').map((r) => r.frame), mean_score: +(ok.reduce((a, r) => a + r.score, 0) / Math.max(1, ok.length)).toFixed(3), worst: worst && { frame: worst.frame, score: worst.score }, made: new Date().toISOString(), reports };
  fs.writeFileSync(path.join(o.out, `${name}-frames.json`), JSON.stringify(sum, null, 1));
  if (worst) fs.writeFileSync(path.join(o.out, `${name}-check.png`), encodePNG(worst.overlay, w, h, 3));
  console.log(`${sum.holds} of ${sum.frames} frames hold; mean ${pct(sum.mean_score)}; worst frame ${worst?.frame} (${pct(worst?.score ?? 0)})`);
}

if (o.photo) await still();
else if (o.film) await film();
else { console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 17).join('\n')); process.exit(1); }
