// assembl lab · instrument studies: the acoustic guitar.
// The assembled view is a Meshy AI model made for assembl (headstock wordmark, inlay and names painted out).
// Every part below is modelled here in code, using that model's own outline so the two line up.
// Units are the model's (about 0.52 m each). Instrument space: x across the body, y towards the headstock,
// z out of the top.
import { H, THREE, V, clamp } from './engine.js';
import { midiHz } from './audio.js';

// half-width of the body at height y, measured off the model
const OUTLINE = [[-0.9475, 0], [-0.9465, 0.07], [-0.9435, 0.125], [-0.9385, 0.165], [-0.935, 0.18], [-0.915, 0.246], [-0.895, 0.286], [-0.875, 0.315],
  [-0.855, 0.335], [-0.835, 0.352], [-0.815, 0.363], [-0.795, 0.372], [-0.775, 0.378], [-0.755, 0.383], [-0.735, 0.385], [-0.715, 0.386], [-0.695, 0.386],
  [-0.675, 0.385], [-0.655, 0.383], [-0.635, 0.379], [-0.615, 0.375], [-0.595, 0.369], [-0.575, 0.363], [-0.555, 0.354], [-0.535, 0.345], [-0.515, 0.336],
  [-0.495, 0.327], [-0.475, 0.317], [-0.455, 0.307], [-0.435, 0.298], [-0.415, 0.289], [-0.395, 0.28], [-0.375, 0.274], [-0.355, 0.269], [-0.335, 0.266],
  [-0.315, 0.266], [-0.295, 0.268], [-0.275, 0.272], [-0.255, 0.275], [-0.235, 0.279], [-0.215, 0.282], [-0.195, 0.284], [-0.175, 0.285], [-0.155, 0.285],
  [-0.135, 0.283], [-0.115, 0.279], [-0.095, 0.272], [-0.075, 0.261], [-0.055, 0.244], [-0.035, 0.216], [-0.025, 0.186], [-0.017, 0.142], [-0.0115, 0.092],
  [-0.0085, 0.05], [-0.0072, 0.02], [-0.007, 0]];
const halfW = (y) => {
  if (y <= OUTLINE[0][0] || y >= OUTLINE[OUTLINE.length - 1][0]) return 0;
  for (let i = 1; i < OUTLINE.length; i++) if (y <= OUTLINE[i][0]) { const [y0, w0] = OUTLINE[i - 1], [y1, w1] = OUTLINE[i]; return w0 + (w1 - w0) * (y - y0) / (y1 - y0); }
  return 0;
};
const TOP = 0.073, TOP_IN = 0.067, BACK = -0.093, BACK_IN = -0.087;
const SH = { x: 0, y: -0.295, r: 0.056 };
const SCALE_LEN = 1.205, NUT_Y = 0.641; // nut, in neck coordinates
const fretY = (n) => NUT_Y - SCALE_LEN * (1 - Math.pow(2, -n / 12));
const OPEN = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4
const NAMES = ['low E', 'A', 'D', 'G', 'B', 'high E'];
const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const noteName = (m) => `${NOTE[m % 12]}${Math.floor(m / 12) - 1}`;
const CHORDS = {
  Open: [0, 0, 0, 0, 0, 0], E: [0, 2, 2, 1, 0, 0], Em: [0, 2, 2, 0, 0, 0], A: [-1, 0, 2, 2, 2, 0], Am: [-1, 0, 2, 2, 1, 0],
  D: [-1, -1, 0, 2, 3, 2], Dm: [-1, -1, 0, 2, 3, 1], G: [3, 2, 0, 0, 3, 3], C: [-1, 3, 2, 0, 1, 0], F: [1, 3, 3, 2, 1, 1],
};

function outlinePoints(n = 150) {
  const pts = OUTLINE.map(([y, w]) => V(w, y, 0));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const right = curve.getSpacedPoints(n).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
  right[0].x = 0; right[right.length - 1].x = 0;
  const left = right.slice(1, -1).reverse().map((p) => new THREE.Vector2(-p.x, p.y));
  return [...right, ...left]; // counter-clockwise
}
function offset(poly, d) {
  const n = poly.length;
  return poly.map((p, i) => {
    const a = poly[(i - 1 + n) % n], b = poly[(i + 1) % n];
    const t = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
    return new THREE.Vector2(p.x + t.y * d, p.y - t.x * d);
  });
}
const shapeOf = (pts, holes = []) => { const s = new THREE.Shape(pts); for (const h of holes) s.holes.push(new THREE.Path(h)); return s; };
const circle = (cx, cy, r, n = 64, cw = false) => { const a = []; for (let i = 0; i < n; i++) { const t = (cw ? -1 : 1) * i / n * Math.PI * 2; a.push(new THREE.Vector2(cx + Math.cos(t) * r, cy + Math.sin(t) * r)); } return a; };
const ring = (cx, cy, r0, r1, z0, z1, mat) => H.extrude(shapeOf(circle(cx, cy, r1), [circle(cx, cy, r0, 64, true)]), z0, z1, mat, { curve: 64 });

// a brace: flat glued face, tapered (scalloped) ends, hanging from a surface
function braceMesh(len, w, h, mat, hangDown = true) {
  const L = len / 2, s = new THREE.Shape();
  s.moveTo(-L, 0); s.lineTo(-L, h * 0.22); s.quadraticCurveTo(-L * 0.72, h, -L * 0.45, h); s.lineTo(L * 0.45, h); s.quadraticCurveTo(L * 0.72, h, L, h * 0.22); s.lineTo(L, 0); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -w / 2);
  const m = new THREE.Mesh(g, mat); m.rotation.x = hangDown ? -Math.PI / 2 : Math.PI / 2;
  return m;
}

