import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import {
  Fn, attribute, uniform, time, vec2, vec3, float,
  sin, cos, mix, smoothstep, clamp, max, pow, dot, normalize,
  mx_noise_float, positionLocal, positionWorld, normalWorld,
  cameraPosition, texture, uv, vertexColor
} from 'three/tsl';

// ── SHARED GLOBAL ENVIRONMENT & PHENOLOGY UNIFORMS ────────────────────────────
export function createSharedUniforms() {
  return {
    uMonth: uniform(11.4),         // 0..12 (11.4 = Mid-December NZ Summer peak bloom!)
    uYear: uniform(4.0),           // 1..15 years maturity projection
    uWindStrength: uniform(0.85),  // 0..2.0
    uWindDir: uniform(new THREE.Vector2(0.82, 0.57)),
    uSunDir: uniform(new THREE.Vector3(0.45, 0.72, -0.52).normalize())
  };
}

// ── PHOTOREALISTIC TSL FOLIAGE & FLOWER MATERIAL (v2 Sloped Terrain + Waxy Specular + Rich SSS)
export function createFoliageNodeMaterial(plant, shared) {
  const leafRough = typeof plant.leafRoughness === 'number'
    ? plant.leafRoughness
    : (plant.category === 'architectural' ? 0.36 : 0.58);

  const mat = new MeshStandardNodeMaterial({
    roughness: leafRough,
    metalness: 0.0,
    side: THREE.DoubleSide
  });

  const uBloomStart = uniform(plant.bloomStart);
  const uBloomEnd = uniform(plant.bloomEnd);
  const uDeciduous = uniform(plant.deciduous);
  const uWinterTint = uniform(new THREE.Color(plant.winterColor));
  const uLeafRoughness = uniform(leafRough);
  const uGrowthCurve = uniform(new THREE.Vector4(
    plant.growth[0], plant.growth[1], plant.growth[2], plant.growth[3]
  ));

  const aTipness = attribute('aTipness', 'float');
  const aPartType = attribute('aPartType', 'float');
  // Per-instance attributes:
  // aInstVar: (rootX, rootZ, phaseSeed, hueShift)
  // aInstRoot: (rootX, terrainY - 0.025, rootZ) — anchors all scaling & wind to sloped NZ terrain!
  const aInstVar = attribute('aInstVar', 'vec4');
  const aInstRoot = attribute('aInstRoot', 'vec3');

  // Smooth multi-year scale from uYear (1..15)
  const getYearScale = Fn(() => {
    const y = shared.uYear;
    const s13 = mix(uGrowthCurve.x, uGrowthCurve.y, clamp(y.sub(1.0).div(2.0), 0.0, 1.0));
    const s35 = mix(uGrowthCurve.y, uGrowthCurve.z, clamp(y.sub(3.0).div(2.0), 0.0, 1.0));
    const s510 = mix(uGrowthCurve.z, uGrowthCurve.w, clamp(y.sub(5.0).div(5.0), 0.0, 1.0));
    const s1015 = mix(uGrowthCurve.w, float(1.0), clamp(y.sub(10.0).div(5.0), 0.0, 1.0));
    const low = mix(s13, s35, smoothstep(2.9, 3.1, y));
    const mid = mix(low, s510, smoothstep(4.9, 5.1, y));
    return mix(mid, s1015, smoothstep(9.9, 10.1, y));
  });

  // Southern Hemisphere seasonal bloom factor [0..1] (handles Dec→Jan wrap)
  const getBloomFactor = Fn(() => {
    const m = shared.uMonth;
    const wraps = uBloomStart.greaterThan(uBloomEnd);
    const inNormal = smoothstep(uBloomStart.sub(0.8), uBloomStart.add(0.4), m)
      .mul(float(1.0).sub(smoothstep(uBloomEnd.sub(0.4), uBloomEnd.add(0.8), m)));
    const inWrapA = smoothstep(uBloomStart.sub(0.8), uBloomStart.add(0.4), m);
    const inWrapB = float(1.0).sub(smoothstep(uBloomEnd.sub(0.4), uBloomEnd.add(0.8), m));
    const inWrap = clamp(inWrapA.add(inWrapB), 0.0, 1.0);
    return uBloomStart.lessThan(float(12.5)).select(wraps.select(inWrap, inNormal), float(0.0));
  });

  // Southern Hemisphere winter coolness factor (peaks in July = month 6.5)
  const getWinterFactor = Fn(() => {
    const distFromJuly = shared.uMonth.sub(6.5).abs();
    return float(1.0).sub(smoothstep(1.2, 3.6, distFromJuly));
  });

  // ── VERTEX STAGE: 3D Terrain-Anchored Growth + Bloom Scaling + 3-Layer Wind ─
  mat.positionNode = Fn(() => {
    const yearScale = getYearScale();
    const bloom = getBloomFactor();
    const winter = getWinterFactor();

    // Offset relative to this instance's 3D sloped-terrain root (zero floating plants!)
    let rel = positionLocal.sub(aInstRoot);

    // Multi-year maturity scaling anchored cleanly to terrain root
    rel = rel.mul(yearScale);

    // Seasonal deciduous winter compaction
    const winterShrink = float(1.0).sub(winter.mul(uDeciduous).mul(0.32));
    rel = rel.mul(winterShrink);

    // Flowers / plumes smoothly emerge in bloom season & recede off-season
    const isFlower = smoothstep(1.5, 1.8, aPartType);
    const flowerScale = mix(float(1.0), bloom, isFlower);
    rel = mix(vec3(rel.x.mul(0.01), rel.y.mul(0.42), rel.z.mul(0.01)), rel, flowerScale);

    // 3-layer wind anchored at ground (aTipness^2)
    const flex = aTipness.mul(aTipness).mul(shared.uWindStrength);
    const phase = aInstVar.z.mul(6.2831);
    const anchorXZ = vec2(aInstVar.x, aInstVar.y);
    const gustCoord = anchorXZ.mul(0.18).sub(shared.uWindDir.mul(time.mul(0.65)));
    const gust = mx_noise_float(gustCoord).mul(0.5).add(0.5);

    const primary = sin(time.mul(1.9).add(phase).add(anchorXZ.x.mul(0.45))).mul(0.075);
    const crossOsc = cos(time.mul(2.7).add(phase.mul(1.3)).add(anchorXZ.y.mul(0.55))).mul(0.028);
    const flutter = sin(time.mul(8.2).add(rel.x.mul(7.0)).add(rel.z.mul(7.0)).add(phase)).mul(0.014);

    const dispX = shared.uWindDir.x.mul(gust.mul(0.11).add(primary).add(flutter))
      .sub(shared.uWindDir.y.mul(crossOsc)).mul(flex);
    const dispZ = shared.uWindDir.y.mul(gust.mul(0.11).add(primary).add(flutter))
      .add(shared.uWindDir.x.mul(crossOsc)).mul(flex);

    const bendSq = dispX.mul(dispX).add(dispZ.mul(dispZ));
    const displacedRel = vec3(
      rel.x.add(dispX),
      max(float(-0.02), rel.y.sub(bendSq.mul(0.28))),
      rel.z.add(dispZ)
    );

    return aInstRoot.add(displacedRel);
  })();

  // ── FRAGMENT COLOR: Rich Organic Chlorophyll Gradient + Per-Instance Shift + Crown AO
  mat.colorNode = Fn(() => {
    const base = vertexColor().rgb;
    const winter = getWinterFactor();
    const isFoliage = smoothstep(0.5, 0.8, aPartType).mul(float(1.0).sub(smoothstep(1.5, 1.8, aPartType)));

    // Organic per-instance warmth/value variation
    const hue = aInstVar.w;
    const warmShift = vec3(
      float(1.0).add(hue.mul(0.11)),
      float(1.0).add(hue.mul(0.05)),
      float(1.0).sub(hue.mul(0.08))
    );
    let col = base.mul(warmShift);

    // Seasonal foliage transition (copper-orange Carex/Libertia, autumn Hydrangea)
    col = mix(col, uWinterTint, winter.mul(isFoliage).mul(0.55));

    // Deeper shaded crown-base Ambient Occlusion contrasting with sunlit upper tips
    const baseAO = mix(float(0.36), float(1.06), smoothstep(0.0, 0.62, aTipness));
    return col.mul(baseAO);
  })();

  // ── WAXY / GLOSSY LEAF vs MATTE PETAL & BARK ROUGHNESS ──────────────────────
  mat.roughnessNode = Fn(() => {
    const isLeaf = smoothstep(0.5, 0.85, aPartType).mul(float(1.0).sub(smoothstep(1.5, 1.85, aPartType)));
    const isFlower = smoothstep(1.5, 1.85, aPartType);
    // Young sun-kissed leaf tips slightly glossier than shaded bases
    const leafR = clamp(uLeafRoughness.sub(aTipness.mul(0.07)), 0.22, 0.85);
    const barkR = float(0.88);
    const petalR = float(0.74);
    const r0 = mix(barkR, leafR, isLeaf);
    return mix(r0, petalR, isFlower);
  })();

  // ── RICHER GOLDEN BACKLIT SUBSURFACE SCATTERING (SSS) IN EMISSIVE NODE ─────
  mat.emissiveNode = Fn(() => {
    const viewDir = normalize(cameraPosition.sub(positionWorld));
    const backLight = pow(clamp(dot(viewDir, shared.uSunDir.negate()), 0.0, 1.0), float(2.7));
    const wrapLight = clamp(dot(normalWorld, shared.uSunDir).mul(0.5).add(0.5), 0.0, 1.0);
    const isSoft = smoothstep(0.5, 0.9, aPartType);
    const isFlower = smoothstep(1.5, 1.85, aPartType);
    const sssStrength = backLight.mul(0.56).add(wrapLight.mul(0.09))
      .mul(mix(aTipness, float(1.0), isFlower.mul(0.4)))
      .mul(isSoft);
    const glowTint = vertexColor().rgb.mul(vec3(1.30, 1.18, 0.72));
    return glowTint.mul(sssStrength);
  })();

  return mat;
}

