// Human-scale fittings for the single selected vehicle. The AT feed identifies the service,
// not the exact hull, livery or interior. All geometry here is original and representative.
import * as T from 'three';

function panel(a,b,c,d) {
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));
  g.computeVertexNormals();
  return g;
}

function section([w,front,aft,y]) {
  return [[-w*.68,y,front],[w*.68,y,front],[w,y,front+1.65],[w,y,aft-.8],
    [w*.88,y,aft],[-w*.88,y,aft],[-w,y,aft-.8],[-w,y,front+1.65]];
}

function fittings(parts,part) {
  function block(x,y,z,w,h,d,colour,rough=.53,lean=0) {
    const g=new T.BoxGeometry(w,h,d);
    if (lean) g.rotateX(lean);
    parts.push(part(g,colour,{rough,at:[x,y,z]}));
  }
  function rod(a,b,r,colour='#a5aeaa') {
    const start=new T.Vector3(...a), end=new T.Vector3(...b), v=end.clone().sub(start);
    const g=new T.CylinderGeometry(r,r,v.length(),7);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));
    parts.push(part(g,colour,{at:start.lerp(end,.5).toArray(),rough:.38}));
  }
  function seats(x,y,z,width,cloth) {
    block(x,y+.25,z,width*.65,.43,.24,'#394247');
    block(x,y+.49,z,width,.12,.47,cloth,.83);
    block(x,y+.78,z+.22,width,.55,.10,cloth,.83,.15);
    block(x,y+1.04,z+.26,width*.83,.048,.065,'#566265',.54);
  }
  return {block,rod,seats};
}

export function busCabin(parts, panes, part) {
  const {block,rod,seats}=fittings(parts,part);
  const x=1.205, front=-5.93, back=5.93, sill=1.53, top=2.91;
  for (const side of [-1,1]) {
    const sx=side*x;
    panes.push(panel([sx,sill,front+.25],[sx,top,front+.40],[sx,top,back-.09],[sx,sill,back-.09]));
    block(sx,1.57,0,.10,.09,11.76,'#202933');
    for(const z of [-5.48,-4.12,-2.58,-1.05,.22,1.50,2.85,4.32,5.77])
      block(sx,2.21,z,.088,1.42,.075,'#272f32');
    for(const z of [-4.17,1.55,4.40])rod([side*.93,.85,z],[side*.93,2.91,z],.022,'#b5a275');
    for(const z of [-2.78,-1.87,2.15,3.12,4.06,4.96])seats(side*.76,1.01,z,.77,'#48616b');
  }
  panes.push(panel([-x,1.32,front],[x,1.32,front],[x,2.91,front+.20],[-x,2.91,front+.20]));
  panes.push(panel([-x,sill,back],[x,sill,back],[x,2.89,back],[-x,2.89,back]));
  for(const side of [-1,1]) {
    rod([side*x,1.34,front],[side*x,2.96,front+.20],.064,'#303a3d');
    rod([side*x,sill,back],[side*x,2.92,back],.060,'#303a3d');
    rod([side*.33,1.39,front-.015],[side*.88,1.85,front+.045],.014,'#222a2b');
  }
  // Windshield surround, sloped header and service fascia follow the front glass.
  block(0,2.94,-5.79,2.39,.30,.40,'#283238',.44);
  block(0,1.39,-5.945,2.34,.13,.096,'#354047',.46);
  block(0,1.12,-5.958,2.29,.24,.066,'#395264',.42);
  for(const side of [-1,1]){
    block(side*.93,1.08,-6.002,.43,.22,.046,'#242d32',.39);
    block(side*.98,1.10,-6.032,.25,.092,.024,'#e8e3cc',.19);
    block(side*1.14,.87,-5.982,.11,.085,.032,'#d19346',.27);
    block(side*1.237,1.47,.22,.073,.065,11.22,'#26363d',.61);
  }
  seats(.73,1,-4.86,.55,'#353d3d');
  block(.60,1.54,-5.47,1.04,.26,.53,'#394145');
  rod([.65,1.55,-5.36],[.65,1.73,-5.26],.055,'#252e30');
  const steering=new T.TorusGeometry(.19,.018,6,18);steering.rotateX(-.77);
  parts.push(part(steering,'#30393b',{at:[.65,1.74,-5.24],rough:.58}));
}

