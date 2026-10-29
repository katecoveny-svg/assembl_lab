/** CPU ribbon renderer for browsers without WebGL. Real projected geometry,
 * depth-sorted surfaces and procedural reflective materials; no baked artwork. */
const TAU=Math.PI*2;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const mul=(a,s)=>a.map(v=>v*s);
const norm=a=>mul(a,1/(Math.hypot(...a)||1));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const mix=(a,b,t)=>a.map((v,i)=>v*(1-t)+b[i]*t);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function rotate(v,x,y,z){let [a,b,c]=v;let q=b*Math.cos(x)-c*Math.sin(x);c=b*Math.sin(x)+c*Math.cos(x);b=q;q=a*Math.cos(y)+c*Math.sin(y);c=-a*Math.sin(y)+c*Math.cos(y);a=q;return[a*Math.cos(z)-b*Math.sin(z),a*Math.sin(z)+b*Math.cos(z),c];}
function curve(a,v,p){
  if(v===0)return[1.03*Math.sin(2*a+.05)+.19*Math.sin(3*a+p),1.64*Math.cos(a)+.12*Math.cos(3*a+p),.68*Math.sin(3*a+.35)+.16*Math.sin(a+p)];
  if(v===1)return[1.07*Math.sin(2*a+.91)+.12*Math.sin(4*a+p),1.58*Math.cos(a+.37)+.10*Math.sin(3*a+p),.62*Math.cos(3*a+.6)-.12*Math.cos(a+p)];
  return[.94*Math.cos(a)+.21*Math.sin(3*a+p),1.34*Math.sin(a)+.17*Math.sin(2*a+p),.66*Math.sin(2*a+.8)+.13*Math.cos(3*a)];
}
function geometry(seed,variant){
  const vertices=[],segments=180,sides=24,p=seed*.00071;
  for(let i=0;i<=segments;i++){
    const a=i/segments*TAU,c=curve(a,variant,p),next=curve(a+.001,variant,p),t=norm(next.map((v,k)=>v-c[k]));
    let n=norm([-t[1],t[0],0]),b=norm(cross(t,n));
    const twist=.62*Math.sin(a*2+variant*.9)+.28*Math.sin(a*3+seed*.001)+variant*.8;
    [n,b]=[add(mul(n,Math.cos(twist)),mul(b,Math.sin(twist))),add(mul(b,Math.cos(twist)),mul(n,-Math.sin(twist)))];
    const width=(variant===0?.47:variant===1?.35:.24)*(1+.24*Math.sin(a*2+.7+variant)),thick=variant===0?.135:variant===1?.1:.12;
    for(let j=0;j<=sides;j++){
      const theta=j/sides*TAU,point=add(c,add(mul(n,Math.cos(theta)*width),mul(b,Math.sin(theta)*thick)));
      const normal=norm(add(mul(n,Math.cos(theta)/width),mul(b,Math.sin(theta)/thick)));
      vertices.push({p:point,n:normal});
    }
  }
  const faces=[];
  for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const k=i*(sides+1)+j,l=k+sides+1;faces.push([k,k+1,l+1,l]);}
  return{vertices,faces};
}
function surface(normal,material,depth){
  const n=norm(normal),facing=Math.abs(n[2]),r=[2*n[0]*n[2],2*n[1]*n[2],2*n[2]*n[2]-1];
  // Procedural studio reflection: black photographic flags, soft-box strips,
  // neutral room and lilac / peach bounce cards. Reflections move with normals.
  const longitude=Math.atan2(r[0],r[2]);
  const flag=Math.pow(.5+.5*Math.sin(longitude*3.2+r[1]*2.1),6);
  let shade=.74-.65*flag;
  const stripe=Math.pow(Math.max(0,Math.cos(longitude*2.1-r[1]*1.7)),36);
  shade+=stripe*.72;
  const overhead=Math.pow(Math.max(0,dot(r,norm([-.4,.7,.9]))),16);
  const rim=Math.pow(1-facing,5);
  shade=clamp(shade+overhead*.85+rim*.3,.025,1.25);
  let col=[shade*244,shade*242,shade*235];
  const peach=(.5+.5*Math.sin(longitude*1.5+r[1]*3.6))*Math.pow(1-facing,1.5)*.44;
  col=mix(col,[255,170,145],peach);
  if(material==='glass'){
    const base=[171,148,216],trans=.20+.32*facing;
    col=mix(col,base,trans);
    const mint=.21*Math.pow(Math.max(0,Math.sin(longitude*2.3+r[1]*4.1)),6);
    col=mix(col,[174,227,208],mint);
    col=col.map((v,i)=>v+overhead*56+stripe*35+rim*20);
  }else if(material==='coral'){
    col=mix(col,[251,159,144],.48);
    col=col.map(v=>v+overhead*60+stripe*50);
  }
  const ao=clamp(.96+depth*.022,.87,1);
  return col.map(v=>Math.round(clamp(v*ao,0,255)));
}
// Precompute a continuous reflective hemisphere. Rasterisation interpolates
// normals per pixel, not colours per polygon: highlights remain smooth.
const MAT_SIZE=384;
function materialMap(material){
  const data=new Uint8ClampedArray(MAT_SIZE*MAT_SIZE*4);
  for(let y=0;y<MAT_SIZE;y++)for(let x=0;x<MAT_SIZE;x++){
    let nx=x/(MAT_SIZE-1)*2-1,ny=y/(MAT_SIZE-1)*2-1;
    const length=nx*nx+ny*ny;
    if(length>1){const k=1/Math.sqrt(length);nx*=k;ny*=k;}
    const rgb=surface([nx,ny,Math.sqrt(Math.max(0,1-nx*nx-ny*ny))],material,0),i=(y*MAT_SIZE+x)*4;
    data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];data[i+3]=255;
  }
  return data;
}
export function createCanvasSculpture(canvas){
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('This browser cannot create a drawing canvas.');
  let width=400,height=650,dpr=1,seed=42,meshes=[],turnX=0,turnY=0,sculpt=0,disposed=false;
  let frame=null,background=null,depth=null,lastDark=null;
  const maps={glass:materialMap('glass'),chrome:materialMap('chrome'),coral:materialMap('coral')};
  function reset(next=42){seed=Number(next)||42;meshes=[geometry(seed,0),geometry(seed+390,1),geometry(seed+910,2)];turnX=turnY=sculpt=0;}
  function resize(w,h,ratio=1){width=Math.max(1,w);height=Math.max(1,h);dpr=Math.min(1.5,Math.max(1,ratio));canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);frame=background=depth=null;}
  function interact(x,y,dx=0,dy=0){turnY+=dx*3.2;turnX=clamp(turnX+dy*2.2,-.8,.8);sculpt=clamp((x-.5)*.35+(y-.5)*.2,-.3,.3);}
  function prepareBackground(dark){
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=dark?'#211e3b':'#f6f3ec';ctx.fillRect(0,0,width,height);
    ctx.save();ctx.translate(width*.5,height*.91);ctx.scale(1,.22);
    const shade=ctx.createRadialGradient(0,0,0,0,0,width*.7);shade.addColorStop(0,dark?'#00000066':'#8d7b9555');shade.addColorStop(1,'#a398ad00');ctx.fillStyle=shade;ctx.fillRect(-width,-width,width*2,width*2);ctx.restore();
    background=ctx.getImageData(0,0,canvas.width,canvas.height);
    frame=ctx.createImageData(canvas.width,canvas.height);depth=new Float32Array(canvas.width*canvas.height);lastDark=dark;
  }
  function triangle(a,b,c,map){
    const cw=canvas.width,ch=canvas.height;
    const minX=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),maxX=Math.min(cw-1,Math.ceil(Math.max(a.x,b.x,c.x)));
    const minY=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),maxY=Math.min(ch-1,Math.ceil(Math.max(a.y,b.y,c.y)));
    const denom=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
    if(Math.abs(denom)<.00001||minX>maxX||minY>maxY)return;
    const inv=1/denom,dx0=(b.y-c.y)*inv,dy0=(c.x-b.x)*inv,dx1=(c.y-a.y)*inv,dy1=(a.x-c.x)*inv;
    const data=frame.data,size=MAT_SIZE-1;
    let row0=((b.y-c.y)*(minX+.5-c.x)+(c.x-b.x)*(minY+.5-c.y))*inv;
    let row1=((c.y-a.y)*(minX+.5-c.x)+(a.x-c.x)*(minY+.5-c.y))*inv;
    for(let y=minY;y<=maxY;y++,row0+=dy0,row1+=dy1){
      let w0=row0,w1=row1;
      for(let x=minX;x<=maxX;x++,w0+=dx0,w1+=dx1){
        const w2=1-w0-w1;if(w0<-.0001||w1<-.0001||w2<-.0001)continue;
        const z=w0*a.z+w1*b.z+w2*c.z,index=y*cw+x;if(z<=depth[index])continue;
        const nx=w0*a.n[0]+w1*b.n[0]+w2*c.n[0],ny=w0*a.n[1]+w1*b.n[1]+w2*c.n[1],nz=w0*a.n[2]+w1*b.n[2]+w2*c.n[2];
        if(nz<0)continue;
        const il=1/(Math.hypot(nx,ny,nz)||1);
        const tx=clamp((nx*il*.5+.5)*size,0,size-.001),ty=clamp((ny*il*.5+.5)*size,0,size-.001);
        const ix=Math.floor(tx),iy=Math.floor(ty),fx=tx-ix,fy=ty-iy;
        const p=(iy*MAT_SIZE+ix)*4,q=p+MAT_SIZE*4,o=index*4;
        for(let k=0;k<3;k++)data[o+k]=(map[p+k]*(1-fx)+map[p+4+k]*fx)*(1-fy)+(map[q+k]*(1-fx)+map[q+4+k]*fx)*fy;
        depth[index]=z;
      }
    }
  }
  function render(time=0,settings={}){
    if(disposed)return;
    if(settings.seed!=null&&Number(settings.seed)!==seed)reset(settings.seed);
    const dark=Boolean(settings.dark),energy=clamp(settings.energy??.5),scale=height/4.75;
    if(!frame||lastDark!==dark)prepareBackground(dark);
    frame.data.set(background.data);depth.fill(-Infinity);
    const rx=-.1+turnX+Math.sin(time*.16)*.07*energy,ry=turnY+Math.sin(time*.13)*.18*energy,rz=-.14+sculpt+(energy-.5)*.35;
    meshes.forEach((mesh,m)=>{
      const material=m===0?(settings.material||'glass'):m===1?(settings.material==='chrome'?'glass':'chrome'):(settings.material==='coral'?'glass':'coral');
      const transformed=mesh.vertices.map(vertex=>{
        let p=vertex.p,n=vertex.n;
        if(m===2){p=rotate(mul(p,.82),.55,-.1,-.52);n=rotate(n,.55,-.1,-.52);p=add(p,[.12,-.08,-.15]);}
        p=rotate(p,rx,ry+(m===0?Math.sin(time*.12)*.11*energy:0),rz+(m===1?Math.sin(time*.14+.5)*.10*energy:0));
        n=rotate(n,rx,ry+(m===0?Math.sin(time*.12)*.11*energy:0),rz+(m===1?Math.sin(time*.14+.5)*.10*energy:0));
        const perspective=7.8/(7.8-p[2]);return{x:(width/2+p[0]*scale*perspective)*dpr,y:(height*.48-p[1]*scale*perspective)*dpr,z:p[2],n};
      });
      mesh.faces.forEach(face=>{
        const a=transformed[face[0]],b=transformed[face[1]],c=transformed[face[2]],d=transformed[face[3]];
        if(a.n[2]+b.n[2]+c.n[2]+d.n[2]<-.5)return;
        triangle(a,b,c,maps[material]||maps.glass);triangle(a,c,d,maps[material]||maps.glass);
      });
    });
    ctx.putImageData(frame,0,0);
  }
  function dispose(){disposed=true;meshes=[];frame=background=depth=null;}
  reset(seed);resize(canvas.clientWidth||400,canvas.clientHeight||650,globalThis.devicePixelRatio||1);
  return{render,resize,interact,reset,dispose,renderer:'canvas2d'};
}
