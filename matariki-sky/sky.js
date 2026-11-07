// Matariki sky explorer: an assembl lab experiment (educational, not production).
// World coordinates are J2000 equatorial (ICRS), in parsecs, with the Sun at the origin: x towards RA 0h,
// z towards the north celestial pole. Star data: /matariki-sky/data/stars.json (see its "about" field and
// scripts/build-matariki-sky-data.py). Rise times, twilight and the observer's horizon: Astronomy Engine.
// Cultural layer: draft, pending cultural review. This file holds no kōrero and maps no Māori name to a star.
import * as THREE from 'three';

const $ = id => document.getElementById(id);
const A = window.Astronomy;
const DEG = Math.PI / 180;
const LY = 3.26156;                       // light-years per parsec
const CLUSTER_RA = 56.75, CLUSTER_DEC = 24.1167;   // centre of M45 (03h 47m, +24° 07′)
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const PLACES = [
  { id: 'akl', name: 'Tāmaki Makaurau Auckland', lat: -36.8485, lon: 174.7633 },
  { id: 'tga', name: 'Tauranga', lat: -37.6878, lon: 176.1651 },
  { id: 'hlz', name: 'Kirikiriroa Hamilton', lat: -37.787, lon: 175.2793 },
  { id: 'rot', name: 'Rotorua', lat: -38.1368, lon: 176.2497 },
  { id: 'wlg', name: 'Te Whanganui-a-Tara Wellington', lat: -41.2866, lon: 174.7756 },
  { id: 'chc', name: 'Ōtautahi Christchurch', lat: -43.5321, lon: 172.6362 },
  { id: 'dud', name: 'Ōtepoti Dunedin', lat: -45.8788, lon: 170.5028 },
];

