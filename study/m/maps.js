(()=>{
// The map machine: a made-up coastal valley (Kōwhai Bay) on a 1:25 000 topographic map, a map of Aotearoa with latitude and longitude,
// and a climate graph. Compass points and bearings, grid references, scale and distance, contours and cross-sections.
const fmt=(x,d=0)=>{let v=Number(x);if(Math.abs(v)<0.5*Math.pow(10,-d))v=0;return v.toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d})};
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
// figure parts from the shared bench look (StudyKit.fig): navy ink, product colours, peach cases for social studies
const FG=StudyKit.fig,PAL=FG.palette,TINT=PAL.case.peach,TDEEP=FG.deep(PAL.case.peach);
const INK="#262E5C",ROSE="#7C7F99",PAPER="#FFFDFB",PINK="#E8688A",MINT="#4FA88A",SUN="#F2C83C",SEA="#BFE1EC",RIVER="#5FA8CB",ROAD="#E39A6A",TRAIL="#D2558A",LILAC="#9C86D6",BUSH="#A9CC9A";
// ---------- sound: the kit's sounds if it has them, plus a tiny synth for footsteps and whistles (only after a tap or key press)
let gest=false;["pointerdown","keydown"].forEach(e=>addEventListener(e,()=>{gest=true},{capture:true}));
const muted=()=>{try{return localStorage.getItem("studysound")==="off"}catch(e){return false}};
const sfx=n=>{if(!gest)return;try{window.StudyKit&&StudyKit.sfx&&StudyKit.sfx(n)}catch(e){}};
let AC=null;
function blip(f,d=.06,type="sine",vol=.04,f2){if(!gest||muted())return;try{if(window.StudyKit&&StudyKit.tone)return StudyKit.tone(f,d,type,vol,0,f2);AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==="suspended")AC.resume();
  const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d+.03)}catch(e){}}
let lastTick=0;const tick=()=>{const n=performance.now();if(n-lastTick>55){lastTick=n;sfx("tick")}};
// ---------- text styles that grow on phones
const st=document.createElement("style");st.textContent=`
.mp-s{font:500 11px var(--mono);letter-spacing:.03em}.mp-l{font:600 12px var(--mono);letter-spacing:.04em}.mp-t{font:600 14px var(--mono)}.mp-b{font:600 22px var(--display);letter-spacing:-.01em}.mp-m{font:500 13px var(--display)}
.halo{paint-order:stroke;stroke:#FFFDFB;stroke-width:3.2px;stroke-linejoin:round}
@media (max-width:820px){.mp-s{font-size:17px}.mp-l{font-size:18px}.mp-t{font-size:22px}.mp-b{font-size:31px}.mp-m{font-size:19px}.mp-desk{display:none}.halo{stroke-width:4.5px}}
@media (min-width:821px){.mp-phone{display:none}}`;document.head.appendChild(st);
// ---------- helpers
function cr(P,n=10){const o=[];for(let i=0;i<P.length-1;i++){const p0=P[i-1]||P[i],p1=P[i],p2=P[i+1],p3=P[i+2]||P[i+1];
  for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t,f=j=>.5*(2*p1[j]+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3);o.push([f(0),f(1)])}}
  o.push(P[P.length-1]);return o}
const seg2=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy;let t=L?((x-a[0])*dx+(y-a[1])*dy)/L:0;t=Math.max(0,Math.min(1,t));const ex=a[0]+t*dx-x,ey=a[1]+t*dy-y;return ex*ex+ey*ey};
const plen=P=>{let L=0;for(let i=1;i<P.length;i++)L+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);return L};
// ---------- the valley, in kilometres: X east from easting 20, Y north from northing 40
const MX=16,MY=10,K=80,GW=8,GH=5;const PX=X=>MX+X*K,PY=Y=>MY+(GH-Y)*K;
const COASTC=[[6.75,5.2],[6.75,5.0],[6.55,4.4],[6.75,4.0],[7.3,3.8],[7.55,3.6],[7.4,3.4],[7.0,3.25],[6.5,3.0],[6.1,2.6],[5.88,2.0],[5.95,1.6],[6.2,1.1],[6.6,0.5],[6.9,0],[6.95,-0.2]];
const COAST=cr(COASTC,12);
function xc(Y){for(let i=0;i<COAST.length-1;i++){const a=COAST[i],b=COAST[i+1];if((Y<=a[1]&&Y>=b[1])||(Y>=a[1]&&Y<=b[1])){const t=a[1]===b[1]?0:(Y-a[1])/(b[1]-a[1]);return a[0]+t*(b[0]-a[0])}}return 6.8}
const RIVERC=[[0.25,3.48],[0.9,3.22],[1.6,3.1],[2.3,2.82],[2.9,2.8],[3.5,2.52],[4.1,2.34],[4.7,2.02],[5.3,1.8],[5.75,1.73],[6.1,1.7]];
const RIV=cr(RIVERC,10);
const dRiver=(X,Y)=>{let m=1e9;for(let i=0;i<RIV.length-1;i++){const d=seg2(X,Y,RIV[i],RIV[i+1]);if(d<m)m=d}return Math.sqrt(m)};
function H(X,Y){const dc=xc(Y)-X;if(dc<0)return -Math.min(30,-dc*45);
  let h=230*(1-Math.exp(-dc/2))+235*Math.exp(-((X-1.8)**2+(Y-1.6)**2)/0.8)+150*Math.exp(-((X-2.0)**2+(Y-4.3)**2)/1.1)+58*Math.exp(-((X-7.15)**2+(Y-3.58)**2)/0.1);
  const dr=dRiver(X,Y);h-=108*Math.exp(-dr*dr/0.17)*Math.min(1,dc/2);return Math.max(h,0.6)}
// height grid, 50 m spacing
const GS=0.05,NX=GW/GS,NY=GH/GS,G=[];for(let j=0;j<=NY;j++){const r=[];for(let i=0;i<=NX;i++)r.push(H(i*GS,j*GS));G.push(r)}
const gH=(X,Y)=>{const fx=Math.max(0,Math.min(NX-1e-6,X/GS)),fy=Math.max(0,Math.min(NY-1e-6,Y/GS)),i=Math.floor(fx),j=Math.floor(fy),u=fx-i,v=fy-j;
  return G[j][i]*(1-u)*(1-v)+G[j][i+1]*u*(1-v)+G[j+1][i]*(1-u)*v+G[j+1][i+1]*u*v};
// summit: highest point near Lookout Hill
let SUM=[1.8,1.6],SH=0;for(let j=0;j<=NY;j++)for(let i=0;i<=NX;i++)if(G[j][i]>SH){SH=G[j][i];SUM=[i*GS,j*GS]}
{let best=SH;for(let dx=-0.05;dx<=0.05;dx+=0.005)for(let dy=-0.05;dy<=0.05;dy+=0.005){const h=H(SUM[0]+dx,SUM[1]+dy);if(h>best){best=h;SUM=[SUM[0]+dx,SUM[1]+dy]}}SH=best}
const SHR=Math.round(SH);
const TRAILC=[[4.95,1.3],[4.45,1.1],[4.05,1.38],[3.65,1.04],[3.3,1.42],[2.98,1.08],[2.68,1.5],[2.4,1.22],[2.14,1.6],[SUM[0],SUM[1]]];
const TR=cr(TRAILC,14),TRL=plen(TR);const TRcum=[0];for(let i=1;i<TR.length;i++)TRcum.push(TRcum[i-1]+Math.hypot(TR[i][0]-TR[i-1][0],TR[i][1]-TR[i-1][1]));
function trailAt(d){d=Math.max(0,Math.min(TRL,d));let i=1;while(i<TR.length-1&&TRcum[i]<d)i++;const t=(d-TRcum[i-1])/((TRcum[i]-TRcum[i-1])||1);return[TR[i-1][0]+t*(TR[i][0]-TR[i-1][0]),TR[i-1][1]+t*(TR[i][1]-TR[i-1][1]),i]}
const ROADC=[[4.3,-0.05],[4.7,0.6],[5.12,1.02],[5.38,1.48],[5.45,1.76],[5.62,2.15],[5.98,2.62],[6.2,3.2],[6.3,3.9],[6.33,4.4],[6.45,5.05]];
const ROADM=[[5.52,1.98],[5.0,2.36],[4.5,2.66],[3.98,2.93]];
const RD=cr(ROADC,10),RDM=cr(ROADM,10);
const F={town:{n:"Kōwhai Bay town",s:"the town",X:5.35,Y:1.15},marae:{n:"the marae",s:"the marae",X:3.88,Y:2.96},bridge:{n:"the road bridge",s:"the bridge",X:5.45,Y:1.76},
  lookout:{n:"Lookout Hill summit",s:"the summit",X:SUM[0],Y:SUM[1]},fishing:{n:"the fishing rocks",s:"the fishing rocks",X:7.32,Y:3.6}};
const P8=["north","north-east","east","south-east","south","south-west","west","north-west"],P8s=["N","NE","E","SE","S","SW","W","NW"];
const bearing=(a,b)=>(Math.atan2(b.X-a.X,b.Y-a.Y)*180/Math.PI+360)%360;
const dir8=b=>P8[Math.round(b/45)%8];
const b3=b=>String(Math.round(b)%360).padStart(3,"0")+"°";
const grid4=p=>`${Math.floor(20+p.X)}${Math.floor(40+p.Y)}`,grid6=p=>`${Math.floor((20+p.X)*10)} ${Math.floor((40+p.Y)*10)}`;
// ---------- Aotearoa, simplified coastline (longitude, latitude south)
const NI=[[172.68,34.43],[173.0,34.4],[173.45,34.85],[174.1,35.2],[174.35,35.6],[174.5,35.85],[174.75,36.3],[174.8,36.85],[175.15,36.95],[175.35,36.47],[175.6,36.7],[175.75,36.95],[175.9,37.4],[176.17,37.65],[176.99,37.95],[177.29,38.0],[178.0,37.53],[178.55,37.69],[178.3,38.3],[178.0,38.67],[177.9,39.15],[177.4,39.05],[176.92,39.49],[177.1,39.64],[176.85,40.1],[176.6,40.5],[176.22,40.9],[175.8,41.3],[175.29,41.61],[175.15,41.42],[174.95,41.42],[174.85,41.33],[174.62,41.3],[174.75,41.12],[174.95,40.98],[175.22,40.47],[175.0,39.95],[174.3,39.62],[173.76,39.28],[174.07,39.05],[174.6,38.75],[174.8,38.07],[174.85,37.8],[174.7,37.38],[174.55,37.05],[174.4,36.8],[174.15,36.4],[173.85,36.0],[173.35,35.53],[173.15,35.17],[172.85,34.75]];
const SI=[[172.69,40.5],[173.0,40.52],[172.8,40.84],[173.0,40.78],[173.0,41.1],[173.28,41.27],[173.6,41.1],[173.85,40.85],[174.3,41.0],[174.3,41.3],[174.27,41.73],[173.7,42.42],[173.3,42.8],[172.75,43.3],[172.75,43.53],[172.95,43.6],[173.12,43.85],[172.75,43.85],[172.4,43.85],[171.9,44.1],[171.25,44.4],[170.97,45.1],[170.82,45.47],[170.75,45.85],[170.2,46.05],[169.82,46.45],[169.3,46.6],[168.85,46.66],[168.35,46.62],[167.75,46.3],[166.62,46.16],[166.8,45.7],[167.9,44.62],[168.4,44.15],[168.6,43.97],[169.04,43.88],[169.8,43.35],[170.96,42.72],[171.2,42.45],[171.4,41.95],[171.45,41.75],[172.1,41.25],[172.2,40.78]];
const RK=[[167.55,46.85],[168.05,46.7],[168.25,46.9],[168.15,47.15],[167.75,47.25],[167.5,47.1]];
const CITIES={akl:{n:"Tāmaki Makaurau",e:"Auckland",lat:36.85,lon:174.76},wlg:{n:"Te Whanganui-a-Tara",e:"Wellington",lat:41.29,lon:174.78},chc:{n:"Ōtautahi",e:"Christchurch",lat:43.53,lon:172.64}};
const NZx=lon=>40+(lon-166)*21.06,NZy=lat=>20+(lat-34)*27.9;
const dms=(v)=>{let d=Math.floor(v),m=Math.round((v-d)*60);if(m===60){d++;m=0}return `${d}°${String(m).padStart(2,"0")}′`};
const kmBetween=(a,b)=>{const R=6371,toR=Math.PI/180,dl=(b.lat-a.lat)*toR,dn=(b.lon-a.lon)*toR,x=Math.sin(dl/2)**2+Math.cos(a.lat*toR)*Math.cos(b.lat*toR)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))};
// ---------- climate: illustrative data for the made-up town
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],MONL=["January","February","March","April","May","June","July","August","September","October","November","December"];
const RAIN=[70,80,85,100,115,135,140,120,105,95,80,90],TEMP=[19.5,20.0,18.8,16.5,14.1,12.0,11.2,11.7,13.0,14.5,16.2,18.3];
const RTOT=RAIN.reduce((a,b)=>a+b,0),TMAX=Math.max(...TEMP),TMIN=Math.min(...TEMP),TRANGE=TMAX-TMIN;
// ---------- state
const s={view:"compass",from:"marae",to:"lookout",pin:{X:2.62,Y:3.78},pinP:1,needle:0,nv:0,trail:1.2,A:{X:2.4,Y:0.9},B:{X:3.1,Y:4.55},secP:0,sec:"valley",
  lat:CITIES.akl.lat,lon:CITIES.akl.lon,city:"akl",cross0:null,crossP:1,cpin:1,month:6,playing:undefined};
