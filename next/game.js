/* =========================================================================
   Kaitiaki 2040 — a turn-based 3D strategy game for the assembl lab.
   Restore a fictional NZ-inspired island over 8 turns.
   Exports initGame(host). Auto-inits if #gameHost exists.
   Native Three.js via import map ('three'); DOM fallback if WebGL fails.
   A fictional what-if game — not a forecast or real-world prediction.
   ========================================================================= */

/* ---------------- utilities ---------------- */

// Seeded PRNG (mulberry32). All randomness in this module flows through it.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const clamp01 = (v) => clamp(v, 0, 100);

const BEST_KEY = 'kaitiaki2040:best';
const MUTE_KEY = 'kaitiaki2040:muted';

function storageGet(key) {
  try { return window.localStorage.getItem(key); } catch (e) { return null; }
}
function storageSet(key, val) {
  try { window.localStorage.setItem(key, val); } catch (e) { /* private mode etc. */ }
}
function storageDel(key) {
  try { window.localStorage.removeItem(key); } catch (e) { /* ignore */ }
}
function loadBest() {
  // Defensive parse: anything unexpected becomes null.
  try {
    const raw = storageGet(BEST_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object') return null;
    if (typeof v.score !== 'number' || !isFinite(v.score)) return null;
    return { score: Math.round(v.score), outcome: v.outcome === 'victory' ? 'victory' : 'gameover', turns: (v.turns | 0) || 0 };
  } catch (e) { return null; }
}
function loadMuted() { return storageGet(MUTE_KEY) === '1'; }
function saveMuted(m) { storageSet(MUTE_KEY, m ? '1' : '0'); }
function resetSavedData() { storageDel(BEST_KEY); storageDel(MUTE_KEY); }

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/* ---------------- game data ---------------- */

const METRICS = [
  { id: 'biodiversity', icon: '≈', name: 'Biodiversity', goal: 58, dir: 'up' },
  { id: 'community',    icon: '◎', name: 'Community',   goal: 54, dir: 'up' },
  { id: 'resilience',   icon: '◇', name: 'Resilience',  goal: 50, dir: 'up' },
  { id: 'emissions',    icon: '↓', name: 'Emissions',   goal: 38, dir: 'down' },
];

const PROJECTS = [
  {
    id: 'wetlands', key: '1', icon: '≈', name: 'Restore Wetlands', cost: 40,
    desc: 'Raup\u014D marshes soak up storms and shelter native life.',
    fx: { biodiversity: 12, resilience: 8 },
    sys: 'Ongoing: +2 biodiversity each season. Storms hit far softer.',
  },
  {
    id: 'predator', key: '2', icon: '↟', name: 'Predator Control', cost: 25,
    desc: 'Trap lines and fencing so kiwi and t\u016B\u012B can thrive.',
    fx: { biodiversity: 10, community: 3 },
    sys: 'Ongoing: +1 biodiversity each season. +4 bonus now if wetlands exist.',
  },
  {
    id: 'solar', key: '3', icon: '☀', name: 'Solar Microgrid', cost: 50,
    desc: 'Community-owned panels keep the lights on when lines go down.',
    fx: { emissions: -15, resilience: 6 },
    sys: 'Ongoing: \u22122 emissions and +6 funds each season.',
  },
  {
    id: 'enterprise', key: '4', icon: '+', name: 'Local Enterprise', cost: 35,
    desc: 'Kai markets, repair sheds and eco-tours run by locals.',
    fx: { community: 14 },
    sys: 'Ongoing: +10 funds each season. +4 community now if solar exists.',
  },
  {
    id: 'seawall', key: '5', icon: '≋', name: 'Living Seawall', cost: 45,
    desc: 'A reef-edged wall guarding the coast road and homes.',
    fx: { resilience: 18, biodiversity: -3 },
    sys: 'Storms hit far softer. No biodiversity cost if wetlands exist.',
  },
  {
    id: 'bikes', key: '6', icon: '→', name: 'Bike Network', cost: 30,
    desc: 'Safe cycleways link the villages, school and ferry wharf.',
    fx: { emissions: -12, community: 8 },
    sys: 'Ongoing: \u22121 emissions each season.',
  },
];

const MAX_LEVEL = 2;
const REPEAT_SCALE = 0.6;   // second build of the same project has 60% effect
const MAX_TURNS = 8;
const BASE_INCOME = 24;
const START = { biodiversity: 30, community: 35, resilience: 25, emissions: 60, funds: 120 };
// Gentle background pressure each season: the reason standing still loses.
const DECAY = { biodiversity: -2, community: -1, resilience: -1, emissions: 2 };

const GOALS = { biodiversity: 58, community: 54, resilience: 50, emissions: 38 };

const EVENTS = [
  { id: 'storm', w: 3, minTurn: 3 },
  { id: 'grant', w: 2, minTurn: 3 },
  { id: 'heatwave', w: 2, minTurn: 4 },
  { id: 'kokako', w: 1, minTurn: 4 },
  { id: 'ferry', w: 2, minTurn: 3 },
];

/* ---------------- game core (pure logic, renderer-agnostic) ---------------- */

class GameCore {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.reset();
  }

  reset() {
    this.state = 'title';            // title | playing | paused | victory | gameover
    this.turn = 1;
    this.metrics = Object.assign({}, START);
    this.levels = { wetlands: 0, predator: 0, solar: 0, enterprise: 0, seawall: 0, bikes: 0 };
    this.log = [];
    this.rng = mulberry32((this.seed ^ (this.seed << 7) ^ 0x9E3779B9) >>> 0);
    this.lastBuilt = null;
    this.lastEvent = null;
    this.endReason = '';
  }

  start() {
    this.reset();
    this.state = 'playing';
  }

  // Storm soak from wetlands + seawall levels, plus a bonus for high resilience.
  stormSoak() {
    return this.levels.wetlands * 5 + this.levels.seawall * 7 + (this.metrics.resilience >= 50 ? 3 : 0);
  }

  canAfford(i) {
    const p = PROJECTS[i];
    return this.levels[p.id] < MAX_LEVEL && this.metrics.funds >= p.cost;
  }

  // Apply one project choice. Returns { ok, reason, deltas, project }.
  choose(i) {
    if (this.state !== 'playing') return { ok: false, reason: 'not-playing' };
    const p = PROJECTS[i];
    if (!p) return { ok: false, reason: 'bad-project' };
    if (this.levels[p.id] >= MAX_LEVEL) return { ok: false, reason: 'maxed' };
    if (this.metrics.funds < p.cost) return { ok: false, reason: 'funds' };

    const scale = this.levels[p.id] === 0 ? 1 : REPEAT_SCALE;
    const deltas = {};
    const apply = (k, v) => { deltas[k] = (deltas[k] || 0) + v; };

    for (const k in p.fx) apply(k, Math.round(p.fx[k] * scale));

    // Synergies + systemic interplay at build time.
    if (p.id === 'predator' && this.levels.wetlands > 0) apply('biodiversity', Math.round(4 * scale));
    if (p.id === 'enterprise' && this.levels.solar > 0) apply('community', Math.round(4 * scale));
    if (p.id === 'seawall' && this.levels.wetlands > 0 && deltas.biodiversity < 0) deltas.biodiversity = 0; // living edge

    this.metrics.funds -= p.cost;
    deltas.funds = -p.cost;
    for (const k in deltas) {
      if (k === 'funds') continue;
      this.metrics[k] = clamp01(this.metrics[k] + deltas[k]);
    }
    this.levels[p.id]++;
    this.lastBuilt = p.id;

    let msg = (this.levels[p.id] > 1 ? 'Expanded ' : 'Built ') + p.name + ' (\u2212' + p.cost + ' funds).';
    if (p.id === 'predator' && this.levels.wetlands > 0) msg += ' Wetland synergy: birds return faster.';
    if (p.id === 'enterprise' && this.levels.solar > 0) msg += ' Solar-powered workshops hum.';
    if (p.id === 'seawall' && this.levels.wetlands > 0) msg += ' Wetland edge keeps it living.';
    this.addLog(msg, 'good');

    this.resolveTurn();
    return { ok: true, deltas, project: p };
  }

  // End-of-turn: systemic effects, income, pressure, events, end checks.
  resolveTurn() {
    const m = this.metrics, L = this.levels;

    // Systemic ongoing effects.
    if (L.wetlands) m.biodiversity = clamp01(m.biodiversity + 2 * L.wetlands);
    if (L.predator) m.biodiversity = clamp01(m.biodiversity + 1 * L.predator);
    if (L.solar) m.emissions = clamp01(m.emissions - 2 * L.solar);
    if (L.bikes) m.emissions = clamp01(m.emissions - 1 * L.bikes);

    // Income.
    m.funds += BASE_INCOME + 6 * L.solar + 10 * L.enterprise;

    // Background pressure.
    for (const k in DECAY) m[k] = clamp01(m[k] + DECAY[k]);

    // Events from turn 3 onward (seeded, ~45% chance).
    this.lastEvent = null;
    if (this.turn >= 3 && this.rng() < 0.45) this.fireEvent();

    this.turn++;

    if (this.checkCollapse()) return;
    if (this.turn > MAX_TURNS) { this.finishGame(); return; }

    // Safety valve: never soft-lock a player who can't afford anything.
    const anyAffordable = PROJECTS.some((p) => this.levels[p.id] < MAX_LEVEL && this.metrics.funds >= p.cost);
    if (!anyAffordable) {
      m.funds += 12;
      this.addLog('Working bee: locals pitch in. +12 funds.', 'good');
    }
  }

  fireEvent() {
    const m = this.metrics;
    const pool = [];
    for (const ev of EVENTS) {
      if (this.turn < ev.minTurn) continue;
      if (ev.id === 'kokako' && m.biodiversity < 55) continue;
      for (let i = 0; i < ev.w; i++) pool.push(ev.id);
    }
    if (!pool.length) return;
    const id = pool[Math.floor(this.rng() * pool.length) % pool.length];

    if (id === 'storm') {
      const dmg = Math.max(3, 13 - this.stormSoak());
      m.funds = Math.max(0, m.funds - dmg);
      m.community = clamp01(m.community - Math.ceil(dmg / 2));
      m.resilience = clamp01(m.resilience - 1);
      this.addLog(dmg <= 5
        ? '\u26C8\uFE0F Coastal storm — the island held firm. Only ' + dmg + ' funds of damage.'
        : '\u26C8\uFE0F Coastal storm! ' + dmg + ' funds of damage, community shaken.', dmg <= 5 ? 'good' : 'bad');
      this.lastEvent = 'storm';
    } else if (id === 'grant') {
      m.funds += 25; m.community = clamp01(m.community + 2);
      this.addLog('Regional resilience grant: +25 funds.', 'good');
      this.lastEvent = 'grant';
    } else if (id === 'heatwave') {
      const hit = this.levels.wetlands > 0 ? 3 : 6;
      m.biodiversity = clamp01(m.biodiversity - hit);
      m.emissions = clamp01(m.emissions + 3);
      this.addLog('Heatwave: \u2212' + hit + ' biodiversity' + (this.levels.wetlands ? ' (wetlands buffered it)' : '') + ', +3 emissions.', 'bad');
      this.lastEvent = 'heatwave';
    } else if (id === 'kokako') {
      m.biodiversity = clamp01(m.biodiversity + 4);
      m.community = clamp01(m.community + 5);
      this.addLog('K\u014Dkako song returns to the valley! +4 biodiversity, +5 community.', 'good');
      this.lastEvent = 'kokako';
    } else if (id === 'ferry') {
      const hit = this.levels.bikes > 0 ? 3 : 6;
      m.funds = Math.max(0, m.funds - hit);
      this.addLog('\u26F4\uFE0F Ferry disruption: \u2212' + hit + ' funds' + (this.levels.bikes ? ' (bikes carried commuters)' : '') + '.', 'bad');
      this.lastEvent = 'ferry';
    }
  }

  checkCollapse() {
    if (this.metrics.biodiversity <= 0) {
      this.state = 'gameover';
      this.endReason = 'The ecosystem collapsed — with no habitat left, the island fell silent.';
      return true;
    }
    if (this.metrics.community <= 0) {
      this.state = 'gameover';
      this.endReason = 'The community scattered — too many left the island for good.';
      return true;
    }
    return false;
  }

  goalStatus() {
    const m = this.metrics;
    return {
      biodiversity: m.biodiversity >= GOALS.biodiversity,
      community: m.community >= GOALS.community,
      resilience: m.resilience >= GOALS.resilience,
      emissions: m.emissions <= GOALS.emissions,
    };
  }

  finishGame() {
    const g = this.goalStatus();
    if (g.biodiversity && g.community && g.resilience && g.emissions) {
      this.state = 'victory';
      this.endReason = 'The island thrives — a living taonga for 2040 and beyond.';
    } else {
      this.state = 'gameover';
      const miss = [];
      if (!g.biodiversity) miss.push('biodiversity ' + Math.round(this.metrics.biodiversity) + '/' + GOALS.biodiversity);
      if (!g.community) miss.push('community ' + Math.round(this.metrics.community) + '/' + GOALS.community);
      if (!g.resilience) miss.push('resilience ' + Math.round(this.metrics.resilience) + '/' + GOALS.resilience);
      if (!g.emissions) miss.push('emissions ' + Math.round(this.metrics.emissions) + '/' + GOALS.emissions);
      this.endReason = 'Good progress, kaitiaki — but the targets were missed (' + miss.join(', ') + ').';
    }
  }

  score() {
    const m = this.metrics;
    return Math.round(m.biodiversity + m.community + m.resilience + (100 - m.emissions) + m.funds * 0.2);
  }

  addLog(text, kind) {
    this.log.unshift({ turn: this.turn, text, kind: kind || '' });
    if (this.log.length > 6) this.log.length = 6;
  }
}

