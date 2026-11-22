#!/usr/bin/env node
// "Make it a film", from the command line, through the deployed lab (the Google Gemini key lives only in Cloudflare; this
// tool sends no key). It cuts a geometry-pass clip into parts within Google's limit, sends each part to /api/film with the
// look reference still and the last frame of the part before as guide, polls each until Google says it is finished, joins
// the parts frame for frame, burns the label into every frame, and runs the geometry check on every frame.
// Every part sent is a paid Google Gemini call: the tool counts the calls already in the log and stops at --max-calls.
// Needs Node 22.18+ and ffmpeg.
//
//   node tools/film/gemini-film.mjs status [--base https://lab.assembl.co.nz]                    free: the endpoint's status
//   node tools/film/gemini-film.mjs plan --clip CLIP.mp4                                          free: the parts it would send
//   node tools/film/gemini-film.mjs make --clip DIR/gemini-input-normal-look.mp4 --out DIR/gemini [--still STILL.jpg]
//        [--time golden] [--season summer] [--resolution 720p] [--mode background|wait] [--parts 0,1]
//        [--log /home/claude/film-calls.log] [--max-calls 4] [--caption DIR/caption-gemini-1280x720.png]
//        [--passes DIR/frames --reference DIR/gemini-input-normal-look.mp4]      (the geometry check, after joining)
//   node tools/film/gemini-film.mjs join --out DIR/gemini [--caption …] [--passes … --reference …]     (again, from plan.json)
//
// Parts already made (part-00.mp4 …) are kept: run make again after a stop and it carries on. A part is only written when
// the endpoint answers status "completed" with a video; "running" is never taken for finished.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { planSegments, MIN_SECONDS } from '../../functions/api/film.js';

const ORIGIN = 'https://lab.assembl.co.nz';
const argv = process.argv.slice(2), cmd = argv[0];
const o = { base: ORIGIN, clip: '', out: '', still: '', time: '', season: '', resolution: '720p', mode: '', parts: '', log: '/home/claude/film-calls.log', 'max-calls': 4, caption: '', passes: '', reference: '', every: 1 };
for (let i = 1; i < argv.length; i++) { const k = argv[i].replace(/^--/, ''), v = argv[++i]; if (!(k in o)) throw new Error('unknown option --' + k); o[k] = typeof o[k] === 'number' ? Number(v) : v; }
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function probe(file) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=width,height,r_frame_rate,nb_read_frames', '-of', 'json', file]).toString()).streams[0];
  const [a, b] = j.r_frame_rate.split('/').map(Number);
  return { w: j.width, h: j.height, fps: a / (b || 1), frames: Number(j.nb_read_frames) };
}
/** paid attempts already logged: every POST that reached the endpoint and was not refused before Google */
export function paidSoFar(log) {
  if (!fs.existsSync(log)) return 0;
  return fs.readFileSync(log, 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).filter((l) => {
    const c = l.split('\t'), status = Number(c[1]);
    if (c[2] === 'poll') return false;
    return !(status === 400 || status === 402 || status === 403 || status === 405 || status === 413 || status === 429 || (status === 503 && /not_configured/.test(l)));
  }).length;
}
const HEAD = '# time\tstatus\tkind\tpart\tseconds\tmode\tmodel\tbytes_in\tbytes_out\ttook_ms_server\ttook_ms_round_trip\terror\n';
function logLine(cols) { if (!fs.existsSync(o.log)) fs.writeFileSync(o.log, HEAD); fs.appendFileSync(o.log, cols.join('\t') + '\n'); }
const dataURL = (file, type) => `data:${type};base64,${fs.readFileSync(file).toString('base64')}`;
const imgType = (f) => (/\.png$/i.test(f) ? 'image/png' : /\.webp$/i.test(f) ? 'image/webp' : 'image/jpeg');

async function status() {
  const st = await fetch(`${o.base}/api/film`, { headers: { origin: ORIGIN } }).then((r) => r.json()).catch((e) => ({ error: String(e?.message || e) }));
  say('status:', JSON.stringify(st));
  return st;
}