const SECS={valley:[{X:2.4,Y:0.9},{X:3.1,Y:4.55}],lookout:[{X:4.95,Y:1.3},{X:SUM[0],Y:SUM[1]}],headland:[{X:5.4,Y:4.1},{X:7.8,Y:3.4}]};
const target=()=>s.to==="pin"?s.pin:F[s.to];
const curB=()=>{const a=F[s.from],b=target();if(!b||(a.X===b.X&&a.Y===b.Y))return null;return bearing(a,b)};
// ---------- contour lines (marching squares on the 50 m grid), drawn once
const LEVELS=[50,100,150,200,250,300,350,400];
function contours(L){const pt={},adj={},key=(t,i,j)=>t+i+","+j;
  const edgeP=(t,i,j)=>{const k=key(t,i,j);if(!pt[k]){let a,b,x1,y1,x2,y2;if(t==="h"){a=G[j][i];b=G[j][i+1];x1=i;y1=j;x2=i+1;y2=j}else{a=G[j][i];b=G[j+1][i];x1=i;y1=j;x2=i;y2=j+1}
    const f=(L-a)/(b-a);pt[k]=[(x1+f*(x2-x1))*GS,(y1+f*(y2-y1))*GS]}return k};
  const link=(p,q)=>{(adj[p]=adj[p]||[]).push(q);(adj[q]=adj[q]||[]).push(p)};
  for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){const v=[G[j][i],G[j][i+1],G[j+1][i+1],G[j+1][i]],b=v.map(x=>x>=L);
    const E=[["h",i,j,0,1],["v",i+1,j,1,2],["h",i,j+1,3,2],["v",i,j,0,3]],X=[];E.forEach(([t,a,c,p,q],n)=>{if(b[p]!==b[q])X.push(n)});
    if(X.length===2)link(edgeP(...E[X[0]].slice(0,3)),edgeP(...E[X[1]].slice(0,3)));
    else if(X.length===4){const c=(v[0]+v[1]+v[2]+v[3])/4>=L,e=E.map(x=>edgeP(...x.slice(0,3)));if(c===b[0]){link(e[0],e[1]);link(e[2],e[3])}else{link(e[3],e[0]);link(e[1],e[2])}}}
  const seen=new Set(),chains=[];
  Object.keys(adj).forEach(k0=>{if(seen.has(k0))return;// walk to one end first
    let start=k0,prev=null,cur=k0;const vis=new Set([k0]);while(true){const nx=(adj[cur]||[]).find(n=>n!==prev&&!vis.has(n));if(!nx)break;vis.add(nx);prev=cur;cur=nx}
    start=(adj[cur].length===1)?cur:k0;const ch=[start];seen.add(start);prev=null;cur=start;
    while(true){const nx=(adj[cur]||[]).find(n=>!seen.has(n));if(!nx){const back=(adj[cur]||[]).find(n=>n===start&&ch.length>2);if(back)ch.push(start);break}seen.add(nx);ch.push(nx);cur=nx}
    chains.push(ch.map(k=>pt[k]))});
  return chains}
const CONT=LEVELS.map(L=>({L,ch:contours(L)}));
const d=P=>P.map((p,i)=>(i?"L":"M")+PX(p[0]).toFixed(1)+","+PY(p[1]).toFixed(1)).join("");
// labels for index contours: walk down from the summit to the south-west and from the north hill to the north-west
function contourLabels(){let o="";const rays=[[SUM,[-0.62,-0.78]],[[2.0,4.3],[-0.8,0.45]]];
  CONT.filter(c=>c.L%100===0).forEach(c=>{rays.forEach(([o0,dv],ri)=>{if(ri===1&&c.L>300)return;let t=0,prev=gH(o0[0],o0[1]),hit=null;for(t=0.02;t<3;t+=0.01){const X=o0[0]+dv[0]*t,Y=o0[1]+dv[1]*t;if(X<0.1||Y<0.1||Y>4.9)break;const h=gH(X,Y);if((prev-c.L)*(h-c.L)<=0){hit=[X,Y];break}prev=h}
    if(!hit)return;let best=null,bd=1e9,bi=0,bc=null;c.ch.forEach(ch=>ch.forEach((p,i)=>{const q=(p[0]-hit[0])**2+(p[1]-hit[1])**2;if(q<bd){bd=q;best=p;bi=i;bc=ch}}));
    if(!best||bd>0.01)return;const a=bc[Math.max(0,bi-2)],b=bc[Math.min(bc.length-1,bi+2)];let ang=Math.atan2(-(b[1]-a[1]),b[0]-a[0])*180/Math.PI;if(ang>90)ang-=180;if(ang<-90)ang+=180;
    o+=`<text class="mp-s halo mp-desk" transform="translate(${PX(best[0]).toFixed(1)},${PY(best[1]).toFixed(1)}) rotate(${ang.toFixed(0)})" text-anchor="middle" dy="3.5" style="fill:#9A6B52;stroke-width:4px">${c.L}</text>`})});return o}
// ---------- the terrain picture: pastel layer tints with soft hill shading, painted once
function terrainURL(){try{const W=320,Hh=200,cv=document.createElement("canvas");cv.width=W;cv.height=Hh;const g=cv.getContext("2d");if(!g)return"";const im=g.createImageData(W,Hh);
  const LAND=[[0,[240,244,222]],[60,[226,238,208]],[150,[214,233,201]],[250,[233,229,199]],[340,[242,220,203]],[440,[240,206,216]]],SEAC=[[-30,[163,207,224]],[0,[205,232,240]]];
  const ramp=(R,h)=>{if(h<=R[0][0])return R[0][1];for(let i=1;i<R.length;i++)if(h<=R[i][0]){const t=(h-R[i-1][0])/(R[i][0]-R[i-1][0]);return R[i-1][1].map((c,k)=>c+t*(R[i][1][k]-c))}return R[R.length-1][1]};
  for(let j=0;j<Hh;j++)for(let i=0;i<W;i++){const X=(i+.5)/W*GW,Y=GH-(j+.5)/Hh*GH,h=gH(X,Y);let c;
    if(h<=0)c=ramp(SEAC,h);else{c=ramp(LAND,h);const e=.03,gx=(gH(X+e,Y)-gH(X-e,Y))/(2*e*1000),gy=(gH(X,Y+e)-gH(X,Y-e))/(2*e*1000);
      // light from the north-west
      const nx=-gx,ny=-gy,nz=1,n=Math.hypot(nx,ny,nz),sh=(nx*-0.5+ny*0.5+nz*0.707)/n;c=c.map(v=>Math.max(0,Math.min(255,v*(0.86+0.2*sh))))}
    const k=(j*W+i)*4;im.data[k]=c[0];im.data[k+1]=c[1];im.data[k+2]=c[2];im.data[k+3]=255}
  g.putImageData(im,0,0);return cv.toDataURL("image/png")}catch(e){return""}}
