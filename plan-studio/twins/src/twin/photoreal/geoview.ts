// The line drawing and part mask of exactly the view on the page, from the model's own geometry (passes.ts, lines.ts),
// for "Make it a photo" and for the free geometry check. Standalone: it needs only the twin's App, not the Photoreal
// baked look. Loaded on demand by photoUI.ts; also put on window.__geoview for the headless check tool.
import type { App } from '../app';
import { GeometryPasses } from './passes.ts';
import { lineDrawing, maskRGB, cropPx } from './lines.ts';

/** a crop of the page's canvas (w × h) to the rectangle sx, sy, sw, sh drawn at dw × dh: what captureView trims */
export interface Crop { w: number; h: number; sx: number; sy: number; sw: number; sh: number; dw: number; dh: number }

const passes = new WeakMap<App, GeometryPasses>();
const geoOf = (app: App) => { let g = passes.get(app); if (!g) { g = new GeometryPasses(app); passes.set(app, g); } return g; };

function toPNG(px: Uint8Array, w: number, h: number, ch: 1 | 3): string {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d')!, img = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const r = px[i * ch], g = ch === 3 ? px[i * 3 + 1] : r, b = ch === 3 ? px[i * 3 + 2] : r;
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL('image/png');
}

/** the line drawing (and, with `mask`, the lossless part mask) of the camera's current view, cropped as `c`, as PNG data URLs */
export async function viewPasses(app: App, c: Crop, mask = false): Promise<{ line: string; mask?: string }> {
  const k = c.dw / c.sw, W = Math.round(c.w * k), H = Math.round(c.h * k);
  const was = app.camera.aspect;
  try {
    const P = await geoOf(app).render(W, H), L = lineDrawing(P);
    const x0 = Math.max(0, Math.min(W - c.dw, Math.round(c.sx * k))), y0 = Math.max(0, Math.min(H - c.dh, Math.round(c.sy * k)));
    const line = toPNG(cropPx(L.line, W, 1, x0, y0, c.dw, c.dh), c.dw, c.dh, 1);
    return mask ? { line, mask: toPNG(cropPx(maskRGB(P), W, 3, x0, y0, c.dw, c.dh), c.dw, c.dh, 3) } : { line };
  } finally { app.camera.aspect = was; app.camera.updateProjectionMatrix(); }
}

export const lineView = async (app: App, c: Crop) => (await viewPasses(app, c)).line;

/** for tools, on a page where "Make it a photo" is mounted: window.__geoview.shot() is the view exactly as "Make it a photo"
 *  captures it (JPEG data URL and crop); .passes(crop, mask) the line drawing and part mask of the same crop */
export function registerGeoview(app: App, shot: () => { url: string; crop: Crop }) {
  (window as unknown as { __geoview: unknown }).__geoview = { shot, passes: (c: Crop, mask = true) => viewPasses(app, c, mask) };
}
