/* forest.js: the redwood forest around the downhill machine's trail (an ES module, loaded by bike.js once the 3D bench is up).
   An illustrative scene inspired by the Redwoods, Whakarewarewa Forest, Rotorua: not a map of a real trail.
   - Coast redwoods: our own lofted trunks (flared, fluted bases; fibrous bark) carrying crowns of short drooping branches and
     flat needle sprays grown with ez-tree (vendor/ez-tree, MIT). A few variants, instanced in chunks along the trail.
   - Understorey: tree ferns (ponga and wheki, some with a skirt of dead fronds), crown ferns, small ground ferns, fallen logs.
   - Ground: the hill falls along the trail; across it the floor is nearly level (a shallow cut bank behind, a gentle fall in
     front). Deep needle litter, the trail as worn pumice-loam dirt with ragged edges, roots across the root garden, a timber
     lip and rollers.
   - Light (trail zone only): a low warm sun through a canopy (a hidden dappling screen that only casts shadows), soft
     forest-tinted ambient light, depth haze, and faint shafts of light between the trunks.
   All textures are drawn from code (tex/texgen.js; open tex/texgen.html to regenerate them); no photographs. */
import {disposeBikeRoots} from "../bike-asset.js";
import * as THREE from "three";
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";
import {Tree} from "./vendor/ez-tree/tree.js";
import TreeOptions from "./vendor/ez-tree/options.js";