const TERR=terrainURL();
// a steel-bezelled compass standing on the paper: navy floor shadow, steel ring, white face
const bezel=(cx,cy,r)=>`<ellipse cx="${cx+r*.32}" cy="${cy+r*.3}" rx="${r+5}" ry="${r+3}" fill="${PAL.shadow}" opacity=".16"/><circle cx="${cx}" cy="${cy}" r="${r+5}" fill="${PAL.steel}" stroke="${PAL.steelDark}" stroke-width="1.2"/><path d="M${cx-(r+2.5)*.8},${cy-(r+2.5)*.6} A${r+2.5},${r+2.5} 0 0 1 ${cx+(r+2.5)*.6},${cy-(r+2.5)*.8}" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="2" stroke-linecap="round"/>`;
// the map sheet lies in a shallow frosted peach tray, one long navy shadow to the lower right
const tray=(x,y,w,h)=>`<path d="M${x+w+6},${y+4} l26,14 V${y+h+30} H${x+40} l-34,-24 z" fill="${PAL.shadow}" opacity=".10"/>`+FG.acrylic(x,y,w,h,{tint:TINT,d:6,r:8,balls:false,shadow:false});
// ---------- static map layer
let rnd=11;const R=()=>{rnd=(rnd*1103515245+12345)%2147483648;return rnd/2147483648};
function staticMap(){let o=FG.floor(800,420)+tray(MX-7,MY-5,GW*K+14,GH*K+10)+`<rect x="${MX}" y="${MY}" width="${GW*K}" height="${GH*K}" fill="${SEA}"/>`;
  if(TERR)o+=`<image href="${TERR}" x="${MX}" y="${MY}" width="${GW*K}" height="${GH*K}" preserveAspectRatio="none"/>`;
  // sea ripples
  for(let i=0;i<9;i++){const Y=0.3+i*0.55,X=xc(Y)+0.35+(i%3)*0.18;if(X<7.8)o+=`<path d="M${PX(X)},${PY(Y)} q6,-4 12,0 t12,0" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.2"/>`}
  // beach
  o+=`<path d="${d(COAST.filter(p=>p[1]>0.95&&p[1]<3.05))}" fill="none" stroke="#F4E3B8" stroke-width="7" stroke-linecap="round"/>`;
  o+=`<path d="${d(COAST)}" fill="none" stroke="#7DB5CC" stroke-width="1.3"/>`;
  // bush on the hills (tree dots)
  for(let n=0;n<420;n++){const X=0.1+R()*6.2,Y=0.1+R()*4.8,h=gH(X,Y);if(h<150||xc(Y)-X<0.4||dRiver(X,Y)<0.12||Math.abs(X-SUM[0])+Math.abs(Y-SUM[1])<0.35)continue;
    let near=false;for(let i=0;i<TR.length;i+=3)if(Math.hypot(TR[i][0]-X,TR[i][1]-Y)<0.12){near=true;break}if(near)continue;o+=`<circle cx="${PX(X).toFixed(1)}" cy="${PY(Y).toFixed(1)}" r="${(2+R()*1.6).toFixed(1)}" fill="${BUSH}" opacity=".55"/>`}
  // contours
  CONT.forEach(c=>{const idx=c.L%100===0;o+=`<path d="${c.ch.map(d).join("")}" fill="none" stroke="#B9876D" stroke-opacity="${idx?.8:.55}" stroke-width="${idx?1.5:.8}" stroke-linejoin="round"/>`});
  o+=contourLabels();
  // river, getting wider downstream
  const nR=RIV.length;[[0,.4,1.6],[.4-1/nR,.75,2.4],[.75-1/nR,1,3.4]].forEach(([a,b,w])=>{o+=`<path d="${d(RIV.slice(Math.floor(a*nR),Math.ceil(b*nR)))}" fill="none" stroke="${RIVER}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`});
  o+=`<text class="mp-s halo" x="${PX(0.3)}" y="${PY(3.62)}" transform="rotate(-14 ${PX(0.3)} ${PY(3.62)})" style="fill:#3E7FA0;font-style:italic">Kōwhai Stream</text>`;
  // roads
  [RD,RDM].forEach((P,i)=>o+=`<path d="${d(P)}" fill="none" stroke="#fff" stroke-width="${i?4.5:6}" stroke-linecap="round"/><path d="${d(P)}" fill="none" stroke="${ROAD}" stroke-width="${i?2.2:3.2}" stroke-linecap="round"/>`);
  // trail
  o+=`<path d="${d(TR)}" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" opacity=".8"/><path d="${d(TR)}" fill="none" stroke="${TRAIL}" stroke-width="2.2" stroke-dasharray="6 4" stroke-linecap="round"/>`;
  // town
  for(let n=0;n<260;n++){const X=4.86+R()*1.0,Y=0.72+R()*0.86;if(X>xc(Y)-0.1||dRiver(X,Y)<0.1)continue;let bad=false;for(const p of RD)if(Math.hypot(p[0]-X,p[1]-Y)<0.07){bad=true;break}
    for(const p of TR)if(Math.hypot(p[0]-X,p[1]-Y)<0.08){bad=true;break}if(bad)continue;if(Math.hypot((X-5.35)/0.55,(Y-1.12)/0.42)>1)continue;o+=`<rect x="${(PX(X)-2.2).toFixed(1)}" y="${(PY(Y)-2.2).toFixed(1)}" width="4.4" height="4.4" fill="${INK}" opacity=".78" transform="rotate(${Math.round(R()*30-15)} ${PX(X).toFixed(1)} ${PY(Y).toFixed(1)})"/>`}
  // bridge
  {const x=PX(F.bridge.X),y=PY(F.bridge.Y);o+=`<g transform="rotate(-62 ${x} ${y})"><path d="M${x-9},${y-4} h18 M${x-9},${y+4} h18" stroke="${INK}" stroke-width="1.8"/></g>`}
  // marae: a wharenui shape
  {const x=PX(F.marae.X),y=PY(F.marae.Y);o+=`<path d="M${x-8},${y+5} v-6 l8,-6 l8,6 v6 z" fill="#fff" stroke="${INK}" stroke-width="1.4"/><path d="M${x-10},${y-0.5} l10,-7.5 l10,7.5" fill="none" stroke="${PINK}" stroke-width="2.2" stroke-linecap="round"/><rect x="${x-2}" y="${y}" width="4" height="5" fill="${INK}"/>`}
  // summit
  {const x=PX(SUM[0]),y=PY(SUM[1]);o+=`<path d="M${x},${y-6} l6,10 h-12z" fill="${INK}"/><text class="mp-l halo" x="${x+9}" y="${y+16}" style="fill:${INK}">${SHR}</text>`}
  // fishing rocks
  {const x=PX(F.fishing.X),y=PY(F.fishing.Y);o+=`<circle cx="${x-4}" cy="${y+6}" r="3" fill="#9A8C93"/><circle cx="${x+3}" cy="${y+7}" r="2.4" fill="#9A8C93"/><path d="M${x+6},${y-4} q-9,-8 -17,0 q8,8 17,0 l5,-4 v8z" fill="${SUN}" stroke="${INK}" stroke-width="1"/>`}
  // place names
  o+=`<text class="mp-l halo" x="${PX(5.0)}" y="${PY(0.56)}" style="fill:${INK}">KŌWHAI BAY</text>`;
  o+=`<text class="mp-s halo" x="${PX(F.marae.X)}" y="${PY(F.marae.Y)-12}" text-anchor="middle" style="fill:${INK}">Marae</text>`;
  o+=`<text class="mp-s halo" x="${PX(SUM[0])-12}" y="${PY(SUM[1])+2}" text-anchor="end" style="fill:${INK}">Lookout Hill</text>`;
  o+=`<text class="mp-s halo" x="${PX(F.fishing.X)}" y="${PY(F.fishing.Y)-12}" text-anchor="middle" style="fill:${INK}">Fishing rocks</text>`;
  o+=`<text class="mp-s halo" x="${PX(2.55)}" y="${PY(0.82)}" style="fill:${TRAIL}">MTB trail</text>`;
  o+=`<text class="mp-s" x="${PX(7.2)}" y="${PY(1.4)}" text-anchor="middle" style="fill:#3E7FA0;font-style:italic">Te Moana</text><text class="mp-s" x="${PX(7.2)}" y="${PY(1.4)+14}" text-anchor="middle" style="fill:#3E7FA0;font-style:italic">(the sea)</text>`;
  return o}
const STATIC=staticMap();
function gridLines(strong){let o="";const op=strong?.55:.28;
  for(let i=0;i<=GW;i++)o+=`<line x1="${PX(i)}" x2="${PX(i)}" y1="${MY}" y2="${MY+GH*K}" stroke="${INK}" stroke-opacity="${op}" stroke-width="${strong?1:.8}"/>`;
  for(let j=0;j<=GH;j++)o+=`<line x1="${MX}" x2="${MX+GW*K}" y1="${PY(j)}" y2="${PY(j)}" stroke="${INK}" stroke-opacity="${op}" stroke-width="${strong?1:.8}"/>`;
  for(let i=0;i<GW;i++)o+=`<text class="mp-l halo" x="${PX(i)+3}" y="${MY+15}" style="fill:${INK}">${20+i}</text>`;
  for(let j=1;j<=GH;j++)if(j<GH)o+=`<text class="mp-l halo" x="${MX+3}" y="${PY(j)-4}" style="fill:${INK}">${40+j}</text>`;
  o+=`<text class="mp-l halo" x="${MX+3}" y="${PY(0)-4}" style="fill:${INK}">40</text>`;
  return o+`<rect x="${MX}" y="${MY}" width="${GW*K}" height="${GH*K}" fill="none" stroke="${INK}" stroke-width="1.5"/>`}
function sidePanel(hiDir){let o="";const cx=728,cy=72,r=36;
  // the key: a frosted peach card beside the map, the compass rose in a steel bezel on it
  o+=FG.acrylic(672,8,122,404,{tint:TINT,d:4,r:10,balls:false,shadow:false,opacity:.2});
  o+=bezel(cx,cy,r+1)+`<circle cx="${cx}" cy="${cy}" r="${r+1}" fill="#fff"/>`;
  P8s.forEach((n,i)=>{const a=i*Math.PI/4,big=i%2===0,L=big?r:r*.62,hi=hiDir===i;o+=`<path d="M${cx},${cy} L${cx+Math.sin(a+.16)*7},${cy-Math.cos(a+.16)*7} L${cx+Math.sin(a)*L},${cy-Math.cos(a)*L} L${cx+Math.sin(a-.16)*7},${cy-Math.cos(a-.16)*7}Z" fill="${hi?PINK:big?INK:"#B9A9B0"}"/>`;
    if(big)o+=`<text class="mp-l" x="${cx+Math.sin(a)*(r+16)}" y="${cy-Math.cos(a)*(r+16)+4.5}" text-anchor="middle" style="fill:${hi?PINK:INK}">${n}</text>`});
  o+=`<rect class="mp-desk" x="680" y="140" width="96" height="1" fill="none"/>`;
  // scale bar
  o+=`<text class="mp-s" x="728" y="160" text-anchor="middle" style="fill:${ROSE}"><tspan class="mp-desk">SCALE </tspan>1:25 000</text>`;
  o+=`<rect x="688" y="168" width="40" height="7" fill="${INK}"/><rect x="728" y="168" width="40" height="7" fill="#fff" stroke="${INK}"/><text class="mp-s" x="688" y="190" text-anchor="middle" style="fill:${INK}">0</text><text class="mp-s" x="768" y="190" text-anchor="middle" style="fill:${INK}">1 km</text>`;
  // legend
  const L=[["road",`<path d="M674,0 h22" stroke="${ROAD}" stroke-width="3.2"/>`,"Road"],["trail",`<path d="M674,0 h22" stroke="${TRAIL}" stroke-width="2.2" stroke-dasharray="6 4"/>`,"MTB trail"],
    ["river",`<path d="M674,0 h22" stroke="${RIVER}" stroke-width="3"/>`,"Stream"],["c",`<path d="M674,0 h22" stroke="#B9876D" stroke-width="1.4"/>`,"Contour"],["b",`<circle cx="685" cy="0" r="4" fill="${BUSH}"/>`,"Bush"],["t",`<rect x="682" y="-3" width="5" height="5" fill="${INK}"/><rect x="689" y="-2" width="4" height="4" fill="${INK}"/>`,"Buildings"]];
  L.forEach((l,i)=>{const y=222+i*27;o+=`<g transform="translate(0,${y})">${l[1]}<text class="mp-s" x="702" y="4" style="fill:${INK}">${l[2]}</text></g>`});
  o+=`<text class="mp-s mp-desk" x="674" y="392" style="fill:${ROSE}">CONTOURS 50 m</text><text class="mp-s mp-desk" x="674" y="407" style="fill:${ROSE}">MADE-UP PLACE</text>`;
  return o}
function tag(txt,w,col=INK,y=360){return `<rect x="26" y="${y}" width="${w}" height="38" rx="13" fill="#fff" fill-opacity=".96" stroke="${PAL.pill.line}" stroke-width="1.2"/><text class="mp-t" x="40" y="${y+25}" style="fill:${col}">${txt}</text>`}
const tagW=(t)=>Math.max(160,t.length*8.6+28);
const tagWp=(t)=>Math.max(160,t.length*13.3+28);
function tagR(t,col){// one size for desktop, one for phones
  return `<g class="mp-desk">${tag(t,tagW(t),col)}</g><g class="mp-phone">${tag(t,Math.min(630,tagWp(t)),col)}</g>`}
function pinSVG(p,prog,col=PINK){const x=PX(p.X),y=PY(p.Y);const e=prog>=1?1:(t=>{const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d)return n*(t-=1.5/d)*t+.75;if(t<2.5/d)return n*(t-=2.25/d)*t+.9375;return n*(t-=2.625/d)*t+.984375})(prog);
  const dy=-(1-e)*90;return `<ellipse cx="${x+4*e}" cy="${y+2}" rx="${4+5*e}" ry="${1.6+1.6*e}" fill="${PAL.shadow}" opacity="${.12+.2*e}" transform="rotate(14 ${x} ${y})"/><g transform="translate(${x},${y+dy})"><path d="M0,0 C-3,-8 -11,-13 -11,-21 a11,11 0 1 1 22,0 C11,-13 3,-8 0,0Z" fill="${col}" stroke="${INK}" stroke-width="1.4"/><circle cx="0" cy="-21" r="4.2" fill="#fff"/></g>`}
