const stage=document.querySelector('#stage'),poster=document.querySelector('#poster'),status=document.querySelector('#status'),hint=document.querySelector('#hint');
const shower=document.querySelector('#shower'),reset=document.querySelector('#reset'),close=document.querySelector('#close');
const announce=s=>{status.textContent=s;};
function still(){
  stage.dataset.mode='stills';poster.hidden=false;close.hidden=true;shower.disabled=reset.disabled=false;
  hint.textContent='Compare two still views of the same moss.';
  shower.textContent='Show wet moss';reset.textContent='Show dry moss';
  const show=wet=>{poster.src=wet?'./wet.webp':'./dry.webp';poster.alt=wet?'The same moss cushion after rain, with green leaves and water droplets.':'Dry moss with silver leaf tips on volcanic stone.';announce(poster.alt);};
  shower.onclick=()=>show(true);reset.onclick=()=>show(false);
}
async function start(){
  if(navigator.connection?.saveData){still();return;}
  let scene,canvas;
  try{
    const {createScene}=await import('./scene.js');canvas=document.createElement('canvas');canvas.tabIndex=0;
    canvas.setAttribute('aria-label','Moss on volcanic stone. Press Enter to wet a patch. Use left and right arrows to turn the view.');stage.append(canvas);
    scene=createScene(canvas,announce);stage.dataset.mode='3d';poster.hidden=true;
    reset.disabled=shower.disabled=close.disabled=false;shower.onclick=scene.shower;
    close.onclick=()=>close.setAttribute('aria-pressed',String(scene.closer()));
    reset.onclick=()=>{scene.reset();close.setAttribute('aria-pressed','false');};
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();scene.dispose();canvas.remove();still();},{once:true});
  }catch(error){scene?.dispose();canvas?.remove();still();console.warn('The still comparison is available.',error.message);}
}
start();
