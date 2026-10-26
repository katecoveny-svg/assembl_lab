// assembl capture · keyframe choice, coverage and prompts (pure logic: no DOM, unit-tested).
//
// Every analysed frame (about 10 a second) brings: where the camera is round the subject (azimuth,
// degrees, relative to the start), its pitch, how fast the phone is turning, a sharpness score and,
// for the turntable mode, how much the picture changed since the last keyframe. A frame becomes a
// keyframe when the camera has travelled `spacingDeg` since the last one and the frame is sharp.

export const BINS = 36; // 10° coverage bins

/** Luminance (0–255) of an RGBA buffer. */
export function toGray(rgba, w, h) {
  const g = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
  return g;
}

/** Variance of the 4-neighbour Laplacian: the usual blur measure (higher = sharper). */
export function sharpness(gray, w, h) {
  let s = 0, s2 = 0, n = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const l = gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w] - 4 * gray[i];
    s += l; s2 += l * l; n++;
  }
  const m = s / n;
  return s2 / n - m * m;
}

/** Mean absolute difference (0–1) between two equally sized grey images. */
export function imageChange(a, b) {
  if (!a || !b || a.length !== b.length) return 1;
  let d = 0;
  for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]);
  return d / a.length / 255;
}

const wrap = (a) => ((a % 360) + 360) % 360;
const angDiff = (a, b) => { const d = Math.abs(wrap(a) - wrap(b)); return d > 180 ? 360 - d : d; };

export class KeyframeSelector {
  constructor(preset) {
    this.p = preset;
    this.ring = 0;
    this.cover = preset.rings.map(() => new Uint8Array(BINS));
    this.count = preset.rings.map(() => 0);
    this.last = null;            // last keyframe {azimuth, pitch, t, gray}
    this.recentSharp = [];
    this.blurredSince = null;
    this.offPitchSince = null;
    this.total = 0;
    this.turnEstimate = 0;       // turntable: estimated degrees turned this ring
  }

  setRing(i) { this.ring = Math.max(0, Math.min(this.p.rings.length - 1, i)); this.last = null; this.turnEstimate = 0; }

  _medianSharp() {
    const a = [...this.recentSharp].sort((x, y) => x - y);
    return a.length ? a[Math.floor(a.length / 2)] : 0;
  }

