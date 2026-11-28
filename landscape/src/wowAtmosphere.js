import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/**
 * WowAtmosphereEngine — inspired by Codevember Feather (interactive bird flight),
 * Burrow (volumetric sunlit motes), Midnight Zone (coastal golden-hour horizon),
 * and Zen Koi (architectural Ink & Wash presentation mode).
 */
export class WowAtmosphereEngine {
  constructor({ scene, renderer, terrainEngine, sunLight, hemiLight, sky, sharedUniforms, canvasEl }) {
    this.scene = scene;
    this.renderer = renderer;
    this.terrainEngine = terrainEngine;
    this.sunLight = sunLight;
    this.hemiLight = hemiLight;
    this.sky = sky;
    this.sharedUniforms = sharedUniforms;
    this.canvasEl = canvasEl;

    this.group = new THREE.Group();
    this.group.name = 'WowAtmosphere';
    this.scene.add(this.group);

    this.mood = 'daylight'; // 'daylight' | 'golden' | 'ink'
    this._flightT = -1;     // -1 = perched, 0..1 = flying spline loop
    this._flightDuration = 7.8;
    this._birdPivot = null;
    this._birdMesh = null;
    this._perchPos = new THREE.Vector3(-4.6, 3.1, 1.4);

    // Smooth Catmull-Rom flight circuit over the garden, pool, and coastal pavilion
    this._flightCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.6, 3.1, 1.4),
      new THREE.Vector3(-1.2, 5.4, 3.8),
      new THREE.Vector3(5.6, 5.8, -1.8),
      new THREE.Vector3(6.8, 4.4, -7.8),
      new THREE.Vector3(-0.8, 6.2, -10.5),
      new THREE.Vector3(-7.4, 4.9, -4.6),
      new THREE.Vector3(-6.2, 3.8, 0.4),
      new THREE.Vector3(-4.6, 3.1, 1.4),
    ], false, 'catmullrom', 0.5);

    this._motes = null;
    this._moteBase = null;
    this._moteMat = null;
    this._waterRing = null;

    this._buildSunMotes();
    this._buildCoastalWaterHorizon();
    this._loadTui();
  }

  _makeGlowTexture() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(255, 248, 224, 1.0)');
    g.addColorStop(0.35, 'rgba(255, 228, 176, 0.55)');
    g.addColorStop(1, 'rgba(255, 215, 150, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _buildSunMotes() {
    const count = 180;
    const pos = new Float32Array(count * 3);
    const base = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 28;
      const y = 0.6 + Math.random() * 5.2;
      const z = (Math.random() - 0.5) * 26;
      pos[i * 3] = base[i * 3] = x;
      pos[i * 3 + 1] = base[i * 3 + 1] = y;
      pos[i * 3 + 2] = base[i * 3 + 2] = z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this._moteBase = base;
    this._moteMat = new THREE.PointsMaterial({
      map: this._makeGlowTexture(),
      size: 0.16,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xfff5d6,
    });
    this._motes = new THREE.Points(geo, this._moteMat);
    this._motes.frustumCulled = false;
    this.group.add(this._motes);
  }

  _buildCoastalWaterHorizon() {
    // Subtle distant Hauraki Gulf water shimmer ring beyond the 34 m site
    const ringGeo = new THREE.RingGeometry(24, 145, 72, 1);
    ringGeo.rotateX(-Math.PI * 0.5);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x6ba0b8,
      roughness: 0.18,
      metalness: 0.42,
      transparent: true,
      opacity: 0.52,
    });
    this._waterRing = new THREE.Mesh(ringGeo, ringMat);
    this._waterRing.position.y = -2.8;
    this.group.add(this._waterRing);
  }

  async _loadTui() {
    try {
      const loader = new GLTFLoader();
      try {
        await MeshoptDecoder.ready;
        loader.setMeshoptDecoder(MeshoptDecoder);
      } catch {}
      loader.load('/plan-studio/library/glb/manu-tui.glb', (gltf) => {
        const raw = gltf.scene || gltf.scenes?.[0];
        if (!raw) return;
        raw.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(raw);
        const sz = new THREE.Vector3();
        const ctr = new THREE.Vector3();
        box.getSize(sz);
        box.getCenter(ctr);
        const targetSize = 0.42;
        const maxD = Math.max(sz.x, sz.y, sz.z) || 1;
        const s = targetSize / maxD;
        raw.scale.multiplyScalar(s);
        raw.position.set(-ctr.x * s, -box.min.y * s, -ctr.z * s);
        raw.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = false;
          }
        });

        const pivot = new THREE.Group();
        pivot.name = 'InteractiveTui';
        const gy = this.terrainEngine ? this.terrainEngine.getHeight(this._perchPos.x, this._perchPos.z) : 0;
        this._perchPos.y = gy + 2.65;
        this._flightCurve.points[0].copy(this._perchPos);
        this._flightCurve.points[this._flightCurve.points.length - 1].copy(this._perchPos);
        pivot.position.copy(this._perchPos);
        pivot.add(raw);
        this.group.add(pivot);
        this._birdPivot = pivot;
        this._birdMesh = raw;
      }, undefined, () => {});
    } catch {}
  }

  triggerFlight() {
    if (!this._birdPivot) return false;
    this._flightT = 0.0001;
    return true;
  }

  setMood(mood, setSunHourFn = null) {
    this.mood = mood || 'daylight';
    if (this.mood === 'golden') {
      if (typeof setSunHourFn === 'function') setSunHourFn(18.15);
      if (this.renderer) this.renderer.toneMappingExposure = 1.18;
      if (this.sunLight) this.sunLight.color.setHex(0xffc98b);
      if (this.hemiLight) {
        this.hemiLight.color.setHex(0xffdfba);
        this.hemiLight.groundColor.setHex(0x6e544a);
      }
      if (this.scene.fog) this.scene.fog.color.setHex(0xe8cbb4);
      if (this._moteMat) {
        this._moteMat.opacity = 0.78;
        this._moteMat.size = 0.22;
        this._moteMat.color.setHex(0xffd78a);
      }
      if (this._waterRing) {
        this._waterRing.material.color.setHex(0xc98d68);
        this._waterRing.material.opacity = 0.62;
      }
      if (this.sharedUniforms?.uContourMix) this.sharedUniforms.uContourMix.value = 0.0;
      if (this.canvasEl) this.canvasEl.style.filter = 'contrast(1.04) saturate(1.08)';
    } else if (this.mood === 'ink') {
      if (typeof setSunHourFn === 'function') setSunHourFn(11.5);
      if (this.renderer) this.renderer.toneMappingExposure = 1.32;
      if (this.sunLight) this.sunLight.color.setHex(0xfffdf8);
      if (this.hemiLight) {
        this.hemiLight.color.setHex(0xf4efe8);
        this.hemiLight.groundColor.setHex(0xb8aea6);
      }
      if (this.scene.fog) this.scene.fog.color.setHex(0xf3ede6);
      if (this._moteMat) this._moteMat.opacity = 0.08;
      if (this._waterRing) this._waterRing.material.opacity = 0.22;
      if (this.sharedUniforms?.uContourMix) this.sharedUniforms.uContourMix.value = 0.85;
      if (this.canvasEl) this.canvasEl.style.filter = 'grayscale(0.76) sepia(0.22) contrast(1.16) brightness(1.04)';
    } else {
      // 'daylight'
      if (typeof setSunHourFn === 'function') setSunHourFn(14.5);
      if (this.renderer) this.renderer.toneMappingExposure = 1.24;
      if (this.sunLight) this.sunLight.color.setHex(0xfffaf0);
      if (this.hemiLight) {
        this.hemiLight.color.setHex(0xdff0ff);
        this.hemiLight.groundColor.setHex(0x9c927d);
      }
      if (this.scene.fog) this.scene.fog.color.setHex(0xdce8f2);
      if (this._moteMat) {
        this._moteMat.opacity = 0.34;
        this._moteMat.size = 0.16;
        this._moteMat.color.setHex(0xfff5d6);
      }
      if (this._waterRing) {
        this._waterRing.material.color.setHex(0x6ba0b8);
        this._waterRing.material.opacity = 0.52;
      }
      if (this.sharedUniforms?.uContourMix) this.sharedUniforms.uContourMix.value = 0.0;
      if (this.canvasEl) this.canvasEl.style.filter = '';
    }
  }

  update(dt, elapsed, isPhotoMode = false) {
    this.group.visible = !isPhotoMode;
    if (isPhotoMode) return;

    // 1. Gently drift floating sunlit pollen/dust motes
    if (this._motes && this._moteBase) {
      const attr = this._motes.geometry.attributes.position;
      const arr = attr.array;
      const b = this._moteBase;
      const n = arr.length / 3;
      for (let i = 0; i < n; i++) {
        const phase = i * 0.73;
        arr[i * 3] = b[i * 3] + Math.sin(elapsed * 0.35 + phase) * 0.65;
        arr[i * 3 + 1] = b[i * 3 + 1] + Math.sin(elapsed * 0.52 + phase * 1.3) * 0.28;
        arr[i * 3 + 2] = b[i * 3 + 2] + Math.cos(elapsed * 0.29 + phase * 0.9) * 0.65;
      }
      attr.needsUpdate = true;
    }

    // 2. Interactive Tūī perched idle bob or smooth banked spline flight
    if (this._birdPivot) {
      if (this._flightT >= 0) {
        this._flightT += Math.min(dt, 0.05) / this._flightDuration;
        if (this._flightT >= 1.0) {
          this._flightT = -1;
          this._birdPivot.position.copy(this._perchPos);
          this._birdPivot.rotation.set(0, 0.4, 0);
        } else {
          // Ease in-out speed along flight loop
          const u = this._flightT;
          const eased = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
          const pos = this._flightCurve.getPointAt(eased);
          const nextPos = this._flightCurve.getPointAt(Math.min(1, eased + 0.015));
          // Subtle wing-beat vertical lift oscillation
          const flap = Math.sin(elapsed * 22.0) * 0.09 * Math.sin(u * Math.PI);
          this._birdPivot.position.set(pos.x, pos.y + flap, pos.z);
          this._birdPivot.lookAt(nextPos.x, nextPos.y + flap, nextPos.z);
          // Bank smoothly into the turn
          this._birdPivot.rotateZ(Math.sin(u * Math.PI * 2) * 0.32);
        }
      } else {
        // Perched gentle head-turn & breathing bob
        this._birdPivot.position.y = this._perchPos.y + Math.sin(elapsed * 2.1) * 0.018;
        this._birdPivot.rotation.y = 0.4 + Math.sin(elapsed * 0.7) * 0.28;
      }
    }
  }
}
