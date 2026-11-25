import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import {
  Fn, attribute, uniform, time, vec2, vec3, float,
  sin, cos, fract, mix, smoothstep, clamp, max, pow, dot, normalize,
  mx_noise_float, positionLocal, positionWorld, normalWorld,
  cameraPosition, texture, uv, vertexColor,
} from 'three/tsl';

// ── SHARED GLOBAL ENVIRONMENT & PHENOLOGY UNIFORMS ───────────────────────────
export function createSharedUniforms() {
  return {
    uMonth: uniform(11.4),         // 0..12 (11.4 = Mid-Dec NZ Raumati Summer peak bloom!)
    uYear: uniform(4.0),           // 1..15 years maturity projection
    uWindStrength: uniform(0.85),  // 0..2.0
    uWindDir: uniform(new THREE.Vector2(0.82, 0.57)),
    uSunDir: uniform(new THREE.Vector3(0.45, 0.72, -0.52).normalize()),
  };
}

// ── V3 PHOTOREALISTIC BOTANICAL ATLAS TSL FOLIAGE MATERIAL ───────────────────
// Three.js r187 WebGPU + TSL:
// - Samples 1024×1024 2×2 WebP botanical atlas with crisp alpha-cutout (`alphaTest: 0.36`)
// - Anchors multi-year growth (Yr 1..15), seasonal colour/bloom boost & 3-layer wind at exact 3D `aInstRoot`
//   so plants drape cleanly over contoured 1 m LINZ LiDAR slopes and mounded mulch beds!
// - Supports procedural fibrous trunk bark on `aPartType = 0` (Ponga) + backlit SSS on foliage!
export function createAtlasFoliageMaterial(plant, atlasTex, shared, tintHex = '#ffffff') {
  const leafRough = typeof plant.leafRoughness === 'number'
    ? plant.leafRoughness
    : plant.category === 'architectural' ? 0.38 : 0.58;

  const mat = new MeshStandardNodeMaterial({
    roughness: leafRough,
    metalness: 0.0,
    side: THREE.DoubleSide,
    alphaTest: 0.36,
    transparent: false,
  });

  const uBloomStart = uniform(plant.bloomStart);
  const uBloomEnd = uniform(plant.bloomEnd);
  const uDeciduous = uniform(plant.deciduous || 0.0);
  const uWinterTint = uniform(new THREE.Color(plant.winterColor || plant.foliageColor));
  const uTint = uniform(new THREE.Color(tintHex));
  const uBaseRough = uniform(leafRough);
  const uGrowthCurve = uniform(new THREE.Vector4(
    plant.growth[0], plant.growth[1], plant.growth[2], plant.growth[3]
  ));

  const aTipness = attribute('aTipness', 'float');
  const aPartType = attribute('aPartType', 'float');
  // Per-instance attributes:
  // aInstRoot = vec3(rootX, rootY, rootZ)
  // aInstVar  = vec4(rootX, rootZ, phaseSeed, hueShift)
  const aInstRoot = attribute('aInstRoot', 'vec3');
  const aInstVar = attribute('aInstVar', 'vec4');

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

  const getBloomFactor = Fn(() => {
    const m = shared.uMonth;
    const wraps = uBloomStart.greaterThan(uBloomEnd);
    const inNormal = smoothstep(uBloomStart.sub(0.9), uBloomStart.add(0.4), m)
      .mul(float(1.0).sub(smoothstep(uBloomEnd.sub(0.4), uBloomEnd.add(0.9), m)));
    const inWrapA = smoothstep(uBloomStart.sub(0.9), uBloomStart.add(0.4), m);
    const inWrapB = float(1.0).sub(smoothstep(uBloomEnd.sub(0.4), uBloomEnd.add(0.9), m));
    const inWrap = clamp(inWrapA.add(inWrapB), 0.0, 1.0);
    return uBloomStart.lessThan(float(12.5)).select(wraps.select(inWrap, inNormal), float(0.0));
  });

  const getWinterFactor = Fn(() => {
    const distFromJuly = shared.uMonth.sub(6.5).abs();
    return float(1.0).sub(smoothstep(1.2, 3.6, distFromJuly));
  });

  // ── VERTEX STAGE: 3D Root-Anchored Growth + 3-Layer Wind ───────────────────
  mat.positionNode = Fn(() => {
    const yearScale = getYearScale();
    const winter = getWinterFactor();

    let rel = positionLocal.sub(aInstRoot);
    rel = rel.mul(yearScale);

    const winterShrink = float(1.0).sub(winter.mul(uDeciduous).mul(0.28));
    rel = rel.mul(winterShrink);

    const flex = aTipness.mul(aTipness).mul(shared.uWindStrength);
    const phase = aInstVar.z.mul(6.2831);
    const anchorXZ = vec2(aInstVar.x, aInstVar.y);
    const gustCoord = anchorXZ.mul(0.18).sub(shared.uWindDir.mul(time.mul(0.62)));
    const gust = mx_noise_float(gustCoord).mul(0.5).add(0.5);

    const primary = sin(time.mul(1.85).add(phase).add(anchorXZ.x.mul(0.45))).mul(0.072);
    const crossOsc = cos(time.mul(2.6).add(phase.mul(1.3)).add(anchorXZ.y.mul(0.55))).mul(0.026);
    const flutter = sin(time.mul(7.8).add(rel.x.mul(6.5)).add(rel.z.mul(6.5)).add(phase)).mul(0.015);

    const dispX = shared.uWindDir.x.mul(gust.mul(0.105).add(primary).add(flutter))
      .sub(shared.uWindDir.y.mul(crossOsc)).mul(flex);
    const dispZ = shared.uWindDir.y.mul(gust.mul(0.105).add(primary).add(flutter))
      .add(shared.uWindDir.x.mul(crossOsc)).mul(flex);

    const bendSq = dispX.mul(dispX).add(dispZ.mul(dispZ));
    const displacedRel = vec3(
      rel.x.add(dispX),
      max(float(-0.02), rel.y.sub(bendSq.mul(0.24))),
      rel.z.add(dispZ)
    );

    return aInstRoot.add(displacedRel);
  })();

  const texSample = texture(atlasTex, uv());
  const isFoliage = smoothstep(0.25, 0.75, aPartType);

  mat.opacityNode = mix(float(1.0), texSample.a, isFoliage);

  mat.colorNode = Fn(() => {
    const winter = getWinterFactor();
    const bloom = getBloomFactor();

    // Procedural fibrous bark for Ponga trunk (aPartType = 0)
    const barkNoise = mx_noise_float(vec2(uv().x.mul(18.0), uv().y.mul(36.0))).mul(0.18);
    const barkCol = vec3(0.21, 0.15, 0.11).mul(float(0.92).add(barkNoise));

    let col = mix(barkCol, texSample.rgb.mul(uTint), isFoliage);

    // Subtle organic per-instance warmth/value shift
    const hue = aInstVar.w;
    const warmShift = vec3(
      float(1.0).add(hue.mul(0.08)),
      float(1.0).add(hue.mul(0.04)),
      float(1.0).sub(hue.mul(0.06))
    );
    col = col.mul(warmShift);

    // Peak-season bloom radiance & subtle winter colour shift
    const bloomLift = float(0.90).add(bloom.mul(0.18));
    col = col.mul(mix(float(1.0), bloomLift, isFoliage));
    col = mix(col, col.mul(uWinterTint.add(vec3(0.45, 0.45, 0.45))), winter.mul(isFoliage).mul(0.32));

    // Ground-contact Base Ambient Occlusion
    const baseAO = mix(float(0.44), float(1.02), smoothstep(0.0, 0.38, aTipness));
    return col.mul(baseAO);
  })();

  mat.roughnessNode = Fn(() => {
    const leafR = clamp(uBaseRough.sub(aTipness.mul(0.06)), 0.24, 0.86);
    return mix(float(0.92), leafR, isFoliage);
  })();

  // Backlit Subsurface Scattering (SSS) glow through botanical leaves & blossoms
  mat.emissiveNode = Fn(() => {
    const viewDir = normalize(cameraPosition.sub(positionWorld));
    const backLight = pow(clamp(dot(viewDir, shared.uSunDir.negate()), 0.0, 1.0), float(2.8));
    const wrapLight = clamp(dot(normalWorld, shared.uSunDir).mul(0.5).add(0.5), 0.0, 1.0);
    const sssStrength = backLight.mul(0.45).add(wrapLight.mul(0.14)).add(float(0.12))
      .mul(aTipness.mul(0.55).add(0.45)).mul(isFoliage);
    return texSample.rgb.mul(uTint).mul(vec3(1.24, 1.12, 0.72)).mul(sssStrength);
  })();

  return mat;
}

