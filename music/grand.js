// assembl lab · play piano: a white baby grand, modelled in code in metres. No maker's name: the nameboard is left plain.
// Instrument space: x across the keys (bass to the left), y up from the floor, z towards the player.
// 88 keys (A0 to C8). Press a key and it dips, its hammer flies up through the gap in the plate to the strings,
// its damper lifts, and its strings glow dusty rose while they sound.
import { H, THREE, V } from './engine.js';
import { midiHz } from './audio.js';

const LOW = 21, HIGH = 108, WW = 0.0235;
const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const noteName = (m) => `${NOTE[m % 12]}${Math.floor(m / 12) - 1}`;
const isBlack = (m) => [1, 3, 6, 8, 10].includes(m % 12);
// x of every key, from the white-key count
const KX = {}; { let w = 0; const x0 = -52 * WW / 2; for (let m = LOW; m <= HIGH; m++) { if (isBlack(m)) KX[m] = x0 + w * WW; else { KX[m] = x0 + (w + 0.5) * WW; w++; } } }
const KEY_TOP = 0.722, KEY_FRONT = 0.305, KEY_PIVOT = V(0, 0.70, -0.16);
const STR_Y = 0.872, PIN_Z = 0.07, AGRAFFE_Z = -0.105, STRIKE_Z = -0.155, DAMPER_Z = -0.235;

// the case seen from above: a straight bass side, a rounded tail and the S-curved bentside
const RIM = [[-0.74, 0.14], [-0.74, -1.02], [-0.725, -1.14], [-0.68, -1.23], [-0.6, -1.29], [-0.49, -1.315], [-0.37, -1.3], [-0.26, -1.245], [-0.15, -1.13],
  [-0.04, -0.96], [0.1, -0.76], [0.28, -0.57], [0.47, -0.43], [0.62, -0.31], [0.71, -0.17], [0.74, -0.02], [0.74, 0.14]];
function smoothRim() {
  const c = new THREE.CatmullRomCurve3(RIM.map(([x, z]) => V(x, 0, z)), false, 'centripetal');
  const pts = c.getSpacedPoints(180).map((p) => new THREE.Vector2(p.x, -p.z)); // shape space: (x, −z)
  return pts;
}
const area = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i].x * q.y - q.x * p[i].y; } return a / 2; };
const ccw = (p) => (area(p) < 0 ? p.slice().reverse() : p.slice());
function offset(poly, d) {
  const n = poly.length;
  return poly.map((p, i) => {
    const a = poly[(i - 1 + n) % n], b = poly[(i + 1) % n];
    const t = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
    return new THREE.Vector2(p.x + t.y * d, p.y - t.x * d);
  });
}
// a band of width w along an open chain, on the side of its (t.y, −t.x) normal
function stripAlong(chain, w) {
  const inner = chain.map((p, i) => {
    const a = chain[Math.max(0, i - 1)], b = chain[Math.min(chain.length - 1, i + 1)];
    const t = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
    return new THREE.Vector2(p.x + t.y * w, p.y - t.x * w);
  });
  return [...chain, ...inner.reverse()];
}
// cut a closed outline at a line y = cut (shape space), keeping the part with y > cut, closed along the cut
function cutFront(poly, cut) {
  let start = poly.findIndex((p, i) => p.y > cut && poly[(i - 1 + poly.length) % poly.length].y <= cut);
  if (start < 0) start = 0;
  const out = [];
  for (let k = 0; k < poly.length; k++) { const p = poly[(start + k) % poly.length]; if (p.y > cut) out.push(p); else break; }
  out.push(new THREE.Vector2(out[out.length - 1].x, cut), new THREE.Vector2(out[0].x, cut));
  return ccw(out);
}
const circle = (cx, cy, r, n = 48) => { const a = []; for (let i = 0; i < n; i++) { const t = -i / n * Math.PI * 2; a.push(new THREE.Vector2(cx + Math.cos(t) * r, cy + Math.sin(t) * r)); } return a; };
// a flat shape in shape space (x, −z), extruded upward from y0 to y1
function flat(pts, y0, y1, mat, holes = [], bevel = 0) {
  const s = new THREE.Shape(pts); for (const h of holes) s.holes.push(new THREE.Path(h));
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0 - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, y0 + bevel); g.rotateX(-Math.PI / 2);
  return new THREE.Mesh(g, mat);
}
// the furthest-back point of the inside of the rim at a given x (where a string has to end)
let RIM_IN = null;
function backAt(x) {
  let best = -0.2;
  for (let i = 0; i < RIM_IN.length; i++) {
    const a = RIM_IN[i], b = RIM_IN[(i + 1) % RIM_IN.length];
    if ((a.x - x) * (b.x - x) <= 0 && a.x !== b.x) { const z = -(a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x)); best = Math.min(best, z); }
  }
  return best;
}
// move an open chain sideways along its own normal
function offsetChain(chain, d) {
  return chain.map((p, i) => { const a = chain[Math.max(0, i - 1)], b = chain[Math.min(chain.length - 1, i + 1)]; const t = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize(); return new THREE.Vector2(p.x + t.y * d, p.y - t.x * d); });
}
const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
const rod = (a, b, r, mat, seg = 12) => H.rod(a, b, r, mat, seg);

