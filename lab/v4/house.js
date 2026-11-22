// The lab front page's live house: the two timber homes built in three.js from their own plan model
// (/plan-studio/twins/services/plan16a.json, assembl.plan-model.v1, the same file the 16A twin and the services page use).
// Walls, openings, partitions, decks and the gable roof come from the plan; sizes are the plan's own (written or scaled,
// as each item's `source` says). Cladding, glazing, the lawn and the planting are a light dressing for the front page,
// not a design. The full twin, with the surveyed ground and every source label, is /plan-studio/twins/16a/.
import * as THREE from "three";
import { mergeGeometries } from "/assets/vendor/three/addons/utils/BufferGeometryUtils.js";

// ---------- procedural textures (canvas): boards, metal, lawn ----------
function canvasTex(size, draw, repeat = 1, color = true) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
// vertical shiplap, dark stained cedar: one texture tile = 1 m, boards 150 mm
function cedar(ctx, n) {
  ctx.fillStyle = "#3b3431"; ctx.fillRect(0, 0, n, n);
  const bw = n / 6.67;
  for (let i = 0; i < 7; i++) {
    const x = i * bw, l = 46 + rnd() * 12;
    ctx.fillStyle = `hsl(18, 9%, ${l * 0.42}%)`; ctx.fillRect(x, 0, bw, n);
    for (let g = 0; g < 26; g++) { ctx.fillStyle = `rgba(${rnd() > .5 ? "255,240,225" : "0,0,0"}, ${0.03 + rnd() * 0.05})`; ctx.fillRect(x + rnd() * bw, 0, 0.6 + rnd() * 1.6, n); }
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(x, 0, 2.2, n);
    ctx.fillStyle = "rgba(255,240,225,.10)"; ctx.fillRect(x + 2.2, 0, 1.2, n);
  }
}
function cedarBump(ctx, n) {
  ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, n, n);
  const bw = n / 6.67;
  for (let i = 0; i < 7; i++) { ctx.fillStyle = "#101010"; ctx.fillRect(i * bw, 0, 3, n); ctx.fillStyle = "#b0b0b0"; ctx.fillRect(i * bw + 3, 0, bw * 0.5, n); }
}
// corrugate roof sheeting: 76 mm pitch, tile = 1 m
function corrugate(ctx, n) {
  const g = ctx.createLinearGradient(0, 0, n / 13, 0);
  g.addColorStop(0, "#202020"); g.addColorStop(0.5, "#e0e0e0"); g.addColorStop(1, "#202020");
  ctx.fillStyle = g; ctx.fillRect(0, 0, n, n);
}
// decking: 140 mm boards with 6 mm gaps, tile = 1 m
function decking(ctx, n) {
  ctx.fillStyle = "#3a2618"; ctx.fillRect(0, 0, n, n);
  const bw = n / 7;
  for (let i = 0; i < 7; i++) {
    const l = 38 + rnd() * 10; ctx.fillStyle = `hsl(26, 38%, ${l}%)`; ctx.fillRect(0, i * bw + 2, n, bw - 4);
    for (let g = 0; g < 18; g++) { ctx.fillStyle = `rgba(0,0,0,${0.04 + rnd() * 0.06})`; ctx.fillRect(0, i * bw + 2 + rnd() * (bw - 4), n, 0.8); }
  }
}
function oak(ctx, n) {
  ctx.fillStyle = "#c7a57c"; ctx.fillRect(0, 0, n, n);
  const bw = n / 5;
  for (let i = 0; i < 5; i++) { ctx.fillStyle = `hsl(32, 38%, ${58 + rnd() * 8}%)`; ctx.fillRect(0, i * bw + 1, n, bw - 2); }
}
function lawn(ctx, n) {
  ctx.fillStyle = "#86956a"; ctx.fillRect(0, 0, n, n);
  for (let i = 0; i < 9000; i++) {
    const h = 70 + rnd() * 25, l = 34 + rnd() * 20;
    ctx.fillStyle = `hsla(${h}, 22%, ${l}%, .5)`; ctx.fillRect(rnd() * n, rnd() * n, 1.2, 2 + rnd() * 3);
  }
}
// the lawn fades into the page: a radial alpha, white in the middle
function fade(ctx, n) {
  const g = ctx.createRadialGradient(n / 2, n / 2, n * 0.18, n / 2, n / 2, n / 2);
  g.addColorStop(0, "#fff"); g.addColorStop(0.4, "#fff"); g.addColorStop(1, "#000");
  ctx.fillStyle = g; ctx.fillRect(0, 0, n, n);
}

