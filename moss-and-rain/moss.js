import * as T from '/assets/vendor/three/three.module.min.js';
import {generator, stoneSpecs, sampleSurface, colony} from './surface.js';

function shootShape(variant){
  const pos=[], traits=[], indices=[],rng=generator(43+variant);
  // Layers overlap like roof tiles. Each leaf has an ovate blade, raised keel and tapered glassy tip.
  for(let i=0;i<20;i++){
    const level=i/19, a=i*2.39996+variant*.87+rng()*.1;
    const y=level*.58,reach=.20+.20*Math.sin(level*2.6),len=.28+level*.21;
    const width=(.10+.057*Math.sin(level*2.85))*(.92+.16*rng());
    const first=pos.length/3;
    function v(rad,lift,side,part,keel){
      pos.push(Math.cos(a)*rad-Math.sin(a)*side,y+lift,Math.sin(a)*rad+Math.cos(a)*side);
      traits.push(part,level,keel);
    }
    v(.025,0,0,0,0);
    v(reach*.54,len*.41,-width,.43,0);v(reach*.65,len*.47,0,.50,1);v(reach*.54,len*.41,width,.43,0);
    v(reach*.92,len*.83,-width*.55,.76,0);v(reach*.97,len*.86,0,.80,1);v(reach*.92,len*.83,width*.55,.76,0);
    v(reach,len*1.18,0,1,0);
    for(const ix of [0,1,2,0,2,3,1,4,5,1,5,2,2,5,6,2,6,3,4,7,5,5,7,6])indices.push(first+ix);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('trait',new T.Float32BufferAttribute(traits,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function foliageMaterial(uniforms){
  return new T.ShaderMaterial({uniforms,side:T.DoubleSide,vertexShader:`
    uniform sampler2D uWetMap;uniform vec3 uImpact;uniform float uAge;
    attribute vec3 trait; varying vec3 leaf; varying float moisture; varying vec3 n; varying float pigment; varying vec3 world;
    void main(){
      world=(instanceMatrix*vec4(position,1.)).xyz;
      moisture=texture2D(uWetMap,world.xz/8.+.5).r;
      float d=distance(world.xz,uImpact.xz);
      float wave=sin(15.*d-uAge*12.)*exp(-8.*abs(d-uAge*.8))*exp(-1.6*uAge);
      world.xz+=vec2(.010,-.006)*wave*position.y;
      gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
      n=normalize(mat3(instanceMatrix)*normal);leaf=trait; pigment=fract(sin(dot(instanceMatrix[3].xz,vec2(19.23,41.53)))*2352.21);}`,
    fragmentShader:`
    varying vec3 leaf,n,world; varying float moisture,pigment;
    void main(){
      vec3 N=normalize(n),L=normalize(vec3(-.67,.93,-.48)),V=normalize(cameraPosition-world);
      float light=.58+.48*abs(dot(N,L));
      float tint=clamp(.25+.48*pigment+.23*sin(world.x*4.+world.z*9.),0.,1.);
      vec3 base=mix(vec3(.20,.275,.067),vec3(.41,.48,.13),tint);
      float edge=smoothstep(.58+.1*pigment,.96,leaf.x)*(.47+.42*leaf.y);
      vec3 dry=mix(base,vec3(.78,.81,.65),edge*.88);
      vec3 wet=mix(base*vec3(.71,1.04,.78),vec3(.59,.72,.28),edge*.55);
      float shade=.48+.50*leaf.y+.14*leaf.x;
      vec3 c=mix(dry,wet,moisture)*light*shade;
      float rim=pow(1.-abs(dot(N,V)),3.)*leaf.x;
      c+=vec3(.15,.15,.07)*rim + leaf.z*.022;
      c+=vec3(.75,.77,.52)*pow(abs(dot(N,normalize(L+V))),34.)*moisture*.24*leaf.x;
      gl_FragColor=vec4(c,1.);
    }`});
}

// Batch the stems and nodding capsules as one mesh. Rings share the same centreline so capsules stay attached.
function capsules(points,rng){
  const pos=[],colors=[],ix=[];
  for(const {p,n,size} of points){
    const a=rng()*Math.PI*2,lean=new T.Vector3(Math.sin(a),0,Math.cos(a));
    const axis=n.clone().lerp(new T.Vector3(0,1,0),.68).normalize();
    const h=size*(2.05+rng()*2.9),start=pos.length/3;
    const rings=[[0,0,.025],[.37,.025,.022],[.72,.11,.018],[.99,.27,.021],[1.03,.36,.039],[.99,.43,.079],[.87,.48,.091],[.80,.50,.052],[.78,.51,.052],[.75,.52,.009]];
    const centers=rings.map(([y,x])=>p.clone().addScaledVector(axis,y*h).addScaledVector(lean,x*h));
    const dry=rng();
    for(let j=0;j<rings.length;j++){
      const dir=centers[Math.min(j+1,centers.length-1)].clone().sub(centers[Math.max(j-1,0)]).normalize();
      const right=new T.Vector3().crossVectors(dir,lean).normalize(),side=new T.Vector3().crossVectors(dir,right);
      const color=new T.Color().setRGB(j<4?.26+.14*j/4:.53+.24*dry,j<4?.13:.25+.10*dry,j<4?.065:.095);
      for(let k=0;k<7;k++){
        const theta=k*Math.PI*2/7,r=rings[j][2]*size;
        const v=centers[j].clone().addScaledVector(right,Math.cos(theta)*r).addScaledVector(side,Math.sin(theta)*r);
        pos.push(...v.toArray());const f=.83+.2*Math.cos(theta-1.6);colors.push(color.r*f,color.g*f,color.b*f);
        if(j){let b=start+j*7+k,c=start+j*7+(k+1)%7;ix.push(b-7,c-7,b,c-7,c,b);}
      }
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(ix);g.computeVertexNormals();
  return new T.Mesh(g,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}));
}
export function addMoss(scene,uniforms,compact){
  const rng=generator(8712),groups=[[],[],[]],spores=[],beads=[],up=new T.Vector3(0,1,0), m=new T.Object3D();
  for(let j=0;j<stoneSpecs.length;j++){
    const s=stoneSpecs[j], count=[25000,5500,4100,1800][j]*(compact?.70:1);
    for(let i=0;i<count;i++){
      const a=rng()*Math.PI*2,y=rng()*1.31-.22,l=Math.sqrt(Math.max(0,1-y*y));if(y>1)continue;
      const {p,n}=sampleSurface(new T.Vector3(Math.cos(a)*l,y,Math.sin(a)*l),s);
      const field=colony(p,s.k)+.30*n.y-.09;
      if(field<.37+rng()*.20 || n.y<-.24)continue;
      const size=(.041+.034*rng()+.024*Math.max(0,field-.5))*(compact?1.15:1);
      m.position.copy(p).addScaledVector(n,-.005+.019*Math.max(0,field-.48));
      m.quaternion.setFromUnitVectors(up,n.clone().lerp(up,.22).normalize());m.rotateY(rng()*Math.PI*2);m.rotateX((rng()-.5)*.25);
      m.scale.set(size,size*(.78+.46*rng()),size);m.updateMatrix();groups[i%3].push(m.matrix.clone());
      if(j===0&&rng()<.009&&n.y>.13&&field>.54)spores.push({p:m.position.clone(),n:n.clone(),size});
      if(j<2&&rng()<.012&&n.y>.17)beads.push({p:m.position.clone().addScaledVector(n,size*.82),r:size*(.065+.14*rng())});
    }
  }
  const mat=foliageMaterial(uniforms);
  for(let i=0;i<groups.length;i++){
    const mesh=new T.InstancedMesh(shootShape(i),mat,groups[i].length);
    groups[i].forEach((x,k)=>mesh.setMatrixAt(k,x));mesh.computeBoundingSphere();scene.add(mesh);
  }
  scene.add(capsules(spores,rng));
  const beadMat=new T.ShaderMaterial({uniforms,vertexShader:`
    uniform sampler2D uWetMap;varying vec3 N,P;varying float wet;
    void main(){vec3 base=instanceMatrix[3].xyz;wet=texture2D(uWetMap,base.xz/8.+.5).r;
    P=(instanceMatrix*vec4(position*smoothstep(.13,.82,wet),1.)).xyz;N=normalize(mat3(instanceMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(P,1.);}`,
    fragmentShader:`varying vec3 N,P;varying float wet; void main(){if(wet<.14)discard;
      vec3 n=normalize(N),v=normalize(cameraPosition-P),r=reflect(-v,n);
      float edge=pow(1.-max(dot(n,v),0.),2.);
      vec3 c=mix(vec3(.23,.32,.14),vec3(.78,.85,.71),smoothstep(.25,.74,r.y)*.83);
      c+=vec3(.95)*pow(max(0.,dot(r,normalize(vec3(-.55,.7,.45)))),38.);
      gl_FragColor=vec4(c+edge*.13,1.);}`});
  const droplets=new T.InstancedMesh(new T.SphereGeometry(1,8,6),beadMat,beads.length);
  beads.forEach(({p,r},i)=>{m.position.copy(p);m.quaternion.identity();m.scale.set(r,r*.88,r);m.updateMatrix();droplets.setMatrixAt(i,m.matrix);});droplets.computeBoundingSphere();scene.add(droplets);
}
