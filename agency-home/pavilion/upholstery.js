import * as T from './vendor/three.webgpu.min.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';

// Two sewn linen panels share a welt. The fill tapers at all four corners.
export function cushion(width,height,depth,seed){
 const vertices=[],uv=[],indices=[],seam=[];
 const rings=19,longitude=96;
 function point(t,r,face){
  const c=Math.cos(t),s=Math.sin(t),X=Math.sign(c)*Math.abs(c)**.37,Y=Math.sign(s)*Math.abs(s)**.37;
  const x=r*X,y=r*Y,edge=1-r;
  const edgeRoll=.10+.9*Math.sqrt(Math.max(0,1-r**3.7));
  const crease=Math.exp(-edge*6)*Math.sin(edge*29+.8*Math.sin(t*7+seed))*
    (.5+.5*Math.cos(t*14+seed))**7;
  const full=depth*.5*edgeRoll*(1-.12*x*y+.06*Math.sin(t*3+seed)*r*r);
  const sag=.024*(1-x*x)*(y*.5+.5);
  return new T.Vector3(x*width*.5+.013*y*y*Math.sin(seed),y*height*.5-sag,
    face*(full-.013*crease*r)+.009*x*y-.004*Math.cos(t*3+seed)*r*r);
 }
 for(const face of [1,-1]){
  const offset=vertices.length/3;
  for(let j=0;j<=rings;j++)for(let i=0;i<=longitude;i++){
   const t=i/longitude*Math.PI*2,p=point(t,j/rings,face);vertices.push(...p.toArray());
   uv.push(p.x/1.15+.5,p.y/1.15+.5);
   if(j&&i){const a=offset+j*(longitude+1)+i,b=a-1,c=a-longitude-1,d=c-1;
    if(face===1)indices.push(d,b,a,d,a,c);else indices.push(d,a,b,d,c,a)}
  }
 }
 const outer=rings*(longitude+1),back=(rings+1)*(longitude+1)+outer;
 for(let i=0;i<longitude;i++){
  indices.push(outer+i,back+i,outer+i+1,outer+i+1,back+i,back+i+1);
  const pt=point(i/longitude*2*Math.PI,1,1);pt.z-=depth*.045;seam.push(pt);
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
 return {geo,welt:new T.TubeGeometry(new T.CatmullRomCurve3(seam,true),96,.0021,4,true)};
}
export function linenSofa({mesh,cylinder,cloth,oak}){
 const sx=3.42,sz=-1.32,cream=cloth.clone();cream.color.setHex(0xdfd9c9);cream.roughness=.99;cream.sheen=.38;cream.normalScale.set(.32,.32);
 function rounded(x,y,z,w,h,d,r,m){return mesh(new RoundedBoxGeometry(w,h,d,4,r),m,x,y,z)}
 const welt=new T.MeshStandardMaterial({color:0xc3b9a5,roughness:.98});
 const timber=oak.clone();timber.color.setHex(0xbc9872);
 rounded(sx,.204,sz,2.46,.097,.778,.021,timber);
 for(const dx of [-1.05,1.05])for(const dz of [-.31,.31]){const leg=cylinder(sx+dx,.139,sz+dz,.033,.025,.154,timber,16);leg.rotation.z=-Math.sign(dx)*.065}
 rounded(sx,.288,sz,2.36,.125,.805,.035,cream);
 rounded(sx,.595,sz-.366,2.38,.57,.123,.047,cream);
 for(const sign of [-1,1])rounded(sx+sign*1.192,.474,sz+.004,.146,.40,.84,.048,cream);
 function pad(x,y,z,w,h,d,rot,color,seed){
  const mat=cream.clone();mat.color.setHex(color);const parts=cushion(w,h,d,seed);
  for(const [g,m] of [[parts.geo,mat],[parts.welt,welt]]){const o=mesh(g,m,x,y,z);o.rotation.set(...rot)}
 }
 for(const side of [-1,1])pad(sx+side*.55,.394,sz+.023,1.12,.80,.174,[-Math.PI/2,0,0],0xe2ddcf,side+3);
 pad(sx-.53,.678,sz-.222,1.08,.484,.216,[-.20,.021,-.016],0xd4cbbb,4);
 pad(sx+.53,.672,sz-.227,1.076,.465,.22,[-.238,-.018,.027],0xded8c7,9);
 pad(sx+.86,.596,sz-.022,.396,.327,.144,[-.257,-.165,-.119],0x8c9584,15);
}
