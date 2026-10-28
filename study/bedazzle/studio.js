import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
const $ = (id) => document.getElementById(id),
  LIMIT = 350,
  colors = ["#cf9aff", "#ef74b6", "#74cbd1", "#edbf66", "#96b8ef", "#f6f0ff"];
let state = { version: 1, mode: "brush", stones: [] },
  past = [],
  future = [],
  color = colors[0],
  erase = false,
  playing = false,
  cursor = { x: 0, y: 0 },
  renderer;
const view = $("view"),
  status = (t) => ($("status").textContent = t);
try {
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
} catch {
  view.textContent =
    "The 3D studio needs WebGL. Try a browser with hardware acceleration enabled. No project data has been sent anywhere.";
  document
    .querySelectorAll("button,select,input")
    .forEach((e) => (e.disabled = true));
  throw new Error("WebGL unavailable");
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0, 0);
view.append(renderer.domElement);
const scene = new THREE.Scene(),
  camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
camera.position.set(0, 0, 9);
scene.add(new THREE.HemisphereLight(0xffffff, 0x867399, 1.5));
for (const [x, y, z, p] of [
  [-3, 4, 6, 3],
  [4, -1, 4, 1.5],
  [-1, -4, 2, 0.7],
]) {
  const l = new THREE.DirectionalLight(0xffffff, p);
  l.position.set(x, y, z);
  scene.add(l);
}
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = false;
controls.enableZoom = false;
controls.enabled = false;
controls.minDistance = 5;
controls.maxDistance = 15;
controls.maxPolarAngle = Math.PI;
controls.addEventListener("change", render);
const object = new THREE.Group();
scene.add(object);
let surfaces = [],
  batches = [];