// ── SCULPTED VOLCANIC BASALT BOULDER MATERIAL (Kōhatu) ──────────────────────
export function createBoulderNodeMaterial() {
  const mat = new MeshStandardNodeMaterial({
    roughness: 0.88,
    metalness: 0.04,
  });
  mat.colorNode = Fn(() => {
    const grain = mx_noise_float(vec2(positionWorld.x, positionWorld.z).mul(6.5)).mul(0.12);
    return vertexColor().rgb.mul(float(1.0).add(grain));
  })();
  return mat;
}

// ── UNIFIED 6-CHANNEL NZ SPLATMAP + CRISP 2D SITE PLAN + LINZ CONTOURS TSL ──
export function createTerrainNodeMaterial(splatTexA, splatTexB, surfaceTextures, planTex) {
  const mat = new MeshStandardNodeMaterial({
    roughness: 0.90,
    metalness: 0.01,
  });

  const uPlanMix = uniform(0.0);     // 1.0 in Site Plan + Brush mode -> channel 0 shows crisp 2D Site Plan!
  const uContourMix = uniform(0.0);  // 1.0 in Real NZ Land (LINZ) mode -> crisp 0.5 m NZVD2016 contour lines!

  mat.colorNode = Fn(() => {
    const st = uv();
    const worldUV = vec2(positionWorld.x, positionWorld.z).div(3.2);
    const paverUV = vec2(positionWorld.x, positionWorld.z).div(2.4);

    const wA = texture(splatTexA, st); // r=lawn/plan, g=mulch, b=pavers, a=pebbles
    const wB = texture(splatTexB, st); // r=schist, g=kwila

    const cLawn = texture(surfaceTextures.lawn, worldUV).rgb;
    const cPlan = texture(planTex, st).rgb;
    const cBase = mix(cLawn, cPlan, uPlanMix);

    const cMulch = texture(surfaceTextures.mulch, worldUV.mul(1.25)).rgb;
    const cPavers = texture(surfaceTextures.pavers, paverUV).rgb;
    const cPebbles = texture(surfaceTextures.pebbles, worldUV.mul(1.3)).rgb;
    const cSchist = texture(surfaceTextures.schist, paverUV.mul(0.85)).rgb;
    const cKwila = texture(surfaceTextures.kwila, paverUV.mul(0.9)).rgb;

    const total = max(wA.r.add(wA.g).add(wA.b).add(wA.a).add(wB.r).add(wB.g), float(0.001));
    const baseWeight = wA.r.div(total);

    let blended = cBase.mul(wA.r)
      .add(cMulch.mul(wA.g))
      .add(cPavers.mul(wA.b))
      .add(cPebbles.mul(wA.a))
      .add(cSchist.mul(wB.r))
      .add(cKwila.mul(wB.g))
      .div(total);

    // Subtle volcanic earth on steep LiDAR banks
    const steepness = clamp(float(1.0).sub(normalWorld.y), 0.0, 1.0);
    const earthCol = vec3(0.28, 0.24, 0.19);
    blended = mix(blended, earthCol, smoothstep(0.18, 0.55, steepness).mul(baseWeight).mul(float(1.0).sub(uPlanMix)).mul(0.38));

    // World-space macro-noise on natural terrain/hardscapes only (keep 2D Site Plan razor-sharp!)
    const macroAmt = float(1.0).sub(uPlanMix.mul(baseWeight));
    const macro = mx_noise_float(vec2(positionWorld.x, positionWorld.z).mul(0.14)).mul(0.08).mul(macroAmt);
    blended = blended.mul(float(1.0).add(macro));

    // Crisp 0.5 m NZVD2016 topographic contour lines when LINZ 1 m LiDAR terrain is active
    const elevWave = fract(positionWorld.y.mul(2.0).add(0.5)).sub(0.5).abs();
    const contourLine = float(1.0).sub(smoothstep(0.0, 0.032, elevWave));
    blended = mix(blended, vec3(0.95, 0.91, 0.86), contourLine.mul(0.36).mul(uContourMix));

    return blended;
  })();

  mat.roughnessNode = Fn(() => {
    const st = uv();
    const wA = texture(splatTexA, st);
    const wB = texture(splatTexB, st);
    const total = max(wA.r.add(wA.g).add(wA.b).add(wA.a).add(wB.r).add(wB.g), float(0.001));
    const baseRough = mix(float(0.94), float(0.88), uPlanMix);
    return wA.r.mul(baseRough)
      .add(wA.g.mul(0.95))
      .add(wA.b.mul(0.78))
      .add(wA.a.mul(0.68))
      .add(wB.r.mul(0.76))
      .add(wB.g.mul(0.56))
      .div(total);
  })();

  return { mat, uPlanMix, uContourMix };
}
