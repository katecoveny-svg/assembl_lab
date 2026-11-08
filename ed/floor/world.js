// The 3D department: the floor, the NVIDIA SimReady hospital kit and a sync() that draws the model's patients each frame.
// SimReady (CC BY 4.0, web copies from codepawl/simready-glb, simplified for the browser): hospital beds, cubicle
// curtains, patient monitors, IV poles, visitor sofas, desks, stools, the crash cart, mobile surgical lights and
// wheelchairs. Made for this page: the building, the ambulances and the people (plain figures, never a likeness).
import { THREE, std, box, bake, Instanced, Repeat, ribTexture, label, makePerson, animatePerson, OUTFIT, mergeGeometries } from '../../assets/twin/3/kit.js';
import * as L from './layout.js';

const S = '/assets/models/simready/', E = S + 'ed/';
export const FILES = {
  bed: { url: E + 'bed.glb', bytes: 171404 }, curtain: { url: E + 'curtain.glb', bytes: 179208 }, monitor: { url: E + 'monitor.glb', bytes: 86956 },
  ivpole: { url: E + 'ivpole.glb', bytes: 31800 }, sofa: { url: E + 'sofa.glb', bytes: 77452 }, desk: { url: E + 'desk.glb', bytes: 38040 },
  stool: { url: E + 'stool.glb', bytes: 102156 }, crashcart: { url: E + 'crashcart.glb', bytes: 186172 }, surgicallight: { url: E + 'surgicallight.glb', bytes: 112568 },
  wheelchair: { url: E + 'wheelchair.glb', bytes: 213824 }, extinguisher: { url: S + 'extinguisher.glb', bytes: 117424 },
};
export const TEX = Object.fromEntries(['floor_albedo', 'floor_normal', 'panel_albedo', 'panel_orm'].map(k => [k, `${S}tex/${k}.webp`]));
const up = new THREE.Vector3(0, 1, 0);
const OUTFITS = [0x6b5b6e, 0x46607a, 0x7a6248, 0x5b6e5a, 0x8a4f4f, 0x3f4a5c].map((c, i) => ({ vest: c, band: c, shirt: c, trouser: [0x343842, 0x4a4036, 0x2f3540][i % 3] }));

export class World {
  constructor(scene, assets, tex) {
    this.scene = scene; this.A = assets; this.tex = tex; this.root = new THREE.Group(); scene.add(this.root); this.walls = [];
    this.tmp = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.v = new THREE.Vector3(); this.s = new THREE.Vector3(1, 1, 1);
    for (const k of ['desk', 'crashcart', 'extinguisher']) bake(assets[k], { cast: true });
    this.M = { steel: std({ color: 0x8d949a, roughness: 0.45, metalness: 0.6 }), wall: std({ color: 0xe9e6e1, roughness: 0.85 }), trim: std({ color: 0x6f8c99, roughness: 0.6 }),
      glass: std({ color: 0x9fb6c0, roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.3, depthWrite: false }), dark: std({ color: 0x2a2d30, roughness: 0.6, metalness: 0.4 }),
      lamp: std({ color: 0xffffff, emissive: 0xfff3dc, emissiveIntensity: 5, roughness: 0.3 }), amber: std({ color: 0xffc46b, emissive: 0xffa53a, emissiveIntensity: 6, roughness: 0.4 }),
      tyre: std({ color: 0x161616, roughness: 0.9 }), tinted: std({ color: 0x1d2a33, roughness: 0.08, metalness: 0.8 }) };
    this.buildShell(); this.buildKit(); this.buildAmbulances(); this.buildPeople();
  }
  place(inst, i, x, y, z, yaw, sx = 1, sy = 1, sz = 1) { this.q.setFromAxisAngle(up, yaw); this.v.set(x, y, z); this.s.set(sx, sy, sz); this.tmp.compose(this.v, this.q, this.s); inst.set(i, this.tmp); }

