// Stylised maquette cars, four classes (hatch, SUV, ute, van). Real parts and plain card (no marks): body shell (lower + cabin, pillars),
// glazing panels, four wheels with tyres and five-spoke rims, head and tail lights, mirrors, grille, bumpers, sills and the
// one roof stripe that carries the marque tint. Every part is its own geometry so it keeps its own material and the whole
// fleet stays instanced. The profile faces +x; y is up; the car sits on y = 0.
function buildCarKit(THREE, merge) {
  // profile: bonnet → windscreen base → roof → rear → tail, as [x, y]. glass = [cowl x, roof front x, roof rear x, rear belt x]
  // dimensions to the real classes: hatch 4.0 × 1.75 × 1.50 m, SUV 4.6 × 1.85 × 1.70, ute 5.3 × 1.87 × 1.80 with a tray, van 5.0 × 1.90 × 2.00
  // (length × body width × height to the roof skin; mirrors add about 0.2 m each side). sideTo: where the side glass stops (a panel van
  // has glass in the cab doors only).
  const TYPES = {
    hatch: { L: 4.00, W: 1.75, bot: .28, wr: .31, wf: 1.27, wb: -1.27, belt: .93, roof: 1.50,
      top: [[2.00, .50], [2.00, .68], [1.88, .76], [1.25, .86], [.80, .93]], glass: [.80, .12, -1.42, -1.82], tail: [[-1.82, .93], [-1.95, .86], [-2.00, .55]], mirrorX: .58 },
    suv: { L: 4.60, W: 1.85, bot: .38, wr: .36, wf: 1.36, wb: -1.36, belt: 1.10, roof: 1.70,
      top: [[2.30, .60], [2.30, .86], [2.17, .98], [1.50, 1.06], [1.00, 1.10]], glass: [1.00, .28, -1.95, -2.20], tail: [[-2.20, 1.10], [-2.28, 1.00], [-2.30, .62]], mirrorX: .76 },
    ute: { L: 5.30, W: 1.87, bot: .44, wr: .38, wf: 1.62, wb: -1.50, belt: 1.14, roof: 1.80,
      top: [[2.65, .64], [2.65, .92], [2.50, 1.06], [1.70, 1.12], [1.06, 1.14]], glass: [1.06, .40, -.72, -.86],
      tail: [[-.86, 1.14], [-.94, 1.14], [-.94, .74], [-2.58, .74], [-2.58, .70], [-2.65, .66]], tray: [-.94, -2.58, 1.18, .74], mirrorX: .82 },
    van: { L: 5.00, W: 1.90, bot: .34, wr: .35, wf: 1.62, wb: -1.40, belt: 1.18, roof: 2.00,
      top: [[2.50, .58], [2.50, .92], [2.32, 1.06], [1.86, 1.14], [1.64, 1.18]], glass: [1.64, 1.10, -2.40, -2.46], tail: [[-2.46, 1.18], [-2.50, 1.10], [-2.50, .60]], mirrorX: 1.34, sideTo: .02, sideN: 1 } };
  const tri = (a, b, c) => [a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]];
  // a quad from four corners, pushed `off` metres along its own normal so it sits proud of the body's bevelled surface
  const quad = (a, b, c, d, off = 0) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([...tri(a, b, c), ...tri(a, c, d)]), 3)); g.computeVertexNormals();
    if (off) { const n = g.attributes.normal, p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * off, p.getY(i) + n.getY(i) * off, p.getZ(i) + n.getZ(i) * off); } return g; };
  // the body shell: side profile extruded to the width, wheel arches cut out, bevelled edges, cabin narrowed toward the roof
  function body(T) {
    const bt = .06, depth = T.W - 2 * bt, ra = T.wr + .08, s = new THREE.Shape(), [, xrf, xrr, xr] = T.glass;
    s.moveTo(T.top[0][0], T.top[0][1]); T.top.forEach(p => s.lineTo(p[0], p[1]));
    s.lineTo(xrf, T.roof); s.lineTo(xrr, T.roof); s.lineTo(xr, T.belt); T.tail.forEach(p => s.lineTo(p[0], p[1]));
    s.lineTo(-T.L / 2 + .05, T.bot); s.lineTo(T.wb - ra, T.bot); s.absarc(T.wb, T.wr, ra, Math.PI, 0, true); s.lineTo(T.wf - ra, T.bot); s.absarc(T.wf, T.wr, ra, Math.PI, 0, true);
    s.lineTo(T.L / 2 - .06, T.bot); s.lineTo(T.top[0][0], T.top[0][1]);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bt, bevelSize: .055, bevelSegments: 3, curveSegments: 12 }); g.translate(0, 0, -depth / 2);
    const a = g.attributes.position, h = T.roof - T.belt + .05;
    for (let i = 0; i < a.count; i++) { const y = a.getY(i); if (y > T.belt - .05) a.setZ(i, a.getZ(i) * (1 - .10 * Math.min(1, (y - (T.belt - .05)) / h))); }
    g.computeVertexNormals(); return g;
  }
  // glazing: thin panels a hair outside the body surface, so the pillars between them read as body colour
  function glazing(T) {
    // the body is W - .12 wide plus a .055 bevel each side, and narrows 10% from belt to roof; the glass sits 1 cm proud of that
    const [xw, xrf, xrr, xr] = T.glass, out = [], hb = T.W / 2 - .005, wBelt = 2 * (hb - .16), wTop = 2 * (hb * .9 - .12), y0 = T.belt + .012, y1 = T.roof - .03;
    out.push(quad([xw, y0, wBelt / 2], [xw, y0, -wBelt / 2], [xrf, y1, -wTop / 2], [xrf, y1, wTop / 2], .065)); // windscreen
    out.push(quad([xr, y0, -wBelt / 2], [xr, y0, wBelt / 2], [xrr, y1, wTop / 2], [xrr, y1, -wTop / 2], .065)); // rear glass
    const sideEnd = T.sideTo != null ? T.sideTo : xrr, span = xrf - sideEnd, n = T.sideN || (span > 2.3 ? 3 : 2), pillar = .12, inset = .06, step = (span - 2 * inset) / n;
    for (let i = 0; i < n; i++) { const a0 = xrf - inset - step * i - (i ? pillar / 2 : 0), a1 = xrf - inset - step * (i + 1) + (i < n - 1 ? pillar / 2 : 0);
      [1, -1].forEach(sd => { const zb = sd * (hb + .01), zt = sd * (hb * .9 + .012), yb = T.belt + .035, yt = T.roof - .075;
        out.push(quad([a0, yb, zb], [a1, yb, zb], [a1, yt, zt], [a0, yt, zt])); }); }
    return merge(out);
  }
  function wheels(T) { const wz = T.W / 2 - .13, tyres = [], rims = []; [T.wf, T.wb].forEach(x => [wz, -wz].forEach(z => {
      const t = new THREE.CylinderGeometry(T.wr, T.wr, .25, 24).rotateX(Math.PI / 2); t.translate(x, T.wr, z); tyres.push(t);
      const face = z > 0 ? .13 : -.13, rr = T.wr * .62;
      const disc = new THREE.CylinderGeometry(rr * .92, rr * .92, .02, 20).rotateX(Math.PI / 2); disc.translate(x, T.wr, z + face * .9); rims.push(disc);
      const hub = new THREE.CylinderGeometry(rr * .28, rr * .28, .035, 10).rotateX(Math.PI / 2); hub.translate(x, T.wr, z + face); rims.push(hub);
      for (let k = 0; k < 5; k++) { const sp = new THREE.BoxGeometry(.055, rr * .86, .03); sp.translate(0, rr * .45, 0); sp.rotateZ(k * Math.PI * 2 / 5); sp.translate(x, T.wr, z + face); rims.push(sp); } }));
    return { tyres: merge(tyres), rims: merge(rims) }; }
  function lights(T) { const heads = [], tails = [], fy = T.top[1][1] - .06, ty = Math.max(.62, T.tail[1][1] - .14);
    [1, -1].forEach(sd => { const h = new THREE.BoxGeometry(.12, .12, .50); h.translate(T.L / 2 + .02, fy, sd * (T.W / 2 - .36)); heads.push(h);
      const tl = new THREE.BoxGeometry(.10, .14, .34); tl.translate(-T.L / 2 - .01, ty, sd * (T.W / 2 - .30)); tails.push(tl); });
    return { heads: merge(heads), tails: merge(tails) }; }
  // dark trim: grille, bumpers, sill, mirrors, number plate, and for the ute its tray sides, headboard and tailgate
  function trim(T) { const out = [];
    const grille = new THREE.BoxGeometry(.06, .18, T.W - 1.0); grille.translate(T.L / 2 + .02, T.top[0][1] + .12, 0); out.push(grille);
    const bF = new THREE.BoxGeometry(.16, .17, T.W - .04); bF.translate(T.L / 2 + .01, T.bot + .09, 0); out.push(bF);
    const bR = new THREE.BoxGeometry(.16, .17, T.W - .04); bR.translate(-T.L / 2 - .01, T.bot + .09, 0); out.push(bR);
    const ra = T.wr + .08, sill = new THREE.BoxGeometry(T.wf - T.wb - 2 * ra - .1, .12, T.W + .03); sill.translate((T.wf + T.wb) / 2, T.bot + .06, 0); out.push(sill);
    [1, -1].forEach(sd => { const stalk = new THREE.BoxGeometry(.06, .05, .12); stalk.translate(T.mirrorX, T.belt + .09, sd * (T.W / 2 + .02)); out.push(stalk);
      const m = new THREE.BoxGeometry(.10, .12, .20); m.translate(T.mirrorX - .04, T.belt + .11, sd * (T.W / 2 + .14)); out.push(m); });
    const plate = new THREE.BoxGeometry(.02, .12, .36); plate.translate(T.L / 2 + .09, T.bot + .22, 0); out.push(plate);
    if (T.tray) { const [x0, x1, yTop, yFloor] = T.tray; [1, -1].forEach(sd => { const side = new THREE.BoxGeometry(x0 - x1, yTop - yFloor, .07); side.translate((x0 + x1) / 2, (yTop + yFloor) / 2, sd * (T.W / 2 - .10)); out.push(side); });
      const gate = new THREE.BoxGeometry(.07, yTop - yFloor, T.W - .2); gate.translate(x1 + .035, (yTop + yFloor) / 2, 0); out.push(gate);
      const head = new THREE.BoxGeometry(.07, yTop - yFloor + .02, T.W - .2); head.translate(x0 + .035, (yTop + yFloor) / 2, 0); out.push(head); }
    return merge(out); }
  function stripe(T) { const [, xrf, xrr] = T.glass, len = (xrf - xrr) * .78, g = new THREE.BoxGeometry(Math.max(.5, len), .03, .26); g.translate((xrf + xrr) / 2, T.roof + .07, 0); return g; }
  // a soft contact shadow: one textured quad per car, drawn by the scene at ground level (not on the hoist) so a lifted car still
  // darkens the floor under it; the texture is a blurred rounded rectangle the size of the car plus 0.35 m all round
  function shadowTexture() { const c = document.createElement("canvas"); c.width = 128; c.height = 64; const x = c.getContext("2d"); // u along the car's length, v across it
    x.filter = "blur(6px)"; x.fillStyle = "#fff"; const r = 13, x0 = 15, x1 = 113, y0 = 14, y1 = 50; x.beginPath(); x.moveTo(x0 + r, y0); x.arcTo(x1, y0, x1, y1, r); x.arcTo(x1, y1, x0, y1, r); x.arcTo(x0, y1, x0, y0, r); x.arcTo(x0, y0, x1, y0, r); x.fill();
    const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t; }
  const kit = { shadowTex: typeof document !== "undefined" ? shadowTexture() : null };
  Object.keys(TYPES).forEach(k => { const T = TYPES[k], w = wheels(T), l = lights(T);
    const parts = { body: body(T), glass: glazing(T), tyres: w.tyres, rims: w.rims, heads: l.heads, tails: l.tails, trim: trim(T), stripe: stripe(T) };
    // true to the class: scale the whole car (2-4%) so bumper-to-bumper length is L and the roof skin is at the stated height
    let x0 = 1e9, x1 = -1e9, y1 = -1e9; ["body", "trim", "heads", "tails"].forEach(p => { const a = parts[p].attributes.position; for (let i = 0; i < a.count; i++) { x0 = Math.min(x0, a.getX(i)); x1 = Math.max(x1, a.getX(i)); if (p === "body") y1 = Math.max(y1, a.getY(i)); } });
    const fx = T.L / (x1 - x0), fy = T.roof / y1, cx = (x0 + x1) / 2; Object.values(parts).forEach(g => { g.translate(-cx, 0, 0); g.scale(fx, fy, 1); });
    kit[k] = Object.assign(parts, { L: T.L, W: T.W, H: T.roof }); });
  return kit;
}
if (typeof module !== "undefined") module.exports = buildCarKit;