const brushMat = new THREE.MeshStandardMaterial({
  color: "#bca2d2",
  roughness: 0.25,
  metalness: 0.25,
});
function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  object.add(m);
  return m;
}
function surface(x, y) {
  if (state.mode === "board")
    return { z: 0.13, normal: new THREE.Vector3(0, 0, 1) };
  const q = 1 - (x * x) / 1.25 ** 2 - (y * y) / 1.75 ** 2;
  if (q <= 0) return null;
  const z = 0.32 * Math.sqrt(q);
  return {
    z,
    normal: new THREE.Vector3(
      x / 1.25 ** 2,
      y / 1.75 ** 2,
      z / 0.32 ** 2,
    ).normalize(),
  };
}
function fits(s, stones = state.stones) {
  const r = s.size * (s.shape === "marquise" ? 1.4 : 1.1);
  if (state.mode === "board") {
    if (Math.abs(s.x) + r > 1.65 || Math.abs(s.y) + r > 2) return false;
  } else if ((s.x / (1.25 - r)) ** 2 + (s.y / (1.75 - r)) ** 2 > 0.94)
    return false;
  return !stones.some(
    (t) =>
      Math.hypot(t.x - s.x, t.y - s.y) <
      (t.size * (t.shape === "marquise" ? 1.4 : 1.1) + r) * 0.97,
  );
}
function gemGeometry(shape) {
  const n = shape === "square" ? 4 : shape === "marquise" ? 8 : 10,
    vertices = [],
    rings = [
      [1, 0],
      [1, 0.25],
      [0.53, 0.8],
    ];
  const point = (i, r, h) => {
    const a = (i / n) * Math.PI * 2 + (shape === "square" ? Math.PI / 4 : 0);
    return [
      Math.cos(a) * r * (shape === "marquise" ? 0.65 : 1),
      Math.sin(a) * r * (shape === "marquise" ? 1.4 : 1),
      h,
    ];
  };
  for (let k = 0; k < 2; k++)
    for (let i = 0; i < n; i++) {
      const a = point(i, ...rings[k]),
        b = point(i + 1, ...rings[k]),
        c = point(i + 1, ...rings[k + 1]),
        d = point(i, ...rings[k + 1]);
      vertices.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
  for (let i = 0; i < n; i++)
    vertices.push(
      0,
      0,
      0.8,
      ...point(i, ...rings[2]),
      ...point(i + 1, ...rings[2]),
    );
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.computeVertexNormals();
  return g;
}
const geometries = Object.fromEntries(
  ["round", "square", "marquise"].map((s) => [s, gemGeometry(s)]),
);
function rebuild() {
  for (const child of [...object.children]) {
    object.remove(child);
    if (!Object.values(geometries).includes(child.geometry))
      child.geometry?.dispose();
    if (child.material !== brushMat) child.material?.dispose();
  }
  surfaces = [];
  batches = [];
  if (state.mode === "brush") {
    const head = mesh(new THREE.SphereGeometry(1, 64, 40), brushMat);
    head.scale.set(1.25, 1.75, 0.32);
    surfaces.push(head);
    const handle = mesh(
      new THREE.CapsuleGeometry(0.23, 1.5, 10, 24),
      brushMat,
      0,
      -2.05,
      -0.08,
    );
    const collar = mesh(
      new THREE.TorusGeometry(0.235, 0.035, 8, 32),
      new THREE.MeshStandardMaterial({
        color: "#ddc8a4",
        metalness: 0.8,
        roughness: 0.25,
      }),
      0,
      -2.8,
      -0.08,
    );
    collar.rotation.x = Math.PI / 2;
    const bristleGeo = new THREE.CylinderGeometry(0.018, 0.026, 0.18, 5);
    const bristles = new THREE.InstancedMesh(
      bristleGeo,
      new THREE.MeshStandardMaterial({ color: "#584267", roughness: 0.6 }),
      150,
    );
    let n = 0;
    const o = new THREE.Object3D();
    for (let y = -1.4; y < 1.5; y += 0.23)
      for (let x = -1; x < 1.1; x += 0.23) {
        if ((x / 1.13) ** 2 + (y / 1.6) ** 2 < 1) {
          o.position.set(x, y, -0.32);
          o.rotation.x = Math.PI / 2;
          o.updateMatrix();
          bristles.setMatrixAt(n++, o.matrix);
        }
      }
    bristles.count = n;
    object.add(bristles);
  } else
    surfaces.push(
      mesh(
        new THREE.BoxGeometry(3.3, 4, 0.25),
        new THREE.MeshStandardMaterial({ color: "#fff7ed", roughness: 0.7 }),
      ),
    );
  const groups = new Map();
  state.stones.forEach((s, i) => {
    const key = [s.shape, s.color, s.finish].join(":");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push([s, i]);
  });
  for (const group of groups.values()) {
    const s = group[0][0],
      mat = new THREE.MeshStandardMaterial({
        color: s.color,
        metalness:
          s.finish === "metal" ? 0.85 : s.finish === "crystal" ? 0.4 : 0.05,
        roughness: s.finish === "pearl" ? 0.65 : 0.16,
        flatShading: true,
      });
    const b = new THREE.InstancedMesh(geometries[s.shape], mat, group.length),
      o = new THREE.Object3D();
    b.userData.indices = [];
    group.forEach(([s, i], j) => {
      const f = surface(s.x, s.y);
      o.position.set(s.x, s.y, f.z + 0.012);
      o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), f.normal);
      o.scale.setScalar(s.size);
      o.updateMatrix();
      b.setMatrixAt(j, o.matrix);
      b.userData.indices.push(i);
    });
    object.add(b);
    batches.push(b);
  }
  $("count").textContent = `${state.stones.length} / ${LIMIT} stones`;
  $("undo").disabled = !past.length;
  $("redo").disabled = !future.length;
  $("svg").disabled = state.mode !== "board";
  document
    .querySelectorAll("[data-mode]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", b.dataset.mode === state.mode),
    );
  render();
}
function render() {
  renderer.render(scene, camera);
}
function resize() {
  const r = view.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height;
  camera.updateProjectionMatrix();
  render();
}
new ResizeObserver(resize).observe(view);
function commit(next) {
  past.push(structuredClone(state));
  if (past.length > 80) past.shift();
  future = [];
  state = next;
  rebuild();
}
function place(x, y) {
  const size = Number($("size").value),
    base = {
      x,
      y,
      size,
      shape: $("shape").value,
      color,
      finish: $("finish").value,
    };
  const options =
    $("pattern").value === "mirror"
      ? [base, { ...base, x: -x }]
      : $("pattern").value === "row"
        ? [-1, 0, 1].map((n) => ({ ...base, x: x + n * size * 3.2 }))
        : [base];
  const next = structuredClone(state);
  let added = 0;
  for (const s of options)
    if (next.stones.length < LIMIT && fits(s, next.stones)) {
      next.stones.push(s);
      added++;
    }
  if (added) {
    commit(next);
    status(
      `${added === 1 ? "Stone" : added + " stones"} placed. Make it yours.`,
    );
  } else
    status(
      "Try a little more space, a smaller stone, or a spot inside the surface.",
    );
}
const ray = new THREE.Raycaster(),
  pointer = new THREE.Vector2();
