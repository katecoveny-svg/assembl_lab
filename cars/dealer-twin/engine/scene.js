// 3D dealership as an architect's maquette. Two kinds of layout share one engine: the "generic" campus (every department on one
// hand-drawn site, the fallback) and "real" sites built from public footprints (LINZ NZ Building Outlines, CC BY 4.0; parcels and
// road centrelines from LINZ; road classes and car parks from OpenStreetMap, ODbL). A layout is a set of anchors (where the hoists,
// turntables, desks, yard slots and camera views are); place() moves cars and people onto the anchors every frame from the model's
// clock and event lists. Real sites are north-up: scene x = east, scene z = south (so a camera on the street side sees a true map),
// and the sun is computed for the site's latitude, longitude and the model's clock.
function createTwinScene(o) {
const D = DEALER, NB = DEALER.BASE.bays || 19, canvas = o.canvas, box = o.box, tagsEl = o.tags, lite = !!o.lite;
const L = h => new THREE.Color(h).convertSRGBToLinear();
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, lite ? 1 : 1.75)); renderer.shadowMap.enabled = !lite; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.8; renderer.setClearColor(0, 0);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.5, 1200);
// the maquette look: a pale card model on a paper table; fog fades the table into the page colour
scene.fog = new THREE.Fog(0xEFEBE3, 170, 420);
const controls = new THREE.OrbitControls(camera, canvas); controls.enableDamping = true; controls.dampingFactor = .08; controls.maxPolarAngle = Math.PI * 0.47; controls.minDistance = 8; controls.maxDistance = 320; controls.enablePan = true; controls.screenSpacePanning = false;

// ---------- environment: three's RoomEnvironment (a studio with soft light panels) through PMREM, with a plain grey fallback
{ const pm = new THREE.PMREMGenerator(renderer); let tex = null;
  try { if (THREE.RoomEnvironment) tex = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture; } catch (e) { }
  if (!tex) { const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 16, 8), new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: new THREE.Color(.9, .88, .85) }))); tex = pm.fromScene(es, 0.03).texture; }
  scene.environment = tex; pm.dispose(); }
// one soft key light (the studio lamp on the generic campus; the real sun on a real site) with a large shadow map, a cool hemisphere fill
// levels tuned so a sunlit card surface lands near its own colour after ACES (which scales by exposure / 0.6): key ≈ 0.9, ambient ≈ 0.3
const hemi = new THREE.HemisphereLight(0xF2EEE6, 0xA79F92, 0.16); scene.add(hemi);
const KEY = { light: 0.9, dark: 0.72 }, AMB = { light: .16, dark: .12 }, EXPO = { light: .8, dark: .86 };
const sun = new THREE.DirectionalLight(0xFFF6EA, KEY.light); sun.position.set(-60, 110, 70); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
if (lite) sun.shadow.mapSize.set(512, 512);
Object.assign(sun.shadow.camera, { left: -82, right: 86, top: 52, bottom: -46, near: 10, far: 420 }); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04; sun.shadow.radius = 4; scene.add(sun, sun.target); sun.target.position.set(5, 0, 4);
const fill = new THREE.DirectionalLight(0xE8ECF2, 0.1); fill.position.set(80, 40, -60); scene.add(fill);

// matte card, paper and timber: low metalness, mid roughness, colour only where it carries data
const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: L(c), roughness: .78, metalness: 0, envMapIntensity: .16 }, o));
const M = { grass: std("#E2DCD1", { roughness: .95 }), grass2: std("#E6E1D7", { roughness: .95 }), asphalt: std("#D5CFC4", { roughness: .9 }), concrete: std("#E8E3DA", { roughness: .9 }),
  floor: std("#EFEBE4", { roughness: .7 }), polish: std("#F1EDE6", { roughness: .45, envMapIntensity: .35 }), steel: std("#C4BDB1", { roughness: .6 }), wall: std("#F8F5F0", { roughness: .8 }), cap: std("#B7AFA2", { roughness: .7 }),
  glass: new THREE.MeshPhysicalMaterial({ color: L("#B5C3C7"), roughness: .35, metalness: 0, transparent: true, opacity: .3, envMapIntensity: .4, depthWrite: false }),
  line: std("#F8F6F1", { roughness: .8 }), dark: std("#9A9388", { roughness: .7 }), post: std("#D6D0C5", { roughness: .7 }), liftArm: std("#5F666C", { roughness: .55 }),
  wood: std("#CDB391", { roughness: .7 }), sofa: std("#C9C1B3", { roughness: .9 }), desk: std("#DCCBB0", { roughness: .6 }), screen: new THREE.MeshBasicMaterial({ color: L("#B9CBD4") }),
  rack: std("#C4BDB0", { roughness: .7 }), trunk: std("#B99A76"), canopy: std("#F1EEE7", { roughness: .8 }), turn: std("#D3CDC2", { roughness: .6 }),
  cyc: std("#FFFFFF", { roughness: .9, emissive: L("#FFFFFF"), emissiveIntensity: .1 }), soft: new THREE.MeshBasicMaterial({ color: L("#FFFFFF") }),
  ctx: std("#F2EFE8", { roughness: .85 }), ctxCap: std("#E9E5DD", { roughness: .85 }), road: std("#CDC6BA", { roughness: .9 }), kerb: std("#DFD9CF", { roughness: .9 }), parcel: std("#D2CBBF", { roughness: .9 }), plinth: std("#F4F1EB", { roughness: .8 }) };
// legibility palette (v2): ground, yard, roads and three building tones by use, each with a roof a touch darker than its walls
const PAL = {
  light: { grass: "#CBC3B5", concrete: "#DCD8D0", asphalt: "#D5D1C9", road: "#A6A29A", kerb: "#EFECE6", parcel: "#B4ADA1", ctx: "#DAD4CA", ctxCap: "#D0C9BE", plinth: "#E3DFD8",
    wallShow: "#F5ECDF", roofShow: "#E9DDCA", wallWork: "#E2E6E8", roofWork: "#CDD4D8", wallNeu: "#EDEAE4", roofNeu: "#DEDAD2", line: "#F7F5F0", cshadow: "#3A3127" },
  dark: { grass: "#2E2B27", concrete: "#3A3732", asphalt: "#36332E", road: "#1E1D1B", kerb: "#57534C", parcel: "#4A463F", ctx: "#4A4640", ctxCap: "#3D3934", plinth: "#2A2825",
    wallShow: "#E3D8C8", roofShow: "#C9BBA7", wallWork: "#C6CCD0", roofWork: "#A9B1B6", wallNeu: "#D6D2CA", roofNeu: "#BCB7AE", line: "#6A665F", cshadow: "#000000" } };
Object.assign(M, { wallShow: std(PAL.light.wallShow, { roughness: .82 }), roofShow: std(PAL.light.roofShow, { roughness: .88 }), wallWork: std(PAL.light.wallWork, { roughness: .82 }), roofWork: std(PAL.light.roofWork, { roughness: .88 }),
  wallNeu: std(PAL.light.wallNeu, { roughness: .82 }), roofNeu: std(PAL.light.roofNeu, { roughness: .88 }), hoist: std("#8B939A", { roughness: .55 }), hoistBase: std("#6F767C", { roughness: .6 }), shelf: std("#8E979E", { roughness: .6 }),
  deskTop: std("#D9C6A8", { roughness: .62 }) });
["grass", "concrete", "asphalt", "road", "kerb", "parcel", "ctx", "ctxCap", "plinth", "line"].forEach(k => M[k].color = L(PAL.light[k]));
const USE = { showroom: ["wallShow", "roofShow"], "showroom+workshop": ["wallShow", "roofShow"], display: ["wallShow", "roofShow"], workshop: ["wallWork", "roofWork"], used: ["wallWork", "roofWork"], parts: ["wallNeu", "roofNeu"], store: ["wallNeu", "roofNeu"] };
const FY = 0.3;
// every static mesh goes into G (rebuilt per layout) and is baked into one draw call per material
// on a real site the site buildings' interiors go into IG and their solid massing (walls by use, roof a touch darker) into SG: the site
// view shows the massing, the department views lift it off to show the interiors. TG is the group the builders are filling.
let G = new THREE.Group(), IG = new THREE.Group(), SG = new THREE.Group(); scene.add(G, IG, SG); let TG = G;
function add(m, cast = true, recv = true) { m.castShadow = cast; m.receiveShadow = recv; TG.add(m); return m; }
function boxM(w, h, d, mat, x, y, z, cast = true, parent = TG) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; }
function slab(x1, z1, x2, z2, mat, y = 0.02, h = 0.04) { return boxM(x2 - x1, h, z2 - z1, mat, (x1 + x2) / 2, y, (z1 + z2) / 2, false); }
function wall(x1, z1, x2, z2, h = 2.2, t = 0.25, mat = M.wall, base = FY) { const len = Math.hypot(x2 - x1, z2 - z1), m = new THREE.Mesh(new THREE.BoxGeometry(len, h, t), mat);
  m.position.set((x1 + x2) / 2, base + h / 2, (z1 + z2) / 2); m.rotation.y = -Math.atan2(z2 - z1, x2 - x1); add(m, mat !== M.glass, mat !== M.glass);
  if (mat !== M.glass) { const c = new THREE.Mesh(new THREE.BoxGeometry(len + .02, 0.08, t + .04), M.cap); c.position.copy(m.position); c.position.y = base + h + .04; c.rotation.y = m.rotation.y; TG.add(c); }
  else { const c = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.12), M.cap); c.position.copy(m.position); c.position.y = base + h; c.rotation.y = m.rotation.y; TG.add(c); }
  return m; }
// a two-post hoist: posts on base plates and an overhead beam between them (p1, p2 are the post centres [x, z])
function hoistAt(p1, p2, yaw) { [p1, p2].forEach(p => { rbox(.26, 2.9, .26, M.hoist, p[0], FY + 1.45, p[1], yaw); rbox(.56, .05, .56, M.hoistBase, p[0], FY + .025, p[1], yaw, false); });
  const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + .26, m = rbox(len, .16, .14, M.hoist, (p1[0] + p2[0]) / 2, FY + 2.98, (p1[1] + p2[1]) / 2, -Math.atan2(p2[1] - p1[1], p2[0] - p1[0])); return m; }
// a rotated box: centre (x, z), size a along the frame's u axis and b across it, yaw in radians
function rbox(a, h, b, mat, x, y, z, yaw, cast = true) { const m = boxM(a, h, b, mat, x, y, z, cast); m.rotation.y = yaw; return m; }
function merge(geos) { let n = 0; const ps = [], ns = []; geos.forEach(g => { g = g.index ? g.toNonIndexed() : g; ps.push(g.attributes.position.array); ns.push(g.attributes.normal.array); n += g.attributes.position.count; });
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3); let o = 0; ps.forEach((a, i) => { P.set(a, o); N.set(ns[i], o); o += a.length; });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3)); return g; }
// extruded footprint: polygon in scene (x, z), bottom y0, height h
function prism(poly, y0, h, mat, cast = true) { const s = new THREE.Shape(); poly.forEach(([x, z], i) => i ? s.lineTo(x, -z) : s.moveTo(x, -z));
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); const m = new THREE.Mesh(g, mat); add(m, cast, true); return m; }
function bake(G = TG) { const groups = new Map(), drop = [];
  G.updateMatrixWorld(true);
  G.children.forEach(m => { if (!m.isMesh || m.isInstancedMesh || m.userData.keep) return; const key = m.material.uuid + (m.castShadow ? "c" : "") + (m.receiveShadow ? "r" : "");
    if (!groups.has(key)) groups.set(key, { mat: m.material, cast: m.castShadow, recv: m.receiveShadow, geos: [] });
    const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()); g.applyMatrix4(m.matrixWorld); groups.get(key).geos.push(g); drop.push(m); });
  drop.forEach(m => { G.remove(m); m.geometry.dispose(); });
  groups.forEach(Gr => { const mesh = new THREE.Mesh(merge(Gr.geos), Gr.mat); mesh.castShadow = Gr.cast; mesh.receiveShadow = Gr.recv; mesh.matrixAutoUpdate = false; G.add(mesh); }); }

// ---------- cars: four stylised classes (hatch, SUV, ute, van) with real parts, instanced per part. The model's "sedan" draws as a hatch.
const KIT = buildCarKit(THREE, merge);
const TYPEK = ["hatch", "suv", "ute", "van"], CAP = { hatch: 120, suv: 110, ute: 60, van: 30 }, CLASS = k => KIT[k] && TYPEK.includes(k) ? k : k === "sedan" ? "hatch" : "suv";
// body colours: a calm card palette (no marque paint); the marque shows only as the one roof stripe
const BODY = ["#ECE7DE", "#DAD6CE", "#C8CBCB", "#B7B2A8", "#8F8D89", "#C9C2B1", "#AFB9B4", "#9BA4AB", "#E3DCCF", "#6F6E6B"].map(L);
const MAT = { body: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .62, metalness: 0, envMapIntensity: .3 }),
  glass: new THREE.MeshStandardMaterial({ color: L("#3F4A50"), roughness: .22, metalness: .1, envMapIntensity: 1.0, side: THREE.DoubleSide }), tyre: std("#2A2826", { roughness: .92, envMapIntensity: .2 }),
  rim: std("#B9BDC1", { roughness: .32, metalness: .75, envMapIntensity: .9 }), head: new THREE.MeshStandardMaterial({ color: L("#F4F1E8"), emissive: L("#FFF6E2"), emissiveIntensity: .15, roughness: .4 }),
  tail: new THREE.MeshStandardMaterial({ color: L("#B5453E"), emissive: L("#B4443F"), emissiveIntensity: .12, roughness: .45 }), trim: std("#4C4A47", { roughness: .8 }),
  stripe: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6, metalness: 0, envMapIntensity: .4 }),
  shadow: new THREE.MeshBasicMaterial({ map: KIT.shadowTex, transparent: true, depthWrite: false, toneMapped: false, opacity: .5, color: 0xffffff }) };
const CARS = {};
TYPEK.forEach(k => { const g = KIT[k], n = CAP[k], mk = (geo, mat, cast) => { const m = new THREE.InstancedMesh(geo, mat, n); m.castShadow = cast; m.receiveShadow = true; m.frustumCulled = false; m.count = 0; scene.add(m); return m; };
  const body = mk(g.body, MAT.body, true); body.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
  const stripe = mk(g.stripe, MAT.stripe, false); stripe.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
  CARS[k] = { n, i: 0, L: g.L, W: g.W, meshes: [body, mk(g.glass, MAT.glass, false), mk(g.tyres, MAT.tyre, true), mk(g.rims, MAT.rim, false), mk(g.heads, MAT.head, false), mk(g.tails, MAT.tail, false), mk(g.trim, MAT.trim, false), stripe], body, stripe }; });
