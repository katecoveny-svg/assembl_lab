// A presentation mode of the actual scene: the camera, plants and terrain stay editable.
export function makeBedModel({SceneColor,Texture,Material,scene,terrain,ground,horizon,sky,engine,sun,fill,rim,restoreLight}){
 const original={background:scene.background,ground:ground.material,horizon:horizon.material,fog:scene.fog.density};
 const sheet=document.createElement('canvas');sheet.width=sheet.height=1024;
 const ctx=sheet.getContext('2d'),map=new Texture(sheet);map.colorSpace='srgb';map.anisotropy=8;
 const paper=new Material({color:0xffffff,map,roughness:1}),surround=new Material({color:0xf5efe5,roughness:1});
 const back=new SceneColor(0xf4eee4);
 let active=false;
 function paint(){
  const n=sheet.width,s=n/terrain.terrainSize;
  ctx.fillStyle='#f5efe5';ctx.fillRect(0,0,n,n);
  for(let axis=0;axis<2;axis++)for(let m=-Math.floor(terrain.terrainSize/2);m<=terrain.terrainSize/2;m++){
   const z=n/2+m*s;
   ctx.beginPath();ctx.strokeStyle=m%5===0?'#cdbfb6':'#e2d8ce';ctx.lineWidth=m%5===0?1.25:.7;
   if(axis){ctx.moveTo(0,z);ctx.lineTo(n,z)}else{ctx.moveTo(z,0);ctx.lineTo(z,n)}ctx.stroke();
  }
  for(const bed of engine.beds){
   if(bed.points.length<3)continue;
   ctx.beginPath();bed.points.forEach((p,j)=>{const x=n/2+p.x*s,y=n/2+p.z*s;if(j)ctx.lineTo(x,y);else ctx.moveTo(x,y)});ctx.closePath();
   ctx.fillStyle='#a88a70';ctx.fill();ctx.strokeStyle='#84705f';ctx.lineWidth=1.4;ctx.stroke();
  }
  map.needsUpdate=true;
 }
 return function setBedModel(next){
  next=Boolean(next);
  if(next){
   paint();scene.background=back;ground.material=paper;horizon.material=surround;sky.visible=false;
   scene.fog.density=0;sun.position.set(-11,20,11);sun.color.set(0xfff4e5);sun.intensity=1.85;fill.intensity=1.18;rim.intensity=.44;
  }else if(active){
   scene.background=original.background;ground.material=original.ground;horizon.material=original.horizon;
   sky.visible=true;scene.fog.density=original.fog;restoreLight();
  }
  active=next;return active;
 };
}
