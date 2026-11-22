// Registers "Photoreal" on a twin page: a card with the switch, and window.__photoreal for the headless tools
// (tools/film: bake, stills, film frames). Loaded on demand by main.ts once the viewer has started.
import * as THREE from 'three/webgpu';
import type { App } from '../app';
import { CAPTION, Photoreal, look, type PhotorealOpts } from './photoreal.ts';
import { Capture } from './capture.ts';
import { giMode } from './giMaterial.ts';
import { Bifold } from './doors.ts';
import { prepare, restoreGeometry } from './bake.ts';
import { FilmPath, type CamState, type FilmSpec } from './path.ts';
import { GeometryPasses } from './passes.ts';
import { lineDrawing, maskRGB, depthView, normalView, cropPx, type Passes } from './lines.ts';
import { drawCaption } from './capture.ts';
import spec from './flythrough.json';

export function registerPhotoreal(app: App) {
  const pr = new Photoreal(app);
  const cap = new Capture(app);
  const card = document.createElement('section');
  card.className = 'card photoreal-card';
  card.innerHTML = `<h3>Photoreal</h3>
    <div class="row wrap"><button class="pill" id="photorealBtn" aria-pressed="false">Photoreal</button></div>
    <p class="small" id="photorealNote">Light traced through this model’s own geometry: sky and sun, with every bounce. ${CAPTION}</p>`;
  const panel = document.getElementById('panel');
  const stills = document.getElementById('trace')?.closest('section');
  if (stills && stills.parentElement) stills.parentElement.insertBefore(card, stills); else panel?.append(card);
  const btn = card.querySelector<HTMLButtonElement>('#photorealBtn')!;
  const note = card.querySelector<HTMLElement>('#photorealNote')!;
  btn.addEventListener('click', async () => {
    if (pr.busy) return;
    btn.disabled = true;
    try {
      if (pr.on) { pr.disable(); btn.setAttribute('aria-pressed', 'false'); btn.textContent = 'Photoreal'; }
      else {
        const s = await pr.enable({ workers: Math.max(1, (navigator.hardwareConcurrency || 2) - 1) });
        btn.setAttribute('aria-pressed', 'true'); btn.textContent = 'Photoreal on';
        note.textContent = `Light ${s.source} (${Number(s.samples).toLocaleString('en-NZ')} light points; ready in ${s.seconds} s). ${CAPTION}`;
      }
    } catch {
      btn.setAttribute('aria-pressed', 'false'); btn.textContent = 'Photoreal';
      note.textContent = 'This browser could not run the light bake, so the usual view stays. ' + CAPTION;
    } finally { btn.disabled = false; }
  });

  const path = new FilmPath(spec as unknown as FilmSpec);
  // the living room's bi-fold doors fold open as the camera comes along the deck (frames doors.from → doors.to)
  const doors = () => {
    const model = app.built.layers.find((l) => l.id === 'model')?.object;
    const fs = (path.spec as unknown as { doors?: { from: number; to: number; u0: number; u1: number; v: number; head: number } }).doors;
    const bif = model && fs ? new Bifold(model, fs) : null;
    if (bif) console.log(`[film] bi-fold doors: ${bif.parts.length} parts fold open from frame ${fs!.from} to ${fs!.to}`);
    const doorsAt = (f: number) => { if (!bif) return; const t = Math.min(1, Math.max(0, (f - fs!.from) / (fs!.to - fs!.from))); bif.set(t * t * (3 - 2 * t)); };
    return { bif, fs, doorsAt };
  };
  // geometry passes (normals, depth, part map) of the model in its normal look, and the pictures drawn from them
  const geo = new GeometryPasses(app);
  /** drawn lines (boundary, contours, set-out, the inspector box) are diagram marks, not part of a picture: hide them */
  const hideLines = () => {
    const hid: THREE.Object3D[] = [];
    app.scene.traverse((o) => { if ((o as THREE.Line).isLine && o.visible) { o.visible = false; hid.push(o); } });
    return () => { for (const o of hid) o.visible = true; };
  };
  /** POST one picture (raw bytes, `ch` channels a pixel) to the headless tool's sink */
  const send = (url: string, kind: string, f: number | string, w: number, h: number, ch: number, px: Uint8Array) => fetch(`${url}?kind=${kind}&f=${f}&w=${w}&h=${h}&ch=${ch}`, { method: 'POST', body: px });
  const sendPasses = async (url: string, f: number | string, P: Passes) => {
    const L = lineDrawing(P);
    await send(url, 'line', f, P.w, P.h, 1, L.line);
    await send(url, 'mask', f, P.w, P.h, 3, maskRGB(P));
    await send(url, 'depth', f, P.w, P.h, 1, depthView(P));
    await send(url, 'normal', f, P.w, P.h, 3, normalView(P));
  };
  const auto = (): CamState => {
    const c = app.camera, t = (app.controls as unknown as { target: THREE.Vector3 }).target;
    const f = t.distanceTo(c.position);
    return { eye: c.position.toArray() as [number, number, number], look: t.toArray() as [number, number, number], fov: c.fov, ap: 0, exp: NaN, focus: f, u: 0, speed: 0 };
  };
  const api = {
    pr, cap, path, look, spec,
    enable: (o: PhotorealOpts & { debug?: Partial<typeof look.debug>; gi?: Partial<typeof giMode> } = {}) => { Object.assign(look.debug, o.debug ?? {}); Object.assign(giMode, o.gi ?? {}); return pr.enable(o); },
    disable: () => pr.disable(),
    /** dry run of the bake's preparation: what receives light and how finely (geometry is put back) */
    prep: () => {
      const roots: Record<string, THREE.Object3D | undefined> = {};
      for (const l of app.built.layers) if (l.object && l.visible) roots[l.id] = l.object;
      const P = prepare(roots, app.built.focus);
      const top = P.receivers.map((r) => [r.mesh.name, (r.mesh.material as THREE.Material).name, r.orig.index ? r.orig.index.count / 3 : r.orig.attributes.position.count / 3, r.mesh.geometry.index!.count / 3, r.ids.length] as const).sort((x, y) => y[3] - x[3]).slice(0, 40);
      restoreGeometry(P);
      return { stats: P.stats, top };
    },
    /** the last bake as base64 (for tools that save it) */
    bakeFile: () => {
      if (!pr.lastBake) return null;
      const u = new Uint8Array(pr.lastBake); let s = '';
      for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
      return btoa(s);
    },
    /** a still of the current view as a PNG data URL: `samples` jittered sub-frames averaged */
    still: async (o: { w?: number; h?: number; samples?: number; caption?: boolean; ap?: number; cull?: boolean } = {}) => {
      app.paused = true;
      try {
        const st = auto(); st.ap = o.ap ?? 0;
        if (o.cull) cap.cullBegin();
        cap.shoot({ w: o.w ?? 1600, h: o.h ?? 900, samples: o.samples ?? 8, caption: o.caption ?? true, photoreal: pr.on ? pr : null }, () => st);
        const b = await cap.png();
        return await blobToDataURL(b);
      } finally { cap.cullEnd(); cap.restore(); app.paused = false; }
    },
    /** film frames [from, to): each a PNG POSTed to `url?f=<frame>` (the headless tool writes them to disk) */
    film: async (o: { from?: number; to?: number; w?: number; h?: number; samples?: number; url?: string; shutter?: number; cull?: boolean } = {}) => {
      app.paused = true;
      const fps = path.spec.fps, N = path.frames();
      const from = o.from ?? 0, to = Math.min(N, o.to ?? N), n = o.samples ?? 4, shutter = o.shutter ?? 0.5;
      const { bif, fs, doorsAt } = doors();
      // the sun does not move during the film: its shadow map is drawn once, with every tree, before the bush is
      // culled to each frame's view
      app.sun.shadow.autoUpdate = false; app.sun.shadow.needsUpdate = true;
      cap.shoot({ w: 64, h: 36, samples: 1, photoreal: pr.on ? pr : null }, () => path.at(0));
      if (o.cull !== false) {
        const pts: [number, number, number][] = [];
        for (let k = 0; k <= 400; k++) pts.push(path.at((k / 400) * path.spec.duration).eye);
        cap.cullBegin(pts);
        console.log(`[film] ${cap.cleared} trees by the camera path left out`);
      }
      const t0 = performance.now(), per: number[] = [];
      try {
        for (let f = from; f < to; f++) {
          const tf = performance.now();
          const times = Array.from({ length: n }, (_, k) => (f + shutter * ((k + 0.5) / n - 0.5)) / fps);
          doorsAt(f);
          if (bif && f >= fs!.from && f <= fs!.to + 1) app.sun.shadow.needsUpdate = true; // the folding leaves' shadows
          cap.shoot({ w: o.w ?? 1920, h: o.h ?? 1080, samples: n, caption: true, photoreal: pr.on ? pr : null }, (k) => path.at(Math.max(0, times[k])), (k) => Math.max(0, times[k]));
          const rgb = cap.rgb();
          if (o.url) await fetch(`${o.url}?f=${f}&w=${o.w ?? 1920}&h=${o.h ?? 1080}`, { method: 'POST', body: rgb });
          per.push(performance.now() - tf);
          console.log(`[film] frame ${f + 1}/${to} ${(per[per.length - 1] / 1000).toFixed(1)} s`);
        }
      } finally { doorsAt(-1); cap.cullEnd(); app.sun.shadow.autoUpdate = true; cap.restore(); app.paused = false; }
      return { frames: to - from, seconds: (performance.now() - t0) / 1000, perFrame: per.map((x) => +(x / 1000).toFixed(2)), timing: cap.timing };
    },
    /**
     * The geometry-pass film in the model's normal look (no baked light): for each frame [from, to) the colour frame
     * (`samples` jittered sub-frames averaged, no caption) and the four passes drawn from the exact geometry at the
     * frame's centre time (line drawing, part mask, depth, normals), each POSTed to `url` (the tool writes PNGs).
     * The bi-fold doors fold open as in the photoreal film.
     */
    geoFilm: async (o: { from?: number; to?: number; w?: number; h?: number; samples?: number; url: string; shutter?: number; beauty?: boolean }) => {
      if (pr.on) pr.disable();
      app.paused = true;
      const fps = path.spec.fps, N = path.frames(), w = o.w ?? 1280, h = o.h ?? 720;
      const from = o.from ?? 0, to = Math.min(N, o.to ?? N), n = o.samples ?? 2, shutter = o.shutter ?? 0.5;
      const { bif, fs, doorsAt } = doors();
      const showLines = hideLines();
      app.sun.shadow.autoUpdate = false; app.sun.shadow.needsUpdate = true;
      cap.shoot({ w: 64, h: 36, samples: 1, photoreal: null }, () => path.at(0));
      const pts: [number, number, number][] = [];
      for (let k = 0; k <= 400; k++) pts.push(path.at((k / 400) * path.spec.duration).eye);
      cap.cullBegin(pts);
      const t0 = performance.now(), per: number[] = [];
      try {
        for (let f = from; f < to; f++) {
          const tf = performance.now();
          doorsAt(f);
          if (bif && f >= fs!.from && f <= fs!.to + 1) app.sun.shadow.needsUpdate = true;
          if (o.beauty !== false) {
            const times = Array.from({ length: n }, (_, k) => (f + shutter * ((k + 0.5) / n - 0.5)) / fps);
            cap.shoot({ w, h, samples: n, caption: false, photoreal: null }, (k) => path.at(Math.max(0, times[k])), (k) => Math.max(0, times[k]));
            await send(o.url, 'beauty', f, w, h, 3, cap.rgb());
          }
          // the passes at the frame's own time, with no jitter and no lens offset
          cap.place(path.at(f / fps));
          cap.cullFrame();
          await sendPasses(o.url, f, await geo.render(w, h));
          per.push(performance.now() - tf);
          console.log(`[film] geometry frame ${f + 1}/${to} ${(per[per.length - 1] / 1000).toFixed(1)} s`);
        }
      } finally { doorsAt(-1); cap.cullEnd(); showLines(); app.sun.shadow.autoUpdate = true; cap.restore(); app.paused = false; }
      return { frames: to - from, seconds: (performance.now() - t0) / 1000, perFrame: per.map((x) => +(x / 1000).toFixed(2)), timing: { ...cap.timing, passes: geo.timing } };
    },
    /**
     * A still and its passes from the current view (or `cam`: eye x,y,z then look x,y,z; `fov` degrees), at w × h:
     * POSTs beauty (normal look, no caption), line, mask, depth and normal to `url` with f = `name`.
     */
    geoStill: async (o: { w: number; h: number; url: string; name: string; samples?: number; cam?: number[]; fov?: number }) => {
      if (pr.on) pr.disable();
      app.paused = true;
      const showLines = hideLines();
      try {
        if (o.cam) { app.camera.position.set(o.cam[0], o.cam[1], o.cam[2]); (app.controls as unknown as { target: THREE.Vector3 }).target.set(o.cam[3], o.cam[4], o.cam[5]); app.controls.update(); }
        if (o.fov) { app.camera.fov = o.fov; app.camera.updateProjectionMatrix(); }
        const st = auto();
        cap.shoot({ w: o.w, h: o.h, samples: o.samples ?? 4, caption: false, photoreal: null }, () => st);
        await send(o.url, 'beauty', o.name, o.w, o.h, 3, cap.rgb());
        cap.place(st);
        await sendPasses(o.url, o.name, await geo.render(o.w, o.h));
        return { camera: { eye: st.eye, look: st.look, fov: st.fov }, timing: geo.timing };
      } finally { showLines(); cap.restore(); app.paused = false; }
    },
    /**
     * The line drawing of exactly the view on the page's canvas, cropped and scaled as "Make it a photo" crops its frame
     * (canvas w × h → the rectangle sx, sy, sw, sh drawn at dw × dh), as a PNG data URL. For photoUI.
     */
    lineView: async (c: { w: number; h: number; sx: number; sy: number; sw: number; sh: number; dw: number; dh: number }) => {
      const k = c.dw / c.sw, W = Math.round(c.w * k), H = Math.round(c.h * k);
      const was = app.camera.aspect;
      try {
        const P = await geo.render(W, H), L = lineDrawing(P);
        const x0 = Math.max(0, Math.min(W - c.dw, Math.round(c.sx * k))), y0 = Math.max(0, Math.min(H - c.dh, Math.round(c.sy * k)));
        const g = cropPx(L.line, W, 1, x0, y0, c.dw, c.dh);
        const cv = document.createElement('canvas'); cv.width = c.dw; cv.height = c.dh;
        const ctx = cv.getContext('2d')!, img = ctx.createImageData(c.dw, c.dh);
        for (let i = 0; i < g.length; i++) { img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = g[i]; img.data[i * 4 + 3] = 255; }
        ctx.putImageData(img, 0, 0);
        return cv.toDataURL('image/png');
      } finally { app.camera.aspect = was; app.camera.updateProjectionMatrix(); }
    },
    /** a caption on a clear w × h picture (PNG data URL), for the film tool to lay over frames */
    captionPNG: (w: number, h: number, text?: string) => {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      drawCaption(cv.getContext('2d')!, w, h, text);
      return cv.toDataURL('image/png');
    },
    geo,
  };
  (window as unknown as { __photoreal: typeof api }).__photoreal = api;
  // ?photoreal on the page's address opens straight in the baked look (?photoreal=hold waits for a tool to start it)
  const q = new URLSearchParams(location.search).get('photoreal');
  if (q !== null && q !== 'hold') btn.click();
  return api;
}

function blobToDataURL(b: Blob): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(b); });
}
