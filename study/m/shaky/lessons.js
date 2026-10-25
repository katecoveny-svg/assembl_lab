/* The five lessons of Shaky Isles. Each lesson supplies its words (page, predict, prove, exam ladder, kupu, sources)
   and a build(group, ctx) that makes the pop-up model and returns {controls, bind, readouts, update, play}.
   Facts in "prove" are from the cited sources; numbers in readouts come from the lesson's own small model and say so.
   Kupu Māori are only those already verified on Te Aka for the other study machines (see ../../te-reo-notes.md). */

const D2R=Math.PI/180;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const fmt=(v,d=0)=>v.toLocaleString("en-NZ",{maximumFractionDigits:d,minimumFractionDigits:d});
// a seeded random so the models look the same every visit
function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
const KUPU={
  topana:{mi:"tōpana",en:"force",ta:40375},pehanga:{mi:"pēhanga",en:"pressure",ta:5420},kiato:{mi:"kiato",en:"density",ta:45567},
  tauira:{mi:"tauira",en:"model, example",ta:7706},rewa:{mi:"rewa",en:"to melt",ta:6746},paerewa:{mi:"pae rewa",en:"melting point",ta:40108},
  haurehu:{mi:"haurehu",en:"gas",ta:39276},wera:{mi:"wera",en:"heat",ta:9229},paemahana:{mi:"paemahana",en:"temperature",ta:39927},
  waku:{mi:"waku",en:"friction",ta:12421},pungao:{mi:"pūngao",en:"energy",ta:40075},pungaomoe:{mi:"pūngao moe",en:"potential (stored) energy",ta:47720},
  pungaoneke:{mi:"pūngao neke",en:"kinetic energy",ta:47721},ngaru:{mi:"ngaru",en:"wave",ta:4584},taunaki:{mi:"taunakitanga",en:"evidence",ta:14911},
  we:{mi:"wē",en:"liquid",ta:13057},totoka:{mi:"totoka",en:"solid",ta:8538},tere:{mi:"tere",en:"speed",ta:7953},teitei:{mi:"teitei",en:"height",ta:7895}};
const GAP="Te reo terms for earthquake, volcano, tsunami and tectonic plate are not shown yet: they still need to be checked on Te Aka.";
const SRC={
  teara_eq:["Te Ara: Earthquakes","https://teara.govt.nz/en/earthquakes"],
  teara_vol:["Te Ara: Volcanoes","https://teara.govt.nz/en/volcanoes"],
  teara_ts:["Te Ara: Tsunamis","https://teara.govt.nz/en/tsunamis"],
  geonet:["GeoNet: New Zealand's geological hazard monitoring","https://www.geonet.org.nz/"],
  gns:["GNS Science (now part of Earth Sciences New Zealand)","https://www.gns.cri.nz/"],
  af8:["AF8 (Alpine Fault magnitude 8): the science","https://af8.org.nz/"],
  getready:["Get Ready (NEMA): Long or strong, get gone","https://getready.govt.nz/"],
  nzqa:["NZQA: Earth and Space Science past exams","https://www2.nzqa.govt.nz/ncea/subjects/past-exams-and-exemplars/earth-and-space-science/"]};

// ---------------------------------------------------------------- shared shape helpers
function shapeFrom(T,pts){const s=new T.Shape();pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));s.closePath();return s}
function extrudeXY(T,pts,depth){const g=new T.ExtrudeGeometry(shapeFrom(T,pts),{depth,bevelEnabled:false});g.translate(0,0,-depth/2);return g}
function arrowShape(T,len,w){const h=w*1.9,hl=Math.min(len*.4,w*2.2);return shapeFrom(T,[[0,-w/2],[len-hl,-w/2],[len-hl,-h/2],[len,0],[len-hl,h/2],[len-hl,w/2],[0,w/2]])}

