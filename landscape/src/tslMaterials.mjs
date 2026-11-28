import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import {
  Fn, attribute, uniform, time, vec2, vec3, float,
  sin, cos, mix, smoothstep, clamp, max, pow, dot, normalize, fract,
  mx_noise_float, positionLocal, positionWorld, normalWorld,
  cameraPosition, texture, uv
} from 'three/tsl';

// ── SHARED GLOBAL ENVIRONMENT, PHENOLOGY, SITE-PLAN & PHOTO-MATCH UNIFORMS ────
export function createSharedUniforms() {
  return {
    uMonth: uniform(11.4),         // 0..12 (11.4 = Mid-December NZ Summer peak bloom)
    uYear: uniform(4.0),           // 1..15 years maturity projection
    uWindStrength: uniform(0.85),  // 0..2.0
    uWindDir: uniform(new THREE.Vector2(0.82, 0.57)),
    uSunDir: uniform(new THREE.Vector3(0.45, 0.72, -0.52).normalize()),
    uPhotoMode: uniform(0.0),      // 0.0 = 3D/Plan opaque terrain, 1.0 = Site Photo-Match transparent ground
    uPlanMix: uniform(0.0),        // 0.0 = 3D turf, 1.0 = crisp 2D architectural site plan on channel 0
    uContourMix: uniform(0.0),     // 0.0 = off, 1.0 = subtle 0.5m LINZ LiDAR contour lines
  };
}

// ── PHOTOREALISTIC TSL BOTANICAL CARD SHADER (Edge-Dilated Atlas + Grazing Fade + Wind + SSS)
export function createBotanicalCardMaterial(plant, atlasTex, shared, speciesTintHex = '#ffffff') {
  const leafRough = typeof plant.leafRoughness === 'number'
    ? plant.leafRoughness
    : (plant.category === 'architectural' ? 0.38 : 0.58);

  const mat = new MeshStandardNodeMaterial({
    roughness: leafRough,
    metalness: 0.0,
    side: THREE.DoubleSide,
    alphaTest: 0.50,
    transparent: false,
  });

  const uBloomStart = uniform(plant.bloomStart ?? 13);
  const uBloomEnd = uniform(plant.bloomEnd ?? 13);
  const uDeciduous = uniform(plant.deciduous ?? 0.0);
  const uWinterTint = uniform(new THREE.Color(plant.winterColor || '#4a5a3a'));
  const uSpeciesTint = uniform(new THREE.Color(speciesTintHex));
  const uLeafRoughness = uniform(leafRough);
  const uGrowthCurve = uniform(new THREE.Vector4(
    plant.growth[0], plant.growth[1], plant.growth[2], plant.growth[3]
  ));

  const aTipness = attribute('aTipness', 'float');
  const aPartType = attribute('aPartType', 'float'); // 0 = ponga fibrous trunk, 1 = photographic card
  const aInstVar = attribute('aInstVar', 'vec4');
  const aInstRoot = attribute('aInstRoot', 'vec3');

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
  const isCard = smoothstep(0.25, 0.75, aPartType);
  // Grazing-angle fade: hides edge-on card planes so flowers/grasses never slice like cardboard up close!
  const cardViewDir = normalize(cameraPosition.sub(positionWorld));
  const cardEdgeFade = smoothstep(float(0.14), float(0.38), dot(normalWorld, cardViewDir).abs());
  mat.opacityNode = mix(float(1.0), texSample.a.mul(cardEdgeFade), isCard);

  mat.colorNode = Fn(() => {
    const winter = getWinterFactor();
    const bloom = getBloomFactor();

    const trunkGrain = mx_noise_float(vec2(uv().x.mul(18.0), uv().y.mul(36.0))).mul(0.18);
    const trunkCol = vec3(0.21, 0.15, 0.11).mul(float(0.92).add(trunkGrain));

    let col = mix(trunkCol, texSample.rgb.mul(uSpeciesTint), isCard);

    const hue = aInstVar.w;
    const warmShift = vec3(
      float(1.0).add(hue.mul(0.08)),
      float(1.0).add(hue.mul(0.04)),
      float(1.0).sub(hue.mul(0.06))
    );
    col = col.mul(warmShift);

    const bloomBoost = float(0.92).add(bloom.mul(0.14));
    col = col.mul(mix(float(1.0), bloomBoost, isCard));
    col = mix(col, col.mul(uWinterTint.add(vec3(0.45, 0.45, 0.45))), winter.mul(isCard).mul(0.32));

    const baseAO = mix(float(0.46), float(1.02), smoothstep(0.0, 0.36, aTipness));
    return col.mul(baseAO);
  })();

  mat.roughnessNode = Fn(() => {
    const leafR = clamp(uLeafRoughness.sub(aTipness.mul(0.06)), 0.24, 0.86);
    const barkR = float(0.92);
    return mix(barkR, leafR, isCard);
  })();

  mat.emissiveNode = Fn(() => {
    const viewDir = normalize(cameraPosition.sub(positionWorld));
    const backLight = pow(clamp(dot(viewDir, shared.uSunDir.negate()), 0.0, 1.0), float(2.8));
    const wrapLight = clamp(dot(normalWorld, shared.uSunDir).mul(0.5).add(0.5), 0.0, 1.0);
    const sssStrength = backLight.mul(0.45).add(wrapLight.mul(0.16)).add(float(0.16)).mul(aTipness.mul(0.55).add(0.45));
    const glowTint = texSample.rgb.mul(uSpeciesTint).mul(vec3(1.26, 1.12, 0.68));
    return glowTint.mul(sssStrength);
  })();

  return mat;
}