// one soft contact shadow per car, always on the ground or floor under it (a hoisted car leaves a fainter one)
const MAXS = 330, cshadow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), MAT.shadow, MAXS); cshadow.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXS * 3), 3);
cshadow.frustumCulled = false; cshadow.renderOrder = 1; cshadow.count = 0; scene.add(cshadow); let sn = 0; const SH_GROUND = new THREE.Color(0, 0, 0), SH_LIFT = new THREE.Color(.45, .45, .45);
let carModels = "procedural-v4";
// kept for the page's call; the Blender bodies are no longer used (the procedural kit is the maquette standard)
function useCarModels(b64, done) { if (done) setTimeout(() => done(carModels), 0); /* asynchronous, as the GLB loader was: the page mounts its panels first */ }
const TINT = D.MARQUES.map(m => L(m.tint)), OTHER = L("#A8A49C");
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler();
const hash = n => { let h = (Math.floor(n * 7919) ^ 0x9E3779B9) >>> 0; h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0; return (h ^ (h >>> 16)) >>> 0; };
function carBegin() { TYPEK.forEach(k => { CARS[k].i = 0; }); sn = 0; }
// seed: a stable number per vehicle (job, slot or deal id) so its body colour does not change from frame to frame
function car(type, x, y, z, yaw, mk, seed) { const C = CARS[CLASS(type)]; if (C.i >= C.n) return; _p.set(x, y, z); _s.set(1, 1, 1); _q.setFromEuler(_e.set(0, yaw, 0)); _m.compose(_p, _q, _s);
  C.meshes.forEach(m => m.setMatrixAt(C.i, _m)); C.body.setColorAt(C.i, BODY[hash(seed != null ? seed : x * 3.1 + z * 7.7) % BODY.length]); C.stripe.setColorAt(C.i, mk >= 0 ? TINT[mk] : OTHER); C.i++;
  if (sn < MAXS) { const lifted = y > .5, gy = lifted ? FY + .015 : y + .025; _p.set(x, gy, z); _s.set(C.L + .75, 1, C.W + .75); _m.compose(_p, _q, _s); cshadow.setMatrixAt(sn, _m); cshadow.setColorAt(sn, lifted ? SH_LIFT : SH_GROUND); sn++; } }
function carEnd() { TYPEK.forEach(k => { const C = CARS[k]; C.meshes.forEach(m => { m.count = C.i; m.visible = C.i > 0; m.instanceMatrix.needsUpdate = true; }); if (C.body.instanceColor) C.body.instanceColor.needsUpdate = true; if (C.stripe.instanceColor) C.stripe.instanceColor.needsUpdate = true; });
  cshadow.count = sn; cshadow.instanceMatrix.needsUpdate = true; if (cshadow.instanceColor) cshadow.instanceColor.needsUpdate = true; }
const bodyOf = (mk, r) => { const m = D.MARQUES[mk]; if (!m) return "suv"; return m.body[Math.floor((r || 0) * m.body.length) % m.body.length]; };
// headings: the profile faces +x; these face the named direction (n = -z, the top of the map)
const FACE = { n: Math.PI / 2, s: -Math.PI / 2, e: 0, w: Math.PI };

// ---------- people (neutral figures: staff a darker grey card, technicians blue-grey, customers pale sand; only the remote team carries colour)
const personGeo = (() => { const torso = new THREE.LatheGeometry([[0, .66], [.17, .68], [.19, .76], [.17, .95], [.205, 1.18], [.2, 1.3], [.12, 1.36], [.06, 1.42], [0, 1.42]].map(([r, y]) => new THREE.Vector2(r, y)), 12);
  const legs = [-.085, .085].map(x => new THREE.CylinderGeometry(.075, .062, .7, 8).translate(x, .35, 0)); const arms = [-.23, .23].map(x => new THREE.CylinderGeometry(.05, .045, .6, 6).translate(x, .98, 0));
  const g = [torso, ...legs, ...arms].map(q => q.index ? q.toNonIndexed() : q); g.forEach(q => q.computeVertexNormals()); return g; })();
const MAXP = 240, pb = new THREE.InstancedMesh(merge(personGeo), std("#ffffff", { roughness: .85 }), MAXP), ph = new THREE.InstancedMesh(new THREE.SphereGeometry(.12, 14, 10), std("#D9D2C6", { roughness: .8 }), MAXP);
pb.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 3), 3); pb.castShadow = true; ph.castShadow = true; pb.frustumCulled = ph.frustumCulled = false; scene.add(pb, ph);
const PC = { staff: L("#8A857C"), tech: L("#8E949B"), remote: L("#D9822B"), cust: ["#D8CFC2", "#C8CCCF", "#CFC3B5", "#D3D0C9", "#C4CBC2", "#D1C6CB"].map(L) };
let pn = 0; const person = (x, z, col, y = FY, sit = false, yaw = 0) => { if (pn >= MAXP) return; const h = sit ? .72 : 1; _q.setFromEuler(_e.set(0, yaw, 0)); _p.set(x, y, z); _s.set(1, h, 1); _m.compose(_p, _q, _s); pb.setMatrixAt(pn, _m); pb.setColorAt(pn, col);
  _s.set(1, 1, 1); _p.set(x, y + 1.42 * h + .12, z); _m.compose(_p, _q, _s); ph.setMatrixAt(pn, _m); pn++; };
// ---------- lead tokens, parts totes, flow particles, lifts, turntables, zones, health-check cards
const MAXL = 90, tok = new THREE.InstancedMesh(new THREE.OctahedronGeometry(.32, 0), new THREE.MeshBasicMaterial({ toneMapped: false }), MAXL); tok.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXL * 3), 3); tok.frustumCulled = false; scene.add(tok);
const CHC = { trademe: "#F2B84B", autotrader: "#7FC4E8", search: "#9AD27F", social: "#E88FB5", website: "#FFFFFF", oem: "#B9A2F0", radio: "#F08A5D", walkin: "#DDDDDD" };
const chCol = k => L(CHC[k] || "#DDDDDD");
const MAXT = 40, tote = new THREE.InstancedMesh(new THREE.BoxGeometry(.6, .4, .45), std("#ffffff", { roughness: .6 }), MAXT); tote.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXT * 3), 3); tote.castShadow = true; tote.frustumCulled = false; scene.add(tote);
const flowMat = new THREE.MeshBasicMaterial({ color: 0x6B655C, transparent: true, opacity: .16, depthWrite: false, toneMapped: false });
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
// two-post hoist arms (the moving part): a carriage on each post and two swing arms per side reaching under the sills. Local frame:
// posts at x = ±1.05, z = -1.4 (toward the nose); the arms rise with the car.
const liftGeo = (() => { const g = []; [1, -1].forEach(sd => { g.push(new THREE.BoxGeometry(.24, .34, .34).translate(sd * 1.0, 0, -1.4));
  [[-1.25, .55], [1.35, .55]].forEach(([dz, x1]) => { const x0 = sd * .95, xa = sd * x1, z0 = -1.4, z1 = -1.4 + dz, len = Math.hypot(xa - x0, z1 - z0), b = new THREE.BoxGeometry(.11, .07, len);
    b.rotateY(Math.atan2(xa - x0, z1 - z0)); b.translate((x0 + xa) / 2, .02, (z0 + z1) / 2); g.push(b); g.push(new THREE.CylinderGeometry(.09, .09, .06, 10).translate(xa, .07, z1)); }); });
  g.forEach(q => q.computeVertexNormals()); return merge(g); })();
const lifts = new THREE.InstancedMesh(liftGeo, M.liftArm, 22); lifts.castShadow = true; lifts.frustumCulled = false; scene.add(lifts);
const turns = new THREE.InstancedMesh(new THREE.CylinderGeometry(2.45, 2.45, .08, 48), M.turn, 8); turns.receiveShadow = true; turns.frustumCulled = false; scene.add(turns);
const zoneMat = new THREE.MeshStandardMaterial({ roughness: .4, transparent: true, opacity: .55 });
const zones = new THREE.InstancedMesh(new THREE.BoxGeometry(4.4, .02, 7.4), zoneMat, 8); zones.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(24), 3); zones.frustumCulled = false; scene.add(zones);
const HCC = { filming: L("#FFFFFF"), sent: L("#7FB2D6"), viewed: L("#3B8FD0"), authorised: L("#5CCB8E"), declined: L("#F0A24A"), all_ok: L("#9AD27F") };
const hcCards = new THREE.InstancedMesh(new THREE.BoxGeometry(.62, .95, .06), new THREE.MeshBasicMaterial({ toneMapped: false }), 22); hcCards.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(66), 3); hcCards.frustumCulled = false; hcCards.count = 0; scene.add(hcCards);
const hcCache = new Map(); const hcOf = (j, S) => { const key = j.id + ":" + j.arr + ":" + S.hc; if (!hcCache.has(key)) { if (hcCache.size > 400) hcCache.clear(); hcCache.set(key, D.healthCheck(j, S)); } return hcCache.get(key); };
const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
const rings = new THREE.InstancedMesh(new THREE.RingGeometry(3.2, 3.6, 48), ringMat, 12); rings.frustumCulled = false; scene.add(rings);
const MAXF = 220, dots = new THREE.InstancedMesh(new THREE.SphereGeometry(.26, 12, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), MAXF); dots.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXF * 3), 3); dots.frustumCulled = false; scene.add(dots);
// the marketing board (a live canvas texture) and the door-counter line are per layout but share their materials
const boardCv = document.createElement("canvas"); boardCv.width = 512; boardCv.height = 200; const boardTx = new THREE.CanvasTexture(boardCv); boardTx.encoding = THREE.sRGBEncoding;
const boardMat = new THREE.MeshBasicMaterial({ map: boardTx, toneMapped: false }), countMat = new THREE.MeshBasicMaterial({ color: L("#F0A24A"), toneMapped: false, transparent: true, opacity: .5 });

