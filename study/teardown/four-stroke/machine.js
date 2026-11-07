/* The four-stroke engine's geometry, built from code at real size (1 unit = 1 cm), and pose(state), which moves it.
   Every pose comes from the model's state; nothing is keyframed. Part sizes and their labels are in
   four-stroke.parts.md. Crank axis on z (front = +z), cylinder axis on y (up), crank centre at the origin. */
import {r as R_MM, l as L_MM, SPEC, clearance, AREA} from './model.js';

const D2R = Math.PI / 180;
const r = R_MM / 10; // 2.25 cm crank radius
const l = L_MM / 10; // 7.5 cm rod
const BORE = SPEC.bore / 20; // 3.4 cm radius
const CROWN = 1.8; // pin to crown, cm (assumed)
const HC = clearance(SPEC.cr) / AREA / 10; // clearance gap at 9.0 : 1, cm
const DECK = r + l + CROWN + HC; // underside of the head at 9.0 : 1, cm
const LINER_BASE = 4.2; // top of the crankcase

export function build(kit) {
  const {THREE, COLOURS: C} = kit;
  const M = (c, o) => kit.mat(c, o);
  // a hollow tube (or ring) about y, from y0 to y1
  const tube = (rIn, rOut, y0, y1, seg = 64) =>
    new THREE.LatheGeometry([new THREE.Vector2(rIn, y0), new THREE.Vector2(rOut, y0), new THREE.Vector2(rOut, y1), new THREE.Vector2(rIn, y1), new THREE.Vector2(rIn, y0)], seg);
  const alongZ = (g) => g.rotateX(Math.PI / 2);
  const box = (w, h, d, x, y, z, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
  };

  // ------------------------------------------------------------ block and head (the shell)
  const caseG = new THREE.Group();
  const caseM = M(C.blush);
  const W = 0.35;
  caseG.add(box(11.2, W, 8.4, 0, -4.0 + W / 2, 0, caseM)); // floor
  caseG.add(box(W, 8.2, 8.4, -5.6 + W / 2, 0.1, 0, caseM));
  caseG.add(box(W, 8.2, 8.4, 5.6 - W / 2, 0.1, 0, caseM));
  caseG.add(box(11.2, 8.2, W, 0, 0.1, -4.2 + W / 2, caseM));
  caseG.add(box(11.2, 8.2, W, 0, 0.1, 4.2 - W / 2, caseM));
  const top = new THREE.Shape();
  top.moveTo(-5.6, -4.2);
  top.lineTo(5.6, -4.2);
  top.lineTo(5.6, 4.2);
  top.lineTo(-5.6, 4.2);
  top.lineTo(-5.6, -4.2);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 4.1, 0, Math.PI * 2, true);
  top.holes.push(hole);
  const topG = new THREE.ExtrudeGeometry(top, {depth: W, bevelEnabled: false, curveSegments: 48}).rotateX(-Math.PI / 2);
  const topM = new THREE.Mesh(topG, caseM);
  topM.position.y = LINER_BASE - W;
  caseG.add(topM);
  for (const z of [-4.25, 4.25]) {
    const boss = new THREE.Mesh(alongZ(tube(0.98, 1.7, -0.3, 0.3, 40)), caseM);
    boss.position.z = z;
    caseG.add(boss);
  }
  kit.part('crankcase', caseG, {sub: 'shell', explode: [0, -10, 0], order: 0, cut: 'all'});

  const cylG = new THREE.Group();
  const cylM = M(C.paleRose);
  const liner = new THREE.Mesh(tube(BORE + 0.02, 4.1, 0, 1), cylM);
  liner.position.y = LINER_BASE;
  cylG.add(liner);
  for (let y = 5.4; y < DECK - 0.4; y += 0.62) {
    const fin = new THREE.Mesh(tube(4.1, 5.5, y, y + 0.16, 56), cylM);
    cylG.add(fin);
  }
  kit.part('cylinder', cylG, {sub: 'shell', explode: [0, 15, 0], order: 4, cut: 'all', edgeAngle: 35});

  const headG = new THREE.Group();
  const headM = M(C.blush);
  headG.add(box(10.0, 3.2, 8.8, 0, DECK + 1.6, 0, headM));
  headG.add(box(6.8, 3.5, 3.8, 0, DECK + 3.2 + 1.75, 0, headM)); // cam housing
  for (let i = 0; i < 4; i++) headG.add(box(10.6, 0.14, 9.2, 0, DECK + 0.45 + i * 0.7, 0, headM)); // head fins
  kit.part('head', headG, {sub: 'shell', explode: [0, 23, 0], order: 5, cut: 'all'});

  const portM = M(C.paleRose);
  const portIn = new THREE.Group();
  const pIn = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 2.8, 36).rotateZ(Math.PI / 2), portM);
  pIn.position.set(-6.3, DECK + 1.5, 0);
  portIn.add(pIn);
  const fIn = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 36).rotateZ(Math.PI / 2), portM);
  fIn.position.set(-7.6, DECK + 1.5, 0);
  portIn.add(fIn);
  kit.part('intakePort', portIn, {sub: 'shell', explode: [-10, 0, 0], order: 8, cut: 'all'});
  const portEx = new THREE.Group();
  const pEx = pIn.clone();
  pEx.position.x = 6.3;
  const fEx = fIn.clone();
  fEx.position.x = 7.6;
  portEx.add(pEx, fEx);
  kit.part('exhaustPort', portEx, {sub: 'shell', explode: [10, 0, 0], order: 8, cut: 'all'});

  // ------------------------------------------------------------ crank train
  const crank = new THREE.Group();
  const crankM = M(C.mauve, {rough: 0.6});
  crank.add(new THREE.Mesh(alongZ(new THREE.CylinderGeometry(0.95, 0.95, 12.2, 40)).translate(0, 0, 0.4), crankM)); // journal, flywheel to the output end
  const web = new THREE.Shape();
  web.absarc(0, 0, 2.8, 200 * D2R, 340 * D2R, false); // counterweight: 2.8 cm clears the piston skirt at BDC by 2.5 mm
  web.lineTo(1.25, r);
  web.absarc(0, r, 1.25, 0, Math.PI, false);
  web.lineTo(2.8 * Math.cos(200 * D2R), 2.8 * Math.sin(200 * D2R));
  for (const z of [-1.45, 0.9]) {
    const w = new THREE.Mesh(new THREE.ExtrudeGeometry(web, {depth: 0.55, bevelEnabled: false, curveSegments: 24}), crankM);
    w.position.z = z;
    crank.add(w);
  }
  const pin = new THREE.Mesh(alongZ(new THREE.CylinderGeometry(0.82, 0.82, 1.9, 32)), crankM);
  pin.position.y = r;
  crank.add(pin);
  const fly = new THREE.Mesh(alongZ(new THREE.CylinderGeometry(3.7, 3.7, 0.8, 64)), M(C.blush)); // 3.7 cm keeps it above the floor
  fly.position.z = -5.2;
  crank.add(fly);
  const flyMark = box(0.5, 0.8, 0.86, 0, 3.15, -5.2, M(C.roseInk));
  crank.add(flyMark);
  kit.part('crankshaft', crank, {sub: 'crank', explode: [0, -2, 11], order: 1, cut: true});
  kit.anchor('crank', crank, [0, r, 0.9]);
  kit.anchor('flywheel', crank, [0, 3.2, -4.8]);

  const rod = new THREE.Group();
  const rodM = M(C.mist, {rough: 0.6});
  rod.add(new THREE.Mesh(alongZ(tube(0.84, 1.32, -0.35, 0.35, 40)), rodM));
  const small = new THREE.Mesh(alongZ(tube(0.56, 0.9, -0.35, 0.35, 36)), rodM);
  small.position.y = l;
  rod.add(small);
  rod.add(box(0.78, l - 2.1, 0.5, 0, l / 2 - 0.1, 0, rodM));
  kit.part('rod', rod, {sub: 'crank', explode: [8, 2, 8], order: 2, cut: true});
  kit.anchor('rod', rod, [0.4, l / 2, 0.25]);

  const piston = new THREE.Group();
  const pistonM = M(C.roseMauve);
  piston.add(new THREE.Mesh(new THREE.CylinderGeometry(BORE - 0.04, BORE - 0.04, 4.0, 56).translate(0, CROWN - 2.0, 0), pistonM));
  const ringM = M(C.ink);
  for (const y of [1.55, 1.25, 0.95]) piston.add(new THREE.Mesh(new THREE.TorusGeometry(BORE - 0.03, 0.045, 6, 64).rotateX(Math.PI / 2).translate(0, y, 0), ringM));
  piston.add(new THREE.Mesh(alongZ(new THREE.CylinderGeometry(0.55, 0.55, 5.8, 28)), M(C.mist)));
  kit.part('piston', piston, {sub: 'crank', explode: [0, 13, 0], order: 3, cut: true});
  kit.anchor('piston', piston, [-(BORE - 0.05), 0.9, 0]);

  // ------------------------------------------------------------ valve train (a simplified direct-acting overhead cam)
  const VX = 1.55;
  const valveM = M(C.mist, {rough: 0.55});
  const valve = (x, name, explode) => {
    const g = new THREE.Group();
    const prof = [[0.001, 0], [1.25, 0], [1.25, 0.16], [0.3, 0.75], [0.26, 0.9], [0.26, 4.6], [0.001, 4.6]].map(([a, b]) => new THREE.Vector2(a, b));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 40), valveM));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.14, 32).translate(0, 4.2, 0), valveM)); // spring retainer
    g.position.set(x, DECK, 0);
    const holder = new THREE.Group();
    holder.add(g);
    kit.part(name, holder, {sub: 'valves', explode, order: 6, cut: true});
    return g;
  };
  const vIn = valve(-VX, 'intakeValve', [-5, 27, 0]);
  const vEx = valve(VX, 'exhaustValve', [5, 27, 0]);
  kit.anchor('intake', vIn, [-1.25, 0.08, 0]);
  kit.anchor('exhaust', vEx, [1.25, 0.08, 0]);

  const L0 = 1.9; // free length of the spring between its seat and the retainer, cm
  const helix = new (class extends THREE.Curve {
    getPoint(t, o = new THREE.Vector3()) {
      const a = t * Math.PI * 2 * 6;
      return o.set(0.55 * Math.cos(a), t, 0.55 * Math.sin(a));
    }
  })();
  const springM = M(C.mauve);
  const spring = (x, name, explode) => {
    const holder = new THREE.Group();
    const s = new THREE.Mesh(new THREE.TubeGeometry(helix, 220, 0.065, 6, false), springM);
    s.position.set(x, DECK + 2.3, 0);
    holder.add(s);
    kit.part(name, holder, {sub: 'valves', explode, order: 6, cut: true, edges: false});
    return s;
  };
  const sIn = spring(-VX, 'intakeSpring', [-5, 27, 0]);
  const sEx = spring(VX, 'exhaustSpring', [5, 27, 0]);

  // cam lobes: base circle 0.6 cm plus a sin² nose of 0.6 cm (the 6 mm lift), 90° of cam wide
  const BASE = 0.6;
  const LIFT = 0.6;
  const lobe = new THREE.Shape();
  for (let i = 0; i <= 180; i++) {
    const a = -Math.PI + (i / 180) * Math.PI * 2;
    const u = (a + Math.PI / 4) / (Math.PI / 2);
    const rho = BASE + (u >= 0 && u <= 1 ? LIFT * Math.sin(Math.PI * u) ** 2 : 0);
    const px = rho * Math.sin(a);
    const py = -rho * Math.cos(a);
    i ? lobe.lineTo(px, py) : lobe.moveTo(px, py);
  }
  const lobeG = new THREE.ExtrudeGeometry(lobe, {depth: 0.5, bevelEnabled: false}).translate(0, 0, -0.25).rotateY(Math.PI / 2);
  const cam = new THREE.Group();
  const camM = M(C.mauve, {rough: 0.6});
  cam.position.set(0, DECK + 4.6 + BASE, 0);
  cam.add(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 6.4, 28).rotateZ(Math.PI / 2), camM));
  const lobeIn = new THREE.Mesh(lobeG, camM);
  lobeIn.position.x = -VX;
  lobeIn.rotation.x = -45 * D2R; // nose down at θ = 90°, the intake's peak lift
  const lobeEx = new THREE.Mesh(lobeG, camM);
  lobeEx.position.x = VX;
  lobeEx.rotation.x = -315 * D2R; // nose down at θ = 630°, the exhaust's peak lift
  cam.add(lobeIn, lobeEx);
  const camHolder = new THREE.Group();
  camHolder.add(cam);
  kit.part('camshaft', camHolder, {sub: 'valves', explode: [0, 31, 0], order: 7, cut: true});
  kit.anchor('cam', cam, [3.2, 0, 0]);

  // ------------------------------------------------------------ the charge and the spark
  const plug = new THREE.Group();
  const plugM = M(C.ivory);
  const metal = M(C.mist);
  plug.add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 3.3, 24).translate(0, 1.6, 0), metal)); // threaded body
  plug.add(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.7, 6).translate(0, 3.55, 0), metal)); // hex
  plug.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 2.0, 24).translate(0, 4.9, 0), plugM)); // insulator
  plug.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 16).translate(0, 6.1, 0), metal)); // terminal
  plug.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12).translate(0, -0.1, 0), metal)); // electrode
  plug.position.set(0, DECK, -3.0);
  const plugHolder = new THREE.Group();
  plugHolder.add(plug);
  kit.part('plug', plugHolder, {sub: 'charge', explode: [0, 9, -12], order: 8, cut: false});
  kit.anchor('plug', plug, [0, 6.2, 0]);

  const charge = new THREE.Mesh(new THREE.CylinderGeometry(BORE - 0.06, BORE - 0.06, 1, 48).translate(0, 0.5, 0), M(C.paleRose, {opacity: 0.55}));
  const chargeHolder = new THREE.Group();
  chargeHolder.add(charge);
  kit.part('charge', chargeHolder, {sub: 'charge', order: 9, cut: 'all', hideApart: true, edgeOpacity: 0.4, edgeAngle: 40});
  const chargeAnchor = kit.anchor('charge', charge, [BORE * 0.7, 0.5, 0]);

  const lerpCol = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
  return {
    pose(s) {
      const th = s.theta * D2R;
      const shift = s.headShift / 10; // cm the head sits above or below its 9.0 : 1 place
      const deck = DECK + shift;
      crank.rotation.z = -th;
      const pinY = (r * Math.cos(th) + Math.sqrt(l * l - (r * Math.sin(th)) ** 2));
      rod.position.set(r * Math.sin(th), r * Math.cos(th), 0);
      rod.rotation.z = s.phi * D2R;
      piston.position.y = pinY;
      liner.scale.y = deck - LINER_BASE;
      headG.position.y = shift;
      portIn.position.y = shift;
      portEx.position.y = shift;
      plug.position.y = deck;
      vIn.position.y = deck - s.liftIn / 10;
      vEx.position.y = deck - s.liftEx / 10;
      sIn.position.y = deck + 2.3;
      sEx.position.y = deck + 2.3;
      sIn.scale.y = L0 - s.liftIn / 10;
      sEx.scale.y = L0 - s.liftEx / 10;
      cam.position.y = deck + 4.6 + BASE;
      cam.rotation.x = s.cam * D2R;
      const crown = pinY + CROWN;
      charge.position.y = crown + 0.03; // a hair off the crown and the head, so the faces do not fight
      charge.scale.y = Math.max(0.01, deck - crown - 0.06);
      chargeAnchor.position.y = 0.5;
      // the one accent: the part doing the work right now
      kit.hot('intakeValve', s.liftIn > 0.2);
      kit.hot('exhaustValve', s.liftEx > 0.2);
      kit.hot('plug', s.sparking);
      kit.hot('piston', s.strokeIndex === 2 && s.p > 1.5);
      const tint = s.charge === 'fresh' ? C.paleRose : s.charge === 'compressed' ? C.rose : s.charge === 'burning' ? C.roseInk
        : s.charge === 'expanding' ? lerpCol(C.roseInk, C.mist, Math.min(1, (s.theta - 360) / 180)) : C.mist;
      kit.tint('charge', tint);
    },
  };
}
