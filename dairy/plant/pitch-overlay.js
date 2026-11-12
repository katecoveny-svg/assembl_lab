// Illustrative outage-pitch visual overlay. No plant controls or external APIs.
export function installPitch({THREE,scene,camera,controls}) {
 const g=new THREE.Group();g.position.set(25,0,20);scene.add(g);
 const steel=new THREE.MeshStandardMaterial({color:0xbcc5ca,metalness:.86,roughness:.28});
 const paint=new THREE.MeshStandardMaterial({color:0x443046,metalness:.25,roughness:.42});
 const dark=new THREE.MeshStandardMaterial({color:0x24292c,roughness:.72});
 const brass=new THREE.MeshStandardMaterial({color:0xa18b57,metalness:.75,roughness:.32});
 function box(w,h,d,x,y,z,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;}
 function cyl(r,len,x,y,z,m,axis){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,32),m);if(axis==='x')o.rotation.z=Math.PI/2;if(axis==='z')o.rotation.x=Math.PI/2;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;}
 box(7,.22,3.5,0,.2,0,steel);
 for(const x of [-2.7,2.7])box(.25,.45,3.1,x,.4,0,steel);
 for(const z of [-.85,.85]){
  cyl(.62,1.65,-1.5,1.15,z,paint,'x');cyl(.46,1.8,.3,1.15,z,steel,'x');
  // motor cooling fins and coupling guards
  for(let i=0;i<12;i++)cyl(.66,.04,-2.23+i*.13,1.15,z,paint,'x');
  cyl(.69,.12,-2.4,1.15,z,dark,'x');box(.8,.35,.75,-1.45,1.9,z,paint);
  cyl(.7,.18,1.25,1.15,z,steel,'x');
  for(let j=0;j<8;j++){const a=j*Math.PI/4;cyl(.055,.14,1.37,1.15+Math.cos(a)*.55,z+Math.sin(a)*.55,brass,'x');}
  cyl(.18,2.3,1.9,2.1,z,steel);cyl(.28,.12,1.9,3.15,z,steel);
  const wheel=new THREE.Mesh(new THREE.TorusGeometry(.32,.035,8,24),paint);wheel.position.set(1.9,2.8,z+.25);g.add(wheel);
 }
 box(.8,1.8,.4,-3.1,1.35,0,paint);
 const lamp=new THREE.Mesh(new THREE.SphereGeometry(.12,16,12),new THREE.MeshStandardMaterial({color:0xffb44b,emissive:0xff8a16,emissiveIntensity:.6}));lamp.position.set(-3.1,2.45,0);g.add(lamp);
 const badge=document.createElement('div');badge.style.cssText='position:absolute;bottom:65px;left:16px;max-width:85%;padding:12px 16px;border-radius:16px;background:#fff8ef;color:#432338;font:13px/1.4 system-ui;z-index:20;pointer-events:none';
 badge.textContent='Illustrative CP-04 cooling skid · workshop overlay, not a plant control';document.querySelector('#stage').append(badge);
 const markers=[];
 function clear(){for(const o of markers){scene.remove(o);o.geometry.dispose();o.material.dispose();}markers.length=0;}
 const targets={Cooling:[[25,2,20],[48,4,-18],[83,3,2]],Steam:[[6,15,-14],[17,35,-18]],Power:[[25,2,20],[48,4,-18]],'Compressed air':[[48,4,-18],[60,3,-4]],'CIP water':[[-28,10,-14],[6,15,-14]]};
 function apply(data){clear();const pts=targets[data.service]||targets.Cooling;for(const p of pts){const ring=new THREE.Mesh(new THREE.TorusGeometry(3,.10,8,48),new THREE.MeshBasicMaterial({color:data.approved?0x6b9b81:0xf0a647}));ring.rotation.x=Math.PI/2;ring.position.set(...p);scene.add(ring);markers.push(ring);}
 badge.textContent=(data.approved?'SIMULATED RESPONSE APPROVED':'POTENTIAL IMPACT')+' · '+data.service+' · '+(data.fault==='false'?'false-alarm scenario':data.fault==='missed'?'missed-fault scenario':'true-fault scenario')+'. No live data or action.';
 lamp.material.emissiveIntensity=data.approved?.15:1.2;
 if(data.focus){camera.position.set(38,9,35);controls.target.set(25,1,20);controls.update();}
 }
 window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='assembl-outage')return;const d=e.data;if(!Object.hasOwn(targets,d.service)||!['true','false','missed'].includes(d.fault))return;apply(d);});
 parent.postMessage({type:'assembl-plant-ready'},location.origin);
 return g;
}