function cut(clip, part, file) {
  // frame-exact: the part's frames only, re-encoded, no sound (the twin's clip has none)
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', clip, '-vf', `select='between(n\\,${part.from}\\,${part.to - 1})',setpts=N/FRAME_RATE/TB`, '-frames:v', String(part.frames), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', file]);
}
function lastFrame(file, png) { execFileSync('ffmpeg', ['-y', '-v', 'error', '-sseof', '-0.2', '-i', file, '-update', '1', '-q:v', '2', png]); }

async function make() {
  if (!o.clip || !o.out) throw new Error('--clip and --out');
  fs.mkdirSync(o.out, { recursive: true });
  const st = await status();
  if (st.type !== 'assembl.planstudio.film.status') { say('The endpoint did not answer with its status. Is the branch deployed?'); return; }
  if (!st.configured) { say('Not configured here (no Google Gemini key on this deployment). Nothing sent.'); return; }
  const c = probe(o.clip), parts = planSegments(c.frames, c.fps, st.part_max_s);
  say(`clip ${c.w}x${c.h}, ${c.frames} frames at ${c.fps} fps → ${parts.length} parts: ${parts.map((p) => `${p.from}-${p.to - 1} (${p.seconds} s, ask ${p.ask} s)`).join(', ')}`);
  fs.writeFileSync(path.join(o.out, 'plan.json'), JSON.stringify({ clip: path.resolve(o.clip), ...c, part_max_s: st.part_max_s, model: st.model, prompt_revision: st.prompt_revision, parts }, null, 1));
  const want = o.parts ? o.parts.split(',').map(Number) : parts.map((p) => p.index);
  for (const p of parts) {
    const file = path.join(o.out, `part-${String(p.index).padStart(2, '0')}.mp4`);
    if (fs.existsSync(file)) { say(`part ${p.index}: already made`); continue; }
    if (!want.includes(p.index)) continue;
    const already = paidSoFar(o.log);
    if (already + 1 > o['max-calls']) { say(`Stopping: ${already} paid film calls are already logged in ${o.log}; one more would pass the ${o['max-calls']} allowed.`); return; }
    const src = path.join(o.out, `in-${String(p.index).padStart(2, '0')}.mp4`);
    cut(o.clip, p, src);
    const prev = path.join(o.out, `part-${String(p.index - 1).padStart(2, '0')}.mp4`), guide = path.join(o.out, `guide-${String(p.index).padStart(2, '0')}.jpg`);
    if (p.guided && fs.existsSync(prev)) lastFrame(prev, guide);
    const body = { video: dataURL(src, 'video/mp4'), part: p.index, resolution: o.resolution, confirm: true };
    if (o.mode) body.mode = o.mode;
    if (o.still) body.still = dataURL(o.still, imgType(o.still));
    if (p.guided && fs.existsSync(guide)) body.guide = dataURL(guide, 'image/jpeg');
    if (o.time || o.season) body.look = { ...(o.time ? { time: o.time } : {}), ...(o.season ? { season: o.season } : {}) };
    const bytesIn = fs.statSync(src).size, t0 = Date.now(), at = new Date();
    say(`part ${p.index}: sending ${(bytesIn / 1e6).toFixed(2)} MB (${p.seconds} s; about US$${st.estimate?.per_second?.[o.resolution] ? (st.estimate.per_second[o.resolution] * p.ask).toFixed(2) : '?'}); ${already} paid so far`);
    let r, j = null;
    try { r = await fetch(`${o.base}/api/film`, { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN }, body: JSON.stringify(body) }); j = await r.json().catch(() => null); }
    catch (e) { j = { error: 'network', message: String(e?.message || e) }; }
    const status = r?.status ?? 0;
    // poll until Google says completed (or fails); never take "running" for finished
    while (status === 202 && j?.status === 'running' && j.handle) {
      await sleep(Math.max(5, j.poll_every_s ?? 10) * 1000);
      let pr, pj = null;
      try { pr = await fetch(`${o.base}/api/film?handle=${encodeURIComponent(j.handle)}`, { headers: { origin: ORIGIN } }); pj = await pr.json().catch(() => null); } catch (e) { pj = { error: 'network', message: String(e?.message || e) }; }
      logLine([new Date().toISOString(), pr?.status ?? 0, 'poll', p.index, p.seconds, body.mode ?? st.mode, pj?.model ?? '', 0, 0, '', Date.now() - t0, pj?.error ? `${pj.error}: ${pj.message ?? ''}` : pj?.status ?? '']);
      if (pj?.status === 'running') { say(`part ${p.index}: running (${pj.waited_s} s)`); continue; }
      j = { ...pj, handle: undefined }; if (!pj?.video) break;
    }
    const outB64 = typeof j?.video === 'string' && j?.status === 'completed' && /^data:video\/mp4;base64,/.test(j.video) ? j.video.split(',')[1] ?? '' : '';
    const outBytes = outB64 ? Buffer.from(outB64, 'base64') : null;
    logLine([at.toISOString(), status, 'make', p.index, p.seconds, body.mode ?? st.mode, j?.model ?? '', bytesIn, outBytes?.length ?? 0, j?.took_ms ?? '', Date.now() - t0, j?.error ? `${j.error}: ${j.message ?? ''}` : '']);
    if (!outBytes) { say(`part ${p.index}: no film (${status} ${j?.error ?? ''} ${j?.message ?? ''}). Stopping.`); return; }
    fs.writeFileSync(file, outBytes);
    say(`part ${p.index}: ${(outBytes.length / 1e6).toFixed(2)} MB from ${j.model} in ${j.took_ms} ms → ${file}`);
  }
  if (parts.every((p) => fs.existsSync(path.join(o.out, `part-${String(p.index).padStart(2, '0')}.mp4`)))) join(parts, c);
}