/* ---------------- audio: Web Audio SFX + adaptive music ----------------
   Context is created lazily on the first user gesture (autoplay-compliant).
   Mute persists in localStorage and is applied to a master gain. */

class AudioEngine {
  constructor(muted) {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.muted = !!muted;
    this.musicMode = null;   // 'title' | 'play' | 'tension'
    this.musicTimer = null;
    this.chordStep = 0;
    this.rng = mulberry32(0xA0D10);
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 1;
        this.master.connect(this.ctx.destination);
        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.value = 0.5;
        this.sfxBus.connect(this.master);
        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = 0.16;
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.4;
        this.musicBus.connect(lp); lp.connect(this.master);
      } catch (e) { this.ctx = null; return false; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return true;
  }

  setMuted(m) {
    this.muted = !!m;
    if (this.ctx && this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(this.muted ? 0 : 1, t, 0.03);
    }
  }

  tone(bus, freq, dur, type, vol, when, glideTo) {
    const c = this.ctx, t = (when != null ? when : c.currentTime);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  noise(dur, vol, freq) {
    const c = this.ctx, t = c.currentTime;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = this.rng() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 400;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxBus);
    src.start(t); src.stop(t + dur);
  }

  sfx(name) {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'click':
        this.tone(this.sfxBus, 660, 0.07, 'triangle', 0.25);
        break;
      case 'build': {
        const seq = [392, 494, 587, 784];
        seq.forEach((f, i) => this.tone(this.sfxBus, f, 0.22, 'triangle', 0.22, t + i * 0.07));
        break;
      }
      case 'error':
        this.tone(this.sfxBus, 220, 0.16, 'square', 0.12, t, 180);
        break;
      case 'turn':
        this.tone(this.sfxBus, 523, 0.12, 'sine', 0.16);
        this.tone(this.sfxBus, 659, 0.14, 'sine', 0.12, t + 0.08);
        break;
      case 'storm':
        this.noise(1.1, 0.3, 260);
        this.tone(this.sfxBus, 90, 1.0, 'sawtooth', 0.1, t, 55);
        break;
      case 'victory': {
        const seq = [523, 659, 784, 1047, 784, 1047];
        seq.forEach((f, i) => this.tone(this.sfxBus, f, 0.3, 'triangle', 0.22, t + i * 0.12));
        break;
      }
      case 'gameover':
        this.tone(this.sfxBus, 330, 0.5, 'sine', 0.2, t, 165);
        this.tone(this.sfxBus, 165, 0.9, 'sine', 0.16, t + 0.4, 110);
        break;
      case 'pause':
        this.tone(this.sfxBus, 440, 0.09, 'sine', 0.14);
        break;
    }
  }

  // Subtle adaptive pad: slow two-oscillator chords, mode picks the colour.
  startMusic(mode) {
    if (!this.ensure()) return;
    if (this.musicMode === mode && this.musicTimer) return;
    this.stopMusic();
    this.musicMode = mode;
    this.chordStep = 0;
    const chords = {
      title:   [[196, 294, 392], [175, 262, 349], [147, 220, 294], [196, 294, 392]],
      play:    [[220, 330, 440], [196, 294, 392], [175, 262, 349], [220, 330, 440]],
      tension: [[175, 262, 311], [147, 220, 262], [165, 247, 330], [147, 220, 262]],
    }[mode] || [[220, 330, 440]];
    const playChord = () => {
      if (!this.ctx) return;
      const chord = chords[this.chordStep % chords.length];
      this.chordStep++;
      const t = this.ctx.currentTime;
      chord.forEach((f) => {
        this.tone(this.musicBus, f, 2.6, 'sine', 0.12, t);
        this.tone(this.musicBus, f * 1.005, 2.6, 'triangle', 0.05, t);
      });
    };
    playChord();
    this.musicTimer = window.setInterval(playChord, 2400);
  }

  stopMusic() {
    if (this.musicTimer) { window.clearInterval(this.musicTimer); this.musicTimer = null; }
    this.musicMode = null;
  }

  dispose() {
    this.stopMusic();
    if (this.ctx) { this.ctx.close().catch(() => {}); this.ctx = null; }
  }
}

