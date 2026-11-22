// "Photoreal": the 3D page's baked look. Turning it on traces the sky and sun through the model's geometry (or loads
// that bake if it was made earlier for this exact geometry), switches the receivers to materials that read it, turns
// off the viewer's fill-light tricks (hemisphere, fill and window panels), lights reflections with the same sky the
// bake used, and renders through a picture pipeline: contact AO, gentle bloom, a light grade and AgX tone mapping.
// Everything on screen still comes from the model: no generated imagery.
import * as THREE from 'three/webgpu';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { colorToDirection, directionToColor, float, luminance, mix, mrt, normalView, output, emissive, pass, sample, screenUV, smoothstep, uniform, vec2, vec3, vec4 } from 'three/tsl';
import type { App } from '../app';
import { applyLight, bakeInput, isGlowDecal, loadBake, prepare, restoreGeometry, runBake, saveBake, type Prepared } from './bake.ts';
import { sceneMeta, sceneParts } from './bakeRun.ts';
import { bakedMaterial, clearBakedMaterials, giUniforms, GI_DESAT } from './giMaterial.ts';
import { buildSky, SKY_RATIO, type SkyBuild } from './sky.ts';
import { addDetail, detailFor, removeDetail } from './detail.ts';
import { addProps, removeProps } from './props.ts';

export const CAPTION = 'Rendered from the model. A visualisation, not a photograph.';

export interface PhotorealOpts {
  spp?: number;
  workers?: number;
  /** a bake file to try first (made earlier for this geometry) */
  bakeUrl?: string | null;
  /** skip the file and always trace */
  fresh?: boolean;
  /** export the bake's input (a scene file) to this URL by POST and stop: node bakes it (tools/film/film.mjs bake) */
  exportUrl?: string;
}

type Saved = { mats: Map<THREE.Mesh, THREE.Material | THREE.Material[]>; hemi: number; fill: number; env: THREE.Texture | null; envI: number; envRot: THREE.Euler; tone: THREE.ToneMapping; exp: number; pipeline: THREE.RenderPipeline | null; update: App['updateInterior']; shadowRadius: number };

export const look = {
  /** exposure outdoors and fully inside (the camera opens up indoors, as a photographer would) */
  exposureOut: 0.95,
  exposureIn: 7.0,
  ao: 0.75,
  bloom: 0.06,
  bloomThreshold: 1.4,
  saturation: 1.04,
  contrast: 1.06,
  vignette: 0.22,
  warmth: 0.0,
  /** white balance outdoors and inside (interiors lit by warm timber bounce are cooled, as a photographer would) */
  wbOut: [1.0, 1.0, 1.0] as [number, number, number],
  wbIn: [0.93, 0.99, 1.1] as [number, number, number],
  /** debugging switches */
  debug: { noPipe: false, noMats: false, noEnv: false },
};

export class Photoreal {
  app: App;
  on = false;
  busy = false;
  P: Prepared | null = null;
  sky: SkyBuild | null = null;
  lastBake: ArrayBuffer | null = null;
  stats: Record<string, unknown> = {};
  private saved: Saved | null = null;
  private hiddenLines: THREE.Object3D[] = [];
  private envTex: THREE.DataTexture | null = null;
  pipe: THREE.RenderPipeline | null = null;
  private uExp = uniform(1);
  private uAO = uniform(look.ao);
  private uVig = uniform(look.vignette);
  private uSat = uniform(look.saturation);
  private uCon = uniform(look.contrast);
  private uWarm = uniform(look.warmth);
  private uWB = uniform(new THREE.Vector3(1, 1, 1));
  /** exposure override for the film (null = follow inside/outside) */
  exposure: number | null = null;

  constructor(app: App) { this.app = app; }

  private sunNow(): { dir: [number, number, number]; E: [number, number, number] } {
    const a = this.app;
    const d = a.sun.position.clone().sub(a.sun.target.position).normalize();
    const c = a.sun.color.clone().multiplyScalar(a.sun.intensity);
    return { dir: [d.x, d.y, d.z], E: [c.r, c.g, c.b] };
  }

  private roots() {
    const r: Record<string, THREE.Object3D | undefined> = {};
    for (const l of this.app.built.layers) if (l.object && l.visible) r[l.id] = l.object;
    return r;
  }

