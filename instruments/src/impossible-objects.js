import Module from "manifold-3d";
import {
  mergeVertices,
  toCreasedNormals,
} from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { studio, T } from "./scene.js";
import {
  $,
  status,
  choices,
  range,
  group,
  history,
  download,
  light,
} from "./app.js";
export async function start() {
  $("#intro").textContent = "Make a shape that almost shouldn’t exist.";
  $("#note").innerHTML =
    "03 / SCULPT SOMETHING STRANGE<br>Solid geometry. Real edits.<br>An object you can keep.";
  $("#number").textContent = "03";
  $("#medium").textContent = "LIVE SOLID / MANIFOLD";
  $("#hint").textContent =
    "Drag to orbit · pinch to zoom · shape with the sliders";
  $("#explanation").innerHTML =
    "<p>Manifold’s WebAssembly geometry kernel unions intersecting solids, subtracts a cylindrical opening, then twists the actual vertices. The live preview and exported GLB use the resulting triangle mesh. Dimensions assume one scene unit = 30 mm; GLB positions are exported in metres.</p><p><strong>Art export is not print validation.</strong> The panel reports the kernel status and connected components before export. Wall thickness, self-intersections after twisting, minimum detail, supports, material strength and printer tolerances are not validated. GLB is an art mesh; it does not carry a manufacturing certificate or the EXT_mesh_manifold extension. No physical output has been tested. Use a slicer and independent checks before making a decorative print. Not for safety-critical parts.</p>";
  const kernel = await Module({
    locateFile: () => new URL("../dist/manifold.wasm", location.href).href,
  });
  kernel.setup();
  const { Manifold } = kernel;
  const s = studio();
  s.camera.position.set(1.8, 1.4, 5.7);
  s.controls.update();
  let mesh,
    solid,
    params = { merge: 0.6, carve: 0.43, twist: 35 },
    meta = {},
    color = "#8ecdb6",
    timer = null,
    builtParams = null;
  const presets = {
    arch: { merge: 0.6, carve: 0.43, twist: 35 },
    loop: { merge: 0.2, carve: 0.55, twist: 100 },
    moon: { merge: 0.9, carve: 0.7, twist: -35 },
  };
  let presetControls;
  function syncPreset() {
    presetControls?.querySelectorAll("button").forEach((button) => {
      const preset = presets[button.dataset.value];
      button.setAttribute(
        "aria-pressed",
        Object.keys(preset).every((key) => preset[key] === params[key]),
      );
    });
  }
  function flushGeometry() {
    if (builtParams !== JSON.stringify(params) && !make())
      throw Error(
        "Current design could not be built. Adjust the controls before exporting.",
      );
  }
  const material = new T.MeshPhysicalMaterial({
    color,
    roughness: 0.25,
    metalness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
  });
  function make() {
    clearTimeout(timer);
    timer = null;
    syncPreset();
    const garbage = [];
    const keep = (x) => (garbage.push(x), x);
    try {
      const seg = light ? 32 : 56;
      const a = keep(keep(Manifold.sphere(1, seg)).scale([0.8, 1.2, 0.82]));
      const b = keep(
        keep(Manifold.sphere(0.85, seg)).translate([params.merge, 0.34, 0]),
      );
      const merged = keep(a.add(b));
      const cutter = keep(
        keep(
          keep(
            Manifold.cylinder(4, params.carve, params.carve, seg, true),
          ).rotate([90, 0, 0]),
        ).translate([0.12, 0.18, 0]),
      );
      const carved = keep(merged.subtract(cutter));
      const refined = keep(carved.refineToLength(light ? 0.24 : 0.16));
      const warped = refined.warp((v) => {
        const angle = (v[1] * params.twist * Math.PI) / 180;
        const x = v[0],
          z = v[2];
        v[0] = x * Math.cos(angle) - z * Math.sin(angle);
        v[2] = x * Math.sin(angle) + z * Math.cos(angle);
      });
      const resultStatus = warped.status();
      if (resultStatus !== "NoError") {
        warped.delete();
        throw Error(`Geometry status: ${resultStatus}`);
      }
      const m = warped.getMesh(),
        verts = new Float32Array(m.numVert * 3);
      for (let i = 0; i < m.numVert; i++)
        verts.set(
          m.vertProperties.slice(i * m.numProp, i * m.numProp + 3),
          i * 3,
        );
      const geometry = new T.BufferGeometry();
      geometry.setAttribute("position", new T.BufferAttribute(verts, 3));
      geometry.setIndex(new T.BufferAttribute(new Uint32Array(m.triVerts), 1));
      // Smooth shared curved surfaces, preserving >60-degree creases.
      // Only normals/index packing change: positions, triangles and units do not.
      const creased = toCreasedNormals(geometry, Math.PI / 3);
      const previewGeometry = mergeVertices(creased);
      creased.dispose();
      geometry.dispose();
      const old = mesh;
      if (old) {
        s.scene.remove(old);
        old.geometry.dispose();
      }
      mesh = new T.Mesh(previewGeometry, material);
      s.scene.add(mesh);
      solid?.delete();
      solid = warped;
      const bounds = solid.boundingBox(),
        parts = solid.decompose();
      meta = {
        status: resultStatus,
        components: parts.length,
        dimensions: bounds.max.map((x, i) =>
          Math.round((x - bounds.min[i]) * 30),
        ),
        triangles: m.triVerts.length / 3,
      };
      parts.forEach((p) => p.delete());
      $("#geometry-info").textContent =
        `${meta.dimensions.join(" × ")} mm\n${meta.components} connected component${meta.components !== 1 ? "s" : ""}\n${meta.triangles.toLocaleString()} triangles\nKernel: ${resultStatus}\nWall thickness: not checked`;
      $("#metrics").textContent =
        `${meta.triangles.toLocaleString()} TRIANGLES / REAL GEOMETRY`;
      builtParams = JSON.stringify(params);
      status("Shape updated. GLB art export is ready.");
      return true;
    } catch (e) {
      status(`Could not update: ${e.message}. Previous shape kept.`);
      return false;
    } finally {
      garbage.forEach((x) => x.delete());
    }
  }
  const inputs = {};
  const h = history(
    () => ({ ...params }),
    (p) => {
      params = p;
      for (const k of Object.keys(inputs)) {
        inputs[k].value = p[k];
        inputs[k].previousElementSibling.textContent = p[k];
      }
      make();
    },
  );
  h.install();
  presetControls = choices(
    "A starting point",
    [
      ["arch", "Pebble arch"],
      ["loop", "Twisted seed"],
      ["moon", "Moon stone"],
    ],
    "arch",
    (v) => {
      h.push();
      params = { ...presets[v] };
      for (const k in inputs) {
        inputs[k].value = params[k];
        inputs[k].previousElementSibling.textContent = params[k];
      }
      make();
    },
  );
  for (const [key, label, min, max, step] of [
    ["merge", "Merge", 0, 1.2, 0.02],
    ["carve", "Carve", 0.15, 0.8, 0.01],
    ["twist", "Twist", -120, 120, 1],
  ]) {
    const input = range(
      label,
      min,
      max,
      params[key],
      step,
      (v) => {
        params[key] = v;
        syncPreset();
        clearTimeout(timer);
        timer = setTimeout(make, 70);
      },
      () => h.push(),
    );
    inputs[key] = input;
  }
  const sw = group("Material", '<div class="swatches"></div>');
  for (const [name, c] of [
    ["Mint ceramic", "#8ecdb6"],
    ["Rose alloy", "#ec7e96"],
    ["Lilac pearl", "#aca0df"],
    ["Warm porcelain", "#f7e7a6"],
  ]) {
    const b = document.createElement("button");
    b.title = name;
    b.setAttribute("aria-label", name);
    b.setAttribute("aria-pressed", c === color);
    b.style.background = c;
    b.onclick = () => {
      material.color.set(c);
      sw.querySelectorAll("button").forEach((x) =>
        x.setAttribute("aria-pressed", x === b),
      );
    };
    sw.querySelector("div").append(b);
  }
  const info = document.createElement("div");
  info.id = "geometry-info";
  info.className = "readout";
  info.style.whiteSpace = "pre-line";
  $("#controls").append(info);
  const exp = document.createElement("button");
  exp.className = "export";
  exp.textContent = "↓ Export art mesh · GLB";
  $("#controls").append(exp);
  exp.onclick = async () => {
    try {
      flushGeometry();
      const copy = mesh.clone();
      copy.scale.setScalar(0.03);
      copy.userData = {
        title: "assembl Impossible Objects",
        dimensionsMillimetres: meta.dimensions,
        kernelStatus: meta.status,
        components: meta.components,
        validation:
          "Art only. Wall thickness, intersections after twist and printability not validated. No physical output tested.",
      };
      const data = await new GLTFExporter().parseAsync(copy, { binary: true });
      download(
        new Blob([data], { type: "model/gltf-binary" }),
        "impossible-object.glb",
      );
      status("GLB art mesh saved. Print checks remain separate.");
    } catch (e) {
      status(`Export failed: ${e.message}`);
    }
  };
  make();
  if (!mesh)
    throw Error("The geometry kernel could not build the starting form.");
  return {
    ...s,
    backend: "manifold-wasm",
    preparePrint() {
      flushGeometry();
    },
    prepareCapture() {
      flushGeometry();
      s.render();
    },
    reset() {
      h.push();
      params = { merge: 0.6, carve: 0.43, twist: 35 };
      for (const k in inputs) {
        inputs[k].value = params[k];
        inputs[k].previousElementSibling.textContent = params[k];
      }
      make();
    },
    capture: () => ({ ...params }),
    stats: () => ({ ...meta, fps: s.fps() }),
  };
}
