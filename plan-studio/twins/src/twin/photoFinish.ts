// "Make photoreal still + film" (feat/photoreal-render-button). One button in the fly-through card, and a still-only one in
// Stills. It takes the browser's own frames for the confirmed shot path: a still from the chosen shot, and the fly-through
// made frame by frame in this browser (filmRender.ts), cut into short clips (a clip a shot where it can). It sends them to
// Google in quality mode (Nano Banana Pro at 4K for the still, Gemini Omni 1.2 Flash at 1080p for each clip; brandFilm.ts says
// why), each asked to restyle to photographic only and keep every building edge, opening and the camera. Every result goes
// through the gate: the free geometry check against the model's own line drawing of the same view (photoreal/geocheck.ts), and
// the look critique (/api/agent-judge, mode look). A clip whose geometry drifts is replaced by the browser render of the same
// seconds; a still that drifts is shown and marked, but not saved to the project.
// Nothing is spent until the estimate (Google's published prices) is on screen and a person confirms it. Keys stay in
// Cloudflare: the page calls only the lab's own /api/render, /api/film and /api/agent-judge.
// Then the brand, drawn here on a canvas after the AI finish so the logo is never altered by a model: a title card (the
// practice's line drawing drawn stroke by stroke on the dark ground, its logo, the project's name), a small logo bug in every
// frame, and a closing card; a still gets a slim footer strip. The brand is the practice's, read from the workspace at run time
// (practiceLook.ts BRAND_KEY); opened any other way, the cards carry the project's name and the model's own line drawing.
// Results: Download (MP4, JPEG) and, opened from a project, saved back to it (handoff.ts putBackRecord, kinds 'film' and 'shot').
import * as THREE from 'three/webgpu';
import type { App } from './app';
import type { Cam, FlightPath, Timeline } from './flightPath';
import { renderFilm } from './filmRender';
import { muxMp4, type Sample } from './mp4Mux';
import { putBackRecord } from './handoff';
import { BRAND_KEY, readBrand, readBrandDrawing } from './practiceLook';
import { TIMES, timeFromSun, type Time } from './photoFrame';
import { captureView } from './photoUI';
import {
  FINISH_LABEL, END_LINE, FILM_SIZES, PRICES, STILL_MODEL, FILM_MODEL, TITLE_SECS, END_SECS,
  estimate, planParts, revealOrder, inkOf, inkOfLineDrawing, cardLayout, bugBox, footerLayout, titleProgress, gateOf,
  type FilmSize, type Part, type Gate,
} from './brandFilm';

const QS = new URLSearchParams(location.search);
/** ?filmsecs=N: only the first N seconds (for checks); ?judge=0: no look critique (the geometry check still runs) */
const CAP = Number(QS.get('filmsecs')) || Infinity, JUDGE = QS.get('judge') !== '0';
const FPS = 24, CLIP_W = 1280, CLIP_H = 720, GATE_W = 1040, GATE_H = 585;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface FinishHost {
  el: HTMLElement;
  name: string;
  handoffId: string | null;
  readonly path: FlightPath;
  readonly timeline: Timeline | null;
  seek: (t: number) => void;
  /** what to hide while frames are drawn (the markers, the sketch) */
  hide: () => THREE.Object3D[];
}

const CSS = `
#pfBox{border-top:1px solid var(--line);margin-top:10px;padding-top:10px}
#pfBox h4{margin:0 0 4px;font-size:14px;font-weight:500}
#pfBox .pf-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0}
#pfOut{display:grid;gap:8px;margin-top:6px}
#pfOut:empty{display:none}
.pf-item{border:1px solid var(--line2);border-radius:10px;padding:6px;display:grid;gap:6px}
.pf-item img,.pf-item video{width:100%;border-radius:6px;display:block;background:#000}
.pf-tag{font:11px 'IBM Plex Mono',monospace;border-radius:999px;padding:2px 8px;justify-self:start}
.pf-tag.holds{background:#e6efe6;color:#24452a}.pf-tag.drifts{background:#f6e3e6;color:#7a2333}.pf-tag.not{background:var(--pale);color:var(--ink)}
.pf-label{font:11px/1.35 'IBM Plex Mono',monospace;color:var(--mauve)}
.pf-dialog{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(20,8,18,.48);padding:14px}
.pf-dialog[hidden]{display:none}
.pf-dialog .pf-card{background:var(--paper,#FFFDFB);color:var(--ink,#240B21);border-radius:14px;max-width:520px;width:100%;padding:16px 18px;box-shadow:0 18px 50px rgba(0,0,0,.35);font-size:14px;max-height:calc(100vh - 28px);overflow:auto}
.pf-dialog h4{margin:0 0 8px;font-size:17px;font-weight:500}
.pf-dialog ul{margin:6px 0 10px;padding-left:18px;display:grid;gap:4px;font-size:13px}
.pf-dialog .pf-total{font:500 15px 'IBM Plex Mono',monospace;margin:6px 0}
.pf-dialog .pf-fine{font-size:12px;color:var(--mauve,#654A4E);margin:6px 0 12px}
.pf-dialog .pf-row{display:flex;gap:8px;flex-wrap:wrap}
`;

