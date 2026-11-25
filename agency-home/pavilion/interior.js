import * as T from './vendor/three.webgpu.min.js';
import {woolThrow} from './drape.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';

export function furnishRoom({scene,mesh,box,cylinder,softgoods,chair,cloth,oak,plaster,metal,limestone,print,linenBump,evalFloor,pillows,pillowNormal}){
 const neutral=new T.MeshStandardMaterial({color:0x88857b,roughness:.94});
 const thread=new T.MeshStandardMaterial({color:0xbdb8a9,roughness:.95});
 const slip=cloth.clone();slip.color.set(0xf0eee6);
 const bolster=cloth.clone();bolster.color.set(0xb9b7aa);
 const v=(x,y,z)=>new T.Vector3(x,y,z);
 function rounded(x,y,z,w,h,d,r,m){return mesh(new RoundedBoxGeometry(w,h,d,4,r),m,x,y,z)}
 function pad(name,x,y,z,w,h,d,m,rot=0,tilt=0){
  const src=softgoods.scene.getObjectByName(name),g=src.geometry.clone();g.computeBoundingBox();const size=g.boundingBox.getSize(v());
  g.scale(w/size.x,h/size.y,d/size.z);const o=mesh(g,m,x,y,z);o.rotation.set(rot,0,tilt);return o
 }
 // The oak frame is separate from the upholstery. Each seat carries its own rolled edge.
 const sx=3.42,sz=-1.32;
 rounded(sx,.275,sz,2.91,.112,.865,.026,oak);rounded(sx,.34,sz-.012,2.78,.15,.827,.051,slip);rounded(sx,.643,sz-.404,2.78,.60,.107,.046,slip);
 for(const xx of [sx-1.31,sx+1.31])for(const zz of [sz-.309,sz+.309]){
  const leg=cylinder(xx,.158,zz,.039,.033,.235,oak,18);leg.rotation.z=(xx>sx?-.05:.05)
 }
 for(const side of [-1,1]){
  const xx=sx+side*.666,seat=pad('TailoredSeat',xx,.435,sz+.005,1.322,.235,.89,slip);
  // The original seat mesh carries a compressed rim. Cord follows the piping return.
  const points=[];for(let i=0;i<=88;i++){const th=i/88*Math.PI*2,a=Math.cos(th),b=Math.sin(th);
   points.push(v(xx+.633*Math.sign(a)*Math.abs(a)**.22,.425+.007*Math.sin(th*2+.2),sz+.420*Math.sign(b)*Math.abs(b)**.24))}
  const curve=new T.CatmullRomCurve3(points,true);mesh(new T.TubeGeometry(curve,90,.0038,5,true),thread);
  rounded(sx+side*1.424,.529,sz-.023,.182,.407,.88,.077,slip);
 }
 // Two slouched backs are derived from different fabric scans, with their original creases and seam normal.
 const source=pillows.scene.children.filter(n=>n.isMesh);
 const softBack=(idx,x,y,z,size,rotation,m)=>{
  const n=source[idx%source.length];const g=n.geometry.clone();g.applyMatrix4(n.matrix);g.computeBoundingBox();const bb=g.boundingBox;
  const cent=bb.getCenter(v()),dim=bb.getSize(v());g.translate(-cent.x,-cent.y,-cent.z);g.scale(size[0]/dim.x,size[1]/dim.y,size[2]/dim.z);
  const textile=m.clone();textile.normalMap=pillowNormal;textile.normalScale.set(.55,.55);const body=mesh(g,textile,x,y,z);body.rotation.set(...rotation);return body
 };
 softBack(0,sx-.66,.766,sz-.275,[1.28,.63,.30],[-.16,-.035,-.025],slip);
 softBack(1,sx+.60,.765,sz-.279,[1.26,.61,.32],[-.19,.029,.018],slip);
 softBack(1,sx+.96,.676,sz-.073,[.465,.45,.245],[-.19,-.24,-.19],bolster);
 woolThrow(mesh,cloth);
 // A single low chair leaves a clear line from the entrance to the corner glazing.
 const o=chair.scene.clone(true);const bb=new T.Box3().setFromObject(o),sz3=bb.getSize(v()),factor=.83/sz3.y;
 o.traverse(n=>{if(!n.isMesh)return;n.material=n.material.clone();n.material.roughness=.84;n.material.envMapIntensity=.73;n.castShadow=n.receiveShadow=true});
 o.scale.setScalar(factor);o.rotation.y=-1.84;o.position.set(5.88,.070-bb.min.y*factor,.26);scene.add(o);
 const jute=new T.MeshStandardNodeMaterial({map:cloth.map,roughness:.98,normalMap:linenBump,normalScale:new T.Vector2(.20,.20)});
 const uv=T.TSL.uv();const threads=uv.y.mul(2900).sin().mul(.021).add(uv.x.mul(2300).sin().mul(.015)).add(1);
 const border=uv.x.min(T.TSL.float(1).sub(uv.x)).mul(4.24).min(uv.y.min(T.TSL.float(1).sub(uv.y)).mul(2.36));const selvedge=border.greaterThan(.034).and(border.lessThan(.055)).select(T.TSL.float(.78),T.TSL.float(1));
 jute.colorNode=T.TSL.texture(cloth.map).rgb.mul(T.TSL.color(0xc3bfb0)).mul(evalFloor.pow(1.65)).mul(threads).mul(selvedge);
 const rug=rounded(3.72,.078,.02,4.24,.017,2.36,.008,jute);rug.rotation.y=-.035;
 // Elliptical stone slab has a softened arris and a recessed, twin oak pedestal.
 const shape=new T.Shape();shape.absellipse(0,0,.81,.439,0,2*Math.PI,false,0);
 const g=new T.ExtrudeGeometry(shape,{depth:.043,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.012,bevelThickness:.007,curveSegments:52});g.rotateX(-Math.PI/2);
 const tableOak=oak.clone();tableOak.color.set(0xa58f73);const top=mesh(g,tableOak,3.64,.382,.19);top.rotation.y=-.17;
 for(const x of [3.27,4.0]){const leg=rounded(x,.236,.19,.073,.29,.48,.02,oak);leg.rotation.y=-.17}
 const ceramic=new T.MeshPhysicalMaterial({color:0x817d72,roughness:.47,clearcoat:.13,clearcoatRoughness:.35});
 const bowl=mesh(new T.LatheGeometry([[0,0],[.045,0],[.052,.012],[.083,.027],[.132,.052],[.143,.066],[.144,.073],[.137,.075],[.125,.064],[.070,.036],[0,.019]].map(([x,y])=>new T.Vector2(x,y)),80),ceramic,3.92,.437,.20);
 const cover=rounded(3.39,.456,.23,.292,.039,.218,.003,neutral);cover.rotation.y=.14;
 const paper=rounded(3.389,.455,.23,.282,.027,.216,.002,new T.MeshStandardMaterial({color:0xe3ddd0,roughness:.92}));paper.rotation.y=.14;
 // A framed public 16A drawing is an in-room link in the visual story.
 const mount=new T.MeshStandardMaterial({color:0xe9e4d7,roughness:.97});
 const fz=-.63,fy=1.63,fw=.94,fh=1.20,fx=7.039;
 box(fx,fy,fz,.036,fh,fw,oak);box(fx-.023,fy,fz,.012,fh-.039,fw-.039,mount);
 const art=new T.MeshStandardMaterial({map:print,color:0xddd9cf,roughness:.99});const leaf=mesh(new T.PlaneGeometry(.66,.86),art,fx-.034,fy,fz);leaf.rotation.y=-Math.PI/2;
 // The softly lit reveal physically returns into the window opening.
 for(const x of [1.78,5.56])box(x,1.65,-2.047,.116,1.57,.151,plaster);
 for(const y of [.887,2.423])box(3.67,y,-2.047,3.91,.085,.151,plaster);
 box(3.67,.91,-2.001,3.83,.039,.218,oak);
 return {sx,sz};
}
