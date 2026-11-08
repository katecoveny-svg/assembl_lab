/** Original open-frame teaching alternator, centimetre scene units.
 * Mechanical detail is illustrative; the electrical area/angle stay in model.js. */
export function build(kit) {
  const {THREE:T,COLOURS:C}=kit;
  const materials={paint:kit.mat(C.roseInk,{metal:.18,rough:.38}),steel:kit.mat(C.mist,{metal:.72,rough:.27}),dark:kit.mat(C.ink,{metal:.12,rough:.66}),wire:kit.mat(C.rose,{metal:.65,rough:.3}),ceramic:kit.mat(C.ivory,{rough:.35})};
  const mesh=(g,m,x=0,y=0,z=0)=>{const o=new T.Mesh(g,materials[m]||kit.mat(m,{rough:.5}));o.position.set(x,y,z);return o;};
  // Small manufactured edge radii catch light without a noisy wireframe outline.
  const box=(w,h,d,m,x=0,y=0,z=0,r=.18)=>{
    r=Math.min(r,w/4,h/4,d/4);const s=new T.Shape(),a=-w/2+r,b=-h/2+r,W=w-2*r,H=h-2*r;
    s.moveTo(a,b);s.lineTo(a+W,b);s.lineTo(a+W,b+H);s.lineTo(a,b+H);s.closePath();
    const g=new T.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:3,steps:1,curveSegments:1});g.translate(0,0,-d/2+r);
    return mesh(g,m,x,y,z);
  };
  const cyl=(r,h,m,x=0,y=0,z=0,n=48)=>mesh(new T.CylinderGeometry(r,r,h,n),m,x,y,z);
  const ring=(inner,outer,h,m,x=0,y=0,z=0)=>mesh(new T.LatheGeometry([[inner,-h/2],[outer,-h/2],[outer,h/2],[inner,h/2],[inner,-h/2]].map(p=>new T.Vector2(...p)),48),m,x,y,z);
  const tube=(pts,r,m)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),80,r,8,false),m);
  const bolt=(group,x,y,z)=>{group.add(cyl(.55,.12,'steel',x,y,z),cyl(.34,.3,'steel',x,y+.2,z,6));const slot=box(.35,.025,.07,'dark',x,y+.36,z,.01);group.add(slot);};
  const register=(name,obj,opts)=>kit.part(name,obj,{edges:false,...opts});
  const base=new T.Group();base.add(box(55,2,38,'paint',2,-13,0,.4),box(53,.28,36,'dark',2,-11.85,0,.1));
  for(const x of [-21,25])for(const z of [-14,14]){base.add(cyl(1.25,1,'dark',x,-14.5,z));bolt(base,x,-11.65,z);}
  register('Bench',base,{sub:'frame',explode:[0,-12,0],order:0});
  const frame=new T.Group();
  for(const x of [-21,21]){frame.add(box(3,22,24,'paint',x,-.8,0,.35),box(7,1.2,28,'steel',x,-11,0));for(const z of [-11,11])bolt(frame,x,-10.3,z);}
  frame.add(box(42,2,8,'steel',0,-10,0));register('Field yoke',frame,{sub:'field',explode:[0,0,-18],order:1});
  for(const [x,name] of [[-16,'North pole'],[16,'South pole']]){
    const pole=new T.Group();pole.add(box(7,18,25,'paint',x,0,0,.38));
    // Machined pole face and retention studs, not a featureless coloured cube.
    pole.add(box(.3,16.6,23,'steel',x+(x<0?3.55:-3.55),0,0,.1));
    for(const z of [-9,9])bolt(pole,x,9,z);
    register(name,pole,{sub:'field',explode:[x,5,0],order:2,cut:'all'});kit.anchor(name,pole,[x,9,0]);
  }
  const coil=new T.Group();
  // Five visible continuous turns represent 100 electrical turns. Centreline
  // remains y=±8,z=±10 (20×16cm), rounded corners only for visual wire routing.
  const points=[[-.64,8,-9.4]];
  for(let i=0;i<5;i++){const x=-.64+i*.32;points.push([x,8,9.4],[x,7.4,10],[x,-7.4,10],[x,-8,9.4],[x,-8,-9.4],[x,-7.4,-10],[x,7.4,-10],[x+.32,8,-9.4]);}
  coil.add(tube(points,.145,'wire'));
  // Insulating end formers and radial arms stay inside the rotating envelope.
  for(const y of [-7.55,7.55])coil.add(box(2.15,.65,18.8,'dark',0,y,0,.2));
  coil.add(box(.9,1.1,19,'dark',0,0,0),box(.9,14.5,1.1,'dark',0,0,0));
  for(const y of [-6,6])coil.add(cyl(1.1,1.1,'steel',0,y,0));
  coil.add(tube([[-.64,8,-9.4],[-2.2,9.4,-7],[-2.2,14,-2],[-1.5,16,0]],.15,'dark'));
  coil.add(tube([[.96,8,-9.4],[2.2,10,-7],[2.2,17,-2],[1.5,19,0]],.15,C.mauve));
  register('Rotor winding',coil,{sub:'rotor',explode:[0,10,17],order:4});kit.anchor('Coil',coil,[0,8,10]);
  const shaft=new T.Group();shaft.add(cyl(.55,35,'steel',0,3,0));
  // Drive coupling above the slip rings makes the external energy input legible.
  shaft.add(cyl(1.15,1.7,'steel',0,22,0),cyl(.65,2.4,'steel',0,23.6,0));
  register('Drive shaft',shaft,{sub:'rotor',explode:[0,25,0],order:3});
  const bearing=new T.Group();
  for(const y of [-10,12]){bearing.add(box(6,1.6,6,'paint',0,y,0,.4),ring(.6,1.65,.4,'steel',0,y+.9,0),ring(.65,1.2,.45,'dark',0,y+1,0));for(const x of [-2,2])for(const z of [-2,2])bolt(bearing,x,y+.85,z);}
  // Upper bearing is carried by a rear gantry, clear of the rotating 10cm radius.
  for(const x of [-8,8]){bearing.add(box(1.4,24,1.4,'steel',x,0,-15),box(4,1,5,'paint',x,-11,-15));bolt(bearing,x,-10.4,-16);}
  bearing.add(box(18,1.6,3,'paint',0,12,-15),box(4,1.6,15,'paint',0,12,-7.5));
  register('Bearings',bearing,{sub:'frame',explode:[0,-3,-12],order:3});
  const rings=new T.Group();rings.add(cyl(1.1,6,'dark',0,17.5,0));for(const y of [16,19])rings.add(ring(1.1,1.8,1.2,'wire',0,y,0));
  register('Two slip rings',rings,{sub:'output',explode:[0,20,0],order:5});kit.anchor('Rings',rings,[1.8,19,0]);
  const brushes=new T.Group();
  brushes.add(box(1,9,4,'ceramic',6,17,0),box(1.4,30,1.4,'steel',6,3,-15),box(4,1,5,'paint',6,-11,-15),box(1.4,1.4,15,'steel',6,14,-7.5));
  for(const y of [16,19]){
    brushes.add(box(2,.85,.85,'dark',2.8,y,0,.08),box(2,1.4,1.4,'steel',4.5,y,0,.12));
    // Visible compression spring and captive terminal screw on each holder.
    const spring=[];for(let j=0;j<=100;j++){const t=j/100;spring.push([3.6+t*1.7,y+.4*Math.sin(t*Math.PI*12),.4*Math.cos(t*Math.PI*12)]);}brushes.add(tube(spring,.07,'steel'));bolt(brushes,5,y+.7,0);
  }
  register('Carbon brushes',brushes,{sub:'output',explode:[10,12,0],order:6});
  const load=new T.Group();load.add(box(8,1,11,'paint',23,-11,11,.25),box(6,3.8,8,'dark',23,-8.6,11));
  for(let i=0;i<9;i++)load.add(box(7,.22,9,'steel',23,-10.2+i*.4,11,.05));
  for(const z of [7,15]){load.add(cyl(.6,1.2,'ceramic',23,-6,z));bolt(load,23,-5.35,z);}
  load.add(tube([[5,16,0],[11,16,0],[29,6,3],[28,-4,7],[23,-5.2,7]],.22,'dark'));
  load.add(tube([[5,19,0],[13,19,0],[31,5,12],[28,-4,15],[23,-5.2,15]],.22,C.roseInk));
  register('Resistive load',load,{sub:'output',explode:[13,0,13],order:7});kit.anchor('Load',load,[23,-6,11]);
  const field=new T.Group();for(const z of [-6,6])field.add(new T.ArrowHelper(new T.Vector3(1,0,0),new T.Vector3(-12,0,z),24,C.mist,1,.4));
  register('Field direction',field,{sub:'field',explode:[0,0,0],order:2,hideApart:true});
  return {pose(s){coil.rotation.y=s.angle;rings.rotation.y=s.angle;shaft.rotation.y=s.angle;field.visible=s.B>0;}};
}
