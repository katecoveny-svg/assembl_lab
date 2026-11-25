import * as T from './vendor/three.webgpu.min.js';

const {attribute, positionLocal:p, normalLocal:n, float, vec2, vec3, color, texture, mix, smoothstep, uniform} = T.TSL;

// The finish names come from the published mesh. Colours are a presentation palette.
function finish(name) {
  const key=name.toLowerCase();
  if(key==='cedar_shiplap_black_stain')return [2,0x4b4139,.79,.01];
  if(key==='floor_finish')return [1,0xcfa97e,.58,0];
  if(key==='decking')return [2,0xaa9174,.73,0];
  if(key==='cabinet_lacquer')return [2,0xac8665,.49,0];
  if(key==='porcelain_tile'||key==='bathroom_tile'||key==='splashback_tile')return [6,0xc6bbab,.39,.015];
  if(key==='benchtop')return [7,0xc3b4a1,.32,.02];
  if(key.includes('glass'))return [5,0xdce6e1,.06,0];
  if(/timber|ash|beech|oak|wood|pine|walnut/.test(key))return [2,/walnut/.test(key)?0x88654c:0xb49a77,.62,0];
  if(/linen|wool|weave|bouclé|flax/.test(key))return [3,/wool|taupe|02_unbleached/.test(key)?0x9f8972:/bouclé/.test(key)?0xddcec0:0xe7daca,.96,0];
  if(/brass/.test(key))return [4,0xbd9a68,.34,.62];
  if(/steel|chrome|mirror/.test(key))return [4,0xa6ada9,.31,.65];
  if(/aluminium|appliance_black|ebony/.test(key))return [0,0x39332f,.43,.15];
  if(/plaster|wall_paint|skirting|painted_door/.test(key))return [0,0xeee5d8,.86,0];
  if(/lacquer|benchtop|enamel|porcelain|tile|china/.test(key))return [0,/benchtop/.test(key)?0x948b80:0xd4cbc1,.45,0];
  if(/foliage/.test(key))return [0,0x64745d,.82,0];
  return null;
}
export function shadeSection(geometry,runs,light,timber,cloth,lift,aperture,info,uvs,atlas) {
  const count=geometry.attributes.position.count, c=geometry.attributes.color;
  const materialClass=new Float32Array(count), physical=new Float32Array(count*3), cuts=new Float32Array(count),daylight=new Float32Array(count);
  let from=0;
  for(const [end,name,layer] of runs){
    const f=finish(name),tone=f?new T.Color(f[1]):null;
    for(let i=from;i<end;i++){
      const ao=light[4+i]/255;daylight[i]=light[4+count+192*192+i]/255;
      if(tone){
        const variation=(name.startsWith('HERO-')?(c.getX(i)>.73?1.08:.95):1);
        c.setXYZ(i,tone.r*variation,tone.g*variation,tone.b*variation);
      }
      materialClass[i]=f?.[0]??0;
      physical.set([f?.[2]??.79,f?.[3]??0,ao],i*3);
      cuts[i]=layer==='partitions'?2:layer==='walls'?1:0;
    }
    from=end;
  }
  // Original Kōwhai texture coordinates and per-piece assignments were recovered from this exact unit, vertex for vertex.
  if(uvs.length!==count*2||info.runs.at(-1)[0]!==count)throw Error('Original 16C textures do not match geometry');
  const srcData=new Float32Array(count*3),srcTone=new Float32Array(count*3);
  let start=0;
  for(const [end,id,colour,tint,rough,metal] of info.runs){
    const rgb=new T.Color('#'+colour).multiply(new T.Color('#'+tint));
    for(let i=start;i<end;i++){
      srcData.set([uvs[i*2],uvs[i*2+1],id],i*3);srcTone.set([rgb.r,rgb.g,rgb.b],i*3);
      // Fittings retain their authored finish. Roughness from glass, floors and roof is specified separately above.
      if(id>=0 && materialClass[i]!==1 && materialClass[i]!==5){physical[i*3]=Math.min(.91,Math.max(.26,rough));physical[i*3+1]=Math.min(.9,metal)}
    }
    start=end;
  }
  geometry.setAttribute('studioUV',new T.BufferAttribute(srcData,3));geometry.setAttribute('studioTone',new T.BufferAttribute(srcTone,3));
  const surfaceInfo=new Float32Array(count*3);for(let i=0;i<count;i++)surfaceInfo.set([materialClass[i],daylight[i],cuts[i]],3*i);geometry.setAttribute('surfaceInfo',new T.BufferAttribute(surfaceInfo,3));
  geometry.setAttribute('finishProps',new T.BufferAttribute(physical,3));

  geometry.setAttribute('sectionWall',new T.BufferAttribute(cuts,1));
  const cls=attribute('surfaceInfo','vec3').x,props=attribute('finishProps','vec3'),base=attribute('color','vec3');
  const floor=cls.equal(1),wood=cls.equal(2),linen=cls.equal(3);
  const horizontal=n.y.abs().greaterThan(.65),end=n.x.abs().greaterThan(n.z.abs());
  const woodUV=horizontal.select(vec2(p.x.div(2.8),p.z.div(1.2)),vec2(p.y.div(2.8),end.select(p.z,p.x).div(1.2)));
  const woodLuma=texture(timber,woodUV).rgb.dot(vec3(.26,.54,.20)).clamp(.01,.87);
  const rows=p.z.div(.175),row=rows.floor(),along=p.x.div(1.93).add(row.mul(.382).fract());
  const joint=rows.fract().min(float(1).sub(rows.fract())).mul(.175).min(along.fract().min(float(1).sub(along.fract())).mul(1.93));
  const jointWidth=T.TSL.fwidth(p.z).max(.0018);
  const boardSeed=row.mul(93.3).add(along.floor().mul(77)).sin().mul(43758.5).fract();
  const floorUV=vec2(p.x.mul(.32).add(boardSeed.mul(2.3)),p.z.mul(1.22).add(boardSeed));
  const floorLuma=texture(timber,floorUV).rgb.dot(vec3(.3,.49,.21));
  const grain=woodLuma.mul(1.27).add(.66);
  const floorGrain=floorLuma.mul(1.64).add(.66).mul(boardSeed.mul(.12).add(.94)).mul(smoothstep(0,jointWidth,joint).mul(.18).add(.82));
  const clothUV=vec2(p.x.add(p.z.mul(.71)),p.z.add(p.y.mul(.86))).mul(3.4);
  const fibre=texture(cloth,clothUV).r.mul(.75).add(.77);
  const tiled=cls.equal(6),stone=cls.equal(7),tileUV=horizontal.select(vec2(p.x,p.z),vec2(end.select(p.z,p.x),p.y)).div(.30);
  const grid=tileUV.fract().min(vec2(1).sub(tileUV.fract())),grout=smoothstep(0,T.TSL.fwidth(tileUV.x).max(.007),grid.x.min(grid.y));
  const aggregate=texture(cloth,woodUV.mul(2.2)).r;
  const surface=floor.select(floorGrain,wood.select(grain,linen.select(fibre,tiled.select(grout.mul(.22).add(.78),stone.select(aggregate.mul(.24).add(.94),float(1))))));
  const floorMap=new T.DataTexture(new Uint8Array(light.buffer,light.byteOffset+4+count,192*192),192,192,T.RedFormat);
  const sunMap=new T.DataTexture(new Uint8Array(light.buffer,light.byteOffset+4+count*2+192*192,192*192),192,192,T.RedFormat);
  sunMap.magFilter=sunMap.minFilter=T.LinearFilter;sunMap.needsUpdate=true;
  floorMap.magFilter=floorMap.minFilter=T.LinearFilter;floorMap.needsUpdate=true;
  const floorAO=texture(floorMap,vec2(p.x.div(10.8),p.z.div(6))).r;
  const sunVisibility=floor.select(texture(sunMap,vec2(p.x.div(10.8),p.z.div(6))).r,attribute('surfaceInfo','vec3').y);
  const shade=floor.select(floorAO,props.z).mul(.42).add(.58).mul(sunVisibility.mul(.22).add(.78));
  const material=new T.MeshStandardNodeMaterial({side:T.DoubleSide});
  material.roughnessNode=props.x.mul(wood.or(floor).select(woodLuma.mul(.47).add(.77),float(1)));material.metalnessNode=props.y;
  // Cut only the presentation-facing walls. The registered state uses the complete wall silhouettes.
  const facing=p.z.greaterThan(5.79).or(p.x.lessThan(.18));
  const wall=attribute('surfaceInfo','vec3').z;const cut=wall.greaterThan(.5).and(facing.or(wall.greaterThan(1.5).and(p.z.greaterThan(2.5))));
  const cutHeight=mix(4.0,.83,lift);
  material.maskNode=cut.not().or(p.y.lessThanEqual(cutHeight));
  const inkEdge=cut.and(p.y.greaterThan(cutHeight.sub(.022)));
  const src=attribute('studioUV','vec3'),aid=src.z.max(0).round(),texel=src.xy.fract().mul(info.size-1).add(2.5);
  const ax=aid.mod(info.cols).mul(info.stride).add(texel.x).div(info.cols*info.stride);
  const ay=float(1).sub(aid.div(info.cols).floor().mul(info.stride).add(texel.y).div(info.rows*info.stride));
  // The modulo UV reset would select neighboring tiles at repeat seams; sample this padded tile at its authored resolution.

  const assetTex=texture(atlas,vec2(ax,ay)).level(0).rgb.mul(attribute('studioTone','vec3'));
  const authored=mix(assetTex,assetTex.mul(surface),floor.select(.12,wood.select(.24,linen.select(.30,.14))));
  const woodTone=src.z.greaterThan(-.5).select(authored,src.z.lessThan(-1.5).select(attribute('studioTone','vec3'),base).mul(surface)).mul(shade);
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