/* ── NZ time ─────────────────────────────────────────────────────────────── */
const TZ = 'Pacific/Auckland';
const dtf = new Intl.DateTimeFormat('en-NZ', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const wall = ms => { const p = Object.fromEntries(dtf.formatToParts(new Date(ms)).map(x => [x.type, x.value])); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second); };
const nzToUtc = (y, mo, d, h, mi) => { const g = Date.UTC(y, mo - 1, d, h, mi); let off = wall(g) - g; off = wall(g - off) - (g - off); return g - off; };
const fTime = new Intl.DateTimeFormat('en-NZ', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const fDay = new Intl.DateTimeFormat('en-NZ', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
const fDate = new Intl.DateTimeFormat('en-NZ', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
const tzName = ms => { const off = (wall(ms) - ms) / 3600000; return off === 13 ? 'NZDT' : off === 12 ? 'NZST' : `UTC+${off}`; };
const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const POINTS = ['north', 'north-north-east', 'north-east', 'east-north-east', 'east', 'east-south-east', 'south-east', 'south-south-east', 'south', 'south-south-west', 'south-west', 'west-south-west', 'west', 'west-north-west', 'north-west', 'north-north-west'];
const compass = az => POINTS[Math.round(((az % 360) + 360) % 360 / 22.5) % 16];

/* ── star colour (approximate) ───────────────────────────────────────────── */
// B−V to temperature: Ballesteros (2012). Gaia BP−RP to temperature: Mucciarelli & Bellazzini (2020), dwarfs,
// solar metallicity, for 0.35 < BP−RP; bluer stars use Gaia's own temperature when it has one. Colour from
// temperature: a standard blackbody fit. Good enough to tell blue from orange, not a measurement.
const bvT = bv => 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
function bprpT(c, teff) {
  if (c == null) return teff || 6500;
  if (c < 0.35) { if (teff) return teff; const p = [[-0.3, 20000], [-0.1, 13000], [0, 10000], [0.35, 7300]]; for (let i = 1; i < p.length; i++) if (c <= p[i][0]) { const [a, ta] = p[i - 1], [b, tb] = p[i]; return ta + (tb - ta) * (Math.max(c, a) - a) / (b - a); } }
  return 5040 / (0.4929 + 0.5092 * c - 0.0353 * c * c);
}
function tRGB(T) {
  const t = Math.min(40000, Math.max(1500, T)) / 100; let r, g, b;
  if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12; b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04; }
  else { r = 329.7 * Math.pow(t - 60, -0.1332); g = 288.12 * Math.pow(t - 60, -0.0755); b = 255; }
  const c = [r, g, b].map(v => Math.min(255, Math.max(0, v)) / 255);
  const m = Math.max(...c); return c.map(v => 0.25 + 0.75 * v / m);   // keep colour, normalise brightness
}
const eq = (ra, dec, d = 1) => { const a = ra * DEG, b = dec * DEG; return new THREE.Vector3(d * Math.cos(b) * Math.cos(a), d * Math.cos(b) * Math.sin(a), d * Math.sin(b)); };

/* ── state ───────────────────────────────────────────────────────────────── */
const S = {
  mode: 'sky',               // 'sky' | 'flying' | 'space'
  place: PLACES[0], date: '2027-06-27', minutes: 375,
  az: 55, alt: 14, fov: 60,  // sky view
  th: 0, ph: 0, r: 12,       // orbit around the cluster (radians, radians, pc)
  depth: false, sel: null, focusIdx: -1,
};
let D = null;          // star data
let stars = [];        // flat list: { kind:'member'|'sky', i, pos, absMag }
let sky = null;        // horizon frame for the chosen place and time
let renderer, scene, camera, starMat, dome, ground, line, needs = true;
const view = $('view');
const C = eq(CLUSTER_RA, CLUSTER_DEC, 136.2);
const U = C.clone().normalize();
const W = U.clone().negate();                                         // from the cluster back towards the Sun
// Orbit frame around the cluster. "Up" is the observer's zenith projected across the line of sight, so the
// cluster stays the way up it looked from Aotearoa; celestial north until a place and time are set.
const E1 = new THREE.Vector3(), E2 = new THREE.Vector3();
function setBasis(hint = new THREE.Vector3(0, 0, 1)) {
  E2.copy(hint).addScaledVector(W, -hint.dot(W)).normalize();
  E1.copy(E2).cross(W).normalize();
}
setBasis();

/* ── horizon frame from Astronomy Engine ─────────────────────────────────── */
function horizonFrame() {
  const [y, mo, d] = S.date.split('-').map(Number);
  const ms = nzToUtc(y, mo, d, Math.floor(S.minutes / 60), S.minutes % 60);
  const t = A.MakeTime(new Date(ms));
  const obs = new A.Observer(S.place.lat, S.place.lon, 0);
  const R = A.Rotation_HOR_EQJ(t, obs);
  const v = (x, yy, z) => { const r = A.RotateVector(R, new A.Vector(x, yy, z, t)); return new THREE.Vector3(r.x, r.y, r.z).normalize(); };
  const zen = v(0, 0, 1), north = v(1, 0, 0), east = v(0, 1, 0).negate();   // HOR: x north, y west, z up
  const sunEq = A.Equator(A.Body.Sun, t, obs, true, true), sunH = A.Horizon(t, obs, sunEq.ra, sunEq.dec, 'normal');
  const sv = A.GeoVector(A.Body.Sun, t, true);
  return { ms, t, obs, zen, north, east, sunAlt: sunH.altitude, sunDir: new THREE.Vector3(sv.x, sv.y, sv.z).normalize() };
}
const hor2eq = (f, az, alt) => f.north.clone().multiplyScalar(Math.cos(alt * DEG) * Math.cos(az * DEG)).addScaledVector(f.east, Math.cos(alt * DEG) * Math.sin(az * DEG)).addScaledVector(f.zen, Math.sin(alt * DEG));
const eq2hor = (f, v) => { const n = v.clone().normalize(); return { alt: Math.asin(Math.max(-1, Math.min(1, n.dot(f.zen)))) / DEG, az: ((Math.atan2(n.dot(f.east), n.dot(f.north)) / DEG) + 360) % 360 }; };

function matariki(f) {
  A.DefineStar(A.Body.Star1, CLUSTER_RA / 15, CLUSTER_DEC, 136.2 * LY);
  const posAt = t => { const e = A.Equator(A.Body.Star1, t, f.obs, true, true); return A.Horizon(t, f.obs, e.ra, e.dec, 'normal'); };
  const [y, mo, d] = S.date.split('-').map(Number);
  const noonBefore = A.MakeTime(new Date(nzToUtc(y, mo, d, 12, 0) - 86400000));
  const midnight = A.MakeTime(new Date(nzToUtc(y, mo, d, 0, 0)));
  const rise = A.SearchRiseSet(A.Body.Star1, f.obs, +1, noonBefore, 1.5);
  const dawn = A.SearchAltitude(A.Body.Sun, f.obs, +1, midnight, 1, -18);
  const sunrise = A.SearchRiseSet(A.Body.Sun, f.obs, +1, midnight, 1);
  return { now: posAt(f.t), rise, riseAz: rise ? posAt(rise).azimuth : null, dawn, sunrise };
}

/* ── controls ────────────────────────────────────────────────────────────── */
function setupControls() {
  const sel = $('place');
  for (const p of PLACES) sel.add(new Option(p.name, p.id));
  sel.addEventListener('change', () => { S.place = PLACES.find(p => p.id === sel.value); updateSky(true); });
  $('date').addEventListener('change', e => { if (e.target.value) { S.date = e.target.value; updateSky(true); } });
  $('time').addEventListener('input', e => { S.minutes = +e.target.value; updateSky(false); });
  for (const b of document.querySelectorAll('.quick button')) b.addEventListener('click', () => { S.date = b.dataset.date; $('date').value = S.date; updateSky(true); });
  $('look').addEventListener('click', () => { lookAtMatariki(); view.focus({ preventScroll: true }); });
  $('fly').addEventListener('click', () => (S.mode === 'sky' ? flyOut() : flyHome()));
  $('mode-sky').addEventListener('click', () => { if (S.mode === 'space') flyHome(); });
  $('mode-space').addEventListener('click', () => { if (S.mode === 'sky') flyOut(); });
  $('skip').addEventListener('click', () => finishFlight());
  $('depth').addEventListener('change', e => { S.depth = e.target.checked; $('legend').hidden = !S.depth; needs = true; });
  $('side').addEventListener('click', () => orbitTo(70 * DEG, 0));
  $('front').addEventListener('click', () => orbitTo(0, 0));
  $('info-close').addEventListener('click', () => select(null));
}

function updateSky(recentre) {
  $('time-out').value = hhmm(S.minutes);
  $('time').setAttribute('aria-valuetext', `${hhmm(S.minutes)} New Zealand time`);
  for (const b of document.querySelectorAll('.quick button')) b.setAttribute('aria-pressed', String(b.dataset.date === S.date));
  if (!A) { $('readout').textContent = 'The astronomy library did not load, so rise times are not available.'; return; }
  sky = horizonFrame();
  const m = matariki(sky);
  const tz = tzName(sky.ms);
  const r = [];
  if (m.rise) {
    const sameMorning = fDay.format(m.rise.date) === fDay.format(sky.ms);
    r.push(`<p>Matariki rises at <span class="num">${fTime.format(m.rise.date)}</span>${sameMorning ? '' : ` (${fDay.format(m.rise.date)})`}, towards the ${compass(m.riseAz)} (<span class="num">${m.riseAz.toFixed(0)}°</span>).</p>`);
  } else r.push('<p>Matariki does not rise on this date from here.</p>');
  if (m.dawn) r.push(`<p>Dawn twilight begins <span class="num">${fTime.format(m.dawn.date)}</span>${m.sunrise ? `, sunrise <span class="num">${fTime.format(m.sunrise.date)}</span>` : ''}.</p>`);
  if (m.rise && m.dawn && m.rise.date < m.dawn.date && m.dawn.date - m.rise.date < 12 * 3600e3)
    r.push(`<p class="small">Dark sky with Matariki up: <span class="num">${fTime.format(m.rise.date)}–${fTime.format(m.dawn.date)}</span>.</p>`);
  const up = m.now.altitude > 0;
  r.push(`<p class="small">At <span class="num">${hhmm(S.minutes)} ${tz}</span> Matariki is ${up ? `<span class="num">${m.now.altitude.toFixed(0)}°</span> above the horizon, towards the ${compass(m.now.azimuth)}` : 'below the horizon'}. Times are ${tz}.</p>`);
  $('readout').innerHTML = r.join('');
  S.mat = m;
  if (recentre) lookAtMatariki(true);
  if (ground) { applySkyUniforms(); placeSkyLabels(); }
  needs = true;
}

function lookAtMatariki(quiet) {
  if (!S.mat) return;
  const n = S.mat.now;
  if (n.altitude > -2) { S.az = n.azimuth; S.alt = Math.max(n.altitude, 0) + (S.fov > 50 ? 9 : 3); }
  else { S.az = S.mat.riseAz ?? 60; S.alt = 12; }
  if (!quiet) announce(n.altitude > 0 ? `Looking at Matariki, ${n.altitude.toFixed(0)} degrees up towards the ${compass(n.azimuth)}.` : `Matariki is below the horizon. Looking towards where it rises, ${compass(S.az)}.`);
  needs = true;
}

/* ── 3D ──────────────────────────────────────────────────────────────────── */
const starVS = `
attribute float absMag; attribute vec3 color; attribute float depthT;
uniform float uLimit, uPx, uSky, uDepth; uniform vec3 uZenith;
varying vec3 vColor; varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float d = max(length(mv.xyz), 0.02);
  float m = absMag + 5.0 * log(d / 10.0) / log(10.0);
  vec3 dir = normalize(position - cameraPosition);
  float s = dot(dir, uZenith);
  float altD = degrees(asin(clamp(s, -1.0, 1.0)));
  float airmass = 1.0 / (max(s, 0.0) + 0.50572 * pow(max(altD, 0.0) + 6.07995, -1.6364));
  m += uSky * 0.22 * (airmass - 1.0);                       // atmospheric extinction near the horizon
  float rel = uLimit - m;
  vAlpha = clamp(rel / 1.2 + 0.4, 0.0, 1.0);
  gl_PointSize = rel < -0.7 ? 0.0 : clamp(2.4 + 1.7 * rel, 2.4, 30.0) * uPx;
  vec3 c = color;
  vec3 depthC = mix(vec3(0.82, 0.76, 1.0), vec3(0.95, 0.42, 0.52) * 0.8, depthT);
  if (depthT >= 0.0) c = mix(c, depthC, uDepth);
  else if (depthT > -1.5) c = mix(c, vec3(0.62), uDepth);
  else c *= 1.0 - 0.7 * uDepth;                             // background steps back
  vColor = c;
  gl_Position = projectionMatrix * mv;
}`;
const starFS = `
varying vec3 vColor; varying float vAlpha;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0; float r2 = dot(p, p); if (r2 > 1.0) discard;
  float core = exp(-r2 * 10.0), halo = exp(-r2 * 3.0) * 0.32;
  gl_FragColor = vec4(mix(vColor, vec3(1.0), core * 0.55), (core + halo) * vAlpha);
}`;
const domeVS = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const domeFS = `
varying vec3 vDir; uniform vec3 uZenith, uSun; uniform float uTw, uDay, uFade;
void main(){
  vec3 d = normalize(vDir); float h = dot(d, uZenith);
  vec3 c = mix(vec3(0.141, 0.043, 0.129), vec3(0.055, 0.016, 0.047), smoothstep(-0.05, 0.6, h));
  float glow = pow(max(dot(d, uSun), 0.0), 3.0) * (1.0 - smoothstep(-0.1, 0.55, h));
  c += vec3(0.569, 0.416, 0.439) * glow * uTw * 1.3 + vec3(0.3, 0.2, 0.24) * uTw * (1.0 - smoothstep(0.0, 0.4, h)) * 0.35;
  c = mix(c, mix(vec3(0.78, 0.66, 0.70), vec3(0.45, 0.36, 0.48), smoothstep(0.0, 0.8, h)), uDay);
  gl_FragColor = vec4(c, uFade);
}`;
const groundFS = `
varying vec3 vDir; uniform vec3 uZenith; uniform float uFade, uDay;
void main(){
  vec3 d = normalize(vDir); float h = -dot(d, uZenith); if (h < 0.0) discard;
  vec3 c = mix(vec3(0.17, 0.065, 0.155), vec3(0.05, 0.016, 0.045), smoothstep(0.0, 0.2, h));
  c = mix(c, vec3(0.27, 0.17, 0.22), uDay * 0.6);
  gl_FragColor = vec4(c, uFade);
}`;

function build3D() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas: $('sky'), antialias: true, powerPreference: 'high-performance' });
  } catch (e) { $('nogl').hidden = false; return false; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x0c030b, 1);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, 1, 0.0005, 50000);

  const n = stars.length, pos = new Float32Array(n * 3), mag = new Float32Array(n), col = new Float32Array(n * 3), dep = new Float32Array(n);
  stars.forEach((s, i) => { pos.set([s.pos.x, s.pos.y, s.pos.z], i * 3); mag[i] = s.absMag; col.set(s.rgb, i * 3); dep[i] = s.depthT; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('absMag', new THREE.BufferAttribute(mag, 1));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('depthT', new THREE.BufferAttribute(dep, 1));
  starMat = new THREE.ShaderMaterial({
    vertexShader: starVS, fragmentShader: starFS, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uLimit: { value: 6.5 }, uPx: { value: renderer.getPixelRatio() }, uSky: { value: 1 }, uDepth: { value: 0 }, uZenith: { value: new THREE.Vector3(0, 0, 1) } },
  });
  const pts = new THREE.Points(g, starMat); pts.frustumCulled = false; pts.renderOrder = 1; scene.add(pts);

  const sph = r => new THREE.SphereGeometry(r, 64, 32);
  dome = new THREE.Mesh(sph(0.8), new THREE.ShaderMaterial({ vertexShader: domeVS, fragmentShader: domeFS, side: THREE.BackSide, depthTest: false, depthWrite: false, transparent: true,
    uniforms: { uZenith: { value: new THREE.Vector3() }, uSun: { value: new THREE.Vector3() }, uTw: { value: 0 }, uDay: { value: 0 }, uFade: { value: 1 } } }));
  dome.renderOrder = 0; dome.frustumCulled = false; scene.add(dome);
  ground = new THREE.Mesh(sph(0.5), new THREE.ShaderMaterial({ vertexShader: domeVS, fragmentShader: groundFS, side: THREE.BackSide, depthTest: false, depthWrite: false, transparent: true,
    uniforms: { uZenith: { value: new THREE.Vector3() }, uFade: { value: 1 }, uDay: { value: 0 } } }));
  ground.renderOrder = 2; ground.frustumCulled = false; scene.add(ground);

  // the line of sight from the Sun to the cluster, shown in space
  // a dotted path: every 2 pc out to 110 pc, then every 0.5 pc through the cluster
  const path = []; for (let d = 2; d < 110; d += 2) path.push(d); for (let d = 110; d <= 160; d += 0.5) path.push(d);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(path.flatMap(d => U.clone().multiplyScalar(d).toArray())), 3));
  line = new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xF3A5BE, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, depthTest: false }));
  line.renderOrder = 1; line.frustumCulled = false; scene.add(line);
  // the Sun, as a marker
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
  scene.userData.sun = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xFFE9C7, size: 7, sizeAttenuation: false, transparent: true, opacity: 0, depthTest: false }));
  scene.userData.sun.renderOrder = 3; scene.add(scene.userData.sun);
  // distance ticks along the line of sight (every 5 pc from 125 to 145) so the side view reads as depth
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TICKS.flatMap(d => U.clone().multiplyScalar(d).toArray())), 3));
  scene.userData.ticks = new THREE.Points(tg, new THREE.PointsMaterial({ color: 0xF3A5BE, size: 5, sizeAttenuation: false, transparent: true, opacity: 0, depthTest: false }));
  scene.userData.ticks.renderOrder = 3; scene.add(scene.userData.ticks);

  new ResizeObserver(resize).observe(view); resize();
  applySkyUniforms();
  return true;
}

