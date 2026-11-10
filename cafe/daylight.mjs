// Sky transport baked against the fixed café shell. Sun and practical lights stay live.
// This is a browser lighting layer; prepared AR files retain their recorded version.
import * as THREE from 'three';

export function createCafeCeiling() {
  const material = new THREE.MeshStandardMaterial({ color: 0xe4e1db, roughness: .88 });
  // An inward-facing surface is visible at eye level and open from above. Both
  // sides cast shadows: the overview does not turn the room into an open skylight.
  material.shadowSide = THREE.DoubleSide;
  const geometry = new THREE.PlaneGeometry(18, 12).rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'CAFE_CEILING'; mesh.position.y = 3.25;
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

export function createCafeFloorInfill(root) {
  let finish;
  root.getObjectByName('FLOOR_FRONT_OF_COUNTER')?.traverse(o => {
    for (const m of [].concat(o.material || [])) if (m.name === 'cafe_floor_honey') finish = m;
  });
  if (!finish) throw new Error('The café floor finish is missing');
  const geometry = new THREE.PlaneGeometry(7.6, 1.5).rotateX(-Math.PI / 2).translate(5.2, .163, 1.35);
  const position = geometry.attributes.position, uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / 3, -position.getZ(i) / 3);
  const mesh = new THREE.Mesh(geometry, finish);
  mesh.name = 'FLOOR_COUNTER_THRESHOLD'; mesh.receiveShadow = true;
  return mesh;
}

export async function attachCafeDaylight(root, sourceHash) {
  const base = '/assets/models/cafe/daylight/';
  const response = await fetch(base + 'manifest.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Café daylight manifest: ${response.status}`);
  const manifest = await response.json();
  if (sourceHash && manifest.source_glb_sha256 !== sourceHash) throw new Error('Café daylight belongs to a different venue version');
  const loader = new THREE.TextureLoader();
  const maps = await Promise.all(manifest.maps.map(async spec => {
    const texture = await loader.loadAsync(base + spec.file + '?v=' + spec.sha256);
    texture.colorSpace = THREE.NoColorSpace;
    // RGBM alpha stores intensity, never opacity. No premultiplication or sRGB decode.
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
    return { ...spec, texture };
  }));
  const shared = { daylight: { value: 1 }, skyGain: { value: 2.4 } };
  const bindings = [];
  const byName = Object.fromEntries(maps.map(m => [m.name, m]));
  function bind(node, names) {
    if (!node) return;
    const regions = names.map(n => byName[n]);
    node.traverse(mesh => {
      if (!mesh.isMesh) return;
      const originals = [].concat(mesh.material);
      const materials = originals.map(original => {
        const material = original.clone();
        material.onBeforeCompile = shader => {
          shader.uniforms.cafeDay = shared.daylight;
          shader.uniforms.cafeSkyGain = shared.skyGain;
          let declarations = 'varying vec3 cafePlanPosition;\nuniform float cafeDay;\nuniform float cafeSkyGain;\n';
          let replacements = '';
          regions.forEach((spec, i) => {
            const u = new THREE.Vector3(...spec.u), v = new THREE.Vector3(...spec.v);
            const normal = u.clone().cross(v).normalize();
            for (const [key, value] of Object.entries({ Map: spec.texture, Origin: new THREE.Vector3(...spec.origin), U: u.clone().divideScalar(u.lengthSq()), V: v.clone().divideScalar(v.lengthSq()), Normal: normal })) {
              shader.uniforms[`cafe${key}${i}`] = { value };
              declarations += `uniform ${key === 'Map' ? 'sampler2D' : 'vec3'} cafe${key}${i};\n`;
            }
            replacements += `
              if (dot(cafeNormal, cafeNormal${i}) > .5 && abs(dot(cafePlanPosition - cafeOrigin${i}, cafeNormal${i})) < .045) {
                vec3 delta = cafePlanPosition - cafeOrigin${i};
                vec2 uv = vec2(dot(delta, cafeU${i}), dot(delta, cafeV${i}));
                vec4 sky = texture2D(cafeMap${i}, clamp(uv, vec2(.001), vec2(.999)));
                vec3 transport = sky.rgb * sky.a * 4.0;
                // Fade the sky transport out at dusk. Practical-light bounce is
                // still the live stage approximation, not a measured night bake.
                reflectedLight.indirectDiffuse = mix(reflectedLight.indirectDiffuse, material.diffuseColor * transport * cafeSkyGain, cafeDay);
              }
            `;
          });
          shader.vertexShader = 'varying vec3 cafePlanPosition;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ncafePlanPosition = (modelMatrix * vec4(position, 1.0)).xyz;');
          shader.fragmentShader = declarations + shader.fragmentShader.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nvec3 cafeNormal = inverseTransformDirection(normal, viewMatrix);\n' + replacements);
        };
        material.customProgramCacheKey = () => 'cafe-sky-v1-' + names.join('-');
        return material;
      });
      mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
      bindings.push(mesh.name);
    });
  }
  for (const n of ['FLOOR_DINING','FLOOR_FRONT_OF_COUNTER','FLOOR_BEHIND_COUNTER','FLOOR_KITCHEN','FLOOR_OFFICE','FLOOR_COUNTER_THRESHOLD']) bind(root.getObjectByName(n), ['floor']);
  bind(root.getObjectByName('CAFE_CEILING'), ['ceiling']);
  bind(root.getObjectByName('WALL_LEFT'), ['left']);
  bind(root.getObjectByName('WALL_RIGHT'), ['right']);
  bind(root.getObjectByName('WALL_BACK_KITCHEN'), ['back']);
  bind(root.getObjectByName('KITCHEN_SPLASHBACK'), ['back']);
  bind(root.getObjectByName('COUNTER_BODY'), ['counter-front','counter-top']);
  return { bindings, setDaylight(day, cloud) {
    shared.daylight.value = THREE.MathUtils.clamp(day, 0, 1);
    shared.skyGain.value = 2.4 * (1 - .25 * THREE.MathUtils.clamp(cloud, 0, 1));
  } };
}
