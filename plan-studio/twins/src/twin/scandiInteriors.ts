import * as THREE from 'three/webgpu';
import { createSoftContactShadowTexture } from './pbrTextures';

let cachedContactShadowMat: THREE.MeshBasicMaterial | null = null;
export function addContactShadow(parent: THREE.Group, w: number, d: number, x = 0, z = 0) {
  if (!cachedContactShadowMat) {
    cachedContactShadowMat = new THREE.MeshBasicMaterial({
      map: createSoftContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    });
  }
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), cachedContactShadowMat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(x, 0.008, z);
  parent.add(plane);
}

export interface InteriorMaterials {
  oakMat: THREE.MeshStandardMaterial;
  linenMat: THREE.MeshPhysicalMaterial;
  boucleMat: THREE.MeshPhysicalMaterial;
  terracottaMat: THREE.MeshPhysicalMaterial;
  stoneMat: THREE.MeshStandardMaterial;
  travertineMat: THREE.MeshStandardMaterial;
  zelligeMat: THREE.MeshPhysicalMaterial;
  joineryMat: THREE.MeshStandardMaterial;
  tapwareMat: THREE.MeshStandardMaterial;
  plasterMat: THREE.MeshStandardMaterial;
}

/**
 * Generates a softly beveled, pillowy rounded-box geometry using ExtrudeGeometry
 * so upholstery, cushions, tabletops, and cabinetry never look like sharp toy cubes.
 */
export function createRoundedBoxGeo(
  width: number,
  height: number,
  depth: number,
  bevelRadius = 0.045,
  bevelSegments = 4
): THREE.BufferGeometry {
  const r = Math.min(bevelRadius, width * 0.24, height * 0.24, depth * 0.24);
  const w = Math.max(0.01, width - r * 2);
  const h = Math.max(0.01, height - r * 2);
  const d = Math.max(0.01, depth - r * 2);

  const shape = new THREE.Shape();
  const hw = w / 2;
  const hh = h / 2;
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r,
    bevelSegments,
    curveSegments: 8,
  });
  geo.center();
  return geo;
}

/**
 * Generates a smooth turned-profile vessel / ceramic / bowl geometry via LatheGeometry.
 */
export function createLatheVesselGeo(profile: [number, number][], segments = 24): THREE.BufferGeometry {
  const pts = profile.map(([rx, ry]) => new THREE.Vector2(rx, ry));
  return new THREE.LatheGeometry(pts, segments);
}

/**
 * Builds sculpted, photorealistic Scandinavian-NZ architectural furniture & fittings:
 * Simon James / Nodi bouclé sofa with beveled cushions & textile sheen, fluted veincut
 * travertine drum coffee table with turned ceramics & art books, arched bronze floor lamp.
 */