let down = null;
renderer.domElement.addEventListener("pointerdown", (e) => {
  down = { x: e.clientX, y: e.clientY, id: e.pointerId };
});
renderer.domElement.addEventListener("pointercancel", () => (down = null));
renderer.domElement.addEventListener("pointerup", (e) => {
  if (
    !down ||
    down.id !== e.pointerId ||
    playing ||
    Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7
  ) {
    down = null;
    return;
  }
  down = null;
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(
    ((e.clientX - r.left) / r.width) * 2 - 1,
    (-(e.clientY - r.top) / r.height) * 2 + 1,
  );
  ray.setFromCamera(pointer, camera);
  if (erase) {
    const hit = ray.intersectObjects(batches)[0];
    if (hit) {
      const next = structuredClone(state);
      next.stones.splice(hit.object.userData.indices[hit.instanceId], 1);
      commit(next);
      status("Stone removed.");
    }
    return;
  }
  const hit = ray.intersectObjects(surfaces)[0];
  if (!hit) return;
  if (
    (state.mode === "brush" && hit.point.z < 0) ||
    (state.mode === "board" && hit.face.normal.z < 0.9)
  ) {
    status("Turn to the front surface to place stones.");
    return;
  }
  place(hit.point.x, hit.point.y);
});
// Visible keyboard target, separate from exported artwork.
const target = new THREE.Mesh(
  new THREE.RingGeometry(0.04, 0.06, 24),
  new THREE.MeshBasicMaterial({
    color: "#462361",
    side: THREE.DoubleSide,
    depthTest: false,
  }),
);
target.visible = false;
scene.add(target);
view.addEventListener("keydown", (e) => {
  if (
    ![
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Enter",
      "Delete",
      "Backspace",
    ].includes(e.key)
  )
    return;
  e.preventDefault();
  if (e.key.startsWith("Arrow")) {
    cursor.x += e.key === "ArrowLeft" ? -0.1 : e.key === "ArrowRight" ? 0.1 : 0;
    cursor.y += e.key === "ArrowDown" ? -0.1 : e.key === "ArrowUp" ? 0.1 : 0;
    cursor.x = Math.max(-1, Math.min(1, cursor.x));
    cursor.y = Math.max(-1.4, Math.min(1.4, cursor.y));
  } else if (e.key === "Enter") place(cursor.x, cursor.y);
  else {
    const i = state.stones.findIndex(
      (s) => Math.hypot(s.x - cursor.x, s.y - cursor.y) < 0.3,
    );
    if (i >= 0) {
      const n = structuredClone(state);
      n.stones.splice(i, 1);
      commit(n);
    }
  }
  const f = surface(cursor.x, cursor.y);
  target.position.set(cursor.x, cursor.y, f.z + 0.2);
  target.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), f.normal);
  target.visible = true;
  render();
});
view.addEventListener("blur", () => {
  target.visible = false;
  render();
});
colors.forEach((c, i) => {
  const b = document.createElement("button");
  b.style.background = c;
  b.setAttribute(
    "aria-label",
    ["Lilac", "Pink", "Aquamarine", "Champagne", "Blue", "Ice"][i],
  );
  b.setAttribute("aria-pressed", i === 0);
  b.onclick = () => {
    color = c;
    [...$("colors").children].forEach((el) =>
      el.setAttribute("aria-pressed", el === b),
    );
  };
  $("colors").append(b);
});
function setPlay(v) {
  playing = v;
  controls.enabled = v;
  renderer.domElement.style.touchAction = v ? "none" : "pan-y";
  $("design").setAttribute("aria-pressed", !v);
  $("play").setAttribute("aria-pressed", v);
  status(
    v
      ? "Drag to orbit. Use + / − to zoom. Scroll outside the canvas."
      : "Tap the surface to place a stone.",
  );
}
$("design").onclick = () => setPlay(false);
$("play").onclick = () => setPlay(true);
$("erase").onclick = () => {
  erase = !erase;
  $("erase").setAttribute("aria-pressed", erase);
  setPlay(false);
  status(
    erase ? "Tap a stone to remove it." : "Tap the surface to place a stone.",
  );
};
function home() {
  camera.position.set(0, -0.35, 9);
  controls.target.set(0, -0.35, 0);
  controls.update();
  render();
}
$("home").onclick = home;
for (const [id, factor] of [
  ["plus", 0.85],
  ["minus", 1.15],
])
  $(id).onclick = () => {
    const v = camera.position.clone().sub(controls.target);
    v.setLength(Math.max(5, Math.min(15, v.length() * factor)));
    camera.position.copy(controls.target).add(v);
    controls.update();
    render();
  };
