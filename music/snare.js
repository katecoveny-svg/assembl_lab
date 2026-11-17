// assembl lab · instrument studies: the snare drum. A 14 × 5.5 inch snare, modelled in code (units are metres).
// Instrument space: y up the drum's axis (batter head on top), x and z across it. The throw-off faces +z.
import { H, THREE, V } from './engine.js';

const R = 0.1778, D = 0.1397, HY = D / 2; // shell radius and half depth
const LUGS = 10;

export default {
  id: 'snare', code: 'SN',
  title: 'Snare drum.',
  eyebrow: 'assembl lab / instrument studies',
  line: 'A wooden hoop of air between two skins. Wires under the bottom skin give it the crack.',
  bar: 'Snare',
  size: 2.1,
  cats: [
    { id: 'tension', name: 'Tension rods' }, { id: 'hoops', name: 'Hoops' }, { id: 'heads', name: 'Heads' }, { id: 'wires', name: 'Snare wires' },
    { id: 'strainer', name: 'Throw-off' }, { id: 'hardware', name: 'Lugs & hardware' }, { id: 'shell', name: 'Shell' },
  ],
  root: { rotation: new THREE.Euler(0, -0.35, 0), lift: 0.06 },
  cam: { dir: V(0.15, 0.62, 1), homeFit: 0.95, explodeFit: 1.12, play: { target: V(0, HY, 0.02), radius: 0.34, dir: V(0.05, 1, 0.62) } },
  truth: 'Modelled in code from a standard 14 × 5.5 in snare; not a scan of a real drum. Sound: synthesised in your browser.',
  stats: (n) => [`${n} parts · 10 lugs · 20 rods`, '14 × 5.5 in, maple shell'],
  hint: 'Scroll to explode · Drag to turn · Click a part to inspect · Play to hit it',

  build(api, studio) {
    const { part } = api;
    const tMaple = H.grain('#e2c79c', '#b38a55', { stripes: 120, wobble: 0.5, seed: 11 }); tMaple.repeat.set(6, 1);
    const M = {
      lacquer: new THREE.MeshPhysicalMaterial({ color: '#3a1631', roughness: 0.18, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.03, sheen: 0.4, sheenColor: new THREE.Color('#c58fb2') }),
      maple: new THREE.MeshStandardMaterial({ color: '#ffffff', map: tMaple, roughness: 0.65 }),
      chrome: new THREE.MeshStandardMaterial({ color: '#e9e7e4', metalness: 1, roughness: 0.12 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2629', metalness: 0.6, roughness: 0.4 }),
      coated: new THREE.MeshStandardMaterial({ color: '#f1ede6', roughness: 0.92, side: THREE.DoubleSide }),
      clear: new THREE.MeshPhysicalMaterial({ color: '#e8e2da', roughness: 0.2, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
      brass: new THREE.MeshStandardMaterial({ color: '#c8a361', metalness: 1, roughness: 0.3 }),
      cord: new THREE.MeshStandardMaterial({ color: '#1d1a1b', roughness: 0.9 }),
      wire: new THREE.MeshStandardMaterial({ color: '#cfcac3', metalness: 1, roughness: 0.3 }),
    };
    const g = (...m) => { const o = new THREE.Group(); m.forEach((x) => o.add(x)); return o; };
    const lathe = (pts, mat, seg = 128) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat);
    const at = (a, r, y) => V(Math.cos(a) * r, y, Math.sin(a) * r);
    const lugA = (i) => (i / LUGS) * Math.PI * 2 + Math.PI / LUGS;
    const out = (a, k) => V(Math.cos(a) * k, 0, Math.sin(a) * k);

    /* shell */
    const shell = g(lathe([[R, -HY + 0.004], [R, HY - 0.004], [R - 0.004, HY], [R - 0.0065, HY - 0.003], [R - 0.0065, -HY + 0.003], [R - 0.004, -HY], [R, -HY + 0.004]], M.lacquer));
    const inner = lathe([[R - 0.0066, -HY + 0.003], [R - 0.0066, HY - 0.003]], M.maple); inner.material = M.maple.clone(); inner.material.side = THREE.BackSide; shell.add(inner);
    part({ id: 'shell', name: 'Shell', cat: 'shell', obj: shell, explode: V(0, 0, 0), delay: 0.4,
      desc: 'Six plies of maple pressed into a cylinder 14 inches across and 5½ deep. The edges top and bottom are cut to a 45° point, the bearing edges, where the heads touch.',
      spec: 'Maple, 6 ply · 6 mm · lacquered', role: 'Sets the air volume and how long the drum rings.' });
    for (const s of [1, -1]) part({ id: `ring${s}`, name: `Reinforcement ring, ${s > 0 ? 'top' : 'bottom'}`, cat: 'shell',
      obj: g(lathe([[R - 0.0066, s * (HY - 0.004)], [R - 0.0066, s * (HY - 0.022)], [R - 0.0126, s * (HY - 0.022)], [R - 0.0126, s * (HY - 0.004)], [R - 0.0066, s * (HY - 0.004)]], M.maple)),
      explode: V(0, s * 0.07, 0), delay: 0.36, desc: 'A narrow hoop of maple glued inside each edge. It keeps the shell round and makes the bearing edge stiffer.', spec: 'Maple · 16 mm', role: 'Keeps the shell round.' });
    const vent = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0022, 10, 24), M.chrome); vent.position.copy(at(Math.PI, R + 0.001, 0)); vent.rotation.y = Math.PI / 2;
    part({ id: 'vent', name: 'Air vent', cat: 'hardware', obj: g(vent), explode: out(Math.PI, 0.1), delay: 0.3,
      desc: 'A small hole through the shell with a chrome grommet. When the stick pushes the batter head in, air escapes here instead of choking the head.', spec: 'Chrome grommet', role: 'Lets the drum breathe.' });
    const bs = new THREE.Shape(); bs.absellipse(0, 0, 0.022, 0.03, 0, Math.PI * 2);
    const badge = H.extrude(bs, 0, 0.0012, M.brass); badge.position.copy(at(Math.PI, R + 0.0002, 0)); badge.rotation.y = -Math.PI / 2;
    part({ id: 'badge', name: 'Badge', cat: 'hardware', obj: g(badge), explode: out(Math.PI, 0.16), delay: 0.32,
      desc: 'A brass plate round the vent. Makers stamp their name and the serial number here; this one is left plain.', spec: 'Brass', role: 'Identity.' });

    /* lugs, rods, washers */
    for (let i = 0; i < LUGS; i++) {
      const a = lugA(i);
      const tube = H.rod(at(a, R + 0.022, -0.045), at(a, R + 0.022, 0.045), 0.0078, M.chrome, 18);
      const p1 = H.rod(at(a, R, 0.034), at(a, R + 0.02, 0.034), 0.0042, M.chrome, 12), p2 = H.rod(at(a, R, -0.034), at(a, R + 0.02, -0.034), 0.0042, M.chrome, 12);
      const cap1 = new THREE.Mesh(new THREE.SphereGeometry(0.0078, 16, 8), M.chrome); cap1.position.copy(at(a, R + 0.022, 0.045));
      const cap2 = cap1.clone(); cap2.position.copy(at(a, R + 0.022, -0.045));
      part({ id: `lug${i}`, name: `Lug ${i + 1}`, cat: 'hardware', obj: g(tube, p1, p2, cap1, cap2), explode: out(a, 0.12), delay: 0.25,
        desc: 'A chrome tube bolted to the shell with two small posts. Threaded inserts at each end take a tension rod from the top and one from the bottom.', spec: 'Chrome-plated brass, tube style', role: 'Anchors the tension rods.' });
      for (const s of [1, -1]) {
        const ear = at(a, R + 0.022, s * (HY + 0.016));
        const rod = H.rod(at(a, R + 0.022, s * 0.03), ear.clone().add(V(0, s * 0.011, 0)), 0.0024, M.chrome, 10);
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.007, s > 0 ? 4 : 6), M.chrome); head.position.copy(ear).add(V(0, s * 0.015, 0)); head.rotation.y = a;
        part({ id: `rod${s > 0 ? 'T' : 'B'}${i}`, name: `Tension rod, ${s > 0 ? 'top' : 'bottom'} ${i + 1}`, cat: 'tension', obj: g(rod, head), explode: out(a, 0.06).add(V(0, s * 0.32, 0)), delay: 0,
          desc: `A threaded steel rod through the ${s > 0 ? 'top' : 'bottom'} hoop into the lug. Turning it pulls the hoop down and the head tighter. Ten round each head, tightened a little at a time across the drum, like a car wheel.`,
          spec: '7/32" thread, square drum-key head', role: 'Tunes the head.' });
        const wash = new THREE.Mesh(new THREE.CylinderGeometry(0.0072, 0.0072, 0.0015, 18), M.chrome); wash.position.copy(ear).add(V(0, s * 0.0102, 0));
        part({ id: `washer${s > 0 ? 'T' : 'B'}${i}`, name: `Washer, ${s > 0 ? 'top' : 'bottom'} ${i + 1}`, cat: 'tension', obj: g(wash), explode: out(a, 0.05).add(V(0, s * 0.27, 0)), delay: 0.03,
          desc: 'A flat washer under the rod head. It spreads the load on the hoop and lets the rod turn smoothly.', spec: 'Steel, nylon-faced', role: 'Bearing surface.' });
      }
    }

    /* hoops */
    const hoop = (s) => {
      const y0 = s * (HY - 0.004), prof = s > 0
        ? [[R + 0.004, y0], [R + 0.0115, y0], [R + 0.0115, y0 + 0.0025], [R + 0.007, y0 + 0.004], [R + 0.007, y0 + 0.024], [R + 0.0035, y0 + 0.026], [R + 0.004, y0]]
        : [[R + 0.004, y0], [R + 0.0035, y0 - 0.026], [R + 0.007, y0 - 0.024], [R + 0.007, y0 - 0.004], [R + 0.0115, y0 - 0.0025], [R + 0.0115, y0], [R + 0.004, y0]];
      const o = g(lathe(prof, M.chrome, 160));
      for (let i = 0; i < LUGS; i++) { const a = lugA(i); const ear = H.box(0.018, 0.003, 0.016, M.chrome); ear.position.copy(at(a, R + 0.02, s * (HY + 0.0155))); ear.rotation.y = -a; o.add(ear); }
      return o;
    };
    part({ id: 'hoopT', name: 'Batter hoop', cat: 'hoops', obj: hoop(1), explode: V(0, 0.22, 0), delay: 0.07,
      desc: 'A triple-flanged steel hoop that presses the head\'s collar down over the bearing edge. Its rolled top edge is what you hit for a rim shot.',
      spec: 'Steel, 2.3 mm, triple flange', role: 'Holds and tensions the top head.' });
    part({ id: 'hoopB', name: 'Snare-side hoop', cat: 'hoops', obj: hoop(-1), explode: V(0, -0.22, 0), delay: 0.07,
      desc: 'The bottom hoop. It has two small notches, the snare gates, where the snare cords pass under it.', spec: 'Steel, 2.3 mm, triple flange', role: 'Holds the bottom head.' });

    /* heads: the batter head's film can ripple */
    const hu = { uAmp: { value: 0 }, uT: { value: 0 }, uHit: { value: new THREE.Vector2(0, 0) } };
    const coated = M.coated.clone(); coated.userData.unique = true;
    coated.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, hu);
      sh.vertexShader = 'uniform float uAmp; uniform float uT; uniform vec2 uHit;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        `#include <begin_vertex>
        float rr = length(position.xy) / ${R.toFixed(4)};
        float dh = length(position.xy - uHit) / ${R.toFixed(4)};
        float edge = max(0.0, 1.0 - rr * rr);
        transformed.z += uAmp * edge * (exp(-dh * 9.0) * 1.4 + 0.5 * sin(dh * 15.0 - uT * 70.0) * exp(-uT * 9.0)) * cos(uT * 120.0);`);
    };
    coated.customProgramCacheKey = () => 'snarehead';
    const film = new THREE.Mesh(new THREE.CircleGeometry(R - 0.002, 96, 0, Math.PI * 2), coated); film.rotation.x = -Math.PI / 2; film.position.y = HY + 0.0008;
    const collar = (s) => lathe(s > 0 ? [[R - 0.002, HY + 0.0008], [R + 0.002, HY - 0.001], [R + 0.004, HY - 0.012], [R + 0.0065, HY - 0.012], [R + 0.0065, HY - 0.002], [R + 0.003, HY + 0.003], [R - 0.002, HY + 0.0016]]
      : [[R - 0.002, -HY - 0.0008], [R + 0.002, -HY + 0.001], [R + 0.004, -HY + 0.012], [R + 0.0065, -HY + 0.012], [R + 0.0065, -HY + 0.002], [R + 0.003, -HY - 0.003], [R - 0.002, -HY - 0.0016]], M.chrome);
    film.userData.batter = true;
    part({ id: 'batter', name: 'Batter head', cat: 'heads', obj: g(film, collar(1)), explode: V(0, 0.15, 0), delay: 0.1,
      desc: 'The top skin you hit: a sheet of polyester film 0.25 mm thick, sprayed with a rough white coating for brushes, glued into an aluminium flesh hoop.',
      spec: 'Coated polyester, single ply · 10 mil', role: 'The surface that makes the note.' });
    const res = new THREE.Mesh(new THREE.CircleGeometry(R - 0.002, 96), M.clear); res.rotation.x = Math.PI / 2; res.position.y = -HY - 0.0008;
    part({ id: 'reso', name: 'Snare-side head', cat: 'heads', obj: g(res, collar(-1)), explode: V(0, -0.15, 0), delay: 0.1,
      desc: 'The bottom skin, very thin (0.075 mm) and clear, so it moves easily and throws the snare wires against itself.',
      spec: 'Clear polyester · 3 mil', role: 'Drives the snare wires.' });

    /* snare wires and the throw-off */
    const WY = -HY - 0.0045, wires = new THREE.Group();
    for (let i = 0; i < 20; i++) {
      const x = -0.05 + i * (0.1 / 19);
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 0.3, 6, 1), M.wire); w.rotation.x = Math.PI / 2; w.position.set(x, WY, 0); wires.add(w);
    }
    const wirePart = part({ id: 'wires', name: 'Snare wires', cat: 'wires', obj: g(wires), explode: V(0, -0.38, 0), delay: 0.12,
      desc: 'Twenty coiled steel wires stretched across the bottom head. When the head moves they buzz against it: that bright rattle is the snare sound.',
      spec: '20 strands, coiled carbon steel · 14"', role: 'The crack and sizzle.' });
    const plates = [];
    for (const s of [1, -1]) {
      const pl = H.box(0.11, 0.0022, 0.012, M.chrome, 0, WY, s * 0.155);
      plates.push(part({ id: `plate${s}`, name: `Wire end plate, ${s > 0 ? 'throw-off end' : 'butt end'}`, cat: 'wires', obj: g(pl), explode: V(0, -0.38, s * 0.05), delay: 0.12,
        desc: 'A chrome plate the wires are soldered to at each end.', spec: 'Chrome-plated steel', role: 'Holds the strands in line.' }));
      const c1 = H.rod(V(-0.03, WY, s * 0.16), V(-0.03, -HY - 0.006, s * (R + 0.016)), 0.0012, M.cord, 6), c2 = H.rod(V(0.03, WY, s * 0.16), V(0.03, -HY - 0.006, s * (R + 0.016)), 0.0012, M.cord, 6);
      part({ id: `cord${s}`, name: `Snare cord, ${s > 0 ? 'throw-off end' : 'butt end'}`, cat: 'wires', obj: g(c1, c2), explode: V(0, -0.33, s * 0.1), delay: 0.1,
        desc: 'A loop of cord (or plastic strap) from the end plate, under the hoop through the snare gate, to the throw-off or butt plate.', spec: 'Braided cord', role: 'Attaches the wires.' });
    }
    const strBody = H.box(0.022, 0.05, 0.014, M.chrome, 0, -0.025, R + 0.007);
    const lever = new THREE.Group(); lever.position.set(0, -0.003, R + 0.016);
    const lv = H.box(0.012, 0.045, 0.006, M.dark, 0, -0.022, 0.002); lever.add(lv);
    part({ id: 'strainer', name: 'Throw-off body', cat: 'strainer', obj: g(strBody), explode: V(0, 0, 0.13), delay: 0.15,
      desc: 'The mechanism bolted to the shell that holds one end of the snare wires. It lets you tighten them, or drop them away from the head.', spec: 'Die-cast, chrome', role: 'Switches the snares on and off.' });
    const leverPart = part({ id: 'lever', name: 'Throw-off lever', cat: 'strainer', obj: g(lever), explode: V(0, 0.02, 0.2), delay: 0.14,
      desc: 'Flip it down and the wires drop away: the drum sounds like a high tom. Flip it up and the wires spring back against the head.', spec: 'Steel', role: 'Snares on or off.' });
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 20), M.dark); knob.position.set(0, 0.008, R + 0.007);
    part({ id: 'knob', name: 'Tension knob', cat: 'strainer', obj: g(knob), explode: V(0, 0.08, 0.15), delay: 0.12,
      desc: 'Fine adjustment for the wires: tighter gives a short, crisp snare; looser gives a longer, washy buzz.', spec: 'Knurled, threaded', role: 'Snare tension.' });
    part({ id: 'butt', name: 'Butt plate', cat: 'strainer', obj: g(H.box(0.022, 0.03, 0.01, M.chrome, 0, -0.04, -R - 0.005)), explode: V(0, 0, -0.13), delay: 0.15,
      desc: 'The fixed anchor for the other end of the snare cords, opposite the throw-off.', spec: 'Chrome', role: 'Fixed end of the wires.' });

    /* a stick, for playing */
    const stick = new THREE.Group();
    const tStick = H.grain('#d8b07a', '#9b6c3c', { stripes: 50, wobble: 0.2, seed: 13 });
    const sm = new THREE.Mesh(new THREE.LatheGeometry([[0, -0.003], [0.0045, 0], [0.0062, 0.01], [0.0035, 0.025], [0.006, 0.12], [0.0072, 0.25], [0.0072, 0.405], [0, 0.406]].map(([r, y]) => new THREE.Vector2(r, y)), 20), new THREE.MeshStandardMaterial({ map: tStick, roughness: 0.6 }));
    sm.castShadow = true; stick.add(sm);
    const holder = new THREE.Group(); holder.matrixAutoUpdate = false; holder.add(stick); stick.visible = false;

    /* playing */
    let snaresOn = true, hitT = 9, wireJit = 0, stickT = 9, stickAt = V(0, HY, 0), rim = false;
    const hit = ({ x = 0.0, z = 0.03, kind = 'centre' } = {}) => {
      const d = Math.min(1, Math.hypot(x, z) / R);
      rim = kind === 'rim';
      studio.sound.snare({ vel: 0.9, snares: snaresOn, rim, edge: kind === 'edge' ? 1 : d * 0.8 });
      hu.uHit.value.set(x, -z); hitT = 0; wireJit = snaresOn ? 1 : 0.2;
      stickAt.set(rim ? x * 0.96 : x, HY + (rim ? 0.02 : 0.002), z); stickT = 0;
      studio.ui.flash?.(kind === 'rim' ? 'Rim shot' : kind === 'edge' ? 'Near the edge: more ring' : snaresOn ? 'Centre: snares on' : 'Centre: snares off');
    };
    const setSnares = (on) => { snaresOn = on; panel.querySelector('[data-k="snares"]').setAttribute('aria-pressed', String(on)); panel.querySelector('[data-k="snares"]').textContent = on ? 'Snares on' : 'Snares off'; studio.ui.flash?.(on ? 'Snares on' : 'Snares off: it rings like a tom'); };
    const panel = document.createElement('div'); panel.className = 'playpanel';
    panel.innerHTML = '<button type="button" class="pp-main" data-k="centre">Hit centre</button><button type="button" data-k="edge">Near edge</button><button type="button" data-k="rim">Rim shot</button><button type="button" data-k="snares" aria-pressed="true">Snares on</button><span class="pp-note">Tap the head · Space hit · R rim · S snares</span>';
    panel.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return; studio.sound.ensure();
      if (b.dataset.k === 'snares') setSnares(!snaresOn);
      else hit({ x: b.dataset.k === 'centre' ? 0.01 : b.dataset.k === 'edge' ? 0.13 : 0.172, z: b.dataset.k === 'centre' ? 0.03 : 0.04, kind: b.dataset.k });
    });
    // a disc over the head to catch taps in play mode
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.012, R + 0.012, 0.03, 48), new THREE.MeshBasicMaterial({ visible: false }));
    pad.position.y = HY + 0.012; pad.userData.playTarget = { head: true };
    const padHolder = new THREE.Group(); padHolder.matrixAutoUpdate = false; padHolder.add(pad);

    return {
      ready() { holder.matrix.copy(studio.root.matrixWorld); padHolder.matrix.copy(studio.root.matrixWorld); studio.stage.add(holder, padHolder); studio.ui.setPlayPanel?.(panel); },
      mode(m) { stick.visible = m === 'play'; studio.controls.enabled = m !== 'play'; studio.ui.showPlay?.(m === 'play'); },
      pickList(mode) { return mode === 'play' ? [pad] : null; },
      pointer(kind, ev, h) {
        if (studio.mode !== 'play' || kind !== 'down' || !h) return;
        studio.sound.ensure();
        const p = pad.worldToLocal(h.point.clone());
        const r = Math.hypot(p.x, p.z);
        hit({ x: p.x, z: p.z, kind: r > R - 0.004 ? 'rim' : r > R * 0.65 ? 'edge' : 'centre' });
      },
      click() { return studio.mode === 'play'; },
      key(ev) {
        if (studio.mode !== 'play') { if (ev.key === ' ' && !ev.repeat) { studio.setMode('play'); studio.sound.ensure(); hit(); return true; } return false; }
        if (ev.key === ' ') { hit({ x: (Math.random() - 0.5) * 0.04, z: 0.03 }); return true; }
        if (ev.key === 'r' || ev.key === 'R') { hit({ x: 0.172, z: 0.04, kind: 'rim' }); return true; }
        if (ev.key === 's' || ev.key === 'S') { setSnares(!snaresOn); return true; }
        return false;
      },
      tick(dt) {
        holder.matrix.copy(studio.root.matrixWorld); holder.matrixWorldNeedsUpdate = true;
        padHolder.matrix.copy(studio.root.matrixWorld); padHolder.matrixWorldNeedsUpdate = true;
        hitT += dt; hu.uT.value = hitT; hu.uAmp.value = hitT < 0.6 ? 0.0028 * Math.exp(-hitT * 11) : 0;
        wireJit = Math.max(0, wireJit - dt * 4);
        wires.position.y = (snaresOn ? 0 : -0.006) + (wireJit > 0 ? Math.sin(hitT * 260) * 0.0006 * wireJit : 0);
        lever.rotation.x += ((snaresOn ? 0 : 1.1) - lever.rotation.x) * Math.min(1, dt * 12);
        // the stick: up, a quick drop onto the hit point, bounce back
        stickT += dt;
        const lift = stickT < 0.05 ? 1 - stickT / 0.05 : Math.min(1, (stickT - 0.05) / 0.25);
        stick.position.copy(stickAt).add(V(0.09 + 0.05 * lift, 0.002 + lift * 0.11, 0.13 + 0.03 * lift));
        stick.rotation.set(0, 0, 0);
        stick.lookAt(stick.position.clone().add(V(0.4, 0.15 + lift * 0.3, 0.5)));
        stick.rotateX(Math.PI / 2);
      },
      async demo(alive, wait) {
        studio.setMode('play'); await wait(1200);
        const groove = [['centre', 0], ['centre', 0], ['rim', 0], ['centre', 0], ['edge', 0], ['centre', 0], ['rim', 0], ['centre', 0]];
        for (const [k] of groove) { if (!alive()) return; hit({ x: k === 'centre' ? 0.01 : k === 'edge' ? 0.13 : 0.172, z: 0.03, kind: k }); await wait(260); }
        if (!alive()) return; setSnares(false); await wait(300);
        for (let i = 0; i < 4; i++) { if (!alive()) return; hit({ x: 0.02, z: 0.03 }); await wait(240); }
        setSnares(true);
        if (alive()) studio.setMode('overview');
      },
      actions: [{ label: 'Play', id: 'play', toggle: () => studio.setMode(studio.mode === 'play' ? 'overview' : 'play'), pressed: () => studio.mode === 'play' }],
      hoverText(hp) { return hp?.head ? 'Tap the centre for crack, near the edge for ring, the hoop for a rim shot' : null; },
    };
  },
};