// ---------- topographic views
function topoView(v){let o=STATIC+gridLines(v==="grid");
  const B=curB();o+=sidePanel(v==="compass"&&B!=null?Math.round(B/45)%8:-1);
  if(v==="compass"){const a=F[s.from],b=target();
    if(s.to==="pin")o+=pinSVG(s.pin,s.pinP);
    if(B!=null){o+=`<line x1="${PX(a.X)}" y1="${PY(a.Y)}" x2="${PX(b.X)}" y2="${PY(b.Y)}" stroke="${INK}" stroke-width="2" stroke-dasharray="5 5"/>`;
      if(s.to!=="pin")o+=`<circle cx="${PX(b.X)}" cy="${PY(b.Y)}" r="15" fill="none" stroke="${PINK}" stroke-width="3"/>`}
    // compass rose at the starting point, needle swings to the target
    const cx=PX(a.X),cy=PY(a.Y),r=44;o+=bezel(cx,cy,r)+`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" fill-opacity=".97" stroke="${PAL.steelDark}" stroke-width="1"/>`;
    for(let i=0;i<16;i++){const an=i*Math.PI/8,L=i%4===0?9:i%2===0?6:3;o+=`<line x1="${cx+Math.sin(an)*(r-L)}" y1="${cy-Math.cos(an)*(r-L)}" x2="${cx+Math.sin(an)*r}" y2="${cy-Math.cos(an)*r}" stroke="${INK}" stroke-width="${i%4?1:1.6}"/>`}
    ["N","E","S","W"].forEach((n,i)=>o+=`<text class="mp-l" x="${cx+Math.sin(i*Math.PI/2)*(r-17)}" y="${cy-Math.cos(i*Math.PI/2)*(r-17)+4.5}" text-anchor="middle" style="fill:${i?INK:PINK}">${n}</text>`);
    if(B!=null){const ang=s.needle*Math.PI/180,ar=26;o+=`<path d="M${cx},${cy-ar} A${ar},${ar} 0 ${s.needle>180?1:0} 1 ${cx+Math.sin(ang)*ar},${cy-Math.cos(ang)*ar}" fill="none" stroke="${MINT}" stroke-width="4" stroke-opacity=".75"/>`;
      o+=`<g transform="rotate(${s.needle.toFixed(1)} ${cx} ${cy})"><path d="M${cx},${cy-r+4} l6,${r-6} h-12z" fill="${PINK}" stroke="${INK}" stroke-width="1"/><path d="M${cx},${cy+r-12} l5,${-(r-14)} h-10z" fill="#CFC3C8"/></g><circle cx="${cx}" cy="${cy}" r="4" fill="${INK}"/>`;
      const D=Math.hypot(b.X-a.X,b.Y-a.Y),t=`${dir8(B).toUpperCase()} · ${b3(B)} · ${fmt(D,1)} km`;o+=tagR(t)}
    else o+=tagR("Pick two different places")}
  if(v==="grid"){const p=s.pin,i=Math.floor(p.X),j=Math.floor(p.Y);
    o+=`<rect x="${PX(i)}" y="${PY(j+1)}" width="${K}" height="${K}" fill="${SUN}" fill-opacity=".28" stroke="${SUN}" stroke-width="3"/>`;
    for(let k=1;k<10;k++)o+=`<line x1="${PX(i+k/10)}" x2="${PX(i+k/10)}" y1="${PY(j)}" y2="${PY(j)-(k===5?9:5)}" stroke="${INK}"/><line x1="${PX(i)}" x2="${PX(i)+(k===5?9:5)}" y1="${PY(j+k/10)}" y2="${PY(j+k/10)}" stroke="${INK}"/>`;
    if(s.pinP>=1)o+=`<path d="M${PX(p.X)},${PY(p.Y)} V${PY(j)} M${PX(p.X)},${PY(p.Y)} H${PX(i)}" stroke="${INK}" stroke-width="1.4" stroke-dasharray="3 3"/>`;
    o+=pinSVG(p,s.pinP);o+=tagR(`4-figure ${grid4(p)} · 6-figure ${grid6(p)}`)}
  if(v==="scale"){const at=trailAt(Math.min(s.trail,TRL)),done=TR.slice(0,at[2]).concat([[at[0],at[1]]]);
    o+=`<path d="${d(TR)}" fill="none" stroke="${TRAIL}" stroke-width="5" stroke-opacity=".25" stroke-linecap="round"/><path d="${d(done)}" fill="none" stroke="${TRAIL}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    const st0=TR[0];o+=`<line x1="${PX(st0[0])}" y1="${PY(st0[1])}" x2="${PX(at[0])}" y2="${PY(at[1])}" stroke="${INK}" stroke-width="1.6" stroke-dasharray="4 4"/>`;
    o+=`<circle cx="${PX(st0[0])}" cy="${PY(st0[1])}" r="9" fill="#fff" stroke="${INK}" stroke-width="1.5"/><text class="mp-l" x="${PX(st0[0])}" y="${PY(st0[1])+4.5}" text-anchor="middle" style="fill:${INK}">P</text>`;
    // the rider
    const x=PX(at[0]),y=PY(at[1]),bob=Math.sin(s.trail*40)*1.2;o+=`<g transform="translate(${x},${y-12+bob})"><circle cx="-6" cy="8" r="5" fill="#fff" stroke="${INK}" stroke-width="1.6"/><circle cx="6" cy="8" r="5" fill="#fff" stroke="${INK}" stroke-width="1.6"/><path d="M-6,8 L-1,0 L6,8 M-1,0 h6" stroke="${INK}" stroke-width="1.6" fill="none"/><circle cx="1" cy="-9" r="4.5" fill="#F2D0B4" stroke="#B88A6A" stroke-width="1.2"/><path d="M1,-5 L0,1" stroke="${PINK}" stroke-width="3.8" stroke-linecap="round"/></g>`;
    const sl=Math.hypot(at[0]-st0[0],at[1]-st0[1]);o+=tagR(`Trail ${fmt(Math.min(s.trail,TRL),2)} km · straight ${fmt(sl,2)} km`)}
  if(v==="contour"){const A=s.A,Bp=s.B;o+=`<line x1="${PX(A.X)}" y1="${PY(A.Y)}" x2="${PX(Bp.X)}" y2="${PY(Bp.Y)}" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".8"/><line x1="${PX(A.X)}" y1="${PY(A.Y)}" x2="${PX(Bp.X)}" y2="${PY(Bp.Y)}" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
    // the drawing pen moves along the line as the cross-section draws
    if(s.secP<1){const t=s.secP;o+=`<circle cx="${PX(A.X+(Bp.X-A.X)*t)}" cy="${PY(A.Y+(Bp.Y-A.Y)*t)}" r="6" fill="${SUN}" stroke="${INK}"/>`}
    const hA=gH(A.X,A.Y),hB=gH(Bp.X,Bp.Y);o+=tagR(`A ${hA<=0?"sea":Math.round(hA)+" m"} → B ${hB<=0?"sea":Math.round(hB)+" m"} · drag A or B`);
    [["A",A],["B",Bp]].forEach(([n,p])=>o+=`<circle cx="${PX(p.X)}" cy="${PY(p.Y)}" r="13" fill="${n==="A"?PAL.product.lime:PAL.product.strawberry}" stroke="${INK}" stroke-width="1.6"/><circle cx="${PX(p.X)-4}" cy="${PY(p.Y)-5}" r="3" fill="#fff" opacity=".55"/><text class="mp-l" x="${PX(p.X)}" y="${PY(p.Y)+4.5}" text-anchor="middle" style="fill:${INK}">${n}</text>`)}
  return o}
// ---------- Aotearoa: latitude and longitude
function nzView(){let o=FG.floor(800,420)+tray(NZx(166)-7,NZy(34)-6,NZx(179)-NZx(166)+14,NZy(47.6)-NZy(34)+12)+`<rect x="${NZx(166)}" y="${NZy(34)}" width="${NZx(179)-NZx(166)}" height="${NZy(47.6)-NZy(34)}" fill="${SEA}" rx="6"/>`;
  for(let la=34;la<=47;la++)o+=`<line x1="${NZx(166)}" x2="${NZx(179)}" y1="${NZy(la)}" y2="${NZy(la)}" stroke="#fff" stroke-width="${la%2?0.8:1.4}"/>`;
  for(let lo=166;lo<=179;lo++)o+=`<line y1="${NZy(34)}" y2="${NZy(47.6)}" x1="${NZx(lo)}" x2="${NZx(lo)}" stroke="#fff" stroke-width="${lo%2?0.8:1.4}"/>`;
  const poly=P=>`<path d="${cr(P.concat([P[0]]),6).map((p,i)=>(i?"L":"M")+NZx(p[0]).toFixed(1)+","+NZy(p[1]).toFixed(1)).join("")}Z" fill="#E3EDCF" stroke="#7DB5CC" stroke-width="1.3" stroke-linejoin="round"/>`;
  o+=poly(NI)+poly(SI)+poly(RK);
  for(let la=36;la<=46;la+=2)o+=`<text class="mp-s halo" x="${NZx(166)+4}" y="${NZy(la)-3}" style="fill:${INK}">${la}°S</text>`;
  for(let lo=168;lo<=178;lo+=2)o+=`<text class="mp-s" x="${NZx(lo)}" y="${NZy(47.6)+14}" text-anchor="middle" style="fill:${INK}">${lo}</text>`;
  o+=`<text class="mp-s" x="${NZx(179)+4}" y="${NZy(47.6)+14}" style="fill:${ROSE}">°E</text>`;
  o+=`<text class="mp-s" x="${NZx(166)+4}" y="${NZy(34)+14}" style="fill:${ROSE}">N ↑</text>`;
  Object.entries(CITIES).forEach(([k,c])=>{const x=NZx(c.lon),y=NZy(c.lat);o+=`<circle cx="${x}" cy="${y}" r="4" fill="${INK}"/><g class="mp-desk"><text class="mp-s halo" x="${x+8}" y="${y-2}" style="fill:${INK}">${c.n}</text><text class="mp-s halo" x="${x+8}" y="${y+12}" style="fill:${ROSE}">${c.e}</text></g><text class="mp-s halo mp-phone" x="${x+8}" y="${y+5}" style="fill:${INK}">${c.e}</text>`});
  // crosshair
  const cx=NZx(s.lon),cy=NZy(s.lat);o+=`<line x1="${NZx(166)}" x2="${NZx(179)}" y1="${cy}" y2="${cy}" stroke="${PINK}" stroke-width="2"/><line x1="${cx}" x2="${cx}" y1="${NZy(34)}" y2="${NZy(47.6)}" stroke="${LILAC}" stroke-width="2"/>`;
  o+=`<rect x="${NZx(166)}" y="${cy-9}" width="5" height="18" fill="${PINK}"/><rect x="${cx-9}" y="${NZy(47.6)-5}" width="18" height="5" fill="${LILAC}"/>`;
  o+=pinNZ(cx,cy,s.cpin);
  // reading panel
  const x0=372;const near=Object.values(CITIES).map(c=>({c,k:kmBetween(c,s)})).sort((a,b)=>a.k-b.k)[0];
  o+=`<text class="mp-s" x="${x0}" y="44" style="fill:${ROSE}">THE CROSSHAIR IS AT</text><text class="mp-b" x="${x0}" y="80" style="fill:${INK}">${fmt(s.lat,2)}° S, ${fmt(s.lon,2)}° E</text>`;
  o+=`<text class="mp-t" x="${x0}" y="108" style="fill:${ROSE}">${dms(s.lat)}S  ${dms(s.lon)}E</text>`;
  o+=`<rect x="${x0}" y="130" width="10" height="10" fill="${PINK}"/><text class="mp-l" x="${x0+18}" y="140" style="fill:${INK}">LATITUDE ${fmt(s.lat,2)}° S</text>`;
  o+=`<text class="mp-m" x="${x0+18}" y="162" style="fill:#654A4E">How far south of the equator.</text><text class="mp-m mp-desk" x="${x0+18}" y="180" style="fill:#654A4E">Lines of latitude run east–west.</text>`;
  o+=`<rect x="${x0}" y="204" width="10" height="10" fill="${LILAC}"/><text class="mp-l" x="${x0+18}" y="214" style="fill:${INK}">LONGITUDE ${fmt(s.lon,2)}° E</text>`;
  o+=`<text class="mp-m" x="${x0+18}" y="236" style="fill:#654A4E">How far east of Greenwich, London.</text><text class="mp-m mp-desk" x="${x0+18}" y="254" style="fill:#654A4E">Lines of longitude run north–south.</text>`;
  o+=FG.box(x0,282,400,near.k<25?96:70,{colour:"#FFFFFF",kind:"plastic",d:8,r:10,stroke:PAL.pill.line,shadowLen:40});
  if(near.k<25)o+=`<text class="mp-l" x="${x0+14}" y="306" style="fill:${ROSE}">YOU'RE ON</text><text class="mp-b" x="${x0+14}" y="338" style="fill:${INK}">${near.c.n}</text><text class="mp-t" x="${x0+14}" y="362" style="fill:${INK}">${near.c.e}</text>`;
  else o+=`<text class="mp-l" x="${x0+14}" y="306" style="fill:${ROSE}">NEAREST CITY ON THIS MAP</text><text class="mp-t" x="${x0+14}" y="334" style="fill:${INK}">${near.c.e} · ${fmt(near.k)} km away</text>`;
  o+=`<text class="mp-s mp-desk" x="${x0}" y="404" style="fill:${ROSE}">SIMPLIFIED COASTLINE · CITY CENTRES ROUNDED TO 0.01°</text>`;
  return o}
