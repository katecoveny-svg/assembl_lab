// The downhill machine's forest textures (bark, needle litter, trail dirt, fern and needle atlas), drawn entirely from code:
// no photographs. Open texgen.html in a browser to regenerate the .webp files in this folder (full size and _lq half size).
(function(){
const TAU=Math.PI*2;
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
// periodic value noise on a P×P lattice (tileable)
function pnoise(P,seed){const r=rng(seed),g=new Float32Array(P*P);for(let i=0;i<g.length;i++)g[i]=r();
  const f=t=>t*t*(3-2*t);return (x,y)=>{x=((x%P)+P)%P;y=((y%P)+P)%P;const xi=Math.floor(x),yi=Math.floor(y),xf=f(x-xi),yf=f(y-yi),x1=(xi+1)%P,y1=(yi+1)%P;
    const a=g[yi*P+xi],b=g[yi*P+x1],c=g[y1*P+xi],d=g[y1*P+x1];return a+(b-a)*xf+(c-a)*yf+(a-b-c+d)*xf*yf}}
function fbm(seed,base,oct){const ns=[];for(let o=0;o<oct;o++)ns.push(pnoise(base<<o,seed+o*101));
  return (u,v)=>{let s=0,a=.5,n=0;for(let o=0;o<oct;o++){s+=a*ns[o](u*(base<<o),v*(base<<o));n+=a;a*=.5}return s/n}}
const cv=(w,h)=>{const c=document.createElement("canvas");c.width=w;c.height=h;return c};
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// normal map (tangent space, +Y up = green up) from a Float32 height field
function normalMap(h,W,H,str,wrapY=true){const c=cv(W,H),g=c.getContext("2d"),im=g.createImageData(W,H),d=im.data;
  const at=(x,y)=>{x=(x+W)%W;y=wrapY?(y+H)%H:clamp(y,0,H-1);return h[y*W+x]};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const dx=(at(x+1,y)-at(x-1,y))*str,dy=(at(x,y+1)-at(x,y-1))*str;let nx=-dx,ny=dy,nz=1;const l=Math.hypot(nx,ny,nz);nx/=l;ny/=l;nz/=l;
    const i=(y*W+x)*4;d[i]=(nx*.5+.5)*255;d[i+1]=(ny*.5+.5)*255;d[i+2]=(nz*.5+.5)*255;d[i+3]=255}
  g.putImageData(im,0,0);return c}
// draw a shape at every tiling offset that touches the canvas
function wrapDraw(W,H,x,y,pad,fn){for(const ox of [-W,0,W])for(const oy of [-H,0,H]){const X=x+ox,Y=y+oy;if(X<-pad||X>W+pad||Y<-pad||Y>H+pad)continue;fn(X,Y)}}

// ---------------------------------------------------------------------------------------------------- redwood bark
// Coast redwood bark: thick, soft and fibrous, in long vertical ridges that wander, split and merge; cinnamon red-brown,
// deep red-brown furrows, and outer ridges weathered to grey-tan.
function bark(W,H,seed){const r=rng(seed),N=Math.round(W/26),hgt=new Float32Array(W*H);
  const strands=[];for(let i=0;i<N*2;i++){const big=i<N,base=big?(i+r()*.5)/N*W:r()*W,sp=W/N,ks=[1,2,3,5,9].map(k=>({k,a:sp*(k===1?.42:k===2?.3:k<6?.16:.07)*r()*(big?1:.7),p:r()*TAU}));
    const wk=1+Math.floor(r()*4),wp=r()*TAU,w0=sp*(big?(.5+r()*.22):(.22+r()*.15)),cr=[];const nc=2+Math.floor(r()*5);for(let c=0;c<nc;c++)cr.push({y:r()*H,w:5+r()*22,d:.3+r()*.5});
    strands.push({base,ks,wk,wp,w0,cr,h:big?(.8+r()*.3):(.55+r()*.3)})}
  const fib=fbm(seed+7,8,4),fine=pnoise(64,seed+9);
  const row=new Float32Array(W);
  for(let y=0;y<H;y++){row.fill(0);const v=y/H;
    for(const s of strands){let cx=s.base;for(const q of s.ks)cx+=q.a*Math.sin(TAU*q.k*v+q.p);const w=s.w0*(.78+.3*Math.sin(TAU*s.wk*v+s.wp));
      let hk=s.h;for(const c of s.cr){let dy=Math.abs(y-c.y);dy=Math.min(dy,H-dy);if(dy<c.w)hk*=1-c.d*(1-dy/c.w)*(1-dy/c.w)}
      const x0=Math.floor(cx-w),x1=Math.ceil(cx+w);for(let x=x0;x<=x1;x++){const d=Math.abs(x-cx)/w;if(d>=1)continue;const d2=d*d;const p=(1-d2*d2)*hk;const xi=((x%W)+W)%W;
        // soft max so ridges merge rather than clip
        row[xi]=row[xi]>0?Math.max(row[xi],p)+.25*Math.min(row[xi],p)*p:p}}
    for(let x=0;x<W;x++){const u=x/W;const f=fib(u*2,v*.25),fn=fine(x*.5,y*.03);hgt[y*W+x]=Math.pow(clamp(row[x],0,1.3),.8)*.85+(fn-.5)*.22+(f-.5)*.2}}
  const c=cv(W,H),g=c.getContext("2d"),im=g.createImageData(W,H),d=im.data;
  const deep=hex("#3B1A10"),furrow=hex("#5E2A19"),mid=hex("#874230"),cinn=hex("#A85A3C"),fresh=hex("#B86B47"),grey=hex("#8E7B6E"),greyL=hex("#A99484");
  const wn=fbm(seed+21,4,4),sp=pnoise(256,seed+23);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const h=hgt[y*W+x],u=x/W,v=y/H;let col;
    if(h<.15)col=mix(deep,furrow,clamp(h/.15,0,1));else if(h<.5)col=mix(furrow,mid,(h-.15)/.35);else col=mix(mid,cinn,clamp((h-.5)/.45,0,1));
    const wth=clamp((wn(u*1.5,v*.6)-.42)*3.2,0,1)*clamp((h-.45)*2.4,0,1);col=mix(col,mix(grey,greyL,clamp(h-.6,0,1)),wth*.85);
    const fr=clamp((sp(x*.25,y*.012)-.72)*4,0,1)*clamp(h*1.5,0,1);col=mix(col,fresh,fr*.6);
    const k=.9+(fine(x*.9,y*.08)-.5)*.25;const i=(y*W+x)*4;d[i]=clamp(col[0]*k,0,255);d[i+1]=clamp(col[1]*k,0,255);d[i+2]=clamp(col[2]*k,0,255);d[i+3]=255}
  g.putImageData(im,0,0);return {color:c,normal:normalMap(hgt,W,H,W/90)}}

