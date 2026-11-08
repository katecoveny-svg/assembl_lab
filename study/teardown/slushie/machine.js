import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export function build(kit){
 const {THREE:T,COLOURS:C}=kit;
 kit.root.scale.set(1,.83,1.38);
 // Original studio reflection map: broad softboxes, not external imagery.
 const ec=document.createElement('canvas');ec.width=512;ec.height=256;const ex=ec.getContext('2d');ex.fillStyle='#30252d';ex.fillRect(0,0,512,256);
 const eg=ex.createLinearGradient(0,0,0,256);eg.addColorStop(0,'#bdb1bb');eg.addColorStop(.5,'#3e2a38');eg.addColorStop(1,'#130c12');ex.fillStyle=eg;ex.fillRect(0,0,512,256);
 ex.filter='blur(5px)';ex.fillStyle='#fff5ed';ex.fillRect(80,24,54,128);ex.fillStyle='#b9a1af';ex.fillRect(310,48,90,72);ex.fillStyle='#f7eeee';ex.fillRect(210,12,90,15);
 const et=new T.CanvasTexture(ec);et.mapping=T.EquirectangularReflectionMapping;et.colorSpace=T.SRGBColorSpace;kit.scene.environment=et;kit.scene.environmentIntensity=.7;
 const softbox=new T.DirectionalLight('#f6e5ee',1.5);softbox.position.set(40,16,14);kit.scene.add(softbox);
 const rim=new T.DirectionalLight('#ffffff',1.1);rim.position.set(-20,30,-30);kit.scene.add(rim);
 const plum=kit.mat('#46273e',{rough:.24,metal:.35}),dark=kit.mat(C.plum,{rough:.3,metal:.4}),steel=kit.mat(C.mist,{rough:.24,metal:.38}),white=kit.mat(C.paleRose,{rough:.32}),copper=kit.mat('#a66c58',{rough:.3,metal:.55});
 const group=()=>new T.Group();
 function mesh(g,mat,pos=[0,0,0],parent){const o=new T.Mesh(g,mat);o.position.set(...pos);if(parent)parent.add(o);return o}
 function box(w,h,d,p,m=plum,r=.6,parent){return mesh(new RoundedBoxGeometry(w,h,d,3,r),m,p,parent)}
 function cyl(r,h,p,m=steel,parent){return mesh(new T.CylinderGeometry(r,r,h,48).rotateX(Math.PI/2),m,p,parent)}
 function pipe(points,r,m,parent){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(new T.TubeGeometry(curve,points.length*12,r,10,false),m,[0,0,0],parent)}
 function ring(r,p,m,parent){return mesh(new T.TorusGeometry(r,.28,8,72),m,p,parent)}
 function screw(p,parent){const s=cyl(.32,.28,p,steel,parent);box(.32,.05,.06,[p[0],p[1],p[2]+.16],dark,.015,parent);return s}
 function rounded(shape,x,y,w,h,r){shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);return shape}
 const frame=group();
 // Rounded pressed-metal cabinet with a genuine inspection opening.
 const outline=rounded(new T.Shape(),-17,-11,34,22,2.7);const hole=rounded(new T.Path(),-14,-8,28,16,2);outline.holes.push(hole);
 const sideGeo=new T.ExtrudeGeometry(outline,{depth:1.1,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.3,bevelThickness:.3,curveSegments:12});
 const side=mesh(sideGeo,plum,[11.7,-7,0],frame);side.rotation.y=Math.PI/2;
 box(1.5,22,34,[-11.7,-7,0],plum,1,frame);
 box(25,45,3,[0,4.5,-17.3],plum,1.5,frame);
 box(24,21,1.2,[0,-7,14],plum,1,frame);
 for(const z of [-13,13])for(const y of [-14,0]){const b=cyl(.35,.4,[12.8,y,z],steel,frame);b.rotation.y=Math.PI/2}
