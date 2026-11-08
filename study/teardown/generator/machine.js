import {SPEC} from './model.js';
export function build(kit) {
  const {THREE:T,COLOURS:C}=kit;
  const mesh=(g,c,x=0,y=0,z=0)=>{const o=new T.Mesh(g,kit.mat(c,{metal:.25,rough:.55}));o.position.set(x,y,z);return o;};
  const box=(w,h,d,c,x,y,z)=>mesh(new T.BoxGeometry(w,h,d),c,x,y,z);
  const tube=(pts,r,c)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),48,r,8,false),c);
  const base=box(52,2,40,C.mauve,0,-13,0);kit.part('Bench',base,{sub:'frame',explode:[0,-12,0],order:0});
  const frame=new T.Group();
  for(const x of [-21,21]){frame.add(box(3,24,5,C.mist,x,0,0));for(const z of [-14,14]) frame.add(mesh(new T.CylinderGeometry(.45,.45,.5,12),C.ink,x,-11.8,z));}
  frame.add(box(42,3,5,C.mauve,0,-9,0));kit.part('Field yoke',frame,{sub:'field',explode:[0,0,-18],order:1});
  for(const [x,name,col] of [[-16,'North pole',C.roseInk],[16,'South pole',C.roseMauve]]) {
    const pole=box(7,18,26,col,x,0,0);kit.part(name,pole,{sub:'field',explode:[x,5,0],order:2,cut:'all'});kit.anchor(name,pole,[0,9,0]);
  }
  const coil=new T.Group();
  // Five decorative turns show one continuous winding; the model uses 100 turns.
  // Advance across the bundle to leave two electrically distinct terminal ends.
  const windingPoints=[[-.55,8,-10]];
  for(let i=0;i<5;i++){
    const x=-.55+i*.22;
    windingPoints.push([x+.055,8,10],[x+.11,-8,10],[x+.165,-8,-10],[x+.22,8,-10]);
  }
  const path=new T.CurvePath();
  for(let j=1;j<windingPoints.length;j++)path.add(new T.LineCurve3(new T.Vector3(...windingPoints[j-1]),new T.Vector3(...windingPoints[j])));
  coil.add(mesh(new T.TubeGeometry(path,400,.08,8,false),C.rose));
  // Insulated terminal leads rotate with the winding and meet different slip rings.
  // Opposite sides of the shaft keep these two paths separate.
  coil.add(tube([[-.55,8,-10],[-2.2,10,-7],[-2.2,14,-2],[-1.4,16,0]],.12,C.rose));
  coil.add(tube([[.55,8,-10],[2.2,11,-7],[2.2,17,-2],[1.4,19,0]],.12,C.mist));
  // Narrow insulating spokes keep the winding visible instead of a solid rotor plate.
  coil.add(box(.6,1,20,C.paleRose,0,0,0));
  coil.add(box(.6,16,1,C.paleRose,0,0,0));
  kit.part('Rotor winding',coil,{sub:'rotor',explode:[0,10,17],order:4});kit.anchor('Coil',coil,[0,8,10]);
  const shaft=mesh(new T.CylinderGeometry(.5,.5,36,24),C.mist,0,3,0);kit.part('Drive shaft',shaft,{sub:'rotor',explode:[0,25,0],order:3});
  const bearing=new T.Group();for(const y of [-10,13])bearing.add(mesh(new T.TorusGeometry(1.1,.5,12,32).rotateX(Math.PI/2),C.mauve,0,y,0));
  kit.part('Bearings',bearing,{sub:'frame',explode:[0,-3,-12],order:3});
  const rings=new T.Group();for(const y of [16,19])rings.add(mesh(new T.TorusGeometry(1.4,.4,12,48).rotateX(Math.PI/2),C.rose,0,y,0));
  kit.part('Two slip rings',rings,{sub:'output',explode:[0,20,0],order:5});kit.anchor('Rings',rings,[1.4,19,0]);
  const brushes=new T.Group();for(const y of [16,19]){brushes.add(box(2.2,.8,1.2,C.ink,2.6,y,0));brushes.add(box(1,.6,1,C.mist,4,y,0));}
  kit.part('Carbon brushes',brushes,{sub:'output',explode:[10,12,0],order:6});
  const load=new T.Group();load.add(box(7,4,8,C.mauve,23,-8,13));for(let i=0;i<8;i++)load.add(box(6,.3,8,C.roseMauve,23,-9.5+i*.45,13));
  load.add(tube([[4,16,0],[25,16,0],[28,-6,9],[25,-6,13]],.15,C.rose));load.add(tube([[4,19,0],[30,19,0],[32,-8,16],[25,-8,16]],.15,C.mist));
  kit.part('Resistive load',load,{sub:'output',explode:[13,0,13],order:7});kit.anchor('Load',load,[23,-6,13]);
  const field=new T.Group();for(const y of [-5,0,5])for(const z of [-6,6])field.add(new T.ArrowHelper(new T.Vector3(1,0,0),new T.Vector3(-12,y,z),24,C.mist,1.3,.6));
  kit.part('Field direction',field,{sub:'field',explode:[0,0,0],order:2,hideApart:true,edges:false});
  return {pose(s){coil.rotation.y=s.angle;rings.rotation.y=s.angle;shaft.rotation.y=s.angle;kit.hot('Rotor winding',Math.abs(s.emf)>.7*s.peak&&s.peak>0);kit.hot('Resistive load',s.power>0.5*s.meanPower);field.visible=s.B>0;}};
}