// ---------------------------------------------------------------------------------------------------- needle litter
// The floor under redwoods: a deep mat of shed sprigs (short flat needles still on their twigs), loose needles,
// a few tiny cones and twigs, over dark damp humus. Tileable.
function litter(S,seed){const r=rng(seed),c=cv(S,S),g=c.getContext("2d"),hc=cv(S,S),hg=hc.getContext("2d");
  const base=fbm(seed+3,4,5),im=g.createImageData(S,S),hd=hg.createImageData(S,S);const A=hex("#2E1A12"),B=hex("#4A2C1C"),C=hex("#3A2A1E");
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const n=base(x/S,y/S),i=(y*S+x)*4;const col=mix(mix(A,B,n),C,clamp((n-.6)*3,0,1));im.data[i]=col[0];im.data[i+1]=col[1];im.data[i+2]=col[2];im.data[i+3]=255;const hv=n*40;hd.data[i]=hd.data[i+1]=hd.data[i+2]=hv;hd.data[i+3]=255}
  g.putImageData(im,0,0);hg.putImageData(hd,0,0);
  const pal=["#7A3E24","#8E4A2B","#9C5634","#6A3420","#B06A44","#5A3020","#7C5A46","#8A6650","#A0623E","#6E4430"].map(hex);
  const sc=S/1024;g.lineCap=hg.lineCap="round";
  let layer=0;const H=()=>Math.round(40+layer*190);
  const line=(x,y,a,L,w,col,hv)=>wrapDraw(S,S,x,y,L+4,(X,Y)=>{const dx=Math.cos(a)*L/2,dy=Math.sin(a)*L/2;g.strokeStyle=`rgb(${col[0]|0},${col[1]|0},${col[2]|0})`;g.lineWidth=w;g.beginPath();g.moveTo(X-dx,Y-dy);g.lineTo(X+dx,Y+dy);g.stroke();
    hg.strokeStyle=`rgb(${hv},${hv},${hv})`;hg.lineWidth=w;hg.beginPath();hg.moveTo(X-dx,Y-dy);hg.lineTo(X+dx,Y+dy);hg.stroke()});
  const shade=(col,k)=>[col[0]*k,col[1]*k,col[2]*k];
  // passes from bottom (dark, damp) to top (fresh, brighter)
  for(let pass=0;pass<5;pass++){layer=pass/4;const dk=.55+.45*layer;
    // loose needles
    for(let i=0;i<5200*sc*sc;i++){const col=shade(pal[Math.floor(r()*pal.length)],dk*(.8+r()*.4));line(r()*S,r()*S,r()*TAU,(7+r()*9)*sc,(1.6+r()*1.2)*sc,col,H()+Math.floor(r()*30))}
    // sprigs: a twig with short flat needles in two ranks
    for(let i=0;i<260*sc*sc;i++){const x=r()*S,y=r()*S,a=r()*TAU,L=(18+r()*34)*sc,col=shade(pal[Math.floor(r()*pal.length)],dk*(.85+r()*.3)),n=Math.floor(L/(3.2*sc));
      line(x,y,a,L,1.4*sc,shade(col,.7),H()+20);for(let k=0;k<n;k++){const t=(k/n-.5)*L,px=x+Math.cos(a)*t,py=y+Math.sin(a)*t,nl=(5+r()*3)*sc*(1-Math.abs(k/n-.5)*.6);
        for(const sd of [-1,1]){const b=a+sd*(1.15+r()*.25);line(px+Math.cos(b)*nl/2,py+Math.sin(b)*nl/2,b,nl,1.5*sc,shade(col,.9+r()*.25),H()+40)}}}}
  // twigs and tiny cones
  for(let i=0;i<34*sc*sc;i++){const x=r()*S,y=r()*S,a=r()*TAU,L=(30+r()*70)*sc;line(x,y,a,L,(2+r()*2)*sc,hex("#3A2418"),235);line(x+1,y-1,a,L*.9,.8*sc,hex("#6A4A38"),250)}
  for(let i=0;i<26*sc*sc;i++){const x=r()*S,y=r()*S,rx=(5+r()*3)*sc,ry=rx*.8,a=r()*TAU;wrapDraw(S,S,x,y,14,(X,Y)=>{g.save();g.translate(X,Y);g.rotate(a);g.fillStyle="#4E2C1A";g.beginPath();g.ellipse(0,0,rx,ry,0,0,TAU);g.fill();
    g.strokeStyle="#7A4A30";g.lineWidth=1*sc;for(let k=-2;k<=2;k++){g.beginPath();g.moveTo(k*rx*.35,-ry*.8);g.lineTo(k*rx*.35,ry*.8);g.stroke()}g.restore();hg.fillStyle="rgb(255,255,255)";hg.beginPath();hg.ellipse(X,Y,rx,ry,a,0,TAU);hg.fill()})}
  // a few seedlings and moss specks: small, so the litter stays the hero
  for(let i=0;i<70*sc*sc;i++){const x=r()*S,y=r()*S;const col=r()<.5?hex("#4E6A2A"):hex("#6B7F34");for(let k=0;k<4;k++)line(x+(r()-.5)*6*sc,y+(r()-.5)*6*sc,r()*TAU,(3+r()*3)*sc,1.6*sc,col,200)}
  const hdat=hg.getImageData(0,0,S,S).data,hgt=new Float32Array(S*S);for(let i=0;i<S*S;i++)hgt[i]=hdat[i*4]/255;
  return {color:c,normal:normalMap(hgt,S,S,S/260)}}

