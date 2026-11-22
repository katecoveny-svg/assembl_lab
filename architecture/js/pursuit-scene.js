// Pursuit studio: the site in 3D, for the pack. The neighbouring buildings from LINZ's building outlines, extruded to a height
// the practice sets (the outlines carry no heights, so every height here is assumed and the scene says so), the land parcel
// from LINZ's primary parcels, north, a scale bar, and one massing block the practice sizes and moves, labelled
// "Massing study, not a design". Drawn with the lab's own three.js r170 (/assets/vendor/three/), WebGL, on demand only.
//
//   siteQuery(point)                 the lab's live feed address for one point: footprint and site facts together (key-less)
//   sceneData(answer, point)         the feed's answer as local metres: { buildings: [{ ring, area, onSite }], parcel, radius, credit, asOf }
//   mountScene(host, o)              a live view: drag to turn, wheel or buttons to zoom. -> { setMassing, setAround, view, still, stop }
//   renderStill(o)                   one PNG, drawn off-screen and released at once (for the pack)
//
// Nothing is sent anywhere but the point to the lab's own feed (as the Site tab already does, see facts.js), and nothing is kept
// but what the practice saves: the point, the place line and the massing sizes.

const THREE_URL = new URL('../../assets/vendor/three/three.module.min.js', import.meta.url).href;
let three = null;
const loadThree = async () => (three ??= await import(THREE_URL));

export const FEED = '/api/live/';
export const RADIUS = 110;
export const CREDIT = 'Building outlines and the parcel boundary: LINZ Data Service, licensed for reuse under CC BY 4.0.';
export const siteQuery = ({ lat, lon }) => `${FEED}?feeds=footprint,site&lat=${(+lat).toFixed(5)}&lon=${(+lon).toFixed(5)}&radius=${RADIUS}`;

// ---- the pure part: lon/lat to metres -----------------------------------------------------------------------------------------
/** metres east (x) and north (y) of the point, on a local flat frame (fine at the scale of one street) */
export function localFrame({ lat, lon }) {
  const kx = 111320 * Math.cos((lat * Math.PI) / 180), ky = 110540;
  return (lo, la) => [(lo - lon) * kx, (la - lat) * ky];
}
/** the outer rings of a GeoJSON Polygon or MultiPolygon, in lon/lat */
export function outerRings(g) {
  if (!g) return [];
  if (g.type === 'Polygon') return g.coordinates?.[0] ? [g.coordinates[0]] : [];
  if (g.type === 'MultiPolygon') return (g.coordinates ?? []).map((p) => p?.[0]).filter(Boolean);
  return [];
}
const area = (ring) => { let a = 0; for (let i = 0; i < ring.length; i++) { const [x0, y0] = ring[i], [x1, y1] = ring[(i + 1) % ring.length]; a += x0 * y1 - x1 * y0; } return Math.abs(a) / 2; };
export function inside([x, y], ring) {
  let ok = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ok = !ok; }
  return ok;
}
const centroid = (ring) => [ring.reduce((a, p) => a + p[0], 0) / ring.length, ring.reduce((a, p) => a + p[1], 0) / ring.length];
const open = (ring) => (ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring.slice(0, -1) : ring);

/** The feed's answer (feeds.footprint and feeds.site) as local metres around the point. Missing parts come back empty, never guessed. */
export function sceneData(answer, point) {
  const to = localFrame(point), f = answer?.feeds ?? {};
  const fp = f.footprint && !f.footprint.error ? f.footprint : null, site = f.site && !f.site.error ? f.site : null;
  const parcelFact = site?.facts?.parcel;
  const parcelRing = outerRings(parcelFact?.values?.outline)[0];
  const parcel = parcelRing ? open(parcelRing.map(([lo, la]) => to(lo, la))) : null;
  const buildings = [];
  for (const feat of fp?.values?.geojson?.features ?? []) for (const r of outerRings(feat.geometry)) {
    const ring = open(r.map(([lo, la]) => to(lo, la)));
    if (ring.length < 3) continue;
    buildings.push({ ring, area: Math.round(area(ring)), onSite: !!parcel && inside(centroid(ring), parcel) });
  }
  const far = [...buildings.flatMap((b) => b.ring), ...(parcel ?? [])].reduce((m, [x, y]) => Math.max(m, Math.hypot(x, y)), 0);
  const focus = parcel ? parcel.reduce((m, [x, y]) => Math.max(m, Math.hypot(x, y)), 0) : 25;
  return {
    buildings, parcel, radius: Math.max(40, Math.min(RADIUS + 20, far || 60)), focus: Math.max(15, Math.min(RADIUS, focus)),
    parcelArea: parcelFact?.values?.calcAreaM2 ?? null, asOf: fp?.asOf ?? null, count: buildings.length,
    problems: [!fp ? 'The building outlines did not come back.' : '', !parcel ? 'No parcel boundary came back for this point.' : ''].filter(Boolean),
  };
}

