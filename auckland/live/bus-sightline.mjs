// Lightweight sight lines through the same mapped building footprints drawn by the city.
// Only queried for one selected vehicle; GPS and render height are never altered.
export function createBusSightlines(size = 64) {
  const cells = new Map();
  const key = (x,z) => Math.floor(x/size)+':'+Math.floor(z/size);
  return {
    add(points, bottom, top) {
      const xs=points.map(p=>p[0]), zs=points.map(p=>p[1]);
      const x0=Math.min(...xs), x1=Math.max(...xs), z0=Math.min(...zs), z1=Math.max(...zs);
      const item={points,bottom,top,x0,x1,z0,z1};
      for(let x=Math.floor(x0/size);x<=Math.floor(x1/size);x++) for(let z=Math.floor(z0/size);z<=Math.floor(z1/size);z++){
        const k=x+':'+z;
        if(!cells.has(k)) cells.set(k,[]);
        cells.get(k).push(item);
      }
    },
    clear(from,to) {
      const delta=to.map((v,i)=>v-from[i]), steps=Math.max(2,Math.ceil(Math.hypot(...delta)/2));
      for(let n=0;n<=steps;n++) {
        const f=n/steps, [x,y,z]=from.map((v,i)=>v+delta[i]*f);
        for(const b of cells.get(key(x,z)) || []) {
          if(y<b.bottom || y>b.top+.55 || x<b.x0 || x>b.x1 || z<b.z0 || z>b.z1) continue;
          let inside=false;
          for(let i=0,j=b.points.length-1;i<b.points.length;j=i++){
            const [ax,az]=b.points[i], [bx,bz]=b.points[j];
            if ((az>z)!==(bz>z) && x<(bx-ax)*(z-az)/(bz-az)+ax) inside=!inside;
          }
          if(inside) return false;
        }
      }
      return true;
    },
  };
}

export function busCameraPose(to,bearing,distance,pitch,sight) {
  const angles=[0,.73,-.73,1.49,-1.49,2.22,-2.22,Math.PI];
  for(const tilt of [pitch,.64,.89,1.18,1.38]){
    for(const turn of angles){
      const a=bearing+turn, d=Math.cos(tilt)*distance;
      const pose=[to[0]-Math.sin(a)*d,to[1]+Math.sin(tilt)*distance,to[2]+Math.cos(a)*d];
      if(sight.clear(pose,to)) return pose;
    }
  }
  // If the fix itself is inside a building footprint, keep it honest and show it from above.
  return [to[0]-2,to[1]+distance,to[2]+10];
}