function pinNZ(x,y,prog){const e=prog>=1?1:1-Math.pow(1-prog,3)*Math.cos(prog*6);const dy=-(1-Math.min(1,e))*70;
  return `<ellipse cx="${x+4}" cy="${y+2}" rx="9" ry="2.6" fill="${PAL.shadow}" opacity=".28" transform="rotate(14 ${x} ${y})"/><g transform="translate(${x},${y+dy})"><path d="M0,0 C-3,-8 -10,-12 -10,-19 a10,10 0 1 1 20,0 C10,-12 3,-8 0,0Z" fill="${SUN}" stroke="${INK}" stroke-width="1.4"/><circle cx="0" cy="-19" r="3.8" fill="#fff"/></g>`}
// ---------- climate graph
const CG={x0:78,x1:600,y0:360,y1:44,rmax:160,tmax:25};
const cgx=i=>CG.x0+(i+.5)*(CG.x1-CG.x0)/12,cgr=r=>CG.y0-r/CG.rmax*(CG.y0-CG.y1),cgt=t=>CG.y0-t/CG.tmax*(CG.y0-CG.y1);
function climateView(){let o=FG.floor(800,420)+FG.acrylic(8,6,656,404,{tint:TINT,d:8,r:14,balls:false,shadowLen:50,opacity:.2})+`<rect x="${CG.x0}" y="${CG.y1}" width="${CG.x1-CG.x0}" height="${CG.y0-CG.y1}" fill="#fff" fill-opacity=".7"/>`;const bw=(CG.x1-CG.x0)/12*.62,m=s.month;
  for(let r=0;r<=160;r+=40)o+=`<line x1="${CG.x0}" x2="${CG.x1}" y1="${cgr(r)}" y2="${cgr(r)}" stroke="${INK}" stroke-opacity=".1"/><text class="mp-s" x="${CG.x0-8}" y="${cgr(r)+4}" text-anchor="end" style="fill:#3E7FA0">${r}</text>`;
  for(let t=0;t<=25;t+=5)o+=`<text class="mp-s" x="${CG.x1+8}" y="${cgt(t)+4}" style="fill:#B4456F">${t}</text>`;
  o+=`<text class="mp-l" x="${CG.x0-8}" y="26" text-anchor="end" style="fill:#3E7FA0">RAIN mm</text><text class="mp-l" x="${CG.x1+8}" y="26" style="fill:#B4456F">TEMP °C</text>`;
  RAIN.forEach((r,i)=>{const x=cgx(i);o+=`<rect x="${x-bw/2}" y="${cgr(r)}" width="${bw}" height="${CG.y0-cgr(r)}" rx="4" fill="${i===m?PAL.product.blueberry:"#C9DCF6"}" stroke="${i===m?INK:"#8FB2DE"}" stroke-width="${i===m?1.6:1}"/>`;
    o+=`<text class="mp-s" x="${x}" y="${CG.y0+18}" text-anchor="middle" style="fill:${i===m?INK:ROSE};font-weight:${i===m?700:500}">${MON[i][0]}<tspan class="mp-desk">${MON[i].slice(1)}</tspan></text>`});
  o+=`<line x1="${CG.x0}" x2="${CG.x1}" y1="${CG.y0}" y2="${CG.y0}" stroke="${INK}"/><line x1="${CG.x0}" x2="${CG.x0}" y1="${CG.y0}" y2="${CG.y1}" stroke="#3E7FA0"/><line x1="${CG.x1}" x2="${CG.x1}" y1="${CG.y0}" y2="${CG.y1}" stroke="#B4456F"/>`;
  o+=`<path d="${TEMP.map((t,i)=>(i?"L":"M")+cgx(i)+","+cgt(t)).join("")}" fill="none" stroke="${PINK}" stroke-width="3" stroke-linejoin="round"/>`;
  TEMP.forEach((t,i)=>o+=`<circle cx="${cgx(i)}" cy="${cgt(t)}" r="${i===m?7:4}" fill="${i===m?PINK:"#fff"}" stroke="${PINK}" stroke-width="2"/>`);
  // guides from the chosen month to each axis
  const x=cgx(m);o+=`<path d="M${x},${cgr(RAIN[m])} H${CG.x0}" stroke="#3E7FA0" stroke-dasharray="4 4"/><path d="M${x},${cgt(TEMP[m])} H${CG.x1}" stroke="#B4456F" stroke-dasharray="4 4"/>`;
  // labels: show a label box above the month
  const lx=Math.max(CG.x0+80,Math.min(CG.x1-80,x)),ly=Math.min(cgr(RAIN[m]),cgt(TEMP[m]))-58;
  o+=`<rect x="${lx-78}" y="${Math.max(4,ly)}" width="156" height="44" rx="13" fill="#fff" stroke="${PAL.pill.line}" stroke-width="1.2"/><text class="mp-l" x="${lx}" y="${Math.max(4,ly)+18}" text-anchor="middle" style="fill:#3E7FA0">${RAIN[m]} mm rain</text><text class="mp-l" x="${lx}" y="${Math.max(4,ly)+36}" text-anchor="middle" style="fill:#B4456F">${fmt(TEMP[m],1)} °C average</text>`;
  // seasons
  [["SUMMER",-0.5,1.5],["AUTUMN",1.5,4.5],["WINTER",4.5,7.5],["SPRING",7.5,10.5],["",10.5,11.5]].forEach(([n,a,b])=>{const xa=CG.x0+(a+.5)*(CG.x1-CG.x0)/12,xb=CG.x0+(b+.5)*(CG.x1-CG.x0)/12;
    o+=`<line x1="${Math.max(CG.x0,xa)+3}" x2="${xb-3}" y1="${CG.y0+30}" y2="${CG.y0+30}" stroke="${n==="WINTER"?"#3E7FA0":n===""||n==="SUMMER"?"#E39A2D":ROSE}" stroke-width="3" stroke-linecap="round"/>${n?`<text class="mp-s mp-desk" x="${(Math.max(CG.x0,xa)+xb)/2}" y="${CG.y0+46}" text-anchor="middle" style="fill:${ROSE}">${n}</text>`:""}`});
  // weather station: a white louvred screen on steel legs, a strawberry roof, a rain gauge beside it
  o+=FG.shadow(684,260,72,{len:46,opacity:.18});
  o+=FG.cyl(692,198,3,62,{colour:PAL.steel,kind:"metal",shadow:false})+FG.cyl(732,198,3,62,{colour:PAL.steel,kind:"metal",shadow:false});
  o+=FG.box(682,154,60,44,{colour:"#FFFFFF",kind:"painted",d:12,r:3,stroke:"#9AA3B5",shadow:false});
  o+=[0,1,2,3].map(i=>`<line x1="688" x2="736" y1="${162+i*9}" y2="${166+i*9}" stroke="${INK}" stroke-opacity=".35"/>`).join("");
  o+=`<path d="M676,154 l36,-16 l36,16z" fill="${PAL.product.strawberry}" stroke="#B8506E" stroke-width="1.2" stroke-linejoin="round"/><path d="M712,138 l12,-6.6 l36,16 l-12,6.6z" fill="#C95A79" stroke="#B8506E" stroke-width="1.2" stroke-linejoin="round"/>`;
  o+=FG.cyl(767,222,9,38,{colour:PAL.product.blueberry,kind:"painted",shadowLen:22});
  o+=`<text class="mp-l" x="712" y="296" text-anchor="middle" style="fill:${INK}">KŌWHAI BAY</text><text class="mp-s" x="712" y="314" text-anchor="middle" style="fill:${ROSE}">EXAMPLE DATA</text><text class="mp-s mp-desk" x="712" y="330" text-anchor="middle" style="fill:${ROSE}">(A MADE-UP TOWN)</text>`;
  o+=`<text class="mp-s mp-desk" x="716" y="364" text-anchor="middle" style="fill:${ROSE}">Total ${RTOT} mm a year</text>`;
  return o}
// ---------- close-ups
function compassPanel(){const B=curB(),cx=118,cy=132,r=96;let o=FG.floor(420,260)+bezel(cx,cy,r)+`<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--paper)" stroke="${PAL.steelDark}" stroke-width="1.2"/>`;
  for(let i=0;i<36;i++){const a=i*Math.PI/18;o+=`<line x1="${cx+Math.sin(a)*(r-(i%9===0?12:i%3===0?8:4))}" y1="${cy-Math.cos(a)*(r-(i%9===0?12:i%3===0?8:4))}" x2="${cx+Math.sin(a)*r}" y2="${cy-Math.cos(a)*r}" stroke="var(--ink)"/>`}
  P8s.forEach((n,i)=>{const a=i*Math.PI/4,hi=B!=null&&Math.round(B/45)%8===i;o+=`<text class="t-ink" x="${cx+Math.sin(a)*(r-26)}" y="${cy-Math.cos(a)*(r-26)+4}" text-anchor="middle" style="font-weight:${hi?700:400};fill:${hi?PINK:"var(--ink)"}">${n}</text>`});
  if(B!=null){const a=s.needle*Math.PI/180;o+=`<path d="M${cx},${cy-r+14} A${r-14},${r-14} 0 ${s.needle>180?1:0} 1 ${cx+Math.sin(a)*(r-14)},${cy-Math.cos(a)*(r-14)}" fill="none" stroke="${MINT}" stroke-width="5" stroke-opacity=".6"/>`;
    o+=`<line x1="${cx}" y1="${cy}" x2="${cx+Math.sin(a)*(r-36)}" y2="${cy-Math.cos(a)*(r-36)}" stroke="${PINK}" stroke-width="4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="5" fill="var(--ink)"/>`}
  const a=F[s.from],b=target();o+=`<text class="t-lab" x="236" y="40">BEARING = DEGREES CLOCKWISE</text><text class="t-lab" x="236" y="54">FROM NORTH, 3 FIGURES</text>`;
  if(B!=null){o+=`<text class="t-big" x="236" y="88">${b3(B)}</text><text class="t-ink" x="236" y="110">${dir8(B)}</text><text class="t-body" x="236" y="140">from ${a.s} to</text><text class="t-body" x="236" y="158">${s.to==="pin"?"your pin":b.s}</text>`}
  o+=`<text class="t-lab" x="236" y="196">EACH POINT IS 45° APART</text><text class="t-ink" x="236" y="216">N 000  NE 045  E 090</text><text class="t-ink" x="236" y="234">S 180  SW 225  W 270</text>`;return o}