function materials() {
  const cedarMap = canvasTex(512, cedar), cedarB = canvasTex(256, cedarBump, 1, false);
  return {
    cedar: new THREE.MeshStandardMaterial({ map: cedarMap, bumpMap: cedarB, bumpScale: 1.2, roughness: 0.82 }),
    roof: new THREE.MeshStandardMaterial({ color: "#2c2c2f", bumpMap: canvasTex(256, corrugate, 1, false), bumpScale: 0.5, metalness: 0.45, roughness: 0.5 }),
    trim: new THREE.MeshStandardMaterial({ color: "#232326", metalness: 0.4, roughness: 0.5 }),
    frame: new THREE.MeshStandardMaterial({ color: "#1b1b1d", metalness: 0.5, roughness: 0.38 }),
    glass: new THREE.MeshPhysicalMaterial({ color: "#71838a", metalness: 0.1, roughness: 0.03, transparent: true, opacity: 0.5, envMapIntensity: 2.2, depthWrite: false }),
    door: new THREE.MeshStandardMaterial({ color: "#7a5236", roughness: 0.6 }),
    deck: new THREE.MeshStandardMaterial({ map: canvasTex(512, decking), roughness: 0.78 }),
    floor: new THREE.MeshStandardMaterial({ map: canvasTex(256, oak), roughness: 0.6 }),
    inside: new THREE.MeshStandardMaterial({ color: "#efe8df", roughness: 0.92 }),
    pile: new THREE.MeshStandardMaterial({ color: "#5d4c3d", roughness: 0.9 }),
    lawn: new THREE.MeshStandardMaterial({ map: canvasTex(512, lawn, 18), alphaMap: canvasTex(256, fade, 1, false), transparent: true, roughness: 1, depthWrite: false }),
    flax: new THREE.MeshStandardMaterial({ color: "#3f5a2e", roughness: 0.7, side: THREE.DoubleSide }),
    tussock: new THREE.MeshStandardMaterial({ color: "#b39a5c", roughness: 0.85, side: THREE.DoubleSide }),
    trunk: new THREE.MeshStandardMaterial({ color: "#6b5a4a", roughness: 0.95 }),
    hebe: new THREE.MeshStandardMaterial({ color: "#4d6a3a", roughness: 0.9, flatShading: true }),
  };
}

// a box with UVs in metres on every face, so textures keep their real size
function box(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
  g.translate(x, y, z);
  return g;
}

// ground: the plan's fall, cut flat to its two terraces (eased at the edges)
function groundY(site, x, z) {
  const f = site.fall; let y = f.y + f.slopeX * (x - f.at[0]) + f.slopeZ * (z - f.at[1]);
  for (const t of site.terraces || []) {
    const dx = Math.max(t.x0 - x, 0, x - t.x1), dz = Math.max(t.z0 - z, 0, z - t.z1), d = Math.hypot(dx, dz);
    const k = Math.max(0, 1 - d / (t.ease || 1.5)); y = y + (t.y - y) * (k * k * (3 - 2 * k));
  }
  return y;
}