// ---- small helpers -------------------------------------------------------------------------------------------------------
const blobUrl = (b: Blob) => URL.createObjectURL(b);
const toDataUrl = (b: Blob) => new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(r.error); r.readAsDataURL(b); });
async function loadImage(src: string) { const im = new Image(); im.src = src; await im.decode(); return im; }
function canvas(w: number, h: number) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function pixels(src: CanvasImageSource, w: number, h: number, sw?: number, sh?: number) {
  const c = canvas(w, h), g = c.getContext('2d', { willReadFrequently: true })!;
  if (sw && sh) g.drawImage(src, 0, 0, sw, sh, 0, 0, w, h); else g.drawImage(src, 0, 0, w, h);
  return g.getImageData(0, 0, w, h).data;
}
const rgbOf = (rgba: Uint8ClampedArray) => { const n = rgba.length >> 2, o = new Uint8Array(n * 3); for (let i = 0; i < n; i++) { o[i * 3] = rgba[i * 4]; o[i * 3 + 1] = rgba[i * 4 + 1]; o[i * 3 + 2] = rgba[i * 4 + 2]; } return o; };
function jpegOf(src: CanvasImageSource, w: number, h: number, maxEdge: number, q = 0.9) {
  const k = Math.min(1, maxEdge / Math.max(w, h)), c = canvas(Math.round(w * k), Math.round(h * k));
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
}
const slug = (v: string) => v.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'model';

/** the practice's brand as the workspace left it in this browser (opened from it), else none: images decoded, ready to draw */
async function brand() {
  let raw: string | null = null;
  try { raw = new URLSearchParams(location.search).get('from') === 'ops' ? localStorage.getItem(BRAND_KEY) : null; } catch { /* none */ }
  const b = readBrand(raw), d = readBrandDrawing(raw);
  const logo = b.logo ? await loadImage(b.logo).catch(() => null) : null;
  const drawing = d ? await loadImage(d.src).catch(() => null) : null;
  // a dark logo on the dark ground sits on a chalk plate (the logo itself is never recoloured)
  let dark = false;
  if (logo) { const px = pixels(logo, 48, Math.max(1, Math.round(48 * logo.naturalHeight / logo.naturalWidth))); let s = 0, n = 0; for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 128) { s += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; n++; } dark = n > 0 && s / n < 90; }
  return { name: b.name, logo, dark, drawing: drawing && d ? { img: drawing, mode: d.mode, colour: d.colour, own: true } : null };
}
type Brand = Awaited<ReturnType<typeof brand>>;
type Drawing = { img: CanvasImageSource & { width: number; height: number }; mode: 'mask' | 'image'; colour: string; own: boolean };

