import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Authored meal illustrations, not scans. One shared mesh per dish family; no food spheres.
export function pendingPassItems(pass, carried = new Set(), limit = 12) {
  return pass.filter(ticket => ticket.out < 0 && ticket.out !== -2 && !carried.has(ticket.id))
    .flatMap(ticket => ticket.items).slice(0, limit);
}
export const dishFamily = key => {
  if (['soup', 'curry', 'bircher', 'risotto'].includes(key)) return 'bowl';
  if (['salad', 'burrata', 'avo'].includes(key)) return 'salad';
  if (['pasta'].includes(key)) return 'pasta';
  if (['bread', 'toastie', 'bene', 'big', 'mush', 'fritter'].includes(key)) return 'toast';
  if (['burger'].includes(key)) return 'burger';
  if (['brownie', 'tart', 'brulee', 'muffin', 'scone', 'cheese'].includes(key)) return 'dessert';
  if (['steak', 'lamb', 'pork', 'chicken'].includes(key)) return 'grill';
  return 'fish';
};

function buildDish(family) {
  const parts = [];
  const add = (g, colour, pos = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) => {
    const geo = g.index ? g.toNonIndexed() : g;
    if (geo !== g) g.dispose();
    geo.rotateX(rotation[0]); geo.rotateY(rotation[1]); geo.rotateZ(rotation[2]); geo.scale(...scale); geo.translate(...pos);
    const a = geo.getAttribute('position'), c = new THREE.Color(colour), rgb = new Float32Array(a.count * 3);
    for (let i = 0; i < a.count; i++) { const grain = .94 + .06 * Math.sin(a.getX(i) * 834 + a.getY(i) * 619 + a.getZ(i) * 357); rgb.set([c.r * grain, c.g * grain, c.b * grain], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(rgb, 3)); parts.push(geo);
  };
  const oval = (c, p, s, r = [0, 0, 0]) => add(new THREE.SphereGeometry(1, 20, 12), c, p, s, r);
  const box = (c, p, s, turn = 0) => add(new THREE.BoxGeometry(...s, 2, 1, 2), c, p, [1, 1, 1], [0, turn, 0]);
  const leaf = (x, z, a, y = .043) => {
    const g = new THREE.PlaneGeometry(.033, .055, 3, 6), p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) { const t = p.getY(i) / .055 * 2; p.setX(i, p.getX(i) * Math.sqrt(Math.max(.03, 1-t*t))); p.setZ(i, .005 * Math.sin(t * 3) + .003 * Math.cos(p.getX(i) * 150)); }
    g.computeVertexNormals(); add(g, '#527331', [x, y, z], [1, 1, 1], [-Math.PI / 2, 0, a]);
  };
  const garnish = () => { for (let i = 0; i < 9; i++) leaf(.05 + Math.cos(i * 2.4) * .025, .035 + Math.sin(i * 2.4) * .026, i * .7, .031 + i % 3 * .005); };
  const tomato = (x, z) => {
    oval('#A83B20', [x,.04,z], [.019,.009,.019]);
    add(new THREE.CircleGeometry(.016,24), '#D15D35',[x,.05,z],[1,1,1],[-Math.PI/2,0,0]);
    for(let k=0;k<4;k++) oval('#E9BF70',[x+Math.cos(k*1.57)*.009,.0508,z+Math.sin(k*1.57)*.009],[.002,.001,.003]);
  };
  if (family === 'toast') {
    for(let i=0;i<2;i++) {
      box('#A76C31',[-.025+i*.038,.034,-.008+i*.024],[.085,.015,.052],-.3);
      box('#E2C58D',[-.025+i*.038,.042,-.008+i*.024],[.076,.004,.045],-.3);
      for(let j=0;j<5;j++) box('#725132',[-.05+i*.038+j*.013,.045,-.008+i*.024],[.002,.001,.043],-.3);
    }
    garnish(); tomato(-.063,.04);
  } else if(family === 'grill' || family === 'fish') {
    oval(family==='grill'?'#71462D':'#D2AF7B',[-.028,.041,-.016],[.063,.014,.034],[0,.3,0]);
    for(let j=0;j<6;j++) box(family==='grill'?'#382A20':'#957142',[-.073+j*.018,.055,-.015+j*.004],[.0025,.0015,.05],-.2);
    garnish(); tomato(.065,-.04);
    for(let i=0;i<3;i++) oval('#C39E53',[-.06+i*.025,.034,.055],[.014,.009,.011]);
  } else if(family === 'salad') {
    for(let i=0;i<23;i++) leaf(Math.cos(i*2.4)*(.025+i%3*.018),Math.sin(i*2.4)*(.025+i%4*.013),i,.025+i%5*.005);
    [[-.04,-.03],[.045,.015],[-.015,.052],[.03,-.05]].forEach(([x,z])=>tomato(x,z));
    for(let i=0;i<6;i++) box('#EFE3C6',[Math.cos(i)*.05,.057,Math.sin(i)*.04],[.013,.012,.013],i);
  } else if(family==='pasta') {
    for(let i=0;i<23;i++) {
      const a=i*2.4,r=.012+i%5*.011,y=.03+i%4*.005;
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r),new THREE.Vector3(Math.cos(a+.8)*(r+.01),y+.008,Math.sin(a+.8)*(r+.01)),new THREE.Vector3(Math.cos(a+1.6)*r,y,Math.sin(a+1.6)*r)]);
      add(new THREE.TubeGeometry(curve,10,.003,5,false),'#D2A149');
    }
    tomato(.04,-.03); leaf(0,0,.5,.061);
  } else if(family==='bowl') {
    const profile=[[0,.016],[.038,.016],[.059,.028],[.076,.055],[.08,.058],[.082,.053],[.062,.021],[.04,.01],[0,.01]].map(([x,y])=>new THREE.Vector2(x,y));
    add(new THREE.LatheGeometry(profile,48),'#D7CFC1');
    add(new THREE.CylinderGeometry(.068,.057,.003,48),'#C89957',[0,.044,0]);
    for(let i=0;i<7;i++) leaf(Math.cos(i)*.025,Math.sin(i)*.025,i,.051);
  } else if(family==='burger') {
    oval('#A86C31',[0,.033,0],[.057,.011,.054]);
    oval('#563E2B',[0,.05,0],[.055,.009,.05]);
    for(let i=0;i<7;i++) leaf(Math.cos(i)*.037,Math.sin(i)*.037,i,.062);
    oval('#BE8A49',[0,.078,0],[.06,.022,.055]);
    for(let i=0;i<15;i++) oval('#E5D0A1',[Math.cos(i*2.4)*.04,.096-i%3*.002,Math.sin(i*2.4)*.038],[.002,.0008,.0008]);
  } else {
    box('#4D2D24',[0,.039,0],[.067,.03,.06],.2);
    box('#36231F',[0,.056,0],[.067,.004,.06],.2);
    for(let i=0;i<5;i++) oval('#AD423D',[.047+Math.cos(i)*.009,.029,.035+Math.sin(i)*.009],[.007,.006,.007]);
    leaf(-.04,.037,.5,.024);
  }
  const merged = mergeGeometries(parts); parts.forEach(p=>p.dispose());
  return merged;
}