// ========== layouts. An anchor set A has every position place() needs; the generic builder returns the hand-drawn campus.
const FLOW_COL = { leads: "#F2B84B", appts: "#F2B84B", deals: "#FFFFFF", hand: "#FFFFFF", out: "#FFFFFF", trade: "#9AD27F", recon: "#9AD27F", photo: "#9AD27F", yard: "#9AD27F", usedsale: "#9AD27F", ros: "#7FC4E8", bays: "#7FC4E8", parts: "#B9A2F0", equity: "#E88FB5", hc: "#F07A6E" };
function buildGeneric() {
  const A = { key: "generic", label: "Generic", real: false, sun: null };
  // land: paper to the horizon, roads, paved areas, building floors
  add(new THREE.Mesh(new THREE.CircleGeometry(600, 64).rotateX(-Math.PI / 2), M.grass), false, true).position.y = -0.02;
  slab(-64, -24, 74, 25, M.concrete, 0.0, 0.02);
  slab(-66, 27, 76, 34, M.road, 0.03, 0.04); slab(-66, 26.7, 76, 34.3, M.kerb, 0.0, 0.02); slab(-66, 25, 76, 26.7, M.concrete, 0.05, 0.08); // street, kerb and footpath
  for (let x = -62; x < 74; x += 6) slab(x, 30.4, x + 3, 30.6, M.line, 0.06, 0.01);
  slab(-62, -22, 72, -17.2, M.asphalt, 0.03, 0.04); // back service lane
  slab(-23, 7, 27, 24.8, M.asphalt, 0.04, 0.04); slab(29, 5, 70, 24.8, M.asphalt, 0.04, 0.04); slab(-39, 10, -24, 24.8, M.asphalt, 0.04, 0.04);
  slab(-30.5, -10, -23.5, 24.8, M.asphalt, 0.04, 0.04);
  const bays = (x0, z0, n, dx, len, dir = 1) => { for (let i = 0; i <= n; i++) slab(x0 + i * dx - 0.06, z0, x0 + i * dx + 0.06, z0 + len * dir, M.line, 0.065, 0.01); };
  bays(30.2, 6.2, 14, 2.6, 4.6); bays(30.2, 11.9, 14, 2.6, 4.6); bays(30.2, 17.6, 14, 2.6, 4.6);
  bays(-37.9, 11.2, 5, 2.6, 4.6); bays(-37.9, 17.2, 5, 2.6, 4.6);
  for (let k = 0; k < 22; k++) { const x = -21.3 + (k % 11) * 2.6 + 1.3, z = 9 + Math.floor(k / 11) * 6; if (k % 11 < 10) slab(x - 0.06, z, x + 0.06, z + 4.6, M.line, 0.065, 0.01); }
  const floorOf = (x1, z1, x2, z2, mat = M.floor) => boxM(x2 - x1, FY, z2 - z1, mat, (x1 + x2) / 2, FY / 2, (z1 + z2) / 2, false);
  floorOf(-58, -16, -31, 8, M.polish); floorOf(-58, 11, -41, 23); floorOf(-23, -14, 23, 6); floorOf(26, -14, 40, 2); floorOf(44, -14, 70, 2);
  contactShadow([[-58, -16, -31, 8], [-58, 11, -41, 23], [-23, -14, 23, 6], [26, -14, 40, 2], [44, -14, 70, 2], [-30.6, -7.6, -23.4, 5.6]].map(([a, b, c, d]) => [[a, b], [c, b], [c, d], [a, d], [a, b]]), 6, 4, 100);
  // showroom: glass front and side, solid back, F&I offices, lounge
  wall(-58, 8, -31, 8, 3.2, .12, M.glass); wall(-58, -16, -58, 8, 3.2, .12, M.glass); wall(-58, -16, -31, -16, 3.2, .25, M.wallShow); wall(-31, -16, -31, -7, 3.2, .25, M.wallShow); wall(-31, 3, -31, 8, 3.2, .25, M.wallShow);
  for (let x = -58; x <= -31; x += 4.5) boxM(.16, 3.2, .16, M.cap, x, FY + 1.6, 8);
  boxM(27.4, .25, .9, M.cap, -44.5, FY + 3.3, 8.2);
  const ibeam = (x, z1, z2, y) => { const c = (z1 + z2) / 2, L_ = z2 - z1; boxM(.07, .3, L_, M.steel, x, y, c, false); boxM(.2, .035, L_, M.steel, x, y + .15, c, false); boxM(.2, .035, L_, M.steel, x, y - .15, c, false); };
  for (let x = -53.5; x <= -35; x += 9) ibeam(x, -16, 8, FY + 3.5);
  boxM(27, .06, .1, M.cap, -44.5, FY + 2.45, 8);
  for (let x = -12; x <= 14; x += 13) ibeam(x, -14, 6, FY + 3.2);
  boxM(3.6, .3, .5, M.cap, -44.5, FY + 2.35, 8.15); boxM(.42, .1, .3, M.wall, -44.5, FY + 2.15, 8.35);
  A.DOOR = { x: -44.5, z: 8.5, yaw: 0 }; A.SHOW_ENTRY = [-44, 9];
  wall(-37, -16, -37, -2, 1.6, .08, M.glass); for (let i = 1; i < 4; i++) wall(-37, -16 + i * 3.5, -31, -16 + i * 3.5, 1.6, .1); wall(-37, -2, -34, -2, 1.6, .08, M.glass);
  A.FI = [0, 1, 2, 3].map(i => [-34, -14.25 + i * 3.5, 0]);
  A.FI.forEach(([x, z]) => { boxM(1.6, .75, .8, M.desk, x, FY + .38, z); boxM(.5, .5, .5, M.sofa, x + 1.3, FY + .25, z - .2); boxM(.5, .5, .5, M.sofa, x + 1.3, FY + .25, z + .6); });
  A.DESKS = [0, 1, 2, 3, 4, 5].map(i => [-54 + (i % 3) * 5.5, -13 + Math.floor(i / 3) * 3.6, 0]);
  A.DESKS.forEach(([x, z]) => { boxM(1.8, .75, .9, M.desk, x, FY + .38, z); boxM(.5, .32, .04, M.screen, x, FY + 1, z - .3, false); });
  for (let i = 0; i < 3; i++) { boxM(2.2, .45, .9, M.sofa, -35.5 + (i % 2) * 2.6, FY + .23, 1.2 + i * 2); } boxM(3, 1, .7, M.wood, -33, FY + .5, 6.6);
  A.SLOTS = [0, 1, 2, 3, 4, 5, 6, 7].map(i => [-54.2 + (i % 4) * 4.6, -4.6 + Math.floor(i / 4) * 7.8, 0]);
  // delivery bay canopy between showroom and workshop
  const canopyY = 3.6; boxM(7.4, .22, 14, M.canopy, -27, canopyY, -1, true); [[-30.4, -7.6], [-23.6, -7.6], [-30.4, 5.6], [-23.6, 5.6]].forEach(([x, z]) => boxM(.18, canopyY, .18, M.cap, x, canopyY / 2, z));
  boxM(7.4, .06, .12, M.cap, -27, canopyY + .14, 6); slab(-30.2, -7.6, -23.8, 5.6, M.polish, .07, .04);
  A.HAND = { from: [-27, -14], bays: [[-27, -4.2], [-27, 2.2]], to: [-27, 31], yaw: FACE.s, side: [-2.4, 0] };
  // marketing and BDC room
  wall(-58, 23, -41, 23, 1.6, .08, M.glass); wall(-58, 11, -41, 11, 2.4, .25, M.wallShow); wall(-58, 11, -58, 23, 2.4, .25, M.wallShow); wall(-41, 11, -41, 20, 1.6, .08, M.glass);
  A.MDESK = [0, 1, 2, 3, 4, 5, 6, 7].map(i => [-55 + (i % 4) * 3.6, 16 + Math.floor(i / 4) * 3.4, 0]);
  A.MDESK.forEach(([x, z]) => { boxM(2.4, .75, 1, M.desk, x, FY + .38, z); boxM(.7, .42, .04, M.screen, x - .5, FY + 1.05, z - .35, false); boxM(.7, .42, .04, M.screen, x + .4, FY + 1.05, z - .35, false); });
  A.BOARD = { x: -49.5, y: FY + 2.3, z: 11.2, yaw: 0 }; A.INBOX = { x: -49.5, z: 13.2, yaw: 0 }; boxM(9, .7, 1.2, M.dark, A.INBOX.x, FY + .35, A.INBOX.z);
  // workshop: NB hoists (the model's BASE.bays), lounge, reception
  wall(-23, -14, 23, -14, 3, .25, M.wallWork); wall(-23, -14, -23, 6, 3, .25, M.wallWork); wall(23, -14, 23, 6, 3, .25, M.wallWork); wall(-23, 6, -9, 6, 3, .12, M.glass); wall(-6, 6, 6, 6, 3, .25, M.wallWork); wall(10, 6, 23, 6, 3, .25, M.wallWork); wall(-9, -2, -9, 6, 1.4, .1, M.glass);
  A.BAY = []; for (let i = 0; i < NB; i++) { const x = -20 + i * 2.25 + (i >= 4 ? 0.8 : 0), z = -9.5; A.BAY.push([x, z, FACE.n]);
    hoistAt([x - 1.05, z - 1.4], [x + 1.05, z - 1.4], 0); slab(x - 1.14, z - 3, x - 1.08, z + 2.6, M.line, FY + .01, .01); }
  A.TECH_AT = ([x, z]) => [x + 1.35, z + 2]; A.TECH_IDLE = Array.from({ length: 24 }, (_, i) => [6 + (i % 6) * .9, -2 + Math.floor(i / 6) * .9]);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) boxM(1.4, .45, .8, M.sofa, -19.5 + c * 2.5, FY + .23, -0.2 + r * 2.1);
  A.LOUNGE_W = Array.from({ length: 12 }, (_, i) => [-19.5 + (i % 4) * 2.5, .5 + Math.floor(i / 4) * 2.1]);
  boxM(4.6, 1.05, 1.1, M.desk, 0, FY + .53, 2.6); boxM(4.6, .06, 1.2, M.dark, 0, FY + 1.08, 2.6); A.RECEPTION = [[-1.2, 3.6], [1.2, 3.6]];
  A.QUEUE = Array.from({ length: 22 }, (_, q) => [-20 + (q % 11) * 2.6, 11.3 + Math.floor(q / 11) * 6, FACE.n]); A.DONE = Array.from({ length: 7 }, (_, i) => [8 + i * 2.6, 21.6, FACE.s]);
  A.ENTRY = [2, 31]; A.EXIT = [-27, 31];
  // parts warehouse
  wall(26, -14, 40, -14, 3, .25, M.wallNeu); wall(40, -14, 40, 2, 3, .25, M.wallNeu); wall(26, -14, 26, -3, 3, .25, M.wallNeu); wall(30, 2, 40, 2, 3, .25, M.wallNeu);
  const binCols = ["#DDD8CE", "#CFD5D8", "#D9CDB9", "#D0D6CB", "#E3DFD7"].map(L);
  for (let r = 0; r < 4; r++) { const z = -12.3 + r * 3.1; boxM(10, .08, .9, M.rack, 34.6, FY + .1, z); boxM(10, .06, .9, M.rack, 34.6, FY + 1.2, z); boxM(10, .06, .9, M.rack, 34.6, FY + 2.3, z);
    [29.7, 34.6, 39.5].forEach(x => boxM(.1, 2.5, .9, M.shelf, x, FY + 1.25, z)); }
  { const bins = new THREE.InstancedMesh(new THREE.BoxGeometry(.7, .5, .7), std("#ffffff", { roughness: .8 }), 4 * 3 * 12); let k = 0;
    for (let r = 0; r < 4; r++) for (let s = 0; s < 3; s++) for (let i = 0; i < 12; i++) { if ((r * 7 + s * 3 + i) % 5 === 0) continue;
      bins.setMatrixAt(k, new THREE.Matrix4().makeTranslation(30.2 + i * .8, FY + .4 + s * 1.12, -12.3 + r * 3.1)); bins.setColorAt(k, binCols[(r + i + s) % 5]); k++; }
    bins.count = k; bins.castShadow = true; TG.add(bins); }
  boxM(4, 1.05, .9, M.desk, 28.2, FY + .53, .4); A.COUNTER = [28.2, 1.4]; A.PARTS_DOOR = [24.5, 1.4]; A.AISLES = [0, 1, 2].map(i => [[31, -10.75 + i * 3.1], [39, -10.75 + i * 3.1]]);
  // used: appraisal lane, three recon bays, photo booth; yard out front
  wall(44, -14, 70, -14, 3, .25, M.wallWork); wall(70, -14, 70, 2, 3, .25, M.wallWork); wall(44, -14, 44, 2, 3, .25, M.wallWork); wall(49.5, -14, 49.5, -2, 2.2, .1); wall(61.5, -14, 61.5, -2, 2.2, .1);
  slab(45, -13, 48.8, 1.6, M.line, FY + .005, .01); slab(45.3, -12.7, 48.5, 1.3, M.floor, FY + .012, .01);
  boxM(.18, 3, .18, M.cap, 45, FY + 1.5, -6); boxM(.18, 3, .18, M.cap, 48.8, FY + 1.5, -6); boxM(4, .2, .3, M.cap, 46.9, FY + 3, -6);
  A.APR = { from: [46.9, 31], lanes: [[46.9, -3], [46.9, -9.5]], yawIn: FACE.n, yawOut: FACE.s, staff: [-1.3, 1.2] };
  A.RECON = [52, 55.7, 59.4].map(x => [x, -7.5, FACE.n]); A.RECON.forEach(([x, z]) => hoistAt([x - 1.05, z - 1.4], [x + 1.05, z - 1.4], 0));
  { const cyc = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 3.2, 32, 1, true, Math.PI * 0.5, Math.PI), M.cyc); cyc.material.side = THREE.DoubleSide; cyc.position.set(65.8, FY + 1.6, -6.5); cyc.rotation.y = Math.PI / 2; add(cyc, false, true);
    [[63, -11.5], [68.5, -11.5], [63, -1.5]].forEach(([x, z]) => { boxM(.06, 2.2, .06, M.cap, x, FY + 1.1, z); const s = boxM(1, .7, .08, M.soft, x, FY + 2.4, z, false); s.lookAt(65.8, FY + 1, -6.5); }); }
  A.PHOTO = [65.8, -6.5]; A.PHOTO_STAFF = [-3, 3]; A.PHOTO_OUT = [65.8, 4];
  A.YARD = []; for (let r = 0; r < 3; r++) for (let i = 0; i < 14; i++) A.YARD.push([31.5 + i * 2.6, 8.5 + r * 5.7, FACE.s]);
  A.OUTD = []; for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) A.OUTD.push([-36.6 + i * 2.6, 13.5 + r * 6, FACE.s]);
  A.LANE = []; for (let i = 0; i < 9; i++) A.LANE.push([46 + i * 2.6, -19.6, FACE.e]);
  A.YARD_WALK = [[40, 11.2, 8, 0], [52, 16.9, 0, 6]];
  for (let i = 0; i < 6; i++) { const x = 32 + i * 7; boxM(.08, 5, .08, M.post, x, 2.5, 25.4); boxM(.04, 1.4, .8, std(i % 2 ? "#B8B1A5" : "#F6F3ED"), x, 4.2, 25.82, false); }
  // model trees: pale foam balls on timber pins
  trees([[-60, 39.5], [-48, 39.5], [-36, 39.5], [-24, 39.5], [-12, 39.5], [0, 39.5], [12, 39.5], [24, 39.5], [36, 39.5], [48, 39.5], [60, 39.5], [72, 39.5],
    [-60, -27], [-50, -27], [-40, -27], [-30, -27], [-20, -27], [-10, -27], [0, -27], [10, -27], [20, -27], [30, -27], [40, -27], [50, -27], [60, -27], [70, -27], [-67, 0], [-68, 14], [-67, -12], [78, -6], [79, 10], [77, 22]]);
  A.NODES = [[-49.5, 17], [-44.5, -2], [-34, -9], [-27, -1], [0, -6], [33, -6], [46.9, -6], [55.7, -7.5], [65.8, -6.5], [49, 15], [2, 14]];
  A.FLOWS = [
    { k: "leads", a: v3(-49.5, 26, 14), b: v3(-49.5, 1.2, 13.4), lift: 0 }, { k: "appts", a: v3(-46, 1, 15), b: v3(-46, 1, 2), lift: 5 }, { k: "deals", a: v3(-46, 1, -10), b: v3(-34, 1, -8), lift: 4 },
    { k: "hand", a: v3(-34, 1, -4), b: v3(-27, 1, -1), lift: 3 }, { k: "out", a: v3(-27, 1, 4), b: v3(-27, 1, 31), lift: 3 }, { k: "trade", a: v3(-27, 1, -6), b: v3(46.9, 1, -6), lift: 16 },
    { k: "recon", a: v3(46.9, 1, -2), b: v3(55.7, 1, -4), lift: 4 }, { k: "photo", a: v3(55.7, 1, -4), b: v3(65.8, 1, -4), lift: 3 }, { k: "yard", a: v3(65.8, 1, 0), b: v3(52, 1, 13), lift: 4 },
    { k: "usedsale", a: v3(45, 1, 13), b: v3(-34, 1, -12), lift: 22 }, { k: "ros", a: v3(2, 1, 31), b: v3(2, 1, 12), lift: 3 }, { k: "bays", a: v3(2, 1, 12), b: v3(0, 1, -7), lift: 4 },
    { k: "parts", a: v3(28.2, 1, -1), b: v3(14, 1, -7), lift: 4 }, { k: "equity", a: v3(-12, 1, 1), b: v3(-45, 1, -4), lift: 10 }, { k: "hc", a: v3(-6, 4.2, -9), b: v3(-14, 1, 31), lift: 9 }];
  A.TAGS = [
    { id: "showroom", p: [-44.5, 4.6, 8], v: ["site", "showroom"] }, { id: "fi", p: [-34, 2.6, -9], v: ["site", "showroom", "fi"] }, { id: "deliv", p: [-27, 4.6, -1], v: ["site", "showroom", "fi"] },
    { id: "mkt", p: [-49.5, 4.6, 17], v: ["site", "marketing"] }, { id: "work", p: [0, 4.6, -9], v: ["site", "workshop"] }, { id: "lounge", p: [-15.5, 2.6, 1], v: ["workshop"] },
    { id: "fore", p: [-8, 2.4, 14], v: ["workshop"] }, { id: "parts", p: [33, 4.6, -6], v: ["site", "parts"] }, { id: "apr", p: [46.9, 4.4, -6], v: ["site", "used"] },
    { id: "recon", p: [55.7, 4.2, -7.5], v: ["used"] }, { id: "photo", p: [65.8, 4.2, -6.5], v: ["used"] }, { id: "yard", p: [49, 3.2, 15], v: ["site", "used"] }, { id: "lane", p: [56, 2.6, -19.6], v: ["used"] },
    { id: "outd", p: [-31.4, 2.8, 17], v: ["showroom"] }, { id: "door", p: [-44.5, 3.4, 9.4], v: ["showroom"] }, { id: "hc", p: [-10, 5.6, -9.5], v: ["workshop"] }, { id: "desks", p: [-48.5, 2.3, -11.2], v: ["showroom"] }, { id: "lng", p: [-34.5, 2.2, 3.2], v: ["showroom"] }];
  A.VIEWS = { site: { p: [-30, 64, 116], t: [0, 0, -2] }, machine: { p: [6, 150, 70], t: [6, 0, 0] }, showroom: { p: [-32, 36, 24], t: [-44, 0, -4] }, used: { p: [72, 34, 46], t: [52, 0, 2] },
    workshop: { p: [8, 19, 16], t: [-2, 1, -8] }, parts: { p: [44, 20, 18], t: [33, 0, -6] }, marketing: { p: [-38, 18, 38], t: [-49, 0, 16] }, fi: { p: [-22, 14, 6], t: [-34, 0, -9] } };
  A.shadow = { left: -82, right: 86, top: 52, bottom: -46 }; A.sunPos = [-60, 110, 70]; A.sunTarget = [5, 0, 4]; A.fog = [170, 420]; A.fixed = [];
  return A;
}
// a soft contact shadow under every footprint: the rings ([x, z], scene metres) drawn into one blurred canvas laid on the ground
function contactShadow(rings, cx, cz, half) { const N = 1024, k = N / (2 * half), c = document.createElement("canvas"); c.width = c.height = N; const x = c.getContext("2d");
  x.filter = `blur(${Math.max(2, 1.1 * k).toFixed(1)}px)`; x.fillStyle = "#fff";
  rings.forEach(r => { x.beginPath(); r.forEach(([px, pz], i) => { const u = (px - cx + half) * k, v = (pz - cz + half) * k; i ? x.lineTo(u, v) : x.moveTo(u, v); }); x.closePath(); x.fill(); });
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; const mat = new THREE.MeshBasicMaterial({ map: tex, color: L(dark ? PAL.dark.cshadow : PAL.light.cshadow), transparent: true, opacity: dark ? .55 : .42, depthWrite: false, toneMapped: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * half, 2 * half).rotateX(-Math.PI / 2), mat); m.position.set(cx, .075, cz); m.userData.keep = true; m.userData.ownMat = true; m.userData.cshadow = true; m.renderOrder = 1; G.add(m); return m; }
function trees(pts) { const n = pts.length, can = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.8, 1), std("#C8CDB9", { roughness: .95, flatShading: true }), n), tr = new THREE.InstancedMesh(new THREE.CylinderGeometry(.18, .26, 2.4, 8), M.trunk, n);
  can.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); can.castShadow = true; tr.castShadow = true; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), tones = ["#C6CBB6", "#D1D4C2", "#BFC5AF", "#D6D7C6"].map(L);
  pts.forEach(([x, z, s0], k) => { const s = s0 || .62 + (Math.abs(Math.round(x)) % 4) * .05; m4.compose(new THREE.Vector3(x, 1.2 * s, z), q, new THREE.Vector3(s, s, s)); tr.setMatrixAt(k, m4);
    m4.compose(new THREE.Vector3(x, 3.1 * s, z), q.setFromEuler(new THREE.Euler(0, k, 0)), new THREE.Vector3(s, s * 1.15, s)); can.setMatrixAt(k, m4); can.setColorAt(k, tones[k % 4]); q.identity(); });
  TG.add(can, tr); }