const TAU=Math.PI*2;
const rng=seed=>{let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
// smooth 2D value noise for the hillside
function noise2(seed){const h=(i,j)=>{let n=Math.imul(i,374761393)+Math.imul(j,668265263)+Math.imul(seed,1442695041);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296};
  const f=t=>t*t*(3-2*t);return (x,y)=>{const i=Math.floor(x),j=Math.floor(y),u=f(x-i),v=f(y-j);const a=h(i,j),b=h(i+1,j),c=h(i,j+1),d=h(i+1,j+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}}

export async function buildForest(S,P){const t0=performance.now();let tLoaded=0;const marks=[];const mark=k=>marks.push(k+":"+Math.round(performance.now()-t0));const breathe=()=>new Promise(res=>setTimeout(res,0));
  const HQ=!!S.HQ,R=S.renderer,scene=S.scene,sun=S.sun;
  const {trackY,SEG,LIP,GAP_END,SLIP,TRAIL_END,SBERM,SROLL}=P;
  const LAND=SEG.find(q=>Math.abs(q.x0-GAP_END)<1e-6)||SEG[SEG.indexOf(SLIP)+2];
  // ------------------------------------------------------------------------------------------------ textures
  const loader=new THREE.TextureLoader(),sfx=HQ?"":"_lq",aniso=Math.min(HQ?8:4,R.capabilities.getMaxAnisotropy());
  const tex=(n,srgb,wrap=true)=>loader.loadAsync(new URL(`tex/${n}${sfx}.webp`,import.meta.url).href).then(t=>{t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
    if(wrap)t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=aniso;return t});
  const [barkC,barkN,litC,litN,dirtC,dirtN,atlas]=await Promise.all([tex("bark_color",1),tex("bark_normal",0),tex("litter_color",1),tex("litter_normal",0),tex("dirt_color",1),tex("dirt_normal",0),tex("atlas_color",1,false)]);
  dirtC.wrapT=dirtN.wrapT=THREE.ClampToEdgeWrapping;tLoaded=performance.now();
  const group=new THREE.Group();group.name="redwood-forest";group.visible=false;
  const N=new THREE.Vector3(),Q=new THREE.Quaternion(),M4=new THREE.Matrix4(),E=new THREE.Euler(),V=new THREE.Vector3(),SC=new THREE.Vector3(),C=new THREE.Color();

  // ------------------------------------------------------------------------------------------------ the ground
  const X0=-46,X1=TRAIL_END+64,TB=1.95;
  const tx=x=>trackY(clamp(x,0,TRAIL_END+80));
  // the trail profile with the gap filled in (the hillside doesn't have a hole in it), then smoothed
  const fillY=x=>(x>LIP&&x<GAP_END)?SLIP.y1+(LAND.y0-SLIP.y1)*(x-LIP)/(GAP_END-LIP):tx(x);
  const ysm=x=>{let s=0;for(let k=-6;k<=6;k++)s+=fillY(x+k*.65);return s/13};
  const nz=noise2(7),nz2=noise2(19);
  const bump=(x,z)=>(nz(x*.11,z*.13)-.5)*1.6+(nz2(x*.33,z*.37)-.5)*.5;
  const groundY=(x,z)=>{const tr=tx(x);if(z>=-TB&&z<=TB)return tr-.035;const s=ysm(x);
    if(z<-TB){const d=-TB-z,hi=Math.max(tr,s),base=d<1.3?tr+(hi-tr)*smooth(0,1.3,d):hi;return base+.32*smooth(0,1.6,d)+.07*Math.max(0,d-1.6)+bump(x,z)*clamp(d/5,0,1)*(.5+.02*d)}
    const d=z-TB,lo=Math.min(tr,s),base=d<.8?tr+(lo-tr)*smooth(0,.8,d):lo;return base-(.3*Math.min(d,1.3)+.16*Math.max(0,d-1.3))+bump(x,z)*clamp(d/3,0,1)*.35};
  // columns: regular, plus every joint of the trail (both sides of a step)
  const cols=[];{const step=HQ?1:1.6;for(let x=X0;x<=X1;x+=step)cols.push(x);
    SEG.forEach((q,i)=>{const prev=SEG[i-1];if(prev&&Math.abs(prev.y1-q.y0)>1e-3){cols.push(q.x0-.01,q.x0+.01)}else cols.push(q.x0)});cols.push(TRAIL_END);
    cols.sort((a,b)=>a-b);for(let i=cols.length-1;i>0;i--)if(cols[i]-cols[i-1]<.005)cols.splice(i,1)}
  const rowsBack=HQ?[-2.35,-2.8,-3.4,-4.1,-5,-6.2,-7.6,-9.4,-11.6,-14.2,-17.4,-21.2,-25.6,-30.6,-36.6,-43.6,-51.6,-60.6,-70.6,-82]:[-2.4,-3.1,-4.1,-5.6,-7.6,-10.4,-14.2,-19.2,-25.6,-33.6,-43.6,-56,-70,-84];
  const rowsFront=HQ?[2.35,2.9,3.6,4.5,5.6,7,8.8,11,14]:[2.4,3.3,4.6,6.4,9,14];
  const rows=[...rowsBack.slice().reverse(),-TB,-1.2,-.4,.4,1.2,TB,...rowsFront];
  // where the trees are (filled in below) darkens the litter around their feet
  const trees=[];
  function buildGround(){const nc=cols.length,nr=rows.length,pos=new Float32Array(nc*nr*3),uv=new Float32Array(nc*nr*2),col=new Float32Array(nc*nr*3);
    const tone=noise2(31),moss=noise2(43);
    for(let j=0;j<nr;j++)for(let i=0;i<nc;i++){const x=cols[i],z=rows[j],y=groundY(x,z),k=j*nc+i;pos[k*3]=x;pos[k*3+1]=y;pos[k*3+2]=z;uv[k*2]=x/2.6;uv[k*2+1]=-z/2.6;
      let c=.9+(tone(x*.07,z*.07)-.5)*.45;const mo=smooth(.62,.8,moss(x*.05,z*.06))*.35;
      // darker litter around the feet of the trees
      for(const t of trees){const dx=x-t.x,dz=z-t.z;if(Math.abs(dx)>6||Math.abs(dz)>6)continue;const d=Math.hypot(dx,dz)-t.r;c*=1-.3*Math.exp(-Math.max(0,d)/1.6)}
      const g=1+mo*.25;col[k*3]=c*(1-mo*.3);col[k*3+1]=c*g;col[k*3+2]=c*(1-mo*.2)}
    const idx=[];for(let j=0;j<nr-1;j++)for(let i=0;i<nc-1;i++){const a=j*nc+i,b=a+1,c2=a+nc,d=c2+1;idx.push(a,c2,b,b,c2,d)}
    const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(pos,3));g.setAttribute("uv",new THREE.BufferAttribute(uv,2));g.setAttribute("color",new THREE.BufferAttribute(col,3));
    g.setIndex(idx);g.computeVertexNormals();
    const m=new THREE.MeshStandardMaterial({map:litC,normalMap:litN,normalScale:new THREE.Vector2(1.1,1.1),roughness:.96,metalness:0,vertexColors:true,color:new THREE.Color(1.3,1.18,1.1)});
    const mesh=new THREE.Mesh(g,m);mesh.receiveShadow=true;mesh.name="forest-floor";group.add(mesh)}
  // the trail: worn dirt laid over the floor in runs between the steps (so the gap's walls stay crisp); ragged edges are alpha
  const dirtM=new THREE.MeshStandardMaterial({map:dirtC,normalMap:dirtN,normalScale:new THREE.Vector2(.9,.9),roughness:.93,metalness:0,alphaTest:.5,side:THREE.DoubleSide});
  function buildTrail(){const runs=[];let cur=[];const W=TB;
    for(let i=0;i<cols.length;i++){const x=cols[i];if(x<-4||x>TRAIL_END+30)continue;cur.push(x);const nx=cols[i+1];
      if(nx!==undefined&&nx-x<.03&&Math.abs(trackY(Math.max(0,nx))-trackY(Math.max(0,x)))>.5){runs.push(cur);cur=[]}}
    if(cur.length)runs.push(cur);
    const geos=runs.filter(r=>r.length>1).map(r=>{const vs=[-W,-W*.5,0,W*.5,W],pos=[],uv=[],idx=[];
      r.forEach((x,i)=>{const y=tx(x)+.004;vs.forEach((z,j)=>{pos.push(x,y,z);uv.push(x/5.6,(z+W)/(2*W));if(i&&j){const a=(i-1)*5+j-1,b=a+1,c=a+5,d=c+1;idx.push(a,b,c,b,d,c)}})});
      const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g});
    const m=new THREE.Mesh(mergeGeometries(geos),dirtM);m.receiveShadow=true;m.name="trail-dirt";group.add(m);
    // packed dirt on the landing's knuckle (the lip's face is timber, below)
    const g=new THREE.PlaneGeometry(2*W,1.4+.054),mm=new THREE.Mesh(g,dirtM);mm.position.set(LAND.x0-.035,LAND.y0-.7-.023,0);mm.rotation.y=Math.PI/2;mm.receiveShadow=true;group.add(mm)}
  // ------------------------------------------------------------------------------------------------ redwoods
  const barkM=new THREE.MeshStandardMaterial({map:barkC,normalMap:barkN,normalScale:new THREE.Vector2(1.5,1.5),roughness:.95,metalness:0,vertexColors:true});
  const leafM=new THREE.MeshStandardMaterial({map:atlas,alphaTest:.45,side:THREE.DoubleSide,roughness:.88,metalness:0,color:new THREE.Color("#C9D6B8")});
  const fernM=new THREE.MeshStandardMaterial({map:atlas,alphaTest:.5,side:THREE.DoubleSide,roughness:.8,metalness:0});
  // a redwood trunk: dense rings near the ground for the flare; buttress lobes and shallow flutes; moss on one side of the foot
  function trunkGeo(o){const r=rng(o.seed),lobes=[],nl=4+Math.floor(r()*3);for(let i=0;i<nl;i++)lobes.push({a:(i+r()*.6)/nl*TAU,s:.55+r()*.6,w:3+r()*3});
    const ph=[r()*TAU,r()*TAU,r()*TAU],mossA=r()*TAU,lean=(r()-.5)*.012,leanA=r()*TAU;
    const ys=[];for(let k=0;k<=o.rings;k++){const t=k/o.rings;ys.push(-1+(o.H+1)*Math.pow(t,2.1))}
    const seg=o.seg,urep=7,pos=[],uv=[],col=[],idx=[];
    const ad=(a,b)=>{let d=((a-b)%TAU+TAU)%TAU;return d>Math.PI?TAU-d:d};
    ys.forEach((y,k)=>{const yy=Math.max(0,y),taper=Math.pow(Math.max(.015,1-yy/o.H),.82),flare=1+.95*Math.exp(-yy/1.25)+.25*Math.exp(-yy/6);
      const lx=Math.cos(leanA)*lean*yy*yy/o.H*3,lz=Math.sin(leanA)*lean*yy*yy/o.H*3;
      for(let j=0;j<=seg;j++){const a=j/seg*TAU;let lobe=0;for(const L of lobes){const d=ad(a,L.a);lobe+=L.s*Math.exp(-d*d*L.w*L.w)}
        const fl=1+.04*Math.sin(9*a+ph[0]+yy*.03)+.022*Math.sin(17*a+ph[1])+.012*Math.sin(29*a+ph[2]);
        const rr=o.R*taper*(flare+lobe*.42*Math.exp(-yy/1.9))*fl;pos.push(lx+Math.cos(a)*rr,y,lz+Math.sin(a)*rr);
        uv.push(j/seg*urep,y/3.1);const m=clamp(1-yy/2.2,0,1)*Math.max(0,Math.cos(a-mossA))*.75;col.push(1-m*.45,1-m*.18,1-m*.5)}
      if(k){const n=seg+1;for(let j=0;j<seg;j++){const a=(k-1)*n+j,b=a+1,c=a+n,d=c+1;idx.push(a,c,b,b,c,d)}}});
    const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));g.setAttribute("color",new THREE.Float32BufferAttribute(col,3));
    g.setIndex(idx);g.computeVertexNormals();
    // weld the seam's normals
    const nm=g.attributes.normal;for(let k=0;k<ys.length;k++){const a=k*(seg+1),b=a+seg;N.set(nm.getX(a)+nm.getX(b),nm.getY(a)+nm.getY(b),nm.getZ(a)+nm.getZ(b)).normalize();nm.setXYZ(a,N.x,N.y,N.z);nm.setXYZ(b,N.x,N.y,N.z)}
    return g}
  // the crown from ez-tree: short drooping branches high up and flat sprays of needles. Its own trunk is dropped (ours replaces it).
  // tier 2: near trees in high quality; 1: near trees on phones; 0: far trees
  function crown(seed,tier){const o=new TreeOptions();o.seed=seed;o.type="evergreen";o.bark.textured=false;
    const b=o.branch;b.levels=1;b.length[0]=60;b.radius[0]=1;b.sections[0]=10;b.segments[0]=4;b.children[0]=[22,34,54][tier];b.start[1]=.5;b.angle[1]=106;b.length[1]=11;b.radius[1]=.16;
    b.sections[1]=tier>1?4:3;b.segments[1]=tier>1?4:3;b.gnarliness[0]=0;b.gnarliness[1]=.14;b.force.direction={x:0,y:1,z:0};b.force.strength=.002;
    const L=o.leaves;L.count=[4,5,7][tier];L.start=.18;L.size=[3.5,3,2.6][tier];L.sizeVariance=.3;L.angle=48;L.billboard=tier>1?"double":"single";L.alphaTest=.45;
    const t=new Tree(o);t.generate();
    const bg=t.branchesMesh.geometry,lg=t.leavesMesh.geometry;t.branchesMesh.material.dispose();t.leavesMesh.material.dispose();
    // drop the generated trunk: its indices come first
    const trunkIdx=b.sections[0]*b.segments[0]*6,ia=bg.index.array,bi=[];for(let i=trunkIdx;i<ia.length;i++)bi.push(ia[i]);
    const br=new THREE.BufferGeometry();br.setAttribute("position",bg.attributes.position);br.setAttribute("normal",bg.attributes.normal);br.setAttribute("uv",bg.attributes.uv);
    br.setAttribute("color",new THREE.Float32BufferAttribute(new Float32Array(bg.attributes.position.count*3).fill(.85),3));br.setIndex(bi);
    // leaves: point their uv at the needle-spray cell of the atlas; soften the normals outwards from the trunk
    const lu=lg.attributes.uv,lp=lg.attributes.position,ln=new Float32Array(lp.count*3);for(let i=0;i<lu.count;i++)lu.setXY(i,.5+lu.getX(i)*.5,.5+lu.getY(i)*.5);
    for(let i=0;i<lp.count;i++){N.set(lp.getX(i),.6+Math.max(0,lp.getY(i)-40)*.02,lp.getZ(i)).normalize();ln[i*3]=N.x;ln[i*3+1]=N.y;ln[i*3+2]=N.z}
    const lv=new THREE.BufferGeometry();lv.setAttribute("position",lp);lv.setAttribute("normal",new THREE.BufferAttribute(ln,3));lv.setAttribute("uv",lu);lv.setIndex(lg.index);
    return {br,lv}}
  // trunks cast shadows; the crown's branches and needles (30 m up) don't need to
  const variant=(seed,tier)=>{const tr=trunkGeo({seed,H:60,R:1,seg:[10,16,26][tier],rings:[9,14,22][tier]}),cr=crown(seed,tier);return {trunk:tr,branches:cr.br,leaves:cr.lv,tier}};
  const VAR=HQ?[variant(1201,2),variant(4407,2),variant(733,0)]:[variant(1201,1),variant(733,0)];mark("trees");await breathe();
  // ------------------------------------------------------------------------------------------------ ferns
  // a frond card bent along an arc (base at the origin, growing along +x), folded into a shallow V across its width
  function frondGeo(o){const pos=[],uv=[],idx=[],n=o.segs;let px=0,py=0;const W=o.L*o.aspect;
    for(let i=0;i<=n;i++){const t=i/n;if(i){const a=o.rise-o.droop*Math.pow((i-.5)/n,1.25);px+=Math.cos(a)*o.L/n;py+=Math.sin(a)*o.L/n}
      [-1,0,1].forEach((s,j)=>{pos.push(px,py-Math.abs(s)*W*.5*o.fold,s*W*.5);uv.push(o.uv[0]+(o.uv[1]-o.uv[0])*(s+1)/2,o.uv[2]+(o.uv[3]-o.uv[2])*t);
        if(i&&j){const a=(i-1)*3+j-1,b=a+1,c=a+3,d=c+1;idx.push(a,c,b,b,c,d)}})}
    const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    // light the fronds from above (both faces are drawn)
    const nm=g.attributes.normal;for(let i=0;i<nm.count;i++){N.set(nm.getX(i)*.4,Math.abs(nm.getY(i))+.6,nm.getZ(i)*.4).normalize();nm.setXYZ(i,N.x,N.y,N.z)}
    return g}
  const G={
    ponga:frondGeo({L:1,aspect:.38,rise:.85,droop:2.0,segs:HQ?10:6,fold:.34,uv:[0,.25,0,1]}),
    crownF:frondGeo({L:1,aspect:.28,rise:1.1,droop:1.4,segs:4,fold:.22,uv:[.25,.5,0,1]}),
    dead:frondGeo({L:1,aspect:.5,rise:-1.15,droop:.25,segs:3,fold:.15,uv:[.5,.75,0,.5]}),
    pTrunk:(()=>{const g=new THREE.CylinderGeometry(.1,.15,1,HQ?10:7,3,true);g.translate(0,.5,0);const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);p.setX(i,p.getX(i)*(1+.35*smooth(.85,1,y)));p.setZ(i,p.getZ(i)*(1+.35*smooth(.85,1,y)))}g.computeVertexNormals();
      const u=g.attributes.uv;for(let i=0;i<u.count;i++)u.setXY(i,u.getX(i)*.6,u.getY(i)*1.6);return g})(),
    groundF:(()=>{const a=new THREE.PlaneGeometry(1,1);a.translate(0,.5,0);const b=a.clone().rotateY(Math.PI/2);const g=mergeGeometries([a,b]);const u=g.attributes.uv;for(let i=0;i<u.count;i++)u.setXY(i,.75+u.getX(i)*.25,u.getY(i)*.5);
      const nm=g.attributes.normal;for(let i=0;i<nm.count;i++)nm.setXYZ(i,0,1,0);return g})(),
    log:(()=>{const g=new THREE.CylinderGeometry(1,1,1,HQ?14:8,1,false);g.rotateZ(Math.PI/2);const u=g.attributes.uv;for(let i=0;i<u.count;i++)u.setXY(i,u.getX(i)*3,u.getY(i)*2.5);return g})(),
  };
  const pTrunkM=new THREE.MeshStandardMaterial({map:barkC,normalMap:barkN,roughness:1,color:new THREE.Color("#5E4A3E")});
  const logM=new THREE.MeshStandardMaterial({map:barkC,normalMap:barkN,roughness:.97,color:new THREE.Color("#8C6A5A")});

  // ------------------------------------------------------------------------------------------------ placing it all, in chunks along the trail
  const CH=HQ?56:70,chunkOf=x=>Math.floor((x-X0)/CH),buckets=new Map();
  const put=(kind,x,m,c)=>{const k=kind+"|"+chunkOf(x);if(!buckets.has(k))buckets.set(k,{kind,m:[],c:[]});const b=buckets.get(k);b.m.push(m.clone());b.c.push(c?c.clone():null)};
  const r=rng(2024);
  const nearTrail=(x,z,pad)=>z>-TB-pad&&z<TB+pad;
  const inBerm=(x,z)=>x>SBERM.x0-3&&x<SBERM.x1+3&&z>-4.2;
  // redwoods: a row of big ones right behind the trail, then a jittered grid back into the haze
  {let x=X0+3;while(x<X1-3){const sR=1.0+r()*.55,rf=sR*1.95,pz=-TB-.7-rf*.85-r()*2.2;if(!inBerm(x,pz)){const y=groundY(x,pz)-.25,sH=.9+r()*.22;trees.push({x,z:pz,r:rf*.8,y});
      Q.setFromAxisAngle(V.set(0,1,0),r()*TAU);M4.compose(SC.set(x,y,pz),Q,N.set(sR,sH,sR));C.setHSL(.03+r()*.025,.2+r()*.2,.66+r()*.22);put("rwN"+Math.floor(r()*(VAR.length-1)),x,M4,C)}
    x+=(HQ?8:10)+r()*(HQ?9:11)}}
  {const cx=HQ?7.2:8.6,cz=HQ?7:8.4;for(let x=X0+2;x<X1-2;x+=cx)for(let z=-3.2;z>-80;z-=cz*(z>-24?1:HQ?1.15:1.45)){
      if(r()<(HQ?.16:.24))continue;const px=x+(r()-.5)*cx*.85,pz=z-r()*cz*.8,sR=.72+r()*.62*(pz>-12?1.15:1),rf=sR*1.95;
      if(pz>-TB-.6-rf||inBerm(px,pz))continue;if(trees.some(t=>Math.hypot(t.x-px,t.z-pz)<(t.r+rf)*.8))continue;
      const y=groundY(px,pz)-.25,sH=.86+r()*.26,near=pz>-24;trees.push({x:px,z:pz,r:rf*.8,y});
      const v=near?VAR[Math.floor(r()*(VAR.length-1))]:VAR[VAR.length-1];Q.setFromAxisAngle(V.set(0,1,0),r()*TAU);M4.compose(SC.set(px,y,pz),Q,N.set(sR,sH,sR));
      C.setHSL(.03+r()*.025,.18+r()*.2,.62+r()*.25);put(near?"rwN"+VAR.indexOf(v):"rwF",px,M4,C)}}
  // tree ferns: thickest near the trail and under gaps, thinning into the distance; wheki keep a skirt of dead fronds
  const ponga=[];{const n=HQ?620:300;for(let i=0;i<n;i++){const x=X0+4+r()*(X1-X0-8);const zz=Math.pow(r(),2);let z=-3.1-zz*(HQ?46:36);const h0=(.35+Math.pow(r(),1.6)*3.8)*(r()<.15?1.5:1);
    // fronds stop short of the trail's edge, where the energy columns and the graph screen stand
    const Lc=1.9+h0*.15+1.2;if(z>-2.7-Lc*.72)z=-2.7-Lc*.72-r()*.8;
    if(inBerm(x,z))continue;if(trees.some(t=>Math.hypot(t.x-x,t.z-z)<t.r+.6))continue;if(ponga.some(p=>Math.hypot(p.x-x,p.z-z)<2.6))continue;
    const h=Math.min(h0,z>-9?1.2+(-z-3)*.3:9),y=groundY(x,z)-.1,wheki=r()<.55,lean=(r()-.5)*.25;ponga.push({x,z});
    E.set(lean,r()*TAU,(r()-.5)*.2);Q.setFromEuler(E);const tk=1.15+r()*.5;M4.compose(SC.set(x,y,z),Q,N.set(tk,h,tk));put("pT",x,M4,null);
    const top=V.set(0,h,0).applyQuaternion(Q).add(SC.set(x,y,z)).clone();const nf=HQ?(wheki?14:17)+Math.floor(r()*6):10+Math.floor(r()*4),L=1.9+r()*1.2+h*.15;
    for(let k=0;k<nf;k++){const az=k/nf*TAU+r()*.4,young=k%5===0;E.set((r()-.5)*.5,az,(r()-.5)*.35+(young?.45:0),"YXZ");Q.setFromEuler(E);M4.compose(top,Q,N.set(L*(.75+r()*.35),L*(.75+r()*.35),L*(.8+r()*.3)));
      C.setHSL(.24+r()*.05,.35+r()*.2,.48+r()*.2);put("pF",x,M4,C)}
    if(wheki&&h>1.1){const nd=HQ?7+Math.floor(r()*4):4;for(let k=0;k<nd;k++){const az=k/nd*TAU+r()*.5;E.set(0,az,(r()-.5)*.3,"YXZ");Q.setFromEuler(E);const l=Math.min(h*.8,1.1+r()*.6);
      M4.compose(V.copy(top).add(SC.set(0,-.15,0)),Q,N.set(l,l,l*.8));C.setHSL(.07,.35,.38+r()*.15);put("pD",x,M4,C)}}}}
  // crown ferns: rosettes all over the floor, a line of them along both edges of the trail
  {const n=HQ?3000:1500;for(let i=0;i<n;i++){const x=X0+2+r()*(X1-X0-4);let z;const u=r();
    if(u<.22)z=-TB-.2-r()*1.6;else if(u<.38)z=TB+.35+r()*1.4;else if(u<.64)z=TB+1.6+r()*8;else z=-3.6-Math.pow(r(),1.6)*(HQ?40:30);
    if(trees.some(t=>Math.abs(t.x-x)<4&&Math.hypot(t.x-x,t.z-z)<t.r*.9))continue;const y=groundY(x,z)-.03,edge=Math.abs(z)<4,nf=HQ?8+Math.floor(r()*5):7,L=edge?.55+r()*.4:.75+r()*.7;
    for(let k=0;k<nf;k++){const az=k/nf*TAU+r()*.5;
      // fronds on the trail side of an edge rosette stay short so they never cover the dirt
      const toward=-Math.sin(az)*(z<0?1:-1);const l=L*(.75+r()*.4)*(edge&&toward>.3?.5:1);
      E.set(0,az,(r()-.5)*.3,"YXZ");Q.setFromEuler(E);M4.compose(SC.set(x,y,z),Q,N.set(l,l,l));C.setHSL(.2+r()*.07,.4+r()*.2,.5+r()*.22);put("cF",x,M4,C)}}}
  // small ground ferns and fallen logs
  {const n=HQ?900:350;for(let i=0;i<n;i++){const x=X0+2+r()*(X1-X0-4),z=r()<.25?TB+.3+r()*7:-2.3-Math.pow(r(),1.3)*34;if(nearTrail(x,z,.25))continue;const h=.35+r()*.45;
    Q.setFromAxisAngle(V.set(0,1,0),r()*TAU);M4.compose(SC.set(x,groundY(x,z)-.04,z),Q,N.set(h*.5,h,h*.5));C.setHSL(.2+r()*.06,.32,.4+r()*.14);put("gF",x,M4,C)}
   const nl=HQ?46:24;for(let i=0;i<nl;i++){const x=X0+6+r()*(X1-X0-12),z=-6-r()*38;if(trees.some(t=>Math.hypot(t.x-x,t.z-z)<t.r+1.5))continue;const L=5+r()*10,rad=.18+r()*.38,yaw=(r()-.5)*1.2;
    const y=(groundY(x-Math.cos(yaw)*L/2,z+Math.sin(yaw)*L/2)+groundY(x+Math.cos(yaw)*L/2,z-Math.sin(yaw)*L/2))/2;E.set(0,yaw,Math.atan2(groundY(x+L/2,z)-groundY(x-L/2,z),L)*.8);Q.setFromEuler(E);
    M4.compose(SC.set(x,y+rad*.45,z),Q,N.set(L,rad,rad));put("log",x,M4,null)}}
  // ------------------------------------------------------------------------------------------------ meshes from the buckets
  mark("placed");await breathe();const meshes=[];
  const KIND={rwN0:[()=>VAR[0].trunk,barkM,1,1],rwN1:[()=>VAR[1].trunk,barkM,1,1],rwF:[()=>VAR[VAR.length-1].trunk,barkM,0,1],
    pT:[()=>G.pTrunk,pTrunkM,1,1],pF:[()=>G.ponga,fernM,HQ,1],pD:[()=>G.dead,fernM,HQ,1],cF:[()=>G.crownF,fernM,0,1],gF:[()=>G.groundF,fernM,0,1],log:[()=>G.log,logM,1,1]};
  const crownOf={rwN0:VAR[0],rwN1:VAR[1],rwF:VAR[VAR.length-1]};
  for(const [k,b] of buckets){const spec=KIND[b.kind];if(!spec)continue;const mk=(geo,mat,cast,rec)=>{const im=new THREE.InstancedMesh(geo,mat,b.m.length);
      b.m.forEach((m,i)=>{im.setMatrixAt(i,m);if(b.c[i])im.setColorAt(i,b.c[i])});im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;
      im.castShadow=!!cast;im.receiveShadow=!!rec;im.computeBoundingSphere();im.name=b.kind+"@"+k.split("|")[1];group.add(im);meshes.push(im);return im};
    mk(spec[0](),spec[1],spec[2],spec[3]);const cv=crownOf[b.kind];if(cv){const bm=mk(cv.branches,barkM,0,0),lm=mk(cv.leaves,leafM,0,0);bm.name+="-br";lm.name+="-lv"}}
  mark("meshes");await breathe();buildGround();buildTrail();mark("ground");await breathe();

  // ------------------------------------------------------------------------------------------------ the root garden, the timber lip and the berm
  {const SR=P.rootSeg;if(SR){const rootG=(()=>{const pts=[];for(let i=0;i<=10;i++){const t=i/10;pts.push(new THREE.Vector3(Math.sin(t*5.2)*.22+t*.3,Math.sin(t*Math.PI)*.05,(t-.5)*3.4))}
      const curve=new THREE.CatmullRomCurve3(pts),g=new THREE.TubeGeometry(curve,HQ?16:8,1,HQ?8:6,false),p=g.attributes.position;
      // taper: thick at one end (towards the tree uphill), thin at the other
      for(let i=0;i<p.count;i++){const z=p.getZ(i),t=clamp((z+1.7)/3.4,0,1),c=curve.getPointAt(t),k=.12-.08*t;p.setXYZ(i,c.x+(p.getX(i)-c.x)*k,c.y+(p.getY(i)-c.y)*k*.6,c.z+(p.getZ(i)-c.z)*k)}g.computeVertexNormals();return g})();
    const rr=rng(77),n=HQ?22:14,im=new THREE.InstancedMesh(rootG,new THREE.MeshStandardMaterial({map:barkC,normalMap:barkN,roughness:.75,color:new THREE.Color("#B08A74")}),n);
    for(let k=0;k<n;k++){const x=SR.x0+1+k*(SR.x1-SR.x0-2)/n+rr()*.6;E.set(0,(rr()<.5?-1:1)*(.35+rr()*.5),0);Q.setFromEuler(E);M4.compose(SC.set(x,tx(x)-.045,(rr()-.5)*.6),Q,N.set(1,.8,.8+rr()*.5));im.setMatrixAt(k,M4)}
    im.castShadow=true;im.receiveShadow=true;im.computeBoundingSphere();group.add(im)}}
  // timber: deck planks on the lip ramp, a board face under the lip, side boards along the lip and the rollers
  const woodM=new THREE.MeshStandardMaterial({color:new THREE.Color("#9C7A58"),roughness:.85,metalness:0});
  {const planks=[];const add=(x,y,z,sx,sy,sz,rz)=>{E.set(0,0,rz);Q.setFromEuler(E);planks.push(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),Q.clone(),new THREE.Vector3(sx,sy,sz)))};
    const th=Math.atan(SLIP.gr);for(let k=0;k<16;k++){const x=SLIP.x0+(k+.5)*(SLIP.x1-SLIP.x0)/16;add(x,tx(x)-.02,0,.23,.06,3.5,th)}
    for(let k=0;k<6;k++)add(LIP-.06,SLIP.y1-.14-k*.43,0,.08,.4,3.5,0);
    const side=(x0,x1,z)=>{for(let x=x0;x<x1;x+=.5){const y=tx(x+.25);add(x+.25,y-.3,z,.5,.6,.06,Math.atan((tx(x+.5)-tx(x))/.5))}};
    side(SLIP.x0,LIP,TB+.04);side(SLIP.x0,LIP,-TB-.04);SROLL.forEach(q=>{side(q.x0,q.x1,TB+.04);side(q.x0,q.x1,-TB-.04)});
    const g=new THREE.BoxGeometry(1,1,1),im=new THREE.InstancedMesh(g,woodM,planks.length);planks.forEach((m,i)=>im.setMatrixAt(i,m));im.castShadow=im.receiveShadow=true;im.computeBoundingSphere();group.add(im)}
  {const pos=[],uv=[],idx=[],n=24;for(let k=0;k<=n;k++){const x=SBERM.x0-2+k*(SBERM.x1-SBERM.x0+4)/n,h=Math.sin(k/n*Math.PI)*1.8,y=tx(x);pos.push(x,y+.004,-1.3,x,y+h,-2.6-h*.3);uv.push(x/5.6,.45,x/5.6,.86);
      if(k){const a=(k-1)*2;idx.push(a,a+2,a+1,a+1,a+2,a+3)}}
    const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    const bm=new THREE.Mesh(g,dirtM);bm.receiveShadow=true;bm.castShadow=true;group.add(bm)}

  // ------------------------------------------------------------------------------------------------ light
  const sunDir=new THREE.Vector3(.5,-.78,.38).normalize();  // the way the light travels: from behind the trees on the left, down towards the front right
  const HAZE=new THREE.Color("#AEB59E");
  // a forest-tinted environment for soft ambient light and reflections: bright canopy above, green haze around, brown floor below
  mark("timber");const envTex=(()=>{const sc=new THREE.Scene(),geo=new THREE.SphereGeometry(10,48,24),p=geo.attributes.position,col=[];
    const top=new THREE.Color("#E3EBD8"),hor=new THREE.Color("#93A37F"),bot=new THREE.Color("#3A2A1E"),c=new THREE.Color();
    for(let i=0;i<p.count;i++){const y=p.getY(i)/10;if(y>=0)c.copy(hor).lerp(top,Math.pow(y,.6));else c.copy(hor).lerp(bot,Math.pow(-y,.45));col.push(c.r,c.g,c.b)}
    geo.setAttribute("color",new THREE.Float32BufferAttribute(col,3));sc.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
    const glow=new THREE.Mesh(new THREE.SphereGeometry(1.4,16,8),new THREE.MeshBasicMaterial({color:new THREE.Color(5,4.2,3)}));glow.position.copy(sunDir).multiplyScalar(-8);sc.add(glow);
    const pm=new THREE.PMREMGenerator(R);const rt=pm.fromScene(sc,.03);pm.dispose();geo.dispose();return rt.texture})();
  // the canopy: a hidden screen with gaps that only casts shadows, so sunlight reaches the floor in flecks
  const gobo=(()=>{const c=document.createElement("canvas");c.width=c.height=256;const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,256,256);g.globalCompositeOperation="destination-out";
    const rr=rng(91);for(let i=0;i<150;i++){const x=rr()*256,y=rr()*256,s=2+Math.pow(rr(),2.6)*15;for(const ox of [-256,0,256])for(const oy of [-256,0,256]){const gr=g.createRadialGradient(x+ox,y+oy,0,x+ox,y+oy,s);
      gr.addColorStop(0,"rgba(0,0,0,1)");gr.addColorStop(.7,"rgba(0,0,0,.9)");gr.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=gr;g.beginPath();g.ellipse(x+ox,y+oy,s,s*(.6+rr()*.5),rr()*3,0,TAU);g.fill()}}
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;const SZ=150,TILE=34;t.repeat.set(SZ/TILE,SZ/TILE);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(SZ,SZ),new THREE.MeshBasicMaterial({map:t,alphaTest:.5,side:THREE.DoubleSide,colorWrite:false,depthWrite:false}));m.rotation.x=-Math.PI/2;m.castShadow=true;m.receiveShadow=false;
    // three.js tests shadow casters against the main camera's layers, so the screen stays on layer 0 but writes no colour or depth
    m.userData={t,SZ,TILE};m.name="canopy-dapple";return m})();
  mark("env");group.add(gobo);
  // shafts of light between the trunks: faint additive ribbons along the sun's direction
  const shafts=(()=>{const c=document.createElement("canvas");c.width=64;c.height=256;const g=c.getContext("2d"),im=g.createImageData(64,256);
    for(let y=0;y<256;y++)for(let x=0;x<64;x++){const u=(x+.5)/64-.5,v=y/255,a=Math.exp(-u*u/.03)*smooth(0,.3,v)*smooth(1,.62,v)*(.75+.25*Math.sin(v*9+u*3));const i=(y*64+x)*4;im.data[i]=im.data[i+1]=im.data[i+2]=255;im.data[i+3]=a*255}
    g.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);
    const n=HQ?70:30,geo=new THREE.PlaneGeometry(1,1),m=new THREE.MeshBasicMaterial({map:t,color:new THREE.Color("#FFE2B0"),transparent:true,opacity:HQ?.24:.2,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,side:THREE.DoubleSide});
    const ims=new THREE.InstancedMesh(geo,m,n);const rr=rng(57),up=sunDir.clone().negate(),view=new THREE.Vector3(0,-.3,-1).normalize();
    const xa=new THREE.Vector3().crossVectors(up,view).normalize(),za=new THREE.Vector3().crossVectors(xa,up).normalize();const basis=new THREE.Matrix4().makeBasis(xa,up,za);Q.setFromRotationMatrix(basis);
    for(let i=0;i<n;i++){const x=X0+10+rr()*(X1-X0-20),z=-7-Math.pow(rr(),.9)*38,y=groundY(x,z),L=24+rr()*20,w=.6+rr()*2;
      M4.compose(SC.set(x,y,z).addScaledVector(up,L*.5-.5),Q,N.set(w,L,1));ims.setMatrixAt(i,M4);C.setScalar(.45+rr()*.55);ims.setColorAt(i,C)}
    ims.instanceColor.needsUpdate=true;ims.computeBoundingSphere();ims.renderOrder=6;ims.name="light-shafts";return ims})();
  group.add(shafts);

  // ------------------------------------------------------------------------------------------------ the trail zone's own light (saved and restored on the way out)
  let saved=null,on=false;const hemi=scene.children.find(o=>o.isHemisphereLight),fill=scene.children.find(o=>o.isDirectionalLight&&o!==sun);
  const fog=new THREE.FogExp2(HAZE,HQ?.0165:.019);
  function enter(){if(on)return;on=true;group.visible=true;
    saved={bg:scene.background,fog:scene.fog,env:scene.environment,envI:scene.environmentIntensity,sc:sun.color.clone(),si:sun.intensity,far:sun.shadow.camera.far,
      hi:hemi&&hemi.intensity,hs:hemi&&hemi.color.clone(),hg:hemi&&hemi.groundColor.clone(),fi:fill&&fill.intensity};
    scene.background=HAZE;scene.fog=fog;scene.environment=envTex;scene.environmentIntensity=.9;sun.color.set("#FFDCA6");sun.intensity=4.6;
    if(hemi){hemi.intensity=.8;hemi.color.set("#D8E6CF");hemi.groundColor.set("#5A4434")}if(fill)fill.intensity=.12}
  function leave(){if(!on)return;on=false;group.visible=false;const s=saved;scene.background=s.bg;scene.fog=s.fog;scene.environment=s.env;scene.environmentIntensity=s.envI;sun.color.copy(s.sc);sun.intensity=s.si;
    sun.shadow.camera.near=1;sun.shadow.camera.far=s.far;sun.shadow.camera.updateProjectionMatrix();if(hemi){hemi.intensity=s.hi;hemi.color.copy(s.hs);hemi.groundColor.copy(s.hg)}if(fill)fill.intensity=s.fi}
  // every frame in the trail zone: the sun's shadow box follows the rider (a little uphill of them, where the camera looks)
  const half=HQ?26:21,ctr=new THREE.Vector3();
  function update(x,y,offset){if(!on)return;ctr.set(offset.x+x+3,offset.y+y,offset.z-9);S.setShadowBox(half,[ctr.x,ctr.y,ctr.z]);
    sun.position.copy(ctr).addScaledVector(sunDir,-80);sun.shadow.camera.near=20;sun.shadow.camera.far=150;sun.shadow.camera.updateProjectionMatrix();
    // the dapple screen hangs above the rider; its pattern stays fixed to the ground as it moves
    const {t,SZ,TILE}=gobo.userData;gobo.position.set(x+3,y+15,-9);t.offset.set((gobo.position.x-SZ/2)/TILE,(-gobo.position.z-SZ/2)/TILE)}
  const tBuilt=performance.now();
  return {group,enter,leave,update,meshes,dispose(){leave();envTex.dispose();disposeBikeRoots([group])},stats:()=>({trees:trees.length,ponga:ponga.length,meshes:meshes.length,loadMs:Math.round(tLoaded-t0),buildMs:Math.round(tBuilt-tLoaded),marks:marks.join(" ")})};
}