function resize() {
  if (!renderer) return;
  const w = view.clientWidth, h = view.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); needs = true;
}

function applySkyUniforms() {
  if (!sky || !dome) return;
  const tw = smooth(-18, -6, sky.sunAlt), day = smooth(-6, 4, sky.sunAlt) * 0.85;
  dome.material.uniforms.uZenith.value.copy(sky.zen);
  dome.material.uniforms.uSun.value.copy(sky.sunDir);
  dome.material.uniforms.uTw.value = tw; dome.material.uniforms.uDay.value = day;
  ground.material.uniforms.uZenith.value.copy(sky.zen); ground.material.uniforms.uDay.value = day;
  starMat.uniforms.uZenith.value.copy(sky.zen);
  S.skyLimit = 6.5 - 5.5 * smooth(-18, -3, sky.sunAlt);
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* camera poses */
function skyPose() {
  const dir = hor2eq(sky, S.az, S.alt);
  return { pos: new THREE.Vector3(), target: dir, up: sky.zen.clone(), fov: S.fov };
}
function orbitPose(th = S.th, ph = S.ph, r = S.r) {
  const fwd = W.clone().multiplyScalar(Math.cos(th)).addScaledVector(E1, Math.sin(th));
  const off = fwd.clone().multiplyScalar(Math.cos(ph) * r).addScaledVector(E2, Math.sin(ph) * r);
  const up = fwd.clone().multiplyScalar(-Math.sin(ph)).addScaledVector(E2, Math.cos(ph));
  return { pos: C.clone().add(off), target: C.clone(), up, fov: 50 };
}
function applyPose(p) {
  camera.position.copy(p.pos); camera.up.copy(p.up); camera.lookAt(p.target);
  if (camera.fov !== p.fov) { camera.fov = p.fov; camera.updateProjectionMatrix(); }
}

/* ── flying ──────────────────────────────────────────────────────────────── */
let flight = null;
const TICKS = [125, 130, 135, 140, 145];
const FLY_MS = 8000, ORBIT_MS = 4500, R_NEAR = 12;
function flyOut() {
  if (S.mode !== 'sky') return;
  if (!renderer) { setMode('space'); return; }
  if (sky) setBasis(sky.zen);
  if (reduced()) { S.th = 0; S.ph = 0; S.r = R_NEAR; finishFlightTo('space'); announce('Now at the cluster, about 444 light-years from the Sun. Use View from the side to see its depth.'); return; }
  const from = skyPose();
  flight = { dir: +1, t0: performance.now(), from, orbit: true };
  S.mode = 'flying'; uiForMode(); $('flying').hidden = false; $('flying-note').textContent = 'Flying out to Matariki';
  announce('Flying out to Matariki, about 444 light-years. Press Escape or Skip to arrive now.');
}
function flyHome() {
  if (S.mode !== 'space') return;
  if (!renderer || reduced()) { finishFlightTo('sky'); announce(`Back under the sky from ${S.place.name}.`); return; }
  flight = { dir: -1, t0: performance.now(), th0: S.th, ph0: S.ph, r0: S.r, to: skyPose() };
  S.mode = 'flying'; uiForMode(); $('flying').hidden = false; $('flying-note').textContent = 'Flying back to Aotearoa';
  $('skip').textContent = 'Skip to Aotearoa';
  announce(`Flying back to ${S.place.name}.`);
}
function finishFlight() {
  if (!flight) return;
  const home = flight.dir < 0; flight = null;
  if (!home) { S.th = S.th || 0; }
  finishFlightTo(home ? 'sky' : 'space');
}
function finishFlightTo(mode) {
  flight = null; $('flying').hidden = true; $('skip').textContent = 'Skip to the cluster';
  if (mode === 'space' && S.mode !== 'space') { S.ph = 0; S.r = R_NEAR; }
  setMode(mode);
}
function setMode(mode) {
  S.mode = mode; uiForMode();
  if (renderer) {
    const atHome = mode === 'sky';
    dome.material.uniforms.uFade.value = atHome ? 1 : 0; ground.material.uniforms.uFade.value = atHome ? 1 : 0;
    dome.visible = ground.visible = atHome; starMat.uniforms.uSky.value = atHome ? 1 : 0;
    line.material.opacity = atHome ? 0 : 0.7; scene.userData.sun.material.opacity = atHome ? 0 : 1; scene.userData.ticks.material.opacity = atHome ? 0 : 0.9;
  }
  needs = true;
}
function uiForMode() {
  const sky = S.mode === 'sky', space = S.mode === 'space';
  $('mode-sky').setAttribute('aria-pressed', String(sky || (S.mode === 'flying' && flight && flight.dir < 0)));
  $('mode-space').setAttribute('aria-pressed', String(space || (S.mode === 'flying' && flight && flight.dir > 0)));
  $('sky-controls').hidden = !sky; $('space-controls').hidden = !space;
  $('fly').textContent = sky ? 'Fly to Matariki' : 'Back to Aotearoa';
  $('fly').disabled = S.mode === 'flying';
}

// Phase a (0–0.22): turn to face Matariki while the ground and sky fade. Phase b: travel out along the line of
// sight, slow then fast then slow, with the faint cluster stars coming up as you near them. Then a slow turn.
function flightFrame(now) {
  const f = flight, el = now - f.t0;
  if (f.dir === 1) {
    const t = Math.min(1, el / FLY_MS);
    const end = orbitPose(0, 0, R_NEAR);
    const ta = smooth(0, 0.22, t), tb = ease(Math.min(1, Math.max(0, (t - 0.22) / 0.78)));
    const look = f.from.target.clone().lerp(U, ta).normalize();
    const D0 = end.pos.length(), k = 5;
    const dist = D0 * (Math.exp(k * tb) - 1) / (Math.exp(k) - 1);
    const pos = U.clone().multiplyScalar(dist);
    const target = tb > 0 ? C.clone() : look.clone();
    const up = f.from.up.clone().lerp(end.up, smooth(0.22, 0.6, t)).normalize();
    const fade = 1 - smooth(0.02, 0.2, t);
    applyPose({ pos, target: tb > 0 ? target : look, up, fov: f.from.fov + (50 - f.from.fov) * tb });
    setTransit(fade, 6.5 + 4.5 * tb);
    if (t >= 1) {
      if (f.orbit) { flight = { dir: 2, t0: now }; S.th = 0; S.ph = 0; S.r = R_NEAR; setMode('space'); S.mode = 'flying'; uiForMode(); $('flying-note').textContent = 'Turning the cluster to show its depth'; }
      else finishFlightTo('space');
    }
  } else if (f.dir === 2) {
    const t = Math.min(1, el / ORBIT_MS);
    S.th = 70 * DEG * ease(t);
    applyPose(orbitPose()); setTransit(0, 11);
    if (t >= 1) { finishFlightTo('space'); announce('At the cluster. Viewed from the side: the Sun is off to the left, 444 light-years away. Arrow keys turn the cluster.'); }
  } else {
    // swing round to Earth's side of the cluster, travel home along the line of sight, then turn to the sky
    const t = Math.min(1, el / FLY_MS);
    const front = orbitPose(0, 0, R_NEAR);
    if (t < 0.18) {
      const e = ease(t / 0.18);
      applyPose(orbitPose(f.th0 * (1 - e), f.ph0 * (1 - e), f.r0 + (R_NEAR - f.r0) * e)); setTransit(0, 11);
    } else if (t < 0.8) {
      const tt = 1 - ease((t - 0.18) / 0.62), D0 = front.pos.length(), k = 5;
      const dist = D0 * (Math.exp(k * tt) - 1) / (Math.exp(k) - 1);
      applyPose({ pos: U.clone().multiplyScalar(dist), target: C.clone(), up: front.up, fov: 50 + (f.to.fov - 50) * smooth(0.3, 0.8, t) });
      setTransit(0, 6.5 + 4.5 * tt);
    } else {
      const e = smooth(0.8, 1, t);
      applyPose({ pos: new THREE.Vector3(), target: U.clone().lerp(f.to.target, e).normalize(), up: front.up.clone().lerp(f.to.up, e).normalize(), fov: f.to.fov });
      setTransit(smooth(0.8, 0.95, t), 6.5);
    }
    if (t >= 1) { finishFlightTo('sky'); announce(`Back under the sky from ${S.place.name}.`); }
  }
}
function setTransit(fade, limit) {
  dome.visible = ground.visible = fade > 0.001;
  dome.material.uniforms.uFade.value = fade; ground.material.uniforms.uFade.value = fade;
  starMat.uniforms.uSky.value = fade; S.transitLimit = limit;
  line.material.opacity = 0.7 * (1 - fade); scene.userData.sun.material.opacity = 1 - fade; scene.userData.ticks.material.opacity = 0.9 * (1 - fade);
}

/* ── labels (HTML overlay) ───────────────────────────────────────────────── */
const labelBox = $('labels');
const labels = [];
function addLabel(cls, html, pos, mode, dx = 8, dy = -8) {
  const el = document.createElement('span'); el.className = 'lbl ' + cls; el.innerHTML = html; labelBox.append(el);
  const l = { el, pos, mode, dx, dy, w: el.offsetWidth }; labels.push(l); return l;
}
let skyLabels = [];
function placeSkyLabels() {
  for (const l of skyLabels) l.el.remove();
  labels.splice(0, labels.length, ...labels.filter(l => !skyLabels.includes(l)));
  skyLabels = [];
  if (!sky) return;
  for (const [az, txt] of [[0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'], [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW']])
    skyLabels.push(addLabel('compass', txt, hor2eq(sky, az, 0.6).multiplyScalar(0.3), 'sky', -6, -18));
  if (S.mat && S.mat.rise) skyLabels.push(addLabel('rise', `Matariki rises ${fTime.format(S.mat.rise.date)}`, hor2eq(sky, S.mat.riseAz, 0.2).multiplyScalar(0.3), 'sky', -40, 6));
}
function makeLabels() {
  addLabel('cluster', 'Matariki<small>Pleiades · M45</small>', C.clone(), 'far', 26, -34);
  for (const d of TICKS) addLabel('mono tick', `${d} pc`, U.clone().multiplyScalar(d), 'side', 6, 8);
  const named = D.members.map((m, i) => ({ m, i })).filter(x => x.m.bf).slice(0, 7);
  for (const { m, i } of named) addLabel('mono', esc(m.bf.split(' · ')[0]), stars[i].pos, 'near', 7, -7);
  for (let i = 0; i < D.sky.ra.length; i++) if (D.sky.name[i] && D.sky.mag[i] < 1.0) addLabel('', esc(D.sky.name[i]), stars[D.members.length + i].pos, 'sky', 7, -7);
  addLabel('sun', 'The Sun and Earth', new THREE.Vector3(), 'space', 9, -9);
  addLabel('mono tick', '← towards the Sun and Earth, 136 pc', U.clone().multiplyScalar(127.6), 'side', 0, 22);
}
const v3 = new THREE.Vector3();
function project(p) {
  v3.copy(p).project(camera);
  if (v3.z > 1 || v3.z < -1) return null;
  const w = view.clientWidth, h = view.clientHeight;
  const x = (v3.x + 1) / 2 * w, y = (1 - v3.y) / 2 * h;
  if (x < -40 || y < -40 || x > w + 40 || y > h + 40) return null;
  // reject points behind the camera
  const toP = p.clone().sub(camera.position); const fwd = camera.getWorldDirection(new THREE.Vector3());
  if (toP.dot(fwd) <= 0) return null;
  return { x, y };
}
function drawLabels() {
  const inSky = S.mode === 'sky' || (S.mode === 'flying' && dome.material.uniforms.uFade.value > 0.5);
  const near = camera.position.distanceTo(C) < 40;
  // the depth scale lies along the line of sight, so it only reads (and only shows) when you look across it
  const across = Math.acos(Math.min(1, Math.abs(camera.getWorldDirection(new THREE.Vector3()).dot(U)))) / DEG;
  const sideOn = !inSky && near && across > 25;
  if (scene.userData.ticks && !inSky) scene.userData.ticks.material.opacity = 0.9 * smooth(15, 30, across) * (near ? 1 : 0);
  const placed = [];
  for (const l of labels) {
    let show = (l.mode === 'far' && (inSky || !near)) || (l.mode === 'sky' && inSky) || (l.mode === 'space' && !inSky) || (l.mode === 'near' && !inSky && near) || (l.mode === 'side' && sideOn);
    let p = null;
    if (show) {
      if (inSky && sky && l.mode !== 'sky' && eq2hor(sky, l.pos).alt < -1) show = false;
      if (inSky && sky && l.mode === 'sky' && !l.el.classList.contains('compass') && !l.el.classList.contains('rise') && eq2hor(sky, l.pos).alt < 1) show = false;
      if (show) p = project(l.pos);
    }
    // skip a label that would sit on one already placed (labels are added in priority order)
    if (p) {
      if (!l.w) l.w = l.el.offsetWidth || 0; const x = p.x + l.dx, y = p.y + l.dy;
      if (placed.some(b => x < b.x + b.w + 4 && x + l.w + 4 > b.x && y < b.y + 16 && y + 16 > b.y)) p = null;
      else placed.push({ x, y, w: l.w });
    }
    if (!p) { if (l.el.style.display !== 'none') l.el.style.display = 'none'; continue; }
    l.el.style.display = '';
    l.el.style.transform = `translate(${(p.x + l.dx).toFixed(1)}px, ${(p.y + l.dy).toFixed(1)}px)`;
  }
  const ring = $('ring');
  if (S.sel) {
    const s = stars[S.sel.flat];
    const vis = !(inSky && sky && eq2hor(sky, s.pos).alt < 0);
    const p = vis && project(s.pos);
    ring.hidden = !p; if (p) ring.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
  } else ring.hidden = true;
}

/* ── interaction ─────────────────────────────────────────────────────────── */
const ptrs = new Map(); let down = null, pinch = null;
function setupPointer() {
  view.addEventListener('pointerdown', e => { view.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); down = { x: e.clientX, y: e.clientY, moved: 0 }; if (ptrs.size === 2) pinch = gap(); });
  view.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return;
    const p = ptrs.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (down) down.moved += Math.abs(dx) + Math.abs(dy);
    if (ptrs.size === 2) { const g = gap(); if (pinch) zoom(pinch / g); pinch = g; return; }
    drag(dx, dy);
  });
  const up = e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
    if (down && down.moved < 6 && ptrs.size === 0 && e.type === 'pointerup') pick(e.clientX, e.clientY);
    if (ptrs.size === 0) down = null;
  };
  view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
  view.addEventListener('wheel', e => { e.preventDefault(); zoom(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
  view.addEventListener('keydown', key);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (flight) finishFlight(); else if (S.sel) select(null); } });
}
const gap = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
function drag(dx, dy) {
  if (S.mode === 'sky') { const k = S.fov / view.clientHeight; S.az = (S.az - dx * k + 360) % 360; S.alt = Math.max(-10, Math.min(89, S.alt + dy * k)); }
  else if (S.mode === 'space') { S.th -= dx * 0.005; S.ph = Math.max(-1.35, Math.min(1.35, S.ph + dy * 0.005)); }
  needs = true;
}
function zoom(f) {
  if (S.mode === 'sky') S.fov = Math.max(8, Math.min(100, S.fov * f));
  else if (S.mode === 'space') S.r = Math.max(4, Math.min(150, S.r * f));
  needs = true;
}
function key(e) {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const step = e.shiftKey ? 3 : 1; let used = true;
  switch (e.key) {
    case 'ArrowLeft': S.mode === 'sky' ? (S.az = (S.az - 5 * step + 360) % 360) : (S.th += 0.08 * step); break;
    case 'ArrowRight': S.mode === 'sky' ? (S.az = (S.az + 5 * step) % 360) : (S.th -= 0.08 * step); break;
    case 'ArrowUp': S.mode === 'sky' ? (S.alt = Math.min(89, S.alt + 3 * step)) : (S.ph = Math.min(1.35, S.ph + 0.08 * step)); break;
    case 'ArrowDown': S.mode === 'sky' ? (S.alt = Math.max(-10, S.alt - 3 * step)) : (S.ph = Math.max(-1.35, S.ph - 0.08 * step)); break;
    case '+': case '=': zoom(0.85); break;
    case '-': case '_': zoom(1 / 0.85); break;
    case ']': stepStar(+1); break;
    case '[': stepStar(-1); break;
    case 'Enter': case ' ': if (S.focusIdx < 0) stepStar(+1); else select(brightList[S.focusIdx]); break;
    case 'f': case 'F': S.mode === 'sky' ? flyOut() : S.mode === 'space' ? flyHome() : finishFlight(); break;
    default: used = false;
  }
  if (used) { e.preventDefault(); needs = true; if (e.key.startsWith('Arrow') && S.mode === 'sky') announceView(); }
}
let annT = 0;
function announceView() { clearTimeout(annT); annT = setTimeout(() => announce(`Looking ${compass(S.az)}, ${S.alt.toFixed(0)} degrees up.`), 500); }
function stepStar(d) {
  S.focusIdx = (S.focusIdx + d + brightList.length) % brightList.length;
  select(brightList[S.focusIdx], { keepFocus: true });
}
function pick(cx, cy) {
  const rect = view.getBoundingClientRect(), x = cx - rect.left, y = cy - rect.top;
  const limit = currentLimit(); let best = null, bs = 1e9;
  const inSky = S.mode === 'sky';
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    const d = s.pos.distanceTo(camera.position);
    const m = s.absMag + 5 * Math.log10(Math.max(d, 0.02) / 10);
    if (m > limit + 0.3) continue;
    if (inSky && sky && eq2hor(sky, s.pos).alt < 0) continue;
    const p = project(s.pos); if (!p) continue;
    const dd = Math.hypot(p.x - x, p.y - y); if (dd > 22) continue;
    const score = dd - 2.2 * (limit - m);
    if (score < bs) { bs = score; best = i; }
  }
  if (best != null) select(best); else select(null);
}
function currentLimit() {
  const zoomBoost = S.mode === 'sky' ? 2 * Math.log10(70 / S.fov) : 0;
  return (S.mode === 'sky' ? S.skyLimit ?? 6.5 : S.mode === 'space' ? 11 : S.transitLimit ?? 6.5) + zoomBoost;
}