  /**
   * f: { t (ms), azimuthDeg (null if unknown), pitchDeg (null if unknown), rotRateDeg (null if unknown),
   *      sharpness, gray (small grey image for change detection), distanceM (null if unknown), sizeMismatch }
   * Returns { take, prompt, level: "ok"|"warn", why }.
   */
  consider(f) {
    const p = this.p, ring = p.rings[this.ring];
    this.recentSharp.push(f.sharpness);
    if (this.recentSharp.length > 40) this.recentSharp.shift();
    const med = this._medianSharp();
    const sharpEnough = this.recentSharp.length < 5 ? f.sharpness > 0 : f.sharpness >= p.minSharpRel * med;
    const turningFast = f.rotRateDeg != null && f.rotRateDeg > p.maxRotRateDeg;
    if (!sharpEnough || turningFast) this.blurredSince ??= f.t; else this.blurredSince = null;

    if (f.sizeMismatch) return { take: false, prompt: "Turn the phone back the way you started (all photos must be the same way up).", level: "warn", why: "orientation" };
    if (this.total >= p.maxFrames) return { take: false, prompt: "That's the most photos one capture holds. Tap Finish.", level: "warn", why: "max" };

    // where we are
    let moved;
    if (p.objectMotion === "object-turns") {
      const ch = this.last ? imageChange(f.gray, this.last.gray) : 1;
      moved = ch >= (p.imageChange ?? 0.045);
    } else if (f.azimuthDeg != null) {
      moved = !this.last || angDiff(f.azimuthDeg, this.last.azimuth) >= p.spacingDeg ||
        (f.pitchDeg != null && this.last.pitch != null && Math.abs(f.pitchDeg - this.last.pitch) >= p.spacingDeg * 1.2);
    } else {
      moved = !this.last || f.t - this.last.t > 700; // no sensors at all: time-based, every 0.7 s
    }

    // prompts, most useful first
    let prompt = null, level = "ok", why = null;
    if (turningFast) { prompt = "Slower: you're turning quickly, photos will blur."; level = "warn"; why = "fast"; }
    else if (this.blurredSince != null && f.t - this.blurredSince > 1200) { prompt = "Slower, and hold steady for a moment: the picture is blurred."; level = "warn"; why = "blur"; }
    else if (f.distanceM != null && p.distance && f.distanceM < p.distance.minM) { prompt = `Step back: you're closer than ${p.distance.minM} m.`; level = "warn"; why = "close"; }
    else if (f.distanceM != null && p.distance && f.distanceM > p.distance.maxM) { prompt = "Come a little closer."; level = "warn"; why = "far"; }
    else if (ring.pitch && f.pitchDeg != null) {
      const [lo, hi] = ring.pitch;
      const off = f.pitchDeg < lo ? "down" : f.pitchDeg > hi ? "up" : null;
      if (off) this.offPitchSince ??= f.t; else this.offPitchSince = null;
      if (off && f.t - this.offPitchSince > 1500) {
        if (ring.id === "low") prompt = "Go lower, and tilt the phone up a little.";
        else if (ring.id === "high") prompt = "Go higher, and tilt the phone down.";
        else prompt = off === "down" ? "Tilt the phone up a little." : "Tilt the phone down a little.";
        level = "warn"; why = "pitch";
      }
    }

    const take = moved && sharpEnough && !turningFast;
    if (take) {
      this.last = { azimuth: f.azimuthDeg, pitch: f.pitchDeg, t: f.t, gray: f.gray };
      this.total++;
      this.count[this.ring]++;
      if (p.objectMotion === "object-turns") {
        this.turnEstimate += 360 / p.perRingTarget;
        this._fill(this.turnEstimate - 360 / p.perRingTarget, this.turnEstimate);
      } else if (f.azimuthDeg != null) {
        const half = p.spacingDeg / 2 + 1;
        this._fill(f.azimuthDeg - half, f.azimuthDeg + half);
      }
    }
    if (!prompt) {
      const g = this.farSideMissing();
      if (g) { prompt = g; level = "warn"; why = "gap"; }
    }
    return { take, prompt, level, why };
  }

  _fill(a0, a1) {
    const c = this.cover[this.ring];
    for (let a = a0; a <= a1; a += 2) c[Math.floor(wrap(a) / (360 / BINS)) % BINS] = 1;
  }

  /** Coverage of each ring, 0–1. */
  coverage() { return this.cover.map((c) => c.reduce((s, v) => s + v, 0) / BINS); }

  /** Empty arcs of a ring as [startDeg, endDeg] pairs (degrees from the start). */
  gaps(ring = this.ring) {
    const c = this.cover[ring], w = 360 / BINS, out = [];
    if (!c.some((v) => v)) return [[0, 360]];
    const start = c.findIndex((v) => v);
    let k = 0;
    while (k < BINS) {
      if (c[(start + k) % BINS]) { k++; continue; }
      let j = k;
      while (j < BINS && !c[(start + j) % BINS]) j++;
      out.push([((start + k) % BINS) * w, ((start + j) % BINS) * w]);
      k = j;
    }
    return out;
  }

  /** A plain-language gap warning once most of the ring is done (or null). */
  farSideMissing(ring = this.ring) {
    const cov = this.coverage()[ring];
    if (cov < 0.6 || cov >= 0.97) return null;
    const gaps = this.gaps(ring).map(([a, b]) => ({ a, b, len: (b - a + 360) % 360 || 360, mid: wrap(a + ((b - a + 360) % 360) / 2) }));
    const big = gaps.filter((g) => g.len >= 20).sort((x, y) => y.len - x.len)[0];
    if (!big) return null;
    if (angDiff(big.mid, 180) < 50) return "The far side is missing: walk round behind it again.";
    return `A gap is left at ${Math.round(big.a)}–${Math.round(big.b)}° from where you started: go back over that part.`;
  }

  summary() {
    return { frames: this.total, perRing: this.count.slice(), coverage: this.coverage().map((v) => +v.toFixed(3)), medianSharpness: +this._medianSharp().toFixed(1) };
  }
}
