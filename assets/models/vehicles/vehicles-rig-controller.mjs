// assembl generic vehicles: rig controller for assets/models/vehicles/<body>.glb (contract "assembl.vehicles.v1").
// A pure visual adapter. It owns no listing data, price or availability: the stock page tells it which body and which paint,
// and it poses the model. It refuses a model that does not carry the contracted nodes.
//
// glTF axes (see vehicles-rig-contract.json): +X nose, +Y up, +Z the vehicle's right side; origin at ground centre.
//   setYaw(rad)            turntable: VEHICLE_ROOT about +Y
//   setWheelRotation(rad)  all four WHEEL_* about the axle (glTF Z); positive = rolling forward (so rotation.z = -rad)
//   setSteer(rad)          STEER_FL / STEER_FR about +Y; positive = steering to the left
//   setPaint(key)          the PAINT material's colour, metalness and roughness from the contract's colourways
//                          (one mesh per body, never a duplicated mesh per colour); clearcoat is kept from the GLB
export const VEHICLE_CONTRACT = "assembl.vehicles.v1";
export const REQUIRED_NODES = ["VEHICLE_ROOT", "BODY", "BODY_DETAIL", "STEER_FL", "STEER_FR", "HUB_RL", "HUB_RR", "WHEEL_FL", "WHEEL_FR", "WHEEL_RL", "WHEEL_RR"];
const WHEELS = ["WHEEL_FL", "WHEEL_FR", "WHEEL_RL", "WHEEL_RR"];

export function checkContract(contract, body) {
  if (!contract || contract.contract !== VEHICLE_CONTRACT) throw new Error(`vehicle contract ${contract && contract.contract} is not ${VEHICLE_CONTRACT}`);
  if (body && !(contract.vehicles && contract.vehicles[body])) throw new Error(`no vehicle "${body}" in the contract`);
  return contract;
}

export function createVehicleRig(root, contract) {
  checkContract(contract);
  const nodes = {};
  for (const name of REQUIRED_NODES) {
    const o = root.getObjectByName(name);
    if (!o) throw new Error(`vehicle model is missing node ${name}`);
    nodes[name] = o;
  }
  const paintMats = new Set();
  root.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) if (m && m.name === (contract.paint_material || "PAINT")) paintMats.add(m); });
  if (!paintMats.size) throw new Error("vehicle model has no PAINT material");
  const rest = { yaw: nodes.VEHICLE_ROOT.rotation.y };
  let paint = null;
  const rig = {
    nodes, paintMaterials: [...paintMats],
    setYaw(rad) { nodes.VEHICLE_ROOT.rotation.y = rad; },
    setWheelRotation(rad) { for (const w of WHEELS) nodes[w].rotation.z = -rad; },
    setSteer(rad) { const r = Math.max(-0.6, Math.min(0.6, rad)); nodes.STEER_FL.rotation.y = r; nodes.STEER_FR.rotation.y = r; },
    setPaint(key) {
      const p = contract.paints && contract.paints[key];
      if (!p) throw new Error(`unknown paint "${key}"`);
      for (const m of paintMats) { m.color.set(p.hex); m.metalness = p.metallic; m.roughness = p.roughness; m.needsUpdate = true; }
      paint = key;
    },
    get paint() { return paint; },
    reset() { rig.setYaw(rest.yaw); rig.setWheelRotation(0); rig.setSteer(0); },
  };
  return rig;
}

// The listing's colour name (stock.json `colour`) to a contracted paint key; unknown colours fall back to silver.
export function paintForColour(contract, colour) {
  const want = String(colour || "").toLowerCase();
  for (const [k, p] of Object.entries(contract.paints || {})) if (p.label.toLowerCase() === want) return k;
  return "silver";
}
