// assembl lab · play the amp: a British-style valve head on a 4×12 slant cabinet, modelled in code in metres.
// No maker's marks: the script on the head is assembl's own. Instrument space: x across, y up, z towards the player.
// Six knobs turn (drag them up or down) and really shape the sound; the valves glow with the signal; the four
// speakers behind the grille move with the actual output.
import { H, THREE, V } from './engine.js';

export const KNOBS = ['presence', 'bass', 'middle', 'treble', 'master', 'gain'];
const KNOB_X = [-0.17, -0.09, -0.01, 0.07, 0.15, 0.23];
const CAB_W = 0.76, CAB_H = 0.76, CAB_D = 0.36, SLANT_Y = 0.38, SLANT_Z = 0.12;
const HEAD = { y0: 0.776, y1: 1.036, z0: -0.095, z1: 0.115, w: 0.75 };
const PANEL_Y = 0.818;

function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8; return t;
}
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
const rbox = (w, h, d, r, mat, x, y, z) => {
  const s = new THREE.Shape(); const W = w / 2 - r, Hh = h / 2 - r;
  s.moveTo(-W, -h / 2); s.lineTo(W, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -Hh); s.lineTo(w / 2, Hh); s.quadraticCurveTo(w / 2, h / 2, W, h / 2);
  s.lineTo(-W, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, Hh); s.lineTo(-w / 2, -Hh); s.quadraticCurveTo(-w / 2, -h / 2, -W, -h / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - r, bevelEnabled: true, bevelThickness: r / 2, bevelSize: r / 2, bevelSegments: 3, curveSegments: 6 }); g.translate(0, 0, -(d - r) / 2);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); return m;
};
// a side profile [(z, y)…] extruded across x
function profileX(pts, w, mat) {
  const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(w / 2, 0, 0);
  return new THREE.Mesh(g, mat);
}
// cream piping round a rectangle (in a plane given by its corners)
function piping(corners, r, mat) {
  const c = new THREE.CatmullRomCurve3(corners, true, 'catmullrom', 0.02);
  return new THREE.Mesh(new THREE.TubeGeometry(c, 120, r, 8, true), mat);
}

