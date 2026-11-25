import * as T from './vendor/three.webgpu.min.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {cushion} from './upholstery.js';

// Layout inside the existing western bay. The opening beside the bed connects to the kitchen aisle.
export function bedroom({mesh,box,cylinder,oak,cloth,metal,limestone,glow,basketWeave}){
 const material=(colour,rough=.8)=>new T.MeshStandardMaterial({color:colour,roughness:rough});
 const dyed=(m,c)=>{const a=m.clone();a.color.setHex(c);return a};
 const ivory=dyed(cloth,0xe5dccc),sheet=dyed(cloth,0xe9e4d7),clay=dyed(cloth,0x8a7061),walnut=dyed(oak,0x8b7260),chalk=material(0xbcae9f),brass=material(0x9a8262,.36);
 const rounded=(x,y,z,w,h,d,r,m)=>mesh(new RoundedBoxGeometry(w,h,d,3,r),m,x,y,z);
 // A shallow pocket-door jamb leaves a visible opening. The leaf is parked inside the wall.
 const wallX=-3.89;
 box(wallX,1.405,-.765,.108,2.68,2.61,chalk);
 box(wallX,1.405,1.845,.108,2.68,.32,chalk);
 box(wallX,2.48,1.112,.108,.52,1.145,chalk);
 for(const z of [.539,1.684])box(wallX,1.14,z,.14,2.15,.027,walnut);
 box(wallX,2.21,1.112,.14,.03,1.145,walnut);
 box(wallX,1.13,.568,.045,2.10,.032,walnut);
 const bedX=-5.98,bedZ=-.30;
 rounded(bedX,.198,bedZ,2.01,.213,1.48,.038,walnut);
 rounded(bedX,.302,bedZ,2.075,.118,1.61,.036,walnut);
 rounded(bedX,.446,bedZ,2.032,.235,1.56,.076,sheet);
 // Continuous soft headboard with a slim timber reveal against a limewashed end wall.
 // Limewash gets a little cooler away from the façade and darkens toward the skirting.
 const plaster=new T.MeshStandardNodeMaterial({roughness:.96});
 const pos=T.TSL.positionWorld;
 plaster.colorNode=T.TSL.color(0xcfc0ac).mul(T.TSL.smoothstep(-1.9,1.9,pos.z).mul(.26).add(.72)).mul(T.TSL.smoothstep(.05,1.3,pos.y).mul(.14).add(.86));
 box(-7.052,1.45,-.04,.034,2.76,4.06,plaster);
 const walnutWall=dyed(oak,0x847065);walnutWall.userData={grain:true,repeatMetres:2.25};
 for(let i=0;i<25;i++)box(-7.004,.638,-1.97+(i+.5)*.155,.032,1.14,.153,walnutWall);
 box(-6.985,1.217,-.04,.076,.028,3.88,walnutWall);
 rounded(-6.954,.711,bedZ,.111,.89,2.31,.045,walnut);
 const padded=dyed(cloth,0xa99c82);padded.map=basketWeave.clone();padded.map.repeat.set(2.8,5);padded.map.needsUpdate=true;
 for(let k=0;k<6;k++)rounded(-6.900,.714,bedZ+(k-2.5)*.365,.092,.802,.36,.043,padded);
 for(const z of [-.65,.07]){
  const inner=cushion(.696,.477,.185,11);
  for(const [g,m] of [[inner.geo,dyed(cloth,0xcfc5b4)],[inner.welt,sheet]]){const o=mesh(g,m,-6.81,.765,z);o.rotation.order='YXZ';o.rotation.y=Math.PI/2;o.rotation.x=-.42}

  const pad=cushion(.655,.443,.142,z>0?17:6);
  for(const [geo,m] of [[pad.geo,ivory],[pad.welt,dyed(cloth,0xc6bbac)]]){
   const o=mesh(geo,m,-6.70,.705,z);o.rotation.order='YXZ';o.rotation.y=Math.PI/2;o.rotation.x=-.82;o.rotation.z=z>0?.035:-.018;
  }
 }
 // A sewn duvet overhangs both long edges and turns over at the foot; the folds are geometry.
 function textile(x0,x1,halfWidth,height,drop,m,folded=false){
  const g=new T.PlaneGeometry(1,1,72,64),p=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){
   const u=uv.getX(i),v=uv.getY(i)*2-1,side=Math.abs(v),over=Math.max(0,(side-.80)/.20),toe=Math.max(0,(u-.89)/.11);
   const f=.004*Math.sin(v*11+u*7+.65*Math.cos(u*6))+.003*Math.sin(v*19-u*8);
   const ridgeAxis=v+.17*Math.sin(u*5)-.04;
   const loft=.016*Math.cos(v*9.0-u*3.6)*Math.sin(u*4+.8)+.014*Math.exp(-((ridgeAxis+.47)**2)/.004)-.012*Math.exp(-((ridgeAxis+.40)**2)/.006);
   const ridges=loft+.016*Math.exp(-((v-.33+.45*u)**2)/.009)+.021*Math.exp(-((v+.41-.24*u)**2)/.015);
   const z=bedZ+Math.sign(v)*halfWidth*(Math.min(side,.80)/.80)+Math.sign(v)*(.057+.007*Math.sin(u*25))*Math.sin(over*Math.PI*.5);
   let x=x0+(x1-x0)*Math.min(u/.89,1)+.045*Math.sin(toe*Math.PI*.5);
   x+=.007*Math.sin(v*7.5+u*2);
   const y=height+f+ridges-(drop+.029*Math.sin(u*17+v))*over**1.24-(folded?.031:.13)*toe**1.26+.009*Math.sin(u*23+side)*over;
   p.setXYZ(i,x,y,z);uv.setXY(i,u*1.75,(v+1)*.77)
  }
  g.computeVertexNormals();m.side=T.DoubleSide;mesh(g,m);
 }
 textile(-6.44,-4.94,.775,.608,.215,ivory);
 const runner=clay.clone();runner.map=basketWeave.clone();runner.map.repeat.set(3.5,5);runner.map.needsUpdate=true;runner.color.setHex(0x887c68);
 textile(-5.39,-4.956,.786,.642,.173,runner,true);
 // Tuck the turn-down over the head end instead of ending the top as a hard slab.
 textile(-6.48,-6.32,.742,.627,.078,dyed(cloth,0xdad1be),true);
 for(const z of [-1.43,.88]){
  rounded(-6.69,.469,z,.43,.138,.35,.016,walnut);box(-6.69,.545,z,.45,.012,.365,walnutWall);
  box(-6.47,.472,z,.008,.006,.307,metal);
  const mount=cylinder(-6.981,1.424,z,.056,.056,.025,brass);mount.rotation.z=Math.PI/2;
  box(-6.904,1.421,z,.152,.012,.012,brass);
  const shade=mesh(new T.LatheGeometry([[.023,0],[.05,.025],[.071,.090],[.07,.113],[.038,.144],[.015,.151]].map(([x,y])=>new T.Vector2(x,y)),44),material(0xcebda3,.56),-6.826,1.293,z);
  cylinder(-6.826,1.286,z,.038,.035,.008,glow);
  const halo=new T.PointLight(0xffdcb8,.75,1.25,2);halo.position.set(-6.79,1.32,z);shade.parent.add(halo);
 }
 // A gathered curtain follows the glazing, with a recessed track and weighted hem.
 box(-5.58,2.76,1.815,2.86,.019,.021,metal);
 const curtain=new T.PlaneGeometry(.83,2.58,90,50),cp=curtain.attributes.position;
 for(let i=0;i<cp.count;i++){
  const xx=cp.getX(i),yy=cp.getY(i),u=xx/.83+.5,t=yy/2.58+.5;
  const fold=Math.sin(u*Math.PI*14+.36*(1-t)+.23*Math.sin(t*4.2+u*2));
  cp.setXYZ(i,xx*(1-.12*t),yy+.012*(1-t)*Math.sin(u*35),.051*fold+.014*Math.sin(u*21-t))
 }
 curtain.computeVertexNormals();const voile=dyed(cloth,0xc7bca8);voile.side=T.DoubleSide;mesh(curtain,voile,-6.35,1.38,1.806);
 // Framed oak wardrobe fronts share the rear wall, away from the walking side of the bed.
 for(let i=0;i<3;i++){const x=-6.59+i*.57;box(x,1.20,-1.82,.565,2.24,.375,walnutWall);box(x+.21,1.14,-1.623,.012,.17,.022,brass)}
 const rug=rounded(-5.66,.078,-.03,2.85,.014,2.40,.005,dyed(cloth,0xc2b6a1));
 // Soft upholstery contact at the floor and a narrow return under the floating drawers.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(48,48,6,48,48,47);
 g.addColorStop(0,'rgba(42,35,29,.62)');g.addColorStop(.60,'rgba(53,41,32,.34)');g.addColorStop(1,'rgba(53,41,32,0)');ctx.fillStyle=g;ctx.fillRect(0,0,96,96);
 const shadeMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false});
 for(const [x,z,w,d] of [[bedX,bedZ,2.65,2.05],[-6.69,-1.43,.65,.56],[-6.69,.88,.65,.56]]){const q=mesh(new T.PlaneGeometry(w,d),shadeMat,x,.089,z);q.rotation.x=-Math.PI/2;q.castShadow=false}
 return rug;
}
