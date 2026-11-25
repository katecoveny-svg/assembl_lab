import * as T from "three";
import { empty, frame, importPlanting, MAX_PLANTS, MAX_VERTICES, paint, PLANTS, MIX, setArea } from "./model.js";
import { MONTHS } from "./catalog.js";
import { plantSchedule, scheduleCsv } from "./schedule.js";
import { cursor, layer, outlines } from "./visual.js";
const q=s=>document.querySelector(s);
export function createPlanting(stage,{save,onExit,showSolid}){
  const projects=new WeakMap(), canvas=stage.renderer.domElement;
  const edit=q("#plantingTools"), toggle=q("#plantingToggle"), banner=q("#plantStatus"), species=q("#plantSpecies");
  const season=q("#plantSeason"), style=q("#plantDisplay"), schedule=q("#plantSchedule");
  for(const [value,m] of Object.entries(PLANTS))species.add(new Option(m.label,value));
  species.add(new Option("Layered native mix",MIX));
  for(const [value,label] of MONTHS)season.add(new Option(label,value));
  const camera=new T.OrthographicCamera(), plane=new T.Plane(new T.Vector3(0,1,0),0), ray=new T.Raycaster(), target=new T.Vector3();
  const circle=cursor();circle.visible=false;stage.scene.add(circle);
  let project,f,state,visible=true, plants=null, guides=null, active=false, mode="", before=[], corners=[], hover=null, drag=null, prior;
  const tell=(t)=>banner.textContent=t;
  const count=()=>state?.plants.length||0;
  function renderSchedule(){
    if(!schedule.open)return;
    const {total,rows}=plantSchedule(state,f),host=q("#plantScheduleRows"), node=(tag,text)=>{
      const e=document.createElement(tag);e.textContent=text;return e;
    };
    q("#plantScheduleTotal").textContent=total?total+" accepted placements across the project.":"No accepted plants yet.";
    host.replaceChildren(...rows.map(r=>{
      const tr=document.createElement("tr"),taxon=node("td",r.label);
      if(r.botanical){const proof=node("a",r.botanical);proof.href=r.source;proof.rel="noopener";proof.target="_blank";taxon.append(proof);}
      taxon.append(node("small",r.layer));tr.append(taxon,node("td",r.quantity),node("td",r.percent+"%"));return tr;
    }));
    q("#plantCsv").disabled=!total;
  }
  function renderMix(){q("#plantMixInfo").hidden=species.value!==MIX;}
  schedule.addEventListener("toggle",renderSchedule);species.addEventListener("change",renderMix);
  q("#plantCsv").addEventListener("click",()=>{
    if(!plantSchedule(state,f).total)return;
    save(new Blob([scheduleCsv(state,f)],{type:"text/csv;charset=utf-8"}),"proposed-plant-schedule.csv");
  });
  season.addEventListener("change",()=>{syncPlants();stage.render();});
  function paintScene(){
    const [a,b,c,d]=f.box, x=(a+c)/2,z=(b+d)/2;
    const aspect=(canvas.clientWidth||800)/(canvas.clientHeight||440), span=Math.max(d-b+15,(c-a+16)/aspect);
    camera.up.set(0,0,-1);camera.position.set(x,span*2,z);camera.lookAt(x,f.y,z);
    camera.left=-span*.5*aspect;camera.right=-camera.left;camera.top=span*.5;camera.bottom=-camera.top;camera.near=.1;camera.far=Math.max(150,span*5);camera.updateProjectionMatrix();
    stage.renderer.render(stage.scene,camera);
  }
  function remove(o){if(o){stage.scene.remove(o);o.userData.dispose?.();}}
  function syncPlants(){
    remove(plants);plants=null;
    if(f && count()){plants=layer(f.y,state.plants,+season.value);plants.visible=visible||active;stage.scene.add(plants);}
    q("#plantCount").textContent=count()+ (count()===1?" plant":" plants");q("#plantViewBed").hidden=!count();style.hidden=!count();renderSchedule();
  }
  function radius(){return +q("#plantRadius").value||1;}
  function syncCursor(){
    circle.visible=active&&Boolean(hover);
    if(hover){
      circle.position.set(hover[0],f.y+.039,hover[1]);circle.scale.setScalar(mode==="paint"||mode==="erase"?radius():.18);
      q("#plantPosition").textContent="X "+hover[0].toFixed(2)+" m · Z "+hover[1].toFixed(2)+" m";
    }
  }
  function syncGuides(){
    if(!active)return;
    remove(guides);guides=outlines(f,state,corners);stage.scene.add(guides);syncCursor();stage.render();
  }
  function modelLabel(){
    q("#plantFrame").textContent=f?.calibrated?f.basis+" · flat illustrative ground, not a survey.":"Calibrate the vector PDF under Plans using a written dimension first. A photo or assumed scale cannot be planted to metres.";
    q("#plantToolsPanel").hidden=!f?.calibrated;
  }
  const exportButton=q("#plantSave"), file=q("#plantLoad");
  function buttons(){
    for(const el of edit.querySelectorAll("[data-plant-mode]")){
      const selected=el.dataset.plantMode===mode;
      el.setAttribute("aria-pressed",String(selected));el.classList.toggle("on",selected);
      el.disabled=(!state.beds.length&&["paint","erase","exclude"].includes(el.dataset.plantMode));
    }
    const draw=mode==="bed"||mode==="exclude";
    q("#plantBoundaryActions").hidden=!draw;q("#plantFinishRing").disabled=corners.length<3;
    q("#plantUndo").disabled=!before.length;exportButton.disabled=!state.beds.length;
    q("#plantMixSample").hidden=!f.sample||state.beds.length>0;
  }
  function setMode(next, message=true){
    corners=[];drag=null;mode=next;
    if(message)tell(({bed:"Mark at least three corners, then choose Finish area.",exclude:"Mark a path or a hard surface you don’t want planted.",paint:"Drag across the bed to plant selected natives.",erase:"Drag across the bed to erase plants."})[mode]);
    buttons();syncGuides();
  }
  function commit(next, message){
    if(state!==next){before.push(state);if(before.length>40)before.shift();state=next;projects.set(project,state);}
    tell(message);buttons();syncPlants();syncGuides();
  }
  function dismiss(){
    if(!active){edit.hidden=true;toggle.setAttribute("aria-expanded","false");return;}
    active=false;drag=null;corners=[];hover=null;circle.visible=false;remove(guides);guides=null;
    window.removeEventListener("keydown",escape);
    canvas.removeEventListener("keydown",key);canvas.removeEventListener("pointerdown",down);canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerup",up);canvas.removeEventListener("lostpointercapture",lost);
    canvas.tabIndex=prior.tabIndex;canvas.setAttribute("aria-label",prior.label||"3D model");
    stage.ctl.enabled=prior.enabled;stage.render=prior.render;
    if(plants)plants.visible=visible;toggle.setAttribute("aria-expanded","false");edit.hidden=true;
    stage.resize();stage.render();onExit?.();
  }
  function sample(P){
    project=P;f=frame(P);if(!f)return;
    state=projects.get(P)||empty(f);
    if(state.frame!==f.key)state=empty(f);else{
      const valid=state.plants.length;
      try{state=importPlanting(state,f);}catch{state=empty(f);if(valid)tell("The plan constraints changed. Reopen the bed to review proposed planting.");}
    }
    projects.set(P,state);
  }
  function select(P){
    if(project===P)return;
    if(active)dismiss();before=[];season.value="0";sample(P);syncPlants();
  }
  function update(P){
    if(project!==P){select(P);return;}
    if(!f)return;
    // Reapply blockers if the building entrance or geometry changes. Never
    // keep a plant whose root now falls on the revised hard surface.
    const next=frame(P);
    if(next?.key!==f.key){before=[];sample(P);syncPlants();if(active)dismiss();return;}
    f=next;
    if(state?.plants.length){
      let nextState;try{nextState=importPlanting(state,f);}catch{
        const nl={...state,plants:[]};
        for(const p of state.plants)try{importPlanting({...nl,plants:[p]},f);nl.plants.push(p);}catch{}
        nextState=nl;
      }
      if(nextState.plants.length!==state.plants.length){before=[];state=nextState;projects.set(P,state);syncPlants();}
    }
    if(active)syncGuides();
  }
  function open(P){
    if(active){dismiss();return;}
    if(!edit.hidden){dismiss();return;}
    select(P);toggle.setAttribute("aria-expanded","true");edit.hidden=false;modelLabel();
    if(!f?.calibrated)return;
    showSolid();active=true;prior={render:stage.render,enabled:stage.ctl.enabled,tabIndex:canvas.tabIndex,label:canvas.getAttribute("aria-label")};
    stage.ctl.enabled=false;stage.render=paintScene;
    canvas.tabIndex=0;canvas.setAttribute("aria-label","Planting plan. Arrow keys move the cursor in half-metre steps. Space stamps or adds a corner. Escape closes.");
    canvas.addEventListener("keydown",key);canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerup",up);canvas.addEventListener("lostpointercapture",lost);
    window.addEventListener("keydown",escape);if(plants)plants.visible=true;
    hover=[f.box[0]+.5,f.box[3]+1.5];
    setMode(state.beds.length?"paint":"bed",true);renderMix();renderSchedule();stage.resize();stage.render();
    q("#plantExit").focus({preventScroll:true});
  }
  function place(p){
    if(!p)return;
    if(mode==="bed"||mode==="exclude"){
      if(corners.length>=MAX_VERTICES){tell("Finish the current boundary before adding more corners.");return;}
      corners.push(p);buttons();syncGuides();
    }else stroke([p]);
  }
  function stroke(track){
    const next=paint(state,f,track,{species:species.value,radius:radius(),erase:mode==="erase"}), diff=next.plants.length-count();
    commit(next,diff>0?(diff+" added. "+next.plants.length+" proposed."):diff<0?(-diff+" removed. "+next.plants.length+" proposed."):count()>=MAX_PLANTS?"The plan has reached the 420-plant limit.":"No changes. Check the bed, path or spacing.");
  }
  function pos(e){
    const rect=canvas.getBoundingClientRect();
    const v=new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
    plane.constant=-f.y;ray.setFromCamera(v,camera);const h=ray.ray.intersectPlane(plane,target);
    return h?[Math.round(h.x*1000)/1000,Math.round(h.z*1000)/1000]:null;
  }
  function down(e){
    if(!active||!e.isPrimary||e.button!==0)return;const p=pos(e);if(!p)return;
    hover=p;drag={id:e.pointerId,track:[p]};canvas.setPointerCapture(e.pointerId);syncCursor();stage.render();
  }
  function move(e){
    if(!active||!e.isPrimary)return;const p=pos(e);if(!p)return;hover=p;syncCursor();stage.render();
    if(drag?.id===e.pointerId&&drag.track.length<639){
      const old=drag.track.at(-1);if(Math.hypot(p[0]-old[0],p[1]-old[1])>=.09)drag.track.push(p);
    }
  }
  function up(e){
    if(drag?.id!==e.pointerId)return;
    const p=pos(e),points=drag.track;drag=null;
    if(mode==="bed"||mode==="exclude")place(p);else stroke(p?[...points,p]:points);
  }
  function lost(){drag=null;}
  function escape(e){if(active&&e.key==="Escape"){dismiss();toggle.focus();}}
  function key(e){
    if(!active)return;
    const deltas={ArrowLeft:[-.5,0],ArrowRight:[.5,0],ArrowUp:[0,-.5],ArrowDown:[0,.5]};
    if(deltas[e.key]&&hover){e.preventDefault();hover=[hover[0]+deltas[e.key][0],hover[1]+deltas[e.key][1]];syncCursor();stage.render();}
    if((e.key===" "||e.key==="Enter")&&hover){e.preventDefault();place(hover.slice());}
  }
  edit.querySelectorAll("[data-plant-mode]").forEach(el=>el.addEventListener("click",()=>setMode(el.dataset.plantMode)));
  q("#plantViewBed").addEventListener("click",()=>{
    if(!count())return;
    const [a,b,c,d]=f.box, pts=state.plants, [x,z]=pts.reduce(([i,j],p)=>[i+p.x/pts.length,j+p.z/pts.length],[0,0]);
    const axis=new T.Vector3(x-(a+c)/2,0,z-(b+d)/2);
    if(axis.length()<.1)axis.set(-1,0,0);axis.normalize();
    const view=new T.Vector3(x,f.y+1.1,z).addScaledVector(axis,-1.2);
    const extent=Math.max(...pts.map(p=>Math.hypot(p.x-x,p.z-z)),2), distance=6.4+extent*.84;
    dismiss();
    visible=true;q("#plantVisual").checked=true;if(plants)plants.visible=true;
    stage.camera.position.copy(view).addScaledVector(axis,distance).addScaledVector(new T.Vector3(-axis.z,0,axis.x),-distance*.52).setY(f.y+4.5+extent*.19);
    stage.camera.fov=45;stage.camera.updateProjectionMatrix();stage.target.copy(view);stage.sync();
    document.querySelector("#stage3d").scrollIntoView({block:"center",behavior:"instant"});
  });
  q("#plantExit").addEventListener("click",()=>{dismiss();edit.hidden=true;toggle.setAttribute("aria-expanded","false");toggle.focus();});
  q("#plantMixSample").addEventListener("click",()=>{
    if(!active||!f.sample||state.beds.length)return;
    const sample=setArea(state,f,"bed",[[-6,-12],[-1,-12],[-1,2],[-6,2]]);
    const filled=paint(sample,f,[[-4,-10],[-3.5,-5],[-3,0]],{species:MIX,radius:2.9});
    species.value=MIX;renderMix();season.value="10";
    setMode("paint",false);commit(filled,"Fictional layered sample loaded. Undo removes the sample bed and all its plants.");schedule.open=true;
  });
  q("#plantFocus").addEventListener("click",()=>{canvas.focus();canvas.scrollIntoView({block:"center"});});
  q("#plantVisual").addEventListener("change",e=>{visible=e.target.checked;if(plants)plants.visible=visible||active;stage.render();});
  q("#plantRadius").addEventListener("input",()=>{q("#plantRadiusValue").textContent=radius()+" m";syncCursor();stage.render();});
  q("#plantFinishRing").addEventListener("click",()=>{
    try{
      const excluding=mode==="exclude", next=setArea(state,f,mode,corners);
      setMode("paint",false);commit(next,excluding?"No-plant area added.":"Bed saved. Paint within its outline.");
    }catch(e){tell(e.message);}
  });
  q("#plantCancelRing").addEventListener("click",()=>setMode(state.beds.length?"paint":"bed"));
  q("#plantUndo").addEventListener("click",()=>{if(!before.length)return;state=before.pop();projects.set(project,state);tell("Last planting change undone.");buttons();syncPlants();syncGuides();});
  exportButton.addEventListener("click",()=>save(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),"proposed-planting.json"));
  file.addEventListener("change",async e=>{
    const blob=e.target.files[0], p=project; e.target.value="";
    if(!blob)return;
    try{
      if(blob.size>800000)throw Error("Planting file is too large.");
      const json=JSON.parse(await blob.text());if(p!==project||!active)return;
      const safe=importPlanting(json.proposed_planting??json,f);setMode("paint",false);commit(safe,"Proposed planting loaded for this calibrated model.");
    }catch(e){tell(e.message);}
  });
  return {open,select,update,close:dismiss,get active(){return active;},saved(P){return projects.get(P);}};
}
