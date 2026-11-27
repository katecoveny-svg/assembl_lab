// Eye and gaze share a timeline but take different paths. Heights are relative to the
// house datum; the second sliding bay is open at x -2.02, z -7.98.
const stations = [
  [0,    [-8.55,1.42,.38],     [-3.75,1.43,-9.85]],
  [.21,  [-6.82,1.52,-2.48],   [-3.74,1.39,-9.98]],
  [.42,  [-4.10,1.66,-5.24],   [-3.12,1.42,-10.44]],
  [.60,  [-2.53,1.71,-6.80],   [-2.61,1.35,-11.21]],
  [.73,  [-2.02,1.72,-7.98],   [-2.84,1.31,-11.25]],
  [.86,  [-2.55,1.68,-8.43],   [-2.12,1.18,-11.21]],
  [1,    [-3.39,1.65,-8.82],   [-1.48,1.10,-10.94]]
];
export const gardenView = [...stations[0][1], ...stations[0][2]];
export const roomView = [...stations.at(-1)[1], ...stations.at(-1)[2]];
export const duration = 12800;

function slope(index, group, axis) {
  const previous=stations[Math.max(0,index-1)], next=stations[Math.min(stations.length-1,index+1)];
  return (next[group][axis]-previous[group][axis])/(next[0]-previous[0]);
}
export function journeyPose(progress) {
  const p=Math.min(1, Math.max(0, progress));
  const t=p*p*(3-2*p);
  const index=stations.findIndex((station,i)=>i<stations.length-1 && t<=stations[i+1][0]);
  const a=stations[index], b=stations[index+1], span=b[0]-a[0], u=(t-a[0])/span;
  const u2=u*u,u3=u2*u;
  function interpolate(group) {
    return a[group].map((v,axis)=>(2*u3-3*u2+1)*v+(u3-2*u2+u)*span*slope(index,group,axis)
      +(-2*u3+3*u2)*b[group][axis]+(u3-u2)*span*slope(index+1,group,axis));
  }
  return [...interpolate(1),...interpolate(2)];
}

// Walkable floor inside the existing coastal fit-out. Keep a shoulder's clearance
// around the sofa, coffee table and dining chairs; stop at the first obstruction.
export function walkable(x,z) {
  if (z < -11.74 || z > -8.15 || x < -3.87 || x > 1.24) return false;
  if (z < -10.20 && x < -1.25) return false;
  if (z < -9.47 && z > -11.73 && x > -.93 && x < 1.10) return false;
  return ((x+2.72)/.72)**2 + ((z+9.58)/.61)**2 > 1;
}
export function reachable(from,to) {
  const steps=Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1])/.06);
  let last=from;
  for(let i=1;i<=steps;i++) {
    const t=i/steps, x=from[0]+(to[0]-from[0])*t, z=from[1]+(to[1]-from[1])*t;
    if(!walkable(x,z))break;
    last=[x,z];
  }
  return last;
}