// ================================================================ 1. plates
const L1={id:"plates",n:1,title:"Two plates, one country",
  short:"Aotearoa straddles the boundary between the Australian and Pacific plates.",
  fig:"Fig. 1  The plate boundary under Aotearoa",
  alt:"A paper map of Aotearoa on two plates. A rust line marks the boundary: the Hikurangi Trough off the east of the North Island, the Alpine Fault through the South Island, and the Puysegur Trench in the south-west.",
  view:{pos:[1.2,6.6,5.4],target:[.75,.3,.35]},
  predict:{q:"Off the east coast of the North Island the two plates push together. Which one sinks?",
    opts:["The Pacific Plate sinks under the North Island","The Australian Plate sinks under the Pacific Plate","Neither. They slide past each other there"],a:0,
    why:"The Pacific Plate there is old, cold ocean crust: denser than the crust of the North Island. It sinks (subducts) westward under the Australian Plate at the Hikurangi Trough."},
  testIntro:"Pick a stretch of the boundary. A cross-section pops up on the left page showing what the plates do there.",
  challenge:"Find the stretch of boundary where the plates mostly slide past each other instead of one sinking.",
  prove:["The Pacific Plate moves west relative to the Australian Plate at about 4 cm a year, roughly the speed your fingernails grow. But the way the two plates meet changes along the length of the country.",
    "<b>Hikurangi Trough (North Island).</b> The Pacific Plate subducts westward under the North Island. Friction on the sinking slab causes earthquakes, water driven off the slab feeds the Taupō Volcanic Zone, and a sudden slip could lift the seafloor and cause a tsunami.",
    "<b>Alpine Fault (South Island).</b> The plates slide past each other sideways (a transform boundary), with enough squeeze to push up the Southern Alps. It produces large, shallow earthquakes but no volcanoes.",
    "<b>Puysegur Trench (south-west).</b> The direction flips: here the Australian Plate subducts eastward under the Pacific Plate."],
  exam:["Name both plates and describe the type of boundary at one place, for example subduction at the Hikurangi Trough.",
    "Explain how the plate movement causes the event: for example, the denser Pacific Plate subducts, friction locks it, stress builds and is released as earthquakes.",
    "Compare two parts of the boundary and explain why they produce different extreme events (volcanoes and deep quakes in the north; shallow quakes and uplift on the Alpine Fault)."],
  kupu:[KUPU.topana,KUPU.kiato,KUPU.pehanga,KUPU.tauira],kupuNote:GAP,
  sources:[SRC.teara_eq,SRC.gns,SRC.geonet,SRC.nzqa],
  examQ:"Explain why the North Island has active volcanoes but the central South Island does not.",
  examA:"Under the North Island the Pacific Plate subducts westward beneath the Australian Plate at the Hikurangi Trough, because its old oceanic crust is denser. As the slab sinks to about 100 km it releases water into the hot mantle above, lowering its melting point, so magma forms and rises to feed the Taupō Volcanic Zone. Through the central South Island the plates meet at the Alpine Fault, a transform boundary where they slide past each other. No slab sinks there, so no water is released into the mantle and no magma forms; instead, the squeeze between the plates pushes up the Southern Alps and builds stress that is released in large shallow earthquakes.",
  build(g,c){const T=c.THREE;
    const K=.21,LON0=172.75,LAT0=-41,CL=Math.cos(41*D2R);
    const sx=lon=>(lon-LON0)*CL*K,sy=lat=>(lat-LAT0)*K,W=(lon,lat)=>new T.Vector3(sx(lon),0,-sy(lat));
    const B=[[179.9,-33.5],[179.2,-35.6],[178.9,-37.6],[178.3,-39.6],[176.9,-41.1],[175.2,-42.2],[174.3,-42.7],[173.2,-42.4],[172.3,-42.2],[171.5,-42.7],[170.4,-43.3],[169.1,-44],[167.8,-44.7],[167,-45.5],[166.3,-46.4],[165.8,-47.5],[165.5,-48.5]];
    const H=.14;
    const plate=(pts,col)=>{const geo=new T.ExtrudeGeometry(shapeFrom(T,pts.map(p=>[sx(p[0]),sy(p[1])])),{depth:H,bevelEnabled:false});geo.rotateX(-Math.PI/2);return c.mesh(geo,col,{th:40})};
    const west=plate([[165,-33.5],...B,[165,-48.5]],0xefe6d6),east=plate([[179.9,-33.5],[180.5,-33.5],[180.5,-48.5],...B.slice().reverse()],0xdde6ec);
    g.add(c.pop(west,0),c.pop(east,.08));
    const NI=[[172.7,-34.4],[173,-34.4],[174.3,-35.2],[174.5,-35.8],[174.8,-36.8],[175.5,-36.5],[175.9,-36.8],[176.2,-37.6],[177,-37.95],[177.3,-38],[178.55,-37.7],[178,-38.7],[177.9,-39.1],[176.9,-39.5],[177.1,-39.65],[176.2,-40.9],[175.3,-41.6],[174.8,-41.3],[175,-40.9],[175,-39.95],[174.3,-39.6],[173.75,-39.3],[174.1,-39.05],[174.6,-38.7],[174.8,-37.8],[174.5,-37.05],[174.2,-36.4],[173.9,-36],[173.4,-35.5],[173.1,-35.2]];
    const SI=[[172.9,-40.5],[173.3,-41.3],[173.9,-40.8],[174.3,-41.7],[173.7,-42.4],[172.8,-43.2],[173.1,-43.8],[172.3,-43.8],[171.25,-44.4],[171,-45.1],[170.7,-45.9],[169.8,-46.45],[168.3,-46.6],[167.7,-46.2],[166.6,-46.15],[166.8,-45.5],[167.9,-44.6],[168.6,-43.97],[169,-43.85],[170.95,-42.7],[171.2,-42.45],[171.6,-41.75],[172.1,-41.25],[172.2,-40.8]];
    const ST=[...Array(14)].map((_,i)=>{const a=i/14*Math.PI*2;return [167.95+Math.cos(a)*.32,-46.98+Math.sin(a)*.2]});
    const land=new T.Group();land.position.y=H;
    [NI,SI,ST].forEach(p=>{const geo=new T.ExtrudeGeometry(shapeFrom(T,p.map(q=>[sx(q[0]),sy(q[1])])),{depth:.045,bevelEnabled:false});geo.rotateX(-Math.PI/2);land.add(c.mesh(geo,0xe3ebd8,{th:50}))});
    g.add(c.pop(land,.25));
    const cone=(lon,lat,r,h,col,d)=>{const m=c.mesh(new T.ConeGeometry(r,h,9),col||0xf3efe6,{flat:true,th:50});m.position.copy(W(lon,lat)).setY(H+.045+h/2);land.add(m);return m};
    const ru=cone(175.57,-39.28,.05,.12),tk=cone(174.06,-39.3,.055,.14);cone(177.18,-37.52,.025,.05);
    const lake=new T.Mesh(new T.CircleGeometry(.05,24),c.flatMat(0x5f93ad,{opacity:.9}));lake.rotation.x=-Math.PI/2;lake.scale.set(.8,1.1,1);lake.position.copy(W(175.88,-38.82)).setY(H+.0465);land.add(lake);
    // Southern Alps: a row of peaks on the Pacific side of the Alpine Fault
    const R=rng(7),alp=B.slice(8,13);
    for(let i=0;i<16;i++){const t=i/15*(alp.length-1),k=Math.min(alp.length-2,Math.floor(t)),f=t-k;const lon=lerp(alp[k][0],alp[k+1][0],f),lat=lerp(alp[k][1],alp[k+1][1],f);
      const p=W(lon,lat),q=W(alp[k+1][0],alp[k+1][1]).sub(W(alp[k][0],alp[k][1])).normalize(),n=new T.Vector3(-q.z,0,q.x);if(n.x<0)n.negate();
      const h=.06+R()*.07;const m=c.mesh(new T.ConeGeometry(.035+R()*.02,h,5),0xf6f3ec,{flat:true,th:50});m.position.copy(p).addScaledVector(n,.05+R()*.06).setY(H+.045+h/2);m.rotation.y=R()*3;land.add(m)}
    // the boundary, in three stretches
    const SEG={hik:{pts:B.slice(0,7),name:"Hikurangi Trough",teeth:-1},alp:{pts:B.slice(8,13),name:"Alpine Fault"},pus:{pts:B.slice(12),name:"Puysegur Trench",teeth:1},marl:{pts:B.slice(6,9)}};
    const lines=new T.Group();lines.position.y=H+.004;g.add(c.pop(lines,.45));
    Object.entries(SEG).forEach(([k,s])=>{const curve=new T.CatmullRomCurve3(s.pts.map(p=>W(p[0],p[1])));
      s.mat=new T.MeshBasicMaterial({color:k==="marl"?0x9b8f80:0xb4532a});s.tube=new T.Mesh(new T.TubeGeometry(curve,80,k==="marl"?.008:.014,6),s.mat);lines.add(s.tube);
      if(s.teeth){for(let i=1;i<14;i++){const u=i/14,p=curve.getPointAt(u),d=curve.getTangentAt(u);const n=new T.Vector3(-d.z,0,d.x);if((n.x<0?-1:1)!==s.teeth)n.negate();
        const tt=new T.Mesh(new T.ConeGeometry(.026,.06,3),s.mat);tt.position.copy(p).addScaledVector(n,.035);tt.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),n);tt.scale.z=.3;lines.add(tt)}}
      if(k!=="marl"){const hit=new T.Mesh(new T.TubeGeometry(curve,40,.07,6),new T.MeshBasicMaterial({visible:false}));hit.userData.onTap=()=>select(k);lines.add(hit);s.curve=curve}});
    // strike-slip half arrows on the Alpine Fault
    const afc=SEG.alp.curve,am=c.sketch(0x3b3632);
    [[.35,1],[.62,-1]].forEach(([u,side])=>{const p=afc.getPointAt(u),d=afc.getTangentAt(u);const n=new T.Vector3(-d.z,0,d.x);if(n.x<0)n.negate();
      const a=new T.Mesh(new T.ShapeGeometry(arrowShape(T,.22,.025)),am);a.rotation.x=-Math.PI/2;const dir=d.clone().multiplyScalar(side>0?1:-1);
      a.rotation.z=Math.atan2(-dir.z,dir.x);a.position.copy(p).addScaledVector(n,side*.075).setY(.006);lines.add(a)});
    // big arrow: Pacific relative to Australian
    const arr=new T.Mesh(new T.ExtrudeGeometry(arrowShape(T,.5,.07),{depth:.02,bevelEnabled:false}),c.sketch(0x3b3632));arr.rotation.x=-Math.PI/2;
    const arrDir=new T.Vector3(-1,0,.25).normalize();arr.rotation.z=Math.atan2(-arrDir.z,arrDir.x);const arrHome=W(179.2,-41.6).setY(H+.002);arr.position.copy(arrHome);
    const arrG=new T.Group();arrG.add(arr);g.add(c.pop(arrG,.6));
    c.tag(arr,"Pacific Plate<small>≈ 4 cm a year, west</small>",{off:[.25,0,0],cls:"big key"});
    c.tag(west,"Australian Plate",{off:[sx(167),H,-sy(-37)],cls:"big flat key"});
    c.tag(lake,"Taupō",{off:[.04,0,0],cls:"minor"});c.tag(ru,"Ruapehu",{off:[.06,.07,.03],cls:"minor"});c.tag(tk,"Taranaki",{off:[-.06,.08,0],cls:"minor"});
    const segTags={hik:c.tag(lines,"Hikurangi Trough",{off:W(179.0,-38.6).toArray(),cls:"hot key"}),alp:c.tag(lines,"Alpine Fault",{off:W(169.4,-43.4).toArray(),cls:"hot key"}),pus:c.tag(lines,"Puysegur Trench",{off:W(166.1,-46.9).toArray(),cls:"hot key"})};
    // cross-sections on the left page: what each stretch looks like from the side
    const inset=new T.Group();inset.position.set(-2.4,0,1.05);inset.rotation.y=.2;g.add(inset);
    const XS={};
    function slabSection(flip){const s=new T.Group();const f=flip?-1:1;
      const pts=a=>a.map(p=>[p[0]*f,p[1]]);
      const top=[[.8,.42],[.15,.42],[-.15,.3],[-.55,.02]],bot=[[.8,.32],[.15,.32],[-.22,.18],[-.66,.02]];
      const over=[[-.8,.48],[.15,.48],[.15,.42],[-.15,.3],[-.8,.28]];
      const slab=[...top,...bot.slice().reverse()].map(p=>[p[0],Math.max(p[1],.02)]);
      const mantleA=[[-.8,.28],[-.15,.3],[-.55,.02],[-.8,.02]],mantleB=[[.8,.32],[.15,.32],[-.22,.18],[-.66,.02],[.8,.02]];
      const sea=[[.15,.48],[.8,.48],[.8,.42],[.15,.42]];
      const add=(p,col,o)=>{const m=c.mesh(extrudeXY(T,pts(p),.5),col,Object.assign({th:40,side:T.DoubleSide},o||{}));s.add(m);return m};
      add(over,flip?0xdde6ec:0xefe6d6);const sl=add(slab,flip?0xefe6d6:0xdde6ec);add(mantleA,0xf2d9c4);add(mantleB,0xf2d9c4);add(sea,0x5f93ad,{opacity:.55,edges:false,cast:false});
      const base=c.mesh(new T.BoxGeometry(1.6,.02,.5),0xe9e1d2);base.position.y=.01;s.add(base);
      const ar=new T.Mesh(new T.ShapeGeometry(arrowShape(T,.32,.03)),c.sketch(0x3b3632,{side:T.DoubleSide}));ar.position.set(.62*f,.38,.255);ar.rotation.z=flip?0:Math.PI;ar.rotation.z+=f*.35*(flip?-1:1);s.add(ar);
      c.tag(sl,flip?"Australian Plate sinks":"Pacific Plate sinks",{off:[.05*f,.2,.25],cls:"hot"});
      c.tag(s,flip?"Pacific Plate":"Australian Plate (North Island)",{off:[-.5*f,.5,0]});
      return s}
    function slideSection(){const s=new T.Group();
      const a=c.mesh(new T.BoxGeometry(.75,.36,.5),0xefe6d6,{th:40});a.position.set(-.38,.18,0);const b=c.mesh(new T.BoxGeometry(.75,.36,.5),0xdde6ec,{th:40});b.position.set(.38,.18,0);s.add(a,b);
      for(let i=0;i<5;i++){const m=c.mesh(new T.ConeGeometry(.06,.1+(i%3)*.05,5),0xf6f3ec,{flat:true,th:50});m.position.set(.12+i*.12,.36+.05+(i%3)*.025,(i%2-.5)*.2);s.add(m)}
      const am2=c.sketch(0x3b3632,{side:T.DoubleSide});
      [[-.38,1],[.38,-1]].forEach(([x,d])=>{const ar=new T.Mesh(new T.ShapeGeometry(arrowShape(T,.3,.04)),am2);ar.rotation.x=-Math.PI/2;ar.rotation.z=d>0?Math.PI/2:-Math.PI/2;ar.position.set(x,.362,d>0?.15:-.15);s.add(ar)});
      c.tag(a,"Australian Plate",{off:[0,.2,0]});c.tag(b,"Pacific Plate",{off:[0,.3,0]});return s}
    XS.hik=slabSection(false);XS.pus=slabSection(true);XS.alp=slideSection();
    Object.values(XS).forEach(x=>{x.visible=false;x.scale.y=.001;inset.add(x)});
    const caps=c.tag(inset,"",{off:[0,.02,.3],cls:"flat"});caps.show=false;
    let sel=null,t=0,run=false;
    const INFO={hik:{type:"Subduction (convergent)",move:"Plates push together",sinks:"Pacific Plate",makes:"Deep quakes, volcanoes, tsunami risk"},
      alp:{type:"Transform, with squeeze",move:"Plates slide past",sinks:"Neither",makes:"Big shallow quakes, Southern Alps"},
      pus:{type:"Subduction (convergent)",move:"Plates push together",sinks:"Australian Plate",makes:"Earthquakes, tsunami risk"}};
    function select(k){if(sel===k)return;const prev=sel?XS[sel]:null;sel=k;
      Object.entries(SEG).forEach(([kk,s])=>{if(s.mat&&kk!=="marl"){s.mat.color.set(kk===k?0xd2471a:0xc9a796);s.tube.scale.setScalar(1)}});
      Object.entries(segTags).forEach(([kk,tg])=>tg.el.classList.toggle("hot",kk===k));
      if(prev){const p=prev;animScale(p,0,()=>{p.visible=false})}
      const x=XS[k];x.visible=true;animScale(x,1);
      caps.el.innerHTML=SEG[k].name+"<small>cross-section</small>";caps.show=true;
      c.sfx.pop();c.refresh();
      document.querySelectorAll("[data-seg]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.seg===k));
      if(k==="alp")c.pass("Yes. The Alpine Fault is a transform boundary: the plates slide past each other, with enough squeeze to lift the Southern Alps.");}
    const anims=[];function animScale(o,to,done){anims.push({o,from:o.scale.y,to,t:0,done})}
    return{
      controls:()=>`<div class="seg" role="group" aria-label="Stretch of the boundary">${["hik","alp","pus"].map(k=>`<button class="btn" data-seg="${k}" aria-pressed="${sel===k}">${SEG[k].name}</button>`).join("")}</div>
        <p class="fine">You can also tap the rust line on the map. Press ▶ in the dock to watch the plates move.</p>`,
      bind:p=>p.querySelectorAll("[data-seg]").forEach(b=>b.onclick=()=>select(b.dataset.seg)),
      readouts:()=>{const i=sel&&INFO[sel];return [["Boundary",i?i.type:"Pick a stretch"],["Movement",i?i.move:"—"],["Which plate sinks",i?i.sinks:"—",i&&i.sinks!=="Neither"?"hot":""],["Causes",i?i.makes:"—"],["Relative speed","≈ 4 cm a year"],["Fingernails grow","≈ 4 cm a year"]]},
      play:on=>{run=on},
      update:(dt)=>{for(let i=anims.length-1;i>=0;i--){const a=anims[i];a.t=Math.min(1,a.t+dt*(c.rm?99:2.2));const e=a.to>a.from?1+2.5*Math.pow(a.t-1,3)+1.5*Math.pow(a.t-1,2):1-Math.pow(a.t,2);
          a.o.scale.y=Math.max(.001,lerp(a.from,a.to,a.to>a.from?e:1-e));if(a.t>=1){a.o.scale.y=Math.max(.001,a.to);anims.splice(i,1);a.done&&a.done()}}
        t+=dt*(run?1:0);arr.position.copy(arrHome).addScaledVector(arrDir,((t*.25)%1)*.14)}}}
};