$("undo").onclick = () => {
  if (past.length) {
    future.push(structuredClone(state));
    state = past.pop();
    rebuild();
  }
};
$("redo").onclick = () => {
  if (future.length) {
    past.push(structuredClone(state));
    state = future.pop();
    rebuild();
  }
};
$("reset").onclick = () => commit({ ...state, stones: [] });
document.querySelectorAll("[data-mode]").forEach(
  (b) =>
    (b.onclick = () => {
      if (state.mode !== b.dataset.mode) {
        commit({ version: 1, mode: b.dataset.mode, stones: [] });
        home();
        status("Fresh surface. Undo brings your previous design back.");
      }
    }),
);
function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function validate(v) {
  if (
    !v ||
    v.version !== 1 ||
    !["brush", "board"].includes(v.mode) ||
    !Array.isArray(v.stones) ||
    v.stones.length > LIMIT
  )
    throw Error("Unsupported project.");
  const old = state;
  state = { mode: v.mode };
  const stones = [];
  try {
    for (const s of v.stones) {
      if (
        !s ||
        !["round", "square", "marquise"].includes(s.shape) ||
        !colors.includes(s.color) ||
        !["crystal", "metal", "pearl"].includes(s.finish) ||
        ![0.11, 0.16, 0.23].includes(s.size) ||
        !Number.isFinite(s.x) ||
        !Number.isFinite(s.y)
      )
        throw Error("Invalid stone data.");
      const clean = {
        x: s.x,
        y: s.y,
        size: s.size,
        shape: s.shape,
        color: s.color,
        finish: s.finish,
      };
      if (!fits(clean, stones))
        throw Error("Project has overlapping or out-of-bounds stones.");
      stones.push(clean);
    }
  } finally {
    state = old;
  }
  return { version: 1, mode: v.mode, stones };
}
$("save").onclick = () =>
  download(
    new Blob([JSON.stringify(state)], { type: "application/json" }),
    "bedazzle-project.json",
  );
