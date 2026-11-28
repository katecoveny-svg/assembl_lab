import * as THREE from 'three';

/**
 * Site Photo-Match & Horizon/LINZ Alignment Engine
 * Renders an uploaded client site photo behind a transparent WebGPU canvas,
 * auto-detects the horizon line from sky-to-ground gradient transitions,
 * aligns camera eye height / pitch / iPhone wide-angle FOV, and rotates LINZ parcels.
 */
export class PhotoMatchEngine {
  constructor({
    renderer,
    scene,
    camera,
    controls,
    sharedUniforms,
    terrainEngine,
    sky,
    skirtMesh,
    horizonGroup,
    deckContext,
    backdropEl,
    onStateChange = () => {},
  }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.sharedUniforms = sharedUniforms;
    this.terrainEngine = terrainEngine;
    this.sky = sky;
    this.skirtMesh = skirtMesh;
    this.horizonGroup = horizonGroup;
    this.deckContext = deckContext;
    this.backdropEl = backdropEl;
    this.onStateChange = onStateChange;

    this.active = false;
    this.hasPhoto = false;
    this.photoName = '';
    this._loadedImage = null;
    this._savedFog = scene.fog;
    this._savedCamState = null;

    this.eyeHeight = 1.55;
    this.horizonPitchDeg = 0.0;
    this.lensFov = 64;
    this.parcelBearingDeg = 0;
    this.detectedHorizonRatio = 0.48;
  }

  loadPhotoFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No photo file provided.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.loadPhotoDataURL(reader.result, file.name).then(resolve).catch(reject);
      };
      reader.onerror = () => reject(new Error('Failed to read site photo.'));
      reader.readAsDataURL(file);
    });
  }

  loadPhotoDataURL(dataUrl, name = 'Site Photo') {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this._loadedImage = img;
        this.hasPhoto = true;
        this.photoName = name;
        if (this.backdropEl) {
          this.backdropEl.src = dataUrl;
        }
        this.setActive(true);
        const alignRes = this.autoAlignHorizon();
        resolve({ name, width: img.naturalWidth, height: img.naturalHeight, ...alignRes });
      };
      img.onerror = () => reject(new Error('Could not decode site photo image.'));
      img.src = dataUrl;
    });
  }

  setActive(enable) {
    const next = Boolean(enable);
    if (next === this.active) {
      if (next) this._applyScenePhotoVisibility(true);
      return;
    }

    if (next) {
      this._savedCamState = {
        pos: this.camera.position.clone(),
        target: this.controls.target.clone(),
        fov: this.camera.fov,
      };
      this.active = true;
      this._applyScenePhotoVisibility(true);
      this.applyCameraAlignment();
    } else {
      this.active = false;
      this._applyScenePhotoVisibility(false);
      if (this._savedCamState) {
        this.camera.fov = this._savedCamState.fov;
        this.camera.position.copy(this._savedCamState.pos);
        this.controls.target.copy(this._savedCamState.target);
        this.camera.updateProjectionMatrix();
        this.controls.update();
      }
    }

    this.onStateChange(this.getState());
  }

  _applyScenePhotoVisibility(isPhoto) {
    document.body.classList.toggle('photo-mode', isPhoto);
    if (this.backdropEl) {
      this.backdropEl.classList.toggle('hidden', !isPhoto || !this.hasPhoto);
    }
    this.renderer.setClearAlpha(isPhoto ? 0 : 1);
    this.sharedUniforms.uPhotoMode.value = isPhoto ? 1.0 : 0.0;

    if (this.sky) this.sky.visible = !isPhoto;
    if (this.skirtMesh) this.skirtMesh.visible = !isPhoto;
    if (this.horizonGroup) this.horizonGroup.visible = !isPhoto;
    if (this.deckContext?.group) this.deckContext.group.visible = !isPhoto;
    this.scene.fog = isPhoto ? null : this._savedFog;
  }

  autoAlignHorizon() {
    let horizonRatio = 0.48;
    if (this._loadedImage) {
      const W = 240, H = 180;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(this._loadedImage, 0, 0, W, H);
      const data = ctx.getImageData(0, 0, W, H).data;

      const yMin = Math.floor(H * 0.25);
      const yMax = Math.floor(H * 0.75);
      const colHorizons = [];

      for (let c = 0; c < 24; c++) {
        const x = Math.floor(W * (0.08 + (c / 23) * 0.84));
        let bestY = Math.floor(H * 0.48);
        let bestScore = -1e9;

        for (let y = yMin; y <= yMax; y++) {
          let topLum = 0, topSky = 0;
          let botLum = 0, botGround = 0;
          const band = 6;
          for (let dy = 1; dy <= band; dy++) {
            const yt = Math.max(0, y - dy);
            const yb = Math.min(H - 1, y + dy);
            const it = (yt * W + x) * 4;
            const ib = (yb * W + x) * 4;
            const rt = data[it], gt = data[it + 1], bt = data[it + 2];
            const rb = data[ib], gb = data[ib + 1], bb = data[ib + 2];
            topLum += 0.299 * rt + 0.587 * gt + 0.114 * bt;
            topSky += (bt - rt) * 0.9 + (bt - gb * 0.25) * 0.35 + (rt + gt + bt) * 0.15;
            botLum += 0.299 * rb + 0.587 * gb + 0.114 * bb;
            botGround += (gb - bb) * 0.85 + (rb - bb) * 0.55;
          }
          const lumDrop = (topLum - botLum) / band;
          const skyToGround = (topSky + botGround) / band;
          const centerPrior = -Math.abs(y / H - 0.47) * 42;
          const score = lumDrop * 0.75 + skyToGround * 0.65 + centerPrior;
          if (score > bestScore) { bestScore = score; bestY = y; }
        }
        colHorizons.push(bestY / H);
      }
      colHorizons.sort((a, b) => a - b);
      horizonRatio = Math.max(0.25, Math.min(0.75, colHorizons[Math.floor(colHorizons.length * 0.5)]));
    }

    this.detectedHorizonRatio = horizonRatio;
    this.eyeHeight = 1.55;
    this.lensFov = 64;
    const rawPitch = (horizonRatio - 0.5) * this.lensFov * 0.78;
    this.horizonPitchDeg = Math.max(-15, Math.min(15, Math.round(rawPitch * 10) / 10));

    if (this.active) this.applyCameraAlignment();
    this.onStateChange(this.getState());
    return {
      horizonRatio: this.detectedHorizonRatio,
      eyeHeight: this.eyeHeight,
      lensFov: this.lensFov,
      horizonPitchDeg: this.horizonPitchDeg,
    };
  }

  applyCameraAlignment() {
    const camZ = 10.2, camX = 0.0;
    const groundY = this.terrainEngine ? this.terrainEngine.getHeight(camX, camZ) : 0;
    const camY = groundY + this.eyeHeight;
    const lookDist = 14.0;
    const pitchRad = THREE.MathUtils.degToRad(this.horizonPitchDeg);
    const targetY = camY + Math.tan(pitchRad) * lookDist;

    this.camera.fov = this.lensFov;
    this.camera.position.set(camX, camY, camZ);
    this.controls.target.set(0, targetY, camZ - lookDist);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  setEyeHeight(m) {
    this.eyeHeight = Math.max(0.8, Math.min(3.5, m));
    if (this.active) this.applyCameraAlignment();
    this.onStateChange(this.getState());
  }

  setHorizonPitch(deg) {
    this.horizonPitchDeg = Math.max(-15, Math.min(15, deg));
    if (this.active) this.applyCameraAlignment();
    this.onStateChange(this.getState());
  }

  setLensFov(fov) {
    this.lensFov = Math.max(35, Math.min(85, fov));
    if (this.active) this.applyCameraAlignment();
    this.onStateChange(this.getState());
  }

  setParcelBearing(deg) {
    this.parcelBearingDeg = ((deg % 360) + 360) % 360;
    if (this.terrainEngine?.parcelGroup) {
      this.terrainEngine.parcelGroup.rotation.y = THREE.MathUtils.degToRad(this.parcelBearingDeg);
    }
    this.onStateChange(this.getState());
  }

  clearPhoto() {
    this.hasPhoto = false;
    this.photoName = '';
    this._loadedImage = null;
    if (this.backdropEl) {
      this.backdropEl.removeAttribute('src');
      this.backdropEl.classList.add('hidden');
    }
    this.setActive(false);
    this.onStateChange(this.getState());
  }

  getState() {
    return {
      active: this.active,
      hasPhoto: this.hasPhoto,
      photoName: this.photoName,
      eyeHeight: this.eyeHeight,
      horizonPitchDeg: this.horizonPitchDeg,
      lensFov: this.lensFov,
      parcelBearingDeg: this.parcelBearingDeg,
      detectedHorizonRatio: this.detectedHorizonRatio,
    };
  }
}