function gridPanel(){const p=s.pin,i=Math.floor(p.X),j=Math.floor(p.Y),fx=p.X-i,fy=p.Y-j,x0=40,y0=226,S=190;let o=FG.floor(420,260);
  // one grid square, lifted off the map as a sheet with a navy shadow
  o+=FG.shadow(x0,y0,S,{len:40,opacity:.16})+`<rect x="${x0}" y="${y0-S}" width="${S}" height="${S}" fill="#fff"/>`;
  o+=`<rect x="${x0}" y="${y0-S}" width="${S}" height="${S}" fill="${SUN}" fill-opacity=".2" stroke="var(--ink)" stroke-width="1.5"/>`;
  for(let k=1;k<10;k++)o+=`<line x1="${x0+k*S/10}" x2="${x0+k*S/10}" y1="${y0}" y2="${y0-S}" stroke="var(--ink)" stroke-opacity="${k===5?.35:.15}"/><line y1="${y0-k*S/10}" y2="${y0-k*S/10}" x1="${x0}" x2="${x0+S}" stroke="var(--ink)" stroke-opacity="${k===5?.35:.15}"/>`;
  const px=x0+fx*S,py=y0-fy*S,te=Math.floor(fx*10),tn=Math.floor(fy*10);
  o+=`<path d="M${x0},${y0+10} H${px}" stroke="${MINT}" stroke-width="4" marker-end=""/><path d="M${px},${y0+10} l-7,-5 v10z" fill="${MINT}"/>`;
  o+=`<path d="M${px},${y0} V${py}" stroke="${PINK}" stroke-width="4"/><path d="M${px},${py} l-5,7 h10z" fill="${PINK}"/>`;
  o+=`<circle cx="${px}" cy="${py}" r="7" fill="${PINK}" stroke="var(--ink)" stroke-width="1.5"/>`;
  o+=`<text class="t-ink" x="${x0}" y="${y0+28}" text-anchor="middle">${20+i}</text><text class="t-ink" x="${x0+S}" y="${y0+28}" text-anchor="middle">${21+i}</text><text class="t-ink" x="${x0-6}" y="${y0+4}" text-anchor="end">${40+j}</text><text class="t-ink" x="${x0-6}" y="${y0-S+4}" text-anchor="end">${41+j}</text>`;
  const X=260;o+=`<text class="t-lab" x="${X}" y="34">1 · ALONG THE CORRIDOR</text><text class="t-ink" x="${X}" y="54">Easting ${20+i} + ${te} tenths</text><text class="t-big" x="${X}" y="76" style="fill:${MINT}">${20+i}${te}</text>`;
  o+=`<text class="t-lab" x="${X}" y="108">2 · UP THE STAIRS</text><text class="t-ink" x="${X}" y="128">Northing ${40+j} + ${tn} tenths</text><text class="t-big" x="${X}" y="150" style="fill:${PINK}">${40+j}${tn}</text>`;
  o+=`<text class="t-lab" x="${X}" y="184">SIX-FIGURE</text><text class="t-big" x="${X}" y="206">${grid6(p)}</text><text class="t-lab" x="${X}" y="232">FOUR-FIGURE (THE SQUARE)</text><text class="t-big" x="${X}" y="252">${grid4(p)}</text>`;return o}
function scalePanel(){const d0=Math.min(s.trail,TRL),at=trailAt(d0),sl=Math.hypot(at[0]-TR[0][0],at[1]-TR[0][1]);const X0=20,S=380/Math.max(6,Math.ceil(TRL));let o=FG.floor(420,260);
  o+=`<text class="t-lab" x="${X0}" y="26">THE STRING, PULLED STRAIGHT</text>`;
  o+=`<rect x="${X0}" y="36" width="${d0*S}" height="16" rx="8" fill="${TRAIL}"/><rect x="${X0}" y="36" width="${TRL*S}" height="16" rx="8" fill="none" stroke="${TRAIL}" stroke-dasharray="4 3"/>`;
  o+=`<text class="t-lab" x="${X0}" y="74">THE RULER, STRAIGHT LINE</text>`+(sl*S>1?FG.box(X0,84,sl*S,16,{colour:PAL.steel,kind:"metal",d:6,r:2,shadow:false}):"");
  for(let k=0;k<=Math.max(6,Math.ceil(TRL));k++)o+=`<line x1="${X0+k*S}" x2="${X0+k*S}" y1="112" y2="${k%1?118:122}" stroke="var(--ink)"/><text class="t-lab" x="${X0+k*S}" y="136" text-anchor="middle">${k}</text>`;
  o+=`<line x1="${X0}" x2="${X0+Math.max(6,Math.ceil(TRL))*S}" y1="112" y2="112" stroke="var(--ink)"/><text class="t-lab" x="400" y="150" text-anchor="end">KILOMETRES</text>`;
  const cm=Math.round(d0*40)/10;o+=`<text class="t-lab" x="${X0}" y="178">ON THE PAPER MAP (1:25 000)</text><text class="t-ink" x="${X0}" y="198">1 cm on the map = 25 000 cm = 250 m</text>`;
  o+=`<text class="t-ink" x="${X0}" y="218">String: ${fmt(cm,1)} cm × 250 m = ${fmt(cm*250)} m</text><text class="t-big" x="${X0}" y="244">≈ ${fmt(cm*0.25,2)} km along the trail</text>`;return o}
function profile(){const A=s.A,B=s.B,n=160,L=Math.hypot(B.X-A.X,B.Y-A.Y),P=[];for(let i=0;i<=n;i++){const t=i/n,X=A.X+(B.X-A.X)*t,Y=A.Y+(B.Y-A.Y)*t;P.push({t,X,Y,h:gH(X,Y),r:dRiver(X,Y)})}return{P,L}}
function steepest(P,L){let best=0,bi=0;const w=Math.max(2,Math.round(0.15/(L/(P.length-1))));for(let i=0;i+w<P.length;i++){if(P[i].h<=0||P[i+w].h<=0)continue;const g=Math.abs(P[i+w].h-P[i].h)/((w/(P.length-1))*L*1000);if(g>best){best=g;bi=i}}return{g:best,i:bi,w}}
function contourPanel(){const{P,L}=profile(),x0=46,x1=404,y0=206,y1=34,hm=450,X=t=>x0+t*(x1-x0),Y=h=>y0-Math.max(0,h)/hm*(y0-y1);let o=FG.floor(420,260)+`<rect x="${x0}" y="${y1-8}" width="${x1-x0}" height="${y0-y1+8}" fill="#fff" fill-opacity=".75"/>`;
  for(let h=0;h<=400;h+=100)o+=`<line x1="${x0}" x2="${x1}" y1="${Y(h)}" y2="${Y(h)}" stroke="var(--ink)" stroke-opacity="${h?.12:.5}"/><text class="t-lab" x="${x0-6}" y="${Y(h)+4}" text-anchor="end">${h}</text>`;
  o+=`<text class="t-lab" x="${x0-6}" y="22" text-anchor="end">m</text>`;
  const k=Math.max(1,Math.round(P.length*Math.min(1,s.secP))),Q=P.slice(0,k);
  // sea
  let sea="";P.forEach((p,i)=>{if(p.h<=0&&i<k)sea+=`<rect x="${X(p.t)-1.2}" y="${Y(0)}" width="2.6" height="${Math.min(14,-p.h*0.6)+2}" fill="${SEA}"/>`});o+=sea;
  o+=`<path d="M${X(0)},${y0} ${Q.map(p=>"L"+X(p.t).toFixed(1)+","+Y(p.h).toFixed(1)).join(" ")} L${X(Q[Q.length-1].t)},${y0}Z" fill="${PAL.product.lime}" fill-opacity=".38"/><path d="${Q.map((p,i)=>(i?"L":"M")+X(p.t).toFixed(1)+","+Y(p.h).toFixed(1)).join("")}" fill="none" stroke="var(--ink)" stroke-width="2.2"/>`;
  if(s.secP>=1){const S=steepest(P,L);if(S.g>0){const a=P[S.i],b=P[S.i+S.w];const down=b.h<a.h,mx=X((a.t+b.t)/2),my=(Y(a.h)+Y(b.h))/2,lx=down?Math.min(mx+12,x1-70):Math.max(mx-12,x0+70);o+=`<path d="M${X(a.t)},${Y(a.h)} L${X(b.t)},${Y(b.h)}" stroke="${PINK}" stroke-width="5" stroke-linecap="round"/><text class="t-lab" x="${lx}" y="${Math.max(30,my-10)}" text-anchor="${down?"start":"end"}" style="fill:${PINK}">STEEPEST</text>`}
    let lastR=-1;P.forEach((p,i)=>{if(p.r<0.04&&p.h>0&&i-lastR>8){lastR=i;o+=`<circle cx="${X(p.t)}" cy="${Y(p.h)}" r="5" fill="${RIVER}" stroke="var(--paper)" stroke-width="1.5"/><text class="t-lab" x="${X(p.t)}" y="${Y(p.h)+18}" text-anchor="middle" style="fill:${RIVER}">STREAM</text>`}})}
  o+=`<circle cx="${X(0)}" cy="${Y(P[0].h)}" r="8" fill="${PAL.product.lime}" stroke="${INK}"/><text class="t-lab" x="${X(0)}" y="${Y(P[0].h)+3.5}" text-anchor="middle" style="fill:${INK}">A</text>`;
  if(s.secP>=1)o+=`<circle cx="${X(1)}" cy="${Y(P[P.length-1].h)}" r="8" fill="${PAL.product.strawberry}" stroke="${INK}"/><text class="t-lab" x="${X(1)}" y="${Y(P[P.length-1].h)+3.5}" text-anchor="middle" style="fill:${INK}">B</text>`;
  const hi=P.reduce((a,p)=>p.h>a.h?p:a,P[0]);o+=`<text class="t-lab" x="${x0}" y="226">0 km</text><text class="t-lab" x="${x1}" y="226" text-anchor="end">${fmt(L,1)} km</text>`;
  o+=`<text class="t-ink" x="${x0}" y="250">Highest point ${Math.round(hi.h)} m · heights stretched ×${fmt((y0-y1)/hm*1000/((x1-x0)/L),0)}</text>`;return o}
function latPanel(){const cx=110,cy=130,r=96;let o=FG.floor(420,260)+`<ellipse cx="${cx+34}" cy="${cy+r-4}" rx="${r*.8}" ry="14" fill="${PAL.shadow}" opacity=".16"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${SEA}" stroke="var(--ink)" stroke-width="1.5"/>`;
  // a tilted globe: parallels as ellipses, meridians as half-ellipses
  for(let la=-60;la<=60;la+=30){const y=cy-Math.sin(la*Math.PI/180)*r*0.9,rx=Math.cos(la*Math.PI/180)*r;o+=`<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${rx*0.16}" fill="none" stroke="#fff" stroke-width="${la?1:2.5}"/>`}
  for(let lo=-60;lo<=60;lo+=30){const rx=Math.abs(Math.sin(lo*Math.PI/180))*r;o+=`<path d="M${cx},${cy-r} A${rx||0.1},${r} 0 0 ${lo<0?0:1} ${cx},${cy+r}" fill="none" stroke="#fff" stroke-width="1"/>`}
  o+=`<line x1="${cx}" y1="${cy-r}" x2="${cx}" y2="${cy+r}" stroke="${LILAC}" stroke-width="3"/><line x1="${cx-r}" y1="${cy}" x2="${cx+r}" y2="${cy}" stroke="${PINK}" stroke-width="3"/>`;
  const nzx=cx+r*0.78,nzy=cy+r*0.58;o+=`<circle cx="${nzx}" cy="${nzy}" r="6" fill="${SUN}" stroke="var(--ink)" stroke-width="1.5"/><path d="M${cx+6},${cy} Q${nzx-30},${cy+8} ${nzx-4},${nzy-8}" fill="none" stroke="var(--ink)" stroke-dasharray="3 3"/>`;
  o+=`<text class="t-lab" x="${cx}" y="${cy-r-8}" text-anchor="middle">N</text><text class="t-lab" x="${cx}" y="${cy+r+16}" text-anchor="middle">S</text>`;
  const X=226;o+=`<text class="t-lab" x="${X}" y="34" style="fill:${PINK}">EQUATOR = 0° LATITUDE</text><text class="t-body" x="${X}" y="52">Aotearoa is south of it,</text><text class="t-body" x="${X}" y="68">so latitude is °S.</text>`;
  o+=`<text class="t-lab" x="${X}" y="98" style="fill:${LILAC}">GREENWICH = 0° LONGITUDE</text><text class="t-body" x="${X}" y="116">Aotearoa is east of it,</text><text class="t-body" x="${X}" y="132">so longitude is °E.</text>`;
  const f=s.lat-Math.floor(s.lat);o+=`<text class="t-lab" x="${X}" y="164">DECIMALS TO MINUTES</text><text class="t-ink" x="${X}" y="184">${fmt(f,2)}° × 60 = ${fmt(f*60,0)}′</text><text class="t-ink" x="${X}" y="204">${fmt(s.lat,2)}° = ${dms(s.lat)}</text>`;
  o+=`<text class="t-lab" x="${X}" y="236">SAY LATITUDE FIRST</text>`;return o}
