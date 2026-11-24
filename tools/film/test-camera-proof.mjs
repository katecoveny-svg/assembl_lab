// No-network smoke using a real, decodable 720p H.264 clip. This is not a Three.js/browser playback test.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { onRequest } from '../../functions/api/film.js';

const clip = process.argv[2];
if (!clip) throw new Error('Pass an output path for the synthetic MP4.');
const run = (program, args) => {
  const r = spawnSync(program, args, { encoding: 'utf8' });
  assert.equal(r.status, 0, r.error?.message ?? r.stderr);
  return r.stdout;
};
run('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-n', '-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=24', '-t', '4', '-an', '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', clip]);
run('ffmpeg', ['-nostdin', '-loglevel', 'error', '-xerror', '-i', clip, '-f', 'null', '-']);
const bytes = readFileSync(clip), sha = createHash('sha256').update(bytes).digest('hex');
const origin = 'https://synthetic-camera.assembl-lab.pages.dev';
const makeRequest = () => new Request(`${origin}/api/film?camera-proof=1`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ dry: true, video: 'data:video/mp4;base64,' + bytes.toString('base64') }) });
let upstream = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { upstream++; throw new Error('This test forbids external calls.'); };
try {
  for (const env of [{}, { GEMINI_API_KEY: 'fake' }]) {
    const resp = await onRequest({ request: makeRequest(), env: { ...env, CAMERA_PROOF_PREVIEW: "1" } });
    assert.equal(resp.status, 200);
    const out = await resp.json();
    assert.equal(out.sha256, sha);
    assert.equal(out.seconds, 4);
    assert.equal(out.provider_called, false);
    assert.equal(out.charged, false);
    assert.equal(out.stored_by_server, false);
    assert.equal(out.configured, !!env.GEMINI_API_KEY);
    assert.equal(upstream, 0);
  }
  console.log(`Decoded 4 s 720p H.264 clip, matched SHA-256 ${sha}; 0 upstream calls.`);
} finally { globalThis.fetch = originalFetch; }