/* ── star details ────────────────────────────────────────────────────────── */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fx = (v, n = 2) => (v == null ? '—' : (v < 0 ? '−' : '') + Math.abs(v).toFixed(n));
let brightList = [];
function select(flat, opts = {}) {
  if (flat == null) { S.sel = null; $('info').hidden = true; markList(); needs = true; return; }
  const s = stars[flat]; S.sel = { flat };
  const html = s.kind === 'member' ? memberHTML(D.members[s.i]) : skyHTML(s.i);
  $('info-title').textContent = s.kind === 'member' ? (D.members[s.i].bf || `Gaia DR3 ${D.members[s.i].gaia}`) : (D.sky.bf[s.i] || D.sky.name[s.i] || (D.sky.hip[s.i] ? `HIP ${D.sky.hip[s.i]}` : 'Star'));
  $('info-body').innerHTML = html; $('info').hidden = false;
  S.focusIdx = brightList.indexOf(flat);
  markList();
  const m = s.kind === 'member' ? D.members[s.i] : null;
  announce(`${$('info-title').textContent}${m && m.iau ? ', ' + m.iau : ''}. ${s.kind === 'member' ? 'In Matariki. ' : ''}Details shown.`);
  if (!opts.keepFocus && opts.focusPanel) $('info').focus();
  needs = true;
}
function memberHTML(m) {
  const ly = m.d * LY;
  const own = m.dSrc === 'gaia';
  const why = m.plx == null ? 'Gaia DR3 has no parallax for this star' : `Gaia DR3 parallax ${fx(m.plx, 3)} ± ${fx(m.plxErr, 3)} mas${m.ruwe != null && m.ruwe >= 1.4 ? `, RUWE ${fx(m.ruwe)}` : ''} is too uncertain for its own depth here`;
  const rows = [
    ['In', 'Matariki · Pleiades (M45)<span class="note">Picked by position, parallax and motion.</span>'],
    ['Māori name', `<span class="pending">Pending cultural review</span><span class="note">Not assigned in this draft. See <a href="#matariki">Matariki</a> below.</span>`],
    m.iau ? ['IAU name', esc(m.iau)] : null,
    ['Catalogue', [`Gaia DR3 <span class="num">${esc(m.gaia)}</span>`, m.hip ? `HIP <span class="num">${esc(m.hip)}</span>` : '', m.hd ? `HD <span class="num">${esc(m.hd)}</span>` : ''].filter(Boolean).join('<br>')],
    ['Magnitude', `G <span class="num">${fx(m.g)}</span> (Gaia)${m.v != null ? `<br>V <span class="num">${fx(m.v)}</span> (HYG)` : ''}`],
    ['Distance', own
      ? `<span class="num">${ly.toFixed(0)}</span> light-years (<span class="num">${m.d.toFixed(1)}</span> pc)<span class="note">From Gaia DR3 parallax ${fx(m.plx, 3)} ± ${fx(m.plxErr, 3)} mas.</span>`
      : `About <span class="num">444</span> light-years (<span class="num">136.2</span> pc), the cluster distance<span class="note">${why}, so it is drawn at the cluster distance (Melis et al. 2014).</span>`],
    ['Spectral type', m.spect ? `<span class="num">${esc(m.spect)}</span> (HYG)` : 'Not in HYG'],
    ['Colour index', `BP−RP <span class="num">${fx(m.bpRp)}</span>${m.bv != null ? `<br>B−V <span class="num">${fx(m.bv)}</span>` : ''}`],
  ].filter(Boolean);
  return `<p class="kind">A star of Matariki</p><dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` +
    (m.iau ? '<div class="slot" role="note"><p class="slot-title">Kōrero to be provided by cultural advisers.</p></div>' : '');
}
function skyHTML(i) {
  const s = D.sky, d = s.d[i];
  const rows = [
    s.name[i] ? ['IAU name', esc(s.name[i])] : null,
    ['Catalogue', s.hip[i] ? `HIP <span class="num">${esc(s.hip[i])}</span>` : 'HYG'],
    ['Magnitude', `V <span class="num">${fx(s.mag[i])}</span>`],
    ['Distance', d ? `<span class="num">${(d * LY).toFixed(d * LY < 100 ? 1 : 0)}</span> light-years (<span class="num">${d.toFixed(1)}</span> pc)<span class="note">HYG, mostly from Hipparcos parallaxes.</span>` : 'Unknown or very far; drawn far away'],
    ['Spectral type', s.spect[i] ? `<span class="num">${esc(s.spect[i])}</span>` : '—'],
    ['Colour index', `B−V <span class="num">${fx(s.ci[i])}</span>`],
  ].filter(Boolean);
  return `<p class="kind">A background star (HYG)</p><dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}
function buildList() {
  const idx = D.members.map((m, i) => i).slice(0, 12);
  brightList = idx;
  $('star-list').innerHTML = idx.map((i, n) => {
    const m = D.members[i];
    const title = m.bf || `Gaia DR3 …${m.gaia.slice(-6)}`;
    const sub = [m.iau ? `IAU name ${m.iau}` : null, m.dSrc === 'gaia' ? `${(m.d * LY).toFixed(0)} ly` : '≈444 ly (cluster)'].filter(Boolean).join(' · ');
    return `<li><button type="button" data-flat="${i}" data-n="${n}"><span>${esc(title)}</span><span class="mag">mag ${fx(m.g, 1)}</span><span class="sub">${esc(sub)}</span></button></li>`;
  }).join('');
  $('star-list').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { select(+b.dataset.flat, { focusPanel: true }); } });
}
function markList() { for (const b of $('star-list').querySelectorAll('button')) b.setAttribute('aria-current', String(S.sel != null && +b.dataset.flat === S.sel.flat)); }
function announce(t) { const a = $('announce'); a.textContent = ''; setTimeout(() => { a.textContent = t; }, 30); }

/* ── loop ────────────────────────────────────────────────────────────────── */
function hud() {
  const h = $('hud');
  if (S.mode === 'sky' && sky) h.textContent = `${S.place.name} · ${fDate.format(sky.ms)} ${hhmm(S.minutes)} ${tzName(sky.ms)} · looking ${compass(S.az)}, ${S.alt.toFixed(0)}° up`;
  else { const d = camera.position.length(); h.textContent = `${d < 0.01 ? (flight && flight.dir < 0 ? 'Home in Aotearoa' : 'Leaving Aotearoa') : `${(d * LY).toFixed(0)} light-years from the Sun (${d.toFixed(1)} pc)`}`; }
}
function frame(now) {
  requestAnimationFrame(frame);
  if (!renderer) return;
  if (flight) { flightFrame(now); needs = true; }
  else if (!needs) return;
  if (!flight) {
    if (S.mode === 'sky' && sky) applyPose(skyPose());
    else if (S.mode === 'space') applyPose(orbitPose());
  }
  starMat.uniforms.uLimit.value = currentLimit();
  starMat.uniforms.uDepth.value = S.depth && S.mode !== 'sky' ? 1 : 0;
  renderer.render(scene, camera);
  drawLabels(); hud();
  needs = false;
}
function orbitTo(th, ph) {
  if (reduced() || !renderer) { S.th = th; S.ph = ph; needs = true; return; }
  const th0 = S.th, ph0 = S.ph, t0 = performance.now();
  const step = now => { const t = Math.min(1, (now - t0) / 1600), e = ease(t); S.th = th0 + (th - th0) * e; S.ph = ph0 + (ph - ph0) * e; needs = true; if (t < 1 && S.mode === 'space') requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* ── start ───────────────────────────────────────────────────────────────── */
async function start() {
  setupControls();
  try {
    D = await (await fetch('/matariki-sky/data/stars.json')).json();
  } catch (e) { $('readout').textContent = 'The star data did not load.'; return; }
  $('n-members').textContent = String(D.members.length);
  $('n-sky').textContent = D.sky.ra.length.toLocaleString('en-NZ');
  stars = [];
  for (const [i, m] of D.members.entries()) {
    const pos = eq(m.ra, m.dec, m.d);
    stars.push({ kind: 'member', i, pos, absMag: m.g - 5 * Math.log10(m.d / 10), rgb: tRGB(bprpT(m.bpRp, m.teff)),
      depthT: m.dSrc === 'gaia' ? Math.min(1, Math.max(0, (m.d - 128) / 18)) : -1 });
  }
  const s = D.sky;
  for (let i = 0; i < s.ra.length; i++) {
    const d = s.d[i] || 3000;
    stars.push({ kind: 'sky', i, pos: eq(s.ra[i], s.dec[i], d), absMag: s.mag[i] - 5 * Math.log10(d / 10), rgb: tRGB(s.ci[i] == null ? 6500 : bvT(s.ci[i])), depthT: -2 });
  }
  buildList();
  const ok = build3D();
  updateSky(true);
  if (ok) { makeLabels(); placeSkyLabels(); setupPointer(); setMode('sky'); }
  else { $('fly').disabled = true; $('mode-space').disabled = true; }
  // tests and screenshots: ?view=space opens at the cluster, ?view=side from the side
  const q = new URLSearchParams(location.search).get('view');
  if (ok && (q === 'space' || q === 'side')) { if (sky) setBasis(sky.zen); S.th = q === 'side' ? 70 * DEG : 0; finishFlightTo('space'); }
  window.__sky = { S, select, flyOut, flyHome, finishFlight, ready: true };
  requestAnimationFrame(frame);
}
start();
