import R from "@dimforge/rapier3d-compat";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { studio, T, drag } from "./scene.js";
import { $, status, choices, range, history, light } from "./app.js";
export async function start() {
  $("#intro").textContent =
    "A little stretch. A deep squish. A very satisfying wobble.";
  $("#note").innerHTML =
    "02 / FEEL THE FORM<br>Live deformable physics.<br>Made for curious hands.";
  $("#number").textContent = "02";
  $("#medium").textContent = "LIVE SOFT BODY / RAPIER";
  $("#hint").textContent = "Grab and stretch · release to rebound";
  $("#explanation").innerHTML =
    "<p>A low-resolution 3D cage is simulated by Rapier’s real deformable-body solver: connected particles, elastic edge constraints, volume preservation and shape matching. A subdivided surface follows that cage. Pulling pins a small patch temporarily; releasing it lets the material rebound. The bottom patch is anchored like a sculpture on a plinth.</p><p>This is a playful bounded material experiment, not an engineering material model. No tearing, plasticity or self-collision is offered. The three presets change spring frequency and damping. Undo restores particle positions and velocities. Lighter mode uses a smaller cage. Export is a PNG still.</p>";
  await R.init();
  const s = studio();
  s.camera.position.set(1.5, 1.3, 5.8);
  s.controls.update();
  let world,
    body,
    rest,
    geometry,
    mesh,
    mode = "stretch",
    stiffness = 5,
    selected = [],
    grab,
    last,
    frozen = false;
  let preset = "jelly";
  const material = new T.MeshPhysicalMaterial({
    color: 0xec7e96,
    roughness: 0.22,
    metalness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    iridescence: 0.3,
    iridescenceIOR: 1.4,
  });
  // Weld cage vertices before building structural edges; UV seams must not become cracks.
  const source = new T.IcosahedronGeometry(1.12, light ? 2 : 3);
  source.deleteAttribute("normal");
  source.deleteAttribute("uv");
  const cage = mergeVertices(source);
  source.dispose();
  const positions = cage.attributes.position.array.slice();
  const indices = new Uint32Array(cage.index.array);
  cage.dispose();
  // One linear subdivision links each render vertex to two cage vertices.
  const links = Array.from({ length: positions.length / 3 }, (_, i) => [i, i]);
  const tris = [],
    edgeMap = new Map();
  const midpoint = (a, b) => {
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, links.length);
      links.push([a, b]);
    }
    return edgeMap.get(key);
  };
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = indices.slice(i, i + 3),
      ab = midpoint(a, b),
      bc = midpoint(b, c),
      ca = midpoint(c, a);
    tris.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  const edges = new Set();
  for (let i = 0; i < indices.length; i += 3)
    for (const [a, b] of [
      [indices[i], indices[i + 1]],
      [indices[i + 1], indices[i + 2]],
      [indices[i + 2], indices[i]],
    ])
      edges.add(a < b ? `${a},${b}` : `${b},${a}`);
  for (let i = 0; i < positions.length; i += 3) {
    const a = Math.atan2(positions[i + 2], positions[i]);
    const f =
      1 + 0.14 * Math.cos(3 * a) * Math.max(0, 1 - Math.abs(positions[i + 1]));
    positions[i] *= f;
    positions[i + 2] *= f;
    positions[i + 1] *= 1.05;
  }
  const pinned = [];
  for (let i = 0; i < positions.length / 3; i++) {
    positions[i * 3 + 1] -= 0.18;
    if (positions[i * 3 + 1] < -1.13) pinned.push(i);
  }
  function mat() {
    const m = R.SoftBodyMaterial.uniform(
      stiffness,
      preset === "foam" ? 0.85 : preset === "gum" ? 0.3 : 0.12,
    );
    m.shapeMatchingSoftness = {
      naturalFrequency: stiffness * 0.65,
      dampingRatio: 0.2,
    };
    return m;
  }
  function init() {
    world?.free();
    world = new R.World({ x: 0, y: 0, z: 0 });
    const desc = new R.SoftBodyDesc(positions)
      .setEdges(Array.from(edges).flatMap((e) => e.split(",").map(Number)))
      .setSurface(indices)
      .setShapeMatching(true)
      .setVolumePreservation(true)
      .setPinnedParticles(pinned)
      .setMass(1)
      .setMaterial(mat())
      .setLinearDamping(0.25)
      .setNoSurfaceCollider();
    body = world.createSoftBody(desc);
    rest = body.particlePositions();
    selected = [];
    if (!mesh) {
      geometry = new T.BufferGeometry();
      geometry.setAttribute(
        "position",
        new T.BufferAttribute(new Float32Array(links.length * 3), 3),
      );
      geometry.setIndex(tris);
      mesh = new T.Mesh(geometry, material);
      s.scene.add(mesh);
    }
    sync();
  }
  function sync() {
    const pos = body.particlePositions(),
      out = geometry.attributes.position.array;
    links.forEach(([a, b], i) => {
      for (let j = 0; j < 3; j++)
        out[i * 3 + j] = (pos[a * 3 + j] + pos[b * 3 + j]) / 2;
    });
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }
  const capture = () => ({
    p: body.particlePositions(),
    v: body.particleVelocities(),
  });
  const restore = (state) => {
    selected = [];
    for (let i = 0; i < body.numParticles(); i++) {
      body.setParticlePinned(i, pinned.includes(i));
      body.setParticlePosition(i, {
        x: state.p[i * 3],
        y: state.p[i * 3 + 1],
        z: state.p[i * 3 + 2],
      });
      body.setParticleVelocity(i, {
        x: state.v[i * 3],
        y: state.v[i * 3 + 1],
        z: state.v[i * 3 + 2],
      });
    }
    sync();
  };
  const h = history(capture, restore);
  h.install();
  init();
  choices(
    "Pick a feeling",
    [
      ["jelly", "Rose jelly"],
      ["foam", "Mint foam"],
      ["gum", "Lilac gum"],
    ],
    preset,
    (v) => {
      preset = v;
      stiffness = v === "foam" ? 9 : v === "gum" ? 3 : 5;
      slider.value = stiffness;
      slider.dispatchEvent(new Event("input"));
      material.color.set(
        v === "foam" ? 0x8ecdb6 : v === "gum" ? 0xaca0df : 0xec7e96,
      );
      material.roughness = v === "foam" ? 0.7 : 0.22;
      body.setMaterial(mat());
      status("New spring and damping response.");
    },
  );
  choices(
    "Touch the material",
    [
      ["stretch", "↗ Stretch"],
      ["squash", "↓ Squash"],
      ["orbit", "◎ Orbit"],
    ],
    mode,
    (v) => (mode = v),
  );
  const slider = range("Spring", 2, 12, stiffness, 0.5, (v) => {
    stiffness = v;
    body.setMaterial(mat());
  });
  const b = document.createElement("button");
  b.textContent = "✦ Give it a wobble";
  b.className = "export";
  $("#controls").append(b);
  b.onclick = () => {
    h.push();
    body.applyImpulseAtPoint(
      { x: 0.035, y: 0.06, z: 0.02 },
      { x: 0.6, y: 0.6, z: 0.6 },
      1.7,
      true,
    );
    status("A real impulse. Watch the cage settle.");
  };
  drag(s, {
    orbit: () => mode === "orbit" || frozen,
    start(at, e) {
      h.push();
      s.point(e);
      const hit = s.ray.intersectObject(mesh)[0];
      if (!hit) return;
      grab = at;
      last = at;
      const hitPoint = hit.point;
      for (let i = 0; i < body.numParticles(); i++) {
        if (pinned.includes(i)) continue;
        const p = body.particlePosition(i),
          d = new T.Vector3(p.x, p.y, p.z).distanceTo(hitPoint);
        if (d < 0.5) {
          selected.push({
            i,
            p: new T.Vector3(p.x, p.y, p.z),
            w: Math.max(0.25, 1 - d / 0.6),
          });
          body.setParticlePinned(i, true);
        }
      }
    },
    move(at) {
      if (!grab || !at) return;
      last = at;
    },
    end() {
      for (const { i } of selected) body.setParticlePinned(i, false);
      selected = [];
      grab = null;
    },
  });
  let accumulator = 0;
  s.update = (dt) => {
    accumulator = Math.min(accumulator + dt, 0.05);
    while (accumulator >= 1 / 60) {
      if (grab && last) {
        const delta = last.clone().sub(grab).clampLength(0, 1.8);
        for (const { i, p, w } of selected) {
          const target = p.clone();
          if (mode === "squash") {
            target.y -= Math.min(1.1, Math.abs(delta.y) + 0.15) * w;
            target.x *= 1 + Math.min(0.3, Math.abs(delta.y) * 0.2);
          } else target.addScaledVector(delta, w);
          body.setParticleKinematicTarget(i, target);
        }
      }
      world.timestep = 1 / 60;
      world.step();
      accumulator -= 1 / 60;
    }
    sync();
    $("#metrics").textContent =
      `${body.numParticles()} CAGE PARTICLES / ${s.fps()} FPS`;
  };
  return {
    ...s,
    backend: "rapier-soft-body",
    freeze(v) {
      frozen = v;
      s.freeze(v);
    },
    reset() {
      h.push();
      init();
    },
    capture,
    stats: () => ({
      particles: body.numParticles(),
      fps: s.fps(),
      displacement: body
        .particlePositions()
        .reduce((a, x, i) => a + Math.abs(x - rest[i]), 0),
      finite: Array.from(body.particlePositions()).every(Number.isFinite),
    }),
  };
}
