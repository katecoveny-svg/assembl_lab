export const ROUTE='/api/render';
const mime=/^image\/(?:png|jpeg|webp)$/u;
const sources=/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/]+={0,2}$/u;
const allowedTimes=new Set(['golden','morning','midday','overcast']);
export function bodyFor({frame,guide,time,consent,service}) {
  if(!consent)throw new Error('Approve this one render before submitting.');
  if(!service?.configured||service?.needs_confirm!==true||!Number.isFinite(service?.estimate?.best?.usd))
    throw new Error('The Cloudflare connection and a Best-quality estimate are required.');
  if(!sources.test(frame)|| typeof guide!=='string'|| (guide&&!sources.test(guide))|| !allowedTimes.has(time))
    throw new Error('Select a valid image and light.');
  const payload={image:frame,quality:'best',look:{time},confirm:true};
  if(guide)payload.line=guide;
  const text=JSON.stringify(payload);
  if(text.length>=Number(service.limits?.max_body_bytes??5000000))throw new Error('Image and guide exceed the service limit. Export a smaller frame.');
  return text;
}
function readFile(file,cap){
  if(!file||file.size<1||file.size>cap||!mime.test(file.type))return Promise.reject(new Error('Use a PNG, JPEG or WebP within the size shown.'));
  return new Promise((resolve,reject)=>{
    const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);
  });
}
function decoded(src){
  return new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=()=>no(new Error('The image could not be read.'));im.src=src;});
}
async function label(src){
  const im=await decoded(src),c=document.createElement('canvas');c.width=im.width;c.height=im.height+Math.max(34,Math.round(im.height*.055));
  const x=c.getContext('2d');x.fillStyle='#291f23';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0);
  x.fillStyle='#fffdfb';x.textBaseline='middle';x.font=Math.max(13,Math.round(im.width*.014))+'px system-ui';
  x.fillText('AI-enhanced look study · Not a checked render',14,im.height+(c.height-im.height)/2);
  return c.toDataURL('image/jpeg',.91);
}
async function mount(){
  const q=id=>document.getElementById(id),f=q('frame'),guide=q('guide'),run=q('run'),agree=q('consent'),time=q('time');
  let svc,frame='',line='',busy=false,resultVersion=0;
  const stage=m=>q('status').textContent=m;
  function update(){run.disabled=!(svc?.configured&&Number.isFinite(svc?.estimate?.best?.usd)&&frame&&agree.checked&&!busy);}
  function reset(){resultVersion++;agree.checked=false;q('save').hidden=q('result').hidden=true;q('result').removeAttribute('src');q('save').removeAttribute('href');update();}
  f.addEventListener('change',async()=>{
    reset();const v=resultVersion;frame='';q('original').hidden=true;update();
    try{
      const src=await readFile(f.files[0],3_500_000);
      const img=await decoded(src);
      if(v!==resultVersion)return;
      if(img.width<256||img.height<256||img.width>4096||img.height>4096)throw new Error('Use an image between 256 and 4096 pixels on each side.');
      frame=src;q('original').src=src;q('original').hidden=false;stage('Original loaded on this device. It has not been sent.');
    }catch(e){if(v===resultVersion)stage(e.message);}
    update();
  });
  guide.addEventListener('change',async()=>{
    reset();const v=resultVersion;line='';
    if(!guide.files[0])return;
    try{const src=await readFile(guide.files[0],1_450_000);if(v===resultVersion)line=src;}catch(e){if(v===resultVersion){guide.value='';stage(e.message);}}
    update();
  });
  time.addEventListener('change',reset);
  agree.addEventListener('change',update);
  run.addEventListener('click',async()=>{
    if(run.disabled||busy)return;
    const version=resultVersion;
    const payload={frame,guide:line,time:time.value,consent:agree.checked,service:svc};
    busy=true;agree.checked=false;update();[f,guide,time,agree].forEach(x=>x.disabled=true);
    stage('Rendering one frame with Gemini…');
    try{
      const response=await fetch(ROUTE,{method:'POST',headers:{'content-type':'application/json'},body:bodyFor(payload)});
      const data=await response.json();
      if(!response.ok||!sources.test(data?.image))throw new Error(data?.message||'No render was returned. Check your project before retrying.');
      const jpg=await label(data.image);
      if(version!==resultVersion)return;
      q('result').src=jpg;q('result').hidden=false;q('save').download='assembl-ai-look-study.jpg';q('save').href=jpg;q('save').hidden=false;
      stage('Compare the result with the model. Keep it only as a look study.');
    }catch(e){stage(e.message);}
    finally{busy=false;[f,guide,time,agree].forEach(x=>x.disabled=false);update();}
  });
  try{
    const res=await fetch(ROUTE,{cache:'no-store'});
    if(!res.ok)throw new Error();
    svc=await res.json();
    q('service').textContent=svc.configured?'Cloudflare Gemini connection configured.':'This environment has no Gemini key configured; no job will be sent.';
    const b=svc.estimate?.best;
    q('quote').textContent=b?.text?'Best quality · '+(svc.sizes?.best??'')+' · '+b.text:'No price is available. Rendering disabled.';
  }catch{q('service').textContent='Could not check the Cloudflare render service. Nothing has been sent.';}
  update();
}
if(typeof document!=='undefined')void mount();
