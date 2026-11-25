import * as THREE from 'three';
import { PLANT_MAP } from '../data/nzPlants.js';

const NECTAR_IDS = new Set(['pohutukawa', 'kowhai', 'harakeke', 'kakabeak', 'manuka']);

// ── PROCEDURAL ARTICULATED 3D NATIVE NZ BIRDS ─────────────────────────────────
function buildTuiMesh() {
  const root = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x0e2a33, roughness: 0.28, metalness: 0.45 // Iridescent dark teal-blue/black plumage
  });
  const sheenMat = new THREE.MeshStandardMaterial({
    color: 0x164e52, roughness: 0.22, metalness: 0.55
  });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfafaf8, roughness: 0.65 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.35 });

  // Streamlined torso
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), bodyMat);
  body.scale.set(0.85, 0.9, 1.85);
  body.castShadow = true;
  root.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 8), sheenMat);
  head.position.set(0, 0.055, 0.17);
  root.add(head);

  // Slender curved beak
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.095, 6), beakMat);
  beak.rotation.x = Math.PI * 0.54;
  beak.position.set(0, 0.042, 0.255);
  root.add(beak);

  // Iconic twin white pōhoi throat tufts!
  const tuftGeo = new THREE.SphereGeometry(0.025, 8, 8);
  const tuftL = new THREE.Mesh(tuftGeo, whiteMat);
  tuftL.position.set(-0.024, 0.005, 0.175);
  const tuftR = new THREE.Mesh(tuftGeo, whiteMat);
  tuftR.position.set(0.024, 0.005, 0.175);
  root.add(tuftL, tuftR);

  // Long dark tail
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.014, 0.26), bodyMat);
  tail.position.set(0, 0.01, -0.25);
  tail.rotation.x = 0.08;
  root.add(tail);

  // Articulated flapping wings
  const wingGeo = new THREE.BoxGeometry(0.28, 0.012, 0.14);
  wingGeo.translate(0.14, 0, 0);
  const wingL = new THREE.Group();
  wingL.position.set(0.06, 0.03, 0.02);
  const wingLMesh = new THREE.Mesh(wingGeo, sheenMat);
  wingLMesh.castShadow = true;
  wingL.add(wingLMesh);

  const wingRGeo = new THREE.BoxGeometry(0.28, 0.012, 0.14);
  wingRGeo.translate(-0.14, 0, 0);
  const wingR = new THREE.Group();
  wingR.position.set(-0.06, 0.03, 0.02);
  const wingRMesh = new THREE.Mesh(wingRGeo, sheenMat);
  wingRMesh.castShadow = true;
  wingR.add(wingRMesh);

  root.add(wingL, wingR);
  root.scale.setScalar(0.88);
  return { root, wingL, wingR, tailPivot: tail };
}

function buildPiwakawakaMesh() {
  const root = new THREE.Group();
  const chestMat = new THREE.MeshStandardMaterial({ color: 0xb86b35, roughness: 0.72 }); // Warm chestnut
  const headMat = new THREE.MeshStandardMaterial({ color: 0x33363b, roughness: 0.65 });  // Charcoal head/back
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1d2024, roughness: 0.68 });

  // Plump tiny chestnut body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.072, 10, 8), chestMat);
  body.scale.set(0.95, 0.92, 1.3);
  body.castShadow = true;
  root.add(body);

  // Charcoal head + crisp white throat band
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), headMat);
  head.position.set(0, 0.045, 0.088);
  root.add(head);

  const collar = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), whiteMat);
  collar.scale.set(1.0, 0.45, 0.7);
  collar.position.set(0, 0.015, 0.085);
  root.add(collar);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.04, 5), darkMat);
  beak.rotation.x = Math.PI * 0.5;
  beak.position.set(0, 0.04, 0.14);
  root.add(beak);

  // Signature wide fanned black-and-white tail (7 radiating feathers!)
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.015, -0.08);
  tailPivot.rotation.x = 0.42;
  const featherGeo = new THREE.BoxGeometry(0.026, 0.006, 0.22);
  featherGeo.translate(0, 0, -0.11);
  for (let i = -3; i <= 3; i++) {
    const isOuter = Math.abs(i) >= 2 || Math.abs(i) === 1;
    const fMat = (Math.abs(i) === 0 || Math.abs(i) === 3) ? darkMat : whiteMat;
    const f = new THREE.Mesh(featherGeo, fMat);
    f.rotation.y = i * 0.20;
    f.scale.z = isOuter ? 0.95 : 1.05;
    tailPivot.add(f);
  }
  root.add(tailPivot);

  // Nimble fluttering wings
  const wingGeo = new THREE.BoxGeometry(0.18, 0.008, 0.095);
  wingGeo.translate(0.09, 0, 0);
  const wingL = new THREE.Group();
  wingL.position.set(0.048, 0.02, 0.01);
  wingL.add(new THREE.Mesh(wingGeo, headMat));

  const wingRGeo = new THREE.BoxGeometry(0.18, 0.008, 0.095);
  wingRGeo.translate(-0.09, 0, 0);
  const wingR = new THREE.Group();
  wingR.position.set(-0.048, 0.02, 0.01);
  wingR.add(new THREE.Mesh(wingRGeo, headMat));

  root.add(wingL, wingR);
  root.scale.setScalar(0.96);
  return { root, wingL, wingR, tailPivot };
}

