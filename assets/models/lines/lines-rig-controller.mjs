/** Pure visual adapter for the straight-line machine's Blender tanks (assembl.lines.v1).
 * No timer, no flow integration, no random values and no lesson state of its own.
 * study/m/lines.js computes litres with lev(m, c, t) and passes them in; this file only maps
 * litres to metres (1 L = 10 mm in a 0.40 m x 0.25 m tank) and poses the named nodes.
 */
export const LINES_CONTRACT = 'assembl.lines.v1';
export const METRES_PER_LITRE = 0.01;
export const FULL_LITRES = 100;
export const FULL_HEIGHT_M = FULL_LITRES * METRES_PER_LITRE;
const FLOAT_REST_M = 0.023; // float rests on its stop collar below 2.3 L

const finite = (x, f) => Number.isFinite(x) ? x : f;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/** litres -> water height above the interior floor, in metres (display clamp 0..100 L, as the existing drawing). */
export function levelMetres(litres) {
  return clamp(finite(litres, 0), 0, FULL_LITRES) * METRES_PER_LITRE;
}

/** Throws unless the contract is the one this adapter implements. */
export function checkContract(contract) {
  if (!contract || contract.contract !== LINES_CONTRACT) throw new Error('Unsupported lines rig: ' + (contract && contract.contract));
  if (contract.units !== 'metres' || contract.level_mapping?.metres_per_litre !== METRES_PER_LITRE) throw new Error('Lines rig units do not match the adapter');
  return contract;
}

export function createLinesRig(root, contract) {
  checkContract(contract);
  const nodes = {};
  root.traverse(o => { if (o.name) nodes[o.name] = o; });
  for (const n of contract.required_nodes) if (!nodes[n]) throw new Error('Missing lines rig node: ' + n);
  const floorY = contract.level_mapping.floor_y_gltf_m;
  const tanks = {};
  for (const k of ['A', 'B']) {
    const t = contract.tanks[k], get = r => nodes[t[r]];
    const nozzleY = get('nozzle_anchor').position.y;
    tanks[k] = {
      root: nodes[t.root], water: get('water'), float: get('float'), inlet: get('inlet_stream'), drain: get('drain_stream'),
      wheel: get('inlet_handwheel'), lever: get('outlet_lever'), label: get('label_anchor'), floor: get('floor_anchor'), nozzleY,
      rest: { wheel: get('inlet_handwheel').rotation.y, lever: get('outlet_lever').rotation.y }
    };
  }
  /** Full snapshot for one tank. litres/rate come from the lesson; filling/draining are the lesson's own conditions. */
  function setTank(key, { litres = 0, rate = 0, filling = false, draining = false, visible = true } = {}) {
    const T = tanks[key]; if (!T) throw new Error('Unknown tank ' + key);
    const L = finite(litres, 0), m = finite(rate, 0), h = levelMetres(L);
    T.root.visible = !!visible;
    T.water.visible = L > 0.2;
    T.water.scale.set(1, Math.max(h / FULL_HEIGHT_M, 1e-4), 1);
    T.float.position.y = floorY + Math.max(h, FLOAT_REST_M);
    const fill = !!filling, drain = !!draining;
    T.inlet.visible = fill;
    const rIn = 0.6 + 0.9 * Math.min(1, Math.max(0, m) / 8);
    T.inlet.scale.set(rIn, Math.max(1e-4, (T.nozzleY - (floorY + h)) / (T.nozzleY - floorY)), rIn);
    T.drain.visible = drain;
    const rOut = 0.6 + 0.9 * Math.min(1, Math.max(0, -m) / 8);
    T.drain.scale.set(rOut, 1, rOut);
    T.wheel.rotation.y = T.rest.wheel - Math.min(1, Math.max(0, m) / 8) * 1.5 * Math.PI;
    T.lever.rotation.y = T.rest.lever - Math.min(1, Math.max(0, -m) / 8) * Math.PI / 2;
    return { litres: L, level_m: h, waterTopY: floorY + h, filling: fill, draining: drain };
  }
  for (const k of ['A', 'B']) setTank(k, {});
  return { nodes, tanks, setTank, floorY };
}
