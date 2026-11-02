/* l2-3d.js: shared helpers for the Level 2/3 study machines' 3D benches (algebra, gradient, quote, unseen).
   Loaded as a plain script before the machine. The machine passes its scene factory to StudyKit.mount (cfg.scene3d);
   kit.js lazy-loads kit3d.js and three.js only when WebGL is there and ?lite is not set, so the SVG drawing stays the fallback.
   What this adds on top of kit3d.js:
   - a taller bench on phones (the 3D fills the width and most of the screen height, with room left to scroll past it)
   - bigger, crisper label pills so readouts stay readable at 375 px
   - framing that fits a zone of the world to whatever shape the canvas is (portrait phone or wide desktop)
   - canvas-texture helpers for crisp printed text on cards, pages and plates
   - eased approach values that snap under prefers-reduced-motion */
(function(){
  try{document.documentElement.classList.add("l2v")}catch(e){}
  const css=`html.l2v .canvas.s3-on{height:clamp(440px,64vh,620px);min-height:0}
@media (max-width:820px){html.l2v .canvas.s3-on{height:min(124vw,66svh);min-height:380px}}
html.l2v .s3-pill{font-size:10.5px;padding:4px 11px 5px;border-color:#E3DAE6;color:#492B3E;box-shadow:0 2px 0 rgba(36,11,33,.08)}
html.l2v .s3-pill b{font-size:15px;font-family:"IBM Plex Mono",ui-monospace,monospace;font-weight:500;letter-spacing:-.01em}
html.l2v .s3-pill.big b{font-size:19px}html.l2v .s3-pill.huge b{font-size:24px}
html.l2v .s3-pill.txt b{font-family:"Instrument Sans",system-ui,sans-serif;font-weight:600}
html.l2v .s3-pill.hot{background:#240B21;color:#fff}html.l2v .s3-pill.hot small{color:rgba(255,255,255,.8)}
html.l2v .s3-pill.ok{background:#A7DEC7;border-color:#7FC4A8}html.l2v .s3-pill.warn{background:#F3A5BE;border-color:#E08AA5}html.l2v .s3-pill.sun{background:#F2DC7C;border-color:#DCC25E}
html.l2v .s3-pill.drag{background:#240B21;color:#fff;border-color:transparent}
html.l2v .s3-hint{font-size:10.5px}
.l2-hud{position:absolute;top:10px;left:50%;translate:-50% 0;display:flex;flex-direction:column;align-items:center;gap:5px;pointer-events:none;max-width:calc(100% - 20px);z-index:2}
.l2-hud:empty{display:none}
.l2-hud b{display:block;background:#240B21;color:#fff;border-radius:999px;padding:6px 16px 7px;font:500 18px/1.2 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:-.01em;white-space:nowrap;box-shadow:0 3px 0 rgba(36,11,33,.12);max-width:100%;overflow:hidden;text-overflow:ellipsis}
.l2-hud i{display:block;font:600 11px/1.2 "Instrument Sans",system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#492B3E;background:rgba(255,255,255,.92);border:1px solid #E3DAE6;border-radius:999px;padding:4px 11px;font-style:normal;white-space:nowrap}
.l2-hud b.pk{background:#B5466F}.l2-hud b.ok{background:#2A7D63}.l2-hud b.warn{background:#B5466F}.l2-hud b.sun{background:#F2DC7C;color:#240B21}
@media (max-width:820px){.l2-hud{top:8px}.l2-hud i{display:none}.l2-hud b{font-size:15px;padding:5px 12px 6px}.l2-hud i{font-size:10px}}
@media (max-width:820px){html.l2v .s3-pill{font-size:10px;padding:3px 9px 4px}html.l2v .s3-pill b{font-size:14px}html.l2v .s3-pill.big b{font-size:17px}html.l2v .s3-pill.huge b{font-size:20px}}`;
  try{const st=document.createElement("style");st.id="l2v-css";st.textContent=css;document.head.appendChild(st)}catch(e){}

  // The brand pastels and inks, shared by every Level 2 bench
  const C={paper:"#F8F4EF",ink:"#492B3E",plum:"#240B21",peach:"#F6B48E",lav:"#C7B4F0",mint:"#A7DEC7",pink:"#F3A5BE",butter:"#F2DC7C",sky:"#A9C9F2",
    deepLav:"#6A50BE",deepMint:"#2A7D63",deepPink:"#B5466F",deepSky:"#3A6FB8",deepButter:"#8A6510",deepPeach:"#B2552D",muted:"#7A6672",line:"#E3DAE6"};
  const SANS='"Instrument Sans",system-ui,sans-serif',MONO='"IBM Plex Mono",ui-monospace,monospace';

  // Framing: a zone is a centre, a box size [w,h] seen from a direction. dist is worked out from the camera's fov and the canvas aspect,
  // so the same zone fills a portrait phone and a wide desktop. Re-fits on resize unless the student has turned the view.
  function frames(S){const {THREE}=S;const Z={};let cur=null,lastAspect=0;
    function place(name){const z=Z[name];const cam=S.camera,a=Math.max(.3,cam.aspect||1),f=cam.fov*Math.PI/180,tv=Math.tan(f/2);
      const portrait=a<1;const w=(portrait&&z.pw)||z.w,h=(portrait&&z.ph)||z.h;
      const d=Math.max(h/2/tv,w/2/(tv*a))*(z.pad||1.08);const dir=new THREE.Vector3(...((portrait&&z.pdir)||z.dir)).normalize();
      const c=(portrait&&z.pc)||z.c;S.view(name,[c[0]+dir.x*d,c[1]+dir.y*d,c[2]+dir.z*d],c,{min:d*.35,max:d*2.4,dur:z.dur??1.3,arc:z.arc??.08})}
    return{add(name,o){Z[name]=o;place(name);return this},
      go(name,instant){if(!Z[name])return;cur=name;place(name);S.goView(name,instant);if(Z[name].shadow)S.setShadowBox(Z[name].shadow,Z[name].c)},
      resize(){const a=S.camera.aspect;if(cur&&Math.abs(a-lastAspect)>.02){lastAspect=a;place(cur);S.goView(cur,true)}},
      get cur(){return cur}}}

  // eased approach: x → target at rate k per second; under reduced motion it snaps
  const approach=(S,x,target,dt,k=10)=>S.REDUCED?target:x+(target-x)*(1-Math.exp(-k*dt));

  // canvas helpers for crisp text on a panel
  function rr(g,x,y,w,h,r){g.beginPath();g.roundRect?g.roundRect(x,y,w,h,r):g.rect(x,y,w,h)}
  function wrap(g,text,maxW){const words=String(text).split(/\s+/);const lines=[];let line="";for(const w of words){const t=line?line+" "+w:w;if(g.measureText(t).width>maxW&&line){lines.push(line);line=w}else line=t}if(line)lines.push(line);return lines}
  function textBlock(g,text,x,y,maxW,size,o={}){g.font=`${o.wt||500} ${size}px ${o.mono?MONO:SANS}`;g.fillStyle=o.fill||C.ink;g.textAlign=o.align||"left";g.textBaseline="alphabetic";
    const lh=size*(o.lh||1.3);const L=wrap(g,text,maxW);const max=o.maxLines||99;L.slice(0,max).forEach((l,i)=>g.fillText(i===max-1&&L.length>max?l.replace(/\s*\S*$/,"…"):l,x,y+size+i*lh));return Math.min(L.length,max)*lh}
  // a reusable little texture with one word or symbol on it (tile faces, keys)
  const texCache=new Map();
  function glyphTex(S,text,o={}){const key=text+"|"+JSON.stringify(o);if(texCache.has(key))return texCache.get(key);const {THREE}=S;
    const W=o.w||256,H=o.h||256,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
    g.clearRect(0,0,W,H);g.font=`${o.wt||600} ${o.size||110}px ${o.mono?MONO:SANS}`;g.fillStyle=o.fill||C.ink;g.globalAlpha=o.alpha??.78;g.textAlign="center";g.textBaseline="middle";g.fillText(text,W/2,H/2+(o.dy||0));
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;texCache.set(key,t);return t}
  const fontsReady=fn=>{try{(document.fonts&&document.fonts.ready||Promise.resolve()).then(fn)}catch(e){fn()}};

  // a smooth ribbon (a band with depth) along a 2D curve given as [[x,y],...], extruded ±d in z. Returns BufferGeometry.
  function ribbonGeo(S,pts,d,th=0){const {THREE}=S;const n=pts.length;if(n<2)return new THREE.BufferGeometry();const pos=[],idx=[];
    const layers=th>0?[[th/2,1],[-th/2,-1]]:[[0,1]];
    // normals in the curve plane, to give the band a thickness
    const nx=[],ny=[];for(let i=0;i<n;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(n-1,i+1)];let tx=b[0]-a[0],ty=b[1]-a[1];const L=Math.hypot(tx,ty)||1;nx.push(-ty/L);ny.push(tx/L)}
    layers.forEach(([off],li)=>{for(let i=0;i<n;i++){const x=pts[i][0]+nx[i]*off,y=pts[i][1]+ny[i]*off;pos.push(x,y,-d,x,y,d)}
      const base=li*n*2;for(let i=0;i<n-1;i++){const a=base+i*2,b=a+1,c=a+2,e=a+3;if(li===0)idx.push(a,c,b,b,c,e);else idx.push(a,b,c,b,e,c)}});
    if(th>0){const top=0,bot=n*2;for(let i=0;i<n-1;i++){// front and back edges
        idx.push(top+i*2+1,top+i*2+3,bot+i*2+1, bot+i*2+1,top+i*2+3,bot+i*2+3);idx.push(top+i*2,bot+i*2,top+i*2+2, bot+i*2,bot+i*2+2,top+i*2+2)}}
    const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g}

  // a GLB loader with a tiny cache; resolves null if the file or the loader is unavailable (the scene then builds a stand-in)
  const glbCache={};
  function glb(url){if(glbCache[url])return glbCache[url];
    glbCache[url]=import("/ar/vendor/three/loaders/GLTFLoader.js").then(m=>new Promise(res=>{try{new m.GLTFLoader().load(url,g=>res(g),undefined,()=>res(null))}catch(e){res(null)}})).catch(()=>null);return glbCache[url]}

  // a readout strip pinned to the top centre of the bench: the main equation, always flat and readable (labels in the scene can't centre)
  function hud(S){const host=S.canvas.parentElement;const el=document.createElement("div");el.className="l2-hud";el.setAttribute("aria-hidden","true");host.appendChild(el);let pend="",last="";return{set(html){pend=html},clear(){pend=""},flush(){if(pend!==last){last=pend;el.innerHTML=pend}},el}}

  // A graph board: a frosted case with a white face, one or more graph panels printed on it (crisp canvas), and helpers that map
  // graph units to world points so tubes, beads and handles sit exactly on the printed grid.
  // o: {x,y,z,w,h,tint,panels:[{x0,x1,y0,y1 (fractions of the face), xm,xM,ym,yM, xs,ys (grid steps), ylab,xlab, fmtX, fmtY}]}
  function board(S,o){const {THREE,mat}=S;const g=new THREE.Group();g.position.set(o.x,o.y,o.z||0);S.scene.add(g);const W=o.w,H=o.h;
    g.add(S.rbox(W+.42,H+.42,.14,.1,mat("acrylic",o.tint||C.lav,{opacity:.42}),{at:[0,H/2,-.14],cast:false}));
    g.add(S.rbox(W+.14,H+.14,.04,.03,mat("plastic","#ffffff",{rough:.5}),{at:[0,H/2,-.07]}));
    if(o.legs!==false&&o.y>.05)for(const sx of[-1,1])g.add(S.cyl(.06,.08,o.y,mat("metal"),{at:[sx*(W/2-.35),-o.y/2,-.14],seg:14}));
    const PW=o.px||1024,PH=Math.round(PW*H/W),pan=S.panel(PW,PH,W);pan.position.set(0,H/2,-.035);g.add(pan);
    const P=o.panels;const ext=p=>({X0:(p.x0??.12)*W-W/2,X1:(p.x1??.97)*W-W/2,Y0:p.y0*H,Y1:p.y1*H});
    const loc=(i,x,y,z=0)=>{const p=P[i],e=ext(p);return new THREE.Vector3(e.X0+(x-p.xm)/(p.xM-p.xm)*(e.X1-e.X0),e.Y0+(y-p.ym)/(p.yM-p.ym)*(e.Y1-e.Y0),z)};
    const B={g,W,H,P,
      at:(i,x,y,z=0)=>loc(i,x,y,z).add(g.position),
      inv:(i,w)=>{const p=P[i],e=ext(p),l=w.clone().sub(g.position);return{x:p.xm+(l.x-e.X0)/(e.X1-e.X0)*(p.xM-p.xm),y:p.ym+(l.y-e.Y0)/(e.Y1-e.Y0)*(p.yM-p.ym)}},
      inside:(i,x,y)=>{const p=P[i];return x>=p.xm-1e-9&&x<=p.xM+1e-9&&y>=p.ym-1e-9&&y<=p.yM+1e-9},
      draw(){pan.redraw((c,w,h)=>{c.fillStyle="#fff";rr(c,0,0,w,h,24);c.fill();
        const cx=lx=>(lx+W/2)/W*w,cy=ly=>(H-ly)/H*h;
        P.forEach((p,i)=>{const e=ext(p),X=v=>cx(e.X0+(v-p.xm)/(p.xM-p.xm)*(e.X1-e.X0)),Y=v=>cy(e.Y0+(v-p.ym)/(p.yM-p.ym)*(e.Y1-e.Y0));
          const xs=p.xs||1,ys=p.ys||1,fs=p.font||30;c.lineWidth=2;c.strokeStyle="#EEE8F1";
          for(let v=Math.ceil(p.xm/xs)*xs;v<=p.xM+1e-9;v+=xs){c.beginPath();c.moveTo(X(v),Y(p.ym));c.lineTo(X(v),Y(p.yM));c.stroke()}
          for(let v=Math.ceil(p.ym/ys)*ys;v<=p.yM+1e-9;v+=ys){c.beginPath();c.moveTo(X(p.xm),Y(v));c.lineTo(X(p.xM),Y(v));c.stroke()}
          c.strokeStyle="#B9AEBE";c.lineWidth=3;c.strokeRect(X(p.xm),Y(p.yM),X(p.xM)-X(p.xm),Y(p.ym)-Y(p.yM));
          c.strokeStyle="#8C7E90";c.lineWidth=4;if(p.ym<0&&p.yM>0){c.beginPath();c.moveTo(X(p.xm),Y(0));c.lineTo(X(p.xM),Y(0));c.stroke()}if(p.xm<0&&p.xM>0){c.beginPath();c.moveTo(X(0),Y(p.ym));c.lineTo(X(0),Y(p.yM));c.stroke()}
          c.font=`600 ${fs}px ${MONO}`;c.fillStyle=C.muted;c.textAlign="center";const fx=p.fmtX||(v=>String(Math.round(v*100)/100).replace("-","−")),fy=p.fmtY||fx;
          for(let v=Math.ceil(p.xm/xs)*xs;v<=p.xM+1e-9;v+=xs*(p.xl||1))c.fillText(fx(v),X(v),Y(p.ym)+fs*1.15);
          c.textAlign="right";for(let v=Math.ceil(p.ym/ys)*ys;v<=p.yM+1e-9;v+=ys*(p.yl||1))c.fillText(fy(v),X(p.xm)-10,Y(v)+fs*.35);
          c.font=`600 ${Math.round(fs*.95)}px ${SANS}`;c.fillStyle=C.ink;c.textAlign="left";if(p.ylab)c.fillText(p.ylab,X(p.xm)+12,Y(p.yM)+fs*1.2);c.textAlign="right";if(p.xlab)c.fillText(p.xlab,X(p.xM)-10,Y(p.ym)-12)})})},
      // sample f over panel i into clipped runs of world points (z in front of the face)
      runs(i,f,z=0,step){const p=P[i],out=[];let cur=[];const n=step?Math.round((p.xM-p.xm)/step):160;for(let k=0;k<=n;k++){const x=p.xm+(p.xM-p.xm)*k/n,y=f(x);
          if(isFinite(y)&&y>=p.ym&&y<=p.yM)cur.push(B.at(i,x,y,z));else if(cur.length){out.push(cur);cur=[]}}if(cur.length)out.push(cur);return out.filter(r=>r.length>1)}};
    B.draw();fontsReady(()=>B.draw());return B}
  // a small pool of tube meshes that draws a set of point runs (clipped curves) with one material
  function tubes(S,material,n=3,r=.06){const {THREE}=S;const ms=Array.from({length:n},()=>{const m=new THREE.Mesh(new THREE.BufferGeometry(),material);m.castShadow=true;S.scene.add(m);return m});
    return{ms,set(runs,rr2=r){ms.forEach((m,i)=>{m.geometry.dispose();const pts=runs[i];m.visible=m.userData.on=!!pts;m.geometry=pts?new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),Math.min(400,pts.length*2),rr2,8,false):new THREE.BufferGeometry()})},
      show(b){ms.forEach(m=>{m.visible=!!b&&!!m.userData.on})}}}

  // ---------------------------------------------------------------- the desk kit for the English machines
  // flow(): word-wraps styled segments [{t,k}] onto a canvas. sty(k) → {bg,wt,fill,ul}. Returns the height used and, for every keyed
  // segment, its rectangles in canvas pixels (so a tap on the page can be mapped back to the phrase). draw:false only measures.
  function flow(g,segs,o){const size=o.size,lh=o.lh||size*1.34,sty=o.sty||(()=>({})),font=wt=>`${wt||o.wt||400} ${size}px ${o.mono?MONO:SANS}`;
    const toks=[];segs.forEach(sg=>String(sg.t).split(/(\n|[ \t]+)/).forEach(pt=>{if(!pt)return;if(pt==="\n"){toks.push({br:1});return}if(/^[ \t]+$/.test(pt)){toks.push({sp:1});return}toks.push({t:pt,k:sg.k})}));
    g.font=font();const spW=g.measureText(" ").width;const lines=[[]];let cx=0,pendSp=false;
    toks.forEach(tk=>{if(tk.br){lines.push([]);cx=0;pendSp=false;return}if(tk.sp){pendSp=true;return}const st=tk.k?sty(tk.k)||{}:sty("")||{};g.font=font(st.wt);tk.st=st;tk.w=g.measureText(tk.t).width;
      const L=lines[lines.length-1];const gap=L.length&&pendSp?spW:0;if(cx+gap+tk.w>o.w&&L.length){lines.push([]);cx=0;tk.x=0}else tk.x=cx+gap;tk.sp=gap>0;cx=tk.x+tk.w;lines[lines.length-1].push(tk);pendSp=false});
    const rects={};let y=o.y;
    lines.forEach(L=>{const top=y+(lh-size*1.3)/2;L.forEach((tk,j)=>{if(tk.k){const pv=L[j-1];const x0=o.x+tk.x-(tk.sp?spW:0),x1=o.x+tk.x+tk.w;
          const arr=rects[tk.k]||(rects[tk.k]=[]);const last=arr[arr.length-1];if(pv&&pv.k===tk.k&&last&&Math.abs(last[1]-top)<1)last[2]=x1-last[0];else arr.push([o.x+tk.x,top,tk.w,size*1.3])}});y+=lh});
    if(o.draw!==false){y=o.y;
      for(const k in rects){const st=sty(k)||{};if(!st.bg)continue;g.fillStyle=st.bg;rects[k].forEach(r=>{rr(g,r[0]-6,r[1],r[2]+12,r[3],size*.3);g.fill()})}
      lines.forEach(L=>{L.forEach(tk=>{const st=tk.st||{};g.font=font(st.wt);g.fillStyle=st.fill||o.fill||C.ink;g.textAlign="left";g.textBaseline="alphabetic";g.fillText(tk.t,o.x+tk.x,y+lh/2+size*.36);
        if(st.ul){g.fillRect(o.x+tk.x,y+lh/2+size*.5,tk.w,Math.max(2,size*.07))}});y+=lh})}
    return{h:lines.length*lh,rects,n:lines.length}}
  // fit(): shrink the type until the flow fits maxH
  function fitFlow(g,segs,o,maxH,min){let sz=o.size,r;for(let i=0;i<12;i++){r=flow(g,segs,{...o,size:sz,lh:sz*(o.lhf||1.34),draw:false});if(r.h<=maxH||sz<=min)break;sz*=.95}return flow(g,segs,{...o,size:sz,lh:sz*(o.lhf||1.34)})}
  // sheet(): a card or page with thickness and a crisp canvas face. Pick it and you get the tap in canvas pixels.
  function sheet(S,o){const {THREE,mat}=S;const g=new THREE.Group();(o.parent||S.scene).add(g);const W=o.w,H=o.h,T=o.t??.05;
    const body=S.rbox(W,H,T,Math.min(o.r??.08,T/2-1e-3),mat("plastic",o.edge||"#FFFDF8",{rough:.75,coat:.05}));body.position.z=-T/2;g.add(body);
    const PW=o.px||1024,PH=Math.round(PW*H/W),pan=S.panel(PW,PH,W);pan.position.z=.003;pan.renderOrder=1;g.add(pan);
    const sh={g,pan,body,W,H,PW,PH,regions:[],draw(fn){sh.regions=[];pan.redraw((c,w,h)=>fn(c,w,h,sh.regions))},
      onTap(fn){S.pick(pan,hit=>{if(!hit.uv)return;const px=hit.uv.x*PW,py=(1-hit.uv.y)*PH;const r=sh.regions.find(q=>px>=q[0]&&px<=q[0]+q[2]&&py>=q[1]&&py<=q[1]+q[3]);fn(r?r[4]:null,px,py)});return sh},
      // the world point of a canvas pixel on the face (for labels and flags)
      at(px,py,z=.02){return g.localToWorld(new THREE.Vector3((px/PW-.5)*W,(.5-py/PH)*H,z))}};
    return sh}

  window.L2={hud,board,tubes,flow,fitFlow,sheet,C,SANS,MONO,frames,approach,rr,wrap,textBlock,glyphTex,fontsReady,ribbonGeo,glb};
})();
