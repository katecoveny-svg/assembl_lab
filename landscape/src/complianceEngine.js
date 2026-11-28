import * as THREE from 'three';

// Live NZ Council Compliance Engine:
// - Impervious Surface % & Landscaped Area % (Auckland Unitary Plan Residential max 60% impervious)
// - Toggleable 3D Boundary Recession Planes (HIRB: 2.5 m + 45° along parcel perimeter)
export class ComplianceEngine {
  constructor(scene, terrainEngine, parcelSize = 30) {
    this.scene = scene;
    this.terrainEngine = terrainEngine;
    this.parcelSize = parcelSize;
    this.hirbGroup = new THREE.Group();
    this.hirbGroup.visible = false;
    this.scene.add(this.hirbGroup);
    this.rebuildHIRB();
  }

  setHIRBVisible(vis) {
    this.hirbGroup.visible = vis;
  }

  rebuildHIRB() {
    while (this.hirbGroup.children.length) {
      const c = this.hirbGroup.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }

    const half = this.parcelSize * 0.5;
    const startH = 2.5;
    const reach = 7.0;
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8, transparent: true, opacity: 0.11, side: THREE.DoubleSide, depthWrite: false,
    });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 });

    const sides = [
      { x: 0, z: -half, ry: 0 },
      { x: 0, z: half, ry: Math.PI },
      { x: -half, z: 0, ry: Math.PI * 0.5 },
      { x: half, z: 0, ry: -Math.PI * 0.5 },
    ];

    for (const s of sides) {
      const gy = this.terrainEngine ? this.terrainEngine.getHeight(s.x, s.z) : 0;
      const g = new THREE.Group();
      g.position.set(s.x, gy, s.z);
      g.rotation.y = s.ry;

      const vWall = new THREE.Mesh(new THREE.PlaneGeometry(this.parcelSize, startH), planeMat);
      vWall.position.set(0, startH * 0.5, 0);
      g.add(vWall);

      const slopeLen = Math.hypot(reach, reach);
      const sPlane = new THREE.Mesh(new THREE.PlaneGeometry(this.parcelSize, slopeLen), planeMat);
      sPlane.position.set(0, startH + reach * 0.5, reach * 0.5);
      sPlane.rotation.x = -Math.PI * 0.25;
      g.add(sPlane);

      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-half, startH, 0), new THREE.Vector3(half, startH, 0),
      ]);
      g.add(new THREE.Line(lineGeom, edgeMat));
      this.hirbGroup.add(g);
    }
  }

  evaluate({ parcelAreaM2 = 900, roofAreaM2 = 0, poolFootprintM2 = 0, hardPavingM2 = 0 }) {
    const imperviousM2 = roofAreaM2 + poolFootprintM2 + hardPavingM2;
    const imperviousPct = Math.min(100, (imperviousM2 / Math.max(100, parcelAreaM2)) * 100);
    const landscapedPct = Math.max(0, 100 - imperviousPct);
    return {
      parcelAreaM2,
      imperviousM2,
      imperviousPct,
      landscapedPct,
      maxAllowedPct: 60,
      compliant: imperviousPct <= 60,
    };
  }
}
