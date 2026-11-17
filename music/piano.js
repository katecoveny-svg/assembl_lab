// assembl lab · instrument studies: a grand piano action. One octave, C4 to C5, modelled in code (units are metres).
// Middle C carries the whole double-escapement action; the other keys carry a hammer and a damper each.
// Instrument space: x across the keys, y up, z towards the player.
import { H, THREE, V } from './engine.js';

const WW = 0.0235, KEYS = 13, BASE = 60;
const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const isBlack = (m) => [1, 3, 6, 8, 10].includes(m % 12);
const whiteIndex = (m) => [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][m % 12] + (m >= 72 ? 7 : 0);
const keyX = (m) => (whiteIndex(m) - 3.5) * WW + (isBlack(m) ? WW / 2 : 0);
const nm = (m) => `${NOTE[m % 12]}${Math.floor(m / 12) - 1}`;
const KEYMAP = 'awsedftgyhujk';
const STRING_Y = 0.185, STRIKE = 0.2, HAMMER_PIV = V(0, 0.118, -0.035), WIPPEN_PIV = V(0, 0.062, -0.19), JACK_PIV = V(0, 0.058, -0.09), REP_PIV = V(0, 0.095, -0.14);
const HIT_ANGLE = Math.asin((STRING_Y - 0.0005 - 0.152) / (STRIKE - 0.035));

