// Registers "Photoreal" on a twin page: a card with the switch, and window.__photoreal for the headless tools
// (tools/film: bake, stills, film frames). Loaded on demand by main.ts once the viewer has started.
import * as THREE from 'three/webgpu';
import type { App } from '../app';
import { CAPTION, Photoreal, look, type PhotorealOpts } from './photoreal.ts';
import { Capture } from './capture.ts';
import { giMode } from './giMaterial.ts';
import { prepare, restoreGeometry } from './bake.ts';
import { FilmPath, type CamState, type FilmSpec } from './path.ts';
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
        note.textContent = `Light ${s.source} (${s.samples} light points, ${(s.timing as { total?: number })?.total ?? 0} s). ${CAPTION}`;
      }
    } catch {
      btn.setAttribute('aria-pressed', 'false'); btn.textContent = 'Photoreal';
      note.textContent = 'This browser could not run the light bake, so the usual view stays. ' + CAPTION;
    } finally { btn.disabled = false; }
  });

  const path = new FilmPath(spec as unknown as FilmSpec);
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
    still: async (o: { w?: number; h?: number; samples?: number; caption?: boolean; ap?: number } = {}) => {
      app.paused = true;
      try {
        const st = auto(); st.ap = o.ap ?? 0;
        cap.shoot({ w: o.w ?? 1600, h: o.h ?? 900, samples: o.samples ?? 8, caption: o.caption ?? true, photoreal: pr.on ? pr : null }, () => st);
        const b = await cap.png();
        return await blobToDataURL(b);
      } finally { cap.restore(); app.paused = false; }
    },
    /** film frames [from, to): each a PNG POSTed to `url?f=<frame>` (the headless tool writes them to disk) */
    film: async (o: { from?: number; to?: number; w?: number; h?: number; samples?: number; url?: string; shutter?: number } = {}) => {
      app.paused = true;
      const fps = path.spec.fps, N = path.frames();
      const from = o.from ?? 0, to = Math.min(N, o.to ?? N), n = o.samples ?? 4, shutter = o.shutter ?? 0.5;
      // the sun does not move during the film: its shadow map is drawn once
      app.sun.shadow.autoUpdate = false; app.sun.shadow.needsUpdate = true;
      const t0 = performance.now(), per: number[] = [];
      try {
        for (let f = from; f < to; f++) {
          const tf = performance.now();
          const times = Array.from({ length: n }, (_, k) => (f + shutter * ((k + 0.5) / n - 0.5)) / fps);
          cap.shoot({ w: o.w ?? 1920, h: o.h ?? 1080, samples: n, caption: true, photoreal: pr.on ? pr : null }, (k) => path.at(Math.max(0, times[k])), (k) => Math.max(0, times[k]));
          const png = await cap.png();
          if (o.url) await fetch(`${o.url}?f=${f}`, { method: 'POST', body: png });
          per.push(performance.now() - tf);
          console.log(`[film] frame ${f + 1}/${to} ${(per[per.length - 1] / 1000).toFixed(1)} s, ${(png.size / 1e6).toFixed(2)} MB`);
        }
      } finally { app.sun.shadow.autoUpdate = true; cap.restore(); app.paused = false; }
      return { frames: to - from, seconds: (performance.now() - t0) / 1000, perFrame: per.map((x) => +(x / 1000).toFixed(2)), timing: cap.timing };
    },
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