// ---- drawing the cards ---------------------------------------------------------------------------------------------------
const GROUND = '#000000', LINE = '#8BA2FF', INK = '#FFFFFF', MUTED = '#9AA1B8';
const SANS = "'Hanken Grotesk','Instrument Sans',system-ui,sans-serif", MONO = "'IBM Plex Mono',ui-monospace,monospace";
function drawLogo(g: CanvasRenderingContext2D, b: Brand, box: { x: number; y: number; w: number; h: number }, align: 'left' | 'center' | 'right', alpha = 1) {
  if (!b.logo) return null;
  const r = b.logo.naturalWidth / b.logo.naturalHeight; let w = box.w, h = w / r; if (h > box.h) { h = box.h; w = h * r; }
  const x = align === 'left' ? box.x : align === 'right' ? box.x + box.w - w : box.x + (box.w - w) / 2, y = box.y + (box.h - h) / 2;
  g.save(); g.globalAlpha = alpha;
  if (b.dark) { const p = h * 0.22; g.fillStyle = '#F5F1F2'; g.beginPath(); g.roundRect(x - p, y - p, w + 2 * p, h + 2 * p, p); g.fill(); }
  g.drawImage(b.logo, x, y, w, h); g.restore();
  return { x, y, w, h };
}
/** the drawing ready to reveal: its ink, its order, and its colours, at the size it is drawn */
function prepareDrawing(d: Drawing, maxW: number) {
  const k = Math.min(1, maxW / d.img.width), w = Math.max(1, Math.round(d.img.width * k)), h = Math.max(1, Math.round(d.img.height * k));
  const px = pixels(d.img, w, h), ink = d.own ? inkOf(px, d.mode) : inkOfLineDrawing(px), order = revealOrder(ink, w, h);
  const [r, gg, bb] = [1, 3, 5].map((i) => parseInt((d.colour || LINE).slice(i, i + 2), 16));
  const out = new ImageData(w, h);
  return {
    w, h,
    frame(p: number) {
      const o = out.data;
      for (let i = 0; i < w * h; i++) {
        const t = order[i], on = t >= 0 && t <= p;
        if (d.mode === 'image' && d.own) { o[i * 4] = px[i * 4]; o[i * 4 + 1] = px[i * 4 + 1]; o[i * 4 + 2] = px[i * 4 + 2]; } else { o[i * 4] = r; o[i * 4 + 1] = gg; o[i * 4 + 2] = bb; }
        o[i * 4 + 3] = on ? ink[i] : 0;
      }
      const c = canvas(w, h); c.getContext('2d')!.putImageData(out, 0, 0); return c;
    },
  };
}
function cardText(g: CanvasRenderingContext2D, L: ReturnType<typeof cardLayout>, lines: [string, string, string], W: number) {
  g.textAlign = L.align; g.textBaseline = 'alphabetic';
  const fit = (s: string, size: number, weight: number, font: string) => { let z = size; g.font = `${weight} ${z}px ${font}`; while (z > 9 && g.measureText(s).width > W * (L.align === 'left' ? 0.34 : 0.8) * (W < 800 ? 2.4 : 1)) { z--; g.font = `${weight} ${z}px ${font}`; } };
  fit(lines[0], L.titleSize, 300, SANS); g.fillStyle = INK; g.fillText(lines[0], L.textX, L.lines[0]);
  fit(lines[1], L.smallSize, 400, SANS); g.fillStyle = MUTED; g.fillText(lines[1], L.textX, L.lines[1]);
  fit(lines[2], Math.round(L.smallSize * 0.85), 400, MONO); g.fillStyle = MUTED; g.fillText(lines[2], L.textX, L.lines[2]);
}
export function makeCards(W: number, H: number, b: Brand, project: string, drawing: Drawing | null) {
  const T = cardLayout(W, H, drawing ? { w: drawing.img.width, h: drawing.img.height } : null, 'title');
  const E = cardLayout(W, H, drawing ? { w: drawing.img.width, h: drawing.img.height } : null, 'end');
  const prep = drawing && T.draw ? prepareDrawing(drawing, Math.min(900, Math.round(T.draw.w))) : null;
  const full = prep ? prep.frame(1.01) : null;
  const ground = (g: CanvasRenderingContext2D) => { g.fillStyle = GROUND; g.fillRect(0, 0, W, H); };
  return {
    title(g: CanvasRenderingContext2D, s: number) {
      ground(g);
      const p = titleProgress(s, TITLE_SECS);
      if (prep && T.draw) g.drawImage(p >= 1 ? full! : prep.frame(p), T.draw.x, T.draw.y, T.draw.w, T.draw.h);
      const a = Math.max(0, Math.min(1, (s - TITLE_SECS * 0.35) / (TITLE_SECS * 0.35)));
      g.save(); g.globalAlpha = a;
      if (!drawLogo(g, b, T.logo, T.align === 'left' ? 'left' : 'center') && b.name) { g.font = `400 ${Math.round(T.smallSize * 1.4)}px ${SANS}`; g.fillStyle = INK; g.textAlign = T.align; g.fillText(b.name, T.textX, T.logo.y + T.logo.h * 0.7); }
      cardText(g, T, [project, b.name ? `${b.name} · fly-through` : 'Fly-through', drawing?.own ? 'Drawing: the practice’s own' : 'Drawing: lines of the model'], W);
      g.restore();
    },
    end(g: CanvasRenderingContext2D, s: number) {
      ground(g);
      const a = Math.max(0, Math.min(1, s / 0.6));
      g.save(); g.globalAlpha = a;
      if (full && E.draw) { g.globalAlpha = a * 0.55; g.drawImage(full, E.draw.x, E.draw.y, E.draw.w, E.draw.h); g.globalAlpha = a; }
      if (!drawLogo(g, b, E.logo, 'center') && b.name) { g.font = `400 ${Math.round(E.smallSize * 1.6)}px ${SANS}`; g.fillStyle = INK; g.textAlign = 'center'; g.fillText(b.name, W / 2, E.logo.y + E.logo.h * 0.7); }
      cardText(g, E, [project, END_LINE, FINISH_LABEL], W);
      g.restore();
    },
  };
}
/** a film frame's brand: the logo bug bottom right (or the practice's name), and the label small, bottom left */
function overlay(g: CanvasRenderingContext2D, W: number, H: number, b: Brand, note: string) {
  const box = bugBox(W, H, b.logo ? { w: b.logo.naturalWidth, h: b.logo.naturalHeight } : null);
  if (!drawLogo(g, b, box, 'right', 0.88) && b.name) { g.font = `500 ${Math.round(H / 40)}px ${SANS}`; g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,.88)'; g.fillText(b.name, box.x + box.w, box.y + box.h); }
  const fs = Math.round(H / 52), text = note ? `${FINISH_LABEL} · ${note}` : FINISH_LABEL;
  g.font = `500 ${fs}px ${MONO}`; g.textAlign = 'left'; g.textBaseline = 'bottom';
  const w = g.measureText(text).width, m = Math.round(Math.min(W, H) * 0.04);
  g.fillStyle = 'rgba(20,14,18,0.55)'; g.fillRect(m - fs * 0.5, H - m - fs * 1.6, w + fs, fs * 1.9);
  g.fillStyle = '#F5F1F2'; g.fillText(text, m, H - m);
}
/** the still with its footer strip under it (the picture itself untouched), as a JPEG */
async function brandedStill(src: string, b: Brand, project: string): Promise<{ blob: Blob; url: string }> {
  const im = await loadImage(src), W = im.naturalWidth, H = im.naturalHeight;
  const F = footerLayout(W, H, b.logo ? { w: b.logo.naturalWidth, h: b.logo.naturalHeight } : null);
  const c = canvas(W, H + F.band), g = c.getContext('2d')!;
  g.drawImage(im, 0, 0); g.fillStyle = GROUND; g.fillRect(0, H, W, F.band);
  if (F.logo) drawLogo(g, b, F.logo, 'right');
  const text = [b.name, project, `Google Gemini · ${FINISH_LABEL}`].filter(Boolean).join(' · ');
  let z = F.text.size; g.font = `${z}px ${MONO}`; const room = (F.logo ? F.logo.x : W) - F.text.x - F.pad * 2;
  while (z > 8 && g.measureText(text).width > room) { z--; g.font = `${z}px ${MONO}`; }
  g.fillStyle = '#F5F1F2'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(text, F.text.x, F.text.y);
  const blob = await new Promise<Blob>((ok, no) => c.toBlob((x) => (x ? ok(x) : no(new Error('encode'))), 'image/jpeg', 0.92));
  return { blob, url: blobUrl(blob) };
}

