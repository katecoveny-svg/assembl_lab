import {createTeardown, fmt, COLOURS as C} from '/study/teardown/kit/teardown.js';
import * as model from './model.js';
import {build} from './machine.js';
const SIMPLE={label:'Small-angle model',note:'Ideal point-mass bob, massless rigid rod, fixed frictionless pivot and no air resistance. Angles limited to 10°. Energy uses the consistent small-angle approximation, not exact mgh.'};
createTeardown({
  id:'pendulum',title:'Pendulum energy',subtitle:'A swing, taken apart · kinetic and potential energy from one model',
  level:'Physics: oscillations and energy. Supports NCEA Level 3 mechanical systems concepts; check the topics your teacher has selected.',
  checked:'8 November 2026',truth:[SIMPLE,{label:'Illustrative rig',note:'Original teaching apparatus, not a replica or a functioning clock. No escapement or drive is modelled; bearing geometry is illustrative.'}],
  canvasLabel:'A laboratory pendulum with cutaway bearing, support frame, rod and swinging bob. The charts and the bob share the same small-angle model.',
  model:{period:360,unit:'°',at:model.at,checks:model.checks,inputs:[
    {key:'length',label:'Pivot-to-bob length',min:.3,max:1,step:.05,value:.6,format:v=>fmt(v,2)+' m'},
    {key:'mass',label:'Bob mass',min:.1,max:1,step:.1,value:.5,format:v=>fmt(v,1)+' kg',note:'Mass changes energy, not the ideal period. Bob dimensions stay fixed.'},
    {key:'amplitude',label:'Release angle',min:2,max:10,step:1,value:8,format:v=>fmt(v)+'°',note:'Small angles only: this keeps the approximation appropriate.'}
  ]},build,step:10,cycleSeconds:4,cutOnStart:true,
  status:(s,k)=>`One swing cycle shown in ${fmt(k.cycleSeconds,1)} s · model period ${fmt(s.period,3)} s (visual speed is independent)`,
  bands:[{from:0,to:90,label:'Falls left'},{from:90,to:180,label:'Rises left'},{from:180,to:270,label:'Falls right'},{from:270,to:360,label:'Rises right'}],
  live:{label:'Bob speed magnitude',unit:'m/s',digits:3,value:s=>Math.abs(s.speed),a:s=>s.stage,b:s=>fmt(s.angleDegrees,1)+'° from vertical'},
  readoutsTruth:SIMPLE,readouts:[
    {label:'Period',get:s=>fmt(s.period,3)+' s'},
    {label:'Frequency',get:s=>fmt(s.frequency,3)+' Hz'},
    {label:'Kinetic energy',get:s=>fmt(s.K,4)+' J'},
    {label:'Potential energy (small angle)',get:s=>fmt(s.U,4)+' J'},
    {label:'Total mechanical energy',get:s=>fmt(s.E,4)+' J'},
    {label:'Signed tangential velocity',get:s=>fmt(s.speed,3)+' m/s'},
    {label:'Restoring torque (small angle)',get:s=>fmt(s.torque,3)+' N·m'}],
  charts:[
    {id:'energy',kind:'sweep',title:'Energy changes hands',y:{label:'J',min:0},series:[{label:'Kinetic',get:s=>s.K},{label:'Potential',get:s=>s.U}],value:s=>`K ${fmt(s.K,4)} J · U ${fmt(s.U,4)} J`,footer:()=> 'K + U is constant. There is no motor or friction in this model.'},
    {id:'angle',kind:'sweep',title:'Angle through one cycle',y:{label:'°'},series:[{label:'Angle',get:s=>s.angleDegrees}],value:s=>fmt(s.angleDegrees,2)+'°'},
    {id:'phase',kind:'loop',title:'Angle and velocity',x:{label:'°',get:s=>s.angleDegrees},y:{label:'m/s',get:s=>s.speed},value:s=>`${fmt(s.angleDegrees,2)}° · ${fmt(s.speed,3)} m/s`}
  ],
  schematic:{title:'Energy at a glance',truth:SIMPLE,formula:'T = 2π√(L/g) · θ = A cos φ<br>K = ½mv² · U ≈ ½mgLθ²',draw(s){
    const x=65+75*Math.sin(s.angle),y=20+75*Math.cos(s.angle);
    return `<g fill="none" stroke="currentColor"><line x1="65" y1="20" x2="65" y2="105" stroke-dasharray="3 4" opacity=".3"/><line x1="65" y1="20" x2="${x}" y2="${y}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="8" fill="${C.roseMauve}"/><circle cx="65" cy="20" r="3"/><rect x="130" y="30" width="12" height="60" opacity=".3"/><rect x="160" y="30" width="12" height="60" opacity=".3"/><rect x="130" y="${90-60*s.K/s.E}" width="12" height="${60*s.K/s.E}" fill="${C.rose}"/><rect x="160" y="${90-60*s.U/s.E}" width="12" height="${60*s.U/s.E}" fill="${C.mist}"/></g><g fill="currentColor" font-family="monospace" font-size="10"><text x="130" y="108">K</text><text x="160" y="108">U</text><text x="18" y="130">${fmt(s.angleDegrees,1)}° · length ${fmt(s.length,2)} m</text></g>`;
  }},
  callouts:[{anchor:'pivot',label:'Bearing',side:'left',at:.17,value:()=> 'Illustrative frictionless pivot'},
    {anchor:'rod',label:'Massless rod',side:'left',at:.47,value:s=>fmt(s.length,2)+' m pivot to bob'},
    {anchor:'bob',label:'Bob',side:'right',at:.64,value:s=>fmt(s.mass,1)+' kg · '+fmt(Math.abs(s.speed),3)+' m/s'}],
  subsystems:[{key:'swing',label:'Rod and bob'},{key:'pivot',label:'Pivot bearing'},{key:'frame',label:'Support and scale'}],
  views:{hero:{label:'Hero',az:24,el:7,dist:300,target:[0,-50,0]},front:{label:'Front',az:0,el:1,dist:290,target:[0,-50,0]},pivot:{label:'Pivot',az:25,el:12,dist:40,target:[0,0,0]},apart:{hidden:true,az:26,el:9,dist:270,target:[0,-43,0]}},
  learn:[
    {step:'Explore',text:'Watch the bob pass the lowest point. Which energy is greatest there? Pause and step through the cycle to compare the two energy bars.',show:{view:'front',play:true,select:'all'}},
    {step:'Predict',text:'Would a heavier bob have a longer period? Predict first, then double its mass. Compare period and total energy, not the decorative playback speed.'},
    {step:'Investigate',text:'Compare 0.40 m and 0.90 m at the same release angle and mass. The period ratio should be √(0.90/0.40) = 1.5. Record the model periods.'},
    {step:'Explain',text:'Use the energy chart to explain why speed is zero at both turning points but greatest at the bottom. Why would a real pendulum eventually stop?',show:{select:'swing',isolate:true,view:'front'}}],
  sources:[
    {label:'OpenStax University Physics: Simple Harmonic Motion',href:'https://openstax.org/books/university-physics-volume-1/pages/15-1-simple-harmonic-motion',note:'Angular frequency, phase and small-amplitude harmonic motion.'},
    {label:'OpenStax University Physics: Pendulums',href:'https://openstax.org/books/university-physics-volume-1/pages/15-4-pendulums',note:'Simple pendulum period T = 2π√(L/g), and small-angle approximation.'},
    {label:'NZQA Physics subject resources',href:'https://www2.nzqa.govt.nz/ncea/subjects/select-subject/physics/',note:'Check current mechanical-systems requirements with your teacher. This original model is not an official assessment or complete revision course.'},
    {label:'Original teaching dimensions',note:'Length 0.30–1.00 m, mass 0.10–1.00 kg and angle 2–10° are illustrative inputs, not measurements of a commercial clock. g = 9.81 m/s².'}
  ]
});
