/* Kiln: draw half a silhouette and it is thrown into a porcelain vessel on a turning wheel.
 * The stroke becomes a lathe profile; walls are given thickness and a rolled rim so the mesh is a closed solid.
 * Glazes are real-time physically based materials, not a kiln simulation; OBJ export is artwork geometry only. */
import * as THREE from '../../assets/vendor/three/three.module.min.js';
import {rng} from './gpu.js';

const GLAZES = [['#F3B6AE', 'blush'], ['#C9B6EA', 'lilac'], ['#A9D8C4', 'celadon'], ['#2E3A7A', 'cobalt']];
const BISQUE = new THREE.Color('#E8DACB'), H = 2.3, BASE_Y = -1.25, WALL = .07, LOOK_Y = -.62;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// A seeded starting vase: a foot, a belly, a neck and a lip, so the wheel is never empty.
export function defaultProfile(seed) {
  const r = rng(seed), belly = .55 + r() * .35, neck = .22 + r() * .18, lip = neck + .08 + r() * .2, bellyAt = .3 + r() * .25;
  return Array.from({length: 48}, (_, i) => {
    const y = i / 47, b = Math.exp(-((y - bellyAt) ** 2) / .06), n = Math.exp(-((y - .78) ** 2) / .02);
    return [Math.max(.12, .34 + (belly - .34) * b - (belly - neck) * n * .9 + (lip - neck) * Math.max(0, (y - .86) / .14) ** 2), y * H];
  });
}

// Turn a freehand stroke (world x = radius, world y = height) into an even, smoothed profile from foot to rim.
export function profileFromStroke(points) {
  const pts = points.map(([x, y]) => [Math.abs(x), y]).sort((a, b) => a[1] - b[1]);
  const y0 = pts[0][1], y1 = pts[pts.length - 1][1];
  if (pts.length < 3 || y1 - y0 < .25) return null;
  const out = [];
  for (let i = 0; i < 48; i++) {
    const y = y0 + (y1 - y0) * i / 47; let j = pts.findIndex(p => p[1] >= y); if (j < 1) j = 1;
    const [ra, ya] = pts[j - 1], [rb, yb] = pts[j], t = yb > ya ? (y - ya) / (yb - ya) : 0;
    out.push([ra + (rb - ra) * t, (y - y0) * Math.min(1, H / (y1 - y0))]);
  }
  for (let pass = 0; pass < 3; pass++) for (let i = 1; i < 47; i++) out[i][0] = (out[i - 1][0] + out[i][0] * 2 + out[i + 1][0]) / 4;
  return out.map(([r, y]) => [clamp(r, .1, 1.5), y]);
}

// Outer wall up, rolled rim, inner wall down, inner floor: one closed outline for the lathe.
export function solidOutline(profile, ridges = 0) {
  const outer = profile.map(([r, y]) => [r + ridges * .012 * Math.sin(y * 38), y]);
  const top = outer[outer.length - 1], floor = WALL * 1.6, outline = [[0, 0], [outer[0][0] * .92, 0], ...outer];
  for (let i = 1; i < 6; i++) { const a = i / 6 * Math.PI; outline.push([top[0] - WALL / 2 + Math.cos(a) * WALL / 2, top[1] + Math.sin(a) * WALL * .6]); }
  for (let i = outer.length - 1; i >= 0; i--) { const [r, y] = outer[i]; if (y < floor) break; outline.push([Math.max(.03, r - WALL), y]); }
  outline.push([0, floor]);
  return outline;
}