// ---- frames from the model, and from a clip --------------------------------------------------------------------------------
/** the model drawn at w × h from a camera, read as a canvas (the page's size and camera are put back) */
function modelFrame(app: App, c: Cam, w: number, h: number) {
  const r = app.renderer, cam = app.camera as THREE.PerspectiveCamera;
  const was = { pr: r.getPixelRatio(), size: r.getSize(new THREE.Vector2()), aspect: cam.aspect, pos: cam.position.clone(), q: cam.quaternion.clone() };
  try {
    r.setPixelRatio(1); r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    cam.position.set(...c.eye); cam.lookAt(c.look[0], c.look[1], c.look[2]); cam.updateMatrixWorld();
    if (app.pipeline) app.pipeline.render(); else r.render(app.scene, cam);
    const out = canvas(w, h); out.getContext('2d')!.drawImage(app.canvas, 0, 0, w, h); return out;
  } finally {
    r.setPixelRatio(was.pr); r.setSize(was.size.x, was.size.y, false); cam.aspect = was.aspect; cam.updateProjectionMatrix();
    cam.position.copy(was.pos); cam.quaternion.copy(was.q); cam.updateMatrixWorld();
  }
}
/** a clip, frame by frame: seek to each time and draw it (deterministic, if slow; the clips are seconds long) */
async function clipReader(blob: Blob) {
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = blobUrl(blob);
  await new Promise<void>((ok, no) => { v.onloadeddata = () => ok(); v.onerror = () => no(new Error('the clip could not be read in this browser')); });
  return {
    w: v.videoWidth, h: v.videoHeight, secs: v.duration,
    async at(t: number) { const tt = Math.max(0, Math.min(v.duration - 0.001, t)); if (Math.abs(v.currentTime - tt) > 1e-4) await new Promise<void>((ok) => { v.onseeked = () => ok(); v.currentTime = tt; }); return v; },
    close() { URL.revokeObjectURL(v.src); v.removeAttribute('src'); v.load(); },
  };
}

// ---- the gate ------------------------------------------------------------------------------------------------------------
/** the geometry check of a finished picture against the model's line drawing of the same camera (null if it cannot be run) */
async function geometry(app: App, ai: CanvasImageSource, aw: number, ah: number, reference: CanvasImageSource, crop: { w: number; h: number; sx: number; sy: number; sw: number; sh: number; dw: number; dh: number }) {
  try {
    const [{ viewPasses }, { checkGeometry }, { maskFrom }] = await Promise.all([import('./photoreal/geoview.ts'), import('./photoreal/geocheck.ts'), import('./photoreal/lines.ts')]);
    const p = await viewPasses(app, crop, true), w = crop.dw, h = crop.dh;
    const [li, mi] = await Promise.all([loadImage(p.line), loadImage(p.mask!)]);
    const line = pixels(li, w, h), lineG = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) lineG[i] = line[i * 4];
    const { part, glass } = maskFrom(rgbOf(pixels(mi, w, h)), w, h, 3);
    const rep = checkGeometry({ photo: { w, h, ch: 3, px: rgbOf(pixels(ai, w, h, aw, ah)) }, reference: { w, h, ch: 3, px: rgbOf(pixels(reference, w, h)) }, line: lineG, part, glass, w, h });
    return { verdict: rep.verdict, score: rep.score };
  } catch (e) { console.warn('photoreal finish: no geometry check', (e as Error)?.message ?? e); return null; }
}
async function judge(images: string[], render: string, views: string[]) {
  if (!JUDGE) return null;
  try {
    const r = await fetch('/api/agent-judge', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'look', images, views, render }) });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.answer) return null;
    return { match: typeof j.answer.scores?.match === 'number' ? j.answer.scores.match : null, summary: String(j.answer.summary ?? '').slice(0, 160), provider: j.provider, model: j.model };
  } catch { return null; }
}

// ---- Google, through the lab's own endpoints --------------------------------------------------------------------------------
async function postJson(url: string, body: unknown, signal: AbortSignal) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal });
  const j = await r.json().catch(() => null);
  return { r, j };
}
const why = (j: { message?: string; error?: string } | null, status: number) => j?.message || j?.error || `HTTP ${status}`;
async function filmClip(body: Record<string, unknown>, signal: AbortSignal, tick: (s: string) => void) {
  const { r, j } = await postJson('/api/film', body, signal);
  if (r.status === 200 && j?.video) return j as { video: string; model: string };
  if (r.status !== 202 || !j?.poll) throw new Error(why(j, r.status));
  const t0 = performance.now();
  for (;;) {
    await sleep((j.poll_every_s ?? 10) * 1000);
    if (signal.aborted) throw new DOMException('stopped', 'AbortError');
    if (performance.now() - t0 > 15 * 60_000) throw new Error('Google took over 15 minutes; nothing more is asked.');
    const p = await fetch(j.poll, { signal }); const pj = await p.json().catch(() => null);
    if (p.status === 200 && pj?.status === 'completed' && pj.video) return pj as { video: string; model: string };
    if (!p.ok) throw new Error(why(pj, p.status));
    tick(`${Math.round((performance.now() - t0) / 1000)} s`);
  }
}

