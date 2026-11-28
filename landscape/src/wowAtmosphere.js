import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/**
 * WowAtmosphereEngine — High-poly sculpted NZ Manu (.glb: 206k-tri Tūī, 142k-tri Kererū,
 * 161k-tri Pīwakawaka via MeshoptDecoder) with banked Press-[F] flight arcs,
 * volumetric golden-hour sun motes, Hauraki coastal water horizon, and Day/Gold/Ink moods.
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

    this.mood = 'daylight';
    this.flock = [];
    this._motes = null;
    this._moteBase = null;
    this._moteMat = null;
    this._waterRing = null;

    this._buildSunMotes();
    this._buildCoastalWaterHorizon();
    this._loadRealManuGLBs();
  }

  async _loadRealManuGLBs() {
    const groundY = (x, z) => (this.terrainEngine ? this.terrainEngine.getHeight(x, z) : 0);
    const loader = new GLTFLoader();
    try {
      await MeshoptDecoder.ready;
      loader.setMeshoptDecoder(MeshoptDecoder);
    } catch {}

    const specs = [
      {
        id: 'tui',
        url: '/plan-studio/library/glb/manu-tui.glb',
        targetLength: 0.42,
        perch: new THREE.Vector3(-4.2, groundY(-4.2, 1.4) + 2.35, 1.4),
        duration: 7.4,
        flapHz: 22,
        alwaysFlit: false,
        curvePts: [
          new THREE.Vector3(-4.2, groundY(-4.2, 1.4) + 2.35, 1.4),
          new THREE.Vector3(-0.8, 4.9, 3.6),
          new THREE.Vector3(5.8, 5.2, -1.6),
          new THREE.Vector3(6.6, 3.8, -7.6),
          new THREE.Vector3(-1.2, 5.6, -10.2),
          new THREE.Vector3(-7.2, 4.4, -3.8),
          new THREE.Vector3(-4.2, groundY(-4.2, 1.4) + 2.35, 1.4),
        ],
      },
      {
        id: 'kereru',
        url: '/plan-studio/library/glb/manu-kereru.glb',
        targetLength: 0.56,
        perch: new THREE.Vector3(-7.4, groundY(-7.4, -2.6) + 2.85, -2.6),
        duration: 9.2,
        flapHz: 14,
        alwaysFlit: false,
        curvePts: [
          new THREE.Vector3(-7.4, groundY(-7.4, -2.6) + 2.85, -2.6),
          new THREE.Vector3(-4.2, 5.8, -6.5),
          new THREE.Vector3(3.4, 6.4, -8.8),
          new THREE.Vector3(7.4, 5.1, -2.2),
          new THREE.Vector3(2.2, 4.6, 3.8),
          new THREE.Vector3(-5.8, 4.8, 1.4),
          new THREE.Vector3(-7.4, groundY(-7.4, -2.6) + 2.85, -2.6),
        ],
      },
      {
        id: 'piwakawaka',
        url: '/plan-studio/library/glb/manu-piwakawaka.glb',
        targetLength: 0.28,
        perch: new THREE.Vector3(1.6, groundY(1.6, 2.5) + 1.35, 2.5),
        duration: 6.0,
        flapHz: 28,
        alwaysFlit: true,
      },
    ];

    for (const sp of specs) {
      loader.load(sp.url, (gltf) => {
        const raw = gltf.scene || gltf.scenes?.[0];
        if (!raw) return;
        raw.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(raw);
        const sz = new THREE.Vector3();
        const ctr = new THREE.Vector3();
        box.getSize(sz);
        box.getCenter(ctr);
        const maxD = Math.max(sz.x, sz.y, sz.z) || 1;
        const s = sp.targetLength / maxD;
        raw.scale.multiplyScalar(s);
        raw.position.set(-ctr.x * s, -box.min.y * s, -ctr.z * s);
        raw.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });

        const pivot = new THREE.Group();
        pivot.name = `Manu_${sp.id}`;
        pivot.position.copy(sp.perch);
        pivot.add(raw);
        this.group.add(pivot);

        this.flock.push({
          id: sp.id,
          root: pivot,
          perch: sp.perch,
          flightT: sp.alwaysFlit ? 0 : -1,
          duration: sp.duration,
          flapHz: sp.flapHz,
          alwaysFlit: sp.alwaysFlit,
          curve: sp.curvePts ? new THREE.CatmullRomCurve3(sp.curvePts, false, 'catmullrom', 0.5) : null,
        });
      }, undefined, () => {});
    }
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
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xfff5d6,
    });
    this._motes = new THREE.Points(geo, this._moteMat);
    this._motes.frustumCulled = false;
    this.group.add(this._motes);
  }

  _buildCoastalWaterHorizon() {
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

  triggerFlight() {
    for (const b of this.flock) {
      if (!b.alwaysFlit && b.curve) {
        b.flightT = 0.0001;
      }
    }
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

    for (const b of this.flock) {
      if (b.alwaysFlit) {
        const t = elapsed * 0.78;
        const x = b.perch.x + Math.sin(t) * 2.4;
        const z = b.perch.z + Math.sin(t * 2.0) * 1.25;
        const y = b.perch.y + Math.sin(t * 3.1) * 0.26;
        const nx = b.perch.x + Math.sin(t + 0.08) * 2.4;
        const nz = b.perch.z + Math.sin((t + 0.08) * 2.0) * 1.25;
        b.root.position.set(x, y, z);
        b.root.lookAt(nx, y, nz);
        b.root.rotateZ(Math.sin(t * 2.0) * 0.18);
      } else if (b.flightT >= 0 && b.curve) {
        b.flightT += Math.min(dt, 0.05) / b.duration;
        if (b.flightT >= 1.0) {
          b.flightT = -1;
          b.root.position.copy(b.perch);
          b.root.rotation.set(0, 0.45, 0);
        } else {
          const u = b.flightT;
          const eased = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
          const pos = b.curve.getPointAt(eased);
          const nextPos = b.curve.getPointAt(Math.min(1, eased + 0.015));
          b.root.position.set(pos.x, pos.y + Math.sin(elapsed * b.flapHz) * 0.035, pos.z);
          b.root.lookAt(nextPos.x, nextPos.y, nextPos.z);
          b.root.rotateZ(Math.sin(u * Math.PI * 2) * 0.28);
        }
      } else {
        b.root.position.y = b.perch.y + Math.sin(elapsed * 2.1) * 0.015;
        b.root.rotation.y = 0.45 + Math.sin(elapsed * 0.7 + (b.id === 'kereru' ? 1.4 : 0)) * 0.30;
      }
    }
  }
}