// a wall run along one axis with its openings cut out; returns geometry lists by material
function wallRun(L, out, { along, at, from, to, t, inward, h, openings, glazed }) {
  // along "x": length runs in u, thickness in v; along "z": the other way round. (u,v) are local to the building.
  const put = (a0, a1, y0, y1, list, thick = t, inset = 0) => {
    const len = a1 - a0, hh = y1 - y0; if (len <= 0.005 || hh <= 0.005) return;
    const c = (a0 + a1) / 2, ty = (y0 + y1) / 2, tc = at + inward * (thick / 2 + inset);
    list.push(along === "x" ? box(len, hh, thick, c, ty, tc) : box(thick, hh, len, tc, ty, c));
  };
  const ops = [...(openings || [])].sort((p, q) => p.a - q.a);
  let a = from;
  for (const o of ops) {
    put(a, o.a, 0, h, out[L.solid]);
    if (o.sill > 0) put(o.a, o.b, 0, o.sill, out[L.solid]);
    put(o.a, o.b, o.head, h, out[L.solid]);
    if (glazed) {
      const ft = 0.05, mid = t / 2 - 0.02, solidDoor = o.kind === "door" && o.type === "hinged";
      put(o.a, o.b, o.sill, o.sill + ft, out.frame, 0.06, mid); put(o.a, o.b, o.head - ft, o.head, out.frame, 0.06, mid);
      put(o.a, o.a + ft, o.sill, o.head, out.frame, 0.06, mid); put(o.b - ft, o.b, o.sill, o.head, out.frame, 0.06, mid);
      if (!solidDoor && o.kind === "door" && o.b - o.a > 1.4) put((o.a + o.b) / 2 - 0.025, (o.a + o.b) / 2 + 0.025, o.sill, o.head, out.frame, 0.06, mid);
      put(o.a + ft, o.b - ft, o.sill + ft, o.head - ft, solidDoor ? out.door : out.glass, solidDoor ? 0.045 : 0.012, mid + 0.02);
    }
    a = o.b;
  }
  put(a, to, 0, h, out[L.solid]);
}

// cabbage tree, flax, tussock and hebe, as merged geometries (unit size)
function blades(n, len, wid, spread, lean) {
  const gs = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.PlaneGeometry(wid, len, 1, 5), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const yy = p.getY(k) + len / 2, s = yy / len; p.setX(k, p.getX(k) * (1 - s * 0.9)); p.setY(k, yy); p.setZ(k, s * s * lean * len); }
    g.rotateX(-(0.05 + rnd() * spread)); g.rotateY(rnd() * Math.PI * 2);
    gs.push(g);
  }
  return mergeGeometries(gs);
}
function cabbageTree() {
  const trunk = [], head = [];
  const t = new THREE.CylinderGeometry(0.09, 0.16, 3.2, 7); t.translate(0, 1.6, 0); trunk.push(t);
  for (const [dx, dz, hy] of [[0.5, 0.1, 3.9], [-0.45, 0.25, 3.7], [0.05, -0.45, 4.1]]) {
    const b = new THREE.CylinderGeometry(0.05, 0.08, Math.hypot(dx, dz, hy - 3.2), 5);
    const dir = new THREE.Vector3(dx, hy - 3.2, dz).normalize();
    b.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    b.translate(dx / 2, (3.2 + hy) / 2, dz / 2); trunk.push(b);
    const h = blades(46, 0.75, 0.05, 1.9, 0.25); h.translate(dx, hy - 0.05, dz); head.push(h);
  }
  return { trunk: mergeGeometries(trunk), head: mergeGeometries(head) };
}