/** ask the lab's feed for the point; throws a plain sentence when it cannot answer */
export async function fetchSceneData(point, fetchImpl = globalThis.fetch, ms = 45000) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetchImpl(siteQuery(point), { headers: { accept: 'application/json' }, signal: ac.signal });
    if (!r.ok) throw new Error(`The lab's map feed answered ${r.status}. Try again in a minute.`);
    return sceneData(await r.json(), point);
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('The map feed took too long to answer. Try again in a minute.');
    throw e;
  } finally { clearTimeout(t); }
}

export function webglOk() {
  try { const c = globalThis.document?.createElement('canvas'); const gl = c?.getContext('webgl2') ?? c?.getContext('webgl'); if (!gl) return false; gl.getExtension('WEBGL_lose_context')?.loseContext(); return true; } catch { return false; }
}

// ---- the look ----------------------------------------------------------------------------------------------------------------
export const LOOKS = {
  assembl: { ground: '#FFFDFB', grid: '#654A4E', gridA: 0.09, fill: '#F6F0F1', onSite: '#EDE3E5', edge: '#654A4E', parcel: '#654A4E', parcelFill: '#E3D0D2', parcelA: 0.38, mass: '#E3D0D2', massEdge: '#240B21', massA: 0.94, ink: '#240B21', sun: 1.9, hemi: [0xffffff, 0xd9cfd1, 1.5] },
  sketch: { ground: '#000000', grid: '#2C3452', gridA: 0.55, fill: '#0A0C14', onSite: '#121A3A', edge: '#8BA2FF', parcel: '#5076FF', parcelFill: '#5076FF', parcelA: 0.14, mass: '#1B2A6B', massEdge: '#FFFFFF', massA: 0.9, ink: '#FFFFFF', sun: 1.2, hemi: [0xbcc8ff, 0x05070f, 1.1] },
};

function textSprite(T, text, { colour, size = 64, weight = 500, width = 14, back = null } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d'), font = `${weight} ${size}px "Instrument Sans", "Hanken Grotesk", system-ui, sans-serif`;
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + size, h = Math.ceil(size * 1.6);
  c.width = w; c.height = h;
  g.font = font; g.textBaseline = 'middle';
  if (back) { g.fillStyle = back; g.fillRect(0, 0, w, h); }
  g.fillStyle = colour; g.fillText(text, size / 2, h / 2);
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
  const m = new T.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const s = new T.Sprite(m); s.scale.set(width, (width * h) / w, 1); s.renderOrder = 10;
  return { sprite: s, dispose: () => { tex.dispose(); m.dispose(); } };
}

const niceBar = (r) => (r > 90 ? 50 : r > 45 ? 20 : 10);

/**
 * A live scene in host. o = { data (sceneData), massing: { w, d, h, x, z, turn, around }, look: 'assembl'|'sketch', label }.
 * Returns { setMassing(m), view(name), zoom(f), still(w, h) -> PNG data URL, stop() }.
 */
