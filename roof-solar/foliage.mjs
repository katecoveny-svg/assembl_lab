// The LiDAR gives canopy location, radius and height, not species. These lightweight
// procedural broadleaf forms are illustrative only; they never feed the shade model.
import * as T from "three";

export const seed01 = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function atlas(seed) {
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const a = c.getContext("2d"); a.translate(256, 465);
  function stem(x, y, ex, ey, w) {
    a.beginPath(); a.moveTo(x, y); a.quadraticCurveTo(x * .45 + ex * .55, y - 55, ex, ey);
    a.strokeStyle = "#85876a"; a.lineWidth = w; a.lineCap = "round"; a.stroke();
  }
  stem(0,0,-6,-418,4);
  const shades = ["#788350","#86915d","#65764b","#6f8051","#899464","#788866"];
  for (let i = 0; i < 238; i++) {
    const t = (i + 2) / 240, k = i * 199 + seed * 17;
    const cy = -38 - t * 360, side = i % 2 ? -1 : 1;
    const span = (0.27 + 0.73 * Math.sin(t * Math.PI) ** .64) * 215;
    const ex = side * span * (.08 + .92 * seed01(k)), ey = cy - 5 - 32 * seed01(k + 2);
    if (i % 4 === 0) stem(0, cy + 28, ex, ey, 1.9);
    const size = (t > .8 ? 9 : 11) + 16 * seed01(k + 7), width = size * (.42 + .19 * seed01(k + 6));
    a.save(); a.translate(ex, ey); a.rotate(side * (-1 + .8 * seed01(k + 9)));
    a.beginPath(); a.moveTo(0, -size); a.bezierCurveTo(width, -size*.52, width, size*.27, 0, size); a.bezierCurveTo(-width, size*.38, -width, -size*.55, 0, -size);
    a.fillStyle = shades[Math.floor(seed01(k + 22) * shades.length)]; a.fill();
    if (i % 3 === 0) { a.strokeStyle="#9ba67424"; a.lineWidth=1; a.beginPath(); a.moveTo(0, -size*.75); a.lineTo(0, size*.7); a.stroke(); }
    a.restore();
  }
  const x = new T.CanvasTexture(c); x.colorSpace = T.SRGBColorSpace; x.anisotropy = 4; return x;
}
export function drawCanopy(trees, hi, centre, toScene) {
  const root = new T.Group(), tex = atlas(19);
  const leafMat = new T.MeshPhysicalMaterial({ color:0xffffff, map:tex, alphaTest:.32, side:T.DoubleSide, roughness:1, metalness:0, specularIntensity:.08 });
  const depth = new T.MeshDepthMaterial({ depthPacking:T.RGBADepthPacking, map:tex, alphaTest:.32, side:T.DoubleSide });
  const barkMat = new T.MeshStandardMaterial({color:0x574e3e, roughness:.97});
  const card = new T.PlaneGeometry(2,2).translate(0,.68,0);
  const stem = new T.CylinderGeometry(.40,1,1,hi?6:5,1).translate(0,.5,0);
  const matrices=[], colours=[], sticks=[];
  const p = new T.Vector3(), s = new T.Vector3(), q = new T.Quaternion(), e = new T.Euler(), Y = new T.Vector3(0,1,0), v=new T.Vector3();
  const hues = ["#526840","#566b45","#426440","#5c7043","#617647","#486541","#506b4d"].map(x=>new T.Color(x));
  function branch(a,b,w) { v.copy(b).sub(a); q.setFromUnitVectors(Y,v.clone().normalize()); sticks.push(new T.Matrix4().compose(a,q,s.set(w,v.length(),w))); }
  trees.forEach((t,i)=>{
    const base=toScene(t.e,t.n,t.ground-.12), height=t.height, radius=t.radius;
    const k=(t.e*13+t.n*7)%101019, yaw=seed01(k)*Math.PI*2;
    const distance=Math.hypot(t.e-centre.e,t.n-centre.n), near=distance<50;
    const big=t.kind==="tree";
    const fork=base.clone().add(new T.Vector3(.08*radius,height*(big?.48:.3),-.06*radius));
    const cardCount=big?(hi?(near?72:35):30):hi?18:12;
    const mainHue=hues[Math.floor(seed01(k+12)*hues.length)];
    if(big) branch(base,fork,Math.max(.07,Math.min(.40,.015*height**1.14)));
    const arms = big?(hi&&near?7:5):0;
    for(let j=0;j<arms;j++){
      const a=yaw+j*2.39996, r=radius*(.46+.37*seed01(j+k));
      const end=base.clone().add(new T.Vector3(Math.cos(a)*r,height*(.63+.21*seed01(j+k*2)),Math.sin(a)*r));
      branch(fork,end,Math.max(.022,height*.008));
      if(hi&&near) {
        const a2=a+.68,tip=end.clone().add(new T.Vector3(Math.cos(a2)*radius*.18,height*.09,Math.sin(a2)*radius*.18));
        branch(fork.clone().lerp(end,.7),tip,Math.max(.017,height*.004));
      }
    }
    for(let j=0;j<cardCount;j++){
      const a=yaw+j*2.39996, h0=seed01(k+j*17), h1=seed01(k+j*53+1),h2=seed01(k+j*13+20);
      const fr=j===0?.87:.29+.59*h0;
      const r=j===0?0:Math.min(.82,.14+.8*Math.sqrt(h1))*Math.sqrt(Math.max(.17,1-((fr-.55)/.52)**2))*radius;
      const wx=radius*(.26+.18*h2), hy=Math.min(height*(.13+.057*h1),height*(1.02-fr)/1.8);
      const yaw2=a+(h0-.5)*1.35;
      p.copy(base).add(new T.Vector3(Math.cos(a)*r, height*fr, Math.sin(a)*r));
      q.setFromEuler(e.set((h2-.5)*1.35,yaw2,(h1-.5)*1.80,"YXZ"));
      matrices.push(new T.Matrix4().compose(p,q,s.set(wx,hy,wx)));
      colours.push(mainHue.clone().lerp(hues[(i+j*3)%hues.length],.23).multiplyScalar(.70+.57*fr+.19*h2));
    }
  });
  const mesh=new T.InstancedMesh(card,leafMat,matrices.length);
  matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,colours[i]);});
  mesh.castShadow=true; mesh.receiveShadow=true; mesh.customDepthMaterial=depth; root.add(mesh);
  if(sticks.length){const wood=new T.InstancedMesh(stem,barkMat,sticks.length);sticks.forEach((m,i)=>wood.setMatrixAt(i,m));wood.castShadow=true;wood.receiveShadow=true;root.add(wood);}else{stem.dispose();barkMat.dispose();}
  return root;
}