// ── DYNAMIC 11-MATERIAL NZ TERRAIN SPLATMAP + SITE PLAN + LIDAR CONTOURS + PHOTO MATCH ──
export function createTerrainNodeMaterial(
  splatTexA,
  splatTexB,
  splatTexC,
  surfaceTextures,
  terrainSize,
  shared,
  planTex = null
) {
  const mat = new MeshStandardNodeMaterial({
    roughness: 0.90,
    metalness: 0.01,
    alphaTest: 0.08,
    transparent: false,
  });

  const tileScale = float(terrainSize / 3.2);
  const chipScale = float(terrainSize / 2.6);
  const paverScale = float(terrainSize / 2.4);

  mat.colorNode = Fn(() => {
    const st = uv();
    const tiledUV = st.mul(tileScale);
    const chipUV = st.mul(chipScale);
    const paverUV = st.mul(paverScale);

    const wA = texture(splatTexA, st); // r=0 lawn, g=1 mulch, b=2 pine_bark, a=3 woodchip
    const wB = texture(splatTexB, st); // r=4 greywacke, g=5 limestone, b=6 pebbles, a=7 black_stones
    const wC = texture(splatTexC, st); // r=8 pavers, g=9 schist, b=10 kwila

    // Rich multi-octave organic NZ ryegrass/clover patch variation on channel 0
    const worldXZ = vec2(positionWorld.x, positionWorld.z);
    const grassMacro1 = mx_noise_float(worldXZ.mul(0.11));
    const grassMacro2 = mx_noise_float(worldXZ.mul(0.31).add(vec2(17.3, 9.1)));
    const cloverTint = vec3(1.06, 1.08, 0.94);
    const lushTint = vec3(0.90, 0.98, 0.86);
    const grassVar = mix(lushTint, cloverTint, clamp(grassMacro1.mul(0.6).add(grassMacro2.mul(0.4)).mul(0.5).add(0.5), 0.0, 1.0));
    const c0Turf = texture(surfaceTextures.lawn, tiledUV).rgb.mul(grassVar);

    // Optional crisp 2D Site Plan underlay mixed onto channel 0 (unpainted base)
    const c0 = planTex
      ? mix(c0Turf, texture(planTex, st).rgb, shared.uPlanMix)
      : c0Turf;

    const c1 = texture(surfaceTextures.mulch, tiledUV.mul(1.25)).rgb;
    const c2 = texture(surfaceTextures.pine_bark, tiledUV.mul(1.15)).rgb;
    const c3 = texture(surfaceTextures.woodchip, tiledUV.mul(1.25)).rgb;

    const c4 = texture(surfaceTextures.greywacke, chipUV.mul(1.35)).rgb;
    const c5 = texture(surfaceTextures.limestone, chipUV.mul(1.30)).rgb;
    const c6 = texture(surfaceTextures.pebbles, tiledUV.mul(1.30)).rgb;
    const c7 = texture(surfaceTextures.black_stones, tiledUV.mul(1.30)).rgb;

    const c8 = texture(surfaceTextures.pavers, paverUV).rgb;
    const c9 = texture(surfaceTextures.schist, paverUV.mul(0.85)).rgb;
    const c10 = texture(surfaceTextures.kwila, paverUV.mul(0.90)).rgb;

    const nonZeroW = wA.g.add(wA.b).add(wA.a)
      .add(wB.r).add(wB.g).add(wB.b).add(wB.a)
      .add(wC.r).add(wC.g).add(wC.b);

    // In Photo-Match mode, exclude channel 0 (lawn) from colour blend so edges never bleed green onto the photo!
    const wLawnEff = wA.r.mul(float(1.0).sub(shared.uPhotoMode));
    const total = max(wLawnEff.add(nonZeroW), float(0.001));

    const blended = c0.mul(wLawnEff)
      .add(c1.mul(wA.g))
      .add(c2.mul(wA.b))
      .add(c3.mul(wA.a))
      .add(c4.mul(wB.r))
      .add(c5.mul(wB.g))
      .add(c6.mul(wB.b))
      .add(c7.mul(wB.a))
      .add(c8.mul(wC.r))
      .add(c9.mul(wC.g))
      .add(c10.mul(wC.b))
      .div(total);

    const macro = mx_noise_float(worldXZ.mul(0.14)).mul(0.07).mul(float(1.0).sub(shared.uPlanMix.mul(0.85)));
    const slopeBlend = clamp(float(1.0).sub(normalWorld.y), 0.0, 1.0);
    const steepEarth = vec3(0.28, 0.25, 0.19);
    const sloped = mix(
      blended,
      steepEarth,
      smoothstep(0.18, 0.55, slopeBlend).mul(wLawnEff).mul(float(1.0).sub(shared.uPlanMix)).mul(0.32)
    );

    // Subtle 0.5 m LINZ LiDAR contour lines when enabled
    const contourBand = fract(positionWorld.y.mul(2.0).add(50.0));
    const contourEdge = float(1.0).sub(smoothstep(float(0.0), float(0.032), contourBand))
      .add(smoothstep(float(0.968), float(1.0), contourBand));
    const withContours = mix(
      sloped.mul(float(1.0).add(macro)),
      vec3(0.14, 0.06, 0.13),
      clamp(contourEdge, 0.0, 1.0).mul(shared.uContourMix).mul(0.28)
    );
    return withContours;
  })();

  mat.roughnessNode = Fn(() => {
    const st = uv();
    const wA = texture(splatTexA, st);
    const wB = texture(splatTexB, st);
    const wC = texture(splatTexC, st);

    const nonZeroW = wA.g.add(wA.b).add(wA.a)
      .add(wB.r).add(wB.g).add(wB.b).add(wB.a)
      .add(wC.r).add(wC.g).add(wC.b);
    const wLawnEff = wA.r.mul(float(1.0).sub(shared.uPhotoMode));
    const total = max(wLawnEff.add(nonZeroW), float(0.001));

    return wLawnEff.mul(0.94)
      .add(wA.g.mul(0.95))
      .add(wA.b.mul(0.92))
      .add(wA.a.mul(0.93))
      .add(wB.r.mul(0.84))
      .add(wB.g.mul(0.82))
      .add(wB.b.mul(0.68))
      .add(wB.a.mul(0.30)) // Polished black river stones have natural sheen
      .add(wC.r.mul(0.78))
      .add(wC.g.mul(0.76))
      .add(wC.b.mul(0.56))
      .div(total);
  })();

  // Photo-Match ground transparency: discard unpainted base pixels when shared.uPhotoMode > 0.5
  mat.opacityNode = Fn(() => {
    const st = uv();
    const wA = texture(splatTexA, st);
    const wB = texture(splatTexB, st);
    const wC = texture(splatTexC, st);
    const nonBase = wA.g.add(wA.b).add(wA.a).add(wB.r).add(wB.g).add(wB.b).add(wB.a).add(wC.r).add(wC.g).add(wC.b);
    const paintedAlpha = smoothstep(float(0.06), float(0.22), nonBase);
    return mix(float(1.0), paintedAlpha, shared.uPhotoMode);
  })();

  return mat;
}