// ---------- real sites: footprints → rooms → departments → anchors
// data pack coordinates are [east, north] metres from the address point; the scene uses x = east, z = -north
const W2 = p => [p[0], -p[1]];
const polyArea = r => { let a = 0; for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return a / 2; };
const inPoly = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / ((zj - zi) || 1e-9) + xi) c = !c; } return c; };
const segD = (px, pz, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / L2)); return Math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz); };
const lineD = (px, pz, line) => { let d = 1e9; for (let i = 0; i < line.length - 1; i++) d = Math.min(d, segD(px, pz, line[i], line[i + 1])); return d; };
// a room frame: centre, unit axes U (along) and V (toward the front), half extents hu, hv. P(u, v) → [x, z]
function frameOf(obbIn, fdir) { const a = -obbIn.angle; let U = [Math.cos(a), Math.sin(a)], V = [-U[1], U[0]], hu = obbIn.length / 2, hv = obbIn.width / 2; const c = [obbIn.cx, -obbIn.cy];
  // choose the face that looks at the street as +V; swap axes when the street is at a short end
  const cand = [[V, hu, hv, U], [[-V[0], -V[1]], hu, hv, [-U[0], -U[1]]], [U, hv, hu, [-V[0], -V[1]]], [[-U[0], -U[1]], hv, hu, V]];
  let best = cand[0], bd = -2; cand.forEach(cd => { const d = cd[0][0] * fdir[0] + cd[0][1] * fdir[1]; if (d > bd) { bd = d; best = cd; } });
  const Vf = best[0], Uf = best[3]; return { c, U: Uf, V: Vf, hu: best[1], hv: best[2], yaw: -Math.atan2(Uf[1], Uf[0]), P: (u, v) => [c[0] + Uf[0] * u + Vf[0] * v, c[1] + Uf[1] * u + Vf[1] * v] }; }
const yawV = F => -Math.atan2(F.V[1], F.V[0]); // a car facing the frame's +V (the street side)
// department layouts inside a rectangle [u0,u1]×[v0,v1] of a frame F (v1 is the street side). Each returns anchors it created.
function deptShowroom(F, u0, u1, v0, v1, A, glassEdge) {
  const P = (u, v) => F.P(u, v), yaw = F.yaw, w = u1 - u0, d = v1 - v0;
  // turntables: 4.6 × 7.8 cells near the glass, up to 8
  const cols = Math.max(1, Math.min(4, Math.floor((w - 1.5) / 4.8))), rows = d > 18 ? 2 : 1, n = Math.min(8, cols * rows), uc = (u0 + u1) / 2;
  A.SLOTS = []; for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols), u = uc + (c - (cols - 1) / 2) * 4.8, v = v1 - 5.2 - r * 8; A.SLOTS.push([...P(u, v), yaw]); }
  // sales desks along the back wall, F&I offices at the +u end, lounge by the door at the −u end
  const nd = Math.max(2, Math.min(6, Math.floor((w - 8) / 3.2))); A.DESKS = []; for (let i = 0; i < nd; i++) { const u = u0 + 2 + (i % 3) * Math.min(5.5, (w - 9) / 3) + (i >= 3 ? 1.2 : 0), v = v0 + 2 + Math.floor(i / 3) * 3.4; const p = P(u, v); A.DESKS.push([p[0], p[1], yaw]);
    rbox(1.8, .75, .9, M.desk, p[0], FY + .38, p[1], yaw); const s = P(u, v - .3); rbox(.5, .32, .04, M.screen, s[0], FY + 1, s[1], yaw, false); }
  A.FI = []; const fiN = d > 15 ? 4 : 2; for (let i = 0; i < fiN; i++) { const u = u1 - 3.2, v = v0 + 1.8 + i * 3.5; const p = P(u, v); A.FI.push([p[0], p[1], yaw]);
    rbox(1.6, .75, .8, M.desk, p[0], FY + .38, p[1], yaw); const c1 = P(u + 1.3, v - .2), c2 = P(u + 1.3, v + .6); rbox(.5, .5, .5, M.sofa, c1[0], FY + .25, c1[1], yaw); rbox(.5, .5, .5, M.sofa, c2[0], FY + .25, c2[1], yaw); }
  { const a = P(u1 - 6, v0), b = P(u1 - 6, v0 + fiN * 3.5); wall(a[0], a[1], b[0], b[1], 1.6, .08, M.glass); for (let i = 1; i < fiN; i++) { const c = P(u1 - 6, v0 + i * 3.5), e = P(u1 - .3, v0 + i * 3.5); wall(c[0], c[1], e[0], e[1], 1.6, .1); } }
  for (let i = 0; i < 3; i++) { const p = P(u1 - 4.5 + (i % 2) * 2.6, v1 - 5 + i * 2); rbox(2.2, .45, .9, M.sofa, p[0], FY + .23, p[1], yaw); }
  // the door: middle of the glass edge, with the people counter above it and its count line on the floor
  const dm = P(uc, v1), dIn = P(uc, v1 + .5), dOut = P(uc, v1 + 1.2); A.DOOR = { x: dIn[0], z: dIn[1], yaw }; A.SHOW_ENTRY = dOut;
  rbox(3.6, .3, .5, M.cap, dm[0], FY + 2.35, dm[1], yaw); rbox(.42, .1, .3, M.wall, P(uc, v1 + .2)[0], FY + 2.15, P(uc, v1 + .2)[1], yaw);
  A.fixed.push({ k: "showroom", p: [...P(uc, v1 - d / 2), 4.6], v: ["site", "showroom"] }, { k: "fi", p: [...P(u1 - 3, v0 + 5), 2.6], v: ["site", "showroom", "fi"] }, { k: "desks", p: [...P(u0 + 5, v0 + 2), 2.3], v: ["showroom"] },
    { k: "lng", p: [...P(u1 - 3.5, v1 - 3), 2.2], v: ["showroom"] }, { k: "door", p: [dOut[0], dOut[1], 3.4], v: ["showroom"] });
  A.centre.showroom = P(uc, (v0 + v1) / 2); A.centre.fi = P(u1 - 3, v0 + 5); A.centre.desks = P(u0 + 5, v0 + 3); A.centre.lounge = P(u1 - 3.5, v1 - 3);
}
function deptMarketing(F, u0, u1, v0, v1, A) {
  const P = (u, v) => F.P(u, v), yaw = F.yaw, w = u1 - u0, d = v1 - v0, cols = Math.max(2, Math.min(4, Math.floor(w / 3.2))), du = Math.min(3.6, (w - 1) / cols), dv = Math.min(3.4, (d - 3) / 2);
  A.MDESK = []; for (let i = 0; i < 8; i++) { const u = u0 + 1.4 + (i % cols) * du, v = v0 + 2.6 + Math.floor(i / cols) * dv; const p = P(u, v); A.MDESK.push([p[0], p[1], yaw]);
    rbox(2.4, .75, 1, M.desk, p[0], FY + .38, p[1], yaw); const s1 = P(u - .5, v - .35), s2 = P(u + .4, v - .35); rbox(.7, .42, .04, M.screen, s1[0], FY + 1.05, s1[1], yaw, false); rbox(.7, .42, .04, M.screen, s2[0], FY + 1.05, s2[1], yaw, false); }
  const uc = (u0 + u1) / 2, bp = P(uc, v0 + .3), ip = P(uc, v0 + 1.6); A.BOARD = { x: bp[0], y: FY + 2.3, z: bp[1], yaw }; A.INBOX = { x: ip[0], z: ip[1], yaw }; rbox(Math.min(9, w - 1), .7, 1.2, M.dark, ip[0], FY + .35, ip[1], yaw);
  // glass partition toward the showroom
  const a = P(u0, v0), b = P(u1, v0), c = P(u1, v1), e = P(u0, v1); wall(a[0], a[1], b[0], b[1], 2.4); wall(b[0], b[1], c[0], c[1], 1.6, .08, M.glass); wall(c[0], c[1], e[0], e[1], 1.6, .08, M.glass);
  A.fixed.push({ k: "mkt", p: [...P(uc, (v0 + v1) / 2), 4.6], v: ["site", "marketing"] }); A.centre.mkt = P(uc, (v0 + v1) / 2);
}
function deptWorkshop(F, u0, u1, v0, v1, A) {
  const P = (u, v) => F.P(u, v), yaw = F.yaw, yawN = yawV(F) + Math.PI /* nose in, away from the doors */, w = u1 - u0, d = v1 - v0;
  // 19 hoists at 2.25 m pitch in rows parallel to the doors (the +V edge), nose toward the doors
  const per = Math.max(4, Math.floor((w - 1) / 2.25)), rows = Math.ceil(NB / per), pitchV = Math.min(6.5, Math.max(5.2, (d - 3) / rows));
  A.BAY = []; for (let i = 0; i < NB; i++) { const r = Math.floor(i / per), c = i % per, inRow = Math.min(per, NB - r * per), u = (u0 + u1) / 2 + (c - (inRow - 1) / 2) * 2.25, v = v1 - 3.4 - r * pitchV; const p = P(u, v); A.BAY.push([p[0], p[1], yawN]);
    hoistAt(P(u - 1.05, v - 1.4), P(u + 1.05, v - 1.4), yaw); const l = P(u - 1.11, v - .2); rbox(.06, .01, 5.6, M.line, l[0], FY + .01, l[1], yaw, false); }
  A.TECH_AT = ([x, z]) => { const o = [F.V[0] * -2 + F.U[0] * 1.35, F.V[1] * -2 + F.U[1] * 1.35]; return [x + o[0], z + o[1]]; };
  A.TECH_IDLE = Array.from({ length: 24 }, (_, i) => P(u0 + 2 + (i % 6) * .9, v0 + 1 + Math.floor(i / 6) * .9));
  // lounge and reception by the doors at the −u end
  A.LOUNGE_W = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const p = P(u0 + 1.6 + c * 2.5, v1 - 1.6 - r * 2.1); if (r === 0 || d > 14) { rbox(1.4, .45, .8, M.sofa, p[0], FY + .23, p[1], yaw); A.LOUNGE_W.push(p); } }
  const rp = P(u0 + 8, v1 - 1.8); rbox(4.6, 1.05, 1.1, M.desk, rp[0], FY + .53, rp[1], yaw); rbox(4.6, .06, 1.2, M.dark, rp[0], FY + 1.08, rp[1], yaw); A.RECEPTION = [P(u0 + 6.8, v1 - 2.8), P(u0 + 9.2, v1 - 2.8)];
  A.fixed.push({ k: "work", p: [...P((u0 + u1) / 2, (v0 + v1) / 2), 4.6], v: ["site", "workshop"] }, { k: "lounge", p: [...P(u0 + 4, v1 - 3), 2.6], v: ["workshop"] }, { k: "hc", p: [...P((u0 + u1) / 2 - 6, v1 - 3.4), 5.6], v: ["workshop"] });
  A.centre.work = P((u0 + u1) / 2, (v0 + v1) / 2); A.centre.bay = P((u0 + u1) / 2, v1 - 3.4); A.centre.lounge = P(u0 + 4, v1 - 3); A.centre.doors = P((u0 + u1) / 2, v1 + 1);
}
function deptParts(F, u0, u1, v0, v1, A) {
  // racking: rows of shelving 3.1 m apart across the room, in banks of up to 10 m along it with 3.5 m cross-aisles, filling the room
  const P = (u, v) => F.P(u, v), yaw = F.yaw, w = u1 - u0, d = v1 - v0, len = Math.min(10, d - 4), rows = Math.max(1, Math.min(6, Math.floor((w - 2) / 3.1))), banks = Math.max(1, Math.min(4, Math.floor((d - 5) / (len + 3.5)))), binCols = ["#DDD8CE", "#CFD5D8", "#D9CDB9", "#D0D6CB", "#E3DFD7"].map(L);
  const bins = new THREE.InstancedMesh(new THREE.BoxGeometry(.7, .5, .7), std("#ffffff", { roughness: .8 }), rows * banks * 3 * 13); let k = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), s1 = new THREE.Vector3(1, 1, 1);
  A.AISLES = [];
  for (let bk = 0; bk < banks; bk++) for (let r = 0; r < rows; r++) { const u = u0 + 2 + r * 3.1, vc = v0 + 1.5 + len / 2 + bk * (len + 3.5); const rc = P(u, vc);
    [.1, 1.2, 2.3].forEach(h => rbox(.9, h > .1 ? .06 : .08, len, M.rack, rc[0], FY + h, rc[1], yaw)); [-len / 2, 0, len / 2].forEach(dv => { const pp = P(u, vc + dv); rbox(.9, 2.5, .1, M.shelf, pp[0], FY + 1.25, pp[1], yaw); });
    for (let s = 0; s < 3; s++) for (let i = 0; i < Math.floor(len / .8); i++) { if ((r * 7 + s * 3 + i + bk) % 5 === 0) continue; const pp = P(u, vc - len / 2 + .5 + i * .8); m4.compose(new THREE.Vector3(pp[0], FY + .4 + s * 1.12, pp[1]), q, s1); bins.setMatrixAt(k, m4); bins.setColorAt(k, binCols[(r + i + s + bk) % 5]); k++; }
    if (A.AISLES.length < 6 && r < rows - 1) A.AISLES.push([P(u + 1.55, vc - len / 2), P(u + 1.55, vc + len / 2)]); }
  if (!A.AISLES.length) A.AISLES.push([P(u0 + 3.6, v0 + 1.5), P(u0 + 3.6, v0 + 1.5 + len)]);
  bins.count = k; bins.castShadow = true; TG.add(bins);
  const cp = P(u0 + 2.5, v1 - 1.2); rbox(4, 1.05, .9, M.desk, cp[0], FY + .53, cp[1], yaw); A.COUNTER = P(u0 + 2.5, v1 - 2.2); A.PARTS_DOOR = P(u0 + 2.5, v1 + 1.5);
  const pc = P(u0 + 2 + (rows - 1) * 1.55, v0 + 1.5 + (banks * (len + 3.5) - 3.5) / 2);
  A.fixed.push({ k: "parts", p: [...pc, 4.6], v: ["site", "parts"] }); A.centre.parts = pc;
}
function deptUsed(F, u0, u1, v0, v1, A) {
  const P = (u, v) => F.P(u, v), yaw = F.yaw, yawN = yawV(F) + Math.PI /* nose in */, w = u1 - u0, d = v1 - v0, ua = u0 + 2.5;
  // appraisal lane with a scan arch at the −u end, three recon hoists in the middle, a photo cyclorama at the +u end
  { const a = P(ua, v0 + .5), b = P(ua, v1 - .5); rbox(.06, .01, d - 1, M.line, (a[0] + b[0]) / 2, FY + .005, (a[1] + b[1]) / 2, yaw, false); const l = P(ua - 1.9, (v0 + v1) / 2), r = P(ua + 1.9, (v0 + v1) / 2), t = P(ua, (v0 + v1) / 2);
    rbox(.18, 3, .18, M.cap, l[0], FY + 1.5, l[1], yaw); rbox(.18, 3, .18, M.cap, r[0], FY + 1.5, r[1], yaw); rbox(4, .2, .3, M.cap, t[0], FY + 3, t[1], yaw); }
  A.APR = { from: P(ua, v1 + 12), lanes: [P(ua, v1 - d * .4), P(ua, v0 + 3)], yawIn: yawN, yawOut: yawN + Math.PI, staff: [F.U[0] * -1.3 + F.V[0] * 1.2, F.U[1] * -1.3 + F.V[1] * 1.2] };
  A.RECON = []; const ru = Math.min(3, Math.floor((w - 12) / 3.7)); for (let i = 0; i < 3; i++) { const u = ua + 5.5 + (i % Math.max(1, ru)) * 3.7, v = (v0 + v1) / 2 + (i >= ru ? -6 : 0); const p = P(u, v); A.RECON.push([p[0], p[1], yawN]);
    hoistAt(P(u - 1.05, v - 1.4), P(u + 1.05, v - 1.4), yaw); }
  const pu = u1 - 4.4, pc = P(pu, (v0 + v1) / 2); { const cyc = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(4.4, d / 2 - .5), Math.min(4.4, d / 2 - .5), 3.2, 32, 1, true, Math.PI * 0.5, Math.PI), M.cyc); cyc.material.side = THREE.DoubleSide; cyc.position.set(pc[0], FY + 1.6, pc[1]); cyc.rotation.y = Math.PI / 2 + yaw; add(cyc, false, true); }
  A.PHOTO = pc; A.PHOTO_STAFF = [F.U[0] * -3 + F.V[0] * 3, F.U[1] * -3 + F.V[1] * 3]; A.PHOTO_OUT = P(pu, v1 + 6);
  A.fixed.push({ k: "apr", p: [...P(ua, (v0 + v1) / 2), 4.4], v: ["site", "used"] }, { k: "recon", p: [...P(ua + 9, (v0 + v1) / 2), 4.2], v: ["used"] }, { k: "photo", p: [pc[0], pc[1], 4.2], v: ["used"] });
  A.centre.apr = P(ua, (v0 + v1) / 2); A.centre.recon = A.RECON[1].slice(0, 2); A.centre.photo = pc;
}
// walls around a polygon room: glass where the edge faces the street and lies in a showroom zone, a low wall (doors open) for workshop zones
function roomWalls(poly, F, zonesV, h, wmat = M.wall) { for (let i = 0; i < poly.length - 1; i++) { const a = poly[i], b = poly[i + 1], mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const ex = b[0] - a[0], ez = b[1] - a[1], len = Math.hypot(ex, ez); if (len < .3) continue; let nx = ez / len, nz = -ex / len; // outward normal for a clockwise ring in (x,z)
    const cx = F.c[0], cz = F.c[1]; if ((mx - cx) * nx + (mz - cz) * nz < 0) { nx = -nx; nz = -nz; }
    const facing = nx * F.V[0] + nz * F.V[1], u = (mx - cx) * F.U[0] + (mz - cz) * F.U[1], v = (mx - cx) * F.V[0] + (mz - cz) * F.V[1]; let zone = null;
    zonesV.forEach(zn => { if (u >= zn.u0 - 1.4 && u <= zn.u1 + 1.4 && v >= zn.v0 - 1.4 && v <= zn.v1 + 1.4) zone = zn; });
    const fz = zone ? facing * (zone.front || 1) : 0; // > .6 when the edge is this zone's own front
    if (fz > .6 && zone.k === "showroom") { wall(a[0], a[1], b[0], b[1], 3.2, .12, M.glass); for (let t = 0; t < len; t += 4.5) boxM(.16, 3.2, .16, M.cap, a[0] + ex * t / len, FY + 1.6, a[1] + ez * t / len); }
    else if (fz > .6 && (zone.k === "workshop" || zone.k === "used")) wall(a[0], a[1], b[0], b[1], 1.0, .2, wmat);
    else wall(a[0], a[1], b[0], b[1], h, .25, wmat); } }
