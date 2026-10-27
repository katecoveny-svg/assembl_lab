// assembl AR: the "View in your space" action, shared by the studio, the viewer and the embed.
// It snapshots the object once per version, makes USDZ and GLB files from that snapshot only when they're needed,
// keeps them for the next tap, and picks the right AR for the device.
import { snapshot } from './prepare.js';
import { exportGLB, exportUSDZ } from './exporters.js';
import { support, openQuickLook, openSceneViewer, startWebXR } from './ar.js';

// source() returns {key, object, title, mount, fixedScale, snapshotOptions, sceneViewer, qrURL}
// onState(state, info): 'busy' {step, of, label} | 'idle' | 'error' {message} | 'ar' (camera open) | 'ar-end'
// onNoAR(info): this device has no AR; show the code (info.qrURL) or explain the downloads
export function createPlacer({ source, onState = () => { }, onNoAR = () => { } }) {
  let mode = 'none', cache = null;
  const ready = support().then(s => { mode = s.mode; return s; });

  function current() {
    const src = source();
    if (!src || !src.object) return null;
    if (!cache || cache.key !== src.key) cache = { key: src.key, src, snap: null, glb: null, usdz: null };
    else cache.src = src;
    return cache;
  }
  function snap(c) {
    if (!c.snap) c.snap = snapshot(c.src.object, { maxTriangles: 250000, ...(c.src.snapshotOptions || {}) });
    return c.snap;
  }
  async function usdz(c) {
    if (!c.usdz) c.usdz = exportUSDZ(snap(c).group, { mount: c.src.mount });
    return c.usdz;
  }
  async function glb(c) {
    if (!c.glb) c.glb = exportGLB(snap(c).group);
    return c.glb;
  }

  // Call from the tap handler itself: WebXR and Quick Look both want the user's gesture.
  async function activate() {
    const c = current();
    if (!c) return;
    const src = c.src;
    if (mode === 'webxr') {
      onState('busy', { step: 1, of: 1, label: 'Opening the camera…' });
      try {
        const group = snap(c).group;
        onState('ar');
        await startWebXR(group, { title: src.title, mount: src.mount, fixedScale: src.fixedScale });
        onState('ar-end');
      } catch (e) {
        onState('error', { message: 'The camera AR couldn’t start here (' + (e.name || e.message) + '). You can still download the GLB.' });
      }
      return;
    }
    if (mode === 'quicklook') {
      // already made: open it inside this tap, with no waiting in between
      if (c.usdzBlob) { openQuickLook(c.usdzBlob, { fixedScale: src.fixedScale }); return; }
      try {
        onState('busy', { step: 1, of: 2, label: 'Gathering the parts…' });
        await new Promise(r => setTimeout(r, 30));
        snap(c);
        onState('busy', { step: 2, of: 2, label: 'Making the USDZ…' });
        const blob = await usdz(c); c.usdzBlob = blob;
        openQuickLook(blob, { fixedScale: src.fixedScale });
        onState('idle');
      } catch (e) {
        onState('error', { message: 'We couldn’t make the USDZ (' + e.message + ').' });
      }
      return;
    }
    if (mode === 'sceneviewer' && src.sceneViewer) {
      openSceneViewer(src.sceneViewer, { title: src.title, fixedScale: src.fixedScale });
      return;
    }
    onNoAR({ mode, qrURL: src.qrURL || null, title: src.title });
  }

  // Warm the USDZ on iPhone and iPad so the tap opens Quick Look straight away.
  async function prefetch() {
    await ready;
    if (mode !== 'quicklook') return;
    const c = current();
    if (!c || c.usdzBlob) return;
    try { c.usdzBlob = await usdz(c); } catch (e) { c.usdz = null; /* made again on tap */ }
  }

  async function files(which) {
    const c = current();
    if (!c) throw new Error('Nothing to export yet.');
    const blob = which === 'usdz' ? await usdz(c) : await glb(c);
    return { blob, report: c.snap.report };
  }

  return { activate, prefetch, files, ready, get mode() { return mode; }, invalidate() { cache = null; }, report: () => (cache && cache.snap ? cache.snap.report : null) };
}
