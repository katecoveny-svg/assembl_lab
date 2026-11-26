// Finishes for the coastal house preset. Positions are in the original shell's model metres.
const surfaces = new Map();
function surface(reference, file) {
  if (!surfaces.has(file)) {
    const img = new Image();
    const texture = reference.clone();
    // clone() shares the Source; swapping the bitmap on our copy must leave other presets intact.
    const tile=document.createElement('canvas');tile.width=tile.height=512;
    const brush=tile.getContext('2d');brush.drawImage(reference.image,0,0,512,512);
    texture.source = new reference.source.constructor(tile);
    texture.repeat.set(1,1);
    texture.colorSpace = reference.colorSpace; texture.anisotropy = 4;
    img.onload = () => { brush.drawImage(img,0,0,512,512); texture.needsUpdate = true; };
    img.src = new URL('./study-assets/' + file, import.meta.url).href;
    surfaces.set(file, texture);
  }
  return surfaces.get(file);
}
export function finishCoastalHouse(T, house, parts) {
  const {group} = house;
  const {ground, wing, chimney, floor, roof, soffit, ceiling, glass, rug, sofa, back, table, drum, curtains, backWall, endWall, bedroomWindow, windowBack, stack} = parts;
  const newMaterial = (color, roughness, extra = {}) => new T.Material({color, roughness, ...extra});
  const metal = newMaterial(0x36332f,.35,{metalness:.45});
  const oak = newMaterial(0xc49a71,.62,{map:house.texOakFloor});
  const travertine = newMaterial(0xc4bba6,.78,{map:house.texConcrete, bumpMap:house.texConcrete, bumpScale:.0015});
  const charcoal = newMaterial(0x34302d,.83,{map:house.texCedar});
  const fabric = newMaterial(0xd6c6ab,.97);
  // A low-contrast warp and weft survives mipmapping without screen-space grain.
  const clothCanvas=document.createElement('canvas');clothCanvas.width=clothCanvas.height=128;
  const weave=clothCanvas.getContext('2d'),pixels=weave.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const thread=184+9*Math.sin(x*Math.PI/2)+6*Math.cos(y*Math.PI/2)+4*Math.sin((x+y)*Math.PI/4);
    const i=(y*128+x)*4;pixels.data.set([thread,thread,thread,255],i);
  }
  weave.putImageData(pixels,0,0);
  const cloth=house.texConcrete.clone();cloth.source=new house.texConcrete.source.constructor(clothCanvas);
  cloth.repeat.set(5,5);cloth.needsUpdate=true;fabric.bumpMap=cloth;fabric.bumpScale=.0012;fabric.roughness=.9;
  const leather = newMaterial(0x8e5032,.52);
  const mesh = (geometry, material, x, y, z) => {
    const object = new T.Mesh(geometry, material);
    object.position.set(x,ground+y,z); object.castShadow = object.receiveShadow = true;
    group.add(object); return object;
  };
  const box = (x,y,z,w,h,d,mat) => mesh(new T.Box(w,h,d),mat,x,y,z);
  function cushion(x,y,z,w,h,d,r,material) {
    const geo = new T.Box(w,h,d,10,6,8), pos = geo.attributes.position;
    for(let i=0;i<pos.count;i++) {
      const a=pos.getX(i),b=pos.getY(i),c=pos.getZ(i);
      const clamp=(v,n)=>Math.max(-n+r,Math.min(n-r,v));
      const px=clamp(a,w/2),py=clamp(b,h/2),pz=clamp(c,d/2);
      const len=Math.hypot(a-px,b-py,c-pz)||1;
      const crown=.016*(1-(2*a/w)**2)*(1-(2*c/d)**2);
      pos.setXYZ(i,px+(a-px)*r/len,py+(b-py)*r/len+Math.max(0,crown),pz+(c-pz)*r/len);
    }
    geo.computeVertexNormals();return mesh(geo,material,x,y,z);
  }
  const ash=surface(house.texCedar,'charred.webp'), timber=surface(house.texOakFloor,'cedar.webp');
  const plaster=surface(house.texConcrete,'plastered_wall_04.webp');
  oak.map=timber;oak.color.setHex(0xd4b28c);oak.bumpMap=timber;oak.bumpScale=.0013;
  const mantle=newMaterial(0xb7afa2,.86,{map:plaster,bumpMap:plaster,bumpScale:.0019});
  const siding=newMaterial(0x9e9692,.76,{map:ash,bumpMap:ash,bumpScale:.002});
  // World-scale grain on vertical returns vs. horizontal touching surfaces.
  function grain(o,scaleU,scaleV){
    const geo=o.geometry,pos=geo.attributes.position,uv=geo.attributes.uv,n=geo.attributes.normal;
    for(let i=0;i<pos.count;i++){
      const upright=Math.abs(n.getY(i))<.7;
      const u=Math.abs(n.getX(i))>.6?pos.getZ(i):pos.getX(i);
      uv.setXY(i,u/scaleU,(upright?pos.getY(i):pos.getZ(i))/scaleV);
    }
    return o;
  }
  const takeOut=o=>{group.remove(o);o.geometry.dispose();};
  [wing,bedroomWindow,windowBack].forEach(takeOut);
  // Replace the solid bedroom front and opaque flat window with an opening in the same wall.
  const wx=-11,front=-8.30;
  for(const o of [...group.children]){
    if(o.geometry?.parameters?.width===.055 && Math.abs(o.position.z-(front+.03))<.02 && Math.abs(o.position.x-wx)<.88) group.remove(o);
  }
  for(const spec of [[-12.35,1.55,front,.90,3.0,.16],[-8.55,1.55,front,3.10,3.0,.16],[wx,.27,front,1.83,.44,.16],[wx,2.89,front,1.83,.32,.16],[-12.74,1.55,-10.5,.13,3,4.4],[-7.05,1.55,-10.5,.13,3,4.4],[-9.9,1.55,-12.62,5.80,3,.16],[-9.9,3.03,-10.5,5.8,.10,4.4]]){
    grain(box(...spec,siding),1.18,2.70);
  }
  const recessed=front-.17;
  for(const xx of [wx-.878,wx+.878])box(xx,1.57,recessed,.066,2.3,.31,metal);
  for(const yy of [.49,2.70])box(wx,yy,recessed,1.80,.064,.31,metal);
  const plasterRoom=newMaterial(0xaf9d84,.92,{map:plaster});
  box(wx,1.48,-11.86,3.3,2.86,.05,plasterRoom);
  box(wx,.39,-10.31,1.42,.38,1.98,oak);cushion(wx,.69,-10.31,1.44,.25,2,.095,fabric);
  const bedGlass=mesh(new T.Plane(1.72,2.15),glass.material,wx,1.59,recessed+.03);
  // Foot roll, tucked cover and two pillows give the bed a legible scale behind the glass.
  const cover=newMaterial(0x9b947d,.94);
  cushion(wx,.756,-9.79,1.46,.13,.91,.061,cover);
  for(const dx of [-.35,.35])cushion(wx+dx,.86,-10.98,.65,.17,.36,.078,fabric).rotation.x=.15;
  bedGlass.castShadow=false;box(wx+.34,1.59,recessed+.05,.039,2.16,.059,metal);
  roof.material=metal;soffit.material=oak;ceiling.material=oak;
  grain(soffit,2.4,1.9);chimney.material=mantle;stack.material=mantle;
  grain(chimney,2.2,1.4);grain(stack,2.2,1.4);
  const joint = newMaterial(0x786e61,.95);
  for(const yy of [.67,1.32,1.97,2.62,3.27])box(-6,yy,-8.286,3.15,.011,.012,joint);
  // Carry the fine negative vertical joint around the dark wing. Keep the bedroom opening clear.
  const boards=newMaterial(0x242322,.91);
  for(let j=1;j<43;j++){
    const xx=-12.79+j*.138;
    if(xx<wx-.92||xx>wx+.92)box(xx,1.55,front+.084,.009,2.98,.006,boards);
  }
  floor.material.roughness=.68;
  glass.material.opacity=.105;glass.material.color.setHex(0x9aa7a2);
  glass.material.metalness=.03;glass.material.roughness=.077;
  glass.material.envMapIntensity=1.18;glass.material.depthWrite=false;
  // Oak-lined rear wall, low joinery and recessed shelves give the room a readable depth behind the glass.
  backWall.material=newMaterial(0xb2a28d,.92,{map:plaster});endWall.material=plasterRoom;
  box(-1.63,1.25,-12.37,6.54,2.36,.14,oak);
  const gap=newMaterial(0x534133,.94);
  box(-1.58,.50,-12.16,5.95,.57,.44,gap);
  for(let j=0;j<7;j++)box(-4.11+j*.84,.50,-11.932,.827,.51,.035,oak);
  box(-1.58,.798,-12.14,6.03,.034,.49,travertine);
  const picture=newMaterial(0x8b8476,.9);
  box(-2.63,1.82,-12.267,1.03,1.24,.08,metal);
  box(-2.63,1.82,-12.219,.98,1.19,.018,fabric);
  box(-2.63,1.84,-12.20,.66,.78,.014,picture);
  for(const [x,r,h] of [[.20,.09,.29],[.46,.07,.18]]) mesh(new T.Cylinder(r*.70,r,h,24),mantle,x,.82+h/2,-12.05);
  // A pendant at table height ties the ceiling to the dining area in the long elevation.
  mesh(new T.Cylinder(.009,.009,.72,10),metal,-.05,2.67,-10.6);
  mesh(new T.Cylinder(.045,.26,.20,38),metal,-.05,2.22,-10.6);
  // Two dark end caps and a cedar reveal give the thin glazing an actual depth.
  for (const x of [-4.23,1.61]) box(x,1.61,-7.98,.11,2.84,.19,oak);
  for (const y of [.235,3.015]) box(-1.28,y,-7.91,5.90,.028,.16,metal);
  for (const x of [-2.62,.22]) {
    box(x,1.1,-7.824,.018,.21,.028,metal);
    for (const y of [1.01,1.19]) box(x,y,-7.85,.022,.023,.06,metal);
  }
  // Curtains hang from the soffit; their folded surface catches side light from the garden.
  const linen = newMaterial(0xe1d8c8,.98,{side:2});
  linen.bumpMap=cloth;linen.bumpScale=.0008;
  for(const curtain of curtains){
    const width=.68,height=2.72,geo=new T.Plane(width,height,42,11);
    const position=geo.attributes.position;
    for(let i=0;i<position.count;i++){
      const u=geo.attributes.uv.getX(i),v=geo.attributes.uv.getY(i);
      const fold=2*Math.PI*(u*6+.13*Math.sin(v*Math.PI));
      position.setXYZ(i,position.getX(i)*(1.02-v*.16),position.getY(i)+.012*Math.cos(fold)*(1-v)**4,.062*Math.sin(fold)+.014*Math.sin(2*fold));
    }
    geo.computeVertexNormals();curtain.geometry.dispose();curtain.geometry=geo;curtain.material=linen;curtain.castShadow=true;
  }
  for(const o of [sofa,back,table,drum]) {group.remove(o);o.geometry.dispose();}
  rug.material.color.setHex(0xb0a193);rug.material.roughness=.98;
  // A low plinth, two sprung seats, pitched backs and the seam between the cushions.
  box(-2.80,.32,-10.93,2.58,.15,.84,charcoal);
  for(const x of [-3.39,-2.21]){
    cushion(x,.50,-10.86,1.16,.23,.87,.085,fabric);
    cushion(x,.84,-11.22,1.17,.59,.21,.088,fabric).rotation.x=-.13;
  }
  for(const x of [-4.05,-1.55])cushion(x,.64,-10.91,.18,.46,.92,.071,fabric);
  cushion(-3.59,.73,-10.98,.39,.36,.16,.065,leather).rotation.z=.19;
  cushion(-2.03,.72,-10.96,.42,.34,.17,.073,fabric).rotation.z=-.15;
  // The well beneath the soffit and the rug receive a diffuse contact gradient.
  const contactImage=document.createElement('canvas');contactImage.width=128;contactImage.height=128;
  const ink=contactImage.getContext('2d'),gradient=ink.createRadialGradient(64,64,8,64,64,63);
  gradient.addColorStop(0,'rgba(38,31,27,.58)');gradient.addColorStop(.49,'rgba(38,31,27,.36)');gradient.addColorStop(1,'rgba(38,31,27,0)');
  ink.fillStyle=gradient;ink.fillRect(0,0,128,128);
  const contactTex=house.texConcrete.clone();contactTex.source=new house.texConcrete.source.constructor(contactImage);contactTex.repeat.set(1,1);contactTex.needsUpdate=true;
  const shadow=newMaterial(0xffffff,1,{map:contactTex,transparent:true,depthWrite:false});
  for(const [cx,cz,w,d] of [[-2.8,-10.90,3.5,1.65],[-2.72,-9.58,1.5,1.1],[-.05,-10.6,2.28,2.08]]){
    const sh=mesh(new T.Plane(w,d),shadow,cx,.235,cz);sh.rotation.x=-Math.PI/2;sh.castShadow=false;
  }
  const coffee=mesh(new T.Cylinder(.53,.53,.05,52),travertine,-2.72,.56,-9.58);
  coffee.scale.z=.76;mesh(new T.Cylinder(.22,.27,.315,36),oak,-2.72,.377,-9.58);
  mesh(new T.Cylinder(.105,.07,.055,32),metal,-2.57,.61,-9.54);
  // A pedestal table leaves the end seats usable. Chair backs physically join their rear legs.
  cushion(-.05,.945,-10.6,1.83,.075,.88,.033,oak);
  for(const x of [-.62,.52])box(x,.568,-10.6,.10,.68,.53,oak);
  for(const side of [-1,1])for(const cx of [-.53,.43]){
    const z=-10.6+side*.66;
    cushion(cx,.66,z,.42,.07,.41,.032,leather);
    for(const dx of [-.16,.16])for(const dz of [-.145,.145]){
      const rear=dz*side>0,h=rear?.66:.42;
      mesh(new T.Cylinder(.021,.017,h,10),oak,cx+dx,.23+h/2,z+dz);
    }
    cushion(cx,.857,z+side*.15,.397,.14,.061,.025,oak);
  }
  // Open glazing supplies the diffuse light. Occlusion grows into the room and at the rear wall.
  // Per-vertex indirect shading is stable on WebGL and carries no extra frame or texture.
  const finishVariants=new Map();
  for(const piece of group.children){
    if(!piece.isMesh||piece.material.transparent||piece.position.z>-8.13||piece.position.z < -12.85||
        piece.position.x < -4.3 || piece.position.x>1.8||piece.position.y>ground+3.12)continue;
    const geom=piece.geometry.clone(),pos=geom.attributes.position,shade=new Float32Array(pos.count*3);
    for(let i=0;i<pos.count;i++){
      const depth=Math.max(0,Math.min(1,(-8.05-piece.position.z-pos.getZ(i))/4.4));
      const ceiling=Math.max(0,Math.min(1,(piece.position.y-ground+pos.getY(i)-2.15)/.87));
      const k=1-.36*depth-.13*ceiling;
      shade.set([k,k*.985,k*.96],i*3);
    }
    geom.setAttribute('color',new T.Attribute(shade,3));piece.geometry=geom;
    if(!finishVariants.has(piece.material)){
      const variant=piece.material.clone();variant.vertexColors=true;finishVariants.set(piece.material,variant);
    }
    piece.material=finishVariants.get(piece.material);
  }
}