export default {
  id: 'amp', code: 'AM',
  title: 'Valve amp.',
  eyebrow: 'assembl lab / music',
  line: 'A valve head on a 4×12 cabinet. Turn it up.',
  bar: 'Amp',
  size: 2.4,
  cats: [{ id: 'head', name: 'Head' }, { id: 'cab', name: 'Cabinet' }, { id: 'speakers', name: 'Speakers' }, { id: 'valves', name: 'Valves' }],
  root: { rotation: new THREE.Euler(0, 0, 0), lift: 0.0 },
  cam: { dir: V(0.62, 0.42, 1.0), homeFit: 0.9, play: { target: V(0, 0.55, 0), radius: 0.68, dir: V(0.62, 0.42, 1.0) } },
  truth: 'Modelled in code; not a scan, no maker\'s marks. Sound: synthesised in your browser.',
  stats: () => ['Valve head · 4×12 cabinet', '6 knobs, 4 speakers'],

  build(api, studio) {
    const { part } = api;
    const tolexTex = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 26000; i++) { const v = 90 + rnd() * 90; g.fillStyle = `rgb(${v},${v},${v})`; const r = 0.8 + rnd() * 2.2; g.beginPath(); g.arc(rnd() * w, rnd() * h, r, 0, 6.29); g.fill(); }
    }, [6, 6]);
    const weave = (dark, thread, rep) => canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = dark; g.fillRect(0, 0, w, h);
      const n = 16, s = w / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const horiz = (Math.floor(i / 2) + Math.floor(j / 2)) % 2 === 0;
        const gr = g.createLinearGradient(i * s, j * s, horiz ? i * s : (i + 1) * s, horiz ? (j + 1) * s : j * s);
        gr.addColorStop(0, dark); gr.addColorStop(0.5, thread); gr.addColorStop(1, dark);
        g.fillStyle = gr; g.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
      }
    }, rep);
    const panelTex = canvasTex(2048, 220, (g, w, h) => {
      // brushed gold, with the knob names
      g.fillStyle = '#c9a14e'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1400; i++) { const y = rnd() * h; g.fillStyle = `rgba(${rnd() > 0.5 ? '255,236,180' : '120,86,30'},${0.05 + rnd() * 0.08})`; g.fillRect(0, y, w, 1); }
      g.fillStyle = '#1a1412'; g.font = '600 34px "IBM Plex Mono", ui-monospace, monospace'; g.textAlign = 'center';
      const xs = (x) => (x / 0.72 + 0.5) * w;
      KNOBS.forEach((k, i) => g.fillText(k.toUpperCase(), xs(KNOB_X[i]), 52));
      g.fillText('INPUT', xs(-0.295), 52); g.fillText('STANDBY', xs(0.282), 52); g.fillText('POWER', xs(0.322), 52);
      g.font = '500 26px "IBM Plex Mono", ui-monospace, monospace';
      for (let i = 0; i < 6; i++) for (let v = 0; v <= 10; v += 2) {
        const a = (-135 + v * 27) * Math.PI / 180, cx = xs(KNOB_X[i]), cy = 140, r = 64;
        g.fillRect(cx + Math.sin(a) * r - 1.5, cy - Math.cos(a) * r - 6, 3, 10);
      }
    });
    panelTex.wrapS = panelTex.wrapT = THREE.ClampToEdgeWrapping; panelTex.repeat.set(1, 1); panelTex.colorSpace = THREE.SRGBColorSpace;
    const M = {
      tolex: new THREE.MeshPhysicalMaterial({ color: '#141213', roughness: 0.72, bumpMap: tolexTex, bumpScale: 0.6, sheen: 0.3, sheenColor: new THREE.Color('#3a3335') }),
      grille: new THREE.MeshStandardMaterial({ map: weave('#16110f', '#5a4a3a', [10, 10]), roughness: 0.95, transparent: true, opacity: 1 }),
      grilleHead: new THREE.MeshStandardMaterial({ map: weave('#16110f', '#5a4a3a', [10, 2.4]), roughness: 0.95 }),
      piping: new THREE.MeshPhysicalMaterial({ color: '#efe8da', roughness: 0.4, clearcoat: 0.6 }),
      panel: new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: panelTex, metalness: 0.75, roughness: 0.32, clearcoat: 0.4 }),
      knobGold: new THREE.MeshStandardMaterial({ color: '#d8b465', metalness: 1, roughness: 0.25 }),
      knobBlack: new THREE.MeshPhysicalMaterial({ color: '#121012', roughness: 0.35, clearcoat: 0.8 }),
      chrome: new THREE.MeshStandardMaterial({ color: '#e2e2e0', metalness: 1, roughness: 0.15 }),
      plastic: new THREE.MeshStandardMaterial({ color: '#191718', roughness: 0.5 }),
      jewel: new THREE.MeshPhysicalMaterial({ color: '#b3122a', roughness: 0.15, transmission: 0.2, emissive: new THREE.Color('#ff2a3c'), emissiveIntensity: 0.6 }),
      chassis: new THREE.MeshStandardMaterial({ color: '#8d8f93', metalness: 0.8, roughness: 0.4 }),
      glass: new THREE.MeshPhysicalMaterial({ color: '#e9d9c4', roughness: 0.06, transmission: 0.7, thickness: 0.002, transparent: true, opacity: 0.3, depthWrite: false }),
      plate: new THREE.MeshStandardMaterial({ color: '#3b3a3d', metalness: 0.7, roughness: 0.35 }),
      glow: new THREE.MeshStandardMaterial({ color: '#ff9a4a', emissive: new THREE.Color('#ff6a1a'), emissiveIntensity: 0.6 }),
      cone: new THREE.MeshStandardMaterial({ color: '#2b2827', roughness: 0.92, side: THREE.DoubleSide }),
      cap: new THREE.MeshStandardMaterial({ color: '#3a3533', roughness: 0.6 }),
      basket: new THREE.MeshStandardMaterial({ color: '#5d5f63', metalness: 0.8, roughness: 0.4 }),
      magnet: new THREE.MeshStandardMaterial({ color: '#2a2b2e', metalness: 0.6, roughness: 0.35 }),
      baffle: new THREE.MeshStandardMaterial({ color: '#0d0c0c', roughness: 1 }),
    };
    // these change while playing, so each keeps one shared material instead of the studio's per-part copy
    M.grille.userData.unique = true; M.jewel.userData.unique = true;
    const g = (...m) => { const o = new THREE.Group(); m.forEach((x) => o.add(x)); return o; };

    /* ── cabinet: a slant 4×12 ── */
    const prof = [[-CAB_D / 2, 0], [CAB_D / 2, 0], [CAB_D / 2, SLANT_Y], [SLANT_Z, CAB_H], [-CAB_D / 2, CAB_H]];
    // built like the real thing: two side panels cut to the slant, a top, a bottom and a back; the front is open for the baffle
    const T = 0.018;
    const sidesC = [-1, 1].map((sx) => { const m = profileX(prof, T, M.tolex); m.position.x = sx * (CAB_W / 2 - T / 2); return m; });
    const topC = box(CAB_W, T, CAB_D / 2 + SLANT_Z, M.tolex, 0, CAB_H - T / 2, (SLANT_Z - CAB_D / 2) / 2);
    const botC = box(CAB_W, T, CAB_D, M.tolex, 0, T / 2, 0);
    const backC = box(CAB_W, CAB_H, T, M.tolex, 0, CAB_H / 2, -CAB_D / 2 + T / 2);
    const lining = box(CAB_W - 2 * T, CAB_H - 2 * T, 0.002, M.baffle, 0, CAB_H / 2, -CAB_D / 2 + T + 0.001);
    const shell = g(...sidesC, topC, botC, backC, lining);
    const corners = [];
    for (const sx of [-1, 1]) for (const [z, y] of [[CAB_D / 2, 0.02], [-CAB_D / 2, 0.02], [SLANT_Z, CAB_H - 0.02], [-CAB_D / 2, CAB_H - 0.02]]) corners.push(rbox(0.06, 0.06, 0.06, 0.012, M.plastic, sx * (CAB_W / 2 - 0.022), y + (y < 0.1 ? 0.012 : -0.012), z + (z > 0 ? -0.012 : 0.012)));
    const handles = [-1, 1].map((s) => g(box(0.02, 0.06, 0.2, M.chrome, s * (CAB_W / 2 + 0.006), 0.5, 0), box(0.026, 0.024, 0.15, M.plastic, s * (CAB_W / 2 + 0.014), 0.5, 0)));
    part({ id: 'cab', name: 'Cabinet', cat: 'cab', obj: g(shell, ...corners, ...handles),
      desc: 'A closed box of birch ply, covered in textured vinyl. Closed-back cabinets give the tight, thumping low end; the slanted top half points two speakers up at your ears.',
      spec: 'Birch ply · 4 × 12" · closed back · about 40 kg', role: 'Holds the speakers and shapes the bass.' });
    // front faces: lower vertical and upper slanted
    const lowerN = V(0, 0, 1), upperN = V(0, CAB_D / 2 - SLANT_Z, CAB_H - SLANT_Y).normalize();
    const lowerC = V(0, SLANT_Y / 2 + 0.02, CAB_D / 2 + 0.001), upperC = V(0, (SLANT_Y + CAB_H) / 2 - 0.01, (CAB_D / 2 + SLANT_Z) / 2 + 0.001);
    const upperLen = Math.hypot(CAB_H - SLANT_Y, CAB_D / 2 - SLANT_Z);
    const face = (h, c, n, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(CAB_W - 0.07, h), mat); m.position.copy(c); m.quaternion.setFromUnitVectors(V(0, 0, 1), n); return m; };
    const grilleLow = face(SLANT_Y - 0.06, lowerC, lowerN, M.grille), grilleUp = face(upperLen - 0.06, upperC, upperN, M.grille);
    const pip = piping([V(-CAB_W / 2 + 0.035, 0.035, CAB_D / 2 + 0.004), V(CAB_W / 2 - 0.035, 0.035, CAB_D / 2 + 0.004), V(CAB_W / 2 - 0.035, SLANT_Y, CAB_D / 2 + 0.004),
      V(CAB_W / 2 - 0.035, CAB_H - 0.035, SLANT_Z + 0.004 + 0.012), V(-CAB_W / 2 + 0.035, CAB_H - 0.035, SLANT_Z + 0.016), V(-CAB_W / 2 + 0.035, SLANT_Y, CAB_D / 2 + 0.004)], 0.0035, M.piping);
    part({ id: 'grille', name: 'Grille cloth', cat: 'cab', obj: g(grilleLow, grilleUp, pip),
      desc: 'A loose basket weave stretched over the front: it lets the sound straight through and keeps fingers off the cones. The cream piping hides the joins.',
      spec: 'Woven vinyl cloth · cream piping', role: 'Protects the speakers.' });
    const baffleFace = (h, c, n) => {
      const sh = new THREE.Shape([new THREE.Vector2(-(CAB_W / 2 - T), -h / 2), new THREE.Vector2(CAB_W / 2 - T, -h / 2), new THREE.Vector2(CAB_W / 2 - T, h / 2), new THREE.Vector2(-(CAB_W / 2 - T), h / 2)]);
      for (const col of [-1, 1]) { const p = new THREE.Path(); p.absarc(col * 0.178, 0, 0.142, 0, Math.PI * 2, true); sh.holes.push(p); }
      const geo = new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false, curveSegments: 48 }); geo.translate(0, 0, -T);
      const m = new THREE.Mesh(geo, M.baffle); m.quaternion.setFromUnitVectors(V(0, 0, 1), n); m.position.copy(c).addScaledVector(n, -0.024); return m;
    };
    const baffleLow = baffleFace(SLANT_Y - T, V(0, (SLANT_Y + T) / 2, CAB_D / 2), lowerN), baffleUp = baffleFace(upperLen - 0.02, upperC.clone().add(V(0, 0, -0.001)), upperN);
    /* ── four 12-inch speakers ── */
    const speakers = [];
    const speaker = () => {
      const o = new THREE.Group(), r = 0.148;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 8, 64), M.basket); o.add(ring);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; o.add(H.rod(V(Math.cos(a) * r, Math.sin(a) * r, 0), V(Math.cos(a) * 0.05, Math.sin(a) * 0.05, -0.1), 0.004, M.basket, 6)); }
      const mag = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.05, 32), M.magnet); mag.rotation.x = Math.PI / 2; mag.position.z = -0.12; o.add(mag);
      const moving = new THREE.Group();
      const cone = new THREE.Mesh(new THREE.LatheGeometry([[0.034, -0.062], [0.06, -0.05], [0.1, -0.03], [0.134, -0.008]].map(([x, y]) => new THREE.Vector2(x, y)), 48), M.cone); cone.rotation.x = Math.PI / 2; moving.add(cone);
      const sur = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.007, 8, 64), M.cap); sur.position.z = -0.004; moving.add(sur);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.04, 24, 12, 0, Math.PI * 2, 0, 0.9), M.cap); cap.rotation.x = Math.PI / 2; cap.position.z = -0.086; moving.add(cap);
      o.add(moving); o.userData.moving = moving;
      return o;
    };
    const spkPos = [];
    for (const row of [0, 1]) for (const col of [-1, 1]) {
      const s = speaker(), n = row ? upperN : lowerN, c = row ? upperC : V(0, (SLANT_Y + T) / 2, CAB_D / 2);
      s.position.copy(c).add(V(col * 0.178, 0, 0)).addScaledVector(n, -0.044); s.quaternion.setFromUnitVectors(V(0, 0, 1), n);
      speakers.push(s); spkPos.push(s.position.clone());
    }
    part({ id: 'speakers', name: 'Speakers', cat: 'speakers', obj: g(baffleLow, baffleUp, ...speakers),
      desc: 'Four 12-inch paper cones, each driven by a coil in a magnet\'s gap. The signal pushes the coil in and out and the cone pushes the air. Watch them move with every chord.',
      spec: '4 × 12" · 16 Ω each · ceramic magnets', role: 'Turn the signal into sound.' });

    /* ── the head ── */
    const hw = HEAD.w, hy = (HEAD.y0 + HEAD.y1) / 2, hh = HEAD.y1 - HEAD.y0, hz = (HEAD.z0 + HEAD.z1) / 2, hd = HEAD.z1 - HEAD.z0;
    const top = box(hw, 0.018, hd, M.tolex, 0, HEAD.y1 - 0.009, hz), bot = box(hw, 0.018, hd, M.tolex, 0, HEAD.y0 + 0.009, hz);
    const sides = [-1, 1].map((s) => box(0.018, hh, hd, M.tolex, s * (hw / 2 - 0.009), hy, hz));
    const hCorners = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) hCorners.push(rbox(0.046, 0.046, 0.046, 0.01, M.plastic, sx * (hw / 2 - 0.016), hy + sy * (hh / 2 - 0.016), hz + sz * (hd / 2 - 0.016)));
    const feet = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.016, 16), M.plastic))).map((m, i) => { m.position.set((i < 2 ? -1 : 1) * 0.3, HEAD.y0 - 0.008, hz + (i % 2 ? 1 : -1) * 0.07); return m; });
    const strap = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.13, HEAD.y1, hz), V(-0.1, HEAD.y1 + 0.03, hz), V(0.1, HEAD.y1 + 0.03, hz), V(0.13, HEAD.y1, hz)]), 30, 0.011, 8), M.plastic);
    strap.scale.z = 1; const caps = [-1, 1].map((s) => box(0.03, 0.01, 0.04, M.chrome, s * 0.13, HEAD.y1 + 0.004, hz));
    part({ id: 'head', name: 'Amp head', cat: 'head', obj: g(top, bot, ...sides, ...hCorners, ...feet, strap, ...caps),
      desc: 'The amplifier itself, in its own box so it can sit on any cabinet. Inside: the preamp that shapes and drives the signal, and the power amp that drives the speakers.',
      spec: '100 W valve head · textured vinyl · strap handle', role: 'Makes the signal big.' });
    const hgr = new THREE.Mesh(new THREE.PlaneGeometry(hw - 0.04, 0.15), M.grilleHead); hgr.position.set(0, HEAD.y1 - 0.095, HEAD.z1 + 0.001);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.07), new THREE.MeshBasicMaterial({ map: canvasTex(512, 160, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.fillStyle = '#f3ece0'; c.font = 'italic 500 92px "Instrument Sans", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('assembl.', w / 2, h / 2 + 4);
    }), transparent: true }));
    logo.position.set(-0.2, HEAD.y1 - 0.075, HEAD.z1 + 0.003);
    const hpip = piping([V(-hw / 2 + 0.02, HEAD.y1 - 0.02, HEAD.z1 + 0.004), V(hw / 2 - 0.02, HEAD.y1 - 0.02, HEAD.z1 + 0.004), V(hw / 2 - 0.02, HEAD.y0 + 0.02, HEAD.z1 + 0.004), V(-hw / 2 + 0.02, HEAD.y0 + 0.02, HEAD.z1 + 0.004)], 0.003, M.piping);
    part({ id: 'front', name: 'Front and logo', cat: 'head', obj: g(hgr, logo, hpip),
      desc: 'Grille cloth across the top of the head, cream piping, and assembl\'s script where a maker\'s logo would sit.', spec: 'Woven cloth · piping', role: 'The face of the amp.' });
    // the gold control panel, knobs, switches, jacks and the jewel lamp
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.075), M.panel); panel.position.set(0, PANEL_Y, HEAD.z1 + 0.002);
    const knobs = KNOB_X.map((x, i) => {
      const o = new THREE.Group();
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.0155, 0.012, 32), M.knobBlack); skirt.rotation.x = Math.PI / 2; skirt.position.z = 0.006; o.add(skirt);
      const capK = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.012, 32), M.knobGold); capK.rotation.x = Math.PI / 2; capK.position.z = 0.016; o.add(capK);
      const mark = box(0.0016, 0.009, 0.001, M.knobBlack, 0, 0.005, 0.0225); o.add(mark);
      o.position.set(x, PANEL_Y - 0.008, HEAD.z1 + 0.002);
      skirt.userData.playTarget = { knob: KNOBS[i] }; capK.userData.playTarget = { knob: KNOBS[i] };
      return o;
    });
    const jacks = [-0.31, -0.28].map((x) => { const j = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 20), M.chrome); j.rotation.x = Math.PI / 2; j.position.set(x, PANEL_Y - 0.008, HEAD.z1 + 0.006); return j; });
    const toggle = (x) => { const o = g(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.006, 16), M.chrome)); o.children[0].rotation.x = Math.PI / 2; const lever = box(0.004, 0.016, 0.004, M.plastic, 0, 0.006, 0.01); lever.rotation.x = -0.4; o.add(lever); o.position.set(x, PANEL_Y - 0.008, HEAD.z1 + 0.004); return o; };
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.009, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.jewel); lamp.rotation.x = Math.PI / 2; lamp.position.set(0.345, PANEL_Y - 0.008, HEAD.z1 + 0.004);
    part({ id: 'panel', name: 'Control panel', cat: 'head', obj: g(panel, ...knobs, ...jacks, toggle(0.282), toggle(0.322), lamp),
      desc: 'Brushed gold panel. Gain sets how hard the preamp is driven (and how much it distorts); bass, middle and treble shape the tone; presence adds bite; master sets the final volume. Drag a knob up or down to turn it.',
      spec: '2 inputs · 6 knobs · standby and power switches · jewel lamp', role: 'Where you set the sound.' });
    // the back: a slotted panel, the chassis, and the valves glowing behind it
    const backShape = new THREE.Shape([new THREE.Vector2(-hw / 2 + 0.018, 0), new THREE.Vector2(hw / 2 - 0.018, 0), new THREE.Vector2(hw / 2 - 0.018, hh - 0.036), new THREE.Vector2(-hw / 2 + 0.018, hh - 0.036)]);
    for (let r = 0; r < 3; r++) backShape.holes.push(new THREE.Path([new THREE.Vector2(-0.29, 0.03 + r * 0.06), new THREE.Vector2(-0.29, 0.06 + r * 0.06), new THREE.Vector2(0.29, 0.06 + r * 0.06), new THREE.Vector2(0.29, 0.03 + r * 0.06)]));
    const backM = new THREE.Mesh(new THREE.ExtrudeGeometry(backShape, { depth: 0.006, bevelEnabled: false }), M.tolex); backM.position.set(0, HEAD.y0 + 0.018, HEAD.z0 - 0.003);
    const chassis = box(hw - 0.06, 0.012, hd - 0.04, M.chassis, 0, HEAD.y1 - 0.04, hz);
    const headLining = box(hw - 0.04, hh - 0.04, 0.004, M.baffle, 0, hy, HEAD.z1 - 0.03); // the inside of the front, so you can't see through the head
    const valves = [], glows = [];
    const valve = (x, big) => {
      const h = big ? 0.1 : 0.05, r = big ? 0.016 : 0.0105;
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), M.glass); glass.position.set(x, HEAD.y1 - 0.046 - h / 2, HEAD.z0 + 0.045);
      const top = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.glass); top.rotation.x = Math.PI; top.position.set(x, HEAD.y1 - 0.046 - h, HEAD.z0 + 0.045);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, h * 0.6, 12, 1, true), M.plate); plate.position.copy(glass.position);
      const gm = M.glow.clone(); gm.userData.unique = true;
      const fil = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.34, r * 0.34, h * 0.62, 10), gm); fil.position.copy(glass.position);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.05, 0.012, 20), M.plastic); base.position.set(x, HEAD.y1 - 0.046 + 0.004, HEAD.z0 + 0.045);
      glows.push(fil); valves.push(glass);
      return g(glass, top, plate, fil, base);
    };
    const vgroup = g(headLining, ...[-0.2, -0.14, -0.08, -0.02].map((x) => valve(x, true)), ...[0.07, 0.11, 0.15].map((x) => valve(x, false)));
    part({ id: 'valves', name: 'Valves', cat: 'valves', obj: g(backM, chassis, vgroup),
      desc: 'Glass vacuum tubes hanging from the chassis. Three small ones are the preamp; four big power valves drive the speakers. Pushed hard they squash the signal smoothly, which is the warm crunch a valve amp is loved for. They glow as they work.',
      spec: '3 × 12AX7 preamp · 4 × EL34 power', role: 'Amplify, and colour the sound.' });

    /* ── playing state ── */
    const values = { presence: 6, bass: 6, middle: 5, treble: 6.5, master: 6, gain: 5 };
    const knobAngle = (v) => (-135 + v * 27) * Math.PI / 180;
    const setKnobs = () => KNOBS.forEach((k, i) => { knobs[i].rotation.z = -knobAngle(values[k]); });
    setKnobs();
    let listeners = [], level = 0, sample = 0, power = 1;
    let dragK = null, dragY = 0, dragV = 0;
    const knobOf = (hit) => hit?.object.userData.playTarget?.knob || null;
    return {
      grabs(hit) { return !!knobOf(hit); },
      pickList(mode) { return mode === 'play' ? knobs.flatMap((k) => k.children.slice(0, 2)) : null; },
      mode() { studio.controls.enabled = true; },
      pointer(kind, ev, hit) {
        if (kind === 'down') { const k = knobOf(hit); if (k) { dragK = k; dragY = ev.clientY; dragV = values[k]; } }
        else if (kind === 'drag' && dragK) { this.play.set(dragK, dragV + (dragY - ev.clientY) / 18); }
        else if (kind === 'up') dragK = null;
      },
      click() { return studio.mode === 'play'; },
      tick(dt) {
        // speakers move with the output, valves glow with it
        speakers.forEach((s, i) => { s.userData.moving.position.z = sample * 0.007 * (1 + i * 0.04); });
        const gl = power * (0.42 + Math.min(1, level * 2.2) * 0.5); // warm at idle, brighter with the signal; under 1 so it never blooms out
        glows.forEach((f, i) => { f.material.emissiveIntensity = gl * (i < 4 ? 1 : 0.7); });
        M.jewel.emissiveIntensity = power ? 0.7 : 0;
      },
      play: {
        knobs: KNOBS,
        get values() { return { ...values }; },
        set(k, v) { values[k] = Math.max(0, Math.min(10, v)); setKnobs(); listeners.forEach((f) => f(k)); },
        on: (f) => listeners.push(f),
        drive: (lvl, smp) => { level = lvl; sample = smp; },
        xray: (on) => { M.grille.opacity = on ? 0.22 : 1; M.grille.depthWrite = !on; },
        knobTop: (k) => { const i = KNOBS.indexOf(k); return V(KNOB_X[i], PANEL_Y - 0.008, HEAD.z1 + 0.024); },
        speakerAt: (i) => spkPos[i].clone(),
        valveAt: () => V(-0.11, HEAD.y1 - 0.09, HEAD.z0 - 0.01),
      },
    };
  },
};