function join(parts, c) {
  // each part trimmed to its own frame count at 24 fps and the clip's size, then joined; the raw film (no label) is what the
  // geometry check reads; the labelled film is the one to watch
  const list = path.join(o.out, 'parts.txt'), fixed = [];
  for (const p of parts) {
    const f = path.join(o.out, `part-${String(p.index).padStart(2, '0')}.mp4`), g = path.join(o.out, `fit-${String(p.index).padStart(2, '0')}.mp4`);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', f, '-vf', `fps=${c.fps},scale=${c.w}:${c.h}:flags=lanczos,setsar=1`, '-frames:v', String(p.frames), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p', '-an', g]);
    const got = probe(g).frames;
    if (got < p.frames) say(`part ${p.index}: Google returned ${got} frames for ${p.frames}; the join is ${p.frames - got} frames short there`);
    fixed.push(g);
  }
  fs.writeFileSync(list, fixed.map((f) => `file '${path.resolve(f)}'`).join('\n') + '\n');
  const raw = path.join(o.out, 'film-raw.mp4'), labelled = path.join(o.out, 'film-labelled.mp4');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', raw]);
  if (!o.caption || !fs.existsSync(o.caption)) throw new Error('--caption: the label picture (caption-gemini-WxH.png from film.mjs geo-film) is needed: every frame carries the label');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-i', o.caption, '-filter_complex', '[0:v][1:v]overlay=0:0,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-movflags', '+faststart', '-an', labelled]);
  say(`joined ${parts.length} parts → ${raw} (for the check) and ${labelled} (labelled on every frame)`);
  if (o.passes) {
    const args = [path.join(path.dirname(new URL(import.meta.url).pathname), 'geocheck.mjs'), '--film', raw, '--passes', o.passes, '--out', o.out, '--name', 'film', '--every', String(o.every)];
    if (o.reference) args.push('--reference', o.reference);
    execFileSync(process.execPath, args, { stdio: 'inherit' });
  }
}

const run = { status, make, plan: async () => { const c = probe(o.clip); console.log(JSON.stringify({ clip: c, parts: planSegments(c.frames, c.fps, Number(process.env.PART_MAX || 10)), min_s: MIN_SECONDS }, null, 1)); }, join: async () => { const P = JSON.parse(fs.readFileSync(path.join(o.out, 'plan.json'), 'utf8')); join(P.parts, P); } }[cmd];
if (!run) { console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 19).join('\n')); process.exit(1); }
await run();
