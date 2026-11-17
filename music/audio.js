// assembl lab · instrument studies: sound, made in the browser. No recordings.
// Guitar: Karplus-Strong plucked string (a short burst of noise fed round a tuned delay loop that loses a little
//   brightness each pass), rendered once per note into a buffer, then through a small "body" EQ and room.
// Snare: a pitched drum tone that drops in pitch, plus filtered noise for the wires.
// Piano: additive partials with a little inharmonicity, two slightly detuned strings per partial, and a felt thump.
export const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Sound {
  constructor() { this.ctx = null; this.buffers = new Map(); this.muted = false; }

  get ready() { return !!this.ctx && this.ctx.state === 'running'; }

  ensure() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      const ctx = this.ctx = new C({ latencyHint: 'interactive' });
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2;
      this.master = ctx.createGain(); this.master.gain.value = 0.85;
      this.master.connect(comp); comp.connect(ctx.destination);
      // small room
      const verb = ctx.createConvolver(); verb.buffer = this.impulse(1.5, 2.6);
      this.wet = ctx.createGain(); this.wet.gain.value = 0.2;
      verb.connect(this.wet); this.wet.connect(this.master);
      this.verb = verb;
      this.bus = ctx.createGain(); this.bus.connect(this.master); this.bus.connect(verb);
      // guitar body: a couple of low resonances and a softened top
      const f1 = this.peak(98, 1.3, 4), f2 = this.peak(196, 1.6, 3), f3 = this.peak(410, 1, 1.5);
      const hs = ctx.createBiquadFilter(); hs.type = 'highshelf'; hs.frequency.value = 3800; hs.gain.value = -5;
      f1.connect(f2); f2.connect(f3); f3.connect(hs);
      // dry string plus the body's ring
      const body = ctx.createConvolver(); body.normalize = true; body.buffer = this.bodyIR();
      const dry = ctx.createGain(); dry.gain.value = 0.55; const wetB = ctx.createGain(); wetB.gain.value = 0.75;
      hs.connect(dry); hs.connect(body); body.connect(wetB); dry.connect(this.bus); wetB.connect(this.bus);
      this.guitarIn = f1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  // an acoustic guitar body as a sum of decaying resonances: the air in the box, the top and back plates, and a little wood noise
  bodyIR() {
    const sr = this.ctx.sampleRate, n = Math.floor(sr * 0.35), b = this.ctx.createBuffer(2, n, sr);
    const modes = [[102, 1.0, 0.09], [196, 0.8, 0.07], [228, 0.5, 0.06], [395, 0.45, 0.05], [520, 0.35, 0.04], [760, 0.25, 0.03], [1150, 0.18, 0.02], [1900, 0.1, 0.012], [2800, 0.06, 0.008]];
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      d[0] = 1;
      for (const [f, a, t] of modes) { const ff = f * (1 + (c ? 0.012 : -0.008)), ph = Math.random() * 6.28; for (let i = 1; i < n; i++) d[i] += a * Math.exp(-i / (sr * t)) * Math.sin(2 * Math.PI * ff * i / sr + ph) * 0.35; }
      let lp = 0; for (let i = 1; i < n; i++) { lp += 0.3 * ((Math.random() * 2 - 1) - lp); d[i] += lp * 0.05 * Math.exp(-i / (sr * 0.02)); }
    }
    return b;
  }

  peak(freq, q, gain) { const f = this.ctx.createBiquadFilter(); f.type = 'peaking'; f.frequency.value = freq; f.Q.value = q; f.gain.value = gain; return f; }

  impulse(sec, decay) {
    const sr = this.ctx.sampleRate, n = Math.floor(sr * sec), b = this.ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay) * (i < sr * 0.012 ? i / (sr * 0.012) : 1); }
    return b;
  }

  /* ── guitar ── */
  ksBuffer(midi, bright = 0.55) {
    const key = `ks${midi}:${bright}`;
    if (this.buffers.has(key)) return this.buffers.get(key);
    const ctx = this.ctx, sr = ctx.sampleRate, f = midiHz(midi);
    const dur = midi < 50 ? 4.2 : midi < 58 ? 3.6 : 3.0;
    const n = Math.floor(sr * dur), out = new Float32Array(n);
    const D = sr / f - 0.5, iD = Math.floor(D), fr = D - iD;
    // excitation: noise, softened by a one-pole low-pass, with a pick-position comb
    const P = iD + 2, ex = new Float32Array(P);
    let lp = 0; const a = 0.25 + bright * 0.6;
    for (let i = 0; i < P; i++) { lp += a * ((Math.random() * 2 - 1) - lp); ex[i] = lp; }
    const pick = Math.max(1, Math.floor(P * 0.13));
    for (let i = P - 1; i >= pick; i--) ex[i] -= ex[i - pick] * 0.9;
    let peak = 0; for (let i = 0; i < P; i++) peak = Math.max(peak, Math.abs(ex[i]));
    for (let i = 0; i < P; i++) ex[i] /= peak || 1;
    // loss per pass: longer sustain on lower strings
    const g = 0.4985 + (midi < 50 ? 0.00125 : midi < 60 ? 0.0011 : 0.0009);
    for (let i = 0; i < n; i++) {
      if (i < P) { out[i] = ex[i]; continue; }
      const y0 = (1 - fr) * out[i - iD] + fr * out[i - iD - 1];
      const y1 = (1 - fr) * out[i - iD - 1] + fr * (i - iD - 2 >= 0 ? out[i - iD - 2] : 0);
      out[i] = g * (y0 + y1);
    }
    const fade = Math.floor(sr * 0.25);
    for (let i = 0; i < fade; i++) out[n - 1 - i] *= i / fade;
    const b = ctx.createBuffer(1, n, sr); b.copyToChannel(out, 0);
    this.buffers.set(key, b);
    return b;
  }

  // a plucked note; returns a stop() for damping. vel 0..1 sets loudness and brightness; mute damps it like a palm.
  pluck(midi, { when = 0, gain = 0.6, bright = 0.55, pan = 0, vel = null, mute = false } = {}) {
    const ctx = this.ensure(); if (!ctx) return () => {};
    const v = vel == null ? 0.7 : Math.max(0.15, Math.min(1, vel));
    const br = vel == null ? bright : 0.3 + v * 0.55;
    const src = ctx.createBufferSource(); src.buffer = this.ksBuffer(midi, Math.round(br * 10) / 10);
    src.detune.value = (Math.random() - 0.5) * 6;
    const g = ctx.createGain(), t = ctx.currentTime + 0.005 + when, lvl = gain * (vel == null ? 1 : 0.45 + v * 0.75);
    g.gain.setValueAtTime(lvl, t);
    let tail = src;
    if (mute) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900 + v * 600; src.connect(lp); tail = lp; g.gain.setTargetAtTime(0, t + 0.03, 0.09); }
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    tail.connect(g); if (p) { p.pan.value = pan; g.connect(p); p.connect(this.guitarIn); } else g.connect(this.guitarIn);
    src.start(t);
    // the pick leaving the string: a tiny bright click
    const ck = ctx.createBufferSource(); ck.buffer = this.noise(0.6);
    const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 3200; hp.Q.value = 0.8;
    const cg = ctx.createGain(); cg.gain.setValueAtTime(0.06 * v * gain * 2, t); cg.gain.exponentialRampToValueAtTime(0.0005, t + 0.012);
    ck.connect(hp); hp.connect(cg); cg.connect(this.guitarIn); ck.start(t, Math.random() * 0.4); ck.stop(t + 0.02);
    return (after = 0) => { const s = ctx.currentTime + after; g.gain.cancelScheduledValues(s); g.gain.setValueAtTime(g.gain.value, s); g.gain.setTargetAtTime(0, s, 0.03); try { src.stop(s + 0.3); } catch {} };
  }

  /* ── snare ── */
  noise(sec) {
    const key = `noise${sec}`;
    if (this.buffers.has(key)) return this.buffers.get(key);
    const sr = this.ctx.sampleRate, n = Math.floor(sr * sec), b = this.ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.buffers.set(key, b); return b;
  }

  snare({ vel = 0.9, snares = true, rim = false, edge = 0 } = {}) {
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime + 0.004, v = vel;
    const out = ctx.createGain(); out.gain.value = 0.9; out.connect(this.bus);
    // drum tone: two modes that drop in pitch as the head relaxes
    const modes = [[185, 0.55, snares ? 0.16 : 0.32], [330 + edge * 60, 0.35, snares ? 0.09 : 0.22], [510 + edge * 120, 0.12 + edge * 0.18, 0.1 + edge * 0.15]];
    for (const [f, a, dec] of modes) {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(f * 1.12, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a * v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0008, t + dec);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + dec + 0.05);
    }
    // the wires: bright noise; with the snares off, only a short brush of it
    const nz = ctx.createBufferSource(); nz.buffer = this.noise(0.6);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = snares ? 1500 : 3000;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = snares ? 4800 : 6500; bp.Q.value = 0.6;
    const ng = ctx.createGain(); const nd = snares ? 0.26 + v * 0.06 : 0.05;
    ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime((snares ? 0.75 : 0.25) * v, t + 0.0015); ng.gain.exponentialRampToValueAtTime(0.0008, t + nd);
    nz.connect(hp); hp.connect(bp); bp.connect(ng); ng.connect(out); nz.start(t); nz.stop(t + nd + 0.05);
    if (rim) {
      const c = ctx.createBufferSource(); c.buffer = this.noise(0.6);
      const cf = ctx.createBiquadFilter(); cf.type = 'highpass'; cf.frequency.value = 2400;
      const cg = ctx.createGain(); cg.gain.setValueAtTime(1.1 * v, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      c.connect(cf); cf.connect(cg); cg.connect(out); c.start(t); c.stop(t + 0.06);
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 870;
      const og = ctx.createGain(); og.gain.setValueAtTime(0.5 * v, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.1);
    }
  }

  /* ── piano ── */
  pianoBuffer(midi) {
    const key = `pn${midi}`;
    if (this.buffers.has(key)) return this.buffers.get(key);
    const sr = this.ctx.sampleRate, f0 = midiHz(midi);
    const dur = 5.5 - (midi - 48) * 0.08, n = Math.floor(sr * dur), out = new Float32Array(n);
    const B = 0.00018 + (midi < 60 ? 0.0001 : 0.0003);
    const tau0 = 2.6 - (midi - 60) * 0.06;
    for (let k = 1; k <= 14; k++) {
      const fk = k * f0 * Math.sqrt(1 + B * k * k);
      if (fk > sr * 0.45) break;
      const amp = 1 / Math.pow(k, 1.15) * (k === 1 ? 0.8 : 1) * Math.exp(-(k - 1) * 0.08);
      const tau = tau0 / (1 + 0.55 * (k - 1));
      const det = fk * 0.0006, ph = Math.random() * 6.28;
      // two detuned sines and two decays, advanced by running multipliers rather than sin() and exp() per sample
      const w1 = 2 * Math.PI * (fk - det) / sr, w2 = 2 * Math.PI * (fk + det) / sr;
      const c1 = Math.cos(w1), s1 = Math.sin(w1), c2 = Math.cos(w2), s2 = Math.sin(w2);
      let x1 = Math.cos(ph), y1 = Math.sin(ph), x2 = 1, y2 = 0;
      const d1 = Math.exp(-1 / (sr * tau)), d2 = Math.exp(-1 / (sr * tau * 5));
      let e1 = 0.75 * amp * 0.5, e2 = 0.25 * amp * 0.5;
      for (let i = 0; i < n; i++) {
        out[i] += (e1 + e2) * (y1 + y2);
        const nx1 = x1 * c1 - y1 * s1; y1 = x1 * s1 + y1 * c1; x1 = nx1;
        const nx2 = x2 * c2 - y2 * s2; y2 = x2 * s2 + y2 * c2; x2 = nx2;
        e1 *= d1; e2 *= d2;
      }
    }
    // the felt hammer: a short soft thump
    const th = Math.floor(sr * 0.025); let lp = 0;
    for (let i = 0; i < th; i++) { lp += 0.08 * ((Math.random() * 2 - 1) - lp); out[i] += lp * 2.2 * (1 - i / th); }
    for (let i = 0; i < Math.floor(sr * 0.003); i++) out[i] *= i / (sr * 0.003);
    let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
    for (let i = 0; i < n; i++) out[i] /= peak;
    const fade = Math.floor(sr * 0.2);
    for (let i = 0; i < fade; i++) out[n - 1 - i] *= i / fade;
    const b = this.ctx.createBuffer(1, n, sr); b.copyToChannel(out, 0);
    this.buffers.set(key, b); return b;
  }

  piano(midi, vel = 0.8) {
    const ctx = this.ensure(); if (!ctx) return () => {};
    const src = ctx.createBufferSource(); src.buffer = this.pianoBuffer(midi);
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 1800 + vel * 6000;
    const g = ctx.createGain(); g.gain.value = 0.18 + vel * 0.42;
    src.connect(tone); tone.connect(g); g.connect(this.bus);
    src.start(ctx.currentTime + 0.003);
    // the damper falls back onto the string when the key is let go
    return () => { const s = ctx.currentTime; g.gain.cancelScheduledValues(s); g.gain.setValueAtTime(g.gain.value, s); g.gain.setTargetAtTime(0, s, 0.07); src.stop(s + 0.6); };
  }
}