export function ferryCabin(parts,panes,part,lower,upper) {
  const {rod,block,seats}=fittings(parts,part),lo=section(lower),hi=section(upper);
  const wheelhouse=lower[3]>5;
  for(let i=0;i<lo.length;i++){
    const j=(i+1)%lo.length,a=lo[i],b=lo[j],c=hi[j],d=hi[i];
    panes.push(panel(a,d,c,b));
    const width=Math.hypot(b[0]-a[0],b[2]-a[2]), bays=Math.max(1,Math.round(width/(wheelhouse?1.45:1.77)));
    for(let bay=0;bay<bays;bay++){
      const f=bay/bays;
      const blend=(p,q)=>p.map((v,k)=>v+(q[k]-v)*f);
      rod(blend(a,b),blend(d,c),bay===0?.076:.047,'#32474c');
    }
    rod(a,b,.047,'#323e40');rod(d,c,.050,'#354447');
  }
  if(wheelhouse){
    block(0,5.67,-3.77,4.40,.28,.77,'#364348');
    for(const x of [-1.1,1.1])seats(x,5.08,-2.35,.63,'#485359');
  } else {
    for(const x of [-3.47,-2.37,.50,2.83])for(const z of [-6,-4.45,-2.9,-1.35,.2,1.75,3.3,4.85,6.4])seats(x,2.72,z,.88,'#4e6264');
    block(0,2.75,1,8.55,.13,18.5,'#807e73');
  }
}

export function ferryWeatherDeck(parts,part) {
  const {rod,block,seats}=fittings(parts,part);
  // The afterdeck is open to the sky. A companionway runs down its starboard side.
  for(const x of [-2.7,-1.24,.36])for(const z of [6.03,7.38,8.73,10.08])seats(x,5.03,z,.82,'#6c7467');
  for(const x of [-4.18,4.18]){
    for(let z=3.55;z<12.7;z+=1.5)rod([x,5.04,z],[x,6.08,z],.046);
    for(const y of [5.59,6.07])rod([x,y,3.53],[x,y,12.43],.041);
  }
  for(let x=-4.17;x<2.8;x+=1.4)rod([x,5.04,12.43],[x,6.08,12.43],.046);
  for(const y of [5.59,6.07])rod([-4.18,y,12.43],[2.72,y,12.43],.041);
  for(let i=0;i<12;i++)block(3.30,2.31+i*.235,15.03-i*.215,1.10,.095,.29,'#707875');
  for(const x of [2.72,3.89])rod([x,3.23,15.13],[x,5.80,12.62],.048);
  for(const x of [-2.7,2.7]){
    for(const z of [-.78,1.02]){
      const cradle=new T.CapsuleGeometry(.27,.72,4,10);cradle.rotateX(Math.PI/2);
      parts.push(part(cradle,'#e1e3d9',{at:[x,7.27,z],rough:.56}));
      for(const dz of [-.28,.28])block(x,7.09,z+dz,.61,.16,.10,'#68736e');
    }
  }
  const ring=new T.TorusGeometry(.30,.083,8,22);ring.rotateY(Math.PI/2);
  for(const side of [-1,1])parts.push(part(ring.clone(),'#c35830',{at:[side*4.22,5.70,7.55],rough:.65}));
}

// Plated demi-hulls: each station carries the keel, hard chine, rubbing strake and sheer.
// Only the favoured vehicle gets these faces. The deck lands on both hulls abaft the fine bows.
export function ferryHulls(parts,part){
  const stations=[
    [-16.85,.018,1.81],[-15.74,.32,1.77],[-13.75,.82,1.68],[-10.3,1.22,1.62],
    [-5,1.31,1.60],[5,1.33,1.60],[13,1.31,1.58],[16.3,1.10,1.53]
  ];
  for(const center of [-3.48,3.48]){
    const rows=stations.map(([z,w,top],i)=>{
      const rake=i<3?.46-i*.1:0;
      const one=(side)=>[
        [center+side*w*.17,-.28,z+rake],[center+side*w*.76,.18,z+rake*.75],
        [center+side*w*.92,.56,z+rake*.38],[center+side*w,1.19,z],
        [center+side*w*.99,1.29,z],[center+side*w*.95,top,z-.15]
      ];
      return [...one(1),...one(-1).reverse()];
    });
    const finishes=['#213c45','#25414a','#eef0e8','#31444a','#d9e2de','#bec6bc',
      '#d9e2de','#31444a','#eef0e8','#25414a','#213c45','#263c43'];
    for(let i=1;i<rows.length;i++){
      for(let j=0;j<12;j++){
        const k=(j+1)%12;
        parts.push(part(panel(rows[i-1][j],rows[i-1][k],rows[i][k],rows[i][j]),finishes[j],{rough:j===3||j===7?.69:.40}));
      }
    }
    for(const [row,forward] of [[rows[0],true],[rows.at(-1),false]]){
      for(let j=0;j<5;j++){
        const k=11-j,points=[row[j],row[j+1],row[k-1],row[k]];
        parts.push(part(panel(...(forward?points.reverse():points)),'#bbc8c4',{rough:.50}));
      }
    }
  }
  const {rod,block}=fittings(parts,part);
  for(const s of [-1,1]){
    for(const z of [-13.2,13.5]) {
      block(s*3.52,2.19,z,.80,.07,.53,'#707c7b');
      rod([s*3.70,2.2,z],[s*3.70,2.55,z],.079,'#344245');
      rod([s*3.36,2.2,z],[s*3.36,2.55,z],.079,'#344245');
    }
  }
}