/* ---------------- Three.js island scene ----------------
   Deep-plum sea and sky, peach sun, mint life. The island visibly changes
   as projects are built: wetlands, trees, solar panels, seawall, village,
   bike path; biodiversity drives tree and bird counts. */

const PALETTE = {
  plum0: 0x1a0f26, plum1: 0x241431, plum2: 0x33204a, plum3: 0x46306b,
  peach: 0xffb98a, peachHot: 0xff9e7d, sand: 0xe8b58c,
  mint: 0x9df0cd, mintDim: 0x5fbf9d, leaf: 0x4ea877, leafMint: 0x7fd8a8,
  water: 0x3a2352, waterGlow: 0x1c1030, wall: 0x8a7f96,
};

function makeScene3D(THREE, container, reducedMotion) {
  const rng = mulberry32(0xC0FFEE); // fixed layout seed: the island itself is stable
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.plum1);
  scene.fog = new THREE.Fog(PALETTE.plum1, 48, 140);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 320);
  const camBase = new THREE.Vector3(0, 14.5, 24);
  camera.position.copy(camBase);
  camera.lookAt(0, 1.4, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // DPR cap
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // lights
  scene.add(new THREE.HemisphereLight(PALETTE.peach, PALETTE.plum2, 0.85));
  const sun = new THREE.DirectionalLight(PALETTE.peachHot, 1.25);
  sun.position.set(-34, 26, -18);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(PALETTE.mint, 0.35);
  rim.position.set(20, 12, 26);
  scene.add(rim);

  // low peach sun disc on the horizon
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(5, 20, 14),
    new THREE.MeshBasicMaterial({ color: PALETTE.peach, fog: false })
  );
  sunDisc.position.set(-70, 10, -95);
  scene.add(sunDisc);

  // stars
  {
    const n = 220, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = rng() * Math.PI * 2, ph = rng() * Math.PI * 0.45;
      const r = 150;
      pos[i * 3] = Math.cos(th) * Math.cos(ph) * r;
      pos[i * 3 + 1] = Math.sin(ph) * r * 0.7 + 12;
      pos[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({
      color: 0xffe9d6, size: 0.9, sizeAttenuation: false, transparent: true, opacity: 0.6, fog: false,
    })));
  }

  // island height field (shared by terrain, trees, path)
  function heightAt(x, z) {
    const r = Math.sqrt(x * x + z * z);
    if (r > 11) return -0.6;
    const fall = Math.max(0, 1 - (r / 11) * (r / 11));
    let h = 1.15 * fall;
    const d1 = (x - 3.4) * (x - 3.4) + (z + 2.4) * (z + 2.4);
    h += 2.6 * Math.exp(-d1 / 9) * fall;          // solar hill
    const d2 = (x + 4.2) * (x + 4.2) + (z - 3.0) * (z - 3.0);
    h += 1.7 * Math.exp(-d2 / 12) * fall;         // back ridge
    return h;
  }

  // ocean (animated vertices)
  const oceanGeo = new THREE.PlaneGeometry(220, 220, 52, 52);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanBase = oceanGeo.attributes.position.array.slice();
  const ocean = new THREE.Mesh(oceanGeo, new THREE.MeshPhongMaterial({
    color: 0x452a66, emissive: 0x241542, shininess: 110,
    specular: PALETTE.mint, flatShading: true,
  }));
  ocean.position.y = -0.15;
  scene.add(ocean);

  // terrain with vertex colours (mint lowlands -> leafy green -> peach-tinted peaks)
  const terraGeo = new THREE.PlaneGeometry(24, 24, 46, 46);
  terraGeo.rotateX(-Math.PI / 2);
  {
    const p = terraGeo.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const cLow = new THREE.Color(PALETTE.leafMint), cMid = new THREE.Color(PALETTE.leaf), cTop = new THREE.Color(0xc9a06a);
    const tmp = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const h = heightAt(x, z);
      p.setY(i, h);
      const t = clamp(h / 2.8, 0, 1);
      if (t < 0.45) tmp.lerpColors(cLow, cMid, t / 0.45); else tmp.lerpColors(cMid, cTop, (t - 0.45) / 0.55);
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    terraGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terraGeo.computeVertexNormals();
  }
  scene.add(new THREE.Mesh(terraGeo, new THREE.MeshLambertMaterial({ vertexColors: true })));

  // beach ring
  const beach = new THREE.Mesh(
    new THREE.TorusGeometry(10.6, 1.15, 8, 72),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand })
  );
  beach.rotation.x = Math.PI / 2;
  beach.scale.set(1, 1, 0.28);
  beach.position.y = 0.02;
  scene.add(beach);

  const disposables = [oceanGeo, terraGeo, beach.geometry];
  const track = (...objs) => { for (const o of objs) disposables.push(o.geometry ? o.geometry : o); return objs[0]; };

  // ---- trees (biodiversity) ----
  const MAX_TREES = 70;
  const trunkIM = new THREE.InstancedMesh(
    track(new THREE.CylinderGeometry(0.07, 0.11, 0.55, 5)),
    new THREE.MeshLambertMaterial({ color: 0x5a4030 }), MAX_TREES);
  const canopyIM = new THREE.InstancedMesh(
    track(new THREE.ConeGeometry(0.42, 1.15, 6)),
    new THREE.MeshLambertMaterial({ color: PALETTE.leaf }), MAX_TREES);
  {
    const m4 = new THREE.Matrix4();
    let placed = 0, guard = 0;
    while (placed < MAX_TREES && guard++ < 4000) {
      const x = (rng() * 2 - 1) * 9.5, z = (rng() * 2 - 1) * 9.5;
      const h = heightAt(x, z);
      if (h < 0.35 || h > 2.6) continue;
      if (x > 1.4 && x < 5.6 && z > -4.6 && z < 0) continue;  // keep solar hill clear
      const s = 0.75 + rng() * 0.6;
      m4.makeScale(s, s, s).setPosition(x, h + 0.24 * s, z);
      trunkIM.setMatrixAt(placed, m4);
      m4.makeScale(s, s, s).setPosition(x, h + (0.55 + 0.5) * s, z);
      canopyIM.setMatrixAt(placed, m4);
      placed++;
    }
  }
  scene.add(trunkIM, canopyIM);

  // ---- wetlands ----
  const wetGroup = new THREE.Group();
  {
    const wetMat = new THREE.MeshPhongMaterial({ color: 0x3fae9c, emissive: 0x143c34, shininess: 70 });
    const p1 = new THREE.Mesh(track(new THREE.CircleGeometry(2.4, 24)), wetMat);
    p1.rotation.x = -Math.PI / 2; p1.position.set(-5.2, 0.32, -4.2);
    const p2 = new THREE.Mesh(track(new THREE.CircleGeometry(1.7, 20)), wetMat);
    p2.rotation.x = -Math.PI / 2; p2.position.set(-2.2, 0.3, -6.2);
    wetGroup.add(p1, p2);
    const reedIM = new THREE.InstancedMesh(
      track(new THREE.ConeGeometry(0.05, 0.75, 4)),
      new THREE.MeshLambertMaterial({ color: PALETTE.mint }), 64);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 64; i++) {
      const cx = i < 40 ? -5.2 : -2.2, cz = i < 40 ? -4.2 : -6.2, rr = i < 40 ? 2.2 : 1.5;
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * rr;
      const s = 0.7 + rng() * 0.7;
      m4.makeScale(s, s, s).setPosition(cx + Math.cos(a) * r, 0.55, cz + Math.sin(a) * r);
      reedIM.setMatrixAt(i, m4);
    }
    wetGroup.add(reedIM);
    wetGroup.userData = { p1, p2, reedIM };
  }
  scene.add(wetGroup);

  // ---- solar microgrid (on the hill) ----
  const solarGroup = new THREE.Group();
  {
    const panelMat = new THREE.MeshPhongMaterial({
      color: PALETTE.plum1, emissive: PALETTE.mint, emissiveIntensity: 0.28, shininess: 100,
    });
    const panelGeo = track(new THREE.BoxGeometry(0.85, 0.07, 0.6));
    const legGeo = track(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4));
    const legMat = new THREE.MeshLambertMaterial({ color: 0x777788 });
    for (let lvl = 0; lvl < 2; lvl++) {
      const g = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const px = 2.3 + (i % 3) * 1.15 + lvl * 0.55, pz = -3.4 + Math.floor(i / 3) * 1.05 + lvl * 1.15;
        const h = heightAt(px, pz);
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.set(px, h + 0.42, pz);
        panel.rotation.x = -0.5; panel.rotation.y = 0.25;
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(px, h + 0.2, pz);
        g.add(panel, leg);
      }
      g.visible = false;
      solarGroup.add(g);
    }
    // little wind-battery mast
    const mast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.07, 1.6, 5)), legMat);
    const mh = heightAt(4.6, -1.2);
    mast.position.set(4.6, mh + 0.8, -1.2);
    const lamp = new THREE.Mesh(track(new THREE.SphereGeometry(0.12, 8, 6)),
      new THREE.MeshBasicMaterial({ color: PALETTE.mint }));
    lamp.position.set(4.6, mh + 1.65, -1.2);
    mast.visible = lamp.visible = false;
    solarGroup.add(mast, lamp);
    solarGroup.userData = { lamp };
  }
  scene.add(solarGroup);

  // ---- village (enterprise) ----
  const villageGroup = new THREE.Group();
  const villageHouses = [];
  {
    const wallMat = new THREE.MeshLambertMaterial({ color: PALETTE.plum3 });
    const roofMat = new THREE.MeshLambertMaterial({ color: PALETTE.peachHot });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
    const bodyGeo = track(new THREE.BoxGeometry(0.72, 0.5, 0.62));
    const roofGeo = track(new THREE.ConeGeometry(0.58, 0.42, 4));
    const winGeo = track(new THREE.PlaneGeometry(0.16, 0.14));
    const spots = [[-0.6, 4.4], [0.7, 5.1], [-1.7, 5.4], [1.9, 4.2], [-2.8, 4.3], [0.1, 6.4], [2.9, 5.3]];
    spots.forEach(([x, z], i) => {
      const h = heightAt(x, z);
      const house = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, wallMat);
      body.position.y = 0.25;
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 0.68; roof.rotation.y = Math.PI / 4;
      const win = new THREE.Mesh(winGeo, glowMat);
      win.position.set(0.12, 0.26, 0.315);
      house.add(body, roof, win);
      house.position.set(x, h, z);
      house.rotation.y = rng() * Math.PI;
      house.visible = i < 3; // 3 homes to start, more with enterprise
      villageGroup.add(house);
      villageHouses.push(house);
    });
  }
  scene.add(villageGroup);

  // ---- seawall (coast arc facing the open sea) ----
  const wallIM = new THREE.InstancedMesh(
    track(new THREE.BoxGeometry(1.35, 0.7, 0.55)),
    new THREE.MeshLambertMaterial({ color: PALETTE.wall }), 18);
  {
    const m4 = new THREE.Matrix4();
    const e = new THREE.Euler();
    for (let i = 0; i < 18; i++) {
      const a = -1.35 + (i / 17) * 2.7; // seaward arc
      const x = Math.sin(a) * 10.3, z = -Math.cos(a) * 10.3;
      e.set(0, a, 0);
      m4.makeRotationFromEuler(e).setPosition(x, 0.35, z);
      wallIM.setMatrixAt(i, m4);
    }
    wallIM.count = 0;
  }
  scene.add(wallIM);

  // ---- bike network ----
  const bikeGroup = new THREE.Group();
  const bikeDots = [];
  {
    const pts = [];
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const x = Math.cos(a) * 7.4, z = Math.sin(a) * 7.4;
      pts.push(new THREE.Vector3(x, heightAt(x, z) + 0.14, z));
    }
    const pathGeo = track(new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(pts, true), 96, 0.06, 5, true));
    const path = new THREE.Mesh(pathGeo, new THREE.MeshBasicMaterial({ color: PALETTE.mint }));
    bikeGroup.add(path);
    const dotGeo = track(new THREE.SphereGeometry(0.13, 8, 6));
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xfff3e0 });
    for (let i = 0; i < 6; i++) {
      const d = new THREE.Mesh(dotGeo, dotMat);
      d.userData.phase = i / 6;
      bikeDots.push(d);
      bikeGroup.add(d);
    }
    bikeGroup.visible = false;
    bikeGroup.userData.curve = new THREE.CatmullRomCurve3(pts, true);
  }
  scene.add(bikeGroup);

  // ---- clouds ----
  const clouds = [];
  {
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffd9c0, emissive: 0x6b4552, transparent: true, opacity: 0.85,
    });
    const puffGeo = track(new THREE.SphereGeometry(1, 10, 8));
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const puffs = 3 + Math.floor(rng() * 2);
      for (let j = 0; j < puffs; j++) {
        const s = 0.8 + rng() * 1.1;
        const m = new THREE.Mesh(puffGeo, cloudMat);
        m.position.set(j * 1.2 - puffs * 0.5, rng() * 0.5, rng() * 0.8 - 0.4);
        m.scale.set(s, s * 0.55, s * 0.8);
        g.add(m);
      }
      g.position.set((rng() * 2 - 1) * 60, 13 + rng() * 6, -45 + rng() * 45);
      g.userData.speed = 0.35 + rng() * 0.5;
      clouds.push(g);
      scene.add(g);
    }
  }

  // ---- birds (biodiversity) ----
  const birds = [];
  {
    const birdMat = new THREE.MeshBasicMaterial({ color: PALETTE.plum0, side: THREE.DoubleSide });
    const wingGeo = track(new THREE.PlaneGeometry(0.55, 0.2));
    for (let i = 0; i < 10; i++) {
      const b = new THREE.Group();
      const wl = new THREE.Mesh(wingGeo, birdMat);
      const wr = new THREE.Mesh(wingGeo, birdMat);
      wl.position.x = -0.26; wr.position.x = 0.26;
      b.add(wl, wr);
      b.userData = {
        wl, wr,
        r: 11 + rng() * 6, h: 7.5 + rng() * 4.5,
        speed: 0.12 + rng() * 0.12, phase: rng() * Math.PI * 2,
      };
      birds.push(b);
      scene.add(b);
    }
  }

  // ---- particles: build burst + storm rain (one pool each) ----
  function makePoints(n, size, color, opacity) {
    const g = track(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const m = new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    scene.add(p);
    return p;
  }
  const BURST_N = 90;
  const burstPts = makePoints(BURST_N, 0.22, PALETTE.mint, 0);
  const burstVel = new Float32Array(BURST_N * 3);
  let burstLife = 0;
  const RAIN_N = 420;
  const rainPts = makePoints(RAIN_N, 0.14, 0x9dc8f0, 0);
  {
    const p = rainPts.geometry.attributes.position.array;
    for (let i = 0; i < RAIN_N; i++) {
      p[i * 3] = (rng() * 2 - 1) * 16;
      p[i * 3 + 1] = rng() * 16;
      p[i * 3 + 2] = (rng() * 2 - 1) * 16;
    }
  }
  let rainLevel = 0;

  // state mirrored from the core
  let treeTarget = 16, birdTarget = 3;
  let shake = 0, pulse = 0;
  let paused = false, disposed = false;
  let t = 0, last = 0, raf = 0;
  const motion = reducedMotion ? 0.15 : 1;

  function sync(core) {
    const L = core.levels, m = core.metrics;
    treeTarget = clamp(Math.round(8 + m.biodiversity * 0.62), 0, MAX_TREES);
    birdTarget = clamp(Math.round(2 + m.biodiversity * 0.08), 0, 10);
    wetGroup.userData.p1.visible = L.wetlands >= 1;
    wetGroup.userData.p2.visible = L.wetlands >= 2;
    wetGroup.userData.reedIM.count = L.wetlands * 32;
    solarGroup.children[0].visible = L.solar >= 1;
    solarGroup.children[1].visible = L.solar >= 2;
    solarGroup.userData.lamp.visible = L.solar >= 1;
    solarGroup.children[2].visible = L.solar >= 1;
    villageHouses.forEach((h, i) => { h.visible = i < 3 + L.enterprise * 2; });
    wallIM.count = L.seawall * 9;
    bikeGroup.visible = L.bikes >= 1;
    bikeDots.forEach((d, i) => { d.visible = i < L.bikes * 3; });
    // emissions tint the fog: cleaner air -> clearer mint horizon
    const clean = 1 - m.emissions / 100;
    scene.fog.color.setHex(PALETTE.plum1).lerp(new THREE.Color(0x3c3a55), clean * 0.5);
  }

  function burst() {
    if (reducedMotion) return;
    const p = burstPts.geometry.attributes.position.array;
    for (let i = 0; i < BURST_N; i++) {
      const a = rng() * Math.PI * 2, up = rng() * 3.4 + 1.2, sp = 1 + rng() * 2.4;
      p[i * 3] = 0; p[i * 3 + 1] = 1.4; p[i * 3 + 2] = 0;
      burstVel[i * 3] = Math.cos(a) * sp;
      burstVel[i * 3 + 1] = up;
      burstVel[i * 3 + 2] = Math.sin(a) * sp;
    }
    burstPts.geometry.attributes.position.needsUpdate = true;
    burstLife = 1;
    pulse = 0.6;
  }

  function stormPulse() {
    rainLevel = 1;
    if (!reducedMotion) shake = 0.7;
  }

  function tick(ts) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const now = ts * 0.001;
    const dt = Math.min(0.05, last ? now - last : 0.016);
    last = now;
    if (paused) return;
    t += dt;

    // ocean waves
    const op = oceanGeo.attributes.position;
    const amp = 0.22 * motion;
    for (let i = 0; i < op.count; i++) {
      const x = oceanBase[i * 3], z = oceanBase[i * 3 + 2];
      op.setY(i, oceanBase[i * 3 + 1] + amp * (Math.sin(x * 0.22 + t * 1.15) + Math.cos(z * 0.19 + t * 0.85)));
    }
    op.needsUpdate = true;
    oceanGeo.computeVertexNormals();

    // clouds drift
    for (const c of clouds) {
      c.position.x += c.userData.speed * dt * motion;
      if (c.position.x > 75) c.position.x = -75;
    }

    // birds circle and flap
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i], u = b.userData;
      b.visible = i < birdTarget;
      if (!b.visible) continue;
      const a = u.phase + t * u.speed * motion;
      b.position.set(Math.cos(a) * u.r, u.h + Math.sin(t * 0.9 + u.phase) * 0.5 * motion, Math.sin(a) * u.r);
      b.rotation.y = -a;
      const flap = Math.sin(t * 7 + u.phase * 3) * 0.55 * motion;
      u.wl.rotation.y = 0.4 + flap; u.wr.rotation.y = -0.4 - flap;
    }

    // bikes ride the path
    if (bikeGroup.visible) {
      const curve = bikeGroup.userData.curve;
      for (const d of bikeDots) {
        if (!d.visible) continue;
        const u = (d.userData.phase + t * 0.03 * motion) % 1;
        curve.getPointAt(u, d.position);
      }
    }

    // ease trees toward biodiversity target
    const tc = trunkIM.count;
    if (tc !== treeTarget) {
      const next = tc < treeTarget ? Math.min(treeTarget, tc + 1) : Math.max(treeTarget, tc - 1);
      trunkIM.count = next; canopyIM.count = next;
    }

    // build burst particles
    if (burstLife > 0) {
      burstLife -= dt * 0.9;
      const p = burstPts.geometry.attributes.position.array;
      for (let i = 0; i < BURST_N; i++) {
        p[i * 3] += burstVel[i * 3] * dt;
        p[i * 3 + 1] += (burstVel[i * 3 + 1] -= 5.5 * dt) * dt;
        p[i * 3 + 2] += burstVel[i * 3 + 2] * dt;
      }
      burstPts.geometry.attributes.position.needsUpdate = true;
      burstPts.material.opacity = Math.max(0, burstLife);
    } else if (burstPts.material.opacity !== 0) burstPts.material.opacity = 0;

    // storm rain
    if (rainLevel > 0) {
      rainLevel = Math.max(0, rainLevel - dt * 0.35);
      const p = rainPts.geometry.attributes.position.array;
      for (let i = 0; i < RAIN_N; i++) {
        p[i * 3 + 1] -= dt * 13;
        if (p[i * 3 + 1] < 0) p[i * 3 + 1] = 16;
      }
      rainPts.geometry.attributes.position.needsUpdate = true;
      rainPts.material.opacity = rainLevel * 0.75;
    } else if (rainPts.material.opacity !== 0) rainPts.material.opacity = 0;

    // solar lamp blink
    if (solarGroup.userData.lamp.visible) {
      solarGroup.userData.lamp.material.color.setHex(Math.sin(t * 4) > 0 ? PALETTE.mint : PALETTE.plum2);
    }

    // camera: gentle sway, storm shake, build pulse
    shake = Math.max(0, shake - dt * 0.8);
    pulse = Math.max(0, pulse - dt * 1.4);
    const sway = Math.sin(t * 0.07) * 0.06 * motion;
    const sx = shake ? (rng() - 0.5) * shake * 0.9 : 0;
    const sy = shake ? (rng() - 0.5) * shake * 0.6 : 0;
    camera.position.set(
      camBase.x + Math.sin(sway) * 22 * 0.12 + sx,
      camBase.y + sy - pulse * 0.7,
      camBase.z * Math.cos(sway) - pulse * 1.6
    );
    camera.lookAt(0, 1.2, 0);

    renderer.render(scene, camera);
  }

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  const ro = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(container); else window.addEventListener('resize', resize);
  resize();

  raf = requestAnimationFrame(tick);

  return {
    is3D: true,
    sync, burst, stormPulse,
    setPaused(p) { paused = p; if (!p) last = 0; },
    renderOnce() { renderer.render(scene, camera); },
    info() {
      return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((mm) => { for (const k in mm) if (mm[k] && mm[k].isTexture) mm[k].dispose(); mm.dispose(); });
        }
      });
      disposables.forEach((d) => { if (d && d.dispose) d.dispose(); });
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    },
  };
}