// ================================================================ 2. magma
const L2={id:"magma",n:2,title:"Where the magma comes from",
  short:"Water squeezed out of the sinking plate melts the mantle above it.",
  fig:"Fig. 2  A slice through the North Island, west to east",
  alt:"A cut-away block through the North Island. The Pacific Plate slab dives down from the right. Blue water drops rise from the slab, turn into orange melt and collect in a magma chamber under a volcano on top.",
  view:{pos:[1.0,3.2,6.0],target:[1.5,.75,.2]},
  predict:{q:"Which magma is most likely to erupt explosively?",opts:["Basalt: low silica, runny","Andesite: medium silica","Rhyolite: high silica, very sticky"],a:2,
    why:"Rhyolite has the most silica, so it is the stickiest. Gas bubbles can't escape, pressure builds, and the magma is blasted apart into ash and pumice. Taupō is a rhyolite caldera."},
  testIntro:"Watch water leave the sinking slab and melt the mantle. Then change the silica in the magma, see the volcano change shape, and erupt it.",
  challenge:"Set up the kind of magma that erupted at Taupō, then erupt it.",
  prove:["As the Pacific Plate sinks under the North Island it carries water down with it. At about 100 km deep, heat and pressure drive that water out into the hot mantle above. Water lowers the melting point of rock, so part of the mantle melts.",
    "The melt is less dense than the solid rock around it, so it rises and collects in magma chambers in the crust under the Taupō Volcanic Zone. On the way it can melt crust and gain silica.",
    "<b>Silica controls the eruption.</b> Low-silica basalt is runny: gas escapes and lava flows, building wide, gentle shields. Andesite is stickier: it builds steep cones from layers of lava and ash, like Ruapehu and Taranaki. High-silica rhyolite traps gas and explodes. A big enough eruption empties the chamber so the ground collapses into a caldera: Lake Taupō fills one, made in eruptions including one about 1,800 years ago.",
    "Rangitoto, about 600 years old, is basalt but it isn't from subduction: the Auckland Volcanic Field is fed from deep in the mantle. It is still the best NZ example of how basalt behaves.",
    "<b>Hazards:</b> ash fall, pyroclastic flows, ballistic blocks and lahars. On 24 December 1953 a lahar from Ruapehu's crater lake destroyed the Tangiwai rail bridge, and 151 people died."],
  exam:["Describe a volcano's shape and its type of magma, for example Ruapehu, a steep andesite stratovolcano.",
    "Explain how subduction makes magma: water released from the slab lowers the melting point of the mantle, and the less dense melt rises.",
    "Discuss why eruptions at Taupō are far more explosive than basalt eruptions, linking silica, viscosity, trapped gas, pressure and the caldera landform."],
  kupu:[KUPU.rewa,KUPU.paerewa,KUPU.haurehu,KUPU.pehanga,KUPU.wera,KUPU.paemahana,KUPU.kiato],kupuNote:GAP,
  sources:[SRC.teara_vol,SRC.gns,SRC.geonet,SRC.nzqa],
  examQ:"Explain how subduction under the North Island leads to explosive eruptions in the Taupō Volcanic Zone.",
  examA:"The denser Pacific Plate subducts beneath the Australian Plate at the Hikurangi Trough. At about 100 km depth, water is driven out of the sinking slab into the overlying mantle; the water lowers the melting point of the mantle rock, so it partially melts. The magma is less dense than the surrounding rock, so it rises and pools in chambers in the crust, where it can melt continental crust and become richer in silica. High-silica rhyolite magma is very viscous, so dissolved gases cannot escape. As the magma rises and pressure drops, gas comes out of solution but stays trapped, so pressure builds until it fragments the magma explosively into ash and pumice. Very large eruptions empty the chamber and the roof collapses, forming calderas such as Lake Taupō.",
  build(g,c){const T=c.THREE;const M=new T.Group();g.add(M);const Z=.45;
    const crust=[[-1.2,1],[.72,1],[1,.88],[.6,.74],[-1.2,.74]];
    const sea=[[.72,1],[1.2,1],[1.2,.9],[1,.88]];
    const wedge=[[-1.2,.74],[.6,.74],[.2,.55],[-.2,.35],[-.6,.12],[-.78,0],[-1.2,0]];
    const slab=[[1.2,.9],[1,.88],[.6,.74],[.2,.55],[-.2,.35],[-.6,.12],[-.78,0],[-.5,0],[-.14,.22],[.24,.42],[.62,.61],[1,.75],[1.2,.77]];
    const lower=[[1.2,.77],[1,.75],[.62,.61],[.24,.42],[-.14,.22],[-.5,0],[1.2,0]];
    const add=(p,col,o,d)=>{const m=c.mesh(extrudeXY(T,p,Z*2),col,Object.assign({th:40},o||{}));M.add(c.pop(m,d||0));return m};
    const mW=add(wedge,0xf2d6c0,{},0),mL=add(lower,0xeccfb9,{},.05),sl=add(slab,0xd3dde4,{},.12),cr=add(crust,0xefe7d8,{},.2),se=add(sea,0x5f93ad,{opacity:.5,edges:false,cast:false},.28);
    // painted on the cut face: chamber, conduit and the path of the melt
    const face=new T.Group();face.position.z=Z+.002;M.add(c.pop(face,.4));
    const hot=c.flatMat(0xc8552a),hot2=c.flatMat(0xe0874f,{opacity:.85});
    const ch=new T.Mesh(new T.CircleGeometry(1,40),hot);ch.scale.set(.13,.045,1);ch.position.set(-.35,.86,0);face.add(ch);
    const cond=new T.Mesh(new T.PlaneGeometry(.022,.1),hot);cond.position.set(-.35,.94,0);face.add(cond);
    const wz=new T.Mesh(new T.CircleGeometry(1,40),c.flatMat(0xe9a77a,{opacity:.55}));wz.scale.set(.2,.08,1);wz.position.set(-.3,.42,0);face.add(wz);
    for(let i=0;i<9;i++){const d=new T.Mesh(new T.CircleGeometry(.006,8),c.flatMat(0x8a6a55,{opacity:.6}));d.position.set(lerp(-.3,-.35,i/8),lerp(.47,.8,i/8),0);face.add(d)}
    // moving drops: water leaves the slab (blue), turns to melt (orange), rises to the chamber
    const drops=[],R=rng(3);
    for(let i=0;i<16;i++){const m=new T.Mesh(new T.CircleGeometry(.014,10),c.flatMat(0x3f86b0));m.position.z=.001;face.add(m);drops.push({m,ph:R(),x0:lerp(-.05,-.45,R())})}
    // the volcano on top: one lathe that morphs with silica
    const vMat=c.sketch(0xf4efe6,{side:T.DoubleSide,fresh:true});
    let volc=null,vEdge=null,silica=60,erupting=0,eType="andesite";
    const lake=new T.Mesh(new T.CircleGeometry(.2,32),c.flatMat(0x5f93ad,{opacity:.9}));lake.rotation.x=-Math.PI/2;lake.position.set(-.35,1.013,0);M.add(lake);
    const vg=new T.Group();vg.position.set(-.35,1,0);M.add(c.pop(vg,.5));
    function profile(s){const shield=r=>.1*Math.max(0,1-Math.pow(r/.44,1.7)),strato=r=>{const R0=.38;if(r<.035)return .4;return .42*Math.pow(Math.max(0,1-r/R0),1.55)},
        cald=r=>r<.2?.012:r<.25?lerp(.012,.075,(r-.2)/.05):.075*Math.max(0,1-Math.pow((r-.25)/.19,1.3));
      let f;if(s<=52)f=shield;else if(s<=60){const k=(s-52)/8;f=r=>lerp(shield(r),strato(r),k)}else if(s<=64)f=strato;else if(s<=70){const k=(s-64)/6;f=r=>lerp(strato(r),cald(r),k)}else f=cald;
      const pts=[];let end=40;for(let i=1;i<=40;i++){if(f(i/40*.45)<=.0005){end=i;break}}for(let i=0;i<=end;i++){const r=i/40*.45;pts.push(new T.Vector2(Math.max(r,.0001),Math.max(0,f(r))+.001))}return pts.reverse()}
    function rebuild(){if(volc){vg.remove(volc);volc.geometry.dispose();vEdge.geometry.dispose()}
      volc=new T.Mesh(new T.LatheGeometry(profile(silica),36),vMat);volc.castShadow=volc.receiveShadow=true;vg.add(volc);
      vEdge=new T.LineSegments(new T.EdgesGeometry(volc.geometry,35),new T.LineBasicMaterial({color:0x332e2a,transparent:true,opacity:.5}));volc.add(vEdge);
      lake.visible=silica>=68;eType=silica<52?"basalt":silica<63?"andesite":"rhyolite"}
    rebuild();
    // eruption particles
    const N=420,pg=new T.IcosahedronGeometry(.02,1),pm=new T.MeshLambertMaterial({color:0xffffff});
    const parts=new T.InstancedMesh(pg,pm,N);parts.instanceMatrix.setUsage(T.DynamicDrawUsage);parts.castShadow=true;parts.frustumCulled=false;M.add(parts);
    const P=[...Array(N)].map(()=>({life:0,p:new T.Vector3(),v:new T.Vector3(),s:1,col:new T.Color(),ash:false}));
    const dummy=new T.Object3D(),cHot=new T.Color(0xd65a24),cAsh=new T.Color(0xa49d94),cAsh2=new T.Color(0xcfc8bd);
    P.forEach((q,i)=>{parts.setColorAt(i,cAsh);dummy.position.set(0,-9,0);dummy.scale.setScalar(.001);dummy.updateMatrix();parts.setMatrixAt(i,dummy.matrix)});
    let spawnAcc=0,next=0;
    function spawn(){const q=P[next];next=(next+1)%N;const top=1+(eType==="basalt"?.1:eType==="andesite"?.42:.03);q.p.set(-.35+(Math.random()-.5)*.03,top,(Math.random()-.5)*.03);
      const a=Math.random()*Math.PI*2;
      if(eType==="basalt"){const sp=.05+Math.random()*.08;q.v.set(Math.cos(a)*sp,.5+Math.random()*.45,Math.sin(a)*sp);q.ash=false;q.col.copy(cHot);q.s=.8+Math.random()*.6;q.life=1.6}
      else if(eType==="andesite"){const bomb=Math.random()<.18;const sp=bomb?.25:.12+Math.random()*.1;q.v.set(Math.cos(a)*sp,(bomb?.9:.8)+Math.random()*.5,Math.sin(a)*sp);q.ash=!bomb;q.col.copy(bomb?cHot:cAsh);q.s=bomb?.9:1.1+Math.random();q.life=bomb?1.6:3}
      else{const flow=Math.random()<.25;const sp=flow?.5:.1+Math.random()*.16;q.v.set(Math.cos(a)*sp,flow?.05:1.6+Math.random()*.9,Math.sin(a)*sp);q.ash=true;q.flow=flow;q.col.copy(Math.random()<.5?cAsh:cAsh2);q.s=1+Math.random()*1.4;q.life=flow?1.4:4.5}
      q.age=0}
    function stepParts(dt){if(erupting>0){erupting-=dt;spawnAcc+=dt*(eType==="basalt"?90:eType==="andesite"?120:220);while(spawnAcc>1){spawn();spawnAcc--}}
      P.forEach((q,i)=>{if(q.life<=0)return;q.age+=dt;q.life-=dt;
        if(q.ash){if(q.flow){q.v.y=0;q.p.y=Math.max(1.01,q.p.y)}else{q.v.y-=.25*dt;if(q.p.y>1.9){q.v.y*=.9;const r=Math.hypot(q.p.x+.35,q.p.z)||1;q.v.x+=(q.p.x+.35)/r*.6*dt;q.v.z+=q.p.z/r*.6*dt}q.v.x+=.04*dt}}
        else{q.v.y-=1.6*dt;if(q.p.y<1.01){q.p.y=1.01;q.v.multiplyScalar(.2)}}
        q.p.addScaledVector(q.v,dt);const k=Math.min(1,q.life);
        dummy.position.copy(q.p);dummy.scale.setScalar(q.s*(q.ash?1+q.age*1.4:1)*k);dummy.rotation.set(q.age*2,q.age*1.3,0);dummy.updateMatrix();parts.setMatrixAt(i,dummy.matrix);parts.setColorAt(i,q.col);
        if(q.life<=0){dummy.scale.setScalar(.001);dummy.updateMatrix();parts.setMatrixAt(i,dummy.matrix)}});
      parts.instanceMatrix.needsUpdate=true;if(parts.instanceColor)parts.instanceColor.needsUpdate=true}
    c.tag(sl,"Pacific Plate (sinking)",{off:[.75,.68,Z],cls:"key"});c.tag(cr,"Australian Plate crust",{off:[-.85,.88,Z]});
    c.tag(mW,"Mantle",{off:[-.9,.35,Z]});c.tag(wz,"~100 km: water leaves the slab",{off:[0,0,0],cls:"sea key"});c.tag(ch,"Magma chamber",{off:[.6,0,0],cls:"hot key"});
    c.tag(se,"Hikurangi Trough",{off:[1.0,.88,Z]});const vt=c.tag(vg,"",{off:[0,.45,0],cls:"key"});
    let t=0,run=true,passed=false;
    const INFO={basalt:{T:"≈ 1,100–1,200 °C",st:"Low (runny)",gas:"Escapes easily",er:"Lava fountains and flows",sh:"Wide, gentle shield",ex:"Rangitoto"},
      andesite:{T:"≈ 900–1,000 °C",st:"Medium",gas:"Builds up",er:"Explosive bursts, ash and lava",sh:"Steep stratovolcano",ex:"Ruapehu, Taranaki"},
      rhyolite:{T:"≈ 700–850 °C",st:"Very high",gas:"Trapped",er:"Violent: ash, pumice, pyroclastic flows",sh:"Caldera (collapsed)",ex:"Taupō"}};
    function setS(v){silica=v;rebuild();vt.el.innerHTML=INFO[eType]?eType[0].toUpperCase()+eType.slice(1):"";c.refresh();const o=document.getElementById("sio");if(o)o.textContent=silica+"% silica"}
    setS(60);
    function erupt(){erupting=eType==="rhyolite"?4:3;c.sfx[eType==="basalt"?"rumble":"boom"]();c.shake(eType==="rhyolite"?.05:eType==="andesite"?.025:.01,eType==="rhyolite"?1.6:1);
      c.live(eType==="basalt"?"Basalt erupts: lava fountains and flows.":eType==="andesite"?"Andesite erupts: explosive bursts of ash with lava bombs.":"Rhyolite erupts: a towering ash column and pyroclastic flows.");
      if(eType==="rhyolite"&&!passed){passed=true;c.pass("That's Taupō: high-silica rhyolite traps gas, so it erupts explosively.")}}
    return{
      controls:()=>`<div class="ctl"><label for="si">Silica in the magma <output id="sio">${silica}% silica</output></label><input type="range" id="si" min="48" max="76" step="1" value="${silica}"><div class="scale"><span>Basalt</span><span>Andesite</span><span>Rhyolite</span></div></div>
        <div class="row"><button class="btn" data-pre="50">Rangitoto</button><button class="btn" data-pre="60">Ruapehu</button><button class="btn" data-pre="74">Taupō</button><button class="btn hot" id="erupt">Erupt</button></div>`,
      bind:p=>{p.querySelector("#si").oninput=e=>setS(+e.target.value);p.querySelectorAll("[data-pre]").forEach(b=>b.onclick=()=>{p.querySelector("#si").value=b.dataset.pre;setS(+b.dataset.pre)});p.querySelector("#erupt").onclick=erupt},
      readouts:()=>{const i=INFO[eType];return [["Magma",eType[0].toUpperCase()+eType.slice(1)],["Silica",silica+"%"],["Temperature",i.T],["Stickiness",i.st,eType==="rhyolite"?"hot":""],["Gas",i.gas],["Eruption",i.er,eType==="rhyolite"?"hot":""],["Volcano shape",i.sh],["NZ example",i.ex]]},
      play:on=>{run=on;if(on)erupt()},
      update:(dt)=>{t+=dt;drops.forEach(d=>{const ph=(d.ph+t*.12)%1;let x,y,col;
          if(ph<.35){const k=ph/.35;x=lerp(d.x0,-.3,k*.4);const sy=d.x0>-.2?lerp(.35,.55,(d.x0+.2)/.2*0):.3;y=lerp(.3+(-.2-d.x0)*-.35,.45,k);col=0x3f86b0}
          else{const k=(ph-.35)/.65;x=lerp(-.3,-.35,k)+Math.sin(k*9+d.ph*6)*.012;y=lerp(.45,.84,k);col=k<.15?0x9a7a8a:0xd0612d}
          d.m.position.set(x,y,.001);d.m.material.color.setHex(col)});
        stepParts(dt)}}}
};