// ---- writing the joined film ------------------------------------------------------------------------------------------------
const CODECS = ['avc1.640033', 'avc1.640028', 'avc1.4d0028', 'avc1.42e028'];
async function encode(W: number, H: number, total: number, draw: (i: number, g: CanvasRenderingContext2D) => Promise<void>, progress: (i: number) => void, signal: AbortSignal) {
  if (typeof VideoEncoder === 'undefined') throw new Error('This browser cannot write an MP4 (no WebCodecs). Try Chrome or Edge.');
  let config: VideoEncoderConfig | null = null;
  for (const codec of CODECS) { const c: VideoEncoderConfig = { codec, width: W, height: H, bitrate: Math.round(W * H * FPS * 0.16), framerate: FPS, avc: { format: 'avc' } }; try { if ((await VideoEncoder.isConfigSupported(c)).supported) { config = c; break; } } catch { /* next */ } }
  if (!config) throw new Error('This browser cannot encode H.264 at this size.');
  const samples: Sample[] = []; let avcC: Uint8Array | null = null, failed: Error | null = null;
  const enc = new VideoEncoder({
    output: (chunk, meta) => { if (meta?.decoderConfig?.description && !avcC) { const d = meta.decoderConfig.description as ArrayBuffer | ArrayBufferView; avcC = d instanceof ArrayBuffer ? new Uint8Array(d.slice(0)) : new Uint8Array(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength)); } const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data); samples.push({ data, key: chunk.type === 'key', dur: 1000 }); },
    error: (e) => { failed = e as Error; },
  });
  enc.configure(config);
  const c = canvas(W, H), g = c.getContext('2d')!;
  for (let i = 0; i < total; i++) {
    if (signal.aborted) { enc.close(); throw new DOMException('stopped', 'AbortError'); }
    if (failed) throw failed;
    g.save(); await draw(i, g); g.restore();
    const f = new VideoFrame(c, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    enc.encode(f, { keyFrame: i % (FPS * 2) === 0 }); f.close();
    while (enc.encodeQueueSize > 4) await sleep(5);
    progress(i + 1);
  }
  await enc.flush(); enc.close();
  if (failed) throw failed;
  if (!avcC) throw new Error('the encoder gave no decoder configuration');
  return new Blob([muxMp4({ width: W, height: H, timescale: FPS * 1000, avcC, samples }) as BlobPart], { type: "video/mp4" });
}