// ---------------------------------------------------------------------------------------------------- trail dirt
// A hand-cut trail in Rotorua's pumice loam: brown-grey compacted dirt with pale pumice grit and small stones, a smoother
// worn line down the middle, and ragged edges where the needle litter creeps back in (alpha). u runs along the trail
// (tileable), v runs across it (edges at v = 0 and 1).
function dirt(W,H,seed){const r=rng(seed),c=cv(W,H),g=c.getContext("2d"),hc=cv(W,H),hg=hc.getContext("2d");
  const n1=fbm(seed+1,4,5),n2=fbm(seed+5,16,3),edge=fbm(seed+9,8,3),im=g.createImageData(W,H),hd=hg.createImageData(W,H);
  const A=hex("#6A4F3A"),B=hex("#8C7058"),C=hex("#9C846C"),D=hex("#5A4232");
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const u=x/W,v=y/H,n=n1(u,v*.5),m=n2(u,v*.5),i=(y*W+x)*4;
    const worn=Math.exp(-Math.pow((v-.5)/.16,2));let col=mix(A,B,n);col=mix(col,C,clamp(worn*.55+(m-.5)*.4,0,1));col=mix(col,D,clamp((.5-Math.abs(v-.5))<.12?(.12-(.5-Math.abs(v-.5)))*5:0,0,.6));
    im.data[i]=col[0];im.data[i+1]=col[1];im.data[i+2]=col[2];
    // ragged edge: litter creeps over the outer edge; alpha cut where the floor shows through
    const e=Math.min(v,1-v),lim=.05+edge(u*5,v*3)*.15+(m-.5)*.06;im.data[i+3]=e<lim?0:255;
    const hv=(n*.6+m*.4)*120*(1-worn*.4);hd.data[i]=hd.data[i+1]=hd.data[i+2]=hv;hd.data[i+3]=255}
  g.putImageData(im,0,0);hg.putImageData(hd,0,0);
  const sc=W/1024;
  // grit and stones
  for(let i=0;i<6000*sc*sc;i++){const x=r()*W,y=H*(.08+r()*.84),s=(.8+r()*1.6)*sc,pale=r()<.45;wrapDraw(W,H,x,y,4,(X,Y)=>{if(Y<0||Y>H)return;g.fillStyle=pale?`rgba(${180+r()*30|0},${168+r()*25|0},${148+r()*25|0},.7)`:`rgba(52,38,28,.7)`;g.fillRect(X,Y,s,s);hg.fillStyle=pale?"#B4B4B4":"#303030";hg.fillRect(X,Y,s,s)})}
  for(let i=0;i<170*sc*sc;i++){const x=r()*W,y=H*(.1+r()*.8),rx=(3+r()*6)*sc,ry=rx*(.6+r()*.3),a=r()*TAU,t=r();wrapDraw(W,H,x,y,14,(X,Y)=>{
    g.fillStyle=t<.5?"#A69886":t<.8?"#7C6A5A":"#C8BCA8";g.beginPath();g.ellipse(X,Y,rx,ry,a,0,TAU);g.fill();g.fillStyle="rgba(255,250,235,.35)";g.beginPath();g.ellipse(X-rx*.25,Y-ry*.3,rx*.45,ry*.35,a,0,TAU);g.fill();
    g.strokeStyle="rgba(40,28,20,.45)";g.lineWidth=1;g.beginPath();g.ellipse(X,Y+ry*.15,rx,ry,a,0,Math.PI);g.stroke();
    const gr=hg.createRadialGradient(X,Y,0,X,Y,rx);gr.addColorStop(0,"#FFFFFF");gr.addColorStop(1,"rgba(255,255,255,0)");hg.fillStyle=gr;hg.beginPath();hg.ellipse(X,Y,rx,ry,a,0,TAU);hg.fill()})}
  // tyre lines: faint streaks along the trail
  g.lineCap="round";for(let i=0;i<46;i++){const y=H*(.32+r()*.36),x=r()*W,L=W*(.2+r()*.5),w=(2+r()*5)*sc;wrapDraw(W,H,x,y,L,(X,Y)=>{g.strokeStyle=`rgba(${r()<.5?"70,50,36":"170,150,128"},${.12+r()*.12})`;g.lineWidth=w;g.beginPath();g.moveTo(X,Y);g.bezierCurveTo(X+L*.3,Y+(r()-.5)*8,X+L*.6,Y+(r()-.5)*8,X+L,Y+(r()-.5)*6);g.stroke()})}
  // stray needles near the edges
  for(let i=0;i<1600*sc*sc;i++){const y0=r()<.5?r()*.24:1-r()*.24,x=r()*W,y=y0*H,a=r()*TAU,L=(6+r()*8)*sc;wrapDraw(W,H,x,y,L,(X,Y)=>{g.strokeStyle=["#7A3E24","#9C5634","#5A3020","#B06A44"][i%4];g.lineWidth=1.6*sc;g.beginPath();g.moveTo(X-Math.cos(a)*L/2,Y-Math.sin(a)*L/2);g.lineTo(X+Math.cos(a)*L/2,Y+Math.sin(a)*L/2);g.stroke()})}
  // re-apply the ragged alpha edge after the strokes
  const im2=g.getImageData(0,0,W,H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const u=x/W,v=y/H,e=Math.min(v,1-v),lim=.05+edge(u*5,v*3)*.15+(n2(u,v*.5)-.5)*.06,i=(y*W+x)*4;im2.data[i+3]=e<lim?0:255}g.putImageData(im2,0,0);
  const hdat=hg.getImageData(0,0,W,H).data,hgt=new Float32Array(W*H);for(let i=0;i<W*H;i++)hgt[i]=hdat[i*4]/255;
  return {color:c,normal:normalMap(hgt,W,H,W/300)}}

