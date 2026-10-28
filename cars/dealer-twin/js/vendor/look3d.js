// Copied read-only from the assembl lab (wt_kimi/cars/look3d.js): the stylised studio car kit used for the lab's stock renders.
// The studio look for the car maquettes, shared by the /cars/ stage, the /cars/check/ stage and the stock renders: satin paint
// on paper under a soft studio key, smoked flush glass, satin-black trim, brushed rims and a contact shadow. Light and dark.
//   const look = await studio(THREE, renderer, scene, { dark })   → { setDark(dark), ground, sun }
//   const mats = carMaterials(THREE, paint)                       → { body, glass, tyres, rims, heads, tails, trim, setPaint(hex) }
export async function studio(THREE, renderer, scene, opts = {}) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping || THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // reflections: a studio of soft boxes over a pale floor, so the paint carries long, soft highlights and a horizon line
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(studioRoom(THREE), 0.03).texture; scene.environmentIntensity = 1.0; pm.dispose();
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd8cdd0, 0.55); scene.add(hemi);
  // the key: high and a little behind the car's left shoulder, so the flanks the camera sees fall into a soft half-light
  const sun = new THREE.DirectionalLight(0xfff7ef, 2.1); sun.position.set(-0.9, 10, -1.3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 1, far: 22 }); sun.shadow.radius = 9; sun.shadow.blurSamples = 16; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xf3eef4, 0.55); fill.position.set(6, 2.5, 5); scene.add(fill); // from the camera's side
  const rim = new THREE.DirectionalLight(0xffffff, 0.7); rim.position.set(-6, 3, 1.5); scene.add(rim); // separates the roofline from the paper
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.12, color: 0x240b21 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), groundMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  function setDark(dark) { groundMat.color.set(dark ? 0x000000 : 0x240b21); groundMat.opacity = dark ? 0.34 : 0.12; hemi.groundColor.set(dark ? 0x6b5563 : 0xd8cdd0); }
  setDark(!!opts.dark);
  return { setDark, ground, sun, hemi };
}

// the environment the paint reflects: a soft dome (bright above, a warm grey horizon, a darker floor), one long overhead box, two
// tall strips at the sides and a low front strip. Kept to moderate brightness: the highlights read as satin, never as glare.
export function studioRoom(THREE) {
  const s = new THREE.Scene(), dome = new THREE.SphereGeometry(30, 64, 32), col = [], p = dome.attributes.position;
  const sky = new THREE.Color("#F5F1F1"), hor = new THREE.Color("#CFC6C8"), flo = new THREE.Color("#5A4F54"), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 30; if (y >= 0) c.copy(hor).lerp(sky, Math.pow(y, 0.6)); else c.copy(hor).lerp(flo, Math.min(1, Math.pow(-y * 4, 0.7))); col.push(c.r, c.g, c.b); }
  dome.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  s.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const box = (w, h, x, y, z, rx, ry, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.985, 0.97).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m); };
  box(14, 4.5, 0, 12, 0, Math.PI / 2, 0, 3.2);        // overhead, along the car
  box(2.2, 9, 3, 4.5, 11, 0, 0, 2.0);                  // a tall strip on the driver's side
  box(2.2, 9, -2, 4.5, -11, 0, 0, 1.5);                // and on the passenger side
  box(9, 1.6, 12, 2.4, 2, 0, -Math.PI / 2, 1.6);       // a low strip ahead of the car
  box(6, 2.5, -12, 4, 0, 0, Math.PI / 2, 1.1);         // a soft one behind
  return s;
}

export function carMaterials(THREE, paint = "#8D9094") {
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), ...o });
  const M = {
    body: new THREE.MeshPhysicalMaterial({ color: new THREE.Color(paint), vertexColors: true, roughness: 0.32, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 1.0 }),
    glass: new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#221D25"), roughness: 0.1, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.9 }),
    tyres: std("#2B2729", { roughness: 0.86 }),
    rims: std("#D2D1D2", { roughness: 0.34, metalness: 0.8, envMapIntensity: 1.1 }),
    trim: std("#2E292C", { roughness: 0.58, envMapIntensity: 0.6 }),
    heads: std("#F7F4EE", { emissive: new THREE.Color("#FFF6E8"), emissiveIntensity: 0.55, roughness: 0.18 }),
    tails: std("#8E2A30", { emissive: new THREE.Color("#B0353C"), emissiveIntensity: 0.4, roughness: 0.24 }),
  };
  M.setPaint = (hex) => M.body.color.set(hex);
  return M;
}

// the paint as the maquette shows it: the feed's colours are pale on purpose (they're drawn on paper); this keeps their hue and
// gives them enough depth to read as satin paint rather than a flat tint
export function maquettePaint(THREE, hex) {
  const c = new THREE.Color(hex), hsl = {}; c.getHSL(hsl);
  const l = hsl.l > 0.86 ? hsl.l * 0.97 : hsl.l > 0.55 ? hsl.l * 0.85 : hsl.l * 0.9, s = Math.min(1, hsl.s * 1.18);
  return "#" + new THREE.Color().setHSL(hsl.h, s, l).getHexString();
}
