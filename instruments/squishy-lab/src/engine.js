import * as T from "three";
import R from "@dimforge/rapier3d-compat";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { cage, skin } from "./model.js";
export async function engine(canvas, onGrab) {
  await R.init();
  const renderer = new T.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  renderer.setClearColor(0xeee8ed, 1);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(2, 1.3, 5.8);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = 3;
  controls.maxDistance = 10;
  controls.enabled = false;
  const pmrem = new T.PMREMGenerator(renderer),
    room = new RoomEnvironment(),
    env = pmrem.fromScene(room);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.65;
  room.dispose();
  pmrem.dispose();
  scene.add(new T.HemisphereLight(0xffffff, 0x776677, 0.7));
  const light = new T.DirectionalLight(0xffffff, 1.5);
  light.position.set(3, 5, 4);
  scene.add(light);
  const ground = new T.Group();
  scene.add(ground);
  const plinth = new T.Mesh(
    new T.CylinderGeometry(1.75, 1.85, 0.14, 64),
    new T.MeshStandardMaterial({ color: 0xf8f3eb, roughness: 0.8 }),
  );
  plinth.position.y = -1.25;
  ground.add(plinth);
  const material = new T.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.2,
    clearcoat: 1,
    metalness: 0.03,
  });
  let mesh,
    world,
    body,
    rest,
    base,
    links,
    pinned,
    design,
    mode = "squeeze",
    paused = false,
    busy = false,
    selected = [],
    grab,
    last;
  function mat() {
    const m = R.SoftBodyMaterial.uniform(
      3 + design.spring * 8,
      0.15 + (1 - design.rebound) * 0.7,
    );
    m.volumeSoftness = {
      naturalFrequency: 12 - design.squish * 9,
      dampingRatio: 0.5,
    };
    m.shapeMatchingSoftness = {
      naturalFrequency: 2 + design.rebound * 6,
      dampingRatio: 0.15 + (1 - design.rebound) * 0.6,
    };
    return m;
  }
  function look() {
    material.roughness =
      design.finish === "matte"
        ? 0.82
        : design.finish === "pearl"
          ? 0.27
          : 0.15;
    material.clearcoat = design.finish === "matte" ? 0 : 1;
    material.iridescence = design.finish === "pearl" ? 0.6 : 0;
    material.needsUpdate = true;
    const a = new T.Color(design.colorA),
      b = new T.Color(design.colorB),
      c = new T.Color(),
      colors = new Float32Array(base.length);
    for (let i = 0; i < base.length; i += 3) {
      const x = base[i],
        y = base[i + 1],
        z = base[i + 2];
      let f = design.mix;
      if (design.pattern === "blend")
        f = T.MathUtils.clamp(design.mix + y * 0.25, 0, 1);
      if (design.pattern === "stripes")
        f = T.MathUtils.smoothstep(
          Math.sin((y + x * 0.2) * 10),
          1 - design.mix * 2 - 0.3,
          1 - design.mix * 2 + 0.3,
        );
      if (design.pattern === "swirl")
        f = 0.5 + 0.5 * Math.sin(Math.atan2(z, x) * 3 + y * 7 + design.mix * 6);
      if (design.pattern === "speckles")
        f =
          (((Math.sin(
            Math.floor(x * 18) * 127.1 +
              Math.floor(y * 18) * 311.7 +
              Math.floor(z * 18) * 74.7,
          ) *
            43758.5453) %
            1) +
            1) %
            1 <
          design.mix * 0.5
            ? 1
            : 0;
      c.copy(a).lerp(b, f);
      colors.set([c.r, c.g, c.b], i);
    }
    mesh.geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
    body.setMaterial(mat());
  }
  function create(d) {
    design = { ...d };
    selected = [];
    grab = null;
    world?.free();
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
    }
    const g = cage(d.shape);
    rest = g.attributes.position.array.slice();
    const idx = Array.from(g.index.array),
      edges = new Set();
    for (let i = 0; i < idx.length; i += 3)
      for (const [a, b] of [
        [idx[i], idx[i + 1]],
        [idx[i + 1], idx[i + 2]],
        [idx[i + 2], idx[i]],
      ])
        edges.add(a < b ? `${a},${b}` : `${b},${a}`);
    const minY = Math.min(...Array.from(rest).filter((_, i) => i % 3 === 1));
    plinth.position.y = minY - 0.07;
    pinned = [];
    for (let i = 0; i < rest.length / 3; i++)
      if (rest[i * 3 + 1] < minY + 0.07) pinned.push(i);
    world = new R.World({ x: 0, y: 0, z: 0 });
    body = world.createSoftBody(
      new R.SoftBodyDesc(rest)
        .setEdges([...edges].flatMap((e) => e.split(",").map(Number)))
        .setSurface(idx)
        .setShapeMatching(true)
        .setVolumePreservation(true)
        .setPinnedParticles(pinned)
        .setMass(1)
        .setMaterial(mat())
        .setLinearDamping(0.2)
        .setNoSurfaceCollider(),
    );
    g.dispose();
    const geo = skin(d.shape);
    base = geo.attributes.position.array.slice();
    links = [];
    for (let i = 0; i < base.length; i += 3) {
      const nearest = [];
      for (let j = 0; j < rest.length; j += 3) {
        const distance =
          (base[i] - rest[j]) ** 2 +
          (base[i + 1] - rest[j + 1]) ** 2 +
          (base[i + 2] - rest[j + 2]) ** 2;
        nearest.push({ j, w: 1 / Math.max(distance, 0.000001) });
      }
      nearest.sort((a, b) => b.w - a.w);
      const four = nearest.slice(0, 4),
        sum = four.reduce((s, v) => s + v.w, 0);
      links.push(four.map((v) => ({ ...v, w: v.w / sum })));
    }
    mesh = new T.Mesh(geo, material);
    scene.add(mesh);
    look();
    sync();
  }
  function sync() {
    if (!body) return;
    const p = body.particlePositions(),
      out = mesh.geometry.attributes.position.array;
    links.forEach((near, i) => {
      for (let k = 0; k < 3; k++)
        out[i * 3 + k] =
          base[i * 3 + k] +
          near.reduce((sum, v) => sum + v.w * (p[v.j + k] - rest[v.j + k]), 0);
    });
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeBoundingSphere();
  }
  function capture() {
    return {
      design: { ...design },
      pose: Array.from(body.particlePositions()),
      velocities: Array.from(body.particleVelocities()),
      paused,
      view: {
        position: camera.position.toArray(),
        target: controls.target.toArray(),
      },
    };
  }
  function restore(state) {
    create(state.design);
    for (let i = 0; i < body.numParticles(); i++) {
      body.setParticlePosition(i, {
        x: state.pose[i * 3],
        y: state.pose[i * 3 + 1],
        z: state.pose[i * 3 + 2],
      });
      body.setParticleVelocity(i, {
        x: state.velocities?.[i * 3] || 0,
        y: state.velocities?.[i * 3 + 1] || 0,
        z: state.velocities?.[i * 3 + 2] || 0,
      });
    }
    paused = state.paused ?? true;
    camera.position.fromArray(state.view.position);
    controls.target.fromArray(state.view.target);
    controls.update();
    sync();
    render();
  }
  const ray = new T.Raycaster(),
    plane = new T.Plane(),
    point = new T.Vector3();
  function cast(e) {
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(
      new T.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      ),
      camera,
    );
  }
  canvas.addEventListener("pointerdown", (e) => {
    if (!body || paused || mode === "orbit" || mode === "scroll") return;
    cast(e);
    const hit = ray.intersectObject(mesh)[0];
    if (!hit) return;
    selected = [];
    const p = body.particlePositions();
    for (let i = 0; i < body.numParticles(); i++) {
      const v = new T.Vector3(...p.slice(i * 3, i * 3 + 3)),
        dist = v.distanceTo(hit.point);
      if (dist < 0.55 && !pinned.includes(i))
        selected.push({ i, p: v, w: Math.max(0.3, 1 - dist / 0.65) });
    }
    if (!selected.length) return;
    onGrab();
    plane.setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new T.Vector3()),
      hit.point,
    );
    grab = hit.point.clone();
    last = grab.clone();
    selected.forEach((v) => body.setParticlePinned(v.i, true));
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!grab) return;
    cast(e);
    if (ray.ray.intersectPlane(plane, point)) last = point.clone();
  });
  function release() {
    selected.forEach((v) => body.setParticlePinned(v.i, pinned.includes(v.i)));
    selected = [];
    grab = null;
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("lostpointercapture", release);
  function resize() {
    if (busy) return;
    const r = canvas.parentElement.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize();
  function render() {
    renderer.render(scene, camera);
  }
  let previous = performance.now(),
    acc = 0,
    elapsed = 0,
    frames = 0,
    fps = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    const wall = (now - previous) / 1000;
    previous = now;
    elapsed += wall;
    frames++;
    if (elapsed > 1) {
      fps = frames / elapsed;
      frames = 0;
      elapsed = 0;
    }
    if (busy) return;
    controls.update();
    if (body && !paused) {
      acc = Math.min(acc + wall, 0.05);
      while (acc >= 1 / 60) {
        if (grab) {
          const delta = last.clone().sub(grab).clampLength(0, 1.5);
          for (const v of selected) {
            let target = v.p.clone();
            if (mode === "squeeze") {
              target.multiplyScalar(
                1 -
                  (0.1 + Math.min(0.35, delta.length() * 0.3)) *
                    v.w *
                    design.squish,
              );
              target.addScaledVector(delta, 0.4 * v.w);
            } else target.addScaledVector(delta, v.w);
            body.setParticleKinematicTarget(v.i, target);
          }
        }
        world.timestep = 1 / 60;
        world.step();
        acc -= 1 / 60;
      }
      sync();
    }
    render();
  }
  requestAnimationFrame(tick);
  return {
    renderer,
    scene,
    camera,
    controls,
    ground,
    get mesh() {
      return mesh;
    },
    create,
    capture,
    restore,
    sync,
    render,
    resize,
    get paused() {
      return paused;
    },
    set paused(v) {
      release();
      paused = v;
      acc = 0;
    },
    set busy(v) {
      busy = v;
    },
    get busy() {
      return busy;
    },
    setMode(v) {
      release();
      mode = v;
      controls.enabled = v === "orbit";
      canvas.style.touchAction = v === "scroll" ? "pan-y" : "none";
    },
    update(d) {
      design = { ...d };
      look();
    },
    quality(v) {
      renderer.setPixelRatio(
        Math.min(devicePixelRatio, v === "full" ? 1.75 : 1.25),
      );
      resize();
    },
    wobble() {
      body.applyImpulseAtPoint(
        { x: 0.035, y: 0.06, z: 0.02 },
        { x: 0.6, y: 0.6, z: 0.6 },
        1.7,
        true,
      );
    },
    stats() {
      return {
        particles: body?.numParticles(),
        fps,
        finite: body
          ? Array.from(body.particlePositions()).every(Number.isFinite)
          : true,
        displacement: body
          ? body
              .particlePositions()
              .reduce((s, x, i) => s + Math.abs(x - rest[i]), 0)
          : 0,
      };
    },
  };
}