// ---------------------------------------------------------------------------------------------------- foliage atlas
// 1024 × 1024, transparent. Column 0 (0–256): a tree-fern frond (ponga / wheki): twice-divided, lance-shaped.
// Column 1 (256–512): a crown fern frond (once-divided, narrow, ladder-like pinnae). Right half, top (512–1024 × 0–512):
// redwood foliage sprays (short flat needles in two ranks). Right half, bottom-left (512–768 × 512–1024): a dead brown
// tree-fern frond (the skirt under a wheki crown). Bottom-right (768–1024 × 512–1024): a small ground fern.
// Cards are drawn with the frond's base at the BOTTOM of each cell (v = 0 at the bottom in three.js UV space).
function atlas(S,seed){const r=rng(seed),c=cv(S,S),g=c.getContext("2d");const k=S/1024;g.lineCap="round";g.lineJoin="round";
  const pinnate=(x0,y0,x1,y1,w0,opt)=>{// a frond from (x0,y0) base to (x1,y1) tip in a cell; width profile; pinnae
    const L=Math.hypot(x1-x0,y1-y0),ax=(x1-x0)/L,ay=(y1-y0)/L,nx=-ay,ny=ax;const n=opt.n,bend=opt.bend||0;
    const P=t=>[x0+ax*L*t+nx*bend*Math.sin(Math.PI*t)*L,y0+ay*L*t+ny*bend*Math.sin(Math.PI*t)*L];
    // rachis
    g.strokeStyle=opt.stem;g.lineWidth=opt.stemW*k;g.beginPath();for(let i=0;i<=40;i++){const p=P(i/40);i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])}g.stroke();
    for(let i=0;i<n;i++){const t=opt.start+(1-opt.start)*(i+.5)/n;const prof=opt.prof(t);if(prof<=0)continue;const p=P(t);
      for(const sd of [-1,1]){const ang=opt.ang*(1+.12*(r()-.5)),L2=w0*prof*(.9+.2*r());
        // pinna direction: angled towards the tip
        const dx=Math.cos(ang)*ax+Math.sin(ang)*nx*sd,dy=Math.cos(ang)*ay+Math.sin(ang)*ny*sd;const shade=opt.col(t,r());
        g.strokeStyle=shade;g.lineWidth=Math.max(1,opt.pw*k*(1-.5*t));g.beginPath();g.moveTo(p[0],p[1]);const ex=p[0]+dx*L2,ey=p[1]+dy*L2;
        const droop=opt.droop||0;g.quadraticCurveTo(p[0]+dx*L2*.5+ax*droop*L2,p[1]+dy*L2*.5+ay*droop*L2,ex,ey);g.stroke();
        if(opt.pinnules){const m=Math.max(3,Math.round(L2/(opt.pinnules*k)));for(let j=0;j<m;j++){const s=(j+.6)/m,qx=p[0]+dx*L2*s,qy=p[1]+dy*L2*s,ll=L2*.32*(1-s*.75)*(opt.pinLen||1);
          for(const s2 of [-1,1]){const a2=.95;const ddx=Math.cos(a2)*dx+Math.sin(a2)*(-dy)*s2*sd,ddy=Math.cos(a2)*dy+Math.sin(a2)*(dx)*s2*sd;
            g.fillStyle=opt.col(t,r());g.beginPath();g.ellipse(qx+ddx*ll*.5,qy+ddy*ll*.5,ll*.55,Math.max(.8*k,ll*.2),Math.atan2(ddy,ddx),0,TAU);g.fill()}}}
        else if(opt.leaflet){g.fillStyle=shade;g.beginPath();g.ellipse(p[0]+dx*L2*.5,p[1]+dy*L2*.5,L2*.5,Math.max(1.2*k,opt.leaflet*k),Math.atan2(dy,dx),0,TAU);g.fill()}}}};
  const greens=(a,b)=>{const A=hex(a),B=hex(b);return (t,q)=>{const m=mix(A,B,clamp(t*.8+q*.35,0,1));return `rgb(${m[0]|0},${m[1]|0},${m[2]|0})`}};
  // 0: tree fern frond (base at bottom of cell)
  pinnate(128*k,1018*k,128*k,8*k,116*k,{n:34,start:.12,ang:1.1,stem:"#4A3A22",stemW:4.5,pw:2.2,pinnules:6.5,pinLen:.62,droop:.06,
    prof:t=>Math.pow(Math.sin(Math.PI*Math.pow(clamp((t-.08)/.92,0,1),.7)),1.1),col:greens("#1F3F18","#4F8A31")});
  // 1: crown fern frond: narrow, many simple pinnae
  pinnate(384*k,1018*k,384*k,10*k,92*k,{n:58,start:.2,ang:1.2,stem:"#4E4A24",stemW:4,pw:2.4,leaflet:5.5,droop:.08,
    prof:t=>Math.pow(Math.sin(Math.PI*clamp((t-.15)/.85,0,1)),.6)*(t>.15?1:0),col:greens("#355F1E","#7FA63E")});
  // 2: redwood foliage sprays (fill the 512 cell)
  {const ox=512*k,oy=0,CS=512*k;g.save();g.beginPath();g.rect(ox,oy,CS,CS);g.clip();
    const spray=(x,y,a,L)=>{const n=Math.floor(L/(10*k));g.strokeStyle="#3A2E1E";g.lineWidth=2.2*k;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*L,y+Math.sin(a)*L);g.stroke();
      for(let i=1;i<n;i++){const t=i/n,px=x+Math.cos(a)*L*t,py=y+Math.sin(a)*L*t;for(const sd of [-1,1]){if(r()<.25)continue;const b=a+sd*(.6+r()*.3),l2=L*(.42-.3*t)*(.7+.5*r());
          const tw=Math.floor(l2/(4.2*k));g.strokeStyle="#3B4A26";g.lineWidth=1.2*k;g.beginPath();g.moveTo(px,py);g.lineTo(px+Math.cos(b)*l2,py+Math.sin(b)*l2);g.stroke();
          for(let j=1;j<=tw;j++){const s=j/(tw+.5),qx=px+Math.cos(b)*l2*s,qy=py+Math.sin(b)*l2*s,nl=(9-4*s)*k;for(const s2 of [-1,1]){const cc=mix(hex("#1F3A1A"),hex(r()<.15?"#7EA046":"#3F6A2C"),r());
            g.strokeStyle=`rgb(${cc[0]|0},${cc[1]|0},${cc[2]|0})`;g.lineWidth=2.4*k;const nb=b+s2*1.3;g.beginPath();g.moveTo(qx,qy);g.lineTo(qx+Math.cos(nb)*nl,qy+Math.sin(nb)*nl);g.stroke()}}}}};
    // sprays radiate from the bottom-centre of the cell (where the card attaches to a branch)
    for(let i=0;i<9;i++){const a=-Math.PI/2+(r()-.5)*1.7;spray(ox+CS*(.5+(r()-.5)*.2),oy+CS*(.97-r()*.12),a,CS*(.55+r()*.35))}
    g.restore()}
  // 3: dead tree-fern frond, brown, hanging (skirt)
  {g.save();g.beginPath();g.rect(512*k,512*k,256*k,512*k);g.clip();pinnate(640*k,1020*k,640*k,520*k,70*k,{n:26,start:.1,ang:1.25,stem:"#3E2A1A",stemW:3.5,pw:2,pinnules:5,pinLen:.9,droop:.25,
    prof:t=>Math.sin(Math.PI*clamp((t-.05)/.95,0,1)),col:(t,q)=>{const m=mix(hex("#4A3020"),hex("#8A6440"),clamp(q*.8+t*.3,0,1));return `rgb(${m[0]|0},${m[1]|0},${m[2]|0})`}});g.restore()}
  // 4: small ground fern (kiokio-like): a few fronds from the bottom-centre
  {g.save();g.beginPath();g.rect(768*k,512*k,256*k,512*k);g.clip();for(let i=0;i<5;i++){const a=-Math.PI/2+(i-2)*.32+(r()-.5)*.1,L=(300+r()*150)*k;
    pinnate(896*k,1020*k,896*k+Math.cos(a)*L,1020*k+Math.sin(a)*L,44*k,{n:22,start:.15,ang:1.1,stem:"#5A5228",stemW:2.6,pw:2,leaflet:6.5,droop:.1,
      prof:t=>Math.sin(Math.PI*clamp((t-.1)/.9,0,1)),col:greens("#3C6A20","#A6C24E")})}g.restore()}
  return {color:c}}

window.TEXGEN={bark,litter,dirt,atlas};
})();
