export const ROUTE='/api/render';
const LIVE_RENDER='https://lab.assembl.co.nz/api/render';
export function routesFor(origin){
  let u;try{u=new URL(origin);}catch{return [ROUTE];}
  return u.protocol==='https:'&&!u.port&&/^[a-z0-9-]+\.assembl-lab\.pages\.dev$/i.test(u.hostname)
    ? [ROUTE,LIVE_RENDER] : [ROUTE];
}
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
  let svc,endpoint=ROUTE,frame='',line='',busy=false,resultVersion=0,frameSeq=0,guideSeq=0,guidePending=false;
  const stage=m=>q('status').textContent=m;
  function update(){run.disabled=!(svc?.configured&&Number.isFinite(svc?.estimate?.best?.usd)&&frame&&agree.checked&&!busy&&!guidePending);}
  function reset(){resultVersion++;agree.checked=false;q('save').hidden=q('result').hidden=true;q('result').removeAttribute('src');q('save').removeAttribute('href');update();}
  f.addEventListener('change',async()=>{
    reset();const v=++frameSeq;frame='';q('original').hidden=true;update();
    try{
      const src=await readFile(f.files[0],3_500_000);
      const img=await decoded(src);
      if(v!==frameSeq)return;
      if(img.width<256||img.height<256||img.width>4096||img.height>4096)throw new Error('Use an image between 256 and 4096 pixels on each side.');
      frame=src;q('original').src=src;q('original').hidden=false;stage('Original loaded on this device. It has not been sent.');
    }catch(e){if(v===frameSeq)stage(e.message);}
    update();
  });
  guide.addEventListener('change',async()=>{
    reset();const v=++guideSeq;line='';guidePending=!!guide.files[0];update();
    if(!guidePending)return;
    try{const src=await readFile(guide.files[0],1_450_000);if(v===guideSeq)line=src;}
    catch(e){if(v===guideSeq){guide.value='';stage(e.message);}}
    finally{if(v===guideSeq){guidePending=false;update();}}
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
      const response=await fetch(endpoint,{method:'POST',credentials:'omit',headers:{'content-type':'application/json'},body:bodyFor(payload)});
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
    for(const url of routesFor(location.origin)){
      try {
        const res=await fetch(url,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(7000)});
        if(!res.ok)continue;
        svc=await res.json();endpoint=url;
        if(svc.configured)break;
      } catch { /* status reads only; never retry a paid POST */ }
    }
    if(!svc)throw new Error();
    q('service').textContent=svc.configured ?
      (endpoint===LIVE_RENDER ? 'Uses the existing production Lab Gemini connection. Only submit approved frames.' : 'Cloudflare Gemini connection configured.') :
      'No Gemini key is configured on an accessible Lab connection; no job will be sent.';
    const b=svc.estimate?.best;
    q('quote').textContent=b?.text?'Best quality · '+(svc.sizes?.best??'')+' · '+b.text:'No price is available. Rendering disabled.';
  }catch{q('service').textContent='Could not check the Cloudflare render service. Nothing has been sent.';}
  update();
}
if(typeof document!=='undefined')void mount();