export function createFoodService(root, max=90) {
  const plateProfile=[[0,-.009],[.064,-.009],[.071,-.006],[.085,-.003],[.123,.012],[.135,.015],[.137,.012],[.124,.007],[.084,-.009],[.07,-.014],[0,-.014]].map(([r,y])=>new THREE.Vector2(r,y));
  const plates=new THREE.InstancedMesh(new THREE.LatheGeometry(plateProfile,64),new THREE.MeshPhysicalMaterial({color:'#EEE8DC',roughness:.25,clearcoat:.2,clearcoatRoughness:.22}),max);
  plates.name='SERVICE_CERAMIC_PLATES'; root.add(plates);
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.72,side:THREE.DoubleSide});
  const batches=Object.fromEntries(['toast','grill','fish','salad','pasta','bowl','burger','dessert'].map(key=>{const mesh=new THREE.InstancedMesh(buildDish(key),material,max);mesh.name=`SERVICE_FOOD_${key}`;root.add(mesh);return[key,mesh];}));
  const meshes=[plates,...Object.values(batches)]; meshes.forEach(m=>{m.count=0;m.frustumCulled=false;m.raycast=()=>{};m.castShadow=true;m.receiveShadow=true;});
  const transform=new THREE.Object3D();
  return {
    reset(){meshes.forEach(m=>m.count=0);},
    place(x,y,z,key){if(plates.count>=max)return;transform.position.set(x,y,z);transform.rotation.set(0,(plates.count%5)*.27,0);transform.updateMatrix();plates.setMatrixAt(plates.count++,transform.matrix);const food=batches[dishFamily(key)];food.setMatrixAt(food.count++,transform.matrix);},
    commit(){meshes.forEach(m=>m.instanceMatrix.needsUpdate=true);},
    meshes
  };
}
