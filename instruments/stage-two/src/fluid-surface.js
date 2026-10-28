import * as T from "three";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";
// Deposit the actual 3D particle positions into a compact-support density field.
// Three's pinned marching-cubes implementation extracts its connected isosurface.
export function fluidSurface(scene, renderer) {
  const resolution = 40,
    extent = 1.7;
  const material = new T.MeshStandardMaterial({
    color: 0x3faaa3,
    metalness: 0.22,
    roughness: 0.22,
    envMapIntensity: 1.25,
  });
  const surface = new MarchingCubes(resolution, material, false, false, 24000);
  surface.scale.setScalar(extent);
  surface.isolation = 0.65;
  surface.frustumCulled = false;
  scene.add(surface);
  // Original procedural studio light boxes, no image textures or fetched assets.
  const studio = new T.Scene();
  studio.background = new T.Color(0x5d6e87);
  const boxes = [];
  for (const [pos, size, colour] of [
    [[0, 4, 0], [5, 0.1, 3], 0xfff5df],
    [[-4, 1, 2], [0.1, 4, 3], 0xb6dbe6],
    [[3, 1, -2], [0.1, 3, 4], 0xffffff],
  ]) {
    const mesh = new T.Mesh(
      new T.BoxGeometry(...size),
      new T.MeshBasicMaterial({ color: colour }),
    );
    mesh.position.set(...pos);
    studio.add(mesh);
    boxes.push(mesh);
  }
  const pmrem = new T.PMREMGenerator(renderer),
    environment = pmrem.fromScene(studio, 0.06, 0.1, 20);
  material.envMap = environment.texture;
  pmrem.dispose();
  for (const box of boxes) {
    box.geometry.dispose();
    box.material.dispose();
  }
  function update(p) {
    surface.reset();
    const size = resolution,
      step = (2 * extent) / size,
      radius = 0.245,
      r2 = radius * radius,
      field = surface.field;
    for (let i = 0; i < p.length; i += 3) {
      const x = (p[i] + extent) / step,
        y = (p[i + 1] + extent) / step,
        z = (p[i + 2] + extent) / step,
        reach = radius / step;
      const x0 = Math.max(1, Math.floor(x - reach)),
        x1 = Math.min(size - 2, Math.ceil(x + reach)),
        y0 = Math.max(1, Math.floor(y - reach)),
        y1 = Math.min(size - 2, Math.ceil(y + reach)),
        z0 = Math.max(1, Math.floor(z - reach)),
        z1 = Math.min(size - 2, Math.ceil(z + reach));
      for (let iz = z0; iz <= z1; iz++)
        for (let iy = y0; iy <= y1; iy++)
          for (let ix = x0; ix <= x1; ix++) {
            const d2 =
              ((ix - x) ** 2 + (iy - y) ** 2 + (iz - z) ** 2) * step * step;
            if (d2 < r2) {
              const q = 1 - d2 / r2;
              field[iz * size * size + iy * size + ix] += q * q * q;
            }
          }
    }
    surface.update();
    return surface.count / 3;
  }
  return {
    mesh: surface,
    update,
    dispose() {
      environment.dispose();
    },
  };
}