function buildReal(site, P_, roles) {
  const A = { key: site.k, label: "Footprints · LINZ · CC BY", real: true, sun: { lat: P_.lat, lon: P_.lon }, fixed: [], centre: {}, plinth: [], dirs: {} };
  const fdir = W2(P_.frontage.dir), own = P_.buildings.filter(b => b.site), ctx = P_.buildings.filter(b => !b.site && Math.hypot(b.obb.cx, b.obb.cy) < 115);
  // ground: paper to the horizon, roads from the centrelines, the site's parcels as a concrete slab, neighbours as pale card blocks
  add(new THREE.Mesh(new THREE.CircleGeometry(700, 64).rotateX(-Math.PI / 2), M.grass), false, true).position.y = -0.02;
  P_.roads.forEach(r => { const pts = r.polyline.map(W2), w = r.width || 8; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < .2) continue; const yaw = -Math.atan2(b[1] - a[1], b[0] - a[0]);
      rbox(len + w * .6, .04, w, M.road, (a[0] + b[0]) / 2, .01, (a[1] + b[1]) / 2, yaw, false); rbox(len + w * .6 + .5, .02, w + .5, M.kerb, (a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2, yaw, false);
      if (w >= 9) for (let t = 3; t < len - 1.5; t += 7) { const x = a[0] + (b[0] - a[0]) * t / len, z = a[1] + (b[1] - a[1]) * t / len; rbox(3, .005, .18, M.line, x, .035, z, yaw, false); } } });
  P_.paved.forEach(p => { if (/parking|dealership|car/.test(p.kind)) { const r = p.polygon.map(W2); if (Math.abs(polyArea(r)) > 40) prism(r, .005, .03, M.asphalt, false); } });
  const siteRings = P_.siteParcels.map(p => p.polygon.map(W2)); siteRings.forEach(r => prism(r, .01, .06, M.concrete, false));
  P_.parcels.forEach(p => { const r = p.polygon.map(W2); for (let i = 0; i < r.length - 1; i++) { const a = r[i], b = r[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len > .5) rbox(len, .012, .14, M.parcel, (a[0] + b[0]) / 2, .005, (a[1] + b[1]) / 2, -Math.atan2(b[1] - a[1], b[0] - a[0]), false); } });
  // neighbours recede: lower than their estimated height and close to the paper, so the site's own buildings lead
  ctx.forEach(b => { const r = b.polygon.map(W2), h = Math.min(3.2, b.heightM * .55); prism(r, 0, h, M.ctx); prism(r, h, .1, M.ctxCap, false); });
  // foam-ball trees where OpenStreetMap maps them (natural=tree, tree rows, woods)
  if (P_.trees && P_.trees.length) trees(P_.trees.filter(t => !own.some(b => inPoly(t.xy[0], -t.xy[1], b.polygon.map(W2)))).map(t => [t.xy[0], -t.xy[1], t.kind === "tree" ? .78 : .62]));
  // the site's buildings: floor slab, then rooms with zones
  const zonesAll = []; let main = null;
  const need = { showroom: true, marketing: true, fi: true, workshop: true, parts: true, used: true };
  const siteHas = { sales: /S/.test(site.fnCode), service: /V/.test(site.fnCode), parts: /P/.test(site.fnCode) };
  const placed = {};
  TG = IG; A.fp = [];
  own.sort((a, b) => b.areaM2 - a.areaM2).forEach(b => { const role = (roles[b.id] && roles[b.id].role) || b.role || "store", r = b.polygon.map(W2), F = frameOf(b.obb, fdir);
    if (polyArea(r) > 0) r.reverse(); // keep rings clockwise in (x, z) so roomWalls' outward normals are right
    // the massing for the site view: the footprint extruded to the estimated height, walls in the use's card tone, roof a touch darker
    { const [wk, rk] = USE[role] || USE.store, sh = new THREE.Shape(); r.forEach(([x, z], i) => i ? sh.lineTo(x, -z) : sh.moveTo(x, -z));
      const g = new THREE.ExtrudeGeometry(sh, { depth: FY + (b.heightM || 5), bevelEnabled: false }); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, [M[rk], M[wk]]); m.castShadow = m.receiveShadow = true; m.userData.keep = true; SG.add(m);
      A.fp.push({ id: b.id, role, ring: r.map(p => [+p[0].toFixed(2), +p[1].toFixed(2)]), h: FY + (b.heightM || 5) }); }
    const wallMat = M[(USE[role] || USE.store)[0]];
    prism(r, 0, FY, role === "showroom" || role === "showroom+workshop" ? M.polish : M.floor, false);
    if (!main) main = { F, b, r };
    const zones = [], hu = F.hu - .6, hv = F.hv - .6, w = 2 * hu, d = 2 * hv;
    if (role === "showroom" || role === "showroom+workshop") {
      const showD = role === "showroom" ? Math.min(d, 26) : Math.min(d * .5, 26), mkW = w > 30 ? Math.min(14, w * .3) : 0, mkD = Math.min(12, showD * .5);
      const su0 = -hu + mkW, su1 = hu, sv0 = hv - showD, sv1 = hv;
      zones.push({ k: "showroom", u0: su0, u1: su1, v0: sv0, v1: sv1 }); if (mkW) zones.push({ k: "marketing", u0: -hu, u1: -hu + mkW, v0: sv0, v1: sv0 + mkD });
      if (role === "showroom+workshop") { const wv1 = sv0 - 1; let wu0 = -hu, wu1 = hu; if (w > 44 && !placed.parts) { zones.push({ k: "parts", u0: hu - 12, u1: hu, v0: -hv, v1: wv1, front: -1 }); wu1 = hu - 13; }
        zones.push({ k: "workshop", u0: wu0, u1: wu1, v0: -hv, v1: wv1, front: -1 }); } // the workshop opens to the rear yard, away from the street
      else if (w > 40 && !placed.used) { zones.push({ k: "used", u0: hu - 24, u1: hu, v0: -hv, v1: sv0 - 1 }); }
    } else if (role === "workshop") { let wu1 = hu; if (w > 50 && !placed.parts && !own.some(x => (roles[x.id] && roles[x.id].role) === "parts")) { zones.push({ k: "parts", u0: hu - 12, u1: hu, v0: -hv, v1: hv }); wu1 = hu - 13; }
      if (d > 28 && !placed.used) { zones.push({ k: "used", u0: -hu, u1: wu1, v0: -hv, v1: -hv + 14 }); zones.push({ k: "workshop", u0: -hu, u1: wu1, v0: -hv + 15, v1: hv }); } else zones.push({ k: "workshop", u0: -hu, u1: wu1, v0: -hv, v1: hv }); }
    else if (role === "parts") zones.push({ k: "parts", u0: -hu, u1: hu, v0: -hv, v1: hv });
    else if (role === "used") zones.push({ k: "used", u0: -hu, u1: hu, v0: -hv, v1: hv });
    else zones.push({ k: "store", u0: -hu, u1: hu, v0: -hv, v1: hv });
    const Fb = { c: F.c, U: [-F.U[0], -F.U[1]], V: [-F.V[0], -F.V[1]], hu: F.hu, hv: F.hv, yaw: F.yaw + Math.PI, P: (u, v) => F.P(-u, -v) }; // the same room seen from the back
    zones.forEach(zn => { zn.F = F; zonesAll.push(zn); const Fz = zn.front === -1 ? Fb : F, u0 = zn.front === -1 ? -zn.u1 : zn.u0, u1 = zn.front === -1 ? -zn.u0 : zn.u1, v0 = zn.front === -1 ? -zn.v1 : zn.v0, v1 = zn.front === -1 ? -zn.v0 : zn.v1;
      if (zn.k === "showroom") { deptShowroom(Fz, u0, u1, v0, v1, A); placed.showroom = true; } else if (zn.k === "marketing") { deptMarketing(Fz, u0, u1, v0, v1, A); placed.marketing = true; }
      else if (zn.k === "workshop") { deptWorkshop(Fz, u0, u1, v0, v1, A); placed.workshop = true; A.dirs.work = Fz.V; } else if (zn.k === "parts") { deptParts(Fz, u0, u1, v0, v1, A); placed.parts = true; A.dirs.parts = Fz.V; } else if (zn.k === "used") { deptUsed(Fz, u0, u1, v0, v1, A); placed.used = true; A.dirs.used = Fz.V; }
      else { for (let i = 0; i < 2; i++) { const p = F.P(-hu + 2 + i * 2.2, 0); rbox(1.6, 1.2, 1.2, M.rack, p[0], FY + .6, p[1], F.yaw); } } });
    roomWalls(r, F, zones, role === "store" ? 2.6 : 3.2, wallMat);
    // a fascia along the street face, I-beams across larger rooms
    if (role !== "store" && F.hu > 8) { const fa = F.P(-F.hu, F.hv + .1), fb = F.P(F.hu, F.hv + .1); const m = rbox(2 * F.hu + .4, .25, .9, M.cap, (fa[0] + fb[0]) / 2, FY + 3.3, (fa[1] + fb[1]) / 2, F.yaw); }
  });
  TG = G;
  // departments the site does not have go on a plinth beside the model, labelled as elsewhere in the group
  const ext = P_.extent, back = [-fdir[0], -fdir[1]], mainF = main ? main.F : { U: [1, 0], V: [0, 1], c: [0, 0], hu: 10, hv: 10, yaw: 0, P: (u, v) => [u, v] };
  const sx = (ext[0] + ext[2]) / 2, sz = -(ext[1] + ext[3]) / 2, half = Math.max(ext[2] - ext[0], ext[3] - ext[1]) / 2;
  contactShadow([...own, ...ctx].map(b => b.polygon.map(W2)), sx, sz, Math.min(160, half + 90));
  const missing = []; if (!placed.showroom) missing.push(["showroom", 27, 24]); if (!placed.marketing) missing.push(["marketing", 14, 10]); if (!placed.workshop) missing.push(["workshop", 46, 22]); if (!placed.parts) missing.push(["parts", 14, 16]); if (!placed.used) missing.push(["used", 27, 16]);
  if (missing.length) { const totalW = missing.reduce((a, m) => a + m[1] + 5, 0) - 5, depth = Math.max(...missing.map(m => m[2]));
    const pc = [sx + back[0] * (half + 22 + depth / 2), sz + back[1] * (half + 22 + depth / 2)], U = [-back[1], back[0]], V = [-back[0], -back[1]] /* the plinth faces the site */;
    const Pp = (u, v) => [pc[0] + U[0] * u + V[0] * v, pc[1] + U[1] * u + V[1] * v], yawP = -Math.atan2(U[1], U[0]);
    rbox(totalW + 8, .3, depth + 8, M.plinth, pc[0], -.15 + .3 / 2 - .02, pc[1], yawP, false); rbox(totalW + 8, .02, depth + 8, M.plinth, pc[0], .14, pc[1], yawP, false);
    let u = -totalW / 2; missing.forEach(([k, w, d]) => { const c = Pp(u + w / 2, 0), F = { c, U, V, hu: w / 2, hv: d / 2, yaw: yawP, P: (uu, vv) => [c[0] + U[0] * uu + V[0] * vv, c[1] + U[1] * uu + V[1] * vv] };
      const corners = [F.P(-w / 2, -d / 2), F.P(w / 2, -d / 2), F.P(w / 2, d / 2), F.P(-w / 2, d / 2)]; corners.push(corners[0]); const r = corners.slice(); if (polyArea(r) > 0) r.reverse();
      prism(r, .14, FY - .14, k === "showroom" ? M.polish : M.floor, false); const zn = { k, u0: -w / 2 + .6, u1: w / 2 - .6, v0: -d / 2 + .6, v1: d / 2 - .6, F };
      if (k === "showroom") deptShowroom(F, zn.u0, zn.u1, zn.v0, zn.v1, A); else if (k === "marketing") deptMarketing(F, zn.u0, zn.u1, zn.v0, zn.v1, A); else if (k === "workshop") { deptWorkshop(F, zn.u0, zn.u1, zn.v0, zn.v1, A); A.dirs.work = V; } else if (k === "parts") { deptParts(F, zn.u0, zn.u1, zn.v0, zn.v1, A); A.dirs.parts = V; } else { deptUsed(F, zn.u0, zn.u1, zn.v0, zn.v1, A); A.dirs.used = V; }
      roomWalls(r, F, [zn], 3.2, M[(USE[k] || USE.store)[0]]); const lp = F.P(0, d / 2 + 2); A.plinth.push({ k, p: [lp[0], 3.6, lp[1]] }); u += w + 5; });
    A.plinthCentre = pc; A.plinthFrame = { U, V, w: totalW, d: depth };
  }
  // outdoor slots: a grid aligned with the main building, inside the site parcels, clear of buildings and roads
  const cand = []; { const F = mainF, R = half + 10, step = 2.7, rowStep = 5.8; let ri = 0; for (let v = -R; v <= R; v += rowStep, ri++) { if (ri % 3 === 2) continue; /* every third row is an aisle */ for (let u = -R; u <= R; u += step) { const p = F.P(u, v), x = p[0], z = p[1];
      // a slot is a car's centre: keep 3.2 m (half a ute plus a margin) from any building and from the road edge
      if (!siteRings.some(r => inPoly(x, z, r))) continue; if (own.some(b => { const r = b.polygon.map(W2); return inPoly(x, z, r) || lineD(x, z, r) < 3.2; })) continue;
      if (P_.roads.some(rd => lineD(x, z, rd.polyline.map(W2)) < (rd.width || 8) / 2 + 2.8)) continue; cand.push({ x, z, u, v, yaw: yawV(F), used: false }); } } }
  // how many cars the yard can really hold: the parcel less its buildings, one car and its share of aisle per 32 m²
  const freeM2 = Math.max(0, P_.siteParcels.reduce((a, pc) => a + (pc.areaM2 || 0), 0) - own.reduce((a, b) => a + b.areaM2, 0)), maxSlots = Math.min(cand.length, Math.floor(freeM2 / 32)), share = f => Math.max(0, Math.round(maxSlots * f));
  const take = (n, score) => { const out = []; for (let i = 0; i < n; i++) { let best = null, bs = 1e18; cand.forEach(c => { if (c.used) return; const s = score(c); if (s < bs) { bs = s; best = c; } }); if (!best) break; best.used = true; out.push([best.x, best.z, best.yaw]); } return out; };
  const front = P_.roads.filter(r => r.name === P_.frontage.road).map(r => r.polyline.map(W2)), dFront = (c) => front.length ? Math.min(...front.map(l => lineD(c.x, c.z, l))) : 0;
  const near = (p) => (c) => Math.hypot(c.x - p[0], c.z - p[1]);
  A.OUTD = take(Math.min(10, share(.16)), c => dFront(c) + (A.centre.showroom ? Math.hypot(c.x - A.centre.showroom[0], c.z - A.centre.showroom[1]) * .4 : 0));
  A.QUEUE = take(Math.min(22, share(.26)), near(A.centre.doors || A.centre.work || [sx, sz])); A.DONE = take(Math.min(7, share(.08)), near(A.centre.doors || [sx, sz]));
  A.LANE = take(Math.min(9, share(.1)), near(A.centre.apr || [sx, sz])); A.YARD = take(Math.min(42, share(.4)), near(A.centre.photo || A.centre.apr || [sx, sz]));
  // bay markings for every outdoor slot the grid found
  { const lineYaw = Math.atan2(mainF.V[0], mainF.V[1]); cand.forEach(c => { if (c.used) rbox(.12, .006, 5.2, M.line, c.x + mainF.U[0] * 1.35, .04, c.z + mainF.U[1] * 1.35, lineYaw, false); }); }
  // the street point: the nearest point of the frontage road to the door; cars arrive from and leave to it
  let street = [sx + fdir[0] * (half + 12), sz + fdir[1] * (half + 12)]; if (front.length) { let bd = 1e9; front.forEach(l => { for (let i = 0; i < l.length - 1; i++) { const a = l[i], b = l[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((sx - a[0]) * dx + (sz - a[1]) * dz) / L2)), q = [a[0] + t * dx, a[1] + t * dz], d = Math.hypot(q[0] - sx, q[1] - sz); if (d < bd) { bd = d; street = q; } } }); }
  A.ENTRY = street; A.EXIT = street;
  // handover: in front of the showroom door
  const hp = A.centre.showroom ? [A.DOOR.x + fdir[0] * 6, A.DOOR.z + fdir[1] * 6] : [sx, sz];
  A.HAND = { from: A.centre.fi || hp, bays: [hp, [hp[0] + mainF.U[0] * 4, hp[1] + mainF.U[1] * 4]], to: street, yaw: -Math.atan2(fdir[1], fdir[0]), side: [mainF.U[0] * -2.4, mainF.U[1] * -2.4] };
  A.fixed.push({ k: "deliv", p: [hp[0], hp[1], 3.6], v: ["site", "showroom", "fi"] }, { k: "fore", p: [...(A.QUEUE[5] || A.QUEUE[0] || [sx, sz]).slice(0, 2), 2.4], v: ["workshop"] });
  if (A.YARD.length) { const yc = A.YARD.reduce((a, p) => [a[0] + p[0] / A.YARD.length, a[1] + p[1] / A.YARD.length], [0, 0]); A.fixed.push({ k: "yard", p: [yc[0], yc[1], 3.2], v: ["site", "used"] }); A.centre.yard = yc; }
  if (A.LANE.length) { const l = A.LANE[4] || A.LANE[0]; A.fixed.push({ k: "lane", p: [l[0], l[1], 2.6], v: ["used"] }); }
  if (A.OUTD.length) { const oc = A.OUTD.reduce((a, p) => [a[0] + p[0] / A.OUTD.length, a[1] + p[1] / A.OUTD.length], [0, 0]); A.fixed.push({ k: "outd", p: [oc[0], oc[1], 2.8], v: ["showroom"] }); }
  A.YARD_WALK = [[(A.centre.yard || [sx, sz])[0], (A.centre.yard || [sx, sz])[1], 6, 0], [(A.centre.yard || [sx, sz])[0], (A.centre.yard || [sx, sz])[1], 0, 4]];
  const C = A.centre, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], P3 = (p, y = 1) => v3(p[0], y, p[1]);
  const flow = (k, a, b, liftK = .18) => ({ k, a: P3(a, a[2] || 1), b: P3(b, b[2] || 1), lift: Math.max(3, Math.min(22, Math.hypot(a[0] - b[0], a[1] - b[1]) * liftK)) });
  const inbox = [A.INBOX.x, A.INBOX.z], door = [A.DOOR.x, A.DOOR.z], desks = C.desks || door, fi = C.fi || desks, hand = A.HAND.bays[0], apr = C.apr || hand, recon = C.recon || apr, photo = C.photo || recon, yard = C.yard || photo, queue = A.QUEUE[5] || A.QUEUE[0] || street, bay = C.bay || queue, counter = A.COUNTER || bay, lounge = C.lounge || bay;
  A.FLOWS = [{ k: "leads", a: v3(inbox[0], 26, inbox[1] + .8), b: v3(inbox[0], 1.2, inbox[1] + .2), lift: 0 }, flow("appts", inbox, door), flow("deals", desks, fi), flow("hand", fi, hand), flow("out", hand, street), flow("trade", hand, apr),
    flow("recon", apr, recon), flow("photo", recon, photo), flow("yard", photo, yard), flow("usedsale", yard, desks, .25), flow("ros", street, queue), flow("bays", queue, bay), flow("parts", counter, bay), flow("equity", lounge, desks, .2), { ...flow("hc", bay, street), a: v3(bay[0], 4.2, bay[1]) }];
  A.NODES = [C.mkt || inbox, door, fi, hand, bay, C.parts || counter, apr, recon, photo, yard, queue];
  A.TAGS = A.fixed.map(t => ({ id: t.k, p: [t.p[0], t.p[2], t.p[1]], v: t.v }));
  // cameras: from the street side; the site view frames the parcels, department views frame their rooms
  const cam = (t, dist, h, dir = fdir) => ({ p: [t[0] + dir[0] * dist, h, t[1] + dir[1] * dist], t: [t[0], 0, t[1]] });
  const span = Math.max(60, half * 2 + 16), tgt = [sx - fdir[0] * half * .1, sz - fdir[1] * half * .1], dirs = A.dirs;
  A.VIEWS = { site: cam(tgt, span * .8, span * .74), machine: { p: [sx + fdir[0] * span * .3, span * 1.25, sz + fdir[1] * span * .3], t: [sx, 0, sz] },
    showroom: cam(C.showroom || [sx, sz], 34, 22), used: cam(C.recon || yard, 36, 22, dirs.used || fdir), workshop: cam(bay, 26, 23, dirs.work || fdir), parts: cam(C.parts || counter, 22, 16, dirs.parts || fdir), marketing: cam(C.mkt || inbox, 22, 14), fi: cam(fi, 16, 11) };
  const R = half + 40 + (missing.length ? 60 : 0); A.shadow = { left: -R, right: R, top: R, bottom: -R }; A.sunTarget = [sx, 0, sz]; A.fog = [span * 2.2, span * 4.5];
  A.site = { x: sx, z: sz, half };
  return A;
}
// ---------- layout switching
let A = null, flowMeshes = [], board = null, countLine = null, plinthEls = [];
function clearLayout() { if (!A) return; [G, IG, SG].forEach(g => { g.traverse(m => { if (m.isMesh) { m.geometry.dispose(); if (m.userData.ownMat) [].concat(m.material).forEach(x => { if (x.map) x.map.dispose(); x.dispose(); }); } }); scene.remove(g); });
  G = new THREE.Group(); IG = new THREE.Group(); SG = new THREE.Group(); scene.add(G, IG, SG); TG = G;
  flowMeshes.forEach(m => { scene.remove(m); m.geometry.dispose(); }); flowMeshes = []; if (board) { scene.remove(board); board = null; } if (countLine) { scene.remove(countLine); countLine = null; }
  plinthEls.forEach(e => e.remove()); plinthEls = []; Object.values(tagEls).forEach(e => e.remove()); for (const k in tagEls) delete tagEls[k]; }
