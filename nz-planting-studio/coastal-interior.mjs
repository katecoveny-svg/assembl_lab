// Finishes for the coastal house preset. Positions are in the original shell's model metres.
const surfaces = new Map();
// Textures are local to the shared house preset. Rebuilding the bed or changing the sun
// must not allocate another weave or re-rasterise the print.
const details = new WeakMap();
function interiorMaps(reference) {
  if (details.has(reference)) return details.get(reference);
  function make(width, height, draw, data = false) {
    const tile = document.createElement('canvas');
    tile.width = width; tile.height = height;
    draw(tile.getContext('2d'), width, height);
    const map = reference.clone();
    map.source = new reference.source.constructor(tile);
    map.repeat.set(1, 1);
    map.colorSpace = data ? '' : 'srgb';
    map.anisotropy = 4;
    map.needsUpdate = true;
    return map;
  }
  const tau = 2 * Math.PI;
  const weave = make(128, 128, (ctx, w, h) => {
    const pixel = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const warp = Math.cos(tau * (x / 4 + .075 * Math.sin(y * tau / 32)));
      const weft = Math.cos(tau * (y / 4 + .08 * Math.sin(x * tau / 64)));
      const over = ((x >> 2) + (y >> 2)) % 2 === 0;
      const slub = 3 * Math.sin(x * tau / 16) + 2 * Math.sin(y * tau / 32);
      const v = 229 + 9 * (over ? warp : weft) + 4 * (over ? weft : warp) + slub;
      pixel.data.set([v + 4, v + 2, v - 2, 255], (y * w + x) * 4);
    }
    ctx.putImageData(pixel, 0, 0);
  });
  const relief = weave.clone(); relief.colorSpace = ''; relief.needsUpdate = true;
  const print = make(512, 600, (ctx, w, h) => {
    // Original drypoint-style coastal study. The signed-distance lines follow a single
    // set of ridges so they remain recognisable when the camera crosses the threshold.
    ctx.fillStyle = '#ded6c1'; ctx.fillRect(0, 0, w, h);
    let seed = 17619;
    const random = () => (seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 4294967296;
    const ridge = (x, layer) => h * (.35 + .078 * layer) +
      19 * Math.sin(x * .011 + layer * .74) + 10 * Math.cos(x * .023 - layer * .7) +
      7 * Math.cos(x * .005 + layer) + 5 * Math.sin(x * .045 + layer);
    for (const [layer, colour] of ['#abaea0','#919b93','#74827b','#646e63','#484f47'].entries()) {
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 2) ctx.lineTo(x, ridge(x, layer));
      ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = colour; ctx.fill();
      ctx.strokeStyle = 'rgba(247,237,209,.33)'; ctx.lineWidth = .65;
      for (let row = 1; row <= 36; row++) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 3) {
          const y = ridge(x + row * 1.7, layer) + row * (3.8 + layer * .28);
          if (!x || random() < .032) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(253,247,225,.27)';
    for (let k = 0; k < 11000; k++) ctx.fillRect(random()*w,random()*h,.8,.65);
  });
  const limewash = make(192,192,(ctx,w,h)=>{
    const pixel=ctx.createImageData(w,h);
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){
      const x=i/w*tau,y=j/h*tau;
      const trowel=Math.cos(2*x+Math.cos(y))+Math.sin(3*y+Math.cos(x+y));
      const pore=Math.sin(29*x+7*y)*Math.sin(23*y-11*x);
      const v=239+2.2*trowel+1.3*pore;
      pixel.data.set([v+2,v,v-3,255],(j*w+i)*4);
    }
    ctx.putImageData(pixel,0,0);
  });
  const result = {weave, relief, print, limewash};
  details.set(reference, result);
  return result;
}
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
  // The sloping illustrative lawn crosses the level slab at the dining end. Suppress
  // just those fragments inside the built footprint. Height samples, raycasts,
  // the public terrain export and the planting estimate still use the original grid.
  if (T.positionWorld) {
    const land=house.terrainEngine;
    const terrain=house.scene.children.find(o=>o.geometry===land.geometry);
    if (terrain && !terrain.userData.coastalSlabMask) {
      const {x,z}=floor.position, {width,depth}=floor.geometry.parameters;
      const p=T.positionWorld;
      const outside=p.x.lessThan(x-width/2).or(p.x.greaterThan(x+width/2))
        .or(p.z.lessThan(z-depth/2)).or(p.z.greaterThan(z+depth/2));
      const active=T.uniform(0).onRenderUpdate(()=>Number(group.visible && house.presetId === 'coastal_pavilion' &&
        !land.hasRealParcelArea && (land.currentPresetId === 'waiheke' || land.currentPresetId === 'maunga')));
      const keep=active.lessThan(.5).or(outside);
      terrain.material.maskNode=terrain.material.maskNode ? terrain.material.maskNode.and(keep) : keep;
      terrain.material.needsUpdate=true;terrain.userData.coastalSlabMask=true;
    }
  }
  const newMaterial = (color, roughness, extra = {}) => new T.Material({color, roughness, ...extra});
  const metal = newMaterial(0x36332f,.35,{metalness:.45});
  const oak = newMaterial(0xc49a71,.62,{map:house.texOakFloor});
  const travertine = newMaterial(0xc4bba6,.78,{map:house.texConcrete, bumpMap:house.texConcrete, bumpScale:.0015});
  const charcoal = newMaterial(0x34302d,.83,{map:house.texCedar});
  const maps = interiorMaps(house.texConcrete);
  const fabric = newMaterial(0xe4d9c4,.92,{map:maps.weave,bumpMap:maps.relief,bumpScale:.00065});
  const leather = newMaterial(0xa27252,.60);
  const mesh = (geometry, material, x, y, z) => {
    const object = new T.Mesh(geometry, material);
    object.position.set(x,ground+y,z); object.castShadow = object.receiveShadow = true;
    group.add(object); return object;
  };
  const upholstery=[];
  const box = (x,y,z,w,h,d,mat) => mesh(new T.Box(w,h,d),mat,x,y,z);
  function cushionGeometry(w,h,d,r) {
    const geo = new T.Box(w,h,d,10,6,8), pos = geo.attributes.position;
    for(let i=0;i<pos.count;i++) {
      const a=pos.getX(i),b=pos.getY(i),c=pos.getZ(i);
      const clamp=(v,n)=>Math.max(-n+r,Math.min(n-r,v));
      const px=clamp(a,w/2),py=clamp(b,h/2),pz=clamp(c,d/2);
      const len=Math.hypot(a-px,b-py,c-pz)||1;
      const crown=.016*(1-(2*a/w)**2)*(1-(2*c/d)**2);
      pos.setXYZ(i,px+(a-px)*r/len,py+(b-py)*r/len+Math.max(0,crown),pz+(c-pz)*r/len);
    }
    geo.computeVertexNormals();return geo;
  }
  function cushion(x,y,z,w,h,d,r,material) {
    const o = mesh(cushionGeometry(w,h,d,r),material,x,y,z);
    if (material.bumpMap === maps.relief) grain(o,.099,.099);
    return o;
  }
  function sewnPillow(x,y,z,w,h,d,mat,seed) {
    // Two stuffed panels share a shallow boxed perimeter. A biased seam, a fuller middle
    // and local pinches from the bottom corners give the cloth a direction of load.
    const cols=28, rows=24, xyz=[],uv=[],indices=[],shade=[];
    const perimeter=[],stride=cols+1;
    for (const face of [1,-1]) {
      for (let j=0;j<=rows;j++) for(let i=0;i<=cols;i++) {
        const u=2*i/cols-1,v=2*j/rows-1,au=Math.abs(u),av=Math.abs(v);
        const interior=Math.max(0,(1-u*u)*(1-v*v));
        const fill=Math.pow(interior,.49);
        const flank=au>.25 ? Math.exp(-(((av-.28-(au-.58)*.72)*8)**2)) * au**2 * (1-au) : 0;
        const px=u*w*.5*(1-.078*av**6)+.016*h*Math.sin(3*v+seed)*interior;
        const py=v*h*.5*(1-.10*au**5) + .031*h*(u*u-.4)*(1-av*.4);
        const pz=face*d*(.038+.47*fill-.170*flank) - .042*h*(1-v*v)*u*u;
        xyz.push(px,py,pz);
        uv.push((u+1)*w/.20,(v+1)*h/.20);
        const ao=.91+.09*fill-.18*flank; shade.push(ao,ao,ao);
      }
      const offset=face===1?0:stride*(rows+1);
      for(let j=0;j<rows;j++) for(let i=0;i<cols;i++) {
        const a=offset+j*stride+i,b=a+1,c=a+stride,e=c+1;
        if(face===1) indices.push(a,b,e,a,e,c);
        else indices.push(a,e,b,a,c,e);
      }
    }
    for(let i=0;i<cols;i++)perimeter.push(i);
    for(let j=0;j<rows;j++)perimeter.push(j*stride+cols);
    for(let i=cols;i>0;i--)perimeter.push(rows*stride+i);
    for(let j=rows;j>0;j--)perimeter.push(j*stride);
    const rear=stride*(rows+1);
    for(let i=0;i<perimeter.length;i++) {
      const a=perimeter[i],b=perimeter[(i+1)%perimeter.length];
      indices.push(a,a+rear,b+rear,a,b+rear,b);
    }
    const geo=new T.Plane(1,1);
    geo.setAttribute('position',new T.Attribute(new Float32Array(xyz),3));
    geo.setAttribute('uv',new T.Attribute(new Float32Array(uv),2));
    geo.setAttribute('color',new T.Attribute(new Float32Array(shade),3));
    geo.deleteAttribute('normal'); geo.setIndex(indices); geo.computeVertexNormals();
    return mesh(geo,mat,x,y,z);
  }
  function seatWelt(x,y,z,w,d,mat) {
    const xyz=[],uv=[],indices=[],radius=.066,sides=6;
    const arc=[[1,1,0],[-1,1,.5],[-1,-1,1],[1,-1,1.5]];
    for(const [dx,dz,start] of arc) for(let j=0;j<=8;j++) {
      const a=Math.PI*(start+j/16),nx=Math.cos(a),nz=Math.sin(a);
      for(let side=0;side<sides;side++){
        const b=side*2*Math.PI/sides,r=.0031;
        xyz.push(dx*(w/2-radius)+nx*(radius+r*Math.cos(b)),r*Math.sin(b),dz*(d/2-radius)+nz*(radius+r*Math.cos(b)));
        uv.push(j/8,side/sides);
      }
    }
    const count=xyz.length/(sides*3);
    for(let k=0;k<count;k++) for(let l=0;l<sides;l++){
      const a=k*sides+l,b=k*sides+(l+1)%sides,c=((k+1)%count)*sides+l,e=((k+1)%count)*sides+(l+1)%sides;
      indices.push(a,b,c,b,e,c);
    }
    const geo=new T.Plane(1,1);
    geo.setAttribute('position',new T.Attribute(new Float32Array(xyz),3));
    geo.setAttribute('uv',new T.Attribute(new Float32Array(uv),2));
    geo.deleteAttribute('normal');geo.setIndex(indices);geo.computeVertexNormals();
    return mesh(geo,mat,x,y,z);
  }
  function vessel(x,y,z,profile,mat){
    // The profile returns down the inner lip, leaving a visible wall thickness.
    const sides=40,xyz=[],indices=[],uv=[];
    for(let row=0;row<profile.length;row++)for(let j=0;j<=sides;j++){
      const a=2*Math.PI*j/sides,[radius,height]=profile[row];
      xyz.push(radius*Math.cos(a),height,radius*Math.sin(a));uv.push(j/sides,height*2);
      if(row && j){
        const b=row*(sides+1)+j,a=b-1,c=b-sides-1,d=c-1;
        indices.push(d,a,b,d,b,c);
      }
    }
    const geo=new T.Plane(1,1);
    geo.setAttribute('position',new T.Attribute(new Float32Array(xyz),3));
    geo.setAttribute('uv',new T.Attribute(new Float32Array(uv),2));
    geo.deleteAttribute('normal');geo.setIndex(indices);geo.computeVertexNormals();
    return mesh(geo,mat,x,y,z);
  }
  const ash=surface(house.texCedar,'charred.webp'), timber=surface(house.texOakFloor,'cedar.webp');
  const plaster=surface(house.texConcrete,'plastered_wall_04.webp');
  oak.map=timber;oak.color.setHex(0xd4b28c);oak.bumpMap=timber;oak.bumpScale=.0013;
  const mantle=newMaterial(0xd9cfbb,.87,{map:plaster,bumpMap:plaster,bumpScale:.00065});
  const siding=newMaterial(0x9e9692,.76,{map:ash,bumpMap:ash,bumpScale:.002});
  // World-scale grain on vertical returns vs. horizontal touching surfaces.
  function grain(o,scaleU,scaleV,vertical=false,offset=0){
    const geo=o.geometry,pos=geo.attributes.position,uv=geo.attributes.uv,n=geo.attributes.normal;
    for(let i=0;i<pos.count;i++){
      const upright=Math.abs(n.getY(i))<.7;
      const u=Math.abs(n.getX(i))>.6?pos.getZ(i):pos.getX(i);
      const v=upright?pos.getY(i):pos.getZ(i);
      uv.setXY(i,(vertical?v:u)/scaleU+offset,(vertical?u:v)/scaleV);
    }
    return o;
  }
  const takeOut=o=>{group.remove(o);o.geometry.dispose();};
  // Retain the two existing teak frames, pivots and mattress dimensions. Round the
  // three upholstery pieces on each and carry the interior's woven linen to the deck.
  for(const lounger of group.children.filter(o=>o.isGroup && o.children[0]?.geometry?.parameters?.width===.76)){
    lounger.traverse(o=>{
      const p=o.geometry?.parameters;
      if(!p || ![.70,.68,.46].includes(p.width) || p.height<.075 || p.height>.091)return;
      o.geometry.dispose();
      o.geometry=cushionGeometry(p.width,p.height,p.depth,.025);
      o.material=fabric;grain(o,.115,.115);
    });
  }
  [wing,bedroomWindow,windowBack].forEach(takeOut);
  // Replace the solid bedroom front and opaque flat window with an opening in the same wall.
  const wx=-11,front=-8.30;
  for(const o of [...group.children]){
    if(o.geometry?.parameters?.width===.055 && Math.abs(o.position.z-(front+.03))<.02 && Math.abs(o.position.x-wx)<.88) group.remove(o);
  }
  for(const spec of [[-12.35,1.55,front,.90,3.0,.16],[-8.55,1.55,front,3.10,3.0,.16],[wx,.27,front,1.83,.44,.16],[wx,2.89,front,1.83,.32,.16],[-12.74,1.55,-10.5,.13,3,4.4],[-7.05,1.55,-10.5,.13,3,4.4],[-9.9,1.55,-12.62,5.80,3,.16],[-9.9,3.03,-10.5,5.8,.10,4.4]]){
    grain(box(...spec,siding),2.4,1.12,true);
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
  const innerFinish=newMaterial(0xddd5c6,.91,{map:maps.limewash,bumpMap:maps.relief,bumpScale:.00012});
  const insideChimney=mesh(new T.Plane(chimney.geometry.parameters.depth,2.84,16,12),innerFinish,
    chimney.position.x+chimney.geometry.parameters.width/2+.002,1.62,chimney.position.z);
  insideChimney.rotation.y=Math.PI/2;grain(insideChimney,1.34,1.26);
  const joint = newMaterial(0x786e61,.95);
  for(const yy of [.67,1.32,1.97,2.62,3.27])box(-6,yy,-8.286,3.15,.011,.012,joint);
  // Carry the fine negative vertical joint around the dark wing. Keep the bedroom opening clear.
  const boards=newMaterial(0x242322,.91);
  for(let j=1;j<43;j++){
    const xx=-12.79+j*.138;
    if(xx<wx-.92||xx>wx+.92)box(xx,1.55,front+.084,.009,2.98,.006,boards);
  }
  floor.material.roughness=.65;
  grain(floor,2.2,1.25);
  glass.material.opacity=.105;glass.material.color.setHex(0x9aa7a2);
  glass.material.metalness=.03;glass.material.roughness=.077;
  glass.material.envMapIntensity=1.18;glass.material.depthWrite=false;
  // Divide the original sheet at its actual stiles. Park leaf two behind leaf three,
  // retaining both tracks, every sheet of glass and a genuinely open walking lane.
  const stile = glass.geometry.parameters;
  const start = glass.position.x - stile.width / 2, end = start + stile.width;
  const originalStiles = group.children.filter(o => o.geometry?.parameters.width === .055 &&
    Math.abs(o.position.z - glass.position.z) < .002 && o.position.x >= start-.002 && o.position.x <= end+.002);
  const edges = [...new Set(originalStiles.map(o => Math.round(o.position.x * 1000) / 1000))].sort((a,b)=>a-b);
  if (edges.length === 5) {
    for (let i=0;i<4;i++) {
      const w=edges[i+1]-edges[i], stacked=i===1;
      const px = stacked ? edges[2]+w/2 : edges[i]+w/2;
      const pz = glass.position.z-(stacked?.072:0);
      const pane=mesh(new T.Plane(w-.035,stile.height),glass.material,px,glass.position.y-ground,pz);
      pane.name = stacked ? 'coastal-slider-parked-leaf' : 'coastal-slider-leaf';
      pane.castShadow=false;
      if (stacked) {
        for (const side of [-1,1]) box(px+side*(w/2-.019),1.62,pz,.038,stile.height,.046,metal);
        const handleX=edges[2]+.082;
        box(handleX,1.12,pz+.075,.021,.22,.027,metal);
        for(const yy of [1.025,1.215])box(handleX,yy,pz+.048,.022,.023,.055,metal);
      }
    }
    takeOut(glass);
  }
  // Oak-lined rear wall, low joinery and recessed shelves give the room a readable depth behind the glass.
  backWall.material=innerFinish;endWall.material=innerFinish;
  const endSize=endWall.geometry.parameters;
  endWall.geometry.dispose();endWall.geometry=new T.Plane(endSize.width,endSize.height,18,12);
  grain(endWall,1.34,1.26);
  const wallOak=oak.clone();wallOak.color.setHex(0xe1d2bd);wallOak.roughness=.79;
  grain(mesh(new T.Box(6.54,2.36,.14,24,12,1),wallOak,-1.63,1.25,-12.37),2.4,1.3,true);
  const gap=newMaterial(0x534133,.94);
  box(-1.58,.50,-12.16,5.95,.57,.44,gap);
  for(let j=0;j<7;j++)grain(box(-4.11+j*.84,.50,-11.932,.827,.51,.035,oak),1.8,.90,true,j*.28);
  box(-1.58,.798,-12.14,6.03,.034,.49,travertine);
  const paper = newMaterial(0xe9e0ce,.94);
  const art= newMaterial(0xfffaf1,.93,{map:maps.print});
  box(-2.74,1.73,-12.276,1.16,1.24,.066,oak);
  box(-2.74,1.73,-12.239,1.122,1.202,.01,gap);
  box(-2.74,1.73,-12.230,1.107,1.187,.010,paper);
  mesh(new T.Plane(.824,.969),art,-2.74,1.75,-12.223);
  const clay=newMaterial(0x716858,.72,{bumpMap:maps.relief,bumpScale:.00037});
  vessel(.24,.817,-12.09,[[.066,0],[.096,.026],[.104,.13],[.081,.207],[.041,.244],[.043,.269],[.036,.269],[.036,.237]],clay);
  const lampX=-4.24,lampZ=-12.055;
  vessel(lampX,.817,lampZ,[[.061,0],[.083,.021],[.106,.093],[.098,.17],[.060,.214],[.027,.228]],clay);
  mesh(new T.Cylinder(.014,.014,.12,12),metal,lampX,1.073,lampZ);
  const shadeMat=newMaterial(0xf5e2bd,.92,{side:2,map:maps.weave,emissive:0xe9bd79,emissiveIntensity:.13});
  const shade=mesh(new T.Cylinder(.115,.199,.231,64,1,true),shadeMat,lampX,1.225,lampZ);
  grain(shade,.13,.13);
  // A pendant at table height ties the ceiling to the dining area in the long elevation.
  mesh(new T.Cylinder(.009,.009,.72,10),metal,-.05,2.67,-10.6);
  mesh(new T.Cylinder(.045,.26,.20,38),metal,-.05,2.22,-10.6);
  // Two dark end caps and a cedar reveal give the thin glazing an actual depth.
  for (const x of [-4.23,1.61]) box(x,1.61,-7.98,.11,2.84,.19,oak);
  for (const y of [.235,3.015]) box(-1.28,y,-7.91,5.90,.028,.16,metal);
  // Curtains hang from the soffit; their folded surface catches side light from the garden.
  const linen = newMaterial(0xe8dfce,.97,{side:2,map:maps.weave,bumpMap:maps.relief,bumpScale:.0004});
  for(const curtain of curtains){
    const width=.68,height=2.72,geo=new T.Plane(width,height,42,11);
    const position=geo.attributes.position;
    for(let i=0;i<position.count;i++){
      const u=geo.attributes.uv.getX(i),v=geo.attributes.uv.getY(i);
      const fold=2*Math.PI*(u*6+.13*Math.sin(v*Math.PI));
      position.setXYZ(i,position.getX(i)*(1.02-v*.16),position.getY(i)+.012*Math.cos(fold)*(1-v)**4,.062*Math.sin(fold)+.014*Math.sin(2*fold));
    }
    geo.computeVertexNormals();curtain.geometry.dispose();curtain.geometry=geo;grain(curtain,.12,.12);curtain.material=linen;curtain.castShadow=true;
  }
  for(const o of [sofa,back,table,drum]) {group.remove(o);o.geometry.dispose();}
  rug.material.color.setHex(0xafa28f);rug.material.roughness=.97;
  rug.material.map=maps.weave;rug.material.bumpMap=maps.relief;rug.material.bumpScale=.0009;
  grain(rug,.22,.19);
  // A low plinth, two sprung seats, pitched backs and the seam between the cushions.
  box(-2.80,.294,-10.96,2.39,.10,.70,charcoal);
  cushion(-2.80,.381,-10.92,2.58,.14,.86,.058,fabric);
  const seam=newMaterial(0xc1b298,.96);
  for(const x of [-3.39,-2.21]){
    upholstery.push(cushion(x,.50,-10.86,1.16,.23,.87,.085,fabric));
    seatWelt(x,.526,-10.86,1.16,.87,seam);
    const backPad=sewnPillow(x,.858,-11.24,1.24,.66,.29,fabric,x);
    backPad.rotation.x=-.145;upholstery.push(backPad);
  }
  for(const x of [-4.05,-1.55])upholstery.push(cushion(x,.64,-10.91,.18,.46,.92,.071,fabric));
  const olive = newMaterial(0x827e64,.95,{map:maps.weave,bumpMap:maps.relief,bumpScale:.0006});
  const saddle=sewnPillow(-3.68,.816,-10.99,.49,.49,.17,leather,2);
  saddle.rotation.set(-.27,-.14,.13);
  const lumbar=sewnPillow(-1.98,.768,-10.96,.53,.35,.17,olive,5);
  lumbar.rotation.set(-.28,.12,-.09);
  upholstery.push(saddle,lumbar);
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
  vessel(-2.62,.586,-9.51,[[.068,0],[.072,.007],[.115,.022],[.132,.051],[.132,.056],[.124,.057],[.109,.035],[.064,.017],[.003,.017]],clay);
  // A pedestal table leaves the end seats usable. Chair backs physically join their rear legs.
  const tableOak=oak.clone();tableOak.color.setHex(0xc9b89f);tableOak.roughness=.64;
  grain(cushion(-.05,.945,-10.6,1.83,.075,.88,.033,tableOak),1.65,.81);
  for(const x of [-.62,.52])grain(box(x,.568,-10.6,.085,.68,.53,tableOak),1.3,.55,true);
  vessel(-.15,.985,-10.62,[[.055,0],[.060,.008],[.112,.032],[.132,.049],[.135,.055],[.130,.057],[.108,.040],[.045,.014],[.002,.014]],clay);
  function chairLeg(x,y,z,endX,endY,endZ){
    const direction=group.position.clone().set(endX-x,endY-y,endZ-z);
    const leg=mesh(new T.Cylinder(.021,.015,direction.length(),12),tableOak,(x+endX)/2,(y+endY)/2,(z+endZ)/2);
    leg.quaternion.setFromUnitVectors(group.position.clone().set(0,1,0),direction.normalize());
  }
  for(const side of [-1,1])for(const cx of [-.53,.43]){
    const z=-10.6+side*.66;
    cushion(cx,.65,z,.42,.07,.41,.032,leather);
    for(const dx of [-.16,.16])for(const dz of [-.145,.145]){
      const rear=dz*side>0;
      chairLeg(cx+dx*1.13,.204,z+dz*1.17,cx+dx,rear?1.004:.625,z+dz+(rear?side*.032:0));
    }
    const rail=mesh(new T.Box(.407,.117,.034,16,4,1),tableOak,cx,1.008,z+side*.185);
    const pos=rail.geometry.attributes.position;
    for(let k=0;k<pos.count;k++){
      const u=pos.getX(k)/.2035, h=pos.getY(k);
      pos.setZ(k,pos.getZ(k)+side*(.036*(1-u*u)+.080*h));
      pos.setY(k,h+.013*(1-u*u));
    }
    rail.geometry.computeVertexNormals();grain(rail,.7,.38);
  }
  // Integrate the visible area of the actual garden-facing glazing once per surface
  // vertex, with the curved cushions as local occluders. This supplies soft indoor
  // contrast under a moving sun; direct shadows remain the studio renderer's job.
  group.updateWorldMatrix(true,true);
  const point=group.position.clone(),normal=point.clone();
  const fabricBounds=upholstery.map(piece=>{
    piece.geometry.computeBoundingBox();
    const bounds=piece.geometry.boundingBox.clone().applyMatrix4(piece.matrixWorld);
    const centre=bounds.getCenter(point.clone()), diameter=bounds.getSize(point.clone());
    return {piece,centre,rx:2/diameter.x,ry:2/diameter.y,rz:2/diameter.z};
  });
  const windowSamples=[];
  for(let x=0;x<4;x++)for(let y=0;y<3;y++)windowSamples.push([
    start+(x+.5)*stile.width/4,glass.position.y+((y+.5)/3-.5)*stile.height,glass.position.z
  ]);
  function daylight(piece) {
    let flux=0,weight=0;
    for(const [wx,wy,wz] of windowSamples){
      const dx=wx-point.x,dy=wy-point.y,dz=wz-point.z;
      if(dz<=0)continue;
      const d2=dx*dx+dy*dy+dz*dz,inv=1/Math.sqrt(d2);
      const cos=Math.max(0,(dx*normal.x+dy*normal.y+dz*normal.z)*inv);
      const windowArea=dz*inv/Math.max(.33,d2);
      let visibility=1;
      for(const b of fabricBounds){
        if(b.piece===piece)continue;
        const px=(point.x-b.centre.x)*b.rx,py=(point.y-b.centre.y)*b.ry,pz=(point.z-b.centre.z)*b.rz;
        if(px*px+py*py+pz*pz>15)continue;
        const ax=dx*b.rx,ay=dy*b.ry,az=dz*b.rz;
        const t=-(ax*px+ay*py+az*pz)/(ax*ax+ay*ay+az*az);
        if(t<=.002 || t>=1)continue;
        const dist=(px+t*ax)**2+(py+t*ay)**2+(pz+t*az)**2;
        visibility=Math.min(visibility,Math.min(1,.27+.73*dist**1.33));
      }
      flux+=cos*visibility*windowArea; weight+=windowArea;
    }
    return Math.min(1,flux/(weight+.14));
  }
  const finishVariants=new Map(), geometryUses=new Map();
  for(const piece of group.children)if(piece.geometry)geometryUses.set(piece.geometry,(geometryUses.get(piece.geometry)||0)+1);
  for(const piece of group.children){
    if(!piece.isMesh||piece.material.transparent||piece.position.z>-8.13||piece.position.z < -12.85||
        piece.position.x < -4.3 || piece.position.x>1.8||piece.position.y>ground+3.12)continue;
    const geom=geometryUses.get(piece.geometry)>1?piece.geometry.clone():piece.geometry;
    const pos=geom.attributes.position,existing=geom.attributes.color,shade=new Float32Array(pos.count*3);
    for(let i=0;i<pos.count;i++){
      point.fromBufferAttribute(pos,i).applyMatrix4(piece.matrixWorld);
      normal.fromBufferAttribute(geom.attributes.normal,i).transformDirection(piece.matrixWorld);
      const depth=Math.max(0,Math.min(1,(glass.position.z-point.z)/4.4));
      const ambient=.77-.16*depth;
      const direct=daylight(piece)*.60;
      shade.set([(ambient+direct)*(existing?.getX(i)??1),
        (ambient*.977+direct*1.05)*(existing?.getY(i)??1),
        (ambient*.94+direct*1.12)*(existing?.getZ(i)??1)],i*3);
    }
    geom.setAttribute('color',new T.Attribute(shade,3));piece.geometry=geom;
    if(!finishVariants.has(piece.material)){
      const variant=piece.material.clone();variant.vertexColors=true;finishVariants.set(piece.material,variant);
    }
    piece.material=finishVariants.get(piece.material);
  }
}