// ================================================================ 3. Alpine Fault
const L3={id:"fault",n:3,title:"Stick, slip, shake",
  short:"The Alpine Fault stores strain for centuries, then lets it go in seconds.",
  fig:"Fig. 3  A fence across the Alpine Fault",
  alt:"Two blocks of land meet at the Alpine Fault, with the Southern Alps on the right block. A farm fence crosses the fault. As years pass the fence bends; when the fault ruptures it snaps and is offset.",
  view:{pos:[2.6,3.7,5.3],target:[1.5,.35,.1]},
  predict:{q:"The Alpine Fault is locked by friction, but the plates keep moving. What happens to the rocks on either side?",
    opts:["Nothing happens until the earthquake","They bend and store energy, like a stretched spring","They slowly melt"],a:1,
    why:"Friction holds the fault, so the rocks deform elastically and store strain energy. When the stress beats the friction the fault slips and the rocks spring back. This is elastic rebound, and that sudden release is the earthquake."},
  testIntro:"Each year the plates move on, but the fault stays locked. Load the fault with years and watch the fence. Nobody knows the exact breaking point.",
  challenge:"Keep loading the fault until it ruptures.",
  prove:["The Alpine Fault runs about 600 km along the western edge of the Southern Alps. Averaged over thousands of years it moves about 3 cm a year sideways, and the eastern side rises, pushing up the mountains.",
    "Most of the time the fault is locked. Its last big rupture was in 1717, at about magnitude 8. Since then roughly 8 m of movement has been stored as strain in the rocks: about 3 cm a year for 300 years.",
    "Geologists dated past ruptures from layers of sediment shaken into lakes and swamps. The fault has ruptured about every 300 years on average. Research behind AF8 gives a 75% chance of a rupture in the next 50 years, and an 82% chance that the next one will be magnitude 8 or larger.",
    "The <b>focus</b> is where the rupture starts underground. The <b>epicentre</b> is the point on the surface directly above it. Seismic waves spread out from the focus in all directions."],
  exam:["Describe what happens at the Alpine Fault: a transform boundary where the Pacific and Australian plates slide past each other.",
    "Explain elastic rebound: friction locks the fault, strain builds as the plates move, stress exceeds friction, sudden slip releases energy as seismic waves.",
    "Discuss why a large Alpine Fault earthquake is expected, using the slip rate, the time since 1717 and the record of past ruptures, and what it would mean for the South Island (landslides, cut roads, uplift)."],
  kupu:[KUPU.waku,KUPU.topana,KUPU.pungaomoe,KUPU.pungao,KUPU.ngaru,KUPU.taunaki],kupuNote:GAP,
  sources:[SRC.af8,SRC.teara_eq,SRC.gns,SRC.nzqa],
  examQ:"Using elastic rebound, explain why scientists expect a large earthquake on the Alpine Fault.",
  examA:"The Pacific and Australian plates move past each other at the Alpine Fault at about 3 cm a year, but friction locks the fault, so the rocks either side bend elastically and store strain energy. When the stress becomes greater than the friction, the fault slips suddenly and the rocks spring back to an unstrained position, releasing the stored energy as seismic waves: an earthquake. The last large rupture was in 1717, so about 300 years × 3 cm ≈ 8–9 m of slip has built up, similar to the slip in past ruptures. Sediment records show ruptures about every 300 years on average, so a rupture of about magnitude 8 is considered likely (about a 75% chance in the next 50 years). Because the exact strength of the fault is unknown, the timing cannot be predicted precisely.",
  build(g,c){const T=c.THREE;const M=new T.Group();g.add(M);
    const BW=1.15,BD=1.0,BH=.32;
    const wB=c.mesh(new T.BoxGeometry(BW,BH,BD*2),0xefe6d6,{th:40});wB.position.set(-BW/2,BH/2,0);
    const eB=c.mesh(new T.BoxGeometry(BW,BH,BD*2),0xdde6ec,{th:40});eB.position.set(BW/2,BH/2,0);
    const gW=c.mesh(new T.BoxGeometry(BW,.03,BD*2),0xdfe8d2,{th:40});gW.position.set(-BW/2,BH+.015,0);
    const gE=c.mesh(new T.BoxGeometry(BW,.03,BD*2),0xdfe8d2,{th:40});gE.position.set(BW/2,BH+.015,0);
    M.add(c.pop(wB,0),c.pop(eB,.06),c.pop(gW,.15),c.pop(gE,.18));
    const TOPY=BH+.03;
    const alps=new T.Group();M.add(c.pop(alps,.35));const R=rng(11);
    for(let i=0;i<13;i++){const h=.12+R()*.16,r=.08+R()*.06;const m=c.mesh(new T.ConeGeometry(r,h,5),0xf6f3ec,{flat:true,th:50});m.position.set(.22+R()*.82,TOPY+h/2,-.85+R()*.7);m.rotation.y=R()*3;m.userData.h=h;alps.add(m)}
    for(let i=0;i<8;i++){const h=.08+R()*.1;const m=c.mesh(new T.ConeGeometry(.07,h,5),0xf6f3ec,{flat:true,th:50});m.position.set(.2+R()*.85,TOPY+h/2,.35+R()*.5);m.rotation.y=R()*3;alps.add(m)}
    // a few trees on the west coast side
    for(let i=0;i<10;i++){const tr=c.mesh(new T.ConeGeometry(.03,.09,6),0x8fa98a,{th:50});tr.position.set(-.2-R()*.85,TOPY+.045,(R()-.5)*1.8);if(Math.abs(tr.position.z)<.12)tr.position.z+=.25;M.add(c.pop(tr,.5+i*.02))}
    // the fence
    const fence=new T.Group();M.add(c.pop(fence,.6));const NP=22,xs=[...Array(NP)].map((_,i)=>-1.05+i*.1);
    const postG=new T.CylinderGeometry(.012,.012,.1,6),posts=xs.map(x=>{const p=c.mesh(postG,0x8a7660,{th:80});p.position.set(x,TOPY+.05,0);fence.add(p);return p});
    const railM=c.sketch(0x8a7660),rails=[];for(let i=0;i<NP-1;i++){for(const h of [.04,.085]){const r=new T.Mesh(new T.BoxGeometry(1,.009,.009),railM);r.castShadow=true;r.userData={i,h};fence.add(r);rails.push(r)}}
    // focus and epicentre
    const epi=new T.Mesh(new T.RingGeometry(.03,.045,24),c.flatMat(0xb4532a));epi.rotation.x=-Math.PI/2;epi.position.set(0,TOPY+.003,-.55);M.add(epi);
    const star=new T.Mesh(new T.CircleGeometry(.035,5),new T.MeshBasicMaterial({color:0xb4532a,depthTest:false,transparent:true}));star.renderOrder=5;star.position.set(0,.1,-.55);M.add(star);
    const dl=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0,.1,-.55),new T.Vector3(0,TOPY,-.55)]),new T.LineDashedMaterial({color:0xb4532a,dashSize:.02,gapSize:.015,depthTest:false,transparent:true}));dl.computeLineDistances();dl.renderOrder=5;M.add(dl);
    // seismic rings
    const rings=[...Array(3)].map(()=>{const r=new T.Mesh(new T.RingGeometry(.96,1,64),c.flatMat(0xb4532a,{opacity:0}));r.rotation.x=-Math.PI/2;r.position.set(0,TOPY+.004,-.55);r.scale.setScalar(.01);M.add(r);return r});
    c.tag(gW,"Australian Plate<small>West Coast</small>",{off:[-.1,.02,.85]});c.tag(gE,"Pacific Plate",{off:[.25,.02,.85]});
    c.tag(alps,"Southern Alps",{off:[.62,.5,-.5]});c.tag(epi,"Epicentre",{off:[0,0,0],cls:"hot key"});c.tag(star,"Focus (underground)",{off:[0,0,0],cls:"hot flat"});
    const fT=c.tag(fence,"Fence",{off:[-.85,TOPY+.1,0],cls:"key"});
    c.tag(M,"Alpine Fault",{off:[0,TOPY,.95],cls:"hot key"});
    // state: years of loading since the last rupture; 1717 → 2026 is 309 years
    const RATE=.027,VS=.045;let years=2026-1717,thr=315+Math.floor(rng(5)()*55),broken=false,perm=0,ruptures=0,lastSlip=0,run=false,rt=-1,R2=rng(99);
    function rupture(){lastSlip=years*RATE;perm=lastSlip;broken=true;ruptures++;years=0;thr=240+Math.floor(R2()*130);rt=0;
      alps.children.forEach(m=>{if(m.userData.h){m.scale.y*=1.05;m.position.y=TOPY+m.userData.h*m.scale.y/2}});
      c.sfx.rumble();c.shake(.07,1.8);c.live(`Rupture. The fault slipped about ${fmt(lastSlip,1)} m in seconds and the fence snapped.`);
      const s=document.getElementById("yr");if(s){s.value=0;document.getElementById("yro").textContent="0 years"}
      if(ruptures===1)c.pass(`The fault ruptured and slipped about ${fmt(lastSlip,1)} m. The bent rocks sprang back: elastic rebound.`)}
    function setYears(v){if(broken&&v>0.5){broken=false;perm=0}years=v;if(years>=thr){years=thr;rupture()}c.refresh();const o=document.getElementById("yro");if(o)o.textContent=Math.round(years)+" years"}
    const posZ=x=>broken?Math.sign(x)*perm*VS/2:Math.sign(x)*years*RATE*VS/2*(1-Math.exp(-Math.abs(x)/.32));
    const a=new T.Vector3(),b=new T.Vector3();
    return{
      controls:()=>`<div class="ctl"><label for="yr">Years of loading since the last rupture <output id="yro">${Math.round(years)} years</output></label><input type="range" id="yr" min="0" max="400" step="1" value="${Math.round(years)}"><div class="scale"><span>0</span><span>200</span><span>400</span></div></div>
        <div class="row"><button class="btn" id="now">Today (since 1717)</button><button class="btn primary" id="load">Load 25 more years</button></div>
        <p class="fine">Sideways movement is exaggerated about 20× so you can see the bending.</p>`,
      bind:p=>{p.querySelector("#yr").oninput=e=>setYears(+e.target.value);p.querySelector("#now").onclick=()=>{broken=false;perm=0;setYears(2026-1717);p.querySelector("#yr").value=years};
        p.querySelector("#load").onclick=()=>{setYears(Math.min(400,years+25));const s=p.querySelector("#yr");if(s&&!broken)s.value=Math.round(years)}},
      readouts:()=>[["Years since rupture",Math.round(years)+" yr"],["Strain stored",fmt(years*RATE,1)+" m",years*RATE>7?"hot":""],["Fence",broken?`Snapped, offset ${fmt(perm,1)} m`:years<5?"Straight":"Bending"],["Breaking point","Unknown"],["Last real rupture","1717, about M8"],["Ruptures in this run",String(ruptures)]],
      play:on=>{run=on},
      update:(dt)=>{if(run){setYears(Math.min(400,years+30*dt));const s=document.getElementById("yr");if(s)s.value=Math.round(years)}
        posts.forEach((p,i)=>{p.position.z=posZ(xs[i]);p.rotation.x=broken?0:0});
        rails.forEach(r=>{const i=r.userData.i;a.set(xs[i],TOPY+r.userData.h,posZ(xs[i]));b.set(xs[i+1],TOPY+r.userData.h,posZ(xs[i+1]));
          const gap=broken&&xs[i]<0&&xs[i+1]>0;r.visible=!gap;r.position.copy(a).add(b).multiplyScalar(.5);r.scale.x=a.distanceTo(b);r.rotation.y=-Math.atan2(b.z-a.z,b.x-a.x)});
        fT.el.innerHTML=broken?`Fence<small>offset ${fmt(perm,1)} m</small>`:"Fence";
        if(rt>=0){rt+=dt;rings.forEach((r,k)=>{const tt=rt-k*.35;if(tt<0)return;const s=Math.min(1.05,tt*.9);r.scale.setScalar(Math.max(.01,s));r.material.opacity=Math.max(0,.9-tt*.6)});if(rt>3)rt=-1}}}}
};