function finishLayout(a) { A = a; A.fixed = A.fixed || [];
  board = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.5), boardMat); board.position.set(A.BOARD.x, A.BOARD.y, A.BOARD.z); board.rotation.y = A.BOARD.yaw; scene.add(board);
  countLine = new THREE.Mesh(new THREE.BoxGeometry(3.2, .012, .08), countMat); countLine.position.set(A.DOOR.x, FY + .012, A.DOOR.z); countLine.rotation.y = A.DOOR.yaw; scene.add(countLine);
  A.FLOWS.forEach(f => { const mid = f.a.clone().lerp(f.b, .5); mid.y += f.lift; f.curve = new THREE.QuadraticBezierCurve3(f.a, mid, f.b); f.mesh = new THREE.Mesh(new THREE.TubeGeometry(f.curve, 48, .1, 6, false), flowMat); scene.add(f.mesh); flowMeshes.push(f.mesh); f.col = L(FLOW_COL[f.k] || "#ffffff"); f.rate = 1; });
  // turntables, zones, hoist arms sized to the layout
  turns.count = Math.min(8, A.SLOTS.length); A.SLOTS.forEach(([x, z], i) => { if (i < 8) turns.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, FY + .04, z)); }); turns.instanceMatrix.needsUpdate = true;
  zones.count = Math.min(8, A.SLOTS.length); A.SLOTS.forEach(([x, z, yaw], i) => { if (i < 8) { _q.setFromEuler(_e.set(0, yaw || 0, 0)); _p.set(x, FY + .012, z); _s.set(1, 1, 1); _m.compose(_p, _q, _s); zones.setMatrixAt(i, _m); } }); zones.instanceMatrix.needsUpdate = true;
  A.TAGS.forEach(T => { const e = document.createElement("div"); e.className = "tag"; tagsEl.appendChild(e); tagEls[T.id] = e; });
  (A.plinth || []).forEach(pl => { const e = document.createElement("div"); e.className = "tag"; e.innerHTML = `<b>${{ showroom: "Showroom", marketing: "Marketing and BDC", workshop: "Workshop", parts: "Parts", used: "Used and recon" }[pl.k]}</b> · not on this site<br><span class="m">${A.elsewhere || "runs elsewhere in the group"}</span>`; tagsEl.appendChild(e); plinthEls.push(e); pl.el = e; });
  bake(G); bake(IG); A.hasShell = SG.children.length > 0;
  Object.assign(sun.shadow.camera, A.shadow); sun.shadow.camera.updateProjectionMatrix(); sun.target.position.set(...A.sunTarget); scene.fog.near = A.fog[0]; scene.fog.far = A.fog[1];
  if (!A.sun) sun.position.set(...A.sunPos);
  allocMarques(); if (view) setView(view, true); }
function setLayout(key, siteData, roles, meta) { clearLayout(); vis.clear(); yardInit = null; settle = true; // the first frame on a new layout puts cars straight in their places
  let a; try { a = key === "generic" || !siteData ? buildGeneric() : buildReal(Object.assign({ k: key }, meta || {}), siteData, roles || {}); } catch (e) { console.warn("layout failed, using generic", e); clearLayout(); a = buildGeneric(); }
  if (meta && meta.elsewhere) a.elsewhere = meta.elsewhere; finishLayout(a); }

// ---------- state that persists across frames
const vis = new Map(); let settle = true, site = null, siteF = null, slotMk = [], outMk = [], yardInit = null, view = "site", camGoal = null, machine = 0, dark = false;
function allocMarques() { if (!site || !A) return; const s = site, F = siteF, ms = s.m.map(n => D.MARQUES.findIndex(m => m.n === n)).filter(i => i >= 0);
  const stockSite = F && F.bySite && (F.bySite[s.n] || F.bySite[s.k]);
  const w = ms.map(i => stockSite ? (stockSite[D.MARQUES[i].k] || 0) + .01 : D.MARQUES[i].share);
  const alloc = (n) => { const out = [], tw = w.reduce((a, b) => a + b, 0); const c = ms.map((_, j) => Math.max(ms.length <= n ? 1 : 0, Math.round(n * w[j] / tw)));
    let tot = c.reduce((a, b) => a + b, 0); while (tot > n) { const j = c.indexOf(Math.max(...c)); c[j]--; tot--; } let j = 0; while (tot < n && c.length) { c[j % c.length]++; tot++; j++; }
    ms.forEach((m, j) => { for (let k = 0; k < c[j]; k++) out.push(m); }); return out; };
  slotMk = ms.length ? alloc(A.SLOTS.length) : []; outMk = ms.length ? alloc(Math.max(1, A.OUTD.length)).reverse() : [];
  slotMk.forEach((mk, i) => { if (i < 8) zones.setColorAt(i, TINT[mk].clone().lerp(L("#ffffff"), .35)); }); zones.instanceColor.needsUpdate = true; }
