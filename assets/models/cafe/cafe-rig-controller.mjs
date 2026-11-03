/** Café venue rig (contract assembl.cafe.v1). Two pure functions, no timers, randomness, queue logic or business state.
 *
 * - visualStateFromModel(K, d, S, t, view) READS the existing café model (the CAFE script in cafe/index.html: K is CAFE,
 *   d is the running day, S the settings, t the simulated minute) and returns the few values the venue shows. It uses the
 *   same rules as the procedural maquette, so both graphics show the same state. It never writes to d or S.
 * - createCafeRig(root, THREE).setVisualState(v) applies those values to named GLB nodes: visibility, a handful of pivots,
 *   one scale and emissive levels. Nothing here can change a queue, an order or a number on the page.
 */
export const CONTRACT = 'assembl.cafe.v1';
export const CAB_ITEMS = ['scone', 'toastie', 'salad', 'brownie', 'muffin'];
export const OUT_TABLES = [10, 11, 12, 13];
const PAD = n => String(n).padStart(2, '0');

export const REQUIRED_NODES = [
  'CAFE_VENUE', 'ESPRESSO_MAIN', 'ESPRESSO_MAIN_PORTAFILTER_L', 'ESPRESSO_MAIN_PORTAFILTER_R', 'ESPRESSO_MAIN_CUP_STACK', 'GRINDER_MAIN',
  'STATION_2', 'QUEUE_ZONE', ...[0, 1, 2, 3, 4, 5].map(i => 'QUEUE_SPOT_' + PAD(i)),
  ...CAB_ITEMS.flatMap(k => [0, 1, 2, 3, 4, 5, 6, 7].map(i => `CAB_${k.toUpperCase()}_${i}`).concat(`CAB_${k.toUpperCase()}_SPECIAL`)),
  'PASS_LAMP_BULB_1', 'PASS_LAMP_BULB_2', 'PASS_LAMP_BULB_3', 'RANGE_FLAME_L', 'RANGE_FLAME_R', 'APP_TABLET_SCREEN', 'HOST_STAND', 'BAR',
  'BIN_FOOD_LID', 'BIN_FOOD_FILL', ...OUT_TABLES.map(i => `UMBRELLA_${PAD(i)}_CANOPY`), ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `PENDANT_${i}_BULB`),
  'AWNING', ...Array.from({ length: 14 }, (_, i) => `TABLE_${PAD(i)}`), ...Array.from({ length: 14 }, (_, i) => `TABLE_${PAD(i)}_CANDLE`),
  'MENU_BOARD_FACE', 'ROSTER_BOARD_FACE', 'DOOR_LEAF'];

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const num = (x, f) => (Number.isFinite(x) ? x : f);

/** Read-only: the visual state the venue shows at minute t. `view` carries page-side presentation values only
 *  (lamp level, smoothed umbrella openness, whether the street view is active), never model state. */
export function visualStateFromModel(K, d, S, t, view = {}) {
  const M = K.MODES[S.mode], cafe = S.mode === 'cafe', trading = t >= M.open && t < M.close;
  const from = Math.max(0, d.next - 260);
  let appNew = false; for (let i = from; i < d.next; i++) { const p = d.parties[i]; if (p.type === 'app' && p.orderAt != null && t - p.orderAt < 1.5) { appNew = true; break; } }
  const cabinet = {}, specials = {};
  for (const k of CAB_ITEMS) { const s = cafe ? Math.max(0, d.stock[k] || 0) : 0; cabinet[k] = Math.min(8, Math.ceil(s / 4)); specials[k] = !!(cafe && d.special[k]); }
  const outOK = K.outdoorOK(d.wx, t, S.mode) && trading;
  return {
    mode: S.mode,
    station: !!(cafe && S.station),
    queue: cafe ? d.counterQ.length : 0,
    drinksQueued: cafe ? d.espQ.length : d.barQ.length,
    kitchenLoad: Math.min(1, d.kitQ.length / 6),
    platesAtPass: d.pass.filter(tk => tk.out < 0 && tk.out !== -2).length,
    trading,
    appNew,
    binKg: d.binKg,
    footpathOpen: outOK,
    umbrellas: view.umbrellas || OUT_TABLES.map(() => (outOK ? 1 : 0)),
    lamps: num(view.lamps, 0),
    streetView: !!view.streetView,
    cabinet, specials,
  };
}

