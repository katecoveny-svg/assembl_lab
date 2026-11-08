/** Original lab pendulum rig, dimensions illustrative. 1 scene unit = 1 cm.
 * The bearing can be cut open; bob centre follows model x/y without a second animation clock.
 */
export function build(kit) {
  const {THREE, COLOURS:C} = kit;
  const mesh=(g,c)=>new THREE.Mesh(g,kit.mat(c));
  const box=(x,y,z,c)=>mesh(new THREE.BoxGeometry(x,y,z),c);
  const cyl=(r,h,c)=>mesh(new THREE.CylinderGeometry(r,r,h,48),c);
  const base=box(52,3,28,C.mauve);base.position.set(0,-110,0);
  kit.part('base',base,{sub:'frame',explode:[0,-15,0],order:0});
  const frame=new THREE.Group();
  for(const x of [-21,21]){const p=box(2.5,113,3,C.mist);p.position.set(x,-53,-5);frame.add(p);}
  const beam=box(45,4,7,C.paleRose);beam.position.set(0,4,-5);frame.add(beam);
  kit.part('frame',frame,{sub:'frame',explode:[0,0,-18],order:1});
  const face=new THREE.Group();
  // Angle scale: ornamental dial tracks the model's selected angle, not time.
  const arc=new THREE.Mesh(new THREE.TorusGeometry(15,0.25,8,72,Math.PI/3),kit.mat(C.rose));
  arc.rotation.z=-2*Math.PI/3;arc.position.z=-1.5;face.add(arc);
  for(let i=-15;i<=15;i+=5){const a=i*Math.PI/180;const tick=box(.35,1.6,.5,C.ivory);tick.position.set(15*Math.sin(a),-15*Math.cos(a),-1.5);tick.rotation.z=-a;face.add(tick);}
  kit.part('scale',face,{sub:'frame',explode:[0,0,-10],order:2});
  const bearing=new THREE.Group();
  const housing=cyl(4,6,C.roseMauve);housing.rotation.x=Math.PI/2;bearing.add(housing);
  kit.part('bearing housing',bearing,{sub:'pivot',explode:[0,10,8],order:3,cut:'all'});
  const race=new THREE.Group();
  const ring=mesh(new THREE.TorusGeometry(2.6,.35,12,40),C.mist);race.add(ring);
  for(let i=0;i<10;i++){const a=i*2*Math.PI/10;const ball=mesh(new THREE.SphereGeometry(.5,12,8),C.ivory);ball.position.set(2.6*Math.cos(a),2.6*Math.sin(a),0);race.add(ball);}
  kit.part('bearing race',race,{sub:'pivot',explode:[0,10,16],order:4});kit.anchor('pivot',race);
  const axle=cyl(1,10,C.mauve);axle.rotation.x=Math.PI/2;
  kit.part('axle',axle,{sub:'pivot',explode:[0,0,24],order:5});
  const rodGroup=new THREE.Group(); const rod=cyl(.45,1,C.mist); rodGroup.add(rod);
  kit.part('rod',rodGroup,{sub:'swing',explode:[12,0,12],order:6});kit.anchor('rod',rod);
  const bobGroup=new THREE.Group();
  const bob=cyl(4.5,2.5,C.roseMauve);bob.rotation.x=Math.PI/2;bobGroup.add(bob);
  const bevel=mesh(new THREE.TorusGeometry(4.3,.3,10,48),C.ivory);bevel.position.z=1.4;bobGroup.add(bevel);
  const hub=cyl(1,3,C.mauve);hub.rotation.x=Math.PI/2;bobGroup.add(hub);
  kit.part('bob',bobGroup,{sub:'swing',explode:[-12,0,14],order:7});kit.anchor('bob',bobGroup,[0,0,2]);
  const marker=box(.7,3,1,C.roseInk);marker.position.set(0,-106,0);
  kit.part('centre marker',marker,{sub:'frame',explode:[0,-10,5],order:8});
  return {pose(s){
    const L=s.length*100;
    rodGroup.rotation.z=s.angle;
    rod.position.y=-L/2;rod.scale.y=L;
    bobGroup.position.set(s.x*100,s.y*100,0);
    // Bob mass is an input, but external dimensions are held fixed: density is illustrative.
    kit.hot('bob',s.K>s.U);
    kit.hot('rod',s.U>=s.K);
  }};
}
