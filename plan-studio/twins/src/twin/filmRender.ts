// The film, made frame by frame in this browser: each frame is drawn at the size asked for, then encoded with WebCodecs
// (H.264) and written as an .mp4 (mp4Mux.ts). Where WebCodecs cannot do H.264, it falls back to MediaRecorder (WebM), fed one
// frame at a time. Nothing leaves the browser here; flightUI.ts offers the file for download and passes a copy back to the
// project (handoff.ts putBackRecord).
import * as THREE from 'three/webgpu';
import type { App } from './app';
import type { Cam } from './flightPath';
import { muxMp4, type Sample } from './mp4Mux';

export interface FilmOpts {
  width: number; height: number; fps: number;
  /** 'draft': drawn without the post-processing passes (much faster); 'full': as the page draws it */
  quality: 'draft' | 'full';
  duration: number;
  at: (t: number) => Cam;
  /** before each frame (the layout fade hook, the sun): t in seconds */
  beforeFrame?: (t: number, cam: Cam) => void;
  onProgress?: (done: number, total: number) => void;
  stop?: () => boolean;
}
export interface Film { blob: Blob; type: 'mp4' | 'webm'; frames: number; secs: number; ms: number }

const CODECS = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.42001f'];

export async function renderFilm(app: App, o: FilmOpts): Promise<Film> {
  const t0 = performance.now(), r = app.renderer, cam = app.camera as THREE.PerspectiveCamera;
  const total = Math.max(1, Math.round(o.duration * o.fps));
  const was = { paused: app.paused, pr: r.getPixelRatio(), size: r.getSize(new THREE.Vector2()), aspect: cam.aspect, pipeline: app.pipeline, pos: cam.position.clone(), target: app.controls.target.clone(), controls: app.controls.enabled };
  app.paused = true; app.controls.enabled = false;
  await new Promise((res) => requestAnimationFrame(() => res(null)));
  r.setPixelRatio(1); r.setSize(o.width, o.height, false);
  cam.aspect = o.width / o.height; cam.updateProjectionMatrix();
  if (o.quality === 'draft') app.pipeline = null;
  const draw = (t: number) => {
    const c = o.at(t);
    o.beforeFrame?.(t, c);
    cam.position.set(...c.eye); cam.lookAt(c.look[0], c.look[1], c.look[2]); cam.updateMatrixWorld();
    if (app.pipeline) app.pipeline.render(); else r.render(app.scene, cam);
  };
  try {
    let config: VideoEncoderConfig | null = null;
    if (typeof VideoEncoder !== 'undefined') {
      for (const codec of CODECS) {
        const c: VideoEncoderConfig = { codec, width: o.width, height: o.height, bitrate: Math.round(o.width * o.height * o.fps * 0.12), framerate: o.fps, avc: { format: 'avc' } };
        try { if ((await VideoEncoder.isConfigSupported(c)).supported) { config = c; break; } } catch { /* next */ }
      }
    }
    if (config) {
      const samples: Sample[] = []; let avcC: Uint8Array | null = null, failed: Error | null = null;
      const TS = o.fps * 1000;
      const enc = new VideoEncoder({
        output: (chunk, meta) => {
          if (meta?.decoderConfig?.description && !avcC) { const d = meta.decoderConfig.description as ArrayBuffer | ArrayBufferView; avcC = d instanceof ArrayBuffer ? new Uint8Array(d.slice(0)) : new Uint8Array(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength)); }
          const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data);
          samples.push({ data, key: chunk.type === 'key', dur: 1000 });
        },
        error: (e) => { failed = e as Error; },
      });
      enc.configure(config);
      for (let i = 0; i < total; i++) {
        if (o.stop?.()) throw new Error('stopped');
        if (failed) throw failed;
        draw(i / o.fps);
        const frame = new VideoFrame(app.canvas, { timestamp: Math.round((i * 1e6) / o.fps), duration: Math.round(1e6 / o.fps) });
        enc.encode(frame, { keyFrame: i % (o.fps * 2) === 0 });
        frame.close();
        while (enc.encodeQueueSize > 4) await new Promise((res) => setTimeout(res, 5));
        o.onProgress?.(i + 1, total);
        if (i % 4 === 3) await new Promise((res) => setTimeout(res, 0));
      }
      await enc.flush(); enc.close();
      if (failed) throw failed;
      if (!avcC) throw new Error('the encoder gave no decoder configuration');
      const mp4 = muxMp4({ width: o.width, height: o.height, timescale: TS, avcC, samples });
      return { blob: new Blob([mp4], { type: 'video/mp4' }), type: 'mp4', frames: total, secs: total / o.fps, ms: Math.round(performance.now() - t0) };
    }
    // the fallback: MediaRecorder, one frame pushed at a time (its timing follows the clock, so frames are paced at fps)
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m));
    if (!mime) throw new Error('This browser can neither encode H.264 nor record WebM.');
    const stream = app.canvas.captureStream(0), track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: Math.round(o.width * o.height * o.fps * 0.15) });
    const chunks: Blob[] = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise<void>((res) => (rec.onstop = () => res()));
    rec.start(500);
    let next = performance.now();
    for (let i = 0; i < total; i++) {
      if (o.stop?.()) break;
      draw(i / o.fps); track.requestFrame?.();
      o.onProgress?.(i + 1, total);
      next += 1000 / o.fps; const wait = next - performance.now(); await new Promise((res) => setTimeout(res, Math.max(0, wait)));
    }
    rec.stop(); await done;
    return { blob: new Blob(chunks, { type: 'video/webm' }), type: 'webm', frames: total, secs: total / o.fps, ms: Math.round(performance.now() - t0) };
  } finally {
    app.pipeline = was.pipeline;
    r.setPixelRatio(was.pr); r.setSize(was.size.x, was.size.y, false);
    cam.aspect = was.aspect; cam.updateProjectionMatrix();
    cam.position.copy(was.pos); app.controls.target.copy(was.target); app.controls.enabled = was.controls; app.controls.update();
    app.paused = was.paused;
  }
}