export function createCafeRig(root, THREE) {
  const nodes = {};
  root.traverse(o => { if (o.name && !nodes[o.name]) nodes[o.name] = o; });
  const missing = REQUIRED_NODES.filter(n => !nodes[n]);
  if (missing.length) throw new Error('Missing café rig nodes: ' + missing.join(', '));
  const meshes = o => { const out = []; o.traverse(m => { if (m.isMesh) out.push(m); }); return out; };
  const findMat = name => { let f = null; root.traverse(m => { if (!f && m.isMesh && m.material && m.material.name === name) f = m.material; }); return f; };
  // Clone only the state-driven appearances, so shared GLB materials elsewhere never change.
  const own = (names, emissiveHex) => { const list = names.flatMap(n => meshes(nodes[n])); if (!list.length) return null; const m = list[0].material.clone();
    if (emissiveHex) { m.emissive = new THREE.Color(emissiveHex); m.emissiveIntensity = 0; } list.forEach(x => { x.material = m; }); return m; };
  const mats = {
    pendant: own([0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `PENDANT_${i}_BULB`), '#FFE8C8'),
    heat: own(['PASS_LAMP_BULB_1', 'PASS_LAMP_BULB_2', 'PASS_LAMP_BULB_3'], '#F2B49A'),
    flame: own(['RANGE_FLAME_L', 'RANGE_FLAME_R'], '#9CC2EC'),
    screen: own(['APP_TABLET_SCREEN'], '#BCD3E6'),
  };
  const spots = [0, 1, 2, 3, 4, 5].map(i => nodes['QUEUE_SPOT_' + PAD(i)]);
  const spotFree = meshes(spots[0])[0].material.clone(), blush = findMat('cafe_blush');
  const spotTaken = (blush || spotFree).clone();
  spots.forEach(s => meshes(s).forEach(m => { m.material = spotFree; }));
  const initial = {};
  for (const n of ['ESPRESSO_MAIN_PORTAFILTER_L', 'ESPRESSO_MAIN_PORTAFILTER_R', 'BIN_FOOD_LID', 'BIN_FOOD_FILL', ...OUT_TABLES.map(i => `UMBRELLA_${PAD(i)}_CANOPY`)])
    initial[n] = { rotation: nodes[n].rotation.clone(), scale: nodes[n].scale.clone() };
  const faces = { menu: nodes.MENU_BOARD_FACE, roster: nodes.ROSTER_BOARD_FACE };

  function setVisualState(v = {}) {
    const cafe = v.mode !== 'dinner';
    // mode: café shows the cup stack and the main machine's cups; dinner shows the bar shelves, host stand and candles
    nodes.ESPRESSO_MAIN_CUP_STACK.visible = cafe;
    nodes.BAR.visible = !cafe; nodes.HOST_STAND.visible = !cafe;
    for (let i = 0; i < 14; i++) nodes[`TABLE_${PAD(i)}_CANDLE`].visible = !cafe;
    // Proposed lever "Second grinder and station"
    nodes.STATION_2.visible = cafe && !!v.station;
    // queue: one floor spot per person waiting to order (six spots inside; the rest queue out of the door)
    const q = clamp(Math.floor(num(v.queue, 0)), 0, 99);
    spots.forEach((s, i) => meshes(s).forEach(m => { m.material = i < q ? spotTaken : spotFree; }));
    // espresso: portafilters locked in while coffees are queued, swung out when idle
    const busy = cafe && num(v.drinksQueued, 0) > 0;
    for (const [n, sgn] of [['ESPRESSO_MAIN_PORTAFILTER_L', 1], ['ESPRESSO_MAIN_PORTAFILTER_R', -1]])
      nodes[n].rotation.y = initial[n].rotation.y + (busy ? 0 : sgn * 0.7);
    // kitchen: gas flames with the open-ticket load; heat lamps while plates wait at the pass
    const load = clamp(num(v.kitchenLoad, 0), 0, 1);
    nodes.RANGE_FLAME_L.visible = nodes.RANGE_FLAME_R.visible = load > 0;
    mats.flame.emissiveIntensity = load > 0 ? 0.6 + 0.8 * load : 0;
    mats.heat.emissiveIntensity = num(v.platesAtPass, 0) > 0 ? 1.4 : v.trading ? 0.25 : 0;
    mats.screen.emissiveIntensity = v.appNew ? 1.2 : 0.15;
    mats.pendant.emissiveIntensity = clamp(num(v.lamps, 0), 0, 1) * 1.6;
    // bin: fill height from kilograms, lid open over 22 kg (the maquette's rule)
    const kg = Math.max(0, num(v.binKg, 0)), fillK = clamp(kg / 28, 0.02, 1);
    nodes.BIN_FOOD_FILL.scale.copy(initial.BIN_FOOD_FILL.scale); nodes.BIN_FOOD_FILL.scale.y *= fillK * 0.9;
    nodes.BIN_FOOD_LID.rotation.x = initial.BIN_FOOD_LID.rotation.x + (kg > 22 ? -0.5 : 0);
    // umbrellas: 1 open, 0 folded (radial 0.18, axial 2.0 about the apex)
    const U = Array.isArray(v.umbrellas) ? v.umbrellas : [];
    OUT_TABLES.forEach((ti, i) => { const n = `UMBRELLA_${PAD(ti)}_CANOPY`, u = clamp(num(U[i], 0), 0, 1), r = 0.18 + 0.82 * u, a = 2.0 - u;
      nodes[n].scale.set(initial[n].scale.x * r, initial[n].scale.y * a, initial[n].scale.z * r); });
    nodes.AWNING.visible = !!v.streetView;
    // cabinet: portions from stock, the navy tag while an item is on special
    const cab = v.cabinet || {}, sp = v.specials || {};
    for (const k of CAB_ITEMS) { const n = cafe ? clamp(Math.floor(num(cab[k], 0)), 0, 8) : 0;
      for (let i = 0; i < 8; i++) nodes[`CAB_${k.toUpperCase()}_${i}`].visible = i < n;
      nodes[`CAB_${k.toUpperCase()}_SPECIAL`].visible = cafe && !!sp[k]; }
    return { q, busy, load, fillK };
  }
  /** Boards are drawn live by the page; the GLB only provides the faces (UV 0..1). glTF UVs need flipY = false. */
  function setBoardTexture(which, tex) { const f = faces[which]; if (!f || !tex) return; tex.flipY = false;
    meshes(f).forEach(m => { m.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); }); }
  setVisualState({ mode: 'cafe' });
  return { nodes, mats, setVisualState, setBoardTexture, contract: CONTRACT };
}