// ---- the panel -------------------------------------------------------------------------------------------------------------
export function mountFinish(app: App, host: FinishHost) {
  if (!document.getElementById('pfStyle')) { const st = document.createElement('style'); st.id = 'pfStyle'; st.textContent = CSS; document.head.append(st); }
  const box = document.createElement('div'); box.id = 'pfBox';
  box.innerHTML = `<h4>Photoreal still + film</h4>
    <p class="small">Google finishes the browser render of the confirmed path: a still from one shot and the film, clip by clip. Look only: every edge, opening and camera position is kept, and each result is checked against the model. Your practice’s brand is added after, here in the browser.</p>
    <div class="pf-row small"><label>Still from shot <select id="pfShot" aria-label="Which shot the still is from"></select></label>
      <label>Film <select id="pfSize" aria-label="Film size">${FILM_SIZES.map((s) => `<option value="${s}">${s}${s === '1080p' ? ' (best)' : ''}</option>`).join('')}</select></label>
      <label>Light <select id="pfTime" aria-label="Light">${TIMES.map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label></div>
    <div class="pf-row"><button class="pill solid" id="pfGo" type="button">Make photoreal still + film</button></div>
    <p class="small mono" id="pfSays" role="status" aria-live="polite"></p>
    <div id="pfOut"></div>`;
  host.el.append(box);
  const $ = <T extends HTMLElement>(s: string, root: ParentNode = box) => root.querySelector(s) as T;
  const says = (t: string) => ($('#pfSays').textContent = t);
  const sun = document.getElementById('suntime') as HTMLInputElement | null;
  ($('#pfTime') as HTMLSelectElement).value = timeFromSun(Number(sun?.value));

  // the still-only button in Stills
  const stills = document.getElementById('trace')?.closest('section');
  let stillBtn: HTMLButtonElement | null = null;
  if (stills && !document.getElementById('pfStill')) {
    stillBtn = document.createElement('button'); stillBtn.className = 'pill'; stillBtn.id = 'pfStill'; stillBtn.type = 'button'; stillBtn.textContent = 'Photoreal still (AI-finished)';
    stillBtn.title = 'Google finishes this view as a photographic still (look only), checked against the model, with your brand along its foot';
    stills.querySelector('.row')?.append(stillBtn);
  }

  // the confirm dialog: the estimate, then a click to spend
  const dlg = document.createElement('div'); dlg.className = 'pf-dialog'; dlg.hidden = true; dlg.id = 'pfDialog';
  dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-labelledby', 'pfDlgH');
  dlg.innerHTML = `<div class="pf-card"><h4 id="pfDlgH">Before anything is spent</h4><p id="pfDlgWhat"></p><ul id="pfDlgLines"></ul><p class="pf-total" id="pfDlgTotal"></p>
    <p class="pf-fine">Google’s published prices, read ${esc(PRICES.read)}; the bill is Google’s count and can differ a little. Nothing is sent until you confirm. The keys stay on the lab’s server. ${esc(FINISH_LABEL)}.</p>
    <div class="pf-row"><button class="pill solid" id="pfYes" type="button">Confirm and spend</button><button class="pill" id="pfNo" type="button">Cancel</button></div></div>`;
  document.body.append(dlg);
  const ask = (what: string, est: ReturnType<typeof estimate>) => new Promise<boolean>((ok) => {
    $('#pfDlgWhat', dlg).textContent = what;
    $('#pfDlgLines', dlg).innerHTML = est.lines.map((l) => `<li>${esc(l)}</li>`).join('');
    $('#pfDlgTotal', dlg).textContent = `About US$${est.total.toFixed(2)} in all`;
    $('#pfYes', dlg).textContent = `Confirm and spend about US$${est.total.toFixed(2)}`;
    dlg.hidden = false; $<HTMLButtonElement>('#pfYes', dlg).focus();
    const done = (v: boolean) => { dlg.hidden = true; $('#pfYes', dlg).onclick = null; $('#pfNo', dlg).onclick = null; ok(v); };
    $('#pfYes', dlg).onclick = () => done(true); $('#pfNo', dlg).onclick = () => done(false);
    dlg.onkeydown = (e) => { if (e.key === 'Escape') done(false); };
  });

  // the server's own estimates and limits (free GETs); local prices until they answer
  let partMax = 10, perSecond: Partial<Record<FilmSize, number>> = {}, stillUsd: number | undefined, configured = { render: true, film: true };
  fetch('/api/film').then((r) => (r.ok ? r.json() : null)).then((s) => { if (s?.type !== 'assembl.planstudio.film.status') return; partMax = Number(s.part_max_s) || 10; for (const k of FILM_SIZES) if (typeof s.estimate?.per_second?.[k] === 'number') perSecond[k] = s.estimate.per_second[k]; configured.film = s.configured !== false; }).catch(() => void 0);
  fetch('/api/render').then((r) => (r.ok ? r.json() : null)).then((s) => { if (s?.type !== 'assembl.planstudio.render.status') return; if (typeof s.estimate?.finest?.usd === 'number') stillUsd = s.estimate.finest.usd; configured.render = s.configured !== false; }).catch(() => void 0);

  const shotList = () => {
    const sel = $('#pfShot') as HTMLSelectElement, keep = sel.value, marks = host.timeline?.marks ?? [];
    sel.innerHTML = marks.map((m) => { const s = host.path.shots.find((x) => x.id === m.id); return `<option value="${esc(m.id)}">${esc(m.id)}${s?.label ? ` · ${esc(s.label.slice(0, 28))}` : ''}</option>`; }).join('') || '<option value="">no shots placed</option>';
    if ([...sel.options].some((o) => o.value === keep)) sel.value = keep;
  };
  shotList(); box.addEventListener('pointerenter', shotList); box.addEventListener('focusin', shotList);
  { const says0 = host.el.querySelector('#flSays'); if (says0) new MutationObserver(shotList).observe(says0, { childList: true, characterData: true, subtree: true }); }

  let busy: AbortController | null = null;
  const out = (html: string) => { const d = document.createElement('div'); d.className = 'pf-item'; d.innerHTML = html; $('#pfOut').prepend(d); return d; };
  const tag = (g: Gate) => `<span class="pf-tag ${g.verdict === 'holds' ? 'holds' : g.verdict === 'drifts' ? 'drifts' : 'not'}">${g.verdict === 'holds' ? 'Geometry holds' : g.verdict === 'drifts' ? 'Geometry drifts' : 'Geometry not checked'}</span>`;
  /** the project's name for the cards: the model's own name (its file name, tidied), else the page's */
  const project = () => (host.name.replace(/\.(plan\.json|json|ifc|glb|gltf|rvt)$/i, '').replace(/[_-]+/g, ' ').trim() || app.project.title || 'Project').slice(0, 80);
  const hideAll = () => { const h = host.hide().filter((o) => o.visible); for (const o of h) o.visible = false; return () => { for (const o of h) o.visible = true; }; };

  /** the still: the view as captured, sent at 4K quality, gated, branded */
  async function still(look: Time, b: Brand, signal: AbortSignal, from: string) {
    const show = hideAll();
    let shot: ReturnType<typeof captureView>;
    try { shot = captureView(app); } catch { throw new Error('Could not read the 3D view (the browser gave back an empty picture), so nothing was sent. Reload the page and try again.'); } finally { show(); }
    const ref = await loadImage(shot.url);
    let line: string | null = null;
    try { const { viewPasses } = await import('./photoreal/geoview.ts'); line = (await viewPasses(app, shot.crop)).line; } catch { line = null; }
    says(`Still: sent to Google (Nano Banana Pro, 4K)…`);
    const { r, j } = await postJson('/api/render', { image: shot.url, line, quality: 'finest', look: { time: look }, confirm: true }, signal);
    if (!r.ok || !/^data:image\//.test(j?.image ?? '')) throw new Error(`No still: ${why(j, r.status)}`);
    const ai = await loadImage(j.image);
    says('Still: checking it against the model…');
    const geo = await geometry(app, ai, ai.naturalWidth, ai.naturalHeight, ref, shot.crop);
    const jd = await judge([shot.url], jpegOf(ai, ai.naturalWidth, ai.naturalHeight, 1600, 0.85), ['browser render']);
    const gate = gateOf(geo, jd);
    const branded = await brandedStill(j.image, b, project());
    return { blob: branded.blob, url: branded.url, gate, model: String(j.model ?? STILL_MODEL), from, ai: j.image as string, ratio: shot.ratio, judge: jd };
  }

  async function run(kind: 'both' | 'still') {
    if (busy) { busy.abort(); return; }
    shotList();
    const tl = host.timeline, fp = host.path, size = ($('#pfSize') as HTMLSelectElement).value as FilmSize, look = ($('#pfTime') as HTMLSelectElement).value as Time;
    let parts: Part[] = [];
    let mark = null as null | { id: string; arrive: number; leave: number };
    if (kind === 'both') {
      if (fp.status !== 'confirmed') return says('Confirm the path first: the photoreal film is made from the confirmed path only.');
      if (!tl?.duration) return says('Place two shots first.');
      const dur = Math.min(tl.duration, CAP);
      try { parts = planParts(dur, tl.marks.map((m) => ({ id: m.id, arrive: m.arrive })), partMax); } catch (e) { return says((e as Error).message); }
      const id = ($('#pfShot') as HTMLSelectElement).value; mark = tl.marks.find((m) => m.id === id) ?? tl.marks[0] ?? null;
    }
    if (!configured.render || (kind === 'both' && !configured.film)) return says('Google is not switched on in this copy of the lab (no key on the server). Nothing was sent.');
    const est = estimate({ still: true, parts, size, judge: JUDGE, perSecond, stillUsd });
    const what = kind === 'both' ? `A still from shot ${mark?.id ?? '01'} and the film of the confirmed path (v${fp.version}, ${parts.length} clip${parts.length === 1 ? '' : 's'}${parts.some((p) => p.shots.length) ? `: shots ${parts.map((p) => p.shots.join('+') || '·').join(' | ')}` : ''}).` : 'A still of this view.';
    if (!(await ask(what, est))) return says('Cancelled. Nothing was sent.');
    busy = new AbortController(); const signal = busy.signal;
    const go = $<HTMLButtonElement>('#pfGo'); go.textContent = 'Stop'; if (stillBtn) stillBtn.disabled = true;
    const t0 = performance.now(), b = await brand();
    try {
      // ---- the still ----
      if (kind === 'both' && mark) host.seek((mark.arrive + mark.leave) / 2);   // the shot as it is held
      const s = await still(look, b, signal, kind === 'both' ? `shot ${mark?.id}` : 'this view');
      const sName = `${slug(host.name)}-photoreal-${kind === 'both' ? `shot-${mark?.id}` : 'view'}-v${fp.version}.jpg`;
      const item = out(`<img src="${s.url}" alt="Photoreal still, AI-finished from the browser render" />${tag(s.gate)}<span class="pf-label">${esc(FINISH_LABEL)}. ${esc(s.gate.words)} ${esc(s.model)}, ${esc(s.from)}.</span><div class="pf-row"><button class="pill" data-dl="still">Download JPEG</button></div>`);
      item.querySelector('[data-dl]')!.addEventListener('click', () => void app.save?.(sName, s.blob));
      const meta = (extra: Record<string, unknown>) => ({ label: FINISH_LABEL, gate: s.gate, path_version: fp.version, path_status: fp.status, prompt: 'restyle to photographic only; keep every building edge, opening and camera position', ...extra });
      if (host.handoffId && s.gate.verdict !== 'drifts') await putBackRecord(host.handoffId, 'shot', { name: sName, part: `photoreal-${kind === 'both' ? mark?.id : 'view'}`, data: s.blob, meta: meta({ model: s.model, size: '4K', from: s.from }) }).then(() => item.querySelector('.pf-label')!.append(' A copy is saved to the project’s Films and stills.')).catch((e) => item.querySelector('.pf-label')!.append(` The copy for the project did not go: ${(e as Error).message}`));
      else if (host.handoffId) item.querySelector('.pf-label')!.append(' Not saved to the project: its geometry drifts.');
      if (kind === 'still' || !tl) { says(`Still made in ${Math.round((performance.now() - t0) / 1000)} s. ${FINISH_LABEL}.`); return; }

      // ---- the film, clip by clip ----
      const restore = hideAll();
      const aiStill = await loadImage(s.ai), lookStill = jpegOf(aiStill, aiStill.naturalWidth, aiStill.naturalHeight, 1280, 0.85);
      const clips: { part: Part; ai: Blob | null; browser: Blob; gate: Gate; model: string; mid: string; ref: string }[] = [];
      let guide: string | null = null;
      try {
        for (const p of parts) {
          if (signal.aborted) throw new DOMException('stopped', 'AbortError');
          says(`Clip ${p.index + 1} of ${parts.length}: drawing ${p.seconds} s in the browser…`);
          const f = await renderFilm(app, { width: CLIP_W, height: CLIP_H, fps: FPS, quality: 'full', duration: p.seconds, at: (t) => tl.at(p.from + t), stop: () => signal.aborted });
          if (f.type !== 'mp4') throw new Error('This browser cannot write the MP4 Google needs (no H.264 encoder).');
          says(`Clip ${p.index + 1} of ${parts.length}: Google is finishing it (Omni 1.2 Flash, ${size})…`);
          const res = await filmClip({ video: await toDataUrl(f.blob), still: lookStill, guide, resolution: size, mode: 'background', look: { time: look }, part: p.index, confirm: true }, signal, (w) => says(`Clip ${p.index + 1} of ${parts.length}: Google is finishing it… ${w}`));
          const ai = await (await fetch(res.video)).blob();
          // gate on the clip's middle frame, against the model's own drawing of the same camera
          const rd = await clipReader(ai), mid = p.seconds / 2, cam = tl.at(p.from + mid);
          const v = await rd.at(mid), ref = modelFrame(app, cam, GATE_W, GATE_H);
          const keep = { eye: app.camera.position.clone(), q: app.camera.quaternion.clone() };
          app.camera.position.set(...cam.eye); app.camera.lookAt(cam.look[0], cam.look[1], cam.look[2]); app.camera.updateMatrixWorld();
          const geo = await geometry(app, v, rd.w, rd.h, ref, { w: CLIP_W, h: CLIP_H, sx: 0, sy: 0, sw: CLIP_W, sh: CLIP_H, dw: GATE_W, dh: GATE_H });
          app.camera.position.copy(keep.eye); app.camera.quaternion.copy(keep.q); app.camera.updateMatrixWorld();
          const end = await rd.at(rd.secs - 0.05); guide = jpegOf(end, rd.w, rd.h, 1280, 0.85);
          const aiMid = jpegOf(await rd.at(mid), rd.w, rd.h, 1280, 0.85); rd.close();
          clips.push({ part: p, ai, browser: f.blob, gate: gateOf(geo, null), model: String(res.model ?? FILM_MODEL), mid: aiMid, ref: ref.toDataURL('image/jpeg', 0.85) });
        }
      } finally { restore(); }
      // the look critique on the film: up to three browser frames against one finished frame
      const jd = await judge(clips.slice(0, 3).map((c) => c.ref), clips[Math.floor(clips.length / 2)].mid, clips.slice(0, 3).map((_, i) => `clip ${i + 1}`));
      for (const c of clips) c.gate = gateOf(c.gate.geometry == null ? null : { verdict: c.gate.verdict as 'holds' | 'drifts', score: c.gate.geometry }, jd);

      // ---- join: title card, the clips (a drifting clip is the browser render), the closing card ----
      says('Joining the film with the title and closing cards…');
      const first = await clipReader(clips.find((c) => c.gate.verdict !== 'drifts')?.ai ?? clips[0].browser); const W = first.w - (first.w % 2), H = first.h - (first.h % 2); first.close();
      const ownDrawing: Drawing | null = b.drawing;
      let drawing: Drawing | null = ownDrawing;
      if (!drawing) {
        // no practice drawing: the model's own lines of the first shot, drawn in the sketch blue
        try { const { viewPasses } = await import('./photoreal/geoview.ts'); const c0 = tl.at(0), keep = app.camera.position.clone(), q = app.camera.quaternion.clone(); app.camera.position.set(...c0.eye); app.camera.lookAt(c0.look[0], c0.look[1], c0.look[2]); app.camera.updateMatrixWorld(); const ln = await viewPasses(app, { w: CLIP_W, h: CLIP_H, sx: 0, sy: 0, sw: CLIP_W, sh: CLIP_H, dw: 960, dh: 540 }); app.camera.position.copy(keep); app.camera.quaternion.copy(q); app.camera.updateMatrixWorld(); const im = await loadImage(ln.line); drawing = { img: im, mode: 'mask', colour: LINE, own: false }; } catch { drawing = null; }
      }
      const cards = makeCards(W, H, b, project(), drawing);
      const nT = Math.round(TITLE_SECS * FPS), nE = Math.round(END_SECS * FPS), counts = clips.map((c) => Math.round(c.part.seconds * FPS));
      const total = nT + counts.reduce((a, n) => a + n, 0) + nE;
      let reader: Awaited<ReturnType<typeof clipReader>> | null = null, readerOf = -1;
      const film = await encode(W, H, total, async (i, g) => {
        if (i < nT) return cards.title(g, i / FPS);
        let k = i - nT;
        for (let c = 0; c < clips.length; c++) {
          if (k < counts[c]) {
            if (readerOf !== c) { reader?.close(); const cl = clips[c]; reader = await clipReader(cl.gate.verdict === 'drifts' || !cl.ai ? cl.browser : cl.ai); readerOf = c; }
            const v = await reader!.at((k + 0.5) / FPS); g.drawImage(v, 0, 0, W, H);
            overlay(g, W, H, b, clips[c].gate.verdict === 'drifts' ? 'this clip: the browser render (the finish drifted)' : '');
            return;
          }
          k -= counts[c];
        }
        reader?.close(); reader = null; readerOf = -1;
        cards.end(g, k / FPS);
      }, (i) => { if (i % 24 === 0 || i === total) says(`Joining: frame ${i} of ${total}…`); }, signal);
      const fName = `${slug(host.name)}-photoreal-film-v${fp.version}-${size}.mp4`, fUrl = blobUrl(film);
      const drifted = clips.filter((c) => c.gate.verdict === 'drifts').length, checked = clips.filter((c) => c.gate.verdict !== 'not checked').length;
      const fGate: Gate = { verdict: checked === 0 ? 'not checked' : drifted ? 'drifts' : 'holds', geometry: null, match: jd?.match ?? null, words: `${clips.map((c, i) => `clip ${i + 1}: ${c.gate.verdict}${c.gate.geometry != null ? ` (${Math.round(c.gate.geometry * 100)}%)` : ''}`).join(', ')}${drifted ? `; ${drifted} drifting clip${drifted === 1 ? '' : 's'} shown as the browser render` : ''}${jd?.match != null ? `; look critique match ${jd.match} of 5` : ''}. For a person to review.` };
      const fi = out(`<video src="${fUrl}" controls muted playsinline aria-label="Photoreal film, AI-finished from the browser render"></video>${tag(fGate)}<span class="pf-label">${esc(FINISH_LABEL)}. ${esc(fGate.words)} ${esc(FILM_MODEL)} at ${esc(size)}; title and closing cards and the logo added in this browser. Silent.</span><div class="pf-row"><button class="pill" data-dl="film">Download MP4</button></div>`);
      fi.querySelector('[data-dl]')!.addEventListener('click', () => void app.save?.(fName, film));
      app.lastVideo = film;
      if (host.handoffId) await putBackRecord(host.handoffId, 'film', { name: fName, part: 'photoreal-film', data: film, meta: meta({ model: FILM_MODEL, size, secs: Math.round(total / FPS), clips: clips.map((c) => ({ from: c.part.from, to: c.part.to, shots: c.part.shots, gate: c.gate.verdict, geometry: c.gate.geometry })), estimate_usd: est.total }) })
        .then(() => fi.querySelector('.pf-label')!.append(' A copy is saved to the project’s Films and stills.')).catch((e) => fi.querySelector('.pf-label')!.append(` The copy for the project did not go: ${(e as Error).message}`));
      says(`Still and film made in ${Math.round((performance.now() - t0) / 1000)} s (estimate about US$${est.total.toFixed(2)}). ${FINISH_LABEL}.`);
    } catch (e) {
      says((e as Error)?.name === 'AbortError' ? 'Stopped. Anything Google had already started is still billed by Google.' : (e as Error).message);
    } finally {
      busy = null; go.textContent = 'Make photoreal still + film'; if (stillBtn) stillBtn.disabled = false;
    }
  }
  $('#pfGo').addEventListener('click', () => void run('both'));
  stillBtn?.addEventListener('click', () => void run('still'));
  const api = { run, ask, cards: (W: number, H: number) => brand().then((b) => makeCards(W, H, b, project(), b.drawing)) };
  (window as unknown as { __finish?: unknown }).__finish = api;   // for checks from the console (this tab only)
  return api;
}
