// Thin display panes: preserve a sharp view of stock instead of sampling a
// low-resolution transmission buffer through several overlapping panes.
// This is a Fresnel alpha approximation; the master retains its PBR glass.
export function prepareDisplayGlass(root) {
  const replacements = new Map();
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const materials = [].concat(mesh.material);
    const mapped = materials.map(original => {
      if (original?.name !== 'cafe_glass_simplified' || !original.isMeshPhysicalMaterial) return original;
      if (!replacements.has(original)) {
        const glass = original.clone();
        glass.transmission = 0;
        glass.thickness = 0;
        glass.transparent = true;
        glass.opacity = Math.pow((glass.ior - 1) / (glass.ior + 1), 2);
        glass.depthWrite = false;
        glass.onBeforeCompile = shader => {
          shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
            float paneF0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
            float paneCos = clamp(dot(normal, geometryViewDir), 0.0, 1.0);
            float paneAlpha = paneF0 + (1.0 - paneF0) * pow(1.0 - paneCos, 5.0);
            vec3 paneReflection = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
            gl_FragColor = vec4(paneReflection / max(paneAlpha, 0.0001), paneAlpha);
          `);
        };
        glass.customProgramCacheKey = () => 'cafe-thin-display-glass-v1';
        replacements.set(original, glass);
      }
      return replacements.get(original);
    });
    mesh.material = Array.isArray(mesh.material) ? mapped : mapped[0];
  });
  return replacements;
}