// ================================================================ 4. liquefaction
const L4={id:"ground",n:4,title:"Why some quakes hurt more",
  short:"Size matters, but so do depth, distance and the ground under your feet.",
  fig:"Fig. 4  A street on soft, wet ground",
  alt:"A block of ground with a street of houses. The top layer can be rock or wet sand. When an earthquake shakes wet sand hard enough, houses tilt and sink and sand boils erupt.",
  view:{pos:[.9,3.4,5.6],target:[.9,.45,.35]},
  predict:{q:"Which earthquake shook central Christchurch harder?",opts:["September 2010: magnitude 7.1, about 40 km away","February 2011: magnitude 6.2, about 10 km away and shallow","They shook it about the same"],a:1,
    why:"The February 2011 earthquake released much less energy, but it was shallow and right beside the city, and the soft, wet ground amplified the shaking and liquefied. 185 people died."},
  testIntro:"Set the size, depth and distance of the earthquake and the ground under the street, then shake it. The card on the left page shows where the quake starts.",
  challenge:"Find a set of conditions that makes the ground liquefy.",
  prove:["<b>Magnitude</b> measures the energy released. Each step up the scale releases about 32 times more energy, so a magnitude 7 releases about 1,000 times more than a magnitude 5.",
    "Shaking at a place weakens with distance from the focus. A shallow earthquake close to a city can shake it harder than a bigger one further away.",
    "<b>Liquefaction.</b> Loose sand and silt full of water amplify shaking. Strong shaking pushes up the water pressure between the grains until they stop touching, and the ground behaves like a liquid. Buildings tilt and sink, and sand and water burst up as sand boils. This happened across eastern Christchurch in 2010 and 2011.",
    "Timing and buildings matter too. The September 2010 earthquake struck at 4.35 am, when streets were empty; the February 2011 earthquake struck at 12.51 pm on a weekday."],
  exam:["Describe two factors that affect how much damage an earthquake causes, such as depth and ground type.",
    "Explain how liquefaction happens: saturated sediment, shaking raises water pressure, grains lose contact, the ground loses strength.",
    "Discuss why the February 2011 earthquake caused more damage than the larger September 2010 one, using depth, distance, ground conditions and timing."],
  kupu:[KUPU.pungao,KUPU.we,KUPU.totoka,KUPU.pehanga,KUPU.ngaru],kupuNote:GAP,
  sources:[SRC.teara_eq,SRC.geonet,SRC.gns,SRC.nzqa],
  examQ:"The magnitude 6.2 earthquake in February 2011 caused more damage in Christchurch than the magnitude 7.1 earthquake in September 2010. Discuss why.",
  examA:"Magnitude measures energy released, and the 7.1 released roughly 20 times more energy than the 6.2. But the February 2011 earthquake was shallow (about 5 km deep) and its epicentre was only about 10 km from the city centre, whereas the September 2010 epicentre was about 40 km away near Darfield. Seismic waves lose energy with distance, so the city was shaken much harder in 2011. Much of eastern Christchurch is built on loose, water-saturated sand and silt; strong shaking raised the pore-water pressure until the grains lost contact, so the ground liquefied: buildings tilted and sank, and sand boils and flooding followed. Buildings already weakened in 2010 failed in 2011, and the 2011 earthquake struck at lunchtime on a weekday when the central city was busy, while the 2010 quake struck at 4.35 am.",
  build(g,c){const T=c.THREE;const M=new T.Group();M.position.set(.05,0,.15);g.add(M);const shakeG=new T.Group();M.add(shakeG);
    const W=2.2,Dp=1.5;
    const bed=c.mesh(new T.BoxGeometry(W,.18,Dp),0xd9d3c8,{th:40});bed.position.y=.09;
    const grav=c.mesh(new T.BoxGeometry(W,.12,Dp),0xe7ddcb,{th:40});grav.position.y=.24;
    const topMat=c.sketch(0xeadbb9,{fresh:true});const top=c.mesh(new T.BoxGeometry(W,.16,Dp),0,{mat:topMat,th:40});top.position.y=.38;
    shakeG.add(c.pop(bed,0),c.pop(grav,.06),c.pop(top,.12));
    const water=new T.Mesh(new T.BoxGeometry(W,.1,.004),c.flatMat(0x3f86b0,{opacity:.28}));water.position.set(0,.35,Dp/2+.003);shakeG.add(water);
    const wline=new T.Mesh(new T.PlaneGeometry(W,.006),c.flatMat(0x336f8f));wline.position.set(0,.4,Dp/2+.004);shakeG.add(wline);
    const GY=.46;
    // street and houses
    const road=new T.Mesh(new T.PlaneGeometry(W,.22),c.flatMat(0xcfc8bb,{opacity:.9}));road.rotation.x=-Math.PI/2;road.position.set(0,GY+.002,.05);shakeG.add(road);
    const houses=[],R=rng(21);
    [[-.85,-.35],[-.4,-.38],[.05,-.33],[.5,-.36],[.9,-.34],[-.62,.45],[-.15,.47],[.32,.44],[.78,.46]].forEach(([x,z],i)=>{const h=new T.Group();
      const body=c.mesh(new T.BoxGeometry(.2,.12,.16),0xfbf8f1,{th:40});body.position.y=.06;h.add(body);
      const roof=c.mesh(extrudeXY(T,[[-.115,0],[.115,0],[0,.075]],.18),0x9aa3a6,{th:40});roof.position.y=.12;h.add(roof);
      const door=new T.Mesh(new T.PlaneGeometry(.035,.06),c.flatMat(0x8a7660));door.position.set(0,.03,z<0?.081:-.081);if(z>0)door.rotation.y=Math.PI;h.add(door);
      h.position.set(x,GY,z);if(z>0)h.rotation.y=Math.PI;shakeG.add(c.pop(h,.3+i*.04));houses.push({h,tilt:[(R()-.5)*.35,(R()-.5)*.35],sink:.03+R()*.04})});
    const boils=[];for(let i=0;i<11;i++){const b=new T.Group();const cn=c.mesh(new T.ConeGeometry(.045,.025,10),0xd9c79f,{th:60});cn.position.y=.012;b.add(cn);
      const pd=new T.Mesh(new T.CircleGeometry(.06,16),c.flatMat(0x5f93ad,{opacity:.6}));pd.rotation.x=-Math.PI/2;pd.position.y=.002;b.add(pd);
      b.position.set(-.95+R()*1.9,GY,(R()-.5)*1.25);if(Math.abs(b.position.z+.35)<.12||Math.abs(b.position.z-.45)<.12)b.position.z=.05+(R()-.5)*.15;b.scale.setScalar(.001);shakeG.add(b);boils.push(b)}
    c.tag(top,"",{off:[-.9,.02,Dp/2]});const topTag=c.tags?null:null;
    const gTag=c.tag(top,"Wet sand and silt",{off:[.85,.0,Dp/2]}),wTag=c.tag(wline,"Water table",{off:[-.75,0,0],cls:"sea key"});c.tag(bed,"Bedrock",{off:[.85,0,Dp/2]});
    // a stand-up card on the left page: where the quake starts
    const cv=document.createElement("canvas");cv.width=640;cv.height=440;const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;
    const card=new T.Group();card.position.set(-2.25,0,1.05);card.rotation.y=.22;
    const face=new T.Mesh(new T.PlaneGeometry(1.3,.9),new T.MeshLambertMaterial({map:tex,side:T.DoubleSide}));face.position.y=.5;face.rotation.x=-.18;face.castShadow=true;card.add(face);
    const foot=c.mesh(new T.BoxGeometry(1.3,.02,.18),0xe9e1d2);foot.position.set(0,.01,.06);card.add(foot);
    g.add(c.pop(card,.5));
    let Mg=6.2,dep=5,dist=10,ground="sand",shk=0,liq=0,lastS=0,did=false,run=false,peak=0;
    const R0=()=>Math.hypot(dist,dep);
    const raw=(m,r,gr)=>Math.pow(10,.5*m)/Math.pow(r+10,1.5)*(gr==="sand"?1.6:1);
    const KS=8/raw(6.2,Math.hypot(10,5),"sand");
    const S=()=>Math.min(10,raw(Mg,R0(),ground)*KS);
    const word=s=>s<2?"weak":s<4?"light":s<6?"strong":s<8?"severe":"violent";
    function drawCard(){const g2=cv.getContext("2d");g2.fillStyle="#fbf8f1";g2.fillRect(0,0,640,440);g2.strokeStyle="rgba(59,54,50,.5)";g2.lineWidth=3;g2.strokeRect(6,6,628,428);
      g2.fillStyle="#7a7166";g2.font='600 20px "Instrument Sans",sans-serif';g2.fillText("WHERE IT STARTS (side view)",30,46);
      const sy=110,maxD=100,maxZ=40,X=d=>70+d/maxD*500,Y=z=>sy+z/maxZ*230;
      g2.strokeStyle="#3b3632";g2.lineWidth=3;g2.beginPath();g2.moveTo(40,sy);g2.lineTo(610,sy);g2.stroke();
      g2.fillStyle="#3b3632";for(let i=0;i<3;i++){const x=48+i*16;g2.fillRect(x,sy-22,12,22);g2.beginPath();g2.moveTo(x-2,sy-22);g2.lineTo(x+6,sy-32);g2.lineTo(x+14,sy-22);g2.fill()}
      g2.font='italic 22px "Newsreader",serif';g2.fillText("the street",34,sy+30);
      const ex=X(dist),fz=Y(dep);g2.strokeStyle="#b4532a";g2.setLineDash([8,6]);g2.beginPath();g2.moveTo(ex,sy);g2.lineTo(ex,fz);g2.stroke();
      g2.setLineDash([]);g2.strokeStyle="#336f8f";g2.lineWidth=3;g2.beginPath();g2.moveTo(70,sy);g2.lineTo(ex,fz);g2.stroke();
      g2.fillStyle="#b4532a";g2.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?7:16;g2.lineTo(ex+Math.cos(a)*r,fz+Math.sin(a)*r)}g2.fill();
      g2.beginPath();g2.arc(ex,sy,7,0,7);g2.fill();
      g2.font='500 22px "Newsreader",serif';g2.fillText("epicentre",Math.min(ex+12,520),sy-12);g2.fillText("focus "+dep+" km deep",Math.min(ex+20,430),Math.min(fz+8,400));
      g2.fillStyle="#336f8f";g2.fillText(fmt(R0())+" km to the street",Math.max(80,(70+ex)/2-60),(sy+fz)/2+34);
      g2.fillStyle="#7a7166";g2.font='italic 20px "Newsreader",serif';g2.fillText("M "+fmt(Mg,1)+" · "+dist+" km away · depth not to scale",30,418);
      tex.needsUpdate=true}
    function setGround(gr){ground=gr;topMat.color.set(gr==="sand"?0xeadbb9:0xe0dbd2);water.visible=wline.visible=gr==="sand";gTag.el.innerHTML=gr==="sand"?"Wet sand and silt":"Rock";wTag.show=gr==="sand";resetDamage();c.refresh();
      document.querySelectorAll("[data-gr]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.gr===gr))}
    function resetDamage(){liq=0;houses.forEach(o=>{o.h.position.y=GY;o.h.rotation.x=o.h.rotation.z=0});boils.forEach(b=>b.scale.setScalar(.001));did=false}
    function quake(){resetDamage();lastS=S();peak=lastS;shk=1.6+Math.max(0,Mg-5)*.8;c.sfx.rumble();c.shake(.01+lastS*.006,shk);did=ground==="sand"&&lastS>=4.5;
      c.live(`Shaking: ${fmt(lastS,1)} out of 10, ${word(lastS)}.${did?" The wet sand liquefies.":""}`);c.refresh()}
    function setFrom(p){const q=s=>p.querySelector(s);q("#mg").value=Mg;q("#dp").value=dep;q("#ds").value=dist;q("#mgo").textContent="M "+fmt(Mg,1);q("#dpo").textContent=dep+" km";q("#dso").textContent=dist+" km"}
    drawCard();
    return{
      controls:()=>`<div class="ctl"><label for="mg">Magnitude <output id="mgo">M ${fmt(Mg,1)}</output></label><input type="range" id="mg" min="4" max="8.5" step=".1" value="${Mg}"></div>
        <div class="ctl"><label for="dp">Depth of the focus <output id="dpo">${dep} km</output></label><input type="range" id="dp" min="2" max="40" step="1" value="${dep}"></div>
        <div class="ctl"><label for="ds">Distance from the street to the epicentre <output id="dso">${dist} km</output></label><input type="range" id="ds" min="0" max="100" step="1" value="${dist}"></div>
        <div class="seg" role="group" aria-label="Ground under the street"><button class="btn" data-gr="rock" aria-pressed="${ground==="rock"}">Rock</button><button class="btn" data-gr="sand" aria-pressed="${ground==="sand"}">Wet sand and silt</button></div>
        <div class="row"><button class="btn" data-pre="2010">Sept 2010 (Darfield)</button><button class="btn" data-pre="2011">Feb 2011 (Christchurch)</button><button class="btn hot" id="quake">Shake it</button></div>
        <p class="fine">Shaking is a simple model: it rises with magnitude, falls with distance to the focus, and is higher on soft, wet ground. It shows the pattern, not a forecast.</p>`,
      bind:p=>{const on=(s,f)=>p.querySelector(s).oninput=e=>{f(+e.target.value);setFrom(p);drawCard();c.refresh()};
        on("#mg",v=>Mg=v);on("#dp",v=>dep=v);on("#ds",v=>dist=v);
        p.querySelectorAll("[data-gr]").forEach(b=>b.onclick=()=>setGround(b.dataset.gr));
        p.querySelectorAll("[data-pre]").forEach(b=>b.onclick=()=>{if(b.dataset.pre==="2010"){Mg=7.1;dep=10;dist=40}else{Mg=6.2;dep=5;dist=10}setGround("sand");setFrom(p);drawCard();c.refresh()});
        p.querySelector("#quake").onclick=quake},
      readouts:()=>{const s=S();return [["Energy vs a M6","× "+fmt(Math.pow(31.6,Mg-6),Mg<6?3:0)],["Distance to focus",fmt(R0())+" km"],["Shaking at the street (model)",fmt(s,1)+" / 10 · "+word(s),s>=6?"hot":""],["Ground",ground==="sand"?"Wet sand and silt":"Rock"],["Liquefaction",ground!=="sand"?"Not on rock":s>=4.5?"Likely":"Unlikely",ground==="sand"&&s>=4.5?"hot":""],["Last shake",peak?fmt(peak,1)+" / 10":"—"]]},
      play:on=>{if(on){quake()}},
      update:(dt,t)=>{if(shk>0){shk-=dt;const a=Math.min(1,shk)*(.004+lastS*.004);shakeG.position.set(Math.sin(t*61)*a,Math.abs(Math.sin(t*47))*a*.3,Math.cos(t*53)*a);
          if(did){liq=Math.min(1,liq+dt*.45);houses.forEach(o=>{o.h.position.y=GY-o.sink*liq;o.h.rotation.x=o.tilt[0]*liq;o.h.rotation.z=o.tilt[1]*liq});boils.forEach((b,i)=>{const k=clamp(liq*1.6-i*.06,0,1);b.scale.setScalar(Math.max(.001,k))})}
          if(shk<=0){shakeG.position.set(0,0,0);if(did){c.pass("Strong shaking on wet sand: the ground liquefied, houses tilted and sank, and sand boils burst up.")}}}}}}
};

// ================================================================ 5. tsunami
const L5={id:"tsunami",n:5,title:"Long or strong, get gone",
  short:"A subduction earthquake can lift the seafloor, and the whole ocean above it.",
  fig:"Fig. 5  From the Hikurangi Trough to the coast",
  alt:"A cross-section of ocean from the Hikurangi Trough to a coastal town below a hill. The seafloor lifts, a wave travels to the coast, slows and grows, then floods the low ground.",
  view:{pos:[1.2,3.0,6.0],target:[1.5,.6,.1]},
  predict:{q:"As a tsunami moves from the deep ocean into shallow water near the coast, it…",opts:["speeds up and gets smaller","slows down and gets taller","keeps the same speed and height"],a:1,
    why:"A tsunami's speed depends on the water depth: v = √(g × d). The front slows down in shallow water, the water behind catches up, and the same energy is squeezed into a taller wave."},
  testIntro:"Rupture the Hikurangi subduction zone. Watch the shaking, decide what to do, then follow the wave to the coast.",
  challenge:"When the shaking is long or strong, make the right call for the person on the beach.",
  prove:["When a subduction zone like the Hikurangi ruptures, the edge of the overriding plate can spring up and lift the seafloor by metres over a huge area. The whole column of water above is lifted, and it spreads out as a tsunami.",
    "In deep water a tsunami is fast and low: about 700 km/h in water 4,000 m deep, and often less than a metre high. Near land it slows down and builds up, and it can surge far inland.",
    "A tsunami from a nearby fault can arrive before any official warning. That is why the rule in Aotearoa is <b>Long or strong, get gone</b>: if an earthquake lasts more than a minute or is hard to stand up in, move straight away to high ground or as far inland as you can. Don't wait for a warning.",
    "Natural warnings also count: the sea suddenly draining away, or a loud roar from the sea. Scientists say the Hikurangi subduction zone could produce a large earthquake and tsunami, which is why east coast towns have tsunami evacuation zones."],
  exam:["Describe how a subduction earthquake can cause a tsunami: the seafloor is suddenly lifted, displacing the water above.",
    "Explain why the tsunami grows taller near the coast: speed depends on depth, so the wave slows in shallow water and its energy is compressed.",
    "Discuss the risk from the Hikurangi subduction zone to the east coast of the North Island, including why local tsunami need people to act on natural warnings."],
  kupu:[KUPU.ngaru,KUPU.tere,KUPU.teitei,KUPU.pungao,KUPU.pungaoneke],kupuNote:GAP,
  sources:[SRC.getready,SRC.teara_ts,SRC.gns,SRC.geonet,SRC.nzqa],
  examQ:"Explain how a rupture of the Hikurangi subduction zone could cause a tsunami, and why people on the coast should not wait for an official warning.",
  examA:"At the Hikurangi subduction zone the Pacific Plate subducts beneath the North Island, and friction locks the plates so the edge of the overriding plate is dragged down and bent. If the locked zone ruptures, the overriding plate springs back up, suddenly lifting a large area of seafloor. The water column above is displaced upward, and gravity pulls it back, sending out a tsunami. In deep water the wave travels very fast (v = √(gd), about 700 km/h at 4,000 m) but is low. As it reaches shallow water near the coast it slows down, the back of the wave catches up with the front, and the energy is compressed into a much taller wave that can flood low-lying land. Because the source is close to shore, the tsunami could arrive within minutes, possibly before an official warning can be issued, so people should treat a long or strong earthquake, or the sea draining away, as the warning and move to high ground immediately.",
  build(g,c){const T=c.THREE;const M=new T.Group();g.add(M);const Z=.4,SL=.75,G=9.81;
    const LEN=120,xOf=s=>1.3-s/LEN*2.25;
    const depth=s=>s<15?3000:s<75?lerp(3000,160,(1-Math.cos(Math.PI*(s-15)/60))/2):s<118?lerp(160,4,(s-75)/43):lerp(4,0,(s-118)/2);
    const fy=s=>SL-depth(s)/3000*.6;
    const prof=[];for(let s=0;s<=LEN;s+=1)prof.push([xOf(s),fy(s)]);
    const groundPts=[[1.35,0],[1.35,fy(0)],...prof,[-.97,.775],[-1.12,.785],[-1.2,.9],[-1.3,1.02],[-1.36,1.05],[-1.36,0]];
    const gnd=c.mesh(extrudeXY(T,groundPts,Z*2),0xefe6d6,{th:40});M.add(c.pop(gnd,0));
    const slabTop=[];for(let s=0;s<=70;s+=5)slabTop.push([xOf(s),fy(s)-.025-s*.0022]);const slabP=[...slabTop,...slabTop.slice().reverse().map(p=>[p[0],p[1]-.075])];
    const slab=new T.Mesh(new T.ShapeGeometry(shapeFrom(T,slabP)),c.flatMat(0xb9c9d3,{opacity:.8}));slab.position.z=Z+.002;M.add(c.pop(slab,.1));
    // uplift block near the trench
    const up=c.mesh(new T.BoxGeometry(.6,.03,Z*2),0xdde6ec,{th:40});up.position.set(xOf(22),fy(22)-.012,0);M.add(c.pop(up,.15));
    // town and hill
    const town=new T.Group();M.add(c.pop(town,.3));const houses=[];
    [-1.0,-1.06,-1.12].forEach((x,i)=>[-.2,.12].forEach((z,j)=>{const h=new T.Group();const b=c.mesh(new T.BoxGeometry(.045,.035,.05),0xfbf8f1,{th:40});b.position.y=.0175;h.add(b);
      const r=c.mesh(extrudeXY(T,[[-.028,0],[.028,0],[0,.022]],.054),0x9aa3a6,{th:40});r.position.y=.035;r.rotation.y=Math.PI/2;h.add(r);h.position.set(x,.78,z);town.add(h);houses.push(h)}));
    const safe=new T.Mesh(new T.RingGeometry(.05,.065,24),c.flatMat(0x4e7a55));safe.rotation.x=-Math.PI/2;safe.position.set(-1.33,1.052,0);M.add(safe);
    // a person
    const person=new T.Group();const bd=c.mesh(new T.CylinderGeometry(.009,.012,.04,8),0x336f8f,{th:80});bd.position.y=.02;const hd=c.mesh(new T.SphereGeometry(.01,10,8),0xf1d9c4,{th:80});hd.position.y=.05;person.add(bd,hd);
    const beachX=-.955;person.position.set(beachX,.77,.3);M.add(c.pop(person,.5));
    // water: a top surface and a front face, rebuilt every frame
    const NX=150,surf=new T.PlaneGeometry(1,1,NX,1);const sm=c.flatMat(0x5f93ad,{opacity:.55,depthWrite:false});const top=new T.Mesh(surf,sm);top.renderOrder=2;M.add(top);
    let front=new T.Mesh(new T.BufferGeometry(),c.flatMat(0x4f86a3,{opacity:.6}));front.position.z=Z+.003;front.renderOrder=2;M.add(front);
    const flood=new T.Mesh(new T.BufferGeometry(),c.flatMat(0x4f86a3,{opacity:.65}));flood.position.z=Z+.004;M.add(flood);
    const floodTop=new T.Mesh(new T.PlaneGeometry(1,Z*2),c.flatMat(0x5f93ad,{opacity:.5}));floodTop.rotation.x=-Math.PI/2;floodTop.visible=false;M.add(floodTop);
    c.tag(gnd,"Hikurangi Trough",{off:[1.2,fy(0),Z],cls:"hot key"});c.tag(slab,"Pacific Plate (sinking)",{off:[xOf(40),fy(40)-.2,0]});c.tag(town,"Town",{off:[-1.06,.85,-.2],cls:"key"});c.tag(safe,"High ground",{off:[0,.02,0],cls:"flat key"});
    const ft=c.tag(top,"",{off:[0,0,0],cls:"sea key"});ft.show=false;
    // the wave: real travel time from v = √(g d) on this profile
    const S0=22,tab=[[0,S0]];{let t=0;for(let s=S0;s<119.5;s+=.05){const d=Math.max(1,depth(s));t+=50/Math.sqrt(G*d);tab.push([t,s+.05])}}
    const TT=tab[tab.length-1][0];const sAt=t=>{if(t<=0)return S0;if(t>=TT)return 119.5;let lo=0,hi=tab.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(tab[m][0]<t)lo=m;else hi=m}return tab[hi][1]};
    let phase="idle",pt=0,sf=S0,choice=null,passed=false,eta=0,lift=0,fl=0,walk=0;
    const SHAKE=3.4,TRAVEL=12;
    const hAt=s=>Math.min(6,1*Math.pow(3000/Math.max(4,depth(s)),.25));
    const eta_s=s=>{const d=Math.max(1,depth(s)),c0=Math.sqrt(G*3000),cc=Math.sqrt(G*d);return Math.max(1.6,14*cc/c0+1.4)};
    function eta2(s){const amp=phase==="travel"||phase==="run"?hAt(sf)*.03*Math.min(1,(pt)/1.2):0;if(!amp)return 0;const w=eta_s(sf);
      return amp*(Math.exp(-Math.pow((s-(sf-w*.4))/w,2))-.75*Math.exp(-Math.pow((s-(sf+w*.9))/(w*.9),2)))}
    function waterY(s){return SL+(phase==="shake"||phase==="travel"&&pt<.5?lift*.9*Math.exp(-Math.pow((s-S0)/12,2)):0)+eta2(s)}
    function rebuild(){const pa=surf.attributes.position.array;const fpts=[];
      for(let i=0;i<=NX;i++){const s=i/NX*LEN,x=xOf(s),y=Math.max(fy(s)+.001,waterY(s));pa[i*3]=x;pa[i*3+1]=y;pa[i*3+2]=-Z;pa[(i+NX+1)*3]=x;pa[(i+NX+1)*3+1]=y;pa[(i+NX+1)*3+2]=Z;fpts.push([x,y])}
      surf.attributes.position.needsUpdate=true;surf.computeBoundingSphere();
      const bot=[];for(let i=NX;i>=0;i--){const s=i/NX*LEN;bot.push([xOf(s),fy(s)])}
      front.geometry.dispose();front.geometry=new T.ShapeGeometry(shapeFrom(T,[...fpts,...bot]));
      if(fl>0){const fh=.775+fl*.11,xr=-.97-fl*.3;flood.geometry.dispose();flood.geometry=new T.ShapeGeometry(shapeFrom(T,[[-.95,.75],[-.95,fh],[xr,fh],[xr,.78],[-.97,.775]]));flood.visible=true;
        floodTop.visible=true;floodTop.scale.x=Math.abs(xr+.95);floodTop.position.set((xr-.95)/2,fh,0)}else{flood.visible=false;floodTop.visible=false}}
    rebuild();
    function start(){if(phase!=="idle"&&phase!=="after")return;phase="shake";pt=0;sf=S0;fl=0;choice=null;walk=0;person.position.set(beachX,.77,.3);houses.forEach(h=>h.rotation.set(0,0,0));
      c.sfx.rumble();c.shake(.045,SHAKE);c.live("The ground is shaking hard, and it keeps going: over a minute. What do you do?");renderChoice();c.refresh()}
    function choose(k){choice=k;renderChoice();if(k==="high"){c.live("Good call. Moving to high ground now.");if(!passed){passed=true;c.pass("Long or strong, get gone. A local tsunami can arrive before any warning, so the shaking is the warning.")}}
      else c.live(k==="watch"?"The beach is the worst place to be: the sea may drain away just before the wave arrives.":"A local tsunami can arrive before an official warning. Don't wait.")}
    function renderChoice(){const el=document.getElementById("tsChoice");if(!el)return;
      if(phase==="idle"){el.innerHTML="";return}
      const opts=[["wait","Wait for an official warning"],["watch","Go down to the beach to look"],["high","Move to high ground now"]];
      el.innerHTML=`<p class="warn">The shaking lasted more than a minute.</p><div class="opts" role="radiogroup" aria-label="What do you do?">${opts.map(([k,t],n)=>`<button class="opt${choice?(k==="high"?" right":k===choice?" wrong":""):""}" role="radio" aria-checked="${choice===k}" data-ch="${k}"><b>${"ABC"[n]}</b><span>${t}</span></button>`).join("")}</div>
        ${choice&&choice!=="high"?`<div class="note no">${choice==="watch"?"The beach is where the danger is. The sea can drain away just before the wave arrives.":"For a local tsunami, the earthquake is the warning: there may be no time for an official one."} Try again: press the third option.</div>`:""}`;
      el.querySelectorAll("[data-ch]").forEach(b=>b.onclick=()=>choose(b.dataset.ch))}
    const realMin=()=>phase==="idle"?0:phase==="shake"?pt/SHAKE*1.5:1.5+(phase==="travel"?Math.min(TT,pt/TRAVEL*TT):TT)/60;
    return{
      controls:()=>`<div class="row"><button class="btn hot" id="rup">Rupture the Hikurangi</button><button class="btn" id="rst">Reset</button></div><div id="tsChoice"></div>
        <p class="fine">Wave heights are exaggerated and the coast is a model: 120 km from the trough, with a made-up seafloor profile. Speeds use v = √(g × d).</p>`,
      bind:p=>{p.querySelector("#rup").onclick=start;p.querySelector("#rst").onclick=()=>{phase="idle";pt=0;fl=0;lift=0;choice=null;person.position.set(beachX,.77,.3);up.position.y=fy(22)-.012;houses.forEach(h=>h.rotation.set(0,0,0));renderChoice();c.refresh()};renderChoice()},
      readouts:()=>{const s=phase==="idle"?S0:sf,d=depth(s),v=Math.sqrt(G*Math.max(1,d))*3.6;
        return [["Time since the quake",phase==="idle"?"—":fmt(realMin(),1)+" min"],["Wave front to coast",fmt(Math.max(0,LEN-s))+" km"],["Water depth",fmt(d)+" m"],["Wave speed",fmt(v)+" km/h",v<100?"hot":""],["Wave height (model)",(phase==="travel"||phase==="run"||phase==="after"?fmt(hAt(s),1):"<1")+" m"],["Whole trip (model)",fmt(TT/60)+" min"]]},
      play:on=>{if(on)start()},
      update:(dt)=>{if(phase==="shake"){pt+=dt;lift=Math.min(1,pt/1)*.035;up.position.y=fy(22)-.012+lift*.9;if(pt>=SHAKE){phase="travel";pt=0;c.sfx.wave()}}
        else if(phase==="travel"){pt+=dt;lift=Math.max(0,lift-dt*.08);sf=sAt(pt/TRAVEL*TT);if(sf>=119.4){phase="run";pt=0}}
        else if(phase==="run"){pt+=dt;fl=pt<2?Math.sin(pt/2*Math.PI/2):Math.max(0,1-(pt-2)/3);houses.forEach((h,i)=>{if(fl>.6)h.rotation.z=Math.min(h.rotation.z+dt*.2,.15*(i%2?1:-1)*(i%3?1:.5))});if(pt>5){phase="after";fl=0;c.refresh()}}
        if(choice==="high"&&walk<1){walk=Math.min(1,walk+dt*.32);const k=walk;person.position.set(lerp(beachX,-1.33,k),k<.45?.77+k*.03:lerp(.785,1.05,(k-.45)/.55),lerp(.3,0,k))}
        else if(choice==="watch")person.position.x=Math.max(-.9,person.position.x+dt*.01);
        ft.show=phase==="travel";if(ft.show){ft.off.set(xOf(sf),waterY(sf)+.06,0);ft.el.innerHTML=`wave front<small>${fmt(Math.sqrt(G*Math.max(1,depth(sf)))*3.6)} km/h</small>`}
        rebuild()}}}
};

export const LESSONS=[L1,L2,L3,L4,L5];