function setSite(s, F) { site = s; siteF = F; allocMarques(); }
function initYard(S) { const R = (() => { let s = 99; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); const W = D.MARQUES.map(m => m.share), tw = W.reduce((a, b) => a + b);
  yardInit = A.YARD.map((p, i) => { let x = R() * tw, mk = 0; for (; mk < W.length; mk++) { x -= W[mk]; if (x <= 0) break; } return { on: R() < .82, mk: Math.min(mk, W.length - 1), r: R() }; }); }

// ---------- the sun for a real site: NOAA-style solar position for the site's latitude and longitude at the model's clock (NZ civil time)
function sunFor(lat, lon, minute) { const now = new Date(), y = now.getFullYear(), m = now.getMonth(), dd = now.getDate();
  const lastSun = (yy, mm) => { const d = new Date(Date.UTC(yy, mm + 1, 0)); return d.getUTCDate() - d.getUTCDay(); }, firstSun = (yy, mm) => { const d = new Date(Date.UTC(yy, mm, 1)); return 1 + (7 - d.getUTCDay()) % 7; };
  const nzdt = (m > 8 || (m === 8 && dd >= lastSun(y, 8))) || (m < 3 || (m === 3 && dd < firstSun(y, 3))); const off = nzdt ? 13 : 12; // NZDT from the last Sunday of September to the first Sunday of April
  const utc = Date.UTC(y, m, dd) + (minute - off * 60) * 60000, jd = utc / 86400000 + 2440587.5, T = (jd - 2451545) / 36525, rad = Math.PI / 180;
  const L0 = (280.46646 + T * 36000.76983) % 360, Mn = 357.52911 + T * 35999.05029, e = 0.016708634 - T * 0.000042037, C = (1.914602 - T * 0.004817) * Math.sin(Mn * rad) + 0.019993 * Math.sin(2 * Mn * rad), lam = L0 + C;
  const eps = 23.439291 - 0.0130042 * T, decl = Math.asin(Math.sin(eps * rad) * Math.sin(lam * rad)), yv = Math.tan(eps / 2 * rad) ** 2;
  const eot = 4 / rad * (yv * Math.sin(2 * L0 * rad) - 2 * e * Math.sin(Mn * rad) + 4 * e * yv * Math.sin(Mn * rad) * Math.cos(2 * L0 * rad) - .5 * yv * yv * Math.sin(4 * L0 * rad) - 1.25 * e * e * Math.sin(2 * Mn * rad));
  const tst = ((minute - off * 60) + eot + 4 * lon + 1440) % 1440, ha = (tst / 4 - 180) * rad, la = lat * rad;
  const el = Math.asin(Math.sin(la) * Math.sin(decl) + Math.cos(la) * Math.cos(decl) * Math.cos(ha));
  let az = Math.acos(Math.max(-1, Math.min(1, (Math.sin(decl) - Math.sin(la) * Math.sin(el)) / (Math.cos(la) * Math.cos(el) || 1e-9)))); if (ha > 0) az = 2 * Math.PI - az; // from north, clockwise
  return { el, az, nzdt }; }
let sunInfo = null;
function applySun(minute) { if (!A || !A.sun) { if (sunInfo) { sunInfo = null; sun.intensity = dark ? KEY.dark : KEY.light; sun.color = L(dark ? "#FFE9CF" : "#FFF6EA"); } return; } const s = sunFor(A.sun.lat, A.sun.lon, minute); sunInfo = { ...s, elDeg: s.el / Math.PI * 180, azDeg: s.az / Math.PI * 180 };
  const el = Math.max(10 * Math.PI / 180, s.el), r = 220, dx = Math.sin(s.az) * Math.cos(el), dz = -Math.cos(s.az) * Math.cos(el), dy = Math.sin(el);
  sun.position.set(A.sunTarget[0] + dx * r, dy * r, A.sunTarget[2] + dz * r); const low = Math.max(0, Math.min(1, (s.el - .05) / .3)); sun.intensity = (dark ? KEY.dark : KEY.light) * (.55 + .45 * low); sun.color = L(low < .5 ? "#FFE3C4" : dark ? "#FFE9CF" : "#FFF6EA"); }

// ---------- theme: day (overcast NZ light) or dusk (lights on)
function applyTheme(isDark) { dark = isDark;
  hemi.intensity = isDark ? AMB.dark : AMB.light; sun.intensity = isDark ? KEY.dark : KEY.light; sun.color = L(isDark ? "#FFE9CF" : "#FFF6EA"); fill.intensity = isDark ? .07 : .1;
  scene.fog.color = new THREE.Color(isDark ? "#1C1B19" : "#EFEBE3"); MAT.head.emissiveIntensity = isDark ? .9 : .12; MAT.tail.emissiveIntensity = isDark ? .5 : .08;
  M.screen.color = L(isDark ? "#C4DCE8" : "#B9CBD4"); M.cyc.emissiveIntensity = isDark ? .35 : .1; flowMat.opacity = isDark ? .3 : .16; flowMat.color = new THREE.Color(isDark ? "#D8D2C6" : "#6B655C");
  const pal = PAL[isDark ? "dark" : "light"]; ["grass", "concrete", "asphalt", "road", "kerb", "parcel", "ctx", "ctxCap", "plinth", "line", "wallShow", "roofShow", "wallWork", "roofWork", "wallNeu", "roofNeu"].forEach(k => M[k].color = L(pal[k]));
  G.traverse(m => { if (m.userData && m.userData.cshadow) { m.material.color = L(pal.cshadow); m.material.opacity = isDark ? .55 : .42; } }); MAT.shadow.opacity = isDark ? .7 : .5;
  renderer.toneMappingExposure = isDark ? EXPO.dark : EXPO.light;
  box.style.background = isDark ? "linear-gradient(180deg,#1A1917 0%,#1E1D1A 60%,#1C1B19 100%)" : "linear-gradient(180deg,#F3F0E9 0%,#EFEBE3 60%,#ECE8E0 100%)"; }

// ---------- frame: place everything for minute t
function lerp(a, b, k) { return a + (b - a) * k; }
const clamp01 = x => Math.max(0, Math.min(1, x));
const at = (arr, i) => arr.length ? arr[((i % arr.length) + arr.length) % arr.length] : null;
function place(st, dt, realT) {
  const { d, ev, S, F } = st, t = d.t, k = Math.min(1, dt * 3);
  carBegin(); pn = 0;
  // workshop: forecourt queue, hoists, finished cars; technicians; lounge
  // every waiting or finished car gets its own slot (queue first, then the done row, then any queue slot left); a car with no free
  // slot is not drawn rather than stacked on another
  let qi = 0, di = 0; const shown = d.jobs.filter(j => j.state !== "booked" && !(j.state === "done" && t - j.end > 90)).sort((a, b) => (a.state === "done") - (b.state === "done"));
  shown.forEach(j => { let tg; if (j.state === "work") { const b = A.BAY[j.bay] || A.BAY[0]; tg = [b[0], FY + (j.k === "express" ? .05 : 1.25), b[1], b[2]]; }
    else if (j.state === "queue") { const q = A.QUEUE[qi++]; if (!q) return; tg = [q[0], .06, q[1], q[2]]; }
    else { const q = A.DONE[di++] || A.QUEUE[qi++]; if (!q) return; tg = [q[0], .06, q[1], q[2]]; }
    let v = vis.get(j.id); if (!v) { v = settle ? { x: tg[0], y: tg[1], z: tg[2], r: tg[3] } : { x: A.ENTRY[0], y: .06, z: A.ENTRY[1], r: tg[3] }; vis.set(j.id, v); }
    v.x += (tg[0] - v.x) * k; v.y += (tg[1] - v.y) * k; v.z += (tg[2] - v.z) * k; v.r = tg[3];
    car(bodyOf(j.brand, j.body), v.x, v.y, v.z, v.r, j.brand, j.id); });
  let hn = 0; d.jobs.forEach(j => { if (j.state !== "work" && !(j.state === "done" && t - j.end < 20)) return; const h = hcOf(j, S), stg = D.hcStage(h, t); if (!stg || stg === "hoist" || hn >= 22) return;
    const b = j.state === "work" ? (A.BAY[j.bay] || A.BAY[0]) : (at(A.DONE, j.id) || A.BAY[0]), pulse = stg === "filming" ? .75 + .25 * Math.sin(realT * 9) : 1;
    _q.setFromEuler(_e.set(-.25, 0, 0)); _p.set(b[0], (j.state === "work" ? FY + 3.9 : 2.6) + Math.sin(realT * 1.6 + j.id) * .08, b[1] + .4); _s.set(pulse, pulse, pulse); _m.compose(_p, _q, _s);
    hcCards.setMatrixAt(hn, _m); hcCards.setColorAt(hn, HCC[stg] || HCC.sent); hn++; });
  hcCards.count = hn; hcCards.instanceMatrix.needsUpdate = true; if (hcCards.instanceColor) hcCards.instanceColor.needsUpdate = true;
  // door counter: the count line glows as a group walks in
  const entering = ev.visits.some(v => t >= v.t && t < v.t + 1.2); countMat.opacity = entering ? 1 : .35 + (dark ? .2 : 0);
  for (let b = 0; b < NB; b++) { const j = d.jobs.find(x => x.state === "work" && x.bay === b), [x, z, yaw] = A.BAY[b] || A.BAY[0]; _q.setFromEuler(_e.set(0, yaw - FACE.n, 0)); _s.set(1, 1, 1); _p.set(x, FY + (j && j.k !== "express" ? 1.5 : .08), z); _m.compose(_p, _q, _s); lifts.setMatrixAt(b, _m); }
  A.RECON.forEach(([x, z, yaw], i) => { const on = ev.recon.find(r => r.bay === i && r.t0 <= t && t < r.t1); _q.setFromEuler(_e.set(0, yaw - FACE.n, 0)); _p.set(x, FY + (on ? 1.5 : .08), z); _m.compose(_p, _q, _s); lifts.setMatrixAt(19 + i, _m); });
  lifts.instanceMatrix.needsUpdate = true;
  const working = d.jobs.filter(j => j.state === "work");
  for (let i = 0; i < S.techs; i++) { const j = working[i]; if (j) { const b = A.BAY[j.bay] || A.BAY[0], p = A.TECH_AT(b); person(p[0], p[1] + Math.sin(realT * .8 + i) * .25, PC.tech); } else { const p = at(A.TECH_IDLE, i); if (p) person(p[0], p[1], PC.tech); } }
  const waiting = d.jobs.filter(j => j.waiter && (j.state === "queue" || j.state === "work"));
  waiting.slice(0, 12).forEach((j, i) => { const p = at(A.LOUNGE_W, i); if (p) person(p[0], p[1], PC.cust[j.id % 6], FY, true); });
  A.RECEPTION.forEach(p => person(p[0], p[1], PC.staff));
  // showroom display: turntables turn slowly; outdoor rows are static
  A.SLOTS.forEach(([x, z], i) => { const mk = slotMk[i]; if (mk == null) return; car(bodyOf(mk, (i * .37) % 1), x, FY + .08, z, realT * .12 + i * .9, mk, 1000 + i); });
  A.OUTD.forEach(([x, z, yaw], i) => { const mk = outMk[i]; if (mk == null) return; car(bodyOf(mk, (i * .53) % 1), x, .06, z, yaw, mk, 2000 + i); });
  A.DESKS.forEach(([x, z]) => person(x, z - 1, PC.staff, FY, true));
  const inRoom = ev.visits.filter(v => v.t <= t && t < v.end), atDesk = new Set();
  inRoom.forEach((v, i) => { const kk = clamp01((t - v.t) / 4), dk = v.desk % A.DESKS.length, free = !atDesk.has(dk) && atDesk.size < A.DESKS.length; let tx, tz;
    if (free) { atDesk.add(dk); [tx, tz] = A.DESKS[dk]; tz += .9; } else { const s = at(A.SLOTS, v.id) || A.DESKS[0]; tx = s[0] + 2.6 * Math.cos(v.id); tz = s[1] + 2.6 * Math.sin(v.id); }
    person(lerp(A.SHOW_ENTRY[0], tx, kk), lerp(A.SHOW_ENTRY[1], tz, kk), PC.cust[v.id % 6], FY, free && kk >= 1); });
  // F&I offices and the delivery bay
  ev.deals.forEach(dl => { if (dl.fi0 <= t && t < dl.fi1) { const o = at(A.FI, dl.office); if (!o) return; person(o[0] - 1, o[1], PC.staff, FY, true); person(o[0] + 1.3, o[1] + .6, PC.cust[dl.v.id % 6], FY, true); } });
  const hand = ev.deals.filter(dl => dl.hand0 - 25 <= t && t < dl.hand1 + 6).slice(-2), H = A.HAND;
  hand.forEach((dl, i) => { const bay = H.bays[i % H.bays.length], out = clamp01((t - dl.hand1) / 6), arrive = clamp01((t - (dl.hand0 - 25)) / 5);
    const x = out > 0 ? lerp(bay[0], H.to[0], out) : lerp(H.from[0], bay[0], arrive), z = out > 0 ? lerp(bay[1], H.to[1], out) : lerp(H.from[1], bay[1], arrive), y = .1;
    if (!(out > 0 && out >= 1)) car(bodyOf(dl.mk, dl.body), x, y, z, H.yaw, dl.mk, 3000 + (dl.v ? dl.v.id : i));
    if (t >= dl.hand0 && t < dl.hand1) { person(bay[0] + H.side[0], bay[1] + H.side[1] + .5, PC.cust[dl.v.id % 6], .1); person(bay[0] + H.side[0], bay[1] + H.side[1] - .8, PC.staff, .1); } });
  // marketing room: team, remote BDC seats, lead tokens
  A.MDESK.forEach(([x, z], i) => { if (i < 3) person(x, z + .9, PC.staff, FY, true); else if (i < 3 + S.bdc) person(x, z + .9, PC.remote, FY, true); });
  let ln = 0; const today = ev.leads, inbox = [], bdcOn = S.bdc > 0, IB = A.INBOX;
  today.forEach(l => { if (l.t > t) return; if (t - l.ans > 25) return; if (ln >= MAXL) return; let x, y, z, s = 1;
    if (t < l.t + 2) { const kk = (t - l.t) / 2; x = IB.x - 4 + (l.id % 9); z = IB.z; y = lerp(18, FY + .95, kk * kk); }
    else if (t < l.ans) { inbox.push(l); return; }
    else { const kk = clamp01((t - l.ans) / 3), dk = A.MDESK[3 + (l.id % Math.max(1, bdcOn ? S.bdc : 3)) % 5] || A.MDESK[l.id % 3]; x = lerp(IB.x, dk[0], kk); z = lerp(IB.z, dk[1] - .2, kk); y = FY + 1.3 + Math.sin(kk * Math.PI) * 1.5; s = 1 - clamp01((t - l.ans - 18) / 7); }
    _p.set(x, y, z); _q.setFromEuler(_e.set(0, realT + l.id, 0)); _s.set(s, s, s); _m.compose(_p, _q, _s); tok.setMatrixAt(ln, _m); tok.setColorAt(ln, chCol(l.ch)); ln++; });
  inbox.forEach((l, i) => { if (ln >= MAXL) return; _p.set(IB.x - 4.1 + (i % 12) * .74, FY + .95 + Math.floor(i / 12) * .5, IB.z - .2 + (Math.floor(i / 12) % 2) * .3); _q.setFromEuler(_e.set(0, realT * .5 + i, 0)); _s.set(1, 1, 1); _m.compose(_p, _q, _s); tok.setMatrixAt(ln, _m); tok.setColorAt(ln, chCol(l.ch)); ln++; });
  tok.count = ln; tok.instanceMatrix.needsUpdate = true; if (tok.instanceColor) tok.instanceColor.needsUpdate = true;
  // parts: pickers walk the aisles; a tote goes to each bay as a job starts; back-orders wait at the counter
  A.AISLES.forEach(([a, b], i) => { const ph_ = realT * .25 + i * 2.1, kk = Math.sin(ph_) * .5 + .5; person(lerp(a[0], b[0], kk), lerp(a[1], b[1], kk), PC.staff); });
  const CT = A.COUNTER, PD = A.PARTS_DOOR; person(CT[0], CT[1] - 1, PC.staff); let tn = 0;
  working.forEach(j => { if (tn >= MAXT) return; const late = ((j.id * 2654435761) % 1000) / 1000 > (F.partsFill || .88), t0 = j.start + (late ? 45 : 0), kk = clamp01((t - t0) / 8); if (t - t0 > 9) return;
    const b = A.BAY[j.bay] || A.BAY[0], tp = A.TECH_AT(b); let x, z; if (kk < .4) { x = lerp(CT[0], PD[0], kk / .4); z = lerp(CT[1], PD[1], kk / .4); } else { const k2 = (kk - .4) / .6; x = lerp(PD[0], tp[0], k2); z = lerp(PD[1], tp[1] + .6, k2); }
    if (t < t0) { x = CT[0] - 1.6 + (tn % 3) * .7; z = CT[1] + .1; }
    _q.identity(); _s.set(1, 1, 1); _p.set(x, FY + .2 + (t < t0 ? .85 : 0), z); _m.compose(_p, _q, _s); tote.setMatrixAt(tn, _m); tote.setColorAt(tn, t < t0 ? L("#D9822B") : L("#9C958A")); tn++; });
  tote.count = tn; tote.instanceMatrix.needsUpdate = true; if (tote.instanceColor) tote.instanceColor.needsUpdate = true;
  // used: appraisal lane, recon bays, photo booth, yard, the back-lane queue
  const AP = A.APR;
  ev.appraisals.forEach((a, i) => { if (t < a.t - 4 || t > a.end + (a.buy ? 6 : 4)) return; const lane = AP.lanes[i % AP.lanes.length], arrive = clamp01((t - (a.t - 4)) / 4), leave = clamp01((t - a.end) / 5);
    let x = lerp(AP.from[0], lane[0], arrive), z = lerp(AP.from[1], lane[1], arrive); if (leave > 0) { if (a.buy) { const ln_ = at(A.LANE, i) || AP.from; x = lerp(lane[0], ln_[0], leave); z = lerp(lane[1], ln_[1], leave); } else { x = lerp(lane[0], AP.from[0], leave); z = lerp(lane[1], AP.from[1], leave); } }
    car(bodyOf(a.mk, a.body), x, FY * (arrive >= 1 && leave <= 0 ? 1 : 0) + .06, z, leave > 0 && !a.buy ? AP.yawOut : AP.yawIn, a.mk, 4000 + i); if (t >= a.t && t < a.end) person(lane[0] + AP.staff[0], lane[1] + AP.staff[1], PC.staff); });
  A.LANE.forEach(([x, z, yaw], i) => { if (i < 6) car(bodyOf((i * 5) % D.MARQUES.length, (i * .41) % 1), x, .06, z, yaw, (i * 5) % D.MARQUES.length, 5000 + i); });
  ev.recon.forEach(r => { if (r.t0 <= t && t < r.t1) { const b = A.RECON[r.bay] || A.RECON[0]; car(bodyOf(r.mk, r.body), b[0], FY + 1.25, b[1], b[2], r.mk, 6000 + r.t0); const tp = A.TECH_AT(b); person(tp[0], tp[1] + .2, PC.tech); }
    else if (r.photo0 <= t && t < r.photo1) { car(bodyOf(r.mk, r.body), A.PHOTO[0] - .5, FY + .06, A.PHOTO[1], realT * .2, r.mk, 6000 + r.t0); person(A.PHOTO[0] + A.PHOTO_STAFF[0], A.PHOTO[1] + A.PHOTO_STAFF[1], PC.staff); } });
  if (!yardInit) initYard(S);
  const occ = yardInit.map(y => ({ ...y })), arrivals = ev.recon.filter(r => r.photo1 <= t).length;
  if (occ.length) ev.usedSales.forEach(u => { if (u.t <= t) { const on = occ.map((o, i) => o.on ? i : -1).filter(i => i >= 0); if (!on.length) return; const i = on[u.slot % on.length]; if (i != null) { occ[i].on = false; occ[i].gone = u.t; } } });
  let filled = 0; for (let i = 0; i < occ.length && filled < arrivals; i++) if (!occ[i].on && occ[i].gone == null) { occ[i].on = true; filled++; const r = ev.recon[filled - 1]; occ[i].mk = r.mk; occ[i].r = r.body; occ[i].arr = r.photo1; }
  occ.forEach((o, i) => { const [x, z, yaw] = A.YARD[i]; if (o.on) { const kk = o.arr != null ? clamp01((t - o.arr) / 4) : 1; car(bodyOf(o.mk, o.r), lerp(A.PHOTO_OUT[0], x, kk), .06, lerp(A.PHOTO_OUT[1], z, kk), yaw, o.mk, 7000 + i); }
    else if (o.gone != null && t - o.gone < 5) { const kk = (t - o.gone) / 5; car(bodyOf(o.mk, o.r), lerp(x, A.EXIT[0], kk), .06, lerp(z, A.EXIT[1], kk), yaw, o.mk, 7000 + i); } });
  if (t > 9 * 60 && t < 17 * 60) { const [w1, w2] = A.YARD_WALK; person(w1[0] + Math.sin(realT * .2) * w1[2], w1[1] + Math.cos(realT * .2) * w1[3], PC.staff); person(w2[0] + Math.cos(realT * .17) * w2[2], w2[1] + Math.sin(realT * .17) * w2[3], PC.cust[2]); }
  carEnd();
  pb.count = ph.count = pn; pb.instanceMatrix.needsUpdate = ph.instanceMatrix.needsUpdate = true; pb.instanceColor.needsUpdate = true;
  // flows: dots travel each arc at a rate set by the model; brighter in the well-oiled machine view
  const mg = machine; flowMat.opacity = (dark ? .26 : .16) + mg * .55;
  A.NODES.forEach(([x, z], i) => { const s = (1 + .12 * Math.sin(realT * 2.2 + i)) * (.3 + mg); _q.setFromEuler(_e.set(-Math.PI / 2, 0, 0)); _p.set(x, .35, z); _s.set(s, s, s); _m.compose(_p, _q, _s); rings.setMatrixAt(i, _m); }); rings.count = A.NODES.length; rings.instanceMatrix.needsUpdate = true; ringMat.opacity = mg * .8; let dn = 0;
  A.FLOWS.forEach(f => { const n = Math.max(1, Math.min(12, Math.round(f.rate))), spd = .05 + Math.min(.12, f.rate * .006);
    for (let i = 0; i < n && dn < MAXF; i++) { const u = (realT * spd + i / n) % 1; f.curve.getPoint(u, _p); const s = (.6 + mg * .9); _q.identity(); _s.set(s, s, s); _m.compose(_p, _q, _s); dots.setMatrixAt(dn, _m); dots.setColorAt(dn, f.col); dn++; } });
  dots.count = dn; dots.instanceMatrix.needsUpdate = true; if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
  applySun(t); settle = false;
}
// ---------- marketing board (a live canvas texture)
function drawBoard(st) { const c = boardCv.getContext("2d"), t = st.d.t, L_ = st.ev.leads; c.fillStyle = "#3B3834"; c.fillRect(0, 0, 512, 200);
  const today = L_.filter(l => l.t <= t), fast = today.filter(l => l.resp <= 5).length, wait = today.filter(l => l.ans > t).length;
  c.fillStyle = "#8A8A8A"; c.font = "500 17px 'IBM Plex Mono',monospace"; c.fillText("LEADS TODAY", 22, 40); c.fillText("ANSWERED ≤5 MIN", 196, 40); c.fillText("WAITING", 410, 40);
  c.fillStyle = "#FFFFFF"; c.font = "500 64px 'IBM Plex Mono',monospace"; c.fillText(String(today.length), 22, 112); c.fillText(today.length ? Math.round(fast / today.length * 100) + "%" : "–", 196, 112);
  c.fillStyle = wait ? "#F0A24A" : "#FFFFFF"; c.fillText(String(wait), 410, 112);
  c.fillStyle = "#8A8A8A"; c.font = "500 15px 'IBM Plex Mono',monospace"; c.fillText(st.S.bdc ? `REMOTE TEAM ON · ${st.S.bdc} ${st.S.bdc > 1 ? "PEOPLE" : "PERSON"} · 7AM–10PM` : "SHOWROOM HOURS ONLY · 8:30AM–5:30PM", 22, 168);
  boardTx.needsUpdate = true; }
// ---------- labels
const ZT = 8, tagEls = {};
const zoneEls = Array.from({ length: ZT }, () => { const e = document.createElement("div"); e.className = "tag zone"; tagsEl.appendChild(e); return e; });
const flowEls = {}; Object.keys(FLOW_COL).forEach(k => { const e = document.createElement("div"); e.className = "tag flow"; tagsEl.appendChild(e); flowEls[k] = e; });
const pv = new THREE.Vector3();
function project(p, el, pad = 30) { pv.set(p[0], p[1], p[2]).project(camera); const w = canvas.clientWidth, h = canvas.clientHeight, x = (pv.x + 1) / 2 * w, y = (1 - pv.y) / 2 * h;
  if (pv.z > 1 || x < -40 || x > w + 40 || y < 40 || y > h - 20) { el.hidden = true; return false; } el.hidden = false; el.style.left = Math.max(pad + 40, Math.min(w - pad - 40, x)) + "px"; el.style.top = y + "px"; return true; }
// labels never overlap: every visible label is placed, then culled by priority (department labels first, then counters, then the
// plinth and marque names); a lower-priority label that would touch a higher one is hidden for that frame
const PRI = { showroom: 10, work: 10, parts: 9, mkt: 9, fi: 8, apr: 8, yard: 7, hc: 7, deliv: 6, fore: 6, recon: 6, photo: 6, outd: 5, door: 5, lounge: 5, lane: 4, desks: 4, lng: 4 };
// the stage's own overlays (site picker, legend, the Simulated chip) are obstacles too
function obstacles() { const base = box.getBoundingClientRect(); /* tags are placed relative to the stage box */ return ["sitepick", "legend", "simchip"].map(id => document.getElementById(id)).filter(Boolean).map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0).map(r => [r.left - base.left, r.top - base.top, r.right - base.left, r.bottom - base.top]); }
function cull(list) { const kept = obstacles();
  list.sort((a, b) => b.p - a.p).forEach(it => { const el = it.el; if (el.hidden) return; const w = el.offsetWidth, h = el.offsetHeight, x = parseFloat(el.style.left), y = parseFloat(el.style.top);
    const r = it.mid ? [x - w / 2, y - h / 2, x + w / 2, y + h / 2] : [x - w / 2, y - h, x + w / 2, y];
    if (kept.some(k => r[0] < k[2] + 4 && r[2] > k[0] - 4 && r[1] < k[3] + 3 && r[3] > k[1] - 3)) { el.hidden = true; return; } kept.push(r); }); }
