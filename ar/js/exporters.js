// assembl AR: GLB and USDZ files from a snapshot, made in the browser with three.js's own exporters (r170).
import { GLTFExporter } from '../vendor/three/exporters/GLTFExporter.js';
import { USDZExporter } from '../vendor/three/exporters/USDZExporter.js';
import { wallPose } from './prepare.js';
import { unzipSync, zipSync, strFromU8, strToU8 } from '../vendor/three/libs/fflate.module.js';

// three r170's USDZExporter declares two texture inputs with the wrong USD types (Pixar's validators flag them).
// Rewrite those two declarations and re-pack the archive with the same 64-byte alignment AR Quick Look expects.
function fixUSDZ(bytes) {
  const files = unzipSync(bytes);
  let changed = false;
  for (const name in files) {
    if (!name.endsWith('.usda')) continue;
    const s = strFromU8(files[name]);
    const t = s.replace(/\btoken inputs:varname\b/g, 'string inputs:varname').replace(/\btoken inputs:in\.connect\b/g, 'float2 inputs:in.connect');
    if (t !== s) { files[name] = strToU8(t); changed = true; }
  }
  if (!changed) return bytes;
  const out = {};
  let offset = 0;
  for (const name in files) {
    const file = files[name];
    offset += 34 + name.length;
    const mod = offset & 63;
    out[name] = mod !== 4 ? [file, { extra: { 12345: new Uint8Array(64 - mod) } }] : file;
    offset = file.length;
  }
  return zipSync(out, { level: 0 });
}

export async function exportGLB(group) {
  const ab = await new GLTFExporter().parseAsync(group, { binary: true, onlyVisible: true, maxTextureSize: 2048 });
  return new Blob([ab], { type: 'model/gltf-binary' });
}

// mount 'wall' writes Quick Look's vertical plane anchoring, with the object's back on the wall facing out (+z)
export async function exportUSDZ(group, { mount = 'floor' } = {}) {
  const wall = mount === 'wall';
  const subject = wall ? wallPose(group) : group;
  const bytes = await new USDZExporter().parseAsync(subject, {
    ar: { anchoring: { type: 'plane' }, planeAnchoring: { alignment: wall ? 'vertical' : 'horizontal' } },
    includeAnchoringProperties: true, quickLookCompatible: true, maxTextureSize: 2048
  });
  return new Blob([fixUSDZ(bytes)], { type: 'model/vnd.usdz+zip' });
}

export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}
export const fileSize = b => (b.size >= 1e6 ? (b.size / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b.size / 1e3)) + ' KB');
export const slug = s => (String(s || 'model').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'model');