function buildKereruMesh() {
  const root = new THREE.Group();
  const emeraldMat = new THREE.MeshStandardMaterial({
    color: 0x166534, roughness: 0.28, metalness: 0.42 // Iridescent emerald-green head & back
  });
  const purpleBackMat = new THREE.MeshStandardMaterial({
    color: 0x3b2c4a, roughness: 0.35, metalness: 0.35 // Bronze-purple wing coverts
  });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfdfdfb, roughness: 0.72 }); // Crisp white singlet breast
  const coralMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.45 });

  // Plump iconic body
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), emeraldMat);
  back.scale.set(0.95, 0.88, 1.65);
  back.castShadow = true;
  root.add(back);

  // Crisp white singlet breast
  const breast = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 10), whiteMat);
  breast.scale.set(0.92, 0.78, 1.38);
  breast.position.set(0, -0.045, 0.03);
  root.add(breast);

  // Iridescent emerald head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.082, 10, 8), emeraldMat);
  head.position.set(0, 0.09, 0.24);
  root.add(head);

  // Coral-red beak
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.065, 6), coralMat);
  beak.rotation.x = Math.PI * 0.52;
  beak.position.set(0, 0.08, 0.33);
  root.add(beak);

  // Broad tail
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.016, 0.32), purpleBackMat);
  tail.position.set(0, 0.01, -0.34);
  root.add(tail);

  // Broad sweeping wings
  const wingGeo = new THREE.BoxGeometry(0.44, 0.016, 0.21);
  wingGeo.translate(0.22, 0, 0);
  const wingL = new THREE.Group();
  wingL.position.set(0.10, 0.04, 0.02);
  const wL = new THREE.Mesh(wingGeo, emeraldMat);
  wL.castShadow = true;
  wingL.add(wL);

  const wingRGeo = new THREE.BoxGeometry(0.44, 0.016, 0.21);
  wingRGeo.translate(-0.22, 0, 0);
  const wingR = new THREE.Group();
  wingR.position.set(-0.10, 0.04, 0.02);
  const wR = new THREE.Mesh(wingRGeo, emeraldMat);
  wR.castShadow = true;
  wingR.add(wR);

  root.add(wingL, wingR);
  root.scale.setScalar(0.82);
  return { root, wingL, wingR, tailPivot: tail };
}

export class NZWildlifeEngine {
  constructor(scene, terrainEngine, plantingEngine) {
    this.scene = scene;
    this.terrainEngine = terrainEngine;
    this.plantingEngine = plantingEngine;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.enabled = true;
    this.birds = [];
    this._time = 0;

    this._spawnFlock();
  }

