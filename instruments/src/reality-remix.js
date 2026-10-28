import { PackedSplats, SplatMesh, SparkRenderer } from "@sparkjsdev/spark";
import { studio, T, drag } from "./scene.js";
import { $, status, choices, range, history, light } from "./app.js";
export async function start() {
  $("#intro").textContent = "Pull the world apart. Put it back differently.";
  $("#note").innerHTML =
    "01 / REALITY, RECOMPOSED<br>Original synthetic splats.<br>No camera. No capture.";
  $("#medium").textContent = "SYNTHETIC GAUSSIAN SCULPTURE";
  $("#hint").textContent = "Drag to brush · choose Orbit to turn";
  $("#explanation").innerHTML =
    "<p>This original scene is made from thousands of oriented, translucent 3D Gaussian ellipsoids, rendered by Spark. It is a synthetic sculpture, not a scan or a point-cloud substitute. Brushing changes Gaussian centres; dissolve changes their opacity; the vortex rotates them around an axis. Reassemble returns each one to its original position.</p><p>Undo stores up to 16 gestures. Freeze pauses reassembly; you can still edit the frozen sculpture. Lighter mode uses fewer splats and fewer screen pixels. PNG is a still image, not a 3D scene export.</p>";
  // Spark resolves Gaussian coverage itself; MSAA adds cost without improving splats.
  const s = studio({ antialias: false });
  const spark = new SparkRenderer({ renderer: s.renderer });
  s.scene.add(spark);
  s.camera.position.set(0.3, 1.3, 5.8);
  s.controls.update();
  let mode = "brush",
    radius = 0.8,
    reassembling = false,
    preset = "bloom",
    data = [],
    original = [],
    mesh,
    packed;
  const count = light ? 2400 : 5600;
  const scale = new T.Vector3(),
    q = new T.Quaternion(),
    p = new T.Vector3(),
    color = new T.Color();
  function build(name) {
    preset = name;
    if (mesh) {
      s.scene.remove(mesh);
      mesh.dispose();
    }
    data = [];
    packed = new PackedSplats({ maxSplats: count });
    for (let i = 0; i < count; i++) {
      const u = ((i * 0.61803398875) % 1) * Math.PI * 2,
        v = ((i * 0.41421356237) % 1) * Math.PI * 2;
      const tube = 0.32 + 0.085 * Math.sin(5 * u),
        r = 1.04 + tube * Math.cos(v);
      let x = r * Math.cos(u),
        y = tube * Math.sin(v),
        z = r * Math.sin(u);
      if (name === "bloom") {
        y += 0.36 * Math.sin(3 * u);
        x *= 1.12;
        z *= 0.83;
      }
      if (name === "ribbon") {
        const a = u * 1.5;
        y = 0.7 * Math.sin(a) + 0.22 * Math.sin(v);
        x = (1 + 0.18 * Math.cos(v)) * Math.cos(u);
        z = 0.62 * Math.sin(u) + 0.19 * Math.cos(v);
      }
      if (name === "shell") {
        const a = u * 1.8,
          r2 = 0.35 + u * 0.18;
        x = r2 * Math.cos(a);
        z = r2 * Math.sin(a);
        y = (u - Math.PI) * 0.22 + 0.28 * Math.sin(v);
        x += 0.25 * Math.cos(v) * Math.cos(a);
        z += 0.25 * Math.cos(v) * Math.sin(a);
      }
      const yy = y;
      y = yy * Math.cos(0.85) - z * Math.sin(0.85);
      z = yy * Math.sin(0.85) + z * Math.cos(0.85);
      const c = new T.Color().setHSL(
        (0.93 + 0.1 * Math.sin(u) + 0.08 * Math.cos(v) + 1) % 1,
        0.56,
        0.64 + 0.12 * Math.sin(v),
      );
      // Flattened anisotropic Gaussians with a tangent orientation.
      q.setFromEuler(new T.Euler(v, u, Math.PI / 4));
      const entry = {
        x,
        y,
        z,
        a: 0.88,
        c: c.clone(),
        q: q.clone(),
        sx: 0.035,
        sy: 0.065,
        sz: 0.025,
      };
      data.push(entry);
      packed.pushSplat(
        p.set(x, y, z),
        scale.set(entry.sx, entry.sy, entry.sz),
        q,
        entry.a,
        c,
      );
    }
    original = data.map((d) => ({ ...d }));
    mesh = new SplatMesh({ packedSplats: packed, enableLod: false });
    s.scene.add(mesh);
    reassembling = false;
  }
  const capture = () => data.map(({ x, y, z, a }) => ({ x, y, z, a }));
  const restore = (snapshot) => {
    snapshot.forEach((d, i) => Object.assign(data[i], d));
    reassembling = false;
    upload();
  };
  const h = history(capture, restore);
  h.install();
  function upload() {
    data.forEach((d, i) =>
      packed.setSplat(
        i,
        p.set(d.x, d.y, d.z),
        scale.set(d.sx, d.sy, d.sz),
        d.q,
        d.a,
        d.c,
      ),
    );
    packed.needsUpdate = true;
    mesh.updateVersion();
  }
  build(preset);
  await mesh.initialized;
  choices(
    "A starting point",
    [
      ["bloom", "Petal loop"],
      ["ribbon", "Silk knot"],
      ["shell", "Spiral"],
    ],
    preset,
    (v) => {
      build(v);
      h.clear();
      status("New synthetic composition.");
    },
  );
  choices(
    "Make your move",
    [
      ["brush", "↗ Brush"],
      ["dissolve", "◌ Dissolve"],
      ["vortex", "⟳ Vortex"],
      ["orbit", "◎ Orbit"],
    ],
    mode,
    (v) => {
      mode = v;
      $("#hint").textContent =
        v === "orbit"
          ? "Drag to orbit · pinch or scroll to zoom"
          : "Drag across the sculpture · Undo keeps experiments easy";
    },
  );
  range("Brush size", 0.3, 1.6, radius, 0.05, (v) => (radius = v));
  const b = document.createElement("button");
  b.className = "export";
  b.textContent = "↟ Reassemble";
  $("#controls").append(b);
  b.onclick = () => {
    h.push();
    reassembling = true;
    status("Returning every splat to its starting place.");
  };
  let last;
  function brush(at, delta) {
    if (!at) return;
    const view = s.camera.getWorldDirection(new T.Vector3());
    data.forEach((d) => {
      p.set(d.x, d.y, d.z).sub(at);
      p.addScaledVector(view, -p.dot(view));
      const dist = p.length();
      if (dist > radius) return;
      const w = (1 - dist / radius) ** 2;
      if (mode === "brush") {
        d.x += delta.x * w * 1.6;
        d.y += delta.y * w * 1.6;
        d.z += delta.z * w * 1.6;
      }
      if (mode === "dissolve") d.a = Math.max(0, d.a - w * 0.13);
      if (mode === "vortex") {
        const a = w * 0.16,
          dx = d.x - at.x,
          dz = d.z - at.z;
        d.x = at.x + dx * Math.cos(a) - dz * Math.sin(a);
        d.z = at.z + dx * Math.sin(a) + dz * Math.cos(a);
        d.y += w * 0.018;
      }
    });
    upload();
  }
  drag(s, {
    orbit: () => mode === "orbit",
    start(at) {
      h.push();
      reassembling = false;
      last = at;
      brush(at, new T.Vector3(0, 0.04, 0));
    },
    move(at) {
      if (last && at) {
        brush(at, at.clone().sub(last));
        last = at;
      }
    },
  });
  s.update = (dt) => {
    if (reassembling) {
      let error = 0;
      data.forEach((d, i) => {
        const o = original[i],
          a = 1 - Math.exp(-dt * 4);
        for (const key of ["x", "y", "z", "a"]) {
          error += Math.abs(o[key] - d[key]);
          d[key] += (o[key] - d[key]) * a;
        }
      });
      upload();
      if (error < 0.05) {
        reassembling = false;
        status("Whole again.");
      }
    }
    $("#metrics").textContent =
      `${count.toLocaleString()} GAUSSIANS / ${s.fps()} FPS`;
  };
  return {
    ...s,
    backend: "spark-gaussians",
    async prepareCapture() {
      await mesh.initialized;
      await spark.update({ scene: s.scene, camera: s.camera });
      s.render();
    },
    reset() {
      h.push();
      restore(original);
    },
    capture,
    stats: () => ({
      splats: count,
      fps: s.fps(),
      opacity: data.reduce((a, d) => a + d.a, 0),
      displacement: data.reduce(
        (a, d, i) =>
          a +
          Math.abs(d.x - original[i].x) +
          Math.abs(d.y - original[i].y) +
          Math.abs(d.z - original[i].z),
        0,
      ),
    }),
  };
}