export function buildSculptedBoucleSofa(mats: InteriorMaterials, seats = 3, rugDepth = 3.2, rugBack = 1.02): THREE.Group {
  const g = new THREE.Group();
  const sw = seats * 1.07;
  const lx0 = -(sw / 2 + 0.515);
  addContactShadow(g, sw + 0.6, 1.5, 0, 0);
  addContactShadow(g, 1.65, 1.65, 0, 1.35);

  // Hand-loomed Nodi NZ wool rug with subtle braided end trim
  const rug = new THREE.Mesh(
    createRoundedBoxGeo(sw + 1.1, 0.028, rugDepth, 0.01, 2),
    new THREE.MeshPhysicalMaterial({
      color: 0xd9d0c3,
      roughness: 0.96,
      sheen: 0.45,
      sheenColor: new THREE.Color(0xf4ede2),
      sheenRoughness: 0.85,
    })
  );
  rug.position.set(0, 0.015, rugDepth / 2 - rugBack);
  rug.receiveShadow = true;
  g.add(rug);

  // Recessed oiled European oak plinth base + splayed dowel legs
  const plinth = new THREE.Mesh(createRoundedBoxGeo(sw + 0.05, 0.13, 1.02, 0.018, 3), mats.oakMat);
  plinth.position.set(0, 0.12, 0);
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  g.add(plinth);

  for (const [lx, lz] of [
    [-(sw / 2 - 0.125), -0.4],
    [sw / 2 - 0.125, -0.4],
    [-(sw / 2 - 0.125), 0.4],
    [sw / 2 - 0.125, 0.4],
  ]) {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.018, 0.08, 10), mats.oakMat);
    foot.position.set(lx, 0.04, lz);
    g.add(foot);
  }

  // Three deeply beveled bouclé seat cushions + plush angled backrest cushions
  const seatGeo = createRoundedBoxGeo(1.04, 0.25, 0.95, 0.06, 5);
  const backGeo = createRoundedBoxGeo(1.02, 0.46, 0.23, 0.055, 5);
  for (let k = 0; k < seats; k++) {
    const i = k - (seats - 1) / 2;
    const seat = new THREE.Mesh(seatGeo, mats.boucleMat);
    seat.position.set(i * 1.07, 0.305, 0.03);
    seat.castShadow = true;
    seat.receiveShadow = true;
    g.add(seat);

    const back = new THREE.Mesh(backGeo, mats.boucleMat);
    back.position.set(i * 1.07, 0.6, -0.34);
    back.rotation.x = -0.15;
    back.castShadow = true;
    back.receiveShadow = true;
    g.add(back);
  }

  // Sculpted low rounded armrests
  const armGeo = createRoundedBoxGeo(0.2, 0.48, 1.04, 0.055, 5);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(armGeo, mats.boucleMat);
    arm.position.set(side * (sw / 2 + 0.055), 0.38, 0);
    arm.castShadow = true;
    arm.receiveShadow = true;
    g.add(arm);
  }

  // Soft beveled terracotta & oatmeal accent throw pillows
  const pillowGeo = createRoundedBoxGeo(0.44, 0.38, 0.16, 0.065, 5);
  const pillow1 = new THREE.Mesh(pillowGeo, mats.terracottaMat);
  pillow1.position.set(-(sw / 2 - 0.425), 0.58, -0.13);
  pillow1.rotation.set(-0.22, 0.34, 0.1);
  pillow1.castShadow = true;
  g.add(pillow1);

  const pillow2 = new THREE.Mesh(pillowGeo, mats.linenMat);
  pillow2.position.set(sw / 2 - 0.445, 0.58, -0.13);
  pillow2.rotation.set(-0.22, -0.32, -0.08);
  pillow2.castShadow = true;
  g.add(pillow2);

  // Fluted veincut travertine drum coffee table (24 sculptural stone flutes + bullnose top)
  const tableGroup = new THREE.Group();
  tableGroup.position.set(0, 0, 1.35);

  const drumCore = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.32, 24), mats.travertineMat);
  drumCore.position.y = 0.17;
  drumCore.castShadow = true;
  drumCore.receiveShadow = true;
  tableGroup.add(drumCore);

  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.034, 0.31, 8), mats.travertineMat);
    rib.position.set(Math.cos(a) * 0.435, 0.17, Math.sin(a) * 0.435);
    tableGroup.add(rib);
  }

  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.68, 0.048, 32), mats.travertineMat);
  tableTop.position.y = 0.355;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  tableGroup.add(tableTop);

  // Turned stoneware ceramic vessel (LatheGeometry) + stacked architectural monographs
  const vaseGeo = createLatheVesselGeo([
    [0.0, 0.0],
    [0.075, 0.0],
    [0.115, 0.07],
    [0.105, 0.15],
    [0.052, 0.22],
    [0.062, 0.26],
    [0.048, 0.26],
  ]);
  const vase = new THREE.Mesh(vaseGeo, mats.terracottaMat);
  vase.position.set(0.2, 0.38, -0.1);
  vase.castShadow = true;
  tableGroup.add(vase);

  const book1 = new THREE.Mesh(
    createRoundedBoxGeo(0.32, 0.032, 0.24, 0.004, 2),
    new THREE.MeshStandardMaterial({ color: 0xf4f0ea, roughness: 0.78 })
  );
  book1.position.set(-0.2, 0.396, 0.14);
  book1.rotation.y = 0.18;
  book1.castShadow = true;
  tableGroup.add(book1);

  const book2 = new THREE.Mesh(
    createRoundedBoxGeo(0.26, 0.026, 0.2, 0.004, 2),
    new THREE.MeshStandardMaterial({ color: 0x341527, roughness: 0.72 })
  );
  book2.position.set(-0.19, 0.425, 0.13);
  book2.rotation.y = 0.32;
  tableGroup.add(book2);
  g.add(tableGroup);

  // Arched matte-black & brushed-bronze architectural floor lamp with glowing opal bulb
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.065, 22), mats.travertineMat);
  lampBase.position.set(lx0, 0.045, -0.15);
  lampBase.castShadow = true;
  g.add(lampBase);

  const archCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(lx0, 0.07, -0.15),
    new THREE.Vector3(lx0 - 0.02, 1.5, -0.1),
    new THREE.Vector3(lx0 + 0.36, 1.98, 0.15),
    new THREE.Vector3(lx0 + 0.98, 1.86, 0.36),
  ]);
  const archStem = new THREE.Mesh(new THREE.TubeGeometry(archCurve, 26, 0.015, 10, false), mats.joineryMat);
  archStem.castShadow = true;
  g.add(archStem);

  const lampShade = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
    mats.tapwareMat
  );
  lampShade.position.set(lx0 + 0.98, 1.79, 0.36);
  g.add(lampShade);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 14, 10),
    new THREE.MeshStandardMaterial({ color: 0xfff3dc, emissive: 0xffd28c, emissiveIntensity: 2.2 })
  );
  bulb.position.set(lx0 + 0.98, 1.74, 0.36);
  g.add(bulb);

  return g;
}