// ── DYNAMIC 6-MATERIAL NZ TERRAIN SPLATMAP NODE MATERIAL ──────────────────────
export function createTerrainNodeMaterial(splatTexA, splatTexB, surfaceTextures, terrainSize) {
  const mat = new MeshStandardNodeMaterial({
    roughness: 0.88,
    metalness: 0.02
  });

  const tileScale = float(terrainSize / 3.2);

  mat.colorNode = Fn(() => {
    const st = uv();
    const tiledUV = st.mul(tileScale);
    const paverUV = st.mul(float(terrainSize / 2.4));

    const wA = texture(splatTexA, st); // r=lawn, g=mulch, b=pavers, a=pebbles
    const wB = texture(splatTexB, st); // r=schist, g=kwila

    const cLawn = texture(surfaceTextures.lawn, tiledUV).rgb;
    const cMulch = texture(surfaceTextures.mulch, tiledUV.mul(1.25)).rgb;
    const cPavers = texture(surfaceTextures.pavers, paverUV).rgb;
    const cPebbles = texture(surfaceTextures.pebbles, tiledUV.mul(1.3)).rgb;
    const cSchist = texture(surfaceTextures.schist, paverUV.mul(0.85)).rgb;
    const cKwila = texture(surfaceTextures.kwila, paverUV.mul(0.9)).rgb;

    const total = max(wA.r.add(wA.g).add(wA.b).add(wA.a).add(wB.r).add(wB.g), float(0.001));
    const blended = cLawn.mul(wA.r)
      .add(cMulch.mul(wA.g))
      .add(cPavers.mul(wA.b))
      .add(cPebbles.mul(wA.a))
      .add(cSchist.mul(wB.r))
      .add(cKwila.mul(wB.g))
      .div(total);

    // Subtle world-space macro-noise + slope shading to enrich sloped NZ hillsides
    const macro = mx_noise_float(vec2(positionWorld.x, positionWorld.z).mul(0.14)).mul(0.09);
    const slopeBlend = clamp(float(1.0).sub(normalWorld.y), 0.0, 1.0);
    const steepEarth = vec3(0.32, 0.28, 0.22);
    const sloped = mix(blended, steepEarth, smoothstep(0.18, 0.55, slopeBlend).mul(wA.r).mul(0.35));
    return sloped.mul(float(1.0).add(macro));
  })();

  mat.roughnessNode = Fn(() => {
    const st = uv();
    const wA = texture(splatTexA, st);
    const wB = texture(splatTexB, st);
    const total = max(wA.r.add(wA.g).add(wA.b).add(wA.a).add(wB.r).add(wB.g), float(0.001));
    return wA.r.mul(0.92)
      .add(wA.g.mul(0.94))
      .add(wA.b.mul(0.78))
      .add(wA.a.mul(0.66))
      .add(wB.r.mul(0.76))
      .add(wB.g.mul(0.56))
      .div(total);
  })();

  return mat;
}
