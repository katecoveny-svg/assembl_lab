// One branchlet for the close coastal tree, instanced at the ends of its woody forks.
// The leaf base shares its stem position. Local reach drives bend from that attachment.
export function coastalSpray({Geometry, Attribute, Color}, small) {
  const pos=[],rgb=[],reach=[],petal=[],indices=[];
  const tones=['#263d2f','#466143','#547356','#6c7c65','#665946','#a92f29','#d15039'].map(hex=>new Color(hex));
  function vertex(x,y,z,tone,bend,bloom=0) {
    const c=tones[tone];pos.push(x,y,z);rgb.push(c.r,c.g,c.b);
    reach.push(bend);petal.push(bloom);return pos.length/3-1;
  }
  const length=.66;
  const stemY=t=>.15*t-.22*t*t;
  const stemZ=t=>.07*t*t;
  const rings=small?5:7;
  for(let j=0;j<=rings;j++){
    const t=j/rings,rad=.007*(1-t*.87),first=pos.length/3;
    for(let k=0;k<4;k++){
      const a=k*Math.PI/2;vertex(length*t,stemY(t)+rad*Math.cos(a),stemZ(t)+rad*Math.sin(a),4,t*t);
    }
    if(j)for(let k=0;k<4;k++){const i=first+k,n=first+(k+1)%4;indices.push(i-4,i,n,n,n-4,i-4);}
  }
  const pairs=small?7:10;
  for(let j=0;j<pairs;j++)for(const sign of [-1,1]){
    const t=.16+.81*(j+(sign===1?.18:0))/pairs,leaf=.070+.027*Math.sin(t*Math.PI);
    const x=t*length,y=stemY(t),z=stemZ(t),offset=pos.length/3;
    for(let k=0;k<=4;k++){
      const u=k/4,w=.019*Math.sin(Math.PI*u)**.75,mid=leaf*u;
      for(const edge of [-1,0,1]){
        vertex(x+mid*.49+w*edge,y+mid*(.20+.33*Math.sin(j*1.7))-.061*u*u+Math.abs(edge)*w*.25,
          z+sign*(mid*.87-w*edge*.25),edge===0?2:((j+(sign===1?1:0))%3),t*t+u*.13);
      }
      if(k){const a=offset+(k-1)*3;indices.push(a,a+3,a+1,a+1,a+3,a+4,a+1,a+4,a+2,a+2,a+4,a+5);}
    }
  }
  for(let j=0;j<(small?10:19);j++){
    const a=j*2.399963,rad=.023+(j%4)*.008,x=.635,y=stemY(.97),z=stemZ(.97);
    const i=vertex(x,y,z,5,.93,1);vertex(x+.0028,y,z,5,.93,1);
    vertex(x+.016+Math.cos(a)*rad,y+.018+rad*.67,z+Math.sin(a)*rad,6,1,1);indices.push(i,i+1,i+2);
  }
  const g=new Geometry();
  g.setAttribute('position',new Attribute(pos,3));g.setAttribute('color',new Attribute(rgb,3));
  g.setAttribute('aReach',new Attribute(reach,1));g.setAttribute('aBloom',new Attribute(petal,1));
  g.setIndex(indices);g.computeVertexNormals();return g;
}
