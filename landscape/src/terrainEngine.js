import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { readLayer, unpackHeights, heightAt } from '../../roof-solar/linz/ground.js';
import { toNZTM } from '../../roof-solar/linz/nztm.js';

export const NZ_TERRAIN_PRESETS = [
  {
    id: 'maunga',
    name: 'Auckland Maunga Terrace',
    subtitle: 'Sculptural volcanic terrace with level deck pad',
    lat: -36.85
  },
  {
    id: 'flat',
    name: 'Flat Courtyard',
    subtitle: 'Level urban NZ courtyard site (0°)',
    lat: -36.85
  },
  {
    id: 'waiheke',
    name: 'Waiheke Coastal Hillside',
    subtitle: 'Sweeping north-facing coastal slope',
    lat: -36.79
  },
  {
    id: 'otago',
    name: 'Central Otago Schist Bank',
    subtitle: 'Stepped alpine schist ridge & embankment',
    lat: -45.03
  }
];

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function hash2(ix, iz) {
  const n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise2D(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm2D(x, z) {
  return (
    valueNoise2D(x, z) * 0.60 +
    valueNoise2D(x * 2.03 + 11.4, z * 2.03 + 7.2) * 0.28 +
    valueNoise2D(x * 4.1 + 23.1, z * 4.1 + 19.7) * 0.12
  );
}

export class TerrainEngine {
  constructor(scene, terrainSize = 34, segments = 96) {
    this.scene = scene;
    this.terrainSize = terrainSize;
    this.segments = segments;
    this.gridDim = segments + 1;
    this.heights = new Float32Array(this.gridDim * this.gridDim);

    this.currentPresetId = 'maunga';
    this.siteLat = -36.85; // Auckland default
    this.siteLon = 174.76;
    this.siteLabel = 'Auckland Maunga Terrace (-36.85°S)';
    this.avgSlopeDeg = 0;
    this.maxSlopeDeg = 0;

    // 96x96 PlaneGeometry rotated onto XZ plane
    this.geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
    this.geometry.rotateX(-Math.PI * 0.5);

    // Overlay groups for LINZ parcels, extruded buildings, and imported GLB models
    this.parcelGroup = new THREE.Group();
    this.buildingGroup = new THREE.Group();
    this.importedGroup = new THREE.Group();
    this.scene.add(this.parcelGroup);
    this.scene.add(this.buildingGroup);
    this.scene.add(this.importedGroup);

    // Store raw polygon rings so we can re-project them if terrain changes
    this._parcelPolygons = [];   // Array<Array<{x, z}>>
    this._buildingPolygons = []; // Array<{ ring: Array<{x, z}>, height: number }>
    this._importedItems = [];    // Array<{ obj: THREE.Object3D, x, z, baseOffsetY }>

    this._gltfLoader = new GLTFLoader();
    MeshoptDecoder.ready.then(() => this._gltfLoader.setMeshoptDecoder(MeshoptDecoder)).catch(() => {});
    this._changeCallbacks = [];

    this.applyPreset('maunga', false);
  }

  onChange(fn) {
    this._changeCallbacks.push(fn);
  }

  _notifyChange() {
    for (const fn of this._changeCallbacks) fn();
  }

  // ── HEIGHTFIELD PRESETS ─────────────────────────────────────────────────────
  applyPreset(presetId, notify = true) {
    this.currentPresetId = presetId;
    const preset = NZ_TERRAIN_PRESETS.find(p => p.id === presetId) || NZ_TERRAIN_PRESETS[0];
    this.siteLat = preset.lat;
    this.siteLabel = `${preset.name} (${Math.abs(preset.lat).toFixed(2)}°S)`;

    const half = this.terrainSize * 0.5;
    const N = this.gridDim;

    for (let iz = 0; iz < N; iz++) {
      const wz = (iz / this.segments) * this.terrainSize - half;
      for (let ix = 0; ix < N; ix++) {
        const wx = (ix / this.segments) * this.terrainSize - half;
        let h = 0;

        if (presetId === 'flat') {
          h = 0;
        } else if (presetId === 'maunga') {
          // Subtle sculptural Auckland volcanic terrace:
          // Level courtyard pad around the Kwila deck (-6.5, -7.8), gentle sculptural rise to the right & rear-right
          const baseSlope = (-wz * 0.045) + (wx * 0.032);
          const mound = Math.exp(-((wx - 4.2) * (wx - 4.2) + (wz + 1.2) * (wz + 1.2)) / 42.0) * 0.68;
          const micro = (fbm2D(wx * 0.09 + 3.1, wz * 0.09 + 1.7) - 0.5) * 0.24;
          h = baseSlope + mound + micro;
          // Gently flatten around the architectural deck pad (-6.5, -7.8)
          const deckDist = Math.hypot((wx + 6.5) * 0.72, (wz + 7.8) * 1.15);
          const padMask = 1.0 - smoothstep(3.8, 7.6, deckDist);
          h = h * (1.0 - padMask * 0.88) + 0.12 * (padMask * 0.88);
        } else if (presetId === 'waiheke') {
          // Sweeping Waiheke Island coastal hillside sloping down toward the foreground (+Z)
          const slope = (-wz * 0.24) + (wx * 0.075);
          const ridge = Math.sin(wx * 0.16 + 0.6) * 0.42 + Math.cos(wz * 0.13) * 0.28;
          const detail = (fbm2D(wx * 0.11 + 8.4, wz * 0.11 + 4.2) - 0.5) * 0.52;
          h = slope + ridge + detail + 0.35;
        } else if (presetId === 'otago') {
          // Central Otago terraced schist embankment with crisp stepped contours
          const raw = (-wz * 0.19) + (wx * 0.11) + (fbm2D(wx * 0.12 + 15.0, wz * 0.12 + 2.5) - 0.5) * 0.65;
          // Soft terracing steps
          const stepSize = 0.85;
          const s = raw / stepSize;
          const fl = Math.floor(s);
          const fr = s - fl;
          const terraced = (fl + smoothstep(0.28, 0.72, fr)) * stepSize;
          h = terraced * 0.78 + raw * 0.22 + 0.15;
        }

        this.heights[iz * N + ix] = h;
      }
    }

    // Re-center height around (0, 0) = ~0.0 so camera target stays nicely framed
    const centerH = this.getHeight(0, 0);
    for (let i = 0; i < this.heights.length; i++) {
      this.heights[i] -= centerH;
    }

    this._commitGeometry();
    if (notify) this._notifyChange();
  }

  // ── BILINEAR HEIGHT & NORMAL SAMPLING ───────────────────────────────────────
  getHeight(x, z) {
    const half = this.terrainSize * 0.5;
    const u = Math.max(0, Math.min(1, (x + half) / this.terrainSize));
    const v = Math.max(0, Math.min(1, (z + half) / this.terrainSize));
    const gx = u * this.segments;
    const gz = v * this.segments;
    const x0 = Math.min(this.segments - 1, Math.floor(gx));
    const z0 = Math.min(this.segments - 1, Math.floor(gz));
    const fx = gx - x0;
    const fz = gz - z0;
    const N = this.gridDim;

    const h00 = this.heights[z0 * N + x0];
    const h10 = this.heights[z0 * N + x0 + 1];
    const h01 = this.heights[(z0 + 1) * N + x0];
    const h11 = this.heights[(z0 + 1) * N + x0 + 1];

    const h0 = h00 + (h10 - h00) * fx;
    const h1 = h01 + (h11 - h01) * fx;
    return h0 + (h1 - h0) * fz;
  }

  getNormal(x, z, target = new THREE.Vector3()) {
    const eps = this.terrainSize / this.segments;
    const hL = this.getHeight(x - eps, z);
    const hR = this.getHeight(x + eps, z);
    const hD = this.getHeight(x, z - eps);
    const hU = this.getHeight(x, z + eps);
    return target.set(hL - hR, 2 * eps, hD - hU).normalize();
  }

  _commitGeometry() {
    const pos = this.geometry.attributes.position;
    const N = this.gridDim;
    const step = this.terrainSize / this.segments;

    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) {
        const idx = iz * N + ix;
        pos.setY(idx, this.heights[idx]);
      }
    }
    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();

    // Compute live avgSlopeDeg & maxSlopeDeg across interior grid
    let sumSlope = 0;
    let maxSlope = 0;
    let count = 0;
    for (let iz = 1; iz < N - 1; iz++) {
      for (let ix = 1; ix < N - 1; ix++) {
        const dhdx = (this.heights[iz * N + (ix + 1)] - this.heights[iz * N + (ix - 1)]) / (2 * step);
        const dhdz = (this.heights[(iz + 1) * N + ix] - this.heights[(iz - 1) * N + ix]) / (2 * step);
        const grad = Math.hypot(dhdx, dhdz);
        const deg = Math.atan(grad) * (180 / Math.PI);
        sumSlope += deg;
        if (deg > maxSlope) maxSlope = deg;
        count++;
      }
    }
    this.avgSlopeDeg = count > 0 ? sumSlope / count : 0;
    this.maxSlopeDeg = maxSlope;

    // Re-project LINZ parcels, buildings, and imported GLBs onto updated terrain
    this._rebuildParcelMeshes();
    this._rebuildBuildingMeshes();
    this._regroundImportedModels();
  }

  // ── NZ ADDRESS GEOCODER + OPEN-METEO 5x5 DEM + LINZ WFS LOADER ──────────────
  async loadNZAddress(addressQuery, linzApiKey = '', onStatus = () => {}) {
    const q = (addressQuery || '').trim();
    if (!q) throw new Error('Enter a New Zealand address (e.g. "28 Ocean View Rd, Waiheke").');

    onStatus('Geocoding NZ address…');
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=nz&limit=1&q=${encodeURIComponent(q)}`;
    const nomResp = await fetch(nomUrl, { headers: { Accept: 'application/json' } });
    if (!nomResp.ok) throw new Error(`Nominatim geocoder error (${nomResp.status})`);
    const nomData = await nomResp.json();
    if (!nomData || nomData.length === 0) {
      throw new Error('NZ address not found. Try including suburb or city.');
    }

    const lat = parseFloat(nomData[0].lat);
    const lon = parseFloat(nomData[0].lon);
    const displayName = (nomData[0].display_name || q).split(',').slice(0, 2).join(', ');

    this.siteLat = lat;
    this.siteLon = lon;
    this.siteLabel = `${displayName} (${Math.abs(lat).toFixed(2)}°S)`;

    // Fetch 5x5 real elevation grid over 34m x 34m site via Open-Meteo Elevation API
    onStatus('Fetching 5×5 NZ elevation DEM…');
    const mPerDegLat = 111320;
    const mPerDegLon = 111320 * Math.cos(lat * Math.PI / 180);
    const halfSpan = this.terrainSize * 0.5;
    const gridN = 5;
    const lats = [];
    const lons = [];

    for (let gz = 0; gz < gridN; gz++) {
      // North is -Z in our Three.js scene
      const wz = (gz / (gridN - 1)) * this.terrainSize - halfSpan;
      const sampleLat = lat - wz / mPerDegLat;
      for (let gx = 0; gx < gridN; gx++) {
        const wx = (gx / (gridN - 1)) * this.terrainSize - halfSpan;
        const sampleLon = lon + wx / mPerDegLon;
        lats.push(sampleLat.toFixed(6));
        lons.push(sampleLon.toFixed(6));
      }
    }

    const elevUrl = `https://api.open-meteo.com/v1/elevation?latitude=${lats.join(',')}&longitude=${lons.join(',')}`;
    const elevResp = await fetch(elevUrl);
    if (!elevResp.ok) throw new Error(`Open-Meteo Elevation API error (${elevResp.status})`);
    const elevJson = await elevResp.json();
    const samples = elevJson.elevation || [];

    if (samples.length === 25) {
      const centerElev = samples[12];
      // Smoothly interpolate 5x5 elevation grid onto 96x96 terrain heightfield
      const N = this.gridDim;
      for (let iz = 0; iz < N; iz++) {
        const v = (iz / this.segments) * (gridN - 1);
        const z0 = Math.min(gridN - 2, Math.floor(v));
        const fz = smoothstep(0, 1, v - z0);
        for (let ix = 0; ix < N; ix++) {
          const u = (ix / this.segments) * (gridN - 1);
          const x0 = Math.min(gridN - 2, Math.floor(u));
          const fx = smoothstep(0, 1, u - x0);

          const e00 = samples[z0 * gridN + x0] - centerElev;
          const e10 = samples[z0 * gridN + x0 + 1] - centerElev;
          const e01 = samples[(z0 + 1) * gridN + x0] - centerElev;
          const e11 = samples[(z0 + 1) * gridN + x0 + 1] - centerElev;
          const e0 = e00 + (e10 - e00) * fx;
          const e1 = e01 + (e11 - e01) * fx;
          this.heights[iz * N + ix] = e0 + (e1 - e0) * fz;
        }
      }
      this.currentPresetId = 'custom-dem';
      this._commitGeometry();
    }

    let linzStatus = '';
    let linzSource = 'none';
    const key = (linzApiKey || '').trim();
    try {
      onStatus('Querying LINZ Parcels (50772) & Buildings (101290)…');
      const linzRes = await this._fetchLINZWFS(lat, lon, key);
      linzSource = linzRes.source;
      if (linzRes.source === 'cloudflare') {
        linzStatus = 'Live LINZ Parcel + Buildings via Cloudflare';
      } else if (linzRes.source === 'direct') {
        linzStatus = `LINZ: ${linzRes.parcels} parcel${linzRes.parcels === 1 ? '' : 's'}, ${linzRes.buildings} building${linzRes.buildings === 1 ? '' : 's'}`;
      } else {
        linzStatus = 'Elevation loaded — add LINZ key or deploy on Cloudflare';
      }
      onStatus(linzStatus);
    } catch (err) {
      console.warn('LINZ WFS fetch warning:', err);
      linzStatus = 'Elevation loaded — add LINZ key or deploy on Cloudflare';
      onStatus(linzStatus);
    }

    this._notifyChange();
    return {
      lat,
      lon,
      label: this.siteLabel,
      avgSlopeDeg: this.avgSlopeDeg,
      maxSlopeDeg: this.maxSlopeDeg,
      linzSource,
      linzStatus,
      summary: `${displayName} (${this.avgSlopeDeg.toFixed(1)}° avg slope) · ${linzStatus}`
    };
  }

  // Public alias supporting fetchNZAddressSite(query, linzApiKey = '')
  async fetchNZAddressSite(query, linzApiKey = '', onStatus = () => {}) {
    return this.loadNZAddress(query, linzApiKey, onStatus);
  }

  async _fetchLINZWFS(lat, lon, apiKey = '') {
    const mPerDegLat = 111320;
    const mPerDegLon = 111320 * Math.cos(lat * Math.PI / 180);
    const pad = this.terrainSize * 0.55;
    const dLat = pad / mPerDegLat;
    const dLon = pad / mPerDegLon;
    const bbox = `${(lon - dLon).toFixed(6)},${(lat - dLat).toFixed(6)},${(lon + dLon).toFixed(6)},${(lat + dLat).toFixed(6)},EPSG:4326`;

    const isHttp = typeof window !== 'undefined' &&
      window.location &&
      (window.location.protocol === 'http:' || window.location.protocol === 'https:');

    let parcelGeo = null;
    let bldgGeo = null;
    let source = 'none';

    // 1. Always attempt Cloudflare Pages Function proxy FIRST when running over http:/https:
    if (isHttp) {
      try {
        const [pResp, bResp] = await Promise.allSettled([
          fetch(`/api/linz?layer=50772&bbox=${encodeURIComponent(bbox)}`),
          fetch(`/api/linz?layer=101290&bbox=${encodeURIComponent(bbox)}`)
        ]);

        let proxySucceeded = false;
        if (pResp.status === 'fulfilled' && pResp.value.ok) {
          const ct = pResp.value.headers.get('content-type') || '';
          if (ct.includes('json')) {
            parcelGeo = await pResp.value.json();
            proxySucceeded = true;
          }
        }
        if (bResp.status === 'fulfilled' && bResp.value.ok) {
          const ct = bResp.value.headers.get('content-type') || '';
          if (ct.includes('json')) {
            bldgGeo = await bResp.value.json();
            proxySucceeded = true;
          }
        }
        if (proxySucceeded) {
          source = 'cloudflare';
        }
      } catch {
        // Proxy unavailable (e.g., local Vite dev server without Cloudflare Pages Functions)
      }
    }

    // 2. Fallback to direct LINZ WFS if /api/linz was unavailable or non-OK AND linzApiKey is provided
    const key = (apiKey || '').trim();
    if (source === 'none' && key) {
      const base = `https://data.linz.govt.nz/services;key=${encodeURIComponent(key)}/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&srsName=EPSG:4326&bbox=${bbox}`;
      const [parcelResp, bldgResp] = await Promise.allSettled([
        fetch(`${base}&typeNames=layer-50772&count=8`),
        fetch(`${base}&typeNames=layer-101290&count=12`)
      ]);

      let directSucceeded = false;
      if (parcelResp.status === 'fulfilled' && parcelResp.value.ok) {
        parcelGeo = await parcelResp.value.json();
        directSucceeded = true;
      }
      if (bldgResp.status === 'fulfilled' && bldgResp.value.ok) {
        bldgGeo = await bldgResp.value.json();
        directSucceeded = true;
      }
      if (directSucceeded) {
        source = 'direct';
      }
    }

    this._parcelPolygons = [];
    this._buildingPolygons = [];

    if (parcelGeo) {
      const rings = this._extractRingsFromGeoJSON(parcelGeo, { originLon: lon, originLat: lat, isWGS84: true });
      this._parcelPolygons.push(...rings);
    }

    if (bldgGeo) {
      const rings = this._extractRingsFromGeoJSON(bldgGeo, { originLon: lon, originLat: lat, isWGS84: true });
      for (const ring of rings) {
        this._buildingPolygons.push({ ring, height: 3.4 });
      }
    }

    this._rebuildParcelMeshes();
    this._rebuildBuildingMeshes();
    return { parcels: this._parcelPolygons.length, buildings: this._buildingPolygons.length, source };
  }

  // ── LOCAL LINZ PARCEL GEOJSON IMPORTER (WGS84 & NZTM2000) ───────────────────
  importGeoJSON(geojsonText) {
    const geo = typeof geojsonText === 'string' ? JSON.parse(geojsonText) : geojsonText;
    const rawRings = [];

    const collectCoords = (geom) => {
      if (!geom) return;
      if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
        rawRings.push(geom.coordinates[0]);
      } else if (geom.type === 'MultiPolygon' && geom.coordinates) {
        for (const poly of geom.coordinates) {
          if (poly[0]) rawRings.push(poly[0]);
        }
      } else if (geom.type === 'LineString' && geom.coordinates) {
        rawRings.push(geom.coordinates);
      }
    };

    if (geo.type === 'FeatureCollection' && Array.isArray(geo.features)) {
      for (const f of geo.features) collectCoords(f.geometry);
    } else if (geo.type === 'Feature') {
      collectCoords(geo.geometry);
    } else {
      collectCoords(geo);
    }

    if (rawRings.length === 0) {
      throw new Error('No Polygon or LineString features found in GeoJSON.');
    }

    // Auto-detect NZTM2000 (EPSG:2193 metres) vs WGS84 (degrees)
    const samplePt = rawRings[0][0];
    const isNZTM = Math.abs(samplePt[0]) > 180 || Math.abs(samplePt[1]) > 90;

    // Compute centroid across all vertices
    let sumX = 0, sumY = 0, totalPts = 0;
    for (const r of rawRings) {
      for (const pt of r) {
        sumX += pt[0];
        sumY += pt[1];
        totalPts++;
      }
    }
    const cx = sumX / totalPts;
    const cy = sumY / totalPts;

    const mPerDegLat = 111320;
    const mPerDegLon = isNZTM ? 1.0 : 111320 * Math.cos(cy * Math.PI / 180);

    // Project to local metres (North = -Z, East = +X)
    let localRings = rawRings.map(r => r.map(pt => {
      if (isNZTM) {
        return { x: pt[0] - cx, z: -(pt[1] - cy) };
      }
      return {
        x: (pt[0] - cx) * mPerDegLon,
        z: -(pt[1] - cy) * mPerDegLat
      };
    }));

    // If parcel exceeds site bounds, fit nicely inside 30m x 30m
    let maxExtent = 0;
    for (const r of localRings) {
      for (const p of r) {
        maxExtent = Math.max(maxExtent, Math.abs(p.x), Math.abs(p.z));
      }
    }
    const maxAllowed = this.terrainSize * 0.45;
    let scale = 1.0;
    if (maxExtent > maxAllowed && maxExtent > 0.01) {
      scale = maxAllowed / maxExtent;
      localRings = localRings.map(r => r.map(p => ({ x: p.x * scale, z: p.z * scale })));
    }

    this._parcelPolygons = localRings;
    this._rebuildParcelMeshes();
    return {
      count: localRings.length,
      crs: isNZTM ? 'NZTM2000 (EPSG:2193)' : 'WGS84 (EPSG:4326)',
      scaled: scale < 0.999 ? scale : 1.0
    };
  }

  _extractRingsFromGeoJSON(geo, { originLon, originLat, isWGS84 }) {
    const rings = [];
    const mPerDegLat = 111320;
    const mPerDegLon = 111320 * Math.cos(originLat * Math.PI / 180);
    const project = (pt) => isWGS84
      ? { x: (pt[0] - originLon) * mPerDegLon, z: -(pt[1] - originLat) * mPerDegLat }
      : { x: pt[0] - originLon, z: -(pt[1] - originLat) };

    const features = geo.type === 'FeatureCollection' ? (geo.features || []) : [geo];
    for (const f of features) {
      const g = f.geometry || f;
      if (!g) continue;
      if (g.type === 'Polygon' && g.coordinates[0]) {
        rings.push(g.coordinates[0].map(project));
      } else if (g.type === 'MultiPolygon') {
        for (const poly of g.coordinates) {
          if (poly[0]) rings.push(poly[0].map(project));
        }
      }
    }
    return rings;
  }

  _rebuildParcelMeshes() {
    while (this.parcelGroup.children.length) {
      const c = this.parcelGroup.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    if (this._parcelPolygons.length === 0) return;

    const lineMat = new THREE.LineBasicMaterial({ color: 0xfbbf24 });
    const postGeom = new THREE.CylinderGeometry(0.055, 0.055, 0.55, 8);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, emissive: 0x78350f, emissiveIntensity: 0.35, roughness: 0.4
    });

    for (const ring of this._parcelPolygons) {
      if (ring.length < 2) continue;
      const pts3 = [];
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        const segLen = Math.hypot(b.x - a.x, b.z - a.z);
        const steps = Math.max(2, Math.min(24, Math.ceil(segLen / 0.8)));
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          const wx = a.x + (b.x - a.x) * t;
          const wz = a.z + (b.z - a.z) * t;
          const wy = this.getHeight(wx, wz) + 0.08;
          pts3.push(new THREE.Vector3(wx, wy, wz));
        }
        // Boundary survey peg at corners
        if (Math.abs(a.x) <= this.terrainSize * 0.52 && Math.abs(a.z) <= this.terrainSize * 0.52) {
          const peg = new THREE.Mesh(postGeom, postMat);
          peg.position.set(a.x, this.getHeight(a.x, a.z) + 0.24, a.z);
          this.parcelGroup.add(peg);
        }
      }
      if (pts3.length >= 2) {
        pts3.push(pts3[0].clone());
        const geom = new THREE.BufferGeometry().setFromPoints(pts3);
        this.parcelGroup.add(new THREE.Line(geom, lineMat));
      }
    }
  }

  _rebuildBuildingMeshes() {
    while (this.buildingGroup.children.length) {
      const c = this.buildingGroup.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    if (this._buildingPolygons.length === 0) return;

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xd8dce0, roughness: 0.82, metalness: 0.04, transparent: true, opacity: 0.90
    });

    for (const b of this._buildingPolygons) {
      const ring = b.ring;
      if (ring.length < 3) continue;
      let minH = Infinity;
      for (const p of ring) {
        minH = Math.min(minH, this.getHeight(p.x, p.z));
      }
      const shape = new THREE.Shape();
      shape.moveTo(ring[0].x, -ring[0].z);
      for (let i = 1; i < ring.length; i++) {
        shape.lineTo(ring[i].x, -ring[i].z);
      }
      shape.closePath();

      const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
        depth: b.height + 0.6,
        bevelEnabled: false
      });
      extrudeGeo.rotateX(-Math.PI * 0.5);
      const mesh = new THREE.Mesh(extrudeGeo, wallMat);
      mesh.position.y = minH - 0.5;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.buildingGroup.add(mesh);
    }
  }

  // ── CUSTOM 3D MODEL IMPORTER (.GLB / .GLTF) ─────────────────────────────────
  importGLBArrayBuffer(arrayBuffer, filename = 'model.glb', targetX = 0, targetZ = 0) {
    return new Promise((resolve, reject) => {
      this._gltfLoader.parse(arrayBuffer, '', (gltf) => {
        const root = gltf.scene || gltf.scenes[0];
        if (!root) {
          reject(new Error('GLB contains no scene.'));
          return;
        }
        // Normalize oversized models softly if > 16m, keep realistic architectural scale otherwise
        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 18) {
          root.scale.multiplyScalar(10 / maxDim);
        }
        root.updateMatrixWorld(true);
        const box2 = new THREE.Box3().setFromObject(root);
        const baseOffsetY = -box2.min.y;

        root.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        const ty = this.getHeight(targetX, targetZ);
        root.position.set(targetX, ty + baseOffsetY - 0.02, targetZ);
        this.importedGroup.add(root);
        this._importedItems.push({ obj: root, x: targetX, z: targetZ, baseOffsetY });
        resolve({ filename, size });
      }, (err) => {
        reject(err || new Error('Failed to parse GLB file.'));
      });
    });
  }

  _regroundImportedModels() {
    for (const item of this._importedItems) {
      const ty = this.getHeight(item.x, item.z);
      item.obj.position.y = ty + item.baseOffsetY - 0.02;
    }
  }

  clearOverlays() {
    this._parcelPolygons = [];
    this._buildingPolygons = [];
    this._rebuildParcelMeshes();
    this._rebuildBuildingMeshes();
    while (this.importedGroup.children.length) {
      this.importedGroup.remove(this.importedGroup.children[0]);
    }
    this._importedItems = [];
  }

  async loadKeylessNZSite(addressQuery, coordsOverride = null) {
    let lat = coordsOverride?.lat ?? null;
    let lon = coordsOverride?.lon ?? null;
    let displayName = coordsOverride?.label || addressQuery || "Aotearoa Site";

    if (lat == null || lon == null) {
      const q = (addressQuery || "").trim();
      if (!q) throw new Error("Enter a New Zealand address.");
      try {
        const res = await fetch(`/api/live/?feeds=address&q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          const hit = data?.feeds?.address?.results?.[0] || data?.results?.[0];
          if (hit && Number.isFinite(Number(hit.lat)) && Number.isFinite(Number(hit.lon))) {
            lat = Number(hit.lat);
            lon = Number(hit.lon);
            displayName = hit.label || hit.address || q;
          }
        }
      } catch {}
    }

    if (lat == null || lon == null) {
      // Fallback to original Nominatim geocoder in fetchNZAddressSite
      return this.fetchNZAddressSite(addressQuery, "");
    }

    this.siteLat = lat;
    this.siteLon = lon;
    this.siteLabel = `${displayName.split(",").slice(0, 2).join(",")} (${Math.abs(lat).toFixed(2)}°S)`;

    let parcelCount = 0;
    let buildingCount = 0;
    let zoneLabel = "";
    let parcelAreaM2 = 900;
    let lidarUsed = false;

    // 1. Keyless /api/live/?feeds=site,footprint
    try {
      const liveRes = await fetch(`/api/live/?feeds=site,footprint&lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}`);
      if (liveRes.ok) {
        const liveData = await liveRes.json();
        const siteFeed = liveData?.feeds?.site;
        const fpFeed = liveData?.feeds?.footprint;
        if (siteFeed?.parcel?.outline) {
          const geo = siteFeed.parcel.outline.type === "FeatureCollection"
            ? siteFeed.parcel.outline
            : { type: "Feature", geometry: siteFeed.parcel.outline };
          this._parcelPolygons = this._extractRingsFromGeoJSON(geo, { originLon: lon, originLat: lat, isWGS84: true });
          parcelCount = this._parcelPolygons.length;
        }
        if (siteFeed?.parcel?.areaM2) parcelAreaM2 = Number(siteFeed.parcel.areaM2);
        if (siteFeed?.zone?.name) zoneLabel = siteFeed.zone.name;
        const bList = fpFeed?.buildings || fpFeed?.features || [];
        if (Array.isArray(bList) && bList.length > 0) {
          const fc = fpFeed?.type === "FeatureCollection"
            ? fpFeed
            : {
                type: "FeatureCollection",
                features: bList
                  .filter(b => b?.geometry || b?.outline)
                  .map(b => b.type === "Feature" ? b : { type: "Feature", geometry: b.geometry || b.outline })
              };
          const rings = this._extractRingsFromGeoJSON(fc, { originLon: lon, originLat: lat, isWGS84: true });
          this._buildingPolygons = rings.map(ring => ({ ring, height: 4.2 }));
          buildingCount = this._buildingPolygons.length;
        }
      }
    } catch {}

    // 2. Keyless browser-direct 1 m LINZ LiDAR ground elevation
    try {
      const nztm = toNZTM(lat, lon);
      const half = this.terrainSize * 0.5;
      const box = {
        minX: nztm.e - half - 4, maxX: nztm.e + half + 4,
        minY: nztm.n - half - 4, maxY: nztm.n + half + 4
      };
      const layer = await readLayer("ground", box);
      if (layer && layer.tiles && layer.tiles.length > 0) {
        const unpacked = unpackHeights(layer);
        const N = this.gridDim;
        let validSamples = 0;
        let sumH = 0;
        const raw = new Float32Array(N * N);
        for (let iz = 0; iz < N; iz++) {
          const wz = (iz / this.segments) * this.terrainSize - half;
          for (let ix = 0; ix < N; ix++) {
            const wx = (ix / this.segments) * this.terrainSize - half;
            const h = heightAt(unpacked, nztm.e + wx, nztm.n - wz);
            if (Number.isFinite(h)) {
              raw[iz * N + ix] = h;
              sumH += h;
              validSamples++;
            } else {
              raw[iz * N + ix] = NaN;
            }
          }
        }
        if (validSamples > (N * N) * 0.4) {
          const meanH = sumH / validSamples;
          for (let i = 0; i < raw.length; i++) {
            this.heights[i] = Number.isFinite(raw[i]) ? (raw[i] - meanH) : 0;
          }
          lidarUsed = true;
          this._commitGeometry();
        }
      }
    } catch {}

    this._rebuildParcelMeshes();
    this._rebuildBuildingMeshes();
    this._regroundImportedModels();
    this._notifyChange();
    return {
      lat, lon, displayName, parcelCount, buildingCount,
      zoneLabel, parcelAreaM2, lidarUsed,
      source: lidarUsed ? "Keyless LINZ 1 m LiDAR + /api/live" : "Keyless LINZ /api/live"
    };
  }
}