export async function mountScene(host, { data, massing, look = 'assembl', label = 'Massing study, not a design', spin = false } = {}) {
  const T = await loadThree(), L = LOOKS[look] ?? LOOKS.assembl, owned = [], R = data.radius;
  // the part to frame: the parcel and the block, with a margin of street around them
  const F = Math.max(22, Math.min(R, Math.max((data.focus ?? 25) * 1.3, (Math.hypot(massing.w, massing.d) / 2 + Math.hypot(massing.x, massing.z)) * 1.35)));
  const s = new T.Scene(); s.background = new T.Color(L.ground);
  const keep = (...o) => { owned.push(...o); return o[0]; };
  // ground, grid every 10 m
  const ground = new T.Mesh(keep(new T.PlaneGeometry(R * 4, R * 4).rotateX(-Math.PI / 2)), keep(new T.MeshLambertMaterial({ color: L.ground })));
  ground.receiveShadow = true; s.add(ground);
  const grid = new T.GridHelper(Math.ceil((R * 2.6) / 10) * 10, Math.ceil((R * 2.6) / 10), new T.Color(L.grid), new T.Color(L.grid));
  grid.material.transparent = true; grid.material.opacity = L.gridA; grid.position.y = 0.01; keep(grid.geometry, grid.material); s.add(grid);
  // the parcel: a tinted fill and a dashed boundary
  if (data.parcel) {
    const shape = new T.Shape(data.parcel.map(([x, y]) => new T.Vector2(x, y)));
    const fill = new T.Mesh(keep(new T.ShapeGeometry(shape).rotateX(-Math.PI / 2)), keep(new T.MeshBasicMaterial({ color: L.parcelFill, transparent: true, opacity: L.parcelA, depthWrite: false })));
    fill.position.y = 0.03; s.add(fill);
    const pts = [...data.parcel, data.parcel[0]].map(([x, y]) => new T.Vector3(x, 0.06, -y));
    const line = new T.Line(keep(new T.BufferGeometry().setFromPoints(pts)), keep(new T.LineDashedMaterial({ color: L.parcel, dashSize: 1.4, gapSize: 0.9 })));
    line.computeLineDistances(); s.add(line);
  }
  // the neighbours, extruded to the assumed height
  const hood = new T.Group(); s.add(hood);
  const edgeMat = keep(new T.LineBasicMaterial({ color: L.edge, transparent: look === 'sketch', opacity: look === 'sketch' ? 0.9 : 1 }));
  const fillMat = keep(new T.MeshLambertMaterial({ color: L.fill })), onSiteMat = keep(new T.MeshLambertMaterial({ color: L.onSite, transparent: true, opacity: 0.7 }));
  let hoodGeoms = [];
  const buildHood = (h) => {
    for (const g of hoodGeoms) g.dispose(); hoodGeoms = []; hood.clear();
    for (const b of data.buildings) {
      const shape = new T.Shape(b.ring.map(([x, y]) => new T.Vector2(x, y)));
      const g = new T.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2);
      const e = new T.EdgesGeometry(g, 25);
      hoodGeoms.push(g, e);
      const m = new T.Mesh(g, b.onSite ? onSiteMat : fillMat); m.castShadow = true; m.receiveShadow = true;
      hood.add(m, new T.LineSegments(e, edgeMat));
    }
  };
  // the massing block and its label
  const massMat = keep(new T.MeshLambertMaterial({ color: L.mass, transparent: L.massA < 1, opacity: L.massA })), massEdge = keep(new T.LineBasicMaterial({ color: L.massEdge }));
  const mass = new T.Group(); s.add(mass);
  let massGeoms = [];
  const tag = textSprite(T, label, { colour: L.ink, size: 64, weight: 500, width: Math.max(14, F * 0.62), back: look === 'sketch' ? 'rgba(0,0,0,0.72)' : 'rgba(255,253,251,0.86)' });
  owned.push({ dispose: tag.dispose }); s.add(tag.sprite);
  let M = { ...massing };
  const buildMass = (m) => {
    for (const g of massGeoms) g.dispose(); massGeoms = []; mass.clear();
    const g = new T.BoxGeometry(m.w, m.h, m.d), e = new T.EdgesGeometry(g); massGeoms.push(g, e);
    const mesh = new T.Mesh(g, massMat); mesh.castShadow = true;
    mass.add(mesh, new T.LineSegments(e, massEdge));
    mass.position.set(m.x, m.h / 2, -m.z); mass.rotation.y = (-m.turn * Math.PI) / 180;
    tag.sprite.position.set(m.x, m.h + Math.max(3, F * 0.12), -m.z);
  };
  // north and a scale bar, on the ground near the south-east and south-west corners
  const dirs = [];
  const north = new T.Group();
  const arrow = new T.Shape([new T.Vector2(0, 5.5), new T.Vector2(2.2, -2.5), new T.Vector2(0, -1.2), new T.Vector2(-2.2, -2.5)]);
  // north and the scale bar are map marks: drawn over everything, so a building never hides them
  const mark = (o) => { o.renderOrder = 9; if (o.material) { o.material.depthTest = false; o.material.transparent = true; } return o; };
  const ar = mark(new T.Mesh(keep(new T.ShapeGeometry(arrow).rotateX(-Math.PI / 2)), keep(new T.MeshBasicMaterial({ color: L.ink }))));
  ar.position.y = 0.08; north.add(ar);
  const nLab = textSprite(T, 'N', { colour: L.ink, size: 96, weight: 500, width: 5 }); owned.push({ dispose: nLab.dispose }); nLab.sprite.position.set(0, 0.8, -8.6); north.add(nLab.sprite);
  const k = F * 0.026 + 0.25; north.scale.set(k, k, k); north.position.set(F * 1.05, 0, F * 0.3); s.add(north); dirs.push(north);
  const barLen = niceBar(F * 1.1), bar = new T.Group();
  const bw = Math.max(0.6, F * 0.03);
  for (let i = 0; i < 2; i++) {
    const seg = mark(new T.Mesh(keep(new T.PlaneGeometry(barLen / 2, bw).rotateX(-Math.PI / 2)), keep(new T.MeshBasicMaterial({ color: i ? L.ground : L.ink }))));
    seg.position.set(barLen / 4 + (i * barLen) / 2, 0.08, 0); bar.add(seg);
  }
  const outline = mark(new T.LineLoop(keep(new T.BufferGeometry().setFromPoints([new T.Vector3(0, 0.09, -bw / 2), new T.Vector3(barLen, 0.09, -bw / 2), new T.Vector3(barLen, 0.09, bw / 2), new T.Vector3(0, 0.09, bw / 2)])), keep(new T.LineBasicMaterial({ color: L.ink }))));
  bar.add(outline);
  const bLab = textSprite(T, `${barLen} m`, { colour: L.ink, size: 72, width: Math.max(5, F * 0.2) }); owned.push({ dispose: bLab.dispose }); bLab.sprite.position.set(barLen / 2, 1.5, -bw * 2.6); bar.add(bLab.sprite);
  bar.position.set(-F * 0.62, 0, F * 0.98); s.add(bar);
  // light: sky, and the sun from the north, as in New Zealand
  s.add(new T.HemisphereLight(...L.hemi));
  const sun = new T.DirectionalLight(0xffffff, L.sun); sun.position.set(-R * 0.35, R * 1.25, -R * 0.9); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -R * 1.3, right: R * 1.3, top: R * 1.3, bottom: -R * 1.3, near: 1, far: R * 5 });
  sun.shadow.bias = -0.0005; s.add(sun); s.add(sun.target);
  buildHood(M.around); buildMass(M);

  const canvas = document.createElement('canvas');
  canvas.className = 'ps-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'The site in 3D: neighbouring buildings at an assumed height, the parcel boundary, north, a scale bar and the massing block. Drag sideways to turn it.');
  host.append(canvas);
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  const cam = new T.PerspectiveCamera(34, 1, 0.5, R * 12);
  const V = { angle: { az: 0.72, el: 0.6, dist: 3.1 }, top: { az: 0.0001, el: 1.55, dist: 3.6 }, street: { az: 0.35, el: 0.14, dist: 1.9 } };
  let az = V.angle.az, el = V.angle.el, dist = F * V.angle.dist, alive = true, frame = 0, drag = null;
  const target = () => new T.Vector3(M.x * 0.5, Math.min(M.h, 12) * 0.25, -M.z * 0.5);
  const place = () => { const t = target(); cam.position.set(t.x + dist * Math.cos(el) * Math.sin(az), t.y + dist * Math.sin(el), t.z + dist * Math.cos(el) * Math.cos(az)); cam.lookAt(t); };
  const draw = () => { if (!alive) return; place(); renderer.render(s, cam); };
  const later = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); };
  const size = () => { const w = host.clientWidth || 640, h = host.clientHeight || 400; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); draw(); };
  const ro = globalThis.ResizeObserver ? new ResizeObserver(size) : null; ro?.observe(host);
  size();
  const down = (e) => { drag = { x: e.clientX, y: e.clientY, az, el }; canvas.setPointerCapture?.(e.pointerId); };
  const move = (e) => { if (!drag) return; az = drag.az - (e.clientX - drag.x) * 0.008; el = Math.min(1.55, Math.max(0.08, drag.el + (e.clientY - drag.y) * 0.006)); later(); };
  const up = () => { drag = null; };
  const wheel = (e) => { e.preventDefault(); dist = Math.min(R * 5, Math.max(F * 0.8, dist * (e.deltaY > 0 ? 1.1 : 0.9))); later(); };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', wheel, { passive: false });
  return {
    setMassing(m) { const around = m.around !== M.around; M = { ...M, ...m }; buildMass(M); if (around) buildHood(M.around); later(); },
    view(name) { const v = V[name] ?? V.angle; az = v.az; el = v.el; dist = F * v.dist; draw(); },
    zoom(f) { dist = Math.min(R * 5, Math.max(F * 0.8, dist * f)); draw(); },
    still(w = 1600, h = 1000) { renderer.setPixelRatio(1); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); draw(); const url = canvas.toDataURL('image/png'); renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2)); size(); return url; },
    stop() {
      if (!alive) return;
      alive = false; cancelAnimationFrame(frame); ro?.disconnect();
      for (const g of [...hoodGeoms, ...massGeoms]) g.dispose();
      for (const o of owned) o.dispose?.();
      renderer.dispose(); renderer.forceContextLoss?.(); canvas.remove();
    },
  };
}

/** one PNG still, drawn off-screen in the assembl look (paper is white) and released at once; null when this browser cannot draw 3D */
export async function renderStill({ data, massing, look = 'assembl', width = 1600, height = 1000, view = 'angle' }) {
  if (!webglOk()) return null;
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${Math.round(width / 2)}px;height:${Math.round(height / 2)}px`;
  document.body.append(host);
  try { const v = await mountScene(host, { data, massing, look }); v.view(view); const url = v.still(width, height); v.stop(); return url; }
  finally { host.remove(); }
}