function climatePanel(){const wet=RAIN.indexOf(Math.max(...RAIN)),dry=RAIN.indexOf(Math.min(...RAIN)),hot=TEMP.indexOf(TMAX),cold=TEMP.indexOf(TMIN);let o=FG.floor(420,260);
  o+=`<text class="t-lab" x="16" y="26">DESCRIBE IT: PATTERN, NUMBERS, EXCEPTION</text>`;
  o+=`<text class="t-lab" x="16" y="54" style="fill:#B4456F">TEMPERATURE (LINE, RIGHT AXIS)</text><text class="t-ink" x="16" y="74">Warmest ${MONL[hot]} ${fmt(TMAX,1)} °C · coolest ${MONL[cold]} ${fmt(TMIN,1)} °C</text><text class="t-ink" x="16" y="94">Range ${fmt(TMAX,1)} − ${fmt(TMIN,1)} = ${fmt(TRANGE,1)} °C</text>`;
  o+=`<text class="t-lab" x="16" y="126" style="fill:#3E7FA0">RAINFALL (BARS, LEFT AXIS)</text><text class="t-ink" x="16" y="146">Wettest ${MONL[wet]} ${RAIN[wet]} mm · driest ${MONL[dry]} ${RAIN[dry]} mm</text><text class="t-ink" x="16" y="166">Total for the year: ${RTOT} mm</text>`;
  o+=`<text class="t-lab" x="16" y="198">SOUTHERN HEMISPHERE</text><text class="t-body" x="16" y="218">Summer is December to February,</text><text class="t-body" x="16" y="236">winter is June to August.</text>`;return o}
// ---------- animation (pins dropping, the needle swinging, the cross-section drawing itself)
let raf=0,lastT=0,API=null,sectorPrev=null;
function kick(){if(!raf)raf=requestAnimationFrame(frame)}
function frame(ts){raf=0;const dt=Math.min(.05,lastT?(ts-lastT)/1000:.016);lastT=ts;let busy=false;
  if(s.pinP<1){s.pinP=RM?1:Math.min(1,s.pinP+dt/.6);if(s.pinP>=1)sfx("pop");busy=true}
  if(s.cpin<1){s.cpin=RM?1:Math.min(1,s.cpin+dt/.6);if(s.cpin>=1)sfx("pop");busy=true}
  if(s.cross0){s.crossP=RM?1:Math.min(1,s.crossP+dt/.7);const e=1-Math.pow(1-s.crossP,3),c=CITIES[s.city];s.lat=s.cross0.lat+(c.lat-s.cross0.lat)*e;s.lon=s.cross0.lon+(c.lon-s.cross0.lon)*e;
    if(s.crossP>=1){s.cross0=null;s.lat=c.lat;s.lon=c.lon;s.cpin=0}busy=true}
  const B=curB(),v=viewNow();if(B!=null&&(v==="compass")){let dd=((B-s.needle+540)%360)-180;if(RM){s.needle=B;s.nv=0}else{s.nv+=(dd*55-s.nv*8)*dt;s.needle=(s.needle+s.nv*dt+360)%360;dd=((B-s.needle+540)%360)-180;
      const sec=Math.floor(s.needle/22.5);if(sectorPrev!==null&&sec!==sectorPrev)tick();sectorPrev=sec;
      if(Math.abs(dd)<.3&&Math.abs(s.nv)<3){s.needle=B;s.nv=0;sfx("ding")}else busy=true}}
  if(s.secP<1){const before=s.secP;s.secP=RM?1:Math.min(1,s.secP+dt/1.4);if(Math.floor(before*12)!==Math.floor(s.secP*12))blip(300+s.secP*500,.05,"triangle",.025);if(s.secP>=1)sfx("ding");busy=true}
  API&&API.redraw();if(busy)raf=requestAnimationFrame(frame);else lastT=0}
const viewNow=()=>{const k=API?API.step.k:"compass";return k==="test"?s.view:k==="contour"?"contour":k};
// ---------- steps
const M=F.marae,LK=F.lookout,mb=bearing(M,LK),md=Math.hypot(LK.X-M.X,LK.Y-M.Y);
const st0=TR[0],strL=Math.hypot(SUM[0]-st0[0],SUM[1]-st0[1]);
const steps=[
 {k:"compass",lab:"Which way?",cap:"The compass sits on the place you start <b>from</b>. Tap anywhere on the map to drop a pin, or pick a place, and watch the needle swing round to it.",controls:["from","to"],
  big:"<b>The big idea:</b> there are 8 compass points, 45° apart. A bearing is the angle measured clockwise from north, always written with three figures: north-east is 045°.",
  exam:`Lookout Hill summit is ${dir8(mb)} of the marae, on a bearing of ${b3(mb)} and about ${fmt(md,1)} km away. I measured the bearing clockwise from north, starting at the marae.`,
  trap:"Measuring from the wrong place. \"The summit from the marae\" means stand at the marae and look towards the summit. Swap them and the direction flips: north-east becomes south-west.",chips:["dir","bear","dist"]},
 {k:"grid",lab:"Grid references",cap:"Tap the map to drop a pin. The machine reads its four-figure reference (the square) and its six-figure reference (the exact spot, to the nearest 100 m).",controls:["pinat"],
  big:"<b>The big idea:</b> eastings first, then northings: \"along the corridor, then up the stairs\". A four-figure reference names a 1 km square; a six-figure one adds tenths to pin a point within 100 m.",
  exam:`The marae is in grid square ${grid4(M)}. Its six-figure grid reference is ${grid6(M)}: easting ${grid6(M).split(" ")[0]} (along the corridor) then northing ${grid6(M).split(" ")[1]} (up the stairs).`,
  trap:"Reading the northing first, or using the lines at the top or right of the square. Always use the easting line on the left and the northing line along the bottom of the square.",chips:["g4","g6"]},
 {k:"scale",lab:"Scale and distance",cap:"Ride the mountain-bike trail from the car park (P) to the summit. The ruler only measures straight lines; a piece of string follows every bend.",speed:1,speedLabel:"sped up",controls:["play","trail"],
  big:"<b>The big idea:</b> scale links the map to real life. On a 1:25 000 map, 1 cm stands for 25 000 cm (250 m), so 4 cm is 1 km.",
  exam:`The trail from the car park to the summit is about ${fmt(TRL,1)} km long, but the straight-line distance is only ${fmt(strL,1)} km. I laid string along the trail (${fmt(TRL*4,1)} cm on the 1:25 000 map) and multiplied by 250 m per cm.`,
  trap:"Measuring a winding road or river with a straight ruler. That gives the straight-line distance, which is always shorter. Follow the bends with string or the edge of a piece of paper.",chips:["along","straight","cm"]},
 {k:"contour",lab:"Contours and height",cap:"Contour lines join places at the same height. Drag A and B anywhere on the map, or pick a line, and the cross-section draws itself in the close-up.",controls:["sec","redraw"],
  big:"<b>The big idea:</b> close-together contours mean steep land; far-apart contours mean gentle land. A cross-section is the side view you'd see if you sliced the land along a line.",
  exam:"Contour lines join points of equal height above sea level. On the slope above the stream they are close together, so the land is steep; on the valley floor they are far apart, so it is gentle. The cross-section shows a valley, with the stream at its lowest point.",
  trap:"Thinking close contours mean high land. Close means steep. To find the height, read the numbers on the lines and count up or down in 50 m steps.",chips:["hA","hB","rise","steep"],onStep:()=>{s.secP=0;kick()}},
 {k:"latlong",lab:"Where on Earth?",cap:"Pick a city or slide the crosshair. Latitude says how far south of the equator; longitude says how far east of Greenwich.",controls:["city","lat","lon"],
  big:"<b>The big idea:</b> latitude and longitude give any place on Earth an exact address. Say latitude first, then longitude, with N/S and E/W.",
  exam:"Tāmaki Makaurau Auckland is at about 36.85°S, 174.76°E (36°51′S, 174°46′E). It is 36.85° south of the equator and 174.76° east of the prime meridian at Greenwich. Ōtautahi Christchurch, at 43.53°S, is further from the equator.",
  trap:"Swapping them. Latitude lines run across the map (east–west), but they measure how far north or south you are. And don't forget the S and E.",chips:["lat","lon","dms"]},
 {k:"climate",lab:"Climate graph",cap:"A year of weather in Kōwhai Bay. Bars show rainfall (left axis), the line shows temperature (right axis). Tap a month or slide through the year.",controls:["month"],
  big:"<b>The big idea:</b> a climate graph shows average temperature and rainfall for each month. Describe the pattern, quote numbers with units, and point out any exception.",
  exam:`Kōwhai Bay is warmest in February (${fmt(TMAX,1)} °C) and coolest in July (${fmt(TMIN,1)} °C), a temperature range of ${fmt(TRANGE,1)} °C. Rainfall is highest in winter, peaking in July at ${Math.max(...RAIN)} mm, and lowest in January (${Math.min(...RAIN)} mm). It gets about ${fmt(RTOT)} mm of rain a year.`,
  trap:"Reading temperature off the rainfall axis. Bars belong to the left axis (mm), the line to the right axis (°C). And in Aotearoa, July is the middle of winter.",chips:["mon","rain","temp","tot"]},
 {k:"test",lab:"Test yourself",cap:"Six challenges. Choose a map layer, use the controls or tap the map, then press Check.",controls:["view","from","trail","sec","lat","lon","month"],chips:["g6","dir","along","lat","lon"],
  big:"<b>Exam tip:</b> always give units and the hemisphere letters, say where you measured from, and quote numbers from the map or graph to back up what you say."}];
const viewOpts=[["compass","Compass and bearings"],["grid","Grid references"],["scale","Trail and scale"],["contour","Contours"],["latlong","Aotearoa (lat and long)"],["climate","Climate graph"]];
const dropPin=(X,Y)=>{s.pin={X,Y};s.pinP=RM?1:0;s.to="pin";sfx("whoosh");blip(1300,.32,"sine",.025,420);kick()};
// ---- kupu Māori: te reo terms for this machine, each checked in Te Aka Māori Dictionary (ta = word id). Sources and notes: te-reo-notes.md
const KUPU=[
 {mi:"raki",en:"north",ta:6446},
 {mi:"tonga",en:"south",ta:8433},
 {mi:"rāwhiti",en:"east",ta:6663},
 {mi:"uru",en:"west",ta:8912},
 {mi:"kāpehu",en:"compass",ta:2226},
 {mi:"mahere",en:"map, plan, chart",ta:3350},
 {mi:"āwhata",en:"scale (of a map)",ta:15342},
 {mi:"teitei",en:"height, altitude",ta:7895}];
