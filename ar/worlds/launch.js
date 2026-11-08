// assembl AR worlds: open a world the way this device does it best. No three.js here; the WebXR runtime loads on demand.
//   iPhone and iPad     AR Quick Look with the pre-built USDZ (real size stays real size: #allowsContentScaling=0)
//   Android with WebXR  the live world in Chrome (ar/worlds/xr.js), warmed up in advance so a tap opens it at once
//   Android without     Google's Scene Viewer with the pre-built GLB
//   Meta Quest          WebXR immersive-ar passthrough, the same as Android
//   A computer          no camera AR: the code sheet, so a phone can open the same world and mode
import { world, fileURL, worldURL, modeOf } from './worlds.js';

const UA = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
export const isAndroid = /Android/i.test(UA);
export const isIOS = /iPad|iPhone|iPod/.test(UA) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const quickLook = (() => { try { const a = document.createElement('a'); return !!(a.relList && a.relList.supports && a.relList.supports('ar')); } catch (e) { return false; } })();
let xrP = null;
export function webxr() {
  return (xrP ||= (typeof navigator !== 'undefined' && navigator.xr && navigator.xr.isSessionSupported) ? navigator.xr.isSessionSupported('immersive-ar').catch(() => false) : Promise.resolve(false));
}
// 'quicklook' | 'webxr' | 'sceneviewer' | 'desktop'
let modeP = null;
export function device() {
  return (modeP ||= webxr().then(x => {
    const f = new URLSearchParams(location.search).get('device');   // ?device=desktop|quicklook|sceneviewer for checks on a computer
    if (f && ['desktop', 'quicklook', 'sceneviewer', 'webxr'].includes(f)) return f;
    return quickLook ? 'quicklook' : x ? 'webxr' : isAndroid ? 'sceneviewer' : 'desktop';
  }));
}
export const deviceLine = d => d === 'quicklook' ? 'Opens in AR Quick Look on this iPhone or iPad. No app needed.'
  : d === 'webxr' ? 'Opens your camera in this browser and runs the live world.'
    : d === 'sceneviewer' ? 'Opens in Google’s Scene Viewer on this phone.'
      : 'Scan the code with a phone to open it there.';

// warm the WebXR runtime while the page is idle, so the tap can ask for the camera straight away
let xrMod = null;
export function warm() {
  return device().then(d => { if (d === 'webxr' && !xrMod) xrMod = import('./xr.js'); return d; });
}

export function openQuickLook(id, mode) {
  mode = modeOf(mode);
  const a = document.createElement('a');
  a.setAttribute('rel', 'ar');
  a.appendChild(document.createElement('img'));
  // real size and giant stay at their authored size; the table version keeps Quick Look's own pinch to resize
  a.href = new URL(fileURL(id, mode, 'usdz'), location.href).href + (mode === 'inside' ? '#allowsContentScaling=0' : '');
  a.style.display = 'none'; document.body.appendChild(a); a.click();
  setTimeout(() => a.remove(), 4000);
}
export function openSceneViewer(id, mode) {
  mode = modeOf(mode); const w = world(id);
  const p = new URLSearchParams({ file: new URL(fileURL(id, mode, 'glb'), location.href).href, mode: 'ar_preferred', title: `${w.name} · assembl` });
  if (mode === 'inside') p.set('resizable', 'false');
  location.href = `intent://arvr.google.com/scene-viewer/1.2?${p}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(worldURL(id, mode))};end;`;
}
// Call straight from a tap. Returns 'opened' | 'sheet' (the caller shows the code) | throws with a readable message.
export async function open(id, mode, { onEnd } = {}) {
  mode = modeOf(mode);
  // iPhone and iPad first, with nothing awaited, so Safari still counts the tap as the user's own
  if (quickLook && !new URLSearchParams(location.search).get('device')) { openQuickLook(id, mode); return 'opened'; }
  const d = await device();
  if (d === 'quicklook') { openQuickLook(id, mode); return 'opened'; }
  if (d === 'sceneviewer') { openSceneViewer(id, mode); return 'opened'; }
  if (d === 'webxr') {
    const m = await (xrMod ||= import('./xr.js'));
    try { await m.startWorldXR({ id, mode, onEnd }); }
    catch (e) { throw new Error(e && e.name === 'NotAllowedError' ? 'The camera wasn’t allowed. Check the site’s camera permission and try again.' : 'The camera AR couldn’t start here (' + (e && (e.name || e.message)) + ').'); }
    return 'opened';
  }
  return 'sheet';
}
