import {turnAngle, waveAt, waveAmplitude, nearest, grade} from './model.js';
const $ = id => document.getElementById(id);
const canvas = $('drawing');
const ctx = canvas.getContext('2d');
const defaults = {count:6, rotation:0, phase:0, probe:50, site:80};
let state = {...defaults}, mode = 'symmetry';
const lessons = {
 symmetry:{title:'One petal. A whole pattern.',subject:'GEOMETRY · EXPLORE',label:'ROTATION / A FULL TURN',explain:'Repeat one shape around a fixed centre. How far can you turn the whole pattern before it looks exactly the same? Change the repeats, then test a turn.',note:'An original geometric pattern. Identical petals use equal angles. A static diagram changes only when you move a control.',reflection:'Keep a six-repeat pattern, then compare it with twelve repeats. Explain why twice as many repeats means half the turn angle. Would changing the petal colour change the geometry?',related:'Try the <a href="/study/m/shapes.html">shape workshop</a> for area, circles and angles.',controls:[['count','Repeats',3,12,1,''],['rotation','Turn the pattern',0,360,'any','°']]},
 waves:{title:'Two waves. One result.',subject:'SCIENCE · EXTENSION',label:'SUPERPOSITION / TWO EQUAL WAVES',explain:'A wave can push up while another pushes down. Add their displacements at each point to find the result. Slide one wave out of step and watch the sum change.',note:'An ideal mathematical snapshot: each wave has amplitude 1 unit and the same wavelength. No sound is played. This is not a vibrating-plate simulation.',reflection:'Compare 0° with 180°. Describe where the energy question goes beyond this diagram: a zero displacement at one point does not mean energy has disappeared from a real system.',related:'Explore frequency and amplitude in the <a href="/study/m/vinyl.html">vinyl machine</a>.',controls:[['phase','Phase difference',0,180,15,'°']]},
 regions:{title:'Where does “nearer” change?',subject:'MATHS · EXTENSION',label:'NEAREST-POINT REGIONS / PLAN VIEW',explain:'Imagine two water stations on a flat playing field. Every point belongs to its nearest station. Move station B, then move your probe to find where the distances tie.',note:'A two-site Voronoi diagram using straight-line distance. The field is 100 × 100 units. Real journeys may have paths and barriers.',reflection:'Keep the first map. Move B from 80 to 60. Where does the boundary move, and why? Explain why the boundary is a whole line rather than just a single halfway point.',related:'Explore scale, coordinates and contours in the <a href="/study/m/maps.html">map machine</a>.',controls:[['site','Station B position',40,90,1,''],['probe','Probe position',0,100,.5,'']]}
};
function controlMarkup([key,label,min,max,step,unit]) {return `<label class="control"><span>${label}<output id="out-${key}" for="control-${key}">${state[key]}${unit}</output></span><input id="control-${key}" data-key="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${state[key]}" aria-label="${label}"></label>`;}
function clearFeedback(){ $('feedback').textContent='You can try as many times as you like.'; delete $('feedback').dataset.correct; $('answer').value=''; $('choice').value=''; }
function choose(next){
 mode=next; state={...defaults}; clearFeedback(); $('comparison').hidden=true;
 const l=lessons[mode];
 document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
 $('lesson-title').textContent=l.title; $('subject').textContent=l.subject; $('visual-label').textContent=l.label; $('explain').textContent=l.explain; $('model-note').textContent=l.note; $('reflection').textContent=l.reflection; $('related').innerHTML=l.related;
 $('controls').innerHTML=l.controls.map(controlMarkup).join('');
 $('step').textContent=mode==='symmetry'?'Turn one repeat':mode==='waves'?'Try cancellation':'Find the boundary';
 $('answer').hidden=mode==='regions'; $('choice').hidden=mode!=='regions'; $('answer-label').htmlFor=mode==='regions'?'choice':'answer';
 $('answer-label').textContent=mode==='symmetry'?'Smallest matching turn (degrees)':mode==='waves'?'Peak amplitude of the sum (units)':'Which station is nearer?';
 render();
}
function text(value,x,y,size=16,color='#715b69',align='left'){ctx.fillStyle=color;ctx.font=`${size * (canvas.clientWidth < 450 ? 1.8 : 1)}px Arial`;ctx.textAlign=align;ctx.fillText(value,x,y);}
function line(x1,y1,x2,y2,color='#d8c5d1',width=1,dash=[]){ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);}
function drawSymmetry(){
 const cx=400,cy=265,r=215;
 ctx.strokeStyle='#dfd0d8';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
 for(let i=0;i<state.count;i++){
  const a=(i*turnAngle(state.count)+state.rotation-90)*Math.PI/180;
  line(cx,cy,cx+Math.cos(a)*r,cy+Math.sin(a)*r,'#d5c2ce',1,[3,6]);
  ctx.save();ctx.translate(cx,cy);ctx.rotate(a);
  for(let j=0;j<7;j++){
   const tip=202-j*15, spread=Math.min(80,170/state.count+25)-j*4;
   ctx.beginPath();ctx.moveTo(20,0);ctx.bezierCurveTo(85,-spread,tip-20,-spread,tip,0);ctx.bezierCurveTo(tip-20,spread,85,spread,20,0);
   if(j===0){ctx.fillStyle='#e4c5d1';ctx.fill();}ctx.strokeStyle=j%2?'#a15f74':'#482139';ctx.lineWidth=j===0?2:1.5;ctx.stroke();
  }ctx.restore();
 }
 ctx.beginPath();ctx.arc(cx,cy,12,0,Math.PI*2);ctx.fillStyle='#240b21';ctx.fill();
 text('FIXED CENTRE',cx,530,13,'#715b69','center');
 text(`${state.count} identical repeats`,35,35,16);text(`Turned ${state.rotation.toFixed(1).replace('.0','')}°`,765,35,16,'#715b69','right');
 $('metric').textContent=`${turnAngle(state.count).toFixed(1).replace('.0','')}°`;
 $('description').textContent=`Smallest matching turn: 360° ÷ ${state.count}. The pattern has rotational symmetry of order ${state.count}.`;
 $('question').textContent=`With ${state.count} identical repeats, what is the smallest positive angle that maps the pattern onto itself? Use the turn control to check.`;
}
function drawWaves(){
 const rows=[105,275,440], labels=['A / original wave','B / shifted wave','A + B / their sum'];
 rows.forEach((y,i)=>{line(45,y,755,y);text(labels[i],45,y-65,16,i===2?'#240b21':'#715b69');for(let x=45;x<=755;x+=71)line(x,y-48,x,y+48,'#e6dbe1');});
 rows.forEach((y,i)=>{ctx.beginPath();ctx.strokeStyle=i===0?'#a15f74':i===1?'#876981':'#240b21';ctx.lineWidth=i===2?4:2.5;ctx.setLineDash(i===1?[8,4]:[]);for(let px=0;px<=710;px++){const x=px/710*Math.PI*4;const v=i===0?Math.sin(x):i===1?Math.sin(x+state.phase*Math.PI/180):waveAt(x,state.phase);const yy=y-v*34;if(px===0)ctx.moveTo(px+45,yy);else ctx.lineTo(px+45,yy);}ctx.stroke();ctx.setLineDash([]);});
 text('Position along the wave →',755,540,14,'#715b69','right');
 $('metric').textContent=waveAmplitude(state.phase).toFixed(2);
 $('description').textContent=`Peak amplitude of A + B, in units. Each input has amplitude 1; phase difference is ${state.phase}°. Dashed line = B; solid dark line = sum.`;
 $('question').textContent=`At a phase difference of ${state.phase}°, what is the peak amplitude of the sum? Give your prediction to 2 decimal places, then compare the three traces.`;
}
function drawRegions(){
 const x0=150,y0=30,size=500,bound=(20+state.site)/2;
 ctx.fillStyle='#e5c7d3';ctx.fillRect(x0,y0,size*bound/100,size);ctx.fillStyle='#ded7e4';ctx.fillRect(x0+size*bound/100,y0,size*(100-bound)/100,size);
 for(let i=0;i<=100;i+=10){line(x0+i*5,y0,x0+i*5,y0+size,'#ffffff88');line(x0,y0+i*5,x0+size,y0+i*5,'#ffffff88');}
 line(x0+bound*5,y0,x0+bound*5,y0+size,'#482139',2,[6,5]);
 const py=y0+250,px=x0+state.probe*5;
 line(x0+100,py,px,py,'#843b5d',3);line(x0+state.site*5,py+5,px,py+5,'#644f83',3,[6,4]);
 [[20,'A'],[state.site,'B']].forEach(([x,label])=>{ctx.beginPath();ctx.arc(x0+x*5,py,13,0,Math.PI*2);ctx.fillStyle='#240b21';ctx.fill();text(label,x0+x*5,py-27,20,'#240b21','center');});
 ctx.beginPath();ctx.arc(px,py,7,0,Math.PI*2);ctx.fillStyle='#fffdfb';ctx.fill();ctx.strokeStyle='#240b21';ctx.lineWidth=2;ctx.stroke();text('PROBE',px,py+40,12,'#240b21','center');
 text('0',x0,550,13);text('100 units',x0+size,550,13,'#715b69','right');
 const result=nearest({x:state.probe,y:50},[{x:20,y:50},{x:state.site,y:50}]);
 $('metric').textContent=result.winners.length===2?'A = B':result.winners[0]===0?'A nearer':'B nearer';
 $('description').textContent=`Probe (${state.probe}, 50): A is ${Number(result.distances[0].toFixed(1))} units away; B is ${Number(result.distances[1].toFixed(1))}. Boundary x = ${bound}.`;
 $('question').textContent=`For the current probe at x = ${state.probe}, is A or B nearer, or are the distances equal? Read the distances, then explain your choice.`;
}
function render(){
 if(ctx){ctx.clearRect(0,0,800,560);ctx.fillStyle='#f6f0f2';ctx.fillRect(0,0,800,560);({symmetry:drawSymmetry,waves:drawWaves,regions:drawRegions})[mode]();}
 else {$('metric').textContent='Diagram unavailable';$('description').textContent='Use the explanation, controls and feedback to investigate the same model.';}
 canvas.setAttribute('aria-label',`${lessons[mode].title} ${$('description').textContent}`);
 lessons[mode].controls.forEach(([key,,,,,unit])=>{$(`out-${key}`).textContent=Number(state[key].toFixed(1))+unit;$(`control-${key}`).value=state[key];});
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.mode)));
$('controls').addEventListener('input',event=>{const key=event.target.dataset.key;if(!key)return;state[key]=Number(event.target.value);clearFeedback();render();});
$('step').addEventListener('click',()=>{if(mode==='symmetry')state.rotation=(state.rotation+turnAngle(state.count))%360;else if(mode==='waves')state.phase=180;else state.probe=(20+state.site)/2;clearFeedback();render();});
$('reset').addEventListener('click',()=>choose(mode));
$('pin').addEventListener('click',()=>{if(!ctx)return;$('comparison-image').src=canvas.toDataURL('image/png');$('comparison-text').textContent=$('description').textContent;$('comparison').hidden=false;});
$('clear-pin').addEventListener('click',()=>{$('comparison').hidden=true;$('pin').focus();});
$('answer-form').addEventListener('submit',event=>{event.preventDefault();const result=grade(mode,mode==='regions'?$('choice').value:$('answer').value,state);$('feedback').textContent=result.message;$('feedback').dataset.correct=String(result.correct);});
choose('symmetry');
new ResizeObserver(() => render()).observe(canvas);
