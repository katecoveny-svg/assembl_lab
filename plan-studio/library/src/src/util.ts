// Small helpers shared by the page modules.
import type { Item } from './types';

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll(sel)] as T[];

const rm = matchMedia('(prefers-reduced-motion: reduce)');
export const reducedMotion = () => rm.matches;
export const onReducedMotionChange = (fn: () => void) => rm.addEventListener('change', fn);

let gl: boolean | null = null;
/** true when this browser can make a WebGL context (tested once, the probe context is released) */
export function webglAvailable() {
  if (gl !== null) return gl;
  if (new URLSearchParams(location.search).has('nogl')) return (gl = false);
  try {
    const c = document.createElement('canvas');
    const ctx = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    gl = !!ctx;
    ctx?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    gl = false;
  }
  return gl;
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function fmtBytes(n: number) {
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`;
}

const nf = new Intl.NumberFormat('en-NZ');
/** model bounds as W × D × H (x across, z depth, y up) */
export function boundsText(it: Item) {
  const b = it.dimensions.modelBoundsMm;
  return `${nf.format(b.x)} × ${nf.format(b.z)} × ${nf.format(b.y)} mm`;
}

export const pad2 = (n: number) => String(n).padStart(2, '0');

export const COLLECTION_TITLES: Record<string, string> = {
  curated: 'Kate’s curated site',
  kowhai: 'Kōwhai Studio',
  twin: 'Twin library',
  objects: 'assembl objects',
  manu: 'Manu birds and flora',
};

/** the item's first-listed source, for one-line captions */
export function sourceLine(it: Item) {
  const main = it.collections.filter((c) => c !== 'twin');
  return (main.length ? main : it.collections).map((c) => COLLECTION_TITLES[c] ?? c).join(' + ');
}

export function isEditable(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
}