function softShadow() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64); grad.addColorStop(0, 'rgba(36,11,33,.32)'); grad.addColorStop(1, 'rgba(36,11,33,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createVessel(canvas) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: false, preserveDrawingBuffer: true}); }
  catch (error) { throw new Error('Kiln needs WebGL. The other Studio worlds are still available.', {cause: error}); }
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .9;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, .1, 50);
  camera.position.set(0, .3, 7.4); camera.lookAt(0, LOOK_Y, 0);
  // A small light tent baked into an environment map: two softboxes and a warm bounce.
  const tent = new THREE.Scene(), box = new THREE.BoxGeometry(1, 1, 1);
  const panel = (c, i, s, p) => { const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({color: new THREE.Color(c).multiplyScalar(i)})); m.scale.set(...s); m.position.set(...p); tent.add(m); };
  const room = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshBasicMaterial({color: new THREE.Color('#bdb3b0'), side: THREE.BackSide})); tent.add(room);
  panel('#ffffff', 6, [3, 4, .2], [-3.5, 2, 3]); panel('#fff4ea', 4, [.2, 3, 5], [5.8, 1, 0]); panel('#f3c9d0', 1.6, [6, .2, 6], [0, -3.9, 0]);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(tent, .04).texture; pm.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cdd1, .4));
  const key = new THREE.DirectionalLight(0xfff1e2, 1.6); key.position.set(-3, 5, 4); scene.add(key);
  const wheel = new THREE.Group(); wheel.position.y = BASE_Y; scene.add(wheel);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.75, .16, 96), new THREE.MeshPhysicalMaterial({color: '#EFE8E3', roughness: .6, clearcoat: .3}));
  plinth.position.y = -.08; scene.add(plinth); plinth.position.y = BASE_Y - .08;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({map: softShadow(), transparent: true, depthWrite: false}));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = BASE_Y + .002; scene.add(shadow);
  const glaze = new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: .22, clearcoat: 1, clearcoatRoughness: .08, sheen: .3, sheenColor: new THREE.Color('#ffffff')});
  const pot = new THREE.Mesh(new THREE.BufferGeometry(), glaze); wheel.add(pot);
  const strokeMat = new THREE.LineBasicMaterial({color: '#654A4E', transparent: true, opacity: .9});
  const stroke = new THREE.Line(new THREE.BufferGeometry(), strokeMat); scene.add(stroke);
  const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, BASE_Y, 0), new THREE.Vector3(0, BASE_Y + H + .3, 0)]), new THREE.LineDashedMaterial({color: '#916A70', dashSize: .06, gapSize: .06, transparent: true, opacity: 0}));
  axis.computeLineDistances(); scene.add(axis);
  let profile = defaultProfile(42), drawn = [], lastStroke = -10, built = '', tone = -1, now = 0, w = 1, h = 1;
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();

  function build(settings) {
    const key = JSON.stringify([profile, settings.energy, settings.tone]); if (key === built) return; built = key;
    const outline = solidOutline(profile, settings.energy ?? .55).map(([r, y]) => new THREE.Vector2(r, y));
    const geometry = new THREE.LatheGeometry(outline, 128); geometry.computeVertexNormals();
    const colour = new THREE.Color(GLAZES[settings.tone || 0][0]), pos = geometry.attributes.position, colours = new Float32Array(pos.count * 3);
    // Unglazed foot: the bottom of the outside is bare bisque, the way glaze is wiped from a real foot ring.
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i), r = Math.hypot(pos.getX(i), pos.getZ(i)), bare = y < .09 && r > .2; const c = bare ? BISQUE : colour; colours.set([c.r, c.g, c.b], i * 3); }
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    pot.geometry.dispose(); pot.geometry = geometry;
    const top = Math.max(...profile.map(p => p[1])); shadow.scale.setScalar(.6 + Math.max(...profile.map(p => p[0])) * .7); camera.position.y = .2 + top * .1; camera.lookAt(0, LOOK_Y, 0);
  }
  function toWorld(x, y) { ray.setFromCamera(new THREE.Vector2(x * 2 - 1, 1 - y * 2), camera); return ray.ray.intersectPlane(plane, hit) ? [hit.x, hit.y - BASE_Y] : null; }

  return {
    renderer: 'webgl',
    resize(width, height, dpr = 1) { w = width; h = height; renderer.setPixelRatio(Math.min(dpr, 2)); renderer.setSize(width, height, false); camera.aspect = width / height; camera.fov = width / height < .8 ? 44 : 32; camera.updateProjectionMatrix(); },
    reset(seed, settings) { profile = defaultProfile(seed); drawn = []; built = ''; stroke.visible = false; build(settings); },
    render(time, settings) {
      now = time; build(settings);
      wheel.rotation.y = time * .5;
      const dark = !!settings.dark; scene.background = new THREE.Color(dark ? '#17112A' : '#FBF7F1'); renderer.toneMappingExposure = dark ? .8 : .9;
      plinth.material.color.set(dark ? '#2B2340' : '#EFE8E3');
      const fade = clamp(1 - (time - lastStroke - 1.2) / 1.5, 0, 1); strokeMat.opacity = .9 * fade; stroke.visible = fade > 0; axis.material.opacity = .55 * fade;
      renderer.render(scene, camera);
    },
    interact(x, y, dx = 0, dy = 0) {
      const p = toWorld(x, y); if (!p) return;
      if (!dx && !dy) drawn = [];
      drawn.push(p); lastStroke = now;
      stroke.geometry.dispose(); stroke.geometry = new THREE.BufferGeometry().setFromPoints(drawn.map(([r, yy]) => new THREE.Vector3(r, yy + BASE_Y, .02)));
      const next = profileFromStroke(drawn); if (next) profile = next;
    },
    exportObj() {
      const g = pot.geometry, pos = g.attributes.position, index = g.index, lines = ['# assembl Living Studio — Kiln vessel; artwork mesh, 1 unit ≈ 10 cm; not validated for printing or food use', 'o vessel'];
      for (let i = 0; i < pos.count; i++) lines.push(`v ${pos.getX(i).toFixed(5)} ${pos.getY(i).toFixed(5)} ${pos.getZ(i).toFixed(5)}`);
      for (let i = 0; i < index.count; i += 3) lines.push(`f ${index.getX(i) + 1} ${index.getX(i + 1) + 1} ${index.getX(i + 2) + 1}`);
      return lines.join('\n') + '\n';
    },
    getView: () => ({profile}),
    dispose() { pot.geometry.dispose(); renderer.dispose(); },
  };
}