/**
 * Builds the fluted-oak & veincut-travertine kitchen island with:
 * - ABI Interiors curved gooseneck mixer tap with collar & lever
 * - Twin translucent amber-glass Ashley & Co. wash/cream pump bottles
 * - La Marzocco Linea Micra espresso machine + ceramic cups
 * - Waiheke lemon bowl + draped linen tea towel
 * - Tile Space NZ handmade glazed ivory Zellige splashback accent wall
 */
export function buildFlutedKitchenIsland(mats: InteriorMaterials, featureWall = false, stools = 3): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, 3.9, 1.55, 0, 0.04);

  // Recessed matte-black architectural toe-kick
  const toeKick = new THREE.Mesh(new THREE.BoxGeometry(3.22, 0.1, 0.86), mats.joineryMat);
  toeKick.position.set(0, 0.05, -0.02);
  g.add(toeKick);

  // Core cabinetry carcass
  const core = new THREE.Mesh(new THREE.BoxGeometry(3.32, 0.78, 0.96), mats.oakMat);
  core.position.set(0, 0.49, 0);
  core.castShadow = true;
  core.receiveShadow = true;
  g.add(core);

  // 28 individual vertical fluted European oak slats
  for (let i = 0; i < 28; i++) {
    const slat = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.77, 8), mats.oakMat);
    slat.position.set(-1.58 + i * 0.117, 0.49, 0.486);
    g.add(slat);
  }

  // Mitered veincut travertine waterfall benchtop + end returns
  const top = new THREE.Mesh(createRoundedBoxGeo(3.52, 0.06, 1.16, 0.008, 3), mats.travertineMat);
  top.position.set(0, 0.91, 0.04);
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);

  for (const side of [-1, 1]) {
    const waterfall = new THREE.Mesh(createRoundedBoxGeo(0.055, 0.91, 1.15, 0.006, 2), mats.travertineMat);
    waterfall.position.set(side * 1.73, 0.455, 0.04);
    waterfall.castShadow = true;
    waterfall.receiveShadow = true;
    g.add(waterfall);
  }

  // Rear handmade glazed ivory Zellige tile splashback feature wall (Tile Space NZ)
  const splashback = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.92, 0.03), mats.zelligeMat);
  splashback.position.set(0, 1.38, -1.08);
  splashback.receiveShadow = true;
  if (featureWall) g.add(splashback);

  // Recessed matte-charcoal undermount sink basin
  const sink = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.024, 0.44), mats.joineryMat);
  sink.position.set(-0.42, 0.935, -0.02);
  g.add(sink);

  // ABI Interiors curved J-spout gooseneck mixer tap with base collar & side lever
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.05, 16), mats.tapwareMat);
  collar.position.set(-0.42, 0.96, -0.29);
  g.add(collar);

  const tapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.42, 0.96, -0.29),
    new THREE.Vector3(-0.42, 1.28, -0.29),
    new THREE.Vector3(-0.42, 1.37, -0.16),
    new THREE.Vector3(-0.42, 1.26, -0.06),
  ]);
  const tapSpout = new THREE.Mesh(new THREE.TubeGeometry(tapCurve, 22, 0.014, 10, false), mats.tapwareMat);
  tapSpout.castShadow = true;
  g.add(tapSpout);

  const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.085, 8), mats.tapwareMat);
  lever.rotation.z = Math.PI / 2;
  lever.position.set(-0.36, 1.01, -0.29);
  g.add(lever);

  // Twin Ashley & Co. NZ translucent amber-glass hand wash & lotion bottles on stone tray
  const soapTray = new THREE.Mesh(createRoundedBoxGeo(0.24, 0.016, 0.13, 0.005, 2), mats.travertineMat);
  soapTray.position.set(-0.02, 0.946, -0.26);
  g.add(soapTray);

  const amberGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x6b320d,
    roughness: 0.08,
    metalness: 0.05,
    transmission: 0.62,
    transparent: true,
    opacity: 0.88,
    ior: 1.52,
    clearcoat: 1.0,
  });
  const labelMat = new THREE.MeshStandardMaterial({ color: 0xf7f3eb, roughness: 0.82 });

  for (const bx of [-0.07, 0.03]) {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.035, 0.145, 16), amberGlassMat);
    bottle.position.set(bx, 1.028, -0.26);
    g.add(bottle);

    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.0355, 0.0355, 0.072, 16), labelMat);
    label.position.set(bx, 1.02, -0.26);
    g.add(label);

    const pumpNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.035, 10), mats.joineryMat);
    pumpNeck.position.set(bx, 1.115, -0.26);
    g.add(pumpNeck);

    const pumpNozzle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.01, 0.042), mats.joineryMat);
    pumpNozzle.position.set(bx, 1.132, -0.245);
    g.add(pumpNozzle);
  }

  // La Marzocco Linea Micra architectural espresso machine + ceramic cups
  const espresso = new THREE.Group();
  espresso.position.set(1.08, 0.94, -0.18);
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xd8dce0,
    roughness: 0.14,
    metalness: 0.96,
    envMapIntensity: 1.7,
  });
  const creamChassis = new THREE.Mesh(
    createRoundedBoxGeo(0.32, 0.34, 0.36, 0.016, 3),
    new THREE.MeshStandardMaterial({ color: 0xefeae0, roughness: 0.28, metalness: 0.18 })
  );
  creamChassis.position.set(0, 0.17, 0);
  creamChassis.castShadow = true;
  espresso.add(creamChassis);

  const frontFace = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.02), chromeMat);
  frontFace.position.set(0, 0.25, 0.18);
  espresso.add(frontFace);

  const dripTray = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.032, 0.14), chromeMat);
  dripTray.position.set(0, 0.018, 0.22);
  espresso.add(dripTray);

  const groupHead = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.034, 0.05, 14), chromeMat);
  groupHead.position.set(-0.02, 0.17, 0.21);
  espresso.add(groupHead);

  const pfHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.12, 10), mats.oakMat);
  pfHandle.rotation.x = Math.PI / 2;
  pfHandle.position.set(-0.02, 0.14, 0.29);
  espresso.add(pfHandle);

  const cupGeo = createLatheVesselGeo([
    [0.0, 0.0],
    [0.024, 0.0],
    [0.032, 0.045],
    [0.034, 0.068],
    [0.029, 0.068],
  ], 16);
  const cupMat = new THREE.MeshStandardMaterial({ color: 0xf4eee5, roughness: 0.38 });
  for (const cx of [-0.07, 0.06]) {
    const cup = new THREE.Mesh(cupGeo, cupMat);
    cup.position.set(cx, 0.34, -0.02);
    espresso.add(cup);
  }
  g.add(espresso);

  // Waiheke lemon bowl (turned travertine footed bowl + 5 bright lemons)
  const bowlGeo = createLatheVesselGeo([
    [0.0, 0.0],
    [0.075, 0.0],
    [0.062, 0.035],
    [0.145, 0.075],
    [0.165, 0.115],
    [0.15, 0.115],
    [0.12, 0.055],
    [0.0, 0.045],
  ]);
  const bowl = new THREE.Mesh(bowlGeo, mats.travertineMat);
  bowl.position.set(0.45, 0.94, 0.14);
  bowl.castShadow = true;
  g.add(bowl);

  const lemonMat = new THREE.MeshStandardMaterial({ color: 0xe6c33c, roughness: 0.46 });
  const lemonOffsets: [number, number, number][] = [
    [-0.04, 0.075, -0.02],
    [0.05, 0.075, -0.01],
    [0.0, 0.08, 0.05],
    [-0.03, 0.105, 0.02],
    [0.04, 0.102, 0.03],
  ];
  for (const [lx, ly, lz] of lemonOffsets) {
    const lemon = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 10), lemonMat);
    lemon.scale.set(1.25, 0.92, 0.95);
    lemon.position.set(0.45 + lx, 0.94 + ly, 0.14 + lz);
    g.add(lemon);
  }

  // Soft draped linen tea towel over the island end
  const towel = new THREE.Mesh(createRoundedBoxGeo(0.28, 0.014, 0.36, 0.005, 2), mats.linenMat);
  towel.position.set(-1.32, 0.945, 0.38);
  towel.rotation.y = 0.08;
  g.add(towel);

  const xs = stools === 3 ? [-0.96, 0, 0.96] : stools === 2 ? [-0.55, 0.55] : stools === 1 ? [0] : [];
  for (const sx of xs) {
    const stool = buildBarStool(mats);
    stool.position.set(sx, 0, 0.8);
    g.add(stool);
  }

  return g;
}

