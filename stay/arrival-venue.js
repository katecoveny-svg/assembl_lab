// Lightweight reception furniture in the existing metre-scale illustrative lodge.
// No changes to room layout, state colouring, guest paths or shared stage.
export function dressArrivalVenue(stage,L){
 const {THREE,M}=stage,g=new THREE.Group();g.name='Arrival_reception_furniture_metres';stage.root.add(g);
 const plum=new THREE.MeshStandardMaterial({color:0x492b3e,roughness:.78}),linen=new THREE.MeshStandardMaterial({color:0xf1e9df,roughness:.9});
 const box=(n,size,pos,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.name=n;m.position.set(...pos);m.castShadow=m.receiveShadow=true;g.add(m);return m;};
 const p=L.desk;
 box('Welcome_counter_oak',[2.4,.95,.6],[p.x,.5,p.z+.85],M.timber);
 box('Welcome_counter_stone_top',[2.55,.09,.72],[p.x,1.02,p.z+.85],linen);
 box('Registration_screen',[.45,.28,.05],[p.x-.6,1.22,p.z+.85],M.dark);
 box('Registration_screen_stand',[.09,.16,.12],[p.x-.6,1.08,p.z+.85],M.steel);
 for(let i=0;i<12;i++)box('Counter_timber_batten_'+i,[.035,.78,.035],[p.x-1.1+i*.2,.52,p.z+1.17],M.timber);
 // Tactile luggage-rest beside the arrival path, not a data marker.
 box('Luggage_bench',[1.8,.10,.65],[p.x-2,.52,p.z+1.25],M.timber);
 for(const x of [-.7,.7])box('Bench_steel_leg',[.07,.5,.55],[p.x-2+x,.25,p.z+1.25],M.steel);
 box('Suitcase',[.48,.65,.28],[p.x-2.2,.9,p.z+1.25],plum);
 box('Suitcase_handle',[.2,.06,.06],[p.x-2.2,1.27,p.z+1.25],M.steel);
 const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#492b3e';ctx.fillRect(0,0,512,128);ctx.fillStyle='#fffdfb';ctx.font='500 44px sans-serif';ctx.textAlign='center';ctx.fillText('Kia ora · Reception',256,81);
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.3,.575),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(c),roughness:.8}));sign.name='Reception_sign';sign.position.set(p.x,1.7,p.z+.71);g.add(sign);
 return g;
}