/* ---------------- DOM fallback view (WebGL unavailable) ----------------
   A fully playable 2D stand-in: gradient island, project markers, tree count. */

function makeFallbackView(container) {
  const root = el('div', 'kg-fallback');
  const isle = el('div', 'kg-fallback-isle', 'ISLAND');
  const trees = el('div', 'kg-fallback-trees');
  const markers = el('div', 'kg-fallback-markers');
  const note = el('div', 'kg-fallback-note', 'Simple view (3D unavailable) — the full game still plays here.');
  root.append(isle, trees, markers, note);
  container.appendChild(root);

  const markerEls = {};
  return {
    is3D: false,
    sync(core) {
      const L = core.levels;
      const n = clamp(Math.round(core.metrics.biodiversity / 4), 0, 24);
      trees.textContent = n ? '↑ '.repeat(n) : 'few trees remain\u2026';
      for (const p of PROJECTS) {
        if (L[p.id] > 0 && !markerEls[p.id]) {
          const s = el('span', null, p.icon + ' ' + p.name + (L[p.id] > 1 ? ' \u00D7' + L[p.id] : ''));
          markers.appendChild(s);
          markerEls[p.id] = s;
        } else if (markerEls[p.id]) {
          markerEls[p.id].textContent = p.icon + ' ' + p.name + (L[p.id] > 1 ? ' \u00D7' + L[p.id] : '');
        }
      }
      isle.style.opacity = String(0.55 + core.metrics.biodiversity / 220);
    },
    burst() {}, stormPulse() {}, setPaused() {}, renderOnce() {},
    info() { return { calls: 0, triangles: 0 }; },
    dispose() { if (root.parentNode) root.parentNode.removeChild(root); },
  };
}