export function buildScandiDiningSuite(mats: InteriorMaterials, perSide = 3, ceiling = 3.0): THREE.Group {
  const g = new THREE.Group();
  const tl = perSide >= 3 ? 2.6 : 1.9;
  addContactShadow(g, tl + 0.6, 2.0, 0, 0);

  // Bullnose beveled European oak dining tabletop
  const top = new THREE.Mesh(createRoundedBoxGeo(tl, 0.06, 1.08, 0.014, 3), mats.oakMat);
  top.position.y = 0.75;
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);

  // Tapered splayed Scandinavian timber legs
  for (const [lx, lz] of [
    [-(tl / 2 - 0.22), -0.38],
    [tl / 2 - 0.22, -0.38],
    [-(tl / 2 - 0.22), 0.38],
    [tl / 2 - 0.22, 0.38],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.022, 0.74, 12), mats.oakMat);
    leg.position.set(lx, 0.37, lz);
    leg.castShadow = true;
    g.add(leg);
  }

  // Tabletop centerpiece: stoneware pitcher + sculptural bowl + brass taper candle holders
  const pitcherGeo = createLatheVesselGeo([
    [0.0, 0.0],
    [0.055, 0.0],
    [0.082, 0.08],
    [0.068, 0.17],
    [0.048, 0.24],
    [0.054, 0.26],
  ]);
  const pitcher = new THREE.Mesh(pitcherGeo, mats.plasterMat);
  pitcher.position.set(-0.22, 0.78, 0.02);
  pitcher.castShadow = true;
  g.add(pitcher);

  for (const [cx, cz, ch] of [
    [0.24, -0.06, 0.22],
    [0.36, 0.08, 0.16],
  ]) {
    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 0.04, 12), mats.tapwareMat);
    holder.position.set(cx, 0.8, cz);
    g.add(holder);
    const candle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.012, ch, 10),
      new THREE.MeshStandardMaterial({ color: 0xf6eedf, roughness: 0.62 })
    );
    candle.position.set(cx, 0.82 + ch * 0.5, cz);
    g.add(candle);
  }

  // 6 Sculpted Wishbone / Curved-Back Scandi Dining Chairs
  const chairSeatGeo = createRoundedBoxGeo(0.46, 0.05, 0.44, 0.018, 3);
  for (const side of [-1, 1]) {
    for (const cx of perSide >= 3 ? [-0.78, 0, 0.78] : [-0.45, 0.45]) {
      const chair = new THREE.Group();
      chair.position.set(cx, 0, side * 0.65);
      const seat = new THREE.Mesh(chairSeatGeo, mats.linenMat);
      seat.position.y = 0.45;
      seat.castShadow = true;
      chair.add(seat);
      const back = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.021, 10, 18, Math.PI), mats.oakMat);
      back.rotation.x = Math.PI / 2;
      back.rotation.z = side > 0 ? 0 : Math.PI;
      back.position.set(0, 0.76, side * 0.02);
      chair.add(back);
      for (const [lx, lz] of [
        [-0.18, -0.17],
        [0.18, -0.17],
        [-0.18, 0.17],
        [0.18, 0.17],
      ]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, 0.45, 8), mats.oakMat);
        leg.position.set(lx, 0.225, lz);
        chair.add(leg);
      }
      g.add(chair);
    }
  }

  // Sculptural warm alabaster & brass oval lantern pendant suspended above dining table
  // the lantern hangs about 850 mm clear of the table whatever the ceiling
  const lanternY = Math.min(ceiling - 0.5, 1.72);
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 14), mats.tapwareMat);
  canopy.position.set(0, ceiling - 0.015, 0);
  g.add(canopy);
  const rodLen = Math.max(0.05, ceiling - 0.03 - (lanternY + 0.16));
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, rodLen, 8), mats.tapwareMat);
  rod.position.set(0, ceiling - 0.03 - rodLen / 2, 0);
  g.add(rod);
  const alabaster = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 26, 18),
    new THREE.MeshStandardMaterial({ color: 0xf7eee0, emissive: 0xffd292, emissiveIntensity: 1.4, roughness: 0.34 })
  );
  alabaster.scale.set(1.15, 0.44, 1.15);
  alabaster.position.set(0, lanternY, 0);
  g.add(alabaster);

  return g;
}