$("load").onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 100000) throw Error("Project must be under 100 KB.");
    commit(validate(JSON.parse(await file.text())));
    home();
    status("Project loaded. All stones are editable.");
  } catch (e) {
    status("Could not load: " + e.message);
  } finally {
    e.target.value = "";
  }
};
async function imageBlob() {
  const [w, h] =
    $("aspect").value === "portrait"
      ? [1200, 1600]
      : $("aspect").value === "landscape"
        ? [1600, 1200]
        : [1200, 1200];
  const size = renderer.getSize(new THREE.Vector2()),
    ratio = renderer.getPixelRatio(),
    aspect = camera.aspect,
    visible = target.visible;
  try {
    target.visible = false;
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d"),
      format = $("format").value;
    if (format === "jpeg" || !$("transparent").checked) {
      ctx.fillStyle = "#eee2fa";
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(renderer.domElement, 0, 0);
    return await new Promise((resolve, reject) =>
      c.toBlob(
        (b) => (b ? resolve(b) : reject(Error("Image export failed."))),
        "image/" + format,
        0.94,
      ),
    );
  } finally {
    renderer.setPixelRatio(ratio);
    renderer.setSize(size.x, size.y, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    target.visible = visible;
    render();
  }
}
async function exportImage(share = false) {
  try {
    const blob = await imageBlob(),
      name = "bedazzle." + ($("format").value === "jpeg" ? "jpg" : "png"),
      file = new File([blob], name, { type: blob.type });
    if (share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "My Bedazzle design" });
        status("Shared using your device.");
      } catch (e) {
        if (e.name !== "AbortError") throw e;
        status("Sharing cancelled.");
      }
    } else {
      download(blob, name);
      status(
        share
          ? "File sharing unavailable here; image downloaded."
          : "Your image is ready.",
      );
    }
  } catch (e) {
    status(e.message);
  }
}
$("export").onclick = () => exportImage();
$("share").onclick = () => exportImage(true);
$("svg").onclick = () => {
  if (state.mode !== "board") return;
  const shapes = state.stones
    .map((s) => {
      const n = s.shape === "square" ? 4 : 10,
        pts = Array.from({ length: n }, (_, i) => {
          const a =
            (i / n) * Math.PI * 2 + (s.shape === "square" ? Math.PI / 4 : 0);
          return `${(s.x + Math.cos(a) * s.size * (s.shape === "marquise" ? 0.65 : 1)) * 200 + 330},${400 - (s.y + Math.sin(a) * s.size * (s.shape === "marquise" ? 1.4 : 1)) * 200}`;
        }).join(" ");
      return `<polygon points="${pts}" fill="${s.color}" stroke="#ffffff" stroke-width="1"/>`;
    })
    .join("");
  download(
    new Blob(
      [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 800"><title>Editable decorative gem layout</title>${shapes}</svg>`,
      ],
      { type: "image/svg+xml" },
    ),
    "bedazzle-board.svg",
  );
};
$("print").onclick = async () => {
  try {
    const blob = await imageBlob(),
      url = URL.createObjectURL(blob);
    $("printout").replaceChildren();
    const img = new Image();
    img.src = url;
    await img.decode();
    $("printout").append(img);
    const p = document.createElement("p");
    p.textContent = `Bedazzle Studio · ${state.stones.length} gems · Decorative layout, not a physical fitting template.`;
    $("printout").append(p);
    status(
      "Print view ready. Use your browser’s print command when you choose.",
    );
    document.body.classList.toggle("preview-print");
    const win = document.createElement("dialog");
    const copy = img.cloneNode();
    copy.style.cssText = "width:100%;max-height:70vh;object-fit:contain";
    win.append(copy, p.cloneNode());
    const close = document.createElement("button");
    close.textContent = "Close print preview";
    close.onclick = () => {
      win.close();
      win.remove();
      URL.revokeObjectURL(url);
    };
    win.append(close);
    document.body.append(win);
    win.showModal();
  } catch (e) {
    status(e.message);
  }
};
// Original, restrained constellation gives the first surface a useful starting point.
for (let i = 0; i < 9; i++) {
  const a = (i / 9) * Math.PI * 2;
  state.stones.push({
    x: 0.62 * Math.cos(a),
    y: 0.9 * Math.sin(a) + 0.18,
    size: 0.16,
    shape: i % 3 === 0 ? "marquise" : "round",
    color: colors[i % 3],
    finish: "crystal",
  });
}
rebuild();
home();
resize();
setPlay(false);