  _spawnFlock() {
    // 7 lively native NZ birds: 3 Tūī, 2 Pīwakawaka (Fantails), 2 Kererū
    const specs = [
      { type: 'tui', phase: 0.0, speed: 3.4, alt: 2.3 },
      { type: 'tui', phase: 2.2, speed: 3.1, alt: 2.7 },
      { type: 'tui', phase: 4.5, speed: 3.6, alt: 2.0 },
      { type: 'piwakawaka', phase: 1.1, speed: 2.7, alt: 1.15 },
      { type: 'piwakawaka', phase: 3.8, speed: 2.9, alt: 0.95 },
      { type: 'kereru', phase: 0.7, speed: 2.3, alt: 4.9 },
      { type: 'kereru', phase: 3.9, speed: 2.1, alt: 5.7 }
    ];

    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      const rig = s.type === 'tui'
        ? buildTuiMesh()
        : s.type === 'piwakawaka'
          ? buildPiwakawakaMesh()
          : buildKereruMesh();

      this.group.add(rig.root);

      const startAngle = (i / specs.length) * Math.PI * 2;
      const startPos = new THREE.Vector3(
        Math.cos(startAngle) * 5.5,
        this.terrainEngine.getHeight(Math.cos(startAngle) * 5.5, Math.sin(startAngle) * 5.5) + s.alt,
        Math.sin(startAngle) * 5.5
      );
      rig.root.position.copy(startPos);

      this.birds.push({
        ...s,
        rig,
        pos: startPos,
        vel: new THREE.Vector3(Math.cos(startAngle + 1.5), 0, Math.sin(startAngle + 1.5)),
        target: startPos.clone(),
        hoverTimer: 0,
        retargetTimer: i * 0.9,
        orbitRadius: s.type === 'kereru' ? 6.0 + (i % 2) * 1.6 : 4.8
      });
    }
  }

  setEnabled(on) {
    this.enabled = Boolean(on);
    this.group.visible = this.enabled;
  }

  _pickNectarTarget(bird) {
    const plants = this.plantingEngine ? this.plantingEngine.plants : [];
    const nectarPlants = plants.filter(p => NECTAR_IDS.has(p.speciesId));

    if (bird.type === 'tui' && nectarPlants.length > 0) {
      const p = nectarPlants[Math.floor(Math.random() * nectarPlants.length)];
      const spec = PLANT_MAP[p.speciesId];
      const ty = this.terrainEngine.getHeight(p.x, p.z);
      const h = (spec ? spec.matureHeight * 0.65 : 1.8) * (p.scale || 1);
      return new THREE.Vector3(
        p.x + (Math.random() - 0.5) * 0.7,
        ty + Math.max(1.1, h),
        p.z + (Math.random() - 0.5) * 0.7
      );
    }

    if (bird.type === 'piwakawaka' && plants.length > 0) {
      // Flit playfully low over ferns, shrubs, and beds
      const p = plants[Math.floor(Math.random() * plants.length)];
      const ty = this.terrainEngine.getHeight(p.x, p.z);
      return new THREE.Vector3(
        p.x + (Math.random() - 0.5) * 2.4,
        ty + 0.75 + Math.random() * 1.15,
        p.z + (Math.random() - 0.5) * 2.4
      );
    }

    // Fallback scenic garden waypoint
    const a = Math.random() * Math.PI * 2;
    const r = 2.0 + Math.random() * 7.5;
    const wx = Math.cos(a) * r;
    const wz = Math.sin(a) * r;
    return new THREE.Vector3(wx, this.terrainEngine.getHeight(wx, wz) + bird.alt, wz);
  }

  update(dt) {
    if (!this.enabled) return;
    this._time += dt;
    const t = this._time;

    for (const b of this.birds) {
      if (b.type === 'kereru') {
        // Sweeping heavy wingbeats gliding gracefully above the canopy
        const ang = t * 0.24 * (b.speed / 2.2) + b.phase;
        const wx = Math.cos(ang) * b.orbitRadius + Math.sin(ang * 2.1) * 1.6;
        const wz = Math.sin(ang) * (b.orbitRadius * 0.78) - 0.8;
        const ty = this.terrainEngine.getHeight(wx, wz);
        const wy = ty + b.alt + Math.sin(t * 0.8 + b.phase) * 0.45;

        const nextPos = new THREE.Vector3(wx, wy, wz);
        const dir = nextPos.clone().sub(b.pos);
        if (dir.lengthSq() > 1e-6) {
          b.vel.lerp(dir.normalize(), Math.min(1, dt * 4.0));
        }
        b.pos.copy(nextPos);
        b.rig.root.position.copy(b.pos);
        b.rig.root.lookAt(b.pos.clone().add(b.vel));

        // Heavy sweeping wingbeats interspersed with short glides
        const glideCycle = Math.sin(t * 1.1 + b.phase);
        const flap = glideCycle > -0.25 ? Math.sin(t * 9.5 + b.phase) * 0.62 : -0.14;
        b.rig.wingL.rotation.z = flap;
        b.rig.wingR.rotation.z = -flap;
        continue;
      }

      // Tūī & Pīwakawaka dynamic waypoint / nectar-visiting flight
      b.retargetTimer -= dt;
      if (b.hoverTimer > 0) {
        b.hoverTimer -= dt;
        // Hover / perch gently near blooms
        const hoverY = Math.sin(t * 5.2 + b.phase) * 0.08;
        b.rig.root.position.set(b.pos.x, b.pos.y + hoverY, b.pos.z);
        const flap = b.type === 'tui'
          ? Math.sin(t * 18.0 + b.phase) * 0.55
          : Math.sin(t * 22.0 + b.phase) * 0.48;
        b.rig.wingL.rotation.z = flap;
        b.rig.wingR.rotation.z = -flap;
        if (b.type === 'piwakawaka') {
          b.rig.tailPivot.rotation.y = Math.sin(t * 8.0 + b.phase) * 0.35;
        }
        if (b.hoverTimer <= 0) {
          b.target = this._pickNectarTarget(b);
          b.retargetTimer = 5.5 + Math.random() * 3.5;
        }
        continue;
      }

      const toTarget = b.target.clone().sub(b.pos);
      const dist = toTarget.length();
      if (dist < 0.45 || b.retargetTimer <= 0) {
        if (dist < 0.45 && b.type === 'tui') {
          b.hoverTimer = 1.6 + Math.random() * 1.4; // Sip nectar from blooms
        } else {
          b.target = this._pickNectarTarget(b);
          b.retargetTimer = b.type === 'piwakawaka' ? (2.2 + Math.random() * 1.8) : (4.5 + Math.random() * 3.0);
        }
      } else {
        const desired = toTarget.normalize();
        // Swooping vertical arc for Tūī, darting zigzag for Pīwakawaka
        if (b.type === 'piwakawaka') {
          desired.x += Math.sin(t * 5.5 + b.phase) * 0.42;
          desired.z += Math.cos(t * 4.8 + b.phase) * 0.42;
          desired.y += Math.sin(t * 6.2 + b.phase) * 0.22;
        } else {
          desired.y += Math.sin(t * 2.8 + b.phase) * 0.16;
        }
        desired.normalize();
        b.vel.lerp(desired, Math.min(1, dt * (b.type === 'piwakawaka' ? 5.2 : 3.4))).normalize();
        b.pos.addScaledVector(b.vel, b.speed * dt);

        // Keep safely above sloped terrain
        const minH = this.terrainEngine.getHeight(b.pos.x, b.pos.z) + (b.type === 'piwakawaka' ? 0.55 : 1.0);
        if (b.pos.y < minH) b.pos.y = minH;

        b.rig.root.position.copy(b.pos);
        b.rig.root.lookAt(b.pos.clone().add(b.vel));

        const flapFreq = b.type === 'piwakawaka' ? 21.0 : 15.0;
        const flap = Math.sin(t * flapFreq + b.phase) * 0.68;
        b.rig.wingL.rotation.z = flap;
        b.rig.wingR.rotation.z = -flap;
        if (b.type === 'piwakawaka') {
          b.rig.tailPivot.rotation.y = Math.sin(t * 9.5 + b.phase) * 0.42;
          b.rig.tailPivot.rotation.x = 0.42 + Math.cos(t * 6.0 + b.phase) * 0.15;
        }
      }
    }
  }
}
