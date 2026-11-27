import * as T from '/assets/vendor/three/three.module.min.js';

export function generator(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
const wave = (x,y,z) => Math.sin(x*3.17+y*2.9+z*.91)*Math.sin(y*2.73-z*3.58+x*.84);
const bump = (x,y,z,k) => .064*wave(x+k,y,z)+.033*wave(x*2.5,y*2.5+k,z*2.5)+.012*wave(x*6,y*6,z*6+k);
const round = x => Math.sign(x)*Math.pow(Math.abs(x),.82);
export const stoneSpecs = [
  {p:[-.12,.46,.08], s:[1.48,.72,.94], k:4},
  {p:[1.67,.12,-.94], s:[.88,.48,.63], k:8},
  {p:[-1.53,.06,-.99], s:[.76,.38,.84], k:15},
  {p:[1.18,-.01,1.0], s:[.49,.27,.35], k:17}
];
export function surface(d,stone) {
  const [x,y,z]=d.toArray(), {p,s,k}=stone;
  const v = 1 + bump(x,y,z,k) - .04*Math.abs(x-z*.7);
  return new T.Vector3(p[0]+s[0]*(round(x)*v+.11*y), p[1]+s[1]*(round(y)*v-.11*x+.07*z), p[2]+s[2]*round(z)*v);
}
export function sampleSurface(d,s) {
  const u=new T.Vector3(d.z,0,-d.x);
  if(u.lengthSq()<.00001)u.set(1,0,0);
  u.normalize();
  const v=new T.Vector3().crossVectors(d,u), p=surface(d,s);
  const a=surface(d.clone().addScaledVector(u,.004).normalize(),s).sub(p);
  const b=surface(d.clone().addScaledVector(v,.004).normalize(),s).sub(p);
  return {p,n:a.cross(b).normalize()};
}
export function colony(p,k) {
  return .46 + .29*wave(p.x*1.02+k,p.y*.77,p.z*1.2)
    + .22*Math.sin(p.x*5.7+p.z*4.8+k)*Math.cos(p.z*3.8-p.x*1.7)
    + .1*Math.sin(p.x*12+p.z*15) + .06*Math.sin(p.x*28-p.y*12);
}
export const noises = `
float hash(vec3 p){
  p=fract(p*.3183099+vec3(.12,.31,.47));
  p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise3(vec3 p){
  vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+1.),f.x),f.y),f.z);}
float wetAt(vec3 p){return texture2D(uWetMap,p.xz/8.+.5).r;}
`;
export function stoneMaterial(uniforms) {
  return new T.ShaderMaterial({uniforms,vertexShader:`
    varying vec3 w; varying vec3 n;
    void main(){w=(modelMatrix*vec4(position,1.)).xyz;n=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}`,
    fragmentShader:`
    uniform sampler2D uWetMap; varying vec3 w; varying vec3 n;
    ${noises}
    void main(){
      float grain=noise3(w*145.), medium=noise3(w*19.), field=noise3(w*4.5)+.33*noise3(w*11.);
      float pore=pow(max(0.,1.-abs(noise3(w*46.)-.31)*4.7),4.);
      float vein=1.-smoothstep(.015,.065,abs(sin(w.x*8.+w.z*4.0+field*3.4+w.y*11.)));
      float crust=smoothstep(.72,.96,field+.22*medium)*smoothstep(.35,.75,grain+.12*field);
      float ht=.014*medium+.007*grain-.010*pore-.005*vein;
      vec3 nx=normalize(n);vec3 dx=dFdx(w),dy=dFdy(w);
      vec3 rx=cross(dy,nx),ry=cross(nx,dx);float det=dot(dx,rx);
      nx=normalize(abs(det)*nx-sign(det)*(dFdx(ht)*rx+dFdy(ht)*ry));
      vec3 l=normalize(vec3(-.73,1.,-.26)),v=normalize(cameraPosition-w);
      float light=max(0.,dot(nx,l)), wet=wetAt(w);
      vec3 c=mix(vec3(.20,.197,.171),vec3(.48,.46,.37),clamp(field*.65+.25*medium,0.,1.));
      c=mix(c,vec3(.59,.62,.45),crust*.6);
      c*=.79+.27*grain-.27*pore-.32*vein;
      c*=.56+.53*light+.08*nx.y; c*=1.-.39*wet;
      c+=vec3(1.,.93,.74)*pow(max(0.,dot(nx,normalize(l+v))),28.)*(.06+.25*wet);
      gl_FragColor=vec4(c,1.);
    }`});
}
export function addStone(scene,s,mat) {
  const g=new T.SphereGeometry(1,96,56),pos=g.attributes.position, v=new T.Vector3();
  for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).normalize();v.copy(surface(v,s));pos.setXYZ(i,v.x,v.y,v.z);}
  g.computeVertexNormals();
  const mesh=new T.Mesh(g,mat);scene.add(mesh);return mesh;
}

// A generated, out-of-focus canopy plate sits behind the actual 3D subject.
export function canopy() {
  const rng=generator(571),c=document.createElement('canvas');c.width=1000;c.height=560;
  const g=c.getContext('2d'),grad=g.createLinearGradient(0,0,740,560);
  grad.addColorStop(0,'#68725b');grad.addColorStop(.46,'#45523a');grad.addColorStop(1,'#172b28');
  g.fillStyle=grad;g.fillRect(0,0,1000,560);
  for(let i=0;i<110;i++){
    const x=rng()*1040-20,y=rng()*340-60,r=8+rng()**2*50;
    g.filter='blur('+Math.round(4+rng()*13)+'px)';
    g.fillStyle=rng()<.45?'rgba(202,207,151,.21)':'rgba(13,39,26,.38)';
    g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
  }
  g.filter='blur(9px)';
  for(let i=0;i<28;i++){
    const x=rng()*1100-50, width=rng()**2*29+3,tilt=rng()*110-55;
    g.strokeStyle='rgba(25,38,26,'+(.10+rng()*.29)+')';g.lineWidth=width;
    g.beginPath();g.moveTo(x,-20);g.bezierCurveTo(x+tilt,135,x+tilt-38,330,x+tilt,560);g.stroke();
  }
  g.filter='none';
  const low=g.createLinearGradient(0,190,0,560);low.addColorStop(0,'rgba(28,34,23,0)');low.addColorStop(1,'#23271e');g.fillStyle=low;g.fillRect(0,0,1000,560);
  return new T.CanvasTexture(c);
}
