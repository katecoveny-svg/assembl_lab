/* vend3d.js: a see-through figure of a spiral vending machine for the `vend` study machine.
   One function per part, placed at named positions in millimetres (x right, y up, z towards the customer;
   origin at the centre of the floor). The part table (PARTS) is pure data and is also read by vend3d.check.mjs in
   Node, which checks the boxes for clashes and clearance before anything is drawn. See vend.parts.md.
   Rendering: three.js r128 (same build as the lab twins), MeshPhysicalMaterial with transmission for the body
   and glass, a PMREM room environment, ACES tone mapping, one soft shadow light and a single deep-blue drop shadow
   on a paper-white backdrop. No outlines, no text in the scene. */
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.Vend3D=api})(typeof self!=="undefined"?self:this,function(){
"use strict";
// ---------------------------------------------------------------- part table (mm)
const ROWS=6,COLS=5,PITCH=150,HELIX=70,COIL_D=144,CAN_D=66,CAN_H=115,BAR=[40,110,20],POCKETS=7;
const TRAY_Y=k=>416+200*k;            // tray plate underside; plate top = TRAY_Y+4
const COIL_X=i=>-372+PITCH*i;         // coil axis x: -372 … 228
const TRAY_Z=[-240,300];              // tray depth (back, front edge)
const COIL_Z=[-230,270];
const PAD_TOP=220;                    // rubber pad top: drop from tray k = (TRAY_Y(k)+4)-PAD_TOP = 200,400,…,1200
const CAN_Z=j=>257-HELIX*j;           // pocket j centre z (j=0 is the front pocket)
const B=(x0,y0,z0,x1,y1,z1)=>[x0,y0,z0,x1,y1,z1];
const PARTS=[];const def=p=>{PARTS.push(p);return p};
// explode: how far (mm) a part moves when the figure is taken apart (t = 1)
def({id:"cabinet",name:"Cabinet shell",group:"cabinet",box:B(-495,0,-425,495,1830,425),interior:B(-455,120,-385,455,1790,385),shell:true,explode:[0,0,0]});
// the acrylic case's frame: 12 edge rails and 8 corner balls, on the outer envelope (checked for clashes, not for the interior rule)
{const R=14,[x0,y0,z0,x1,y1,z1]=[-495+R,0+R,-425+R,495-R,1830-R,425-R];let n=0;
  const rail=(a,b,name)=>def({id:"rail_"+(n++),name,group:"case",envelope:true,box:B(Math.min(a[0],b[0])-R,Math.min(a[1],b[1])-R,Math.min(a[2],b[2])-R,Math.max(a[0],b[0])+R,Math.max(a[1],b[1])+R,Math.max(a[2],b[2])+R),a,b,explode:[0,0,0]});
  for(const z of [z0,z1])for(const x of [x0,x1])rail([x,y0,z],[x,y1,z],"Vertical frame rail");
  for(const y of [y0,y1])for(const z of [z0,z1])rail([x0,y,z],[x1,y,z],"Horizontal frame rail");
  for(const y of [y0,y1])for(const x of [x0,x1])rail([x,y,z0],[x,y,z1],"Horizontal frame rail");
  let m=0;for(const y of [y0,y1])for(const z of [z0,z1])for(const x of [x0,x1])def({id:"ball_"+(m++),name:"Corner ball",group:"case",envelope:true,box:B(x-20,y-20,z-20,x+20,y+20,z+20),c:[x,y,z],explode:[0,0,0]})}
def({id:"divider",name:"Service-column divider",group:"cabinet",box:B(309,120,-385,311,1790,380),explode:[0,0,0]});
def({id:"door",name:"Glass door and frame",group:"door",box:B(-495,400,425,330,1740,445),front:true,explode:[0,0,650]});
def({id:"panel",name:"Front service panel",group:"payment",box:B(311,120,385,455,1790,425),front:true,explode:[0,0,650]});
def({id:"slot",name:"Coin slot",group:"payment",box:B(353,1378,425,413,1402,431),front:true,parent:"panel",explode:[0,0,650]});
def({id:"validator",name:"Coin validator",group:"payment",box:B(333,1130,290,433,1360,380),explode:[380,0,0]});
def({id:"lever",name:"Coin return lever",group:"payment",box:B(425,1330,425,443,1400,455),front:true,parent:"panel",explode:[0,0,650],
  moving:{kind:"rotate",axis:"x",pivot:[434,1400,440],range:[0,25*Math.PI/180],attached:["panel","slot"]}});
def({id:"chute",name:"Coin chute",group:"payment",box:B(420,580,320,452,1120,360),explode:[380,0,0]});
def({id:"cashbox",name:"Cash box",group:"payment",box:B(323,460,290,443,570,370),explode:[380,0,0]});
def({id:"cup",name:"Coin return cup",group:"payment",box:B(338,790,395,428,860,455),front:true,parent:"panel",explode:[0,0,650]});
def({id:"bills",name:"Bill validator",group:"payment",box:B(348,940,180,418,1060,380),explode:[380,0,0]});
def({id:"keypad",name:"Keypad and display",group:"payment",box:B(338,1450,425,428,1600,440),front:true,parent:"panel",explode:[0,0,650]});
def({id:"vmc",name:"Controller board",group:"payment",box:B(320,600,160,440,820,190),explode:[380,0,0]});
def({id:"psu",name:"24 V power supply",group:"payment",box:B(325,1620,180,445,1680,360),explode:[380,0,0]});
for(let k=0;k<ROWS;k++){const Y=TRAY_Y(k),ex=[0,40+k*70,0];
  def({id:`tray${k}`,name:`Tray ${k} plate`,group:"trays",box:B(-450,Y,TRAY_Z[0],304,Y+4,TRAY_Z[1]),explode:ex});
  def({id:`rail${k}`,name:`Tray ${k} back rail`,group:"trays",box:B(-450,Y+4,TRAY_Z[0],304,Y+64,TRAY_Z[0]+10),parent:`tray${k}`,explode:ex});
  for(let i=0;i<COLS;i++){const cx=COIL_X(i),cy=Y+4+5+COIL_D/2;
    def({id:`coil${k}${i}`,name:`Coil ${k}.${i}`,group:"coils",row:k,col:i,box:B(cx-COIL_D/2,cy-COIL_D/2,COIL_Z[0],cx+COIL_D/2,cy+COIL_D/2,COIL_Z[1]),cx,cy,explode:[ex[0],ex[1],ex[2]+260],
      cyl:"z",moving:{kind:"rotate",axis:"z",pivot:[cx,cy,0],range:[0,2*Math.PI],attached:[`tray${k}`,`rail${k}`,`motor${k}${i}`].concat(Array.from({length:POCKETS},(_,j)=>`prod${k}${i}${j}`))}});
    def({id:`motor${k}${i}`,name:`Coil motor ${k}.${i}`,group:"motors",box:B(cx-25,Y+36,-300,cx+25,Y+86,TRAY_Z[0]),parent:`tray${k}`,explode:[ex[0],ex[1],ex[2]-220]});
    for(let j=0;j<POCKETS;j++){const z=CAN_Z(j),can=k<4;
      def({id:`prod${k}${i}${j}`,name:can?`Can ${k}.${i}.${j}`:`Bar ${k}.${i}.${j}`,group:"products",row:k,col:i,pocket:j,kind:can?"can":"bar",
        box:can?B(cx-CAN_D/2,Y+4,z-CAN_D/2,cx+CAN_D/2,Y+4+CAN_H,z+CAN_D/2):B(cx-BAR[0]/2,Y+4,z-BAR[2]/2,cx+BAR[0]/2,Y+4+BAR[1],z+BAR[2]/2),
        parent:`coil${k}${i}`,restsOn:`tray${k}`,explode:[ex[0],ex[1],ex[2]+260]})}}}
def({id:"bin",name:"Delivery bin",group:"delivery",box:B(-450,204,60,304,400,385),explode:[0,-160,420]});
def({id:"pad",name:"Rubber landing pad",group:"delivery",box:B(-440,208,70,294,PAD_TOP,375),parent:"bin",explode:[0,-160,420]});
def({id:"flap",name:"Delivery flap",group:"delivery",box:B(-410,205,420,290,390,425),front:true,parent:"cabinet",explode:[0,-160,700],
  moving:{kind:"rotate",axis:"x",pivot:[-60,390,422],range:[0,35*Math.PI/180],attached:["cabinet","bin","pad"]}});
def({id:"guide",name:"Chute guide",group:"delivery",box:B(-440,300,-30,300,306,90),parent:"bin",explode:[0,-160,420]});
def({id:"compressor",name:"Compressor",group:"fridge",box:B(-250,130,-330,-70,330,-150),explode:[0,-260,-320]});
def({id:"condenser",name:"Condenser coil",group:"fridge",box:B(-30,130,-370,270,330,-320),explode:[0,-260,-320]});
def({id:"cfan",name:"Condenser fan",group:"fridge",box:B(20,130,-310,220,330,-280),explode:[0,-260,-320],cyl:"z",
  moving:{kind:"rotate",axis:"z",pivot:[120,230,-295],range:[0,2*Math.PI],attached:["condenser"]}});
def({id:"evap",name:"Evaporator",group:"fridge",box:B(-400,700,-385,200,1000,-335),explode:[0,0,-420]});
def({id:"efan",name:"Evaporator fan",group:"fridge",box:B(-175,1020,-380,-25,1170,-350),explode:[0,0,-420],cyl:"z",
  moving:{kind:"rotate",axis:"z",pivot:[-100,1095,-365],range:[0,2*Math.PI],attached:["evap"]}});
def({id:"lines",name:"Refrigerant lines",group:"fridge",box:B(-160,330,-384,-152,700,-376),parent:"cabinet",explode:[0,0,-420]});
def({id:"led_l",name:"LED strip, left",group:"light",box:B(-455,410,330,-430,1660,355),explode:[0,300,0]});
def({id:"led_r",name:"LED strip, right",group:"light",box:B(280,410,330,305,1660,355),explode:[0,300,0]});
// the falling product's path, as a moving part per tray and column: from the tray front edge down to the pad, in the gap between tray fronts and glass
for(let k=0;k<ROWS;k++)for(let i=0;i<COLS;i++){const Y=TRAY_Y(k),cx=COIL_X(i);
  def({id:`fall${k}${i}`,name:`Falling product path, tray ${k} coil ${i}`,group:"paths",virtual:true,front:true,box:B(cx-CAN_D/2,PAD_TOP,323,cx+CAN_D/2,Y+4+CAN_H,389),
    moving:{kind:"translate",axis:"y",range:[0,-(Y+4-PAD_TOP)],attached:["bin","pad","cabinet","door","flap",`tray${k}`,`coil${k}${i}`].concat(Array.from({length:POCKETS},(_,j)=>`prod${k}${i}${j}`))},
    box0:B(cx-CAN_D/2,Y+4,323,cx+CAN_D/2,Y+4+CAN_H,389)})}
const byId=Object.fromEntries(PARTS.map(p=>[p.id,p]));
const CONST={ROWS,COLS,PITCH,HELIX,COIL_D,CAN_D,CAN_H,BAR,POCKETS,TRAY_Y,COIL_X,TRAY_Z,COIL_Z,PAD_TOP,CAN_Z};

// ---------------------------------------------------------------- the figure (browser only)
function create(THREE,canvas,opts){opts=opts||{};
  const FM=(typeof StudyKit!=="undefined"&&StudyKit.figMat)||(opts.figMat);if(!FM)throw new Error("vend3d needs StudyKit.figMat (kit.js) for its materials");
  const S=0.001;// mm → m
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"low-power"});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.92;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(new THREE.Color(FM.palette.paper),1);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(22,1,0.05,60);
  // environment: a small room with light panels, prefiltered (what RoomEnvironment does, written out here for the UMD build)
  (function env(){const room=new THREE.Scene();const geo=new THREE.BoxGeometry();
    const wall=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.BackSide,roughness:1}));wall.scale.set(10,10,10);room.add(wall);
    const lamp=(w,h,d,x,y,z,c)=>{const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:c}));m.scale.set(w,h,d);m.position.set(x,y,z);room.add(m)};
    lamp(4,0.2,4,0,4.9,0,0xffffff);lamp(0.2,3,3,-4.9,1.5,0,0xfff2e0);lamp(0.2,3,3,4.9,1.5,0,0xe8f0ff);lamp(3,3,0.2,0,2,-4.9,0xffffff);
    room.add(new THREE.PointLight(0xffffff,0.6,0,2).translateY(2));
    const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(room,0.04).texture;pm.dispose()})();
  scene.add(new THREE.HemisphereLight(0xffffff,0xd6dce8,0.36));
  renderer.shadowMap.type=THREE.VSMShadowMap;
  // key from the upper left and behind (so the one long navy shadow falls to the lower right, as in the reference figures); a soft shadowless fill from the front
  const fill=new THREE.DirectionalLight(0xffffff,0.5);fill.position.set(2.5,3,4.5);scene.add(fill);
  const sun=new THREE.DirectionalLight(0xfff6ec,1.1);sun.position.set(-2.4,4.6,-1.9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.radius=9;sun.shadow.blurSamples=16;sun.shadow.bias=-0.0005;sun.shadow.normalBias=0.02;
  Object.assign(sun.shadow.camera,{left:-2.6,right:2.6,top:2.8,bottom:-2.8,near:0.5,far:16});scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(16,16),new THREE.ShadowMaterial({color:new THREE.Color(FM.palette.shadow),opacity:0.6}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  // materials: the shared bench recipe (StudyKit.figMat), kinds metal / plastic / glass / rubber / painted / wood
  const F=(kind,c,o)=>FM.three(THREE,kind,c,o);
  const PAL=FM.palette;
  const M={body:F("glass",PAL.case.mint,{opacity:0.16,transmission:0.92}),glass:F("glass",0xF2FAFD,{opacity:0.1,transmission:0.96}),frame:F("painted",0xF2A9BF,{rim:0.35}),panel:F("glass",PAL.case.blush,{opacity:0.24,transmission:0.9}),
    plinth:F("painted",0xF2A9BF,{rim:0.35}),front:F("painted",0xF2A9BF,{rim:0.35}),
    rail:F("painted",0xF2A9BF,{rim:0.3}),ball:F("plastic",0x9FDCC4,{rim:0.4}),
    steel:F("metal",PAL.steel),trayRail:F("metal",PAL.steelDark),motor:F("plastic",PAL.mintPlastic),
    bin:F("plastic",PAL.case.blush),pad:F("rubber",0x3C4557),flap:F("painted",PAL.case.blush),guide:F("metal",PAL.steel),
    comp:F("metal",0xB7C2CE),cond:F("metal",0x9FB5CC),fan:F("plastic",PAL.mintPlastic),evap:F("metal",0xA9CBE3),lines:F("metal",PAL.copper),
    mech:F("plastic",PAL.mintPlastic),pcb:F("painted",PAL.pcb),dark:F("plastic",0x3A3F52),key:F("plastic",0xFFFFFF),screen:F("plastic",0xDFF5EA,{emissive:0x8FD9B6,emissiveIntensity:0.5}),
    led:F("plastic",0xFFFFFF,{emissive:0xFFF4DA,emissiveIntensity:1.6,rim:0}),ledDot:F("plastic",0x9BE3C8,{emissive:0x4FE3A0,emissiveIntensity:2.2,rim:0}),coin:F("metal",0xE2B13A),
    cash:F("metal",PAL.steelDark),board:F("painted",PAL.pcb),psu:F("metal",PAL.steel),band:F("painted",0xFFFFFF,{rough:0.35})};
  const root=new THREE.Group();root.scale.setScalar(S);scene.add(root);
  const nodes={};// part id → {g: group at the part's home position, home: Vector3, part}
  const box=(b,m,cast)=>{const g=new THREE.Mesh(new THREE.BoxGeometry(b[3]-b[0],b[4]-b[1],b[5]-b[2]),m);g.position.set((b[0]+b[3])/2,(b[1]+b[4])/2,(b[2]+b[5])/2);g.castShadow=cast!==false;g.receiveShadow=true;return g};
  const cyl=(r,h,m,seg)=>{const g=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg||24),m);g.castShadow=true;g.receiveShadow=true;return g};
  const place=(id,obj,pivot)=>{const p=byId[id];const g=new THREE.Group();const c=pivot||[(p.box[0]+p.box[3])/2,(p.box[1]+p.box[4])/2,(p.box[2]+p.box[5])/2];
    g.position.set(c[0],c[1],c[2]);obj.position.sub(new THREE.Vector3(c[0],c[1],c[2]));g.add(obj);g.userData.part=id;root.add(g);nodes[id]={g,home:g.position.clone(),part:p};return g};
  const hollow=(b,t,m,open)=>{// a box with walls of thickness t; open = {front,top,back,left,right,bottom}
    const g=new THREE.Group();const [x0,y0,z0,x1,y1,z1]=b;open=open||{};
    if(!open.bottom)g.add(box([x0,y0,z0,x1,y0+t,z1],m));if(!open.top)g.add(box([x0,y1-t,z0,x1,y1,z1],m));
    if(!open.left)g.add(box([x0,y0,z0,x0+t,y1,z1],m));if(!open.right)g.add(box([x1-t,y0,z0,x1,y1,z1],m));
    if(!open.back)g.add(box([x0,y0,z0,x1,y1,z0+t],m));if(!open.front)g.add(box([x0,y0,z1-t,x1,y1,z1],m));return g};
  // ---- one function per part
  function cabinet(){const p=byId.cabinet,b=p.box,I=p.interior;const g=new THREE.Group();
    g.add(box([b[0],0,b[2],b[3],I[1],b[5]],M.plinth));// plinth (solid blush)
    // the case: single frosted panes (no slabs, so the contents are covered once), the rails carry the tint
    const pane=(w,h,x,y,z,ry)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),M.body);m.position.set(x,y,z);m.rotation.y=ry||0;m.castShadow=false;m.renderOrder=20;g.add(m)};
    const H=b[4]-I[1],cy=(b[4]+I[1])/2;pane(b[3]-b[0],H,0,cy,b[2]+1,0);pane(b[5]-b[2],H,b[0]+1,cy,0,Math.PI/2);pane(b[5]-b[2],H,b[3]-1,cy,0,-Math.PI/2);
    const top=new THREE.Mesh(new THREE.PlaneGeometry(b[3]-b[0],b[5]-b[2]),M.body);top.rotation.x=-Math.PI/2;top.position.set(0,b[4]-1,0);top.castShadow=false;top.renderOrder=20;g.add(top);
    // the front: blush bands above the door and below the flap, thin side strips, and the opening for the flap
    const fw=[[b[0],1740,405,311,b[4],425],[b[0],I[1],405,311,205,425],[b[0],I[1],405,-455,b[4],425],[290,205,405,311,400,425],[-455,205,405,-410,400,425]];
    fw.forEach(f=>{const m=box(f,M.front);m.castShadow=false;g.add(m)});
    return place("cabinet",g)}
  function divider(){return place("divider",box(byId.divider.box,M.steel))}
  function rails(){PARTS.filter(p=>p.group==="case").forEach(p=>{if(p.a){const a=p.a,b=p.b,len=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const g=new THREE.Mesh(new THREE.BoxGeometry(a[0]!==b[0]?len:24,a[1]!==b[1]?len:24,a[2]!==b[2]?len:24),M.rail);g.castShadow=true;g.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);place(p.id,g)}
    else{const g=new THREE.Mesh(new THREE.SphereGeometry(20,16,12),M.ball);g.castShadow=true;g.position.set(p.c[0],p.c[1],p.c[2]);place(p.id,g)}})}
  function door(){const b=byId.door.box;const g=new THREE.Group();
    const f=hollow([b[0],b[1],b[2],b[3],b[4],b[5]],35,M.frame,{front:true,back:true});g.add(f);
    const gl=box([-460,435,430,306,1705,436],M.glass,false);gl.renderOrder=30;g.add(gl);
    const h=cyl(9,1300,M.frame,12);h.position.set(-492,1070,435);g.add(h);// hinge
    const hd=cyl(8,220,M.frame,12);hd.rotation.z=Math.PI/2;hd.position.set(300,1050,452);g.add(hd);// handle, horizontal
    return place("door",g,[-492,1070,435])}
  function panel(){const b=byId.panel.box;const g=box(b,M.panel);g.castShadow=false;g.renderOrder=20;const m=place("panel",g);return m}
  function slot(){const b=byId.slot.box;const g=new THREE.Group();g.add(box(b,M.mech));const s=box([367,1386,431,399,1394,433],M.dark);g.add(s);return place("slot",g)}
  function validator(){const b=byId.validator.box;const g=new THREE.Group();g.add(box(b,M.mech));g.add(box([b[0]+6,b[1]+10,b[2]-6,b[3]-6,b[1]+70,b[2]],M.pcb,false));for(let i=0;i<3;i++){const c=cyl(14,6,M.dark,16);c.rotation.x=Math.PI/2;c.position.set(383,1320-i*70,383);g.add(c)}return place("validator",g)}
  function lever(){const p=byId.lever;const g=new THREE.Group();g.add(box([430,1330,425,438,1400,433],M.mech));g.add(box([425,1330,433,443,1352,455],M.dark));return place("lever",g,p.moving.pivot)}
  function chute(){return place("chute",box(byId.chute.box,M.mech))}
  function cashbox(){return place("cashbox",box(byId.cashbox.box,M.cash))}
  function cup(){const b=byId.cup.box;const g=hollow(b,6,M.dark,{front:true,top:true});return place("cup",g)}
  function bills(){const b=byId.bills.box;const g=new THREE.Group();g.add(box(b,M.mech));g.add(box([343,935,425,423,1065,431],M.dark));g.add(box([352,990,431,414,1004,433],M.body));return place("bills",g)}
  function keypad(){const b=byId.keypad.box;const g=new THREE.Group();g.add(box(b,M.dark));const led=new THREE.Mesh(new THREE.SphereGeometry(4,10,8),M.ledDot);led.position.set(414,1458,441);g.add(led);g.add(box([346,1540,440,420,1590,442],M.screen,false));
    for(let r=0;r<4;r++)for(let c=0;c<3;c++)g.add(box([347+c*25,1462+r*18,440,365+c*25,1474+r*18,444],M.key,false));return place("keypad",g)}
  function vmc(){const b=byId.vmc.box;const g=new THREE.Group();g.add(box(b,M.board));for(let i=0;i<4;i++)g.add(box([330+i*26,620,190,348+i*26,640,196],M.dark,false));return place("vmc",g)}
  function psu(){return place("psu",box(byId.psu.box,M.psu))}
  function tray(k){const p=byId["tray"+k];const g=new THREE.Group();g.add(box(p.box,M.steel));g.add(box(byId["rail"+k].box,M.trayRail));return place("tray"+k,g)}
  class Helix extends THREE.Curve{constructor(r,pitch,turns,z0){super();this.r=r;this.pitch=pitch;this.turns=turns;this.z0=z0}
    getPoint(t,o){o=o||new THREE.Vector3();const a=t*this.turns*2*Math.PI;return o.set(Math.cos(a)*this.r,Math.sin(a)*this.r,this.z0+t*this.turns*this.pitch)}}
  // coils, motors and products are instanced: one draw call per kind, each instance posed from its part definition
  const helixGeo=new THREE.TubeGeometry(new Helix(COIL_D/2-2,HELIX,(COIL_Z[1]-COIL_Z[0])/HELIX-0.15,COIL_Z[0]+6),150,2.4,6,false);
  const INST={};const mk=(key,geo,mat,n)=>{const im=new THREE.InstancedMesh(geo,mat,n);im.castShadow=true;im.receiveShadow=true;im.count=0;root.add(im);INST[key]=im;return im};
  // instance colours do the colouring (the materials are white), so the active coil and the moving product can be lit up
  const white=()=>F("painted",0xffffff,{rough:0.28});
  mk("coil",helixGeo,F("metal",0xffffff),ROWS*COLS);mk("motor",new THREE.BoxGeometry(50,50,60),M.motor,ROWS*COLS);
  const canGeo=new THREE.CylinderGeometry(CAN_D/2,CAN_D/2,CAN_H,18),barGeo=new THREE.BoxGeometry(BAR[0],BAR[1],BAR[2]);
  mk("can",canGeo,white(),ROWS*COLS*POCKETS);mk("bar",barGeo,white(),ROWS*COLS*POCKETS);
  // a white label band on every product (a cylinder sleeve on cans, a slip on bars): the "label pill" of the reference figures, with no text baked in
  mk("canBand",new THREE.CylinderGeometry(CAN_D/2+1.5,CAN_D/2+1.5,34,18,1,true),M.band,ROWS*COLS*POCKETS);mk("barBand",new THREE.BoxGeometry(BAR[0]+2,26,BAR[2]+2),M.band,ROWS*COLS*POCKETS);
  const PP=FM.palette.product;const PALETTE=["strawberry","blueberry","lime","butter","peach"].map(k=>new THREE.Color(PP[k])),BARC=new THREE.Color(FM.palette.product.peach),COILC=new THREE.Color(FM.palette.copper),HOTC=new THREE.Color(0xFF4A1C),COILHOT=new THREE.Color(0xFFC04D);
  const im4=new THREE.Matrix4(),iq=new THREE.Quaternion(),ip=new THREE.Vector3(),is1=new THREE.Vector3(1,1,1),is0=new THREE.Vector3(0,0,0);

  function instance(id,key,pos,rot){const im=INST[key],idx=im.count++;nodes[id]={inst:im,idx,home:new THREE.Vector3(pos[0],pos[1],pos[2]),part:byId[id],rot:rot||null};return nodes[id]}
  function coil(k,i){const p=byId[`coil${k}${i}`];instance(p.id,"coil",[p.cx,p.cy,0],"z")}
  function motor(k,i){const p=byId[`motor${k}${i}`],b=p.box;instance(p.id,"motor",[(b[0]+b[3])/2,(b[1]+b[4])/2,(b[2]+b[5])/2])}
  function product(k,i,j){const p=byId[`prod${k}${i}${j}`],b=p.box;const c=[(b[0]+b[3])/2,(b[1]+b[4])/2,(b[2]+b[5])/2];const n=instance(p.id,p.kind==="can"?"can":"bar",c);n.colour=p.kind==="can"?PALETTE[(k*2+i)%5]:PALETTE[(k+i)%5];
    const bm=INST[p.kind==="can"?"canBand":"barBand"];n.band={inst:bm,idx:bm.count++,dy:p.kind==="can"?6:12}}
  function bin(){const b=byId.bin.box;const g=hollow(b,4,M.bin,{front:true,top:true});return place("bin",g)}
  function pad(){return place("pad",box(byId.pad.box,M.pad))}
  function flap(){const p=byId.flap,b=p.box;const g=new THREE.Group();const f=box(b,M.flap);g.add(f);g.add(box([-380,215,425,260,235,431],M.dark,false));return place("flap",g,p.moving.pivot)}
  function guide(){const b=byId.guide.box;const m=box(b,M.guide);m.rotation.x=-10*Math.PI/180;return place("guide",m)}
  function compressor(){const b=byId.compressor.box;const g=new THREE.Group();const c=cyl(90,200,M.comp,28);c.position.set(-160,230,-240);g.add(c);const d=cyl(60,20,M.comp,20);d.position.set(-160,340,-240);g.add(d);return place("compressor",g)}
  function condenser(){const b=byId.condenser.box;const g=new THREE.Group();for(let i=0;i<9;i++)g.add(box([b[0]+i*34,b[1],b[2],b[0]+i*34+6,b[4],b[5]],M.cond,false));
    for(let r=0;r<3;r++){const t=cyl(6,300,M.cond,10);t.rotation.z=Math.PI/2;t.position.set(120,160+r*70,-345);g.add(t)}return place("condenser",g)}
  function fan(id,r){const p=byId[id],pv=p.moving.pivot;const g=new THREE.Group();const hub=cyl(r*0.22,22,M.dark,16);hub.rotation.x=Math.PI/2;hub.position.set(pv[0],pv[1],pv[2]);g.add(hub);
    for(let i=0;i<5;i++){const bl=new THREE.Mesh(new THREE.BoxGeometry(r*0.42,r*0.86,4),M.fan);bl.position.set(pv[0]+Math.cos(i*1.2566)*r*0.5,pv[1]+Math.sin(i*1.2566)*r*0.5,pv[2]);bl.rotation.z=i*1.2566+Math.PI/2;bl.rotation.y=0.6;g.add(bl)}
    const ring=new THREE.Mesh(new THREE.TorusGeometry(r,4,8,32),M.rail);ring.position.set(pv[0],pv[1],pv[2]);g.add(ring);return place(id,g,pv)}
  function evaporator(){const b=byId.evap.box;const g=new THREE.Group();for(let i=0;i<14;i++)g.add(box([b[0]+i*43,b[1],b[2],b[0]+i*43+6,b[4],b[5]],M.evap,false));
    for(let r=0;r<4;r++){const t=cyl(6,600,M.lines,10);t.rotation.z=Math.PI/2;t.position.set(-100,730+r*80,-360);g.add(t)}return place("evap",g)}
  function lines(){const b=byId.lines.box;const g=new THREE.Group();const t=cyl(4,370,M.lines,10);t.position.set(-156,515,-380);g.add(t);return place("lines",g)}
  function led(id){const b=byId[id].box;const g=cyl(12,b[4]-b[1],M.led,14);g.castShadow=false;g.position.set((b[0]+b[3])/2,(b[1]+b[4])/2,(b[2]+b[5])/2);return place(id,g)}
  // the coin (not a fixed part): a $2 coin, Ø 26.5 × 2.2 mm, shown while it drops through the validator
  const coin=new THREE.Mesh(new THREE.CylinderGeometry(13.25,13.25,2.2,24),M.coin);coin.rotation.z=Math.PI/2;coin.visible=false;coin.castShadow=true;root.add(coin);
  // build everything, in order
  cabinet();rails();divider();door();panel();slot();validator();lever();chute();cashbox();cup();bills();keypad();vmc();psu();
  for(let k=0;k<ROWS;k++){tray(k);for(let i=0;i<COLS;i++){coil(k,i);motor(k,i);for(let j=0;j<POCKETS;j++)product(k,i,j)}}
  bin();pad();flap();guide();compressor();condenser();fan("cfan",100);evaporator();fan("efan",75);lines();led("led_l");led("led_r");
  // ---- camera and orbit (pointer drag, wheel, arrow keys)
  const target=new THREE.Vector3(0,0.95,0);const orb={az:-0.72,pol:1.08,dist:5.6,vaz:0,vpol:0,vdist:0};const VIEWS={front:[-0.72,1.08,5.6,0.95],side:[1.2,1.12,5.6,0.95],inside:[-0.45,1.02,4.8,0.92],top:[-0.6,0.6,6,0.9],apart:[-0.78,1.05,8.6,1.15]};
  function view(n){const v=VIEWS[n]||VIEWS.front;orb.az=v[0];orb.pol=v[1];orb.dist=v[2];target.y=v[3]||0.95;orb.vaz=orb.vpol=orb.vdist=0;dirty=true}
  function applyCam(){orb.pol=Math.max(0.35,Math.min(1.5,orb.pol));orb.dist=Math.max(1.6,Math.min(10,orb.dist));
    camera.position.set(target.x+orb.dist*Math.sin(orb.pol)*Math.sin(orb.az),target.y+orb.dist*Math.cos(orb.pol),target.z+orb.dist*Math.sin(orb.pol)*Math.cos(orb.az));camera.lookAt(target)}
  orb.dist=Math.max(1.6,Math.min(10,orb.dist));
  let dirty=true,drag=null;
  canvas.addEventListener("pointerdown",e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener("pointermove",e=>{if(!drag)return;orb.az-=(e.clientX-drag.x)*0.008;orb.pol-=(e.clientY-drag.y)*0.006;drag={x:e.clientX,y:e.clientY};dirty=true});
  canvas.addEventListener("pointerup",()=>{drag=null});canvas.addEventListener("pointercancel",()=>{drag=null});
  canvas.addEventListener("wheel",e=>{e.preventDefault();orb.dist*=1+Math.sign(e.deltaY)*0.08;dirty=true},{passive:false});
  canvas.addEventListener("keydown",e=>{const k=e.key;if(k==="ArrowLeft")orb.az+=0.12;else if(k==="ArrowRight")orb.az-=0.12;else if(k==="ArrowUp")orb.pol-=0.08;else if(k==="ArrowDown")orb.pol+=0.08;else if(k==="+"||k==="=")orb.dist*=0.9;else if(k==="-"||k==="_")orb.dist*=1.1;else if(k==="Home")view("front");else return;e.preventDefault();dirty=true});
  // ---- pose: what the step rail asks the figure to show
  const pose={explode:0,coil:null,coilAngle:0,product:null,coin:null,flap:0,lever:0,fan:0,compOn:true};
  const tmp=new THREE.Vector3(),q=new THREE.Quaternion(),AX={x:new THREE.Vector3(1,0,0),y:new THREE.Vector3(0,1,0),z:new THREE.Vector3(0,0,1)};
  function applyPose(){const e=pose.explode;Object.values(INST).forEach(im=>{im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true});
    PARTS.forEach(p=>{const n=nodes[p.id];if(!n)return;
      ip.copy(n.home);if(e>0&&p.explode)ip.add(tmp.set(p.explode[0]*e,p.explode[1]*e,p.explode[2]*e));
      let a=0;
      if(p.moving&&p.moving.kind==="rotate"){
        if(p.id==="flap")a=p.moving.range[1]*pose.flap;else if(p.id==="lever")a=p.moving.range[1]*pose.lever;
        else if(p.id==="cfan")a=pose.compOn?pose.fan*1.0:0;else if(p.id==="efan")a=pose.fan*0.7;
        else if(p.group==="coils"&&pose.coil&&pose.coil.k===p.row&&pose.coil.i===p.col)a=pose.coilAngle}
      let vis=true;
      if(p.group==="products"&&pose.coil&&pose.coil.k===p.row&&pose.coil.i===p.col){ip.z+=pose.coilAngle/(2*Math.PI)*HELIX;
        if(pose.product&&pose.product.j===p.pocket){ip.z+=pose.product.dz||0;ip.y+=pose.product.dy||0;vis=pose.product.visible!==false}}
      if(n.inst){iq.identity();if(a)iq.setFromAxisAngle(AX[p.moving.axis],a);im4.compose(ip,iq,vis?is1:is0);n.inst.setMatrixAt(n.idx,im4);
        if(n.band){tmp.copy(ip);tmp.y+=n.band.dy;im4.compose(tmp,iq,vis?is1:is0);n.band.inst.setMatrixAt(n.band.idx,im4)}
        const active=pose.coil&&pose.coil.k===p.row&&pose.coil.i===p.col;if(p.group==="coils")n.inst.setColorAt(n.idx,active?COILHOT:COILC);
        else if(p.group==="products")n.inst.setColorAt(n.idx,active&&pose.product&&pose.product.j===p.pocket?HOTC:n.colour)}
      else{const g=n.g;g.position.copy(ip);g.quaternion.identity();if(a)g.quaternion.setFromAxisAngle(AX[p.moving.axis],a);g.visible=vis}
    });
    if(pose.coin){const c=pose.coin;coin.visible=true;coin.position.set(383,c.y,335);coin.rotation.x=c.spin||0}else coin.visible=false;
    dirty=true}
  function setPose(p){Object.assign(pose,p);applyPose()}
  // ---- loop: render only while something changes (reduced motion still gets a frame per change)
  let raf=0,last=performance.now(),frames=[],gaps=[],lastRender=0,onFrame=opts.onFrame;
  function resize(){const w=canvas.clientWidth||600,h=canvas.clientHeight||400;if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true}}
  function frame(now){raf=requestAnimationFrame(frame);const dt=Math.min(0.1,(now-last)/1000);last=now;resize();
    if(!drag){orb.az+=orb.vaz*dt;orb.pol+=orb.vpol*dt;orb.vaz*=0.9;orb.vpol*=0.9}
    if(dirty||opts.always){applyCam();const t0=performance.now();renderer.render(scene,camera);const ms=performance.now()-t0;frames.push(ms);if(frames.length>240)frames.shift();
      if(lastRender&&t0-lastRender<500){gaps.push(t0-lastRender);if(gaps.length>240)gaps.shift()}lastRender=t0;dirty=false;onFrame&&onFrame(ms)}}
  raf=requestAnimationFrame(frame);
  // label anchors for the HTML pills (COIN MECH, COOLING UNIT, PICK UP …): canvas-pixel positions of named parts in the current pose
  const LABELS=[["validator","Coin mech"],["bills","Bill reader"],["keypad","Keypad"],["coil32","Coils"],["motor32","Drive motors"],["bin","Pick up"],["compressor","Cooling unit"],["condenser","Condenser"],["evap","Evaporator"],["led_l","LED light"],["cashbox","Cash box"],["vmc","Controller"],["psu","Power supply"]];
  const lv=new THREE.Vector3();
  function labels(){const w=canvas.clientWidth,h=canvas.clientHeight;return LABELS.map(([id,text])=>{const n=nodes[id];if(!n)return null;const p=n.part;lv.copy(n.home);if(pose.explode>0&&p.explode)lv.add(tmp.set(p.explode[0]*pose.explode,p.explode[1]*pose.explode,p.explode[2]*pose.explode));
    lv.multiplyScalar(S).project(camera);return {id,text,x:(lv.x+1)/2*w,y:(1-lv.y)/2*h,visible:lv.z<1}}).filter(Boolean)}
  function project(pt){const w=canvas.clientWidth,h=canvas.clientHeight;lv.set(pt[0],pt[1],pt[2]).multiplyScalar(S).project(camera);return {x:(lv.x+1)/2*w,y:(1-lv.y)/2*h,visible:lv.z<1}}
  function partCentre(id){const n=nodes[id];if(!n)return null;const p=n.part;lv.copy(n.home);if(pose.explode>0&&p.explode)lv.add(tmp.set(p.explode[0]*pose.explode,p.explode[1]*pose.explode,p.explode[2]*pose.explode));return [lv.x,lv.y,lv.z]}
  function stats(){const a=frames.slice().sort((x,y)=>x-y),gq=gaps.slice().sort((x,y)=>x-y);const med=a.length?a[Math.floor(a.length/2)]:0;const p95=a.length?a[Math.floor(a.length*0.95)]:0;const gmed=gq.length?gq[Math.floor(gq.length/2)]:0;
    return {frames:a.length,cpuMedianMs:+med.toFixed(2),cpuP95Ms:+p95.toFixed(2),frameIntervalMedianMs:+gmed.toFixed(1),consecutiveFrames:gq.length,triangles:renderer.info.render.triangles,calls:renderer.info.render.calls}}
  function dispose(){cancelAnimationFrame(raf);renderer.dispose()}
  applyPose();applyCam();
  return {renderer,scene,camera,nodes,pose,setPose,view,views:Object.keys(VIEWS),stats,dispose,redraw:()=>{dirty=true},orbit:orb,labels,project,partCentre,
    snapshot:()=>{applyCam();renderer.render(scene,camera);return canvas.toDataURL("image/jpeg",0.86)}}}
return {PARTS,byId,CONST,create,version:"1.0"}});
