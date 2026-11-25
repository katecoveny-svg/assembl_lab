import * as T from './vendor/three.webgpu.min.js';

const {attribute, positionLocal:p, normalLocal:n, float, vec2, vec3, color, texture, mix, smoothstep, uniform} = T.TSL;

// The finish names come from the published mesh. Colours are a presentation palette.
function finish(name) {
  const key=name.toLowerCase();
  if(key==='cedar_shiplap_black_stain')return [2,0x514642,.82,0];
  if(key==='floor_finish')return [1,0xceae8a,.73,0];
  if(key==='decking')return [2,0xb49b80,.80,0];
  if(/timber|ash|beech|oak|wood|pine|walnut/.test(key))return [2,/walnut/.test(key)?0x88654c:0xb49a77,.62,0];
  if(/linen|wool|weave|bouclé|flax/.test(key))return [3,/wool|taupe|02_unbleached/.test(key)?0xab9a8c:/bouclé/.test(key)?0xd7cdbe:0xe8ded2,.96,0];
  if(/brass/.test(key))return [4,0xbd9a68,.34,.62];
  if(/steel|chrome|mirror/.test(key))return [4,0xa6ada9,.31,.65];
  if(/aluminium|appliance_black|ebony/.test(key))return [0,0x39332f,.43,.15];
  if(/plaster|wall_paint|skirting|painted_door/.test(key))return [0,0xeee5d8,.86,0];
  if(/lacquer|benchtop|enamel|porcelain|tile|china/.test(key))return [0,/benchtop/.test(key)?0x948b80:0xd4cbc1,.45,0];
  if(/foliage/.test(key))return [0,0x64745d,.82,0];
  return null;
}
export function shadeSection(geometry,runs,light,timber,cloth,lift,aperture) {
  const count=geometry.attributes.position.count, c=geometry.attributes.color;
  const materialClass=new Float32Array(count), physical=new Float32Array(count*3), cuts=new Float32Array(count),daylight=new Float32Array(count);
  let from=0;
  for(const [end,name,layer] of runs){
    const f=finish(name),tone=f?new T.Color(f[1]):null;
    for(let i=from;i<end;i++){
      const ao=light[4+i]/255;daylight[i]=light[4+count+192*192+i]/255;
      if(tone)c.setXYZ(i,tone.r,tone.g,tone.b);
      materialClass[i]=f?.[0]??0;
      physical.set([f?.[2]??.79,f?.[3]??0,ao],i*3);
      cuts[i]=layer==='walls'||layer==='partitions'?1:0;
    }
    from=end;
  }
  geometry.setAttribute('finishClass',new T.BufferAttribute(materialClass,1));
  geometry.setAttribute('finishProps',new T.BufferAttribute(physical,3));
  geometry.setAttribute('skyPass',new T.BufferAttribute(daylight,1));
  geometry.setAttribute('sectionWall',new T.BufferAttribute(cuts,1));
  const cls=attribute('finishClass','float'),props=attribute('finishProps','vec3'),base=attribute('color','vec3');
  const floor=cls.equal(1),wood=cls.equal(2),linen=cls.equal(3);
  const horizontal=n.y.abs().greaterThan(.65),end=n.x.abs().greaterThan(n.z.abs());
  const woodUV=horizontal.select(vec2(p.x.div(2.8),p.z.div(1.2)),vec2(p.y.div(2.8),end.select(p.z,p.x).div(1.2)));
  const woodLuma=texture(timber,woodUV).rgb.dot(vec3(.26,.54,.20)).clamp(.04,.88);
  const rows=p.z.div(.17),row=rows.floor(),along=p.x.div(1.92).add(row.mul(.382).fract());
  const joint=rows.fract().min(float(1).sub(rows.fract())).mul(.17).min(along.fract().min(float(1).sub(along.fract())).mul(1.92));
  const jointWidth=T.TSL.fwidth(p.z).max(.0015);
  const grain=woodLuma.mul(.45).add(.88);
  const floorGrain=woodLuma.mul(.58).add(.81).mul(smoothstep(0,jointWidth,joint).mul(.075).add(.925));
  const clothUV=vec2(p.x.add(p.z.mul(.71)),p.z.add(p.y.mul(.86))).mul(3.4);
  const fibre=texture(cloth,clothUV).r.mul(.24).add(.90);
  const surface=floor.select(floorGrain,wood.select(grain,linen.select(fibre,float(1))));
  const floorMap=new T.DataTexture(new Uint8Array(light.buffer,light.byteOffset+4+count,192*192),192,192,T.RedFormat);
  const sunMap=new T.DataTexture(new Uint8Array(light.buffer,light.byteOffset+4+count*2+192*192,192*192),192,192,T.RedFormat);
  sunMap.magFilter=sunMap.minFilter=T.LinearFilter;sunMap.needsUpdate=true;
  floorMap.magFilter=floorMap.minFilter=T.LinearFilter;floorMap.needsUpdate=true;
  const floorAO=texture(floorMap,vec2(p.x.div(10.8),p.z.div(6))).r;
  const sunVisibility=floor.select(texture(sunMap,vec2(p.x.div(10.8),p.z.div(6))).r,attribute('skyPass','float'));
  const shade=floor.select(floorAO,props.z).mul(.54).add(.46).mul(sunVisibility.mul(.42).add(.58));
  const material=new T.MeshStandardNodeMaterial({side:T.DoubleSide});
  material.roughnessNode=props.x;material.metalnessNode=props.y;
  // Cut only the presentation-facing walls. The registered state uses the complete wall silhouettes.
  const facing=p.z.greaterThan(5.79).or(p.x.lessThan(.18));
  const cut=attribute('sectionWall','float').greaterThan(.5).and(facing);
  const cutHeight=mix(4.0,.83,lift);
  material.maskNode=cut.not().or(p.y.lessThanEqual(cutHeight));
  const inkEdge=cut.and(p.y.greaterThan(cutHeight.sub(.022)));
  const woodTone=base.mul(surface).mul(shade);
  const metric=vec2(p.x.add(79*10.8/508),p.z.add(128*10.8/508)),outer=float(660*10.8/508);
  const lensDepth=aperture.radius.sub(metric.sub(aperture.centre).length());
  const wipeDepth=aperture.wipe.mul(outer).sub(metric.x);
  const under=lensDepth.max(wipeDepth), pigment=smoothstep(.025,.40,under);
  const h=metric.x.add(metric.y.mul(.73)).mul(138),hatch=smoothstep(.13,.38,h.fract()).mul(.20).add(.8);
  const etch=mix(color(0xc9aeb3),color(0x72565d),float(1).sub(shade).mul(1.5)).mul(hatch);
  const finished=mix(etch,woodTone,pigment.max(aperture.plain));
  material.colorNode=inkEdge.select(color(0x654a4e),finished);
  return material;
}