export default {
  id: 'grand', code: 'GP',
  title: 'Baby grand.',
  eyebrow: 'assembl lab / music',
  line: 'Eighty-eight keys, each throwing a felt hammer at its strings.',
  bar: 'Piano',
  size: 2.6,
  cats: [{ id: 'case', name: 'Case' }, { id: 'inside', name: 'Inside' }, { id: 'action', name: 'Keys & action' }, { id: 'stand', name: 'Legs & pedals' }],
  root: { rotation: new THREE.Euler(0, 0, 0), lift: 0.0 },
  cam: { dir: V(0.7, 0.62, 0.95), homeFit: 0.9, play: { target: V(0, 0.85, -0.45), radius: 1.0, dir: V(0.7, 0.62, 0.95) } },
  truth: 'Modelled in code to the proportions of a baby grand; not a scan, no maker\'s name. Sound: synthesised in your browser.',
  stats: () => ['88 keys · 225 strings', 'Baby grand, about 1.5 m'],

  build(api, studio) {
    const { part } = api;
    const tSpruce = H.grain('#e8d2a6', '#b48d58', { stripes: 160, wobble: 0.35, seed: 31 }); tSpruce.repeat.set(3, 3);
    const tWood = H.grain('#a8744a', '#5a3620', { stripes: 90, wobble: 0.8, seed: 32 }); tWood.repeat.set(2, 6);
    const M = {
      white: new THREE.MeshPhysicalMaterial({ color: '#f2efe9', roughness: 0.5, specularIntensity: 0.4, clearcoat: 1, clearcoatRoughness: 0.045 }),
      whiteIn: new THREE.MeshPhysicalMaterial({ color: '#ece8e1', roughness: 0.55, clearcoat: 0.6, clearcoatRoughness: 0.1 }),
      gold: new THREE.MeshPhysicalMaterial({ color: '#dcbb72', metalness: 0.8, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.15 }),
      brass: new THREE.MeshStandardMaterial({ color: '#d8b56a', metalness: 1, roughness: 0.22 }),
      steel: new THREE.MeshStandardMaterial({ color: '#d6d6d4', metalness: 1, roughness: 0.2 }),
      copper: new THREE.MeshStandardMaterial({ color: '#b8743e', metalness: 1, roughness: 0.32 }),
      spruce: new THREE.MeshStandardMaterial({ color: '#ffffff', map: tSpruce, roughness: 0.7 }),
      wood: new THREE.MeshStandardMaterial({ color: '#ffffff', map: tWood, roughness: 0.65 }),
      ivory: new THREE.MeshPhysicalMaterial({ color: '#f7f3ea', roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.15 }),
      ebony: new THREE.MeshPhysicalMaterial({ color: '#0f0e10', roughness: 0.55, specularIntensity: 0.35, clearcoat: 0.25, clearcoatRoughness: 0.25 }),
      felt: new THREE.MeshStandardMaterial({ color: '#efe9dd', roughness: 1 }),
      redFelt: new THREE.MeshStandardMaterial({ color: '#7e2636', roughness: 1 }),
      black: new THREE.MeshStandardMaterial({ color: '#1d1a1c', roughness: 0.55 }),
      cloth: new THREE.MeshStandardMaterial({ color: '#2a2527', roughness: 1 }),
    };
    const g = (...m) => { const o = new THREE.Group(); m.forEach((x) => o.add(x)); return o; };
    const rim = ccw(smoothRim());
    const rimIn = offset(rim, -0.034);
    RIM_IN = rimIn;

    /* ── case ── */
    // the chain runs front-left, back along the bass side, round the tail and up the bentside; +w is inward
    const chain = smoothRim();
    const rimM = flat(ccw(stripAlong(chain, 0.034)), 0.62, 0.972, [M.white, M.white], [], 0.003);
    const rimCap = flat(ccw(stripAlong(offsetChain(chain, -0.005), 0.042)), 0.957, 0.974, M.white, [], 0.002);
    part({ id: 'rim', name: 'Rim', cat: 'case', obj: g(rimM, rimCap),
      desc: 'The curved wall of the case: layers of hard maple bent round a form in one piece while the glue sets, then lacquered. A stiff rim holds the soundboard\'s edge still so the middle can move.',
      spec: 'Laminated maple · white polyester lacquer', role: 'Holds everything in shape.' });
    part({ id: 'soundboard', name: 'Soundboard', cat: 'inside', obj: g(flat(offset(rim, -0.03), 0.79, 0.8, M.spruce)),
      desc: 'A thin panel of spruce, slightly arched, glued round the inside of the rim. The bridge passes each string\'s vibration into it, and it moves the air. It is the piano\'s loudspeaker.',
      spec: 'Solid spruce · about 9 mm · crowned', role: 'Makes the sound loud.' });
    // the treble-side bridge on the soundboard (a curved hardwood rail the strings bear on)
    const sb = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40; sb.push(V(-0.42 + t * 1.0, 0.0, -0.98 + t * 0.84 - Math.sin(t * Math.PI) * 0.12)); }
    const bridgeCurve = new THREE.CatmullRomCurve3(sb);
    const bridgeM = new THREE.Mesh(new THREE.TubeGeometry(bridgeCurve, 60, 0.012, 6, false), M.wood); bridgeM.position.y = 0.825; bridgeM.scale.y = 1.6;
    part({ id: 'sbBridge', name: 'Soundboard bridge', cat: 'inside', obj: g(bridgeM),
      desc: 'A curved hardwood rail glued to the soundboard. Every treble and tenor string presses down on it, so the string\'s shaking passes straight into the board.',
      spec: 'Maple, capped · notched and pinned', role: 'Couples strings to the soundboard.' });

    // keybed, key frame, cheeks, key slip, fallboard, music desk
    const keyArea = [new THREE.Vector2(-0.74, -0.33), new THREE.Vector2(0.74, -0.33), new THREE.Vector2(0.74, 0.18), new THREE.Vector2(-0.74, 0.18)];
    part({ id: 'keybed', name: 'Keybed', cat: 'case', obj: g(flat(keyArea, 0.62, 0.66, M.white, [], 0.003), box(1.24, 0.03, 0.5, M.black, 0, 0.675, 0.06)),
      desc: 'The shelf the whole keyboard and action slide in on. Take out two screws and the action comes out in one piece for servicing.', spec: 'Laminated beech, lacquered under', role: 'Carries the keys.' });
    const cheek = (s) => { const m = box(0.122, 0.11, 0.18, M.white, s * 0.677, 0.715, 0.232); return m; };
    part({ id: 'cheeks', name: 'Cheek blocks', cat: 'case', obj: g(cheek(-1), cheek(1)), desc: 'The blocks at each end of the keyboard, where the arm of the case meets the keybed.', spec: 'Lacquered', role: 'Frame the keys.' });
    part({ id: 'keyslip', name: 'Key slip', cat: 'case', obj: g(box(1.232, 0.034, 0.016, M.white, 0, 0.688, 0.316)),
      desc: 'The thin rail in front of the keys. It hides the key frame and stops a knee from knocking the keys.', spec: 'Lacquered', role: 'Front rail.' });
    const fb = box(1.232, 0.075, 0.02, M.white, 0, 0.792, 0.142);
    const fbLine = box(1.1, 0.0016, 0.0012, M.brass, 0, 0.8, 0.1527);
    part({ id: 'fallboard', name: 'Fallboard', cat: 'case', obj: g(fb, fbLine),
      desc: 'The hinged cover that folds down over the keys. Open, it shows the nameboard, where a maker puts its name. This one is left plain, with a fine gold line.', spec: 'Lacquered · soft-close', role: 'Covers the keys.' });
    const desk = new THREE.Group();
    const deskB = box(0.78, 0.15, 0.016, M.white, 0, 0.075, 0); desk.add(deskB);
    const ledge = box(0.78, 0.016, 0.05, M.white, 0, 0.008, 0.022); desk.add(ledge);
    desk.position.set(0, 0.975, 0.075); desk.rotation.x = -0.32;
    part({ id: 'desk', name: 'Music desk', cat: 'case', obj: desk, desc: 'The stand for sheet music, resting on the case behind the keys at a comfortable reading angle.', spec: 'Lacquered · removable', role: 'Holds the music.' });

    /* ── the cast-iron plate, with a gap the hammers come up through ── */
    const plateOut = offset(rim, -0.046);
    const gap = [new THREE.Vector2(-0.665, -STRIKE_Z + 0.032), new THREE.Vector2(-0.665, -STRIKE_Z - 0.032), new THREE.Vector2(0.665, -STRIKE_Z - 0.032), new THREE.Vector2(0.665, -STRIKE_Z + 0.032)];
    const holes = [gap, circle(-0.38, 0.55, 0.06), circle(-0.12, 0.42, 0.05), circle(0.12, 0.36, 0.042), circle(0.32, 0.33, 0.032),
      circle(-0.5, 0.9, 0.055), circle(-0.27, 0.78, 0.05), circle(-0.05, 0.68, 0.04), circle(0.18, 0.56, 0.032), circle(-0.45, 1.13, 0.045)];
    // keep only the plate behind the pin block flange (z < 0.04)
    const plateShape = cutFront(plateOut, -0.118); // runs right up to the fallboard: the flange over the pin block
    const plate = flat(plateShape, 0.84, 0.858, M.gold, holes, 0.003);
    const capo = box(1.34, 0.02, 0.03, M.gold, 0, 0.866, AGRAFFE_Z + 0.01);
    part({ id: 'plate', name: 'Cast-iron plate', cat: 'inside', obj: g(plate, capo),
      desc: 'One casting of grey iron, painted gold, bolted over the soundboard. The strings pull on it with about 18 tonnes in all; wood alone would fold up. The round holes save weight and let you reach the soundboard.',
      spec: 'Grey cast iron · gold bronze finish · about 140 kg', role: 'Takes the strings\' pull.' });

    /* ── strings: one, two or three per note; the bass runs over the tenor at an angle ── */
    const notes = [];
    for (let m = LOW; m <= HIGH; m++) {
      const bass = m < 33, wound = m < 48;
      const xf = bass ? -0.665 + (m - LOW) * 0.0105 : -0.53 + (m - 33) / 75 * 1.17;
      const xb = bass ? xf + 0.2 : xf;
      const L = 1.38 * Math.pow(0.5, (m - LOW) / (12 * 1.75));
      const zb = Math.max(AGRAFFE_Z - L, backAt(xb) + 0.07);
      const n = bass ? 1 : wound ? 2 : 3, y = bass ? STR_Y + 0.008 : STR_Y;
      notes.push({ m, xf, xb, zb, n, y, wound, lvl: 0, held: false, tau: Math.max(0.6, 2.6 - (m - 60) * 0.045), down: 0, ham: 0, stop: null });
    }
    const unit = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true); unit.rotateX(Math.PI / 2);
    const steelN = notes.reduce((a, s) => a + (s.wound ? 0 : s.n), 0), copperN = notes.reduce((a, s) => a + (s.wound ? s.n : 0), 0);
    const steelI = new THREE.InstancedMesh(unit, M.steel, steelN), copperI = new THREE.InstancedMesh(unit, M.copper, copperN);
    const halo = new THREE.InstancedMesh(unit, new THREE.MeshBasicMaterial({ color: '#ffffff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }), notes.length);
    const pinsI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.03, 8), M.steel, steelN + copperN);
    const hitchI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.002, 0.002, 0.012, 6), M.steel, steelN + copperN);
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), zAxis = V(0, 0, 1);
    let si = 0, ci = 0, pi = 0;
    const place = (inst, k, a, b, r) => { const d = b.clone().sub(a); q.setFromUnitVectors(zAxis, d.clone().normalize()); mtx.compose(a.clone().add(b).multiplyScalar(0.5), q, V(r, r, d.length())); inst.setMatrixAt(k, mtx); };
    notes.forEach((s, k) => {
      const r = s.wound ? (s.m < 33 ? 0.0024 : 0.0016) : 0.00085;
      for (let j = 0; j < s.n; j++) {
        const dx = (j - (s.n - 1) / 2) * 0.0026;
        const front = V(s.xf + dx, s.y, PIN_Z), back = V(s.xb + dx, s.y, s.zb);
        if (s.wound) place(copperI, ci++, front, back, r); else place(steelI, si++, front, back, r);
        mtx.makeTranslation(front.x, s.y - 0.004, PIN_Z + (j % 2) * 0.014 - (k % 2) * 0.007); pinsI.setMatrixAt(pi, mtx);
        mtx.makeTranslation(back.x, s.y - 0.004, s.zb); hitchI.setMatrixAt(pi++, mtx);
      }
      place(halo, k, V(s.xf, s.y, PIN_Z - 0.01), V(s.xb, s.y, s.zb + 0.01), 0.0034 * Math.max(1, s.n * 0.75));
      halo.setColorAt(k, new THREE.Color(0, 0, 0));
      s.mid = V((s.xf + s.xb) / 2, s.y, (AGRAFFE_Z + s.zb) / 2);
    });
    for (const im of [steelI, copperI, halo, pinsI, hitchI]) im.instanceMatrix.needsUpdate = true;
    halo.renderOrder = 3; halo.userData.noShadow = true; halo.userData.noPick = true;
    steelI.userData.noPick = copperI.userData.noPick = pinsI.userData.noPick = hitchI.userData.noPick = true;
    part({ id: 'strings', name: 'Strings', cat: 'inside', obj: g(steelI, copperI, pinsI, hitchI),
      desc: '225 strings. The treble has three to a note, the tenor two, the deep bass one heavy string wound with copper so it can be short enough to fit and still sound low. The bass strings cross over the tenor at an angle: overstringing.',
      spec: 'Music wire · copper-wound bass · tuning pins in a laminated pin block', role: 'Make the notes.' });

    /* ── hammers (under the strings) and dampers (on top of them) ── */
    const hamG = new THREE.BoxGeometry(0.0105, 0.03, 0.028); hamG.translate(0, 0.015, 0);
    const hammers = new THREE.InstancedMesh(hamG, M.felt, notes.length);
    const shankI = new THREE.InstancedMesh(new THREE.BoxGeometry(0.005, 0.006, 0.12), M.wood, notes.length);
    const HAM_REST = 0.805, HAM_TOP = STR_Y - 0.032;
    const setHammer = (k, lift) => {
      const s = notes[k], x = s.xf;
      mtx.compose(V(x, HAM_REST + (HAM_TOP - HAM_REST) * lift, STRIKE_Z), q.identity(), V(1, 1, 1)); hammers.setMatrixAt(k, mtx);
      const ang = -0.28 * lift;
      mtx.compose(V(x, HAM_REST + 0.004 + (HAM_TOP - HAM_REST) * lift * 0.5, STRIKE_Z + 0.06), q.setFromAxisAngle(V(1, 0, 0), ang), V(1, 1, 1)); shankI.setMatrixAt(k, mtx);
    };
    notes.forEach((s, k) => setHammer(k, 0)); hammers.instanceMatrix.needsUpdate = true; shankI.instanceMatrix.needsUpdate = true;
    hammers.userData.noPick = shankI.userData.noPick = true;
    part({ id: 'hammers', name: 'Hammers', cat: 'action', obj: g(hammers, shankI),
      desc: 'A row of wooden heads covered in tightly pressed wool felt. A key throws its hammer up at the strings; it strikes, then falls away at once so the strings can ring. Harder felt gives a brighter sound.',
      spec: 'Pressed wool felt on maple moulding · 88', role: 'Strike the strings.' });
    const dampN = notes.filter((s) => s.m < 89).length;
    const dampG = new THREE.BoxGeometry(0.011, 0.024, 0.034); dampG.translate(0, 0.012, 0);
    const dampers = new THREE.InstancedMesh(dampG, M.black, dampN);
    const DAMP_Y = STR_Y + 0.004;
    const setDamper = (k, lift) => { const s = notes[k]; if (s.m >= 89) return; const t = (DAMPER_Z - AGRAFFE_Z) / (s.zb - AGRAFFE_Z); const x = s.xf + (s.xb - s.xf) * Math.min(1, t); mtx.makeTranslation(x, DAMP_Y + lift * 0.012, DAMPER_Z); dampers.setMatrixAt(k, mtx); };
    notes.forEach((s, k) => setDamper(k, 0)); dampers.instanceMatrix.needsUpdate = true; dampers.userData.noPick = true;
    const dampRail = box(1.3, 0.012, 0.02, M.black, 0.02, DAMP_Y + 0.04, DAMPER_Z - 0.02);
    part({ id: 'dampers', name: 'Dampers', cat: 'action', obj: g(dampers, dampRail),
      desc: 'Felt pads resting on the strings to keep them silent. Press a key and its damper lifts; let go and it drops back and stops the sound. The right pedal lifts them all. The top notes have none: they die away fast on their own.',
      spec: 'Wool felt on wooden heads · 70', role: 'Stop the sound.' });

    /* ── keys: 52 white, 36 black, each dips on its own pivot ── */
    const wN = notes.filter((s) => !isBlack(s.m)).length, bN = notes.length - wN;
    const wG = new THREE.BoxGeometry(WW - 0.0011, 0.022, 0.15); wG.translate(0, -0.011, -0.075 + 0.0);
    const bG = new THREE.BoxGeometry(0.0118, 0.014, 0.093); bG.translate(0, 0.007, -0.0465);
    const whiteI = new THREE.InstancedMesh(wG, M.ivory, wN), blackI = new THREE.InstancedMesh(bG, M.ebony, bN);
    const keyOfInst = { white: [], black: [] }, instOfKey = [];
    const setKey = (k, dip) => {
      const s = notes[k], black = isBlack(s.m);
      const front = black ? KEY_FRONT - 0.052 : KEY_FRONT;
      const p = V(KX[s.m], KEY_TOP, front);
      // rotate about the key's balance point (behind the fallboard)
      const piv = V(KX[s.m], KEY_PIVOT.y, KEY_PIVOT.z), ang = dip * 0.022; // about 1 cm at the front
      const rq = q.setFromAxisAngle(V(1, 0, 0), ang);
      const pos = p.clone().sub(piv).applyQuaternion(rq).add(piv);
      mtx.compose(pos, rq, V(1, 1, 1));
      (black ? blackI : whiteI).setMatrixAt(instOfKey[k], mtx);
    };
    notes.forEach((s, k) => { const list = isBlack(s.m) ? keyOfInst.black : keyOfInst.white; instOfKey[k] = list.length; list.push(k); setKey(k, 0); });
    whiteI.instanceMatrix.needsUpdate = blackI.instanceMatrix.needsUpdate = true;
    whiteI.userData.playTarget = { keys: 'white' }; blackI.userData.playTarget = { keys: 'black' };
    part({ id: 'keys', name: 'Keys', cat: 'action', obj: g(whiteI, blackI),
      desc: 'Eighty-eight levers of spruce, balanced on a pin about halfway along. The white tops are a hard resin standing in for ivory; the black are ebony-like. Each weighs about 50 g at the front: lead weights in the key set the touch.',
      spec: '52 white · 36 black · A0 to C8', role: 'Where you play.' });

    /* ── lid, prop stick, legs, lyre and pedals ── */
    const LID_ANG = 0.58, HINGE = V(-0.742, 0.974, 0);
    const lidPts = cutFront(offset(rim, 0.004), -0.12);
    const lidM = flat(lidPts.map((p) => new THREE.Vector2(p.x - HINGE.x, p.y)), 0, 0.024, M.white, [], 0.004);
    const lid = new THREE.Group(); lid.add(lidM); lid.position.copy(HINGE); lid.rotation.z = LID_ANG;
    const hinges = [-0.2, -0.65, -1.05].map((z) => box(0.012, 0.016, 0.07, M.brass, -0.745, 0.978, z));
    part({ id: 'lid', name: 'Lid', cat: 'case', obj: g(lid, ...hinges),
      desc: 'Hinged along the straight side and propped open, the lid throws the sound out towards the audience on the curved side. Closed, the piano is quieter and softer.',
      spec: 'Lacquered · three brass hinges', role: 'Directs the sound.' });
    const propBase = V(0.262, 0.972, -0.57);
    const lidPt = (x, z) => { const local = V(x - HINGE.x, 0, z); return local.applyAxisAngle(V(0, 0, 1), LID_ANG).add(HINGE); };
    const propTop = lidPt(0.262, -0.57);
    part({ id: 'prop', name: 'Prop stick', cat: 'case', obj: g(rod(propBase, propTop, 0.011, M.white, 14), box(0.03, 0.012, 0.03, M.brass, propBase.x, propBase.y + 0.006, propBase.z)),
      desc: 'The stick that holds the lid open. Most grands have a long and a short stick for full and half open.', spec: 'Lacquered hardwood', role: 'Holds the lid up.' });
    const legAt = [V(-0.6, 0, 0.06), V(0.6, 0, 0.06), V(-0.44, 0, -1.12)];
    const legParts = legAt.map((p) => {
      const pr = [[0.0, 0.062], [0.026, 0.062], [0.03, 0.08], [0.036, 0.2], [0.044, 0.45], [0.05, 0.56], [0.062, 0.57], [0.062, 0.62], [0, 0.62]].map(([r, y]) => new THREE.Vector2(r, y));
      const leg = new THREE.Mesh(new THREE.LatheGeometry(pr, 32), M.white); leg.position.copy(p);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.03, 24), M.brass); cuff.position.set(p.x, 0.055, p.z);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.02, 20), M.brass); wheel.rotation.z = Math.PI / 2; wheel.position.set(p.x, 0.024, p.z);
      return g(leg, cuff, wheel);
    });
    const beams = g(box(0.06, 0.05, 0.98, M.wood, -0.44, 0.625, -0.66), box(0.9, 0.05, 0.06, M.wood, -0.15, 0.625, -0.3));
    part({ id: 'beams', name: 'Belly beams', cat: 'case', obj: beams, desc: 'Heavy beams under the soundboard that tie the tail leg and the rim back to the keybed.', spec: 'Spruce and beech', role: 'Stiffen the case.' });
    part({ id: 'legs', name: 'Legs', cat: 'stand', obj: g(...legParts), desc: 'Three turned legs on brass castors: two under the keyboard, one under the tail.', spec: 'Turned, lacquered · brass castors', role: 'Hold it up.' });
    const lyre = new THREE.Group();
    for (const s of [-1, 1]) lyre.add(box(0.026, 0.5, 0.022, M.white, s * 0.075, 0.37, 0.12));
    lyre.add(box(0.27, 0.07, 0.12, M.white, 0, 0.095, 0.12));
    lyre.add(rod(V(0, 0.12, 0.08), V(0, 0.62, -0.35), 0.009, M.white));
    const pedals = [];
    for (const [i, x] of [[0, -0.055], [1, 0], [2, 0.055]]) {
      const p = new THREE.Group();
      const arm = box(0.02, 0.012, 0.12, M.brass, 0, 0, 0.06); arm.rotation.x = -0.06; p.add(arm);
      const pad = box(0.026, 0.008, 0.05, M.brass, 0, 0.005, 0.105); p.add(pad);
      p.position.set(x, 0.088, 0.16); lyre.add(p); pedals[i] = p;
    }
    part({ id: 'pedals', name: 'Lyre and pedals', cat: 'stand', obj: lyre,
      desc: 'Three brass pedals hung in a lyre under the keys. Left: soft (shifts the hammers so they hit fewer strings). Middle: sostenuto (holds only the notes already down). Right: sustain (lifts every damper so everything rings).',
      spec: 'Brass · soft, sostenuto, sustain', role: 'Change how the notes ring.' });

    /* ── playing ── */
    let sustain = false, listeners = [];
    const changed = () => listeners.forEach((f) => f());
    const press = (k, vel = 0.75, { silent = false } = {}) => {
      const s = notes[k]; if (!s) return;
      s.stop?.(); s.stop = silent ? null : studio.sound.piano(s.m, vel);
      s.held = true; s.lvl = Math.min(1, 0.45 + vel * 0.6); s.vel = vel; s.ham = 1; s.t = 0;
      changed();
    };
    const release = (k) => {
      const s = notes[k]; if (!s || !s.held) return;
      s.held = false;
      if (!sustain) { s.stop?.(); s.stop = null; }
    };
    const byMidi = (m) => m - LOW;
    const keyIndex = (hit) => {
      if (!hit || hit.instanceId == null) return -1;
      const t = hit.object.userData.playTarget; if (!t?.keys) return -1;
      return keyOfInst[t.keys][hit.instanceId] ?? -1;
    };
    let dragKey = -1;
    const holder = new THREE.Group(); holder.matrixAutoUpdate = false; holder.add(halo);
    return {
      ready() { holder.matrix.copy(studio.root.matrixWorld); studio.stage.add(holder); },
      mode() { studio.controls.enabled = true; },
      grabs(hit) { return keyIndex(hit) >= 0; },
      pickList(mode) { return mode === 'play' ? [blackI, whiteI] : null; },
      pointer(kind, ev, hit) {
        if (studio.mode !== 'play') return;
        if (kind === 'up') { if (dragKey >= 0) release(dragKey); dragKey = -1; return; }
        const k = keyIndex(hit);
        if (kind === 'down' && k >= 0) { studio.sound.ensure(); dragKey = k; press(k, 0.7); }
        if (kind === 'drag' && dragKey >= 0 && k >= 0 && k !== dragKey) { release(dragKey); dragKey = k; press(k, 0.62); } // a glissando
      },
      click() { return studio.mode === 'play'; },
      tick(dt) {
        holder.matrix.copy(studio.root.matrixWorld); holder.matrixWorldNeedsUpdate = true;
        let keysDirty = false, hamDirty = false, dampDirty = false, haloDirty = false;
        const col = new THREE.Color();
        notes.forEach((s, k) => {
          // key travel follows the finger; the hammer flies up and falls back on its own
          const want = s.held ? 1 : 0;
          if (Math.abs(s.down - want) > 0.001) { s.down += (want - s.down) * Math.min(1, dt * (want ? 40 : 18)); setKey(k, s.down); keysDirty = true; }
          if (s.ham > 0) { s.ham = Math.max(0, s.ham - dt * 7); setHammer(k, Math.sin(Math.min(1, s.ham) * Math.PI * 0.5) ** 0.6); hamDirty = true; }
          const up = s.held || sustain ? 1 : 0;
          if (s.dUp == null) s.dUp = 0;
          if (Math.abs(s.dUp - up) > 0.001) { s.dUp += (up - s.dUp) * Math.min(1, dt * 20); setDamper(k, s.dUp); dampDirty = true; }
          if (s.lvl > 0) {
            const damped = !s.held && !sustain && s.m < 89;
            s.lvl *= Math.exp(-dt / (damped ? 0.09 : s.tau));
            if (s.lvl < 0.004) s.lvl = 0;
            const gl = Math.min(1, s.lvl * 1.3) * 0.85;
            halo.setColorAt(k, col.setRGB(0.85 * gl, 0.73 * gl, 0.8 * gl)); haloDirty = true;
          }
        });
        if (keysDirty) { whiteI.instanceMatrix.needsUpdate = true; blackI.instanceMatrix.needsUpdate = true; }
        if (hamDirty) { hammers.instanceMatrix.needsUpdate = true; shankI.instanceMatrix.needsUpdate = true; }
        if (dampDirty) dampers.instanceMatrix.needsUpdate = true;
        if (haloDirty) halo.instanceColor.needsUpdate = true;
        const pd = sustain ? 1 : 0; pedals[2].rotation.x += (pd * 0.12 - pedals[2].rotation.x) * Math.min(1, dt * 14);
      },
      play: {
        low: LOW, high: HIGH, noteName,
        press: (m, vel, opts) => press(byMidi(m), vel, opts), release: (m) => release(byMidi(m)),
        setSustain: (on) => { sustain = on; if (!on) notes.forEach((s) => { if (!s.held && s.stop) { s.stop(); s.stop = null; } }); changed(); },
        get sustain() { return sustain; },
        sounding: () => notes.filter((s) => s.lvl > 0.01).map((s) => ({ m: s.m, note: noteName(s.m), hz: midiHz(s.m), level: s.lvl, held: s.held })),
        keyTop: (m) => { const k = byMidi(m), black = isBlack(m); return V(KX[m], KEY_TOP + (black ? 0.016 : 0.001), (black ? KEY_FRONT - 0.052 : KEY_FRONT) - (black ? 0.03 : 0.025)); },
        stringMid: (m) => notes[byMidi(m)].mid.clone(),
        on: (f) => listeners.push(f),
      },
    };
  },
};
