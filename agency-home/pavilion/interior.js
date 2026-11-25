import {linenSofa} from './upholstery.js';
import * as T from './vendor/three.webgpu.min.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';

export function furnishRoom({scene,mesh,box,cylinder,chair,cloth,oak,plaster,metal,limestone,print,linenBump,evalFloor}){
 const neutral=new T.MeshStandardMaterial({color:0x88857b,roughness:.94});
 const v=(x,y,z)=>new T.Vector3(x,y,z);
 function rounded(x,y,z,w,h,d,r,m){return mesh(new RoundedBoxGeometry(w,h,d,4,r),m,x,y,z)}
 const sx=3.42,sz=-1.32;
 linenSofa({mesh,cylinder,cloth,oak});

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