Object.entries({"compass": ["raki", "tonga", "rāwhiti", "uru", "kāpehu"], "grid": ["mahere"], "scale": ["āwhata", "mahere"], "contour": ["teitei"]}).forEach(([k,a])=>{const st=steps.find(x=>x.k===k);if(st)st.kupu=a});
API=StudyKit.mount({kupu:KUPU,
  eyebrow:"Social studies and geography · Map and graph skills", title:"The map machine", crumb:"Year 9–10 social studies: compass, grid references, scale, contours, latitude and longitude, climate graphs", homeHash:"y9",
  fig:"FIG. 15 · KŌWHAI BAY, 1:25 000", railTitle:"Read any map",
  badge:{label:"Year 9 social studies",exam:"2026-11-02T08:30:00+13:00",examText:"Mon 2 Nov"},
  mainBox:"0 0 800 420", mainPhoneBig:true, mainLabel:"A made-up topographic map of a coastal valley with a stream, a marae, a town, a mountain-bike trail and fishing rocks; a map of Aotearoa; and a climate graph", closeBox:"0 0 420 260",
  state:s, steps,
  onStep:(x,stp)=>{if(stp.k!=="test")s.view=stp.k;kick()},
  controls:[{type:"play"},
    {type:"select",id:"from",label:"From",options:Object.entries(F).map(([k,f])=>[k,f.s.replace("the ","")]),get:()=>s.from,set:(x,v)=>{s.from=v;s.view="compass";sfx("whoosh");kick()}},
    {type:"select",id:"to",label:"To",options:Object.entries(F).map(([k,f])=>[k,f.s.replace("the ","")]).concat([["pin","my pin"]]),get:()=>s.to,set:(x,v)=>{s.to=v;s.view="compass";sfx("whoosh");kick()}},
    {type:"button",id:"pinat",label:"📍 Pin the marae",onClick:()=>{dropPin(M.X+0.012,M.Y+0.012);s.view="grid"}},
    {type:"range",id:"trail",label:"Along the trail",min:0,max:Math.floor(TRL*20)/20,step:0.05,get:()=>Math.min(s.trail,TRL),set:(x,v)=>{s.trail=v;s.playing=false;s.view="scale";tick()},fmt:()=>fmt(Math.min(s.trail,TRL),2)+" km"},
    {type:"select",id:"sec",label:"Cross-section",options:[["valley","Across the valley"],["lookout","Car park to summit"],["headland","Out to the headland"],["custom","My own (drag A, B)"]],get:()=>s.sec,set:(x,v)=>{if(SECS[v]){s.A={...SECS[v][0]};s.B={...SECS[v][1]}}s.sec=v;s.secP=0;s.view="contour";sfx("whoosh");kick()}},
    {type:"button",id:"redraw",label:"✏️ Draw it again",onClick:()=>{s.secP=0;sfx("whoosh");kick()}},
    {type:"select",id:"city",label:"City",options:Object.entries(CITIES).map(([k,c])=>[k,`${c.n} ${c.e}`]),get:()=>s.city,set:(x,v)=>{s.city=v;s.cross0={lat:s.lat,lon:s.lon};s.crossP=0;s.view="latlong";sfx("whoosh");kick()}},
    {type:"range",id:"lat",label:"Latitude",min:34,max:47.5,step:0.01,get:()=>s.lat,set:(x,v)=>{s.lat=v;s.cross0=null;s.view="latlong";tick()},fmt:()=>fmt(s.lat,2)+"° S"},
    {type:"range",id:"lon",label:"Longitude",min:166,max:179,step:0.01,get:()=>s.lon,set:(x,v)=>{s.lon=v;s.cross0=null;s.view="latlong";tick()},fmt:()=>fmt(s.lon,2)+"° E"},
    {type:"range",id:"month",label:"Month",min:0,max:11,step:1,get:()=>s.month,set:(x,v)=>{s.month=v;s.view="climate";tick()},fmt:()=>MONL[s.month]},
    {type:"select",id:"view",label:"Map layer",options:viewOpts,get:()=>s.view,set:(x,v)=>{s.view=v;sfx("whoosh");if(v==="contour")s.secP=0;kick()}}],
  tick:(x,dt,stp)=>{if(stp.k!=="scale")return;const b=s.trail;s.trail+=dt*0.42;if(Math.floor(b*10)!==Math.floor(s.trail*10)&&s.trail<TRL)blip(150+((Math.floor(s.trail*10)%2)*40),.05,"triangle",.03);if(s.trail>TRL+0.8){s.trail=0;sfx("ding")}},
  drawMain:(x,stp)=>{const v=stp.k==="test"?s.view:stp.k;return v==="latlong"?nzView():v==="climate"?climateView():topoView(v)},
  drawClose:(x,stp)=>{const v=stp.k==="test"?s.view:stp.k;return v==="grid"?gridPanel():v==="scale"?scalePanel():v==="contour"?contourPanel():v==="latlong"?latPanel():v==="climate"?climatePanel():compassPanel()},
  chips:()=>{const B=curB(),a=F[s.from],b=target(),d0=Math.min(s.trail,TRL),at=trailAt(d0),hA=gH(s.A.X,s.A.Y),hB=gH(s.B.X,s.B.Y),{P,L}=profile(),S=steepest(P,L);
    return{dir:["DIRECTION",B==null?"–":dir8(B),true],bear:["BEARING",B==null?"–":b3(B)],dist:["STRAIGHT LINE",B==null?"–":fmt(Math.hypot(b.X-a.X,b.Y-a.Y),2)+" km"],
      g4:["FOUR-FIGURE",grid4(s.pin)],g6:["SIX-FIGURE",grid6(s.pin),true],
      along:["ALONG THE TRAIL",fmt(d0,2)+" km",true],straight:["STRAIGHT LINE",fmt(Math.hypot(at[0]-TR[0][0],at[1]-TR[0][1]),2)+" km"],cm:["ON THE MAP",fmt(d0*4,1)+" cm"],
      hA:["A",hA<=0?"sea level":Math.round(hA)+" m"],hB:["B",hB<=0?"sea level":Math.round(hB)+" m"],rise:["B − A",String(Math.round(Math.max(0,hB))-Math.round(Math.max(0,hA))).replace("-","−")+" m",true],steep:["STEEPEST",S.g?`1 m up for every ${fmt(1/S.g,1)} m across`:"–"],
      lat:["LATITUDE",fmt(s.lat,2)+"° S",true],lon:["LONGITUDE",fmt(s.lon,2)+"° E",true],dms:["IN MINUTES",`${dms(s.lat)}S ${dms(s.lon)}E`],
      mon:["MONTH",MONL[s.month]],rain:["RAIN",RAIN[s.month]+" mm",true],temp:["TEMP",fmt(TEMP[s.month],1)+" °C",true],tot:["YEAR",RTOT+" mm"]}},
  challenges:[
    {q:"Drop a pin on the marae (Grid references layer). What's its six-figure grid reference?",check:()=>Math.hypot(s.pin.X-M.X,s.pin.Y-M.Y)<0.15,ok:()=>`Yes: the marae is at ${grid6(s.pin)}, in square ${grid4(s.pin)}.`,no:()=>`Your pin is at ${grid6(s.pin)}. The marae is the little house with the pink roof, north of the stream.`},
    {q:"Drop a pin that is south-east of Lookout Hill summit and at least 1 km from it.",check:()=>{const b=bearing(LK,s.pin);return b>=112.5&&b<157.5&&Math.hypot(s.pin.X-LK.X,s.pin.Y-LK.Y)>=1},ok:()=>`Yes: bearing ${b3(bearing(LK,s.pin))} from the summit, ${fmt(Math.hypot(s.pin.X-LK.X,s.pin.Y-LK.Y),1)} km away.`,no:()=>{const b=bearing(LK,s.pin);return `From the summit your pin is ${dir8(b)} (${b3(b)}), ${fmt(Math.hypot(s.pin.X-LK.X,s.pin.Y-LK.Y),1)} km away. South-east is between 112.5° and 157.5°. Tip: set From to summit.`}},
    {q:"Ride exactly 3.0 km along the trail (within 0.1 km).",check:()=>Math.abs(Math.min(s.trail,TRL)-3)<=0.1,ok:"Yes: 3 km along the trail. On a 1:25 000 map that's 12 cm of string.",no:()=>`You're at ${fmt(Math.min(s.trail,TRL),2)} km. Use the Along the trail slider.`},
    {q:`Drag A or B so the cross-section goes over the top of Lookout Hill (above 400 m).`,check:()=>profile().P.some(p=>p.h>400),ok:()=>`Yes: the highest point on your line is ${Math.round(Math.max(...profile().P.map(p=>p.h)))} m. The summit is inside the 400 m contour.`,no:()=>`The highest point on your line is ${Math.round(Math.max(...profile().P.map(p=>p.h)))} m. Find the ring of contours with the ▲ inside it.`},
    {q:"Set the crosshair within 0.1° of 45.87°S, 170.50°E. Which city is it?",check:()=>Math.abs(s.lat-45.87)<=0.1&&Math.abs(s.lon-170.5)<=0.1,ok:"Yes: that's Ōtepoti Dunedin, about 2.3° further south than Ōtautahi Christchurch.",no:()=>`You're at ${fmt(s.lat,2)}°S, ${fmt(s.lon,2)}°E. Latitude first: slide down to 45.87°S.`},
    {q:"Set the climate graph to Kōwhai Bay's coldest month.",check:()=>s.month===TEMP.indexOf(TMIN),ok:`Yes: July, ${fmt(TMIN,1)} °C. It's midwinter in the southern hemisphere.`,no:()=>`${MONL[s.month]} averages ${fmt(TEMP[s.month],1)} °C. Look for the lowest point on the line.`}],
  papers:[{label:"NZQA past exams: Social Studies and Geography",url:"https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/"},{label:"LINZ: NZ topographic maps",url:"https://www.linz.govt.nz/products-services/maps/new-zealand-topographic-maps"}],
  truth:"Kōwhai Bay, its marae, trail, heights and climate graph are made up for practice; the climate figures are example data, not real NIWA records. The Aotearoa coastline is simplified. City positions are rounded city-centre coordinates. Real NZ Topo50 maps are 1:50 000 with 20 m contours and use a different grid (NZTM); this map uses a simple 1:25 000 grid like many school exams. Check your school's exam topics.",
  footer:"Covers the map and graph skills used across Year 9–10 social studies and geography: direction and bearings, four- and six-figure grid references, scale and distance, contours and cross-sections, latitude and longitude, and climate graphs."
});
// ---------- taps and drags on the main picture
const svg=document.getElementById("k-main");svg.style.touchAction="pan-y";
const pt=e=>{const r=svg.getBoundingClientRect();return[(e.clientX-r.left)/r.width*800,(e.clientY-r.top)/r.height*420]};
const onMap=([x,y])=>x>=MX&&x<=MX+GW*K&&y>=MY&&y<=MY+GH*K;
const toKm=([x,y])=>({X:Math.max(0.02,Math.min(GW-0.02,(x-MX)/K)),Y:Math.max(0.02,Math.min(GH-0.02,GH-(y-MY)/K))});
let drag=null;
svg.addEventListener("pointerdown",e=>{const p=pt(e),v=viewNow();
  if(v==="climate"){if(p[0]>=CG.x0&&p[0]<=CG.x1&&p[1]<=CG.y0+24){s.month=Math.max(0,Math.min(11,Math.floor((p[0]-CG.x0)/((CG.x1-CG.x0)/12))));sfx("pop");API.redraw()}return}
  if(v==="latlong"){if(p[0]>=NZx(166)&&p[0]<=NZx(179)&&p[1]>=NZy(34)&&p[1]<=NZy(47.6)){s.lon=Math.round((166+(p[0]-40)/21.06)*100)/100;s.lat=Math.round((34+(p[1]-20)/27.9)*100)/100;s.cross0=null;s.cpin=RM?1:0;sfx("whoosh");kick()}return}
  if(!onMap(p))return;const k=toKm(p);
  if(v==="contour"){const dA=Math.hypot(PX(s.A.X)-p[0],PY(s.A.Y)-p[1]),dB=Math.hypot(PX(s.B.X)-p[0],PY(s.B.Y)-p[1]);drag=dA<dB?"A":"B";s[drag]=k;s.sec="custom";s.secP=1;svg.setPointerCapture(e.pointerId);sfx("pop");e.preventDefault();API.redraw();return}
  if(v==="scale"){let bi=0,bd=1e9;TR.forEach((q,i)=>{const dd=Math.hypot(q[0]-k.X,q[1]-k.Y);if(dd<bd){bd=dd;bi=i}});if(bd<0.4){s.trail=TRcum[bi];s.playing=false;sfx("pop");API.redraw()}return}
  dropPin(k.X,k.Y);if(v==="grid"||v==="compass")s.view=v;});
svg.addEventListener("pointermove",e=>{if(!drag)return;const p=pt(e);s[drag]=toKm(p);API.redraw()});
const end=()=>{if(drag){drag=null;s.secP=1;sfx("tick");API.redraw()}};svg.addEventListener("pointerup",end);svg.addEventListener("pointercancel",end);
kick();
})();
