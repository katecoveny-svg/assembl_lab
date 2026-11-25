import * as T from './vendor/three.webgpu.min.js';

// The gravel finish follows the released procedural grade. Pile locations and ground elevations are retained.
export function deckGarden({scene,mesh,box,grade,trim,grit}){
 const treated=trim.clone();treated.color.setHex(0xb8a08b);treated.userData={grain:true,repeatMetres:2.4};
 // Recessed lining and a shadow rebate let the blackened beam ends read below the clean fascia.
 for(let i=0;i<16;i++)box(0,-.232,2.215+i*.145,14.21,.021,.141,treated);
 const screen=trim.clone();screen.color.setHex(0x76624f);screen.userData={grain:true,repeatMetres:2.4};
 // Only the two western bays have a batten screen. The eastern bays expose the posts and bearers.
 for(let j=0;j<2;j++)for(let i=0;i<15;i++){const x=-6.97+j*1.7+i*.104,z=4.155,base=grade(x,z)+.15,top=-.27;
  box(x,(top+base)/2,z,.034,top-base,.051,screen)}
 box(-5.40,-.283,4.115,3.3,.065,.032,screen);
 // Screened local aggregate: a fine mineral surface and occasional larger stones catch the light.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
 let seed=2519;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 ctx.fillStyle='#998979';ctx.fillRect(0,0,256,256);
 for(let i=0;i<12000;i++){const x=rand()*256,y=rand()*256,r=.35+rand()*2.3,g=88+Math.round(rand()*96);
  ctx.fillStyle='rgb('+g+','+(g-6)+','+(g-19)+')';ctx.beginPath();ctx.ellipse(x,y,r,r*(.41+.50*rand()),rand()*Math.PI,0,Math.PI*2);ctx.fill()}
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=6;
 const plane=new T.PlaneGeometry(1,1,82,42),p=plane.attributes.position,uv=plane.attributes.uv,c=[];
 for(let i=0;i<p.count;i++){
  const u=uv.getX(i),v=uv.getY(i),x=-7.44+u*15.06;
  const edge=4.86+.14*Math.sin(x*.82)+.07*Math.sin(x*2.05),z=-2.5+v*(edge+2.5);
  p.setXYZ(i,x,grade(x,z)+.042,z);uv.setXY(i,x/.64,z/.64);
  const nearest=Math.min(...[-7,-5.3,-3.6,-1.9,-.2,.2,1.9,3.6,5.3,7].map(px=>Math.hypot(x-px,z-4.3)));
  const contact=.50+.50*T.MathUtils.smoothstep(nearest,0,.51);
  const openness=(.30+.33*T.MathUtils.smoothstep(z,3.05,4.95)+.09*T.MathUtils.smoothstep(Math.abs(x),5.6,7.52))*contact;
  c.push(openness,openness*.98,openness*.95)
 }
 plane.setAttribute('color',new T.Float32BufferAttribute(c,3));plane.computeVertexNormals();
 const bed=mesh(plane,new T.MeshStandardMaterial({map,vertexColors:true,roughness:.96,side:T.DoubleSide}));bed.castShadow=false;
 const bankStone=new T.MeshStandardMaterial({color:0x807d70,roughness:.96,map});
 const stoneGeo=new T.IcosahedronGeometry(1,2),stonePos=stoneGeo.attributes.position;
 for(let i=0;i<stonePos.count;i++){const x=stonePos.getX(i),y=stonePos.getY(i),z=stonePos.getZ(i);
  const n=1+.12*Math.sin(x*7+z*2)*Math.cos(y*5);stonePos.setXYZ(i,x*n,y*n,z*n)}stoneGeo.computeVertexNormals();
 for(const [x,z] of [[-5.74,4.66],[-5.37,4.46],[-.98,4.41],[-.62,4.69],[3.07,4.55],[3.52,4.52],[5.76,4.05]]){
  const rock=mesh(stoneGeo,bankStone,x,grade(x,z)+.11,z);rock.scale.set(.20+rand()*.14,.13+rand()*.06,.16+rand()*.09);rock.rotation.set(.13,rand()*6.28,.06)
 }
 const pebble=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:0xa49b8b,roughness:.92}),380),tmp=new T.Object3D();
 for(let i=0;i<pebble.count;i++){const x=-7.25+rand()*14.6,z=3.72+rand()*1.05;tmp.position.set(x,grade(x,z)+.05,z);tmp.scale.set(.012+rand()*.027,.009+rand()*.011,.012+rand()*.026);tmp.rotation.y=rand()*6.28;tmp.updateMatrix();pebble.setMatrixAt(i,tmp.matrix)}pebble.receiveShadow=true;scene.add(pebble);
}
