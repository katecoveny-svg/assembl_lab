/** Same-device native AR handoff; no permissions requested until the user taps. */
export function routeFor(entry,{quickLook=false,android=false,secure=true}={}) {
 if(entry.status!=='exported')return 'unavailable';
 if(!secure)return 'insecure';
 if(quickLook&&entry.usdz)return 'quick-look';
 if(android&&entry.glb)return 'scene-viewer';
 return 'download';
}
export function sceneViewerURL(entry,origin) {
 const file=new URL(entry.glb,origin).href, fallback=new URL(entry.page,origin);fallback.searchParams.set('ar-fallback','1');
 return `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(file)}&mode=ar_preferred&title=${encodeURIComponent(entry.title)}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;S.browser_fallback_url=${encodeURIComponent(fallback.href)};end;`;
}
export async function mountStudyAR(container,id) {
 if(!(container instanceof HTMLElement))throw new TypeError('AR mount requires an element');
 container.replaceChildren();container.classList.add('study-ar');
 const text=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;container.append(e);return e};
 try {
 const response=await fetch('/study/ar/manifest.json');if(!response.ok)throw Error('Manifest unavailable');
 const manifest=await response.json(), entry=manifest.experiences.find(e=>e.id===id);if(!entry)throw Error('Unknown learning experience');
 text('h2','Take a closer look');const note=text('p',entry.note);
 const test=document.createElement('a');let quickLook=false;try{quickLook=test.relList.supports('ar')&&(/iPhone|iPad|iPod/i.test(navigator.userAgent)||(/Macintosh/i.test(navigator.userAgent)&&navigator.maxTouchPoints>1))}catch{}
 const route=routeFor(entry,{quickLook,android:/Android/i.test(navigator.userAgent),secure:isSecureContext});
 const link=(label,href)=>{const a=text('a',label);a.href=href;return a};
 link('Continue the lesson',entry.page);
 if(entry.creditUrl)link('Model source and licence',entry.creditUrl);
 if(route==='quick-look'||route==='scene-viewer'){
  const a=link('View in your space',route==='quick-look'?entry.usdz:sceneViewerURL(entry,location.origin));a.className='study-ar-launch';
  if(route==='quick-look'){a.rel='ar';const image=document.createElement('img');image.src='/study/ar/cube.svg';image.alt='';image.width=24;image.height=24;a.prepend(image);}
  text('p',route==='quick-look'?'Opens Apple Quick Look. Choose AR to place the model; close the viewer to return to your lesson.':'Opens Google Scene Viewer. AR needs a compatible phone and Google AR services; otherwise a 3D view may open. Use Back to return.');
 }else if(route==='download')text('p','Open this page on an AR-capable phone to place the model. You can download the 3D files below.');
 else if(route==='insecure')text('p','Open this page over HTTPS to launch AR.');
 if(entry.status==='exported'){
  for(const [label,path,bytes] of [['Download GLB',entry.glb,entry.glbBytes],['Download USDZ',entry.usdz,entry.usdzBytes]]){const a=link(`${label} (${(bytes/1048576).toFixed(1)} MB)`,path);a.download='';}
 }
 const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Share to another device';details.append(summary);
 const img=document.createElement('img');img.src=entry.qr;img.alt=`QR code opening ${entry.title}`;img.width=240;img.height=288;details.append(img);
 const share=document.createElement('a');share.href=entry.page;share.textContent='Open learning experience';details.append(share);container.append(details);
 if(new URL(location.href).searchParams.has('ar-fallback'))text('p','AR could not open on this device. Continue exploring the model in the lesson.');
 return {entry,route,destroy(){container.replaceChildren()}};
 }catch(error){text('p','AR files are unavailable right now. Your lesson still works.');return {error};}
}
