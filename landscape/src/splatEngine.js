import * as THREE from 'three';

/**
 * SplatScanEngine — Drop-in 3D Gaussian Splatting (.splat / .ply) loader for /landscape/
 * Parses SuperSplat / Antimatter15 .splat (32-byte binary) and standard 3DGS .ply
 * (spherical harmonics f_dc_0..2 or RGB), renders soft radial Gaussian splats in WebGPU/WebGL2,
 * and aligns scans onto the NZ terrain so users can brush 3D native gardens & pools directly inside.
 */
const SH_C0 = 0.28209479177387814;

function makeGaussianDiscTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(64, 64);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const dx = (x + 0.5) / 32 - 1;
      const dy = (y + 0.5) / 32 - 1;
      const r2 = dx * dx + dy * dy;
      const a = r2 < 1 ? Math.exp(-r2 * 4.2) : 0;
      const idx = (y * 64 + x) * 4;
      img.data[idx] = 255;
      img.data[idx + 1] = 255;
      img.data[idx + 2] = 255;
      img.data[idx + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class SplatScanEngine {
  constructor(scene, terrainEngine) {
    this.scene = scene;
    this.terrainEngine = terrainEngine;
    this.group = new THREE.Group();
    this.group.name = 'SplatScanContext';
    this.scene.add(this.group);

    this.pointsMesh = null;
    this.splatCount = 0;
    this.scanName = '';
    this._discTex = makeGaussianDiscTexture();

    this.scale = 1.0;
    this.offsetY = 0.0;
    this.rotY = 0.0;
    this.pointSize = 0.16;
  }

  clear() {
    if (this.pointsMesh) {
      this.group.remove(this.pointsMesh);
      this.pointsMesh.geometry.dispose();
      this.pointsMesh.material.dispose();
      this.pointsMesh = null;
    }
    this.splatCount = 0;
    this.scanName = '';
  }

  _commitSplatCloud(positions, colors, name, targetSpan = 22) {
    this.clear();
    const count = positions.length / 3;
    if (count === 0) throw new Error('Scan contains 0 splats.');

    // Compute bounds & normalize so scan sits cleanly over the site ground
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < count; i++) {
      const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    const cx = (minX + maxX) * 0.5;
    const cz = (minZ + maxZ) * 0.5;
    const span = Math.max(maxX - minX, maxZ - minZ, 0.1);
    const normScale = span > 26 || span < 4 ? targetSpan / span : 1.0;

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (positions[i * 3] - cx) * normScale;
      positions[i * 3 + 1] = (positions[i * 3 + 1] - minY) * normScale;
      positions[i * 3 + 2] = (positions[i * 3 + 2] - cz) * normScale;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      map: this._discTex,
      size: this.pointSize,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      alphaTest: 0.08,
      depthWrite: true,
    });

    this.pointsMesh = new THREE.Points(geo, mat);
    this.pointsMesh.frustumCulled = false;
    this.group.add(this.pointsMesh);
    this.splatCount = count;
    this.scanName = name;
    this.applyTransform();
    return { count, name };
  }

  applyTransform() {
    if (!this.pointsMesh) return;
    const gy = this.terrainEngine ? this.terrainEngine.getHeight(0, 0) : 0;
    this.group.position.set(0, gy + this.offsetY, 0);
    this.group.rotation.y = this.rotY;
    this.group.scale.setScalar(this.scale);
    this.pointsMesh.material.size = this.pointSize;
  }

  async loadFile(file) {
    const buf = await file.arrayBuffer();
    const lower = (file.name || '').toLowerCase();
    if (lower.endsWith('.splat')) {
      return this.parseSplatBinary(buf, file.name);
    }
    if (lower.endsWith('.ply')) {
      return this.parsePly(buf, file.name);
    }
    throw new Error('Drop a SuperSplat .splat or 3DGS .ply file.');
  }

  parseSplatBinary(arrayBuffer, name = 'scan.splat') {
    const stride = 32;
    const total = Math.floor(arrayBuffer.byteLength / stride);
    const maxPts = 220000;
    const step = Math.max(1, Math.ceil(total / maxPts));
    const outCount = Math.floor(total / step);
    const positions = new Float32Array(outCount * 3);
    const colors = new Float32Array(outCount * 3);
    const f32 = new Float32Array(arrayBuffer);
    const u8 = new Uint8Array(arrayBuffer);

    let k = 0;
    for (let i = 0; i < total && k < outCount; i += step) {
      const fIdx = i * 8;
      const bIdx = i * 32;
      const alpha = u8[bIdx + 27] / 255;
      if (alpha < 0.08) continue;
      positions[k * 3] = f32[fIdx];
      positions[k * 3 + 1] = -f32[fIdx + 1]; // SuperSplat/OpenCV Y-down -> Three.js Y-up
      positions[k * 3 + 2] = -f32[fIdx + 2];
      colors[k * 3] = u8[bIdx + 24] / 255;
      colors[k * 3 + 1] = u8[bIdx + 25] / 255;
      colors[k * 3 + 2] = u8[bIdx + 26] / 255;
      k++;
    }
    return this._commitSplatCloud(positions.subarray(0, k * 3), colors.subarray(0, k * 3), name);
  }

  parsePly(arrayBuffer, name = 'scan.ply') {
    const headerBytes = new Uint8Array(arrayBuffer, 0, Math.min(8192, arrayBuffer.byteLength));
    const headerText = new TextDecoder().decode(headerBytes);
    const endMarker = 'end_header\n';
    const endIdx = headerText.indexOf(endMarker);
    if (endIdx < 0) throw new Error('Invalid PLY header.');
    const header = headerText.slice(0, endIdx);
    const dataOffset = endIdx + endMarker.length;

    const lines = header.split(/\r?\n/);
    let isBinary = false;
    let vertexCount = 0;
    const props = [];
    let inVertex = false;

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts[0] === 'format' && parts[1] === 'binary_little_endian') isBinary = true;
      if (parts[0] === 'element') {
        inVertex = parts[1] === 'vertex';
        if (inVertex) vertexCount = parseInt(parts[2], 10) || 0;
      }
      if (inVertex && parts[0] === 'property') {
        props.push({ type: parts[1], name: parts[2] });
      }
    }

    const typeSize = (t) => (t === 'double' ? 8 : t === 'float' || t === 'int' || t === 'uint' ? 4 : t === 'short' || t === 'ushort' ? 2 : 1);
    let stride = 0;
    const offsets = {};
    for (const p of props) {
      offsets[p.name] = { off: stride, type: p.type };
      stride += typeSize(p.type);
    }

    const maxPts = 200000;
    const step = Math.max(1, Math.ceil(vertexCount / maxPts));
    const outCount = Math.floor(vertexCount / step);
    const positions = new Float32Array(outCount * 3);
    const colors = new Float32Array(outCount * 3);

    if (isBinary) {
      const dv = new DataView(arrayBuffer, dataOffset);
      const readVal = (base, meta) => {
        if (!meta) return 0;
        const o = base + meta.off;
        if (meta.type === 'float') return dv.getFloat32(o, true);
        if (meta.type === 'double') return dv.getFloat64(o, true);
        if (meta.type === 'uchar') return dv.getUint8(o);
        return 0;
      };
      const hasSH = Boolean(offsets.f_dc_0);
      const hasRGB = Boolean(offsets.red);
      let k = 0;
      for (let i = 0; i < vertexCount && k < outCount; i += step) {
        const base = i * stride;
        positions[k * 3] = readVal(base, offsets.x);
        positions[k * 3 + 1] = -readVal(base, offsets.y);
        positions[k * 3 + 2] = -readVal(base, offsets.z);
        if (hasSH) {
          colors[k * 3] = Math.min(1, Math.max(0, 0.5 + SH_C0 * readVal(base, offsets.f_dc_0)));
          colors[k * 3 + 1] = Math.min(1, Math.max(0, 0.5 + SH_C0 * readVal(base, offsets.f_dc_1)));
          colors[k * 3 + 2] = Math.min(1, Math.max(0, 0.5 + SH_C0 * readVal(base, offsets.f_dc_2)));
        } else if (hasRGB) {
          colors[k * 3] = readVal(base, offsets.red) / 255;
          colors[k * 3 + 1] = readVal(base, offsets.green) / 255;
          colors[k * 3 + 2] = readVal(base, offsets.blue) / 255;
        } else {
          colors[k * 3] = 0.72; colors[k * 3 + 1] = 0.70; colors[k * 3 + 2] = 0.66;
        }
        k++;
      }
      return this._commitSplatCloud(positions.subarray(0, k * 3), colors.subarray(0, k * 3), name);
    }

    throw new Error('Please export binary .ply or .splat from SuperSplat.');
  }

  /** Instant 55,000-Gaussian Waiheke Coastal Stone Wall & Terrace demo scan */
  loadDemoScan() {
    const count = 55000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    let seed = 9182;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

    let k = 0;
    // 1. Scanned Auckland Basalt retaining wall & weathered coastal cliff bank behind site
    for (let i = 0; i < 35000; i++) {
      const x = (rand() - 0.5) * 24;
      const z = -12.5 - rand() * 3.8 + Math.sin(x * 0.32) * 1.4;
      const y = rand() * (3.2 + Math.sin(x * 0.45) * 0.8);
      positions[k * 3] = x;
      positions[k * 3 + 1] = y;
      positions[k * 3 + 2] = z;
      const moss = y > 2.3 ? 0.55 : 0.0;
      const v = 0.24 + rand() * 0.22;
      colors[k * 3] = v * (1 - moss) + 0.22 * moss;
      colors[k * 3 + 1] = v * (1 - moss) + 0.36 * moss;
      colors[k * 3 + 2] = (v + 0.02) * (1 - moss) + 0.18 * moss;
      k++;
    }
    // 2. Scanned weathered basalt garden pavers & gravel boundary context
    for (let i = 0; i < 20000; i++) {
      const a = rand() * Math.PI * 2;
      const r = 9.5 + rand() * 6.5;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = 0.04 + rand() * 0.22;
      positions[k * 3] = x;
      positions[k * 3 + 1] = y;
      positions[k * 3 + 2] = z;
      const g = 0.32 + rand() * 0.25;
      colors[k * 3] = g * 0.96;
      colors[k * 3 + 1] = g * 1.02;
      colors[k * 3 + 2] = g * 0.88;
      k++;
    }
    return this._commitSplatCloud(positions, colors, 'Waiheke Coastal Scan (55k Gaussians)', 26);
  }
}
