/** Luminous Type Garden — original, locally rendered generative petal typography.
 * No images, fonts, network requests, or animation timers are required by this module.
 * A seeded set of silk surfaces follows editable letter skeletons; pointer gestures
 * bend those surfaces. This is a design study, not a botanical simulation.
 */
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const mix = (a, b, t) => a + (b - a) * t;
function rng(seed) { let a = (Number(seed) || 42) >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const points = s => s.split(' ').map(p => p.split(',').map(Number));
// Deliberately open, flowing construction paths rather than a raster font mask.
const glyphs = {
 A: ['.08,.96 .20,.64 .43,.04 .56,.08 .77,.64 .94,.96', '.24,.61 .49,.57 .74,.62'],
 B: ['.2,.96 .18,.52 .21,.06', '.21,.07 .66,.05 .85,.24 .69,.44 .23,.47 .69,.48 .89,.72 .71,.94 .20,.94'],
 C: ['.88,.16 .62,.04 .25,.12 .10,.48 .23,.85 .61,.96 .89,.82'],
 D: ['.20,.96 .18,.50 .20,.05', '.20,.05 .65,.07 .9,.31 .92,.67 .65,.93 .20,.95'],
 E: ['.88,.09 .21,.07 .17,.52 .20,.93 .91,.92', '.2,.49 .68,.48'],
 F: ['.2,.96 .18,.5 .22,.07 .92,.08', '.21,.49 .72,.48'],
 G: ['.88,.17 .62,.04 .25,.13 .10,.49 .24,.85 .65,.96 .91,.76 .9,.55 .58,.54'],
 H: ['.16,.06 .17,.5 .15,.95', '.85,.05 .82,.5 .87,.96', '.17,.52 .48,.46 .84,.51'],
 I: ['.2,.07 .78,.07', '.5,.07 .49,.51 .50,.94', '.19,.94 .80,.94'],
 J: ['.22,.09 .85,.07 .81,.57 .73,.89 .43,.96 .14,.75'],
 K: ['.2,.05 .18,.51 .19,.96', '.87,.05 .57,.34 .2,.54 .55,.64 .90,.96'],
 L: ['.25,.04 .19,.38 .20,.72 .26,.92 .58,.94 .92,.9'],
 M: ['.1,.96 .12,.05 .49,.55 .88,.05 .92,.96'],
 N: ['.15,.96 .16,.05 .48,.49 .85,.96 .84,.05'],
 O: ['.50,.04 .22,.13 .10,.48 .25,.88 .57,.96 .84,.80 .92,.47 .79,.13 .50,.04'],
 P: ['.25,.96 .18,.62 .21,.28 .27,.06', '.23,.10 .58,.04 .87,.20 .86,.41 .66,.55 .25,.52'],
 Q: ['.50,.04 .22,.13 .10,.48 .25,.88 .57,.96 .84,.80 .92,.47 .79,.13 .50,.04', '.58,.68 .92,.98'],
 R: ['.2,.96 .18,.52 .23,.07', '.23,.07 .64,.06 .87,.22 .77,.44 .23,.5 .57,.62 .92,.97'],
 S: ['.88,.15 .61,.04 .27,.11 .15,.31 .35,.49 .72,.59 .88,.76 .70,.94 .35,.95 .13,.82'],
 T: ['.07,.09 .5,.06 .94,.09', '.51,.08 .48,.51 .51,.97'],
 U: ['.16,.06 .15,.47 .18,.78 .43,.96 .7,.9 .86,.64 .86,.06'],
 V: ['.10,.05 .26,.56 .5,.97 .75,.53 .91,.05'],
 W: ['.06,.05 .24,.96 .50,.50 .76,.96 .95,.05'],
 X: ['.12,.05 .49,.5 .90,.96', '.87,.05 .5,.5 .11,.96'],
 Y: ['.08,.05 .28,.3 .5,.5 .73,.28 .91,.04', '.50,.49 .48,.72 .51,.97'],
 Z: ['.12,.08 .86,.07 .53,.48 .14,.93 .91,.93'],
 '0': ['.5,.04 .22,.15 .14,.5 .27,.89 .55,.96 .82,.76 .87,.41 .72,.09 .5,.04'],
 '1': ['.27,.23 .5,.06 .50,.94', '.22,.95 .80,.95'],
 '2': ['.14,.23 .33,.06 .7,.08 .88,.30 .68,.52 .15,.94 .91,.93'],
 '3': ['.15,.13 .56,.05 .86,.22 .72,.43 .45,.48 .76,.56 .88,.8 .61,.96 .15,.86'],
 '4': ['.69,.96 .7,.05 .12,.66 .92,.66'],
 '5': ['.86,.09 .24,.08 .18,.48 .57,.43 .86,.61 .84,.83 .53,.97 .14,.83'],
 '6': ['.8,.07 .48,.10 .2,.41 .17,.75 .44,.96 .75,.87 .87,.63 .66,.46 .21,.53'],
 '7': ['.12,.08 .9,.08 .57,.48 .37,.97'],
 '8': ['.5,.5 .21,.33 .25,.1 .65,.04 .88,.25 .5,.5 .16,.72 .30,.94 .68,.94 .87,.73 .5,.5'],
 '9': ['.8,.47 .46,.53 .19,.36 .25,.12 .58,.04 .85,.21 .81,.58 .57,.93 .2,.93'],
 '!': ['.5,.08 .49,.68', '.5,.91 .51,.94'],
 '?': ['.14,.22 .38,.05 .72,.1 .87,.32 .54,.55 .5,.7', '.5,.91 .51,.94'],
 '&': ['.87,.88 .31,.24 .41,.06 .68,.08 .72,.26 .19,.68 .18,.85 .42,.96 .74,.8 .91,.53'],
 '-': ['.18,.52 .82,.49']
};
Object.keys(glyphs).forEach(k => glyphs[k] = glyphs[k].map(points));
function catmull(path, progress) {
 const scaled = clamp(progress, 0, .999999) * (path.length - 1), i = Math.floor(scaled), t = scaled - i;
 const a=path[Math.max(0,i-1)], b=path[i], c=path[Math.min(path.length-1,i+1)], d=path[Math.min(path.length-1,i+2)];
 const q=axis=>.5*((2*b[axis])+(-a[axis]+c[axis])*t+(2*a[axis]-5*b[axis]+4*c[axis]-d[axis])*t*t+(-a[axis]+3*b[axis]-3*c[axis]+d[axis])*t*t*t);
 return [q(0),q(1)];
}
const colors = [
 [[244,111,108],[255,217,183],[158,48,92]],
 [[161,116,207],[238,210,255],[76,54,139]],
 [[118,180,166],[227,247,222],[49,111,121]],
 [[234,134,177],[255,224,229],[166,62,126]],
 [[246,179,141],[255,238,194],[172,105,132]],
 [[156,151,218],[230,221,255],[85,87,154]]
];
const rgb=(c,a=1)=>`rgba(${c.map(Math.round).join(',')},${a})`;
function petalSprite(tone, variant) {
 const c=document.createElement('canvas'); c.width=480; c.height=300;
 const x=c.getContext('2d'); const [body,shine,shade]=colors[tone];
 const rand=rng(681+variant*121+tone*139), curl=(variant%3-1)*13;
 // A broad, rounded silk corolla: curved rim, translucent shoulder and fine grain.
 const outline = new Path2D(); outline.moveTo(12,164);
 outline.bezierCurveTo(103,154,111,47,218,28+curl);
 outline.bezierCurveTo(286,11,306,39,339,31);
 outline.bezierCurveTo(378,16,407,57,433,76);
 outline.bezierCurveTo(459,106,435,149,404,176);
 outline.bezierCurveTo(369,214,304,255,254,244);
 outline.bezierCurveTo(145,235,104,174,12,164); outline.closePath();
 x.save();x.clip(outline);
 let g=x.createLinearGradient(75,242,330,23);
 g.addColorStop(0,rgb(shade));g.addColorStop(.23,rgb(body));g.addColorStop(.57,rgb(body));g.addColorStop(.80,rgb(shine));g.addColorStop(1,rgb(body,.98));
 x.fillStyle=g;x.fillRect(0,0,480,300);
 let light=x.createRadialGradient(282,77,5,264,106,201);light.addColorStop(0,rgb(shine,.7));light.addColorStop(.5,rgb(shine,.12));light.addColorStop(1,rgb(shade,.08));x.fillStyle=light;x.fillRect(0,0,480,300);
 // Individual filaments bend with the petal; low-opacity microtexture prevents flat fills.
 for(let i=0;i<145;i++) {
  const y=21+i*1.63, bend=Math.sin(i*.09+variant)*9;
  x.beginPath();x.moveTo(11,164);x.bezierCurveTo(136,146+(y-140)*.13,230,y+bend,454,y*.70+41);
  x.strokeStyle=i%5===0?rgb(shine,.34+rand()*.19):i%3===0?rgb(shade,.12):rgb(shine,.09);
  x.lineWidth=i%9===0?1.0:.43;x.stroke();
 }
 // Curved silvery fold rather than a repeated diagonal polygon.
 x.beginPath();x.moveTo(12,164);x.bezierCurveTo(163,149,216,104,428,78);x.bezierCurveTo(277,113,232,169,126,172);x.bezierCurveTo(81,171,36,168,12,164);
 g=x.createLinearGradient(154,100,219,195);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.46,rgb(shine,.6));g.addColorStop(.65,rgb(shine,.12));g.addColorStop(1,rgb(shade,.28));x.fillStyle=g;x.fill();
 x.beginPath();x.moveTo(13,164);x.bezierCurveTo(165,159,266,157,428,79);x.strokeStyle=rgb(shine,.76);x.lineWidth=1.2;x.stroke();
 // Deep edge shade and a thin transmitted-light rim create volume on a pale field.
 const edge=x.createLinearGradient(0,174,0,260);edge.addColorStop(0,rgb(shade,0));edge.addColorStop(.74,rgb(shade,.18));edge.addColorStop(1,rgb(shade,.48));x.fillStyle=edge;x.fillRect(0,0,480,300);
 x.restore();x.strokeStyle=rgb(shine,.9);x.lineWidth=1.3;x.stroke(outline);
 return c;
}