/* ---------------- UI controller + initGame ---------------- */

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch (e) { return false; }
}

function ensureCss() {
  let href;
  try { href = new URL('game.css', import.meta.url).href; } catch (e) { href = 'game.css'; }
  const links = document.querySelectorAll('link[rel="stylesheet"]');
  for (const l of links) if (l.href === href) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

async function initGame(host) {
  if (!host) throw new Error('initGame: host element required');
  ensureCss();
  host.textContent = '';

  const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const core = new GameCore(((Date.now() & 0xffffff) ^ 0x51AB9) >>> 0);
  const audio = new AudioEngine(loadMuted());

  /* ----- DOM skeleton ----- */
  const root = el('div', 'kg-root');
  root.setAttribute('role', 'application');
  root.setAttribute('aria-label', 'Kaitiaki 2040 — island restoration strategy game');
  const stage = el('div', 'kg-stage');
  const hud = el('div', 'kg-hud');

  const top = el('div', 'kg-top');
  const titleEl = el('div', 'kg-title', 'Kaitiaki 2040');
  const turnEl = el('div', 'kg-turn', 'Turn 1 / ' + MAX_TURNS);
  const fundsEl = el('div', 'kg-funds', '120 funds');
  const muteBtn = el('button', 'kg-iconbtn', audio.muted ? 'OFF' : 'ON');
  muteBtn.title = 'Mute / unmute (persisted)';
  muteBtn.setAttribute('aria-label', 'Toggle sound');
  const pauseBtn = el('button', 'kg-iconbtn', '\u23F8');
  pauseBtn.title = 'Pause (P)';
  pauseBtn.setAttribute('aria-label', 'Pause game');
  top.append(titleEl, turnEl, fundsEl, muteBtn, pauseBtn);

  const metricsEl = el('div', 'kg-metrics');
  const metricRows = {};
  for (const m of METRICS) {
    const row = el('div', 'kg-metric');
    const ico = el('span', 'kg-metric-ico', m.icon);
    const name = el('span', 'kg-metric-name', m.name);
    const bar = el('div', 'kg-metric-bar');
    const fill = el('div', 'kg-metric-fill');
    const val = el('span', 'kg-metric-val', '0');
    bar.appendChild(fill);
    row.append(ico, name, bar, val);
    row.title = m.name + (m.dir === 'up' ? ' \u2014 target ' + m.goal + '+' : ' \u2014 target ' + m.goal + ' or less');
    metricsEl.appendChild(row);
    metricRows[m.id] = { row, fill, val };
  }

  const coach = el('div', 'kg-coach');
  coach.innerHTML = 'You are the <b>kaitiaki</b> (guardian). Each season, pick <b>one project</b> — keys <b>1\u20136</b> or tap a card. ' +
    'Mix nature, people and preparation: hit every target by season 8.';
  coach.hidden = true;

  const logEl = el('div', 'kg-log');

  const projectsEl = el('div', 'kg-projects');
  const cards = PROJECTS.map((p, i) => {
    const card = el('button', 'kg-card');
    card.type = 'button';
    const cardTop = el('div', 'kg-card-top');
    cardTop.append(el('span', 'kg-card-ico', p.icon), el('span', 'kg-card-key', p.key));
    const pips = el('span', 'kg-card-pips');
    pips.append(el('i'), el('i'));
    cardTop.appendChild(pips);
    card.append(
      cardTop,
      el('div', 'kg-card-name', p.name),
      el('div', 'kg-card-cost', p.cost + ' funds'),
      el('div', 'kg-card-desc', p.desc)
    );
    card.title = p.sys;
    card.addEventListener('click', () => doChoose(i));
    projectsEl.appendChild(card);
    return { card, pips: pips.children };
  });

  hud.append(top, metricsEl, coach, logEl, projectsEl);

  const overlay = el('div', 'kg-overlay');
  const panel = el('div', 'kg-panel');
  overlay.appendChild(panel);

  root.append(stage, hud, overlay);
  host.appendChild(root);

  /* ----- view: 3D or DOM fallback ----- */
  let view;
  try {
    if (!webglAvailable()) throw new Error('WebGL unavailable');
    const THREE = await import('three');
    view = makeScene3D(THREE, stage, reducedMotion);
  } catch (e) {
    view = makeFallbackView(stage);
  }

  /* ----- HUD updates ----- */
  function updateHUD(flashMetric) {
    turnEl.textContent = core.state === 'playing' || core.state === 'paused'
      ? 'Season ' + Math.min(core.turn, MAX_TURNS) + ' / ' + MAX_TURNS
      : 'Season \u2014 / ' + MAX_TURNS;
    fundsEl.textContent = Math.round(core.metrics.funds) + ' funds';
    for (const m of METRICS) {
      const v = Math.round(core.metrics[m.id]);
      const r = metricRows[m.id];
      r.fill.style.width = clamp(v, 0, 100) + '%';
      r.val.textContent = String(v);
      const danger = m.dir === 'up' ? v < 20 : v > 78;
      r.row.dataset.low = danger ? '1' : '0';
      if (flashMetric === m.id) {
        r.val.classList.remove('kg-metric-flash');
        void r.val.offsetWidth;
        r.val.classList.add('kg-metric-flash');
      }
    }
    cards.forEach((c, i) => {
      const lvl = core.levels[PROJECTS[i].id];
      c.pips[0].className = lvl >= 1 ? 'kg-pip-on' : '';
      c.pips[1].className = lvl >= 2 ? 'kg-pip-on' : '';
      c.card.disabled = core.state !== 'playing' || !core.canAfford(i);
    });
    renderLog();
    // adaptive music colour
    if (core.state === 'playing' && !audio.muted) {
      const tense = core.metrics.resilience < 30 || core.metrics.emissions > 75;
      audio.startMusic(tense ? 'tension' : 'play');
    }
  }

  function renderLog() {
    logEl.textContent = '';
    for (const entry of core.log.slice(0, 4)) {
      const line = el('div', 'kg-log-line' + (entry.kind ? ' kg-log-' + entry.kind : ''), entry.text);
      logEl.appendChild(line);
    }
  }

  function flash(kind) {
    root.classList.remove('kg-flash-good', 'kg-flash-bad');
    void root.offsetWidth;
    root.classList.add(kind === 'bad' ? 'kg-flash-bad' : 'kg-flash-good');
  }

  /* ----- overlay screens ----- */
  function goalsGrid() {
    const g = el('div', 'kg-goals');
    g.append(
      el('span', null, ''), // replaced below
    );
    g.textContent = '';
    const items = [
      ['Biodiversity', GOALS.biodiversity + '+'],
      ['Community', GOALS.community + '+'],
      ['Resilience', GOALS.resilience + '+'],
      ['\u2601\uFE0F Emissions', GOALS.emissions + ' or less'],
    ];
    for (const [k, v] of items) {
      const s = el('span');
      s.append(document.createTextNode(k + ': '), Object.assign(el('b'), { textContent: v }));
      g.appendChild(s);
    }
    return g;
  }

  function bestLine() {
    const b = loadBest();
    const d = el('p', 'kg-best');
    d.textContent = b
      ? 'Best restoration so far: score ' + b.score + (b.outcome === 'victory' ? ' (island thriving)' : '') + '.'
      : 'No saved restoration yet — this browser keeps your best score only.';
    return d;
  }

  function resetDataButton() {
    const b = el('button', 'kg-resetdata', 'Reset saved data (best score & sound setting)');
    b.type = 'button';
    b.addEventListener('click', () => {
      resetSavedData();
      audio.setMuted(false);
      muteBtn.textContent = 'ON';
      b.textContent = 'Saved data cleared.';
    });
    return b;
  }

  function showTitle() {
    panel.textContent = '';
    panel.append(
      (() => { const h = el('h1', null, 'Kaitiaki 2040'); return h; })(),
      (() => {
        const p = el('p', 'kg-sub');
        p.innerHTML = 'A stormier future is coming to this island. Over <b>8 seasons</b>, choose projects that let ' +
          'nature and community thrive together. If any target is missed when the eighth season ends, the island falls short.';
        return p;
      })(),
      goalsGrid()
    );
    const start = el('button', 'kg-btn', 'Begin the restoration');
    start.type = 'button';
    start.addEventListener('click', startGame);
    const row = el('div', 'kg-btnrow');
    row.appendChild(start);
    panel.append(row, bestLine());
    const keys = el('p', 'kg-keys');
    keys.innerHTML = '<kbd>Space</kbd> start \u00B7 <kbd>1</kbd>\u2013<kbd>6</kbd> choose a project \u00B7 <kbd>P</kbd> pause \u00B7 <kbd>R</kbd> restart';
    panel.append(keys, resetDataButton(),
      el('p', 'kg-fineprint', 'A fictional what-if game about choices and trade-offs \u2014 not a forecast or real-world prediction. Progress is stored only in this browser.'));
    overlay.hidden = false;
  }

  function showPaused() {
    panel.textContent = '';
    panel.append(el('h2', null, 'Paused'), el('p', 'kg-sub', 'The island waits.'));
    const resume = el('button', 'kg-btn', 'Resume');
    resume.type = 'button';
    resume.addEventListener('click', resumeGame);
    const restart = el('button', 'kg-btn kg-btn-ghost', 'Restart');
    restart.type = 'button';
    restart.addEventListener('click', restartGame);
    const row = el('div', 'kg-btnrow');
    row.append(resume, restart);
    panel.append(row);
    overlay.hidden = false;
  }

  function showEnd() {
    const won = core.state === 'victory';
    panel.textContent = '';
    const h = el('h2', won ? 'kg-win' : 'kg-lose', won ? 'The island thrives' : 'The island falls short');
    const score = core.score();
    const prev = loadBest();
    if (!prev || score > prev.score) {
      storageSet(BEST_KEY, JSON.stringify({ score, outcome: core.state, turns: Math.min(core.turn - 1, MAX_TURNS) }));
    }
    const sc = el('p', 'kg-score');
    sc.append(document.createTextNode('Restoration score: '), Object.assign(el('b'), { textContent: String(score) }));
    const stats = el('div', 'kg-endstats');
    const g = core.goalStatus();
    for (const m of METRICS) {
      const d = el('div', g[m.id] ? 'kg-met' : 'kg-miss');
      d.append(document.createTextNode(m.name), Object.assign(el('b'), { textContent: String(Math.round(core.metrics[m.id])) }));
      stats.appendChild(d);
    }
    const fd = el('div', 'kg-met');
    fd.append(document.createTextNode('Funds left'), Object.assign(el('b'), { textContent: String(Math.round(core.metrics.funds)) }));
    stats.appendChild(fd);
    const again = el('button', 'kg-btn', 'Play again');
    again.type = 'button';
    again.addEventListener('click', restartGame);
    const menu = el('button', 'kg-btn kg-btn-ghost', 'Back to title');
    menu.type = 'button';
    menu.addEventListener('click', () => { core.reset(); view.sync(core); updateHUD(); showTitle(); });
    const row = el('div', 'kg-btnrow');
    row.append(again, menu);
    panel.append(h, el('p', 'kg-sub', core.endReason), stats, sc, bestLine(), row);
    overlay.hidden = false;
  }

  /* ----- state transitions ----- */
  function updateScenePause() {
    view.setPaused(core.state === 'paused' || document.hidden);
  }

  function startGame() {
    audio.ensure();
    core.start();
    overlay.hidden = true;
    coach.hidden = false;
    audio.sfx('click');
    audio.startMusic('play');
    view.sync(core);
    view.renderOnce && view.renderOnce();
    updateHUD();
    updateScenePause();
  }

  function restartGame() {
    core.seed = ((Date.now() & 0xffffff) ^ 0x77C3) >>> 0; // fresh events each run
    startGame();
  }

  function pauseGame() {
    if (core.state !== 'playing') return;
    core.state = 'paused';
    audio.sfx('pause');
    showPaused();
    updateHUD();
    updateScenePause();
  }

  function resumeGame() {
    if (core.state !== 'paused') return;
    core.state = 'playing';
    overlay.hidden = true;
    audio.sfx('click');
    updateHUD();
    updateScenePause();
  }

  function doChoose(i) {
    if (core.state !== 'playing') return;
    const res = core.choose(i);
    if (!res.ok) {
      audio.sfx('error');
      if (res.reason === 'funds') addLogLine('Not enough funds for ' + PROJECTS[i].name + '.');
      return;
    }
    coach.hidden = true;
    audio.sfx('build');
    window.setTimeout(() => audio.sfx('turn'), 260);
    cards[i].card.classList.remove('kg-card-picked');
    void cards[i].card.offsetWidth;
    cards[i].card.classList.add('kg-card-picked');
    view.sync(core);
    view.burst();
    flash('good');
    if (core.lastEvent === 'storm') {
      view.stormPulse();
      audio.sfx('storm');
      window.setTimeout(() => flash('bad'), 420);
    } else if (core.lastEvent === 'heatwave') {
      window.setTimeout(() => flash('bad'), 420);
    }
    updateHUD(res.project.id === 'wetlands' ? 'biodiversity' : undefined);
    if (core.state === 'victory' || core.state === 'gameover') {
      audio.stopMusic();
      audio.sfx(core.state === 'victory' ? 'victory' : 'gameover');
      showEnd();
    }
  }

  function addLogLine(text) {
    core.addLog(text, 'bad');
    renderLog();
  }

  function toggleMute() {
    audio.setMuted(!audio.muted);
    saveMuted(audio.muted);
    muteBtn.textContent = audio.muted ? 'OFF' : 'ON';
    if (!audio.muted && core.state === 'playing') audio.startMusic('play');
  }

  /* ----- events ----- */
  muteBtn.addEventListener('click', () => { audio.ensure(); toggleMute(); });
  pauseBtn.addEventListener('click', () => {
    if (core.state === 'playing') pauseGame();
    else if (core.state === 'paused') resumeGame();
  });

  function onKey(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const k = e.key;
    if (k === ' ' || k === 'Spacebar') {
      e.preventDefault();
      if (core.state === 'title') startGame();
      else if (core.state === 'paused') resumeGame();
    } else if (k === 'p' || k === 'P') {
      if (core.state === 'playing') pauseGame();
      else if (core.state === 'paused') resumeGame();
    } else if (k === 'r' || k === 'R') {
      if (core.state !== 'title') restartGame();
    } else if (k >= '1' && k <= '6') {
      doChoose(k.charCodeAt(0) - 49);
    }
  }
  window.addEventListener('keydown', onKey);

  function onVis() {
    if (document.hidden && core.state === 'playing') pauseGame();
    updateScenePause();
  }
  document.addEventListener('visibilitychange', onVis);

  let destroyed = false;
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVis);
    view.dispose();
    audio.dispose();
  }
  window.addEventListener('pagehide', destroy, { once: true });

  /* ----- verification hooks ----- */
  window.__gameProbe = () => ({
    state: core.state,
    turn: core.turn,
    metrics: Object.assign({}, core.metrics),
    renderer: view.info(),
  });

  /* ----- boot into title ----- */
  view.sync(core);
  updateHUD();
  showTitle();
  updateScenePause();
  window.__GAME_READY__ = true;

  return { destroy, core };
}

/* ---------------- auto-init ---------------- */
if (typeof document !== 'undefined') {
  const boot = () => {
    const h = document.getElementById('gameHost');
    if (h && !h.dataset.kgInit) {
      h.dataset.kgInit = '1';
      initGame(h).catch(() => { window.__GAME_READY__ = true; });
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}

export { initGame };