export function buildMasterBedroomSuite(mats: InteriorMaterials): THREE.Group {
  const g = new THREE.Group();
  addContactShadow(g, 2.75, 2.7, 0, 0);

  // Soft woven wool bedroom rug
  const rug = new THREE.Mesh(createRoundedBoxGeo(3.6, 0.024, 3.1, 0.008, 2), mats.linenMat);
  rug.position.set(0, 0.012, 0.25);
  rug.receiveShadow = true;
  g.add(rug);

  // Oak platform bed frame + vertical slatted architectural headboard
  const frame = new THREE.Mesh(createRoundedBoxGeo(2.2, 0.24, 2.26, 0.016, 3), mats.oakMat);
  frame.position.set(0, 0.17, 0);
  frame.castShadow = true;
  g.add(frame);

  const headboard = new THREE.Mesh(createRoundedBoxGeo(2.92, 1.08, 0.085, 0.014, 3), mats.oakMat);
  headboard.position.set(0, 0.64, -1.09);
  headboard.castShadow = true;
  g.add(headboard);

  // Softly beveled layered linen duvet + folded terracotta throw blanket
  const duvet = new THREE.Mesh(createRoundedBoxGeo(2.08, 0.28, 2.08, 0.075, 5), mats.linenMat);
  duvet.position.set(0, 0.42, 0.05);
  duvet.castShadow = true;
  duvet.receiveShadow = true;
  g.add(duvet);

  const footThrow = new THREE.Mesh(createRoundedBoxGeo(2.12, 0.3, 0.56, 0.065, 4), mats.terracottaMat);
  footThrow.position.set(0, 0.43, 0.74);
  footThrow.castShadow = true;
  g.add(footThrow);

  // 4 Plump layered beveled pillows (2 crisp linen + 2 bouclé)
  const pillowBackGeo = createRoundedBoxGeo(0.74, 0.26, 0.38, 0.075, 5);
  const pillowFrontGeo = createRoundedBoxGeo(0.56, 0.22, 0.24, 0.065, 5);
  for (const px of [-0.52, 0.52]) {
    const p1 = new THREE.Mesh(pillowBackGeo, mats.linenMat);
    p1.position.set(px, 0.64, -0.8);
    p1.rotation.x = 0.22;
    p1.castShadow = true;
    g.add(p1);

    const p2 = new THREE.Mesh(pillowFrontGeo, mats.boucleMat);
    p2.position.set(px, 0.61, -0.58);
    p2.rotation.x = 0.16;
    p2.castShadow = true;
    g.add(p2);
  }

  // Floating oak bedside tables with brass pulls + turned ceramic bedside lamps
  const lampBaseGeo = createLatheVesselGeo([
    [0.0, 0.0],
    [0.065, 0.0],
    [0.085, 0.08],
    [0.052, 0.16],
    [0.025, 0.19],
  ], 18);

  for (const side of [-1, 1]) {
    const tbl = new THREE.Mesh(createRoundedBoxGeo(0.5, 0.18, 0.42, 0.012, 3), mats.oakMat);
    tbl.position.set(side * 1.42, 0.38, -0.82);
    tbl.castShadow = true;
    g.add(tbl);

    const pull = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.018), mats.tapwareMat);
    pull.position.set(side * 1.42, 0.38, -0.605);
    g.add(pull);

    const base = new THREE.Mesh(lampBaseGeo, mats.travertineMat);
    base.position.set(side * 1.42, 0.47, -0.82);
    g.add(base);

    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.15, 0.23, 18),
      new THREE.MeshPhysicalMaterial({
        color: 0xf7eee0,
        emissive: 0xffd18c,
        emissiveIntensity: 0.68,
        roughness: 0.62,
        sheen: 0.4,
      })
    );
    shade.position.set(side * 1.42, 0.74, -0.82);
    g.add(shade);
  }

  return g;
}