export function createGarden(canvas) {
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas 2D is unavailable');
 let w=1,h=1,dpr=1,seed=42,signature='',petals=[],ribbons=[],floaters=[],sprites=[],lastTime=0;
 let impulses=[];
 const images=()=>{if(!sprites.length)for(let tone=0;tone<colors.length;tone++)for(let j=0;j<3;j++)sprites.push(petalSprite(tone,j));};
 function resize(width,height,ratio=1){w=Math.max(1,width);h=Math.max(1,height);dpr=clamp(ratio,1,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);signature='';}
 function reset(nextSeed=42){seed=nextSeed;signature='';impulses=[];lastTime=0;}
 function build(settings) {
  images(); const word=String(settings.word??'PLAY').trim().toUpperCase().slice(0,12)||'PLAY';
  const key=`${word}/${settings.seed??seed}/${w}/${h}`;if(key===signature)return;signature=key;seed=settings.seed??seed;
  const random=rng(seed);petals=[];ribbons=[];floaters=[];
  const chars=Array.from(word).filter(c=>c!==' ');const portrait=w/h<.95;
  const cols=chars.length<=2?chars.length:portrait?(chars.length<=6?2:3):Math.min(chars.length,chars.length<=5?chars.length:4);
  const rows=Math.ceil(chars.length/cols);const marginX=w*.115, marginY=Math.min(62,h*.085);
  const bottomReserve=Math.min(225,h*.30);
  const gapX=w*.085,gapY=h*.045;const cellW=(w-marginX*2-gapX*(cols-1))/cols,cellH=(h-marginY-bottomReserve-gapY*(rows-1))/rows;
  chars.forEach((ch,index)=>{
   let paths=glyphs[ch];
   // Unsupported characters still form a visible petal rosette instead of vanishing.
   if(!paths)paths=glyphs.O;
   const row=Math.floor(index/cols),count=Math.min(cols,chars.length-row*cols);
   const offsetX=marginX+(cols-count)*(cellW+gapX)/2+(index%cols)*(cellW+gapX),offsetY=marginY+row*(cellH+gapY);
   const map=p=>[offsetX+p[0]*cellW,offsetY+p[1]*cellH];
   paths.forEach((path,pathIndex)=>{
    const sampled=Array.from({length:80},(_,i)=>map(catmull(path,i/79)));
    let length=0;for(let i=1;i<sampled.length;i++)length+=Math.hypot(sampled[i][0]-sampled[i-1][0],sampled[i][1]-sampled[i-1][1]);
    ribbons.push({path:sampled,width:Math.min(cellW*.36,cellH*.22),tone:(index+pathIndex)%colors.length,phase:random()*TAU});
    const count=Math.max(6,Math.round(length/Math.min(cellW*.28,cellH*.19)));
    for(let i=0;i<count;i++) {
     const u=clamp((i+.25)/(count+.3),0,.94), p=map(catmull(path,u)),q=map(catmull(path,Math.min(u+.012,.999)));
     const tangent=Math.atan2(q[1]-p[1],q[0]-p[0]);
     const side=i%2?-1:1;const tones=[0,1,3,4,1,0,2,3];const tone=tones[(Math.floor(i/2)+index*2+pathIndex)%tones.length];
     petals.push({x:p[0],y:p[1],angle:tangent+side*(.08+random()*.14),length:Math.min(cellW*.89,cellH*.55)*(.72+random()*.3),width:Math.min(cellW*.63,cellH*.35)*(.80+random()*.25),sprite:tone*3+Math.floor(random()*3),phase:random()*TAU,side,depth:random(),index});
    }
   });
  });
  for(let i=0;i<10;i++)floaters.push({x:random()*w,y:marginY+random()*(h-marginY-bottomReserve),angle:random()*TAU,size:w*(.035+random()*.045),sprite:Math.floor(random()*sprites.length),phase:random()*TAU});
 }
 function displacement(x,y,time) {
  let dx=0,dy=0;for(const q of impulses){const age=Math.max(0,time-q.time),falloff=Math.exp(-age*.55),dist=Math.hypot(x-q.x,y-q.y),influence=Math.exp(-dist*dist/(w*w*.1))*falloff;dx+=q.dx*influence;dy+=q.dy*influence;}
  return [dx,dy];
 }
 function render(time=0,settings={}) {
  lastTime=Number.isFinite(time)?time:0;build(settings);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const dark=Boolean(settings.dark),energy=clamp(Number(settings.energy??.55),0,1);
  ctx.fillStyle=dark?'#201c3c':'#f8f4ed';ctx.fillRect(0,0,w,h);
  // Soft reflected colour stays behind the living geometry, never an image backdrop.
  const ambient=ctx.createRadialGradient(w*.5,h*.46,w*.01,w*.5,h*.46,Math.max(w,h)*.66);
  ambient.addColorStop(0,dark?'#32294b':'#f1e8ef');ambient.addColorStop(1,dark?'#191a34':'#fbf8f2');ctx.fillStyle=ambient;ctx.fillRect(0,0,w,h);
  impulses=impulses.filter(q=>time-q.time<12);
  // Hair-fine stems bridge separate petals and retain the legibility of each letter.
  for(const r of ribbons) {
   const path=r.path.slice(4,-4);ctx.beginPath();path.forEach((p,i)=>{const d=displacement(p[0],p[1],time),s=Math.sin(time*.32+r.phase+i*.05)*energy*w*.003;i?ctx.lineTo(p[0]+d[0]+s,p[1]+d[1]):ctx.moveTo(p[0]+d[0]+s,p[1]+d[1]);});
   ctx.lineCap='butt';ctx.lineJoin='round';
   const start=path[0],end=path[path.length-1],shade=ctx.createLinearGradient(start[0]-r.width,start[1],end[0]+r.width,end[1]);shade.addColorStop(0,rgb(colors[r.tone][2],.85));shade.addColorStop(.32,rgb(colors[r.tone][0]));shade.addColorStop(.58,rgb(colors[r.tone][1]));shade.addColorStop(.79,rgb(colors[r.tone][0]));shade.addColorStop(1,rgb(colors[r.tone][2],.85));
   ctx.strokeStyle=shade;ctx.lineWidth=r.width*.86;ctx.stroke();
   ctx.strokeStyle=rgb(colors[r.tone][1],.37);ctx.lineWidth=r.width*.3;ctx.stroke();
  }
  for(const p of petals) {
   const d=displacement(p.x,p.y,time);const breath=Math.sin(time*(.4+energy*.25)+p.phase);
   ctx.save();ctx.translate(p.x+d[0],p.y+d[1]);ctx.rotate(p.angle+breath*.045*energy+clamp(d[0]/w,-.12,.12));
   // Shadows are surface occlusion, not a broad blurred halo around the whole letter.
   ctx.shadowColor=dark?'rgba(9,8,26,.28)':'rgba(62,37,84,.21)';ctx.shadowBlur=Math.min(9,w*.02);ctx.shadowOffsetX=1;ctx.shadowOffsetY=3;
   ctx.globalAlpha=.98;ctx.drawImage(sprites[p.sprite],-p.length*.36,-p.width*.5,p.length*(.94+energy*.11),p.width*(.86+energy*.25+breath*.035*energy));ctx.restore();
  }
  // Airborne single petals and fine tendrils make the garden feel alive, not filled type.
  for(const f of floaters) {
   const bx=f.x+Math.sin(time*.19+f.phase)*w*.022*energy,by=f.y+Math.cos(time*.16+f.phase)*h*.018*energy;
   const d=displacement(bx,by,time);ctx.save();ctx.globalAlpha=dark?.58:.63;ctx.translate(bx+d[0]*.5,by+d[1]*.5);ctx.rotate(f.angle+Math.sin(time*.13+f.phase)*.22*energy);ctx.drawImage(sprites[f.sprite],-f.size*.5,-f.size*.23,f.size,f.size*.46);ctx.restore();
  }
  ctx.lineWidth=.55;for(let i=0;i<5;i++){
   const phase=seed*.01+i*1.47;ctx.strokeStyle=dark?'rgba(255,193,165,.25)':'rgba(132,95,160,.22)';ctx.beginPath();
   const x=w*(.1+i*.19),y=h*(.22+(i%3)*.25);ctx.moveTo(x,y);ctx.bezierCurveTo(x+w*.2*Math.sin(phase),y-h*.23,x+w*.24,y+h*.16,x+w*.12,y+h*.21);ctx.stroke();
  }
 }
 function interact(x,y,dx=0,dy=0){impulses.push({x:clamp(x,0,1)*w,y:clamp(y,0,1)*h,dx:clamp(dx,-.2,.2)*w*2.5+(Math.abs(dx)+Math.abs(dy)<.001?w*.065:0),dy:clamp(dy,-.2,.2)*h*2.5,time:lastTime});if(impulses.length>18)impulses.shift();}
 function dispose(){sprites=[];petals=[];ribbons=[];floaters=[];impulses=[];}
 return {render,resize,interact,reset,dispose};
}