export default {
  id: 'guitar', code: 'GT',
  title: 'Acoustic guitar.',
  eyebrow: 'assembl lab / instrument studies',
  line: 'Six strings over a hollow box. The top does the singing; everything else holds it in tune.',
  bar: 'Guitar',
  size: 2.6,
  cats: [
    { id: 'strings', name: 'Strings' }, { id: 'head', name: 'Headstock & tuners' }, { id: 'frets', name: 'Frets & inlays' },
    { id: 'neck', name: 'Neck' }, { id: 'bridge', name: 'Bridge' }, { id: 'body', name: 'Body' }, { id: 'bracing', name: 'Bracing' }, { id: 'trim', name: 'Trim' },
  ],
  root: { rotation: new THREE.Euler(-Math.PI / 2, -0.62, 0, 'YXZ'), lift: 0.004 },
  cam: { dir: V(0.32, 1.05, 0.95), homeFit: 0.9, explodeFit: 0.95, play: { target: V(0, -0.12, 0.09), radius: 0.95, dir: V(0.49, 0.85, 0.35) } },
  hero: { url: new URL('./guitar-model.glb', import.meta.url).href, tune: (m, studio) => {
    // the model's gloss map is patchy (each texture island has its own shine), which turns black lacquer into a grey mosaic;
    // treat it as one even gloss finish, not metal, and keep the studio's reflection on it low
    m.roughnessMap = null; m.metalnessMap = null; m.roughness = 0.36; m.metalness = 0;
    m.normalScale.set(0.3, 0.3);
    m.envMap = studio.scene.environment; m.envMapIntensity = 0.4; // a per-material envMap, so this intensity is honoured
  } },
  truth: 'Assembled view: a Meshy AI model made for assembl, brand marks painted out. Parts: modelled in code to match it. Sound: synthesised in your browser.',
  stats: (n) => [`${n} parts · 6 strings · 20 frets`, 'Dreadnought, steel strung'],
  hint: 'Scroll to explode · Drag to turn · Click a part to inspect · Play to strum',

  build(api, studio) {
    const { part } = api;
    const grainTex = (b, l, o) => H.grain(b, l, o);
    const tSpruce = grainTex('#e3c99a', '#a9824c', { stripes: 140, wobble: 0.3, seed: 2 }); tSpruce.repeat.set(4, 1.5);
    const tMahog = grainTex('#6e3820', '#2c120a', { stripes: 110, wobble: 0.8, seed: 3 }); tMahog.repeat.set(1.5, 6);
    const tRose = grainTex('#3a2219', '#140806', { stripes: 160, wobble: 1.2, seed: 5, rough: true }); tRose.repeat.set(3, 8);
    const tMaple = grainTex('#e7d2ac', '#b99a6c', { stripes: 70, wobble: 1.6, seed: 7 }); tMaple.repeat.set(3, 3);
    const M = {
      black: new THREE.MeshPhysicalMaterial({ color: '#0c0a0b', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }),
      cream: new THREE.MeshPhysicalMaterial({ color: '#efe3c6', roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.2 }),
      spruce: new THREE.MeshStandardMaterial({ color: '#ffffff', map: tSpruce, roughness: 0.72 }),
      mahog: new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: tMahog, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
      mahogRaw: new THREE.MeshStandardMaterial({ color: '#ffffff', map: tMahog, roughness: 0.8 }),
      rose: new THREE.MeshStandardMaterial({ color: '#ffffff', map: tRose, roughness: 0.6 }),
      maple: new THREE.MeshStandardMaterial({ color: '#ffffff', map: tMaple, roughness: 0.7 }),
      lining: new THREE.MeshStandardMaterial({ color: '#d9bf92', roughness: 0.85 }),
      bone: new THREE.MeshStandardMaterial({ color: '#f2e9d6', roughness: 0.45 }),
      nickel: new THREE.MeshStandardMaterial({ color: '#dcd8d0', metalness: 1, roughness: 0.2 }),
      steel: new THREE.MeshStandardMaterial({ color: '#4c4a4a', metalness: 0.9, roughness: 0.35 }),
      pearl: new THREE.MeshPhysicalMaterial({ color: '#f5f0e6', roughness: 0.22, iridescence: 1, iridescenceIOR: 1.5, iridescenceThicknessRange: [200, 600], clearcoat: 1 }),
      red: new THREE.MeshStandardMaterial({ color: '#c3231c', roughness: 0.65 }),
      guard: new THREE.MeshPhysicalMaterial({ color: '#16110f', roughness: 0.25, clearcoat: 0.8 }),
    };
    const poly = outlinePoints();
    const g = (...meshes) => { const o = new THREE.Group(); meshes.forEach((m) => o.add(m)); return o; };

    /* ── body ── */
    const topShape = shapeOf(poly, [circle(SH.x, SH.y, SH.r, 72, true)]);
    const topM = H.extrude(topShape, TOP_IN + 0.0006, TOP, [M.black, M.black], { curve: 72 });
    const topUnder = H.extrude(shapeOf(offset(poly, -0.001), [circle(SH.x, SH.y, SH.r, 72, true)]), TOP_IN, TOP_IN + 0.0006, M.spruce);
    part({ id: 'top', name: 'Soundboard (top)', cat: 'body', obj: g(topM, topUnder), explode: V(0, 0, 0.42), delay: 0.25,
      desc: 'A thin plate of spruce, about 2.7 mm thick, finished here in black lacquer. The strings pull on the bridge, the bridge rocks the top, and the top pushes air. It is the guitar\'s loudspeaker.',
      spec: 'Sitka spruce · 2.5–3 mm · lacquered', role: 'Makes the sound. Everything else exists to let it vibrate freely.' });
    const backM = H.extrude(shapeOf(poly), BACK, BACK_IN - 0.0006, [M.black, M.black]);
    const backIn = H.extrude(shapeOf(offset(poly, -0.001)), BACK_IN - 0.0006, BACK_IN, M.mahogRaw);
    part({ id: 'back', name: 'Back', cat: 'body', obj: g(backM, backIn), explode: V(0, 0, -0.4), delay: 0.3,
      desc: 'Two book-matched halves joined down the middle. The back reflects sound forward and adds its own lower resonance.',
      spec: 'Mahogany, two-piece · 2.5 mm', role: 'Reflects and colours the tone.' });
    const inner = offset(poly, -0.0055);
    const half = (sgn) => {
      const n = poly.length, idx = [];
      for (let i = 0; i < n; i++) if (sgn > 0 ? poly[i].x >= -1e-6 && i <= (n + 1) / 2 : (poly[i].x <= 1e-6 && (i === 0 || i >= (n - 1) / 2))) idx.push(i);
      if (sgn < 0) { const k = idx.indexOf(0); if (k >= 0) { idx.splice(k, 1); idx.push(0); } }
      const outer = idx.map((i) => poly[i]), inn = idx.map((i) => inner[i]).reverse();
      return shapeOf([...outer, ...inn]);
    };
    for (const sgn of [-1, 1]) {
      part({ id: sgn < 0 ? 'sideBass' : 'sideTreble', name: sgn < 0 ? 'Side, bass' : 'Side, treble', cat: 'body',
        obj: g(H.extrude(half(sgn), BACK_IN, TOP_IN, [M.mahogRaw, M.black], { curve: 2 })), explode: V(sgn * 0.3, 0, 0), delay: 0.35,
        desc: 'A strip of wood bent hot over a form into the waisted shape, then joined at the neck and tail blocks.',
        spec: 'Mahogany · 2 mm · heat-bent', role: 'Sets the depth of the air chamber.' });
    }
    const bindOuter = offset(poly, 0.0042);
    const binding = (z0, z1) => H.extrude(shapeOf(bindOuter, [offset(poly, -0.0005).slice().reverse()]), z0, z1, M.cream, { curve: 2 });
    part({ id: 'bindTop', name: 'Binding, top edge', cat: 'trim', obj: g(binding(TOP - 0.0085, TOP + 0.0004)), explode: V(0, 0, 0.32), delay: 0.24,
      desc: 'A cream strip set into a channel routed round the edge. It seals the end grain and protects the corner where top meets side.',
      spec: 'Ivoroid plastic · 2 × 6 mm', role: 'Protection and a crisp outline.' });
    part({ id: 'bindBack', name: 'Binding, back edge', cat: 'trim', obj: g(binding(BACK - 0.0004, BACK + 0.0085)), explode: V(0, 0, -0.32), delay: 0.29,
      desc: 'The same cream binding round the back edge.', spec: 'Ivoroid plastic · 2 × 6 mm', role: 'Protection.' });
    const lin = (z0, z1) => H.extrude(shapeOf(offset(poly, -0.0056), [offset(poly, -0.016).slice().reverse()]), z0, z1, M.lining, { curve: 2 });
    part({ id: 'linTop', name: 'Kerfed lining, top', cat: 'body', obj: g(lin(TOP_IN - 0.016, TOP_IN)), explode: V(0, 0, 0.13), delay: 0.33,
      desc: 'A strip of wood sawn part-way through every few millimetres so it bends with the sides. It doubles the gluing surface for the top.',
      spec: 'Basswood, kerfed', role: 'Holds the top on.' });
    part({ id: 'linBack', name: 'Kerfed lining, back', cat: 'body', obj: g(lin(BACK_IN, BACK_IN + 0.016)), explode: V(0, 0, -0.13), delay: 0.33,
      desc: 'The matching lining for the back.', spec: 'Basswood, kerfed', role: 'Holds the back on.' });
    part({ id: 'neckBlock', name: 'Neck block', cat: 'body', obj: g(H.box(0.1, 0.055, TOP_IN - BACK_IN, M.mahogRaw, 0, -0.04, (TOP_IN + BACK_IN) / 2)), explode: V(0, 0.12, 0), delay: 0.38,
      desc: 'A solid block inside the body where the neck joins. The dovetail or bolts that hold the neck go into it.',
      spec: 'Mahogany', role: 'Takes the pull of the strings.' });
    part({ id: 'tailBlock', name: 'Tail block', cat: 'body', obj: g(H.box(0.12, 0.022, TOP_IN - BACK_IN, M.mahogRaw, 0, -0.928, (TOP_IN + BACK_IN) / 2)), explode: V(0, -0.14, 0), delay: 0.38,
      desc: 'A small block at the bottom of the body where the two sides meet. The end pin screws into it.', spec: 'Mahogany', role: 'Joins the sides.' });
    const pin = g(H.rod(V(0, -0.947, -0.01), V(0, -0.962, -0.01), 0.0075, M.cream, 20), new THREE.Mesh(new THREE.SphereGeometry(0.0075, 20, 10), M.cream));
    pin.children[1].position.set(0, -0.962, -0.01);
    part({ id: 'endPin', name: 'End pin', cat: 'trim', obj: pin, explode: V(0, -0.22, 0), delay: 0.05,
      desc: 'The button at the tail for a strap. On guitars with a pickup it often doubles as the output jack.', spec: 'Ivoroid', role: 'Strap point.' });

    /* ── bracing ── */
    const along = (cx, cy, dx, dy, margin = 0.02) => {
      const d = new THREE.Vector2(dx, dy).normalize(), ends = [];
      for (const s of [1, -1]) { let t = 0; while (t < 1.2) { const x = cx + d.x * t * s, y = cy + d.y * t * s; if (Math.abs(x) > halfW(y) - margin || y > -0.03 || y < -0.93) break; t += 0.002; } ends.push(t * s); }
      return { d, t1: ends[0], t0: ends[1] };
    };
    const brace = (id, name, cx, cy, dx, dy, w, h, desc, spec, explode, maxLen, hang = true) => {
      const a = along(cx, cy, dx, dy);
      let t0 = a.t0, t1 = a.t1;
      if (maxLen) { const mid = 0; t0 = Math.max(t0, mid - maxLen / 2); t1 = Math.min(t1, mid + maxLen / 2); }
      const len = t1 - t0, mx = cx + a.d.x * (t0 + t1) / 2, my = cy + a.d.y * (t0 + t1) / 2;
      const m = braceMesh(len, w, h, M.spruce, hang);
      const o = new THREE.Group(); o.add(m);
      o.position.set(mx, my, hang ? TOP_IN : BACK_IN); o.rotation.z = Math.atan2(a.d.y, a.d.x);
      return part({ id, name, cat: 'bracing', obj: o, explode, delay: hang ? 0.22 : 0.27, desc, spec, role: 'Stiffens the plate without deadening it.' });
    };
    const th = 48 * Math.PI / 180, sx = Math.sin(th), cy0 = Math.cos(th);
    brace('xBass', 'X-brace, leg 1', 0, -0.43, sx, cy0, 0.012, 0.028,
      'One half of the X. The two legs cross just below the soundhole and spread the pull of the bridge across the whole top.', 'Spruce, scalloped · 12 × 28 mm', V(0, 0, 0.26));
    brace('xTreble', 'X-brace, leg 2', 0, -0.43, -sx, cy0, 0.012, 0.028,
      'The other half of the X, notched where it crosses the first. Scalloping the ends lets the top flex more near the edges.', 'Spruce, scalloped · 12 × 28 mm', V(0, 0, 0.27));
    brace('upper', 'Upper transverse brace', 0, -0.172, 1, 0, 0.014, 0.026,
      'A straight brace across the upper bout, between the soundhole and the neck. It stops the top caving in under the fingerboard.', 'Spruce · 14 × 26 mm', V(0, 0, 0.25));
    brace('tone1', 'Tone bar 1', 0.05, -0.70, 0.81, -0.59, 0.01, 0.017, 'A short bar in the lower bout. Tone bars tune how the area behind the bridge moves.', 'Spruce · 10 × 17 mm', V(0, 0, 0.24), 0.17);
    brace('tone2', 'Tone bar 2', 0.11, -0.785, 0.81, -0.59, 0.01, 0.017, 'The second tone bar, parallel to the first.', 'Spruce · 10 × 17 mm', V(0, 0, 0.24), 0.17);
    brace('finger1', 'Finger brace 1', -0.24, -0.5, -0.6, -0.8, 0.008, 0.012, 'A small brace in the wing beside the X. Finger braces keep the edge of the top from bellying.', 'Spruce · 8 × 12 mm', V(0, 0, 0.23), 0.11);
    brace('finger2', 'Finger brace 2', -0.19, -0.6, -0.6, -0.8, 0.008, 0.012, 'A second small finger brace.', 'Spruce · 8 × 12 mm', V(0, 0, 0.23), 0.09);
    brace('finger3', 'Finger brace 3', 0.24, -0.5, 0.6, -0.8, 0.008, 0.012, 'A finger brace on the treble wing.', 'Spruce · 8 × 12 mm', V(0, 0, 0.23), 0.11);
    brace('finger4', 'Finger brace 4', 0.19, -0.6, 0.6, -0.8, 0.008, 0.012, 'The last small finger brace.', 'Spruce · 8 × 12 mm', V(0, 0, 0.23), 0.09);
    part({ id: 'bridgePlate', name: 'Bridge plate', cat: 'bracing', obj: g(H.box(0.24, 0.075, 0.004, M.maple, 0, -0.57, TOP_IN - 0.002)), explode: V(0, 0, 0.2), delay: 0.2,
      desc: 'A thin hardwood plate glued under the bridge. The ball ends of the strings bear against it, so the soft spruce does not wear through.',
      spec: 'Maple · 2.5 mm', role: 'Anchors the strings under the top.' });
    for (const s of [-1, 1]) part({ id: `patch${s}`, name: `Soundhole patch, ${s < 0 ? 'bass' : 'treble'}`, cat: 'bracing', obj: g(H.box(0.032, 0.15, 0.003, M.spruce, s * 0.093, SH.y, TOP_IN - 0.0015)), explode: V(0, 0, 0.21), delay: 0.2,
      desc: 'A thin reinforcing pad beside the soundhole, laid cross-grain so the top cannot split along the hole.', spec: 'Spruce, cross-grain', role: 'Stops cracks.' });
    [-0.16, -0.36, -0.56, -0.78].forEach((y, i) => {
      const len = 2 * (halfW(y) - 0.018);
      const m = braceMesh(len, 0.014, 0.017, M.spruce, false); const o = new THREE.Group(); o.add(m); o.position.set(0, y, BACK_IN + 0.003);
      part({ id: `backBrace${i}`, name: `Back brace ${i + 1}`, cat: 'bracing', obj: o, explode: V(0, 0, -0.24), delay: 0.27,
        desc: 'A ladder brace across the back. Four of them keep the back slightly arched and stiff.', spec: 'Spruce · 14 × 17 mm', role: 'Stiffens the back.' });
    });
    part({ id: 'backStrip', name: 'Back centre strip', cat: 'bracing', obj: g(H.box(0.022, 0.88, 0.003, M.spruce, 0, -0.48, BACK_IN + 0.0015)), explode: V(0, 0, -0.19), delay: 0.28,
      desc: 'A cross-grain strip glued down the join between the two halves of the back.', spec: 'Spruce, cross-grain', role: 'Keeps the centre seam closed.' });
    const label = ring(0, -0.30, 0, 0.045, BACK_IN + 0.0031, BACK_IN + 0.0037, M.red);
    label.geometry = new THREE.CylinderGeometry(0.045, 0.045, 0.0006, 48); label.rotation.x = Math.PI / 2; label.position.set(0, -0.3, BACK_IN + 0.0034);
    part({ id: 'label', name: 'Inside label', cat: 'trim', obj: g(label), explode: V(0, 0, -0.16), delay: 0.28,
      desc: 'The paper label you see through the soundhole. Makers put the model, serial number and date here.', spec: 'Paper', role: 'Identity.' });

    /* ── neck (its own frame: tipped back slightly from the body) ── */
    const ON = V(0, -0.006, 0.087), NA = -0.048;
    const neckFrame = (o) => { o.position.copy(ON); o.rotation.x = NA; return o; };
    const neckPt = (x, y, z) => V(x, y, z).applyEuler(new THREE.Euler(NA, 0, 0)).add(ON);
    const boardHalf = (y) => 0.0425 + (NUT_Y - y) / (NUT_Y + 0.197) * 0.013;
    // fingerboard
    const fb = new THREE.Shape([new THREE.Vector2(-boardHalf(-0.197), -0.197), new THREE.Vector2(boardHalf(-0.197), -0.197), new THREE.Vector2(boardHalf(NUT_Y), NUT_Y), new THREE.Vector2(-boardHalf(NUT_Y), NUT_Y)]);
    part({ id: 'board', name: 'Fingerboard', cat: 'neck', obj: neckFrame(g(H.extrude(fb, -0.0115, 0, M.rose))), explode: V(0, 0.3, 0.16), delay: 0.16,
      desc: 'The dark board glued on top of the neck. Its frets are spaced so each one raises the note by a semitone: every fret is 1/17.8 of the remaining distance to the bridge.',
      spec: 'Rosewood · 20 frets · 645 mm scale', role: 'Where your fingers choose the notes.' });
    const bb = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Shape([new THREE.Vector2(s * boardHalf(-0.197), -0.197), new THREE.Vector2(s * (boardHalf(-0.197) + 0.0022), -0.197), new THREE.Vector2(s * (boardHalf(NUT_Y) + 0.0022), NUT_Y), new THREE.Vector2(s * boardHalf(NUT_Y), NUT_Y)]);
      bb.push(H.extrude(sh, -0.0115, 0.0003, M.cream));
    }
    part({ id: 'boardBind', name: 'Fingerboard binding', cat: 'trim', obj: neckFrame(g(...bb)), explode: V(0, 0.3, 0.13), delay: 0.16,
      desc: 'Cream strips along both edges of the fingerboard. They hide the ends of the fret slots.', spec: 'Ivoroid', role: 'Comfort and finish.' });
    // neck shaft, lofted from cross-sections
    const rings = [];
    for (let i = 0; i <= 24; i++) {
      const y = (i / 24) * (NUT_Y + 0.006), w = boardHalf(Math.min(y, NUT_Y)), d = 0.046 - (y / NUT_Y) * 0.017;
      const r = [];
      for (let j = 0; j <= 16; j++) { const a = (j / 16) * Math.PI; r.push(V(Math.cos(a) * w, y, -0.0115 - Math.sin(a) * d)); }
      for (let j = 1; j < 6; j++) r.push(V(-w + (2 * w * j) / 6, y, -0.0115));
      rings.push(r.reverse());
    }
    part({ id: 'neck', name: 'Neck', cat: 'neck', obj: neckFrame(g(H.loft(rings, M.mahog))), explode: V(0, 0.32, 0), delay: 0.2,
      desc: 'The long handle, carved to a rounded C shape. It has to stay straight under about 70 kg of string tension, which is why it is reinforced inside.',
      spec: 'Mahogany · C profile · glued dovetail joint', role: 'Holds the strings at the right length and height.' });
    const heel = [];
    for (let i = 0; i <= 10; i++) {
      const y = (i / 10) * 0.085, w = boardHalf(y), d = 0.15 - (0.15 - 0.045) * Math.pow(i / 10, 0.7);
      const r = [];
      for (let j = 0; j <= 16; j++) { const a = (j / 16) * Math.PI; const k = Math.sin(a); r.push(V(Math.cos(a) * w * (1 - 0.25 * (1 - i / 10) * k), y, -0.0116 - k * d)); }
      for (let j = 1; j < 6; j++) r.push(V(-w + (2 * w * j) / 6, y, -0.0116));
      heel.push(r.reverse());
    }
    part({ id: 'heel', name: 'Heel', cat: 'neck', obj: neckFrame(g(H.loft(heel, M.mahog))), explode: V(0, 0.22, -0.14), delay: 0.2,
      desc: 'The deep, rounded foot of the neck where it meets the body. The dovetail tenon hidden inside it locks into the neck block.',
      spec: 'Mahogany, stacked', role: 'Joins neck to body.' });
    part({ id: 'truss', name: 'Truss rod', cat: 'neck', obj: neckFrame(g(H.rod(V(0, 0.02, -0.021), V(0, NUT_Y - 0.004, -0.021), 0.0028, M.steel, 10))), explode: V(0, 0.32, 0.075), delay: 0.18,
      desc: 'A steel rod in a channel under the fingerboard. Tightening it bends the neck back against the pull of the strings.', spec: 'Steel · adjustable, single action', role: 'Keeps the neck straight.' });
    const tn = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.012, 6), M.nickel); tn.position.set(0, NUT_Y + 0.004, -0.021);
    part({ id: 'trussNut', name: 'Truss rod nut', cat: 'neck', obj: neckFrame(g(tn)), explode: V(0, 0.42, 0.1), delay: 0.12,
      desc: 'The hex nut on the end of the rod, reached from the headstock. A quarter turn at a time.', spec: 'Brass, 5/16" hex', role: 'Adjustment.' });
    part({ id: 'nut', name: 'Nut', cat: 'neck', obj: neckFrame(g(H.box(boardHalf(NUT_Y) * 2, 0.006, 0.02, M.bone, 0, NUT_Y + 0.003, -0.0015))), explode: V(0, 0.4, 0.2), delay: 0.1,
      desc: 'A slotted strip of bone at the top of the fingerboard. Open strings vibrate from here to the saddle. Slot depth decides how easy the first fret feels.',
      spec: 'Bone · 43 mm wide', role: 'One end of every open string.' });
    // frets and inlays
    for (let n = 1; n <= 20; n++) {
      const y = fretY(n), w = boardHalf(y);
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0026, w * 2, 10, 1), M.nickel);
      f.rotation.z = Math.PI / 2; f.position.set(0, y, 0.0006);
      const dist = (SCALE_LEN * (1 - Math.pow(2, -n / 12)) * 535).toFixed(0);
      part({ id: `fret${n}`, name: `Fret ${n}`, cat: 'frets', obj: neckFrame(g(f)), explode: V((n % 2 ? -1 : 1) * 0.01, 0.3, 0.25 + n * 0.003), delay: 0.08 + n * 0.002,
        desc: n === 12 ? 'The 12th fret sits exactly halfway between nut and saddle. Press here and the note is one octave above the open string.' :
          `Nickel-silver wire hammered into a slot. Pressing a string just behind it shortens the string to ${(Math.pow(2, -n / 12) * 100).toFixed(1)}% of its open length: ${n} semitone${n > 1 ? 's' : ''} higher.`,
        spec: `${dist} mm from the nut`, role: 'Divides the string into semitones.' });
    }
    for (const n of [3, 5, 7, 9, 12, 15, 17]) {
      const y0 = fretY(n - 1), y1 = fretY(n), ym = (y0 + y1) / 2, len = (y0 - y1) * 0.56;
      const parts = [-1, 1].map((s) => { const sh = new THREE.Shape([new THREE.Vector2(s * 0.004, ym - len / 2), new THREE.Vector2(s * 0.027, ym - len / 2 + 0.004), new THREE.Vector2(s * 0.027, ym + len / 2), new THREE.Vector2(s * 0.004, ym + len / 2 - 0.004)]); return H.extrude(sh, -0.0008, 0.0004, M.pearl); });
      part({ id: `inlay${n}`, name: `Inlay, fret ${n}`, cat: 'frets', obj: neckFrame(g(...parts)), explode: V(0, 0.3, 0.205), delay: 0.12,
        desc: `Mother-of-pearl blocks set into the board as position markers${n === 12 ? ' (the 12th, the octave)' : ''}. Players count frets by them.`, spec: 'Mother-of-pearl, split block', role: 'Helps you find your place.' });
    }

    /* ── headstock (tipped back again from the neck) ── */
    const HA = -0.25, HO = V(0, NUT_Y + 0.006, -0.0115);
    const headM = new THREE.Matrix4().compose(ON, new THREE.Quaternion().setFromEuler(new THREE.Euler(NA, 0, 0)), V(1, 1, 1))
      .multiply(new THREE.Matrix4().makeTranslation(HO.x, HO.y, HO.z)).multiply(new THREE.Matrix4().makeRotationX(HA));
    const headFrame = (o) => { headM.decompose(o.position, o.quaternion, o.scale); return o; };
    const headPt = (x, y, z) => V(x, y, z).applyMatrix4(headM);
    const HL = 0.322;
    const hs = [[0.0425, 0], [0.047, 0.013], [0.067, 0.037], [0.075, 0.064], [0.077, 0.128], [0.079, 0.214], [0.08, 0.277], [0.076, 0.304], [0.061, 0.313], [0.031, 0.316], [0, HL]];
    const hsPts = [...hs.map(([x, y]) => new THREE.Vector2(x, y)), ...hs.slice(0, -1).reverse().map(([x, y]) => new THREE.Vector2(-x, y))];
    const hShape = new THREE.Shape(hsPts.slice().reverse());
    part({ id: 'headstock', name: 'Headstock', cat: 'head', obj: headFrame(g(H.extrude(hShape, -0.022, -0.0016, M.mahog))), explode: V(0, 0.56, -0.02), delay: 0.14,
      desc: 'The head of the neck, angled back about 14 degrees so the strings press firmly down onto the nut.', spec: 'Mahogany · 14° back angle', role: 'Carries the tuners.' });
    part({ id: 'veneer', name: 'Headstock face', cat: 'head', obj: headFrame(g(H.extrude(hShape, -0.0016, 0, M.black))), explode: V(0, 0.56, 0.07), delay: 0.12,
      desc: 'A thin black veneer over the front of the headstock. On this guitar it is left plain: the maker\'s logo usually goes here.', spec: 'Black veneer, lacquered', role: 'Finish.' });
    const tc = [[0, 0.012], [0.017, 0.012], [0.023, 0.05], [0.021, 0.076], [0.012, 0.091], [0, 0.095]];
    const tcPts = [...tc.map(([x, y]) => new THREE.Vector2(x, y)), ...tc.slice(1, -1).reverse().map(([x, y]) => new THREE.Vector2(-x, y))];
    const tcIn = tcPts.map((p) => new THREE.Vector2(p.x * 0.86, 0.012 + (p.y - 0.012) * 0.9 + 0.002));
    part({ id: 'trussCover', name: 'Truss rod cover', cat: 'head', obj: headFrame(g(H.extrude(new THREE.Shape(tcPts.slice().reverse()), 0, 0.0012, M.cream), H.extrude(new THREE.Shape(tcIn.slice().reverse()), 0.0012, 0.0018, M.black))), explode: V(0, 0.6, 0.12), delay: 0.06,
      desc: 'A small bell-shaped plate held by two screws. Take it off to reach the truss rod nut.', spec: 'Black and cream plastic', role: 'Covers the adjustment.' });
    const posts = [];
    const tunerY = [0.118, 0.193, 0.268];
    for (let i = 0; i < 6; i++) {
      const s = i < 3 ? -1 : 1, row = i < 3 ? i : 5 - i, y = tunerY[row], x = s * 0.048;
      posts[i] = { x, y };
      const ex = (k) => V(s * k, 0.56, 0);
      const nm = NAMES[i];
      const bush = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.009, 0.0035, 24), M.nickel); bush.rotation.x = Math.PI / 2; bush.position.set(x, y, 0.00175);
      part({ id: `bush${i}`, name: `Bushing, ${nm}`, cat: 'head', obj: headFrame(g(bush)), explode: ex(0.1).add(V(0, 0, 0.1)), delay: 0.05,
        desc: 'A threaded collar pressed into the face. The post turns inside it.', spec: 'Nickel-plated brass', role: 'Bearing for the post.' });
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.05, 16), M.nickel); post.rotation.x = Math.PI / 2; post.position.set(x, y, 0.003);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.nickel); cap.rotation.x = Math.PI / 2; cap.position.set(x, y, 0.028);
      part({ id: `post${i}`, name: `Tuner post, ${nm}`, cat: 'head', obj: headFrame(g(post, cap)), explode: ex(0.13).add(V(0, 0, 0.17)), delay: 0.04,
        desc: `The ${nm} string threads through a hole in this post and winds round it. Each turn of the button turns the post about 1/18 of a turn.`, spec: 'Steel, nickel-plated', role: 'Winds the string.' });
      const hb = H.box(0.024, 0.026, 0.011, M.nickel, x + s * 0.008, y, -0.0285);
      const hc = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.011, 24), M.nickel); hc.rotation.x = Math.PI / 2; hc.position.set(x + s * 0.008, y, -0.0285); hc.scale.set(1, 1, 1);
      part({ id: `gear${i}`, name: `Tuning machine, ${nm}`, cat: 'head', obj: headFrame(g(hb, hc)), explode: ex(0.17).add(V(0, 0, -0.1)), delay: 0.05,
        desc: 'A sealed case on the back of the headstock holding a worm gear. The worm turns the post but the post cannot turn the worm, so the string stays in tune.',
        spec: 'Sealed worm gear · 18:1', role: 'Holds the tension.' });
      const shaft = H.rod(V(x + s * 0.018, y, -0.0285), V(s * 0.088, y, -0.0285), 0.0024, M.nickel, 10);
      const btn = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14), M.cream); btn.scale.set(0.016, 0.013, 0.0045); btn.position.set(s * 0.099, y, -0.0285);
      part({ id: `btn${i}`, name: `Tuner button, ${nm}`, cat: 'head', obj: headFrame(g(shaft, btn)), explode: ex(0.27).add(V(0, 0, -0.06)), delay: 0.05,
        desc: 'The cream key you turn. A large button gives finer control; this keystone shape is a vintage style.', spec: 'Ivoroid, keystone', role: 'Where you tune.' });
    }

    /* ── bridge ── */
    const bs = [[0, 0.03], [0.075, 0.03], [0.1, 0.022], [0.132, 0.016], [0.151, 0.008], [0.153, 0], [0.151, -0.008], [0.132, -0.016], [0.1, -0.022], [0.075, -0.03], [0, -0.03]];
    const bPts = [...bs.map(([x, y]) => new THREE.Vector2(x, y - 0.572)), ...bs.slice(1, -1).reverse().map(([x, y]) => new THREE.Vector2(-x, y - 0.572))].reverse();
    part({ id: 'bridge', name: 'Bridge', cat: 'bridge', obj: g(H.extrude(new THREE.Shape(bPts), TOP, TOP + 0.0135, M.rose, { bevel: 0.0012 })), explode: V(0, 0, 0.6), delay: 0.12,
      desc: 'Glued to the top, the bridge anchors the strings and passes their vibration into the soundboard. Its wings spread the load.',
      spec: 'Rosewood · glued, no screws', role: 'Couples strings to the top.' });
    const SAD = -0.557, SADZ = 0.0975;
    part({ id: 'saddle', name: 'Saddle', cat: 'bridge', obj: g(H.box(0.118, 0.0045, 0.019, M.bone, 0, SAD, SADZ - 0.0095)), explode: V(0, 0, 0.68), delay: 0.04,
      desc: 'The bone strip the strings cross on the bridge. Nut to saddle is the scale length. Its height sets the action: how far the strings sit above the frets.',
      spec: 'Bone · compensated', role: 'The other end of every string.' });
    const xb = (i) => -0.0525 + i * 0.021, xn = (i) => -0.0355 + i * 0.0142;
    for (let i = 0; i < 6; i++) {
      const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.004, 0.02, 16), M.bone); pm.rotation.x = Math.PI / 2; pm.position.set(xb(i), -0.585, TOP + 0.007);
      const hd = new THREE.Mesh(new THREE.SphereGeometry(0.0058, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), M.bone); hd.rotation.x = Math.PI / 2; hd.position.set(xb(i), -0.585, TOP + 0.0165);
      const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.001, 12), M.pearl); dot.rotation.x = Math.PI / 2; dot.position.set(xb(i), -0.585, TOP + 0.0222);
      part({ id: `pin${i}`, name: `Bridge pin, ${NAMES[i]}`, cat: 'bridge', obj: g(pm, hd, dot), explode: V((i - 2.5) * 0.02, 0, 0.75), delay: 0.03,
        desc: 'A tapered peg that wedges the ball end of the string inside the body. Pull the pin and the string comes out.', spec: 'Bone with pearl dot', role: 'Holds the string\'s ball end.' });
    }

    /* ── trim ── */
    part({ id: 'rosette', name: 'Rosette', cat: 'trim', obj: g(ring(SH.x, SH.y, SH.r + 0.0003, 0.072, TOP - 0.0004, TOP + 0.0005, M.cream), ring(SH.x, SH.y, 0.0785, 0.0815, TOP - 0.0004, TOP + 0.0005, M.cream)), explode: V(0, 0, 0.5), delay: 0.22,
      desc: 'Rings inlaid round the soundhole. Mostly decoration, they also stop the edge of the hole from splitting.', spec: 'Cream and black purfling', role: 'Decoration and protection.' });
    const pg = [[0.0601, -0.2349], [0.11, -0.205], [0.175, -0.21], [0.225, -0.255], [0.25, -0.33], [0.243, -0.42], [0.21, -0.49], [0.155, -0.515], [0.105, -0.48], [0.075, -0.42], [0.0546, -0.36]];
    for (let a = -40; a <= 40; a += 10) { const t = a * Math.PI / 180; pg.push([Math.cos(t) * 0.0855, SH.y + Math.sin(t) * 0.0855]); }
    part({ id: 'guard', name: 'Pickguard', cat: 'trim', obj: g(H.extrude(new THREE.Shape(pg.map(([x, y]) => new THREE.Vector2(x, y)).reverse()), TOP + 0.0002, TOP + 0.0011, M.guard)), explode: V(0, 0, 0.55), delay: 0.2,
      desc: 'A thin plastic plate that stops a pick from scratching the top.', spec: 'Black celluloid · 0.5 mm', role: 'Protection.' });

    /* ── strings: each one a cylinder whose middle can actually swing ── */
    const strings = [];
    const radius = [0.0021, 0.0017, 0.0013, 0.001, 0.00072, 0.00058];
    const nutPts = [], saddlePts = [];
    for (let i = 0; i < 6; i++) {
      const S = V(xb(i), SAD, SADZ + radius[i]);
      const N = neckPt(xn(i), NUT_Y, 0.0065 + radius[i]);
      const p = posts[i], P = headPt(p.x - Math.sign(p.x) * 0.0046, p.y, 0.012);
      nutPts.push(N); saddlePts.push(S);
      const wound = i < 4;
      const u = { uAmp: { value: 0 }, uStop: { value: 1 }, uLen: { value: S.distanceTo(N) }, uDir: { value: V(1, 0, 0) } };
      const mat = new THREE.MeshStandardMaterial({ color: wound ? '#c99d62' : '#e1dfdc', metalness: 1, roughness: wound ? 0.38 : 0.18 });
      mat.userData.unique = true; mat.userData.u = u;
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, u);
        sh.vertexShader = 'uniform float uAmp; uniform float uStop; uniform float uLen; uniform vec3 uDir;\n' + sh.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\nfloat s_ = position.y / uLen + 0.5;\nfloat k_ = s_ < uStop ? sin(3.14159265 * s_ / uStop) : 0.0;\ntransformed += uDir * uAmp * k_;');
      };
      mat.customProgramCacheKey = () => 'gstring';
      const vib = new THREE.Mesh(new THREE.CylinderGeometry(radius[i], radius[i], u.uLen.value, 6, 64, false), mat);
      const d = N.clone().sub(S);
      vib.position.copy(S).addScaledVector(d, 0.5); vib.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
      u.uDir.value.copy(V(1, 0, 0).applyQuaternion(vib.quaternion.clone().invert()));
      const back = H.rod(N, P, radius[i], mat, 6), tail = H.rod(S, V(xb(i), -0.582, TOP + 0.012), radius[i], mat, 6);
      const ball = new THREE.Mesh(new THREE.TorusGeometry(radius[i] * 1.6, radius[i] * 0.7, 6, 12), M.nickel); ball.position.copy(P).add(headPt(0, 0, 0.006).sub(headPt(0, 0, 0)));
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, u.uLen.value, 6, 1), new THREE.MeshBasicMaterial({ visible: false }));
      pick.position.copy(vib.position); pick.quaternion.copy(vib.quaternion);
      const sp = part({ id: `string${i}`, name: `String, ${NAMES[i]}`, cat: 'strings', obj: g(vib, back, tail, ball, pick), explode: V((i - 2.5) * 0.055, 0.12, 0.88), delay: 0,
        desc: `Tuned to ${noteName(OPEN[i])}, ${midiHz(OPEN[i]).toFixed(1)} Hz. ${wound ? 'Phosphor-bronze wire wound round a steel core, which adds mass without stiffness so it can ring low.' : 'Plain steel wire.'} It pulls on the guitar with about ${[12, 13, 14, 13, 10, 8][i]} kg.`,
        spec: `${['.053', '.042', '.032', '.024', '.016', '.012'][i]}" gauge · ${wound ? 'wound' : 'plain'}`, role: 'Makes the note. The body makes it loud.' });
      pick.userData.noPick = true; pick.userData.noShadow = true; pick.userData.playTarget = { string: i };
      vib.userData.noShadow = true; back.userData.noShadow = true; tail.userData.noShadow = true;
      strings.push({ i, part: sp, u, vib, pick, t: 0, amp: 0, freq: 0, stop: 1, stopper: null });
    }

    /* ── playing ── */
    const fingerMat = new THREE.MeshStandardMaterial({ color: '#C77FA7', roughness: 0.35, emissive: '#7a3060', emissiveIntensity: 0.25 });
    const mutedMat = new THREE.MeshStandardMaterial({ color: '#5b3a52', roughness: 0.5 });
    const marks = new THREE.Group(); marks.visible = false;
    let chord = 'G', fingerMeshes = [], frets = CHORDS.G.slice(), mute = false, listeners = [];
    const changed = () => listeners.forEach((f) => f());
    const strPoint = (i, n) => { // world point on string i, behind fret n
      const y = n === 0 ? NUT_Y + 0.012 : (fretY(n - 1) * 0.35 + fretY(n) * 0.65);
      const N = nutPts[i], S = saddlePts[i];
      const t = (NUT_Y - y) / SCALE_LEN;
      return N.clone().lerp(S, t);
    };
    const showChord = () => {
      for (const m of fingerMeshes) { marks.remove(m); m.geometry.dispose(); }
      fingerMeshes = [];
      frets.forEach((n, i) => {
        if (n > 0) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 20, 12), fingerMat); m.position.copy(strPoint(i, n)); m.position.z += 0.004; marks.add(m); fingerMeshes.push(m); }
        if (n < 0) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.0055, 0.0016, 8, 20), mutedMat); m.position.copy(neckPt(xn(i), NUT_Y - 0.02, 0.012)); marks.add(m); fingerMeshes.push(m); }
      });
      ui.querySelectorAll('[data-chord]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.chord === chord)));
      changed();
    };
    // marks live in instrument space; attach to a holder that follows the root
    const holder = new THREE.Group(); holder.matrixAutoUpdate = false; holder.add(marks);
    // an invisible pad over the top, just under the strings: a strum can start beside the strings and still play
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.36), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
    pad.position.set(0, -0.415, TOP + 0.004); pad.userData.playTarget = { pad: true }; pad.userData.noShadow = true;
    holder.add(pad);
    const ui = document.createElement('div'); ui.className = 'playpanel';
    ui.innerHTML = `<span class="pp-label">Chord</span>${Object.keys(CHORDS).map((c) => `<button type="button" data-chord="${c}" aria-pressed="false">${c}</button>`).join('')}<button type="button" class="pp-strum" data-strum>Strum</button><span class="pp-note">Drag across the strings, or press 1–6</span>`;

    const pluck = (i, { when = 0, gain = 0.55, vel = null } = {}) => {
      const n = frets[i];
      if (n < 0) return;
      const midi = OPEN[i] + n;
      const s = strings[i];
      s.stopper?.(0);
      s.stopper = studio.sound.pluck(midi, { when, gain, vel, mute, pan: (i - 2.5) * 0.12 });
      const v = vel == null ? 0.7 : vel;
      setTimeout(() => { s.t = 0; s.amp = (0.0028 + (5 - i) * 0.0003) * (0.5 + v) * (mute ? 0.5 : 1); s.stop = Math.pow(2, -n / 12); s.freq = Math.min(midiHz(midi), 30) * 0.5 + 9; s.decay = mute ? 9 : 1.6; }, when * 1000);
      studio.ui.flash?.(`${NAMES[i]} · ${noteName(midi)}`);
    };
    const strum = (down = true, vel = 0.7) => {
      studio.sound.ensure();
      const order = down ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0], gap = 0.03 - vel * 0.02;
      order.filter((i) => frets[i] >= 0).forEach((i, k) => pluck(i, { when: k * gap, gain: 0.42, vel: vel * (down ? 1 : 0.85) }));
    };
    const setChord = (name) => { if (!CHORDS[name]) return; chord = name; frets = CHORDS[name].slice(); showChord(); };
    // a finger on the neck: tap a string between two frets to hold it there; tap the same spot again to let go
    const fretAt = (i, n) => { frets[i] = frets[i] === n ? 0 : n; chord = 'Your chord'; showChord(); pluck(i, { vel: 0.6 }); };
    ui.addEventListener('click', (ev) => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.chord) { setChord(b.dataset.chord); strum(); }
      if (b.dataset.strum !== undefined) strum();
    });

    const KEEP = new Set(['strings']);
    let dragHits = new Set(), lastStrumDir = 0, lastP = null, speed = 0;
    let boardMesh = null;
    // any touch over the fingerboard (a string's touch zone included) frets a note; strumming happens over the body
    const boardHit = (hit) => {
      if (!hit || !boardMesh) return false;
      const p = boardMesh.worldToLocal(hit.point.clone());
      if (p.y > NUT_Y + 0.01 || p.y < fretY(19) || Math.abs(p.x) > boardHalf(p.y) + 0.012) return false;
      let n = 1; while (n < 20 && fretY(n) > p.y) n++;
      const t = (NUT_Y - p.y) / SCALE_LEN;
      let best = 0, bd = Infinity;
      for (let i = 0; i < 6; i++) { const x = xn(i) + (xb(i) - xn(i)) * t, d = Math.abs(x - p.x); if (d < bd) { bd = d; best = i; } }
      studio.sound.ensure(); fretAt(best, n);
      return true;
    };
    return {
      ready() {
        holder.matrix.copy(studio.root.matrixWorld); studio.stage.add(holder); showChord();
        studio.ui.setPlayPanel?.(ui);
        boardMesh = studio.parts.find((p) => p.id === 'board')?.inner.children[0] || null;
      },
      // the play page keeps the real model on show and draws only the moving strings over it
      get forceParts() { return studio.mode === 'play' && !studio.def?.heroPlay; },
      get heroKeep() { return studio.def?.heroPlay ? KEEP : null; },
      mode(m) {
        marks.visible = m === 'play';
        studio.controls.enabled = true;
        studio.ui.showPlay?.(m === 'play');
      },
      grabs(hit) { return !!hit && (!!hit.object.userData.playTarget || hit.object === boardMesh); },
      pickList(mode) { return mode === 'play' ? [...strings.map((s) => s.pick), pad, ...(boardMesh ? [boardMesh] : [])] : null; },
      pointer(kind, ev, hit) {
        if (studio.mode !== 'play') return;
        const now = performance.now();
        if (kind === 'down') { dragHits = new Set(); studio.sound.ensure(); lastP = { x: ev.clientX, y: ev.clientY, t: now }; speed = 0; if (boardHit(hit)) { dragHits.add('board'); return; } }
        if (kind === 'drag' && lastP) { const dt = Math.max(1, now - lastP.t); speed = speed * 0.5 + 0.5 * (Math.hypot(ev.clientX - lastP.x, ev.clientY - lastP.y) / dt); lastP = { x: ev.clientX, y: ev.clientY, t: now }; }
        if (dragHits.has('board')) return;
        if ((kind === 'down' || kind === 'drag') && hit?.object.userData.playTarget?.string !== undefined) {
          const i = hit.object.userData.playTarget.string;
          if (!dragHits.has(i)) { dragHits.add(i); pluck(i, { gain: 0.5, vel: kind === 'down' ? 0.55 : Math.min(1, 0.35 + speed / 1.2) }); }
        }
      },
      click(hit) {
        if (studio.mode !== 'play') return false;
        return true;
      },
      key(ev) {
        if (studio.mode !== 'play') { if (ev.key === ' ' && !ev.repeat) { studio.setMode('play'); strum(); return true; } return false; }
        if (/^[1-6]$/.test(ev.key)) { studio.sound.ensure(); pluck(Number(ev.key) - 1); return true; }
        if (ev.key === ' ') { strum(!ev.shiftKey, 0.75); return true; }
        return false;
      },
      tick(dt) {
        holder.matrix.copy(studio.root.matrixWorld); holder.matrixWorldNeedsUpdate = true;
        for (const s of strings) {
          if (s.amp <= 0) { s.u.uAmp.value = 0; continue; }
          s.t += dt;
          const env = Math.exp(-s.t * (s.decay || 1.6));
          s.u.uAmp.value = s.amp * env * Math.sin(s.t * s.freq * Math.PI * 2);
          s.u.uStop.value = s.stop;
          if (env < 0.01) s.amp = 0;
        }
      },
      async demo(alive, wait) {
        studio.setMode('play'); await wait(1300);
        for (const c of ['G', 'C', 'D', 'G']) { if (!alive()) return; chord = c; showChord(); strum(); await wait(1100); }
        if (!alive()) return; studio.setMode('overview');
      },
      play: {
        chords: Object.keys(CHORDS), shapes: CHORDS, setChord, strum, pluck,
        setMute: (on) => { mute = on; changed(); }, get mute() { return mute; },
        get chord() { return chord; }, get frets() { return frets.slice(); }, names: NAMES,
        clear: () => { frets = [0, 0, 0, 0, 0, 0]; chord = 'Open'; showChord(); },
        on: (f) => listeners.push(f),
      },
      actions: [{ label: 'Play', id: 'play', toggle: () => studio.setMode(studio.mode === 'play' ? 'overview' : 'play'), pressed: () => studio.mode === 'play' }],
      hoverText(hp) { if (hp?.string === undefined) return null; const i = hp.string, n = CHORDS[chord][i]; return n < 0 ? `${NAMES[i]} string · not played in ${chord}` : `${NAMES[i]} string · ${noteName(OPEN[i] + n)} · tap to pluck`; },
    };
  },
};