export default {
  id: 'piano', code: 'PA',
  title: 'Piano action.',
  eyebrow: 'assembl lab / instrument studies',
  line: 'Press a key and a felt hammer is thrown at three steel strings, then caught before it can hit twice.',
  bar: 'Piano',
  size: 2.4,
  cats: [
    { id: 'hammer', name: 'Hammers' }, { id: 'action', name: 'Middle C action' }, { id: 'dampers', name: 'Dampers' }, { id: 'keys', name: 'Keys' },
    { id: 'strings', name: 'Strings' }, { id: 'frame', name: 'Frame & rails' },
  ],
  root: { rotation: new THREE.Euler(0, 0.42, 0), lift: 0.03 },
  cam: { dir: V(-1, 0.5, 0.55), focus: V(-0.06, 0.1, -0.1), homeFit: 0.62, explodeFit: 0.92, play: { target: V(0, 0.05, 0.0), radius: 0.27, dir: V(0.41, 0.62, 0.91) } },
  truth: 'Modelled in code from a standard grand action and drawn simply; not a scan. Sound: synthesised in your browser.',
  stats: (n) => [`${n} parts · 13 keys · 39 strings`, 'Grand action, double escapement'],
  hint: 'Scroll to explode · Drag to turn · Click a part to inspect · Play to press the keys',

  build(api, studio) {
    const { part } = api;
    const tSpruce = H.grain('#e5cc9e', '#ad864f', { stripes: 140, wobble: 0.3, seed: 21 }); tSpruce.repeat.set(2, 2);
    const tMaple = H.grain('#e9d6b2', '#b9976a', { stripes: 80, wobble: 1.4, seed: 22 }); tMaple.repeat.set(1, 3);
    const tBass = H.grain('#e7d3b0', '#b8996d', { stripes: 70, wobble: 0.6, seed: 23 }); tBass.repeat.set(4, 1);
    const M = {
      ivory: new THREE.MeshPhysicalMaterial({ color: '#f6f1e6', roughness: 0.25, clearcoat: 0.6 }),
      ebony: new THREE.MeshPhysicalMaterial({ color: '#141113', roughness: 0.3, clearcoat: 0.7 }),
      key: new THREE.MeshStandardMaterial({ color: '#ffffff', map: tBass, roughness: 0.7 }),
      maple: new THREE.MeshStandardMaterial({ color: '#ffffff', map: tMaple, roughness: 0.6 }),
      spruce: new THREE.MeshStandardMaterial({ color: '#ffffff', map: tSpruce, roughness: 0.7 }),
      felt: new THREE.MeshStandardMaterial({ color: '#efe9de', roughness: 1 }),
      redFelt: new THREE.MeshStandardMaterial({ color: '#8b2d3c', roughness: 1 }),
      greenCloth: new THREE.MeshStandardMaterial({ color: '#4b6650', roughness: 1 }),
      leather: new THREE.MeshStandardMaterial({ color: '#c99a6a', roughness: 0.85 }),
      brass: new THREE.MeshStandardMaterial({ color: '#cfa860', metalness: 1, roughness: 0.28 }),
      steel: new THREE.MeshStandardMaterial({ color: '#d9d9d6', metalness: 1, roughness: 0.18 }),
      iron: new THREE.MeshStandardMaterial({ color: '#b08a3e', metalness: 0.7, roughness: 0.42 }),
      lead: new THREE.MeshStandardMaterial({ color: '#7d7f84', metalness: 0.6, roughness: 0.5 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2b2427', roughness: 0.6 }),
    };
    const g = (...m) => { const o = new THREE.Group(); m.forEach((x) => o.add(x)); return o; };
    // a side profile [(z, y)…] cut from a board of the given width, centred on x
    const prof = (pts, x, w, mat) => {
      const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
      const geo = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
      const m = new THREE.Mesh(geo, mat); m.rotation.y = -Math.PI / 2; m.position.x = x + w / 2; return m;
    };
    // a group that turns about a pivot: children are placed in absolute coordinates, then shifted
    const pivot = (pv, ...meshes) => { const p = new THREE.Group(); p.position.copy(pv); for (const m of meshes) { m.position.sub(pv); p.add(m); } return p; };
    const xAt = (pv, x) => V(x, pv.y, pv.z);
    const xL = keyX(BASE) - WW / 2 - 0.008, xR = keyX(BASE + 12) + WW / 2 + 0.008, span = xR - xL, xC = (xL + xR) / 2;

    /* keys */
    const keys = [];
    for (let i = 0; i < KEYS; i++) {
      const m = BASE + i, x = keyX(m), black = isBlack(m);
      const stickW = black ? 0.0088 : 0.0112;
      const stick = H.box(stickW, 0.022, 0.45, M.key, x, 0.011, -0.015);
      const tops = [];
      if (black) tops.push(H.box(0.0105, 0.024, 0.093, M.ebony, x, 0.034, 0.118));
      else {
        // a white key is full width only in front of the sharps; behind, it is notched round them
        const l = isBlack(m - 1) && m > BASE, r = isBlack(m + 1) && m < BASE + 12, x0 = x - 0.0111 + (l ? 0.0059 : 0), x1 = x + 0.0111 - (r ? 0.0059 : 0);
        tops.push(H.box(0.0222, 0.01, 0.046, M.ivory, x, 0.027, 0.187), H.box(x1 - x0, 0.01, 0.105, M.ivory, (x0 + x1) / 2, 0.027, 0.1115));
      }
      const kp = pivot(V(x, 0, 0), stick, ...tops);
      if (!black) for (const z of [0.12, 0.17]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, stickW + 0.0006, 16), M.lead); l.rotation.z = Math.PI / 2; l.position.set(0, 0.011, z); kp.add(l); }
      const p = part({ id: `key${m}`, name: `Key, ${nm(m)}`, cat: 'keys', obj: g(kp), explode: black ? V(0, 0.06, 0.12) : V(0, 0, 0.12), delay: 0.2,
        desc: `A ${black ? 'sharp' : 'natural'} key: a long lever of basswood ${black ? 'with an ebony top' : 'with a white top and lead weights near the front to balance it'}. It rocks on a pin at the balance rail; press the front down 10 mm and the back end lifts the action.`,
        spec: black ? 'Basswood, ebony top' : 'Basswood, acrylic top, lead weights', role: 'The lever you push.', playable: true });
      p.inner.userData.key = m;
      keys.push({ m, x, black, kp, part: p, pT: 0, p: 0, hA: 0, hState: 'rest', t: 0, stop: null, hit: false, extra: [] });
    }

    /* frame and rails */
    part({ id: 'keybed', name: 'Keyframe', cat: 'frame', obj: g(H.box(span, 0.012, 0.5, M.maple, xC, -0.016, -0.02)), explode: V(0, -0.12, 0), delay: 0.38,
      desc: 'The frame the keys sit on. It slides out of the piano with the whole action on it, which is how a technician gets at everything.', spec: 'Maple and spruce', role: 'Carries keys and action.' });
    part({ id: 'balRail', name: 'Balance rail', cat: 'frame', obj: g(H.box(span, 0.009, 0.02, M.maple, xC, -0.005, 0), H.box(span, 0.002, 0.016, M.greenCloth, xC, -0.0002, 0)), explode: V(0, -0.07, 0), delay: 0.36,
      desc: 'The rail across the middle of the keyframe. A pin through each key here is its fulcrum, and a paper punching under it sets the key\'s height.', spec: 'Maple, cloth and paper punchings', role: 'The keys\' pivot.' });
    part({ id: 'frontRail', name: 'Front rail', cat: 'frame', obj: g(H.box(span, 0.008, 0.016, M.maple, xC, -0.013, 0.2), H.box(span, 0.003, 0.012, M.redFelt, xC, -0.0075, 0.2)), explode: V(0, -0.07, 0.07), delay: 0.36,
      desc: 'Felt punchings under the front of the keys. Their thickness sets how far a key goes down: the key dip, about 10 mm.', spec: 'Wool felt punchings', role: 'Stops the key at the bottom.' });
    part({ id: 'backRail', name: 'Back rail cloth', cat: 'frame', obj: g(H.box(span, 0.01, 0.02, M.maple, xC, -0.006, -0.225), H.box(span, 0.0025, 0.018, M.redFelt, xC, -0.0005, -0.225)), explode: V(0, -0.07, -0.07), delay: 0.36,
      desc: 'Where the back of each key rests when you let go. The cloth keeps the return silent.', spec: 'Wool cloth', role: 'A quiet landing.' });
    part({ id: 'restRail', name: 'Hammer rest rail', cat: 'frame', obj: g(H.box(span, 0.006, 0.012, M.maple, xC, 0.106, -0.15), H.box(span, 0.002, 0.012, M.felt, xC, 0.1095, -0.15)), explode: V(0, 0.07, -0.04), delay: 0.3,
      desc: 'A felt-covered rail the hammer shanks lie on when they are not moving.', spec: 'Maple, felt', role: 'Where hammers rest.' });
    part({ id: 'hammerRail', name: 'Hammer flange rail', cat: 'frame', obj: g(H.box(span, 0.014, 0.016, M.maple, xC, 0.131, -0.035)), explode: V(0, 0.09, 0.05), delay: 0.3,
      desc: 'The rail the hammer flanges are screwed to. Every hammer pivots on a small pin through its flange here.', spec: 'Maple', role: 'Holds the hammer pivots.' });
    part({ id: 'wippenRail', name: 'Wippen rail', cat: 'frame', obj: g(H.box(span, 0.01, 0.016, M.maple, xC, 0.075, -0.198)), explode: V(0, 0.02, -0.1), delay: 0.3,
      desc: 'The rail the wippen flanges hang from at the back of the action.', spec: 'Maple', role: 'Holds the wippen pivots.' });

    /* strings, agraffes, pinblock, bridge, soundboard */
    const strings = [];
    for (const k of keys) {
      const ms = [];
      for (const dx of [-0.0032, 0, 0.0032]) { const s = H.rod(V(k.x + dx, STRING_Y, -0.06), V(k.x + dx, STRING_Y, -0.43), 0.00055, M.steel, 6); s.userData.noShadow = true; ms.push(s); }
      const tail = [-0.0032, 0, 0.0032].map((dx) => H.rod(V(k.x + dx, STRING_Y, -0.06), V(k.x + dx, 0.235, -0.05), 0.00055, M.steel, 6));
      const p = part({ id: `str${k.m}`, name: `Strings, ${nm(k.m)}`, cat: 'strings', obj: g(...ms, ...tail), explode: V(0, 0.3, -0.03), delay: 0,
        desc: `Three steel strings tuned to the same pitch, ${(440 * Math.pow(2, (k.m - 69) / 12)).toFixed(1)} Hz. Three strings make the note louder and let it bloom: they drift slightly apart in phase as it rings.`,
        spec: 'Music wire, 1 mm · about 75 kg each', role: 'Makes the note.' });
      strings.push(p);
    }
    part({ id: 'agraffe', name: 'Agraffe rail', cat: 'strings', obj: g(H.box(span, 0.012, 0.012, M.brass, xC, STRING_Y + 0.001, -0.12)), explode: V(0, 0.25, 0.02), delay: 0.04,
      desc: 'Brass studs the strings thread through, each holding three strings at exactly the right height and spacing. They mark the front end of the speaking length.', spec: 'Brass agraffes', role: 'The front end of each string\'s vibrating length.' });
    const pins = [];
    for (const k of keys) for (const dx of [-0.0032, 0, 0.0032]) { const pn = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.022, 10), M.steel); pn.position.set(k.x + dx, 0.244, -0.05 + (dx * 3)); pins.push(pn); }
    part({ id: 'tuningPins', name: 'Tuning pins', cat: 'strings', obj: g(...pins), explode: V(0, 0.44, 0.07), delay: 0.03,
      desc: '39 steel pins driven tight into the pinblock, one per string. A tuner turns them a hair at a time with a tuning lever.', spec: 'Blued steel, 7 mm', role: 'Tune each string.' });
    part({ id: 'pinblock', name: 'Pinblock', cat: 'frame', obj: g(H.box(span, 0.03, 0.08, M.maple, xC, 0.218, -0.05)), explode: V(0, 0.36, 0.07), delay: 0.1,
      desc: 'A laminated block of hard maple that grips the tuning pins by friction alone, against about 20 tonnes of total string tension in a full piano.', spec: 'Cross-banded maple, 15 plies', role: 'Holds the tuning.' });
    part({ id: 'bridge', name: 'Bridge', cat: 'strings', obj: g(H.box(span, 0.014, 0.022, M.maple, xC, STRING_Y - 0.009, -0.36)), explode: V(0, 0.18, -0.1), delay: 0.08,
      desc: 'A hardwood rail glued to the soundboard. The strings press down on it, so their vibration passes into the board.', spec: 'Maple, graphite-topped', role: 'Passes the vibration to the soundboard.' });
    part({ id: 'hitch', name: 'Hitch pin plate', cat: 'frame', obj: g(H.box(span, 0.03, 0.03, M.iron, xC, STRING_Y - 0.006, -0.425)), explode: V(0, 0.22, -0.16), delay: 0.06,
      desc: 'Part of the cast-iron plate. The far end of every string loops round a pin here.', spec: 'Cast iron, gold bronze finish', role: 'Anchors the strings.' });
    part({ id: 'board', name: 'Soundboard (section)', cat: 'strings', obj: g(H.box(span + 0.04, 0.009, 0.16, M.spruce, xC, 0.163, -0.36)), explode: V(0, -0.06, -0.18), delay: 0.12,
      desc: 'A thin, slightly domed panel of spruce, 9 mm thick, under the strings. Like a guitar top, it is what actually moves the air.', spec: 'Solid spruce, crowned and ribbed', role: 'Makes the sound loud.' });

    /* hammers and dampers for every key; the full action for middle C */
    const hammerMeshes = (x, w) => {
      const shank = H.rod(V(x, 0.118, -0.035), V(x, 0.118, -0.195), 0.0032, M.maple, 10);
      const molding = prof([[-0.19, 0.112], [-0.21, 0.112], [-0.212, 0.122], [-0.206, 0.136], [-0.194, 0.136], [-0.188, 0.122]], x, w, M.maple);
      const felt = prof([[-0.206, 0.136], [-0.2035, 0.147], [-0.2, 0.152], [-0.1965, 0.147], [-0.194, 0.136]], x, w, M.felt);
      const tail = prof([[-0.21, 0.112], [-0.222, 0.104], [-0.222, 0.1], [-0.21, 0.108]], x, w * 0.8, M.maple);
      return [shank, molding, felt, tail];
    };
    const damperMeshes = (x, w) => {
      const felt = H.box(w, 0.012, 0.03, M.felt, x, STRING_Y + 0.0066, -0.26);
      const head = H.box(w, 0.018, 0.034, M.maple, x, STRING_Y + 0.0216, -0.26);
      const wire = H.rod(V(x + 0.0065, STRING_Y + 0.012, -0.262), V(x + 0.0065, 0.036, -0.262), 0.0012, M.brass, 8);
      return [felt, head, wire];
    };
    for (const k of keys) {
      const w = 0.011;
      const featured = k.m === BASE;
      const hp = pivot(xAt(HAMMER_PIV, k.x), ...hammerMeshes(k.x, w));
      const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.0048, 0.0048, w, 16), M.leather); knuckle.rotation.z = Math.PI / 2; knuckle.position.set(k.x, 0.1105, -0.088);
      if (!featured) { knuckle.position.sub(xAt(HAMMER_PIV, k.x)); hp.add(knuckle); }
      const hpart = part({ id: `hammer${k.m}`, name: featured ? 'Hammer, middle C' : `Hammer, ${nm(k.m)}`, cat: featured ? 'action' : 'hammer', obj: g(hp),
        explode: featured ? V(-0.2, 0.2, 0) : V(0, 0.12, -0.02), delay: 0.06,
        desc: featured ? 'A felt hammer on a maple shank. Thrown upward by the jack, it flies free for the last few millimetres, strikes the three strings and drops back before it can damp them.'
          : `The ${nm(k.m)} hammer: a wedge of compressed wool felt on a wooden molding and a maple shank, pivoting on the hammer flange.`,
        spec: 'Wool felt over maple · 10 g', role: 'Strikes the strings.' });
      k.hp = hp; k.hammer = hpart;
      const dp = new THREE.Group(); damperMeshes(k.x, 0.0102).forEach((m) => dp.add(m));
      const lever = prof([[-0.22, 0.03], [-0.3, 0.03], [-0.3, 0.038], [-0.22, 0.038]], k.x + 0.0065 - 0.004, 0.008, M.maple);
      if (!featured) dp.add(lever);
      const dpart = part({ id: `damper${k.m}`, name: featured ? 'Damper, middle C' : `Damper, ${nm(k.m)}`, cat: featured ? 'action' : 'dampers', obj: g(dp),
        explode: featured ? V(-0.12, 0.32, 0) : V(0, 0.22, 0), delay: 0.05,
        desc: featured ? 'A block of soft felt resting on the strings. The back of the key lifts it as you press, so the note can ring; let go and it drops back and silences the strings.'
          : `Felt resting on the ${nm(k.m)} strings, lifted by the back of the key. Let go of the key and it falls back to stop the sound.`,
        spec: 'Wool felt on a maple head, brass wire', role: 'Stops the note.' });
      k.dp = dp; k.damper = dpart;
      if (featured) {
        part({ id: 'knuckle', name: 'Knuckle', cat: 'action', obj: g(pivot(xAt(HAMMER_PIV, k.x), knuckle)), explode: V(-0.16, 0.17, 0), delay: 0.05,
          desc: 'A leather-covered roll under the hammer shank. The jack pushes up on it; the leather lets the jack slip out cleanly.', spec: 'Buckskin over felt', role: 'Where the jack pushes the hammer.' });
        k.extra.push({ obj: () => studio.parts.find((p) => p.id === 'knuckle').inner.children[0], kind: 'hammer' });
        part({ id: 'damperLever', name: 'Damper lever, middle C', cat: 'action', obj: g(lever), explode: V(-0.18, 0.24, 0), delay: 0.05,
          desc: 'A small lever under the damper wire. The back end of the key lifts it, and it lifts the damper.', spec: 'Maple', role: 'Connects key to damper.' });
        k.extra.push({ obj: () => studio.parts.find((p) => p.id === 'damperLever').inner, kind: 'damper' });
        // the double-escapement action
        const x = k.x, w2 = 0.012;
        const capstan = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.012, 16), M.brass); capstan.position.set(x, 0.028, -0.11);
        const cp = pivot(V(x, 0, 0), capstan);
        part({ id: 'capstan', name: 'Capstan screw', cat: 'action', obj: g(cp), explode: V(-0.06, 0.03, 0), delay: 0.1,
          desc: 'A brass screw on top of the key. Turning it raises or lowers the whole action above it: it takes up any lost motion between key and wippen.', spec: 'Brass', role: 'Lifts the wippen.' });
        k.extra.push({ obj: () => cp, kind: 'key' });
        const back = prof([[-0.213, 0.022], [-0.207, 0.022], [-0.205, 0.082], [-0.211, 0.082]], x, 0.006, M.brass);
        const bfelt = prof([[-0.216, 0.078], [-0.204, 0.078], [-0.206, 0.098], [-0.218, 0.098]], x, w2, M.felt);
        const bp = pivot(V(x, 0, 0), back, bfelt);
        part({ id: 'backcheck', name: 'Backcheck', cat: 'action', obj: g(bp), explode: V(-0.08, 0.06, -0.05), delay: 0.1,
          desc: 'A felt pad on a wire at the back of the key. When the hammer bounces back off the strings, its tail lands here and is held, so it cannot strike again.', spec: 'Felt on brass wire', role: 'Catches the hammer.' });
        k.extra.push({ obj: () => bp, kind: 'key' });
        const wip = prof([[-0.19, 0.058], [-0.07, 0.058], [-0.07, 0.048], [-0.1, 0.045], [-0.104, 0.035], [-0.118, 0.035], [-0.124, 0.045], [-0.19, 0.048]], x, w2, M.maple);
        const cush = prof([[-0.118, 0.035], [-0.104, 0.035], [-0.104, 0.0315], [-0.118, 0.0315]], x, w2, M.felt);
        const wp = pivot(xAt(WIPPEN_PIV, x), wip, cush);
        part({ id: 'wippen', name: 'Wippen', cat: 'action', obj: g(wp), explode: V(-0.12, 0.05, 0), delay: 0.1,
          desc: 'The heart of the action (German for "rocker"). The capstan lifts it from below; it carries the jack and the repetition lever up towards the hammer.', spec: 'Maple, felt heel cushion', role: 'Carries the escapement.' });
        k.extra.push({ obj: () => wp, kind: 'wippen' });
        const wf = pivot(xAt(WIPPEN_PIV, x), prof([[-0.198, 0.058], [-0.182, 0.058], [-0.182, 0.07], [-0.198, 0.07]], x, w2, M.maple));
        part({ id: 'wippenFlange', name: 'Wippen flange', cat: 'action', obj: g(wf), explode: V(-0.16, 0.07, 0), delay: 0.1,
          desc: 'The small hinge that hangs the wippen from its rail, with a centre pin bushed in cloth.', spec: 'Maple, cloth bushing', role: 'The wippen\'s pivot.' });
        const jk = prof([[-0.093, 0.058], [-0.085, 0.058], [-0.085, 0.106], [-0.093, 0.106]], x, 0.008, M.maple);
        const jt = prof([[-0.085, 0.06], [-0.07, 0.066], [-0.07, 0.071], [-0.085, 0.068]], x, 0.008, M.maple);
        const jInner = pivot(JACK_PIV.clone().setX(x), jk, jt);
        const jOuter = new THREE.Group(); jOuter.position.copy(xAt(WIPPEN_PIV, x)); jInner.position.sub(xAt(WIPPEN_PIV, x)); jOuter.add(jInner);
        part({ id: 'jack', name: 'Jack', cat: 'action', obj: g(jOuter), explode: V(-0.2, 0.08, 0), delay: 0.1,
          desc: 'A slim upright that pushes the hammer\'s knuckle. Near the top of the stroke its tail hits the let-off button, it tips out from under the knuckle, and the hammer flies on by itself: escapement.', spec: 'Maple', role: 'Throws the hammer, then lets go.' });
        k.extra.push({ obj: () => jOuter, kind: 'wippen' }, { obj: () => jInner, kind: 'jack' });
        const rep = prof([[-0.172, 0.092], [-0.074, 0.092], [-0.074, 0.099], [-0.172, 0.099]], x, 0.009, M.maple);
        const rInner = pivot(REP_PIV.clone().setX(x), rep);
        const rOuter = new THREE.Group(); rOuter.position.copy(xAt(WIPPEN_PIV, x)); rInner.position.sub(xAt(WIPPEN_PIV, x)); rOuter.add(rInner);
        part({ id: 'repLever', name: 'Repetition lever', cat: 'action', obj: g(rOuter), explode: V(-0.24, 0.11, 0), delay: 0.1,
          desc: 'A sprung lever that catches the knuckle as the hammer falls back and holds it a little up, so the jack can reset with the key only half risen. This is why a grand can repeat a note very fast.', spec: 'Maple, spring', role: 'Fast repetition.' });
        k.extra.push({ obj: () => rOuter, kind: 'wippen' });
        const rf = pivot(xAt(WIPPEN_PIV, x), prof([[-0.146, 0.058], [-0.134, 0.058], [-0.134, 0.092], [-0.146, 0.092]], x, w2, M.maple));
        part({ id: 'repFlange', name: 'Repetition flange', cat: 'action', obj: g(rf), explode: V(-0.28, 0.1, 0), delay: 0.1,
          desc: 'The post on the wippen that carries the repetition lever\'s pivot.', spec: 'Maple', role: 'Holds the repetition lever.' });
        k.extra.push({ obj: () => rf, kind: 'wippen' });
        part({ id: 'letoff', name: 'Let-off button', cat: 'action', obj: g(H.box(0.012, 0.008, 0.012, M.redFelt, x, 0.078, -0.072), H.rod(V(x, 0.082, -0.072), V(x, 0.13, -0.072), 0.0015, M.brass, 8)), explode: V(-0.3, 0.15, 0), delay: 0.08,
          desc: 'A felt button hanging just above the jack\'s tail. Its height decides when the jack lets go: about 2 mm before the hammer reaches the strings.', spec: 'Felt on a threaded wire', role: 'Sets the escapement point.' });
        part({ id: 'hammerFlange', name: 'Hammer flange', cat: 'action', obj: g(prof([[-0.044, 0.112], [-0.027, 0.112], [-0.027, 0.124], [-0.044, 0.124]], x, w2, M.maple)), explode: V(-0.24, 0.18, 0), delay: 0.08,
          desc: 'The hinge that holds the hammer shank\'s centre pin on the hammer rail.', spec: 'Maple, cloth-bushed pin', role: 'The hammer\'s pivot.' });
      }
    }

    /* playing */
    let sustain = false;
    const press = (k, vel = 0.8) => {
      if (!k || k.pT === 1) return;
      studio.sound.ensure();
      k.pT = 1; k.t = 0; k.hState = 'fly'; k.hit = false; k.vel = vel;
      studio.ui.flash?.(nm(k.m));
    };
    const release = (k) => {
      if (!k || k.pT === 0) return;
      k.pT = 0; k.hState = 'return';
      if (!sustain) { k.stop?.(); k.stop = null; }
    };
    const panel = document.createElement('div'); panel.className = 'playpanel';
    panel.innerHTML = '<button type="button" class="pp-main" data-k="scale">Play a scale</button><button type="button" data-k="chord">C major chord</button><button type="button" data-k="sus" aria-pressed="false">Sustain pedal</button><span class="pp-note">Click the keys, or type A W S E D F T G Y H U J K</span>';
    const setSus = (on) => { sustain = on; panel.querySelector('[data-k="sus"]').setAttribute('aria-pressed', String(on)); if (!on) for (const k of keys) if (k.pT === 0 && k.stop) { k.stop(); k.stop = null; } };
    const scale = async (alive = () => true) => { for (const m of [60, 62, 64, 65, 67, 69, 71, 72]) { if (!alive()) return; const k = keys[m - BASE]; press(k, 0.7); await new Promise((r) => setTimeout(r, 230)); release(k); } };
    const chord = () => { for (const m of [60, 64, 67, 72]) press(keys[m - BASE], 0.75); setTimeout(() => { for (const m of [60, 64, 67, 72]) release(keys[m - BASE]); }, 1400); };
    panel.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return; studio.sound.ensure();
      if (b.dataset.k === 'scale') scale(); if (b.dataset.k === 'chord') chord(); if (b.dataset.k === 'sus') setSus(!sustain);
    });
    let held = null;
    const keyOf = (hit) => { const p = hit?.object.userData.part; return p?.inner.userData.key !== undefined ? keys[p.inner.userData.key - BASE] : null; };
    const keyMeshes = () => keys.flatMap((k) => { const a = []; k.part.obj.traverse((o) => { if (o.isMesh) a.push(o); }); return a; });
    let km = null;

    return {
      ready() { studio.ui.setPlayPanel?.(panel); km = keyMeshes(); },
      mode(m) {
        studio.controls.enabled = true; studio.ui.showPlay?.(m === 'play');
        if (m !== 'play') for (const k of keys) release(k);
        else { const ctx = studio.sound.ensure(); if (ctx) { let i = 0; const next = () => { if (i < KEYS) { studio.sound.pianoBuffer(BASE + i++); setTimeout(next, 30); } }; next(); } }
      },
      grabs(hit) { return !!keyOf(hit); },
      pickList(mode) { return mode === 'play' ? km : null; },
      pointer(kind, ev, hit) {
        if (studio.mode !== 'play') return;
        if (kind === 'down') { held = keyOf(hit); press(held, 0.8); }
        if (kind === 'drag') { const k = keyOf(hit); if (k && k !== held) { release(held); held = k; press(k, 0.7); } }
        if (kind === 'up') { release(held); held = null; }
      },
      click() { return studio.mode === 'play'; },
      key(ev) {
        const i = KEYMAP.indexOf(ev.key.toLowerCase());
        if (i < 0 || ev.metaKey || ev.ctrlKey) return false;
        if (studio.mode !== 'play') studio.setMode('play');
        if (!ev.repeat) { const k = keys[i]; press(k, 0.8); const up = (e2) => { if (e2.key.toLowerCase() === ev.key.toLowerCase()) { release(k); removeEventListener('keyup', up); } }; addEventListener('keyup', up); }
        return true;
      },
      tick(dt) {
        for (const k of keys) {
          k.t += dt;
          k.p += Math.sign(k.pT - k.p) * Math.min(Math.abs(k.pT - k.p), dt / (k.pT ? 0.035 : 0.07));
          const pe = k.p;
          // hammer: rides the key up to let-off, flies to the strings, rebounds onto the backcheck
          if (k.hState === 'fly') {
            k.hA = Math.min(HIT_ANGLE, k.hA + dt * HIT_ANGLE / 0.03);
            if (k.hA >= HIT_ANGLE) { k.hState = 'check'; k.t = 0; if (!k.hit) { k.hit = true; k.stop?.(); k.stop = studio.sound.piano(k.m, k.vel || 0.8); } }
          } else if (k.hState === 'check') {
            k.hA += (HIT_ANGLE * 0.55 - k.hA) * Math.min(1, dt * 22);
          } else if (k.hState === 'return') {
            k.hA += (0 - k.hA) * Math.min(1, dt * 16);
            if (k.hA < 0.001) { k.hA = 0; k.hState = 'rest'; }
          }
          k.kp.rotation.x = pe * 0.045;
          k.hp.rotation.x = k.hA;
          const dUp = Math.max(pe, sustain ? 1 : 0, k.stop && sustain ? 1 : 0) * 0.011;
          k.dp.position.y = dUp;
          for (const ex of k.extra) {
            const o = ex.obj(); if (!o) continue;
            if (ex.kind === 'key') o.rotation.x = pe * 0.045;
            if (ex.kind === 'hammer') o.rotation.x = k.hA;
            if (ex.kind === 'damper') o.position.y = dUp;
            if (ex.kind === 'wippen') o.rotation.x = -pe * 0.07;
            if (ex.kind === 'jack') o.rotation.x = k.hState === 'check' || (pe > 0.85 && k.pT) ? -0.22 * Math.min(1, (pe - 0.7) / 0.3) : 0;
          }
        }
      },
      async demo(alive, wait) {
        studio.setMode('play'); await wait(1200);
        await scale(alive); if (!alive()) return; await wait(300); chord(); await wait(1800);
        if (alive()) studio.setMode('overview');
      },
      actions: [{ label: 'Play', id: 'play', toggle: () => studio.setMode(studio.mode === 'play' ? 'overview' : 'play'), pressed: () => studio.mode === 'play' }],
      hoverText(hp) { return null; },
    };
  },
};