/** one oak, bouclé and matt-black steel bar stool, 670 mm seat, facing −z (towards a bench) */
let stoolSeatGeo: THREE.BufferGeometry | null = null;
export function buildBarStool(mats: InteriorMaterials): THREE.Group {
  stoolSeatGeo ??= createRoundedBoxGeo(0.38, 0.06, 0.36, 0.025, 4);
  const stool = new THREE.Group();
  const seat = new THREE.Mesh(stoolSeatGeo, mats.boucleMat);
  seat.position.y = 0.67;
  seat.castShadow = true;
  stool.add(seat);
  const lowBack = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.018, 8, 16, Math.PI * 0.85), mats.oakMat);
  lowBack.rotation.x = Math.PI / 2;
  lowBack.rotation.z = 0.22;
  lowBack.position.set(0, 0.78, 0.04);
  stool.add(lowBack);
  for (const [lx, lz] of [
    [-0.13, -0.12],
    [0.13, -0.12],
    [-0.13, 0.12],
    [0.13, 0.12],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.65, 8), mats.joineryMat);
    leg.position.set(lx, 0.325, lz);
    leg.castShadow = true;
    stool.add(leg);
  }
  const footrest = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.009, 8, 18), mats.tapwareMat);
  footrest.rotation.x = Math.PI / 2;
  footrest.position.y = 0.22;
  stool.add(footrest);
  return stool;
}