function tags(text) { const narrow = canvas.clientWidth < 560, list = []; A.TAGS.forEach(T => { const el = tagEls[T.id]; if (!el) return; const on = T.v.includes(view) && text[T.id] && !(narrow && (view === "site" || view === "machine")) && !(narrow && view === "showroom" && ["showroom", "lng", "desks", "door"].includes(T.id)) && !(narrow && view === "workshop" && ["hc", "lounge"].includes(T.id)) && !(narrow && view === "used" && ["recon", "lane"].includes(T.id)); if (!on) { el.hidden = true; return; } if (project(T.p, el)) { if (el._t !== text[T.id]) { el.innerHTML = text[T.id]; el._t = text[T.id]; } list.push({ el, p: PRI[T.id] || 3 }); } });
  (A.plinth || []).forEach(pl => { if (!pl.el) return; if (narrow || view === "machine") { pl.el.hidden = true; return; } if (project(pl.p, pl.el) && parseFloat(pl.el.style.top) < 70) pl.el.hidden = true; if (!pl.el.hidden) list.push({ el: pl.el, p: 2.5 }); });
  const seen = new Set(); zoneEls.forEach((el, i) => { const mk = slotMk[i]; if (view !== "showroom" || mk == null || seen.has(mk) || !A.SLOTS[i]) { el.hidden = true; return; } seen.add(mk); const [x, z] = A.SLOTS[i]; if (project([x, FY + .1, z + 3.2], el)) { el.textContent = D.MARQUES[mk].n; list.push({ el, p: 2, mid: true }); } });
  Object.keys(flowEls).forEach(k => { const el = flowEls[k], f = A.FLOWS.find(x => x.k === k); if (!f || view !== "machine" || !text.flow || !text.flow[f.k] || (narrow && !["leads", "deals", "ros", "usedsale"].includes(f.k))) { el.hidden = true; return; } const m = f.curve.getPoint(f.k === "leads" ? .12 : f.k === "appts" ? .7 : f.k === "equity" ? .74 : f.k === "deals" ? .4 : .5); if (project([m.x, m.y + .6, m.z], el, 20)) { if (el._t !== text.flow[f.k]) { el.innerHTML = text.flow[f.k]; el._t = text.flow[f.k]; } list.push({ el, p: ["leads", "deals", "ros", "usedsale"].includes(k) ? 6 : 3 }); } });
  cull(list); }
// ---------- camera
function setView(n, instant) { view = n; const shell = !!(A && A.hasShell && n === "site"); SG.visible = shell; IG.visible = !shell; const v = A.VIEWS[n] || A.VIEWS.site, t = v3(...v.t), p = v3(...v.p); if (camera.aspect < 1) { if (n === "site") { const d = p.clone().sub(t); p.copy(t).add(d.multiplyScalar(.72)); p.y = Math.max(p.y, d.length() * 1.05); } else p.sub(t).multiplyScalar(n === "machine" ? 1.5 : 1.45).add(t); }
  else if (camera.aspect < 1.4) p.sub(t).multiplyScalar(1.2).add(t);
  camGoal = { p, t }; if (instant) { camera.position.copy(p); controls.target.copy(t); camGoal = null; } }
controls.addEventListener("start", () => camGoal = null);
function resize() { const w = box.clientWidth, h = Math.round(Math.max(window.__minH || 380, Math.min(innerHeight * 0.74, w * 0.6))); canvas.style.height = h + "px"; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 44 : 30; camera.updateProjectionMatrix(); }
function frame(st, dt, realT, text) {
  if (!A) return;
  machine += ((view === "machine" ? 1 : 0) - machine) * Math.min(1, dt * 2.5);
  if (st.flowRates) A.FLOWS.forEach(f => { if (st.flowRates[f.k] != null) f.rate = st.flowRates[f.k]; });
  place(st, dt, realT);
  if (camGoal) { camera.position.lerp(camGoal.p, Math.min(1, dt * 2.6)); controls.target.lerp(camGoal.t, Math.min(1, dt * 2.6)); if (camera.position.distanceTo(camGoal.p) < .1) camGoal = null; }
  controls.update(); renderer.render(scene, camera); if (text) tags(text); }
let dpr = Math.min(devicePixelRatio, lite ? 1 : 1.75); function setDpr(v) { dpr = v; renderer.setPixelRatio(v); resize(); }
// proof tools: a top-down orthographic render (north up, east right, no fog) and the massing vertices as the GPU has them
function snapTop(cx, cz, half, px) { const cam = new THREE.OrthographicCamera(-half, half, half, -half, 1, 1200); cam.position.set(cx, 600, cz); cam.up.set(0, 0, -1); cam.lookAt(cx, 0, cz); cam.updateMatrixWorld();
  const pr = renderer.getPixelRatio(), fn = scene.fog.near, ff = scene.fog.far; scene.fog.near = 1e5; scene.fog.far = 1e6; renderer.setPixelRatio(1); renderer.setSize(px, px, false); renderer.render(scene, cam);
  const url = canvas.toDataURL("image/png"); scene.fog.near = fn; scene.fog.far = ff; renderer.setPixelRatio(pr); resize(); return url; }
function fpDebug() { const pts = []; SG.updateMatrixWorld(true); SG.children.forEach(m => { const a = m.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < a.count; i++) { v.fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld); if (v.y > 1) pts.push([+v.x.toFixed(3), +v.z.toFixed(3), +v.y.toFixed(2)]); } });
  return { fp: A.fp || [], verts: pts, site: A.site || null, sunTarget: A.sunTarget, sun: sunInfo }; }
setLayout("generic");
return { frame, snapTop, fpDebug, setView, resize, applyTheme, setSite, setLayout, drawBoard, setDpr, useCarModels, get carModels() { return carModels; }, get dpr() { return dpr; }, get view() { return view; }, get layout() { return A ? { key: A.key, label: A.label, real: A.real, slots: A.SLOTS.length, outdoor: A.OUTD.length, yard: A.YARD.length, queue: A.QUEUE.length, plinth: (A.plinth || []).map(p => p.k) } : null; }, get sun() { return sunInfo; }, renderer, scene, camera, TINT, CHC };
}