box(26,3,43,[0,-18,3],plum,1.4,frame);box(25,1.5,31,[0,3,-1],plum,.65,frame);box(25,2,31,[0,27,-1],plum,.9,frame);
 for(const x of [-11.8,11.8]){box(1.3,41,2,[x,4,-15],plum,.5,frame);box(1.2,21,2,[x,-7,13.6],plum,.4,frame)}
 for(const x of [-9,9])for(const z of [-12,18])cyl(1.3,1.8,[x,-20,z],dark,frame).rotation.x=Math.PI/2;
 // Perimeter rails and fasteners leave internals clearly open.
 for(const y of [-16,1.6])for(const x of [-11.2,11.2])screw([x,y,15],frame);
 kit.part('Chassis',frame,{sub:'body',explode:[0,-8,0],order:0,edges:false});
 const tank=group();const glass=kit.mat(C.paleRose,{rough:.12,opacity:.09});
 cyl(10.5,28,[0,15,0],glass,tank);for(const z of [-14,14]){ring(10.4,[0,15,z],steel,tank);ring(9.9,[0,15,z+.1],white,tank);for(let i=0;i<8;i++){const a=i*Math.PI/4;screw([10.35*Math.cos(a),15+10.35*Math.sin(a),z+.3],tank)}}
 // Inspection window is transparent, not a fictional open hole.
 for(const x of [-4,4])box(.22,13,.16,[x,17,10.55],kit.mat(C.ivory,{opacity:.18}),.08,tank);
 for(let i=0;i<85;i++){const a=(i*2.39996)%(Math.PI*2),z=-12+(i*7.37)%24;mesh(new T.SphereGeometry(.06+(i%3)*.025,6,4),kit.mat(C.ivory,{opacity:.24,rough:.2}),[10.56*Math.cos(a),15+10.56*Math.sin(a),z],tank)}
 kit.part('Clear freezing bowl' ,tank,{sub:'bowl',explode:[0,5,10],order:4,edges:false});
 const core=group();cyl(5.5,28,[0,15,0],steel,core);cyl(5.8,.8,[0,15,-14.1],dark,core);kit.part('Cold evaporator drum',core,{sub:'cooling',explode:[0,5,-8],order:2,edges:false});kit.anchor('Cold drum',core,[3,16,4]);
 const auger=group();auger.position.set(0,15,0);cyl(.9,33,[0,0,0],steel,auger);
 // Continuous helical ribbon, not disconnected decorative rings.
 const positions=[],indices=[],normals=[];const N=240;
 for(let i=0;i<=N;i++){const u=i/N,a=u*Math.PI*6,z=-13+u*26;for(const r of [7.2,9.1])positions.push(r*Math.cos(a),r*Math.sin(a),z);if(i<N){const k=2*i;indices.push(k,k+1,k+2,k+1,k+3,k+2)}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();mesh(geo,white,[0,0,0],auger);
 for(const r of [7.2,9.1]){const edge=[];for(let i=0;i<=120;i++){const u=i/120,a=u*Math.PI*6;edge.push([r*Math.cos(a),r*Math.sin(a),-13+u*26])}pipe(edge,.13,white,auger)}
 for(const z of [-12.6,12.6]){ring(8.9,[0,0,z],white,auger);for(let j=0;j<3;j++){const a=j*2*Math.PI/3;const arm=box(8.5,.55,.65,[4.5*Math.cos(a),4.5*Math.sin(a),z],white,.15,auger);arm.rotation.z=a}}
 kit.part('Scraper and mixing auger',auger,{sub:'mix',explode:[0,16,9],order:3,edges:false});kit.anchor('Mixer',auger,[7,0,6]);
 const fluid=group();fluid.position.set(0,15,0);
 // A lower half-cylinder of liquid; the ice particles represent fraction, not individual real crystals.
 const liquidShape=new T.Shape();liquidShape.moveTo(-9.5,0);liquidShape.absarc(0,0,9.5,Math.PI,2*Math.PI,false);liquidShape.closePath();
 const liquid=mesh(new T.ExtrudeGeometry(liquidShape,{depth:26,bevelEnabled:false,curveSegments:48}),kit.mat('#9b345e',{rough:.26,opacity:.82}),[0,0,-13],fluid);
 const grainMat=kit.mat('#ffffff',{rough:.38});const grains=new T.InstancedMesh(new T.IcosahedronGeometry(.24,0),grainMat,6000);fluid.add(grains);const d=new T.Object3D();const seeds=[];
 let seed=36;const rnd=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};
 const tones=['#b43c65','#cf6380','#e3a0b3','#be4c73','#efbdc9'];
 for(let i=0;i<6000;i++){seeds.push({a:rnd()*Math.PI*2,r:5.8+rnd()*3.45,z:-12.5+rnd()*25,size:.45+rnd()*1.15});grains.setColorAt(i,new T.Color(tones[i%5]))}
 kit.part('Liquid and ice',fluid,{sub:'bowl',explode:[0,6,3],order:3,edges:false});
 const drive=group();box(19,21,3,[0,15,-17],dark,.7,drive);cyl(2.8,6,[6,8,-21],steel,drive);cyl(4,.8,[0,15,-20],steel,drive);cyl(1.9,.8,[6,8,-20],steel,drive);
 pipe([[0,19,-20],[4,17,-20],[7.8,9,-20],[6,6,-20],[3.5,8,-20],[-3.9,14,-20],[0,19,-20]],.25,dark,drive);
 for(let a=0;a<6;a++){const ang=a*Math.PI/3;box(.45,3,.35,[Math.sin(ang)*2,15+Math.cos(ang)*2,-20.5],dark,.12,drive).rotation.z=-ang}
 kit.part('Motor and belt drive',drive,{sub:'mix',explode:[0,0,-15],order:2,edges:false});
 const cooling=group();
 const compressor=mesh(new T.CapsuleGeometry(4.7,5,6,24),dark,[5,-8,7],cooling);
 ring(4.72,[5,-6,7],steel,cooling).rotation.x=Math.PI/2;
 box(11,1,12,[5,-14,7],steel,.6,cooling);for(const x of [1,9])for(const z of [3,11]){cyl(.6,.7,[x,-13.5,z],steel,cooling).rotation.x=Math.PI/2}
 // Condenser grid, warm return, expansion line and cold drum form a connected closed loop.
 for(let x=2;x<=9;x+=.6)box(.12,14,5,[x,-7,-5],steel,.03,cooling);
 for(let y=-13;y<=-1;y+=1.4)pipe([[2,y,-2],[9,y,-2],[9,y+.7,-2],[2,y+.7,-2]],.18,copper,cooling);
 pipe([[5,-4,7],[7,0,7],[8,0,3],[9,-1,2],[9,-1,-2]],.3,copper,cooling);
 pipe([[2,-13,-2],[1,-14,3],[0,-9,5],[-1,-2,5],[-1,3,0],[-1,15,-14]],.19,copper,cooling);
 pipe([[1,15,-14],[-8,15,-17],[-9,1,-14],[-9,-6,-7],[0,-10,-7],[5,-8,3]],.38,steel,cooling);
 
 
 const fan=group();fan.position.set(6,-7,-10);cyl(1.1,1,[0,0,0],dark,fan);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const f=box(1.8,4,.35,[2*Math.sin(a),2*Math.cos(a),0],dark,.7,fan);f.rotation.z=-a+.5}cooling.add(fan);ring(4.7,[6,-7,-10],steel,cooling);
 kit.part('Refrigeration loop',cooling,{sub:'cooling',explode:[0,-6,8],order:1,edges:false});kit.anchor('Heat out',cooling,[8,-4,-2]);
 const tap=group();pipe([[0,7,13],[0,7,18],[0,4,20]],1.15,steel,tap);cyl(1.65,3,[0,7,17],steel,tap);box(.9,5,1,[0,11,18],steel,.4,tap);mesh(new T.SphereGeometry(1.15,20,12),steel,[0,13.5,18],tap);
 box(12,.7,10,[0,-15.9,20],steel,.8,tap);for(let x=-5;x<=5;x+=1)box(.24,.08,8,[x,-15.5,20],dark,.08,tap);
 const cup=mesh(new T.CylinderGeometry(3,2.4,8,40,1,true),kit.mat(C.ivory,{opacity:.18,rough:.12}),[0,-11.3,20],tap);ring(3,[0,-7.3,20],steel,tap).rotation.x=Math.PI/2;
 kit.part('Tap and drip tray',tap,{sub:'body',explode:[0,0,12],order:5,edges:false});
 return {pose(s){auger.rotation.z=s.angle*.035;fan.rotation.z=s.angle*.05;seeds.forEach((p,i)=>{const a=p.a+s.angle*.008;d.position.set(Math.cos(a)*p.r,-Math.abs(Math.sin(a))*p.r+1,p.z);d.rotation.set(a,p.a,s.angle*.003);const size=p.size*(.25+.75*Math.sqrt(s.ice));d.scale.set(size*.7,size*1.2,size*.8);d.updateMatrix();grains.setMatrixAt(i,d.matrix)});grains.instanceMatrix.needsUpdate=true;}};
}