export function buildHouse(plan, opts = {}) {
  const M = materials(), root = new THREE.Group(), parts = { base: [], walls: [], roofs: [], plants: [] };
  const site = plan.site;

  // lawn
  const gg = new THREE.PlaneGeometry(64, 64, 64, 64); gg.rotateX(-Math.PI / 2);
  const gp = gg.attributes.position;
  const cx = site.centre?.[0] ?? 0, cz = site.centre?.[1] ?? 0;
  gg.translate(cx, 0, cz);
  for (let i = 0; i < gp.count; i++) gp.setY(i, groundY(site, gp.getX(i), gp.getZ(i)) - 0.02);
  gg.computeVertexNormals();
  const ground = new THREE.Mesh(gg, M.lawn); ground.receiveShadow = true; ground.renderOrder = -1; root.add(ground);

  for (const b of plan.buildings) {
    const [ox, oz] = b.origin, fl = b.floorLevel, lv = b.levels[0], plate = lv.plate;
    // footprint from the outside walls
    const W = Math.max(...lv.walls.filter((w) => w.axis === "x").map((w) => w.to)), D = Math.max(...lv.walls.filter((w) => w.axis === "z").map((w) => w.to));
    const base = new THREE.Group(), walls = new THREE.Group(), roofG = new THREE.Group();
    for (const g of [base, walls, roofG]) { g.position.set(ox, fl, oz); root.add(g); }
    const lists = () => ({ cedar: [], inside: [], frame: [], glass: [], door: [], deck: [], floor: [], pile: [], roof: [], trim: [] });
    const B = lists(), Wl = lists(), R = lists();

    // floor and the piles under it (piles every ~1.8 m, down to the ground)
    B.floor.push(box(W - 0.1, 0.06, D - 0.1, W / 2, -0.03, D / 2));
    B.cedar.push(box(W, 0.22, D, W / 2, -0.17, D / 2));
    const pilesUnder = (u0, u1, v0, v1, top) => {
      for (let u = u0 + 0.3; u <= u1 - 0.25; u += 1.8) for (let v = v0 + 0.3; v <= v1 - 0.25; v += 1.8) {
        const gy = groundY(site, ox + u, oz + v) - fl, hgt = top - gy + 0.3;
        if (hgt > 0.05) B.pile.push(box(0.125, hgt, 0.125, u, gy - 0.3 + hgt / 2, v));
      }
    };
    pilesUnder(0, W, 0, D, -0.28);
    for (const dk of lv.decks || []) {
      const top = -(dk.drop || 0);
      B.deck.push(box(dk.u1 - dk.u0, 0.045, dk.v1 - dk.v0, (dk.u0 + dk.u1) / 2, top - 0.0225, (dk.v0 + dk.v1) / 2));
      B.pile.push(box(dk.u1 - dk.u0, 0.19, 0.05, (dk.u0 + dk.u1) / 2, top - 0.14, dk.v0 + 0.03));
      pilesUnder(dk.u0, dk.u1, dk.v0, dk.v1, top - 0.24);
      for (const side of dk.rail || []) {
        const v = side === "s" ? dk.v1 - 0.03 : dk.v0 + 0.03;
        B.deck.push(box(dk.u1 - dk.u0, 0.05, 0.09, (dk.u0 + dk.u1) / 2, top + 0.98, v));
        for (let u = dk.u0 + 0.05; u < dk.u1; u += 0.12) B.deck.push(box(0.045, 0.95, 0.045, u, top + 0.48, v));
      }
    }

    // outside walls: cedar outside, lined inside; the gable ends rise to the ridge
    const pitch = THREE.MathUtils.degToRad(b.roof?.pitchDeg ?? 15), half = D / 2, rise = half * Math.tan(pitch);
    for (const w of lv.walls) {
      const t = w.thickness || 0.113, inward = -(w.out || -1);
      wallRun({ solid: "cedar" }, Wl, { along: w.axis, at: w.at, from: w.from, to: w.to, t, inward, h: plate, openings: w.openings, glazed: true });
      if (w.axis === "z") {
        const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(D, 0), new THREE.Vector2(half, rise)]);
        const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
        g.rotateY(-Math.PI / 2); g.translate(w.at + (inward > 0 ? t : 0), plate, 0);
        const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i));
        Wl.cedar.push(g);
      }
    }
    // inside: partitions with their door gaps (no glazing)
    for (const p of lv.partitions || []) {
      const ops = (p.openings || []).map((o) => ({ ...o, sill: 0 }));
      wallRun({ solid: "inside" }, Wl, { along: p.axis, at: p.at - (p.thickness || 0.09) / 2, from: p.from, to: p.to, t: p.thickness || 0.09, inward: 1, h: plate, openings: ops, glazed: false });
    }
    // a light lining just inside the cedar, so the rooms read warm through the glass
    Wl.inside.push(box(W - 0.24, 0.02, D - 0.24, W / 2, plate - 0.01, D / 2));

    // gable roof: ridge along u at the middle of the depth, eaves and verges from the plan
    const eave = b.roof?.eave ?? 0.45, verge = b.roof?.verge ?? 0.25, slopeLen = (half + eave) / Math.cos(pitch), len = W + verge * 2;
    for (const s of [-1, 1]) {
      const g = box(len, 0.035, slopeLen, 0, 0, 0);
      g.rotateX(s * pitch); g.translate(W / 2, plate + rise - (slopeLen / 2) * Math.sin(pitch) + 0.06, half + s * (slopeLen / 2) * Math.cos(pitch));
      R.roof.push(g);
      const v = half + s * (half + eave), y = plate - eave * Math.tan(pitch) + 0.02;
      R.trim.push(box(len, 0.2, 0.03, W / 2, y - 0.04, v)); // fascia
    }
    R.trim.push(box(len, 0.06, 0.24, W / 2, plate + rise + 0.09, half)); // ridge cap
    for (const u of [-verge, W + verge]) {
      for (const s of [-1, 1]) { const g = box(0.03, 0.2, slopeLen, 0, 0, 0); g.rotateX(s * pitch); g.translate(u, plate + rise - (slopeLen / 2) * Math.sin(pitch) - 0.02, half + s * (slopeLen / 2) * Math.cos(pitch)); R.trim.push(g); }
    }

    const emit = (L, group) => {
      for (const [k, gs] of Object.entries(L)) {
        if (!gs.length) continue;
        const mesh = new THREE.Mesh(mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g))), M[k]);
        mesh.castShadow = k !== "glass"; mesh.receiveShadow = k !== "glass";
        if (k === "glass") mesh.renderOrder = 2;
        group.add(mesh);
      }
    };
    emit(B, base); emit(Wl, walls); emit(R, roofG);
    parts.base.push(base); parts.walls.push(walls); parts.roofs.push(roofG);
  }

  // planting, where the plan model proposes it (assembl's proposal, not on the drawings)
  const pl = plan.planting || {};
  const flaxG = blades(30, 1.5, 0.09, 0.9, 0.35), tussockG = blades(70, 0.7, 0.025, 1.1, 0.5), tree = cabbageTree();
  const hebeG = new THREE.IcosahedronGeometry(0.6, 2); { const p = hebeG.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.85 + rnd() * 0.3; p.setXYZ(i, p.getX(i) * k, Math.max(p.getY(i), -0.2) * k * 0.8, p.getZ(i) * k); } hebeG.computeVertexNormals(); }
  const place = (geom, mat, x, z, s) => { const m = new THREE.Mesh(geom, mat); m.position.set(x, groundY(site, x, z) - 0.03, z); m.scale.setScalar(s); m.rotation.y = rnd() * 6.28; m.castShadow = true; const g = new THREE.Group(); g.add(m); g.position.copy(m.position); m.position.set(0, 0, 0); root.add(g); parts.plants.push(g); return g; };
  for (const [x, z] of pl.harakeke || []) place(flaxG, M.flax, x, z, 1);
  for (const t of pl.tussock || []) place(tussockG, M.tussock, t.at[0], t.at[1], t.s);
  for (const t of pl.hebe || []) place(hebeG, M.hebe, t.at[0], t.at[1], t.s);
  for (const t of pl.tikouka || []) {
    const g = place(tree.trunk, M.trunk, t.at[0], t.at[1], t.s);
    const h = new THREE.Mesh(tree.head, M.flax); h.castShadow = true; g.children[0].add(h);
  }
  root.userData.parts = parts;
  return root;
}
