// Bake hemisphere visibility against the published 16C triangle mesh. No runtime ray tracing.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '../pavilion/assets');
const input = zlib.gunzipSync(fs.readFileSync(path.join(root, 'section16c.bin.gz')));
const count = input.readUInt32LE(0), indexCount = input.readUInt32LE(4);
const xyz = new Float32Array(count * 3), normal = new Float32Array(count * 3);
for (let i = 0; i < count; i++) {
  for (let k = 0; k < 3; k++) {
    xyz[i*3+k] = input.readInt16LE(8+i*12+k*2) / 1000;
    normal[i*3+k] = input.readInt8(8+i*12+6+k) / 127;
  }
}
const idx = new Uint32Array(input.buffer, input.byteOffset + 8 + count*12, indexCount);
const size = 384, density = 19, scale = size/density;
const u = new Float32Array(count), v = new Float32Array(count), h = new Float32Array(count);
const depth = new Float32Array(size*size), vis = new Float32Array(count), weights = new Float32Array(count);
const floorSize = 192, floor = new Float32Array(floorSize*floorSize);
const N = 28, sunSamples=18, sunVertex=new Float32Array(count),sunFloor=new Float32Array(floor.length);
const groundSize=256, ground=new Float32Array(groundSize*groundSize);
for (let ray = 0; ray < N+sunSamples; ray++) {
  const sun=ray>=N,az0=ray*2.39996323;
  let az=az0,y=(ray+.5)/N;
  if(sun){const ring=Math.sqrt((ray-N+.5)/sunSamples);az=-2.42+Math.cos(az0)*.36*ring;y=.81+Math.sin(az0)*.17*ring}
  const r=Math.sqrt(1-y*y),x=r*Math.cos(az),z=r*Math.sin(az);
  const ux = -Math.sin(az), uz=Math.cos(az), vx=-uz*y, vy=r, vz=ux*y;
  function project(px,py,pz) {
    px-=5;py-=.85;pz-=2.2;
    return [size/2+(px*ux+pz*uz)*scale, size/2+(px*vx+py*vy+pz*vz)*scale, px*x+py*y+pz*z];
  }
  for (let i=0;i<count;i++) [u[i],v[i],h[i]]=project(xyz[i*3],xyz[i*3+1],xyz[i*3+2]);
  depth.fill(-1e6);
  for (let i=0;i<idx.length;i+=3) {
    const a=idx[i],b=idx[i+1],c=idx[i+2], x0=u[a],y0=v[a],xb=u[b]-x0,yb=v[b]-y0,xc=u[c]-x0,yc=v[c]-y0;
    const det=xb*yc-yb*xc;if (Math.abs(det)<.00001) continue;
    const lowX=Math.max(0,Math.floor(Math.min(x0,u[b],u[c]))),highX=Math.min(size-1,Math.ceil(Math.max(x0,u[b],u[c])));
    const lowY=Math.max(0,Math.floor(Math.min(y0,v[b],v[c]))),highY=Math.min(size-1,Math.ceil(Math.max(y0,v[b],v[c])));
    for (let sy=lowY;sy<=highY;sy++) for (let sx=lowX;sx<=highX;sx++) {
      const xx=sx+.5-x0,yy=sy+.5-y0,wb=(xx*yc-yy*xc)/det,wc=(xb*yy-yb*xx)/det;
      if (wb<0 || wc<0 || wb+wc>1) continue;
      const d=h[a]+wb*(h[b]-h[a])+wc*(h[c]-h[a]), at=sy*size+sx;
      if(d>depth[at])depth[at]=d;
    }
  }
  function openness(px,py,pz){
    const gap=depth[Math.floor(py)*size+Math.floor(px)]-pz;
    if(!Number.isFinite(gap)||gap<.055)return 1;
    return .07+.57*Math.min(1,gap/3);
  }
  for(let i=0;i<count;i++){
    const w=Math.max(.035,normal[i*3]*x+normal[i*3+1]*y+normal[i*3+2]*z);
    if(sun)sunVertex[i]+=openness(u[i],v[i],h[i]);else{weights[i]+=w;vis[i]+=w*openness(u[i],v[i],h[i])}
  }
  for(let j=0;j<floorSize;j++)for(let i=0;i<floorSize;i++){
    const point=project(10.8*(i+.5)/floorSize,.035,6*(j+.5)/floorSize);
    if(sun)sunFloor[j*floorSize+i]+=openness(...point);else floor[j*floorSize+i]+=y*openness(...point);
  }
  if(sun)for(let j=0;j<groundSize;j++)for(let i=0;i<groundSize;i++){
    const point=project(-6+(i+.5)*22/groundSize,-1.52,-8+(j+.5)*20/groundSize);
    ground[j*groundSize+i]+=openness(...point);
  }
}
const output=Buffer.alloc(4+count*2+floor.length*2+ground.length);output.writeUInt32LE(count);
for(let i=0;i<count;i++)output[4+i]=Math.round(255*vis[i]/weights[i]);
for(let i=0;i<floor.length;i++)output[4+count+i]=Math.min(255,Math.round(255*floor[i]/(N/2)));
let offset=4+count+floor.length;
for(let i=0;i<count;i++)output[offset+i]=Math.round(255*sunVertex[i]/sunSamples);
offset+=count;
for(let i=0;i<floor.length;i++)output[offset+i]=Math.round(255*sunFloor[i]/sunSamples);
offset+=floor.length;
for(let i=0;i<ground.length;i++)output[offset+i]=Math.round(255*ground[i]/sunSamples);
const baked=zlib.gzipSync(output,{level:9});fs.writeFileSync(path.join(root,'section16c-light.bin.gz'),baked);console.log('Baked visibility bytes',baked.length);
