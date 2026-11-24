// A bounded capture from the real flight timeline. In preflight mode the existing Pages Function reads the MP4,
// builds the provider request in memory, and returns a content-bound receipt without ever submitting it.
import type { Timeline } from './flightPath';

export const PROOF_WIDTH = 1280, PROOF_HEIGHT = 720, PROOF_FPS = 24;
export function proofWindow(timeline: Timeline, cursor: number) {
  const frames = Math.min(5 * PROOF_FPS, Math.floor(timeline.duration * PROOF_FPS));
  if (!Number.isFinite(frames) || frames < 3 * PROOF_FPS) throw new Error('Place shots with at least three seconds of camera motion first.');
  const duration = frames / PROOF_FPS;
  const start = Math.max(0, Math.min(Number.isFinite(cursor) ? cursor : 0, timeline.duration - duration));
  const { eye, look } = timeline.at(start);
  const delta = (a: number[], b: number[]) => Math.hypot(...a.map((v, j) => v - b[j]));
  // Includes a full spin or an out-and-back even when the first and last frames match.
  for (let i = 1; i < frames; i++) {
    const c = timeline.at(start + i / PROOF_FPS);
    if (delta(eye, c.eye) > 0.03 || delta(look, c.look) > 0.03) return { start, duration };
  }
  throw new Error('There is no camera movement in this window. Scrub forward to the move and try again.');
}

export async function proofDigest(blob: Blob) {
  const bytes = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(bytes), (v) => v.toString(16).padStart(2, '0')).join('');
}

export async function dispatchProof(blob: Blob, sha256: string, secs: number) {
  if (blob.type !== 'video/mp4') throw new Error('Cloudflare preflight needs MP4. This browser made a WebM; download it or capture in Chrome.');
  if (blob.size > 3_000_000) throw new Error('The proof is too large to send for preflight.');
  const video = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Could not read the clip.'));
    r.readAsDataURL(blob);
  });
  const res = await fetch('/api/film?camera-proof=1', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dry: true, video }), signal: AbortSignal.timeout(15_000) });
  const r = await res.json().catch(() => null);
  if (!res.ok || r?.type !== 'assembl.planstudio.film.camera-proof.v1' || r.status !== 'validated'
      || r.provider_called !== false || r.charged !== false || r.stored_by_server !== false || r.sha256 !== sha256
      || typeof r.seconds !== 'number' || !Number.isFinite(r.seconds) || Math.abs(r.seconds - secs) > 0.1
      || typeof r.model !== 'string' || typeof r.configured !== 'boolean') {
    throw new Error('Cloudflare did not return a matching, zero-spend receipt. Your original clip is unchanged.');
  }
  return { model: r.model as string, configured: r.configured as boolean };
}