  async enable(o: PhotorealOpts = {}): Promise<Record<string, unknown>> {
    if (this.on || this.busy) return this.stats;
    this.busy = true;
    const a = this.app, t0 = performance.now();
    const log = (m: string) => { console.log('[photoreal] ' + m); a.log(m); };
    try {
      a.paused = true;
      log('Photoreal: preparing the model for light…');
      await new Promise((r) => setTimeout(r, 20));
      const det = addDetail(a.scene);
      const props = addProps(a);
      const sun = this.sunNow();
      this.sky = buildSky(sun.dir, sun.E);
      const P = prepare(this.roots(), a.built.focus, { log: (m) => console.log(m) });
      this.P = P;
      const sunSpec = { dir: sun.dir, E: sun.E, radius: 0.0093 * 1.5 };
      if (o.exportUrl) {
        // in parts of at most 8 MB, so the page never holds a second copy of the scene (memory is tight headless)
        const I = bakeInput(P, { w: this.sky.w, h: this.sky.h, data: this.sky.data }, sunSpec);
        const parts = sceneParts(I);
        await fetch(`${o.exportUrl}?part=meta`, { method: 'POST', body: JSON.stringify(sceneMeta(I, parts)) });
        let bytes = 0;
        for (const [name, v] of parts) {
          const u8 = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
          for (let off = 0; off < u8.length; off += 8 << 20) {
            await fetch(`${o.exportUrl}?part=${name}&off=${off}`, { method: 'POST', body: u8.subarray(off, Math.min(u8.length, off + (8 << 20))) });
          }
          bytes += u8.length;
        }
        const st = { ...P.stats, exported: bytes, hash: P.hash };
        this.restoreAll();
        return st;
      }
      let loaded = false, source = 'traced here';
      const url = o.bakeUrl === undefined ? defaultBakeUrl() : o.bakeUrl;
      if (url && !o.fresh) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const r = loadBake(P, await res.arrayBuffer());
            if (r.ok) { loaded = true; source = 'loaded from a bake made earlier for this geometry'; this.stats.bakeMeta = r.meta; }
            else console.log('[photoreal] bake file not used: ' + r.reason);
          }
        } catch { /* no file: trace */ }
      }
      let timing: Record<string, number> = {};
      if (!loaded) {
        const res = await runBake(P, { w: this.sky.w, h: this.sky.h, data: this.sky.data }, sunSpec, {
          spp: o.spp ?? 96, workers: o.workers,
          log: (m) => console.log(m),
          progress: (f, label) => a.log(`Photoreal: tracing light through the model (${label === 'paths' ? 'first pass' : 'final gather'}) ${Math.round(f * 100)}%`),
        });
        applyLight(P, res.E, res.D);
        this.lastBake = saveBake(P, res.E, res.D, { spp: o.spp ?? 96, seconds: res.secs, skyRatio: SKY_RATIO, sun, made: new Date().toISOString().slice(0, 10) });
        timing = res.timing;
      }
      this.applyLook();
      this.on = true;
      this.stats = { ...this.stats, ...P.stats, source, timing, detail: det, props, seconds: +((performance.now() - t0) / 1000).toFixed(1), bakeBytes: this.lastBake?.byteLength ?? null, hash: P.hash, skyHorizontal: +this.sky.horizontal.toFixed(3) };
      log(`Photoreal on: light ${source}. ${CAPTION}`);
      return this.stats;
    } catch (e) {
      console.error(e);
      this.restoreAll();
      a.log(`Photoreal could not start here: ${(e as Error).message}. The usual view is back.`);
      throw e;
    } finally {
      this.busy = false;
      a.paused = false;
    }
  }

  /** the colour of the baked light on the interior walls and ceilings (painted white), for the interior white balance */
  private interiorTint(): [number, number, number] | null {
    const P = this.P!;
    let R = 0, G = 0, B = 0, n = 0;
    for (const r of P.receivers) {
      const m = r.mesh.material as THREE.Material;
      if (!/wall_paint|ceiling|lining/.test(`${m.name} ${r.mesh.name}`)) continue;
      const gi = r.mesh.geometry.attributes.gi as THREE.BufferAttribute | undefined;
      if (!gi) continue;
      for (let i = 0; i < gi.count; i++) {
        const x = gi.getX(i), y = gi.getY(i), z = gi.getZ(i);
        if (x + y + z < 1e-4) continue;
        R += x; G += y; B += z; n++;
      }
    }
    if (n < 100) return null;
    // as the materials show it: pulled towards neutral by the same amount
    const c = [R / n, G / n, B / n], L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return c.map((x) => L + (x - L) * (1 - GI_DESAT)) as [number, number, number];
  }

  private applyLook() {
    const a = this.app, P = this.P!, sc = a.scene as THREE.Scene;
    const tint = this.interiorTint();
    if (tint) {
      // a camera's auto white balance: take most of the interior light's colour cast out (85%), keep a little warmth
      const L = 0.2126 * tint[0] + 0.7152 * tint[1] + 0.0722 * tint[2];
      const wb = tint.map((c) => Math.pow(L / Math.max(1e-4, c), 0.85)) as [number, number, number];
      const g = wb[1]; look.wbIn = wb.map((x) => x / g) as [number, number, number];
      this.stats.interiorLight = tint.map((x) => +x.toFixed(3));
      this.stats.whiteBalanceIn = look.wbIn.map((x) => +x.toFixed(3));
    }
    const fill = (a as unknown as { fill: THREE.DirectionalLight | null }).fill;
    this.saved = {
      mats: new Map(), hemi: a.hemi.intensity, fill: fill?.intensity ?? 0, env: sc.environment, envI: sc.environmentIntensity, envRot: sc.environmentRotation.clone(),
      tone: a.renderer.toneMapping, exp: a.renderer.toneMappingExposure, pipeline: a.pipeline, update: a.updateInterior, shadowRadius: a.sun.shadow.radius,
    };
    // drawn lines (boundary, contours, set-out) are diagram marks, not part of a picture; the night lights' glow decals
    // (pools of light, wall washes) are painted light, and this is a daylight picture
    a.scene.traverse((o) => {
      const mm = (o as THREE.Mesh).material as THREE.Material | undefined;
      const glow = (o as THREE.Mesh).isMesh && !!mm && !Array.isArray(mm) && isGlowDecal(mm);
      if (((o as THREE.Line).isLine || glow) && o.visible) { o.visible = false; this.hiddenLines.push(o); }
    });
    for (const r of P.receivers) {
      this.saved.mats.set(r.mesh, r.mesh.material);
      const src = r.mesh.material as THREE.Material;
      if (!look.debug.noMats) r.mesh.material = bakedMaterial(a.renderer, src, r.back, detailFor(src, r.mesh.name), r.mesh.name.replace(/_\d+$/, ''));
    }
    // the sky that was traced also lights the reflections
    const s = this.sky!, rgba = new Float32Array(s.w * s.h * 4);
    for (let i = 0; i < s.w * s.h; i++) { rgba[i * 4] = s.data[i * 3]; rgba[i * 4 + 1] = s.data[i * 3 + 1]; rgba[i * 4 + 2] = s.data[i * 3 + 2]; rgba[i * 4 + 3] = 1; }
    const t = new THREE.DataTexture(rgba, s.w, s.h, THREE.RGBAFormat, THREE.FloatType);
    t.mapping = THREE.EquirectangularReflectionMapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
    this.envTex = t;
    if (!look.debug.noEnv) { sc.environment = t; sc.environmentIntensity = 1; sc.environmentRotation.set(0, 0, 0); }
    a.hemi.intensity = 0; if (fill) fill.intensity = 0;
    a.renderer.toneMapping = THREE.AgXToneMapping;
    a.sun.shadow.radius = 4;
    // the viewer's interior trick (exposure, sky and window panels by room) gives way to the bake: exposure only
    const me = this;
    a.updateInterior = function (this: App, dt: number) {
      me.saved!.update.call(this, dt);
      this.hemi.intensity = 0;
      if (fill) fill.intensity = 0;
      (this.scene as THREE.Scene).environmentIntensity = 1;
      for (const l of (this as unknown as { windowLights: THREE.RectAreaLight[] }).windowLights) l.intensity = 0;
      const f = this.inside;
      const e = me.exposure ?? look.exposureOut * Math.pow(look.exposureIn / look.exposureOut, f);
      this.renderer.toneMappingExposure = e;
      me.uExp.value = e;
      me.uWB.value.set(...look.wbOut).lerp(new THREE.Vector3(...look.wbIn), f);
    };
    if (!look.debug.noPipe) {
      // the page's own picture pipeline is set aside (its render targets freed: memory is tight on small machines)
      this.saved.pipeline?.dispose();
      this.pipe = this.makePipeline(); a.pipeline = this.pipe;
    }
  }

  /** scene → contact AO (from the same pass's depth and normals) → bloom → grade; AgX at the output */
  makePipeline(): THREE.RenderPipeline {
    const a = this.app;
    const rp = new THREE.RenderPipeline(a.renderer);
    const sp = pass(a.scene, a.camera);
    sp.setMRT(mrt({ output, emissive, normal: directionToColor(normalView) }));
    const col = sp.getTextureNode('output');
    const nrmT = sp.getTextureNode('normal');
    const nrm = sample((uv) => colorToDirection(nrmT.sample(uv)));
    const aoPass = ao(sp.getTextureNode('depth'), nrm, a.camera) as unknown as { resolutionScale: number; radius: { value: number }; thickness: { value: number }; samples: { value: number }; getTextureNode: () => THREE.TextureNode };
    aoPass.resolutionScale = 0.5; aoPass.radius.value = 0.35; aoPass.thickness.value = 0.6; aoPass.samples.value = 12;
    const aoV = aoPass.getTextureNode().sample(screenUV).r;
    const c = col.rgb;
    // contact AO, faded out where the pixel is brightly lit (direct sun is shadowed by the shadow map already)
    const lit = luminance(c).mul(this.uExp);
    const k = mix(float(1), aoV, this.uAO.mul(smoothstep(2.2, 0.5, lit)));
    let g = c.mul(k);
    const glow = bloom(vec4(g, 1), look.bloom, 0.45, look.bloomThreshold) as unknown as THREE.Node;
    const emi = bloom(sp.getTextureNode('emissive'), 0.6, 0.35, 0.0) as unknown as THREE.Node;
    g = g.add((glow as unknown as { rgb: typeof g }).rgb).add((emi as unknown as { rgb: typeof g }).rgb);
    // light grade: warmth, saturation, contrast about mid grey, vignette (all before the AgX curve)
    g = g.mul(vec3(this.uWarm.add(1), 1, this.uWarm.oneMinus())).mul(this.uWB);
    const L = luminance(g);
    g = mix(vec3(L), g, this.uSat);
    g = g.max(0).div(0.18).pow(this.uCon).mul(0.18);
    const q = screenUV.sub(0.5).mul(vec2(1.6, 1.0));
    g = g.mul(mix(float(1), smoothstep(1.05, 0.25, q.length()), this.uVig));
    rp.outputNode = vec4(g, 1);
    return rp;
  }

  disable() {
    if (!this.on) return;
    this.restoreAll();
    this.app.log('Photoreal off: the usual view.');
  }

  private restoreAll() {
    const a = this.app;
    if (this.saved) {
      const sv = this.saved, sc = a.scene as THREE.Scene;
      for (const [m, mat] of sv.mats) m.material = mat;
      a.hemi.intensity = sv.hemi;
      const fill = (a as unknown as { fill: THREE.DirectionalLight | null }).fill; if (fill) fill.intensity = sv.fill;
      sc.environment = sv.env; sc.environmentIntensity = sv.envI; sc.environmentRotation.copy(sv.envRot);
      a.renderer.toneMapping = sv.tone; a.renderer.toneMappingExposure = sv.exp;
      a.updateInterior = sv.update; a.sun.shadow.radius = sv.shadowRadius;
      if (sv.pipeline && !look.debug.noPipe) { a.pipeline = null; a.setupPipeline(); } else a.pipeline = sv.pipeline;
      this.saved = null;
    }
    for (const o of this.hiddenLines.splice(0)) o.visible = true;
    if (this.P) { restoreGeometry(this.P); this.P = null; }
    removeDetail(a.scene);
    removeProps(a);
    clearBakedMaterials();
    this.pipe?.dispose(); this.pipe = null;
    this.envTex?.dispose(); this.envTex = null;
    this.on = false;
  }

  /** set the grade from `look` */
  syncLook() {
    this.uAO.value = look.ao; this.uVig.value = look.vignette; this.uSat.value = look.saturation; this.uCon.value = look.contrast; this.uWarm.value = look.warmth;
  }
}

/** the bake file for the page's plan, if one was made at build time (twin/bake/<plan>.gi.bin) */
export function defaultBakeUrl(): string | null {
  const p = new URLSearchParams(location.search).get('plan');
  if (!p || /[^\w.-]/.test(p)) return null;
  return `twin/bake/${p.replace(/\.plan\.json$/, '')}.gi.bin`;
}