  // ── ground, building, partitions, the ambulance canopy ─────────────────────────────────────────────────────────
  buildShell() {
    const H = L.HALL, W = H.x1 - H.x0, D = H.z1 - H.z0, t = this.tex, M = this.M;
    const rep = (tx, x, y) => { const c = tx.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(x, y); c.needsUpdate = true; return c; };
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), std({ color: 0x2a2928, roughness: 0.96 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.3; ground.receiveShadow = true; this.root.add(ground);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(140, 70), std({ color: 0x3a3938, roughness: 0.92, map: rep(t.floor_albedo, 20, 10) })); road.rotation.x = -Math.PI / 2; road.position.set(20, -0.25, 10); road.receiveShadow = true; this.root.add(road);
    // hospital vinyl: pale, slightly speckled (the SimReady concrete texture, tinted and scaled down)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std({ map: rep(t.floor_albedo, W / 3, D / 3), normalMap: rep(t.floor_normal, W / 3, D / 3), normalScale: new THREE.Vector2(0.12, 0.12), color: 0xdfe4e2, roughness: 0.55 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.01, (H.z0 + H.z1) / 2); floor.receiveShadow = true; this.root.add(floor);
    box(W + 0.6, 0.3, D + 0.6, std({ color: 0x8c8781, roughness: 0.95 }), 0, -0.15, (H.z0 + H.z1) / 2, this.root);
    // zone floors in a calmer tint so the areas read from above
    const zone = (x0, x1, z0, z1, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), std({ color: c, roughness: 0.6 })); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2); m.receiveShadow = true; this.root.add(m); };
    zone(-37.6, -13.6, 5.4, 19.6, 0xd8d2c8); zone(-37.6, -13.6, -23.6, -4.8, 0xd3dbd2); zone(24.6, 37.6, -23.6, -4.8, 0xe2d4d0);
    // exterior walls: the parts between the camera and the floor fade away (the DC twin's cutaway)
    const wall = (name, len, along, pos, normal, openings = []) => {
      const g = new THREE.Group(); g.name = name; g.userData.normal = normal; this.root.add(g); const upper = new THREE.Group(); g.add(upper); g.userData.upper = upper;
      const segs = []; let a = -len / 2; for (const o of openings) { segs.push([a, o.c - o.w / 2]); a = o.c + o.w / 2; } segs.push([a, len / 2]);
      for (const [u0, u1] of segs) { const l = u1 - u0; if (l < 0.05) continue; const c = (u0 + u1) / 2;
        box(along === 'x' ? l : 0.2, 0.9, along === 'x' ? 0.2 : l, M.trim, along === 'x' ? pos.x + c : pos.x, 0.45, along === 'x' ? pos.z : pos.z + c, g);
        box(along === 'x' ? l : 0.2, H.h - 0.9, along === 'x' ? 0.2 : l, M.wall, along === 'x' ? pos.x + c : pos.x, 0.9 + (H.h - 0.9) / 2, along === 'x' ? pos.z : pos.z + c, upper); }
      for (const o of openings) { const c = o.c; box(along === 'x' ? o.w : 0.2, H.h - 2.6, along === 'x' ? 0.2 : o.w, M.wall, along === 'x' ? pos.x + c : pos.x, 2.6 + (H.h - 2.6) / 2, along === 'x' ? pos.z : pos.z + c, upper);
        box(along === 'x' ? o.w : 0.06, 2.5, along === 'x' ? 0.06 : o.w, M.glass, along === 'x' ? pos.x + c : pos.x, 1.25, along === 'x' ? pos.z : pos.z + c, upper); }
      bake(g, { deep: false }); bake(upper, { deep: false }); this.walls.push(g);
    };
    wall('north', W, 'x', { x: 0, z: H.z0 }, { x: 0, z: -1 });
    wall('south', W, 'x', { x: 0, z: H.z1 }, { x: 0, z: 1 }, [{ c: L.WALK_IN.x, w: 4 }]);
    wall('west', D, 'z', { x: H.x0, z: (H.z0 + H.z1) / 2 }, { x: -1, z: 0 });
    wall('east', D, 'z', { x: H.x1, z: (H.z0 + H.z1) / 2 }, { x: 1, z: 0 }, [{ c: (L.AMB_DOOR.z0 + L.AMB_DOOR.z1) / 2 - (H.z0 + H.z1) / 2, w: 6 }]);
    // low partitions between the cubicle rows and round resus, minors and the waiting room (a cutaway model's half-height walls)
    const g = new THREE.Group(); this.root.add(g); const part = std({ color: 0xf1efea, roughness: 0.8 });
    for (const z of [-10.25]) box(36.5, 1.5, 0.15, part, 6.3, 0.75, z, g);
    box(0.15, 1.5, 19, part, 24.4, 0.75, -14.4, g); box(0.15, 1.5, 19, part, -13.4, 0.75, -14.4, g); box(24, 1.5, 0.15, part, -25.6, 0.75, 4.2, g);
    box(13, 1.5, 0.15, part, 31.1, 0.75, -4.6, g);
    // ceiling-mounted lights over every bed row (real lights: they may bloom)
    const lamps = new Repeat(new THREE.BoxGeometry(1.2, 0.06, 0.3), M.lamp, 80, { cast: false }); let n = 0;
    for (const r of L.CUB_ROWS) for (let i = 0; i < 11; i += 2) { this.tmp.makeTranslation(L.CUB_X(i) + 1.6, H.h - 0.05, r.z); lamps.set(n++, this.tmp); }
    for (const r of L.RESUS) { this.tmp.makeTranslation(r.x, H.h - 0.05, r.z); lamps.set(n++, this.tmp); }
    lamps.commit(n); this.root.add(lamps.im);
    // signs
    const sign = (text, x, z, ry = 0, w = 5) => { const s = label(text, { w, h: 0.7, color: '#f6f3ee', bg: '#2f5b6a', size: 46 }); s.position.set(x, H.h - 0.6, z); s.rotation.y = ry; g.add(s); };
    sign('Ambulances', H.x1 + 0.15, 9, Math.PI / 2, 4); sign('Resus', 29.8, -4.5, 0, 2.6); sign('Minors', -26, 4.35, 0, 2.6); sign('Triage', -9.6, 19.7, 0, 2.6);
    // the ambulance canopy
    const K = L.CANOPY; for (const x of [K.x0 + 0.3, K.x1 - 0.3]) for (const z of [K.z0 + 0.3, (K.z0 + K.z1) / 2, K.z1 - 0.3]) box(0.3, K.h, 0.3, M.steel, x, K.h / 2, z, g);
    box(K.x1 - K.x0, 0.35, K.z1 - K.z0, std({ color: 0xd9dcdc, roughness: 0.4, metalness: 0.3, transparent: true, opacity: 0.35, depthWrite: false }), (K.x0 + K.x1) / 2, K.h, (K.z0 + K.z1) / 2, this.root);
    bake(g, { cast: true });
  }

  // ── SimReady hospital kit, instanced ───────────────────────────────────────────────────────────────────────────
  buildKit() {
    const A = this.A, nC = L.CUBICLES.length, nR = L.RESUS.length;
    const beds = new Instanced(A.bed, nC + nR).addTo(this.root), cur = new Instanced(A.curtain, nC).addTo(this.root), mon = new Instanced(A.monitor, nC + nR).addTo(this.root), iv = new Instanced(A.ivpole, nC + nR).addTo(this.root);
    // bed: 2.28 m along its x; turned so its head points north (-z) or south (+z)
    const all = [...L.CUBICLES, ...L.RESUS];
    all.forEach((c, i) => { const yaw = c.head < 0 ? -Math.PI / 2 : Math.PI / 2; this.place(beds, i, c.x, 0, c.z, yaw);
      this.place(mon, i, c.x + 0.95, 0, c.z + c.head * 0.85, c.head < 0 ? 0 : Math.PI); this.place(iv, i, c.x - 0.85, 0, c.z + c.head * 0.7, 0); });
    beds.commit(all.length); mon.commit(all.length); iv.commit(all.length);
    // cubicle curtains (3.2 m enclosures), lowered for the cutaway; the open side faces the corridor
    L.CUBICLES.forEach((c, i) => { this.place(cur, i, c.x + (c.head < 0 ? -1.6 : 1.6), 0, c.z - c.head * 0.15, c.head < 0 ? -Math.PI / 2 : Math.PI / 2, 0.98, 0.62, 0.98); });
    cur.commit(nC);
    const sofas = new Instanced(A.sofa, L.WAIT_SOFAS.length + L.MINOR_SOFAS.length).addTo(this.root); let k = 0;
    for (const [x, z] of L.WAIT_SOFAS) this.place(sofas, k++, x, 0, z, -Math.PI / 2);   // facing north, towards triage and the doors in
    for (const [x, z] of L.MINOR_SOFAS) this.place(sofas, k++, x, 0, z, Math.PI / 2);
    sofas.commit(k);
    const desks = new Instanced(A.desk, 4).addTo(this.root), stools = new Instanced(A.stool, 6).addTo(this.root); let d = 0, s = 0;
    for (const t of L.TRIAGE_DESKS) { this.place(desks, d++, t.x, 0, t.z, 0); this.place(stools, s++, t.x + 0.95, 0, t.z, 0); }
    for (const t of L.STATION) { this.place(desks, d++, t.x, 0, t.z, Math.PI / 2); this.place(stools, s++, t.x, 0, t.z + 0.95, 0); }
    desks.commit(d); stools.commit(s);
    // resus: a crash cart, a mobile surgical light at each bay
    const lights = new Instanced(A.surgicallight, nR).addTo(this.root); L.RESUS.forEach((r, i) => this.place(lights, i, r.x - 1.5, 0, r.z - r.head * 0.4, Math.PI / 2)); lights.commit(nR);
    for (const [x, z] of [[29.8, -14.6], [29.8, -15.8]]) { const c = A.crashcart.clone(); c.position.set(x, 0, z); this.root.add(c); }
    const wc = new Instanced(A.wheelchair, 4).addTo(this.root); for (let i = 0; i < 4; i++) this.place(wc, i, 36.6, 0, 13.4 + i * 0.9, -Math.PI / 2); wc.commit(4);
    const ex = A.extinguisher.clone(); ex.position.set(-13.2, 0, 19.4); this.root.add(ex);
    // amber lights over a cubicle whose patient is waiting for a ward bed (a real call light, so it may bloom)
    this.boardLights = new Repeat(new THREE.SphereGeometry(0.12, 10, 8), this.M.amber, 44, { cast: false }).addTo(this.root);
  }

  // ── ambulances (made for this page: a plain box body, a green stripe) ──────────────────────────────────────────
  buildAmbulances() {
    const M = this.M, body = std({ color: 0xf4f2ee, roughness: 0.45, metalness: 0.1 }), stripe = std({ color: 0x3f7a55, roughness: 0.5 }), wheel = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 18); wheel.rotateX(Math.PI / 2);
    this.ambs = [];
    for (let i = 0; i < 10; i++) {
      const g = new THREE.Group();
      box(4.4, 2.5, 2.2, body, -0.9, 1.6, 0, g); box(4.42, 0.32, 2.22, stripe, -0.9, 1.1, 0, g); box(1.8, 1.9, 2.1, body, 2.2, 1.3, 0, g); box(0.05, 0.8, 1.9, M.tinted, 3.11, 1.75, 0, g);
      box(0.3, 0.12, 1.4, std({ color: 0x3d7bd6, emissive: 0x2e6fd6, emissiveIntensity: 0.6 }), 1.6, 2.92, 0, g);
      for (const [x, z] of [[2.2, 1], [2.2, -1], [-2.2, 1], [-2.2, -1]]) { const w = new THREE.Mesh(wheel, M.tyre); w.position.set(x, 0.42, z); g.add(w); }
      bake(g, { cast: true }); g.visible = false; this.root.add(g); this.ambs.push(g);
    }
  }

  // ── people: patients are instanced in three poses (standing, seated, lying); staff are animated figures ────────
  buildPeople() {
    const pose = (outfit, kind) => { const p = makePerson(3, outfit); animatePerson(p, false, 0, 1, kind === 'sit' ? 'seated' : 'stand'); p.updateMatrixWorld(true); const g = []; p.traverse(o => { if (o.isMesh) g.push(o.geometry.clone().applyMatrix4(o.matrixWorld)); }); return mergeGeometries(g); };
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
    this.pt = {}; for (const kind of ['stand', 'sit', 'lie']) this.pt[kind] = OUTFITS.map(o => { const im = new THREE.InstancedMesh(pose(o, kind === 'lie' ? 'stand' : kind), mat, 120); im.count = 0; im.frustumCulled = false; im.castShadow = true; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.root.add(im); return im; });
    this.docs = []; for (let i = 0; i < 12; i++) { const p = makePerson(i, i < 10 ? OUTFIT.scrubs : OUTFIT.scrubsGreen); p.visible = false; this.root.add(p); this.docs.push({ p, x: L.DOC_HOME(i).x, z: L.DOC_HOME(i).z, yaw: 0 }); }
    this.nurses = L.TRIAGE_DESKS.map((t, i) => { const p = makePerson(20 + i, OUTFIT.scrubsGreen); p.position.set(t.x + 0.95, 0, t.z); p.rotation.y = -Math.PI / 2; this.root.add(p); return p; });
    this.vis = new Map(); this.slots = { cub: new Map(), resus: new Map(), ft: new Map(), wait: new Map(), amb: new Map(), hand: new Map(), tq: new Map() };
  }
  slot(area, id, n) { const m = this.slots[area]; if (m.has(id)) return m.get(id); const used = new Set(m.values()); for (let i = 0; i < n; i++) if (!used.has(i)) { m.set(id, i); return i; } return -1; }
  // where a patient in the model's state goes on this floor
  target(p) {
    if (p.state === 'triage') { if (p.amb) { const i = this.slot('hand', p.id, 12); const h = L.HANDOVER(Math.max(0, i)); return { ...h, pose: 'lie', y: 0.62, yaw: 0 }; }
      const i = this.slot('tq', p.id, 12); const q = i < 2 ? L.TRIAGE_SPOT(i) : L.TRIAGE_QUEUE(i - 2); return { ...q, pose: 'stand', y: 0, yaw: Math.PI / 2 }; }
    if (p.state === 'wait' && !p.where) { if (p.amb) return { amb: true };
      const i = this.slot('wait', p.id, L.SEATS.length); if (i < 0) { const s = L.STANDING(p.id % 16); return { ...s, pose: 'stand', y: 0, yaw: Math.PI }; } const s = L.SEATS[i]; return { ...s, pose: 'sit', y: -0.4, yaw: Math.PI }; }
    if (p.where === 'resus') { const i = this.slot('resus', p.id, 4); const r = L.RESUS[Math.max(0, i)]; return { x: r.x, z: r.z, pose: 'lie', y: 0.72, yaw: r.head < 0 ? 0 : Math.PI, head: r.head }; }
    if (p.where === 'ft') { const i = this.slot('ft', p.id, L.MINORS.length); const m = L.MINORS[Math.max(0, i)]; return { x: m.x, z: m.z + 0.05, pose: 'sit', y: -0.4, yaw: 0 }; }
    if (p.where === 'cub') { const i = this.slot('cub', p.id, L.CUBICLES.length); const c = L.CUBICLES[Math.max(0, i)]; return { x: c.x, z: c.z, pose: 'lie', y: 0.72, yaw: c.head < 0 ? 0 : Math.PI, head: c.head, cub: i }; }
    return { x: 0, z: 10, pose: 'stand', y: 0, yaw: 0 };
  }
  clean(st) { const by = new Map(st.pts.map(p => [p.id, p])); for (const [a, m] of Object.entries(this.slots)) for (const id of [...m.keys()]) { const p = by.get(id);
    if (!p || (a === 'wait' && (p.where || p.state !== 'wait')) || (a === 'hand' && p.state !== 'triage') || (a === 'tq' && p.state !== 'triage') || (['cub', 'resus', 'ft'].includes(a) && p.where !== a)) m.delete(id); } }
  sync(st, S, dt, cam) {
    this.clean(st); const k = 1 - Math.exp(-dt * 5), live = new Set(), counts = {}, m = this.tmp, q = this.q, v = this.v, s = this.s;
    for (const kind in this.pt) this.pt[kind].forEach((_, i) => { counts[kind + i] = 0; });
    let nb = 0, inAmb = 0;
    for (const p of st.pts) {
      live.add(p.id); const t = this.target(p);
      if (t.amb) { inAmb++; this.vis.delete(p.id); continue; }
      let w = this.vis.get(p.id); if (!w) { w = p.amb ? { x: L.HALL.x1 + 1, z: 9 } : { ...L.WALK_IN }; w.x ??= t.x; this.vis.set(p.id, w); }
      w.x += (t.x - w.x) * k; w.z += (t.z - w.z) * k; const near = Math.hypot(t.x - w.x, t.z - w.z) < 0.5;
      const kind = near ? t.pose : 'stand', o = p.id % OUTFITS.length, im = this.pt[kind][o], idx = counts[kind + o]++;
      if (kind === 'lie') { q.setFromEuler(new THREE.Euler(-Math.PI / 2, t.yaw, 0, 'YXZ')); v.set(w.x, t.y, w.z - (t.head || -1) * 0.85); }
      else { q.setFromAxisAngle(up, near ? t.yaw : Math.atan2(t.x - w.x, t.z - w.z)); v.set(w.x, near ? t.y : 0, w.z); }
      m.compose(v, q, s.set(1, 1, 1)); if (idx < 120) im.setMatrixAt(idx, m);
      if (p.state === 'board' && t.cub != null && t.cub >= 0) { const c = L.CUBICLES[t.cub]; m.makeTranslation(c.x, 2.05, c.z + c.head * 1.25); this.boardLights.set(nb++, m); }
      if (p.state === 'triage' && p.amb) inAmb++;
    }
    for (const id of [...this.vis.keys()]) if (!live.has(id)) this.vis.delete(id);
    for (const kind in this.pt) this.pt[kind].forEach((im, i) => { im.count = Math.min(120, counts[kind + i]); im.instanceMatrix.needsUpdate = true; });
    this.boardLights.commit(nb);
    // doctors walk to the patient they are seeing
    const docs = [...st.docs, ...(S.fastTrack ? st.ftDocs : [])];
    this.docs.forEach((d, j) => { const doc = docs[j]; d.p.visible = !!doc; if (!doc) return;
      const w = doc.p ? this.vis.get(doc.p.id) : null, tx = w ? w.x + 0.9 : L.DOC_HOME(j).x, tz = w ? w.z + 0.5 : L.DOC_HOME(j).z;
      const dx = tx - d.x, dz = tz - d.z, dist = Math.hypot(dx, dz); d.x += dx * k; d.z += dz * k; if (dist > 0.2) d.yaw = Math.atan2(dx, dz);
      d.p.position.set(d.x, 0, d.z); d.p.rotation.y = d.yaw; animatePerson(d.p, dist > 0.3, dt * 3, 1.2, dist > 0.3 ? 'walk' : (w ? 'work' : 'stand')); });
    this.nurses.forEach(n => animatePerson(n, false, dt, 1, 'work'));
    // ambulances: one for each patient not yet handed over, queueing down the drive
    this.ambs.forEach((g, j) => { const on = j < Math.min(10, inAmb); g.visible = on; if (on) { const a = L.AMB_SLOT(j); g.position.set(a.x, 0, a.z); g.rotation.y = a.yaw + Math.PI / 2; } });
    this.inAmb = inAmb;
    const H = L.HALL;
    for (const w of this.walls) { const n = w.userData.normal; let out; if (n.z < 0) out = cam.z < H.z0; else if (n.z > 0) out = cam.z > H.z1; else if (n.x < 0) out = cam.x < H.x0; else out = cam.x > H.x1; w.userData.upper.visible = !out; }
  }
}
