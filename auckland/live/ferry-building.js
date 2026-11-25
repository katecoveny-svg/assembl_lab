// Georeferenced original model of the 1912 Ferry Building; dimensions beyond its surveyed
// map outline are interpreted from reference photography, not a certified building survey.
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function createFerryBuilding(data) {
  const group = new T.Group(), parts = new Map();
  group.name = 'Ferry Building / OSM footprint and reference-based architectural model';
  group.position.set(-1755.75,3.2,-383.5);
  group.rotation.y = -Math.atan2(20.5,60);
  const mat = (color,roughness=.86,metalness=0) => new T.MeshStandardMaterial({color,roughness,metalness});
  const stone=mat('#bd955a'), ledge=mat('#aa7e49'), brick=mat('#8e4c39'), roof=mat('#754733'), granite=mat('#686258'),
    panes=mat('#2b4149',.28,.25), sash=mat('#d3c6ae'), recess=mat('#293031'), iron=mat('#363f3e',.43,.35), dial=mat('#eee6c9');
  new T.TextureLoader().load(data + 'ferry-masonry.webp', t => {
    t.colorSpace=T.SRGBColorSpace; t.wrapS=t.wrapT=T.RepeatWrapping; t.anisotropy=4; brick.color.set('#d2b8a9'); brick.map=t; brick.needsUpdate=true;
  },undefined,()=>{});
  new T.TextureLoader().load(data + 'ferry-terracotta.webp', t => {
    t.colorSpace=T.SRGBColorSpace; t.wrapS=t.wrapT=T.RepeatWrapping; t.anisotropy=4; roof.color.set('#ccb6a4'); roof.map=t; roof.needsUpdate=true;
  },undefined,()=>{});
  function put(m,g,x,y,z) { g.translate(x,y,z); if(!parts.has(m))parts.set(m,[]); parts.get(m).push(g); }
  function box(m,x,y,z,w,h,d) {
    const g=new T.BoxGeometry(w,h,d);
    if(m===brick) {
      const uv=g.attributes.uv;
      // Approx. 1.1 m of real brickwork is represented by each repeat; local surface dimensions determine UVs.
      for(let i=0;i<uv.count;i++){const f=Math.floor(i/4),u=f<2?d:w,v=f<4?h:d;uv.setXY(i,uv.getX(i)*u/1.1,uv.getY(i)*v/1.1);}
    }
    put(m,g,x,y,z);
  }
  function column(m,x,y,z,r,h) {put(m,new T.CylinderGeometry(r*.88,r,h,9),x,y,z);}
  function arch(m,x,y,z,r,ring,depth) {
    const f=new T.Shape();
    for(let i=0;i<=14;i++){const a=Math.PI*i/14; i?f.lineTo(Math.cos(a)*r,Math.sin(a)*r):f.moveTo(r,0);}
    for(let i=14;i>=0;i--){const a=Math.PI*i/14;f.lineTo(Math.cos(a)*(r-ring),Math.sin(a)*(r-ring));}
    f.closePath();const g=new T.ExtrudeGeometry(f,{depth,bevelEnabled:false});put(m,g,x,y,z);
  }
  function opening(m,x,y,z,r,baseH) {
    const f=new T.Shape();f.moveTo(-r,-baseH);f.lineTo(r,-baseH);f.lineTo(r,0);
    for(let i=1;i<=14;i++){const a=Math.PI*i/14;f.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
    f.closePath();put(m,new T.ShapeGeometry(f),x,y,z);
    put(m,new T.ShapeGeometry(f).rotateY(Math.PI),x,y,z);
  }
  function hip(m,x,y,z,w,d,topW,topD,h) {
    const a=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2]], b=[[-topW/2,h,-topD/2],[topW/2,h,-topD/2],[topW/2,h,topD/2],[-topW/2,h,topD/2]], p=[];
    for(let i=0;i<4;i++){const j=(i+1)%4;p.push(...a[i],...b[i],...b[j],...a[i],...b[j],...a[j]);}
    p.push(...b[0],...b[2],...b[1],...b[0],...b[3],...b[2]);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));const uv=[];for(let i=0;i<p.length;i+=3)uv.push(p[i]/1.8,p[i+2]/1.23);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();put(m,g,x,y,z);
  }
  function window(x,y,z,w,h) {
    box(ledge,x,y-h*.5-.08,z,w+.34,.22,.43);box(sash,x,y,z,w+.20,h+.18,.10);box(panes,x,y,z-.07,w,h,.11);
    box(sash,x,y,z-.15,.08,h,.09);box(sash,x,y+h*.20,z-.15,w,.075,.09);
  }
  // Four main levels, long eave, hipped terracotta roof and retained footprint.
  box(granite,0,.18,0,63.4,1.25,14.2);box(stone,0,2.56,0,63.4,4.35,14.2);
  box(brick,0,10.0,0,63.4,10.8,14.2);box(recess,0,15.76,0,62.8,1.3,13.8);
  hip(roof,0,16.42,0,64.2,14.8,53,1.2,2.58);box(ledge,0,16.47,0,64.1,.25,14.9);
  for(const yy of [4.75,10.63,11.01,14.22,15.12]){
    box(stone,0,yy,-7.12,64,.29,.72);box(stone,0,yy,7.12,64,.29,.72);
    box(stone,-31.65,yy,0,.58,.29,14.4);box(stone,31.65,yy,0,.58,.29,14.4);
  }
  // North elevations: recessed arcade behind sandstone arches; photos show terrace and repeated bays.
  for (let i=-4;i<=4;i++) {
    const x=i*6.32;
    opening(recess,x,2.26,-7.19,2.32,1.84);arch(stone,x,2.26,-7.41,2.63,.34,.26);
    box(stone,x-2.46,1.1,-7.32,.34,2.29,.35);box(stone,x+2.46,1.1,-7.32,.34,2.29,.35);
    box(iron,x,1.4,-7.22,.10,2.6,.1);box(iron,x,2.11,-7.22,4.35,.1,.12);
    window(x,8.55,-7.43,1.72,2.68); window(x,12.84,-7.38,1.52,2.08);
  }
  for(const x of [-20.15,20.15]) {
    box(stone,x,10.98,-7.36,7.15,6.8,.48);
    arch(stone,x,10.99,-7.81,4.19,.35,.18);
    window(x,12.55,-7.75,2.58,1.92);window(x,8.5,-7.82,2.84,2.54);
  }
  for(let i=-5;i<=5;i++){
    const x=i*5.60+2.8;
    column(stone,x,7.75,-7.55,.37,5.4);
    box(ledge,x,5.04,-7.57,1.04,.32,.92);box(stone,x,10.42,-7.60,1.09,.42,1.04);
    box(stone,x,12.54,-7.22,.55,3.13,.42);
  }
  for(let i=-14;i<=14;i++){const x=i*2.08; box(panes,x,15.77,-6.97,1.97,.96,.08);box(ledge,x-1.04,15.77,-7.03,.10,1.05,.10);}
  for(const xx of [-30.95,30.95]){
    box(stone,xx,10.0,-7.30,1.3,10.6,.58);
    for(let j=0;j<11;j++)box(ledge,xx,5.06+j*.91,-7.64,1.27,.075,.08);
  }
  box(stone,0,4.66,-8.78,54,.26,3.70);box(iron,0,5.73,-10.54,53.8,.075,.075);
  for(let i=-13;i<=13;i++)box(iron,i*2.06,5.24,-10.54,.07,1.04,.08);
  // OSM maps the tower separately. Its decorative spire, louvres and clock follow the reference.
  const cx=-.65, cz=3.02;
  box(brick,cx,19.27,cz,7.92,3.25,7.55);
  box(stone,cx,21.08,cz,8.31,.55,8.14);box(ledge,cx,21.44,cz,8.63,.25,8.44);
  box(stone,cx,23.05,cz,6.80,3.28,6.75);
  for(const sx of [-1,1])for(const sz of [-1,1])column(stone,cx+sx*3.18,23.19,cz+sz*3.13,.31,3.76);
  box(recess,cx,23.07,cz-3.40,1.54,2.13,.10);
  for(let i=0;i<8;i++)box(iron,cx,22.15+i*.25,cz-3.50,1.55,.075,.08);
  box(stone,cx,24.95,cz,7.55,.51,7.43);box(ledge,cx,25.23,cz,7.35,.21,7.21);
  hip(stone,cx,25.33,cz,6.65,6.59,1.65,1.65,4.28);
  box(ledge,cx,29.60,cz,2.11,.22,2.11);column(iron,cx,30.65,cz,.09,1.90);
  const clockY=19.73;
  for(const sign of [-1,1]){
    const z=cz+sign*3.82;
    put(iron,new T.CylinderGeometry(1.18,1.18,.10,28).rotateX(Math.PI/2),cx,clockY,z);
    put(dial,new T.CylinderGeometry(1.05,1.05,.12,28).rotateX(Math.PI/2),cx,clockY,z+sign*.021);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;put(iron,new T.BoxGeometry(.054,.127,.035).rotateZ(-a),cx+Math.sin(a)*.85,clockY+Math.cos(a)*.85,z+sign*.11);}
    put(iron,new T.BoxGeometry(.063,.94,.045).rotateZ(-.35),cx+.16,clockY+.43,z+sign*.13);
    put(iron,new T.BoxGeometry(.079,.66,.045).rotateZ(-1.49),cx+.30,clockY+.04,z+sign*.13);
  }
  // Cross-check bands against the Auckland Part 1 open 1 m 2024 DSM:
  // waterfront ground ~3.1 m, roof eave ~24.9 m, ridge ~27.6 m, tower peak sample ~48.8 m NZVD2016.
  // The source does not resolve the façade; leave the horizontal OSM frame alone.
  const remapY = y => y <= 16.42 ? y * (21.7/16.42) : y <= 19 ? 21.7+(y-16.42)*(2.7/2.58) : 24.4+(y-19)*(21.2/12.6);
  let triangles=0;
  for(const [m,geoms] of parts) {
    const merged=mergeGeometries(geoms.map(g=>g.index?g.toNonIndexed():g),false);
    if(!merged) { group.clear(); return null; }
    const xyz=merged.attributes.position;
    for(let i=0;i<xyz.count;i++)xyz.setY(i,remapY(xyz.getY(i)));
    merged.computeVertexNormals();
    const mesh=new T.Mesh(merged,m); mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);triangles+=merged.attributes.position.count/3;
  }
  group.userData.triangles=triangles;
  return group;
}
